import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { saveReviewProposal, loadCaseObligationReview } from './audit-findings-store.mjs';
import { sourceAuditDefinitions } from '../tests/material-parity/input-equivalence-policy.mjs';

const base = 'artifacts/material-parity/working-audit';
const predecessor = 'bad787812f6803ae08c7fbd49a8edf206b9edf309b225f5ee6f756e44b6488d5';
const hash = b => createHash('sha256').update(b).digest('hex');
const receipt = file => ({ file, sha256: hash(readFileSync(file)) });
const reportFile = 'artifacts/material-parity/pointer-focus-mutations-20261019/latest-report.json';
const verificationFile = 'artifacts/material-parity/pointer-focus-mutations-bound-verify-20261019.log';
const report = JSON.parse(readFileSync(reportFile)), verification = JSON.parse(readFileSync(verificationFile));
assert.equal(receipt(reportFile).sha256, 'd49b33a5e32e51cb7e1674574ec2b16f4b12a4ffc607df0595c007b8d3abf89d');
assert.equal(verification.reportSha256, receipt(reportFile).sha256);
assert.equal(verification.cases, 113); assert.equal(verification.rejectedControls, 226);
const ownerFile = 'artifacts/material-parity/picker-focus-mutations-current-owner-binding-20261019.log';
const owner = JSON.parse(readFileSync(ownerFile));
assert.deepEqual(owner.methods.map(m => m.name), ['reconcile', 'reconcileElement', 'applyAttributes', 'syncFocus']);
const manifest = JSON.parse(readFileSync(report.capture.checkpointManifest.file));
assert.equal(receipt(report.capture.checkpointManifest.file).sha256, report.capture.checkpointManifest.sha256);
for (const item of [...owner.files, owner.manifest]) assert.equal(receipt(item.file).sha256, item.sha256);
for (const item of owner.files.filter(r => /chunk-3JXWRYJY\.js(?:\.map)?$/.test(r.file)))
  assert.equal(manifest.provenance.browserFiles.find(r => item.file.endsWith('/' + r.file))?.sha256, item.sha256);
const definitionIds = ['core-semantic-attribute-refresh-removes-focusability', 'core-semantic-descendant-replacement-loses-retained-focus'];
const definitions = definitionIds.map(id => {
  const found = sourceAuditDefinitions.filter(d => d.id === id); assert.equal(found.length, 1);
  assert.equal(found[0].classification, 'confirmed-core-renderer-defect'); return found[0];
});
const publicEvidence = definitions.flatMap(d => [...d.evidence, ...(d.rootReconciliation?.evidence ?? [])]);
for (const item of publicEvidence) assert.equal(receipt(item.file).sha256, item.sha256);
function mechanism(event) {
  const m = event.mutation, caller = m?.stack?.split('\n')[2] ?? '';
  if (!m) return event.target.tag === 'CANVAS' ? 'canvas-handoff-observation' : 'unattributed';
  if (m.method === 'removeAttribute' && m.args[0] === 'tabindex' && caller.includes('.applyAttributes (')) return 'attribute-focusability-refresh';
  if (m.method === 'replaceChildren' && caller.includes('.reconcileElement (')) return 'descendant-replacement';
  if (m.method === 'replaceChildren' && caller.includes('.reconcile (')) return 'root-replacement';
  return 'unattributed';
}
let changedCauseControls = 0;
const census = {};
const summaries = report.results.map(row => {
  const c = census[row.family] ??= { cases: 0, nativeBlurs: 0, canvasHandoffs: 0, mechanisms: {} }; c.cases++;
  const observations = Object.fromEntries(['reference', 'astylar'].map(side => {
    const evidence = row[side], last = evidence.observations.at(-1);
    assert.match(evidence.inputTreeBoundary, /Collected after recorded observations/);
    const losses = last.events.filter(e => e.type === 'blur').map(e => {
      const cause = mechanism(e);
      if (side === 'reference') c.nativeBlurs++;
      else if (cause === 'canvas-handoff-observation') c.canvasHandoffs++;
      else {
        assert.notEqual(cause, 'unattributed');
        assert.ok(last.mutations.some(m => m.stack === e.mutation.stack && m.afterFocused === false));
        assert.equal(e.mutation.focused.tag, e.target.tag);
        const altered = structuredClone(e); altered.mutation.stack = 'Error\nobserver\nunknown caller';
        assert.notEqual(mechanism(altered), cause); changedCauseControls++;
        c.mechanisms[cause] = (c.mechanisms[cause] ?? 0) + 1;
      }
      return { sequence: e.sequence, target: e.target, related: e.related, cause,
        mutationTarget: e.mutation?.target ?? null, args: e.mutation?.args ?? null,
        sameChildren: e.mutation?.sameChildren ?? null };
    });
    return [side, { active: last.active, eventTypes: last.events.map(e => e.type), losses }];
  }));
  return { caseId: row.caseId, ...observations };
});
assert.equal(changedCauseControls, 122);
assert.equal(Object.values(census).reduce((n,c) => n+c.canvasHandoffs,0), 113);
assert.equal(Object.values(census).reduce((n,c) => n+c.nativeBlurs,0), 16);
const review = JSON.parse(readFileSync(`${base}/proposals/${predecessor}.json`)).review;
assert.equal(hash(JSON.stringify(review)), predecessor);
const modified = [], task = 'Full event/default-action and input ownership classification,focus continuity cause,held/local paint and source/runtime currentness';
for (const [index,row] of report.results.entries()) {
  const key = `interaction:${row.family}@${row.profile}/${row.viewport.id}/${row.state}`;
  const groups = review.groups.filter(g => g.case === key); assert.equal(groups.length, 1);
  const activation = groups[0].obligations.authoredActivation;
  assert.equal(activation.pointerMutationOwner, undefined); assert.equal(activation.disposition, 'partial');
  assert.ok(activation.remaining.includes(task));
  modified.push({ activation, remaining: structuredClone(activation.remaining), case: key });
  activation.pointerMutationOwner = { disposition: 'inspected-retained-action-only', observation: summaries[index],
    existingMechanisms: definitionIds,
    evidence: { report: receipt(reportFile), verification: receipt(verificationFile), manifest: report.capture.checkpointManifest,
      ownerApplicability: receipt(ownerFile), ownerFiles: owner.files, publicEvidence,
      pairedTrees: [row.reference.inputTree, row.astylar.inputTree], producer: receipt('scripts/join-material-pointer-focus-mutations.mjs') },
    boundary: 'Exact maintained pointer action in retained build;complete four current owning methods agree with installed/captured methods. Canvas handoff and native menu blur are distinct observations,not assumed equivalent. Later measured trees do not establish earlier action-time inputs. No whole-package freshness,held paint,complete default-action equivalence or case closure.' };
  activation.remaining = activation.remaining.map(s => s === task ? 'Full event/default-action and input ownership classification,focus boundaries beyond the observed pointer mutation sequence,held/local paint and source/runtime currentness' : s);
}
assert.equal(modified.length, 113);
const proposed = saveReviewProposal(base, review);
const loaded = loadCaseObligationReview(proposed.file, proposed.sha256, review.groups.map(g=>g.case));
for (const {activation,remaining} of modified) { delete activation.pointerMutationOwner; activation.remaining=remaining; }
assert.equal(hash(JSON.stringify(review)), predecessor);
console.log(JSON.stringify({ predecessor, proposed, cases: modified.map(r=>r.case), census, changedCauseControls,
  ownerFiles: owner.files, reusedOwnerBinding: receipt(ownerFile), dependencyCount: loaded.evidenceFingerprints.length,
  allCases: loaded.cases.length, predecessorRecovered: true,
  scope: '113 bounded pointer observations joined;122 mutation-attributed blurs distinct from113 canvas handoffs. No new category,renderer change,current rendering or whole-case closure.' }));
