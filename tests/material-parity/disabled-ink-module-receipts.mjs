import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { conserveDisabledInkGuard } from './disabled-ink-source-transition.mjs';

const hash = source => createHash('sha256').update(source).digest('hex');
const previousModuleSha256 = 'ec5fd9d1b35795b7614c43a5c667b1817c017a52f4ebc35c957e4d1813601f6a';
export function verifyDisabledInkModuleTransition(previous, current) {
  const before = previous.toString().replaceAll('\r\n', '\n');
  const after = current.toString().replaceAll('\r\n', '\n');
  assert.equal(hash(before), previousModuleSha256);
  const guard = conserveDisabledInkGuard(after); assert.equal(guard.decimalGuardApplied, true);
  let restored = guard.source;
  for (const file of ['disabled-ink-source-transition.mjs', 'disabled-ink-source-transition.spec.mjs', 'disabled-ink-precision-preparation.spec.mjs']) {
    const line = `    'tests/material-parity/${file}',\n`;
    assert.equal(restored.split(line).length, 2, 'inventory extension must occur exactly once');
    restored = restored.replace(line, '');
  }
  assert.equal(restored, before, 'module changed beyond exact ink guard and three inventory entries');
  return { previousModuleSha256, currentModuleSha256: hash(after), wholeModuleConserved: true };
}

const receipt = row => row?.reviewEvidence?.observation?.normalizationReconciliation;
export function reconcileDisabledInkModuleReceipts(previous, current, previousSource, currentSource) {
  const proof = verifyDisabledInkModuleTransition(previousSource, currentSource);
  assert.equal(previous.control.differences.length, current.control.differences.length);
  const control = structuredClone(current.control), cases = [];
  for (let i = 0; i < previous.control.differences.length; i++) {
    const before = previous.control.differences[i];
    if (before.attribution !== 'reviewed-interactive-normal-line-box-stage-comparison' ||
        receipt(before)?.currentModuleSha256 !== proof.previousModuleSha256) continue;
    const after = control.differences[i];
    assert.equal(receipt(after)?.currentModuleSha256, proof.currentModuleSha256, 'wrong current embedded receipt');
    receipt(after).currentModuleSha256 = proof.previousModuleSha256;
    assert.ok(isDeepStrictEqual(after, before), 'line-box record changed beyond its authenticated module receipt');
    cases.push(before.case);
  }
  assert.equal(cases.length, 48, 'line-box receipt population changed');
  assert.equal(new Set(cases).size, 48, 'duplicate receipt case');
  return { current: { ...current, control }, proof: { ...proof, reconciledRecords: cases.length, cases,
    rawLineBoxEvidenceConserved: true, classificationChanged: false } };
}
