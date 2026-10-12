import assert from 'node:assert/strict';
import { existsSync, readFileSync, mkdirSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import { chromium } from 'playwright-core';
import { PNG } from 'pngjs';
import { materialInteractionCases } from '../tests/material-parity/benchmark.config.mjs';
import { interactionLayerCursorProbe } from '../tests/material-parity/cursor-metrics.mjs';
import { fingerprintDirectory, materialBrowserLaunchOptions } from '../tests/material-parity/run-checkpoint.mjs';

// Observe the missing raw boundary using unchanged configured actions and the
// runner's unchanged native listener. No comparator or authored state changes.
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const requested = process.argv.slice(2);
assert.ok(requested.length <= 1 && requested.every(arg => ['--keyboard-only', '--disabled-keyboard-only', '--disabled-pointer-only', '--disabled-slider-motion-only', '--slider-state-layer-only'].includes(arg)),
  'Usage: node scripts/audit-material-raw-control-events.mjs [--keyboard-only|--disabled-keyboard-only|--disabled-pointer-only|--disabled-slider-motion-only|--slider-state-layer-only]');
const sliderPaintOnly = requested.includes('--slider-state-layer-only');
const disabledKeyboardOnly = requested.includes('--disabled-keyboard-only');
const sliderMotionOnly = requested.includes('--disabled-slider-motion-only');
const disabledPointerOnly = requested.includes('--disabled-pointer-only') || sliderMotionOnly;
const disabledProbe = disabledKeyboardOnly || disabledPointerOnly;
const keyboardOnly = requested.includes('--keyboard-only') || disabledKeyboardOnly;
const sorterFile = 'tests/material-parity/sort-focus-structure.spec.mjs';
const sorterBytes = readFileSync(sorterFile);
assert.equal(hash(sorterBytes), '1afa971226301b8c6f01e3923099a0889ff1e4924a95da412f974217a85f0583');
const sorter = ts.createSourceFile(sorterFile, sorterBytes.toString(), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const helper = sorter.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'withFrozenShowcase').getText(sorter);
assert.equal(hash(helper), '603ac9ca88b9bf2e3443f8be65f125d39002e1ca4e5157487d9ac86ed7d2527f');
const frozen = new Function('assert', 'path', 'readFileSync', 'fingerprintDirectory', 'createServer', 'existsSync', 'chromium',
  `${helper}; return withFrozenShowcase;`)(assert, path, readFileSync, fingerprintDirectory, createServer, existsSync, chromium);
const runnerFile = 'tests/material-parity/run-material-parity.mjs';
const runnerBytes = readFileSync(runnerFile);
assert.equal(hash(runnerBytes), '584cdfc8b115e1a8c23834fe939ae6b3d4ff98bca25d61304a094a637825cc4e');
const runner = ts.createSourceFile(runnerFile, runnerBytes.toString(), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const names = ['profileTheme', 'sendShowcaseCommand', 'waitForThemeApplied', 'waitForAstylarBenchmark',
  'settleInteraction', 'setBenchmarkPhase', 'openInteractionPage', 'performInteraction', 'interactionTargetBox',
  'sliderDragCoordinates', 'readSliderValues', 'compareEvents'];
const bodies = names.map(name => {
  const declaration = runner.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name);
  assert.ok(declaration, name);
  return declaration.getText(runner);
}).join('\n');
async function readSliderCenters(page, mode) {
  return page.evaluate(mode => {
    if (mode === 'reference') return [...document.querySelectorAll('mat-slider mat-slider-visual-thumb')].map(node => {
      const box = node.getBoundingClientRect(); return box.x + box.width / 2;
    });
    // Same read-only rendered-center projection as the existing held geometry
    // diagnostic. These are observations, never layout or hit calculations.
    const surface = window.ng.getComponent(document.querySelector('app-astylar-showcase')).surface;
    const scene = surface.scene, engine = scene.getEngine(), canvas = engine.getRenderingCanvas();
    const bounds = canvas.getBoundingClientRect(), transform = scene.getTransformMatrix();
    const viewport = scene.activeCamera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight());
    return ['start', 'end'].map(name => {
      const mesh = scene.meshes.find(mesh => mesh.name.endsWith(`-${name}-thumb`));
      if (!mesh) throw new Error(`Missing rendered ${name} thumb`);
      mesh.computeWorldMatrix(true);
      const center = mesh.getAbsolutePosition();
      return bounds.x + center.constructor.Project(center, transform.constructor.IdentityReadOnly,
        transform, viewport).x * bounds.width / engine.getRenderWidth();
    });
  }, mode);
}
const observedBodies = sliderMotionOnly
  ? `${bodies.replace('async function readSliderValues(', 'async function readSliderScalarValues(')}\n${readSliderCenters.toString()}\n`
    + 'async function readSliderValues(page, mode) { return { ...await readSliderScalarValues(page, mode), thumbCenters: await readSliderCenters(page, mode) }; }'
  : bodies;
const checkpointFile = 'artifacts/material-parity/selection-pointer-directions-20261011/checkpoint/manifest.json';
const checkpointBytes = readFileSync(checkpointFile);
assert.equal(hash(checkpointBytes), '2aac425d216cdb274ebff0876f2fa365c9ab6e845ed1b1c3b30d9e1bbcaea5c8');
const checkpoint = JSON.parse(checkpointBytes);
for (const file of ['tests/material-parity/benchmark.config.mjs', 'tests/material-parity/cursor-metrics.mjs',
  'tests/material-parity/run-checkpoint.mjs', runnerFile]) {
  assert.equal(hash(readFileSync(file)), checkpoint.provenance.harnessFiles.find(row => row.file === file)?.sha256, file);
}
const cases = materialInteractionCases.filter(row => ['checkbox', 'slider'].includes(row.family)
  && (!sliderPaintOnly || (row.family === 'slider' && row.profile === 'light' && row.viewport.deviceScaleFactor === 1))
  && (!sliderMotionOnly || row.family === 'slider')
  && (sliderPaintOnly ? ['hover', 'held'].includes(row.state) : disabledProbe ? row.state === 'disabled' : keyboardOnly ? row.state === 'focus'
    : ['activate', 'activate-leave', 'drag-start', 'drag-end'].includes(row.state))
  // Existing disabled-composite evidence already covers this exact context.
  && !(disabledKeyboardOnly && row.family === 'checkbox' && row.profile === 'light' && row.viewport.deviceScaleFactor === 1));
assert.equal(cases.length, sliderPaintOnly ? 2 : sliderMotionOnly ? 8 : disabledKeyboardOnly ? 15 : disabledPointerOnly ? 16 : keyboardOnly ? 16 : 50);
assert.equal(cases.filter(row => row.family === 'checkbox').length, sliderPaintOnly || sliderMotionOnly ? 0 : disabledKeyboardOnly ? 7 : disabledPointerOnly ? 8 : keyboardOnly ? 8 : 16);
assert.equal(cases.filter(row => row.family === 'slider').length, sliderPaintOnly ? 2 : disabledProbe || keyboardOnly ? 8 : 34);
const start = performance.now();
console.log(JSON.stringify({ scriptSha256: hash(readFileSync('scripts/audit-material-raw-control-events.mjs')),
  sorterFile, sorterSha256: hash(sorterBytes), helperSha256: hash(helper), runnerFile,
  runnerSha256: hash(runnerBytes), actionBodiesSha256: hash(bodies), observedBodiesSha256: hash(observedBodies), checkpointFile,
  checkpointSha256: hash(checkpointBytes), cases: cases.length, keyboardOnly, disabledKeyboardOnly, disabledPointerOnly, sliderMotionOnly, sliderPaintOnly, acceptance: false }));
await frozen(async (browser, baseUrl) => {
  const actions = new Function('assert', 'baseUrl', 'interactionLayerCursorProbe',
    `${observedBodies}; return { ${names.join(',')} };`)(assert, baseUrl, interactionLayerCursorProbe);
  let captured = 0;
  for (const benchmarkCase of cases) {
    const { family, profile, viewport, state } = benchmarkCase;
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: viewport.deviceScaleFactor, colorScheme: profile === 'dark' ? 'dark' : 'light', reducedMotion: 'reduce' });
    try {
      const reference = await actions.openInteractionPage(context, 'reference', benchmarkCase);
      const candidate = await actions.openInteractionPage(context, 'astylar', benchmarkCase);
      const snapshot = (page, mode) => page.evaluate(({ family, mode }) => {
        const api = window.__ASTYLAR_MATERIAL_BENCHMARK__;
        const current = mode === 'reference'
          ? window.ng.getComponent(document.querySelector('app-reference')).store.state() : api.state();
        const ids = family === 'checkbox' ? ['checkbox-primary-input'] : ['slider-start', 'slider-primary'];
        return { state: { selected: current.selected, sliderStart: current.sliderStart, sliderValue: current.sliderValue,
            disabled: current.disabled },
          focusedOwner: document.activeElement?.getAttribute('data-astylar-id') || document.activeElement?.id || document.activeElement?.tagName,
          controls: ids.map(id => {
            const target = mode === 'reference' ? document.getElementById(id)
              : document.querySelector(`[data-astylar-id="${id === 'checkbox-primary-input' ? 'checkbox-primary' : id}"]`);
            return { id: target?.id || target?.getAttribute('data-astylar-id'), tag: target?.tagName,
              role: target?.getAttribute('role'), type: target instanceof HTMLInputElement ? target.type : null,
              value: target?.value, checked: target instanceof HTMLInputElement ? target.checked : target?.getAttribute('aria-checked'),
              disabled: target instanceof HTMLInputElement ? target.disabled : target?.getAttribute('aria-disabled'),
              tabindex: target?.tabIndex,
              min: target?.min, max: target?.max, step: target?.step };
          }), events: mode === 'reference' ? window.__MATERIAL_REFERENCE_EVENTS__ : api.events() };
      }, { family, mode });
      const before = { reference: await snapshot(reference.page, 'reference'), astylar: await snapshot(candidate.page, 'astylar') };
      await actions.setBenchmarkPhase(reference.page, 'start');
      await actions.setBenchmarkPhase(candidate.page, 'start');
      const keyboardBoundaries = [];
      const pointerBoundaries = [];
      if (disabledPointerOnly) {
        // The configured disabled action is a no-op. Reuse the owning active
        // pointer procedures on pages whose initial authored disabled state is
        // unchanged, rather than treating their static appearance as blocking.
        for (const action of family === 'checkbox' ? ['activate'] : ['drag-start', 'drag-end']) {
          const actionCase = { ...benchmarkCase, state: action };
          await Promise.all([actions.performInteraction(reference.page, 'reference', actionCase),
            actions.performInteraction(candidate.page, 'astylar', actionCase)]);
          await Promise.all([actions.settleInteraction(reference.page, 'reference'), actions.settleInteraction(candidate.page, 'astylar')]);
          pointerBoundaries.push({ action, reference: await snapshot(reference.page, 'reference'),
            astylar: await snapshot(candidate.page, 'astylar'),
            ...(sliderMotionOnly ? { dragTraces: {
              reference: await reference.page.evaluate(() => window.__MATERIAL_SLIDER_DRAG_TRACE__),
              astylar: await candidate.page.evaluate(() => window.__MATERIAL_SLIDER_DRAG_TRACE__),
            }, releasedCenters: { reference: await readSliderCenters(reference.page, 'reference'),
              astylar: await readSliderCenters(candidate.page, 'astylar') } } : {}) });
        }
      } else if (keyboardOnly) {
        // Retain the established trusted-key sequences, now with actual native
        // listeners. This diagnoses missing raw ordering, not configured focus
        // gate acceptance: ordinary focus actions are deliberately not invoked.
        const keys = family === 'checkbox' ? ['Tab', 'Space']
          : ['Tab', 'ArrowRight', 'ArrowRight', 'ArrowRight', 'Tab', 'ArrowLeft', 'ArrowLeft', 'ArrowLeft'];
        for (const key of keys) {
          await Promise.all([reference.page.keyboard.press(key), candidate.page.keyboard.press(key)]);
          await Promise.all([actions.settleInteraction(reference.page, 'reference'), actions.settleInteraction(candidate.page, 'astylar')]);
          keyboardBoundaries.push({ key, reference: await snapshot(reference.page, 'reference'),
            astylar: await snapshot(candidate.page, 'astylar') });
        }
      } else {
        await Promise.all([actions.performInteraction(reference.page, 'reference', benchmarkCase),
          actions.performInteraction(candidate.page, 'astylar', benchmarkCase)]);
      }
      await Promise.all([actions.setBenchmarkPhase(reference.page, 'settled'), actions.setBenchmarkPhase(candidate.page, 'settled')]);
      await Promise.all([actions.settleInteraction(reference.page, 'reference'), actions.settleInteraction(candidate.page, 'astylar')]);
      const paintBoundary = {};
      if (sliderPaintOnly) {
        const directory = `artifacts/material-parity/slider-live-state-layers-20261012/${state}`;
        assert.ok(!existsSync(directory), 'Never overwrite a retained paint observation');
        mkdirSync(directory, { recursive: true });
        for (const [mode, opened] of [['reference', reference], ['astylar', candidate]]) {
          const page = opened.page;
          const layers = await page.evaluate(mode => {
            if (mode === 'reference') return [...document.querySelectorAll('mat-slider .mat-ripple-element')].map(node => {
              const style = getComputedStyle(node), box = node.getBoundingClientRect();
              return { class: node.className, background: style.backgroundColor, opacity: style.opacity,
                width: box.width, height: box.height, active: node.closest('mat-slider')?.matches(':active') };
            });
            const surface = window.ng.getComponent(document.querySelector('app-astylar-showcase')).surface;
            return surface.scene.meshes.filter(mesh => /-(start|end)-state-layer$/.test(mesh.name)).map(mesh => {
              const material = mesh.material;
              return { name: mesh.name, alpha: material?.alpha, diffuse: material?.diffuseColor?.asArray(),
                emissive: material?.emissiveColor?.asArray(), visibility: mesh.visibility,
                enabled: mesh.isEnabled(), transparencyMode: material?.transparencyMode };
            });
          }, mode);
          const drag = await actions.sliderDragCoordinates(page, mode, 'end');
          assert.ok(drag);
          const screenshot = `${directory}/${mode}.png`;
          const buffer = await page.screenshot({ path: screenshot });
          const png = PNG.sync.read(buffer);
          // These four observations lie outside the 10px thumb and inside the
          // 24px state disc. They are local color evidence, not raster fidelity.
          const samples = [[-18, 0], [18, 0], [0, -18], [0, 18]].map(([dx, dy]) => {
            const x = Math.round(drag.from.x + dx), y = Math.round(drag.from.y + dy);
            assert.ok(x >= 0 && y >= 0 && x < png.width && y < png.height);
            const offset = (y * png.width + x) * 4;
            return { x, y, rgba: [...png.data.subarray(offset, offset + 4)] };
          });
          paintBoundary[mode] = { layers, screenshot, sha256: hash(buffer), samples };
        }
      }
      const after = { reference: await snapshot(reference.page, 'reference'), astylar: await snapshot(candidate.page, 'astylar') };
      assert.deepEqual(reference.errors, []);
      assert.deepEqual(candidate.errors, []);
      for (const side of ['reference', 'astylar']) {
        assert.ok(Array.isArray(after[side].events), `${side} actual listener output required`);
        assert.equal(after[side].controls.length, family === 'checkbox' ? 1 : 2);
        assert.ok(after[side].controls.every(control => control.tag));
      }
      const compared = actions.compareEvents(after.reference.events, after.astylar.events, family, state);
      console.log(JSON.stringify({ case: benchmarkCase, before, after, compared, keyboardOnly, disabledKeyboardOnly,
        disabledPointerOnly, sliderMotionOnly, sliderPaintOnly, paintBoundary, keyboardBoundaries, pointerBoundaries, errors: [],
        browser: browser.version(), elapsedMs: performance.now() - start, acceptance: false }));
      captured++;
    } finally { await context.close(); }
  }
  assert.equal(captured, cases.length);
}, materialBrowserLaunchOptions(), { checkpointFile });
assert.equal(hash(readFileSync(sorterFile)), hash(sorterBytes));
assert.equal(hash(readFileSync(runnerFile)), hash(runnerBytes));
console.log(JSON.stringify({ result: 'PASS', captured: cases.length, keyboardOnly, disabledKeyboardOnly, disabledPointerOnly, sliderMotionOnly, sliderPaintOnly,
  elapsedMs: performance.now() - start, acceptance: false }));
