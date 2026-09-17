import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { bindExplicitGapComposition, loadExplicitGapBindingInputs, recordExplicitGapBinding }
  from '../../scripts/bind-material-explicit-gap-composition.mjs';

const inputs = await loadExplicitGapBindingInputs();
test('binds all existing explicit-gap proofs to exact current canonical groups and original scalar inputs', () => {
  const result = recordExplicitGapBinding(inputs);
  assert.deepEqual(result, JSON.parse(readFileSync('docs/material-explicit-gap-canonical-binding.json')));
  assert.deepEqual(result.counts, { groups: 16, owners: 8, cases: 296, observations: 1032 });
  assert.equal(result.canonicalIntegration, false); assert.equal(result.inputEquivalent, false);
});

test('rejects missing memberships, changed raw shorthand, weakened classification and swapped canonical evidence', () => {
  const required = new Set(inputs.composition.owners.flatMap(o => o.records.map(r => `${r.case}/${o.element}`)));
  const mutationBase = { ...inputs, inputs: new Map([...inputs.inputs].filter(([key]) => required.has(key))) };
  const mutations = [
    x => { x.rows.pop(); },
    x => { x.rows[0].attribution = 'equivalent'; },
    x => { x.rows[0].astylar = undefined; },
    x => { x.rows[0].cases.reverse(); },
    x => { x.rows[0].occurrences--; },
    x => { x.composition.owners[0].classification = 'equivalent-representation'; },
    x => { x.composition.owners[0].usedGapVerified = true; },
    x => { x.composition.owners[0].records.pop(); },
    x => { x.composition.owners[0].records[0].inputSha256 = '0'.repeat(64); },
    x => { x.composition.owners[0].records[0].inputTrees.astylar.sha256 = '0'.repeat(64); },
    x => { const r = x.composition.owners[0]; r.records[0].finding = 'equal'; },
    x => { const r = x.join.rows.find(r => r.element === x.composition.owners[0].element); r.observations[0].candidateRaw = '8px'; },
    x => { const r = x.join.rows.find(r => r.element === x.composition.owners[0].element); r.observations[0].candidateRawShorthand = '99px'; },
    x => { const r = x.composition.owners[0]; x.inputs.get(`${r.records[0].case}/${r.element}`).input.astylar.gap = '99px'; },
  ];
  for (const [index, mutate] of mutations.entries()) {
    const x = structuredClone(mutationBase); mutate(x);
    assert.throws(() => bindExplicitGapComposition(x.composition, x.join, x.rows, x.inputs), `mutation ${index}`);
  }
});
