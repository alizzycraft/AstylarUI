import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { queryFindings } from '../../scripts/audit-findings-store.mjs';
import { collectFullTreeInventory } from './input-equivalence-audit.mjs';
import { modalInventoryTrees } from './modal-position-inspection.mjs';
import { bindPreciseAuditNormalization } from './audit-normalization-contracts.mjs';
import { applyCustomOwnerBorderReviews, proveCustomOwnerBorder, applyDividerPositionReviews, proveDividerPositionRequests, applyProgressPositionReviews, proveProgressPositionRequests, applyBadgeProgressOriginReviews, proveBadgeProgressOrigin, applyChipTabOriginReviews, proveChipTabOrigin } from './custom-owner-border-review.mjs';
import { applyTogglePositionReviews, proveTogglePositionRequests } from './custom-owner-border-review.mjs';
import { applyOverlayOriginReviews } from './overlay-origin-request-review.mjs';
import { applyOwnerBoundaryReviews, validateOwnerBoundaryReviews } from './custom-owner-border-review.mjs';
import { proveRemainingBorderRequests, applyRemainingBorderReviews, validateRemainingBorderReviews } from './custom-owner-border-review.mjs';
import { proveFinalOwnerStyles, applyFinalOwnerStyleReviews, validateFinalOwnerStyleReviews } from './custom-owner-border-review.mjs';

test('final owner style boundaries conserve all 94 observations', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const capture = JSON.parse(bytes), families = ['tabs', 'icon', 'progress-bar', 'progress-spinner'];
  const cases = [...capture.results.map(e => ({ ...e, kind: 'static' })), ...capture.interactions.map(e => ({ ...e, kind: 'interaction' }))].filter(e => families.includes(e.family));
  const inventory = collectFullTreeInventory(cases), normalize = bindPreciseAuditNormalization();
  assert.deepEqual(inventory.errors, []);
  const rows = families.flatMap(f => queryFindings('artifacts/material-parity/working-audit', f, {
    generation: '9b827bb2b09ae9d20d35e1640f987c9a4972aeab04676d595d7dd5f7d6ee01ab',
    indexSha256: 'cd3d3c45aab1db7095753132870a660f456dc80e5334787f6f4508e8d30d9486',
  })).filter(r => r.evidence.section === 'discrepancies').map(({ id, evidence, ...row }) => row);
  const applied = applyFinalOwnerStyleReviews(rows, cases, inventory, normalize), changed = applied.filter((r, i) => r !== rows[i]);
  assert.equal(changed.length, 5); assert.equal(changed.reduce((n, r) => n + r.occurrences, 0), 94);
  assert.equal(changed.filter(r => r.classification === 'parity-harness-defect').length, 2);
  const metadata = new Set(['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']);
  const raw = r => Object.fromEntries(Object.entries(r).filter(([k]) => !metadata.has(k)));
  assert.deepEqual(applied.map(raw), rows.map(raw));
  applied.forEach((r, i) => { if (!changed.includes(r)) assert.deepEqual(r, rows[i]); });
  assert.deepEqual(validateFinalOwnerStyleReviews(applied, rows, cases, inventory, normalize), []);
  assert.deepEqual(validateFinalOwnerStyleReviews(JSON.parse(JSON.stringify(applied)), rows, cases, inventory, normalize), []);
  const forged = structuredClone(applied); forged.find(r => r.attribution === 'reviewed-final-owner-style-boundary').reviewedCases.pop();
  assert.equal(validateFinalOwnerStyleReviews(forged, rows, cases, inventory, normalize).length, 1);
  assert.equal(validateFinalOwnerStyleReviews(JSON.parse(JSON.stringify(forged)), rows, cases, inventory, normalize).length, 1);
  const key = e => `${e.kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`;
  assert.throws(() => applyFinalOwnerStyleReviews(rows, cases.filter(e => key(e) !== changed[0].reviewedCases[0]), inventory, normalize));
  for (const row of changed) {
    const entry = cases.find(e => row.reviewedCases.includes(key(e))), pair = modalInventoryTrees(inventory, key(entry));
    const proof = proveFinalOwnerStyles(entry, ...pair, normalize, row.element);
    assert.equal(proof.renderingEquivalent, null);
    for (const mutate of [
      ([r]) => { r.ruleEvidenceComplete = false; },
      ([, a]) => { a.nodes.find(n => n.key === proof.astylarNode).normalResolvedStyle[row.property] = '999px'; },
      ([, a]) => { a.rules.push({ selector: '#' + row.element, [row.property]: '999px' }); },
    ]) { const altered = structuredClone(pair); mutate(altered); assert.throws(() => proveFinalOwnerStyles(entry, ...altered, normalize, row.element)); }
  }
});

test('remaining toggle and divider borders conserve 252 observations', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const capture = JSON.parse(bytes);
  const cases = [...capture.results.map(e => ({ ...e, kind: 'static' })), ...capture.interactions.map(e => ({ ...e, kind: 'interaction' }))].filter(e => ['button-toggle', 'divider'].includes(e.family));
  const inventory = collectFullTreeInventory(cases), normalize = bindPreciseAuditNormalization();
  assert.deepEqual(inventory.errors, []);
  const rows = ['button-toggle', 'divider'].flatMap(f => queryFindings('artifacts/material-parity/working-audit', f, {
    generation: '9b827bb2b09ae9d20d35e1640f987c9a4972aeab04676d595d7dd5f7d6ee01ab',
    indexSha256: 'cd3d3c45aab1db7095753132870a660f456dc80e5334787f6f4508e8d30d9486',
  })).filter(r => r.evidence.section === 'discrepancies').map(({ id, evidence, ...row }) => row);
  const applied = applyRemainingBorderReviews(rows, cases, inventory, normalize), changed = applied.filter((r, i) => r !== rows[i]);
  assert.equal(changed.length, 5); assert.equal(changed.reduce((n, r) => n + r.occurrences, 0), 252);
  const metadata = new Set(['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']);
  const raw = r => Object.fromEntries(Object.entries(r).filter(([k]) => !metadata.has(k)));
  assert.deepEqual(applied.map(raw), rows.map(raw));
  applied.forEach((r, i) => { if (!changed.includes(r)) assert.deepEqual(r, rows[i]); });
  assert.deepEqual(validateRemainingBorderReviews(applied, rows, cases, inventory, normalize), []);
  const forged = structuredClone(applied); forged.find(r => r.attribution === 'reviewed-remaining-border-request-substitution').reviewedCases.pop();
  assert.equal(validateRemainingBorderReviews(forged, rows, cases, inventory, normalize).length, 1);
  const key = e => `${e.kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`;
  assert.throws(() => applyRemainingBorderReviews(rows, cases.filter(e => key(e) !== changed[0].reviewedCases[0]), inventory, normalize));
  for (const family of ['button-toggle', 'divider']) {
    const entry = cases.find(e => e.family === family), pair = modalInventoryTrees(inventory, key(entry));
    const proof = proveRemainingBorderRequests(entry, ...pair, normalize);
    assert.equal(proof.renderingEquivalent, null);
    for (const mutate of [
      ([r]) => { r.ruleEvidenceComplete = false; },
      ([r]) => { r.styles[r.nodes.find(n => n.key === proof.referenceNode).style].borderTopWidth = '4px'; },
      ([, a]) => { a.nodes.find(n => n.key === proof.astylarNode).interactionResolvedStyle.borderWidth = '1px'; },
      ([, a]) => { a.rules.push({ selector: '#' + (family === 'divider' ? 'divider-primary' : 'button-toggle-two'), borderStyle: 'dashed' }); },
    ]) { const altered = structuredClone(pair); mutate(altered); assert.throws(() => proveRemainingBorderRequests(entry, ...altered, normalize)); }
  }
});

test('prepared border/position/origin batch conserves the accepted caret checkpoint in full capture order', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const capture = JSON.parse(bytes);
  const cases = [...capture.results.map(e => ({ ...e, kind: 'static' })), ...capture.interactions.map(e => ({ ...e, kind: 'interaction' }))];
  assert.equal(cases.length, 2311);
  const inventory = collectFullTreeInventory(cases), normalize = bindPreciseAuditNormalization();
  assert.deepEqual(inventory.errors, []);
  const families = [...new Set(cases.map(e => e.family))];
  const rows = families.flatMap(f => queryFindings('artifacts/material-parity/working-audit', f, {
    generation: 'fca6a4354e9c006e21066f0d19ea9435afacf436d226cda1c78f5ee420bea137',
    indexSha256: '5a5e8c8a31681e088f432bfd23d00327cd3757b383e8ccad50d1edc45f5f4472',
  })).filter(r => r.evidence.section === 'discrepancies');
  assert.equal(rows.length, 8483);
  assert.equal(rows.filter(r => r.attribution === 'unresolved').length, 573);
  const steps = [
    [applyCustomOwnerBorderReviews, 79, 1904], [applyDividerPositionReviews, 5, 72],
    [applyProgressPositionReviews, 11, 220], [applyBadgeProgressOriginReviews, 5, 92],
    [applyChipTabOriginReviews, 11, 362], [applyTogglePositionReviews, 16, 1088],
    [applyOverlayOriginReviews, 7, 210],
  ];
  const metadata = new Set(['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']);
  const raw = r => Object.fromEntries(Object.entries(r).filter(([k]) => !metadata.has(k)));
  let reviewed = rows;
  for (const [apply, groups, observations] of steps) {
    const next = apply(reviewed, cases, inventory, normalize);
    const changed = next.filter((r, i) => r !== reviewed[i]);
    assert.equal(changed.length, groups, apply.name);
    assert.equal(changed.reduce((n, r) => n + r.occurrences, 0), observations, apply.name);
    next.forEach((r, i) => {
      assert.deepEqual(raw(r), raw(reviewed[i]));
      if (r !== reviewed[i]) assert.equal(reviewed[i].attribution, 'unresolved', 'must not reopen an accepted classification');
    });
    reviewed = next;
  }
  const changed = reviewed.filter((r, i) => r !== rows[i]);
  assert.equal(changed.length, 134);
  assert.equal(changed.reduce((n, r) => n + r.occurrences, 0), 3948);
  assert.equal(reviewed.filter(r => r.attribution === 'unresolved').length, 439);
  // Replay serialized output from original evidence, not from submitted proof objects.
  const replay = applyOwnerBoundaryReviews(rows, cases, inventory, normalize);
  assert.deepEqual(JSON.parse(JSON.stringify(reviewed)), JSON.parse(JSON.stringify(replay)));
  assert.deepEqual(validateOwnerBoundaryReviews(JSON.parse(JSON.stringify(reviewed)), rows, cases, inventory, normalize), []);
  const forged = JSON.parse(JSON.stringify(reviewed));
  const index = reviewed.findIndex((r, i) => r !== rows[i]);
  forged[index].classification = 'equivalent';
  assert.equal(validateOwnerBoundaryReviews(forged, rows, cases, inventory, normalize).length, 1);
});

test('custom host initial colors retain all observations without claiming generated paint equivalence', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const capture = JSON.parse(bytes), families = ['icon', 'slider', 'tabs', 'table', 'divider', 'progress-bar', 'progress-spinner', 'badge', 'chips', 'button-toggle'];
  const cases = [...capture.results.map(e => ({ ...e, kind: 'static' })), ...capture.interactions.map(e => ({ ...e, kind: 'interaction' }))].filter(e => families.includes(e.family));
  const inventory = collectFullTreeInventory(cases), normalize = bindPreciseAuditNormalization();
  assert.deepEqual(inventory.errors, []);
  const rows = families.flatMap(f => queryFindings('artifacts/material-parity/working-audit', f, {
    generation: '8635694f2f111b71b50ed25ce0de8947ecb16baa3aada405163b6a8be5339f49',
    indexSha256: 'd0446d1c61bec60527c34459da6a28e4af1699793c50b38fef93846627cd6aca',
  })).filter(r => r.evidence.section === 'discrepancies');
  const reviewed = applyCustomOwnerBorderReviews(rows, cases, inventory, normalize), changed = reviewed.filter((r, i) => r !== rows[i]);
  assert.equal(changed.length, 79); assert.equal(changed.reduce((n, r) => n + r.occurrences, 0), 1904);
  const dividerTop = changed.filter(r => r.family === 'divider' && r.property === 'borderTopColor');
  assert.equal(dividerTop.length, 1); assert.equal(dividerTop[0].occurrences, 24);
  assert.equal(dividerTop[0].classification, 'application-plugin-authoring-defect');
  const tableRows = changed.filter(r => r.family === 'table');
  assert.equal(tableRows.length, 8); assert.equal(tableRows.reduce((n, r) => n + r.occurrences, 0), 208);
  assert.ok(tableRows.every(r => r.classification === 'application-plugin-authoring-defect'));
  const metadata = new Set(['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']);
  const raw = r => Object.fromEntries(Object.entries(r).filter(([k]) => !metadata.has(k)));
  const toggles = applyTogglePositionReviews(rows, cases, inventory, normalize), toggleChanges = toggles.filter((r, i) => r !== rows[i]);
  assert.equal(toggleChanges.length, 16); assert.equal(toggleChanges.reduce((n, r) => n + r.occurrences, 0), 1088);
  assert.equal(toggleChanges.filter(r => r.classification === 'application-plugin-authoring-defect').length, 4);
  toggles.forEach((r, i) => { assert.deepEqual(raw(r), raw(rows[i])); if (!toggleChanges.includes(r)) assert.deepEqual(r, rows[i]); });
  for (const element of ['button-toggle-primary', 'button-toggle-one', 'button-toggle-two']) {
    const e = cases.find(e => e.family === 'button-toggle'), key = `${e.kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`;
    const [r, a] = modalInventoryTrees(inventory, key), proof = proveTogglePositionRequests(e, r, a, element);
    assert.equal(proof.containingBlockEquivalenceProven, false);
    const altered = structuredClone(a); altered.rules.push({ selector: '#' + element, position: 'relative' });
    assert.throws(() => proveTogglePositionRequests(e, r, altered, element));
    const native = structuredClone(r); native.nodes.find(n => n.key === proof.referenceNode).inline.left = { value: '0px', important: false };
    assert.throws(() => proveTogglePositionRequests(e, native, a, element));
  }
  reviewed.forEach((r, i) => { assert.deepEqual(raw(r), raw(rows[i])); if (!changed.includes(r)) assert.deepEqual(r, rows[i]); });
  const positioned = applyDividerPositionReviews(reviewed, cases, inventory, normalize);
  const positionChanges = positioned.filter((r, i) => r !== reviewed[i]);
  assert.equal(positionChanges.length, 5); assert.equal(positionChanges.reduce((n, r) => n + r.occurrences, 0), 72);
  positioned.forEach((r, i) => { assert.deepEqual(raw(r), raw(reviewed[i])); if (!positionChanges.includes(r)) assert.deepEqual(r, reviewed[i]); });
  const progress = applyProgressPositionReviews(positioned, cases, inventory, normalize);
  const progressChanges = progress.filter((r, i) => r !== positioned[i]);
  assert.equal(progressChanges.length, 11); assert.equal(progressChanges.reduce((n, r) => n + r.occurrences, 0), 220);
  assert.equal(progressChanges.filter(r => r.classification === 'application-plugin-authoring-defect').length, 3);
  progress.forEach((r, i) => { assert.deepEqual(raw(r), raw(positioned[i])); if (!progressChanges.includes(r)) assert.deepEqual(r, positioned[i]); });
  const origins = applyBadgeProgressOriginReviews(progress, cases, inventory, normalize);
  const originChanges = origins.filter((r, i) => r !== progress[i]);
  assert.equal(originChanges.length, 5); assert.equal(originChanges.reduce((n, r) => n + r.occurrences, 0), 92);
  origins.forEach((r, i) => { assert.deepEqual(raw(r), raw(progress[i])); if (!originChanges.includes(r)) assert.deepEqual(r, progress[i]); });
  const motionOrigins = applyChipTabOriginReviews(origins, cases, inventory, normalize);
  const motionChanges = motionOrigins.filter((r, i) => r !== origins[i]);
  assert.equal(motionChanges.length, 11); assert.equal(motionChanges.reduce((n, r) => n + r.occurrences, 0), 362);
  motionOrigins.forEach((r, i) => { assert.deepEqual(raw(r), raw(origins[i])); if (!motionChanges.includes(r)) assert.deepEqual(r, origins[i]); });
  for (const element of ['chip-0', 'chip-1', 'tab-overview', 'tab-activity', 'tab-panel']) {
    const row = motionChanges.find(r => r.element === element), key = row.reviewedCases[0];
    const e = cases.find(e => `${e.kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}` === key);
    const [r, a] = modalInventoryTrees(inventory, key), proof = proveChipTabOrigin(e, r, a, element);
    assert.equal(proof.motionSettlementVerified, false); assert.equal(proof.inputEquivalent, false);
    const native = structuredClone(r); native.nodes.find(n => n.key === proof.nativePath[1].node).inline['transform-box'] = { value: 'content-box', important: false };
    assert.throws(() => proveChipTabOrigin(e, native, a, element));
    const altered = structuredClone(a); altered.rules.push({ selector: '#page', transformOrigin: '50% 50%' });
    assert.throws(() => proveChipTabOrigin(e, r, altered, element));
  }
  for (const family of ['badge', 'progress-bar', 'progress-spinner']) {
    const e = cases.find(e => e.family === family), key = `${e.kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`;
    const [r, a] = modalInventoryTrees(inventory, key), proof = proveBadgeProgressOrigin(e, r, a, normalize);
    assert.equal(proof.referenceBoxEqualityVerified, false);
    const native = structuredClone(r), parentKey = proof.nativePath[1].node;
    native.nodes.find(n => n.key === parentKey).inline['transform-origin'] = { value: 'center top', important: false };
    assert.throws(() => proveBadgeProgressOrigin(e, native, a, normalize));
    const altered = structuredClone(a); altered.rules.push({ selector: '#page', transformOrigin: '50% 50%' });
    assert.throws(() => proveBadgeProgressOrigin(e, r, altered, normalize));
  }
  for (const family of ['progress-bar', 'progress-spinner']) {
    const e = cases.find(e => e.family === family), key = `${e.kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`;
    const [r, a] = modalInventoryTrees(inventory, key), proof = proveProgressPositionRequests(e, r, a, normalize);
    assert.equal(proof.containingBlockEquivalenceProven, false);
    const altered = structuredClone(a); altered.rules.push({ selector: '#' + family + '-primary', position: 'relative' });
    assert.throws(() => proveProgressPositionRequests(e, r, altered, normalize));
    const native = structuredClone(r); native.nodes.find(n => n.key === proof.referenceNode).inline.top = { value: '0', important: false };
    assert.throws(() => proveProgressPositionRequests(e, native, a, normalize));
  }
  for (const profile of ['light', 'dark', 'contrast', 'custom']) {
    const e = cases.find(e => e.family === 'divider' && e.profile === profile);
    const key = `${e.kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`;
    const [r, a] = modalInventoryTrees(inventory, key), proof = proveDividerPositionRequests(e, r, a, normalize);
    assert.equal(proof.coreCoordinateDefectProven, false);
    const native = structuredClone(r); native.nodes.find(n => n.key === proof.referenceNode).inline.top = { value: 'auto', important: false };
    assert.throws(() => proveDividerPositionRequests(e, native, a, normalize));
    const altered = structuredClone(a); altered.rules.find(rule => rule.selector === '.divider').top = '0';
    assert.throws(() => proveDividerPositionRequests(e, r, altered, normalize));
  }
  for (const family of families.filter(f => !['chips', 'button-toggle'].includes(f))) {
    const row = changed.find(r => r.family === family && (family !== 'tabs' || r.element === 'tab-panel')), key = row.reviewedCases[0];
    const e = cases.find(e => `${e.kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}` === key);
    const [r, a] = modalInventoryTrees(inventory, key), proof = proveCustomOwnerBorder(e, r, a, normalize);
    assert.equal(proof.generatedChildPaintVerified, false);
    const native = structuredClone(r); native.nodes.find(n => n.key === proof.referenceNode).inline.border = { value: '0 solid currentcolor', important: false };
    assert.throws(() => proveCustomOwnerBorder(e, native, a, normalize));
    const candidate = structuredClone(a); candidate.rules.push({ selector: '#' + row.element, borderColor: 'currentcolor' });
    assert.throws(() => proveCustomOwnerBorder(e, r, candidate, normalize));
    const wrongType = structuredClone(a); wrongType.nodes.find(n => n.key === proof.astylarNode).authored.type = 'button';
    assert.throws(() => proveCustomOwnerBorder(e, r, wrongType, normalize));
    if (family === 'badge') {
      assert.equal(proof.alias.status, 'mapped');
      const changedRadius = structuredClone(a);
      changedRadius.rules.find(rule => rule.selector === '.badge-bubble').borderRadius = '9999px';
      assert.throws(() => proveCustomOwnerBorder(e, r, changedRadius, normalize));
    }
    if (family.startsWith('progress-')) {
      assert.equal(proof.motionSettlementVerified, false);
      const changedMotion = structuredClone(r);
      const node = changedMotion.nodes.find(n => n.key === proof.referenceNode);
      const rule = node.rules.map(i => changedMotion.rules[i]).find(rule => rule.declarations['transition-property']);
      rule.declarations['transition-property'].value = 'all';
      assert.throws(() => proveCustomOwnerBorder(e, changedMotion, a, normalize));
      const changedSerialized = structuredClone(r);
      changedSerialized.rules[node.rules.find(i => changedSerialized.rules[i].declarations['transition-property'])].cssText += ' transition: border-color 250ms;';
      assert.throws(() => proveCustomOwnerBorder(e, changedSerialized, a, normalize));
    }
    if (family === 'divider') {
      const changedPaint = structuredClone(a);
      changedPaint.rules.find(rule => rule.selector === '.divider').background = '#7b757f';
      assert.throws(() => proveCustomOwnerBorder(e, r, changedPaint, normalize));
    }
    if (family === 'table') {
      const changedReset = structuredClone(r);
      const owner = changedReset.nodes.find(n => n.key === proof.referenceNode);
      const reset = owner.rules.map(i => changedReset.rules[i]).find(rule => rule.selector === '.mat-mdc-table');
      reset.declarations['border-top-color'].value = 'transparent';
      assert.throws(() => proveCustomOwnerBorder(e, changedReset, a, normalize));
      const missingWidth = structuredClone(a);
      delete missingWidth.rules.find(rule => rule.selector === '.material-table').borderWidth;
      assert.throws(() => proveCustomOwnerBorder(e, r, missingWidth, normalize));
    }
  }
  for (const element of ['tab-overview', 'tab-activity']) {
    const row = changed.find(r => r.element === element), key = row.reviewedCases[0];
    assert.equal(row.classification, 'parity-harness-defect');
    const e = cases.find(e => `${e.kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}` === key);
    const [r, a] = modalInventoryTrees(inventory, key);
    const proof = proveCustomOwnerBorder(e, r, a, normalize, element);
    assert.ok(proof.composition); assert.equal(proof.renderingEquivalent, false);
    const mutated = structuredClone(a);
    mutated.rules.push({ selector: '#' + element, borderColor: 'currentcolor' });
    assert.throws(() => proveCustomOwnerBorder(e, r, mutated, normalize, element));
    const native = structuredClone(r);
    native.nodes.find(n => n.key === proof.referenceNode).inline.border = { value: '0', important: false };
    assert.throws(() => proveCustomOwnerBorder(e, native, a, normalize, element));
  }
});
