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
import { collectColorNormalizationTransition, verifyCanonicalColorPopulationTransition } from '../../scripts/audit-material-color-normalization-transition.mjs';
import { collectReviewedInputAuditInputs, validateReviewedInputClassifications } from './reviewed-input-audit-source-binding.mjs';
import { collectFollowupInputAuditInputs, validateFollowupInputClassifications } from './followup-input-audit-source-binding.mjs';
import { collectAlignmentFontAuditInputs, validateAlignmentFontClassifications } from './alignment-font-audit-source-binding.mjs';
import { collectTextAlignAuditInputs, validateTextAlignClassifications } from './text-align-audit-source-binding.mjs';
import { collectLtrAlignmentAuditInputs, validateLtrAlignmentClassifications } from './ltr-alignment-audit-source-binding.mjs';
import { collectOwnerCaretInputs } from './owner-caret-source-binding.mjs';
import { validateOwnerCaretAttributionRows } from './owner-caret-attribution-coverage.mjs';
import { collectReviewedSourceBatchAuditInputs, validateReviewedSourceBatchClassifications }
  from './reviewed-source-batch-audit-source-binding.mjs';
import { collectRootBackgroundAuditInputs, validateRootBackgroundClassifications }
  from './root-background-classification-preparation.mjs';

const digest = x => createHash('sha256').update(JSON.stringify(x)).digest('hex');
const fields = new Set(['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']);
const raw = row => Object.fromEntries(Object.entries(row).filter(([key]) => !fields.has(key)));

test('canonical later source-batch and root-background classifications retain complete source-proven membership after normalization', async () => {
  const parityPath = 'artifacts/material-parity/current-ancestry-audit/latest-report.json';
  const source = JSON.parse(readFileSync(parityPath));
  const current = await readCaretConservationRows(readFileSync);
  const results = [];
  for (const [collect, validate, groups, observations] of [
    [collectReviewedSourceBatchAuditInputs, validateReviewedSourceBatchClassifications, 146, 6295],
    [collectRootBackgroundAuditInputs, validateRootBackgroundClassifications, 144, 2311],
  ]) {
    const evidence = collect(source, { parityPath });
    assert.equal(evidence.binding.status, 'bound', evidence.binding.error);
    assert.equal(evidence.coverage.complete, true);
    assert.equal(evidence.groups.length, groups);
    assert.equal(evidence.observations.length, observations);
    assert.deepEqual(validate(evidence, current.rows), []);
    results.push({ groups, observations });
  }
  console.log(JSON.stringify({ currentManifest: current.manifest, sourceReplayedReviews: results,
    groups: 290, observations: 8606, completeSourceClassificationMembershipProven: true,
    unrelatedClassificationsProven: false, inputEquivalent: false, renderingEquivalent: false }));
});

test('canonical current caret classifications retain complete source-proven membership after normalization', async () => {
  const parityPath = 'artifacts/material-parity/current-ancestry-audit/latest-report.json';
  const current = await readCaretConservationRows(readFileSync);
  const evidence = collectOwnerCaretInputs(JSON.parse(readFileSync(parityPath)), { parityPath });
  assert.equal(evidence.binding.status, 'bound', evidence.binding.error);
  assert.deepEqual([evidence.plannedCoverage.reviewedGroups, evidence.plannedCoverage.reviewedObservations,
    evidence.plannedCoverage.pendingGroups, evidence.plannedCoverage.pendingObservations], [118, 3154, 27, 896]);
  assert.deepEqual(validateOwnerCaretAttributionRows(evidence.plannedCoverage, current.rows), []);
  console.log(JSON.stringify({ currentManifest: current.manifest, reviewedGroups: 118, reviewedObservations: 3154,
    completeSourceClassificationMembershipProven: true, laterPendingClassificationsProven: false,
    unrelatedClassificationsProven: false, inputEquivalent: false, renderingEquivalent: false }));
});

test('canonical earlier classifications retain complete source-proven membership after normalization', async () => {
  const parityPath = 'artifacts/material-parity/current-ancestry-audit/latest-report.json';
  const source = JSON.parse(readFileSync(parityPath));
  const current = await readCaretConservationRows(readFileSync);
  const results = [];
  for (const [collect, validate, groups, observations] of [
    [collectReviewedInputAuditInputs, validateReviewedInputClassifications, 134, 3325],
    [collectFollowupInputAuditInputs, validateFollowupInputClassifications, 66, 2640],
    [collectAlignmentFontAuditInputs, validateAlignmentFontClassifications, 72, 4016],
    [collectTextAlignAuditInputs, validateTextAlignClassifications, 49, 2677],
    [collectLtrAlignmentAuditInputs, validateLtrAlignmentClassifications, 4, 178],
  ]) {
    const evidence = collect(source, { parityPath });
    assert.equal(evidence.binding.status, 'bound', evidence.binding.error);
    assert.equal(evidence.coverage.complete, true);
    assert.equal(evidence.groups.length, groups);
    assert.equal(evidence.coverage.suppliedObservations, observations);
    assert.deepEqual(validate(evidence, current.rows), []);
    results.push({ groups, observations });
  }
  console.log(JSON.stringify({ currentManifest: current.manifest, sourceReplayedReviews: results,
    groups: 325, observations: 12836, completeReviewedMembershipProven: true,
    unrelatedClassificationsProven: false, inputEquivalent: false, renderingEquivalent: false }));
});

test('canonical color population matches the independently replayed normalization transition', async () => {
  const transition = collectColorNormalizationTransition();
  assert.deepEqual(transition, JSON.parse(readFileSync('docs/material-color-normalization-transition.json')));
  const previous = await readCaretConservationRows(file => execFileSync('git',
    ['show', `${transition.previous.revision}:${file}`], { maxBuffer: 64 * 1024 * 1024 }));
  const current = await readCaretConservationRows(readFileSync);
  const proof = verifyCanonicalColorPopulationTransition(previous.rows, current.rows, transition);
  assert.equal(proof.exposedGroups, 144); assert.equal(proof.exposedObservations, 2311);
  assert.equal(proof.changedValueGroups, 66); assert.equal(proof.changedValueObservations, 612);
  assert.equal(proof.previousObservations, 386891); assert.equal(proof.currentObservations, 389202);
  console.log(JSON.stringify({ ...proof, previousManifest: previous.manifest, currentManifest: current.manifest }));
});

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
  // This complete-row invariant owns the historical classification boundary.
  // Current normalization/population and all 325 surviving reviewed groups
  // are independently checked above against today's authenticated payload.
  const classificationRevision = '4650791a7208b841dd29f1ced015f98234949623';
  const current = await readCaretConservationRows(file => execFileSync('git',
    ['show', `${classificationRevision}:${file}`], { maxBuffer: 64 * 1024 * 1024 }));
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
    historicalClassificationRevision: classificationRevision, historicalCanonicalManifest: current.manifest,
    inputEquivalent: false, renderingEquivalent: false,
    limitation: 'Authenticates the historical classification boundary and compares every complete discrepancy against independently replayed sources. Current normalization population and retained classifications have separate checks in this suite. Later unrelated classification conservation, fresh builder/report equivalence and full enforced rendering acceptance remain separate.' }));
});
