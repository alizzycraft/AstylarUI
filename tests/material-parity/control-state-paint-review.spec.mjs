import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { queryFindings } from '../../scripts/audit-findings-store.mjs';
import { collectFullTreeInventory, collectRetainedTypographyEvidence } from './input-equivalence-audit.mjs';
import { bindPreciseAuditNormalization } from './audit-normalization-contracts.mjs';
import { modalInventoryTrees } from './modal-position-inspection.mjs';
import { applyControlStatePaintReview, proveControlStatePaint, controlStatePaintAttribution, cardSurfacePaintAttribution, opaqueSurfacePaintAttribution, specialPaintDefinitions, applyDisabledLabelColorReview, applyStepperLabelColorReview } from './control-state-paint-review.mjs';
import { collectDisabledLabelColorStages } from '../../scripts/audit-material-disabled-label-color-stages.mjs';
import { collectPaintReviewSources, applyPaintReviews, validatePaintReviews, isPaintReviewRow } from './control-state-paint-review.mjs';
import { paintPopulation } from '../../scripts/check-material-position-canonical-conservation.mjs';
import { proveOmittedOwnerPaintRequest, applyOmittedOwnerPaintRequests, validateOmittedOwnerPaintRequests } from './control-state-paint-review.mjs';
import { applyOwnerMaximumWidths, validateOwnerMaximumWidths } from './control-width-observation.mjs';
import { applyBadgeMarginReviews, validateBadgeMarginReviews } from './authored-anchor-review.mjs';
import { applySliderMarginReviews, validateSliderMarginReviews } from './slider-position-request-review.mjs';
import { applyListSpacingReviews, validateListSpacingReviews } from './display-request-review.mjs';
import { applyHeadingVisibleOverflow, validateHeadingVisibleOverflow, applyTabPanelOverflowBoundary, validateTabPanelOverflowBoundary } from './control-overflow-observation.mjs';
import { applyTableVisibleOverflow, validateTableVisibleOverflow, applyControlOverflowOwnerBoundaries, validateControlOverflowOwnerBoundaries, applyRangeVisibleOverflow, validateRangeVisibleOverflow } from './control-overflow-observation.mjs';

test('card shadow serialization preserves all original layers and browser pixels', async () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'),
    'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const report = JSON.parse(bytes);
  const inputs = [...report.results, ...report.interactions].filter(e => e.family === 'card')
    .flatMap(e => e.styleInputs.filter(i => i.id === 'card-primary'));
  assert.equal(inputs.length, 52);
  const { build } = await import('esbuild');
  const built = await build({ entryPoints: ['src/app/services/dom/elements/box-shadow.ts'],
    bundle: true, write: false, platform: 'node', format: 'esm' });
  const { parseBoxShadow } = await import('data:text/javascript;base64,' +
    Buffer.from(built.outputFiles[0].contents).toString('base64'));
  const layers = value => parseBoxShadow(value).map(layer => ({ ...layer,
    color: layer.color.replaceAll(' ', '') }));
  const expected = [
    { offsetX: 0, offsetY: 2, blur: 1, spread: -1, color: 'rgba(0,0,0,0.2)' },
    { offsetX: 0, offsetY: 1, blur: 1, spread: 0, color: 'rgba(0,0,0,0.14)' },
    { offsetX: 0, offsetY: 1, blur: 3, spread: 0, color: 'rgba(0,0,0,0.12)' },
  ];
  const pairs = new Map();
  for (const input of inputs) {
    assert.deepEqual(layers(input.reference.boxShadow), expected);
    for (const style of [input.astylar, input.astylarNormalResolvedStyle, input.astylarInteractionResolvedStyle])
      assert.deepEqual(layers(style.boxShadow), expected);
    const authored = input.astylarAuthored.filter(r => r.declarations.boxShadow);
    assert.equal(authored.length, 1);
    assert.deepEqual(layers(authored[0].declarations.boxShadow), expected);
    pairs.set(JSON.stringify([input.reference.boxShadow, input.astylar.boxShadow]),
      [input.reference.boxShadow, input.astylar.boxShadow]);
  }
  assert.equal(pairs.size, 1);
  const { chromium } = await import('playwright-core');
  const { PNG } = await import('pngjs');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    for (const deviceScaleFactor of [1, 2]) {
      const page = await browser.newPage({ viewport: { width: 220, height: 140 }, deviceScaleFactor });
      await page.setContent('<style>body{margin:0;background:white}div{position:absolute;left:40px;top:30px;width:140px;height:70px;border-radius:12px;background:#f8f2f6}</style><div></div>');
      const capture = async shadow => {
        const computed = await page.evaluate(value => {
          const node = document.querySelector('div'); node.style.boxShadow = value;
          return getComputedStyle(node).boxShadow;
        }, shadow);
        return { computed, pixels: PNG.sync.read(await page.screenshot()).data };
      };
      for (const [reference, candidate] of pairs.values()) {
        const r = await capture(reference), a = await capture(candidate);
        assert.equal(a.computed, r.computed); assert.deepEqual(a.pixels, r.pixels);
        // These controls must remain observable; do not canonicalize shadow away.
        assert.notDeepEqual((await capture('none')).pixels, r.pixels);
        assert.notDeepEqual((await capture(candidate.replace('3px', '8px'))).pixels, r.pixels);
        assert.notDeepEqual(layers(candidate.replace('3px', '8px')), expected);
      }
      await page.close();
    }
  } finally { await browser.close(); }
  // Browser syntax equivalence plus core parser equivalence is not WebGL raster parity.
});

test('omitted owner paint requests preserve all 77 original observations and reject competing inputs', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'),
    'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const report = JSON.parse(bytes), owners = { badge: 'badge-count', 'bottom-sheet': 'bottom-sheet-panel' };
  const families = [...Object.keys(owners), 'chips', 'tabs', 'slider', 'list', 'card', 'dialog', 'table'];
  const cases = [...report.results.map(e => ({ ...e, kind: 'static' })),
    ...report.interactions.map(e => ({ ...e, kind: 'interaction' }))]
    .filter(e => families.includes(e.family));
  const inventory = collectFullTreeInventory(cases), counts = {}, samples = new Map();
  assert.deepEqual(inventory.errors, []);
  for (const entry of cases.filter(e => owners[e.family] && e.styleInputs.some(i => i.id === owners[e.family]))) {
    const pair = modalInventoryTrees(inventory,
      `${entry.kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`);
    const proof = proveOmittedOwnerPaintRequest(entry, ...pair);
    assert.equal(proof.inputEquivalent, false); assert.equal(proof.coreDefectProven, false);
    assert.equal(proof.originalRasterCauseProven, false);
    counts[entry.family] = (counts[entry.family] ?? 0) + 1;
    if (!samples.has(entry.family)) samples.set(entry.family, { entry, pair, proof });
  }
  assert.deepEqual(counts, { badge: 52, 'bottom-sheet': 25 });
  const rows = families.flatMap(family => queryFindings('artifacts/material-parity/working-audit', family, {
    generation: '0a30ca894170b342e4521c01e4fcb23ed990d70cea789fe89bd4eba0baf663fb',
    indexSha256: 'edf9c2de34728dc874460796853460dd5d39bafd71d4db41cba257366ec50cc0',
  })).filter(r => r.evidence.section === 'discrepancies').map(({ id, evidence, ...row }) => row);
  const normalize = bindPreciseAuditNormalization();
  const applied = applyOmittedOwnerPaintRequests(rows, cases, inventory, normalize);
  const changed = applied.filter(r => r.attribution === 'reviewed-owner-paint-request-omission');
  assert.equal(changed.length, 2); assert.equal(changed.reduce((sum, r) => sum + r.occurrences, 0), 77);
  const metadata = new Set(['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']);
  const raw = r => Object.fromEntries(Object.entries(r).filter(([key]) => !metadata.has(key)));
  assert.deepEqual(applied.map(raw), rows.map(raw));
  for (let i = 0; i < rows.length; i++) if (!changed.includes(applied[i])) assert.deepEqual(applied[i], rows[i]);
  const validate = values => validateOmittedOwnerPaintRequests(values, rows, cases, inventory, normalize);
  assert.deepEqual(validate(applied), []);
  const forged = structuredClone(applied);
  forged.find(r => r.attribution === 'reviewed-owner-paint-request-omission').reviewedCases.pop();
  assert.equal(validate(forged).length, 1);
  // Execute the production tail against the authenticated preceding checkpoint.
  const source = readFileSync('tests/material-parity/input-equivalence-audit.mjs', 'utf8');
  const start = source.indexOf('  const discrepancies =', source.indexOf('  const beforeOwnerOmissionReviews ='));
  const end = source.indexOf('  const classifications =', start);
  assert.ok(start > 0 && end > start);
  const tail = new Function('ownerInitialStyleBinding', 'beforeOwnerOmissionReviews', 'cases', 'elementInventory',
    'canonicalStyle', 'applyOwnerMaximumWidths', 'applyOmittedOwnerPaintRequests', 'applyBadgeMarginReviews',
    'applySliderMarginReviews', 'applyListSpacingReviews', 'applyHeadingVisibleOverflow', 'applyTabPanelOverflowBoundary',
    'applyTableVisibleOverflow', 'applyControlOverflowOwnerBoundaries', 'applyRangeVisibleOverflow', source.slice(start, end) + '\nreturn discrepancies;');
  const applies = [applyOwnerMaximumWidths, applyOmittedOwnerPaintRequests, applyBadgeMarginReviews, applySliderMarginReviews, applyListSpacingReviews, applyHeadingVisibleOverflow, applyTabPanelOverflowBoundary, applyTableVisibleOverflow, applyControlOverflowOwnerBoundaries, applyRangeVisibleOverflow];
  const combined = tail({ status: 'bound' }, rows, cases, inventory, normalize, ...applies);
  assert.deepEqual(combined, [...applies].reverse().reduce((values, apply) => apply(values, cases, inventory, normalize), rows));
  const batch = combined.filter((r, i) => r !== rows[i]);
  assert.equal(batch.length, 32); assert.equal(batch.reduce((sum, r) => sum + r.occurrences, 0), 1979);
  assert.deepEqual(combined.map(raw), rows.map(raw));
  for (let i = 0; i < rows.length; i++) if (!batch.includes(combined[i])) assert.deepEqual(combined[i], rows[i]);
  assert.deepEqual(validate(combined), []);
  assert.deepEqual(validateOwnerMaximumWidths(combined, rows, cases, inventory, normalize), []);
  for (const validate of [validateBadgeMarginReviews, validateSliderMarginReviews, validateListSpacingReviews, validateHeadingVisibleOverflow, validateTabPanelOverflowBoundary, validateTableVisibleOverflow, validateControlOverflowOwnerBoundaries, validateRangeVisibleOverflow])
    assert.deepEqual(validate(combined, rows, cases, inventory, normalize), []);
  assert.equal(tail({ status: 'unbound' }, rows, cases, inventory, normalize,
    ...applies.map(() => () => assert.fail('unbound owner review ran'))), rows);
  for (const name of ['validateOwnerMaximumWidths', 'validateOmittedOwnerPaintRequests', 'validateBadgeMarginReviews', 'validateSliderMarginReviews', 'validateListSpacingReviews', 'validateHeadingVisibleOverflow', 'validateTabPanelOverflowBoundary', 'validateTableVisibleOverflow', 'validateControlOverflowOwnerBoundaries', 'validateRangeVisibleOverflow'])
    assert.ok(source.includes(`errors.push(...${name}(report.discrepancies, replayedRows, cases, report.elementInventory, canonicalStyle));`));
  assert.ok(source.includes("errors.push('owner omission review attribution lacks bound original cases')"));
  assert.ok(source.includes("errors.push('spacing composition review attribution lacks bound original cases')"));
  assert.ok(source.includes("errors.push('heading and tab overflow attribution lacks bound original cases')"));
  assert.ok(source.includes("errors.push('table and control overflow attribution lacks bound original cases')"));
  const currentRows = families.flatMap(family => queryFindings('artifacts/material-parity/working-audit', family, {
    generation: '8fbd2e22dfd801587ce6c1dce90e6daba668171ae26eae0a9c834142a8bd0a43',
    indexSha256: '6f86d55a6ea6be0f1533ac893579bf517769061ed25a13812b0370c46b7c06e6',
  })).filter(r => r.evidence.section === 'discrepancies').map(({ id, evidence, ...row }) => row);
  const currentApplied = tail({ status: 'bound' }, currentRows, cases, inventory, normalize, ...applies);
  const currentBatch = currentApplied.filter((r, i) => r !== currentRows[i]);
  assert.equal(currentBatch.length, 12); assert.equal(currentBatch.reduce((n, r) => n + r.occurrences, 0), 852);
  assert.deepEqual(currentApplied.map(raw), currentRows.map(raw));
  currentApplied.forEach((r, i) => { if (!currentBatch.includes(r)) assert.deepEqual(r, currentRows[i]); });
  for (const [family, { entry, pair, proof }] of samples) {
    const property = family === 'badge' ? 'textOverflow' : 'boxShadow';
    for (const mutate of [
      ([r]) => { r.ruleEvidenceComplete = false; },
      ([r]) => { r.styles[r.nodes.find(n => n.key === proof.referenceNode).style][property] = 'none'; },
      ([, a]) => { a.nodes.find(n => n.key === proof.astylarNode).normalResolvedStyle[property] = 'none'; },
      ([, a]) => { a.rules.push({ selector: '#' + owners[family], [property]: 'none' }); },
      ([, a]) => { a.nodes.find(n => n.key === proof.astylarNode).authored.style = { all: 'initial' }; },
    ]) {
      const altered = structuredClone(pair); mutate(altered);
      assert.throws(() => proveOmittedOwnerPaintRequest(entry, ...altered));
    }
  }
});

test('disabled label colors reuse all 32 retained-stage proofs without filling omitted locals', () => {
  const evidence = collectDisabledLabelColorStages();
  assert.deepEqual(evidence, JSON.parse(readFileSync('docs/material-disabled-label-color-stages.json')));
  const snapshot = { generation: 'd25a9078972edf1884a4e56a7c17f4a7b3d249d3ed22933811f69daa4aafda9a',
    indexSha256: 'c1934e90c7ca80ff121da83a6871d10da201f798f37cdb92f8badce7c24529ad' };
  const rows = ['checkbox', 'radio', 'expansion'].flatMap(f => queryFindings('artifacts/material-parity/working-audit', f, snapshot))
    .filter(r => r.evidence.section === 'discrepancies');
  const result = applyDisabledLabelColorReview(rows, evidence);
  const changed = result.filter((r, i) => r !== rows[i]);
  assert.equal(changed.length, 8); assert.equal(changed.reduce((n, r) => n + r.occurrences, 0), 32);
  assert.equal(changed.flatMap(r => r.reviewEvidence.observations).filter(o => o.ownColorOmitted).length, 24);
  const metadata = new Set(['classification', 'attribution', 'recommendedOwner', 'justification', 'reviewEvidence', 'reviewedCases']);
  const raw = row => Object.fromEntries(Object.entries(row).filter(([key]) => !metadata.has(key)));
  result.forEach((r, i) => assert.deepEqual(raw(r), raw(rows[i])));
  const missing = structuredClone(evidence); missing.observations.pop();
  assert.throws(() => applyDisabledLabelColorReview(rows, missing));
  const invented = structuredClone(evidence);
  invented.observations.find(o => o.candidateLocal === null).candidateLocal = 'rgba(29,27,32,1)';
  assert.throws(() => applyDisabledLabelColorReview(rows, invented));
  const equivalent = structuredClone(evidence); equivalent.observations[0].renderingEquivalent = true;
  assert.throws(() => applyDisabledLabelColorReview(rows, equivalent));
});

test('control paint preserves owner boundaries and all 397 captured observations', () => {
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(hash(bytes), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const original = JSON.parse(bytes), cases = [...original.results.map(e => ({ ...e, kind: 'static' })),
    ...original.interactions.map(e => ({ ...e, kind: 'interaction' }))];
  const snapshot = { generation: 'd25a9078972edf1884a4e56a7c17f4a7b3d249d3ed22933811f69daa4aafda9a',
    indexSha256: 'c1934e90c7ca80ff121da83a6871d10da201f798f37cdb92f8badce7c24529ad' };
  const rows = ['tabs', 'card', 'dialog', 'toolbar', 'grid-list', 'button-toggle', 'bottom-sheet', 'divider', 'slider'].flatMap(f => queryFindings('artifacts/material-parity/working-audit', f, snapshot))
    .filter(r => r.evidence.section === 'discrepancies');
  const inventory = collectFullTreeInventory(cases), normalize = bindPreciseAuditNormalization();
  assert.deepEqual(inventory.errors, []);
  const stepperRows = queryFindings('artifacts/material-parity/working-audit', 'stepper', snapshot)
    .filter(r => r.evidence.section === 'discrepancies');
  const stepperCases = cases.filter(e => e.family === 'stepper');
  const retained = collectRetainedTypographyEvidence(stepperCases, inventory);
  const stepperResult = applyStepperLabelColorReview(stepperRows, stepperCases, retained, normalize);
  const changedStepper = stepperResult.filter((r, i) => r !== stepperRows[i]);
  assert.equal(changedStepper.length, 2); assert.equal(changedStepper.reduce((n, r) => n + r.occurrences, 0), 136);
  const lostRetained = structuredClone(retained);
  lostRetained.differences = lostRetained.differences.filter((p, i) => i !==
    retained.differences.findIndex(p => p.property === 'color' && p.attribution === 'reviewed-stepper-text-input'));
  assert.throws(() => applyStepperLabelColorReview(stepperRows, stepperCases, lostRetained, normalize));
  const filled = structuredClone(stepperCases);
  filled[0].styleInputs.find(i => i.id === 'step-details-text').astylar.color = '#000000';
  assert.throws(() => applyStepperLabelColorReview(stepperRows, filled, retained, normalize));
  const result = applyControlStatePaintReview(rows, cases, inventory, normalize);
  const reviewed = result.filter(r => [controlStatePaintAttribution, cardSurfacePaintAttribution, opaqueSurfacePaintAttribution,
    ...Object.values(specialPaintDefinitions).map(d => d.attribution)].includes(r.attribution));
  assert.equal(reviewed.length, 54); assert.equal(reviewed.reduce((n, r) => n + r.occurrences, 0), 397);
  const observations = reviewed.flatMap(r => r.reviewEvidence.observations);
  const ranges = observations.filter(o => o.defaultStageDivergence);
  assert.equal(ranges.length, 16);
  assert.ok(ranges.every(o => o.backgroundAuthoringEquivalent && o.originalInputLayersInvisible && !o.visibleThumbCauseProven));
  assert.equal(hash(readFileSync('artifacts/material-parity/range-background-default-public-5ee5ae4.log')),
    ranges[0].publicReductionLogSha256);
  for (const observation of ranges) {
    const entry = cases.find(e => `${e.kind}:${e.family}@${e.profile}/${e.viewport.id}/${e.state}` === observation.case);
    const input = entry.styleInputs.find(i => i.id === observation.element);
    const [r, a] = modalInventoryTrees(inventory, observation.case);
    const enabled = structuredClone(a);
    enabled.nodes.find(n => n.key === observation.astylarNode).authored.disabled = false;
    assert.throws(() => proveControlStatePaint(entry, input, r, enabled, normalize));
    const authored = structuredClone(r);
    authored.nodes.find(n => n.key === observation.referenceNode).inline.background = { value: 'transparent', important: false };
    assert.throws(() => proveControlStatePaint(entry, input, authored, a, normalize));
    const visible = structuredClone(input);
    visible.astylar.opacity = '1';
    assert.throws(() => proveControlStatePaint(entry, visible, r, a, normalize));
  }
  const tabs = observations.filter(o => o.element.startsWith('tab-'));
  assert.deepEqual(['0', '0.04', '0.12'].map(opacity => tabs.filter(o => o.nativeLayerOpacity === opacity).length), [8, 26, 8]);
  const cancel = observations.filter(o => o.element === 'dialog-cancel');
  assert.deepEqual(['0.08', '0.12'].map(opacity => cancel.filter(o => o.nativeLayerOpacity === opacity).length), [3, 5]);
  assert.equal(observations.filter(o => o.element === 'card-open').length, 24);
  assert.equal(observations.filter(o => o.element === 'card-primary').length, 13);
  const toolbar = observations.filter(o => o.element === 'toolbar-action');
  assert.equal(toolbar.length, 24); assert.ok(toolbar.every(o => o.candidateAuthoredRuleProjectionGaps.length === 1));
  assert.equal(toolbar.filter(o => o.candidateMatchedStateRules.length === 2).length, 8);
  assert.equal(observations.filter(o => o.nativeOwnPaintRequestAbsent).length, 172);
  assert.equal(observations.filter(o => o.nativeBackdrop).length, 25);
  assert.equal(observations.filter(o => o.candidateFillUnconditional).length, 25);
  assert.equal(observations.filter(o => o.flow).length, 24);
  const toggles = observations.filter(o => o.nativeFocusLayer);
  assert.equal(toggles.length, 24); assert.equal(toggles.filter(o => o.nativeRipples.length === 1).length, 8);
  assert.deepEqual(['rgb(29, 27, 32)', 'rgb(230, 225, 229)'].map(color =>
    toggles.filter(o => o.nativeLayerBackground === color).length), [18, 6]);
  const metadata = new Set(['classification', 'attribution', 'recommendedOwner', 'justification', 'reviewEvidence', 'reviewedCases']);
  const raw = row => Object.fromEntries(Object.entries(row).filter(([key]) => !metadata.has(key)));
  stepperResult.forEach((r, i) => assert.deepEqual(raw(r), raw(stepperRows[i])));
  for (let i = 0; i < rows.length; i++) {
    assert.deepEqual(raw(result[i]), raw(rows[i]));
    if (!reviewed.includes(result[i])) assert.deepEqual(result[i], rows[i]);
    else assert.equal(result[i].reviewEvidence.originalRowSha256, hash(JSON.stringify(rows[i])));
  }
  for (const element of ['tab-activity', 'card-open', 'dialog-cancel', 'card-primary', 'toolbar-action', 'grid-tile-one', 'button-toggle-primary',
    'bottom-sheet-dismiss', 'bottom-sheet-overlay', 'divider-primary', 'button-toggle-two']) {
    const observation = observations.find(o => o.element === element);
    const entry = cases.find(e => `${e.kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}` === observation.case);
    const input = entry.styleInputs.find(i => i.id === element);
    const [r, a] = modalInventoryTrees(inventory, observation.case);
    const altered = structuredClone(a);
    altered.nodes.find(n => n.key === observation.astylarNode).resolvedStyle.background = '#000000';
    assert.throws(() => proveControlStatePaint(entry, input, r, altered, normalize));
    const changedRules = structuredClone(a);
    const selector = element === 'card-primary' ? '.material-card' : observation.candidatePaintRequest?.selector ?? observation.candidateMatchedStateRules[0].selector;
    changedRules.rules.find(rule => rule.selector === selector).background = '#000000';
    assert.throws(() => proveControlStatePaint(entry, input, r, changedRules, normalize));
    if (observation.nativeLayer) {
      const changedNative = structuredClone(r);
      const layer = changedNative.nodes.find(n => n.key === observation.nativeLayer);
      changedNative.styles[layer.pseudoElements.find(p => p.pseudo === '::before').style].opacity = '0.5';
      assert.throws(() => proveControlStatePaint(entry, input, changedNative, a, normalize));
    }
    if (observation.nativeOwnPaintRequestAbsent) {
      const changedNative = structuredClone(r);
      changedNative.nodes.find(n => n.key === observation.referenceNode).inline.background = { value: 'white', important: false };
      assert.throws(() => proveControlStatePaint(entry, input, changedNative, a, normalize));
    }
    if (observation.nativeBackdrop) {
      const changedNative = structuredClone(r);
      changedNative.styles[changedNative.nodes.find(n => n.key === observation.nativeBackdrop).style].opacity = '0.5';
      assert.throws(() => proveControlStatePaint(entry, input, changedNative, a, normalize));
    }
    if (observation.nativeFocusLayer) {
      const changedNative = structuredClone(r);
      changedNative.styles[changedNative.nodes.find(n => n.key === observation.nativeFocusLayer).style].opacity = '0.5';
      assert.throws(() => proveControlStatePaint(entry, input, changedNative, a, normalize));
    }
  }
  const incomplete = structuredClone(rows), changedIndex = rows.findIndex(r => r.element === reviewed[0].element && r.property === 'backgroundColor' && r.attribution === 'unresolved');
  incomplete[changedIndex].occurrences++;
  assert.throws(() => applyControlStatePaintReview(incomplete, cases, inventory, normalize));
  const currentSnapshot = { generation: '04ec615b0e97cdc75f44b817efca421d24a79cb04d7bc1f2f22969b99a4c4240',
    indexSha256: '7698638b57da8d8c8f4bf50902886f11c3d3304e45078771917b804c6c30a075' };
  const allRows = [...new Set(cases.map(e => e.family))].flatMap(f =>
    queryFindings('artifacts/material-parity/working-audit', f, currentSnapshot)).filter(r => r.evidence.section === 'discrepancies');
  const sources = collectPaintReviewSources();
  const combined = applyPaintReviews(allRows, cases, inventory, retained, normalize, sources);
  const changed = combined.filter((r, i) => r !== allRows[i]);
  assert.equal(changed.length, 72); assert.equal(changed.reduce((n, r) => n + r.occurrences, 0), 618);
  const population = {};
  for (const row of changed) {
    const count = population[row.attribution] ??= { groups: 0, observations: 0 };
    count.groups++; count.observations += row.occurrences;
  }
  assert.deepEqual(population, paintPopulation);
  combined.forEach((r, i) => { assert.deepEqual(raw(r), raw(allRows[i])); if (!isPaintReviewRow(r)) assert.deepEqual(r, allRows[i]); });
  assert.deepEqual(validatePaintReviews(JSON.parse(JSON.stringify(combined)), allRows, cases, inventory, retained, normalize, sources), []);
  assert.ok(validatePaintReviews(combined.filter(r => r !== changed[0]), allRows, cases, inventory, retained, normalize, sources).length);
  const fabricated = structuredClone(combined);
  fabricated.find(isPaintReviewRow).reviewEvidence.renderingEquivalent = true;
  assert.ok(validatePaintReviews(fabricated, allRows, cases, inventory, retained, normalize, sources).length);
});
