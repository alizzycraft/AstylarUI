import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { saveReviewProposal, loadCaseObligationReview } from './audit-findings-store.mjs';

// Reuse the existing exact-case census and original TAP observations. No browser
// capture,reinterpretation of profile labels,or whole-parent promotion.
const script = 'scripts/join-material-icon-retained-obligations.mjs';
const hash = b => createHash('sha256').update(b).digest('hex');
const base = 'artifacts/material-parity/';
const predecessor = '117a41db956f86e1465b8de0fee9e3d5a0fd3073049c1698a837fd0eee4ec3cb';
const review = JSON.parse(readFileSync(`${base}working-audit/proposals/${predecessor}.json`)).review;
assert.equal(hash(JSON.stringify(review)), predecessor);
const receipts = [
  ['icon-update-disposal-20261007.log', '18229d6c75d784e13b6014d040277a3313976798136dd9bb948b04d0e376f098'],
  ['icon-responsive-update-disposal-20261007.log', '22b822f1921a10a843c8cd9cb1c3f8ff52636fd12c8dee832638cb3f722e954a'],
  ['passive-badge-icon-ax-verified-20261006.log', 'be9aab6af9e9033e6d81efaee354bdb1aa5b4b237d4074edacda499f241a2516'],
  ['icon-remaining-ax-20261007.log', '3613ac867242858953e2d4a31342b319e0d2c504ce15590682718354979d8612'],
].map(([name, sha256]) => {
  const file = base + name, bytes = readFileSync(file); assert.equal(hash(bytes), sha256);
  return { file, sha256, records: bytes.toString().split(/\r?\n/).filter(s => s.startsWith('# {')).map(s => JSON.parse(s.slice(2))) };
});
const censusFile = base + 'icon-case-obligation-join-20261007-retry.log';
const censusBytes = readFileSync(censusFile);
assert.equal(hash(censusBytes), '1bcab2aec1654311852a6e9c1766f162e1ce8434aff943ecb018f9337645967f');
const census = JSON.parse(censusBytes);
assert.equal(census.configuredCases, 20); assert.equal(census.physicalCohorts, 16);
const reportBytes = readFileSync(base + 'current-full-20261005/latest-report.json');
assert.equal(hash(reportBytes), census.reportSha256);
assert.equal(census.reportSha256, 'ab42dbec6280e0e27784ec4bbc6697d4ea451bfab307bccb720c0dec89a83b62');
const report = JSON.parse(reportBytes);
const originalCases = new Map([
  ...report.results.filter(r => r.family === 'icon').map(r => [`static/icon/${r.profile}/${r.viewport.id}/initial`, r]),
  ...report.interactions.filter(r => r.family === 'icon').map(r => [`interaction/icon/${r.profile}/${r.viewport.id}/${r.state}`, r]),
]);
assert.equal(originalCases.size, 20);
for (const receipt of census.receipts) assert.equal(hash(readFileSync(base + receipt.file)), receipt.sha256);
const key = (profile, viewport) => `${profile}/${viewport.width}/${viewport.height}/${viewport.deviceScaleFactor}`;
const ax = new Map();
for (const r of receipts[3].records.filter(r => r.family === 'icon')) {
  const k = key(r.profile, r.viewport); const pair = ax.get(k) ?? {}; assert.equal(pair[r.mode], undefined);
  pair[r.mode] = r; ax.set(k, pair);
}
const first = receipts[2].records.find(r => r.observations).observations.filter(r => r.family === 'icon');
assert.equal(first.length, 2); ax.set('light/1440/1000/1', Object.fromEntries(first.map(r => [r.mode, r])));
assert.equal(ax.size, 16);
function checkExposure(pair) {
  assert.equal(pair.reference.dom.hidden, 'true');
  assert.ok(pair.reference.nodes[0].ignored);
  assert.ok(pair.reference.nodes[0].ignoredReasons.some(r => r.name === 'ariaHiddenElement' && r.value.value === true));
  assert.equal(pair.astylar.dom.hidden, null);
  assert.equal(pair.astylar.nodes[0].ignored, false);
  assert.equal(pair.astylar.nodes[0].role.value, 'image');
  assert.equal(pair.astylar.nodes[0].name.value, 'Favorite');
}
for (const pair of ax.values()) checkExposure(pair);
let rejected = 0;
for (const mutate of [p => { p.reference.dom.hidden = null; }, p => { p.reference.nodes[0].ignoredReasons = []; },
  p => { p.astylar.nodes[0].ignored = true; }, p => { p.astylar.nodes[0].name.value = 'wrong'; }]) {
  const p = structuredClone(ax.values().next().value); mutate(p); assert.throws(() => checkExposure(p)); rejected++;
}
const originals = [];
for (const c of census.cases) {
  const captured = originalCases.get(c.case); assert.ok(captured);
  assert.equal(key(captured.profile, captured.viewport), c.cohort);
  const parts = c.case.split('/'), id = `${parts[0]}:${parts[1]}@${parts[2]}/${parts[3]}${parts[0] === 'interaction' ? '/' + parts[4] : ''}`;
  const row = review.groups.find(r => r.case === id); assert.equal(row?.family, 'icon');
  const pair = ax.get(c.cohort); assert.ok(pair); checkExposure(pair);
  for (const side of ['reference', 'astylar']) {
    const receipt = row.evidence.pairedTrees[side]; assert.equal(hash(readFileSync(receipt.file)), receipt.sha256);
  }
  originals.push({ row, semantics: row.obligations.semantics, history: row.obligations.historyOwnership });
  const evidence = { census: { file: censusFile, sha256: hash(readFileSync(censusFile)) },
    logs: receipts.map(({ file, sha256 }) => ({ file, sha256 })), join: { file: script, sha256: hash(readFileSync(script)) } };
  row.obligations.semantics = { ...row.obligations.semantics, retainedActualIconTargetExposure: {
    disposition: 'inspected-failure', cohort: c.cohort, observations: pair, evidence,
    classification: 'application-plugin-authoring-defect',
    boundary: 'Retained direct target partial AX:reference ARIA-hidden versus exposed candidate image. Not whole-subtree associations,assistive technology or current runtime acceptance.' } };
  // Existing census binds the corresponding bounded update/disposal log. This
  // subrecord preserves that historical membership,not new async/remount proof.
  const lifecycle = receipts.find(r => r.file === base + c.updatesDisposal); assert.ok(lifecycle);
  row.obligations.historyOwnership = { ...row.obligations.historyOwnership, retainedIconUpdateDisposalMembership: {
    disposition: 'inspected-bounded-membership', cohort: c.cohort, evidence,
    sourceLog: { file: lifecycle.file, sha256: lifecycle.sha256 },
    boundary: 'Existing three-update/sampled-disposal cohort membership only;not fresh execution,current source validity,late image completion,remount or peer isolation.' } };
  assert.equal(row.inspection, 'partial'); assert.equal(row.currentRendering, 'unverified');
}
assert.equal(originals.length, 20);
const pointer = JSON.parse(readFileSync(base + 'working-audit/current.json'));
const indexBytes = readFileSync(`${base}working-audit/${pointer.generation}/index.json`); assert.equal(hash(indexBytes), pointer.indexSha256);
const coverage = JSON.parse(indexBytes).metadata.coverage;
const proposal = saveReviewProposal(base + 'working-audit', review);
const loaded = loadCaseObligationReview(proposal.file, proposal.sha256, [...coverage.caseInventory.static, ...coverage.caseInventory.interaction]);
for (const { row, semantics, history } of originals) { row.obligations.semantics = semantics; row.obligations.historyOwnership = history; }
assert.equal(hash(JSON.stringify(review)), predecessor);
console.log(JSON.stringify({ predecessor, proposal, iconCases: 20, physicalCohorts: 16, negativeControls: rejected,
  cases: loaded.cases.length, dependencies: loaded.evidenceFingerprints.length, unrelatedReviewConserved: true,
  inspectionComplete: loaded.inspectionComplete, currentRenderingAccepted: loaded.currentRenderingAccepted }));
