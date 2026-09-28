import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { queryFindings } from '../../scripts/audit-findings-store.mjs';
import { collectFullTreeInventory } from './input-equivalence-audit.mjs';
import { modalInventoryTrees } from './modal-position-inspection.mjs';
import { bindPreciseAuditNormalization } from './audit-normalization-contracts.mjs';
import { applyCustomOwnerBorderReviews, proveCustomOwnerBorder } from './custom-owner-border-review.mjs';

test('custom host initial colors retain all observations without claiming generated paint equivalence', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const capture = JSON.parse(bytes), families = ['icon', 'slider', 'tabs'];
  const cases = [...capture.results.map(e => ({ ...e, kind: 'static' })), ...capture.interactions.map(e => ({ ...e, kind: 'interaction' }))].filter(e => families.includes(e.family));
  const inventory = collectFullTreeInventory(cases), normalize = bindPreciseAuditNormalization();
  assert.deepEqual(inventory.errors, []);
  const rows = families.flatMap(f => queryFindings('artifacts/material-parity/working-audit', f, {
    generation: '8635694f2f111b71b50ed25ce0de8947ecb16baa3aada405163b6a8be5339f49',
    indexSha256: 'd0446d1c61bec60527c34459da6a28e4af1699793c50b38fef93846627cd6aca',
  })).filter(r => r.evidence.section === 'discrepancies');
  const reviewed = applyCustomOwnerBorderReviews(rows, cases, inventory, normalize), changed = reviewed.filter((r, i) => r !== rows[i]);
  assert.equal(changed.length, 24); assert.equal(changed.reduce((n, r) => n + r.occurrences, 0), 672);
  const metadata = new Set(['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']);
  const raw = r => Object.fromEntries(Object.entries(r).filter(([k]) => !metadata.has(k)));
  reviewed.forEach((r, i) => { assert.deepEqual(raw(r), raw(rows[i])); if (!changed.includes(r)) assert.deepEqual(r, rows[i]); });
  for (const family of families) {
    const row = changed.find(r => r.family === family), key = row.reviewedCases[0];
    const e = cases.find(e => `${e.kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}` === key);
    const [r, a] = modalInventoryTrees(inventory, key), proof = proveCustomOwnerBorder(e, r, a, normalize);
    assert.equal(proof.generatedChildPaintVerified, false);
    const native = structuredClone(r); native.nodes.find(n => n.key === proof.referenceNode).inline.border = { value: '0 solid currentcolor', important: false };
    assert.throws(() => proveCustomOwnerBorder(e, native, a, normalize));
    const candidate = structuredClone(a); candidate.rules.push({ selector: '#' + row.element, borderColor: 'currentcolor' });
    assert.throws(() => proveCustomOwnerBorder(e, r, candidate, normalize));
    const wrongType = structuredClone(a); wrongType.nodes.find(n => n.key === proof.astylarNode).authored.type = 'button';
    assert.throws(() => proveCustomOwnerBorder(e, r, wrongType, normalize));
  }
});
