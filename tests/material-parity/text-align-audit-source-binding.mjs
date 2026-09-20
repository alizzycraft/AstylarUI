import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { collectTextAlignAncestry } from '../../scripts/audit-material-text-align-ancestry.mjs';
import { reviewTextAlignmentObservation } from '../../scripts/bind-material-text-align-ancestry.mjs';
import { bindOwnerCaretCaptureSubset } from './owner-caret-audit-source-binding.mjs';
import { bindOwnerCaretNormalization } from './owner-caret-source-binding.mjs';
import { reviewedInputClassificationContexts, classifyReviewedInput } from './reviewed-input-audit-source-binding.mjs';

const hash = x => createHash('sha256').update(x).digest('hex');
const digest = x => hash(JSON.stringify(x));
const planFile = 'docs/material-text-align-canonical-plan.json', revision = 'e3bc804';
const originalFile = 'artifacts/material-parity/current-ancestry-audit/latest-report.json';
const originalSha256 = 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a';
export const textAlignAttributions = ['reviewed-text-alignment-observation-stage-mismatch',
  'reviewed-tooltip-scalar-text-alignment-omission'];
export const textAlignClassificationContexts = reviewedInputClassificationContexts;
export const classifyTextAlignInput = classifyReviewedInput;

// Authenticate the complete prior canonical join, then replay original owner
// ancestry. This builder adapter does not reread the frozen 2GB canonical file.
export function replayTextAlignPlan() {
  const text = readFileSync(planFile, 'utf8').replaceAll('\r\n', '\n');
  assert.equal(text, execFileSync('git', ['show', `${revision}:${planFile}`],
    { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }).replaceAll('\r\n', '\n'));
  const plan = JSON.parse(text), proof = collectTextAlignAncestry();
  const source = readFileSync(plan.sourceProof.file, 'utf8').replaceAll('\r\n', '\n');
  assert.equal(hash(source), plan.sourceProof.sha256);
  assert.equal(JSON.stringify(proof, null, 2) + '\n', source, 'source ancestry no longer replays');
  const bytes = readFileSync(originalFile); assert.equal(hash(bytes), originalSha256);
  assert.deepEqual(plan.originalCapture, { file: originalFile, sha256: originalSha256 });
  assert.deepEqual(proof.originalCapture, plan.originalCapture);
  const normalization = plan.productionNormalization;
  return { original: JSON.parse(bytes), plan, proof,
    normalize: bindOwnerCaretNormalization(readFileSync(normalization.module, 'utf8'), normalization),
    descriptor: { file: planFile, revision, sha256: hash(text), sourceProof: plan.sourceProof,
      sourceProofReplayed: true, frozenCanonicalJoinReplayedNow: false, frozenCanonicalJoinVerifiedAt: revision } };
}

// Pure projection; callers must authenticate and independently replay first.
export function projectTextAlignInputs(supplied, replay) {
  const { original, plan, proof, descriptor, normalize } = replay;
  assert.equal(hash(JSON.stringify(plan, null, 2) + '\n'), descriptor.sha256);
  assert.equal(hash(JSON.stringify(proof, null, 2) + '\n'), plan.sourceProof.sha256);
  assert.equal(plan.proposedGroups, 49); assert.equal(plan.proposed.length, 49);
  assert.equal(plan.proposedObservations, 2677);
  for (const flag of ['canonicalAttributionChanged', 'inputEquivalent', 'renderingEquivalent']) assert.equal(plan[flag], false);
  const subset = bindOwnerCaretCaptureSubset(supplied, original), observations = [], groups = [], missing = [], seen = new Set();
  const source = new Map(proof.findings.map(f => [JSON.stringify([f.case, f.element]), f]));
  assert.equal(source.size, proof.findings.length);
  const states = new Map([['static', original.results], ['interaction', original.interactions]].flatMap(([kind, entries]) =>
    entries.map(e => [`${kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`, e.state ?? 'static'])));
  for (const p of plan.proposed) {
    assert.equal(p.property, 'textAlign'); assert.equal(p.previousAttribution, 'unresolved');
    assert.ok(textAlignAttributions.includes(p.proposedAttribution)); assert.equal(p.occurrences, p.observations.length);
    for (const flag of ['wholeElementInputEquivalent', 'candidateComputedVerified', 'usedAlignmentVerified',
      'renderingEquivalent', 'rendererCauseProven']) assert.equal(p[flag], false);
    const classification = { classification: p.proposedClassification, attribution: p.proposedAttribution,
      justification: p.justification, recommendedOwner: p.proposedOwner,
      reviewEvidence: { sourcePlan: descriptor, originalCompleteRowSha256: p.canonicalRowSha256,
        sourceProposalSha256: digest(p), originalObservationsSha256: digest(p.observations),
        inputEquivalent: false, wholeElementInputEquivalent: false, computedCandidateVerified: false,
        usedAlignmentVerified: false, renderingEquivalent: false, rendererCauseProven: false } };
    const members = [];
    for (const o of p.observations) {
      const key = JSON.stringify([o.case, p.element, p.property]); assert.ok(!seen.has(key)); seen.add(key);
      const f = source.get(JSON.stringify([o.case, p.element])); assert.ok(f);
      assert.equal(f.family, p.family); assert.equal(f.property, p.property);
      assert.equal(f.originalInputSha256, o.originalInputSha256); assert.deepEqual(f.inputTrees, o.inputTrees);
      const pattern = proof.patterns[f.pattern]; assert.ok(pattern); assert.equal(digest(pattern.proof), pattern.sha256);
      assert.equal(pattern.sha256, o.proofSha256);
      const reviewed = reviewTextAlignmentObservation(pattern.proof); assert.ok(reviewed);
      assert.equal(reviewed.classification, p.proposedClassification); assert.equal(reviewed.attribution, p.proposedAttribution);
      assert.equal(reviewed.owner, p.proposedOwner); assert.equal(reviewed.justification, p.justification);
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
  assert.equal(seen.size, 2677);
  return { observations, groups, coverage: { ...subset.coverage, sourceObservations: seen.size,
    suppliedObservations: observations.length, missingObservations: missing,
    complete: subset.coverage.complete && !missing.length }, inputEquivalent: false, renderingEquivalent: false };
}

export function collectTextAlignAuditInputs(report, { root = process.cwd(), parityPath } = {}) {
  const empty = { schemaVersion: 1, binding: { status: 'unbound' }, observations: [], groups: [] };
  if (!parityPath) return empty;
  try {
    assert.equal(realpathSync(root), realpathSync(process.cwd()));
    const boundary = realpathSync('artifacts/material-parity'), target = realpathSync(parityPath);
    const relative = path.relative(boundary, target);
    assert.ok(relative && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
    const bytes = readFileSync(target), supplied = JSON.parse(bytes);
    assert.equal(bindOwnerCaretCaptureSubset(report, supplied).coverage.complete, true);
    const replay = replayTextAlignPlan();
    return { schemaVersion: 1, binding: { status: 'bound', file: path.relative(root, path.resolve(root, parityPath)).replaceAll('\\', '/'),
      sha256: hash(bytes), originalCapture: { file: originalFile, sha256: originalSha256 }, sourcePlan: replay.descriptor,
      sourceProofReplayed: true, frozenCanonicalJoinReplayedNow: false }, ...projectTextAlignInputs(supplied, replay) };
  } catch (error) { return { ...empty, binding: { status: 'invalid', error: String(error) } }; }
}

export function validateTextAlignAuditInputs(evidence, { root = process.cwd(), requireComplete = true } = {}) {
  try {
    assert.equal(evidence.binding.status, 'bound'); if (requireComplete) assert.equal(evidence.coverage.complete, true);
    const bytes = readFileSync(path.resolve(root, evidence.binding.file)); assert.equal(hash(bytes), evidence.binding.sha256);
    const replay = collectTextAlignAuditInputs(JSON.parse(bytes), { root, parityPath: evidence.binding.file });
    assert.equal(replay.binding.status, 'bound', replay.binding.error); assert.deepEqual(evidence, replay);
  } catch (error) { return [`text alignment source replay failed: ${error}`]; }
  return [];
}

export function validateTextAlignClassifications(evidence, rows) {
  try {
    assert.equal(evidence.binding.status, 'bound');
    const actual = rows.filter(r => textAlignAttributions.includes(r.attribution));
    assert.equal(actual.length, evidence.groups.length);
    const bySource = new Map(actual.map(r => [r.reviewEvidence?.originalCompleteRowSha256, r]));
    assert.equal(bySource.size, actual.length);
    for (const expected of evidence.groups) {
      const row = bySource.get(expected.originalCompleteRowSha256); assert.ok(row);
      for (const key of ['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence',
        'family', 'element', 'property', 'reference', 'astylar', 'occurrences', 'cases', 'reviewedCases', 'states'])
        assert.deepEqual(row[key], expected[key], key);
    }
    assert.equal(actual.reduce((n, r) => n + r.occurrences, 0), evidence.coverage.suppliedObservations);
  } catch (error) { return [`text alignment classification coverage failed: ${error}`]; }
  return [];
}

// Source evidence must already be independently replayed. Only metadata changes;
// complete original hashes reject intervening reviews or changed raw inputs.
export function stageTextAlignTransitions(rows, evidence) {
  assert.equal(evidence.binding.status, 'bound'); assert.equal(evidence.coverage.complete, true);
  const expected = new Map(evidence.groups.map(g => [g.originalCompleteRowSha256, g]));
  assert.equal(expected.size, evidence.groups.length);
  const seen = new Set(), changes = [], unchanged = [];
  const projected = rows.map(row => {
    const before = digest(row), group = expected.get(before);
    if (!group) { unchanged.push(before); return row; }
    assert.ok(!seen.has(before)); seen.add(before); assert.equal(row.attribution, 'unresolved');
    for (const key of ['family', 'element', 'property', 'reference', 'astylar', 'occurrences', 'cases', 'states'])
      assert.deepEqual(row[key], group[key], key);
    const after = { ...row };
    for (const key of ['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']) after[key] = group[key];
    changes.push({ family: row.family, element: row.element, property: row.property, occurrences: row.occurrences,
      previousCompleteRowSha256: before, projectedCompleteRowSha256: digest(after), attribution: after.attribution });
    return after;
  });
  assert.equal(seen.size, expected.size, 'missing or changed original canonical row');
  assert.deepEqual(validateTextAlignClassifications(evidence, projected), []);
  return { rows: projected, changes, unchangedCompleteRows: unchanged.length, unchangedOrderedRowDigestsSha256: digest(unchanged),
    previousUnresolved: rows.filter(r => r.attribution === 'unresolved').length,
    projectedUnresolved: projected.filter(r => r.attribution === 'unresolved').length,
    canonicalFilesChanged: false, inputEquivalent: false, renderingEquivalent: false };
}
