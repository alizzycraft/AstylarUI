import assert from 'node:assert/strict';
import { statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

// This named baseline requires the complete retained evidence set. Keep the
// general exporter available for other captures; do not silently use its
// default supplemental/line-box paths for this historical capture.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const requested = process.argv.slice(2);
assert.ok(requested.length <= 1 && requested.every(a => ['--check', '--dry-run'].includes(a)),
  'Usage: node scripts/export-material-input-audit-current-ancestry.mjs [--check|--dry-run]');
const inputs = {
  'parity-report': 'artifacts/material-parity/current-ancestry-audit/latest-report.json',
  'normal-line-box-report': 'artifacts/material-parity/normal-line-box-current-ancestry-audit/latest-report.json',
  'control-line-box-report': 'artifacts/material-parity/control-line-box-current-ancestry-audit-v3/latest-report.json',
  'supplemental-line-box-report': 'artifacts/material-parity/supplemental-line-box-current-ancestry-audit/latest-report.json',
  'supplemental-root': 'artifacts/material-parity/supplemental-current-ancestry-audit',
};
for (const [name, relative] of Object.entries(inputs)) {
  const stat = statSync(path.join(root, relative));
  assert.ok(name === 'supplemental-root' ? stat.isDirectory() : stat.isFile(), `Invalid ${name}: ${relative}`);
}
const args = ['--max-old-space-size=8192', 'scripts/run-material-input-audit.mjs',
  ...Object.entries(inputs).map(([name, relative]) => `--${name}=${relative}`),
  ...(requested.includes('--check') ? ['--check'] : [])];
if (requested.includes('--dry-run')) console.log(JSON.stringify({ cwd: root, executable: process.execPath, args }, null, 2));
else {
  // Forward the caller's cold/progress settings and preserve validation failure
  // status. Existence preflight is not evidence authentication or acceptance.
  const result = spawnSync(process.execPath, args, { cwd: root, env: process.env, stdio: 'inherit', windowsHide: true });
  if (result.error) throw result.error;
  assert.equal(result.signal, null, `Audit terminated by ${result.signal}`);
  process.exitCode = result.status ?? 1;
}
