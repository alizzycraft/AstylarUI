import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import test from 'node:test';
import { readCaretConservationRows } from './owner-caret-canonical-conservation.mjs';
import { replayPreparedAlignmentCanonicalTransition } from './prepared-alignment-canonical-transition.mjs';

test('canonical prepared alignment matches all 125 source-replayed groups and conserves every other complete row', async () => {
  const expected = await replayPreparedAlignmentCanonicalTransition();
  const current = await readCaretConservationRows(readFileSync);
  assert.equal(current.rows.length, 8339);
  assert.equal(current.rows.reduce((n, r) => n + r.occurrences, 0), 386891);
  assert.equal(current.rows.filter(r => r.attribution === 'unresolved').length, 1835);
  for (let i = 0; i < current.rows.length; i++) assert.ok(isDeepStrictEqual(current.rows[i], expected.rows[i]),
    `prepared canonical transition differs at row ${i}: ${current.rows[i].family}/${current.rows[i].element}/${current.rows[i].property}`);
  console.log(JSON.stringify({ groups: expected.proof.changedGroups, observations: expected.proof.changedObservations,
    unchangedCompleteRows: expected.proof.unchangedCompleteRows, unchangedOrderedRowDigestsSha256: expected.proof.unchangedOrderedRowDigestsSha256,
    remainingUnresolved: 1835, inputEquivalent: false, renderingEquivalent: false }));
});
