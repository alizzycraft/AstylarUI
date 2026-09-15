import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { inspectSliderBorderDefaults } from '../tests/material-parity/slider-border-default-evidence.mjs';

assert.ok(process.argv.length === 2 || process.argv.length === 3 && process.argv[2] === '--check');
const hash = value => createHash('sha256').update(value).digest('hex');
const captureFile = 'artifacts/material-parity/current-ancestry-audit/latest-report.json';
const outputFile = 'docs/material-slider-border-defaults.json';
const bytes = readFileSync(captureFile);
assert.equal(hash(bytes), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
const original = JSON.parse(bytes), observations = [], cases = [], trees = new Map();
const boundary = realpathSync('artifacts/material-parity/current-ancestry-audit');
const load = source => {
  const absolute = realpathSync(source.file), relative = path.relative(boundary, absolute);
  assert.ok(relative && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
  const bytes = readFileSync(absolute); assert.equal(hash(bytes), source.sha256);
  trees.set(source.file, source.sha256); return JSON.parse(bytes);
};
for (const [kind, entries] of [['static', original.results], ['interaction', original.interactions]]) {
  for (const entry of entries.filter(value => value.family === 'slider')) {
    const key = `${kind}:slider@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`;
    cases.push(key);
    const reference = load(entry.inputTrees.reference), candidate = load(entry.inputTrees.astylar);
    for (const element of ['slider-start', 'slider-primary']) {
      const inputs = entry.styleInputs.filter(input => input.id === element);
      assert.equal(inputs.length, 1);
      const proof = inspectSliderBorderDefaults(entry, inputs[0], reference, candidate);
      assert.ok(proof, `Unreviewed range border owner: ${key}#${element}`);
      observations.push({ case: key, state: entry.state ?? 'static', inputTrees: entry.inputTrees, ...proof });
    }
  }
}
assert.equal(cases.length, 78); assert.equal(new Set(cases).size, 78);
assert.equal(observations.length, 156); assert.equal(trees.size, 156);
const sourceFiles = ['scripts/audit-material-slider-border-defaults.mjs',
  'tests/material-parity/slider-border-default-evidence.mjs',
  'tests/material-parity/slider-border-default-evidence.spec.mjs',
  'tests/material-parity/slider-input-box-evidence.mjs',
  'docs/material-range-default-box-audit.json',
  'examples/material-showcase/src/app/range-default-box-audit.spec.ts',
  'src/app/config/browser-defaults.ts', 'src/app/services/dom/style-defaults.service.ts',
  'src/app/services/dom/style.service.ts', 'docs/compatibility/capabilities.json', 'docs/compatibility/html-css.md'];
const evidence = { schemaVersion: 1, kind: 'slider-native-border-default-policy-audit', baselineCommit: 'cf3be93',
  capture: { file: captureFile, sha256: hash(bytes) },
  publicProof: { file: 'docs/material-range-default-box-audit.json', sha256: hash(readFileSync('docs/material-range-default-box-audit.json')) },
  summary: { cases: cases.length, observations: observations.length, propertyOccurrences: observations.length * 12,
    uniqueOwnerPropertyGroups: new Set(observations.flatMap(owner => owner.properties.map(property =>
      JSON.stringify([owner.element, property.property, property.reference, property.candidate])))).size,
    checkedTreeFiles: trees.size },
  cases, observations,
  sourceFingerprints: sourceFiles.map(file => ({ file, sha256: hash(readFileSync(file)),
    normalizedLfSha256: hash(readFileSync(file, 'utf8').replace(/\r\n/g, '\n')) })),
  limits: ['Standalone original-source audit; no canonical scalar attribution is changed.',
    'Only twelve physical border-width/style/radius properties; colors, appearance and other input differences remain unclassified here.',
    'A shared omitted border request does not make the whole Material input equivalent; padding, box sizing, domains and peer-dependent widths differ.',
    'The public reproduction demonstrates a default-driven box effect, not the exact used-box or hit-area delta of the original unequal Material inputs.',
    'Do not add candidate-only border resets; address core default policy and reconcile the catalog claim under the same-input contract.'] };
const output = JSON.stringify(evidence, null, 2) + '\n';
if (process.argv[2] === '--check') assert.equal(readFileSync(outputFile, 'utf8'), output);
else writeFileSync(outputFile, output);
console.log(JSON.stringify({ mode: process.argv[2] ?? 'generate', file: outputFile,
  summary: evidence.summary, bytes: Buffer.byteLength(output), sha256: hash(output) }));
