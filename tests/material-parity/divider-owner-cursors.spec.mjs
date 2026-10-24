import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { effectiveBrowserCursor } from './cursor-metrics.mjs';

const hash = b => createHash('sha256').update(b).digest('hex');
test('Divider outside-owner cursor evidence preserves exact points and retained asset receipts', () => {
  const bytes = readFileSync('artifacts/material-parity/divider-owner-cursors-20261025.log');
  assert.equal(hash(bytes), 'ac5fd38bc77ecddf2008debd6c5bc6d54412056c9ce406d2a3e816621d4c175b');
  const report = JSON.parse(bytes.toString('utf16le').replace(/^\ufeff/, ''));
  assert.equal(report.producerSha256, hash(readFileSync('scripts/audit-material-divider-owner-cursors.mjs')));
  for (const receipt of [report.baseline, report.cursorMetric]) assert.equal(hash(readFileSync(receipt.file)), receipt.sha256);
  assert.equal(hash(readFileSync('scripts/audit-material-divider-baselines.mjs')), 'bb87aa6576b1c52b9c2aa077a94ddba832802942c0096fac3717d3ca2eac638f');
  assert.equal(report.browser, '155.0.8059.85');
  const validate = results => {
    assert.equal(results.length, 8);
    assert.deepEqual(results.map(r => `${r.profile}:${r.side}`), ['light','dark','contrast','custom'].flatMap(p => [`${p}:reference`,`${p}:astylar`]));
    for (const row of results) {
      assert.deepEqual(row.observation.points.map(p => p.id), ['page','eyebrow','title','divider-above-row','divider-below-row']);
      for (const point of row.observation.points) {
        const text = ['title','eyebrow'].includes(point.id);
        assert.equal(point.inViewport, true);
        assert.ok(point.point.x >= 0 && point.point.x < 1440 && point.point.y >= 0 && point.point.y < 1000);
        assert.equal(point.effectiveCursor, text ? 'text' : 'default');
        assert.equal(point.effectiveCursor, effectiveBrowserCursor(point.authoredCursor, point.hasSelectableTextAtPoint));
        assert.equal(point.hasSelectableTextAtPoint, row.side === 'reference' && text);
        assert.equal(point.hitType, row.side === 'astylar' ? 'canvas' : point.id === 'page' ? 'main' : point.id === 'title' ? 'h1' : 'p');
        if (row.side === 'astylar') assert.equal(point.intendedId, point.id);
      }
    }
  };
  validate(report.results);
  const changed = structuredClone(report.results); changed[1].observation.points[1].effectiveCursor = 'default';
  assert.throws(() => validate(changed));
  const retargeted = structuredClone(report.results); retargeted[0].observation.points[0].id = 'divider-root';
  assert.throws(() => validate(retargeted));
  const assets = new Map();
  for (const row of report.results) for (const asset of row.assets) {
    if (assets.has(asset.file)) assert.equal(assets.get(asset.file), asset.sha256);
    assets.set(asset.file, asset.sha256);
  }
  assert.equal(assets.size, 521);
  for (const [file, sha256] of assets) assert.equal(hash(readFileSync(`examples/material-showcase/dist/material-showcase/browser/${file}`)), sha256);
  assert.match(report.boundary, /Not original action replay,current source/);
  assert.match(report.boundary, /masking inputs/);
});
