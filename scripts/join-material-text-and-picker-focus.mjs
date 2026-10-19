import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { saveReviewProposal, loadCaseObligationReview } from './audit-findings-store.mjs';

const base = 'artifacts/material-parity/working-audit';
const predecessor = 'aa18b19d0727456cc2d483cbe6ba15064888b9a962b5d1de4b41b54201328f4e';
const hash = b => createHash('sha256').update(b).digest('hex');
const receipt = file => ({ file, sha256: hash(readFileSync(file)) });
const ownerFile = 'artifacts/material-parity/picker-focus-mutations-current-owner-binding-20261019.log';
const owner = JSON.parse(readFileSync(ownerFile));
for (const item of owner.files) assert.equal(receipt(item.file).sha256, item.sha256);
const inputs = [
  { file: 'artifacts/material-parity/text-input-focus-events-bound-20261019/latest-report.json',
    sha256: '21387e63992d907e6a5675a0c3bad150c5face9073d9f1d39d42c146279f6cd0', count: 24,
    verify: 'artifacts/material-parity/text-input-focus-events-independent-verify-20261019.log', key: 'directConfiguredTextFocus' },
  { file: 'artifacts/material-parity/picker-focus-mutations-bound-20261019/latest-report.json',
    sha256: 'b649d152f7bed697890045bac86f03b59d6aa67f99a6acc9c88a50b3936cb123', count: 16,
    verify: 'artifacts/material-parity/picker-focus-mutations-independent-verify-20261019.log', key: 'configuredPickerFocusTaskDisposition' },
];
const review = JSON.parse(readFileSync(`${base}/proposals/${predecessor}.json`)).review;
assert.equal(hash(JSON.stringify(review)), predecessor);
const modified = []; let changedCallerControls = 0;
for (const input of inputs) {
  assert.equal(receipt(input.file).sha256, input.sha256);
  const report = JSON.parse(readFileSync(input.file)), verification = JSON.parse(readFileSync(input.verify));
  assert.equal(verification.cases, input.count); assert.equal(verification.reportSha256, input.sha256);
  const manifest = JSON.parse(readFileSync(report.capture.checkpointManifest.file));
  assert.equal(receipt(report.capture.checkpointManifest.file).sha256, report.capture.checkpointManifest.sha256);
  for (const item of owner.files.filter(f => /chunk-3JXWRYJY\.js(?:\.map)?$/.test(f.file)))
    assert.equal(manifest.provenance.browserFiles.find(r => item.file.endsWith('/' + r.file))?.sha256, item.sha256);
  for (const row of report.results) {
    const key = `interaction:${row.family}@${row.profile}/${row.viewport.id}/focus`;
    const groups = review.groups.filter(g => g.case === key); assert.equal(groups.length, 1);
    const focus = groups[0].obligations.programmaticFocus, last = row.astylar.observations.at(-1);
    const losses = last.events.filter(e => e.type === 'blur' && e.target.tag === 'INPUT');
    assert.equal(losses.length, 1); const loss = losses[0];
    assert.equal(loss.mutation.method, 'replaceChildren');
    assert.match(loss.mutation.stack.split('\n')[2], /\.reconcileElement \(/);
    assert.equal(loss.mutation.target.logicalId, row.family + '-primary');
    assert.equal(last.active.token, loss.target.token);
    assert.equal(row.reference.observations.at(-1).events.filter(e => e.type === 'blur').length, 0);
    const changed = structuredClone(loss); changed.mutation.stack = 'Error\nobserver\nunknown';
    assert.throws(() => assert.match(changed.mutation.stack.split('\n')[2], /\.reconcileElement \(/)); changedCallerControls++;
    assert.equal(focus.disposition, 'partial'); assert.equal(focus[input.key], undefined);
    const task = 'Original configured focus action and other applicable focus/restoration boundaries';
    if (['form-field', 'input'].includes(row.family)) {
      assert.deepEqual(focus.remaining, ['Original owning source/behavior/paint assertions with complete runner provenance',
        'Current rendering applicability and other action boundaries']);
    } else assert.ok(focus.remaining.includes(task));
    modified.push({ focus, remaining: structuredClone(focus.remaining), key: input.key, case: key });
    focus[input.key] = { disposition: 'inspected-retained-action-only',
      action: row.family === 'timepicker' ? 'configured pointer click that focuses input; not programmatic focus()' : 'configured programmatic focus()',
      observation: { caseId: row.caseId, referenceActive: row.reference.observations.at(-1).active,
        candidateActive: last.active, blurSequence: loss.sequence, mutation: loss.mutation },
      existingDefinition: 'core-semantic-descendant-replacement-loses-retained-focus',
      evidence: { report: receipt(input.file), verification: receipt(input.verify), manifest: report.capture.checkpointManifest,
        ownerApplicability: receipt(ownerFile), ownerFiles: owner.files,
        pairedTrees: [row.reference.inputTree, row.astylar.inputTree],
        producer: receipt('scripts/join-material-text-and-picker-focus.mjs') },
      boundary: 'Direct action events and bounded descendant-loss attribution only. Older reports and missing original-runner bytes remain unchanged. Not whole source/runtime,paint,all focus restoration or whole-case acceptance. Text-input trees are collected after observations through the exact owning measurement helper.' };
    focus.remaining = focus.remaining.map(x => x === task ? row.family === 'timepicker'
      ? 'Actual programmatic focus() and other focus/restoration boundaries beyond the observed configured pointer-focus action'
      : 'Other applicable focus/restoration boundaries beyond the directly observed original configured focus action' : x);
  }
}
assert.equal(modified.length, 40);
const cohortKeys = ['configuredControlFocusObservation', 'directConfiguredTextFocus', 'configuredPickerFocusTaskDisposition', 'directConfiguredChoiceFocus', 'directRemainingConfiguredFocus'];
const configuredFocus = review.groups.filter(g => g.case.endsWith('/focus'));
const applicable = configuredFocus.filter(g => g.obligations.programmaticFocus.applicability !== 'not-applicable');
assert.equal(applicable.length, 216);
for (const g of applicable) assert.equal(cohortKeys.filter(k => Object.hasOwn(g.obligations.programmaticFocus, k)).length, 1);
assert.equal(configuredFocus.length - applicable.length, 40);
const proposed = saveReviewProposal(base, review);
const loaded = loadCaseObligationReview(proposed.file, proposed.sha256, review.groups.map(g => g.case));
for (const { focus, remaining, key } of modified) { delete focus[key]; focus.remaining = remaining; }
assert.equal(hash(JSON.stringify(review)), predecessor);
console.log(JSON.stringify({ predecessor, proposed, cases: modified.map(x => x.case), changedCallerControls,
  configuredFocusRecordCohort: { applicableWithDirectObservation: 216, authoredExclusions: 40, boundary: 'Known configured focus-action records only; not all focus states,current validity,whole-case closure or audit completion.' },
  dependencyCount: loaded.evidenceFingerprints.length, allCases: loaded.cases.length, predecessorRecovered: true }));
