import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { materialCaseKey } from '../tests/material-parity/run-checkpoint.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
export const datepickerOpeningPredecessor = 'bcc94f3deda38ea22fa475f239eb41e3797101b0b30f2eb58433fbef20b2826b';
const childKey = 'supplementaryDatepickerOpening';
export function restoreDatepickerOpening(review) {
  return { ...review, groups: review.groups.map(group => {
    if (!group.obligations.authoredActivation[childKey]) return group;
    const activation = { ...group.obligations.authoredActivation, disposition: 'evidence-join-pending' };
    delete activation[childKey];
    return { ...group, obligations: { ...group.obligations, authoredActivation: activation } };
  }) };
}

export function joinDatepickerOpening(parent, read = readFileSync) {
  assert.equal(hash(JSON.stringify(parent)), datepickerOpeningPredecessor);
  const receipt = { file: 'artifacts/material-parity/datepicker-toggle-activation-20261027/latest-report.json',
    sha256: '20c3697d44b777b380c070a3b2cf3b5178b68f3814e2aeb662d5aeed699ca62e' };
  const load = r => { const bytes = read(r.file); assert.equal(hash(bytes), r.sha256); return bytes; };
  const report = JSON.parse(load(receipt));
  const manifest = report.capture.checkpointManifest;
  load(manifest);
  assert.equal(report.browser, '156.0.8078.48');
  const expected = ['light', 'dark', 'contrast', 'custom'].flatMap(profile => [1, 2].flatMap(dpr =>
    ['activate', 'activate-leave'].map(state => `interaction:datepicker@${profile}/desktop-dpr${dpr}/${state}`)));
  expected.push('interaction:datepicker@light/desktop-short-dpr1/activate');
  const caseName = row => `interaction:${row.family}@${row.profile}/${row.viewport.id}/${row.state}`;
  for (const row of report.results) assert.equal(row.caseId, materialCaseKey('interaction', row));
  assert.deepEqual(report.results.map(caseName).sort(), expected.toSorted());
  const rows = new Map(report.results.map(row => [caseName(row), row]));
  for (const row of rows.values()) {
    for (const side of ['reference', 'astylar']) {
      const evidence = row[side];
      load(evidence.inputTree); load(evidence.screenshot);
      assert.deepEqual(evidence.runtime.errors, []);
      assert.deepEqual(evidence.observations.map(o => o.boundary), ['before', 'after-action', 'settled']);
      const events = evidence.observations.at(-1).events.filter(e => ['pointerdown', 'pointerup', 'click'].includes(e.type));
      assert.deepEqual(events.map(e => e.type), ['pointerdown', 'pointerup', 'click']);
      assert.ok(events.every(e => e.trusted));
    }
    const reference = row.reference.observations.at(-1), candidate = row.astylar.observations.at(-1);
    assert.equal(reference.active.tag, 'BUTTON');
    assert.ok(reference.activeAncestry.some(n => n.tag === 'MAT-CALENDAR'));
    assert.ok(reference.activeAncestry.some(n => n.role === 'gridcell'));
    assert.equal(candidate.active.logicalId, 'datepicker-icon');
    assert.equal(candidate.state.open, true);
    const routed = candidate.configuredEvents.filter(e => ['pointerdown', 'pointerup', 'click'].includes(e.type));
    assert.deepEqual(routed.map(e => [e.type, e.targetId]), ['pointerdown', 'pointerup', 'click'].map(type => [type, 'datepicker-icon']));
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
        disposition: 'inspected-supplementary-opening-focus-failure',
        sourceFinding: 'fixture-datepicker-opening-focus-transfer-omitted',
        evidence: { report: receipt, manifest,
          reference: { inputTree: row.reference.inputTree, screenshot: row.reference.screenshot },
          astylar: { inputTree: row.astylar.inputTree, screenshot: row.astylar.screenshot } },
        observations: { reference: row.reference.observations, astylar: row.astylar.observations },
        remaining: ['Intermediate frames and local paint are not established.',
          'Historical source and live-date/browser applicability must remain explicit; complete current rendering is unverified.'],
        boundary: 'Exact maintained toggle actions in retained served build. Candidate opens but retains icon focus; native focuses a calendar gridcell. Source replay separately identifies omitted opening focus intent. Not input-click/timepicker behavior, complete raw native target ancestry, all core focus correctness, input equivalence or whole-case acceptance. Parent obligations remain intact.',
      },
    } } };
  });
  assert.equal(changed, 17);
  const review = { ...parent, groups };
  assert.equal(hash(JSON.stringify(restoreDatepickerOpening(review))), datepickerOpeningPredecessor);
  return { review, sha256: hash(JSON.stringify(review)), cases: changed };
}
