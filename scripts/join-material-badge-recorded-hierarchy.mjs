import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { saveReviewProposal, loadCaseObligationReview } from './audit-findings-store.mjs';

// Close only the demonstrated missing recorded-node correspondence. This is not
// a new capture, anonymous-box model, style equivalence or whole-case closure.
const base = 'artifacts/material-parity/working-audit';
const predecessor = '1b3421b4c689b43d2ce3fb95bacba209c7051be6f6fee19e170655e1b7a525f9';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const envelope = JSON.parse(readFileSync(`${base}/proposals/${predecessor}.json`));
const review = envelope.review;
assert.equal(envelope.sha256, predecessor);
assert.equal(hash(JSON.stringify(review)), predecessor);

function inspect(reference, candidate) {
  assert.equal(reference.nodes.length, 7); assert.equal(candidate.nodes.length, 8);
  const nativeKeys = ['frame', 'frame/0', 'frame/1', 'frame/2', 'frame/2/0', 'frame/2/0/0', 'frame/2/0/1'];
  const candidateKeys = nativeKeys.map(key => key.replace('frame', 'root/0'));
  assert.deepEqual(reference.nodes.map(n => n.key), nativeKeys);
  assert.deepEqual(candidate.nodes.map(n => n.key), ['root', ...candidateKeys]);
  const synthetic = candidate.nodes[0];
  assert.equal(synthetic.parent, null); assert.deepEqual(synthetic.authored, {});
  const ids = ['page', 'eyebrow', 'title', 'badge-root', 'badge-primary', 'badge-label', 'badge-count'];
  const types = ['main', 'p', 'h1', 'section', 'span', 'span', 'span'];
  const texts = ['', 'Angular Material 20 reference', 'badge', '', '', 'Notifications', '4'];
  return nativeKeys.map((key, index) => {
    const left = reference.nodes[index], right = candidate.nodes[index + 1];
    assert.equal(left.type, types[index]); assert.equal(right.authored.type, types[index]);
    assert.equal(right.authored.id, ids[index]);
    assert.equal(left.parent, index === 0 ? null : key.slice(0, key.lastIndexOf('/')));
    assert.equal(right.parent, index === 0 ? 'root' : left.parent.replace('frame', 'root/0'));
    assert.equal(left.ownText, texts[index]);
    assert.equal(right.authored.textContent ?? '', texts[index]);
    assert.ok(reference.styles[left.style]);
    for (const stage of ['normalResolvedStyle', 'interactionResolvedStyle', 'resolvedStyle']) assert.ok(right[stage]);
    if (index >= 3 && index <= 5) assert.equal(left.attributes.id, ids[index]);
    if (index === 6) assert.equal(left.attributes.id, 'mat-badge-content-0');
    return { referenceNode: key, candidateNode: right.key, type: types[index],
      referenceId: left.attributes.id ?? null, candidateId: right.authored.id,
      text: texts[index], referenceStyleIndex: left.style,
      candidateStyles: ['normalResolvedStyle', 'interactionResolvedStyle', 'resolvedStyle'] };
  });
}

const original = [], source = { file: 'scripts/join-material-badge-recorded-hierarchy.mjs' };
source.sha256 = hash(readFileSync(source.file));
let negativeControls = 0;
for (const row of review.groups.filter(g => g.family === 'badge')) {
  const trees = {};
  for (const side of ['reference', 'astylar']) {
    const receipt = row.evidence.pairedTrees[side], bytes = readFileSync(receipt.file);
    assert.equal(hash(bytes), receipt.sha256); trees[side] = JSON.parse(bytes);
  }
  const pairs = inspect(trees.reference, trees.astylar);
  if (!negativeControls) {
    for (const mutate of [p => p.reference.nodes.pop(), p => p.astylar.nodes.push(p.astylar.nodes[1]),
      p => { p.astylar.nodes[7].parent = 'root/0'; },
      p => { p.reference.nodes[6].ownText = '5'; },
      p => { p.reference.nodes[6].ownText = '4 '; },
      p => { p.reference.nodes[5].ownText = ' Notifications'; },
      p => { p.astylar.nodes[0].authored.type = 'div'; }]) {
      const forged = structuredClone(trees); mutate(forged);
      assert.throws(() => inspect(forged.reference, forged.astylar)); negativeControls++;
    }
  }
  const obligation = row.obligations.inputStyleStructure;
  assert.equal(obligation.disposition, 'partial');
  assert.equal(obligation.recordedBadgeNodeCorrespondence, undefined);
  original.push(obligation);
  obligation.recordedBadgeNodeCorrespondence = {
    disposition: 'inspected-recorded-node-inventory', pairs,
    syntheticDocumentRecord: { key: 'root', authored: {}, child: 'root/0' },
    evidence: { pairedTrees: row.evidence.pairedTrees, producer: source },
    boundary: 'All recorded element nodes and parent/order/content correspondence only. Native generated badge-count ID maps to authored badge-count,not equal semantics or generated-style inputs. Empty synthetic document record is not another authored wrapper. Anonymous formatting/pseudo boxes,style equality,current layout/paint/AX and synthetic-root behavior remain unproved.' };
  assert.equal(row.inspection, 'partial'); assert.equal(row.currentRendering, 'unverified');
}
assert.equal(original.length, 52);
assert.equal(negativeControls, 7);
const pointerBytes = readFileSync(`${base}/current.json`), pointer = JSON.parse(pointerBytes);
const indexBytes = readFileSync(`${base}/${pointer.generation}/index.json`);
assert.equal(hash(indexBytes), pointer.indexSha256);
const coverage = JSON.parse(indexBytes).metadata.coverage;
const proposal = saveReviewProposal(base, review);
const loaded = loadCaseObligationReview(proposal.file, proposal.sha256,
  [...coverage.caseInventory.static, ...coverage.caseInventory.interaction]);
for (const obligation of original) delete obligation.recordedBadgeNodeCorrespondence;
assert.equal(hash(JSON.stringify(review)), predecessor, 'Unrelated review content changed');
assert.deepEqual(readFileSync(`${base}/current.json`), pointerBytes);
console.log(JSON.stringify({ predecessor, proposal, badgeCases: 52, mappedPairs: 364,
  referenceRecords: 364, candidateRecords: 416, negativeControls,
  cases: loaded.cases.length, dependencies: loaded.evidenceFingerprints.length,
  completePredecessorRecovered: true, acceptedPointerUnchanged: true,
  inspectionComplete: loaded.inspectionComplete, currentRenderingAccepted: loaded.currentRenderingAccepted }));
