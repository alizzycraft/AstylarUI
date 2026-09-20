import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { collectFollowupInputProposalBinding } from '../../scripts/bind-material-followup-input-proposals.mjs';
import { stageFollowupInputTransitions } from './followup-input-proposal-transition.mjs';
import { readCaretConservationRows } from './owner-caret-canonical-conservation.mjs';
import { replayPreparedAlignmentCanonicalTransition } from './prepared-alignment-canonical-transition.mjs';

const digest = x => createHash('sha256').update(JSON.stringify(x)).digest('hex');
const fields = new Set(['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']);
const raw = row => Object.fromEntries(Object.entries(row).filter(([key]) => !fields.has(key)));

test('canonical followup findings match full source-replayed transitions and preserve all other complete rows', async () => {
  const binding = await collectFollowupInputProposalBinding();
  const original = await readCaretConservationRows(file => execFileSync('git',
    ['show', `${binding.canonicalRevision}:${file}`], { maxBuffer: 64 * 1024 * 1024 }));
  assert.deepEqual(original.manifest, binding.canonicalPayload);
  const expected = stageFollowupInputTransitions(original.rows, binding);
  const prepared = await replayPreparedAlignmentCanonicalTransition(expected.rows);
  const current = await readCaretConservationRows(file => readFileSync(file));
  assert.equal(current.rows.length, 8339);
  assert.equal(current.rows.reduce((n, r) => n + r.occurrences, 0), 386891);
  assert.equal(current.rows.filter(r => r.attribution === 'unresolved').length, 1835);
  let changed = 0, observations = 0; const other = [];
  for (let i = 0; i < original.rows.length; i++) {
    const before = original.rows[i], after = current.rows[i];
    assert.ok(isDeepStrictEqual(after, prepared.rows[i]),
      `canonical row ${i} differs from original-source transition: ${before.family}/${before.element}/${before.property}`);
    assert.ok(isDeepStrictEqual(raw(after), raw(before)), `raw input changed at ${i}`);
    if (isDeepStrictEqual(before, after)) other.push(after);
    else { assert.equal(before.attribution, 'unresolved'); changed++; observations += after.occurrences; }
  }
  assert.equal(expected.changedGroups, 66); assert.equal(expected.changedObservations, 2640);
  assert.equal(expected.otherOrderedRowDigestsSha256, binding.otherOrderedRowDigestsSha256);
  assert.equal(changed, 191); assert.equal(observations, 9511); assert.equal(other.length, 8148);
  assert.equal(digest(other.map(digest)), digest(original.rows.filter((r, i) => isDeepStrictEqual(r, prepared.rows[i])).map(digest)));
  console.log(JSON.stringify({ canonicalRows: current.rows.length, rawObservations: 386891,
    changedGroups: changed, changedObservations: observations, otherCompleteRows: other.length,
    otherOrderedRowDigestsSha256: digest(other.map(digest)), remainingUnresolved: 1835,
    currentCanonicalManifest: current.manifest, inputEquivalent: false, renderingEquivalent: false }));
});
