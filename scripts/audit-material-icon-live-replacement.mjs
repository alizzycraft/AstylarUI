import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { fingerprintDirectory, fingerprintModuleGraph, materialBrowserLaunchOptions, inspectMaterialBrowserLaunch, openMaterialCheckpoint } from '../tests/material-parity/run-checkpoint.mjs';
import { openSupplementalCapture } from '../tests/material-parity/supplemental-capture-evidence.mjs';

// Native image scheduling diagnostic. Real theme command, no renderer mutation.
const script = 'scripts/audit-material-icon-live-replacement.mjs';
const output = path.resolve(process.argv[2] ?? '');
assert(output.startsWith(path.resolve('artifacts/material-parity') + path.sep));
assert(!existsSync(output) && !existsSync(output + '-checkpoint'));
const root = path.resolve('examples/material-showcase/dist/material-showcase/browser');
const baseline = JSON.parse(readFileSync('artifacts/material-parity/tooltip-depth-checkpoint-c479097f/checkpoint/manifest.json'));
const browserFiles = fingerprintDirectory(root);
assert.deepEqual(browserFiles, baseline.provenance.browserFiles);
const server = createServer((req, res) => {
  const file = path.resolve(root, new URL(req.url, 'http://localhost').pathname.replace(/^\/+/, ''));
  const target = file.startsWith(root + path.sep) && path.extname(file) && existsSync(file) ? file : path.join(root, 'index.csr.html');
  const type = { '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2' }[path.extname(target)] ?? 'text/html';
  res.writeHead(200, { 'content-type': type, 'cache-control': 'no-store' }); res.end(readFileSync(target));
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const baseUrl = `http://127.0.0.1:${server.address().port}`, launch = materialBrowserLaunchOptions();
const browser = await chromium.launch(launch);
try {
  const provenance = { browser: browser.version(), platform: process.platform, architecture: process.arch, node: process.version,
    browserLaunch: await inspectMaterialBrowserLaunch(browser, launch), browserFiles, harness: fingerprintModuleGraph(process.cwd(), script) };
  openMaterialCheckpoint({ directory: output + '-checkpoint', provenance });
  const evidence = openSupplementalCapture({ options: { baseUrl, checkpoint: output + '-checkpoint/checkpoint', output }, browser, script, styleProperties: [] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const finish = evidence.observe(page);
  await page.addInitScript(() => {
    Error.stackTraceLimit = 100;
    const descriptor = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
    window.__imageHold = { source: null, held: [], completions: [], assignments: [] };
    Object.defineProperty(HTMLImageElement.prototype, 'src', { ...descriptor, set(source) {
      const state = window.__imageHold, stack = new Error('image src assignment').stack;
      if (String(source).startsWith('data:image/png')) {
        state.source ??= source;
        state.assignments.push({ source, stack, id: this.getAttribute('data-astylar-id') });
        if (source === state.source && stack.includes('_AbstractEngine.LoadImage')) {
          const image = this;
          state.held.push(() => {
            image.addEventListener('load', () => state.completions.push({ width: image.naturalWidth, height: image.naturalHeight }), { once: true });
            descriptor.set.call(image, source);
          });
          return;
        }
      }
      descriptor.set.call(this, source);
    } });
  });
  await page.goto(`${baseUrl}/astylar/icon?profile=light`);
  try {
    await page.waitForFunction(() => window.__imageHold.held.length === 1 && !!window.ng?.getComponent(document.querySelector('astylar-surface'))?.surface());
  } catch (error) {
    const observation = await page.evaluate(() => ({ hold: window.__imageHold, benchmark: !!window.__ASTYLAR_MATERIAL_BENCHMARK__, html: document.body.innerHTML.slice(0, 3000) }));
    writeFileSync(`${evidence.directory}/failure-observations.json`, JSON.stringify({ capture: evidence.capture, error: error.message, observation }, null, 2), { flag: 'wx' });
    console.log(JSON.stringify(observation));
    throw error;
  }
  const before = await page.evaluate(() => {
    window.__liveSurface = window.ng.getComponent(document.querySelector('astylar-surface')).surface();
    window.__oldTextures = [...window.__liveSurface.scene.textures];
    return { source: window.__imageHold.source, held: window.__imageHold.held.length, session: window.__liveSurface.diagnostics.session };
  });
  await page.evaluate(() => window.postMessage({ type: 'showcase:theme', theme: {
    mode: 'dark', primary: '#d0bcff', tertiary: '#efb8c8', surface: '#1c1b1f', error: '#f2b8b5', density: 0, cornerScale: 1, typographyScale: 1,
  } }, window.location.origin));
  await page.waitForFunction(() => window.ng.getComponent(document.querySelector('app-astylar-showcase')).store.theme().mode === 'dark'
    && window.__liveSurface.diagnostics.session.pendingReasons.includes('update'));
  const sample = () => {
    const s = window.ng.getComponent(document.querySelector('astylar-surface')).surface();
    return { sameSurface: s === window.__liveSurface, disposed: s.disposed,
      source: document.querySelector('[data-astylar-id="icon-primary"]').getAttribute('src'),
      textures: s.scene.textures.map(t => ({ name: t.name, ready: t.isReady(), old: window.__oldTextures.includes(t) })),
      session: s.diagnostics.session, resources: s.diagnostics.resources };
  };
  const queued = await page.evaluate(sample);
  assert.equal(queued.source, before.source, 'Pending native texture blocks presentation replacement');
  assert.equal(queued.session.status, 'rendering');
  await page.evaluate(() => { for (const release of window.__imageHold.held.splice(0)) release(); });
  await page.waitForFunction(() => window.__imageHold.completions.length === 1);
  await page.evaluate(() => window.__liveSurface.whenSettled());
  await page.waitForFunction(() => document.querySelector('[data-astylar-id="icon-primary"]')?.getAttribute('src') !== window.__imageHold.source);
  const after = await page.evaluate(sample), runtime = await finish();
  const observations = await page.evaluate(() => ({ completions: window.__imageHold.completions, assignments: window.__imageHold.assignments }));
  const report = { capture: evidence.capture, before, queued, after, observations, runtime,
    scope: 'Light desktop DPR1 actual theme update queues behind pending native texture; release permits live replacement. Does not exercise completion after retirement, equal-input SVG parity, other cohorts or whole-case closure.' };
  writeFileSync(`${evidence.directory}/latest-report.json`, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  assert(queued.sameSurface && after.sameSurface && !after.disposed);
  assert.notEqual(after.source, before.source);
  assert(!after.textures.some(t => t.name === before.source));
  assert.deepEqual(fingerprintDirectory(root), browserFiles);
  console.log(JSON.stringify({ before, queued, after, completions: observations.completions }));
} finally { await browser.close(); await new Promise(r => server.close(r)); }
