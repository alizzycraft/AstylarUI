import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const digest = (value) => createHash('sha256').update(value).digest('hex');

/** Fingerprint the harness's literal local import graph, not unrelated audit edits. */
export function fingerprintModuleGraph(root, entry) {
  const visited = new Map();
  const visit = (file) => {
    const absolute = path.resolve(file);
    assert.ok(absolute.startsWith(path.resolve(root) + path.sep), 'Harness import escapes repository.');
    if (visited.has(absolute)) return;
    const content = readFileSync(absolute, 'utf8');
    visited.set(absolute, digest(content));
    for (const match of content.matchAll(/(?:\bfrom\s*|\bimport\s*(?:\(\s*)?)["'](\.[^"']+)["']/g)) {
      visit(path.resolve(path.dirname(absolute), match[1]));
    }
  };
  visit(path.resolve(root, entry));
  return [...visited].map(([file, sha256]) => ({ file: path.relative(root, file).replaceAll('\\', '/'), sha256 }))
    .sort((a, b) => a.file.localeCompare(b.file));
}

export function fingerprintDirectory(directory) {
  const entries = [];
  const visit = (current) => {
    for (const entry of readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const file = path.join(current, entry.name);
      assert.ok(!entry.isSymbolicLink(), `Checkpoint input may not be a symlink: ${file}`);
      if (entry.isDirectory()) visit(file);
      else if (entry.isFile()) entries.push({ file: path.relative(directory, file).replaceAll('\\', '/'), sha256: digest(readFileSync(file)) });
    }
  };
  visit(directory);
  return entries;
}

export function materialCaseKey(kind, entry) {
  return JSON.stringify({ kind, family: entry.family, profile: entry.profile, viewport: entry.viewport, state: entry.state ?? null });
}

/** Crash-safe case storage. Reuse requires identical provenance and intact evidence. */
export function openMaterialCheckpoint({ directory, provenance, resume = false }) {
  const checkpoint = path.join(directory, 'checkpoint');
  const manifestPath = path.join(checkpoint, 'manifest.json');
  const manifest = { schemaVersion: 1, provenance };
  mkdirSync(checkpoint, { recursive: true });
  if (resume) {
    assert.ok(existsSync(manifestPath), 'No checkpoint manifest exists to resume.');
    assert.deepEqual(JSON.parse(readFileSync(manifestPath, 'utf8')), manifest,
      'Checkpoint provenance differs; use a new artifact directory for the changed run.');
  } else {
    assert.ok(!existsSync(manifestPath), 'Checkpoint already exists; use --resume or a new artifact directory.');
    writeFileSync(manifestPath, JSON.stringify(manifest), { flag: 'wx' });
  }
  const recordPath = (key) => path.join(checkpoint, `${digest(key)}.json`);
  const within = (relative) => {
    const file = path.resolve(directory, relative);
    assert.ok(file.startsWith(path.resolve(directory) + path.sep), 'Checkpoint evidence escapes its artifact directory.');
    return file;
  };
  return {
    provenance,
    load(key) {
      const file = recordPath(key);
      if (!existsSync(file)) return undefined;
      const record = JSON.parse(readFileSync(file, 'utf8'));
      assert.equal(record.key, key, 'Checkpoint case identity changed.');
      assert.equal(record.sha256, digest(JSON.stringify(record.result)), 'Checkpoint result digest changed.');
      assert.ok(record.files.length > 0, 'Checkpoint has no captured evidence.');
      for (const evidence of record.files) assert.equal(digest(readFileSync(within(evidence.file))), evidence.sha256,
        `Checkpoint artifact changed: ${evidence.file}`);
      return record.result;
    },
    save(key, result, evidenceDirectory) {
      const relative = path.relative(directory, evidenceDirectory);
      const absolute = within(relative);
      assert.ok(!absolute.startsWith(checkpoint), 'Checkpoint records are not capture evidence.');
      const files = fingerprintDirectory(absolute).map((entry) => ({ ...entry,
        file: path.join(relative, entry.file).replaceAll('\\', '/') }));
      assert.ok(files.length > 0, 'Cannot checkpoint a case without artifacts.');
      const target = recordPath(key);
      assert.ok(!existsSync(target), 'A completed checkpoint case may not be overwritten.');
      const temporary = `${target}.tmp`;
      writeFileSync(temporary, JSON.stringify({ key, result, sha256: digest(JSON.stringify(result)), files }));
      renameSync(temporary, target);
    },
  };
}
