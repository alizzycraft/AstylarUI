import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import ts from 'typescript';
const hash = value => createHash('sha256').update(value).digest('hex');
const id = 'fixture-stepper-tab-panel-relationships-omitted';
export function stepperSemanticPredecessor(current) {
  if (current.length <= 178) return current;
  assert.equal(current.length, 179);
  assert.equal(hash(JSON.stringify(current)), '73f0029326c2ca8e61c572b494101875aa49ae52ce526947e4e8268c7aeb0c0b');
  assert.equal(current.at(-1).id, id);
  const prior = current.slice(0, -1);
  assert.equal(hash(JSON.stringify(prior)), '01e16e058c2a8373b9471862a176d397fc238c3e11e25124d0a23f80268f2d92');
  return prior;
}
export function restoreStepperSemanticPolicy(source) {
  const text = source.toString().replaceAll('\r\n', '\n');
  if (!text.includes(id)) {
    assert.ok(!text.includes('Material stepper tab-to-labelled-panel relationship authoring'), 'Partial stepper semantic registration');
    return text;
  }
  assert.equal(hash(text), 'bc449ff3710a560919d985801045505807f0e404cb3b7a7c8452844616d10ba9');
  const ast = ts.createSourceFile('policy.mjs', text, 99, true);
  const entries = ast.statements.filter(ts.isVariableStatement).flatMap(n => [...n.declarationList.declarations])
    .find(n => n.name.getText(ast) === 'sourceAuditDefinitions').initializer.arguments[0].elements;
  assert.equal(entries.length, 179);
  assert.equal(entries[178].arguments[0].properties.find(p => p.name?.text === 'id').initializer.text, id);
  const prior = text.slice(0, entries[178].getFullStart()) + text.slice(entries[178].end + 1);
  assert.equal(hash(prior), 'e42296467605e0e9c1ae0a8a0950ea4fd286adffe5d6ff171f7cc88468abb81d');
  return prior;
}
export function restoreStepperSemanticProducer(source) {
  const text = source.toString().replaceAll('\r\n', '\n');
  if (!text.includes('stepper semantic additive registration preserves accepted findings')) {
    assert.ok(!text.includes("'tests/material-parity/stepper-semantic-inputs.spec.mjs'"), 'Partial stepper proof registration');
    return text;
  }
  assert.equal(hash(text), '43ee1e679744a54d9260b2aa2dec2e41507d12fdce709a5b934bf9a5f6119636');
  const ast = ts.createSourceFile('producer.mjs', text, 99, true);
  const owner = name => ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
  const proofs = owner('focusedProofInventory').body.statements[0].expression.elements;
  const files = owner('sourceFingerprints').body.statements[0].declarationList.declarations[0].initializer.elements;
  assert.equal(proofs.length, 241); assert.equal(files.length, 856);
  assert.deepEqual(proofs.slice(0, 3).map(n => n.arguments[3].text), [
    'stepper semantic additive registration preserves accepted findings',
    'stepper semantic actual AX and initial authoring history',
    'stepper and expansion complete recorded node accounting']);
  assert.equal(files[0].text, 'tests/material-parity/stepper-semantic-inputs.spec.mjs');
  assert.equal(files[16].text, 'artifacts/material-parity/stepper-static-ax-20261022/latest-report.json');
  assert.equal(files[17].text, 'tests/material-parity/expansion-semantic-inputs.spec.mjs');
  let prior = text;
  for (const [start, end] of [[proofs[0].getFullStart(), proofs[2].end + 1],
    [files[0].getFullStart(), files[16].end + 1]].sort((a, b) => b[0] - a[0]))
    prior = prior.slice(0, start) + prior.slice(end);
  assert.equal(hash(prior), '50c2182b37bc291584faccb147ad3882a88359be1eaf72fd53bbfedb39695db7');
  return prior;
}
