import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import test from 'node:test';
import ts from 'typescript';
import { pendingEvidenceSourceFiles, pendingEvidenceProofRows, registerPendingEvidenceProducer,
  restorePendingEvidenceProducer } from './pending-evidence-registration.mjs';

const file = 'tests/material-parity/input-equivalence-audit.mjs';
const hash = value => createHash('sha256').update(value).digest('hex');
const collect = (source, read) => {
  const ast = ts.createSourceFile(file, source, 99, true, ts.ScriptKind.JS); assert.deepEqual(ast.parseDiagnostics, []);
  const owner = name => ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
  const code = ['proof', 'sourceFingerprints', 'focusedProofInventory'].map(n => owner(n).getText(ast)).join('\n');
  return new Function('readFileSync', 'path', 'createHash', code + ';return {sources:sourceFingerprints(process.cwd()),proofs:focusedProofInventory(process.cwd())};')(read, path, createHash);
};

test('pending evidence inventory addition preserves every frozen source and proof entry', () => {
  const source = readFileSync(file, 'utf8'), prior = restorePendingEvidenceProducer(source);
  const registered = registerPendingEvidenceProducer(prior);
  assert.equal(restorePendingEvidenceProducer(registered), prior);
  assert.equal(hash(prior), '0aba1870b5ee9f0231cfb2528d6d89a581ae8558a0c9859e116a145febcbe3e1');
  const readRegistered = (name, options) => path.resolve(name) === path.resolve(file)
    ? options ? registered : Buffer.from(registered) : readFileSync(name, options);
  const before = collect(prior, (name, options) => path.resolve(name) === path.resolve(file)
    ? options ? prior : Buffer.from(prior) : readFileSync(name, options));
  const after = collect(registered, readRegistered);
  assert.equal(before.sources.length, 968); assert.equal(before.proofs.length, 293);
  assert.equal(pendingEvidenceSourceFiles.length, 15); assert.equal(pendingEvidenceProofRows.length, 21);
  assert.equal(after.sources.length, 983); assert.equal(after.proofs.length, 314);
  assert.deepEqual(after.sources.slice(0, 15).map(r => r.file), pendingEvidenceSourceFiles);
  assert.deepEqual(after.proofs.slice(21), before.proofs);
  const oldRows = after.sources.slice(15);
  assert.deepEqual(oldRows.map(r => r.file), before.sources.map(r => r.file));
  for (let i = 0; i < oldRows.length; i++) {
    if (oldRows[i].file === file) assert.equal(oldRows[i].sha256, hash(registered));
    else assert.deepEqual(oldRows[i], before.sources[i]);
  }
  assert.ok(after.proofs.slice(0, 21).every(r => r.line > 0));
});

test('pending evidence inventory restoration rejects changed old content and altered additions', () => {
  const source = restorePendingEvidenceProducer(readFileSync(file));
  assert.throws(() => registerPendingEvidenceProducer(source + '\n// changed old source\n'));
  const registered = registerPendingEvidenceProducer(source);
  assert.throws(() => restorePendingEvidenceProducer(registered + '\n// unrelated drift\n'));
  assert.throws(() => restorePendingEvidenceProducer(registered.replace(pendingEvidenceSourceFiles[0], 'forged/source')));
  assert.throws(() => restorePendingEvidenceProducer(registered.replace('Bounded verified evidence only;', 'unproved full acceptance;')));
});
