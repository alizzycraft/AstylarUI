import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import { tabsSemanticPredecessor, restoreTabsSemanticPolicy, restoreTabsSemanticProducer, restoreTabsCaseSelection, restoreTabsRunnerSelection, restoreTabsLauncherSelection } from './tabs-semantic-registration.mjs';
const hash = value => createHash('sha256').update(value).digest('hex');
const id = 'fixture-stepper-tab-panel-relationships-omitted';
export function stepperSemanticPredecessor(current) {
  current = tabsSemanticPredecessor(current);
  if (current.length <= 178) return current;
  assert.equal(current.length, 179);
  assert.equal(hash(JSON.stringify(current)), '73f0029326c2ca8e61c572b494101875aa49ae52ce526947e4e8268c7aeb0c0b');
  assert.equal(current.at(-1).id, id);
  const prior = current.slice(0, -1);
  assert.equal(hash(JSON.stringify(prior)), '01e16e058c2a8373b9471862a176d397fc238c3e11e25124d0a23f80268f2d92');
  return prior;
}
export function restoreStepperSemanticPolicy(source) {
  const text = restoreTabsSemanticPolicy(source);
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
  const text = restoreTabsSemanticProducer(source);
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
export function restoreStepperCaseSelection(source) {
  let text = restoreTabsCaseSelection(source);
  if (!text.includes('export const stepperInputsReview=')) return text;
  assert.equal(hash(text), 'bf5bb2ac5ba58ca4aeb89819f351e52ce6fc182a7c953e1b0696e690ea16b08b');
  const line = "export const stepperInputsReview='ff305b14217b7123b98a2e00f3ecb9ad443cd89606eaf688ea11f6118b7fb069';\n";
  assert.equal(text.split(line).length, 2); text = text.replace(line, '');
  assert.equal(text.split(',stepperInputsReview').length, 3); text = text.replaceAll(',stepperInputsReview', '');
  assert.equal(hash(text), '7ffd95b3327cc270e374c7c80a2f6506ae0092f72567278a3b6b7bff4bac53bf');
  return text;
}
export function restoreStepperRunnerSelection(source) {
  let text = restoreTabsRunnerSelection(source);
  if (!text.includes(', stepperInputsReview')) return text;
  assert.equal(hash(text), '5d658498f857e95971cdfcee9336119dfd546d0f32a8f59a4e61bbda32be9c65');
  for (const addition of [', stepperInputsReview', ',stepperInputsReview']) {
    assert.equal(text.split(addition).length, 2); text = text.replace(addition, '');
  }
  assert.equal(hash(text), 'b3eee6c0c0e3377aa9bda24de72df9c548d4e9bfa48fc94016e25cfa99b0c667');
  return text;
}
export function restoreStepperLauncherSelection(source) {
  let text = restoreTabsLauncherSelection(source);
  if (!text.includes('const stepperInputs =')) return text;
  assert.equal(hash(text), 'ef67291fcd1aaa97b8884db56e3969fd714dea93768d692229b17987d73c1437');
  for (const addition of [
    "const stepperInputs = rawRequested.includes('--stepper-inputs');\n",
    "assert.ok(!(stepperInputs && (staticAx || cardInputs || expansionSemantics)), 'Choose one case-review supplement');\n",
    "stepperInputs ? 'artifacts/material-parity/working-audit/proposals/ff305b14217b7123b98a2e00f3ecb9ad443cd89606eaf688ea11f6118b7fb069.json' : ",
    "stepperInputs ? '--case-obligation-review-sha256=ff305b14217b7123b98a2e00f3ecb9ad443cd89606eaf688ea11f6118b7fb069' : ",
  ]) { assert.equal(text.split(addition).length, 2); text = text.replace(addition, ''); }
  for (const addition of [", '--stepper-inputs'", '|--stepper-inputs']) {
    assert.equal(text.split(addition).length, 2); text = text.replace(addition, '');
  }
  assert.equal(hash(text), '3381283405e9d4f7f5037ff2603da2226df586b434e1d1fc82c23900d0606d52');
  return text;
}
