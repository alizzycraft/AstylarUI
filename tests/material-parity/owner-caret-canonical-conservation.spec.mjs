import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { readCaretConservationRows, conserveOwnerCaretCanonicalRows } from './owner-caret-canonical-conservation.mjs';
import { ownerCaretAttributions } from './owner-caret-classification.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
function fixture() {
  const old = (element, occurrences = 1) => ({ family: 'fixture', element, property: 'caretColor',
    propertyGroup: 'interaction', reference: 'rgba(1,2,3,1)', occurrences,
    cases: Array.from({ length: Math.min(12, occurrences) }, (_, n) => `case-${element}-${n}`), states: ['static'],
    classification: 'unresolved', attribution: 'unresolved', justification: 'needs review', recommendedOwner: 'unknown',
    referenceAuthoredExamples: [{ caretColor: 'auto' }], astylarAuthoredExamples: [{ color: '#010203' }],
    additionalEvidence: { retained: true } });
  const previous = [old('a', 14), old('b'), old('pending', 2), { ...old('other', 4), property: 'width',
    classification: 'application-plugin-authoring-defect', attribution: 'existing-reviewed', astylar: '30px' }];
  const reviewed = (row, attribution) => ({ family: row.family, element: row.element, property: row.property,
    reference: row.reference, occurrences: row.occurrences, cases: row.cases, states: row.states,
    reviewedCases: Array.from({ length: row.occurrences }, (_, n) => `case-${row.element}-${n}`),
    classification: 'parity-harness-defect', attribution, justification: 'source-bound observation stages',
    recommendedOwner: 'observation boundary', reviewEvidence: { proofSha256: 'a'.repeat(64),
      inputEquivalent: false, computedCandidateVerified: false, descendantCaretVerified: false,
      renderingEquivalent: false, rendererCauseProven: false, wholeElementInputEquivalent: false } });
  const rows = [reviewed(previous[0], ownerCaretAttributions.local), reviewed(previous[1], ownerCaretAttributions.motion)];
  const expected = { rows, pending: [{ family: 'fixture', element: 'pending', property: 'caretColor',
    reference: previous[2].reference, occurrences: 2, cases: previous[2].cases, states: ['static'] }],
    reviewedGroups: 2, reviewedObservations: 15, pendingGroups: 1, pendingObservations: 2,
    inputEquivalent: false, renderingEquivalent: false };
  const current = [0, 1].map(i => ({ ...previous[i], ...rows[i] })).concat(structuredClone(previous.slice(2)));
  return { previous: structuredClone(previous), current: structuredClone(current), expected: structuredClone(expected) };
}
const check = x => conserveOwnerCaretCanonicalRows(x.previous, x.current, x.expected);

test('caret canonical conservation preserves every raw authored and unrelated field', () => {
  const x = fixture(), before = JSON.stringify(x), result = check(x);
  assert.equal(JSON.stringify(x), before);
  assert.deepEqual([result.scalarRows, result.observations, result.changedRows, result.changedObservations,
    result.unchangedCompleteRows, result.previousUnresolved, result.currentUnresolved], [4, 21, 2, 15, 2, 3, 1]);
  assert.equal(result.pendingGroups, 1); assert.equal(result.pendingObservations, 2);
  assert.equal(result.inputEquivalent, false); assert.equal(result.renderingEquivalent, false);
  assert.equal(result.changes.length, 2);
  // Serialized canonical absence must stay absence, not a fabricated default.
  assert.deepEqual(check(JSON.parse(JSON.stringify(x))), result);
});

test('caret canonical conservation rejects lost rows changed inputs and unreviewed promotions', () => {
  const mutations = [
    x => x.current.pop(), x => x.current.reverse(), x => x.current.push(structuredClone(x.current[0])),
    x => { x.current[0].astylar = 'auto'; }, x => { x.current[0].astylar = '<omitted>'; },
    x => { x.current[0].astylar = undefined; }, x => { x.current[0].reference = 'red'; },
    x => { x.current[0].occurrences--; }, x => { x.current[0].cases.pop(); }, x => { x.current[0].states.push('hover'); },
    x => { x.current[0].referenceAuthoredExamples[0].caretColor = 'red'; },
    x => { x.current[0].astylarAuthoredExamples[0].color = 'red'; },
    x => { x.current[0].additionalEvidence.retained = false; },
    x => { x.current[0].reviewedCases[13] = x.current[0].reviewedCases[12]; },
    x => { x.current[0].attribution = 'unresolved'; },
    x => { x.current[0].reviewEvidence.proofSha256 = 'b'.repeat(64); },
    x => { x.current[0].reviewEvidence.inputEquivalent = true; x.expected.rows[0].reviewEvidence.inputEquivalent = true; },
    x => { x.previous[0].attribution = 'earlier-reviewed'; },
    x => { x.current[2].attribution = ownerCaretAttributions.local; },
    x => { x.current[3].justification = 'different'; },
    x => { x.expected.reviewedGroups--; }, x => { x.expected.reviewedObservations--; },
    x => { x.expected.pending[0].occurrences--; x.expected.pendingObservations--; },
    x => { x.previous = structuredClone(x.current); },
  ];
  for (const [n, mutate] of mutations.entries()) {
    const x = fixture(); mutate(x); assert.throws(() => check(x), `mutation ${n}`);
  }
  assert.equal(mutations.length, 24);
});

function encode(text) {
  const raw = Buffer.from(text), payload = gzipSync(raw);
  return { payload, manifest: { format: 'astylar-material-input-audit-gzip', formatVersion: 1, auditSchemaVersion: 1,
    payload: 'material-input-equivalence-audit.json.gz', encoding: 'utf-8', compression: 'gzip',
    compressedBytes: payload.length, compressedSha256: hash(payload),
    uncompressedBytes: raw.length, uncompressedSha256: hash(raw) } };
}
const reader = data => file => {
  if (file === 'docs/material-input-equivalence-audit.json') return Buffer.from(JSON.stringify(data.manifest));
  assert.equal(file, 'docs/material-input-equivalence-audit.json.gz'); return data.payload;
};

test('caret conservation reader authenticates full bytes while retaining complete ordered rows', async () => {
  const rows = fixture().current;
  const data = encode(JSON.stringify({ schemaVersion: 1, otherLedger: { records: ['ignored', { deep: true }] },
    discrepancies: rows, laterLedger: { captured: [1, 2, 3] } }) + '\n');
  const result = await readCaretConservationRows(reader(data));
  assert.deepEqual(result, { manifest: data.manifest, rows });
});

test('caret conservation reader rejects altered receipts malformed payloads and lost rows array', async () => {
  const mutations = [
    x => { x.manifest.compressedSha256 = '0'.repeat(64); }, x => { x.manifest.compressedBytes++; },
    x => { x.manifest.uncompressedSha256 = '0'.repeat(64); }, x => { x.manifest.uncompressedBytes++; },
    x => { x.manifest.auditSchemaVersion = 2; }, x => { x.manifest.payload = '../outside.gz'; },
    x => { x.manifest.extra = 'unreviewed'; }, x => { x.payload[10] ^= 1; },
  ];
  for (const [n, mutate] of mutations.entries()) {
    const x = encode(JSON.stringify({ schemaVersion: 1, discrepancies: fixture().current })); mutate(x);
    await assert.rejects(readCaretConservationRows(reader(x)), `receipt mutation ${n}`);
  }
  for (const text of ['{"schemaVersion":1}', '{"schemaVersion":1,"discrepancies":{}}',
    '{"schemaVersion":1,"discrepancies":[null]}', '{"schemaVersion":1,"discrepancies":[]',
    '{"schemaVersion":1,"discrepancies":[],"discrepancies":[]}',
    '{"schemaVersion":1,"discrepancies":[]} {"schemaVersion":1,"discrepancies":[]}'])
    await assert.rejects(readCaretConservationRows(reader(encode(text))));
});
