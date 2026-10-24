import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import ts from 'typescript';
import { prepareMenuSelection, restoreMenuSelection } from './menu-select-disabled-selection.mjs';
import { menuSelectDisabledReview } from './menu-select-disabled-review-source.mjs';
import { createMenuHistoricalRead } from './menu-select-disabled-registration.mjs';
const frozenRead = createMenuHistoricalRead({ root: process.cwd(), read: readFileSync });

test('pending Menu selection reversibly prepares explicit launcher without changing live frozen files', () => {
  const file = 'scripts/export-material-input-audit-current-ancestry.mjs', live = readFileSync(file, 'utf8').replaceAll('\r\n', '\n'), original = frozenRead(file, 'utf8').replaceAll('\r\n', '\n');
  const prepared = prepareMenuSelection(original, 'launcher'); assert.equal(restoreMenuSelection(prepared, 'launcher'), original);
  const rootLine = "const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');";
  const run = (source, flags) => spawnSync(process.execPath, ['--input-type=module', '-', '--dry-run', ...flags], {
    input: source.replace(rootLine, `const root = ${JSON.stringify(process.cwd())};`), encoding: 'utf8', windowsHide: true,
  });
  const selected = run(prepared, ['--menu-select-disabled']); assert.equal(selected.status, 0, selected.stderr);
  const args = JSON.parse(selected.stdout).args;
  assert.ok(args.includes(`--case-obligation-review-sha256=${menuSelectDisabledReview}`));
  assert.ok(args.includes(`--case-obligation-review=artifacts/material-parity/working-audit/proposals/${menuSelectDisabledReview}.json`));
  const older = ['--static-ax','--card-inputs','--expansion-semantics','--stepper-inputs','--tabs-menu-sheet','--static-semantic-inputs','--popup-depth-inputs','--scrollbar-paint','--table-label-paint','--radio-caret-paint','--retained-focus','--slider-hover-held','--slider-state-inputs','--original-runner-recovery','--divider-computed-paint','--divider-owner-frame'];
  for (const flag of older) {
    assert.notEqual(run(prepared, ['--menu-select-disabled', flag]).status, 0);
    const before = run(original, [flag]), after = run(prepared, [flag]);
    assert.equal(before.status, 0, before.stderr); assert.equal(after.status, 0, after.stderr);
    assert.deepEqual(JSON.parse(after.stdout), JSON.parse(before.stdout));
  }
  assert.deepEqual(JSON.parse(run(prepared, []).stdout), JSON.parse(run(original, []).stdout));
  assert.equal(readFileSync(file, 'utf8').replaceAll('\r\n', '\n'), live);
  assert.throws(() => prepareMenuSelection(original + '\n', 'launcher'));
});

test('pending exact runner reader selector preserves all older fallback routing', () => {
  const file = 'scripts/run-material-input-audit.mjs', live = readFileSync(file, 'utf8').replaceAll('\r\n', '\n'), original = frozenRead(file, 'utf8').replaceAll('\r\n', '\n');
  const prepared = prepareMenuSelection(original, 'runner'); assert.equal(restoreMenuSelection(prepared, 'runner'), original);
  const ast = ts.createSourceFile(file, prepared, 99, true, ts.ScriptKind.JS); assert.equal(ast.parseDiagnostics.length, 0);
  let selector; const visit = n => { if (ts.isVariableDeclaration(n) && n.name.getText(ast) === 'menuSelectReaderFactory') selector = n.initializer.getText(ast); ts.forEachChild(n, visit); }; visit(ast);
  assert.ok(selector);
  const choose = new Function('options','menuSelectDisabledReview','createMenuSelectDisabledReviewReader','ownerFrameReaderFactory', `return ${selector};`);
  const next = () => {}, prior = () => {};
  assert.equal(choose({caseObligationReviewSha256:menuSelectDisabledReview},menuSelectDisabledReview,next,prior),next);
  assert.equal(choose({caseObligationReviewSha256:'0'.repeat(64)},menuSelectDisabledReview,next,prior),prior);
  assert.equal(readFileSync(file, 'utf8').replaceAll('\r\n', '\n'), live);
});
