import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { planCompaction, applyCompaction, verifyCompaction } from '../../scripts/compact-audit-evidence.mjs';

test('retains byte-identical historical paths, deduplicates only exact matches, and is restartable', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-storage-'));
  try {
    for (const run of ['old-a', 'old-b']) {
      fs.mkdirSync(path.join(root, run));
      fs.writeFileSync(path.join(root, run, 'same.json'), 'x'.repeat(5000));
      fs.writeFileSync(path.join(root, run, 'different.json'), run.repeat(1000));
    }
    const plan = planCompaction(root, ['old-a', 'old-b']);
    assert.equal(plan.groups.length, 1); assert.equal(plan.reclaimableBytes, 5000);
    assert.equal(applyCompaction(plan).verifiedAliases, 2);
    assert.equal(applyCompaction(plan).verifiedAliases, 2);
    assert.equal(fs.readFileSync(path.join(root, 'old-b/same.json'), 'utf8'), 'x'.repeat(5000));
    assert.equal(fs.readFileSync(path.join(root, 'old-b/different.json'), 'utf8'), 'old-b'.repeat(1000));
    assert.equal(verifyCompaction(plan).groups, 1);
    assert.throws(() => planCompaction(root, ['../escape']));
  } finally {
    const objects = path.join(root, 'retained-evidence/objects');
    if (fs.existsSync(objects)) for (const file of fs.readdirSync(objects)) fs.chmodSync(path.join(objects, file), 0o666);
    fs.rmSync(root, { recursive: true });
  }
});

test('rejects changed evidence before discarding any original copy', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-storage-'));
  try {
    for (const run of ['old-a', 'old-b']) { fs.mkdirSync(path.join(root, run)); fs.writeFileSync(path.join(root, run, 'same'), 'x'.repeat(5000)); }
    const plan = planCompaction(root, ['old-a', 'old-b']);
    fs.writeFileSync(path.join(root, 'old-a/same'), 'y'.repeat(5000));
    assert.throws(() => applyCompaction(plan), /changed since planning/);
    assert.equal(fs.readFileSync(path.join(root, 'old-b/same'), 'utf8'), 'x'.repeat(5000));
  } finally { fs.rmSync(root, { recursive: true }); }
});
