import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import ts from 'typescript';
import { chromium } from 'playwright-core';
import { interactionLayerCursorProbe } from '../tests/material-parity/cursor-metrics.mjs';
import { openSupplementalCapture, parseSupplementalCaptureArguments } from '../tests/material-parity/supplemental-capture-evidence.mjs';

// Supplemental temporal evidence only: no source/fixture changes or replacement
// of the original capture. Boundary observations add round trips, recorded below.
const options = parseSupplementalCaptureArguments(process.argv.slice(2));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const script = 'scripts/capture-material-button-held-trace.mjs';
const surveyFile = 'docs/material-button-state-paint-survey.json';
const surveyBytes = readFileSync(surveyFile), survey = JSON.parse(surveyBytes);
const originalBytes = readFileSync(survey.capture.file);
assert.equal(hash(originalBytes), survey.capture.sha256);
for (const source of survey.sourceFingerprints)
  assert.equal(hash(readFileSync(source.file, 'utf8').replaceAll('\r\n', '\n')), source.sha256);
const original = JSON.parse(originalBytes);
const rows = survey.observations.filter(row => row.state === 'held' && row.element === `${row.family}-primary`);
assert.equal(rows.length, 57);
const runner = 'tests/material-parity/run-material-parity.mjs', source = readFileSync(runner, 'utf8');
const parsed = ts.createSourceFile(runner, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
assert.equal(parsed.parseDiagnostics.length, 0);
const names = ['profileTheme', 'sendShowcaseCommand', 'waitForThemeApplied', 'settleInteraction',
  'setBenchmarkPhase', 'interactionTargetBox', 'popupHoverBox', 'performInteraction',
  'openInteractionPage', 'waitForAstylarBenchmark'];
const declarations = names.map(name => {
  const matches = parsed.statements.filter(node => ts.isFunctionDeclaration(node) && node.name?.text === name);
  assert.equal(matches.length, 1); return matches[0].getText(parsed);
});
const helpers = new Function('assert', 'interactionLayerCursorProbe', 'baseUrl', declarations.join('\n') +
  '; return {openInteractionPage,performInteraction,setBenchmarkPhase,settleInteraction};')(
  assert, interactionLayerCursorProbe, options.baseUrl);

async function installEvents(page) {
  await page.evaluate(() => {
    window.__MATERIAL_HELD_NATIVE_TRACE__ = [];
    for (const type of ['pointermove', 'pointerdown', 'pointerup', 'pointercancel', 'gotpointercapture',
      'lostpointercapture', 'mousedown', 'mouseup', 'click', 'focus', 'blur']) {
      document.addEventListener(type, event => {
        const target = event.target;
        window.__MATERIAL_HELD_NATIVE_TRACE__.push({ type, time: performance.now(), trusted: event.isTrusted,
          buttons: event.buttons, pointerId: event.pointerId, x: event.clientX, y: event.clientY,
          target: target instanceof Element ? { tag: target.tagName, id: target.id,
            astylarId: target.getAttribute('data-astylar-id') } : null });
      }, true);
    }
  });
}

async function snapshot(page, mode, id, stage) {
  return page.evaluate(({ mode, id, stage }) => {
    const active = document.activeElement;
    const base = { stage, time: performance.now(), activeElement: active instanceof Element
      ? { tag: active.tagName, id: active.id, astylarId: active.getAttribute('data-astylar-id') } : null,
      nativeEvents: [...window.__MATERIAL_HELD_NATIVE_TRACE__] };
    if (mode === 'reference') {
      const element = document.getElementById(id);
      const layer = element?.querySelector('.mat-mdc-button-persistent-ripple');
      return { ...base, active: element?.matches(':active'), hovered: element?.matches(':hover'),
        background: element ? getComputedStyle(element).backgroundColor : null,
        layerOpacity: layer ? getComputedStyle(layer, '::before').opacity : null };
    }
    const benchmark = window.__ASTYLAR_MATERIAL_BENCHMARK__;
    const measured = benchmark.measure([id], false), diagnostics = measured.diagnostics.surface;
    const element = measured.elements[id];
    return { ...base, interaction: diagnostics.interaction, session: diagnostics.session,
      reconciliation: diagnostics.reconciliation, appState: benchmark.state(),
      events: benchmark.events(), borderBox: element?.borderBox,
      normal: element?.normalResolvedStyle, interactionStyle: element?.interactionResolvedStyle,
      effective: element?.resolvedStyle };
  }, { mode, id, stage });
}

const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const evidence = openSupplementalCapture({ options, browser, script, styleProperties: [] });
  const sources = [runner, 'tests/material-parity/cursor-metrics.mjs', 'node_modules/typescript/lib/typescript.js']
    .map(file => ({ file, sha256: hash(readFileSync(file)) }));
  const results = [];
  for (const row of rows) {
    const entries = original.interactions.filter(entry => `${entry.family}/${entry.profile}/${entry.viewport.id}/${entry.state}` === row.case);
    assert.equal(entries.length, 1);
    const entry = entries[0], { family, profile, viewport } = entry;
    assert.deepEqual(entry.inputTrees, row.inputTrees);
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: viewport.deviceScaleFactor, colorScheme: profile === 'dark' ? 'dark' : 'light', reducedMotion: 'reduce' });
    // Install provenance observation before the original helper navigates.
    const finishers = new Map();
    context.on('page', page => finishers.set(page, evidence.observe(page)));
    try {
      const reference = await helpers.openInteractionPage(context, 'reference', entry);
      const astylar = await helpers.openInteractionPage(context, 'astylar', entry);
      const pages = [['reference', reference.page], ['astylar', astylar.page]], stages = [];
      for (const [, page] of pages) await installEvents(page);
      const record = async stage => {
        const values = await Promise.all(pages.map(([mode, page]) => snapshot(page, mode, row.element, stage)));
        stages.push({ stage, reference: values[0], astylar: values[1] });
      };
      await helpers.setBenchmarkPhase(reference.page, 'start');
      await helpers.setBenchmarkPhase(astylar.page, 'start');
      await record('start-command');
      const releases = await Promise.all(pages.map(([mode, page]) => helpers.performInteraction(page, mode, entry)));
      assert.ok(releases.every(release => typeof release === 'function'));
      await record('after-pointer-down');
      await Promise.all(pages.map(([, page]) => helpers.setBenchmarkPhase(page, 'held')));
      await record('after-held-command');
      await Promise.all(pages.map(([mode, page]) => helpers.settleInteraction(page, mode)));
      await record('after-settlement');
      await astylar.page.evaluate(async id => {
        const benchmark = window.__ASTYLAR_MATERIAL_BENCHMARK__;
        await benchmark.waitForSettled(); benchmark.measure([id]);
      }, row.element);
      await record('after-authored-measurement');
      const screenshots = await Promise.all(pages.map(async ([mode, page]) => {
        const file = `${evidence.directory}/${hash(row.case)}-${mode}.png`;
        const bytes = await page.screenshot({ path: file, animations: 'disabled' });
        return { mode, file, sha256: hash(bytes) };
      }));
      await record('after-screenshot-before-release');
      for (const release of releases) await release();
      await record('after-explicit-release');
      await Promise.all(pages.map(([mode, page]) => helpers.settleInteraction(page, mode)));
      await record('after-release-settlement');
      assert.deepEqual(reference.errors, []); assert.deepEqual(astylar.errors, []);
      const runtime = Object.fromEntries(await Promise.all(pages.map(async ([mode, page]) => [mode, await finishers.get(page)()])));
      const result = { case: row.case, element: row.element, family, profile, viewport,
        originalInputTrees: row.inputTrees, originalInteraction: entry.resourceSnapshots.at(-1).surface.interaction,
        originalPaint: { normal: row.candidate.normal, interaction: row.candidate.interaction, effective: row.candidate.effective },
        stages, screenshots, runtime, historicalTimingProven: false, rendererCauseProven: false, inputEquivalent: false };
      const file = `${evidence.directory}/${hash(row.case)}.json`, bytes = JSON.stringify(result);
      writeFileSync(file, bytes, { flag: 'wx' }); results.push({ case: row.case, file, sha256: hash(bytes) });
      console.log(JSON.stringify({ case: row.case, stages: stages.map(s => ({ stage: s.stage,
        pressed: s.astylar.interaction.pressedElementId ?? null, revision: s.astylar.session.revision,
        background: s.astylar.effective?.background, nativeUps: s.astylar.nativeEvents.filter(e => e.type === 'pointerup').length })) }));
    } finally { await context.close(); }
  }
  writeFileSync(`${evidence.directory}/latest-report.json`, JSON.stringify({ schemaVersion: 1,
    kind: 'shared-button-held-state-temporal-replay', capture: evidence.capture, browser: browser.version(),
    survey: { file: surveyFile, sha256: hash(surveyBytes) }, originalCapture: survey.capture, sources,
    reusedFunctions: names.map((name, i) => ({ name, sha256: hash(declarations[i]) })), cases: results.length, results,
    historicalTimingProven: false, rendererCauseProven: false, inputEquivalent: false,
    limitation: 'Fresh paired-page replay of original actions and frozen assets. Added read-only boundary observations introduce round trips. Native event trace distinguishes explicit release from pre-release loss; historical timing, neutral observer behavior, and a minimal public core reproduction are not established.' }, null, 2) + '\n', { flag: 'wx' });
} finally { await browser.close(); }
