import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { restoreStaticSemanticCaseSelection } from './tabs-semantic-registration.mjs';
import { staticSemanticInputsReview, createDividerReviewedBoundariesReader } from './text-backing-case-review-source.mjs';
import { restorePopupDepthExportSource, restorePopupDepthTabsHelper } from './static-semantic-registration.mjs';
import { restoreScrollbarExportSource } from './static-semantic-registration.mjs';
import ts from 'typescript';
const files = [
  ['case', 'tests/material-parity/text-backing-case-review-source.mjs'],
  ['runner', 'scripts/run-material-input-audit.mjs'],
  ['launcher', 'scripts/export-material-input-audit-current-ancestry.mjs'],
];
const normalize = b => b.toString().replaceAll('\r\n', '\n');

test('scrollbar paint export selection preserves older sources flags and actual reader routing', async () => {
  const review = 'eb30019d906e601dfdaf10cd7ed8a9c9de141764e92316506b5ebfb2e0a392ac';
  for (const [kind, file] of files.filter(([kind]) => kind !== 'case')) {
    const source = normalize(fs.readFileSync(file));
    const prior = normalize(execFileSync('git', ['show', `c4d0db6a:${file}`]));
    assert.equal(restoreScrollbarExportSource(source, kind), prior);
    assert.throws(() => restoreScrollbarExportSource(source + '\n// drift', kind));
    assert.throws(() => restoreScrollbarExportSource(source.replace('scrollbarPaint', 'scrollbarPaintForged'), kind));
  }
  const launcher = files[2][1], run = flags => JSON.parse(execFileSync(process.execPath, [launcher, ...flags, '--dry-run'], { encoding: 'utf8' }));
  const selected = run(['--scrollbar-paint']), old = run(['--popup-depth-inputs']);
  const oldReview = 'eb8ca85a92bc8707f6fe2ba7404bf1e7caaacc9e57c733faf5a4cda6588862d4';
  assert.equal(selected.args.filter(arg => arg.includes(review)).length, 2);
  assert.deepEqual({ ...selected, args: selected.args.map(arg => arg.replaceAll(review, oldReview)) }, old);
  for (const flag of ['--static-ax', '--card-inputs', '--expansion-semantics', '--stepper-inputs', '--tabs-menu-sheet', '--static-semantic-inputs', '--popup-depth-inputs'])
    assert.throws(() => execFileSync(process.execPath, [launcher, '--scrollbar-paint', flag, '--dry-run'], { stdio: 'pipe' }));
  const text = normalize(fs.readFileSync(files[1][1])), ast = ts.createSourceFile(files[1][1], text, 99, true), factories = [];
  const visit = node => {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'readerFactory') factories.push(node.initializer);
    ts.forEachChild(node, visit);
  };
  visit(ast); assert.equal(factories.length, 1);
  const bindings = { ...(await import('./text-backing-case-review-source.mjs')), ...(await import('./popup-depth-case-review-source.mjs')) };
  const select = new Function('options', ...Object.keys(bindings), `return ${factories[0].getText(ast)};`);
  const factory = id => select({ caseObligationReviewSha256: id }, ...Object.values(bindings));
  assert.equal(factory(review), bindings.createPopupDepthReviewReader);
  assert.equal(factory(oldReview), bindings.createPopupDepthReviewReader);
  assert.equal(factory(staticSemanticInputsReview), bindings.createDividerReviewedBoundariesReader);
  assert.equal(factory('0'.repeat(64)), undefined);
});

test('popup depth export selection preserves complete predecessor sources and exact invocation', async () => {
  const review = 'eb8ca85a92bc8707f6fe2ba7404bf1e7caaacc9e57c733faf5a4cda6588862d4';
  for (const [kind, file] of files.filter(([kind]) => kind !== 'case')) {
    const current = normalize(fs.readFileSync(file));
    const prior = normalize(execFileSync('git', ['show', `43cb9b89:${file}`], { maxBuffer: 4000000 }));
    assert.equal(restorePopupDepthExportSource(current, kind), prior);
    assert.throws(() => restorePopupDepthExportSource(current + '\n// drift', kind));
    assert.throws(() => restorePopupDepthExportSource(current.replace('popupDepthInputs', 'popupDepthInputsForged'), kind));
  }
  const helperFile = 'tests/material-parity/tabs-semantic-registration.mjs', helper = normalize(fs.readFileSync(helperFile));
  assert.equal(restorePopupDepthTabsHelper(helper), normalize(execFileSync('git', ['show', `43cb9b89:${helperFile}`])));
  assert.throws(() => restorePopupDepthTabsHelper(helper + '\n// drift'));
  const launcher = files[2][1], run = flags => JSON.parse(execFileSync(process.execPath, [launcher, ...flags, '--dry-run'], { encoding: 'utf8' }));
  const current = run(['--popup-depth-inputs']), prior = run(['--static-semantic-inputs']);
  assert.equal(current.args.filter(arg => arg.includes(review)).length, 2);
  assert.deepEqual({ ...current, args: current.args.map(arg => arg.replaceAll(review, staticSemanticInputsReview)) }, prior);
  for (const other of ['--static-ax', '--card-inputs', '--expansion-semantics', '--stepper-inputs', '--tabs-menu-sheet', '--static-semantic-inputs'])
    assert.throws(() => execFileSync(process.execPath, [launcher, '--popup-depth-inputs', other, '--dry-run'], { stdio: 'pipe' }));
  const runner = normalize(fs.readFileSync(files[1][1])), ast = ts.createSourceFile(files[1][1], runner, 99, true);
  const factories = [];
  const visit = node => {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'readerFactory') factories.push(node.initializer);
    ts.forEachChild(node, visit);
  };
  visit(ast); assert.equal(factories.length, 1);
  const bindings = { ...(await import('./text-backing-case-review-source.mjs')), ...(await import('./popup-depth-case-review-source.mjs')) };
  const select = new Function('options', ...Object.keys(bindings), `return ${factories[0].getText(ast)};`);
  const factory = id => select({ caseObligationReviewSha256: id }, ...Object.values(bindings));
  assert.equal(factory(review), bindings.createPopupDepthReviewReader);
  assert.equal(factory(staticSemanticInputsReview), bindings.createDividerReviewedBoundariesReader);
  assert.equal(factory(bindings.textBackingRetainedReview), bindings.createTextBackingReviewReader);
  assert.equal(factory('0'.repeat(64)), undefined);
});
test('static semantic case selection restores complete accepted predecessor sources and rejects drift', () => {
  for (const [kind, file] of files) {
    const source = normalize(fs.readFileSync(file));
    const previous = normalize(execFileSync('git', ['show', `21de384a:${file}`], { maxBuffer: 4000000 }));
    assert.equal(restoreStaticSemanticCaseSelection(source, kind), previous);
    assert.equal(restoreStaticSemanticCaseSelection(previous, kind), previous);
    assert.throws(() => restoreStaticSemanticCaseSelection(source + '\n// drift', kind));
    const forged = source.replace('staticSemanticInputs', 'staticSemanticInputsForged'); assert.notEqual(forged, source);
    assert.throws(() => restoreStaticSemanticCaseSelection(forged, kind));
  }
  assert.throws(() => createDividerReviewedBoundariesReader({ root: process.cwd(), read: fs.readFileSync, reviewSha256: '0'.repeat(64) }));
});
test('static semantic named launcher selects only the exact new proposal and preserves old invocation', () => {
  const launcher = files[2][1], run = flags => JSON.parse(execFileSync(process.execPath, [launcher, ...flags, '--dry-run'], { encoding: 'utf8' }));
  const current = run(['--static-semantic-inputs']), prior = run(['--tabs-menu-sheet']);
  const oldId = '7eb107dec98a464f2c859c3c6f205d678719649b890c586bb52ce2d1d59640b4';
  assert.equal(current.args.filter(a => a.includes(staticSemanticInputsReview)).length, 2);
  assert.deepEqual({ ...current, args: current.args.map(a => a.replaceAll(staticSemanticInputsReview, oldId)) }, prior);
  for (const other of ['--static-ax', '--card-inputs', '--expansion-semantics', '--stepper-inputs', '--tabs-menu-sheet'])
    assert.throws(() => execFileSync(process.execPath, [launcher, '--static-semantic-inputs', other, '--dry-run'], { stdio: 'pipe' }));
});
