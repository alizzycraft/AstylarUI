import assert from 'node:assert/strict';
import test from 'node:test';
import { conserveRootBackgroundCanonicalRows } from './root-background-canonical-conservation.mjs';
import { rootBackgroundAttribution } from './root-background-classification-preparation.mjs';

// Synthetic contract tests. Actual source population is checked by the CLI,
// not inferred from these generated rows.
function fixture() {
  const groups = Array.from({ length: 144 }, (_, i) => ({
    family: 'synthetic', element: `root-${i}`, property: 'backgroundColor',
    reference: 'fractional', astylar: 'integer', occurrences: i === 143 ? 23 : 16,
    cases: [`case-${i}`], states: ['static'], reviewedCases: [`case-${i}`],
    classification: 'application-plugin-authoring-defect', attribution: rootBackgroundAttribution,
    justification: 'synthetic', recommendedOwner: 'authoring',
    reviewEvidence: { rendererCauseProven: false, rasterDifferenceProven: false },
  }));
  const before = groups.map(({ reviewedCases, ...row }) => ({ ...row, attribution: 'unresolved' }));
  const unrelated = { family: 'other', property: 'color', occurrences: 2, attribution: 'unchanged', cases: ['a', 'b'] };
  return { before: [...before, unrelated], after: [...structuredClone(groups), structuredClone(unrelated)],
    evidence: { binding: { status: 'bound' }, coverage: { complete: true }, groups } };
}

test('canonical row conservation permits only the fully covered root classification change', () => {
  const { before, after, evidence } = fixture();
  const result = conserveRootBackgroundCanonicalRows(before, after, evidence);
  assert.equal(result.rows, 145); assert.equal(result.changedRows, 144);
  assert.equal(result.changedOccurrences, 2311); assert.equal(result.unchangedRows, 1);
  assert.equal(result.previousUnresolved, 144); assert.equal(result.currentUnresolved, 0);
  assert.equal(result.renderingEquivalent, false);
});

test('canonical row conservation rejects losses, unrelated changes and altered raw membership', () => {
  const mutations = [
    f => f.after.pop(),
    f => f.after[144].attribution = 'promoted',
    f => f.after[144].cases.reverse(),
    f => f.after[0].reference = 'equal',
    f => f.before[0].occurrences++,
    f => f.before[0].attribution = 'already-reviewed',
    f => f.after[0].reviewEvidence.rendererCauseProven = true,
    f => f.evidence.groups.pop(),
    f => f.after[1] = structuredClone(f.after[0]),
  ];
  for (const mutate of mutations) {
    const fixtureData = fixture(); mutate(fixtureData);
    assert.throws(() => conserveRootBackgroundCanonicalRows(fixtureData.before, fixtureData.after, fixtureData.evidence));
  }
});
