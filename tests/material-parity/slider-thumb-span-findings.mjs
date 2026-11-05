// Source-registered finding: not published in the accepted canonical audit yet.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
export const sliderThumbSpanFinding = Object.freeze({
  id: 'fixture-slider-thumb-span-substitution',
  classification: 'application-plugin-authoring-defect',
  owner: 'showcase MaterialRangeVisualRenderer CSS-space thumb geometry',
  file: 'examples/material-showcase/src/app/material-plugin/material-showcase.plugin.ts',
  pattern: String.raw`x: -widthCss / 2 \+ widthCss \* ratio,`,
  introducedBy: '2f440115740ff76fa9e55b3f4a11568207b2af5a: original showcase already interpolates across the full host width; author motive is not established',
  focusedProof: 'tests/material-parity/slider-thumb-span-inputs.spec.mjs: retained Slider native inset span differs from captured plugin request before projection',
  observation: Object.freeze({
    component: 'slider', element: 'slider-visual start/end thumbs',
    property: 'horizontal position request in CSS pixels',
    staticCases: 12, interactionCases: 66, thumbPositions: 156,
    reference: '3 + ratio * (width - 6), measured from the left edge',
    astylar: 'ratio * width, measured from the left edge',
    stage: 'application geometry calculation before final toRenderPoint conversion',
  }),
  evidence: Object.freeze([
    Object.freeze({ file: 'artifacts/material-parity/current-full-20261005/latest-report.json',
      sha256: 'ab42dbec6280e0e27784ec4bbc6697d4ea451bfab307bccb720c0dec89a83b62' }),
    Object.freeze({ file: 'artifacts/material-parity/retained-evidence/component-map-recovery-20261011/main.js.map',
      sha256: 'c0764b03e6a2e5332dc927a63b2f45396678ceb45abe23378377f343ab622473' }),
    Object.freeze({ file: 'artifacts/material-parity/retained-evidence/component-map-recovery-20261011/chunk-7SL66K3U.js.map',
      sha256: '67e956a6f4b3b0325fc51b7b45688a27d5e9307095f8b4a20391a96f68244df4' }),
  ]),
  justification: 'All 156 retained thumb positions match the captured native inset formula within 0.001CSSpx. Authenticated plugin initial/update calls request full-width interpolation. Intercepting captured static calls at three projection scales preserves the unequal incoming CSS positions. This is distinct from track thickness, state-layer composition, half-domain reachability and transition timing.',
  recommendation: 'During later implementation, supply reference-equivalent thumb geometry through the supported CSS-space layout/paint contract. First establish ownership of native slider track/inset semantics and any missing general control capability. Do not add fixture-only pixel nudges, change host width or tune projection scale to conceal unequal inputs.',
  verificationPlan: 'Preserve all 78 retained cases. After equivalent inputs are supplied, verify endpoint geometry, RTL, min/max, full-domain drag identity, keyboard steps, transitions, DPR edges and current browser rendering separately. Endpoint transforms alone do not prove pointer-path or smoothness behavior.',
  boundary: 'Confirmed retained geometry-input mismatch, not an equal-input renderer defect, exact pixel causality, in-flight drag correctness, current rendering or whole-case acceptance. Source-map identity is not independent proof of original runtime execution.',
  inputEquivalent: false,
  currentRenderingAccepted: false,
  canonicalStatus: 'source-registered-not-canonical-published',
});

// Reuse the audit's exact, reversible registration convention. These helpers
// return virtual source only; they never modify production inventory or policy.
const hash = source => createHash('sha256').update(source).digest('hex');
const parents = {
  policy: 'b784354addf0b7ae9fe8e6e21f2fd0fb8147c834f0d879fd8a54f26de4a5f543',
  producer: 'de8b876c21c23ef791d1b10a290ee80d64ecc964efc2a9a3da3225e6ac7da2a8',
  shared: 'a4a2f9b8e736f9183e5584aa94680eb34770b3538713e1512e3268886ab408cd',
};
const { canonicalStatus: _status, ...definition } = sliderThumbSpanFinding;
const proof = (file, title, boundary) =>
  `    proof(root, ${JSON.stringify(file)}, new RegExp(${JSON.stringify("test\\('" + title + "'")}), ${JSON.stringify(title)}, ${JSON.stringify(boundary)}),\n`;
const additions = {
  shared: [
    ["import { stripButtonToolbarRegistrationIfPresent, createButtonToolbarHistoricalRead } from '../../scripts/join-material-button-toolbar-paint.mjs';\n",
      "import { stripSliderOpenerRegistrationIfPresent, createSliderOpenerHistoricalRead } from './slider-thumb-span-findings.mjs';\n"],
    ['export function restoreCaptureAvailabilityRegistration(bytes, kind) {\n',
      '  bytes = stripSliderOpenerRegistrationIfPresent(bytes, kind);\n'],
    ['export function createCaptureAvailabilityHistoricalRead({ root, read }) {\n',
      '  read = createSliderOpenerHistoricalRead({ root, read });\n'],
  ],
  policy: [['\n]);\n\nexport const pluginBoundaryVerdict',
    `\n  Object.freeze(${JSON.stringify(definition)}),`]],
  producer: [
    ['function sourceFingerprints(root) {\n  const files = [\n', [
      'tests/material-parity/slider-thumb-span-findings.mjs',
      'tests/material-parity/slider-thumb-span-inputs.spec.mjs',
      'scripts/join-material-snackbar-opener-paint.mjs',
      'tests/material-parity/snackbar-opener-paint.spec.mjs',
    ].map(file => `    ${JSON.stringify(file)},\n`).join('')],
    ['function focusedProofInventory(root) {\n  return [\n',
      proof('tests/material-parity/slider-thumb-span-inputs.spec.mjs',
        'retained Slider native inset span differs from captured plugin request before projection', sliderThumbSpanFinding.boundary) +
      proof('tests/material-parity/snackbar-opener-paint.spec.mjs',
        'closed snackbar opener join preserves exact parents, statuses and unaffected objects',
        'Retained closed-opener diagnostics and conservative case join;not open popup,current rendering or whole-case acceptance.')],
    ['function implementationPlan() {\n  return [\n', `    ${JSON.stringify({ priority: 2.08,
      rootCause: 'Range plugin substitutes full-width thumb positioning for native inset span',
      action: sliderThumbSpanFinding.recommendation + ' ' + sliderThumbSpanFinding.verificationPlan })},\n`],
  ],
};
export function prepareSliderOpenerRegistration(bytes, kind) {
  let source = bytes.toString().replaceAll('\r\n', '\n');
  assert.ok(Object.hasOwn(parents, kind));
  assert.equal(hash(source), parents[kind], 'Unrecognized span/opener parent');
  for (const [anchor, addition] of additions[kind]) {
    assert.equal(source.split(anchor).length, 2);
    source = kind === 'policy' ? source.replace(anchor, addition + anchor) : source.replace(anchor, anchor + addition);
  }
  return source;
}
export function restoreSliderOpenerRegistration(bytes, kind) {
  let source = bytes.toString().replaceAll('\r\n', '\n');
  assert.ok(Object.hasOwn(parents, kind));
  for (const [anchor, addition] of additions[kind].toReversed()) {
    const staged = kind === 'policy' ? addition + anchor : anchor + addition;
    assert.equal(source.split(staged).length, 2);
    source = source.replace(staged, anchor);
  }
  assert.equal(hash(source), parents[kind], 'Span/opener registration drift');
  return source;
}

export function createSliderOpenerHistoricalRead({ root = process.cwd(), read = fs.readFileSync } = {}) {
  const files = new Map([
    ['tests/material-parity/input-equivalence-policy.mjs', 'policy'],
    ['tests/material-parity/input-equivalence-audit.mjs', 'producer'],
    ['tests/material-parity/capture-availability-registration.mjs', 'shared'],
    ['scripts/run-material-input-audit.mjs', 'runner'],
    ['scripts/export-material-input-audit-current-ancestry.mjs', 'launcher'],
  ].map(([file, kind]) => [path.resolve(root, file), kind]));
  return (name, options) => {
    const kind = files.get(path.resolve(root, name));
    if (!kind) return read(name, options);
    const bytes = read(name), source = bytes.toString().replaceAll('\r\n', '\n');
    // Older generations may already have been supplied by a nested reader.
    // Strip only our marked addition; the existing reader owns older receipts.
    const restored = hash(source) === parents[kind] ? source
      : kind === 'shared' && source.includes("from './slider-thumb-span-findings.mjs';")
        ? restoreSliderOpenerRegistration(bytes, kind)
        : stripSliderOpenerRegistrationIfPresent(bytes, kind).toString();
    const encoding = typeof options === 'string' ? options : options?.encoding;
    return encoding ? Buffer.from(restored).toString(encoding) : Buffer.from(restored);
  };
}

export function stripSliderOpenerRegistrationIfPresent(bytes, kind) {
  if (kind === 'runner' || kind === 'launcher') {
    const marker = kind === 'runner' ? 'const sliderOpenerHistoricalRead = ' : 'const sliderOpener = ';
    if (!bytes.toString().includes(marker)) return bytes;
    const pattern = kind === 'runner' ? /const applicability=options.caseObligationReviewSha256==='([a-f0-9]{64})'/
      : /if \(sliderOpener\) inputs\['case-obligation-review'\] = 'artifacts\/material-parity\/working-audit\/proposals\/([a-f0-9]{64})\.json'/;
    const match = bytes.toString().match(pattern); assert.ok(match);
    return Buffer.from(restoreSliderOpenerSelection(bytes, kind, match[1]));
  }
  const marker = kind === 'producer' ? '"tests/material-parity/slider-thumb-span-findings.mjs",'
    : kind === 'policy' ? '"id":"fixture-slider-thumb-span-substitution"' : undefined;
  return marker && bytes.toString().includes(marker)
    ? Buffer.from(restoreSliderOpenerRegistration(bytes, kind)) : bytes;
}

const selectionParents = {
  runner: '73061b037bd275333590c0b58a3ab841b5f51cd36862302a05c59363ba816dce',
  launcher: 'd2bc0df2a30b893480744cd3ce05638dcda0dad4f0737964c74802b43ebc6ac3',
};
function selectionEdits(kind, review) {
  assert.match(review, /^[a-f0-9]{64}$/);
  if (kind === 'launcher') return [
    ['const rawRequested = process.argv.slice(2);', "const rawRequested = process.argv.slice(2);\nconst sliderOpener = rawRequested.includes('--slider-span-opener');\nassert.ok(!sliderOpener || rawRequested.every(argument => ['--slider-span-opener', '--check', '--dry-run'].includes(argument)), 'Choose one case-review supplement');"],
    ['const requested = rawRequested.filter(', "const requested = rawRequested.filter(argument => argument !== '--slider-span-opener').filter("],
    ['|--button-toolbar-paint]', '|--button-toolbar-paint|--slider-span-opener]'],
    ['for (const [name, relative] of Object.entries(inputs)) {', `if (sliderOpener) inputs['case-obligation-review'] = 'artifacts/material-parity/working-audit/proposals/${review}.json';\nfor (const [name, relative] of Object.entries(inputs)) {`],
    ['|| buttonToolbarPaint)', '|| buttonToolbarPaint || sliderOpener)'],
    ["if (requested.includes('--dry-run'))", `if (sliderOpener) args[args.findIndex(argument => argument.startsWith('--case-obligation-review-sha256='))] = '--case-obligation-review-sha256=${review}';\nif (requested.includes('--dry-run'))`],
  ];
  assert.equal(kind, 'runner');
  return [
    ["import { createButtonToolbarReviewReader, createButtonToolbarHistoricalRead } from './join-material-button-toolbar-paint.mjs';",
      "import { createButtonToolbarReviewReader, createButtonToolbarHistoricalRead } from './join-material-button-toolbar-paint.mjs';\nimport { createSnackbarOpenerReviewReader } from './join-material-snackbar-opener-paint.mjs';\nimport { createSliderOpenerHistoricalRead } from '../tests/material-parity/slider-thumb-span-findings.mjs';"],
    ['const buttonToolbarHistoricalRead = createButtonToolbarHistoricalRead({root,read:auditReadFileSync});',
      'const sliderOpenerHistoricalRead = createSliderOpenerHistoricalRead({root,read:auditReadFileSync});\n    const buttonToolbarHistoricalRead = createButtonToolbarHistoricalRead({root,read:sliderOpenerHistoricalRead});'],
    ['const applicability=options.caseObligationReviewSha256===', `const applicability=options.caseObligationReviewSha256==='${review}'\n      ? createSnackbarOpenerReviewReader({root,read:auditReadFileSync})\n      : options.caseObligationReviewSha256===`],
    ['diagnosticRead: options.caseObligationReviewSha256===', `diagnosticRead: options.caseObligationReviewSha256==='${review}'\n      ? createCaptureAvailabilityHistoricalRead({root,read:createSliderOpenerHistoricalRead({root,read:auditReadFileSync})})\n      : options.caseObligationReviewSha256===`],
  ];
}
export function prepareSliderOpenerSelection(bytes, kind, review) {
  let source = bytes.toString().replaceAll('\r\n', '\n');
  assert.equal(hash(source), selectionParents[kind]);
  for (const [before, after] of selectionEdits(kind, review)) {
    assert.equal(source.split(before).length, 2); source = source.replace(before, after);
  }
  return source;
}
export function restoreSliderOpenerSelection(bytes, kind, review) {
  let source = bytes.toString().replaceAll('\r\n', '\n');
  for (const [before, after] of selectionEdits(kind, review).toReversed()) {
    assert.equal(source.split(after).length, 2); source = source.replace(after, before);
  }
  assert.equal(hash(source), selectionParents[kind], 'Span/opener selection drift');
  return source;
}
