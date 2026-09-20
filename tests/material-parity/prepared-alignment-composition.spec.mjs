import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { inspectPreparedComposition } from '../../scripts/audit-prepared-alignment-composition.mjs';
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

function fixture() {
  const before = ['a', 'b', 'untouched'].map(element => ({ family: 'example', element, property: 'textAlign',
    reference: 'start', astylar: 'left', occurrences: 2, states: ['static', 'hover'], attribution: 'unresolved',
    referenceAuthoredExamples: [{ source: 'original', value: 'start' }] }));
  const after = structuredClone(before);
  for (const i of [0, 1]) Object.assign(after[i], { classification: 'equivalent-representation', attribution: 'reviewed',
    justification: 'bounded synthetic mechanics only', recommendedOwner: 'audit',
    reviewEvidence: { renderingEquivalent: false, rendererCauseProven: false, source: 'frozen' }, reviewedCases: ['static', 'hover'] });
  const stages = [0, 1].map(i => ({ changes: [{ family: 'example', element: before[i].element, property: 'textAlign',
    occurrences: 2, attribution: 'reviewed', previousCompleteRowSha256: digest(before[i]), projectedCompleteRowSha256: digest(after[i]) }] }));
  return { before, after, stages };
}

test('prepared classification composition preserves complete unrelated rows and combines disjoint reviewed groups', () => {
  const f = fixture(), copy = structuredClone(f), r = inspectPreparedComposition(f.before, f.after, f.stages);
  assert.equal(r.changedGroups, 2); assert.equal(r.changedObservations, 4);
  assert.equal(r.unchangedCompleteRows, 1); assert.equal(r.originalUnresolved, 3); assert.equal(r.projectedUnresolved, 1);
  assert.equal(r.unchangedOrderedRowDigestsSha256, digest([digest(f.before[2])]));
  assert.deepEqual(f, copy);
});

test('composition refuses overlapping batches, reordered/raw/foreign rows and altered reviewed results', () => {
  const changes = [
    f => { f.stages.push(structuredClone(f.stages[0])); },
    f => { f.stages.pop(); },
    f => { f.after.pop(); },
    f => { f.after.reverse(); },
    f => { f.after[2].reference = 'center'; },
    f => { f.after[0].referenceAuthoredExamples[0].value = 'left'; },
    f => { f.after[0].states.reverse(); },
    f => { f.before[0].attribution = 'already-reviewed'; },
    f => { f.after[0].justification = 'different'; },
    f => { f.stages[0].changes[0].projectedCompleteRowSha256 = '0'.repeat(64); },
    f => { f.stages[0].changes[0].occurrences++; },
    f => { f.stages[0].changes[0].element = 'different'; },
    f => { f.after[0].reviewEvidence.renderingEquivalent = true; f.stages[0].changes[0].projectedCompleteRowSha256 = digest(f.after[0]); },
  ];
  for (const [index, mutate] of changes.entries()) {
    const f = fixture(), original = structuredClone(f); mutate(f); assert.notDeepEqual(f, original);
    assert.throws(() => inspectPreparedComposition(f.before, f.after, f.stages), `mutation ${index}`);
  }
});

test('full-payload prepared composition retains all rows, all three batches and explicit non-integration scope', () => {
  const r = JSON.parse(readFileSync('docs/material-prepared-alignment-composition.json'));
  assert.equal(r.kind, 'composed-prepared-alignment-classification-dry-run');
  assert.deepEqual(r.stages.map(s => [s.name, s.changes.length]),
    [['alignment-font', 72], ['text-alignment', 49], ['direction-scoped-alignment', 4]]);
  assert.equal(r.changedGroups, 125); assert.equal(r.changedObservations, 6871);
  assert.equal(r.canonicalRows, 8339); assert.equal(r.unchangedCompleteRows, 8214);
  assert.equal(r.originalUnresolved, 1960); assert.equal(r.projectedUnresolved, 1835);
  assert.deepEqual(r.canonicalBefore, r.canonicalAfter);
  assert.deepEqual(r.canonical, JSON.parse(readFileSync('docs/material-input-equivalence-audit.json')));
  for (const flag of ['canonicalFilesChanged', 'mainBuilderIntegrated', 'inputEquivalent', 'renderingEquivalent']) assert.equal(r[flag], false);
  assert.equal(new Set(r.changes.map(c => c.previousCompleteRowSha256)).size, 125);
  assert.equal(r.changes.reduce((n, c) => n + c.occurrences, 0), 6871);
  assert.deepEqual(r.stages.map(s => s.projectedUnresolved), [1888, 1839, 1835]);
});
