// Historical input-proof replay only. Never preload current capture/production.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { syncBuiltinESMExports } from 'node:module';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const main = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (main) {
  assert.equal(process.argv.length, 2, 'Replay the three original endpoint assertions without extra filters');
  const pattern = '^(remaining configured field popup bounds preserve exact actions and all eighty endpoints|configured overlay placement census distinguishes measured boxes from comparator defaults|configured menu bounds authenticate exact runner actions and eight context receipts)$';
  const result = spawnSync(process.execPath, ['--import', import.meta.url, '--test', '--test-name-pattern=' + pattern,
    'tests/material-parity/benchmark-config.spec.mjs'], { stdio: 'inherit', windowsHide: true });
  if (result.error) throw result.error;
  assert.equal(result.signal, null); process.exitCode = result.status ?? 1;
} else {
  const read = fs.readFileSync, hash = bytes => createHash('sha256').update(bytes).digest('hex');
  const compressed = Buffer.from(read('docs/evidence/material-original-runner-e01.mjs.gz.b64', 'utf8').replace(/\s/g, ''), 'base64');
  assert.equal(hash(compressed), 'e4922400a7ee2d64bb531a93a2b490b7478636f45d77dc4d5d854b5321949a85');
  const runner = gunzipSync(compressed);
  assert.equal(runner.length, 96666);
  assert.equal(hash(runner), 'e01ef9dc44386d93885ca06428da0b8b42ccb8bad37f9de99bdd61a5c95c6eb0');
  const originals = new Map([[path.resolve('tests/material-parity/run-material-parity.mjs'), runner]]);
  for (const [name, expected] of [
    ['chunk-3JXWRYJY.js.map', 'dba484044ca0dea965d8ef4b12635673f0f055d7711099d2f6476ca490988ec4'],
    ['chunk-JPEJK334.js.map', '47654b641610e1d56e02948b17fab41aff25e9c6aedc6f83b70a26b6f349ce9e'],
    ['chunk-7SL66K3U.js.map', '67e956a6f4b3b0325fc51b7b45688a27d5e9307095f8b4a20391a96f68244df4'],
  ]) {
    const bytes = read('artifacts/material-parity/retained-evidence/component-map-recovery-20261011/' + name);
    assert.equal(hash(bytes), expected);
    originals.set(path.resolve('examples/material-showcase/dist/material-showcase/browser/' + name), bytes);
  }
  fs.readFileSync = (file, options) => {
    if (typeof file === 'string' && originals.has(path.resolve(file))) {
      const bytes = originals.get(path.resolve(file));
      const encoding = typeof options === 'string' ? options : options?.encoding;
      return encoding ? bytes.toString(encoding) : Buffer.from(bytes);
    }
    return read(file, options);
  };
  fs.writeFileSync = () => { throw Error('READ_ONLY_HISTORICAL_ENDPOINT_REPLAY_WRITE'); };
  syncBuiltinESMExports();
}
