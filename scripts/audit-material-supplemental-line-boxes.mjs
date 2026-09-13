import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { collectCalendarCloseEvidence } from '../tests/material-parity/calendar-close-evidence.mjs';
import { collectTooltipStateEvidence } from '../tests/material-parity/tooltip-state-evidence.mjs';
import { collectFullTreeInventory, collectControlTypographyEvidence } from '../tests/material-parity/input-equivalence-audit.mjs';
import { captureControlLineBox, hasControlTextOwners } from '../tests/material-parity/control-line-box-evidence.mjs';
import { captureBrowserInputTree } from '../tests/material-parity/input-tree-evidence.mjs';
import { propertyGroups } from '../tests/material-parity/input-equivalence-policy.mjs';
import { openSupplementalCapture } from '../tests/material-parity/supplemental-capture-evidence.mjs';
import { parseSupplementalLineBoxArguments, supplementalLineBoxSequences, supplementalLineBoxCaseKey,
  driveSupplementalLineBoxStep } from '../tests/material-parity/supplemental-line-box-evidence.mjs';

// Reference-only observations. Original paired state captures remain intact;
// the consolidated audit must not consume this until an independent reader
// verifies sources, exact owner/state bindings, metrics and original provenance.
const options = parseSupplementalLineBoxArguments(process.argv.slice(2));
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const manifest = JSON.parse(readFileSync(path.join(options.checkpoint, 'manifest.json')));
const sourceOptions = { supplementalRoot: options.supplementalRoot, expectedProvenance: manifest.provenance };
const sources = [collectCalendarCloseEvidence(process.cwd(), sourceOptions), collectTooltipStateEvidence(process.cwd(), sourceOptions)];
for (const source of sources) { assert.equal(source.complete, true); assert.deepEqual(source.errors, []); }
const cases = sources.flatMap(source => source.cases), sequences = supplementalLineBoxSequences(cases);
const inventory = collectFullTreeInventory(cases), control = collectControlTypographyEvidence(cases, inventory);
assert.deepEqual(inventory.errors, []);
const targets = control.comparisons.filter(target => target.properties.lineHeight.reference === 'normal');
assert.equal(targets.length, 46, 'Changed target cohort requires review');
const properties = Object.values(propertyGroups).flat();
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const evidence = openSupplementalCapture({ options, browser, script: 'scripts/audit-material-supplemental-line-boxes.mjs', styleProperties: properties });
  const measurementSources = ['tests/material-parity/supplemental-line-box-evidence.mjs',
    'tests/material-parity/control-line-box-evidence.mjs', 'tests/material-parity/input-equivalence-audit.mjs',
    'tests/material-parity/input-equivalence-policy.mjs', 'tests/material-parity/calendar-close-evidence.mjs',
    'tests/material-parity/tooltip-state-evidence.mjs'].map(file => {
    const bytes = readFileSync(file), sha256 = digest(bytes), snapshot = `${evidence.directory}/source-${sha256}.txt`;
    writeFileSync(snapshot, bytes, { flag: 'wx' });
    return { file, sha256, snapshot };
  });
  const sourceReports = sources.map(source => ({ file: source.file, sha256: source.sha256 }));
  const results = [];
  for (const sequence of sequences) {
    const page = await browser.newPage({ viewport: sequence.viewport, deviceScaleFactor: sequence.dpr });
    const finishRuntime = evidence.observe(page);
    const samples = [];
    try {
      await page.addInitScript(() => {
        window.__supplementalLineBoxEvents = [];
        for (const type of ['pointermove', 'pointerover', 'pointerout', 'pointerdown', 'pointerup', 'click', 'keydown', 'focusin', 'focusout']) {
          document.addEventListener(type, event => window.__supplementalLineBoxEvents.push({ type, trusted: event.isTrusted,
            id: event.target.id ?? '', tag: event.target.tagName ?? '', key: event.key ?? null,
            clientX: event.clientX ?? null, clientY: event.clientY ?? null }), true);
        }
      });
      await page.goto(`${options.baseUrl}/reference/${sequence.family}?${sequence.query}`);
      await page.locator('app-reference .frame').waitFor();
      await settle(page, sequence.family);
      let triggerBox;
      if (sequence.family === 'datepicker') {
        await page.locator('#datepicker-primary mat-datepicker-toggle button').click();
        await page.locator('.mat-datepicker-content-animating').waitFor({ state: 'hidden' });
        if (sequence.view === 'multi-year') await page.locator('.mat-calendar-period-button').click();
        await page.locator(sequence.view === 'month' ? 'mat-month-view' : 'mat-multi-year-view').waitFor();
      } else triggerBox = await page.locator('#tooltip-primary').boundingBox();
      for (const [index, entry] of sequence.entries.entries()) {
        await driveSupplementalLineBoxStep(page, sequence.family, index, triggerBox);
        await settle(page, sequence.family);
        const key = supplementalLineBoxCaseKey(entry), pending = targets.filter(target => target.case === key);
        const originalBytes = readFileSync(entry.inputTrees.reference.file);
        assert.equal(digest(originalBytes), entry.inputTrees.reference.sha256);
        const original = JSON.parse(originalBytes);
        if (pending.length) await page.waitForFunction(hasControlTextOwners, { targets: pending.map(target => {
          const node = original.nodes.find(n => n.key === target.referenceNode); assert.ok(node);
          return { referenceNode: node.key, type: node.type, ownText: node.ownText };
        }) }, { timeout: 5000 });
        const state = await page.evaluate(() => {
          const close = document.querySelector('.mat-datepicker-close-button');
          const popup = document.querySelector('.mat-mdc-tooltip-surface');
          return { calendarOpen: !!document.querySelector('.mat-datepicker-content'),
            activeIsClose: !!close && close === document.activeElement,
            openerFocused: document.activeElement === document.querySelector('#datepicker-primary mat-datepicker-toggle button'),
            tooltipPresent: !!popup, tooltipShown: !!popup?.parentElement.classList.contains('mat-mdc-tooltip-show'),
            activeId: document.activeElement?.id ?? '', events: structuredClone(window.__supplementalLineBoxEvents) };
        });
        if (sequence.family === 'datepicker') {
          assert.equal(state.calendarOpen, entry.reference.open);
          assert.equal(state.activeIsClose, entry.reference.activeIsClose);
          assert.equal(state.openerFocused, entry.reference.openerFocused);
        } else {
          assert.equal(Number(state.tooltipPresent), entry.reference.popupCount);
          assert.equal(state.tooltipShown, entry.reference.referenceShown);
        }
        const tree = await page.evaluate(captureBrowserInputTree, { styleProperties: properties });
        assert.deepEqual(tree.errors, []);
        const measurements = [];
        for (const target of pending) {
          const captured = original.nodes.find(n => n.key === target.referenceNode);
          let node = tree.nodes.find(n => n.key === target.referenceNode);
          assert.ok(captured && node && captured.type === node.type && captured.ownText === node.ownText, `Changed owner ${key}/${target.element}`);
          const chain = [], seen = new Set();
          while (node) {
            assert.ok(!seen.has(node.key)); seen.add(node.key);
            chain.unshift({ key: node.key, parent: node.parent, type: node.type, attributes: node.attributes, ownText: node.ownText });
            node = tree.nodes.find(n => n.key === node.parent);
          }
          const measurement = await page.evaluate(captureControlLineBox, { chain, expectedStyle: original.styles[captured.style] });
          measurements.push({ element: target.element, ...measurement,
            checkpointReferenceNode: target.referenceNode, checkpointCandidateNode: target.astylarNode,
            checkpointPaint: target.properties.lineHeight.painted, checkpointTypography: target.properties });
        }
        const stem = `${evidence.directory}/${digest(key)}`, treeBytes = JSON.stringify(tree);
        const screenshot = await page.screenshot({ animations: 'disabled' });
        writeFileSync(`${stem}-reference.json`, treeBytes, { flag: 'wx' });
        writeFileSync(`${stem}.png`, screenshot, { flag: 'wx' });
        samples.push({ case: key, family: entry.family, state: entry.state, profile: entry.profile, viewport: entry.viewport,
          query: sequence.query, view: sequence.view ?? null, cohort: sequence.cohort ?? null, actionIndex: index,
          triggerBox: triggerBox ?? null, originalInputTrees: entry.inputTrees,
          inputTree: { file: `${stem}-reference.json`, sha256: digest(treeBytes) },
          screenshot: { file: `${stem}.png`, sha256: digest(screenshot) }, ...state, measurements });
      }
      const runtime = await finishRuntime();
      for (const sample of samples) {
        const file = `${evidence.directory}/${digest(sample.case)}.json`, bytes = JSON.stringify({ ...sample, runtime });
        writeFileSync(file, bytes, { flag: 'wx' });
        results.push({ case: sample.case, file, sha256: digest(bytes), observations: sample.measurements.length });
      }
      console.log(JSON.stringify({ family: sequence.family, view: sequence.view, cohort: sequence.cohort, dpr: sequence.dpr,
        states: samples.map(sample => ({ state: sample.state, measurements: sample.measurements.map(m => ({ element: m.element, naturalHeight: m.naturalHeight, paint: m.checkpointPaint })) })) }));
    } finally { await page.close(); }
  }
  assert.equal(results.length, cases.length);
  assert.equal(results.reduce((sum, result) => sum + result.observations, 0), targets.length);
  writeFileSync(`${evidence.directory}/latest-report.json`, JSON.stringify({ schemaVersion: 1, browser: browser.version(),
    capture: evidence.capture, sourceReports, measurementSources, cases: cases.length, observations: targets.length,
    scope: 'Reference-only natural CSS line boxes for the complete original supplemental calendar-close and tooltip-state sequences. Original paired trees/paint remain unchanged. No automatic attribution, equivalent-input, popup-position, visibility or final-raster acceptance.',
    results }, null, 2) + '\n', { flag: 'wx' });
} finally { await browser.close(); }

async function settle(page, family) {
  await page.evaluate(async () => { await document.fonts.ready; await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); });
  if (family === 'tooltip') await page.waitForTimeout(250);
}
