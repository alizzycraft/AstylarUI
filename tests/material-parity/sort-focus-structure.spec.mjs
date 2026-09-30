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

test('slider pointer-down ownership is measured at both visual thumb centers', async () => {
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
          return {
            boundary,
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

test('datepicker keyboard opening and pointer month/date boundaries locate calendar authoring gaps', async () => {
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
        document.addEventListener('keydown', event => window.__calendarAuditKeys.push(event.key), true);
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
          await page.waitForFunction(() => document.activeElement?.classList.contains('mat-calendar-body-cell'));
          await page.waitForFunction(() => {
            const popup = document.querySelector('mat-datepicker-content');
            return popup && !popup.classList.contains('mat-datepicker-content-animating');
          });
        }
        if (mode === 'reference' && key === 'Escape')
          await page.locator('mat-datepicker-content').waitFor({ state: 'detached' });
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

test('dark mobile overlay cycles retain focus and semantic cleanup boundaries', async () => {
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
          return { focus: active?.getAttribute('data-astylar-id') || active?.getAttribute('data-parity-id') || active?.id || (active?.tagName === 'BODY' ? 'BODY' : active?.textContent?.trim()) || active?.tagName,
            popupCount: mode === 'reference' ? document.querySelectorAll(refSelector).length : document.querySelectorAll(`[data-astylar-id="${family === 'menu' ? 'menu-popup' : `${family}-overlay`}"]`).length,
            controls: popup ? [...popup.querySelectorAll('button,a')].map(node => node.getAttribute('data-astylar-id') || node.getAttribute('data-parity-id') || node.textContent.trim()) : [],
            canvases: document.querySelectorAll('canvas').length,
            open: mode === 'astylar' ? window.__ASTYLAR_MATERIAL_BENCHMARK__.state().open : null };
        }, { mode, family });
        const cycles = [];
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
        observations[family][mode] = { cycles, errors };
        await page.close();
      }
    }
    assert.equal(browser.version(), '154.0.8037.58');
    const referenceFocus = { menu: 'Rename', 'bottom-sheet': 'Share', dialog: 'dialog-cancel' };
    const referenceControls = { menu: ['Rename', 'Delete'], 'bottom-sheet': ['Share', 'Copy link'], dialog: ['dialog-cancel', 'dialog-save'] };
    const candidateControls = { menu: ['menu-rename', 'menu-delete'], 'bottom-sheet': ['bottom-sheet-dismiss', 'bottom-sheet-copy'], dialog: ['dialog-cancel', 'dialog-save'] };
    for (const family of ['menu', 'bottom-sheet', 'dialog']) {
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
