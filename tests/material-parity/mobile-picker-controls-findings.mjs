import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
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
    "function sourceFingerprints(root) {\n  const files = [\n    'tests/material-parity/mobile-picker-controls-findings.mjs',\n" +
    "    'scripts/join-material-datepicker-mobile-open-dismiss.mjs',\n"],
  ['function implementationPlan() {\n  return [\n',
    'function implementationPlan() {\n  return [\n    ' + JSON.stringify(sharedPlan) + ',\n    '
      + JSON.stringify(datepickerDismissalPlan) + ',\n'],
];

function applySourceEdits(source, edits) {
  for (const [before, after, instances = 1] of edits) {
    assert.equal(source.split(before).length - 1, instances, 'Unexpected picker source boundary');
    source = source.replaceAll(before, () => after);
  }
  return source;
}

function reverseSourceEdits(edits) {
  return edits.map(([before, after, instances]) => [after, before, instances]).reverse();
}

export function prepareMobilePickerControlsProducer(bytes) {
  const source = normalized(bytes);
  assert.equal(hash(source), producerParentSha256, 'Unknown mobile picker producer parent');
  return applySourceEdits(source, producerEdits);
}

export function restoreMobilePickerControlsProducer(bytes) {
  const previous = applySourceEdits(normalized(bytes), reverseSourceEdits(producerEdits));
  assert.equal(hash(previous), producerParentSha256, 'Unexpected mobile picker producer drift');
  return previous;
}

export const pickerFocusSemanticsReview = '78616399f9964684b86232fb63ac2945027a6ef7c461ea9bab5f2953e6861096';
export const retainedPointerCoverageReview = '3a0dfc9c476e49a6c5878be3f287b8eadbecfae98fd8c35cc4c88035abc0068c';
export const retainedPaintOwnershipReview = '24c22d1ae764ec131a2f1ca5a0d7be1fdb6729a5328406ab2a9abe6721e46031';
export const retainedCaseObservationsReview = '919dbc1c33cebb522b5fb1d002f19100f3fe17a43b5ecc371b6c527aea2955a3';

// Reverse the exact coverage selector before each older picker transition.
const retainedPointerLauncherEdits = [
  ["import { pickerFocusSemanticsReview }","import { pickerFocusSemanticsReview, retainedPointerCoverageReview }"],
  ["const pickerFocusSemantics = rawRequested.includes('--picker-focus-semantics');\n","const pickerFocusSemantics = rawRequested.includes('--picker-focus-semantics');\nconst retainedPointerCoverage = rawRequested.includes('--retained-pointer-coverage');\nassert.ok(!retainedPointerCoverage || rawRequested.every(argument => ['--retained-pointer-coverage', '--check', '--dry-run'].includes(argument)), 'Choose one case-review supplement');\n"],
  ["rawRequested.filter(argument => argument !== '--picker-focus-semantics')","rawRequested.filter(argument => argument !== '--picker-focus-semantics').filter(argument => argument !== '--retained-pointer-coverage')"],
  ["|--picker-focus-semantics]');","|--picker-focus-semantics|--retained-pointer-coverage]');"],
  ["if (pickerFocusSemantics) inputs['case-obligation-review'] = `artifacts/material-parity/working-audit/proposals/${pickerFocusSemanticsReview}.json`;\n","if (pickerFocusSemantics) inputs['case-obligation-review'] = `artifacts/material-parity/working-audit/proposals/${pickerFocusSemanticsReview}.json`;\nif (retainedPointerCoverage) inputs['case-obligation-review'] = `artifacts/material-parity/working-audit/proposals/${retainedPointerCoverageReview}.json`;\n"],
  ["if (pickerFocusSemantics) args[args.findIndex(argument => argument.startsWith('--case-obligation-review-sha256='))] = `--case-obligation-review-sha256=${pickerFocusSemanticsReview}`;\n","if (pickerFocusSemantics) args[args.findIndex(argument => argument.startsWith('--case-obligation-review-sha256='))] = `--case-obligation-review-sha256=${pickerFocusSemanticsReview}`;\nif (retainedPointerCoverage) args[args.findIndex(argument => argument.startsWith('--case-obligation-review-sha256='))] = `--case-obligation-review-sha256=${retainedPointerCoverageReview}`;\n"],
];
const retainedPointerRunnerEdits = [
  ["createPickerFocusSemanticsReviewReader, pickerFocusSemanticsReview }","createPickerFocusSemanticsReviewReader, pickerFocusSemanticsReview, retainedPointerCoverageReview }"],
  ["    const applicability=options.caseObligationReviewSha256===pickerFocusSemanticsReview\n","    const applicability=[pickerFocusSemanticsReview,retainedPointerCoverageReview].includes(options.caseObligationReviewSha256)\n"],
  ["      ? createPickerFocusSemanticsReviewReader({ root, read: auditReadFileSync,\n","      ? createPickerFocusSemanticsReviewReader({ root, read: auditReadFileSync, reviewSha256: options.caseObligationReviewSha256,\n"],
  ["    diagnosticRead: [pickerFocusSemanticsReview,datepickerMobileOpenDismissReview,","    diagnosticRead: [pickerFocusSemanticsReview,retainedPointerCoverageReview,datepickerMobileOpenDismissReview,"],
];

const retainedPaintLauncherEdits = [
  ["pickerFocusSemanticsReview, retainedPointerCoverageReview }","pickerFocusSemanticsReview, retainedPointerCoverageReview, retainedPaintOwnershipReview }"],
  ["const retainedPointerCoverage = rawRequested.includes('--retained-pointer-coverage');\n","const retainedPointerCoverage = rawRequested.includes('--retained-pointer-coverage');\nconst retainedPaintOwnership = rawRequested.includes('--retained-paint-ownership');\nassert.ok(!retainedPaintOwnership || rawRequested.every(argument => ['--retained-paint-ownership', '--check', '--dry-run'].includes(argument)), 'Choose one case-review supplement');\n"],
  [".filter(argument => argument !== '--retained-pointer-coverage')",".filter(argument => argument !== '--retained-pointer-coverage').filter(argument => argument !== '--retained-paint-ownership')"],
  ["|--retained-pointer-coverage]');","|--retained-pointer-coverage|--retained-paint-ownership]');"],
  ["if (retainedPointerCoverage) inputs['case-obligation-review'] = `artifacts/material-parity/working-audit/proposals/${retainedPointerCoverageReview}.json`;\n","if (retainedPointerCoverage) inputs['case-obligation-review'] = `artifacts/material-parity/working-audit/proposals/${retainedPointerCoverageReview}.json`;\nif (retainedPaintOwnership) inputs['case-obligation-review'] = `artifacts/material-parity/working-audit/proposals/${retainedPaintOwnershipReview}.json`;\n"],
  ["if (retainedPointerCoverage) args[args.findIndex(argument => argument.startsWith('--case-obligation-review-sha256='))] = `--case-obligation-review-sha256=${retainedPointerCoverageReview}`;\n","if (retainedPointerCoverage) args[args.findIndex(argument => argument.startsWith('--case-obligation-review-sha256='))] = `--case-obligation-review-sha256=${retainedPointerCoverageReview}`;\nif (retainedPaintOwnership) args[args.findIndex(argument => argument.startsWith('--case-obligation-review-sha256='))] = `--case-obligation-review-sha256=${retainedPaintOwnershipReview}`;\n"],
];
const retainedPaintRunnerEdits = [
  ["pickerFocusSemanticsReview, retainedPointerCoverageReview }","pickerFocusSemanticsReview, retainedPointerCoverageReview, retainedPaintOwnershipReview }"],
  ["[pickerFocusSemanticsReview,retainedPointerCoverageReview].includes(options.caseObligationReviewSha256)","[pickerFocusSemanticsReview,retainedPointerCoverageReview,retainedPaintOwnershipReview].includes(options.caseObligationReviewSha256)"],
  ["diagnosticRead: [pickerFocusSemanticsReview,retainedPointerCoverageReview,","diagnosticRead: [pickerFocusSemanticsReview,retainedPointerCoverageReview,retainedPaintOwnershipReview,"],
];

const retainedCaseLauncherEdits = [
  ["retainedPaintOwnershipReview }", "retainedPaintOwnershipReview, retainedCaseObservationsReview }"],
  ["const retainedPaintOwnership = rawRequested.includes('--retained-paint-ownership');\n", "const retainedPaintOwnership = rawRequested.includes('--retained-paint-ownership');\nconst retainedCaseObservations = rawRequested.includes('--retained-case-observations');\nassert.ok(!retainedCaseObservations || rawRequested.every(argument => ['--retained-case-observations', '--check', '--dry-run'].includes(argument)), 'Choose one case-review supplement');\n"],
  [".filter(argument => argument !== '--retained-paint-ownership')", ".filter(argument => argument !== '--retained-paint-ownership').filter(argument => argument !== '--retained-case-observations')"],
  ["|--retained-paint-ownership]');", "|--retained-paint-ownership|--retained-case-observations]');"],
  ["if (retainedPaintOwnership) inputs['case-obligation-review'] = `artifacts/material-parity/working-audit/proposals/${retainedPaintOwnershipReview}.json`;\n", "if (retainedPaintOwnership) inputs['case-obligation-review'] = `artifacts/material-parity/working-audit/proposals/${retainedPaintOwnershipReview}.json`;\nif (retainedCaseObservations) inputs['case-obligation-review'] = `artifacts/material-parity/working-audit/proposals/${retainedCaseObservationsReview}.json`;\n"],
  ["if (retainedPaintOwnership) args[args.findIndex(argument => argument.startsWith('--case-obligation-review-sha256='))] = `--case-obligation-review-sha256=${retainedPaintOwnershipReview}`;\n", "if (retainedPaintOwnership) args[args.findIndex(argument => argument.startsWith('--case-obligation-review-sha256='))] = `--case-obligation-review-sha256=${retainedPaintOwnershipReview}`;\nif (retainedCaseObservations) args[args.findIndex(argument => argument.startsWith('--case-obligation-review-sha256='))] = `--case-obligation-review-sha256=${retainedCaseObservationsReview}`;\n"],
];

const retainedCaseRunnerEdits = [
  ["retainedPaintOwnershipReview }", "retainedPaintOwnershipReview, retainedCaseObservationsReview }"],
  ["retainedPointerCoverageReview,retainedPaintOwnershipReview].includes(options.caseObligationReviewSha256)", "retainedPointerCoverageReview,retainedPaintOwnershipReview,retainedCaseObservationsReview].includes(options.caseObligationReviewSha256)"],
  ["diagnosticRead: [pickerFocusSemanticsReview,retainedPointerCoverageReview,retainedPaintOwnershipReview,", "diagnosticRead: [pickerFocusSemanticsReview,retainedPointerCoverageReview,retainedPaintOwnershipReview,retainedCaseObservationsReview,"],
];

function restoreRetainedReviewSelection(source, marker, edits, predecessorSha256) {
  if (!source.includes(marker)) return source;
  const previous = applySourceEdits(source, reverseSourceEdits(edits));
  assert.equal(hash(previous), predecessorSha256, 'Unexpected retained review source drift');
  return previous;
}


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
  const retainedPaintSource = restoreRetainedReviewSelection(normalized(bytes), 'const retainedCaseObservations = ', retainedCaseLauncherEdits,
    '00e62c58718d21f578332e4683fe188500ad996eb0ad7b5852910539cb8a5295');
  const retainedPointerSource = restoreRetainedReviewSelection(retainedPaintSource, 'const retainedPaintOwnership = ', retainedPaintLauncherEdits,
    '97c0380ffd8e283cf42c12d86f388d8719abfa365ed057725039d965b40f8629');
  const source = restoreRetainedReviewSelection(retainedPointerSource, 'const retainedPointerCoverage = ', retainedPointerLauncherEdits,
    'e404363f7852d71e02d490a5163a34ba798dc3772c2054376aa75c8ec790f6a1');
  const previous = applySourceEdits(source, reverseSourceEdits(launcherEdits));
  assert.equal(hash(previous), launcherParentSha256, 'Unexpected picker launcher drift');
  return previous;
}

const datepickerReaderFile = 'scripts/join-material-datepicker-mobile-open-dismiss.mjs';
const datepickerReaderParentSha256 = '8189e9f219e53e0e63709fb82c0903839bb733faa6a15605e49476c7d0375270';
const eagerEnvelope = "  const envelope = Buffer.from(JSON.stringify({ status: 'proposal-not-canonical', sha256, review }));\n";
const datepickerDelegation = '      if (path.resolve(root, name) !== file) return predecessor.read(name, options);\n';
// Keep the old proposal bytes reproducible on demand. A successor reads only
// the historical dependencies, so it does not need the old envelope in memory.
const datepickerReaderEdits = [
  ['  const review = buildDatepickerMobileOpenDismissReview({ root, read });\n  const sha256 = datepickerMobileOpenDismissReview;\n',
    '  const sha256 = datepickerMobileOpenDismissReview;\n'],
  [eagerEnvelope, '  let envelope;\n'],
  [datepickerDelegation, datepickerDelegation +
    "      envelope ??= Buffer.from(JSON.stringify({ status: 'proposal-not-canonical', sha256, review: buildDatepickerMobileOpenDismissReview({ root, read }) }));\n"],
];

export function preparePickerFocusSemanticsDatepickerReader(bytes) {
  const source = normalized(bytes);
  assert.equal(hash(source), datepickerReaderParentSha256, 'Unknown Datepicker reader parent');
  return applySourceEdits(source, datepickerReaderEdits);
}

export function restorePickerFocusSemanticsDatepickerReader(bytes) {
  const previous = applySourceEdits(normalized(bytes), reverseSourceEdits(datepickerReaderEdits));
  assert.equal(hash(previous), datepickerReaderParentSha256, 'Unexpected Datepicker reader drift');
  return previous;
}

const runnerParentSha256 = '1a25dc267f6ff83e641b76037d8c1bb394bcd3209e21d2a26560fbb37026a8f9';
const runnerEdits = [
  ['({root,read:auditReadFileSync', '({root,read:pickerHistoricalRead', 10],
  ['import { createSliderOpenerHistoricalRead }',
    "import { createMobilePickerControlsHistoricalRead, createPickerFocusSemanticsReviewReader, pickerFocusSemanticsReview } from '../tests/material-parity/mobile-picker-controls-findings.mjs';\n" +
    'import { createSliderOpenerHistoricalRead }'],
  ["  progress('build-audit');\n", "  progress('build-audit');\n" +
    '  const pickerHistoricalRead = createMobilePickerControlsHistoricalRead({ root, read: auditReadFileSync });\n'],
  ['    const applicability=options.caseObligationReviewSha256===datepickerMobileOpenDismissReview\n',
    '    const applicability=options.caseObligationReviewSha256===pickerFocusSemanticsReview\n' +
    '      ? createPickerFocusSemanticsReviewReader({ root, read: auditReadFileSync,\n' +
    '        predecessor: createDatepickerMobileOpenDismissReviewReader({ root, read: pickerHistoricalRead }) })\n' +
    '      : options.caseObligationReviewSha256===datepickerMobileOpenDismissReview\n'],
  ['    diagnosticRead: [datepickerMobileOpenDismissReview,',
    '    diagnosticRead: [pickerFocusSemanticsReview,datepickerMobileOpenDismissReview,'],
];

export function preparePickerFocusSemanticsRunner(bytes) {
  const source = normalized(bytes);
  assert.equal(hash(source), runnerParentSha256, 'Unknown picker runner parent');
  return applySourceEdits(source, runnerEdits);
}

export function restorePickerFocusSemanticsRunner(bytes) {
  const retainedPaintSource = restoreRetainedReviewSelection(normalized(bytes), 'retainedPaintOwnershipReview, retainedCaseObservationsReview }', retainedCaseRunnerEdits,
    'b0f88c8aa525fd6fd335a2e00e8173ea669997b379678216666909306f14e0b1');
  const retainedPointerSource = restoreRetainedReviewSelection(retainedPaintSource, 'retainedPointerCoverageReview, retainedPaintOwnershipReview }', retainedPaintRunnerEdits,
    '06b9f63206cf314dfccad5a7a7e6ab12752536a9bcdb6f63dc628a18535a1a90');
  const source = restoreRetainedReviewSelection(retainedPointerSource, 'pickerFocusSemanticsReview, retainedPointerCoverageReview }', retainedPointerRunnerEdits,
    '477526cb178996d9b79056847c48d69b060dd37254634da343e4ecda5d3d0dc3');
  const previous = applySourceEdits(source, reverseSourceEdits(runnerEdits));
  assert.equal(hash(previous), runnerParentSha256, 'Unexpected picker runner drift');
  return previous;
}

const benchmarkReaderFile = 'tests/material-parity/semantic-text-transform-registration.mjs';
const benchmarkReaderParentSha256 = '91f806eb4d7f87a9ed77e762c1f88f1f7bfe4bcadf01159643b326274f8b751b';
const benchmarkReaderEdits = [
  ["import ts from 'typescript';\n",
    "import ts from 'typescript';\n" +
    "import { createMobilePickerControlsHistoricalRead } from './mobile-picker-controls-findings.mjs';\n"],
  ["const policyFile = 'tests/material-parity/input-equivalence-policy.mjs';\n",
    "const policyFile = 'tests/material-parity/input-equivalence-policy.mjs';\n" +
    'const readBeforePickerRegistration = createMobilePickerControlsHistoricalRead({ root: process.cwd(), read: readActual });\n'],
  ['  const source = benchmarkPolicySource(readActual(policyFile));\n',
    '  const live = normalized(readActual(policyFile));\n' +
    '  const previous = normalized(readBeforePickerRegistration(policyFile));\n' +
    '  if (live !== previous) {\n' +
    "    const definitions = text => new Function(text.replace(/^export const /gm, 'const ') + ';return sourceAuditDefinitions;')();\n" +
    "    assert.deepEqual(current, definitions(live), 'Unreviewed picker definition population');\n" +
    '    current = definitions(previous);\n' +
    '  }\n' +
    '  const source = benchmarkPolicySource(previous);\n'],
  ['  const raw = readActual(file, options), name = path.basename(String(file));\n',
    '  const raw = readBeforePickerRegistration(file, options), name = path.basename(String(file));\n'],
];

export function preparePickerFocusSemanticsBenchmarkReader(bytes) {
  const source = normalized(bytes);
  assert.equal(hash(source), benchmarkReaderParentSha256, 'Unknown picker benchmark reader parent');
  return applySourceEdits(source, benchmarkReaderEdits);
}

export function restorePickerFocusSemanticsBenchmarkReader(bytes, root = process.cwd()) {
  let source = normalized(bytes);
  // This later reader has its own exact registration. Recover the earlier
  // picker reader before reversing its changes for historical receipts.
  if (hash(source) === '3a57cfcd60ecf9f1828d1ee3c2f0368237366d0d77dc65841032ce43c957fe8e') {
    source = normalized(execFileSync('git', ['show', '2a04b6e4e56a5490a614fd50f94485d3305b0bdc:' + benchmarkReaderFile], { cwd: root }));
    assert.equal(hash(source), '8141afaa96c7ddce1225265d39379d5996d22d2435a46e409192cc6695f16195');
  }
  const previous = applySourceEdits(source, reverseSourceEdits(benchmarkReaderEdits));
  assert.equal(hash(previous), benchmarkReaderParentSha256, 'Unexpected picker benchmark reader drift');
  return previous;
}

export function createPickerFocusSemanticsReviewReader({ root, read, predecessor, reviewSha256 = pickerFocusSemanticsReview }) {
  const applicability = {
    [pickerFocusSemanticsReview]: {
      mode: 'retained-picker-focus-and-semantics',
      boundary: 'Exact retained picker actions and ownership observations. Current rendering and whole-case acceptance remain open.',
    },
    [retainedPointerCoverageReview]: {
      mode: 'retained-pointer-coverage',
      boundary: 'Exact retained hover, held, disabled pointer, keyboard and focus observations. Current rendering and whole-case acceptance remain open.',
    },
    [retainedCaseObservationsReview]: {
      mode: 'retained-case-observations',
      boundary: 'Exact retained paint, ownership, activation and programmatic focus observations. Current rendering and whole-case acceptance remain open.',
    },
    [retainedPaintOwnershipReview]: {
      mode: 'retained-paint-ownership',
      boundary: 'Exact retained pointer, local paint and picker ownership observations. Current rendering and whole-case acceptance remain open.',
    },
  };
  assert.ok(Object.hasOwn(applicability, reviewSha256));
  assert.equal(predecessor.sha256, 'a095cf9b57430eb73acc3a3d33f4092644cfef4ac21a1a494ec71acde09c719f');
  assert.equal(predecessor.sourceApplicability.joinSource.sha256, datepickerReaderParentSha256);
  const file = path.resolve(root, artifacts, 'working-audit', 'proposals', reviewSha256 + '.json');
  const joinSource = 'tests/material-parity/mobile-picker-controls-findings.mjs';
  return {
    read(name, options) {
      if (path.resolve(root, name) === file) return read(name, options);
      return predecessor.read(name, options);
    },
    sourceApplicability: {
      ...applicability[reviewSha256],
      joinSource: { file: joinSource, sha256: hash(read(path.resolve(root, joinSource))) },
      predecessorReview: predecessor.sha256,
      predecessorApplicability: predecessor.sourceApplicability,
    },
  };
}

const focusSelectionReaderImport = "import { restoreMobilePickerControlsProducer } from './mobile-picker-controls-findings.mjs';\n";
const focusSelectionProducerGuard =
  "  if (kind === 'producer' && bytes.toString().includes(\"'tests/material-parity/mobile-picker-controls-findings.mjs',\"))\n" +
  '    bytes = restoreMobilePickerControlsProducer(bytes);\n';
const focusSelectionReaderEdits = [[focusSelectionReaderImport, ''], [focusSelectionProducerGuard, '']];

export function restorePickerFocusSelectionReader(bytes) {
  const previous = applySourceEdits(normalized(bytes), focusSelectionReaderEdits);
  assert.equal(hash(previous), 'dc5d90614fe15b0a03e61d643dedfa480572c9089e6735ce4a2f3fa4a3d689cb',
    'Unexpected picker focus-selection reader drift');
  return previous;
}

export function createMobilePickerControlsHistoricalRead({ root, read }) {
  const boundaries = new Map([
    ['tests/material-parity/input-equivalence-policy.mjs', ['"id":"fixture-autocomplete-controls-association-outlives-popup"', restoreMobilePickerControlsPolicy]],
    ['tests/material-parity/input-equivalence-audit.mjs', ["'tests/material-parity/mobile-picker-controls-findings.mjs',", restoreMobilePickerControlsProducer]],
    ['scripts/export-material-input-audit-current-ancestry.mjs', ['const pickerFocusSemantics = ', restorePickerFocusSemanticsLauncher]],
    ['scripts/run-material-input-audit.mjs', ['const pickerHistoricalRead = ', restorePickerFocusSemanticsRunner]],
    [datepickerReaderFile, ['envelope ??= Buffer.from', restorePickerFocusSemanticsDatepickerReader]],
    [benchmarkReaderFile, ['const readBeforePickerRegistration = ', bytes => restorePickerFocusSemanticsBenchmarkReader(bytes, root)]],
    ['tests/material-parity/public-tab-selection-finding.mjs', [focusSelectionReaderImport, restorePickerFocusSelectionReader]],
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
