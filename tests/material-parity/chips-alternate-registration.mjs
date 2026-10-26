// Proposed registration only. Live selectors remain unchanged until shared
// historical entry points have passed integration with this exact delta.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

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
