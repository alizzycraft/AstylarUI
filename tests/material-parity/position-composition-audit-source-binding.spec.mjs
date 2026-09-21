import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { collectPositionAuditInputs, validatePositionAuditInputs, applyPositionAuditRows,
  validatePositionAuditClassifications, positionCompositionAttribution } from './position-composition-audit-source-binding.mjs';

test('production position adapter binds the complete original capture and rejects altered evidence', () => {
  const parityPath = 'artifacts/material-parity/current-ancestry-audit/latest-report.json';
  const original = JSON.parse(readFileSync(parityPath));
  const evidence = collectPositionAuditInputs(original, { parityPath });
  assert.equal(evidence.binding.status, 'bound', evidence.binding.error);
  assert.equal(evidence.observations.length, 316);
  assert.deepEqual(validatePositionAuditInputs(JSON.parse(JSON.stringify(evidence))), []);
  for (const mutate of [e => e.observations.pop(), e => { e.review.groups[0].classification = 'equivalent-representation'; },
    e => { e.binding.capture.sha256 = 'forged'; }, e => { e.inputEquivalent = true; }]) {
    const changed = structuredClone(evidence); mutate(changed);
    assert.ok(validatePositionAuditInputs(changed).length);
  }
  assert.equal(collectPositionAuditInputs({}, { parityPath }).binding.status, 'invalid');
  assert.equal(collectPositionAuditInputs(original, { parityPath: 'docs/material-position-input-population.json' }).binding.status, 'invalid');
  assert.ok(validatePositionAuditClassifications(evidence, []).length);
});

test('unbound diagnostic reports cannot receive position classifications', () => {
  const empty = collectPositionAuditInputs({});
  assert.equal(empty.binding.status, 'unbound');
  const rows = [{ attribution: 'unresolved' }];
  assert.equal(applyPositionAuditRows(rows, empty), rows);
  assert.throws(() => applyPositionAuditRows([{ attribution: positionCompositionAttribution }], empty));
});
