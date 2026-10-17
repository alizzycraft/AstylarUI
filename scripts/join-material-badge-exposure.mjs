import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { saveReviewProposal, loadCaseObligationReview } from './audit-findings-store.mjs';

// Join observed initial-state AX only; configured pointer/focus boundaries remain open.
const base = 'artifacts/material-parity/working-audit';
const predecessor = '176da70647fdf3ed3ca67b4b15528a9665c4ef54c6dc1afe04dd55037a2346a8';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const receipt = file => ({ file, sha256: hash(readFileSync(file)) });
const read = item => { const bytes = readFileSync(item.file); assert.equal(hash(bytes), item.sha256); return JSON.parse(bytes); };
const pointerBytes = readFileSync(`${base}/current.json`), pointer = JSON.parse(pointerBytes);
const indexBytes = readFileSync(`${base}/${pointer.generation}/index.json`);
assert.equal(hash(indexBytes), pointer.indexSha256);
const inventory = JSON.parse(indexBytes).metadata.coverage.caseInventory;
const configured = [...inventory.static, ...inventory.interaction];
const predecessorFile = `${base}/proposals/${predecessor}.json`;
loadCaseObligationReview(predecessorFile, predecessor, configured);
const review = JSON.parse(readFileSync(predecessorFile)).review;
assert.equal(hash(JSON.stringify(review)), predecessor);
const reportReceipt = receipt('artifacts/material-parity/badge-exposure-contexts-20261017/latest-report.json');
assert.equal(reportReceipt.sha256, 'efdd30922640f809f0b6d05550bca7e11e438ab197e349c670cffa542d825ad4');
const report = read(reportReceipt);
const verification = receipt('artifacts/material-parity/badge-exposure-contexts-independent-verify-20261017.log');
assert.equal(verification.sha256, '295207f75c2731933d60ed5a794ee9d7114da29ad866a59456965eaa842d5a5d');
const verified = read(verification);
assert.equal(verified.negativeControlsRejected, 5); assert.equal(verified.reportSha256, reportReceipt.sha256);
const producer = receipt('scripts/join-material-badge-exposure.mjs');
const signature = (tree, side, id) => {
  const nodes = tree.nodes.filter(node => side === 'reference'
    ? id === 'count' ? node.attributes?.class?.split(' ').includes('mat-badge-content') : node.attributes?.id === 'badge-label'
    : node.authored?.id === `badge-${id}`);
  assert.equal(nodes.length, 1); const node = nodes[0], attributes = side === 'reference' ? node.attributes : node.authored;
  const keys = side === 'reference'
    ? ['role', 'aria-hidden', 'aria-label', 'aria-labelledby', 'aria-describedby', 'aria-live', 'tabindex']
    : ['role', 'ariaHidden', 'ariaLabel', 'ariaLabelledby', 'ariaDescribedby', 'ariaLive', 'tabIndex'];
  return { key: node.key, type: side === 'reference' ? node.type : node.authored.type,
    text: side === 'reference' ? node.ownText : node.authored.textContent,
    semanticInputs: Object.fromEntries(keys.filter(key => attributes[key] !== undefined).map(key => [key, attributes[key]])) };
};
const contexts = new Set(), changed = []; let controls = 0;
for (const row of review.groups.filter(row => row.family === 'badge')) {
  const [profile, viewport] = row.case.split('@')[1].split('/');
  const physical = viewport === 'desktop' ? 'desktop-dpr1' : viewport === 'tablet' ? 'tablet-dpr1' : viewport === 'mobile' ? 'mobile-dpr2' : viewport;
  const matches = report.results.filter(value => value.profile === profile && value.viewport.id === physical);
  assert.equal(matches.length, 1); const observation = matches[0]; contexts.add(`${profile}/${physical}`);
  const mapped = {};
  for (const side of ['reference', 'astylar']) {
    const original = read(row.evidence.pairedTrees[side]), fresh = read(observation[side].inputTree);
    mapped[side] = {};
    for (const id of ['label', 'count']) {
      const before = signature(original, side, id), after = signature(fresh, side, id);
      assert.deepEqual(before, after); assert.equal(before.text, id === 'label' ? 'Notifications' : '4');
      assert.equal(after.text, observation[side].ax[id].dom.text); mapped[side][id] = before;
    }
    if (!controls && side === 'reference') {
      const forged = structuredClone(original);
      forged.nodes.find(node => node.key === mapped.reference.count.key).attributes['aria-hidden'] = 'false';
      assert.notDeepEqual(signature(forged, side, 'count'), mapped.reference.count); controls++;
    }
  }
  const obligation = row.obligations.semantics;
  assert.equal(obligation.disposition, 'partial'); assert.equal(obligation.actualBadgeCountExposure, undefined);
  obligation.actualBadgeCountExposure = { disposition: 'inspected-initial-state-failure',
    physicalContext: { profile, ...observation.viewport }, mappedRecordedInputs: mapped,
    observations: { referenceCountIgnored: true, referenceReason: 'ariaHiddenElement', candidateCountIgnored: false, candidateCountText: '4' },
    evidence: { report: reportReceipt, verification, producer, checkpoint: report.capture.checkpointManifest,
      pairedTrees: row.evidence.pairedTrees, observedTrees: { reference: observation.reference.inputTree, astylar: observation.astylar.inputTree } },
    boundary: 'Exact physical context and recorded label/count semantic inputs agree across captures. AX observation is settled initial benchmark state,not replay of the configured focus/hover/held/activate boundary. Existing accessibility-only hiding and unequal authoring findings remain;no new cause,AT speech,paint,current source build validity or whole-case closure.' };
  changed.push(obligation);
}
assert.equal(changed.length, 52); assert.equal(contexts.size, 16); assert.equal(controls, 1);
const proposal = saveReviewProposal(base, review);
const loaded = loadCaseObligationReview(proposal.file, proposal.sha256, configured);
for (const obligation of changed) delete obligation.actualBadgeCountExposure;
assert.equal(hash(JSON.stringify(review)), predecessor);
assert.deepEqual(readFileSync(`${base}/current.json`), pointerBytes);
console.log(JSON.stringify({ predecessor, proposal, casesWithBoundedObservation: changed.length,
  physicalContexts: contexts.size, originalAndFreshTargetSignaturesCompared: changed.length * 4,
  semanticInputMutationRejected: controls, dependencies: loaded.evidenceFingerprints.length,
  wholePredecessorRecovered: true, acceptedPointerUnchanged: true,
  inspectionComplete: loaded.inspectionComplete, currentRenderingAccepted: loaded.currentRenderingAccepted }));
