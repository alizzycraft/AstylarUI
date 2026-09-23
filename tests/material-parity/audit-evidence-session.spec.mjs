import assert from 'node:assert/strict';
import test from 'node:test';
import * as fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { withAuditEvidenceSession, memoizeAuditEvidence, auditReadFileSync } from './audit-evidence-session.mjs';

test('evidence is collected once, immutable, reusable, and invalidated by data/code/config changes', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-session-'));
  try {
    fs.writeFileSync(path.join(root, 'entry.mjs'), "import './helper.mjs';\n");
    fs.writeFileSync(path.join(root, 'helper.mjs'), 'export const version = 1;');
    fs.writeFileSync(path.join(root, 'capture.json'), '{"value":1}');
    fs.writeFileSync(path.join(root, 'config.json'), '{"schema":1}');
    let calls = 0, metrics;
    const collect = () => memoizeAuditEvidence({ id: 'test', entry: path.join(root, 'entry.mjs') }, () => {
      calls++;
      return { observation: JSON.parse(auditReadFileSync(path.join(root, 'capture.json'))),
        config: JSON.parse(auditReadFileSync(path.join(root, 'config.json'))) };
    });
    const run = (cold = false) => withAuditEvidenceSession(() => {
      const a = collect(), b = collect(); assert.equal(a, b);
      assert.throws(() => { a.observation.value = 99; }); return a;
    }, { root, cold, onMetrics: m => { metrics = m; } });
    const original = run(); assert.equal(calls, 1); assert.equal(metrics.memoryHits, 1);
    assert.deepEqual(run(), original); assert.equal(calls, 1); assert.equal(metrics.diskHits, 1);
    fs.writeFileSync(path.join(root, 'capture.json'), '{"value":2}');
    assert.equal(run().observation.value, 2); assert.equal(calls, 2); assert.equal(metrics.invalidated, 1);
    fs.writeFileSync(path.join(root, 'helper.mjs'), 'export const version = 2;');
    run(); assert.equal(calls, 3);
    fs.writeFileSync(path.join(root, 'config.json'), '{"schema":2}'); run(); assert.equal(calls, 4);
    run(true); assert.equal(calls, 5); assert.equal(metrics.diskHits, 0);
    const cache = path.join(root, 'artifacts/material-parity/evidence-cache');
    fs.writeFileSync(path.join(cache, fs.readdirSync(cache)[0]), '{"corrupt":true}');
    run(); assert.equal(calls, 6); assert.equal(metrics.invalidated, 1);
    fs.unlinkSync(path.join(root, 'capture.json'));
    assert.throws(() => run(), /ENOENT/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('changed sources during a session are rejected before caching; opaque collectors cannot be cached', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-session-'));
  try {
    fs.writeFileSync(path.join(root, 'entry.mjs'), 'export const v=1;');
    fs.writeFileSync(path.join(root, 'data'), 'original');
    assert.throws(() => withAuditEvidenceSession(() => {
      memoizeAuditEvidence({ id: 'test', entry: path.join(root, 'entry.mjs') }, () => auditReadFileSync(path.join(root, 'data'), 'utf8'));
      fs.writeFileSync(path.join(root, 'data'), 'changed');
    }, { root }), /changed during run/);
    assert.equal(fs.existsSync(path.join(root, 'artifacts/material-parity/evidence-cache')), false);
    fs.writeFileSync(path.join(root, 'entry.mjs'), "import { readFileSync } from 'node:fs';");
    assert.throws(() => withAuditEvidenceSession(() => memoizeAuditEvidence({ id: 'opaque', entry: path.join(root, 'entry.mjs') }, () => 1), { root }), /Untracked/);
    assert.throws(() => withAuditEvidenceSession(() => auditReadFileSync('../escape'), { root }), /escapes root/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
