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
import { proveFocusShadowSubstitution, applyFocusShadowSubstitutions, validateFocusShadowSubstitutions } from './control-state-paint-review.mjs';
import { proveCardShadowSyntax, applyCardShadowSyntax, validateCardShadowSyntax } from './control-state-paint-review.mjs';
import { proveMappedNonwidgetAppearance, applyMappedNonwidgetAppearance, validateMappedNonwidgetAppearance } from './control-state-paint-review.mjs';
import { proveRangeAppearanceInitial, applyRangeAppearanceInitial, validateRangeAppearanceInitial } from './control-state-paint-review.mjs';

test('range initial appearance binds all 156 hidden original range owners without claiming none support', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'),
    'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const report = JSON.parse(bytes);
  const cases = [...report.results.map(e => ({ ...e, kind: 'static' })),
    ...report.interactions.map(e => ({ ...e, kind: 'interaction' }))].filter(e => e.family === 'slider');
  const inventory = collectFullTreeInventory(cases), normalize = bindPreciseAuditNormalization();
  const rows = queryFindings('artifacts/material-parity/working-audit', 'slider', {
    generation: '8fbd2e22dfd801587ce6c1dce90e6daba668171ae26eae0a9c834142a8bd0a43',
    indexSha256: '6f86d55a6ea6be0f1533ac893579bf517769061ed25a13812b0370c46b7c06e6',
  }).filter(r => r.evidence.section === 'discrepancies').map(({ id, evidence, ...row }) => row);
  const applied = applyRangeAppearanceInitial(rows, cases, inventory, normalize);
  const changed = applied.filter(r => r.attribution === 'reviewed-range-appearance-initial-request');
  assert.equal(changed.length, 2); assert.deepEqual(changed.map(r => r.occurrences), [78, 78]);
  const metadata = new Set(['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']);
  const raw = r => Object.fromEntries(Object.entries(r).filter(([key]) => !metadata.has(key)));
  assert.deepEqual(applied.map(raw), rows.map(raw));
  for (let i = 0; i < rows.length; i++) if (!changed.includes(applied[i])) assert.deepEqual(applied[i], rows[i]);
  assert.deepEqual(validateRangeAppearanceInitial(applied, rows, cases, inventory, normalize), []);
  const forged = structuredClone(applied);
  forged.find(r => r.attribution === 'reviewed-range-appearance-initial-request').reviewedCases.pop();
  assert.equal(validateRangeAppearanceInitial(forged, rows, cases, inventory, normalize).length, 1);
  const entry = cases[0], key = `${entry.kind}:slider@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`;
  for (const element of ['slider-start', 'slider-primary']) {
    const original = modalInventoryTrees(inventory, key), proof = proveRangeAppearanceInitial(entry, ...original, element);
    assert.equal(proof.inputEquivalent, false); assert.equal(proof.renderingEquivalent, false);
    assert.match(proof.separateSupportGap, /explicit none/);
    for (const mutation of [
      (r, a) => { a.nodes.find(n => n.key === proof.astylarNode).authored.inputType = 'text'; },
      (r, a) => { a.rules.push({ selector: '#' + element, appearance: 'none' }); },
      (r, a) => { a.nodes.find(n => n.key === proof.astylarNode).normalResolvedStyle.appearance = 'auto'; },
      r => { r.ruleEvidenceComplete = false; },
      r => { r.styles[r.nodes.find(n => n.key === proof.referenceNode).style].opacity = '1'; },
    ]) {
      const pair = structuredClone(original); mutation(...pair);
      assert.throws(() => proveRangeAppearanceInitial(entry, ...pair, element));
    }
  }
});

test('mapped nonwidget appearance retains alias gaps and unchanged public evidence for all 111 observations', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'),
    'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const report = JSON.parse(bytes), families = ['bottom-sheet', 'snack-bar', 'tooltip'];
  const cases = [...report.results.map(e => ({ ...e, kind: 'static' })),
    ...report.interactions.map(e => ({ ...e, kind: 'interaction' }))].filter(e => families.includes(e.family));
  const inventory = collectFullTreeInventory(cases), normalize = bindPreciseAuditNormalization();
  const rows = families.flatMap(family => queryFindings('artifacts/material-parity/working-audit', family, {
    generation: '8fbd2e22dfd801587ce6c1dce90e6daba668171ae26eae0a9c834142a8bd0a43',
    indexSha256: '6f86d55a6ea6be0f1533ac893579bf517769061ed25a13812b0370c46b7c06e6',
  })).filter(r => r.evidence.section === 'discrepancies').map(({ id, evidence, ...row }) => row);
  const applied = applyMappedNonwidgetAppearance(rows, cases, inventory, normalize);
  const changed = applied.filter(r => r.attribution === 'reviewed-mapped-nonwidget-appearance-initial-request');
  assert.deepEqual(changed.map(r => [r.element, r.occurrences]), [
    ['bottom-sheet-overlay', 25], ['snack-bar-overlay', 34], ['snack-bar-surface', 34], ['tooltip-popup', 18],
  ]);
  const metadata = new Set(['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']);
  const raw = r => Object.fromEntries(Object.entries(r).filter(([key]) => !metadata.has(key)));
  assert.deepEqual(applied.map(raw), rows.map(raw));
  for (let i = 0; i < rows.length; i++) if (!changed.includes(applied[i])) assert.deepEqual(applied[i], rows[i]);
  assert.deepEqual(validateMappedNonwidgetAppearance(applied, rows, cases, inventory, normalize), []);
  const forged = structuredClone(applied); forged.find(r => changed.some(c => c.element === r.element && c.property === r.property))
    .reviewEvidence.observations[0].mapping.missingRules = [];
  assert.equal(validateMappedNonwidgetAppearance(forged, rows, cases, inventory, normalize).length, 1);
  for (const row of changed) {
    const key = row.reviewedCases[0], entry = cases.find(e =>
      `${e.kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}` === key);
    const original = modalInventoryTrees(inventory, key), proof = proveMappedNonwidgetAppearance(entry, ...original, row.element);
    assert.equal(proof.inputEquivalent, false); assert.equal(proof.renderingEquivalent, false);
    for (const mutation of [
      (r, a) => { a.nodes.find(n => n.key === proof.astylarNode).authored.type = 'button'; },
      (r, a) => { a.rules.push({ selector: '#' + row.element, appearance: 'none' }); },
      (r, a) => { a.rules.push({ selector: '#' + row.element, transition: 'all 1s' }); },
      r => { r.ruleEvidenceComplete = false; },
      r => { r.nodes.find(n => n.key === proof.referenceNode).inline.all = { value: 'initial', important: false }; },
    ]) {
      const pair = structuredClone(original); mutation(...pair);
      assert.throws(() => proveMappedNonwidgetAppearance(entry, ...pair, row.element));
    }
  }
});

test('focus shadow substitution binds every original owner and rejects altered outline or state evidence', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'),
    'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const report = JSON.parse(bytes), families = ['core', 'button', 'menu', 'bottom-sheet', 'dialog', 'snack-bar', 'tooltip'];
  const cases = [...report.results.map(e => ({ ...e, kind: 'static' })),
    ...report.interactions.map(e => ({ ...e, kind: 'interaction' }))].filter(e => families.includes(e.family));
  const inventory = collectFullTreeInventory(cases), normalize = bindPreciseAuditNormalization();
  assert.deepEqual(inventory.errors, []);
  const rows = families.flatMap(family => queryFindings('artifacts/material-parity/working-audit', family, {
    generation: '8fbd2e22dfd801587ce6c1dce90e6daba668171ae26eae0a9c834142a8bd0a43',
    indexSha256: '6f86d55a6ea6be0f1533ac893579bf517769061ed25a13812b0370c46b7c06e6',
  })).filter(r => r.evidence.section === 'discrepancies').map(({ id, evidence, ...row }) => row);
  const applied = applyFocusShadowSubstitutions(rows, cases, inventory, normalize);
  const changed = applied.filter(r => r.attribution === 'reviewed-focus-outline-shadow-substitution');
  assert.deepEqual(Object.fromEntries(changed.map(r => [r.family, r.occurrences])),
    { core: 32, button: 32, menu: 50, 'bottom-sheet': 43, dialog: 16, 'snack-bar': 51, tooltip: 41 });
  assert.equal(changed.reduce((n, r) => n + r.occurrences, 0), 265);
  const metadata = new Set(['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']);
  const raw = r => Object.fromEntries(Object.entries(r).filter(([key]) => !metadata.has(key)));
  assert.deepEqual(applied.map(raw), rows.map(raw));
  for (let i = 0; i < rows.length; i++) if (!changed.includes(applied[i])) assert.deepEqual(applied[i], rows[i]);
  assert.deepEqual(validateFocusShadowSubstitutions(applied, rows, cases, inventory, normalize), []);
  const forged = structuredClone(applied);
  forged.find(r => r.attribution === 'reviewed-focus-outline-shadow-substitution').reviewedCases.pop();
  assert.equal(validateFocusShadowSubstitutions(forged, rows, cases, inventory, normalize).length, 1);
  assert.throws(() => applyFocusShadowSubstitutions(rows, cases.filter(e => e.family !== 'core'), inventory, normalize));
  const first = changed[0].reviewedCases[0], entry = cases.find(e =>
    `${e.kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}` === first);
  const original = modalInventoryTrees(inventory, first);
  const mutate = change => {
    const pair = structuredClone(original); change(...pair);
    assert.throws(() => proveFocusShadowSubstitution(entry, ...pair));
  };
  mutate((r, a) => { a.ruleEvidenceComplete = false; });
  mutate((r, a) => { a.nodes.find(n => n.authored?.id === 'core-primary').normalResolvedStyle.boxShadow = 'none'; });
  mutate((r, a) => { a.rules.find(rule => rule.selector === '.material-button:focus').boxShadow = 'none'; });
  mutate((r, a) => { a.rules.push({ selector: '.material-button:focus', outline: 'none' }); });
  mutate(r => { r.rules.find(rule => rule.selector === '.mdc-button').declarations['outline-style'].value = 'solid'; });
  mutate(r => { r.nodes.push(structuredClone(r.nodes.find(n => n.attributes?.id === 'core-primary'))); });
});

test('public range appearance separates initial auto equivalence from unsupported none paint', async () => {
  const { build } = await import('esbuild'), { createServer } = await import('node:http');
  const { resolve } = await import('node:path'), { chromium } = await import('playwright-core');
  const { PNG } = await import('pngjs'), { default: ts } = await import('typescript');
  const installed = readFileSync('examples/material-showcase/node_modules/astylarui/dist/lib/app/services/dom/input/range.manager.js', 'utf8');
  assert.equal(createHash('sha256').update(installed.replaceAll('\r\n', '\n')).digest('hex'),
    '07e99a20d6effa8434b9efdf49d720d5774258dea5e71e056f3d28ca82fdce5a');
  const compiled = ts.transpileModule(readFileSync('src/app/services/dom/input/range.manager.ts', 'utf8'),
    { compilerOptions: { target: ts.ScriptTarget.ES2022, experimentalDecorators: true } }).outputText;
  const method = s => {
    const start = s.indexOf('    createRange('), end = s.indexOf('    setValue(', start);
    assert.ok(start > 0 && end > start); return s.slice(start, end).replace(/\s+/g, ' ').trim();
  };
  assert.equal(method(compiled), method(installed));
  let source = readFileSync('examples/material-showcase/audit/range-drag.mjs', 'utf8');
  const replace = (from, to) => { assert.equal(source.split(from).length, 2); source = source.replace(from, to); };
  replace("document.body.style.cssText =", `site.styles.push({ selector: 'input', zIndex: '1', background: 'transparent', opacity: query.get('opacity') ?? '1',
    ...(query.get('appearance') === 'omitted' ? {} : { appearance: query.get('appearance') }) });
document.body.style.cssText =`);
  replace('return { mode, translated, stackTracing, site:', `return { nativeAppearance: mode === 'reference' ? getComputedStyle(document.getElementById('first')).appearance : null,
    mode, translated, stackTracing, site:`);
  const built = await build({ stdin: { contents: source, resolveDir: resolve('examples/material-showcase/audit'), sourcefile: 'range-appearance-diagnostic.mjs' },
    bundle: true, write: false, format: 'esm', platform: 'browser', target: 'es2022', metafile: true });
  assert.ok(Object.keys(built.metafile.inputs).some(p => p.includes('node_modules/astylarui/')));
  assert.ok(!Object.keys(built.metafile.inputs).some(p => /^src\//.test(p)));
  const server = createServer((req, res) => {
    res.setHeader('Content-Type', req.url === '/audit.js' ? 'text/javascript' : 'text/html');
    res.end(req.url === '/audit.js' ? built.outputFiles[0].contents : '<!doctype html><script type="module" src="/audit.js"></script>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    for (const dpr of [1, 2]) {
      const samples = {};
      for (const mode of ['reference', 'astylar']) {
        samples[mode] = [];
        for (const [appearance, opacity] of [['omitted', '1'], ['auto', '1'], ['none', '1'], ['auto', '0']]) {
          const page = await browser.newPage({ viewport: { width: 480, height: 180 }, deviceScaleFactor: dpr });
          const errors = []; page.on('pageerror', e => errors.push(e.message));
          try {
            await page.goto(`http://127.0.0.1:${server.address().port}/?mode=${mode}&appearance=${appearance}&opacity=${opacity}`);
            await page.waitForFunction(() => !!window.rangeDragAudit);
            await page.evaluate(() => window.rangeDragAudit.settle()); await page.waitForTimeout(250);
            const snapshot = await page.evaluate(() => window.rangeDragAudit.snapshot());
            assert.deepEqual(errors, []);
            assert.deepEqual(snapshot.controls.map(c => c.type), ['range', 'range']);
            if (mode === 'astylar') {
              assert.deepEqual(snapshot.diagnostics.messages.filter(m => m.severity === 'error'), []);
              const first = snapshot.resolved.elements.find(e => e.id === 'first');
              assert.equal(first.normal.appearance, appearance === 'omitted' ? undefined : appearance);
              assert.equal(first.effective.appearance, first.normal.appearance);
            } else assert.equal(snapshot.nativeAppearance, appearance === 'omitted' ? 'auto' : appearance);
            samples[mode].push({ snapshot, pixels: PNG.sync.read(await page.screenshot()).data });
            await page.evaluate(() => window.rangeDragAudit.dispose());
          } finally { await page.close(); }
        }
      }
      for (let i = 0; i < 4; i++) assert.deepEqual(samples.reference[i].snapshot.site, samples.astylar[i].snapshot.site);
      for (const mode of ['reference', 'astylar']) {
        assert.equal(samples[mode][0].pixels.equals(samples[mode][1].pixels), true, `${mode}: omitted matches auto`);
        assert.equal(samples[mode][1].pixels.equals(samples[mode][3].pixels), false, `${mode}: opacity sensitivity rejects invisible controls`);
      }
      assert.equal(samples.reference[1].pixels.equals(samples.reference[2].pixels), false, 'native none changes range paint');
      assert.equal(samples.astylar[1].pixels.equals(samples.astylar[2].pixels), true, 'core range currently ignores none');
    }
  } finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
});

test('public button focus distinguishes none from transparent shadow without changing native outline', async () => {
  const { build } = await import('esbuild');
  const { createServer } = await import('node:http');
  const { resolve } = await import('node:path');
  const { chromium } = await import('playwright-core');
  const { PNG } = await import('pngjs');
  const { default: ts } = await import('typescript');
  const installedPath = 'examples/material-showcase/node_modules/astylarui/dist/lib/lib/astylar.js';
  const installed = readFileSync(installedPath, 'utf8');
  assert.equal(createHash('sha256').update(installed).digest('hex'),
    '6ad4f51ca47a9e1956a66b6e724105a66aaff582c53b0b30374fb6051723f5f8');
  const compiled = ts.transpileModule(readFileSync('src/lib/astylar.ts', 'utf8'),
    { compilerOptions: { target: ts.ScriptTarget.ES2022, experimentalDecorators: true } }).outputText;
  const focusMethod = value => {
    const start = value.indexOf('    configureFocusIndicator(elementId, siteData) {');
    const end = value.indexOf('    setElementPseudoState(', start);
    assert.ok(start > 0 && end > start);
    return value.slice(start, end).replace(/\s+/g, ' ').trim();
  };
  assert.equal(focusMethod(compiled), focusMethod(installed), 'installed focus decision matches source');
  let source = readFileSync('examples/material-showcase/audit/button-pointer-focus.mjs', 'utf8');
  const replace = (from, to) => {
    assert.equal(source.split(from).length, 2, `unique public reduction anchor: ${from}`);
    source = source.replace(from, to);
  };
  replace('const children =', "styles.push({ selector: 'button:focus', boxShadow: new URLSearchParams(location.search).get('shadow') });\nconst children =");
  replace("display: 'block', boxSizing:", "zIndex: new URLSearchParams(location.search).get('z'), display: 'block', boxSizing:");
  replace('return { mode, authored: site,', `return { meshEvidence: surface?.scene.meshes.map(m => ({ name:m.name, enabled:m.isEnabled(), visible:m.isVisible, position:m.getAbsolutePosition().asArray(), color:m.material?.emissiveColor?.asArray() })), indicators: surface?.scene.meshes.filter(m => m.name.startsWith('focusIndicator_first_') && m.isVisible).map(m => ({ name: m.name, alpha: m.material?.alpha })),
      nativeOutline: mode === 'reference' ? getComputedStyle(document.getElementById('first')).outline : null,
      authored: site, mode,`);
  const built = await build({ stdin: { contents: source, resolveDir: resolve('examples/material-showcase/audit'),
    sourcefile: 'focus-shadow-diagnostic.mjs' }, bundle: true, write: false, format: 'esm',
    platform: 'browser', target: 'es2022', metafile: true });
  const packageInputs = Object.keys(built.metafile.inputs).filter(p => p.includes('node_modules/astylarui/'));
  assert.ok(packageInputs.length > 0, 'public root import must resolve the installed package');
  assert.ok(!Object.keys(built.metafile.inputs).some(p => /^src\//.test(p)), 'no renderer source deep imports');
  const bundle = built.outputFiles[0].contents;
  const server = createServer((req, res) => {
    res.setHeader('Content-Type', req.url === '/audit.js' ? 'text/javascript' : 'text/html');
    res.end(req.url === '/audit.js' ? bundle : '<!doctype html><script type="module" src="/audit.js"></script>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    for (const dpr of [1, 2]) for (const z of ['0', '1']) {
      const samples = {};
      for (const mode of ['reference', 'astylar']) {
        samples[mode] = [];
        for (const shadow of ['none', '0 0 0 1px rgba(0,0,0,0)']) {
          const page = await browser.newPage({ viewport: { width: 440, height: 200 }, deviceScaleFactor: dpr });
          const errors = []; page.on('pageerror', error => errors.push(error.message));
          try {
            await page.goto(`http://127.0.0.1:${server.address().port}/?mode=${mode}&z=${z}&shadow=${encodeURIComponent(shadow)}`);
            await page.waitForFunction(() => !!window.buttonFocusAudit);
            await page.evaluate(() => window.buttonFocusAudit.settle());
            await page.keyboard.press('Tab');
            await page.evaluate(() => window.buttonFocusAudit.settle());
            await page.waitForTimeout(250); // Match the existing public focus reduction's capture boundary.
            const snapshot = await page.evaluate(() => window.buttonFocusAudit.snapshot());
            assert.deepEqual(errors, []); assert.equal(snapshot.authoredUnchanged, true);
            assert.equal(snapshot.activeButton, 'first');
            assert.ok(snapshot.nativeEvents.some(e => e.type === 'keydown' && e.key === 'Tab' && e.trusted));
            if (mode === 'astylar') assert.deepEqual(snapshot.diagnostics.messages.filter(m => m.severity === 'error'), []);
            samples[mode].push({ snapshot, pixels: PNG.sync.read(await page.screenshot()).data });
            await page.evaluate(() => window.buttonFocusAudit.dispose());
          } finally { await page.close(); }
        }
      }
      const [rn, rt] = samples.reference, [an, at] = samples.astylar;
      for (let i = 0; i < 2; i++) assert.deepEqual(samples.reference[i].snapshot.authored, samples.astylar[i].snapshot.authored);
      assert.equal(rn.snapshot.nativeOutline, rt.snapshot.nativeOutline);
      assert.doesNotMatch(rn.snapshot.nativeOutline, /\bnone\b/);
      assert.equal(rn.pixels.equals(rt.pixels), true, 'native focus pixels retain the same outline');
      assert.equal(an.snapshot.indicators.length, 8, 'none retains the two four-edge core fallback rings');
      assert.deepEqual(at.snapshot.indicators, [], 'transparent shadow disables fallback');
      const owner = an.snapshot.meshEvidence.find(m => m.name === 'first');
      const ring = an.snapshot.meshEvidence.find(m => m.name.startsWith('focusIndicator_'));
      assert.ok(Math.abs(ring.position[2] - owner.position[2] + .02) < 1e-6);
      console.log(JSON.stringify({ dpr, z, equalPixels: an.pixels.equals(at.pixels),
        focusDepth: ring.position[2], ownerDepth: owner.position[2] }));
      assert.equal(an.pixels.equals(at.pixels), z === '0', 'explicit stacking separates focus paint from the baseline occlusion');
    }
  } finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
});

test('card shadow serialization preserves all original layers and browser pixels', async () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'),
    'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const report = JSON.parse(bytes);
  const cases = [...report.results.map(e => ({ ...e, kind: 'static' })),
    ...report.interactions.map(e => ({ ...e, kind: 'interaction' }))].filter(e => e.family === 'card');
  const inventory = collectFullTreeInventory(cases), normalize = bindPreciseAuditNormalization();
  const rows = queryFindings('artifacts/material-parity/working-audit', 'card', {
    generation: '8fbd2e22dfd801587ce6c1dce90e6daba668171ae26eae0a9c834142a8bd0a43',
    indexSha256: '6f86d55a6ea6be0f1533ac893579bf517769061ed25a13812b0370c46b7c06e6',
  }).filter(r => r.evidence.section === 'discrepancies').map(({ id, evidence, ...row }) => row);
  const applied = applyCardShadowSyntax(rows, cases, inventory, normalize);
  assert.equal(applied.filter((r, i) => r !== rows[i]).length, 1);
  const changed = applied.find(r => r.attribution === 'reviewed-card-shadow-layer-serialization');
  assert.equal(changed.occurrences, 52); assert.equal(changed.reviewedCases.length, 52);
  assert.deepEqual(validateCardShadowSyntax(applied, rows, cases, inventory, normalize), []);
  const forged = structuredClone(applied);
  forged.find(r => r.attribution === 'reviewed-card-shadow-layer-serialization').reviewedCases.pop();
  assert.equal(validateCardShadowSyntax(forged, rows, cases, inventory, normalize).length, 1);
  const first = cases[0], pair = modalInventoryTrees(inventory,
    `${first.kind}:card@${first.profile}/${first.viewport.id}${first.state ? '/' + first.state : ''}`);
  pair[1].rules.find(r => r.selector === '.material-card').boxShadow = 'none';
  assert.throws(() => proveCardShadowSyntax(first, ...pair, normalize));
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
  const families = [...Object.keys(owners), 'chips', 'tabs', 'slider', 'list', 'card', 'dialog', 'table', 'core', 'button', 'menu', 'snack-bar', 'tooltip'];
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
    'applyTableVisibleOverflow', 'applyControlOverflowOwnerBoundaries', 'applyRangeVisibleOverflow', 'applyFocusShadowSubstitutions', 'applyCardShadowSyntax', 'applyMappedNonwidgetAppearance', 'applyRangeAppearanceInitial', source.slice(start, end) + '\nreturn discrepancies;');
  const applies = [applyOwnerMaximumWidths, applyOmittedOwnerPaintRequests, applyBadgeMarginReviews, applySliderMarginReviews, applyListSpacingReviews, applyHeadingVisibleOverflow, applyTabPanelOverflowBoundary, applyTableVisibleOverflow, applyControlOverflowOwnerBoundaries, applyRangeVisibleOverflow, applyFocusShadowSubstitutions, applyCardShadowSyntax, applyMappedNonwidgetAppearance, applyRangeAppearanceInitial];
  const combined = tail({ status: 'bound' }, rows, cases, inventory, normalize, ...applies);
  assert.deepEqual(combined, [...applies].reverse().reduce((values, apply) => apply(values, cases, inventory, normalize), rows));
  const batch = combined.filter((r, i) => r !== rows[i]);
  assert.equal(batch.length, 46); assert.equal(batch.reduce((sum, r) => sum + r.occurrences, 0), 2563);
  assert.deepEqual(combined.map(raw), rows.map(raw));
  for (let i = 0; i < rows.length; i++) if (!batch.includes(combined[i])) assert.deepEqual(combined[i], rows[i]);
  assert.deepEqual(validate(combined), []);
  assert.deepEqual(validateOwnerMaximumWidths(combined, rows, cases, inventory, normalize), []);
  for (const validate of [validateBadgeMarginReviews, validateSliderMarginReviews, validateListSpacingReviews, validateHeadingVisibleOverflow, validateTabPanelOverflowBoundary, validateTableVisibleOverflow, validateControlOverflowOwnerBoundaries, validateRangeVisibleOverflow, validateFocusShadowSubstitutions, validateCardShadowSyntax, validateMappedNonwidgetAppearance, validateRangeAppearanceInitial])
    assert.deepEqual(validate(combined, rows, cases, inventory, normalize), []);
  assert.equal(tail({ status: 'unbound' }, rows, cases, inventory, normalize,
    ...applies.map(() => () => assert.fail('unbound owner review ran'))), rows);
  for (const name of ['validateOwnerMaximumWidths', 'validateOmittedOwnerPaintRequests', 'validateBadgeMarginReviews', 'validateSliderMarginReviews', 'validateListSpacingReviews', 'validateHeadingVisibleOverflow', 'validateTabPanelOverflowBoundary', 'validateTableVisibleOverflow', 'validateControlOverflowOwnerBoundaries', 'validateRangeVisibleOverflow', 'validateFocusShadowSubstitutions', 'validateCardShadowSyntax', 'validateMappedNonwidgetAppearance', 'validateRangeAppearanceInitial'])
    assert.ok(source.includes(`errors.push(...${name}(report.discrepancies, replayedRows, cases, report.elementInventory, canonicalStyle));`));
  assert.ok(source.includes("errors.push('owner omission review attribution lacks bound original cases')"));
  assert.ok(source.includes("errors.push('spacing composition review attribution lacks bound original cases')"));
  assert.ok(source.includes("errors.push('heading and tab overflow attribution lacks bound original cases')"));
  assert.ok(source.includes("errors.push('table and control overflow attribution lacks bound original cases')"));
  assert.ok(source.includes("errors.push('shadow attribution lacks bound original cases')"));
  assert.ok(source.includes("errors.push('mapped non-widget appearance attribution lacks bound original cases')"));
  assert.ok(source.includes("errors.push('range appearance attribution lacks bound original cases')"));
  const currentRows = families.flatMap(family => queryFindings('artifacts/material-parity/working-audit', family, {
    generation: '8fbd2e22dfd801587ce6c1dce90e6daba668171ae26eae0a9c834142a8bd0a43',
    indexSha256: '6f86d55a6ea6be0f1533ac893579bf517769061ed25a13812b0370c46b7c06e6',
  })).filter(r => r.evidence.section === 'discrepancies').map(({ id, evidence, ...row }) => row);
  const currentApplied = tail({ status: 'bound' }, currentRows, cases, inventory, normalize, ...applies);
  const currentBatch = currentApplied.filter((r, i) => r !== currentRows[i]);
  assert.equal(currentBatch.length, 26); assert.equal(currentBatch.reduce((n, r) => n + r.occurrences, 0), 1436);
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
