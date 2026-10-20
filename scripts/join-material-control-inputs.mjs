import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { saveReviewProposal, loadCaseObligationReview } from './audit-findings-store.mjs';
import { createDividerReviewedBoundariesReader, chipGraphicReview } from '../tests/material-parity/text-backing-case-review-source.mjs';

// Add bounded observations to the existing partial-only inventory, never case closure.
const base = 'artifacts/material-parity/working-audit';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const receipt = file => ({ file, sha256: hash(readFileSync(file)) });
const load = descriptor => {
  const bytes = readFileSync(descriptor.file); assert.equal(hash(bytes), descriptor.sha256);
  return JSON.parse(bytes);
};
const checkboxLog = { file: 'artifacts/material-parity/checkbox-checkmark-retained-inputs-20261020.log',
  sha256: '30ff029a6f116c88e63027b960391e6e08bbaf6ddf3a89c305506cb43a18b8c4' };
const inkLog = { file: 'artifacts/material-parity/checkbox-disabled-checkmark-token-20261020.log',
  sha256: '1750461e2aafd8b9b6100799d3c81267e04be242d70f14cdf02d92f389a2b41f' };
const selectLog = { file: 'artifacts/material-parity/select-listbox-name-inputs-20261020.log',
  sha256: '7351677374f8515257904ee3620484ed84fa0d30880b46299204eafb19cf4833' };
const checkbox = load(checkboxLog), ink = load(inkLog), select = load(selectLog);
assert.equal(checkbox.cases, 68); assert.equal(select.cases, 40); assert.equal(ink.disabled.length, 8);
assert.deepEqual(checkbox.selectionMismatches, []);
for (const source of [...checkbox.currentSources, select.currentSource]) {
  assert.deepEqual(receipt(source.file), { file: source.file, sha256: source.sha256 });
  if (source.normalizedSha256) assert.equal(hash(readFileSync(source.file, 'utf8').replaceAll('\r\n', '\n')), source.normalizedSha256);
}
assert.deepEqual(ink.input, checkboxLog);
const activeTargets = load(select.input); assert.deepEqual(activeTargets.report, checkbox.report);
const review = JSON.parse(readFileSync(`${base}/proposals/${chipGraphicReview}.json`)).review;
assert.equal(hash(JSON.stringify(review)), chipGraphicReview);
const groups = new Map(review.groups.map(g => [g.case, g]));
assert.equal(groups.size, 2311);
// The inventory retains a historical receipt for this path. Do not bind two
// different byte versions to one dependency key or replace the historical one.
// The canonical source inventory separately fingerprints this current owner;
// this join checks it now and retains the current reference explicitly.
const currentProof = receipt('tests/material-parity/input-boundary-evidence.spec.mjs');
assert.equal(hash(readFileSync(currentProof.file, 'utf8').replaceAll('\r\n', '\n')),
  '58fe244dc56a251e144dcc6eab2c36cb18f017291da968e1d002dc36404d60ea');
const ownProof = { currentFile: currentProof.file, currentSha256: currentProof.sha256,
  boundary: 'Current append-only owner;historical receipt at this logical path remains unchanged. See source inventory and owning run.' };
const owningRun = receipt('artifacts/material-parity/queued-control-owning-20261020.log');
const history = receipt('artifacts/material-parity/queued-control-source-history-20261020.log');
const join = receipt('scripts/join-material-control-inputs.mjs');
const matching = (row, family) => {
  const group = groups.get(row.case); assert.ok(group); assert.equal(group.family, family);
  assert.equal(group.inspection, 'partial'); assert.equal(group.currentRendering, 'unverified');
  assert.equal(group.evidence.report, checkbox.report.file);
  assert.equal(group.evidence.reportSha256, checkbox.report.sha256);
  assert.deepEqual(group.evidence.pairedTrees, row.inputTrees);
  for (const descriptor of Object.values(row.inputTrees)) assert.deepEqual(receipt(descriptor.file), descriptor);
  return group;
};
let marks = 0, suppressed = 0, rejected = 0;
const touched = [];
const attach = (owner, key, value) => {
  assert.equal(owner[key], undefined); owner[key] = value; touched.push([owner, key]);
};
for (const row of checkbox.observations) {
  const group = matching(row, 'checkbox');
  assert.equal(row.reference.selected, row.candidate.selected);
  if (row.reference.selected) { marks++; assert.equal(row.reference.strokeCssAfterViewBox, 1.82); }
  else { suppressed++; assert.equal(row.candidate.mark, null); }
  const changed = structuredClone(row); changed.inputTrees.reference.sha256 = '0'.repeat(64);
  assert.throws(() => matching(changed, 'checkbox')); rejected++;
  attach(group.obligations.inputStyleStructure, 'retainedCheckboxMarkRequests', {
    disposition: 'inspected-retained-checkmark-inputs', observation: row,
    findingIds: row.reference.selected ? ['fixture-checkbox-checkmark-path-substitution'] : [],
    evidence: { checkboxLog, ownProof, owningRun, history, join },
    conclusion: row.reference.selected
      ? 'Selected SVG14px/viewBox24 request maps stroke3.12 user units to1.82CSSpx;current fixed CSS centerline differs. First demonstrated divergence is plugin path authoring,not current projection.'
      : 'Both sides suppress this mark;selected geometry finding is not applied to an absent candidate mark.',
    boundary: 'Retained request and current source-only geometry;not historical mesh,current raster,cap/join or full input/case acceptance.',
  });
}
assert.deepEqual({ marks, suppressed }, { marks: 52, suppressed: 16 });
let differentInk = 0;
for (const row of ink.disabled) {
  const markRow = checkbox.observations.find(r => r.case === row.case); assert.ok(markRow);
  const group = matching(markRow, 'checkbox'); assert.equal(markRow.candidate.disabled, true);
  assert.equal(markRow.candidate.selected, true); assert.deepEqual(row.tree, markRow.inputTrees.reference);
  assert.ok(row.rules.every(rule => rule.active && rule.conditions.length === 0));
  const numbers = value => value.match(/\d+/g)?.map(Number);
  const rgb = row.candidate === '#ffffff' ? [255, 255, 255] : row.candidate === '#000000' ? [0, 0, 0] : null;
  assert.ok(rgb); const different = JSON.stringify(numbers(row.native)) !== JSON.stringify(rgb);
  if (different) differentInk++;
  attach(group.obligations.localPaint, 'retainedCheckboxDisabledInkRequests', {
    disposition: 'inspected-retained-disabled-ink-requests', observation: row,
    findingIds: different ? ['fixture-checkbox-disabled-checkmark-ink-substitution'] : [],
    evidence: { inkLog, checkboxLog, ownProof, owningRun, history, join },
    conclusion: different ? 'Native disabled surface token differs from candidate onPrimary request.' : 'This contrast case requests matching ink;the six-case mismatch is not generalized to it.',
    boundary: 'Requested ink only,not compositing,current pixels or full disabled semantics/case closure.',
  });
}
assert.equal(differentInk, 6);
for (const row of select.rows) {
  const group = matching(row, 'select'); assert.equal(row.reference.attributes['aria-label'], 'Plan');
  assert.equal(row.candidate.authored.role, 'listbox');
  for (const key of ['ariaLabel', 'ariaLabelledby', 'aria-label', 'aria-labelledby']) assert.equal(row.candidate.authored[key], undefined);
  attach(group.obligations.semantics, 'retainedSelectListboxNamingRequests', {
    disposition: 'inspected-retained-listbox-name-omission', observation: row,
    findingIds: ['fixture-select-listbox-name-omission'],
    evidence: { selectLog, activeTargets: select.input, ownProof, owningRun, history, join },
    conclusion: 'Native listbox authors Plan;candidate authored listbox omits naming. This input omission precedes AX projection.',
    boundary: 'These40 retained open contexts only;separate one-pair actual AX evidence is not generalized to all cases. Not AT,current all-profile AX or case acceptance.',
  });
}
assert.equal(touched.length, 116); assert.equal(rejected, 68);
const proposed = saveReviewProposal(base, review);
const reader = createDividerReviewedBoundariesReader({ root: process.cwd(), read: readFileSync, reviewSha256: chipGraphicReview });
const loaded = loadCaseObligationReview(proposed.file, proposed.sha256, review.groups.map(g => g.case), { read: reader.read });
assert.equal(loaded.cases.length, 2311); assert.equal(loaded.inspectionComplete, false); assert.equal(loaded.currentRenderingAccepted, false);
for (const [owner, key] of touched) delete owner[key];
assert.equal(hash(JSON.stringify(review)), chipGraphicReview, 'Removing only116 children must recover the complete predecessor');
console.log(JSON.stringify({ predecessor: chipGraphicReview, proposed, checkboxCases: 68, selectCases: 40,
  selectedMarks: marks, suppressedMarks: suppressed, disabledInkCases: 8, differingInkCases: differentInk,
  addedChildren: touched.length, rejectedControls: rejected, validatedDependencies: loaded.evidenceFingerprints.length,
  completePredecessorRecovered: true, canonicalPublication: false, inspectionComplete: false,
  scope: 'Case-bounded retained authored inputs only;no primitive-focus or dynamic-readonly runtime probe generalized to captured cases;all parent obligations remain.' }));
