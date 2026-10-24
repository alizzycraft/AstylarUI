import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import ts from 'typescript';
const hash = b => createHash('sha256').update(b).digest('hex');
// Explicit historical population only. Production continues to use all193.
export function retainedStaticSemanticPopulation(current) {
  // Historical cohorts retain the complete accepted192-finding population.
  if(current.length===193){
    assert.equal(hash(JSON.stringify(current)),'9943fcf0439d16163b547610002e214afb1086bedcdba83e0f5769050bb36a73');
    assert.equal(current[192].id,'fixture-slider-state-layer-composition');
    current=current.slice(0,192);
    assert.equal(hash(JSON.stringify(current)),'2e14f5dfc62d16eba75b481615f3f3bc148fb59856aafa96cdc18e6d36c74ab8');
  }
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
  let text = source.toString().replaceAll('\r\n', '\n');
  // Remove only the exact newer Slider input finding before older policy stages.
  if(text.includes('fixture-slider-state-layer-composition')){
    assert.equal(hash(text),'1e7cb51d39ba3e93899143dddb081769b7569fe7b9ece610dc4b2da3543c38f4');
    const next=ts.createSourceFile('policy.mjs',text,99,true);
    const entries=next.statements.filter(ts.isVariableStatement).flatMap(n=>[...n.declarationList.declarations])
      .find(n=>n.name.getText(next)==='sourceAuditDefinitions').initializer.arguments[0].elements;
    assert.equal(entries.length,193);
    assert.equal(entries[192].arguments[0].properties.find(p=>p.name?.getText(next)==='id').initializer.text,'fixture-slider-state-layer-composition');
    text=text.slice(0,entries[192].getFullStart())+text.slice(entries[192].end+1);
    assert.equal(hash(text),'bcd145e1efc0d45a4285420a8e8b0166ec102aaa8a921a532be30fba6a65c0f9');
  }
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
  const text = restoreTableLabelProducer(source);
  if (!['retained scrollbar constructor source applicability',
    'retained scrollbar clipping projection implementation applicability',
    'retained scrollbar exact configured endpoint paint evidence'].some(title => text.includes(title))) return text;
  assert.equal(hash(text), '757ae11832c1ee02ae42ceb795731aa4f02df93d8b541c4781c692b942cde3e5');
  const ast = ts.createSourceFile('producer.mjs', text, 99, true);
  const owner = name => ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name);
  const proofs = owner('focusedProofInventory').body.statements[0].expression.elements;
  const files = owner('sourceFingerprints').body.statements[0].declarationList.declarations[0].initializer.elements;
  assert.equal(proofs.length, 265); assert.equal(files.length, 936);
  assert.equal(proofs[0].arguments[3].text, 'retained scrollbar constructor source applicability');
  assert.equal(proofs[2].arguments[3].text, 'retained scrollbar exact configured endpoint paint evidence');
  assert.equal(proofs[3].arguments[3].text, 'retained scrollbar exact export selection');
  assert.equal(files[0].text, 'artifacts/material-parity/scrollbar-clip-projection-final-20261023.log');
  let prior = text;
  for (const [start,end] of [[proofs[0].getFullStart(),proofs[3].end+1], [files[0].getFullStart(),files[1].end+1]].sort((a,b)=>b[0]-a[0]))
    prior = prior.slice(0,start) + prior.slice(end);
  assert.equal(hash(prior), '6479b848b42c90c7435c4792dd83e630acb6f7e7b9254aeac8aeec2d2e7cc34b');
  return prior;
}

export function restorePopupDepthExportSource(source, kind) {
  let text = restoreScrollbarExportSource(source, kind);
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

export function restoreScrollbarExportSource(source, kind) {
  let text = restoreTableLabelExportSource(source, kind);
  if (kind === 'case' || !text.includes('scrollbarPaint')) return text;
  const entries = {
    runner: ['6c9652289a93aa8186e2c8a123eac0cfdee7409ecb17edeeaa7a162ad710c06a',
      'f345a665eb3f517aef958a054cfc4f18c4bd26927cb582e5b45a5d8945040add', [
        "import { scrollbarPaintInputsReview } from '../tests/material-parity/popup-depth-case-review-source.mjs';\n",
        'options.caseObligationReviewSha256===scrollbarPaintInputsReview ? createPopupDepthReviewReader : ',
      ]],
    launcher: ['d416710a6e81da0fa2078fe680374c163922da199c437c2ae4de93070abb95f4',
      '9f258608bd31db7c581ce1c6d6268affe86a1559aaf27a8869925bb53ae93f3f', [
        "const scrollbarPaint = rawRequested.includes('--scrollbar-paint');\n",
        "assert.ok(!(scrollbarPaint && (staticAx || cardInputs || expansionSemantics || stepperInputs || tabsMenuSheet || staticSemanticInputs || popupDepthInputs)), 'Choose one case-review supplement');\n",
        ", '--scrollbar-paint'", '|--scrollbar-paint',
        "if (scrollbarPaint) inputs['case-obligation-review'] = 'artifacts/material-parity/working-audit/proposals/eb30019d906e601dfdaf10cd7ed8a9c9de141764e92316506b5ebfb2e0a392ac.json';\n",
        "if (scrollbarPaint) args[args.findIndex(argument => argument.startsWith('--case-obligation-review-sha256='))] = '--case-obligation-review-sha256=eb30019d906e601dfdaf10cd7ed8a9c9de141764e92316506b5ebfb2e0a392ac';\n",
      ]],
  };
  assert.ok(Object.hasOwn(entries, kind));
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

export function restoreRadioCaretExportSource(source, kind) {
  let text = restoreRetainedFocusExportSource(source, kind);
  if (kind === 'case' || !text.includes('radioCaretPaint')) return text;
  const digest = '6889b546f95572c1df93b4c598634b3ad3565553bc69a99ff2a9e1c6b791590c';
  const remove = addition => {
    assert.equal(text.split(addition).length, 2, 'Exact Radio/caret addition required');
    text = text.replace(addition, '');
  };
  if (kind === 'runner') {
    remove("import { radioCaretPaintReview, createRadioCaretReviewReader } from '../tests/material-parity/radio-caret-case-review-source.mjs';\n");
    remove('    const selectedReaderFactory = options.caseObligationReviewSha256===radioCaretPaintReview ? createRadioCaretReviewReader : readerFactory;\n');
    assert.equal(text.split('const applicability=selectedReaderFactory?.').length, 2);
    text = text.replace('const applicability=selectedReaderFactory?.', 'const applicability=readerFactory?.');
    assert.equal(hash(text), '7630b948d2663bb07e5c6178d76087690a38a3bdddc0ca68c71c1ba819277a6c');
  } else {
    assert.equal(kind, 'launcher');
    for (const addition of [
      "const radioCaretPaint = rawRequested.includes('--radio-caret-paint');\n",
      "assert.ok(!(radioCaretPaint && (staticAx || cardInputs || expansionSemantics || stepperInputs || tabsMenuSheet || staticSemanticInputs || popupDepthInputs || scrollbarPaint || tableLabelPaint)), 'Choose one case-review supplement');\n",
      ", '--radio-caret-paint'", '|--radio-caret-paint',
      `if (radioCaretPaint) inputs['case-obligation-review'] = 'artifacts/material-parity/working-audit/proposals/${digest}.json';\n`,
      `if (radioCaretPaint) args[args.findIndex(argument => argument.startsWith('--case-obligation-review-sha256='))] = '--case-obligation-review-sha256=${digest}';\n`,
    ]) remove(addition);
    assert.equal(hash(text), '1823788710af5dae7f294b674437c1b7643fb99e9b12ef29a32f45fce2b4931b');
  }
  return text;
}

export function restoreTableLabelExportSource(source, kind) {
  let text = restoreRadioCaretExportSource(source, kind);
  if (kind === 'case' || !text.includes('tableLabelPaint')) return text;
  const entries = {
    runner: ['7630b948d2663bb07e5c6178d76087690a38a3bdddc0ca68c71c1ba819277a6c',
      '6c9652289a93aa8186e2c8a123eac0cfdee7409ecb17edeeaa7a162ad710c06a', [
        "import { tableLabelPaintReview, createTableLabelReviewReader } from '../tests/material-parity/table-label-case-review-source.mjs';\n",
        'options.caseObligationReviewSha256===tableLabelPaintReview ? createTableLabelReviewReader : ',
      ]],
    launcher: ['1823788710af5dae7f294b674437c1b7643fb99e9b12ef29a32f45fce2b4931b',
      'd416710a6e81da0fa2078fe680374c163922da199c437c2ae4de93070abb95f4', [
        "const tableLabelPaint = rawRequested.includes('--table-label-paint');\n",
        "assert.ok(!(tableLabelPaint && (staticAx || cardInputs || expansionSemantics || stepperInputs || tabsMenuSheet || staticSemanticInputs || popupDepthInputs || scrollbarPaint)), 'Choose one case-review supplement');\n",
        ", '--table-label-paint'", '|--table-label-paint',
        "if (tableLabelPaint) inputs['case-obligation-review'] = 'artifacts/material-parity/working-audit/proposals/075fa58b82b7cf4f04d7496cefaec3e444b7136fed154e255ac192addea36c7a.json';\n",
        "if (tableLabelPaint) args[args.findIndex(argument => argument.startsWith('--case-obligation-review-sha256='))] = '--case-obligation-review-sha256=075fa58b82b7cf4f04d7496cefaec3e444b7136fed154e255ac192addea36c7a';\n",
      ]],
  };
  assert.ok(Object.hasOwn(entries, kind));
  const [current, prior, removals] = entries[kind]; assert.equal(hash(text), current);
  for (const addition of removals) { assert.equal(text.split(addition).length, 2); text = text.replace(addition, ''); }
  assert.equal(hash(text), prior); return text;
}

export function restoreTableLabelProducer(source) {
  const text = restoreRadioCaretProducer(source);
  if (!text.includes('retained Table producer inventory conservation')) return text;
  assert.equal(hash(text), 'c61c93b222f0c63d2f34a16da3a75ece660060342bc33ac610502c74c777d4a6');
  const ast = ts.createSourceFile('producer.mjs', text, 99, true);
  const owner = name => ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
  const proofs = owner('focusedProofInventory').body.statements[0].expression.elements;
  const files = owner('sourceFingerprints').body.statements[0].declarationList.declarations[0].initializer.elements;
  assert.equal(proofs.length, 269); assert.equal(files.length, 945);
  assert.equal(proofs[0].arguments[3].text, 'retained Table label paint exact configured evidence');
  assert.equal(proofs[3].arguments[3].text, 'retained Table producer inventory conservation');
  assert.equal(files[0].text, 'tests/material-parity/table-retained-label-paint.spec.mjs');
  assert.equal(files[8].text, 'artifacts/material-parity/table-label-selection-integration-20261023.log');
  let prior = text;
  for (const [start,end] of [[proofs[0].getFullStart(),proofs[3].end+1], [files[0].getFullStart(),files[8].end+1]].sort((a,b)=>b[0]-a[0]))
    prior = prior.slice(0,start) + prior.slice(end);
  assert.equal(hash(prior), '757ae11832c1ee02ae42ceb795731aa4f02df93d8b541c4781c692b942cde3e5');
  return prior;
}

export function restoreRadioCaretProducer(source) {
  const text = restoreRetainedFocusProducer(source);
  if (!text.includes('retained Radio caret producer inventory conservation')) return text;
  const ast = ts.createSourceFile('producer.mjs', text, 99, true);
  const owner = name => ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
  const proofs = owner('focusedProofInventory').body.statements[0].expression.elements;
  const files = owner('sourceFingerprints').body.statements[0].declarationList.declarations[0].initializer.elements;
  assert.equal(proofs.length, 273); assert.equal(files.length, 953);
  assert.equal(proofs[0].arguments[3].text, 'retained Radio regional label paint');
  assert.equal(proofs[3].arguments[3].text, 'retained Radio caret producer inventory conservation');
  assert.equal(files[0].text, 'scripts/audit-material-retained-radio-label-paint.mjs');
  assert.equal(files[7].text, 'artifacts/material-parity/configured-caret-vertical-temporal-scope-20261014.log');
  let prior = text;
  for (const [start,end] of [[proofs[0].getFullStart(),proofs[3].end+1], [files[0].getFullStart(),files[7].end+1]].sort((a,b)=>b[0]-a[0]))
    prior = prior.slice(0,start) + prior.slice(end);
  assert.equal(hash(prior), 'c61c93b222f0c63d2f34a16da3a75ece660060342bc33ac610502c74c777d4a6');
  return prior;
}

export function restoreRetainedFocusExportSource(source, kind) {
  let text=source.toString().replaceAll('\r\n','\n');
  // Strip the newest selector at the shared owner,not at individual callers.
  // Keep this function self-contained for historical whole-module restoration.
  if(kind!=='case'&&text.includes('sliderStateInput')){
    assert.equal(hash(text),kind==='runner'?'15654c97560e355b825b330116514e4e64a8d61769998e9eb7dca5e47e936928':'13a8ae61f8d0fb5f93d230a7a77da1ccd08d90c03cfa193d3d63d34c9e920f54');
    const remove=addition=>{assert.equal(text.split(addition).length,2);text=text.replace(addition,'');};
    if(kind==='runner'){
      remove("import { sliderStateInputReview, createSliderStateInputReviewReader } from '../tests/material-parity/slider-state-input-review-source.mjs';\n");
      remove('    const currentReaderFactory = options.caseObligationReviewSha256===sliderStateInputReview ? createSliderStateInputReviewReader : effectiveReaderFactory;\n');
      assert.equal(text.split('const applicability=currentReaderFactory?.').length,2);
      text=text.replace('const applicability=currentReaderFactory?.','const applicability=effectiveReaderFactory?.');
      assert.equal(hash(text),'69565e8cd8b0d0e5c464f5ba51a5244f4cb95575d51a34f9d82a06668ca8645d');
    }else{
      assert.equal(kind,'launcher');
      remove("const sliderStateInputs = rawRequested.includes('--slider-state-inputs');\nassert.ok(!sliderStateInputs || rawRequested.every(argument => ['--slider-state-inputs', '--check', '--dry-run'].includes(argument)), 'Choose one case-review supplement');\n");
      remove(".filter(argument => argument !== '--slider-state-inputs')");remove('|--slider-state-inputs');
      remove("if (sliderStateInputs) inputs['case-obligation-review'] = 'artifacts/material-parity/working-audit/proposals/c394338eb185b3f410e7e18825cd370391b8daeb827f9b60f4d7355b46862823.json';\n");
      remove("if (sliderStateInputs) args[args.findIndex(argument => argument.startsWith('--case-obligation-review-sha256='))] = '--case-obligation-review-sha256=c394338eb185b3f410e7e18825cd370391b8daeb827f9b60f4d7355b46862823';\n");
      assert.equal(hash(text),'652bdd20b22c306229b4f88e4dcaf014b431139d77d6ac11663b2ff225936876');
    }
  }
  // Newest export-selection boundary is shared by every historical caller.
  if(kind!=='case'&&text.includes('sliderHoverHeld')){
    assert.equal(hash(text),kind==='runner'?'69565e8cd8b0d0e5c464f5ba51a5244f4cb95575d51a34f9d82a06668ca8645d':'652bdd20b22c306229b4f88e4dcaf014b431139d77d6ac11663b2ff225936876');
    const remove=addition=>{assert.equal(text.split(addition).length,2);text=text.replace(addition,'');};
    if(kind==='runner'){
      remove("import { sliderHoverHeldReview, createSliderHoverHeldReviewReader } from '../tests/material-parity/slider-hover-held-case-review-source.mjs';\n");
      remove('    const effectiveReaderFactory = options.caseObligationReviewSha256===sliderHoverHeldReview ? createSliderHoverHeldReviewReader : finalReaderFactory;\n');
      assert.equal(text.split('const applicability=effectiveReaderFactory?.').length,2);
      text=text.replace('const applicability=effectiveReaderFactory?.','const applicability=finalReaderFactory?.');
      assert.equal(hash(text),'834e43c9f191e205b263bea230384211a058e80886d75e1188e076c5ec65a092');
    }else{
      assert.equal(kind,'launcher');
      remove("const sliderHoverHeld = rawRequested.includes('--slider-hover-held');\nassert.ok(!sliderHoverHeld || rawRequested.every(argument => ['--slider-hover-held', '--check', '--dry-run'].includes(argument)), 'Choose one case-review supplement');\n");
      remove(", '--slider-hover-held'");remove('|--slider-hover-held');
      remove("if (sliderHoverHeld) inputs['case-obligation-review'] = 'artifacts/material-parity/working-audit/proposals/c0e397e0a5912d3f492c0d55a3d2b5421d6892f5403ba355c90560da6dbf2cea.json';\n");
      remove("if (sliderHoverHeld) args[args.findIndex(argument => argument.startsWith('--case-obligation-review-sha256='))] = '--case-obligation-review-sha256=c0e397e0a5912d3f492c0d55a3d2b5421d6892f5403ba355c90560da6dbf2cea';\n");
      assert.equal(hash(text),'a0e5c567becc970c55b86d32cbf4809b4330ee52023a1cb0c25135770489c06f');
    }
  }
  if(kind==='case'||!text.includes('retainedFocus'))return text;
  const digest='aeb1ef1452d65ab53677088ee2944bdf453a7b0d2e0e9f6fed0f987a4e3f4a36';
  const remove=addition=>{assert.equal(text.split(addition).length,2);text=text.replace(addition,'');};
  if(kind==='runner'){
    remove("import { retainedFocusObservationReview, createRetainedFocusReviewReader } from './join-material-retained-pointer-focus.mjs';\n");
    remove('    const finalReaderFactory = options.caseObligationReviewSha256===retainedFocusObservationReview ? createRetainedFocusReviewReader : selectedReaderFactory;\n');
    assert.equal(text.split('const applicability=finalReaderFactory?.').length,2);
    text=text.replace('const applicability=finalReaderFactory?.','const applicability=selectedReaderFactory?.');
    assert.equal(hash(text),'cf8de010e0545bb2a37f5cd482f15a9eb5b377d19d093b107f72b965a87c9c52');
  }else{
    assert.equal(kind,'launcher');
    for(const addition of [
      "const retainedFocus = rawRequested.includes('--retained-focus');\n",
      "assert.ok(!(retainedFocus && (staticAx || cardInputs || expansionSemantics || stepperInputs || tabsMenuSheet || staticSemanticInputs || popupDepthInputs || scrollbarPaint || tableLabelPaint || radioCaretPaint)), 'Choose one case-review supplement');\n",
      ", '--retained-focus'",'|--retained-focus',
      `if (retainedFocus) inputs['case-obligation-review'] = 'artifacts/material-parity/working-audit/proposals/${digest}.json';\n`,
      `if (retainedFocus) args[args.findIndex(argument => argument.startsWith('--case-obligation-review-sha256='))] = '--case-obligation-review-sha256=${digest}';\n`,
    ])remove(addition);
    assert.equal(hash(text),'e0085ac574c765b8c22dadb81a4817e195e8d79da819597fdf7539954892d432');
  }
  return text;
}

export function restoreRetainedFocusProducer(source) {
  let text=source.toString().replaceAll('\r\n','\n');
  // All historical provenance callers enter here. Remove the exact newer
  // inventory once,not through a growing set of caller-specific test wrappers.
  if(text.includes('Slider hover held producer inventory conservation')){
    assert.equal(hash(text),'4d6fe33dde4efeb07359040ab7c1ab6407f0825f804cd8df97efbc1a11a2b60f');
    const ast=ts.createSourceFile('producer.mjs',text,99,true);
    const owner=name=>ast.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name);
    const proofs=owner('focusedProofInventory').body.statements[0].expression.elements;
    const files=owner('sourceFingerprints').body.statements[0].declarationList.declarations[0].initializer.elements;
    assert.equal(proofs.length,285);assert.equal(files.length,962);
    assert.equal(proofs[0].arguments[3].text,'configured input focus dependency transition');
    assert.equal(proofs[6].arguments[3].text,'Slider hover held producer inventory conservation');
    assert.equal(files[0].text,'scripts/audit-material-configured-input-focus.mjs');
    assert.equal(files[6].text,'tests/material-parity/slider-hover-held-case-review-source.spec.mjs');
    for(const[start,end]of[[proofs[0].getFullStart(),proofs[6].end+1],[files[0].getFullStart(),files[6].end+1]].sort((a,b)=>b[0]-a[0]))
      text=text.slice(0,start)+text.slice(end);
    assert.equal(hash(text),'3aa377997071b510e233e95e7ad084c0413223fdc57ec833c5788f1c70a50ee7');
  }
  if(!text.includes('retained focus producer inventory conservation'))return text;
  const ast=ts.createSourceFile('producer.mjs',text,99,true);
  const owner=name=>ast.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name);
  const proofs=owner('focusedProofInventory').body.statements[0].expression.elements;
  const files=owner('sourceFingerprints').body.statements[0].declarationList.declarations[0].initializer.elements;
  assert.equal(proofs.length,278);assert.equal(files.length,955);
  assert.equal(proofs[0].arguments[3].text,'retained pointer-focus exact measured boundaries');
  assert.equal(proofs[4].arguments[3].text,'retained focus producer inventory conservation');
  assert.equal(files[0].text,'scripts/join-material-retained-pointer-focus.mjs');
  assert.equal(files[1].text,'tests/material-parity/retained-pointer-focus-reuse.spec.mjs');
  let prior=text;
  for(const[start,end]of[[proofs[0].getFullStart(),proofs[4].end+1],[files[0].getFullStart(),files[1].end+1]].sort((a,b)=>b[0]-a[0]))
    prior=prior.slice(0,start)+prior.slice(end);
  assert.equal(hash(prior),'0d5d56e87b3474630a211f685d0817ff94b5dd7eb32a07036f78e20366aa3392');
  return prior;
}
