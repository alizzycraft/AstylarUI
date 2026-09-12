import assert from 'node:assert/strict';
import { constants as bufferConstants } from 'node:buffer';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import test from 'node:test';
import {
  assertMaterialInputAuditCurrent,
  decodeMaterialInputAudit,
  encodeMaterialInputAudit,
  materialInputAuditPayloadFile,
} from './input-audit-report-codec.mjs';

const fixture = () => ({
  schemaVersion: 3,
  summary: { inputEquivalent: false, unresolvedAttributions: 2 },
  elementInventory: {
    styles: [{ side: 'reference', value: { letterSpacing: '0.0001px', fontFamily: 'Roboto, Arial, sans-serif' } }],
    rules: [{ selector: '#page > .chip:hover', declarations: { transform: 'translate(1px) scale(0.5)' } }],
    variants: [{ nodes: [{ key: 'a', ownText: 'שלום 中文 🎨 \"\\\n', parent: null, style: 0 }] }],
    cases: [{ case: 'chips@light/desktop-dpr2/hover', variant: 0 }, { case: 'chips@light/desktop-dpr2/hover', variant: 0 }],
  },
  differences: [{ property: 'width', reference: 'auto', astylar: 0, classification: 'unresolved', evidence: [] }],
});
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const packageBytes = (bytes) => {
  const { manifest } = encodeMaterialInputAudit(fixture());
  const payload = gzipSync(bytes);
  return { payload, manifest: {
    ...manifest, compressedBytes: payload.length, compressedSha256: hash(payload),
    uncompressedBytes: bytes.length, uncompressedSha256: hash(bytes),
  } };
};

test('audit package round-trips every JSON value and is deterministic', () => {
  const original = fixture();
  const untouched = structuredClone(original);
  const first = encodeMaterialInputAudit(original);
  const second = encodeMaterialInputAudit(original);
  assert.deepEqual(first, second);
  assert.equal(first.manifest.payload, materialInputAuditPayloadFile);
  const decoded = decodeMaterialInputAudit(first.manifest, first.payload);
  assert.deepEqual(decoded.report, original);
  assert.equal(decoded.json, `${JSON.stringify(original)}\n`);
  assert.deepEqual(original, untouched);
  assertMaterialInputAuditCurrent(original, first.manifest, first.payload);
});

test('audit check rejects intact but stale detailed evidence, including unchanged summaries', () => {
  const expected = fixture();
  const mutations = [
    (r) => { r.elementInventory.styles[0].value.letterSpacing = '0px'; },
    (r) => { r.elementInventory.rules[0].declarations.transform = 'scale(0.5) translate(1px)'; },
    (r) => { r.elementInventory.variants[0].nodes[0].ownText = 'different'; },
    (r) => { r.elementInventory.cases.pop(); },
    (r) => { r.differences[0].classification = 'equivalent-representation'; },
    (r) => { r.differences[0].astylar = '0'; },
    (r) => { r.differences[0].evidence.push({ source: 'new' }); },
  ];
  for (const mutate of mutations) {
    const stale = fixture();
    mutate(stale);
    const { manifest, payload } = encodeMaterialInputAudit(stale);
    assert.deepEqual(stale.summary, expected.summary);
    assert.throws(() => assertMaterialInputAuditCurrent(expected, manifest, payload), /machine audit is stale/);
  }
});

test('audit package rejects missing, malformed, unknown and unsafe manifest fields', () => {
  const { manifest, payload } = encodeMaterialInputAudit(fixture());
  for (const missing of [null, undefined, [], {}]) {
    assert.throws(() => decodeMaterialInputAudit(missing, payload));
  }
  for (const key of Object.keys(manifest)) {
    const altered = { ...manifest };
    delete altered[key];
    assert.throws(() => decodeMaterialInputAudit(altered, payload), /manifest fields/);
  }
  const mutations = {
    format: ['other'], formatVersion: [0, 2], auditSchemaVersion: [2, '3', null],
    payload: ['../outside.gz', 'C:/outside.gz', 'another.json.gz'], encoding: ['utf-16'], compression: ['none'],
    compressedBytes: [0, -1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, payload.length + 1],
    uncompressedBytes: [0, -1, 0.5, NaN, Infinity, bufferConstants.MAX_STRING_LENGTH + 1, manifest.uncompressedBytes + 1],
    compressedSha256: ['', 'A'.repeat(64), '0'.repeat(64)],
    uncompressedSha256: ['', '0'.repeat(64)],
  };
  for (const [key, values] of Object.entries(mutations)) {
    for (const value of values) {
      assert.throws(() => decodeMaterialInputAudit({ ...manifest, [key]: value }, payload), `${key}: ${value}`);
    }
  }
  assert.throws(() => decodeMaterialInputAudit({ ...manifest, unknown: true }, payload), /manifest fields/);
});

test('audit package rejects truncated or corrupt bytes, even when compressed metadata is replaced', () => {
  const { manifest, payload } = encodeMaterialInputAudit(fixture());
  for (const missing of [undefined, null, payload.toString('base64')]) {
    assert.throws(() => decodeMaterialInputAudit(manifest, missing), /payload bytes/);
  }
  const corrupt = Buffer.from(payload);
  corrupt[corrupt.length - 8] ^= 0xff;
  for (const altered of [payload.subarray(0, payload.length - 1), corrupt, Buffer.from('not gzip')]) {
    assert.throws(() => decodeMaterialInputAudit(manifest, altered));
    assert.throws(() => decodeMaterialInputAudit({
      ...manifest, compressedBytes: altered.length, compressedSha256: hash(altered),
    }, altered));
  }
  assert.throws(() => decodeMaterialInputAudit({ ...manifest, uncompressedBytes: 10 }, payload));
});

test('audit package rejects non-JSON, invalid UTF-8, duplicate fields and noncanonical JSON', () => {
  for (const bytes of [
    Buffer.from('{broken'), Buffer.from([0xff, 0xfe, 0x7b]),
    Buffer.from('null\n'), Buffer.from('[]\n'), Buffer.from('{"schemaVersion":0}\n'),
    Buffer.from('{"schemaVersion":3,"schemaVersion":3}\n'),
    Buffer.from('{ "schemaVersion": 3 }\n'), Buffer.from('{"schemaVersion":3}'),
    Buffer.from('\ufeff{"schemaVersion":3}\n'),
  ]) {
    const { manifest, payload } = packageBytes(bytes);
    assert.throws(() => decodeMaterialInputAudit(manifest, payload));
  }
  for (const report of [null, [], {}, { schemaVersion: -1 }, { schemaVersion: '3' }]) {
    assert.throws(() => encodeMaterialInputAudit(report));
  }
});

test('audit package compresses repeated full evidence without deduplicating observations', () => {
  const report = fixture();
  report.observations = Array.from({ length: 2000 }, (_, index) => ({ index, evidence: fixture() }));
  const { manifest, payload } = encodeMaterialInputAudit(report);
  assert.ok(manifest.compressedBytes < manifest.uncompressedBytes / 10);
  assert.deepEqual(decodeMaterialInputAudit(manifest, payload).report, report);
});
