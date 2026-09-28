import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { queryFindings } from '../../scripts/audit-findings-store.mjs';
import { collectFullTreeInventory, collectRetainedTypographyEvidence } from './input-equivalence-audit.mjs';
import { bindPreciseAuditNormalization } from './audit-normalization-contracts.mjs';
import { modalInventoryTrees } from './modal-position-inspection.mjs';
import { applyComponentColorRequests, proveComponentColorRequest } from './component-color-request-review.mjs';
import { applyInheritedComponentColors, proveInheritedComponentColor } from './component-color-request-review.mjs';
import { applyRangeDefaultColors, proveRangeDefaultColor } from './component-color-request-review.mjs';
import { applyOverlayContainerColors, proveOverlayContainerColor } from './component-color-request-review.mjs';
import { applySelectedChipHostColors, proveSelectedChipHostColor } from './component-color-request-review.mjs';
import { applyMotionBoundaryColors, proveMotionBoundaryColor } from './component-color-request-review.mjs';
import { applyComponentColorReviews, validateComponentColorReviews, isComponentColorReviewRow } from './component-color-request-review.mjs';

test('component color requests preserve 922 observations across container, inherited-leaf and default boundaries', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const captured = JSON.parse(bytes), cases = [...captured.results.map(e => ({ ...e, kind: 'static' })),
    ...captured.interactions.map(e => ({ ...e, kind: 'interaction' }))];
  const inventory = collectFullTreeInventory(cases), normalize = bindPreciseAuditNormalization();
  const retained = collectRetainedTypographyEvidence(cases.filter(e => ['sort', 'sidenav'].includes(e.family)), inventory);
  const snapshot = { generation: '5998d72bd0310ff4ddd8d3a44954fa5ade6655abb506f2bb85baa4935c3792d0',
    indexSha256: '8882ab9d062d52eeec3dcbadb1d72ee8518f3bb8bda8d8f4df7cc4466af89eef' };
  const rows = ['sort', 'sidenav', 'toolbar', 'radio', 'expansion', 'icon', 'paginator', 'slider', 'dialog', 'snack-bar', 'bottom-sheet', 'chips', 'tabs', 'progress-bar', 'progress-spinner'].flatMap(f => queryFindings('artifacts/material-parity/working-audit', f, snapshot))
    .filter(r => r.evidence.section === 'discrepancies');
  const result = applyComponentColorRequests(rows, cases, inventory, retained, normalize);
  const changed = result.filter((r, i) => r !== rows[i]);
  assert.equal(changed.length, 2); assert.equal(changed.reduce((n, r) => n + r.occurrences, 0), 77);
  const metadata = new Set(['classification', 'attribution', 'recommendedOwner', 'justification', 'reviewEvidence', 'reviewedCases']);
  const raw = r => Object.fromEntries(Object.entries(r).filter(([k]) => !metadata.has(k)));
  result.forEach((r, i) => assert.deepEqual(raw(r), raw(rows[i])));
  for (const row of changed) {
    const observation = row.reviewEvidence.observations[0];
    const entry = cases.find(e => `${e.kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}` === observation.case);
    const [reference, candidate] = modalInventoryTrees(inventory, observation.case);
    const mutated = structuredClone(candidate);
    mutated.rules.push({ selector: '#' + row.element, color: 'red' });
    assert.throws(() => proveComponentColorRequest(entry, reference, mutated, retained, normalize));
    const missing = structuredClone(retained);
    missing.differences = missing.differences.filter(p => p.case !== observation.case);
    assert.throws(() => proveComponentColorRequest(entry, reference, candidate, missing, normalize));
    const changedReference = structuredClone(reference);
    changedReference.nodes.find(n => n.key === observation.referenceNode).inline.color = { value: 'red', important: false };
    assert.throws(() => proveComponentColorRequest(entry, changedReference, candidate, retained, normalize));
    if (row.family === 'sidenav') {
      assert.ok(row.reviewEvidence.observations.every(o => o.candidateLocalColor === null && !o.childValueAppliedToContainer));
      const filled = structuredClone(entry);
      filled.styleInputs.find(i => i.id === row.element).astylar.color = '#1d1b20';
      assert.throws(() => proveComponentColorRequest(filled, reference, candidate, retained, normalize));
    }
  }
  const incomplete = structuredClone(rows); incomplete.find(r => r.attribution === 'unresolved' && r.property === 'color').occurrences++;
  assert.throws(() => applyComponentColorRequests(incomplete, cases, inventory, retained, normalize));
  const motion = applyMotionBoundaryColors(rows, cases, inventory, normalize);
  const motionChanged = motion.filter((r, i) => r !== rows[i]);
  assert.equal(motionChanged.length, 6); assert.equal(motionChanged.reduce((n, r) => n + r.occurrences, 0), 110);
  motion.forEach((r, i) => assert.deepEqual(raw(r), raw(rows[i])));
  for (const row of motionChanged) {
    const key = row.reviewedCases[0];
    const entry = cases.find(e => `${e.kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}` === key);
    const [reference, candidate] = modalInventoryTrees(inventory, key);
    const bad = structuredClone(candidate);
    bad.rules.push({ selector: '#' + row.element, color: '#1d1b20' });
    assert.throws(() => proveMotionBoundaryColor(entry, reference, bad, row.element, normalize));
    assert.ok(row.reviewEvidence.observations.every(o => o.candidateLocalColor === null && !o.motionSettlementVerified &&
      !o.candidateComputedColorVerified && o.referencePath.some(p => p.motionRules.length)));
  }
  const chips = applySelectedChipHostColors(rows, cases, inventory, normalize);
  const chipChanged = chips.filter((r, i) => r !== rows[i]);
  assert.equal(chipChanged.length, 4); assert.equal(chipChanged.reduce((n, r) => n + r.occurrences, 0), 120);
  chips.forEach((r, i) => assert.deepEqual(raw(r), raw(rows[i])));
  for (const row of chipChanged) {
    const key = row.reviewedCases[0];
    const entry = cases.find(e => `${e.kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}` === key);
    const [reference, candidate] = modalInventoryTrees(inventory, key);
    const bad = structuredClone(candidate);
    bad.nodes.find(n => n.authored?.id === row.element).authored.ariaSelected = false;
    assert.throws(() => proveSelectedChipHostColor(entry, reference, bad, row.element, normalize));
    const local = structuredClone(reference);
    local.nodes.find(n => n.attributes?.id === row.element).inline.color = { value: 'red', important: false };
    assert.throws(() => proveSelectedChipHostColor(entry, local, candidate, row.element, normalize));
    assert.ok(row.reviewEvidence.observations.every(o => !o.labelColorEquivalent && !o.motionSettlementVerified));
  }
  const overlays = applyOverlayContainerColors(rows, cases, inventory, normalize);
  const overlayChanged = overlays.filter((r, i) => r !== rows[i]);
  assert.equal(overlayChanged.length, 4); assert.equal(overlayChanged.reduce((n, r) => n + r.occurrences, 0), 123);
  overlays.forEach((r, i) => assert.deepEqual(raw(r), raw(rows[i])));
  for (const row of overlayChanged) {
    const key = row.reviewedCases[0];
    const entry = cases.find(e => `${e.kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}` === key);
    const [reference, candidate] = modalInventoryTrees(inventory, key);
    const bad = structuredClone(candidate);
    bad.rules.push({ selector: '#' + row.element, color: '#1d1b20' });
    assert.throws(() => proveOverlayContainerColor(entry, reference, bad, row.element));
    const reparented = structuredClone(reference);
    reparented.nodes.find(n => n.key === row.reviewEvidence.observations[0].nativeDetachedOverlayRoot).parent = 'missing';
    assert.throws(() => proveOverlayContainerColor(entry, reparented, candidate, row.element));
    assert.ok(row.reviewEvidence.observations.every(o => !o.candidateComputedColorVerified && !o.positionOrVisibilityCauseProven));
  }
  const range = applyRangeDefaultColors(rows, cases, inventory, normalize);
  const rangeChanged = range.filter((r, i) => r !== rows[i]);
  assert.equal(rangeChanged.length, 4); assert.equal(rangeChanged.reduce((n, r) => n + r.occurrences, 0), 156);
  range.forEach((r, i) => assert.deepEqual(raw(r), raw(rows[i])));
  for (const row of rangeChanged) {
    const key = row.reviewedCases[0];
    const entry = cases.find(e => `${e.kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}` === key);
    const [reference, candidate] = modalInventoryTrees(inventory, key);
    const bad = structuredClone(candidate);
    bad.rules.push({ selector: '#' + row.element, color: '#2c3e50' });
    assert.throws(() => proveRangeDefaultColor(entry, reference, bad, row.element));
    const mismatched = structuredClone(entry); mismatched.state = entry.state === 'disabled' ? 'hover' : 'disabled';
    assert.throws(() => proveRangeDefaultColor(mismatched, reference, candidate, row.element));
    const visible = structuredClone(candidate);
    visible.nodes.find(n => n.authored?.id === row.element).resolvedStyle.opacity = '1';
    assert.throws(() => proveRangeDefaultColor(entry, reference, visible, row.element));
    assert.ok(row.reviewEvidence.observations.every(o => o.originalInputLayersInvisible && !o.visibleThumbCauseProven && !o.renderingEquivalent));
  }
  const inherited = applyInheritedComponentColors(rows, cases, inventory, normalize);
  const inheritedChanged = inherited.filter((r, i) => r !== rows[i]);
  assert.equal(inheritedChanged.length, 16); assert.equal(inheritedChanged.reduce((n, r) => n + r.occurrences, 0), 336);
  inherited.forEach((r, i) => assert.deepEqual(raw(r), raw(rows[i])));
  for (const row of inheritedChanged) {
    assert.equal(row.astylar, undefined);
    const key = row.reviewedCases[0];
    const entry = cases.find(e => `${e.kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}` === key);
    const [reference, candidate] = modalInventoryTrees(inventory, key);
    const bad = structuredClone(candidate);
    bad.rules.push({ selector: '#' + row.element, color: 'red' });
    assert.throws(() => proveInheritedComponentColor(entry, reference, bad, row.element, normalize));
    const motion = structuredClone(reference);
    motion.nodes.find(n => n.key === row.reviewEvidence.observations[0].referenceNode).inline['transition-property'] = { value: 'color', important: false };
    assert.throws(() => proveInheritedComponentColor(entry, motion, candidate, row.element, normalize));
    assert.ok(row.reviewEvidence.observations.every(o => o.candidateLocalColor === null && !o.candidateComputedColorVerified && !o.renderingEquivalent));
  }
  const combined = applyComponentColorReviews(rows, cases, inventory, retained, normalize);
  const reviewed = combined.filter(isComponentColorReviewRow);
  assert.equal(reviewed.length, 36); assert.equal(reviewed.reduce((n, r) => n + r.occurrences, 0), 922);
  combined.forEach((r, i) => {
    assert.deepEqual(raw(r), raw(rows[i]));
    if (!isComponentColorReviewRow(r)) assert.deepEqual(r, rows[i]);
  });
  assert.deepEqual(validateComponentColorReviews(combined, rows, cases, inventory, retained, normalize), []);
  const lost = combined.filter(r => r !== reviewed[0]);
  assert.equal(validateComponentColorReviews(lost, rows, cases, inventory, retained, normalize).length, 1);
  const forged = structuredClone(combined);
  forged.find(isComponentColorReviewRow).reviewEvidence.renderingEquivalent = true;
  assert.equal(validateComponentColorReviews(forged, rows, cases, inventory, retained, normalize).length, 1);
});
