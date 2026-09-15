import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import { createGunzip } from 'node:zlib';
import Parser from 'jsonparse';

// The original 600-group surveys are historical evidence. Advancing the live
// canonical report must not silently change their population or destroy replay.
export const ownerInitialBaselineCommit = '54ba5e136cee3256461b9f05daf00e38b1dca850';
export async function readOwnerInitialBaseline() {
  const gitFile = file => execFileSync('git', ['show', `${ownerInitialBaselineCommit}:${file}`], { maxBuffer: 64 * 1024 * 1024 });
  const manifest = JSON.parse(gitFile('docs/material-input-equivalence-audit.json'));
  assert.equal(manifest.compressedSha256, 'a808df6d424a8bdd751e4066c0b895a2f522d6d68d357c5b694be7663b9209b3');
  assert.ok(/^material-input-equivalence-audit[^/\\]*\.gz$/.test(manifest.payload));
  const payload = gitFile('docs/' + manifest.payload);
  assert.equal(createHash('sha256').update(payload).digest('hex'), manifest.compressedSha256);
  const parser = new Parser(), rows = []; let done = false;
  parser.onValue = function (value) {
    const top = this.stack[1]?.key ?? (this.stack.length === 1 ? this.key : undefined);
    if (this.stack.length === 2 && top === 'discrepancies') { rows.push(value); delete this.value[this.key]; }
    else if (this.stack.length === 1) { if (this.key === 'discrepancies') done = true; delete this.value[this.key]; }
    else if (this.value && top !== 'discrepancies') delete this.value[this.key];
  };
  for await (const chunk of Readable.from([payload]).pipe(createGunzip())) { parser.write(chunk); if (done) break; }
  assert.ok(done); assert.equal(rows.length, 8339);
  return { manifest, rows };
}
