import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { applyPreparedInputReviews, validatePreparedInputReviews } from './authored-anchor-review.mjs';
import { applyPreparedInputFollowups, validatePreparedInputFollowups } from './authored-anchor-review.mjs';
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
import { proveActionCornerBoxInputs, applyCardContrastCornerReview } from './authored-anchor-review.mjs';

test('prepared 106-group followup conserves raw records and all prior classifications', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const capture = JSON.parse(bytes);
  const cases = [...capture.results.map(e => ({ ...e, kind: 'static' })), ...capture.interactions.map(e => ({ ...e, kind: 'interaction' }))];
  const inventory = collectFullTreeInventory(cases); assert.deepEqual(inventory.errors, []);
  const accepted = [...new Set(cases.map(e => e.family))].flatMap(f => queryFindings('artifacts/material-parity/working-audit', f, {
    generation: '4880964fc1018a1fd6409f7c7af2ddaa5fc21a82e45dab3a0cc5fce5a6019156',
    indexSha256: '5e86f89a05cd88843d7dd6130ed13c88cdb6371efb389d73a934c8d9f953511b',
  })).filter(r => r.evidence.section === 'discrepancies');
  const prepared = applyPreparedInputFollowups(accepted, cases, inventory, bindPreciseAuditNormalization());
  const batch = prepared.filter((r, i) => r !== accepted[i]);
  assert.equal(accepted.length, 8483); assert.equal(prepared.length, accepted.length);
  assert.equal(batch.length, 106); assert.equal(batch.reduce((n, r) => n + r.occurrences, 0), 4635);
  const populations = [
    ['reviewed-display-request-substitution', 15, 844], ['reviewed-display-owner-substitution', 2, 138],
    ['reviewed-display-computed-local-boundary', 1, 52], ['reviewed-inherited-word-computed-local-boundary', 46, 1764],
    ['reviewed-font-initial-computed-local-boundary', 24, 955], ['reviewed-overlay-weight-token-request-omission', 4, 107],
    ['reviewed-range-weight-inherit-observation-boundary', 2, 156], ['reviewed-page-family-computed-local-boundary', 5, 326],
    ['reviewed-toggle-family-token-request-omission', 2, 136], ['reviewed-overlay-family-ancestry-substitution', 5, 157],
  ];
  for (const [attribution, groups, observations] of populations) {
    const matches = batch.filter(r => r.attribution === attribution);
    assert.equal(matches.length, groups, attribution);
    assert.equal(matches.reduce((n, r) => n + r.occurrences, 0), observations, attribution);
  }
  const metadata = new Set(['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']);
  const raw = r => Object.fromEntries(Object.entries(r).filter(([k]) => !metadata.has(k)));
  prepared.forEach((r, i) => {
    assert.deepEqual(raw(r), raw(accepted[i]));
    if (accepted[i].attribution !== 'unresolved') assert.deepEqual(r, accepted[i]);
    if (r !== accepted[i]) {
      assert.equal(accepted[i].attribution, 'unresolved');
      assert.equal(r.reviewEvidence.inputEquivalent, false); assert.equal(r.reviewEvidence.renderingEquivalent, false);
      assert.equal(r.reviewEvidence.observations.length, r.occurrences);
    }
  });
  assert.equal(batch.filter(r => r.classification === 'application-plugin-authoring-defect').length, 28);
  assert.equal(batch.filter(r => r.classification === 'parity-harness-defect').length, 78);
  assert.equal(prepared.filter(r => r.attribution === 'unresolved').length, 180);
  assert.ok(prepared.some(r => r.family === 'tooltip' && r.property === 'wordBreak' && r.attribution === 'unresolved'));
  assert.deepEqual(validatePreparedInputFollowups(prepared, accepted, cases, inventory, bindPreciseAuditNormalization()), []);
  const tampered = [...prepared], index = prepared.findIndex((r, i) => r !== accepted[i]);
  tampered[index] = { ...tampered[index], justification: 'unsupported replacement' };
  assert.equal(validatePreparedInputFollowups(tampered, accepted, cases, inventory, bindPreciseAuditNormalization()).length, 1);
});

test('prepared 153-group batch conserves all scalar records and retains focused anchor/corner proofs', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const capture = JSON.parse(bytes), families = ['slide-toggle', 'badge', 'core', 'card', 'checkbox', 'sidenav', 'toolbar', 'chips', 'icon', 'list', 'tree', 'paginator', 'tabs', 'stepper', 'expansion', 'sort', 'button-toggle'];
  const cases = [...capture.results.map(e => ({ ...e, kind: 'static' })), ...capture.interactions.map(e => ({ ...e, kind: 'interaction' }))];
  const inventory = collectFullTreeInventory(cases); assert.deepEqual(inventory.errors, []);
  const accepted = [...new Set(cases.map(e => e.family))].flatMap(f => queryFindings('artifacts/material-parity/working-audit', f, {
    generation: 'a593d4c7e804b6cf5ba863163122fde6cb31774c88c5fe6f97f6504cee2fa948',
    indexSha256: 'c5224eea34da7aa30570bcad482ac04e55c39ba0a8988a0d7ec0b88629f350c1',
  })).filter(r => r.evidence.section === 'discrepancies');
  const prepared = applyPreparedInputReviews(accepted, cases, inventory, bindPreciseAuditNormalization());
  const batch = prepared.filter((r, i) => r !== accepted[i]);
  assert.equal(accepted.length, 8483); assert.equal(batch.length, 153);
  assert.equal(batch.reduce((n, r) => n + r.occurrences, 0), 6909);
  const batchMetadata = new Set(['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']);
  const batchRaw = r => Object.fromEntries(Object.entries(r).filter(([k]) => !batchMetadata.has(k)));
  prepared.forEach((r, i) => {
    assert.deepEqual(batchRaw(r), batchRaw(accepted[i]));
    if (r !== accepted[i]) {
      assert.equal(accepted[i].attribution, 'unresolved');
      assert.equal(r.reviewEvidence.inputEquivalent, false); assert.equal(r.reviewEvidence.renderingEquivalent, false);
    }
  });
  assert.deepEqual(validatePreparedInputReviews(prepared, accepted, cases, inventory, bindPreciseAuditNormalization()), []);
  const tampered = [...prepared], index = prepared.findIndex((r, i) => r !== accepted[i]);
  tampered[index] = { ...tampered[index], justification: 'unsupported replacement' };
  assert.equal(validatePreparedInputReviews(tampered, accepted, cases, inventory, bindPreciseAuditNormalization()).length, 1);
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
  let actionOwners = 0, unequalActionCorners = 0;
  for (const entry of cases.filter(e => ['card', 'toolbar', 'dialog'].includes(e.family))) {
    const elements = (entry.styleInputs ?? []).map(input => input.id).filter(id => ['card-open', 'toolbar-action', 'dialog-cancel', 'dialog-save'].includes(id));
    if (!elements.length) continue;
    const [r, a] = modalInventoryTrees(inventory, `${entry.kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`);
    for (const element of elements) {
      const proof = proveActionCornerBoxInputs(entry, r, a, element); actionOwners++;
      if (!proof.sameShapeOnEqualWideBoxes) unequalActionCorners++;
      assert.equal(proof.renderingEquivalent, null); assert.equal(proof.candidateUsedLayoutMeasured, false);
      const altered = structuredClone(a); altered.nodes.find(n => n.key === proof.astylarNode).normalResolvedStyle.height = '100px';
      assert.throws(() => proveActionCornerBoxInputs(entry, r, altered, element));
      const native = structuredClone(r);
      const owner = native.nodes.find(node => node.key === proof.referenceNode);
      const ruleIndex = owner.rules.find(index => native.rules[index].active && native.rules[index].selector === proof.referenceRequests[0].selector);
      assert.notEqual(ruleIndex, undefined);
      native.rules[ruleIndex].cssText += ' border-radius: 0;';
      assert.throws(() => proveActionCornerBoxInputs(entry, native, a, element));
    }
  }
  assert.equal(actionOwners, 168); assert.equal(unequalActionCorners, 13);
  const cardCorners = applyCardContrastCornerReview(corners, cases, inventory, bindPreciseAuditNormalization());
  const cardCornerChanges = cardCorners.filter((r, i) => r !== corners[i]);
  assert.equal(cardCornerChanges.length, 4); assert.equal(cardCornerChanges.reduce((n, r) => n + r.occurrences, 0), 52);
  cardCorners.forEach((r, i) => { assert.deepEqual(raw(r), raw(rows[i])); if (r !== corners[i]) assert.equal(corners[i].attribution, 'unresolved'); });
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
