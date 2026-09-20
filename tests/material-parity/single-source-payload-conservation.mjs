import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import { createGunzip } from 'node:zlib';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
function authenticate(manifest, payload) {
  assert.equal(manifest.format, 'astylar-material-input-audit-gzip');
  assert.equal(manifest.formatVersion, 1); assert.equal(manifest.encoding, 'utf-8');
  assert.equal(manifest.compression, 'gzip');
  assert.equal(manifest.payload, 'material-input-equivalence-audit.json.gz');
  assert.equal(payload.length, manifest.compressedBytes);
  assert.equal(hash(payload), manifest.compressedSha256);
}

// Compare every decoded byte. The only permitted change is one exact serialized
// source receipt with equal-length SHA-256 values. This helper does not prove
// that changing the source is valid; the caller must authenticate that source
// change and the previously reviewed baseline independently.
export async function assertSingleSourcePayloadChange(previous, current, { file, before, after }) {
  assert.match(before, /^[a-f0-9]{64}$/); assert.match(after, /^[a-f0-9]{64}$/);
  assert.notEqual(before, after);
  for (const input of [previous, current]) authenticate(input.manifest, input.payload);
  assert.equal(current.manifest.auditSchemaVersion, previous.manifest.auditSchemaVersion);
  assert.equal(current.manifest.uncompressedBytes, previous.manifest.uncompressedBytes);
  const needle = Buffer.from(JSON.stringify({ file, sha256: before }));
  const replacement = Buffer.from(JSON.stringify({ file, sha256: after }));
  assert.equal(needle.length, replacement.length);
  const oldHash = createHash('sha256'), newHash = createHash('sha256');
  let oldLength = 0, newLength = 0, replacements = 0;
  const oldStream = Readable.from([previous.payload]).pipe(createGunzip());
  const newStream = Readable.from([current.payload]).pipe(createGunzip());
  async function* expectedChunks() {
    let pending = Buffer.alloc(0);
    for await (const chunk of oldStream) {
      oldHash.update(chunk); oldLength += chunk.length;
      pending = Buffer.concat([pending, chunk]);
      let index;
      while ((index = pending.indexOf(needle)) !== -1) {
        replacements++;
        assert.equal(replacements, 1, 'source receipt is not unique in authenticated baseline');
        yield pending.subarray(0, index); yield replacement;
        pending = pending.subarray(index + needle.length);
      }
      const flush = Math.max(0, pending.length - needle.length + 1);
      if (flush) { yield pending.subarray(0, flush); pending = pending.subarray(flush); }
    }
    if (pending.length) yield pending;
  }
  const expected = expectedChunks(); let next = await expected.next(), offset = 0;
  try {
    for await (const chunk of newStream) {
      newHash.update(chunk); newLength += chunk.length;
      let position = 0;
      while (position < chunk.length) {
        while (!next.done && offset === next.value.length) { next = await expected.next(); offset = 0; }
        assert.ok(!next.done, 'current payload has additional bytes');
        const count = Math.min(chunk.length - position, next.value.length - offset);
        assert.ok(chunk.subarray(position, position + count).equals(next.value.subarray(offset, offset + count)),
          `payload differs beyond the one permitted source receipt near byte ${newLength - chunk.length + position}`);
        offset += count; position += count;
      }
    }
    while (!next.done && offset === next.value.length) { next = await expected.next(); offset = 0; }
    assert.equal(next.done, true, 'current payload has missing bytes');
    assert.equal(replacements, 1, 'expected source receipt missing');
    assert.equal(oldLength, previous.manifest.uncompressedBytes);
    assert.equal(newLength, current.manifest.uncompressedBytes);
    assert.equal(oldHash.digest('hex'), previous.manifest.uncompressedSha256);
    assert.equal(newHash.digest('hex'), current.manifest.uncompressedSha256);
    return { decodedBytesCompared: newLength, changedSourceReceipts: replacements,
      otherDecodedBytesIdentical: true, observationsOrClassificationsChanged: false };
  } finally { oldStream.destroy(); newStream.destroy(); await expected.return(); }
}
