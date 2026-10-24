import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const hash = b => createHash('sha256').update(b).digest('hex');
export const disabledControlPredecessor = '21ade0b49a6e2f84b4a96256667e25d0411022426a30ed7c0ede8eeb8c73f52d';
const childName = 'supplementaryDisabledControlBoundaries';
export function restoreDisabledControlEvidence(review) {
  return { ...review, groups: review.groups.map(group => {
    if (!group.obligations.authoredEditing[childName]) return group;
    const authoredEditing = { ...group.obligations.authoredEditing }; delete authoredEditing[childName];
    return { ...group, obligations: { ...group.obligations, authoredEditing } };
  }) };
}
export function joinDisabledControlEvidence(predecessor, read = readFileSync) {
  assert.equal(hash(JSON.stringify(predecessor)), disabledControlPredecessor);
  const receipt = { file: 'artifacts/material-parity/disabled-control-boundaries-20261025/latest-report.json',
    sha256: '654ef78a448876e3ac4ad84673017e49ed0ea1eff527d4c5230f3c515dc2d6bc' };
  const bytes = read(receipt.file); assert.equal(hash(bytes), receipt.sha256);
  const report = JSON.parse(bytes), observations = new Map();
  assert.deepEqual(report.results.map(r => r.family), ['form-field', 'input', 'autocomplete', 'select', 'datepicker', 'timepicker']);
  for (const row of report.results) {
    assert.equal(row.profile, 'light'); assert.equal(row.state, 'disabled');
    assert.deepEqual(row.viewport, { id: 'desktop-dpr1', width: 1440, height: 1000, deviceScaleFactor: 1 });
    for (const side of ['reference', 'astylar']) {
      const result = row[side]; assert.deepEqual(result.runtime.errors, []);
      assert.deepEqual(result.observations.map(o => o.boundary), ['before', 'after-focus-attempt', 'after-pointer-attempt', 'after-key-attempt', 'settled']);
      for (const key of ['inputTree', 'screenshot']) assert.equal(hash(read(result[key].file)), result[key].sha256);
      for (const o of result.observations) {
        assert.equal(o.target.disabledState, true);
        assert.equal(o.activeEqualsTarget, row.family === 'select' && side === 'reference' && o.boundary === 'after-focus-attempt');
        assert.equal(o.target.value, result.observations[0].target.value);
        assert.equal(o.events.some(e => e.type === 'input' || e.type === 'change'), false);
        assert.equal(o.appEvents.some(e => e.type === 'input' || e.type === 'change'), false);
      }
    }
    const key = `interaction:${row.family}@light/desktop-dpr1/disabled`;
    assert.ok(!observations.has(key)); observations.set(key, row);
  }
  let cases = 0;
  const groups = predecessor.groups.map(group => {
    const row = observations.get(group.case); if (!row) return group;
    assert.equal(group.obligations.authoredEditing[childName], undefined); cases++;
    return { ...group, obligations: { ...group.obligations, authoredEditing: { ...group.obligations.authoredEditing,
      [childName]: { disposition: 'inspected-supplementary-disabled-boundaries-only', case: group.case,
        physicalContext: { profile: row.profile, viewport: row.viewport },
        observations: Object.fromEntries(['reference', 'astylar'].map(side => [side, row[side].observations])),
        evidence: { report: receipt, manifest: report.capture.checkpointManifest,
          trees: { reference: row.reference.inputTree, astylar: row.astylar.inputTree },
          screenshots: { reference: row.reference.screenshot, astylar: row.astylar.screenshot },
          producer: { file: 'scripts/join-material-disabled-control-evidence.mjs', sha256: hash(read('scripts/join-material-disabled-control-evidence.mjs')) } },
        conclusion: row.family === 'select' ? 'ARIA-disabled native MAT-SELECT accepts DOM focus;candidate native disabled INPUT rejects it. Both retain Team;pointer clears native focus before x. Existing authored structure difference,not a confirmed core loss of disabled.' : 'Both disabled text controls reject observed DOM-focus and pointer attempts and retain values through supplementary x;no input/change events observed.',
        boundary: 'Exact retained-build light/desktop-DPR1 supplementary actions only,not original disabled action replay,other42 disabled contexts,picker-icon activation,focused ARIA-disabled key handling,dynamic disable,current rendering,equal inputs or full paint acceptance. Every parent remaining task preserves.'
      } } } };
  });
  assert.equal(cases, 6);
  const review = { ...predecessor, groups };
  assert.equal(hash(JSON.stringify(restoreDisabledControlEvidence(review))), disabledControlPredecessor);
  return { review, sha256: hash(JSON.stringify(review)), cases, addedChildren: cases };
}
