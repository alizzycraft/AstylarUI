import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
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

function chipSample() {
  const args = sample(), [previous, current] = args;
  const previousSource = execFileSync('git', ['show', '2a35d34:tests/material-parity/input-equivalence-audit.mjs'], { maxBuffer: 4 * 1024 * 1024 });
  previous.rows = Array.from({ length: 10 }, (_, i) => ({ family: 'chips', element: `chip-${i}`,
    occurrences: i === 0 ? 5 : 3, attribution: 'unresolved', reference: 'rgba(0,0,0,0)' }));
  current.rows = previous.rows.map(row => ({ ...row, attribution: 'reviewed-chip-state-layer-substitution' }));
  const oldHash = createHash('sha256').update(previousSource.toString('utf8').replaceAll('\r\n', '\n')).digest('hex');
  for (const row of previous.control.differences) row.reviewEvidence.observation.normalizationReconciliation.currentModuleSha256 = oldHash;
  return [previous, current, structuredClone(current.rows), currentSource, { chipOnly: true, previousSource }];
}

function overlaySample() {
  const [previous, current] = sample();
  const previousSource = execFileSync('git', ['show', '72f849a:tests/material-parity/input-equivalence-audit.mjs'], { maxBuffer: 4 * 1024 * 1024 });
  previous.rows = Array.from({ length: 13 }, (_, i) => ({ family: i < 8 ? 'snack-bar' : 'tooltip', element: `surface-${i}`,
    occurrences: i < 8 ? 34 : [16, 2, 18, 18, 18][i - 8], attribution: 'unresolved', reference: 'original' }));
  current.rows = previous.rows.map((row, i) => ({ ...row, attribution: i < 8
    ? 'reviewed-snackbar-surface-input-substitution' : 'reviewed-tooltip-sizing-constraint-omission' }));
  const oldHash = createHash('sha256').update(previousSource.toString('utf8').replaceAll('\r\n', '\n')).digest('hex');
  for (const row of previous.control.differences) row.reviewEvidence.observation.normalizationReconciliation.currentModuleSha256 = oldHash;
  return [previous, current, structuredClone(current.rows), currentSource, { overlayOnly: true, previousSource }];
}

test('overlay batch conserves thirteen groups and rejects unrelated row or producer changes', () => {
  const args = overlaySample(), before = structuredClone(args.slice(0, 3));
  const result = comparePositionCanonical(...args);
  assert.equal(result.changedGroups, 13); assert.equal(result.changedOccurrences, 344);
  assert.equal(result.controlReceiptTransition.records, 48);
  assert.deepEqual(args.slice(0, 3), before);
  for (const mutate of [
    ([, c]) => c.rows.pop(), ([, c]) => { c.rows[0].reference = 'changed'; },
    ([, c]) => c.control.gaps.push({ reason: 'unrelated' }),
    ([, c]) => { c.control.differences[0].reviewEvidence.observation.normalizationReconciliation.value++; },
    a => { a[4].previousSource = Buffer.from(a[4].previousSource + '\nconst unrelated = true;'); },
    a => { a[4].previousSource = currentSource; }, a => { a[4].chipOnly = true; },
  ]) { const changed = overlaySample(); mutate(changed); assert.throws(() => comparePositionCanonical(...changed)); }
});

test('chip comparison reuses strict row and 48 control-receipt conservation', () => {
  const args = chipSample(), original = structuredClone(args.slice(0, 3));
  const result = comparePositionCanonical(...args);
  assert.equal(result.changedGroups, 10); assert.equal(result.changedOccurrences, 32);
  assert.equal(result.controlReceiptTransition.records, 48);
  assert.deepEqual(args.slice(0, 3), original);
  for (const mutate of [
    ([, c]) => c.rows.pop(),
    ([, c]) => { c.rows[0].reference = 'changed'; },
    ([, c]) => c.control.gaps.push({ reason: 'unrelated' }),
    ([, c]) => { c.control.differences[0].reviewEvidence.observation.normalizationReconciliation.value++; },
    a => { a[4].previousSource = Buffer.from(a[4].previousSource + '\nconst unreviewed = true;'); },
    a => { a[4].previousSource = currentSource; },
    a => { a[4].followupOnly = true; },
  ]) { const changed = chipSample(); mutate(changed); assert.throws(() => comparePositionCanonical(...changed)); }
});

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
