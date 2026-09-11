import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { createHash } from 'node:crypto';
import { captureBrowserInputTree } from '../tests/material-parity/input-tree-evidence.mjs';
import { propertyGroups } from '../tests/material-parity/input-equivalence-policy.mjs';

// Diagnostic supplement to the maintained matrix. Use its already-built server
// or a separately served production showcase. Never alter either fixture.
const baseUrl = process.argv.find((arg) => arg.startsWith('--base-url='))?.slice(11);
assert.ok(baseUrl, 'Supply --base-url=http://127.0.0.1:<showcase-port>');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [];
const artifactDirectory = 'artifacts/material-parity/picker-commit-audit';
mkdirSync(artifactDirectory, { recursive: true });
try {
  for (const { family, method } of ['datepicker', 'timepicker'].flatMap((family) =>
    ['pointer', 'keyboard'].map((method) => ({ family, method })))) {
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
          if (method === 'pointer') {
            await clickCandidate(page, family === 'datepicker' ? 'datepicker-day-1' : 'timepicker-option-1');
          } else {
            const target = family === 'datepicker' ? 'datepicker-day-1' : 'timepicker-control';
            await page.locator(`[id$="-${target}"]`).focus();
            await page.keyboard.press(family === 'datepicker' ? 'ArrowRight' : 'ArrowDown');
            await page.keyboard.press('Enter');
            await settle(page);
          }
          const input = page.locator(`input[id$="-${family}-control"]`);
          sides[mode] = {
            value: await input.inputValue(),
            open: await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.state().open),
            events: await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.events()
              .filter((event) => ['click', 'change', 'keydown'].includes(event.type))),
            errors,
          };
        } else {
          const toggle = family === 'datepicker' ? 'mat-datepicker-toggle' : 'mat-timepicker-toggle';
          await page.locator(`#${family}-primary ${toggle} button`).click();
          if (family === 'datepicker') await page.locator('.mat-datepicker-content-animating').waitFor({ state: 'hidden' });
          const option = family === 'datepicker'
            ? page.locator('.mat-calendar-body-cell').filter({ hasText: /^\s*1\s*$/ })
            : page.locator('.mat-timepicker-panel mat-option').nth(1);
          if (method === 'pointer') await option.click();
          else {
            const target = family === 'datepicker' ? option : page.locator('#timepicker-control');
            await target.focus();
            await page.keyboard.press(family === 'datepicker' ? 'ArrowRight' : 'ArrowDown');
            await page.keyboard.press('Enter');
          }
          const popup = page.locator(family === 'datepicker' ? '.mat-datepicker-content' : '.mat-timepicker-panel');
          await popup.waitFor({ state: 'hidden' });
          sides[mode] = { value: await page.locator(`#${family}-control`).inputValue(), open: false, errors };
        }
        sides[mode].inputTree = await captureInputs(page, mode, `${family}-commit-${method}`);
      } finally {
        await page.close();
      }
    }
    results.push({ family, state: `open-commit-${method}`, action: method === 'keyboard'
      ? 'focus first day/input; arrow to next option; Enter'
      : family === 'datepicker' ? 'select day 1' : 'select 12:30 AM',
      ...sides, matches: sides.reference.value === sides.astylar.value && sides.reference.open === sides.astylar.open &&
        sides.reference.errors.length === 0 && sides.astylar.errors.length === 0 });
  }
  for (const direction of ['previous', 'next']) {
    const sides = {};
    for (const mode of ['reference', 'astylar']) {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      try {
        await page.goto(`${baseUrl}/${mode}/datepicker?benchmark=1&profile=light&interaction=audit-navigation`);
        await page.locator('.frame').waitFor();
        if (mode === 'reference') {
          await page.locator('#datepicker-primary mat-datepicker-toggle button').click();
          const before = await page.locator('.mat-calendar-period-button').innerText();
          await page.locator(`.mat-calendar-${direction}-button`).click();
          await page.waitForFunction((previous) => document.querySelector('.mat-calendar-period-button')?.textContent.trim() !== previous.trim(), before);
          sides[mode] = { before: before.trim(), after: (await page.locator('.mat-calendar-period-button').innerText()).trim(), errors };
        } else {
          await page.waitForFunction(() => !!window.__ASTYLAR_MATERIAL_BENCHMARK__);
          await settle(page);
          await clickCandidate(page, 'datepicker-icon');
          const month = () => page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.measure(['datepicker-month'], false)
            .inputTree.nodes.find((node) => node.authored.id === 'datepicker-month').authored.value.replace(/[▾▴]/g, '').trim());
          const before = await month();
          await clickCandidate(page, `datepicker-${direction}`);
          sides[mode] = { before, after: await month(), errors,
            events: await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.events().filter((event) => event.type === 'click')) };
        }
        sides[mode].inputTree = await captureInputs(page, mode, `datepicker-${direction}`);
      } finally { await page.close(); }
    }
    results.push({ family: 'datepicker', state: `open-${direction}-month`, ...sides,
      matches: sides.reference.before === sides.astylar.before && sides.reference.after === sides.astylar.after &&
        sides.reference.errors.length === 0 && sides.astylar.errors.length === 0 });
  }
  const report = { browser: browser.version(), viewport: { width: 1440, height: 900 }, profile: 'light',
    scope: 'Supplemental real-pointer/keyboard picker commit and navigation checks; not full parity acceptance', results };
  writeFileSync(`${artifactDirectory}/latest-report.json`, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
  if (results.some((entry) => !entry.matches)) process.exitCode = 1;
} finally {
  await browser.close();
}

async function settle(page) {
  await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled());
}

async function captureInputs(page, mode, key) {
  const tree = mode === 'reference'
    ? await page.evaluate(captureBrowserInputTree, { styleProperties: Object.values(propertyGroups).flat() })
    : await page.evaluate(async () => {
      await window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled();
      return window.__ASTYLAR_MATERIAL_BENCHMARK__.measure([]).inputTree;
    });
  assert.ok(tree.nodes.length > 0 && tree.errors.length === 0, `Incomplete ${mode} input tree for ${key}`);
  const contents = JSON.stringify(tree);
  const file = `${artifactDirectory}/${key}-${mode}-input-tree.json`;
  writeFileSync(file, contents);
  return { file, sha256: createHash('sha256').update(contents).digest('hex') };
}

async function clickCandidate(page, id) {
  const measurement = await page.evaluate((id) => window.__ASTYLAR_MATERIAL_BENCHMARK__.measure([id], false), id);
  const bounds = measurement.elements[id]?.borderBox;
  const canvas = await page.locator('canvas').boundingBox();
  assert.ok(bounds && canvas, `Missing click geometry for ${id}`);
  // Projected output is used only to target a real diagnostic pointer action.
  // It is never fed into authored layout.
  await page.mouse.click(canvas.x + bounds.left + bounds.width / 2, canvas.y + bounds.top + bounds.height / 2);
  await settle(page);
}
