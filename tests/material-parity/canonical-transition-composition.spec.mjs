import assert from 'node:assert/strict';
import test from 'node:test';
import { conserveIntermediateCanonicalRows } from './canonical-transition-composition.mjs';

function fixture() {
  const expected = [
    { family: 'example', element: 'label', property: 'fontSize', reference: '16px',
      attribution: 'reviewed', occurrences: 2, states: ['static', 'hover'],
      reviewEvidence: { inputEquivalent: false, source: { file: 'proof', sha256: 'original' } },
      referenceAuthoredExamples: [{ rule: '.label', value: 'inherit' }] },
    { family: 'example', element: 'other', property: 'width', reference: 'auto', attribution: 'unresolved' },
  ];
  const frozen = structuredClone(expected);
  frozen[0] = Object.fromEntries(Object.entries(frozen[0]).reverse());
  frozen[0].reviewEvidence.source = { sha256: 'original', file: 'proof' };
  return { expected, frozen };
}

test('intermediate composition preserves authenticated serialization only after complete ordered value equality', () => {
  const f = fixture(), before = structuredClone(f);
  const result = conserveIntermediateCanonicalRows(f.expected, f.frozen);
  assert.equal(result.serializationOnlyRows, 1);
  assert.equal(JSON.stringify(result.rows), JSON.stringify(f.frozen));
  assert.deepEqual(result.rows, f.expected);
  assert.deepEqual(f, before);
  result.rows[0].reviewEvidence.source.file = 'later mutation';
  assert.deepEqual(f, before, 'returned rows must not mutate either source');
  assert.equal(conserveIntermediateCanonicalRows(f.expected, f.expected).serializationOnlyRows, 0);
});

test('intermediate composition refuses raw evidence, attribution, membership and order changes', () => {
  const mutations = [
    f => { f.frozen.pop(); },
    f => { f.frozen.reverse(); },
    f => { f.frozen[1] = structuredClone(f.frozen[0]); },
    f => { f.frozen[0].reference = '17px'; },
    f => { f.frozen[0].astylar = null; },
    f => { f.frozen[0].occurrences--; },
    f => { f.frozen[0].states.reverse(); },
    f => { f.frozen[0].attribution = 'unresolved'; },
    f => { f.frozen[0].reviewEvidence.inputEquivalent = true; },
    f => { f.frozen[0].reviewEvidence.source.sha256 = 'different'; },
    f => { f.frozen[0].referenceAuthoredExamples[0].value = '16px'; },
    f => { delete f.frozen[0].reviewEvidence.source.file; },
    f => { f.frozen[0].unexpected = true; },
  ];
  for (const [index, mutate] of mutations.entries()) {
    const f = fixture(); mutate(f);
    assert.throws(() => conserveIntermediateCanonicalRows(f.expected, f.frozen),
      /intermediate canonical row/, `changed-evidence mutation ${index}`);
  }
  assert.equal(mutations.length, 13);
});
