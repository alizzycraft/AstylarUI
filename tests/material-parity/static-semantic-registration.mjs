import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import ts from 'typescript';
const hash = b => createHash('sha256').update(b).digest('hex');
// Explicit historical population only. Production continues to use all192.
export function retainedStaticSemanticPopulation(current) {
  if (current.length <= 191) return current;
  assert.equal(current.length, 192);
  assert.equal(hash(JSON.stringify(current)), '2e14f5dfc62d16eba75b481615f3f3bc148fb59856aafa96cdc18e6d36c74ab8');
  assert.equal(current[191].id, 'core-root-paint-depth-crosses-viewport-camera');
  const prior = current.slice(0, 191);
  assert.equal(hash(JSON.stringify(prior)), '13c86852010dbff5153a44c53756eff3c59344c66b5391b9a2b3f2430c22c064');
  return prior;
}

// Source applicability for the three standalone scrollbar supplements only.
// This does not publish their proof inventory or rewrite any retained capture.
export function restoreScrollbarSupplementSuite(source) {
  const text = source.toString().replaceAll('\r\n', '\n');
  const priorHash = '9fafec85d890122fa1ad2bb2ac712975b7982c603c28f036d534f875aab0effa';
  if (hash(text) === priorHash) return text;
  assert.equal(hash(text), '6ea5ba46281a96565edd8599976ca90969f10cd653976f12a05202bfcc45107b');
  const names = [
    'retained scrollbar constructor wiring preserves current CSS geometry and paint owners',
    'retained scrollbar clipping and projection implementations preserve captured method bodies',
    'retained scrollbar paint evidence maps to exact configured open and scroll obligations',
  ];
  const ast = ts.createSourceFile('scrollbar-suite.mjs', text, 99, true);
  const additions = ast.statements.filter(node => ts.isExpressionStatement(node) && ts.isCallExpression(node.expression) &&
    names.includes(node.expression.arguments[0]?.text));
  assert.deepEqual(additions.map(node => node.expression.arguments[0].text), names);
  let prior = text;
  for (const node of additions.reverse()) prior = prior.slice(0, node.getFullStart()) + prior.slice(node.end);
  assert.equal(hash(prior), priorHash, 'Every original suite byte must conserve');
  return prior;
}
export function restoreRootDepthPolicy(source) {
  const text = source.toString().replaceAll('\r\n', '\n');
  if (!text.includes('core-root-paint-depth-crosses-viewport-camera')) return text;
  assert.equal(hash(text), 'bcd145e1efc0d45a4285420a8e8b0166ec102aaa8a921a532be30fba6a65c0f9');
  const ast = ts.createSourceFile('policy.mjs', text, 99, true);
  const entries = ast.statements.filter(ts.isVariableStatement).flatMap(n => [...n.declarationList.declarations])
    .find(n => n.name.getText(ast) === 'sourceAuditDefinitions').initializer.arguments[0].elements;
  assert.equal(entries.length, 192);
  const prior = text.slice(0, entries[191].getFullStart()) + text.slice(entries[191].end + 1);
  assert.equal(hash(prior), '85491fc1e6bb7a9d98f160bed17c2c90b8b75081d20f056a87135cb0635cdeec');
  return prior;
}
export function staticSemanticPredecessor(current) {
  current = retainedStaticSemanticPopulation(current);
  if (current.length <= 180) return current;
  assert.equal(current.length, 191);
  assert.equal(hash(JSON.stringify(current)), '13c86852010dbff5153a44c53756eff3c59344c66b5391b9a2b3f2430c22c064');
  const prior = current.slice(0, 180);
  assert.equal(hash(JSON.stringify(prior)), 'dffdbf4e6a22d0aa95f59619aaf05e9b6b67669ff5ef84ec5d630d5411f7b3be'); return prior;
}
export function restoreStaticSemanticPolicy(source) {
  const text = restoreRootDepthPolicy(source);
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
  const text = restoreRootDepthProducer(source);
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

export function restoreRootDepthProducer(source) {
  const text = restorePopupDepthEvidenceProducer(source);
  if (!text.includes('root depth additive finding registration')) return text;
  assert.equal(hash(text), 'd590419ede4a8f37a4fe392cf3dcec806122b32f3550df98f3530c140130d5d0');
  const ast = ts.createSourceFile('producer.mjs', text, 99, true);
  const owner = name => ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
  const proofs = owner('focusedProofInventory').body.statements[0].expression.elements;
  const files = owner('sourceFingerprints').body.statements[0].declarationList.declarations[0].initializer.elements;
  assert.equal(proofs.length, 252); assert.equal(files.length, 932);
  assert.equal(proofs[0].arguments[3].text, 'root depth additive finding registration');
  assert.equal(files[0].text, 'src/app/services/babylon-camera.service.ts');
  let prior = text;
  for (const [start, end] of [[proofs[0].getFullStart(), proofs[3].end + 1], [files[0].getFullStart(), files[3].end + 1]].sort((a,b) => b[0]-a[0]))
    prior = prior.slice(0,start) + prior.slice(end);
  assert.equal(hash(prior), 'a0480845099038416ce2f420dca03e3cd99712ea083c18075c8bebabbc00f747');
  return prior;
}

export function restorePopupDepthEvidenceProducer(source) {
  const text = restoreScrollbarSupplementProducer(source);
  if (!text.includes('popup depth queued case source applicability')) return text;
  assert.equal(hash(text), '6479b848b42c90c7435c4792dd83e630acb6f7e7b9254aeac8aeec2d2e7cc34b');
  const ast = ts.createSourceFile('producer.mjs', text, 99, true);
  const owner = name => ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
  const proofs = owner('focusedProofInventory').body.statements[0].expression.elements;
  const files = owner('sourceFingerprints').body.statements[0].declarationList.declarations[0].initializer.elements;
  assert.equal(proofs.length, 261); assert.equal(files.length, 934);
  assert.equal(proofs[0].arguments[3].text, 'popup depth queued case source applicability');
  assert.equal(files[0].text, 'tests/material-parity/popup-depth-case-review-source.mjs');
  const planReturn = owner('implementationPlan').body.statements[0].expression;
  assert.ok(ts.isCallExpression(planReturn) && ts.isPropertyAccessExpression(planReturn.expression)
    && ts.isArrayLiteralExpression(planReturn.expression.expression));
  const plan = planReturn.expression.expression.elements;
  assert.ok(plan[0].getText(ast).includes('Unbounded root paint depth crosses the viewport-dependent camera'));
  let prior = text;
  for (const [start,end] of [[proofs[0].getFullStart(),proofs[8].end+1],[files[0].getFullStart(),files[1].end+1],[plan[0].getFullStart(),plan[0].end+1]].sort((a,b)=>b[0]-a[0]))
    prior = prior.slice(0,start)+prior.slice(end);
  assert.equal(hash(prior), 'd590419ede4a8f37a4fe392cf3dcec806122b32f3550df98f3530c140130d5d0');
  return prior;
}

export function restoreScrollbarSupplementProducer(source) {
  const text = source.toString().replaceAll('\r\n', '\n');
  if (!['retained scrollbar constructor source applicability',
    'retained scrollbar clipping projection implementation applicability',
    'retained scrollbar exact configured endpoint paint evidence'].some(title => text.includes(title))) return text;
  assert.equal(hash(text), '46b9ac10702962d1d8e6bac5471637462ed607392efb3b3cbc06622231baab3d');
  const ast = ts.createSourceFile('producer.mjs', text, 99, true);
  const owner = name => ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name);
  const proofs = owner('focusedProofInventory').body.statements[0].expression.elements;
  const files = owner('sourceFingerprints').body.statements[0].declarationList.declarations[0].initializer.elements;
  assert.equal(proofs.length, 264); assert.equal(files.length, 936);
  assert.equal(proofs[0].arguments[3].text, 'retained scrollbar constructor source applicability');
  assert.equal(proofs[2].arguments[3].text, 'retained scrollbar exact configured endpoint paint evidence');
  assert.equal(files[0].text, 'artifacts/material-parity/scrollbar-clip-projection-final-20261023.log');
  let prior = text;
  for (const [start,end] of [[proofs[0].getFullStart(),proofs[2].end+1], [files[0].getFullStart(),files[1].end+1]].sort((a,b)=>b[0]-a[0]))
    prior = prior.slice(0,start) + prior.slice(end);
  assert.equal(hash(prior), '6479b848b42c90c7435c4792dd83e630acb6f7e7b9254aeac8aeec2d2e7cc34b');
  return prior;
}

export function restorePopupDepthExportSource(source, kind) {
  let text = source.toString().replaceAll('\r\n', '\n');
  if (kind === 'case' || !text.includes('popupDepthInputs')) return text;
  const entries = {
    runner: ['f345a665eb3f517aef958a054cfc4f18c4bd26927cb582e5b45a5d8945040add', '1473d7324b68f6e312305837e71ab7a68e2878beb306c977b5d21ec998d9b290', [
      "import { popupDepthInputsReview, createPopupDepthReviewReader } from '../tests/material-parity/popup-depth-case-review-source.mjs';\n",
      'options.caseObligationReviewSha256===popupDepthInputsReview ? createPopupDepthReviewReader : ',
    ]],
    launcher: ['9f258608bd31db7c581ce1c6d6268affe86a1559aaf27a8869925bb53ae93f3f', 'd6555a6152b439cdc0a605e5f88ffb42b893299a94d7de9d6679119f583d8a4b', [
      "const popupDepthInputs = rawRequested.includes('--popup-depth-inputs');\n",
      "assert.ok(!(popupDepthInputs && (staticAx || cardInputs || expansionSemantics || stepperInputs || tabsMenuSheet || staticSemanticInputs)), 'Choose one case-review supplement');\n",
      ", '--popup-depth-inputs'", '|--popup-depth-inputs',
      "if (popupDepthInputs) inputs['case-obligation-review'] = 'artifacts/material-parity/working-audit/proposals/eb8ca85a92bc8707f6fe2ba7404bf1e7caaacc9e57c733faf5a4cda6588862d4.json';\n",
      "if (popupDepthInputs) args[args.findIndex(argument => argument.startsWith('--case-obligation-review-sha256='))] = '--case-obligation-review-sha256=eb8ca85a92bc8707f6fe2ba7404bf1e7caaacc9e57c733faf5a4cda6588862d4';\n",
    ]],
  };
  const [current, prior, removals] = entries[kind]; assert.equal(hash(text), current);
  for (const addition of removals) { assert.equal(text.split(addition).length, 2); text = text.replace(addition, ''); }
  assert.equal(hash(text), prior); return text;
}

export function restorePopupDepthTabsHelper(source) {
  let text = source.toString().replaceAll('\r\n', '\n');
  if (!text.includes('source = restorePopupDepthExportSource(source, kind);')) return text;
  assert.equal(hash(text), '81253bc88e3e8e7ae5c1933b92df5973b80cbf53f5a8848f8399a4959090db1e');
  for (const addition of [
    "import { restorePopupDepthExportSource } from './static-semantic-registration.mjs';\n",
    '  source = restorePopupDepthExportSource(source, kind);\n',
  ]) { assert.equal(text.split(addition).length, 2); text = text.replace(addition, ''); }
  assert.equal(hash(text), 'ce23ce76c049d845ba790fe295f1e908a5f0f585e66fb00086252d8fa6e4229f');
  return text;
}
