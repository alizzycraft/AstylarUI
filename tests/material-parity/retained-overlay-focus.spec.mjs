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

test('current overlay authoring has distinct menu, sheet and dialog focus requests', async t => {
  // Execute the actual authoring methods with a minimal surface boundary.
  // This diagnoses authored requests, not browser scheduling or core behavior.
  const bytes = readFileSync('examples/material-showcase/src/app/astylar.component.ts');
  const tree = ts.createSourceFile('current.ts', bytes.toString(), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const owner = tree.statements.find(n => ts.isClassDeclaration(n) && n.name?.text === 'AstylarShowcaseComponent');
  const names = ['handleClick', 'familyElements', 'dismissPopupForOutsideTarget'];
  const methods = names.map(name => {
    const matches = owner.members.filter(n => ts.isMethodDeclaration(n) && n.name.getText(tree) === name);
    assert.equal(matches.length, 1);
    return matches[0].getText(tree);
  });
  const emitted = ts.transpileModule(`class Probe { ${methods.join('\n')} }`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  }).outputText;
  const Probe = new Function(`${emitted}; return Probe;`)();
  const flatten = nodes => nodes.flatMap(n => [n, ...flatten(n.children ?? [])]);
  for (const family of ['menu', 'bottom-sheet', 'dialog']) {
    let state = { open: false, disabled: false };
    const requests = [], trace = [], probe = new Probe();
    Object.assign(probe, {
      store: { state: () => state, tokens: () => ({}), patchState: patch => {
        state = { ...state, ...patch }; trace.push('authored-state');
      } },
      family: () => family, status: { set() {} },
      surface: { whenSettled: () => { trace.push('settlement-request'); return Promise.resolve(); },
        focus: id => { requests.push(id); trace.push('focus-request'); return false; } },
    });
    probe.handleClick(`${family}-primary`, { targetId: `${family}-primary` });
    await Promise.resolve();
    assert.equal(state.open, true);
    const nodes = flatten(probe.familyElements(family));
    if (family === 'menu') {
      assert.deepEqual(requests, []);
      assert.deepEqual(nodes.filter(n => n.autofocus), []);
      assert.equal(nodes.find(n => n.id === 'menu-popup').role, 'menu');
    } else {
      assert.deepEqual(trace, ['authored-state', 'settlement-request', 'focus-request']);
      assert.deepEqual(requests, [`${family}-dismiss`]);
      if (family === 'dialog') {
        assert.equal(nodes.some(n => n.id === requests[0]), false);
        assert.equal(nodes.find(n => n.autofocus).id, 'dialog-cancel');
        assert.equal(nodes.find(n => n.id === 'dialog-overlay').modal, true);
      } else {
        assert.equal(nodes.find(n => n.autofocus).id, requests[0]);
        assert.equal(nodes.find(n => n.id === 'bottom-sheet-overlay').type, 'div');
      }
    }
  }
  t.diagnostic(`Current authoring source SHA-256 ${hash(bytes)}; mocked surface, no current-browser attribution`);
});

test('remaining overlay focus coverage preserves unknown identities and held capture timing', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(hash(bytes), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const report = JSON.parse(bytes);
  const capture = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'captureInteractionCase');
  const statements = capture.body.statements.find(ts.isTryStatement).tryBlock.statements;
  const position = fragment => {
    const matches = [...statements].map((n, i) => [n.getText(ast), i]).filter(([text]) => text.includes(fragment));
    assert.equal(matches.length, 1, fragment);
    return matches[0][1];
  };
  const release = position('for (const release of heldReleases)');
  assert.ok(position('const referenceMeasurement =') < release);
  assert.ok(position('const astylarMeasurement =') < release);
  assert.ok(position('captureInteractionImage(reference.page') < release);
  assert.ok(position('const referenceFocus =') > release);
  assert.ok(position('const astylarFocus =') > release);
  let accounted = 0;
  for (const [family, total] of [['menu', 82], ['bottom-sheet', 51], ['dialog', 66]]) {
    const rows = report.interactions.filter(r => r.family === family);
    assert.equal(rows.length, total);
    const remaining = rows.filter(r => !['open', 'activate', 'activate-leave',
      'open-dismiss', 'open-dismiss-outside', 'open-dismiss-canvas'].includes(r.state));
    const expected = { focus: 8, hover: 8, held: 8,
      ...(family !== 'bottom-sheet' ? { 'open-hover-content': 8 } : {}),
      ...(family === 'menu' ? { disabled: 8 } : {}) };
    assert.deepEqual(Object.fromEntries(Object.entries(Object.groupBy(remaining, r => r.state))
      .map(([state, cases]) => [state, cases.length])), expected);
    for (const row of remaining) {
      assert.equal(row.focus.matches, true);
      if (row.state === 'focus') {
        assert.equal(row.focus.reference, `${family}-primary`);
        assert.equal(row.focus.astylar, `${family}-primary`);
      } else {
        assert.equal(Object.hasOwn(row.focus, 'reference'), false);
        if (['hover', 'disabled'].includes(row.state))
          assert.equal(Object.hasOwn(row.focus, 'astylar'), false);
        else assert.equal(row.focus.astylar,
          row.state === 'open-hover-content' && family === 'dialog' ? 'dialog-cancel' : `${family}-primary`);
        assert.equal(gate(row.state, 'reference-owner', 'wrong-owner'), true);
      }
    }
    accounted += remaining.length;
  }
  assert.equal(accounted, 96);
  // Alongside the 73 opening and 30 dismissal records covered below, this
  // accounts for all 199 overlay interactions. Missing identity is unknown,
  // not proof of no focus; post-release focus is not held-state focus.
});

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

test('retained focus selectors distinguish sheet/menu mismatches from matching dialog focus', () => {
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
    ['menu', '.mat-mdc-menu-item:focus', 'Rename', 32],
  ]) {
    const rows = report.interactions.filter(r => r.family === family && ['open', 'activate', 'activate-leave', 'open-hover-content'].includes(r.state));
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
  // Every branch in this exact captured list requires the indicator's direct
  // parent to be focused. Unlike the ripple's cdk-program-focused class list,
  // there is no branch that can match merely because a class remains present.
  const selector = ['mat-mdc-button', 'mat-mdc-unelevated-button', 'mat-mdc-raised-button',
    'mat-mdc-outlined-button', 'mat-tonal-button']
    .map(c => `.${c}:focus > .mat-focus-indicator::before`).join(', ');
  const dialogs = report.interactions.filter(r => r.family === 'dialog' && ['open', 'activate', 'activate-leave', 'open-hover-content'].includes(r.state));
  assert.equal(dialogs.length, 32);
  for (const row of dialogs) {
    const descriptor = row.inputTrees.reference, bytes = readFileSync(descriptor.file);
    assert.equal(hash(bytes), descriptor.sha256);
    const tree = JSON.parse(bytes);
    const indicators = tree.nodes.filter(n => n.pseudoElements?.some(p => p.pseudo === '::before' &&
      p.rules.some(i => tree.rules[i].selector === selector && tree.rules[i].active === true)));
    assert.equal(indicators.length, 1);
    const parent = tree.nodes.find(n => n.key === indicators[0].parent);
    assert.equal(parent.type, 'button');
    assert.equal(parent.attributes['data-parity-id'], 'dialog-cancel');
    assert.equal(row.focus.astylar, 'dialog-cancel');
    assert.equal(Object.hasOwn(row.focus, 'reference'), false);
  }
  // This recovers reference focus at tree-capture time, not an event timeline
  // or a diagnosis of the current candidate runtime.
});

test('retained dismissal focus has four matching identities and twenty-six unmeasured candidate identities', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(hash(bytes), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const report = JSON.parse(bytes);
  let matched = 0, unknown = 0;
  for (const [family, state, count, candidateKnown] of [
    ['menu', 'open-dismiss', 2, true],
    ['bottom-sheet', 'open-dismiss', 2, true],
    ['dialog', 'open-dismiss', 2, false],
    ['menu', 'open-dismiss-outside', 8, false],
    ['menu', 'open-dismiss-canvas', 8, false],
    ['dialog', 'open-dismiss-outside', 8, false],
  ]) {
    const rows = report.interactions.filter(r => r.family === family && r.state === state);
    assert.equal(rows.length, count);
    for (const row of rows) {
      assert.equal(row.focus.reference, `${family}-primary`);
      assert.equal(row.focus.matches, true);
      assert.equal(Object.hasOwn(row.focus, 'astylar'), candidateKnown);
      if (candidateKnown) { assert.equal(row.focus.astylar, row.focus.reference); matched++; }
      else unknown++;
      // The retained gate skips these states, even for a demonstrably wrong
      // identity. An omitted identity cannot distinguish body focus from an
      // unidentified element; preserve uncertainty rather than call it parity.
      assert.equal(gate(state, row.focus.reference, 'wrong-owner'), true);
    }
  }
  assert.equal(matched, 4); assert.equal(unknown, 26);
});
