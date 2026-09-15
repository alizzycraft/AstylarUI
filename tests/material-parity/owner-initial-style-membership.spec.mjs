import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { bindOwnerInitialMembership } from './owner-initial-style-membership.mjs';

const file = 'docs/material-owner-initial-style-membership.json';
const report = JSON.parse(readFileSync(file));
const raw = JSON.parse(readFileSync(report.capture.file));
const hash = value => createHash('sha256').update(value).digest('hex');
const group = report.groups.find(g => g.family === 'badge' && g.element === 'badge-label' && g.property === 'fontStyle');
const staticEntry = raw.results.find(e => e.family === 'badge');
const interactionEntry = raw.interactions.find(e => e.family === 'badge');
const partial = { ...raw, results: [staticEntry], interactions: [interactionEntry] };
const rows = [
  { family: 'badge', element: 'badge-label', property: 'fontStyle', reference: 'normal',
    classification: 'parity-harness-defect', attribution: 'reviewed-stage-mismatch',
    occurrences: 1, cases: [group.preservedStaticCases[0]], states: ['static'], reviewEvidence: group.preservedStaticWitnesses[0] },
  { family: 'badge', element: 'badge-label', property: 'fontStyle', reference: 'normal',
    classification: 'parity-harness-defect', attribution: 'unresolved',
    occurrences: 1, cases: [group.cases[0]], states: [interactionEntry.state] },
];

test('membership binding preserves reviewed static observations and assigns the exact unresolved interaction case', () => {
  const before = JSON.stringify({ rows, partial });
  const result = bindOwnerInitialMembership(rows, partial);
  assert.equal(result.length, 1);
  assert.deepEqual(result[0].cases, rows[1].cases);
  assert.deepEqual(result[0].preservedStaticCases, rows[0].cases);
  assert.deepEqual(result[0].preservedStaticWitnesses, [rows[0].reviewEvidence]);
  assert.equal(result[0].inputEquivalent, false); assert.equal(result[0].renderingEquivalent, false);
  assert.equal(JSON.stringify({ rows, partial }), before);
});

test('membership binding rejects altered membership, duplicate observations and unsupported competing classifications', () => {
  const mutations = [
    (r, p) => { p.interactions = []; },
    (r, p) => { p.results.push(structuredClone(p.results[0])); },
    (r, p) => { p.interactions[0].styleInputs.push(structuredClone(p.interactions[0].styleInputs.find(i => i.id === 'badge-label'))); },
    r => { r[1].occurrences++; },
    r => { r[1].cases = [r[0].cases[0]]; },
    r => { r[1].states = ['hover']; },
    r => { r[0].attribution = 'equivalent'; },
    r => { r[0].classification = 'equivalent-representation'; },
    r => { r[0].reviewEvidence.values.normal = null; },
    r => { r[0].reviewEvidence.values.retained = 'italic'; },
    r => { r.push(structuredClone(r[1])); },
    r => { r.push(structuredClone(r[0])); },
    (r, p) => { p.results[0].inputTrees.reference.sha256 = '0'.repeat(64); },
    (r, p) => { p.results[0].styleInputs.find(i => i.id === 'badge-label').astylarStructure.ownText = 'wrong'; },
    (r, p) => { p.results[0].styleInputs.find(i => i.id === 'badge-label').astylarResolvedStyleEvidenceVersion = 1; },
  ];
  for (const [i, mutate] of mutations.entries()) {
    const r = structuredClone(rows), p = structuredClone(partial); mutate(r, p);
    assert.throws(() => bindOwnerInitialMembership(r, p), undefined, `mutation ${i}`);
  }
});

test('membership report covers all 600 groups while retaining 636 already-reviewed observations', () => {
  assert.equal(report.groupCount, 600); assert.equal(report.groups.length, 600);
  assert.equal(report.unresolvedOccurrences, 31508); assert.equal(report.preservedStaticOccurrences, 636);
  assert.equal(report.splitGroups, 51); assert.equal(report.canonicalAttributionChanged, false);
  const survey = JSON.parse(readFileSync('docs/material-owner-initial-style-survey.json'));
  assert.equal(report.canonicalCompressedSha256, survey.canonicalCompressedSha256);
  for (const g of report.groups) {
    const source = survey.groups.find(s => s.family === g.family && s.element === g.element && s.property === g.property && s.reference === g.reference);
    assert.ok(source);
    assert.deepEqual([...g.cases, ...g.preservedStaticCases].sort(), [...source.originalCases].sort());
    assert.equal(new Set([...g.cases, ...g.preservedStaticCases]).size, source.originalCases.length);
    assert.equal(g.cases.length, source.canonicalOccurrences);
    assert.equal(g.membershipVerified, true); assert.equal(g.inputEquivalent, false); assert.equal(g.renderingEquivalent, false);
  }
  for (const source of report.sourceFingerprints)
    assert.equal(hash(readFileSync(source.file, 'utf8').replaceAll('\r\n', '\n')), source.sha256, source.file);
});

test('membership replay reopens original trees and matches the complete report without rewriting it', () => {
  const before = hash(readFileSync(file));
  const result = JSON.parse(execFileSync(process.execPath, ['scripts/audit-material-owner-initial-membership.mjs', '--check'], { encoding: 'utf8' }));
  assert.deepEqual(result, { groups: 600, unresolvedOccurrences: 31508, preservedStaticOccurrences: 636, splitGroups: 51, canonicalAttributionChanged: false });
  assert.equal(hash(readFileSync(file)), before);
});
