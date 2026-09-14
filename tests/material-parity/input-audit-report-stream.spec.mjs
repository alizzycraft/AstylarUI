import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';
import test from 'node:test';
import { encodeMaterialInputAudit, decodeMaterialInputAudit } from './input-audit-report-codec.mjs';
import {
  materialAuditJsonChunks, encodeMaterialInputAuditStream, assertMaterialInputAuditCurrentStream,
} from './input-audit-report-stream.mjs';

const fixture = () => ({ schemaVersion: 3, summary: { inputEquivalent: false },
  evidence: [{ text: 'שלום 中文 🎨 "\\\n\ud800', values: [null, true, false, -0, 1e30, 0.000001, undefined] },
    { raw: '0px', resolved: 0, missing: undefined }],
});
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const packageBytes = (bytes) => {
  const { manifest } = encodeMaterialInputAudit(fixture());
  const payload = gzipSync(bytes);
  return { payload, manifest: { ...manifest, compressedBytes: payload.length, compressedSha256: hash(payload),
    uncompressedBytes: bytes.length, uncompressedSha256: hash(bytes) } };
};

test('streamed audit JSON matches native serialization across chunk and Unicode boundaries', () => {
  const report = fixture();
  report.evidence.push(JSON.parse('{"__proto__":{"safe":true},"constructor":"literal","2":2,"1":1}'));
  report.empty = {}; report.array = []; report.sparse = Array(3);
  report.numbers = [NaN, Infinity, -Infinity, 1000000000000000100];
  report.repeat = report.evidence[0];
  const expected = Buffer.from(`${JSON.stringify(report)}\n`);
  for (const size of [1, 2, 3, 7, 64, 65536]) {
    assert.deepEqual(Buffer.concat([...materialAuditJsonChunks(report, size)]), expected);
  }
  assert.equal({}.safe, undefined);
});

test('streamed audit packaging retains format v1 and is deterministic and legacy-readable', async () => {
  const original = fixture(), untouched = structuredClone(original);
  const first = await encodeMaterialInputAuditStream(original);
  assert.deepEqual(await encodeMaterialInputAuditStream(original), first);
  assert.deepEqual(first, encodeMaterialInputAudit(original));
  assert.deepEqual(decodeMaterialInputAudit(first.manifest, first.payload).report, JSON.parse(JSON.stringify(original)));
  assert.deepEqual(gunzipSync(first.payload), Buffer.from(`${JSON.stringify(original)}\n`));
  await assertMaterialInputAuditCurrentStream(original, first.manifest, first.payload);
  assert.deepEqual(original, untouched);
});

test('streamed audit avoids aggregate stringify for encoding and exact-byte checking', async () => {
  const report = fixture();
  report.observations = Array.from({ length: 2000 }, (_, index) => ({ index, evidence: fixture() }));
  const expected = Buffer.from(`${JSON.stringify(report)}\n`);
  const native = JSON.stringify;
  JSON.stringify = (value, ...args) => {
    if (value && typeof value === 'object') throw new RangeError('aggregate JSON string boundary');
    return native(value, ...args);
  };
  try {
    assert.throws(() => encodeMaterialInputAudit(report), /aggregate JSON string boundary/);
    const { manifest, payload } = await encodeMaterialInputAuditStream(report);
    assert.equal(manifest.uncompressedBytes, expected.length);
    assert.equal(manifest.uncompressedSha256, hash(expected));
    assert.deepEqual(gunzipSync(payload), expected);
    await assertMaterialInputAuditCurrentStream(report, manifest, payload);
  } finally { JSON.stringify = native; }
});

test('streamed exact-byte check rejects same-summary mutations anywhere and observation order changes', async () => {
  const original = fixture();
  original.observations = Array.from({ length: 1000 }, (_, index) => ({ index, evidence: fixture() }));
  for (const mutate of [
    (r) => { r.observations[0].evidence.evidence[0].text = 'changed'; },
    (r) => { r.observations[500].index = -1; },
    (r) => { r.observations[999].evidence.evidence[1].raw = 0; },
    (r) => { r.observations.reverse(); }, (r) => { r.observations.pop(); },
    (r) => { r.observations.push(r.observations[0]); },
  ]) {
    const altered = structuredClone(original); mutate(altered);
    assert.deepEqual(altered.summary, original.summary);
    const { manifest, payload } = await encodeMaterialInputAuditStream(altered);
    await assert.rejects(assertMaterialInputAuditCurrentStream(original, manifest, payload), /machine audit is stale/);
  }
});

test('streamed audit rejects unsafe manifest fields and all length or digest mismatches', async () => {
  const report = fixture(), { manifest, payload } = await encodeMaterialInputAuditStream(report);
  for (const missing of [null, undefined, [], {}])
    await assert.rejects(assertMaterialInputAuditCurrentStream(report, missing, payload));
  for (const key of Object.keys(manifest)) {
    const altered = { ...manifest }; delete altered[key];
    await assert.rejects(assertMaterialInputAuditCurrentStream(report, altered, payload), /manifest fields/);
  }
  const mutations = {
    format: ['other'], formatVersion: [0, 2], auditSchemaVersion: [2, '3', null],
    payload: ['../outside.gz', 'C:/outside.gz', 'another.json.gz'], encoding: ['utf-16'], compression: ['none'],
    compressedBytes: [0, -1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, payload.length + 1],
    uncompressedBytes: [0, -1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, manifest.uncompressedBytes + 1, 10],
    compressedSha256: ['', 'A'.repeat(64), '0'.repeat(64)], uncompressedSha256: ['', '0'.repeat(64)],
  };
  for (const [key, values] of Object.entries(mutations)) for (const value of values)
    await assert.rejects(assertMaterialInputAuditCurrentStream(report, { ...manifest, [key]: value }, payload), `${key}: ${value}`);
  await assert.rejects(assertMaterialInputAuditCurrentStream(report, { ...manifest, unknown: true }, payload));
  for (const missing of [null, undefined, payload.toString('base64')])
    await assert.rejects(assertMaterialInputAuditCurrentStream(report, manifest, missing), /payload bytes/);
});

test('streamed audit rejects corrupt gzip, invalid JSON and noncanonical bytes with self-consistent metadata', async () => {
  const report = fixture(), { manifest, payload } = await encodeMaterialInputAuditStream(report);
  const corrupt = Buffer.from(payload); corrupt[corrupt.length - 8] ^= 0xff;
  for (const changed of [corrupt, payload.subarray(0, payload.length - 1), Buffer.from('not gzip')]) {
    await assert.rejects(assertMaterialInputAuditCurrentStream(report, manifest, changed));
    await assert.rejects(assertMaterialInputAuditCurrentStream(report, {
      ...manifest, compressedBytes: changed.length, compressedSha256: hash(changed),
    }, changed));
  }
  const canonical = `${JSON.stringify(report)}\n`;
  for (const bytes of [Buffer.from('{broken'), Buffer.from([0xff, 0xfe, 0x7b]),
    Buffer.from('null\n'), Buffer.from('[]\n'), Buffer.from('{"schemaVersion":0}\n'),
    Buffer.from(canonical.replace('"schemaVersion":3', '"schemaVersion":3,"schemaVersion":3')),
    Buffer.from(canonical.replace('{', '{ ')), Buffer.from(canonical.trimEnd()),
    Buffer.from(`\ufeff${canonical}`), Buffer.from(`${canonical} `), Buffer.from(canonical + canonical),
  ]) {
    const packed = packageBytes(bytes);
    await assert.rejects(assertMaterialInputAuditCurrentStream(report, packed.manifest, packed.payload));
  }
});

test('streamed serializer rejects unsupported executable data and cycles instead of silently changing it', async () => {
  const cyclic = fixture(); cyclic.cycle = cyclic;
  const accessor = fixture(); Object.defineProperty(accessor, 'dynamic', { enumerable: true, get: () => 1 });
  for (const invalid of [null, [], {}, { schemaVersion: -1 }, { schemaVersion: '3' }, cyclic, accessor,
    { schemaVersion: 3, date: new Date() }, { schemaVersion: 3, toJSON: () => ({ schemaVersion: 3 }) },
    { schemaVersion: 3, value: 1n },
  ]) await assert.rejects(encodeMaterialInputAuditStream(invalid));
});
