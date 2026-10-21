import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import { expansionSemanticPredecessor, restoreExpansionSemanticPolicy, restoreExpansionSemanticProducer, restoreExpansionSemanticCaseSelection, restoreExpansionSemanticRunnerSelection, restoreExpansionSemanticLauncherSelection } from './expansion-semantic-registration.mjs';
const hash = value => createHash('sha256').update(value).digest('hex');
export function cardTitlePredecessor(current) {
  current = expansionSemanticPredecessor(current);
  if (current.length !== 176) return current;
  assert.equal(hash(JSON.stringify(current)), '0196bd3ca3cba45bc0aae347cec98930d5fa2ebeb4a8966ce091993bb2001c86');
  assert.equal(current.at(-1).id, 'fixture-card-title-promoted-to-heading');
  const prior = current.slice(0, -1);
  assert.equal(hash(JSON.stringify(prior)), '1d87ea04c45cbd796bb6dc627f77e7349253ef0d8d1e25a40ca0c87ed633b474');
  return prior;
}
export function restoreCardTitlePolicy(source) {
  const text = restoreExpansionSemanticPolicy(source);
  if (!text.includes('fixture-card-title-promoted-to-heading')) {
    assert.ok(!text.includes('scripts/check-card-static-ax.mjs'), 'Partial card title registration');
    return text;
  }
  assert.equal(hash(text), '3c1509e55dc67ea2aa3f5d52bb0a0babd9e36ef46c742a3ed96936e973b2513d');
  const ast = ts.createSourceFile('policy.mjs', text, 99, true);
  const entries = ast.statements.filter(ts.isVariableStatement).flatMap(n => [...n.declarationList.declarations])
    .find(n => n.name.getText(ast) === 'sourceAuditDefinitions').initializer.arguments[0].elements;
  assert.equal(entries.length, 176);
  assert.equal(entries[175].arguments[0].properties.find(p => p.name?.text === 'id').initializer.text,
    'fixture-card-title-promoted-to-heading');
  const prior = text.slice(0, entries[175].getFullStart()) + text.slice(entries[175].end + 1);
  assert.equal(hash(prior), '7c42affa92ea9baae611d024f9bc6cb395f92cbf8ecbd71b4786b11e6ca784ac');
  return prior;
}
export function restoreCardTitleProducer(source) {
  const text = restoreExpansionSemanticProducer(source);
  if (!text.includes('card title additive registration preserves accepted findings')) {
    assert.ok(!text.includes("'tests/material-parity/card-title-inputs.spec.mjs'"), 'Partial card proof registration');
    return text;
  }
  assert.equal(hash(text), 'ea1a6051b1e0e3df7fb820754ea9534103d0d0161328b0821ef7f8392d3123c2');
  const ast = ts.createSourceFile('producer.mjs', text, 99, true);
  const owner = name => ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
  const proofs = owner('focusedProofInventory').body.statements[0].expression.elements;
  const files = owner('sourceFingerprints').body.statements[0].declarationList.declarations[0].initializer.elements;
  assert.equal(proofs.length, 236);
  assert.deepEqual(proofs.slice(0, 2).map(n => n.arguments[3].text), [
    'card title additive registration preserves accepted findings', 'card title actual AX and complete recorded descendant evidence']);
  assert.equal(files[0].text, 'tests/material-parity/card-title-inputs.spec.mjs');
  assert.equal(files[14].text, 'artifacts/material-parity/card-static-ax-20261021/latest-report.json');
  assert.equal(files[15].text, 'tests/material-parity/passive-main-landmark-input.spec.mjs');
  let prior = text;
  for (const [start, end] of [[proofs[0].getFullStart(), proofs[1].end + 1],
    [files[0].getFullStart(), files[14].end + 1]].sort((a, b) => b[0] - a[0]))
    prior = prior.slice(0, start) + prior.slice(end);
  assert.equal(hash(prior), 'c638b8ca8ab705a9cad00a6f6e7de9917d418bca31f53fef0df9f3ef6624006d');
  return prior;
}
export function restoreCardTitleCaseSelection(source) {
  let text = restoreExpansionSemanticCaseSelection(source);
  if (!text.includes('export const cardInputsReview=')) return text;
  assert.equal(hash(text), 'a0f724b13faa820717c4b7d0232e6d566a7ff118d73af95259c8df527ee8607d');
  const line = "export const cardInputsReview='20dfb80485f094eaec4025e56ac7d5bb4a375f388643d192cb14f5d5fecbf82b';\n";
  assert.equal(text.split(line).length, 2); text = text.replace(line, '');
  assert.equal(text.split(',cardInputsReview').length, 3); text = text.replaceAll(',cardInputsReview', '');
  assert.equal(hash(text), '976c4b379f03e095a267f3b97865e3a97ef83df77cc699e8e9b01013fb9e929b');
  return text;
}
export function restoreCardTitleRunnerSelection(source) {
  let text = restoreExpansionSemanticRunnerSelection(source);
  if (!text.includes(', cardInputsReview')) return text;
  assert.equal(hash(text), '03fc64661a9fd02527d25d3b5ac3a1d519318badb654c5f89943eef8910a0e22');
  for (const addition of [', cardInputsReview', ',cardInputsReview']) {
    assert.equal(text.split(addition).length, 2); text = text.replace(addition, '');
  }
  assert.equal(hash(text), 'ad0652a5dac171d19ff7d762ec68391123d0597fdb77fb444664875f0d1aae92');
  return text;
}
export function restoreCardTitleLauncherSelection(source) {
  let text = restoreExpansionSemanticLauncherSelection(source);
  if (!text.includes('const cardInputs =')) return text;
  assert.equal(hash(text), '67d8688991da94838ae1f17a31b82018c395d9e5b7a9a6cc0017cb93a0e5a3c7');
  for (const addition of [
    "const cardInputs = rawRequested.includes('--card-inputs');\n",
    "assert.ok(!(staticAx && cardInputs), 'Choose one case-review supplement');\n",
    "cardInputs ? 'artifacts/material-parity/working-audit/proposals/20dfb80485f094eaec4025e56ac7d5bb4a375f388643d192cb14f5d5fecbf82b.json' : ",
    "cardInputs ? '--case-obligation-review-sha256=20dfb80485f094eaec4025e56ac7d5bb4a375f388643d192cb14f5d5fecbf82b' : ",
  ]) { assert.equal(text.split(addition).length, 2); text = text.replace(addition, ''); }
  const filter = "!['--static-ax', '--card-inputs'].includes(argument)";
  assert.equal(text.split(filter).length, 2); text = text.replace(filter, "argument !== '--static-ax'");
  assert.equal(text.split('[--static-ax|--card-inputs]').length, 2);
  text = text.replace('[--static-ax|--card-inputs]', '[--static-ax]');
  assert.equal(hash(text), '37e5e298431d66cbf8911f00310ea35433e17cd2b90c44e8d8207f57f013211c');
  return text;
}
