import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { collectOwnerCaretAttribution, ownerCaretAttributionFile } from './audit-material-owner-caret-attribution.mjs';
import { inspectOwnerCaretInput } from '../tests/material-parity/owner-caret-input-evidence.mjs';
import { classifyOwnerCaretInput, ownerCaretAttributions } from '../tests/material-parity/owner-caret-classification.mjs';

assert.equal(process.argv.length, 2);
const hash = x => createHash('sha256').update(JSON.stringify(x)).digest('hex');
const saved = JSON.parse(readFileSync(ownerCaretAttributionFile)); delete saved.sourceFingerprints;
const replay = collectOwnerCaretAttribution();
assert.deepEqual(replay, saved);
const reportMutations = [
  r => { r.findings.pop(); },
  r => { r.findings[0] = structuredClone(r.findings[1]); },
  r => { r.findings[0].observations.pop(); },
  r => { r.findings[0].observations[13].case = r.findings[0].observations[12].case; },
  r => { r.findings[0].observations.reverse(); },
  r => { r.findings[0].observations[0].referenceRaw = 'red'; },
  r => { r.findings[0].observations[0].candidateRaw = 'auto'; },
  r => { r.findings[0].observations[0].inputSha256 = '0'.repeat(64); },
  r => { r.findings[0].observations[0].proofSha256 = '0'.repeat(64); },
  r => { r.findings[0].observations[0].inputTrees.astylar.sha256 = '0'.repeat(64); },
  r => { r.findings[0].observations[0].classification.reviewEvidence.inputEquivalent = true; },
  r => { r.findings[0].disposition = 'equivalent'; },
  r => { r.findings.find(g => g.disposition === 'requires-specific-review').observations[0].classification = {}; },
  r => { r.canonicalIntegration = true; },
];
for (const mutate of reportMutations) {
  const changedReport = structuredClone(saved); mutate(changedReport);
  assert.throws(() => assert.deepEqual(changedReport, replay));
}
const raw = JSON.parse(readFileSync(saved.capture.file));
const entry = raw.results.find(e => e.family === 'badge' && e.profile === 'light' && e.viewport.id === 'desktop');
const trees = Object.fromEntries(['reference', 'astylar'].map(side =>
  [side, JSON.parse(readFileSync(entry.inputTrees[side].file))]));
const make = element => {
  const input = structuredClone(entry.styleInputs.find(i => i.id === element));
  const group = saved.findings.find(g => g.family === 'badge' && g.element === element &&
    g.observations.some(o => o.case === 'static:badge@light/desktop'));
  const proof = inspectOwnerCaretInput(input, trees.reference, trees.astylar, { family: 'badge' });
  return { input, property: 'caretColor', reference: group.reference, candidate: undefined,
    observation: { case: 'static:badge@light/desktop', family: 'badge', profile: 'light', viewport: entry.viewport,
      state: 'static', reference: group.reference, inputSha256: hash(input), proofSha256: hash(proof), proof } };
};
const classify = x => classifyOwnerCaretInput(x.input, x.property, x.reference, x.candidate, x.observation);
const local = make('badge-label'), motion = make('badge-count');
assert.equal(classify(local).attribution, ownerCaretAttributions.local);
assert.equal(classify(motion).attribution, ownerCaretAttributions.motion);
const flags = ['inputEquivalent', 'computedCandidateVerified', 'descendantCaretVerified',
  'renderingEquivalent', 'rendererCauseProven', 'wholeElementInputEquivalent'];
for (const x of [local, motion]) {
  const before = JSON.stringify(x), result = classify(x);
  assert.equal(result.classification, 'parity-harness-defect');
  for (const flag of flags) assert.equal(result.reviewEvidence[flag], false);
  assert.equal(result.reviewEvidence.rawCandidate, '<omitted>'); assert.equal(JSON.stringify(x), before);
}
const mutations = [
  x => { x.property = 'color'; },
  x => { x.reference = 'changed'; },
  x => { x.candidate = 'auto'; },
  x => { x.observation.case = ''; },
  x => { x.observation.family = null; },
  x => { x.observation.viewport = null; },
  x => { x.input.astylarResolvedStyleEvidenceVersion = 1; },
  x => { x.input.astylar.caretColor = 'auto'; },
  x => { x.input.astylarNormalResolvedStyle.caretColor = '#000000'; },
  x => { x.input.astylarInteractionResolvedStyle.all = 'initial'; },
  x => { x.input.astylar.transition = 'color 1s'; },
  x => { delete x.input.astylarNormalResolvedStyle; },
  x => { x.observation.proof.referenceComputedCaret = 'red'; },
  x => { x.observation.proof.referenceComputedColor = 'red'; },
  x => { x.observation.proof.candidateLocalCaret = 'auto'; },
  x => { x.observation.proof.element = 'other'; },
  x => { x.observation.proof.mapping = 'unproven'; },
  x => { x.observation.proof.referencePath = []; },
  x => { x.observation.proof.candidatePath = []; },
  x => { x.observation.proof.source = 'invented'; },
  x => { x.observation.proof.revision = -1; },
  x => { x.observation.proof.issues.push({ reason: 'unreviewed-captured-root-context' }); },
  x => { x.observation.proof.requests.astylar.push({ declarations: { caretColor: 'red' } }); },
  ...flags.filter(f => f !== 'wholeElementInputEquivalent').map(flag => x => { x.observation.proof[flag] = true; }),
];
let rejected = 0;
for (const base of [local, motion]) for (const mutate of mutations) {
  const x = structuredClone(base); mutate(x);
  // Rebind receipts so these controls exercise classification semantics rather
  // than merely failing the digest guard. Real-source replay remains separate.
  x.observation.inputSha256 = hash(x.input); x.observation.proofSha256 = hash(x.observation.proof);
  assert.equal(classify(x), undefined); rejected++;
}
for (const key of ['inputSha256', 'proofSha256']) {
  const x = structuredClone(local); x.observation[key] = '0'.repeat(64);
  assert.equal(classify(x), undefined); rejected++;
}
const motionChanges = [
  r => { r.declarations['transition-property'] = { value: 'color', important: false }; },
  r => { r.declarations['transition-property'] = { value: 'caret-color', important: false }; },
  r => { r.declarations['transition-property'] = { value: 'all', important: false }; },
  r => { r.declarations['transition-property'] = { value: '', important: false }; },
  r => { r.declarations['transition-property'] = { value: 'var(--target)', important: false }; },
  r => { delete r.declarations['transition-property']; },
  r => { r.declarations.transition = { value: 'none', important: false }; },
  r => { r.declarations['animation-name'] = { value: 'pulse', important: false }; },
  r => { r.cssText = ''; },
];
for (const mutate of motionChanges) {
  const x = structuredClone(motion); mutate(x.observation.proof.requests.reference[0]);
  x.observation.proofSha256 = hash(x.observation.proof);
  assert.equal(classify(x), undefined); rejected++;
}
// A known non-caret target remains visible as retained motion review, not erased.
const changed = structuredClone(motion);
changed.observation.proof.requests.reference[0].declarations['transition-property'].value = 'opacity';
changed.observation.proofSha256 = hash(changed.observation.proof);
assert.equal(classify(changed).attribution, ownerCaretAttributions.motion);
assert.notEqual(classify(changed).reviewEvidence.proofSha256, classify(motion).reviewEvidence.proofSha256);
console.log(JSON.stringify({ originalCasesScanned: saved.originalCasesScanned, groups: saved.groups,
  observations: saved.observations, reviewedGroups: 118, reviewedObservations: 3154,
  retainedGroups: 27, retainedObservations: 896, negativeControls: rejected,
  reportConservationControls: reportMutations.length, positiveControls: 3,
  fullOriginalReplayMatches: true, canonicalIntegration: false }));
