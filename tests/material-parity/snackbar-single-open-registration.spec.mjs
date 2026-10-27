import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import ts from 'typescript';
import { createSnackbarHistoricalRead, snackbarHistoricalSources, prepareSnackbarSingleOpenRegistry,
  restoreSnackbarSingleOpenRegistry, snackbarSingleOpenSources, snackbarSingleOpenProofs } from './snackbar-single-open-registration.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
test('staged snackbar registration preserves every accepted source and proof', () => {
  const file = 'tests/material-parity/input-equivalence-audit.mjs';
  const before = readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
  const staged = prepareSnackbarSingleOpenRegistry(before);
  assert.equal(restoreSnackbarSingleOpenRegistry(staged), before);
  const arrays = source => {
    const tree = ts.createSourceFile('producer.mjs', source, 99, true);
    assert.equal(tree.parseDiagnostics.length, 0);
    return Object.fromEntries(['sourceFingerprints', 'focusedProofInventory', 'implementationPlan'].map(name => {
      const fn = tree.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
      let array; const visit = n => { if (!array && ts.isArrayLiteralExpression(n)) array = n; ts.forEachChild(n, visit); }; visit(fn);
      return [name, array.elements.map(n => n.getText(tree))];
    }));
  };
  const prior = arrays(before), next = arrays(staged);
  assert.equal(prior.sourceFingerprints.length, 1099); assert.equal(prior.focusedProofInventory.length, 425);
  assert.equal(next.sourceFingerprints.length, 1104); assert.equal(next.focusedProofInventory.length, 431);
  assert.deepEqual(next.sourceFingerprints.slice(5), prior.sourceFingerprints);
  assert.deepEqual(next.focusedProofInventory.slice(6), prior.focusedProofInventory);
  assert.deepEqual(next.implementationPlan, prior.implementationPlan);
  const files = next.sourceFingerprints.map(text => new Function(`return ${text}`)());
  assert.equal(new Set(files).size, files.length); assert.deepEqual(files.slice(0, 5), snackbarSingleOpenSources);
  const proof = (_root, file, pattern, title) => {
    assert.equal([...readFileSync(file, 'utf8').matchAll(new RegExp(pattern.source, 'g'))].length, 1);
    return [file, title];
  };
  assert.deepEqual(next.focusedProofInventory.slice(0, 6).map(text => new Function('proof', 'root', `return ${text}`)(proof, '.')), snackbarSingleOpenProofs);
  assert.throws(() => prepareSnackbarSingleOpenRegistry(before + '\n// drift'));
  assert.throws(() => restoreSnackbarSingleOpenRegistry(staged + '\n// drift'));
  assert.equal(readFileSync(file, 'utf8').replaceAll('\r\n', '\n'), before);
});
test('snackbar historical reader authenticates all five source transitions without changing live inputs', () => {
  const root = process.cwd(), read = createSnackbarHistoricalRead({ root, read: readFileSync });
  const nested = createSnackbarHistoricalRead({ root, read });
  for (const [file, previous, current] of snackbarHistoricalSources) {
    const before = readFileSync(file);
    assert.equal(hash(before.toString().replaceAll('\r\n', '\n')), current);
    for (const reader of [read, nested]) {
      assert.equal(hash(reader(file)), previous);
      assert.equal(hash(reader(path.resolve(file), 'utf8')), previous);
      assert.equal(hash(reader(file, { encoding: 'utf8' })), previous);
    }
    assert.deepEqual(readFileSync(file), before);
    const bad = createSnackbarHistoricalRead({ root, read: (name, options) =>
      path.resolve(root, name) === path.resolve(root, file) ? Buffer.from(before.toString() + '\n// drift') : readFileSync(name, options) });
    assert.throws(() => bad(file), /Unrecognized snackbar source/);
  }
  const untouched = 'scripts/join-material-snackbar-single-open.mjs';
  assert.deepEqual(read(untouched), readFileSync(untouched));
});
