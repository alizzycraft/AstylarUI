import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { saveReviewProposal, loadCaseObligationReview } from './audit-findings-store.mjs';
import { createDividerReviewedBoundariesReader, inactiveParagraphInputsReview } from '../tests/material-parity/text-backing-case-review-source.mjs';

// Bounded use of the existing case proposal/receipt loader. No new acceptance
// schema, historical-source waiver, renderer fix or whole-case promotion.
const base = 'artifacts/material-parity/working-audit';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const receipt = file => ({ file, sha256: hash(readFileSync(file)) });
const log = receipt('artifacts/material-parity/filled-field-structure-ledger-review-20261020.log');
assert.equal(log.sha256, '5fadba044b06bd7dd601687ab0f30ecde740413623feaf55d6bd2d0a2e5b6a09');
const lines = readFileSync(log.file, 'utf8').split(/\r?\n/);
const starts = lines.flatMap((line, index) => line.startsWith('# FIELD_STRUCTURE_REVIEW ') ? [index] : []);
assert.equal(starts.length, 1);
const end = lines.findIndex((line, index) => index > starts[0] && line.startsWith('# Subtest:'));
assert.ok(end > starts[0]);
const chunks = lines.slice(starts[0], end);
assert.ok(chunks.every(line => line.startsWith('# ')));
assert.ok(lines.includes('# pass 1') && lines.includes('# fail 0'));
// Node's TAP reporter escapes backslashes/hash characters in diagnostic lines;
// use the same inverse as the existing retained paint-review log readers.
// Long console diagnostics are split into contiguous TAP comment chunks.
const serialized = chunks.map(line => line.slice(2)).join('').slice('FIELD_STRUCTURE_REVIEW '.length);
const proof = JSON.parse(serialized.replace(/\\([\\#])/g, '$1'));
assert.equal(proof.kind, 'retained-filled-field-structure-review');
assert.equal(proof.rows.length, 577);
assert.equal(new Set(proof.rows.map(row => row.case)).size, 577);
for (const item of [proof.report, proof.source, proof.proof]) assert.deepEqual(receipt(item.file), item);
const predecessor = inactiveParagraphInputsReview;
const bytes = readFileSync(`${base}/proposals/${predecessor}.json`);
assert.equal(hash(bytes), '0042a92a7bbf346f524f260714bbcc7345264857c319ce4926b11418f7fdeb65');
const review = JSON.parse(bytes).review;
assert.equal(hash(JSON.stringify(review)), predecessor);
const byCase = new Map(review.groups.map(group => [group.case, group]));
const validate = (group, row) => {
  assert.ok(group); assert.equal(row.case, group.case); assert.equal(row.family, group.family);
  assert.deepEqual(row.inputTrees, group.evidence.pairedTrees);
  assert.equal(group.evidence.report, proof.report.file);
  assert.equal(group.evidence.reportSha256, proof.report.sha256);
  assert.deepEqual(row.reference.corners, ['4px', '4px', '0px', '0px']);
  assert.equal(row.reference.infixPosition, 'relative');
  assert.equal(row.astylar.regionPosition, 'absolute');
  assert.ok(['3px', '4px', '6px'].includes(row.astylar.surfaceRadius));
  assert.equal(row.classifications.structure, 'application-plugin-authoring-defect');
  assert.equal(row.classifications.corners, 'application-plugin-authoring-defect');
};
const join = receipt('scripts/join-material-filled-field-structure.mjs');
let controls = 0;
for (const row of proof.rows) {
  const group = byCase.get(row.case); validate(group, row);
  for (const alter of [
    value => { value.case += '-wrong'; },
    value => { value.inputTrees.reference.sha256 = '0'.repeat(64); },
    value => { value.reference.corners[2] = '4px'; },
    value => { value.astylar.regionPosition = 'relative'; },
  ]) {
    const changed = structuredClone(row); alter(changed);
    assert.throws(() => validate(group, changed)); controls++;
  }
  assert.equal(group.inspection, 'partial'); assert.equal(group.currentRendering, 'unverified');
  const owner = group.obligations.inputStyleStructure;
  assert.equal(owner.retainedFilledFieldStructure, undefined);
  owner.retainedFilledFieldStructure = {
    disposition: 'inspected-retained-structure-and-decoration-requests', observation: row,
    evidence: { log, source: proof.source, owningProof: proof.proof, join },
    conclusion: 'Native infix/floating-label ancestry is replaced by absolute regions and sibling labels;all-corner candidate radii differ from native square bottom corners. Error activation and alternate timepicker lines retain their separate exact-case scope.',
    remaining: ['Complete anonymous/pseudo-element correspondence and local paint',
      'Actual focus/event history for the two mobile timepicker dismissal endpoints',
      'Current-runtime applicability and all parent inspection/final acceptance requirements'],
    boundary: 'Original October5 paired trees authenticated;no transfer from ancestry by case ID alone,no whole-case closure or rendering acceptance.',
  };
}
assert.equal(controls, 2308);
const proposed = saveReviewProposal(base, review);
const reader = createDividerReviewedBoundariesReader({ root: process.cwd(), read: readFileSync, reviewSha256: predecessor });
const loaded = loadCaseObligationReview(proposed.file, proposed.sha256, review.groups.map(group => group.case), { read: reader.read });
assert.equal(loaded.cases.length, 2311); assert.equal(loaded.inspectionComplete, false);
assert.equal(loaded.currentRenderingAccepted, false);
for (const row of proof.rows) delete byCase.get(row.case).obligations.inputStyleStructure.retainedFilledFieldStructure;
assert.equal(hash(JSON.stringify(review)), predecessor, 'Complete predecessor must recover after only577 child removals');
console.log(JSON.stringify({ predecessor, proposed, addedChildren: 577, rejectedControls: controls,
  validatedDependencies: loaded.evidenceFingerprints.length, completePredecessorRecovered: true,
  scope: 'Queued additive retained evidence only;not selected,exported,canonical,current rendering or complete case inspection.' }));
