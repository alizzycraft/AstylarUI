import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { collectVisibilityObservationStages, proveVisibilityObservationStage,
  classifyVisibilityObservationStage, visibilityObservationAttribution } from './visibility-observation-stage.mjs';
const hash = x => createHash('sha256').update(x).digest('hex');

test('visibility observation-stage preparation reviews exactly 15 groups and 530 original inputs', () => {
  const report = collectVisibilityObservationStages();
  assert.deepEqual(report, JSON.parse(readFileSync('docs/material-visibility-observation-stages.json')));
  assert.deepEqual(report.counts, { reviewedGroups: 15, reviewedObservations: 530, pendingGroups: 2, pendingObservations: 138 });
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(hash(bytes), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const capture = JSON.parse(bytes), expected = new Map(report.reviewed.flatMap(g => g.observations.map(o => [JSON.stringify([o.case, g.element]), o])));
  const seen = new Set(); let first;
  for (const [kind, cases] of [['static', capture.results], ['interaction', capture.interactions]]) for (const entry of cases) {
    const key = `${kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`;
    for (const input of entry.styleInputs) {
      const member = JSON.stringify([key, input.id]), observation = expected.get(member);
      if (!observation) continue;
      assert.ok(!seen.has(member)); seen.add(member);
      const classification = classifyVisibilityObservationStage(input, 'visibility', input.reference.visibility, input.astylar.visibility, observation);
      assert.equal(classification.attribution, visibilityObservationAttribution);
      assert.equal(classification.classification, 'parity-harness-defect');
      first ??= { input, observation };
    }
  }
  assert.equal(seen.size, 530);
  const { input, observation } = first;
  for (const mutate of [i => { i.id = 'other'; }, i => { i.reference.visibility = 'hidden'; },
    i => { i.astylar.visibility = 'visible'; }, i => { delete i.astylarNormalResolvedStyle; }]) {
    const changed = structuredClone(input); mutate(changed);
    assert.equal(classifyVisibilityObservationStage(changed, 'visibility', 'visible', undefined, observation), undefined);
  }
  for (const field of ['computedCandidateVerified', 'renderingEquivalent', 'rendererCauseProven']) {
    const changed = structuredClone(observation); changed.proof[field] = true;
    assert.equal(classifyVisibilityObservationStage(input, 'visibility', 'visible', undefined, changed), undefined);
  }
  assert.equal(classifyVisibilityObservationStage(input, 'display', 'visible', undefined, observation), undefined);
});

test('visibility stage proof rejects missing stages, inherited requests, resets and state-driven owners', () => {
  const population = JSON.parse(readFileSync('docs/material-visibility-input-population.json'));
  const g = population.groups[0], o = g.observations[0];
  const reference = JSON.parse(readFileSync(o.inputTrees.reference.file)), candidate = JSON.parse(readFileSync(o.inputTrees.astylar.file));
  const target = t => t.nodes.find(n => n.authored?.id === g.element);
  const parent = t => t.nodes.find(n => n.key === target(t).parent);
  const referenceRoot = t => t.nodes.find(n => n.key.startsWith('overlay:') && n.parent === null);
  proveVisibilityObservationStage(reference, candidate, g.family, g.element);
  for (const mutate of [
    (r, a) => { delete parent(a).normalResolvedStyle; },
    (r, a) => { parent(a).interactionResolvedStyle.visibility = 'hidden'; },
    (r, a) => { a.rules.push({ selector: '.unused', visibility: 'hidden' }); },
    (r, a) => { target(a).authored.style = { visibility: 'hidden' }; },
    (r, a) => { a.rules.push({ selector: '*', all: 'initial' }); },
    r => { referenceRoot(r).inline.visibility = { value: 'visible', important: false }; },
    r => { referenceRoot(r).inline.all = { value: 'initial', important: false }; },
    r => { r.errors.push('unreadable stylesheet'); },
    (r, a) => { target(a).authored.type = 'custom:box'; },
  ]) {
    const r = structuredClone(reference), a = structuredClone(candidate); mutate(r, a);
    assert.throws(() => proveVisibilityObservationStage(r, a, g.family, g.element));
  }
  assert.throws(() => proveVisibilityObservationStage(reference, candidate, 'tabs', g.element));
});
