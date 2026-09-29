import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { captureBrowserInputTree } from '../tests/material-parity/input-tree-evidence.mjs';
import { propertyGroups } from '../tests/material-parity/input-equivalence-policy.mjs';
import { openSupplementalCapture, parseSupplementalCaptureArguments } from '../tests/material-parity/supplemental-capture-evidence.mjs';

// Supplemental observations only. Never focus(), set values/selections, change
// native input types, or alter the frozen application's styles or renderer.
const options = parseSupplementalCaptureArguments(process.argv.slice(2));
const properties = Object.values(propertyGroups).flat();
const families = ['form-field', 'input', 'autocomplete', 'datepicker', 'timepicker'];
const values = { 'form-field': 'Atlas', input: 'team@example.com', autocomplete: 'Cape Town',
  datepicker: '09/03/2026', timepicker: '10:30 AM' };
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [];
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
try {
  const evidence = openSupplementalCapture({ options, browser,
    script: 'scripts/audit-material-input-boundaries.mjs', styleProperties: properties });
  for (const family of families) for (const dpr of [1, 2]) {
    const paired = new Map();
    for (const mode of ['reference', 'astylar']) {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: dpr });
      const finishRuntime = evidence.observe(page), samples = [];
      const id = `${family}-control`;
      try {
        await page.addInitScript(() => {
          window.__inputBoundaryEvents = [];
          for (const type of ['focusin', 'focusout', 'pointerdown', 'pointerup', 'keydown', 'input', 'change'])
            document.addEventListener(type, event => window.__inputBoundaryEvents.push({ type,
              trusted: event.isTrusted, key: event.key ?? null, id: event.target?.id ?? null,
              owner: event.target?.getAttribute?.('data-astylar-id') ?? null }), true);
        });
        await page.goto(`${options.baseUrl}/${mode}/${family}?benchmark=1&profile=light&interaction=audit-input-boundaries`);
        await page.locator('.frame').waitFor();
        if (mode === 'astylar') await page.waitForFunction(() => !!window.__ASTYLAR_MATERIAL_BENCHMARK__);
        const sample = async (state, action) => {
          await settle(page, mode);
          const observation = await observe(page, mode, id);
          const tree = mode === 'reference'
            ? await page.evaluate(captureBrowserInputTree, { styleProperties: properties })
            : await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.measure([]).inputTree);
          assert.ok(tree.nodes.length && tree.errors.length === 0, `Incomplete ${family}/${mode}/${state} tree`);
          const box = observation.box;
          assert.ok(box && box.width > 0 && box.height > 0, `Missing ${family}/${mode} control bounds`);
          const clip = { x: Math.max(0, box.x - 16), y: Math.max(0, box.y - 16),
            width: Math.min(1440, box.x + box.width + 16) - Math.max(0, box.x - 16),
            height: Math.min(900, box.y + box.height + 16) - Math.max(0, box.y - 16) };
          assert.ok(clip.width > 0 && clip.height > 0);
          const stem = `${evidence.directory}/${family}-dpr${dpr}-${mode}-${state}`;
          const bytes = Buffer.from(JSON.stringify(tree)), pixels = await page.screenshot({ clip });
          writeFileSync(`${stem}-input-tree.json`, bytes, { flag: 'wx' });
          writeFileSync(`${stem}.png`, pixels, { flag: 'wx' });
          if (!paired.has(state)) paired.set(state, { family, profile: 'light',
            viewport: { width: 1440, height: 900, deviceScaleFactor: dpr }, state, action });
          const row = { observation, inputTree: { file: `${stem}-input-tree.json`, sha256: digest(bytes) },
            screenshot: { file: `${stem}.png`, sha256: digest(pixels), clip },
            limitation: 'Control state and mesh existence are not proof of visible caret/selection paint. Inspect timed local rasters.' };
          paired.get(state)[mode] = row; samples.push(row);
        };
        await sample('initial', 'navigate');
        await page.keyboard.press('Tab');
        await sample('keyboard-focus', 'Tab');
        const box = (await observe(page, mode, id)).box;
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        await sample('pointer-focus', 'click control center');
        await page.keyboard.press('Control+A'); await page.keyboard.press('Backspace');
        for (let i = 0; i < 4; i++) {
          if (i) await page.waitForTimeout(200);
          await sample(`focused-empty-${i}`, i ? 'wait 200ms' : 'Control+A, Backspace');
        }
        await page.keyboard.type(values[family]);
        await sample('typed', `type ${values[family]}`);
        await page.keyboard.press('Home');
        for (let i = 0; i < 3; i++) await page.keyboard.press('Shift+ArrowRight');
        await sample('selection-forward', 'Home, Shift+ArrowRight x3');
        await page.keyboard.press('End');
        for (let i = 0; i < 3; i++) await page.keyboard.press('Shift+ArrowLeft');
        await sample('selection-backward', 'End, Shift+ArrowLeft x3');
        await page.mouse.click(10, 10);
        await sample('blur', 'click 10,10');
        const runtime = await finishRuntime();
        for (const row of samples) row.runtime = runtime;
      } finally { await page.close(); }
    }
    assert.equal(paired.size, 11);
    results.push(...paired.values());
    console.log(JSON.stringify({ family, dpr, boundaries: paired.size,
      typing: ['reference', 'astylar'].map(side => ({ side, value: paired.get('typed')[side].observation.control.value })),
      runtimeErrors: [...paired.values()].flatMap(r => [...r.reference.runtime.errors, ...r.astylar.runtime.errors]).length }));
  }
  assert.equal(results.length, 110);
  writeFileSync(`${evidence.directory}/latest-report.json`, JSON.stringify({ schemaVersion: 1,
    browser: browser.version(), capture: evidence.capture, results,
    scope: 'Five unchanged Material text-input families; light desktop, DPR 1/2, eleven real-action boundaries. Diagnostic evidence, not complete state/profile coverage or visual acceptance.',
    inputEquivalent: false, renderingEquivalent: false }, null, 2) + '\n', { flag: 'wx' });
} finally { await browser.close(); }

async function settle(page, mode) {
  if (mode === 'astylar') await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled());
  await page.evaluate(async () => { await document.fonts.ready;
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); });
}

async function observe(page, mode, id) {
  return page.evaluate(({ mode, id }) => {
    const node = mode === 'reference' ? document.getElementById(id)
      : document.querySelector(`[data-astylar-id="${id}"]`);
    const active = document.activeElement;
    let box, control;
    if (mode === 'reference') {
      box = node.getBoundingClientRect().toJSON();
      control = { type: node.type, value: node.value, focused: active === node,
        selectionStart: node.selectionStart, selectionEnd: node.selectionEnd,
        selectionDirection: node.selectionDirection, scrollLeft: node.scrollLeft,
        caretColor: getComputedStyle(node).caretColor };
    } else {
      const surface = window.ng.getComponent(document.querySelector('app-astylar-showcase')).surface;
      const input = surface.host.inputElementService.getInputElement(id);
      if (!input) throw Error(`No registered input ${id}`);
      const measured = window.__ASTYLAR_MATERIAL_BENCHMARK__.measure([id], false).elements[id]?.borderBox;
      const canvas = document.querySelector('canvas').getBoundingClientRect();
      box = measured && { x: canvas.x + measured.left, y: canvas.y + measured.top,
        width: measured.width, height: measured.height };
      const mesh = input.cursorMesh;
      const state = mesh => ({ name: mesh.name, enabled: mesh.isEnabled(), visible: mesh.isVisible,
        visibility: mesh.visibility, disposed: mesh.isDisposed() });
      control = { type: input.type, value: input.value, focused: input.focused,
        selectionStart: input.selectionStart ?? null, selectionEnd: input.selectionEnd ?? null,
        cursorPosition: input.cursorPosition ?? null, scrollLeft: input.scrollOffset ?? null,
        caretMesh: mesh ? state(mesh) : null,
        selectionMeshes: surface.scene.meshes.filter(m => m.metadata?.highlight?.ownerElementId === id).map(state) };
    }
    return { box, control, sampledAt: performance.now(), active: { id: active?.id ?? null,
      owner: active?.getAttribute('data-astylar-id'), tag: active?.tagName },
      events: structuredClone(window.__inputBoundaryEvents) };
  }, { mode, id });
}
