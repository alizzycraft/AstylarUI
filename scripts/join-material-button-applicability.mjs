import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { saveReviewProposal, loadCaseObligationReview } from './audit-findings-store.mjs';

// Close only the demonstrated authored-applicability gap. Existing required-state
// scope already includes button activation/focus; this does not inspect actions.
const script = 'scripts/join-material-button-applicability.mjs';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const receipt = file => ({ file, sha256: hash(readFileSync(file)) });
const predecessor = '87b7452d81b98c0c7923103042132c1fcf70e96a3bb2803c298deed7a017719e';
const review = JSON.parse(readFileSync(`artifacts/material-parity/working-audit/proposals/${predecessor}.json`)).review;
assert.equal(hash(JSON.stringify(review)), predecessor);
const targets = { core: ['core-primary'], toolbar: ['toolbar-action'], card: ['card-open'],
  button: ['button-primary', 'button-secondary', 'button-disabled'] };
const readTree = (item, bytes = readFileSync(item.file)) => {
  assert.equal(hash(bytes), item.sha256, item.file);
  const tree = JSON.parse(bytes); assert.deepEqual(tree.errors, []); return tree;
};
function inspectPair(reference, astylar, expected) {
  const native = reference.nodes.filter(node => node.type === 'button');
  assert.deepEqual(native.map(node => node.attributes.id).sort(), expected.slice().sort());
  return expected.map(id => {
    const left = native.filter(node => node.attributes.id === id);
    const right = astylar.nodes.filter(node => node.authored?.id === id);
    assert.equal(left.length, 1); assert.equal(right.length, 1);
    assert.equal(right[0].authored.type, 'button');
    return { id, reference: { key: left[0].key, type: left[0].type,
      disabledAttribute: Object.hasOwn(left[0].attributes, 'disabled'),
      ariaDisabled: left[0].attributes['aria-disabled'] ?? null },
    astylar: { key: right[0].key, type: right[0].authored.type,
      disabled: right[0].authored.disabled ?? null, ariaDisabled: right[0].authored.ariaDisabled ?? null } };
  });
}
const selected = review.groups.filter(row => Object.hasOwn(targets, row.family));
assert.equal(selected.length, 216);
const previous = [], observations = [];
let changedFields = 0, negativeControls = 0;
for (const row of selected) {
  const pair = row.evidence.pairedTrees;
  const reference = readTree(pair.reference), astylar = readTree(pair.astylar);
  const owners = inspectPair(reference, astylar, targets[row.family]);
  if (!observations.length) {
    const changed = structuredClone(reference); changed.nodes.find(node => node.type === 'button').type = 'div';
    assert.throws(() => inspectPair(changed, astylar, targets[row.family])); negativeControls++;
    const missing = structuredClone(astylar); missing.nodes = missing.nodes.filter(node => node.authored?.id !== owners[0].id);
    assert.throws(() => inspectPair(reference, missing, targets[row.family])); negativeControls++;
    const extra = structuredClone(reference); extra.nodes.push({ type: 'button', attributes: { id: 'unreviewed-button' } });
    assert.throws(() => inspectPair(extra, astylar, targets[row.family])); negativeControls++;
    assert.throws(() => readTree(pair.reference, Buffer.concat([readFileSync(pair.reference.file), Buffer.from(' ')])));
    negativeControls++;
  }
  observations.push({ case: row.case, owners });
  for (const key of ['authoredActivation', 'programmaticFocus']) {
    const obligation = row.obligations[key];
    if (obligation.applicability !== 'unverified') {
      assert.equal(obligation.applicability, 'applicable'); continue;
    }
    previous.push({ row, key, obligation });
    row.obligations[key] = { ...obligation, applicability: 'applicable', recordedButtonApplicability: {
      disposition: 'inspected-applicability-only', owners,
      conclusion: 'Captured native button controls establish an activation/focus inspection obligation,including disabled negative expectations;they do not establish successful activation or focus.',
      evidence: { report: { file: row.evidence.report, sha256: row.evidence.reportSha256 },
        pairedTrees: pair, join: receipt(script) },
      boundary: 'Historical authenticated authored trees only. Not actual events,keyboard equivalence,focus delivery,disabled suppression,paint,current runtime or full-case closure.' } };
    assert.equal(row.obligations[key].disposition, obligation.disposition);
    changedFields++;
  }
  assert.equal(row.inspection, 'partial'); assert.equal(row.currentRendering, 'unverified');
}
assert.equal(changedFields, 384); assert.equal(new Set(previous.map(item => item.row.case)).size, 192);
assert.equal(observations.reduce((count, row) => count + row.owners.length, 0), 336);
const pointer = JSON.parse(readFileSync('artifacts/material-parity/working-audit/current.json'));
const indexBytes = readFileSync(`artifacts/material-parity/working-audit/${pointer.generation}/index.json`);
assert.equal(hash(indexBytes), pointer.indexSha256);
const coverage = JSON.parse(indexBytes).metadata.coverage;
const proposal = saveReviewProposal('artifacts/material-parity/working-audit', review);
const loaded = loadCaseObligationReview(proposal.file, proposal.sha256,
  [...coverage.caseInventory.static, ...coverage.caseInventory.interaction]);
assert.equal(loaded.cases.length, 2311); assert.equal(loaded.inspectionComplete, false);
assert.equal(loaded.currentRenderingAccepted, false);
for (const { row, key, obligation } of previous) row.obligations[key] = obligation;
assert.equal(hash(JSON.stringify(review)), predecessor, 'Unrelated case evidence changed');
console.log(JSON.stringify({ phase: 'recorded-button-authored-applicability', predecessor, proposal,
  inspectedCases: selected.length, authoredButtons: 336, authenticatedTrees: 432,
  changedCases: 192, changedApplicabilityFields: changedFields, negativeControls,
  cases: loaded.cases.length, dependencies: loaded.evidenceFingerprints.length,
  unrelatedReviewConserved: true, currentRenderingAccepted: false, inspectionComplete: false,
  observations, boundary: 'Applicability only;all action/focus outcomes and original remaining obligations are preserved. Not selected by the live export.' }));
