import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { collectOwnerCaretInputs, bindOwnerCaretNormalization, ownerCaretClassificationContexts } from './owner-caret-source-binding.mjs';
import { classifyOwnerCaretInput } from './owner-caret-classification.mjs';
import { projectOwnerCaretAuditInputs } from './owner-caret-audit-source-binding.mjs';

const parityPath = 'artifacts/material-parity/current-ancestry-audit/latest-report.json';
const raw = JSON.parse(readFileSync(parityPath));
const proof = JSON.parse(readFileSync('docs/material-owner-caret-attribution.json'));
const parent = JSON.parse(readFileSync(proof.parent.file));
const source = readFileSync(parent.productionNormalization.module, 'utf8');
const evidence = collectOwnerCaretInputs(raw, { parityPath });
assert.equal(evidence.binding.status, 'bound', evidence.binding.error);
const changed = evidence.observations.filter(o => o.reference !== o.historicalReference);
const key = (caseId, family, element) => JSON.stringify([caseId, family, element]);
const inputs = new Map();
for (const [kind, entries] of [['static', raw.results], ['interaction', raw.interactions]]) for (const entry of entries) {
  const caseId = `${kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`;
  for (const input of entry.styleInputs) inputs.set(key(caseId, entry.family, input.id), input);
}

test('historical caret evidence remains authenticated while precise current values replace rounded values', () => {
  assert.throws(() => bindOwnerCaretNormalization(source, parent.productionNormalization), /normalization changed/);
  assert.equal(evidence.binding.historicalNormalization.revision, proof.parent.revision);
  assert.deepEqual(evidence.binding.historicalNormalization.functions, parent.productionNormalization.functions);
  assert.equal(evidence.observations.length, 4050); assert.equal(changed.length, 92);
  assert.deepEqual([evidence.plannedCoverage.reviewedGroups, evidence.plannedCoverage.reviewedObservations,
    evidence.plannedCoverage.pendingGroups, evidence.plannedCoverage.pendingObservations], [118, 3154, 27, 896]);
  const transition = JSON.parse(readFileSync('docs/material-color-normalization-transition.json'));
  const expected = transition.findings.filter(r => r.property === 'caretColor').flatMap(r =>
    r.cases.map(c => [key(c, r.family, r.element), r.before.reference, r.after.reference]));
  const actual = changed.map(o => [key(o.case, o.family, o.proof.element), o.historicalReference, o.reference]);
  assert.deepEqual(actual.sort(), expected.sort());
  assert.equal(new Set(changed.map(o => JSON.stringify([o.family, o.proof.element, o.historicalReference, o.reference]))).size, 10);
});

test('all 4050 current classifications retain their exact historical proof and raw input evidence', () => {
  const normalize = bindOwnerCaretNormalization(source, evidence.binding.productionNormalization);
  let reviewed = 0, pending = 0;
  for (const o of evidence.observations) {
    const input = inputs.get(key(o.case, o.family, o.proof.element)); assert.ok(input);
    const group = proof.findings.find(r => r.family === o.family && r.element === o.proof.element && r.reference === o.historicalReference);
    assert.ok(group);
    const saved = group.observations.find(r => r.case === o.case); assert.ok(saved);
    assert.equal(o.inputSha256, saved.inputSha256); assert.equal(o.proofSha256, saved.proofSha256);
    assert.equal(o.reference, normalize(input.reference).caretColor);
    assert.equal(normalize(input.astylar).caretColor, undefined);
    const result = classifyOwnerCaretInput(input, 'caretColor', o.reference, undefined, o) ?? null;
    assert.deepEqual(result, saved.classification);
    if (result) reviewed++; else pending++;
    if (o.reference !== o.historicalReference)
      assert.equal(classifyOwnerCaretInput(input, 'caretColor', o.historicalReference, undefined, o), undefined);
  }
  assert.equal(reviewed, 3154); assert.equal(pending, 896);
  assert.equal(ownerCaretClassificationContexts(evidence).size, 4050);
});

test('current full and subset projections conserve original memberships without hiding normalization changes', () => {
  const projected = projectOwnerCaretAuditInputs(evidence, raw, raw);
  assert.deepEqual(projected.plannedCoverage.rows, evidence.plannedCoverage.rows);
  assert.deepEqual(projected.plannedCoverage.pending, evidence.plannedCoverage.pending);
  assert.equal(projected.coverage.complete, true);
  const selected = new Set(changed.map(o => key(o.case, o.family, o.proof.element)));
  const subset = { ...raw };
  for (const [field, kind] of [['results', 'static'], ['interactions', 'interaction']]) subset[field] = raw[field].flatMap(entry => {
    const caseId = `${kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`;
    const styleInputs = entry.styleInputs.filter(input => selected.has(key(caseId, entry.family, input.id)));
    return styleInputs.length ? [{ ...entry, styleInputs }] : [];
  });
  const partial = projectOwnerCaretAuditInputs(evidence, subset, raw);
  assert.equal(partial.observations.length, 92); assert.equal(partial.coverage.missingObservations.length, 3958);
  assert.equal(partial.coverage.complete, false);
  assert.ok(partial.observations.every(o => o.reference !== o.historicalReference));
  const stale = structuredClone(evidence); stale.observations.find(o => o.reference !== o.historicalReference).reference = 'stale';
  assert.throws(() => projectOwnerCaretAuditInputs(stale, raw, raw), /observations lost in grouping/);
  const summary = { observations: 4050, changedObservations: 92, changedGroups: 10,
    reviewedObservations: 3154, pendingObservations: 896,
    transitionSha256: createHash('sha256').update(JSON.stringify(changed.map(o =>
      [o.case, o.family, o.proof.element, o.historicalReference, o.reference, o.inputSha256, o.proofSha256]))).digest('hex'),
    canonicalReportRegenerated: false, rendererChanged: false };
  console.log(JSON.stringify(summary));
});
