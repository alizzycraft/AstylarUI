import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { joinCaptureAvailability, restoreCaptureAvailability, inspectCaptureAvailability,
  captureAvailabilityPredecessor } from '../../scripts/join-material-capture-availability.mjs';

const hash = b => createHash('sha256').update(b).digest('hex');
const base = 'artifacts/material-parity/working-audit';
const bytes = readFileSync(`${base}/e1072eadfbfdd91ccaf266c93caffcbc80d707b5438073c54ed30b763e8f82df/index.json`);
assert.equal(hash(bytes), 'ec8dad55ba45ad9b1bec640ae9a0a9d20927e43277faec87cc067e80d297fbc0');
const evidence = JSON.parse(bytes).metadata.coverage.inspectionEvidence;
const parent = { kind: 'case-obligation-coverage-extension', status: 'proposal-not-canonical',
  scope: evidence.scope, groups: evidence.cases };
assert.equal(hash(JSON.stringify(parent)), captureAvailabilityPredecessor);

test('capture availability corrects only 16 exact cases and recovers the complete predecessor', t => {
  const pointer = readFileSync(`${base}/current.json`), result = joinCaptureAvailability(parent);
  assert.deepEqual(restoreCaptureAvailability(result.review), parent);
  assert.equal(hash(JSON.stringify(parent)), captureAvailabilityPredecessor);
  assert.deepEqual(readFileSync(`${base}/current.json`), pointer);
  const changed = result.review.groups.filter((g, i) => g !== parent.groups[i]);
  assert.equal(changed.length, 16);
  assert.deepEqual(Object.fromEntries(['chips', 'stepper'].map(f => [f, changed.filter(g => g.family === f).length])),
    { chips: 8, stepper: 8 });
  for (const g of changed) {
    const previous = parent.groups.find(p => p.case === g.case);
    assert.equal(g.inspection, 'partial'); assert.equal(g.currentRendering, 'unverified');
    assert.deepEqual(g.obligations.sourceCurrentness.remaining, previous.obligations.sourceCurrentness.remaining);
    assert.equal(g.obligations.sourceCurrentness.disposition, previous.obligations.sourceCurrentness.disposition);
    assert.equal(g.obligations.sourceCurrentness.supplementaryCaptureAvailability.currentRenderingAccepted, false);
  }
  t.diagnostic(JSON.stringify({ proposal: result.sha256, cases: result.cases, acceptedPointerUnchanged: true }));
});

test('availability matcher rejects wrong builds, browsers, duplicate assets and nonexact cases', () => {
  const assets = [{ file: 'main.js', sha256: 'a'.repeat(64) }];
  const report = { browser: 'historical', results: [{ family: 'chips', profile: 'light',
    viewport: { id: 'desktop-dpr1' }, state: 'activate-alternate' }] };
  const provenance = { browser: 'historical', browserFiles: assets };
  const key = 'interaction:chips@light/desktop-dpr1/activate-alternate';
  assert.equal(inspectCaptureAvailability(key, report, provenance, assets).currentRenderingAccepted, false);
  assert.throws(() => inspectCaptureAvailability(key, report, provenance, [{ file: 'main.js', sha256: 'b'.repeat(64) }]));
  assert.throws(() => inspectCaptureAvailability(key, { ...report, browser: 'other' }, provenance, assets));
  assert.throws(() => inspectCaptureAvailability(key, report, { ...provenance, browserFiles: [...assets, ...assets] }, assets));
  assert.throws(() => inspectCaptureAvailability(key, { ...report, results: [...report.results, ...report.results] }, provenance, assets));
  assert.throws(() => inspectCaptureAvailability('interaction:chips@light/desktop-dpr2/activate-alternate', report, provenance, assets));
  assert.throws(() => inspectCaptureAvailability('interaction:snack-bar@light/desktop-dpr1/auto-dismiss', {
    ...report, results: [{ family: 'snack-bar', profile: 'light', viewport: { id: 'desktop-dpr1' }, state: 'expired' }],
  }, provenance, assets));
});

test('availability join rejects predecessor drift and corrupted reports without publishing', () => {
  assert.throws(() => joinCaptureAvailability({ ...parent, scope: 'changed' }));
  let reached = false;
  assert.throws(() => joinCaptureAvailability(parent, file => {
    const data = readFileSync(file);
    if (!file.endsWith('chips-alternate-observed-20261026/latest-report.json')) return data;
    reached = true; return Buffer.concat([data, Buffer.from('changed')]);
  }));
  assert.equal(reached, true);
});
