import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { captureBrowserInputTree } from '../tests/material-parity/input-tree-evidence.mjs';
import { propertyGroups } from '../tests/material-parity/input-equivalence-policy.mjs';
import { openSupplementalCapture, parseSupplementalCaptureArguments } from '../tests/material-parity/supplemental-capture-evidence.mjs';

// Observe the full shared domain without changing fixtures or injecting state.
const options = parseSupplementalCaptureArguments(process.argv.slice(2));
const { baseUrl } = options;
const viewport = { width: 1440, height: 900 };
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [];
try {
  const evidence = openSupplementalCapture({ options, browser, script: 'scripts/audit-material-slider-domain.mjs',
    styleProperties: Object.values(propertyGroups).flat() });
  const directory = evidence.directory;
  for (const method of ['keyboard', 'pointer']) for (const thumb of ['start', 'end']) {
    const sides = {};
    for (const mode of ['reference', 'astylar']) {
      const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
      const finishRuntime = evidence.observe(page);
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      try {
        await page.goto(`${baseUrl}/${mode}/slider?benchmark=1&profile=light&interaction=audit-full-domain`);
        await page.locator('.frame').waitFor();
        await page.evaluate(() => document.fonts.ready);
        if (mode === 'astylar') await page.waitForFunction(() => !!window.__ASTYLAR_MATERIAL_BENCHMARK__);
        await settle(page, mode);
        const trace = [await readValues(page, mode)];
        if (method === 'keyboard') {
          const id = thumb === 'start' ? 'slider-start' : 'slider-primary';
          await page.locator(mode === 'reference' ? `#${id}` : `input[id$="-${id}"]`).focus();
          await settle(page, mode);
          for (let index = 0; index < (thumb === 'start' ? 6 : 5); index += 1) {
            await page.keyboard.press(thumb === 'start' ? 'ArrowRight' : 'ArrowLeft');
            await settle(page, mode);
            trace.push(await readValues(page, mode));
          }
        } else {
          const ratio = thumb === 'start' ? 0.6 : 0.4;
          let from;
          let to;
          if (mode === 'reference') {
            const track = await page.locator('mat-slider .mdc-slider__track').boundingBox();
            const handle = await page.locator('mat-slider mat-slider-visual-thumb').nth(thumb === 'start' ? 0 : 1).boundingBox();
            assert.ok(track && handle, 'Missing reference drag geometry');
            from = { x: handle.x + handle.width / 2, y: handle.y + handle.height / 2 };
            to = { x: track.x + track.width * ratio, y: from.y };
          } else {
            const box = await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.measure(['slider-visual'], false).elements['slider-visual'].borderBox);
            const canvas = await page.locator('canvas').boundingBox();
            assert.ok(box && canvas, 'Missing candidate drag geometry');
            from = { x: canvas.x + box.left + box.width * Number(trace[0][thumb].value) / 100, y: canvas.y + box.top + box.height / 2 };
            to = { x: canvas.x + box.left + box.width * ratio, y: from.y };
          }
          // Output measurements target diagnostic mouse actions only.
          await page.mouse.move(from.x, from.y);
          await page.mouse.down();
          for (let index = 1; index <= 12; index += 1) {
            await page.mouse.move(from.x + (to.x - from.x) * index / 12, from.y);
            await settle(page, mode);
            trace.push(await readValues(page, mode));
          }
          await page.mouse.up();
          await settle(page, mode);
          trace.push(await readValues(page, mode));
        }
        const tree = mode === 'reference'
          ? await page.evaluate(captureBrowserInputTree, { styleProperties: Object.values(propertyGroups).flat() })
          : await page.evaluate(async () => {
            await window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled();
            return window.__ASTYLAR_MATERIAL_BENCHMARK__.measure([]).inputTree;
          });
        assert.ok(tree?.nodes.length && tree.errors.length === 0, 'Incomplete slider input tree');
        const contents = JSON.stringify(tree);
        const file = `${directory}/${method}-${thumb}-${mode}-input-tree.json`;
        writeFileSync(file, contents, { flag: 'wx' });
        sides[mode] = { trace, errors, inputTree: { file, sha256: createHash('sha256').update(contents).digest('hex') } };
        if (mode === 'astylar') sides[mode].events = await page.evaluate(() =>
          window.__ASTYLAR_MATERIAL_BENCHMARK__.events().filter((event) => ['input', 'change', 'keydown', 'pointerdown', 'pointerup'].includes(event.type)));
        sides[mode].runtime = await finishRuntime();
      } finally { await page.close(); }
    }
    const expected = thumb === 'start' ? { start: 60, end: 65 } : { start: 30, end: 40 };
    const reached = (side) => ['start', 'end'].every((key) => Number(sides[side].trace.at(-1)[key].value) === expected[key]);
    results.push({ family: 'slider', state: `${method}-${thumb}-full-domain`, method, thumb, expected, ...sides,
      matches: reached('reference') && reached('astylar') && !sides.reference.errors.length && !sides.astylar.errors.length });
  }
  const report = { browser: browser.version(), capture: evidence.capture, viewport, profile: 'light', deviceScaleFactor: 1,
    scope: 'Supplemental real keyboard/pointer full-domain slider checks, including native attributes and intermediate values', results };
  writeFileSync(`${directory}/latest-report.json`, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify(results.map(({ state, reference, astylar, matches }) => ({ state, matches,
    reference: reference.trace.map(({ start, end }) => [start.value, end.value]),
    astylar: astylar.trace.map(({ start, end }) => [start.value, end.value]) })), null, 2));
  if (results.some((entry) => !entry.matches)) process.exitCode = 1;
} finally { await browser.close(); }

async function settle(page, mode) {
  if (mode === 'astylar') await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled());
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function readValues(page, mode) {
  return page.evaluate((mode) => Object.fromEntries(['start', 'end'].map((thumb) => {
    const id = thumb === 'start' ? 'slider-start' : 'slider-primary';
    const element = document.querySelector(mode === 'reference' ? `#${id}` : `input[id$="-${id}"]`);
    if (!(element instanceof HTMLInputElement)) throw new Error(`Missing ${thumb} native range input`);
    return [thumb, { value: element.value, min: element.min, max: element.max, step: element.step, focused: document.activeElement === element }];
  })), mode);
}
