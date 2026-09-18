import assert from 'node:assert/strict';
import test from 'node:test';
import { assertCaretClassificationDelta, assertLaterCaretClassifications, gapScalarProjection } from './owner-gap-integration-conservation.mjs';
import { ownerCaretAttributions } from './owner-caret-classification.mjs';

function fixture() {
  const base = element => ({ family: 'fixture', element, property: 'caretColor', reference: 'rgba(1,2,3,1)',
    astylar: undefined, occurrences: 1, cases: ['case'], states: ['static'], classification: 'parity-harness-defect',
    attribution: 'unresolved', justification: 'unreviewed', recommendedOwner: 'unknown',
    referenceAuthoredExamples: [{ color: 'red' }], astylarAuthoredExamples: [{}], extra: { retained: true } });
  const previous = [base('reviewed'), base('pending')];
  const current = structuredClone(previous);
  Object.assign(current[0], { attribution: ownerCaretAttributions.local, justification: 'reviewed', recommendedOwner: 'observation',
    reviewedCases: ['case'], reviewEvidence: { inputEquivalent: false, computedCandidateVerified: false,
      descendantCaretVerified: false, renderingEquivalent: false, rendererCauseProven: false, wholeElementInputEquivalent: false } });
  const expected = { rows: [structuredClone(current[0])], pending: [structuredClone(previous[1])],
    reviewedGroups: 1, reviewedObservations: 1, pendingGroups: 1, pendingObservations: 1,
    inputEquivalent: false, renderingEquivalent: false };
  return { previous, current, expected };
}
const check = f => assertCaretClassificationDelta(f.previous, f.current, f.expected);

test('later caret delta identifies only independently reviewed signatures and preserves pending rows', () => {
  const f = fixture(), before = structuredClone(f);
  assert.deepEqual([...check(f)], [JSON.stringify(gapScalarProjection(f.current[0]))]);
  assert.deepEqual(f, before);
  // Other later findings remain the outer integration test's responsibility.
  const noReview = { previous: [f.previous[1]], current: [f.current[1]], expected: { ...f.expected,
    rows: [], reviewedGroups: 0, reviewedObservations: 0 } };
  assert.equal(check(noReview).size, 0);
});

test('later caret delta rejects lost membership changed raw fields and unreviewed promotions', () => {
  const mutations = [
    f => f.current.shift(), f => f.current.push(structuredClone(f.current[0])),
    f => { f.current[0].attribution = 'unresolved'; }, f => { f.current[0].reference = 'blue'; },
    f => { f.current[0].astylar = 'auto'; }, f => { delete f.current[0].astylar; },
    f => { f.current[0].referenceAuthoredExamples[0].color = 'blue'; },
    f => { f.current[0].astylarAuthoredExamples[0].color = 'red'; },
    f => { f.current[0].extra.retained = false; }, f => { f.current[0].cases = ['other']; },
    f => { f.current[0].reviewedCases = []; }, f => { f.current[0].occurrences++; },
    f => { f.previous[0].attribution = 'earlier-reviewed'; },
    f => { f.current[1].attribution = 'other'; }, f => { f.current.pop(); },
    f => { f.expected.rows[0].reviewEvidence.inputEquivalent = f.current[0].reviewEvidence.inputEquivalent = true; },
    f => { f.expected.reviewedGroups++; }, f => { f.expected.pendingObservations++; },
  ];
  for (const [i, mutate] of mutations.entries()) { const f = fixture(); mutate(f); assert.throws(() => check(f), `mutation ${i}`); }
  assert.equal(mutations.length, 18);
});

test('historical caret wrapper cannot accept rows without authenticated captured-source replay', () => {
  const f = fixture();
  for (const evidence of [undefined, { binding: { status: 'unbound' } }, { binding: { status: 'bound' }, plannedCoverage: f.expected }])
    assert.throws(() => assertLaterCaretClassifications({ discrepancies: f.current, ownerCaretInputs: evidence }, { discrepancies: f.previous }));
});
