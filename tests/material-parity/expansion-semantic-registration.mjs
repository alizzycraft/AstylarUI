import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import ts from 'typescript';
const hash = value => createHash('sha256').update(value).digest('hex');
const ids = ['core-semantic-css-visibility-not-projected', 'fixture-expansion-controlled-region-replaced-with-paragraph'];
export function expansionSemanticPredecessor(current) {
  if (current.length <= 176) return current;
  assert.equal(current.length, 178);
  assert.equal(hash(JSON.stringify(current)), '01e16e058c2a8373b9471862a176d397fc238c3e11e25124d0a23f80268f2d92');
  assert.deepEqual(current.slice(-2).map(row => row.id), ids);
  const prior = current.slice(0, -2);
  assert.equal(hash(JSON.stringify(prior)), '0196bd3ca3cba45bc0aae347cec98930d5fa2ebeb4a8966ce091993bb2001c86');
  return prior;
}
export function restoreExpansionSemanticPolicy(source) {
  const text = source.toString().replaceAll('\r\n', '\n');
  if (!text.includes(ids[0])) {
    assert.ok(!text.includes(ids[1]) && !text.includes('scripts/check-public-semantic-css-hidden.mjs'), 'Partial expansion semantic registration');
    return text;
  }
  assert.equal(hash(text), 'e42296467605e0e9c1ae0a8a0950ea4fd286adffe5d6ff171f7cc88468abb81d');
  const ast = ts.createSourceFile('policy.mjs', text, 99, true);
  const entries = ast.statements.filter(ts.isVariableStatement).flatMap(n => [...n.declarationList.declarations])
    .find(n => n.name.getText(ast) === 'sourceAuditDefinitions').initializer.arguments[0].elements;
  assert.equal(entries.length, 178);
  assert.deepEqual(entries.slice(-2).map(n => n.arguments[0].properties.find(p => p.name?.text === 'id').initializer.text), ids);
  const prior = text.slice(0, entries[176].getFullStart()) + text.slice(entries[177].end + 1);
  assert.equal(hash(prior), '3c1509e55dc67ea2aa3f5d52bb0a0babd9e36ef46c742a3ed96936e973b2513d');
  return prior;
}
export function restoreExpansionSemanticProducer(source) {
  const text = source.toString().replaceAll('\r\n', '\n');
  if (!text.includes('expansion semantic additive registration preserves accepted findings')) {
    assert.ok(!text.includes("'tests/material-parity/expansion-semantic-inputs.spec.mjs'"), 'Partial expansion proof registration');
    return text;
  }
  assert.equal(hash(text), '50c2182b37bc291584faccb147ad3882a88359be1eaf72fd53bbfedb39695db7');
  const ast = ts.createSourceFile('producer.mjs', text, 99, true);
  const owner = name => ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
  const proofs = owner('focusedProofInventory').body.statements[0].expression.elements;
  const files = owner('sourceFingerprints').body.statements[0].declarationList.declarations[0].initializer.elements;
  assert.equal(proofs.length, 238);
  assert.deepEqual(proofs.slice(0, 2).map(n => n.arguments[3].text), [
    'expansion semantic additive registration preserves accepted findings', 'expansion semantic CSS hiding public failures and Material AX binding']);
  assert.equal(files[0].text, 'tests/material-parity/expansion-semantic-inputs.spec.mjs');
  assert.equal(files[19].text, 'artifacts/material-parity/public-semantic-css-hidden-repeat-20261021/latest-report.json');
  assert.equal(files[20].text, 'tests/material-parity/card-title-inputs.spec.mjs');
  let prior = text;
  for (const [start, end] of [[proofs[0].getFullStart(), proofs[1].end + 1],
    [files[0].getFullStart(), files[19].end + 1]].sort((a, b) => b[0] - a[0]))
    prior = prior.slice(0, start) + prior.slice(end);
  assert.equal(hash(prior), 'ea1a6051b1e0e3df7fb820754ea9534103d0d0161328b0821ef7f8392d3123c2');
  return prior;
}
