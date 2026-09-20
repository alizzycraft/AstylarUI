import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { assertAlignmentAdapterReceiptSource, verifyAlignmentAdapterReceiptSource } from './alignment-adapter-receipt-source.mjs';

const receipts = ['alignment-font', 'text-align', 'ltr-alignment'].map(name =>
  JSON.parse(readFileSync(`docs/material-${name}-transition-dry-run.json`)).sourceBinding);

test('historical adapter receipts retain exact committed bytes across logical-path serialization', () => {
  for (const receipt of receipts) {
    const result = assertAlignmentAdapterReceiptSource(receipt);
    assert.equal(result.historicalSha256, receipt.sha256);
    assert.equal(result.historicalReceiptPreserved, true);
    assert.equal(result.onlyLogicalPathSerializationChanged, true);
    assert.notEqual(result.currentNormalizedSha256, result.historicalSha256);
  }
});

test('adapter conservation rejects changed receipts, classification, containment and any extra source change', () => {
  for (const receipt of receipts) {
    const historical = execFileSync('git', ['show', `67db724e5f258c84cfdc70e9da2ccb6ee6353ad0:${receipt.file}`]);
    const current = readFileSync(receipt.file, 'utf8');
    const mutations = [
      [ { ...receipt, file: 'tests/material-parity/unreviewed.mjs' }, historical, current ],
      [ { ...receipt, sha256: '0'.repeat(64) }, historical, current ],
      [ { ...receipt, bypass: true }, historical, current ],
      [ receipt, Buffer.concat([historical, Buffer.from('\n')]), current ],
      [ receipt, historical, current.replace("status: 'bound'", "status: 'invalid'") ],
      [ receipt, historical, current.replace('realpathSync(', 'path.resolve(') ],
      [ receipt, historical, current.replace('path.resolve(root, parityPath)', 'path.resolve(root, target)') ],
      [ receipt, historical, current + '\n// unreviewed change\n' ],
      [ receipt, historical, historical ],
    ];
    for (const [index, args] of mutations.entries()) {
      assert.throws(() => verifyAlignmentAdapterReceiptSource(...args), `${receipt.file}: mutation ${index}`);
    }
    assert.equal(verifyAlignmentAdapterReceiptSource(receipt, historical,
      current.replaceAll('\r\n', '\n').replaceAll('\n', '\r\n')).historicalReceiptPreserved, true);
  }
});
