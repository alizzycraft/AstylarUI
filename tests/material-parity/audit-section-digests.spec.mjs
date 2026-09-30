import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import { createGunzip } from 'node:zlib';
import { sectionDigests, compareSectionLeaves } from '../../scripts/material-audit-section-digests.mjs';

const scan = (text, size = 7) => sectionDigests((function*() {
  const bytes = Buffer.from(text);
  for (let i = 0; i < bytes.length; i += size) yield bytes.subarray(i, i + size);
})());

test('all sections and nested data survive chunk boundaries and UTF-8 splits', async () => {
  const text = JSON.stringify({ schemaVersion: 1, a: { unicode: '日😀', list: [null, false, true, 2.5, {}, []] }, b: [], c: 'x' });
  const expected = await scan(text, 10000);
  for (const size of [1, 2, 3, 17]) assert.deepEqual(await scan(text, size), expected);
  assert.deepEqual(expected.map(s => s.name), ['schemaVersion', 'a', 'b', 'c']);
  assert.deepEqual(await scan(JSON.stringify(JSON.parse(text), null, 2)), expected);
  for (const changed of [text.replace('2.5', '2.6'), text.replace('false,true', 'true,false'),
    text.replace('"unicode":', '"renamed":')]) {
    const actual = await scan(changed);
    assert.notEqual(actual[1].sha256, expected[1].sha256);
    assert.deepEqual([actual[0], ...actual.slice(2)], [expected[0], ...expected.slice(2)]);
  }
  assert.notDeepEqual(await scan('{"a":{}}'), await scan('{"a":[]}'));
});

test('reject incomplete, duplicate-root-key, non-object and trailing-root data', async () => {
  for (const text of ['', '{"a":', '{"a":[1]', '{"a":1,"a":2}', '[]', '{}{}'])
    await assert.rejects(scan(text));
  assert.deepEqual(await scan('{}'), []);
  assert.deepEqual((await scan('{"a":1,"b":null}')).map(s => s.name), ['a', 'b']);
});

test('selected receipt leaf comparison preserves paths, shape, missing data and exact changes', async () => {
  const chunks = value => [Buffer.from(JSON.stringify(value))];
  const a = { other: { ignored: 1 }, receipt: { nested: [{ sha256: 'old', value: null }, [], {}], text: '日😀' } };
  const b = structuredClone(a); b.receipt.nested[0].sha256 = 'new'; b.other.ignored = 2;
  const result = await compareSectionLeaves(chunks(a), chunks(b), ['receipt']);
  assert.deepEqual(result.changes, [{ path: ['receipt', 'nested', 0, 'sha256'], before: 'old', after: 'new' }]);
  assert.ok(result.counts.receipt > 0);
  assert.deepEqual((await compareSectionLeaves(chunks(a), chunks(a), ['receipt'])).changes, []);
  for (const mutate of [
    value => { value.receipt.nested[1] = {}; },
    value => { delete value.receipt.nested[0].value; },
    value => { value.receipt.nested[0].extra = null; },
    value => { value.receipt.nested.reverse(); },
  ]) {
    const changed = structuredClone(a); mutate(changed);
    await assert.rejects(compareSectionLeaves(chunks(a), chunks(changed), ['receipt']));
  }
  await assert.rejects(compareSectionLeaves(chunks(a), chunks(a), ['missing']));
  await assert.rejects(compareSectionLeaves(chunks(a), chunks(a), ['receipt', 'receipt']));
  await assert.rejects(compareSectionLeaves([Buffer.from('{"receipt":')], chunks(a), ['receipt']));
  for (const text of ['{"receipt":{}}{}', '{"receipt":{},"receipt":{}}', '[]']) {
    await assert.rejects(compareSectionLeaves([Buffer.from(text)], [Buffer.from(text)], ['receipt']));
  }
  const bytes = Buffer.from(JSON.stringify(a));
  assert.deepEqual(await compareSectionLeaves([...bytes].map(byte => Buffer.from([byte])), chunks(a), ['receipt']),
    await compareSectionLeaves(chunks(a), chunks(a), ['receipt']));
});

test('published current-ancestry receipt leaves reconcile with the authenticated predecessor',
  { skip: process.env.ASTYLAR_AUDIT_RECEIPT_COMPARE !== '1' }, async t => {
    const hash = bytes => createHash('sha256').update(bytes).digest('hex');
    const beforeManifest = JSON.parse(execFileSync('git', ['show', 'e93b23b^:docs/material-input-equivalence-audit.json']));
    const afterManifest = JSON.parse(readFileSync('docs/material-input-equivalence-audit.json'));
    assert.equal(beforeManifest.compressedSha256, 'db1b33c93c9169169fda86f5e6b36bf38fb1981d3c0aef0ef82cc44ef7b05b1c');
    assert.equal(afterManifest.compressedSha256, '3ec576a364a9a9f2c906d7aad0b58047ab2b10ecc9d5b5d88a5967932fe4f048');
    const before = execFileSync('git', ['show', `e93b23b^:docs/${beforeManifest.payload}`], { maxBuffer: 100e6 });
    const after = readFileSync(`docs/${afterManifest.payload}`);
    async function* authenticated(bytes, manifest) {
      assert.equal(bytes.length, manifest.compressedBytes);
      assert.equal(hash(bytes), manifest.compressedSha256);
      let length = 0;
      const digest = createHash('sha256');
      for await (const chunk of Readable.from([bytes]).pipe(createGunzip())) {
        length += chunk.length; digest.update(chunk); yield chunk;
      }
      assert.equal(length, manifest.uncompressedBytes);
      assert.equal(digest.digest('hex'), manifest.uncompressedSha256);
    }
    const result = await compareSectionLeaves(authenticated(before, beforeManifest), authenticated(after, afterManifest),
      ['controlLineBoxes', 'ownerCaretInputs', 'reviewedSourceBatchInputs', 'controlTypography']);
    const groups = new Map();
    for (const change of result.changes) {
      const key = JSON.stringify({ path: change.path.map(part => typeof part === 'number' ? '#' : part), before: change.before, after: change.after });
      groups.set(key, (groups.get(key) ?? 0) + 1);
    }
    const oldModule = '2328c46161964f252c3cc75f80e632016c4e5570998f5d2add5d6323a4d69cb4';
    const newModule = 'a787e493d0e36d37fe5517bba8a6c3ba7a876f5bdb5ff7991e4d5bdcd0a0ebd0';
    assert.equal(hash(execFileSync('git', ['show', '2b6cddc:tests/material-parity/input-equivalence-audit.mjs'], { maxBuffer: 4e6 })), oldModule);
    assert.equal(hash(readFileSync('tests/material-parity/input-equivalence-audit.mjs')), newModule);
    const expected = [
      [['controlLineBoxes', 'observations', '#', 'normalizationReconciliation', 'currentModuleSha256'], oldModule, newModule, 48],
      [['ownerCaretInputs', 'binding', 'completeSource', 'sources', '#', 'current'], oldModule, newModule, 1],
      [['reviewedSourceBatchInputs', 'binding', 'sourceConservation', 'currentReportSha256'],
        '3c1f5992fd62bddb0344e59f72a2d4509066fdd6ae540fe8b7ce6aac53af68c9',
        'bcc50d1d844e6f49070455d0076ef716e5708b87fa362c0f7badcbc3524977f3', 1],
      [['reviewedSourceBatchInputs', 'binding', 'sourceConservation', 'sourceReceiptTransitions', '#', 'currentSha256'], oldModule, newModule, 1],
      [['controlTypography', 'differences', '#', 'reviewEvidence', 'observation', 'normalizationReconciliation', 'currentModuleSha256'], oldModule, newModule, 48],
    ];
    assert.deepEqual([...groups], expected.map(([path, before, after, count]) => [JSON.stringify({ path, before, after }), count]));
    assert.deepEqual(result.counts, { controlLineBoxes: 263567, ownerCaretInputs: 590705, reviewedSourceBatchInputs: 343859, controlTypography: 3684597 });
    assert.equal(result.changes.length, 99);
    t.diagnostic(JSON.stringify({ counts: result.counts, changedLeaves: result.changes.length,
      groups: [...groups].map(([key, count]) => ({ ...JSON.parse(key), count })) }));
  });

test('source-conservation report hash transition is explained by one normalization receipt',
  { skip: process.env.ASTYLAR_AUDIT_RECEIPT_COMPARE !== '1' }, async () => {
    const { collectOwnerInitialMotion } = await import('../../scripts/audit-material-owner-initial-motion.mjs');
    const hash = value => createHash('sha256').update(JSON.stringify(value, null, 2) + '\n').digest('hex');
    const fresh = collectOwnerInitialMotion();
    assert.equal(hash(fresh), 'bcc50d1d844e6f49070455d0076ef716e5708b87fa362c0f7badcbc3524977f3');
    const before = structuredClone(fresh);
    const receipts = before.sourceFingerprints.filter(source => source.file === 'tests/material-parity/input-equivalence-audit.mjs');
    assert.equal(receipts.length, 1);
    assert.equal(receipts[0].sha256, 'a787e493d0e36d37fe5517bba8a6c3ba7a876f5bdb5ff7991e4d5bdcd0a0ebd0');
    receipts[0].sha256 = '2328c46161964f252c3cc75f80e632016c4e5570998f5d2add5d6323a4d69cb4';
    assert.equal(hash(before), '3c1f5992fd62bddb0344e59f72a2d4509066fdd6ae540fe8b7ce6aac53af68c9');
  });
