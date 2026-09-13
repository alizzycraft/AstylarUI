import assert from 'node:assert/strict';
import test from 'node:test';
import { checkButtonFocusSample } from '../../scripts/audit-button-pointer-focus.mjs';

function heldSample() {
  const controls = ['first', 'second'].map(id => ({ id, text: id, tag: 'BUTTON', disabled: false, tabIndex: 0, nativeType: 'button' }));
  const authored = { root: { children: controls.map(({ id }) => ({ type: 'button', id, disabled: false })) },
    styles: [{ selector: 'button', width: '120px', height: '40px' }] };
  const identity = { tag: 'BUTTON', id: 'second', authoredId: null };
  const sample = { authored, authoredUnchanged: true, controls, active: identity, activeButton: 'second',
    nativeEvents: [{ type: 'pointerdown', trusted: true, buttons: 1, key: null, target: identity }], publicEvents: [] };
  const candidate = structuredClone(sample);
  candidate.active = { tag: 'CANVAS', id: 'stage', authoredId: null };
  candidate.activeButton = null;
  candidate.nativeEvents[0].target = candidate.active;
  candidate.publicEvents = [{ type: 'pointerdown', targetId: 'second' }];
  candidate.diagnostics = { messages: [], interaction: { focusedElementId: 'second' } };
  candidate.resolved = { revision: 1, elements: controls.map(({ id }) => ({ id,
    normal: { width: '120px', height: '40px' }, effective: { width: '120px', height: '40px' } })) };
  return { action: 'down', target: 'second', expectedFocus: 'second', reference: sample, astylar: candidate };
}

test('button focus proof preserves a genuine held semantic mismatch and passing release control', () => {
  const sample = heldSample(), before = structuredClone(sample);
  assert.deepEqual(checkButtonFocusSample(sample), { errors: [], checks: {
    referenceFocus: true, astylarFocus: false, logicalFocus: true, semanticMatchesLogical: false } });
  assert.deepEqual(sample, before);
  sample.action = 'up';
  sample.astylar.active = { tag: 'BUTTON', id: 'semantic-second', authoredId: 'second' };
  sample.astylar.activeButton = 'second';
  for (const mode of ['reference', 'astylar']) sample[mode].nativeEvents.push({ ...sample[mode].nativeEvents[0], type: 'pointerup', buttons: 0 });
  assert.deepEqual(checkButtonFocusSample(sample), { errors: [], checks: {
    referenceFocus: true, astylarFocus: true, logicalFocus: true, semanticMatchesLogical: true } });
});

test('button focus proof rejects unequal, stale, synthetic, or mis-targeted evidence', () => {
  const mutations = [
    s => { s.astylar.authored.styles[0].width = '130px'; },
    s => { s.astylar.authoredUnchanged = false; },
    s => { s.astylar.controls[0].disabled = true; },
    s => { s.astylar.controls[0].tabIndex = -1; },
    s => { s.astylar.controls[0].nativeType = 'submit'; },
    s => { s.astylar.controls[0].text = 'different'; },
    s => { s.astylar.activeButton = 'second'; },
    s => { s.reference.activeButton = null; },
    s => { s.astylar.nativeEvents[0].trusted = false; },
    s => { s.astylar.nativeEvents = []; },
    s => { s.astylar.nativeEvents[0].buttons = 0; },
    s => { s.reference.nativeEvents[0].target.id = 'first'; },
    s => { s.astylar.publicEvents[0].targetId = 'first'; },
    s => { s.astylar.diagnostics.messages.push({ severity: 'error' }); },
    s => { s.astylar.resolved = null; },
    s => { s.astylar.resolved.elements.push(structuredClone(s.astylar.resolved.elements[0])); },
    s => { s.astylar.resolved.elements[0].normal.width = '130px'; },
    s => { s.astylar.resolved.elements[0].effective.width = '130px'; },
  ];
  for (const [index, mutate] of mutations.entries()) {
    const sample = heldSample(); mutate(sample);
    assert.ok(checkButtonFocusSample(sample).errors.length > 0, `mutation ${index}`);
  }
});
