import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';
import { captureBrowserInputTree } from '../tests/material-parity/input-tree-evidence.mjs';
import { propertyGroups } from '../tests/material-parity/input-equivalence-policy.mjs';
import { openSupplementalCapture, parseSupplementalCaptureArguments } from '../tests/material-parity/supplemental-capture-evidence.mjs';

// Visibility is needed to distinguish a shown tooltip class from visible text.
// Keep it in this diagnostic capture, not in the frozen comparison harness.
export const paginatorNavigationStyleProperties = Object.freeze([...Object.values(propertyGroups).flat(), 'visibility']);

// Each side receives this identical sequence of real input. Expected page
// indices are assertions, never injected state or a replacement for observations.
export function paginatorNavigationPlan() {
  return [
    ['initial', 'inspect', null, 0],
    ['previous-hover-disabled', 'move', 'previous', 0],
    ['previous-press-disabled', 'down', 'previous', 0],
    ['previous-release-disabled', 'up', 'previous', 0],
    ['leave-first', 'leave', null, 0],
    ['next-once', 'click', 'next', 1],
    ['previous-hover', 'move', 'previous', 1],
    ['previous-press', 'down', 'previous', 1],
    ['previous-release', 'up', 'previous', 0],
    ['leave-returned-first', 'leave', null, 0],
    ...Array.from({ length: 9 }, (_, i) => [`next-step-${i + 1}`, 'click', 'next', i + 1]),
    ['next-hover-disabled', 'move', 'next', 9],
    ['next-press-disabled', 'down', 'next', 9],
    ['next-release-disabled', 'up', 'next', 9],
    ['leave-last', 'leave', null, 9],
    ['previous-from-last', 'click', 'previous', 8],
    ['previous-space-held', 'space-down', 'previous', 8],
    ['previous-space-released', 'space-up', 'previous', 7],
  ].map(([state, action, target, expectedPageIndex]) => ({ state, action, target, expectedPageIndex }));
}

export function comparePaginatorNavigation(entry) {
  const expected = entry.expectedPageIndex;
  const checks = {};
  for (const side of ['reference', 'astylar']) {
    const sample = entry[side];
    checks[`${side}Range`] = sample?.range === `${expected * 10 + 1} – ${expected * 10 + 10} of 100`;
    checks[`${side}PreviousUnavailable`] = (sample?.previousDisabled === true || sample?.previousAriaDisabled === 'true') === (expected === 0);
    checks[`${side}NextUnavailable`] = (sample?.nextDisabled === true || sample?.nextAriaDisabled === 'true') === (expected === 9);
  }
  checks.candidateState = entry.astylar?.pageIndex === expected;
  checks.tooltipPresence = JSON.stringify(entry.reference?.visibleTooltips) === JSON.stringify(entry.astylar?.visibleTooltips);
  checks.nativeDisabledInputs = entry.reference?.previousDisabled === entry.astylar?.previousDisabled &&
    entry.reference?.nextDisabled === entry.astylar?.nextDisabled;
  checks.focusNavigation = entry.reference?.activeNavigation === entry.astylar?.activeNavigation;
  return checks;
}

async function run() {
  const options = parseSupplementalCaptureArguments(process.argv.slice(2));
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const properties = paginatorNavigationStyleProperties, results = [];
  const viewport = { width: 1440, height: 1000 }, profiles = ['light', 'dark'];
  const plan = paginatorNavigationPlan();
  try {
    const evidence = openSupplementalCapture({ options, browser,
      script: 'scripts/audit-material-paginator-navigation.mjs', styleProperties: properties });
    for (const profile of profiles) for (const dpr of [1, 2]) {
      const sequence = plan.map(step => ({ family: 'paginator', profile, deviceScaleFactor: dpr, ...step }));
      for (const mode of ['reference', 'astylar']) {
        const page = await browser.newPage({ viewport, deviceScaleFactor: dpr });
        const finishRuntime = evidence.observe(page);
        try {
          await page.addInitScript(() => {
            window.__paginatorAuditEvents = [];
            for (const type of ['pointermove', 'pointerdown', 'pointerup', 'click', 'keydown', 'keyup', 'focusin', 'focusout']) {
              document.addEventListener(type, event => {
                const target = event.target;
                window.__paginatorAuditEvents.push({ type, trusted: event.isTrusted, key: event.key ?? null,
                  id: target.id ?? '', tag: target.tagName ?? '', label: target.getAttribute?.('aria-label') ?? null,
                  astylarId: target.getAttribute?.('data-astylar-id') ?? null,
                  clientX: event.clientX ?? null, clientY: event.clientY ?? null });
              }, true);
            }
          });
          await page.goto(`${options.baseUrl}/${mode}/paginator?benchmark=1&profile=${profile}&interaction=audit-paginator-navigation`);
          await page.locator('.frame').waitFor();
          if (mode === 'astylar') await page.waitForFunction(() => !!window.__ASTYLAR_MATERIAL_BENCHMARK__);
          await settle(page, mode);
          let pointer = { x: 0, y: 0 };
          for (const entry of sequence) {
            let targetBox = null;
            if (['move', 'click'].includes(entry.action)) {
              targetBox = await navigationBox(page, mode, entry.target);
              assert.ok(targetBox && targetBox.width > 0 && targetBox.height > 0, `Missing ${mode}/${entry.target}`);
              pointer = { x: targetBox.x + targetBox.width / 2, y: targetBox.y + targetBox.height / 2 };
              await page.mouse.move(pointer.x, pointer.y);
              if (entry.action === 'click') { await page.mouse.down(); await page.mouse.up(); }
            } else if (entry.action === 'down') await page.mouse.down();
            else if (entry.action === 'up') await page.mouse.up();
            else if (entry.action === 'space-down') await page.keyboard.down('Space');
            else if (entry.action === 'space-up') await page.keyboard.up('Space');
            else if (entry.action === 'leave') { pointer = { x: 1, y: 1 }; await page.mouse.move(1, 1); }
            await settle(page, mode);
            const observation = await page.evaluate(({ mode, pointer }) => {
              const api = window.__ASTYLAR_MATERIAL_BENCHMARK__, ref = mode === 'reference';
              const button = direction => document.querySelector(ref ? `.mat-mdc-paginator-navigation-${direction}` : `[data-astylar-id="paginator-${direction}"]`);
              const active = document.activeElement, hit = document.elementFromPoint(pointer.x, pointer.y);
              const visibleTooltips = [...document.querySelectorAll('.mat-mdc-tooltip-surface')]
                .filter(n => n.parentElement.classList.contains('mat-mdc-tooltip-show')).map(n => n.textContent.trim());
              return { pageIndex: ref ? null : api.state().pageIndex,
                range: ref ? document.querySelector('.mat-mdc-paginator-range-label')?.textContent.trim() : null,
                previousDisabled: button('previous')?.disabled ?? null, nextDisabled: button('next')?.disabled ?? null,
                previousAriaDisabled: button('previous')?.getAttribute('aria-disabled') ?? null,
                nextAriaDisabled: button('next')?.getAttribute('aria-disabled') ?? null,
                previousTabIndex: button('previous')?.tabIndex ?? null, nextTabIndex: button('next')?.tabIndex ?? null,
                activeNavigation: active === button('previous') ? 'previous' : active === button('next') ? 'next' : null,
                active: { id: active?.id ?? '', label: active?.getAttribute('aria-label') ?? null,
                  astylarId: active?.getAttribute('data-astylar-id') ?? null, tag: active?.tagName ?? '' },
                hoveredElement: { id: hit?.id ?? '', tag: hit?.tagName ?? '', cursor: hit ? getComputedStyle(hit).cursor : null },
                visibleTooltips: ref ? visibleTooltips : null,
                events: structuredClone(window.__paginatorAuditEvents) };
            }, { mode, pointer });
            const tree = mode === 'reference' ? await page.evaluate(captureBrowserInputTree, { styleProperties: properties })
              : await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.measure([]).inputTree);
            assert.ok(tree.nodes.length && tree.errors.length === 0, `Incomplete ${mode}/${entry.state} input tree`);
            if (mode === 'astylar') {
              const nodes = id => tree.nodes.filter(n => n.authored?.id === id);
              for (const id of ['paginator-range', 'paginator-previous', 'paginator-next']) assert.equal(nodes(id).length, 1);
              observation.range = nodes('paginator-range')[0].authored.textContent;
              observation.authoredPreviousDisabled = nodes('paginator-previous')[0].authored.disabled;
              observation.authoredNextDisabled = nodes('paginator-next')[0].authored.disabled;
              observation.visibleTooltips = tree.nodes.filter(n => n.authored?.role === 'tooltip').map(n => n.authored.textContent ?? n.authored.value ?? '');
            }
            const stem = `${evidence.directory}/${profile}-dpr${dpr}-${mode}-${entry.state}`;
            const bytes = Buffer.from(JSON.stringify(tree)), screenshot = await page.screenshot({ animations: 'disabled' });
            writeFileSync(`${stem}-input-tree.json`, bytes, { flag: 'wx' });
            writeFileSync(`${stem}.png`, screenshot, { flag: 'wx' });
            entry[mode] = { ...observation, targetBox, pointer: { ...pointer },
              inputTree: { file: `${stem}-input-tree.json`, sha256: digest(bytes) },
              screenshot: { file: `${stem}.png`, sha256: digest(screenshot) } };
          }
          const runtime = await finishRuntime();
          for (const entry of sequence) entry[mode].runtime = runtime;
        } finally { await page.close(); }
      }
      for (const entry of sequence) entry.checks = comparePaginatorNavigation(entry);
      results.push(...sequence);
      console.log(JSON.stringify({ profile, dpr, samples: sequence.length,
        failures: sequence.filter(e => Object.values(e.checks).some(v => !v)).map(e => ({ state: e.state,
          checks: e.checks, referenceRange: e.reference.range, candidateRange: e.astylar.range,
          referenceTooltip: e.reference.visibleTooltips, candidateTooltip: e.astylar.visibleTooltips })) }));
    }
    const report = { schemaVersion: 1, browser: browser.version(), capture: evidence.capture,
      viewport, profiles, plan, settleDelayMs: 250,
      scope: 'Read-only real pointer and Space navigation through first/last page boundaries, both navigation tooltips and disabled controls. Input/state evidence, not whole-element or final-raster equivalence.', results };
    writeFileSync(`${evidence.directory}/latest-report.json`, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
    if (results.some(e => Object.values(e.checks).some(v => !v))) process.exitCode = 1;
  } finally { await browser.close(); }
}

const digest = bytes => createHash('sha256').update(bytes).digest('hex');
async function settle(page, mode) {
  if (mode === 'astylar') await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled());
  await page.evaluate(async () => { await document.fonts.ready; await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); });
  await page.waitForTimeout(250);
}
async function navigationBox(page, mode, direction) {
  if (mode === 'reference') return page.locator(`.mat-mdc-paginator-navigation-${direction}`).boundingBox();
  const id = `paginator-${direction}`;
  const measurement = await page.evaluate(id => window.__ASTYLAR_MATERIAL_BENCHMARK__.measure([id], false), id);
  const box = measurement.elements[id]?.borderBox, canvas = await page.locator('canvas').boundingBox();
  // Projected geometry is used only to deliver the input, never to adjust layout.
  return box && canvas ? { x: canvas.x + box.left, y: canvas.y + box.top, width: box.width, height: box.height } : null;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await run();
