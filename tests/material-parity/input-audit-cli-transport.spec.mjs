import assert from 'node:assert/strict';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { decodeMaterialInputAudit } from './input-audit-report-codec.mjs';

test('audit CLI awaits streamed transport and preserves unresolved, stale and malformed failures', () => {
  const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
  const temporaryParent = path.resolve(tmpdir());
  const workspace = mkdtempSync(path.join(temporaryParent, 'astylar-audit-cli-'));
  try {
    for (const directory of ['scripts', 'tests/material-parity', 'docs']) mkdirSync(path.join(workspace, directory), { recursive: true });
    for (const file of ['scripts/run-material-input-audit.mjs', 'tests/material-parity/input-audit-report-codec.mjs',
      'tests/material-parity/input-audit-report-stream.mjs']) copyFileSync(path.join(root, file), path.join(workspace, file));
    // Only the expensive collector is replaced. The maintained executable,
    // writer, gzip bytes, manifest and byte checker run unchanged in a child.
    writeFileSync(path.join(workspace, 'tests/material-parity/input-equivalence-audit.mjs'), `
      import { readFileSync } from 'node:fs';
      export const parseMaterialInputAuditArguments = args => ({ check: args.includes('--check'),
        allowPartial: false, parityPath: 'parity.json' });
      export const buildMaterialInputAudit = () => JSON.parse(readFileSync('expected.json'));
      export const renderMaterialInputAuditMarkdown = () => 'CLI boundary fixture\\n';
      export const validateMaterialInputAudit = () => ['deliberately unresolved fixture'];
    `);
    // Fail any accidental return to aggregate-object serialization in either
    // executable branch, without allocating an oversized fixture in this test.
    writeFileSync(path.join(workspace, 'guard.mjs'), `
      const native = JSON.stringify;
      JSON.stringify = (value, ...args) => {
        if (value && typeof value === 'object' && 'elementInventory' in value)
          throw new RangeError('aggregate audit serialization forbidden');
        return native(value, ...args);
      };
    `);
    const expected = { schemaVersion: 3, coverage: { executedStatic: 1, configuredStatic: 1,
      executedInteractions: 0, configuredInteractions: 0 }, summary: { uniqueStyleDifferences: 1,
      totalStyleDifferenceOccurrences: 1, sourceFindings: 0, inputEquivalent: false },
      elementInventory: { observations: [{ text: 'שלום 🎨', reference: '0px', candidate: 0 }] } };
    writeFileSync(path.join(workspace, 'expected.json'), JSON.stringify(expected));
    writeFileSync(path.join(workspace, 'parity.json'), '{}');
    const run = (args = []) => spawnSync(process.execPath,
      ['--import', './guard.mjs', 'scripts/run-material-input-audit.mjs', ...args], { cwd: workspace, encoding: 'utf8' });
    const generated = run();
    assert.equal(generated.status, 1);
    assert.match(generated.stderr, /ERROR: deliberately unresolved fixture/);
    assert.doesNotMatch(generated.stderr, /aggregate audit serialization forbidden|TypeError/);
    const manifestPath = path.join(workspace, 'docs/material-input-equivalence-audit.json');
    const payloadPath = path.join(workspace, 'docs/material-input-equivalence-audit.json.gz');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')), payload = readFileSync(payloadPath);
    assert.deepEqual(decodeMaterialInputAudit(manifest, payload).report, expected);
    const checked = run(['--check']);
    assert.equal(checked.status, 1);
    assert.match(checked.stderr, /ERROR: deliberately unresolved fixture/);
    assert.doesNotMatch(checked.stderr, /aggregate audit serialization forbidden|stale/);
    expected.elementInventory.observations[0].reference = 'different';
    writeFileSync(path.join(workspace, 'expected.json'), JSON.stringify(expected));
    const stale = run(['--check']);
    assert.equal(stale.status, 1); assert.match(stale.stderr, /machine audit is stale/);
    assert.deepEqual(readFileSync(payloadPath), payload, 'Check mode must not overwrite evidence');
    writeFileSync(manifestPath, JSON.stringify({ ...manifest, payload: '../outside.gz' }));
    const malformed = run(['--check']);
    assert.equal(malformed.status, 1); assert.match(malformed.stderr, /unexpected audit payload path/);
  } finally {
    assert.equal(path.dirname(path.resolve(workspace)), temporaryParent);
    assert.ok(path.basename(workspace).startsWith('astylar-audit-cli-'));
    rmSync(workspace, { recursive: true, force: true });
  }
});
