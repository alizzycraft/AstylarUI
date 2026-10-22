import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import ts from 'typescript';
const hash = b => createHash('sha256').update(b).digest('hex');
export function staticSemanticPredecessor(current) {
  if (current.length <= 180) return current;
  assert.equal(current.length, 191);
  assert.equal(hash(JSON.stringify(current)), '13c86852010dbff5153a44c53756eff3c59344c66b5391b9a2b3f2430c22c064');
  const prior = current.slice(0, 180);
  assert.equal(hash(JSON.stringify(prior)), 'dffdbf4e6a22d0aa95f59619aaf05e9b6b67669ff5ef84ec5d630d5411f7b3be'); return prior;
}
export function restoreStaticSemanticPolicy(source) {
  const text = source.toString().replaceAll('\r\n', '\n');
  if (!text.includes('fixture-toggle-group-accessible-name-substitution')) return text;
  assert.equal(hash(text), '85491fc1e6bb7a9d98f160bed17c2c90b8b75081d20f056a87135cb0635cdeec');
  const ast = ts.createSourceFile('policy.mjs', text, 99, true);
  const entries = ast.statements.filter(ts.isVariableStatement).flatMap(n => [...n.declarationList.declarations])
    .find(n => n.name.getText(ast) === 'sourceAuditDefinitions').initializer.arguments[0].elements;
  assert.equal(entries.length, 191);
  const prior = text.slice(0, entries[180].getFullStart()) + text.slice(entries[190].end + 1);
  assert.equal(hash(prior), 'b85f901b0b19ce6422ba4194aef63f558b6ca476f0e20b9f903b3a51c0bff0b3'); return prior;
}
export function restoreStaticSemanticProducer(source) {
  const text = source.toString().replaceAll('\r\n', '\n');
  if (!text.includes('static semantic additive registration conserves accepted findings')) return text;
  assert.equal(hash(text), 'a0480845099038416ce2f420dca03e3cd99712ea083c18075c8bebabbc00f747');
  const ast = ts.createSourceFile('producer.mjs', text, 99, true), owner = name => ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
  const proofs = owner('focusedProofInventory').body.statements[0].expression.elements;
  const files = owner('sourceFingerprints').body.statements[0].declarationList.declarations[0].initializer.elements;
  assert.equal(proofs.length, 248); assert.equal(files.length, 928);
  assert.equal(proofs[0].arguments[3].text, 'static semantic additive registration conserves accepted findings');
  assert.equal(proofs[4].arguments[3].text, 'static semantic named launcher selection');
  assert.equal(files[0].text, 'tests/material-parity/static-semantic-inputs.spec.mjs');
  let prior = text;
  for (const [start, end] of [[proofs[0].getFullStart(), proofs[4].end + 1], [files[0].getFullStart(), files[54].end + 1]].sort((a, b) => b[0] - a[0]))
    prior = prior.slice(0, start) + prior.slice(end);
  assert.equal(hash(prior), '7e0caa327de5fbde079ee59b469aa4f18f2cf030a3e5a137770d5fe5ac0b0a22'); return prior;
}
