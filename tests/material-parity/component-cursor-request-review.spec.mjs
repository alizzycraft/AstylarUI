import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { queryFindings, loadFindingEvidence } from '../../scripts/audit-findings-store.mjs';
import { collectFullTreeInventory } from './input-equivalence-audit.mjs';
import { bindPreciseAuditNormalization } from './audit-normalization-contracts.mjs';
import { modalInventoryTrees } from './modal-position-inspection.mjs';
import { applyExplicitComponentCursors, proveExplicitComponentCursor, validateComponentCursorReviews } from './component-cursor-request-review.mjs';

test('switch cursor owner review conserves the mixed enabled and disabled population', async () => {
  const snapshot = { generation: '90c59d984b2a021384f07da008395cfd6dbea59497f27190d0554b4a763767a3',
    indexSha256: '3a8a22a1dae2fd7dab79fd6fac7334b649ab71a6171198dbd658e424ab4800f2' };
  const compact = queryFindings('artifacts/material-parity/working-audit', 'slide-toggle', snapshot)
    .filter(r => r.evidence.section === 'discrepancies' && r.property === 'cursor' && !r.attribution && r.element === 'slide-toggle-primary');
  assert.equal(compact.length, 1);
  const rows = await loadFindingEvidence('artifacts/material-parity/working-audit', 'slide-toggle', compact.map(r => r.id), snapshot);
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const capture = JSON.parse(bytes), cases = [...capture.results.map(c => ({ ...c, kind:'static' })),
    ...capture.interactions.map(c => ({ ...c, kind:'interaction' }))].filter(c => c.family === 'slide-toggle');
  assert.equal(cases.length, 68);
  const inventory = collectFullTreeInventory(cases), normalize = bindPreciseAuditNormalization();
  const original = structuredClone(rows), applied = applyExplicitComponentCursors(rows, cases, inventory, normalize);
  assert.deepEqual(rows, original); assert.equal(applied.length, 1);
  const row = applied[0], observations = row.reviewEvidence.observations;
  assert.equal(row.classification, 'parity-harness-defect'); assert.equal(row.reviewedCases.length, 68);
  assert.equal(observations.filter(p => p.disabledInputDifference).length, 8);
  assert.equal(observations.filter(p => !p.disabledInputDifference && p.nativeControlCursor === p.candidateCursor).length, 60);
  assert.ok(observations.every(p => p.actualHoverCursorVerified === false && !p.candidatePointerEventsPresent));
  const restored = structuredClone(row), prior = restored.reviewEvidence.priorMetadata;
  assert.equal(row.reviewEvidence.originalRowSha256, createHash('sha256').update(JSON.stringify(rows[0])).digest('hex'));
  assert.equal(Object.hasOwn(prior, 'attribution'), false);
  for (const key of ['classification','attribution','justification','recommendedOwner','reviewEvidence','reviewedCases']) delete restored[key];
  Object.assign(restored, prior); assert.deepEqual(restored, rows[0]);
  assert.deepEqual(validateComponentCursorReviews(applied, rows, cases, inventory, normalize), []);
  const entry = cases.find(c => c.state === 'disabled');
  const trees = modalInventoryTrees(inventory, `interaction:slide-toggle@${entry.profile}/${entry.viewport.id}/disabled`);
  for (const mutate of [
    ([r]) => { r.nodes.find(n => n.type === 'button' && n.attributes?.role === 'switch').attributes.role = 'button'; },
    ([,a]) => { a.nodes.find(n => n.authored?.id === 'slide-toggle-primary').authored.ariaDisabled = false; },
    ([,a]) => { a.nodes.find(n => n.authored?.id === 'slide-toggle-primary').normalResolvedStyle.pointerEvents = 'none'; },
    ([,a]) => { a.rules.find(r => r.selector === '#slide-toggle-primary').cursor = 'default'; },
  ]) {
    const changed = structuredClone(trees); mutate(changed);
    assert.throws(() => proveExplicitComponentCursor(entry, ...changed, 'slide-toggle-primary'));
  }
  assert.throws(() => applyExplicitComponentCursors(rows, cases.filter(c => c !== entry), inventory, normalize));
  const forged = structuredClone(applied); forged[0].reviewEvidence.observations[0].actualHoverCursorVerified = true;
  assert.equal(validateComponentCursorReviews(forged, rows, cases, inventory, normalize).length, 1);
});

test('expansion cursor owner review conserves panel and disabled-title populations without rewriting raw values', async () => {
  const snapshot = { generation: '90c59d984b2a021384f07da008395cfd6dbea59497f27190d0554b4a763767a3',
    indexSha256: '3a8a22a1dae2fd7dab79fd6fac7334b649ab71a6171198dbd658e424ab4800f2' };
  const compact = queryFindings('artifacts/material-parity/working-audit', 'expansion', snapshot)
    .filter(r => r.evidence.section === 'discrepancies' && r.property === 'cursor' && !r.attribution &&
      ['expansion-primary','expansion-title'].includes(r.element));
  assert.equal(compact.length, 2);
  const rows = await loadFindingEvidence('artifacts/material-parity/working-audit', 'expansion', compact.map(r => r.id), snapshot);
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const capture = JSON.parse(bytes), cases = [...capture.results.map(c => ({ ...c, kind:'static' })),
    ...capture.interactions.map(c => ({ ...c, kind:'interaction' }))].filter(c => c.family === 'expansion');
  assert.equal(cases.length, 68);
  const inventory = collectFullTreeInventory(cases), normalize = bindPreciseAuditNormalization();
  for (const entry of cases) {
    const key = `${entry.kind}:expansion@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`;
    const adapted = modalInventoryTrees(inventory, key)[1], original = JSON.parse(readFileSync(entry.inputTrees.astylar.file));
    for (const node of original.nodes.filter(n => n.retainedText))
      assert.deepEqual(adapted.nodes.find(n => n.key === node.key).retainedText, node.retainedText);
  }
  const original = structuredClone(rows), applied = applyExplicitComponentCursors(rows, cases, inventory, normalize);
  assert.deepEqual(rows, original);
  const primary = applied.find(r => r.element === 'expansion-primary'), title = applied.find(r => r.element === 'expansion-title');
  assert.equal(primary.reviewedCases.length, 68); assert.equal(title.reviewedCases.length, 8);
  assert.equal(primary.classification, 'parity-harness-defect'); assert.equal(title.classification, 'application-plugin-authoring-defect');
  assert.equal(primary.reviewEvidence.observations.filter(p => p.mapping.headerCursor.unequal).length, 8);
  assert.equal(primary.reviewEvidence.observations.filter(p => !p.mapping.headerCursor.unequal).length, 60);
  for (let i = 0; i < rows.length; i++) {
    const restored = structuredClone(applied[i]), prior = restored.reviewEvidence.priorMetadata;
    assert.equal(restored.reviewEvidence.originalRowSha256, createHash('sha256').update(JSON.stringify(rows[i])).digest('hex'));
    assert.equal(Object.hasOwn(prior, 'attribution'), false);
    for (const key of ['classification','attribution','justification','recommendedOwner','reviewEvidence','reviewedCases']) delete restored[key];
    Object.assign(restored, prior); assert.deepEqual(restored, rows[i]);
  }
  assert.ok(title.reviewEvidence.observations.every(p => p.mapping.state.disabled && p.actualHoverCursorVerified === false &&
    p.titleAncestry.referenceParentCursor === 'auto' && p.titleAncestry.candidateParentCursor === 'pointer'));
  assert.deepEqual(validateComponentCursorReviews(applied, rows, cases, inventory, normalize), []);
  const entry = cases.find(c => c.state === 'disabled');
  const trees = modalInventoryTrees(inventory, `interaction:expansion@${entry.profile}/${entry.viewport.id}/disabled`);
  for (const mutate of [
    ([r]) => { r.nodes.find(n => n.type === 'mat-expansion-panel-header').attributes.role = 'panel'; },
    ([,a]) => { a.nodes.find(n => n.authored?.id === 'expansion-primary').authored.ariaDisabled = false; },
    ([,a]) => { a.rules.find(r => r.selector === '.expansion-trigger').cursor = 'auto'; },
    ([,a]) => { a.nodes.find(n => n.authored?.id === 'expansion-title').normalResolvedStyle.cursor = 'auto'; },
    ([,a]) => { a.rules.push({ selector: '.expansion-title', cursor: 'pointer' }); },
  ]) {
    const changed = structuredClone(trees); mutate(changed);
    assert.throws(() => proveExplicitComponentCursor(entry, ...changed, 'expansion-title'));
  }
  assert.throws(() => applyExplicitComponentCursors(rows, cases.filter(c => c !== entry), inventory, normalize));
  const forged = structuredClone(applied); forged[0].reviewEvidence.observations[0].mapping.rendererCauseProven = true;
  assert.equal(validateComponentCursorReviews(forged, rows, cases, inventory, normalize).length, 1);
});

test('disabled range cursor review conserves sixteen original owner observations without claiming hit suppression', async () => {
  const snapshot = { generation: '90c59d984b2a021384f07da008395cfd6dbea59497f27190d0554b4a763767a3',
    indexSha256: '3a8a22a1dae2fd7dab79fd6fac7334b649ab71a6171198dbd658e424ab4800f2' };
  const compact = queryFindings('artifacts/material-parity/working-audit', 'slider', snapshot)
    .filter(row => row.evidence.section === 'discrepancies' && row.property === 'cursor' && !row.attribution &&
      ['slider-primary', 'slider-start'].includes(row.element));
  assert.equal(compact.length, 2);
  const rows = await loadFindingEvidence('artifacts/material-parity/working-audit', 'slider', compact.map(row => row.id), snapshot);
  const source = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(source).digest('hex'), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const capture = JSON.parse(source), cases = [...capture.results.map(c => ({ ...c, kind: 'static' })),
    ...capture.interactions.map(c => ({ ...c, kind: 'interaction' }))].filter(c => c.family === 'slider');
  const inventory = collectFullTreeInventory(cases), normalize = bindPreciseAuditNormalization();
  const original = structuredClone(rows), applied = applyExplicitComponentCursors(rows, cases, inventory, normalize);
  assert.deepEqual(rows, original);
  for (let i = 0; i < rows.length; i++) {
    const row = applied[i]; assert.equal(row.attribution, 'reviewed-disabled-range-cursor-request');
    assert.equal(row.classification, 'application-plugin-authoring-defect');
    assert.equal(row.reviewedCases.length, 8); assert.equal(row.reviewEvidence.observations.length, 8);
    assert.equal(row.reviewEvidence.originalRowSha256, createHash('sha256').update(JSON.stringify(rows[i])).digest('hex'));
    assert.equal(Object.hasOwn(row.reviewEvidence.priorMetadata, 'attribution'), false);
    const restored = structuredClone(row), prior = restored.reviewEvidence.priorMetadata;
    for (const key of ['classification','attribution','justification','recommendedOwner','reviewEvidence','reviewedCases']) delete restored[key];
    Object.assign(restored, prior); assert.deepEqual(restored, rows[i]);
    for (const proof of row.reviewEvidence.observations) {
      assert.equal(proof.disabledRange, true); assert.equal(proof.actualHoverCursorVerified, false);
      assert.equal(proof.nativeCursor, 'auto'); assert.equal(proof.candidateCursor, 'pointer');
      assert.equal(proof.candidatePointerEventsPresent, false);
    }
  }
  assert.deepEqual(validateComponentCursorReviews(applied, rows, cases, inventory, normalize), []);
  const entry = cases.find(c => c.state === 'disabled'), key = `interaction:slider@${entry.profile}/${entry.viewport.id}/disabled`;
  const trees = modalInventoryTrees(inventory, key);
  const check = ([r,a]) => proveExplicitComponentCursor(entry, r, a, 'slider-primary');
  for (const mutate of [
    ([r]) => { delete r.nodes.find(n => n.attributes?.id === 'slider-primary').attributes.disabled; },
    ([r]) => { r.rules.find(rule => rule.selector === '.mat-mdc-slider.mdc-slider--disabled .mdc-slider__input').declarations.cursor.value = 'pointer'; },
    ([,a]) => { a.nodes.find(n => n.authored?.id === 'slider-primary').authored.disabled = false; },
    ([,a]) => { a.nodes.find(n => n.authored?.id === 'slider-primary').normalResolvedStyle.pointerEvents = 'none'; },
    ([,a]) => { a.rules.find(rule => rule.selector === '.range-layer').cursor = 'auto'; },
  ]) {
    const changed = structuredClone(trees); mutate(changed); assert.throws(() => check(changed));
  }
  assert.throws(() => applyExplicitComponentCursors(rows, cases.filter(c => c !== entry), inventory, normalize));
  const forged = structuredClone(applied); forged[0].reviewEvidence.observations[0].actualHoverCursorVerified = true;
  assert.equal(validateComponentCursorReviews(forged, rows, cases, inventory, normalize).length, 1);
});

test('all 19 unresolved cursor groups bind 763 observations without claiming Material hover behavior', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const captured = JSON.parse(bytes), cases = [...captured.results.map(c => ({ ...c, kind: 'static' })),
    ...captured.interactions.map(c => ({ ...c, kind: 'interaction' }))];
  const inventory = collectFullTreeInventory(cases), normalize = bindPreciseAuditNormalization();
  const snapshot = { generation: '5998d72bd0310ff4ddd8d3a44954fa5ade6655abb506f2bb85baa4935c3792d0',
    indexSha256: '8882ab9d062d52eeec3dcbadb1d72ee8518f3bb8bda8d8f4df7cc4466af89eef' };
  const allRows = ['button', 'checkbox', 'slider', 'core', 'toolbar', 'card', 'menu', 'bottom-sheet', 'dialog', 'snack-bar', 'tooltip', 'radio', 'slide-toggle']
    .flatMap(f => queryFindings('artifacts/material-parity/working-audit', f, snapshot))
    .filter(r => r.evidence.section === 'discrepancies');
  // Keep the original unresolved19 population separate from the two omitted-
  // attribution range rows now covered by the complete-row test above.
  const additionalRangeRows = allRows.filter(r => r.family === 'slider' && r.property === 'cursor' &&
    ['slider-primary', 'slider-start'].includes(r.element) && !Object.hasOwn(r, 'attribution'));
  assert.equal(additionalRangeRows.length, 2);
  assert.equal(additionalRangeRows.reduce((sum, row) => sum + row.occurrences, 0), 16);
  const additionalSwitchRows = allRows.filter(r => r.family === 'slide-toggle' && r.property === 'cursor' &&
    r.element === 'slide-toggle-primary' && !Object.hasOwn(r, 'attribution'));
  assert.equal(additionalSwitchRows.length, 1);
  assert.equal(additionalSwitchRows[0].occurrences, 68);
  const rows = allRows.filter(row => !additionalRangeRows.includes(row) && !additionalSwitchRows.includes(row));
  const reviewed = applyExplicitComponentCursors(rows, cases, inventory, normalize);
  const changed = reviewed.filter((r, i) => r !== rows[i]);
  assert.equal(changed.length, 19); assert.equal(changed.reduce((sum, r) => sum + r.occurrences, 0), 763);
  const labels = changed.filter(r => r.attribution === 'reviewed-choice-label-cursor-ancestry-substitution');
  assert.equal(labels.length, 4); assert.equal(labels.reduce((sum, r) => sum + r.occurrences, 0), 152);
  const defaults = changed.filter(r => r.attribution === 'reviewed-dialog-button-cursor-default-policy');
  assert.equal(defaults.length, 2); assert.equal(defaults.reduce((sum, r) => sum + r.occurrences, 0), 56);
  const buttons = changed.filter(r => r.attribution === 'reviewed-button-cursor-request-substitution');
  assert.equal(buttons.length, 10); assert.equal(buttons.reduce((sum, r) => sum + r.occurrences, 0), 417);
  const metadata = new Set(['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']);
  const raw = r => Object.fromEntries(Object.entries(r).filter(([k]) => !metadata.has(k)));
  reviewed.forEach((r, i) => {
    assert.deepEqual(raw(r), raw(rows[i]));
    if (!changed.includes(r)) assert.deepEqual(r, rows[i]);
  });
  for (const row of changed) {
    assert.equal(row.classification, defaults.includes(row) ? 'intentional-documented-limitation' : 'application-plugin-authoring-defect');
    assert.equal(row.reviewEvidence.inputEquivalent, false); assert.equal(row.reviewEvidence.renderingEquivalent, false);
    assert.ok(row.reviewEvidence.observations.every(p => p.actualHoverCursorVerified === false));
    const key = row.reviewedCases[0], entry = cases.find(c => `${c.kind}:${c.family}@${c.profile}/${c.viewport.id}${c.state ? '/' + c.state : ''}` === key);
    const [reference, candidate] = modalInventoryTrees(inventory, key);
    const owner = row.reviewEvidence.observations[0];
    const prove = (r, a) => proveExplicitComponentCursor(entry, r, a, row.element, owner.defaultPolicyEvidence);
    assert.deepEqual(prove(reference, candidate), owner);
    const missing = structuredClone(reference);
    if (owner.nativeAuthorCursorOmitted) missing.nodes.find(n => n.key === owner.referenceNode).inline.cursor = { value: 'pointer', important: false };
    else missing.nodes.find(n => n.key === owner.referenceNode).rules = [];
    assert.throws(() => prove(missing, candidate));
    const changedCandidate = structuredClone(candidate);
    changedCandidate.rules.push({ selector: '#' + row.element, cursor: 'crosshair' });
    assert.throws(() => prove(reference, changedCandidate));
    const changedAncestor = structuredClone(candidate);
    changedAncestor.nodes.find(n => n.authored?.id === 'page').authored.style = { cursor: 'pointer' };
    assert.throws(() => prove(reference, changedAncestor));
    const wrongStage = structuredClone(candidate);
    wrongStage.nodes.find(n => n.key === owner.astylarNode).normalResolvedStyle.cursor = 'crosshair';
    assert.throws(() => prove(reference, wrongStage));
    if (labels.includes(row)) {
      const changedParent = structuredClone(reference);
      changedParent.nodes.find(n => n.key === owner.nativePath[1].node).type = 'div';
      assert.throws(() => prove(changedParent, candidate));
      const wrongParentStage = structuredClone(candidate);
      wrongParentStage.nodes.find(n => n.key === owner.candidatePath[1].node).normalResolvedStyle.cursor = 'default';
      assert.throws(() => prove(reference, wrongParentStage));
    }
    if (defaults.includes(row)) assert.throws(() => proveExplicitComponentCursor(entry, reference, candidate, row.element));
  }
  const lost = cases.filter(c => c !== cases.find(c => c.family === 'slider'));
  assert.throws(() => applyExplicitComponentCursors(rows, lost, inventory, normalize));
  assert.deepEqual(validateComponentCursorReviews(reviewed, rows, cases, inventory, normalize), []);
  assert.equal(validateComponentCursorReviews(reviewed.filter(r => r !== changed[0]), rows, cases, inventory, normalize).length, 1);
  const forged = structuredClone(reviewed);
  forged.find(r => r.attribution === 'reviewed-dialog-button-cursor-default-policy').reviewEvidence.renderingEquivalent = true;
  assert.equal(validateComponentCursorReviews(forged, rows, cases, inventory, normalize).length, 1);
});
