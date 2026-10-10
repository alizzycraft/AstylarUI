import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { fingerprintDirectory, fingerprintModuleGraph, materialBrowserLaunchOptions, inspectMaterialBrowserLaunch, openMaterialCheckpoint } from '../tests/material-parity/run-checkpoint.mjs';
import { openSupplementalCapture } from '../tests/material-parity/supplemental-capture-evidence.mjs';

// Actual Angular same-document remount; hold only the first Babylon image load.
const script = 'scripts/audit-material-icon-pending-remount.mjs';
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
    window.__remountImage = { token: crypto.randomUUID(), held: [], completions: [], intercepted: 0, source: null, stack: null };
    Object.defineProperty(HTMLImageElement.prototype, 'src', { ...descriptor, set(source) {
      const state = window.__remountImage, stack = new Error('image src assignment').stack;
      if (!state.intercepted && String(source).startsWith('data:image/png') && stack.includes('_AbstractEngine.LoadImage')) {
        state.intercepted++; state.source = source; state.stack = stack;
        const image = this;
        state.held.push(() => {
          image.addEventListener('load', () => state.completions.push({ width: image.naturalWidth, height: image.naturalHeight }), { once: true });
          descriptor.set.call(image, source);
        });
        return;
      }
      descriptor.set.call(this, source);
    } });
  });
  await page.goto(`${baseUrl}/astylar/icon?profile=light`);
  await page.waitForFunction(() => window.__remountImage.intercepted === 1 && !!window.ng?.getComponent(document.querySelector('astylar-surface'))?.surface());
  const initial = await page.evaluate(() => {
    window.__retiredImageSurface = window.ng.getComponent(document.querySelector('astylar-surface')).surface();
    return { token: window.__remountImage.token, theme: window.ng.getComponent(document.querySelector('app-astylar-showcase')).store.theme().mode,
      session: window.__retiredImageSurface.diagnostics.session };
  });
  const navigate = async url => page.evaluate(url => { history.pushState({}, '', url); dispatchEvent(new PopStateEvent('popstate')); }, url);
  await navigate('/reference/icon?profile=light');
  await page.waitForFunction(() => !!document.querySelector('app-reference') && !document.querySelector('app-astylar-showcase') && window.__retiredImageSurface.disposed);
  await navigate('/astylar/icon?profile=light');
  await page.waitForFunction(() => !!window.__ASTYLAR_MATERIAL_BENCHMARK__);
  await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled());
  const snapshot = () => {
    const live = window.ng.getComponent(document.querySelector('astylar-surface')).surface(), old = window.__retiredImageSurface;
    const sample = s => ({ disposed: s.disposed, session: s.diagnostics.session, tracked: s.diagnostics.resources,
      live: { meshes: s.scene.meshes.length, materials: s.scene.materials.length, textures: s.scene.textures.length },
      textureIds: s.scene.textures.map(t => t.uniqueId) });
    return { token: window.__remountImage.token, distinctSurface: live !== old, distinctScene: live.scene !== old.scene,
      source: document.querySelector('[data-astylar-id="icon-primary"]').getAttribute('src'), retired: sample(old), current: sample(live) };
  };
  const beforeRelease = await page.evaluate(snapshot);
  await page.evaluate(() => { for (const release of window.__remountImage.held.splice(0)) release(); });
  await page.waitForFunction(() => window.__remountImage.completions.length === 1);
  await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled());
  const afterRelease = await page.evaluate(snapshot), observation = await page.evaluate(() => window.__remountImage);
  let runtime;
  try { runtime = await finish(); }
  catch (error) {
    writeFileSync(`${evidence.directory}/failure-observations.json`, JSON.stringify({ capture: evidence.capture, initial, beforeRelease, afterRelease, observation,
      runtimeValidation: { status: 'failed', message: error.message, errors: error.actual },
      scope: 'Controlled same-document pending-image remount; original runtime validator rejects disposal diagnostic. Not accepted capture or complete ownership/race acceptance.' }, null, 2), { flag: 'wx' });
    console.log(JSON.stringify({ initial, beforeRelease, afterRelease, intercepted: observation.intercepted, completions: observation.completions }));
    throw error;
  }
  writeFileSync(`${evidence.directory}/latest-report.json`, JSON.stringify({ capture: evidence.capture, initial, beforeRelease, afterRelease, observation, runtime,
    scope: 'Light desktop DPR1 same-document Angular pending-image destruction/remount; release after replacement settles. Not simultaneous peer isolation,other cohorts,local paint or complete-case closure.' }, null, 2), { flag: 'wx' });
  assert.equal(initial.theme, 'light'); assert.equal(initial.session.status, 'rendering');
  assert.equal(afterRelease.token, initial.token); assert(afterRelease.distinctSurface && afterRelease.distinctScene);
  assert.deepEqual(afterRelease.retired.live, { meshes: 0, materials: 0, textures: 0 });
  assert.equal(afterRelease.retired.disposed, true); assert.equal(afterRelease.current.disposed, false);
  assert.deepEqual(afterRelease.current, beforeRelease.current);
  assert.deepEqual(observation.completions, [{ width: 24, height: 24 }]);
  assert.deepEqual(fingerprintDirectory(root), browserFiles);
  console.log(JSON.stringify({ initial, beforeRelease, afterRelease, intercepted: observation.intercepted, completions: observation.completions }));
} finally { await browser.close(); await new Promise(r => server.close(r)); }
