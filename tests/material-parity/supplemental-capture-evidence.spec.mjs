import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { openSupplementalCapture, parseSupplementalCaptureArguments, validateSupplementalCapture } from './supplemental-capture-evidence.mjs';
import { collectSupplementalBehavior, collectSupplementalOverlays, collectSupplementalSlider,
  collectFullTreeInventory, validateCalendarCloseInventory, validateTooltipStateInventory, validatePaginatorNavigationInventory } from './input-equivalence-audit.mjs';
import { validateCalendarCloseCapture, collectCalendarCloseEvidence } from './calendar-close-evidence.mjs';
import { validateTooltipStateCapture, collectTooltipStateEvidence } from './tooltip-state-evidence.mjs';
import { propertyGroups } from './input-equivalence-policy.mjs';
import { fixture, calendarFixture, tooltipStateFixture } from './supplemental-capture-fixtures.mjs';
import { validatePaginatorNavigationCapture, collectPaginatorNavigationEvidence } from './paginator-navigation-evidence.mjs';
import { paginatorNavigationPlan, paginatorNavigationStyleProperties, comparePaginatorNavigation } from '../../scripts/audit-material-paginator-navigation.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const script = 'scripts/audit-material-picker-commits.mjs';
const sourceFiles = [script, 'tests/material-parity/supplemental-capture-evidence.mjs', 'tests/material-parity/input-tree-evidence.mjs'];
const propertyNames = ['fontFamily', 'lineHeight', 'direction'];
const assetTypes = ['document', 'script', 'stylesheet', 'font'];
const assetFiles = ['index.csr.html', 'main.js', 'styles.css', 'media/font.woff2'];
const args = ['--base-url=http://127.0.0.1:4431', '--checkpoint=artifacts/material-parity/run/checkpoint',
  '--output=artifacts/material-parity/fresh/picker-commit-audit'];

function paginatorFixture() {
  const f = fixture(), raw = f.raw, runtime = structuredClone(raw.results[0].reference.runtime);
  Object.assign(raw, { schemaVersion: 1, viewport: { width: 1440, height: 1000 }, profiles: ['light', 'dark'],
    plan: paginatorNavigationPlan(), settleDelayMs: 250 });
  raw.capture.styleProperties = [...paginatorNavigationStyleProperties];
  raw.capture.sources = ['scripts/audit-material-paginator-navigation.mjs', ...sourceFiles.slice(1)].map(file => f.put(file, file));
  raw.results = raw.profiles.flatMap(profile => [1, 2].flatMap(deviceScaleFactor => {
    const histories = { reference: [], astylar: [] };
    return raw.plan.map(step => {
      const entry = { family: 'paginator', profile, deviceScaleFactor, ...step };
      for (const side of ['reference', 'astylar']) {
        const ref = side === 'reference', range = `${step.expectedPageIndex * 10 + 1} – ${step.expectedPageIndex * 10 + 10} of 100`;
        const disabled = { previous: step.expectedPageIndex === 0, next: step.expectedPageIndex === 9 };
        const pointer = step.action === 'leave' ? { x: 1, y: 1 } : { x: 120, y: 120 };
        const types = { click: ['pointermove', 'pointerdown', 'pointerup', 'click'], move: ['pointermove'],
          down: ['pointerdown'], up: ['pointerup'], leave: ['pointermove'], 'space-down': ['keydown'], 'space-up': ['keyup'] }[step.action] ?? [];
        for (const type of types) histories[side].push({ type, trusted: true, key: type.startsWith('key') ? ' ' : null,
          clientX: type.startsWith('key') ? null : pointer.x, clientY: type.startsWith('key') ? null : pointer.y });
        const tree = { schemaVersion: 1, errors: [], nodes: [{ key: 'range', ...(ref
          ? { type: 'div', attributes: { class: 'mat-mdc-paginator-range-label' }, ownText: range }
          : { authored: { id: 'paginator-range', type: 'span', textContent: range } }) }] };
        for (const direction of ['previous', 'next']) tree.nodes.push({ key: direction, ...(ref
          ? { type: 'button', attributes: { class: `mat-mdc-paginator-navigation-${direction}`,
            ...(disabled[direction] ? { 'aria-disabled': 'true', tabindex: '-1' } : {}) } }
          : { authored: { type: 'button', id: `paginator-${direction}`, disabled: disabled[direction] } }) });
        const visibleTooltips = ref && ['previous-hover', 'previous-press'].includes(step.state) ? ['Previous page'] : [];
        if (visibleTooltips.length) tree.nodes.push({ key: 'wrapper', attributes: { class: 'mat-mdc-tooltip-show' } },
          { key: 'tooltip', parent: 'wrapper', attributes: { class: 'mat-mdc-tooltip-surface' }, ownText: 'Previous page' });
        if (ref) { tree.styles = [{ visibility: 'visible' }]; for (const node of tree.nodes) node.style = 0; }
        if (!ref) {
          Object.assign(tree, { resolvedStyleEvidenceVersion: 2, resolvedStyleSource: 'core-style-inspection', resolvedStyleRevision: 2 });
          for (const node of tree.nodes) Object.assign(node, { normalResolvedStyle: {}, resolvedStyle: {}, interactionResolvedStyle: {} });
        }
        const stem = `artifacts/material-parity/fresh/picker-commit-audit/${profile}-${deviceScaleFactor}-${side}-${step.state}`;
        const png = Buffer.alloc(24); Buffer.from('89504e470d0a1a0a', 'hex').copy(png);
        png.writeUInt32BE(1440 * deviceScaleFactor, 16); png.writeUInt32BE(1000 * deviceScaleFactor, 20);
        f.bytes.set(path.resolve(f.options.root, `${stem}.png`), png);
        entry[side] = { runtime: structuredClone(runtime), range, pageIndex: ref ? null : step.expectedPageIndex,
          previousDisabled: ref ? false : disabled.previous, nextDisabled: ref ? false : disabled.next,
          previousAriaDisabled: disabled.previous ? 'true' : null, nextAriaDisabled: disabled.next ? 'true' : null,
          previousTabIndex: disabled.previous ? -1 : 0, nextTabIndex: disabled.next ? -1 : 0,
          ...(!ref ? { authoredPreviousDisabled: disabled.previous, authoredNextDisabled: disabled.next } : {}),
          active: { id: '', tag: 'BODY', label: null, astylarId: null }, activeNavigation: null,
          visibleTooltips, pointer, targetBox: ['move', 'click'].includes(step.action) ? { x: 100, y: 100, width: 40, height: 40 } : null,
          events: structuredClone(histories[side]), inputTree: f.put(`${stem}.json`, tree),
          screenshot: { file: `${stem}.png`, sha256: hash(png) } };
      }
      entry.checks = comparePaginatorNavigation(entry); return entry;
    });
  }));
  return f;
}

test('paginator navigation captures the full first-last sequence without conflating aria and native disabled', () => {
  assert.deepEqual(paginatorNavigationPlan().map(s => s.expectedPageIndex), [0, 0, 0, 0, 0, 1, 1, 1, 0, 0,
    1, 2, 3, 4, 5, 6, 7, 8, 9, 9, 9, 9, 9, 8, 8, 7]);
  const f = paginatorFixture(), before = JSON.stringify(f.raw), result = validatePaginatorNavigationCapture(f.raw, f.options);
  assert.deepEqual(result.errors, []); assert.equal(result.complete, true); assert.equal(result.binding.status, 'checkpoint-bound');
  assert.equal(result.observations.length, 104);
  assert.equal(result.observations.filter(o => !o.checks.nativeDisabledInputs).length, 48);
  assert.equal(result.observations.filter(o => !o.checks.tooltipPresence).length, 8);
  assert.ok(result.observations.every(o => o.checks.referenceRange && o.checks.astylarRange && o.checks.candidateState));
  assert.ok(result.observations.every(o => o.inputEquivalent === false && o.finalRasterVerified === false));
  assert.equal(JSON.stringify(f.raw), before);
});

test('paginator navigation rejects malformed, incomplete and forged observations or artifacts', () => {
  const mutations = [
    f => { f.raw.results.pop(); }, f => { f.raw.results.reverse(); },
    f => { f.raw.results[0].family = 'button'; }, f => { f.raw.results[0].action = 'click'; },
    f => { f.raw.results[0].expectedPageIndex = 9; }, f => { f.raw.plan[0].target = 'previous'; },
    f => { f.raw.profiles.reverse(); }, f => { f.raw.viewport.width = 900; }, f => { f.raw.settleDelayMs = 0; },
    f => { delete f.raw.capture; }, f => { f.raw.capture.sources.pop(); },
    f => { f.raw.results[0].reference.runtime.errors.push('bad'); },
    f => { f.raw.results[0].reference.range = '91 – 100 of 100'; },
    f => { f.raw.results[0].astylar.pageIndex = 9; },
    f => { f.raw.results[0].reference.previousDisabled = true; },
    f => { f.raw.results[0].reference.previousAriaDisabled = null; },
    f => { f.raw.results[0].reference.previousTabIndex = 0; },
    f => { f.raw.results[0].astylar.authoredPreviousDisabled = false; },
    f => { f.raw.results[6].reference.visibleTooltips = []; },
    f => { f.raw.results[1].astylar.pointer.x++; },
    f => { f.raw.results[2].astylar.events = []; },
    f => { f.raw.results[2].astylar.events.at(-1).trusted = false; },
    f => { f.raw.results[3].astylar.events[0].type = 'fake'; },
    f => { f.raw.results[24].astylar.events.at(-1).key = 'Enter'; },
    f => { f.raw.results[0].astylar.activeNavigation = 'previous'; },
    f => { f.raw.results[0].checks.nativeDisabledInputs = true; },
    f => { f.raw.results[1].reference.screenshot = f.raw.results[0].reference.screenshot; },
    f => { f.raw.results[0].reference.screenshot.sha256 = '0'.repeat(64); },
    f => { f.raw.capture.styleProperties = f.raw.capture.styleProperties.filter(p => p !== 'visibility'); },
    f => { const sample = f.raw.results[0].reference;
      const tree = JSON.parse(f.options.readBytes(path.resolve(f.options.root, sample.inputTree.file)));
      delete tree.styles[0].visibility; sample.inputTree = f.put(sample.inputTree.file, tree); },
  ];
  const treeMutations = [
    tree => { tree.nodes.push(structuredClone(tree.nodes[0])); },
    tree => { tree.nodes[0].authored.textContent = 'Other'; },
    tree => { tree.nodes[1].authored.disabled = false; },
    tree => { delete tree.nodes[1].normalResolvedStyle; },
    tree => { tree.resolvedStyleSource = 'mesh-metadata'; },
    tree => { tree.resolvedStyleRevision = -1; },
  ];
  for (const mutate of mutations) {
    const f = paginatorFixture(); mutate(f);
    const v = validatePaginatorNavigationCapture(f.raw, f.options);
    assert.equal(v.complete, false, String(mutate)); assert.deepEqual(v.observations, []);
  }
  for (const mutate of treeMutations) {
    const f = paginatorFixture(), sample = f.raw.results[0].astylar;
    const tree = JSON.parse(f.options.readBytes(path.resolve(f.options.root, sample.inputTree.file)));
    mutate(tree); sample.inputTree = f.put(sample.inputTree.file, tree);
    assert.equal(validatePaginatorNavigationCapture(f.raw, f.options).complete, false, String(mutate));
  }
});


function collectedPaginatorFixture() {
  const f = paginatorFixture();
  for (const entry of f.raw.results) for (const side of ['reference', 'astylar']) {
    const item = entry[side], tree = JSON.parse(f.options.readBytes(path.resolve(f.options.root, item.inputTree.file)));
    tree.styles = [{ color: '#123456', visibility: 'visible' }]; tree.rules = [];
    for (const node of tree.nodes) {
      if (side === 'reference') Object.assign(node, { style: 0, rules: [], pseudoElements: [] });
      else Object.assign(node, { resolvedStyle: { color: '#123456' }, normalResolvedStyle: { color: '#123456' },
        interactionResolvedStyle: { color: '#123456' } });
    }
    item.inputTree = f.put(item.inputTree.file, tree);
  }
  f.put(f.options.reportFile, f.raw);
  const supplemental = collectPaginatorNavigationEvidence(f.options.root, { ...f.options, reportPath: f.options.reportFile });
  assert.deepEqual(supplemental.errors, []);
  const cases = supplemental.cases.map(entry => ({ ...entry, inputTrees: Object.fromEntries(['reference', 'astylar'].map(side =>
    [side, JSON.parse(f.options.readBytes(path.resolve(f.options.root, entry.inputTrees[side].file)))])) }));
  return { ...f, report: { generatedFrom: { captureProvenance: f.options.expectedProvenance }, supplementalPaginatorNavigation: supplemental,
    elementInventory: collectFullTreeInventory(cases, { root: f.options.root }) } };
}

test('paginator collector retains all navigation trees and honest failures without claiming equivalence', () => {
  const f = collectedPaginatorFixture(), e = f.report.supplementalPaginatorNavigation, before = JSON.stringify(f.report), errors = [];
  assert.equal(e.complete, true); assert.equal(e.cases.length, 104); assert.equal(e.reviews.length, 104);
  assert.equal(e.mismatches.length, 56); assert.equal(e.mismatches.filter(m => m.property === 'nativeDisabledInputs').length, 48);
  assert.equal(e.mismatches.filter(m => m.property === 'tooltipPresence').length, 8);
  assert.deepEqual(e.missing, []); assert.equal(f.report.elementInventory.cases.length, 208);
  assert.equal(new Set(e.cases.map(c => `${c.profile}/${c.viewport.id}/${c.state}`)).size, 104);
  for (const c of e.cases) {
    assert.equal(c.inputEquivalent, false); assert.equal(c.finalRasterVerified, false);
    for (const side of ['reference', 'astylar']) assert.deepEqual(c.inputTrees[side], c[side].inputTree);
  }
  validatePaginatorNavigationInventory(f.report, errors, f.options);
  assert.deepEqual(errors, []); assert.equal(JSON.stringify(f.report), before);
});

test('paginator inventory rejects dropped boundaries altered inputs and fabricated acceptance', () => {
  const mutations = [
    f => { delete f.report.supplementalPaginatorNavigation; },
    f => { f.report.supplementalPaginatorNavigation.cases.pop(); },
    f => { f.report.supplementalPaginatorNavigation.mismatches = []; },
    f => { f.report.supplementalPaginatorNavigation.reviews[0].inputEquivalent = true; },
    f => { f.report.supplementalPaginatorNavigation.cases[0].reference.events.push({ type: 'fake' }); },
    f => { f.report.supplementalPaginatorNavigation.cases[0].expectedPageIndex = 9; },
    f => { f.report.generatedFrom.captureProvenance.browser = 'other'; },
    f => { delete f.report.elementInventory; },
    f => { f.report.elementInventory.cases.pop(); },
    f => { f.report.elementInventory.cases.push(structuredClone(f.report.elementInventory.cases[0])); },
    f => { f.report.elementInventory.cases[0].case = 'static:paginator@light/desktop'; },
    f => { f.report.elementInventory.cases[1].resolvedStyleRevision = 99; },
    f => { f.report.elementInventory.styles[0].value.color = 'fake'; },
    f => { f.report.elementInventory.variants[0].nodes[0].parent = 'other'; },
    f => { f.report.elementInventory.variants[0].side = 'astylar'; },
    f => { f.report.elementInventory.variants.find(v => v.side === 'astylar').nodes[0].authored.textContent = 'Other'; },
    f => { f.report.elementInventory.variants[0].nodes[0].pseudoElements.push({ type: 'after', style: 0, rules: [] }); },
    f => { f.report.elementInventory.variants.find(v => v.side === 'astylar').nodes[0].retainedText = { source: 'invented', style: 0 }; },
    f => { f.report.elementInventory.variants.find(v => v.side === 'astylar').nodes[0].paintedControlText = { source: 'invented', style: 0 }; },
  ];
  for (const [i, mutate] of mutations.entries()) {
    const f = collectedPaginatorFixture(); mutate(f); const errors = [];
    validatePaginatorNavigationInventory(f.report, errors, f.options);
    assert.ok(errors.length, `control ${i}`);
  }
});

test('paginator collector fails closed for incomplete unbound missing and escaped captures', () => {
  for (const mutate of [f => { f.raw.results.pop(); }, f => { delete f.raw.capture; }]) {
    const f = paginatorFixture(); mutate(f); f.put(f.options.reportFile, f.raw);
    const result = collectPaginatorNavigationEvidence(f.options.root, { ...f.options, reportPath: f.options.reportFile });
    assert.equal(result.complete, false); assert.deepEqual(result.cases, []);
    assert.equal(result.missing.length, 104); assert.ok(result.errors.length);
  }
  const f = paginatorFixture();
  const missing = collectPaginatorNavigationEvidence(f.options.root, { reportPath: f.options.reportFile, readBytes: () => {
    throw Object.assign(new Error('missing'), { code: 'ENOENT' }); } });
  assert.equal(missing.binding.status, 'missing'); assert.equal(missing.complete, false); assert.equal(missing.cases.length, 0);
  const errors = [];
  validatePaginatorNavigationInventory({ generatedFrom: {}, supplementalPaginatorNavigation: missing,
    elementInventory: collectFullTreeInventory([]) }, errors, { ...f.options, readBytes: () => {
      throw Object.assign(new Error('missing'), { code: 'ENOENT' }); } });
  assert.ok(errors.includes('paginator navigation action coverage is incomplete or unbound'));
  const escaped = collectPaginatorNavigationEvidence(f.options.root, { ...f.options, reportPath: '../outside/latest-report.json' });
  assert.equal(escaped.binding.status, 'invalid'); assert.equal(escaped.cases.length, 0);
});

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
