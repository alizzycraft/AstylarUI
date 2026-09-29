import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { queryFindings } from '../../scripts/audit-findings-store.mjs';
import { collectFullTreeInventory } from './input-equivalence-audit.mjs';
import { modalInventoryTrees } from './modal-position-inspection.mjs';
import { bindPreciseAuditNormalization } from './audit-normalization-contracts.mjs';
import { displayRequestOwners, displayBoundaryOwners, proveDisplayRequest, applyDisplayRequestReviews, applyDisplayBoundaryReviews } from './display-request-review.mjs';
import { proveListSpacingComposition, applyListSpacingReviews, validateListSpacingReviews } from './display-request-review.mjs';
import { proveStepperSpacingComposition, applyStepperSpacingReviews, validateStepperSpacingReviews } from './display-request-review.mjs';
import { proveChipSpacingComposition, applyChipSpacingReviews, validateChipSpacingReviews } from './display-request-review.mjs';
import { proveChoiceSpacingComposition, applyChoiceSpacingReviews, validateChoiceSpacingReviews } from './display-request-review.mjs';
import { proveToolbarSpacingComposition, applyToolbarSpacingReviews, validateToolbarSpacingReviews } from './display-request-review.mjs';
import { proveDialogActionSpacing, applyDialogActionSpacingReviews, validateDialogActionSpacingReviews } from './display-request-review.mjs';
import { proveDialogPanelGap, applyDialogPanelGapReview, validateDialogPanelGapReview } from './display-request-review.mjs';
import { proveTooltipShrinkComposition, applyTooltipShrinkReviews, validateTooltipShrinkReviews } from './display-request-review.mjs';
import { proveExpansionTreeFormatting, applyExpansionTreeFormattingReviews, validateExpansionTreeFormattingReviews } from './display-request-review.mjs';

test('expansion and tree formatting conserve 256 observations without assuming inherited alignment', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const capture = JSON.parse(bytes);
  const cases = [...capture.results.map(e => ({ ...e, kind: 'static' })), ...capture.interactions.map(e => ({ ...e, kind: 'interaction' }))].filter(e => ['expansion', 'tree'].includes(e.family));
  const inventory = collectFullTreeInventory(cases), normalize = bindPreciseAuditNormalization();
  assert.deepEqual(inventory.errors, []);
  const rows = ['expansion', 'tree'].flatMap(f => queryFindings('artifacts/material-parity/working-audit', f, {
    generation: '9b827bb2b09ae9d20d35e1640f987c9a4972aeab04676d595d7dd5f7d6ee01ab',
    indexSha256: 'cd3d3c45aab1db7095753132870a660f456dc80e5334787f6f4508e8d30d9486',
  })).filter(r => r.evidence.section === 'discrepancies').map(({ id, evidence, ...row }) => row);
  const applied = applyExpansionTreeFormattingReviews(rows, cases, inventory, normalize);
  const changed = applied.filter((r, i) => r !== rows[i]);
  assert.equal(changed.length, 4); assert.equal(changed.reduce((n, r) => n + r.occurrences, 0), 256);
  const metadata = new Set(['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']);
  const raw = r => Object.fromEntries(Object.entries(r).filter(([k]) => !metadata.has(k)));
  assert.deepEqual(applied.map(raw), rows.map(raw));
  applied.forEach((r, i) => { if (!changed.includes(r)) assert.deepEqual(r, rows[i]); });
  assert.deepEqual(validateExpansionTreeFormattingReviews(applied, rows, cases, inventory, normalize), []);
  const alignment = changed.find(r => r.property === 'textAlign');
  assert.equal(alignment.classification, 'parity-harness-defect'); assert.equal(alignment.astylar, undefined);
  const forged = structuredClone(applied); forged.find(r => r.attribution === 'reviewed-expansion-tree-formatting-substitution').reviewedCases.pop();
  assert.equal(validateExpansionTreeFormattingReviews(forged, rows, cases, inventory, normalize).length, 1);
  const key = e => `${e.kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`;
  assert.throws(() => applyExpansionTreeFormattingReviews(rows, cases.filter(e => key(e) !== changed[0].reviewedCases[0]), inventory, normalize));
  for (const family of ['expansion', 'tree']) {
    const entry = cases.find(e => e.family === family), pair = modalInventoryTrees(inventory, key(entry));
    const proof = proveExpansionTreeFormatting(entry, ...pair);
    assert.equal(proof.renderingEquivalent, null); assert.equal(proof.candidateComputedTextAlignProven, false);
    for (const mutate of [
      ([r]) => { r.ruleEvidenceComplete = false; },
      ([, a]) => { a.nodes.find(n => n.key === proof.astylarNode).interactionResolvedStyle.textAlign = 'left'; },
      ([, a]) => { a.rules.push({ selector: '#' + (family === 'expansion' ? 'expansion-title' : 'tree-primary'), marginRight: '16px' }); },
      ([r]) => { r.rules[r.nodes.find(n => n.key === proof.referenceNode).rules[0]].cssText += ' text-align: right;'; },
    ]) { const altered = structuredClone(pair); mutate(altered); assert.throws(() => proveExpansionTreeFormatting(entry, ...altered)); }
  }
});

test('tooltip shrink preserves 80 observations across distinct parent contracts', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const capture = JSON.parse(bytes);
  const cases = [...capture.results.map(e => ({ ...e, kind: 'static' })), ...capture.interactions.map(e => ({ ...e, kind: 'interaction' }))].filter(e => e.family === 'tooltip');
  const inventory = collectFullTreeInventory(cases), normalize = bindPreciseAuditNormalization();
  assert.deepEqual(inventory.errors, []);
  const rows = queryFindings('artifacts/material-parity/working-audit', 'tooltip', {
    generation: '9b827bb2b09ae9d20d35e1640f987c9a4972aeab04676d595d7dd5f7d6ee01ab',
    indexSha256: 'cd3d3c45aab1db7095753132870a660f456dc80e5334787f6f4508e8d30d9486',
  }).filter(r => r.evidence.section === 'discrepancies').map(({ id, evidence, ...row }) => row);
  const applied = applyTooltipShrinkReviews(rows, cases, inventory, normalize);
  const changed = applied.filter((r, i) => r !== rows[i]);
  assert.equal(changed.length, 2); assert.equal(changed.reduce((n, r) => n + r.occurrences, 0), 80);
  const metadata = new Set(['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']);
  const raw = r => Object.fromEntries(Object.entries(r).filter(([k]) => !metadata.has(k)));
  assert.deepEqual(applied.map(raw), rows.map(raw));
  applied.forEach((r, i) => { if (!changed.includes(r)) assert.deepEqual(r, rows[i]); });
  assert.deepEqual(validateTooltipShrinkReviews(applied, rows, cases, inventory, normalize), []);
  const forged = structuredClone(applied); forged.find(r => r.attribution === 'reviewed-tooltip-shrink-composition-substitution').reviewedCases.pop();
  assert.equal(validateTooltipShrinkReviews(forged, rows, cases, inventory, normalize).length, 1);
  const key = e => `${e.kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`;
  assert.throws(() => applyTooltipShrinkReviews(rows, cases.filter(e => key(e) !== changed[0].reviewedCases[0]), inventory, normalize));
  for (const row of changed) {
    const entry = cases.find(e => row.cases.includes(key(e)));
    const pair = modalInventoryTrees(inventory, key(entry));
    const proof = proveTooltipShrinkComposition(entry, ...pair, row.element);
    assert.equal(proof.renderingEquivalent, null); assert.equal(proof.usedShrinkEffectProven, false);
    for (const mutate of [
      ([r]) => { r.ruleEvidenceComplete = false; },
      ([r]) => { r.styles[r.nodes.find(n => n.key === proof.referenceNode).style].flexShrink = '0'; },
      ([r]) => { r.styles[r.nodes.find(n => n.key === proof.referenceParent.key).style].display = 'grid'; },
      ([, a]) => { a.nodes.find(n => n.key === proof.astylarNode).normalResolvedStyle.flexShrink = '1'; },
      ([, a]) => { a.nodes.find(n => n.key === proof.candidateParent.key).resolvedStyle.height = '90px'; },
      ([, a]) => { a.rules.find(q => q.selector === proof.request.selector).flexShrink = '1'; },
      ([, a]) => { a.rules.push({ selector: '#' + row.element, flexShrink: '1' }); },
    ]) { const altered = structuredClone(pair); mutate(altered); assert.throws(() => proveTooltipShrinkComposition(entry, ...altered, row.element)); }
  }
});

test('dialog action spacing binds 416 observations to omitted Material requests', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const capture = JSON.parse(bytes);
  const cases = [...capture.results.map(e => ({ ...e, kind: 'static' })), ...capture.interactions.map(e => ({ ...e, kind: 'interaction' }))].filter(e => e.family === 'dialog');
  const inventory = collectFullTreeInventory(cases), normalize = bindPreciseAuditNormalization();
  assert.deepEqual(inventory.errors, []);
  const rows = queryFindings('artifacts/material-parity/working-audit', 'dialog', {
    generation: '9b827bb2b09ae9d20d35e1640f987c9a4972aeab04676d595d7dd5f7d6ee01ab',
    indexSha256: 'cd3d3c45aab1db7095753132870a660f456dc80e5334787f6f4508e8d30d9486',
  }).filter(r => r.evidence.section === 'discrepancies').map(({ id, evidence, ...row }) => row);
  const applied = applyDialogActionSpacingReviews(rows, cases, inventory, normalize);
  const changed = applied.filter((r, i) => r !== rows[i]);
  assert.equal(changed.length, 13); assert.equal(changed.reduce((n, r) => n + r.occurrences, 0), 416);
  const metadata = new Set(['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']);
  const raw = r => Object.fromEntries(Object.entries(r).filter(([k]) => !metadata.has(k)));
  assert.deepEqual(applied.map(raw), rows.map(raw));
  applied.forEach((r, i) => { if (!changed.includes(r)) assert.deepEqual(r, rows[i]); });
  assert.deepEqual(validateDialogActionSpacingReviews(applied, rows, cases, inventory, normalize), []);
  assert.equal(new Set(changed.flatMap(r => r.reviewedCases)).size, 32);
  const forged = structuredClone(applied); forged.find(r => r.attribution === 'reviewed-dialog-action-spacing-request-omission').reviewedCases.pop();
  assert.equal(validateDialogActionSpacingReviews(forged, rows, cases, inventory, normalize).length, 1);
  const key = e => `${e.kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`;
  const gaps = applyDialogPanelGapReview(rows, cases, inventory, normalize);
  const gapChanges = gaps.filter((r, i) => r !== rows[i]);
  assert.equal(gapChanges.length, 2); assert.equal(gapChanges.reduce((n, r) => n + r.occurrences, 0), 64);
  assert.ok(gapChanges.every(r => r.classification === 'parity-harness-defect' && r.astylar === undefined));
  assert.deepEqual(gaps.map(raw), rows.map(raw));
  gaps.forEach((r, i) => { if (!gapChanges.includes(r)) assert.deepEqual(r, rows[i]); });
  assert.deepEqual(validateDialogPanelGapReview(gaps, rows, cases, inventory, normalize), []);
  const forgedGap = structuredClone(gaps); forgedGap.find(r => r.attribution === 'reviewed-dialog-panel-gap-observation-stage').reviewedCases.pop();
  assert.equal(validateDialogPanelGapReview(forgedGap, rows, cases, inventory, normalize).length, 1);
  assert.throws(() => applyDialogPanelGapReview(rows, cases.filter(e => key(e) !== gapChanges[0].reviewedCases[0]), inventory, normalize));
  const gapEntry = cases.find(e => key(e) === gapChanges[0].reviewedCases[0]);
  const gapPair = modalInventoryTrees(inventory, key(gapEntry));
  const gapProof = proveDialogPanelGap(gapEntry, ...gapPair);
  for (const mutate of [
    ([r]) => { r.rules.find(q => q.selector === '.mat-mdc-dialog-surface').cssText += ' gap: 5px;'; },
    ([r]) => { const q = r.rules.find(q => q.selector === '.mat-mdc-dialog-surface'); q.cssText = q.cssText.replace('transition: transform ', 'transition: gap '); },
    ([r]) => { r.rules.find(q => q.selector === '._mat-animation-noopable .mat-mdc-dialog-surface').active = false; },
    ([, a]) => { a.rules.push({ selector: '.dialog-panel', rowGap: '4px' }); },
    ([, a]) => { a.nodes.find(n => n.key === gapProof.astylarNode).interactionResolvedStyle.gap = '0'; },
  ]) { const altered = structuredClone(gapPair); mutate(altered); assert.throws(() => proveDialogPanelGap(gapEntry, ...altered)); }
  assert.throws(() => applyDialogActionSpacingReviews(rows, cases.filter(e => key(e) !== changed[0].reviewedCases[0]), inventory, normalize));
  for (const row of changed) {
    const entry = cases.find(e => row.cases.includes(key(e)));
    assert.ok(entry);
    const pair = modalInventoryTrees(inventory, key(entry));
    const proof = proveDialogActionSpacing(entry, ...pair, row.element);
    assert.equal(proof.renderingEquivalent, null);
    for (const mutate of [
      ([r]) => { r.ruleEvidenceComplete = false; },
      ([r]) => { r.styles[r.nodes.find(n => n.key === proof.referenceNode).style].paddingLeft = '50px'; },
      ([r]) => { r.rules.find(q => q.selector === '.mdc-button').declarations['padding-top'].value = '1px'; },
      ([, a]) => { a.nodes.find(n => n.key === proof.astylarNode).normalResolvedStyle.padding = '50px'; },
      ([, a]) => { a.rules.push({ selector: '#' + row.element, padding: '0 12px' }); },
    ]) { const altered = structuredClone(pair); mutate(altered); assert.throws(() => proveDialogActionSpacing(entry, ...altered, row.element)); }
  }
});

test('toolbar spacing preserves seven groups and all 364 observations', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const capture = JSON.parse(bytes);
  const cases = [...capture.results.map(e => ({ ...e, kind: 'static' })), ...capture.interactions.map(e => ({ ...e, kind: 'interaction' }))].filter(e => e.family === 'toolbar');
  assert.equal(cases.length, 52);
  const inventory = collectFullTreeInventory(cases), normalize = bindPreciseAuditNormalization();
  assert.deepEqual(inventory.errors, []);
  const rows = queryFindings('artifacts/material-parity/working-audit', 'toolbar', {
    generation: '9b827bb2b09ae9d20d35e1640f987c9a4972aeab04676d595d7dd5f7d6ee01ab',
    indexSha256: 'cd3d3c45aab1db7095753132870a660f456dc80e5334787f6f4508e8d30d9486',
  }).filter(r => r.evidence.section === 'discrepancies').map(({ id, evidence, ...row }) => row);
  const applied = applyToolbarSpacingReviews(rows, cases, inventory, normalize);
  const changed = applied.filter((r, i) => r !== rows[i]);
  assert.equal(changed.length, 7); assert.equal(changed.reduce((n, r) => n + r.occurrences, 0), 364);
  const metadata = new Set(['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']);
  const raw = r => Object.fromEntries(Object.entries(r).filter(([k]) => !metadata.has(k)));
  assert.deepEqual(applied.map(raw), rows.map(raw));
  applied.forEach((r, i) => { if (!changed.includes(r)) assert.deepEqual(r, rows[i]); });
  assert.deepEqual(validateToolbarSpacingReviews(applied, rows, cases, inventory, normalize), []);
  const forged = structuredClone(applied); forged.find(r => r.attribution === 'reviewed-toolbar-spacing-composition-substitution').reviewedCases.pop();
  assert.equal(validateToolbarSpacingReviews(forged, rows, cases, inventory, normalize).length, 1);
  assert.throws(() => applyToolbarSpacingReviews(rows, cases.slice(1), inventory, normalize));
  for (const row of changed) {
    const entry = cases.find(e => row.cases.includes(`${e.kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`));
    assert.ok(entry);
    const pair = modalInventoryTrees(inventory, `${entry.kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`);
    const proof = proveToolbarSpacingComposition(entry, ...pair, row.element);
    assert.equal(proof.renderingEquivalent, null);
    for (const mutate of [
      ([r]) => { r.ruleEvidenceComplete = false; },
      ([r]) => { r.styles[r.nodes.find(n => n.key === proof.referenceNode).style].padding = '50px'; },
      ([, a]) => { a.nodes.find(n => n.key === proof.astylarNode).normalResolvedStyle.padding = '50px'; },
      ([, a]) => { a.rules.push({ selector: '#' + row.element, [row.element === 'toolbar-primary' ? 'paddingLeft' : 'marginLeft']: '8px' }); },
      ([r]) => { r.nodes.find(n => n.key === proof.composition.reference.spacer).parent = null; },
    ]) { const altered = structuredClone(pair); mutate(altered); assert.throws(() => proveToolbarSpacingComposition(entry, ...altered, row.element)); }
  }
});

test('choice spacing preserves all 341 observations including the custom mobile label exception', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const capture = JSON.parse(bytes), families = ['checkbox', 'radio'];
  const cases = [...capture.results.map(e => ({ ...e, kind: 'static' })), ...capture.interactions.map(e => ({ ...e, kind: 'interaction' }))]
    .filter(e => families.includes(e.family));
  assert.equal(cases.length, 136);
  const inventory = collectFullTreeInventory(cases), normalize = bindPreciseAuditNormalization();
  assert.deepEqual(inventory.errors, []);
  const rows = families.flatMap(f => queryFindings('artifacts/material-parity/working-audit', f, {
    generation: '9b827bb2b09ae9d20d35e1640f987c9a4972aeab04676d595d7dd5f7d6ee01ab',
    indexSha256: 'cd3d3c45aab1db7095753132870a660f456dc80e5334787f6f4508e8d30d9486',
  })).filter(r => r.evidence.section === 'discrepancies').map(({ id, evidence, ...row }) => row);
  const applied = applyChoiceSpacingReviews(rows, cases, inventory, normalize);
  const changed = applied.filter((r, i) => r !== rows[i]);
  assert.equal(changed.length, 7); assert.equal(changed.reduce((n, r) => n + r.occurrences, 0), 341);
  const metadata = new Set(['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']);
  const raw = r => Object.fromEntries(Object.entries(r).filter(([k]) => !metadata.has(k)));
  assert.deepEqual(applied.map(raw), rows.map(raw));
  applied.forEach((r, i) => { if (!changed.includes(r)) assert.deepEqual(r, rows[i]); });
  assert.deepEqual(validateChoiceSpacingReviews(applied, rows, cases, inventory, normalize), []);
  assert.deepEqual(changed.find(r => r.element === 'checkbox-label').reviewedCases, ['static:checkbox@custom/mobile']);
  const forged = structuredClone(applied); forged.find(r => r.attribution === 'reviewed-choice-spacing-authoring-substitution').reviewedCases.pop();
  assert.equal(validateChoiceSpacingReviews(forged, rows, cases, inventory, normalize).length, 1);
  assert.throws(() => applyChoiceSpacingReviews(rows, cases.slice(1), inventory, normalize));
  for (const row of changed) {
    const entry = cases.find(e => row.cases.includes(`${e.kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`));
    assert.ok(entry);
    const pair = modalInventoryTrees(inventory, `${entry.kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`);
    const proof = proveChoiceSpacingComposition(entry, ...pair, row.element);
    for (const mutate of [
      ([r]) => { r.ruleEvidenceComplete = false; },
      ([, a]) => { a.nodes.find(n => n.key === proof.astylarNode).normalResolvedStyle.padding = '50px'; },
      ([, a]) => { a.rules.push({ selector: '#' + row.element, marginLeft: '8px' }); },
      ([r]) => { r.nodes.find(n => n.key === proof.referenceNode).inline['padding-left'] = { value: '1px', important: false }; },
    ]) { const altered = structuredClone(pair); mutate(altered); assert.throws(() => proveChoiceSpacingComposition(entry, ...altered, row.element)); }
  }
});

test('chip spacing binds all 836 observations to nested versus flat composition', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const capture = JSON.parse(bytes);
  const cases = [...capture.results.map(e => ({ ...e, kind: 'static' })), ...capture.interactions.map(e => ({ ...e, kind: 'interaction' }))]
    .filter(e => e.family === 'chips');
  assert.equal(cases.length, 76);
  const inventory = collectFullTreeInventory(cases), normalize = bindPreciseAuditNormalization();
  assert.deepEqual(inventory.errors, []);
  const rows = queryFindings('artifacts/material-parity/working-audit', 'chips', {
    generation: '9b827bb2b09ae9d20d35e1640f987c9a4972aeab04676d595d7dd5f7d6ee01ab',
    indexSha256: 'cd3d3c45aab1db7095753132870a660f456dc80e5334787f6f4508e8d30d9486',
  }).filter(r => r.evidence.section === 'discrepancies').map(({ id, evidence, ...row }) => row);
  const applied = applyChipSpacingReviews(rows, cases, inventory, normalize);
  const changed = applied.filter((r, i) => r !== rows[i]);
  assert.equal(changed.length, 11); assert.equal(changed.reduce((n, r) => n + r.occurrences, 0), 836);
  const metadata = new Set(['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']);
  const raw = r => Object.fromEntries(Object.entries(r).filter(([k]) => !metadata.has(k)));
  assert.deepEqual(applied.map(raw), rows.map(raw));
  applied.forEach((r, i) => { if (!changed.includes(r)) assert.deepEqual(r, rows[i]); });
  assert.deepEqual(validateChipSpacingReviews(applied, rows, cases, inventory, normalize), []);
  const forged = structuredClone(applied); forged.find(r => r.attribution === 'reviewed-chip-spacing-composition-substitution').reviewedCases.pop();
  assert.equal(validateChipSpacingReviews(forged, rows, cases, inventory, normalize).length, 1);
  assert.throws(() => applyChipSpacingReviews(rows, cases.slice(1), inventory, normalize));
  for (const profile of ['light', 'dark', 'contrast', 'custom']) {
    const entry = cases.find(e => e.profile === profile);
    const pair = modalInventoryTrees(inventory, `${entry.kind}:chips@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`);
    for (const element of ['chips-primary', 'chip-0', 'chip-1']) {
      const proof = proveChipSpacingComposition(entry, ...pair, element);
      for (const mutate of [
        ([r]) => { r.ruleEvidenceComplete = false; },
        ([, a]) => { a.nodes.find(n => n.key === proof.astylarNode).normalResolvedStyle.padding = '50px'; },
        ([, a]) => { a.rules.push({ selector: '#' + element, marginLeft: '8px' }); },
        ([r]) => { r.styles[r.nodes.find(n => n.key === proof.composition.referenceWrapper).style].marginLeft = '0px'; },
      ]) { const altered = structuredClone(pair); mutate(altered); assert.throws(() => proveChipSpacingComposition(entry, ...altered, element)); }
    }
  }
});

test('stepper spacing preserves all 340 owner substitutions without inferring flex or margin equivalence', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const capture = JSON.parse(bytes);
  const cases = [...capture.results.map(e => ({ ...e, kind: 'static' })), ...capture.interactions.map(e => ({ ...e, kind: 'interaction' }))]
    .filter(e => e.family === 'stepper');
  assert.equal(cases.length, 68);
  const inventory = collectFullTreeInventory(cases), normalize = bindPreciseAuditNormalization();
  assert.deepEqual(inventory.errors, []);
  const rows = queryFindings('artifacts/material-parity/working-audit', 'stepper', {
    generation: '9b827bb2b09ae9d20d35e1640f987c9a4972aeab04676d595d7dd5f7d6ee01ab',
    indexSha256: 'cd3d3c45aab1db7095753132870a660f456dc80e5334787f6f4508e8d30d9486',
  }).filter(r => r.evidence.section === 'discrepancies').map(({ id, evidence, ...row }) => row);
  const applied = applyStepperSpacingReviews(rows, cases, inventory, normalize);
  const changed = applied.filter((r, i) => r !== rows[i]);
  assert.equal(changed.length, 5); assert.equal(changed.reduce((n, r) => n + r.occurrences, 0), 340);
  const metadata = new Set(['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']);
  const raw = r => Object.fromEntries(Object.entries(r).filter(([k]) => !metadata.has(k)));
  assert.deepEqual(applied.map(raw), rows.map(raw));
  applied.forEach((r, i) => { if (!changed.includes(r)) assert.deepEqual(r, rows[i]); });
  assert.deepEqual(validateStepperSpacingReviews(applied, rows, cases, inventory, normalize), []);
  const forged = structuredClone(applied); forged.find(r => r.attribution === 'reviewed-stepper-spacing-composition-substitution').reviewedCases.pop();
  assert.equal(validateStepperSpacingReviews(forged, rows, cases, inventory, normalize).length, 1);
  assert.throws(() => applyStepperSpacingReviews(rows, cases.slice(1), inventory, normalize));
  for (const profile of ['light', 'dark', 'contrast', 'custom']) {
    const entry = cases.find(e => e.profile === profile);
    const pair = modalInventoryTrees(inventory, `${entry.kind}:stepper@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`);
    for (const element of ['stepper-primary', 'step-details-text', 'step-review-text']) {
      const proof = proveStepperSpacingComposition(entry, ...pair, element);
      for (const mutate of [
        ([r]) => { r.ruleEvidenceComplete = false; },
        ([, a]) => { a.nodes.find(n => n.key === proof.astylarNode).normalResolvedStyle.padding = '50px'; },
        ([, a]) => { a.rules.push({ selector: '#' + element, marginLeft: '8px' }); },
        ([r]) => { r.nodes.find(n => n.key === proof.referenceNode).inline['padding-left'] = { value: '1px', important: false }; },
      ]) { const altered = structuredClone(pair); mutate(altered); assert.throws(() => proveStepperSpacingComposition(entry, ...altered, element)); }
    }
  }
});

test('list spacing preserves padded block versus unpadded flex composition across all themes', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const capture = JSON.parse(bytes);
  const cases = [...capture.results.map(e => ({ ...e, kind: 'static' })), ...capture.interactions.map(e => ({ ...e, kind: 'interaction' }))]
    .filter(e => e.family === 'list');
  assert.equal(cases.length, 52);
  const inventory = collectFullTreeInventory(cases), normalize = bindPreciseAuditNormalization();
  assert.deepEqual(inventory.errors, []);
  const rows = queryFindings('artifacts/material-parity/working-audit', 'list', {
    generation: '0a30ca894170b342e4521c01e4fcb23ed990d70cea789fe89bd4eba0baf663fb',
    indexSha256: 'edf9c2de34728dc874460796853460dd5d39bafd71d4db41cba257366ec50cc0',
  }).filter(r => r.evidence.section === 'discrepancies').map(({ id, evidence, ...row }) => row);
  const applied = applyListSpacingReviews(rows, cases, inventory, normalize), changed = applied.filter((r, i) => r !== rows[i]);
  assert.equal(changed.length, 3); assert.equal(changed.reduce((sum, r) => sum + r.occurrences, 0), 156);
  const metadata = new Set(['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']);
  const raw = r => Object.fromEntries(Object.entries(r).filter(([key]) => !metadata.has(key)));
  assert.deepEqual(applied.map(raw), rows.map(raw));
  for (let i = 0; i < rows.length; i++) if (!changed.includes(applied[i])) assert.deepEqual(applied[i], rows[i]);
  assert.deepEqual(validateListSpacingReviews(applied, rows, cases, inventory, normalize), []);
  const forged = structuredClone(applied); forged.find(r => r.attribution === 'reviewed-list-spacing-composition-substitution').reviewedCases.pop();
  assert.equal(validateListSpacingReviews(forged, rows, cases, inventory, normalize).length, 1);
  const entry = cases.find(e => e.profile === 'contrast');
  const pair = modalInventoryTrees(inventory, `${entry.kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`);
  const proof = proveListSpacingComposition(entry, ...pair);
  assert.equal(proof.children[0].referenceComputedHeight, '24px'); assert.equal(proof.children[0].candidateLocalHeight, '40px');
  for (const mutate of [
    ([r]) => { r.ruleEvidenceComplete = false; },
    ([, a]) => { a.nodes.find(n => n.key === proof.astylarNode).normalResolvedStyle.padding = '8px 0'; },
    ([, a]) => { a.rules.push({ selector: '.material-list', paddingBlock: '8px' }); },
    ([, a]) => { a.nodes.find(n => n.authored?.id === 'list-inbox').normalResolvedStyle.height = '32px'; },
    ([, a]) => { a.nodes.find(n => n.authored?.id === 'list-inbox-label').authored.textContent = 'Wrong'; },
  ]) { const altered = structuredClone(pair); mutate(altered); assert.throws(() => proveListSpacingComposition(entry, ...altered)); }
});

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
