import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright-core';
import { PNG } from 'pngjs';
import { ssim } from 'ssim.js';
import {
  materialAbsoluteTextAlignmentTargets, materialFamilies, materialFocusedRasterTargets, materialInteractionCases, materialInteractionFocusedRasterTargets, materialInteractionTextAlignmentTargets, materialMobileFlowCases, materialProfiles,
  materialLeftAlignedTextTargets, materialSemanticExcludedTargets, materialShadowProfileTargets, materialStaticCases, materialTextAlignmentTargets, materialTextAlignmentToleranceOverrides, materialTextAuditTargets, materialTextOnlyTargets, materialThresholds, materialUniformBackgroundTargets,
} from './benchmark.config.mjs';
import { measureTextInkCenter, textCenterOffsetError } from './text-alignment-metrics.mjs';
import { compareBottomShadowProfiles } from './shadow-profile-metrics.mjs';
import { effectiveBrowserCursor, interactionLayerCursorProbe } from './cursor-metrics.mjs';

const root = process.cwd();
const enforce = process.argv.includes('--enforce');
const skipBuild = process.argv.includes('--skip-build');
const artifacts = path.join(root, 'artifacts', 'material-parity');
const showcaseRoot = path.join(root, 'examples', 'material-showcase');
const browserRoot = path.join(showcaseRoot, 'dist', 'material-showcase', 'browser');
const port = Number(process.env['ASTYLAR_MATERIAL_PARITY_PORT'] ?? 4431);
const baseUrl = `http://127.0.0.1:${port}`;
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const familyFilter = csvFilter('ASTYLAR_MATERIAL_FAMILIES', materialFamilies);
const profileFilter = csvFilter('ASTYLAR_MATERIAL_PROFILES', materialProfiles);
const viewportFilter = new Set((process.env['ASTYLAR_MATERIAL_VIEWPORTS'] ?? '').split(',').filter(Boolean));
const interactionViewportFilter = new Set((process.env['ASTYLAR_MATERIAL_INTERACTION_VIEWPORTS'] ?? '').split(',').filter(Boolean));
const interactionStateFilter = new Set((process.env['ASTYLAR_MATERIAL_INTERACTION_STATES'] ?? '').split(',').filter(Boolean));
const staticOnly = process.argv.includes('--static-only');
const interactionOnly = process.argv.includes('--interaction-only');
const textAudit = process.env['ASTYLAR_MATERIAL_TEXT_AUDIT'] === '1';
const browserRestartInterval = Number(process.env['ASTYLAR_MATERIAL_BROWSER_RESTART_INTERVAL'] ?? 200);
const cases = interactionOnly ? [] : materialStaticCases.filter(({ family, profile, viewport }) =>
  familyFilter.has(family) && profileFilter.has(profile) &&
  (viewportFilter.size === 0 || viewportFilter.has(viewport.id)));
const interactionCases = staticOnly ? [] : materialInteractionCases.filter(({ family, profile, viewport, state }) =>
  familyFilter.has(family) && profileFilter.has(profile) &&
  (interactionViewportFilter.size === 0 || interactionViewportFilter.has(viewport.id)) &&
  (interactionStateFilter.size === 0 || interactionStateFilter.has(state)));
const mobileFlowCases = staticOnly ? [] : materialMobileFlowCases.filter(({ family, profile }) =>
  familyFilter.has(family) && profileFilter.has(profile) &&
  (interactionStateFilter.size === 0 || interactionStateFilter.has('open-dismiss')));
let browser;
let server;

try {
  validateConfiguration();
  mkdirSync(artifacts, { recursive: true });
  if (!skipBuild) buildShowcase();
  server = startStaticServer();
  await waitForServer();
  browser = await launchBrowser();
  const results = [];
  for (const [index, benchmarkCase] of cases.entries()) {
    await recycleBrowserIfNeeded(index);
    console.log(`Material parity: ${benchmarkCase.family}@${benchmarkCase.profile}/${benchmarkCase.viewport.id}`);
    results.push(await captureCase(benchmarkCase));
  }
  if (cases.length > 0 && (interactionCases.length > 0 || mobileFlowCases.length > 0)) {
    await restartBrowser();
  }
  const interactions = [];
  for (const [index, benchmarkCase] of [...interactionCases, ...mobileFlowCases].entries()) {
    await recycleBrowserIfNeeded(index);
    console.log(`Material interaction: ${benchmarkCase.family}@${benchmarkCase.profile}/${benchmarkCase.viewport.id}/${benchmarkCase.state}`);
    interactions.push(await captureInteractionCase(benchmarkCase));
  }
  const summary = summarize(results);
  const interactionSummary = summarizeInteractions(interactions);
  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    mode: enforce ? 'enforced' : 'report-only',
    browser: { name: 'Chromium', version: await browser.version() },
    thresholds: materialThresholds,
    configuredCases: materialStaticCases.length,
    executedCases: results.length,
    filters: {
      families: [...familyFilter], profiles: [...profileFilter],
      viewports: viewportFilter.size ? [...viewportFilter] : [...new Set(cases.map(({ viewport }) => viewport.id))],
    },
    summary,
    interactionSummary,
    results,
    interactions,
  };
  writeFileSync(path.join(artifacts, 'latest-report.json'), `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(path.join(artifacts, 'latest-summary.md'), humanSummary(report));
  console.log(humanSummary(report));
  if (enforce) {
    assert.equal(results.length, materialStaticCases.length,
      'An enforced Material parity run must execute the complete unfiltered matrix.');
    assert.equal(interactions.length, materialInteractionCases.length + materialMobileFlowCases.length,
      'An enforced Material parity run must execute the complete interaction matrix.');
    assert.equal(summary.meetsAcceptance, true,
      'Material parity remains below the existing geometry/SSIM/runtime acceptance thresholds.');
    assert.equal(interactionSummary.meetsAcceptance, true,
      'Material interaction parity remains below the required behavior/semantic/resource thresholds.');
  }
} finally {
  await browser?.close();
  await new Promise((resolve) => server?.close(resolve) ?? resolve());
}

function csvFilter(name, allowed) {
  const requested = (process.env[name] ?? '').split(',').filter(Boolean);
  const values = requested.length ? requested : allowed;
  for (const value of values) assert.ok(allowed.includes(value), `Unknown ${name} value: ${value}`);
  return new Set(values);
}

function benchmarkMeasurementIds(family) {
  const uniformBackground = materialUniformBackgroundTargets[family];
  return [...new Set([
    `${family}-root`,
    `${family}-primary`,
    ...textTargets(family), ...interactionTextTargets(family),
    ...(uniformBackground ? [uniformBackground.container, ...uniformBackground.surfaces] : []),
    ...(family === 'tooltip' ? ['tooltip-popup'] : []),
    ...(family === 'snack-bar' ? ['snack-bar-overlay', 'snack-bar-surface'] : []),
    ...(family === 'bottom-sheet' ? [
      'bottom-sheet-overlay', 'bottom-sheet-panel', 'bottom-sheet-dismiss', 'bottom-sheet-copy',
    ] : []),
    ...(family === 'dialog' ? [
      'dialog-panel', 'dialog-title', 'dialog-copy', 'dialog-actions', 'dialog-cancel', 'dialog-save',
    ] : []),
  ])];
}

function validateConfiguration() {
  const testRun = spawnSync(process.execPath, ['--test', 'tests/material-parity/benchmark-config.spec.mjs'], {
    cwd: root, stdio: 'inherit',
  });
  assert.equal(testRun.status, 0, 'Material benchmark configuration validation failed.');
  assert.ok(cases.length > 0 || interactionCases.length > 0 || mobileFlowCases.length > 0,
    'The Material benchmark filters selected no cases.');
  assert.ok(Number.isInteger(browserRestartInterval) && browserRestartInterval > 0,
    'ASTYLAR_MATERIAL_BROWSER_RESTART_INTERVAL must be a positive integer.');
}

function buildShowcase() {
  const prepare = spawnSync(npm, ['run', 'material-showcase:prepare'], {
    cwd: root, stdio: 'inherit', shell: process.platform === 'win32',
  });
  assert.equal(prepare.status, 0, 'Material showcase preparation failed.');
  const build = spawnSync(npm, ['run', 'build', '--', '--configuration', 'development'], {
    cwd: showcaseRoot, stdio: 'inherit', shell: process.platform === 'win32',
  });
  assert.equal(build.status, 0, 'Material showcase build failed.');
  assert.ok(existsSync(path.join(browserRoot, 'index.csr.html')), 'Material browser output is missing.');
}

function startStaticServer() {
  const index = path.join(browserRoot, 'index.csr.html');
  const instance = createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url ?? '/', baseUrl).pathname);
    const candidate = path.resolve(browserRoot, pathname.replace(/^\/+/, ''));
    const safe = candidate.startsWith(path.resolve(browserRoot));
    const target = safe && path.extname(candidate) && existsSync(candidate) ? candidate : index;
    const extension = path.extname(target);
    const contentType = extension === '.js' ? 'text/javascript' : extension === '.css' ? 'text/css' :
      extension === '.json' ? 'application/json' : extension === '.svg' ? 'image/svg+xml' :
        extension === '.woff2' ? 'font/woff2' : 'text/html';
    response.writeHead(200, { 'content-type': contentType, 'cache-control': 'no-store' });
    response.end(readFileSync(target));
  });
  instance.listen(port, '127.0.0.1');
  return instance;
}

async function waitForServer() {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try { if ((await fetch(baseUrl)).ok) return; } catch { /* retry */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('Timed out waiting for the Material showcase server.');
}

async function captureCase(benchmarkCase) {
  const { family, profile, viewport } = benchmarkCase;
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: viewport.deviceScaleFactor,
    colorScheme: profile === 'dark' ? 'dark' : 'light',
    reducedMotion: 'reduce',
  });
  const directory = path.join(artifacts, family, profile, viewport.id);
  mkdirSync(directory, { recursive: true });
  try {
    const reference = await capturePage(context, 'reference', benchmarkCase, directory);
    const astylar = await capturePage(context, 'astylar', benchmarkCase, directory);
    const screenshotSimilarity = comparePng(reference.image, astylar.image);
    const geometry = compareGeometry(reference.measurement.elements, astylar.measurement.elements, materialTextOnlyTargets);
    const textAlignment = compareTextAlignment(
      reference.image, astylar.image, reference.measurement.elements, astylar.measurement.elements,
      textTargets(family), viewport.deviceScaleFactor, directory,
    );
    const uniformBackgrounds = compareUniformBackgrounds(
      reference.image, astylar.image, reference.measurement.elements, astylar.measurement.elements,
      materialUniformBackgroundTargets[family], viewport.deviceScaleFactor,
    );
    const focusedRasterTarget = materialFocusedRasterTargets[family];
    const focusedRasters = focusedRasterTarget ? [compareFocusedRaster(
      reference.image, astylar.image, reference.measurement.elements,
      focusedRasterTarget, viewport.deviceScaleFactor, directory,
    )] : [];
    const shadowTarget = materialShadowProfileTargets[family];
    const shadowProfiles = shadowTarget ? [{
      id: shadowTarget.element,
      ...compareBottomShadowProfiles(
        reference.image, astylar.image,
        reference.measurement.elements[shadowTarget.element]?.borderBox,
        astylar.measurement.elements[shadowTarget.element]?.borderBox,
        viewport.deviceScaleFactor, shadowTarget.maximumRowError,
      ),
    }] : [];
    const semantics = compareSemantics(reference.measurement.semantics, astylar.measurement.semantics, materialSemanticExcludedTargets);
    const runtimeErrors = [...reference.errors.map((error) => `reference: ${error}`),
      ...astylar.errors.map((error) => `astylar: ${error}`)];
    return {
      family, profile, viewport, screenshotSimilarity, geometry, textAlignment, uniformBackgrounds, focusedRasters, shadowProfiles, semantics, runtimeErrors,
      diagnostics: astylar.measurement.diagnostics,
      meetsAcceptance: screenshotSimilarity >= materialThresholds.resultSsim &&
        geometry.maximumEdgeError !== null &&
        geometry.maximumEdgeError <= materialThresholds.maximumEdgeErrorPx &&
        geometry.edgesWithinTolerance >= materialThresholds.minimumEdgesWithinTolerance &&
        textAlignment.every((result) => result.matches) &&
        uniformBackgrounds.every((result) => result.matches) &&
        focusedRasters.every((result) => result.matches) &&
        shadowProfiles.every((result) => result.matches) &&
        semantics.every((result) => result.matches) && runtimeErrors.length === 0,
    };
  } finally {
    await context.close();
  }
}

async function capturePage(context, mode, benchmarkCase, directory) {
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(`${baseUrl}/${mode}/${benchmarkCase.family}?benchmark=1&profile=${benchmarkCase.profile}`, { waitUntil: 'commit' });
  await page.locator('.frame').waitFor({ state: 'visible' });
  const theme = profileTheme(benchmarkCase.profile);
  await sendShowcaseCommand(page, { type: 'showcase:theme', theme });
  await waitForThemeApplied(page, theme);
  if (mode === 'astylar') {
    await waitForAstylarBenchmark(page, errors, benchmarkCase);
    await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__?.waitForSettled());
  }
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(document.getAnimations().map((animation) => animation.finished.catch(() => undefined)));
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  const ids = benchmarkMeasurementIds(benchmarkCase.family);
  const measurement = mode === 'reference'
    ? await measureReference(page, ids)
    : await page.evaluate((targetIds) => window.__ASTYLAR_MATERIAL_BENCHMARK__?.measure(targetIds), ids);
  assert.ok(measurement, `${mode} benchmark measurement is missing.`);
  const buffer = await page.screenshot({
    path: path.join(directory, `${mode}.png`), animations: 'disabled',
  });
  await page.close();
  return { image: PNG.sync.read(buffer), measurement, errors };
}

async function captureInteractionCase(benchmarkCase) {
  const { family, profile, viewport, state } = benchmarkCase;
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: viewport.deviceScaleFactor,
    colorScheme: profile === 'dark' ? 'dark' : 'light',
    reducedMotion: 'reduce',
  });
  const directory = path.join(artifacts, 'interactions', family, profile, viewport.id, state);
  mkdirSync(directory, { recursive: true });
  const reference = await openInteractionPage(context, 'reference', benchmarkCase);
  const astylar = await openInteractionPage(context, 'astylar', benchmarkCase);
  try {
    const cycles = state === 'open-dismiss' ? 3 : 1;
    const resourceSnapshots = [];
    let heldReleases = [];
    for (let cycle = 0; cycle < cycles; cycle += 1) {
      await setBenchmarkPhase(reference.page, 'start');
      await setBenchmarkPhase(astylar.page, 'start');
      heldReleases = (await Promise.all([
        performInteraction(reference.page, 'reference', benchmarkCase),
        performInteraction(astylar.page, 'astylar', benchmarkCase),
      ])).filter(Boolean);
      const phase = state === 'held' ? 'held' : 'settled';
      await Promise.all([
        setBenchmarkPhase(reference.page, phase),
        setBenchmarkPhase(astylar.page, phase),
      ]);
      await Promise.all([
        settleInteraction(reference.page, 'reference'),
        settleInteraction(astylar.page, 'astylar'),
      ]);
      if (state === 'open-dismiss') {
        await reference.page.keyboard.press('Escape');
        await astylar.page.keyboard.press('Escape');
        await settleInteraction(reference.page, 'reference');
        await settleInteraction(astylar.page, 'astylar');
      }
      resourceSnapshots.push(await astylar.page.evaluate((ids) =>
        window.__ASTYLAR_MATERIAL_BENCHMARK__?.measure(ids).diagnostics, benchmarkMeasurementIds(family)));
    }
    const ids = benchmarkMeasurementIds(family);
    const referenceMeasurement = await measureReference(reference.page, ids);
    const astylarMeasurement = await astylar.page.evaluate((targetIds) =>
      window.__ASTYLAR_MATERIAL_BENCHMARK__?.measure(targetIds), ids);
    const astylarState = await astylar.page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__?.state());
    const interactionState = await compareInteractionState(reference.page, astylar.page, family, state, astylarState);
    assert.ok(astylarMeasurement, 'Astylar interaction measurement is missing.');
    const overlayPlacement = await compareOverlayPlacement(
      reference.page, astylar.page, astylarMeasurement, family, state,
    );
    const [referenceBuffer, astylarBuffer] = await Promise.all([
      captureInteractionImage(reference.page, 'reference', referenceMeasurement, family, state, directory),
      captureInteractionImage(astylar.page, 'astylar', astylarMeasurement, family, state, directory),
    ]);
    for (const release of heldReleases) await release();
    const referenceEvents = await reference.page.evaluate(() => window.__MATERIAL_REFERENCE_EVENTS__ ?? []);
    const astylarEvents = await astylar.page.evaluate((family) => (window.__ASTYLAR_MATERIAL_BENCHMARK__?.events() ?? []).map((event) => {
      const target = event.targetId ? document.querySelector(`[data-astylar-id="${CSS.escape(event.targetId)}"]`) : undefined;
      return target?.closest(`[data-astylar-id="${CSS.escape(family)}-primary"]`)
        ? { ...event, targetId: `${family}-primary` } : event;
    }), family);
    const referenceFocus = await focusedIdentity(reference.page, 'reference', family);
    const astylarFocus = await focusedIdentity(astylar.page, 'astylar', family);
    const cursor = await compareInteractionCursor(reference.page, astylar.page, family, state);
    const dynamicOverlaySemanticIds = family === 'snack-bar' &&
      ['activate', 'activate-twice', 'activate-leave', 'open'].includes(state)
      ? ['snack-bar-overlay', 'snack-bar-surface']
      : family === 'bottom-sheet' && ['activate', 'activate-leave', 'open'].includes(state)
        ? ['bottom-sheet-overlay', 'bottom-sheet-panel', 'bottom-sheet-dismiss', 'bottom-sheet-copy'] : [];
    const semantics = compareSemantics(
      referenceMeasurement.semantics,
      astylarMeasurement.semantics,
      [...materialSemanticExcludedTargets, ...dynamicOverlaySemanticIds],
    );
    const referenceImage = PNG.sync.read(referenceBuffer);
    const astylarImage = PNG.sync.read(astylarBuffer);
    const screenshotSimilarity = comparePng(referenceImage, astylarImage);
    const textAlignment = compareTextAlignment(
      referenceImage, astylarImage, referenceMeasurement.elements, astylarMeasurement.elements,
      [...textTargets(family), ...interactionTextTargets(family, state)], viewport.deviceScaleFactor, directory,
    );
    const configuredFocusedRasterTarget = materialInteractionFocusedRasterTargets[family];
    const focusedRasterTarget = configuredFocusedRasterTarget &&
      (!configuredFocusedRasterTarget.states || configuredFocusedRasterTarget.states.includes(state)) &&
      (!configuredFocusedRasterTarget.viewports || configuredFocusedRasterTarget.viewports.includes(viewport.id))
      ? configuredFocusedRasterTarget : undefined;
    const focusedRasters = focusedRasterTarget ? [compareFocusedRaster(
      referenceImage, astylarImage, referenceMeasurement.elements,
      focusedRasterTarget, viewport.deviceScaleFactor, directory,
    )] : [];
    const runtimeErrors = [...reference.errors.map((error) => `reference: ${error}`),
      ...astylar.errors.map((error) => `astylar: ${error}`)];
    const eventComparison = compareEvents(referenceEvents, astylarEvents, family, state);
    const statePaint = compareStatePaint(referenceMeasurement, astylarMeasurement, family, profile, state);
    const resourcesStable = resourceSnapshots.every((snapshot) =>
      snapshot?.surface?.session?.status === 'idle' && snapshot?.surface?.pluginResources?.pending === 0) &&
      (resourceSnapshots.length < 2 || JSON.stringify(resourceCounts(resourceSnapshots[0])) ===
        JSON.stringify(resourceCounts(resourceSnapshots.at(-1))));
    const focusMatches = state !== 'focus' || referenceFocus === astylarFocus;
    return {
      family, profile, viewport, state, screenshotSimilarity, textAlignment, focusedRasters, semantics, eventComparison, interactionState, overlayPlacement, statePaint, cursor,
      focus: { reference: referenceFocus, astylar: astylarFocus, matches: focusMatches },
      runtimeErrors, resourceSnapshots, resourcesStable, astylarState,
      meetsAcceptance: screenshotSimilarity >= materialThresholds.resultSsim &&
        textAlignment.every((result) => result.matches) &&
        focusedRasters.every((result) => result.matches) &&
        semantics.every((result) => result.matches) && eventComparison.matches && interactionState.matches && overlayPlacement.matches && statePaint.matches && cursor.matches && focusMatches &&
        runtimeErrors.length === 0 && resourcesStable,
    };
  } finally {
    await reference.page.close();
    await astylar.page.close();
    await context.close();
  }
}

async function openInteractionPage(context, mode, benchmarkCase) {
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(`${baseUrl}/${mode}/${benchmarkCase.family}?benchmark=1&profile=${benchmarkCase.profile}&interaction=${benchmarkCase.state}`, { waitUntil: 'commit' });
  await page.locator('.frame').waitFor({ state: 'visible' });
  const theme = profileTheme(benchmarkCase.profile);
  await sendShowcaseCommand(page, { type: 'showcase:theme', theme });
  await waitForThemeApplied(page, theme);
  if (mode === 'astylar') {
    await waitForAstylarBenchmark(page, errors, benchmarkCase);
    await page.evaluate(async () => {
      await window.__ASTYLAR_MATERIAL_BENCHMARK__?.waitForSettled();
      window.__ASTYLAR_MATERIAL_BENCHMARK__?.clearEvents();
    });
  } else {
    await page.evaluate((family) => {
      window.__MATERIAL_REFERENCE_EVENTS__ = [];
      const primaryId = `${family}-primary`;
      for (const type of ['pointerdown', 'pointerup', 'click', 'focus', 'blur', 'keydown', 'input', 'change']) {
        document.addEventListener(type, (event) => {
          const target = event.target;
          if (!(target instanceof HTMLElement)) return;
          const primary = target.closest(`#${CSS.escape(primaryId)}`);
          window.__MATERIAL_REFERENCE_EVENTS__.push({
            type,
            targetId: primary ? primaryId : target.id || undefined,
            value: target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement ? target.value : undefined,
          });
        }, true);
      }
    }, benchmarkCase.family);
  }
  await settleInteraction(page, mode);
  return { page, errors };
}

async function waitForAstylarBenchmark(page, errors, benchmarkCase) {
  try {
    await page.waitForFunction(() => !!window.__ASTYLAR_MATERIAL_BENCHMARK__, undefined, { timeout: 30_000 });
  } catch (error) {
    throw new Error(
      `Astylar benchmark hook did not mount for ${benchmarkCase.family}@${benchmarkCase.profile}/${benchmarkCase.viewport.id}. ` +
      `Browser errors: ${errors.join(' | ') || 'none'}`,
      { cause: error },
    );
  }
}

async function performInteraction(page, mode, benchmarkCase) {
  const { family, state } = benchmarkCase;
  if (state === 'inspect' || state === 'disabled' || state === 'selected' || state === 'error') return undefined;
  const box = await interactionTargetBox(page, mode, family, state);
  assert.ok(box, `${mode} ${family} primary interaction target is missing.`);
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  if (state === 'focus') {
    // Material's time input opens from the user's focus-producing click rather
    // than from HTMLElement.focus() alone. Exercise that observable contract
    // while keeping programmatic focus for the other keyboard-focus fixtures.
    if (family === 'timepicker') {
      await page.mouse.click(x, y);
      return undefined;
    }
    if (mode === 'reference') {
      await page.evaluate((id) => {
        const host = document.getElementById(id);
        const target = host?.matches('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]') ? host :
          host?.querySelector('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]');
        if (target instanceof HTMLElement) target.focus();
      }, `${family}-primary`);
    } else {
      await page.evaluate((id) => {
        const host = document.querySelector(`[data-astylar-id="${CSS.escape(id)}"]`);
        const target = host?.matches('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]') ? host :
          host?.querySelector('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]');
        if (target instanceof HTMLElement) target.focus();
      }, `${family}-primary`);
    }
    return undefined;
  }
  if (state === 'hover') { await page.mouse.move(x, y); return undefined; }
  if (family === 'slider' && (state === 'drag-start' || state === 'drag-end')) {
    const drag = await sliderDragCoordinates(page, mode, state === 'drag-start' ? 'start' : 'end');
    assert.ok(drag, `${mode} slider ${state} coordinates are missing.`);
    const trace = [await readSliderValues(page, mode)];
    await page.mouse.move(drag.from.x, drag.from.y);
    await page.mouse.down();
    for (let step = 1; step <= 8; step += 1) {
      const progress = step / 8;
      await page.mouse.move(
        drag.from.x + (drag.to.x - drag.from.x) * progress,
        drag.from.y + (drag.to.y - drag.from.y) * progress,
      );
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));
      trace.push(await readSliderValues(page, mode));
    }
    await page.mouse.up();
    await page.evaluate((samples) => { window.__MATERIAL_SLIDER_DRAG_TRACE__ = samples; }, trace);
    return undefined;
  }
  if (family === 'slider' && state === 'activate') {
    if (mode === 'reference') await page.locator('#slider-primary').focus();
    else await page.evaluate(() => document.querySelector('[data-astylar-id="slider-primary"]')?.focus());
    await page.keyboard.press('End');
    return undefined;
  }
  if (family === 'timepicker' && state === 'open-scroll') {
    await page.mouse.click(x, y);
    await settleInteraction(page, mode);
    const panel = await popupScrollBox(page, mode);
    assert.ok(panel, `${mode} timepicker scroll panel is missing.`);
    await page.mouse.move(panel.x + panel.width / 2, panel.y + panel.height / 2);
    await page.mouse.wheel(0, 144);
    return undefined;
  }
  await page.mouse.move(x, y);
  await page.mouse.down();
  if (state === 'held') return async () => { await page.mouse.up(); };
  await page.mouse.up();
  if (family === 'snack-bar' && state === 'auto-dismiss') {
    await page.waitForTimeout(5_100);
  }
  if (state === 'open-commit-reopen') {
    await settleInteraction(page, mode);
    const optionBox = await popupOptionBox(page, mode, family);
    assert.ok(optionBox, `${mode} ${family} popup option is missing.`);
    await page.mouse.click(optionBox.x + optionBox.width / 2, optionBox.y + optionBox.height / 2);
    await settleInteraction(page, mode);
    const reopenBox = await interactionTargetBox(page, mode, family, state);
    assert.ok(reopenBox, `${mode} ${family} reopen target is missing.`);
    await page.mouse.click(reopenBox.x + reopenBox.width / 2, reopenBox.y + reopenBox.height / 2);
  }
  if (state === 'edit-empty-blur') {
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');
    await settleInteraction(page, mode);
    await page.mouse.click(10, 10);
  }
  if (state === 'open-dismiss-outside') {
    await settleInteraction(page, mode);
    await page.mouse.click(10, 10);
  }
  if (state === 'open-hover-content') {
    await settleInteraction(page, mode);
    const contentBox = await popupHoverBox(page, mode, family);
    assert.ok(contentBox, `${mode} ${family} popup hover target is missing.`);
    await page.mouse.move(contentBox.x + contentBox.width / 2, contentBox.y + contentBox.height / 2);
  }
  if (state === 'open-secondary') {
    await settleInteraction(page, mode);
    const monthBox = await datepickerMonthBox(page, mode);
    assert.ok(monthBox, `${mode} datepicker month/year control is missing.`);
    await page.mouse.click(monthBox.x + monthBox.width / 2, monthBox.y + monthBox.height / 2);
  }
  if (state === 'activate-twice') {
    await settleInteraction(page, mode);
    const secondBox = await interactionTargetBox(page, mode, family, state);
    assert.ok(secondBox, `${mode} ${family} second interaction target is missing.`);
    await page.mouse.move(secondBox.x + secondBox.width / 2, secondBox.y + secondBox.height / 2);
    await page.mouse.down();
    await page.mouse.up();
  }
  if (state === 'activate-alternate') {
    await settleInteraction(page, mode);
    const alternateBox = await interactionTargetBox(page, mode, family, state, true);
    assert.ok(alternateBox, `${mode} ${family} alternate interaction target is missing.`);
    await page.mouse.move(alternateBox.x + alternateBox.width / 2, alternateBox.y + alternateBox.height / 2);
    await page.mouse.down();
    await page.mouse.up();
  }
  if (state === 'activate-leave') await page.mouse.move(1, 1);
  return undefined;
}

async function interactionTargetBox(page, mode, family, state, alternate = false) {
  const interactionLayerProbe = interactionLayerCursorProbe(family, state);
  const timepickerFocus = family === 'timepicker' && state === 'focus';
  const astylarTargets = {
    toolbar: 'toolbar-action', card: 'card-open', chips: 'chip-0', sort: 'sort-trigger',
    paginator: 'paginator-next', radio: 'radio-team', 'button-toggle': 'button-toggle-two',
    tabs: 'tab-activity', stepper: 'step-review', datepicker: 'datepicker-icon', timepicker: 'timepicker-icon',
    'form-field': 'form-field-control', input: 'input-control', autocomplete: 'autocomplete-control', select: 'select-control',
  };
  const referenceTargets = {
    toolbar: '#toolbar-primary button', card: '#card-primary button', chips: '#chips-primary mat-chip-option:first-child',
    sort: '#sort-primary [mat-sort-header]', paginator: '#paginator-primary .mat-mdc-paginator-navigation-next',
    radio: '#radio-primary mat-radio-button:nth-of-type(2)',
    'button-toggle': '#button-toggle-primary mat-button-toggle:nth-of-type(2)',
    tabs: '#tabs-primary .mat-mdc-tab:nth-of-type(2)',
    stepper: '#stepper-primary .mat-step-header:nth-of-type(2)',
    datepicker: '#datepicker-primary mat-datepicker-toggle button',
    timepicker: '#timepicker-primary mat-timepicker-toggle button',
    'form-field': '#form-field-control', input: '#input-control', autocomplete: '#autocomplete-control', select: '#select-control',
  };
  if (mode === 'reference') {
    if (interactionLayerProbe) {
      return page.locator(interactionLayerProbe.referenceSelector).boundingBox();
    }
    if (family === 'checkbox' && ['hover', 'held', 'activate-leave'].includes(state)) {
      return page.locator('#checkbox-primary .mdc-checkbox').boundingBox();
    }
    if (family === 'slider' && ['hover', 'held', 'activate-leave'].includes(state)) {
      return page.locator('#slider-primary').locator('xpath=ancestor::mat-slider')
        .locator('mat-slider-visual-thumb').nth(1).boundingBox();
    }
    const selector = timepickerFocus
      ? '#timepicker-control'
      : family === 'chips' && alternate
      ? '#chips-primary mat-chip-option:nth-child(2)'
      : referenceTargets[family] ?? `#${family}-primary`;
    return page.locator(selector).boundingBox();
  }
  if (interactionLayerProbe) {
    const measurement = await page.evaluate(
      (id) => window.__ASTYLAR_MATERIAL_BENCHMARK__?.measure([id]),
      interactionLayerProbe.astylarId,
    );
    const local = measurement?.elements?.[interactionLayerProbe.astylarId]?.borderBox;
    const canvas = await page.locator('canvas').boundingBox();
    return local && canvas
      ? { x: canvas.x + local.left, y: canvas.y + local.top, width: local.width, height: local.height }
      : undefined;
  }
  if (family === 'checkbox' && ['hover', 'held', 'activate-leave'].includes(state)) {
    const measurement = await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__?.measure(['checkbox-box']));
    const local = measurement?.elements?.['checkbox-box']?.borderBox;
    const canvas = await page.locator('canvas').boundingBox();
    return local && canvas ? { x: canvas.x + local.left, y: canvas.y + local.top, width: local.width, height: local.height } : undefined;
  }
  if (family === 'slider' && ['hover', 'held', 'activate-leave'].includes(state)) {
    const result = await page.evaluate(() => ({
      measurement: window.__ASTYLAR_MATERIAL_BENCHMARK__?.measure(['slider-material-visual']),
      value: window.__ASTYLAR_MATERIAL_BENCHMARK__?.state().sliderValue,
    }));
    const local = result.measurement?.elements?.['slider-material-visual']?.borderBox;
    const canvas = await page.locator('canvas').boundingBox();
    return local && canvas && Number.isFinite(result.value) ? {
      x: canvas.x + local.left + local.width * result.value / 100 - .5,
      y: canvas.y + local.top + local.height / 2 - .5,
      width: 1,
      height: 1,
    } : undefined;
  }
  const targetId = timepickerFocus
    ? 'timepicker-control'
    : family === 'chips' && alternate ? 'chip-1' : astylarTargets[family] ?? `${family}-primary`;
  const measurement = await page.evaluate((id) => window.__ASTYLAR_MATERIAL_BENCHMARK__?.measure([id]), targetId);
  const local = measurement?.elements?.[targetId]?.borderBox;
  const canvas = await page.locator('canvas').boundingBox();
  return local && canvas ? { x: canvas.x + local.left, y: canvas.y + local.top, width: local.width, height: local.height } : undefined;
}

async function settleInteraction(page, mode) {
  if (mode === 'astylar') await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__?.waitForSettled());
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}

async function setBenchmarkPhase(page, phase) {
  await sendShowcaseCommand(page, { type: 'showcase:benchmark', phase });
}

async function sendShowcaseCommand(page, command) {
  await page.waitForFunction(() => typeof window.__MATERIAL_SHOWCASE_COMMAND__ === 'function');
  const accepted = await page.evaluate((nextCommand) => window.__MATERIAL_SHOWCASE_COMMAND__?.(nextCommand), command);
  assert.equal(accepted, true, `Showcase rejected benchmark command ${command.type}.`);
}

async function waitForThemeApplied(page, theme) {
  await page.waitForFunction((expectedSurface) => {
    const frame = document.querySelector('.frame');
    if (!(frame instanceof HTMLElement)) return false;
    const probe = document.createElement('span');
    probe.style.color = expectedSurface;
    document.body.append(probe);
    const expected = getComputedStyle(probe).color;
    probe.remove();
    return getComputedStyle(frame).backgroundColor === expected;
  }, theme.surface);
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function captureInteractionImage(page, mode, measurement, family, state, directory) {
  const filename = path.join(directory, `${mode}.png`);
  void mode;
  void measurement;
  void family;
  void state;
  return page.screenshot({ path: filename, animations: 'disabled' });
}

async function focusedIdentity(page, mode, family) {
  return page.evaluate(({ mode, family }) => {
    const active = document.activeElement;
    if (!(active instanceof HTMLElement)) return undefined;
    if (mode === 'astylar') return active.closest(`[data-astylar-id="${CSS.escape(family)}-primary"]`)
      ? `${family}-primary` : active.dataset['astylarId'];
    return active.closest(`#${CSS.escape(family)}-primary`) ? `${family}-primary` : active.id || undefined;
  }, { mode, family });
}

function compareEvents(reference, candidate, family, state) {
  if (!['activate', 'activate-twice', 'activate-alternate', 'activate-leave', 'auto-dismiss', 'open', 'open-dismiss'].includes(state)) return { matches: true, reference, astylar: candidate };
  const relevant = (events) => events.filter(({ targetId }) => targetId === `${family}-primary`)
    .map(({ type }) => type).filter((type) => ['pointerdown', 'pointerup', 'click', 'input', 'change'].includes(type))
    .filter((type, index, values) => index === 0 || type !== values[index - 1]);
  // Role-based selection controls expose their result through ARIA/value state.
  // Material's hidden native inputs do not consistently bubble the input/change
  // tail from the compared host, so compare the shared pointer contract here;
  // semantic assertions above still require the resulting value to match.
  const stateDrivenControl = family === 'checkbox' || family === 'slider';
  const contractEvents = (events) => events.filter((type) =>
    !stateDrivenControl || !['input', 'change'].includes(type));
  const expected = contractEvents(relevant(reference));
  const actual = contractEvents(relevant(candidate));
  return { matches: JSON.stringify(expected) === JSON.stringify(actual), reference: expected, astylar: actual };
}

async function compareInteractionCursor(referencePage, astylarPage, family, state) {
  if (state !== 'hover') return { matches: true };
  const referenceBox = await cursorTargetBox(referencePage, 'reference', family, state);
  const astylarBox = await cursorTargetBox(astylarPage, 'astylar', family, state);
  const cursorAt = async (page, box, canvas = false) => {
    if (!box) return undefined;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    const observation = await page.evaluate(({ x, y, canvas }) => {
      const element = canvas ? document.querySelector('canvas') : document.elementFromPoint(x, y);
      if (!element) return undefined;
      const authoredCursor = getComputedStyle(element).cursor;
      if (canvas || authoredCursor !== 'auto') return { authoredCursor, hasSelectableTextAtPoint: false };
      const caret = typeof document.caretPositionFromPoint === 'function'
        ? document.caretPositionFromPoint(x, y)
        : typeof document.caretRangeFromPoint === 'function'
          ? document.caretRangeFromPoint(x, y)
          : undefined;
      const node = caret?.offsetNode ?? caret?.startContainer;
      const textOwner = node?.nodeType === Node.TEXT_NODE ? node.parentElement : node;
      const text = node?.nodeType === Node.TEXT_NODE ? node.textContent : undefined;
      const textRange = node?.nodeType === Node.TEXT_NODE ? document.createRange() : undefined;
      textRange?.selectNodeContents(node);
      const pointTouchesText = !!textRange && [...textRange.getClientRects()].some((rect) =>
        x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom);
      const hasSelectableTextAtPoint = !!text?.trim() && pointTouchesText &&
        textOwner instanceof Element && getComputedStyle(textOwner).userSelect !== 'none';
      return { authoredCursor, hasSelectableTextAtPoint };
    }, { x: box.x + box.width / 2, y: box.y + box.height / 2, canvas });
    return observation
      ? effectiveBrowserCursor(observation.authoredCursor, observation.hasSelectableTextAtPoint)
      : undefined;
  };
  const reference = await cursorAt(referencePage, referenceBox);
  const astylar = await cursorAt(astylarPage, astylarBox, true);
  return { reference, astylar, matches: reference === astylar };
}

async function cursorTargetBox(page, mode, family, state) {
  const textTargets = {
    sidenav: { reference: '#sidenav-primary mat-sidenav-content', astylar: 'sidenav-content' },
    'grid-list': { reference: '#grid-tile-one', astylar: 'grid-tile-one-label' },
    badge: { reference: '#badge-label', astylar: 'badge-label' },
    table: { reference: '#table-primary tbody tr:first-child td', astylar: 'table-atlas' },
    tree: { reference: '#tree-item-0', astylar: 'tree-item-0-label' },
  };
  const target = textTargets[family];
  if (!target) return interactionTargetBox(page, mode, family, state);
  if (mode === 'reference') {
    return page.locator(target.reference).evaluate((element) => {
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      let text;
      while ((text = walker.nextNode()) && !text.textContent?.trim()) { /* find visible copy */ }
      if (!text) return undefined;
      const range = document.createRange();
      range.selectNodeContents(text);
      return range.getBoundingClientRect().toJSON();
    });
  }
  const measurement = await page.evaluate((id) =>
    window.__ASTYLAR_MATERIAL_BENCHMARK__?.measure([id]), target.astylar);
  const local = measurement?.elements?.[target.astylar]?.borderBox;
  const canvas = await page.locator('canvas').boundingBox();
  return local && canvas
    ? { x: canvas.x + local.left, y: canvas.y + local.top, width: local.width, height: local.height }
    : undefined;
}

async function compareOverlayPlacement(referencePage, astylarPage, astylarMeasurement, family, state) {
  const expectedVisible = family === 'snack-bar'
    ? ['activate', 'activate-twice', 'activate-leave', 'open'].includes(state)
    : family === 'tooltip'
      ? ['hover', 'held'].includes(state)
      : family === 'bottom-sheet'
        ? ['activate', 'activate-leave', 'open'].includes(state)
        : family === 'timepicker'
          ? ['focus', 'activate', 'open', 'open-hover-content'].includes(state)
          : family === 'datepicker'
            ? ['activate', 'open', 'open-secondary', 'open-hover-content'].includes(state)
            : family === 'dialog' && ['activate', 'activate-leave', 'open', 'open-hover-content'].includes(state);
  if (!expectedVisible) return { matches: true };

  const targetId = family === 'snack-bar' ? 'snack-bar-surface'
    : family === 'bottom-sheet' ? 'bottom-sheet-panel'
      : family === 'timepicker' ? 'timepicker-options'
        : family === 'datepicker' ? 'datepicker-popup'
          : family === 'dialog' ? 'dialog-panel' : 'tooltip-popup';
  const local = astylarMeasurement.elements?.[targetId]?.borderBox ??
    (family === 'timepicker' || family === 'datepicker'
      ? await astylarPage.evaluate((id) =>
        window.__ASTYLAR_MATERIAL_BENCHMARK__?.measure([id])?.elements?.[id]?.borderBox, targetId)
      : undefined);
  const canvas = await astylarPage.locator('canvas').boundingBox();
  const referenceSelector = family === 'snack-bar'
    ? '.mat-mdc-snack-bar-container'
    : family === 'bottom-sheet' ? '.mat-bottom-sheet-container'
      : family === 'timepicker' ? '.mat-timepicker-panel'
        : family === 'datepicker' ? '.mat-datepicker-content'
          : family === 'dialog' ? '.mat-mdc-dialog-surface' : '.mat-mdc-tooltip-surface';
  const referenceLocator = referencePage.locator(referenceSelector).first();
  const reference = await referenceLocator.count() === 0
    ? undefined
    : await referenceLocator.boundingBox();
  if (!local || !canvas || !reference) {
    return { matches: false, targetId, local, canvas, reference, reason: 'visible overlay bounds are missing' };
  }

  const astylar = {
    x: canvas.x + local.left,
    y: canvas.y + local.top,
    width: local.width,
    height: local.height,
  };
  const geometryTolerance = .5;
  const withinCanvas = astylar.x >= canvas.x - geometryTolerance &&
    astylar.y >= canvas.y - geometryTolerance &&
    astylar.x + astylar.width <= canvas.x + canvas.width + geometryTolerance &&
    astylar.y + astylar.height <= canvas.y + canvas.height + geometryTolerance;
  if (family === 'timepicker' || family === 'datepicker') {
    const primaryId = `${family}-primary`;
    const astylarPrimary = astylarMeasurement.elements?.[primaryId]?.borderBox;
    const referencePrimary = await referencePage.locator(`#${primaryId}`).boundingBox();
    if (!astylarPrimary || !referencePrimary) {
      return {
        matches: false, targetId, astylar, reference, astylarPrimary, referencePrimary,
        reason: 'picker anchor bounds are missing',
      };
    }
    const astylarOffset = {
      x: astylar.x - (canvas.x + astylarPrimary.left),
      y: astylar.y - (canvas.y + astylarPrimary.top),
    };
    const referenceOffset = {
      x: reference.x - referencePrimary.x,
      y: reference.y - referencePrimary.y,
    };
    const edgeErrors = [
      Math.abs(astylarOffset.x - referenceOffset.x),
      Math.abs(astylarOffset.y - referenceOffset.y),
      Math.abs(astylar.width - reference.width),
      Math.abs(astylar.height - reference.height),
    ];
    if (family === 'timepicker') {
      edgeErrors.push(
        Math.abs(astylar.width - astylarPrimary.width),
        Math.abs(reference.width - referencePrimary.width),
      );
    }
    const edgeError = Math.max(...edgeErrors);
    return {
      matches: withinCanvas && edgeError <= 2,
      targetId, astylar, reference, astylarPrimary, referencePrimary,
      astylarOffset, referenceOffset, canvas, withinCanvas, edgeError,
    };
  }
  if (family === 'snack-bar') {
    const overlay = astylarMeasurement.elements?.['snack-bar-overlay']?.borderBox;
    const astylarSemanticLocator = astylarPage.locator('[data-astylar-id="snack-bar-surface"]');
    const astylarSemantics = await astylarSemanticLocator.count() === 0
      ? { exists: false }
      : await astylarSemanticLocator.first().evaluate((element) => ({
        exists: true,
        role: element.getAttribute('role') ?? undefined,
        ariaLive: element.getAttribute('aria-live') ?? undefined,
        name: element.textContent?.replace(/\s+/g, ' ').trim() ?? '',
      }));
    const referenceSemantics = await referencePage.locator(referenceSelector).first().evaluate((element) => {
      const semanticElement = element.matches('[role], [aria-live]')
        ? element : element.querySelector('[role], [aria-live]');
      const target = semanticElement ?? element;
      return {
        exists: true,
        role: target.getAttribute('role') ?? undefined,
        ariaLive: target.getAttribute('aria-live') ?? undefined,
        name: target.textContent?.replace(/\s+/g, ' ').trim() ?? '',
      };
    });
    const normalizeName = (value) => value?.replace(/\s+/g, '').toLowerCase();
    const equivalentLiveRole = astylarSemantics.role === referenceSemantics.role ||
      (astylarSemantics.role === 'status' && referenceSemantics.role === undefined &&
        referenceSemantics.ariaLive === 'polite');
    const semanticsMatch = astylarSemantics?.exists === true &&
      equivalentLiveRole && astylarSemantics.ariaLive === referenceSemantics.ariaLive &&
      normalizeName(astylarSemantics.name) === normalizeName(referenceSemantics.name);
    const astylarBottomGap = canvas.y + canvas.height - astylar.y - astylar.height;
    const referenceBottomGap = canvas.y + canvas.height - reference.y - reference.height;
    return {
      matches: withinCanvas && Math.abs(astylarBottomGap - referenceBottomGap) <= 2 && semanticsMatch,
      targetId, astylar, reference, overlay, canvas, withinCanvas,
      astylarBottomGap, referenceBottomGap, astylarSemantics, referenceSemantics, semanticsMatch,
    };
  }
  if (family === 'dialog') {
    const edgeErrors = [
      Math.abs(astylar.x - reference.x),
      Math.abs(astylar.y - reference.y),
      Math.abs(astylar.width - reference.width),
      Math.abs(astylar.height - reference.height),
    ];
    const edgeError = Math.max(...edgeErrors);
    return { matches: withinCanvas && edgeError <= 2, targetId, astylar, reference, canvas, withinCanvas, edgeErrors, edgeError };
  }
  if (family === 'bottom-sheet') {
    const overlay = astylarMeasurement.elements?.['bottom-sheet-overlay']?.borderBox;
    const astylarRows = ['bottom-sheet-dismiss', 'bottom-sheet-copy']
      .map((id) => astylarMeasurement.elements?.[id]?.borderBox);
    const referenceRows = await referencePage.locator('.mat-mdc-list-item').evaluateAll((elements) =>
      elements.slice(0, 2).map((element) => element.getBoundingClientRect().toJSON()));
    const edgeError = Math.max(
      Math.abs(astylar.x - reference.x),
      Math.abs(astylar.y - reference.y),
      Math.abs(astylar.width - reference.width),
      Math.abs(astylar.height - reference.height),
      ...astylarRows.flatMap((row, index) => row && referenceRows[index]
        ? [Math.abs(canvas.x + row.left - referenceRows[index].left),
          Math.abs(canvas.y + row.top - referenceRows[index].top),
          Math.abs(row.width - referenceRows[index].width),
          Math.abs(row.height - referenceRows[index].height)]
        : [Number.POSITIVE_INFINITY]),
    );
    return {
      matches: withinCanvas && edgeError <= 2,
      targetId, astylar, reference, overlay, canvas, withinCanvas,
      astylarRows, referenceRows, edgeError,
    };
  }

  const astylarTrigger = astylarMeasurement.elements?.['tooltip-primary']?.borderBox;
  const referenceTrigger = await referencePage.locator('#tooltip-primary').boundingBox();
  if (!astylarTrigger || !referenceTrigger) {
    return { matches: false, targetId, astylar, reference, reason: 'tooltip trigger bounds are missing' };
  }
  const astylarCenterDelta = astylar.x + astylar.width / 2 -
    (canvas.x + astylarTrigger.left + astylarTrigger.width / 2);
  const referenceCenterDelta = reference.x + reference.width / 2 -
    (referenceTrigger.x + referenceTrigger.width / 2);
  const astylarGap = astylar.y - (canvas.y + astylarTrigger.top + astylarTrigger.height);
  const referenceGap = reference.y - (referenceTrigger.y + referenceTrigger.height);
  return {
    matches: withinCanvas && Math.abs(astylarCenterDelta - referenceCenterDelta) <= 2 &&
      Math.abs(astylarGap - referenceGap) <= 2,
    targetId, astylar, reference, withinCanvas,
    astylarCenterDelta, referenceCenterDelta, astylarGap, referenceGap,
  };
}

async function launchBrowser() {
  return chromium.launch({
    channel: process.env['ASTYLAR_MATERIAL_BROWSER_CHANNEL'] ?? 'chrome',
    headless: true,
  });
}

async function recycleBrowserIfNeeded(index) {
  if (index === 0 || index % browserRestartInterval !== 0) return;
  await restartBrowser();
}

async function restartBrowser() {
  await browser.close();
  browser = await launchBrowser();
}

async function popupOptionBox(page, mode, family) {
  if (mode === 'reference') {
    const selector = family === 'autocomplete'
      ? '.mat-mdc-autocomplete-panel mat-option:first-child'
      : '.mat-mdc-select-panel mat-option:first-child';
    return page.locator(selector).boundingBox();
  }
  const targetId = family === 'autocomplete' ? 'autocomplete-option-cape-town' : 'select-option-solo';
  const measurement = await page.evaluate((id) => window.__ASTYLAR_MATERIAL_BENCHMARK__?.measure([id]), targetId);
  const local = measurement?.elements?.[targetId]?.borderBox;
  const canvas = await page.locator('canvas').boundingBox();
  return local && canvas ? { x: canvas.x + local.left, y: canvas.y + local.top, width: local.width, height: local.height } : undefined;
}

async function popupHoverBox(page, mode, family) {
  if (mode === 'reference') {
    const selectors = {
      autocomplete: '.mat-mdc-autocomplete-panel mat-option:first-child',
      select: '.mat-mdc-select-panel mat-option:first-child',
      datepicker: '.mat-calendar-body-cell:not(.mat-calendar-body-disabled)',
      timepicker: '.mat-timepicker-panel mat-option:first-child',
      menu: '.mat-mdc-menu-panel button:first-child',
      dialog: 'mat-dialog-container button:first-child',
    };
    return page.locator(selectors[family]).first().boundingBox();
  }
  const targetIds = {
    autocomplete: 'autocomplete-option-cape-town',
    select: 'select-option-solo',
    datepicker: 'datepicker-day-1',
    timepicker: 'timepicker-option-0',
    menu: 'menu-rename',
    dialog: 'dialog-panel',
  };
  const targetId = targetIds[family];
  const measurement = await page.evaluate((id) => window.__ASTYLAR_MATERIAL_BENCHMARK__?.measure([id]), targetId);
  const local = measurement?.elements?.[targetId]?.borderBox;
  const canvas = await page.locator('canvas').boundingBox();
  if (local && canvas) {
    if (family === 'dialog') return {
      x: canvas.x + local.left + local.width - 140,
      y: canvas.y + local.top + local.height - 40,
      width: 1,
      height: 1,
    };
    return { x: canvas.x + local.left, y: canvas.y + local.top, width: local.width, height: local.height };
  }
  if (family === 'dialog') {
    const viewport = page.viewportSize();
    return viewport ? { x: viewport.width / 2, y: viewport.height / 2 + 60, width: 1, height: 1 } : undefined;
  }
  return undefined;
}

async function datepickerMonthBox(page, mode) {
  if (mode === 'reference') return page.locator('.mat-calendar-period-button').boundingBox();
  const measurement = await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__?.measure(['datepicker-month']));
  const local = measurement?.elements?.['datepicker-month']?.borderBox;
  const canvas = await page.locator('canvas').boundingBox();
  return local && canvas ? { x: canvas.x + local.left, y: canvas.y + local.top, width: local.width, height: local.height } : undefined;
}

async function popupScrollBox(page, mode) {
  if (mode === 'reference') return page.locator('.mat-timepicker-panel').boundingBox();
  const measurement = await page.evaluate(() =>
    window.__ASTYLAR_MATERIAL_BENCHMARK__?.measure(['timepicker-options']));
  const local = measurement?.elements?.['timepicker-options']?.borderBox;
  const canvas = await page.locator('canvas').boundingBox();
  return local && canvas ? {
    x: canvas.x + local.left,
    y: canvas.y + local.top,
    width: local.width,
    height: local.height,
  } : undefined;
}

async function sliderDragCoordinates(page, mode, thumb) {
  const targetRatio = thumb === 'start' ? .4 : .75;
  if (mode === 'reference') {
    const track = await page.locator('mat-slider .mdc-slider__track').boundingBox();
    const visualThumb = await page.locator('mat-slider mat-slider-visual-thumb').nth(thumb === 'start' ? 0 : 1).boundingBox();
    if (!track || !visualThumb) return undefined;
    return {
      from: { x: visualThumb.x + visualThumb.width / 2, y: visualThumb.y + visualThumb.height / 2 },
      to: { x: track.x + track.width * targetRatio, y: visualThumb.y + visualThumb.height / 2 },
    };
  }
  const result = await page.evaluate(() => ({
    measurement: window.__ASTYLAR_MATERIAL_BENCHMARK__?.measure(['slider-material-visual']),
    state: window.__ASTYLAR_MATERIAL_BENCHMARK__?.state(),
  }));
  const local = result.measurement?.elements?.['slider-material-visual']?.borderBox;
  const canvas = await page.locator('canvas').boundingBox();
  if (!local || !canvas) return undefined;
  const startRatio = thumb === 'start' ? result.state.sliderStart / 100 : result.state.sliderValue / 100;
  return {
    from: { x: canvas.x + local.left + local.width * startRatio, y: canvas.y + local.top + local.height / 2 },
    to: { x: canvas.x + local.left + local.width * targetRatio, y: canvas.y + local.top + local.height / 2 },
  };
}

async function compareInteractionState(referencePage, astylarPage, family, state, astylarState) {
  if (family === 'slider' && (state === 'drag-start' || state === 'drag-end')) {
    const reference = await referencePage.evaluate(() => ({
      sliderStart: Number(document.querySelector('#slider-start')?.value),
      sliderValue: Number(document.querySelector('#slider-primary')?.value),
    }));
    const astylar = { sliderStart: astylarState?.sliderStart, sliderValue: astylarState?.sliderValue };
    const [referenceTrace, astylarTrace] = await Promise.all([
      referencePage.evaluate(() => window.__MATERIAL_SLIDER_DRAG_TRACE__ ?? []),
      astylarPage.evaluate(() => window.__MATERIAL_SLIDER_DRAG_TRACE__ ?? []),
    ]);
    const movedKey = state === 'drag-start' ? 'sliderStart' : 'sliderValue';
    const fixedKey = state === 'drag-start' ? 'sliderValue' : 'sliderStart';
    const traceContract = (samples) => {
      if (samples.length !== 9) return false;
      const moved = samples.map((sample) => Number(sample[movedKey]));
      const fixed = samples.map((sample) => Number(sample[fixedKey]));
      return moved.every(Number.isFinite) && fixed.every(Number.isFinite) &&
        fixed.every((value) => value === fixed[0]) &&
        moved.every((value, index) => index === 0 || value >= moved[index - 1]) &&
        new Set(moved).size >= 3 && moved.at(-1) > moved[0];
    };
    const finalStateMatches = JSON.stringify(reference) === JSON.stringify(astylar);
    const tracesMatchContract = traceContract(referenceTrace) && traceContract(astylarTrace);
    return {
      reference: { ...reference, trace: referenceTrace },
      astylar: { ...astylar, trace: astylarTrace },
      matches: finalStateMatches && tracesMatchContract,
    };
  }
  if (family === 'datepicker' && state === 'open-secondary') {
    const reference = await referencePage.locator('mat-multi-year-view').count() > 0;
    const candidate = await astylarPage.evaluate(() => !!window.__ASTYLAR_MATERIAL_BENCHMARK__?.measure(['datepicker-year-grid'])?.elements?.['datepicker-year-grid']);
    return { reference, astylar: candidate, matches: reference === candidate && reference === true };
  }
  if (family === 'timepicker' && state === 'focus') {
    const reference = await referencePage.locator('.mat-timepicker-panel').count() > 0;
    const candidate = await astylarPage.evaluate(() =>
      !!window.__ASTYLAR_MATERIAL_BENCHMARK__?.measure(['timepicker-options'])?.elements?.['timepicker-options']);
    return { reference, astylar: candidate, matches: reference === candidate && reference === true };
  }
  if (state === 'open-dismiss-outside') {
    const reference = await referencePage.evaluate(() =>
      document.querySelector('[role="listbox"], [role="dialog"], .mat-mdc-menu-panel') !== null);
    const candidate = await astylarPage.evaluate(() => {
      const benchmark = window.__ASTYLAR_MATERIAL_BENCHMARK__;
      return benchmark?.state().open === true;
    });
    return { reference, astylar: candidate, matches: reference === false && candidate === false };
  }
  if (family === 'timepicker' && state === 'open-scroll') {
    const reference = await referencePage.locator('.mat-timepicker-panel').evaluate((panel) => panel.scrollTop);
    const candidate = await astylarPage.evaluate(() =>
      window.__ASTYLAR_MATERIAL_BENCHMARK__?.measure(['timepicker-options'])
        ?.diagnostics?.surface?.scrolling?.containers?.['timepicker-options']?.scrollTop);
    return {
      reference,
      astylar: candidate,
      matches: Number(reference) > 0 && Number(candidate) > 0,
    };
  }
  return { matches: true };
}

async function readSliderValues(page, mode) {
  if (mode === 'reference') {
    return page.evaluate(() => ({
      sliderStart: Number(document.querySelector('#slider-start')?.value),
      sliderValue: Number(document.querySelector('#slider-primary')?.value),
    }));
  }
  return page.evaluate(() => {
    const benchmark = window.__ASTYLAR_MATERIAL_BENCHMARK__;
    const state = benchmark?.state();
    const events = benchmark?.events() ?? [];
    const latestInputValue = (targetId, fallback) => {
      const input = [...events].reverse().find((event) =>
        event.type === 'input' && event.targetId === targetId);
      return Number(input?.value ?? fallback);
    };
    return {
      sliderStart: latestInputValue('slider-start', state?.sliderStart),
      sliderValue: latestInputValue('slider-primary', state?.sliderValue),
    };
  });
}

function textTargets(family) {
  return (textAudit ? materialTextAuditTargets : materialTextAlignmentTargets)[family] ?? [];
}

function interactionTextTargets(family, state) {
  const targets = materialInteractionTextAlignmentTargets[family] ?? [];
  if (family === 'expansion' && !['activate', 'activate-leave', 'open'].includes(state)) return [];
  return targets;
}

function compareStatePaint(referenceMeasurement, astylarMeasurement, family, profile, state) {
  if (family === 'toolbar' && ['hover', 'held', 'activate-leave'].includes(state)) {
    const actual = astylarMeasurement.elements?.['toolbar-action']?.interactionBackground?.toLowerCase();
    const theme = profileTheme(profile);
    const expected = state === 'activate-leave' ? 'transparent' :
      mixHexColor(theme.surface, theme.primary, state === 'held' ? .12 : .08);
    return { matches: actual === expected, expected, astylar: actual };
  }
  if (family !== 'button' || state !== 'activate-leave') return { matches: true };
  const expected = normalizeColor(referenceMeasurement.elements?.[`${family}-primary`]?.interactionBackground);
  const actual = normalizeColor(astylarMeasurement.elements?.[`${family}-primary`]?.interactionBackground);
  return { matches: actual === expected, expected, astylar: actual };
}

function normalizeColor(value) {
  if (typeof value !== 'string') return undefined;
  const hex = value.trim().match(/^#([0-9a-f]{6})$/i)?.[1];
  if (hex) return [0, 2, 4].map((index) => Number.parseInt(hex.slice(index, index + 2), 16)).join(',');
  const channels = value.match(/[\d.]+/g)?.slice(0, 3).map((channel) => Math.round(Number(channel)));
  return channels?.length === 3 ? channels.join(',') : undefined;
}

function mixHexColor(background, foreground, foregroundAmount) {
  const channel = (index) => Math.round(
    Number.parseInt(background.slice(index, index + 2), 16) * (1 - foregroundAmount) +
    Number.parseInt(foreground.slice(index, index + 2), 16) * foregroundAmount,
  ).toString(16).padStart(2, '0');
  return `#${channel(1)}${channel(3)}${channel(5)}`;
}

function resourceCounts(snapshot) {
  return snapshot ? {
    owners: snapshot.surface?.pluginResources?.owners,
    resources: snapshot.surface?.pluginResources?.resources,
    cleanups: snapshot.surface?.pluginResources?.cleanups,
    meshes: snapshot.surface?.resources?.meshes,
    materials: snapshot.surface?.resources?.materials,
    textures: snapshot.surface?.resources?.textures,
  } : undefined;
}

async function measureReference(page, ids) {
  return page.evaluate((targetIds) => {
    const roleOf = (element) => {
      const explicit = element.getAttribute('role');
      if (explicit) return explicit;
      if (element instanceof HTMLButtonElement) return 'button';
      if (element instanceof HTMLSelectElement) return element.multiple ? 'listbox' : 'combobox';
      if (element instanceof HTMLTextAreaElement) return 'textbox';
      if (element instanceof HTMLInputElement) {
        if (element.type === 'checkbox') return 'checkbox';
        if (element.type === 'radio') return 'radio';
        if (element.type === 'range') return 'slider';
        return 'textbox';
      }
      const tag = element.tagName.toLowerCase();
      if (tag === 'img') return 'img';
      if (tag === 'table') return 'table';
      if (tag === 'th') return 'columnheader';
      if (tag === 'td') return 'cell';
      if (tag === 'nav') return 'navigation';
      if (tag === 'main') return 'main';
      if (tag === 'aside') return 'complementary';
      if (tag === 'section' && (element.hasAttribute('aria-label') || element.hasAttribute('aria-labelledby'))) return 'region';
      return undefined;
    };
    const elements = Object.fromEntries(targetIds.map((id) => {
      const element = referenceTarget(id);
      if (!element) return [id, { exists: false }];
      const rect = element.getBoundingClientRect();
      return [id, { exists: true, borderBox: {
        left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom,
        width: rect.width, height: rect.height,
      }, interactionBackground: getComputedStyle(element).backgroundColor }];
    }));
    const semantics = Object.fromEntries(targetIds.map((id) => {
      const element = referenceTarget(id);
      const compoundSemanticHosts = new Set([
        'MAT-FORM-FIELD', 'MAT-SLIDER', 'MAT-EXPANSION-PANEL', 'MAT-CHECKBOX', 'MAT-SLIDE-TOGGLE',
      ]);
      const semanticElement = element && compoundSemanticHosts.has(element.tagName) && !roleOf(element)
        ? element.querySelector('button,input,select,textarea,[role]') ?? element : element;
      return [id, element ? {
        exists: true,
        role: roleOf(semanticElement),
        name: semanticName(semanticElement),
        value: semanticElement instanceof HTMLSelectElement ? semanticElement.selectedOptions[0]?.textContent?.trim() :
          semanticElement instanceof HTMLInputElement || semanticElement instanceof HTMLTextAreaElement ? semanticElement.value :
            semanticElement.tagName === 'MAT-SELECT' ? semanticElement.textContent?.replace(/\s+/g, ' ').trim() : undefined,
        checked: semanticElement instanceof HTMLInputElement && ['checkbox', 'radio'].includes(semanticElement.type) ? semanticElement.checked : booleanAttribute(semanticElement, 'aria-checked'),
        selected: booleanAttribute(semanticElement, 'aria-selected'),
        expanded: booleanAttribute(semanticElement, 'aria-expanded'),
        pressed: booleanAttribute(semanticElement, 'aria-pressed'),
        invalid: booleanAttribute(semanticElement, 'aria-invalid'),
        sort: semanticElement.getAttribute('aria-sort') ?? undefined,
        activeDescendant: semanticElement.getAttribute('aria-activedescendant') ?? undefined,
        valueMin: numberAttribute(semanticElement, 'aria-valuemin'),
        valueMax: numberAttribute(semanticElement, 'aria-valuemax'),
        valueNow: numberAttribute(semanticElement, 'aria-valuenow'),
        valueText: semanticElement.getAttribute('aria-valuetext') ?? undefined,
        disabled: 'disabled' in semanticElement ? semanticElement.disabled : booleanAttribute(semanticElement, 'aria-disabled'),
      } : { exists: false }];
    }));
    function booleanAttribute(element, attribute) {
      const value = element.getAttribute(attribute);
      if (value === 'true') return true;
      if (value === 'false') return false;
      return value === 'mixed' ? 'mixed' : undefined;
    }
    function numberAttribute(element, attribute) {
      const value = element.getAttribute(attribute);
      return value !== null && Number.isFinite(Number(value)) ? Number(value) : undefined;
    }
    function referenceTarget(id) {
      const authored = document.getElementById(id);
      if (authored) return authored;
      const parityTargets = [...document.querySelectorAll(`[data-parity-id="${CSS.escape(id)}"]`)];
      return parityTargets.find((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && getComputedStyle(element).visibility !== 'hidden';
      }) ?? referenceGeneratedTextTarget(id);
    }
    function referenceGeneratedTextTarget(id) {
      const selectors = {
        'badge-count': '#badge-primary .mat-badge-content',
        'paginator-size': '#paginator-primary .mat-mdc-paginator-page-size-label',
        'paginator-range': '#paginator-primary .mat-mdc-paginator-range-label',
        'tooltip-popup': '.mat-mdc-tooltip-surface',
        'dialog-panel': '.mat-mdc-dialog-surface',
        'bottom-sheet-panel': '.mat-bottom-sheet-container',
      };
      return selectors[id] ? document.querySelector(selectors[id]) : null;
    }
    function semanticName(element) {
      const explicit = element.getAttribute('aria-label') ?? element.getAttribute('alt');
      if (explicit !== null) return explicit;
      const labelled = 'labels' in element ? [...(element.labels ?? [])].map((label) => label.textContent ?? '').join(' ') : '';
      const enclosing = element.closest('label')?.textContent ?? '';
      return (labelled || enclosing || element.textContent || '').replace(/\s+/g, ' ').trim();
    }
    return { elements, semantics };
  }, ids);
}

function profileTheme(profile) {
  const profiles = {
    light: { mode: 'light', primary: '#6750a4', tertiary: '#7d5260', surface: '#fffbfe', error: '#b3261e', density: 0, cornerScale: 1, typographyScale: 1 },
    dark: { mode: 'dark', primary: '#d0bcff', tertiary: '#efb8c8', surface: '#1c1b1f', error: '#f2b8b5', density: 0, cornerScale: 1, typographyScale: 1 },
    contrast: { mode: 'light', primary: '#000000', tertiary: '#203864', surface: '#ffffff', error: '#8b0000', density: -5, cornerScale: .75, typographyScale: .9 },
    custom: { mode: 'light', primary: '#006a6a', tertiary: '#a43c42', surface: '#f4fbfa', error: '#ba1a1a', density: -2, cornerScale: 1.5, typographyScale: 1.15 },
  };
  return profiles[profile];
}

function comparePng(reference, candidate) {
  if (reference.width !== candidate.width || reference.height !== candidate.height) return 0;
  return ssim(reference, candidate, { ssim: 'fast' }).mssim;
}

function compareTextAlignment(referenceImage, candidateImage, referenceElements, candidateElements, targets, scale, directory) {
  return targets.map((id) => {
    const expectedBox = referenceElements[id]?.borderBox;
    const actualBox = candidateElements[id]?.borderBox;
    if (!expectedBox && !actualBox) return { id, matches: true, skipped: true, reason: 'target is absent in both modes' };
    if (!expectedBox || !actualBox) return { id, matches: false, reason: 'target geometry is missing' };
    const horizontalInsetFraction = materialLeftAlignedTextTargets.includes(id) ? 0 : .12;
    const reference = measureTextInkCenter(referenceImage, expectedBox, scale, { horizontalInsetFraction });
    const astylar = measureTextInkCenter(candidateImage, actualBox, scale, { horizontalInsetFraction });
    if (!reference || !astylar) return { id, matches: false, reason: 'text ink could not be isolated' };
    const offsetErrorPx = materialAbsoluteTextAlignmentTargets.includes(id)
      ? Math.abs(reference.centerY - astylar.centerY)
      : textCenterOffsetError(reference, astylar);
    writeAlignmentArtifacts(referenceImage, candidateImage, expectedBox, scale, directory, id);
    return {
      id,
      reference,
      astylar,
      offsetErrorPx,
      matches: offsetErrorPx <= (materialTextAlignmentToleranceOverrides[id] ?? materialThresholds.maximumTextCenterOffsetErrorPx),
    };
  });
}

function compareUniformBackgrounds(referenceImage, candidateImage, referenceElements, candidateElements, target, scale) {
  if (!target) return [];
  const referenceContainerBox = referenceElements[target.container]?.borderBox;
  const candidateContainerBox = candidateElements[target.container]?.borderBox;
  if (!referenceContainerBox || !candidateContainerBox) {
    return [{ id: target.container, matches: false, reason: 'container geometry is missing' }];
  }
  const referenceContainer = sampleFlatColor(referenceImage, referenceContainerBox, scale, 'top-center');
  const astylarContainer = sampleFlatColor(candidateImage, candidateContainerBox, scale, 'top-center');
  return target.surfaces.map((id) => {
    const referenceBox = referenceElements[id]?.borderBox;
    const candidateBox = candidateElements[id]?.borderBox;
    if (!referenceBox || !candidateBox) return { id, matches: false, reason: 'surface geometry is missing' };
    const referenceSurface = sampleFlatColor(referenceImage, referenceBox, scale, 'bottom');
    const astylarSurface = sampleFlatColor(candidateImage, candidateBox, scale, 'bottom');
    const maximumChannelError = Math.max(
      colorChannelError(referenceContainer, referenceSurface),
      colorChannelError(astylarContainer, astylarSurface),
      colorChannelError(referenceContainer, astylarContainer),
      colorChannelError(referenceSurface, astylarSurface),
    );
    return {
      id, referenceContainer, referenceSurface, astylarContainer, astylarSurface, maximumChannelError,
      matches: maximumChannelError <= 1,
    };
  });
}

function sampleFlatColor(image, box, scale, position = 'top-left') {
  const sampleX = position === 'top-center' ? box.left + box.width / 2 : box.left + 10;
  const x = Math.max(0, Math.min(image.width - 1, Math.round(sampleX * scale)));
  const sampleY = position === 'bottom' ? box.bottom - 10 : box.top + 14;
  const y = Math.max(0, Math.min(image.height - 1, Math.round(sampleY * scale)));
  const offset = (y * image.width + x) * 4;
  return [...image.data.subarray(offset, offset + 4)];
}

function colorChannelError(first, second) {
  return Math.max(...first.map((channel, index) => Math.abs(channel - second[index])));
}

function compareFocusedRaster(reference, candidate, referenceElements, target, scale, directory) {
  const box = referenceElements[target.element]?.borderBox;
  if (!box) return { id: target.element, matches: false, reason: 'target geometry is missing' };
  const padding = target.padding ?? 0;
  const bounds = {
    left: Math.max(0, Math.floor((box.left - padding) * scale)),
    top: Math.max(0, Math.floor((box.top - padding) * scale)),
    right: Math.min(reference.width, Math.ceil((box.right + padding) * scale)),
    bottom: Math.min(reference.height, Math.ceil((box.bottom + (target.paddingBottom ?? padding)) * scale)),
  };
  const referenceCrop = cropPng(reference, bounds);
  const astylarCrop = cropPng(candidate, bounds);
  const similarity = comparePng(referenceCrop, astylarCrop);
  writeFileSync(path.join(directory, `${target.element}-raster-reference.png`), PNG.sync.write(referenceCrop));
  writeFileSync(path.join(directory, `${target.element}-raster-astylar.png`), PNG.sync.write(astylarCrop));
  return { id: target.element, similarity, minimumSsim: target.minimumSsim, matches: similarity >= target.minimumSsim };
}

function writeAlignmentArtifacts(reference, candidate, box, scale, directory, id) {
  const bounds = {
    left: Math.max(0, Math.floor((box.left - 4) * scale)),
    top: Math.max(0, Math.floor((box.top - 4) * scale)),
    right: Math.min(reference.width, Math.ceil((box.right + 4) * scale)),
    bottom: Math.min(reference.height, Math.ceil((box.bottom + 4) * scale)),
  };
  const referenceCrop = cropPng(reference, bounds);
  const astylarCrop = cropPng(candidate, bounds);
  writeFileSync(path.join(directory, `${id}-alignment-reference.png`), PNG.sync.write(referenceCrop));
  writeFileSync(path.join(directory, `${id}-alignment-astylar.png`), PNG.sync.write(astylarCrop));
}

function cropPng(image, bounds) {
  const width = Math.max(0, bounds.right - bounds.left);
  const height = Math.max(0, bounds.bottom - bounds.top);
  const output = new PNG({ width, height });
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const sourceOffset = ((bounds.top + y) * image.width + bounds.left + x) * 4;
      const targetOffset = (y * width + x) * 4;
      output.data.set(image.data.subarray(sourceOffset, sourceOffset + 4), targetOffset);
    }
  }
  return output;
}

function compareGeometry(reference, candidate, excludedIds = []) {
  const elements = [];
  const errors = [];
  for (const [id, expected] of Object.entries(reference)) {
    if (excludedIds.includes(id)) continue;
    const actual = candidate[id];
    if (!expected.exists || !actual?.exists) { elements.push({ id, missing: true }); continue; }
    const edgeErrors = Object.fromEntries(['left', 'top', 'right', 'bottom'].map((edge) => {
      const error = Math.abs(expected.borderBox[edge] - actual.borderBox[edge]);
      errors.push(error); return [edge, error];
    }));
    elements.push({ id, missing: false, expected: expected.borderBox, actual: actual.borderBox, edgeErrors });
  }
  return {
    measuredEdgeCount: errors.length,
    edgesWithinTolerance: errors.length ? errors.filter((error) => error <= materialThresholds.edgeTolerancePx).length / errors.length : 0,
    maximumEdgeError: errors.length ? Math.max(...errors) : null,
    elements,
  };
}

function compareSemantics(reference, candidate, excludedIds = []) {
  return Object.entries(reference).filter(([id]) => !excludedIds.includes(id)).map(([id, expected]) => {
    const actual = candidate[id];
    // Native checkbox/radio values are form-submission metadata, not part of
    // their ARIA semantics. Custom role-based controls are equivalent without
    // reproducing the browser's implicit `value="on"` property.
    const properties = ['role', 'name', 'value', 'checked', 'selected', 'expanded', 'pressed', 'invalid', 'sort',
      'activeDescendant', 'valueMin', 'valueMax', 'valueNow', 'valueText', 'disabled']
      .filter((property) => property !== 'value' || !['checkbox', 'radio'].includes(expected.role));
    const same = (property) => property === 'activeDescendant'
      ? !!expected[property] === !!actual?.[property]
      : expected[property] === actual?.[property];
    const matches = expected.exists === actual?.exists && (!expected.exists ||
      properties.every(same));
    return { id, matches, expected, actual };
  });
}

function summarize(results) {
  const similarities = results.map(({ screenshotSimilarity }) => screenshotSimilarity).sort((a, b) => a - b);
  const medianSsim = similarities.length ? similarities[Math.floor(similarities.length / 2)] : 0;
  const minimumSsim = similarities.length ? similarities[0] : 0;
  const maximumEdgeError = Math.max(...results.map(({ geometry }) => geometry.maximumEdgeError ?? Infinity));
  const textAlignmentResults = results.flatMap(({ textAlignment }) => textAlignment ?? []);
  const uniformBackgroundResults = results.flatMap(({ uniformBackgrounds }) => uniformBackgrounds ?? []);
  const focusedRasterResults = results.flatMap(({ focusedRasters }) => focusedRasters ?? []);
  const shadowProfileResults = results.flatMap(({ shadowProfiles }) => shadowProfiles ?? []);
  const maximumTextCenterOffsetErrorPx = maximumFiniteOffset(textAlignmentResults);
  const passingCases = results.filter(({ meetsAcceptance }) => meetsAcceptance).length;
  return {
    passingCases, failingCases: results.length - passingCases, minimumSsim, medianSsim, maximumEdgeError,
    textAlignmentTargets: textAlignmentResults.length,
    textAlignmentTargetsPassing: textAlignmentResults.filter(({ matches }) => matches).length,
    uniformBackgroundTargets: uniformBackgroundResults.length,
    uniformBackgroundTargetsPassing: uniformBackgroundResults.filter(({ matches }) => matches).length,
    focusedRasterTargets: focusedRasterResults.length,
    focusedRasterTargetsPassing: focusedRasterResults.filter(({ matches }) => matches).length,
    shadowProfileTargets: shadowProfileResults.length,
    shadowProfileTargetsPassing: shadowProfileResults.filter(({ matches }) => matches).length,
    maximumTextCenterOffsetErrorPx,
    meetsAcceptance: results.length === materialStaticCases.length && passingCases === results.length &&
      medianSsim >= materialThresholds.aggregateMedianSsim,
  };
}

function summarizeInteractions(results) {
  const similarities = results.map(({ screenshotSimilarity }) => screenshotSimilarity).sort((a, b) => a - b);
  const passingCases = results.filter(({ meetsAcceptance }) => meetsAcceptance).length;
  const textAlignmentResults = results.flatMap(({ textAlignment }) => textAlignment ?? []);
  const focusedRasterResults = results.flatMap(({ focusedRasters }) => focusedRasters ?? []);
  return {
    executedCases: results.length,
    passingCases,
    failingCases: results.length - passingCases,
    minimumSsim: similarities.length ? similarities[0] : 1,
    medianSsim: similarities.length ? similarities[Math.floor(similarities.length / 2)] : 1,
    textAlignmentTargets: textAlignmentResults.length,
    textAlignmentTargetsPassing: textAlignmentResults.filter(({ matches }) => matches).length,
    focusedRasterTargets: focusedRasterResults.length,
    focusedRasterTargetsPassing: focusedRasterResults.filter(({ matches }) => matches).length,
    maximumTextCenterOffsetErrorPx: maximumFiniteOffset(textAlignmentResults),
    meetsAcceptance: results.length === materialInteractionCases.length + materialMobileFlowCases.length &&
      passingCases === results.length,
  };
}

function maximumFiniteOffset(results) {
  const offsets = results.map(({ offsetErrorPx }) => offsetErrorPx).filter(Number.isFinite);
  return offsets.length ? Math.max(...offsets) : 0;
}

function humanSummary(report) {
  const summary = report.summary;
  return `# Material parity report\n\n` +
    `- Mode: ${report.mode}\n- Cases: ${report.executedCases}/${report.configuredCases}\n` +
    `- Passing: ${summary.passingCases}\n- Failing: ${summary.failingCases}\n` +
    `- Minimum SSIM: ${summary.minimumSsim.toFixed(6)}\n- Median SSIM: ${summary.medianSsim.toFixed(6)}\n` +
    `- Maximum edge error: ${Number.isFinite(summary.maximumEdgeError) ? `${summary.maximumEdgeError.toFixed(3)}px` : 'unmeasured'}\n` +
    `- Text alignment: ${summary.textAlignmentTargetsPassing}/${summary.textAlignmentTargets} ` +
    `(maximum center-offset error ${summary.maximumTextCenterOffsetErrorPx.toFixed(3)}px)\n` +
    `- Uniform backgrounds: ${summary.uniformBackgroundTargetsPassing}/${summary.uniformBackgroundTargets}\n` +
    `- Focused rasters: ${summary.focusedRasterTargetsPassing}/${summary.focusedRasterTargets}\n` +
    `- Shadow profiles: ${summary.shadowProfileTargetsPassing}/${summary.shadowProfileTargets}\n` +
    `- Meets acceptance: ${summary.meetsAcceptance ? 'yes' : 'no'}\n` +
    `- Interaction cases: ${report.interactionSummary.executedCases}\n` +
    `- Interaction passing: ${report.interactionSummary.passingCases}\n` +
    `- Interaction failing: ${report.interactionSummary.failingCases}\n` +
    `- Interaction minimum SSIM: ${report.interactionSummary.minimumSsim.toFixed(6)}\n` +
    `- Interaction text alignment: ${report.interactionSummary.textAlignmentTargetsPassing}/` +
    `${report.interactionSummary.textAlignmentTargets} (maximum center-offset error ` +
    `${report.interactionSummary.maximumTextCenterOffsetErrorPx.toFixed(3)}px)\n` +
    `- Interaction focused rasters: ${report.interactionSummary.focusedRasterTargetsPassing}/` +
    `${report.interactionSummary.focusedRasterTargets}\n` +
    `- Interaction meets acceptance: ${report.interactionSummary.meetsAcceptance ? 'yes' : 'no'}\n`;
}
