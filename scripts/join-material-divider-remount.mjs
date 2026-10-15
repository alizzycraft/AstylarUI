import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import { saveReviewProposal, loadCaseObligationReview } from './audit-findings-store.mjs';
import { evaluateFocusedRaster } from '../tests/material-parity/focused-raster-metrics.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const receipt = file => ({ file, sha256: hash(readFileSync(file)) });
const samples = new Map();
for (const remaining of [false, true]) {
  const reportFile = `artifacts/material-parity/divider-remount-peer${remaining ? '-remaining' : ''}-20261015/latest-report.json`;
  const report = JSON.parse(readFileSync(reportFile));
  assert.equal(hash(readFileSync(reportFile)), remaining ? 'bf8d56513ee044141f8918a421313217b517603310a293516fd30559ae67967b'
    : '87c793252052bec4f67ef6a2abcb9ab57515ff9e2da33cfaffa72ebb07edf65d');
  const verified = JSON.parse(execFileSync(process.execPath,
    ['scripts/check-material-divider-remount.mjs', ...(remaining ? ['--remaining'] : [])], { encoding: 'utf8' }));
  assert.equal(verified.negativeControlsRejected, 4); assert.equal(verified.cohorts, remaining ? 18 : 2);
  for (const row of report.results) {
    const cases = row.cases ?? (row.dpr === 1 ? ['static:divider@light/desktop', 'interaction:divider@light/desktop-dpr1/inspect']
      : ['interaction:divider@light/desktop-dpr2/inspect']);
    for (const id of cases) {
      assert.ok(!samples.has(id));
      samples.set(id, { report, reportFile, sample: row.observation, remaining,
        profile: row.profile ?? 'light', viewport: row.viewport ?? { width: 1440, height: 1000 } });
    }
  }
}
assert.equal(samples.size, 24);
const priorSHA = '74d0b4bbbfaa50fa18b0f4e91a4443aa72ec80813972466bbe9b7008d2e94210';
const priorFile = `artifacts/material-parity/working-audit/proposals/${priorSHA}.json`;
const review = JSON.parse(readFileSync(priorFile)).review;
assert.equal(hash(JSON.stringify(review)), priorSHA);
const pointer = JSON.parse(readFileSync('artifacts/material-parity/working-audit/current.json'));
assert.equal(pointer.generation, '9234605241791fcd5d15af1747b83921800a7b31f0dc0ec9440ff83e0345081d');
const indexBytes = readFileSync(`artifacts/material-parity/working-audit/${pointer.generation}/index.json`);
assert.equal(hash(indexBytes), pointer.indexSha256);
const coverage = JSON.parse(indexBytes).metadata.coverage;
assert.equal(coverage.inspectionEvidence.reviewSha256, priorSHA);
const configured = [...coverage.caseInventory.static, ...coverage.caseInventory.interaction];
const selected = review.groups.filter(row => row.family === 'divider').map(row => row.case);
assert.deepEqual([...samples.keys()].sort(), selected.slice().sort());

// Reconcile only the demonstrated metadata-only runner transition. These are
// current-source applicability receipts,not the unavailable original capture.
const runnerFile = 'tests/material-parity/run-material-parity.mjs';
const oldRunnerSHA = '584cdfc8b115e1a8c23834fe939ae6b3d4ff98bca25d61304a094a637825cc4e';
const currentRunnerSHA = hash(readFileSync(runnerFile));
assert.equal(currentRunnerSHA, '86ece08b913903e0a06231a58b32826a8fe561b468f82b7c57ccc32422da60e8');
const conservation = execFileSync(process.execPath, ['--test',
  'tests/material-parity/alignment-crop-provenance.spec.mjs'], { encoding: 'utf8' });
assert.match(conservation, /# pass 6\b/); assert.match(conservation, /# fail 0\b/);
const benchmarkFile = 'tests/material-parity/benchmark-config.spec.mjs';
const benchmark = readFileSync(benchmarkFile, 'utf8').replaceAll('\r\n', '\n');
const originalBenchmark = execFileSync('git', ['show', `f3f98bfd:${benchmarkFile}`],
  { encoding: 'utf8', maxBuffer: 4_000_000 }).replaceAll('\r\n', '\n');
assert.equal(benchmark.split('assert.equal(inventory.proofs.length, 213)').length, 2);
assert.equal(benchmark.replace('assert.equal(inventory.proofs.length, 213)', 'assert.equal(inventory.proofs.length, 209)'), originalBenchmark);
const benchmarkReceipts = [], benchmarkSHA = hash(readFileSync(benchmarkFile));
const runnerReceipts = [];
function refreshRunnerReceipts(value) {
  if (!value || typeof value !== 'object') return;
  if (value.file === runnerFile && Object.hasOwn(value, 'sha256')) {
    assert.equal(value.sha256, oldRunnerSHA); runnerReceipts.push(value); value.sha256 = currentRunnerSHA;
  }
  if (value.file === benchmarkFile && Object.hasOwn(value, 'sha256')) {
    assert.equal(value.sha256, 'e39dc1a70b1ef2efd0287be9c5acdf3d0509a45dc30487a8b9c1581a9bb58c07');
    benchmarkReceipts.push(value); value.sha256 = benchmarkSHA;
  }
  for (const child of Object.values(value)) if (typeof child === 'object') refreshRunnerReceipts(child);
}
refreshRunnerReceipts(review);
assert.equal(runnerReceipts.length, 8186);
assert.equal(benchmarkReceipts.length, 40);

function inputs(tree, sample, profile = 'light') {
  const owners = [];
  const walk = (node, key = 'root', parent = null) => {
    const { children, ...authored } = node; owners.push({ key, parent, authored });
    for (const [index, child] of (children ?? []).entries()) walk(child, `${key}/${index}`, key);
  };
  walk(sample.siteData.root);
  assert.deepEqual(tree.nodes.map(({ key, parent, authored }) => ({ key, parent, authored })), owners);
  assert.equal(owners.length, 10);
  const ruleCount = { light: 294, dark: 294, contrast: 300, custom: 307 }[profile];
  assert.ok(ruleCount); assert.equal(tree.rules.length, ruleCount); assert.equal(sample.siteData.styles.length, ruleCount);
  const changed = [];
  for (let index = 0; index < ruleCount; index++) {
    const before = tree.rules[index], after = sample.siteData.styles[index];
    if (JSON.stringify(before) === JSON.stringify(after)) continue;
    assert.equal(before.selector, '.datepicker-selected'); assert.equal(after.selector, before.selector);
    assert.ok(!owners.some(node => (node.authored.class ?? '').split(/\s+/).includes('datepicker-selected')));
    const fields = [...new Set([...Object.keys(before), ...Object.keys(after)])]
      .filter(key => JSON.stringify(before[key]) !== JSON.stringify(after[key]));
    assert.deepEqual(fields, ['top', 'left']);
    const restored = structuredClone(after);
    for (const key of fields) restored[key] = before[key];
    assert.deepEqual(restored, before);
    changed.push({ ordinal: index, selector: before.selector, matchedAuthoredOwners: 0,
      fields: fields.map(property => ({ property, before: before[property], after: after[property] })) });
  }
  assert.equal(changed.length, 1);
  return { authoredNodes: owners.length, identicalRules: ruleCount - 1, inapplicableRuleDifferences: changed };
}

const paintFile = 'artifacts/material-parity/divider-alignment-provenance-20261015/latest-report.json';
const paint = JSON.parse(readFileSync(paintFile)), paintRows = new Map();
assert.equal(hash(readFileSync(paintFile)), '4be9c6d199952f35203f31d08def08d0d936071f4eb313b75ad3bbf72dd46f11');
for (const [kind, records] of [['static', paint.results], ['interaction', paint.interactions]]) for (const row of records) {
  const id = `${kind}:${row.family}@${row.profile}/${row.viewport.id}${kind === 'interaction' ? `/${row.state}` : ''}`;
  assert.ok(!paintRows.has(id)); paintRows.set(id, row);
}
assert.deepEqual([...paintRows.keys()].sort(), selected.slice().sort());
const textureFile = 'artifacts/material-parity/divider-configured-texture-boundary-20261015/latest-report.json';
const textures = JSON.parse(readFileSync(textureFile));
assert.equal(hash(readFileSync(textureFile)), 'e78434351000b4ec6802a229578f4b5729c35816e419104c57bc424aaa0c050d');
const textureRows = new Map(textures.results.map(row => {
  const key = JSON.parse(row.case);
  return [`${key.kind}:${key.family}@${key.profile}/${key.viewport.id}${key.kind === 'interaction' ? `/${key.state}` : ''}`, row];
}));
const previousOwners = new Map(), previousPaint = new Map(), joins = [];
let passingTargets = 0, failingTargets = 0, textureCases = 0;
for (const id of selected) {
  const row = review.groups.find(value => value.case === id); assert.ok(row);
  const { report, reportFile, sample, remaining, profile, viewport } = samples.get(id);
  const treeReceipt = row.evidence.pairedTrees.astylar, bytes = readFileSync(treeReceipt.file);
  assert.equal(hash(bytes), treeReceipt.sha256);
  const tree = JSON.parse(bytes), correspondence = inputs(tree, sample, profile);
  assert.deepEqual(sample.bounds, { width: viewport.width, height: viewport.height });
  assert.equal(profile, id.split('@')[1].split('/')[0]);
  if (!joins.length) {
    const wrong = structuredClone(sample); wrong.siteData.styles[0].background = '#000000';
    assert.throws(() => inputs(tree, wrong));
    const matchedTree = structuredClone(tree), matchedSample = structuredClone(sample);
    matchedTree.nodes[1].authored.class = 'datepicker-selected';
    matchedSample.siteData.root.children[0].class = 'datepicker-selected';
    assert.throws(() => inputs(matchedTree, matchedSample));
    const missing = structuredClone(sample); missing.siteData.root.children[0].children.pop();
    assert.throws(() => inputs(tree, missing));
  }
  previousOwners.set(id, row.obligations.historyOwnership);
  row.obligations.historyOwnership = { ...row.obligations.historyOwnership, actualDividerPublicRemount: {
    disposition: 'inspected', outcome: 'bounded-public-remount-plateau-and-peer-survival',
    context: { profile, viewport: sample.bounds, dpr: sample.dpr, remounts: 3, boundaries: 14 },
    inputCorrespondence: correspondence,
    evidence: { report: receipt(reportFile), checkpoint: report.capture.checkpointManifest,
      driver: remaining ? report.sourceReceipt : receipt('docs/evidence/material-divider-remount-initial.mjs.txt'),
      capturedDriverFile: report.sourceReceipt.file, capturedDriverSha256: report.sourceReceipt.sha256,
      verifier: receipt('scripts/check-material-divider-remount.mjs'),
      join: receipt('scripts/join-material-divider-remount.mjs'),
      verification: receipt(`artifacts/material-parity/divider-remount-peer-${remaining ? 'remaining-verify' : 'initial-source-replay'}-20261015.log`),
      pairedTrees: row.evidence.pairedTrees },
    boundary: `Supplementary public lifecycle execution in matching physical/input context,not original static/inspect actions. Ten authored node records and${correspondence.identicalRules} rules agree;two clock-derived values on the one absent calendar selector remain unequal and recorded. No old mount-option,plugin-list serialization,resolved paint,Angular remount,late-font,semantic isolation or full-case/current-rendering acceptance.` } };
  const fresh = paintRows.get(id), parent = path.dirname(fresh.inputTrees.reference.file);
  const targetDiagnostics = fresh.textAlignment.map(alignment => {
    const crops = Object.fromEntries(['reference', 'astylar'].map(side => [side,
      receipt(path.join(parent, `${alignment.id}-alignment-${side}.png`))]));
    const metric = evaluateFocusedRaster(PNG.sync.read(readFileSync(crops.reference.file)),
      PNG.sync.read(readFileSync(crops.astylar.file)), { minimumSsim: .8 });
    if (metric.matches) passingTargets++; else failingTargets++;
    return { id: alignment.id, measurementGeometry: alignment.measurementGeometry,
      cropProvenance: alignment.cropProvenance, metric, evidence: crops };
  });
  previousPaint.set(id, row.obligations.localPaint);
  row.obligations.localPaint = { ...row.obligations.localPaint, freshMeasuredTextCrops: {
    disposition: 'inspected', targetDiagnostics,
    evidence: { report: receipt(paintFile), verifier: receipt('tests/material-parity/alignment-crop-provenance.spec.mjs'),
      metric: receipt('tests/material-parity/focused-raster-metrics.mjs'),
      referenceTree: fresh.inputTrees.reference, astylarTree: fresh.inputTrees.astylar,
      join: receipt('scripts/join-material-divider-remount.mjs') },
    boundary: 'Supplementary same configured case/context,not original producer recovery or input equivalence. Both owner boxes and exact crops are observed;all96 crops reconstruct in owning verification. Historical minimumSSIM.8 diagnostic only,not changed acceptance. Original producer uncertainty,remaining paint work and current-library/final gates remain.' } };
  if (textureRows.has(id)) {
    textureCases++;
    row.obligations.localPaint.freshMeasuredTextCrops.configuredTextureInterior = {
      disposition: 'inspected', targets: ['divider-above', 'divider-below'],
      observation: 'Row-reversed GPU readback alpha agrees;15/37 RGB channels differ by1. Existing nearest-texel model predicts sampled interiors within1RGB;wrong-row controls reject.',
      evidence: { report: receipt(textureFile), sources: textures.capture.sources,
        checkpoint: textures.capture.checkpointManifest },
      boundary: 'Four contrast-DPR1 contexts only;not native glyph equality,plane-edge coverage,draw-call font history or causal shader identity.' };
  }
  assert.equal(row.inspection, 'partial'); assert.equal(row.currentRendering, 'unverified');
  joins.push({ case: id, ...correspondence, dpr: sample.dpr });
}
assert.equal(passingTargets, 40); assert.equal(failingTargets, 8); assert.equal(textureCases, 4);
const proposal = saveReviewProposal('artifacts/material-parity/working-audit', review);
const loaded = loadCaseObligationReview(proposal.file, proposal.sha256, configured);
assert.equal(loaded.cases.length, 2311); assert.equal(loaded.inspectionComplete, false);
assert.equal(loaded.currentRenderingAccepted, false);
assert.ok(loaded.cases.every(row => row.inspection === 'partial' && row.currentRendering === 'unverified'));
for (const [id, previous] of previousOwners) review.groups.find(row => row.case === id).obligations.historyOwnership = previous;
for (const [id, previous] of previousPaint) review.groups.find(row => row.case === id).obligations.localPaint = previous;
for (const receipt of runnerReceipts) receipt.sha256 = oldRunnerSHA;
for (const receipt of benchmarkReceipts) receipt.sha256 = 'e39dc1a70b1ef2efd0287be9c5acdf3d0509a45dc30487a8b9c1581a9bb58c07';
assert.equal(hash(JSON.stringify(review)), priorSHA, 'Unrelated review evidence changed');
console.log(JSON.stringify({ phase: 'divider-remount-case-join', proposal, predecessor: priorSHA,
  joins, cases: loaded.cases.length, dependencies: loaded.evidenceFingerprints.length,
  onlyDividerOwnershipPaintAndDemonstratedSourceReceiptsChanged: true, physicalContexts: 20, inputNegativeControlsRejected: 3,
  benchmarkReceiptTransition: { file: benchmarkFile, receipts: benchmarkReceipts.length, after: benchmarkSHA,
    boundary: 'Exact whole-suite conservation after reversing only209-to213 inventory count;no assertion omission' },
  freshPaintCases: paintRows.size, passingTargets, failingTargets, textureCases,
  runnerReceiptTransition: { file: runnerFile, before: oldRunnerSHA, after: currentRunnerSHA, receipts: runnerReceipts.length,
    proof: 'Exact metadata-only whole-runner restoration;not original e01ef9dc capture recovery or current rendering acceptance' },
  inspectionComplete: loaded.inspectionComplete, currentRenderingAccepted: loaded.currentRenderingAccepted }));
