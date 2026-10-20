import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { saveReviewProposal, loadCaseObligationReview } from './audit-findings-store.mjs';
import { dividerPropertyContextReview, createDividerReviewedBoundariesReader } from '../tests/material-parity/text-backing-case-review-source.mjs';

// Queue an exact-case successor;never alter the proposal currently being exported.
const base = 'artifacts/material-parity/working-audit';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const receipt = file => ({ file, sha256: hash(readFileSync(file)) });
function load(file, expected) {
  const bytes = readFileSync(file); assert.equal(hash(bytes), expected);
  return { value: JSON.parse(bytes), receipt: { file, sha256: expected } };
}
const scope = load('artifacts/material-parity/button-touch-retained-inputs-20261020.log',
  'a6756e4a0bcab6904d14959d5bb70775ef02d358c6b1d955638e769c50aec7dd');
const newer = load('artifacts/material-parity/button-touch-newer-capture-reconciliation-20261020.log',
  'e1df86ae8dbd45c167f78c6f56892d009d0e6da24eb3d68c2de1b4b214f2211b');
assert.deepEqual(newer.value.touchAndHostRequestDifferences, []); assert.equal(newer.value.owners, 600);
const history = receipt('artifacts/material-parity/button-touch-authoring-history-20261020.log');
const independent = receipt('artifacts/material-parity/button-touch-scope-independent-20261020.log');
const sourceProposal = receipt('artifacts/material-parity/working-audit/proposals/a79bdf4496b89608128fcd7ca223508ce576a1728ba856c030ca15e0a32e5266.json');
const sourceReview = JSON.parse(readFileSync(sourceProposal.file));
assert.equal(hash(JSON.stringify(sourceReview.review)), 'a79bdf4496b89608128fcd7ca223508ce576a1728ba856c030ca15e0a32e5266');
const proposedFinding = 'fixture-shared-button-touch-descendant-omission';
assert.equal(sourceReview.review.groups.at(-1).id, proposedFinding);
const materialPair = receipt('artifacts/material-parity/button-paired-touch-target-20261020.log');
const publicCapture = receipt('artifacts/material-parity/public-button-touch-target-complete-20261020/latest-report.json');
const publicResult = JSON.parse(readFileSync(publicCapture.file));
assert.equal(publicResult.accepted, false); assert.equal(publicResult.captures.length, 32);
assert.equal(publicResult.boundaryFailures.length, 4);
const publicVerification = receipt('artifacts/material-parity/button-touch-target-independent-20261020.log');
const parser = receipt('artifacts/material-parity/button-touch-transform-parser-binding-20261020.log');
const review = JSON.parse(readFileSync(`${base}/proposals/${dividerPropertyContextReview}.json`)).review;
assert.equal(hash(JSON.stringify(review)), dividerPropertyContextReview);
const groups = new Map(review.groups.map(group => [group.case, group]));
const oldRows = new Map(scope.value.rows.map(row => [`${row.case}:${row.element}`, row]));
const mappedRows = new Map(newer.value.rows.map(row => [`${row.case}:${row.element}`, row]));
const cache = new Map();
function tree(descriptor) {
  if (!cache.has(descriptor.file)) {
    assert.deepEqual(receipt(descriptor.file), descriptor);
    cache.set(descriptor.file, { descriptor, value: JSON.parse(readFileSync(descriptor.file)) });
  }
  assert.deepEqual(cache.get(descriptor.file).descriptor, descriptor); return cache.get(descriptor.file).value;
}
const touched = []; let owners = 0, linkedFindingRows = 0, suppressedRows = 0, rejected = 0;
const join = receipt('scripts/join-material-button-touch-inputs.mjs');
function validateMapping(group, row, mapping) {
  assert.equal(row.case, group.case); assert.equal(mapping.case, group.case); assert.equal(mapping.element, row.element);
  assert.equal(group.family, row.family); assert.equal(group.inspection, 'partial'); assert.equal(group.currentRendering, 'unverified');
  assert.deepEqual(mapping.currentTrees, group.evidence.pairedTrees);
}
for (const group of groups.values()) {
  const rows = scope.value.rows.filter(row => row.case === group.case); if (!rows.length) continue;
  const observations = [];
  for (const row of rows) {
    const mapping = mappedRows.get(`${group.case}:${row.element}`); assert.ok(mapping); validateMapping(group, row, mapping);
    const changed = structuredClone(mapping); changed.currentTrees.reference.sha256 = '0'.repeat(64);
    assert.throws(() => validateMapping(group, row, changed)); rejected++;
    const wrongCase = { ...row, case: row.case + '-wrong' };
    assert.throws(() => validateMapping(group, wrongCase, mapping)); rejected++;
    const reference = tree(mapping.currentTrees.reference), candidate = tree(mapping.currentTrees.astylar);
    const native = reference.nodes.find(n => n.key === mapping.referenceTouch);
    const nativeHost = reference.nodes.find(n => n.key === mapping.referenceHost);
    const button = candidate.nodes.find(n => n.key === mapping.candidateOwner);
    assert.equal(native.parent, nativeHost.key); assert.equal(native.type, 'span'); assert.equal(nativeHost.type, 'button');
    assert.equal(candidate.nodes.filter(n => n.parent === button.key).length, 0);
    assert.deepEqual(button.authored, row.candidate.authored);
    const requests = Object.fromEntries(Object.keys(row.reference.targetRequests).map(key => [key, reference.styles[native.style][key]]));
    assert.deepEqual(requests, row.reference.targetRequests);
    const rules = native.rules.map(index => reference.rules[index]);
    assert.ok(rules.some(rule => rule.active && rule.declarations.top?.value === '50%' &&
      rule.declarations.transform?.value === 'translateY(-50%)' && rule.declarations.height?.value === '48px'));
    const hasVisibleRequest = row.requestDisposition === 'declared-visible-target-not-runtime-verified';
    if (hasVisibleRequest) linkedFindingRows++; else suppressedRows++;
    observations.push({ element: row.element, referenceHost: nativeHost.key, referenceTouch: native.key,
      candidateOwner: button.key, nativeHostDisabled: row.reference.hostDisabled,
      nativeTargetRequests: requests, nativeMatchedRules: rules, candidateAuthored: button.authored, candidateChildCount: 0,
      disposition: row.requestDisposition, findingIds: hasVisibleRequest ? [proposedFinding] : [], actualActivationVerified: false });
    oldRows.delete(`${row.case}:${row.element}`); mappedRows.delete(`${row.case}:${row.element}`); owners++;
  }
  const owner = group.obligations.inputStyleStructure, key = 'retainedSharedButtonTouchInputs';
  assert.equal(owner[key], undefined);
  owner[key] = {
    disposition: 'inspected-retained-shared-button-touch-inputs', observations,
    findingRegistryStatusAtReview: 'proposed-not-yet-canonical',
    evidence: { scope: scope.receipt, newerCapture: newer.receipt, history, independent, sourceProposal,
      inspector: receipt('scripts/audit-material-button-touch-inputs.mjs'), join },
    ...(group.case === 'static:button@light/desktop' ? { freshHitBoundarySupplement: {
      evidence: { materialPair, publicCapture, publicVerification, parser },
      conclusion: 'One fresh Material primary pair has native outside-host activation versus candidate container clicks. Public exact percentage CSS retains a failing matrix linked to the existing documented unit-loss limitation;literal controls pass.',
      boundary: 'Additional native/frozen/public diagnostic actions,not the original static capture or other owners runtime activation. No current rendering/case closure;do not replace native percentages with the diagnostic pixels.',
    } } : {}),
    boundary: 'These exact captured requests/descendants only. Suppressed and disabled target observations do not inherit visible-request finding applicability. Occlusion and other runtime states remain unverified. Parent dispositions,remaining work and all original findings survive;the public/native runtime probe is not generalized to480 cases.',
  };
  touched.push([owner, key]);
}
assert.equal(touched.length, 480); assert.equal(owners, 600); assert.equal(linkedFindingRows, 276); assert.equal(suppressedRows, 324);
assert.equal(rejected, 1200); assert.equal(oldRows.size, 0); assert.equal(mappedRows.size, 0);
const proposed = saveReviewProposal(base, review);
const reader = createDividerReviewedBoundariesReader({ root: process.cwd(), read: readFileSync, reviewSha256: dividerPropertyContextReview });
const loaded = loadCaseObligationReview(proposed.file, proposed.sha256, review.groups.map(group => group.case), { read: reader.read });
assert.equal(loaded.cases.length, 2311); assert.equal(loaded.inspectionComplete, false); assert.equal(loaded.currentRenderingAccepted, false);
assert.deepEqual(loaded.unjoinedCases, []);
for (const [owner, key] of touched) delete owner[key];
assert.equal(hash(JSON.stringify(review)), dividerPropertyContextReview, 'Removing only480 children must recover the complete selected predecessor');
console.log(JSON.stringify({ predecessor: dividerPropertyContextReview, proposed, casesTouched: 480, owners,
  visibleRequestFindingRows: linkedFindingRows, suppressedRows, rejectedControls: rejected,
  validatedDependencies: loaded.evidenceFingerprints.length, exactCurrentTreeMembership: true,
  completePredecessorRecovered: true, cases: 2311, inspectionComplete: false, currentRenderingAccepted: false,
  selectedForExport: false, canonicalPublication: false,
  scope: 'Queued next-batch case proposal only. Currently running433b export is untouched. Source finding remains proposed;all old statuses,remaining work and gates survive.' }));
