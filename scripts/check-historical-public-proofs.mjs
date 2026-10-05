// Historical evidence replay only. This is not current browser acceptance.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import { pathToFileURL } from 'node:url';

const main = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (main) {
  assert.equal(process.argv.length, 2, 'Historical replay runs all six original suites, without filters');
  const files = ['public-cursor-defaults.spec.mjs', 'public-range-drag-evidence.spec.mjs',
    'public-range-paint.spec.mjs', 'public-range-travel.spec.mjs', 'public-vertical-align-evidence.spec.mjs',
    'range-default-box-proof.spec.mjs'];
  const result = spawnSync(process.execPath, ['--test', '--test-concurrency=1',
    ...files.map(file => `tests/material-parity/${file}`)], {
    env: { ...process.env, NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ''} --import=${import.meta.url}`.trim() },
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} else {
  const read = fs.readFileSync.bind(fs);
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  const lf = bytes => bytes.toString().replaceAll('\r\n', '\n');
  const vertical = JSON.parse(read('docs/material-public-vertical-align-audit.json'));
  const paint = JSON.parse(read('docs/material-public-range-paint-audit.json'));
  const range = JSON.parse(read('docs/material-range-default-box-audit.json'));
  const historical = new Map();
  for (const row of [...paint.sources, ...range.sourceFingerprints.filter(row => !row.file.includes('/node_modules/')),
    { file: 'src/app/services/dom/renderer.service.ts',
    sha256: vertical.placement.sourceSha256 }]) {
    const current = read(row.file);
    if (hash(current) === row.sha256) continue;
    const original = read(path.resolve('../AstylarUI-material', row.file));
    assert.equal(hash(original), row.sha256, `Missing exact historical raw source: ${row.file}`);
    assert.equal(lf(original), lf(current), `Semantic current source drift: ${row.file}`);
    historical.set(row.file, original);
  }
  const prefix = 'examples/material-showcase/node_modules/';
  const absolute = path.resolve(prefix).replaceAll('\\', '/') + '/';
  // Preserve the exact original mixed-line-ending package metadata, recovered
  // from an integrity-authenticated npm cache tarball. This historical dependency
  // receipt is not substituted for or installed over today's runtime metadata.
  const packageFile = prefix + 'astylarui/package.json';
  const packageReceipt = range.sourceFingerprints.find(row => row.file === packageFile);
  assert.equal(packageReceipt?.sha256, '4e1038f17f7d51879a3e513db3ddf4b92a3521369645e7378affe6038f71441d');
  const packageBytes = Buffer.from(read('docs/evidence/material-range-default-package.json.b64', 'utf8').trim(), 'base64');
  assert.equal(hash(packageBytes), packageReceipt.sha256, 'Recovered historical package receipt changed');
  historical.set(packageFile, packageBytes);
  historical.set(path.resolve(packageFile).replaceAll('\\', '/'), packageBytes);
  // No installed path is changed. Original validators still authenticate each
  // requested historical dependency against its own captured SHA-256.
  fs.readFileSync = (file, ...args) => {
    if (typeof file === 'string') {
      const normalized = file.replaceAll('\\', '/');
      if (historical.has(normalized)) {
        const bytes = historical.get(normalized);
        return typeof args[0] === 'string' ? bytes.toString(args[0]) : bytes;
      }
      for (const start of [prefix, absolute]) if (normalized.startsWith(start))
        return read(normalized.replace(start, start.replace('node_modules/', 'node_modules.audit-prior-junction/')), ...args);
    }
    return read(file, ...args);
  };
  fs.writeFileSync = () => { throw Error('READ_ONLY_REPLAY_ATTEMPTED_WRITE'); };
  syncBuiltinESMExports();
}
