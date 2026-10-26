// Exact registration delta only; this is not a replacement audit reader.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import path from 'node:path';
import {createChipsAlternatePriorRead,restoreChipsAlternateRegistrationIfPresent,restoreChipsAlternateSharedSourceIfPresent} from './chips-alternate-registration.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const normalize = value => value.toString().replaceAll('\r\n', '\n');
const once = (source, before, after) => {
  assert.equal(source.split(before).length, 2); return source.replace(before, after);
};
const producerPrior = '58ef02255929abc8ff050ec922de31f5120e2a038fec034e95e49c1052843527';
const directory = 'artifacts/material-parity/public-absolute-margins-20261026';
export const dividerMarginSources = [
  'tests/material-parity/divider-margin-registration.mjs',
  'scripts/audit-public-absolute-margins.mjs',
  'tests/material-parity/absolute-margin-top-evidence.spec.mjs',
  'tests/material-parity/divider-visible-input-boundary.spec.mjs',
  `${directory}/latest-report.json`, `${directory}/capture-result.txt`,
  'artifacts/material-parity/icon-fresh-producer-retained-build-20261016-browser/chunk-3JXWRYJY.js',
  'artifacts/material-parity/icon-fresh-producer-retained-build-20261016-browser/chunk-3JXWRYJY.js.map',
];
export const dividerMarginProofs = [
  ['tests/material-parity/absolute-margin-top-evidence.spec.mjs', 'pending Divider margin registry preserves every accepted source and proof declaration'],
  ['tests/material-parity/absolute-margin-top-evidence.spec.mjs', 'retained Divider paragraph positioning is not the equal-input absolute-top reduction'],
  ['tests/material-parity/absolute-margin-top-evidence.spec.mjs', 'absolute top margin evidence preserves failing pixel controls and equal em requests'],
  ['tests/material-parity/absolute-margin-top-evidence.spec.mjs', 'complete current absolute positioning and margin methods match captured installed owner'],
  ['tests/material-parity/divider-visible-input-boundary.spec.mjs', 'retained Divider visible inputs stay distinct from omitted candidate visibility'],
];
const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const boundary = 'Bounded original paragraph handoff/dimension replay, public absolute-margin failure and raw visibility omission;not equivalent Material flow,current rendering or whole-case acceptance.';
const additions = [
  ['function sourceFingerprints(root) {\n  const files = [\n', dividerMarginSources.map(file => `    ${JSON.stringify(file)},\n`).join('')],
  ['function focusedProofInventory(root) {\n  return [\n', dividerMarginProofs.map(([file, title]) =>
    `    proof(root, ${JSON.stringify(file)}, new RegExp(${JSON.stringify("test\\('" + escape(title) + "'")}),\n      ${JSON.stringify(title)}, ${JSON.stringify(boundary)}),\n`).join('')],
];
export function prepareDividerMarginRegistry(bytes) {
  let source = normalize(bytes); assert.equal(hash(source), producerPrior);
  for (const [anchor, prefix] of additions) source = once(source, anchor, anchor + prefix);
  return source;
}
export function restoreDividerMarginRegistry(bytes) {
  bytes = restoreChipsAlternateRegistrationIfPresent(bytes, 'producer');
  let source = normalize(bytes);
  if (hash(source) === producerPrior) return source;
  for (const [anchor, prefix] of additions.toReversed()) source = once(source, anchor + prefix, anchor);
  assert.equal(hash(source), producerPrior, 'Exact pre-margin producer must recover');
  return source;
}
export function restoreDividerMarginRegistryIfPresent(bytes) {
  const source = normalize(bytes);
  return source.includes('    "tests/material-parity/divider-margin-registration.mjs",\n')
    ? restoreDividerMarginRegistry(source) : source;
}
const shared = {
  'tests/material-parity/public-tab-selection-finding.mjs': {
    prior: '0c676443e5da07edf35bd68cdbc63108f3314f27e4ab2a353120011b4bf84455',
    changes: [
      ["import path from 'node:path';", "import path from 'node:path';\nimport {createDividerMarginPriorRead,restoreDividerMarginRegistryIfPresent} from './divider-margin-registration.mjs';"],
      ['export function createFocusSelectionAuditPriorRead({root,read}){', 'export function createFocusSelectionAuditPriorRead({root,read}){\n  read=createDividerMarginPriorRead({root,read});'],
      ['for(const [anchor,prefix]of additions[kind].toReversed())source=once(source,anchor+prefix,anchor);', "if(kind==='producer')source=restoreDividerMarginRegistryIfPresent(source);\n  for(const [anchor,prefix]of additions[kind].toReversed())source=once(source,anchor+prefix,anchor);"],
    ],
  },
  'tests/material-parity/public-email-selection.spec.mjs': {
    prior: 'af6efcc92fb4811cdd501d71cebb8947114344fd4417c711a0c68ce6e137999b',
    changes: [
      ["import ts from 'typescript';", "import ts from 'typescript';\nimport {restoreDividerMarginRegistry} from './divider-margin-registration.mjs';"],
      ["const live=readFileSync(file,'utf8').replaceAll('\\r\\n','\\n');raw[kind]=acceptedRead(file,'utf8');staged[kind]=prepare(raw[kind],kind,readFileSync);", "const rawLive=readFileSync(file,'utf8').replaceAll('\\r\\n','\\n');const live=kind==='producer'?restoreDividerMarginRegistry(rawLive):rawLive;raw[kind]=acceptedRead(file,'utf8');staged[kind]=prepare(raw[kind],kind,readFileSync);"],
      ["assert.equal(restore(staged[kind],kind),raw[kind]);assert.equal(readFileSync(file,'utf8').replaceAll('\\r\\n','\\n'),live);", "assert.equal(restore(staged[kind],kind),raw[kind]);assert.equal(readFileSync(file,'utf8').replaceAll('\\r\\n','\\n'),rawLive);"],
    ],
  },
};
export function prepareDividerMarginSharedSource(bytes, file) {
  const entry = shared[file]; assert.ok(entry);
  let source = normalize(bytes); assert.equal(hash(source), entry.prior);
  for (const [before, after] of entry.changes) source = once(source, before, after);
  return source;
}
export function restoreDividerMarginSharedSource(bytes, file) {
  bytes = restoreChipsAlternateSharedSourceIfPresent(bytes, file);
  const entry = shared[file]; assert.ok(entry);
  let source = normalize(bytes); if (hash(source) === entry.prior) return source;
  for (const [before, after] of entry.changes.toReversed()) source = once(source, after, before);
  assert.equal(hash(source), entry.prior, 'Exact pre-margin shared source must recover');
  return source;
}
export function createDividerMarginPriorRead({root, read}) {
  read = createChipsAlternatePriorRead({root, read});
  const producer = path.resolve(root, 'tests/material-parity/input-equivalence-audit.mjs');
  const files = new Map(Object.keys(shared).map(file => [path.resolve(root, file), file]));
  return (name, options) => {
    const absolute = path.resolve(root, name), file = files.get(absolute);
    if (absolute !== producer && !file) return read(name, options);
    const bytes = read(name), current = normalize(bytes);
    // Nested historical readers can already have restored an older generation.
    // Only reverse this delta when its exact marker is present; older bytes
    // pass unchanged to their existing generation-specific hash validators.
    const present = absolute === producer
      ? current.includes('    "tests/material-parity/divider-margin-registration.mjs",\n')
      : current.includes("from './divider-margin-registration.mjs';");
    if (!present) return read(name, options);
    const source = absolute === producer ? restoreDividerMarginRegistry(bytes)
      : restoreDividerMarginSharedSource(bytes, file);
    const encoding = typeof options === 'string' ? options : options?.encoding;
    return encoding ? Buffer.from(source).toString(encoding) : Buffer.from(source);
  };
}
