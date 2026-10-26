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
const chipsAlternate = rawRequested.includes('--chips-alternate');
assert.ok(!chipsAlternate || rawRequested.every(argument => ['--chips-alternate', '--check', '--dry-run'].includes(argument)), 'Choose one case-review supplement');
const focusSelection = rawRequested.includes('--focus-selection');
assert.ok(!focusSelection || rawRequested.every(argument => ['--focus-selection', '--check', '--dry-run'].includes(argument)), 'Choose one case-review supplement');
const sortArrow = rawRequested.includes('--sort-arrow');
assert.ok(!sortArrow || rawRequested.every(argument => ['--sort-arrow', '--check', '--dry-run'].includes(argument)), 'Choose one case-review supplement');
const treeFocus = rawRequested.includes('--tree-focus');
assert.ok(!treeFocus || rawRequested.every(argument => ['--tree-focus', '--check', '--dry-run'].includes(argument)), 'Choose one case-review supplement');
const textHeld = rawRequested.includes('--text-held');
assert.ok(!textHeld || rawRequested.every(argument => ['--text-held', '--check', '--dry-run'].includes(argument)), 'Choose one case-review supplement');
const editingContext = rawRequested.includes('--editing-context');
assert.ok(!editingContext || rawRequested.every(argument => ['--editing-context', '--check', '--dry-run'].includes(argument)), 'Choose one case-review supplement');
const dividerOwnerContext = rawRequested.includes('--divider-owner-context');
assert.ok(!dividerOwnerContext || rawRequested.every(argument => ['--divider-owner-context', '--check', '--dry-run'].includes(argument)), 'Choose one case-review supplement');
const menuSelectDisabled = rawRequested.includes('--menu-select-disabled');
assert.ok(!menuSelectDisabled || rawRequested.every(argument => ['--menu-select-disabled', '--check', '--dry-run'].includes(argument)), 'Choose one case-review supplement');
const dividerOwnerFrame = rawRequested.includes('--divider-owner-frame');
assert.ok(!dividerOwnerFrame || rawRequested.every(argument => ['--divider-owner-frame', '--check', '--dry-run'].includes(argument)), 'Choose one case-review supplement');
const dividerComputedPaint = rawRequested.includes('--divider-computed-paint');
assert.ok(!dividerComputedPaint || rawRequested.every(argument => ['--divider-computed-paint', '--check', '--dry-run'].includes(argument)), 'Choose one case-review supplement');
const originalRunnerRecovery = rawRequested.includes('--original-runner-recovery');
assert.ok(!originalRunnerRecovery || rawRequested.every(argument => ['--original-runner-recovery', '--check', '--dry-run'].includes(argument)), 'Choose one case-review supplement');
const sliderStateInputs = rawRequested.includes('--slider-state-inputs');
assert.ok(!sliderStateInputs || rawRequested.every(argument => ['--slider-state-inputs', '--check', '--dry-run'].includes(argument)), 'Choose one case-review supplement');
const sliderHoverHeld = rawRequested.includes('--slider-hover-held');
assert.ok(!sliderHoverHeld || rawRequested.every(argument => ['--slider-hover-held', '--check', '--dry-run'].includes(argument)), 'Choose one case-review supplement');
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
const requested = rawRequested.filter(argument => argument !== '--chips-alternate').filter(argument => argument !== '--focus-selection').filter(argument => argument !== '--sort-arrow').filter(argument => argument !== '--tree-focus').filter(argument => argument !== '--text-held').filter(argument => argument !== '--editing-context').filter(argument => argument !== '--divider-owner-context').filter(argument => argument !== '--menu-select-disabled').filter(argument => argument !== '--divider-owner-frame').filter(argument => argument !== '--divider-computed-paint').filter(argument => argument !== '--original-runner-recovery').filter(argument => argument !== '--slider-state-inputs').filter(argument => !['--static-ax', '--card-inputs', '--expansion-semantics', '--stepper-inputs', '--tabs-menu-sheet', '--static-semantic-inputs', '--popup-depth-inputs', '--scrollbar-paint', '--table-label-paint', '--radio-caret-paint', '--retained-focus', '--slider-hover-held'].includes(argument));
assert.ok(requested.length <= 1 && requested.every(a => ['--check', '--dry-run'].includes(a)),
  'Usage: node scripts/export-material-input-audit-current-ancestry.mjs [--check|--dry-run] [--static-ax|--card-inputs|--expansion-semantics|--stepper-inputs|--tabs-menu-sheet|--static-semantic-inputs|--popup-depth-inputs|--scrollbar-paint|--table-label-paint|--radio-caret-paint|--retained-focus|--slider-hover-held|--slider-state-inputs|--original-runner-recovery|--divider-computed-paint|--divider-owner-frame|--menu-select-disabled|--divider-owner-context|--editing-context|--text-held|--tree-focus|--sort-arrow|--focus-selection|--chips-alternate]');
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
if (sliderHoverHeld) inputs['case-obligation-review'] = 'artifacts/material-parity/working-audit/proposals/c0e397e0a5912d3f492c0d55a3d2b5421d6892f5403ba355c90560da6dbf2cea.json';
if (sliderStateInputs) inputs['case-obligation-review'] = 'artifacts/material-parity/working-audit/proposals/c394338eb185b3f410e7e18825cd370391b8daeb827f9b60f4d7355b46862823.json';
if (originalRunnerRecovery) inputs['case-obligation-review'] = 'artifacts/material-parity/working-audit/proposals/7dfee06dc72de1cc4a7d94f1d10594ec0b7d703a7a151e35ae803eadadc51385.json';
if (dividerComputedPaint) inputs['case-obligation-review'] = 'artifacts/material-parity/working-audit/proposals/abdd4f47d8681dbdbedd24a5e954b7ad3063261150a9758dffcdce460155898a.json';
if (dividerOwnerFrame) inputs['case-obligation-review'] = 'artifacts/material-parity/working-audit/proposals/94f1a93d5881bafd8f79fad0ccd52e20d0325bed06eb64dc1e1adbd315241cc4.json';
if (menuSelectDisabled) inputs['case-obligation-review'] = 'artifacts/material-parity/working-audit/proposals/d00beaa884a5639f4294c5b81f4c49e1ec0c9cd1072fc77d4f7041fc6ff9bd3d.json';
if (dividerOwnerContext) inputs['case-obligation-review'] = 'artifacts/material-parity/working-audit/proposals/f812d8d9e169b51afd03ae43ea06f8b8ac69e6df5147f11589112919c6ef7083.json';
if (editingContext) inputs['case-obligation-review'] = 'artifacts/material-parity/working-audit/proposals/043361b010508502f4c2be7b7f2b9bf21059e8f2cb71c503d91b61a29b34dadd.json';
if (textHeld) inputs['case-obligation-review'] = 'artifacts/material-parity/working-audit/proposals/45d3fb0779cfa4d53137cfbc47225791634874026936b1abb5135222dee75588.json';
if (treeFocus) inputs['case-obligation-review'] = 'artifacts/material-parity/working-audit/proposals/6ea59073771388cec874ad6985e38823f68d1d72ab7c37d72cb61c5e11a0e411.json';
if (sortArrow) inputs['case-obligation-review'] = 'artifacts/material-parity/working-audit/proposals/8554f8ef7d18ee02a80a409eddb7f96a1aad188983d124d49f9c9d556799f71e.json';
if (focusSelection) inputs['case-obligation-review'] = 'artifacts/material-parity/working-audit/proposals/d47c41d3d6ac4dff3632688a36e8e20e2ec631fe0c9feca1bc05a198f36d3bab.json';
if (chipsAlternate) inputs['case-obligation-review'] = 'artifacts/material-parity/working-audit/proposals/e17dff3342e922de9febdd85402b433deb5872091f36cbb709d38de2327d6431.json';
for (const [name, relative] of Object.entries(inputs)) {
  const retained = (originalRunnerRecovery || dividerComputedPaint || dividerOwnerFrame || menuSelectDisabled || dividerOwnerContext || editingContext || textHeld || treeFocus || sortArrow || focusSelection || chipsAlternate) && name === 'case-obligation-review' ? 'artifacts/material-parity/working-audit/proposals/c394338eb185b3f410e7e18825cd370391b8daeb827f9b60f4d7355b46862823.json' : relative;
  const stat = statSync(path.join(root, retained));
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
if (sliderHoverHeld) args[args.findIndex(argument => argument.startsWith('--case-obligation-review-sha256='))] = '--case-obligation-review-sha256=c0e397e0a5912d3f492c0d55a3d2b5421d6892f5403ba355c90560da6dbf2cea';
if (sliderStateInputs) args[args.findIndex(argument => argument.startsWith('--case-obligation-review-sha256='))] = '--case-obligation-review-sha256=c394338eb185b3f410e7e18825cd370391b8daeb827f9b60f4d7355b46862823';
if (originalRunnerRecovery) args[args.findIndex(argument => argument.startsWith('--case-obligation-review-sha256='))] = '--case-obligation-review-sha256=7dfee06dc72de1cc4a7d94f1d10594ec0b7d703a7a151e35ae803eadadc51385';
if (dividerComputedPaint) args[args.findIndex(argument => argument.startsWith('--case-obligation-review-sha256='))] = '--case-obligation-review-sha256=abdd4f47d8681dbdbedd24a5e954b7ad3063261150a9758dffcdce460155898a';
if (dividerOwnerFrame) args[args.findIndex(argument => argument.startsWith('--case-obligation-review-sha256='))] = '--case-obligation-review-sha256=94f1a93d5881bafd8f79fad0ccd52e20d0325bed06eb64dc1e1adbd315241cc4';
if (menuSelectDisabled) args[args.findIndex(argument => argument.startsWith('--case-obligation-review-sha256='))] = '--case-obligation-review-sha256=d00beaa884a5639f4294c5b81f4c49e1ec0c9cd1072fc77d4f7041fc6ff9bd3d';
if (dividerOwnerContext) args[args.findIndex(argument => argument.startsWith('--case-obligation-review-sha256='))] = '--case-obligation-review-sha256=f812d8d9e169b51afd03ae43ea06f8b8ac69e6df5147f11589112919c6ef7083';
if (editingContext) args[args.findIndex(argument => argument.startsWith('--case-obligation-review-sha256='))] = '--case-obligation-review-sha256=043361b010508502f4c2be7b7f2b9bf21059e8f2cb71c503d91b61a29b34dadd';
if (textHeld) args[args.findIndex(argument => argument.startsWith('--case-obligation-review-sha256='))] = '--case-obligation-review-sha256=45d3fb0779cfa4d53137cfbc47225791634874026936b1abb5135222dee75588';
if (treeFocus) args[args.findIndex(argument => argument.startsWith('--case-obligation-review-sha256='))] = '--case-obligation-review-sha256=6ea59073771388cec874ad6985e38823f68d1d72ab7c37d72cb61c5e11a0e411';
if (sortArrow) args[args.findIndex(argument => argument.startsWith('--case-obligation-review-sha256='))] = '--case-obligation-review-sha256=8554f8ef7d18ee02a80a409eddb7f96a1aad188983d124d49f9c9d556799f71e';
if (focusSelection) args[args.findIndex(argument => argument.startsWith('--case-obligation-review-sha256='))] = '--case-obligation-review-sha256=d47c41d3d6ac4dff3632688a36e8e20e2ec631fe0c9feca1bc05a198f36d3bab';
if (chipsAlternate) args[args.findIndex(argument => argument.startsWith('--case-obligation-review-sha256='))] = '--case-obligation-review-sha256=e17dff3342e922de9febdd85402b433deb5872091f36cbb709d38de2327d6431';
if (requested.includes('--dry-run')) console.log(JSON.stringify({ cwd: root, executable: process.execPath, args }, null, 2));
else {
  // Forward the caller's cold/progress settings and preserve validation failure
  // status. Existence preflight is not evidence authentication or acceptance.
  const result = spawnSync(process.execPath, args, { cwd: root, env: process.env, stdio: 'inherit', windowsHide: true });
  if (result.error) throw result.error;
  assert.equal(result.signal, null, `Audit terminated by ${result.signal}`);
  process.exitCode = result.status ?? 1;
}
