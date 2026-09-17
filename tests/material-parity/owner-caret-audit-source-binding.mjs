import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { collectOwnerCaretInputs } from './owner-caret-source-binding.mjs';
import { classifyOwnerCaretInput } from './owner-caret-classification.mjs';

const hash = x => createHash('sha256').update(x).digest('hex');
const digest = x => hash(JSON.stringify(x));
const caseKey = e => `${e.kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`;
const ownerKey = (c, id) => JSON.stringify([c, id]);
const groupKey = (family, id, reference) => JSON.stringify([family, id, reference]);
const equal = (a, b, message) => assert.ok(isDeepStrictEqual(a, b), message);
export const ownerCaretOriginalCapture = 'artifacts/material-parity/current-ancestry-audit/latest-report.json';
const entries = r => [['static', r.results ?? []], ['interaction', r.interactions ?? []]].flatMap(([kind, xs]) =>
  xs.map(e => ({ kind, family: e.family, profile: e.profile, viewport: e.viewport,
    ...(e.state ? { state: e.state } : {}), inputTrees: e.inputTrees, styleInputs: e.styleInputs })));
const metadata = ({ styleInputs, ...e }) => e;
const artifact = (root, file) => {
  const boundary = realpathSync(path.resolve(root, 'artifacts/material-parity'));
  const target = realpathSync(path.resolve(root, file)), relative = path.relative(boundary, target);
  assert.ok(relative && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative),
    'caret audit capture escapes Material artifacts');
  return readFileSync(target);
};

// Subsets may remove entire measured owners/cases, never alter their content or
// order. Explicitly enumerate what is missing; counts are not an opt-out switch.
export function bindOwnerCaretCaptureSubset(report, original) {
  const source = entries(original), supplied = entries(report);
  const byCase = new Map(source.map((e, index) => [caseKey(e), { e, index }]));
  assert.equal(byCase.size, source.length, 'duplicate original case');
  const presentCases = new Set(), presentInputs = new Set(), inputs = new Map(); let previous = -1;
  for (const e of supplied) {
    const key = caseKey(e), record = byCase.get(key); assert.ok(record, 'unknown source case');
    assert.ok(!presentCases.has(key), 'duplicate supplied case'); presentCases.add(key);
    assert.ok(record.index > previous, 'source case order changed'); previous = record.index;
    equal(metadata(e), metadata(record.e), 'original case metadata changed');
    const owners = new Map(record.e.styleInputs.map((input, index) => [input.id, { input, index }]));
    assert.equal(owners.size, record.e.styleInputs.length, 'duplicate original owner');
    let lastOwner = -1;
    for (const input of e.styleInputs) {
      const owner = owners.get(input.id); assert.ok(owner, 'unknown source owner');
      assert.ok(owner.index > lastOwner, 'source owner order changed or duplicated'); lastOwner = owner.index;
      equal(input, owner.input, 'original scalar input changed');
      const id = ownerKey(key, input.id); presentInputs.add(id); inputs.set(id, input);
    }
  }
  const allInputs = source.flatMap(e => e.styleInputs.map(input => ({ case: caseKey(e), element: input.id })));
  assert.equal(new Set(allInputs.map(o => ownerKey(o.case, o.element))).size, allInputs.length);
  const missingCases = source.map(caseKey).filter(c => !presentCases.has(c));
  const missingInputs = allInputs.filter(o => !presentInputs.has(ownerKey(o.case, o.element)));
  return { inputs, coverage: { sourceCases: source.length, suppliedCases: supplied.length,
    sourceInputs: allInputs.length, suppliedInputs: presentInputs.size, missingCases, missingInputs,
    complete: !missingCases.length && !missingInputs.length } };
}

// The full argument must come from the authenticated complete source collector.
// This pure projection is independently replayed by the public validator below.
export function projectOwnerCaretAuditInputs(full, report, original) {
  assert.equal(full.binding.status, 'bound');
  const subset = bindOwnerCaretCaptureSubset(report, original);
  const observations = full.observations.filter(o => subset.inputs.has(ownerKey(o.case, o.proof.element)));
  const missingObservations = full.observations.filter(o => !subset.inputs.has(ownerKey(o.case, o.proof.element)))
    .map(o => ({ case: o.case, family: o.family, element: o.proof.element, reference: o.reference }));
  const byGroup = new Map();
  for (const o of observations) {
    const key = groupKey(o.family, o.proof.element, o.reference);
    if (!byGroup.has(key)) byGroup.set(key, []); byGroup.get(key).push(o);
  }
  const projectRows = (rows, pending) => rows.flatMap(row => {
    const members = byGroup.get(groupKey(row.family, row.element, row.reference)) ?? [];
    if (!members.length) return [];
    const classifications = members.map(o => classifyOwnerCaretInput(subset.inputs.get(ownerKey(o.case, o.proof.element)),
      'caretColor', o.reference, undefined, o));
    if (pending) assert.ok(classifications.every(c => c === undefined), 'pending source observation promoted');
    else assert.ok(classifications.every(c => c?.attribution === row.attribution && c.justification === row.justification),
      'subset classification differs from original complete review');
    return [{ ...row, occurrences: members.length, reviewedCases: members.map(o => o.case),
      cases: members.slice(0, 12).map(o => o.case), states: [...new Set(members.map(o => o.state))],
      ...(!pending ? { reviewEvidence: classifications[0].reviewEvidence } : {}) }];
  });
  const rows = projectRows(full.plannedCoverage.rows, false), pending = projectRows(full.plannedCoverage.pending, true);
  const count = xs => xs.reduce((n, r) => n + r.occurrences, 0);
  assert.equal(count(rows) + count(pending), observations.length, 'subset observations lost in grouping');
  const selectedCases = new Set(observations.map(o => o.case));
  return { captures: full.captures.filter(c => selectedCases.has(c.case)), observations,
    coverage: { ...subset.coverage, sourceObservations: full.observations.length, suppliedObservations: observations.length,
      missingObservations, complete: subset.coverage.complete && !missingObservations.length },
    plannedCoverage: { ...full.plannedCoverage, rows, pending, reviewedGroups: rows.length,
      reviewedObservations: count(rows), pendingGroups: pending.length, pendingObservations: count(pending),
      scope: 'authenticated-supplied-capture', completeSourceCasesScanned: full.plannedCoverage.originalCasesScanned } };
}

export function collectOwnerCaretAuditInputs(report, { root = process.cwd(), parityPath } = {}) {
  const empty = { schemaVersion: 1, binding: { status: 'unbound' }, observations: [], captures: [] };
  if (!parityPath) return empty;
  try {
    const bytes = artifact(root, parityPath), supplied = JSON.parse(bytes);
    equal(entries(report), entries(supplied), 'caret caller differs from supplied capture');
    const originalBytes = artifact(root, ownerCaretOriginalCapture), original = JSON.parse(originalBytes);
    bindOwnerCaretCaptureSubset(supplied, original); // reject changed inputs before the expensive full proof replay
    const full = collectOwnerCaretInputs(original, { root, parityPath: ownerCaretOriginalCapture });
    assert.equal(full.binding.status, 'bound', full.binding.error);
    assert.equal(hash(originalBytes), full.binding.sha256);
    return { schemaVersion: 1, binding: { status: 'bound',
      file: path.relative(root, path.resolve(root, parityPath)).replaceAll('\\', '/'), sha256: hash(bytes),
      completeSource: full.binding, completeObservationsSha256: digest(full.observations) },
    ...projectOwnerCaretAuditInputs(full, supplied, original) };
  } catch (error) { return { ...empty, binding: { status: 'invalid', error: String(error) } }; }
}

export function validateOwnerCaretAuditInputs(evidence, { root = process.cwd(), requireComplete = true } = {}) {
  if (evidence?.binding?.status !== 'bound') return ['caret audit lacks original source binding'];
  try {
    if (requireComplete) assert.equal(evidence.coverage?.complete, true, 'caret audit complete original population missing');
    const bytes = artifact(root, evidence.binding.file); assert.equal(hash(bytes), evidence.binding.sha256);
    const replay = collectOwnerCaretAuditInputs(JSON.parse(bytes), { root, parityPath: evidence.binding.file });
    assert.equal(replay.binding.status, 'bound', replay.binding.error);
    equal(evidence, replay, 'caret audit evidence differs from authenticated source replay');
    if (requireComplete) assert.equal(replay.coverage.complete, true);
  } catch (error) { return [`caret audit replay failed: ${error}`]; }
  return [];
}
