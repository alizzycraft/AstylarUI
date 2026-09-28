import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { PNG } from 'pngjs';
import { captureBrowserInputTree } from '../tests/material-parity/input-tree-evidence.mjs';
import { propertyGroups } from '../tests/material-parity/input-equivalence-policy.mjs';
import { openSupplementalCapture, parseSupplementalCaptureArguments } from '../tests/material-parity/supplemental-capture-evidence.mjs';

// Actual unchanged showcase inputs; private scene access only observes depth.
// This links a symptom to the independent equal-input primitive, not fixture parity.
const options = parseSupplementalCaptureArguments(process.argv.slice(2));
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const properties = Object.values(propertyGroups).flat();
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const results = [], viewports = [{ width: 900, height: 1000 }, { width: 900, height: 240 }];
try {
  const evidence = openSupplementalCapture({ options, browser,
    script: 'scripts/audit-material-snackbar-boundary.mjs', styleProperties: properties });
  for (const dpr of [1, 2]) for (const viewport of viewports) {
    const sequence = ['initial', 'click'].map(action => ({ family: 'snack-bar', action, viewport, deviceScaleFactor: dpr }));
    for (const mode of ['reference', 'astylar']) {
      const page = await browser.newPage({ viewport, deviceScaleFactor: dpr });
      const finishRuntime = evidence.observe(page);
      try {
        await page.addInitScript(() => {
          window.__snackbarAuditClicks = [];
          document.addEventListener('click', event => window.__snackbarAuditClicks.push({
            trusted: event.isTrusted, x: event.clientX, y: event.clientY,
            target: event.target.id ?? '', astylarId: event.target.getAttribute?.('data-astylar-id') ?? null,
          }), true);
        });
        await page.goto(`${options.baseUrl}/${mode}/snack-bar?profile=light`);
        await page.locator('.frame').waitFor();
        if (mode === 'astylar') await page.waitForFunction(() => !!window.__ASTYLAR_MATERIAL_BENCHMARK__);
        await settle(page, mode);
        const trigger = mode === 'reference' ? await page.locator('#snack-bar-primary').boundingBox()
          : await page.evaluate(() => {
            const b = window.__ASTYLAR_MATERIAL_BENCHMARK__.measure(['snack-bar-primary'], false).elements['snack-bar-primary'].borderBox;
            const c = document.querySelector('canvas').getBoundingClientRect();
            return { x: c.x + b.left, y: c.y + b.top, width: b.width, height: b.height };
          });
        assert.ok(trigger?.width > 0 && trigger?.height > 0);
        for (const entry of sequence) {
          if (entry.action === 'click') await page.mouse.click(trigger.x + trigger.width / 2, trigger.y + trigger.height / 2);
          await settle(page, mode);
          const observation = await page.evaluate(mode => {
            const api = window.__ASTYLAR_MATERIAL_BENCHMARK__;
            const popup = document.querySelector('.mat-mdc-snackbar-surface');
            const scene = mode === 'astylar' ? window.ng.getComponent(document.querySelector('app-astylar-showcase')).surface.scene : null;
            return { candidateOpen: mode === 'astylar' ? api.state().open : null,
              box: mode === 'astylar' ? api.measure(['snack-bar-surface'], false).elements['snack-bar-surface']?.borderBox ?? null
                : popup?.getBoundingClientRect().toJSON() ?? null,
              cameraZ: scene?.activeCamera.position.z ?? null,
              meshes: scene ? scene.meshes.filter(m => m.name === 'snack-bar-surface').map(m => ({
                name: m.name, z: m.getAbsolutePosition().z, enabled: m.isEnabled(), visible: m.isVisible, visibility: m.visibility,
              })) : [],
              canvas: document.querySelector('canvas')?.getBoundingClientRect().toJSON() ?? null,
              clicks: structuredClone(window.__snackbarAuditClicks) };
          }, mode);
          const screenshot = await page.screenshot({ animations: 'disabled' });
          const tree = mode === 'reference' ? await page.evaluate(captureBrowserInputTree, { styleProperties: properties })
            : await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.measure([]).inputTree);
          assert.ok(tree.nodes.length && tree.errors.length === 0);
          const stem = `${evidence.directory}/h${viewport.height}-dpr${dpr}-${mode}-${entry.action}`;
          const bytes = Buffer.from(JSON.stringify(tree));
          writeFileSync(`${stem}-input-tree.json`, bytes, { flag: 'wx' });
          writeFileSync(`${stem}.png`, screenshot, { flag: 'wx' });
          const png = PNG.sync.read(screenshot), box = observation.box;
          let darkPixels = 0;
          if (box) for (let y = Math.max(0, Math.ceil(box.top * dpr)); y < Math.min(png.height, Math.floor(box.bottom * dpr)); y++) {
            for (let x = Math.max(0, Math.ceil(box.left * dpr)); x < Math.min(png.width, Math.floor(box.right * dpr)); x++) {
              const offset = (y * png.width + x) * 4;
              if (png.data[offset] < 80 && png.data[offset + 1] < 80 && png.data[offset + 2] < 80) darkPixels++;
            }
          }
          entry[mode] = { ...observation, trigger, darkPixels,
            inputTree: { file: `${stem}-input-tree.json`, sha256: digest(bytes) },
            screenshot: { file: `${stem}.png`, sha256: digest(screenshot) } };
        }
        const runtime = await finishRuntime();
        for (const entry of sequence) entry[mode].runtime = runtime;
      } finally { await page.close(); }
    }
    results.push(...sequence);
    console.log(JSON.stringify({ viewport, dpr, states: sequence.map(e => ({ action: e.action,
      referenceDarkPixels: e.reference.darkPixels, candidateDarkPixels: e.astylar.darkPixels, open: e.astylar.candidateOpen })) }));
  }
  writeFileSync(`${evidence.directory}/latest-report.json`, JSON.stringify({ schemaVersion: 1,
    browser: browser.version(), capture: evidence.capture, results,
    scope: 'Ordinary real-click snackbar visibility/depth at viewport boundaries; not input-equivalence or full raster acceptance.',
  }, null, 2) + '\n', { flag: 'wx' });
  if (results.some(e => e.action === 'click' && (!e.astylar.candidateOpen || !e.astylar.darkPixels))) process.exitCode = 1;
} finally { await browser.close(); }

async function settle(page, mode) {
  if (mode === 'astylar') await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled());
  await page.evaluate(async () => { await document.fonts.ready; await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); });
  await page.waitForTimeout(300);
}
