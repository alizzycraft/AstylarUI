import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { execFileSync } from 'node:child_process';
import { collectRangeCaretInputs, inspectRangeCaretInput, rangeCaretSurveyFile } from './audit-material-range-caret-inputs.mjs';
import { applyRangeCaretReviews, validateRangeCaretReviews, rangeCaretAttribution } from './audit-material-range-caret-inputs.mjs';
import { queryFindings } from './audit-findings-store.mjs';
import { collectFullTreeInventory } from '../tests/material-parity/input-equivalence-audit.mjs';
import { bindPreciseAuditNormalization } from '../tests/material-parity/audit-normalization-contracts.mjs';

assert.equal(process.argv.length, 2);
// Original proof digests are checked in memory by the collector. At the saved
// report boundary JSON omits undefined synthetic-root type fields; compare its
// exact wire representation, without filling omissions with null or a type.
const actual = JSON.parse(JSON.stringify(collectRangeCaretInputs()));
const saved = JSON.parse(readFileSync(rangeCaretSurveyFile));
assert.deepEqual(saved, JSON.parse(execFileSync('git', ['show', `a6c98bdc7c596a3b3d09686f9369f9f91dbc9854:${rangeCaretSurveyFile}`], { maxBuffer: 16 * 1024 * 1024 })),
  'Retained range survey must remain unchanged');
// The collector authenticates both known source transitions and executes both
// pinned normalization contracts. Only their current receipts may differ.
const reconciled = structuredClone(saved);
for (const file of ['tests/material-parity/border-initial-input-evidence.mjs',
  'tests/material-parity/generated-node-mapping-evidence.mjs', 'tests/material-parity/input-equivalence-audit.mjs']) {
  const before = reconciled.parentSourceChecks.filter(s => s.file === file);
  const after = actual.parentSourceChecks.filter(s => s.file === file);
  assert.equal(before.length, 1); assert.equal(after.length, 1);
  assert.equal(before[0].recorded, after[0].recorded);
  before[0].current = after[0].current; before[0].verification = after[0].verification;
}
delete reconciled.sourceFingerprints;
delete saved.sourceFingerprints; assert.ok(isDeepStrictEqual(actual, reconciled), 'Complete saved range review differs beyond authenticated receipts');
assert.equal(actual.originalCasesScanned, 2311); assert.equal(actual.selectedCases, 78);
assert.equal(actual.groups, 4); assert.equal(actual.observations, 156); assert.equal(actual.originalScalarChecks, 13884);
assert.deepEqual(actual.controlDifferences, { min: 78, max: 78, step: 156, value: 0, disabled: 0 });
const first = actual.findings[0].observations[0];
const entry = (() => {
  const raw = JSON.parse(readFileSync(actual.capture.file));
  return raw.results.find(e => `static:${e.family}@${e.profile}/${e.viewport.id}` === first.case);
})();
assert.ok(entry);
const base = { input: entry.styleInputs.find(i => i.id === actual.findings[0].element),
  reference: JSON.parse(readFileSync(entry.inputTrees.reference.file)), candidate: JSON.parse(readFileSync(entry.inputTrees.astylar.file)) };
const rn = p => p.reference.nodes.find(n => n.attributes?.id === p.input.id);
const cn = p => p.candidate.nodes.find(n => n.authored?.id === p.input.id);
const inspect = p => inspectRangeCaretInput(p.input, p.reference, p.candidate);
assert.deepEqual(JSON.parse(JSON.stringify(inspect(base))), first.review);
const negative = [
  p => { rn(p).attributes.type = 'text'; }, p => { cn(p).authored.inputType = 'text'; },
  p => { rn(p).attributes.contenteditable = 'true'; },
  p => { cn(p).authored.attributes = { contenteditable: 'true' }; },
  p => { p.reference.nodes.push({ key: 'child', parent: rn(p).key }); },
  p => { p.candidate.nodes.push({ key: 'child', parent: cn(p).key }); },
  p => { delete rn(p).attributes.min; }, p => { cn(p).authored.step = 1; },
  p => { delete rn(p).value; }, p => { cn(p).authored.disabled = 'false'; },
  p => { cn(p).authored.style = { caretColor: 'red' }; },
  p => { cn(p).authored.style = { all: 'initial' }; },
  p => { const n = p.candidate.nodes.find(n => n.authored.id === 'page'); n.authored.style = { transition: 'color 1s' }; },
  p => { rn(p).inline['caret-color'] = { value: 'red', important: false }; },
  p => { p.input.reference.caretColor = 'red'; },
  p => { p.candidate.resolvedStyleEvidenceVersion = 1; },
  p => { delete cn(p).interactionResolvedStyle; },
  p => { p.reference.nodes.push(structuredClone(rn(p))); },
];
for (const [i, mutate] of negative.entries()) {
  const p = structuredClone(base); mutate(p); assert.throws(() => inspect(p), `invalid range evidence ${i}`);
}
let changedControls = 0;
for (const field of ['min', 'max', 'step', 'value']) {
  const p = structuredClone(base); cn(p).authored[field] = '37';
  const result = inspect(p); assert.ok(result.nonCaretControlDifferences.some(d => d.field === field && d.candidate === '37'));
  assert.equal(result.wholeControlInputEquivalent, false); changedControls++;
}
{
  const p = structuredClone(base); cn(p).authored.disabled = !cn(p).authored.disabled;
  assert.ok(inspect(p).nonCaretControlDifferences.some(d => d.field === 'disabled')); changedControls++;
}
{
  const p = structuredClone(base); p.input.reference.caretColor = 'rgb(21, 21, 21)'; p.input.reference.color = 'rgb(21, 21, 21)';
  p.reference.styles[rn(p).style].caretColor = p.input.reference.caretColor;
  p.reference.styles[rn(p).style].color = p.input.reference.color;
  const result = inspect(p); assert.equal(result.referenceComputedCaret, 'rgb(21, 21, 21)');
  assert.notEqual(result.originalProofSha256, first.review.originalProofSha256); changedControls++;
}
const conservation = [
  r => { r.findings.pop(); }, r => { r.findings[1] = structuredClone(r.findings[0]); },
  r => { r.findings[0].observations.pop(); },
  r => { r.findings[0].observations[1] = structuredClone(r.findings[0].observations[0]); },
  r => { r.findings[0].observations[0].review.referenceComputedCaret = 'red'; },
  r => { r.findings[0].observations[0].review.nonCaretControlDifferences = []; },
  r => { r.findings[0].observations[0].original.inputTrees.astylar.sha256 = '0'.repeat(64); },
  r => { r.findings[0].observations[0].review.originalProofSha256 = '0'.repeat(64); },
  r => { r.controlDifferences.step--; }, r => { r.originalCasesScanned--; },
  r => { r.inputEquivalent = true; }, r => { r.rendererCauseProven = true; },
  r => { r.findings[0].observations[0].review.originalAncestry.candidate[0].type = null; },
  r => { r.findings[0].observations[0].review.originalAncestry.candidate[0].type = 'div'; },
];
for (const [i, mutate] of conservation.entries()) {
  const r = structuredClone(reconciled); mutate(r);
  assert.throws(() => assert.ok(isDeepStrictEqual(actual, r), 'Full range review changed'), `conservation ${i}`);
}
const captured = JSON.parse(readFileSync(actual.capture.file));
const cases = [...captured.results.map(c => ({ ...c, kind: 'static' })),
  ...captured.interactions.map(c => ({ ...c, kind: 'interaction' }))].filter(c => c.family === 'slider');
const inventory = collectFullTreeInventory(cases), normalize = bindPreciseAuditNormalization();
assert.deepEqual(inventory.errors, []);
const rows = queryFindings('artifacts/material-parity/working-audit', 'slider', {
  generation: '7ffd3a4832d90e185be9d234b3d022f276db113767a6fcb0c3c965c51c14d592',
  indexSha256: 'b37363024107a9aeca949a701837764fdfe96e17b0aedca1549e187573dc8df4',
}).filter(r => r.evidence.section === 'discrepancies');
const reviewed = applyRangeCaretReviews(rows, cases, inventory, normalize);
const changed = reviewed.filter(r => r.attribution === rangeCaretAttribution);
assert.equal(changed.length, 4); assert.equal(changed.reduce((n, r) => n + r.occurrences, 0), 156);
const metadata = new Set(['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']);
const raw = r => Object.fromEntries(Object.entries(r).filter(([k]) => !metadata.has(k)));
reviewed.forEach((r, i) => {
  assert.deepEqual(raw(r), raw(rows[i]));
  if (r.attribution !== rangeCaretAttribution) assert.deepEqual(r, rows[i]);
  else {
    assert.equal(r.reviewEvidence.observations.length, r.occurrences);
    assert.ok(r.reviewEvidence.observations.every(p => !p.wholeControlInputEquivalent && !p.rendererCauseProven && !p.renderingEquivalent));
  }
});
const persisted = JSON.parse(JSON.stringify(reviewed));
assert.deepEqual(validateRangeCaretReviews(persisted, rows, cases, inventory, normalize), []);
for (const mutate of [r => r.splice(r.findIndex(x => x.attribution === rangeCaretAttribution), 1),
  r => { r.find(x => x.attribution === rangeCaretAttribution).reviewEvidence.renderingEquivalent = true; },
  r => { r.find(x => x.attribution === rangeCaretAttribution).reviewEvidence.observations[0].originalAncestry.candidate[0].type = null; }]) {
  const variant = structuredClone(persisted); mutate(variant);
  assert.equal(validateRangeCaretReviews(variant, rows, cases, inventory, normalize).length, 1);
}
console.log(JSON.stringify({ groups: actual.groups, observations: actual.observations, cases: actual.selectedCases,
  originalScalarChecks: actual.originalScalarChecks, negativeControls: negative.length,
  changedEvidenceControls: changedControls, conservationControls: conservation.length, savedReportMatches: true, filesWritten: false }));
