// Historical applicability only: never preload current capture or production.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { syncBuiltinESMExports } from 'node:module';
import { pathToFileURL } from 'node:url';
import { restoreAstylarDiagnostics } from '../tests/material-parity/alignment-survey-conservation.mjs';

const main = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (main) {
  assert.equal(process.argv.length, 2, 'Run all six original retained assertions without extra filters');
  const result = spawnSync(process.execPath, ['--test',
    '--test-name-pattern=retained (progress paint|compact empty|keyboard profiles|applied-theme popup|selection states|tooltip textures)',
    'tests/material-parity/input-equivalence-audit.spec.mjs'], {
    env: { ...process.env, NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ''} --import=${import.meta.url}`.trim() },
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} else {
  const read = fs.readFileSync.bind(fs);
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  const lf = bytes => bytes.toString().replaceAll('\r\n', '\n');
  const sorter = 'tests/material-parity/sort-focus-structure.spec.mjs';
  const originalSorter = execFileSync('git', ['show',
    `a6217c5173f956ab57dba74013e14dd89b61245f:${sorter}`], { maxBuffer: 4_000_000 });
  assert.equal(hash(originalSorter), '7f1af071e1204192337c22774d4b76889992bfc9631c136ed33f744f6101ce83');
  let currentSorter = lf(read(sorter));
  for (const [added, prior] of [
    ["  const browserRoot = path.resolve(process.env.ASTYLAR_MATERIAL_SHOWCASE_BROWSER_ROOT ??\n    'examples/material-showcase/dist/material-showcase/browser');",
      "  const browserRoot = path.resolve('examples/material-showcase/dist/material-showcase/browser');"],
    ["  const checkpointFile = process.env.ASTYLAR_MATERIAL_SHOWCASE_CHECKPOINT ??\n    'artifacts/material-parity/caret-visible-checkpoint-154/checkpoint/manifest.json';\n  const checkpoint = JSON.parse(readFileSync(checkpointFile));",
      "  const checkpoint = JSON.parse(readFileSync('artifacts/material-parity/caret-visible-checkpoint-154/checkpoint/manifest.json'));"],
  ]) {
    assert.equal(currentSorter.split(added).length, 2, 'Exact launch addition must occur once');
    currentSorter = currentSorter.replace(added, prior);
  }
  assert.equal(currentSorter, lf(originalSorter), 'Unreviewed sorter source drift');
  const component = 'examples/material-showcase/src/app/astylar.component.ts';
  const originalComponent = read(path.resolve('../AstylarUI-material', component));
  assert.equal(hash(originalComponent), '2c2979adc26453138e25dffeaeed18d3669514994eea662236ca8649ea00a863');
  assert.equal(restoreAstylarDiagnostics(read(component, 'utf8')), lf(originalComponent),
    'Unreviewed component source drift');
  const originals = new Map([[path.resolve(sorter), originalSorter], [path.resolve(component), originalComponent]]);
  fs.readFileSync = (file, ...args) => {
    if (typeof file === 'string' && originals.has(path.resolve(file))) {
      const bytes = originals.get(path.resolve(file));
      const encoding = typeof args[0] === 'string' ? args[0] : args[0]?.encoding;
      return encoding ? bytes.toString(encoding) : bytes;
    }
    return read(file, ...args);
  };
  fs.writeFileSync = () => { throw Error('READ_ONLY_REPLAY_ATTEMPTED_WRITE'); };
  syncBuiltinESMExports();
}
