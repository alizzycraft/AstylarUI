import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { collectExplicitGapInputs } from './explicit-gap-source-binding.mjs';
import { expectedExplicitGapClassifications, validateExplicitGapClassifications } from './explicit-gap-coverage.mjs';

const parityPath = 'artifacts/material-parity/current-ancestry-audit/latest-report.json';
const evidence = collectExplicitGapInputs(JSON.parse(readFileSync(parityPath)), { parityPath });
assert.equal(evidence.binding.status, 'bound', evidence.binding.error);
const rows = expectedExplicitGapClassifications(evidence);

test('complete independent explicit-gap coverage preserves values, full ordered memberships and state samples', () => {
  assert.equal(rows.length, 16);
  assert.equal(rows.reduce((n, r) => n + r.occurrences, 0), 1032);
  assert.equal(new Set(rows.flatMap(r => r.reviewedCases)).size, 296);
  for (const row of rows) {
    assert.equal(row.reference, 'normal'); assert.equal(row.reviewEvidence.inputEquivalent, false);
    assert.deepEqual(row.cases, row.reviewedCases.slice(0, 12));
    assert.equal(row.occurrences, row.reviewedCases.length);
    const proof = evidence.groups.find(g => g.family === row.family && g.element === row.element && g.property === row.property);
    assert.equal(row.astylar, proof.candidate);
    assert.deepEqual(row.reviewedCases, proof.observations.map(o => o.case));
  }
  assert.deepEqual(validateExplicitGapClassifications(evidence, rows), []);
});

test('classification coverage cannot opt out by dropping, relabeling or altering reviewed observations', () => {
  const mutations = [
    x => { x.pop(); },
    x => { x[0].attribution = 'unresolved'; },
    x => { x[0].classification = 'equivalent-representation'; },
    x => { x[0].astylar = '0px'; },
    x => { x[0].occurrences--; },
    x => { x[0].reviewedCases.pop(); },
    x => { x[0].reviewedCases.reverse(); },
    x => { x[0].cases.reverse(); },
    x => { x[0].states.pop(); },
    x => { x[0].reviewEvidence.usedGapVerified = true; },
  ];
  for (const [index, mutate] of mutations.entries()) {
    const x = structuredClone(rows); mutate(x);
    assert.ok(validateExplicitGapClassifications(evidence, x).some(e => /complete original coverage/.test(e)), `mutation ${index}`);
  }
  const missingGroup = { ...evidence, groups: evidence.groups.slice(1) };
  assert.ok(validateExplicitGapClassifications(missingGroup, rows).some(e => /group inventory changed/.test(e)));
  const missingObservation = { ...evidence, observations: evidence.observations.slice(1) };
  assert.ok(validateExplicitGapClassifications(missingObservation, rows).some(e => /observations changed/.test(e)));
  const changedCoverage = { ...evidence, coverage: { ...evidence.coverage, expectedObservations: 0 } };
  assert.ok(validateExplicitGapClassifications(changedCoverage, rows).some(e => /population coverage changed/.test(e)));
});
