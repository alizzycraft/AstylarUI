import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const file = process.argv[2]; assert.ok(file);
const bytes = readFileSync(file);
const text = bytes[0] === 0xff && bytes[1] === 0xfe ? bytes.toString('utf16le').slice(1) : bytes.toString('utf8');
const lines = text.trim().split(/\r?\n/).map(line => JSON.parse(line));
assert.equal(lines.length, 41);
const report = lines.at(-1);
assert.equal(report.producerSha256, hash(readFileSync('scripts/audit-material-divider-frame-sizes.mjs')));
assert.equal(report.baseline.sha256, hash(readFileSync(report.baseline.file)));
const baseline = JSON.parse(readFileSync(report.baseline.file));
const expectedAssets = new Map(baseline.captureProvenance.browserFiles.map(row => [row.file, row.sha256]));
const assets = new Map(), contexts = new Map();
const boxFields = ['left', 'top', 'right', 'bottom', 'width', 'height'];
const key = row => `${row.profile}/${row.context.width}/${row.context.height}/${row.context.deviceScaleFactor}`;
for (const [index, row] of report.results.entries()) {
  assert.deepEqual(lines[index], { phase: 'frame-size-observation', profile: row.profile, side: row.side, context: row.context, observation: row.observation });
  assert.deepEqual(row.observation.viewport, { width: row.context.width, height: row.context.height, dpr: row.context.deviceScaleFactor });
  for (const field of boxFields) assert.ok(Number.isFinite(row.observation.frameBox[field]));
  const pair = contexts.get(key(row)) ?? {};
  assert.ok(['reference', 'astylar'].includes(row.side)); assert.equal(pair[row.side], undefined);
  pair[row.side] = row; contexts.set(key(row), pair);
  assert.ok(row.assets.length > 0);
  for (const asset of row.assets) {
    assert.equal(asset.sha256, expectedAssets.get(asset.file));
    if (!assets.has(asset.file)) assets.set(asset.file, hash(readFileSync(path.join('examples/material-showcase/dist/material-showcase/browser', asset.file))));
    assert.equal(assets.get(asset.file), asset.sha256);
  }
}
assert.equal(report.results.length, 40); assert.equal(contexts.size, 20);
const configured = JSON.parse(readFileSync('artifacts/material-parity/current-full-20261005/latest-report.json'));
const required = new Set([...configured.results, ...configured.interactions].filter(row => row.family === 'divider')
  .map(row => `${row.profile}/${row.viewport.width}/${row.viewport.height}/${row.viewport.deviceScaleFactor}`));
assert.deepEqual([...contexts.keys()].sort(), [...required].sort());
const observations = [];
for (const [context, pair] of contexts) {
  assert.deepEqual(Object.keys(pair).sort(), ['astylar', 'reference']);
  const native = pair.reference.observation, candidate = pair.astylar.observation;
  assert.deepEqual(candidate.errors, []);
  assert.equal(candidate.retained.source, 'core-dimension-registry');
  assert.equal(native.computed.boxSizing, 'border-box');
  assert.equal(Object.hasOwn(candidate.normal, 'boxSizing'), false);
  assert.equal(Object.hasOwn(candidate.effective, 'boxSizing'), false);
  assert.equal(candidate.effective.width, '100%'); assert.equal(candidate.effective.minHeight, '100%');
  observations.push({ context, reference: native.frameBox, astylar: candidate.frameBox,
    error: Object.fromEntries(boxFields.map(field => [field, candidate.frameBox[field] - native.frameBox[field]])),
    retained: { width: candidate.retained.width, height: candidate.retained.height },
    boundary: 'Measured extents,not proof of equivalent percentage/box-model constraints or equal pixels.' });
}
console.log(JSON.stringify({ producer: { file: 'scripts/check-divider-frame-sizes.mjs', sha256: hash(readFileSync(import.meta.filename)) },
  capture: { file, sha256: hash(bytes) }, browser: report.browser, physicalContexts: contexts.size,
  authoredCaseAliases: [...configured.results, ...configured.interactions].filter(row => row.family === 'divider').length,
  authenticatedServedAssets: assets.size, maximumAbsoluteFrameError: Math.max(...observations.flatMap(row => Object.values(row.error).map(Math.abs))),
  observations, boundary: report.boundary }));
