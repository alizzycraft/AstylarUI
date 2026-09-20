import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { collectControlTypographyEvidence, collectFullTreeInventory } from './input-equivalence-audit.mjs';
import { validateControlLineBoxMeasurement } from './control-line-box-validation.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const reportPath = 'artifacts/material-parity/control-line-box-current-ancestry-audit-v3/latest-report.json';

// Diagnostic only: retain the old receipt and demonstrate why it cannot be
// compared directly with a target using the newer precise normalization.
test('historical line-box checkpoint rejects precise color targets without losing the reason', () => {
  const bytes = readFileSync(reportPath);
  assert.equal(hash(bytes), '9e689c9a5d828a16214abbe55804a6ff72037d300c7f26272123ae008d948d11');
  const report = JSON.parse(bytes);
  const index = report.results.find(row => row.case === 'interaction:button@light/desktop-dpr1/disabled');
  const evidenceBytes = readFileSync(index.file);
  assert.equal(hash(evidenceBytes), index.sha256);
  const evidence = JSON.parse(evidenceBytes);
  const record = JSON.parse(readFileSync(evidence.checkpointRecord.file));
  assert.equal(hash(JSON.stringify(record.result)), evidence.checkpointRecord.sha256);
  assert.equal(record.sha256, evidence.checkpointRecord.sha256);
  const selected = { ...record.result, kind: 'interaction' };
  assert.deepEqual(selected.inputTrees, evidence.checkpointInputTrees);
  for (const tree of Object.values(selected.inputTrees))
    assert.equal(hash(readFileSync(tree.file)), tree.sha256);
  const inventory = collectFullTreeInventory([selected]);
  assert.deepEqual(inventory.errors, []);
  const controls = collectControlTypographyEvidence([selected], inventory);
  assert.deepEqual(controls.gaps, []);
  const reference = inventory.cases.find(row => row.side === 'reference');
  const freshBytes = readFileSync(evidence.inputTree.file);
  assert.equal(hash(freshBytes), evidence.inputTree.sha256);
  const fresh = JSON.parse(freshBytes), original = inventory.variants[reference.variant];
  assert.equal(evidence.measurements.length, 3);
  for (const measurement of evidence.measurements) {
    const target = controls.comparisons.find(row => row.element === measurement.element);
    assert.ok(target);
    const options = { measurement, target, fresh, original, inventory, selected };
    if (measurement.element !== 'button-disabled') {
      assert.doesNotThrow(() => validateControlLineBoxMeasurement(options));
      continue;
    }
    assert.equal(measurement.checkpointTypography.color.reference, 'rgba(29,27,32,0.38)');
    assert.equal(target.properties.color.reference, 'rgba(28.999875,26.99991,31.99995,0.38)');
    assert.throws(() => validateControlLineBoxMeasurement(options), /changed checkpoint typography/);

    // Counterfactual used ONLY to isolate the rejection. Never export this
    // rounded target as accepted live evidence or modify the captured receipt.
    const historicalTarget = structuredClone(target);
    historicalTarget.properties.color.reference = measurement.checkpointTypography.color.reference;
    assert.deepEqual(JSON.parse(JSON.stringify(historicalTarget.properties)), measurement.checkpointTypography);
    assert.doesNotThrow(() => validateControlLineBoxMeasurement({ ...options, target: historicalTarget }));
    const changedMetric = structuredClone(measurement);
    changedMetric.naturalHeight = 0;
    assert.throws(() => validateControlLineBoxMeasurement({ ...options, target: historicalTarget,
      measurement: changedMetric }), /invalid CSS height/);
  }
});
