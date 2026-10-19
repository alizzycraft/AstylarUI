import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { saveReviewProposal, loadCaseObligationReview } from './audit-findings-store.mjs';
import { sourceAuditDefinitions } from '../tests/material-parity/input-equivalence-policy.mjs';

const base = 'artifacts/material-parity/working-audit';
const predecessor = 'beda645a72d8c899b7732104bb258d55fdff68eeeb834e2dc25988d36d710683';
const hash = b => createHash('sha256').update(b).digest('hex');
const receipt = file => ({ file, sha256: hash(readFileSync(file)) });
const file = 'artifacts/material-parity/remaining-configured-focus-measured-20261019/latest-report.json';
const report = JSON.parse(readFileSync(file));
const verifyFile = 'artifacts/material-parity/remaining-configured-focus-independent-verify-20261019.log';
const verification = JSON.parse(readFileSync(verifyFile));
assert.equal(verification.cases, 104);
assert.equal(verification.reportSha256, receipt(file).sha256);
const ownerFile = 'artifacts/material-parity/picker-focus-mutations-current-owner-binding-20261019.log';
const owner = JSON.parse(readFileSync(ownerFile));
const manifest = JSON.parse(readFileSync(report.capture.checkpointManifest.file));
assert.equal(receipt(report.capture.checkpointManifest.file).sha256, report.capture.checkpointManifest.sha256);
for (const item of owner.files) {
  assert.equal(receipt(item.file).sha256, item.sha256);
  if (item.file.endsWith('/chunk-3JXWRYJY.js') || item.file.endsWith('/chunk-3JXWRYJY.js.map'))
    assert.equal(manifest.provenance.browserFiles.find(r => item.file.endsWith('/' + r.file))?.sha256, item.sha256);
}
const definitionIds = ['core-semantic-attribute-refresh-removes-focusability', 'core-semantic-descendant-replacement-loses-retained-focus'];
const definitions = definitionIds.map(id => {
  const rows = sourceAuditDefinitions.filter(d => d.id === id); assert.equal(rows.length, 1);
  assert.equal(rows[0].classification, 'confirmed-core-renderer-defect'); return rows[0];
});
const publicEvidence = definitions.flatMap(d => [...d.evidence, ...(d.rootReconciliation?.evidence ?? [])]);
for (const item of publicEvidence) assert.equal(receipt(item.file).sha256, item.sha256);
function mechanism(event) {
  const m = event.mutation;
  if (!m) return 'unattributed-observed-focus-loss';
  const caller = m.stack?.split('\n')[2] ?? '';
  if (m.method === 'removeAttribute' && m.args[0] === 'tabindex' && caller.includes('.applyAttributes (')) return 'attribute-focusability-refresh';
  if (m.method === 'replaceChildren' && caller.includes('.reconcileElement (')) return 'descendant-replacement';
  if (m.method === 'replaceChildren' && caller.includes('.reconcile (')) return 'root-replacement';
  return 'unattributed-observed-focus-loss';
}
let changedCauseControls = 0;
const summaries = report.results.map(row => {
  const sides = Object.fromEntries(['reference', 'astylar'].map(side => {
    const evidence = row[side], last = evidence.observations.at(-1);
    assert.match(evidence.inputTreeBoundary, /Collected after recorded observations/);
    assert.deepEqual(evidence.observations.map(o => o.boundary), ['before', 'after-action', 'settled']);
    const losses = last.events.filter(e => e.type === 'blur').map(event => {
      const cause = mechanism(event);
      if (event.mutation && cause !== 'unattributed-observed-focus-loss') {
        assert.ok(last.mutations.some(m => m.stack === event.mutation.stack && m.afterFocused === false));
        const changed = structuredClone(event); changed.mutation.stack = 'Error\nobserver\nunknown caller';
        assert.notEqual(mechanism(changed), cause); changedCauseControls++;
      }
      return { sequence: event.sequence, target: event.target, cause,
        mutationTarget: event.mutation?.target ?? null, args: event.mutation?.args ?? null,
        sameChildren: event.mutation?.sameChildren ?? null };
    });
    return [side, { active: last.active, target: last.target, activeEqualsTarget: last.activeEqualsTarget,
      activeWithinHost: last.activeWithinHost, eventTypes: last.events.map(e => e.type), losses }];
  }));
  return { caseId: row.caseId, ...sides };
});
assert.equal(summaries.length, 104);
const review = JSON.parse(readFileSync(`${base}/proposals/${predecessor}.json`)).review;
assert.equal(hash(JSON.stringify(review)), predecessor);
const modified = [];
for (const [index, row] of report.results.entries()) {
  const key = `interaction:${row.family}@${row.profile}/${row.viewport.id}/focus`;
  const groups = review.groups.filter(g => g.case === key); assert.equal(groups.length, 1);
  const focus = groups[0].obligations.programmaticFocus;
  assert.equal(focus.disposition, 'partial');
  assert.equal(focus.directRemainingConfiguredFocus, undefined);
  const task = 'Original configured focus action and other applicable focus/restoration boundaries';
  assert.ok(focus.remaining.includes(task));
  modified.push({ focus, remaining: structuredClone(focus.remaining), case: key });
  focus.directRemainingConfiguredFocus = { disposition: 'inspected-retained-action-only', observation: summaries[index],
    existingMechanisms: definitionIds,
    evidence: { report: receipt(file), verification: receipt(verifyFile), manifest: report.capture.checkpointManifest,
      ownerApplicability: receipt(ownerFile), ownerFiles: owner.files, publicEvidence,
      policy: receipt('tests/material-parity/input-equivalence-policy.mjs'),
      pairedTrees: [row.reference.inputTree, row.astylar.inputTree],
      producer: receipt('scripts/join-material-remaining-configured-focus.mjs') },
    boundary: 'Exact maintained focus action; retained build,current complete owner-method applicability. Raw targets and failures remain distinct. Later input trees use owning measurement guard AFTER observations. No whole-source/current rendering,all input/paint,update behavior or case closure claim. No-blur observations are not proof against other reflows.' };
  focus.remaining = focus.remaining.map(x => x === task ? 'Other applicable focus/restoration boundaries beyond the directly observed original configured focus action' : x);
}
assert.equal(modified.length, 104);
const proposed = saveReviewProposal(base, review);
const loaded = loadCaseObligationReview(proposed.file, proposed.sha256, review.groups.map(g => g.case));
for (const { focus, remaining } of modified) { delete focus.directRemainingConfiguredFocus; focus.remaining = remaining; }
assert.equal(hash(JSON.stringify(review)), predecessor);
console.log(JSON.stringify({ predecessor, proposed, cases: modified.map(x => x.case), summaries,
  changedCauseControls, dependencyCount: loaded.evidenceFingerprints.length,
  allCases: loaded.cases.length, predecessorRecovered: true,
  scope: '104 bounded original-focus observations with distinct runtime causes; not full-case closure or parity acceptance.' }));
