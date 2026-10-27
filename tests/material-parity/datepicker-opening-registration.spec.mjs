import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { prepareDatepickerOpeningRegistry, restoreDatepickerOpeningRegistry,
  datepickerOpeningSources, datepickerOpeningProofs, createDatepickerHistoricalRead,
  datepickerHistoricalSources } from './datepicker-opening-registration.mjs';

test('datepicker registry preparation preserves every predecessor entry and rejects unrelated drift', () => {
  const bytes = readFileSync('tests/material-parity/input-equivalence-audit.mjs');
  const prior = restoreDatepickerOpeningRegistry(bytes);
  const next = prepareDatepickerOpeningRegistry(prior);
  assert.equal(restoreDatepickerOpeningRegistry(next), prior);
  const entries = source => {
    const ast = ts.createSourceFile('audit.mjs', source, 99, true);
    assert.deepEqual(ast.parseDiagnostics, []);
    return Object.fromEntries(['sourceFingerprints', 'focusedProofInventory', 'implementationPlan'].map(name => {
      const fn = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
      let array; const visit = n => { if (!array && ts.isArrayLiteralExpression(n)) array = n; ts.forEachChild(n, visit); }; visit(fn);
      return [name, array.elements.map(n => n.getText(ast))];
    }));
  };
  const before = entries(prior), after = entries(next);
  assert.equal(before.sourceFingerprints.length, 1106);
  assert.equal(before.focusedProofInventory.length, 436);
  assert.equal(before.implementationPlan.length, 71);
  assert.deepEqual(after.sourceFingerprints.slice(7), before.sourceFingerprints);
  assert.deepEqual(after.focusedProofInventory.slice(7), before.focusedProofInventory);
  assert.deepEqual(after.implementationPlan.slice(1), before.implementationPlan);
  const files = after.sourceFingerprints.map(text => Function(`return ${text}`)());
  assert.equal(new Set(files).size, files.length);
  assert.deepEqual(files.slice(0, 7), datepickerOpeningSources);
  for (const file of datepickerOpeningSources) assert.ok(readFileSync(file).length);
  const proof = (_root, file, pattern, title) => {
    assert.equal([...readFileSync(file, 'utf8').matchAll(new RegExp(pattern.source, 'g'))].length, 1);
    return [file, title];
  };
  assert.deepEqual(after.focusedProofInventory.slice(0, 7).map(text => Function('proof', 'root', `return ${text}`)(proof, '.')), datepickerOpeningProofs);
  assert.throws(() => prepareDatepickerOpeningRegistry(prior + '\n// unrelated drift'));
  assert.throws(() => restoreDatepickerOpeningRegistry(next + '\n// unrelated drift'));
  assert.deepEqual(readFileSync('tests/material-parity/input-equivalence-audit.mjs'), bytes);
});

test('datepicker historical source reader authenticates both endpoints and rejects unknown edits', () => {
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  const root = process.cwd();
  const reader = createDatepickerHistoricalRead({ root, read: readFileSync });
  const twice = createDatepickerHistoricalRead({ root, read: reader });
  for (const [file, previous, current] of datepickerHistoricalSources) {
    const bytes = readFileSync(file);
    assert.equal(hash(bytes.toString().replaceAll('\r\n', '\n')), current);
    for (const read of [reader, twice]) {
      assert.equal(hash(read(file)), previous);
      assert.equal(hash(read(path.resolve(file), 'utf8')), previous);
      assert.equal(hash(read(file, { encoding: 'utf8' })), previous);
    }
    const bad = createDatepickerHistoricalRead({ root, read: (name, options) => path.resolve(root, name) === path.resolve(file)
      ? Buffer.from(bytes.toString() + '\n// unrelated edit') : readFileSync(name, options) });
    assert.throws(() => bad(file), /Unrecognized datepicker source/);
    assert.deepEqual(readFileSync(file), bytes);
  }
  const untouched = 'scripts/join-material-datepicker-opening.mjs';
  assert.deepEqual(reader(untouched), readFileSync(untouched));
});
