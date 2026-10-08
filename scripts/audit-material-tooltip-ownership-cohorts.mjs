import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { captureBrowserInputTree } from '../tests/material-parity/input-tree-evidence.mjs';
import { propertyGroups } from '../tests/material-parity/input-equivalence-policy.mjs';
import { openSupplementalCapture, parseSupplementalCaptureArguments } from '../tests/material-parity/supplemental-capture-evidence.mjs';

// Extend the existing ordinary dark/mobile ownership observation only to missing
// physical cohorts. This records failed plateaus, not lifecycle acceptance.
const options = parseSupplementalCaptureArguments(process.argv.slice(2));
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const properties = Object.values(propertyGroups).flat();
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const evidence = openSupplementalCapture({ options, browser,
  script: 'scripts/audit-material-tooltip-ownership-cohorts.mjs', styleProperties: properties });
const viewports = [
  { id: 'desktop-dpr1', width: 1440, height: 1000, deviceScaleFactor: 1 },
  { id: 'desktop-dpr2', width: 1440, height: 1000, deviceScaleFactor: 2 },
  { id: 'tablet-dpr1', width: 768, height: 1024, deviceScaleFactor: 1 },
  { id: 'mobile-dpr2', width: 390, height: 844, deviceScaleFactor: 2 },
];
const results = [];
try {
  for (const profile of ['light', 'dark', 'contrast', 'custom']) for (const viewport of viewports) {
    if (profile === 'dark' && viewport.id === 'mobile-dpr2') continue;
    const entry = { family: 'tooltip', profile, viewport, cohort: 'ordinary-pointer-ownership' };
    for (const mode of ['reference', 'astylar']) {
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: viewport.deviceScaleFactor, colorScheme: profile === 'dark' ? 'dark' : 'light' });
      const finishRuntime = evidence.observe(page);
      try {
        await page.goto(`${options.baseUrl}/${mode}/tooltip?profile=${profile}`);
        await page.locator('.frame').waitFor();
        if (mode === 'astylar') await page.waitForFunction(() => !!window.__ASTYLAR_MATERIAL_BENCHMARK__);
        const selector = mode === 'reference' ? '.mat-mdc-tooltip-surface' : '[data-astylar-id="tooltip-popup"]';
        const settle = async () => {
          if (mode === 'astylar') await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled());
          await page.evaluate(async () => { await document.fonts.ready;
            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); });
        };
        await settle();
        const point = await page.evaluate(mode => {
          if (mode === 'reference') {
            const box = document.getElementById('tooltip-primary').getBoundingClientRect();
            return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
          }
          const box = window.__ASTYLAR_MATERIAL_BENCHMARK__.measure(['tooltip-primary'], false).elements['tooltip-primary'].borderBox;
          const canvas = document.querySelector('canvas').getBoundingClientRect();
          return { x: canvas.x + box.left + box.width / 2, y: canvas.y + box.top + box.height / 2 };
        }, mode);
        const cycles = [];
        for (let cycle = 0; cycle < 3; cycle++) {
          await page.mouse.move(point.x, point.y);
          await page.locator(selector).waitFor({ state: 'visible' });
          await settle();
          assert.equal(await page.locator(selector).count(), 1);
          await page.mouse.move(10, 10);
          await page.locator(selector).waitFor({ state: 'detached' });
          await settle();
          cycles.push(await page.evaluate(mode => {
            if (mode === 'reference') return { popupCount: document.querySelectorAll('.mat-mdc-tooltip-surface').length };
            const surface = window.ng.getComponent(document.querySelector('app-astylar-showcase')).surface;
            const scene = surface.scene;
            return { popupCount: document.querySelectorAll('[data-astylar-id="tooltip-popup"]').length,
              tracked: surface.diagnostics.resources,
              live: { meshes: scene.meshes.length, materials: scene.materials.length, textures: scene.textures.length },
              unbound: scene.materials.filter(material => !scene.meshes.some(mesh => mesh.material === material))
                .map(material => ({ name: material.name, uniqueId: material.uniqueId })) };
          }, mode));
        }
        const tree = mode === 'reference' ? await page.evaluate(captureBrowserInputTree, { styleProperties: properties })
          : await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.measure([]).inputTree);
        const stem = `${evidence.directory}/${profile}-${viewport.id}-${mode}`;
        const bytes = Buffer.from(JSON.stringify(tree)), screenshot = await page.screenshot({ animations: 'allow' });
        writeFileSync(`${stem}-input-tree.json`, bytes, { flag: 'wx' });
        writeFileSync(`${stem}.png`, screenshot, { flag: 'wx' });
        let disposal = null;
        if (mode === 'astylar') disposal = await page.evaluate(() => {
          const surface = window.ng.getComponent(document.querySelector('app-astylar-showcase')).surface;
          const scene = surface.scene;
          surface.dispose();
          return { disposed: surface.disposed, meshes: scene.meshes.length,
            materials: scene.materials.length, textures: scene.textures.length };
        });
        const runtime = await finishRuntime();
        assert(cycles.every(cycle => cycle.popupCount === 0));
        if (disposal) assert.deepEqual(disposal, { disposed: true, meshes: 0, materials: 0, textures: 0 });
        entry[mode] = { cycles, disposal, runtime,
          inputTree: { file: `${stem}-input-tree.json`, sha256: digest(bytes) },
          screenshot: { file: `${stem}.png`, sha256: digest(screenshot) } };
      } finally { await page.close(); }
    }
    results.push(entry);
    console.log(JSON.stringify({ profile, viewport: viewport.id,
      tracked: entry.astylar.cycles.map(cycle => cycle.tracked.materials),
      live: entry.astylar.cycles.map(cycle => cycle.live.materials), disposal: entry.astylar.disposal }));
  }
  writeFileSync(`${evidence.directory}/latest-report.json`, JSON.stringify({ schemaVersion: 1,
    browser: browser.version(), capture: evidence.capture,
    scope: 'Fifteen previously unobserved physical cohorts; three ordinary hover/leave cycles and sampled final disposal. Dark/mobile DPR2 original proof reused separately. No plateau, GPU, async, remount, isolation or rendering acceptance.', results }, null, 2) + '\n', { flag: 'wx' });
} finally { await browser.close(); }
