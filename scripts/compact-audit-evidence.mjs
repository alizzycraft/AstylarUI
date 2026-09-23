// Storage-only compaction. Historical evidence must never be substituted with newer results.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const sha = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function within(root, relative) {
  const file = path.resolve(root, relative), rel = path.relative(root, file);
  assert.ok(rel && !rel.startsWith('..') && !path.isAbsolute(rel), 'Path escapes evidence root');
  let current = root;
  for (const part of rel.split(path.sep)) {
    current = path.join(current, part);
    if (fs.existsSync(current)) assert.ok(!fs.lstatSync(current).isSymbolicLink(), `Unexpected link: ${current}`);
  }
  return file;
}
function checkedRoot(root) {
  root = path.resolve(root);
  assert.equal(fs.realpathSync(root).toLowerCase(), root.toLowerCase(), 'Supply the physical directory, not a junction');
  return root;
}
export function planCompaction(root, runs) {
  root = checkedRoot(root);
  assert.equal(new Set(runs).size, runs.length);
  const sizes = new Map(); let totalBytes = 0, files = 0;
  for (const run of runs) {
    assert.match(run, /^[a-zA-Z0-9][a-zA-Z0-9-]+$/);
    const visit = dir => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        assert.ok(!entry.isSymbolicLink(), 'Evidence trees must not contain links');
        const file = path.join(dir, entry.name);
        if (entry.isDirectory()) visit(file);
        else if (entry.isFile()) {
          const stat = fs.statSync(file); files++; totalBytes += stat.size;
          // Small files save little and need not acquire shared-file semantics.
          if (stat.size < 4096 || stat.nlink > 1) continue;
          const list = sizes.get(stat.size) ?? []; list.push(path.relative(root, file).replaceAll('\\', '/'));
          sizes.set(stat.size, list);
        }
      }
    };
    visit(within(root, run));
  }
  const groups = [];
  for (const [bytes, candidates] of sizes) {
    if (candidates.length < 2) continue;
    const hashes = new Map();
    for (const relative of candidates) {
      // Candidates came from the link-rejecting traversal above.
      const digest = sha(path.join(root, relative)), list = hashes.get(digest) ?? [];
      list.push(relative); hashes.set(digest, list);
    }
    for (const [sha256, aliases] of hashes) if (aliases.length > 1) groups.push({ sha256, bytes, aliases });
  }
  return { schemaVersion: 1, root, runs, files, totalBytes,
    reclaimableBytes: groups.reduce((n, g) => n + g.bytes * (g.aliases.length - 1), 0), groups };
}
export function applyCompaction(plan) {
  const root = checkedRoot(plan.root);
  const objects = within(root, 'retained-evidence/objects');
  fs.mkdirSync(objects, { recursive: true });
  // Persist recovery/provenance information before changing any artifact path.
  const manifest = within(root, 'retained-evidence/compaction-manifest.json');
  if (fs.existsSync(manifest)) assert.deepEqual(JSON.parse(fs.readFileSync(manifest)), plan);
  else fs.writeFileSync(manifest, JSON.stringify(plan, null, 2), { flag: 'wx' });
  let completed = 0;
  for (const group of plan.groups) {
    assert.match(group.sha256, /^[a-f0-9]{64}$/);
    const object = within(root, `retained-evidence/objects/${group.sha256}`);
    if (fs.existsSync(object)) assert.equal(sha(object), group.sha256, 'Retained object was changed');
    for (const relative of group.aliases) {
      assert.ok(plan.runs.includes(relative.split('/')[0]), 'Alias is outside selected snapshots');
      const alias = within(root, relative), backup = within(root, `${relative}.retention-backup`);
      // Recover an interrupted link replacement without discarding its original bytes.
      if (!fs.existsSync(alias) && fs.existsSync(backup)) fs.renameSync(backup, alias);
      if (!fs.existsSync(alias) && fs.existsSync(object)) fs.linkSync(object, alias);
      assert.equal(fs.statSync(alias).size, group.bytes);
      assert.equal(sha(alias), group.sha256, `Evidence changed since planning: ${relative}`);
      if (!fs.existsSync(object)) {
        fs.renameSync(alias, object);
        fs.linkSync(object, alias);
      } else {
        const a = fs.statSync(alias, { bigint: true }), o = fs.statSync(object, { bigint: true });
        if (a.dev !== o.dev || a.ino !== o.ino) {
          assert.ok(!fs.existsSync(backup), `Unresolved recovery file: ${backup}`);
          fs.renameSync(alias, backup);
          try { fs.linkSync(object, alias); }
          catch (error) { fs.renameSync(backup, alias); throw error; }
        }
      }
      const linked = fs.statSync(alias, { bigint: true }), retained = fs.statSync(object, { bigint: true });
      assert.equal(linked.dev, retained.dev); assert.equal(linked.ino, retained.ino);
      if (fs.existsSync(backup)) {
        assert.equal(sha(backup), group.sha256);
        fs.unlinkSync(backup);
      }
    }
    // All aliases share this attribute: archived evidence cannot be overwritten in place.
    fs.chmodSync(object, 0o444);
    if (++completed % 1000 === 0) console.log(`Compacted ${completed}/${plan.groups.length} duplicate groups`);
  }
  return verifyCompaction(plan);
}
export function verifyCompaction(plan) {
  const root = checkedRoot(plan.root); let aliases = 0;
  for (const group of plan.groups) {
    const object = within(root, `retained-evidence/objects/${group.sha256}`);
    assert.equal(sha(object), group.sha256);
    const o = fs.statSync(object, { bigint: true });
    for (const relative of group.aliases) {
      const alias = within(root, relative), a = fs.statSync(alias, { bigint: true });
      assert.equal(a.size, BigInt(group.bytes)); assert.equal(a.dev, o.dev); assert.equal(a.ino, o.ino);
      // Equal volume/file IDs prove these paths name the object already hashed above.
      aliases++;
    }
  }
  return { groups: plan.groups.length, verifiedAliases: aliases, reclaimedLogicalBytes: plan.reclaimableBytes };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [mode, file, root, ...runs] = process.argv.slice(2);
  if (mode === 'plan') {
    const plan = planCompaction(root, runs);
    fs.writeFileSync(file, JSON.stringify(plan, null, 2), { flag: 'wx' });
    console.log(JSON.stringify({ ...plan, groups: plan.groups.length }));
  } else if (mode === 'extend') {
    const plan = JSON.parse(fs.readFileSync(file));
    const extra = planCompaction(plan.root, [root, ...runs]);
    assert.ok(extra.runs.every(run => !plan.runs.includes(run)));
    const groups = new Map(plan.groups.map(g => [g.sha256, g]));
    for (const group of extra.groups) {
      const previous = groups.get(group.sha256);
      if (previous) { assert.equal(previous.bytes, group.bytes); previous.aliases.push(...group.aliases); }
      else groups.set(group.sha256, group);
    }
    plan.runs.push(...extra.runs); plan.files += extra.files; plan.totalBytes += extra.totalBytes;
    plan.groups = [...groups.values()];
    plan.reclaimableBytes = plan.groups.reduce((n, g) => n + g.bytes * (g.aliases.length - 1), 0);
    fs.writeFileSync(file, JSON.stringify(plan, null, 2));
    console.log(JSON.stringify({ files: plan.files, reclaimableBytes: plan.reclaimableBytes, groups: plan.groups.length }));
  } else {
    assert.ok(['apply', 'verify'].includes(mode), 'Use plan PLAN ROOT RUN... | apply PLAN | verify PLAN');
    const plan = JSON.parse(fs.readFileSync(file));
    console.log(JSON.stringify(mode === 'apply' ? applyCompaction(plan) : verifyCompaction(plan)));
  }
}
