import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { Readable, Transform, Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createGzip, createGunzip } from 'node:zlib';
import { materialInputAuditPayloadFile } from './input-audit-report-codec.mjs';

const format = 'astylar-material-input-audit-gzip';
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
function assertReport(report) {
  assert.ok(report && typeof report === 'object' && !Array.isArray(report), 'audit must be an object');
  assert.ok(Number.isSafeInteger(report.schemaVersion) && report.schemaVersion > 0, 'invalid audit schema version');
}

// Serialize the audit's plain data graph in native JSON property/array order.
// Omitted object values and null array slots follow JSON.stringify semantics.
// Container strings are never constructed. Memory is bounded by a chunk plus
// the largest individual encoded leaf, not the complete evidence document.
export function* materialAuditJsonChunks(report, chunkCodeUnits = 65536) {
  assertReport(report);
  assert.ok(Number.isSafeInteger(chunkCodeUnits) && chunkCodeUnits > 0, 'invalid JSON chunk size');
  const ancestors = new Set();
  const omitted = (value) => value === undefined || typeof value === 'function' || typeof value === 'symbol';
  function* valueTokens(value) {
    if (value === null || typeof value !== 'object') {
      yield JSON.stringify(value);
      return;
    }
    assert.ok(!ancestors.has(value), 'cyclic audit data');
    const array = Array.isArray(value);
    assert.ok(array || Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null,
      'audit streaming requires plain JSON data, not custom objects');
    assert.ok(typeof value.toJSON !== 'function', 'audit streaming does not invoke custom toJSON');
    ancestors.add(value);
    try {
      yield array ? '[' : '{';
      let first = true;
      const keys = array ? Array.from({ length: value.length }, (_, index) => String(index)) : Object.keys(value);
      for (const key of keys) {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        assert.ok(!descriptor || Object.hasOwn(descriptor, 'value'), 'audit streaming requires data properties');
        const child = value[key];
        if (!array && omitted(child)) continue;
        if (!first) yield ',';
        first = false;
        if (!array) yield `${JSON.stringify(key)}:`;
        if (array && omitted(child)) yield 'null';
        else yield* valueTokens(child);
      }
      yield array ? ']' : '}';
    } finally {
      ancestors.delete(value);
    }
  }
  let parts = [], length = 0;
  for (const token of valueTokens(report)) {
    parts.push(token);
    length += token.length;
    if (length >= chunkCodeUnits) {
      yield Buffer.from(parts.join(''), 'utf8');
      parts = []; length = 0;
    }
  }
  parts.push('\n');
  yield Buffer.from(parts.join(''), 'utf8');
}

// The package remains format v1: gzip of ordinary canonical JSON, not a new
// framing format, summary, deduplicated graph or sampled evidence subset.
export async function encodeMaterialInputAuditStream(report) {
  assertReport(report);
  const hash = createHash('sha256');
  let uncompressedBytes = 0;
  const compressed = [];
  await pipeline(
    Readable.from(materialAuditJsonChunks(report)),
    new Transform({ transform(bytes, _encoding, callback) {
      uncompressedBytes += bytes.length;
      hash.update(bytes);
      callback(null, bytes);
    } }),
    createGzip({ level: 9 }),
    new Writable({ write(bytes, _encoding, callback) { compressed.push(bytes); callback(); } }),
  );
  const payload = Buffer.concat(compressed);
  return { payload, manifest: {
    format, formatVersion: 1, auditSchemaVersion: report.schemaVersion,
    payload: materialInputAuditPayloadFile, encoding: 'utf-8', compression: 'gzip',
    compressedBytes: payload.length, compressedSha256: digest(payload),
    uncompressedBytes, uncompressedSha256: hash.digest('hex'),
  } };
}

function validateManifest(manifest, payload) {
  assert.ok(manifest && typeof manifest === 'object' && !Array.isArray(manifest), 'missing audit manifest');
  assert.deepEqual(Object.keys(manifest).sort(), [
    'format', 'formatVersion', 'auditSchemaVersion', 'payload', 'encoding', 'compression',
    'compressedBytes', 'compressedSha256', 'uncompressedBytes', 'uncompressedSha256',
  ].sort(), 'unexpected audit manifest fields');
  assert.equal(manifest.format, format, 'unknown audit package format');
  assert.equal(manifest.formatVersion, 1, 'unknown audit package version');
  assert.equal(manifest.payload, materialInputAuditPayloadFile, 'unexpected audit payload path');
  assert.equal(manifest.encoding, 'utf-8', 'unexpected audit encoding');
  assert.equal(manifest.compression, 'gzip', 'unexpected audit compression');
  for (const key of ['compressedBytes', 'uncompressedBytes', 'auditSchemaVersion'])
    assert.ok(Number.isSafeInteger(manifest[key]) && manifest[key] > 0, `invalid ${key}`);
  for (const key of ['compressedSha256', 'uncompressedSha256'])
    assert.match(manifest[key] ?? '', /^[a-f0-9]{64}$/, `invalid ${key}`);
  assert.ok(Buffer.isBuffer(payload), 'missing audit payload bytes');
  assert.equal(payload.length, manifest.compressedBytes, 'audit compressed length mismatch');
  assert.equal(digest(payload), manifest.compressedSha256, 'audit compressed digest mismatch');
}

// Regeneration supplies the expected canonical document, so verification needs
// no second JSON parser or complete decoded object/string. Compare every byte,
// including nesting, duplicate observations and order; hashes are additional
// transport checks, never substitutes for complete evidence comparison.
export async function assertMaterialInputAuditCurrentStream(expectedReport, manifest, payload) {
  assertReport(expectedReport);
  validateManifest(manifest, payload);
  assert.equal(manifest.auditSchemaVersion, expectedReport.schemaVersion, 'audit schema version mismatch');
  const expected = materialAuditJsonChunks(expectedReport);
  let next = expected.next(), offset = 0, length = 0;
  const hash = createHash('sha256');
  const decoded = Readable.from([payload]).pipe(createGunzip());
  try {
    for await (const bytes of decoded) {
      length += bytes.length;
      assert.ok(length <= manifest.uncompressedBytes, 'audit exceeds declared uncompressed length');
      hash.update(bytes);
      let position = 0;
      while (position < bytes.length) {
        assert.ok(!next.done, 'checked-in machine audit is stale');
        const count = Math.min(bytes.length - position, next.value.length - offset);
        assert.ok(bytes.subarray(position, position + count).equals(next.value.subarray(offset, offset + count)),
          'checked-in machine audit is stale');
        position += count; offset += count;
        if (offset === next.value.length) { next = expected.next(); offset = 0; }
      }
    }
    assert.equal(length, manifest.uncompressedBytes, 'audit uncompressed length mismatch');
    assert.equal(hash.digest('hex'), manifest.uncompressedSha256, 'audit uncompressed digest mismatch');
    assert.ok(next.done, 'checked-in machine audit is stale');
  } finally {
    decoded.destroy();
    expected.return();
  }
}
