import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import { staticSemanticPredecessor, restoreStaticSemanticPolicy, restoreStaticSemanticProducer } from './static-semantic-registration.mjs';
const hash = value => createHash('sha256').update(value).digest('hex');
const normalize = value => value.toString().replaceAll('\r\n', '\n');
const id = 'fixture-tab-panel-accessible-name-substitution';
// Exact additive case selection only. Finding/proof registration is independent;
// these reversals do not declare the pending semantic batch canonical.
export function restoreStaticSemanticCaseSelection(source, kind) {
  let text = normalize(source);
  if (!text.includes('staticSemanticInputs')) return text;
  const review = '821919099916339a177403d8c6cc66ede9aeaa20501a23ace9c568df75160f11';
  const entries = {
    case: ['1d0821a937a8eeefa480ed62271aafa11b41aec9cd7bc05428da04f9224d3a20', '964b25f6b5adae2f7c03b5719851b905c765d661b9aa061de379602e49c2f944', [
      [`export const staticSemanticInputsReview='${review}';\n`, 1], [',staticSemanticInputsReview', 2]]],
    runner: ['1473d7324b68f6e312305837e71ab7a68e2878beb306c977b5d21ec998d9b290', '28baf744c494ef96ebe0e6413f7ee1fa39675fae90919a199db94d87a85d3ea6', [
      [', staticSemanticInputsReview', 1], [',staticSemanticInputsReview', 1]]],
    launcher: ['d6555a6152b439cdc0a605e5f88ffb42b893299a94d7de9d6679119f583d8a4b', '979598c6529a95aa0162a41a01e3efb36c8153a7549135032d0afc5fa0468cf9', [
      ["const staticSemanticInputs = rawRequested.includes('--static-semantic-inputs');\n", 1],
      ["assert.ok(!(staticSemanticInputs && (staticAx || cardInputs || expansionSemantics || stepperInputs || tabsMenuSheet)), 'Choose one case-review supplement');\n", 1],
      [`staticSemanticInputs ? 'artifacts/material-parity/working-audit/proposals/${review}.json' : `, 1],
      [`staticSemanticInputs ? '--case-obligation-review-sha256=${review}' : `, 1],
      [", '--static-semantic-inputs'", 1], ['|--static-semantic-inputs', 1]]],
  };
  const [current, previous, removals] = entries[kind]; assert.equal(hash(text), current);
  for (const [addition, count] of removals) { assert.equal(text.split(addition).length, count + 1); text = text.replaceAll(addition, ''); }
  assert.equal(hash(text), previous); return text;
}
export function tabsSemanticPredecessor(current) {
  current = staticSemanticPredecessor(current);
  if (current.length <= 179) return current;
  assert.equal(current.length, 180);
  assert.equal(hash(JSON.stringify(current)), 'dffdbf4e6a22d0aa95f59619aaf05e9b6b67669ff5ef84ec5d630d5411f7b3be');
  assert.equal(current.at(-1).id, id);
  const prior = current.slice(0, -1);
  assert.equal(hash(JSON.stringify(prior)), '73f0029326c2ca8e61c572b494101875aa49ae52ce526947e4e8268c7aeb0c0b');
  return prior;
}
export function restoreTabsSemanticPolicy(source) {
  const text = restoreStaticSemanticPolicy(source);
  if (!text.includes(id)) {
    assert.ok(!text.includes('Material tab panel semantic identity and relationship authoring'), 'Partial tabs registration'); return text;
  }
  assert.equal(hash(text), 'b85f901b0b19ce6422ba4194aef63f558b6ca476f0e20b9f903b3a51c0bff0b3');
  const ast = ts.createSourceFile('policy.mjs', text, 99, true);
  const entries = ast.statements.filter(ts.isVariableStatement).flatMap(n => [...n.declarationList.declarations])
    .find(n => n.name.getText(ast) === 'sourceAuditDefinitions').initializer.arguments[0].elements;
  assert.equal(entries.length, 180);
  assert.equal(entries[179].arguments[0].properties.find(p => p.name?.text === 'id').initializer.text, id);
  const prior = text.slice(0, entries[179].getFullStart()) + text.slice(entries[179].end + 1);
  assert.equal(hash(prior), 'bc449ff3710a560919d985801045505807f0e404cb3b7a7c8452844616d10ba9'); return prior;
}
export function restoreTabsSemanticProducer(source) {
  const text = restoreStaticSemanticProducer(source);
  if (!text.includes('tabs semantic additive registration preserves accepted findings')) {
    assert.ok(!text.includes("'tests/material-parity/tabs-semantic-inputs.spec.mjs'"), 'Partial tabs proof registration'); return text;
  }
  assert.equal(hash(text), '7e0caa327de5fbde079ee59b469aa4f18f2cf030a3e5a137770d5fe5ac0b0a22');
  const ast = ts.createSourceFile('producer.mjs', text, 99, true);
  const owner = name => ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
  const proofs = owner('focusedProofInventory').body.statements[0].expression.elements;
  const files = owner('sourceFingerprints').body.statements[0].declarationList.declarations[0].initializer.elements;
  assert.equal(proofs.length, 243); assert.equal(files.length, 873);
  assert.deepEqual(proofs.slice(0, 2).map(n => n.arguments[3].text), [
    'tabs semantic additive registration preserves accepted findings', 'tabs menu and sheet bounded evidence and semantic history']);
  assert.equal(files[0].text, 'tests/material-parity/tabs-semantic-inputs.spec.mjs');
  assert.equal(files[16].text, 'artifacts/material-parity/tabs-static-ax-20261022/latest-report.json');
  let prior = text;
  for (const [start, end] of [[proofs[0].getFullStart(), proofs[1].end + 1], [files[0].getFullStart(), files[16].end + 1]].sort((a, b) => b[0] - a[0]))
    prior = prior.slice(0, start) + prior.slice(end);
  assert.equal(hash(prior), '43ee1e679744a54d9260b2aa2dec2e41507d12fdce709a5b934bf9a5f6119636'); return prior;
}
export function restoreTabsCaseSelection(source) {
  let text = restoreStaticSemanticCaseSelection(source, 'case');
  if (!text.includes('export const tabsMenuSheetReview=')) return text;
  assert.equal(hash(text), '964b25f6b5adae2f7c03b5719851b905c765d661b9aa061de379602e49c2f944');
  const line = "export const tabsMenuSheetReview='7eb107dec98a464f2c859c3c6f205d678719649b890c586bb52ce2d1d59640b4';\n";
  assert.equal(text.split(line).length, 2); text = text.replace(line, '');
  assert.equal(text.split(',tabsMenuSheetReview').length, 3); text = text.replaceAll(',tabsMenuSheetReview', '');
  assert.equal(hash(text), 'bf5bb2ac5ba58ca4aeb89819f351e52ce6fc182a7c953e1b0696e690ea16b08b'); return text;
}
export function restoreTabsRunnerSelection(source) {
  let text = restoreStaticSemanticCaseSelection(source, 'runner');
  if (!text.includes(', tabsMenuSheetReview')) return text;
  assert.equal(hash(text), '28baf744c494ef96ebe0e6413f7ee1fa39675fae90919a199db94d87a85d3ea6');
  for (const addition of [', tabsMenuSheetReview', ',tabsMenuSheetReview']) {
    assert.equal(text.split(addition).length, 2); text = text.replace(addition, '');
  }
  assert.equal(hash(text), '5d658498f857e95971cdfcee9336119dfd546d0f32a8f59a4e61bbda32be9c65'); return text;
}
export function restoreTabsLauncherSelection(source) {
  let text = restoreStaticSemanticCaseSelection(source, 'launcher');
  if (!text.includes('const tabsMenuSheet =')) return text;
  assert.equal(hash(text), '979598c6529a95aa0162a41a01e3efb36c8153a7549135032d0afc5fa0468cf9');
  for (const addition of [
    "const tabsMenuSheet = rawRequested.includes('--tabs-menu-sheet');\n",
    "assert.ok(!(tabsMenuSheet && (staticAx || cardInputs || expansionSemantics || stepperInputs)), 'Choose one case-review supplement');\n",
    "tabsMenuSheet ? 'artifacts/material-parity/working-audit/proposals/7eb107dec98a464f2c859c3c6f205d678719649b890c586bb52ce2d1d59640b4.json' : ",
    "tabsMenuSheet ? '--case-obligation-review-sha256=7eb107dec98a464f2c859c3c6f205d678719649b890c586bb52ce2d1d59640b4' : ",
    ", '--tabs-menu-sheet'", '|--tabs-menu-sheet',
  ]) { assert.equal(text.split(addition).length, 2); text = text.replace(addition, ''); }
  assert.equal(hash(text), 'ef67291fcd1aaa97b8884db56e3969fd714dea93768d692229b17987d73c1437'); return text;
}
