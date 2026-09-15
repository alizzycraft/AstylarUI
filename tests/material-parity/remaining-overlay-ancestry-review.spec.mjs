import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { inspectOverlayOwnerDeclarations } from './overlay-owner-declaration-review.mjs';

const report = JSON.parse(readFileSync('docs/material-remaining-overlay-ancestry-review.json'));
const hash = value => createHash('sha256').update(value).digest('hex');
const read = d => { const b = readFileSync(d.file); assert.equal(hash(b), d.sha256); return JSON.parse(b); };
const source = read(report.source);
const groups = source.groups.filter(g => Object.keys(g.reasons).length === 1 && g.reasons['incomplete-surface-ancestry']);

test('remaining overlay index preserves all 48 groups and 1424 exact source observations', () => {
  assert.equal(report.groups.length, 48); assert.equal(report.observations, 1424);
  for (const [i, row] of report.groups.entries()) {
    const g = groups[i];
    for (const key of ['family', 'element', 'property', 'reference', 'candidateLocalDeclaration', 'occurrences'])
      assert.deepEqual(row[key], g[key]);
    assert.deepEqual(row.variants.flatMap(v => v.cases).sort(), [...g.cases].sort());
  }
  assert.equal(new Set(report.cases).size, 50);
  assert.equal(new Set(report.owners.map(o => JSON.stringify([o.case, o.element]))).size, 178);
  for (const item of report.patterns) assert.equal(hash(JSON.stringify(item.trace)), item.sha256);
  for (const f of report.sourceFingerprints)
    assert.equal(hash(readFileSync(f.file, 'utf8').replaceAll('\r\n', '\n')), f.sha256);
});

test('every declaration trace reproduces from its original hash-bound trees', () => {
  const trees = new Map();
  for (const owner of report.owners) if (!trees.has(owner.case))
    trees.set(owner.case, { reference: read(owner.inputTrees.reference), candidate: read(owner.inputTrees.astylar) });
  for (const group of report.groups) for (const variant of group.variants) for (const key of variant.cases) {
    const owner = report.owners.find(o => o.case === key && o.element === group.element);
    const { reference, candidate } = trees.get(key);
    assert.deepEqual(inspectOverlayOwnerDeclarations(group.property, owner.proof, reference, candidate), report.patterns[variant.pattern].trace);
  }
});

test('tooltip wrapping retains explicit nowrap and missing overflow-wrap rather than claiming initial omission', () => {
  for (const property of ['whiteSpace', 'overflowWrap']) {
    const group = report.groups.find(g => g.element === 'tooltip-popup' && g.property === property);
    assert.equal(group.occurrences, 18);
    assert.equal(group.reviewedFinding.classification, 'application-plugin-authoring-defect');
    assert.equal(group.reviewedFinding.originalVisualSymptomCauseProven, false);
    for (const variant of group.variants) {
      const trace = report.patterns[variant.pattern].trace;
      assert.equal(trace.referencePath[0].computed, property === 'whiteSpace' ? 'normal' : 'anywhere');
      assert.deepEqual(Object.values(trace.candidatePath[0].localValues), Array(3).fill(property === 'whiteSpace' ? 'nowrap' : '<omitted>'));
      if (property === 'whiteSpace') assert.ok(trace.candidatePath[0].possibleRules.some(r => r.selector === '#tooltip-popup' && r.declarations.whiteSpace === 'nowrap'));
      else {
        assert.ok(trace.referencePath[0].rules.some(r => r.active && r.selector === '.mat-mdc-tooltip-surface' && r.declarations['overflow-wrap']?.value === 'anywhere'));
        assert.ok(trace.candidatePath.every(n => Object.values(n.declarations).every(d => Object.keys(d).length === 0) && n.possibleRules.length === 0));
      }
    }
  }
  assert.equal(report.groups.filter(g => g.reviewedFinding).length, 2);
});

test('reference replay coverage does not hide the 18 tooltip context gaps or assert candidate equivalence', () => {
  const fresh = report.owners.filter(o => o.freshReferenceOwnerMatched), pending = report.owners.filter(o => !o.freshReferenceOwnerMatched);
  assert.equal(fresh.length, 160); assert.ok(fresh.every(o => o.family === 'dialog' && o.externalContext));
  assert.equal(pending.length, 18); assert.ok(pending.every(o => o.family === 'tooltip' && o.externalContext === null));
  assert.equal(report.identityNegativeControls, 356);
  for (const flag of ['canonicalAttributionChanged', 'candidateComputedVerified', 'renderingEquivalent']) assert.equal(report[flag], false);
});

test('candidate public wordWrap alias remains a relevant request rather than an omitted overflow-wrap', () => {
  const owner = report.owners.find(o => o.family === 'tooltip');
  const reference = read(owner.inputTrees.reference), candidate = read(owner.inputTrees.astylar);
  const node = candidate.nodes.find(n => n.key === owner.proof.candidateNode);
  node.resolvedStyle.wordWrap = 'anywhere';
  const result = inspectOverlayOwnerDeclarations('overflowWrap', owner.proof, reference, candidate);
  assert.equal(result.candidatePath[0].declarations.resolvedStyle.wordWrap, 'anywhere');
  assert.equal(result.hasRelevantRequest, true);
  assert.equal(result.candidateComputedVerified, false);
});
