import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import path from 'node:path';

const hash = b => createHash('sha256').update(b).digest('hex');
const prior = '19dea13ed3eaf952b72171e12664ce180185aea863c52e187649c273f6782fc1';
export const dividerConsumerReview = 'b49ef7e0b1470909f1b41f306642c946f4ccec3afda6b3fadedf31d9fd170d21';
export const dividerConsumerSources = Object.freeze([
  'scripts/check-divider-omitted-owner-consumers.mjs',
  'scripts/join-material-divider-consumer-inputs.mjs',
  'tests/material-parity/divider-consumer-input-join.spec.mjs',
  'tests/material-parity/divider-consumer-registration.mjs',
  'tests/material-parity/divider-consumer-registration.spec.mjs',
  'artifacts/material-parity/divider-consumer-check-divider-owner-coverage-20261102.mjs',
]);
export const dividerConsumerProofs = Object.freeze([
  ['divider-consumer-input-join', 'Divider consumer batch joins exact accepted parents and preserves every gap and status'],
  ['divider-consumer-input-join', 'Divider consumer review passes the existing complete receipt loader without promoting cases'],
  ['divider-consumer-registration', 'Divider consumer staged inventory conserves all existing sources proofs and plans'],
  ['divider-consumer-registration', 'Divider consumer historical producer read is exact reversible and drift rejecting'],
  ['divider-consumer-registration', 'Divider consumer staged routing preserves old flags and rejects mixed supplements'],
]);
const boundary = 'Exact retained owner inputs and source-method routing plus receipt-loader integration;not complete layout,current rendering or case closure.';
const changes = [
  ['function sourceFingerprints(root) {\n  const files = [\n', dividerConsumerSources.map(f => `    ${JSON.stringify(f)},\n`).join('')],
  ['function focusedProofInventory(root) {\n  return [\n', dividerConsumerProofs.map(([suite, title]) => {
    const pattern = "test\\('" + title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "'";
    return `    proof(root, ${JSON.stringify(`tests/material-parity/${suite}.spec.mjs`)}, new RegExp(${JSON.stringify(pattern)}), ${JSON.stringify(title)}, ${JSON.stringify(boundary)}),\n`;
  }).join('')],
];
export function prepareDividerConsumerProducer(bytes) {
  let source = bytes.toString().replaceAll('\r\n', '\n');
  assert.equal(hash(source), prior, 'Exact current producer required');
  for (const [anchor, added] of changes) {
    assert.equal(source.split(anchor).length, 2); source = source.replace(anchor, anchor + added);
  }
  return source;
}
export function restoreDividerConsumerProducer(bytes) {
  let source = bytes.toString().replaceAll('\r\n', '\n');
  if (hash(source) === prior) return source;
  for (const [anchor, added] of changes.toReversed()) {
    assert.equal(source.split(anchor + added).length, 2); source = source.replace(anchor + added, anchor);
  }
  assert.equal(hash(source), prior, 'Unknown producer changes'); return source;
}
export function createDividerConsumerProducerHistoricalRead({ root, read }) {
  const producer = path.resolve(root, 'tests/material-parity/input-equivalence-audit.mjs');
  return (name, options) => {
    if (path.resolve(root, name) !== producer) return read(name, options);
    const bytes = Buffer.from(restoreDividerConsumerProducer(read(name)));
    const encoding = typeof options === 'string' ? options : options?.encoding;
    return encoding ? bytes.toString(encoding) : bytes;
  };
}
const selectionPriors = {
  runner: '745719dff63c101cd0bad55f5f76109978ebd12e0b69dd52e7c37f6c979e853e',
  launcher: 'bc9fed45ab24526e8ce235aecea6fe3ba2f966a18c5bfbd912bf258f8839f890',
};
const selectionChanges = {
  runner: [
    ["import { captureAvailabilityReview, createCaptureAvailabilityReviewReader } from './join-material-capture-availability.mjs';",
      "import { captureAvailabilityReview, createCaptureAvailabilityReviewReader } from './join-material-capture-availability.mjs';\nimport { createDividerConsumerReviewReader } from './join-material-divider-consumer-inputs.mjs';\nimport { dividerConsumerReview, createDividerConsumerRegistrationHistoricalRead } from '../tests/material-parity/divider-consumer-registration.mjs';"],
    ['const captureAvailabilityEvidenceRead = options.caseObligationReviewSha256===captureAvailabilityReview ? auditReadFileSync : createCaptureAvailabilityHistoricalRead({root,read:auditReadFileSync});',
      'const dividerConsumerEvidenceRead = createDividerConsumerRegistrationHistoricalRead({root,read:auditReadFileSync});\n    const captureAvailabilityEvidenceRead = (options.caseObligationReviewSha256===captureAvailabilityReview || options.caseObligationReviewSha256===dividerConsumerReview) ? dividerConsumerEvidenceRead : createCaptureAvailabilityHistoricalRead({root,read:dividerConsumerEvidenceRead});'],
    ['const applicability=captureAvailabilityReaderFactory?.',
      'const dividerConsumerReaderFactory = options.caseObligationReviewSha256===dividerConsumerReview ? createDividerConsumerReviewReader : captureAvailabilityReaderFactory;\n    const applicability=dividerConsumerReaderFactory?.'],
    ['diagnosticRead: options.caseObligationReviewSha256===captureAvailabilityReview\n      ? createCaptureAvailabilityHistoricalRead({root,read:auditReadFileSync}) : readFileSync',
      `diagnosticRead: (options.caseObligationReviewSha256===captureAvailabilityReview || options.caseObligationReviewSha256==='${dividerConsumerReview}')\n      ? createCaptureAvailabilityHistoricalRead({root,read:auditReadFileSync}) : readFileSync`],
  ],
  launcher: [
    ["const captureAvailability = rawRequested.includes('--capture-availability');",
      "const dividerConsumerInputs = rawRequested.includes('--divider-consumer-inputs');\nassert.ok(!dividerConsumerInputs || rawRequested.every(argument => ['--divider-consumer-inputs', '--check', '--dry-run'].includes(argument)), 'Choose one case-review supplement');\nconst captureAvailability = rawRequested.includes('--capture-availability');"],
    ['const requested = rawRequested.filter(', "const requested = rawRequested.filter(argument => argument !== '--divider-consumer-inputs').filter("],
    ['|--capture-availability]', '|--capture-availability|--divider-consumer-inputs]'],
    ['for (const [name, relative] of Object.entries(inputs)) {', `if (dividerConsumerInputs) inputs['case-obligation-review'] = 'artifacts/material-parity/working-audit/proposals/${dividerConsumerReview}.json';\nfor (const [name, relative] of Object.entries(inputs)) {`],
    ['tooltipOpen || badgeLabelPaint || captureAvailability)', 'tooltipOpen || badgeLabelPaint || captureAvailability || dividerConsumerInputs)'],
    ["if (requested.includes('--dry-run'))", `if (dividerConsumerInputs) args[args.findIndex(argument => argument.startsWith('--case-obligation-review-sha256='))] = '--case-obligation-review-sha256=${dividerConsumerReview}';\nif (requested.includes('--dry-run'))`],
  ],
};
export function prepareDividerConsumerSelection(bytes, kind) {
  let source = bytes.toString().replaceAll('\r\n', '\n'); assert.equal(hash(source), selectionPriors[kind]);
  for (const [before, after] of selectionChanges[kind]) {
    assert.equal(source.split(before).length, 2); source = source.replace(before, after);
  }
  return source;
}
export function restoreDividerConsumerSelection(bytes, kind) {
  let source = bytes.toString().replaceAll('\r\n', '\n');
  if (hash(source) === selectionPriors[kind]) return source;
  for (const [before, after] of selectionChanges[kind].toReversed()) {
    assert.equal(source.split(after).length, 2); source = source.replace(after, before);
  }
  assert.equal(hash(source), selectionPriors[kind]); return source;
}
export function stripDividerConsumerRegistrationIfPresent(bytes, kind) {
  const marker = { producer: '"scripts/check-divider-omitted-owner-consumers.mjs",',
    runner: 'const dividerConsumerReaderFactory = ', launcher: 'const dividerConsumerInputs = ' }[kind];
  if (!marker || !bytes.toString().includes(marker)) return bytes;
  return kind === 'producer' ? restoreDividerConsumerProducer(bytes) : restoreDividerConsumerSelection(bytes, kind);
}
const legacyPrior = 'e53faef5e896f110f11155622cdbf427819acde7d22e01f658d0f0ccfe244e83';
const legacyChanges = [
  ["import path from 'node:path';", "import path from 'node:path';\nimport { stripDividerConsumerRegistrationIfPresent, createDividerConsumerRegistrationHistoricalRead } from './divider-consumer-registration.mjs';"],
  ['export function restoreCaptureAvailabilityRegistration(bytes, kind) {', 'export function restoreCaptureAvailabilityRegistration(bytes, kind) {\n  bytes = stripDividerConsumerRegistrationIfPresent(bytes, kind);'],
  ['export function createCaptureAvailabilityHistoricalRead({ root, read }) {', 'export function createCaptureAvailabilityHistoricalRead({ root, read }) {\n  read = createDividerConsumerRegistrationHistoricalRead({ root, read });'],
];
export function prepareDividerConsumerLegacyRegistration(bytes) {
  let source = bytes.toString().replaceAll('\r\n', '\n'); assert.equal(hash(source), legacyPrior);
  for (const [before, after] of legacyChanges) { assert.equal(source.split(before).length, 2); source = source.replace(before, after); }
  return source;
}
export function restoreDividerConsumerLegacyRegistration(bytes) {
  let source = bytes.toString().replaceAll('\r\n', '\n');
  if (hash(source) === legacyPrior) return source;
  for (const [before, after] of legacyChanges.toReversed()) { assert.equal(source.split(after).length, 2); source = source.replace(after, before); }
  assert.equal(hash(source), legacyPrior); return source;
}
export function createDividerConsumerRegistrationHistoricalRead({ root, read }) {
  const kinds = new Map(Object.entries({ producer: 'tests/material-parity/input-equivalence-audit.mjs',
    runner: 'scripts/run-material-input-audit.mjs', launcher: 'scripts/export-material-input-audit-current-ancestry.mjs' })
    .map(([kind, file]) => [path.resolve(root, file), kind]));
  return (name, options) => {
    const absolute = path.resolve(root, name), kind = kinds.get(absolute);
    const legacy = absolute === path.resolve(root, 'tests/material-parity/capture-availability-registration.mjs');
    if (!kind && !legacy) return read(name, options);
    const input = read(name);
    const bytes = Buffer.from(legacy ? restoreDividerConsumerLegacyRegistration(input) : stripDividerConsumerRegistrationIfPresent(input, kind));
    const encoding = typeof options === 'string' ? options : options?.encoding;
    return encoding ? bytes.toString(encoding) : bytes;
  };
}
