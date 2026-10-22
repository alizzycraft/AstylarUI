import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
// Resume only the demonstrated two-observation partial run. Preserve its raw
// files and failed envelope; capture still uses the exact prior CDP procedure.
assert.ok([3, 4].includes(process.argv.length));
const dryRun = process.argv[3] === '--dry-run';
if (process.argv[3]) assert.ok(dryRun);
const hash = b => createHash('sha256').update(b).digest('hex');
const receipt = file => ({ file, sha256: hash(fs.readFileSync(file)) });
const root = 'artifacts/material-parity/remaining-static-ax-20261022';
const failureReceipt = receipt(`${root}/failure.json`), provenanceReceipt = receipt(`${root}/provenance.json`);
assert.equal(failureReceipt.sha256, '8dcb871088a2b882b1b018331b1a6cb4cd385282ef9104d2a275b2dccc9dcdec');
assert.equal(provenanceReceipt.sha256, '14546de306935bf9f20e0eaa2c326f69f81d7d612d49e4edefbbba1f557030d7');
const provenance = JSON.parse(fs.readFileSync(provenanceReceipt.file));
const failure = JSON.parse(fs.readFileSync(failureReceipt.file));
assert.equal(provenance.producer.sha256, 'd600a7109dc9c23d543689b60b91b9ddece2ae7ef30fa5682e7f720b69c48b01');
assert.equal(provenance.checkpoint.sha256, '9d0f1220ea6c2ca95cbfb143d94f7f5680a0d8cb11e074db879768f9763fd5b0');
assert.ok(failure.error.includes('Timeout 30000ms exceeded')); assert.equal(failure.observations.length, 2);
const keys = new Set(), reusedCompletedObservations = [], priorReports = provenance.reusedStaticAxReports;
const key = r => `${r.family}/${r.profile}/${r.viewport.id}/${r.mode}`;
function authenticate(file, digest) { assert.equal(hash(fs.readFileSync(file)), digest); }
function observe(row, directory, family = row.family) {
  const file = path.join(directory, row.file); authenticate(file, row.sha256); const o = JSON.parse(fs.readFileSync(file));
  assert.equal(o.browser, '155.0.8059.80'); assert.deepEqual(o.runtimeErrors, []);
  assert.equal(o.mode, row.mode); assert.equal(o.profile, row.profile); assert.deepEqual(o.viewport, row.viewport);
  if (row.family === undefined) assert.equal(o.target.astylarId ?? o.target.id, 'list-primary');
  else assert.equal(o.family, family);
  const identity = key({ ...row, family }); assert.ok(!keys.has(identity)); keys.add(identity);
  return { file, sha256: row.sha256, family, profile: row.profile, viewport: row.viewport, mode: row.mode };
}
function validate() {
  for (const r of Object.values(provenance).filter(r => r?.file && r?.sha256)) authenticate(r.file, r.sha256);
  for (const r of priorReports) {
    authenticate(r.file, r.sha256); const report = JSON.parse(fs.readFileSync(r.file));
    assert.equal(report.provenance.checkpoint.sha256, provenance.checkpoint.sha256);
    for (const p of Object.values(report.provenance).filter(p => p?.file && p?.sha256)) authenticate(p.file, p.sha256);
    for (const row of report.observations) {
      if (row.family === undefined) assert.equal(r.sha256, 'bedbf72390784c5731fc594c0076507746581e466e0dd7701fb996ae3a6c5f32');
      observe(row, path.dirname(r.file), row.family ?? 'list');
    }
  }
  assert.equal(keys.size, 192);
  for (const row of failure.observations) {
    assert.equal(row.family, 'core'); assert.equal(row.profile, 'light'); assert.equal(row.viewport.id, 'desktop');
    assert.deepEqual([row.viewport.width, row.viewport.height, row.viewport.deviceScaleFactor], [1440, 1000, 1]);
    reusedCompletedObservations.push(observe(row, root));
  }
  assert.equal(keys.size, 194);
  assert.deepEqual(reusedCompletedObservations.map(r => r.mode), ['reference', 'astylar']);
}
validate();
const report = JSON.parse(fs.readFileSync(provenance.report.file)); assert.equal(report.results.length, 436);
const pending = report.results.filter(row => !['reference', 'astylar'].some(mode => keys.has(key({ ...row, mode }))));
assert.equal(pending.length, 339);
for (const row of report.results) for (const mode of ['reference', 'astylar']) {
  const covered = keys.has(key({ ...row, mode })); assert.equal(pending.includes(row), !covered);
}
assert.equal(keys.size + pending.length * 2, 872);
let source = fs.readFileSync(provenance.producer.file, 'utf8');
function replaceOnce(before, after) { assert.equal(source.split(before).length, 2, before); source = source.replace(before, after); }
replaceOnce('assert.equal(rows.length, 340);',
  "const completedKeys = new Set(['core/light/desktop']);\nconst pendingRows = rows.filter(row => !completedKeys.has(`${row.family}/${row.profile}/${row.viewport.id}`));\nassert.equal(rows.length, 340); assert.equal(pendingRows.length, 339);");
replaceOnce('for (const row of rows) for (const mode', 'for (const row of pendingRows) for (const mode');
replaceOnce('assert.equal(observations.length, 680);', 'assert.equal(observations.length, 678);');
replaceOnce("const provenance = { derivedCapture:", `const provenance = { resumeDerivation: receipt('scripts/resume-remaining-static-ax.mjs'), originalPartialFailure: ${JSON.stringify(failureReceipt)}, originalPartialProvenance: ${JSON.stringify(provenanceReceipt)}, reusedCompletedObservations: ${JSON.stringify(reusedCompletedObservations)}, derivedCapture:`);
replaceOnce('for (const r of [provenance.producer, provenance.baseProducer,',
  'for (const r of [provenance.resumeDerivation, provenance.originalPartialFailure, provenance.originalPartialProvenance, ...provenance.reusedCompletedObservations, provenance.producer, provenance.baseProducer,');
replaceOnce('for340 remaining pinned static contexts across28 families;96 prior pairs reused separately',
  'for339 resumed pinned static contexts across28 families;96 prior pairs and1 completed partial-run pair reused separately');
const output = path.resolve(process.argv[2]); assert.ok(output.startsWith(path.resolve('artifacts/material-parity') + path.sep));
assert.equal(fs.existsSync(output), false);
const summary = { producer: receipt('scripts/resume-remaining-static-ax.mjs'), dryRun, pendingPairs: 339,
  reusedPairs: 97, totalConfiguredPairs: 436, originalPartialFailure: failureReceipt, originalPartialProvenance: provenanceReceipt,
  priorReports, reusedCompletedObservations, derivedProducerSha256: hash(source),
  boundary: 'Exact reuse and resume selection only;dry run starts no browser and proves no new accessibility or rendering outcome.' };
if (dryRun) console.log(JSON.stringify(summary));
else {
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', source, process.argv[2]],
    { cwd: process.cwd(), env: process.env, stdio: 'inherit', windowsHide: true });
  if (result.error) throw result.error; assert.equal(result.signal, null);
  keys.clear(); reusedCompletedObservations.length = 0; validate();
  process.exitCode = result.status ?? 1;
}
