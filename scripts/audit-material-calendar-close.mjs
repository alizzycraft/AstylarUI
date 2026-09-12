import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { captureBrowserInputTree } from '../tests/material-parity/input-tree-evidence.mjs';
import { propertyGroups } from '../tests/material-parity/input-equivalence-policy.mjs';
import { openSupplementalCapture, parseSupplementalCaptureArguments } from '../tests/material-parity/supplemental-capture-evidence.mjs';

// Read-only interaction evidence against the frozen served application. No
// focus(), injected controls, fixture updates, or candidate coordinate repairs.
const options = parseSupplementalCaptureArguments(process.argv.slice(2));
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const properties = Object.values(propertyGroups).flat();
const results = [];
try {
  const evidence = openSupplementalCapture({ options, browser,
    script: 'scripts/audit-material-calendar-close.mjs', styleProperties: properties });
  for (const dpr of [1, 2]) for (const view of ['month', 'multi-year']) {
    const entry = { family: 'datepicker', view, deviceScaleFactor: dpr, sides: {} };
    for (const mode of ['reference', 'astylar']) {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: dpr });
      const finishRuntime = evidence.observe(page);
      const samples = [];
      try {
        await page.addInitScript(() => {
          window.__calendarCloseAuditEvents = [];
          for (const type of ['focusin', 'focusout', 'keydown', 'click']) document.addEventListener(type, event => {
            const target = event.target;
            window.__calendarCloseAuditEvents.push({ type, trusted: event.isTrusted, key: event.key ?? null,
              id: target.id ?? '', tag: target.tagName ?? '', text: target.textContent?.trim() ?? '',
              label: target.getAttribute?.('aria-label') ?? null,
              close: target.classList?.contains('mat-datepicker-close-button') ?? false });
          }, true);
        });
        await page.goto(`${options.baseUrl}/${mode}/datepicker?benchmark=1&profile=light&interaction=audit-calendar-close`);
        await page.locator('.frame').waitFor();
        if (mode === 'astylar') await page.waitForFunction(() => !!window.__ASTYLAR_MATERIAL_BENCHMARK__);
        await settle(page, mode);
        if (mode === 'reference') {
          await page.locator('#datepicker-primary mat-datepicker-toggle button').click();
          await page.locator('.mat-datepicker-content-animating').waitFor({ state: 'hidden' });
          if (view === 'multi-year') await page.locator('.mat-calendar-period-button').click();
          await page.locator(view === 'month' ? 'mat-month-view' : 'mat-multi-year-view').waitFor();
        } else {
          await clickCandidate(page, 'datepicker-icon');
          if (view === 'multi-year') await clickCandidate(page, 'datepicker-month');
        }
        for (const [state, key] of [['opened', null], ['tab-close', 'Tab'], ['blur-close', 'Shift+Tab'],
          ['refocus-close', 'Tab'], ['activate-close', 'Enter']]) {
          if (key) await page.keyboard.press(key);
          if (mode === 'reference' && state === 'activate-close') {
            await page.locator('.mat-datepicker-content').waitFor({ state: 'hidden' });
          }
          await settle(page, mode);
          const observation = await page.evaluate((mode) => {
            const active = document.activeElement;
            const close = document.querySelector('.mat-datepicker-close-button');
            const style = close && getComputedStyle(close);
            const identify = node => node && ({ tag: node.tagName.toLowerCase(), id: node.id,
              text: node.textContent.trim(), label: node.getAttribute('aria-label'), class: node.className });
            const controls = [...document.querySelectorAll('button,input,[role="button"]')].map(identify);
            return { open: mode === 'reference' ? !!document.querySelector('.mat-datepicker-content')
              : window.__ASTYLAR_MATERIAL_BENCHMARK__.state().open,
              active: identify(active), activeIsClose: active === close,
              openerFocused: mode === 'reference' ? active === document.querySelector('#datepicker-primary mat-datepicker-toggle button')
                : active.id.endsWith('-datepicker-icon'),
              close: close && { ...identify(close), clip: style.clip, clipPath: style.clipPath,
                visibility: style.visibility, display: style.display, opacity: style.opacity,
                position: style.position, top: style.top, left: style.left,
                box: close.getBoundingClientRect().toJSON() },
              controls, events: structuredClone(window.__calendarCloseAuditEvents) };
          }, mode);
          const tree = mode === 'reference'
            ? await page.evaluate(captureBrowserInputTree, { styleProperties: properties })
            : await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.measure([]).inputTree);
          assert.ok(tree.nodes.length && tree.errors.length === 0, `Incomplete ${mode}/${view}/${state} input tree`);
          const stem = `${evidence.directory}/${view}-dpr${dpr}-${mode}-${state}`;
          const bytes = Buffer.from(JSON.stringify(tree));
          writeFileSync(`${stem}-input-tree.json`, bytes, { flag: 'wx' });
          const screenshot = await page.screenshot({ animations: 'disabled' });
          writeFileSync(`${stem}.png`, screenshot, { flag: 'wx' });
          samples.push({ state, key, ...observation,
            inputTree: { file: `${stem}-input-tree.json`, sha256: digest(bytes) },
            screenshot: { file: `${stem}.png`, sha256: digest(screenshot) } });
        }
        entry.sides[mode] = { samples, runtime: await finishRuntime() };
      } finally { await page.close(); }
    }
    results.push(entry);
    console.log(JSON.stringify({ view, dpr, reference: entry.sides.reference.samples.map(s =>
      ({ state: s.state, open: s.open, active: s.active.text || s.active.label, clip: s.close?.clip, openerFocused: s.openerFocused })),
      astylar: entry.sides.astylar.samples.map(s => ({ state: s.state, open: s.open, active: s.active.id, close: s.close })) }));
  }
  const report = { schemaVersion: 1, browser: browser.version(), capture: evidence.capture,
    viewport: { width: 1440, height: 900 }, profile: 'light',
    scope: 'Real calendar focus-reveal, blur and keyboard-close actions in both views at DPR 1 and 2. Diagnostic unequal-input evidence, not parity acceptance.', results };
  writeFileSync(`${evidence.directory}/latest-report.json`, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  // A missing candidate close control is an honest comparison failure.
  if (results.some(r => r.sides.astylar.samples[1].activeIsClose !== true ||
    r.sides.astylar.samples.at(-1).open !== false)) process.exitCode = 1;
} finally { await browser.close(); }

function digest(bytes) { return createHash('sha256').update(bytes).digest('hex'); }
async function settle(page, mode) {
  if (mode === 'astylar') await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled());
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}
async function clickCandidate(page, id) {
  const measurement = await page.evaluate(id => window.__ASTYLAR_MATERIAL_BENCHMARK__.measure([id], false), id);
  const box = measurement.elements[id]?.borderBox, canvas = await page.locator('canvas').boundingBox();
  assert.ok(box && canvas, `Missing pointer target ${id}`);
  // Use projected geometry only to deliver a real pointer, never as layout input.
  await page.mouse.click(canvas.x + box.left + box.width / 2, canvas.y + box.top + box.height / 2);
  await settle(page, 'astylar');
}
