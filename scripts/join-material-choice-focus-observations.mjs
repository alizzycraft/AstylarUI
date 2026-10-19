import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { saveReviewProposal, loadCaseObligationReview } from './audit-findings-store.mjs';

const base = 'artifacts/material-parity/working-audit';
const predecessor = 'e835378e87af694f11e23d87250d56406e5be24ca687b79ee32b5abb9d3a7c80';
const hash = b => createHash('sha256').update(b).digest('hex');
const receipt = file => ({ file, sha256: hash(readFileSync(file)) });
const file = 'artifacts/material-parity/choice-focus-mutations-20261019/latest-report.json';
assert.equal(receipt(file).sha256, 'ac05ed5e8d3c04c7182290f42b47d9996e492e2c92d93375067ec57dc7f2304d');
const report = JSON.parse(readFileSync(file));
const verifyFile = 'artifacts/material-parity/choice-focus-mutations-independent-verify-20261019.log';
const verification = JSON.parse(readFileSync(verifyFile));
assert.equal(verification.reportSha256, receipt(file).sha256);
assert.equal(verification.cases, 16);
function check(row) {
  for (const side of ['reference', 'astylar']) {
    const observations = row[side].observations, last = observations.at(-1);
    for (const o of observations.slice(1)) assert.equal(o.activeEqualsTarget, true);
    assert.deepEqual(last.events.map(e => e.type), ['focus', 'focusin']);
    assert.deepEqual(last.mutations, []);
    assert.ok(last.events.every(e => e.target.token === last.active.token));
    assert.equal(last.active.disabled, false);
  }
  assert.equal(row.reference.observations.at(-1).active.tag, 'INPUT');
  const candidate = row.astylar.observations.at(-1).active;
  assert.equal(candidate.role, row.family);
  assert.equal(candidate.logicalId, row.family === 'radio' ? 'radio-solo' : 'checkbox-primary');
  if (row.family === 'radio') assert.equal(row.reference.observations.at(-1).active.value, 'solo');
}
let controls = 0;
for (const row of report.results) {
  check(row);
  const changed = structuredClone(row);
  changed.astylar.observations.at(-1).events[0].target.token = -1;
  assert.throws(() => check(changed)); controls++;
  const blurred = structuredClone(row);
  blurred.astylar.observations.at(-1).events.push({ type: 'blur' });
  assert.throws(() => check(blurred)); controls++;
}
const review = JSON.parse(readFileSync(`${base}/proposals/${predecessor}.json`)).review;
assert.equal(hash(JSON.stringify(review)), predecessor);
const modified = [];
for (const row of report.results) {
  const key = `interaction:${row.family}@${row.profile}/${row.viewport.id}/focus`;
  const groups = review.groups.filter(g => g.case === key); assert.equal(groups.length, 1);
  const focus = groups[0].obligations.programmaticFocus;
  assert.equal(focus.disposition, 'partial');
  assert.equal(focus.directConfiguredChoiceFocus, undefined);
  const task = 'Original configured focus action and other applicable focus/restoration boundaries';
  assert.ok(focus.remaining.includes(task));
  modified.push({ focus, remaining: structuredClone(focus.remaining), case: key });
  focus.directConfiguredChoiceFocus = { disposition: 'inspected-retained-action-only',
    caseId: row.caseId, referenceActive: row.reference.observations.at(-1).active,
    candidateActive: row.astylar.observations.at(-1).active,
    conclusion: 'Original programmatic action focuses checkbox native input/candidate checkbox role,or first solo radio on both sides. Exactly focus/focusin with stable observed owner and no observed blur/mutation. Not selected-team Tab navigation or keyboard activation.',
    evidence: { report: receipt(file), verification: receipt(verifyFile), manifest: report.capture.checkpointManifest,
      pairedTrees: [row.reference.inputTree, row.astylar.inputTree],
      producer: receipt('scripts/join-material-choice-focus-observations.mjs') },
    boundary: 'Current maintained action,authenticated retained build and bounded observer. No full input/paint,current-package,other focus/update or whole-case acceptance.' };
  focus.remaining = focus.remaining.map(x => x === task ? 'Other applicable focus/restoration boundaries beyond the directly observed original configured focus action' : x);
}
assert.equal(modified.length, 16);
const proposed = saveReviewProposal(base, review);
const loaded = loadCaseObligationReview(proposed.file, proposed.sha256, review.groups.map(g => g.case));
for (const { focus, remaining } of modified) { delete focus.directConfiguredChoiceFocus; focus.remaining = remaining; }
assert.equal(hash(JSON.stringify(review)), predecessor);
console.log(JSON.stringify({ predecessor, proposed, cases: modified.map(x => x.case),
  rejectedControls: controls, dependencyCount: loaded.evidenceFingerprints.length,
  allCases: loaded.cases.length, predecessorRecovered: true, scope: 'Bounded configured focus inspection,not whole-case closure or parity acceptance.' }));
