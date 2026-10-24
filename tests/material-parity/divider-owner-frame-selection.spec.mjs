import assert from 'node:assert/strict';
import { readFileSync as nativeReadFileSync } from 'node:fs';
import { createMenuHistoricalRead } from './menu-select-disabled-registration.mjs';
const readFileSync = createMenuHistoricalRead({ root: process.cwd(), read: nativeReadFileSync });
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import ts from 'typescript';
import { dividerOwnerFrameReview, createDividerOwnerFrameReviewReader } from './divider-owner-frame-review-source.mjs';
import { restoreDividerOwnerFrameExportSource, restoreOriginalRunnerExportSource } from './pending-evidence-registration.mjs';
import { restoreDividerOwnerFrameRegistrationHelper } from './divider-owner-frame-registration.mjs';

test('owner/frame export selection is explicit and rejects every older supplement combination', () => {
  const run = flags => spawnSync(process.execPath, ['scripts/export-material-input-audit-current-ancestry.mjs', '--dry-run', ...flags],
    { encoding: 'utf8', windowsHide: true });
  const selected = run(['--divider-owner-frame']); assert.equal(selected.status, 0, selected.stderr);
  const args = JSON.parse(selected.stdout).args;
  assert.ok(args.includes(`--case-obligation-review-sha256=${dividerOwnerFrameReview}`));
  assert.ok(args.includes(`--case-obligation-review=artifacts/material-parity/working-audit/proposals/${dividerOwnerFrameReview}.json`));
  for (const flag of ['--static-ax', '--card-inputs', '--expansion-semantics', '--stepper-inputs', '--tabs-menu-sheet',
    '--static-semantic-inputs', '--popup-depth-inputs', '--scrollbar-paint', '--table-label-paint', '--radio-caret-paint',
    '--retained-focus', '--slider-hover-held', '--slider-state-inputs', '--original-runner-recovery', '--divider-computed-paint']) {
    const old = run([flag]); assert.equal(old.status, 0, old.stderr); assert.ok(!old.stdout.includes(dividerOwnerFrameReview));
    const conflict = run([flag, '--divider-owner-frame']); assert.notEqual(conflict.status, 0);
    assert.match(conflict.stderr, /Choose one case-review supplement/);
  }
  const ordinary = run([]); assert.equal(ordinary.status, 0, ordinary.stderr); assert.ok(!ordinary.stdout.includes(dividerOwnerFrameReview));
});

test('owner/frame wiring conserves complete preceding runner launcher and historical helper', () => {
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  for (const [file, kind, expected] of [
    ['scripts/run-material-input-audit.mjs', 'runner', 'fb65d915d60172eabeebf0af7e578fa21c166a0e1c2384fdc8d1e28212d76378'],
    ['scripts/export-material-input-audit-current-ancestry.mjs', 'launcher', '6586a5a6232887702e3ee644f0e4ce51de4d02aa760bbfef1f316bd6adfca4f8'],
  ]) {
    assert.equal(hash(restoreDividerOwnerFrameExportSource(readFileSync(file), kind)), expected);
    restoreOriginalRunnerExportSource(readFileSync(file), kind);
    assert.throws(() => restoreDividerOwnerFrameExportSource(Buffer.concat([readFileSync(file), Buffer.from('\n// drift')]), kind));
  }
  const file = 'tests/material-parity/pending-evidence-registration.mjs';
  let source = restoreDividerOwnerFrameRegistrationHelper(readFileSync(file));
  const ast = ts.createSourceFile(file, source, 99, true, ts.ScriptKind.JS);
  const declarations = ast.statements.filter(node => ts.isFunctionDeclaration(node) && node.name?.text === 'restoreDividerOwnerFrameExportSource');
  assert.equal(declarations.length, 1);
  source = source.slice(0, declarations[0].getFullStart()) + source.slice(declarations[0].end);
  assert.equal(source.split('let text = restoreDividerOwnerFrameExportSource(source, kind);').length, 2);
  source = source.replace('let text = restoreDividerOwnerFrameExportSource(source, kind);', "let text = source.toString().replaceAll('\\r\\n', '\\n');");
  assert.equal(hash(source), 'efade467495fbf2c3c4be387208e3a4233a30b617ec0a229fe8b82be1c54b045');
});

test('actual final exporter reader routes only the exact owner/frame review', () => {
  const source = readFileSync('scripts/run-material-input-audit.mjs', 'utf8');
  const ast = ts.createSourceFile('runner.mjs', source, 99, true, ts.ScriptKind.JS), owners = [], calls = [];
  const visit = node => {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'ownerFrameReaderFactory') owners.push(node);
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'applicability') calls.push(node);
    ts.forEachChild(node, visit);
  }; visit(ast);
  assert.equal(owners.length, 1); assert.equal(calls.length, 1);
  assert.match(calls[0].initializer.getText(ast), /^ownerFrameReaderFactory\?\./);
  const choose = new Function('options', 'dividerOwnerFrameReview', 'createDividerOwnerFrameReviewReader', 'paintReaderFactory', `return ${owners[0].initializer.getText(ast)};`);
  const prior = () => {};
  assert.equal(choose({ caseObligationReviewSha256: dividerOwnerFrameReview }, dividerOwnerFrameReview, createDividerOwnerFrameReviewReader, prior), createDividerOwnerFrameReviewReader);
  assert.equal(choose({ caseObligationReviewSha256: '0'.repeat(64) }, dividerOwnerFrameReview, createDividerOwnerFrameReviewReader, prior), prior);
});
