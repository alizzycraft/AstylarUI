import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import test from 'node:test';
import { compareVisibilityCanonical } from '../../scripts/check-material-visibility-canonical-conservation.mjs';
import { verifyVisibilityAuditModuleTransition, visibilityObservationAttribution } from './visibility-audit-source-binding.mjs';
const file = 'tests/material-parity/input-equivalence-audit.mjs';
const previousSource = execFileSync('git', ['show', `c090e1b:${file}`], { maxBuffer: 4 * 1024 * 1024 });
const currentSource = readFileSync(file);
const proof = verifyVisibilityAuditModuleTransition(previousSource, currentSource);
function sample() {
  const previous = { rows: Array.from({ length: 15 }, (_, i) => ({ family: 'fixture', element: `owner-${i}`,
    occurrences: i === 0 ? 40 : 35, attribution: 'unresolved', reference: 'visible', astylar: '(omitted)' })),
    control: { comparisons: [{ text: 'retained' }], gaps: [], differences: Array.from({ length: 48 }, (_, i) => ({
      case: `case-${i}`, attribution: 'reviewed-interactive-normal-line-box-stage-comparison',
      reviewEvidence: { observation: { normalizationReconciliation: { currentModuleSha256: proof.previousModuleSha256, value: 19 } } },
    })) } };
  const current = structuredClone(previous);
  for (const row of current.rows) row.attribution = visibilityObservationAttribution;
  for (const row of current.control.differences) row.reviewEvidence.observation.normalizationReconciliation.currentModuleSha256 = proof.currentModuleSha256;
  return [previous, current, structuredClone(current.rows), previousSource, currentSource];
}
test('visibility canonical comparison isolates classifications from producer-receipt changes', () => {
  const args = sample(), snapshot = structuredClone(args.slice(0, 3));
  const result = compareVisibilityCanonical(...args);
  assert.equal(result.changedGroups, 15); assert.equal(result.changedOccurrences, 530);
  assert.equal(result.controlReceiptTransition.records, 48);
  assert.deepEqual(args.slice(0, 3), snapshot);
});
test('visibility canonical comparison rejects unrelated rows, lost evidence and forged receipts', () => {
  for (const mutate of [
    ([, c]) => { c.rows.pop(); },
    ([, c]) => { c.rows.reverse(); },
    ([, c]) => { c.rows[0].reference = 'hidden'; },
    ([, c]) => { c.control.gaps.push({ reason: 'new' }); },
    ([, c]) => { c.control.comparisons[0].text = 'changed'; },
    ([, c]) => { c.control.differences.pop(); },
    ([, c]) => { c.control.differences.reverse(); },
    ([, c]) => { c.control.differences[0].reviewEvidence.observation.normalizationReconciliation.value = 20; },
    ([, c]) => { c.control.differences[0].reviewEvidence.observation.normalizationReconciliation.currentModuleSha256 = 'forged'; },
    ([, c]) => { c.control.differences[1].case = 'case-0'; },
  ]) {
    const args = sample(); mutate(args); assert.throws(() => compareVisibilityCanonical(...args));
  }
});
