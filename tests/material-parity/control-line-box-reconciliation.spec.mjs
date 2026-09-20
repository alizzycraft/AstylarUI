import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { collectControlTypographyEvidence, collectFullTreeInventory } from './input-equivalence-audit.mjs';
import { propertyGroups } from './input-equivalence-policy.mjs';
import { loadControlLineBoxReport } from './control-line-box-report.mjs';
import { bindControlLineBoxNormalization, historicalControlLineBoxReportSha256,
  reconcileControlLineBoxMeasurement } from './control-line-box-normalization.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const reportPath = 'artifacts/material-parity/control-line-box-current-ancestry-audit-v3/latest-report.json';
const census = JSON.parse(readFileSync('docs/material-line-box-normalization-census.json'));

test('full independent reader reconciles all 671 measurements against every original interaction target', () => {
  const captureBytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(hash(captureBytes), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const capture = JSON.parse(captureBytes);
  const cases = capture.interactions.map(row => ({ ...row, kind: 'interaction' }));
  assert.equal(cases.length, 1875);
  const inventory = collectFullTreeInventory(cases);
  assert.deepEqual(inventory.errors, []);
  const options = { reportPath, cases, inventory,
    controlTypography: collectControlTypographyEvidence(cases, inventory),
    expectedProvenance: capture.captureProvenance, styleProperties: Object.values(propertyGroups).flat() };
  const result = loadControlLineBoxReport(options);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.missing, []);
  assert.equal(result.observations.length, 671);
  assert.equal(result.observations.filter(row => row.normalizationReconciliation).length, 48);
  for (const observation of result.observations) {
    const review = census.observations.find(row => row.case === observation.case && row.element === observation.element &&
      row.referenceNode === observation.referenceNode);
    assert.ok(review);
    const { case: caseId, evidence, normalizationReconciliation, ...measurement } = observation;
    const restored = structuredClone(measurement);
    if (normalizationReconciliation) {
      assert.equal(normalizationReconciliation.before, review.before);
      assert.equal(normalizationReconciliation.after, review.after);
      assert.equal(measurement.checkpointTypography.color.reference, review.after);
      restored.checkpointTypography = normalizationReconciliation.historicalCheckpointTypography;
    }
    assert.equal(hash(JSON.stringify(restored)), review.measurementSha256, 'physical or other captured data changed');
  }
  // A changed current target is not admitted by a self-consistent old receipt.
  const target = options.controlTypography.comparisons.find(row => row.element === 'button-disabled' && row.properties.color.reference.includes('28.999875'));
  target.properties.fontSize.reference = '99px';
  const rejected = loadControlLineBoxReport(options);
  assert.ok(rejected.errors.some(error => error.includes('outside reference-color normalization')));
  assert.deepEqual(rejected.observations, []);
  assert.equal(rejected.missing.length, 671);
});

test('reconciliation binds both normalization implementations and rejects unrelated changes', () => {
  const report = JSON.parse(readFileSync(reportPath));
  const source = report.measurementSources.find(row => row.file.endsWith('/input-equivalence-audit.mjs'));
  const historicalBytes = readFileSync(source.snapshot), currentBytes = readFileSync(source.file);
  const context = bindControlLineBoxNormalization(historicalControlLineBoxReportSha256, source, historicalBytes, currentBytes);
  assert.throws(() => bindControlLineBoxNormalization('0'.repeat(64), source, historicalBytes, currentBytes), /unreviewed/);
  assert.throws(() => bindControlLineBoxNormalization(historicalControlLineBoxReportSha256, source,
    Buffer.concat([historicalBytes, Buffer.from(' ')]), currentBytes), /historical normalization snapshot/);
  assert.throws(() => bindControlLineBoxNormalization(historicalControlLineBoxReportSha256, source,
    historicalBytes, Buffer.from(currentBytes.toString().replace('function normalizeColor(', 'function renamedNormalizeColor('))));
  const row = census.observations.find(row => row.changed);
  const evidence = JSON.parse(readFileSync(row.evidence.file));
  const measurement = evidence.measurements.find(item => item.element === row.element);
  const target = { element: row.element, referenceNode: row.referenceNode, astylarNode: row.candidateNode,
    properties: structuredClone(measurement.checkpointTypography) };
  target.properties.color.reference = row.after;
  const baseline = [measurement, target, { color: row.raw }], unchanged = structuredClone(baseline);
  const projected = reconcileControlLineBoxMeasurement(...baseline, context);
  assert.deepEqual(baseline, unchanged);
  assert.equal(projected.observation.checkpointTypography.color.reference, row.after);
  assert.equal(projected.observation.normalizationReconciliation.historicalCheckpointTypography.color.reference, row.before);
  for (const mutate of [
    pair => { pair[0].element = 'other'; }, pair => { pair[1].astylarNode = 'other'; },
    pair => { pair[1].properties.color.reference = row.before; },
    pair => { pair[0].checkpointTypography.color.reference = row.after; },
    pair => { pair[1].properties.color.painted = '#fff'; },
    pair => { pair[1].properties.lineHeight.reference = '17px'; },
    pair => { pair[2].color = '#fff'; },
  ]) {
    const pair = structuredClone(baseline); mutate(pair);
    assert.throws(() => reconcileControlLineBoxMeasurement(...pair, context));
  }
});
