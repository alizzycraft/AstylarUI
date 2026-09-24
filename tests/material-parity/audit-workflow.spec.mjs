import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import { auditSuites, selectAuditTests } from '../../scripts/run-audit-tests.mjs';

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
  assert.equal(proofs.length, 106);
  assert.ok(proofs.every(p => Number.isInteger(p.line) && p.line > 0 && p.status !== 'missing'));
  const broken = inspect((file, encoding) => file.endsWith('slider-input-box-integration.spec.mjs')
    ? '' : readFileSync(file, encoding));
  assert.equal(broken.filter(p => p.status === 'missing').length, 1);
});

test('focused audit suites do not invoke full aggregation and keep integration explicitly available', () => {
  for (const area of ['slider', 'position']) {
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
