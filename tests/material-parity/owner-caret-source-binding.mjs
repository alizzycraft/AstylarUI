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
import { restoreMappingReadAdapterSource } from './audit-evidence-session.mjs';
import { borderEvidenceBaseline, verifyBorderEvidenceSourceTransition } from './position-composition-producer-transition.mjs';

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
  const moduleFile = parent.productionNormalization.module;
  const historicalSource = execFileSync('git', ['show', `${proof.parent.revision}:${moduleFile}`],
    { cwd: root, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
  const historicalSha256 = hash(historicalSource.replaceAll('\r\n', '\n'));
  const sourceChecks = new Map();
  for (const s of [...parent.sourceFingerprints, ...proof.sourceFingerprints]) {
    if (sourceChecks.has(s.file)) assert.equal(sourceChecks.get(s.file).recorded, s.sha256);
    const currentBytes = read(s.file), current = hash(currentBytes.toString('utf8').replaceAll('\r\n', '\n'));
    const mappingAdapter = s.file === 'tests/material-parity/generated-node-mapping-evidence.mjs' && current !== s.sha256;
    const borderTransition = s.file === 'tests/material-parity/border-initial-input-evidence.mjs' && current !== s.sha256;
    if (mappingAdapter) restoreMappingReadAdapterSource(s, currentBytes);
    else if (borderTransition) {
      const historical = execFileSync('git', ['show', `${borderEvidenceBaseline}:${s.file}`], { cwd: root });
      const transition = verifyBorderEvidenceSourceTransition(historical, currentBytes);
      assert.equal(transition.historicalSha256, s.sha256);
    }
    else if (s.file !== parent.productionNormalization.module) assert.equal(current, s.sha256, `caret dependency changed: ${s.file}`);
    else assert.equal(historicalSha256, s.sha256, 'historical caret module changed');
    sourceChecks.set(s.file, { file: s.file, recorded: s.sha256, current,
      verification: s.file === moduleFile ? 'historical-replay-and-current-value-revalidation'
        : mappingAdapter ? 'exact-reader-import-transition-with-complete-mapping-source-conserved'
        : borderTransition ? 'authenticated-border-extension-with-shared-selector-conserved' : 'complete-source' });
  }
  const historicalNormalize = bindOwnerCaretNormalization(historicalSource, parent.productionNormalization);
  // This is the reviewed precision-preserving normalizer, not a replacement hash
  // for the immutable historical proof. Both contracts are executed separately.
  const productionNormalization = { ...parent.productionNormalization,
    sha256: '27fcf8d751bb10a5a7e9426a4d21b83de3c0d9242387d75a67613b953940c773' };
  const normalize = bindOwnerCaretNormalization(read(moduleFile).toString('utf8'), productionNormalization);
  return { proof, parent, normalize, historicalNormalize,
    binding: { proof: { file: proofFile, sha256: hash(bytes), revision: proofRevision },
      parent: proof.parent, sources: [...sourceChecks.values()], productionNormalization,
      historicalNormalization: { ...parent.productionNormalization, revision: proof.parent.revision, moduleSha256: historicalSha256 } } };
}

function reprojectCaretCoverage(historical, records) {
  const byHistorical = new Map();
  for (const record of records) {
    const o = record.observation, key = signature(o.family, o.proof.element, o.historicalReference);
    if (!byHistorical.has(key)) byHistorical.set(key, []);
    byHistorical.get(key).push(record);
  }
  const seen = new Set();
  const project = (rows, pending) => rows.flatMap(row => {
    const members = byHistorical.get(signature(row.family, row.element, row.reference));
    assert.ok(members); equal(members.map(r => r.observation.case), row.reviewedCases, 'caret projection lost historical membership');
    const groups = new Map();
    for (const record of members) {
      const { observation: o, classification: c } = record;
      if (pending) assert.equal(c, null, 'pending caret observation promoted');
      else assert.ok(c?.attribution === row.attribution && c.justification === row.justification);
      if (!groups.has(o.reference)) groups.set(o.reference, []);
      groups.get(o.reference).push(record);
    }
    return [...groups].map(([reference, group]) => {
      const identity = signature(row.family, row.element, reference);
      assert.ok(!seen.has(identity), 'current caret groups unexpectedly merged'); seen.add(identity);
      const observations = group.map(r => r.observation);
      return { ...row, reference, occurrences: observations.length, reviewedCases: observations.map(o => o.case),
        cases: observations.slice(0, 12).map(o => o.case), states: [...new Set(observations.map(o => o.state))],
        ...(!pending ? { reviewEvidence: group[0].classification.reviewEvidence } : {}) };
    });
  });
  const rows = project(historical.rows, false), pending = project(historical.pending, true);
  const count = xs => xs.reduce((n, row) => n + row.occurrences, 0);
  assert.equal(count(rows), historical.reviewedObservations);
  assert.equal(count(pending), historical.pendingObservations);
  assert.equal(count(rows) + count(pending), records.length);
  return { ...historical, rows, pending, reviewedGroups: rows.length, pendingGroups: pending.length };
}

export function collectOwnerCaretInputs(report, { root = process.cwd(), parityPath } = {}) {
  const empty = { schemaVersion: 1, binding: { status: 'unbound' }, observations: [], captures: [] };
  if (!parityPath) return empty;
  try {
    const { proof, parent, normalize, historicalNormalize, binding } = loadProof(root);
    const bytes = artifact(root, parityPath); assert.equal(hash(bytes), proof.capture.sha256, 'original caret capture changed');
    const raw = JSON.parse(bytes), original = population(raw);
    equal(population(report), original, 'caret caller population differs from original capture');
    const groups = new Map(proof.findings.map(g => [signature(g.family, g.element, g.reference), g]));
    const observed = new Map(proof.findings.map(g => [signature(g.family, g.element, g.reference), []]));
    assert.equal(groups.size, proof.findings.length);
    const observations = [], captures = [], currentRecords = [];
    for (const entry of original) {
      const key = caseKey(entry), selected = entry.styleInputs.flatMap(input => {
        const reference = historicalNormalize(input.reference ?? {}).caretColor;
        if (historicalNormalize(input.astylar ?? {}).caretColor !== undefined) return [];
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
        assert.equal(normalize(input.astylar ?? {}).caretColor, undefined, 'current caret omission changed');
        const current = { ...observation, historicalReference: reference,
          reference: normalize(input.reference ?? {}).caretColor };
        assert.equal(typeof current.reference, 'string', 'current reference caret value missing');
        const currentClassification = classifyOwnerCaretInput(input, 'caretColor', current.reference, undefined, current) ?? null;
        equal(currentClassification, saved.classification, 'caret classification changed under precise normalization');
        observations.push(current); currentRecords.push({ observation: current, classification: currentClassification }); members.push(key);
      }
    }
    for (const [key, group] of groups) equal(observed.get(key), group.observations.map(o => o.case), 'caret membership incomplete');
    equal(captures, parent.cases, 'caret selected-case inventory changed');
    // Independent scalar membership/output join also verifies raw omission and
    // every saved observation field outside classification/proof reconstruction.
    const historicalCoverage = expectedOwnerCaretAttributionRows(proof, parent, raw, historicalNormalize);
    const plannedCoverage = reprojectCaretCoverage(historicalCoverage, currentRecords);
    return { schemaVersion: 1, binding: { status: 'bound', file: path.relative(root, path.resolve(root, parityPath)).replaceAll('\\', '/'),
      sha256: hash(bytes), ...binding }, captures, observations, historicalCoverage, plannedCoverage };
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
