import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { bindPreciseAuditNormalization, preciseAuditNormalization } from './audit-normalization-contracts.mjs';

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
// Permit only logical-path serialization and the explicit live-normalizer
// transition below. Saved receipts still describe their historical execution.
// Every other byte
// (apart from checkout line endings) must remain identical, including realpath
// containment, capture authentication, classification and row conservation.
export function verifyAlignmentAdapterReceiptSource(receipt, historical, current) {
  assert.deepEqual(Object.keys(receipt).sort(), ['file', 'sha256']);
  assert.ok(allowed.has(receipt.file), 'unreviewed adapter');
  assert.equal(receipt.sha256, allowed.get(receipt.file), 'historical receipt changed');
  assert.equal(hash(historical), receipt.sha256, 'historical source bytes changed');
  const before = normalize(historical), after = normalize(current);
  assert.equal(before.split(oldPath).length, 2, 'expected exactly one historical path expression');
  const replacements = [
    [oldPath, logicalPath],
    ["import { bindOwnerCaretNormalization } from './owner-caret-source-binding.mjs';",
      "import { bindPreciseAuditNormalization, preciseAuditNormalization } from './audit-normalization-contracts.mjs';"],
  ];
  if (receipt.file.endsWith('/alignment-font-audit-source-binding.mjs')) {
    replacements.push([
      "const normalize = bindOwnerCaretNormalization(readFileSync(n.module, 'utf8'), n);\n  return { original, plans, proofs, descriptors, normalize };",
      "const normalize = bindPreciseAuditNormalization();\n  return { original, plans, proofs, descriptors, normalize,\n    normalizationContracts: { historicalPlans: n, current: preciseAuditNormalization } };"],
    ['sourcePlans: replay.descriptors,\n', 'sourcePlans: replay.descriptors,\n      normalizationContracts: replay.normalizationContracts,\n']);
  } else if (receipt.file.endsWith('/text-align-audit-source-binding.mjs')) {
    replacements.push([
      "normalize: bindOwnerCaretNormalization(readFileSync(normalization.module, 'utf8'), normalization),",
      'normalize: bindPreciseAuditNormalization(),\n    normalizationContracts: { historicalPlans: normalization, current: preciseAuditNormalization },'],
    ['sourcePlan: replay.descriptor,\n', 'sourcePlan: replay.descriptor,\n      normalizationContracts: replay.normalizationContracts,\n']);
  } else {
    replacements.push([
      "normalize: bindOwnerCaretNormalization(readFileSync(n.module, 'utf8'), n),",
      'normalize: bindPreciseAuditNormalization(),\n    normalizationContracts: { historicalPlans: n, current: preciseAuditNormalization },'],
    ['sourceReview: replay.descriptor },', 'sourceReview: replay.descriptor,\n      normalizationContracts: replay.normalizationContracts },']);
  }
  let expected = before;
  for (const [oldValue, newValue] of replacements) {
    assert.equal(expected.split(oldValue).length, 2, 'expected exactly one reviewed transition expression');
    expected = expected.replace(oldValue, newValue);
  }
  assert.ok(after === expected, 'adapter changed beyond reviewed path and normalization transition');
  bindPreciseAuditNormalization();
  return { file: receipt.file, baseline, historicalSha256: receipt.sha256,
    currentNormalizedSha256: hash(after), historicalReceiptPreserved: true,
    onlyLogicalPathSerializationChanged: false,
    reviewedChanges: ['logical-path-serialization', 'precise-live-normalization-binding'],
    currentNormalization: preciseAuditNormalization, historicalExecutionReinterpreted: false };
}

export function assertAlignmentAdapterReceiptSource(receipt) {
  assert.ok(allowed.has(receipt.file), 'unreviewed adapter');
  return verifyAlignmentAdapterReceiptSource(receipt,
    execFileSync('git', ['show', `${baseline}:${receipt.file}`], { maxBuffer: 1024 * 1024 }),
    readFileSync(receipt.file));
}
