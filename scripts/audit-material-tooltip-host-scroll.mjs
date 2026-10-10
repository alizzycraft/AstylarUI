import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { fingerprintDirectory, fingerprintModuleGraph, materialBrowserLaunchOptions, inspectMaterialBrowserLaunch, openMaterialCheckpoint } from '../tests/material-parity/run-checkpoint.mjs';
import { openSupplementalCapture, validateSupplementalCapture } from '../tests/material-parity/supplemental-capture-evidence.mjs';
import { captureBrowserInputTree } from '../tests/material-parity/input-tree-evidence.mjs';
import { propertyGroups } from '../tests/material-parity/input-equivalence-policy.mjs';

// Explicit host diagnostic, not canonical fixture authoring or parity acceptance.
const script = 'scripts/audit-material-tooltip-host-scroll.mjs';
const output = path.resolve(process.argv[2] ?? '');
assert.ok(output.startsWith(path.resolve('artifacts/material-parity') + path.sep), 'Supply a new artifact directory.');
assert.ok(!existsSync(output) && !existsSync(output + '-checkpoint'), 'Preserve previous evidence.');
const browserRoot = path.resolve('examples/material-showcase/dist/material-showcase/browser');
const ancestor = JSON.parse(readFileSync('artifacts/material-parity/tooltip-depth-checkpoint-c479097f/checkpoint/manifest.json'));
const browserFiles = fingerprintDirectory(browserRoot);
assert.deepEqual(browserFiles, ancestor.provenance.browserFiles, 'Served application drift: investigate before capture.');
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const server = createServer((request, response) => {
  const name = decodeURIComponent(new URL(request.url, 'http://localhost').pathname).replace(/^\/+/, '');
  const file = path.resolve(browserRoot, name);
  const target = file.startsWith(browserRoot + path.sep) && path.extname(file) && existsSync(file) ? file : path.join(browserRoot, 'index.csr.html');
  const type = { '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' }[path.extname(target)] ?? 'text/html';
  response.writeHead(200, { 'content-type': type, 'cache-control': 'no-store' });
  response.end(readFileSync(target));
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}`;
const launch = materialBrowserLaunchOptions();
const browser = await chromium.launch(launch);
const properties = Object.values(propertyGroups).flat(), results = [];
try {
  const provenance = { browser: browser.version(), platform: process.platform, architecture: process.arch, node: process.version,
    browserLaunch: await inspectMaterialBrowserLaunch(browser, launch), browserFiles, harness: fingerprintModuleGraph(process.cwd(), script) };
  openMaterialCheckpoint({ directory: output + '-checkpoint', provenance });
  const evidence = openSupplementalCapture({ options: { baseUrl, checkpoint: output + '-checkpoint/checkpoint', output }, browser, script, styleProperties: properties });
  for (const dpr of [1, 2]) {
    const sequence = ['hover', 'host-scroll', 'pointer-recheck'].map(action => ({ family: 'tooltip', profile: 'light', viewport: { width: 900, height: 1000 }, deviceScaleFactor: dpr, action }));
    for (const mode of ['reference', 'astylar']) {
      const page = await browser.newPage({ viewport: sequence[0].viewport, deviceScaleFactor: dpr });
      const finish = evidence.observe(page);
      try {
        await page.addInitScript(() => {
          window.__hostScrollEvents = [];
          for (const type of ['scroll', 'pointermove', 'pointerout', 'pointerover', 'mouseleave']) document.addEventListener(type, event => {
            window.__hostScrollEvents.push({ type, id: event.target.id ?? '', tag: event.target.tagName ?? '', clientX: event.clientX ?? null, clientY: event.clientY ?? null, scrollY, trusted: event.isTrusted });
          }, true);
        });
        await page.goto(`${baseUrl}/${mode}/tooltip?profile=light`);
        await page.locator('.frame').waitFor();
        if (mode === 'astylar') await page.waitForFunction(() => !!window.__ASTYLAR_MATERIAL_BENCHMARK__);
        await page.evaluate(async () => { await document.fonts.ready; const spacer = document.createElement('div'); spacer.id = 'audit-host-scroll-extent'; spacer.style.cssText = 'position:absolute;top:1400px;left:0;width:1px;height:1px;pointer-events:none'; document.body.append(spacer); });
        const box = await triggerBox(page, mode);
        const pointer = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
        await page.mouse.move(pointer.x, pointer.y);
        for (const entry of sequence) {
          if (entry.action === 'host-scroll') await page.evaluate(() => window.scrollTo(0, 100));
          if (entry.action === 'pointer-recheck') await page.mouse.move(pointer.x + 1, pointer.y);
          if (mode === 'astylar') await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled());
          await page.waitForTimeout(300);
          const state = await page.evaluate(mode => ({ scrollY, scrollHeight: document.documentElement.scrollHeight,
            shown: mode === 'reference' ? !!document.querySelector('.mat-mdc-tooltip-show') : window.__ASTYLAR_MATERIAL_BENCHMARK__.state().open,
            events: window.__hostScrollEvents, candidateEvents: mode === 'astylar' ? window.__ASTYLAR_MATERIAL_BENCHMARK__.events() : null }), mode);
          const tree = mode === 'reference' ? await page.evaluate(captureBrowserInputTree, { styleProperties: properties }) : await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.measure([]).inputTree);
          const stem = `${evidence.directory}/dpr${dpr}-${mode}-${entry.action}`;
          const bytes = Buffer.from(JSON.stringify(tree)), png = await page.screenshot({ animations: 'disabled' });
          writeFileSync(stem + '-input-tree.json', bytes, { flag: 'wx' }); writeFileSync(stem + '.png', png, { flag: 'wx' });
          entry[mode] = { ...state, pointer, triggerBox: await triggerBox(page, mode), inputTree: { file: stem + '-input-tree.json', sha256: digest(bytes) }, screenshot: { file: stem + '.png', sha256: digest(png) } };
        }
        const runtime = await finish(); for (const entry of sequence) entry[mode].runtime = runtime;
      } finally { await page.close(); }
    }
    for (const entry of sequence) {
      assert.equal(entry.reference.scrollY, entry.astylar.scrollY, 'Unequal host scroll');
      assert.equal(entry.reference.scrollHeight, entry.astylar.scrollHeight, 'Unequal host extent');
      console.log(JSON.stringify({ dpr, action: entry.action, scrollY: entry.reference.scrollY, referenceShown: entry.reference.shown, candidateShown: entry.astylar.shown }));
    }
    results.push(...sequence);
  }
  assert.deepEqual(fingerprintDirectory(browserRoot), browserFiles, 'Runtime changed during capture.');
  const report = { schemaVersion: 1, browser: browser.version(), capture: evidence.capture, scope: 'Matched external host scroll only; unchanged internal fixtures differ. Not equal-input complete rendering acceptance.', diagnosticHostStyle: 'position:absolute;top:1400px;left:0;width:1px;height:1px;pointer-events:none', results };
  const reportFile = `${evidence.directory}/latest-report.json`;
  writeFileSync(reportFile, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  assert.deepEqual(validateSupplementalCapture(report, { reportFile, expectedProvenance: provenance, script, styleProperties: properties }), { status: 'checkpoint-bound', errors: [] });
  console.log('Capture and independent supplemental validation complete.');
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }

async function triggerBox(page, mode) {
  if (mode === 'reference') return page.locator('#tooltip-primary').boundingBox();
  const local = await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.measure(['tooltip-primary'], false).elements['tooltip-primary'].borderBox);
  const canvas = await page.locator('canvas').boundingBox();
  return { x: canvas.x + local.left, y: canvas.y + local.top, width: local.width, height: local.height };
}
