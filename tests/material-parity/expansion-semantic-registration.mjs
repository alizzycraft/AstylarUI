import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import { stepperSemanticPredecessor, restoreStepperSemanticPolicy, restoreStepperSemanticProducer, restoreStepperCaseSelection, restoreStepperRunnerSelection, restoreStepperLauncherSelection } from './stepper-semantic-registration.mjs';
const hash = value => createHash('sha256').update(value).digest('hex');
const ids = ['core-semantic-css-visibility-not-projected', 'fixture-expansion-controlled-region-replaced-with-paragraph'];
export function expansionSemanticPredecessor(current) {
  current = stepperSemanticPredecessor(current);
  if (current.length <= 176) return current;
  assert.equal(current.length, 178);
  assert.equal(hash(JSON.stringify(current)), '01e16e058c2a8373b9471862a176d397fc238c3e11e25124d0a23f80268f2d92');
  assert.deepEqual(current.slice(-2).map(row => row.id), ids);
  const prior = current.slice(0, -2);
  assert.equal(hash(JSON.stringify(prior)), '0196bd3ca3cba45bc0aae347cec98930d5fa2ebeb4a8966ce091993bb2001c86');
  return prior;
}
export function restoreExpansionSemanticPolicy(source) {
  const text = restoreStepperSemanticPolicy(source);
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
  const text = restoreStepperSemanticProducer(source);
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
export function restoreExpansionSemanticCaseSelection(source) {
  let text = restoreStepperCaseSelection(source);
  if (!text.includes('export const expansionSemanticsReview=')) return text;
  assert.equal(hash(text), '7ffd95b3327cc270e374c7c80a2f6506ae0092f72567278a3b6b7bff4bac53bf');
  const line = "export const expansionSemanticsReview='5caa57e5f2254471d9d082ff0831db36704f73997b41ae48aa4b4064b45c4c99';\n";
  assert.equal(text.split(line).length, 2); text = text.replace(line, '');
  assert.equal(text.split(',expansionSemanticsReview').length, 3); text = text.replaceAll(',expansionSemanticsReview', '');
  assert.equal(hash(text), 'a0f724b13faa820717c4b7d0232e6d566a7ff118d73af95259c8df527ee8607d');
  return text;
}
export function restoreExpansionSemanticRunnerSelection(source) {
  let text = restoreStepperRunnerSelection(source);
  if (!text.includes(', expansionSemanticsReview')) return text;
  assert.equal(hash(text), 'b3eee6c0c0e3377aa9bda24de72df9c548d4e9bfa48fc94016e25cfa99b0c667');
  for (const addition of [', expansionSemanticsReview', ',expansionSemanticsReview']) {
    assert.equal(text.split(addition).length, 2); text = text.replace(addition, '');
  }
  assert.equal(hash(text), '03fc64661a9fd02527d25d3b5ac3a1d519318badb654c5f89943eef8910a0e22');
  return text;
}
export function restoreExpansionSemanticLauncherSelection(source) {
  let text = restoreStepperLauncherSelection(source);
  if (!text.includes('const expansionSemantics =')) return text;
  assert.equal(hash(text), '3381283405e9d4f7f5037ff2603da2226df586b434e1d1fc82c23900d0606d52');
  for (const addition of [
    "const expansionSemantics = rawRequested.includes('--expansion-semantics');\n",
    "assert.ok(!(expansionSemantics && (staticAx || cardInputs)), 'Choose one case-review supplement');\n",
    "expansionSemantics ? 'artifacts/material-parity/working-audit/proposals/5caa57e5f2254471d9d082ff0831db36704f73997b41ae48aa4b4064b45c4c99.json' : ",
    "expansionSemantics ? '--case-obligation-review-sha256=5caa57e5f2254471d9d082ff0831db36704f73997b41ae48aa4b4064b45c4c99' : ",
  ]) { assert.equal(text.split(addition).length, 2); text = text.replace(addition, ''); }
  for (const addition of [", '--expansion-semantics'", '|--expansion-semantics']) {
    assert.equal(text.split(addition).length, 2); text = text.replace(addition, '');
  }
  assert.equal(hash(text), '67d8688991da94838ae1f17a31b82018c395d9e5b7a9a6cc0017cb93a0e5a3c7');
  return text;
}
