import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { loadGapReviewMembership, recordGapReviewMembership } from '../../scripts/bind-material-gap-review-membership.mjs';
import { classifyGapReview, gapReviewAttributions } from './gap-review-classification.mjs';

const evidence = await loadGapReviewMembership();
const binding = recordGapReviewMembership(evidence);
assert.deepEqual(binding, JSON.parse(readFileSync('docs/material-gap-review-membership.json')));
const bytes = readFileSync(evidence.join.capture.file);
assert.equal(createHash('sha256').update(bytes).digest('hex'), evidence.join.capture.sha256);
const raw = JSON.parse(bytes), originals = new Map();
for (const [kind, entries] of [['static', raw.results], ['interaction', raw.interactions]]) for (const entry of entries) {
  const caseId = `${kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`;
  for (const input of entry.styleInputs) originals.set(`${caseId}/${input.id}`, input);
}
const context = (group, observation) => ({ group, observation, family: group.family, case: observation.case, inputTrees: observation.inputTrees });

test('bounded gap review classifies only verified observation and capture defects and retains unresolved motion', () => {
  const counts = { motion: 0, 'scalar-layer-loss': 0, unresolved: 0 };
  for (const group of binding.rows) for (const observation of group.observations) {
    const input = originals.get(`${observation.case}/${group.element}`); assert.ok(input);
    const result = classifyGapReview(input, group.property, 'normal', undefined, context(group, observation));
    if (group.reviewDisposition === 'requires-review') { assert.equal(result, undefined); counts.unresolved++; continue; }
    assert.equal(result.classification, 'parity-harness-defect');
    assert.equal(result.attribution, gapReviewAttributions[group.kind]); counts[group.kind]++;
    for (const flag of ['inputEquivalent', 'wholeElementInputEquivalent', 'computedCandidateVerified',
      'usedGapVerified', 'renderingEquivalent', 'rendererCauseProven']) assert.equal(result.reviewEvidence[flag], false);
    assert.equal(classifyGapReview(input, 'color', 'normal', undefined, context(group, observation)), undefined);
  }
  assert.deepEqual(counts, { motion: 1720, 'scalar-layer-loss': 118, unresolved: 64 });
});

test('gap review rejects altered identities stages membership and fabricated equivalence', () => {
  const mutations = [
    x => { x.property = 'gap'; }, x => { x.reference = '0px'; }, x => { x.candidate = '0px'; },
    x => { x.context.family = 'unknown'; }, x => { x.context.case += '-other'; },
    x => { x.context.inputTrees = {}; }, x => { x.context.group.priorAttribution = 'equivalent'; },
    x => { x.context.group.inputEquivalent = true; }, x => { x.context.group.rendererCauseProven = true; },
    x => { x.context.group.originalProofSha256 = ''; }, x => { x.context.group.observations.pop(); },
    x => { x.context.group.observations.push(structuredClone(x.context.observation)); },
    x => { x.context.observation.candidateRawShorthand = '8px'; },
    x => { x.input.astylarResolvedStyleEvidenceVersion = 1; },
    x => { x.input.astylarNormalResolvedStyle.gap = '8px'; },
    x => { x.input.astylarInteractionResolvedStyle.transition = 'all 1s'; },
    x => { x.input.astylar['row-gap'] = '0px'; },
  ];
  for (const kind of ['motion', 'scalar-layer-loss']) {
    const group = binding.rows.find(r => r.kind === kind && r.reviewDisposition !== 'requires-review');
    const observation = group.observations.at(-1);
    const base = { input: originals.get(`${observation.case}/${group.element}`), property: group.property,
      reference: 'normal', candidate: undefined, context: context(group, observation) };
    for (const [index, mutate] of mutations.entries()) {
      const x = structuredClone(base); mutate(x);
      // Stage mutations rehash the input so their own guards, not a stale hash,
      // have to reject unsupported declarations independently.
      if (index >= 13) x.context.observation.inputSha256 = createHash('sha256').update(JSON.stringify(x.input)).digest('hex');
      assert.equal(classifyGapReview(x.input, x.property, x.reference, x.candidate, x.context), undefined, `${kind}/${index}`);
    }
  }
});
