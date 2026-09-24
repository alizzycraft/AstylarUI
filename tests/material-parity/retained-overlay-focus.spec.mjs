import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import { chromium } from 'playwright-core';

// Diagnose the retained harness, not a requirement that a future harness keep
// this defect. Git source was compared with the capture-pinned working bytes,
// allowing only CRLF normalization; the raw capture receipt is checked below.
const hash = value => createHash('sha256').update(value).digest('hex');
const source = execFileSync('git', ['show', '58ce15f:tests/material-parity/run-material-parity.mjs'], { encoding: 'utf8', maxBuffer: 4e6 });
assert.equal(hash(source), 'c3cabcfde7b9a0cd911eb919774e258145aefc629ff308a48f1f51ece0f34e10');
const ast = ts.createSourceFile('retained.mjs', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const functions = ast.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === 'focusedIdentity');
assert.equal(functions.length, 1);
const focusedIdentity = new Function(`return (${functions[0].getText(ast)})`)();
const gates = [];
const visit = n => { if (ts.isVariableDeclaration(n) && n.name.getText(ast) === 'focusMatches') gates.push(n.initializer.getText(ast)); ts.forEachChild(n, visit); };
visit(ast); assert.deepEqual(gates, ["state !== 'focus' || referenceFocus === astylarFocus"]);
const gate = new Function('state', 'referenceFocus', 'astylarFocus', `return ${gates[0]}`);

test('retained focus measurement loses parity IDs and generated action identity; open gate ignores mismatch', async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent('<button id="dialog-primary">Open</button><button data-parity-id="dialog-cancel">Cancel</button><div class="mat-bottom-sheet-container"><a class="mat-mdc-list-item" href="#">Share</a></div><button data-astylar-id="dialog-cancel">Cancel</button>');
    await page.locator('#dialog-primary').focus();
    assert.equal(await focusedIdentity(page, 'reference', 'dialog'), 'dialog-primary');
    await page.locator('[data-parity-id]').focus();
    assert.equal(await page.evaluate(() => document.activeElement.dataset.parityId), 'dialog-cancel');
    const reference = await focusedIdentity(page, 'reference', 'dialog');
    assert.equal(reference, undefined);
    await page.locator('[data-astylar-id]').focus();
    const candidate = await focusedIdentity(page, 'astylar', 'dialog');
    assert.equal(candidate, 'dialog-cancel');
    assert.equal(gate('focus', reference, candidate), false);
    for (const state of ['open', 'activate', 'activate-leave']) assert.equal(gate(state, reference, candidate), true);
    await page.locator('a').focus();
    assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Share');
    assert.equal(await focusedIdentity(page, 'reference', 'bottom-sheet'), undefined);
    // Even the enforced focus state accepts two unidentifiable/missing owners.
    assert.equal(gate('focus', undefined, undefined), true);
  } finally { await browser.close(); }
});

test('original overlay records expose missing identities without proving focus equivalence', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(hash(bytes), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const report = JSON.parse(bytes);
  assert.equal(report.captureProvenance.harnessFiles.find(f => f.file === 'tests/material-parity/run-material-parity.mjs').sha256,
    'b2477a124293aec6bba3a2413ff58d41f409288dcf0cb53a54ed17d162b9fa97');
  for (const [family, count, candidate] of [['bottom-sheet', 25, 'bottom-sheet-primary'], ['menu', 24, 'menu-primary'], ['dialog', 24, 'dialog-cancel']]) {
    const rows = report.interactions.filter(r => r.family === family && ['open', 'activate', 'activate-leave'].includes(r.state));
    assert.equal(rows.length, count);
    for (const row of rows) {
      assert.equal(Object.hasOwn(row.focus, 'reference'), false);
      assert.equal(row.focus.astylar, candidate);
      assert.equal(row.focus.matches, true);
      assert.equal(gate(row.state, row.focus.reference, row.focus.astylar), true);
    }
  }
});

test('retained exact focus selectors identify sheet and menu actions despite missing scalar identities', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(hash(bytes), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const report = JSON.parse(bytes);
  assert.equal(report.captureProvenance.harnessFiles.find(f => f.file === 'tests/material-parity/input-tree-evidence.mjs').sha256,
    '06197edaf92b2296e3e0564771f307a1036ce7bc5eb13d8e242a5c420e7a7e3b');
  assert.equal(hash(readFileSync('tests/material-parity/input-tree-evidence.mjs')),
    '06197edaf92b2296e3e0564771f307a1036ce7bc5eb13d8e242a5c420e7a7e3b',
    'matched-rule interpretation requires the capture-pinned reader');
  for (const [family, selector, label, count] of [
    ['bottom-sheet', '.mdc-list-item:focus', 'Share', 25],
    ['menu', '.mat-mdc-menu-item:focus', 'Rename', 24],
  ]) {
    const rows = report.interactions.filter(r => r.family === family && ['open', 'activate', 'activate-leave'].includes(r.state));
    assert.equal(rows.length, count);
    for (const row of rows) {
      const descriptor = row.inputTrees.reference, treeBytes = readFileSync(descriptor.file);
      assert.equal(hash(treeBytes), descriptor.sha256);
      const tree = JSON.parse(treeBytes);
      // Exact non-pseudo, single-selector rules: a list containing :focus or
      // a class named "focused" would not prove this element matched :focus.
      const owners = tree.nodes.filter(n => n.rules.some(i =>
        tree.rules[i].selector === selector && tree.rules[i].active === true));
      assert.equal(owners.length, 1);
      const text = n => (n.ownText ?? '') + tree.nodes.filter(c => c.parent === n.key).map(text).join('');
      assert.equal(text(owners[0]).trim(), label);
      assert.equal(row.focus.astylar, `${family}-primary`);
      assert.equal(Object.hasOwn(row.focus, 'reference'), false);
      assert.equal(row.focus.matches, true);
    }
  }
  // This recovers reference focus at tree-capture time, not an event timeline
  // or a diagnosis of the current candidate runtime. Dialog lists need their
  // own proof; do not infer focus from an arbitrary matching selector branch.
});
