import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import { auditSuites, selectAuditTests } from '../../scripts/run-audit-tests.mjs';
import { sectionDigests } from '../../scripts/material-audit-section-digests.mjs';

test('selection replay preserves real pointer sequence and rejects missing selection state', async () => {
  const source = readFileSync('tests/material-parity/run-material-parity.mjs', 'utf8');
  const ast = ts.createSourceFile('runner', source, ts.ScriptTarget.Latest, true);
  const declaration = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'captureSelectionTransitions');
  assert.ok(declaration);
  const page = (missing = false) => {
    let selected = 1;
    const element = index => ({ getAttribute: () => missing ? null : String(selected === index) });
    const benchmark = { state: () => ({ selected: selected === 1 }), events: () => [],
      measure: ids => ({ elements: Object.fromEntries(ids.map(id => [id, { borderBox: { left: id.endsWith('one') ? 0 : 30, top: 0, width: 20, height: 20 } }])) }) };
    return { evaluate: (fn, args) => vm.runInNewContext(`(${fn.toString()})(args)`, {
      args, performance: { now: () => 1 }, window: { __ASTYLAR_MATERIAL_BENCHMARK__: benchmark },
      document: { querySelector: selector => element(selector.includes('one') ? 0 : 1), querySelectorAll: () => [element(0), element(1)] } }),
      locator: () => ({ nth: index => ({ boundingBox: async () => ({ x: index * 30, y: 0, width: 20, height: 20 }) }),
        boundingBox: async () => ({ x: 0, y: 0 }) }),
      mouse: { click: async x => { selected = x < 30 ? 0 : 1; } }, screenshot: async () => {} };
  };
  const context = { assert, path, mkdirSync: () => {}, measureReference: async () => ({ inputTree: {} }),
    measureAstylarInputs: async () => ({ inputTree: {} }), persistInputTrees: () => ({}), settleInteraction: async () => {} };
  const replay = vm.runInNewContext(declaration.getText(ast) + ';captureSelectionTransitions', context);
  const result = await replay(page(), page(), 'button-toggle', 'diagnostic');
  assert.deepEqual(JSON.parse(JSON.stringify(result.stages.map(s => s.astylar.values))), [[false, true], [true, false], [false, true]]);
  assert.ok(result.stages.every(s => s.matches)); assert.equal(result.diagnosticOnly, true);
  await assert.rejects(replay(page(true), page(), 'button-toggle', 'diagnostic'), /Missing selection state/);
  assert.match(source, /Selection replay is diagnostic interaction-only evidence, never enforced acceptance/);
  assert.match(source, /mode: selectionReplay \? 'diagnostic-selection-replay'/);
});

test('optional settlement trace preserves public calls and restores wrappers without changing acceptance', async () => {
  const file = 'tests/material-parity/run-material-parity.mjs', source = readFileSync(file, 'utf8');
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const declaration = ast.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === 'installSettlementTrace');
  assert.equal(declaration.length, 1);
  const promise = Promise.resolve('settled'), calls = [];
  const surface = { diagnostics: { session: { status: 'idle', revision: 1 } },
    update(...args) { calls.push({ receiver: this, args }); return promise; },
    whenSettled() { return promise; }, focus() { return true; } };
  const store = { patchState(...args) { calls.push({ receiver: this, args }); } };
  const originalUpdate = surface.update, originalPatch = store.patchState;
  const window = { ng: { getComponent: () => ({ surface, store }) } };
  let cancelled;
  const context = { window, document: { querySelector: () => ({}) }, performance: { now: () => 1 },
    requestAnimationFrame: () => 42, cancelAnimationFrame: id => { cancelled = id; } };
  context.page = { evaluate: fn => vm.runInNewContext(`(${fn.toString()})()`, context) };
  await vm.runInNewContext(declaration[0].getText(ast) + ';installSettlementTrace(page)', context);
  assert.equal(surface.update('input'), promise);
  assert.equal(surface.focus('target'), true);
  store.patchState({ open: true });
  await promise;
  const trace = window.__MATERIAL_SETTLEMENT_TRACE__.finish();
  assert.equal(surface.update, originalUpdate); assert.equal(store.patchState, originalPatch);
  assert.equal(cancelled, 42); assert.equal(calls[0].receiver, surface); assert.equal(calls[1].receiver, store);
  assert.ok(trace.records.some(row => row.event === 'update-resolved'));
  assert.equal(trace.observerMayAffectTiming, true);
  const capture = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'captureInteractionCase').getText(ast);
  const acceptance = capture.slice(capture.indexOf('meetsAcceptance:'));
  assert.doesNotMatch(acceptance, /settlementTrace/);
});

test('diagnostic capture preflight separates retained replay while enforced validation stays unfiltered', () => {
  const file = 'tests/material-parity/run-material-parity.mjs';
  const ast = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const declaration = ast.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === 'validateConfiguration');
  assert.equal(declaration.length, 1);
  for (const enforce of [false, true]) {
    let argumentsSeen;
    const context = { enforce, process, root: process.cwd(), assert,
      cases: [{}], interactionCases: [], mobileFlowCases: [], browserRestartInterval: 200,
      spawnSync: (_command, args) => { argumentsSeen = args; return { status: 0 }; } };
    vm.runInNewContext(declaration[0].getText(ast) + ';validateConfiguration()', context);
    assert.equal(argumentsSeen.at(-1), 'tests/material-parity/benchmark-config.spec.mjs');
    assert.equal(argumentsSeen.includes('--test-name-pattern'), !enforce);
    if (enforce) assert.deepEqual(Array.from(argumentsSeen), ['--test', 'tests/material-parity/benchmark-config.spec.mjs']);
    else {
      const pattern = new RegExp(argumentsSeen[2]);
      assert.ok(pattern.test('covers every installed Angular Material component entry point'));
      assert.ok(pattern.test('keeps the app catalog and enforced static matrix complete'));
      assert.ok(!pattern.test('public omitted box sizing finding preserves explicit controls and complete prior policy'));
    }
    context.spawnSync = () => ({ status: 1 });
    assert.throws(() => vm.runInNewContext(declaration[0].getText(ast) + ';validateConfiguration()', context));
  }
});

test('all canonical proof pointers resolve after focused/integration test moves', async () => {
  const file = 'tests/material-parity/input-equivalence-audit.mjs';
  const ast = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const code = ['focusedProofInventory', 'proof'].map(name => {
    const matches = ast.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
    assert.equal(matches.length, 1); return matches[0].getText(ast);
  }).join('\n');
  const inspect = reader => vm.runInNewContext(code + '; focusedProofInventory(root)',
    { readFileSync: reader, path, root: process.cwd() });
  const proofs = inspect(readFileSync);
  // Exact 46eaeb4c cold-verified publication, not unchecked registry growth.
  // Section receipt be43596d binds every field/order; conservation b51e4b31
  // proves only21 benchmark line numbers moved from the e771 publication.
  assert.equal(proofs.length, 219);
  const expected = [{ name: 'focusedProofs', tokens: 3943,
    sha256: 'f1597df730ae3e3fbf4f79cf1ed6ead8ec6edc5cb397a7a5d2d9931b5eba789a' }];
  const digestProofs = value => sectionDigests([Buffer.from(JSON.stringify({ focusedProofs: value }))]);
  assert.deepEqual(await digestProofs(proofs), expected);
  const altered = JSON.parse(JSON.stringify(proofs));
  altered[0].description += ' unchecked claim';
  assert.notDeepEqual(await digestProofs(altered), expected);
  assert.notDeepEqual(await digestProofs([...proofs, proofs[0]]), expected);
  assert.equal(proofs.filter(p => p.status === 'current light desktop five-family empty-caret visibility and ink boundary').length, 1);
  assert.equal(proofs.filter(p => p.status === 'public equal-input scrollbar track interaction diagnostic counterexample').length, 1);
  assert.equal(proofs.filter(p => p.status ===
    'ordinary default-light mobile tooltip live-material retention diagnostic counterexample (requested dark)').length, 1);
  assert.ok(proofs.every(p => Number.isInteger(p.line) && p.line > 0 && p.status !== 'missing'));
  const broken = inspect((file, encoding) => file.endsWith('slider-input-box-integration.spec.mjs')
    ? '' : readFileSync(file, encoding));
  assert.equal(broken.filter(p => p.status === 'missing').length, 1);
});

test('focused audit suites do not invoke full aggregation and keep integration explicitly available', () => {
  for (const area of ['slider', 'position', 'origin']) {
    const focused = selectAuditTests('focused', area), integration = selectAuditTests('integration', area);
    assert.ok(integration.length);
    for (const file of focused) {
      assert.ok(!integration.includes(file));
      assert.doesNotMatch(readFileSync(file, 'utf8'), /\b(?:buildMaterialInputAudit|collectStyleDiscrepancies)\b/);
    }
  }
  assert.throws(() => selectAuditTests('full', 'slider'));
  assert.throws(() => selectAuditTests('focused', 'typo'));
  assert.ok(auditSuites.workflow.focused.includes('audit-workflow'));
});
