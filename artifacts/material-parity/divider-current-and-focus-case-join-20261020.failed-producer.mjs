import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { saveReviewProposal, loadCaseObligationReview } from './audit-findings-store.mjs';
import { dividerPropertyContextReview, createDividerReviewedBoundariesReader } from '../tests/material-parity/text-backing-case-review-source.mjs';

// Extend the queued touch review,not the frozen review used by the cold check.
const base = 'artifacts/material-parity/working-audit';
const predecessor = '234eb163a6db98769d1aa37c8aeef57b8f9d2eb110eaeb61c93981feb7cfe8a0';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const receipt = file => ({ file, sha256: hash(readFileSync(file)) });
function load(file, expected) {
  const r = receipt(file); if (expected) assert.equal(r.sha256, expected);
  return { value: JSON.parse(readFileSync(file)), receipt: r };
}
const focus = load('artifacts/material-parity/button-focus-indicator-applicability-20261020.log',
  'd666f3987bd0420ff0407f60b8f3c22ef9bfb975252f5594d29fc1521946d4b0');
assert.equal(focus.value.owners, 600); assert.equal(focus.value.cases, 480);
assert.deepEqual(focus.value.counts, { 'not-generated': 366, 'generated-display-none': 234 });
const run = 'artifacts/material-parity/divider-current-browser-20261020';
const capture = load(run + '/latest-report.json', '4be5d06fb652e9fbdc754ec14adfbe312eebe8b6e1df8a1b5e3f72d607dc10cc');
const verification = load('artifacts/material-parity/divider-current-browser-verification-20261020.log');
assert.deepEqual(verification.value.report, capture.receipt);
assert.equal(verification.value.exactConfiguredCases, 24);
assert.equal(verification.value.checkpointArtifactsAuthenticated, true);
assert.equal(verification.value.postCaptureServedFilesAuthenticated, 1887);
assert.equal(capture.value.browser.version, '155.0.8059.80');
assert.equal(capture.value.summary.meetsAcceptance, false);
assert.equal(capture.value.interactionSummary.meetsAcceptance, false);
const manifest = receipt(run + '/checkpoint/manifest.json');
assert.deepEqual(manifest, verification.value.manifest);
const review = JSON.parse(readFileSync(`${base}/proposals/${predecessor}.json`)).review;
assert.equal(hash(JSON.stringify(review)), predecessor);
const groups = new Map(review.groups.map(g => [g.case, g]));
const fresh = new Map();
for (const [kind, rows] of [['static', capture.value.results], ['interaction', capture.value.interactions]]) {
  for (const row of rows) {
    const key = `${kind}:${row.family}@${row.profile}/${row.viewport.id}${row.state ? '/' + row.state : ''}`;
    assert.equal(row.family, 'divider'); assert.equal(row.meetsAcceptance, true);
    assert.ok(!fresh.has(key)); fresh.set(key, row);
  }
}
assert.equal(fresh.size, 24);
const changes = []; const producer = receipt('scripts/join-material-current-divider-and-focus-evidence.mjs');
function add(group, obligation, key, child) {
  assert.equal(group.inspection, 'partial'); assert.equal(group.currentRendering, 'unverified');
  const target = group.obligations[obligation]; assert.ok(target); assert.equal(target[key], undefined);
  target[key] = child; changes.push([target, key]);
}
let owners = 0, focusCases = 0, rejected = 0;
function validateFocus(group, row) {
  assert.equal(group.case, row.case); assert.deepEqual(group.evidence.pairedTrees, row.trees);
  assert.equal(row.candidateChildCount, 0); assert.equal(row.actualPaintMeasured, false);
  if (row.disposition === 'not-generated') { assert.equal(row.pseudo.generated, false); assert.equal(row.computedPseudo, null); }
  else { assert.equal(row.disposition, 'generated-display-none'); assert.equal(row.pseudo.generated, true); assert.equal(row.computedPseudo.display, 'none'); }
}
for (const group of groups.values()) {
  const rows = focus.value.rows.filter(r => r.case === group.case);
  if (!rows.length) continue;
  for (const row of rows) {
    validateFocus(group, row);
    assert.throws(() => validateFocus(group, { ...row, case: row.case + '-wrong' })); rejected++;
    const changed = structuredClone(row); changed.trees.reference.sha256 = '0'.repeat(64);
    assert.throws(() => validateFocus(group, changed)); rejected++;
    owners++;
  }
  add(group, 'inputStyleStructure', 'retainedSharedButtonFocusPseudoApplicability', {
    disposition: 'inspected-retained-focus-pseudo-applicability',
    observations: rows.map(r => ({ element: r.element, referenceIndicator: r.referenceIndicator,
      candidateOwner: r.candidateOwner, disposition: r.disposition, pseudoGenerated: r.pseudo.generated,
      computedPseudo: r.computedPseudo, actualPaintMeasured: false })),
    evidence: { focus: focus.receipt, producer },
    boundary: 'Exact original paired-tree membership. No missing-visible-focus-pseudo finding from non-generated/display:none records;not full focus/forced-colors/event/AX or rendering equivalence. All prior findings and remaining work survive.',
  });
  focusCases++;
}
assert.equal(owners, 600); assert.equal(focusCases, 480);
for (const [key, row] of fresh) {
  const group = groups.get(key); assert.ok(group);
  const validate = (g, candidate) => {
    assert.equal(g.family, candidate.family); assert.equal(g.case, key);
    assert.equal(g.profile, candidate.profile); assert.equal(g.viewport, candidate.viewport.id);
  };
  validate(group, row);
  assert.throws(() => validate(group, { ...row, profile: row.profile + '-wrong' })); rejected++;
  assert.throws(() => validate(group, { ...row, viewport: { ...row.viewport, id: row.viewport.id + '-wrong' } })); rejected++;
  add(group, 'sourceCurrentness', 'freshCurrentBrowserDividerCapture', {
    disposition: 'partial', case: key, capturedBrowser: capture.value.browser,
    recordedRowAcceptance: true, aggregateAcceptance: false,
    evidence: { report: capture.receipt, manifest, verification: verification.receipt,
      freshSupplementTrees: row.inputTrees, producer },
    boundary: 'Fresh configured-case execution with unchanged served build. Fresh trees supplement,not replace,the original paired-tree anchor. Broad row scores do not prove equal inputs/local paint/full core-source applicability or case closure. Original remaining tasks survive.',
  });
}
assert.equal(rejected, 1248); assert.equal(changes.length, 504);
const proposed = saveReviewProposal(base, review);
const reader = createDividerReviewedBoundariesReader({ root: process.cwd(), read: readFileSync, reviewSha256: dividerPropertyContextReview });
const loaded = loadCaseObligationReview(proposed.file, proposed.sha256, review.groups.map(g => g.case), { read: reader.read });
assert.equal(loaded.cases.length, 2311); assert.equal(loaded.inspectionComplete, false);
assert.equal(loaded.currentRenderingAccepted, false); assert.deepEqual(loaded.unjoinedCases, []);
for (const [target, key] of changes) delete target[key];
assert.equal(hash(JSON.stringify(review)), predecessor);
console.log(JSON.stringify({ predecessor, proposed, addedChildren: 504, focusCases, focusOwners: owners,
  freshDividerCases: fresh.size, rejectedControls: rejected, validatedDependencies: loaded.evidenceFingerprints.length,
  completePredecessorRecovered: true, cases: 2311, inspectionComplete: false, currentRenderingAccepted: false,
  selectedForExport: false, canonicalPublication: false,
  scope: 'Queued additive evidence only;the running433b cold check and all prior statuses/remaining work are unchanged.' }));
