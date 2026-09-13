import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { captureControlLineBox } from '../tests/material-parity/control-line-box-evidence.mjs';
import { captureBrowserInputTree } from '../tests/material-parity/input-tree-evidence.mjs';
import { collectFullTreeInventory, collectControlTypographyEvidence } from '../tests/material-parity/input-equivalence-audit.mjs';
import { propertyGroups } from '../tests/material-parity/input-equivalence-policy.mjs';
import { openSupplementalCapture, parseSupplementalCaptureArguments } from '../tests/material-parity/supplemental-capture-evidence.mjs';

// Reference-only supplement to checkpoint-bound candidate paint. No fixture
// edits or style/state values derived from candidate output. The separate reader
// must verify this evidence before the consolidated audit can use a metric.
const options = parseSupplementalCaptureArguments(process.argv.slice(2));
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const properties = Object.values(propertyGroups).flat();
const records = readdirSync(options.checkpoint).filter(name => /^[a-f0-9]{64}\.json$/.test(name)).map(name => {
  const file = path.join(options.checkpoint, name), record = JSON.parse(readFileSync(file));
  assert.equal(digest(JSON.stringify(record.result)), record.sha256, `Changed result: ${name}`);
  assert.equal(digest(record.key), name.slice(0, -5), `Changed identity: ${name}`);
  return { ...record, file: path.relative(process.cwd(), file).replaceAll('\\', '/') };
}).filter(record => JSON.parse(record.key).kind === 'interaction');
const cases = records.map(record => ({ ...record.result, kind: 'interaction' }));
const inventory = collectFullTreeInventory(cases), control = collectControlTypographyEvidence(cases, inventory);
assert.deepEqual(inventory.errors, []);
const targets = control.comparisons.filter(entry => entry.properties.lineHeight.reference === 'normal');
assert.ok(targets.length, 'No interactive normal-line-height targets');
const themes = {
  light: { mode: 'light', primary: '#6750a4', tertiary: '#7d5260', surface: '#fffbfe', error: '#b3261e', density: 0, cornerScale: 1, typographyScale: 1 },
  dark: { mode: 'dark', primary: '#d0bcff', tertiary: '#efb8c8', surface: '#1c1b1f', error: '#f2b8b5', density: 0, cornerScale: 1, typographyScale: 1 },
  contrast: { mode: 'light', primary: '#000000', tertiary: '#203864', surface: '#ffffff', error: '#8b0000', density: -5, cornerScale: .75, typographyScale: .9 },
  custom: { mode: 'light', primary: '#006a6a', tertiary: '#a43c42', surface: '#f4fbfa', error: '#ba1a1a', density: -2, cornerScale: 1.5, typographyScale: 1.15 },
};
const browser = await chromium.launch({ channel: 'chrome', headless: true }), results = [];
try {
  const evidence = openSupplementalCapture({ options, browser, script: 'scripts/audit-material-control-line-boxes.mjs', styleProperties: properties });
  const measurementSources = ['tests/material-parity/control-line-box-evidence.mjs', 'tests/material-parity/input-equivalence-audit.mjs',
    'tests/material-parity/input-equivalence-policy.mjs'].map(file => {
    const bytes = readFileSync(file), sha256 = digest(bytes), snapshot = `${evidence.directory}/source-${sha256}.txt`;
    writeFileSync(snapshot, bytes, { flag: 'wx' });
    return { file, sha256, snapshot };
  });
  for (const record of records.sort((a, b) => a.key.localeCompare(b.key))) {
    const entry = record.result, key = `interaction:${entry.family}@${entry.profile}/${entry.viewport.id}/${entry.state}`;
    const pending = targets.filter(target => target.case === key);
    if (!pending.length) continue;
    const context = await browser.newContext({ viewport: { width: entry.viewport.width, height: entry.viewport.height },
      deviceScaleFactor: entry.viewport.deviceScaleFactor, colorScheme: entry.profile === 'dark' ? 'dark' : 'light', reducedMotion: 'reduce' });
    const page = await context.newPage(), finishRuntime = evidence.observe(page);
    try {
      await page.addInitScript(() => {
        window.__lineBoxEvents = [];
        for (const type of ['pointerdown', 'pointerup', 'click', 'keydown', 'focusin', 'focusout']) document.addEventListener(type,
          event => window.__lineBoxEvents.push({ type, trusted: event.isTrusted, id: event.target.id ?? '',
            tag: event.target.tagName ?? '', key: event.key ?? null }), true);
      });
      await page.goto(`${options.baseUrl}/reference/${entry.family}?benchmark=1&profile=${entry.profile}&interaction=${entry.state}`);
      await page.locator('app-reference .frame').waitFor();
      await command(page, { type: 'showcase:theme', theme: themes[entry.profile] });
      await page.waitForFunction(surface => {
        const frame = document.querySelector('app-reference .frame'), probe = document.createElement('span');
        probe.style.color = surface; document.body.append(probe);
        const expected = getComputedStyle(probe).color; probe.remove();
        return frame && getComputedStyle(frame).backgroundColor === expected;
      }, themes[entry.profile].surface);
      await settle(page);
      for (let cycle = 0; cycle < (entry.state === 'open-dismiss' ? 3 : 1); cycle++) {
        await command(page, { type: 'showcase:benchmark', phase: 'start' });
        await perform(page, entry);
        await command(page, { type: 'showcase:benchmark', phase: entry.state === 'held' ? 'held' : 'settled' });
        await settle(page);
        if (entry.state === 'open-dismiss') { await page.keyboard.press('Escape'); await settle(page); }
      }
      const tree = await page.evaluate(captureBrowserInputTree, { styleProperties: properties });
      assert.deepEqual(tree.errors, []);
      const original = JSON.parse(readFileSync(entry.inputTrees.reference.file));
      assert.equal(digest(readFileSync(entry.inputTrees.reference.file)), entry.inputTrees.reference.sha256);
      const measurements = [];
      for (const target of pending) {
        const captured = original.nodes.find(n => n.key === target.referenceNode);
        let node = tree.nodes.find(n => n.key === target.referenceNode);
        assert.ok(captured && node && captured.type === node.type && captured.ownText === node.ownText, `Changed target: ${key}/${target.element}`);
        const chain = [];
        while (node) {
          chain.unshift({ key: node.key, parent: node.parent, type: node.type, attributes: node.attributes, ownText: node.ownText });
          node = tree.nodes.find(n => n.key === node.parent);
        }
        const measurement = await page.evaluate(captureControlLineBox, { chain, expectedStyle: original.styles[captured.style] });
        measurements.push({ element: target.element, ...measurement,
          checkpointReferenceNode: target.referenceNode, checkpointCandidateNode: target.astylarNode,
          checkpointPaint: target.properties.lineHeight.painted, checkpointTypography: target.properties });
      }
      const stem = `${evidence.directory}/${digest(key)}`;
      const treeBytes = JSON.stringify(tree), screenshot = await page.screenshot({ animations: 'disabled' });
      writeFileSync(`${stem}-reference.json`, treeBytes, { flag: 'wx' });
      writeFileSync(`${stem}.png`, screenshot, { flag: 'wx' });
      const events = await page.evaluate(() => ({ events: window.__lineBoxEvents, activeId: document.activeElement?.id ?? '' }));
      const runtime = await finishRuntime();
      const result = { case: key, family: entry.family, profile: entry.profile, state: entry.state, viewport: entry.viewport,
        checkpointRecord: { file: record.file, sha256: record.sha256 }, checkpointInputTrees: entry.inputTrees,
        inputTree: { file: `${stem}-reference.json`, sha256: digest(treeBytes) }, screenshot: { file: `${stem}.png`, sha256: digest(screenshot) },
        runtime, measurements, ...events };
      const bytes = JSON.stringify(result);
      writeFileSync(`${stem}.json`, bytes, { flag: 'wx' });
      results.push({ case: key, file: `${stem}.json`, sha256: digest(bytes), observations: measurements.length });
      console.log(JSON.stringify({ case: key, observations: measurements.map(m => ({ element: m.element, cssHeight: m.naturalHeight, paint: m.checkpointPaint })) }));
    } finally { await context.close(); }
  }
  assert.equal(results.reduce((sum, item) => sum + item.observations, 0), targets.length);
  writeFileSync(`${evidence.directory}/latest-report.json`, JSON.stringify({ schemaVersion: 1, browser: browser.version(), capture: evidence.capture,
    measurementSources, cases: results.length, observations: targets.length,
    scope: 'All mapped normal-line-height targets in the selected main interaction checkpoint, using the original benchmark action sequence. Reference-only CSS used metrics supplement existing candidate paint. Not full relevant-state coverage, equal inputs, final raster, or automatic attribution; supplemental interaction cohorts remain separate.', results }, null, 2) + '\n', { flag: 'wx' });
} finally { await browser.close(); }

async function command(page, value) {
  await page.waitForFunction(() => typeof window.__MATERIAL_SHOWCASE_COMMAND__ === 'function');
  assert.equal(await page.evaluate(command => window.__MATERIAL_SHOWCASE_COMMAND__(command), value), true);
}
async function settle(page) {
  await page.evaluate(async () => { await document.fonts.ready; await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); });
}
async function perform(page, { family, state, viewport }) {
  assert.ok(['core', 'card', 'button', 'menu', 'bottom-sheet', 'dialog', 'snack-bar', 'tooltip', 'datepicker'].includes(family));
  assert.ok(['focus', 'hover', 'held', 'activate', 'activate-leave', 'activate-twice', 'disabled', 'open', 'open-secondary',
    'open-hover-content', 'open-dismiss', 'open-dismiss-outside', 'open-dismiss-canvas', 'auto-dismiss'].includes(state), `Unsupported state: ${state}`);
  if (state === 'disabled') return;
  const selector = family === 'card' ? '#card-primary button' : family === 'datepicker' ? '#datepicker-primary mat-datepicker-toggle button' : `#${family}-primary`;
  if (state === 'focus') {
    // Match the selected benchmark's explicitly programmatic focus cohort;
    // do not describe it as a trusted keyboard-navigation observation.
    await page.evaluate(id => {
      const host = document.getElementById(id), focusable = 'button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]';
      const target = host?.matches(focusable) ? host : host?.querySelector(focusable);
      if (!(target instanceof HTMLElement)) throw new Error('Missing focus target');
      target.focus();
    }, `${family}-primary`);
    return;
  }
  const box = await page.locator(selector).boundingBox(); assert.ok(box, 'Missing interaction target');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  if (state === 'hover') return;
  await page.mouse.down(); if (state === 'held') return;
  await page.mouse.up();
  if (state === 'auto-dismiss') await page.waitForTimeout(5100);
  if (state === 'activate-leave') await page.mouse.move(1, 1);
  if (state === 'activate-twice') { await settle(page); await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2); }
  if (state === 'open-dismiss-outside') { await settle(page); await page.mouse.click(10, 10); }
  if (state === 'open-dismiss-canvas') { await settle(page); await page.mouse.click(viewport.width * .85, viewport.height * .8); }
  if (state === 'open-secondary') { await settle(page); await page.locator('.mat-calendar-period-button').click(); }
  if (state === 'open-hover-content') {
    await settle(page);
    const selector = { datepicker: '.mat-calendar-body-cell:not(.mat-calendar-body-disabled)', menu: '.mat-mdc-menu-panel button', dialog: 'mat-dialog-container button' }[family];
    assert.ok(selector, 'Missing popup hover target');
    const target = await page.locator(selector).first().boundingBox(); assert.ok(target);
    await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2);
  }
}
