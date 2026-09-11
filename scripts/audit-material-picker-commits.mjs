import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

// Diagnostic supplement to the maintained matrix. Use its already-built server
// or a separately served production showcase. Never alter either fixture.
const baseUrl = process.argv.find((arg) => arg.startsWith('--base-url='))?.slice(11);
assert.ok(baseUrl, 'Supply --base-url=http://127.0.0.1:<showcase-port>');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [];
try {
  for (const family of ['datepicker', 'timepicker']) {
    const sides = {};
    for (const mode of ['reference', 'astylar']) {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      try {
        await page.goto(`${baseUrl}/${mode}/${family}?benchmark=1&profile=light&interaction=audit-commit`);
        await page.locator('.frame').waitFor();
        if (mode === 'astylar') {
          await page.waitForFunction(() => !!window.__ASTYLAR_MATERIAL_BENCHMARK__);
          await settle(page);
          await clickCandidate(page, `${family}-icon`);
          await clickCandidate(page, family === 'datepicker' ? 'datepicker-day-1' : 'timepicker-option-1');
          const input = page.locator(`input[id$="-${family}-control"]`);
          sides[mode] = {
            value: await input.inputValue(),
            open: await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.state().open),
            events: await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.events()
              .filter((event) => event.type === 'click' || event.type === 'change')),
            errors,
          };
        } else {
          const toggle = family === 'datepicker' ? 'mat-datepicker-toggle' : 'mat-timepicker-toggle';
          await page.locator(`#${family}-primary ${toggle} button`).click();
          const option = family === 'datepicker'
            ? page.locator('.mat-calendar-body-cell').filter({ hasText: /^\s*1\s*$/ })
            : page.locator('.mat-timepicker-panel mat-option').nth(1);
          await option.click();
          const popup = page.locator(family === 'datepicker' ? '.mat-datepicker-content' : '.mat-timepicker-panel');
          await popup.waitFor({ state: 'hidden' });
          sides[mode] = { value: await page.locator(`#${family}-control`).inputValue(), open: false, errors };
        }
      } finally {
        await page.close();
      }
    }
    results.push({ family, state: 'open-commit', action: family === 'datepicker' ? 'select day 1' : 'select 12:30 AM',
      ...sides, matches: sides.reference.value === sides.astylar.value && sides.reference.open === sides.astylar.open &&
        sides.reference.errors.length === 0 && sides.astylar.errors.length === 0 });
  }
  const report = { browser: browser.version(), viewport: { width: 1440, height: 900 }, profile: 'light',
    scope: 'Supplemental real-pointer picker commit checks; not full parity acceptance', results };
  mkdirSync('artifacts/material-parity/picker-commit-audit', { recursive: true });
  writeFileSync('artifacts/material-parity/picker-commit-audit/latest-report.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
  if (results.some((entry) => !entry.matches)) process.exitCode = 1;
} finally {
  await browser.close();
}

async function settle(page) {
  await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled());
}

async function clickCandidate(page, id) {
  const measurement = await page.evaluate((id) => window.__ASTYLAR_MATERIAL_BENCHMARK__.measure([id]), id);
  const bounds = measurement.elements[id]?.borderBox;
  const canvas = await page.locator('canvas').boundingBox();
  assert.ok(bounds && canvas, `Missing click geometry for ${id}`);
  // Projected output is used only to target a real diagnostic pointer action.
  // It is never fed into authored layout.
  await page.mouse.click(canvas.x + bounds.left + bounds.width / 2, canvas.y + bounds.top + bounds.height / 2);
  await settle(page);
}
