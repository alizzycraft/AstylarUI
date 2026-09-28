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
import { applyRelativeOwnerOffsetReviews, proveRelativeOwnerOffsets } from './authored-anchor-review.mjs';
import { applyStaticOwnerPositionReviews, proveStaticOwnerPosition } from './authored-anchor-review.mjs';
import { applyAuthoredCornerReviews, proveAuthoredCornerRequests } from './authored-anchor-review.mjs';
import { proveSheetCornerBoxEvidence } from './authored-anchor-review.mjs';

test('authored anchor and corner reviews retain 3356 observations and reject altered requests', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const capture = JSON.parse(bytes), families = ['slide-toggle', 'badge', 'core', 'card', 'checkbox', 'sidenav', 'toolbar', 'chips', 'icon', 'list', 'tree', 'paginator', 'tabs', 'stepper', 'expansion', 'sort', 'button-toggle'];
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
  const relative = applyRelativeOwnerOffsetReviews(combined, cases, inventory, bindPreciseAuditNormalization());
  const relativeChanges = relative.filter((r, i) => r !== combined[i]);
  assert.equal(relativeChanges.length, 22); assert.equal(relativeChanges.reduce((n, r) => n + r.occurrences, 0), 1258);
  relative.forEach((r, i) => { assert.deepEqual(raw(r), raw(rows[i])); if (r !== combined[i]) assert.equal(combined[i].attribution, 'unresolved'); });
  const stationary = applyStaticOwnerPositionReviews(relative, cases, inventory, bindPreciseAuditNormalization());
  const staticChanges = stationary.filter((r, i) => r !== relative[i]);
  assert.equal(staticChanges.length, 16); assert.equal(staticChanges.reduce((n, r) => n + r.occurrences, 0), 918);
  stationary.forEach((r, i) => { assert.deepEqual(raw(r), raw(rows[i])); if (r !== relative[i]) assert.equal(relative[i].attribution, 'unresolved'); });
  const corners = applyAuthoredCornerReviews(stationary, cases, inventory, bindPreciseAuditNormalization());
  const cornerChanges = corners.filter((r, i) => r !== stationary[i]);
  assert.equal(cornerChanges.length, 28); assert.equal(cornerChanges.reduce((n, r) => n + r.occurrences, 0), 576);
  corners.forEach((r, i) => { assert.deepEqual(raw(r), raw(rows[i])); if (r !== stationary[i]) assert.equal(stationary[i].attribution, 'unresolved'); });
  let cornerOwners = 0;
  const mutatedProfiles = new Set();
  for (const entry of cases.filter(e => ['chips', 'button-toggle'].includes(e.family))) {
    const key = `${entry.kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.kind === 'interaction' ? '/' + entry.state : ''}`;
    const [r, a] = modalInventoryTrees(inventory, key);
    for (const element of entry.family === 'chips' ? ['chip-0', 'chip-1'] : ['button-toggle-primary']) {
      const proof = proveAuthoredCornerRequests(entry, r, a, element); cornerOwners++;
      assert.equal(proof.usedCornerEquivalenceProven, false); assert.equal(proof.clippingCauseProven, false);
      const mutationKey = `${entry.family}/${entry.profile}/${element}`;
      if (mutatedProfiles.has(mutationKey)) continue;
      mutatedProfiles.add(mutationKey);
      for (const declaration of ['border-radius: 0;', 'border-top-left-radius: 1px;', 'all: initial;']) {
        const native = structuredClone(r);
        const rule = native.rules.find(rule => rule.selector === proof.referenceRequests.at(-1).selector);
        rule.cssText += ' ' + declaration;
        assert.throws(() => proveAuthoredCornerRequests(entry, native, a, element));
      }
      const native = structuredClone(r); native.nodes.find(n => n.key === proof.referenceNode).inline['border-radius'] = { value: '0', important: false };
      assert.throws(() => proveAuthoredCornerRequests(entry, native, a, element));
      const candidate = structuredClone(a); candidate.rules.push({ selector: '#' + element, borderRadius: proof.candidateRadius });
      assert.throws(() => proveAuthoredCornerRequests(entry, r, candidate, element));
      const stage = structuredClone(a); stage.nodes.find(n => n.key === proof.astylarNode).interactionResolvedStyle.borderRadius = '0';
      assert.throws(() => proveAuthoredCornerRequests(entry, r, stage, element));
    }
  }
  assert.equal(cornerOwners, 220); assert.equal(mutatedProfiles.size, 12);
  let sheetOwners = 0, equalSheetCorners = 0;
  for (const entry of cases.filter(e => e.family === 'bottom-sheet' && e.styleInputs.some(i => i.id === 'bottom-sheet-copy'))) {
    const [r, a] = modalInventoryTrees(inventory, `${entry.kind}:${entry.family}@${entry.profile}/${entry.viewport.id}/${entry.state}`);
    for (const element of ['bottom-sheet-dismiss', 'bottom-sheet-copy']) {
      const proof = proveSheetCornerBoxEvidence(entry, r, a, element); sheetOwners++;
      if (proof.sameCssCornerGeometry) equalSheetCorners++;
      assert.equal(proof.candidateUsedPaintVerified, false); assert.equal(proof.renderingEquivalent, null);
      const altered = structuredClone(entry); altered.overlayPlacement.astylarRows[element === 'bottom-sheet-dismiss' ? 0 : 1].height = 50;
      assert.throws(() => proveSheetCornerBoxEvidence(altered, r, a, element));
      const swapped = structuredClone(a);
      const first = swapped.nodes.findIndex(n => n.authored?.id === 'bottom-sheet-dismiss');
      const second = swapped.nodes.findIndex(n => n.authored?.id === 'bottom-sheet-copy');
      [swapped.nodes[first], swapped.nodes[second]] = [swapped.nodes[second], swapped.nodes[first]];
      assert.throws(() => proveSheetCornerBoxEvidence(entry, r, swapped, element));
    }
  }
  assert.equal(sheetOwners, 50); assert.equal(equalSheetCorners, 38);
  for (const row of staticChanges) {
    const entry = cases.find(e => e.family === row.family);
    const [r, a] = modalInventoryTrees(inventory, `${entry.kind}:${entry.family}@${entry.profile}/${entry.viewport.id}`);
    const proof = proveStaticOwnerPosition(entry, r, a, row.element);
    const native = structuredClone(r); native.nodes.find(n => n.key === proof.referenceNode).inline.position = { value: 'static', important: false };
    assert.throws(() => proveStaticOwnerPosition(entry, native, a, row.element));
    const altered = structuredClone(a); altered.rules.push({ selector: '#' + row.element, position: 'static' });
    assert.throws(() => proveStaticOwnerPosition(entry, r, altered, row.element));
  }
  for (const family of ['badge', 'card', 'checkbox', 'sidenav', 'toolbar']) {
    const entry = cases.find(e => e.family === family);
    const [r, a] = modalInventoryTrees(inventory, `${entry.kind}:${family}@${entry.profile}/${entry.viewport.id}`);
    const proof = proveRelativeOwnerOffsets(entry, r, a);
    const native = structuredClone(r); native.nodes.find(n => n.key === proof.referenceNode).inline.top = { value: '0', important: false };
    assert.throws(() => proveRelativeOwnerOffsets(entry, native, a));
    const altered = structuredClone(a); altered.rules.push({ selector: '#' + altered.nodes.find(n => n.key === proof.astylarNode).authored.id, top: '0' });
    assert.throws(() => proveRelativeOwnerOffsets(entry, r, altered));
  }
  const core = cases.find(e => e.family === 'core');
  const [cr, ca] = modalInventoryTrees(inventory, `${core.kind}:core@${core.profile}/${core.viewport.id}`);
  const cp = proveCoreAnchor(core, cr, ca); assert.equal(cp.containingBlockEquivalenceProven, false);
  const native = structuredClone(cr); native.nodes.find(n => n.key === cp.identity.referenceNode).inline.left = { value: '0px', important: false };
  assert.throws(() => proveCoreAnchor(core, native, ca));
  const candidate = structuredClone(ca); candidate.rules.push({ selector: '#core-primary', transform: 'translateZ(0px)' });
  assert.throws(() => proveCoreAnchor(core, cr, candidate));
  for (const family of ['slide-toggle', 'badge']) {
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
