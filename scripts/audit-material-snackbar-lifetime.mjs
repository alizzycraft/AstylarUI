import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { captureBrowserInputTree } from '../tests/material-parity/input-tree-evidence.mjs';
import { propertyGroups } from '../tests/material-parity/input-equivalence-policy.mjs';
import { fingerprintDirectory, materialBrowserLaunchOptions } from '../tests/material-parity/run-checkpoint.mjs';
import { openSupplementalCapture, parseSupplementalCaptureArguments } from '../tests/material-parity/supplemental-capture-evidence.mjs';

// Replace only the missing lifetime provenance. Original unbound logs stay intact.
const args = process.argv.slice(2), root = path.resolve('examples/material-showcase/dist/material-showcase/browser');
assert.equal(args.length, 2);
const checkpoint = args.find(a => a.startsWith('--checkpoint=')); assert.ok(checkpoint);
const manifest = JSON.parse(readFileSync(path.join(checkpoint.slice(13), 'manifest.json')));
assert.deepEqual(fingerprintDirectory(root), manifest.provenance.browserFiles);
const hash = b => createHash('sha256').update(b).digest('hex');
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
  const options = parseSupplementalCaptureArguments([...args, `--base-url=http://127.0.0.1:${server.address().port}`]);
  browser = await chromium.launch(materialBrowserLaunchOptions());
  const properties = Object.values(propertyGroups).flat();
  const evidence = openSupplementalCapture({ options, browser, script: 'scripts/audit-material-snackbar-lifetime.mjs', styleProperties: properties });
  const results = [];
  for (const context of [{ profile: 'light', viewport: { width: 1440, height: 900, deviceScaleFactor: 1 } },
    { profile: 'dark', viewport: { width: 390, height: 844, deviceScaleFactor: 2 } }]) {
    const rows = ['closed', 'first-open', 'reopened', 'after-original-expiry', 'new-expired', 'third-open', 'action-dismissed']
      .map(state => ({ family: 'snack-bar', ...context, state }));
    for (const mode of ['reference', 'astylar']) {
      const page = await browser.newPage({ viewport: { width: context.viewport.width, height: context.viewport.height }, deviceScaleFactor: context.viewport.deviceScaleFactor });
      const finishRuntime = evidence.observe(page);
      try {
        await page.addInitScript(() => {
          window.__lifetimeClicks = [];
          document.addEventListener('click', e => window.__lifetimeClicks.push({ now: performance.now(), trusted: e.isTrusted,
            id: e.target.getAttribute?.('data-astylar-id') || e.target.closest?.('button')?.id || e.target.id || null }), true);
        });
        await page.goto(`${options.baseUrl}/${mode}/snack-bar?profile=${context.profile}`);
        await page.locator('.frame').waitFor();
        if (mode === 'astylar') await page.waitForFunction(() => !!window.__ASTYLAR_MATERIAL_BENCHMARK__);
        const settle = async () => {
          if (mode === 'astylar') await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled());
          await page.evaluate(async () => { await document.fonts.ready; await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); });
        };
        const click = async id => {
          if (mode === 'reference') await page.locator(id === 'snack-bar-primary' ? '#snack-bar-primary' : '.mat-mdc-snack-bar-action').click();
          else {
            const b = await page.evaluate(id => {
              const m = window.__ASTYLAR_MATERIAL_BENCHMARK__.measure([id], false).elements[id].borderBox;
              const c = document.querySelector('canvas').getBoundingClientRect();
              return { x: c.x + (m.left + m.right) / 2, y: c.y + (m.top + m.bottom) / 2 };
            }, id);
            await page.mouse.click(b.x, b.y);
          }
          await settle();
        };
        await settle();
        for (const row of rows) {
          if (row.state === 'first-open' || row.state === 'third-open') await click('snack-bar-primary');
          if (row.state === 'reopened') { await page.waitForTimeout(3000); await click('snack-bar-primary'); }
          if (row.state === 'after-original-expiry') await page.waitForTimeout(2300);
          if (row.state === 'new-expired') await page.waitForTimeout(2900);
          if (row.state === 'action-dismissed') {
            await click('snack-bar-dismiss');
            if (mode === 'reference') await page.locator('.mat-mdc-snack-bar-container').waitFor({ state: 'detached' });
          }
          await settle();
          const observation = await page.evaluate(mode => {
            const selector = mode === 'reference' ? '.mat-mdc-snack-bar-container' : '[data-astylar-id="snack-bar-surface"]';
            const nodes = [...document.querySelectorAll(selector)];
            return { now: performance.now(), popupCount: nodes.length, text: nodes[0]?.textContent ?? null,
              clicks: window.__lifetimeClicks, events: mode === 'astylar' ? window.__ASTYLAR_MATERIAL_BENCHMARK__.events() : null };
          }, mode);
          const tree = mode === 'reference' ? await page.evaluate(captureBrowserInputTree, { styleProperties: properties })
            : await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.measure([]).inputTree);
          const stem = `${evidence.directory}/${context.profile}-${mode}-${row.state}`;
          const pixels = await page.screenshot({ caret: 'hide' }), treeBytes = Buffer.from(JSON.stringify(tree));
          writeFileSync(`${stem}.png`, pixels, { flag: 'wx' }); writeFileSync(`${stem}.json`, treeBytes, { flag: 'wx' });
          row[mode] = { observation, screenshot: { file: `${stem}.png`, sha256: hash(pixels) }, inputTree: { file: `${stem}.json`, sha256: hash(treeBytes) } };
        }
        const runtime = await finishRuntime(); for (const row of rows) row[mode].runtime = runtime;
      } finally { await page.close(); }
    }
    results.push(...rows); console.log(JSON.stringify({ profile: context.profile, boundaries: rows.map(r => ({ state: r.state, reference: r.reference.observation.popupCount, astylar: r.astylar.observation.popupCount })) }));
  }
  writeFileSync(`${evidence.directory}/latest-report.json`, JSON.stringify({ schemaVersion: 1, browser: browser.version(), generatedAt: new Date().toISOString(), capture: evidence.capture, results,
    scope: 'Two ordinary snackbar contexts, real-click lifetime overlap and UNDO; runtime provenance replacement, not precise fade, full paint, resource or equal-input acceptance', inputEquivalent: false, renderingEquivalent: false }, null, 2) + '\n', { flag: 'wx' });
} finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
