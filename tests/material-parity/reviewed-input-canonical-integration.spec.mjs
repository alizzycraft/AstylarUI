import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { readReviewedProposalCanonical, replayReviewedInputProposalBinding } from '../../scripts/bind-material-reviewed-input-proposals.mjs';
import { stageReviewedInputTransitions } from './reviewed-input-proposal-transition.mjs';
import { readCaretConservationRows } from './owner-caret-canonical-conservation.mjs';
import { collectFollowupInputProposalBinding } from '../../scripts/bind-material-followup-input-proposals.mjs';
import { stageFollowupInputTransitions } from './followup-input-proposal-transition.mjs';
import { conserveIntermediateCanonicalRows } from './canonical-transition-composition.mjs';
import { replayPreparedAlignmentCanonicalTransition } from './prepared-alignment-canonical-transition.mjs';

const digest = x => createHash('sha256').update(JSON.stringify(x)).digest('hex');
const fields = new Set(['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']);
const raw = row => Object.fromEntries(Object.entries(row).filter(([key]) => !fields.has(key)));

test('canonical reviewed inputs match independently replayed full-population transitions and conserve every other complete row', async () => {
  const original = await readReviewedProposalCanonical();
  const binding = replayReviewedInputProposalBinding(original);
  const expected = stageReviewedInputTransitions(original.rows, binding);
  assert.equal(expected.changedGroups, 134); assert.equal(expected.changedObservations, 3325);
  assert.equal(expected.otherCompleteRows, 8205);
  assert.equal(expected.otherOrderedRowDigestsSha256, binding.otherOrderedRowDigestsSha256);
  // Keep the original seven-set proof intact, then account for only the exact
  // independently source-replayed later transition. It requires every original
  // complete row and cannot overwrite any of the 134 earlier classifications.
  const followupBinding = await collectFollowupInputProposalBinding();
  const intermediate = await readCaretConservationRows(file => execFileSync('git',
    ['show', `${followupBinding.canonicalRevision}:${file}`], { maxBuffer: 64 * 1024 * 1024 }));
  assert.deepEqual(intermediate.manifest, followupBinding.canonicalPayload);
  // The source-replayed transition and canonical builder insert review metadata
  // in different property order. Prove complete value equality before carrying
  // authenticated frozen serialization into the next unchanged digest guard.
  const conserved = conserveIntermediateCanonicalRows(expected.rows, intermediate.rows);
  assert.equal(conserved.serializationOnlyRows, 134);
  const finalExpected = stageFollowupInputTransitions(conserved.rows, followupBinding);
  assert.equal(finalExpected.changedGroups, 66); assert.equal(finalExpected.changedObservations, 2640);
  assert.equal(finalExpected.otherCompleteRows, 8273);
  const prepared = await replayPreparedAlignmentCanonicalTransition(finalExpected.rows);
  const current = await readCaretConservationRows(file => readFileSync(file));
  assert.equal(current.rows.length, 8339); assert.equal(current.rows.reduce((n, r) => n + r.occurrences, 0), 386891);
  assert.equal(current.rows.filter(r => r.attribution === 'unresolved').length, 1835,
    'verified proposal classifications have not all reached the canonical report');
  let changed = 0, observations = 0; const other = [];
  for (let i = 0; i < original.rows.length; i++) {
    const before = original.rows[i], after = current.rows[i], planned = prepared.rows[i];
    assert.ok(isDeepStrictEqual(after, planned), `canonical row ${i} differs from independently replayed transition: ${before.family}/${before.element}/${before.property}`);
    assert.ok(isDeepStrictEqual(raw(after), raw(before)), `raw input changed at ${i}`);
    if (isDeepStrictEqual(before, after)) other.push(after);
    else {
      assert.equal(before.attribution, 'unresolved', 'prior reviewed finding overwritten');
      changed++; observations += after.occurrences;
    }
  }
  assert.equal(changed, 325); assert.equal(observations, 12836); assert.equal(other.length, 8014);
  assert.equal(digest(other.map(digest)), digest(original.rows.filter((r, i) =>
    isDeepStrictEqual(r, prepared.rows[i])).map(digest)));
  console.log(JSON.stringify({ canonicalRows: current.rows.length, rawObservations: 386891,
    changedGroups: changed, changedObservations: observations, otherCompleteRows: other.length,
    otherOrderedRowDigestsSha256: digest(other.map(digest)), remainingUnresolved: 1835,
    originalReviewedGroups: expected.changedGroups, independentlyVerifiedFollowupGroups: finalExpected.changedGroups,
    intermediateSerializationOnlyRows: conserved.serializationOnlyRows,
    currentCanonicalManifest: current.manifest, inputEquivalent: false, renderingEquivalent: false,
    limitation: 'Authenticates every current/frozen payload byte and compares every complete discrepancy against independently replayed sources and the reviewed metadata transition. Fresh builder/report equivalence requires the separate canonical CLI --check; full enforced rendering acceptance remains separate.' }));
});
