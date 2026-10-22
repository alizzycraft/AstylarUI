import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
// Fill the remaining initial-state AX observation gap without recapturing the
// eight families already observed on this same checkpoint. Classification and
// case closure remain separate from capture/authentication.
assert.equal(process.argv.length, 3, 'Provide a fresh remaining-static AX directory');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const receipt = file => ({ file, sha256: hash(fs.readFileSync(file)) });
const roots = ['passive-static-ax-20261021', 'list-static-ax-current-checkpoint-20261021',
  'card-static-ax-20261021', 'expansion-static-ax-20261021', 'stepper-static-ax-20261022', 'tabs-static-ax-20261022'];
const reused = roots.map(name => receipt(`artifacts/material-parity/${name}/latest-report.json`));
const keys = new Set(), families = new Set();
function authenticateReuse(collect) {
  for (const r of reused) {
    const bytes = fs.readFileSync(r.file); assert.equal(hash(bytes), r.sha256); const report = JSON.parse(bytes);
    assert.equal(report.provenance.checkpoint.sha256, '9d0f1220ea6c2ca95cbfb143d94f7f5680a0d8cb11e074db879768f9763fd5b0');
    for (const p of Object.values(report.provenance).filter(p => p?.file && p?.sha256)) assert.equal(hash(fs.readFileSync(p.file)), p.sha256);
    for (const row of report.observations) {
      const b = fs.readFileSync(path.join(path.dirname(r.file), row.file)); assert.equal(hash(b), row.sha256);
      const o = JSON.parse(b); assert.equal(o.browser, '155.0.8059.80'); assert.deepEqual(o.runtimeErrors, []);
      assert.equal(o.profile, row.profile); assert.equal(o.mode, row.mode); assert.deepEqual(o.viewport, row.viewport);
      let family = row.family;
      if (family === undefined) {
        // Only this authenticated legacy list envelope omits the family field.
        assert.equal(r.sha256, 'bedbf72390784c5731fc594c0076507746581e466e0dd7701fb996ae3a6c5f32');
        assert.equal(o.family, undefined); assert.equal(o.target.astylarId ?? o.target.id, 'list-primary'); family = 'list';
      } else assert.equal(o.family, family);
      if (collect) { const key = `${family}/${row.profile}/${row.viewport.id}/${row.mode}`; assert.ok(!keys.has(key)); keys.add(key); families.add(family); }
    }
  }
}
authenticateReuse(true); assert.equal(keys.size, 192);
assert.deepEqual([...families].sort(), ['card', 'expansion', 'grid-list', 'list', 'sidenav', 'stepper', 'table', 'tabs']);
const base = 'scripts/capture-passive-static-ax.mjs'; let source = fs.readFileSync(base, 'utf8');
function replaceOnce(before, after) { assert.equal(source.split(before).length, 2, before); source = source.replace(before, after); }
replaceOnce("'../tests/material-parity/run-checkpoint.mjs'", "'./tests/material-parity/run-checkpoint.mjs'");
replaceOnce("['sidenav', 'grid-list', 'table'].includes(row.family)", `!${JSON.stringify([...families].sort())}.includes(row.family)`);
replaceOnce('assert.equal(rows.length, 36);', 'assert.equal(rows.length, 340);');
replaceOnce('assert.equal(observations.length, 72);', 'assert.equal(observations.length, 680);');
replaceOnce("writeFileSync(path.join(output, 'producer.mjs'), readFileSync('scripts/capture-passive-static-ax.mjs'));",
  "writeFileSync(path.join(output, 'producer.mjs'), process.execArgv[2]);");
replaceOnce("producer: receipt('scripts/capture-passive-static-ax.mjs')",
  `producer: receipt(path.join(output, 'producer.mjs')), baseProducer: receipt('scripts/capture-passive-static-ax.mjs'), remainingStaticDerivation: receipt('scripts/capture-remaining-static-ax.mjs'), reusedStaticAxReports: ${JSON.stringify(reused)}`);
replaceOnce('for36 pinned static sidenav/grid-list/table contexts', 'for340 remaining pinned static contexts across28 families;96 prior pairs reused separately');
replaceOnce('for (const r of [provenance.producer, provenance.report,',
  'for (const r of [provenance.producer, provenance.baseProducer, provenance.remainingStaticDerivation, ...provenance.reusedStaticAxReports, provenance.report,');
source = 'process.argv.splice(1, 0, "derived-remaining-static-ax");\n' + source;
const result = spawnSync(process.execPath, ['--input-type=module', '-e', source, process.argv[2]],
  { cwd: process.cwd(), env: process.env, stdio: 'inherit', windowsHide: true });
if (result.error) throw result.error;
assert.equal(result.signal, null, 'Remaining AX capture terminated by signal');
authenticateReuse(false);
process.exitCode = result.status ?? 1;
