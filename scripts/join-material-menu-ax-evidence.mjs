import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export const menuAXPredecessor = '169d465544c70efebc3e805b4c0f70cedbf39fae5eff08ed84241da74455ccee';
const childName = 'actualRetainedMenuPopupAX';
export function restoreMenuAXEvidence(review) {
  return { ...review, groups: review.groups.map(group => {
    if (!group.obligations.semantics[childName]) return group;
    const semantics = { ...group.obligations.semantics }; delete semantics[childName];
    return { ...group, obligations: { ...group.obligations, semantics } };
  }) };
}
export function joinMenuAXEvidence(predecessor, read = readFileSync) {
  assert.equal(hash(JSON.stringify(predecessor)), menuAXPredecessor);
  const receipt = { file: 'artifacts/material-parity/menu-popup-ax-contexts-retry-20261024/latest-report.json',
    sha256: '819932e79b0bae14534f399643ac01a05942d581a2c28239d1ce88f39e49c9a1' };
  const bytes = read(receipt.file); assert.equal(hash(bytes), receipt.sha256);
  const report = JSON.parse(bytes); assert.equal(report.results.length, 8);
  const observations = new Map();
  for (const row of report.results) {
    assert.equal(row.family, 'menu'); assert.equal(row.state, 'open');
    assert.ok(['light', 'dark', 'contrast', 'custom'].includes(row.profile));
    assert.ok(['desktop-dpr1', 'desktop-dpr2'].includes(row.viewport.id));
    const id = `interaction:menu@${row.profile}/${row.viewport.id}/open`;
    assert.ok(!observations.has(id));
    for (const side of ['reference', 'astylar']) {
      assert.deepEqual(row[side].runtime.errors, []);
      const targets = row[side].ax;
      assert.deepEqual(Object.keys(targets), ['trigger', 'popup', 'rename', 'delete']);
      assert.equal(targets.trigger.dom.controls, targets.popup.dom.id);
      const trigger = targets.trigger.nodes.find(n => n.backendDOMNodeId === targets.trigger.backendNodeId);
      assert.deepEqual(trigger.properties.find(p => p.name === 'controls').value.relatedNodes,
        [{ backendDOMNodeId: targets.popup.backendNodeId, idref: targets.popup.dom.id }]);
    }
    observations.set(id, row);
  }
  const producer = { file: 'scripts/join-material-menu-ax-evidence.mjs', sha256: hash(read('scripts/join-material-menu-ax-evidence.mjs')) };
  let cases = 0;
  const groups = predecessor.groups.map(group => {
    const row = observations.get(group.case); if (!row) return group;
    assert.equal(group.obligations.semantics[childName], undefined); cases++;
    const child = { disposition: 'inspected-retained-popup-associations-only',
      case: group.case, physicalContext: { profile: row.profile, viewport: row.viewport },
      observations: Object.fromEntries(['reference', 'astylar'].map(side => [side, row[side].ax])),
      classifiedInputDifference: { property: 'tabindex', reference: '-1', astylar: 'omitted',
        classification: 'application-plugin-authoring-defect', owner: 'showcase menu popup authoring',
        firstDivergence: 'Native panel explicitly authors tabindex=-1;candidate popup object omits tabindex before semantic projection.',
        conclusion: 'Do not infer a core loss of a supplied value. Exact AX controls references,roles and names match in the observed cohort;opening focus and popup focusability remain different.' },
      evidence: { report: receipt, manifest: report.capture.checkpointManifest,
        trees: { reference: row.reference.inputTree, astylar: row.astylar.inputTree }, producer },
      boundary: 'Maintained open action on pinned retained build only,not original-e01 replay,current runtime,AT speech,other states/mobile,paint,resource lifetime or whole-case closure. Every parent obligation,status and remaining task preserves.' };
    return { ...group, obligations: { ...group.obligations, semantics: { ...group.obligations.semantics, [childName]: child } } };
  });
  assert.equal(cases, 8);
  const review = { ...predecessor, groups };
  assert.equal(hash(JSON.stringify(restoreMenuAXEvidence(review))), menuAXPredecessor);
  return { review, sha256: hash(JSON.stringify(review)), cases, addedChildren: cases };
}
