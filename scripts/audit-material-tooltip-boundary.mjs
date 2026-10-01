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
const results = [], viewports = [{ width: 900, height: 1000 }, { width: 900, height: 240 }];
const cohorts = ['ordinary'];
const actions = ['initial', 'hover', 'wheel'];
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
try {
  const evidence = openSupplementalCapture({ options, browser,
    script: 'scripts/audit-material-tooltip-boundary.mjs', styleProperties: properties });
  for (const dpr of [1, 2]) for (const viewport of viewports) for (const cohort of cohorts) {
    const sequence = actions.map(action => ({ family: 'tooltip', cohort, viewport, deviceScaleFactor: dpr, action }));
    for (const mode of ['reference', 'astylar']) {
      const page = await browser.newPage({ viewport, deviceScaleFactor: dpr });
      const finishRuntime = evidence.observe(page);
      try {
        await page.addInitScript(() => {
          window.__tooltipAuditEvents = [];
          for (const type of ['pointermove', 'pointerover', 'pointerout', 'pointerdown', 'pointerup', 'click', 'focusin', 'focusout', 'wheel']) {
            document.addEventListener(type, event => {
              const target = event.target;
              window.__tooltipAuditEvents.push({ type, trusted: event.isTrusted,
                id: target.id ?? '', tag: target.tagName ?? '', astylarId: target.getAttribute?.('data-astylar-id') ?? null,
                clientX: event.clientX ?? null, clientY: event.clientY ?? null,
                deltaY: event.deltaY ?? null });
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
          if (entry.action === 'wheel') await page.mouse.wheel(0, 100);
          
          
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
            const measurement = mode === 'astylar' ? api.measure(['tooltip-popup'], false) : null;
            return { referencePopup: describe(popup), referenceShown: !!popup?.parentElement.classList.contains('mat-mdc-tooltip-show'),
              describedBy: describedBy ?? null, description: describe(description || null),
              candidateOpen: mode === 'astylar' ? api.state().open : null,
              candidatePopupBox: measurement?.elements['tooltip-popup']?.borderBox ?? null,
              candidatePaintDepth: measurement?.elements['tooltip-popup']?.paintDepth ?? null,
              candidateCamera: measurement?.diagnostics?.camera ?? null,
              scrollY, scrollHeight: document.documentElement.scrollHeight,
              currentTriggerBox: trigger?.getBoundingClientRect().toJSON() ?? null,
              canvasBox: document.querySelector('canvas')?.getBoundingClientRect().toJSON() ?? null,
              activeId: document.activeElement?.id ?? '', events: structuredClone(window.__tooltipAuditEvents) };
          }, mode);
          const tree = mode === 'reference'
            ? await page.evaluate(captureBrowserInputTree, { styleProperties: properties })
            : await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.measure([]).inputTree);
          assert.ok(tree.nodes.length && tree.errors.length === 0, `Incomplete ${mode}/${cohort}/${entry.action}`);
          const popupNodes = tree.nodes.filter(n => mode === 'reference'
            ? String(n.attributes?.class ?? '').split(/\s+/).includes('mat-mdc-tooltip-surface')
            : n.authored?.id === 'tooltip-popup');
          const stem = `${evidence.directory}/${cohort}-h${viewport.height}-dpr${dpr}-${mode}-${entry.action}`;
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
    for (const entry of sequence) {
      entry.presenceMatches = entry.reference.popupCount === entry.astylar.popupCount;
      const r = entry.reference.referencePopup?.box, a = entry.astylar.candidatePopupBox;
      entry.popupTopDelta = r && a ? a.top + entry.astylar.canvasBox.y - r.y : null;
    }
    results.push(...sequence);
    console.log(JSON.stringify({ cohort, dpr, viewport, states: sequence.map(e => ({ action: e.action,
      reference: e.reference.popupCount, referenceShown: e.reference.referenceShown,
      candidate: e.astylar.popupCount, candidateOpen: e.astylar.candidateOpen, matches: e.presenceMatches })) }));
  }
  const report = { schemaVersion: 1, browser: browser.version(), capture: evidence.capture,
    viewports, profile: 'light', cohorts, actions, settleDelayMs: 250,
    scope: 'Ordinary hover and real wheel at tall/short viewport boundaries. Placement and scroll diagnostic; authored placement strategies differ. Not equal-input renderer or full raster acceptance.', results };
  writeFileSync(`${evidence.directory}/latest-report.json`, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  if (results.some(e => !e.presenceMatches || (e.popupTopDelta !== null && Math.abs(e.popupTopDelta) > 1))) process.exitCode = 1;
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
