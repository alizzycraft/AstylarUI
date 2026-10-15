import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { createGunzip } from 'node:zlib';
import Parser from 'jsonparse';
import readline from 'node:readline';

// One missing conservation boundary: compact row hashes omit non-row metadata.
// Authenticate the immutable predecessor and stop after the required section.
// This check writes no report, index, capture or canonical acceptance flag.
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const directory = 'artifacts/material-parity/working-audit/' +
  '86961b43b2c7b811b883b5945466fee14e6e1de41ff117cd7574def3a43ff5c1';
const indexBytes = fs.readFileSync(`${directory}/index.json`);
assert.equal(hash(indexBytes), 'ec90ff41e99dcb1223bf02422516aca796b34ec02ed787f5eb62e64793935fe7');
const index = JSON.parse(indexBytes);
const file = `${directory}/${index.manifest.payload}`;
const compressed = fs.readFileSync(file);
assert.equal(hash(compressed), index.manifest.compressedSha256);
assert.equal(compressed.length, index.manifest.compressedBytes);
const censusFile = 'artifacts/material-parity/configured-editing-root-canonical-census-20261015.log';
const censusHash = createHash('sha256');
for await (const chunk of fs.createReadStream(censusFile)) censusHash.update(chunk);
assert.equal(censusHash.digest('hex'), '41198dc1ac802f2fd2dc35901638d4060a05e39ab49315270d3f20c4ba86e265');
// Same typed postorder convention as fingerprintAuditValue. Ignore only row
// descendants already authenticated by the separate complete row conservation.
function append(digest, keys, value) {
  const kind = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
  digest.update(JSON.stringify([keys, kind,
    kind === 'array' || kind === 'object' ? null : value]) + '\n');
}
function fingerprint(value, keys, digest) {
  if (keys[1] !== 'differences' && value && typeof value === 'object') {
    for (const key of Object.keys(value)) fingerprint(value[key],
      [...keys, Array.isArray(value) ? Number(key) : key], digest);
  }
  append(digest, keys, value);
}
let currentDigest, forgedDigest;
for await (const line of readline.createInterface({ input: fs.createReadStream(censusFile), crlfDelay: Infinity })) {
  if (!line.startsWith('{"phase":"retained-selected-metadata"')) continue;
  const current = JSON.parse(line).metadata.controlTypography;
  const digest = createHash('sha256');
  fingerprint(current, ['controlTypography'], digest);
  currentDigest = digest.digest('hex');
  current.scope += ' forged';
  const forged = createHash('sha256');
  fingerprint(current, ['controlTypography'], forged);
  forgedDigest = forged.digest('hex');
}
assert.ok(currentDigest);
assert.notEqual(currentDigest, forgedDigest);

const parser = new Parser();
const predecessorDigest = createHash('sha256');
let done = false, decodedBytesVisited = 0, nextProgress = 256 * 1024 * 1024;
parser.onValue = function (value) {
  if (this.stack.length) {
    const keys = [...this.stack.slice(1).map(frame => frame.key), this.key];
    if (keys[0] === 'controlTypography') {
      if (!(keys[1] === 'differences' && keys.length > 2)) append(predecessorDigest, keys, value);
      if (keys.length === 1) done = true;
    }
    if (this.value) delete this.value[this.key];
  }
};
console.log(JSON.stringify({ phase: 'authenticated-targeted-read', predecessor: index.manifest.compressedSha256 }));
for await (const chunk of fs.createReadStream(file).pipe(createGunzip())) {
  decodedBytesVisited += chunk.length;
  parser.write(chunk);
  if (decodedBytesVisited >= nextProgress) {
    console.log(JSON.stringify({ phase: 'targeted-read-progress', decodedBytesVisited }));
    nextProgress += 256 * 1024 * 1024;
  }
  if (done) break;
}
assert.ok(done);
const previousDigest = predecessorDigest.digest('hex');
assert.equal(previousDigest, currentDigest);
assert.notEqual(previousDigest, forgedDigest);
console.log(JSON.stringify({ phase: 'non-row-control-metadata-conserved',
  authenticatedPredecessor: index.manifest.compressedSha256, decodedBytesVisited,
  metadataSha256: currentDigest,
  completeMetadataEqualExceptPreviouslyPrunedDifferenceRows: true,
  forgedScopeRejected: true,
  boundary: 'Targeted predecessor metadata conservation,not browser parity or canonical acceptance' }));
