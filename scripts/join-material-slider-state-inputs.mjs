import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

export const sliderStatePredecessor = 'c0e397e0a5912d3f492c0d55a3d2b5421d6892f5403ba355c90560da6dbf2cea';
const captureReceipt = { file: 'artifacts/material-parity/slider-hover-held-20261024/latest-report.json',
  sha256: 'de4228f971a0b0b341a21c9d71a20d9f351701ec634257732c6ed6d929a8ec98' };
const proof = { file: 'tests/material-parity/slider-retained-state-layer.spec.mjs',
  sha256: 'cc8c942541660c657dbbad42f3dbf353c63113d2ce0a96b51b8bcc98ed3e3288' };
const verification = { file: 'artifacts/material-parity/slider-historical-black-material-integration-20261024.log',
  sha256: '00472e2a7281b330b5cdf3d29e79f65007d3297f45f7f20f3d913616e6f3ec94' };
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

// Bounded successor of the existing reviewed-case format. No new report/store,
// source registration,export or canonical publication is performed here.
export function joinSliderStateInputs(predecessor, read = readFileSync) {
  assert.equal(hash(JSON.stringify(predecessor)), sliderStatePredecessor);
  const authenticate = receipt => {
    const bytes = read(receipt.file); assert.equal(hash(bytes), receipt.sha256, receipt.file); return bytes;
  };
  authenticate(proof); authenticate(verification);
  const capture = JSON.parse(authenticate(captureReceipt)); assert.equal(capture.results.length, 16);
  authenticate(capture.capture.checkpointManifest);
  const producerFile = 'scripts/join-material-slider-state-inputs.mjs';
  const producer = { file: producerFile, sha256: hash(read(producerFile)) };
  const review = structuredClone(predecessor), additions = [], seen = new Set();
  const add = (parent, key, value, focus = false) => {
    assert.equal(parent[key], undefined); const priorDisposition = parent.disposition;
    parent[key] = value; if (focus) { assert.equal(priorDisposition, 'evidence-join-pending'); parent.disposition = 'partial'; }
    additions.push({ parent, key, value, priorDisposition, focus });
  };
  for (const row of capture.results) {
    const key = `interaction:slider@${row.profile}/${row.viewport.id}/${row.state}`;
    assert.match(key, /^interaction:slider@(light|dark|contrast|custom)\/desktop-dpr[12]\/(hover|held)$/);
    assert.ok(!seen.has(key)); seen.add(key);
    const groups = review.groups.filter(group => group.case === key); assert.equal(groups.length, 1);
    const group = groups[0]; assert.equal(group.inspection, 'partial'); assert.equal(group.currentRendering, 'unverified');
    const raw = group.obligations.authoredActivation.configuredSliderHoverHeld;
    assert.ok(raw); assert.equal(raw.case, key);
    const trees = {};
    for (const side of ['reference', 'astylar']) {
      trees[side] = JSON.parse(authenticate(row[side].inputTree)); authenticate(row[side].screenshot);
      assert.deepEqual(raw.observations[side], row[side].observations);
    }
    const evidence = { report: captureReceipt, proof, verification, producer,
      pairedTrees: [row.reference.inputTree, row.astylar.inputTree],
      screenshots: [row.reference.screenshot, row.astylar.screenshot] };
    const visual = trees.astylar.nodes.find(node => node.authored?.id === 'slider-visual'); assert.ok(visual);
    const layers = trees.reference.nodes.filter(node => /mat-ripple-element/.test(node.attributes?.class ?? ''))
      .map(node => ({ key: node.key, class: node.attributes.class, style: {
        backgroundColor: trees.reference.styles[node.style].backgroundColor,
        opacity: trees.reference.styles[node.style].opacity,
        width: trees.reference.styles[node.style].width, height: trees.reference.styles[node.style].height } }));
    assert.equal(layers.length, row.state === 'hover' ? 1 : 2);
    add(group.obligations.inputStyleStructure, 'retainedSliderStateLayerInputs', {
      disposition: 'inspected-unequal-state-layer-inputs', classification: 'application-plugin-authoring-defect',
      owner: 'application/plugin state-layer composition before paint', referenceLayers: layers,
      candidate: { node: visual.key, data: visual.authored.data, activeDiscAlpha: row.state === 'hover' ? .08 : .12,
        inactiveDiscAlpha: 0, source: 'Original handlers/material update executed by the authenticated focused proof.' },
      evidence, boundary: 'Unequal layer composition,not equal-input core alpha/projection or complete structure/paint acceptance.',
    });
    const owners = Object.fromEntries(['reference', 'astylar'].map(side => {
      const last = row[side].observations.at(-1);
      assert.equal(last.active.tag, row.state === 'hover' ? 'BODY' : side === 'reference' ? 'INPUT' : 'CANVAS');
      return [side, { active: last.active, activeAncestry: last.activeAncestry, events: last.events,
        configuredEvents: last.configuredEvents }];
    }));
    add(group.obligations.programmaticFocus, 'retainedSliderPointerFocus', {
      disposition: 'inspected-pointer-hover-ownership-only', action: row.state, owners, evidence,
      boundary: 'Reuses exact raw hover/held observations,not programmatic focus(),keyboard focus,focus visibility or equal hit-target proof. BODY hover and held INPUT/CANVAS remain distinct. Does not close this obligation.',
    }, true);
    add(group.obligations.historyOwnership, 'retainedSliderHistoricalBlackMaterial', {
      disposition: 'inspected-historical-material-configuration', classification: 'application-plugin-authoring-defect',
      revision: 'f3c8254c2aa63197c03e0fb2bd43cc98c0e57fed', changedBy: '2cb8b198d40212746f2b7be0053c742bd5da6628',
      observation: 'Original rgba request is rejected;fallback #6750a414 reaches Color3 and creates diffuse/emissive black with alpha1 on Babylon8.15.1.',
      evidence, boundary: 'Historical material-config mechanism only,not exact September screenshot/build attribution,current reproduction,GPU raster or complete live resource ownership.',
    });
    if (row.profile === 'light') {
      add(group.obligations.localPaint, 'retainedSliderStateLayerInterior', {
        disposition: 'inspected-retained-light-interior-difference',
        referenceRGBA: row.state === 'hover' ? [238, 233, 244, 255] : [195, 183, 219, 255],
        candidateRGBA: row.state === 'hover' ? [235, 228, 242, 255] : [229, 221, 239, 255], evidence,
        sampling: 'Independent solid-primary knob location in each PNG;flat patch18CSSpx above right knob center,inside24px layer/outside10px knob.',
        boundary: 'Four light hover/held DPR1/2 contexts only. No opaque black patch in sampled interiors. Not edge/track/knob sharpness,other profiles,equal-input paint,effective-alpha inversion or whole-case acceptance.',
      });
    }
  }
  assert.equal(additions.length, 52);
  // Recover the complete predecessor,including every remaining task/case flag.
  for (const item of additions) { delete item.parent[item.key]; item.parent.disposition = item.priorDisposition; }
  assert.equal(hash(JSON.stringify(review)), sliderStatePredecessor);
  for (const item of additions) { item.parent[item.key] = item.value; if (item.focus) item.parent.disposition = 'partial'; }
  return review;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  assert.deepEqual(process.argv.slice(2), ['--dry-run']);
  const envelope = JSON.parse(readFileSync(`artifacts/material-parity/working-audit/proposals/${sliderStatePredecessor}.json`));
  assert.equal(envelope.sha256, sliderStatePredecessor);
  const review = joinSliderStateInputs(envelope.review);
  console.log(JSON.stringify({ reviewSha256: hash(JSON.stringify(review)), cases: 16, children: 52,
    saved: false, canonical: false, predecessorRecovered: true, dependencyReplayPending: true }));
}
