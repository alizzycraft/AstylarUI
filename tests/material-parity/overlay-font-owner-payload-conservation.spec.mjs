import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import test from 'node:test';
import { assertSingleSourcePayloadChange } from './single-source-payload-conservation.mjs';

const hash = x => createHash('sha256').update(x).digest('hex');
const owner = 'scripts/audit-material-font-ownership-attribution.mjs';
const normalized = b => b.toString('utf8').replaceAll('\r\n', '\n');
const revision = '7cd5cb7';
const readOld = file => execFileSync('git', ['show', `${revision}:${file}`], { maxBuffer: 64 * 1024 * 1024 });
function packed(text) {
  const decoded = Buffer.from(text), payload = gzipSync(decoded);
  return { payload, manifest: { format: 'astylar-material-input-audit-gzip', formatVersion: 1,
    auditSchemaVersion: 3, encoding: 'utf-8', compression: 'gzip', payload: 'material-input-equivalence-audit.json.gz',
    compressedBytes: payload.length, compressedSha256: hash(payload),
    uncompressedBytes: decoded.length, uncompressedSha256: hash(decoded) } };
}

test('single-source conservation compares all bytes across chunk boundaries and rejects other changes', async () => {
  const before = 'a'.repeat(64), after = 'b'.repeat(64), change = { file: owner, before, after };
  for (const padding of [0, 16290, 16383, 32710]) {
    const original = JSON.stringify({ schemaVersion: 3, pad: 'x'.repeat(padding),
      sourceFingerprints: [{ file: owner, sha256: before }], observations: [{ value: 'retained', count: 7 }] }) + '\n';
    const changed = original.replace(before, after);
    const result = await assertSingleSourcePayloadChange(packed(original), packed(changed), change);
    assert.equal(result.decodedBytesCompared, Buffer.byteLength(original));
    assert.equal(result.changedSourceReceipts, 1);
    for (const invalid of [original, changed.replace('retained', 'invented'), changed + ' ', changed.slice(0, -1)])
      await assert.rejects(assertSingleSourcePayloadChange(packed(original), packed(invalid), change));
    const duplicate = JSON.stringify({ sourceFingerprints: [change, change].map(() => ({ file: owner, sha256: before })) });
    await assert.rejects(assertSingleSourcePayloadChange(packed(duplicate), packed(duplicate.replaceAll(before, after)), change));
  }
});

test('overlay-font canonical refresh changes exactly one source receipt and no other decoded bytes', async () => {
  const oldSource = normalized(readOld(owner)), currentSource = normalized(readFileSync(owner));
  const eager = 'targets: Object.keys(overlayFontTargets),';
  const deferred = 'get targets() { return Object.keys(overlayFontTargets); },';
  assert.equal(oldSource.split(eager).length, 2);
  assert.equal(currentSource, oldSource.replace(eager, deferred), 'source changed beyond the demonstrated initialization correction');
  const previous = { manifest: JSON.parse(readOld('docs/material-input-equivalence-audit.json')),
    payload: readOld('docs/material-input-equivalence-audit.json.gz') };
  assert.equal(previous.manifest.compressedSha256, 'c08d24e94671c18e0c640638ca234b9571720080474115cc2b8388a2883a810e');
  const current = { manifest: JSON.parse(readFileSync('docs/material-input-equivalence-audit.json')),
    payload: readFileSync('docs/material-input-equivalence-audit.json.gz') };
  const result = await assertSingleSourcePayloadChange(previous, current,
    { file: owner, before: hash(oldSource), after: hash(currentSource) });
  assert.deepEqual(readFileSync('docs/material-input-equivalence-audit.md'), readOld('docs/material-input-equivalence-audit.md'));
  console.log(JSON.stringify({ ...result, previous: previous.manifest, current: current.manifest,
    canonicalUnresolvedGroups: 1835, inputEquivalent: false, renderingEquivalent: false }));
});
