import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { collectGapReviewInputs } from './gap-review-source-binding.mjs';
import { expectedGapReviewClassifications, validateGapReviewClassifications } from './gap-review-coverage.mjs';

const parityPath = 'artifacts/material-parity/current-ancestry-audit/latest-report.json';
const evidence = collectGapReviewInputs(JSON.parse(readFileSync(parityPath)), { parityPath });
assert.equal(evidence.binding.status, 'bound', evidence.binding.error);
const rows = expectedGapReviewClassifications(evidence);

test('gap review coverage conserves every attributable original membership and keeps unresolved cases visible', () => {
  assert.equal(rows.length, 36); assert.equal(rows.reduce((n, r) => n + r.occurrences, 0), 1838);
  assert.equal(evidence.coverage.unresolvedObservations, 64);
  assert.equal(rows.filter(r => r.family === 'dialog' && r.element === 'dialog-panel').length, 0);
  for (const row of rows) {
    const proof = evidence.groups.find(g => g.family === row.family && g.element === row.element && g.property === row.property);
    assert.equal(row.reference, 'normal'); assert.equal(row.astylar, undefined);
    assert.equal(row.reviewEvidence.rawCandidateLonghand, '<omitted>', 'display marker stays only in review evidence');
    assert.equal(row.reviewEvidence.inputEquivalent, false); assert.equal(row.reviewEvidence.rendererCauseProven, false);
    assert.deepEqual(row.reviewedCases, proof.observations.map(o => o.case));
    assert.deepEqual(row.cases, row.reviewedCases.slice(0, 12)); assert.equal(row.occurrences, row.reviewedCases.length);
  }
  assert.deepEqual(validateGapReviewClassifications(evidence, rows), []);
});

test('gap review coverage rejects missing relabeled reordered and fabricated findings without opting out', () => {
  const mutations = [
    x => { x.pop(); }, x => { x[0].attribution = 'unresolved'; },
    x => { x[0].classification = 'equivalent-representation'; }, x => { x[0].astylar = '0px'; },
    x => { x[0].astylar = '<omitted>'; },
    x => { x[0].occurrences--; }, x => { x[0].reviewedCases.pop(); },
    x => { x[0].reviewedCases.reverse(); }, x => { x[0].cases.reverse(); },
    x => { x[0].states.pop(); }, x => { x[0].reviewEvidence.renderingEquivalent = true; },
    x => { x.push({ ...structuredClone(x[0]), family: 'dialog', element: 'dialog-panel' }); },
  ];
  for (const [index, mutate] of mutations.entries()) {
    const changed = structuredClone(rows); mutate(changed);
    assert.ok(validateGapReviewClassifications(evidence, changed).some(e => /complete original coverage/.test(e)), `mutation ${index}`);
  }
  for (const mutate of [
    e => { e.groups.pop(); }, e => { e.observations.pop(); },
    e => { e.coverage.unresolvedObservations = 0; }, e => { e.captures.pop(); },
  ]) {
    const changed = structuredClone(evidence); mutate(changed);
    assert.ok(validateGapReviewClassifications(changed, rows).length);
  }
});
