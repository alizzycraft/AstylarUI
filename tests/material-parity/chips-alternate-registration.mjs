// Bounded registration with exact reversals at shared historical entry points.
// Registration does not imply canonical publication or whole-case acceptance.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import path from 'node:path';
import {createStepperBatchPriorRead,restoreStepperBatchRegistryIfPresent} from './stepper-batch-registration.mjs';

export const chipsAlternateReview = 'e17dff3342e922de9febdd85402b433deb5872091f36cbb709d38de2327d6431';
const prior = {
  producer: '5a8f54cae67126b775f0572727c1bf87ba3aaf7e64dfc1b4e09df95d42cb6e39',
  runner: 'd85173bcd3f5aac4f53959c8f9dcc5302acfc7f4cbf3e04c02573fb7cd37e835',
  launcher: '7116b47d780fda84add39781d608d6305b53bfcbc13afaa9a198c348150d6dd5',
};
export const chipsAlternateSources = [
  'scripts/audit-material-chips-alternate.mjs',
  'scripts/join-material-chips-alternate.mjs',
  'tests/material-parity/chips-alternate-source-boundary.spec.mjs',
  'tests/material-parity/chips-alternate-registration.mjs',
  'tests/material-parity/chips-alternate-registration.spec.mjs',
  'artifacts/material-parity/chips-alternate-observed-20261026/latest-report.json',
];
export const chipsAlternateProofs = [
  ['tests/material-parity/chips-alternate-source-boundary.spec.mjs', 'Chips alternate join changes only eight activation obligations and restores the predecessor'],
  ['tests/material-parity/chips-alternate-source-boundary.spec.mjs', 'supplementary alternate capture observes generated options and preserves native DOM lag'],
  ['tests/material-parity/chips-alternate-source-boundary.spec.mjs', 'original Chips alternate recipe selects both owners without certifying historical hits'],
  ['tests/material-parity/chips-alternate-source-boundary.spec.mjs', 'original Chips alternate comparator records are not target or state witnesses'],
  ['tests/material-parity/chips-alternate-registration.spec.mjs', 'proposed Chips registration preserves complete source and proof inventories'],
  ['tests/material-parity/chips-alternate-registration.spec.mjs', 'proposed Chips selector preserves old choices and rejects combined supplements'],
];
const boundary = 'Supplementary retained-build generated-option transitions and original recipe/comparator limits; not original hit reconstruction, current-library rendering or whole-case acceptance.';
const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const changes = kind => kind === 'producer' ? [
  ['function sourceFingerprints(root) {\n  const files = [\n', 'function sourceFingerprints(root) {\n  const files = [\n' + chipsAlternateSources.map(file => `    ${JSON.stringify(file)},\n`).join('')],
  ['function focusedProofInventory(root) {\n  return [\n', 'function focusedProofInventory(root) {\n  return [\n' + chipsAlternateProofs.map(([file, title]) => `    proof(root, ${JSON.stringify(file)}, new RegExp(${JSON.stringify("test\\('" + escape(title) + "'")}),\n      ${JSON.stringify(title)}, ${JSON.stringify(boundary)}),\n`).join('')],
] : kind === 'launcher' ? [
  ["const focusSelection = rawRequested.includes('--focus-selection');", "const chipsAlternate = rawRequested.includes('--chips-alternate');\nassert.ok(!chipsAlternate || rawRequested.every(argument => ['--chips-alternate', '--check', '--dry-run'].includes(argument)), 'Choose one case-review supplement');\nconst focusSelection = rawRequested.includes('--focus-selection');"],
  ['const requested = rawRequested.filter(', "const requested = rawRequested.filter(argument => argument !== '--chips-alternate').filter("],
  ['|--focus-selection]', '|--focus-selection|--chips-alternate]'],
  ['for (const [name, relative] of Object.entries(inputs)) {', `if (chipsAlternate) inputs['case-obligation-review'] = 'artifacts/material-parity/working-audit/proposals/${chipsAlternateReview}.json';\nfor (const [name, relative] of Object.entries(inputs)) {`],
  ['sortArrow || focusSelection)', 'sortArrow || focusSelection || chipsAlternate)'],
  ["if (requested.includes('--dry-run'))", `if (chipsAlternate) args[args.findIndex(argument => argument.startsWith('--case-obligation-review-sha256='))] = '--case-obligation-review-sha256=${chipsAlternateReview}';\nif (requested.includes('--dry-run'))`],
] : [
  ["import { focusSelectionReview, createFocusSelectionAuditReviewReader } from '../tests/material-parity/public-tab-selection-finding.mjs';", "import { focusSelectionReview, createFocusSelectionAuditReviewReader } from '../tests/material-parity/public-tab-selection-finding.mjs';\nimport { chipsAlternateReview } from '../tests/material-parity/chips-alternate-registration.mjs';\nimport { createChipsAlternateReviewReader } from './join-material-chips-alternate.mjs';"],
  ['const applicability=focusSelectionReaderFactory?.', 'const chipsAlternateReaderFactory = options.caseObligationReviewSha256===chipsAlternateReview ? createChipsAlternateReviewReader : focusSelectionReaderFactory;\n    const applicability=chipsAlternateReaderFactory?.'],
];
const normalize = value => value.toString().replaceAll('\r\n', '\n');
const hash = value => createHash('sha256').update(value).digest('hex');
const once = (source, before, after) => {
  assert.equal(source.split(before).length, 2, 'Registration anchor must be unique');
  return source.replace(before, after);
};
export function prepareChipsAlternateRegistration(bytes, kind) {
  assert.ok(Object.hasOwn(prior, kind));
  let source = normalize(bytes); assert.equal(hash(source), prior[kind]);
  for (const [before, after] of changes(kind)) source = once(source, before, after);
  return source;
}
export function restoreChipsAlternateRegistration(bytes, kind) {
  assert.ok(Object.hasOwn(prior, kind));
  let source = normalize(bytes);
  for (const [before, after] of changes(kind).toReversed()) source = once(source, after, before);
  assert.equal(hash(source), prior[kind], 'Complete pre-Chips source must recover');
  return source;
}
export function restoreChipsAlternateRegistrationIfPresent(bytes, kind) {
  bytes = restoreStepperBatchRegistryIfPresent(bytes, kind);
  const source = normalize(bytes);
  const marker = { producer: '    "tests/material-parity/chips-alternate-registration.mjs",\n',
    runner: '    const chipsAlternateReaderFactory = ', launcher: "const chipsAlternate = rawRequested.includes('--chips-alternate');" }[kind];
  return marker && source.includes(marker) ? restoreChipsAlternateRegistration(source, kind) : source;
}

// Exact bounded changes to the shared direct entry points, not only the newest
// reader wrapper. Old generations still go through their own full hash checks.
const shared = {
  'tests/material-parity/public-tab-selection-finding.mjs': {
    prior: '8169ad96feed7f1d47337305526efacd1a36202e5038ef92b689f518e4938733',
    changes: [
      ["import path from 'node:path';", "import path from 'node:path';\nimport {createChipsAlternatePriorRead,restoreChipsAlternateRegistrationIfPresent} from './chips-alternate-registration.mjs';"],
      ['export function restoreFocusSelectionAuditRegistry(bytes,kind){', 'export function restoreFocusSelectionAuditRegistry(bytes,kind){\n  bytes=restoreChipsAlternateRegistrationIfPresent(bytes,kind);'],
      ['export function restoreFocusSelectionAuditSelection(bytes,kind){', 'export function restoreFocusSelectionAuditSelection(bytes,kind){\n  bytes=restoreChipsAlternateRegistrationIfPresent(bytes,kind);'],
      ['export function createFocusSelectionAuditPriorRead({root,read}){', 'export function createFocusSelectionAuditPriorRead({root,read}){\n  read=createChipsAlternatePriorRead({root,read});'],
    ],
  },
  'tests/material-parity/divider-margin-registration.mjs': {
    prior: 'c8b2dd5406a2eb5aa3dc33f8d3e88a74243a38d1f8ff3b1d5f23f0d04a56b46e',
    changes: [
      ["import path from 'node:path';", "import path from 'node:path';\nimport {createChipsAlternatePriorRead,restoreChipsAlternateRegistrationIfPresent,restoreChipsAlternateSharedSourceIfPresent} from './chips-alternate-registration.mjs';"],
      ['export function restoreDividerMarginRegistry(bytes) {', "export function restoreDividerMarginRegistry(bytes) {\n  bytes = restoreChipsAlternateRegistrationIfPresent(bytes, 'producer');"],
      ['export function restoreDividerMarginSharedSource(bytes, file) {', 'export function restoreDividerMarginSharedSource(bytes, file) {\n  bytes = restoreChipsAlternateSharedSourceIfPresent(bytes, file);'],
      ['export function createDividerMarginPriorRead({root, read}) {', 'export function createDividerMarginPriorRead({root, read}) {\n  read = createChipsAlternatePriorRead({root, read});'],
    ],
  },
  'tests/material-parity/absolute-margin-top-evidence.spec.mjs': {
    prior: '66f2dd350d456a5204c4a3a1fa9a6f0ec31d7cdd42b6b91aee6e73f084f5d83c',
    changes: [
      ["import ts from 'typescript';", "import ts from 'typescript';\nimport {createChipsAlternatePriorRead} from './chips-alternate-registration.mjs';"],
      ["  const live = readFileSync(file, 'utf8').replaceAll('\\r\\n', '\\n');", "  const previousRead = createChipsAlternatePriorRead({root:process.cwd(),read:readFileSync});\n  const live = previousRead(file, 'utf8').replaceAll('\\r\\n', '\\n');"],
      ["    const current = readFileSync(name, 'utf8').replaceAll('\\r\\n', '\\n');", "    const current = previousRead(name, 'utf8').replaceAll('\\r\\n', '\\n');"],
      ["  assert.equal(readFileSync(file, 'utf8').replaceAll('\\r\\n', '\\n'), live);", "  assert.equal(previousRead(file, 'utf8').replaceAll('\\r\\n', '\\n'), live);"],
    ],
  },
  'tests/material-parity/public-email-selection.spec.mjs': {
    prior: '93f9404e2a38545947d2335c814ee57a5c22287716cbd054e8d47f681525a83f',
    changes: [
      ["import ts from 'typescript';", "import ts from 'typescript';\nimport {restoreChipsAlternateRegistrationIfPresent} from './chips-alternate-registration.mjs';"],
      ["const live=readFileSync(file,'utf8').replaceAll('\\r\\n','\\n');raw[kind]=acceptedRead(file,'utf8');staged[kind]=api.prepareFocusSelectionAuditSelection", "const live=restoreChipsAlternateRegistrationIfPresent(readFileSync(file),kind);raw[kind]=acceptedRead(file,'utf8');staged[kind]=api.prepareFocusSelectionAuditSelection"],
    ],
  },
};
export const chipsAlternateSharedSources = Object.freeze(Object.keys(shared));
const sharedAnchor = text => /^(import |export function )/.test(text) ? '\n' + text : text;
export function prepareChipsAlternateSharedSource(bytes, file) {
  const entry = shared[file]; assert.ok(entry);
  let source = normalize(bytes); assert.equal(hash(source), entry.prior);
  for (const [before, after] of entry.changes) source = once(source, sharedAnchor(before), sharedAnchor(after));
  return source;
}
export function restoreChipsAlternateSharedSourceIfPresent(bytes, file) {
  let source = normalize(bytes);
  if (!source.includes("from './chips-alternate-registration.mjs';")) return source;
  const entry = shared[file]; assert.ok(entry);
  for (const [before, after] of entry.changes.toReversed()) source = once(source, sharedAnchor(after), sharedAnchor(before));
  assert.equal(hash(source), entry.prior, 'Complete pre-Chips shared source must recover');
  return source;
}
export function createChipsAlternatePriorRead({root, read}) {
  read = createStepperBatchPriorRead({root, read});
  const kinds = new Map(Object.entries({ 'tests/material-parity/input-equivalence-audit.mjs': 'producer',
    'scripts/run-material-input-audit.mjs': 'runner', 'scripts/export-material-input-audit-current-ancestry.mjs': 'launcher' })
    .map(([file, kind]) => [path.resolve(root, file), kind]));
  const sharedFiles = new Map(chipsAlternateSharedSources.map(file => [path.resolve(root, file), file]));
  return (name, options) => {
    const absolute = path.resolve(root, name), kind = kinds.get(absolute), file = sharedFiles.get(absolute);
    if (!kind && !file) return read(name, options);
    const bytes = read(name), source = kind ? restoreChipsAlternateRegistrationIfPresent(bytes, kind)
      : restoreChipsAlternateSharedSourceIfPresent(bytes, file);
    const encoding = typeof options === 'string' ? options : options?.encoding;
    return encoding ? Buffer.from(source).toString(encoding) : Buffer.from(source);
  };
}
