import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { openSupplementalCapture, parseSupplementalCaptureArguments, validateSupplementalCapture } from './supplemental-capture-evidence.mjs';
import { collectSupplementalBehavior, collectSupplementalOverlays, collectSupplementalSlider,
  collectFullTreeInventory, validateCalendarCloseInventory, validateTooltipStateInventory } from './input-equivalence-audit.mjs';
import { validateCalendarCloseCapture, collectCalendarCloseEvidence } from './calendar-close-evidence.mjs';
import { validateTooltipStateCapture, collectTooltipStateEvidence } from './tooltip-state-evidence.mjs';
import { propertyGroups } from './input-equivalence-policy.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const script = 'scripts/audit-material-picker-commits.mjs';
const sourceFiles = [script, 'tests/material-parity/supplemental-capture-evidence.mjs', 'tests/material-parity/input-tree-evidence.mjs'];
const propertyNames = ['fontFamily', 'lineHeight', 'direction'];
const assetTypes = ['document', 'script', 'stylesheet', 'font'];
const assetFiles = ['index.csr.html', 'main.js', 'styles.css', 'media/font.woff2'];
const args = ['--base-url=http://127.0.0.1:4431', '--checkpoint=artifacts/material-parity/run/checkpoint',
  '--output=artifacts/material-parity/fresh/picker-commit-audit'];

function tooltipStateFixture() {
  const f = fixture(), raw = f.raw, runtime = structuredClone(raw.results[0].reference.runtime);
  Object.assign(raw, { schemaVersion: 1, profile: 'light', viewport: { width: 1440, height: 1000 },
    cohorts: ['benchmark-open', 'benchmark-hover', 'ordinary'], actions: ['initial', 'hover', 'press', 'release', 'leave'], settleDelayMs: 250 });
  raw.capture.styleProperties = Object.values(propertyGroups).flat();
  raw.capture.sources = ['scripts/audit-material-tooltip-state.mjs', ...sourceFiles.slice(1)].map(file => f.put(file, file));
  raw.results = [1, 2].flatMap(deviceScaleFactor => raw.cohorts.flatMap(cohort => {
    const events = [];
    return raw.actions.map(action => {
      const x = action === 'leave' ? 1 : 120, y = action === 'leave' ? 1 : 120;
      for (const type of ({ initial: [], hover: ['pointermove'], press: ['pointerdown'], release: ['pointerup', 'click'], leave: ['pointermove'] })[action])
        events.push({ type, trusted: true, clientX: x, clientY: y });
      const entry = { family: 'tooltip', deviceScaleFactor, cohort, action };
      for (const side of ['reference', 'astylar']) {
        const ref = side === 'reference', present = ref ? ['hover', 'press'].includes(action)
          : action === 'release' || (cohort !== 'benchmark-open' && ['hover', 'press'].includes(action));
        const tree = { nodes: [{ key: 'trigger', parent: null, ...(ref
          ? { type: 'button', attributes: { id: 'tooltip-primary', mattooltip: 'Create a project' } }
          : { authored: { id: 'tooltip-primary', type: 'button', value: 'Hover for help' } }) }], errors: [] };
        if (ref && present) tree.nodes.push({ key: 'wrapper', parent: null, attributes: { class: 'mat-mdc-tooltip-show' } },
          { key: 'popup', parent: 'wrapper', attributes: { class: 'mat-mdc-tooltip-surface' }, ownText: 'Create a project' });
        if (!ref) {
          Object.assign(tree, { resolvedStyleEvidenceVersion: 2, resolvedStyleSource: 'core-style-inspection', resolvedStyleRevision: 0 });
          if (present) tree.nodes.push({ key: 'popup', parent: null, authored: { id: 'tooltip-popup', role: 'tooltip', textContent: 'Create a project' },
            retainedText: { source: 'core-text-registry' } });
        }
        const stem = `artifacts/material-parity/fresh/picker-commit-audit/${deviceScaleFactor}-${cohort}-${action}-${side}`;
        const png = Buffer.alloc(24); Buffer.from('89504e470d0a1a0a', 'hex').copy(png);
        png.writeUInt32BE(1440 * deviceScaleFactor, 16); png.writeUInt32BE(1000 * deviceScaleFactor, 20);
        f.bytes.set(path.resolve(f.options.root, `${stem}.png`), png);
        entry[side] = { runtime: structuredClone(runtime), events: structuredClone(events),
          triggerBox: { x: 100, y: 100, width: 40, height: 40 }, popupCount: Number(present), retainedPopupCount: Number(!ref && present),
          referencePopup: ref && present ? { text: 'Create a project' } : null, referenceShown: ref && present,
          candidateOpen: !ref && present, candidatePopupBox: !ref && present ? { left: 100, top: 140, width: 100, height: 24 } : null,
          inputTree: f.put(`${stem}.json`, tree), screenshot: { file: `${stem}.png`, sha256: hash(png) } };
      }
      entry.presenceMatches = entry.reference.popupCount === entry.astylar.popupCount;
      return entry;
    });
  }));
  return f;
}

test('tooltip state evidence verifies all real action boundaries and preserves benchmark versus ordinary mismatches', () => {
  const f = tooltipStateFixture(), before = JSON.stringify(f.raw), result = validateTooltipStateCapture(f.raw, f.options);
  assert.deepEqual(result.errors, []); assert.equal(result.complete, true); assert.equal(result.binding.status, 'checkpoint-bound');
  assert.equal(result.observations.length, 30); assert.equal(result.observations.filter(o => !o.presenceMatches).length, 10);
  assert.equal(result.observations.filter(o => o.cohort === 'ordinary' && !o.presenceMatches).length, 2);
  assert.ok(result.observations.every(o => !o.inputEquivalent && !o.finalRasterVerified));
  assert.equal(JSON.stringify(f.raw), before);
});

test('tooltip state evidence rejects incomplete false-state altered-artifact and synthetic-action claims', () => {
  const mutations = [
    f => { f.raw.results.pop(); },
    f => { f.raw.results[1].cohort = 'ordinary'; },
    f => { f.raw.results[1].action = 'initial'; },
    f => { f.raw.results[1].deviceScaleFactor = 3; },
    f => { f.raw.settleDelayMs = 0; },
    f => { f.raw.profile = 'dark'; },
    f => { f.raw.viewport.width = 1400; },
    f => { f.raw.capture.sources.pop(); },
    f => { f.raw.results[3].presenceMatches = true; },
    f => { f.raw.results[3].astylar.candidateOpen = false; },
    f => { f.raw.results[3].astylar.popupCount = 0; },
    f => { f.raw.results[3].astylar.retainedPopupCount = 0; },
    f => { f.raw.results[3].astylar.candidatePopupBox = null; },
    f => { f.raw.results[1].reference.referenceShown = false; },
    f => { f.raw.results[1].reference.referencePopup.text = 'Other'; },
    f => { f.raw.results[1].reference.events = []; },
    f => { f.raw.results[1].astylar.events[0].trusted = false; },
    f => { f.raw.results[4].astylar.events.at(-1).clientX = 500; },
    f => { f.raw.results[3].astylar.events = f.raw.results[3].astylar.events.filter(e => e.type !== 'pointerup'); },
    f => { f.raw.results[2].reference.events[0].type = 'pointerout'; },
    f => { f.raw.results[1].astylar.triggerBox.width = 0; },
    f => { f.raw.results[1].astylar.runtime.errors.push('bad runtime'); },
    f => { f.raw.results[1].astylar.screenshot = f.raw.results[0].astylar.screenshot; },
    f => { f.put(f.raw.results[1].astylar.screenshot.file, 'changed'); },
    f => { const e = f.raw.results[3].astylar; const tree = JSON.parse(f.options.readBytes(path.resolve(f.options.root, e.inputTree.file)));
      tree.nodes.pop(); e.inputTree = f.put(e.inputTree.file, tree); },
    f => { const e = f.raw.results[3].astylar; const tree = JSON.parse(f.options.readBytes(path.resolve(f.options.root, e.inputTree.file)));
      tree.nodes[0].authored.value = 'Wrong trigger'; e.inputTree = f.put(e.inputTree.file, tree); },
    f => { const e = f.raw.results[1].reference; const tree = JSON.parse(f.options.readBytes(path.resolve(f.options.root, e.inputTree.file)));
      tree.nodes[1].attributes.class = 'mat-mdc-tooltip-hide'; e.inputTree = f.put(e.inputTree.file, tree); },
  ];
  for (const [i, mutate] of mutations.entries()) {
    const f = tooltipStateFixture(); mutate(f);
    assert.equal(validateTooltipStateCapture(f.raw, f.options).complete, false, `control ${i}`);
  }
});

function collectedTooltipFixture() {
  const f = tooltipStateFixture();
  for (const entry of f.raw.results) for (const side of ['reference', 'astylar']) {
    const item = entry[side], tree = JSON.parse(f.options.readBytes(path.resolve(f.options.root, item.inputTree.file)));
    tree.schemaVersion = 1; tree.styles = [{ color: '#123456' }]; tree.rules = [];
    for (const node of tree.nodes) {
      if (side === 'reference') Object.assign(node, { style: 0, rules: [], pseudoElements: [] });
      else Object.assign(node, { resolvedStyle: { color: '#123456' }, normalResolvedStyle: { color: '#123456' },
        interactionResolvedStyle: { color: '#123456' } });
    }
    item.inputTree = f.put(item.inputTree.file, tree);
  }
  f.put(f.options.reportFile, f.raw);
  const supplemental = collectTooltipStateEvidence(f.options.root, { ...f.options, reportPath: f.options.reportFile });
  assert.deepEqual(supplemental.errors, []);
  const cases = supplemental.cases.map(entry => ({ ...entry, inputTrees: Object.fromEntries(['reference', 'astylar'].map(side =>
    [side, JSON.parse(f.options.readBytes(path.resolve(f.options.root, entry.inputTrees[side].file)))])) }));
  return { ...f, report: { generatedFrom: { captureProvenance: f.options.expectedProvenance }, supplementalTooltipState: supplemental,
    elementInventory: collectFullTreeInventory(cases, { root: f.options.root }) } };
}

test('tooltip state collector keeps all cohorts and every action source tree in the consolidated inventory', () => {
  const f = collectedTooltipFixture(), e = f.report.supplementalTooltipState, before = JSON.stringify(f.report), errors = [];
  assert.equal(e.complete, true); assert.equal(e.cases.length, 30); assert.equal(e.reviews.length, 30); assert.equal(e.mismatches.length, 10);
  assert.deepEqual(e.missing, []); assert.equal(f.report.elementInventory.cases.length, 60);
  assert.equal(new Set(e.cases.map(c => `${c.viewport.id}/${c.state}`)).size, 30);
  assert.deepEqual([...new Set(e.cases.map(c => c.cohort))], ['benchmark-open', 'benchmark-hover', 'ordinary']);
  for (const c of e.cases) { assert.equal(c.inputEquivalent, false); assert.equal(c.finalRasterVerified, false);
    for (const side of ['reference', 'astylar']) assert.deepEqual(c.inputTrees[side], c[side].inputTree); }
  validateTooltipStateInventory(f.report, errors, f.options);
  assert.deepEqual(errors, []); assert.equal(JSON.stringify(f.report), before);
});

test('tooltip state inventory replay rejects removed boundaries changed source values and fabricated acceptance', () => {
  const mutations = [
    f => { delete f.report.supplementalTooltipState; },
    f => { f.report.supplementalTooltipState.cases.pop(); },
    f => { f.report.supplementalTooltipState.mismatches = []; },
    f => { f.report.supplementalTooltipState.reviews[0].inputEquivalent = true; },
    f => { f.report.supplementalTooltipState.cases[0].reference.events.push({ type: 'fake' }); },
    f => { f.report.supplementalTooltipState.cases[0].cohort = 'ordinary'; },
    f => { f.report.generatedFrom.captureProvenance.browser = 'other'; },
    f => { delete f.report.elementInventory; },
    f => { f.report.elementInventory.cases.pop(); },
    f => { f.report.elementInventory.cases.push(structuredClone(f.report.elementInventory.cases[0])); },
    f => { f.report.elementInventory.cases[0].case = 'static:tooltip@light/desktop'; },
    f => { f.report.elementInventory.cases[1].resolvedStyleRevision = 99; },
    f => { f.report.elementInventory.styles[0].value.color = 'fake'; },
    f => { f.report.elementInventory.variants[0].nodes[0].parent = 'other'; },
    f => { f.report.elementInventory.variants[0].side = 'astylar'; },
    f => { f.report.elementInventory.variants.find(v => v.side === 'astylar').nodes[0].authored.value = 'Other'; },
    f => { f.report.elementInventory.variants.find(v => v.nodes.some(n => n.retainedText)).nodes.find(n => n.retainedText).retainedText.source = 'other'; },
  ];
  for (const [i, mutate] of mutations.entries()) {
    const f = collectedTooltipFixture(); mutate(f); const errors = [];
    validateTooltipStateInventory(f.report, errors, f.options);
    assert.ok(errors.length, `control ${i}`);
  }
});

test('tooltip state collector fails closed for invalid or incomplete bound captures and missing reports', () => {
  const f = tooltipStateFixture(); f.raw.results.pop(); f.put(f.options.reportFile, f.raw);
  const result = collectTooltipStateEvidence(f.options.root, { ...f.options, reportPath: f.options.reportFile });
  assert.equal(result.complete, false); assert.deepEqual(result.cases, []); assert.equal(result.missing.length, 30); assert.ok(result.errors.length);
  const missing = collectTooltipStateEvidence(f.options.root, { reportPath: f.options.reportFile, readBytes: () => {
    throw Object.assign(new Error('missing'), { code: 'ENOENT' }); } });
  assert.equal(missing.binding.status, 'missing'); assert.equal(missing.complete, false); assert.equal(missing.cases.length, 0);
  const escaped = collectTooltipStateEvidence(f.options.root, { ...f.options, reportPath: '../outside/latest-report.json' });
  assert.equal(escaped.binding.status, 'invalid'); assert.equal(escaped.cases.length, 0);
});

function calendarFixture() {
  const f = fixture();
  const raw = f.raw;
  raw.schemaVersion = 1;
  raw.profile = 'light';
  raw.viewport = { width: 1440, height: 900 };
  raw.capture.styleProperties = Object.values(propertyGroups).flat();
  raw.capture.sources = ['scripts/audit-material-calendar-close.mjs', ...sourceFiles.slice(1)].map(file => f.put(file, file));
  const runtime = structuredClone(raw.results[0].reference.runtime);
  raw.results = [1, 2].flatMap(deviceScaleFactor => ['month', 'multi-year'].map(view => {
    const sides = {};
    for (const side of ['reference', 'astylar']) {
      const events = [{ type: 'click', trusted: true, close: false }];
      const samples = ['opened', 'tab-close', 'blur-close', 'refocus-close', 'activate-close'].map((state, i) => {
        const isRef = side === 'reference', focused = isRef && (i === 1 || i === 3), closed = isRef && i === 4;
        const key = [null, 'Tab', 'Shift+Tab', 'Tab', 'Enter'][i];
        if (i) events.push({ type: 'keydown', key: i === 4 ? 'Enter' : 'Tab', trusted: true, close: isRef && i === 4 });
        if (focused) events.push({ type: 'focusin', trusted: true, close: true });
        if (isRef && i === 2) events.push({ type: 'focusout', trusted: true, close: true });
        if (closed) events.push({ type: 'click', trusted: true, close: true });
        const clip = focused ? 'auto' : 'rect(0px, 0px, 0px, 0px)';
        const tree = { schemaVersion: 1, nodes: [{ key: 'root', parent: null }], rules: [], errors: [], styles: [{ clip }] };
        if (isRef && !closed) tree.nodes.push(
          { key: 'dialog', parent: 'root', type: 'div', attributes: { role: 'dialog', 'aria-modal': 'true', class: 'mat-datepicker-content-container' } },
          { key: 'view', parent: 'dialog', type: view === 'month' ? 'mat-month-view' : 'mat-multi-year-view' },
          { key: 'close', parent: 'dialog', type: 'button', attributes: { type: 'button',
            class: `mat-datepicker-close-button${focused ? '' : ' cdk-visually-hidden'}` }, style: 0 },
          { key: 'label', parent: 'close', type: 'span', attributes: { class: 'mdc-button__label' }, ownText: 'Close calendar' });
        if (!isRef) {
          Object.assign(tree, { resolvedStyleEvidenceVersion: 2, resolvedStyleSource: 'core-style-inspection', resolvedStyleRevision: 0 });
          tree.nodes.push({ key: 'popup', parent: 'root', authored: { id: 'datepicker-popup', role: 'dialog' } });
          for (const id of ['datepicker-icon', 'datepicker-header', 'datepicker-month', 'datepicker-previous', 'datepicker-next']) {
            tree.nodes.push({ key: id, parent: 'popup', authored: { id } });
          }
          tree.nodes.push({ key: 'grid', parent: 'popup', authored: { id: view === 'month' ? 'datepicker-grid' : 'datepicker-year-grid' } });
          for (let n = 0; n < (view === 'month' ? 30 : 24); n++) tree.nodes.push({ key: `cell${n}`, parent: 'grid', authored: { type: 'button' } });
        }
        for (const node of tree.nodes) {
          if (isRef) Object.assign(node, { rules: [], pseudoElements: [], style: 0 });
          else {
            node.authored ??= {};
            Object.assign(node, { resolvedStyle: { color: '#123456' }, normalResolvedStyle: { color: '#123456' },
              interactionResolvedStyle: { color: '#123456' } });
          }
        }
        const stem = `artifacts/material-parity/fresh/picker-commit-audit/${view}-${deviceScaleFactor}-${side}-${state}`;
        const png = Buffer.alloc(24);
        Buffer.from('89504e470d0a1a0a', 'hex').copy(png);
        png.writeUInt32BE(1440 * deviceScaleFactor, 16);
        png.writeUInt32BE(900 * deviceScaleFactor, 20);
        f.bytes.set(path.resolve(f.options.root, `${stem}.png`), png);
        return { state, key, open: !closed, openerFocused: closed, activeIsClose: focused,
          active: { tag: 'button', text: focused ? 'Close calendar' : '12', label: closed ? 'Open calendar' : null,
            class: 'mat-calendar-body-cell' }, controls: [], events: structuredClone(events),
          close: isRef && !closed ? { text: 'Close calendar', clip, clipPath: 'none', position: 'absolute', display: 'flex',
            visibility: 'visible', opacity: '1', box: { left: 65, top: 599, width: 142, height: 40 } } : null,
          inputTree: f.put(`${stem}.json`, tree), screenshot: { file: `${stem}.png`, sha256: hash(png) } };
      });
      sides[side] = { samples, runtime: structuredClone(runtime) };
    }
    return { family: 'datepicker', view, deviceScaleFactor, sides };
  }));
  return f;
}

test('calendar close live evidence requires both views, DPRs, all action boundaries and bound artifacts', () => {
  const { raw, options } = calendarFixture();
  const before = JSON.stringify(raw);
  const result = validateCalendarCloseCapture(raw, options);
  assert.deepEqual(result.errors, []);
  assert.equal(result.binding.status, 'checkpoint-bound');
  assert.equal(result.complete, true);
  assert.equal(result.cases.length, 4);
  assert.ok(result.cases.every(c => c.referenceFocusRevealBlurAndCloseVerified && c.referenceFocusRestorationVerified &&
    c.candidateAuthoredCloseControlAbsent && !c.inputEquivalent && !c.finalRasterVerified));
  assert.equal(JSON.stringify(raw), before);
});

test('calendar close evidence rejects incomplete, mismapped, fabricated or changed action records', () => {
  const mutations = [
    f => f.raw.results.pop(),
    f => { f.raw.results[1].view = 'month'; },
    f => { f.raw.profile = 'dark'; },
    f => { f.raw.results[0].sides.reference.samples.pop(); },
    f => { f.raw.results[0].sides.reference.samples[1].key = 'Enter'; },
    f => { f.raw.results[0].sides.reference.samples[1].activeIsClose = false; },
    f => { f.raw.results[0].sides.reference.samples[1].close.clip = 'rect(0px, 0px, 0px, 0px)'; },
    f => { f.raw.results[0].sides.reference.samples[1].close.box.top = 1000; },
    f => { f.raw.results[0].sides.reference.samples[1].close.opacity = '0'; },
    f => { f.raw.results[0].sides.reference.samples[4].open = true; },
    f => { f.raw.results[0].sides.reference.samples[4].openerFocused = false; },
    f => { f.raw.results[0].sides.reference.samples[4].events.at(-1).trusted = false; },
    f => { f.raw.results[0].sides.reference.samples[2].events.at(-1).close = false; },
    f => { f.raw.results[0].sides.reference.samples[1].events = []; },
    f => { f.raw.results[0].sides.astylar.samples[0].controls.push({ text: 'Close calendar' }); },
    f => { f.raw.results[0].sides.astylar.samples[4].open = false; },
    f => { f.raw.results[0].sides.astylar.runtime.errors.push('bad runtime'); },
    f => { f.raw.capture.sources.pop(); },
    f => { f.raw.results[0].sides.reference.samples[1].screenshot = f.raw.results[0].sides.reference.samples[0].screenshot; },
    f => { const s = f.raw.results[0].sides.reference.samples[1]; f.bytes.get(path.resolve(f.options.root, s.screenshot.file))[0] = 0; },
    f => { f.raw.results[0].sides.reference.samples[1].inputTree.sha256 = '0'.repeat(64); },
  ];
  for (const mutate of mutations) {
    const f = calendarFixture(); mutate(f);
    const result = validateCalendarCloseCapture(f.raw, f.options);
    assert.ok(result.errors.length, String(mutate));
    assert.equal(result.complete, false);
    assert.deepEqual(result.cases, [], 'An invalid capture must not retain partial accepted cases');
  }
});

test('calendar close evidence replays current trees instead of trusting scalar absence and clipping claims', () => {
  const mutations = [
    ['reference', tree => { tree.styles[0].clip = 'auto'; }],
    ['reference', tree => { tree.nodes.find(n => n.key === 'close').parent = 'root'; }],
    ['reference', tree => { tree.nodes.find(n => n.key === 'view').type = 'mat-multi-year-view'; }],
    ['reference', tree => { tree.nodes.find(n => n.key === 'label').ownText = 'Other action'; }],
    ['astylar', tree => { tree.resolvedStyleEvidenceVersion = 1; }],
    ['astylar', tree => { tree.resolvedStyleSource = 'fixture'; }],
    ['astylar', tree => { tree.resolvedStyleRevision = -1; }],
    ['astylar', tree => { tree.nodes.push({ key: 'missing', authored: { type: 'button', ariaLabel: 'Close calendar' } }); }],
    ['astylar', tree => { tree.nodes = tree.nodes.filter(n => n.key !== 'grid'); }],
    ['astylar', tree => { tree.nodes = tree.nodes.filter(n => !n.key.startsWith('cell')); }],
    ['astylar', tree => { tree.nodes.push(structuredClone(tree.nodes[0])); }],
  ];
  for (const [side, mutate] of mutations) {
    const f = calendarFixture(), sample = f.raw.results[0].sides[side].samples[0];
    const tree = JSON.parse(f.options.readBytes(path.resolve(f.options.root, sample.inputTree.file)));
    mutate(tree);
    sample.inputTree = f.put(sample.inputTree.file, tree);
    const result = validateCalendarCloseCapture(f.raw, f.options);
    assert.ok(result.errors.length, String(mutate));
    assert.equal(result.complete, false);
  }
});

function collectedCalendarFixture() {
  const f = calendarFixture();
  f.put(f.options.reportFile, f.raw);
  const supplemental = collectCalendarCloseEvidence(f.options.root, { ...f.options, reportPath: f.options.reportFile });
  assert.deepEqual(supplemental.errors, []);
  const inputCases = supplemental.cases.map(entry => ({ ...entry, inputTrees: Object.fromEntries(['reference', 'astylar'].map(side =>
    [side, JSON.parse(f.options.readBytes(path.resolve(f.options.root, entry.inputTrees[side].file)))])) }));
  const report = { generatedFrom: { captureProvenance: f.options.expectedProvenance },
    supplementalCalendarClose: supplemental, elementInventory: collectFullTreeInventory(inputCases, { root: f.options.root }) };
  return { ...f, report };
}

test('calendar close collector keeps all twenty paired boundaries and every source snapshot in the inventory', () => {
  const f = collectedCalendarFixture(), evidence = f.report.supplementalCalendarClose;
  assert.equal(evidence.cases.length, 20);
  assert.equal(evidence.reviews.length, 4);
  assert.equal(evidence.mismatches.length, 4);
  assert.equal(evidence.complete, true);
  assert.deepEqual(evidence.missing, []);
  assert.equal(new Set(evidence.cases.map(c => `${c.viewport.id}/${c.state}`)).size, 20);
  assert.equal(f.report.elementInventory.cases.length, 40);
  const before = JSON.stringify(f.report), errors = [];
  validateCalendarCloseInventory(f.report, errors, f.options);
  assert.deepEqual(errors, []);
  assert.equal(JSON.stringify(f.report), before);
  for (const entry of evidence.cases) {
    assert.equal(entry.inputEquivalent, false);
    assert.equal(entry.finalRasterVerified, false);
    for (const side of ['reference', 'astylar']) assert.equal(entry[side].inputTree.file, entry.inputTrees[side].file);
  }
});

test('calendar close consolidated validation rejects altered summaries, missing boundaries and wrong interned values', () => {
  const mutations = [
    f => { delete f.report.supplementalCalendarClose; },
    f => { f.report.supplementalCalendarClose.cases.pop(); },
    f => { f.report.supplementalCalendarClose.reviews[0].inputEquivalent = true; },
    f => { f.report.supplementalCalendarClose.mismatches = []; },
    f => { f.report.supplementalCalendarClose.cases[0].reference.active.text = 'Another control'; },
    f => { f.report.supplementalCalendarClose.cases[0].inputTrees.reference.sha256 = '0'.repeat(64); },
    f => { f.report.generatedFrom.captureProvenance.browser = 'another browser'; },
    f => { delete f.report.elementInventory; },
    f => { f.report.elementInventory.cases.pop(); },
    f => { f.report.elementInventory.cases.push(structuredClone(f.report.elementInventory.cases[0])); },
    f => { f.report.elementInventory.cases[1].resolvedStyleRevision = 99; },
    f => { f.report.elementInventory.styles[0].value.clip = 'fake'; },
    f => { f.report.elementInventory.variants[0].nodes[0].parent = 'wrong-parent'; },
    f => { f.report.elementInventory.variants[0].side = 'astylar'; },
  ];
  for (const mutate of mutations) {
    const f = collectedCalendarFixture();
    mutate(f);
    const errors = [];
    validateCalendarCloseInventory(f.report, errors, f.options);
    assert.ok(errors.length, String(mutate));
  }
});

test('calendar close collector does not fall back from missing, invalid or unbound selected evidence', () => {
  const f = collectedCalendarFixture();
  const readBytes = absolute => {
    const bytes = f.bytes.get(absolute);
    if (!bytes) throw Object.assign(new Error('missing'), { code: 'ENOENT' });
    return bytes;
  };
  const options = { ...f.options, readBytes, supplementalRoot: 'artifacts/material-parity/selected' };
  const missing = collectCalendarCloseEvidence(f.options.root, options);
  assert.equal(missing.binding.status, 'missing');
  assert.equal(missing.missing.length, 4);
  assert.deepEqual(missing.cases, []);
  const partial = { ...f.report, supplementalCalendarClose: missing,
    elementInventory: collectFullTreeInventory([]) };
  const errors = [];
  validateCalendarCloseInventory(partial, errors, { ...options, requireComplete: false });
  assert.deepEqual(errors, []);
  validateCalendarCloseInventory(partial, errors, options);
  assert.ok(errors.some(error => error.includes('incomplete or unbound')));
  for (const input of ['broken JSON', { ...f.raw, schemaVersion: 999 }]) {
    f.put(missing.file, input);
    const result = collectCalendarCloseEvidence(f.options.root, options);
    assert.ok(result.errors.length);
    assert.equal(result.complete, false);
    assert.deepEqual(result.cases, []);
  }
  const escaped = collectCalendarCloseEvidence(f.options.root, { ...options, reportPath: '../outside.json' });
  assert.equal(escaped.binding.status, 'invalid');
  assert.ok(escaped.errors.length);
});

test('supplemental capture requires explicit local run and new artifact destination', () => {
  const root = path.resolve('virtual-capture-root');
  assert.deepEqual(parseSupplementalCaptureArguments(args, root), { baseUrl: 'http://127.0.0.1:4431',
    checkpoint: path.join(root, 'artifacts/material-parity/run/checkpoint'), output: path.join(root, 'artifacts/material-parity/fresh/picker-commit-audit') });
  const invalid = [[], args.slice(0, 2), [...args, '--check'], [...args, '--output=another'],
    args.map(arg => arg.startsWith('--output=') ? '--output=' : arg),
    args.map(arg => arg.startsWith('--output=') ? '--output=artifacts/material-parity/../outside' : arg),
    args.map(arg => arg.startsWith('--output=') ? '--output=artifacts/material-parity' : arg),
    args.map(arg => arg.startsWith('--output=') ? '--output=artifacts/material-parity/run/checkpoint' : arg)];
  for (const url of ['https://127.0.0.1:4431', 'http://example.com', 'http://localhost/astylar', 'http://localhost/?x=1',
    'http://localhost/#x', 'http://user:password@localhost']) invalid.push([`--base-url=${url}`, ...args.slice(1)]);
  for (const value of invalid) assert.throws(() => parseSupplementalCaptureArguments(value, root), undefined, JSON.stringify(value));
});

function fixture(root = path.resolve('virtual-capture-root')) {
  const bytes = new Map();
  const put = (file, value) => {
    const content = Buffer.from(typeof value === 'string' ? value : JSON.stringify(value));
    bytes.set(path.resolve(root, file), content);
    return { file, sha256: hash(content) };
  };
  const assets = assetFiles.map((file, index) => ({ file, type: assetTypes[index], sha256: hash(`runtime ${file}`) }));
  const expectedProvenance = { browser: '152.0.0.0', browserFiles: assets.map(({ file, sha256 }) => ({ file, sha256 })), cases: ['pinned'] };
  const checkpointManifest = put('artifacts/material-parity/run/checkpoint/manifest.json', { schemaVersion: 1, provenance: expectedProvenance });
  const sources = sourceFiles.map(file => put(file, `source ${file}`));
  const reportFile = 'artifacts/material-parity/fresh/picker-commit-audit/latest-report.json';
  const sides = Object.fromEntries(['reference', 'astylar'].map(side => [side, {
    runtime: { assets: structuredClone(assets), errors: [] },
    inputTree: put(`artifacts/material-parity/fresh/picker-commit-audit/${side}.json`, { nodes: [{ key: side }], errors: [] }),
  }]));
  const raw = { browser: expectedProvenance.browser,
    capture: { schemaVersion: 1, checkpointManifest, sources, styleProperties: [...propertyNames] }, results: [sides] };
  const options = { root, reportFile, expectedProvenance, script, styleProperties: propertyNames,
    readBytes: absolute => { assert.ok(bytes.has(absolute), `Missing virtual evidence: ${absolute}`); return bytes.get(absolute); } };
  return { raw, options, bytes, put };
}

test('reader binds every side to unchanged checkpoint, runtime assets, sources and complete tree bytes', () => {
  const { raw, options } = fixture();
  const before = JSON.stringify(raw);
  assert.deepEqual(validateSupplementalCapture(raw, options), { status: 'checkpoint-bound', errors: [] });
  assert.equal(JSON.stringify(raw), before, 'Validation must not rewrite evidence');
  assert.deepEqual(validateSupplementalCapture({}, { root: options.root }), { status: 'legacy-unbound', errors: [] });
  assert.equal(validateSupplementalCapture({}, options).status, 'invalid', 'A selected run cannot accept unbound legacy evidence');
});

const mutations = {
  'missing capture': f => { delete f.raw.capture; },
  'missing selected run': f => { delete f.options.expectedProvenance; },
  'wrong browser': f => { f.raw.browser = 'another'; },
  'changed manifest bytes': f => { f.put(f.raw.capture.checkpointManifest.file, '{}'); },
  'different manifest run despite valid digest': f => {
    f.raw.capture.checkpointManifest = f.put(f.raw.capture.checkpointManifest.file,
      { schemaVersion: 1, provenance: { ...f.options.expectedProvenance, cases: ['other'] } });
  },
  'changed source bytes': f => { f.put(script, 'changed'); },
  'missing source': f => { f.raw.capture.sources.pop(); },
  'duplicate source': f => { f.raw.capture.sources[1] = f.raw.capture.sources[0]; },
  'different property list': f => { f.raw.capture.styleProperties.pop(); },
  'missing cases': f => { f.raw.results = []; },
  'missing side': f => { delete f.raw.results[0].astylar; },
  'missing runtime': f => { delete f.raw.results[0].astylar.runtime; },
  'runtime errors': f => { f.raw.results[0].reference.runtime.errors.push('load failed'); },
  'missing document': f => { f.raw.results[0].reference.runtime.assets.shift(); },
  'missing script': f => { f.raw.results[0].astylar.runtime.assets.splice(1, 1); },
  'missing stylesheet': f => { f.raw.results[0].reference.runtime.assets.splice(2, 1); },
  'missing font': f => { f.raw.results[0].astylar.runtime.assets.pop(); },
  'unknown asset type': f => { f.raw.results[0].astylar.runtime.assets.push({ ...f.raw.results[0].astylar.runtime.assets[0], type: 'image' }); },
  'wrong asset digest': f => { f.raw.results[0].astylar.runtime.assets[0].sha256 = 'f'.repeat(64); },
  'unknown asset without digest': f => { f.raw.results[0].astylar.runtime.assets.push({ type: 'font', file: 'unknown' }); },
  'missing asset digest': f => { delete f.raw.results[0].astylar.runtime.assets[0].sha256; },
  'changed tree bytes': f => { f.put(f.raw.results[0].astylar.inputTree.file, '{}'); },
  'tree errors with valid digest': f => {
    f.raw.results[0].astylar.inputTree = f.put(f.raw.results[0].astylar.inputTree.file, { nodes: [{}], errors: ['missing node'] });
  },
  'empty tree with valid digest': f => {
    f.raw.results[0].astylar.inputTree = f.put(f.raw.results[0].astylar.inputTree.file, { nodes: [], errors: [] });
  },
  'tree in different capture directory': f => {
    f.raw.results[0].astylar.inputTree = f.put('artifacts/material-parity/old/astylar.json', { nodes: [{}], errors: [] });
  },
  'duplicate tree': f => { f.raw.results[0].astylar.inputTree = f.raw.results[0].reference.inputTree; },
  'source path escape': f => { f.raw.capture.sources[0].file = '../outside.mjs'; },
  'manifest path escape': f => { f.raw.capture.checkpointManifest = f.put('outside.json', { schemaVersion: 1, provenance: f.options.expectedProvenance }); },
};
for (const [name, mutate] of Object.entries(mutations)) test(`supplemental provenance rejects ${name}`, () => {
  const evidence = fixture();
  mutate(evidence);
  const result = validateSupplementalCapture(evidence.raw, evidence.options);
  assert.equal(result.status, 'invalid');
  assert.equal(result.errors.length, 1);
});

function diskFixture(t) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'astylar-supplemental-proof-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const f = fixture(root);
  for (const [file, bytes] of f.bytes) {
    // Output tree files are reader fixtures, not pre-existing producer outputs.
    if (file.includes(`${path.sep}fresh${path.sep}`)) continue;
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, bytes);
  }
  const options = parseSupplementalCaptureArguments(args, root);
  const browser = { version: () => f.raw.browser };
  const open = overrides => openSupplementalCapture({ root, options, browser, script, styleProperties: propertyNames, ...overrides });
  return { ...f, root, options, browser, open };
}

function pageFixture() {
  const page = new EventEmitter();
  page.evaluate = async () => {};
  const emit = (index, overrides = {}) => page.emit('response', { request: () => ({ resourceType: () => assetTypes[index] }),
    url: () => `http://127.0.0.1:4431/${index === 0 ? 'reference/datepicker?benchmark=1' : assetFiles[index]}`,
    body: async () => Buffer.from(`runtime ${assetFiles[index]}`), status: () => 200, ...overrides });
  return { page, emit };
}

test('producer fingerprints sources, observes response bytes, and removes its listeners', async t => {
  const f = diskFixture(t), capture = f.open();
  assert.ok(existsSync(f.options.output));
  assert.deepEqual(capture.capture, f.raw.capture);
  const { page, emit } = pageFixture();
  const finish = capture.observe(page);
  for (let index = 0; index < 4; index++) emit(index);
  const runtime = await finish();
  assert.equal(runtime.assets.length, 4);
  assert.deepEqual(runtime.errors, []);
  assert.deepEqual(page.eventNames(), []);
  assert.throws(() => f.open(), /new output directory/);
});

for (const failure of ['wrong bytes', 'external asset', 'failed status', 'missing font', 'page error', 'console error']) {
  test(`producer rejects ${failure} without converting failure into parity evidence`, async t => {
    const f = diskFixture(t), capture = f.open(), { page, emit } = pageFixture();
    const finish = capture.observe(page);
    for (let index = 0; index < (failure === 'missing font' ? 3 : 4); index++) {
      const override = index !== 1 ? {} : failure === 'wrong bytes' ? { body: async () => Buffer.from('changed') }
        : failure === 'external asset' ? { url: () => 'http://external/main.js' }
          : failure === 'failed status' ? { status: () => 404 } : {};
      emit(index, override);
    }
    if (failure === 'page error') page.emit('pageerror', new Error('renderer failed'));
    if (failure === 'console error') page.emit('console', { type: () => 'error', text: () => 'font failed' });
    await assert.rejects(finish());
    assert.deepEqual(page.eventNames(), []);
  });
}

test('producer rejects browser or malformed asset provenance before creating output', t => {
  const f = diskFixture(t);
  assert.throws(() => f.open({ browser: { version: () => 'different' } }), /Browser differs/);
  assert.equal(existsSync(f.options.output), false);
  const manifestFile = path.join(f.options.checkpoint, 'manifest.json');
  const manifest = JSON.parse(readFileSync(manifestFile));
  delete manifest.provenance.browserFiles[0].sha256;
  writeFileSync(manifestFile, JSON.stringify(manifest));
  assert.throws(() => f.open(), /asset digest/);
  assert.equal(existsSync(f.options.output), false);
});

test('audit collectors select all supplemental reports from the requested root without fallback', t => {
  const f = diskFixture(t);
  for (const [directory, collect, count] of [['picker-commit-audit', collectSupplementalBehavior, 6],
    ['overlay-breakpoint-audit', collectSupplementalOverlays, 3], ['slider-domain-audit', collectSupplementalSlider, 4]]) {
    const reportFile = path.join(f.root, 'artifacts/material-parity', directory, 'latest-report.json');
    mkdirSync(path.dirname(reportFile), { recursive: true });
    writeFileSync(reportFile, JSON.stringify({ browser: 'old', results: [] }));
    assert.equal(collect(f.root).browser, 'old');
    const missing = collect(f.root, { supplementalRoot: 'artifacts/material-parity/fresh' });
    assert.equal(missing.binding.status, 'missing');
    assert.equal(missing.missing.length, count);
    assert.equal(missing.browser, undefined);
    const selected = path.join(f.root, 'artifacts/material-parity/fresh', directory, 'latest-report.json');
    mkdirSync(path.dirname(selected), { recursive: true });
    writeFileSync(selected, JSON.stringify({ browser: 'selected', results: [] }));
    assert.equal(collect(f.root, { supplementalRoot: 'artifacts/material-parity/fresh' }).browser, 'selected');
    const unbound = collect(f.root, { supplementalRoot: 'artifacts/material-parity/fresh', expectedProvenance: f.raw.capture });
    assert.equal(unbound.binding.status, 'invalid');
    assert.ok(unbound.errors.length > 0);
  }
});
