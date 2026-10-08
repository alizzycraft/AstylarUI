import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { captureBrowserInputTree } from '../tests/material-parity/input-tree-evidence.mjs';
import { propertyGroups } from '../tests/material-parity/input-equivalence-policy.mjs';
import { openSupplementalCapture, parseSupplementalCaptureArguments } from '../tests/material-parity/supplemental-capture-evidence.mjs';

// Trusted touch is a distinct input cohort, not a change to canonical fixtures.
const script = 'scripts/audit-material-tooltip-touch.mjs';
const options = parseSupplementalCaptureArguments(process.argv.slice(2));
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const properties = Object.values(propertyGroups).flat();
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const viewport = { width: 390, height: 844 };
const userAgent = `Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${browser.version()} Mobile Safari/537.36`;
const results = [];
const evidence = openSupplementalCapture({ options, browser, script, styleProperties: properties });
try {
  const entries = new Map();
  for (const mode of ['reference', 'astylar']) {
    const context = await browser.newContext({ viewport, deviceScaleFactor: 2,
      isMobile: true, hasTouch: true, userAgent, colorScheme: 'dark' });
    const page = await context.newPage();
    const finishRuntime = evidence.observe(page);
    try {
      await page.addInitScript(() => {
        window.__tooltipTouchEvents = [];
        for (const type of ['touchstart', 'touchend', 'touchcancel', 'pointerenter', 'pointerdown', 'pointerup', 'pointercancel', 'pointerleave']) {
          document.addEventListener(type, event => window.__tooltipTouchEvents.push({
            type, trusted: event.isTrusted, time: performance.now(), pointerType: event.pointerType ?? null,
            targetId: event.target.id ?? '', targetTag: event.target.tagName ?? '' }), true);
        }
        window.__tooltipTouchSamples = [];
      });
      await page.goto(`${options.baseUrl}/${mode}/tooltip?profile=dark`);
      await page.locator('.frame').waitFor();
      if (mode === 'astylar') {
        await page.waitForFunction(() => !!window.__ASTYLAR_MATERIAL_BENCHMARK__);
        await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled());
      }
      await page.evaluate(() => document.fonts.ready);
      const box = mode === 'reference' ? await page.locator('#tooltip-primary').boundingBox()
        : await page.evaluate(() => {
          const api = window.__ASTYLAR_MATERIAL_BENCHMARK__, local = api.measure(['tooltip-primary'], false).elements['tooltip-primary'].borderBox;
          const canvas = document.querySelector('canvas').getBoundingClientRect();
          return { x: canvas.x + local.left, y: canvas.y + local.top, width: local.width, height: local.height };
        });
      assert(box && box.width > 0 && box.height > 0);
      const session = await context.newCDPSession(page);
      async function touch(type) {
        await session.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchStart'
          ? [{ x: box.x + box.width / 2, y: box.y + box.height / 2, id: 1, radiusX: 1, radiusY: 1, force: 1 }] : [] });
      }
      async function observe(label, delay) {
        const sample = await page.evaluate(async ({ label, delay, mode }) => {
          const begin = performance.now();
          await new Promise(resolve => setTimeout(resolve, delay));
          const popup = document.querySelector('.mat-mdc-tooltip-surface');
          const shown = mode === 'reference' ? !!popup?.parentElement.classList.contains('mat-mdc-tooltip-show')
            : !!window.__ASTYLAR_MATERIAL_BENCHMARK__.state().open;
          const sample = { label, requestedDelay: delay, elapsed: performance.now() - begin,
            time: performance.now(), shown, events: structuredClone(window.__tooltipTouchEvents) };
          window.__tooltipTouchSamples.push(sample);
          return sample;
        }, { label, delay, mode });
        return sample;
      }
      async function capture(action, samples) {
        const tree = mode === 'reference' ? await page.evaluate(captureBrowserInputTree, { styleProperties: properties })
          : await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.measure([]).inputTree);
        assert(tree.nodes.length && !tree.errors.length);
        const stem = `${evidence.directory}/${mode}-${action}`, bytes = Buffer.from(JSON.stringify(tree));
        const png = await page.screenshot({ animations: 'allow', caret: 'initial' });
        writeFileSync(`${stem}-input-tree.json`, bytes, { flag: 'wx' });
        writeFileSync(`${stem}.png`, png, { flag: 'wx' });
        let entry = entries.get(action);
        if (!entry) { entry = { family: 'tooltip', action, viewport, deviceScaleFactor: 2, profile: 'dark', cohort: 'android-trusted-touch' }; entries.set(action, entry); results.push(entry); }
        entry[mode] = { samples, triggerBox: box, inputTree: { file: `${stem}-input-tree.json`, sha256: digest(bytes) },
          screenshot: { file: `${stem}.png`, sha256: digest(png) } };
      }
      await touch('touchStart');
      const shortHeld = await observe('short-held', 100);
      await touch('touchEnd');
      await capture('short-tap', [shortHeld, await observe('short-ended', 700)]);
      await touch('touchStart');
      const early = await observe('long-held-early', 100), late = await observe('long-held-late', 600);
      await capture('long-held', [early, late]);
      await touch('touchEnd');
      const releaseEarly = await observe('release-early', 100), releaseLate = await observe('release-late', 1700);
      await capture('long-release', [releaseEarly, releaseLate]);
      await touch('touchStart');
      const cancelHeld = await observe('cancel-held', 700);
      await touch('touchCancel');
      await capture('long-cancel', [cancelHeld, await observe('cancel-late', 1800)]);
      const runtime = await finishRuntime();
      for (const entry of results) entry[mode].runtime = runtime;
      assert(runtime.errors.length === 0);
      await session.detach();
    } finally { await context.close(); }
  }
  const report = { schemaVersion: 1, browser: browser.version(), capture: evidence.capture,
    viewport, userAgent, isMobile: true, hasTouch: true, deviceScaleFactor: 2,
    scope: 'Android emulation / dark / DPR2 trusted-touch state/timing diagnostic; no configured-case, physical-device, raster or parity acceptance claim.', results };
  writeFileSync(`${evidence.directory}/latest-report.json`, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify(results.map(entry => ({ action: entry.action,
    reference: entry.reference.samples.map(sample => ({ label: sample.label, elapsed: sample.elapsed, shown: sample.shown })),
    astylar: entry.astylar.samples.map(sample => ({ label: sample.label, elapsed: sample.elapsed, shown: sample.shown })) }))));
} finally { await browser.close(); }
