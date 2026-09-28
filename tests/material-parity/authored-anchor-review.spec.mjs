import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { queryFindings } from '../../scripts/audit-findings-store.mjs';
import { collectFullTreeInventory } from './input-equivalence-audit.mjs';
import { modalInventoryTrees } from './modal-position-inspection.mjs';
import { bindPreciseAuditNormalization } from './audit-normalization-contracts.mjs';
import { applyAuthoredAnchorReviews, proveAuthoredAnchor } from './authored-anchor-review.mjs';
import { applyCoreAnchorReviews, proveCoreAnchor } from './authored-anchor-review.mjs';

test('authored anchor reviews retain 604 observations and reject substituted offsets or margin tokens', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const capture = JSON.parse(bytes), families = ['slide-toggle', 'badge', 'core'];
  const cases = [...capture.results.map(e => ({ ...e, kind: 'static' })), ...capture.interactions.map(e => ({ ...e, kind: 'interaction' }))];
  const inventory = collectFullTreeInventory(cases); assert.deepEqual(inventory.errors, []);
  const rows = families.flatMap(f => queryFindings('artifacts/material-parity/working-audit', f, {
    generation: 'fca6a4354e9c006e21066f0d19ea9435afacf436d226cda1c78f5ee420bea137',
    indexSha256: '5a5e8c8a31681e088f432bfd23d00327cd3757b383e8ccad50d1edc45f5f4472',
  })).filter(r => r.evidence.section === 'discrepancies');
  const reviewed = applyAuthoredAnchorReviews(rows, cases, inventory, bindPreciseAuditNormalization());
  const changed = reviewed.filter((r, i) => r !== rows[i]);
  assert.equal(changed.length, 10); assert.equal(changed.reduce((n, r) => n + r.occurrences, 0), 344);
  const metadata = new Set(['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']);
  const raw = r => Object.fromEntries(Object.entries(r).filter(([k]) => !metadata.has(k)));
  reviewed.forEach((r, i) => { assert.deepEqual(raw(r), raw(rows[i])); if (r !== rows[i]) assert.equal(rows[i].attribution, 'unresolved'); });
  const combined = applyCoreAnchorReviews(reviewed, cases, inventory, bindPreciseAuditNormalization());
  const coreChanges = combined.filter((r, i) => r !== reviewed[i]);
  assert.equal(coreChanges.length, 5); assert.equal(coreChanges.reduce((n, r) => n + r.occurrences, 0), 260);
  combined.forEach((r, i) => { assert.deepEqual(raw(r), raw(rows[i])); if (r !== reviewed[i]) assert.equal(reviewed[i].attribution, 'unresolved'); });
  const core = cases.find(e => e.family === 'core');
  const [cr, ca] = modalInventoryTrees(inventory, `${core.kind}:core@${core.profile}/${core.viewport.id}`);
  const cp = proveCoreAnchor(core, cr, ca); assert.equal(cp.containingBlockEquivalenceProven, false);
  const native = structuredClone(cr); native.nodes.find(n => n.key === cp.identity.referenceNode).inline.left = { value: '0px', important: false };
  assert.throws(() => proveCoreAnchor(core, native, ca));
  const candidate = structuredClone(ca); candidate.rules.push({ selector: '#core-primary', transform: 'translateZ(0px)' });
  assert.throws(() => proveCoreAnchor(core, cr, candidate));
  for (const family of families.filter(f => f !== 'core')) {
    const entry = cases.find(e => e.family === family), key = `${entry.kind}:${family}@${entry.profile}/${entry.viewport.id}`;
    const [r, a] = modalInventoryTrees(inventory, key), proof = proveAuthoredAnchor(entry, r, a);
    assert.equal(proof.rendererCauseProven, false); assert.equal(proof.compoundPlacementEquivalenceProven, false);
    const candidate = structuredClone(a); candidate.rules.push({ selector: '#' + (family === 'badge' ? 'badge-count' : 'slide-toggle-label'), top: '8px' });
    assert.throws(() => proveAuthoredAnchor(entry, r, candidate));
    const native = structuredClone(r); native.nodes.find(n => n.key === proof.referenceNode).inline.top = { value: '8px', important: false };
    assert.throws(() => proveAuthoredAnchor(entry, native, a));
    if (family === 'badge') {
      for (const mutation of ['margin: 0;', 'margin: var(--mat-badge-container-overlap-offset, -12px); margin: 0;']) {
        const altered = structuredClone(r);
        altered.rules.find(rule => rule.selector === '.mat-badge-medium.mat-badge-overlap .mat-badge-content').cssText = mutation;
        assert.throws(() => proveAuthoredAnchor(entry, altered, a));
      }
    }
  }
});
