import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { inspectSliderInputBox } from '../tests/material-parity/slider-input-box-evidence.mjs';

assert.ok(process.argv.length === 2 || process.argv.length === 3 && process.argv[2] === '--check');
const hash = value => createHash('sha256').update(value).digest('hex');
const file = 'docs/material-slider-input-boxes.json';
const captureFile = 'artifacts/material-parity/current-ancestry-audit/latest-report.json';
const bytes = readFileSync(captureFile);
assert.equal(hash(bytes), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
const raw = JSON.parse(bytes), observations = [], cases = [], treeFiles = new Set();
const load = source => {
  assert.ok(source.file.startsWith('artifacts/material-parity/current-ancestry-audit/'));
  const bytes = readFileSync(source.file); assert.equal(hash(bytes), source.sha256);
  treeFiles.add(source.file); return JSON.parse(bytes);
};
for (const [kind, rows] of [['static', raw.results], ['interaction', raw.interactions]]) for (const e of rows.filter(e => e.family === 'slider')) {
  const key = `${kind}:slider@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`;
  const r = load(e.inputTrees.reference), a = load(e.inputTrees.astylar);
  cases.push(key);
  for (const id of ['slider-start', 'slider-primary']) {
    const inputs = e.styleInputs.filter(i => i.id === id); assert.equal(inputs.length, 1);
    const proof = inspectSliderInputBox(e, inputs[0], r, a); assert.ok(proof, `Unreviewed input box: ${key}#${id}`);
    observations.push({ case: key, kind, profile: e.profile, viewport: e.viewport, state: e.state ?? 'static',
      inputTrees: e.inputTrees, ...proof });
  }
}
assert.equal(cases.length, 78); assert.equal(observations.length, 156);
assert.equal(new Set(cases).size, cases.length);
const sourceFiles = ['scripts/audit-material-slider-input-boxes.mjs', 'tests/material-parity/slider-input-box-evidence.mjs',
  'tests/material-parity/slider-input-box-evidence.spec.mjs', 'examples/material-showcase/src/app/astylar.component.ts',
  'examples/material-showcase/node_modules/@angular/material/fesm2022/slider.mjs',
  'src/app/services/dom/style.service.ts', 'src/app/services/dom/style-defaults.service.ts', 'src/app/config/browser-defaults.ts'];
const summary = { cases: cases.length, observations: observations.length, propertyOccurrences: observations.length * 5,
  checkedTreeFiles: treeFiles.size, paddingPatterns: Object.fromEntries([...new Set(observations.map(o =>
    o.properties.slice(0, 4).map(p => p.reference).join(' ')))].map(pattern => [pattern,
    observations.filter(o => o.properties.slice(0, 4).map(p => p.reference).join(' ') === pattern).length])) };
const record = { schemaVersion: 1, kind: 'slider-native-input-box-request-audit', baselineCommit: '9afcdf3',
  capture: { file: captureFile, sha256: hash(bytes) }, summary, cases, observations,
  sourceLocations: [
    { file: sourceFiles[3], lines: [784, 785], introducedBy: 'ce8f3f1c', role: 'fixed 50% candidate width and omitted native padding/content-box requests' },
    { file: sourceFiles[4], lines: [1665, 1673, 1675, 1701], role: 'Material active/inactive peer-dependent native input width and padding' },
    { file: sourceFiles[5], lines: [364], role: 'defaults selected by element.type' },
    { file: sourceFiles[6], lines: [44, 46], role: 'global and element-type defaults merged before author rules' },
    { file: sourceFiles[7], lines: [294, 303], role: 'generic input padding 8px; not an authored Material value' } ],
  sourceFingerprints: sourceFiles.map(file => ({ file, sha256: hash(readFileSync(file)),
    normalizedLfSha256: hash(readFileSync(file, 'utf8').replace(/\r\n/g, '\n')) })),
  limitations: ['Original captured observations and authored box mismatch only; no renderer or comparison modifications.',
    'No main scalar attribution change in this standalone increment. Integration requires original-source binding and complete scalar-row replay.',
    'Do not replace the dynamic reference algorithm with sampled widths or padding constants; preserve state and peer-dependent CSS inputs.',
    'Generic input default compatibility, final used boxes, hit testing, pointer capture and raster require separate equal-input evidence.'],
  inputEquivalent: false, finalRasterVerified: false };
const output = JSON.stringify(record, null, 2) + '\n';
if (process.argv[2] === '--check') assert.equal(readFileSync(file, 'utf8'), output);
else writeFileSync(file, output);
console.log(JSON.stringify({ mode: process.argv[2] ?? 'generate', file, summary, bytes: Buffer.byteLength(output), sha256: hash(output) }));
