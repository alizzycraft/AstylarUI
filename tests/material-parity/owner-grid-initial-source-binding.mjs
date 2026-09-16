import assert from 'node:assert/strict';
import { readFileSync, realpathSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { inspectOwnerGridInitial, ownerGridInitialProperties } from './owner-grid-initial-evidence.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const keyOf = e => `${e.kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`;
const selected = entry => (entry.styleInputs ?? []).flatMap(input => ownerGridInitialProperties
  .filter(property => input.reference?.[property] === 'none' && input.astylar &&
    !Object.hasOwn(input.astylar, property)).map(property => ({ input, property })));
const population = report => [['static', report.results ?? []], ['interaction', report.interactions ?? []]]
  .flatMap(([kind, entries]) => entries.map(e => ({ kind, family: e.family, profile: e.profile,
    viewport: e.viewport, ...(e.state ? { state: e.state } : {}), inputTrees: e.inputTrees, selected: selected(e) })));
const read = (root, file) => {
  const boundary = realpathSync(path.resolve(root, 'artifacts/material-parity'));
  const target = realpathSync(path.resolve(root, file)), relative = path.relative(boundary, target);
  assert.ok(relative && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative),
    'owner grid original source escapes Material artifacts');
  return readFileSync(target);
};

// This source ledger describes an observation-stage difference only. It does
// not substitute a computed value for an omitted declaration, dispatch layout,
// or waive independent differences on a mapped owner.
export function collectOwnerGridInitialInputs(report, { root = process.cwd(), parityPath } = {}) {
  const empty = { schemaVersion: 1, binding: { status: 'unbound' }, captures: [], observations: [], groups: [] };
  if (!parityPath) return empty;
  try {
    const bytes = read(root, parityPath), original = population(JSON.parse(bytes));
    assert.ok(isDeepStrictEqual(population(report), original), 'owner grid population differs from original capture');
    assert.ok(original.length > 0);
    assert.equal(new Set(original.map(keyOf)).size, original.length, 'duplicate owner grid case');
    const captures = [], observations = [];
    for (const entry of original) {
      const key = keyOf(entry), selection = entry.selected.map(({ input, property }) =>
        ({ element: input.id, property, inputSha256: hash(JSON.stringify(input)) }));
      assert.equal(new Set(selection.map(o => JSON.stringify([o.element, o.property]))).size, selection.length,
        'duplicate selected owner grid property');
      captures.push({ case: key, inputTrees: entry.inputTrees, selected: selection });
      const trees = {};
      for (const side of ['reference', 'astylar']) {
        const descriptor = entry.inputTrees?.[side], treeBytes = read(root, descriptor.file);
        assert.equal(hash(treeBytes), descriptor.sha256, 'owner grid tree digest changed');
        trees[side] = JSON.parse(treeBytes);
      }
      for (const { input, property } of entry.selected) observations.push({ case: key, family: entry.family,
        profile: entry.profile, viewport: entry.viewport, state: entry.state ?? 'static',
        inputSha256: hash(JSON.stringify(input)), proof: inspectOwnerGridInitial(input, property, trees.reference, trees.astylar) });
    }
    const groups = [];
    for (const o of observations) {
      let group = groups.find(g => g.family === o.family && g.element === o.proof.element && g.property === o.proof.property);
      if (!group) {
        group = { family: o.family, element: o.proof.element, property: o.proof.property,
          reviewedCases: [], gapCases: [], reasons: {} };
        groups.push(group);
      }
      (o.proof.disposition === 'captured-none-versus-local-omission' ? group.reviewedCases : group.gapCases).push(o.case);
      for (const reason of new Set(o.proof.issues.map(i => i.reason))) group.reasons[reason] = (group.reasons[reason] ?? 0) + 1;
    }
    return { schemaVersion: 1, binding: { status: 'bound',
      file: path.relative(root, path.resolve(root, parityPath)).replaceAll('\\', '/'), sha256: hash(bytes) },
    captures, observations, groups };
  } catch (error) { return { ...empty, binding: { status: 'invalid', error: String(error) } }; }
}

export function validateOwnerGridInitialInputs(evidence, { root = process.cwd() } = {}) {
  if (evidence?.binding?.status !== 'bound') return ['owner grid lacks original source binding'];
  try {
    const bytes = read(root, evidence.binding.file);
    if (hash(bytes) !== evidence.binding.sha256) return ['owner grid original capture digest changed'];
    const replay = collectOwnerGridInitialInputs(JSON.parse(bytes), { root, parityPath: evidence.binding.file });
    if (replay.binding.status !== 'bound' || !isDeepStrictEqual(evidence, replay))
      return ['owner grid evidence differs from complete original-source replay'];
  } catch (error) { return [`owner grid source replay failed: ${error}`]; }
  return [];
}
