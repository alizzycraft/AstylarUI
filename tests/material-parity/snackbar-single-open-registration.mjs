import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { createStepperBatchReviewReader } from './stepper-batch-registration.mjs';
import { joinSnackbarSingleOpen } from '../../scripts/join-material-snackbar-single-open.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const normalize = bytes => bytes.toString().replaceAll('\r\n', '\n');
const revision = '2ace4261ab98e51afa5192eebcc59a30d5e07043';
export const snackbarSingleOpenReview = 'bcc94f3deda38ea22fa475f239eb41e3797101b0b30f2eb58433fbef20b2826b';
export const snackbarSingleOpenSources = Object.freeze([
  'scripts/audit-material-snackbar-lifetime.mjs', 'scripts/join-material-snackbar-single-open.mjs',
  'tests/material-parity/snackbar-single-open-registration.mjs',
  'tests/material-parity/snackbar-single-open-registration.spec.mjs',
  'artifacts/material-parity/snackbar-single-open-20261027/latest-report.json',
]);
export const snackbarSingleOpenProofs = Object.freeze([
  ['tests/material-parity/snackbar-position-observation.spec.mjs', 'original snackbar auto-dismiss comparator does not witness the timed transition'],
  ['tests/material-parity/snackbar-position-observation.spec.mjs', 'supplementary single-open snackbar is present before expiry and absent afterwards'],
  ['tests/material-parity/snackbar-position-observation.spec.mjs', 'single-open coverage join preserves every other case and unresolved obligation'],
  ['tests/material-parity/static-semantic-inputs.spec.mjs', 'October27 historical semantic population preserves every prior definition'],
  ['tests/material-parity/snackbar-single-open-registration.spec.mjs', 'snackbar historical reader authenticates all five source transitions without changing live inputs'],
  ['tests/material-parity/snackbar-single-open-registration.spec.mjs', 'staged snackbar registration preserves every accepted source and proof'],
]);
const producerPrior = 'a002e989cf9d586e815e91783d729e863c4c9c7fc144933253d8b45ab5168251';
const boundary = 'Retained supplementary visibility and historical evidence reconciliation; not exact expiry timing, current rendering, input equivalence or case closure.';
const additions = [
  ['function sourceFingerprints(root) {\n  const files = [\n', snackbarSingleOpenSources.map(file => `    ${JSON.stringify(file)},\n`).join('')],
  ['function focusedProofInventory(root) {\n  return [\n', snackbarSingleOpenProofs.map(([file, title]) =>
    `    proof(root, ${JSON.stringify(file)}, new RegExp(${JSON.stringify("test\\('" + title + "'")}), ${JSON.stringify(title)}, ${JSON.stringify(boundary)}),\n`).join('')],
];
export function prepareSnackbarSingleOpenRegistry(bytes) {
  let source = normalize(bytes); assert.equal(hash(source), producerPrior);
  for (const [anchor, extra] of additions) {
    assert.equal(source.split(anchor).length, 2); source = source.replace(anchor, anchor + extra);
  }
  return source;
}
export function restoreSnackbarSingleOpenRegistry(bytes) {
  let source = normalize(bytes);
  for (const [anchor, extra] of additions.toReversed()) {
    assert.equal(source.split(anchor + extra).length, 2); source = source.replace(anchor + extra, anchor);
  }
  assert.equal(hash(source), producerPrior); return source;
}
export const snackbarHistoricalSources = Object.freeze([
  ['scripts/audit-material-snackbar-lifetime.mjs', 'ca8d9552d3dd819b43127a76c9d88fc746c2b2846d663c2312272fd2efc8327b', 'dab25c42bfad778b5d5b5dbd43b56cf87be52cdb255bfd199dfaee6c438c397e'],
  ['tests/material-parity/benchmark-config.spec.mjs', 'd4102f705bf61418286a18932697a5ab95a2e4bb507d237fe3b61bc6914c62ce', 'f383821eef926747bd1de6ce675a858e0a3f75ff170e3c00cce81a77427b86e7'],
  ['tests/material-parity/snackbar-position-observation.spec.mjs', 'b36d490178f22260e4ce7c10ca5852851d8a34ea7fb72e101f7e53ba6f006a75', '0fb3a5d539573fcc0dfc6e2f46069ff04630545109e988b7016ed6376202872b'],
  ['tests/material-parity/static-semantic-inputs.spec.mjs', '5956ef3b19b884fc8448934314888a10be4a5c74ce815b2f2e22562931c6eca7', '493acd7c7361e441786daaec9e606be99a6cdcae349a2675c3cb143a48e692d8'],
  ['tests/material-parity/static-semantic-registration.mjs', 'e733c6663e42dc4f20e236d0d9f8e293ab8821e5a081c0dd14d3a05d2bdd9a30', '0afade3ee2f243a740ecce32935365ad580f6d2538cce4bcba730e99b222b502'],
].map(row => Object.freeze(row)));

// Historical evidence only: never substitute these bytes for current rendering.
// Both endpoints are authenticated; unknown live edits fail closed.
export function createSnackbarHistoricalRead({ root, read }) {
  const entries = new Map(snackbarHistoricalSources.map(row => [path.resolve(root, row[0]), row]));
  const recovered = new Map();
  return (name, options) => {
    const entry = entries.get(path.resolve(root, name));
    if (!entry) return read(name, options);
    const [file, previous, current] = entry;
    const source = normalize(read(name));
    assert.ok([previous, current].includes(hash(source)), `Unrecognized snackbar source: ${file}`);
    let historical = source;
    if (hash(source) !== previous) {
      if (!recovered.has(file)) {
        const bytes = normalize(execFileSync('git', ['show', `${revision}:${file}`], { cwd: root, maxBuffer: 8_000_000 }));
        assert.equal(hash(bytes), previous, `Historical source mismatch: ${file}`);
        recovered.set(file, bytes);
      }
      historical = recovered.get(file);
    }
    const encoding = typeof options === 'string' ? options : options?.encoding;
    return encoding ? Buffer.from(historical).toString(encoding) : Buffer.from(historical);
  };
}

export function createSnackbarSingleOpenReviewReader({ root, read }) {
  const prior = createStepperBatchReviewReader({ root, read: createSnackbarHistoricalRead({ root, read }) });
  const joined = joinSnackbarSingleOpen(JSON.parse(prior.read(prior.file)).review, read);
  assert.equal(joined.sha256, snackbarSingleOpenReview);
  const file = path.resolve(root, `artifacts/material-parity/working-audit/proposals/${joined.sha256}.json`);
  const bytes = Buffer.from(JSON.stringify({ status: 'proposal-not-canonical', sha256: joined.sha256, review: joined.review }));
  return { ...joined, file, read(name, options) {
    if (path.resolve(root, name) !== file) return prior.read(name, options);
    const encoding = typeof options === 'string' ? options : options?.encoding;
    return encoding ? bytes.toString(encoding) : Buffer.from(bytes);
  }, sourceApplicability: { mode: 'supplementary-snackbar-single-open', predecessorApplicability: prior.sourceApplicability,
    boundary: 'Exact retained historical source reconstruction plus supplementary ordinary-mode visibility sequence. Not historical timing reconstruction, current-library rendering, input equivalence or whole-case acceptance.' } };
}
