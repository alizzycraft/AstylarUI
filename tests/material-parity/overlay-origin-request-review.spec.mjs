import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { queryFindings } from '../../scripts/audit-findings-store.mjs';
import { collectFullTreeInventory } from './input-equivalence-audit.mjs';
import { modalInventoryTrees } from './modal-position-inspection.mjs';
import { bindPreciseAuditNormalization } from './audit-normalization-contracts.mjs';
import { applyOverlayOriginReviews, proveOverlayOriginBoundary } from './overlay-origin-request-review.mjs';

test('overlay origin review separates measured owners from ancestor requests in all 210 observations', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const c = JSON.parse(bytes), families = ['tooltip', 'dialog'];
  const cases = [...c.results.map(e => ({ ...e, kind: 'static' })), ...c.interactions.map(e => ({ ...e, kind: 'interaction' }))]
    .filter(e => families.includes(e.family));
  const inventory = collectFullTreeInventory(cases); assert.deepEqual(inventory.errors, []);
  const rows = families.flatMap(family => queryFindings('artifacts/material-parity/working-audit', family, {
    generation: '8635694f2f111b71b50ed25ce0de8947ecb16baa3aada405163b6a8be5339f49',
    indexSha256: 'd0446d1c61bec60527c34459da6a28e4af1699793c50b38fef93846627cd6aca',
  })).filter(r => r.evidence.section === 'discrepancies');
  const reviewed = applyOverlayOriginReviews(rows, cases, inventory, bindPreciseAuditNormalization());
  const changed = reviewed.filter((r, i) => r !== rows[i]);
  assert.equal(changed.length, 7); assert.equal(changed.reduce((n, r) => n + r.occurrences, 0), 210);
  const metadata = new Set(['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']);
  const raw = r => Object.fromEntries(Object.entries(r).filter(([key]) => !metadata.has(key)));
  reviewed.forEach((r, i) => { assert.deepEqual(raw(r), raw(rows[i])); if (!changed.includes(r)) assert.deepEqual(r, rows[i]); });
  for (const row of changed) {
    const key = row.reviewedCases[0];
    const entry = cases.find(c => `${c.kind}:${c.family}@${c.profile}/${c.viewport.id}${c.state ? '/' + c.state : ''}` === key);
    const [r, a] = modalInventoryTrees(inventory, key), proof = proveOverlayOriginBoundary(entry, r, a, row.element);
    assert.equal(proof.popupMisplacementCauseProven, false); assert.equal(proof.referenceBoxEqualityVerified, false);
    const candidate = structuredClone(a); candidate.nodes.find(n => n.key === proof.identity.candidatePath[1]).authored.style = { transformOrigin: 'center top' };
    assert.throws(() => proveOverlayOriginBoundary(entry, r, candidate, row.element));
    const native = structuredClone(r); native.nodes.find(n => n.key === proof.referenceNode).inline['transform-origin'] = { value: 'center top', important: false };
    assert.throws(() => proveOverlayOriginBoundary(entry, native, a, row.element));
  }
});
