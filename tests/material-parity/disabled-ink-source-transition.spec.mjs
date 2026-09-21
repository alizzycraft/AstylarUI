import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { conserveDisabledInkGuard, disabledInkIntegerGuard, disabledInkDecimalGuard } from './disabled-ink-source-transition.mjs';

const source = readFileSync('tests/material-parity/input-equivalence-audit.mjs', 'utf8').replaceAll('\r\n', '\n');
const original = conserveDisabledInkGuard(source).source;
const proposed = original.replace(disabledInkIntegerGuard, disabledInkDecimalGuard);

test('disabled ink transition restores only the exact reviewed guard and preserves all surrounding source', () => {
  assert.equal(conserveDisabledInkGuard(original).source, original);
  assert.equal(conserveDisabledInkGuard(original).decimalGuardApplied, false);
  const proof = conserveDisabledInkGuard(proposed);
  assert.equal(proof.source, original); assert.equal(proof.decimalGuardApplied, true);
  assert.equal(proof.colorValuesEquivalent, false);
  assert.notEqual(proof.currentFunctionSha256, proof.historicalFunctionSha256);
  const externalChange = '\nexport const unrelatedChangeMustStillBeChecked = true;\n';
  assert.equal(conserveDisabledInkGuard(proposed + externalChange).source, original + externalChange);
});

test('disabled ink transition rejects alternate alpha guards, missing functions and arbitrary classifier edits', () => {
  assert.throws(() => conserveDisabledInkGuard(proposed.replace(disabledInkDecimalGuard, disabledInkDecimalGuard.replace('0\\.38', '0\\.4'))));
  assert.throws(() => conserveDisabledInkGuard(proposed.replace('function reviewedButtonPaintInput', 'function forgedButtonPaintInput')));
  assert.throws(() => conserveDisabledInkGuard(proposed.replace(disabledInkDecimalGuard, 'true || ' + disabledInkDecimalGuard)));
  assert.throws(() => conserveDisabledInkGuard(proposed.replace(disabledInkDecimalGuard, disabledInkDecimalGuard + ' || ' + disabledInkDecimalGuard)));
});
