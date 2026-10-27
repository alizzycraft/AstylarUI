import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { createSnackbarSingleOpenReviewReader } from './snackbar-single-open-registration.mjs';
import { joinDatepickerOpening } from '../../scripts/join-material-datepicker-opening.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const normalize = bytes => bytes.toString().replaceAll('\r\n', '\n');
const predecessor = 'af9301fa47e362d9ea9071f6ec274a57d4c371b720a56586eb718aa4e61f30c6';
export const datepickerOpeningReview = 'cd9631f0dc9f7ca63b35c5d11d11611ebd3f98930166352ff56b3016d7989894';
const selectionPrior = { runner: '91974b2729afba85332a577da38be3058cc64bcadfec2421badab33768414a16',
  launcher: '10f2bae9bdc9dc74330d45984dd063af57d3d89180567726ef12768a0400733b' };
const selectionChanges = {
  runner: [
    ["import { snackbarSingleOpenReview, createSnackbarSingleOpenReviewReader } from '../tests/material-parity/snackbar-single-open-registration.mjs';", "import { snackbarSingleOpenReview, createSnackbarSingleOpenReviewReader } from '../tests/material-parity/snackbar-single-open-registration.mjs';\nimport { datepickerOpeningReview, createDatepickerOpeningReviewReader } from '../tests/material-parity/datepicker-opening-registration.mjs';"],
    ['const applicability=snackbarSingleOpenReaderFactory?.', 'const datepickerOpeningReaderFactory = options.caseObligationReviewSha256===datepickerOpeningReview ? createDatepickerOpeningReviewReader : snackbarSingleOpenReaderFactory;\n    const applicability=datepickerOpeningReaderFactory?.'],
  ],
  launcher: [
    ["const snackbarSingleOpen = rawRequested.includes('--snackbar-single-open');", "const datepickerOpening = rawRequested.includes('--datepicker-opening');\nassert.ok(!datepickerOpening || rawRequested.every(argument => ['--datepicker-opening', '--check', '--dry-run'].includes(argument)), 'Choose one case-review supplement');\nconst snackbarSingleOpen = rawRequested.includes('--snackbar-single-open');"],
    ['const requested = rawRequested.filter(', "const requested = rawRequested.filter(argument => argument !== '--datepicker-opening').filter("],
    ['|--snackbar-single-open]', '|--snackbar-single-open|--datepicker-opening]'],
    ['for (const [name, relative] of Object.entries(inputs)) {', `if (datepickerOpening) inputs['case-obligation-review'] = 'artifacts/material-parity/working-audit/proposals/${datepickerOpeningReview}.json';\nfor (const [name, relative] of Object.entries(inputs)) {`],
    ['stepperBatch || snackbarSingleOpen)', 'stepperBatch || snackbarSingleOpen || datepickerOpening)'],
    ["if (requested.includes('--dry-run'))", `if (datepickerOpening) args[args.findIndex(argument => argument.startsWith('--case-obligation-review-sha256='))] = '--case-obligation-review-sha256=${datepickerOpeningReview}';\nif (requested.includes('--dry-run'))`],
  ],
};
export function prepareDatepickerOpeningSelection(bytes, kind) {
  let source = normalize(bytes); assert.equal(hash(source), selectionPrior[kind]);
  for (const [before, after] of selectionChanges[kind]) {
    assert.equal(source.split(before).length, 2); source = source.replace(before, after);
  }
  return source;
}
export function restoreDatepickerOpeningSelection(bytes, kind) {
  let source = normalize(bytes);
  if (hash(source) === selectionPrior[kind]) return source;
  for (const [before, after] of selectionChanges[kind].toReversed()) {
    assert.equal(source.split(after).length, 2); source = source.replace(after, before);
  }
  assert.equal(hash(source), selectionPrior[kind]); return source;
}
export const datepickerOpeningSources = Object.freeze([
  'scripts/join-material-datepicker-opening.mjs',
  'scripts/audit-material-configured-control-activation.mjs',
  'scripts/audit-material-configured-control-focus.mjs',
  'tests/material-parity/datepicker-opening-registration.mjs',
  'tests/material-parity/datepicker-opening-registration.spec.mjs',
  'artifacts/material-parity/datepicker-toggle-activation-20261027/latest-report.json',
  'artifacts/material-parity/datepicker-toggle-activation-20261027-provenance/checkpoint/manifest.json',
]);
export const datepickerOpeningProofs = Object.freeze([
  ['tests/material-parity/original-material-runner-source.spec.mjs', 'datepicker opening coverage join preserves all parent obligations and rejects corrupt evidence'],
  ['tests/material-parity/original-material-runner-source.spec.mjs', 'datepicker opening finding preserves all predecessors and binds the exact current branch'],
  ['tests/material-parity/original-material-runner-source.spec.mjs', 'captured datepicker opening inputs explicitly differ in calendar focus transfer'],
  ['tests/material-parity/original-material-runner-source.spec.mjs', 'fresh seventeen-case datepicker toggle trace records opening and divergent focus destinations'],
  ['tests/material-parity/original-material-runner-source.spec.mjs', 'original datepicker activation targets the toggle and seventeen retained endpoints contain calendars'],
  ['tests/material-parity/datepicker-opening-registration.spec.mjs', 'datepicker registry preparation preserves every predecessor entry and rejects unrelated drift'],
  ['tests/material-parity/datepicker-opening-registration.spec.mjs', 'datepicker historical source reader authenticates both endpoints and rejects unknown edits'],
]);
const boundary = 'Exact retained toggle opening and upstream focus-input omission;not current rendering,intermediate paint,all focus paths or whole-case acceptance.';
const plan = { priority: 5.85, rootCause: 'Datepicker opening omits active-calendar-cell focus intent',
  action: 'Supply equivalent opening focus intent through the shared public lifecycle,not geometry offsets or plugin-specific focus routing. Retained seventeen-case toggle evidence and authenticated source replay distinguish an omitted request from a request lost in core. Preserve date-input/timepicker trigger differences. Reduce a separate public/core failure only if equivalent supplied focus intent fails. No implementation authorized by this audit.' };
const additions = [
  ['function sourceFingerprints(root) {\n  const files = [\n', datepickerOpeningSources.map(file => `    ${JSON.stringify(file)},\n`).join('')],
  ['function focusedProofInventory(root) {\n  return [\n', datepickerOpeningProofs.map(([file, title]) =>
    `    proof(root, ${JSON.stringify(file)}, new RegExp(${JSON.stringify("test\\('" + title + "'")}), ${JSON.stringify(title)}, ${JSON.stringify(boundary)}),\n`).join('')],
  ['function implementationPlan() {\n  return [\n', `    ${JSON.stringify(plan)},\n`],
];
export function prepareDatepickerOpeningRegistry(bytes) {
  let source = normalize(bytes); assert.equal(hash(source), predecessor);
  for (const [anchor, extra] of additions) {
    assert.equal(source.split(anchor).length, 2); source = source.replace(anchor, anchor + extra);
  }
  return source;
}
export function restoreDatepickerOpeningRegistry(bytes) {
  let source = normalize(bytes);
  if (hash(source) === predecessor) return source;
  for (const [anchor, extra] of additions.toReversed()) {
    assert.equal(source.split(anchor + extra).length, 2); source = source.replace(anchor + extra, anchor);
  }
  assert.equal(hash(source), predecessor); return source;
}

let originalPolicy;
export function restoreDatepickerOpeningPolicyIfPresent(bytes) {
  const source = normalize(bytes);
  if (!source.includes('fixture-datepicker-opening-focus-transfer-omitted')) return source;
  assert.equal(hash(source), '7381e8fba08553caec77947e88ce5246e1c3fc01a6da18b81f3c07ea945a336f', 'Unrecognized datepicker policy transition');
  if (originalPolicy === undefined) {
    originalPolicy = normalize(execFileSync('git', ['show', '83b9ad89:tests/material-parity/input-equivalence-policy.mjs'], { maxBuffer: 8_000_000 }));
    assert.equal(hash(originalPolicy), 'a38dc20ab17b392fcd1eeac4e8ff693859c3dbfaf4395ae0e0a782326bd72a6c');
  }
  return originalPolicy;
}

export const datepickerHistoricalSources = Object.freeze([
  ['tests/material-parity/input-equivalence-policy.mjs', 'a38dc20ab17b392fcd1eeac4e8ff693859c3dbfaf4395ae0e0a782326bd72a6c', '7381e8fba08553caec77947e88ce5246e1c3fc01a6da18b81f3c07ea945a336f'],
  ['tests/material-parity/original-material-runner-source.spec.mjs', 'd362fd02e63c5a135d7688377281eb4ef88505cd13f7cd5ff34c629cbff7260e', '528806a405fa93abde36314484aa3287c2174660b019ab7b8d64cece6348f398'],
  ['tests/material-parity/snackbar-single-open-registration.mjs', '0820b53f0ba80015faa853953ec824ed5f3fa480d8edd9404dce674d2e7c7d9a', 'dcf312086d8c6409fb6463b9c28f68d613b689ae75368ab8fd8e39f02572a4b5'],
  ['tests/material-parity/snackbar-single-open-registration.spec.mjs', '45a8e79222589ef10b1b309704229a9ef5fc6e20e70f2c1869ffbfefe2ee288a', '1fd52788e1e36bb7c2b476529952d262f7c60da7bc8a5a0061432e80291f1817'],
].map(row => Object.freeze(row)));
export function createDatepickerHistoricalRead({ root, read }) {
  const entries = new Map(datepickerHistoricalSources.map(row => [path.resolve(root, row[0]), row]));
  const recovered = new Map();
  return (name, options) => {
    const kind = path.resolve(root, name) === path.resolve(root, 'scripts/run-material-input-audit.mjs') ? 'runner'
      : path.resolve(root, name) === path.resolve(root, 'scripts/export-material-input-audit-current-ancestry.mjs') ? 'launcher' : null;
    if (kind) {
      const input = read(name);
      const marker = kind === 'runner' ? 'const datepickerOpeningReaderFactory = ' : "const datepickerOpening = rawRequested.includes('--datepicker-opening');";
      if (!input.toString().includes(marker)) return read(name, options);
      const bytes = Buffer.from(restoreDatepickerOpeningSelection(input, kind));
      const encoding = typeof options === 'string' ? options : options?.encoding;
      return encoding ? bytes.toString(encoding) : bytes;
    }
    if (path.resolve(root, name) === path.resolve(root, 'tests/material-parity/input-equivalence-audit.mjs')) {
      const input = read(name);
      if (!input.toString().includes('"tests/material-parity/datepicker-opening-registration.mjs",')) return read(name, options);
      const bytes = Buffer.from(restoreDatepickerOpeningRegistry(input));
      const encoding = typeof options === 'string' ? options : options?.encoding;
      return encoding ? bytes.toString(encoding) : bytes;
    }
    const entry = entries.get(path.resolve(root, name));
    if (!entry) return read(name, options);
    const [file, previous, current] = entry;
    const source = normalize(read(name));
    // Earlier nested policy generations remain the earlier reader's job. Do
    // not reinterpret them as this transition or overwrite them with a newer one.
    if (file.endsWith('/input-equivalence-policy.mjs') && hash(source) !== previous &&
      !source.includes('fixture-datepicker-opening-focus-transfer-omitted')) return read(name, options);
    assert.ok([previous, current].includes(hash(source)), `Unrecognized datepicker source: ${file}`);
    if (!recovered.has(file)) {
      const old = normalize(execFileSync('git', ['show', `83b9ad89:${file}`], { cwd: root, maxBuffer: 8_000_000 }));
      assert.equal(hash(old), previous); recovered.set(file, old);
    }
    const bytes = Buffer.from(recovered.get(file));
    const encoding = typeof options === 'string' ? options : options?.encoding;
    return encoding ? bytes.toString(encoding) : bytes;
  };
}

export function createDatepickerOpeningReviewReader({ root, read }) {
  const prior = createSnackbarSingleOpenReviewReader({ root, read: createDatepickerHistoricalRead({ root, read }) });
  const joined = joinDatepickerOpening(JSON.parse(prior.read(prior.file)).review, read);
  assert.equal(joined.sha256, datepickerOpeningReview);
  const file = path.resolve(root, `artifacts/material-parity/working-audit/proposals/${joined.sha256}.json`);
  const bytes = Buffer.from(JSON.stringify({ status: 'proposal-not-canonical', sha256: joined.sha256, review: joined.review }));
  return { ...joined, file, read(name, options) {
    if (path.resolve(root, name) !== file) return prior.read(name, options);
    const encoding = typeof options === 'string' ? options : options?.encoding;
    return encoding ? bytes.toString(encoding) : Buffer.from(bytes);
  }, sourceApplicability: { mode: 'supplementary-datepicker-opening', predecessorApplicability: prior.sourceApplicability,
    boundary: 'Exact retained toggle observations and opening-input omission,not current rendering,input equivalence,full focus behavior or whole-case acceptance.' } };
}
