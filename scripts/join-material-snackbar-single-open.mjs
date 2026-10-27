import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { validateSupplementalCapture } from '../tests/material-parity/supplemental-capture-evidence.mjs';
import { propertyGroups } from '../tests/material-parity/input-equivalence-policy.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
export const snackbarSingleOpenPredecessor = '863d24f5c259f5ae2cca0ffd9356dd9e16ff8d340aad850bd96ef488e71cca92';
const caseId = 'interaction:snack-bar@light/desktop-dpr1/auto-dismiss';
const childKey = 'supplementarySingleOpenVisibility';
export function restoreSnackbarSingleOpen(review) {
  return { ...review, groups: review.groups.map(group => {
    if (!group.obligations.authoredActivation[childKey]) return group;
    const activation = { ...group.obligations.authoredActivation, disposition: 'evidence-join-pending' };
    delete activation[childKey];
    return { ...group, obligations: { ...group.obligations, authoredActivation: activation } };
  }) };
}

export function joinSnackbarSingleOpen(parent, read = readFileSync) {
  assert.equal(hash(JSON.stringify(parent)), snackbarSingleOpenPredecessor);
  const receipt = { file: 'artifacts/material-parity/snackbar-single-open-20261027/latest-report.json',
    sha256: '1cc0846c8d56c58312bd47ede2c8c2c8ef1774682466b2b7f625d13682fbf804' };
  const load = r => { const bytes = read(r.file); assert.equal(hash(bytes), r.sha256); return bytes; };
  const report = JSON.parse(load(receipt)), manifest = report.capture.checkpointManifest;
  const checkpoint = JSON.parse(load(manifest));
  assert.deepEqual(validateSupplementalCapture(report, { reportFile: receipt.file,
    expectedProvenance: checkpoint.provenance, script: 'scripts/audit-material-snackbar-lifetime.mjs',
    styleProperties: Object.values(propertyGroups).flat() }), { status: 'checkpoint-bound', errors: [] });
  assert.equal(report.mode, 'single-open');
  assert.equal(report.inputEquivalent, false); assert.equal(report.renderingEquivalent, false);
  assert.deepEqual(report.results.map(r => r.state), ['closed', 'first-open', 'before-expiry', 'expired']);
  for (const row of report.results) {
    assert.equal(row.profile, 'light');
    assert.deepEqual(row.viewport, { width: 1440, height: 1000, deviceScaleFactor: 1 });
    for (const side of ['reference', 'astylar']) {
      load(row[side].inputTree); load(row[side].screenshot);
      assert.deepEqual(row[side].runtime.errors, []);
    }
  }
  const observations = {};
  for (const side of ['reference', 'astylar']) {
    const samples = report.results.map(r => r[side].observation);
    assert.deepEqual(samples.map(o => o.popupCount), [0, 1, 1, 0]);
    assert.deepEqual(samples.map(o => o.clicks.length), [0, 1, 1, 1]);
    assert.equal(samples[1].clicks[0].trusted, true);
    assert.equal(samples[0].elapsedSinceFirstClickMs, null);
    assert.ok(samples[1].elapsedSinceFirstClickMs > 0 && samples[1].elapsedSinceFirstClickMs < 4000);
    assert.ok(samples[2].elapsedSinceFirstClickMs >= 4000 && samples[2].elapsedSinceFirstClickMs < 5000);
    assert.ok(samples[3].elapsedSinceFirstClickMs >= 6000);
    observations[side] = report.results.map(r => ({ state: r.state, observation: r[side].observation,
      inputTree: r[side].inputTree, screenshot: r[side].screenshot }));
  }
  let changed = 0;
  const groups = parent.groups.map(group => {
    if (group.case !== caseId) return group;
    changed++;
    assert.equal(group.inspection, 'partial'); assert.equal(group.currentRendering, 'unverified');
    const activation = group.obligations.authoredActivation;
    assert.equal(activation.disposition, 'evidence-join-pending'); assert.equal(activation[childKey], undefined);
    return { ...group, obligations: { ...group.obligations, authoredActivation: {
      ...activation, disposition: 'partial', [childKey]: {
        disposition: 'inspected-supplementary-visibility-sequence', observations,
        evidence: { report: receipt, manifest, producer: { file: 'scripts/join-material-snackbar-single-open.mjs',
          sha256: hash(read('scripts/join-material-snackbar-single-open.mjs')) } },
        remaining: ['Exact timer-start and expiry/fade boundaries are not observed.',
          'Original historical execution is not reconstructed; complete current-library applicability remains unverified.'],
        boundary: 'Supplementary ordinary-mode retained served-build observation at the matching light desktop/DPR1 viewport. One trusted open, visible before expiry and absent after expiry on both sides. Not exact lifetime equality, dismissal-cause proof, input equivalence, paint parity, original benchmark execution, or whole-case acceptance. All other obligations and prior remaining tasks are preserved.',
      },
    } } };
  });
  assert.equal(changed, 1);
  const review = { ...parent, groups };
  assert.equal(hash(JSON.stringify(restoreSnackbarSingleOpen(review))), snackbarSingleOpenPredecessor);
  return { review, sha256: hash(JSON.stringify(review)), cases: changed };
}
