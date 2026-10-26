import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { createFocusSelectionAuditReviewReader, focusSelectionReview } from '../tests/material-parity/public-tab-selection-finding.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export const chipsAlternatePredecessor = 'd47c41d3d6ac4dff3632688a36e8e20e2ec631fe0c9feca1bc05a198f36d3bab';
const childKey = 'supplementaryAlternateSelection';
export function restoreChipsAlternate(review) {
  return { ...review, groups: review.groups.map(group => {
    if (!group.obligations.authoredActivation[childKey]) return group;
    const activation = { ...group.obligations.authoredActivation, disposition: 'evidence-join-pending' };
    delete activation[childKey];
    return { ...group, obligations: { ...group.obligations, authoredActivation: activation } };
  }) };
}

export function joinChipsAlternate(parent, read = readFileSync) {
  assert.equal(hash(JSON.stringify(parent)), chipsAlternatePredecessor);
  const receipt = { file: 'artifacts/material-parity/chips-alternate-observed-20261026/latest-report.json',
    sha256: '0a24820940bba3c8d4f2b738d69a6105e1ef3fe62c6bf44cf94c73360db59cad' };
  const load = r => { const bytes = read(r.file); assert.equal(hash(bytes), r.sha256); return bytes; };
  const report = JSON.parse(load(receipt)), manifest = report.capture.checkpointManifest;
  const provenance = JSON.parse(load(manifest)).provenance;
  for (const r of [...provenance.harnessFiles, ...provenance.diagnosticFiles]) load(r);
  load(report.actionSource);
  assert.deepEqual(report.results.map(r => `${r.profile}/${r.viewport.id}`),
    ['light', 'dark', 'contrast', 'custom'].flatMap(p => ['desktop-dpr1', 'desktop-dpr2'].map(v => `${p}/${v}`)));
  const rows = new Map(), expected = [[true,true], [true,true], [false,true], [false,true], [false,true], [false,false]];
  for (const row of report.results) {
    assert.equal(row.family, 'chips'); assert.equal(row.state, 'activate-alternate');
    const key = `interaction:chips@${row.profile}/${row.viewport.id}/activate-alternate`;
    assert.ok(!rows.has(key)); rows.set(key, row);
    for (const side of ['reference', 'astylar']) {
      const item = row[side]; load(item.inputTree); load(item.screenshot);
      assert.deepEqual(item.runtime.errors, []);
      assert.deepEqual(item.observations.map(o => o.boundary), ['before', 'after-action', 'settled']);
      assert.deepEqual(item.actionTimeline.map(o => o.boundary), ['mouse-move','mouse-down','mouse-up','mouse-move','mouse-down','mouse-up']);
      for (const [i, observation] of item.actionTimeline.entries()) {
        assert.deepEqual(observation.state.chipSelections, expected[i]);
        assert.deepEqual(observation.chipOptions.map(o => o.id), ['chip-0', 'chip-1']);
        assert.ok(observation.chipOptions.every(o => o.role === 'option' && typeof o.selected === 'boolean'));
      }
      assert.deepEqual(item.observations[0].chipOptions.map(o => o.selected), [true, true]);
      assert.deepEqual(item.observations.at(-1).chipOptions.map(o => o.selected), [false, false]);
    }
  }
  const producer = 'scripts/join-material-chips-alternate.mjs';
  const producerReceipt = { file: producer, sha256: hash(read(producer)) };
  const observed = item => [item.observations[0], ...item.actionTimeline, item.observations.at(-1)].map(o => ({
    boundary: o.boundary, options: o.chipOptions, storeSelections: o.state.chipSelections,
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
        disposition: 'inspected-supplementary-generated-option-transitions',
        observations: { reference: observed(row.reference), astylar: observed(row.astylar) },
        evidence: { report: receipt, manifest, actionSource: report.actionSource, producer: producerReceipt,
          pairedTrees: { reference: row.reference.inputTree, astylar: row.astylar.inputTree },
          screenshots: { reference: row.reference.screenshot, astylar: row.astylar.screenshot } },
        boundary: 'Eight supplementary configured alternate actions in a retained served build with extra awaited mouse-boundary reads. Generated DOM and store transitions observed; sampled native DOM lag retained. Not historical hit reconstruction, exact event timing, keyboard, paint, full current-library applicability or whole-case acceptance. All prior remaining tasks and other obligations preserved.',
      },
    } } };
  });
  assert.equal(changed, 8);
  const review = { ...parent, groups };
  assert.equal(hash(JSON.stringify(restoreChipsAlternate(review))), chipsAlternatePredecessor);
  return { review, sha256: hash(JSON.stringify(review)), cases: changed };
}

export function createChipsAlternateReviewReader({ root, read }) {
  assert.equal(focusSelectionReview, chipsAlternatePredecessor);
  const prior = createFocusSelectionAuditReviewReader({ root, read, reviewSha256: focusSelectionReview });
  const parent = JSON.parse(prior.read(prior.file)).review;
  const joined = joinChipsAlternate(parent, read);
  const file = path.resolve(root, `artifacts/material-parity/working-audit/proposals/${joined.sha256}.json`);
  const bytes = Buffer.from(JSON.stringify({ status: 'proposal-not-canonical', sha256: joined.sha256, review: joined.review }));
  return { ...joined, file, read(name, options) {
    if (path.resolve(root, name) !== file) return prior.read(name, options);
    const encoding = typeof options === 'string' ? options : options?.encoding;
    return encoding ? bytes.toString(encoding) : Buffer.from(bytes);
  }, sourceApplicability: { mode: 'supplementary-chips-alternate-selection', predecessorApplicability: prior.sourceApplicability,
    boundary: 'Current action and retained served-build supplementary observation join only; original historical evidence and all final acceptance gates remain.' } };
}
