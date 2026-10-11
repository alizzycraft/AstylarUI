import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import { auditSuites, selectAuditTests } from '../../scripts/run-audit-tests.mjs';

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

test('all canonical proof pointers resolve after focused/integration test moves', () => {
  const file = 'tests/material-parity/input-equivalence-audit.mjs';
  const ast = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const code = ['focusedProofInventory', 'proof'].map(name => {
    const matches = ast.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
    assert.equal(matches.length, 1); return matches[0].getText(ast);
  }).join('\n');
  const inspect = reader => vm.runInNewContext(code + '; focusedProofInventory(root)',
    { readFileSync: reader, path, root: process.cwd() });
  const proofs = inspect(readFileSync);
  // Original 107 plus sixteen public/popup proofs, the retained standalone
  // cohort registration, and the ordinary tooltip ownership counterexample.
  assert.equal(proofs.length, 127);
  assert.equal(proofs.filter(p => p.status === 'current light desktop five-family empty-caret visibility and ink boundary').length, 1);
  assert.equal(proofs.filter(p => p.status === 'public equal-input scrollbar track interaction diagnostic counterexample').length, 1);
  assert.equal(proofs.filter(p => p.status ===
    'ordinary dark mobile tooltip live-material retention diagnostic counterexample').length, 1);
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
