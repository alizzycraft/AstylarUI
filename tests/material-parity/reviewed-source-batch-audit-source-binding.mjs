import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { replayReviewedSourceBatchObservations, bindReviewedSourceBatchObservations } from './reviewed-source-batch-observation-binding.mjs';
import { reviewedSourceBatchAttributions, reviewedSourceBatchMetadata } from './reviewed-source-batch-transition.mjs';
import { bindOwnerCaretCaptureSubset } from './owner-caret-audit-source-binding.mjs';
import { reviewedInputClassificationContexts, classifyReviewedInput } from './reviewed-input-audit-source-binding.mjs';

const hash = x => createHash('sha256').update(x).digest('hex');
const digest = x => hash(JSON.stringify(x));
const same = (a, b, why) => assert.ok(isDeepStrictEqual(a, b), why);
const metadataKeys = ['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence'];
export { reviewedSourceBatchAttributions };
export const reviewedSourceBatchClassificationContexts = reviewedInputClassificationContexts;
export const classifyReviewedSourceBatchInput = classifyReviewedInput;

function readArtifact(root, file) {
  const boundary = realpathSync(path.resolve(root, 'artifacts/material-parity'));
  const target = realpathSync(path.resolve(root, file)), relative = path.relative(boundary, target);
  assert.ok(relative && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative),
    'reviewed source capture escapes Material artifacts');
  return readFileSync(target);
}

export function projectReviewedSourceBatchAuditInputs(supplied, replay) {
  const bound = bindReviewedSourceBatchObservations(supplied, replay);
  const plans = new Map(replay.plan.findings.map(g => [g.canonicalRowSha256, g]));
  assert.equal(plans.size, 146);
  const classifications = new Map([...plans].map(([id, group]) => [id, reviewedSourceBatchMetadata(group)]));
  const observations = bound.observations.map(o => ({ ...o, inputSha256: o.originalInputSha256,
    classification: classifications.get(o.originalCompleteRowSha256) }));
  const groups = bound.groups.map(g => {
    const plan = plans.get(g.originalCompleteRowSha256); assert.ok(plan);
    return { ...classifications.get(g.originalCompleteRowSha256),
      family: plan.family, element: plan.element, property: plan.property,
      reference: plan.reference, astylar: plan.astylar,
      originalCompleteRowSha256: g.originalCompleteRowSha256, occurrences: g.occurrences,
      cases: g.cases.slice(0, 12), reviewedCases: g.cases,
      states: [...new Set(g.cases.map(c => c.startsWith('static:') ? 'static' : c.split('/').slice(2).join('/')))] };
  });
  return { ...bound, observations, groups };
}

export function collectReviewedSourceBatchAuditInputs(report, { root = process.cwd(), parityPath } = {}) {
  const empty = { schemaVersion: 1, binding: { status: 'unbound' }, observations: [], groups: [] };
  if (!parityPath) return empty;
  try {
    // Source collectors operate against this worktree; do not silently mix roots.
    assert.equal(realpathSync(root), realpathSync(process.cwd()));
    const bytes = readArtifact(root, parityPath), supplied = JSON.parse(bytes);
    assert.equal(bindOwnerCaretCaptureSubset(report, supplied).coverage.complete, true, 'caller differs from supplied capture');
    const replay = replayReviewedSourceBatchObservations();
    return { schemaVersion: 1, binding: { status: 'bound',
      file: path.relative(root, path.resolve(root, parityPath)).replaceAll('\\', '/'), sha256: hash(bytes),
      sourceReports: replay.plan.sources, sourceProofsReplayed: true,
      frozenCanonicalJoinReplayedNow: false,
      frozenCanonicalBaselineRevision: '7cd5cb79f65f30a6468a41cbd9d643aadb723d72',
      frozenCanonicalJoinVerifiedAt: '7b842cb590c6d63c807de8e1576bedd6901706b5' },
      ...projectReviewedSourceBatchAuditInputs(supplied, replay) };
  } catch (error) { return { ...empty, binding: { status: 'invalid', error: String(error) } }; }
}

export function validateReviewedSourceBatchAuditInputs(evidence, { root = process.cwd(), requireComplete = true } = {}) {
  try {
    assert.equal(evidence?.binding?.status, 'bound');
    if (requireComplete) assert.equal(evidence.coverage.complete, true);
    const bytes = readArtifact(root, evidence.binding.file); assert.equal(hash(bytes), evidence.binding.sha256);
    const replay = collectReviewedSourceBatchAuditInputs(JSON.parse(bytes), { root, parityPath: evidence.binding.file });
    assert.equal(replay.binding.status, 'bound', replay.binding.error);
    same(evidence, replay, 'reviewed source evidence differs from independent replay');
  } catch (error) { return [`reviewed source batch replay failed: ${error}`]; }
  return [];
}

export function validateReviewedSourceBatchClassifications(evidence, rows) {
  try {
    assert.equal(evidence?.binding?.status, 'bound');
    const actual = rows.filter(r => reviewedSourceBatchAttributions.includes(r.attribution));
    assert.equal(actual.length, evidence.groups.length);
    const bySource = new Map(actual.map(r => [r.reviewEvidence?.originalCompleteRowSha256, r]));
    assert.equal(bySource.size, actual.length, 'duplicate original reviewed group');
    for (const expected of evidence.groups) {
      const row = bySource.get(expected.originalCompleteRowSha256); assert.ok(row, 'reviewed group missing');
      for (const key of [...metadataKeys, 'family', 'element', 'property', 'reference', 'astylar',
        'occurrences', 'cases', 'reviewedCases', 'states']) same(row[key], expected[key], `reviewed ${key} differs`);
    }
    assert.equal(actual.reduce((n, g) => n + g.occurrences, 0), evidence.coverage.suppliedObservations);
  } catch (error) { return [`reviewed source batch classification coverage failed: ${error}`]; }
  return [];
}

// Apply only independently validated complete evidence to its exact original
// unresolved rows. This is a dry run; main-builder integration remains separate.
export function stageReviewedSourceBatchAuditTransitions(rows, evidence) {
  assert.equal(evidence.binding.status, 'bound'); assert.equal(evidence.coverage.complete, true);
  const expected = new Map(evidence.groups.map(g => [g.originalCompleteRowSha256, g]));
  assert.equal(expected.size, evidence.groups.length);
  const seen = new Set(), changes = [], unchanged = [];
  const projected = rows.map(row => {
    const before = digest(row), group = expected.get(before);
    if (!group) { unchanged.push(before); return row; }
    assert.ok(!seen.has(before)); seen.add(before);
    assert.equal(row.attribution, 'unresolved', 'prior classifications must survive');
    for (const field of ['family', 'element', 'property', 'reference', 'astylar', 'occurrences', 'cases', 'states'])
      same(row[field], group[field], `original ${field} changed`);
    const after = { ...row };
    for (const field of [...metadataKeys, 'reviewedCases']) after[field] = group[field];
    changes.push({ previousCompleteRowSha256: before, projectedCompleteRowSha256: digest(after),
      family: row.family, element: row.element, property: row.property, occurrences: row.occurrences, attribution: after.attribution });
    return after;
  });
  assert.equal(seen.size, expected.size, 'missing or changed original reviewed row');
  same(validateReviewedSourceBatchClassifications(evidence, projected), [], 'classification coverage differs');
  return { rows: projected, changes, unchangedCompleteRows: unchanged.length,
    unchangedOrderedRowDigestsSha256: digest(unchanged),
    previousUnresolved: rows.filter(r => r.attribution === 'unresolved').length,
    projectedUnresolved: projected.filter(r => r.attribution === 'unresolved').length,
    canonicalFilesChanged: false, inputEquivalent: false, renderingEquivalent: false };
}
