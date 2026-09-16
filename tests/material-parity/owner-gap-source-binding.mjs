import assert from 'node:assert/strict';
import { readFileSync, realpathSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { inspectOwnerGapInput, ownerGapProperties } from './owner-gap-input-evidence.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const keyOf = entry => `${entry.kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`;
const selected = entry => (entry.styleInputs ?? []).flatMap(input => ownerGapProperties
  .filter(property => input.reference?.[property] === 'normal' && input.astylar &&
    !Object.hasOwn(input.astylar, property)).map(property => ({ input, property })));
const population = report => [['static', report.results ?? []], ['interaction', report.interactions ?? []]]
  .flatMap(([kind, entries]) => entries.map(entry => ({ kind, family: entry.family, profile: entry.profile,
    viewport: entry.viewport, ...(entry.state ? { state: entry.state } : {}),
    inputTrees: entry.inputTrees, selected: selected(entry) })));
const read = (root, file) => {
  const boundary = realpathSync(path.resolve(root, 'artifacts/material-parity'));
  const target = realpathSync(path.resolve(root, file)), relative = path.relative(boundary, target);
  assert.ok(relative && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative),
    'owner gap source escapes Material artifacts');
  return readFileSync(target);
};

// Collect all eligible original observations, including explicit shorthand,
// motion and mapping gaps. A missing local longhand is not a computed zero.
// Selection does not depend on the saved audit's classifications or fixture IDs.
export function collectOwnerGapInputs(report, { root = process.cwd(), parityPath } = {}) {
  const empty = { schemaVersion: 1, binding: { status: 'unbound' }, captures: [], observations: [], groups: [] };
  if (!parityPath) return empty;
  try {
    const bytes = read(root, parityPath), original = population(JSON.parse(bytes));
    assert.ok(isDeepStrictEqual(population(report), original), 'owner gap population differs from original capture');
    assert.ok(original.length > 0);
    assert.equal(new Set(original.map(keyOf)).size, original.length, 'duplicate owner gap case');
    const captures = [], observations = [];
    for (const entry of original) {
      const key = keyOf(entry), selection = entry.selected.map(({ input, property }) =>
        ({ element: input.id, property, inputSha256: hash(JSON.stringify(input)) }));
      assert.equal(new Set(selection.map(o => JSON.stringify([o.element, o.property]))).size, selection.length,
        'duplicate selected owner gap property');
      captures.push({ case: key, inputTrees: entry.inputTrees, selected: selection });
      if (!selection.length) continue;
      const trees = {};
      for (const side of ['reference', 'astylar']) {
        const descriptor = entry.inputTrees?.[side], treeBytes = read(root, descriptor.file);
        assert.equal(hash(treeBytes), descriptor.sha256, 'owner gap tree digest changed');
        trees[side] = JSON.parse(treeBytes);
      }
      for (const { input, property } of entry.selected) observations.push({ case: key, family: entry.family,
        profile: entry.profile, viewport: entry.viewport, state: entry.state ?? 'static',
        inputSha256: hash(JSON.stringify(input)),
        proof: inspectOwnerGapInput(input, property, trees.reference, trees.astylar, { family: entry.family }) });
    }
    const groups = new Map();
    for (const o of observations) {
      const key = JSON.stringify([o.family, o.proof.element, o.proof.property]);
      if (!groups.has(key)) groups.set(key, { family: o.family, element: o.proof.element,
        property: o.proof.property, reviewedCases: [], gapCases: [], reasons: {} });
      const group = groups.get(key);
      (o.proof.disposition === 'captured-normal-versus-local-omission' ? group.reviewedCases : group.gapCases).push(o.case);
      for (const reason of new Set(o.proof.issues.map(i => i.reason)))
        group.reasons[reason] = (group.reasons[reason] ?? 0) + 1;
    }
    return { schemaVersion: 1, binding: { status: 'bound',
      file: path.relative(root, path.resolve(root, parityPath)).replaceAll('\\', '/'), sha256: hash(bytes) },
    captures, observations, groups: [...groups.values()] };
  } catch (error) { return { ...empty, binding: { status: 'invalid', error: String(error) } }; }
}

export function validateOwnerGapInputs(evidence, { root = process.cwd() } = {}) {
  if (evidence?.binding?.status !== 'bound') return ['owner gap lacks original source binding'];
  try {
    const bytes = read(root, evidence.binding.file);
    if (hash(bytes) !== evidence.binding.sha256) return ['owner gap original capture digest changed'];
    const replay = collectOwnerGapInputs(JSON.parse(bytes), { root, parityPath: evidence.binding.file });
    if (replay.binding.status !== 'bound' || !isDeepStrictEqual(evidence, replay))
      return ['owner gap evidence differs from complete original-source replay'];
  } catch (error) { return [`owner gap source replay failed: ${error}`]; }
  return [];
}
