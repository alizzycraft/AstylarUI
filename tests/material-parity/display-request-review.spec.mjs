import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { queryFindings } from '../../scripts/audit-findings-store.mjs';
import { collectFullTreeInventory } from './input-equivalence-audit.mjs';
import { modalInventoryTrees } from './modal-position-inspection.mjs';
import { bindPreciseAuditNormalization } from './audit-normalization-contracts.mjs';
import { displayRequestOwners, displayBoundaryOwners, proveDisplayRequest, applyDisplayRequestReviews, applyDisplayBoundaryReviews } from './display-request-review.mjs';

test('explicit display requests retain all observations and do not infer wrapper or used-display equivalence', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const capture = JSON.parse(bytes);
  const cases = [...capture.results.map(e => ({ ...e, kind: 'static' })), ...capture.interactions.map(e => ({ ...e, kind: 'interaction' }))];
  const inventory = collectFullTreeInventory(cases); assert.deepEqual(inventory.errors, []);
  const snapshot = { generation: '4880964fc1018a1fd6409f7c7af2ddaa5fc21a82e45dab3a0cc5fce5a6019156', indexSha256: '5e86f89a05cd88843d7dd6130ed13c88cdb6371efb389d73a934c8d9f953511b' };
  const rows = [...new Set([...displayRequestOwners.map(([f]) => f), 'radio', 'tabs', 'toolbar'])].flatMap(f => queryFindings('artifacts/material-parity/working-audit', f, snapshot)).filter(r => r.evidence.section === 'discrepancies');
  const reviewed = applyDisplayRequestReviews(rows, cases, inventory, bindPreciseAuditNormalization());
  const changed = reviewed.filter((r, i) => r !== rows[i]);
  assert.equal(changed.length, 15); assert.equal(changed.reduce((n, r) => n + r.occurrences, 0), 844);
  const metadata = new Set(['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']);
  const raw = r => Object.fromEntries(Object.entries(r).filter(([key]) => !metadata.has(key)));
  reviewed.forEach((r, i) => {
    assert.deepEqual(raw(r), raw(rows[i]));
    if (r !== rows[i]) {
      assert.equal(rows[i].attribution, 'unresolved'); assert.equal(r.reviewEvidence.renderingEquivalent, false);
      assert.equal(r.reviewEvidence.observations.length, r.occurrences);
      r.reviewEvidence.observations.forEach(p => { assert.equal(p.structuralEquivalenceProven, false); assert.equal(p.candidateUsedDisplayVerified, false); });
    }
  });
  assert.equal(reviewed.filter(r => r.property === 'display' && r.attribution === 'unresolved').length, 3);
  const completed = applyDisplayBoundaryReviews(reviewed, cases, inventory, bindPreciseAuditNormalization());
  const boundaries = completed.filter((r, i) => r !== reviewed[i]);
  assert.equal(boundaries.length, 3); assert.equal(boundaries.reduce((n, r) => n + r.occurrences, 0), 190);
  assert.equal(boundaries.filter(r => r.classification === 'parity-harness-defect').length, 1);
  assert.equal(boundaries.find(r => r.family === 'toolbar').occurrences, 52);
  assert.equal(completed.filter(r => r.property === 'display' && r.attribution === 'unresolved').length, 0);
  completed.forEach((r, i) => {
    assert.deepEqual(raw(r), raw(rows[i]));
    if (r !== reviewed[i]) {
      assert.equal(r.reviewEvidence.observations.length, r.occurrences);
      r.reviewEvidence.observations.forEach(p => { assert.equal(p.structuralEquivalenceProven, false); assert.equal(p.candidateUsedDisplayVerified, false); assert.equal(p.renderingEquivalent, false); });
    }
  });
  for (const [family, element] of [...displayRequestOwners, ...displayBoundaryOwners]) {
    const entry = cases.find(e => e.family === family && e.styleInputs.some(i => i.id === element && i.reference));
    const [r, a] = modalInventoryTrees(inventory, `${entry.kind}:${family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`);
    const proof = proveDisplayRequest(entry, r, a, element);
    const inline = structuredClone(r); inline.nodes.find(n => n.key === proof.referenceNode).inline.display = { value: 'grid', important: false };
    assert.throws(() => proveDisplayRequest(entry, inline, a, element));
    const serialized = structuredClone(r), owner = serialized.nodes.find(n => n.key === proof.referenceNode);
    const rule = owner.rules.find(i => serialized.rules[i].active);
    if (rule === undefined) { owner.rules.push(serialized.rules.length); serialized.rules.push({ selector: '#injected', active: true, conditions: [], declarations: {}, cssText: 'display: grid;' }); }
    else serialized.rules[rule].cssText += ' display: grid;';
    assert.throws(() => proveDisplayRequest(entry, serialized, a, element));
    const reset = structuredClone(a); reset.rules.push({ selector: '*', all: 'initial' });
    assert.throws(() => proveDisplayRequest(entry, r, reset, element));
    const stage = structuredClone(a); stage.nodes.find(n => n.key === proof.astylarNode).interactionResolvedStyle.display = 'grid';
    assert.throws(() => proveDisplayRequest(entry, r, stage, element));
    const type = structuredClone(a); type.nodes.find(n => n.key === proof.astylarNode).authored.type = 'aside';
    assert.throws(() => proveDisplayRequest(entry, r, type, element));
    if (family === 'dialog' || ['button-toggle-one', 'button-toggle-two'].includes(element)) {
      const parent = structuredClone(r), n = parent.nodes.find(n => n.key === proof.referenceNode);
      parent.styles[parent.nodes.find(p => p.key === n.parent).style].display = 'block';
      assert.throws(() => proveDisplayRequest(entry, parent, a, element));
    }
    if (displayBoundaryOwners.some(([f]) => f === family)) {
      const parent = structuredClone(a), n = parent.nodes.find(n => n.key === proof.astylarNode);
      parent.nodes.find(p => p.key === n.parent).resolvedStyle.display = 'grid';
      assert.throws(() => proveDisplayRequest(entry, r, parent, element));
      const content = structuredClone(a), owner = content.nodes.find(n => n.key === proof.astylarNode);
      if (family === 'radio') content.nodes.find(n => n.parent === owner.key).resolvedStyle.position = 'relative';
      else owner.authored.textContent = 'invented content';
      assert.throws(() => proveDisplayRequest(entry, r, content, element));
    }
  }
});
