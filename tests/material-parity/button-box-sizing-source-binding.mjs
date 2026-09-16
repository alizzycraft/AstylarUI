import assert from 'node:assert/strict';
import { readFileSync, realpathSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { inspectButtonBoxSizingInput } from './button-box-sizing-input-evidence.mjs';
import { selectedButtonInputs } from './button-pill-radius-evidence.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const keyOf = e => `${e.kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`;
const select = report => [['static', report.results ?? []], ['interaction', report.interactions ?? []]]
  .flatMap(([kind, rows]) => rows.map(e => ({ kind, family: e.family, profile: e.profile,
    viewport: e.viewport, ...(e.state ? { state: e.state } : {}), inputTrees: e.inputTrees,
    styleInputs: selectedButtonInputs(e),
    // Preserve absence, not merely a null/empty substitute. In particular, an
    // interaction's missing measurement must never acquire a static box.
    ...(Object.hasOwn(e, 'geometry') ? { geometry: e.geometry } : {}) })));
const read = (root, file) => {
  const boundary = realpathSync(path.resolve(root, 'artifacts/material-parity'));
  const target = realpathSync(path.resolve(root, file)), relative = path.relative(boundary, target);
  if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative))
    throw new Error('button box sizing source escapes Material artifacts');
  return readFileSync(target);
};

// Unlike the width-authoring receipt, this proof consumes measured geometry.
// Bind it to the reopened capture before considering any apparent agreement.
// All cases and both trees are retained, including the negative-owner cases.
export function collectButtonBoxSizingInputs(report, { root = process.cwd(), parityPath } = {}) {
  const empty = { schemaVersion: 1, binding: { status: 'unbound' }, captures: [], observations: [], groups: [] };
  if (!parityPath) return empty;
  try {
    const bytes = read(root, parityPath), original = select(JSON.parse(bytes));
    assert.deepEqual(select(report), original, 'button box sizing population/geometry differs from original capture');
    assert.ok(original.length > 0);
    assert.equal(new Set(original.map(keyOf)).size, original.length, 'duplicate button box sizing cases');
    const captures = [], observations = [];
    for (const entry of original) {
      const trees = {};
      for (const side of ['reference', 'astylar']) {
        const descriptor = entry.inputTrees?.[side], treeBytes = read(root, descriptor.file);
        assert.equal(hash(treeBytes), descriptor.sha256, 'button box sizing tree digest changed');
        trees[side] = JSON.parse(treeBytes);
      }
      const ids = entry.styleInputs.map(i => i.id);
      assert.equal(new Set(ids).size, ids.length, 'duplicate selected button box sizing owners');
      assert.deepEqual([...ids].sort(), trees.astylar.nodes.filter(n => n.authored?.class?.split(/\s+/)
        .includes('material-button')).map(n => n.authored.id).sort(), 'button box sizing class inventory differs');
      const { styleInputs, geometry, ...capture } = entry;
      captures.push({ ...capture, geometryPresent: Object.hasOwn(entry, 'geometry'),
        geometrySha256: Object.hasOwn(entry, 'geometry') ? hash(JSON.stringify(geometry)) : null,
        selectedOwners: styleInputs.map(input => ({ element: input.id, inputSha256: hash(JSON.stringify(input)) })) });
      for (const input of styleInputs) observations.push({ case: keyOf(entry), family: entry.family,
        profile: entry.profile, viewport: entry.viewport, state: entry.state ?? 'static',
        inputSha256: hash(JSON.stringify(input)),
        proof: inspectButtonBoxSizingInput(input, trees.reference, trees.astylar, entry) });
    }
    const groups = [];
    for (const o of observations) {
      const p = o.proof;
      let group = groups.find(g => g.family === o.family && g.element === p.element);
      if (!group) {
        group = { family: o.family, element: p.element, classification: p.classification, owner: p.owner,
          referenceBoxSizing: p.referenceBoxSizing, candidateAuthoredBoxSizing: p.candidateAuthoredBoxSizing,
          widthAuthoringEquivalent: false, inputEquivalent: false, renderingEquivalent: false,
          fullLayoutVerified: false, interactionGeometryVerified: false,
          reviewedCases: [], measuredCases: [], geometryGapCases: [], occurrences: 0 };
        groups.push(group);
      }
      group.reviewedCases.push(o.case); group.occurrences++;
      (p.observedDeclaredBorderBox ? group.measuredCases : group.geometryGapCases).push(o.case);
    }
    return { schemaVersion: 1, binding: { status: 'bound',
      file: path.relative(root, path.resolve(root, parityPath)).replaceAll('\\', '/'), sha256: hash(bytes) },
    captures, observations, groups };
  } catch (error) { return { ...empty, binding: { status: 'invalid', error: String(error) } }; }
}

export function validateButtonBoxSizingInputs(evidence, { root = process.cwd() } = {}) {
  if (evidence?.binding?.status !== 'bound') return ['button box sizing lacks original source binding'];
  try {
    const bytes = read(root, evidence.binding.file);
    if (hash(bytes) !== evidence.binding.sha256) return ['button box sizing original capture digest changed'];
    const replay = collectButtonBoxSizingInputs(JSON.parse(bytes), { root, parityPath: evidence.binding.file });
    if (replay.binding.status !== 'bound' || !isDeepStrictEqual(evidence, replay))
      return ['button box sizing evidence differs from complete original-source replay'];
  } catch (error) { return [`button box sizing source replay failed: ${error}`]; }
  return [];
}
