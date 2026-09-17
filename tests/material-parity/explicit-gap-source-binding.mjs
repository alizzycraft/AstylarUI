import assert from 'node:assert/strict';
import { readFileSync, realpathSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { classifyExplicitGapComposition } from './explicit-gap-classification.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const proofFile = 'docs/material-explicit-gap-canonical-binding.json';
const proofRevision = '6af0ecd30f1a4a0c64639664546f312b20c5addd';
const verifier = 'scripts/audit-material-explicit-gap-composition.mjs';
const keyOf = e => `${e.kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`;
const ownerKey = (family, element) => JSON.stringify([family, element]);
const groupKey = (family, element, property) => JSON.stringify([family, element, property]);
const readArtifact = (root, file) => {
  const boundary = realpathSync(path.resolve(root, 'artifacts/material-parity'));
  const target = realpathSync(path.resolve(root, file)), relative = path.relative(boundary, target);
  assert.ok(relative && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative),
    'explicit gap source escapes Material artifacts');
  return readFileSync(target);
};

export function selectExplicitGapPopulation(report, proof) {
  const owners = new Set(proof.rows.map(row => ownerKey(row.family, row.element)));
  return [['static', report.results ?? []], ['interaction', report.interactions ?? []]]
    .flatMap(([kind, entries]) => entries.map(e => ({ kind, family: e.family, profile: e.profile,
      viewport: e.viewport, ...(e.state ? { state: e.state } : {}), inputTrees: e.inputTrees,
      styleInputs: (e.styleInputs ?? []).filter(input => owners.has(ownerKey(e.family, input.id))) })));
}

// Bind whole original scalar records, not selected properties or display samples.
// The caller separately authenticates/replays the existing complete composition
// proof. This function never changes the reference or supplies computed defaults.
export function bindExplicitGapPopulation(population, proof) {
  const groups = proof.rows, byGroup = new Map(groups.map(row =>
    [groupKey(row.family, row.element, row.property), row]));
  assert.equal(byGroup.size, groups.length, 'duplicate explicit gap proof group');
  const captures = [], observations = [], cases = new Set();
  for (const entry of population) {
    const caseId = keyOf(entry);
    assert.ok(!cases.has(caseId), 'duplicate explicit gap source case'); cases.add(caseId);
    assert.equal(new Set(entry.styleInputs.map(i => i.id)).size, entry.styleInputs.length,
      'duplicate explicit gap source owner');
    const selectedOwners = [];
    for (const input of entry.styleInputs) {
      selectedOwners.push({ element: input.id, inputSha256: hash(JSON.stringify(input)) });
      for (const property of ['columnGap', 'rowGap']) {
        const group = byGroup.get(groupKey(entry.family, input.id, property));
        assert.ok(group, 'missing explicit gap composition group');
        const matches = group.observations.filter(o => o.case === caseId);
        assert.equal(matches.length, 1, 'source case lacks unique existing composition proof');
        const observation = matches[0];
        assert.equal(observation.inputSha256, hash(JSON.stringify(input)), 'explicit gap source input changed');
        assert.deepEqual(observation.inputTrees, entry.inputTrees, 'explicit gap source trees changed');
        const context = { group, observation, family: entry.family, case: caseId, inputTrees: entry.inputTrees };
        assert.ok(classifyExplicitGapComposition(input, property, 'normal', group.candidate, context),
          'existing explicit gap proof cannot classify original input');
        observations.push({ case: caseId, family: entry.family, element: input.id, property,
          state: entry.state ?? 'static', inputSha256: observation.inputSha256, inputTrees: entry.inputTrees });
      }
    }
    const { styleInputs, ...capture } = entry;
    captures.push({ ...capture, case: caseId, selectedOwners });
  }
  const identity = o => JSON.stringify([o.case, o.family, o.element, o.property]);
  const present = new Set(observations.map(identity));
  const expected = groups.flatMap(group => group.observations.map(o => ({ case: o.case,
    family: group.family, element: group.element, property: group.property })));
  assert.equal(new Set(expected.map(identity)).size, expected.length, 'duplicate proof membership');
  const missing = expected.filter(o => !present.has(identity(o)));
  return { captures, observations, groups, coverage: { expectedObservations: expected.length,
    reviewedObservations: observations.length, missing, complete: missing.length === 0 } };
}

function loadReplayedProof(root) {
  const bytes = readFileSync(path.resolve(root, proofFile)), proof = JSON.parse(bytes);
  // The pinned binding already proves full canonical row hashes and memberships.
  // A changed report cannot authenticate itself by changing its own hash fields.
  const committed = execFileSync('git', ['show', `${proofRevision}:${proofFile}`],
    { cwd: root, maxBuffer: 4 * 1024 * 1024 });
  assert.deepEqual(proof, JSON.parse(committed), 'explicit gap binding differs from verified baseline');
  for (const source of proof.sourceFingerprints) assert.equal(
    hash(readFileSync(path.resolve(root, source.file), 'utf8').replaceAll('\r\n', '\n')), source.sha256,
    'explicit gap binding source changed');
  for (const source of [proof.composition, proof.join]) assert.equal(
    hash(readFileSync(path.resolve(root, source.file))), source.sha256, 'explicit gap proof source changed');
  const composition = JSON.parse(readFileSync(path.resolve(root, proof.composition.file)));
  assert.equal(composition.sourceFingerprint.file, verifier);
  assert.equal(hash(readFileSync(path.resolve(root, verifier), 'utf8').replaceAll('\r\n', '\n')),
    composition.sourceFingerprint.sha256, 'explicit gap composition verifier changed');
  // Reuse the original verifier unchanged. It reopens all trees and descendants,
  // validates every composition digest and retains all 40 negative controls.
  const output = execFileSync(process.execPath, [verifier, '--check'],
    { cwd: root, encoding: 'utf8', maxBuffer: 1024 * 1024 });
  const replay = JSON.parse(output.trim());
  assert.deepEqual(replay, { groups: 16, owners: 8, cases: 296, propertyObservations: 1032,
    negativeControls: 40, canonicalIntegration: false, canonicalUnchanged: true });
  return { proof, descriptor: { file: proofFile, sha256: hash(bytes), revision: proofRevision },
    verifier: { file: verifier, sha256: hash(readFileSync(path.resolve(root, verifier), 'utf8').replaceAll('\r\n', '\n')),
      result: replay } };
}

export function collectExplicitGapInputs(report, { root = process.cwd(), parityPath } = {}) {
  const empty = { schemaVersion: 1, binding: { status: 'unbound' }, captures: [], observations: [], groups: [] };
  if (!parityPath) return empty;
  try {
    const { proof, descriptor, verifier: replay } = loadReplayedProof(root);
    const bytes = readArtifact(root, parityPath), original = selectExplicitGapPopulation(JSON.parse(bytes), proof);
    assert.ok(isDeepStrictEqual(selectExplicitGapPopulation(report, proof), original), 'explicit gap population differs from source');
    const bound = bindExplicitGapPopulation(original, proof);
    return { schemaVersion: 1, binding: { status: 'bound',
      file: path.relative(root, path.resolve(root, parityPath)).replaceAll('\\', '/'), sha256: hash(bytes),
      proof: descriptor, verifier: replay }, ...bound };
  } catch (error) { return { ...empty, binding: { status: 'invalid', error: String(error) } }; }
}

export function validateExplicitGapInputs(evidence, { root = process.cwd(), requireComplete = true } = {}) {
  if (evidence?.binding?.status !== 'bound') return ['explicit gap lacks original source binding'];
  try {
    if (requireComplete) assert.equal(evidence.coverage?.complete, true, 'explicit gap complete proof population missing');
    const bytes = readArtifact(root, evidence.binding.file);
    assert.equal(hash(bytes), evidence.binding.sha256, 'explicit gap original capture digest changed');
    const replay = collectExplicitGapInputs(JSON.parse(bytes), { root, parityPath: evidence.binding.file });
    assert.equal(replay.binding.status, 'bound', replay.binding.error);
    if (requireComplete) assert.equal(replay.coverage.complete, true, 'explicit gap replay lacks complete proof population');
    assert.ok(isDeepStrictEqual(evidence, replay), 'explicit gap evidence differs from complete source replay');
  } catch (error) { return [`explicit gap source replay failed: ${error}`]; }
  return [];
}

export function explicitGapClassificationContexts(evidence) {
  const groups = new Map(evidence.groups.map(row => [groupKey(row.family, row.element, row.property), row]));
  return new Map(evidence.observations.map(o => {
    const group = groups.get(groupKey(o.family, o.element, o.property));
    return [JSON.stringify([o.case, o.element, o.property]), { group,
      observation: group?.observations.find(record => record.case === o.case),
      family: o.family, case: o.case, inputTrees: o.inputTrees }];
  }));
}
