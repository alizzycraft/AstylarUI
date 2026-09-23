import assert from 'node:assert/strict';
import test from 'node:test';
import * as fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { withAuditScratch } from './audit-scratch.mjs';

test('scratch is removed on success, retained on failure or explicit request, and cannot escape its root', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-retention-'));
  try {
    let used, message;
    const run = dir => { used = dir; fs.writeFileSync(path.join(dir, 'capture.json'), '{}'); return 7; };
    assert.equal(withAuditScratch('passing-', run, { root }), 7); assert.equal(fs.existsSync(used), false);
    assert.throws(() => withAuditScratch('failure-', dir => { run(dir); throw new Error('test failure'); }, { root, log: text => { message = text; } }), /test failure/);
    assert.ok(fs.existsSync(path.join(used, 'capture.json'))); assert.ok(message.includes(used));
    withAuditScratch('retained-', run, { root, retainSuccess: true, log: () => {} }); assert.ok(fs.existsSync(used));
    assert.throws(() => withAuditScratch('../escape-', run, { root }));
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
