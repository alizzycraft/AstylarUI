import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { saveReviewProposal, loadCaseObligationReview } from './audit-findings-store.mjs';

const base = 'artifacts/material-parity/working-audit';
const predecessor = '104d7c6108078241059e944e43ea022353ff7d9d9a8cc1a779014c52c6aec209';
const hash = b => createHash('sha256').update(b).digest('hex');
const receipt = file => ({ file, sha256: hash(readFileSync(file)) });
const review = JSON.parse(readFileSync(`${base}/proposals/${predecessor}.json`)).review;
assert.equal(hash(JSON.stringify(review)), predecessor);
const reportFile = 'artifacts/material-parity/picker-focus-mutations-bound-20261019/latest-report.json';
const report = JSON.parse(readFileSync(reportFile));
assert.equal(hash(readFileSync(reportFile)), 'b649d152f7bed697890045bac86f03b59d6aa67f99a6acc9c88a50b3936cb123');
const log = name => `artifacts/material-parity/picker-focus-mutations-${name}-20261019.log`;
const verification = JSON.parse(readFileSync(log('independent-verify')));
assert.equal(verification.cases, 16);
assert.equal(verification.reportSha256, hash(readFileSync(reportFile)));
const census = JSON.parse(readFileSync(log('owner-census')));
assert.equal(census.alteredCauseControlsRejected, 32);
assert.equal(census.rows.length, 16);
const binding = JSON.parse(readFileSync(log('current-owner-binding')));
assert.equal(binding.report.sha256, verification.reportSha256);
assert.deepEqual(binding.methods.map(m => m.name), ['reconcile', 'reconcileElement', 'applyAttributes', 'syncFocus']);
for (const item of [...binding.files, binding.manifest]) assert.equal(receipt(item.file).sha256, item.sha256);
const modified = [];
for (const row of report.results) {
  const key = `interaction:${row.family}@${row.profile}/${row.viewport.id}/focus`;
  assert.ok(census.rows.some(r => r.caseId === row.caseId));
  const matches = review.groups.filter(g => g.case === key);
  assert.equal(matches.length, 1);
  const group = matches[0], name = row.family === 'timepicker' ? 'authoredActivation' : 'programmaticFocus';
  const obligation = group.obligations[name];
  assert.equal(obligation.pickerMutationOwner, undefined);
  assert.ok(['partial', 'evidence-join-pending'].includes(obligation.disposition));
  modified.push({ obligation, previous: obligation.disposition, case: key });
  obligation.disposition = 'partial';
  obligation.pickerMutationOwner = {
    disposition: 'inspected-retained-runtime-failure',
    caseId: row.caseId,
    conclusion: 'Same-input focus interruption occurs synchronously in descendant reconcileElement replaceChildren on picker-primary; original input remains connected and later refocused. Native has no blur. Existing semantic reconciliation core finding,not a new defect category.',
    evidence: { producer: receipt('scripts/join-material-picker-focus-mutations.mjs'),
      report: receipt(reportFile), verification: receipt(log('independent-verify')),
      ownerCensus: receipt(log('owner-census')), sourceApplicability: receipt(log('current-owner-binding')),
      manifest: binding.manifest, ownerFiles: binding.files, pairedTrees: [row.reference.inputTree, row.astylar.inputTree] },
    boundary: 'Exact maintained configured action and context in retained build. Complete four current owning methods match installed and capture-map methods. Not whole-source freshness,equal authored inputs,local paint,other actions or case closure. Existing remaining work is preserved.' };
}
assert.equal(modified.length, 16);
const proposed = saveReviewProposal(base, review);
const loaded = loadCaseObligationReview(proposed.file, proposed.sha256, review.groups.map(g => g.case));
for (const { obligation, previous } of modified) {
  delete obligation.pickerMutationOwner;
  obligation.disposition = previous;
}
assert.equal(hash(JSON.stringify(review)), predecessor);
console.log(JSON.stringify({ predecessor, proposed, cases: modified.map(r => r.case),
  dependencyCount: loaded.evidenceFingerprints.length, allCases: loaded.cases.length,
  predecessorRecovered: true, canonicalUnchanged: true, boundary: 'Queued partial evidence only; no closure/current-rendering promotion.' }));
