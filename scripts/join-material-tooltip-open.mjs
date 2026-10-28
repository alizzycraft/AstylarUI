import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { materialCaseKey } from '../tests/material-parity/run-checkpoint.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export const tooltipOpenPredecessor = 'cd9631f0dc9f7ca63b35c5d11d11611ebd3f98930166352ff56b3016d7989894';
const childKey = 'supplementaryTooltipOpen';

// Explicit read-only applicability boundary. Neither recorded receipt nor source
// is rewritten, and unknown revisions must not fall through to historical bytes.
export function reconcileTooltipActivationDriver(current, previous) {
  assert.equal(hash(current), 'f97c4459373bcca113d05842aec5179425a551d7c8ccd064e62d0693d9438fda');
  assert.equal(hash(previous), '837098a21a29cb1e1c50a65803d398a7588b9c6d05dd815eeea5d18e4b581118');
  return Buffer.from(previous);
}

export function restoreTooltipOpen(review) {
  return { ...review, groups: review.groups.map(group => {
    if (!group.obligations.authoredActivation[childKey]) return group;
    const activation = { ...group.obligations.authoredActivation, disposition: 'evidence-join-pending' };
    delete activation[childKey];
    return { ...group, obligations: { ...group.obligations, authoredActivation: activation } };
  }) };
}

export function joinTooltipOpen(parent, read = readFileSync) {
  assert.equal(hash(JSON.stringify(parent)), tooltipOpenPredecessor);
  const receipt = { file: 'artifacts/material-parity/tooltip-configured-open-20261028/latest-report.json',
    sha256: '48dfc121bb0788f4f2d595fd0d3097adae4a48edd53bd1bd6eb381b75ca26dbd' };
  const load = r => { const bytes = read(r.file); assert.equal(hash(bytes), r.sha256); return bytes; };
  const report = JSON.parse(load(receipt));
  const manifest = report.capture.checkpointManifest;
  load(manifest);
  assert.equal(report.browser, '156.0.8078.48');
  const expected = ['light', 'dark', 'contrast', 'custom'].flatMap(profile => [1, 2].map(dpr =>
    `interaction:tooltip@${profile}/desktop-dpr${dpr}/open`));
  const caseName = row => `interaction:${row.family}@${row.profile}/${row.viewport.id}/${row.state}`;
  assert.deepEqual(report.results.map(caseName).sort(), expected.toSorted());
  const rows = new Map(report.results.map(row => [caseName(row), row]));
  for (const row of rows.values()) {
    assert.equal(row.caseId, materialCaseKey('interaction', row));
    for (const side of ['reference', 'astylar']) {
      const evidence = row[side];
      const tree = JSON.parse(load(evidence.inputTree)); load(evidence.screenshot);
      assert.deepEqual(evidence.runtime.errors, []);
      const samples = evidence.observations;
      assert.deepEqual(samples.map(o => o.boundary), ['before', 'after-action', 'settled']);
      assert.deepEqual(samples.map(o => o.state.open), side === 'reference' ? [false, false, false] : [false, true, true]);
      assert.equal(samples.at(-1).active.logicalId, 'tooltip-primary');
      const events = samples.at(-1).events.filter(e => ['pointerdown', 'pointerup', 'click'].includes(e.type));
      assert.deepEqual(events.map(e => e.type), ['pointerdown', 'pointerup', 'click']);
      assert.ok(events.every(e => e.trusted));
      const popup = tree.nodes.filter(n => side === 'reference'
        ? String(n.attributes?.class ?? '').split(/\s+/).includes('mat-mdc-tooltip-surface')
        : n.authored?.id === 'tooltip-popup');
      assert.equal(popup.length, side === 'reference' ? 0 : 1);
    }
  }
  let changed = 0;
  const groups = parent.groups.map(group => {
    const row = rows.get(group.case); if (!row) return group;
    changed++;
    assert.equal(group.inspection, 'partial'); assert.equal(group.currentRendering, 'unverified');
    const activation = group.obligations.authoredActivation;
    assert.equal(activation.disposition, 'evidence-join-pending'); assert.equal(activation[childKey], undefined);
    return { ...group, obligations: { ...group.obligations, authoredActivation: {
      ...activation, disposition: 'partial', [childKey]: {
        disposition: 'inspected-supplementary-open-state-failure',
        evidence: { report: receipt, manifest,
          reference: { inputTree: row.reference.inputTree, screenshot: row.reference.screenshot },
          astylar: { inputTree: row.astylar.inputTree, screenshot: row.astylar.screenshot } },
        observations: { reference: row.reference.observations, astylar: row.astylar.observations },
        remaining: ['Intermediate paint and complete raw native hit ancestry are not established.',
          'Historical versus current runtime applicability and complete rendering remain unverified.'],
        boundary: 'Eight exact configured open click actions over retained application assets in Chrome156. Both triggers receive focus; candidate retains a popup while the reference endpoint has none. Native store.open alone is not visibility evidence. Not Android touch, original Chrome154 causality, equal-input core failure or whole-case acceptance. All other obligations preserve.',
      },
    } } };
  });
  assert.equal(changed, 8);
  const review = { ...parent, groups };
  assert.equal(hash(JSON.stringify(restoreTooltipOpen(review))), tooltipOpenPredecessor);
  return { review, sha256: hash(JSON.stringify(review)), cases: changed };
}
