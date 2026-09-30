import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { collectSortFocusStructure, inspectSortTrees } from '../../scripts/audit-material-sort-focus-structure.mjs';
import { fingerprintDirectory } from './run-checkpoint.mjs';

test('sort focus structure replays all authenticated source trees without equating paint substitutes', () => {
  const report = collectSortFocusStructure();
  assert.deepEqual(report, JSON.parse(readFileSync('docs/material-sort-focus-structure.json')));
  assert.deepEqual(report.counts, { observations: 60, referenceBorder: 8, candidateSeparateLine: 8 });
  assert.equal(report.rendererDefectProven, false);
  assert.equal(report.canonicalAttributionChanged, false);
  for (const observation of report.observations) {
    assert.equal(observation.referenceBorderPresent, observation.candidateSeparateLinePresent);
    if (observation.candidateSeparateLinePresent) {
      assert.equal(observation.reference.style.borderBottomWidth, '1px');
      assert.equal(observation.candidate.trigger.borderWidth, '0');
      assert.equal(observation.candidate.line.top, observation.candidate.host.height);
    }
  }
});

test('sort structure proof rejects missing or ambiguous paint ownership', () => {
  const prefix = 'artifacts/material-parity/current-ancestry-audit/interactions/sort/light/desktop-dpr1/focus/';
  const reference = JSON.parse(readFileSync(prefix + 'reference-input-tree.json'));
  const candidate = JSON.parse(readFileSync(prefix + 'astylar-input-tree.json'));
  for (const mutate of [
    tree => tree.nodes.find(n => n.authored?.id === 'sort-focus-line').parent = 'wrong-owner',
    tree => tree.nodes.find(n => n.authored?.id === 'sort-focus-line').resolvedStyle.position = 'static',
    tree => tree.nodes.push(structuredClone(tree.nodes.find(n => n.authored?.id === 'sort-focus-line'))),
    tree => tree.nodes = tree.nodes.filter(n => n.authored?.id !== 'sort-trigger'),
  ]) {
    const changed = structuredClone(candidate); mutate(changed);
    assert.throws(() => inspectSortTrees(reference, changed));
  }
  const changed = structuredClone(reference);
  changed.nodes.push(structuredClone(changed.nodes.find(n => n.attributes?.class?.startsWith('mat-sort-header-container'))));
  assert.throws(() => inspectSortTrees(changed, candidate));
});

test('real Tab and key activation expose the authored sort interaction gap', async () => {
  await withFrozenShowcase(async (browser, baseUrl) => {
    const observations = {};
    for (const mode of ['reference', 'astylar']) {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
      const errors = [];
      page.on('pageerror', error => errors.push(String(error)));
      await page.goto(`${baseUrl}/${mode}/sort?benchmark=1&profile=light`);
      await page.locator('.frame').waitFor();
      if (mode === 'astylar') await page.waitForFunction(() => !!window.__ASTYLAR_MATERIAL_BENCHMARK__);
      await page.evaluate(() => {
        window.__sortKeyboardEvents = [];
        for (const type of ['keydown', 'keyup', 'click']) document.addEventListener(type, event => {
          if (event.target instanceof Element &&
              (event.target.closest('#sort-trigger') || event.target.closest('[data-astylar-id="sort-trigger"]'))) {
            window.__sortKeyboardEvents.push({ type, key: event.key ?? null });
          }
        }, true);
      });
      const steps = [];
      for (const key of ['Tab', 'Enter', 'Space', 'Enter']) {
        await page.keyboard.press(key);
        if (mode === 'astylar') await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled());
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        steps.push(await page.evaluate(mode => ({
          focused: mode === 'reference'
            ? !!document.activeElement?.closest('#sort-trigger')
            : document.activeElement?.getAttribute('data-astylar-id') === 'sort-trigger',
          ariaSort: mode === 'reference' ? document.querySelector('#sort-trigger')?.getAttribute('aria-sort') :
            document.querySelector('[data-astylar-id="sort-trigger"]')?.getAttribute('aria-sort'),
          direction: mode === 'reference' ? window.ng.getComponent(document.querySelector('app-reference')).store.state().sortDirection :
            window.__ASTYLAR_MATERIAL_BENCHMARK__.state().sortDirection,
          open: mode === 'reference' ? window.ng.getComponent(document.querySelector('app-reference')).store.state().open :
            window.__ASTYLAR_MATERIAL_BENCHMARK__.state().open,
        }), mode));
      }
      observations[mode] = {
        steps,
        events: await page.evaluate(() => window.__sortKeyboardEvents),
        appEvents: mode === 'astylar' ? await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.events()) : [],
        errors,
      };
      await page.close();
    }
    assert.equal(browser.version(), '154.0.8037.58');
    assert.deepEqual(observations.reference.steps, [
      { focused: true, ariaSort: 'none', direction: 'asc', open: false },
      { focused: true, ariaSort: 'ascending', direction: 'asc', open: false },
      { focused: true, ariaSort: 'descending', direction: 'desc', open: false },
      { focused: true, ariaSort: 'ascending', direction: 'asc', open: false },
    ]);
    assert.deepEqual(observations.astylar.steps, [
      { focused: true, ariaSort: null, direction: 'asc', open: false },
      { focused: true, ariaSort: null, direction: 'asc', open: false },
      { focused: true, ariaSort: null, direction: 'asc', open: false },
      { focused: true, ariaSort: null, direction: 'asc', open: false },
    ]);
    // Material's sort directive handles keydown itself; neither DOM path emits click.
    assert.equal(observations.reference.events.filter(event => event.type === 'click').length, 0);
    assert.equal(observations.astylar.events.filter(event => event.type === 'click').length, 0);
    assert.deepEqual(observations.reference.events.filter(event => event.type === 'keydown').map(event => event.key),
      ['Enter', ' ', 'Enter']);
    assert.deepEqual(observations.astylar.events.filter(event => event.type === 'keydown').map(event => event.key),
      ['Enter', ' ', 'Enter'], 'keyboard events reach the authored candidate trigger');
    assert.equal(observations.astylar.appEvents.filter(event =>
      event.type === 'keydown' && event.targetId === 'sort-trigger').length, 3,
    'candidate application callback receives all three keys; its event log does not retain key values');
    assert.deepEqual(observations.reference.errors, []);
    assert.deepEqual(observations.astylar.errors, []);
  });
});

test('checkbox real Tab and Space distinguishes role authoring from core key delivery', async () => {
  await withFrozenShowcase(async (browser, baseUrl) => {
    const observations = {};
    for (const mode of ['reference', 'astylar']) {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
      const errors = [];
      page.on('pageerror', error => errors.push(String(error)));
      await page.goto(`${baseUrl}/${mode}/checkbox?benchmark=1&profile=light`);
      await page.locator('.frame').waitFor();
      if (mode === 'astylar') await page.waitForFunction(() => !!window.__ASTYLAR_MATERIAL_BENCHMARK__);
      await page.keyboard.press('Tab');
      await page.keyboard.press('Space');
      if (mode === 'astylar') await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled());
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      observations[mode] = await page.evaluate(mode => {
        const target = mode === 'reference' ? document.querySelector('#checkbox-primary-input') :
          document.querySelector('[data-astylar-id="checkbox-primary"]');
        return {
          focused: document.activeElement === target,
          kind: target instanceof HTMLInputElement ? `${target.tagName.toLowerCase()}:${target.type}` :
            `${target.tagName.toLowerCase()}:${target.getAttribute('role')}`,
          checked: target instanceof HTMLInputElement ? target.checked : target.getAttribute('aria-checked'),
          selected: mode === 'reference'
            ? window.ng.getComponent(document.querySelector('app-reference')).store.state().selected
            : window.__ASTYLAR_MATERIAL_BENCHMARK__.state().selected,
          appEvents: mode === 'astylar' ? window.__ASTYLAR_MATERIAL_BENCHMARK__.events() : [],
        };
      }, mode);
      observations[mode].errors = errors;
      await page.close();
    }
    assert.equal(browser.version(), '154.0.8037.58');
    assert.equal(observations.reference.focused, true);
    assert.equal(observations.astylar.focused, true);
    assert.equal(observations.reference.kind, 'input:checkbox');
    assert.equal(observations.astylar.kind, 'div:checkbox');
    assert.equal(observations.reference.checked, false);
    assert.equal(observations.reference.selected, false);
    assert.equal(observations.astylar.checked, 'true');
    assert.equal(observations.astylar.selected, true);
    assert.equal(observations.astylar.appEvents.filter(event =>
      event.type === 'keydown' && event.targetId === 'checkbox-primary').length, 1);
    assert.deepEqual(observations.reference.errors, []);
    assert.deepEqual(observations.astylar.errors, []);
  });
});

async function withFrozenShowcase(run) {
  const browserRoot = path.resolve('examples/material-showcase/dist/material-showcase/browser');
  const checkpoint = JSON.parse(readFileSync('artifacts/material-parity/caret-visible-checkpoint-154/checkpoint/manifest.json'));
  assert.deepEqual(fingerprintDirectory(browserRoot), checkpoint.provenance.browserFiles);
  const server = createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
    const candidate = path.resolve(browserRoot, pathname.replace(/^\/+/, ''));
    const target = candidate.startsWith(browserRoot + path.sep) && path.extname(candidate) && existsSync(candidate)
      ? candidate : path.join(browserRoot, 'index.csr.html');
    const extension = path.extname(target);
    response.writeHead(200, { 'content-type': extension === '.js' ? 'text/javascript' :
      extension === '.css' ? 'text/css' : extension === '.woff2' ? 'font/woff2' : 'text/html' });
    response.end(readFileSync(target));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    await run(browser, `http://127.0.0.1:${server.address().port}`);
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}
