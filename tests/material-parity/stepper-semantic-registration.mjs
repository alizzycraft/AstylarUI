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
