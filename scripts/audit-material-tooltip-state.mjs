import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { captureBrowserInputTree } from '../tests/material-parity/input-tree-evidence.mjs';
import { propertyGroups } from '../tests/material-parity/input-equivalence-policy.mjs';
import { openSupplementalCapture, parseSupplementalCaptureArguments } from '../tests/material-parity/supplemental-capture-evidence.mjs';

// Observe the unchanged frozen application. Query flags are separate input
// cohorts, never a means of making one side adopt the other's state.
const options = parseSupplementalCaptureArguments(process.argv.slice(2));
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const properties = Object.values(propertyGroups).flat();
const results = [], viewport = { width: 1440, height: 1000 };
const cohorts = ['benchmark-open', 'benchmark-hover', 'ordinary'];
const actions = ['initial', 'hover', 'press', 'release', 'leave'];
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
try {
  const evidence = openSupplementalCapture({ options, browser,
    script: 'scripts/audit-material-tooltip-state.mjs', styleProperties: properties });
  for (const dpr of [1, 2]) for (const cohort of cohorts) {
    const sequence = actions.map(action => ({ family: 'tooltip', cohort, deviceScaleFactor: dpr, action }));
    for (const mode of ['reference', 'astylar']) {
      const page = await browser.newPage({ viewport, deviceScaleFactor: dpr });
      const finishRuntime = evidence.observe(page);
      try {
        await page.addInitScript(() => {
          window.__tooltipAuditEvents = [];
          for (const type of ['pointermove', 'pointerover', 'pointerout', 'pointerdown', 'pointerup', 'click', 'focusin', 'focusout']) {
            document.addEventListener(type, event => {
              const target = event.target;
              window.__tooltipAuditEvents.push({ type, trusted: event.isTrusted,
                id: target.id ?? '', tag: target.tagName ?? '', astylarId: target.getAttribute?.('data-astylar-id') ?? null,
                clientX: event.clientX ?? null, clientY: event.clientY ?? null });
            }, true);
          }
        });
        const query = cohort === 'ordinary' ? 'profile=light' : `benchmark=1&profile=light&interaction=${cohort.slice(10)}`;
        await page.goto(`${options.baseUrl}/${mode}/tooltip?${query}`);
        await page.locator('.frame').waitFor();
        if (mode === 'astylar') await page.waitForFunction(() => !!window.__ASTYLAR_MATERIAL_BENCHMARK__);
        await settle(page, mode);
        const box = mode === 'reference' ? await page.locator('#tooltip-primary').boundingBox() : await candidateBox(page);
        assert.ok(box && box.width > 0 && box.height > 0, `Missing ${mode} trigger`);
        for (const entry of sequence) {
          if (entry.action === 'hover') await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
          if (entry.action === 'press') await page.mouse.down();
          if (entry.action === 'release') await page.mouse.up();
          if (entry.action === 'leave') await page.mouse.move(1, 1);
          await settle(page, mode);
          const observation = await page.evaluate(mode => {
            const api = window.__ASTYLAR_MATERIAL_BENCHMARK__;
            const popup = document.querySelector('.mat-mdc-tooltip-surface');
            const trigger = document.querySelector('#tooltip-primary');
            const describedBy = trigger?.getAttribute('aria-describedby');
            const description = describedBy && document.getElementById(describedBy);
            const describe = node => node && ({ id: node.id, text: node.textContent.trim(),
              class: node.className, style: { display: getComputedStyle(node).display,
                visibility: getComputedStyle(node).visibility, opacity: getComputedStyle(node).opacity },
              box: node.getBoundingClientRect().toJSON() });
            return { referencePopup: describe(popup), referenceShown: !!popup?.parentElement.classList.contains('mat-mdc-tooltip-show'),
              describedBy: describedBy ?? null, description: describe(description || null),
              candidateOpen: mode === 'astylar' ? api.state().open : null,
              candidatePopupBox: mode === 'astylar' ? api.measure(['tooltip-popup'], false).elements['tooltip-popup']?.borderBox ?? null : null,
              activeId: document.activeElement?.id ?? '', events: structuredClone(window.__tooltipAuditEvents) };
          }, mode);
          const tree = mode === 'reference'
            ? await page.evaluate(captureBrowserInputTree, { styleProperties: properties })
            : await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.measure([]).inputTree);
          assert.ok(tree.nodes.length && tree.errors.length === 0, `Incomplete ${mode}/${cohort}/${entry.action}`);
          const popupNodes = tree.nodes.filter(n => mode === 'reference'
            ? String(n.attributes?.class ?? '').split(/\s+/).includes('mat-mdc-tooltip-surface')
            : n.authored?.id === 'tooltip-popup');
          const stem = `${evidence.directory}/${cohort}-dpr${dpr}-${mode}-${entry.action}`;
          const bytes = Buffer.from(JSON.stringify(tree)), screenshot = await page.screenshot({ animations: 'disabled' });
          writeFileSync(`${stem}-input-tree.json`, bytes, { flag: 'wx' });
          writeFileSync(`${stem}.png`, screenshot, { flag: 'wx' });
          entry[mode] = { ...observation, triggerBox: box, popupCount: popupNodes.length,
            retainedPopupCount: popupNodes.filter(n => n.retainedText?.source === 'core-text-registry').length,
            inputTree: { file: `${stem}-input-tree.json`, sha256: digest(bytes) },
            screenshot: { file: `${stem}.png`, sha256: digest(screenshot) } };
        }
        const runtime = await finishRuntime();
        for (const entry of sequence) entry[mode].runtime = runtime;
      } finally { await page.close(); }
    }
    for (const entry of sequence) entry.presenceMatches = entry.reference.popupCount === entry.astylar.popupCount;
    results.push(...sequence);
    console.log(JSON.stringify({ cohort, dpr, states: sequence.map(e => ({ action: e.action,
      reference: e.reference.popupCount, referenceShown: e.reference.referenceShown,
      candidate: e.astylar.popupCount, candidateOpen: e.astylar.candidateOpen, matches: e.presenceMatches })) }));
  }
  const report = { schemaVersion: 1, browser: browser.version(), capture: evidence.capture,
    viewport, profile: 'light', cohorts, actions, settleDelayMs: 250,
    scope: 'Real pointer action boundaries under separate benchmark-open, benchmark-hover and ordinary inputs. Presence and source-state diagnostic only; not typography, coordinate, raster or semantic equivalence acceptance.', results };
  writeFileSync(`${evidence.directory}/latest-report.json`, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  if (results.some(e => !e.presenceMatches)) process.exitCode = 1;
} finally { await browser.close(); }

async function settle(page, mode) {
  if (mode === 'astylar') await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled());
  await page.evaluate(async () => { await document.fonts.ready; await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); });
  // Observe post-timer states consistently, including ordinary Material's
  // 150ms animation. This is a declared sampling boundary, not fixture mutation.
  await page.waitForTimeout(250);
}
async function candidateBox(page) {
  const measurement = await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.measure(['tooltip-primary'], false));
  const local = measurement.elements['tooltip-primary']?.borderBox, canvas = await page.locator('canvas').boundingBox();
  return local && canvas ? { x: canvas.x + local.left, y: canvas.y + local.top, width: local.width, height: local.height } : null;
}
