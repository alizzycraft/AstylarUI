import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { replayReviewedInputSourcePlans } from '../../scripts/bind-material-reviewed-input-proposals.mjs';
import { bindOwnerCaretCaptureSubset } from './owner-caret-audit-source-binding.mjs';
import { reviewedInputAttributions } from './reviewed-input-proposal-transition.mjs';

const hash = x => createHash('sha256').update(x).digest('hex');
const digest = x => hash(JSON.stringify(x));
const same = (a, b, message) => assert.ok(isDeepStrictEqual(a, b), message);
const ownerKey = (c, id) => JSON.stringify([c, id]);
const observationKey = (c, id, property) => JSON.stringify([c, id, property]);
const revision = 'c58c62c';
const bindingFile = 'docs/material-reviewed-input-proposal-binding.json';
const transitionFile = 'docs/material-reviewed-input-transition-dry-run.json';
const metadataKeys = ['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence'];
const metadata = row => Object.fromEntries(metadataKeys.map(k => [k, row[k]]));
const population = report => ({ results: (report.results ?? []).map(projectEntry), interactions: (report.interactions ?? []).map(projectEntry) });
function projectEntry(e) {
  return { family: e.family, profile: e.profile, viewport: e.viewport, state: e.state,
    inputTrees: e.inputTrees, styleInputs: e.styleInputs };
}
function readArtifact(root, file) {
  const boundary = realpathSync(path.resolve(root, 'artifacts/material-parity'));
  const target = realpathSync(path.resolve(root, file)), relative = path.relative(boundary, target);
  assert.ok(relative && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative),
    'reviewed input capture escapes Material artifacts');
  return readFileSync(target);
}
function pinnedJson(root, file) {
  const bytes = readFileSync(path.resolve(root, file), 'utf8').replaceAll('\r\n', '\n');
  const committed = execFileSync('git', ['show', `${revision}:${file}`],
    { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }).replaceAll('\r\n', '\n');
  assert.equal(bytes, committed, 'verified reviewed-input evidence changed');
  return { report: JSON.parse(bytes), descriptor: { file, revision, sha256: hash(bytes) } };
}

// Pure projection, not an authenticator. The caller must pin the prior complete
// canonical join/transition and independently replay all source proofs first.
export function projectReviewedInputAuditInputs(binding, transition, supplied, original, normalize) {
  assert.equal(transition.binding.sha256, hash(JSON.stringify(binding, null, 2) + '\n'));
  assert.equal(transition.canonicalFilesChanged, false); assert.equal(transition.completeAuditAccepted, false);
  assert.equal(binding.canonicalIntegration, false); assert.equal(binding.sourceProofsReplayed, true);
  const subset = bindOwnerCaretCaptureSubset(supplied, original);
  const states = new Map([['static', supplied.results ?? []], ['interaction', supplied.interactions ?? []]]
    .flatMap(([kind, entries]) => entries.map(e => [
      `${kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`, e.state ?? 'static'])));
  const changes = new Map(transition.changes.map(c => [c.originalCompleteRowSha256, c]));
  assert.equal(changes.size, binding.groups.length); assert.equal(changes.size, transition.changedGroups);
  const observations = [], groups = [], missingObservations = [], seen = new Set();
  for (const g of binding.groups) {
    const p = g.proposal, before = g.originalCompleteRow, change = changes.get(p.canonicalRowSha256);
    assert.ok(change); assert.equal(digest(before), p.canonicalRowSha256);
    assert.equal(digest(change.projectedRow), change.projectedCompleteRowSha256);
    const row = change.projectedRow;
    assert.equal(before.attribution, 'unresolved');
    assert.equal(row.attribution, p.proposedAttribution); assert.equal(row.classification, p.proposedClassification);
    assert.equal(row.reviewEvidence.originalCompleteRowSha256, p.canonicalRowSha256);
    assert.equal(row.reviewEvidence.originalObservationsSha256, digest(p.observations));
    assert.equal(row.reviewEvidence.sourceProposalSha256, digest(p));
    same(row.reviewEvidence.sourcePlan, binding.plans[g.kind], 'source plan changed');
    for (const flag of ['inputEquivalent', 'wholeElementInputEquivalent', 'computedCandidateVerified', 'renderingEquivalent', 'rendererCauseProven'])
      assert.equal(row.reviewEvidence[flag], false);
    const members = [];
    for (const o of p.observations) {
      const key = observationKey(o.case, p.element, p.property);
      assert.ok(!seen.has(key), 'overlapping original observation'); seen.add(key);
      const input = subset.inputs.get(ownerKey(o.case, p.element));
      if (!input) { missingObservations.push({ case: o.case, element: p.element, property: p.property }); continue; }
      assert.equal(digest(input), o.inputSha256 ?? o.originalInputSha256, 'original observation changed');
      assert.equal(normalize(input.reference ?? {})[p.property], p.reference);
      assert.equal(normalize(input.astylar ?? {})[p.property], p.astylar);
      const member = { case: o.case, family: p.family, element: p.element, property: p.property,
        reference: p.reference, astylar: p.astylar, inputSha256: digest(input), proofSha256: o.proofSha256,
        originalCompleteRowSha256: p.canonicalRowSha256, classification: metadata(row) };
      observations.push(member); members.push(member);
    }
    if (members.length) groups.push({ ...metadata(row), family: p.family, element: p.element, property: p.property,
      reference: p.reference, astylar: p.astylar, originalCompleteRowSha256: p.canonicalRowSha256,
      occurrences: members.length, cases: members.slice(0, 12).map(o => o.case), reviewedCases: members.map(o => o.case),
      states: [...new Set(members.map(o => states.get(o.case)))] });
  }
  assert.equal(seen.size, binding.proposedObservations);
  return { observations, groups, coverage: { ...subset.coverage, sourceObservations: seen.size,
    suppliedObservations: observations.length, missingObservations,
    complete: subset.coverage.complete && !missingObservations.length },
    inputEquivalent: false, renderingEquivalent: false };
}

export function collectReviewedInputAuditInputs(report, { root = process.cwd(), parityPath } = {}) {
  const empty = { schemaVersion: 1, binding: { status: 'unbound' }, observations: [], groups: [] };
  if (!parityPath) return empty;
  try {
    // Source collectors currently resolve their own immutable artifacts from
    // cwd. Never silently mix a caller's root with a different checkout.
    assert.equal(realpathSync(root), realpathSync(process.cwd()), 'reviewed input replay requires the selected worktree cwd');
    const bytes = readArtifact(root, parityPath), supplied = JSON.parse(bytes);
    same(population(report), population(supplied), 'reviewed input caller differs from supplied capture');
    const bound = pinnedJson(root, bindingFile), staged = pinnedJson(root, transitionFile);
    const originalBytes = readArtifact(root, bound.report.originalCapture.file);
    assert.equal(hash(originalBytes), bound.report.originalCapture.sha256);
    bindOwnerCaretCaptureSubset(supplied, JSON.parse(originalBytes)); // fail before expensive source replay
    const replay = replayReviewedInputSourcePlans(bound.report.canonicalPayload);
    for (const [kind, descriptor] of Object.entries(replay.descriptors)) {
      const { completeJoinSha256: _join, sourceProofsReplayed: _flag, ...expected } = bound.report.plans[kind];
      same(descriptor, expected, 'current source receipts differ from pinned join');
      same(replay.plans[kind].proposed ?? replay.plans[kind].findings,
        bound.report.groups.filter(g => g.kind === kind).map(g => g.proposal), 'pinned proposal population changed');
    }
    return { schemaVersion: 1, binding: { status: 'bound',
      file: path.relative(root, path.resolve(root, parityPath)).replaceAll('\\', '/'), sha256: hash(bytes),
      originalCapture: replay.originalCapture, proposalBinding: bound.descriptor, transition: staged.descriptor,
      sourceProofsReplayed: true, sourcePlans: replay.descriptors,
      normalizationContracts: replay.normalizationContracts,
      frozenCanonicalJoinReplayedNow: false, frozenCanonicalJoinVerifiedAt: revision },
      ...projectReviewedInputAuditInputs(bound.report, staged.report, supplied, replay.original, replay.currentNormalize) };
  } catch (error) { return { ...empty, binding: { status: 'invalid', error: String(error) } }; }
}

export function reviewedInputClassificationContexts(evidence) {
  if (evidence?.binding?.status !== 'bound') return new Map();
  const entries = evidence.observations.map(o => [observationKey(o.case, o.element, o.property), o]);
  const contexts = new Map(entries); assert.equal(contexts.size, entries.length, 'duplicate reviewed context');
  return contexts;
}

export function classifyReviewedInput(input, property, reference, astylar, observation) {
  if (!observation) return undefined;
  assert.equal(input.id, observation.element); assert.equal(property, observation.property);
  assert.equal(reference, observation.reference); assert.equal(astylar, observation.astylar);
  assert.equal(digest(input), observation.inputSha256);
  const { recommendedOwner: owner, ...classification } = observation.classification;
  return { ...classification, owner };
}

export function validateReviewedInputAuditInputs(evidence, { root = process.cwd(), requireComplete = true } = {}) {
  try {
    assert.equal(evidence?.binding?.status, 'bound', 'reviewed inputs lack source binding');
    if (requireComplete) assert.equal(evidence.coverage.complete, true, 'reviewed input original population incomplete');
    const bytes = readArtifact(root, evidence.binding.file); assert.equal(hash(bytes), evidence.binding.sha256);
    const replay = collectReviewedInputAuditInputs(JSON.parse(bytes), { root, parityPath: evidence.binding.file });
    assert.equal(replay.binding.status, 'bound', replay.binding.error);
    same(evidence, replay, 'reviewed input evidence differs from independent source replay');
  } catch (error) { return [`reviewed input replay failed: ${error}`]; }
  return [];
}

// Invoke only after independent source validation. Expected membership comes
// from original inputs, never from whichever classified rows survived output.
export function validateReviewedInputClassifications(evidence, rows) {
  try {
    assert.equal(evidence?.binding?.status, 'bound', 'reviewed classifications lack source binding');
    const actual = rows.filter(r => reviewedInputAttributions.includes(r.attribution));
    assert.equal(actual.length, evidence.groups.length, 'reviewed group count changed');
    const byOriginal = new Map(actual.map(r => [r.reviewEvidence?.originalCompleteRowSha256, r]));
    assert.equal(byOriginal.size, actual.length, 'duplicate reviewed original group');
    for (const expected of evidence.groups) {
      const row = byOriginal.get(expected.originalCompleteRowSha256); assert.ok(row, 'reviewed source group missing');
      for (const key of [...metadataKeys, 'family', 'element', 'property', 'reference', 'astylar',
        'occurrences', 'cases', 'reviewedCases', 'states']) same(row[key], expected[key], `reviewed ${key} differs from source`);
    }
    assert.equal(actual.reduce((n, r) => n + r.occurrences, 0), evidence.coverage.suppliedObservations);
  } catch (error) { return [`reviewed input classification coverage failed: ${error}`]; }
  return [];
}
