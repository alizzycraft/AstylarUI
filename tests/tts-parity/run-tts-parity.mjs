import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright-core';
import { PNG } from 'pngjs';
import { ssim } from 'ssim.js';
import {
  acceptance, interactionApplicability, interactionScenarios, measurementIds, reference,
  sharpnessRegions, states, textMeasurementIds, viewports,
} from './benchmark.config.mjs';
import { cropRgba, compareSharpness, evaluateSharpness } from '../parity/sharpness-metrics.mjs';
import { compareScrolling } from './scrolling-metrics.mjs';
import {
  evaluateInteractionRaster,
  hasRasterColor,
  selectionGlyphAlignment,
} from './interaction-metrics.mjs';

const root = process.cwd();
const demo = path.join(root, 'examples', 'ai-tts-demo');
const artifacts = path.join(root, 'artifacts', 'tts-parity');
const referenceRoot = path.join(root, 'tests', 'tts-parity', 'reference');
const port = Number(process.env['ASTYLAR_TTS_PARITY_PORT'] ?? 4421);
const baseUrl = `http://127.0.0.1:${port}`;
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const enforce = process.argv.includes('--enforce');
const skipBuild = process.argv.includes('--skip-build');
const interactionsOnly = process.argv.includes('--interactions-only');
const interactionFilter = process.env['ASTYLAR_TTS_INTERACTION'];
let browser;
let server;
let serverOutput = '';

try {
  mkdirSync(artifacts, { recursive: true });
  if (!skipBuild) prepareAndBuildDemo();
  startDemoServer();
  await waitFor(async () => (await fetch(baseUrl)).ok, 'the TTS production server', 30_000);

  browser = await chromium.launch({
    channel: process.env['ASTYLAR_TTS_BROWSER_CHANNEL'] ?? 'chrome',
    headless: true,
  });
  const browserVersion = await browser.version();
  const results = [];
  let repeatabilityChecked = false;

  if (!interactionsOnly) for (const state of states) for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: viewport.deviceScaleFactor,
      colorScheme: 'dark',
      reducedMotion: 'reduce',
    });
    const scenarioDir = path.join(artifacts, state, viewport.id);
    mkdirSync(scenarioDir, { recursive: true });
    const referenceCapture = await captureReference(context, state, viewport, scenarioDir);
    const astylarCapture = await captureAstylar(context, state, viewport, scenarioDir);
    if (!repeatabilityChecked) {
      const repeat = await captureAstylar(context, state, viewport, scenarioDir, 'repeat.png');
      assert.equal(hash(astylarCapture.buffer), hash(repeat.buffer),
        'The Astylar benchmark capture was nondeterministic within one settled browser run.');
      repeatabilityChecked = true;
    }
    const comparison = compareScenario(referenceCapture, astylarCapture, viewport, scenarioDir);
    results.push({ state, viewport, ...comparison });
    await context.close();
  }

  const interactionResults = [];
  for (const scenario of interactionScenarios.filter(({ id }) => !interactionFilter || id === interactionFilter)) {
    for (const profileId of scenario.profiles) {
      console.log(`TTS interaction: ${scenario.id}@${profileId}`);
      const viewport = viewports.find(({ id }) => id === profileId);
      assert.ok(viewport, `Unknown TTS interaction viewport ${profileId}.`);
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: viewport.deviceScaleFactor,
        colorScheme: 'dark',
        reducedMotion: 'reduce',
        permissions: ['clipboard-read', 'clipboard-write'],
      });
      interactionResults.push(...await captureInteractionScenario(context, scenario, viewport));
      await context.close();
    }
  }

  const infrastructureErrors = [
    ...results.flatMap((result) => result.infrastructureErrors.map((error) =>
      `${result.state}@${result.viewport.id}: ${error}`)),
    ...interactionResults.flatMap((result) => result.infrastructureErrors.map((error) =>
      `${result.scenario}@${result.viewport.id}/${result.step}: ${error}`)),
  ];
  const summary = summarize(results, interactionResults);
  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    mode: enforce ? 'enforced' : 'report-only',
    reference,
    browser: { name: 'Chromium', version: browserVersion },
    acceptance,
    states,
    viewports,
    interactionApplicability,
    summary,
    infrastructureErrors,
    scenarios: results,
    interactions: interactionResults,
  };
  writeFileSync(path.join(artifacts, 'latest-report.json'), `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(path.join(artifacts, 'latest-summary.md'), humanSummary(report));
  console.log(humanSummary(report));
  assert.deepEqual(infrastructureErrors, [], 'TTS parity evidence was incomplete or malformed.');
  if (enforce) assert.equal(summary.meetsAcceptance, true,
    'TTS parity remains below the calibrated acceptance configuration.');
} catch (error) {
  if (serverOutput) console.error(`Recent TTS server output:\n${serverOutput}`);
  throw error;
} finally {
  await browser?.close();
  await stopServer();
}

function prepareAndBuildDemo() {
  run(npm, ['run', 'build:lib'], root);
  // The dedicated packed-consumer check owns npm installation. This visual
  // harness refreshes the already-installed local dependency directly so an
  // offline report does not spend time resolving the network dependency tree.
  const installed = path.join(demo, 'node_modules', 'astylarui');
  assert.ok(existsSync(path.join(demo, 'node_modules')), 'Run npm install in the TTS demo before the benchmark.');
  rmSync(installed, { recursive: true, force: true });
  mkdirSync(path.join(installed, 'dist'), { recursive: true });
  cpSync(path.join(root, 'dist', 'lib'), path.join(installed, 'dist', 'lib'), { recursive: true });
  cpSync(path.join(root, 'package.json'), path.join(installed, 'package.json'));
  cpSync(path.join(root, 'README.md'), path.join(installed, 'README.md'));
  run(npm, ['run', 'build'], demo);
  assert.ok(existsSync(path.join(demo, 'dist', 'ai-tts-demo', 'server', 'server.mjs')),
    'The TTS production server bundle is missing.');
}

function run(command, args, cwd, capture = false) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: capture ? 'utf8' : undefined,
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed (${result.status}).` +
    (capture ? `\n${result.stdout}\n${result.stderr}` : ''));
  return capture ? result.stdout : '';
}

function startDemoServer() {
  const browserRoot = path.join(demo, 'dist', 'ai-tts-demo', 'browser');
  server = createServer((request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url ?? '/', baseUrl).pathname);
      const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
      const absolute = path.resolve(browserRoot, relative);
      if (!absolute.startsWith(path.resolve(browserRoot)) || !existsSync(absolute)) {
        response.writeHead(404).end('Not found'); return;
      }
      const extension = path.extname(absolute);
      const contentType = extension === '.js' ? 'text/javascript' : extension === '.css' ? 'text/css' :
        extension === '.json' ? 'application/json' : extension === '.svg' ? 'image/svg+xml' : 'text/html';
      response.writeHead(200, { 'content-type': contentType });
      response.end(readFileSync(absolute));
    } catch (error) {
      serverOutput = `${serverOutput}${String(error)}`.slice(-8_000);
      response.writeHead(500).end('Server error');
    }
  });
  server.listen(port, '127.0.0.1');
}

async function captureReference(context, state, viewport, scenarioDir) {
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const html = readFileSync(path.join(referenceRoot, 'index.html'), 'utf8');
  const css = readFileSync(path.join(referenceRoot, 'styles.css'), 'utf8');
  await page.setContent(html.replace('<link rel="stylesheet" href="styles.css">', `<style>${css}</style>`),
    { waitUntil: 'domcontentloaded' });
  await page.evaluate((value) => {
    document.body.dataset['state'] = value;
    const text = document.getElementById('speech-text');
    const count = document.getElementById('character-count');
    if (text instanceof HTMLTextAreaElement) text.value = value === 'generated' ? 'hello' : '';
    if (count) count.textContent = value === 'generated'
      ? '1 lines | 5 chars | 1 tks | ~$0.00007 est.'
      : '1 lines | 0 chars | 1 tks | ~$0.00007 est.';
  }, state);
  const fontsReady = await page.evaluate(async () => { await document.fonts.ready; return document.fonts.status; });
  await settle(page);
  const measurement = await page.evaluate(({ ids }) => {
    const capture = { left: 0, top: 0, right: innerWidth, bottom: innerHeight };
    const intersect = (a, b) => ({
      left: Math.max(a.left, b.left), top: Math.max(a.top, b.top),
      right: Math.min(a.right, b.right), bottom: Math.min(a.bottom, b.bottom),
    });
    return {
      elements: Object.fromEntries(ids.map((id) => {
        const element = document.getElementById(id);
        if (!element || element.getClientRects().length === 0) return [id, { exists: false }];
        const rect = element.getBoundingClientRect();
        const borderBox = { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom,
          width: rect.width, height: rect.height };
        let visible = intersect(borderBox, capture);
        const owners = [];
        let ancestor = element.parentElement;
        while (ancestor && ancestor !== document.body) {
          const style = getComputedStyle(ancestor);
          if ([style.overflow, style.overflowX, style.overflowY].some((value) =>
            ['hidden', 'clip', 'auto', 'scroll'].includes(value))) {
            const before = visible;
            const next = intersect(visible, ancestor.getBoundingClientRect());
            if (next.right <= next.left || next.bottom <= next.top ||
                next.right - next.left < before.right - before.left ||
                next.bottom - next.top < before.bottom - before.top) owners.push(ancestor.id || ancestor.tagName.toLowerCase());
            visible = next;
          }
          ancestor = ancestor.parentElement;
        }
        const intersectsViewport = visible.right > visible.left && visible.bottom > visible.top;
        const fullyVisible = intersectsViewport && visible.left === rect.left && visible.top === rect.top &&
          visible.right === rect.right && visible.bottom === rect.bottom;
        return [id, { exists: true, borderBox, text: element instanceof HTMLInputElement ||
          element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement
          ? element.value : element.innerText?.replace(/\s+/g, ' ').trim(),
          visibility: { exists: true, intersectsViewport, fullyVisible, clipped: !fullyVisible,
            clippingAncestorIds: owners } }];
      })),
      scrolling: Object.fromEntries([...document.querySelectorAll('[id]')].flatMap((element) => {
        const style = getComputedStyle(element);
        if (![style.overflow, style.overflowX, style.overflowY].some((value) => ['auto', 'scroll'].includes(value))) return [];
        const maxScrollLeft = Math.max(0, element.scrollWidth - element.clientWidth);
        const maxScrollTop = Math.max(0, element.scrollHeight - element.clientHeight);
        return [[element.id, { scrollLeft: element.scrollLeft, scrollTop: element.scrollTop,
          scrollWidth: element.scrollWidth, scrollHeight: element.scrollHeight,
          clientWidth: element.clientWidth, clientHeight: element.clientHeight,
          initialScrollLeft: element.scrollLeft, initialScrollTop: element.scrollTop,
          maxScrollLeft, maxScrollTop, canReachRight: element.scrollLeft >= maxScrollLeft - 1,
          canReachBottom: element.scrollTop >= maxScrollTop - 1 }]];
      })),
      capture,
    };
  }, { ids: measurementIds });
  const buffer = await page.screenshot({ path: path.join(scenarioDir, 'reference.png'), animations: 'disabled' });
  await page.close();
  return { buffer, image: PNG.sync.read(buffer), measurement, errors, fontsReady,
    captureBounds: { x: 0, y: 0, width: viewport.width, height: viewport.height } };
}

async function captureAstylar(context, state, viewport, scenarioDir, filename = 'astylar.png') {
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(`${baseUrl}/?parityState=${state}`, { waitUntil: 'networkidle' });
  await page.getByTestId('renderer-status').waitFor({ state: 'attached' });
  await page.waitForFunction(() => document.querySelector('[data-testid="renderer-status"]')?.textContent ===
    'AstylarUI renderer ready.' && !!window.__ASTYLAR_TTS_BENCHMARK__, undefined, { timeout: 30_000 });
  const fontsReady = await page.evaluate(async () => { await document.fonts.ready; return document.fonts.status; });
  await settle(page);
  const measurement = await page.evaluate((ids) => window.__ASTYLAR_TTS_BENCHMARK__?.measure(ids), measurementIds);
  assert.ok(measurement, 'The Astylar benchmark hook did not return measurements.');
  const locator = page.getByTestId('tts-astylar-surface').locator('canvas');
  const bounds = await locator.boundingBox();
  assert.ok(bounds, 'The Astylar canvas capture bounds are missing.');
  const buffer = await locator.screenshot({ path: path.join(scenarioDir, filename), animations: 'disabled' });
  await page.close();
  return { buffer, image: PNG.sync.read(buffer), measurement, errors, fontsReady, captureBounds: bounds };
}

async function captureInteractionScenario(context, scenario, viewport) {
  const scenarioDir = path.join(artifacts, 'interactions', scenario.id, viewport.id);
  mkdirSync(scenarioDir, { recursive: true });
  const actionIds = scenario.steps.flatMap(({ actions }) => actions.map(({ elementId }) => elementId).filter(Boolean));
  const ids = [...new Set([...measurementIds, scenario.elementId, ...actionIds])];
  const referencePage = await context.newPage();
  const astylarPage = await context.newPage();
  const referenceErrors = [];
  const astylarErrors = [];
  referencePage.on('pageerror', (error) => referenceErrors.push(error.message));
  astylarPage.on('pageerror', (error) => astylarErrors.push(error.message));
  astylarPage.on('console', (message) => { if (message.type() === 'error') astylarErrors.push(message.text()); });
  await prepareReferenceInteractionPage(referencePage, scenario.state);
  await prepareAstylarInteractionPage(astylarPage, scenario.state);
  let referenceMeasurement = await measureReferenceInteraction(referencePage, ids);
  let astylarMeasurement = await astylarPage.evaluate((targetIds) =>
    window.__ASTYLAR_TTS_BENCHMARK__?.measure(targetIds), ids);
  const results = [];
  const cycles = scenario.repeatCycles ?? 1;
  const astylarCanvas = astylarPage.getByTestId('tts-astylar-surface').locator('canvas');
  let previousAstylarBuffer = await astylarCanvas.screenshot({ animations: 'disabled' });

  for (let cycle = 0; cycle < cycles; cycle += 1) {
    for (const step of scenario.steps) {
      let referenceClipboardText;
      let astylarClipboardText;
      for (const action of step.actions) {
        const referenceActionResult = await performTtsInteractionAction(
          referencePage, 'reference', action, referenceMeasurement,
        );
        const astylarActionResult = await performTtsInteractionAction(
          astylarPage, 'astylar', action, astylarMeasurement,
        );
        if (action.type === 'copy-selection') {
          referenceClipboardText = referenceActionResult;
          astylarClipboardText = astylarActionResult;
        }
      }
      console.log(`  capture ${cycles > 1 ? `cycle-${cycle + 1}-` : ''}${step.id}`);
      await settle(referencePage);
      await settle(astylarPage);
      await astylarPage.waitForFunction(() =>
        document.querySelector('[data-testid="renderer-status"]')?.textContent === 'AstylarUI renderer ready.');
      referenceMeasurement = await measureReferenceInteraction(referencePage, ids);
      astylarMeasurement = await astylarPage.evaluate((targetIds) =>
        window.__ASTYLAR_TTS_BENCHMARK__?.measure(targetIds), ids);
      assert.ok(astylarMeasurement, 'The Astylar interaction benchmark hook did not return measurements.');
      if (step.clipboardText) {
        referenceMeasurement.clipboardText = referenceClipboardText;
        astylarMeasurement.clipboardText = astylarClipboardText;
      }
      astylarMeasurement.domPointerTarget = await astylarPage.evaluate(() => {
        const target = document.elementFromPoint(
          window.__TTS_POINTER_X__ ?? 0,
          window.__TTS_POINTER_Y__ ?? 0,
        );
        return target instanceof HTMLElement
          ? { tag: target.tagName, id: target.id, testId: target.dataset['testid'] }
          : undefined;
      });

      const stepId = cycles > 1 ? `cycle-${cycle + 1}-${step.id}` : step.id;
      const stepDir = path.join(scenarioDir, stepId);
      mkdirSync(stepDir, { recursive: true });
      const referenceBuffer = await referencePage.screenshot({
        path: path.join(stepDir, 'reference.png'), animations: 'disabled',
      });
      const astylarBuffer = await astylarCanvas.screenshot({
        path: path.join(stepDir, 'astylar.png'), animations: 'disabled',
      });
      const comparison = compareInteractionStep(
        scenario, step, viewport, referenceMeasurement, astylarMeasurement,
        referenceBuffer, astylarBuffer, previousAstylarBuffer, stepDir,
      );
      results.push({
        scenario: scenario.id, state: scenario.state, step: stepId, cycle: cycle + 1,
        viewport, ...comparison,
        runtime: { referenceErrors: [...referenceErrors], astylarErrors: [...astylarErrors] },
      });
      previousAstylarBuffer = astylarBuffer;
    }
  }
  addInteractionLifecycleEvidence(results, scenario);
  await referencePage.close();
  await astylarPage.close();
  return results;
}

async function prepareReferenceInteractionPage(page, state) {
  const html = readFileSync(path.join(referenceRoot, 'index.html'), 'utf8');
  const css = readFileSync(path.join(referenceRoot, 'styles.css'), 'utf8');
  await page.setContent(html.replace('<link rel="stylesheet" href="styles.css">', `<style>${css}</style>`),
    { waitUntil: 'domcontentloaded' });
  await page.evaluate((value) => {
    document.body.dataset['state'] = value;
    const text = document.getElementById('speech-text');
    const count = document.getElementById('character-count');
    if (text instanceof HTMLTextAreaElement) text.value = value === 'generated' ? 'hello' : '';
    if (count) count.textContent = value === 'generated'
      ? '1 lines | 5 chars | 1 tks | ~$0.00007 est.'
      : '1 lines | 0 chars | 1 tks | ~$0.00007 est.';
    window.__TTS_REFERENCE_EVENTS__ = [];
    for (const type of ['pointerdown', 'pointerup', 'click', 'focus', 'blur', 'keydown', 'input', 'change']) {
      document.addEventListener(type, (event) => {
        const target = event.target;
        if (target instanceof HTMLElement && target.id) {
          window.__TTS_REFERENCE_EVENTS__.push({ type, targetId: target.id });
        }
      }, true);
    }
    const voice = document.getElementById('voice');
    voice?.addEventListener('click', () => {
      voice.dataset['benchmarkExpanded'] = voice.dataset['benchmarkExpanded'] === 'true' ? 'false' : 'true';
    });
    voice?.addEventListener('change', () => { voice.dataset['benchmarkExpanded'] = 'false'; });
    voice?.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' || event.key === 'Enter') voice.dataset['benchmarkExpanded'] = 'false';
    });
    document.addEventListener('pointerdown', (event) => {
      if (event.target !== voice) voice.dataset['benchmarkExpanded'] = 'false';
    }, true);
  }, state);
  await page.evaluate(async () => { await document.fonts.ready; });
  await settle(page);
}

async function prepareAstylarInteractionPage(page, state) {
  await page.goto(`${baseUrl}/?parityState=${state}`, { waitUntil: 'networkidle' });
  await page.getByTestId('renderer-status').waitFor({ state: 'attached' });
  await page.waitForFunction(() => document.querySelector('[data-testid="renderer-status"]')?.textContent ===
    'AstylarUI renderer ready.' && !!window.__ASTYLAR_TTS_BENCHMARK__, undefined, { timeout: 30_000 });
  await page.evaluate(async () => { await document.fonts.ready; });
  await settle(page);
}

async function measureReferenceInteraction(page, ids) {
  return page.evaluate((targetIds) => {
    const styleProperties = [
      'backgroundColor', 'color', 'borderTopColor', 'borderRightColor', 'borderBottomColor',
      'borderLeftColor', 'borderTopWidth', 'borderRightWidth', 'borderBottomWidth',
      'borderLeftWidth', 'borderTopLeftRadius', 'borderTopRightRadius',
      'borderBottomRightRadius', 'borderBottomLeftRadius', 'boxShadow', 'outlineColor',
      'outlineStyle', 'outlineWidth', 'caretColor', 'cursor', 'transform',
    ];
    const elements = {};
    const controlStates = {};
    const computedStyles = {};
    for (const id of targetIds) {
      const element = document.getElementById(id);
      if (!element || element.getClientRects().length === 0) {
        elements[id] = { exists: false };
        continue;
      }
      const rect = element.getBoundingClientRect();
      elements[id] = { exists: true, borderBox: {
        left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom,
        width: rect.width, height: rect.height,
      } };
      const style = getComputedStyle(element);
      computedStyles[id] = Object.fromEntries(styleProperties.map((property) => [property, style[property]]));
      if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement ||
          element instanceof HTMLSelectElement) {
        controlStates[id] = {
          value: element.value, focused: document.activeElement === element,
          selectionStart: 'selectionStart' in element ? element.selectionStart : null,
          selectionEnd: 'selectionEnd' in element ? element.selectionEnd : null,
          selectionDirection: 'selectionDirection' in element ? element.selectionDirection : null,
          selectedIndex: element instanceof HTMLSelectElement ? element.selectedIndex : null,
          expanded: element.dataset['benchmarkExpanded'] === 'true',
          caretColor: style.caretColor,
        };
      }
    }
    const pointed = document.elementFromPoint(window.__TTS_POINTER_X__ ?? 0, window.__TTS_POINTER_Y__ ?? 0);
    const pointedId = pointed instanceof HTMLElement ? pointed.closest('[id]')?.id : undefined;
    const hovered = pointed instanceof Element && pointed.matches(':hover') ? pointedId : undefined;
    const pressed = pointed instanceof Element && pointed.matches(':active') ? pointedId : undefined;
    const focused = document.activeElement instanceof HTMLElement ? document.activeElement.id : undefined;
    const pointer = document.elementFromPoint(window.__TTS_POINTER_X__ ?? 0, window.__TTS_POINTER_Y__ ?? 0);
    let cursor = pointer instanceof Element ? getComputedStyle(pointer).cursor : getComputedStyle(document.body).cursor;
    if (cursor === 'auto' && pointer instanceof HTMLElement) {
      cursor = pointer.matches('button, select, [role="button"], a[href]') ? 'pointer'
        : pointer.matches('input, textarea') || (pointer.textContent?.trim().length ?? 0) > 0 ? 'text' : 'default';
    }
    return {
      elements, controlStates, computedStyles,
      interaction: { hoveredElementId: hovered, pressedElementId: pressed, focusedElementId: focused },
      cursor,
      events: window.__TTS_REFERENCE_EVENTS__ ?? [],
    };
  }, ids);
}

async function performTtsInteractionAction(page, mode, action, measurement) {
  if (action.type === 'press-key') { await page.keyboard.press(action.key); return; }
  if (action.type === 'type-text') { await page.keyboard.type(action.text); return; }
  if (action.type === 'pointer-up') { await page.mouse.up(); return; }
  if (action.type === 'copy-selection') {
    if (mode === 'reference') {
      return page.evaluate(() => window.getSelection()?.toString() ?? '');
    }
    await page.evaluate(async () => {
      await navigator.clipboard.writeText('__copy_seed__');
      document.querySelector('[data-testid="tts-astylar-surface"] canvas')?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'c', code: 'KeyC', ctrlKey: true, bubbles: true }),
      );
    });
    await page.waitForFunction(async () => (await navigator.clipboard.readText()) !== '__copy_seed__');
    return page.evaluate(() => navigator.clipboard.readText());
  }
  if (action.type === 'keyboard-focus') {
    await page.evaluate(() => {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      document.body.focus();
    });
    for (let index = 0; index < 30; index += 1) {
      await page.keyboard.press('Tab');
      const focused = await page.evaluate((targetMode) => {
        const active = document.activeElement;
        return active instanceof HTMLElement
          ? (targetMode === 'astylar' ? active.dataset['astylarId'] : active.id) : undefined;
      }, mode);
      if (focused === action.elementId) return;
    }
    throw new Error(`${mode} keyboard traversal did not reach ${action.elementId}.`);
  }
  const rect = measurement?.elements?.[action.elementId]?.borderBox;
  assert.ok(rect, `Missing ${mode} interaction geometry for ${action.elementId}.`);
  const surface = mode === 'astylar'
    ? await page.getByTestId('tts-astylar-surface').locator('canvas').boundingBox()
    : { x: 0, y: 0 };
  assert.ok(surface, `Missing ${mode} interaction surface.`);
  const x = surface.x + rect.left + (action.offsetX ?? rect.width / 2);
  const y = surface.y + rect.top + (action.offsetY ?? rect.height / 2);
  await page.evaluate(({ pointerX, pointerY }) => {
    window.__TTS_POINTER_X__ = pointerX; window.__TTS_POINTER_Y__ = pointerY;
  }, { pointerX: x, pointerY: y });
  if (action.type === 'select-option' && mode === 'reference') {
    // Headless Chromium does not expose its native select popup to
    // Playwright. Keep the value/event path native via selectOption, while
    // moving the pointer to the same physical option coordinate used by the
    // Astylar popup so post-dismissal cursor evidence is comparable.
    await page.mouse.move(x, y);
    await page.locator(`#${action.elementId}`).selectOption(action.value);
    await page.keyboard.press('Escape');
    return;
  }
  if (action.type === 'click' || action.type === 'select-option') await page.mouse.click(x, y);
  else if (action.type === 'hover') await page.mouse.move(x, y);
  else if (action.type === 'pointer-down') { await page.mouse.move(x, y); await page.mouse.down(); }
  else throw new Error(`Unsupported TTS interaction action ${JSON.stringify(action)}.`);
}

function compareInteractionStep(scenario, step, viewport, referenceMeasurement, astylarMeasurement,
    referenceBuffer, astylarBuffer, previousAstylarBuffer, stepDir) {
  const infrastructureErrors = [];
  const referenceImage = PNG.sync.read(referenceBuffer);
  const astylarImage = PNG.sync.read(astylarBuffer);
  const previousAstylarImage = PNG.sync.read(previousAstylarBuffer);
  if (!sameDimensions(referenceImage, astylarImage)) infrastructureErrors.push('Interaction capture dimensions differ.');
  const referenceElement = referenceMeasurement.elements[scenario.elementId];
  const astylarElement = astylarMeasurement.elements[scenario.elementId];
  if (!referenceElement?.borderBox || !astylarElement?.borderBox) {
    infrastructureErrors.push(`Interaction target ${scenario.elementId} was not measurable.`);
  }
  const stateErrors = compareInteractionState(referenceMeasurement, astylarMeasurement, scenario, step);
  const geometryErrors = compareInteractionGeometry(referenceElement?.borderBox, astylarElement?.borderBox);
  const comparedControlIds = [...new Set([
    scenario.elementId,
    ...step.actions.map(({ elementId }) => elementId).filter(Boolean),
  ])];
  const controlErrors = compareInteractionControls(
    referenceMeasurement.controlStates,
    astylarMeasurement.controlStates,
    comparedControlIds,
  );
  const selectionGlyphAlignments = [];
  if (step.focusRingRadius) {
    const expectedRadius = Number.parseFloat(
      referenceMeasurement.computedStyles?.[scenario.elementId]?.borderTopLeftRadius ?? '0',
    );
    const ringRadii = (astylarMeasurement.visibleFocusIndicators ?? [])
      .map((indicator) => indicator.borderRadiusPx)
      .filter(Number.isFinite);
    if (!ringRadii.some((radius) => Math.abs(radius - expectedRadius) <= 0.01)) {
      controlErrors.push(
        `${scenario.elementId} focus ring radius differs (${expectedRadius}px vs ` +
        `${ringRadii.length ? ringRadii.join(',') : 'unreported'}).`,
      );
    }
    const shadow = parseSpreadShadow(
      referenceMeasurement.computedStyles?.[scenario.elementId]?.boxShadow,
    );
    if (shadow) {
      const expectedOuterRadius = expectedRadius + shadow.spread;
      const authoredRings = (astylarMeasurement.visibleFocusIndicators ?? [])
        .filter((indicator) => indicator.kind === 'authored-box-shadow');
      if (!authoredRings.some((indicator) =>
          Math.abs(indicator.outerBorderRadiusPx - expectedOuterRadius) <= 0.01 &&
          normalizeCssColor(indicator.color) === normalizeCssColor(shadow.color) &&
          Math.abs(indicator.alpha - shadow.alpha) <= 0.01)) {
        controlErrors.push(`${scenario.elementId} authored focus halo differs from ${referenceMeasurement.computedStyles?.[scenario.elementId]?.boxShadow}.`);
      }
    }
  }
  if (step.caretColor) {
    const expectedCaret = normalizeCssColor(
      referenceMeasurement.controlStates?.[scenario.elementId]?.caretColor,
    );
    const actualCaret = normalizeCssColor(
      astylarMeasurement.controlStates?.[scenario.elementId]?.caretColor,
    );
    if (!expectedCaret || expectedCaret !== actualCaret) {
      controlErrors.push(
        `${scenario.elementId}.caretColor differs (` +
        `${JSON.stringify(expectedCaret)} vs ${JSON.stringify(actualCaret)}).`,
      );
    }
  }
  if (step.clipboardText) {
    const expectedClipboard = referenceMeasurement.clipboardText;
    const actualClipboard = astylarMeasurement.clipboardText;
    if (!expectedClipboard || actualClipboard !== expectedClipboard) {
      controlErrors.push(
        `${scenario.elementId} clipboard text differs (` +
        `${JSON.stringify(expectedClipboard)} vs ${JSON.stringify(actualClipboard)}).`,
      );
    }
  }
  if (step.selectionContrast) {
    const highlights = astylarMeasurement.selectionHighlights ?? [];
    const foregrounds = astylarMeasurement.selectionForegrounds ?? [];
    if (!highlights.length || highlights.some((highlight) =>
        highlight.backgroundContrast < 3 || highlight.foregroundContrast < 4.5)) {
      controlErrors.push(`${scenario.elementId} selection does not preserve 3:1 surface and 4.5:1 selected-glyph contrast.`);
    }
    if (!foregrounds.length || foregrounds.length !== highlights.length ||
        foregrounds.some((foreground) => foreground.ownerElementId !== scenario.elementId ||
          foreground.contrast < 4.5)) {
      controlErrors.push(`${scenario.elementId} selection is missing its contrast foreground glyph overlay.`);
    }
    if (foregrounds.some((foreground) => !hasRasterColor(
      astylarImage,
      foreground.borderBox,
      foreground.color,
      astylarMeasurement.canvas,
    ))) {
      controlErrors.push(`${scenario.elementId} selected-glyph foreground color is absent from the rendered pixels.`);
    }
    for (const foreground of foregrounds) {
      const alignment = selectionGlyphAlignment(
        previousAstylarImage,
        astylarImage,
        foreground.borderBox,
        foreground.sourceColor,
        foreground.color,
        foreground.sourceBackgroundColor,
        foreground.backgroundColor,
        astylarMeasurement.canvas,
      );
      selectionGlyphAlignments.push({ ownerElementId: foreground.ownerElementId, alignment });
      if (alignment < acceptance.minimumSelectionGlyphAlignment) {
        controlErrors.push(
          `${scenario.elementId} selected-glyph recolor is not aligned with the original glyph raster ` +
          `(${alignment.toFixed(3)} < ${acceptance.minimumSelectionGlyphAlignment.toFixed(3)}).`,
        );
      }
    }
    const fontSize = Number.parseFloat(
      referenceMeasurement.computedStyles?.[scenario.elementId]?.fontSize ?? '0',
    );
    if (fontSize > 0 && highlights.some((highlight) => highlight.heightCss < fontSize * 0.5)) {
      controlErrors.push(`${scenario.elementId} selection highlight does not cover the glyph line box.`);
    }
  }
  const styleErrors = compareInteractionStyles(
    referenceMeasurement.computedStyles?.[scenario.elementId],
    astylarMeasurement.resolvedStyles?.[scenario.elementId],
    step.styleProperties ?? [],
  );
  const measuredRaster = ['state-only', 'structural-selection'].includes(step.visual)
    ? {
        skipped: true,
        meetsTarget: true,
        reason: step.visual === 'structural-selection'
          ? 'Selection is enforced through full-height geometry, paired background/foreground contrast, and clipboard semantics.'
          : 'Native platform select popup is not raster-comparable.',
      }
    : compareInteractionCrop(referenceImage, astylarImage, referenceElement?.borderBox, viewport, stepDir);
  const localRaster = step.visual === 'focus-indicator'
    ? {
        ...measuredRaster,
        meetsTarget: referenceMeasurement.computedStyles?.[scenario.elementId]?.outlineStyle !== 'none' &&
          (astylarMeasurement.visibleFocusIndicators?.length ?? 0) >= 4,
        acceptance: 'structural UA focus-ring equivalence',
      }
    : measuredRaster;
  const runtimeErrors = [
    ...(astylarMeasurement.diagnostics ?? []).filter(({ severity }) => severity === 'error')
      .map(({ code, message }) => `${code}: ${message}`),
  ];
  const meetsAcceptance = infrastructureErrors.length === 0 && stateErrors.length === 0 && geometryErrors.length === 0 &&
    controlErrors.length === 0 && styleErrors.length === 0 && runtimeErrors.length === 0 && localRaster.meetsTarget;
  return {
    reference: referenceMeasurement,
    astylar: astylarMeasurement,
    selectionGlyphAlignments,
    stateErrors, geometryErrors, controlErrors, styleErrors, runtimeErrors, localRaster, meetsAcceptance, infrastructureErrors,
  };
}

function compareInteractionGeometry(referenceBox, astylarBox) {
  if (!referenceBox || !astylarBox) return ['missing interaction geometry.'];
  const errors = [];
  for (const edge of ['left', 'top', 'right', 'bottom']) {
    const delta = Math.abs(referenceBox[edge] - astylarBox[edge]);
    if (delta > acceptance.maximumGeometryEdgeErrorPx) {
      errors.push(`${edge} edge differs by ${delta.toFixed(3)}px.`);
    }
  }
  return errors;
}

function compareInteractionState(referenceMeasurement, astylarMeasurement, scenario, step) {
  const errors = [];
  const expected = referenceMeasurement.interaction;
  const actual = astylarMeasurement.interaction ?? {};
  const lastAction = step.actions.at(-1)?.type;
  const properties = step.stateProperties ?? ['focusedElementId'];
  if (['hover', 'pointer-down', 'pointer-up'].includes(lastAction)) properties.push('hoveredElementId');
  if (lastAction === 'pointer-down') properties.push('pressedElementId');
  for (const property of properties) {
    const left = expected[property] || undefined;
    const right = actual[property] || undefined;
    if (left !== right) errors.push(`${property} differs (${left ?? 'none'} vs ${right ?? 'none'}).`);
  }
  // Native select popup cursor paint belongs to the host platform and is not
  // observable in headless Chromium. Pointer selection still verifies value,
  // events, focus, dismissal, geometry, local paint, and resource cleanup.
  if (step.compareCursor !== false &&
      step.actions.some(({ type }) => ['click', 'hover', 'pointer-down', 'pointer-up'].includes(type))) {
    const expectedCursor = referenceMeasurement.cursor === 'auto' ? 'default' : referenceMeasurement.cursor;
    const actualCursor = astylarMeasurement.canvas?.cursor === 'auto' ? 'default' : astylarMeasurement.canvas?.cursor;
    if (expectedCursor !== actualCursor) errors.push(`cursor differs (${expectedCursor} vs ${actualCursor}).`);
  }
  const popupStep = scenario.id.startsWith('voice-');
  if (popupStep) {
    const shouldBeExpanded = step.id.includes('open') || step.id === 'move-active-option';
    const expanded = astylarMeasurement.controlStates?.voice?.expanded;
    if (expanded !== shouldBeExpanded) errors.push(`voice expanded state was ${expanded}; expected ${shouldBeExpanded}.`);
  }
  return errors;
}

function compareInteractionControls(referenceControls = {}, astylarControls = {}, ids = []) {
  const errors = [];
  for (const id of ids) {
    const expected = referenceControls[id];
    if (!expected) continue;
    const actual = astylarControls[id];
    if (!actual) { errors.push(`missing Astylar control state for ${id}.`); continue; }
    for (const property of [
      'value', 'focused', 'selectionStart', 'selectionEnd', 'selectionDirection',
      'selectedIndex',
    ]) {
      if (expected[property] !== actual[property]) {
        errors.push(`${id}.${property} differs (${JSON.stringify(expected[property])} vs ${JSON.stringify(actual[property])}).`);
      }
    }
  }
  return errors;
}

function compareInteractionStyles(referenceStyle = {}, astylarStyle = {}, properties = []) {
  const errors = [];
  if (!properties.length) return errors;
  if (!Object.keys(astylarStyle).length) return ['missing resolved Astylar interaction style.'];
  for (const property of properties) {
    const expectedValues = property === 'borderColor'
      ? ['borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor']
          .map((key) => normalizeInteractionStyleValue('color', referenceStyle[key]))
      : [normalizeInteractionStyleValue(property, referenceStyle[property])];
    const actualProperty = property === 'backgroundColor' ? 'background' : property;
    const actual = normalizeInteractionStyleValue(property, astylarStyle[actualProperty]);
    const expected = expectedValues[0];
    if (expectedValues.some((value) => value !== expected)) {
      errors.push(`${property} reference edges are not uniform (${expectedValues.join(', ')}).`);
    } else if (expected !== actual) {
      errors.push(`${property} differs (${expected ?? 'unset'} vs ${actual ?? 'unset'}).`);
    }
  }
  return errors;
}

function normalizeInteractionStyleValue(property, value) {
  if (value === undefined || value === null || value === '') return undefined;
  const text = String(value).trim();
  if (property === 'backgroundColor' || property === 'color' || property === 'borderColor') {
    return normalizeCssColor(text);
  }
  if (property === 'boxShadow') return normalizeSimpleBoxShadow(text);
  if (property === 'transform') {
    if (text === 'none') return 'none';
    const translate = text.match(/^translateY\(\s*(-?[\d.]+)(?:px)?\s*\)$/i);
    if (translate) return `matrix(1,0,0,1,0,${Number(translate[1])})`;
    const matrix = text.match(/^matrix\(\s*([^)]*)\)$/i);
    if (matrix) return `matrix(${matrix[1].split(',').map((part) => Number(part.trim())).join(',')})`;
  }
  return text.replace(/\s+/g, ' ').toLowerCase();
}

function normalizeSimpleBoxShadow(value) {
  if (value.toLowerCase() === 'none') return 'none';
  const colorMatch = value.match(/rgba?\([^)]*\)|#[\da-f]{3,8}/i);
  const color = colorMatch ? normalizeCssColor(colorMatch[0]) : undefined;
  const lengths = value.replace(colorMatch?.[0] ?? '', '').match(/-?[\d.]+(?:px)?/g)?.map(Number.parseFloat) ?? [];
  return lengths.length >= 4 && color
    ? `${lengths.slice(0, 4).join(',')}|${color}`
    : value.replace(/\s+/g, ' ').toLowerCase();
}

function normalizeCssColor(value) {
  if (!value) return undefined;
  const hex = value.match(/^#([\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i)?.[1];
  if (hex) {
    const expanded = hex.length <= 4 ? [...hex].map((digit) => digit + digit).join('') : hex;
    const channels = [0, 2, 4].map((offset) => Number.parseInt(expanded.slice(offset, offset + 2), 16));
    const alpha = expanded.length === 8 ? Number((Number.parseInt(expanded.slice(6, 8), 16) / 255).toFixed(4)) : 1;
    return `rgba(${channels.join(',')},${alpha})`;
  }
  const rgb = value.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)$/i);
  if (rgb) return `rgba(${Number(rgb[1])},${Number(rgb[2])},${Number(rgb[3])},${rgb[4] === undefined ? 1 : Number(rgb[4])})`;
  return value.replace(/\s+/g, '').toLowerCase();
}

function parseSpreadShadow(value) {
  if (!value || value === 'none') return undefined;
  const colorMatch = value.match(/rgba?\([^)]*\)|#[\da-f]{3,8}/i);
  const lengths = value.replace(colorMatch?.[0] ?? '', '').match(/-?[\d.]+(?:px)?/g)?.map(Number.parseFloat) ?? [];
  if (!colorMatch || lengths.length < 4) return undefined;
  const normalized = normalizeCssColor(colorMatch[0]);
  const alpha = Number(normalized?.match(/,([\d.]+)\)$/)?.[1] ?? 1);
  const opaqueColor = normalized?.replace(/,[\d.]+\)$/, ',1)');
  return { spread: lengths[3], color: opaqueColor ?? colorMatch[0], alpha };
}

function compareInteractionCrop(referenceImage, astylarImage, borderBox, viewport, stepDir) {
  if (!borderBox || !sameDimensions(referenceImage, astylarImage)) {
    return { meetsTarget: false, reason: 'missing target crop' };
  }
  const scale = viewport.deviceScaleFactor;
  const padding = 10;
  const bounds = {
    left: Math.max(0, (borderBox.left - padding) * scale),
    top: Math.max(0, (borderBox.top - padding) * scale),
    right: Math.min(referenceImage.width, (borderBox.right + padding) * scale),
    bottom: Math.min(referenceImage.height, (borderBox.bottom + padding) * scale),
  };
  const expected = cropRgba(referenceImage, bounds);
  const actual = cropRgba(astylarImage, bounds);
  if (!expected.width || !sameDimensions(expected, actual)) return { meetsTarget: false, reason: 'invalid target crop' };
  const evaluation = evaluateInteractionRaster(expected, actual, acceptance);
  writeFileSync(path.join(stepDir, 'target-side-by-side.png'), PNG.sync.write(sideBySide(expected, actual)));
  return evaluation;
}

function addInteractionLifecycleEvidence(results, scenario) {
  if (!scenario.repeatCycles || !results.length) return;
  const cycleLength = scenario.steps.length;
  const baselines = results.filter((_, index) => index % cycleLength === cycleLength - 1)
    .map(({ astylar }) => ({
      resources: astylar.resources,
      pluginResources: astylar.pluginResources,
      session: astylar.settlement,
      semantics: astylar.semantics,
    }));
  const stable = baselines.slice(1).every((snapshot) => JSON.stringify(snapshot) === JSON.stringify(baselines[0]));
  const last = results.at(-1);
  last.lifecycle = { cycles: scenario.repeatCycles, stable, snapshots: baselines };
  if (!stable) {
    last.runtimeErrors.push('Repeated popup open/dismiss cycles did not return to a stable resource snapshot.');
    last.meetsAcceptance = false;
  }
}

function compareScenario(referenceCapture, astylarCapture, viewport, scenarioDir) {
  const infrastructureErrors = [...referenceCapture.errors.map((error) => `reference runtime: ${error}`),
    ...astylarCapture.errors.map((error) => `Astylar runtime: ${error}`)];
  if (referenceCapture.fontsReady !== 'loaded') infrastructureErrors.push('Reference fonts were not ready.');
  if (astylarCapture.fontsReady !== 'loaded') infrastructureErrors.push('Astylar fonts were not ready.');
  if (referenceCapture.image.width !== astylarCapture.image.width ||
      referenceCapture.image.height !== astylarCapture.image.height) {
    infrastructureErrors.push(`Capture dimensions differ: reference ${referenceCapture.image.width}x${referenceCapture.image.height}, ` +
      `Astylar ${astylarCapture.image.width}x${astylarCapture.image.height}.`);
  }
  const geometry = compareGeometry(referenceCapture.measurement.elements, astylarCapture.measurement.elements);
  const visibility = compareVisibility(referenceCapture.measurement.elements, astylarCapture.measurement.elements);
  const scrolling = compareScrolling(
    referenceCapture.measurement.scrolling,
    astylarCapture.measurement.scrolling,
    acceptance.maximumIncidentalScrollExtentPx,
  );
  const text = compareText(referenceCapture.measurement.elements, astylarCapture.measurement.elements);
  const screenshotSimilarity = sameDimensions(referenceCapture.image, astylarCapture.image)
    ? ssim(referenceCapture.image, astylarCapture.image).mssim : 0;
  const raster = compareRegions(referenceCapture, astylarCapture, viewport, scenarioDir, infrastructureErrors);
  writeCompositeArtifacts(referenceCapture.image, astylarCapture.image, scenarioDir);
  const meetsAcceptance = geometry.meetsTarget && visibility.matches && scrolling.matches && text.matches &&
    screenshotSimilarity >= acceptance.minimumSsim && raster.every((region) => region.skipped || region.meetsTarget);
  return {
    runtime: { referenceErrors: referenceCapture.errors, astylarErrors: astylarCapture.errors,
      fonts: { reference: referenceCapture.fontsReady, astylar: astylarCapture.fontsReady },
      captureBounds: { reference: referenceCapture.captureBounds, astylar: astylarCapture.captureBounds },
      settlement: astylarCapture.measurement.settlement },
    geometry, visibility, scrolling, text, raster, screenshotSimilarity, meetsAcceptance, infrastructureErrors,
  };
}

function compareGeometry(referenceElements, astylarElements) {
  const elements = [];
  const edges = [];
  for (const [id, expected] of Object.entries(referenceElements)) {
    const actual = astylarElements[id];
    if (!expected.exists && !actual?.exists) continue;
    if (!expected.exists || !actual?.exists || !expected.borderBox || !actual.borderBox) {
      elements.push({ id, missingOrUnexpected: true });
      continue;
    }
    const edgeErrors = Object.fromEntries(['left', 'top', 'right', 'bottom'].map((edge) => {
      const error = Math.abs(expected.borderBox[edge] - actual.borderBox[edge]); edges.push(error); return [edge, error];
    }));
    elements.push({ id, referenceBorderBox: expected.borderBox, astylarBorderBox: actual.borderBox, edgeErrors });
  }
  const within = edges.filter((value) => value <= acceptance.geometryTolerancePx).length / Math.max(1, edges.length);
  const maximum = edges.length ? Math.max(...edges) : Infinity;
  return { measuredEdges: edges.length, edgesWithinTolerance: within, maximumEdgeErrorPx: maximum, elements,
    meetsTarget: within >= acceptance.minimumEdgesWithinTolerance && maximum <= acceptance.maximumGeometryEdgeErrorPx };
}

function compareVisibility(referenceElements, astylarElements) {
  const elements = Object.entries(referenceElements).map(([id, expected]) => {
    const actual = astylarElements[id];
    const matches = expected.exists === !!actual?.exists && (!expected.exists ||
      expected.visibility?.intersectsViewport === actual?.visibility?.intersectsViewport &&
      expected.visibility?.fullyVisible === actual?.visibility?.fullyVisible &&
      expected.visibility?.clipped === actual?.visibility?.clipped);
    return { id, matches, reference: expected.visibility ?? { exists: false }, astylar: actual?.visibility ?? { exists: false } };
  });
  return { matches: elements.every((item) => item.matches), elements };
}

function compareText(expected, actual) {
  const selected = new Set(textMeasurementIds);
  const elements = Object.entries(expected).flatMap(([id, element]) => selected.has(id) && element.exists && element.text !== undefined
    ? [{ id, reference: element.text, astylar: actual[id]?.text, matches: element.text === actual[id]?.text }] : []);
  return { matches: elements.every((element) => element.matches), elements };
}

function compareRegions(referenceCapture, astylarCapture, viewport, scenarioDir, infrastructureErrors) {
  const scale = viewport.deviceScaleFactor;
  return sharpnessRegions.flatMap((region) => {
    const element = referenceCapture.measurement.elements[region.elementId];
    if (!element?.exists || !element.borderBox) return [];
    let bounds = { ...element.borderBox };
    if (region.edge === 'right') bounds = { left: bounds.right - region.thickness, top: bounds.top,
      right: bounds.right + region.thickness, bottom: bounds.bottom };
    else bounds = { left: bounds.left - region.padding, top: bounds.top - region.padding,
      right: bounds.right + region.padding, bottom: bounds.bottom + region.padding };
    const physical = Object.fromEntries(Object.entries(bounds).map(([key, value]) => [key, value * scale]));
    if (physical.left < 0 || physical.top < 0 ||
        physical.right > referenceCapture.image.width || physical.bottom > referenceCapture.image.height) {
      return [{ ...region, skipped: true,
        reason: 'The authoritative region is not fully inside this capture profile.' }];
    }
    const expected = cropRgba(referenceCapture.image, physical);
    const actual = cropRgba(astylarCapture.image, physical);
    if (!expected.width || !expected.height || !sameDimensions(expected, actual)) {
      return [{ ...region, bounds: expected.bounds, skipped: true,
        reason: 'The authoritative region does not intersect this capture profile.' }];
    }
    const result = evaluateSharpness(compareSharpness(expected, actual), acceptance);
    const sheet = sideBySide(expected, actual);
    writeFileSync(path.join(scenarioDir, `crop-${region.id}.png`), PNG.sync.write(sheet));
    return [{ ...region, bounds: expected.bounds, ...result }];
  });
}

function writeCompositeArtifacts(expected, actual, scenarioDir) {
  if (!sameDimensions(expected, actual)) return;
  writeFileSync(path.join(scenarioDir, 'side-by-side.png'), PNG.sync.write(sideBySide(expected, actual)));
  const overlay = new PNG({ width: expected.width, height: expected.height });
  const difference = new PNG({ width: expected.width, height: expected.height });
  for (let index = 0; index < expected.data.length; index += 4) {
    for (let channel = 0; channel < 3; channel += 1) {
      overlay.data[index + channel] = Math.round((expected.data[index + channel] + actual.data[index + channel]) / 2);
      difference.data[index + channel] = Math.min(255, Math.abs(expected.data[index + channel] - actual.data[index + channel]) * 4);
    }
    overlay.data[index + 3] = difference.data[index + 3] = 255;
  }
  writeFileSync(path.join(scenarioDir, 'overlay.png'), PNG.sync.write(overlay));
  writeFileSync(path.join(scenarioDir, 'difference.png'), PNG.sync.write(difference));
}

function sideBySide(left, right) {
  const output = new PNG({ width: left.width + right.width, height: Math.max(left.height, right.height) });
  output.data.fill(255);
  blit(left, output, 0);
  blit(right, output, left.width);
  return output;
}

function blit(source, target, targetX) {
  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      const sourceOffset = (y * source.width + x) * 4;
      const targetOffset = (y * target.width + targetX + x) * 4;
      target.data[targetOffset] = source.data[sourceOffset];
      target.data[targetOffset + 1] = source.data[sourceOffset + 1];
      target.data[targetOffset + 2] = source.data[sourceOffset + 2];
      target.data[targetOffset + 3] = source.data[sourceOffset + 3];
    }
  }
}

function summarize(results, interactions = []) {
  const staticAcceptance = results.every((result) => result.meetsAcceptance);
  const interactionAcceptance = interactions.every((result) => result.meetsAcceptance);
  return {
    scenarios: results.length,
    infrastructureComplete: results.every((result) => result.infrastructureErrors.length === 0),
    acceptedScenarios: results.filter((result) => result.meetsAcceptance).length,
    minimumSsim: results.length ? Math.min(...results.map((result) => result.screenshotSimilarity)) : 1,
    maximumGeometryEdgeErrorPx: results.length
      ? Math.max(...results.map((result) => result.geometry.maximumEdgeErrorPx)) : 0,
    visibilityMatches: results.filter((result) => result.visibility.matches).length,
    scrollOwnershipMatches: results.filter((result) => result.scrolling.ownershipMatches).length,
    scrollReachabilityMatches: results.filter((result) => result.scrolling.reachabilityMatches).length,
    textMatches: results.filter((result) => result.text.matches).length,
    sharpnessRegionsPassing: results.reduce((total, result) =>
      total + result.raster.filter((region) => !region.skipped && region.meetsTarget).length, 0),
    sharpnessRegionsMeasured: results.reduce((total, result) =>
      total + result.raster.filter((region) => !region.skipped).length, 0),
    interactionSteps: interactions.length,
    acceptedInteractionSteps: interactions.filter((result) => result.meetsAcceptance).length,
    minimumInteractionLocalSsim: interactions.some(({ localRaster }) => localRaster.similarity !== undefined)
      ? Math.min(...interactions.flatMap(({ localRaster }) =>
          localRaster.similarity === undefined ? [] : [localRaster.similarity])) : 1,
    staticAcceptance,
    interactionAcceptance,
    meetsAcceptance: staticAcceptance && interactionAcceptance,
  };
}

function humanSummary(report) {
  const s = report.summary;
  return `# TTS parity ${report.mode} summary\n\n` +
    `Reference: ${report.reference.repository} @ \`${report.reference.commit}\`\n\n` +
    `- Evidence scenarios: ${s.scenarios}\n- Infrastructure complete: ${s.infrastructureComplete}\n` +
    `- Scenarios meeting Phase 19 targets: ${s.acceptedScenarios}/${s.scenarios}\n` +
    `- Minimum SSIM: ${s.minimumSsim.toFixed(6)}\n- Maximum geometry edge error: ${s.maximumGeometryEdgeErrorPx.toFixed(3)}px\n` +
    `- Visibility matches: ${s.visibilityMatches}/${s.scenarios}\n- Scroll-owner matches: ${s.scrollOwnershipMatches}/${s.scenarios}\n` +
    `- Scroll-reachability matches: ${s.scrollReachabilityMatches}/${s.scenarios}\n` +
    `- Visible-text matches: ${s.textMatches}/${s.scenarios}\n` +
    `- Sharpness regions passing: ${s.sharpnessRegionsPassing}/${s.sharpnessRegionsMeasured}\n` +
    `- Interaction steps meeting Phase 21 targets: ${s.acceptedInteractionSteps}/${s.interactionSteps}\n` +
    `- Minimum interaction-local SSIM: ${s.minimumInteractionLocalSsim.toFixed(6)}\n` +
    `- Acceptance: ${s.meetsAcceptance ? 'PASS' : 'UNMET'}\n`;
}

function sameDimensions(left, right) { return left.width === right.width && left.height === right.height; }
function hash(buffer) { return createHash('sha256').update(buffer).digest('hex'); }
async function settle(page) { await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))); }
async function waitFor(check, description, timeoutMs) {
  const deadline = Date.now() + timeoutMs; let last;
  while (Date.now() < deadline) { try { if (await check()) return; } catch (error) { last = error; }
    await new Promise((resolve) => setTimeout(resolve, 100)); }
  throw new Error(`Timed out waiting for ${description}: ${String(last ?? '')}`);
}
async function stopServer() {
  if (!server) return;
  await new Promise((resolve) => server.close(resolve));
}
