import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import test from 'node:test';
import ts from 'typescript';
import { dividerOwnerFrameSources, dividerOwnerFrameProofs, registerDividerOwnerFrameProducer,
  restoreDividerOwnerFrameProducer, restoreDividerOwnerFrameRegistrationHelper } from './divider-owner-frame-registration.mjs';

const file = 'tests/material-parity/input-equivalence-audit.mjs';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const collect = (source, read) => {
  const ast = ts.createSourceFile(file, source, 99, true, ts.ScriptKind.JS); assert.deepEqual(ast.parseDiagnostics, []);
  const owner = name => ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name);
  const code = ['proof', 'sourceFingerprints', 'focusedProofInventory'].map(name => owner(name).getText(ast)).join('\n');
  return new Function('readFileSync', 'path', 'createHash', code + ';return {sources:sourceFingerprints(process.cwd()),proofs:focusedProofInventory(process.cwd())};')(read, path, createHash);
};

test('owner/frame registration restores exact previous producer and preserves entire inventories', () => {
  const source = readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
  const prior = restoreDividerOwnerFrameProducer(source);
  assert.equal(hash(prior), '6e7f0d6dd5c0b248f4fd5c227dda80e6d573d04f565b503871f7d5dfbe259167');
  assert.equal(registerDividerOwnerFrameProducer(prior), source);
  const before = collect(prior, (name, options) => {
    const relative = path.relative(process.cwd(), name).replaceAll('\\', '/');
    const value = relative === file ? prior : relative === 'tests/material-parity/pending-evidence-registration.mjs'
      ? restoreDividerOwnerFrameRegistrationHelper(readFileSync(name)) : undefined;
    return value === undefined ? readFileSync(name, options) : options ? value : Buffer.from(value);
  });
  const after = collect(source, readFileSync);
  assert.equal(dividerOwnerFrameSources.length, 12); assert.equal(dividerOwnerFrameProofs.length, 7);
  assert.equal(before.sources.length, 990); assert.equal(before.proofs.length, 319);
  assert.equal(after.sources.length, 1002); assert.equal(after.proofs.length, 326);
  assert.deepEqual(after.sources.slice(0, 12).map(row => row.file), dividerOwnerFrameSources);
  assert.deepEqual(after.sources.slice(12).map(row => row.file), before.sources.map(row => row.file));
  for (const [index, row] of before.sources.entries()) {
    const actual = after.sources[index + 12];
    if ([file, 'tests/material-parity/pending-evidence-registration.mjs'].includes(row.file)) {
      assert.notEqual(actual.sha256, row.sha256);
      assert.equal(actual.sha256, hash(readFileSync(row.file, 'utf8').replaceAll('\r\n', '\n')));
    } else assert.deepEqual(actual, row);
  }
  const withoutLine = rows => rows.map(({ line, ...row }) => row);
  assert.deepEqual(withoutLine(after.proofs.slice(7)), withoutLine(before.proofs));
  assert.ok(after.proofs.slice(0, 7).every(row => row.line > 0));
});

test('owner/frame registration rejects changed old producer and malformed additions', () => {
  const source = readFileSync(file, 'utf8');
  const prior = restoreDividerOwnerFrameProducer(source);
  assert.throws(() => registerDividerOwnerFrameProducer(prior + '\n// drift'));
  assert.throws(() => restoreDividerOwnerFrameProducer(source + '\n// drift'));
  assert.throws(() => restoreDividerOwnerFrameProducer(source.replace(dividerOwnerFrameSources[1], 'forged/source')));
  assert.throws(() => restoreDividerOwnerFrameProducer(source.replace(dividerOwnerFrameProofs[0].title, 'unproved full parity')));
  const helper = readFileSync('tests/material-parity/pending-evidence-registration.mjs');
  assert.equal(hash(restoreDividerOwnerFrameRegistrationHelper(helper)), '6147f36dd446f7140b38837b1e4c38aad6bbed08a4c4aeec2d90550fb0bad7ea');
  assert.throws(() => restoreDividerOwnerFrameRegistrationHelper(Buffer.concat([helper, Buffer.from('\n// drift')])));
});
