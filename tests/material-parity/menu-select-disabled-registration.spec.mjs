import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import { menuPendingSources, menuPendingProofRows, prepareMenuProducerRegistration, restoreMenuProducerRegistration } from './menu-select-disabled-registration.mjs';

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
  assert.equal(after.sources.length, 1028); assert.equal(after.proofs.length, 351);
  assert.equal(new Set(after.sources).size, 1028);
  assert.deepEqual(after.sources.slice(26), before.sources); assert.deepEqual(after.proofs.slice(25), before.proofs);
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
