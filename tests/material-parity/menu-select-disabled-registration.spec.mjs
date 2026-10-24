import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import { createHash } from 'node:crypto';
import { menuPendingSources, menuPendingProofRows, prepareMenuProducerRegistration, restoreMenuProducerRegistration,
  menuPendingFindingDefinitions, prepareMenuPolicyRegistration, restoreMenuPolicyRegistration } from './menu-select-disabled-registration.mjs';

test('pending policy registration conserves all193 definitions and binds three exact source anchors and receipts', () => {
  const file = 'tests/material-parity/input-equivalence-policy.mjs', original = readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
  const definitions = source => new Function(source.replace(/^export const /gm, 'const ') + ';return sourceAuditDefinitions;')();
  const before = definitions(original), prepared = prepareMenuPolicyRegistration(original), after = definitions(prepared);
  assert.equal(before.length, 193); assert.equal(after.length, 196); assert.equal(new Set(after.map(f => f.id)).size, 196);
  assert.deepEqual(after.slice(3), before); assert.deepEqual(after.slice(0,3), menuPendingFindingDefinitions);
  for (const finding of after.slice(0,3)) {
    assert.ok(finding.pattern.length > 0); assert.equal([...readFileSync(finding.file, 'utf8').matchAll(new RegExp(finding.pattern, 'g'))].length, 1);
    assert.ok(finding.evidence.length > 0);
    for (const receipt of finding.evidence) assert.equal(createHash('sha256').update(readFileSync(receipt.file)).digest('hex'), receipt.sha256);
    assert.ok(finding.owner && finding.classification && finding.justification && finding.focusedProof && finding.observation);
  }
  assert.equal(restoreMenuPolicyRegistration(prepared), original);
  assert.equal(readFileSync(file, 'utf8').replaceAll('\r\n', '\n'), original);
  assert.throws(() => prepareMenuPolicyRegistration(original + '\n'));
});

function inventory(source) {
  const ast = ts.createSourceFile('producer.mjs', source, 99, true, ts.ScriptKind.JS);
  assert.equal(ast.parseDiagnostics.length, 0);
  let sources = [], proofs = [];
  for (const fn of ast.statements.filter(ts.isFunctionDeclaration)) {
    const visit = n => {
      if (fn.name?.text === 'sourceFingerprints' && ts.isVariableDeclaration(n) && n.name.getText(ast) === 'files') sources = n.initializer.elements.map(e => e.text);
      if (fn.name?.text === 'focusedProofInventory' && ts.isCallExpression(n) && n.expression.getText(ast) === 'proof') proofs.push(n.getText(ast));
      ts.forEachChild(n, visit);
    }; visit(fn);
  }
  return { sources, proofs };
}
test('pending producer registration conserves complete frozen inventories and verifies every new proof declaration', () => {
  const file = 'tests/material-parity/input-equivalence-audit.mjs';
  const original = readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
  const before = inventory(original), prepared = prepareMenuProducerRegistration(original, readFileSync), after = inventory(prepared);
  assert.equal(before.sources.length, 1002); assert.equal(before.proofs.length, 326);
  assert.equal(after.sources.length, 1028); assert.equal(after.proofs.length, 352);
  assert.equal(new Set(after.sources).size, 1028);
  assert.deepEqual(after.sources.slice(26), before.sources); assert.deepEqual(after.proofs.slice(26), before.proofs);
  assert.deepEqual(after.sources.slice(0,26), menuPendingSources);
  for (const row of menuPendingProofRows(readFileSync)) assert.ok(new RegExp(row.pattern).test(readFileSync(row.file, 'utf8')));
  assert.equal(restoreMenuProducerRegistration(prepared, readFileSync), original);
  assert.equal(readFileSync(file, 'utf8').replaceAll('\r\n', '\n'), original);
});
test('pending registration rejects changed frozen producer or missing proof source', () => {
  const source = readFileSync('tests/material-parity/input-equivalence-audit.mjs');
  assert.throws(() => prepareMenuProducerRegistration(source.toString() + '\n', readFileSync));
  assert.throws(() => prepareMenuProducerRegistration(source, file => file.endsWith('menu-popup-ax.spec.mjs') ? Buffer.from('') : readFileSync(file)));
});
