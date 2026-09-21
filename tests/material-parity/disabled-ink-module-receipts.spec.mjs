import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import test from 'node:test';
import { verifyDisabledInkModuleTransition, reconcileDisabledInkModuleReceipts } from './disabled-ink-module-receipts.mjs';
import { verifyVisibilityAuditModuleTransition } from './visibility-audit-source-binding.mjs';
const file = 'tests/material-parity/input-equivalence-audit.mjs';
const previousSource = execFileSync('git', ['show', `6833850:${file}`], { maxBuffer: 4 * 1024 * 1024 });
const visibilityBaseline = execFileSync('git', ['show', `c090e1b:${file}`], { maxBuffer: 4 * 1024 * 1024 });
// Keep the old guard proof intact; authenticate the newer transition before
// projecting back to the exact source on which that proof was established.
const currentSource = verifyVisibilityAuditModuleTransition(visibilityBaseline, readFileSync(file, 'utf8')).restoredSource;

test('whole module permits only the exact decimal guard and three inventory entries', () => {
  const proof = verifyDisabledInkModuleTransition(previousSource, currentSource);
  assert.equal(proof.currentModuleSha256, 'ac8d32f078d75affd9ddf7d2d77d58f61fef9a3d78de2146fd69f6aeb471c095');
  for (const source of [currentSource + '\n// unrelated edit\n',
    currentSource.replace('disabled-ink-source-transition.spec.mjs', 'other.spec.mjs'),
    currentSource.replace('function reviewedButtonPaintInput(', 'function changedPaintInput(')]) {
    assert.throws(() => verifyDisabledInkModuleTransition(previousSource, source));
  }
  assert.throws(() => verifyDisabledInkModuleTransition(previousSource + ' ', currentSource));
});

test('receipt reconciliation conserves complete records and never mutates reports', () => {
  const proof = verifyDisabledInkModuleTransition(previousSource, currentSource);
  const previous = { control: { differences: Array.from({ length: 48 }, (_, i) => ({ case: `case-${i}`,
    attribution: 'reviewed-interactive-normal-line-box-stage-comparison', values: { reference: 20, painted: 19 },
    reviewEvidence: { observation: { normalizationReconciliation: { currentModuleSha256: proof.previousModuleSha256, observed: 19 } } } })) } };
  const current = structuredClone(previous);
  for (const row of current.control.differences) row.reviewEvidence.observation.normalizationReconciliation.currentModuleSha256 = proof.currentModuleSha256;
  const snapshots = structuredClone([previous, current]);
  const result = reconcileDisabledInkModuleReceipts(previous, current, previousSource, currentSource);
  assert.deepEqual(result.current.control, previous.control);
  assert.deepEqual([previous, current], snapshots);
  for (const mutate of [
    r => { r.control.differences.pop(); },
    r => { r.control.differences[0].values.painted = 20; },
    r => { r.control.differences[0].attribution = 'equivalent'; },
    r => { r.control.differences[0].reviewEvidence.observation.normalizationReconciliation.observed = 20; },
    r => { r.control.differences[0].reviewEvidence.observation.normalizationReconciliation.currentModuleSha256 = 'forged'; },
    r => { r.control.differences.reverse(); },
  ]) { const changed = structuredClone(current); mutate(changed);
    assert.throws(() => reconcileDisabledInkModuleReceipts(previous, changed, previousSource, currentSource)); }
});
