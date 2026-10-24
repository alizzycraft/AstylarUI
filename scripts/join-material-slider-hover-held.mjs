import assert from 'node:assert/strict';
import { readFileSync, statfsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { saveReviewProposal } from './audit-findings-store.mjs';

export const sliderHoverHeldPredecessor = 'aeb1ef1452d65ab53677088ee2944bdf453a7b0d2e0e9f6fed0f987a4e3f4a36';
export const sliderHoverHeldCapture = {
  file: 'artifacts/material-parity/slider-hover-held-20261024/latest-report.json',
  sha256: 'de4228f971a0b0b341a21c9d71a20d9f351701ec634257732c6ed6d929a8ec98',
};
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

export function joinSliderHoverHeld(predecessor, captureBytes, read = readFileSync) {
  assert.equal(hash(JSON.stringify(predecessor)), sliderHoverHeldPredecessor);
  assert.equal(hash(captureBytes), sliderHoverHeldCapture.sha256);
  const capture = JSON.parse(captureBytes), review = structuredClone(predecessor);
  assert.equal(capture.results.length, 16);
  const producer = 'scripts/join-material-slider-hover-held.mjs';
  const changed = [], seen = new Set();
  for (const row of capture.results) {
    const key = `interaction:${row.family}@${row.profile}/${row.viewport.id}/${row.state}`;
    assert.match(key, /^interaction:slider@(light|dark|contrast|custom)\/desktop-dpr[12]\/(hover|held)$/);
    assert.ok(!seen.has(key)); seen.add(key);
    const groups = review.groups.filter(group => group.case === key); assert.equal(groups.length, 1);
    const group = groups[0], activation = group.obligations.authoredActivation;
    assert.equal(group.inspection, 'partial'); assert.equal(group.currentRendering, 'unverified');
    assert.equal(activation.disposition, 'evidence-join-pending');
    assert.equal(activation.configuredSliderHoverHeld, undefined);
    const observations = {};
    for (const side of ['reference', 'astylar']) {
      const source = row[side];
      assert.deepEqual(source.observations.map(value => value.boundary),
        ['before', 'after-action', row.state === 'held' ? 'held' : 'settled']);
      for (const receipt of [source.inputTree, source.screenshot]) assert.equal(hash(read(receipt.file)), receipt.sha256);
      observations[side] = source.observations;
    }
    const child = {
      disposition: 'inspected-raw-configured-action-only', case: key, state: row.state, observations,
      evidence: { report: sliderHoverHeldCapture, checkpoint: capture.capture.checkpointManifest,
        sources: capture.capture.sources, pairedTrees: [row.reference.inputTree, row.astylar.inputTree],
        screenshots: [row.reference.screenshot, row.astylar.screenshot],
        producer: { file: producer, sha256: hash(read(producer)) } },
      boundary: 'Exact maintained hover/held action only. Actual DOM and logical events remain distinct. Held INPUT versus CANVAS focus is not automatically a core defect. No substitute drag,keyboard,paint,cursor,hit-target,current-library or whole-case acceptance.',
      remaining: ['Equal input and actual hit-target/cursor applicability;local composited/ripple/edge paint.',
        'Other actions,source/runtime applicability,ownership and whole-case inspection remain open.'],
    };
    activation.configuredSliderHoverHeld = child; activation.disposition = 'partial';
    changed.push({ activation, child });
  }
  assert.equal(changed.length, 16);
  // Reverse only these additions and dispositions. Every prior byte-valued
  // field,remaining task and other case must recover the full predecessor.
  for (const { activation } of changed) {
    delete activation.configuredSliderHoverHeld; activation.disposition = 'evidence-join-pending';
  }
  assert.equal(hash(JSON.stringify(review)), sliderHoverHeldPredecessor);
  for (const { activation, child } of changed) {
    activation.configuredSliderHoverHeld = child; activation.disposition = 'partial';
  }
  return review;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  assert.ok(process.argv.length === 3 && ['--dry-run', '--save'].includes(process.argv[2]));
  const base = 'artifacts/material-parity/working-audit';
  const predecessor = JSON.parse(readFileSync(`${base}/proposals/${sliderHoverHeldPredecessor}.json`));
  assert.equal(predecessor.sha256, sliderHoverHeldPredecessor);
  const review = joinSliderHoverHeld(predecessor.review, readFileSync(sliderHoverHeldCapture.file));
  const digest = hash(JSON.stringify(review));
  if (process.argv[2] === '--save') {
    const bytes = Buffer.byteLength(JSON.stringify({ status: 'proposal-not-canonical', sha256: digest, review }, null, 2) + '\n');
    const volume = statfsSync(base), free = volume.bavail * volume.bsize;
    assert.ok(free > bytes * 3, 'Insufficient conservative atomic-writer headroom');
    console.log(JSON.stringify({ proposed: saveReviewProposal(base, review), bytes, prewriteFree: free,
      cases: 16, predecessorRecovered: true, canonical: false, dependencyReplayPending: true }));
  } else console.log(JSON.stringify({ reviewSha256: digest, cases: 16, predecessorRecovered: true, saved: false }));
}
