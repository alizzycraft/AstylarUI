import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { collectLineBoxNormalizationTransitions, inspectLineBoxColorTransition } from '../../scripts/audit-material-line-box-normalization.mjs';
import { bindOwnerCaretNormalization } from './owner-caret-source-binding.mjs';
import { bindPreciseAuditNormalization } from './audit-normalization-contracts.mjs';

test('every captured interactive line-box measurement has an exact normalization transition census', () => {
  const report = collectLineBoxNormalizationTransitions();
  assert.deepEqual(report, JSON.parse(readFileSync('docs/material-line-box-normalization-census.json')));
  assert.deepEqual(report.counts, { cases: 477, observations: 671, changed: 48, unchanged: 623 });
  assert.equal(report.captureModified, false);
  assert.equal(report.productionAcceptanceChanged, false);
  assert.equal(report.inputEquivalent, false);
  assert.equal(report.renderingEquivalent, false);
  const changed = report.observations.filter(row => row.changed);
  assert.ok(changed.every(row => row.family === 'button' && row.element === 'button-disabled'));
  assert.equal(new Set(report.observations.map(row => JSON.stringify([row.case, row.element, row.referenceNode]))).size, 671);
});

test('diagnostic join rejects unrelated stage, owner, precision and property changes', () => {
  const census = JSON.parse(readFileSync('docs/material-line-box-normalization-census.json'));
  const row = census.observations.find(row => row.changed);
  const evidence = JSON.parse(readFileSync(row.evidence.file));
  const measurement = evidence.measurements.find(m => m.element === row.element);
  const target = { element: row.element, referenceNode: row.referenceNode,
    astylarNode: row.candidateNode, properties: structuredClone(measurement.checkpointTypography) };
  target.properties.color.reference = row.after;
  const historical = bindOwnerCaretNormalization(readFileSync(census.historicalNormalization.source.snapshot, 'utf8'),
    census.historicalNormalization);
  const current = bindPreciseAuditNormalization();
  const baseline = [measurement, target, { color: row.raw }];
  assert.equal(inspectLineBoxColorTransition(...baseline, historical, current).changed, true);
  const mutants = [
    pair => { pair[0].element = 'wrong'; },
    pair => { pair[0].referenceNode = 'wrong'; },
    pair => { pair[0].checkpointReferenceNode = 'wrong'; },
    pair => { pair[0].checkpointCandidateNode = 'wrong'; },
    pair => { pair[0].checkpointTypography.color.reference = row.after; },
    pair => { pair[1].properties.color.reference = row.before; },
    pair => { pair[1].properties.color.normal = '#ffffff'; },
    pair => { pair[1].properties.color.effective = '#ffffff'; },
    pair => { pair[1].properties.color.painted = '#ffffff'; },
    pair => { pair[1].properties.fontSize.reference = '100px'; },
    pair => { delete pair[1].properties.lineHeight; },
    pair => { pair[2].color = '#ffffff'; },
  ];
  for (const mutate of mutants) {
    const pair = structuredClone(baseline); mutate(pair);
    assert.throws(() => inspectLineBoxColorTransition(...pair, historical, current));
  }
  assert.deepEqual([measurement, target, { color: row.raw }], baseline);
});
