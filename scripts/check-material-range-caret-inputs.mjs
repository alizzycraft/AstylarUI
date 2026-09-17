import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { collectRangeCaretInputs, inspectRangeCaretInput, rangeCaretSurveyFile } from './audit-material-range-caret-inputs.mjs';

assert.equal(process.argv.length, 2);
// Original proof digests are checked in memory by the collector. At the saved
// report boundary JSON omits undefined synthetic-root type fields; compare its
// exact wire representation, without filling omissions with null or a type.
const actual = JSON.parse(JSON.stringify(collectRangeCaretInputs()));
const saved = JSON.parse(readFileSync(rangeCaretSurveyFile));
delete saved.sourceFingerprints; assert.ok(isDeepStrictEqual(actual, saved), 'Complete saved range review differs');
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
  const r = structuredClone(saved); mutate(r);
  assert.throws(() => assert.ok(isDeepStrictEqual(actual, r), 'Full range review changed'), `conservation ${i}`);
}
console.log(JSON.stringify({ groups: actual.groups, observations: actual.observations, cases: actual.selectedCases,
  originalScalarChecks: actual.originalScalarChecks, negativeControls: negative.length,
  changedEvidenceControls: changedControls, conservationControls: conservation.length, savedReportMatches: true, filesWritten: false }));
