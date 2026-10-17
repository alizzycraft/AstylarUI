import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { saveReviewProposal, loadCaseObligationReview } from './audit-findings-store.mjs';

// Specific missing frame-sibling/font-input mapping,not output or AX parity.
// Reuse the completed Icon chains rather than repeating that investigation.
const base = 'artifacts/material-parity/working-audit';
const predecessor = '58ec5402d137657aa2d223d78db4fc56d1baec38a80d33d745bf07b233d656a1';
const hash = value => createHash('sha256').update(value).digest('hex');
const receipt = file => ({ file, sha256: hash(readFileSync(file)) });
const pointerBytes = readFileSync(`${base}/current.json`), pointer = JSON.parse(pointerBytes);
const indexBytes = readFileSync(`${base}/${pointer.generation}/index.json`);
assert.equal(hash(indexBytes), pointer.indexSha256);
const coverage = JSON.parse(indexBytes).metadata.coverage;
const configured = [...coverage.caseInventory.static, ...coverage.caseInventory.interaction];
const predecessorFile = `${base}/proposals/${predecessor}.json`;
loadCaseObligationReview(predecessorFile, predecessor, configured);
const review = JSON.parse(readFileSync(predecessorFile)).review;
assert.equal(hash(JSON.stringify(review)), predecessor);
const producer = receipt('scripts/join-material-shared-heading-inputs.mjs');
const properties = ['fontFamily', 'fontSize', 'fontWeight', 'fontStyle'];
const stages = ['normalResolvedStyle', 'interactionResolvedStyle', 'resolvedStyle'];
const unique = nodes => { assert.equal(nodes.length, 1); return nodes[0]; };
function inspect(reference, candidate, family) {
  const frame = unique(reference.nodes.filter(n => n.key === 'frame'));
  const page = unique(candidate.nodes.filter(n => n.authored?.id === 'page'));
  assert.equal(frame.type, 'main'); assert.equal(page.authored.type, 'main');
  const synthetic = unique(candidate.nodes.filter(n => n.key === page.parent));
  assert.equal(synthetic.parent, null); assert.deepEqual(synthetic.authored, {});
  const headings = [];
  for (const [id, type, text, transform] of [
    ['eyebrow', 'p', 'Angular Material 20 reference', 'uppercase'],
    ['title', 'h1', family, 'capitalize'],
  ]) {
    const native = unique(reference.nodes.filter(n => n.parent === frame.key && n.type === type));
    const core = unique(candidate.nodes.filter(n => n.authored?.id === id));
    assert.equal(core.parent, page.key); assert.equal(core.authored.type, type);
    assert.equal(native.ownText, text); assert.equal(core.authored.textContent, text);
    assert.equal(reference.nodes.filter(n => n.parent === native.key).length, 0);
    assert.equal(candidate.nodes.filter(n => n.parent === core.key).length, 0);
    const nativeStyle = reference.styles[native.style]; assert.ok(nativeStyle);
    assert.equal(nativeStyle.textTransform, transform);
    assert.equal(core.retainedText?.source, 'core-text-registry');
    for (const stage of stages) {
      assert.ok(core[stage] && page[stage]);
      assert.equal(core[stage].fontFamily, undefined);
      assert.equal(core[stage].textTransform, transform);
      assert.equal(core.retainedText.style.fontFamily, page[stage].fontFamily);
    }
    for (const property of properties) assert.equal(core.retainedText.style[property], nativeStyle[property]);
    headings.push({ id, type, referenceNode: native.key, candidateNode: core.key, rawText: text,
      requestedTextTransform: transform, referenceStyleIndex: native.style,
      referenceComputedFont: Object.fromEntries(properties.map(key => [key, nativeStyle[key]])),
      candidateRetainedFont: Object.fromEntries(properties.map(key => [key, core.retainedText.style[key]])),
      inheritedFamilyOwner: page.key, candidateOwnFamily: 'omitted at all three recorded stages',
      rawStyleReceipts: { reference: hash(JSON.stringify(nativeStyle)),
        candidate: Object.fromEntries(stages.map(stage => [stage, hash(JSON.stringify(core[stage]))])) } });
  }
  return { frame: { referenceNode: frame.key, candidateNode: page.key, recordedType: 'main' }, headings,
    syntheticDocumentRecord: { key: synthetic.key, authored: {} } };
}
let inspected = 0, reused = 0, negativeControls = 0;
const owners = [], families = new Set();
for (const row of review.groups) {
  const owner = row.obligations.inputStyleStructure;
  assert.equal(owner.disposition, 'partial'); assert.equal(owner.sharedHeadingInputMapping, undefined);
  families.add(row.family); owners.push(owner);
  if (row.family === 'icon') {
    const prior = owner.retainedIconRecordedHierarchy;
    assert.ok(prior); assert.equal(prior.typographyInputConsumption.headings.length, 2);
    assert.deepEqual(prior.typographyInputConsumption.headings.map(n => n.id), ['eyebrow', 'title']);
    owner.sharedHeadingInputMapping = { disposition: 'reused-prior-inspected-font-input-mapping',
      existingField: 'retainedIconRecordedHierarchy.typographyInputConsumption.headings', evidence: { producer },
      boundary: 'Existing exact Icon node/font chains only; no repeated measurement,paint or AX inference.' };
    reused++; continue;
  }
  const trees = {};
  for (const side of ['reference', 'astylar']) {
    const item = row.evidence.pairedTrees[side], bytes = readFileSync(item.file);
    assert.equal(hash(bytes), item.sha256); trees[side] = JSON.parse(bytes);
  }
  const mapping = inspect(trees.reference, trees.astylar, row.family);
  if (!negativeControls) {
    for (const mutate of [p => { p.reference.nodes.find(n => n.type === 'h1').ownText += ' '; },
      p => { p.astylar.nodes.find(n => n.authored?.id === 'title').parent = 'root'; },
      p => { p.astylar.nodes.find(n => n.authored?.id === 'title').normalResolvedStyle.fontFamily = 'serif'; },
      p => { p.astylar.nodes.find(n => n.authored?.id === 'title').retainedText.style.fontSize = '1px'; },
      p => { p.astylar.nodes.find(n => n.authored?.id === 'title').normalResolvedStyle.textTransform = 'none'; }]) {
      const forged = structuredClone(trees); mutate(forged);
      assert.throws(() => inspect(forged.reference, forged.astylar, row.family)); negativeControls++;
    }
  }
  owner.sharedHeadingInputMapping = { disposition: 'inspected-recorded-frame-sibling-font-inputs', ...mapping,
    evidence: { pairedTrees: row.evidence.pairedTrees, producer },
    boundary: 'Recorded p/h1 parent/type/raw text and four font-input properties only. Inheritance and case-transform requests match;this is not physical font selection,used line boxes,clipping,paint,AX names or current rendering. Matching main records do not waive the separately authored outer-host extra-main issue. Component/anonymous/pseudo descendants and all existing remaining work stay open.' };
  inspected++;
}
assert.equal(inspected, 2291); assert.equal(reused, 20); assert.equal(families.size, 36); assert.equal(negativeControls, 5);
const proposal = saveReviewProposal(base, review);
const loaded = loadCaseObligationReview(proposal.file, proposal.sha256, configured);
for (const owner of owners) delete owner.sharedHeadingInputMapping;
assert.equal(hash(JSON.stringify(review)), predecessor, 'Unrelated case data changed');
assert.deepEqual(readFileSync(`${base}/current.json`), pointerBytes);
console.log(JSON.stringify({ predecessor, proposal, families: families.size,
  newlyInspectedCases: inspected, reusedIconCases: reused, newHeadingPairs: inspected * 2,
  totalHeadingPairsAccountedFor: (inspected + reused) * 2, negativeControls,
  cases: loaded.cases.length, dependencies: loaded.evidenceFingerprints.length,
  entirePredecessorRecovered: true, existingRemainingWorkPreserved: true, acceptedPointerUnchanged: true,
  inspectionComplete: loaded.inspectionComplete, currentRenderingAccepted: loaded.currentRenderingAccepted }));
