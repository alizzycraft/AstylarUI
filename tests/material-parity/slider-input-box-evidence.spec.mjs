import assert from 'node:assert/strict';
import test from 'node:test';
import { inspectSliderInputBox } from './slider-input-box-evidence.mjs';

function fixture(horizontal = '0px') {
  const referenceStyle = { boxSizing: 'content-box', paddingTop: '0px', paddingRight: horizontal,
    paddingBottom: '0px', paddingLeft: horizontal, width: '363.15px' };
  const candidateStyle = { padding: '8px', width: '50%', height: '44px', opacity: '0' };
  const reference = { schemaVersion: 1, errors: [], styles: [referenceStyle],
    rules: [{ selector: '.mdc-slider__input', declarations: { 'box-sizing': { value: 'content-box', important: false } } }],
    nodes: [{ key: 'native', parent: 'slider', type: 'input', attributes: { id: 'slider-start', type: 'range',
      class: 'mdc-slider__input', min: '0', max: '65', step: '5' }, style: 0, rules: [0],
      inline: Object.fromEntries(['top', 'right', 'bottom', 'left'].map(side => [`padding-${side}`,
        { value: ['right', 'left'].includes(side) ? horizontal : '0px', important: false }])) }] };
  const candidate = { schemaVersion: 1, errors: [], resolvedStyleEvidenceVersion: 2,
    resolvedStyleSource: 'core-style-inspection', resolvedStyleRevision: 4,
    nodes: [{ key: 'candidate', parent: 'pair', authored: { type: 'input', inputType: 'range', id: 'slider-start',
      class: 'range-layer', min: '0', max: '50', step: '1' }, resolvedStyle: { ...candidateStyle },
      normalResolvedStyle: { ...candidateStyle }, interactionResolvedStyle: { ...candidateStyle } }] };
  const input = { id: 'slider-start', reference: { ...referenceStyle }, astylar: { ...candidateStyle },
    referenceStructure: { schemaVersion: 2, type: 'input' }, astylarStructure: { schemaVersion: 2, type: 'input' },
    astylarResolvedStyleEvidenceVersion: 2, astylarNormalResolvedStyle: { ...candidateStyle },
    astylarInteractionResolvedStyle: { ...candidateStyle }, astylarAuthored: [{ selector: '.range-layer', declarations: { width: '50%' } }] };
  return { entry: { family: 'slider' }, input, reference, candidate };
}
const inspect = f => inspectSliderInputBox(f.entry, f.input, f.reference, f.candidate);

test('slider native box proof retains both active and inactive padding requests without inventing used geometry', () => {
  for (const horizontal of ['0px', '16px']) {
    const f = fixture(horizontal), before = structuredClone(f), proof = inspect(f);
    assert.ok(proof); assert.deepEqual(f, before); assert.equal(proof.properties.length, 5);
    assert.equal(proof.properties[1].reference, horizontal); assert.equal(proof.properties[1].candidate, '8px');
    assert.equal(proof.properties[4].candidate, null); assert.equal(proof.reference.computed.width, '363.15px');
    assert.equal(proof.candidate.effective.width, '50%'); assert.equal(proof.inputEquivalent, false);
    assert.equal(proof.finalRasterVerified, false); assert.equal(proof.classification, 'application-plugin-authoring-defect');
  }
});

test('slider native box proof rejects foreign owners missing stages altered declarations and explicit candidate resets', () => {
  const mutations = [
    f => { f.entry.family = 'button'; },
    f => { f.input.id = 'other'; },
    f => { f.reference.errors.push('incomplete capture'); },
    f => { delete f.candidate.resolvedStyleRevision; },
    f => { f.candidate.resolvedStyleSource = 'other'; },
    f => { f.reference.nodes.push(structuredClone(f.reference.nodes[0])); },
    f => { f.candidate.nodes.push({ ...structuredClone(f.candidate.nodes[0]), key: 'duplicate-id' }); },
    f => { f.reference.nodes[0].attributes.type = 'text'; },
    f => { f.candidate.nodes[0].authored.inputType = 'text'; },
    f => { f.reference.nodes[0].inline['padding-left'].value = '8px'; },
    f => { f.reference.nodes[0].inline['padding-left'].important = true; },
    f => { delete f.reference.nodes[0].inline['padding-left']; },
    f => { f.reference.rules[0].declarations['box-sizing'].value = 'border-box'; },
    f => { f.input.reference.width = '999px'; },
    f => { f.input.astylar.padding = '4px'; },
    f => { delete f.candidate.nodes[0].normalResolvedStyle; },
    f => { delete f.input.astylarInteractionResolvedStyle; },
    f => { f.input.astylarAuthored[0].declarations.padding = '0'; },
    f => { f.input.astylarAuthored[0].declarations['box-sizing'] = 'content-box'; },
    f => { f.input.astylarAuthored[0].declarations.all = 'initial'; },
    f => { f.candidate.nodes[0].authored.style = { padding: '0' }; },
  ];
  for (const [index, mutate] of mutations.entries()) { const f = fixture(); mutate(f); assert.equal(inspect(f), undefined, `control ${index}`); }
});
