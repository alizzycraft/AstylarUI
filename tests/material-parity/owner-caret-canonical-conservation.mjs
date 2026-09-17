import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import { createGunzip } from 'node:zlib';
import { isDeepStrictEqual } from 'node:util';
import Parser from 'jsonparse';
import { ownerCaretAttributions } from './owner-caret-classification.mjs';
import { validateOwnerCaretAttributionRows } from './owner-caret-attribution-coverage.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const digest = value => hash(JSON.stringify(value));
const same = (a, b, message) => assert.ok(isDeepStrictEqual(a, b), message);
const flags = ['inputEquivalent', 'computedCandidateVerified', 'descendantCaretVerified',
  'renderingEquivalent', 'rendererCauseProven', 'wholeElementInputEquivalent'];
const classificationFields = new Set(['classification', 'attribution', 'justification',
  'recommendedOwner', 'reviewEvidence', 'reviewedCases']);

// Read all payload bytes, authenticating compressed and uncompressed receipts.
// Retain complete discrepancy rows, not the multi-gigabyte inspection ledgers.
// Source/capture authenticity is an additional caller obligation, not inferred
// from a self-consistent current manifest.
export async function readCaretConservationRows(read) {
  const manifest = JSON.parse(read('docs/material-input-equivalence-audit.json'));
  same(Object.keys(manifest).sort(), ['format', 'formatVersion', 'auditSchemaVersion', 'payload', 'encoding',
    'compression', 'compressedBytes', 'compressedSha256', 'uncompressedBytes', 'uncompressedSha256'].sort(), 'manifest fields');
  assert.equal(manifest.format, 'astylar-material-input-audit-gzip');
  assert.equal(manifest.formatVersion, 1); assert.equal(manifest.encoding, 'utf-8');
  assert.equal(manifest.compression, 'gzip');
  assert.ok(Number.isSafeInteger(manifest.auditSchemaVersion) && manifest.auditSchemaVersion > 0, 'invalid schema version');
  assert.equal(manifest.payload, 'material-input-equivalence-audit.json.gz');
  const bytes = read('docs/' + manifest.payload);
  assert.equal(bytes.length, manifest.compressedBytes, 'compressed length');
  assert.equal(hash(bytes), manifest.compressedSha256, 'compressed digest');
  const rows = [], parser = new Parser(), payloadHash = createHash('sha256');
  let length = 0, arrays = 0, roots = 0, schemas = 0;
  parser.onValue = function(value) {
    const top = this.stack[1]?.key ?? (this.stack.length === 1 ? this.key : undefined);
    if (this.stack.length === 2 && top === 'discrepancies') {
      assert.ok(value && typeof value === 'object' && !Array.isArray(value), 'invalid discrepancy row');
      rows.push(value); delete this.value[this.key];
    } else if (this.stack.length === 1) {
      if (this.key === 'discrepancies') { assert.ok(Array.isArray(value)); arrays++; }
      if (this.key === 'schemaVersion') { assert.equal(value, manifest.auditSchemaVersion); schemas++; }
      delete this.value[this.key];
    } else if (this.stack.length === 0) roots++;
    else if (this.value && top !== 'discrepancies') delete this.value[this.key];
  };
  for await (const chunk of Readable.from([bytes]).pipe(createGunzip())) {
    payloadHash.update(chunk); length += chunk.length; parser.write(chunk);
  }
  assert.equal(length, manifest.uncompressedBytes, 'uncompressed length');
  assert.equal(payloadHash.digest('hex'), manifest.uncompressedSha256, 'uncompressed digest');
  same([roots, schemas, arrays, parser.stack.length], [1, 1, 1, 0], 'incomplete or duplicate audit document');
  return { manifest, rows };
}

// `expected` must come from the complete authenticated original-source caret
// collector. This function never derives expected membership from current rows.
export function conserveOwnerCaretCanonicalRows(previous, current, expected) {
  assert.ok(expected.rows.length > 0, 'missing independently reviewed population');
  assert.equal(expected.reviewedGroups, expected.rows.length);
  assert.equal(expected.reviewedObservations, expected.rows.reduce((n, r) => n + r.occurrences, 0));
  assert.equal(expected.pendingGroups, expected.pending.length);
  assert.equal(expected.pendingObservations, expected.pending.reduce((n, r) => n + r.occurrences, 0));
  assert.equal(expected.inputEquivalent, false); assert.equal(expected.renderingEquivalent, false);
  assert.equal(validateOwnerCaretAttributionRows(expected, current).length, 0,
    'current canonical caret rows differ from complete authenticated source coverage');
  assert.equal(current.length, previous.length, 'canonical row count changed');
  const changed = [], unchanged = [], categories = {};
  const withoutClassification = row => Object.fromEntries(Object.entries(row).filter(([key]) => !classificationFields.has(key)));
  for (let i = 0; i < previous.length; i++) {
    const a = previous[i], b = current[i];
    if (isDeepStrictEqual(a, b)) { unchanged.push(digest(b)); continue; }
    same(withoutClassification(a), withoutClassification(b), `raw or authored canonical row changed at ${i}`);
    assert.equal(a.attribution, 'unresolved', `previous classification replaced at ${i}`);
    assert.equal(b.property, 'caretColor');
    assert.ok(Object.values(ownerCaretAttributions).includes(b.attribution), `unrelated row changed at ${i}`);
    assert.equal(b.classification, 'parity-harness-defect');
    for (const flag of flags) assert.equal(b.reviewEvidence[flag], false, flag);
    categories[b.attribution] ??= { groups: 0, observations: 0 };
    categories[b.attribution].groups++; categories[b.attribution].observations += b.occurrences;
    changed.push({ family: b.family, element: b.element, property: b.property, reference: b.reference,
      occurrences: b.occurrences, attribution: b.attribution,
      previousRowSha256: digest(a), currentRowSha256: digest(b) });
  }
  assert.equal(changed.length, expected.rows.length, 'not every reviewed row is a new bounded attribution');
  assert.equal(changed.reduce((n, r) => n + r.occurrences, 0), expected.reviewedObservations);
  for (const pending of expected.pending) {
    const matches = current.filter(r => r.family === pending.family && r.element === pending.element &&
      r.property === pending.property && r.reference === pending.reference && !Object.hasOwn(r, 'astylar'));
    assert.equal(matches.length, 1, 'pending canonical group missing or duplicated');
    assert.equal(matches[0].attribution, 'unresolved', 'pending canonical group promoted');
    for (const key of ['occurrences', 'cases', 'states']) same(matches[0][key], pending[key], `pending ${key} changed`);
  }
  return { scalarRows: current.length, observations: current.reduce((n, r) => n + r.occurrences, 0),
    changedRows: changed.length, changedObservations: expected.reviewedObservations,
    unchangedCompleteRows: unchanged.length, unchangedOrderedRowDigestsSha256: digest(unchanged), categories, changes: changed,
    previousUnresolved: previous.filter(r => r.attribution === 'unresolved').length,
    currentUnresolved: current.filter(r => r.attribution === 'unresolved').length,
    pendingGroups: expected.pendingGroups, pendingObservations: expected.pendingObservations,
    inputEquivalent: false, renderingEquivalent: false };
}
