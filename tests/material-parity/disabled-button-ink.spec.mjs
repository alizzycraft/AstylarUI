import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { collectDisabledButtonInk, inspectDisabledButtonInk } from '../../scripts/audit-material-disabled-button-ink.mjs';

test('disabled button foreground source review covers all 60 cases with precise unequal values', () => {
  const report = collectDisabledButtonInk();
  assert.deepEqual(report, JSON.parse(readFileSync('docs/material-disabled-button-ink.json')));
  assert.equal(report.groups.length, 4); assert.equal(report.observations, 60);
  const transition = JSON.parse(readFileSync('docs/material-color-normalization-transition.json'));
  const expected = transition.findings.filter(row => row.element === 'button-disabled' && row.property === 'color');
  assert.equal(expected.length, 4);
  for (const group of report.groups) {
    const matches = expected.filter(row => row.after.reference === group.reference && row.after.candidate === group.candidate);
    assert.equal(matches.length, 1);
    assert.deepEqual(group.cases, matches[0].cases);
  }
  assert.equal(report.canonicalAttributionChanged, false);
  assert.equal(report.rendererChanged, false);
  for (const finding of report.findings) {
    assert.equal(finding.proof.classification, 'application-plugin-authoring-defect');
    assert.equal(finding.proof.rendererCauseProven, false);
    assert.equal(finding.proof.rasterDifferenceProven, false);
  }
});

test('disabled ink review rejects different owners, declarations, states and competing sources', () => {
  const source = JSON.parse(readFileSync('docs/material-button-paint-all-states.json'));
  const finding = source.findings.find(row => row.element === 'button-disabled');
  const base = [source.patterns[finding.pattern].proof, JSON.parse(readFileSync(finding.inputTrees.reference.file))];
  const owner = pair => pair[1].nodes.find(node => node.attributes?.id === 'button-disabled');
  const rule = pair => owner(pair).rules.map(index => pair[1].rules[index]).find(rule => rule.declarations.color);
  const controls = [
    pair => { pair[0].element = 'button-primary'; },
    pair => { pair[0].candidate.authored.disabled = false; },
    pair => { pair[0].candidate.authored.style = { color: 'red' }; },
    pair => { pair[0].candidate.descendantCount = 1; },
    pair => { owner(pair).attributes.disabled = 'false'; },
    pair => { owner(pair).inline.color = { value: 'red' }; },
    pair => { rule(pair).declarations.color.value = 'red'; },
    pair => { rule(pair).declarations.color.important = true; },
    pair => { rule(pair).conditions.push('screen'); },
    pair => { owner(pair).rules.map(index => pair[1].rules[index]).find(rule => rule.declarations['transition-property']).declarations['transition-property'].value = 'color'; },
    pair => { owner(pair).rules.map(index => pair[1].rules[index]).find(rule => rule.declarations['animation-name']).declarations['animation-name'].value = 'ink-animation'; },
    pair => { pair[1].styles[owner(pair).style].color = 'rgb(29, 27, 32)'; },
    pair => { pair[0].candidate.interaction.color = '#ffffff'; },
    pair => { pair[0].candidate.effective.opacity = '0.38'; },
    pair => { pair[0].candidate.authoredRules.push({ selector: '.extra', declarations: { color: 'red' } }); },
    pair => { pair[0].candidate.authoredRules.find(rule => rule.selector === '#button-disabled').declarations.all = 'initial'; },
    pair => { rule(pair).declarations.all = { value: 'initial', important: false }; },
  ];
  const original = JSON.stringify(base);
  inspectDisabledButtonInk(...base);
  for (const mutate of controls) {
    const pair = structuredClone(base); mutate(pair);
    assert.throws(() => inspectDisabledButtonInk(...pair));
  }
  assert.equal(JSON.stringify(base), original);
});
