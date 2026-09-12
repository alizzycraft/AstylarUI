import assert from 'node:assert/strict';
import { constants as bufferConstants } from 'node:buffer';
import { createHash } from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';

export const materialInputAuditPayloadFile = 'material-input-equivalence-audit.json.gz';
const format = 'astylar-material-input-audit-gzip';
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const canonicalJson = (value) => `${JSON.stringify(value)}\n`;

function assertReport(report) {
  assert.ok(report && typeof report === 'object' && !Array.isArray(report), 'audit must be an object');
  assert.ok(Number.isSafeInteger(report.schemaVersion) && report.schemaVersion > 0, 'invalid audit schema version');
}

// Compression changes only the transport. Every inventory, rule, observation,
// classification and raw value remains in the ordinary JSON document.
export function encodeMaterialInputAudit(report) {
  assertReport(report);
  const json = canonicalJson(report);
  const bytes = Buffer.from(json, 'utf8');
  const payload = gzipSync(bytes, { level: 9 });
  const manifest = {
    format,
    formatVersion: 1,
    auditSchemaVersion: report.schemaVersion,
    payload: materialInputAuditPayloadFile,
    encoding: 'utf-8',
    compression: 'gzip',
    compressedBytes: payload.length,
    compressedSha256: sha256(payload),
    uncompressedBytes: bytes.length,
    uncompressedSha256: sha256(bytes),
  };
  return { manifest, payload };
}

export function decodeMaterialInputAudit(manifest, payload) {
  assert.ok(manifest && typeof manifest === 'object' && !Array.isArray(manifest), 'missing audit manifest');
  assert.deepEqual(Object.keys(manifest).sort(), [
    'format', 'formatVersion', 'auditSchemaVersion', 'payload', 'encoding', 'compression',
    'compressedBytes', 'compressedSha256', 'uncompressedBytes', 'uncompressedSha256',
  ].sort(), 'unexpected audit manifest fields');
  assert.equal(manifest.format, format, 'unknown audit package format');
  assert.equal(manifest.formatVersion, 1, 'unknown audit package version');
  // The reader must not follow arbitrary paths supplied by a manifest.
  assert.equal(manifest.payload, materialInputAuditPayloadFile, 'unexpected audit payload path');
  assert.equal(manifest.encoding, 'utf-8', 'unexpected audit encoding');
  assert.equal(manifest.compression, 'gzip', 'unexpected audit compression');
  for (const key of ['compressedBytes', 'uncompressedBytes']) {
    assert.ok(Number.isSafeInteger(manifest[key]) && manifest[key] > 0, `invalid ${key}`);
  }
  assert.ok(manifest.uncompressedBytes <= bufferConstants.MAX_STRING_LENGTH, 'audit exceeds the runtime JSON string limit');
  for (const key of ['compressedSha256', 'uncompressedSha256']) {
    assert.match(manifest[key] ?? '', /^[a-f0-9]{64}$/, `invalid ${key}`);
  }
  assert.ok(Buffer.isBuffer(payload), 'missing audit payload bytes');
  assert.equal(payload.length, manifest.compressedBytes, 'audit compressed length mismatch');
  assert.equal(sha256(payload), manifest.compressedSha256, 'audit compressed digest mismatch');
  const bytes = gunzipSync(payload, { maxOutputLength: manifest.uncompressedBytes });
  assert.equal(bytes.length, manifest.uncompressedBytes, 'audit uncompressed length mismatch');
  assert.equal(sha256(bytes), manifest.uncompressedSha256, 'audit uncompressed digest mismatch');
  const json = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
  const report = JSON.parse(json);
  assertReport(report);
  assert.equal(report.schemaVersion, manifest.auditSchemaVersion, 'audit schema version mismatch');
  // Avoid printing hundreds of megabytes in an assertion diff on failure.
  assert.ok(canonicalJson(report) === json, 'audit payload is not canonical JSON');
  return { report, json };
}

export function assertMaterialInputAuditCurrent(expectedReport, manifest, payload) {
  assertReport(expectedReport);
  const { json } = decodeMaterialInputAudit(manifest, payload);
  // Integrity alone is insufficient: compare the entire regenerated evidence,
  // not just a summary, coverage counter, or self-consistent stale digest.
  assert.ok(json === canonicalJson(expectedReport), 'checked-in machine audit is stale');
}
