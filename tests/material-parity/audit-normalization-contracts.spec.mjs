import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { bindHistoricalAuditNormalization, bindPreciseAuditNormalization, preciseAuditNormalization }
  from './audit-normalization-contracts.mjs';
import { bindLeafWeightTrackingNormalization } from '../../scripts/audit-material-leaf-weight-tracking-stages.mjs';

const historical = JSON.parse(readFileSync('docs/material-leaf-weight-tracking-stages.json')).productionNormalization;
const revision = '957774a';

test('retained tooltip population preserves caret values but exposes precise background colors', () => {
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  const parent = JSON.parse(execFileSync('git', ['show',
    '42fd47312ed6acc093d55eeced5e86b595a4d364:docs/material-owner-caret-input-survey.json'],
  { maxBuffer: 32 * 1024 * 1024 }));
  const old = bindHistoricalAuditNormalization(parent.productionNormalization, '42fd47312ed6acc093d55eeced5e86b595a4d364');
  const current = bindPreciseAuditNormalization();
  const saved = JSON.parse(readFileSync('docs/material-tooltip-caret-context-survey.json'));
  const bytes = readFileSync(saved.capture.file);
  assert.equal(hash(bytes), saved.capture.sha256);
  const capture = JSON.parse(bytes);
  let styles = 0, changes = 0;
  const changedCases = new Set();
  for (const descriptor of capture.results) {
    const resultBytes = readFileSync(descriptor.file);
    assert.equal(hash(resultBytes), descriptor.sha256);
    const result = JSON.parse(resultBytes);
    for (const style of result.freshReferenceTree.styles) {
      styles++;
      const before = old(style), after = current(style);
      assert.equal(before.caretColor, after.caretColor);
      for (const property of new Set([...Object.keys(before), ...Object.keys(after)])) {
        if (before[property] === after[property]) continue;
        assert.equal(property, 'backgroundColor');
        assert.match(style[property], /^color\(srgb /);
        changes++; changedCases.add(descriptor.case);
      }
    }
  }
  assert.deepEqual([capture.results.length, styles, changes, changedCases.size], [18, 351, 18, 18]);
});

test('historical and precise normalization are explicit and observably different contracts', () => {
  const old = bindHistoricalAuditNormalization(historical, revision), current = bindPreciseAuditNormalization();
  const input = { color: 'color(srgb .5 0 1)', fontWeight: 'normal', letterSpacing: 'normal' };
  assert.equal(old(input).color, 'rgba(128,0,255,1)');
  assert.equal(current(input).color, 'rgba(127.5,0,255,1)');
  assert.equal(old(input).fontWeight, current(input).fontWeight);
  assert.equal(old(input).letterSpacing, current(input).letterSpacing);
  assert.notEqual(historical.sha256, preciseAuditNormalization.sha256);
});

test('normalizer binding rejects changed current code and false historical contracts', () => {
  const source = readFileSync(preciseAuditNormalization.module, 'utf8');
  assert.throws(() => bindPreciseAuditNormalization(source.replace('function normalizeColor(', 'function changedNormalizeColor(')));
  const old = execFileSync('git', ['show', `${revision}:${historical.module}`], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
  assert.throws(() => bindPreciseAuditNormalization(old), /normalization changed/);
  assert.throws(() => bindHistoricalAuditNormalization(preciseAuditNormalization, revision), /normalization changed/);
  assert.throws(() => bindHistoricalAuditNormalization({ ...historical, module: 'package.json' }, revision));
  assert.throws(() => bindHistoricalAuditNormalization(historical, 'HEAD'));
});

test('weight/tracking replay exposes only independently compared typography values, never rounded colors', () => {
  const normalize = bindLeafWeightTrackingNormalization(), current = bindPreciseAuditNormalization();
  for (const input of [{ fontWeight: 'normal', letterSpacing: 'normal', color: 'color(srgb .5 0 1)' },
    { fontWeight: '700', letterSpacing: '0.125px' }, {}]) {
    const result = normalize(input);
    assert.deepEqual(Object.keys(result).sort(), ['fontWeight', 'letterSpacing']);
    assert.equal(result.fontWeight, current(input).fontWeight);
    assert.equal(result.letterSpacing, current(input).letterSpacing);
  }
  const source = readFileSync(preciseAuditNormalization.module, 'utf8');
  assert.throws(() => bindLeafWeightTrackingNormalization(source.replace('function normalizeValue(', 'function changedNormalizeValue(')));
});
