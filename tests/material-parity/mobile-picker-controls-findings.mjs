import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import path from 'node:path';

const source = 'examples/material-showcase/src/app/astylar.component.ts';
const artifacts = 'artifacts/material-parity/';
const retainedMap = {
  file: artifacts + 'icon-fresh-producer-retained-build-20261016-browser/chunk-JPEJK334.js.map',
  sha256: '47654b641610e1d56e02948b17fab41aff25e9c6aedc6f83b70a26b6f349ce9e',
};

const captures = [
  {
    family: 'autocomplete',
    pattern: String.raw`ariaControls: family === 'autocomplete' \? 'field-options' : undefined`,
    target: 'field-options',
    reportSha256: 'a3b46749cf8106e39839fa1134f7cc9a7d09586990401e55e6ce273cd4f18739',
    runnerSha256: 'df6c6e575a71a52ff427e5dbe52d4d3f793cdaf909899172a5e51069bf28f803',
  },
  {
    family: 'select',
    pattern: "ariaControls: 'select-options'",
    target: 'select-options',
    reportSha256: 'fafd1f92ae76f807b63ac285ea334295532979440a1bf793da644dbf80fd292a',
    runnerSha256: 'afcb9ff1ea1b44c236ce1d9563bc6ca19213a5ff8630849744f80bc7ed6c01c8',
  },
  {
    family: 'timepicker',
    pattern: String.raw`ariaControls: family === 'timepicker' \? 'timepicker-options' : undefined`,
    target: 'timepicker-options',
    captureDirectory: 'timepicker-mobile-original-action-20261122',
    reportSha256: 'b37d7a0ae318c57921a4c2d9b3cf3572c2ec2e34fb1527d39fade1a80ce50521',
    runnerSha256: '07fc3680b68da8a1f4141d161df6273abbf0faa318754d6a776e94b45f420492',
  },
];

export const mobilePickerControlsFindings = Object.freeze(captures.map(capture => {
  const { family, pattern, target, reportSha256, runnerSha256 } = capture;
  const directory = artifacts + (capture.captureDirectory ?? family + '-mobile-open-dismiss-20261122') + '/';
  return Object.freeze({
    id: `fixture-${family}-controls-association-outlives-popup`,
    file: source,
    pattern,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase control and popup relationship lifetime',
    evidence: Object.freeze([
      Object.freeze({ file: directory + 'latest-report.json', sha256: reportSha256 }),
      Object.freeze({ file: directory + 'diagnostic-runner.mjs', sha256: runnerSha256 }),
      Object.freeze({ ...retainedMap }),
    ]),
    observation: Object.freeze({
      component: family,
      element: `${family}-control`,
      property: 'aria-controls',
      target,
      states: 'light and dark mobile DPR2 open-dismiss',
      reference: 'resolves to the open listbox and is removed on dismissal',
      astylar: 'resolves to the open listbox and remains after its target detaches',
      stage: 'application relationship authoring before DOM projection',
    }),
    justification: 'The retained fixture authors the reference independently of popup existence. The original served asset vector and mapped fixture source authenticate. Both implementations resolve the relationship while open and Astylar alone preserves an unresolved reference afterward.',
    recommendation: 'For later implementation, align the authored relationship with the popup lifetime using the public semantic API.',
    verificationPlan: 'Verify focused controls, relationship removal and restoration, target resolution, and accessibility tree exposure across the maintained action and viewport matrix.',
    boundary: 'Settled DOM observations in a retained-build Chromium 157 replay. AX impact, intermediate frames, other action cohorts, and current rendering remain unverified.',
    inputEquivalent: false,
    currentRenderingAccepted: false,
  });
}));

const desktopDatepickerCapture = artifacts + 'datepicker-desktop-focus-boundaries-v2-20261122/';
const datepickerPointerDismissalFinding = Object.freeze({
  id: 'fixture-datepicker-pointer-dismissal-focus-restoration-omitted',
  file: source,
  pattern: [
    String.raw`private dismissPopupForOutsideTarget\(targetId: string\): void \{\s*if \(!this\.store\.state\(\)\.open\) return;\s*const family = this\.family\(\);\s*`,
    String.raw`const insidePrefixes: Partial<Record<MaterialFamily, readonly string\[\]>> = \{[^{}]*datepicker: \['datepicker-icon',[^\r\n]+\],[^{}]*\};\s*`,
    String.raw`const prefixes = insidePrefixes\[family\];\s*if \(!prefixes \|\| prefixes\.some\(\(prefix\) => targetId\.startsWith\(prefix\)\)\) return;\s*`,
    String.raw`this\.store\.patchState\(\{ open: false \}\);\s*if \(family === 'dialog'\) this\.surface\?\.focus\('dialog-primary', \{ focusVisible: true \}\);\s*\}`,
  ].join(''),
  classification: 'application-plugin-authoring-defect',
  owner: 'showcase Datepicker outside-target dismissal focus intent',
  evidence: Object.freeze([
    Object.freeze({ file: desktopDatepickerCapture + 'latest-report.json',
      sha256: '643a072637a75d1bd28b8cd0dba253442cc0a23a7d15246c35eb0d1ba28c23ef' }),
    Object.freeze({ file: desktopDatepickerCapture + 'diagnostic-runner.mjs',
      sha256: '2df8647dbb5575e08da77d2e2e621c35c86586cc7448804771604fd48402de6a' }),
    Object.freeze({ ...retainedMap }),
    Object.freeze({ file: artifacts + 'icon-fresh-producer-retained-build-20261016-browser/chunk-7SL66K3U.js.map',
      sha256: '67e956a6f4b3b0325fc51b7b45688a27d5e9307095f8b4a20391a96f68244df4' }),
  ]),
  observation: Object.freeze({
    component: 'datepicker',
    states: ['open-dismiss-outside', 'open-dismiss-canvas'],
    profile: 'light',
    viewport: 'desktop-dpr1',
    reference: 'Closes and restores the opener as active focus.',
    astylar: 'Closes with the canvas focused and no focused logical element.',
    stage: 'unequal application focus-restoration request at pointer dismissal',
  }),
  justification: 'The capture observes both configured pointer dismissals. The candidate page-target click closes the popup and the retained fixture requests restoration only for Dialog on this branch. Retained Material records the pre-open active node and restores it in the close path. The original served bundle and source maps authenticate.',
  recommendation: 'During later implementation, express equivalent pointer-dismiss restoration through the supported focus lifecycle.',
  verificationPlan: 'Exercise outside and canvas pointer dismissals and reopening across the maintained viewports. Check the separate Escape route and focus ownership through the transition.',
  boundary: 'Two settled pointer dismissal cases in a retained-build Chromium 157 replay. Canvas focus call ordering, other cohorts, current rendering and equal-input core behavior remain unverified.',
  inputEquivalent: false,
  currentRenderingAccepted: false,
});

const policyParentSha256 = 'abeb73cafe696f0c6e104908cefde3c6e97d1637db695c2bad031a5c5f86e39d';
const policyBoundary = ']);\n\nexport const pluginBoundaryVerdict = Object.freeze({';
const registration = [...mobilePickerControlsFindings, datepickerPointerDismissalFinding]
  .map(finding => '  Object.freeze(' + JSON.stringify(finding) + '),\n').join('');
const hash = source => createHash('sha256').update(source).digest('hex');
const normalized = source => source.toString().replaceAll('\r\n', '\n');

export function prepareMobilePickerControlsPolicy(bytes) {
  const source = normalized(bytes);
  assert.equal(hash(source), policyParentSha256, 'Unknown mobile picker policy parent');
  assert.equal(source.split(policyBoundary).length, 2);
  return source.replace(policyBoundary, () => registration + policyBoundary);
}

export function restoreMobilePickerControlsPolicy(bytes) {
  const source = normalized(bytes);
  assert.equal(source.split(registration + policyBoundary).length, 2, 'Missing exact mobile picker registration');
  const previous = source.replace(registration + policyBoundary, () => policyBoundary);
  assert.equal(hash(previous), policyParentSha256, 'Unexpected mobile picker policy drift');
  return previous;
}

const producerParentSha256 = 'd0c5c4d72e1050569e4d6d8cdbe7152d61425629cbf89eab08272826f1b604dd';
const sharedPlan = Object.freeze({
  priority: 4.32,
  rootCause: 'Autocomplete, Select and Timepicker author controls references beyond popup lifetime',
  action: 'Align the authored controls relationship with the conditional listbox in the three showcase families. Preserve resolved open controls and active-option links. Verify closed reference removal, re-open resolution, focus, and accessibility-tree exposure across the maintained actions and viewports. Keep this separate from the Menu focusability finding and from sampled resource ownership.',
});
const datepickerDismissalPlan = Object.freeze({
  priority: 5.855,
  rootCause: 'Datepicker pointer dismissal omits opener focus restoration',
  action: 'Supply equivalent Datepicker restoration intent for outside-target pointer dismissal through the supported focus lifecycle. Verify the opener, logical focus and active node after both configured pointer dismissals and on re-open. Check Escape and opening focus independently. Account for surface canvas focus separately from the omitted request.',
});
const producerEdits = [
  ['function sourceFingerprints(root) {\n  const files = [\n',
    "function sourceFingerprints(root) {\n  const files = [\n    'tests/material-parity/mobile-picker-controls-findings.mjs',\n"],
  ['function implementationPlan() {\n  return [\n',
    'function implementationPlan() {\n  return [\n    ' + JSON.stringify(sharedPlan) + ',\n    '
      + JSON.stringify(datepickerDismissalPlan) + ',\n'],
];

function applySourceEdits(source, edits) {
  for (const [before, after] of edits) {
    assert.equal(source.split(before).length, 2, 'Expected one picker source boundary');
    source = source.replace(before, () => after);
  }
  return source;
}

export function prepareMobilePickerControlsProducer(bytes) {
  const source = normalized(bytes);
  assert.equal(hash(source), producerParentSha256, 'Unknown mobile picker producer parent');
  return applySourceEdits(source, producerEdits);
}

export function restoreMobilePickerControlsProducer(bytes) {
  const previous = applySourceEdits(normalized(bytes), producerEdits.map(([before, after]) => [after, before]));
  assert.equal(hash(previous), producerParentSha256, 'Unexpected mobile picker producer drift');
  return previous;
}

export const pickerFocusSemanticsReview = '78616399f9964684b86232fb63ac2945027a6ef7c461ea9bab5f2953e6861096';

const launcherParentSha256 = 'e2c3ecf47e9b22ba1b29ec68f01a7e569f1b12e1d4307c47d3371a77be4a6395';
const pickerMode = '--picker-focus-semantics';
const launcherEdits = [
  ["import { spawnSync } from 'node:child_process';\n",
    "import { spawnSync } from 'node:child_process';\n" +
    "import { pickerFocusSemanticsReview } from '../tests/material-parity/mobile-picker-controls-findings.mjs';\n"],
  ['const datepickerMobile = rawRequested.includes(',
    `const pickerFocusSemantics = rawRequested.includes('${pickerMode}');\n` +
    `assert.ok(!pickerFocusSemantics || rawRequested.every(argument => ['${pickerMode}', '--check', '--dry-run'].includes(argument)), 'Choose one case-review supplement');\n` +
    'const datepickerMobile = rawRequested.includes('],
  ['const requested = rawRequested.filter(argument => argument !== \'--datepicker-mobile-open-dismiss\')',
    `const requested = rawRequested.filter(argument => argument !== '${pickerMode}').filter(argument => argument !== '--datepicker-mobile-open-dismiss')`],
  ["|--datepicker-mobile-open-dismiss]');", `|--datepicker-mobile-open-dismiss|${pickerMode}]');`],
  ['for (const [name, relative] of Object.entries(inputs)) {',
    "if (pickerFocusSemantics) inputs['case-obligation-review'] = `artifacts/material-parity/working-audit/proposals/${pickerFocusSemanticsReview}.json`;\n" +
    'for (const [name, relative] of Object.entries(inputs)) {'],
  ["if (requested.includes('--dry-run')) console.log(",
    "if (pickerFocusSemantics) args[args.findIndex(argument => argument.startsWith('--case-obligation-review-sha256='))] = `--case-obligation-review-sha256=${pickerFocusSemanticsReview}`;\n" +
    "if (requested.includes('--dry-run')) console.log("],
];

export function preparePickerFocusSemanticsLauncher(bytes) {
  const source = normalized(bytes);
  assert.equal(hash(source), launcherParentSha256, 'Unknown picker launcher parent');
  return applySourceEdits(source, launcherEdits);
}

export function restorePickerFocusSemanticsLauncher(bytes) {
  const previous = applySourceEdits(normalized(bytes), launcherEdits.map(([before, after]) => [after, before]));
  assert.equal(hash(previous), launcherParentSha256, 'Unexpected picker launcher drift');
  return previous;
}

export function createMobilePickerControlsHistoricalRead({ root, read }) {
  const boundaries = new Map([
    ['tests/material-parity/input-equivalence-policy.mjs', ['"id":"fixture-autocomplete-controls-association-outlives-popup"', restoreMobilePickerControlsPolicy]],
    ['tests/material-parity/input-equivalence-audit.mjs', ["'tests/material-parity/mobile-picker-controls-findings.mjs',", restoreMobilePickerControlsProducer]],
    ['scripts/export-material-input-audit-current-ancestry.mjs', ['const pickerFocusSemantics = ', restorePickerFocusSemanticsLauncher]],
  ].map(([file, rule]) => [path.resolve(root, file), rule]));
  return (name, options) => {
    const rule = boundaries.get(path.resolve(root, name));
    if (!rule) return read(name, options);
    const bytes = read(name);
    const [marker, restore] = rule;
    const predecessor = bytes.toString().includes(marker) ? Buffer.from(restore(bytes)) : Buffer.from(bytes);
    const encoding = typeof options === 'string' ? options : options?.encoding;
    return encoding ? predecessor.toString(encoding) : predecessor;
  };
}
