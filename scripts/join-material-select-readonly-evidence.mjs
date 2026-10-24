import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const hash = b => createHash('sha256').update(b).digest('hex');
export const selectReadonlyPredecessor = '809d37ad8621d89e3b10dbbddd3eafec8aa2386667e8d993a28af71b8d7be11f';
const childName = 'supplementarySelectReadonlyHost';
export function restoreSelectReadonlyEvidence(review) {
  return { ...review, groups: review.groups.map(group => {
    if (!group.obligations.authoredEditing[childName]) return group;
    const authoredEditing = { ...group.obligations.authoredEditing }; delete authoredEditing[childName];
    return { ...group, obligations: { ...group.obligations, authoredEditing } };
  }) };
}
export function joinSelectReadonlyEvidence(predecessor, read = readFileSync) {
  assert.equal(hash(JSON.stringify(predecessor)), selectReadonlyPredecessor);
  const receipt = { file: 'artifacts/material-parity/select-readonly-host-retry-20261025/latest-report.json',
    sha256: 'f0957245178c2a0769ae011ba2d7d20f7d738cb7ee89bfeabe393643d6c88102' };
  const bytes = read(receipt.file); assert.equal(hash(bytes), receipt.sha256);
  const report = JSON.parse(bytes); assert.equal(report.results.length, 1);
  const row = report.results[0];
  assert.equal(row.family, 'select'); assert.equal(row.profile, 'light'); assert.equal(row.state, 'focus');
  assert.deepEqual(row.viewport, { id: 'desktop-dpr1', width: 1440, height: 1000, deviceScaleFactor: 1 });
  for (const side of ['reference', 'astylar']) {
    const t = row[side].readonlyTrial;
    assert.equal(t.action, 'supplementary-x-after-configured-focus');
    assert.equal(t.before.focused, true);
    assert.equal(t.before.tag, side === 'reference' ? 'MAT-SELECT' : 'INPUT');
    assert.equal(t.before.disabled, side === 'reference' ? 'false' : false);
    assert.ok(t.keys.some(k => k.key === 'x' && k.trusted && k.id === t.before.id));
    assert.deepEqual(row[side].runtime.errors, []);
    const tree = row[side].inputTree; assert.equal(hash(read(tree.file)), tree.sha256);
  }
  assert.equal(row.reference.readonlyTrial.after.text, 'Team');
  assert.equal(row.reference.readonlyTrial.after.focused, true);
  assert.equal(row.astylar.readonlyTrial.before.readonly, true);
  assert.equal(row.astylar.readonlyTrial.before.value, 'Team');
  assert.ok(row.astylar.readonlyTrial.after.events.some(e => e.type === 'input' && e.value === 'xTeam'));
  assert.equal(row.astylar.readonlyTrial.after.value, 'Solo');
  assert.equal(row.astylar.readonlyTrial.after.focused, false);
  const exactCase = 'interaction:select@light/desktop-dpr1/focus';
  let cases = 0;
  const groups = predecessor.groups.map(group => {
    if (group.case !== exactCase) return group;
    assert.ok(group.obligations.authoredEditing); assert.equal(group.obligations.authoredEditing[childName], undefined); cases++;
    return { ...group, obligations: { ...group.obligations, authoredEditing: { ...group.obligations.authoredEditing,
      [childName]: { disposition: 'inspected-supplementary-readonly-failure-only', case: exactCase,
        physicalContext: { profile: row.profile, viewport: row.viewport },
        observations: { reference: row.reference.readonlyTrial, astylar: row.astylar.readonlyTrial },
        relatedFindingIds: ['core-readonly-text-keyboard-defaults-mutate-value', 'fixture-select-readonly-text-input-replaces-noneditable-host'],
        evidence: { report: receipt, manifest: report.capture.checkpointManifest,
          trees: { reference: row.reference.inputTree, astylar: row.astylar.inputTree },
          producer: { file: 'scripts/join-material-select-readonly-evidence.mjs', sha256: hash(read('scripts/join-material-select-readonly-evidence.mjs')) } },
        boundary: 'One retained configured focus context followed by supplementary x,not original editing replay,equal input structure,all86 enabled cases,disabled48,current rendering or whole-case closure. Existing parent disposition and every remaining task preserve.'
      } } } };
  });
  assert.equal(cases, 1);
  const review = { ...predecessor, groups };
  assert.equal(hash(JSON.stringify(restoreSelectReadonlyEvidence(review))), selectReadonlyPredecessor);
  return { review, sha256: hash(JSON.stringify(review)), cases, addedChildren: cases };
}
