import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright-core';
import { PNG } from 'pngjs';
import { measureTextInkCenter, textCenterOffsetError } from './text-alignment-metrics.mjs';
import { cropRgba } from '../parity/sharpness-metrics.mjs';
import { evaluateFocusedRaster } from './focused-raster-metrics.mjs';
import { collectSortFocusStructure, inspectSortTrees } from '../../scripts/audit-material-sort-focus-structure.mjs';
import { fingerprintDirectory, materialBrowserLaunchOptions, inspectMaterialBrowserLaunch } from './run-checkpoint.mjs';

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

test('radio real Tab and Arrow keys locate the selection-routing boundary', async () => {
  await withFrozenShowcase(async (browser, baseUrl) => {
    const observations = {};
    for (const mode of ['reference', 'astylar']) {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
      const errors = [];
      page.on('pageerror', error => errors.push(String(error)));
      await page.goto(`${baseUrl}/${mode}/radio?benchmark=1&profile=light`);
      await page.locator('.frame').waitFor();
      if (mode === 'astylar') await page.waitForFunction(() => !!window.__ASTYLAR_MATERIAL_BENCHMARK__);
      const steps = [];
      for (const key of ['Tab', 'ArrowLeft', 'ArrowRight']) {
        await page.keyboard.press(key);
        if (mode === 'astylar') await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled());
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        steps.push(await page.evaluate(mode => ({
          focus: mode === 'reference' ? document.activeElement?.value :
            document.activeElement?.getAttribute('data-astylar-id')?.replace('radio-', ''),
          kind: document.activeElement instanceof HTMLInputElement ? 'input:radio' :
            `div:${document.activeElement?.getAttribute('role')}`,
          selected: mode === 'reference'
            ? window.ng.getComponent(document.querySelector('app-reference')).store.state().selected
            : window.__ASTYLAR_MATERIAL_BENCHMARK__.state().selected,
          solo: mode === 'reference' ? document.querySelector('mat-radio-button[value="solo"] input')?.checked :
            document.querySelector('[data-astylar-id="radio-solo"]')?.getAttribute('aria-checked') === 'true',
          team: mode === 'reference' ? document.querySelector('mat-radio-button[value="team"] input')?.checked :
            document.querySelector('[data-astylar-id="radio-team"]')?.getAttribute('aria-checked') === 'true',
        }), mode));
      }
      observations[mode] = {
        steps,
        appEvents: mode === 'astylar' ? await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.events()) : [],
        errors,
      };
      await page.close();
    }
    assert.equal(browser.version(), '154.0.8037.58');
    assert.deepEqual(observations.reference.steps, [
      { focus: 'team', kind: 'input:radio', selected: true, solo: false, team: true },
      { focus: 'solo', kind: 'input:radio', selected: false, solo: true, team: false },
      { focus: 'team', kind: 'input:radio', selected: true, solo: false, team: true },
    ]);
    assert.deepEqual(observations.astylar.steps, [
      { focus: 'team', kind: 'div:radio', selected: true, solo: false, team: true },
      { focus: 'team', kind: 'div:radio', selected: true, solo: false, team: true },
      { focus: 'team', kind: 'div:radio', selected: true, solo: false, team: true },
    ]);
    assert.equal(observations.astylar.appEvents.filter(event =>
      event.type === 'keydown' && event.targetId === 'radio-team').length, 2,
    'both arrow keydowns reached the authored radio option');
    assert.deepEqual(observations.reference.errors, []);
    assert.deepEqual(observations.astylar.errors, []);
  });
});

test('composite controls expose their Tab and Space activation boundary', async () => {
  await withFrozenShowcase(async (browser, baseUrl) => {
    const observations = {};
    for (const family of ['chips', 'slide-toggle', 'expansion']) {
      observations[family] = {};
      for (const mode of ['reference', 'astylar']) {
        const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
        const errors = [];
        page.on('pageerror', error => errors.push(String(error)));
        await page.goto(`${baseUrl}/${mode}/${family}?benchmark=1&profile=light`);
        await page.locator('.frame').waitFor();
        if (mode === 'astylar') await page.waitForFunction(() => !!window.__ASTYLAR_MATERIAL_BENCHMARK__);
        const steps = [];
        for (const key of family === 'expansion' ? ['Tab', 'Space', 'Enter'] : ['Tab', 'Space']) {
          await page.keyboard.press(key);
          if (mode === 'astylar') await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled());
          await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
          steps.push(await page.evaluate(({ mode, family }) => {
            const state = mode === 'reference'
              ? window.ng.getComponent(document.querySelector('app-reference')).store.state()
              : window.__ASTYLAR_MATERIAL_BENCHMARK__.state();
            return {
              kind: `${document.activeElement?.tagName.toLowerCase()}:${document.activeElement?.getAttribute('role')}`,
              value: family === 'chips' ? state.chipSelections : family === 'slide-toggle' ? state.selected : state.open,
              ariaState: document.activeElement?.getAttribute(family === 'chips' ? 'aria-selected' :
                family === 'slide-toggle' ? 'aria-checked' : 'aria-expanded'),
            };
          }, { mode, family }));
        }
        observations[family][mode] = {
          steps,
          appEvents: mode === 'astylar' ? await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.events()) : [],
          errors,
        };
        await page.close();
      }
    }
    assert.equal(browser.version(), '154.0.8037.58');
    for (const family of ['chips', 'slide-toggle', 'expansion']) {
      assert.deepEqual(observations[family].reference.errors, []);
      assert.deepEqual(observations[family].astylar.errors, []);
      assert.equal(observations[family].reference.steps[0].ariaState,
        family === 'expansion' ? 'false' : 'true');
      assert.equal(observations[family].astylar.steps[0].ariaState,
        family === 'expansion' ? 'false' : 'true');
    }
    assert.deepEqual(observations.chips.reference.steps.map(step => [step.kind, step.value, step.ariaState]), [
      ['button:option', [true, true], 'true'], ['button:option', [false, true], 'false'],
    ]);
    assert.deepEqual(observations.chips.astylar.steps.map(step => [step.kind, step.value, step.ariaState]), [
      ['div:option', [true, true], 'true'], ['div:option', [true, true], 'true'],
    ]);
    assert.deepEqual(observations['slide-toggle'].reference.steps.map(step => [step.kind, step.value, step.ariaState]), [
      ['button:switch', true, 'true'], ['button:switch', false, 'false'],
    ]);
    assert.deepEqual(observations['slide-toggle'].astylar.steps.map(step => [step.kind, step.value, step.ariaState]), [
      ['div:switch', true, 'true'], ['div:switch', true, 'true'],
    ]);
    // The reference panel manages expanded state internally; its showcase store remains false.
    assert.deepEqual(observations.expansion.reference.steps.map(step => [step.kind, step.value, step.ariaState]), [
      ['mat-expansion-panel-header:button', false, 'false'],
      ['mat-expansion-panel-header:button', false, 'true'],
      ['mat-expansion-panel-header:button', false, 'false'],
    ]);
    assert.deepEqual(observations.expansion.astylar.steps.map(step => [step.kind, step.value, step.ariaState]), [
      ['div:button', false, 'false'], ['div:button', false, 'false'], ['div:button', false, 'false'],
    ]);
    for (const [family, targetId, expectedKeydowns] of [
      ['chips', 'chip-0', 1], ['slide-toggle', 'slide-toggle-primary', 1],
      ['expansion', 'expansion-primary', 2],
    ]) {
      assert.equal(observations[family].astylar.appEvents.filter(event =>
        event.type === 'keydown' && event.targetId === targetId).length, expectedKeydowns,
      `${family} keydowns reach the authored application callback`);
    }
  });
});

test('composite selection controls expose their arrow-key boundary', async () => {
  await withFrozenShowcase(async (browser, baseUrl) => {
    const observations = {};
    for (const family of ['button-toggle', 'tabs', 'stepper']) {
      observations[family] = {};
      for (const mode of ['reference', 'astylar']) {
        const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
        const errors = [];
        page.on('pageerror', error => errors.push(String(error)));
        await page.goto(`${baseUrl}/${mode}/${family}?benchmark=1&profile=light`);
        await page.locator('.frame').waitFor();
        if (mode === 'astylar') await page.waitForFunction(() => !!window.__ASTYLAR_MATERIAL_BENCHMARK__);
        const steps = [];
        for (const key of ['Tab', 'ArrowLeft', 'Enter', 'ArrowRight']) {
          await page.keyboard.press(key);
          if (mode === 'astylar') await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled());
          await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
          steps.push(await page.evaluate(mode => {
            const state = mode === 'reference'
              ? window.ng.getComponent(document.querySelector('app-reference')).store.state()
              : window.__ASTYLAR_MATERIAL_BENCHMARK__.state();
            const active = document.activeElement;
            const options = [...document.querySelectorAll('[role="tab"], [role="radio"]')];
            return {
              focusIndex: options.indexOf(active),
              selected: state.selected,
              options: options.map(element => element.getAttribute('aria-selected') ?? element.getAttribute('aria-checked')),
            };
          }, mode));
        }
        observations[family][mode] = {
          steps,
          appEvents: mode === 'astylar' ? await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.events()) : [],
          errors,
        };
        await page.close();
      }
    }
    assert.equal(browser.version(), '154.0.8037.58');
    const boundary = step => [step.focusIndex, step.selected, step.options];
    assert.deepEqual(observations['button-toggle'].reference.steps.map(boundary), [
      [1, true, ['false', 'true']], [0, false, ['true', 'false']],
      [0, false, ['true', 'false']], [1, true, ['false', 'true']],
    ]);
    assert.deepEqual(observations['button-toggle'].astylar.steps.map(boundary),
      Array.from({ length: 4 }, () => [1, true, ['false', 'true']]));
    for (const family of ['tabs', 'stepper']) {
      // Arrow keys move Material focus, then Enter selects; the showcase store is not the tab/step owner.
      assert.deepEqual(observations[family].reference.steps.map(boundary), [
        [0, true, ['true', 'false']], [1, true, ['true', 'false']],
        [1, true, ['false', 'true']], [0, true, ['false', 'true']],
      ]);
      assert.deepEqual(observations[family].astylar.steps.map(boundary),
        Array.from({ length: 4 }, () => [0, true, ['true', 'false']]));
    }
    for (const [family, targetId] of [
      ['button-toggle', 'button-toggle-two'], ['tabs', 'tab-overview'], ['stepper', 'step-details'],
    ]) {
      assert.equal(observations[family].astylar.appEvents.filter(event =>
        event.type === 'keydown' && event.targetId === targetId).length, 3,
      `${family} keydowns reach the authored application callback`);
      assert.deepEqual(observations[family].reference.errors, []);
      assert.deepEqual(observations[family].astylar.errors, []);
    }
  });
});

test('slider keyboard stepping exposes the authored range-constraint boundary', async () => {
  await withFrozenShowcase(async (browser, baseUrl) => {
    const observations = {};
    for (const mode of ['reference', 'astylar']) {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
      const errors = [];
      page.on('pageerror', error => errors.push(String(error)));
      await page.goto(`${baseUrl}/${mode}/slider?benchmark=1&profile=light`);
      await page.locator('.frame').waitFor();
      if (mode === 'astylar') await page.waitForFunction(() => !!window.__ASTYLAR_MATERIAL_BENCHMARK__);
      const steps = [];
      for (const key of ['Tab', 'ArrowRight', 'ArrowRight', 'ArrowRight', 'Tab', 'ArrowLeft', 'ArrowLeft', 'ArrowLeft']) {
        await page.keyboard.press(key);
        if (mode === 'astylar') await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled());
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        steps.push(await page.evaluate(mode => {
          const inputs = ['slider-start', 'slider-primary'].map(id => mode === 'reference'
            ? document.querySelector(`#${id}`) : document.querySelector(`[data-astylar-id="${id}"]`));
          const state = mode === 'reference'
            ? window.ng.getComponent(document.querySelector('app-reference')).store.state()
            : window.__ASTYLAR_MATERIAL_BENCHMARK__.state();
          return {
            focusIndex: inputs.indexOf(document.activeElement),
            inputs: inputs.map(input => ({ value: input?.value, min: input?.min, max: input?.max, step: input?.step })),
            state: [state.sliderStart, state.sliderValue],
          };
        }, mode));
      }
      observations[mode] = {
        steps,
        appEvents: mode === 'astylar' ? await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.events()) : [],
        errors,
      };
      await page.close();
    }
    assert.equal(browser.version(), '154.0.8037.58');
    assert.deepEqual(observations.reference.errors, []);
    assert.deepEqual(observations.astylar.errors, []);
    assert.deepEqual(observations.reference.steps[0].inputs, [
      { value: '30', min: '0', max: '65', step: '5' },
      { value: '65', min: '30', max: '100', step: '5' },
    ]);
    assert.deepEqual(observations.astylar.steps[0].inputs, [
      { value: '30', min: '0', max: '50', step: '1' },
      { value: '65', min: '50', max: '100', step: '1' },
    ]);
    const boundary = step => [step.focusIndex, step.inputs.map(input => input.value), step.state];
    assert.deepEqual(observations.reference.steps.map(boundary), [
      [0, ['30', '65'], [30, 65]], [0, ['35', '65'], [35, 65]],
      [0, ['40', '65'], [40, 65]], [0, ['45', '65'], [45, 65]],
      [1, ['45', '65'], [45, 65]], [1, ['45', '60'], [45, 60]],
      [1, ['45', '55'], [45, 55]], [1, ['45', '50'], [45, 50]],
    ]);
    assert.deepEqual(observations.astylar.steps.map(boundary), [
      [0, ['30', '65'], [30, 65]], [0, ['31', '65'], [30, 65]],
      [0, ['32', '65'], [30, 65]], [0, ['35', '65'], [35, 65]],
      [1, ['35', '65'], [35, 65]], [1, ['35', '64'], [35, 65]],
      [1, ['35', '63'], [35, 65]], [1, ['35', '60'], [35, 60]],
    ]);
    assert.deepEqual(observations.astylar.appEvents.filter(event => event.type === 'input')
      .map(event => [event.targetId, event.value]), [
      ['slider-start', '31'], ['slider-start', '32'], ['slider-start', '33'],
      ['slider-primary', '64'], ['slider-primary', '63'], ['slider-primary', '62'],
    ]);
    assert.equal(observations.astylar.appEvents.filter(event => event.type === 'change').length, 6);
  });
});

test('slider pointer-down ownership is measured at both visual thumb centers', async t => {
  await withFrozenShowcase(async (browser, baseUrl) => {
    const observations = {};
    for (const thumb of ['start', 'end']) {
      observations[thumb] = {};
      for (const mode of ['reference', 'astylar']) {
        const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
        const errors = [];
        page.on('pageerror', error => errors.push(String(error)));
        await page.goto(`${baseUrl}/${mode}/slider?benchmark=1&profile=light`);
        await page.locator('.frame').waitFor();
        if (mode === 'astylar') await page.waitForFunction(() => !!window.__ASTYLAR_MATERIAL_BENCHMARK__);
        const drag = mode === 'reference' ? await (async () => {
          const track = await page.locator('mat-slider .mdc-slider__track').boundingBox();
          const visual = await page.locator('mat-slider mat-slider-visual-thumb').nth(thumb === 'start' ? 0 : 1).boundingBox();
          return {
            from: { x: visual.x + visual.width / 2, y: visual.y + visual.height / 2 },
            to: { x: track.x + track.width * (thumb === 'start' ? .4 : .75), y: visual.y + visual.height / 2 },
          };
        })() : await page.evaluate(thumb => {
          const box = window.__ASTYLAR_MATERIAL_BENCHMARK__.measure(['slider-visual'], false).elements['slider-visual'].borderBox;
          const canvas = document.querySelector('canvas').getBoundingClientRect();
          const state = window.__ASTYLAR_MATERIAL_BENCHMARK__.state();
          const ratio = (thumb === 'start' ? state.sliderStart : state.sliderValue) / 100;
          return {
            from: { x: canvas.x + box.left + box.width * ratio, y: canvas.y + box.top + box.height / 2 },
            to: { x: canvas.x + box.left + box.width * (thumb === 'start' ? .4 : .75),
              y: canvas.y + box.top + box.height / 2 },
          };
        }, thumb);
        const steps = [];
        const snapshot = async boundary => steps.push(await page.evaluate(({ mode, boundary }) => {
          const state = mode === 'reference'
            ? window.ng.getComponent(document.querySelector('app-reference')).store.state()
            : window.__ASTYLAR_MATERIAL_BENCHMARK__.state();
          const thumbCenters = mode === 'reference'
            ? [...document.querySelectorAll('mat-slider mat-slider-visual-thumb')].map(node => {
              const box = node.getBoundingClientRect(); return box.x + box.width / 2;
            }) : (() => {
              const surface = window.ng.getComponent(document.querySelector('app-astylar-showcase')).surface;
              const scene = surface.scene, engine = scene.getEngine(), canvas = engine.getRenderingCanvas();
              const bounds = canvas.getBoundingClientRect(), transform = scene.getTransformMatrix();
              const viewport = scene.activeCamera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight());
              return ['start', 'end'].map(name => {
                const mesh = scene.meshes.find(mesh => mesh.name.endsWith(`-${name}-thumb`));
                mesh.computeWorldMatrix(true);
                const center = mesh.getAbsolutePosition();
                return bounds.x + center.constructor.Project(center, transform.constructor.IdentityReadOnly,
                  transform, viewport).x * bounds.width / engine.getRenderWidth();
              });
            })();
          return {
            boundary,
            thumbCenters,
            values: ['slider-start', 'slider-primary'].map(id => mode === 'reference'
              ? document.querySelector(`#${id}`)?.value : document.querySelector(`[data-astylar-id="${id}"]`)?.value),
            state: [state.sliderStart, state.sliderValue],
            events: mode === 'astylar' ? window.__ASTYLAR_MATERIAL_BENCHMARK__.events()
              .filter(event => ['pointerdown', 'pointerup', 'input', 'change'].includes(event.type)) : [],
          };
        }, { mode, boundary }));
        await snapshot('initial');
        await page.mouse.move(drag.from.x, drag.from.y);
        await page.mouse.down();
        await snapshot('down');
        for (let index = 1; index <= 4; index++) {
          await page.mouse.move(drag.from.x + (drag.to.x - drag.from.x) * index / 4, drag.from.y);
          await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
          await snapshot(`move-${index}`);
        }
        await page.mouse.up();
        if (mode === 'astylar') await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled());
        await snapshot('up');
      observations[thumb][mode] = { drag, steps, errors };
        await page.close();
      }
    }
    t.diagnostic(JSON.stringify({ scope: 'default 30/65 light desktop DPR1 four held pointer moves; not continuous-motion acceptance',
      traces: Object.fromEntries(Object.entries(observations).map(([thumb, sides]) => [thumb,
        Object.fromEntries(Object.entries(sides).map(([side, data]) => [side, {
          drag: data.drag, steps: data.steps.map(step => ({ boundary: step.boundary, values: step.values,
            state: step.state, thumbCenters: step.thumbCenters })) }]))])) }));
    assert.equal(browser.version(), '154.0.8037.58');
    for (const [thumb, owner, fixedIndex, expectedFinal] of [
      ['start', 'slider-start', 1, ['40', '65']],
      ['end', 'slider-primary', 0, ['30', '75']],
    ]) {
      const reference = observations[thumb].reference;
      const candidate = observations[thumb].astylar;
      assert.deepEqual(reference.errors, []);
      assert.deepEqual(candidate.errors, []);
      assert.ok(Math.abs(reference.drag.from.x - candidate.drag.from.x) < 2,
        `${thumb} pointer begins at the paired visual thumb center`);
      assert.deepEqual(reference.steps.map(step => step.boundary),
        ['initial', 'down', 'move-1', 'move-2', 'move-3', 'move-4', 'up']);
      assert.deepEqual(candidate.steps.map(step => step.boundary),
        ['initial', 'down', 'move-1', 'move-2', 'move-3', 'move-4', 'up']);
      assert.deepEqual(reference.steps.at(-1).values, expectedFinal);
      assert.deepEqual(candidate.steps.at(-1).values, expectedFinal);
      assert.deepEqual(candidate.steps.at(-1).state, expectedFinal.map(Number));
      const movingIndex = 1 - fixedIndex;
      const heldCenters = candidate.steps.slice(1, 6).map(step => step.thumbCenters[movingIndex]);
      assert.ok(heldCenters.every((center, index) => Number.isFinite(center) &&
        (index === 0 || center > heldCenters[index - 1])),
      `${thumb} projected thumb moves at every sampled held boundary, not only release`);
      assert.ok(candidate.steps.every(step => step.thumbCenters[fixedIndex] === candidate.steps[0].thumbCenters[fixedIndex]),
        `${thumb} peer projected thumb stays stationary`);
      assert.ok(candidate.steps.every(step => step.values[fixedIndex] === candidate.steps[0].values[fixedIndex]),
        `${thumb} drag must not change the other thumb`);
      assert.deepEqual(candidate.steps[1].events.filter(event => event.type === 'pointerdown')
        .map(event => event.targetId), [owner]);
      assert.deepEqual(candidate.steps.at(-1).events.filter(event => event.type === 'pointerup')
        .map(event => event.targetId), [owner]);
      assert.ok(candidate.steps.at(-1).events.filter(event => event.type === 'input').length >= 3);
      assert.ok(candidate.steps.at(-1).events.filter(event => event.type === 'input')
        .every(event => event.targetId === owner), `${thumb} input events retain their down owner`);
      assert.deepEqual(candidate.steps.at(-1).events.filter(event => event.type === 'change')
        .map(event => event.targetId), [owner]);
    }
  });
});

test('slider cross-midpoint visual thumbs reveal fixed-half hit ownership', async () => {
  await withFrozenShowcase(async (browser, baseUrl) => {
    const observations = {};
    for (const scenario of [
      { name: 'start-above-midpoint', start: 60, end: 80, thumb: 'start' },
      { name: 'end-below-midpoint', start: 20, end: 40, thumb: 'end' },
    ]) {
      observations[scenario.name] = {};
      for (const mode of ['reference', 'astylar']) {
        const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
        const errors = [];
        page.on('pageerror', error => errors.push(String(error)));
        await page.goto(`${baseUrl}/${mode}/slider?benchmark=1&profile=light`);
        await page.locator('.frame').waitFor();
        if (mode === 'astylar') await page.waitForFunction(() => !!window.__ASTYLAR_MATERIAL_BENCHMARK__);
        await page.evaluate(({ mode, start, end }) => {
          const component = window.ng.getComponent(document.querySelector(
            mode === 'reference' ? 'app-reference' : 'app-astylar-showcase'));
          component.store.patchState({ sliderStart: start, sliderValue: end });
        }, { mode, start: scenario.start, end: scenario.end });
        if (mode === 'astylar') await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled());
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        const point = mode === 'reference' ? await (async () => {
          const box = await page.locator('mat-slider mat-slider-visual-thumb')
            .nth(scenario.thumb === 'start' ? 0 : 1).boundingBox();
          return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
        })() : await page.evaluate(({ thumb, start, end }) => {
          const box = window.__ASTYLAR_MATERIAL_BENCHMARK__.measure(['slider-visual'], false).elements['slider-visual'].borderBox;
          const canvas = document.querySelector('canvas').getBoundingClientRect();
          return {
            x: canvas.x + box.left + box.width * (thumb === 'start' ? start : end) / 100,
            y: canvas.y + box.top + box.height / 2,
          };
        }, scenario);
        const snapshot = async () => page.evaluate(mode => ({
          values: ['slider-start', 'slider-primary'].map(id => mode === 'reference'
            ? document.querySelector(`#${id}`)?.value : document.querySelector(`[data-astylar-id="${id}"]`)?.value),
          state: mode === 'reference'
            ? (() => { const s = window.ng.getComponent(document.querySelector('app-reference')).store.state();
              return [s.sliderStart, s.sliderValue]; })()
            : (() => { const s = window.__ASTYLAR_MATERIAL_BENCHMARK__.state();
              return [s.sliderStart, s.sliderValue]; })(),
          events: mode === 'astylar' ? window.__ASTYLAR_MATERIAL_BENCHMARK__.events()
            .filter(event => ['pointerdown', 'pointerup', 'input', 'change'].includes(event.type)) : [],
        }), mode);
        const initial = await snapshot();
        await page.mouse.move(point.x, point.y);
        await page.mouse.down();
        const down = await snapshot();
        await page.mouse.move(point.x + 20, point.y);
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
        const moved = await snapshot();
        await page.mouse.up();
        if (mode === 'astylar') await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled());
        observations[scenario.name][mode] = { point, initial, down, moved, up: await snapshot(), errors };
        await page.close();
      }
    }
    assert.equal(browser.version(), '154.0.8037.58');
    for (const [name, initial, referenceFinal, candidateInitial, wrongOwner, candidateFinal] of [
      ['start-above-midpoint', ['60', '80'], ['65', '80'], ['50', '80'], 'slider-primary', ['50', '65']],
      ['end-below-midpoint', ['20', '40'], ['20', '45'], ['20', '50'], 'slider-start', ['40', '50']],
    ]) {
      const reference = observations[name].reference;
      const candidate = observations[name].astylar;
      assert.deepEqual(reference.errors, []);
      assert.deepEqual(candidate.errors, []);
      assert.ok(Math.abs(reference.point.x - candidate.point.x) < 2,
        `${name} uses the paired visual thumb center`);
      assert.deepEqual(reference.initial.values, initial);
      assert.deepEqual(candidate.initial.state, initial.map(Number));
      assert.deepEqual(candidate.initial.values, candidateInitial,
        `${name} semantic input value is clamped away from the visual thumb`);
      assert.deepEqual(reference.up.values, referenceFinal);
      assert.deepEqual(candidate.down.events.filter(event => event.type === 'pointerdown')
        .map(event => event.targetId), [wrongOwner]);
      assert.deepEqual(candidate.down.events.filter(event => event.type === 'input')
        .map(event => event.targetId), [wrongOwner]);
      assert.deepEqual(candidate.up.events.filter(event => event.type === 'pointerup')
        .map(event => event.targetId), [wrongOwner]);
      assert.deepEqual(candidate.up.events.filter(event => event.type === 'change')
        .map(event => event.targetId), [wrongOwner]);
      assert.deepEqual(candidate.up.values, candidateFinal);
      assert.notDeepEqual(candidate.up.state, reference.up.state,
        `${name} changes the wrong store thumb`);
    }
  });
});

test('select real keyboard boundaries distinguish custom Material options from candidate authoring', async () => {
  await withFrozenShowcase(async (browser, baseUrl) => {
    const observations = {};
    for (const mode of ['reference', 'astylar']) {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
      const errors = [];
      page.on('pageerror', error => errors.push(String(error)));
      await page.goto(`${baseUrl}/${mode}/select?benchmark=1&profile=light`);
      await page.locator('.frame').waitFor();
      if (mode === 'astylar') await page.waitForFunction(() => !!window.__ASTYLAR_MATERIAL_BENCHMARK__);
      await page.evaluate(() => {
        window.__selectAuditKeys = [];
        document.addEventListener('keydown', event => window.__selectAuditKeys.push({ key: event.key,
          target: event.target.id || event.target.getAttribute('data-astylar-id') }), true);
      });
      const steps = [];
      const snapshot = async boundary => {
        if (mode === 'astylar') await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled());
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        steps.push(await page.evaluate(({ mode, boundary }) => {
          const trigger = document.querySelector(mode === 'reference' ? '#select-control' : '[data-astylar-id="select-control"]');
          const component = window.ng.getComponent(document.querySelector(mode === 'reference' ? 'app-reference' : 'app-astylar-showcase'));
          const options = [...document.querySelectorAll(mode === 'reference' ? 'mat-option' : '[data-astylar-id^="select-option-"]')];
          return { boundary, kind: `${trigger.tagName.toLowerCase()}:${trigger.getAttribute('role')}`,
            focused: document.activeElement === trigger, expanded: trigger.getAttribute('aria-expanded'),
            selected: component.store.state().selected,
            options: options.map(option => ({ text: option.textContent.trim(), selected: option.getAttribute('aria-selected') })),
            active: trigger.getAttribute('aria-activedescendant'),
            activeText: document.getElementById(trigger.getAttribute('aria-activedescendant'))?.textContent.trim() ?? null,
            keys: window.__selectAuditKeys,
            appKeys: mode === 'astylar' ? window.__ASTYLAR_MATERIAL_BENCHMARK__.events()
              .filter(event => event.type === 'keydown').map(event => event.targetId) : [],
          };
        }, { mode, boundary }));
      };
      for (const key of ['Tab', 'Enter', 'ArrowUp', 'Enter', 'Enter', 'Escape']) {
        await page.keyboard.press(key);
        await snapshot(key);
      }
      // Pointer opening separates missing keyboard opening from dismissal of an existing popup.
      await page.evaluate(mode => {
        const component = window.ng.getComponent(document.querySelector(mode === 'reference' ? 'app-reference' : 'app-astylar-showcase'));
        component.store.patchState({ selected: true, open: false });
      }, mode);
      await snapshot('reset-selected');
      if (mode === 'reference') await page.locator('#select-control').click();
      else {
        const point = await page.evaluate(() => {
          const box = window.__ASTYLAR_MATERIAL_BENCHMARK__.measure(['select-control'], false).elements['select-control'].borderBox;
          const canvas = document.querySelector('canvas').getBoundingClientRect();
          return { x: canvas.x + box.left + box.width / 2, y: canvas.y + box.top + box.height / 2 };
        });
        await page.mouse.click(point.x, point.y);
      }
      await snapshot('pointer-open');
      await page.keyboard.press('ArrowUp');
      await snapshot('pointer-open-arrow');
      await page.keyboard.press('Enter');
      await snapshot('pointer-open-enter');
      await page.keyboard.press('Escape');
      await snapshot('pointer-open-escape');
      observations[mode] = { steps, errors };
      await page.close();
    }
    assert.equal(browser.version(), '154.0.8037.58');
    const boundary = step => [step.boundary, step.focused, step.expanded, step.selected, step.activeText];
    assert.deepEqual(observations.reference.steps.map(boundary), [
      ['Tab', true, 'false', true, null],
      ['Enter', true, 'true', true, 'Team'],
      ['ArrowUp', true, 'true', true, 'Solo'],
      ['Enter', true, 'false', false, null],
      ['Enter', true, 'true', false, 'Solo'],
      ['Escape', true, 'false', false, null],
      ['reset-selected', true, 'false', true, null],
      ['pointer-open', true, 'true', true, 'Team'],
      ['pointer-open-arrow', true, 'true', true, 'Solo'],
      ['pointer-open-enter', true, 'false', false, null],
      ['pointer-open-escape', true, 'false', false, null],
    ]);
    assert.deepEqual(observations.astylar.steps.map(boundary), [
      ['Tab', true, 'false', true, null],
      ['Enter', true, 'false', true, null],
      ['ArrowUp', true, 'false', true, null],
      ['Enter', true, 'false', true, null],
      ['Enter', true, 'false', true, null],
      ['Escape', true, 'false', true, null],
      ['reset-selected', true, 'false', true, null],
      ['pointer-open', true, 'true', true, 'Team'],
      ['pointer-open-arrow', true, 'true', true, 'Team'],
      ['pointer-open-enter', true, 'true', true, 'Team'],
      ['pointer-open-escape', true, 'false', true, null],
    ]);
    const expectedKeys = ['Tab', 'Enter', 'ArrowUp', 'Enter', 'Enter', 'Escape', 'ArrowUp', 'Enter', 'Escape'];
    for (const mode of ['reference', 'astylar']) {
      assert.deepEqual(observations[mode].errors, []);
      assert.deepEqual(observations[mode].steps.at(-1).keys.map(event => event.key), expectedKeys);
    }
    assert.equal(observations.reference.steps[0].kind, 'mat-select:combobox');
    assert.equal(observations.astylar.steps[0].kind, 'input:combobox');
    assert.deepEqual(observations.reference.steps[1].options,
      [{ text: 'Solo', selected: 'false' }, { text: 'Team', selected: 'true' }]);
    assert.deepEqual(observations.astylar.steps[7].options, observations.reference.steps[7].options);
    assert.deepEqual(observations.astylar.steps.at(-1).appKeys, Array(8).fill('select-control'),
      'candidate application callback receives opening, navigation, commit and dismissal keys');
    assert.deepEqual(observations.astylar.steps.at(-1).options, [], 'Escape removes candidate semantic options');
  });
});

test('editable popup keyboard boundaries locate autocomplete and timepicker interaction ownership', async () => {
  await withFrozenShowcase(async (browser, baseUrl) => {
    const observations = {};
    for (const family of ['autocomplete', 'timepicker', 'datepicker']) {
      observations[family] = {};
      for (const mode of ['reference', 'astylar']) {
        const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
        const errors = [];
        page.on('pageerror', error => errors.push(String(error)));
        await page.goto(`${baseUrl}/${mode}/${family}?benchmark=1&profile=light`);
        await page.locator('.frame').waitFor();
        if (mode === 'astylar') await page.waitForFunction(() => !!window.__ASTYLAR_MATERIAL_BENCHMARK__);
        await page.evaluate(() => {
          window.__popupAuditKeys = [];
          document.addEventListener('keydown', event => window.__popupAuditKeys.push(event.key), true);
        });
        const steps = [];
        for (const key of family === 'datepicker' ? ['Tab'] : ['Tab', 'ArrowDown', 'Enter', 'Escape']) {
          await page.keyboard.press(key);
          if (mode === 'astylar') await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled());
          await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
          steps.push(await page.evaluate(({ mode, family, key }) => {
            const input = document.querySelector(mode === 'reference' ? `#${family}-control` : `[data-astylar-id="${family}-control"]`);
            const active = document.getElementById(input.getAttribute('aria-activedescendant'));
            const options = [...document.querySelectorAll(mode === 'reference' ? '[role="option"]' : `[data-astylar-id^="${family}-option-"][role="option"]`)];
            return { key, focused: document.activeElement === input, focusText: document.activeElement?.textContent.trim(),
              value: input.value, expanded: input.getAttribute('aria-expanded'), activeText: active?.textContent.trim() ?? null,
              keys: window.__popupAuditKeys,
              calendarCount: document.querySelectorAll(mode === 'reference' ? 'mat-datepicker-content' : '[data-astylar-id="datepicker-popup"]').length,
              options: options.map(option => ({ text: option.textContent.trim(), selected: option.getAttribute('aria-selected') })),
              appKeys: mode === 'astylar' ? window.__ASTYLAR_MATERIAL_BENCHMARK__.events()
                .filter(event => event.type === 'keydown').map(event => event.targetId) : [],
            };
          }, { mode, family, key }));
        }
        observations[family][mode] = { steps, errors };
        await page.close();
      }
    }
    assert.equal(browser.version(), '154.0.8037.58');
    const boundary = step => [step.key, step.focused, step.value, step.expanded, step.activeText];
    assert.deepEqual(observations.autocomplete.reference.steps.map(boundary), [
      ['Tab', true, '', 'true', null], ['ArrowDown', true, '', 'true', 'Cape Town'],
      ['Enter', true, 'Cape Town', 'false', null], ['Escape', true, 'Cape Town', 'false', null],
    ]);
    assert.deepEqual(observations.autocomplete.astylar.steps.map(boundary), [
      ['Tab', true, '', 'true', null], ['ArrowDown', true, '', 'true', null],
      ['Enter', true, '', 'true', null], ['Escape', true, '', 'false', null],
    ]);
    assert.deepEqual(observations.timepicker.reference.steps.map(boundary), [
      ['Tab', true, '', 'false', null], ['ArrowDown', true, '', 'true', '12:00 AM'],
      ['Enter', true, '12:00 AM', 'false', null], ['Escape', true, '', 'false', null],
    ]);
    assert.deepEqual(observations.timepicker.astylar.steps.map(boundary), [
      ['Tab', true, '', 'true', '12:00 AM'], ['ArrowDown', true, '', 'true', '12:00 AM'],
      ['Enter', true, '', 'true', '12:00 AM'], ['Escape', true, '', 'false', null],
    ]);
    for (const family of ['autocomplete', 'timepicker', 'datepicker']) {
      for (const mode of ['reference', 'astylar']) {
        assert.deepEqual(observations[family][mode].errors, []);
        assert.deepEqual(observations[family][mode].steps.at(-1).keys,
          family === 'datepicker' ? ['Tab'] : ['Tab', 'ArrowDown', 'Enter', 'Escape']);
      }
      if (family === 'datepicker') {
        for (const mode of ['reference', 'astylar']) {
          assert.deepEqual(observations[family][mode].steps.map(boundary), [['Tab', true, '', null, null]]);
          assert.equal(observations[family][mode].steps[0].calendarCount, 0);
        }
      } else {
        assert.deepEqual(observations[family].astylar.steps.at(-1).appKeys, Array(3).fill(`${family}-control`));
        assert.deepEqual(observations[family].astylar.steps.at(-1).options, []);
      }
    }
    assert.deepEqual(observations.autocomplete.reference.steps[0].options, observations.autocomplete.astylar.steps[0].options);
    const referenceTimes = observations.timepicker.reference.steps[1].options;
    const candidateTimes = observations.timepicker.astylar.steps[1].options;
    assert.equal(referenceTimes.length, 48);
    assert.deepEqual(referenceTimes.map(option => option.text), candidateTimes.map(option => option.text));
    assert.ok(referenceTimes.every(option => option.selected === 'false'));
    assert.deepEqual(candidateTimes.map(option => option.selected), ['true', ...Array(47).fill('false')]);
  });
});

test('datepicker keyboard opening and pointer month/date boundaries locate calendar authoring gaps', async t => {
  await withFrozenShowcase(async (browser, baseUrl) => {
    const observations = {};
    for (const mode of ['reference', 'astylar']) {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
      const errors = [];
      page.on('pageerror', error => errors.push(String(error)));
      await page.goto(`${baseUrl}/${mode}/datepicker?benchmark=1&profile=light`);
      await page.locator('.frame').waitFor();
      if (mode === 'astylar') await page.waitForFunction(() => !!window.__ASTYLAR_MATERIAL_BENCHMARK__);
      await page.evaluate(() => {
        window.__calendarAuditKeys = [];
        window.__calendarAuditDispatch = [];
        window.__calendarAnimationEvents = [];
        for (const type of ['animationstart', 'animationend', 'animationcancel'])
          document.addEventListener(type, event => {
            if (event.target?.tagName === 'MAT-DATEPICKER-CONTENT')
              window.__calendarAnimationEvents.push({ type, name: event.animationName, time: performance.now() });
          }, true);
        document.addEventListener('keydown', event => window.__calendarAuditKeys.push(event.key), true);
        document.addEventListener('keydown', event => window.__calendarAuditDispatch.push({ key: event.key,
          modifiers: { alt: event.altKey, control: event.ctrlKey, shift: event.shiftKey, meta: event.metaKey },
          target: event.target?.outerHTML?.slice(0, 200), active: document.activeElement?.outerHTML?.slice(0, 200),
          popupClass: document.querySelector('mat-datepicker-content')?.className ?? null, time: performance.now() }), true);
      });
      const steps = [];
      const snapshot = async boundary => {
        if (mode === 'astylar') await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled());
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        steps.push(await page.evaluate(({ mode, boundary }) => {
          const input = document.querySelector(mode === 'reference' ? '#datepicker-control' : '[data-astylar-id="datepicker-control"]');
          const popup = document.querySelector(mode === 'reference' ? 'mat-datepicker-content' : '[data-astylar-id="datepicker-popup"]');
          const header = document.querySelector(mode === 'reference' ? '.mat-calendar-period-button' : '[data-astylar-id="datepicker-month"]');
          return { boundary, value: input.value, open: !!popup, inputFocused: document.activeElement === input,
            focusOwner: document.activeElement?.getAttribute('data-astylar-id') ?? document.activeElement?.getAttribute('aria-label'),
            activeDay: mode === 'reference' ? document.querySelector('.mat-calendar-body-active .mat-calendar-body-cell-content')?.textContent.trim() ?? null
              : document.activeElement?.getAttribute('data-astylar-id')?.match(/^datepicker-day-(\d+)$/)?.[1] ?? null,
            header: header?.textContent.trim() ?? null, keys: window.__calendarAuditKeys,
            appEvents: mode === 'astylar' ? window.__ASTYLAR_MATERIAL_BENCHMARK__.events()
              .filter(event => ['keydown', 'click'].includes(event.type)).map(event => [event.type, event.targetId]) : [],
          };
        }, { mode, boundary }));
      };
      for (const key of ['Tab', 'Alt+ArrowDown', 'Escape']) {
        await page.keyboard.press(key);
        if (mode === 'reference' && key === 'Alt+ArrowDown') {
          t.diagnostic(JSON.stringify({ calendarInitialReadiness: await page.evaluate(() => {
            const popup = document.querySelector('mat-datepicker-content');
            return { oldClassPredicate: !!popup && !popup.classList.contains('mat-datepicker-content-animating'),
              focusedCell: !!document.activeElement?.classList.contains('mat-calendar-body-cell'),
              animations: popup?.getAnimations().map(animation => ({ playState: animation.playState,
                pending: animation.pending, currentTime: animation.currentTime })),
              events: window.__calendarAnimationEvents };
          }) }));
          await page.waitForFunction(() => document.activeElement?.classList.contains('mat-calendar-body-cell'));
          // Class absence can also precede animationstart. Await the actual
          // finite animation, then its event-driven class/close-guard update.
          await page.evaluate(async () => {
            const popup = document.querySelector('mat-datepicker-content');
            await Promise.all(popup.getAnimations().filter(animation => animation.effect?.getTiming().iterations !== Infinity)
              .map(animation => animation.finished));
            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          });
          await page.waitForFunction(() => {
            const popup = document.querySelector('mat-datepicker-content');
            return popup && !popup.classList.contains('mat-datepicker-content-animating');
          });
          t.diagnostic(JSON.stringify({ calendarPreEscape: await page.evaluate(() => ({
            events: window.__calendarAnimationEvents,
            className: document.querySelector('mat-datepicker-content')?.className,
            closeGuardAnimating: window.ng.getComponent(document.querySelector('mat-datepicker-content'))._isAnimating,
            animations: document.querySelector('mat-datepicker-content')?.getAnimations().map(animation => ({
              playState: animation.playState, pending: animation.pending, currentTime: animation.currentTime,
              endTime: animation.effect.getComputedTiming().endTime,
            })), time: performance.now(),
          })) }));
          assert.equal(await page.evaluate(() => window.ng.getComponent(document.querySelector('mat-datepicker-content'))._isAnimating), false);
        }
        if (mode === 'reference' && key === 'Escape') {
          try { await page.locator('mat-datepicker-content').waitFor({ state: 'detached' }); }
          catch (error) {
            t.diagnostic(JSON.stringify({ failedCalendarEscape: await page.evaluate(() => ({
              dispatch: window.__calendarAuditDispatch, focus: document.activeElement?.outerHTML?.slice(0, 200),
              animations: window.__calendarAnimationEvents,
              closeGuardAnimating: window.ng.getComponent(document.querySelector('mat-datepicker-content'))?._isAnimating,
              popup: document.querySelector('mat-datepicker-content')?.outerHTML.slice(0, 400) ?? null,
            })) }));
            throw error;
          }
        }
        await snapshot(key);
      }
      const clickCandidate = async id => {
        const point = await page.evaluate(id => {
          const box = window.__ASTYLAR_MATERIAL_BENCHMARK__.measure([id], false).elements[id].borderBox;
          const canvas = document.querySelector('canvas').getBoundingClientRect();
          return { x: canvas.x + box.left + box.width / 2, y: canvas.y + box.top + box.height / 2 };
        }, id);
        await page.mouse.click(point.x, point.y);
      };
      if (mode === 'reference') await page.locator('mat-datepicker-toggle button').click();
      else await clickCandidate('datepicker-icon');
      if (mode === 'reference') await page.waitForFunction(() => {
        const popup = document.querySelector('mat-datepicker-content');
        return popup && !popup.classList.contains('mat-datepicker-content-animating');
      });
      await snapshot('pointer-open');
      for (const key of ['Home', 'ArrowRight']) {
        await page.keyboard.press(key);
        if (mode === 'reference') await page.waitForFunction(expected =>
          document.activeElement?.textContent.trim() === expected, key === 'Home' ? '1' : '2');
        await snapshot(key);
      }
      if (mode === 'reference') await page.locator('.mat-calendar-next-button').click();
      else await clickCandidate('datepicker-next');
      await snapshot('next-month');
      if (mode === 'reference') await page.locator('.mat-calendar-body-cell')
        .filter({ has: page.locator('.mat-calendar-body-cell-content', { hasText: /^\s*1\s*$/ }) }).first().click({ timeout: 5000 });
      else await clickCandidate('datepicker-day-1');
      if (mode === 'reference') await page.locator('mat-datepicker-content').waitFor({ state: 'detached' });
      await snapshot('choose-day-1');
      observations[mode] = { steps, errors };
      await page.close();
    }
    assert.equal(browser.version(), '154.0.8037.58');
    const boundary = step => [step.boundary, step.value, step.open];
    const ref = observations.reference.steps;
    const candidate = observations.astylar.steps;
    assert.deepEqual(ref.slice(0, 7).map(boundary), [
      ['Tab', '', false], ['Alt+ArrowDown', '', true], ['Escape', '', false],
      ['pointer-open', '', true], ['Home', '', true], ['ArrowRight', '', true], ['next-month', '', true],
    ]);
    assert.deepEqual(candidate.map(boundary), [
      ['Tab', '', false], ['Alt+ArrowDown', '', false], ['Escape', '', false],
      ['pointer-open', '', true], ['Home', '', true], ['ArrowRight', '', true], ['next-month', '', true], ['choose-day-1', '', true],
    ]);
    assert.equal(ref.at(-1).open, false);
    assert.match(ref.at(-1).value, /^\d+\/1\/\d{4}$/);
    const [month, day, year] = ref.at(-1).value.split('/').map(Number);
    assert.equal(ref[6].header, new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' })
      .format(new Date(year, month - 1, day)).toUpperCase(), 'committed date belongs to the displayed next month');
    assert.notEqual(ref[6].header, ref[3].header, 'Material next advances the displayed month');
    assert.equal(candidate[6].header, candidate[3].header, 'candidate next leaves its authored month unchanged');
    assert.deepEqual(ref.slice(4, 6).map(step => step.activeDay), ['1', '2']);
    assert.deepEqual(candidate.slice(3, 6).map(step => step.focusOwner), Array(3).fill('datepicker-icon'));
    assert.deepEqual(candidate.slice(4, 6).map(step => step.activeDay), [null, null]);
    assert.deepEqual(candidate.at(-1).appEvents, [
      ['keydown', 'datepicker-control'], ['keydown', 'datepicker-control'], ['keydown', 'datepicker-control'],
      ['click', 'datepicker-icon'], ['keydown', 'datepicker-icon'], ['keydown', 'datepicker-icon'],
      ['click', 'datepicker-next'], ['click', 'datepicker-day-1'],
    ]);
    for (const mode of ['reference', 'astylar']) {
      assert.deepEqual(observations[mode].errors, []);
      assert.deepEqual(observations[mode].steps.at(-1).keys, ['Tab', 'Alt', 'ArrowDown', 'Escape', 'Home', 'ArrowRight']);
      assert.equal(observations[mode].steps[0].inputFocused, true);
    }
  });
});

test('passive comparison applicability is distinguished from composite child controls', async () => {
  await withFrozenShowcase(async (browser, baseUrl) => {
    const observations = {};
    for (const family of ['sidenav', 'grid-list', 'divider', 'badge', 'icon', 'list', 'table',
      'progress-bar', 'progress-spinner', 'core', 'toolbar', 'card']) {
      observations[family] = {};
      for (const mode of ['reference', 'astylar']) {
        const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
        const errors = [];
        page.on('pageerror', error => errors.push(String(error)));
        await page.goto(`${baseUrl}/${mode}/${family}?benchmark=1&profile=light`);
        await page.locator('.frame').waitFor();
        if (mode === 'astylar') await page.waitForFunction(() => !!window.__ASTYLAR_MATERIAL_BENCHMARK__);
        const controls = await page.evaluate(mode => {
          const elements = [...document.querySelectorAll(mode === 'reference' ? '.demo *' : '[data-astylar-id]')];
          return elements.filter(element => element.tabIndex >= 0 && !element.disabled && element.getClientRects().length)
            .map(element => ({ id: mode === 'reference' ? element.id : element.getAttribute('data-astylar-id'),
              kind: element.tagName.toLowerCase(), role: element.getAttribute('role') }));
        }, mode);
        const progress = family.startsWith('progress-') ? await page.evaluate(() =>
          [...document.querySelectorAll('[role="progressbar"]')].map(element => [
            element.getAttribute('aria-valuemin'), element.getAttribute('aria-valuemax'), element.getAttribute('aria-valuenow'),
          ])) : null;
        await page.keyboard.press('Tab');
        const focus = await page.evaluate(mode => mode === 'reference' ? document.activeElement?.id
          : document.activeElement?.getAttribute('data-astylar-id'), mode);
        observations[family][mode] = { controls, focus, progress, errors };
        await page.close();
      }
    }
    assert.equal(browser.version(), '154.0.8037.58');
    for (const family of ['sidenav', 'grid-list', 'divider', 'badge', 'icon', 'list', 'table',
      'progress-bar', 'progress-spinner']) {
      assert.deepEqual(observations[family].reference.controls, [], `${family} has no reference Tab control`);
      assert.deepEqual(observations[family].astylar.controls, [], `${family} has no candidate Tab control`);
      assert.equal(observations[family].reference.focus, '');
      assert.equal(observations[family].astylar.focus, null);
    }
    for (const [family, id] of [['core', 'core-primary'], ['toolbar', 'toolbar-action'], ['card', 'card-open']]) {
      for (const mode of ['reference', 'astylar']) {
        assert.deepEqual(observations[family][mode].controls, [{ id, kind: 'button', role: null }]);
        assert.equal(observations[family][mode].focus, id);
      }
    }
    for (const family of Object.keys(observations)) {
      for (const mode of ['reference', 'astylar']) assert.deepEqual(observations[family][mode].errors, []);
    }
    for (const family of ['progress-bar', 'progress-spinner']) {
      for (const mode of ['reference', 'astylar']) assert.deepEqual(observations[family][mode].progress, [['0', '100', '64']]);
    }
  });
});

test('tree navigation and native button activation distinguish widget authoring from shared key delivery', async () => {
  await withFrozenShowcase(async (browser, baseUrl) => {
    const observations = {};
    for (const family of ['tree', 'core', 'toolbar', 'card']) {
      observations[family] = {};
      for (const mode of ['reference', 'astylar']) {
        const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
        const errors = [];
        page.on('pageerror', error => errors.push(String(error)));
        await page.goto(`${baseUrl}/${mode}/${family}?benchmark=1&profile=light`);
        await page.locator('.frame').waitFor();
        if (mode === 'astylar') await page.waitForFunction(() => !!window.__ASTYLAR_MATERIAL_BENCHMARK__);
        await page.evaluate(() => {
          window.__treeButtonEvents = [];
          for (const type of ['keydown', 'click']) document.addEventListener(type, event => {
            window.__treeButtonEvents.push({ type, key: event.key ?? null,
              id: event.target.id || event.target.getAttribute('data-astylar-id') });
          }, true);
        });
        const steps = [];
        for (const key of family === 'tree' ? ['Tab', 'ArrowDown', 'ArrowDown', 'Home', 'End'] : ['Tab', 'Enter', 'Space']) {
          await page.keyboard.press(key);
          if (mode === 'astylar') await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled());
          await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
          steps.push(await page.evaluate(({ mode, key }) => ({ key,
            focus: mode === 'reference' ? document.activeElement?.id : document.activeElement?.getAttribute('data-astylar-id'),
            events: window.__treeButtonEvents,
            appEvents: mode === 'astylar' ? window.__ASTYLAR_MATERIAL_BENCHMARK__.events()
              .filter(event => ['keydown', 'click'].includes(event.type)).map(event => [event.type, event.targetId]) : [],
          }), { mode, key }));
        }
        observations[family][mode] = { steps, errors };
        await page.close();
      }
    }
    assert.equal(browser.version(), '154.0.8037.58');
    assert.deepEqual(observations.tree.reference.steps.map(step => step.focus),
      ['tree-item-0', 'tree-item-1', 'tree-item-2', 'tree-item-0', 'tree-item-2']);
    assert.deepEqual(observations.tree.astylar.steps.map(step => step.focus), Array(5).fill('tree-item-0'));
    assert.deepEqual(observations.tree.astylar.steps.at(-1).appEvents,
      Array.from({ length: 4 }, () => ['keydown', 'tree-item-0']));
    for (const mode of ['reference', 'astylar']) {
      assert.deepEqual(observations.tree[mode].steps.at(-1).events.filter(event => event.type === 'keydown').map(event => event.key),
        ['Tab', 'ArrowDown', 'ArrowDown', 'Home', 'End']);
    }
    for (const [family, id] of [['core', 'core-primary'], ['toolbar', 'toolbar-action'], ['card', 'card-open']]) {
      for (const mode of ['reference', 'astylar']) {
        assert.deepEqual(observations[family][mode].steps.map(step => step.focus), Array(3).fill(id));
        assert.deepEqual(observations[family][mode].steps.at(-1).events.filter(event => event.type === 'keydown').map(event => event.key),
          ['Tab', 'Enter', ' ']);
      }
      assert.deepEqual(observations[family].reference.steps.at(-1).events.filter(event => event.type === 'click').map(event => event.id), [id, id]);
      assert.deepEqual(observations[family].astylar.steps[1].appEvents, [['keydown', id], ['click', id]]);
      assert.deepEqual(observations[family].astylar.steps[2].appEvents,
        [['keydown', id], ['click', id], ['keydown', id], ['click', id]]);
    }
    for (const family of ['tree', 'core', 'toolbar', 'card']) {
      for (const mode of ['reference', 'astylar']) assert.deepEqual(observations[family][mode].errors, []);
    }
  });
});

test('button keyboard activation and disabled skipping retain native focus boundaries', async t => {
  await withFrozenShowcase(async (browser, baseUrl) => {
    assert.equal(browser.version(), '154.0.8037.58');
    const observations = {};
    for (const mode of ['reference', 'astylar']) {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
      try {
        const errors = []; page.on('pageerror', error => errors.push(String(error)));
        await page.goto(`${baseUrl}/${mode}/button?profile=light`);
        await page.locator('.frame').waitFor();
        if (mode === 'astylar') {
          await page.waitForFunction(() => !!window.__ASTYLAR_MATERIAL_BENCHMARK__);
          await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled());
        }
        await page.evaluate(() => {
          window.__buttonBoundaryEvents = [];
          for (const type of ['keydown', 'keyup', 'click']) document.addEventListener(type, event => {
            const button = event.target.closest?.('button');
            const id = button?.getAttribute('data-astylar-id') || button?.id;
            if (id?.startsWith('button-')) window.__buttonBoundaryEvents.push({ type, id, domId: button.id, key: event.key ?? null });
          }, true);
        });
        const steps = [];
        for (const key of ['Tab', 'Enter', 'Space', 'Tab', 'Enter', 'Space', 'Tab', 'Shift+Tab']) {
          await page.keyboard.press(key);
          if (mode === 'astylar') await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled());
          await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
          steps.push(await page.evaluate(({ mode, key }) => ({ key,
            focus: document.activeElement?.getAttribute('data-astylar-id') || document.activeElement?.id || document.activeElement?.tagName,
            semanticDomId: document.activeElement?.id ?? null,
            domEvents: structuredClone(window.__buttonBoundaryEvents),
            appClicks: mode === 'astylar' ? window.__ASTYLAR_MATERIAL_BENCHMARK__.events()
              .filter(event => event.type === 'click').map(event => event.targetId) : null,
          }), { mode, key }));
        }
        const disabled = await page.evaluate(mode => {
          const button = document.querySelector(mode === 'reference' ? '#button-disabled' : '[data-astylar-id="button-disabled"]');
          return { tag: button.tagName, disabled: button.disabled, tabIndex: button.tabIndex };
        }, mode);
        observations[mode] = { steps, disabled, errors };
      } finally { await page.close(); }
    }
    t.diagnostic(JSON.stringify({ buttonKeyboardBoundary: observations }));
    const focus = ['button-primary', 'button-primary', 'button-primary', 'button-secondary',
      'button-secondary', 'button-secondary', 'BODY', 'button-secondary'];
    for (const mode of ['reference', 'astylar']) {
      assert.deepEqual(observations[mode].steps.map(step => step.focus), focus);
      assert.equal(observations[mode].disabled.tag, 'BUTTON');
      assert.equal(observations[mode].disabled.disabled, true);
      assert.deepEqual(observations[mode].errors, []);
    }
    assert.deepEqual(observations.reference.steps.at(-1).domEvents.filter(event => event.type === 'click').map(event => event.id),
      ['button-primary', 'button-primary', 'button-secondary', 'button-secondary']);
    for (const type of ['keydown', 'keyup']) {
      assert.deepEqual(observations.astylar.steps.at(-1).domEvents.filter(event => event.type === type).map(event => [event.id, event.key]),
        observations.reference.steps.at(-1).domEvents.filter(event => event.type === type).map(event => [event.id, event.key]));
    }
    assert.equal(observations.astylar.steps.at(-1).domEvents.filter(event => event.type === 'click').length, 0,
      'candidate activation is typed runtime dispatch, not a native semantic DOM click');
    assert.deepEqual(observations.astylar.steps.map(step => step.appClicks), [[], ['button-primary'],
      ['button-primary', 'button-primary'], ['button-primary', 'button-primary'],
      ['button-primary', 'button-primary', 'button-secondary'],
      ...Array.from({ length: 3 }, () => ['button-primary', 'button-primary', 'button-secondary', 'button-secondary'])]);
  });
});

test('side-mode sidenav Escape applicability is checked without inventing focusable content', async () => {
  const referenceSource = readFileSync('examples/material-showcase/src/app/reference.component.ts', 'utf8');
  const candidateSource = readFileSync('examples/material-showcase/src/app/astylar.component.ts', 'utf8');
  const materialSource = readFileSync('node_modules/@angular/material/fesm2022/sidenav.mjs', 'utf8');
  assert.match(referenceSource, /id="sidenav-nav" mode="side" opened>Navigation<\/mat-sidenav>/);
  assert.match(candidateSource, /type: 'aside', id: 'sidenav-nav', class: 'sidenav', textContent: 'Navigation'/);
  assert.match(materialSource, /event\.keyCode === ESCAPE && !this\.disableClose/);
  assert.match(materialSource, /\(mode !== \\"side\\"\) \? \\"-1\\" : null/);
  await withFrozenShowcase(async (browser, baseUrl) => {
    const observations = {};
    for (const mode of ['reference', 'astylar']) {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
      const errors = [];
      page.on('pageerror', error => errors.push(String(error)));
      await page.goto(`${baseUrl}/${mode}/sidenav?benchmark=1&profile=light`);
      await page.locator('.frame').waitFor();
      if (mode === 'astylar') await page.waitForFunction(() => !!window.__ASTYLAR_MATERIAL_BENCHMARK__);
      const point = await page.evaluate(mode => {
        if (mode === 'reference') {
          const box = document.querySelector('#sidenav-nav').getBoundingClientRect();
          return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
        }
        const box = window.__ASTYLAR_MATERIAL_BENCHMARK__.measure(['sidenav-nav'], false).elements['sidenav-nav'].borderBox;
        const canvas = document.querySelector('canvas').getBoundingClientRect();
        return { x: canvas.x + box.left + box.width / 2, y: canvas.y + box.top + box.height / 2 };
      }, mode);
      await page.mouse.click(point.x, point.y);
      await page.keyboard.press('Escape');
      observations[mode] = await page.evaluate(mode => {
        const nav = mode === 'reference' ? document.querySelector('#sidenav-nav') : document.querySelector('[data-astylar-id="sidenav-nav"]');
        const beforeFocus = document.activeElement === nav;
        nav.focus();
        return { beforeFocus, afterFocus: document.activeElement === nav, tabindex: nav.getAttribute('tabindex'),
          opened: mode === 'reference' ? nav.classList.contains('mat-drawer-opened') : null,
          events: mode === 'astylar' ? window.__ASTYLAR_MATERIAL_BENCHMARK__.events().filter(event => ['click', 'keydown'].includes(event.type)).map(event => [event.type, event.targetId]) : [] };
      }, mode);
      assert.deepEqual(errors, []);
      await page.close();
    }
    assert.equal(browser.version(), '154.0.8037.58');
    for (const mode of ['reference', 'astylar']) {
      assert.equal(observations[mode].beforeFocus, false);
      assert.equal(observations[mode].afterFocus, false);
      assert.equal(observations[mode].tabindex, null);
    }
    assert.equal(observations.reference.opened, true);
    assert.deepEqual(observations.astylar.events, [['click', 'sidenav-nav']]);
  });
});

test('dark mobile overlay cycles retain focus and semantic cleanup boundaries', async t => {
  await withFrozenShowcase(async (browser, baseUrl) => {
    const observations = {};
    for (const family of ['menu', 'bottom-sheet', 'dialog']) {
      observations[family] = {};
      for (const mode of ['reference', 'astylar']) {
        const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
        const errors = [];
        page.on('pageerror', error => errors.push(String(error)));
        await page.goto(`${baseUrl}/${mode}/${family}?benchmark=1&profile=dark`);
        await page.locator('.frame').waitFor();
        if (mode === 'astylar') await page.waitForFunction(() => !!window.__ASTYLAR_MATERIAL_BENCHMARK__);
        const snapshot = async () => page.evaluate(({ mode, family }) => {
          const active = document.activeElement;
          const refSelector = family === 'menu' ? '.mat-mdc-menu-panel' : family === 'dialog' ? '.mat-mdc-dialog-container' : '.mat-bottom-sheet-container';
          const popup = mode === 'reference' ? document.querySelector(refSelector) : document.querySelector(`[data-astylar-id="${family === 'menu' ? 'menu-popup' : `${family}-overlay`}"]`);
          let resources = null;
          if (mode === 'astylar') {
            const diagnostics = window.__ASTYLAR_MATERIAL_BENCHMARK__.measure([], false).diagnostics.surface;
            const surface = window.ng.getComponent(document.querySelector('app-astylar-showcase')).surface;
            const scene = surface.scene;
            resources = { scene: diagnostics.resources, plugins: diagnostics.pluginResources,
              live: { meshes: scene.meshes.length, materials: scene.materials.length, textures: scene.textures.length },
              unboundMaterials: scene.materials.filter(material => !scene.meshes.some(mesh => mesh.material === material))
                .map(material => ({ name: material.name, uniqueId: material.uniqueId })),
              loadedTextures: scene.getEngine().getLoadedTexturesCache().length,
              observers: Object.fromEntries(['onPointerObservable', 'onPrePointerObservable', 'onKeyboardObservable',
                'onPreKeyboardObservable', 'onBeforeRenderObservable', 'onAfterRenderObservable', 'onDisposeObservable']
                .map(name => [name, scene[name].observers.length])) };
          }
          return { focus: active?.getAttribute('data-astylar-id') || active?.getAttribute('data-parity-id') || active?.id || (active?.tagName === 'BODY' ? 'BODY' : active?.textContent?.trim()) || active?.tagName,
            popupCount: mode === 'reference' ? document.querySelectorAll(refSelector).length : document.querySelectorAll(`[data-astylar-id="${family === 'menu' ? 'menu-popup' : `${family}-overlay`}"]`).length,
            controls: popup ? [...popup.querySelectorAll('button,a')].map(node => node.getAttribute('data-astylar-id') || node.getAttribute('data-parity-id') || node.textContent.trim()) : [],
            canvases: document.querySelectorAll('canvas').length,
            resources,
            open: mode === 'astylar' ? window.__ASTYLAR_MATERIAL_BENCHMARK__.state().open : null };
        }, { mode, family });
        const cycles = [];
        if (mode === 'astylar') await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled());
        const initial = await snapshot();
        for (let cycle = 0; cycle < 3; cycle++) {
          const point = await page.evaluate(({ mode, family }) => {
            if (mode === 'reference') {
              const box = document.querySelector(`#${family}-primary`).getBoundingClientRect();
              return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
            }
            const box = window.__ASTYLAR_MATERIAL_BENCHMARK__.measure([`${family}-primary`], false).elements[`${family}-primary`].borderBox;
            const canvas = document.querySelector('canvas').getBoundingClientRect();
            return { x: canvas.x + box.left + box.width / 2, y: canvas.y + box.top + box.height / 2 };
          }, { mode, family });
          await page.mouse.click(point.x, point.y);
          if (mode === 'astylar') await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled());
          await page.evaluate(() => Promise.all(document.getAnimations().filter(animation => animation.effect?.getTiming().iterations !== Infinity).map(animation => animation.finished.catch(() => {}))));
          await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
          const opened = await snapshot();
          await page.keyboard.press('Escape');
          if (mode === 'astylar') await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled());
          else await page.locator(family === 'menu' ? '.mat-mdc-menu-panel' : family === 'dialog' ? '.mat-mdc-dialog-container' : '.mat-bottom-sheet-container').waitFor({ state: 'detached' });
          await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
          cycles.push({ opened, closed: await snapshot() });
        }
        let disposal = null;
        if (mode === 'astylar') disposal = await page.evaluate(async () => {
          const surface = window.ng.getComponent(document.querySelector('app-astylar-showcase')).surface;
          const scene = surface.scene, engine = scene.getEngine();
          const text = surface.host.inspection.textRenderingService;
          const beforeCache = text.getCacheStats();
          const retained = text.getRetainedTextures();
          const before = { cache: { size: beforeCache.size, maxSize: beforeCache.maxSize,
            references: beforeCache.entries.map(entry => entry.referenceCount).sort((a, b) => a - b) },
            sceneTextures: scene.textures.length, ownedTextTextures: scene.textures.filter(texture => retained.has(texture)).length };
          surface.dispose();
          await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          return { before, after: { surfaceDisposed: surface.disposed, sceneDisposed: scene.isDisposed,
            engineDisposed: engine.isDisposed, meshes: scene.meshes.length, materials: scene.materials.length,
            textures: scene.textures.length, loadedTextures: engine.getLoadedTexturesCache().length,
            cacheSize: text.getCacheStats().size, plugins: surface.diagnostics.pluginResources,
            observers: Object.fromEntries(['onPointerObservable', 'onPrePointerObservable', 'onKeyboardObservable',
              'onPreKeyboardObservable', 'onBeforeRenderObservable', 'onAfterRenderObservable', 'onDisposeObservable']
              .map(name => [name, scene[name].observers.length])) } };
        });
        observations[family][mode] = { initial, cycles, disposal, errors };
        await page.close();
      }
    }
    assert.equal(browser.version(), '154.0.8037.58');
    const referenceFocus = { menu: 'Rename', 'bottom-sheet': 'Share', dialog: 'dialog-cancel' };
    const referenceControls = { menu: ['Rename', 'Delete'], 'bottom-sheet': ['Share', 'Copy link'], dialog: ['dialog-cancel', 'dialog-save'] };
    const candidateControls = { menu: ['menu-rename', 'menu-delete'], 'bottom-sheet': ['bottom-sheet-dismiss', 'bottom-sheet-copy'], dialog: ['dialog-cancel', 'dialog-save'] };
    for (const family of ['menu', 'bottom-sheet', 'dialog']) {
      t.diagnostic(JSON.stringify({ family, initialResources: observations[family].astylar.initial.resources,
        disposal: observations[family].astylar.disposal,
        resources: observations[family].astylar.cycles.map(cycle => ({
        opened: cycle.opened.resources, closed: cycle.closed.resources })) }));
      const plateau = observations[family].astylar.cycles[0].closed.resources;
      const disposal = observations[family].astylar.disposal;
      assert.deepEqual(observations[family].astylar.cycles.map(cycle => cycle.closed.resources.live.materials),
        { menu: [19, 20, 21], 'bottom-sheet': [18, 19, 20], dialog: [17, 20, 23] }[family],
        'preserve the live-material counterexample, not cleanup acceptance');
      const textureCount = family === 'dialog' ? 7 : 5;
      assert.deepEqual(disposal.before, { cache: { size: textureCount, maxSize: 100,
        references: [...Array(textureCount - 3).fill(0), 1, 1, 1] }, sceneTextures: textureCount, ownedTextTextures: textureCount });
      assert.deepEqual(disposal.after, { surfaceDisposed: true, sceneDisposed: true, engineDisposed: true,
        meshes: 0, materials: 0, textures: 0, loadedTextures: 0, cacheSize: 0,
        plugins: { owners: 0, resources: 0, cleanups: 0, pending: 0 },
        observers: { onPointerObservable: 0, onPrePointerObservable: 0, onKeyboardObservable: 0,
          onPreKeyboardObservable: 0, onBeforeRenderObservable: 0, onAfterRenderObservable: 0, onDisposeObservable: 0 } });
      assert.deepEqual(plateau.scene, { meshes: 12, materials: family === 'dialog' ? 13 : 14, textures: family === 'dialog' ? 7 : 5 });
      assert.deepEqual(plateau.plugins, { owners: 2, resources: 0, cleanups: 1, pending: 0 });
      assert.equal(plateau.loadedTextures, plateau.scene.textures);
      assert.deepEqual(plateau.observers, { onPointerObservable: 2, onPrePointerObservable: 0,
        onKeyboardObservable: 0, onPreKeyboardObservable: 0, onBeforeRenderObservable: 0,
        onAfterRenderObservable: 0, onDisposeObservable: 3 });
      for (const cycle of observations[family].astylar.cycles) {
        const { live, unboundMaterials, ...tracked } = cycle.closed.resources;
        const { live: baselineLive, unboundMaterials: baselineUnbound, ...trackedPlateau } = plateau;
        assert.deepEqual(tracked, trackedPlateau, `${family} post-dismissal tracked resources grew`);
        assert.equal(live.meshes, tracked.scene.meshes);
        assert.equal(live.textures, tracked.scene.textures);
        // Preserve live identities independently: a tracked plateau is not a
        // live-material acceptance assertion. Public reduction owns attribution.
        assert.ok(live.materials >= tracked.scene.materials);
        assert.ok(cycle.opened.resources.scene.meshes > plateau.scene.meshes);
        assert.ok(cycle.opened.resources.scene.materials > plateau.scene.materials);
        assert.deepEqual(cycle.opened.resources.observers, plateau.observers);
        assert.deepEqual(cycle.opened.resources.plugins, plateau.plugins);
      }
      for (const mode of ['reference', 'astylar']) {
        assert.deepEqual(observations[family][mode].errors, []);
        assert.equal(observations[family][mode].cycles.length, 3);
        for (const { opened, closed } of observations[family][mode].cycles) {
          assert.equal(opened.popupCount, 1);
          assert.deepEqual(opened.controls, mode === 'reference' ? referenceControls[family] : candidateControls[family]);
          assert.equal(opened.focus, mode === 'reference' ? referenceFocus[family] : family === 'dialog' ? 'dialog-cancel' : `${family}-primary`);
          assert.equal(closed.popupCount, 0);
          assert.deepEqual(closed.controls, []);
          assert.equal(closed.focus, mode === 'astylar' && family === 'dialog' ? 'BODY' : `${family}-primary`);
          assert.equal(opened.canvases, mode === 'reference' ? 0 : 1);
          assert.equal(closed.canvases, opened.canvases);
          if (mode === 'astylar') {
            assert.equal(opened.open, true);
            assert.equal(closed.open, false);
          }
        }
      }
    }
  });
});

test('dark mobile field popup cycles diagnose retained cursor materials', async t => {
  await withFrozenShowcase(async (browser, baseUrl) => {
    assert.equal(browser.version(), '154.0.8037.58');
    const failedPlateaus = [];
    for (const family of ['autocomplete', 'timepicker']) {
      const observations = {};
      for (const mode of ['reference', 'astylar']) {
        const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
        const errors = []; page.on('pageerror', error => errors.push(String(error)));
        try {
          await page.goto(`${baseUrl}/${mode}/${family}?benchmark=1&profile=dark`);
          await page.locator('.frame').waitFor();
          if (mode === 'astylar') await page.waitForFunction(() => !!window.__ASTYLAR_MATERIAL_BENCHMARK__);
          const settle = async () => {
            if (mode === 'astylar') await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled());
            await page.evaluate(async () => { await document.fonts.ready;
              await Promise.all(document.getAnimations().filter(animation => animation.effect?.getTiming().iterations !== Infinity).map(animation => animation.finished.catch(() => {})));
              await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); });
          };
          const snapshot = async () => page.evaluate(({ mode, family }) => {
            const selector = mode === 'reference' ? (family === 'autocomplete' ? '.mat-mdc-autocomplete-panel' : '.mat-timepicker-panel')
              : `[data-astylar-id="${family === 'autocomplete' ? 'field-options' : 'timepicker-options'}"]`;
            const popup = document.querySelector(selector), input = document.querySelector(mode === 'reference' ? `#${family}-control` : `[data-astylar-id="${family}-control"]`);
            let resources = null, unboundMaterials = null;
            if (mode === 'astylar') {
              const surface = window.ng.getComponent(document.querySelector('app-astylar-showcase')).surface, scene = surface.scene;
              const text = surface.host.inspection.textRenderingService;
              unboundMaterials = scene.materials.filter(material => !scene.meshes.some(mesh => mesh.material === material))
                .map(material => ({ name: material.name, uniqueId: material.uniqueId }));
              resources = { meshes: scene.meshes.length, materials: scene.materials.length, textures: scene.textures.length,
                loadedTextures: scene.getEngine().getLoadedTexturesCache().length, cacheSize: text.getCacheStats().size,
                plugins: surface.diagnostics.pluginResources,
                observers: Object.fromEntries(['onPointerObservable', 'onPrePointerObservable', 'onKeyboardObservable',
                  'onPreKeyboardObservable', 'onBeforeRenderObservable', 'onAfterRenderObservable', 'onDisposeObservable']
                  .map(name => [name, scene[name].observers.length])) };
            }
            return { popupCount: document.querySelectorAll(selector).length,
              options: popup ? [...popup.querySelectorAll('[role="option"]')].map(node => node.textContent.trim()) : [],
              allOptionCount: document.querySelectorAll('[role="option"]').length,
              focus: document.activeElement?.getAttribute('data-astylar-id') || document.activeElement?.id || document.activeElement?.tagName,
              inputFocused: document.activeElement === input, value: input.value, expanded: input.getAttribute('aria-expanded'), resources, unboundMaterials };
          }, { mode, family });
          await settle(); const initial = await snapshot(), cycles = [];
          for (let cycle = 0; cycle < 3; cycle++) {
            await page.mouse.click(10, 10); await settle();
            const point = await page.evaluate(({ mode, family }) => {
              if (mode === 'reference') { const b = document.getElementById(`${family}-control`).getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; }
              const b = window.__ASTYLAR_MATERIAL_BENCHMARK__.measure([`${family}-control`], false).elements[`${family}-control`].borderBox;
              const canvas = document.querySelector('canvas').getBoundingClientRect(); return { x: canvas.x + b.left + b.width / 2, y: canvas.y + b.top + b.height / 2 };
            }, { mode, family });
            await page.mouse.click(point.x, point.y);
            const selector = mode === 'reference' ? (family === 'autocomplete' ? '.mat-mdc-autocomplete-panel' : '.mat-timepicker-panel')
              : `[data-astylar-id="${family === 'autocomplete' ? 'field-options' : 'timepicker-options'}"]`;
            await page.locator(selector).waitFor({ state: 'visible' }); await settle();
            const opened = await snapshot();
            await page.keyboard.press('Escape'); await page.locator(selector).waitFor({ state: 'detached' }); await settle();
            cycles.push({ opened, closed: await snapshot() });
          }
          const disposal = mode === 'astylar' ? await page.evaluate(async () => {
            const surface = window.ng.getComponent(document.querySelector('app-astylar-showcase')).surface;
            const scene = surface.scene, engine = scene.getEngine(), text = surface.host.inspection.textRenderingService;
            surface.dispose(); await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            return { disposed: surface.disposed, sceneDisposed: scene.isDisposed, engineDisposed: engine.isDisposed,
              meshes: scene.meshes.length, materials: scene.materials.length, textures: scene.textures.length,
              loadedTextures: engine.getLoadedTexturesCache().length, cacheSize: text.getCacheStats().size,
              plugins: surface.diagnostics.pluginResources };
          }) : null;
          observations[mode] = { initial, cycles, disposal, errors };
        } finally { await page.close(); }
      }
      t.diagnostic(JSON.stringify({ family, observations }));
      for (const mode of ['reference', 'astylar']) {
        assert.deepEqual(observations[mode].errors, []);
        for (const { opened, closed } of observations[mode].cycles) {
          assert.equal(opened.popupCount, 1); assert.equal(opened.options.length, family === 'autocomplete' ? 2 : 48);
          assert.equal(closed.popupCount, 0); assert.equal(closed.allOptionCount, 0); assert.deepEqual(closed.options, []);
          assert.equal(closed.value, '');
          assert.equal(closed.inputFocused, true); assert.equal(closed.expanded, 'false');
        }
      }
      const plateau = observations.astylar.cycles[0].closed.resources;
      for (let i = 0; i < 3; i++) assert.deepEqual(observations.astylar.cycles[i].opened.options, observations.reference.cycles[i].opened.options);
      for (const [index, cycle] of observations.astylar.cycles.entries()) {
        const { materials, ...stable } = cycle.closed.resources;
        const { materials: initialMaterials, ...initialStable } = plateau;
        assert.deepEqual(stable, initialStable);
        assert.equal(materials, initialMaterials + index, 'preserve the observed material growth, not a plateau pass');
        const cursorMaterials = cycle.closed.unboundMaterials.filter(material => material.name === `cursorMaterial_${family}-control`);
        assert.equal(cursorMaterials.length, index + 1);
        if (index > 0) for (const retained of observations.astylar.cycles[index - 1].closed.unboundMaterials.filter(material => material.name === `cursorMaterial_${family}-control`)) {
          assert.ok(cursorMaterials.some(material => material.uniqueId === retained.uniqueId));
        }
        if (JSON.stringify(cycle.closed.resources) !== JSON.stringify(plateau)) failedPlateaus.push({ family, cycle: index,
          baseline: plateau, actual: cycle.closed.resources, unboundMaterials: cycle.closed.unboundMaterials });
      }
      assert.deepEqual(observations.astylar.disposal, { disposed: true, sceneDisposed: true, engineDisposed: true,
        meshes: 0, materials: 0, textures: 0, loadedTextures: 0, cacheSize: 0,
        plugins: { owners: 0, resources: 0, cleanups: 0, pending: 0 } });
    }
    // Audit classification proof, not an acceptance gate. The original failed
    // plateau runs are retained; this assertion requires the counterexample.
    assert.equal(failedPlateaus.length, 4);
    assert.throws(() => assert.deepEqual(failedPlateaus, [], 'field popup resources must plateau after dismissal'),
      /field popup resources must plateau/);
    t.diagnostic(JSON.stringify({ resourcePlateauAccepted: false, classification: 'retained unbound cursor materials',
      failedCases: failedPlateaus.map(({ family, cycle }) => ({ family, cycle })),
      limitation: 'frozen dark mobile three-cycle observation; public reduction and full teardown-path attribution pending' }));
  });
});

test('paginator keyboard transitions separate native activation from disabled-interactive focus', async () => {
  const candidateSource = readFileSync('examples/material-showcase/src/app/astylar.component.ts', 'utf8');
  const materialSource = readFileSync('node_modules/@angular/material/fesm2022/paginator.mjs', 'utf8');
  assert.match(candidateSource, /id: 'paginator-previous'.*disabled: state\.pageIndex === 0/);
  assert.match(candidateSource, /id: 'paginator-next'.*disabled: state\.pageIndex === 9/);
  assert.match(materialSource, /_pageSizeOptions = \[\]/);
  assert.match(materialSource, /disabledInteractive/);
  await withFrozenShowcase(async (browser, baseUrl) => {
    const observations = {};
    for (const mode of ['reference', 'astylar']) {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
      const errors = [];
      page.on('pageerror', error => errors.push(String(error)));
      await page.goto(`${baseUrl}/${mode}/paginator?benchmark=1&profile=light`);
      await page.locator('.frame').waitFor();
      if (mode === 'astylar') await page.waitForFunction(() => !!window.__ASTYLAR_MATERIAL_BENCHMARK__);
      const steps = [];
      const snapshot = async key => steps.push(await page.evaluate(({ mode, key }) => {
        const active = document.activeElement;
        const buttons = mode === 'reference' ? [...document.querySelectorAll('#paginator-primary button')] : ['paginator-previous', 'paginator-next'].map(id => document.querySelector(`[data-astylar-id="${id}"]`));
        const state = mode === 'reference' ? window.ng.getComponent(document.querySelector('app-reference')).store.state() : window.__ASTYLAR_MATERIAL_BENCHMARK__.state();
        return { key, pageIndex: state.pageIndex, focus: active?.getAttribute('data-astylar-id') || active?.getAttribute('aria-label') || active?.tagName,
          buttons: buttons.map(node => ({ disabled: node.disabled, ariaDisabled: node.getAttribute('aria-disabled'), tabindex: node.tabIndex })),
          sizeControls: mode === 'reference' ? document.querySelectorAll('#paginator-primary mat-select').length : document.querySelectorAll('[data-astylar-id="paginator-page-size"] input').length,
          range: mode === 'reference' ? document.querySelector('.mat-mdc-paginator-range-label').textContent.trim() : document.querySelector('[data-astylar-id="paginator-range"]').textContent.trim() };
      }, { mode, key }));
      await snapshot('initial');
      for (const key of ['Tab', 'Enter', 'Shift+Tab', 'Space', 'Tab', ...Array(9).fill('Enter')]) {
        await page.keyboard.press(key);
        if (mode === 'astylar') await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled());
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        await snapshot(key);
      }
      observations[mode] = { steps, errors };
      await page.close();
    }
    assert.equal(browser.version(), '154.0.8037.58');
    const indices = [0, 0, 1, 1, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    for (const mode of ['reference', 'astylar']) {
      assert.deepEqual(observations[mode].errors, []);
      assert.deepEqual(observations[mode].steps.map(step => step.pageIndex), indices);
      assert.deepEqual(observations[mode].steps.map(step => step.range), indices.map(index => `${index * 10 + 1} – ${index * 10 + 10} of 100`));
      assert.ok(observations[mode].steps.every(step => step.sizeControls === 0));
    }
    assert.deepEqual(observations.reference.steps.map(step => step.focus),
      ['BODY', 'Next page', 'Next page', 'Previous page', 'Previous page', ...Array(10).fill('Next page')]);
    assert.deepEqual(observations.astylar.steps.map(step => step.focus),
      ['BODY', 'paginator-next', 'paginator-next', 'paginator-previous', 'BODY', ...Array(9).fill('paginator-next'), 'BODY']);
    for (const index of [0, 4, 14]) {
      const buttonIndex = index === 14 ? 1 : 0;
      assert.deepEqual(observations.reference.steps[index].buttons[buttonIndex], { disabled: false, ariaDisabled: 'true', tabindex: -1 });
      assert.deepEqual(observations.astylar.steps[index].buttons[buttonIndex], { disabled: true, ariaDisabled: null, tabindex: 0 });
    }
  });
});

test('ordinary dark mobile tooltip separates keyboard opening from pointer paint', async t => {
  await withFrozenShowcase(async (browser, baseUrl) => {
    assert.equal(browser.version(), '154.0.8037.58');
    const observations = {};
    const textRasters = {};
    for (const mode of ['reference', 'astylar']) {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
      try {
        const errors = []; page.on('pageerror', error => errors.push(String(error)));
        // Ordinary mode avoids the known benchmark-only hover suppression.
        await page.goto(`${baseUrl}/${mode}/tooltip?profile=dark`);
        await page.locator('.frame').waitFor();
        if (mode === 'astylar') await page.waitForFunction(() => !!window.__ASTYLAR_MATERIAL_BENCHMARK__);
        const settle = async () => {
          if (mode === 'astylar') await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled());
          await page.evaluate(async () => { await document.fonts.ready;
            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); });
        };
        const sample = async () => page.evaluate(mode => {
          const id = 'tooltip-primary';
          const trigger = mode === 'reference' ? document.getElementById(id) : document.querySelector(`[data-astylar-id="${id}"]`);
          const popup = mode === 'reference' ? document.querySelector('.mat-mdc-tooltip-surface') : document.querySelector('[data-astylar-id="tooltip-popup"]');
          const nativeBox = node => { const box = node.getBoundingClientRect(); return { x: box.x, y: box.y, width: box.width, height: box.height }; };
          const candidateBox = id => { const box = window.__ASTYLAR_MATERIAL_BENCHMARK__.measure([id], false).elements[id].borderBox;
            const canvas = document.querySelector('canvas').getBoundingClientRect(); return { x: canvas.x + box.left, y: canvas.y + box.top, width: box.width, height: box.height }; };
          return { focus: document.activeElement?.getAttribute('data-astylar-id') || document.activeElement?.id || document.activeElement?.tagName,
            trigger: mode === 'reference' ? nativeBox(trigger) : candidateBox(id),
            popup: popup ? { text: popup.textContent.trim(), box: mode === 'reference' ? nativeBox(popup) : candidateBox('tooltip-popup') } : null };
        }, mode);
        await page.keyboard.press('Tab'); await settle();
        if (mode === 'reference') await page.locator('.mat-mdc-tooltip-surface').waitFor({ state: 'visible' });
        await page.evaluate(() => Promise.all(document.getAnimations().filter(animation => animation.effect?.getTiming().iterations !== Infinity).map(animation => animation.finished.catch(() => {}))));
        const focused = await sample();
        await page.mouse.click(10, 10); await settle();
        if (mode === 'reference') await page.locator('.mat-mdc-tooltip-surface').waitFor({ state: 'detached' });
        const trigger = (await sample()).trigger;
        await page.mouse.move(trigger.x + trigger.width / 2, trigger.y + trigger.height / 2);
        await page.locator(mode === 'reference' ? '.mat-mdc-tooltip-surface' : '[data-astylar-id="tooltip-popup"]').waitFor({ state: 'visible' });
        await settle();
        await page.evaluate(() => Promise.all(document.getAnimations().filter(animation => animation.effect?.getTiming().iterations !== Infinity).map(animation => animation.finished.catch(() => {}))));
        const hovered = await sample();
        // Full-frame pixels preserve the fractional device-pixel origin; a clip
        // can round its origin independently of the measured popup box.
        const fullImage = PNG.sync.read(await page.screenshot({ caret: 'hide' }));
        const p = hovered.popup.box;
        // Equal-size interior crops contain the complete label, excluding only
        // rounded surface corners. Do not rescale or move the rendered content.
        textRasters[mode] = cropRgba(fullImage, { left: Math.floor(p.x * 2) + 8,
          top: Math.floor(p.y * 2) + 8, right: Math.floor(p.x * 2) + 204,
          bottom: Math.floor(p.y * 2) + 40 });
        const cropOriginX = Math.floor(p.x * 2) + 8;
        let foregroundMinX = Infinity, foregroundMaxX = -Infinity, foregroundPixels = 0;
        for (let y = Math.floor(p.y * 2) + 8; y < Math.floor(p.y * 2) + 40; y++) {
          for (let x = cropOriginX; x < Math.floor(p.x * 2) + 204; x++) {
            const i = (y * fullImage.width + x) * 4;
            if (fullImage.data[i] === 245 && fullImage.data[i + 1] === 239 && fullImage.data[i + 2] === 244) {
              foregroundPixels++; foregroundMinX = Math.min(foregroundMinX, x); foregroundMaxX = Math.max(foregroundMaxX, x);
            }
          }
        }
        assert.ok(foregroundPixels > 100);
        const horizontalPhase = { devicePopupX: p.x * 2, cropOriginX,
          foregroundMinX, foregroundMaxX, foregroundPixels,
          cropLocalMinX: foregroundMinX - cropOriginX, cropLocalMaxX: foregroundMaxX - cropOriginX };
        const ink = measureTextInkCenter(fullImage, { left: p.x, top: p.y,
          right: p.x + p.width, bottom: p.y + p.height, width: p.width, height: p.height }, 2);
        const typography = await page.evaluate(mode => {
          const keys = ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'textAlign'];
          const style = mode === 'reference'
            ? getComputedStyle(document.querySelector('.mat-mdc-tooltip-surface'))
            : window.__ASTYLAR_MATERIAL_BENCHMARK__.measure(['tooltip-popup']).inputTree.nodes
              .find(node => node.authored?.id === 'tooltip-popup').resolvedStyle;
          const paint = mode === 'astylar' ? (() => {
            const surface = window.ng.getComponent(document.querySelector('app-astylar-showcase')).surface;
            const text = surface.host.inspection.textRenderingService;
            return [...text.getRetainedTextures()].flatMap(texture => {
              const inputs = text.inspectTexturePaintInputs(texture);
              if (inputs?.text !== 'Create a project') return [];
              // Read the existing CPU raster and scene geometry; do not repaint,
              // move the owner, or alter texture sampling to obtain this evidence.
              const size = texture.getSize(), ctx = texture.getContext();
              const pixels = ctx.getImageData(0, 0, size.width, size.height).data;
              let opaqueMinX = Infinity, opaqueMaxX = -Infinity, opaquePixels = 0;
              for (let y = 0; y < size.height; y++) for (let x = 0; x < size.width; x++) {
                if (pixels[(y * size.width + x) * 4 + 3] === 255) {
                  opaquePixels++; opaqueMinX = Math.min(opaqueMinX, x); opaqueMaxX = Math.max(opaqueMaxX, x);
                }
              }
              const scene = surface.scene, engine = scene.getEngine(), camera = scene.activeCamera;
              const viewport = camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight());
              const identity = scene.getTransformMatrix().constructor.Identity();
              const owners = scene.meshes.filter(mesh => mesh.material?.getActiveTextures().includes(texture)).map(mesh => {
                const points = mesh.getBoundingInfo().boundingBox.vectorsWorld.map(point =>
                  point.constructor.Project(point, identity, scene.getTransformMatrix(), viewport));
                return { name: mesh.name, elementId: mesh.metadata?.elementId,
                  projectedLeft: Math.min(...points.map(point => point.x)),
                  projectedRight: Math.max(...points.map(point => point.x)),
                  textDimensions: mesh.metadata?.textDimensions };
              });
              // Diagnostic browser-canvas replay at the measured final X, not
              // an alternative fixture or a replacement rendering path.
              const directCanvas = document.createElement('canvas');
              directCanvas.width = engine.getRenderWidth(); directCanvas.height = 64;
              const direct = directCanvas.getContext('2d');
              direct.scale(window.devicePixelRatio, window.devicePixelRatio);
              direct.font = `${inputs.style.fontStyle} ${inputs.style.fontWeight} ${inputs.style.fontSize}px ${inputs.style.fontFamily}`;
              direct.letterSpacing = `${inputs.style.letterSpacing}px`;
              direct.fillStyle = inputs.style.color;
              direct.fillText(inputs.text, owners[0].projectedLeft / window.devicePixelRatio, 20);
              const directPixels = direct.getImageData(0, 0, directCanvas.width, directCanvas.height).data;
              let directMinX = Infinity, directMaxX = -Infinity, directOpaquePixels = 0;
              for (let y = 0; y < directCanvas.height; y++) for (let x = 0; x < directCanvas.width; x++) {
                if (directPixels[(y * directCanvas.width + x) * 4 + 3] === 255) {
                  directOpaquePixels++; directMinX = Math.min(directMinX, x); directMaxX = Math.max(directMaxX, x);
                }
              }
              return [{ ...inputs, rasterBoundary: { size, logicalSize: text.getLogicalTextureSize(texture),
                samplingMode: texture.samplingMode, opaqueMinX, opaqueMaxX, opaquePixels, owners,
                directAtProjectedOrigin: { directMinX, directMaxX, directOpaquePixels } } }];
            });
          })() : null;
          return { resolved: Object.fromEntries(keys.map(key => [key, style[key] ?? null])), paint };
        }, mode);
        const image = PNG.sync.read(await page.screenshot({ clip: hovered.popup.box, caret: 'hide' }));
        const colors = new Map();
        for (let i = 0; i < image.data.length; i += 4) { const color = [...image.data.subarray(i, i + 3)].join(','); colors.set(color, (colors.get(color) ?? 0) + 1); }
        await page.mouse.move(10, 10); await settle();
        await page.locator(mode === 'reference' ? '.mat-mdc-tooltip-surface' : '[data-astylar-id="tooltip-popup"]').waitFor({ state: 'detached' });
        observations[mode] = { focused, hovered, ink, typography, horizontalPhase,
          commonColors: [...colors].sort((a, b) => b[1] - a[1]).slice(0, 5), closed: await sample(), errors };
      } finally { await page.close(); }
    }
    t.diagnostic(JSON.stringify(observations));
    assert.ok(observations.reference.focused.popup);
    assert.equal(observations.astylar.focused.popup, null);
    for (const mode of ['reference', 'astylar']) {
      assert.equal(observations[mode].focused.focus, 'tooltip-primary');
      assert.equal(observations[mode].hovered.popup.text, 'Create a project');
      assert.equal(observations[mode].closed.popup, null);
      assert.deepEqual(observations[mode].errors, []);
      const { trigger, popup } = observations[mode].hovered;
      assert.ok(Math.abs(popup.box.y - (trigger.y + trigger.height) - 8) < .01);
      assert.ok(Math.abs((popup.box.x + popup.box.width / 2) - (trigger.x + trigger.width / 2)) < .01);
      assert.ok(Math.abs(popup.box.height - 24) < .01);
      assert.equal(observations[mode].commonColors[0][0], '50,48,51');
      assert.ok(observations[mode].commonColors.some(([color, count]) => color === '245,239,244' && count > 100));
    }
    assert.ok(Math.abs(observations.reference.focused.popup.box.height - 24) < .01);
    for (const mode of ['reference', 'astylar']) assert.ok(observations[mode].ink?.inkPixels > 100);
    // Frozen-profile diagnostic only, not sharpness or input-equivalence acceptance.
    assert.ok(textCenterOffsetError(observations.reference.ink, observations.astylar.ink) < .01);
    t.diagnostic(`Full-frame vertical ink-offset difference: ${textCenterOffsetError(observations.reference.ink, observations.astylar.ink)} CSS px; not a sharpness or equal-input acceptance gate.`);
    const raster = { unregistered: evaluateFocusedRaster(textRasters.reference, textRasters.astylar, { maximumPhaseOffset: 0 }),
      phaseRegistered: evaluateFocusedRaster(textRasters.reference, textRasters.astylar) };
    t.diagnostic(JSON.stringify({ tooltipTextRaster: raster }));
    const paints = observations.astylar.typography.paint;
    assert.equal(paints.length, 1);
    assert.equal(paints[0].style.fontFamily, 'Roboto, Arial, sans-serif');
    assert.equal(paints[0].style.textAlign, 'left');
    assert.equal(paints[0].style.fontSize, 12);
    assert.equal(paints[0].style.lineHeight * paints[0].style.fontSize, 16);
    // Preserve the observed phase instead of concealing it in an aligned-only
    // score. These bounds describe this frozen diagnostic, not release gates.
    assert.deepEqual(raster.phaseRegistered.phaseOffset, { x: 1, y: 0 });
    assert.ok(raster.unregistered.similarity < .8);
    assert.ok(raster.phaseRegistered.similarity > .99);
    const referencePhase = observations.reference.horizontalPhase, candidatePhase = observations.astylar.horizontalPhase;
    assert.equal(candidatePhase.cropOriginX, referencePhase.cropOriginX, 'phase is not caused by differing crop origins');
    assert.equal(candidatePhase.foregroundMinX, referencePhase.foregroundMinX - 1);
    assert.equal(candidatePhase.foregroundMaxX, referencePhase.foregroundMaxX - 1);
    assert.equal(candidatePhase.foregroundPixels, referencePhase.foregroundPixels);
    const boundary = paints[0].rasterBoundary;
    assert.deepEqual(boundary.size, { width: 182, height: 32 });
    assert.equal(boundary.samplingMode, 1);
    assert.equal(boundary.owners.length, 1);
    assert.equal(boundary.owners[0].elementId, 'tooltip-popup');
    const owner = boundary.owners[0];
    assert.ok(Math.abs(owner.projectedLeft - candidatePhase.devicePopupX - 16) < .001,
      'projected text plane begins at the authored eight-CSS-pixel content inset');
    assert.ok(Math.abs(owner.projectedRight - owner.projectedLeft - boundary.logicalSize.width * 2) < .001);
    assert.equal(candidatePhase.foregroundMinX, Math.floor(owner.projectedLeft) + boundary.opaqueMinX);
    assert.equal(candidatePhase.foregroundMaxX, Math.floor(owner.projectedLeft) + boundary.opaqueMaxX);
    assert.equal(candidatePhase.foregroundPixels, boundary.opaquePixels);
    // Local texture paint does not retain the same phase as direct browser
    // canvas paint at fractional final X. This is not a DOM-equivalence proof.
    assert.notEqual(boundary.directAtProjectedOrigin.directOpaquePixels, boundary.opaquePixels);
    assert.equal(boundary.directAtProjectedOrigin.directMaxX, candidatePhase.foregroundMaxX + 1);
  });
});

test('dark mobile snackbar keyboard activation exposes visible action and dismissal', async t => {
  await withFrozenShowcase(async (browser, baseUrl) => {
    assert.equal(browser.version(), '154.0.8037.58');
    const observations = {};
    for (const mode of ['reference', 'astylar']) {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
      try {
        const errors = []; page.on('pageerror', error => errors.push(String(error)));
        await page.goto(`${baseUrl}/${mode}/snack-bar?benchmark=1&profile=dark`);
        await page.locator('.frame').waitFor();
        if (mode === 'astylar') await page.waitForFunction(() => !!window.__ASTYLAR_MATERIAL_BENCHMARK__);
        const settle = async () => {
          if (mode === 'astylar') await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled());
          await page.evaluate(async () => { await document.fonts.ready;
            await Promise.all(document.getAnimations().filter(animation => animation.effect?.getTiming().iterations !== Infinity).map(animation => animation.finished.catch(() => {})));
            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); });
        };
        await settle();
        const baseline = PNG.sync.read(await page.screenshot({ caret: 'hide' }));
        await page.keyboard.press('Tab');
        const trigger = await page.evaluate(() => document.activeElement?.getAttribute('data-astylar-id') || document.activeElement?.id);
        assert.equal(trigger, 'snack-bar-primary');
        await page.keyboard.press('Enter'); await settle();
        const opened = await page.evaluate(mode => {
          const popup = mode === 'reference' ? document.querySelector('.mat-mdc-snack-bar-container') : document.querySelector('[data-astylar-id="snack-bar-surface"]');
          if (!popup) throw Error('Keyboard activation did not create snackbar');
          let box = popup.getBoundingClientRect().toJSON();
          let paint;
          if (mode === 'astylar') {
            const measurement = window.__ASTYLAR_MATERIAL_BENCHMARK__.measure(['snack-bar-surface']);
            const measured = measurement.elements['snack-bar-surface'].borderBox;
            const canvas = document.querySelector('canvas').getBoundingClientRect();
            box = { x: canvas.x + measured.left, y: canvas.y + measured.top, width: measured.width, height: measured.height };
            const style = measurement.inputTree.nodes.find(node => node.authored?.id === 'snack-bar-surface').resolvedStyle;
            paint = { background: style.background, color: style.color, width: style.width };
          } else {
            const surface = popup.querySelector('.mdc-snackbar__surface');
            const label = popup.querySelector('.mat-mdc-snack-bar-label');
            paint = { background: getComputedStyle(surface).backgroundColor, color: getComputedStyle(label).color,
              width: getComputedStyle(surface).width };
          }
          return { box, paint, text: popup.textContent.replace(/\s+/g, ' ').trim(),
            focus: document.activeElement?.getAttribute('data-astylar-id') || document.activeElement?.id };
        }, mode);
        const image = PNG.sync.read(await page.screenshot({ caret: 'hide' }));
        const { box } = opened;
        const left = Math.max(0, Math.ceil(box.x * 2)), top = Math.max(0, Math.ceil(box.y * 2));
        const right = Math.min(image.width, Math.floor((box.x + box.width) * 2));
        const bottom = Math.min(image.height, Math.floor((box.y + box.height) * 2));
        assert.ok(right > left && bottom > top, 'snackbar is wholly outside the viewport');
        let changed = 0; const palette = new Map();
        for (let y = top; y < bottom; y++) for (let x = left; x < right; x++) {
          const i = (y * image.width + x) * 4;
          if (image.data[i] === baseline.data[i] && image.data[i + 1] === baseline.data[i + 1] && image.data[i + 2] === baseline.data[i + 2]) continue;
          changed++; const color = [...image.data.subarray(i, i + 3)].join(',');
          palette.set(color, (palette.get(color) ?? 0) + 1);
        }
        await page.keyboard.press('Tab'); await settle();
        const actionFocus = await page.evaluate(() => document.activeElement?.getAttribute('data-astylar-id') || document.activeElement?.textContent.trim());
        await page.keyboard.press('Enter'); await settle();
        if (mode === 'reference') await page.locator('.mat-mdc-snack-bar-container').waitFor({ state: 'detached' });
        const closed = await page.evaluate(mode => ({ popupCount: document.querySelectorAll(mode === 'reference' ? '.mat-mdc-snack-bar-container' : '[data-astylar-id="snack-bar-surface"]').length,
          open: mode === 'astylar' ? window.__ASTYLAR_MATERIAL_BENCHMARK__.state().open : null,
          focus: document.activeElement?.getAttribute('data-astylar-id') || document.activeElement?.id || document.activeElement?.tagName }), mode);
        observations[mode] = { opened, raster: { changed, commonChangedColors: [...palette].sort((a, b) => b[1] - a[1]).slice(0, 5) }, actionFocus, closed, errors };
      } finally { await page.close(); }
    }
    t.diagnostic(JSON.stringify(observations));
    for (const mode of ['reference', 'astylar']) {
      assert.ok(observations[mode].raster.changed > 1000);
      assert.equal(observations[mode].closed.popupCount, 0);
      assert.deepEqual(observations[mode].errors, []);
    }
    assert.equal(observations.reference.opened.text, 'Project saved UNDO');
    assert.equal(observations.astylar.opened.text, 'Project savedUNDO');
    assert.equal(observations.reference.actionFocus, 'UNDO');
    assert.equal(observations.astylar.actionFocus, 'snack-bar-dismiss');
    assert.equal(observations.astylar.closed.open, false);
    assert.equal(observations.astylar.closed.focus, 'snack-bar-primary');
    assert.equal(observations.reference.closed.focus, 'BODY');
    assert.deepEqual(observations.astylar.opened.paint, { background: '#322f35', color: '#ffffff', width: '344px' });
    assert.equal(observations.reference.raster.commonChangedColors[0][0], '50,48,51');
    assert.equal(observations.astylar.raster.commonChangedColors[0][0], '50,47,53');
    assert.ok(observations.reference.raster.commonChangedColors.some(([color, count]) => color === '245,239,244' && count > 100));
    assert.ok(observations.astylar.raster.commonChangedColors.some(([color, count]) => color === '255,255,255' && count > 100));
    for (const mode of ['reference', 'astylar']) {
      assert.ok(Math.abs(observations[mode].opened.box.y - 788) < .01);
      assert.ok(Math.abs(observations[mode].opened.box.height - 48) < .01);
    }
    assert.equal(observations.reference.opened.box.width, 374);
    assert.ok(Math.abs(observations.astylar.opened.box.width - 344) < .01);
  });
});

test('dark mobile modal Tab cycles separate authored modality from core containment', async t => {
  const candidateSource = readFileSync('examples/material-showcase/src/app/astylar.component.ts', 'utf8');
  assert.match(candidateSource, /id: `\$\{family\}-overlay`, class: 'modal-overlay bottom-sheet-overlay', role: 'dialog'/);
  assert.match(candidateSource, /type: 'dialog' as const, id: `\$\{family\}-overlay`, class: 'modal-overlay', open: true, modal: true/);
  const runtimeSource = readFileSync('src/lib/astylar-interaction-runtime.ts', 'utf8');
  assert.match(runtimeSource, /element\.type === 'dialog' && element\.open && element\.modal && element\.id/);
  await withFrozenShowcase(async (browser, baseUrl) => {
    assert.equal(browser.version(), '154.0.8037.58');
    const observations = {};
    for (const family of ['bottom-sheet', 'dialog']) {
      observations[family] = {};
      for (const mode of ['reference', 'astylar']) {
        const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
        try {
          const errors = []; page.on('pageerror', error => errors.push(String(error)));
          await page.goto(`${baseUrl}/${mode}/${family}?benchmark=1&profile=dark`);
          await page.locator('.frame').waitFor();
          if (mode === 'astylar') await page.waitForFunction(() => !!window.__ASTYLAR_MATERIAL_BENCHMARK__);
          const point = await page.evaluate(({ mode, family }) => {
            if (mode === 'reference') { const box = document.getElementById(`${family}-primary`).getBoundingClientRect(); return { x: box.x + box.width / 2, y: box.y + box.height / 2 }; }
            const box = window.__ASTYLAR_MATERIAL_BENCHMARK__.measure([`${family}-primary`], false).elements[`${family}-primary`].borderBox;
            const canvas = document.querySelector('canvas').getBoundingClientRect();
            return { x: canvas.x + box.left + box.width / 2, y: canvas.y + box.top + box.height / 2 };
          }, { mode, family });
          await page.mouse.click(point.x, point.y);
          if (mode === 'astylar') await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled());
          await page.evaluate(() => Promise.all(document.getAnimations().filter(animation => animation.effect?.getTiming().iterations !== Infinity).map(animation => animation.finished.catch(() => {}))));
          const samples = [];
          const sample = async action => {
            await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
            samples.push(await page.evaluate(({ mode, family, action }) => {
              const active = document.activeElement;
              const popup = mode === 'reference' ? document.querySelector(family === 'dialog' ? '.mat-mdc-dialog-container' : '.mat-bottom-sheet-container') : document.querySelector(`[data-astylar-id="${family}-overlay"]`);
              const trigger = mode === 'reference' ? document.getElementById(`${family}-primary`) : document.querySelector(`[data-astylar-id="${family}-primary"]`);
              return { action, focus: active?.getAttribute('data-astylar-id') || active?.getAttribute('data-parity-id') || active?.id || (active?.tagName === 'BODY' ? 'BODY' : active?.textContent?.trim()) || active?.tagName,
                inside: !!popup?.contains(active), popup: !!popup, tag: popup?.tagName, modal: popup?.getAttribute('aria-modal'),
                triggerInert: !!trigger?.closest('[inert]') };
            }, { mode, family, action }));
          };
          await sample('open');
          for (let i = 0; i < 5; i++) { await page.keyboard.press('Tab'); await sample('Tab'); }
          for (let i = 0; i < 5; i++) { await page.keyboard.press('Shift+Tab'); await sample('Shift+Tab'); }
          observations[family][mode] = samples;
          assert.deepEqual(errors, []);
        } finally { await page.close(); }
      }
    }
    t.diagnostic(JSON.stringify(observations));
    for (const family of ['bottom-sheet', 'dialog']) for (const mode of ['reference', 'astylar']) {
      assert.equal(observations[family][mode].length, 11);
      assert.ok(observations[family][mode].every(sample => sample.popup));
    }
    const dialogOrder = ['dialog-cancel', 'dialog-save', 'dialog-cancel', 'dialog-save', 'dialog-cancel', 'dialog-save',
      'dialog-cancel', 'dialog-save', 'dialog-cancel', 'dialog-save', 'dialog-cancel'];
    for (const mode of ['reference', 'astylar']) {
      assert.deepEqual(observations.dialog[mode].map(sample => sample.focus), dialogOrder);
      assert.ok(observations.dialog[mode].every(sample => sample.inside));
    }
    assert.ok(observations.dialog.astylar.every(sample => sample.modal === 'true' && sample.triggerInert));
    assert.deepEqual(observations['bottom-sheet'].reference.map(sample => sample.focus),
      ['Share', 'Copy link', 'Share', 'Copy link', 'Share', 'Copy link', 'Share', 'Copy link', 'Share', 'Copy link', 'Share']);
    assert.ok(observations['bottom-sheet'].reference.every(sample => sample.inside));
    const sheet = observations['bottom-sheet'].astylar;
    assert.deepEqual(sheet.slice(0, 4).map(sample => sample.focus),
      ['bottom-sheet-primary', 'bottom-sheet-dismiss', 'bottom-sheet-copy', 'BODY']);
    assert.deepEqual(sheet.slice(0, 4).map(sample => sample.inside), [false, true, true, false]);
    assert.ok(sheet.every(sample => sample.tag === 'DIV' && sample.modal === null && !sample.triggerInert));
  });
});

test('dark mobile real-key selections distinguish direction state from highlight paint', async t => {
  await withFrozenShowcase(async (browser, baseUrl) => {
    assert.equal(browser.version(), '154.0.8037.58');
    const observations = {};
    for (const mode of ['reference', 'astylar']) {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
      try {
        const errors = []; page.on('pageerror', error => errors.push(String(error)));
        await page.goto(`${baseUrl}/${mode}/form-field?benchmark=1&profile=dark`);
        await page.locator('.frame').waitFor();
        if (mode === 'astylar') await page.waitForFunction(() => !!window.__ASTYLAR_MATERIAL_BENCHMARK__);
        await page.keyboard.press('Tab');
        await page.keyboard.press('Control+A');
        await page.keyboard.type('Atlas');
        const samples = [];
        const sample = async label => {
          if (mode === 'astylar') await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled());
          await page.evaluate(async () => { await document.fonts.ready;
            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); });
          const observation = await page.evaluate(mode => {
            const id = 'form-field-control';
            const node = mode === 'reference' ? document.getElementById(id) : document.querySelector(`[data-astylar-id="${id}"]`);
            if (mode === 'reference') return { value: node.value, selection: [node.selectionStart, node.selectionEnd],
              direction: node.selectionDirection, focused: document.activeElement === node, box: node.getBoundingClientRect().toJSON() };
            // Read-only diagnostic adapter, as in the retained input-boundary
            // producer. Never inject selection state or change authored input.
            const surface = window.ng.getComponent(document.querySelector('app-astylar-showcase')).surface;
            const input = surface.host.inputElementService.getInputElement(id);
            const box = window.__ASTYLAR_MATERIAL_BENCHMARK__.measure([id], false).elements[id].borderBox;
            const canvas = document.querySelector('canvas').getBoundingClientRect();
            const meshes = surface.scene.meshes.filter(mesh => mesh.metadata?.highlight?.ownerElementId === id);
            return { value: input.value, selection: [input.selectionStart, input.selectionEnd], cursor: input.cursorPosition,
              focused: input.focused, semanticSelection: [node.selectionStart, node.selectionEnd, node.selectionDirection],
              highlights: meshes.map(mesh => ({ visible: mesh.isVisible && mesh.isEnabled(),
                material: mesh.material?.emissiveColor?.toHexString(), alpha: mesh.material?.alpha })),
              box: { x: canvas.x + box.left, y: canvas.y + box.top, width: box.width, height: box.height } };
          }, mode);
          const image = PNG.sync.read(await page.screenshot({ clip: observation.box, caret: 'hide' }));
          samples.push({ label, observation, image });
        };
        await sample('typed');
        await page.keyboard.press('Home');
        for (let i = 0; i < 3; i++) await page.keyboard.press('Shift+ArrowRight');
        await sample('forward');
        // Collapse via ArrowRight before End: the previously proven End-on-
        // selection defect is not a confounder of this backward-paint check.
        await page.keyboard.press('ArrowRight');
        await page.keyboard.press('End');
        await sample('end-collapsed');
        for (let i = 0; i < 3; i++) await page.keyboard.press('Shift+ArrowLeft');
        await sample('backward');
        const baseline = samples[0].image;
        observations[mode] = samples.map(({ label, observation, image }) => {
          assert.equal(image.width, baseline.width); assert.equal(image.height, baseline.height);
          let changed = 0; const palette = new Map();
          for (let i = 0; i < image.data.length; i += 4) {
            if (image.data[i] === baseline.data[i] && image.data[i + 1] === baseline.data[i + 1] && image.data[i + 2] === baseline.data[i + 2]) continue;
            changed++; const color = [...image.data.subarray(i, i + 3)].join(',');
            palette.set(color, (palette.get(color) ?? 0) + 1);
          }
          return { label, ...observation, raster: { changed, commonChangedColors: [...palette].sort((a, b) => b[1] - a[1]).slice(0, 5) } };
        });
        assert.deepEqual(errors, []);
      } finally { await page.close(); }
    }
    t.diagnostic(JSON.stringify(observations));
    for (const mode of ['reference', 'astylar']) {
      for (const sample of observations[mode]) { assert.equal(sample.value, 'Atlas'); assert.equal(sample.focused, true); }
      assert.deepEqual(observations[mode][1].selection, [0, 3]);
      assert.deepEqual(observations[mode][2].selection, [5, 5]);
      assert.deepEqual(observations[mode][3].selection, [2, 5]);
      for (const index of [1, 3]) assert.ok(observations[mode][index].raster.changed > 0);
    }
    assert.equal(observations.reference[1].direction, 'forward');
    assert.equal(observations.reference[3].direction, 'backward');
    assert.equal(observations.astylar[1].cursor, 3);
    assert.equal(observations.astylar[3].cursor, 2);
    for (const index of [1, 3]) {
      const native = observations.reference[index], candidate = observations.astylar[index];
      assert.equal(native.raster.commonChangedColors[0][0], '46,97,205');
      assert.ok(native.raster.commonChangedColors.some(([color, count]) => color === '255,255,255' && count > 100));
      assert.equal(candidate.raster.commonChangedColors[0][0], '154,213,255');
      assert.ok(candidate.raster.commonChangedColors.some(([color, count]) => color === '0,0,0' && count > 100));
      assert.deepEqual(candidate.highlights, [{ visible: true, material: '#9AD5FF', alpha: 1 }]);
      assert.deepEqual(candidate.semanticSelection, [...candidate.selection, index === 1 ? 'forward' : 'backward']);
      for (const key of ['x', 'y', 'width', 'height']) assert.ok(Math.abs(native.box[key] - candidate.box[key]) < .01);
    }
    for (const mode of ['reference', 'astylar']) assert.equal(observations[mode][2].raster.changed, 0);
    assert.deepEqual(observations.astylar[2].highlights, []);
  });
});

test('dark mobile timepicker wheel separates scroll state from scrollbar paint', async t => {
  await withFrozenShowcase(async (browser, baseUrl) => {
    assert.equal(browser.version(), '154.0.8037.58');
    const launch = await inspectMaterialBrowserLaunch(browser, materialBrowserLaunchOptions());
    t.diagnostic(JSON.stringify({ browserLaunch: launch }));
    const observations = {};
    for (const mode of ['reference', 'astylar']) {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
      try {
        const errors = []; page.on('pageerror', error => errors.push(String(error)));
        await page.goto(`${baseUrl}/${mode}/timepicker?profile=dark`);
        await page.locator('.frame').waitFor();
        if (mode === 'astylar') {
          await page.waitForFunction(() => !!window.__ASTYLAR_MATERIAL_BENCHMARK__);
          await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled());
          const point = await page.evaluate(() => {
            const box = window.__ASTYLAR_MATERIAL_BENCHMARK__.measure(['timepicker-control'], false).elements['timepicker-control'].borderBox;
            const canvas = document.querySelector('canvas').getBoundingClientRect();
            return { x: canvas.x + box.left + box.width / 2, y: canvas.y + box.top + box.height / 2 };
          });
          await page.mouse.click(point.x, point.y);
        } else await page.locator('#timepicker-control').click();
        await page.locator(mode === 'reference' ? '.mat-timepicker-panel' : '[data-astylar-id="timepicker-options"]').waitFor({ state: 'visible' });
        const settle = async () => {
          if (mode === 'astylar') await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled());
          await page.evaluate(async () => { await document.fonts.ready;
            await Promise.all(document.getAnimations().filter(animation => animation.effect?.getTiming().iterations !== Infinity).map(animation => animation.finished.catch(() => {})));
            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); });
        };
        const sample = () => page.evaluate(mode => {
          if (mode === 'reference') {
            const panel = document.querySelector('.mat-timepicker-panel');
            const first = panel.querySelector('[role="option"]');
            const options = [...panel.querySelectorAll('[role="option"]')];
            const style = getComputedStyle(panel);
            return { box: panel.getBoundingClientRect().toJSON(), scrollTop: panel.scrollTop,
              scrollHeight: panel.scrollHeight, clientHeight: panel.clientHeight,
              clientWidth: panel.clientWidth, offsetWidth: panel.offsetWidth,
              padding: { top: style.paddingTop, bottom: style.paddingBottom }, optionCount: options.length,
              firstOption: first?.getBoundingClientRect().toJSON(), lastOption: options.at(-1)?.getBoundingClientRect().toJSON() };
          }
          const measured = window.__ASTYLAR_MATERIAL_BENCHMARK__.measure(['timepicker-options', 'timepicker-option-0', 'timepicker-option-47']);
          const canvas = document.querySelector('canvas').getBoundingClientRect();
          const box = id => { const value = measured.elements[id].borderBox;
            return { x: canvas.x + value.left, y: canvas.y + value.top, width: value.width, height: value.height }; };
          const scroll = measured.diagnostics.surface.scrolling.containers['timepicker-options'];
          const surface = window.ng.getComponent(document.querySelector('app-astylar-showcase')).surface;
          const thumb = surface.scene.getMeshByName('astylar-scrollbar-thumb-timepicker-options');
          const track = surface.scene.getMeshByName('astylar-scrollbar-track-timepicker-options');
          const style = measured.inputTree.nodes.find(node => node.authored?.id === 'timepicker-options').resolvedStyle;
          return { box: box('timepicker-options'), ...scroll, firstOption: box('timepicker-option-0'),
            lastOption: box('timepicker-option-47'), optionCount: document.querySelectorAll('[data-astylar-id^="timepicker-option-"][role="option"]').length,
            padding: { top: style.paddingTop ?? null, bottom: style.paddingBottom ?? null, shorthand: style.padding ?? null },
            scrollbar: thumb ? { visible: thumb.isVisible && thumb.isEnabled(), pickable: thumb.isPickable, localY: thumb.position.y,
              diffuse: thumb.material?.diffuseColor?.toHexString(), trackPickable: track?.isPickable } : null };
        }, mode);
        await settle(); const before = await sample();
        const beforePixels = PNG.sync.read(await page.screenshot({ caret: 'hide' }));
        await page.mouse.move(before.box.x + before.box.width / 2, before.box.y + before.box.height / 2);
        await page.mouse.wheel(0, 144);
        await page.waitForFunction(mode => mode === 'reference'
          ? document.querySelector('.mat-timepicker-panel').scrollTop > 0
          : window.__ASTYLAR_MATERIAL_BENCHMARK__.measure([], false).diagnostics.surface.scrolling.containers['timepicker-options'].scrollTop > 0, mode);
        await settle(); const after = await sample();
        const afterPixels = PNG.sync.read(await page.screenshot({ caret: 'hide' }));
        let scrollbarStripChanged = 0;
        const left = Math.floor((before.box.x + before.box.width - 12) * 2), right = Math.floor((before.box.x + before.box.width) * 2);
        const top = Math.floor(before.box.y * 2), bottom = Math.floor((before.box.y + before.box.height) * 2);
        for (let y = top; y < bottom; y++) for (let x = left; x < right; x++) {
          const i = (y * beforePixels.width + x) * 4;
          if ([0, 1, 2].some(channel => beforePixels.data[i + channel] !== afterPixels.data[i + channel])) scrollbarStripChanged++;
        }
        const thumbPixels = image => {
          let count = 0, firstY = null, lastY = null, firstX = Infinity, lastX = -Infinity;
          for (let y = top; y < bottom; y++) for (let x = left; x < right; x++) {
            const i = (y * image.width + x) * 4;
            if (image.data[i] === 139 && image.data[i + 1] === 135 && image.data[i + 2] === 141) {
              count++; firstY ??= y; lastY = y; firstX = Math.min(firstX, x); lastX = Math.max(lastX, x);
            }
          }
          return { count, firstY, lastY, firstX, lastX };
        };
        await page.mouse.wheel(0, 10000);
        await page.waitForFunction(mode => {
          const scroll = mode === 'reference' ? document.querySelector('.mat-timepicker-panel')
            : window.__ASTYLAR_MATERIAL_BENCHMARK__.measure([], false).diagnostics.surface.scrolling.containers['timepicker-options'];
          return scroll.scrollTop === scroll.scrollHeight - scroll.clientHeight;
        }, mode);
        await settle(); const end = await sample();
        // Drive the visible scrollbar, not the hidden semantic DOM or mesh position.
        await page.mouse.wheel(0, -10000);
        await page.waitForFunction(mode => mode === 'reference'
          ? document.querySelector('.mat-timepicker-panel').scrollTop === 0
          : window.__ASTYLAR_MATERIAL_BENCHMARK__.measure([], false).diagnostics.surface.scrolling.containers['timepicker-options'].scrollTop === 0, mode);
        await settle();
        const resetPixels = PNG.sync.read(await page.screenshot({ caret: 'hide' }));
        let dragPoint, nativeThumbRun = null;
        if (mode === 'astylar') {
          const pixels = thumbPixels(resetPixels);
          assert.ok(pixels.count > 100, 'candidate drag point comes from actual thumb pixels');
          dragPoint = { x: (pixels.firstX + pixels.lastX + 1) / 4, y: (pixels.firstY + pixels.lastY + 1) / 4 };
        } else {
          // Native scrollbar is platform UI, not an inspectable DOM thumb. Find
          // its neutral gray vertical run in the raster, excluding arrow rows.
          const x = Math.floor((before.box.x + before.box.width - 8) * 2);
          const runs = []; let run = null;
          for (let y = top + 24; y < bottom - 24; y++) {
            const i = (y * resetPixels.width + x) * 4;
            const rgb = [...resetPixels.data.subarray(i, i + 3)];
            const gray = Math.max(...rgb) - Math.min(...rgb) <= 2 && rgb[0] >= 95 && rgb[0] <= 235;
            if (gray) { run ??= { firstY: y, lastY: y, rgb }; run.lastY = y; }
            else if (run) { runs.push(run); run = null; }
          }
          if (run) runs.push(run);
          nativeThumbRun = runs.find(value => value.lastY - value.firstY >= 15);
          if (!nativeThumbRun) {
            const palette = {};
            for (let y = top; y < Math.min(bottom, top + 160); y++) {
              const i = (y * resetPixels.width + x) * 4;
              const color = [...resetPixels.data.subarray(i, i + 3)].join(',');
              palette[color] = (palette[color] ?? 0) + 1;
            }
            t.diagnostic(JSON.stringify({ nativeThumbDetection: { x, top, bottom, runs, palette, box: before.box } }));
          }
          assert.ok(nativeThumbRun, 'native drag point comes from actual platform thumb pixels');
          dragPoint = { x: (x + .5) / 2, y: (nativeThumbRun.firstY + nativeThumbRun.lastY + 1) / 4 };
        }
        const dragSteps = [];
        await page.mouse.move(dragPoint.x, dragPoint.y);
        await page.mouse.down();
        for (const distance of [20, 40, 60]) {
          await page.mouse.move(dragPoint.x, dragPoint.y + distance);
          await settle();
          dragSteps.push({ distance, ...await sample() });
        }
        await page.mouse.up();
        await settle();
        const release = await page.evaluate(mode => mode === 'reference'
          ? { open: !!document.querySelector('.mat-timepicker-panel'), value: document.querySelector('#timepicker-control').value }
          : { open: window.__ASTYLAR_MATERIAL_BENCHMARK__.state().open,
            events: window.__ASTYLAR_MATERIAL_BENCHMARK__.events().filter(event => ['pointerdown', 'pointerup', 'click'].includes(event.type)) }, mode);
        // A below-thumb track press is distinct from wheel and thumb dragging.
        // Observe held state before release can commit an underlying option.
        await page.mouse.move(before.box.x + before.box.width / 2, before.box.y + before.box.height / 2);
        await page.mouse.wheel(0, -10000);
        await page.waitForFunction(mode => mode === 'reference'
          ? document.querySelector('.mat-timepicker-panel').scrollTop === 0
          : window.__ASTYLAR_MATERIAL_BENCHMARK__.measure([], false).diagnostics.surface.scrolling.containers['timepicker-options'].scrollTop === 0, mode);
        await settle();
        const trackPoint = { x: dragPoint.x, y: before.box.y + before.box.height * .75 };
        await page.mouse.move(trackPoint.x, trackPoint.y);
        await page.mouse.down();
        await page.waitForTimeout(250);
        await settle();
        const trackHeld = await sample();
        await page.mouse.up();
        await settle();
        const trackRelease = await page.evaluate(mode => mode === 'reference'
          ? { open: !!document.querySelector('.mat-timepicker-panel'), value: document.querySelector('#timepicker-control').value }
          : { open: window.__ASTYLAR_MATERIAL_BENCHMARK__.state().open,
            events: window.__ASTYLAR_MATERIAL_BENCHMARK__.events().filter(event => ['pointerdown', 'pointerup', 'click'].includes(event.type)).slice(-3) }, mode);
        observations[mode] = { before, after, end, scrollbarStripChanged,
          drag: { point: dragPoint, nativeThumbRun, steps: dragSteps, release },
          track: { point: trackPoint, held: trackHeld, release: trackRelease },
          candidateThumbPixels: mode === 'astylar' ? { before: thumbPixels(beforePixels), after: thumbPixels(afterPixels) } : null, errors };
      } finally { await page.close(); }
    }
    t.diagnostic(JSON.stringify(observations));
    for (const mode of ['reference', 'astylar']) {
      assert.equal(observations[mode].before.scrollTop, 0);
      assert.equal(observations[mode].after.scrollTop, 144);
      assert.ok(Math.abs(observations[mode].before.firstOption.y - observations[mode].after.firstOption.y - 144) < .01);
      assert.deepEqual(observations[mode].errors, []);
    }
    assert.equal(observations.reference.before.scrollHeight - observations.astylar.before.scrollHeight, 8);
    assert.deepEqual(observations.reference.before.padding, { top: '8px', bottom: '8px' });
    assert.deepEqual(observations.astylar.before.padding, { top: '8px', bottom: null, shorthand: '0' });
    for (const mode of ['reference', 'astylar']) {
      const end = observations[mode].end;
      assert.equal(end.optionCount, 48);
      assert.equal(end.scrollTop, end.scrollHeight - end.clientHeight);
      const trailingGap = end.box.y + end.box.height - end.lastOption.y - end.lastOption.height;
      assert.ok(Math.abs(trailingGap - (mode === 'reference' ? 8 : 0)) < .01);
      assert.ok(end.lastOption.y >= end.box.y);
    }
    const thumb = observations.astylar.candidateThumbPixels;
    assert.ok(thumb.before.count > 100 && thumb.after.count > 100);
    assert.ok(thumb.after.firstY > thumb.before.firstY);
    assert.equal(observations.astylar.before.scrollbar.visible, true);
    assert.equal(observations.astylar.after.scrollbar.visible, true);
    // Native platform scrollbars reserve a gutter; current core indicators
    // paint inside an unreduced client area. Observe the first divergence
    // before attributing option width differences to popup fixture styles.
    const nativeGutter = observations.reference.before.offsetWidth - observations.reference.before.clientWidth;
    const candidateGutter = observations.astylar.before.box.width - observations.astylar.before.clientWidth;
    assert.equal(nativeGutter, 15);
    assert.ok(Math.abs(candidateGutter) < .01);
    assert.ok(Math.abs(observations.reference.before.firstOption.width - observations.reference.before.clientWidth) < .01);
    assert.ok(Math.abs(observations.astylar.before.firstOption.width - observations.astylar.before.clientWidth) < .01);
    t.diagnostic(JSON.stringify({ scrollbarGutterObservation: {
      nativeGutter, candidateGutter,
      nativeOptionWidth: observations.reference.before.firstOption.width,
      candidateOptionWidth: observations.astylar.before.firstOption.width,
      acceptance: false,
    } }));
    assert.ok(observations.reference.drag.steps.every((step, index, steps) => step.scrollTop > (index ? steps[index - 1].scrollTop : 0)),
      'native thumb drag progresses at every held action boundary');
    assert.deepEqual(observations.astylar.drag.steps.map(step => step.scrollTop), [0, 0, 0],
      'candidate painted thumb currently has no pointer scrolling behavior');
    assert.equal(observations.astylar.before.scrollbar.pickable, false);
    assert.equal(observations.astylar.before.scrollbar.trackPickable, false);
    assert.ok(observations.reference.track.held.scrollTop > 0, 'native below-thumb track press scrolls');
    assert.equal(observations.astylar.track.held.scrollTop, 0, 'candidate track press does not scroll');
    t.diagnostic(JSON.stringify({ scrollbarTrackObservation: {
      reference: observations.reference.track, candidate: observations.astylar.track,
      acceptance: false,
    } }));
    assert.deepEqual(observations.astylar.drag.release.events.slice(-2).map(event => [event.type, event.targetId]),
      [['pointerdown', 'timepicker-option-0'], ['pointerup', 'timepicker-option-1']]);
    assert.equal(observations.reference.drag.release.open, true);
    assert.equal(observations.astylar.drag.release.open, true);
    t.diagnostic(JSON.stringify({ scrollbarDragFinding: {
      family: 'timepicker', profile: 'dark', viewport: '390x844', dpr: 2,
      classification: 'intentional-documented-limitation', owner: 'core scrolling/interaction',
      firstDivergence: 'painted scrollbar thumb is non-pickable; pointer targets underlying options',
      nativeDragScrollTop: observations.reference.drag.steps.map(step => step.scrollTop),
      candidateDragScrollTop: observations.astylar.drag.steps.map(step => step.scrollTop),
      nativeScrollbarHarnessCorrection: 'shared Material launch omits --hide-scrollbars and records effective evidence',
      acceptance: false,
    } }));
    for (const mode of ['reference', 'astylar']) for (const step of observations[mode].drag.steps) {
      assert.ok(Math.abs(observations[mode].before.firstOption.y - step.firstOption.y - step.scrollTop) < .01);
    }
  }, materialBrowserLaunchOptions());
});

test('comparison iframe overlays expose parent control focus scope', async t => {
  await withFrozenShowcase(async (browser, baseUrl) => {
    assert.equal(browser.version(), '154.0.8037.58');
    const observations = [];
    for (const family of ['bottom-sheet', 'dialog']) for (const mode of ['astylar', 'reference', 'both']) {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
      try {
        const errors = []; page.on('pageerror', error => errors.push(String(error)));
        await page.goto(`${baseUrl}/compare`);
        const selector = page.locator('.comparison-toolbar > label select');
        // Route setup only; the reachability boundary below uses real input.
        await selector.selectOption(family);
        await page.waitForFunction(family => [...document.querySelectorAll('iframe')]
          .every(frame => frame.src.includes(`/${family}?`)), family);
        const iframe = page.locator('iframe[title="AstylarUI implementation"]');
        const candidate = await (await iframe.elementHandle()).contentFrame();
        await candidate.waitForFunction(() => !!window.__ASTYLAR_MATERIAL_BENCHMARK__);
        await candidate.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled());
        const local = await candidate.evaluate(family => {
          const id = `${family}-primary`;
          const box = window.__ASTYLAR_MATERIAL_BENCHMARK__.measure([id], false).elements[id].borderBox;
          const canvas = document.querySelector('canvas').getBoundingClientRect();
          return { x: canvas.x + box.left + box.width / 2, y: canvas.y + box.top + box.height / 2 };
        }, family);
        const outer = await iframe.boundingBox();
        const reference = page.frameLocator('iframe[title="Angular Material reference"]');
        if (mode !== 'reference') {
          await page.mouse.click(outer.x + 1 + local.x, outer.y + 1 + local.y);
          await candidate.waitForFunction(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.state().open);
        }
        if (mode !== 'astylar') {
          await reference.locator(`#${family}-primary`).click();
          await reference.locator(family === 'dialog' ? '.mat-mdc-dialog-container' : '.mat-bottom-sheet-container').waitFor({ state: 'visible' });
        }
        for (const frame of page.frames().filter(frame => frame !== page.mainFrame())) {
          await frame.evaluate(async () => {
            await Promise.all(document.getAnimations().filter(animation => animation.effect?.getTiming().iterations !== Infinity)
              .map(animation => animation.finished.catch(() => {})));
            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          });
        }
        const before = await candidate.evaluate(() => ({ open: window.__ASTYLAR_MATERIAL_BENCHMARK__.state().open,
          modal: document.querySelector('[aria-modal="true"]')?.getAttribute('data-astylar-id') ?? null }));
        await selector.click();
        const focused = await selector.evaluate(node => node === document.activeElement);
        // Close the platform popup first; then exercise the focused native
        // control's keyboard selection rather than platform-menu key routing.
        await page.keyboard.press('Escape');
        await page.keyboard.press('Home'); await page.keyboard.press('Enter');
        t.diagnostic(JSON.stringify({ family, mode, focused, selectedAfterKeys: await selector.inputValue() }));
        assert.equal(focused, true, `${family}/${mode} overlay intercepted parent focus`);
        await page.waitForFunction(() => [...document.querySelectorAll('iframe')].every(frame => frame.src.includes('/core?')));
        observations.push({ family, mode, candidateBeforeParentClick: before, parentSelectorFocused: focused,
          selected: await selector.inputValue(), frameSources: await page.locator('iframe').evaluateAll(nodes => nodes.map(node => new URL(node.src).pathname)), errors });
      } finally { await page.close(); }
    }
    t.diagnostic(JSON.stringify(observations));
    for (const observation of observations) {
      if (observation.mode !== 'reference') assert.equal(observation.candidateBeforeParentClick.open, true);
      assert.equal(observation.parentSelectorFocused, true);
      assert.equal(observation.selected, 'core');
      assert.deepEqual(observation.frameSources, ['/reference/core', '/astylar/core']);
      assert.deepEqual(observation.errors, []);
    }
  });
});

test('ordinary tooltip repeated hover and leave exposes live ownership separately from tracked counts', async t => {
  await withFrozenShowcase(async (browser, baseUrl) => {
    const results = {};
    for (const mode of ['reference', 'astylar']) {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
      const errors = [];
      page.on('pageerror', error => errors.push(String(error)));
      try {
        await page.goto(`${baseUrl}/${mode}/tooltip?profile=dark`);
        await page.locator('.frame').waitFor();
        if (mode === 'astylar') await page.waitForFunction(() => !!window.__ASTYLAR_MATERIAL_BENCHMARK__);
        const selector = mode === 'reference' ? '.mat-mdc-tooltip-surface' : '[data-astylar-id="tooltip-popup"]';
        const settle = async () => {
          if (mode === 'astylar') await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled());
          await page.evaluate(async () => { await document.fonts.ready;
            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); });
        };
        await settle();
        const point = await page.evaluate(mode => {
          if (mode === 'reference') {
            const box = document.getElementById('tooltip-primary').getBoundingClientRect();
            return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
          }
          const box = window.__ASTYLAR_MATERIAL_BENCHMARK__.measure(['tooltip-primary'], false).elements['tooltip-primary'].borderBox;
          const canvas = document.querySelector('canvas').getBoundingClientRect();
          return { x: canvas.x + box.left + box.width / 2, y: canvas.y + box.top + box.height / 2 };
        }, mode);
        const cycles = [];
        for (let cycle = 0; cycle < 3; cycle++) {
          await page.mouse.move(point.x, point.y);
          await page.locator(selector).waitFor({ state: 'visible' });
          await settle();
          assert.equal(await page.locator(selector).count(), 1);
          await page.mouse.move(10, 10);
          await page.locator(selector).waitFor({ state: 'detached' });
          await settle();
          cycles.push(await page.evaluate(mode => {
            if (mode === 'reference') return { popupCount: document.querySelectorAll('.mat-mdc-tooltip-surface').length };
            const surface = window.ng.getComponent(document.querySelector('app-astylar-showcase')).surface;
            const scene = surface.scene;
            return { popupCount: document.querySelectorAll('[data-astylar-id="tooltip-popup"]').length,
              tracked: surface.diagnostics.resources,
              live: { meshes: scene.meshes.length, materials: scene.materials.length, textures: scene.textures.length },
              unbound: scene.materials.filter(material => !scene.meshes.some(mesh => mesh.material === material))
                .map(material => ({ name: material.name, uniqueId: material.uniqueId })) };
          }, mode));
        }
        let disposal = null;
        if (mode === 'astylar') disposal = await page.evaluate(() => {
          const surface = window.ng.getComponent(document.querySelector('app-astylar-showcase')).surface;
          const scene = surface.scene;
          surface.dispose();
          return { disposed: surface.disposed, meshes: scene.meshes.length,
            materials: scene.materials.length, textures: scene.textures.length };
        });
        assert.deepEqual(errors, []);
        assert.ok(cycles.every(cycle => cycle.popupCount === 0));
        if (disposal) assert.deepEqual(disposal, { disposed: true, meshes: 0, materials: 0, textures: 0 });
        results[mode] = { cycles, disposal };
      } finally { await page.close(); }
    }
    t.diagnostic(JSON.stringify({ scope: 'ordinary dark mobile DPR2 three hover/leave cycles; not lifecycle acceptance', results }));
    assert.deepEqual(results.astylar.cycles.map(cycle => cycle.tracked.materials), [13, 13, 13]);
    assert.deepEqual(results.astylar.cycles.map(cycle => cycle.live.materials), [14, 15, 16],
      'Retain the live-material growth counterexample; this is not cleanup acceptance.');
  }, {}, { checkpointFile: 'artifacts/material-parity/current-full-20261005/checkpoint/manifest.json' });
});

test('held popup option boundaries capture active paint inputs before commit', async t => {
  await withFrozenShowcase(async (browser, baseUrl) => {
    const observations = [];
    for (const family of ['select', 'autocomplete', 'timepicker']) {
      for (const mode of ['reference', 'astylar']) {
        const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
        const errors = [];
        page.on('pageerror', error => errors.push(String(error)));
        await page.goto(`${baseUrl}/${mode}/${family}?benchmark=1&profile=light`);
        await page.locator('.frame').waitFor();
        const point = async id => mode === 'reference'
          ? page.locator(id === `${family}-control` ? `#${id}` : 'mat-option').first().evaluate(el => {
            const box = el.getBoundingClientRect(); return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
          }) : page.evaluate(id => {
            const box = window.__ASTYLAR_MATERIAL_BENCHMARK__.measure([id], false).elements[id].borderBox;
            const canvas = document.querySelector('canvas').getBoundingClientRect();
            return { x: canvas.x + box.left + box.width / 2, y: canvas.y + box.top + box.height / 2 };
          }, id);
        if (mode === 'astylar') {
          await page.waitForFunction(() => !!window.__ASTYLAR_MATERIAL_BENCHMARK__);
          await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled());
        }
        const opener = await point(`${family}-control`);
        await page.mouse.click(opener.x, opener.y);
        const firstId = family === 'select' ? 'select-option-solo' : family === 'autocomplete'
          ? 'autocomplete-option-cape-town' : 'timepicker-option-0';
        await page.locator(mode === 'reference' ? 'mat-option' : `[data-astylar-id="${firstId}"]`).first().waitFor();
        if (mode === 'astylar') await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled());
        const target = await point(firstId);
        await page.mouse.move(target.x, target.y);
        await page.mouse.down();
        await page.waitForTimeout(125);
        if (mode === 'astylar') await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled());
        const held = await page.evaluate(({ mode, firstId }) => {
          if (mode === 'astylar') {
            const api = window.__ASTYLAR_MATERIAL_BENCHMARK__, tree = api.measure([firstId], true).inputTree;
            const option = tree.nodes.find(node => node.authored?.id === firstId);
            return { count: tree.nodes.filter(node => node.authored?.role === 'option').length,
              background: option.resolvedStyle.background, selected: option.authored.ariaSelected,
              events: api.events().filter(event => event.targetId === firstId) };
          }
          const option = document.querySelector('mat-option');
          return { count: document.querySelectorAll('mat-option').length,
            active: option.matches(':active'), background: getComputedStyle(option).backgroundColor,
            selected: option.getAttribute('aria-selected'),
            ripples: [...option.querySelectorAll('.mat-ripple-element')].map(el => {
              const style = getComputedStyle(el);
              return { background: style.backgroundColor, opacity: style.opacity,
                width: style.width, height: style.height, transform: style.transform };
            }) };
        }, { mode, firstId });
        assert.equal(held.count, family === 'timepicker' ? 48 : 2);
        if (mode === 'reference') assert.equal(held.active, true);
        else assert.ok(held.events.some(event => event.type === 'pointerdown'), 'actual option must own the held pointer');
        observations.push({ family, mode, target, held });
        await page.mouse.up();
        assert.deepEqual(errors, []);
        await page.close();
      }
    }
    t.diagnostic(JSON.stringify({ browser: browser.version(), observations,
      claim: 'Actual held-option inputs after125ms plus candidate settlement before release,light desktop DPR1 only; not matched-time local-raster equivalence or ripple animation parity.' }));
  }, {}, { checkpointFile: 'artifacts/material-parity/current-full-20261005/checkpoint/manifest.json' });
});

test('retained popup hover inputs distinguish token alpha layers from opaque substitutions', t => {
  const bytes = readFileSync('artifacts/material-parity/current-full-20261005/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'),
    'ab42dbec6280e0e27784ec4bbc6697d4ea451bfab307bccb720c0dec89a83b62');
  const report = JSON.parse(bytes), observations = [];
  const load = receipt => {
    const bytes = readFileSync(receipt.file);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), receipt.sha256);
    return JSON.parse(bytes);
  };
  for (const family of ['select', 'autocomplete', 'timepicker']) {
    const rows = report.interactions.filter(row => row.family === family && row.state === 'open-hover-content');
    assert.equal(rows.length, 8);
    for (const row of rows) {
      const reference = load(row.inputTrees.reference), candidate = load(row.inputTrees.astylar);
      const options = reference.nodes.filter(node => node.type === 'mat-option');
      const custom = candidate.nodes.filter(node => node.authored?.role === 'option');
      assert.equal(options.length, family === 'timepicker' ? 48 : 2);
      assert.equal(custom.length, options.length);
      const first = options[0], target = custom[0];
      const hover = first.rules.map(index => reference.rules[index]).filter(rule =>
        rule.selector === '.mat-mdc-option:hover:not(.mdc-list-item--disabled)');
      assert.equal(hover.length, 1);
      assert.equal(hover[0].declarations['background-color'].value,
        'var(--mat-option-hover-state-layer-color, color-mix(in srgb, var(--mat-sys-on-surface) calc(var(--mat-sys-hover-state-layer-opacity) * 100%), transparent))');
      const focused = first.rules.map(index => reference.rules[index]).some(rule =>
        rule.selector === '.mat-mdc-option:focus.mdc-list-item, .mat-mdc-option.mat-mdc-option-active.mdc-list-item');
      assert.equal(focused, family === 'timepicker');
      assert.equal(reference.styles[first.style].backgroundColor,
        `color(srgb 0.113725 0.105882 0.117647 / ${focused ? '0.12' : '0.08'})`);
      assert.equal(first.attributes['aria-selected'], 'false');
      assert.equal(target.authored.ariaSelected, family === 'timepicker');
      assert.equal(target.resolvedStyle.background, '#e5dfe5');
      assert.equal(candidate.rules.filter(rule => rule.selector ===
        (family === 'timepicker' ? '.picker-option:hover' : '.select-option:hover') && rule.background === '#e5dfe5').length, 1);
      observations.push({ family, profile: row.profile, viewport: row.viewport,
        referenceBackground: reference.styles[first.style].backgroundColor,
        candidateBackground: target.resolvedStyle.background, focused,
        reference: row.inputTrees.reference, candidate: row.inputTrees.astylar });
    }
  }
  assert.equal(observations.length, 24);
  t.diagnostic(JSON.stringify({ observations,
    claim: 'Matched hover/active rules and unequal authored alpha versus opaque paint; no composited raster or held-click parity inferred.' }));
});

test('retained select indicator inputs preserve pseudo-checkbox versus plugin paint differences', t => {
  const reportFile = 'artifacts/material-parity/current-full-20261005/latest-report.json';
  const reportBytes = readFileSync(reportFile);
  assert.equal(createHash('sha256').update(reportBytes).digest('hex'),
    'ab42dbec6280e0e27784ec4bbc6697d4ea451bfab307bccb720c0dec89a83b62');
  const report = JSON.parse(reportBytes);
  const load = receipt => {
    const bytes = readFileSync(receipt.file);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), receipt.sha256);
    return JSON.parse(bytes);
  };
  const observations = [];
  for (const row of [...report.results, ...report.interactions].filter(row => row.family === 'select')) {
    const candidate = load(row.inputTrees.astylar);
    const checks = candidate.nodes.filter(node => node.authored?.id === 'select-check');
    if (!checks.length) continue;
    assert.equal(checks.length, 1);
    const check = checks[0];
    assert.equal(candidate.nodes.find(node => node.key === check.parent).authored.ariaSelected, true);
    const reference = load(row.inputTrees.reference);
    const marks = reference.nodes.filter(node => node.type === 'mat-pseudo-checkbox');
    assert.equal(marks.length, 1);
    const mark = marks[0];
    assert.equal(reference.nodes.find(node => node.key === mark.parent).attributes['aria-selected'], 'true');
    assert.equal(mark.attributes.appearance, 'minimal');
    const after = mark.pseudoElements.filter(pseudo => pseudo.pseudo === '::after');
    assert.equal(after.length, 1);
    assert.equal(after[0].generated, true);
    const host = reference.styles[mark.style], paint = reference.styles[after[0].style];
    assert.equal(host.width, '18px');
    assert.equal(host.height, '18px');
    assert.equal(host.position, 'relative');
    assert.equal(host.marginLeft, '16px');
    assert.equal(paint.width, '14px');
    assert.equal(paint.height, '6px');
    assert.equal(paint.borderBottomWidth, '2px');
    assert.equal(paint.borderBottomColor, 'rgb(75, 67, 87)');
    assert.equal(paint.transform, 'matrix(0.707107, -0.707107, 0.707107, 0.707107, 0, 0)');
    assert.equal(check.authored.type, 'showcase.material:check-mark');
    assert.deepEqual(check.authored.data, { 'indicator-color': '#49454f', 'stroke-width': 1.8 });
    assert.equal(check.resolvedStyle.width, '16px');
    assert.equal(check.resolvedStyle.height, '16px');
    assert.equal(check.resolvedStyle.position, 'absolute');
    assert.equal(check.resolvedStyle.top, '14px');
    assert.equal(check.resolvedStyle.right, '16px');
    observations.push({ profile: row.profile, viewport: row.viewport, state: row.state,
      reference: row.inputTrees.reference, candidate: row.inputTrees.astylar });
  }
  assert.equal(observations.length, 40);
  assert.deepEqual([...new Set(observations.map(row => row.state))].sort(),
    ['activate', 'activate-leave', 'open', 'open-commit-reopen', 'open-hover-content']);
  t.diagnostic(JSON.stringify({ observations,
    claim: 'Unequal captured indicator authoring and resolved inputs; not an equal-input core paint reproduction.' }));
});

test('popup token ancestry separates global fallback from frame theme overrides', async t => {
  const bytes = readFileSync('artifacts/material-parity/current-full-20261005/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'),
    'ab42dbec6280e0e27784ec4bbc6697d4ea451bfab307bccb720c0dec89a83b62');
  const rows = JSON.parse(bytes).interactions.filter(row =>
    ['select', 'autocomplete', 'timepicker'].includes(row.family) && row.state === 'open');
  assert.equal(rows.length, 24);
  await withFrozenShowcase(async (browser, baseUrl) => {
    const observations = [];
    for (const row of rows) {
      const { family, profile, viewport } = row;
      const retainedBytes = readFileSync(row.inputTrees.reference.file);
      assert.equal(createHash('sha256').update(retainedBytes).digest('hex'), row.inputTrees.reference.sha256);
      const retained = JSON.parse(retainedBytes);
      const frame = retained.nodes.find(node => node.key === 'frame');
      const option = retained.nodes.find(node => node.type === 'mat-option');
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: viewport.deviceScaleFactor });
      const errors = [];
      page.on('pageerror', error => errors.push(String(error)));
      await page.goto(`${baseUrl}/reference/${family}?benchmark=1&profile=${profile}`);
      await page.locator(`#${family}-control`).click();
      await page.locator('mat-option').first().waitFor();
      const observation = await page.evaluate(() => {
        const option = document.querySelector('mat-option');
        const selected = document.querySelector('mat-option[aria-selected="true"]');
        const label = selected?.querySelector('.mdc-list-item__primary-text');
        const properties = ['--mat-sys-on-surface', '--mat-sys-on-secondary-container',
          '--mat-sys-secondary-container', '--mat-option-label-text-color',
          '--mat-option-selected-state-label-text-color', '--mat-option-selected-state-layer-color'];
        const tokens = el => Object.fromEntries(properties.map(key => [key, getComputedStyle(el).getPropertyValue(key).trim()]));
        const ancestors = [];
        for (let el = option; el; el = el.parentElement)
          ancestors.push({ tag: el.tagName, class: el.className, tokens: tokens(el) });
        return { ancestors, frame: tokens(document.querySelector('.frame')),
          base: getComputedStyle(option).color, selectedInk: label ? getComputedStyle(label).color : null,
          selectedBackground: selected ? getComputedStyle(selected).backgroundColor : null };
      });
      assert.ok(observation.ancestors.some(x => x.class === 'cdk-overlay-container'));
      assert.ok(!observation.ancestors.some(x => String(x.class).split(' ').includes('frame')));
      const root = observation.ancestors.at(-1);
      assert.equal(root.tag, 'HTML');
      for (const ancestor of observation.ancestors)
        assert.deepEqual(ancestor.tokens, root.tokens, 'popup ancestry must retain global tokens without frame overrides');
      assert.equal(root.tokens['--mat-option-label-text-color'], '');
      assert.equal(root.tokens['--mat-option-selected-state-label-text-color'], '');
      assert.equal(root.tokens['--mat-option-selected-state-layer-color'], '');
      assert.equal(observation.base, retained.styles[option.style].color);
      assert.equal(observation.selectedInk, family === 'select' ? 'rgb(75, 67, 87)' : null);
      assert.equal(observation.selectedBackground, family === 'select' ? 'rgb(234, 222, 247)' : null);
      assert.equal(observation.frame['--mat-sys-on-surface'], frame.inline['--mat-sys-on-surface'].value);
      assert.deepEqual(errors, []);
      observations.push({ family, profile, viewport, receipt: row.inputTrees.reference, ...observation });
      await page.close();
    }
    for (const observation of observations)
      assert.deepEqual(observation.ancestors.at(-1).tokens, observations[0].ancestors.at(-1).tokens);
    t.diagnostic(JSON.stringify({ browser: browser.version(), observations,
      claim: 'Original reference popup ancestry and fallback provenance for24 configured desktop open cases; no candidate paint,mobile/tablet or full-case acceptance.' }));
  }, {}, { checkpointFile: 'artifacts/material-parity/current-full-20261005/checkpoint/manifest.json' });
});

async function withFrozenShowcase(run, launchOptions = {}, evidence = {}) {
  const browserRoot = path.resolve(process.env.ASTYLAR_MATERIAL_SHOWCASE_BROWSER_ROOT ??
    'examples/material-showcase/dist/material-showcase/browser');
  const checkpointFile = evidence.checkpointFile ?? process.env.ASTYLAR_MATERIAL_SHOWCASE_CHECKPOINT ??
    'artifacts/material-parity/caret-visible-checkpoint-154/checkpoint/manifest.json';
  const checkpoint = JSON.parse(readFileSync(checkpointFile));
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
    browser = await chromium.launch({ channel: 'chrome', headless: true, ...launchOptions });
    await run(browser, `http://127.0.0.1:${server.address().port}`);
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}
