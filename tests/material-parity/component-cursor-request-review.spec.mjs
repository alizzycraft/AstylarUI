import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { queryFindings } from '../../scripts/audit-findings-store.mjs';
import { collectFullTreeInventory } from './input-equivalence-audit.mjs';
import { bindPreciseAuditNormalization } from './audit-normalization-contracts.mjs';
import { modalInventoryTrees } from './modal-position-inspection.mjs';
import { applyExplicitComponentCursors, proveExplicitComponentCursor } from './component-cursor-request-review.mjs';

test('component cursor requests bind 555 observations without claiming hover behavior', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const captured = JSON.parse(bytes), cases = [...captured.results.map(c => ({ ...c, kind: 'static' })),
    ...captured.interactions.map(c => ({ ...c, kind: 'interaction' }))];
  const inventory = collectFullTreeInventory(cases), normalize = bindPreciseAuditNormalization();
  const snapshot = { generation: '5998d72bd0310ff4ddd8d3a44954fa5ade6655abb506f2bb85baa4935c3792d0',
    indexSha256: '8882ab9d062d52eeec3dcbadb1d72ee8518f3bb8bda8d8f4df7cc4466af89eef' };
  const rows = ['button', 'checkbox', 'slider', 'core', 'toolbar', 'card', 'menu', 'bottom-sheet', 'dialog', 'snack-bar', 'tooltip']
    .flatMap(f => queryFindings('artifacts/material-parity/working-audit', f, snapshot))
    .filter(r => r.evidence.section === 'discrepancies');
  const reviewed = applyExplicitComponentCursors(rows, cases, inventory, normalize);
  const changed = reviewed.filter((r, i) => r !== rows[i]);
  assert.equal(changed.length, 13); assert.equal(changed.reduce((sum, r) => sum + r.occurrences, 0), 555);
  const buttons = changed.filter(r => r.attribution === 'reviewed-button-cursor-request-substitution');
  assert.equal(buttons.length, 10); assert.equal(buttons.reduce((sum, r) => sum + r.occurrences, 0), 417);
  const metadata = new Set(['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']);
  const raw = r => Object.fromEntries(Object.entries(r).filter(([k]) => !metadata.has(k)));
  reviewed.forEach((r, i) => {
    assert.deepEqual(raw(r), raw(rows[i]));
    if (!changed.includes(r)) assert.deepEqual(r, rows[i]);
  });
  for (const row of changed) {
    assert.equal(row.classification, 'application-plugin-authoring-defect');
    assert.equal(row.reviewEvidence.inputEquivalent, false); assert.equal(row.reviewEvidence.renderingEquivalent, false);
    assert.ok(row.reviewEvidence.observations.every(p => p.actualHoverCursorVerified === false));
    const key = row.reviewedCases[0], entry = cases.find(c => `${c.kind}:${c.family}@${c.profile}/${c.viewport.id}${c.state ? '/' + c.state : ''}` === key);
    const [reference, candidate] = modalInventoryTrees(inventory, key);
    const owner = row.reviewEvidence.observations[0];
    const missing = structuredClone(reference);
    if (owner.nativeAuthorCursorOmitted) missing.nodes.find(n => n.key === owner.referenceNode).inline.cursor = { value: 'pointer', important: false };
    else missing.nodes.find(n => n.key === owner.referenceNode).rules = [];
    assert.throws(() => proveExplicitComponentCursor(entry, missing, candidate, row.element));
    const changedCandidate = structuredClone(candidate);
    changedCandidate.rules.push({ selector: '#' + row.element, cursor: 'crosshair' });
    assert.throws(() => proveExplicitComponentCursor(entry, reference, changedCandidate, row.element));
    const changedAncestor = structuredClone(candidate);
    changedAncestor.nodes.find(n => n.authored?.id === 'page').authored.style = { cursor: 'pointer' };
    assert.throws(() => proveExplicitComponentCursor(entry, reference, changedAncestor, row.element));
    const wrongStage = structuredClone(candidate);
    wrongStage.nodes.find(n => n.key === owner.astylarNode).normalResolvedStyle.cursor = 'crosshair';
    assert.throws(() => proveExplicitComponentCursor(entry, reference, wrongStage, row.element));
  }
  const lost = cases.filter(c => c !== cases.find(c => c.family === 'slider'));
  assert.throws(() => applyExplicitComponentCursors(rows, lost, inventory, normalize));
});
