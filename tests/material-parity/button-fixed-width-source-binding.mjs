import assert from 'node:assert/strict';
import { readFileSync, realpathSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { inspectButtonFixedWidth } from './button-fixed-width-evidence.mjs';
import { selectedButtonInputs } from './button-pill-radius-evidence.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const keyOf = e => `${e.kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`;
const select = report => [['static', report.results ?? []], ['interaction', report.interactions ?? []]]
  .flatMap(([kind, rows]) => rows.map(e => ({ kind, family: e.family, profile: e.profile,
    viewport: e.viewport, ...(e.state ? { state: e.state } : {}), inputTrees: e.inputTrees,
    styleInputs: selectedButtonInputs(e) })));
const read = (root, file) => {
  const boundary = realpathSync(path.resolve(root, 'artifacts/material-parity'));
  const target = realpathSync(path.resolve(root, file)), relative = path.relative(boundary, target);
  if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative))
    throw new Error('button fixed width source escapes Material artifacts');
  return readFileSync(target);
};

// This ledger deliberately precedes scalar-difference filtering. Fixed versus
// omitted width is unequal authoring even when normalized measured values match.
// Full inputs are compared with the reopened report before compact hashes are
// retained; the evidence does not duplicate complete style captures per finding.
export function collectButtonFixedWidthInputs(report, { root = process.cwd(), parityPath } = {}) {
  const empty = { schemaVersion: 1, binding: { status: 'unbound' }, captures: [], observations: [], groups: [] };
  if (!parityPath) return empty;
  try {
    const bytes = read(root, parityPath), original = select(JSON.parse(bytes));
    assert.deepEqual(select(report), original, 'button fixed width population differs from original capture');
    assert.ok(original.length > 0);
    assert.equal(new Set(original.map(keyOf)).size, original.length, 'duplicate button fixed width cases');
    const captures = [], observations = [];
    for (const entry of original) {
      const trees = {};
      for (const side of ['reference', 'astylar']) {
        const descriptor = entry.inputTrees?.[side], treeBytes = read(root, descriptor.file);
        assert.equal(hash(treeBytes), descriptor.sha256, 'button fixed width tree digest changed');
        trees[side] = JSON.parse(treeBytes);
      }
      const ids = entry.styleInputs.map(i => i.id);
      assert.equal(new Set(ids).size, ids.length, 'duplicate selected button width owners');
      assert.deepEqual([...ids].sort(), trees.astylar.nodes.filter(n => n.authored?.class?.split(/\s+/)
        .includes('material-button')).map(n => n.authored.id).sort(), 'button width class inventory differs');
      const { styleInputs, ...capture } = entry;
      captures.push({ ...capture, selectedOwners: styleInputs.map(input => ({
        element: input.id, inputSha256: hash(JSON.stringify(input)) })) });
      for (const input of styleInputs) observations.push({ case: keyOf(entry), family: entry.family,
        state: entry.state ?? 'static', element: input.id, inputSha256: hash(JSON.stringify(input)),
        proof: inspectButtonFixedWidth(input, trees.reference, trees.astylar) });
    }
    const groups = [];
    for (const o of observations) {
      const p = o.proof;
      const values = { family: o.family, element: o.element, referenceAuthoredWidth: p.referenceAuthoredWidth,
        referenceComputedWidth: p.referenceComputedWidth, candidateAuthoredWidth: p.candidateAuthoredWidth,
        candidateLocalWidth: p.candidateLocalWidth };
      let group = groups.find(g => Object.entries(values).every(([k, v]) => g[k] === v));
      if (!group) {
        group = { ...values, classification: p.classification, owner: p.owner,
          inputEquivalent: false, candidateUsedLayoutVerified: false, originalRasterCauseProven: false,
          structuralEquivalenceVerified: false, renderingEquivalent: false, reviewedCases: [], states: [], occurrences: 0 };
        groups.push(group);
      }
      group.reviewedCases.push(o.case); group.occurrences++;
      if (!group.states.includes(o.state)) group.states.push(o.state);
    }
    return { schemaVersion: 1, binding: { status: 'bound',
      file: path.relative(root, path.resolve(root, parityPath)).replaceAll('\\', '/'), sha256: hash(bytes) },
    captures, observations, groups };
  } catch (error) { return { ...empty, binding: { status: 'invalid', error: String(error) } }; }
}

export function validateButtonFixedWidthInputs(evidence, { root = process.cwd() } = {}) {
  if (evidence?.binding?.status !== 'bound') return ['button fixed width lacks original source binding'];
  try {
    const bytes = read(root, evidence.binding.file);
    if (hash(bytes) !== evidence.binding.sha256) return ['button fixed width original capture digest changed'];
    const replay = collectButtonFixedWidthInputs(JSON.parse(bytes), { root, parityPath: evidence.binding.file });
    if (replay.binding.status !== 'bound' || !isDeepStrictEqual(evidence, replay))
      return ['button fixed width evidence differs from complete original-source replay'];
  } catch (error) { return [`button fixed width source replay failed: ${error}`]; }
  return [];
}
