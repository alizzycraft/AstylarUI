import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { verifyOverlayMappingAuditProjection } from './historical-audit-module-source.mjs';
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

test('overlay mapping source binding accepts only the reviewed ink correction and preserves its historical statements', () => {
  const file = 'tests/material-parity/input-equivalence-audit.mjs';
  const historical = execFileSync('git', ['show', `4dc770a:${file}`], { maxBuffer: 8 * 1024 * 1024 });
  const receipt = { file, sha256: createHash('sha256').update(historical.toString().replaceAll('\r\n', '\n')).digest('hex') };
  const proof = verifyOverlayMappingAuditProjection(receipt, source, historical);
  assert.equal(proof.disabledInkGuardTransition.decimalGuardApplied, true);
  assert.equal(proof.disabledInkGuardTransition.colorValuesEquivalent, false);
  assert.throws(() => verifyOverlayMappingAuditProjection(receipt,
    source.replace(disabledInkDecimalGuard, 'true || ' + disabledInkDecimalGuard), historical));
  assert.throws(() => verifyOverlayMappingAuditProjection(receipt,
    source + '\nexport const unreviewedMappingChange = true;\n', historical));
});
