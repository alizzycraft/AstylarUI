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
import { acceptance, measurementIds, reference, sharpnessRegions, states, viewports } from './benchmark.config.mjs';
import { cropRgba, compareSharpness, evaluateSharpness } from '../parity/sharpness-metrics.mjs';

const root = process.cwd();
const demo = path.join(root, 'examples', 'ai-tts-demo');
const artifacts = path.join(root, 'artifacts', 'tts-parity');
const referenceRoot = path.join(root, 'tests', 'tts-parity', 'reference');
const port = Number(process.env['ASTYLAR_TTS_PARITY_PORT'] ?? 4421);
const baseUrl = `http://127.0.0.1:${port}`;
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const enforce = process.argv.includes('--enforce');
const skipBuild = process.argv.includes('--skip-build');
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

  for (const state of states) for (const viewport of viewports) {
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

  const infrastructureErrors = results.flatMap((result) => result.infrastructureErrors.map((error) =>
    `${result.state}@${result.viewport.id}: ${error}`));
  const summary = summarize(results);
  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    mode: enforce ? 'enforced' : 'report-only',
    reference,
    browser: { name: 'Chromium', version: browserVersion },
    acceptance,
    states,
    viewports,
    summary,
    infrastructureErrors,
    scenarios: results,
  };
  writeFileSync(path.join(artifacts, 'latest-report.json'), `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(path.join(artifacts, 'latest-summary.md'), humanSummary(report));
  console.log(humanSummary(report));
  assert.deepEqual(infrastructureErrors, [], 'TTS parity evidence was incomplete or malformed.');
  if (enforce) assert.equal(summary.meetsAcceptance, true,
    'TTS parity remains below the calibrated Phase 18 acceptance configuration.');
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
  await page.evaluate((value) => document.body.dataset['state'] = value, state);
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
        if (!element || getComputedStyle(element).display === 'none') return [id, { exists: false }];
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
          ? element.value : element.textContent?.replace(/\s+/g, ' ').trim(),
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
  const scrolling = compareScrolling(referenceCapture.measurement.scrolling, astylarCapture.measurement.scrolling);
  const text = compareText(referenceCapture.measurement.elements, astylarCapture.measurement.elements);
  const screenshotSimilarity = sameDimensions(referenceCapture.image, astylarCapture.image)
    ? ssim(referenceCapture.image, astylarCapture.image).mssim : 0;
  const raster = compareRegions(referenceCapture, astylarCapture, viewport, scenarioDir, infrastructureErrors);
  writeCompositeArtifacts(referenceCapture.image, astylarCapture.image, scenarioDir);
  const meetsAcceptance = geometry.meetsTarget && visibility.matches && scrolling.ownershipMatches &&
    screenshotSimilarity >= acceptance.minimumSsim && raster.every((region) => region.meetsTarget);
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
    elements.push({ id, edgeErrors });
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

function compareScrolling(expected, actual) {
  const relevant = new Set([...Object.entries(expected).filter(([, value]) => value.maxScrollLeft > 0 || value.maxScrollTop > 0).map(([id]) => id),
    ...Object.entries(actual).filter(([, value]) => value.maxScrollLeft > 0 || value.maxScrollTop > 0).map(([id]) => id)]);
  const owners = [...relevant].map((id) => ({ id, reference: expected[id], astylar: actual[id],
    matches: !!expected[id] === !!actual[id] }));
  return { ownershipMatches: owners.every((owner) => owner.matches), owners };
}

function compareText(expected, actual) {
  const elements = Object.entries(expected).flatMap(([id, element]) => element.exists && element.text !== undefined
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
    const expected = cropRgba(referenceCapture.image, physical);
    const actual = cropRgba(astylarCapture.image, physical);
    if (!expected.width || !expected.height || !sameDimensions(expected, actual)) {
      return [{ ...region, bounds: expected.bounds, skipped: true,
        reason: 'The authoritative region does not intersect this capture profile.', meetsTarget: false }];
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

function summarize(results) {
  return {
    scenarios: results.length,
    infrastructureComplete: results.every((result) => result.infrastructureErrors.length === 0),
    acceptedScenarios: results.filter((result) => result.meetsAcceptance).length,
    minimumSsim: Math.min(...results.map((result) => result.screenshotSimilarity)),
    maximumGeometryEdgeErrorPx: Math.max(...results.map((result) => result.geometry.maximumEdgeErrorPx)),
    visibilityMatches: results.filter((result) => result.visibility.matches).length,
    scrollOwnershipMatches: results.filter((result) => result.scrolling.ownershipMatches).length,
    sharpnessRegionsPassing: results.reduce((total, result) => total + result.raster.filter((region) => region.meetsTarget).length, 0),
    sharpnessRegionsMeasured: results.reduce((total, result) => total + result.raster.length, 0),
    meetsAcceptance: results.every((result) => result.meetsAcceptance),
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
    `- Sharpness regions passing: ${s.sharpnessRegionsPassing}/${s.sharpnessRegionsMeasured}\n` +
    `- Acceptance: ${s.meetsAcceptance ? 'PASS' : 'UNMET (diagnostic in Phase 18)'}\n`;
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
