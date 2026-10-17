import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { saveReviewProposal, loadCaseObligationReview } from './audit-findings-store.mjs';

// One coherent join of already verified compact evidence,not another capture.
const base = 'artifacts/material-parity/working-audit';
const predecessor = '77d90ece5c89e13850b47563356b3e297d0fdf759b2894225a1f76397769c41a';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const receipt = file => ({ file, sha256: hash(readFileSync(file)) });
const read = item => { const bytes = readFileSync(item.file); assert.equal(hash(bytes), item.sha256); return JSON.parse(bytes); };
const load = name => { const item = receipt(`artifacts/material-parity/${name}-20261018.log`); return { receipt: item, data: read(item) }; };
const pointerBytes = readFileSync(`${base}/current.json`), pointer = JSON.parse(pointerBytes);
const indexBytes = readFileSync(`${base}/${pointer.generation}/index.json`); assert.equal(hash(indexBytes), pointer.indexSha256);
const inventory = JSON.parse(indexBytes).metadata.coverage.caseInventory, configured = [...inventory.static, ...inventory.interaction];
const priorFile = `${base}/proposals/${predecessor}.json`;
loadCaseObligationReview(priorFile, predecessor, configured);
const review = JSON.parse(readFileSync(priorFile)).review; assert.equal(hash(JSON.stringify(review)), predecessor);
const progress = load('progress-recorded-node-accounting'), semantic = load('list-mapped-semantic-requests');
const ax = load('list-false-disabled-retained-ax'), paint = load('list-label-paint-zero-offset');
const verification = load('list-label-bounds-paint-independent-verify-bound'), attribution = load('list-label-input-stage-attribution');
assert.equal(progress.receipt.sha256, 'd4c39ee257cd3e55ad9a9efb83341d3fcb18a34ff1fb293cf8e80bd2599ad2cd');
assert.equal(paint.receipt.sha256, '8a3c67c25bca96773428b916ed1c7a05cd891c2c7731d09b9a8f596458ce04dd');
assert.equal(verification.receipt.sha256, 'd07da835c2faaef87d2d42cad6de1d7b20433193c15052ac689e438c57ffd82b');
assert.equal(verification.data.negativeControlsRejected, 5); assert.equal(paint.data.belowExistingDefault, 104);
assert.equal(semantic.data.newAuthoredRequestControlsRejected, 156);
assert.equal(ax.data.changedDisabledStateControlsRejected, 16); assert.equal(attribution.data.controls, 104);
const capture = read(paint.data.report), producer = receipt('scripts/join-material-passive-paint-batch.mjs');
const key = row => `${row.kind}:list@${row.profile}/${row.viewport.id}${row.state ? '/' + row.state : ''}`;
const captureMap = new Map(capture.results.map(row => [key(row), row])); assert.equal(captureMap.size, 52);
const index = rows => { const map = new Map(rows.map(row => [row.case, row])); assert.equal(map.size, rows.length); return map; };
const progressMap = index(progress.data.records), semanticMap = index(semantic.data.results);
const paintMap = index(paint.data.records), attributionMap = index(attribution.data.records);
const changes = [];
function add(owner, name, value) { assert.equal(owner[name], undefined); owner[name] = value; changes.push(() => delete owner[name]); }
function physicalMatch(observation, captured) {
  return observation.cohort[0] === captured.profile && ['width', 'height', 'deviceScaleFactor']
    .every(name => observation.cohort[1][name] === captured.viewport[name]);
}
let progressCases = 0, listCases = 0, physicalControls = 0;
for (const row of review.groups) {
  if (progressMap.has(row.case)) {
    const record = progressMap.get(row.case); assert.equal(row.family, record.family);
    assert.deepEqual(record.evidence.pairedTrees, row.evidence.pairedTrees);
    add(row.obligations.inputStyleStructure, 'recordedProgressNodeAccounting', {
      disposition: 'inspected-recorded-node-accounting', ...record.mapping, pluginAuthored: record.pluginAuthored,
      evidence: { compactProgress: progress.receipt, pairedTrees: row.evidence.pairedTrees, producer },
      boundary: 'Complete recorded DOM/SVG-to-plugin grouping,not equal SVG/style/paint/semantic inputs,current rendering or whole-case closure.' });
    progressCases++;
  }
  if (row.family !== 'list') continue;
  const sem = semanticMap.get(row.case), local = paintMap.get(row.case), stage = attributionMap.get(row.case), captured = captureMap.get(row.case);
  assert.ok(sem && local && stage && captured); assert.deepEqual(sem.evidence, row.evidence.pairedTrees);
  const matches = ax.data.results.filter(value => physicalMatch(value, captured)); assert.equal(matches.length, 1);
  const altered = structuredClone(captured); altered.viewport.deviceScaleFactor += 1;
  assert.equal(physicalMatch(matches[0], altered), false); physicalControls++;
  add(row.obligations.semantics, 'mappedListSemanticRequests', {
    disposition: 'inspected-recorded-request-omissions', records: sem.records, omittedItemRequests: sem.omittedItemRequests,
    evidence: { mapping: semantic.receipt, pairedTrees: row.evidence.pairedTrees, producer }, boundary: semantic.data.boundary });
  add(row.obligations.semantics, 'retainedFalseDisabledRowAX', {
    disposition: 'inspected-historical-bounded-row-projection', ...matches[0],
    matchedPhysicalContext: { profile: captured.profile, ...captured.viewport },
    evidence: { diagnostic: ax.receipt, original: ax.data.evidence, producer }, boundary: ax.data.boundary });
  const owner = row.obligations.localPaint, oldDisposition = owner.disposition;
  assert.equal(oldDisposition, 'evidence-join-pending'); owner.disposition = 'partial';
  changes.push(() => owner.disposition = oldDisposition);
  add(owner, 'configuredListLabelPaint', {
    disposition: 'inspected-configured-local-diagnostic-failure', labels: local.labels,
    evidence: { paint: paint.receipt, verification: verification.receipt, report: paint.data.report, ...local.evidence, producer },
    boundary: paint.data.boundary });
  add(row.obligations.inputStyleStructure, 'configuredListInputStageAttribution', {
    disposition: 'inspected-unequal-authored-inputs', ...stage, existingFinding: attribution.data.existingFinding,
    evidence: { attribution: attribution.receipt, report: attribution.data.report, trees: stage.trees, producer }, boundary: attribution.data.boundary });
  listCases++;
}
assert.equal(progressCases, 40); assert.equal(listCases, 52); assert.equal(changes.length - listCases, 248);
const proposal = saveReviewProposal(base, review), loaded = loadCaseObligationReview(proposal.file, proposal.sha256, configured);
for (const restore of changes.reverse()) restore();
assert.equal(hash(JSON.stringify(review)), predecessor); assert.deepEqual(readFileSync(`${base}/current.json`), pointerBytes);
console.log(JSON.stringify({ predecessor, proposal, progressCases, listCases, caseChildAdditions: 248,
  localPaintMovedPendingToPartial: 52, physicalContextControlsRejected: physicalControls,
  wholePredecessorRecovered: true, allOriginalRemainingWorkPreserved: true, acceptedPointerUnchanged: true,
  accepted: pointer, dependencies: loaded.evidenceFingerprints.length,
  inspectionComplete: loaded.inspectionComplete, currentRenderingAccepted: loaded.currentRenderingAccepted }));
