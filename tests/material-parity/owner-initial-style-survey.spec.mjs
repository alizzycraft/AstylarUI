import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { inspectOwnerInitialStyle } from './owner-initial-style-survey.mjs';

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
