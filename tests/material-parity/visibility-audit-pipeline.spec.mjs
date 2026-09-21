import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { isDeepStrictEqual } from 'node:util';
import test from 'node:test';
import ts from 'typescript';
import { collectStyleDiscrepancies } from './input-equivalence-audit.mjs';
import { collectVisibilityAuditInputs, applyVisibilityAuditRows, validateVisibilityAuditClassifications,
  visibilityObservationAttribution, verifyVisibilityAuditModuleTransition } from './visibility-audit-source-binding.mjs';

test('whole producer transition accepts only the exact visibility integration', () => {
  const file = 'tests/material-parity/input-equivalence-audit.mjs';
  const previous = execFileSync('git', ['show', `c090e1b:${file}`], { maxBuffer: 4 * 1024 * 1024 });
  const current = readFileSync(file, 'utf8');
  const proof = verifyVisibilityAuditModuleTransition(previous, current);
  assert.equal(proof.wholeModuleConserved, true);
  assert.equal(proof.restoredSource, previous.toString().replaceAll('\r\n', '\n'));
  for (const changed of [current + '\n// unrelated edit\n',
    current.replace('options.parityPath });\n  const discrepancies = applyVisibilityAuditRows', 'undefined });\n  const discrepancies = applyVisibilityAuditRows'),
    current.replace('const discrepancies = applyVisibilityAuditRows(unreviewedDiscrepancies, visibilityAuditInputs)', 'const discrepancies = unreviewedDiscrepancies'),
    current.replace('function reviewedButtonPaintInput(', 'function changedPaintInput('),
    current.replace("    'tests/material-parity/visibility-audit-pipeline.spec.mjs',", ''),
    current.replace('    visibilityAuditInputs,', '    visibilityAuditInputs: {},'),
    current.replace('[visibilityObservationAttribution], validateVisibilityAuditInputs', '[], validateVisibilityAuditInputs'),
  ]) {
    assert.ok(changed !== current, 'negative control must actually mutate the source');
    assert.throws(() => verifyVisibilityAuditModuleTransition(previous, changed));
  }
  assert.throws(() => verifyVisibilityAuditModuleTransition(previous + ' ', current));
});

test('actual aggregation accepts only the 15 complete visibility predecessors and conserves other rows', () => {
  const parityPath = 'artifacts/material-parity/current-ancestry-audit/latest-report.json';
  const original = JSON.parse(readFileSync(parityPath));
  const evidence = collectVisibilityAuditInputs(original, { parityPath });
  assert.equal(evidence.binding.status, 'bound', evidence.binding.error);
  const file = 'tests/material-parity/input-equivalence-audit.mjs';
  const ast = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const declaration = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'collectStyleDiscrepancies');
  const names = declaration.parameters.map(p => p.name.text);
  const cases = [['static', original.results], ['interaction', original.interactions]]
    .flatMap(([kind, entries]) => entries.map(e => ({ ...e, kind })));
  // Other proof populations are absent identically before/after. This isolates
  // production aggregation; full canonical conservation is a separate gate.
  const before = collectStyleDiscrepancies(...names.map(n => n === 'cases' ? cases
    : Object.assign([], { observations: [], comparisons: [], differences: [], groups: [] })));
  const beforeSnapshot = structuredClone(before), after = applyVisibilityAuditRows(before, evidence);
  assert.deepEqual(before, beforeSnapshot); assert.equal(after.length, before.length);
  const metadata = new Set(['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']);
  const raw = row => Object.fromEntries(Object.entries(row).filter(([k]) => !metadata.has(k)));
  let changed = 0;
  for (let i = 0; i < before.length; i++) {
    if (isDeepStrictEqual(before[i], after[i])) continue;
    assert.equal(before[i].attribution, 'unresolved');
    assert.equal(after[i].attribution, visibilityObservationAttribution);
    assert.deepEqual(raw(before[i]), raw(after[i])); changed++;
  }
  assert.equal(changed, 15);
  assert.deepEqual(validateVisibilityAuditClassifications(evidence, after), []);
  const index = before.findIndex(r => r.property === 'visibility' && r.family === 'chips');
  for (const mutate of [r => r.splice(index, 1), r => r.push(structuredClone(r[index])),
    r => { r[index].reference = 'hidden'; }, r => { r[index].attribution = 'another-review'; },
    r => { r[index].referenceAuthoredExamples = []; r[index].unexpected = true; }]) {
    const changed = structuredClone(before); mutate(changed);
    assert.throws(() => applyVisibilityAuditRows(changed, evidence));
  }
  console.log(JSON.stringify({ rows: before.length, changedGroups: changed, observations: 530,
    unchangedCompleteRows: before.length - changed, canonicalCoverageProven: false }));
});
