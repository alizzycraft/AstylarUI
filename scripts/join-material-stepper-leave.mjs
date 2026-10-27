import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const hash = value => createHash('sha256').update(value).digest('hex');
export const stepperLeavePredecessor = 'e17dff3342e922de9febdd85402b433deb5872091f36cbb709d38de2327d6431';
const childKey = 'supplementaryLeaveSelection';
export function restoreStepperLeave(review) {
  return { ...review, groups: review.groups.map(group => {
    if (!group.obligations.authoredActivation[childKey]) return group;
    const activation = { ...group.obligations.authoredActivation, disposition: 'evidence-join-pending' };
    delete activation[childKey];
    return { ...group, obligations: { ...group.obligations, authoredActivation: activation } };
  }) };
}

export function joinStepperLeave(parent, read = readFileSync) {
  assert.equal(hash(JSON.stringify(parent)), stepperLeavePredecessor);
  const receipt = { file: 'artifacts/material-parity/stepper-leave-observed-20261027/latest-report.json',
    sha256: 'f64114dd41acc3da0d1ac4691eaa710dbb03b17a0ab0cb1b57971bd901841b95' };
  const load = r => { const bytes = read(r.file); assert.equal(hash(bytes), r.sha256); return bytes; };
  const report = JSON.parse(load(receipt)), manifest = report.capture.checkpointManifest;
  const provenance = JSON.parse(load(manifest)).provenance;
  for (const r of [...provenance.harnessFiles, ...provenance.diagnosticFiles]) load(r);
  load(report.actionSource);
  assert.deepEqual(report.results.map(r => `${r.profile}/${r.viewport.id}`),
    ['light', 'dark', 'contrast', 'custom'].flatMap(p => ['desktop-dpr1', 'desktop-dpr2'].map(v => `${p}/${v}`)));
  const rows = new Map();
  for (const row of report.results) {
    assert.equal(row.family, 'stepper'); assert.equal(row.state, 'activate-leave');
    const key = `interaction:stepper@${row.profile}/${row.viewport.id}/activate-leave`;
    assert.ok(!rows.has(key)); rows.set(key, row);
    for (const side of ['reference', 'astylar']) {
      const item = row[side]; load(item.inputTree); load(item.screenshot);
      assert.deepEqual(item.runtime.errors, []);
      assert.deepEqual(item.observations.map(o => o.boundary), ['before', 'after-action', 'settled']);
      assert.deepEqual(item.actionTimeline.map(o => o.boundary), ['mouse-move', 'mouse-down', 'mouse-up', 'mouse-move']);
      for (const o of [...item.observations, ...item.actionTimeline]) {
        assert.deepEqual(o.tabOptions.map(t => t.label), ['Details', 'Review']);
        assert.ok(o.tabOptions.every(t => t.role === 'tab' && typeof t.selected === 'boolean'));
      }
      assert.deepEqual(item.observations[0].tabOptions.map(t => t.selected), [true, false]);
      assert.deepEqual(item.observations.at(-1).tabOptions.map(t => t.selected), [false, true]);
    }
  }
  const producer = 'scripts/join-material-stepper-leave.mjs';
  const producerReceipt = { file: producer, sha256: hash(read(producer)) };
  const observed = item => [...item.observations.slice(0, 1), ...item.actionTimeline, ...item.observations.slice(1)].map(o => ({
    boundary: o.boundary, tabs: o.tabOptions, pointerEvents: o.events.filter(e => ['pointerdown', 'pointerup', 'click'].includes(e.type)),
  }));
  let changed = 0;
  const groups = parent.groups.map(group => {
    const row = rows.get(group.case); if (!row) return group;
    changed++;
    assert.equal(group.inspection, 'partial'); assert.equal(group.currentRendering, 'unverified');
    const activation = group.obligations.authoredActivation;
    assert.equal(activation.disposition, 'evidence-join-pending'); assert.equal(activation[childKey], undefined);
    return { ...group, obligations: { ...group.obligations, authoredActivation: {
      ...activation, disposition: 'partial', [childKey]: {
        disposition: 'inspected-supplementary-generated-tab-transitions',
        observations: { reference: observed(row.reference), astylar: observed(row.astylar) },
        evidence: { report: receipt, manifest, actionSource: report.actionSource, producer: producerReceipt,
          pairedTrees: { reference: row.reference.inputTree, astylar: row.astylar.inputTree },
          screenshots: { reference: row.reference.screenshot, astylar: row.astylar.screenshot } },
        boundary: 'Eight supplementary maintained activate-leave actions in a retained served build with extra awaited mouse-boundary reads. Actual generated tab selection/focus and DOM pointer targets observed. Sampled native DOM lag is not a timing defect; CANVAS targets do not prove internal hit identity. Not historical reconstruction, keyboard, paint, lifetime, full current-library applicability or whole-case acceptance. All prior remaining tasks and other obligations preserved.',
      },
    } } };
  });
  assert.equal(changed, 8);
  const review = { ...parent, groups };
  assert.equal(hash(JSON.stringify(restoreStepperLeave(review))), stepperLeavePredecessor);
  return { review, sha256: hash(JSON.stringify(review)), cases: changed };
}
