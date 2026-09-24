import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { PNG } from 'pngjs';
import { collectModalPositionInspection, proveModalPositionInspection, proveDialogScalarTypographyJoin,
  applyDialogScalarTypography, validateDialogScalarTypography, modalInventoryTrees,
  proveBottomSheetScalarTypography, applyBottomSheetScalarTypography,
  validateBottomSheetScalarTypography, proveDialogActionBoxSubstitution,
  applyDialogActionBox, validateDialogActionBox, applyDialogPanelConstraints,
  validateDialogPanelConstraints, proveBottomSheetPanelConstraints, proveBottomSheetPanelFlow,
  applyBottomSheetPanelConstraints, validateBottomSheetPanelConstraints,
  applyBottomSheetPanelFlow, validateBottomSheetPanelFlow, proveBottomSheetPanelPaint,
  applyBottomSheetPanelPaint, validateBottomSheetPanelPaint, proveBottomSheetActionLayout,
  applyBottomSheetActionLayout, validateBottomSheetActionLayout } from './modal-position-inspection.mjs';
import { bindPreciseAuditNormalization } from './audit-normalization-contracts.mjs';
import { sourceAuditDefinitions } from './input-equivalence-policy.mjs';
import { queryFindings, loadFindingEvidence } from '../../scripts/audit-findings-store.mjs';
import { proveSnackbarSurfaceRequests, collectOverlaySurfaceReview, applyOverlaySurfaceRows,
  overlaySurfacePredecessor } from './overlay-surface-review.mjs';
import { collectOverlaySurfaceAuditInputs, applyOverlaySurfaceAuditRows,
  validateOverlaySurfaceAuditInputs, validateOverlaySurfaceAuditClassifications } from './overlay-surface-audit-source-binding.mjs';
import { collectFullTreeInventory, collectControlTypographyEvidence,
  collectRetainedTypographyEvidence } from './input-equivalence-audit.mjs';

// Transition tests need original unresolved inputs, not a moving current index
// in which the same classifications may already have been accepted.
const modalSizingPredecessor = Object.freeze({
  generation: '064777d79c6b85219285c85b97fb38edac27d069c8ddec67e0ae2da5b61099e5',
  indexSha256: '7e3141128b5728007cf478b5d37b7820ac6a9cd56d34e0242d4f10842ce4e745',
});

test('bottom-sheet action layout binds fifty list-item substitutions without inventing candidate defaults', () => {
  const inspection = collectModalPositionInspection();
  const captured = JSON.parse(readFileSync(inspection.capture.file));
  const cases = captured.interactions.filter(c => c.family === 'bottom-sheet' &&
    c.styleInputs.some(i => i.id === 'bottom-sheet-panel')).map(c => ({ ...c, kind: 'interaction' }));
  assert.equal(cases.length, 25);
  const inventory = collectFullTreeInventory(cases);
  const snapshot = { generation: 'b05e2adcec67d05f5371246d6aa527df4f4528cfb75a2fcc5ed027da86ab9b9d',
    indexSha256: '7623877cb5b0b5e4fec5edb62f8f8cd433e7e616a68aa36e8c7ff5cf59a2c9c7' };
  const rows = queryFindings('artifacts/material-parity/working-audit', 'bottom-sheet', snapshot).filter(r =>
    r.evidence.section === 'discrepancies' && r.attribution === 'unresolved' &&
    ['bottom-sheet-copy', 'bottom-sheet-dismiss'].includes(r.element) &&
    ['display', 'position', 'overflowX', 'overflowY', 'boxSizing'].includes(r.property));
  assert.equal(rows.length, 10);
  const matched = new Map(); let first, owners = 0;
  for (const entry of cases) {
    const key = `interaction:${entry.family}@${entry.profile}/${entry.viewport.id}/${entry.state}`;
    const trees = modalInventoryTrees(inventory, key);
    for (const element of ['bottom-sheet-copy', 'bottom-sheet-dismiss']) {
      const proof = proveBottomSheetActionLayout(entry, ...trees, element); owners++;
      first ??= { entry, trees, element, proof };
      for (const property of proof.attributableProperties) {
        const matches = rows.filter(r => r.element === element && r.property === property &&
          r.reference === proof.reference[property] && r.astylar === proof.candidate[property]);
        assert.equal(matches.length, 1);
        if (property !== 'display') assert.equal(Object.hasOwn(matches[0], 'astylar'), false);
        const keys = matched.get(matches[0].id) ?? []; keys.push(key); matched.set(matches[0].id, keys);
      }
    }
  }
  assert.equal(owners, 50); assert.equal(matched.size, 10);
  for (const row of rows) {
    const keys = matched.get(row.id); assert.equal(keys.length, 25);
    assert.equal(new Set(keys).size, 25); assert.equal(row.occurrences, keys.length);
    assert.deepEqual(row.cases, keys.slice(0, 12));
  }
  const normalize = bindPreciseAuditNormalization(), original = structuredClone(rows);
  const applied = applyBottomSheetActionLayout(rows, cases, inventory, normalize);
  assert.deepEqual(rows, original);
  assert.equal(applied.filter(r => r.attribution === 'reviewed-bottom-sheet-action-layout-substitution').length, 10);
  const metadata = new Set(['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']);
  const raw = row => Object.fromEntries(Object.entries(row).filter(([key]) => !metadata.has(key)));
  assert.deepEqual(applied.map(raw), rows.map(raw));
  const validate = values => validateBottomSheetActionLayout(values, rows, cases, inventory, normalize);
  assert.deepEqual(validate(applied), []);
  for (const mutate of [
    values => values.pop(), values => values.push(structuredClone(values[0])),
    values => { values[0].reference = 'forged'; },
    values => { values[0].reviewEvidence.priorMetadata.attribution = 'forged'; },
    values => { values[0].reviewEvidence.observations[0].candidateUsedLayoutMeasured = true; },
  ]) { const altered = structuredClone(applied); mutate(altered); assert.equal(validate(altered).length, 1); }
  assert.throws(() => applyBottomSheetActionLayout(rows, cases.slice(1), inventory, normalize));
  assert.throws(() => applyBottomSheetActionLayout(rows, [...cases, cases[0]], inventory, normalize));
  for (const mutate of [
    (r, a) => { a.nodes.find(n => n.key === first.proof.astylarNode).authored.style = { display: 'flex' }; },
    (r, a) => { a.nodes.find(n => n.key === first.proof.astylarNode).resolvedStyle.position = 'static'; },
    (r, a) => { a.nodes.find(n => n.key === first.proof.astylarNode).interactionResolvedStyle.overflow = 'visible'; },
    (r, a) => { a.rules.push({ selector: '.bottom-sheet-option:focus', boxSizing: 'border-box' }); },
    (r, a) => { a.rules.push({ selector: ':unknown', all: 'initial' }); },
    (r, a) => { a.nodes.push({ key: 'new-child', parent: first.proof.astylarNode, authored: { type: 'span' } }); },
    r => { r.nodes.find(n => n.key === first.proof.referenceChildren[0]).type = 'div'; },
    r => { r.rules.find(rule => rule.selector === '.mdc-list-item').declarations.display.value = 'block'; },
    r => { r.rules.find(rule => rule.selector === '.mdc-list-item').declarations.all = { value: 'initial', important: false }; },
  ]) { const altered = structuredClone(first.trees); mutate(...altered);
    assert.throws(() => proveBottomSheetActionLayout(first.entry, ...altered, first.element)); }
});

test('bottom-sheet panel constraints bind explicit responsive and overflow omissions across original states', () => {
  const inspection = collectModalPositionInspection();
  const captured = JSON.parse(readFileSync(inspection.capture.file));
  const observations = inspection.groups.find(g => g.element === 'bottom-sheet-panel').observations;
  assert.equal(observations.length, 25);
  const rows = queryFindings('artifacts/material-parity/working-audit', 'bottom-sheet', modalSizingPredecessor).filter(r =>
    r.evidence.section === 'discrepancies' && r.element === 'bottom-sheet-panel' && r.attribution === 'unresolved' &&
    ['minWidth', 'maxWidth', 'maxHeight', 'boxSizing', 'overflowX', 'overflowY'].includes(r.property));
  assert.equal(rows.length, 8);
  const matched = new Map();
  let first;
  for (const observation of observations) {
    const entry = captured.interactions.find(e => `interaction:${e.family}@${e.profile}/${e.viewport.id}/${e.state}` === observation.case);
    const trees = ['reference', 'astylar'].map(side => {
      const bytes = readFileSync(observation.inputTrees[side].file);
      assert.equal(createHash('sha256').update(bytes).digest('hex'), observation.inputTrees[side].sha256);
      return JSON.parse(bytes);
    });
    const input = { ...entry, kind: 'interaction' };
    const proof = proveBottomSheetPanelConstraints(input, ...trees);
    first ??= { input, trees, proof };
    for (const property of proof.attributableProperties) {
      const row = rows.filter(r => r.property === property && r.reference === proof.reference[property]);
      assert.equal(row.length, 1); assert.equal(Object.hasOwn(row[0], 'astylar'), false);
      if (!matched.has(row[0].id)) matched.set(row[0].id, []);
      matched.get(row[0].id).push(observation.case);
    }
  }
  assert.equal(matched.size, 8);
  assert.equal([...matched.values()].reduce((n, cases) => n + cases.length, 0), 149);
  for (const row of rows) {
    assert.equal(matched.get(row.id).length, row.occurrences);
    assert.deepEqual(matched.get(row.id).slice(0, 12), row.cases);
  }
  for (const mutate of [
    (r, a, n) => { n.normalResolvedStyle.overflowX = 'auto'; },
    (r, a, n) => { n.authored.style = { maxHeight: '80vh' }; },
    (r, a) => { a.rules.find(rule => rule.selector === '.bottom-sheet-panel').overflow = 'auto'; },
    r => { r.rules.find(rule => rule.selector === '.mat-bottom-sheet-container').declarations['max-height'].value = '128px'; },
    r => { r.nodes.find(n => n.key === first.proof.referenceNode).inline = { 'max-height': '128px' }; },
    (r, a) => { a.rules.find(rule => rule.mediaMaxWidth === '960px').mediaMaxWidth = '1000px'; },
  ]) {
    const [r, a] = structuredClone(first.trees);
    mutate(r, a, a.nodes.find(n => n.key === first.proof.astylarNode));
    assert.throws(() => proveBottomSheetPanelConstraints(first.input, r, a));
  }
});

test('bottom-sheet panel flow moves list padding into a structurally different flex owner', () => {
  const inspection = collectModalPositionInspection();
  const captured = JSON.parse(readFileSync(inspection.capture.file));
  const observations = inspection.groups.find(g => g.element === 'bottom-sheet-panel').observations;
  const rows = queryFindings('artifacts/material-parity/working-audit', 'bottom-sheet', modalSizingPredecessor).filter(r =>
    r.evidence.section === 'discrepancies' && r.element === 'bottom-sheet-panel' &&
    ['display', 'flexDirection', 'paddingTop', 'paddingBottom'].includes(r.property));
  assert.equal(rows.length, 4); assert.equal(observations.length, 25);
  for (const row of rows) {
    assert.equal(row.attribution, 'unresolved'); assert.equal(row.occurrences, 25);
    assert.deepEqual(row.cases, observations.slice(0, 12).map(o => o.case));
    assert.deepEqual([row.reference, row.astylar], row.property === 'display' ? ['block', 'flex']
      : row.property === 'flexDirection' ? ['row', 'column'] : ['8px', '16px']);
  }
  let first;
  for (const observation of observations) {
    const entry = captured.interactions.find(e => `interaction:${e.family}@${e.profile}/${e.viewport.id}/${e.state}` === observation.case);
    const trees = ['reference', 'astylar'].map(side => {
      const bytes = readFileSync(observation.inputTrees[side].file);
      assert.equal(createHash('sha256').update(bytes).digest('hex'), observation.inputTrees[side].sha256);
      return JSON.parse(bytes);
    });
    const input = { ...entry, kind: 'interaction' }, proof = proveBottomSheetPanelFlow(input, ...trees);
    assert.equal(proof.nativeFlexDirectionIsInactive, true);
    first ??= { input, trees, proof };
  }
  for (const mutate of [
    (r, a, n) => { n.resolvedStyle.paddingBottom = '8px'; },
    r => { r.rules.find(rule => rule.selector === '.mdc-list').declarations['padding-top'].value = '0px'; },
    r => { r.nodes.find(n => n.key === first.proof.referenceListNode).type = 'div'; },
    (r, a) => { a.nodes.find(n => n.authored?.id === 'bottom-sheet-copy').parent = 'other'; },
    (r, a) => { a.rules.find(rule => rule.selector === '.bottom-sheet-panel').flexFlow = 'row'; },
  ]) {
    const [r, a] = structuredClone(first.trees); mutate(r, a, a.nodes.find(n => n.key === first.proof.astylarNode));
    assert.throws(() => proveBottomSheetPanelFlow(first.input, r, a));
  }
});

test('bottom-sheet constraint classifications preserve raw evidence and exclude initial-value assumptions', () => {
  const inspection = collectModalPositionInspection();
  const cases = JSON.parse(readFileSync(inspection.capture.file)).interactions.filter(e =>
    e.family === 'bottom-sheet' && e.styleInputs.some(i => i.id === 'bottom-sheet-panel')).map(e => ({ ...e, kind: 'interaction' }));
  assert.equal(cases.length, 25);
  const inventory = collectFullTreeInventory(cases), normalize = bindPreciseAuditNormalization();
  const rows = queryFindings('artifacts/material-parity/working-audit', 'bottom-sheet', modalSizingPredecessor)
    .filter(r => r.evidence.section === 'discrepancies');
  const before = structuredClone(rows), applied = applyBottomSheetPanelConstraints(rows, cases, inventory, normalize);
  const changed = applied.filter((row, i) => row !== rows[i]);
  assert.equal(changed.length, 8);
  assert.equal(changed.reduce((n, row) => n + row.occurrences, 0), 149);
  assert.deepEqual(rows, before);
  const initial = rows.findIndex(row => row.element === 'bottom-sheet-panel' && row.property === 'maxWidth' && row.reference === 'none');
  assert.ok(initial >= 0); assert.equal(applied[initial], rows[initial]);
  const metadata = ['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases'];
  for (const row of changed) {
    const original = rows.find(r => r.id === row.id), restored = { ...row };
    assert.equal(Object.hasOwn(row, 'astylar'), false);
    for (const key of metadata) delete restored[key];
    Object.assign(restored, row.reviewEvidence.priorMetadata);
    assert.deepEqual(restored, original);
  }
  const validate = values => validateBottomSheetPanelConstraints(values, rows, cases, inventory, normalize);
  assert.deepEqual(validate(applied), []);
  assert.deepEqual(validate(JSON.parse(JSON.stringify(applied))), []);
  const selected = values => values.find(row => row.attribution === 'reviewed-bottom-sheet-panel-constraint-omission');
  for (const mutate of [
    values => values.splice(values.indexOf(selected(values)), 1),
    values => values.push(structuredClone(selected(values))),
    values => { selected(values).astylar = 'auto'; },
    values => { selected(values).reviewEvidence.observations[0].referenceRequests[0].value = '512px'; },
    values => { selected(values).reviewEvidence.priorMetadata.attribution = 'forged'; },
  ]) { const altered = structuredClone(applied); mutate(altered); assert.equal(validate(altered).length, 1); }
  assert.throws(() => applyBottomSheetPanelConstraints(rows, cases.slice(1), inventory, normalize));
  assert.throws(() => applyBottomSheetPanelConstraints(rows, [...cases, cases[0]], inventory, normalize));
  const forged = structuredClone(rows); forged[initial].attribution = 'unresolved';
  assert.throws(() => applyBottomSheetPanelConstraints(forged, cases, inventory, normalize));
});

test('bottom-sheet paint retains token requests and profile-specific candidate literals without inventing token ancestry', () => {
  const inspection = collectModalPositionInspection();
  const observations = inspection.groups.find(g => g.element === 'bottom-sheet-panel').observations;
  const rows = queryFindings('artifacts/material-parity/working-audit', 'bottom-sheet', modalSizingPredecessor)
    .filter(r => r.evidence.section === 'discrepancies' && r.element === 'bottom-sheet-panel' && r.attribution === 'unresolved' &&
      ['backgroundColor', 'borderTopLeftRadius', 'borderTopRightRadius'].includes(r.property));
  assert.equal(rows.length, 5);
  const matches = new Map();
  for (const observation of observations) {
    const [r, a] = ['reference', 'astylar'].map(side => {
      const bytes = readFileSync(observation.inputTrees[side].file);
      assert.equal(createHash('sha256').update(bytes).digest('hex'), observation.inputTrees[side].sha256);
      return JSON.parse(bytes);
    });
    const rn = r.nodes.find(n => n.key === observation.proof.mapping.referenceNode);
    const an = a.nodes.find(n => n.key === observation.proof.mapping.candidateNode);
    const rules = rn.rules.map(i => r.rules[i]).filter(rule => rule.active);
    const base = rules.find(rule => rule.selector === '.mat-bottom-sheet-container');
    assert.match(base.cssText, /background: var\(--mat-bottom-sheet-container-background-color, var\(--mat-sys-surface-container-low\)\);/);
    // Empty expanded CSSOM values are retained capture facts, not transparent paint.
    assert.equal(base.declarations['background-color'].value, '');
    const profile = observation.case.split('@')[1].split('/')[0];
    const compact = observation.case.includes('/comparison-pane-');
    const radius = compact ? '0' : ({ contrast: '21px', custom: '42px' }[profile] ?? '28px');
    const background = profile === 'dark' ? '#211f26' : '#f8f2f6';
    const candidateRules = a.rules.filter(rule => rule.selector === '.bottom-sheet-panel');
    assert.equal(candidateRules.length, 2);
    assert.equal(candidateRules[0].background, background);
    const authoredRadius = ({ contrast: '21px', custom: '42px' }[profile] ?? '28px');
    assert.equal(candidateRules[0].borderRadius, `${authoredRadius} ${authoredRadius} 0 0`);
    assert.deepEqual(candidateRules[1], { selector: '.bottom-sheet-panel', mediaMaxWidth: '960px', width: '100%', borderRadius: '0' });
    for (const stage of ['normalResolvedStyle', 'resolvedStyle', 'interactionResolvedStyle']) {
      assert.equal(an[stage].background, background);
      assert.equal(an[stage].borderRadius, compact ? '0' : `${radius} ${radius} 0 0`);
    }
    assert.equal(r.styles[rn.style].backgroundColor, 'rgb(248, 242, 246)');
    for (const [css, property] of [['border-top-left-radius', 'borderTopLeftRadius'], ['border-top-right-radius', 'borderTopRightRadius']]) {
      const requests = rules.filter(rule => Object.hasOwn(rule.declarations, css));
      assert.equal(requests.length, compact ? 0 : 1);
      if (!compact) assert.deepEqual(requests[0].declarations[css], { value: 'var(--mat-bottom-sheet-container-shape, 28px)', important: false });
      assert.equal(r.styles[rn.style][property], compact ? '0px' : '28px');
    }
    for (const row of rows) {
      const differs = row.property === 'backgroundColor' ? profile === 'dark'
        : !compact && row.astylar === radius;
      if (!differs) continue;
      if (!matches.has(row.id)) matches.set(row.id, []);
      matches.get(row.id).push(observation.case);
    }
  }
  assert.equal(observations.length, 25); assert.equal(matches.size, 5);
  for (const row of rows) {
    assert.equal(matches.get(row.id).length, row.occurrences);
    assert.deepEqual(matches.get(row.id).slice(0, 12), row.cases);
  }
  assert.equal([...matches.values()].reduce((n, cases) => n + cases.length, 0), 30);
});

test('bottom-sheet paint replay attributes five original populations without reconstructing token ancestry', () => {
  const inspection = collectModalPositionInspection();
  const cases = JSON.parse(readFileSync(inspection.capture.file)).interactions.filter(e =>
    e.family === 'bottom-sheet' && e.styleInputs.some(i => i.id === 'bottom-sheet-panel')).map(e => ({ ...e, kind: 'interaction' }));
  const inventory = collectFullTreeInventory(cases), normalize = bindPreciseAuditNormalization();
  const rows = queryFindings('artifacts/material-parity/working-audit', 'bottom-sheet', modalSizingPredecessor)
    .filter(r => r.evidence.section === 'discrepancies');
  const original = structuredClone(rows), applied = applyBottomSheetPanelPaint(rows, cases, inventory, normalize);
  const changed = applied.filter((row, i) => row !== rows[i]);
  assert.equal(changed.length, 5); assert.equal(changed.reduce((n, row) => n + row.occurrences, 0), 30);
  assert.deepEqual(rows, original);
  const metadata = new Set(['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']);
  const raw = row => Object.fromEntries(Object.entries(row).filter(([key]) => !metadata.has(key)));
  assert.deepEqual(applied.map(raw), rows.map(raw));
  const validate = values => validateBottomSheetPanelPaint(values, rows, cases, inventory, normalize);
  assert.deepEqual(validate(applied), []);
  const combined = applyBottomSheetPanelConstraints(
    applyBottomSheetPanelFlow(applied, cases, inventory, normalize), cases, inventory, normalize);
  const batch = combined.filter((row, i) => row !== rows[i]);
  assert.equal(batch.length, 17);
  assert.equal(batch.reduce((n, row) => n + row.occurrences, 0), 279);
  assert.deepEqual(combined.map(raw), rows.map(raw));
  assert.deepEqual(validate(combined), []);
  assert.deepEqual(validateBottomSheetPanelFlow(combined, rows, cases, inventory, normalize), []);
  assert.deepEqual(validateBottomSheetPanelConstraints(combined, rows, cases, inventory, normalize), []);
  const selected = values => values.find(row => row.attribution === 'reviewed-bottom-sheet-panel-paint-inputs');
  for (const mutate of [
    values => values.splice(values.indexOf(selected(values)), 1),
    values => values.push(structuredClone(selected(values))),
    values => { selected(values).reference = 'transparent'; },
    values => { selected(values).reviewEvidence.observations[0].tokenAncestryReconstructed = true; },
    values => { selected(values).reviewEvidence.priorMetadata.attribution = 'forged'; },
  ]) { const altered = structuredClone(applied); mutate(altered); assert.equal(validate(altered).length, 1); }
  const entry = cases.find(c => c.profile === 'dark'), key = `interaction:${entry.family}@${entry.profile}/${entry.viewport.id}/${entry.state}`;
  const trees = modalInventoryTrees(inventory, key);
  const proof = proveBottomSheetPanelPaint(entry, ...trees);
  for (const mutate of [
    (r, a) => { a.nodes.find(n => n.key === proof.astylarNode).resolvedStyle.backgroundColor = 'transparent'; },
    (r, a) => { a.rules.find(rule => rule.selector === '.bottom-sheet-panel').background = '#1d1b1e'; },
    r => { r.rules.find(rule => rule.selector === '.mat-bottom-sheet-container').declarations['background-color'].value = 'transparent'; },
    r => { r.rules.find(rule => rule.selector === '.mat-bottom-sheet-container').cssText = 'background: transparent;'; },
  ]) { const altered = structuredClone(trees); mutate(...altered); assert.throws(() => proveBottomSheetPanelPaint(entry, ...altered)); }
  assert.throws(() => applyBottomSheetPanelPaint(rows, cases.filter(c => c !== entry), inventory, normalize));
  assert.throws(() => applyBottomSheetPanelPaint(rows, [...cases, entry], inventory, normalize));
});

test('bottom-sheet flow replay composes with constraints without changing raw rows', () => {
  const inspection = collectModalPositionInspection();
  const cases = JSON.parse(readFileSync(inspection.capture.file)).interactions.filter(e =>
    e.family === 'bottom-sheet' && e.styleInputs.some(i => i.id === 'bottom-sheet-panel')).map(e => ({ ...e, kind: 'interaction' }));
  const inventory = collectFullTreeInventory(cases), normalize = bindPreciseAuditNormalization();
  const rows = queryFindings('artifacts/material-parity/working-audit', 'bottom-sheet', modalSizingPredecessor)
    .filter(r => r.evidence.section === 'discrepancies');
  const before = structuredClone(rows), flow = applyBottomSheetPanelFlow(rows, cases, inventory, normalize);
  const changed = flow.filter((row, i) => row !== rows[i]);
  assert.equal(changed.length, 4); assert.equal(changed.reduce((n, row) => n + row.occurrences, 0), 100);
  const both = applyBottomSheetPanelConstraints(flow, cases, inventory, normalize);
  assert.equal(both.filter((row, i) => row !== rows[i]).length, 12);
  assert.deepEqual(rows, before);
  const validate = values => validateBottomSheetPanelFlow(values, rows, cases, inventory, normalize);
  assert.deepEqual(validate(both), []);
  assert.deepEqual(validateBottomSheetPanelConstraints(both, rows, cases, inventory, normalize), []);
  const metadata = new Set(['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']);
  const raw = row => Object.fromEntries(Object.entries(row).filter(([key]) => !metadata.has(key)));
  assert.deepEqual(both.map(raw), rows.map(raw));
  const selected = values => values.find(row => row.attribution === 'reviewed-bottom-sheet-panel-flow-substitution');
  for (const mutate of [
    values => values.splice(values.indexOf(selected(values)), 1),
    values => values.push(structuredClone(selected(values))),
    values => { selected(values).astylar = 'block'; },
    values => { selected(values).reviewEvidence.observations[0].referenceChildren.reverse(); },
    values => { selected(values).reviewEvidence.priorMetadata.attribution = 'forged'; },
  ]) { const altered = structuredClone(both); mutate(altered); assert.equal(validate(altered).length, 1); }
  assert.throws(() => applyBottomSheetPanelFlow(rows, cases.slice(1), inventory, normalize));
  assert.throws(() => applyBottomSheetPanelFlow(rows, [...cases, cases[0]], inventory, normalize));
});

test('dialog action border-to-padding substitution preserves height but changes CSS content placement', () => {
  const inspection = collectModalPositionInspection();
  const captured = JSON.parse(readFileSync(inspection.capture.file));
  const observations = inspection.groups.find(g => g.element === 'dialog-actions').observations;
  assert.equal(observations.length, 32);
  const expectedInputs = {
    borderTopStyle: { reference: 'solid', astylar: 'none' },
    borderTopWidth: { reference: '1px', astylar: '0' },
    paddingBottom: { reference: '16px', astylar: '17px' },
    flexWrap: { reference: 'wrap', astylar: 'nowrap' },
    flexShrink: { reference: '0', astylar: '1' },
    minHeight: { reference: '52px' },
  };
  const rows = queryFindings('artifacts/material-parity/working-audit', 'dialog', modalSizingPredecessor).filter(r =>
    r.evidence.section === 'discrepancies' && r.element === 'dialog-actions' && Object.hasOwn(expectedInputs, r.property));
  assert.equal(rows.length, 6);
  for (const row of rows) {
    assert.equal(row.occurrences, 32);
    assert.deepEqual(Object.fromEntries(['reference', 'astylar'].filter(k => Object.hasOwn(row, k)).map(k => [k, row[k]])), expectedInputs[row.property]);
    assert.deepEqual(row.cases, observations.slice(0, 12).map(o => o.case));
  }
  for (const observation of observations) {
    const entry = captured.interactions.find(e => `interaction:${e.family}@${e.profile}/${e.viewport.id}/${e.state}` === observation.case);
    const trees = ['reference', 'astylar'].map(side => {
      const bytes = readFileSync(observation.inputTrees[side].file);
      assert.equal(createHash('sha256').update(bytes).digest('hex'), observation.inputTrees[side].sha256);
      return JSON.parse(bytes);
    });
    const proof = proveDialogActionBoxSubstitution({ ...entry, kind: 'interaction' }, ...trees);
    assert.equal(proof.cssContract.reference.contentHeight, proof.cssContract.astylar.contentHeight);
    assert.equal(proof.cssContract.reference.contentTop - proof.cssContract.astylar.contentTop, 1);
    assert.equal(proof.candidateUsedLayoutMeasured, false);
    assert.equal(proof.inputEquivalent, false);
    if (observation === observations[0]) {
      for (const mutate of [
        ([r]) => { r.styles[r.nodes.find(n => n.key === proof.referenceNode).style].borderTopWidth = '0px'; },
        ([, a]) => { a.nodes.find(n => n.key === proof.astylarNode).normalResolvedStyle.padding = '16px 24px'; },
        ([, a]) => { a.rules.find(r => r.selector === '.dialog-actions').padding = '17px 24px 16px'; },
        ([, a]) => { a.nodes.find(n => n.key === proof.astylarNode).authored.style = { padding: '16px' }; },
      ]) {
        const changed = structuredClone(trees); mutate(changed);
        assert.throws(() => proveDialogActionBoxSubstitution({ ...entry, kind: 'interaction' }, ...changed));
      }
    }
  }
});

test('dialog action box classifications replay six complete populations without altering scalar inputs', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const cases = JSON.parse(bytes).interactions.filter(e => e.family === 'dialog' && e.styleInputs.some(i => i.id === 'dialog-actions'))
    .map(e => ({ ...e, kind: 'interaction' }));
  assert.equal(cases.length, 32);
  const inventory = collectFullTreeInventory(cases), normalize = bindPreciseAuditNormalization();
  const rows = queryFindings('artifacts/material-parity/working-audit', 'dialog', modalSizingPredecessor).filter(r => r.evidence.section === 'discrepancies');
  const before = structuredClone(rows), applied = applyDialogActionBox(rows, cases, inventory, normalize);
  assert.deepEqual(rows, before);
  const changed = applied.filter((row, i) => row !== rows[i]);
  assert.equal(changed.length, 6);
  assert.equal(changed.reduce((sum, row) => sum + row.occurrences, 0), 192);
  const metadata = new Set(['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']);
  for (let i = 0; i < rows.length; i++) {
    const raw = row => Object.fromEntries(Object.entries(row).filter(([key]) => !metadata.has(key)));
    assert.deepEqual(raw(applied[i]), raw(rows[i]));
  }
  const validate = result => validateDialogActionBox(result, rows, cases, inventory, normalize);
  assert.deepEqual(validate(applied), []);
  for (const mutate of [
    rs => rs.splice(rs.findIndex(r => r.attribution === 'reviewed-dialog-action-box-substitution'), 1),
    rs => rs.push(structuredClone(rs.find(r => r.attribution === 'reviewed-dialog-action-box-substitution'))),
    rs => { rs.find(r => r.attribution === 'reviewed-dialog-action-box-substitution').reviewEvidence.observations[0].cssContract.astylar.contentTop = 17; },
    rs => { rs.find(r => r.attribution === 'reviewed-dialog-action-box-substitution').reviewEvidence.priorMetadata.attribution = 'forged'; },
  ]) { const altered = structuredClone(applied); mutate(altered); assert.equal(validate(altered).length, 1); }
  assert.throws(() => applyDialogActionBox(rows, cases.slice(1), inventory, normalize));
  assert.throws(() => applyDialogActionBox(rows, [...cases, cases[0]], inventory, normalize));
});

test('dialog panel constraints replay six omitted or substituted inputs without assigning defaults', () => {
  const inspection = collectModalPositionInspection();
  const cases = JSON.parse(readFileSync(inspection.capture.file)).interactions.filter(e =>
    e.family === 'dialog' && e.styleInputs.some(i => i.id === 'dialog-panel')).map(e => ({ ...e, kind: 'interaction' }));
  assert.equal(cases.length, 32);
  const inventory = collectFullTreeInventory(cases), normalize = bindPreciseAuditNormalization();
  const rows = queryFindings('artifacts/material-parity/working-audit', 'dialog', modalSizingPredecessor).filter(r => r.evidence.section === 'discrepancies');
  const original = structuredClone(rows), applied = applyDialogPanelConstraints(rows, cases, inventory, normalize);
  assert.deepEqual(rows, original);
  const changed = applied.filter((r, i) => r !== rows[i]);
  assert.equal(changed.length, 6); assert.equal(changed.reduce((n, r) => n + r.occurrences, 0), 192);
  assert.equal(changed.filter(r => !Object.hasOwn(r, 'astylar')).length, 5);
  const validate = rs => validateDialogPanelConstraints(rs, rows, cases, inventory, normalize);
  assert.deepEqual(validate(applied), []);
  for (const mutate of [
    rs => rs.splice(rs.findIndex(r => r.attribution === 'reviewed-dialog-panel-constraint-omission'), 1),
    rs => rs.push(structuredClone(rs.find(r => r.attribution === 'reviewed-dialog-panel-constraint-omission'))),
    rs => { rs.find(r => r.attribution === 'reviewed-dialog-panel-constraint-omission').astylar = 'auto'; },
    rs => { rs.find(r => r.attribution === 'reviewed-dialog-panel-constraint-omission').reviewEvidence.observations[0].referenceRequests['min-width'] = '280px'; },
  ]) { const altered = structuredClone(applied); mutate(altered); assert.equal(validate(altered).length, 1); }
  const forged = structuredClone(inventory);
  forged.variants.find(v => v.side === 'astylar').rules.forEach(index => {
    if (forged.rules[index].value.selector === '.dialog-panel') forged.rules[index].value.minWidth = '280px';
  });
  assert.throws(() => applyDialogPanelConstraints(rows, cases, forged, normalize));
});

test('dialog panel equal captured dimensions conceal percentage and inherited constraint substitutions', () => {
  const findings = sourceAuditDefinitions.filter(f => f.id === 'fixture-dialog-sampled-panel-and-action-geometry');
  assert.equal(findings.length, 1);
  assert.equal(findings[0].classification, 'application-plugin-authoring-defect');
  assert.match(findings[0].introducedBy, /^bc0e449 /);
  const source = readFileSync(findings[0].file, 'utf8');
  const locations = [...source.matchAll(new RegExp(findings[0].pattern, 'g'))];
  assert.equal(locations.length, 2);
  assert.match(locations[0][0], /dialog-panel.*height: '161px'/);
  assert.match(locations[1][0], /dialog-actions.*height: '73px'/);
  const inspection = collectModalPositionInspection();
  const observations = inspection.groups.find(g => g.element === 'dialog-panel').observations;
  assert.equal(observations.length, 32);
  for (const observation of observations) {
    const [r, a] = ['reference', 'astylar'].map(side => {
      const bytes = readFileSync(observation.inputTrees[side].file);
      assert.equal(createHash('sha256').update(bytes).digest('hex'), observation.inputTrees[side].sha256);
      return JSON.parse(bytes);
    });
    const rn = r.nodes.find(n => n.key === observation.proof.mapping.referenceNode);
    const an = a.nodes.find(n => n.key === observation.proof.mapping.candidateNode);
    const reference = r.styles[rn.style];
    const rules = rn.rules.map(i => r.rules[i]).filter(rule => rule.active && rule.selector === '.mat-mdc-dialog-surface');
    assert.equal(rules.length, 1);
    assert.deepEqual(rn.inline, {});
    const declarations = rules[0].declarations;
    for (const property of ['width', 'height']) assert.deepEqual(declarations[property], { value: '100%', important: false });
    for (const property of ['min-width', 'max-width', 'min-height', 'max-height'])
      assert.deepEqual(declarations[property], { value: 'inherit', important: false });
    assert.deepEqual([reference.width, reference.height, reference.minWidth, reference.maxWidth, reference.maxHeight],
      ['280px', '161px', '280px', '560px', '100%']);
    assert.equal(an.authored.style, undefined);
    const candidateRules = a.rules.filter(rule => rule.selector === '.dialog-panel');
    assert.equal(candidateRules.length, 1);
    assert.deepEqual([candidateRules[0].width, candidateRules[0].height], ['280px', '161px']);
    for (const stage of ['normalResolvedStyle', 'resolvedStyle', 'interactionResolvedStyle']) {
      assert.deepEqual([an[stage].width, an[stage].height], [reference.width, reference.height]);
      for (const property of ['minWidth', 'maxWidth', 'minHeight', 'maxHeight']) {
        assert.equal(Object.hasOwn(an[stage], property), false);
        assert.equal(Object.hasOwn(candidateRules[0], property), false);
      }
    }
    // Equality of these sampled scalar values cannot establish equality of
    // authored sizing rules, responsiveness, content changes or rendered output.
    assert.notEqual(declarations.width.value, candidateRules[0].width);
    assert.notEqual(declarations.height.value, candidateRules[0].height);
  }
});

test('bottom-sheet scalar typography belongs to container tokens rather than inner list-label tokens', () => {
  const inspection = collectModalPositionInspection();
  const captured = JSON.parse(readFileSync(inspection.capture.file));
  const cases = captured.interactions.filter(e => e.family === 'bottom-sheet' &&
    e.styleInputs.some(i => i.id === 'bottom-sheet-panel')).map(e => ({ ...e, kind: 'interaction' }));
  const inventory = collectFullTreeInventory(cases);
  const compact = queryFindings('artifacts/material-parity/working-audit', 'bottom-sheet', overlaySurfacePredecessor);
  const normalized = value => ({ Roboto: 'roboto', 'Roboto, Arial, sans-serif': 'roboto,arial,sans-serif',
    'rgb(29, 27, 30)': 'rgba(29,27,30,1)', '#1d1b20': 'rgba(29,27,32,1)', '#e6e1e5': 'rgba(230,225,229,1)' }[value] ?? value);
  const trees = new Map(), matched = new Map();
  for (const element of ['bottom-sheet-panel', 'bottom-sheet-copy', 'bottom-sheet-dismiss']) {
    const group = inspection.groups.find(g => g.element === element);
    assert.equal(group.observations.length, 25);
    for (const observation of group.observations) {
      const entry = cases.find(e => `interaction:${e.family}@${e.profile}/${e.viewport.id}/${e.state}` === observation.case);
      if (!trees.has(observation.case)) trees.set(observation.case, modalInventoryTrees(inventory, observation.case));
      const indexedTrees = trees.get(observation.case);
      assert.deepEqual(proveModalPositionInspection(entry, ...indexedTrees, element), observation.proof);
      const [r, a] = indexedTrees, mapping = observation.proof.mapping;
      for (const property of ['fontFamily', 'lineHeight', 'letterSpacing', 'color']) {
        const proof = proveBottomSheetScalarTypography(entry, r, a, element, property);
        const computed = proof.reference, actual = proof.astylar;
        const rows = compact.filter(row => row.evidence.section === 'discrepancies' && row.element === element && row.property === property &&
          row.reference === normalized(computed) && row.astylar === normalized(actual));
        assert.equal(rows.length, 1); const row = rows[0];
        assert.equal(Object.hasOwn(row, 'astylar'), actual !== undefined);
        assert.equal(row.attribution, 'unresolved');
        if (!matched.has(row.id)) matched.set(row.id, { row, cases: [] });
        matched.get(row.id).cases.push(observation.case);
      }
    }
  }
  assert.equal(matched.size, 15);
  assert.equal([...matched.values()].reduce((n, g) => n + g.cases.length, 0), 300);
  const scalarRows = compact.filter(r => r.evidence.section === 'discrepancies');
  const before = structuredClone(scalarRows), normalize = bindPreciseAuditNormalization();
  const applied = applyBottomSheetScalarTypography(scalarRows, cases, inventory, normalize);
  const changed = applied.filter((r, i) => r !== scalarRows[i]);
  assert.equal(changed.length, 15);
  assert.equal(changed.reduce((n, r) => n + r.occurrences, 0), 300);
  assert.deepEqual(scalarRows, before);
  const validate = rs => validateBottomSheetScalarTypography(rs, scalarRows, cases, inventory, normalize);
  assert.deepEqual(validate(applied), []);
  assert.deepEqual(validate(JSON.parse(JSON.stringify(applied))), []);
  for (const mutate of [rs => rs.splice(rs.indexOf(rs.find(r => r.attribution === 'reviewed-bottom-sheet-scalar-typography-owner')), 1),
    rs => rs.push(rs.find(r => r.attribution === 'reviewed-bottom-sheet-scalar-typography-owner')),
    rs => { rs.find(r => r.attribution === 'reviewed-bottom-sheet-scalar-typography-owner').reviewEvidence.observations[0].token = 'forged'; },
    rs => { rs.find(r => r.attribution === 'reviewed-bottom-sheet-scalar-typography-owner').reviewEvidence.priorMetadata.justification = 'forged'; }]) {
    const altered = structuredClone(applied); mutate(altered); assert.ok(validate(altered).length);
  }
  for (const row of changed) {
    const restored = { ...row };
    for (const key of ['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']) delete restored[key];
    Object.assign(restored, row.reviewEvidence.priorMetadata);
    assert.deepEqual(restored, scalarRows.find(r => r.id === row.id));
  }
  for (const mutate of [cs => cs.pop(), cs => cs.push(cs[0]), cs => {
    cs[0].styleInputs.find(i => i.id === 'bottom-sheet-panel').astylar.fontFamily = 'serif';
  }]) {
    const altered = structuredClone(cases); mutate(altered);
    assert.throws(() => applyBottomSheetScalarTypography(scalarRows, altered, inventory, normalize));
  }
  const first = inspection.groups.find(g => g.element === 'bottom-sheet-panel').observations[0];
  const firstEntry = cases.find(e => `interaction:${e.family}@${e.profile}/${e.viewport.id}/${e.state}` === first.case);
  for (const mutate of [data => data.errors.push({ case: first.case, reason: 'invalid capture' }), data => {
    const c = data.cases.find(c => c.case === first.case && c.side === 'astylar');
    data.styles[data.variants[c.variant].nodes.find(n => n.authored?.id === 'bottom-sheet-panel').style].side = 'reference';
  }, data => {
    const c = data.cases.find(c => c.case === first.case && c.side === 'astylar');
    data.styles[data.variants[c.variant].nodes.find(n => n.authored?.id === 'bottom-sheet-panel').style].value.width = '999px';
  }]) {
    const altered = structuredClone(inventory); mutate(altered);
    assert.throws(() => proveModalPositionInspection(firstEntry, ...modalInventoryTrees(altered, first.case), 'bottom-sheet-panel'));
  }
  for (const { row, cases } of matched.values()) {
    assert.equal(row.occurrences, cases.length); assert.deepEqual(row.cases, cases.slice(0, 12));
  }
  // The container scope differs from the direct inner-label token scope.
  // This join does not reuse the label's font/color authoring classification,
  // nor establish output parity or change canonical attribution.
});

test('nine dialog scalar groups reuse original typography proofs with matching owner and declaration stage', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const cases = JSON.parse(bytes).interactions.filter(e => e.family === 'dialog' &&
    e.styleInputs.some(i => i.id === 'dialog-copy')).map(e => ({ ...e, kind: 'interaction' }));
  assert.equal(cases.length, 32);
  const inventory = collectFullTreeInventory(cases);
  assert.deepEqual(inventory.errors, []);
  const control = collectControlTypographyEvidence(cases, inventory);
  const retained = collectRetainedTypographyEvidence(cases, inventory, control);
  const compact = queryFindings('artifacts/material-parity/working-audit', 'dialog', overlaySurfacePredecessor);
  const keys = cases.map(e => `interaction:dialog@${e.profile}/${e.viewport.id}/${e.state}`);
  const join = (element, property, proofRows) => {
    const scalar = compact.filter(r => r.evidence.section === 'discrepancies' && r.element === element && r.property === property);
    assert.equal(scalar.length, 1); const row = scalar[0];
    const result = proveDialogScalarTypographyJoin(row, proofRows, inventory, keys);
    assert.equal(result.cases.length, 32); assert.equal(result.inputEquivalent, false);
    assert.equal(result.renderingEquivalent, false);
  };
  let groups = 0;
  for (const [element, properties] of [['dialog-copy', ['fontFamily', 'letterSpacing', 'color']],
    ['dialog-cancel', ['fontFamily', 'letterSpacing']], ['dialog-save', ['fontFamily', 'letterSpacing']],
    ['dialog-title', ['fontFamily', 'color']]]) {
    for (const property of properties) {
      const attribution = !['dialog-copy', 'dialog-title'].includes(element) ? 'reviewed-dialog-action-typography-input'
        : property === 'color' ? 'reviewed-dialog-text-ink-input' : 'reviewed-dialog-text-metric-omission';
      const rows = [...retained.differences, ...control.differences].filter(r => r.element === (element === 'dialog-title' ? 'dialog-title-label' : element) && r.property === property && r.attribution === attribution);
      join(element, property, rows); groups++;
      for (const mutate of [r => r.pop(), r => r.reverse(), r => { r[0].values.reference = 'forged'; },
        r => { r[0].element = 'dialog-title'; }, r => { r[0].attribution = 'unresolved'; }]) {
        const changed = structuredClone(rows); mutate(changed); assert.throws(() => join(element, property, changed));
      }
      if (element === 'dialog-title') {
        const changed = structuredClone(rows); changed[0].reviewEvidence.candidateChain[0].parent = 'unrelated';
        assert.throws(() => join(element, property, changed));
      }
    }
  }
  assert.equal(groups, 9);
  const scalarRows = compact.filter(r => r.evidence.section === 'discrepancies');
  const before = structuredClone(scalarRows), normalize = bindPreciseAuditNormalization();
  const applied = applyDialogScalarTypography(scalarRows, cases, inventory, retained, control, normalize);
  const changed = applied.filter((r, i) => r !== scalarRows[i]);
  assert.equal(changed.length, 9); assert.equal(changed.reduce((n, r) => n + r.occurrences, 0), 288);
  const validate = rows => validateDialogScalarTypography(rows, scalarRows, cases, inventory, retained, control, normalize);
  assert.deepEqual(validate(applied), []);
  assert.deepEqual(validate(JSON.parse(JSON.stringify(applied))), []);
  for (const mutate of [rs => rs.splice(rs.indexOf(rs.find(r => r.attribution === 'reviewed-dialog-scalar-typography-owner')), 1),
    rs => rs.push(rs.find(r => r.attribution === 'reviewed-dialog-scalar-typography-owner')),
    rs => { rs.find(r => r.attribution === 'reviewed-dialog-scalar-typography-owner').reviewEvidence.proofRowsSha256 = 'forged'; },
    rs => { rs.find(r => r.attribution === 'reviewed-dialog-scalar-typography-owner').reviewEvidence.priorMetadata.justification = 'forged'; }]) {
    const altered = structuredClone(applied); mutate(altered); assert.ok(validate(altered).length);
  }
  assert.deepEqual(scalarRows, before);
  for (let i = 0; i < applied.length; i++) {
    if (applied[i] === scalarRows[i]) continue;
    const restored = { ...applied[i] };
    for (const key of ['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']) delete restored[key];
    Object.assign(restored, applied[i].reviewEvidence.priorMetadata);
    assert.deepEqual(restored, scalarRows[i]);
  }
  // In-memory canonical rows carry undefined; JSON/compact rows omit the key.
  const inMemory = scalarRows.map(r => r.astylar === undefined ? { ...r, astylar: undefined } : r);
  assert.equal(applyDialogScalarTypography(inMemory, cases, inventory, retained, control, normalize)
    .filter(r => r.attribution === 'reviewed-dialog-scalar-typography-owner').length, 9);
  for (const mutate of [cs => cs.pop(), cs => cs.push(cs[0]), cs => {
    cs[0].styleInputs.find(i => i.id === 'dialog-title').astylar.fontFamily = 'serif';
  }]) {
    const changedCases = structuredClone(cases); mutate(changedCases);
    assert.throws(() => applyDialogScalarTypography(scalarRows, changedCases, inventory, retained, control, normalize));
  }
  const tracking = compact.filter(r => r.evidence.section === 'discrepancies' &&
    r.element === 'dialog-title' && r.property === 'letterSpacing');
  assert.equal(tracking.length, 1); assert.equal(tracking[0].reference, '0');
  assert.equal(Object.hasOwn(tracking[0], 'astylar'), false);
  const titleComparisons = retained.comparisons.filter(r => r.element === 'dialog-title-label');
  assert.deepEqual(titleComparisons.map(r => r.case), keys);
  for (const comparison of titleComparisons) {
    assert.deepEqual(comparison.properties.letterSpacing, { reference: '0', normal: undefined, effective: undefined, retained: '0' });
    const entry = inventory.cases.find(c => c.case === comparison.case && c.side === 'astylar');
    const nodes = inventory.variants[entry.variant].nodes;
    const label = nodes.find(n => n.key === comparison.astylarNode);
    const owner = nodes.find(n => n.key === label.parent);
    assert.equal(owner.authored.id, 'dialog-title');
    for (const node of [label, owner]) for (const stage of ['normalStyle', 'interactionStyle'])
      assert.equal(Object.hasOwn(inventory.styles[node[stage]].value, 'letterSpacing'), false);
  }
  // Scalar tracking compares a normalized native computed value with omitted
  // local declarations; retained tracking compares two resolved zero values.
  // This explains the inventory difference, not token-input or raster parity.
});

test('overlay surface proposal replays 13 complete predecessors and preserves unrelated rows', async () => {
  const review = await collectOverlaySurfaceReview();
  assert.deepEqual(review, JSON.parse(readFileSync('docs/material-overlay-surface-review.json')));
  const directory = 'artifacts/material-parity/working-audit', rows = [];
  for (const group of review.groups) {
    const compact = queryFindings(directory, group.family, overlaySurfacePredecessor)
      .find(r => r.evidence.completeRowSha256 === group.reviewEvidence.originalCompleteRowSha256);
    assert.ok(compact);
    rows.push(await loadFindingEvidence(directory, group.family, compact.id, overlaySurfacePredecessor));
  }
  const unrelated = { family: 'unrelated', property: 'untouched', custom: { raw: true } };
  rows.splice(3, 0, unrelated);
  const before = structuredClone(rows), output = applyOverlaySurfaceRows(rows, review);
  const parityPath = 'artifacts/material-parity/current-ancestry-audit/latest-report.json';
  const evidence = collectOverlaySurfaceAuditInputs(JSON.parse(readFileSync(parityPath)), { parityPath });
  assert.equal(evidence.binding.status, 'bound', evidence.binding.error);
  assert.deepEqual(applyOverlaySurfaceAuditRows(rows, evidence), output);
  assert.deepEqual(validateOverlaySurfaceAuditClassifications(evidence, output), []);
  assert.equal(collectOverlaySurfaceAuditInputs({ results: [], interactions: [] }, { parityPath }).binding.status, 'invalid');
  assert.equal(collectOverlaySurfaceAuditInputs({}, {}).binding.status, 'unbound');
  const forged = structuredClone(evidence); forged.review.groups[0].reviewedCases.pop();
  assert.ok(validateOverlaySurfaceAuditInputs(forged).length);
  assert.throws(() => applyOverlaySurfaceAuditRows(rows, forged));
  assert.deepEqual(rows, before); assert.equal(output.length, rows.length);
  assert.equal(output[3], unrelated);
  for (let index = 0; index < output.length; index++) {
    if (index === 3) continue;
    const restored = structuredClone(output[index]);
    for (const p of restored.reviewEvidence.priorMetadata) {
      if (p.present) restored[p.field] = p.value; else delete restored[p.field];
    }
    assert.deepEqual(restored, before[index]);
  }
  for (const mutate of [r => r.pop(), r => r.push(r[0]), r => { r[0].occurrences++; },
    r => { r[0].unreviewedRawField = true; }]) {
    const changed = structuredClone(rows); mutate(changed);
    assert.throws(() => applyOverlaySurfaceRows(changed, review));
  }
  assert.throws(() => applyOverlaySurfaceRows(output, review), 'cannot apply twice');
  const receipt = review.groups.find(g => g.family === 'snack-bar').reviewEvidence.observations[0].inputTrees;
  const originals = ['reference', 'astylar'].map(side => JSON.parse(readFileSync(receipt[side].file)));
  for (const mutate of [
    a => { a.nodes.find(n => n.authored?.id === 'snack-bar-surface').authored.style = { minWidth: '344px' }; },
    a => { a.rules.push({ selector: '#snack-bar-surface:hover', background: '#ffffff' }); },
    a => { a.rules.push({ selector: ':unknown()', all: 'initial' }); },
  ]) {
    const changed = structuredClone(originals); mutate(changed[1]);
    assert.throws(() => proveSnackbarSurfaceRequests(...changed));
  }
});

test('all 34 retained snackbar rasters contain the surface inside the viewport', () => {
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(hash(bytes), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const cases = JSON.parse(bytes).interactions.filter(e => e.family === 'snack-bar' && e.overlayPlacement?.targetId);
  assert.equal(cases.length, 34);
  const receipts = [];
  for (const entry of cases) {
    const file = entry.inputTrees.astylar.file.replace('astylar-input-tree.json', 'astylar.png');
    const image = readFileSync(file), png = PNG.sync.read(image);
    receipts.push({ file, sha256: hash(image) });
    const dpr = entry.viewport.deviceScaleFactor, box = entry.overlayPlacement.astylar;
    assert.equal(png.width, entry.viewport.width * dpr);
    assert.equal(png.height, entry.viewport.height * dpr);
    // A text-free interior strip proves actual surface paint, not just an
    // existing semantic owner or a projected rectangle. No text/parity claim.
    const left = Math.ceil((box.x + 8) * dpr), right = Math.floor((box.x + box.width - 8) * dpr);
    const top = Math.ceil((box.y + box.height - 8) * dpr), bottom = Math.floor((box.y + box.height - 4) * dpr);
    assert.ok(left >= 0 && right <= png.width && top >= 0 && bottom <= png.height);
    assert.ok(right > left && bottom > top);
    const paintedFraction = pixels => {
      let painted = 0, total = 0;
      for (let y = top; y < bottom; y++) for (let x = left; x < right; x++) {
        const i = (y * png.width + x) * 4; total++;
        if ([50, 47, 53, 255].every((v, channel) => pixels[i + channel] === v)) painted++;
      }
      return painted / total;
    };
    assert.ok(paintedFraction(png.data) > .98, file);
    assert.equal(paintedFraction(Buffer.alloc(png.data.length, 255)), 0, 'blank paint must fail despite unchanged geometry');
  }
  assert.equal(hash(JSON.stringify(receipts)), '52f3cf2cd4c63a1e352cb8445f2654b66a99d633072c9e3700492264179574f5');
});

test('retained open overlays do not reproduce off-screen projected placement', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'),
    'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const capture = JSON.parse(bytes);
  const entries = [...capture.results, ...capture.interactions];
  for (const [family, target, count] of [
    ['snack-bar', 'snack-bar-surface', 34],
    ['tooltip', 'tooltip-popup', 18],
    ['bottom-sheet', 'bottom-sheet-panel', 25],
  ]) {
    const cases = entries.filter(e => e.family === family && e.overlayPlacement?.targetId);
    assert.equal(cases.length, count);
    let maximumProjectedDelta = 0;
    for (const entry of cases) {
      const p = entry.overlayPlacement;
      assert.equal(p.targetId, target);
      assert.equal(p.withinCanvas, true);
      // Check recorded coordinates directly: the historical `matches` flag
      // does not require all four rectangle values to agree for every family.
      for (const key of ['x', 'y', 'width', 'height']) {
        assert.ok(Number.isFinite(p.astylar[key]) && Number.isFinite(p.reference[key]));
        const delta = Math.abs(p.astylar[key] - p.reference[key]);
        maximumProjectedDelta = Math.max(maximumProjectedDelta, delta);
        assert.ok(delta < 0.04, `${family}/${entry.profile}/${entry.viewport.id}/${entry.state}/${key}: ${delta}`);
      }
    }
    console.log(JSON.stringify({ family, retainedOpenStates: count, maximumProjectedDelta,
      usedCssBoxesProven: false, paintVisibilityProven: false, inputEquivalenceProven: false }));
  }
});

test('overlay position tokens belong to different compositions in all 59 original states', () => {
  const readBound = (file, digest) => {
    const bytes = readFileSync(file);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), digest);
    return JSON.parse(bytes);
  };
  const population = readBound('docs/material-position-input-population.json',
    '71ed7689534232fe8c167532455abbf9510e89ae69b4c918d9dc7f40d3d346ff');
  const groups = population.groups.filter(g => g.reference === 'absolute' && g.candidate === 'fixed');
  assert.deepEqual(groups.map(g => [g.element, g.occurrences]),
    [['bottom-sheet-overlay', 25], ['snack-bar-overlay', 34]]);
  for (const group of groups) {
    assert.equal(group.observations.length, group.occurrences);
    assert.equal(new Set(group.observations.map(o => o.case)).size, group.occurrences);
    for (const observation of group.observations) {
      const r = readBound(observation.inputTrees.reference.file, observation.inputTrees.reference.sha256);
      const a = readBound(observation.inputTrees.astylar.file, observation.inputTrees.astylar.sha256);
      const mapping = resolveGeneratedReferenceNode(r, group.element, group.family);
      assert.equal(mapping.status, 'mapped', observation.case);
      const reference = r.styles[mapping.styleIndex];
      const parent = r.nodes.find(n => n.key === mapping.node.parent);
      assert.ok(parent.attributes.class.split(/\s+/).includes('cdk-overlay-container'));
      const parentStyle = r.styles[parent.style];
      assert.equal(parentStyle.position, 'fixed');
      assert.equal(parentStyle.transform, 'none');
      assert.equal(reference.position, 'absolute');
      assert.deepEqual([reference.width, reference.height], [parentStyle.width, parentStyle.height]);
      assert.deepEqual([reference.display, reference.flexDirection, reference.justifyContent,
        reference.alignItems, reference.padding], ['flex', 'row', 'center', 'flex-end', '0px']);
      const owners = a.nodes.filter(n => n.authored?.id === group.element);
      assert.equal(owners.length, 1);
      const owner = owners[0], candidateParent = a.nodes.find(n => n.key === owner.parent);
      assert.equal(candidateParent.authored.id, `${group.family}-root`);
      assert.equal(candidateParent.resolvedStyle.position, 'relative');
      for (const stage of ['normalResolvedStyle', 'resolvedStyle', 'interactionResolvedStyle']) {
        const style = owner[stage];
        assert.deepEqual([style.position, style.width, style.height, style.display,
          style.flexDirection, style.justifyContent, style.alignItems, style.padding],
        ['fixed', '100%', '100%', 'flex', 'column', 'flex-end', 'center',
          group.family === 'snack-bar' ? '0 0 8px' : '0']);
      }
    }
  }
  // No candidate used box or projection is captured here. A fixed viewport
  // wrapper containing an absolute child cannot be compared to a flattened
  // fixed wrapper by position tokens alone. Axis/padding differences remain.
  console.log(JSON.stringify({ overlayStates: 59, referenceFixedParent: 59,
    candidateFixedOwner: 59, flowAxisSubstitutions: 59, snackPaddingSubstitutions: 34,
    inputEquivalenceProven: false, rendererCauseProven: false }));
});
test('modal inspection authenticates all nine generated owner groups', () => {
  assert.deepEqual(collectModalPositionInspection(), JSON.parse(readFileSync('docs/material-modal-position-inspection.json')));
});

test('all 34 retained snackbars substitute surface sizing and paint requests', async () => {
  const readBound = receipt => {
    const bytes = readFileSync(receipt.file);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), receipt.sha256);
    return JSON.parse(bytes);
  };
  const population = readBound({ file: 'docs/material-position-input-population.json',
    sha256: '71ed7689534232fe8c167532455abbf9510e89ae69b4c918d9dc7f40d3d346ff' });
  const group = population.groups.find(g => g.element === 'snack-bar-overlay');
  assert.equal(group.observations.length, 34);
  assert.equal(new Set(group.observations.map(o => o.case)).size, 34);
  for (const observation of group.observations) {
    const r = readBound(observation.inputTrees.reference), a = readBound(observation.inputTrees.astylar);
    proveSnackbarSurfaceRequests(r, a);
  }
  // Join authenticated complete rows, not just their representative first 12
  // cases. Full membership is independently supplied by the 34 paired trees.
  const directory = 'artifacts/material-parity/working-audit';
  const snapshot = JSON.parse(readFileSync(`${directory}/current.json`));
  assert.equal(snapshot.generation, JSON.parse(readFileSync('docs/material-input-equivalence-audit.json')).compressedSha256);
  const expected = {
    backgroundColor: ['rgba(50,48,51,1)', 'rgba(50,47,53,1)'],
    color: ['rgba(245,239,244,1)', 'rgba(255,255,255,1)'],
    minWidth: ['344px'], maxWidth: ['672px'],
    paddingLeft: ['0', '18px'], paddingRight: ['8px', '18px'],
    justifyContent: ['flex-start', 'space-between'],
    boxShadow: ['rgba(0,0,0,0.2) 0 3px 5px -1px,rgba(0,0,0,0.14) 0 6px 10px 0,rgba(0,0,0,0.12) 0 1px 18px 0'],
  };
  const rows = queryFindings(directory, 'snack-bar', snapshot).filter(row =>
    row.evidence.section === 'discrepancies' && row.element === 'snack-bar-surface' && Object.hasOwn(expected, row.property));
  assert.equal(rows.length, 8);
  assert.equal(new Set(rows.map(row => row.property)).size, 8);
  const cases = group.observations.map(o => o.case);
  for (const compact of rows) {
    const row = await loadFindingEvidence(directory, 'snack-bar', compact.id, snapshot);
    const values = expected[row.property];
    assert.equal(row.reference, values[0]);
    assert.equal(Object.hasOwn(row, 'astylar'), values.length === 2, 'preserve candidate omission');
    if (values.length === 2) assert.equal(row.astylar, values[1]);
    assert.equal(row.occurrences, cases.length);
    assert.deepEqual(row.cases, cases.slice(0, 12));
    assert.deepEqual(row.states, [...new Set(cases.map(key => key.split('/').at(-1)))]);
  }
  // Historical input substitutions, not a proof of missing paint or current
  // runtime acceptance. Do not infer that equal short-content geometry excuses them.
});

test('all retained sheets substitute fixed candidate height for intrinsic reference list sizing', () => {
  const report = JSON.parse(readFileSync('docs/material-modal-position-inspection.json'));
  const group = report.groups.find(g => g.element === 'bottom-sheet-panel');
  assert.equal(group.observations.length, 25);
  let compact = 0;
  for (const observation of group.observations) {
    const receipt = observation.inputTrees.reference, bytes = readFileSync(receipt.file);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), receipt.sha256);
    const tree = JSON.parse(bytes);
    const panel = tree.nodes.find(n => n.key === observation.proof.mapping.referenceNode);
    assert.equal(panel.type, 'mat-bottom-sheet-container');
    const active = panel.rules.map(i => tree.rules[i]).filter(rule => rule.active);
    assert.ok(active.length > 0);
    for (const declarations of [...active.map(rule => rule.declarations), panel.inline]) {
      assert.equal(Object.hasOwn(declarations, 'width'), false);
      assert.equal(Object.hasOwn(declarations, 'height'), false);
    }
    const declarations = Object.assign({}, ...active.map(rule => rule.declarations));
    assert.equal(declarations['box-sizing'].value, 'border-box');
    assert.equal(declarations['padding-top'].value, '8px');
    assert.equal(declarations['padding-bottom'].value, '8px');
    assert.equal(declarations['max-height'].value, '80vh');
    if (declarations['min-width'].value === '100vw') compact++;
    else {
      assert.equal(declarations['min-width'].value, '512px');
      assert.equal(declarations['max-width'].value, 'calc(-256px + 100vw)');
    }
    const lists = tree.nodes.filter(n => n.parent === panel.key && n.type === 'mat-nav-list');
    assert.equal(lists.length, 1);
    assert.equal(tree.styles[lists[0].style].padding, '8px 0px');
    assert.deepEqual(observation.proof.candidate.style.height, { present: true, value: '128px' });
  }
  assert.equal(compact, 1);
});
test('modal inspection refuses inconsistent scalar, style-stage, alias and owner data', () => {
  const report = JSON.parse(readFileSync('docs/material-modal-position-inspection.json'));
  const group = report.groups.find(g => g.element === 'dialog-panel'), o = group.observations[0];
  const capture = JSON.parse(readFileSync(report.capture.file));
  const [kind, suffix] = o.case.split(':');
  const entry = (kind === 'static' ? capture.results : capture.interactions).find(e =>
    `${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}` === suffix);
  assert.ok(entry);
  for (const mutate of [
    (e) => { e.styleInputs.find(i => i.id === group.element).reference.position = 'static'; },
    (e, r) => { r.nodes.find(n => n.key === o.proof.mapping.referenceNode).attributes.id = group.element; },
    (e, r, a) => { a.nodes.find(n => n.authored?.id === group.element).normalResolvedStyle.position = 'relative'; },
    (e, r, a) => { a.nodes.find(n => n.authored?.id === group.element).parent = 'missing'; },
  ]) {
    const e = structuredClone(entry), trees = ['reference', 'astylar'].map(s => JSON.parse(readFileSync(o.inputTrees[s].file)));
    mutate(e, ...trees); assert.throws(() => proveModalPositionInspection(e, ...trees, group.element));
  }
});
