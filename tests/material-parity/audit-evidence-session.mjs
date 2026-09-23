import assert from 'node:assert/strict';
import { AsyncLocalStorage } from 'node:async_hooks';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const active = new AsyncLocalStorage();
const hash = value => createHash('sha256').update(value).digest('hex');
const freeze = value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze); Object.freeze(value);
  }
  return value;
};
function relativeFile(root, file) {
  const absolute = path.resolve(root, file instanceof URL || String(file).startsWith('file:') ? fileURLToPath(file) : file);
  const relative = path.relative(root, absolute).replaceAll('\\', '/');
  assert.ok(relative && !relative.startsWith('..') && !path.isAbsolute(relative), 'Evidence dependency escapes root');
  return { absolute, relative };
}

class EvidenceSession {
  constructor({ root = process.cwd(), cacheDirectory = 'artifacts/material-parity/evidence-cache', cold = false } = {}) {
    this.root = path.resolve(root); this.cacheDirectory = relativeFile(this.root, cacheDirectory).absolute;
    this.cold = cold; this.files = new Map(); this.values = new Map(); this.frames = [];
    this.pending = []; this.metrics = { collectors: 0, memoryHits: 0, diskHits: 0, invalidated: 0,
      filesRead: 0, bytesRead: 0, verificationBytes: 0 };
  }
  read(file, encoding) {
    assert.ok(encoding === undefined || encoding === 'utf8' || encoding === 'utf-8', 'Unsupported evidence read encoding');
    const { absolute, relative } = relativeFile(this.root, file);
    let stored = this.files.get(relative);
    if (!stored) {
      const bytes = fs.readFileSync(absolute);
      stored = { bytes, sha256: hash(bytes) }; this.files.set(relative, stored);
      this.metrics.filesRead++; this.metrics.bytesRead += bytes.length;
    }
    for (const frame of this.frames) frame.set(relative, stored.sha256);
    return encoding ? stored.bytes.toString(encoding) : Buffer.from(stored.bytes);
  }
  codeGraph(entry, visited = new Set()) {
    const { absolute, relative } = relativeFile(this.root, entry);
    if (visited.has(relative)) return; visited.add(relative);
    const source = this.read(absolute, 'utf8');
    // Cached collectors must expose every data read through this module. Never
    // silently cache a graph containing opaque I/O or executable subprocesses.
    assert.ok(!/from\s*['"]node:(?:child_process|fs\/promises)['"]/.test(source), 'Collector has opaque I/O; use session-only reuse');
    assert.ok(!/import\s*\(/.test(source), 'Dynamic collector imports require explicit dependencies');
    if (/from\s*['"]node:fs['"]/.test(source)) {
      if (!relative.endsWith('/audit-evidence-session.mjs')) {
        const imports = [...source.matchAll(/import\s+([^;]+?)\s+from\s*['"]node:fs['"]/g)];
        assert.ok(imports.length > 0 && imports.every(([, bindings]) =>
          /^\{\s*writeFileSync\s*\}$/.test(bindings)), `Untracked file reader in collector graph: ${relative}`);
      }
    }
    // This module owns the cache implementation and has no collector imports.
    if (relative.endsWith('/audit-evidence-session.mjs')) return;
    for (const match of source.matchAll(/(?:\bfrom\s*|\bimport\s*)['"](\.[^'"]+)['"]/g))
      this.codeGraph(path.resolve(path.dirname(absolute), match[1]), visited);
    for (const file of ['package.json', 'package-lock.json']) if (fs.existsSync(path.join(this.root, file))) this.read(file);
  }
  compute({ id, entry, persistent = true, parameters = null }, collect) {
    const key = hash(JSON.stringify({ id, entry: relativeFile(this.root, entry).relative, parameters,
      root: this.root, node: process.version, schema: 1 }));
    if (this.values.has(key)) {
      this.metrics.memoryHits++;
      const record = this.values.get(key);
      for (const [file, digest] of record.dependencies) for (const frame of this.frames) frame.set(file, digest);
      return record.value;
    }
    const frame = new Map(); this.frames.push(frame);
    try {
      const cacheFile = path.join(this.cacheDirectory, `${key}.json`);
      if (persistent && !this.cold && fs.existsSync(cacheFile)) {
        try {
          const envelope = JSON.parse(fs.readFileSync(cacheFile, 'utf8')), record = envelope.record;
          assert.equal(envelope.sha256, hash(JSON.stringify(record)), 'Cache envelope changed');
          assert.equal(record.key, key); assert.ok(record.dependencies.length > 0);
          for (const [file, expected] of record.dependencies) assert.equal(hash(this.read(file)), expected, `Stale dependency: ${file}`);
          const value = freeze(record.value); this.values.set(key, { value, dependencies: frame });
          this.metrics.diskHits++; return value;
        } catch { this.metrics.invalidated++; }
      }
      if (persistent) this.codeGraph(entry);
      this.metrics.collectors++;
      const value = freeze(collect());
      assert.ok(!value?.then, 'Evidence collectors must be synchronous');
      const record = { key, dependencies: [...frame], value };
      this.values.set(key, { value, dependencies: frame });
      if (persistent) this.pending.push({ cacheFile, record });
      return value;
    } finally { this.frames.pop(); }
  }
  finish() {
    // Validate the entire read snapshot once before publishing any reusable
    // evidence. A source changed during collection never becomes a cache hit.
    for (const [relative, previous] of this.files) {
      const bytes = fs.readFileSync(relativeFile(this.root, relative).absolute);
      this.metrics.verificationBytes += bytes.length;
      assert.equal(hash(bytes), previous.sha256, `Evidence changed during run: ${relative}`);
    }
    for (const { cacheFile, record } of this.pending) {
      fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
      const temporary = `${cacheFile}.${process.pid}.tmp`;
      fs.writeFileSync(temporary, JSON.stringify({ sha256: hash(JSON.stringify(record)), record }));
      fs.renameSync(temporary, cacheFile);
    }
  }
}

export function withAuditEvidenceSession(run, options = {}) {
  if (active.getStore()) return run();
  const session = new EvidenceSession(options), started = performance.now();
  const result = active.run(session, run);
  assert.ok(!result?.then, 'Wrap synchronous collection/validation, not asynchronous rendering');
  session.finish();
  options.onMetrics?.({ ...session.metrics, elapsedMs: performance.now() - started });
  return result;
}
export function auditReadFileSync(file, encoding) {
  return active.getStore()?.read(file, encoding) ?? fs.readFileSync(file, encoding);
}
export function memoizeAuditEvidence(descriptor, collect) {
  if (!active.getStore()) return withAuditEvidenceSession(() => memoizeAuditEvidence(descriptor, collect));
  return active.getStore().compute(descriptor, collect);
}
