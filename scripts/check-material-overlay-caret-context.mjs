import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { collectOverlayCaretContext, inspectOverlayCaretRequests,
  overlayCaretSurveyFile } from './audit-material-overlay-caret-context.mjs';

assert.equal(process.argv.length, 2);
const actual = collectOverlayCaretContext();
const saved = JSON.parse(readFileSync(overlayCaretSurveyFile)); delete saved.sourceFingerprints;
assert.deepEqual(actual, saved);
assert.deepEqual(actual.counts, { groups: 13, cases: 109, observations: 378, originalScalarChecks: 33642,
  scalarRuleGapObservations: 59, motionRequestObservations: 210, directCaretOrResetObservations: 0 });
const parent = JSON.parse(readFileSync(actual.parent.file));
const expected = parent.groups.filter(g => g.reasonCounts['unreviewed-captured-root-context']);
assert.deepEqual(actual.groups.map(g => [g.family, g.element, g.canonicalRowSha256, g.observations.map(o => o.original)]),
  expected.map(g => [g.family, g.element, g.canonicalRowSha256, g.observations]));
assert.equal(actual.receiptDiagnostic.onDiskReaderPasses, false);
assert.equal(actual.receiptDiagnostic.filesWritten, false);

const o = actual.groups[0].observations[0];
const base = { alias: o.originalAlias,
  reference: JSON.parse(readFileSync(o.original.inputTrees.reference.file)),
  candidate: JSON.parse(readFileSync(o.original.inputTrees.astylar.file)) };
const inspect = p => inspectOverlayCaretRequests(p.alias, p.reference, p.candidate);
assert.deepEqual(JSON.parse(JSON.stringify(inspect(base))), o.review);
const rn = p => p.reference.nodes.find(n => n.key === p.alias.referenceNode);
const cn = p => p.candidate.nodes.find(n => n.key === p.alias.candidateNode);
const root = p => p.candidate.nodes.find(n => n.parent === null);
const negative = [
  p => { p.alias.inputEquivalent = true; },
  p => { p.alias.status = 'unmapped'; },
  p => { p.alias.referencePath.shift(); },
  p => { p.alias.candidatePath.push(p.alias.candidatePath[0]); },
  p => { rn(p).parent = 'missing'; },
  p => { cn(p).parent = null; },
  p => { p.reference.nodes.push(structuredClone(rn(p))); },
  p => { p.candidate.nodes.push(structuredClone(cn(p))); },
  p => { delete p.reference.styles[rn(p).style].caretColor; },
  p => { rn(p).inline = null; },
  p => { rn(p).rules.push(999999); },
  p => { delete cn(p).normalResolvedStyle; },
  p => { root(p).resolvedStyle = {}; },
  p => { p.candidate.rules.push({ selector: null }); },
  p => { const index = p.reference.rules.length;
    p.reference.rules.push({ selector: '*', active: true, conditions: [], declarations: { 'caret-color': { value: 'red', important: false } } });
    rn(p).rules.push(index); },
];
for (const [i, mutate] of negative.entries()) {
  const p = structuredClone(base); mutate(p); assert.throws(() => inspect(p), `invalid evidence ${i}`);
}
// Valid evidence can contain new requests; it must stay visible, not be rejected
// merely because the baseline had none. Include camel/kebab and broad resets.
let positive = 0;
for (const property of ['caret', 'caretColor', 'caret-color', 'caret-shape', 'caret-animation', 'all']) {
  const p = structuredClone(base); cn(p).authored.style ??= {}; cn(p).authored.style[property] = 'diagnostic';
  const r = inspect(p); assert.equal(r.hasDirectCaretOrResetRequest, true);
  assert.ok(r.requests.some(q => q.side === 'astylar' && q.declarations[property] === 'diagnostic')); positive++;
}
for (const property of ['animationName', 'animation-name', 'transition', 'transitionProperty']) {
  const p = structuredClone(base); cn(p).interactionResolvedStyle[property] = 'diagnostic';
  assert.equal(inspect(p).hasMotionRequest, true); positive++;
}
{
  const p = structuredClone(base), index = p.reference.rules.length;
  const rule = { selector: '*', active: false, conditions: [{ kind: 'media', text: 'print' }],
    declarations: { 'transition-property': { value: '', important: false } }, cssText: '* { transition: var(--motion); }' };
  p.reference.rules.push(rule); rn(p).rules.push(index);
  const request = inspect(p).requests.find(r => r.index === index && r.side === 'reference');
  assert.deepEqual(request.declarations, rule.declarations); assert.equal(request.active, false);
  assert.deepEqual(request.conditions, rule.conditions); assert.equal(request.cssText, rule.cssText); positive++;
}
{
  const p = structuredClone(base); p.candidate.rules.push({ selector: ':future-pseudo()', caretColor: 'red' });
  assert.ok(inspect(p).requests.some(r => r.source === ':future-pseudo()' && r.possible)); positive++;
}
{
  const p = structuredClone(base); cn(p).authored.attributes ??= {};
  cn(p).authored.attributes.style = 'caret-color: red'; cn(p).authored.attributes.contenteditable = 'true';
  const r = inspect(p); assert.ok(r.rawStyleAttributes.some(a => a.raw === 'caret-color: red'));
  assert.ok(r.editableOwners.some(n => n.node === p.alias.candidateNode)); positive++;
}
const conservation = [
  r => { r.groups.pop(); }, r => { r.groups[1] = structuredClone(r.groups[0]); },
  r => { r.groups[0].observations.pop(); },
  r => { r.groups[0].observations[1] = structuredClone(r.groups[0].observations[0]); },
  r => { r.groups[0].observations[0].original.proofSha256 = '0'.repeat(64); },
  r => { r.groups[0].observations[0].freshSource.sha256 = '0'.repeat(64); },
  r => { r.groups[0].observations[0].freshExternalContext[0].computedCaretAndMotion['caret-color'] = 'red'; },
  r => { r.groups[0].observations[0].historicalExternalContextVerified = true; },
  r => { r.groups[0].observations[0].review.scalarRuleGap = true; },
  r => { r.counts.observations--; }, r => { r.renderingEquivalent = true; },
  r => { r.receiptDiagnostic.onDiskReaderPasses = true; },
];
for (const [i, mutate] of conservation.entries()) {
  const r = structuredClone(saved); mutate(r);
  // Compare the entire object, but do not construct a multi-megabyte formatted
  // assertion diff for an intentional mismatch in each sensitivity control.
  assert.throws(() => assert.ok(isDeepStrictEqual(actual, r), 'Full report changed'), `report conservation ${i}`);
}
console.log(JSON.stringify({ ...actual.counts, sourceReplayMatchesSaved: true,
  negativeControls: negative.length, changedEvidenceControls: positive, conservationControls: conservation.length,
  onDiskLegacyReaderPasses: false, filesWritten: false }));
