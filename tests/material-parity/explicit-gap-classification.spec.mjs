import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { loadExplicitGapBindingInputs, recordExplicitGapBinding }
  from '../../scripts/bind-material-explicit-gap-composition.mjs';
import { classifyExplicitGapComposition, explicitGapAttribution } from './explicit-gap-classification.mjs';

const inputs = await loadExplicitGapBindingInputs();
const binding = recordExplicitGapBinding(inputs);
const rehash = args => { args[4].observation.inputSha256 = createHash('sha256').update(JSON.stringify(args[0])).digest('hex'); };
assert.deepEqual(binding, JSON.parse(readFileSync('docs/material-explicit-gap-canonical-binding.json')));
const argsFor = (group, observation) => {
  const original = inputs.inputs.get(`${observation.case}/${group.element}`);
  return [original.input, group.property, group.reference, group.candidate, {
    group, observation, family: group.family, case: observation.case, inputTrees: original.inputTrees,
  }];
};

test('classifies all bound explicit-gap observations without accepting layout or renderer equivalence', () => {
  let observations = 0;
  const cases = new Set(), owners = new Set();
  for (const row of binding.rows) for (const observation of row.observations) {
    const args = argsFor(row, observation), result = classifyExplicitGapComposition(...args);
    assert.ok(result, `${row.element}/${row.property}/${observation.case}`);
    assert.equal(result.classification, 'application-plugin-authoring-defect');
    assert.equal(result.attribution, explicitGapAttribution);
    for (const flag of ['inputEquivalent', 'wholeElementInputEquivalent', 'usedGapVerified', 'rendererCauseProven'])
      assert.equal(result.reviewEvidence[flag], false);
    assert.equal(result.reviewEvidence.rawCandidateLonghand, '<omitted>');
    assert.equal(result.reviewEvidence.rawCandidateShorthand, row.candidate);
    assert.equal(result.reviewEvidence.compositionFinding, row.cause);
    assert.equal(result.reviewEvidence.inputSha256, observation.inputSha256);
    assert.deepEqual(result.reviewEvidence.inputTrees, observation.inputTrees);
    observations++; cases.add(observation.case); owners.add(row.element);
    assert.equal(classifyExplicitGapComposition(args[0], 'marginLeft', ...args.slice(2)), undefined);
  }
  assert.deepEqual({ groups: binding.rows.length, owners: owners.size, cases: cases.size, observations },
    { groups: 16, owners: 8, cases: 296, observations: 1032 });
});

test('rejects missing, mismatched, broadened or unbound explicit-gap classifications', () => {
  const original = argsFor(binding.rows[0], binding.rows[0].observations[0]);
  const mutations = [
    x => { x[4] = undefined; },
    x => { delete x[4].observation; },
    x => { x[4].case += '-wrong-state'; },
    x => { x[4].family = 'menu'; },
    x => { x[4].group.property = 'rowGap'; },
    x => { x[4].group.element = 'other'; },
    x => { x[2] = '0px'; },
    x => { x[3] = '0px'; },
    x => { x[4].group.classification = 'equivalent-representation'; },
    x => { x[4].group.proposedAttribution = 'equivalent'; },
    x => { x[4].group.priorAttribution = 'already-reviewed'; },
    x => { x[4].group.inputEquivalent = true; },
    x => { x[4].group.usedGapVerified = true; },
    x => { x[4].group.rendererCauseProven = true; },
    x => { delete x[4].group.canonicalRowSha256; },
    x => { delete x[4].group.originalProofSha256; },
    x => { delete x[4].observation.compositionSha256; },
    x => { x[4].observation.inputSha256 = '0'.repeat(64); },
    x => { x[4].observation.rawCandidateLonghand = '8px'; },
    x => { x[4].observation.rawCandidateShorthand = '14px'; },
    x => { x[4].observation.rawReference = '0px'; },
    x => { x[4].inputTrees = structuredClone(x[4].inputTrees); x[4].inputTrees.reference.sha256 = '0'.repeat(64); },
    x => { x[4].group.observations = []; },
    x => { x[4].group.observations.push(structuredClone(x[4].observation)); },
    x => { x[0].astylar.gap = '99px'; rehash(x); },
    x => { x[0].astylarNormalResolvedStyle.gap = '99px'; rehash(x); },
    x => { x[0].astylarInteractionResolvedStyle.gap = '99px'; rehash(x); },
    x => { x[0].astylar.columnGap = '8px'; rehash(x); },
    x => { x[0].astylarResolvedStyleEvidenceVersion = 1; rehash(x); },
    x => {
      x[3] = x[4].group.candidate = x[4].observation.rawCandidateShorthand = undefined;
      for (const stage of ['astylar', 'astylarNormalResolvedStyle', 'astylarInteractionResolvedStyle']) delete x[0][stage].gap;
      rehash(x);
    },
  ];
  for (const [index, mutate] of mutations.entries()) {
    const args = structuredClone(original); mutate(args);
    assert.equal(classifyExplicitGapComposition(...args), undefined, `mutation ${index}`);
  }
  assert.equal(mutations.length, 30);
});
