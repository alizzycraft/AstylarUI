import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const baseline = '67db724e5f258c84cfdc70e9da2ccb6ee6353ad0';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const normalize = bytes => bytes.toString('utf8').replaceAll('\r\n', '\n');
const allowed = new Map([
  ['tests/material-parity/alignment-font-audit-source-binding.mjs', '6d4293becbecbdc6058533f0dec425c0f0e6a1a4d131f1c508eb0600fa9b89f7'],
  ['tests/material-parity/text-align-audit-source-binding.mjs', '31fc67f6ec7749306b7c34e414f79c1ffd65889b31fc6d3cf1879830e936ddbe'],
  ['tests/material-parity/ltr-alignment-audit-source-binding.mjs', '11f1d2913c03512cd163a69ca1a6f4989526ade5d257c03bdd8df1bb6b005c41'],
]);
const oldPath = "file: path.relative(root, target).replaceAll('\\\\', '/')";
const logicalPath = "file: path.relative(root, path.resolve(root, parityPath)).replaceAll('\\\\', '/')";

// A saved dry run binds historical bytes, not whatever source is current today.
// Permit only the reviewed logical-path serialization change. Every other byte
// (apart from checkout line endings) must remain identical, including realpath
// containment, capture authentication, classification and row conservation.
export function verifyAlignmentAdapterReceiptSource(receipt, historical, current) {
  assert.deepEqual(Object.keys(receipt).sort(), ['file', 'sha256']);
  assert.ok(allowed.has(receipt.file), 'unreviewed adapter');
  assert.equal(receipt.sha256, allowed.get(receipt.file), 'historical receipt changed');
  assert.equal(hash(historical), receipt.sha256, 'historical source bytes changed');
  const before = normalize(historical), after = normalize(current);
  assert.equal(before.split(oldPath).length, 2, 'expected exactly one historical path expression');
  assert.equal(after, before.replace(oldPath, logicalPath), 'adapter changed beyond logical-path serialization');
  return { file: receipt.file, baseline, historicalSha256: receipt.sha256,
    currentNormalizedSha256: hash(after), historicalReceiptPreserved: true,
    onlyLogicalPathSerializationChanged: true };
}

export function assertAlignmentAdapterReceiptSource(receipt) {
  assert.ok(allowed.has(receipt.file), 'unreviewed adapter');
  return verifyAlignmentAdapterReceiptSource(receipt,
    execFileSync('git', ['show', `${baseline}:${receipt.file}`], { maxBuffer: 1024 * 1024 }),
    readFileSync(receipt.file));
}
