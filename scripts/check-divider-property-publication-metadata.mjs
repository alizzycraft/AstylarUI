import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

// Exact bounded publication check using the existing importer's compact metadata.
// Fixed generations permit replay after the accepted pointer advances.
const hash = b => createHash('sha256').update(b).digest('hex');
const root = 'artifacts/material-parity/working-audit';
function load(base, generation, indexSha256) {
  const bytes = fs.readFileSync(`${base}/${generation}/index.json`);
  assert.equal(hash(bytes), indexSha256);
  return { pointer: { generation, indexSha256 }, index: JSON.parse(bytes) };
}
const a = load(root, 'b6610e71ef744b5d589d07c18e562df9927202a3adb7a5b31acb334b100839f2',
  'd0e7623de72caddf94446cf4de1396975e59c9cf1e0d9a0865f8d5b0a8761bce');
const b = load(root + '/candidate-validation', '90467e5a8a17a1b51f374c21aec44e1ef82734db34cd394c3abf2443e754936c',
  '681dba6ca394189bbe7dd62604be466bcabd77cd24101f202fd6c170a7ee20cc');
const before = a.index.metadata.coverage, after = b.index.metadata.coverage;
let removed = 0; const cases = new Set();
for (const g of after.inspectionEvidence.cases) {
  for (const [owner, key] of [['inputStyleStructure', 'retainedDividerPropertyContexts'], ['localPaint', 'freshNativeDividerPropertyControls']]) {
    if (g.obligations[owner]?.[key]) { delete g.obligations[owner][key]; removed++; cases.add(g.case); }
  }
}
assert.equal(removed, 25); assert.equal(cases.size, 24);
assert.deepEqual(after.inspectionEvidence.cases, before.inspectionEvidence.cases);
const oldDeps = new Map(before.inspectionEvidence.evidenceFingerprints.map(r => [r.file, r.sha256]));
const added = after.inspectionEvidence.evidenceFingerprints.filter(r => !oldDeps.has(r.file));
assert.equal(added.length, 25);
assert.deepEqual(after.inspectionEvidence.evidenceFingerprints.filter(r => oldDeps.has(r.file)), before.inspectionEvidence.evidenceFingerprints);
for (const r of added) assert.equal(hash(fs.readFileSync(r.file)), r.sha256);
const checks = after.inspectionEvidence.sourceApplicability.currentSourceChecks;
assert.equal(checks.length, 12);
for (const r of checks) assert.equal(hash(fs.readFileSync(r.file)), r.sha256);
const priorReview = '736e685c55bf033db3d0ffc5b564e2ed42648438e1ed0b3ab66b7f26ed83d8bd';
const nextReview = '433b794f0a1d51b7592fb9932fab3fe6c6376c1412958f7aafca089e509799b2';
assert.equal(after.inspectionEvidence.reviewSha256, nextReview);
assert.equal(after.inspectionEvidence.sourceApplicability.reviewSha256, nextReview);
assert.equal(before.inspectionEvidence.reviewSha256, priorReview);
after.inspectionEvidence.reviewSha256 = priorReview;
after.inspectionEvidence.sourceApplicability.reviewSha256 = priorReview;
delete after.inspectionEvidence.sourceApplicability.currentSourceChecks;
after.inspectionEvidence.evidenceFingerprints = before.inspectionEvidence.evidenceFingerprints;
assert.deepEqual(after, before);
assert.deepEqual(b.index.metadata.summary, a.index.metadata.summary);
assert.deepEqual(b.index.counts, a.index.counts);
const file = 'scripts/check-divider-property-publication-metadata.mjs';
console.log(JSON.stringify({ producer: { file, sha256: hash(fs.readFileSync(file)) }, previous: a.pointer, candidate: b.pointer,
  removedChildren: removed, exactCases: cases.size, addedDependencies: added, currentSourceChecks: checks,
  all2311PriorCasesConserved: true, completeCoverageRecovered: true, completeSummaryAndCountsUnchanged: true,
  scope: 'Compact metadata conservation only;full payload sections,cold comparison and main publication remain separate.' }));
