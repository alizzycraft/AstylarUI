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
const tabsMenuSheet = rawRequested.includes('--tabs-menu-sheet');
const staticSemanticInputs = rawRequested.includes('--static-semantic-inputs');
const stepperInputs = rawRequested.includes('--stepper-inputs');
const popupDepthInputs = rawRequested.includes('--popup-depth-inputs');
const scrollbarPaint = rawRequested.includes('--scrollbar-paint');
const tableLabelPaint = rawRequested.includes('--table-label-paint');
const radioCaretPaint = rawRequested.includes('--radio-caret-paint');
const retainedFocus = rawRequested.includes('--retained-focus');
assert.ok(!(retainedFocus && (staticAx || cardInputs || expansionSemantics || stepperInputs || tabsMenuSheet || staticSemanticInputs || popupDepthInputs || scrollbarPaint || tableLabelPaint || radioCaretPaint)), 'Choose one case-review supplement');
assert.ok(!(radioCaretPaint && (staticAx || cardInputs || expansionSemantics || stepperInputs || tabsMenuSheet || staticSemanticInputs || popupDepthInputs || scrollbarPaint || tableLabelPaint)), 'Choose one case-review supplement');
assert.ok(!(tableLabelPaint && (staticAx || cardInputs || expansionSemantics || stepperInputs || tabsMenuSheet || staticSemanticInputs || popupDepthInputs || scrollbarPaint)), 'Choose one case-review supplement');
assert.ok(!(scrollbarPaint && (staticAx || cardInputs || expansionSemantics || stepperInputs || tabsMenuSheet || staticSemanticInputs || popupDepthInputs)), 'Choose one case-review supplement');
assert.ok(!(popupDepthInputs && (staticAx || cardInputs || expansionSemantics || stepperInputs || tabsMenuSheet || staticSemanticInputs)), 'Choose one case-review supplement');
assert.ok(!(staticAx && cardInputs), 'Choose one case-review supplement');
assert.ok(!(expansionSemantics && (staticAx || cardInputs)), 'Choose one case-review supplement');
assert.ok(!(stepperInputs && (staticAx || cardInputs || expansionSemantics)), 'Choose one case-review supplement');
assert.ok(!(tabsMenuSheet && (staticAx || cardInputs || expansionSemantics || stepperInputs)), 'Choose one case-review supplement');
assert.ok(!(staticSemanticInputs && (staticAx || cardInputs || expansionSemantics || stepperInputs || tabsMenuSheet)), 'Choose one case-review supplement');
const requested = rawRequested.filter(argument => !['--static-ax', '--card-inputs', '--expansion-semantics', '--stepper-inputs', '--tabs-menu-sheet', '--static-semantic-inputs', '--popup-depth-inputs', '--scrollbar-paint', '--table-label-paint', '--radio-caret-paint', '--retained-focus'].includes(argument));
assert.ok(requested.length <= 1 && requested.every(a => ['--check', '--dry-run'].includes(a)),
  'Usage: node scripts/export-material-input-audit-current-ancestry.mjs [--check|--dry-run] [--static-ax|--card-inputs|--expansion-semantics|--stepper-inputs|--tabs-menu-sheet|--static-semantic-inputs|--popup-depth-inputs|--scrollbar-paint|--table-label-paint|--radio-caret-paint|--retained-focus]');
const inputs = {
  'parity-report': 'artifacts/material-parity/current-ancestry-audit/latest-report.json',
  'normal-line-box-report': 'artifacts/material-parity/normal-line-box-current-ancestry-audit/latest-report.json',
  'control-line-box-report': 'artifacts/material-parity/control-line-box-current-ancestry-audit-v3/latest-report.json',
  'supplemental-line-box-report': 'artifacts/material-parity/supplemental-line-box-current-ancestry-audit/latest-report.json',
  'supplemental-root': 'artifacts/material-parity/supplemental-current-ancestry-audit',
  'case-obligation-review': staticSemanticInputs ? 'artifacts/material-parity/working-audit/proposals/821919099916339a177403d8c6cc66ede9aeaa20501a23ace9c568df75160f11.json' : tabsMenuSheet ? 'artifacts/material-parity/working-audit/proposals/7eb107dec98a464f2c859c3c6f205d678719649b890c586bb52ce2d1d59640b4.json' : stepperInputs ? 'artifacts/material-parity/working-audit/proposals/ff305b14217b7123b98a2e00f3ecb9ad443cd89606eaf688ea11f6118b7fb069.json' : expansionSemantics ? 'artifacts/material-parity/working-audit/proposals/5caa57e5f2254471d9d082ff0831db36704f73997b41ae48aa4b4064b45c4c99.json' : cardInputs ? 'artifacts/material-parity/working-audit/proposals/20dfb80485f094eaec4025e56ac7d5bb4a375f388643d192cb14f5d5fecbf82b.json' : staticAx ? 'artifacts/material-parity/working-audit/proposals/33b7ccf93a9df72a878ba302c5a0b8867ef01a2b24cb81a47a59e9c7a5b16460.json' : 'artifacts/material-parity/working-audit/proposals/50315381bf02df83158d2743488dddd5aee827d4695f7047d49802c2637de44a.json',
};
if (popupDepthInputs) inputs['case-obligation-review'] = 'artifacts/material-parity/working-audit/proposals/eb8ca85a92bc8707f6fe2ba7404bf1e7caaacc9e57c733faf5a4cda6588862d4.json';
if (scrollbarPaint) inputs['case-obligation-review'] = 'artifacts/material-parity/working-audit/proposals/eb30019d906e601dfdaf10cd7ed8a9c9de141764e92316506b5ebfb2e0a392ac.json';
if (tableLabelPaint) inputs['case-obligation-review'] = 'artifacts/material-parity/working-audit/proposals/075fa58b82b7cf4f04d7496cefaec3e444b7136fed154e255ac192addea36c7a.json';
if (radioCaretPaint) inputs['case-obligation-review'] = 'artifacts/material-parity/working-audit/proposals/6889b546f95572c1df93b4c598634b3ad3565553bc69a99ff2a9e1c6b791590c.json';
if (retainedFocus) inputs['case-obligation-review'] = 'artifacts/material-parity/working-audit/proposals/aeb1ef1452d65ab53677088ee2944bdf453a7b0d2e0e9f6fed0f987a4e3f4a36.json';
for (const [name, relative] of Object.entries(inputs)) {
  const stat = statSync(path.join(root, relative));
  assert.ok(name === 'supplemental-root' ? stat.isDirectory() : stat.isFile(), `Invalid ${name}: ${relative}`);
}
const args = ['--max-old-space-size=8192', 'scripts/run-material-input-audit.mjs',
  ...Object.entries(inputs).map(([name, relative]) => `--${name}=${relative}`),
  staticSemanticInputs ? '--case-obligation-review-sha256=821919099916339a177403d8c6cc66ede9aeaa20501a23ace9c568df75160f11' : tabsMenuSheet ? '--case-obligation-review-sha256=7eb107dec98a464f2c859c3c6f205d678719649b890c586bb52ce2d1d59640b4' : stepperInputs ? '--case-obligation-review-sha256=ff305b14217b7123b98a2e00f3ecb9ad443cd89606eaf688ea11f6118b7fb069' : expansionSemantics ? '--case-obligation-review-sha256=5caa57e5f2254471d9d082ff0831db36704f73997b41ae48aa4b4064b45c4c99' : cardInputs ? '--case-obligation-review-sha256=20dfb80485f094eaec4025e56ac7d5bb4a375f388643d192cb14f5d5fecbf82b' : staticAx ? '--case-obligation-review-sha256=33b7ccf93a9df72a878ba302c5a0b8867ef01a2b24cb81a47a59e9c7a5b16460' : '--case-obligation-review-sha256=50315381bf02df83158d2743488dddd5aee827d4695f7047d49802c2637de44a',
  ...(requested.includes('--check') ? ['--check'] : [])];
if (popupDepthInputs) args[args.findIndex(argument => argument.startsWith('--case-obligation-review-sha256='))] = '--case-obligation-review-sha256=eb8ca85a92bc8707f6fe2ba7404bf1e7caaacc9e57c733faf5a4cda6588862d4';
if (scrollbarPaint) args[args.findIndex(argument => argument.startsWith('--case-obligation-review-sha256='))] = '--case-obligation-review-sha256=eb30019d906e601dfdaf10cd7ed8a9c9de141764e92316506b5ebfb2e0a392ac';
if (tableLabelPaint) args[args.findIndex(argument => argument.startsWith('--case-obligation-review-sha256='))] = '--case-obligation-review-sha256=075fa58b82b7cf4f04d7496cefaec3e444b7136fed154e255ac192addea36c7a';
if (radioCaretPaint) args[args.findIndex(argument => argument.startsWith('--case-obligation-review-sha256='))] = '--case-obligation-review-sha256=6889b546f95572c1df93b4c598634b3ad3565553bc69a99ff2a9e1c6b791590c';
if (retainedFocus) args[args.findIndex(argument => argument.startsWith('--case-obligation-review-sha256='))] = '--case-obligation-review-sha256=aeb1ef1452d65ab53677088ee2944bdf453a7b0d2e0e9f6fed0f987a4e3f4a36';
if (requested.includes('--dry-run')) console.log(JSON.stringify({ cwd: root, executable: process.execPath, args }, null, 2));
else {
  // Forward the caller's cold/progress settings and preserve validation failure
  // status. Existence preflight is not evidence authentication or acceptance.
  const result = spawnSync(process.execPath, args, { cwd: root, env: process.env, stdio: 'inherit', windowsHide: true });
  if (result.error) throw result.error;
  assert.equal(result.signal, null, `Audit terminated by ${result.signal}`);
  process.exitCode = result.status ?? 1;
}
