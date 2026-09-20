import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const file = 'tests/material-parity/run-material-parity.mjs';
const rawSha256 = 'b2477a124293aec6bba3a2413ff58d41f409288dcf0cb53a54ed17d162b9fa97';
const normalizedSha256 = 'c3cabcfde7b9a0cd911eb919774e258145aefc629ff308a48f1f51ece0f34e10';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

// Recover only this capture's exact historical bytes. The line-ending map was
// extracted from the retained raw producer, independently of the LF checkout.
// Authentication still uses the original capture's raw SHA-256. This is not a
// general source-hash normalization policy or proof of current runner behavior.
export function recoverOriginalOverlayRunnerSource(receipt, currentBytes, endings = JSON.parse(
  readFileSync(new URL('./original-overlay-runner-line-endings.json', import.meta.url)))) {
  assert.equal(receipt.file, file); assert.equal(receipt.sha256, rawSha256);
  assert.deepEqual(Object.keys(endings).sort(), ['schemaVersion', 'file', 'recordedSha256',
    'normalizedSha256', 'lineCount', 'crlfLines'].sort());
  assert.equal(endings.schemaVersion, 1); assert.equal(endings.file, file);
  assert.equal(endings.recordedSha256, rawSha256); assert.equal(endings.normalizedSha256, normalizedSha256);
  assert.equal(endings.lineCount, 1724); assert.equal(endings.crlfLines.length, 564);
  const normalized = currentBytes.toString('utf8').replaceAll('\r\n', '\n');
  assert.equal(hash(normalized), normalizedSha256, 'overlay runner changed beyond checkout line endings');
  const lines = normalized.split('\n'); assert.equal(lines.length, endings.lineCount);
  let previous = 0;
  for (const line of endings.crlfLines) {
    assert.ok(Number.isSafeInteger(line) && line > previous && line < lines.length, 'invalid historical line-ending map');
    lines[line - 1] += '\r'; previous = line;
  }
  const bytes = Buffer.from(lines.join('\n'));
  assert.equal(hash(bytes), rawSha256, 'reconstructed bytes do not match the original raw receipt');
  return { bytes, evidence: { file, recordedSha256: rawSha256, currentSha256: hash(currentBytes),
    normalizedSha256, exactHistoricalBytesRecovered: true, currentExecutionEquivalentProven: false } };
}
