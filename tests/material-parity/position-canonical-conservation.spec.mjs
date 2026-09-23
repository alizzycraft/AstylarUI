import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { comparePositionCanonical } from '../../scripts/check-material-position-canonical-conservation.mjs';
import { restorePositionProducer } from './position-composition-producer-transition.mjs';
import { positionCompositionAttribution } from './position-composition-review.mjs';
import { positionFollowupAttribution } from './position-followup-review.mjs';
const currentSource = readFileSync('tests/material-parity/input-equivalence-audit.mjs');
function sample(followupOnly = false) {
  const proof = restorePositionProducer(currentSource, { followupOnly });
  const previous = { rows: Array.from({ length: followupOnly ? 14 : 6 }, (_, i) => ({ family: 'fixture', element: `owner-${i}`,
    occurrences: followupOnly ? (i === 0 ? 53 : 55) : (i === 0 ? 56 : 52), attribution: 'unresolved', reference: 'static' })),
    control: { comparisons: [{ text: 'retained' }], gaps: [], differences: Array.from({ length: 48 }, (_, i) => ({
      case: `case-${i}`, attribution: 'reviewed-interactive-normal-line-box-stage-comparison',
      reviewEvidence: { observation: { normalizationReconciliation: { currentModuleSha256: proof.previousModuleSha256, value: 19 } } },
    })) } };
  const current = structuredClone(previous);
  for (const row of current.rows) row.attribution = followupOnly ? positionFollowupAttribution : positionCompositionAttribution;
  for (const row of current.control.differences) row.reviewEvidence.observation.normalizationReconciliation.currentModuleSha256 = proof.currentModuleSha256;
  return [previous, current, structuredClone(current.rows), currentSource, { followupOnly }];
}

test('followup comparison isolates fourteen classifications against the six-group predecessor', () => {
  const args = sample(true), before = structuredClone(args.slice(0, 3));
  const result = comparePositionCanonical(...args);
  assert.equal(result.changedGroups, 14); assert.equal(result.changedOccurrences, 768);
  assert.equal(result.controlReceiptTransition.records, 48);
  assert.deepEqual(args.slice(0, 3), before);
  assert.throws(() => comparePositionCanonical(...args.slice(0, 4)));
});
test('position comparison isolates six classifications and producer-receipt updates without mutation', () => {
  const args = sample(), before = structuredClone(args.slice(0, 3));
  const result = comparePositionCanonical(...args);
  assert.equal(result.changedGroups, 6); assert.equal(result.changedOccurrences, 316);
  assert.equal(result.controlReceiptTransition.records, 48);
  assert.deepEqual(args.slice(0, 3), before);
});
test('position comparison rejects lost or changed evidence and forged source receipts', () => {
  for (const mutate of [
    ([, c]) => c.rows.pop(), ([, c]) => c.rows.reverse(),
    ([, c]) => { c.rows[0].reference = 'absolute'; },
    ([, c]) => c.control.gaps.push({ reason: 'new' }),
    ([, c]) => { c.control.comparisons[0].text = 'changed'; },
    ([, c]) => c.control.differences.pop(), ([, c]) => c.control.differences.reverse(),
    ([, c]) => { c.control.differences[0].reviewEvidence.observation.normalizationReconciliation.value = 20; },
    ([, c]) => { c.control.differences[0].reviewEvidence.observation.normalizationReconciliation.currentModuleSha256 = 'forged'; },
    ([, c]) => { c.control.differences[1].case = 'case-0'; },
  ]) for (const followupOnly of [false, true]) {
    const args = sample(followupOnly); mutate(args); assert.throws(() => comparePositionCanonical(...args));
  }
});
