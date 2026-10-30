import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { fingerprintDirectory, materialBrowserLaunchOptions } from '../tests/material-parity/run-checkpoint.mjs';
import { openSupplementalCapture, parseSupplementalCaptureArguments } from '../tests/material-parity/supplemental-capture-evidence.mjs';
import { propertyGroups } from '../tests/material-parity/input-equivalence-policy.mjs';

const root = path.resolve('examples/material-showcase/dist/material-showcase/browser');
const checkpoint = process.argv.slice(2).find(a => a.startsWith('--checkpoint='));
assert.ok(checkpoint);
const manifest = JSON.parse(readFileSync(path.join(checkpoint.slice(13), 'manifest.json')));
assert.deepEqual(fingerprintDirectory(root), manifest.provenance.browserFiles);
const server = createServer((req, res) => {
  const name = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
  const candidate = path.resolve(root, name.replace(/^\/+/, ''));
  const file = candidate.startsWith(root + path.sep) && path.extname(candidate) && existsSync(candidate) ? candidate : path.join(root, 'index.csr.html');
  const ext = path.extname(file);
  res.writeHead(200, { 'content-type': ext === '.js' ? 'text/javascript' : ext === '.css' ? 'text/css' : ext === '.woff2' ? 'font/woff2' : 'text/html', 'cache-control': 'no-store' });
  res.end(readFileSync(file));
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  const options = parseSupplementalCaptureArguments([...process.argv.slice(2), `--base-url=http://127.0.0.1:${server.address().port}`]);
  browser = await chromium.launch(materialBrowserLaunchOptions());
  const evidence = openSupplementalCapture({ options, browser, script: 'scripts/audit-material-snackbar-open-focus.mjs', styleProperties: Object.values(propertyGroups).flat() });
  const results = {};
  for (const mode of ['reference', 'astylar']) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
    const finish = evidence.observe(page);
    try {
      await page.addInitScript(() => {
        window.__focusTrace = [];
        for (const type of ['pointerdown', 'pointerup', 'click', 'focusin', 'focusout']) document.addEventListener(type, e => {
          const t = e.target, a = document.activeElement;
          window.__focusTrace.push({ type, time: performance.now(), trusted: e.isTrusted,
            target: { tag: t?.tagName ?? null, id: t?.id ?? null, astylarId: t?.getAttribute?.('data-astylar-id') ?? null },
            active: { tag: a?.tagName ?? null, id: a?.id ?? null, astylarId: a?.getAttribute?.('data-astylar-id') ?? null } });
        }, true);
      });
      await page.goto(`${options.baseUrl}/${mode}/snack-bar?profile=light`);
      await page.locator('.frame').waitFor();
      if (mode === 'astylar') await page.waitForFunction(() => !!window.__ASTYLAR_MATERIAL_BENCHMARK__);
      const settle = async () => { if (mode === 'astylar') await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled()); await page.evaluate(async () => { await document.fonts.ready; await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); }); };
      await settle();
      const snapshot = () => page.evaluate(() => { const a = document.activeElement; return { time: performance.now(), tag: a?.tagName ?? null, id: a?.id ?? null, astylarId: a?.getAttribute?.('data-astylar-id') ?? null }; });
      const before = await snapshot();
      if (mode === 'reference') await page.locator('#snack-bar-primary').click();
      else { const p = await page.evaluate(() => { const m = window.__ASTYLAR_MATERIAL_BENCHMARK__.measure(['snack-bar-primary'], false).elements['snack-bar-primary'].borderBox; const c = document.querySelector('canvas').getBoundingClientRect(); return { x: c.x + (m.left + m.right) / 2, y: c.y + (m.top + m.bottom) / 2 }; }); await page.mouse.click(p.x, p.y); }
      const immediate = await snapshot(); await settle(); const settled = await snapshot();
      const trace = await page.evaluate(() => window.__focusTrace);
      const benchmarkEvents = mode === 'astylar' ? await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.events()) : null;
      const runtime = await finish();
      results[mode] = { before, immediate, settled, trace, benchmarkEvents, runtime };
    } finally { await page.close(); }
  }
  writeFileSync(`${evidence.directory}/latest-report.json`, JSON.stringify({ schemaVersion: 1, browser: browser.version(), capture: evidence.capture, results, scope: 'Supplementary raw DOM focus and event observations on the checkpointed served build; not logical-focus equivalence, original execution, current rendering, or case acceptance.' }, null, 2) + '\n', { flag: 'wx' });
} finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
