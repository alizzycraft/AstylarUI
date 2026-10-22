import assert from 'node:assert/strict';
import { statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

// This named baseline requires the complete retained evidence set. Keep the
// general exporter available for other captures; do not silently use its
// default supplemental/line-box paths for this historical capture.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rawRequested = process.argv.slice(2);
const staticAx = rawRequested.includes('--static-ax');
const cardInputs = rawRequested.includes('--card-inputs');
const expansionSemantics = rawRequested.includes('--expansion-semantics');
const stepperInputs = rawRequested.includes('--stepper-inputs');
assert.ok(!(staticAx && cardInputs), 'Choose one case-review supplement');
assert.ok(!(expansionSemantics && (staticAx || cardInputs)), 'Choose one case-review supplement');
assert.ok(!(stepperInputs && (staticAx || cardInputs || expansionSemantics)), 'Choose one case-review supplement');
const requested = rawRequested.filter(argument => !['--static-ax', '--card-inputs', '--expansion-semantics', '--stepper-inputs'].includes(argument));
assert.ok(requested.length <= 1 && requested.every(a => ['--check', '--dry-run'].includes(a)),
  'Usage: node scripts/export-material-input-audit-current-ancestry.mjs [--check|--dry-run] [--static-ax|--card-inputs|--expansion-semantics|--stepper-inputs]');
const inputs = {
  'parity-report': 'artifacts/material-parity/current-ancestry-audit/latest-report.json',
  'normal-line-box-report': 'artifacts/material-parity/normal-line-box-current-ancestry-audit/latest-report.json',
  'control-line-box-report': 'artifacts/material-parity/control-line-box-current-ancestry-audit-v3/latest-report.json',
  'supplemental-line-box-report': 'artifacts/material-parity/supplemental-line-box-current-ancestry-audit/latest-report.json',
  'supplemental-root': 'artifacts/material-parity/supplemental-current-ancestry-audit',
  'case-obligation-review': stepperInputs ? 'artifacts/material-parity/working-audit/proposals/ff305b14217b7123b98a2e00f3ecb9ad443cd89606eaf688ea11f6118b7fb069.json' : expansionSemantics ? 'artifacts/material-parity/working-audit/proposals/5caa57e5f2254471d9d082ff0831db36704f73997b41ae48aa4b4064b45c4c99.json' : cardInputs ? 'artifacts/material-parity/working-audit/proposals/20dfb80485f094eaec4025e56ac7d5bb4a375f388643d192cb14f5d5fecbf82b.json' : staticAx ? 'artifacts/material-parity/working-audit/proposals/33b7ccf93a9df72a878ba302c5a0b8867ef01a2b24cb81a47a59e9c7a5b16460.json' : 'artifacts/material-parity/working-audit/proposals/50315381bf02df83158d2743488dddd5aee827d4695f7047d49802c2637de44a.json',
};
for (const [name, relative] of Object.entries(inputs)) {
  const stat = statSync(path.join(root, relative));
  assert.ok(name === 'supplemental-root' ? stat.isDirectory() : stat.isFile(), `Invalid ${name}: ${relative}`);
}
const args = ['--max-old-space-size=8192', 'scripts/run-material-input-audit.mjs',
  ...Object.entries(inputs).map(([name, relative]) => `--${name}=${relative}`),
  stepperInputs ? '--case-obligation-review-sha256=ff305b14217b7123b98a2e00f3ecb9ad443cd89606eaf688ea11f6118b7fb069' : expansionSemantics ? '--case-obligation-review-sha256=5caa57e5f2254471d9d082ff0831db36704f73997b41ae48aa4b4064b45c4c99' : cardInputs ? '--case-obligation-review-sha256=20dfb80485f094eaec4025e56ac7d5bb4a375f388643d192cb14f5d5fecbf82b' : staticAx ? '--case-obligation-review-sha256=33b7ccf93a9df72a878ba302c5a0b8867ef01a2b24cb81a47a59e9c7a5b16460' : '--case-obligation-review-sha256=50315381bf02df83158d2743488dddd5aee827d4695f7047d49802c2637de44a',
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
