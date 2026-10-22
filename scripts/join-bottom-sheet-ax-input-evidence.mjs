import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { getHeapStatistics } from 'node:v8';
import { saveReviewProposal, loadCaseObligationReview } from './audit-findings-store.mjs';
import { createDividerReviewedBoundariesReader, tabsMenuSheetReview } from '../tests/material-parity/text-backing-case-review-source.mjs';
assert.ok(getHeapStatistics().heap_size_limit >= 3 * 1024 ** 3, 'Use node --max-old-space-size=4096 after heavy export work finishes');
const hash = b => createHash('sha256').update(b).digest('hex');
const receipt = file => ({ file, sha256: hash(fs.readFileSync(file)) });
const base = 'artifacts/material-parity/working-audit', predecessor = '9f9dfaf0059239d5bef5132dbcd5318984eccffad44d46cc7d65f98c1ca08763';
const review = JSON.parse(fs.readFileSync(`${base}/proposals/${predecessor}.json`)).review;
assert.equal(hash(JSON.stringify(review)), predecessor);
const pointerFile = `${base}/current.json`, pointer = fs.readFileSync(pointerFile), producer = receipt('scripts/join-bottom-sheet-ax-input-evidence.mjs');
const groups = new Map(review.groups.map(r => [r.case, r])); assert.equal(groups.size, 2311);
function replay(script, file) {
  const bytes = fs.readFileSync(file); assert.deepEqual(execFileSync(process.execPath, [script], { maxBuffer: 8000000 }), bytes);
  const result = JSON.parse(bytes); assert.equal(hash(fs.readFileSync(result.producer.file)), result.producer.sha256);
  return result;
}
const axFile = 'artifacts/material-parity/bottom-sheet-activate-ax-review-20261022.log';
const ax = replay('scripts/check-bottom-sheet-activate-ax.mjs', axFile);
assert.equal(ax.pairs, 9); assert.equal(ax.negativeControlsRejected, 108);
const focusFile = 'artifacts/material-parity/bottom-sheet-focus-source-applicability-20261022.log';
const focus = replay('scripts/check-bottom-sheet-focus-source-applicability.mjs', focusFile);
assert.equal(focus.historicalOrdering.targetMissingAtAttempt, true); assert.equal(focus.historicalOrdering.targetPresentAfterUpdate, true);
const archivedSource = receipt('artifacts/material-parity/bottom-sheet-preserved-source-20261022/astylar.component.ts');
assert.equal(archivedSource.sha256, focus.preservedCapturedSource.sha256);
assert.deepEqual(fs.readFileSync(archivedSource.file), fs.readFileSync(focus.preservedCapturedSource.file));
const nameFile = 'artifacts/material-parity/bottom-sheet-name-input-review-20261022.log';
const name = replay('scripts/review-bottom-sheet-name-inputs.mjs', nameFile);
assert.equal(name.complete180PredecessorPreserved, true); assert.equal(name.saved.sha256, '835eba45b519d7ba3b026eaddba3b5c3381f4dcbc6610421b1331b47251b98ed');
const capture = JSON.parse(fs.readFileSync(ax.report.file));
for (const r of Object.values(capture.provenance).filter(r => r?.file && r?.sha256)) assert.equal(hash(fs.readFileSync(r.file)), r.sha256);
const pairs = new Map(), changes = [];
for (const row of ax.observations) {
  const key = `interaction:bottom-sheet@${row.profile}/${row.viewport.id}/activate`, pair = pairs.get(key) ?? [];
  pair.push(row); pairs.set(key, pair);
}
assert.equal(pairs.size, 9);
function add(group, obligation, key, value) {
  assert.equal(group.inspection, 'partial'); assert.equal(group.currentRendering, 'unverified');
  const owner = group.obligations[obligation]; assert.ok(owner); assert.equal(owner[key], undefined);
  owner[key] = value; changes.push([owner, key]);
}
for (const [key, pair] of pairs) {
  assert.equal(pair.length, 2); assert.deepEqual(pair.map(r => r.mode).sort(), ['astylar', 'reference']);
  assert.deepEqual(pair[0].viewport, pair[1].viewport); const group = groups.get(key); assert.equal(group?.family, 'bottom-sheet');
  add(group, 'semantics', 'retainedConfiguredActivateActualAx', {
    disposition: 'inspected-actual-dialog-name-action-role-and-focused-endpoint-differences',
    observations: pair.map(r => ({ mode: r.mode, result: r.result })),
    evidence: { raw: pair.map(r => ({ file: r.file, sha256: r.sha256 })), verification: receipt(axFile), verifier: ax.producer,
      capture: ax.report, checkpoint: capture.provenance.checkpoint, actionSource: ax.actionSource,
      sourceBindingReuse: ax.sourceBindingReuse, pendingNameReview: receipt(name.saved.file), nameVerification: receipt(nameFile), producer },
    boundary: ax.boundary });
  add(group, 'historyOwnership', 'retainedAuthoredFocusRequestSourceApplicability', {
    disposition: 'inspected-unchanged-authored-methods-and-historical-request-order-not-new-endpoint-timing',
    exactWholeAuthoredMethods: focus.exactWholeAuthoredMethods, historicalOrdering: focus.historicalOrdering,
    conclusion: focus.conclusion,
    evidence: { verification: receipt(focusFile), verifier: focus.producer, historicalTrace: focus.historicalTrace,
      preservedCapturedSource: archivedSource, current: focus.current, sourceMap: focus.sourceMap, producer },
    boundary: focus.boundary });
}
assert.equal(changes.length, 18);
const proposal = saveReviewProposal(base, review);
const reader = createDividerReviewedBoundariesReader({ root: process.cwd(), read: fs.readFileSync, reviewSha256: tabsMenuSheetReview });
const loaded = loadCaseObligationReview(proposal.file, proposal.sha256, review.groups.map(r => r.case), { read: reader.read });
assert.equal(loaded.cases.length, 2311); assert.equal(loaded.inspectionComplete, false); assert.equal(loaded.currentRenderingAccepted, false);
assert.deepEqual(loaded.unjoinedCases, []);
for (const [owner, key] of changes) delete owner[key]; assert.equal(hash(JSON.stringify(review)), predecessor);
assert.deepEqual(fs.readFileSync(pointerFile), pointer);
console.log(JSON.stringify({ producer, predecessor, proposal, addedChildren: 18, configuredActivatePairs: 9,
  pendingSourceReview: receipt(name.saved.file), validatedDependencies: loaded.evidenceFingerprints.length,
  completePredecessorRecovered: true, acceptedPointerUnchanged: true, selectedForExport: false,
  canonicalPublication: false, inspectionComplete: false, currentRenderingAccepted: false,
  boundary: 'Paired configured activate AX endpoints and bounded authored-method/historical-trace applicability joined separately. Historical ordering is not asserted as observed timing in all9 new pairs. Existing remaining-work/statuses preserve;pending name finding not registered by this join.' }));
