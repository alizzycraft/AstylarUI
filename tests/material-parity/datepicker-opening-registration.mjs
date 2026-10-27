import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const normalize = bytes => bytes.toString().replaceAll('\r\n', '\n');
const predecessor = 'af9301fa47e362d9ea9071f6ec274a57d4c371b720a56586eb718aa4e61f30c6';
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

export const datepickerHistoricalSources = Object.freeze([
  ['tests/material-parity/input-equivalence-policy.mjs', 'a38dc20ab17b392fcd1eeac4e8ff693859c3dbfaf4395ae0e0a782326bd72a6c', '7381e8fba08553caec77947e88ce5246e1c3fc01a6da18b81f3c07ea945a336f'],
  ['tests/material-parity/original-material-runner-source.spec.mjs', 'd362fd02e63c5a135d7688377281eb4ef88505cd13f7cd5ff34c629cbff7260e', '528806a405fa93abde36314484aa3287c2174660b019ab7b8d64cece6348f398'],
  ['tests/material-parity/snackbar-single-open-registration.mjs', '0820b53f0ba80015faa853953ec824ed5f3fa480d8edd9404dce674d2e7c7d9a', '854992b5da3ca4d16a7f230d203aac5aaee1db2a3754150cc9c7a9a2213ba668'],
  ['tests/material-parity/snackbar-single-open-registration.spec.mjs', '45a8e79222589ef10b1b309704229a9ef5fc6e20e70f2c1869ffbfefe2ee288a', '1fd52788e1e36bb7c2b476529952d262f7c60da7bc8a5a0061432e80291f1817'],
].map(row => Object.freeze(row)));
export function createDatepickerHistoricalRead({ root, read }) {
  const entries = new Map(datepickerHistoricalSources.map(row => [path.resolve(root, row[0]), row]));
  const recovered = new Map();
  return (name, options) => {
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
