import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const hash = value => createHash('sha256').update(value).digest('hex');
const reportFile = 'artifacts/material-parity/stepper-leave-observed-20261027/latest-report.json';
const bytes = readFileSync(reportFile);
assert.equal(hash(bytes), 'f64114dd41acc3da0d1ac4691eaa710dbb03b17a0ab0cb1b57971bd901841b95');
const report = JSON.parse(bytes);
const selected = observation => observation.tabOptions.map(tab => tab.selected);
function checkObservation(observation, side) {
  assert.deepEqual(observation.tabOptions.map(tab => tab.label), ['Details', 'Review']);
  for (const [i, tab] of observation.tabOptions.entries()) {
    assert.equal(tab.role, 'tab');
    assert.equal(typeof tab.selected, 'boolean');
    assert.equal(typeof tab.focused, 'boolean');
    assert.equal(tab.tabindex, tab.selected ? '0' : '-1');
    if (side === 'astylar') assert.equal(tab.logicalId, i === 0 ? 'step-details' : 'step-review');
  }
}
function checkSide(item, side) {
  assert.deepEqual(item.runtime.errors, []);
  assert.deepEqual(item.observations.map(o => o.boundary), ['before', 'after-action', 'settled']);
  assert.deepEqual(item.actionTimeline.map(o => o.boundary), ['mouse-move', 'mouse-down', 'mouse-up', 'mouse-move']);
  for (const observation of [...item.observations, ...item.actionTimeline]) checkObservation(observation, side);
  assert.deepEqual(selected(item.observations[0]), [true, false]);
  assert.deepEqual(selected(item.observations.at(-1)), [false, true]);
  assert.deepEqual(item.observations.at(-1).tabOptions.map(t => t.focused), [false, true]);
  assert.deepEqual(selected(item.actionTimeline[0]), [true, false]);
  assert.deepEqual(selected(item.actionTimeline[1]), [true, false]);
  assert.deepEqual(selected(item.actionTimeline[3]), [false, true]);
  const pointer = item.observations.at(-1).events.filter(e => ['pointerdown', 'pointerup', 'click'].includes(e.type));
  assert.deepEqual(pointer.map(e => e.type), ['pointerdown', 'pointerup', 'click']);
  for (const event of pointer) {
    assert.equal(event.trusted, true);
    assert.equal(event.target.tag, side === 'reference' ? 'SPAN' : 'CANVAS');
    assert.equal(event.target.logicalId, side === 'reference' ? 'step-review-text' : null);
  }
  const maintained = item.observations.at(-1).configuredEvents.filter(e => ['pointerdown', 'pointerup', 'click'].includes(e.type));
  assert.deepEqual(maintained.map(e => [e.type, e.targetId]), ['pointerdown', 'pointerup', 'click'].map(type =>
    [type, side === 'reference' ? 'stepper-primary' : 'step-review-text']));
}

test('Stepper leave capture authenticates actual tab observations without promoting authored endpoints', () => {
  assert.deepEqual(report.results.map(r => `${r.profile}/${r.viewport.id}`),
    ['light', 'dark', 'contrast', 'custom'].flatMap(p => ['desktop-dpr1', 'desktop-dpr2'].map(v => `${p}/${v}`)));
  const load = receipt => { const value = readFileSync(receipt.file); assert.equal(hash(value), receipt.sha256); return value; };
  const manifest = JSON.parse(load(report.capture.checkpointManifest));
  for (const receipt of [...manifest.provenance.harnessFiles, ...manifest.provenance.diagnosticFiles]) load(receipt);
  load(report.actionSource);
  let nativeLag = 0;
  for (const row of report.results) {
    assert.equal(row.family, 'stepper'); assert.equal(row.state, 'activate-leave');
    for (const side of ['reference', 'astylar']) {
      checkSide(row[side], side); load(row[side].inputTree); load(row[side].screenshot);
    }
    nativeLag += selected(row.reference.actionTimeline[2])[0] ? 1 : 0;
    assert.deepEqual(selected(row.astylar.actionTimeline[2]), [false, true]);
  }
  assert.equal(nativeLag, 6);
  console.log(JSON.stringify({ cases: 8, actualControlSnapshots: 112, nativeMouseUpLag: nativeLag,
    boundary: 'Retained served-build supplementary observation. Extra awaited reads affect timing; native sampled lag is not a timing defect. Canvas DOM targets are not internal hit-owner proof. No historical reconstruction, current-library parity, paint or whole-case acceptance.' }));
});

test('Stepper evidence rejects missing state, wrong identity, missing leave and forged event trust', () => {
  for (const mutate of [
    item => { delete item.observations[0].tabOptions[0].selected; },
    item => { item.observations[0].tabOptions[0].logicalId = 'step-review'; },
    item => { item.actionTimeline.pop(); },
    item => { item.observations.at(-1).events.find(e => e.type === 'click').trusted = false; },
    item => { item.observations.at(-1).configuredEvents.find(e => e.type === 'click').targetId = 'step-details-text'; },
  ]) {
    const item = structuredClone(report.results[0].astylar); mutate(item);
    assert.throws(() => checkSide(item, 'astylar'), assert.AssertionError);
  }
});

test('Stepper join changes only eight activation obligations and restores the accepted predecessor', async () => {
  const generation = '3252368beb18426245167b716fe22c6af0d2c4ce8da283ef574f43b89cc686aa';
  const bytes = readFileSync(`artifacts/material-parity/working-audit/${generation}/index.json`);
  assert.equal(hash(bytes), 'ff2b1a1d86fb00467f1673f6db0f4b98febc1c2f33b12d45f8c37057aee54cb5');
  const coverage = JSON.parse(bytes).metadata.coverage.inspectionEvidence;
  const parent = { kind: 'case-obligation-coverage-extension', status: 'proposal-not-canonical', scope: coverage.scope, groups: coverage.cases };
  const { joinStepperLeave: join, restoreStepperLeave: restore, stepperLeavePredecessor } = await import('../../scripts/join-material-stepper-leave.mjs');
  const joined = join(parent);
  assert.equal(joined.cases, 8); assert.equal(joined.review.groups.length, 2311);
  assert.equal(hash(JSON.stringify(restore(joined.review))), stepperLeavePredecessor);
  let changed = 0;
  for (const [i, before] of parent.groups.entries()) {
    const after = joined.review.groups[i];
    assert.equal(after.inspection, before.inspection); assert.equal(after.currentRendering, before.currentRendering);
    if (before === after) continue;
    changed++;
    assert.match(before.case, /^interaction:stepper@[^/]+\/desktop-dpr[12]\/activate-leave$/);
    for (const [name, obligation] of Object.entries(before.obligations)) {
      assert.deepEqual(after.obligations[name].remaining, obligation.remaining);
      if (name !== 'authoredActivation') assert.deepEqual(after.obligations[name], obligation);
      else assert.equal(after.obligations[name].disposition, 'partial');
    }
  }
  assert.equal(changed, 8);
  assert.throws(() => join(joined.review));
  for (const suffix of ['latest-report.json', '-astylar.png']) {
    assert.throws(() => join(parent, (file, ...args) => String(file).endsWith(suffix) ? Buffer.from('forged') : readFileSync(file, ...args)));
  }
  console.log(JSON.stringify({ review: joined.sha256, changedActivationObligations: changed,
    predecessorRecovered: true, canonicalUnchanged: true, parentCasesRemainPartial: 2311 }));
});
