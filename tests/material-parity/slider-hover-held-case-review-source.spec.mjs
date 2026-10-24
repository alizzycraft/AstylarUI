import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import ts from 'typescript';
import path from 'node:path';
import { restoreSliderHoverHeldBenchmark, createSliderHoverHeldReviewReader, restoreSliderHoverHeldExportSource, restoreSliderHoverHeldProducer, restoreSliderHoverHeldRetainedTest, restoreSliderHoverHeldSharedRegistration, sliderHoverHeldReview } from './slider-hover-held-case-review-source.mjs';
import { restoreRetainedFocusProducer, restoreStaticSemanticProducer, restoreRetainedFocusExportSource } from './static-semantic-registration.mjs';

test('slider hover-held producer registration conserves accepted inventories', () => {
  const file = 'tests/material-parity/input-equivalence-audit.mjs', source = readFileSync(file, 'utf8');
  const prior = restoreSliderHoverHeldProducer(source);
  assert.throws(() => restoreSliderHoverHeldProducer(source + '\n// drift\n'));
  const collect = text => {
    const ast = ts.createSourceFile(file, text, 99, true);
    const owner = name => ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name);
    const code = ['proof', 'sourceFingerprints', 'focusedProofInventory'].map(name => owner(name).getText(ast)).join('\n');
    return new Function('readFileSync', 'path', 'createHash', code + ';return {sources:sourceFingerprints(process.cwd()),proofs:focusedProofInventory(process.cwd())};')(readFileSync, path, createHash);
  };
  const current = collect(source), previous = collect(prior);
  assert.equal(current.sources.length, 962); assert.equal(new Set(current.sources.map(row => row.file)).size, 962);
  assert.equal(current.proofs.length, 285);
  assert.deepEqual(current.sources.slice(7), previous.sources);
  assert.deepEqual(current.proofs.slice(7), previous.proofs);
  assert.ok(current.proofs.slice(0, 7).every(row => row.line > 0));
  const retainedTest = readFileSync('tests/material-parity/retained-pointer-focus-reuse.spec.mjs', 'utf8');
  assert.equal(createHash('sha256').update(restoreSliderHoverHeldRetainedTest(retainedTest)).digest('hex'),
    '69186088c5f756679132657b9e89c39556076f666446c030fa749de044cfdd5b');
  assert.throws(() => restoreSliderHoverHeldRetainedTest(retainedTest + '\n// drift\n'));
  const shared = readFileSync('tests/material-parity/static-semantic-registration.mjs', 'utf8');
  assert.equal(createHash('sha256').update(restoreSliderHoverHeldSharedRegistration(shared)).digest('hex'),
    '0c5e1521276c8721d245b7dfd8fbf12a11aa109162059897df298d2108ee033b');
  assert.throws(() => restoreSliderHoverHeldSharedRegistration(shared + '\n// drift\n'));
  assert.equal(createHash('sha256').update(restoreRetainedFocusProducer(source)).digest('hex'),
    '0d5d56e87b3474630a211f685d0817ff94b5dd7eb32a07036f78e20366aa3392');
  assert.equal(createHash('sha256').update(restoreStaticSemanticProducer(source)).digest('hex'),
    '7e0caa327de5fbde079ee59b469aa4f18f2cf030a3e5a137770d5fe5ac0b0a22');
  assert.throws(() => restoreRetainedFocusProducer(source + '\n// drift\n'));
});

test('slider hover-held selection preserves older invocations and routes only the exact successor', () => {
  const launcher = 'scripts/export-material-input-audit-current-ancestry.mjs';
  const launch = flags => spawnSync(process.execPath, [launcher, '--dry-run', ...flags], { encoding: 'utf8', windowsHide: true });
  const selected = launch(['--slider-hover-held']); assert.equal(selected.status, 0, selected.stderr);
  const invocation = JSON.parse(selected.stdout);
  assert.ok(invocation.args.includes(`--case-obligation-review-sha256=${sliderHoverHeldReview}`));
  assert.ok(invocation.args.includes(`--case-obligation-review=artifacts/material-parity/working-audit/proposals/${sliderHoverHeldReview}.json`));
  // --check and --dry-run remain mutually exclusive,as in older invocations.
  const check = launch(['--slider-hover-held', '--check']); assert.notEqual(check.status, 0);
  assert.match(check.stderr, /Usage:/);
  for (const flag of ['--static-ax', '--card-inputs', '--expansion-semantics', '--stepper-inputs', '--tabs-menu-sheet',
    '--static-semantic-inputs', '--popup-depth-inputs', '--scrollbar-paint', '--table-label-paint', '--radio-caret-paint', '--retained-focus']) {
    const older = launch([flag]); assert.equal(older.status, 0, older.stderr);
    assert.ok(!older.stdout.includes(sliderHoverHeldReview));
    const combined = launch([flag, '--slider-hover-held']); assert.notEqual(combined.status, 0);
    assert.match(combined.stderr, /Choose one case-review supplement/);
  }
  const ordinary = launch([]); assert.equal(ordinary.status, 0); assert.ok(!ordinary.stdout.includes(sliderHoverHeldReview));
  const runner = readFileSync('scripts/run-material-input-audit.mjs', 'utf8');
  const ast = ts.createSourceFile('runner.mjs', runner, 99, true), declarations = [];
  const visit = node => {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'effectiveReaderFactory') declarations.push(node);
    ts.forEachChild(node, visit);
  };
  visit(ast); assert.equal(declarations.length, 1);
  const choose = new Function('options', 'sliderHoverHeldReview', 'createSliderHoverHeldReviewReader', 'finalReaderFactory',
    `return ${declarations[0].initializer.getText(ast)};`);
  const older = () => {};
  assert.equal(choose({ caseObligationReviewSha256: sliderHoverHeldReview }, sliderHoverHeldReview, createSliderHoverHeldReviewReader, older), createSliderHoverHeldReviewReader);
  assert.equal(choose({ caseObligationReviewSha256: '0'.repeat(64) }, sliderHoverHeldReview, createSliderHoverHeldReviewReader, older), older);
  for (const [file, kind] of [['scripts/run-material-input-audit.mjs', 'runner'], [launcher, 'launcher']]) {
    const source = readFileSync(file, 'utf8');
    assert.ok(restoreSliderHoverHeldExportSource(source, kind).length > 0);
    assert.ok(restoreRetainedFocusExportSource(source, kind).length > 0);
    assert.throws(() => restoreSliderHoverHeldExportSource(source + '\n// unreviewed drift\n', kind));
  }
});

test('slider hover-held source boundary recovers the complete prior benchmark and rejects drift', () => {
  const current = readFileSync('tests/material-parity/benchmark-config.spec.mjs');
  const prior = restoreSliderHoverHeldBenchmark(current);
  assert.equal(createHash('sha256').update(prior).digest('hex'),
    '31f2cb8ec0aa6299e4854d07b70f8031e0e646a2a39812841e984e5a7098ab57');
  assert.throws(() => restoreSliderHoverHeldBenchmark(Buffer.concat([current, Buffer.from('\n// unreviewed drift\n')])));
  assert.throws(() => restoreSliderHoverHeldBenchmark(prior));
  assert.throws(() => createSliderHoverHeldReviewReader({ root: process.cwd(), read: readFileSync, reviewSha256: '0'.repeat(64) }));
});
