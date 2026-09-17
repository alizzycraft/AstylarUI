import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { classifyGapReview } from './gap-review-classification.mjs';

const proofFile = 'docs/material-gap-review-membership.json';
const proofRevision = '8c03c9f3c09bba73f0c92f278c6412e0de1f8aaa';
const verifier = 'scripts/bind-material-gap-review-membership.mjs';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const ownerKey = (family, element) => JSON.stringify([family, element]);
const groupKey = (family, element, property) => JSON.stringify([family, element, property]);
const caseKey = e => `${e.kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`;
const identity = o => JSON.stringify([o.case, o.family, o.element, o.property]);
const artifact = (root, file) => {
  const boundary = realpathSync(path.resolve(root, 'artifacts/material-parity'));
  const target = realpathSync(path.resolve(root, file)), relative = path.relative(boundary, target);
  assert.ok(relative && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative),
    'gap review source escapes Material artifacts');
  return readFileSync(target);
};

export function selectGapReviewPopulation(report, proof) {
  const owners = new Set(proof.rows.map(row => ownerKey(row.family, row.element)));
  return [['static', report.results ?? []], ['interaction', report.interactions ?? []]].flatMap(([kind, entries]) =>
    entries.map(e => ({ kind, family: e.family, profile: e.profile, viewport: e.viewport,
      ...(e.state ? { state: e.state } : {}), inputTrees: e.inputTrees,
      styleInputs: (e.styleInputs ?? []).filter(input => owners.has(ownerKey(e.family, input.id))) })));
}

// This joins complete original scalar records to independently replayed evidence;
// it does not recalculate CSS, classify unresolved motion or replace raw values.
export function bindGapReviewPopulation(population, proof) {
  const groups = proof.rows, byGroup = new Map(groups.map(g => [groupKey(g.family, g.element, g.property), g]));
  assert.equal(byGroup.size, groups.length, 'duplicate gap review group');
  const captures = [], observations = [], seen = new Set();
  for (const entry of population) {
    const caseId = caseKey(entry); assert.ok(!seen.has(caseId), 'duplicate gap review case'); seen.add(caseId);
    assert.equal(new Set(entry.styleInputs.map(i => i.id)).size, entry.styleInputs.length, 'duplicate gap review owner');
    const selectedOwners = [];
    for (const input of entry.styleInputs) {
      const inputSha256 = hash(JSON.stringify(input)); selectedOwners.push({ element: input.id, inputSha256 });
      for (const property of ['columnGap', 'rowGap']) {
        const group = byGroup.get(groupKey(entry.family, input.id, property)); assert.ok(group, 'missing gap review group');
        const matches = group.observations.filter(o => o.case === caseId);
        assert.equal(matches.length, 1, 'source case lacks unique gap review membership');
        const observation = matches[0];
        assert.equal(inputSha256, observation.inputSha256, 'gap review original scalar changed');
        assert.deepEqual(entry.inputTrees, observation.inputTrees, 'gap review original trees changed');
        const result = classifyGapReview(input, property, 'normal', undefined,
          { group, observation, family: entry.family, case: caseId, inputTrees: entry.inputTrees });
        if (group.reviewDisposition === 'requires-review') assert.equal(result, undefined, 'unresolved motion upgraded');
        else assert.ok(result, 'verified gap review cannot classify original input');
        observations.push({ case: caseId, family: entry.family, element: input.id, property,
          state: entry.state ?? 'static', inputSha256, inputTrees: entry.inputTrees,
          reviewDisposition: group.reviewDisposition, attributable: Boolean(result) });
      }
    }
    const { styleInputs, ...capture } = entry;
    captures.push({ ...capture, case: caseId, selectedOwners });
  }
  const present = new Set(observations.map(identity));
  assert.equal(present.size, observations.length, 'duplicate gap review observation');
  const expected = groups.flatMap(g => g.observations.map(o => ({ case: o.case,
    family: g.family, element: g.element, property: g.property })));
  assert.equal(new Set(expected.map(identity)).size, expected.length, 'duplicate gap review proof membership');
  const missing = expected.filter(o => !present.has(identity(o)));
  return { captures, observations, groups, coverage: { expectedObservations: expected.length,
    reviewedObservations: observations.length, attributableObservations: observations.filter(o => o.attributable).length,
    unresolvedObservations: observations.filter(o => !o.attributable).length, missing, complete: missing.length === 0 } };
}

function loadReplayedProof(root) {
  const bytes = readFileSync(path.resolve(root, proofFile)), proof = JSON.parse(bytes);
  const committed = execFileSync('git', ['show', `${proofRevision}:${proofFile}`], { cwd: root, maxBuffer: 8 * 1024 * 1024 });
  assert.deepEqual(proof, JSON.parse(committed), 'gap review binding changed from verified original membership');
  for (const source of proof.sources) assert.equal(hash(readFileSync(path.resolve(root, source.file))), source.sha256,
    'gap review dependency changed');
  assert.equal(proof.sourceFingerprint.file, verifier);
  assert.equal(hash(readFileSync(path.resolve(root, verifier), 'utf8').replaceAll('\r\n', '\n')),
    proof.sourceFingerprint.sha256, 'gap review verifier changed');
  // Existing CLI reopens the original canonical join and all original tree
  // reviews, including motion and scalar-layer negative controls. No duplicate
  // CSS or composition proof is implemented here.
  const result = JSON.parse(execFileSync(process.execPath, [verifier, '--check'],
    { cwd: root, encoding: 'utf8', maxBuffer: 1024 * 1024 }).trim());
  assert.deepEqual(result, { groups: 38, observations: 1902, cases: 676, motionNonGapGroups: 32,
    scalarLayerLossGroups: 4, unresolvedMotionGroups: 2, canonicalUnchanged: true, canonicalIntegration: false });
  return { proof, descriptor: { file: proofFile, sha256: hash(bytes), revision: proofRevision },
    verifier: { ...proof.sourceFingerprint, result } };
}

export function collectGapReviewInputs(report, { root = process.cwd(), parityPath } = {}) {
  const empty = { schemaVersion: 1, binding: { status: 'unbound' }, captures: [], observations: [], groups: [] };
  if (!parityPath) return empty;
  try {
    const { proof, descriptor, verifier: replay } = loadReplayedProof(root);
    const bytes = artifact(root, parityPath), original = selectGapReviewPopulation(JSON.parse(bytes), proof);
    assert.ok(isDeepStrictEqual(selectGapReviewPopulation(report, proof), original), 'gap review population differs from source');
    return { schemaVersion: 1, binding: { status: 'bound',
      file: path.relative(root, path.resolve(root, parityPath)).replaceAll('\\', '/'), sha256: hash(bytes),
      proof: descriptor, verifier: replay }, ...bindGapReviewPopulation(original, proof) };
  } catch (error) { return { ...empty, binding: { status: 'invalid', error: String(error) } }; }
}

export function validateGapReviewInputs(evidence, { root = process.cwd(), requireComplete = true } = {}) {
  if (evidence?.binding?.status !== 'bound') return ['gap review lacks original source binding'];
  try {
    if (requireComplete) assert.equal(evidence.coverage?.complete, true, 'gap review complete proof population missing');
    const bytes = artifact(root, evidence.binding.file);
    assert.equal(hash(bytes), evidence.binding.sha256, 'gap review original capture digest changed');
    const replay = collectGapReviewInputs(JSON.parse(bytes), { root, parityPath: evidence.binding.file });
    assert.equal(replay.binding.status, 'bound', replay.binding.error);
    if (requireComplete) assert.equal(replay.coverage.complete, true, 'gap review replay lacks complete proof population');
    assert.ok(isDeepStrictEqual(evidence, replay), 'gap review evidence differs from complete source replay');
  } catch (error) { return [`gap review source replay failed: ${error}`]; }
  return [];
}

export function gapReviewClassificationContexts(evidence) {
  const groups = new Map(evidence.groups.map(g => [groupKey(g.family, g.element, g.property), g]));
  return new Map(evidence.observations.map(o => {
    const group = groups.get(groupKey(o.family, o.element, o.property));
    return [JSON.stringify([o.case, o.element, o.property]), { group,
      observation: group?.observations.find(r => r.case === o.case), family: o.family, case: o.case, inputTrees: o.inputTrees }];
  }));
}
