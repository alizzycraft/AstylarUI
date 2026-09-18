import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { readReviewedProposalCanonical, replayReviewedInputProposalBinding } from '../../scripts/bind-material-reviewed-input-proposals.mjs';
import { stageReviewedInputTransitions } from './reviewed-input-proposal-transition.mjs';
import { readCaretConservationRows } from './owner-caret-canonical-conservation.mjs';

const digest = x => createHash('sha256').update(JSON.stringify(x)).digest('hex');
const fields = new Set(['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']);
const raw = row => Object.fromEntries(Object.entries(row).filter(([key]) => !fields.has(key)));

test('canonical reviewed inputs match independently replayed full-population transitions and conserve every other complete row', async () => {
  const original = await readReviewedProposalCanonical();
  const binding = replayReviewedInputProposalBinding(original);
  const expected = stageReviewedInputTransitions(original.rows, binding);
  const current = await readCaretConservationRows(file => readFileSync(file));
  assert.equal(current.rows.length, 8339); assert.equal(current.rows.reduce((n, r) => n + r.occurrences, 0), 386891);
  assert.equal(current.rows.filter(r => r.attribution === 'unresolved').length, 2026,
    'verified proposal classifications have not all reached the canonical report');
  let changed = 0, observations = 0; const other = [];
  for (let i = 0; i < original.rows.length; i++) {
    const before = original.rows[i], after = current.rows[i], planned = expected.rows[i];
    assert.ok(isDeepStrictEqual(after, planned), `canonical row ${i} differs from independently replayed transition: ${before.family}/${before.element}/${before.property}`);
    assert.ok(isDeepStrictEqual(raw(after), raw(before)), `raw input changed at ${i}`);
    if (isDeepStrictEqual(before, after)) other.push(after);
    else {
      assert.equal(before.attribution, 'unresolved', 'prior reviewed finding overwritten');
      changed++; observations += after.occurrences;
    }
  }
  assert.equal(changed, 134); assert.equal(observations, 3325); assert.equal(other.length, 8205);
  assert.equal(digest(other.map(digest)), binding.otherOrderedRowDigestsSha256);
  console.log(JSON.stringify({ canonicalRows: current.rows.length, rawObservations: 386891,
    changedGroups: changed, changedObservations: observations, otherCompleteRows: other.length,
    otherOrderedRowDigestsSha256: digest(other.map(digest)), remainingUnresolved: 2026,
    currentCanonicalManifest: current.manifest, inputEquivalent: false, renderingEquivalent: false,
    limitation: 'Authenticates every current/frozen payload byte and compares every complete discrepancy against independently replayed sources and the reviewed metadata transition. Fresh builder/report equivalence requires the separate canonical CLI --check; full enforced rendering acceptance remains separate.' }));
});
