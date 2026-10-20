import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { saveReviewProposal, loadCaseObligationReview } from './audit-findings-store.mjs';
import { createDividerReviewedBoundariesReader, filledFieldStructureReview } from '../tests/material-parity/text-backing-case-review-source.mjs';

// Existing partial-only proposal mechanism; no new acceptance schema or reader waiver.
const base = 'artifacts/material-parity/working-audit';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const receipt = file => ({ file, sha256: hash(readFileSync(file)) });
const load = descriptor => {
  const bytes = readFileSync(descriptor.file); assert.equal(hash(bytes), descriptor.sha256);
  return JSON.parse(bytes.toString().replace(/^\uFEFF/, ''));
};
const focusLog = receipt('artifacts/material-parity/chip-focus-indicator-retained-inputs-20261020.log');
assert.equal(focusLog.sha256, '3df845222863b4a52e7a3e4cccd3f629ae3343707029114bb7fbe075fa2da3b1');
const stateLog = receipt('artifacts/material-parity/chip-state-layer-retained-inputs-20261020.log');
assert.equal(stateLog.sha256, '725676d749bfd6a9c75a89b7e3dea0ca35438b568861eca21a91ce0f2945a997');
const focusProof = load(focusLog), stateProof = load(stateLog);
assert.equal(focusProof.cases, 76); assert.equal(focusProof.owners, 152);
assert.equal(stateProof.cases, 24); assert.equal(stateProof.authenticatedTrees, 48);
assert.deepEqual(focusProof.report, stateProof.report);
const report = load(focusProof.report);
const envelopeBytes = readFileSync(`${base}/proposals/${filledFieldStructureReview}.json`);
assert.equal(hash(envelopeBytes), '8417371df038a621586a61bcafc13eff2f66a1099f996c659c3e522013ebdbdc');
const review = JSON.parse(envelopeBytes).review;
assert.equal(hash(JSON.stringify(review)), filledFieldStructureReview);
const groups = new Map(review.groups.map(group => [group.case, group]));
const ownProof = receipt('tests/material-parity/control-state-paint-review.spec.mjs');
assert.equal(hash(readFileSync(ownProof.file, 'utf8').replaceAll('\r\n', '\n')),
  'e73b276b78c3bb6ac8f2e2df5e6ba3f4e550322edaa3c055a7378f75b53b6d65');
const owningRun = receipt('artifacts/material-parity/chip-state-paint-owning-history-20261020.log');
assert.equal(owningRun.sha256, '0b51f880e1865a7d4ef1954add039b9d6cb6717280a1af589ca67968ae52b072');
const source = receipt(stateProof.component.file), join = receipt('scripts/join-material-chip-paint.mjs');
const matching = (group, trees) => {
  assert.ok(group); assert.equal(group.family, 'chips');
  assert.equal(group.inspection, 'partial'); assert.equal(group.currentRendering, 'unverified');
  assert.equal(group.evidence.report, focusProof.report.file);
  assert.equal(group.evidence.reportSha256, focusProof.report.sha256);
  assert.deepEqual(group.evidence.pairedTrees, trees);
};
const checkIndicator = observations => {
  assert.equal(observations.length, 2);
  for (const row of observations) {
    assert.equal(row.position, 'absolute'); assert.equal(row.pointerEvents, 'none');
    assert.equal(row.background, 'rgba(0, 0, 0, 0)');
    assert.equal(row.topBorder, '0px'); assert.equal(row.shadow, 'none');
    if (row.pseudo.generated) {
      assert.equal(row.pseudo.display, 'none'); assert.equal(row.pseudo.topBorder, '3px');
      assert.equal(row.pseudo.topColor, 'rgba(0, 0, 0, 0)');
    } else assert.deepEqual(row.pseudo, { generated: false });
  }
};
let focusChildren = 0, stateChildren = 0, controls = 0, generated = 0, absent = 0;
const entries = [...report.results.map(e => ({ ...e, kind: 'static' })),
  ...report.interactions.map(e => ({ ...e, kind: 'interaction' }))].filter(e => e.family === 'chips');
assert.equal(entries.length, 76);
for (const entry of entries) {
  const key = `${entry.kind}:chips@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`;
  const group = groups.get(key); matching(group, entry.inputTrees);
  const native = load(entry.inputTrees.reference); load(entry.inputTrees.astylar);
  assert.deepEqual(native.errors, []);
  const observations = native.nodes.filter(n => /\bmat-mdc-chip-primary-focus-indicator\b/.test(n.attributes?.class)).map(node => {
    const s = native.styles[node.style], p = node.pseudoElements.find(p => p.pseudo === '::before'); assert.ok(p);
    if (p.generated) generated++; else absent++;
    const ps = p.generated ? native.styles[p.style] : null;
    return { key: node.key, parent: node.parent, position: s.position, pointerEvents: s.pointerEvents,
      background: s.backgroundColor, topBorder: s.borderTopWidth, shadow: s.boxShadow,
      pseudo: p.generated ? { generated: true, display: ps.display, topBorder: ps.borderTopWidth, topColor: ps.borderTopColor } : { generated: false } };
  });
  checkIndicator(observations);
  for (const alter of [o => o.pop(), o => o[0].position = 'relative', o => o[0].background = 'black']) {
    const changed = structuredClone(observations); alter(changed); assert.throws(() => checkIndicator(changed)); controls++;
  }
  const owner = group.obligations.localPaint; assert.equal(owner.retainedChipFocusIndicatorRequests, undefined);
  owner.retainedChipFocusIndicatorRequests = { disposition: 'inspected-retained-hidden-indicator-requests', observations,
    evidence: { focusLog, ownProof, owningRun, join },
    conclusion: 'These exact out-of-flow empty spans have no visible generated outline request. They are not a missing visible focus ring and are not the separate focus/ripple layer.',
    boundary: 'Retained requested styles only;not complete pseudo/paint order,input equivalence,current pixels or whole-case closure.' };
  focusChildren++;
}
assert.deepEqual({ generated, absent }, { generated: 40, absent: 112 });
const checkState = (group, row) => {
  matching(group, row.treeReceipts);
  assert.equal(row.reference.opacity, row.state === 'hover' ? '0.08' : '0.12');
  assert.equal(row.reference.background, row.state === 'hover' ? 'rgb(73, 69, 78)' : 'rgb(75, 67, 87)');
  assert.equal(row.candidate.stages.interactionResolvedStyle.background,
    { focus: '#eadef7', hover: '#ddd2ea', held: '#d7cbe4' }[row.state]);
  assert.deepEqual(row.candidate.children, ['chip-0-mark', 'chip-0-label']);
};
for (const row of stateProof.observations) {
  const group = groups.get(`interaction:chips@${row.profile}/${row.viewport}/${row.state}`); checkState(group, row);
  for (const alter of [r => r.treeReceipts.reference.sha256 = '0'.repeat(64), r => r.reference.opacity = '0',
    r => r.candidate.stages.interactionResolvedStyle.background = 'black', r => r.candidate.children.pop()]) {
    const changed = structuredClone(row); alter(changed); assert.throws(() => checkState(group, changed)); controls++;
  }
  const owner = group.obligations.localPaint; assert.equal(owner.retainedChipStateLayerRequests, undefined);
  owner.retainedChipStateLayerRequests = { disposition: 'inspected-retained-state-layer-input-mismatch', observation: row,
    classification: 'application-plugin-authoring-defect',
    evidence: { stateLog, source, ownProof, owningRun, join },
    conclusion: 'Separate native alpha overlay is replaced by opaque hover/held host colors;focus fill is omitted. Current source retains the four rules introduced by ae9cdad2. Default statePaint true is not measured parity.',
    remaining: ['Transient ripple/timing and local raster','Complete chip input/paint/current-runtime applicability and all parent obligations'],
    boundary: 'First demonstrated divergence is authored layer structure/color/activation,not equal-input core blending or whole-case closure.' };
  stateChildren++;
}
assert.equal(focusChildren, 76); assert.equal(stateChildren, 24); assert.equal(controls, 324);
const proposed = saveReviewProposal(base, review);
const reader = createDividerReviewedBoundariesReader({ root: process.cwd(), read: readFileSync, reviewSha256: filledFieldStructureReview });
const loaded = loadCaseObligationReview(proposed.file, proposed.sha256, review.groups.map(group => group.case), { read: reader.read });
assert.equal(loaded.cases.length, 2311); assert.equal(loaded.inspectionComplete, false); assert.equal(loaded.currentRenderingAccepted, false);
for (const group of review.groups) {
  delete group.obligations.localPaint.retainedChipFocusIndicatorRequests;
  delete group.obligations.localPaint.retainedChipStateLayerRequests;
}
assert.equal(hash(JSON.stringify(review)), filledFieldStructureReview, 'Removing only100 children must recover the COMPLETE predecessor');
console.log(JSON.stringify({ predecessor: filledFieldStructureReview, proposed, focusChildren, stateChildren, rejectedControls: controls,
  validatedDependencies: loaded.evidenceFingerprints.length, completePredecessorRecovered: true,
  scope: 'Queued additive retained evidence only;not selected,exported,canonical,current rendering or complete inspection.' }));
