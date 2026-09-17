import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import ts from 'typescript';
import { inspectOwnerCaretInput } from './owner-caret-input-evidence.mjs';
import { classifyOwnerCaretInput } from './owner-caret-classification.mjs';
import { expectedOwnerCaretAttributionRows } from './owner-caret-attribution-coverage.mjs';

const proofFile = 'docs/material-owner-caret-attribution.json';
const proofRevision = '0c96500aebc010f8ba1209f1dda46c83ea01549e';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const digest = x => hash(JSON.stringify(x));
const signature = (family, element, reference) => JSON.stringify([family, element, reference]);
const caseKey = e => `${e.kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`;
const population = report => [['static', report.results ?? []], ['interaction', report.interactions ?? []]]
  .flatMap(([kind, entries]) => entries.map(e => ({ kind, family: e.family, profile: e.profile,
    viewport: e.viewport, ...(e.state ? { state: e.state } : {}), inputTrees: e.inputTrees, styleInputs: e.styleInputs })));
const equal = (a, b, message) => assert.ok(isDeepStrictEqual(a, b), message);
const artifact = (root, file) => {
  const boundary = realpathSync(path.resolve(root, 'artifacts/material-parity'));
  const target = realpathSync(path.resolve(root, file)), relative = path.relative(boundary, target);
  assert.ok(relative && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative),
    'caret evidence escapes Material artifacts');
  return readFileSync(target);
};

// Only these exact production functions are executed. The surrounding canonical
// builder can later import this binder without invalidating historical receipts.
// Any changed whole-module digest is recorded, never substituted into the parent.
export function bindOwnerCaretNormalization(source, descriptor) {
  const parsed = ts.createSourceFile(descriptor.module, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  assert.equal(parsed.parseDiagnostics.length, 0);
  const functions = descriptor.functions.map(name => {
    const nodes = parsed.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
    assert.equal(nodes.length, 1, 'production normalization function missing or duplicated');
    return nodes[0].getText(parsed);
  }).join('\n');
  assert.equal(hash(functions.replaceAll('\r\n', '\n')), descriptor.sha256, 'production caret normalization changed');
  return new Function(functions + '\nreturn canonicalStyle;')();
}

function loadProof(root) {
  const read = file => readFileSync(path.resolve(root, file));
  const committed = (revision, file) => JSON.parse(execFileSync('git', ['show', `${revision}:${file}`],
    { cwd: root, maxBuffer: 16 * 1024 * 1024 }));
  const bytes = read(proofFile), proof = JSON.parse(bytes);
  equal(proof, committed(proofRevision, proofFile), 'pinned caret attribution changed');
  const parentBytes = read(proof.parent.file), parent = JSON.parse(parentBytes);
  assert.equal(hash(parentBytes), proof.parent.sha256);
  equal(parent, committed(proof.parent.revision, proof.parent.file), 'pinned caret parent changed');
  const sourceChecks = new Map();
  for (const s of [...parent.sourceFingerprints, ...proof.sourceFingerprints]) {
    if (sourceChecks.has(s.file)) assert.equal(sourceChecks.get(s.file).recorded, s.sha256);
    const current = hash(read(s.file).toString('utf8').replaceAll('\r\n', '\n'));
    if (s.file !== parent.productionNormalization.module) assert.equal(current, s.sha256, `caret dependency changed: ${s.file}`);
    sourceChecks.set(s.file, { file: s.file, recorded: s.sha256, current,
      verification: s.file === parent.productionNormalization.module ? 'exact-executed-normalization-functions' : 'complete-source' });
  }
  const normalize = bindOwnerCaretNormalization(read(parent.productionNormalization.module).toString('utf8'), parent.productionNormalization);
  return { proof, parent, normalize, binding: { proof: { file: proofFile, sha256: hash(bytes), revision: proofRevision },
    parent: proof.parent, sources: [...sourceChecks.values()], productionNormalization: parent.productionNormalization } };
}

export function collectOwnerCaretInputs(report, { root = process.cwd(), parityPath } = {}) {
  const empty = { schemaVersion: 1, binding: { status: 'unbound' }, observations: [], captures: [] };
  if (!parityPath) return empty;
  try {
    const { proof, parent, normalize, binding } = loadProof(root);
    const bytes = artifact(root, parityPath); assert.equal(hash(bytes), proof.capture.sha256, 'original caret capture changed');
    const raw = JSON.parse(bytes), original = population(raw);
    equal(population(report), original, 'caret caller population differs from original capture');
    const groups = new Map(proof.findings.map(g => [signature(g.family, g.element, g.reference), g]));
    const observed = new Map(proof.findings.map(g => [signature(g.family, g.element, g.reference), []]));
    assert.equal(groups.size, proof.findings.length);
    const observations = [], captures = [];
    for (const entry of original) {
      const key = caseKey(entry), selected = entry.styleInputs.flatMap(input => {
        const reference = normalize(input.reference ?? {}).caretColor;
        if (normalize(input.astylar ?? {}).caretColor !== undefined) return [];
        const group = groups.get(signature(entry.family, input.id, reference));
        return group ? [{ input, reference, group }] : [];
      });
      if (!selected.length) continue;
      const trees = Object.fromEntries(['reference', 'astylar'].map(side => {
        const descriptor = entry.inputTrees[side], data = artifact(root, descriptor.file);
        assert.equal(hash(data), descriptor.sha256, 'original caret tree changed'); return [side, JSON.parse(data)];
      }));
      captures.push({ case: key, inputTrees: entry.inputTrees });
      for (const { input, reference, group } of selected) {
        const members = observed.get(signature(entry.family, input.id, reference));
        const saved = group.observations[members.length]; assert.ok(saved); assert.equal(saved.case, key);
        const p = inspectOwnerCaretInput(input, trees.reference, trees.astylar, { family: entry.family });
        assert.equal(digest(input), saved.inputSha256); assert.equal(digest(p), saved.proofSha256);
        const observation = { case: key, family: entry.family, profile: entry.profile, viewport: entry.viewport,
          state: entry.state ?? 'static', reference, inputSha256: digest(input), proofSha256: digest(p), proof: p };
        const classification = classifyOwnerCaretInput(input, 'caretColor', reference, undefined, observation) ?? null;
        equal(classification, saved.classification, 'complete original caret classification changed');
        observations.push(observation); members.push(key);
      }
    }
    for (const [key, group] of groups) equal(observed.get(key), group.observations.map(o => o.case), 'caret membership incomplete');
    equal(captures, parent.cases, 'caret selected-case inventory changed');
    // Independent scalar membership/output join also verifies raw omission and
    // every saved observation field outside classification/proof reconstruction.
    const plannedCoverage = expectedOwnerCaretAttributionRows(proof, parent, raw, normalize);
    return { schemaVersion: 1, binding: { status: 'bound', file: path.relative(root, path.resolve(root, parityPath)).replaceAll('\\', '/'),
      sha256: hash(bytes), ...binding }, captures, observations, plannedCoverage };
  } catch (error) { return { ...empty, binding: { status: 'invalid', error: String(error) } }; }
}

export function validateOwnerCaretInputs(evidence, { root = process.cwd() } = {}) {
  if (evidence?.binding?.status !== 'bound') return ['caret evidence lacks original source binding'];
  try {
    const bytes = artifact(root, evidence.binding.file); assert.equal(hash(bytes), evidence.binding.sha256);
    const replay = collectOwnerCaretInputs(JSON.parse(bytes), { root, parityPath: evidence.binding.file });
    assert.equal(replay.binding.status, 'bound', replay.binding.error);
    equal(evidence, replay, 'caret evidence differs from complete original-source replay');
  } catch (error) { return [`caret source replay failed: ${error}`]; }
  return [];
}

export function ownerCaretClassificationContexts(evidence) {
  assert.equal(evidence.binding?.status, 'bound', 'caret classification requires source binding');
  const contexts = new Map(evidence.observations.map(o => [JSON.stringify([o.case, o.proof.element, 'caretColor']), o]));
  assert.equal(contexts.size, evidence.observations.length, 'duplicate caret context');
  return contexts;
}
