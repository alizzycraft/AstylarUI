import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';
import test from 'node:test';
import { replayPreparedAlignmentCanonicalTransition, readPreparedAlignmentClassificationBoundary,
  preparedAlignmentClassificationRevision } from './prepared-alignment-canonical-transition.mjs';

test('canonical prepared alignment matches all 125 source-replayed groups and conserves every other complete row', async () => {
  const expected = await replayPreparedAlignmentCanonicalTransition();
  const current = await readPreparedAlignmentClassificationBoundary();
  assert.equal(current.rows.length, 8339);
  assert.equal(current.rows.reduce((n, r) => n + r.occurrences, 0), 386891);
  assert.equal(current.rows.filter(r => r.attribution === 'unresolved').length, 1835);
  for (let i = 0; i < current.rows.length; i++) assert.ok(isDeepStrictEqual(current.rows[i], expected.rows[i]),
    `prepared canonical transition differs at row ${i}: ${current.rows[i].family}/${current.rows[i].element}/${current.rows[i].property}`);
  console.log(JSON.stringify({ groups: expected.proof.changedGroups, observations: expected.proof.changedObservations,
    unchangedCompleteRows: expected.proof.unchangedCompleteRows, unchangedOrderedRowDigestsSha256: expected.proof.unchangedOrderedRowDigestsSha256,
    remainingUnresolved: 1835, historicalClassificationRevision: preparedAlignmentClassificationRevision,
    historicalCanonicalManifest: current.manifest, inputEquivalent: false, renderingEquivalent: false,
    limitation: 'Historical complete-row conservation. Current retained membership and normalization population have separate enforced tests in reviewed-input-canonical-integration.spec.mjs; later classifications and final acceptance remain separate.' }));
});
