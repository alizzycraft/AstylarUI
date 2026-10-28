import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { joinBadgeLabelPaint, restoreBadgeLabelPaint, badgeLabelPaintPredecessor } from '../../scripts/join-material-badge-label-paint.mjs';

const hash = b => createHash('sha256').update(b).digest('hex');
const base = 'artifacts/material-parity/working-audit';
// Pinned accepted metadata,not current.json: later publications must not change
// this conservation test's predecessor or implicitly refresh old evidence.
const indexBytes = readFileSync(`${base}/080b1dd5e50131e62b804f4037aa6d87977272f220f169759e3b047c72fa58d4/index.json`);
assert.equal(hash(indexBytes), '3856b79463be9c3737d6173a9bba9876f11eaa08224dd13b21178c0ffff92177');
const evidence = JSON.parse(indexBytes).metadata.coverage.inspectionEvidence;
const parent = { kind: 'case-obligation-coverage-extension', status: 'proposal-not-canonical',
  scope: evidence.scope, groups: evidence.cases };
assert.equal(hash(JSON.stringify(parent)), badgeLabelPaintPredecessor);

test('Badge label join preserves whole predecessor and bounds paint evidence to 40 interactions', t => {
  const pointer = readFileSync(`${base}/current.json`), result = joinBadgeLabelPaint(parent);
  assert.equal(hash(JSON.stringify(parent)), badgeLabelPaintPredecessor, 'Parent mutated');
  assert.deepEqual(restoreBadgeLabelPaint(result.review), parent);
  assert.deepEqual(readFileSync(`${base}/current.json`), pointer);
  assert.equal(result.review.groups.length, 2311);
  const changed = result.review.groups.filter((g, i) => g !== parent.groups[i]);
  assert.equal(changed.length, 40);
  assert.ok(result.review.groups.every(g => g.inspection === 'partial' && g.currentRendering === 'unverified'));
  assert.equal(result.review.groups.filter(g => g.family === 'badge' && g.case.startsWith('static:')).length, 12);
  for (const g of changed) {
    const old = parent.groups.find(p => p.case === g.case), paint = g.obligations.localPaint;
    assert.deepEqual(paint.retainedBadgeCountPaint, old.obligations.localPaint.retainedBadgeCountPaint);
    assert.deepEqual(paint.remaining, old.obligations.localPaint.remaining);
    assert.match(paint.retainedBadgeLabelRegionPaint.boundary, /not label-only/);
  }
  const failures = changed.filter(g => !g.obligations.localPaint.retainedBadgeLabelRegionPaint.metrics.matches);
  assert.equal(failures.length, 5);
  assert.ok(failures.every(g => g.case.startsWith('interaction:badge@contrast/desktop-dpr2/')));
  const bridges = changed.filter(g => g.obligations.localPaint.retainedBadgeLabelRegionPaint.boundedTextureDiagnosis);
  assert.deepEqual(bridges.map(g => g.case).sort(), [
    'interaction:badge@contrast/desktop-dpr1/focus', 'interaction:badge@contrast/desktop-dpr2/focus',
  ]);
  t.diagnostic(JSON.stringify({ predecessor: badgeLabelPaintPredecessor, proposal: result.sha256,
    cases: result.cases, diagnosticFailures: result.diagnosticFailures, bridges: result.bridges,
    authenticatedDependencies: result.authenticatedDependencies, acceptedPointerUnchanged: true,
    completePredecessorRecovered: true, inspectionComplete: false, currentRenderingAccepted: false }));
});

test('Badge label join rejects changed predecessor and corrupt evidence without writing', () => {
  assert.throws(() => joinBadgeLabelPaint({ ...parent, scope: 'altered' }), /AssertionError/);
  for (const suffix of ['badge-label-interaction-paint-20261028.log', 'badge-label-count-overlap-20261028.log',
    'badge-texture-observation.spec.mjs', 'interactions\\badge\\light\\desktop-dpr1\\focus\\reference.png']) {
    let corrupted = false;
    assert.throws(() => joinBadgeLabelPaint(parent, file => {
      const bytes = readFileSync(file);
      if (!file.endsWith(suffix)) return bytes;
      corrupted = true; return Buffer.concat([bytes, Buffer.from('changed')]);
    }), /AssertionError/);
    assert.equal(corrupted, true, `Control did not reach ${suffix}`);
  }
});
