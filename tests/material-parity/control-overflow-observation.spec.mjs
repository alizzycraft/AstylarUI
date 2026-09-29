import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { collectFullTreeInventory } from './input-equivalence-audit.mjs';
import { modalInventoryTrees } from './modal-position-inspection.mjs';
import { bindPreciseAuditNormalization } from './audit-normalization-contracts.mjs';
import { queryFindings } from '../../scripts/audit-findings-store.mjs';
import { clippingOwners, proveControlClippingRequests, applyControlClippingRequests,
  validateControlClippingRequests, proveMappedVisibleOverflow, applyMappedVisibleOverflow,
  validateMappedVisibleOverflow, visibleButtonOwners, proveVisibleButtonOverflowInputs,
  applyVisibleButtonOverflow, validateVisibleButtonOverflow, visibleButtonOverflowAttribution } from './control-overflow-observation.mjs';
import { applySnackbarPositionRequests, validateSnackbarPositionRequests } from './snackbar-position-observation.mjs';
import { proveHeadingVisibleOverflow, applyHeadingVisibleOverflow, validateHeadingVisibleOverflow } from './control-overflow-observation.mjs';
import { proveTabPanelOverflowBoundary, applyTabPanelOverflowBoundary, validateTabPanelOverflowBoundary } from './control-overflow-observation.mjs';
import { proveTableOverflowInputs, applyTableVisibleOverflow, validateTableVisibleOverflow } from './control-overflow-observation.mjs';
import { chromium } from 'playwright-core';
import { PNG } from 'pngjs';
import { proveRemainingControlOverflowInputs, proveControlOverflowOwnerBoundary,
  applyControlOverflowOwnerBoundaries, validateControlOverflowOwnerBoundaries,
  applyRangeVisibleOverflow, validateRangeVisibleOverflow } from './control-overflow-observation.mjs';

test('native range visible overflow preserves outside thumb pixels with clipping sensitivity', async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 240, height: 180 } });
    await page.setContent('<style>body{margin:0;background:white}input{position:absolute;left:60px;top:60px;width:100px;height:10px;margin:0;padding:0;border:0;appearance:none;background:transparent}input::-webkit-slider-runnable-track{height:4px;background:blue}input::-webkit-slider-thumb{appearance:none;width:40px;height:40px;margin-top:-18px;background:red;border:0;border-radius:0}</style><input type=range value=50>');
    const results = [];
    for (const overflow of ['', 'visible', 'hidden', 'clip']) {
      const axes = await page.evaluate(value => {
        const input = document.querySelector('input'); input.style.overflow = value;
        const s = getComputedStyle(input), r = input.getBoundingClientRect();
        return { x: s.overflowX, y: s.overflowY, box: [r.x, r.y, r.width, r.height] };
      }, overflow);
      const png = PNG.sync.read(await page.screenshot()); let red = 0, outside = 0;
      for (let y = 0; y < png.height; y++) for (let x = 0; x < png.width; x++) {
        const i = (y * png.width + x) * 4;
        if (png.data[i] > 240 && png.data[i + 1] < 10 && png.data[i + 2] < 10) {
          red++; if (y < 60 || y >= 70 || x < 60 || x >= 160) outside++;
        }
      }
      results.push({ ...axes, red, outside });
    }
    assert.deepEqual(results[0], { x: 'visible', y: 'visible', box: [60, 60, 100, 10], red: 1600, outside: 1200 });
    assert.deepEqual(results[1], results[0]);
    for (const [i, mode] of [[2, 'hidden'], [3, 'clip']])
      assert.deepEqual(results[i], { ...results[0], x: mode, y: mode, red: 400, outside: 0 });
  } finally { await browser.close(); }
});

test('remaining range and tab overflow inputs retain exact owner boundaries', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const capture = JSON.parse(bytes);
  const owners = { slider: ['slider-start', 'slider-primary', 'slider-visual'], tabs: ['tab-overview', 'tab-activity'] };
  const cases = [...capture.results.map(e => ({ ...e, kind: 'static' })),
    ...capture.interactions.map(e => ({ ...e, kind: 'interaction' }))].filter(e => owners[e.family]);
  const inventory = collectFullTreeInventory(cases), counts = {};
  assert.deepEqual(inventory.errors, []);
  for (const entry of cases) {
    const pair = modalInventoryTrees(inventory,
      `${entry.kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`);
    for (const element of owners[entry.family]) {
      const proof = proveRemainingControlOverflowInputs(entry, ...pair, element);
      assert.equal(proof.initialValueEquivalent, false); assert.equal(proof.renderingEquivalent, false);
      counts[element] = (counts[element] ?? 0) + 1;
      if (counts[element] !== 1) continue;
      for (const mutate of [
        ([r]) => { r.ruleEvidenceComplete = false; },
        ([r]) => { r.styles[r.nodes.find(n => n.key === proof.referenceNode).style].overflowX = 'hidden'; },
        ([, a]) => { a.nodes.find(n => n.key === proof.astylarNode).authored.type = 'div'; },
        ([, a]) => { a.nodes.find(n => n.key === proof.astylarNode).normalResolvedStyle.overflow = 'hidden'; },
        ([, a]) => { a.rules.push({ selector: '#' + element, overflow: 'clip' }); },
      ]) { const altered = structuredClone(pair); mutate(altered); assert.throws(() => proveRemainingControlOverflowInputs(entry, ...altered, element)); }
    }
  }
  assert.deepEqual(counts, { 'slider-start': 78, 'slider-primary': 78, 'slider-visual': 78, 'tab-overview': 70, 'tab-activity': 70 });
  const rows = Object.keys(owners).flatMap(family => queryFindings('artifacts/material-parity/working-audit', family, {
    generation: '8fbd2e22dfd801587ce6c1dce90e6daba668171ae26eae0a9c834142a8bd0a43',
    indexSha256: '6f86d55a6ea6be0f1533ac893579bf517769061ed25a13812b0370c46b7c06e6',
  })).filter(r => r.evidence.section === 'discrepancies').map(({ id, evidence, ...row }) => row);
  const normalize = bindPreciseAuditNormalization(), applied = applyControlOverflowOwnerBoundaries(rows, cases, inventory, normalize);
  const changed = applied.filter((row, i) => row !== rows[i]);
  assert.equal(changed.length, 6); assert.equal(changed.reduce((n, row) => n + row.occurrences, 0), 436);
  const metadata = new Set(['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']);
  const raw = row => Object.fromEntries(Object.entries(row).filter(([key]) => !metadata.has(key)));
  assert.deepEqual(applied.map(raw), rows.map(raw));
  applied.forEach((row, i) => { if (!changed.includes(row)) assert.deepEqual(row, rows[i]); });
  assert.deepEqual(validateControlOverflowOwnerBoundaries(applied, rows, cases, inventory, normalize), []);
  const forged = structuredClone(applied); forged.find(row => row.attribution === 'reviewed-control-overflow-owner-boundary').reviewedCases.pop();
  assert.equal(validateControlOverflowOwnerBoundaries(forged, rows, cases, inventory, normalize).length, 1);
  const entry = cases.find(e => e.family === 'tabs');
  const pair = modalInventoryTrees(inventory, `${entry.kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`);
  const proof = proveControlOverflowOwnerBoundary(entry, ...pair, 'tab-overview');
  const broken = structuredClone(pair); broken[0].nodes.find(n => n.key === proof.nativeControl).attributes.role = 'button';
  assert.throws(() => proveControlOverflowOwnerBoundary(entry, ...broken, 'tab-overview'));
  assert.throws(() => applyControlOverflowOwnerBoundaries(rows, cases.slice(1), inventory, normalize));
  const combined = applyRangeVisibleOverflow(applied, cases, inventory, normalize);
  const rangeChanges = combined.filter((row, i) => row !== applied[i]);
  assert.equal(rangeChanges.length, 4); assert.equal(rangeChanges.reduce((n, row) => n + row.occurrences, 0), 312);
  assert.deepEqual(combined.map(raw), rows.map(raw));
  combined.forEach((row, i) => { if (!rangeChanges.includes(row)) assert.deepEqual(row, applied[i]); });
  assert.deepEqual(combined, applyControlOverflowOwnerBoundaries(applyRangeVisibleOverflow(rows, cases, inventory, normalize), cases, inventory, normalize));
  assert.deepEqual(validateRangeVisibleOverflow(combined, rows, cases, inventory, normalize), []);
  const forgedRange = structuredClone(combined);
  forgedRange.find(row => row.attribution === 'reviewed-range-visible-overflow-initial-value').reviewedCases.pop();
  assert.equal(validateRangeVisibleOverflow(forgedRange, rows, cases, inventory, normalize).length, 1);
  assert.throws(() => applyRangeVisibleOverflow(rows, cases.filter(e => e !== cases.find(e => e.family === 'slider')), inventory, normalize));
});

test('native table omitted overflow retains visible descendants with hidden and ancestor sensitivity', async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
    const result = await page.evaluate(() => {
      const observe = (overflow, ancestorClips = false) => {
        const parent = document.createElement('div'), table = document.createElement('table');
        const cell = table.insertRow().insertCell(), child = document.createElement('div');
        Object.assign(parent.style, { position: 'absolute', left: '20px', top: '20px', width: '60px',
          height: '40px', overflow: ancestorClips ? 'hidden' : 'visible' });
        Object.assign(table.style, { width: '60px', height: '40px', tableLayout: 'fixed', borderSpacing: '0', ...overflow });
        Object.assign(cell.style, { position: 'relative', padding: '0' });
        Object.assign(child.style, { position: 'absolute', left: '0', top: '0', width: '120px', height: '120px', background: 'red' });
        cell.append(child); parent.append(table); document.body.append(parent);
        const style = getComputedStyle(table), rect = table.getBoundingClientRect();
        const observation = { x: style.overflowX, y: style.overflowY, width: rect.width, height: rect.height,
          outsideX: document.elementFromPoint(100, 30) === child,
          outsideY: document.elementFromPoint(30, 90) === child };
        parent.remove(); return observation;
      };
      return { omitted: observe({}), visible: observe({ overflow: 'visible' }),
        hidden: observe({ overflow: 'hidden' }), ancestor: observe({}, true) };
    });
    assert.deepEqual(result.omitted, { x: 'visible', y: 'visible', width: 60, height: 40, outsideX: true, outsideY: true });
    assert.deepEqual(result.visible, result.omitted);
    assert.deepEqual(result.hidden, { ...result.omitted, x: 'hidden', y: 'hidden', outsideX: false, outsideY: false });
    assert.deepEqual(result.ancestor, { ...result.omitted, outsideX: false, outsideY: false });
  } finally { await browser.close(); }
});

test('52 original tables bind omitted overflow without assuming table clipping equivalence', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const capture = JSON.parse(bytes);
  const cases = [...capture.results.map(e => ({ ...e, kind: 'static' })),
    ...capture.interactions.map(e => ({ ...e, kind: 'interaction' }))].filter(e => e.family === 'table');
  const inventory = collectFullTreeInventory(cases);
  assert.deepEqual(inventory.errors, []); assert.equal(cases.length, 52);
  const pairs = cases.map(entry => modalInventoryTrees(inventory,
    `${entry.kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`));
  cases.forEach((entry, i) => {
    const proof = proveTableOverflowInputs(entry, ...pairs[i]);
    assert.equal(proof.initialValueEquivalent, false);
    assert.equal(proof.ownClippingBranchVerified, false);
    assert.equal(proof.renderingEquivalent, false);
  });
  const entry = cases[0], pair = pairs[0], proof = proveTableOverflowInputs(entry, ...pair);
  for (const mutate of [
    ([r]) => { r.ruleEvidenceComplete = false; },
    ([r]) => { r.nodes.find(n => n.key === proof.referenceNode).attributes.style = 'overflow:hidden'; },
    ([r]) => { r.styles[r.nodes.find(n => n.key === proof.referenceNode).style].overflowX = 'hidden'; },
    ([, a]) => { a.nodes.find(n => n.key === proof.astylarNode).authored.type = 'div'; },
    ([, a]) => { a.nodes.find(n => n.key === proof.astylarNode).authored.attributes = { style: 'all:initial' }; },
    ([, a]) => { a.nodes.find(n => n.key === proof.astylarNode).interactionResolvedStyle.overflow = 'clip'; },
    ([, a]) => { a.rules.push({ selector: '#table-primary', overflowInline: 'hidden' }); },
  ]) { const altered = structuredClone(pair); mutate(altered); assert.throws(() => proveTableOverflowInputs(entry, ...altered)); }
  const alteredEntry = structuredClone(entry);
  alteredEntry.styleInputs.find(i => i.id === 'table-primary').astylar.overflow = 'hidden';
  assert.throws(() => proveTableOverflowInputs(alteredEntry, ...pair));
  const rows = queryFindings('artifacts/material-parity/working-audit', 'table', {
    generation: '8fbd2e22dfd801587ce6c1dce90e6daba668171ae26eae0a9c834142a8bd0a43',
    indexSha256: '6f86d55a6ea6be0f1533ac893579bf517769061ed25a13812b0370c46b7c06e6',
  }).filter(r => r.evidence.section === 'discrepancies').map(({ id, evidence, ...row }) => row);
  const normalize = bindPreciseAuditNormalization();
  const applied = applyTableVisibleOverflow(rows, cases, inventory, normalize);
  const changed = applied.filter((row, i) => row !== rows[i]);
  assert.equal(changed.length, 2); assert.equal(changed.reduce((n, row) => n + row.occurrences, 0), 104);
  const metadata = new Set(['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']);
  const raw = row => Object.fromEntries(Object.entries(row).filter(([key]) => !metadata.has(key)));
  assert.deepEqual(applied.map(raw), rows.map(raw));
  applied.forEach((row, i) => { if (!changed.includes(row)) assert.deepEqual(row, rows[i]); });
  assert.deepEqual(validateTableVisibleOverflow(applied, rows, cases, inventory, normalize), []);
  const forged = structuredClone(applied);
  forged.find(row => row.attribution === 'reviewed-table-visible-overflow-initial-value').reviewedCases.pop();
  assert.equal(validateTableVisibleOverflow(forged, rows, cases, inventory, normalize).length, 1);
  assert.throws(() => applyTableVisibleOverflow(rows, cases.slice(1), inventory, normalize));
});

test('70 original tab panels retain the plugin overflow observation boundary', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const capture = JSON.parse(bytes);
  const cases = [...capture.results.map(e => ({ ...e, kind: 'static' })), ...capture.interactions.map(e => ({ ...e, kind: 'interaction' }))]
    .filter(e => e.family === 'tabs');
  const inventory = collectFullTreeInventory(cases), normalize = bindPreciseAuditNormalization();
  assert.deepEqual(inventory.errors, []); assert.equal(cases.length, 70);
  const rows = queryFindings('artifacts/material-parity/working-audit', 'tabs', {
    generation: '0a30ca894170b342e4521c01e4fcb23ed990d70cea789fe89bd4eba0baf663fb',
    indexSha256: 'edf9c2de34728dc874460796853460dd5d39bafd71d4db41cba257366ec50cc0',
  }).filter(r => r.evidence.section === 'discrepancies').map(({ id, evidence, ...row }) => row);
  const applied = applyTabPanelOverflowBoundary(rows, cases, inventory, normalize);
  const changed = applied.filter((r, i) => r !== rows[i]);
  assert.equal(changed.length, 2); assert.equal(changed.reduce((n, r) => n + r.occurrences, 0), 140);
  const metadata = new Set(['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']);
  const raw = r => Object.fromEntries(Object.entries(r).filter(([key]) => !metadata.has(key)));
  assert.deepEqual(applied.map(raw), rows.map(raw));
  for (let i = 0; i < rows.length; i++) if (!changed.includes(applied[i])) assert.deepEqual(applied[i], rows[i]);
  assert.deepEqual(validateTabPanelOverflowBoundary(applied, rows, cases, inventory, normalize), []);
  const forged = structuredClone(applied);
  forged.find(r => r.attribution === 'reviewed-tab-panel-overflow-owner-boundary').reviewedCases.pop();
  assert.equal(validateTabPanelOverflowBoundary(forged, rows, cases, inventory, normalize).length, 1);
  const entry = cases[0], pair = modalInventoryTrees(inventory,
    `${entry.kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`);
  const proof = proveTabPanelOverflowBoundary(entry, ...pair);
  assert.equal(proof.pluginOverflowSensitivityVerified, false); assert.equal(proof.renderingEquivalent, false);
  for (const mutate of [
    ([r]) => { r.ruleEvidenceComplete = false; },
    ([r]) => { r.nodes.find(n => n.key === proof.referenceNode).inline = { overflow: { value: 'hidden' } }; },
    ([, a]) => { a.nodes.find(n => n.key === proof.astylarNode).authored.type = 'div'; },
    ([, a]) => { a.nodes.find(n => n.key === proof.astylarNode).resolvedStyle.overflowY = 'hidden'; },
    ([, a]) => { a.rules.push({ selector: '#tab-panel', overflow: 'hidden' }); },
  ]) { const altered = structuredClone(pair); mutate(altered); assert.throws(() => proveTabPanelOverflowBoundary(entry, ...altered)); }
  assert.throws(() => applyTabPanelOverflowBoundary(rows, cases.slice(1), inventory, normalize));
});

test('84 original heading owners satisfy the dependency-bound initial overflow proof', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const capture = JSON.parse(bytes), owners = { card: 'card-title', dialog: 'dialog-title' };
  const cases = [...capture.results.map(e => ({ ...e, kind: 'static' })), ...capture.interactions.map(e => ({ ...e, kind: 'interaction' }))]
    .filter(e => owners[e.family] && e.styleInputs.some(i => i.id === owners[e.family]));
  const inventory = collectFullTreeInventory(cases), normalize = bindPreciseAuditNormalization();
  assert.deepEqual(inventory.errors, []); assert.equal(cases.length, 84);
  const rows = Object.keys(owners).flatMap(family => queryFindings('artifacts/material-parity/working-audit', family, {
    generation: '0a30ca894170b342e4521c01e4fcb23ed990d70cea789fe89bd4eba0baf663fb',
    indexSha256: 'edf9c2de34728dc874460796853460dd5d39bafd71d4db41cba257366ec50cc0',
  })).filter(r => r.evidence.section === 'discrepancies').map(({ id, evidence, ...row }) => row);
  const applied = applyHeadingVisibleOverflow(rows, cases, inventory, normalize), changed = applied.filter((r, i) => r !== rows[i]);
  assert.equal(changed.length, 4); assert.equal(changed.reduce((sum, r) => sum + r.occurrences, 0), 168);
  const metadata = new Set(['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']);
  const raw = r => Object.fromEntries(Object.entries(r).filter(([key]) => !metadata.has(key)));
  assert.deepEqual(applied.map(raw), rows.map(raw));
  for (let i = 0; i < rows.length; i++) if (!changed.includes(applied[i])) assert.deepEqual(applied[i], rows[i]);
  assert.deepEqual(validateHeadingVisibleOverflow(applied, rows, cases, inventory, normalize), []);
  const forged = structuredClone(applied); forged.find(r => r.attribution === 'reviewed-heading-visible-overflow-initial-value').reviewedCases.pop();
  assert.equal(validateHeadingVisibleOverflow(forged, rows, cases, inventory, normalize).length, 1);
  for (const family of Object.keys(owners)) {
    const entry = cases.find(e => e.family === family), pair = modalInventoryTrees(inventory,
      `${entry.kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`);
    const proof = proveHeadingVisibleOverflow(entry, ...pair);
    assert.equal(proof.initialValueEquivalent, true); assert.equal(proof.renderingEquivalent, false);
    for (const mutate of [
      ([r]) => { r.ruleEvidenceComplete = false; },
      ([r]) => { r.styles[r.nodes.find(n => n.key === proof.referenceNode).style].overflowY = 'hidden'; },
      ([, a]) => { a.nodes.find(n => n.key === proof.astylarNode).authored.type = 'input'; },
      ([, a]) => { a.nodes.find(n => n.key === proof.astylarNode).normalResolvedStyle.overflow = 'clip'; },
      ([, a]) => { a.rules.push({ selector: '#' + owners[family], overflowInline: 'hidden' }); },
      ([, a]) => { a.nodes.find(n => n.key === proof.astylarNode).authored.attributes = { style: 'all:initial' }; },
    ]) { const altered = structuredClone(pair); mutate(altered); assert.throws(() => proveHeadingVisibleOverflow(entry, ...altered)); }
  }
});

test('716 native button owners request visible axes while candidates omit overflow at every captured stage', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'),
    'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const captured = JSON.parse(bytes);
  const cases = [...captured.results.map(e => ({ ...e, kind: 'static' })),
    ...captured.interactions.map(e => ({ ...e, kind: 'interaction' }))].filter(e => visibleButtonOwners[e.family]);
  const inventory = collectFullTreeInventory(cases), counts = {}, samples = new Map();
  assert.deepEqual(inventory.errors, []);
  for (const entry of cases) for (const element of visibleButtonOwners[entry.family]) {
    if (!entry.styleInputs.some(i => i.id === element)) continue; // Closed dialog actions are absent.
    const pair = modalInventoryTrees(inventory,
      `${entry.kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`);
    const proof = proveVisibleButtonOverflowInputs(entry, ...pair, element);
    assert.equal(proof.inputEquivalent, false); assert.equal(proof.clippingVerified, false);
    counts[element] = (counts[element] ?? 0) + 1;
    if (!samples.has(element)) samples.set(element, { entry, pair, proof });
  }
  assert.deepEqual(counts, { 'toolbar-action': 52, 'card-open': 52, 'button-disabled': 60,
    'button-primary': 60, 'button-secondary': 60, 'menu-primary': 94, 'bottom-sheet-primary': 63,
    'dialog-primary': 78, 'dialog-cancel': 32, 'dialog-save': 32, 'snack-bar-primary': 71, 'tooltip-primary': 62 });
  const normalize = bindPreciseAuditNormalization();
  const rows = Object.keys(visibleButtonOwners).flatMap(family => queryFindings('artifacts/material-parity/working-audit', family, {
    generation: 'ef6da409ae1162433b0419814fe7e7e33b7659805d8e672f407d8b4c84878145',
    indexSha256: 'a25ffe1f2d083f23fafe6e615566544a9aedf7b9559e2084309551568982cca9',
  })).filter(r => r.evidence.section === 'discrepancies').map(({ id, evidence, ...row }) => row);
  const applied = applyVisibleButtonOverflow(rows, cases, inventory, normalize);
  const changed = applied.filter(r => r.attribution === visibleButtonOverflowAttribution);
  assert.equal(changed.length, 24); assert.equal(changed.reduce((n, r) => n + r.occurrences, 0), 1432);
  const metadata = new Set(['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']);
  const raw = r => Object.fromEntries(Object.entries(r).filter(([key]) => !metadata.has(key)));
  assert.deepEqual(applied.map(raw), rows.map(raw));
  for (let i = 0; i < rows.length; i++) if (applied[i].attribution !== visibleButtonOverflowAttribution)
    assert.deepEqual(applied[i], rows[i]);
  assert.deepEqual(validateVisibleButtonOverflow(applied, rows, cases, inventory, normalize), []);
  for (const mutate of [r => r.reviewedCases.pop(), r => { r.reviewEvidence.observations[0].renderingEquivalent = true; },
    r => { r.reviewEvidence.observations[0].buttonOverflowSources['src/app/services/dom/input/button.manager.ts'] = 'forged'; }]) {
    const forged = structuredClone(applied); mutate(forged.find(r => r.attribution === visibleButtonOverflowAttribution));
    assert.equal(validateVisibleButtonOverflow(forged, rows, cases, inventory, normalize).length, 1);
  }
  for (const [element, { entry, pair, proof }] of samples) for (const mutate of [
    ([r]) => { r.ruleEvidenceComplete = false; },
    ([r]) => { r.nodes.find(n => n.key === proof.referenceNode).type = 'span'; },
    ([r]) => { r.styles[r.nodes.find(n => n.key === proof.referenceNode).style].overflowX = 'hidden'; },
    ([, a]) => { a.nodes.find(n => n.key === proof.astylarNode).normalResolvedStyle.overflow = 'clip'; },
    ([, a]) => { a.rules.push({ selector: '[unknown]', overflowInline: 'hidden' }); },
    ([, a]) => { a.nodes.find(n => n.key === proof.astylarNode).authored.attributes = { style: 'overflow: hidden' }; },
  ]) {
    const changed = structuredClone(pair); mutate(changed);
    assert.throws(() => proveVisibleButtonOverflowInputs(entry, ...changed, element), undefined, element);
  }
});

test('265 mapped ordinary owners satisfy the retained initial-overflow proof prerequisites, not rendering equivalence', () => {
  // Reuse the existing browser/core sensitivity proof, but require its owning
  // sources and tests to remain unchanged. This does not apply classifications.
  const fingerprints = {
    'src/app/config/browser-defaults.ts': 'c429bec0fa047e71148f4ce743868a4c89986fde28cc7d11076bb7afa89993f3',
    'src/app/services/dom/style-defaults.service.ts': '379775839024538bcd2a6acc69528039e24fc58b849e52841ba9d6c88f4da7d0',
    'src/app/services/dom/elements/overflow-clip.service.ts': 'f66a26a20844e471cf7db4a4e6e9cf6f197f97a0d4eb9cad3cb23bc3892f802a',
    'src/lib/astylar-scroll-runtime.ts': '2c7f0667264471b12315c5619e446dde65c6bb266d0bf114f84688f76f5288ac',
    'src/app/services/dom/elements/overflow-clip.service.spec.ts': '53b6723c8b7d241afdc8b610b81a9158d9f5720c79a5926f51aa0b7cbb37fac8',
    'src/lib/astylar-scroll-runtime.spec.ts': '91a1f492f15e6a2d27844655b8a017a6d632f8698450bb9ab20f09a24a461e8e',
  };
  for (const [file, expected] of Object.entries(fingerprints)) assert.equal(createHash('sha256')
    .update(readFileSync(file, 'utf8').replaceAll('\r\n', '\n')).digest('hex'), expected, file);
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'),
    'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const captured = JSON.parse(bytes), owners = {
    paginator: ['paginator-range', 'paginator-size'], stepper: ['stepper-content'],
    'bottom-sheet': ['bottom-sheet-overlay'], 'snack-bar': ['snack-bar-overlay', 'snack-bar-surface'],
  };
  const cases = [...captured.results.map(e => ({ ...e, kind: 'static' })),
    ...captured.interactions.map(e => ({ ...e, kind: 'interaction' }))].filter(e => owners[e.family]);
  const inventory = collectFullTreeInventory(cases), counts = {}, samples = new Map();
  const verify = (entry, r, a, input) => {
    const proof = proveMappedVisibleOverflow(entry, r, a, input.id);
    assert.equal(proof.initialValueEquivalent, true);
    for (const flag of ['inputEquivalent', 'structuralEquivalenceVerified', 'clippingVerified', 'scrollingVerified', 'renderingEquivalent'])
      assert.equal(proof[flag], false);
    return proof.mapping;
  };
  for (const entry of cases) for (const element of owners[entry.family]) {
    const inputs = entry.styleInputs.filter(i => i.id === element);
    if (!inputs.length) continue; // Closed overlays have no owner; expected totals below are exact.
    assert.equal(inputs.length, 1);
    const pair = modalInventoryTrees(inventory,
      `${entry.kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`);
    const mapping = verify(entry, ...pair, inputs[0]);
    counts[element] = (counts[element] ?? 0) + 1;
    if (!samples.has(element)) samples.set(element, { entry, pair, input: inputs[0], mapping });
  }
  assert.deepEqual(counts, { 'paginator-range': 52, 'paginator-size': 52, 'stepper-content': 68,
    'bottom-sheet-overlay': 25, 'snack-bar-overlay': 34, 'snack-bar-surface': 34 });
  for (const [element, { entry, pair, input, mapping }] of samples) {
    for (const mutate of [
      ([r]) => { r.ruleEvidenceComplete = false; },
      ([r]) => { r.nodes.find(n => n.key === mapping.referenceNode).attributes.id = element; },
      ([, a]) => { a.rules.push({ selector: '[unknown]', overflow: 'hidden' }); },
      ([, a]) => { a.nodes.find(n => n.key === mapping.candidateNode).authored.style = { overflowBlock: 'clip' }; },
      ([, a]) => { a.nodes.find(n => n.key === mapping.candidateNode).normalResolvedStyle.all = 'unset'; },
      ([, a]) => { a.nodes.find(n => n.key === mapping.candidateNode).authored.type = 'showcase.material:panel'; },
    ]) {
      const changed = structuredClone(pair); mutate(changed);
      assert.throws(() => verify(entry, ...changed, input), undefined, element);
    }
  }
});

test('combined snackbar and overflow proposal preserves all current raw rows and exact original case membership', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'),
    'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const captured = JSON.parse(bytes);
  const cases = [...captured.results.map(e => ({ ...e, kind: 'static' })),
    ...captured.interactions.map(e => ({ ...e, kind: 'interaction' }))];
  const inventory = collectFullTreeInventory(cases), normalize = bindPreciseAuditNormalization();
  const rows = [...new Set(cases.map(e => e.family))].flatMap(f => queryFindings('artifacts/material-parity/working-audit', f, {
    generation: 'f86307bd22b7699155bc1e28730c1a446c825a214d97c9258555c8b33a265162',
    indexSha256: '9222220df3105817b2f39275395d883ff8201560f00f696320dfec0171339c8a',
  })).filter(r => r.evidence.section === 'discrepancies').sort((a, b) => a.evidence.ordinal - b.evidence.ordinal);
  assert.equal(rows.length, 8483);
  const before = structuredClone(rows);
  const applied = applyMappedVisibleOverflow(applyControlClippingRequests(
    applySnackbarPositionRequests(rows, cases, inventory, normalize), cases, inventory, normalize), cases, inventory, normalize);
  const source = readFileSync('tests/material-parity/input-equivalence-audit.mjs', 'utf8').replaceAll('\r\n', '\n');
  // Later owner/typography stages now follow this bounded three-function stage.
  // Execute its actual production declaration, not the final discrepancies tail.
  const marker = "  const beforeTypographyReviews = ownerInitialStyleBinding.status === 'bound'";
  assert.equal(source.split(marker).length, 2);
  const start = source.indexOf(marker);
  const end = source.indexOf('  const beforeBoxSizingReviews =', start);
  assert.ok(start > 0 && end > start);
  const implementations = { applyMappedVisibleOverflow, applyControlClippingRequests, applySnackbarPositionRequests };
  const run = new Function('ownerInitialStyleBinding', 'beforeSnackbarOverflowRequests', 'cases',
    'elementInventory', 'canonicalStyle', ...Object.keys(implementations), source.slice(start, end) + '\nreturn beforeTypographyReviews;');
  assert.deepEqual(run({ status: 'bound' }, rows, cases, inventory, normalize, ...Object.values(implementations)), applied);
  assert.equal(run({ status: 'unbound' }, rows, cases, inventory, normalize, ...Object.values(implementations)), rows);
  const validators = { validateSnackbarPositionRequests, validateControlClippingRequests, validateMappedVisibleOverflow };
  const validationStart = source.indexOf('      errors.push(...validateSnackbarPositionRequests(');
  const validationEnd = source.indexOf('      if (JSON.stringify(selected(replayedRows))', validationStart);
  assert.ok(validationStart > 0 && validationEnd > validationStart);
  const validateProduction = new Function('report', 'replayedRows', 'cases', 'canonicalStyle',
    ...Object.keys(validators), 'const errors = [];\n' + source.slice(validationStart, validationEnd) + '\nreturn errors;');
  const validateIntegrated = values => validateProduction({ discrepancies: values, elementInventory: inventory },
    rows, cases, normalize, ...Object.values(validators));
  assert.deepEqual(validateIntegrated(applied), []);
  assert.deepEqual(rows, before); assert.equal(applied.length, rows.length);
  const changed = applied.filter((r, i) => r !== rows[i]);
  for (const attribution of new Set(changed.map(row => row.attribution))) {
    const forged = applied.map(row => row.attribution === attribution
      ? { ...row, reviewedCases: row.reviewedCases.slice(1) } : row);
    assert.ok(validateIntegrated(forged).length, attribution);
  }
  assert.equal(changed.length, 31); assert.equal(changed.reduce((n, r) => n + r.occurrences, 0), 1292);
  assert.equal(applied.filter(r => r.attribution === 'unresolved').length, 1096);
  const visible = changed.filter(r => r.attribution === 'reviewed-mapped-visible-overflow-initial-value');
  assert.equal(visible.length, 12); assert.equal(visible.reduce((n, r) => n + r.occurrences, 0), 530);
  for (const row of changed) {
    assert.equal(row.reviewedCases.length, row.occurrences);
    assert.equal(new Set(row.reviewedCases).size, row.occurrences);
    const restored = { ...row };
    for (const key of ['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']) delete restored[key];
    Object.assign(restored, row.reviewEvidence.priorMetadata);
    assert.deepEqual(restored, rows.find(r => r.id === row.id));
  }
  for (const validate of [validateMappedVisibleOverflow, validateControlClippingRequests, validateSnackbarPositionRequests])
    assert.deepEqual(validate(applied, rows, cases, inventory, normalize), []);
  for (const mutate of [r => { r.reference = 'hidden'; }, r => r.reviewedCases.pop(),
    r => { r.reviewEvidence.observations[0].renderingEquivalent = true; },
    r => { r.classification = 'application-plugin-authoring-defect'; }]) {
    const altered = structuredClone(applied);
    mutate(altered.find(r => r.attribution === 'reviewed-mapped-visible-overflow-initial-value'));
    assert.ok(validateMappedVisibleOverflow(altered, rows, cases, inventory, normalize).length);
  }
  const target = cases.findIndex(e => e.family === 'snack-bar' && e.styleInputs.some(i => i.id === 'snack-bar-overlay'));
  assert.ok(target >= 0);
  assert.throws(() => applyMappedVisibleOverflow(rows, cases.filter((_, i) => i !== target), inventory, normalize));
  assert.throws(() => applyMappedVisibleOverflow(rows, [...cases, cases[target]], inventory, normalize));
});

test('330 control owners preserve clipping requests, competing visible rules and the progress computed axis', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'),
    'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const captured = JSON.parse(bytes);
  const cases = [...captured.results.map(e => ({ ...e, kind: 'static' })),
    ...captured.interactions.map(e => ({ ...e, kind: 'interaction' }))].filter(e => clippingOwners[e.family]);
  const inventory = collectFullTreeInventory(cases), normalize = bindPreciseAuditNormalization();
  const trees = e => modalInventoryTrees(inventory,
    `${e.kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`);
  const counts = {}, samples = new Map();
  for (const entry of cases) for (const element of Object.keys(clippingOwners[entry.family])) {
    const pair = trees(entry), proof = proveControlClippingRequests(entry, ...pair, element);
    assert.equal(proof.clippingVerified, false); assert.equal(proof.candidateComputedOverflowVerified, false);
    counts[element] = (counts[element] ?? 0) + 1;
    if (!samples.has(element)) samples.set(element, { entry, pair, proof });
  }
  assert.deepEqual(counts, { 'core-primary': 52, 'sidenav-primary': 62, 'grid-tile-one': 52,
    'grid-tile-two': 52, 'badge-count': 52, 'icon-primary': 20, 'progress-bar-primary': 20,
    'progress-spinner-primary': 20 });
  for (const [element, { entry, pair, proof }] of samples) {
    const ref = r => r.nodes.find(n => n.key === proof.referenceNode);
    const ast = a => a.nodes.find(n => n.key === proof.astylarNode);
    for (const mutate of [
      ([r]) => { r.ruleEvidenceComplete = false; },
      ([r]) => { ref(r).inline = { overflow: { value: 'visible' } }; },
      ([r]) => { ref(r).attributes.style = 'overflow-inline:visible'; },
      ([r]) => { r.rules[ref(r).rules[0]].cssText += ';all:initial'; },
      ([r]) => { r.styles[ref(r).style].overflowY = 'forged'; },
      ([, a]) => { a.rules.push({ selector: '#' + element, overflowBlock: 'hidden' }); },
      ([, a]) => { a.rules.push({ selector: '[unknown]', overflow: 'hidden' }); },
      ([, a]) => { ast(a).authored.style = { overflow: 'hidden' }; },
      ([, a]) => { ast(a).interactionResolvedStyle.overflowY = 'hidden'; },
      ([, a]) => { a.nodes.push(structuredClone(ast(a))); },
      ([, a]) => { ast(a).authored.type = 'other'; },
    ]) {
      const altered = structuredClone(pair); mutate(altered);
      assert.throws(() => proveControlClippingRequests(entry, ...altered, element), undefined, element);
    }
  }
  const rows = Object.keys(clippingOwners).flatMap(f => queryFindings('artifacts/material-parity/working-audit', f, {
    generation: 'fea569edc8edf1e05d1686bcb7c2a8eecc0bfb53bff5d5b8baeb6fbb59602040',
    indexSha256: '672b4d61922a8ef775f4e2c723ca09c9ab70684d93822cd3fe3b53d0df6c9d57',
  })).filter(r => r.evidence.section === 'discrepancies');
  const before = structuredClone(rows), applied = applyControlClippingRequests(rows, cases, inventory, normalize);
  assert.deepEqual(rows, before);
  const changed = applied.filter((r, i) => r !== rows[i]);
  assert.equal(changed.length, 16); assert.equal(changed.reduce((n, r) => n + r.occurrences, 0), 660);
  assert.deepEqual(changed.filter(r => r.attribution === 'reviewed-progress-overflow-computed-axis')
    .map(r => [r.element, r.property, r.reference, r.occurrences]), [['progress-bar-primary', 'overflowY', 'auto', 20]]);
  for (const row of changed) {
    assert.equal(row.reviewedCases.length, row.occurrences);
    assert.equal(new Set(row.reviewedCases).size, row.occurrences);
    const restored = { ...row };
    for (const key of ['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']) delete restored[key];
    Object.assign(restored, row.reviewEvidence.priorMetadata);
    assert.deepEqual(restored, rows.find(r => r.id === row.id));
  }
  const validate = values => validateControlClippingRequests(values, rows, cases, inventory, normalize);
  assert.deepEqual(validate(applied), []);
  for (const mutate of [r => { r.reference = 'forged'; }, r => r.reviewedCases.pop(),
    r => { r.reviewEvidence.observations[0].clippingVerified = true; }]) {
    const altered = structuredClone(applied);
    mutate(altered.find(r => r.attribution === 'reviewed-control-clipping-request-omission'));
    assert.ok(validate(altered).length);
  }
  assert.throws(() => applyControlClippingRequests(rows, cases.slice(1), inventory, normalize));
  assert.throws(() => applyControlClippingRequests(rows, [...cases, cases[0]], inventory, normalize));
});
