import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { replayFollowupInputSourcePlans } from './followup-input-source-replay.mjs';
import { bindOwnerCaretCaptureSubset } from './owner-caret-audit-source-binding.mjs';
import { projectReviewedInputAuditInputs, reviewedInputClassificationContexts, classifyReviewedInput }
  from './reviewed-input-audit-source-binding.mjs';
import { followupInputAttributions } from './followup-input-proposal-transition.mjs';

const hash = x => createHash('sha256').update(x).digest('hex');
const same = (a, b, message) => assert.ok(isDeepStrictEqual(a, b), message);
const transitionFile = 'docs/material-followup-input-transition-dry-run.json';
const transitionRevision = 'a30dfa3';
const originalFile = 'artifacts/material-parity/current-ancestry-audit/latest-report.json';
const originalSha256 = 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a';
const population = report => Object.fromEntries(['results', 'interactions'].map(kind => [kind,
  (report[kind] ?? []).map(e => ({ family: e.family, profile: e.profile, viewport: e.viewport,
    state: e.state, inputTrees: e.inputTrees, styleInputs: e.styleInputs }))]));
function readArtifact(root, file) {
  const boundary = realpathSync(path.resolve(root, 'artifacts/material-parity'));
  const target = realpathSync(path.resolve(root, file)), relative = path.relative(boundary, target);
  assert.ok(relative && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative),
    'followup capture escapes Material artifacts');
  return readFileSync(target);
}

// The already-tested generic projection validates original subset membership,
// complete-row/proposal hashes, raw scalar values, and the metadata transition.
// Its caller must independently authenticate these objects first.
export const projectFollowupInputAuditInputs = projectReviewedInputAuditInputs;
export const followupInputClassificationContexts = reviewedInputClassificationContexts;
export const classifyFollowupInput = classifyReviewedInput;

export function collectFollowupInputAuditInputs(report, { root = process.cwd(), parityPath } = {}) {
  const empty = { schemaVersion: 1, binding: { status: 'unbound' }, observations: [], groups: [] };
  if (!parityPath) return empty;
  try {
    assert.equal(realpathSync(root), realpathSync(process.cwd()), 'followup source replay requires selected worktree cwd');
    const bytes = readArtifact(root, parityPath), supplied = JSON.parse(bytes);
    same(population(report), population(supplied), 'followup caller differs from supplied capture');
    const originalBytes = readArtifact(root, originalFile);
    assert.equal(hash(originalBytes), originalSha256);
    bindOwnerCaretCaptureSubset(supplied, JSON.parse(originalBytes));
    const transitionBytes = readFileSync(path.resolve(root, transitionFile), 'utf8').replaceAll('\r\n', '\n');
    const committed = execFileSync('git', ['show', `${transitionRevision}:${transitionFile}`],
      { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }).replaceAll('\r\n', '\n');
    assert.equal(transitionBytes, committed, 'followup transition differs from verified commit');
    const transition = JSON.parse(transitionBytes), replay = replayFollowupInputSourcePlans();
    assert.equal(transition.binding.sha256, replay.proposalBinding.sha256);
    return { schemaVersion: 1, binding: { status: 'bound',
      file: path.relative(root, path.resolve(root, parityPath)).replaceAll('\\', '/'), sha256: hash(bytes),
      originalCapture: replay.originalCapture, proposalBinding: replay.proposalBinding,
      transition: { file: transitionFile, revision: transitionRevision, sha256: hash(transitionBytes) },
      sourceProofsReplayed: true, sourcePlans: replay.descriptors,
      normalizationContracts: replay.normalizationContracts,
      frozenCanonicalJoinReplayedNow: false, frozenCanonicalJoinVerifiedAt: transitionRevision },
      ...projectFollowupInputAuditInputs(replay.binding, transition, supplied, replay.original, replay.normalize) };
  } catch (error) { return { ...empty, binding: { status: 'invalid', error: String(error) } }; }
}

export function validateFollowupInputAuditInputs(evidence, { root = process.cwd(), requireComplete = true } = {}) {
  try {
    assert.equal(evidence?.binding?.status, 'bound', 'followup inputs lack source binding');
    if (requireComplete) assert.equal(evidence.coverage.complete, true, 'followup original population incomplete');
    const bytes = readArtifact(root, evidence.binding.file);
    assert.equal(hash(bytes), evidence.binding.sha256);
    const replay = collectFollowupInputAuditInputs(JSON.parse(bytes), { root, parityPath: evidence.binding.file });
    assert.equal(replay.binding.status, 'bound', replay.binding.error);
    same(evidence, replay, 'followup evidence differs from independent source replay');
  } catch (error) { return [`followup input replay failed: ${error}`]; }
  return [];
}

// Use only after source validation. Expected counts and memberships originate
// in the authenticated input population, not in surviving output rows.
export function validateFollowupInputClassifications(evidence, rows) {
  try {
    assert.equal(evidence?.binding?.status, 'bound', 'followup classifications lack source binding');
    const actual = rows.filter(r => followupInputAttributions.includes(r.attribution));
    assert.equal(actual.length, evidence.groups.length, 'followup group count changed');
    const byOriginal = new Map(actual.map(r => [r.reviewEvidence?.originalCompleteRowSha256, r]));
    assert.equal(byOriginal.size, actual.length, 'duplicate followup original group');
    for (const expected of evidence.groups) {
      const row = byOriginal.get(expected.originalCompleteRowSha256);
      assert.ok(row, 'followup source group missing');
      for (const key of ['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence',
        'family', 'element', 'property', 'reference', 'astylar', 'occurrences', 'cases', 'reviewedCases', 'states'])
        same(row[key], expected[key], `followup ${key} differs from source`);
    }
    assert.equal(actual.reduce((n, r) => n + r.occurrences, 0), evidence.coverage.suppliedObservations);
  } catch (error) { return [`followup input classification coverage failed: ${error}`]; }
  return [];
}
