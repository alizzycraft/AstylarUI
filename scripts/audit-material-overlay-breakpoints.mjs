import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { captureBrowserInputTree } from '../tests/material-parity/input-tree-evidence.mjs';
import { propertyGroups } from '../tests/material-parity/input-equivalence-policy.mjs';

// Supplemental evidence, not a substitute for the maintained full matrix.
// Open unmodified fixtures with real pointer input; never feed measured output
// into layout. The 1024px case exercises Material's medium sheet breakpoint.
const baseUrl = process.argv.find((arg) => arg.startsWith('--base-url='))?.slice(11);
assert.ok(baseUrl, 'Supply --base-url=http://127.0.0.1:<showcase-port>');
const directory = 'artifacts/material-parity/overlay-breakpoint-audit';
mkdirSync(directory, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [];
try {
  for (const width of [900, 1024, 1440]) {
    const viewport = { width, height: 900 };
    const sides = {};
    for (const mode of ['reference', 'astylar']) {
      const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      try {
        await page.goto(`${baseUrl}/${mode}/bottom-sheet?benchmark=1&profile=light&interaction=audit-breakpoint`);
        await page.locator('.frame').waitFor();
        await page.evaluate(() => document.fonts.ready);
        let tree;
        if (mode === 'reference') {
          await page.locator('#bottom-sheet-primary').click();
          await page.locator('mat-bottom-sheet-container').waitFor();
          // Transitional scale/translation is not settled layout evidence.
          await page.evaluate(async () => {
            await Promise.all(document.getAnimations().filter((animation) =>
              Number.isFinite(animation.effect?.getComputedTiming().endTime)).map((animation) => animation.finished));
          });
          sides[mode] = await page.locator('mat-bottom-sheet-container').evaluate((element) => {
            const box = element.getBoundingClientRect();
            const style = getComputedStyle(element);
            return { box: { left: box.left, top: box.top, width: box.width, height: box.height },
              classes: element.className, minWidth: style.minWidth, maxWidth: style.maxWidth,
              maxHeight: style.maxHeight, text: element.textContent.trim() };
          });
          tree = await page.evaluate(captureBrowserInputTree, { styleProperties: Object.values(propertyGroups).flat() });
        } else {
          await page.waitForFunction(() => !!window.__ASTYLAR_MATERIAL_BENCHMARK__);
          await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled());
          const trigger = await page.evaluate(() =>
            window.__ASTYLAR_MATERIAL_BENCHMARK__.measure(['bottom-sheet-primary']).elements['bottom-sheet-primary'].borderBox);
          const canvas = await page.locator('canvas').boundingBox();
          assert.ok(trigger && canvas, 'Missing trigger geometry');
          await page.mouse.click(canvas.x + trigger.left + trigger.width / 2, canvas.y + trigger.top + trigger.height / 2);
          await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled());
          const measurement = await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.measure(['bottom-sheet-panel']));
          const box = measurement.elements['bottom-sheet-panel']?.borderBox;
          assert.ok(box, 'Missing opened bottom sheet');
          sides[mode] = { box: { left: canvas.x + box.left, top: canvas.y + box.top, width: box.width, height: box.height },
            state: await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.state()) };
          tree = measurement.inputTree;
        }
        assert.ok(tree?.nodes.length && tree.errors.length === 0, `Incomplete ${mode} input tree`);
        const contents = JSON.stringify(tree);
        const file = `${directory}/bottom-sheet-${width}-${mode}-input-tree.json`;
        writeFileSync(file, contents);
        sides[mode].inputTree = { file, sha256: createHash('sha256').update(contents).digest('hex') };
        sides[mode].errors = errors;
      } finally { await page.close(); }
    }
    const geometryError = Math.max(...['left', 'top', 'width', 'height'].map((property) =>
      Math.abs(sides.reference.box[property] - sides.astylar.box[property])));
    results.push({ family: 'bottom-sheet', state: 'open', viewport, ...sides, geometryError,
      matches: geometryError <= 0.5 && !sides.reference.errors.length && !sides.astylar.errors.length });
  }
  const report = { browser: browser.version(), profile: 'light', deviceScaleFactor: 1,
    scope: 'Supplemental settled bottom-sheet breakpoint geometry and full input trees', results };
  writeFileSync(`${directory}/latest-report.json`, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
  if (results.some((entry) => !entry.matches)) process.exitCode = 1;
} finally { await browser.close(); }
