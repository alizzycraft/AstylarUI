import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { replayReviewedSourceBatchObservations, bindReviewedSourceBatchObservations } from './reviewed-source-batch-observation-binding.mjs';

const digest = x => createHash('sha256').update(JSON.stringify(x)).digest('hex');
let replay, complete;
const context = () => replay ??= replayReviewedSourceBatchObservations();
const binding = () => complete ??= bindReviewedSourceBatchObservations(context().original, context());
function changeOwner(report, observation, transform) {
  const list = observation.case.startsWith('static:') ? 'results' : 'interactions';
  const kind = list === 'results' ? 'static' : 'interaction';
  return { ...report, [list]: report[list].map(e =>
    `${kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}` === observation.case
      ? transform(e, observation.element) : e) };
}

test('complete source replay binds all 146 groups and 6295 original observations without classifying canonical output', () => {
  const r = context(), before = digest(r.plan), result = binding();
  assert.equal(result.groups.length, 146); assert.equal(result.observations.length, 6295);
  assert.equal(result.coverage.complete, true); assert.equal(result.coverage.sourceCases, 2311);
  assert.deepEqual(result.coverage.missingObservations, []); assert.equal(digest(r.plan), before);
  const batches = Object.fromEntries([...new Set(result.groups.map(g => g.batch))].map(batch => [batch,
    { groups: result.groups.filter(g => g.batch === batch).length,
      observations: result.groups.filter(g => g.batch === batch).reduce((n, g) => n + g.occurrences, 0) }]));
  assert.deepEqual(batches, { 'owner-motion': { groups: 86, observations: 4708 },
    'layout-authoring': { groups: 8, observations: 492 }, 'button-state-paint': { groups: 32, observations: 135 },
    'base-alpha': { groups: 8, observations: 120 }, 'motion-delay': { groups: 12, observations: 840 } });
  for (const flag of ['canonicalFilesChanged', 'inputEquivalent', 'computedCandidateVerified', 'cascadeWinnerProven',
    'inactiveMotionProven', 'renderingEquivalent', 'rendererCauseProven']) assert.equal(result[flag], false);
  console.log(JSON.stringify({ groups: result.groups.length, observations: result.observations.length, batches,
    orderedObservationSha256: digest(result.observations), canonicalFilesChanged: false }));
});

test('a missing captured owner is explicit incomplete coverage, never silently accepted', () => {
  const r = context(), full = binding(), selected = full.observations[0];
  const subset = changeOwner(r.original, selected, (e, id) => ({ ...e, styleInputs: e.styleInputs.filter(i => i.id !== id) }));
  const result = bindReviewedSourceBatchObservations(subset, r);
  const missing = full.observations.filter(o => o.case === selected.case && o.element === selected.element);
  assert.equal(result.coverage.complete, false);
  assert.equal(result.coverage.missingInputs.length, 1);
  assert.deepEqual(result.coverage.missingObservations, missing.map(({ case: c, element, property }) => ({ case: c, element, property })));
  assert.equal(result.observations.length, 6295 - missing.length);
  assert.deepEqual(result.observations, full.observations.filter(o => o.case !== selected.case || o.element !== selected.element));
});

test('binding rejects altered, duplicated or reordered source inputs and inflated or changed proofs', () => {
  const r = context(), selected = binding().observations[0];
  const changed = changeOwner(r.original, selected, (e, id) => ({ ...e, styleInputs: e.styleInputs.map(i =>
    i.id === id ? { ...i, reference: { ...i.reference, [selected.property]: 'changed' } } : i) }));
  const duplicateOwner = changeOwner(r.original, selected, (e, id) => ({ ...e,
    styleInputs: [...e.styleInputs, e.styleInputs.find(i => i.id === id)] }));
  const reordered = { ...r.original, results: [...r.original.results].reverse() };
  const duplicateCase = { ...r.original, interactions: [...r.original.interactions, r.original.interactions[0]] };
  const metadata = changeOwner(r.original, selected, e => ({ ...e, inputTrees: { ...e.inputTrees, reference: { file: 'forged', sha256: 'forged' } } }));
  for (const supplied of [changed, duplicateOwner, reordered, duplicateCase, metadata])
    assert.throws(() => bindReviewedSourceBatchObservations(supplied, r));
  for (const mutate of [
    p => { p.findings[0].inputEquivalent = true; }, p => { p.findings[0].cases.pop(); },
    p => { p.findings[0].canonicalRowSha256 = 'forged'; }, p => { p.sources = {}; },
  ]) { const plan = structuredClone(r.plan); mutate(plan); assert.throws(() => bindReviewedSourceBatchObservations(r.original, { ...r, plan })); }
  for (const kind of Object.keys(r.sources)) {
    const sources = { ...r.sources, [kind]: { ...r.sources[kind], inputEquivalent: true } };
    assert.throws(() => bindReviewedSourceBatchObservations(r.original, { ...r, sources }));
  }
  assert.throws(() => bindReviewedSourceBatchObservations(r.original, { ...r, normalize: () => ({}) }));
  console.log(JSON.stringify({ rejectionControls: 17 }));
});
