import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { inspectSliderBorderDefaults } from './slider-border-default-evidence.mjs';

const raw = JSON.parse(readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json'));
const first = raw.results.find(entry => entry.family === 'slider');
const base = { entry: first, input: first.styleInputs.find(input => input.id === 'slider-start'),
  reference: JSON.parse(readFileSync(first.inputTrees.reference.file)),
  candidate: JSON.parse(readFileSync(first.inputTrees.astylar.file)) };
const inspect = value => inspectSliderBorderDefaults(value.entry, value.input, value.reference, value.candidate);
const refNode = value => value.reference.nodes.find(node => node.attributes?.id === value.input.id);
const astNode = value => value.candidate.nodes.find(node => node.authored?.id === value.input.id);

test('original slider border owner retains shared omissions and twelve default-value differences', () => {
  const snapshot = structuredClone(base), proof = inspect(base);
  assert.ok(proof); assert.deepEqual(base, snapshot);
  assert.equal(proof.properties.length, 12);
  assert.equal(proof.borderAuthoringEquivalent, true);
  assert.equal(proof.inputEquivalent, false);
  assert.equal(proof.usedBoxParityVerified, false);
  assert.equal(proof.finalRasterVerified, false);
  assert.equal(proof.classification, 'intentional-documented-limitation');
  assert.deepEqual(proof.properties[0], { property: 'borderTopWidth', reference: '0px', candidate: '1px', candidateSourceProperty: 'borderWidth' });
  proof.reference.values.borderTopWidth = '999px';
  assert.equal(inspect(base).reference.values.borderTopWidth, '0px');
});

test('border omission reader rejects incomplete provenance, competing rules and altered defaults', () => {
  const mutations = [
    value => { value.entry.family = 'button'; },
    value => { value.input.referenceAuthored.pop(); },
    value => { value.reference.rules[refNode(value).rules[0]].declarations.border = { value: '0', important: false }; },
    value => { value.input.referenceAuthored[0].declarations.border = { value: '0', important: false }; },
    value => { refNode(value).inline.appearance = { value: 'none', important: false }; },
    value => { refNode(value).rules.push(99999); },
    value => { refNode(value).rules.push(refNode(value).rules[0]); },
    value => { value.input.astylarAuthored[0].declarations.borderWidth = '0'; },
    value => { value.candidate.rules[value.input.astylarAuthored[0].index].borderWidth = '0'; },
    value => { value.input.astylarAuthored[0].index = 99999; },
    value => { astNode(value).authored.style = { borderRadius: '0' }; },
    value => { astNode(value).normalResolvedStyle.borderWidth = '0'; },
    value => { value.input.reference.borderTopWidth = '1px'; },
    value => { value.input.astylarAuthored[0].declarations.all = 'initial'; },
    value => { value.input.astylarAuthored[0].declarations['-webkit-appearance'] = 'none'; },
    value => { value.reference.resolvedStyleSource = 'invented'; value.reference.errors.push('partial stylesheet'); },
    value => {
      const rule = value.input.astylarAuthored[0]; rule.declarations.borderWidth = '0';
      value.candidate.rules[rule.index].borderWidth = '0';
    },
    value => {
      for (const key of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle']) astNode(value)[key].borderWidth = '2px';
      for (const key of ['astylar', 'astylarNormalResolvedStyle', 'astylarInteractionResolvedStyle']) value.input[key].borderWidth = '2px';
    },
  ];
  for (const [index, mutate] of mutations.entries()) {
    const value = structuredClone(base); mutate(value);
    assert.equal(inspect(value), undefined, `mutation ${index}`);
  }
});

test('border omission proof covers both original input owners in all 78 captured slider states', () => {
  let cases = 0, owners = 0;
  for (const entry of [...raw.results, ...raw.interactions].filter(entry => entry.family === 'slider')) {
    cases++;
    const reference = JSON.parse(readFileSync(entry.inputTrees.reference.file));
    const candidate = JSON.parse(readFileSync(entry.inputTrees.astylar.file));
    for (const id of ['slider-start', 'slider-primary']) {
      const inputs = entry.styleInputs.filter(input => input.id === id); assert.equal(inputs.length, 1);
      const proof = inspectSliderBorderDefaults(entry, inputs[0], reference, candidate);
      assert.ok(proof, `${entry.profile}/${entry.viewport.id}/${entry.state ?? 'static'}#${id}`);
      owners++;
    }
  }
  assert.equal(cases, 78); assert.equal(owners, 156);
});
