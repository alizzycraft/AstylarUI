import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

// Staged source transformation; applying it to live files is a separate gate.
const review = '2f609608195c66b94a965508eb7d59e1aa7d94b7bf33ba24e61566b550f737d1';
const hash = value => createHash('sha256').update(value).digest('hex');
const priors = {
  producer: '6e8db2faa61eb96a69c7d43eac20f95e377651a5489612d9f311907d206fccd5',
  runner: 'cffae75a36eeffe9bda5d799d43565c4833a3bbb751077420ac741528f8dd3a8',
  launcher: 'bd12f66374002fd4897769e03c373f26c812744c44d5e18a35d1b39b9e4df05a',
};
export const captureAvailabilitySources = Object.freeze([
  'scripts/join-material-capture-availability.mjs',
  'tests/material-parity/capture-availability-join.spec.mjs',
  'tests/material-parity/capture-availability-registration.mjs',
  'tests/material-parity/capture-availability-registration.spec.mjs',
  'artifacts/material-parity/capture-availability-live-reader-20261030.log',
]);
export const captureAvailabilityProofs = Object.freeze([
  ['capture-availability-join', 'capture availability corrects only 16 exact cases and recovers the complete predecessor'],
  ['capture-availability-join', 'availability matcher rejects wrong builds, browsers, duplicate assets and nonexact cases'],
  ['capture-availability-join', 'availability join rejects predecessor drift and corrupted reports without publishing'],
  ['capture-availability-join', 'availability reader preserves predecessor routing and returns only the exact successor envelope'],
  ['capture-availability-registration', 'availability staged inventory preserves every predecessor source proof and plan'],
  ['capture-availability-registration', 'availability staged selector preserves older routes and rejects mixed supplements'],
  ['capture-availability-registration', 'availability historical reader restores only authenticated registration changes'],
]);
const boundary = 'Exact retained capture availability and recorded-build matching only;not current-browser execution,input equivalence,rendering acceptance or case closure.';
const changes = {
  producer: [
    ['function sourceFingerprints(root) {\n  const files = [\n',
      'function sourceFingerprints(root) {\n  const files = [\n' + captureAvailabilitySources.map(f => `    ${JSON.stringify(f)},\n`).join('')],
    ['function focusedProofInventory(root) {\n  return [\n',
      'function focusedProofInventory(root) {\n  return [\n' + captureAvailabilityProofs.map(([suite, title]) =>
        `    proof(root, ${JSON.stringify(`tests/material-parity/${suite}.spec.mjs`)}, new RegExp(${JSON.stringify("test\\('" + title + "'")}), ${JSON.stringify(title)}, ${JSON.stringify(boundary)}),\n`).join('')],
  ],
  runner: [
    ["import { badgeLabelPaintReview, createBadgeLabelPaintReviewReader } from './join-material-badge-label-paint.mjs';",
      "import { badgeLabelPaintReview, createBadgeLabelPaintReviewReader } from './join-material-badge-label-paint.mjs';\nimport { captureAvailabilityReview, createCaptureAvailabilityReviewReader } from './join-material-capture-availability.mjs';\nimport { createCaptureAvailabilityHistoricalRead } from '../tests/material-parity/capture-availability-registration.mjs';"],
    ['const applicability=badgeLabelPaintReaderFactory?.',
      'const captureAvailabilityReaderFactory = options.caseObligationReviewSha256===captureAvailabilityReview ? createCaptureAvailabilityReviewReader : badgeLabelPaintReaderFactory;\n    const applicability=captureAvailabilityReaderFactory?.'],
    ['const applicability=captureAvailabilityReaderFactory?.({root,read:auditReadFileSync,reviewSha256:options.caseObligationReviewSha256});',
      'const captureAvailabilityEvidenceRead = options.caseObligationReviewSha256===captureAvailabilityReview ? auditReadFileSync : createCaptureAvailabilityHistoricalRead({root,read:auditReadFileSync});\n    const applicability=captureAvailabilityReaderFactory?.({root,read:captureAvailabilityEvidenceRead,reviewSha256:options.caseObligationReviewSha256});'],
  ],
  launcher: [
    ["const badgeLabelPaint = rawRequested.includes('--badge-label-paint');",
      "const captureAvailability = rawRequested.includes('--capture-availability');\nassert.ok(!captureAvailability || rawRequested.every(argument => ['--capture-availability', '--check', '--dry-run'].includes(argument)), 'Choose one case-review supplement');\nconst badgeLabelPaint = rawRequested.includes('--badge-label-paint');"],
    ['const requested = rawRequested.filter(', "const requested = rawRequested.filter(argument => argument !== '--capture-availability').filter("],
    ['|--badge-label-paint]', '|--badge-label-paint|--capture-availability]'],
    ['for (const [name, relative] of Object.entries(inputs)) {', `if (captureAvailability) inputs['case-obligation-review'] = 'artifacts/material-parity/working-audit/proposals/${review}.json';\nfor (const [name, relative] of Object.entries(inputs)) {`],
    ['tooltipOpen || badgeLabelPaint)', 'tooltipOpen || badgeLabelPaint || captureAvailability)'],
    ["if (requested.includes('--dry-run'))", `if (captureAvailability) args[args.findIndex(argument => argument.startsWith('--case-obligation-review-sha256='))] = '--case-obligation-review-sha256=${review}';\nif (requested.includes('--dry-run'))`],
  ],
};
export function prepareCaptureAvailabilityRegistration(bytes, kind) {
  let source = bytes.toString().replaceAll('\r\n', '\n');
  assert.equal(hash(source), priors[kind]);
  for (const [before, after] of changes[kind]) {
    assert.equal(source.split(before).length, 2); source = source.replace(before, after);
  }
  return source;
}
export function restoreCaptureAvailabilityRegistration(bytes, kind) {
  let source = bytes.toString().replaceAll('\r\n', '\n');
  if (hash(source) === priors[kind]) return source;
  for (const [before, after] of changes[kind].toReversed()) {
    assert.equal(source.split(after).length, 2); source = source.replace(after, before);
  }
  assert.equal(hash(source), priors[kind]); return source;
}

export function restoreCaptureAvailabilityIfPresent(bytes, kind) {
  const marker = { producer: '"scripts/join-material-capture-availability.mjs",',
    runner: 'const captureAvailabilityReaderFactory = ',
    launcher: "const captureAvailability = rawRequested.includes('--capture-availability');" }[kind];
  return marker && bytes.toString().includes(marker) ? restoreCaptureAvailabilityRegistration(bytes, kind) : bytes;
}

export const captureAvailabilitySharedFile = 'tests/material-parity/badge-label-paint-registration.mjs';
const sharedPrior = 'e66373948416d062af1fc2cd5238487750ed3e78946cb65f29d8ea45d83693cd';
const sharedImport = "import { restoreCaptureAvailabilityIfPresent, createCaptureAvailabilityHistoricalRead } from './capture-availability-registration.mjs';\n";
const sharedChanges = [
  ["import assert from 'node:assert/strict';\nimport { createHash } from 'node:crypto';",
    sharedImport + "import assert from 'node:assert/strict';\nimport { createHash } from 'node:crypto';"],
  ['export function restoreBadgeLabelPaintRegistration(bytes, kind) {',
    'export function restoreBadgeLabelPaintRegistration(bytes, kind) {\n  bytes = restoreCaptureAvailabilityIfPresent(bytes, kind);'],
  ['export function restoreBadgeLabelPaintIfPresent(bytes, kind) {',
    'export function restoreBadgeLabelPaintIfPresent(bytes, kind) {\n  bytes = restoreCaptureAvailabilityIfPresent(bytes, kind);'],
  ['export function createBadgeLabelPaintHistoricalRead({ root, read }) {',
    'export function createBadgeLabelPaintHistoricalRead({ root, read }) {\n  read = createCaptureAvailabilityHistoricalRead({ root, read });'],
];
export function prepareCaptureAvailabilityShared(bytes) {
  let source = bytes.toString().replaceAll('\r\n', '\n');
  assert.equal(hash(source), sharedPrior);
  for (const [before, after] of sharedChanges) {
    assert.equal(source.split(before).length, 2); source = source.replace(before, after);
  }
  return source;
}
export function restoreCaptureAvailabilityShared(bytes) {
  let source = bytes.toString().replaceAll('\r\n', '\n');
  if (hash(source) === 'e87b3f32c04cc78c7af61a514c84cdd3568292fc5814860e1e144738f885a090') {
    source = execFileSync('git', ['show', 'def1891e:tests/material-parity/badge-label-paint-registration.mjs']).toString().replaceAll('\r\n', '\n');
    assert.equal(hash(source), 'd9391ec4243e141dc60c36a53a63d307a4a3c098552a1a330f1b32a5ba4c6f44');
  }
  if (hash(source) === sharedPrior) return source;
  for (const [before, after] of sharedChanges.toReversed()) {
    assert.equal(source.split(after).length, 2); source = source.replace(after, before);
  }
  assert.equal(hash(source), sharedPrior); return source;
}

// For predecessor evidence readers only. Current source collection must retain
// its raw reader so registration changes remain visible in the new inventory.
export function createCaptureAvailabilityHistoricalRead({ root, read }) {
  const kinds = new Map(Object.entries({ producer: 'tests/material-parity/input-equivalence-audit.mjs',
    runner: 'scripts/run-material-input-audit.mjs', launcher: 'scripts/export-material-input-audit-current-ancestry.mjs' })
    .map(([kind, file]) => [path.resolve(root, file), kind]));
  return (name, options) => {
    const kind = kinds.get(path.resolve(root, name));
    const shared = path.resolve(root, name) === path.resolve(root, captureAvailabilitySharedFile);
    if (!kind && !shared) return read(name, options);
    const input = read(name);
    // Leave earlier generations to their existing, independently guarded readers.
    const restored = shared ? (input.toString().includes(sharedImport.trim()) ? restoreCaptureAvailabilityShared(input) : input)
      : restoreCaptureAvailabilityIfPresent(input, kind);
    const bytes = Buffer.from(restored);
    const encoding = typeof options === 'string' ? options : options?.encoding;
    return encoding ? bytes.toString(encoding) : bytes;
  };
}
