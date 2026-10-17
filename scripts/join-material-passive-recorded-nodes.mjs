import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { saveReviewProposal, loadCaseObligationReview } from './audit-findings-store.mjs';
import { sourceAuditDefinitions } from '../tests/material-parity/input-equivalence-policy.mjs';

// Account for recorded nodes only. Unequal wrappers remain unequal inputs.
const base = 'artifacts/material-parity/working-audit';
const predecessor = 'd7a99303842832c2fda76000058050d5a11ad5b6f5da74e0a6a417142b433e47';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const receipt = file => ({ file, sha256: hash(readFileSync(file)) });
const read = item => { const bytes = readFileSync(item.file); assert.equal(hash(bytes), item.sha256); return JSON.parse(bytes); };
const contracts = {
  sidenav: {
    types: ['main','p','h1','section','mat-sidenav-container','div','mat-sidenav','div','div','mat-sidenav-content'],
    ids: ['page','eyebrow','title','sidenav-root','sidenav-primary','sidenav-nav','sidenav-content'],
    text: ['Navigation','Main content'], finding: 'fixture-sidenav-positioned-flow-replaced',
    groups: [ [['2/0'],['2/0']], [['2/0/0'],[]], [['2/0/1','2/0/1/0'],['2/0/0']], [['2/0/2'],[]], [['2/0/3'],['2/0/1']] ],
    boundary: 'Sidenav container tag/flow replacement; backdrop/focus-related empty records omitted; nav text wrapper flattened into aside; content becomes main. These structures are not declared equivalent.' },
  'grid-list': {
    types: ['main','p','h1','section','mat-grid-list','div','mat-grid-tile','div','mat-grid-tile','div'],
    ids: ['page','eyebrow','title','grid-list-root','grid-list-primary','grid-tile-one','grid-tile-one-label','grid-tile-two','grid-tile-two-label'],
    text: ['One','Two'], finding: 'fixture-grid-list-missing-reference-gutter',
    groups: [ [['2/0'],['2/0']], [['2/0/0'],[]], [['2/0/0/0'],['2/0/0']], [['2/0/0/0/0'],['2/0/0/0']], [['2/0/0/1'],['2/0/1']], [['2/0/0/1/0'],['2/0/1/0']] ],
    boundary: 'Native grid-list/tile/content chain maps to div grid/tile plus span label; intermediate wrapper omitted. Existing missing-gutter finding does not certify full wrapper/style equivalence.' },
  list: {
    types: ['main','p','h1','section','mat-list','mat-list-item','span','span','span','div','mat-list-item','span','span','span','div'],
    ids: ['page','eyebrow','title','list-root','list-primary','list-inbox','list-inbox-label','list-archive','list-archive-label'],
    text: ['Inbox','Archive'], finding: 'fixture-list-content-wrappers-and-row-sizing-substituted',
    groups: [ [['2/0'],['2/0']], ...[0,1].flatMap(i => [ [[`2/0/${i}`],[`2/0/${i}`]], [[`2/0/${i}/0`,`2/0/${i}/0/0`,`2/0/${i}/1`],[]], [[`2/0/${i}/0/0/0`],[`2/0/${i}/0`]] ]) ],
    boundary: 'Material row/content/primary-text/focus wrappers become flat div rows and spans. Existing clipping/growing/row-size substitution remains,not a layout-neutral omission.' },
  table: {
    types: ['main','p','h1','section','table','thead','tr','th','tbody','tr','td','tr','td','tfoot'],
    ids: ['page','eyebrow','title','table-root','table-primary','table-head','table-header-row','table-name-header','table-body','table-atlas-row','table-atlas','table-northstar-row','table-northstar','table-rule-one','table-rule-two'],
    text: ['Name','Atlas','Northstar'], finding: 'fixture-table-borders-detached-from-cells',
    groups: [ ...['2/0','2/0/0','2/0/0/0','2/0/0/0/0','2/0/1','2/0/1/0','2/0/1/0/0','2/0/1/1','2/0/1/1/0'].map(key => [[key],[key]]), [['2/0/2'],[]], [[],['2/1']], [[],['2/2']] ],
    boundary: 'Native table head/body/cell hierarchy retained; empty tfoot omitted and two detached div rules added. Empty-footer neutrality,header associations and all border paint are not inferred.' },
};
const source = receipt('scripts/join-material-passive-recorded-nodes.mjs');
const policy = receipt('tests/material-parity/input-equivalence-policy.mjs');
function inspect(reference, candidate, family) {
  const contract = contracts[family]; assert.ok(contract);
  assert.deepEqual(reference.nodes.map(node => node.type), contract.types);
  assert.deepEqual(candidate.nodes.slice(1).map(node => node.authored.id), contract.ids);
  assert.equal(candidate.nodes[0].key, 'root'); assert.equal(candidate.nodes[0].parent, null);
  assert.deepEqual(candidate.nodes[0].authored, {});
  const text = ['Angular Material 20 reference', family, ...contract.text];
  assert.deepEqual(reference.nodes.map(node => node.ownText).filter(Boolean), text);
  assert.deepEqual(candidate.nodes.map(node => node.authored.textContent).filter(Boolean), text);
  for (const [side, tree] of [['reference', reference], ['candidate', candidate]]) {
    assert.equal(new Set(tree.nodes.map(node => node.key)).size, tree.nodes.length);
    for (const node of tree.nodes) {
      const expected = side === 'reference' && node.key === 'frame' || side === 'candidate' && node.key === 'root'
        ? null : node.key.slice(0, node.key.lastIndexOf('/'));
      assert.equal(node.parent, expected);
      if (side === 'reference') assert.ok(tree.styles[node.style]);
      else if (node.key !== 'root') for (const stage of ['normalResolvedStyle','interactionResolvedStyle','resolvedStyle']) assert.ok(node[stage]);
    }
  }
  const all = [ [[''],['']], [['0'],['0']], [['1'],['1']], [['2'],['2']], ...contract.groups ];
  const seen = { reference: new Set(), candidate: new Set(['root']) };
  const groups = all.map(([left, right]) => {
    const result = {};
    for (const [side, relative, tree, prefix] of [['reference',left,reference,'frame'], ['candidate',right,candidate,'root/0']]) {
      result[side] = relative.map(key => {
        const absolute = prefix + (key ? '/' + key : '');
        assert.ok(!seen[side].has(absolute)); seen[side].add(absolute);
        const matches = tree.nodes.filter(node => node.key === absolute); assert.equal(matches.length, 1);
        const node = matches[0]; return { key: node.key, parent: node.parent, type: side === 'reference' ? node.type : node.authored.type,
          id: side === 'reference' ? node.attributes.id ?? null : node.authored.id,
          rawText: side === 'reference' ? node.ownText : node.authored.textContent ?? '',
          ...(side === 'reference' ? { styleIndex: node.style } : {}) };
      });
    }
    return result;
  });
  for (const [side, tree] of [['reference',reference],['candidate',candidate]])
    assert.deepEqual([...seen[side]].sort(), tree.nodes.map(node => node.key).sort());
  return { groups, referenceNodes: reference.nodes.length, candidateNodes: candidate.nodes.length,
    syntheticDocumentRecord: { key: 'root', authored: {} }, existingFinding: contract.finding, structuralBoundary: contract.boundary };
}
for (const contract of Object.values(contracts)) assert.ok(sourceAuditDefinitions.some(definition => definition.id === contract.finding));
const pointerBytes = readFileSync(`${base}/current.json`), pointer = JSON.parse(pointerBytes);
const indexBytes = readFileSync(`${base}/${pointer.generation}/index.json`); assert.equal(hash(indexBytes), pointer.indexSha256);
const inventory = JSON.parse(indexBytes).metadata.coverage.caseInventory, configured = [...inventory.static,...inventory.interaction];
const file = `${base}/proposals/${predecessor}.json`; loadCaseObligationReview(file, predecessor, configured);
const review = JSON.parse(readFileSync(file)).review; assert.equal(hash(JSON.stringify(review)), predecessor);
const changed = [], counts = {}; let controls = 0, referenceNodes = 0, candidateNodes = 0;
for (const row of review.groups.filter(row => contracts[row.family])) {
  const reference = read(row.evidence.pairedTrees.reference), candidate = read(row.evidence.pairedTrees.astylar);
  const mapping = inspect(reference, candidate, row.family);
  if (!counts[row.family]) {
    for (const mutate of [p => p.reference.nodes.pop(), p => { p.candidate.nodes[2].parent = 'root'; },
      p => { p.reference.nodes[2].ownText += ' '; }, p => p.candidate.nodes.push(p.candidate.nodes[1])]) {
      const forged = structuredClone({ reference, candidate }); mutate(forged);
      assert.throws(() => inspect(forged.reference, forged.candidate, row.family)); controls++;
    }
  }
  const owner = row.obligations.inputStyleStructure; assert.equal(owner.disposition, 'partial');
  assert.equal(owner.recordedPassiveNodeAccounting, undefined);
  owner.recordedPassiveNodeAccounting = { disposition: 'inspected-recorded-node-accounting', ...mapping,
    evidence: { pairedTrees: row.evidence.pairedTrees, producer: source, policy },
    boundary: 'Every recorded element accounted for,including omitted/added records. Not anonymous formatting/pseudo boxes,complete style/AX/paint equivalence,current rendering or full inspection. Existing findings classify only their demonstrated input differences;other structural/style uncertainties remain.' };
  changed.push(owner); counts[row.family] = (counts[row.family] ?? 0) + 1;
  referenceNodes += mapping.referenceNodes; candidateNodes += mapping.candidateNodes;
}
assert.equal(changed.length, 218); assert.equal(controls, 16);
const proposal = saveReviewProposal(base, review), loaded = loadCaseObligationReview(proposal.file, proposal.sha256, configured);
for (const owner of changed) delete owner.recordedPassiveNodeAccounting;
assert.equal(hash(JSON.stringify(review)), predecessor); assert.deepEqual(readFileSync(`${base}/current.json`), pointerBytes);
console.log(JSON.stringify({ predecessor, proposal, cases: changed.length, familyCases: counts, referenceNodes, candidateNodes,
  negativeControlsRejected: controls, dependencies: loaded.evidenceFingerprints.length, wholePredecessorRecovered: true,
  acceptedPointerUnchanged: true, inspectionComplete: loaded.inspectionComplete, currentRenderingAccepted: loaded.currentRenderingAccepted }));
