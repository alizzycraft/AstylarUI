import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';

export function materialAuditHarnessPlan(root) {
  const directories = ['tests/parity', 'tests/tts-parity', 'tests/material-parity'];
  function discover(directory) {
    return readdirSync(path.join(root, directory), { withFileTypes: true }).flatMap(entry => {
      const file = `${directory}/${entry.name}`;
      if (entry.isDirectory()) return discover(file);
      return entry.isFile() && entry.name.endsWith('.spec.mjs') ? [file] : [];
    });
  }
  const files = directories.flatMap(discover).sort();
  assert.ok(files.length, 'empty audit harness');
  assert.equal(new Set(files).size, files.length);
  const command = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')).scripts['parity:harness:check'];
  assert.match(command, /^node --test /, 'review a changed legacy command before claiming its coverage');
  const legacy = command.slice('node --test '.length).trim().split(/\s+/);
  assert.ok(legacy.every(file => file.endsWith('.spec.mjs')), 'unsupported legacy command syntax');
  for (const file of legacy) assert.ok(files.includes(file), `legacy test lost: ${file}`);
  return { cwd: root, files, nodeArguments: ['--test', '--test-concurrency=1', ...files],
    counts: Object.fromEntries(directories.map(directory => [directory, files.filter(file => file.startsWith(directory + '/')).length])),
    legacyFiles: legacy.length, additionalFiles: files.filter(file => !legacy.includes(file)) };
}

export function runMaterialAuditHarness(plan, { stdio = 'inherit', spawnProcess = spawn } = {}) {
  // One process owns the full unfiltered inventory. Sequential test files avoid
  // concurrent multi-gigabyte audit replays; this changes scheduling, not scope.
  return new Promise((resolve, reject) => {
    // A nested Node test otherwise skips every child file and exits 0. This is
    // a separate runner, not a continuation of the invoking test's IPC context.
    const env = { ...process.env }; delete env.NODE_TEST_CONTEXT;
    const child = spawnProcess(process.execPath, plan.nodeArguments, { cwd: plan.cwd, stdio, env });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (signal || code === null) reject(new Error(`audit harness terminated: ${signal ?? 'unknown exit'}`));
      else resolve(code);
    });
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  assert.ok(args.length === 0 || (args.length === 1 && args[0] === '--list'), 'only --list is accepted; no fixture/test filters');
  const root = fileURLToPath(new URL('../', import.meta.url));
  const plan = materialAuditHarnessPlan(root);
  console.log(JSON.stringify({ kind: 'complete-material-audit-harness-inventory', ...plan }));
  if (!args.length) process.exitCode = await runMaterialAuditHarness(plan);
}
