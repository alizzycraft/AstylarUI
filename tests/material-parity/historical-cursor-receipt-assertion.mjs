import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';

const file = 'docs/material-public-cursor-defaults-audit.json';
const revision = '9d9bdc1511fa72ad63cefabe4b695b2ee91e049f';
const hash = value => createHash('sha256').update(value).digest('hex');
const lf = value => value.toString().replaceAll('\r\n', '\n');
const sourceHashes = new Map([
  ['src/app/config/browser-defaults.ts', 'c429bec0fa047e71148f4ce743868a4c89986fde28cc7d11076bb7afa89993f3'],
  ['src/app/services/dom/style-defaults.service.ts', '379775839024538bcd2a6acc69528039e24fc58b849e52841ba9d6c88f4da7d0'],
  ['src/app/services/dom/interaction/pointer-interaction.service.ts', '1f581426214e63eec4d9d234cf93de0b52f4581f1f185d544b8e05799b3d371a'],
  ['src/app/services/dom/interaction/text-interaction-registry.service.ts', '5f69ed34599566f7bcf8601660e9e48f8e4da843f1c911091e0aebb77cd320f0'],
]);

// The original raw receipts remain historical. Their complete LF-normalized
// source identity was independently verified against the frozen raw originals.
// Do not generalize this to arbitrary source edits or overwrite saved hashes.
export function assertHistoricalCursorReceipt(result, { read = readFileSync } = {}) {
  const bytes = read(file);
  assert.equal(hash(lf(bytes)), '8815a92edc24813856a2fc6f51b27ae15b06f178bf4ef08b9ffab1656fd6a990');
  const saved = JSON.parse(bytes), comparable = structuredClone(result), receipts = [];
  assert.equal(saved.sourceCommit, revision);
  assert.equal(comparable.sourceProof.witnesses.length, sourceHashes.size);
  const seen = new Set();
  for (const witness of comparable.sourceProof.witnesses) {
    assert.ok(sourceHashes.has(witness.file)); assert.ok(!seen.has(witness.file)); seen.add(witness.file);
    const current = read(witness.file);
    const original = execFileSync('git', ['show', `${revision}:${witness.file}`], { maxBuffer: 4 * 1024 * 1024 });
    assert.equal(hash(lf(original)), sourceHashes.get(witness.file));
    assert.equal(lf(current), lf(original), 'source differs beyond CRLF/LF encoding');
    assert.equal(witness.sha256, hash(current), 'current raw receipt is detached');
    const prior = saved.sourceProof.witnesses.find(row => row.file === witness.file);
    assert.ok(prior);
    receipts.push({ file: witness.file, historicalRaw: prior.sha256, currentRaw: witness.sha256,
      lfSha256: sourceHashes.get(witness.file) });
    witness.sha256 = prior.sha256;
  }
  assert.ok(isDeepStrictEqual(comparable, saved), 'public cursor evidence differs beyond authenticated raw source receipts');
  return { receipts, allOtherEvidenceConserved: true, savedReportRewritten: false };
}
