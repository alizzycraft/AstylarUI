import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

// Reuse the retained capture procedure without changing its receipt-bound source.
// The executed derived source is preserved as producer.mjs in the new run.
assert.equal(process.argv.length, 3, 'Provide a fresh card capture directory');
const base = 'scripts/capture-passive-static-ax.mjs';
let source = fs.readFileSync(base, 'utf8');
function replaceOnce(before, after) {
  assert.equal(source.split(before).length, 2, `Unexpected base capture: ${before}`);
  source = source.replace(before, after);
}
replaceOnce("'../tests/material-parity/run-checkpoint.mjs'", "'./tests/material-parity/run-checkpoint.mjs'");
replaceOnce("['sidenav', 'grid-list', 'table'].includes(row.family)", "row.family === 'card'");
replaceOnce('assert.equal(rows.length, 36);', 'assert.equal(rows.length, 12);');
replaceOnce('assert.equal(observations.length, 72);', 'assert.equal(observations.length, 24);');
replaceOnce("writeFileSync(path.join(output, 'producer.mjs'), readFileSync('scripts/capture-passive-static-ax.mjs'));",
  "writeFileSync(path.join(output, 'producer.mjs'), process.execArgv[2]);");
replaceOnce("producer: receipt('scripts/capture-passive-static-ax.mjs')",
  "producer: receipt(path.join(output, 'producer.mjs')), baseProducer: receipt('scripts/capture-passive-static-ax.mjs'), cardDerivation: receipt('scripts/capture-card-static-ax.mjs')");
replaceOnce('for36 pinned static sidenav/grid-list/table contexts', 'for12 pinned static card contexts');
source = 'process.argv.splice(1, 0, "derived-card-ax-capture");\n' + source;
const result = spawnSync(process.execPath, ['--input-type=module', '-e', source, process.argv[2]],
  { cwd: process.cwd(), env: process.env, stdio: 'inherit', windowsHide: true });
if (result.error) throw result.error;
assert.equal(result.signal, null, 'Card capture terminated by signal');
process.exitCode = result.status ?? 1;
