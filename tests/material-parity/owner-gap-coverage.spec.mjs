import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { collectOwnerGapInputs } from './owner-gap-source-binding.mjs';
import { expectedOwnerGapClassifications, validateOwnerGapClassifications } from './owner-gap-coverage.mjs';

const parityPath = 'artifacts/material-parity/current-ancestry-audit/latest-report.json';
const evidence = collectOwnerGapInputs(JSON.parse(readFileSync(parityPath)), { parityPath });
assert.equal(evidence.binding.status, 'bound', evidence.binding.error);
const expected = expectedOwnerGapClassifications(evidence);
const canonicalFiles = ['docs/material-input-equivalence-audit.json', 'docs/material-input-equivalence-audit.json.gz',
  'docs/material-input-equivalence-audit.md'];
const fingerprint = () => canonicalFiles.map(file => createHash('sha256').update(readFileSync(file)).digest('hex'));
const before = fingerprint();

test('gap classification population matches all 108 original omission groups and retains exact state membership', () => {
  assert.equal(expected.length, 108);
  assert.equal(expected.reduce((n, row) => n + row.occurrences, 0), 6320);
  const survey = JSON.parse(readFileSync('docs/material-owner-gap-input-survey.json'));
  for (const row of expected) {
    const group = survey.groups.find(g => g.family === row.family && g.element === row.element && g.property === row.property);
    assert.equal(group.allOriginalCasesHaveLocalOmissionEvidence, true);
    assert.deepEqual(row.reviewedCases, group.originalCases);
    assert.equal(row.occurrences, group.canonicalOccurrences);
    assert.deepEqual(row.cases, row.reviewedCases.slice(0, 12));
  }
  assert.deepEqual(validateOwnerGapClassifications(evidence, JSON.parse(JSON.stringify(expected))), []);
});

test('gap classified coverage cannot be weakened by removing, duplicating or relabeling rows or cases', () => {
  const mutations = [
    rows => { rows.pop(); },
    rows => { rows[1] = structuredClone(rows[0]); },
    rows => { rows[0].attribution = 'unresolved'; },
    rows => { rows[0].classification = 'equivalent-representation'; },
    rows => { rows[0].recommendedOwner = 'plugin layout'; },
    rows => { rows[0].justification = 'normal means zero'; },
    rows => { rows[0].astylar = '0'; },
    rows => { rows[0].reviewedCases.pop(); },
    rows => { const a = rows[0].reviewedCases; [a[20], a[21]] = [a[21], a[20]]; },
    rows => { rows[0].occurrences++; },
    rows => { rows[0].cases.pop(); },
    rows => { rows[0].states.pop(); },
    rows => { rows[0].reviewEvidence.usedGapVerified = true; },
    rows => { rows[0].reviewEvidence.inputSha256 = '0'.repeat(64); },
    rows => { rows[0].reviewEvidence.computedCandidateVerified = true; },
  ];
  for (const mutate of mutations) {
    const changed = structuredClone(expected); mutate(changed);
    assert.ok(validateOwnerGapClassifications(evidence, changed).length);
  }
  assert.equal(mutations.length, 15);
});

test('gap classified coverage independently rejects altered original observation order and provenance', () => {
  const mutations = [
    e => { e.observations.pop(); },
    e => { e.observations.push(structuredClone(e.observations[0])); },
    e => { e.observations[0].case = 'invented-case'; },
    e => { e.observations[0].family = 'invented'; },
    e => { e.observations[0].profile = 'invented'; },
    e => { e.observations[0].state = 'invented'; },
    e => { e.observations[0].viewport.width++; },
    e => { e.observations[0].inputSha256 = '0'.repeat(64); },
    e => { e.observations[0].proof.element = 'invented'; },
    e => { e.binding.file = 'package.json'; },
    e => { e.binding.sha256 = '0'.repeat(64); },
  ];
  for (const mutate of mutations) {
    const changed = structuredClone(evidence); mutate(changed);
    assert.ok(validateOwnerGapClassifications(changed, expected).length);
  }
  assert.equal(mutations.length, 11);
  assert.deepEqual(fingerprint(), before);
});
