import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import path from 'node:path';

const hash = b => createHash('sha256').update(b).digest('hex');
const prior = '19dea13ed3eaf952b72171e12664ce180185aea863c52e187649c273f6782fc1';
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
