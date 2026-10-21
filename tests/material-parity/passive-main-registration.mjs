import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import ts from 'typescript';
const hash = value => createHash('sha256').update(value).digest('hex');
const normalized = value => value.toString().replaceAll('\r\n', '\n');
const ids = ['fixture-showcase-outer-and-semantic-page-duplicate-main-landmarks', 'fixture-sidenav-content-promoted-to-main-landmark'];
const vector = '1d87ea04c45cbd796bb6dc627f77e7349253ef0d8d1e25a40ca0c87ed633b474';
const policy = '7c42affa92ea9baae611d024f9bc6cb395f92cbf8ecbd71b4786b11e6ca784ac';
const producer = 'c638b8ca8ab705a9cad00a6f6e7de9917d418bca31f53fef0df9f3ef6624006d';
export function passiveMainPredecessor(current) {
  if (current.length !== 175) return current;
  assert.equal(hash(JSON.stringify(current)), vector);
  assert.deepEqual(current.slice(-2).map(row => row.id), ids);
  const prior = current.slice(0, -2);
  assert.equal(hash(JSON.stringify(prior)), 'fd942c4c5cc68504b8511e308960c5e8b3223f0bc0656e35721df5942f207796');
  return prior;
}
export function restorePassiveMainPolicy(source) {
  const text = normalized(source);
  if (!text.includes(ids[0])) { assert.ok(!text.includes(ids[1]), 'Partial landmark registration'); return text; }
  assert.equal(hash(text), policy);
  const ast = ts.createSourceFile('policy.mjs', text, 99, true);
  const entries = ast.statements.filter(ts.isVariableStatement).flatMap(n => [...n.declarationList.declarations])
    .find(n => n.name.getText(ast) === 'sourceAuditDefinitions').initializer.arguments[0].elements;
  assert.equal(entries.length, 175);
  assert.deepEqual(entries.slice(-2).map(n => n.arguments[0].properties.find(p => p.name?.text === 'id').initializer.text), ids);
  const prior = text.slice(0, entries[173].getFullStart()) + text.slice(entries[174].end + 1);
  assert.equal(hash(prior), '13b2a2a13a44ab6cd9f40fa5e8ee63156d816c78ca93246b33b8a2c5e6cc94ee');
  return prior;
}
export function restorePassiveMainProducer(source) {
  const text = normalized(source);
  if (!text.includes('passive landmark additive registration preserves accepted findings')) {
    assert.ok(!text.includes("'tests/material-parity/passive-main-landmark-input.spec.mjs'"), 'Partial landmark proof registration');
    return text;
  }
  assert.equal(hash(text), producer);
  const ast = ts.createSourceFile('producer.mjs', text, 99, true);
  const owner = name => ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
  const proofs = owner('focusedProofInventory').body.statements[0].expression.elements;
  const files = owner('sourceFingerprints').body.statements[0].declarationList.declarations[0].initializer.elements;
  assert.equal(proofs.length, 234);
  assert.deepEqual(proofs.slice(0, 2).map(n => n.arguments[3].text), [
    'passive landmark additive registration preserves accepted findings', 'passive static actual AX and landmark history evidence']);
  assert.equal(files[0].text, 'tests/material-parity/passive-main-landmark-input.spec.mjs');
  assert.equal(files[13].text, 'artifacts/material-parity/working-audit/proposals/f39d4c4cf1065eadfa494307434e7b1c17d393d8bc5794ca7d0fffd9974780e4.json');
  assert.equal(files[14].text, 'tests/material-parity/native-checkable-inputs.spec.mjs');
  let prior = text;
  for (const [start, end] of [[proofs[0].getFullStart(), proofs[1].end + 1],
    [files[0].getFullStart(), files[13].end + 1]].sort((a, b) => b[0] - a[0]))
    prior = prior.slice(0, start) + prior.slice(end);
  assert.equal(hash(prior), '74c966fc3c3a178b0b64436026fa658e052bdaf021f2951c15558ceba0fbba9b');
  return prior;
}
