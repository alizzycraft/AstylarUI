import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import path from 'node:path';
// Literal avoids a cycle through the legacy shared historical reader. The
// selector and reader tests bind this to the actual join's exported digest.
const badgeLabelPaintReview = '3cb9fe23409d103230b7d2f9e842d9f3dfd984fd579e5cf2cfc4c32bcef52b60';

const hash = b => createHash('sha256').update(b).digest('hex');
const priors = {
  producer: '06ba11b46b19d6b8e4907965ff653672398d893ff9e453f9d86d004914c9c033',
  runner: 'ec431d77ab100140332e6cb9bd8a0b0b1f319bfc37aeb8ceffeea6a3d2ab6349',
  launcher: '1b6b8b8ca0079ca08259c531caf68dfa9344749992e765b5158a5428055312db',
};
export const badgeLabelPaintSources = Object.freeze([
  'scripts/join-material-badge-label-paint.mjs',
  'scripts/audit-material-badge-label-crop-context.mjs',
  'scripts/audit-material-badge-texture-observation.mjs',
  'scripts/audit-material-badge-baseline.mjs',
  'tests/material-parity/badge-label-paint-registration.mjs',
  'tests/material-parity/badge-label-paint-join.spec.mjs',
  'tests/material-parity/badge-label-paint-registration.spec.mjs',
  'tests/material-parity/badge-texture-observation.spec.mjs',
  'artifacts/material-parity/badge-label-interaction-paint-20261028.log',
  'artifacts/material-parity/badge-label-count-overlap-20261028.log',
  'artifacts/material-parity/badge-texture-observation-20261028/latest-report.json',
  'artifacts/material-parity/badge-texture-observation-20261028-checkpoint/checkpoint/manifest.json',
  'artifacts/material-parity/badge-baseline-20261028.log',
  'artifacts/material-parity/badge-fractional-origin-snap-20261028.log',
]);
export const badgeLabelPaintProofs = Object.freeze([
  ['badge-label-paint-join', 'Badge label join preserves whole predecessor and bounds paint evidence to 40 interactions'],
  ['badge-label-paint-join', 'Badge label join rejects changed predecessor and corrupt evidence without writing'],
  ['badge-label-paint-registration', 'Badge staged registration preserves complete source proof and plan inventories'],
  ['badge-label-paint-registration', 'Badge staged selector preserves older selections and rejects mixed supplements'],
  ['badge-label-paint-registration', 'Badge historical boundary restores exact sources and rejects unrecognized changes'],
  ['badge-texture-observation', 'fractional-origin HTML reduction exposes CSS-baseline raster snapping at DPR2'],
  ['badge-texture-observation', 'measured global Canvas baselines do not remove the native Badge prefix discrepancy'],
  ['badge-texture-observation', 'Badge native baseline marker preserves bounds and separates transient candidate draws'],
  ['badge-texture-observation', 'retained Badge CPU texture and projected plane explain visible prefix, not native glyph parity'],
  ['badge-texture-observation', 'authenticated retained baseline formula reproduces both Badge CPU textures exactly'],
]);
const boundary = 'Historical Badge label-region diagnostics and bounded contrast prefix raster attribution;not equal full inputs,complete glyphs,action replay,current rendering or whole-case acceptance.';
const changes = {
  producer: [
    ['function sourceFingerprints(root) {\n  const files = [\n',
      'function sourceFingerprints(root) {\n  const files = [\n' + badgeLabelPaintSources.map(f => `    ${JSON.stringify(f)},\n`).join('')],
    ['function focusedProofInventory(root) {\n  return [\n',
      'function focusedProofInventory(root) {\n  return [\n' + badgeLabelPaintProofs.map(([suite, title]) =>
        `    proof(root, ${JSON.stringify(`tests/material-parity/${suite}.spec.mjs`)}, new RegExp(${JSON.stringify("test\\('" + title + "'")}), ${JSON.stringify(title)}, ${JSON.stringify(boundary)}),\n`).join('')],
  ],
  runner: [
    ["import { tooltipOpenReview, createTooltipOpenReviewReader } from './join-material-tooltip-open.mjs';",
      "import { tooltipOpenReview, createTooltipOpenReviewReader } from './join-material-tooltip-open.mjs';\nimport { badgeLabelPaintReview, createBadgeLabelPaintReviewReader } from './join-material-badge-label-paint.mjs';"],
    ['const applicability=tooltipOpenReaderFactory?.',
      'const badgeLabelPaintReaderFactory = options.caseObligationReviewSha256===badgeLabelPaintReview ? createBadgeLabelPaintReviewReader : tooltipOpenReaderFactory;\n    const applicability=badgeLabelPaintReaderFactory?.'],
  ],
  launcher: [
    ["const tooltipOpen = rawRequested.includes('--tooltip-open');", "const badgeLabelPaint = rawRequested.includes('--badge-label-paint');\nassert.ok(!badgeLabelPaint || rawRequested.every(argument => ['--badge-label-paint', '--check', '--dry-run'].includes(argument)), 'Choose one case-review supplement');\nconst tooltipOpen = rawRequested.includes('--tooltip-open');"],
    ['const requested = rawRequested.filter(', "const requested = rawRequested.filter(argument => argument !== '--badge-label-paint').filter("],
    ['|--tooltip-open]', '|--tooltip-open|--badge-label-paint]'],
    ['for (const [name, relative] of Object.entries(inputs)) {', `if (badgeLabelPaint) inputs['case-obligation-review'] = 'artifacts/material-parity/working-audit/proposals/${badgeLabelPaintReview}.json';\nfor (const [name, relative] of Object.entries(inputs)) {`],
    ['datepickerOpening || tooltipOpen)', 'datepickerOpening || tooltipOpen || badgeLabelPaint)'],
    ["if (requested.includes('--dry-run'))", `if (badgeLabelPaint) args[args.findIndex(argument => argument.startsWith('--case-obligation-review-sha256='))] = '--case-obligation-review-sha256=${badgeLabelPaintReview}';\nif (requested.includes('--dry-run'))`],
  ],
};

export function prepareBadgeLabelPaintRegistration(bytes, kind) {
  let source = bytes.toString().replaceAll('\r\n', '\n');
  assert.equal(hash(source), priors[kind]);
  for (const [before, after] of changes[kind]) {
    assert.equal(source.split(before).length, 2); source = source.replace(before, after);
  }
  return source;
}

export function restoreBadgeLabelPaintRegistration(bytes, kind) {
  let source = bytes.toString().replaceAll('\r\n', '\n');
  if (hash(source) === priors[kind]) return source;
  for (const [before, after] of changes[kind].toReversed()) {
    assert.equal(source.split(after).length, 2); source = source.replace(after, before);
  }
  assert.equal(hash(source), priors[kind]); return source;
}

const shared = {
  'tests/material-parity/snackbar-single-open-registration.mjs': {
    prior: '03804e5a7e975b324f2aabba32eef7a128a3fbaa285e5ebfd15f64a73fb123af',
    changes: [
      ["import assert from 'node:assert/strict';", "import { restoreBadgeLabelPaintIfPresent } from './badge-label-paint-registration.mjs';\nimport assert from 'node:assert/strict';"],
      ['export function restoreSnackbarRegistrationIfPresent(bytes, kind) {',
        'export function restoreSnackbarRegistrationIfPresent(bytes, kind) {\n  bytes = restoreBadgeLabelPaintIfPresent(bytes, kind);'],
    ],
  },
  'tests/material-parity/snackbar-single-open-registration.spec.mjs': {
    prior: '27e976a62772b2868936c1f2039bbb0e002af13ff980475baa1a50e603182a0d',
    changes: [["import { readFileSync as readActualFileSync } from 'node:fs';",
      "import { readFileSync as readNativeFileSync } from 'node:fs';\nimport { createBadgeLabelPaintHistoricalRead } from './badge-label-paint-registration.mjs';\nconst readActualFileSync = createBadgeLabelPaintHistoricalRead({ root: process.cwd(), read: readNativeFileSync });"]],
  },
  'tests/material-parity/tooltip-position-history.spec.mjs': {
    prior: 'eef9b37c0f07148213cce62373992a0826ccfba93f05875e48630366671d3f1c',
    changes: [["test('tooltip registry preparation preserves the complete predecessor inventory', async () => {\n  const { readFileSync } = await import('node:fs');",
      "test('tooltip registry preparation preserves the complete predecessor inventory', async () => {\n  const { readFileSync: readNativeFileSync } = await import('node:fs');\n  const { createBadgeLabelPaintHistoricalRead } = await import('./badge-label-paint-registration.mjs');\n  const readFileSync = createBadgeLabelPaintHistoricalRead({ root: process.cwd(), read: readNativeFileSync });"]],
  },
};
export const badgeLabelPaintSharedFiles = Object.freeze(Object.keys(shared));
export function prepareBadgeLabelPaintShared(bytes, file) {
  const entry = shared[file]; assert.ok(entry);
  let source = bytes.toString().replaceAll('\r\n', '\n'); assert.equal(hash(source), entry.prior);
  for (const [before, after] of entry.changes) {
    assert.equal(source.split(before).length, 2); source = source.replace(before, after);
  }
  return source;
}
export function restoreBadgeLabelPaintShared(bytes, file) {
  const entry = shared[file]; assert.ok(entry);
  let source = bytes.toString().replaceAll('\r\n', '\n');
  if (hash(source) === entry.prior) return source;
  for (const [before, after] of entry.changes.toReversed()) {
    assert.equal(source.split(after).length, 2); source = source.replace(after, before);
  }
  assert.equal(hash(source), entry.prior); return source;
}
export function restoreBadgeLabelPaintIfPresent(bytes, kind) {
  const marker = { producer: '"scripts/join-material-badge-label-paint.mjs",',
    runner: 'const badgeLabelPaintReaderFactory = ', launcher: "const badgeLabelPaint = rawRequested.includes('--badge-label-paint');" }[kind];
  return marker && bytes.toString().includes(marker) ? restoreBadgeLabelPaintRegistration(bytes, kind) : bytes;
}
export function createBadgeLabelPaintHistoricalRead({ root, read }) {
  const kinds = new Map(Object.entries({ producer: 'tests/material-parity/input-equivalence-audit.mjs',
    runner: 'scripts/run-material-input-audit.mjs', launcher: 'scripts/export-material-input-audit-current-ancestry.mjs' })
    .map(([kind, file]) => [path.resolve(root, file), kind]));
  const sharedPaths = new Map(badgeLabelPaintSharedFiles.map(file => [path.resolve(root, file), file]));
  return (name, options) => {
    const absolute = path.resolve(root, name), kind = kinds.get(absolute), file = sharedPaths.get(absolute);
    if (!kind && !file) return read(name, options);
    const input = read(name);
    // Older nested generations belong to their existing readers. Only a
    // recognized new addition is peeled; whole predecessor hashes still bind it.
    const restored = file ? restoreBadgeLabelPaintShared(input, file) : restoreBadgeLabelPaintIfPresent(input, kind);
    const bytes = Buffer.from(restored);
    const encoding = typeof options === 'string' ? options : options?.encoding;
    return encoding ? bytes.toString(encoding) : bytes;
  };
}
