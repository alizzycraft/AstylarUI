import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { menuPopupSemanticInputFindings } from '../tests/material-parity/menu-popup-semantic-input-findings.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export const menuSemanticBoundaryPredecessor = 'd7ce8d6e2d5b9a3025e1f7a80a62ca383d08636e1b1d44d4d5c0959f6fa267aa';
const childName = 'retainedMenuSemanticActionBoundaries';
export function restoreMenuSemanticBoundaries(review) {
  return { ...review, groups: review.groups.map(group => {
    if (!group.obligations.semantics[childName]) return group;
    const semantics = { ...group.obligations.semantics }; delete semantics[childName];
    return { ...group, obligations: { ...group.obligations, semantics } };
  }) };
}
export function joinMenuSemanticBoundaries(predecessor, read = readFileSync) {
  assert.equal(hash(JSON.stringify(predecessor)), menuSemanticBoundaryPredecessor);
  const receipts = [
    { file: 'artifacts/material-parity/menu-dismissal-ax-retry-20261024/latest-report.json', sha256: '6cca3cbb686397037da63b543ad3544039fa26356e60fb5d62ac5643d3997b86' },
    { file: 'artifacts/material-parity/menu-mobile-ax-retry-20261024/latest-report.json', sha256: '04ab953a6db5773212b85c9bc09c20d01708d065c38704a36ce1f58038620ba0' },
  ];
  const reports = receipts.map(r => { const b = read(r.file); assert.equal(hash(b), r.sha256); return JSON.parse(b); });
  assert.equal(reports[0].results.length, 8); assert.equal(reports[1].results.length, 4);
  const definitionFile = 'tests/material-parity/menu-popup-semantic-input-findings.mjs';
  const producerFile = 'scripts/join-material-menu-semantic-boundaries.mjs';
  const commonEvidence = { definitions: { file: definitionFile, sha256: hash(read(definitionFile)) },
    producer: { file: producerFile, sha256: hash(read(producerFile)) } };
  const observations = new Map();
  for (const row of reports[0].results) {
    assert.equal(row.family, 'menu'); assert.equal(row.state, 'open');
    assert.ok(['desktop-dpr1', 'desktop-dpr2'].includes(row.viewport.id));
    const id = `interaction:menu@${row.profile}/${row.viewport.id}/open`; assert.ok(!observations.has(id));
    observations.set(id, { kind: 'supplementary-Escape-after-maintained-open',
      observations: Object.fromEntries(['reference', 'astylar'].map(side => {
        assert.equal(row[side].dismissalAX.action, 'supplementary-Escape-after-maintained-open');
        assert.equal(row[side].dismissalAX.popupCount, 0);
        return [side, row[side].dismissalAX];
      })), evidence: { report: receipts[0], manifest: reports[0].capture.checkpointManifest } });
  }
  for (const profile of ['light', 'dark']) {
    const pair = {}, boundaryEvidence = {};
    for (const side of ['reference', 'astylar']) {
      const rows = reports[1].results.filter(row => row.profile === profile && row.mode === side);
      assert.equal(rows.length, 1); const row = rows[0];
      assert.equal(row.viewport.id, 'mobile-dpr2'); assert.equal(row.viewport.width, 390);
      assert.equal(row.viewport.height, 844); assert.equal(row.viewport.deviceScaleFactor, 2);
      assert.deepEqual(row.boundaries.map(b => b.state), ['initial-closed', 'open-1', 'closed-1', 'open-2', 'closed-2', 'open-3', 'closed-3']);
      pair[side] = row.boundaries.map(b => ({ state: b.state, open: b.observation.open, actualAX: b.observation.actualAX }));
      boundaryEvidence[side] = row.boundaries.map(b => ({ tree: b.inputTree, screenshot: b.screenshot }));
    }
    const id = `interaction:menu@${profile}/mobile-dpr2/open-dismiss`; assert.ok(!observations.has(id));
    observations.set(id, { kind: 'retained-three-cycle-mobile-boundaries', observations: pair,
      evidence: { report: receipts[1], manifest: reports[1].capture.checkpointManifest, boundaries: boundaryEvidence } });
  }
  let cases = 0, mobile = 0;
  const groups = predecessor.groups.map(group => {
    const entry = observations.get(group.case); if (!entry) return group;
    assert.equal(group.obligations.semantics[childName], undefined); cases++;
    if (entry.kind === 'retained-three-cycle-mobile-boundaries') mobile++;
    const child = { disposition: 'inspected-retained-AX-boundaries-only', case: group.case, ...entry,
      classifiedFindings: menuPopupSemanticInputFindings.map(f => ({ id: f.id, classification: f.classification,
        owner: f.owner, firstDivergence: f.observation.stage, conclusion: f.justification })),
      sourceEvidence: commonEvidence,
      boundary: 'Recorded retained-build associations/removal and authored differences only. Desktop Escape is supplementary,not configured dismissal replay. Mobile uses original three-cycle producer,not original-e01 identity. Other semantics/actions,AT speech,current input/runtime/paint,lifetime and every parent remaining task stay open.' };
    return { ...group, obligations: { ...group.obligations, semantics: { ...group.obligations.semantics, [childName]: child } } };
  });
  assert.equal(cases, 10); assert.equal(mobile, 2);
  const review = { ...predecessor, groups };
  assert.equal(hash(JSON.stringify(restoreMenuSemanticBoundaries(review))), menuSemanticBoundaryPredecessor);
  return { review, sha256: hash(JSON.stringify(review)), cases, mobile, addedChildren: 10 };
}
