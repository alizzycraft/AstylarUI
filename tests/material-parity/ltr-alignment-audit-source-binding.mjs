import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { collectLtrAlignmentReview } from '../../scripts/audit-material-ltr-alignment.mjs';
import { bindOwnerCaretCaptureSubset } from './owner-caret-audit-source-binding.mjs';
import { bindOwnerCaretNormalization } from './owner-caret-source-binding.mjs';
import { reviewedInputClassificationContexts, classifyReviewedInput } from './reviewed-input-audit-source-binding.mjs';

const hash = x => createHash('sha256').update(x).digest('hex');
const digest = x => hash(JSON.stringify(x));
const file = 'docs/material-ltr-alignment-review.json', revision = '140ba41';
export const ltrAlignmentAttribution = 'reviewed-captured-ltr-alignment-keyword-correspondence';
export const ltrAlignmentClassificationContexts = reviewedInputClassificationContexts;
export const classifyLtrAlignmentInput = classifyReviewedInput;
const metadata = ['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence'];

export function replayLtrAlignmentReview() {
  const text = readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
  assert.equal(text, execFileSync('git', ['show', `${revision}:${file}`],
    { encoding: 'utf8', maxBuffer: 1024 * 1024 }).replaceAll('\r\n', '\n'));
  const review = collectLtrAlignmentReview();
  assert.equal(JSON.stringify(review, null, 2) + '\n', text, 'original LTR contexts no longer replay');
  const bytes = readFileSync(review.originalCapture.file); assert.equal(hash(bytes), review.originalCapture.sha256);
  const plan = JSON.parse(readFileSync(review.sourcePlan.file)), n = plan.productionNormalization;
  return { review, original: JSON.parse(bytes),
    normalize: bindOwnerCaretNormalization(readFileSync(n.module, 'utf8'), n),
    descriptor: { file, revision, sha256: hash(text), sourceProofReplayed: true,
      frozenCanonicalJoinReplayedNow: false, frozenCanonicalJoinVerifiedAt: review.sourcePlan.revision } };
}

// Pure membership projection. Use only after authenticating and replaying the
// original contexts; this is not a general start-to-left normalization rule.
export function projectLtrAlignmentInputs(supplied, replay) {
  const { original, review, descriptor, normalize } = replay;
  assert.equal(hash(JSON.stringify(review, null, 2) + '\n'), descriptor.sha256);
  assert.equal(review.groupCount, 4); assert.equal(review.groups.length, 4); assert.equal(review.observations, 178);
  for (const flag of ['canonicalAttributionChanged', 'inputEquivalent', 'renderingEquivalent']) assert.equal(review[flag], false);
  const subset = bindOwnerCaretCaptureSubset(supplied, original), observations = [], groups = [], missing = [], seen = new Set();
  const states = new Map([['static', original.results], ['interaction', original.interactions]].flatMap(([kind, entries]) =>
    entries.map(e => [`${kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`, e.state ?? 'static'])));
  for (const p of review.groups) {
    assert.equal(p.property, 'textAlign'); assert.equal(p.reference, 'start'); assert.equal(p.astylar, 'left');
    assert.equal(p.previousAttribution, 'unresolved'); assert.equal(p.proposedAttribution, ltrAlignmentAttribution);
    assert.equal(p.proposedClassification, 'equivalent-representation'); assert.equal(p.occurrences, p.observations.length);
    for (const flag of ['inputEquivalent', 'renderingEquivalent', 'rendererCauseProven']) assert.equal(p[flag], false);
    const classification = { classification: p.proposedClassification, attribution: p.proposedAttribution,
      justification: p.justification, recommendedOwner: p.recommendedOwner,
      reviewEvidence: { sourceReview: descriptor, originalCompleteRowSha256: p.canonicalRowSha256,
        sourceProposalSha256: digest(p), originalObservationsSha256: digest(p.observations),
        capturedRequestedEdgeCorrespondence: true, inputEquivalent: false, wholeElementInputEquivalent: false,
        computedCandidateVerified: false, actualPlacementVerified: false, renderingEquivalent: false, rendererCauseProven: false } };
    const members = [];
    for (const o of p.observations) {
      const key = JSON.stringify([o.case, p.element, p.property]); assert.ok(!seen.has(key)); seen.add(key);
      assert.equal(o.capturedRequestedEdgeCorrespondence, true); assert.ok(o.writingModes.length);
      for (const flag of ['wholeElementInputEquivalent', 'candidateComputedVerified', 'actualPlacementVerified',
        'renderingEquivalent', 'rendererCauseProven']) assert.equal(o[flag], false);
      assert.ok(o.writingModes.every(v => v.direction === 'ltr' && v.writingMode === 'horizontal-tb' && v.textAlignLast === 'auto'));
      const input = subset.inputs.get(JSON.stringify([o.case, p.element]));
      if (!input) { missing.push({ case: o.case, element: p.element, property: p.property }); continue; }
      assert.equal(digest(input), o.originalInputSha256);
      assert.equal(normalize(input.reference ?? {})[p.property], p.reference);
      assert.equal(normalize(input.astylar ?? {})[p.property], p.astylar);
      const member = { case: o.case, family: p.family, element: p.element, property: p.property,
        reference: p.reference, astylar: p.astylar, inputSha256: o.originalInputSha256,
        proofSha256: o.proofSha256, originalCompleteRowSha256: p.canonicalRowSha256, classification };
      members.push(member); observations.push(member);
    }
    if (members.length) groups.push({ ...classification, family: p.family, element: p.element, property: p.property,
      reference: p.reference, astylar: p.astylar, originalCompleteRowSha256: p.canonicalRowSha256,
      occurrences: members.length, cases: members.slice(0, 12).map(o => o.case), reviewedCases: members.map(o => o.case),
      states: [...new Set(members.map(o => states.get(o.case)))] });
  }
  assert.equal(seen.size, 178);
  return { observations, groups, coverage: { ...subset.coverage, sourceObservations: seen.size,
    suppliedObservations: observations.length, missingObservations: missing,
    complete: subset.coverage.complete && !missing.length }, inputEquivalent: false, renderingEquivalent: false };
}

export function collectLtrAlignmentAuditInputs(report, { root = process.cwd(), parityPath } = {}) {
  const empty = { schemaVersion: 1, binding: { status: 'unbound' }, observations: [], groups: [] };
  if (!parityPath) return empty;
  try {
    assert.equal(realpathSync(root), realpathSync(process.cwd()));
    const boundary = realpathSync('artifacts/material-parity'), target = realpathSync(parityPath), relative = path.relative(boundary, target);
    assert.ok(relative && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
    const bytes = readFileSync(target), supplied = JSON.parse(bytes);
    assert.equal(bindOwnerCaretCaptureSubset(report, supplied).coverage.complete, true);
    const replay = replayLtrAlignmentReview();
    return { schemaVersion: 1, binding: { status: 'bound', file: path.relative(root, target).replaceAll('\\', '/'),
      sha256: hash(bytes), originalCapture: replay.review.originalCapture, sourceReview: replay.descriptor },
      ...projectLtrAlignmentInputs(supplied, replay) };
  } catch (error) { return { ...empty, binding: { status: 'invalid', error: String(error) } }; }
}

export function validateLtrAlignmentAuditInputs(evidence, { root = process.cwd(), requireComplete = true } = {}) {
  try {
    assert.equal(evidence.binding.status, 'bound'); if (requireComplete) assert.equal(evidence.coverage.complete, true);
    const bytes = readFileSync(path.resolve(root, evidence.binding.file)); assert.equal(hash(bytes), evidence.binding.sha256);
    const replay = collectLtrAlignmentAuditInputs(JSON.parse(bytes), { root, parityPath: evidence.binding.file });
    assert.equal(replay.binding.status, 'bound', replay.binding.error); assert.deepEqual(evidence, replay);
  } catch (error) { return [`LTR alignment source replay failed: ${error}`]; }
  return [];
}

export function validateLtrAlignmentClassifications(evidence, rows) {
  try {
    assert.equal(evidence.binding.status, 'bound');
    const actual = rows.filter(r => r.attribution === ltrAlignmentAttribution);
    assert.equal(actual.length, evidence.groups.length);
    const bySource = new Map(actual.map(r => [r.reviewEvidence?.originalCompleteRowSha256, r]));
    assert.equal(bySource.size, actual.length);
    for (const expected of evidence.groups) {
      const row = bySource.get(expected.originalCompleteRowSha256); assert.ok(row);
      for (const key of [...metadata, 'family', 'element', 'property', 'reference', 'astylar', 'occurrences', 'cases', 'reviewedCases', 'states'])
        assert.deepEqual(row[key], expected[key], key);
    }
    assert.equal(actual.reduce((n, r) => n + r.occurrences, 0), evidence.coverage.suppliedObservations);
  } catch (error) { return [`LTR alignment classification coverage failed: ${error}`]; }
  return [];
}

export function stageLtrAlignmentTransitions(rows, evidence) {
  assert.equal(evidence.binding.status, 'bound'); assert.equal(evidence.coverage.complete, true);
  const expected = new Map(evidence.groups.map(g => [g.originalCompleteRowSha256, g]));
  assert.equal(expected.size, evidence.groups.length);
  const seen = new Set(), changes = [], unchanged = [];
  const projected = rows.map(row => {
    const before = digest(row), group = expected.get(before);
    if (!group) { unchanged.push(before); return row; }
    assert.ok(!seen.has(before)); seen.add(before); assert.equal(row.attribution, 'unresolved');
    for (const key of ['family', 'element', 'property', 'reference', 'astylar', 'occurrences', 'cases', 'states']) assert.deepEqual(row[key], group[key], key);
    const after = { ...row }; for (const key of [...metadata, 'reviewedCases']) after[key] = group[key];
    changes.push({ family: row.family, element: row.element, property: row.property, occurrences: row.occurrences,
      previousCompleteRowSha256: before, projectedCompleteRowSha256: digest(after), attribution: after.attribution });
    return after;
  });
  assert.equal(seen.size, expected.size, 'missing or changed original canonical row');
  assert.deepEqual(validateLtrAlignmentClassifications(evidence, projected), []);
  return { rows: projected, changes, unchangedCompleteRows: unchanged.length, unchangedOrderedRowDigestsSha256: digest(unchanged),
    previousUnresolved: rows.filter(r => r.attribution === 'unresolved').length,
    projectedUnresolved: projected.filter(r => r.attribution === 'unresolved').length,
    canonicalFilesChanged: false, inputEquivalent: false, renderingEquivalent: false };
}
