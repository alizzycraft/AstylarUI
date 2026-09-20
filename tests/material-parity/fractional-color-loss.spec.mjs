import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import test from 'node:test';
import { bindFractionalColorBaseline, collectFractionalColorLoss, inspectFractionalColorLoss } from '../../scripts/audit-material-fractional-color-loss.mjs';

const normalize = bindFractionalColorBaseline();
test('pinned pre-correction sRGB rounding merges a fractional color with a different integer color', () => {
  const proof = inspectFractionalColorLoss({ reference: { color: 'color(srgb 0.5 0 1)' },
    astylar: { color: '#8000ff' } }, 'color', normalize);
  assert.deepEqual(proof.scaledChannels, [127.5, 0, 255]);
  assert.deepEqual(proof.roundedChannels, [128, 0, 255]);
  assert.deepEqual(proof.channelChange, [0.5, 0, 0]);
  assert.equal(proof.disposition, 'difference-suppressed-by-rounding');
  assert.equal(proof.referenceNormalized, 'rgba(128,0,255,1)');
  // Same fractional intent in legacy RGB is NOT rounded to integer channels.
  assert.equal(normalize({ color: 'rgb(127.5, 0, 255)' }).color, 'rgba(127.5,0,255,1)');
  assert.notEqual(normalize({ color: 'rgb(127.5, 0, 255)' }).color, proof.referenceNormalized);
});

test('diagnostic distinguishes retained differences and omissions without inventing candidate values', () => {
  const reference = { backgroundColor: 'color(srgb 0.5 0 1 / 0.5)' };
  assert.equal(inspectFractionalColorLoss({ reference, astylar: { background: '#8000ff' } },
    'backgroundColor', normalize).disposition, 'reference-value-altered-difference-retained');
  const missing = inspectFractionalColorLoss({ reference, astylar: {} }, 'backgroundColor', normalize);
  assert.equal(missing.candidateNormalized, null);
  assert.equal(missing.disposition, 'reference-value-altered-candidate-omitted');
  for (const color of ['color(srgb 0 0 1)', 'rgb(127.5, 0, 255)', 'color(display-p3 0.5 0 1)', 'inherit']) {
    assert.equal(inspectFractionalColorLoss({ reference: { color } }, 'color', normalize), undefined);
  }
});

test('complete original capture replays the checked-in diagnostic without changing canonical evidence', () => {
  const files = ['docs/material-input-equivalence-audit.json', 'tests/material-parity/input-equivalence-audit.mjs'];
  const before = files.map(file => readFileSync(file));
  const report = collectFractionalColorLoss();
  assert.deepEqual(report, JSON.parse(readFileSync('docs/material-fractional-color-loss.json')));
  const historical = JSON.parse(execFileSync('git', ['show', '65a122f2b8be2ed83fccdac59491a949c8771a7b:docs/material-fractional-color-loss.json'],
    { maxBuffer: 4 * 1024 * 1024 }));
  const { revision, ...normalizationWithoutRevision } = report.normalization;
  assert.equal(revision, '65a122f2b8be2ed83fccdac59491a949c8771a7b');
  assert.deepEqual({ ...report, normalization: normalizationWithoutRevision }, historical,
    'historical diagnostic changed beyond the explicit normalization revision receipt');
  assert.equal(report.counts.cases, 2311);
  assert.deepEqual(report.counts, { cases: 2311, owners: 6946, srgbProperties: 2923, affected: 2923, groups: 210,
    dispositions: { 'difference-suppressed-by-rounding': { groups: 144, observations: 2311 },
      'reference-value-altered-difference-retained': { groups: 50, observations: 496 },
      'reference-value-altered-candidate-omitted': { groups: 16, observations: 116 } } });
  for (const row of report.findings.filter(row => row.disposition === 'difference-suppressed-by-rounding')) {
    assert.equal(row.element, row.family + '-root'); assert.equal(row.property, 'backgroundColor');
  }
  assert.equal(report.rootMixWitnesses.witnesses.length, 4);
  const light = report.rootMixWitnesses.witnesses.find(row => row.profile === 'light');
  assert.deepEqual(light.exactMix, { numerator: [24588, 24074, 24860], denominator: 100 });
  assert.equal(light.candidateRequested, '#f6f1f9');
  assert.deepEqual(light.exactMixedChannels, [245.88, 240.74, 248.6]);
  for (const witness of report.rootMixWitnesses.witnesses) {
    assert.ok(witness.exactCandidateChannelChange.some(delta => Math.abs(delta) >= 0.1));
    assert.equal(witness.rendererDefectProven, false);
  }
  assert.equal(report.counts.affected, report.findings.reduce((sum, row) => sum + row.occurrences, 0));
  assert.equal(report.rasterDifferenceProven, false);
  files.forEach((file, index) => assert.deepEqual(readFileSync(file), before[index]));
});
