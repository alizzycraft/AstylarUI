import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import { createGunzip } from 'node:zlib';
import Parser from 'jsonparse';

// Test-expectation/source-location refresh must not alter any discrepancy row.
const previousCommit = '37fbb5a13f4ccfbef1d6249edda3ac3dad8902d9';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const gitFile = file => execFileSync('git', ['show', `${previousCommit}:${file}`], { maxBuffer: 64 * 1024 * 1024 });
async function projection(read) {
  const manifest = JSON.parse(read('docs/material-input-equivalence-audit.json'));
  assert.match(manifest.payload, /^material-input-equivalence-audit[^/\\]*\.gz$/);
  const bytes = read('docs/' + manifest.payload); assert.equal(hash(bytes), manifest.compressedSha256);
  const parser = new Parser(), result = { rows: [] }; let done = false;
  const wanted = ['discrepancies', 'summary', 'sourceFingerprints'];
  parser.onValue = function (value) {
    const top = this.stack[1]?.key ?? (this.stack.length === 1 ? this.key : undefined);
    if (this.stack.length === 2 && top === 'discrepancies') { result.rows.push(value); delete this.value[this.key]; }
    else if (this.stack.length === 1) {
      if (this.key === 'discrepancies') done = true;
      else if (wanted.includes(this.key)) result[this.key] = value;
      delete this.value[this.key];
    } else if (this.value && !wanted.includes(top)) delete this.value[this.key];
  };
  for await (const chunk of Readable.from([bytes]).pipe(createGunzip())) { parser.write(chunk); if (done) break; }
  assert.ok(done); assert.equal(result.rows.length, 8339);
  return { manifest, ...result };
}
const before = await projection(gitFile), after = await projection(readFileSync);
assert.equal(before.manifest.compressedSha256, 'bc51756963cfd2c0f81cfb099f48f7776cd608224d0c997a6f703edc6f48378d');
assert.deepEqual(after.rows, before.rows, 'Complete discrepancy rows changed during test-only refresh');
assert.deepEqual(after.summary, before.summary, 'Audit summary changed during test-only refresh');
assert.equal(after.sourceFingerprints.length, 156);
assert.deepEqual(after.sourceFingerprints.map(s => s.file), before.sourceFingerprints.map(s => s.file));
const changed = after.sourceFingerprints.filter((s, i) => s.sha256 !== before.sourceFingerprints[i].sha256);
assert.deepEqual(changed.map(s => s.file).sort(), [
  'tests/material-parity/input-equivalence-audit.spec.mjs',
  'tests/material-parity/slider-border-canonical-integration.spec.mjs'
]);
for (const item of after.sourceFingerprints)
  assert.equal(item.sha256, hash(readFileSync(item.file, 'utf8').replaceAll('\r\n', '\n')));
assert.equal(after.summary.unresolvedAttributions, 2812); assert.equal(after.summary.inputEquivalent, false);
const markdownFile = 'docs/material-input-equivalence-audit.md';
const withoutSourceLines = text => text.replaceAll('\r\n', '\n')
  .replace(/\(((?:tests|examples|src)\/[^()\r\n]+):\d+\)/g, '($1:<source-line>)');
assert.equal(withoutSourceLines(readFileSync(markdownFile, 'utf8')), withoutSourceLines(gitFile(markdownFile).toString('utf8')),
  'Human report changed beyond source line references');
console.log(JSON.stringify({ previousCommit, completeRowsUnchanged: after.rows.length,
  completeRowsSha256: hash(JSON.stringify(after.rows)), summaryUnchanged: true,
  sourceFingerprints: after.sourceFingerprints.length, changedSources: changed.map(s => s.file),
  compressedSha256: after.manifest.compressedSha256, unresolved: after.summary.unresolvedAttributions,
  inputEquivalent: false, humanReportUnchangedExceptSourceLines: true,
  limitation: 'Compares complete discrepancy rows, summary and source fingerprints; does not assert byte equality of other report sections or replace canonical no-write validation.' }));
