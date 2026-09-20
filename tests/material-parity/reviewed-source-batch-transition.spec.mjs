import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { isDeepStrictEqual } from 'node:util';
import test from 'node:test';
import { readCaretConservationRows } from './owner-caret-canonical-conservation.mjs';
import { stageReviewedSourceBatch } from './reviewed-source-batch-transition.mjs';

const digest = x => createHash('sha256').update(JSON.stringify(x)).digest('hex');
const metadata = new Set(['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']);
const raw = row => Object.fromEntries(Object.entries(row).filter(([key]) => !metadata.has(key)));
const plan = JSON.parse(readFileSync('docs/material-reviewed-source-batch.json'));
let pending;
const baseline = () => pending ??= readCaretConservationRows(readFileSync);

test('prepared source batch changes only 146 reviewed metadata rows and preserves every other complete row', async () => {
  const original = await baseline();
  assert.deepEqual(original.manifest, plan.canonicalPayload);
  const before = digest(original.rows), result = stageReviewedSourceBatch(original.rows, plan);
  assert.equal(result.changedGroups, 146); assert.equal(result.changedObservations, 6295);
  assert.equal(result.unchangedCompleteRows, 8193);
  assert.equal(result.unchangedOrderedRowDigestsSha256,
    '8c924d71e7da9ec5c7335f319fc395f27359b189dfbf55624e7d752184a7e18c');
  assert.equal(result.previousUnresolved, 1835); assert.equal(result.projectedUnresolved, 1689);
  assert.equal(digest(original.rows), before, 'transition mutated original rows');
  const changed = new Set(result.changes.map(g => g.previousCompleteRowSha256));
  let previouslyReviewed = 0;
  for (let i = 0; i < original.rows.length; i++) {
    const old = original.rows[i], current = result.rows[i];
    assert.ok(isDeepStrictEqual(raw(current), raw(old)), `raw input changed at ${i}`);
    if (!changed.has(digest(old))) assert.equal(current, old, 'unchanged rows must preserve identity and all fields');
    else {
      assert.equal(old.attribution, 'unresolved');
      assert.equal(current.reviewedCases.length, old.occurrences);
      for (const flag of ['inputEquivalent', 'wholeElementInputEquivalent', 'computedCandidateVerified',
        'cascadeWinnerProven', 'inactiveMotionProven', 'renderingEquivalent', 'rendererCauseProven',
        'compensationNecessityProven']) assert.equal(current.reviewEvidence[flag], false);
    }
    if (old.attribution !== 'unresolved') { assert.equal(current, old); previouslyReviewed++; }
  }
  assert.equal(previouslyReviewed, 6504);
  assert.equal(result.sourceProofsReplayedByTransition, false);
  console.log(JSON.stringify({ changedGroups: result.changedGroups, changedObservations: result.changedObservations,
    unchangedCompleteRows: result.unchangedCompleteRows, unchangedOrderedRowDigestsSha256: result.unchangedOrderedRowDigestsSha256,
    previousUnresolved: result.previousUnresolved, projectedUnresolved: result.projectedUnresolved,
    previousClassificationsPreserved: previouslyReviewed, canonicalFilesChanged: false }));
});

test('transition rejects mutated plans, original rows, unrelated rows, duplication and reapplication', async () => {
  const { rows } = await baseline();
  const selected = rows.findIndex(r => digest(r) === plan.findings[0].canonicalRowSha256);
  const other = rows.findIndex(r => !plan.findings.some(g => g.canonicalRowSha256 === digest(r)));
  const rowMutations = [
    copy => { copy[selected] = { ...copy[selected], reference: 'changed' }; },
    copy => { copy[selected] = { ...copy[selected], recommendedOwner: 'changed' }; },
    copy => { copy[selected] = { ...copy[selected], cases: [...copy[selected].cases].reverse() }; },
    copy => { copy[other] = { ...copy[other], justification: 'changed unrelated row' }; },
    copy => { [copy[other], copy[other + 1]] = [copy[other + 1], copy[other]]; },
    copy => { copy[other] = copy[selected]; },
    copy => { copy.pop(); },
  ];
  for (const change of rowMutations) {
    const copy = [...rows]; change(copy); assert.throws(() => stageReviewedSourceBatch(copy, plan));
  }
  const planMutations = [
    copy => { copy.findings[0].classification = 'confirmed-core-renderer-defect'; },
    copy => { copy.findings[0].inputEquivalent = true; },
    copy => { copy.findings[0].cases.pop(); },
    copy => { copy.sourceReportsFreshlyReplayed = false; },
    copy => { copy.otherOrderedRowDigestsSha256 = 'forged'; },
  ];
  for (const change of planMutations) {
    const copy = structuredClone(plan); change(copy); assert.throws(() => stageReviewedSourceBatch(rows, copy));
  }
  assert.throws(() => stageReviewedSourceBatch(stageReviewedSourceBatch(rows, plan).rows, plan));
  console.log(JSON.stringify({ rejectionControls: rowMutations.length + planMutations.length + 1 }));
});

test('transition input plan still freshly replays all source proofs and the complete pinned canonical join without writes', () => {
  const guard = `import fs from 'node:fs';import{syncBuiltinESMExports}from'node:module';
    fs.writeFileSync=()=>{throw Error('CHECK_MODE_ATTEMPTED_WRITE')};syncBuiltinESMExports();`;
  const result = JSON.parse(execFileSync(process.execPath, ['--max-old-space-size=1536', '--import',
    'data:text/javascript;base64,' + Buffer.from(guard).toString('base64'),
    'scripts/prepare-material-reviewed-source-batch.mjs', '--check'], { encoding: 'utf8', maxBuffer: 1024 * 1024 }));
  assert.equal(result.groups, 146); assert.equal(result.observations, 6295);
  assert.equal(result.baselineUnresolved, 1835); assert.equal(result.otherCompleteRows, 8193);
});
