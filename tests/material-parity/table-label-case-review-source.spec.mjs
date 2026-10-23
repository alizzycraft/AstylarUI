import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { loadCaseObligationReview } from '../../scripts/audit-findings-store.mjs';
import { createTableLabelReviewReader, tableLabelPaintReview } from './table-label-case-review-source.mjs';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';
import { restoreTableLabelExportSource, restoreTableLabelProducer, restoreRadioCaretProducer } from './static-semantic-registration.mjs';
import path from 'node:path';
import { createHash } from 'node:crypto';

test('table label successor reader preserves accepted cases and authenticates all evidence without promotion', () => {
  const root = process.cwd(), read = fs.readFileSync;
  const pointer = read('artifacts/material-parity/working-audit/current.json');
  assert.throws(() => createTableLabelReviewReader({ root, read, reviewSha256: '0'.repeat(64) }));
  const file = `artifacts/material-parity/working-audit/proposals/${tableLabelPaintReview}.json`;
  const review = JSON.parse(read(file)).review;
  const reader = createTableLabelReviewReader({ root, read, reviewSha256: tableLabelPaintReview });
  assert.equal(reader.sourceApplicability.completePredecessorRecovered, true);
  assert.equal(reader.sourceApplicability.addedChildren, 40);
  const loaded = loadCaseObligationReview(file, tableLabelPaintReview, review.groups.map(g => g.case), { read: reader.read });
  assert.equal(loaded.cases.length, 2311);
  assert.equal(loaded.evidenceFingerprints.length, 16347);
  assert.deepEqual(loaded.unjoinedCases, []);
  assert.equal(loaded.inspectionComplete, false);
  assert.equal(loaded.currentRenderingAccepted, false);
  assert.ok(loaded.cases.every(g => g.inspection === 'partial' && g.currentRendering === 'unverified'));
  assert.equal(loaded.cases.filter(g => g.obligations.localPaint?.retainedTableLabelPaint).length, 40);
  const wrong = (file, encoding) => {
    const bytes = read(file);
    const result = String(file).endsWith('table-retained-label-paint.spec.mjs')
      ? Buffer.concat([bytes, Buffer.from('\n// drift')]) : bytes;
    return encoding ? result.toString(encoding) : result;
  };
  assert.throws(() => createTableLabelReviewReader({ root, read: wrong, reviewSha256: tableLabelPaintReview }));
  assert.deepEqual(read('artifacts/material-parity/working-audit/current.json'), pointer);
  console.log(JSON.stringify({ proof: 'table-label-successor-reader', cases: 2311, dependencies: 16347,
    addedChildren: 40, completePredecessorRecovered: true, selectedForExport: false,
    canonicalPublication: false, currentRenderingAccepted: false }));
});

test('table label export selection preserves complete older sources and actual reader routing', async () => {
  const files = { runner: 'scripts/run-material-input-audit.mjs', launcher: 'scripts/export-material-input-audit-current-ancestry.mjs' };
  const normalize = bytes => bytes.toString().replaceAll('\r\n', '\n');
  for (const [kind, file] of Object.entries(files)) {
    const source = normalize(fs.readFileSync(file));
    assert.equal(restoreTableLabelExportSource(source, kind), normalize(execFileSync('git', ['show', `655b02b8:${file}`])));
    assert.throws(() => restoreTableLabelExportSource(source + '\n// drift', kind));
    assert.throws(() => restoreTableLabelExportSource(source.replace('tableLabelPaint', 'tableLabelPaintForged'), kind));
  }
  const run = flags => JSON.parse(execFileSync(process.execPath, [files.launcher, ...flags, '--dry-run'], { encoding: 'utf8' }));
  const selected = run(['--table-label-paint']), prior = run(['--scrollbar-paint']);
  const predecessor = 'eb30019d906e601dfdaf10cd7ed8a9c9de141764e92316506b5ebfb2e0a392ac';
  assert.equal(selected.args.filter(arg => arg.includes(tableLabelPaintReview)).length, 2);
  assert.deepEqual({ ...selected, args: selected.args.map(arg => arg.replaceAll(tableLabelPaintReview, predecessor)) }, prior);
  for (const flag of ['--static-ax', '--card-inputs', '--expansion-semantics', '--stepper-inputs', '--tabs-menu-sheet', '--static-semantic-inputs', '--popup-depth-inputs', '--scrollbar-paint'])
    assert.throws(() => execFileSync(process.execPath, [files.launcher, '--table-label-paint', flag, '--dry-run'], { stdio: 'pipe' }));
  const text = normalize(fs.readFileSync(files.runner)), ast = ts.createSourceFile(files.runner, text, 99, true), factories = [];
  const visit = node => {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'readerFactory') factories.push(node.initializer);
    ts.forEachChild(node, visit);
  };
  visit(ast); assert.equal(factories.length, 1);
  const bindings = { ...(await import('./text-backing-case-review-source.mjs')), ...(await import('./popup-depth-case-review-source.mjs')),
    ...(await import('./table-label-case-review-source.mjs')) };
  const select = new Function('options', ...Object.keys(bindings), `return ${factories[0].getText(ast)};`);
  const factory = id => select({ caseObligationReviewSha256: id }, ...Object.values(bindings));
  assert.equal(factory(tableLabelPaintReview), createTableLabelReviewReader);
  assert.equal(factory(predecessor), bindings.createPopupDepthReviewReader);
  assert.equal(factory(bindings.popupDepthInputsReview), bindings.createPopupDepthReviewReader);
  assert.equal(factory(bindings.staticSemanticInputsReview), bindings.createDividerReviewedBoundariesReader);
  assert.equal(factory('0'.repeat(64)), undefined);

  const helper = 'tests/material-parity/static-semantic-registration.mjs';
  let source = normalize(fs.readFileSync(helper));
  // Remove only the newer Radio/caret adapter before the unchanged Table-era
  // conservation assertions. The final whole-source Git comparison still owns
  // every prior byte; this is not a waiver for arbitrary helper changes.
  const radioAst = ts.createSourceFile(helper, source, 99, true);
  const radioAddition = radioAst.statements.filter(n => ts.isFunctionDeclaration(n) && ['restoreRadioCaretExportSource','restoreRadioCaretProducer','restoreRetainedFocusExportSource'].includes(n.name?.text));
  assert.equal(radioAddition.length, 3);
  for (const node of radioAddition.reverse()) source = source.slice(0, node.getFullStart()) + source.slice(node.end);
  const radioCall = '  let text = restoreRadioCaretExportSource(source, kind);';
  assert.equal(source.split(radioCall).length, 2);
  source = source.replace(radioCall, "  let text = source.toString().replaceAll('\\r\\n', '\\n');");
  const radioProducerCall = '  const text = restoreRadioCaretProducer(source);';
  assert.equal(source.split(radioProducerCall).length, 2);
  source = source.replace(radioProducerCall, "  const text = source.toString().replaceAll('\\r\\n', '\\n');");
  const helperAst = ts.createSourceFile(helper, source, 99, true);
  const additions = helperAst.statements.filter(n => ts.isFunctionDeclaration(n) && ['restoreTableLabelExportSource', 'restoreTableLabelProducer'].includes(n.name?.text));
  assert.equal(additions.length, 2);
  for (const node of additions.reverse()) source = source.slice(0, node.getFullStart()) + source.slice(node.end);
  const call = '  let text = restoreTableLabelExportSource(source, kind);';
  assert.equal(source.split(call).length, 2);
  source = source.replace(call, "  let text = source.toString().replaceAll('\\r\\n', '\\n');");
  const producerCall = '  const text = restoreTableLabelProducer(source);';
  assert.equal(source.split(producerCall).length, 2);
  source = source.replace(producerCall, "  const text = source.toString().replaceAll('\\r\\n', '\\n');");
  assert.equal(source, normalize(execFileSync('git', ['show', `655b02b8:${helper}`])));
  const suite = 'tests/material-parity/static-semantic-selection.spec.mjs';
  const suiteSource = normalize(fs.readFileSync(suite));
  const binding = ", ...(await import('./table-label-case-review-source.mjs'))";
  assert.equal(suiteSource.split(binding).length, 3);
  assert.equal(suiteSource.replaceAll(binding, ''), normalize(execFileSync('git', ['show', `655b02b8:${suite}`])));
});

test('table label registration preserves the complete accepted producer and inventories', () => {
  const file = 'tests/material-parity/input-equivalence-audit.mjs', text = restoreRadioCaretProducer(fs.readFileSync(file, 'utf8'));
  const previous = execFileSync('git', ['show', `b8a300e1:${file}`], { encoding: 'utf8', maxBuffer: 8000000 }).replaceAll('\r\n', '\n');
  assert.equal(restoreTableLabelProducer(text), previous);
  assert.throws(() => restoreTableLabelProducer(text + '\n// drift'));
  assert.throws(() => restoreTableLabelProducer(text.replace('Four proofs and nine source paths', 'Forged proof description')));
  const ast = ts.createSourceFile(file, text, 99, true);
  const owner = name => ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
  const files = owner('sourceFingerprints').body.statements[0].declarationList.declarations[0].initializer.elements;
  const proofs = owner('focusedProofInventory').body.statements[0].expression.elements;
  assert.equal(files.length, 945); assert.equal(new Set(files.map(n => n.text)).size, 945);
  assert.equal(proofs.length, 269);
  for (const n of files.slice(0,9)) assert.ok(fs.readFileSync(n.text).length > 0);
  for (const n of proofs.slice(0,4)) {
    const pattern = new Function(`return ${n.arguments[2].getText(ast)};`)();
    assert.ok(pattern.test(fs.readFileSync(n.arguments[1].text, 'utf8')));
  }
  const code = ['proof','sourceFingerprints','focusedProofInventory'].map(name => owner(name).getText(ast)).join('\n');
  const current = new Function('readFileSync','path','createHash',code + ';return {sources:sourceFingerprints(process.cwd()),proofs:focusedProofInventory(process.cwd())};')(fs.readFileSync,path,createHash);
  assert.equal(current.sources.length, 945); assert.equal(current.proofs.length, 269);
  const oldAst = ts.createSourceFile(file, previous, 99, true);
  const oldOwner = name => oldAst.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
  const oldCode = ['proof','sourceFingerprints','focusedProofInventory'].map(name => oldOwner(name).getText(oldAst)).join('\n');
  const prior = new Function('readFileSync','path','createHash',oldCode + ';return {sources:sourceFingerprints(process.cwd()),proofs:focusedProofInventory(process.cwd())};')(fs.readFileSync,path,createHash);
  assert.deepEqual(current.sources.slice(9), prior.sources);
  assert.deepEqual(current.proofs.slice(4), prior.proofs);
});
