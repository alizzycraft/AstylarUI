import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { inspectOwnerInitialStyle, ownerInitialValues } from './owner-initial-style-survey.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const reportFile = 'docs/material-owner-initial-style-survey.json';
const report = JSON.parse(readFileSync(reportFile));
const bytes = readFileSync(report.capture.file);
assert.equal(hash(bytes), report.capture.sha256);
const raw = JSON.parse(bytes);
const entry = raw.results.find(e => e.family === 'badge');
const original = { input: entry.styleInputs.find(i => i.id === 'badge-primary'),
  reference: JSON.parse(readFileSync(entry.inputTrees.reference.file)),
  candidate: JSON.parse(readFileSync(entry.inputTrees.astylar.file)) };
const inspect = (v, property = 'fontStyle') => inspectOwnerInitialStyle(v.input, property, v.reference, v.candidate);

test('owner survey keeps raw declaration omission and captured ancestry distinct from computed equivalence', () => {
  const before = JSON.stringify(original), proof = inspect(original);
  assert.equal(proof.disposition, 'captured-default-versus-local-omission');
  assert.equal(proof.referenceComputed, 'normal');
  assert.equal(proof.candidateLocalDeclaration, '<omitted>');
  assert.equal(proof.computedCandidateVerified, false); assert.equal(proof.renderingEquivalent, false);
  assert.equal(proof.referencePath[0], 'frame'); assert.equal(proof.candidatePath[0], 'root');
  assert.equal(JSON.stringify(original), before);
});

test('appearance review is opt-in and preserves omission without claiming computed or rendering equivalence', () => {
  const before = JSON.stringify(original);
  assert.equal(Object.hasOwn(ownerInitialValues, 'appearance'), false);
  assert.equal(inspect(original, 'appearance').disposition, 'requires-specific-review');
  const proof = inspectOwnerInitialStyle(original.input, 'appearance', original.reference, original.candidate,
    { reviewedAppearance: true });
  assert.equal(proof.disposition, 'captured-default-versus-local-omission');
  assert.equal(proof.referenceComputed, 'none');
  assert.equal(proof.candidateLocalDeclaration, '<omitted>');
  assert.equal(proof.computedCandidateVerified, false);
  assert.equal(proof.renderingEquivalent, false);
  assert.equal(JSON.stringify(original), before);
});

test('appearance review rejects vendor aliases, resets, explicit defaults and native auto', () => {
  for (const property of ['appearance', '-webkit-appearance', 'WebkitAppearance', '-moz-appearance', 'MozAppearance', 'all']) {
    for (const location of ['reference-inline', 'reference-attribute', 'candidate-inline', 'candidate-attribute', 'candidate-rule']) {
      const value = structuredClone(original);
      if (location === 'reference-inline') value.reference.nodes[0].inline[property] = { value: 'none', important: false };
      if (location === 'reference-attribute') value.reference.nodes[0].attributes.style = `${property}: none`;
      if (location === 'candidate-inline') value.candidate.nodes[1].authored.style = { [property]: 'none' };
      if (location === 'candidate-attribute') value.candidate.nodes[1].authored.attributes = { style: `${property}: none` };
      if (location === 'candidate-rule') value.candidate.rules.push({ selector: '#page', [property]: 'none' });
      const proof = inspectOwnerInitialStyle(value.input, 'appearance', value.reference, value.candidate,
        { reviewedAppearance: true });
      assert.equal(proof.disposition, 'requires-specific-review', `${property}/${location}`);
      assert.ok(proof.issues.some(i => ['explicit-relevant-request', 'inline-style-request'].includes(i.reason)));
    }
  }
  const value = structuredClone(original);
  value.input.reference.appearance = 'auto';
  for (const style of value.reference.styles) style.appearance = 'auto';
  const proof = inspectOwnerInitialStyle(value.input, 'appearance', value.reference, value.candidate,
    { reviewedAppearance: true });
  assert.ok(proof.issues.some(i => i.reason === 'reference-noninitial-value'));
});

test('font-weight survey is opt-in and keeps captured ancestry separate from inherited candidate paint', () => {
  const before = JSON.stringify(original);
  assert.equal(Object.hasOwn(ownerInitialValues, 'fontWeight'), false);
  assert.equal(inspect(original, 'fontWeight').disposition, 'requires-specific-review');
  const review = value => inspectOwnerInitialStyle(value.input, 'fontWeight', value.reference, value.candidate,
    { reviewedFontWeight: true });
  const proof = review(original);
  assert.equal(proof.disposition, 'captured-default-versus-local-omission');
  assert.equal(proof.referenceComputed, '400');
  assert.equal(proof.candidateLocalDeclaration, '<omitted>');
  assert.equal(proof.computedCandidateVerified, false);
  assert.equal(proof.renderingEquivalent, false);
  assert.equal(JSON.stringify(original), before);
  for (const property of ['fontWeight', 'font-weight', 'font', 'fontVariationSettings', 'font-variation-settings', 'all']) {
    for (const location of ['reference-inline', 'reference-attribute', 'candidate-inline', 'candidate-attribute', 'candidate-rule']) {
      const value = structuredClone(original);
      if (location === 'reference-inline') value.reference.nodes[0].inline[property] = { value: 'inherit', important: false };
      if (location === 'reference-attribute') value.reference.nodes[0].attributes.style = `${property}: inherit`;
      if (location === 'candidate-inline') value.candidate.nodes[1].authored.style = { [property]: 'inherit' };
      if (location === 'candidate-attribute') value.candidate.nodes[1].authored.attributes = { style: `${property}: inherit` };
      if (location === 'candidate-rule') value.candidate.rules.push({ selector: '#page', [property]: 'inherit' });
      assert.equal(review(value).disposition, 'requires-specific-review', `${property}/${location}`);
    }
  }
  const mutations = [
    v => { v.reference.styles[v.reference.nodes[0].style].fontWeight = '700'; },
    v => { v.input.reference.fontWeight = '500'; },
    v => { v.input.astylar.fontWeight = '400'; },
    v => { v.candidate.nodes[1].parent = 'missing'; },
    v => { v.candidate.rules.push({ selector: ':is(#badge-primary)', fontWeight: '400' }); },
    v => { v.candidate.rules.push({ selector: '#page', transitionProperty: 'font-weight' }); },
    v => { v.candidate.resolvedStyleSource = 'guessed'; },
  ];
  for (const [i, mutate] of mutations.entries()) {
    const value = structuredClone(original); mutate(value);
    assert.equal(review(value).disposition, 'requires-specific-review', `weight mutation ${i}`);
  }
});

test('owner survey rejects incomplete ancestry, competing requests, unknown selectors, motion and mismatched stages', () => {
  const mutations = [
    v => { v.reference.errors.push('unreadable stylesheet'); },
    v => { v.candidate.resolvedStyleSource = 'guessed'; },
    v => { v.candidate.nodes.push(structuredClone(v.candidate.nodes[1])); },
    v => { v.reference.nodes[0].parent = 'missing'; },
    v => { v.reference.nodes[0].parent = v.reference.nodes[0].key; },
    v => { v.candidate.nodes[1].parent = 'missing'; },
    v => { v.input.astylar.fontStyle = 'normal'; },
    v => { v.input.reference.fontStyle = 'italic'; },
    v => { v.reference.styles[v.reference.nodes[0].style].fontStyle = 'italic'; },
    v => { v.reference.nodes[0].inline.font = { value: 'inherit', important: false }; },
    v => { v.candidate.nodes[1].authored.style = { font: 'inherit' }; },
    v => { v.candidate.rules.push({ selector: ':is(#badge-primary)', fontStyle: 'italic' }); },
    v => { v.candidate.rules.push({ selector: '#page', animationDuration: '1ms' }); },
    v => { v.candidate.nodes[1].authored.attributes = { style: 'font-style: italic' }; },
    v => { v.candidate.nodes[1].authored.attributes = { style: 'font/**/-style: italic' }; },
    v => { delete v.candidate.nodes[1].normalResolvedStyle; },
  ];
  for (const [i, mutate] of mutations.entries()) {
    const value = structuredClone(original); mutate(value);
    assert.equal(inspect(value).disposition, 'requires-specific-review', `mutation ${i}`);
  }
  const differentProperty = structuredClone(original);
  differentProperty.candidate.rules.push({ selector: '#page', fontSize: '99px' });
  assert.equal(inspect(differentProperty).disposition, 'captured-default-versus-local-omission',
    'property-specific diagnostic evidence must not claim font-size parity');
});

test('owner survey retains all raw cases and flags rather than hides canonical membership uncertainty', () => {
  assert.equal(report.groupCount, 600); assert.equal(report.groups.length, 600);
  assert.equal(report.canonicalIntegration, false); assert.equal(report.computedCandidateVerified, false);
  assert.equal(report.renderingEquivalent, false);
  assert.equal(report.matchingOccurrenceCountGroups, 549);
  assert.equal(report.capturedObservationStageGroupsWithMatchingCount, 258);
  assert.equal(report.observations, 32144); assert.equal(report.caseCount, 1734);
  const entries = [...raw.results.map(e => ({ ...e, kind: 'static' })), ...raw.interactions.map(e => ({ ...e, kind: 'interaction' }))];
  const key = e => `${e.kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? `/${e.state}` : ''}`;
  const scalar = (p, v) => p === 'wordSpacing' && v === '0px' ? '0' : v;
  const union = new Set();
  for (const group of report.groups) {
    const expected = entries.filter(e => e.family === group.family && e.styleInputs.some(i => i.id === group.element &&
      scalar(group.property, i.reference?.[group.property]) === group.reference &&
      (scalar(group.property, i.astylar?.[group.property]) ?? '<omitted>') === group.candidate)).map(key);
    assert.deepEqual(group.originalCases, expected);
    assert.equal(group.originalOccurrenceCountMatchesCanonical, expected.length === group.canonicalOccurrences);
    assert.equal(new Set(expected).size, expected.length);
    for (const c of expected) union.add(c);
    assert.deepEqual([...new Set(Object.values(group.reasons).flat())].sort(), [...expected].sort());
  }
  assert.deepEqual(report.cases.map(c => c.case), entries.map(key).filter(k => union.has(k)));
  const partial = report.groups.find(g => g.family === 'badge' && g.element === 'badge-label' && g.property === 'fontStyle');
  assert.equal(partial.originalCases.length, 52); assert.equal(partial.canonicalOccurrences, 40);
  assert.equal(partial.originalOccurrenceCountMatchesCanonical, false);
});

test('owner survey reopens all paired trees and reproduces the checked-in evidence without writes', () => {
  const before = hash(readFileSync(reportFile));
  const output = JSON.parse(execFileSync(process.execPath, ['scripts/audit-material-owner-initial-styles.mjs', '--check'],
    { encoding: 'utf8', timeout: 300000 }));
  assert.equal(output.groupCount, 600); assert.equal(output.observations, 32144);
  assert.equal(output.canonicalIntegration, false);
  assert.equal(hash(readFileSync(reportFile)), before);
});
