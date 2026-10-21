import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { collectRadioDescendantInputs, inspectRadioDescendants } from './radio-descendant-inputs.mjs';

test('radio descendant mapping covers all retained option owners without certifying flattening', () => {
  const report = collectRadioDescendantInputs();
  assert.equal(report.caseCount, 68); assert.equal(report.ownerCount, 136);
  for (const row of report.cases) for (const owner of row.owners) {
    assert.equal(owner.native.label.attributes.for, owner.native.input.attributes.id);
    assert.equal(owner.native.labelText.ownText, owner.candidate.label.authored.textContent);
    assert.equal(owner.representedNativeNodes, 12 + owner.dynamicRipples.length);
    assert.equal(owner.representedCandidateNodes, 4 + owner.candidate.dots.length);
    assert.equal(owner.inputEquivalent, false); assert.equal(owner.renderingEquivalent, false);
    assert.equal(owner.currentRuntimeVerified, false);
  }
});

test('radio descendant mapping rejects wrong labels,ownership,primitive and unchecked extra dot', () => {
  const row = collectRadioDescendantInputs().cases[0];
  const ref = JSON.parse(readFileSync(row.inputTrees.reference.file));
  const ast = JSON.parse(readFileSync(row.inputTrees.astylar.file));
  const owner = row.owners[0];
  for (const mutate of [
    r => { r.nodes.find(n => n.key === owner.native.label.key).attributes.for = 'wrong-input'; },
    r => { r.nodes.find(n => n.key === owner.native.touch.key).parent = owner.native.host.key; },
    r => { r.nodes.find(n => n.key === owner.native.input.key).attributes.type = 'text'; },
    (_r, a) => { a.nodes.find(n => n.key === owner.candidate.label.key).authored.textContent = 'Other'; },
    (_r, a) => { a.nodes.push({ key: owner.candidate.ring.key + '/extra', parent: owner.candidate.ring.key,
      authored: { type: 'span', class: 'radio-dot' } }); },
    (_r, a) => { a.nodes.find(n => n.key === owner.candidate.option.key).authored.role = 'button'; },
  ]) {
    const r = structuredClone(ref), a = structuredClone(ast); mutate(r, a);
    assert.throws(() => inspectRadioDescendants(r, a, 'solo'));
  }
});
