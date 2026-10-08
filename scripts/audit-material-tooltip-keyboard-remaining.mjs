import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { captureBrowserInputTree } from '../tests/material-parity/input-tree-evidence.mjs';
import { propertyGroups } from '../tests/material-parity/input-equivalence-policy.mjs';
import { fingerprintDirectory, materialBrowserLaunchOptions } from '../tests/material-parity/run-checkpoint.mjs';
import { openSupplementalCapture, parseSupplementalCaptureArguments } from '../tests/material-parity/supplemental-capture-evidence.mjs';

// Only the three missing desktop DPR2 contexts. Existing light/profile DPR1
// proofs remain original evidence; no fixture or canonical state is changed.
const root = path.resolve('examples/material-showcase/dist/material-showcase/browser');
const checkpoint = 'artifacts/material-parity/current-full-20261005/checkpoint';
const manifest = JSON.parse(readFileSync(`${checkpoint}/manifest.json`));
assert.deepEqual(fingerprintDirectory(root), manifest.provenance.browserFiles);
const server = createServer((request, response) => {
  const name = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
  const candidate = path.resolve(root, name.replace(/^\/+/, ''));
  const file = candidate.startsWith(root + path.sep) && path.extname(candidate) && existsSync(candidate)
    ? candidate : path.join(root, 'index.csr.html');
  const ext = path.extname(file);
  response.writeHead(200, { 'content-type': ext === '.js' ? 'text/javascript' :
    ext === '.css' ? 'text/css' : ext === '.woff2' ? 'font/woff2' : 'text/html' });
  response.end(readFileSync(file));
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}`;
const options = parseSupplementalCaptureArguments([
  `--base-url=${baseUrl}`, `--checkpoint=${checkpoint}`, ...process.argv.slice(2),
]);
const properties = Object.values(propertyGroups).flat();
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
let browser;
try {
  browser = await chromium.launch(materialBrowserLaunchOptions());
  const evidence = openSupplementalCapture({ options, browser,
    script: 'scripts/audit-material-tooltip-keyboard-remaining.mjs', styleProperties: properties });
  const results = [];
  const viewport = { id: 'desktop-dpr2', width: 1440, height: 1000, deviceScaleFactor: 2 };
  for (const profile of ['dark', 'contrast', 'custom']) {
    const sequence = ['initial', 'keyboard-focus', 'keyboard-blur'].map(action =>
      ({ family: 'tooltip', profile, viewport, action, cohort: 'ordinary' }));
    for (const side of ['reference', 'astylar']) {
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: 2, colorScheme: profile === 'dark' ? 'dark' : 'light' });
      const finish = evidence.observe(page);
      try {
        await page.addInitScript(() => {
          window.__tooltipKeys = [];
          for (const type of ['keydown', 'keyup', 'focusin', 'focusout']) document.addEventListener(type,
            event => window.__tooltipKeys.push({ type, key: event.key ?? null, trusted: event.isTrusted,
              id: event.target.id ?? '', astylarId: event.target.getAttribute?.('data-astylar-id') ?? null }), true);
        });
        await page.goto(`${baseUrl}/${side}/tooltip?profile=${profile}`);
        await page.locator('.frame').waitFor();
        if (side === 'astylar') await page.waitForFunction(() => !!window.__ASTYLAR_MATERIAL_BENCHMARK__);
        const focused = () => page.evaluate(() => document.activeElement?.id === 'tooltip-primary' ||
          document.activeElement?.getAttribute('data-astylar-id') === 'tooltip-primary');
        for (const row of sequence) {
          if (row.action === 'keyboard-focus') {
            for (let i = 0; i < 12 && !await focused(); i++) await page.keyboard.press('Tab');
            assert.ok(await focused(), `Tab misses ${profile}/${side} trigger`);
          }
          if (row.action === 'keyboard-blur') { await page.keyboard.press('Tab'); assert.equal(await focused(), false); }
          if (side === 'astylar') await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled());
          await page.evaluate(async () => { await document.fonts.ready;
            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); });
          await page.waitForTimeout(250);
          const observation = await page.evaluate(side => ({
            activeId: document.activeElement?.id ?? '',
            activeAstylarId: document.activeElement?.getAttribute('data-astylar-id') ?? null,
            nativeShown: !!document.querySelector('.mat-mdc-tooltip-surface')?.parentElement.classList.contains('mat-mdc-tooltip-show'),
            candidateOpen: side === 'astylar' ? window.__ASTYLAR_MATERIAL_BENCHMARK__.state().open : null,
            events: structuredClone(window.__tooltipKeys),
          }), side);
          const tree = side === 'reference' ? await page.evaluate(captureBrowserInputTree, { styleProperties: properties })
            : await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.measure([]).inputTree);
          assert.deepEqual(tree.errors, []);
          const popupCount = tree.nodes.filter(node => side === 'reference'
            ? (node.attributes?.class ?? '').split(/\s+/).includes('mat-mdc-tooltip-surface')
            : node.authored?.id === 'tooltip-popup').length;
          const stem = `${evidence.directory}/${profile}-${side}-${row.action}`;
          const bytes = Buffer.from(JSON.stringify(tree)), png = await page.screenshot({ animations: 'disabled' });
          writeFileSync(`${stem}-input-tree.json`, bytes, { flag: 'wx' });
          writeFileSync(`${stem}.png`, png, { flag: 'wx' });
          row[side] = { ...observation, popupCount,
            inputTree: { file: `${stem}-input-tree.json`, sha256: hash(bytes) },
            screenshot: { file: `${stem}.png`, sha256: hash(png) } };
        }
        const runtime = await finish();
        for (const row of sequence) row[side].runtime = runtime;
      } finally { await page.close(); }
    }
    results.push(...sequence);
    console.log(JSON.stringify({ profile, observations: sequence.map(row =>
      ({ action: row.action, reference: row.reference.popupCount, astylar: row.astylar.popupCount })) }));
  }
  writeFileSync(`${evidence.directory}/latest-report.json`, JSON.stringify({ schemaVersion: 1,
    browser: browser.version(), capture: evidence.capture, results,
    scope: 'Three previously missing desktop DPR2 ordinary real-Tab focus/blur contexts. Presence and delivered focus evidence only, not equal-input paint or full current acceptance.' }, null, 2) + '\n', { flag: 'wx' });
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
