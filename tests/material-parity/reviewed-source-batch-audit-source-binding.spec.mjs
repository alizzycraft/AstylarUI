import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { isDeepStrictEqual } from 'node:util';
import test from 'node:test';
import { collectReviewedSourceBatchAuditInputs, validateReviewedSourceBatchAuditInputs,
  reviewedSourceBatchClassificationContexts, classifyReviewedSourceBatchInput,
  validateReviewedSourceBatchClassifications, stageReviewedSourceBatchAuditTransitions,
  projectReviewedSourceBatchAuditInputs } from './reviewed-source-batch-audit-source-binding.mjs';
import { replayReviewedSourceBatchObservations } from './reviewed-source-batch-observation-binding.mjs';
import { stageReviewedSourceBatch } from './reviewed-source-batch-transition.mjs';
import { readCaretConservationRows } from './owner-caret-canonical-conservation.mjs';

const digest = x => createHash('sha256').update(JSON.stringify(x)).digest('hex');
const capture = 'artifacts/material-parity/current-ancestry-audit/latest-report.json';
let original, evidence;
function fixture() {
  original ??= JSON.parse(readFileSync(capture));
  evidence ??= collectReviewedSourceBatchAuditInputs(original, { parityPath: capture });
  assert.equal(evidence.binding.status, 'bound', evidence.binding.error);
  return { original, evidence };
}

test('classifier adapter independently replays complete original sources and validates exact coverage', () => {
  const { evidence: e } = fixture();
  assert.equal(e.groups.length, 146); assert.equal(e.observations.length, 6295);
  assert.equal(e.coverage.complete, true); assert.equal(e.binding.sourceProofsReplayed, true);
  assert.equal(e.binding.frozenCanonicalJoinReplayedNow, false);
  assert.equal(e.binding.frozenCanonicalBaselineRevision, '7cd5cb79f65f30a6468a41cbd9d643aadb723d72');
  assert.equal(e.binding.frozenCanonicalJoinVerifiedAt, '7b842cb590c6d63c807de8e1576bedd6901706b5');
  assert.deepEqual(validateReviewedSourceBatchAuditInputs(e), []);
  assert.deepEqual(validateReviewedSourceBatchClassifications(e, e.groups), []);
  console.log(JSON.stringify({ groups: e.groups.length, observations: e.observations.length,
    cases: e.coverage.sourceCases, canonicalFilesChanged: e.canonicalFilesChanged }));
});

test('all classification contexts require the original input, property and values', () => {
  const { original: r, evidence: e } = fixture();
  const contexts = reviewedSourceBatchClassificationContexts(e);
  assert.equal(contexts.size, 6295);
  const owners = new Map([['static', r.results], ['interaction', r.interactions]].flatMap(([kind, entries]) =>
    entries.flatMap(x => x.styleInputs.map(input => [JSON.stringify([
      `${kind}:${x.family}@${x.profile}/${x.viewport.id}${x.state ? '/' + x.state : ''}`, input.id]), input]))));
  for (const o of e.observations) {
    const input = owners.get(JSON.stringify([o.case, o.element]));
    assert.equal(contexts.get(JSON.stringify([o.case, o.element, o.property])), o);
    const classified = classifyReviewedSourceBatchInput(input, o.property, o.reference, o.astylar, o);
    const { recommendedOwner, ...metadata } = o.classification;
    assert.deepEqual(classified, { ...metadata, owner: recommendedOwner });
  }
  const o = e.observations[0], input = owners.get(JSON.stringify([o.case, o.element]));
  for (const args of [
    [{ ...input, id: 'wrong' }, o.property, o.reference, o.astylar, o],
    [input, 'width', o.reference, o.astylar, o],
    [input, o.property, 'wrong', o.astylar, o],
    [input, o.property, o.reference, 'wrong', o],
    [{ ...input, extra: true }, o.property, o.reference, o.astylar, o],
  ]) assert.throws(() => classifyReviewedSourceBatchInput(...args));
  assert.equal(classifyReviewedSourceBatchInput({}, 'width', 'auto', undefined, undefined), undefined);
  assert.equal(reviewedSourceBatchClassificationContexts({}).size, 0);
});

test('classified output rejects omissions, duplication, changed metadata and inflated evidence', () => {
  const { evidence: e } = fixture();
  for (const mutate of [
    rows => rows.pop(), rows => rows.push(rows[0]),
    rows => { rows[0].attribution = 'unresolved'; },
    rows => { rows[0].reviewedCases.pop(); },
    rows => { rows[0].reviewEvidence.inputEquivalent = true; },
    rows => { rows[0].reviewEvidence.sourcePlan.sha256 = 'forged'; },
    rows => { rows[0].reference = 'changed'; },
    rows => { rows[0].recommendedOwner = 'unrelated subsystem'; },
  ]) {
    const rows = structuredClone(e.groups); mutate(rows);
    assert.ok(validateReviewedSourceBatchClassifications(e, rows).length);
  }
  assert.equal(collectReviewedSourceBatchAuditInputs({}).binding.status, 'unbound');
  assert.equal(collectReviewedSourceBatchAuditInputs({}, { parityPath: 'package.json' }).binding.status, 'invalid');
  assert.equal(collectReviewedSourceBatchAuditInputs({}, { parityPath: capture }).binding.status, 'invalid');
  assert.ok(validateReviewedSourceBatchAuditInputs({ binding: { status: 'unbound' } }).length);
  const incomplete = { ...e, coverage: { ...e.coverage, complete: false } };
  assert.ok(validateReviewedSourceBatchAuditInputs(incomplete).length);
});

test('adapter dry run equals the original committed transition for every complete historical row', async () => {
  const { evidence: e } = fixture();
  const { rows } = await readCaretConservationRows(file => execFileSync('git',
    ['show', `7cd5cb79f65f30a6468a41cbd9d643aadb723d72:${file}`], { maxBuffer: 64 * 1024 * 1024 }));
  const plan = JSON.parse(readFileSync('docs/material-reviewed-source-batch.json'));
  const originalModule = execFileSync('git', ['show', '7b842cb:tests/material-parity/reviewed-source-batch-transition.mjs']);
  const old = await import('data:text/javascript;base64,' + originalModule.toString('base64'));
  const expected = old.stageReviewedSourceBatch(rows, plan), result = stageReviewedSourceBatchAuditTransitions(rows, e);
  assert.ok(isDeepStrictEqual(stageReviewedSourceBatch(rows, plan), expected), 'metadata extraction changed original transition');
  assert.equal(result.rows.length, 8339);
  for (let i = 0; i < rows.length; i++) assert.ok(isDeepStrictEqual(result.rows[i], expected.rows[i]), `complete row ${i} differs`);
  assert.equal(result.unchangedCompleteRows, 8193);
  assert.equal(result.unchangedOrderedRowDigestsSha256, expected.unchangedOrderedRowDigestsSha256);
  assert.equal(result.projectedUnresolved, 1689); assert.equal(result.previousUnresolved, 1835);
  assert.throws(() => stageReviewedSourceBatchAuditTransitions(result.rows, e));
  assert.throws(() => stageReviewedSourceBatchAuditTransitions(rows, { ...e, coverage: { ...e.coverage, complete: false } }));
  const selected = rows.findIndex(row => digest(row) === e.groups[0].originalCompleteRowSha256);
  const altered = [...rows]; altered[selected] = { ...altered[selected], reference: 'changed' };
  assert.throws(() => stageReviewedSourceBatchAuditTransitions(altered, e));
  console.log(JSON.stringify({ changedGroups: result.changes.length,
    changedObservations: result.changes.reduce((n, r) => n + r.occurrences, 0),
    unchangedCompleteRows: result.unchangedCompleteRows, unchangedOrderedRowDigestsSha256: result.unchangedOrderedRowDigestsSha256,
    canonicalFilesChanged: false }));
});

test('subset adapter explicitly retains missing membership and does not expand source scope', () => {
  const replay = replayReviewedSourceBatchObservations();
  const first = fixture().evidence.observations[0].case;
  const subset = Object.fromEntries([['static', 'results'], ['interaction', 'interactions']].map(([kind, field]) =>
    [field, replay.original[field].filter(e => `${kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}` === first)]));
  const e = { binding: { status: 'bound' }, ...projectReviewedSourceBatchAuditInputs(subset, replay) };
  assert.equal(e.coverage.complete, false); assert.ok(e.coverage.missingObservations.length);
  assert.equal(e.observations.length + e.coverage.missingObservations.length, 6295);
  assert.deepEqual(validateReviewedSourceBatchClassifications(e, e.groups), []);
  assert.throws(() => stageReviewedSourceBatchAuditTransitions([], e));
});
