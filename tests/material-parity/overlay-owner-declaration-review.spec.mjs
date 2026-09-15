import assert from 'node:assert/strict';
import test from 'node:test';
import { inspectOverlayOwnerDeclarations } from './overlay-owner-declaration-review.mjs';

function fixture() {
  return {
    proof: { status: 'mapped', inputEquivalent: false, referenceNode: 'owner', candidateNode: 'owner',
      referencePath: ['owner', 'root'], candidatePath: ['owner', 'root'], missingRules: [], extraRules: [] },
    reference: { nodes: [
      { key: 'owner', parent: 'root', type: 'div', attributes: {}, inline: {}, rules: [], style: 0 },
      { key: 'root', parent: null, type: 'div', attributes: {}, inline: {}, rules: [], style: 0 }
    ], styles: [{ pointerEvents: 'auto', fontStyle: 'normal', whiteSpace: 'normal', wordSpacing: '0px' }], rules: [] },
    candidate: { nodes: [
      { key: 'owner', parent: 'root', authored: { type: 'div', id: 'owner' },
        resolvedStyle: {}, normalResolvedStyle: {}, interactionResolvedStyle: {} },
      { key: 'root', parent: null, authored: {} }
    ], rules: [] }
  };
}
const inspect = (data, property = 'pointerEvents') =>
  inspectOverlayOwnerDeclarations(property, data.proof, data.reference, data.candidate);

test('omission remains a local-stage observation, never computed/input/rendering equivalence', () => {
  const result = inspect(fixture());
  assert.equal(result.referencePath[0].computed, 'auto');
  assert.deepEqual(Object.values(result.candidatePath[0].localValues), ['<omitted>', '<omitted>', '<omitted>']);
  for (const key of ['hasRelevantRequest', 'hasMotionRequest', 'candidateComputedVerified', 'inputEquivalent', 'renderingEquivalent'])
    assert.equal(result[key], false);
});

test('preserves reference pointer-event inheritance declarations and active conditions', () => {
  const data = fixture();
  data.reference.rules.push({ selector: '.wrapper', active: false, conditions: ['screen and (min-width: 900px)'],
    declarations: { 'pointer-events': { value: 'none', important: true } } });
  data.reference.nodes[1].rules = [0];
  data.reference.nodes[0].inline = { 'pointer-events': { value: 'auto', important: false } };
  const result = inspect(data);
  assert.equal(result.hasRelevantRequest, true);
  assert.deepEqual(result.referencePath[1].rules[0].declarations, data.reference.rules[0].declarations);
  assert.equal(result.referencePath[1].rules[0].active, false);
  assert.deepEqual(result.referencePath[1].rules[0].conditions, data.reference.rules[0].conditions);
  assert.deepEqual(result.referencePath[0].inline, data.reference.nodes[0].inline);
});

test('retains candidate resets and shorthand aliases across each local stage and possible rules', () => {
  for (const stage of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle']) {
    const data = fixture(); data.candidate.nodes[0][stage] = { all: 'initial' };
    assert.equal(inspect(data).hasRelevantRequest, true);
  }
  const data = fixture();
  data.candidate.nodes[0].authored.style = { font: 'italic 16px Roboto' };
  assert.deepEqual(inspect(data, 'fontStyle').candidatePath[0].inline, data.candidate.nodes[0].authored.style);
  data.candidate.rules.push({ selector: '#owner:hover', textWrapMode: 'nowrap' });
  assert.equal(inspect(data, 'whiteSpace').hasRelevantRequest, true);
  assert.equal(inspect(data, 'whiteSpace').candidatePath[0].possibleRules[0].declarations.textWrapMode, 'nowrap');
});

test('preserves empty transition values and disabled motion without asserting animation activity', () => {
  const data = fixture();
  data.reference.nodes[0].inline = { 'transition-duration': { value: '', important: false },
    'transition-property': { value: 'none', important: false } };
  const result = inspect(data, 'fontStyle');
  assert.equal(result.hasMotionRequest, true); assert.equal(result.hasRelevantRequest, false);
  assert.equal(result.referencePath[0].inline['transition-duration'].value, '');
  assert.equal(result.referencePath[0].inline['transition-property'].value, 'none');
});

test('raw spacing and existing scalar rule gaps survive inspection', () => {
  const data = fixture(); data.proof.missingRules = [{ selector: '.wrapper', declarations: { 'z-index': { value: '1000', important: false } } }];
  const result = inspect(data, 'wordSpacing');
  assert.equal(result.referencePath[0].computed, '0px');
  assert.deepEqual(result.ruleGaps.missing, data.proof.missingRules);
});

test('rejects changed or ambiguous identity and incomplete owner paths', () => {
  const mutations = [d => { d.proof.status = 'unresolved'; }, d => { d.proof.inputEquivalent = true; },
    d => { d.reference.nodes.push(d.reference.nodes[0]); }, d => { d.candidate.nodes.push(d.candidate.nodes[0]); },
    d => { d.proof.referencePath.pop(); }, d => { d.proof.candidatePath.pop(); },
    d => { d.proof.referenceNode = 'root'; }, d => { d.proof.candidateNode = 'root'; }];
  for (const mutate of mutations) { const data = fixture(); mutate(data); assert.throws(() => inspect(data)); }
});
