import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { collectPositionFollowupAuditInputs, validatePositionFollowupAuditInputs,
  validatePositionFollowupAuditClassifications, applyPositionFollowupAuditRows,
  positionFollowupAttribution } from './position-followup-audit-source-binding.mjs';
test('followup adapter authenticates full original input population and rejects foreign evidence', () => {
  const parityPath = 'artifacts/material-parity/current-ancestry-audit/latest-report.json';
  const original = JSON.parse(readFileSync(parityPath));
  const evidence = collectPositionFollowupAuditInputs(original, { parityPath });
  assert.equal(evidence.binding.status, 'bound', evidence.binding.error);
  assert.equal(evidence.observations.length, 768);
  assert.deepEqual(validatePositionFollowupAuditInputs(JSON.parse(JSON.stringify(evidence))), []);
  for (const mutate of [e => e.observations.pop(),
    e => { e.review.groups[0].classification = 'equivalent-representation'; },
    e => { e.binding.capture.sha256 = 'forged'; }, e => { e.inputEquivalent = true; }]) {
    const changed = structuredClone(evidence); mutate(changed);
    assert.ok(validatePositionFollowupAuditInputs(changed).length);
  }
  assert.equal(collectPositionFollowupAuditInputs({ ...original, results: original.results.slice(1) }, { parityPath }).binding.status, 'invalid');
  assert.equal(collectPositionFollowupAuditInputs({ ...original, results: [...original.results].reverse() }, { parityPath }).binding.status, 'invalid');
  assert.equal(collectPositionFollowupAuditInputs(original, { parityPath: 'docs/material-position-input-population.json' }).binding.status, 'invalid');
  assert.ok(validatePositionFollowupAuditClassifications(evidence, []).length);
});
test('diagnostic or invalid captures cannot receive reviewed followup classifications', () => {
  const empty = collectPositionFollowupAuditInputs({});
  assert.equal(empty.binding.status, 'unbound');
  const rows = [{ attribution: 'unresolved' }];
  assert.equal(applyPositionFollowupAuditRows(rows, empty), rows);
  for (const binding of ['unbound', 'invalid']) assert.throws(() => applyPositionFollowupAuditRows(
    [{ attribution: positionFollowupAttribution }], { binding: { status: binding } }));
});
