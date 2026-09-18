import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { materialAuditHarnessPlan, runMaterialAuditHarness } from '../../scripts/run-material-audit-harness.mjs';

test('complete Material audit plan includes every discovered suite and every legacy test', () => {
  const root = fileURLToPath(new URL('../../', import.meta.url)), plan = materialAuditHarnessPlan(root);
  assert.ok(plan.counts['tests/material-parity'] >= 65);
  assert.ok(plan.additionalFiles.includes('tests/material-parity/button-fixed-width-canonical-integration.spec.mjs'));
  assert.ok(plan.additionalFiles.includes('tests/material-parity/button-box-sizing-log-proof.spec.mjs'));
  assert.ok(plan.additionalFiles.includes('tests/material-parity/owner-caret-proof-commands.spec.mjs'));
  assert.ok(plan.additionalFiles.includes('tests/material-parity/owner-caret-canonical-integration.spec.mjs'));
  assert.ok(plan.additionalFiles.includes('tests/material-parity/owner-caret-canonical-conservation.spec.mjs'));
  assert.ok(plan.additionalFiles.includes('tests/material-parity/later-caret-integration-conservation.spec.mjs'));
  assert.ok(plan.additionalFiles.includes('tests/material-parity/pending-caret-context-commands.spec.mjs'));
  assert.ok(plan.files.includes('tests/parity/material-audit-harness-inventory.spec.mjs'));
  assert.deepEqual(plan.nodeArguments, ['--test', '--test-concurrency=1', ...plan.files]);
  assert.equal(plan.files.length, Object.values(plan.counts).reduce((a, b) => a + b, 0));
});

test('discovery includes future nested tests, runs real children and refuses lost legacy coverage', async () => {
  const parent = path.resolve(tmpdir()), root = mkdtempSync(path.join(parent, 'material-audit-inventory-'));
  try {
    for (const directory of ['tests/parity', 'tests/tts-parity', 'tests/material-parity/nested'])
      mkdirSync(path.join(root, directory), { recursive: true });
    const legacy = 'tests/parity/old.spec.mjs';
    writeFileSync(path.join(root, legacy), '');
    writeFileSync(path.join(root, 'tests/material-parity/nested/new.spec.mjs'), '');
    writeFileSync(path.join(root, 'tests/material-parity/not-a-test.mjs'), '');
    const packageFile = path.join(root, 'package.json');
    writeFileSync(packageFile, JSON.stringify({ scripts: { 'parity:harness:check': 'node --test ' + legacy } }));
    const plan = materialAuditHarnessPlan(root);
    assert.deepEqual(plan.files, ['tests/material-parity/nested/new.spec.mjs', legacy]);
    assert.equal(await runMaterialAuditHarness(plan, { stdio: 'ignore' }), 0);
    writeFileSync(path.join(root, 'tests/material-parity/nested/new.spec.mjs'), "throw new Error('deliberate child failure');");
    assert.equal(await runMaterialAuditHarness(plan, { stdio: 'ignore' }), 1);
    writeFileSync(packageFile, JSON.stringify({ scripts: { 'parity:harness:check': 'node --test tests/parity/missing.spec.mjs' } }));
    assert.throws(() => materialAuditHarnessPlan(root), /legacy test lost/);
  } finally {
    assert.equal(path.dirname(path.resolve(root)), parent);
    assert.ok(path.basename(root).startsWith('material-audit-inventory-'));
    rmSync(root, { recursive: true, force: true });
  }
});

test('CLI rejects filtering arguments instead of reporting a partial harness as complete', () => {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const child = spawnSync(process.execPath, ['scripts/run-material-audit-harness.mjs', '--test-name-pattern=only-one'],
    { cwd: root, encoding: 'utf8' });
  assert.equal(child.status, 1); assert.match(child.stderr, /no fixture\/test filters/);
  assert.doesNotMatch(child.stdout, /complete-material-audit-harness-inventory/);
});

test('runner forwards the complete inventory and preserves child failures', async () => {
  const plan = { cwd: 'test-workspace', nodeArguments: ['--test', '--test-concurrency=1', 'one.spec.mjs', 'two.spec.mjs'] };
  for (const code of [0, 1, 7]) {
    const result = await runMaterialAuditHarness(plan, { spawnProcess: (executable, args, options) => {
      assert.equal(executable, process.execPath); assert.deepEqual(args, plan.nodeArguments);
      const expectedEnv = { ...process.env }; delete expectedEnv.NODE_TEST_CONTEXT;
      assert.deepEqual(options, { cwd: plan.cwd, stdio: 'inherit', env: expectedEnv });
      const child = new EventEmitter(); queueMicrotask(() => child.emit('exit', code, null)); return child;
    } });
    assert.equal(result, code);
  }
  for (const event of ['error', 'signal']) {
    await assert.rejects(runMaterialAuditHarness(plan, { spawnProcess: () => {
      const child = new EventEmitter(); queueMicrotask(() => event === 'error'
        ? child.emit('error', new Error('spawn failure')) : child.emit('exit', null, 'SIGTERM'));
      return child;
    } }), event === 'error' ? /spawn failure/ : /SIGTERM/);
  }
});
