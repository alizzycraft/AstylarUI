import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { saveReviewProposal, loadCaseObligationReview } from './audit-findings-store.mjs';

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

const previousOwners = new Map(), joins = [];
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
  assert.equal(row.inspection, 'partial'); assert.equal(row.currentRendering, 'unverified');
  joins.push({ case: id, ...correspondence, dpr: sample.dpr });
}
const proposal = saveReviewProposal('artifacts/material-parity/working-audit', review);
const loaded = loadCaseObligationReview(proposal.file, proposal.sha256, configured);
assert.equal(loaded.cases.length, 2311); assert.equal(loaded.inspectionComplete, false);
assert.equal(loaded.currentRenderingAccepted, false);
assert.ok(loaded.cases.every(row => row.inspection === 'partial' && row.currentRendering === 'unverified'));
for (const [id, previous] of previousOwners) review.groups.find(row => row.case === id).obligations.historyOwnership = previous;
assert.equal(hash(JSON.stringify(review)), priorSHA, 'Unrelated review evidence changed');
console.log(JSON.stringify({ phase: 'divider-remount-case-join', proposal, predecessor: priorSHA,
  joins, cases: loaded.cases.length, dependencies: loaded.evidenceFingerprints.length,
  onlyDividerOwnershipSubrecordsChanged: true, physicalContexts: 20, inputNegativeControlsRejected: 3,
  inspectionComplete: loaded.inspectionComplete, currentRenderingAccepted: loaded.currentRenderingAccepted }));
