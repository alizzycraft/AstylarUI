import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { fingerprintDirectory, fingerprintModuleGraph, materialBrowserLaunchOptions, inspectMaterialBrowserLaunch, openMaterialCheckpoint } from '../tests/material-parity/run-checkpoint.mjs';
import { openSupplementalCapture } from '../tests/material-parity/supplemental-capture-evidence.mjs';

// Controlled scheduling diagnostic, not equal-input rendering acceptance.
const script = 'scripts/audit-material-snackbar-teardown.mjs';
const output = path.resolve(process.argv[2] ?? '');
assert.ok(output.startsWith(path.resolve('artifacts/material-parity') + path.sep));
assert.ok(!existsSync(output) && !existsSync(output + '-checkpoint'));
const root = path.resolve('examples/material-showcase/dist/material-showcase/browser');
const baseline = JSON.parse(readFileSync('artifacts/material-parity/tooltip-depth-checkpoint-c479097f/checkpoint/manifest.json'));
const browserFiles = fingerprintDirectory(root);
assert.deepEqual(browserFiles, baseline.provenance.browserFiles);
const server = createServer((req, res) => {
  const name = new URL(req.url, 'http://localhost').pathname.replace(/^\/+/, '');
  const file = path.resolve(root, name);
  const target = file.startsWith(root + path.sep) && path.extname(file) && existsSync(file) ? file : path.join(root, 'index.csr.html');
  const type = { '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' }[path.extname(target)] ?? 'text/html';
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
  const results = [];
  for (const held of [false, true]) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const finish = evidence.observe(page);
    try {
      await page.addInitScript(held => {
        window.__teardown = { token: crypto.randomUUID(), held: [], rejections: [], intercepted: 0, zeroStacks: [] };
        addEventListener('unhandledrejection', e => window.__teardown.rejections.push(String(e.reason)));
        if (held) {
          Error.stackTraceLimit = 100;
          const original = window.setTimeout;
          window.setTimeout = function(fn, delay, ...args) {
            const stack = delay === 0 ? new Error().stack : '';
            if (delay === 0 && window.__teardown.zeroStacks.length < 20) window.__teardown.zeroStacks.push(stack);
            if (delay === 0 && stack.includes('startSnackbarDismissTimerAfterSettled')) {
              window.__teardown.held.push(() => fn(...args)); window.__teardown.intercepted++;
              return original(() => {}, 0);
            }
            return original(fn, delay, ...args);
          };
        }
      }, held);
      await page.goto(`${baseUrl}/astylar/snack-bar?profile=light`);
      await page.waitForFunction(() => !!window.__ASTYLAR_MATERIAL_BENCHMARK__);
      await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled());
      const token = await page.evaluate(() => window.__teardown.token);
      const point = await page.evaluate(() => {
        const b = window.__ASTYLAR_MATERIAL_BENCHMARK__.measure(['snack-bar-primary'], false).elements['snack-bar-primary'].borderBox;
        const c = document.querySelector('canvas').getBoundingClientRect(); return { x: c.x + (b.left+b.right)/2, y: c.y+(b.top+b.bottom)/2 };
      });
      await page.mouse.click(point.x, point.y);
      const activation = await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.events());
      if (!held) await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled());
      await page.evaluate(() => { history.pushState({}, '', '/reference/button?profile=light'); dispatchEvent(new PopStateEvent('popstate')); });
      await page.waitForFunction(() => !!document.querySelector('app-reference') && !document.querySelector('app-astylar-showcase'));
      assert.equal(await page.evaluate(() => window.__teardown.token), token, 'Must retain same document');
      const intercepted = await page.evaluate(() => window.__teardown.intercepted);
      if (held && intercepted !== 1) console.log(JSON.stringify({ activation, zeroStacks: await page.evaluate(() => window.__teardown.zeroStacks) }));
      if (held) assert.equal(intercepted, 1, 'Must exercise pending startup rather than ordinary expiry');
      await page.evaluate(() => { for (const fn of window.__teardown.held.splice(0)) fn(); });
      await page.waitForTimeout(100);
      const row = { held, intercepted, activation, sameDocument: true, componentDestroyed: true,
        documentTokenBefore: token, documentTokenAfter: await page.evaluate(() => window.__teardown.token),
        finalPath: await page.evaluate(() => location.pathname),
        rejections: await page.evaluate(() => window.__teardown.rejections) };
      try { row.runtime = await finish(); }
      catch (error) {
        row.runtimeValidation = { status: 'failed', message: error.message, errors: error.actual };
        results.push(row);
        writeFileSync(`${evidence.directory}/failure-observations.json`, JSON.stringify({ capture: evidence.capture, results,
          status: 'failed-runtime-validation',
          scope: 'Controlled startup scheduling and same-document teardown; preserves validator failure, not accepted supplemental capture or natural race frequency.' }, null, 2), { flag: 'wx' });
        throw error;
      }
      results.push(row);
    } finally { await page.close(); }
  }
  assert.deepEqual(fingerprintDirectory(root), browserFiles);
  writeFileSync(`${evidence.directory}/latest-report.json`, JSON.stringify({ capture: evidence.capture, results,
    scope: 'Browser same-document teardown; startup-only scheduler hold plus ordinary control. Not natural race frequency, paired parity, resource plateau or whole-case closure.' }, null, 2), { flag: 'wx' });
  console.log(JSON.stringify(results));
} finally { await browser.close(); await new Promise(r => server.close(r)); }
