import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const file = process.argv[2]; assert.ok(file);
const bytes = readFileSync(file);
const text = bytes[0] === 0xff && bytes[1] === 0xfe ? bytes.toString('utf16le').slice(1) : bytes.toString('utf8');
const records = text.trim().split(/\r?\n/).map(line => JSON.parse(line));
assert.equal(records.length, 5);
const report = records.at(-1);
const producer = 'scripts/audit-material-divider-alignment-inputs.mjs';
assert.equal(report.producerSha256, hash(readFileSync(producer)));
assert.equal(report.baseline.sha256, hash(readFileSync(report.baseline.file)));
const baseline = JSON.parse(readFileSync(report.baseline.file));
const expectedAssets = new Map(baseline.captureProvenance.browserFiles.map(row => [row.file, row.sha256]));
const assets = new Map();
const fields = ['alignItems', 'alignContent', 'justifyContent'];
const geometry = rows => rows.map(row => ({ id: row.id, layout: row.layout }));
function verify(observation) {
  assert.equal(observation.originalUnchanged, true); assert.deepEqual(observation.errors, []);
  assert.equal(observation.dpr, 1); assert.deepEqual(observation.viewport, [1440, 1000]);
  assert.deepEqual(observation.initial.map(row => row.id), ['divider-above-row', 'divider-above', 'divider-below-row', 'divider-below']);
  assert.ok(observation.initial.every(row => row.layout.source === 'core-dimension-registry'));
  for (const row of observation.initial)
    assert.deepEqual(fields.map(field => row.values[field]), ['stretch', 'stretch', 'flex-start']);
  assert.deepEqual(observation.variants.map(row => row.name), [...fields, 'combined', 'height-control']);
  for (const [index, variant] of observation.variants.slice(0, 4).entries()) {
    const expected = index < 3 ? { [fields[index]]: 'normal' } : Object.fromEntries(fields.map(field => [field, 'normal']));
    assert.deepEqual(variant.overrides, expected);
    for (const row of variant.rows) for (const [field, value] of Object.entries(expected)) assert.equal(row.values[field], value);
    assert.deepEqual(geometry(variant.rows), geometry(observation.initial));
  }
  const control = observation.variants[4], initial = observation.initial[0];
  assert.equal(control.requestedHeight, initial.layout.height + 3);
  assert.equal(control.rows.find(row => row.id === initial.id).layout.height, control.requestedHeight);
  assert.notDeepEqual(geometry(control.rows), geometry(observation.initial));
  assert.deepEqual(observation.restored, observation.initial);
}
assert.deepEqual(report.results.map(row => row.profile), ['light', 'dark', 'contrast', 'custom']);
for (const [index, row] of report.results.entries()) {
  assert.equal(row.side, 'astylar');
  assert.deepEqual(records[index], { phase: 'alignment-observation', profile: row.profile, side: row.side, observation: row.observation });
  verify(row.observation);
  assert.ok(row.assets.length > 0);
  for (const asset of row.assets) {
    assert.equal(asset.sha256, expectedAssets.get(asset.file));
    if (!assets.has(asset.file)) assets.set(asset.file, hash(readFileSync(path.join('examples/material-showcase/dist/material-showcase/browser', asset.file))));
    assert.equal(assets.get(asset.file), asset.sha256);
  }
}
let controls = 0;
for (const mutate of [
  value => { value.variants[0].rows[0].values.alignItems = 'stretch'; },
  value => { value.variants[1].rows[0].layout.height += 1; },
  value => { value.variants[4].rows[0].layout.height = value.initial[0].layout.height; },
  value => { value.restored[0].layout.height += 1; },
]) {
  const value = structuredClone(report.results[0].observation); mutate(value);
  assert.throws(() => verify(value)); controls++;
}
console.log(JSON.stringify({ producer: { file: 'scripts/check-divider-alignment-inputs.mjs', sha256: hash(readFileSync(import.meta.filename)) },
  capture: { file, sha256: hash(bytes) }, captureProducerSha256: report.producerSha256,
  browser: report.browser, contexts: 4, alignmentVariants: 16, heightControls: 4,
  restoredContexts: 4, authenticatedServedAssets: assets.size, rejectedMutations: controls,
  boundary: report.boundary }));
