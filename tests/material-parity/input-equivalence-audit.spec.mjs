import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';
import { assertHistoricalCaseIndexSources } from './historical-case-index-source-assertion.mjs';
import {
  buildMaterialInputAudit,
  attributeObservedNormalLineBoxes,
  attributeObservedControlLineBoxes,
  attributeObservedSupplementalLineBoxes,
  validateSupplementalLineBoxInventory,
  collectFullTreeInventory,
  collectControlTypographyEvidence,
  collectRetainedTypographyEvidence,
  parseMaterialInputAuditArguments,
  reviewedHeadingMappings,
  reviewedTemplateTextMappings,
  reviewedTooltipStateGap,
  summarizeSupplementalBehavior,
  summarizeSupplementalOverlays,
  summarizeSupplementalSlider,
  validateMaterialInputAudit,
} from './input-equivalence-audit.mjs';
import { collectTooltipUnpairedStyles, validateTooltipUnpairedStyles,
  tooltipUnpairedStyleAttribution } from './tooltip-unpaired-style-evidence.mjs';

const browserDefaults = {
  visibility: 'visible', minWidth: '0px', maxWidth: 'none', minHeight: '0px', maxHeight: 'none',
  fontStyle: 'normal', transform: 'none', pointerEvents: 'auto',
};

test('browser pseudo outline does not consume host content width like a host border', async () => {
  const { chromium } = await import('playwright-core');
  const { captureBrowserInputTree } = await import('./input-tree-evidence.mjs');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    for (const dpr of [1, 2]) {
      const page = await browser.newPage({ viewport: { width: 640, height: 360 }, deviceScaleFactor: dpr });
      for (const selected of [false, true]) {
        const width = selected ? 0 : 1;
        await page.setContent(`<style>
          .chip { position:relative; display:flex; width:100px; height:32px; box-sizing:border-box; padding:0 12px; }
          .content { flex:1; min-width:0; height:10px; }
          #pseudo-owner::before { content:""; position:absolute; inset:0; box-sizing:border-box; border:${width}px solid #123456; pointer-events:none; }
          #border-owner { border:${width}px solid #123456; }
        </style><app-reference><main class="frame">
          <div class="chip" id="pseudo-owner"><div class="content" id="pseudo-content"></div></div>
          <div class="chip" id="border-owner"><div class="content" id="border-content"></div></div>
        </main></app-reference>`);
        const geometry = await page.evaluate(() => Object.fromEntries(['pseudo-owner', 'border-owner', 'pseudo-content', 'border-content'].map(id => {
          const r = document.getElementById(id).getBoundingClientRect(); return [id, { x: r.x, width: r.width, height: r.height }];
        })));
        assert.equal(geometry['pseudo-owner'].width, 100);
        assert.equal(geometry['border-owner'].width, 100);
        assert.equal(geometry['pseudo-owner'].height, geometry['border-owner'].height);
        assert.equal(geometry['pseudo-content'].width, 76);
        assert.equal(geometry['border-content'].width, 76 - 2 * width);
        assert.equal(geometry['border-content'].x - geometry['pseudo-content'].x, width);
        const tree = await page.evaluate(captureBrowserInputTree, {
          styleProperties: ['position', 'borderLeftWidth', 'borderLeftColor', 'boxSizing', 'width', 'content'],
        });
        assert.deepEqual(tree.errors, []);
        const host = tree.nodes.find(n => n.attributes?.id === 'pseudo-owner');
        const border = tree.nodes.find(n => n.attributes?.id === 'border-owner');
        const pseudo = host.pseudoElements.find(p => p.pseudo === '::before');
        assert.equal(pseudo.generated, true);
        assert.equal(tree.styles[host.style].borderLeftWidth, '0px');
        assert.equal(tree.styles[pseudo.style].borderLeftWidth, `${width}px`);
        assert.equal(tree.styles[border.style].borderLeftWidth, `${width}px`);
        assert.equal(tree.styles[pseudo.style].position, 'absolute');
        assert.ok(pseudo.rules.some(i => tree.rules[i].selector === '#pseudo-owner::before'));
        assert.ok(host.rules.every(i => tree.rules[i].selector !== '#pseudo-owner::before'));
      }
      await page.close();
    }
  } finally { await browser.close(); }
});

test('browser outline token shorthands retain authored variables when expanded color fields are empty', async () => {
  const { chromium } = await import('playwright-core');
  const { captureBrowserInputTree } = await import('./input-tree-evidence.mjs');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage();
    for (const scheme of ['light', 'dark']) for (const property of ['border-color', 'border', 'border-left']) {
      for (const mode of ['fallback', 'override', 'literal']) {
        const color = mode === 'literal' ? '#79747e' : 'var(--component-outline, var(--system-outline))';
        const expression = property === 'border-color' ? color : `solid 1px ${color}`;
        await page.setContent(`<style>
          html { color-scheme:${scheme}; --system-outline:light-dark(#123456, #c04a20); ${mode === 'override' ? '--component-outline:#abcdef;' : ''} }
          #target { border:1px solid; ${property}:${expression}; }
        </style><app-reference><main class="frame"><div id="target"></div></main></app-reference>`);
        const actual = await page.locator('#target').evaluate((node, property) => {
          const rule = [...document.styleSheets[0].cssRules].find(rule => rule.selectorText === '#target');
          return { color: getComputedStyle(node).borderLeftColor, serialized: rule.style.cssText,
            shorthand: rule.style.getPropertyValue(property), expanded: rule.style.borderLeftColor };
        }, property);
        const expected = mode === 'literal' ? 'rgb(121, 116, 126)' : mode === 'override' ? 'rgb(171, 205, 239)'
          : scheme === 'light' ? 'rgb(18, 52, 86)' : 'rgb(192, 74, 32)';
        assert.equal(actual.color, expected, `${scheme}/${property}/${mode}`);
        if (mode !== 'literal') {
          assert.equal(actual.shorthand, expression);
          assert.equal(actual.expanded, '', 'A pending shorthand is not an omitted color declaration.');
          assert.ok(actual.serialized.includes(expression));
        }
        const tree = await page.evaluate(captureBrowserInputTree, { styleProperties: ['borderLeftColor'] });
        assert.deepEqual(tree.errors, []);
        const node = tree.nodes.find(node => node.attributes?.id === 'target');
        assert.equal(tree.styles[node.style].borderLeftColor, expected);
        const rules = node.rules.map(index => tree.rules[index]);
        assert.equal(rules.length, 1);
        assert.equal(rules[0].cssText, actual.serialized);
        assert.equal(rules[0].declarations['border-left-color'].value, actual.expanded);
      }
    }
  } finally { await browser.close(); }
});

test('browser border reset changes color and style while width-only retains them', async () => {
  const { chromium } = await import('playwright-core');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
    const observations = await page.evaluate(() => {
      const results = [];
      for (const color of ['#123456', '#c04a20']) for (const tag of ['div', 'button']) {
        for (const kind of ['reset', 'width-only', 'longhands']) {
          const node = document.createElement(tag);
          Object.assign(node.style, { color, border: '4px solid #abcdef' });
          if (kind === 'reset') node.style.border = 'none';
          if (kind === 'width-only') node.style.borderWidth = '0';
          if (kind === 'longhands') Object.assign(node.style, { borderWidth: 'medium', borderStyle: 'none', borderColor: 'currentColor' });
          document.body.append(node);
          const computed = getComputedStyle(node);
          results.push({ color, tag, kind, computedColor: computed.color,
            colors: ['Top', 'Right', 'Bottom', 'Left'].map(side => computed[`border${side}Color`]),
            styles: ['Top', 'Right', 'Bottom', 'Left'].map(side => computed[`border${side}Style`]),
            widths: ['Top', 'Right', 'Bottom', 'Left'].map(side => computed[`border${side}Width`]),
            authored: { width: node.style.borderTopWidth, style: node.style.borderTopStyle, color: node.style.borderTopColor } });
          node.remove();
        }
      }
      return results;
    });
    assert.equal(observations.length, 12);
    for (const entry of observations) {
      assert.deepEqual(entry.widths, Array(4).fill('0px'));
      assert.deepEqual(entry.styles, Array(4).fill(entry.kind === 'width-only' ? 'solid' : 'none'));
      assert.deepEqual(entry.colors, Array(4).fill(entry.kind === 'width-only' ? 'rgb(171, 205, 239)' : entry.computedColor));
      if (entry.kind !== 'width-only') assert.deepEqual(entry.authored, { width: 'medium', style: 'none', color: 'currentcolor' });
    }
  } finally { await browser.close(); }
});

test('audit CLI selects isolated full-matrix evidence without silently accepting misspelled flags', () => {
  const root = process.cwd();
  const defaultOptions = parseMaterialInputAuditArguments([], root);
  assert.deepEqual(defaultOptions, { check: false, allowPartial: false,
    parityPath: path.resolve(root, 'artifacts/material-parity/latest-report.json') });
  const report = 'artifacts/material-parity/complete-input-audit/latest-report.json';
  assert.deepEqual(parseMaterialInputAuditArguments(['--check', `--parity-report=${report}`], root),
    { check: true, allowPartial: false, parityPath: path.resolve(root, report) });
  assert.equal(parseMaterialInputAuditArguments(['--allow-partial'], root).allowPartial, true);
  assert.throws(() => parseMaterialInputAuditArguments(['--allow-partal']), /Unknown audit option/);
  assert.throws(() => parseMaterialInputAuditArguments(['--parity-report=']), /requires a path/);
  assert.throws(() => parseMaterialInputAuditArguments(['--parity-report=a', '--parity-report=b']), /Repeated audit option/);
  assert.throws(() => parseMaterialInputAuditArguments(['--check', '--check']), /Repeated audit option/);
  const lineBoxReport = 'artifacts/material-parity/normal-line-box-static-audit-v2/latest-report.json';
  assert.equal(parseMaterialInputAuditArguments([`--normal-line-box-report=${lineBoxReport}`], root).normalLineBoxPath,
    path.resolve(root, lineBoxReport));
  assert.throws(() => parseMaterialInputAuditArguments(['--normal-line-box-report=']), /requires a path/);
  assert.throws(() => parseMaterialInputAuditArguments(['--normal-line-box-report=a', '--normal-line-box-report=b']), /Repeated audit option/);
  assert.equal(parseMaterialInputAuditArguments(['--control-line-box-report=artifacts/material-parity/control/latest-report.json'], root).controlLineBoxPath,
    path.resolve(root, 'artifacts/material-parity/control/latest-report.json'));
  assert.throws(() => parseMaterialInputAuditArguments(['--control-line-box-report=']), /requires a path/);
  assert.throws(() => parseMaterialInputAuditArguments(['--control-line-box-report=a', '--control-line-box-report=b']), /Repeated audit option/);
  assert.equal(parseMaterialInputAuditArguments(['--supplemental-line-box-report=artifacts/material-parity/supplemental-metrics/latest-report.json'], root).supplementalLineBoxPath,
    path.resolve(root, 'artifacts/material-parity/supplemental-metrics/latest-report.json'));
  assert.throws(() => parseMaterialInputAuditArguments(['--supplemental-line-box-report=']), /requires a path/);
  assert.throws(() => parseMaterialInputAuditArguments(['--supplemental-line-box-report=a', '--supplemental-line-box-report=b']), /Repeated audit option/);
  assert.equal(parseMaterialInputAuditArguments(['--supplemental-root=artifacts/material-parity/fresh'], root).supplementalRoot,
    path.resolve(root, 'artifacts/material-parity/fresh'));
  assert.throws(() => parseMaterialInputAuditArguments(['--supplemental-root=']), /requires a path/);
  assert.throws(() => parseMaterialInputAuditArguments(['--supplemental-root=a', '--supplemental-root=b']), /Repeated audit option/);
});

test('slider supplement requires all full-domain cases and does not trust endpoint claims', () => {
  const control = (value) => ({ value: String(value), min: '0', max: '100', step: '5' });
  const side = { trace: [30, 35, 40, 45, 50, 55, 60].map((value) => ({ start: control(value), end: control(65) })), errors: [] };
  const raw = { viewport: { width: 1440, height: 900 }, profile: 'light', deviceScaleFactor: 1,
    results: [{ family: 'slider', method: 'keyboard', thumb: 'start', state: 'keyboard-start-full-domain',
      reference: side, astylar: side, matches: false }] };
  assert.equal(summarizeSupplementalSlider(raw).cases[0].matches, true);
  assert.equal(summarizeSupplementalSlider(raw).missing.length, 3);
  const wrong = { ...raw, results: [{ ...raw.results[0], matches: true, astylar: { ...side,
    trace: side.trace.map((sample) => ({ ...sample, start: { ...sample.start, step: '1' } })) } }] };
  assert.equal(summarizeSupplementalSlider(wrong).mismatches.length, 1);
  const skipped = { ...raw, results: [{ ...raw.results[0], astylar: { ...side,
    trace: side.trace.map((sample, index) => index === 1 ? { ...sample, start: control(30) } : sample) } }] };
  assert.equal(summarizeSupplementalSlider(skipped).mismatches.length, 1);
  const absent = { ...raw, results: [{ ...raw.results[0], astylar: {} }] };
  assert.ok(summarizeSupplementalSlider(absent).errors.length > 0);
  assert.equal(summarizeSupplementalSlider(absent).mismatches.length, 0);
  assert.ok(summarizeSupplementalSlider({ ...raw, results: [...raw.results, ...raw.results] }).errors.some(({ error }) => error.includes('duplicate')));
  assert.equal(summarizeSupplementalSlider({}).missing.length, 4);
});

test('supplemental overlay evidence requires the medium breakpoint and recomputes geometry', () => {
  const side = { box: { left: 320, top: 772, width: 384, height: 128 }, errors: [] };
  const raw = { profile: 'light', deviceScaleFactor: 1, results: [{ family: 'bottom-sheet', state: 'open',
    viewport: { width: 1024, height: 900 }, reference: side,
    astylar: { ...side, box: { ...side.box, left: 256, width: 512 } }, matches: true, geometryError: 0 }] };
  const result = summarizeSupplementalOverlays(raw);
  assert.equal(result.missing.length, 2);
  assert.equal(result.cases[0].matches, false);
  assert.equal(result.cases[0].geometryError, 128);
  assert.equal(result.mismatches.length, 1);
  assert.equal(summarizeSupplementalOverlays({}).missing.length, 3);
  assert.ok(summarizeSupplementalOverlays({ ...raw, results: [...raw.results, ...raw.results] }).errors.some(({ error }) => error.includes('duplicate')));
  assert.ok(summarizeSupplementalOverlays({ ...raw, results: [{ ...raw.results[0], reference: {} }] }).errors.length > 0);
  assert.equal(summarizeSupplementalOverlays({ ...raw, results: [{ ...raw.results[0], reference: {} }] }).mismatches.length, 0);
  assert.ok(summarizeSupplementalOverlays({ ...raw, deviceScaleFactor: 2 }).errors.length > 0);
});

test('supplemental coverage requires all six behavior cases and recomputes claimed parity', () => {
  const entry = { family: 'timepicker', state: 'open-commit-pointer', matches: true,
    reference: { value: '12:30 AM', open: false, errors: [] },
    astylar: { value: '', open: true, errors: [] } };
  const result = summarizeSupplementalBehavior({ results: [entry] });
  assert.equal(result.missing.length, 5);
  assert.equal(result.mismatches.length, 1);
  assert.equal(result.cases[0].matches, false);
  assert.equal(summarizeSupplementalBehavior({}).missing.length, 6);
  assert.ok(summarizeSupplementalBehavior({ results: [entry, entry] }).errors.some(({ error }) => error.includes('duplicate')));
  const unchanged = { value: '', open: false, errors: [] };
  assert.equal(summarizeSupplementalBehavior({ results: [{ ...entry, reference: unchanged, astylar: unchanged }] }).cases[0].matches, false);
  const captured = { capture: { schemaVersion: 1 }, profile: 'light', deviceScaleFactor: 1,
    viewport: { width: 1440, height: 900 }, results: [entry] };
  assert.equal(summarizeSupplementalBehavior(captured).mismatches.length, 1);
  for (const patch of [{ profile: 'dark' }, { deviceScaleFactor: 2 }, { viewport: { width: 900, height: 900 } }]) {
    const result = summarizeSupplementalBehavior({ ...captured, ...patch });
    assert.ok(result.errors.length > 0);
    assert.equal(result.mismatches.length, 0, 'Bad capture metadata is not a confirmed behavioral defect');
  }
  const unknown = summarizeSupplementalBehavior({ ...captured, results: [{ ...entry, state: 'open-commit-unknown' }] });
  assert.ok(unknown.errors.some(({ error }) => error.includes('unexpected')));
  assert.equal(unknown.mismatches.length, 0);
});

function parityReport(reference, astylar) {
  return {
    schemaVersion: 1,
    generatedAt: '2026-09-10T00:00:00.000Z',
    mode: 'report-only',
    browser: { name: 'Chromium', version: 'test' },
    summary: { meetsAcceptance: true }, interactionSummary: { meetsAcceptance: true },
    results: [{
      family: 'core', profile: 'light', viewport: { id: 'desktop' },
      styleInputs: [{ id: 'core-root', reference, astylar }],
    }],
    interactions: [],
  };
}

test('complete audit acceptance rejects legacy supplements even when their case summaries load', () => {
  const report = buildMaterialInputAudit(parityReport({}, {}));
  for (const [name, key] of [['picker', 'supplementalBehavior'], ['bottom-sheet', 'supplementalOverlays'], ['slider', 'supplementalSlider']]) {
    const message = `${name} supplemental evidence is not bound to the selected capture run`;
    report[key].binding = { status: 'legacy-unbound', errors: [] };
    assert.ok(validateMaterialInputAudit(report).includes(message));
    assert.ok(!validateMaterialInputAudit(report, { requireComplete: false }).includes(message));
    report[key].binding = { status: 'checkpoint-bound', errors: [] };
    assert.ok(!validateMaterialInputAudit(report).includes(message));
  }
});

test('normalizes shorthand, colors and precision without assuming inherited defaults', () => {
  const audit = buildMaterialInputAudit(parityReport({
    ...browserDefaults,
    paddingTop: '0px', paddingRight: '24px', paddingBottom: '0px', paddingLeft: '24px',
    backgroundColor: 'rgb(103, 80, 164)', opacity: '1', width: '212.234px',
  }, {
    padding: '0 24px', background: '#6750a4', opacity: '1.0', width: '212.234375px',
  }));
  const inherited = ['fontStyle', 'pointerEvents', 'visibility'];
  assert.deepEqual(audit.discrepancies.filter(d => inherited.includes(d.property)).map(d => d.property).sort(), inherited);
  for (const d of audit.discrepancies) {
    if (inherited.includes(d.property)) {
      assert.equal(d.classification, 'parity-harness-defect'); assert.equal(d.attribution, 'unresolved');
    } else assert.equal(d.classification, 'equivalent-representation');
  }
  assert.ok(!audit.discrepancies.some(({ property }) =>
    ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'backgroundColor', 'opacity', 'width'].includes(property)));
});

test('does not infer an authoring defect from unequal resolved layout values', () => {
  const audit = buildMaterialInputAudit(parityReport({
    ...browserDefaults, position: 'relative', display: 'inline-flex', width: '212px',
  }, {
    position: 'absolute', display: 'block', width: '212px', top: '28px',
  }));
  assert.equal(audit.summary.inputEquivalent, false);
  assert.ok(audit.discrepancies.some(({ property, classification }) =>
    property === 'position' && classification === 'parity-harness-defect'));
  assert.ok(audit.summary.unresolvedAttributions > 0);
  assert.equal(audit.discrepancies.find(({ property }) => property === 'position').attribution, 'unresolved');
  assert.ok(validateMaterialInputAudit(audit).some((error) => error.includes('root-cause attribution')));
  assert.equal(validateMaterialInputAudit(audit, { requireComplete: false }).length, 0);
});

test('normalizes explicit font-weight aliases without inventing omitted or relative weights', () => {
  for (const [named, numeric] of [['normal', '400'], ['bold', '700']]) {
    assert.equal(buildMaterialInputAudit(parityReport({ fontWeight: numeric }, { fontWeight: named })).discrepancies.length, 0);
    assert.equal(buildMaterialInputAudit(parityReport({ fontWeight: named }, { fontWeight: numeric })).discrepancies.length, 0);
  }
  for (const weight of [undefined, 'bolder', 'lighter', '500', '450']) {
    assert.equal(buildMaterialInputAudit(parityReport({ fontWeight: '400' }, { fontWeight: weight })).discrepancies.length, 1);
  }
});

test('normalizes CSSOM normal tracking to explicit zero without changing captured inputs', () => {
  for (const zero of ['0', '0px', '-0px', '0.0em', '0rem']) {
    for (const [reference, astylar] of [['normal', zero], [zero, 'NORMAL']]) {
      const raw = parityReport({ letterSpacing: reference }, { letterSpacing: astylar });
      const before = JSON.stringify(raw);
      const audit = buildMaterialInputAudit(raw);
      assert.equal(audit.discrepancies.length, 0, `${reference} / ${astylar}`);
      assert.equal(JSON.stringify(raw), before);
      const normalization = audit.reviewedValueNormalizations.find((entry) => entry.property === 'letterSpacing');
      assert.deepEqual(normalization.aliases, { normal: '0' });
      assert.match(normalization.justification, /CSS Text 3 section 7.2/);
    }
  }
});

test('tracking normalization does not erase nonzero, relative, invalid or other-property differences', () => {
  for (const value of ['1px', '-1px', '0.0001px', 'var(--tracking)', 'inherit', 'initial', '0%', 'normal extra']) {
    for (const [reference, astylar] of [['normal', value], [value, 'normal']]) {
      assert.equal(buildMaterialInputAudit(parityReport({ letterSpacing: reference }, { letterSpacing: astylar }))
        .discrepancies.length, 1, `${reference} / ${astylar}`);
    }
  }
  for (const property of ['lineHeight', 'wordSpacing', 'fontStyle', 'textAlign', 'rowGap', 'columnGap']) {
    assert.equal(buildMaterialInputAudit(parityReport({ [property]: 'normal' }, { [property]: '0px' }))
      .discrepancies.length, 1, property);
  }
});

test('reviewed normalization scope and evidence cannot be replaced or removed from the audit', () => {
  const audit = buildMaterialInputAudit(parityReport({ letterSpacing: 'normal' }, { letterSpacing: '0px' }));
  assert.ok(!validateMaterialInputAudit(audit, { requireComplete: false }).some(error => error.includes('normalizations')));
  for (const mutate of [
    report => { delete report.reviewedValueNormalizations; },
    report => { report.reviewedValueNormalizations.shift(); },
    report => { report.reviewedValueNormalizations[0].aliases.normal = '1px'; },
    report => { report.reviewedValueNormalizations[0].property = 'lineHeight'; },
    report => { report.reviewedValueNormalizations[0].evidence = []; },
    report => { report.reviewedValueNormalizations[0].justification = 'Looks similar'; },
    report => { report.reviewedValueNormalizations.push(report.reviewedValueNormalizations[0]); },
  ]) {
    const changed = structuredClone(audit);
    mutate(changed);
    assert.ok(validateMaterialInputAudit(changed, { requireComplete: false }).some(error => error.includes('normalizations')));
  }
});

test('accepts only proven omitted shadow and automatic grid-placement initial values', () => {
  const audit = buildMaterialInputAudit(parityReport({ boxShadow: 'none', gridColumn: 'auto', gridRow: 'auto' }, {}));
  for (const property of ['boxShadow', 'gridColumn', 'gridRow']) {
    const entry = audit.discrepancies.find((entry) => entry.property === property);
    assert.equal(entry.classification, 'equivalent-representation');
    assert.match(entry.justification, /parseBoxShadow|parseGridAxisPlacement/);
  }
  const changed = buildMaterialInputAudit(parityReport({ boxShadow: '0 1px 2px #000', gridColumn: 'span 2', gridRow: '2' }, {}));
  assert.ok(changed.discrepancies.every((entry) => entry.attribution === 'unresolved'));
});

function borderInitialReport() {
  const raw = visibleOverflowReport(), entry = raw.results[0], input = entry.styleInputs[0];
  const reference = { color: '#123456', borderColor: '#123456', borderWidth: '0px', borderStyle: 'none' };
  const candidate = { color: '#123456', borderColor: 'transparent', borderWidth: '0px', borderStyle: 'none' };
  Object.assign(input, { reference, astylar: candidate, referenceAuthored: [],
    astylarNormalResolvedStyle: { ...candidate }, astylarInteractionResolvedStyle: { ...candidate } });
  entry.inputTrees.reference.styles = [{ ...reference }];
  entry.inputTrees.reference.nodes[0].inline = {};
  Object.assign(entry.inputTrees.astylar.nodes[0], { resolvedStyle: { ...candidate },
    normalResolvedStyle: { ...candidate }, interactionResolvedStyle: { ...candidate } });
  entry.inputTrees.astylar.rules = [
    { selector: '#other:focus, .unrelated.selected', borderColor: 'red' },
    { selector: '.unrelated', all: 'initial', mediaMaxWidth: '500px' },
    { selector: '#core-root', borderWidth: '0', borderStyle: 'none', borderRadius: '4px' },
  ];
  return raw;
}

function buttonBorderResetReport(selector = '.material-button') {
  const raw = borderInitialReport(), entry = raw.results[0], input = entry.styleInputs[0];
  input.referenceStructure.type = input.astylarStructure.type = 'button';
  entry.inputTrees.reference.nodes[0].type = 'button';
  Object.assign(entry.inputTrees.astylar.nodes[0].authored, { type: 'button', class: selector.slice(1) });
  const declarations = Object.fromEntries(['top', 'right', 'bottom', 'left'].flatMap(side =>
    [['color', 'currentcolor'], ['style', 'none'], ['width', 'medium']].map(([key, value]) => [`border-${side}-${key}`, { value, important: false }])));
  input.referenceAuthored = [{ selector: '.mdc-button', declarations },
    { selector: '.mat-mdc-button._mat-animation-noopable', declarations: {
      'animation-name': { value: 'none', important: true }, 'transition-property': { value: 'none', important: true } } }];
  entry.inputTrees.reference.rules = structuredClone(input.referenceAuthored);
  entry.inputTrees.reference.nodes[0].rules = [0, 1];
  input.astylarAuthored = [{ selector, declarations: { borderWidth: '0' } }];
  entry.inputTrees.astylar.rules.push({ selector, borderWidth: '0' });
  return raw;
}

function chipOutlineReport(selected = false) {
  const raw = borderInitialReport(), e = raw.results[0], input = e.styleInputs[0];
  e.family = 'chips'; input.id = 'chip-0';
  input.referenceStructure.type = 'mat-chip-option';
  const host = e.inputTrees.reference.nodes[0], ast = e.inputTrees.astylar.nodes[0];
  Object.assign(host, { type: 'mat-chip-option', attributes: { id: 'chip-0', class: `mat-mdc-standard-chip ${selected ? 'mdc-evolution-chip--selected' : ''}` } });
  Object.assign(ast.authored, { id: 'chip-0', class: `chip ${selected ? 'selected' : 'unselected'}`, ariaSelected: selected });
  const style = { color: '#123456', borderColor: '#79747e', borderWidth: selected ? '0' : '1px', borderStyle: 'solid' };
  Object.assign(input, { astylar: { ...style }, astylarNormalResolvedStyle: { ...style }, astylarInteractionResolvedStyle: { ...style } });
  Object.assign(ast, { resolvedStyle: { ...style }, normalResolvedStyle: { ...style }, interactionResolvedStyle: { ...style } });
  const base = { selector: '.chip', borderWidth: '1px', borderStyle: 'solid', borderColor: '#79747e' };
  const selectedRule = { selector: '.chip.selected', borderWidth: '0' };
  e.inputTrees.astylar.rules = [base, selectedRule, { selector: '.unrelated th', borderWidth: '2px' }];
  input.astylarAuthored = [base, ...(selected ? [selectedRule] : [])].map(({ selector, ...declarations }) => ({ selector, declarations }));
  const declarations = values => Object.fromEntries(Object.entries(values).map(([key, value]) => [key, { value, important: false }]));
  const baseValues = { 'box-sizing': 'border-box', content: '""', height: '100%', left: '0px', position: 'absolute',
    'pointer-events': 'none', top: '0px', width: '100%', 'z-index': '1' };
  const widths = {}, colors = {}, outline = { position: 'absolute', boxSizing: 'border-box', pointerEvents: 'none', content: '""' };
  for (const corner of ['top-left', 'top-right', 'bottom-right', 'bottom-left']) baseValues[`border-${corner}-radius`] = '';
  for (const side of ['Top', 'Right', 'Bottom', 'Left']) {
    baseValues[`border-${side.toLowerCase()}-width`] = ''; baseValues[`border-${side.toLowerCase()}-style`] = 'solid';
    widths[`border-${side.toLowerCase()}-width`] = ''; colors[`border-${side.toLowerCase()}-color`] = '';
    outline[`border${side}Width`] = selected ? '0px' : '1px'; outline[`border${side}Style`] = 'solid'; outline[`border${side}Color`] = 'rgb(123, 117, 127)';
  }
  const rules = [
    { selector: '.mat-mdc-standard-chip .mdc-evolution-chip__action--primary::before',
      cssText: 'border-width: var(--mat-chip-outline-width, 1px); border-radius: var(--mat-chip-container-shape-radius, 8px); box-sizing: border-box; content: ""; height: 100%; left: 0px; position: absolute; pointer-events: none; top: 0px; width: 100%; z-index: 1; border-style: solid;', declarations: declarations(baseValues) },
    { selector: '.mat-mdc-standard-chip:not(.mdc-evolution-chip--disabled) .mdc-evolution-chip__action--primary::before',
      cssText: 'border-color: var(--mat-chip-outline-color, var(--mat-sys-outline));', declarations: declarations(colors) },
    ...(selected ? [{ selector: '.mat-mdc-standard-chip.mdc-evolution-chip--selected .mdc-evolution-chip__action--primary::before',
      cssText: 'border-width: var(--mat-chip-flat-selected-outline-width, 0);', declarations: declarations(widths) }] : []),
  ].map(r => ({ ...r, active: true, conditions: [] }));
  e.inputTrees.reference.rules = rules;
  e.inputTrees.reference.styles.push(outline);
  e.inputTrees.reference.nodes.push({ key: 'frame/0/action', parent: host.key, type: 'button',
    attributes: { class: 'mdc-evolution-chip__action--primary', 'aria-selected': String(selected), 'aria-disabled': 'false' },
    ownText: '', style: 0, rules: [], inline: {}, pseudoElements: [{ pseudo: '::before', generated: true, style: 1, rules: rules.map((_, i) => i) }] });
  return raw;
}

test('chip outline attribution preserves host and generated owners in both selection states', () => {
  for (const selected of [false, true]) {
    const raw = chipOutlineReport(selected), before = JSON.stringify(raw), audit = buildMaterialInputAudit(raw);
    assert.equal(audit.chipOutlineInputs.length, 1);
    const proof = audit.chipOutlineInputs[0];
    assert.equal(proof.selected, selected);
    assert.notEqual(proof.referenceNode, proof.actionNode);
    assert.equal(proof.referenceOutline.owner, proof.actionNode);
    assert.equal(proof.reference.borderLeftColor, 'rgba(18,52,86,1)');
    assert.equal(proof.referenceOutline.style.borderLeftColor, 'rgb(123, 117, 127)');
    assert.equal(proof.inputEquivalent, false); assert.equal(proof.finalRasterVerified, false);
    const differences = audit.discrepancies.filter(d => d.attribution === 'reviewed-chip-outline-owner-substitution');
    assert.equal(differences.length, selected ? 8 : 12);
    assert.ok(differences.every(d => d.classification === 'application-plugin-authoring-defect'));
    assert.ok(!validateMaterialInputAudit(audit, { requireComplete: false }).some(e => e.includes('chip outline')));
    assert.equal(JSON.stringify(raw), before);
  }
});

test('chip outline attribution rejects missing owners, state mismatches and competing border inputs', () => {
  const mutations = [
    e => { e.inputTrees.reference.nodes[1].parent = 'missing'; },
    e => { e.inputTrees.reference.nodes[1].parent = e.inputTrees.reference.nodes[1].key; },
    e => { e.inputTrees.reference.nodes.push(structuredClone(e.inputTrees.reference.nodes[1])); },
    e => { e.inputTrees.reference.nodes[1].attributes['aria-selected'] = 'true'; },
    e => { e.inputTrees.reference.nodes[1].attributes['aria-disabled'] = 'true'; },
    e => { e.inputTrees.reference.nodes[0].attributes.class = ''; },
    e => { e.inputTrees.reference.nodes[0].type = 'div'; },
    e => { e.inputTrees.reference.nodes[0].inline = { border: { value: 'none' } }; },
    e => { e.inputTrees.reference.nodes[1].pseudoElements = []; },
    e => { e.inputTrees.reference.nodes[1].pseudoElements[0].generated = false; },
    e => { e.inputTrees.reference.nodes[1].pseudoElements[0].pseudo = '::after'; },
    e => { e.inputTrees.reference.rules[0].active = false; },
    e => { e.inputTrees.reference.rules[0].cssText = 'border:1px solid red;'; },
    e => { e.inputTrees.reference.rules[0].declarations.position.value = 'static'; },
    e => { e.inputTrees.reference.rules[1].declarations['border-left-color'].value = 'red'; },
    e => { e.inputTrees.reference.rules[1].declarations['border-left-color'].important = true; },
    e => { e.inputTrees.reference.styles[1].pointerEvents = 'auto'; },
    e => { e.inputTrees.reference.styles[1].borderTopWidth = '0px'; },
    e => { delete e.inputTrees.reference.styles[1].borderTopColor; },
    e => { e.inputTrees.reference.styles[1].borderLeftColor = 'red'; },
    e => { e.inputTrees.reference.styles[0].borderWidth = '1px'; },
    e => { e.inputTrees.astylar.nodes[0].authored.ariaSelected = true; },
    e => { e.inputTrees.astylar.nodes[0].authored.class = 'chip selected'; },
    e => { e.inputTrees.astylar.nodes[0].authored.style = { borderWidth: '1px' }; },
    e => { e.inputTrees.astylar.rules[0].borderColor = '#123456'; },
    e => { e.inputTrees.astylar.rules[1].borderWidth = '1px'; },
    e => { e.inputTrees.astylar.rules.push({ selector: '.chip:hover', borderWidth: '2px' }); },
    e => { e.inputTrees.astylar.rules.push({ selector: '.unrelated div', borderWidth: '2px' }); },
    e => { e.inputTrees.astylar.rules.push({ selector: '.unrelated th, .chip', borderWidth: '2px' }); },
    e => { e.inputTrees.astylar.rules.push({ selector: ':is(.chip)', borderWidth: '2px' }); },
    e => { e.inputTrees.astylar.rules.push({ selector: '.chip', nested: { borderWidth: '2px' } }); },
    e => { e.inputTrees.astylar.nodes[0].interactionResolvedStyle.borderWidth = '2px'; },
    e => { delete e.inputTrees.astylar.nodes[0].normalResolvedStyle; },
    e => { e.inputTrees.astylar.resolvedStyleEvidenceVersion = 1; },
    e => { e.inputTrees.astylar.resolvedStyleSource = 'mesh-metadata'; },
    e => { delete e.inputTrees.astylar.resolvedStyleRevision; },
    e => { delete e.inputTrees.astylar.rules; },
    e => { e.inputTrees.reference.errors.push('missing owner'); },
    e => { e.styleInputs[0].referenceStructure.type = 'span'; },
    e => { e.styleInputs[0].referenceAuthored = undefined; },
    e => { e.styleInputs[0].astylarAuthored = []; },
    e => { e.styleInputs[0].astylarNormalResolvedStyle.borderStyle = 'none'; },
  ];
  for (const change of mutations) {
    const raw = chipOutlineReport(); change(raw.results[0]);
    assert.ok(buildMaterialInputAudit(raw).discrepancies.every(d => d.attribution !== 'reviewed-chip-outline-owner-substitution'), String(change));
  }
});

test('chip outline evidence must replay and retain every reviewed case beyond display samples', () => {
  const raw = chipOutlineReport();
  raw.results = Array.from({ length: 14 }, (_, i) => ({ ...structuredClone(raw.results[0]), state: `state-${i}` }));
  const audit = buildMaterialInputAudit(raw);
  assert.equal(audit.chipOutlineInputs.length, 14);
  for (const d of audit.discrepancies.filter(d => d.attribution === 'reviewed-chip-outline-owner-substitution')) {
    assert.equal(d.cases.length, 12); assert.equal(d.reviewedCases.length, 14); assert.equal(d.occurrences, 14);
  }
  for (const change of [
    a => { delete a.chipOutlineInputs; },
    a => { a.chipOutlineInputs[0].referenceOutline.owner = 'wrong-owner'; },
    a => { a.chipOutlineInputs[0].selected = true; },
    a => { a.chipOutlineInputs[0].inputEquivalent = true; },
    a => { a.elementInventory.variants.find(v => v.side === 'astylar').ruleEvidenceComplete = false; },
    a => { a.discrepancies.find(d => d.attribution === 'reviewed-chip-outline-owner-substitution').reviewedCases.pop(); },
    a => { a.discrepancies.find(d => d.attribution === 'reviewed-chip-outline-owner-substitution').reference = 'rgba(123,117,127,1)'; },
    a => { a.discrepancies.find(d => d.attribution === 'reviewed-chip-outline-owner-substitution').classification = 'equivalent-representation'; },
    a => { const d = a.discrepancies.find(d => d.attribution === 'reviewed-chip-outline-owner-substitution'); d.property = 'unproved'; delete d.reference; delete d.astylar; },
  ]) {
    const altered = structuredClone(audit); change(altered);
    assert.ok(validateMaterialInputAudit(altered, { requireComplete: false }).some(e => e.includes('chip outline')), String(change));
  }
});

function outlineTokenReport(kind = 'button') {
  const raw = kind === 'button' ? buttonBorderResetReport() : borderInitialReport();
  const entry = raw.results[0], input = entry.styleInputs[0], left = kind === 'divider';
  const id = kind === 'button' ? 'core-root' : left ? 'button-toggle-two' : 'button-toggle-primary';
  const selector = kind === 'button' ? '.outlined' : `#${id}`;
  const referenceType = kind === 'button' ? 'button' : left ? 'mat-button-toggle' : 'mat-button-toggle-group';
  const sides = left ? ['Left'] : ['Top', 'Right', 'Bottom', 'Left'];
  const reference = { borderColor: '#7b757f', borderWidth: '1px', borderStyle: 'solid' };
  const candidate = { borderColor: '#79747e', borderWidth: '1px', borderStyle: 'solid' };
  if (left) {
    Object.assign(reference, { borderColor: '#123456', borderLeftColor: '#7b757f', borderWidth: '0 0 0 1px', borderStyle: 'none none none solid' });
    candidate.borderWidth = '0 0 0 1px';
  }
  Object.assign(input, { id, reference, astylar: candidate,
    referenceStructure: { schemaVersion: 2, type: referenceType }, astylarStructure: { schemaVersion: 2, type: kind === 'button' ? 'button' : 'div' },
    astylarNormalResolvedStyle: { ...candidate }, astylarInteractionResolvedStyle: { ...candidate } });
  const refNode = entry.inputTrees.reference.nodes[0], astNode = entry.inputTrees.astylar.nodes[0];
  Object.assign(refNode, { type: referenceType, attributes: { id }, inline: {} });
  Object.assign(astNode, { authored: { id, type: kind === 'button' ? 'button' : 'div', class: kind === 'button' ? 'material-button outlined' : '' },
    resolvedStyle: { ...candidate }, normalResolvedStyle: { ...candidate }, interactionResolvedStyle: { ...candidate } });
  entry.inputTrees.reference.styles = [{ ...reference }];
  const token = { selector: kind === 'button' ? '.mat-mdc-outlined-button:not(:disabled)' : left
    ? '.mat-button-toggle-group-appearance-standard .mat-button-toggle-appearance-standard + .mat-button-toggle-appearance-standard'
    : '.mat-button-toggle-standalone.mat-button-toggle-appearance-standard, .mat-button-toggle-group-appearance-standard',
    cssText: kind === 'button' ? 'border-color: var(--mat-button-outlined-outline-color, var(--mat-sys-outline));'
      : `${left ? 'border-left' : 'border'}: solid 1px var(--mat-button-toggle-divider-color, var(--mat-sys-outline));`,
    declarations: Object.fromEntries(sides.map(side => [`border-${side.toLowerCase()}-color`, { value: '', important: false }])), active: true, conditions: [] };
  entry.inputTrees.reference.rules = [...entry.inputTrees.reference.rules, token].map(rule => ({ ...rule, active: true, conditions: [] }));
  refNode.rules = entry.inputTrees.reference.rules.map((_, index) => index);
  input.referenceAuthored = structuredClone(entry.inputTrees.reference.rules);
  const literal = { selector, ...candidate };
  entry.inputTrees.astylar.rules.push(literal);
  input.astylarAuthored = [...(input.astylarAuthored ?? []), { selector, declarations: { ...candidate } }];
  return raw;
}

test('outline token attribution requires exact authored shorthand and covers only the proved border sides', () => {
  for (const kind of ['button', 'group', 'divider']) {
    const raw = outlineTokenReport(kind), before = JSON.stringify(raw), audit = buildMaterialInputAudit(raw);
    assert.equal(audit.outlineTokenInputs.length, 1, kind);
    const proof = audit.outlineTokenInputs[0];
    assert.equal(proof.inputEquivalent, false);
    assert.equal(proof.finalRasterVerified, false);
    assert.ok(proof.referenceWitness.token.cssText.includes('var(--mat-'));
    const differences = audit.discrepancies.filter(entry => entry.attribution === 'reviewed-material-outline-token-substitution');
    assert.equal(differences.length, kind === 'divider' ? 1 : 4, kind);
    assert.ok(differences.every(entry => entry.classification === 'application-plugin-authoring-defect'));
    if (kind === 'divider') assert.deepEqual(proof.properties, ['borderLeftColor']);
    assert.ok(!validateMaterialInputAudit(audit, { requireComplete: false }).some(error => error.includes('outline token')));
    assert.equal(JSON.stringify(raw), before);
  }
});

test('outline token attribution rejects incomplete, conflicting and mismapped declarations or styles', () => {
  const mutations = [
    e => { delete e.inputTrees.reference.rules.at(-1).cssText; },
    e => { e.inputTrees.reference.rules.at(-1).cssText = 'border-color: red;'; },
    e => { e.inputTrees.reference.rules.at(-1).active = false; },
    e => { delete e.inputTrees.reference.rules.at(-1).active; },
    e => { e.inputTrees.reference.rules.at(-1).declarations['border-top-color'].value = '#7b757f'; },
    e => { e.inputTrees.reference.rules.at(-1).declarations['border-top-color'].important = true; },
    e => { e.inputTrees.reference.rules.at(-1).declarations.all = { value: 'unset' }; },
    e => { e.inputTrees.reference.rules[1].declarations['animation-name'].important = false; },
    e => { e.inputTrees.reference.rules.push(structuredClone(e.inputTrees.reference.rules.at(-1))); e.inputTrees.reference.nodes[0].rules.push(3); },
    e => { e.inputTrees.reference.nodes[0].inline = { 'border-color': { value: 'red' } }; },
    e => { e.inputTrees.reference.nodes[0].type = 'span'; },
    e => { e.inputTrees.reference.nodes.push(structuredClone(e.inputTrees.reference.nodes[0])); },
    e => { e.inputTrees.astylar.nodes.push(structuredClone(e.inputTrees.astylar.nodes[0])); },
    e => { e.inputTrees.astylar.nodes[0].authored.id = 'unrelated'; },
    e => { e.inputTrees.astylar.nodes[0].authored.class = 'material-button'; },
    e => { e.inputTrees.astylar.nodes[0].authored.style = { borderColor: '#79747e' }; },
    e => { e.inputTrees.astylar.rules.push({ selector: '.outlined:focus', borderColor: 'red', mediaMaxWidth: '1px' }); },
    e => { e.inputTrees.astylar.rules.push({ selector: ':is(.outlined)', all: 'initial' }); },
    e => { e.inputTrees.astylar.rules.push({ selector: '.outlined', nested: { borderColor: 'red' } }); },
    e => { e.inputTrees.astylar.rules.at(-1).borderColor = 'transparent'; },
    e => { e.inputTrees.astylar.nodes[0].normalResolvedStyle.borderColor = 'red'; },
    e => { e.inputTrees.astylar.nodes[0].resolvedStyle.borderLeftWidth = '2px'; },
    e => { e.inputTrees.astylar.nodes[0].interactionResolvedStyle.borderStyle = 'none'; },
    e => { e.inputTrees.astylar.nodes[0].resolvedStyle.borderInlineColor = 'red'; },
    e => { e.inputTrees.astylar.resolvedStyleEvidenceVersion = 1; },
    e => { e.inputTrees.astylar.resolvedStyleSource = 'mesh-metadata'; },
    e => { delete e.inputTrees.astylar.nodes[0].normalResolvedStyle; },
    e => { delete e.inputTrees.astylar.resolvedStyleRevision; },
    e => { delete e.inputTrees.astylar.rules; },
    e => { e.inputTrees.astylar.errors.push('missing rules'); },
    e => { e.inputTrees.reference.styles[0].borderColor = '#79747e'; },
    e => { e.styleInputs[0].referenceAuthored = []; },
    e => { e.styleInputs[0].astylarAuthored = []; },
    e => { e.styleInputs[0].referenceAuthored.at(-1).declarations['border-left-color'].value = 'red'; },
    e => { e.styleInputs[0].astylarInteractionResolvedStyle.borderColor = 'red'; },
    e => { e.styleInputs[0].referenceStructure.type = 'span'; },
  ];
  for (const change of mutations) {
    const raw = outlineTokenReport(); change(raw.results[0]);
    assert.ok(buildMaterialInputAudit(raw).discrepancies.every(entry => entry.attribution !== 'reviewed-material-outline-token-substitution'), String(change));
  }
});

test('outline token evidence and side-specific classifications must independently replay', () => {
  const original = buildMaterialInputAudit(outlineTokenReport());
  for (const change of [
    a => { delete a.outlineTokenInputs; },
    a => { a.outlineTokenInputs = []; },
    a => { a.outlineTokenInputs[0].inputEquivalent = true; },
    a => { a.outlineTokenInputs[0].referenceWitness.token.cssText = 'border-color: red;'; },
    a => { a.outlineTokenInputs[0].properties = ['borderLeftColor']; },
    a => { a.outlineTokenInputs[0].revision++; },
    a => { a.elementInventory.variants.find(tree => tree.side === 'astylar').ruleEvidenceComplete = false; },
    a => { a.discrepancies[0].classification = 'equivalent-representation'; },
    a => { a.discrepancies[0].property = 'borderTopWidth'; },
    a => { a.discrepancies[0].reference = 'rgba(121,116,126,1)'; },
    a => { a.discrepancies[0].reviewedCases = []; },
    a => { a.discrepancies[0].reviewedCases.push('uncaptured-case'); },
  ]) {
    const changed = structuredClone(original); change(changed);
    assert.ok(validateMaterialInputAudit(changed, { requireComplete: false }).some(error => error.includes('outline token')), String(change));
  }
});

test('outline token attribution retains every reviewed case beyond the twelve displayed samples', () => {
  const raw = outlineTokenReport();
  raw.results = Array.from({ length: 14 }, (_, index) => ({ ...structuredClone(raw.results[0]), state: `state-${index}` }));
  const audit = buildMaterialInputAudit(raw);
  assert.equal(audit.outlineTokenInputs.length, 14);
  for (const difference of audit.discrepancies) {
    assert.equal(difference.attribution, 'reviewed-material-outline-token-substitution');
    assert.equal(difference.cases.length, 12);
    assert.equal(difference.reviewedCases.length, 14);
    assert.equal(difference.occurrences, 14);
  }
  assert.ok(!validateMaterialInputAudit(audit, { requireComplete: false }).some(error => error.includes('outline token')));
});

test('button border-reset attribution preserves the explicit reset rather than claiming an omitted reference color', () => {
  for (const selector of ['.material-button', '.text-button', '.toolbar-action']) {
    const raw = buttonBorderResetReport(selector), before = JSON.stringify(raw), audit = buildMaterialInputAudit(raw);
    const proofs = audit.buttonBorderResetInputs.filter(entry => entry.element === 'core-root');
    assert.equal(proofs.length, 1);
    assert.equal(proofs[0].referenceReset.reset, 'medium none currentColor');
    assert.equal(proofs[0].candidateWidthRule, selector);
    assert.equal(proofs[0].inputEquivalent, false);
    assert.equal(proofs[0].finalRasterVerified, false);
    assert.equal(audit.discrepancies.length, 4);
    assert.ok(audit.discrepancies.every(entry => entry.attribution === 'reviewed-material-button-border-reset-omission' &&
      entry.classification === 'application-plugin-authoring-defect'));
    assert.equal(audit.borderInitialInputs.filter(entry => entry.element === 'core-root').length, 0);
    assert.equal(validateMaterialInputAudit(audit, { requireComplete: false }).length, 0);
    assert.equal(JSON.stringify(raw), before);
  }
});

test('button border-reset attribution rejects conflicting rules, styles, native-default guesses and absent stages', () => {
  for (const change of [
    e => { e.inputTrees.reference.rules[0].selector = '.unreviewed'; },
    e => { e.inputTrees.reference.rules[0].declarations['border-top-color'].value = 'transparent'; },
    e => { e.inputTrees.reference.rules[0].declarations['border-left-width'].value = '0px'; },
    e => { e.inputTrees.reference.rules[0].declarations.all = { value: 'initial' }; },
    e => { e.inputTrees.reference.rules[1].declarations['animation-name'].important = false; },
    e => { e.inputTrees.reference.rules[1].declarations['transition-property'].value = 'all'; },
    e => { e.inputTrees.reference.rules.push({ selector: '.other', declarations: { 'animation-name': { value: 'pulse', important: true } } }); e.inputTrees.reference.nodes[0].rules.push(2); },
    e => { e.inputTrees.reference.nodes[0].type = 'span'; },
    e => { e.inputTrees.astylar.nodes[0].authored.type = 'div'; },
    e => { e.inputTrees.astylar.nodes[0].authored.class = 'unrelated'; },
    e => { e.inputTrees.astylar.nodes[0].normalResolvedStyle.borderStyle = 'solid'; },
    e => { e.inputTrees.astylar.nodes[0].interactionResolvedStyle.borderWidth = '1px'; },
    e => { e.inputTrees.astylar.nodes[0].authored.style = { borderColor: 'transparent' }; },
    e => { e.inputTrees.astylar.rules.push({ selector: '.material-button:focus', borderColor: 'red' }); },
    e => { delete e.inputTrees.astylar.nodes[0].normalResolvedStyle; },
    e => { delete e.inputTrees.astylar.rules; },
    e => { e.inputTrees.astylar.resolvedStyleSource = 'mesh-metadata'; },
    e => { e.styleInputs[0].referenceAuthored = []; },
    e => { e.styleInputs[0].astylarAuthored = []; },
    e => { e.styleInputs[0].astylarNormalResolvedStyle.borderWidth = '1px'; },
  ]) {
    const raw = buttonBorderResetReport(); change(raw.results[0]);
    assert.ok(buildMaterialInputAudit(raw).discrepancies.every(entry => entry.attribution !== 'reviewed-material-button-border-reset-omission'), String(change));
  }
});

test('button border-reset evidence and per-case classification cannot be forged', () => {
  const original = buildMaterialInputAudit(buttonBorderResetReport());
  for (const change of [
    a => { delete a.buttonBorderResetInputs; },
    a => { a.buttonBorderResetInputs[0].referenceReset.reset = 'none'; },
    a => { a.buttonBorderResetInputs[0].inputEquivalent = true; },
    a => { a.elementInventory.rules.find(rule => rule.side === 'reference').value.declarations['border-top-color'].value = 'red'; },
    a => { a.discrepancies[0].classification = 'intentional-documented-limitation'; },
    a => { a.discrepancies[0].reviewedCases = []; },
    a => { a.discrepancies[0].reference = 'rgba(0,0,0,0)'; },
  ]) {
    const changed = structuredClone(original); change(changed);
    assert.ok(validateMaterialInputAudit(changed, { requireComplete: false }).some(error => error.includes('button border-reset')), String(change));
  }
});

test('border initial-color attribution checks complete authored rules and never waives the unequal input', () => {
  for (const state of [undefined, 'hover']) {
    const raw = borderInitialReport();
    raw.results[0].state = state;
    const before = JSON.stringify(raw), audit = buildMaterialInputAudit(raw);
    assert.equal(audit.borderInitialInputs.filter(entry => entry.element === 'core-root').length, 1);
    const proof = audit.borderInitialInputs.find(entry => entry.element === 'core-root');
    assert.equal(proof.excludedCandidateRules.length, 2);
    assert.equal(proof.candidateRuleCount, 3);
    assert.equal(proof.inputEquivalent, false);
    assert.equal(proof.finalRasterVerified, false);
    assert.equal(audit.discrepancies.length, 4);
    for (const difference of audit.discrepancies) {
      assert.equal(difference.attribution, 'reviewed-border-initial-color-divergence');
      assert.equal(difference.classification, 'intentional-documented-limitation');
      assert.equal(difference.reviewedCases.length, difference.occurrences);
      assert.equal(difference.reviewEvidence.revision, 7);
    }
    assert.equal(audit.summary.inputEquivalent, false);
    assert.equal(validateMaterialInputAudit(audit, { requireComplete: false }).length, 0);
    assert.equal(JSON.stringify(raw), before);
  }
});

test('border initial-color attribution fails closed on selectors, declarations and missing provenance', () => {
  const changes = [
    e => { delete e.inputTrees.astylar.rules; },
    e => { delete e.inputTrees.astylar.errors; },
    e => { e.inputTrees.astylar.rules.push({ selector: '#core-root:disabled', borderColor: 'red' }); },
    e => { e.inputTrees.astylar.rules.push({ selector: '#core-root', borderColor: 'transparent', mediaMaxWidth: '1px' }); },
    e => { e.inputTrees.astylar.rules.push({ selector: ':not(.unrelated)', borderColor: 'red' }); },
    e => { e.inputTrees.astylar.rules.push({ selector: '.parent > #other', borderColor: 'red' }); },
    e => { e.inputTrees.astylar.rules.push({ borderColor: 'red' }); },
    e => { e.inputTrees.astylar.rules.push({ selector: '#other', media: { borderColor: 'red' } }); },
    e => { e.inputTrees.astylar.nodes[0].authored.style = { border: '1px solid' }; },
    e => { e.inputTrees.astylar.nodes[0].authored.style = { 'border-inline-start': 'solid' }; },
    e => { e.inputTrees.astylar.nodes[0].authored.style = { all: 'unset' }; },
    e => { e.inputTrees.astylar.nodes[0].authored.style = { '-webkit-border-before-color': 'red' }; },
    e => { e.inputTrees.astylar.rules.push({ selector: '#core-root', animationName: 'border-pulse' }); },
    e => { e.inputTrees.astylar.nodes[0].authored.style = 'border-color: red'; },
    e => { e.inputTrees.astylar.nodes[0].authored.class = ['unrelated']; },
    e => { e.inputTrees.astylar.nodes[0].authored.type = 'input'; },
    e => { e.inputTrees.astylar.nodes[0].authored.type = 'showcase.material:panel'; },
    e => { e.inputTrees.astylar.nodes[0].normalResolvedStyle.borderColor = '#123456'; },
    e => { e.inputTrees.astylar.nodes[0].resolvedStyle.borderTopColor = 'transparent'; },
    e => { delete e.inputTrees.astylar.nodes[0].interactionResolvedStyle; },
    e => { e.inputTrees.astylar.resolvedStyleSource = 'mesh-metadata'; },
    e => { e.inputTrees.astylar.resolvedStyleEvidenceVersion = 1; },
    e => { e.inputTrees.astylar.resolvedStyleRevision = -1; },
    e => { e.inputTrees.astylar.nodes.push(structuredClone(e.inputTrees.astylar.nodes[0])); },
    e => { e.inputTrees.reference.nodes.push(structuredClone(e.inputTrees.reference.nodes[0])); },
    e => { e.inputTrees.reference.nodes[0].type = 'button'; },
    e => { delete e.inputTrees.reference.nodes[0].inline; },
    e => { e.inputTrees.reference.nodes[0].inline = { 'border-color': { value: 'currentColor' } }; },
    e => { e.inputTrees.reference.nodes[0].inline = { transition: { value: 'all 1s' } }; },
    e => { e.inputTrees.reference.rules.push({ selector: '*', declarations: { border: { value: '0' } } }); e.inputTrees.reference.nodes[0].rules = [0]; },
    e => { delete e.inputTrees.reference.styles[0].color; },
    e => { e.inputTrees.reference.styles[0].borderLeftColor = 'red'; },
    e => { e.inputTrees.reference.errors.push('missing sheet'); },
    e => { e.styleInputs[0].astylarAuthored = [{ selector: '#core-root', declarations: { borderColor: 'red' } }]; },
    e => { delete e.styleInputs[0].referenceAuthored; },
    e => { delete e.styleInputs[0].astylarNormalResolvedStyle; },
    e => { e.styleInputs[0].astylarStructure.type = 'span'; },
    e => { e.styleInputs[0].reference = { color: 'blue', borderColor: 'blue' }; },
    e => { e.styleInputs[0].astylarResolvedStyleEvidenceVersion = 1; },
  ];
  for (const change of changes) {
    const raw = borderInitialReport();
    change(raw.results[0]);
    assert.ok(buildMaterialInputAudit(raw).discrepancies.every(entry => entry.attribution !== 'reviewed-border-initial-color-divergence'), String(change));
  }
});

test('border initial-color validation replays declarations, pooled sides and every occurrence', () => {
  const original = buildMaterialInputAudit(borderInitialReport());
  for (const change of [
    a => { delete a.borderInitialInputs; },
    a => { a.borderInitialInputs = []; },
    a => { a.borderInitialInputs[0].inputEquivalent = true; },
    a => { a.borderInitialInputs[0].excludedCandidateRules = []; },
    a => { a.borderInitialInputs[0].revision++; },
    a => { a.elementInventory.rules.find(rule => rule.side === 'astylar').value.selector = '#core-root'; },
    a => { a.elementInventory.rules.find(rule => rule.side === 'astylar').side = 'reference'; },
    a => { a.elementInventory.variants.find(tree => tree.side === 'astylar').ruleEvidenceComplete = false; },
    a => { a.discrepancies[0].classification = 'equivalent-representation'; },
    a => { a.discrepancies[0].property = 'borderTopWidth'; },
    a => { a.discrepancies[0].occurrences++; },
    a => { a.discrepancies[0].reviewedCases.push('uncaptured-case'); },
    a => { a.discrepancies[0].reviewEvidence.astylarNode = 'wrong'; },
  ]) {
    const changed = structuredClone(original);
    change(changed);
    assert.ok(validateMaterialInputAudit(changed, { requireComplete: false }).some(error => error.includes('border initial-color')), String(change));
  }
});

test('border initial-color keeps all reviewed state cases beyond the display sample limit', () => {
  const raw = borderInitialReport();
  raw.results = Array.from({ length: 14 }, (_, index) => ({ ...structuredClone(raw.results[0]), state: `state-${index}` }));
  const audit = buildMaterialInputAudit(raw);
  assert.equal(audit.borderInitialInputs.filter(entry => entry.element === 'core-root').length, 14);
  for (const difference of audit.discrepancies) {
    assert.equal(difference.attribution, 'reviewed-border-initial-color-divergence');
    assert.equal(difference.cases.length, 12);
    assert.equal(difference.reviewedCases.length, 14);
    assert.equal(difference.occurrences, 14);
  }
  assert.ok(!validateMaterialInputAudit(audit, { requireComplete: false }).some(error => error.includes('border initial-color')));
});

function visibleOverflowReport() {
  const reference = { display: 'block', overflowX: 'visible', overflowY: 'visible' };
  const candidate = { display: 'block' };
  const raw = parityReport(reference, candidate), entry = raw.results[0], input = entry.styleInputs[0];
  Object.assign(input, { referenceStructure: { schemaVersion: 2, type: 'div' },
    astylarStructure: { schemaVersion: 2, type: 'div' }, astylarResolvedStyleEvidenceVersion: 2,
    astylarAuthored: [],
    astylarNormalResolvedStyle: { ...candidate }, astylarInteractionResolvedStyle: { ...candidate } });
  entry.inputTrees = {
    reference: { schemaVersion: 1, styles: [{ ...reference }], rules: [], errors: [], nodes: [
      { key: 'frame/0', parent: 'frame', type: 'div', attributes: { id: 'core-root' }, ownText: '',
        style: 0, rules: [], pseudoElements: [] },
    ] },
    astylar: { schemaVersion: 1, resolvedStyleEvidenceVersion: 2, resolvedStyleSource: 'core-style-inspection',
      resolvedStyleRevision: 7, rules: [], errors: [], nodes: [
        { key: 'root/0', parent: 'root', authored: { id: 'core-root', type: 'div' },
          resolvedStyle: { ...candidate }, normalResolvedStyle: { ...candidate }, interactionResolvedStyle: { ...candidate } },
      ] },
  };
  return raw;
}

test('visible overflow omission requires both axes and independently captured core stages', () => {
  for (const state of [undefined, 'hover']) {
    const raw = visibleOverflowReport();
    if (state) raw.results[0].state = state;
    const before = JSON.stringify(raw), audit = buildMaterialInputAudit(raw);
    assert.equal(audit.visibleOverflowInputs.filter(entry => entry.element === 'core-root').length, 1);
    assert.equal(audit.discrepancies.length, 2);
    for (const entry of audit.discrepancies) {
      assert.equal(entry.attribution, 'reviewed-visible-overflow-initial-value');
      assert.equal(entry.classification, 'equivalent-representation');
      assert.equal(entry.astylar, undefined);
      assert.equal(entry.reviewEvidence.revision, 7);
      assert.match(entry.reviewEvidence.scope, /no container, clipping, reachability or final-raster equivalence claim/);
    }
    assert.equal(validateMaterialInputAudit(audit, { requireComplete: false }).length, 0);
    assert.equal(JSON.stringify(raw), before);
  }
});

test('visible overflow omission fails closed for mixed axes, controls, authored overrides and missing evidence', () => {
  const mutations = [
    e => { e.inputTrees.reference.styles[0].overflowY = 'auto'; },
    e => { delete e.inputTrees.reference.styles[0].overflowY; },
    e => { e.inputTrees.astylar.nodes[0].normalResolvedStyle.overflow = 'hidden'; },
    e => { e.inputTrees.astylar.nodes[0].interactionResolvedStyle.overflow = 'scroll'; },
    e => { e.inputTrees.astylar.nodes[0].resolvedStyle.overflowX = 'visible'; },
    e => { e.inputTrees.astylar.nodes[0].resolvedStyle.overflowInline = 'clip'; },
    e => { e.inputTrees.astylar.nodes[0].resolvedStyle.all = 'unset'; },
    e => { e.inputTrees.astylar.nodes[0].authored.style = { overflow: 'hidden' }; },
    e => { e.inputTrees.astylar.nodes[0].authored.style = 'overflow: hidden'; },
    e => { delete e.inputTrees.astylar.nodes[0].normalResolvedStyle; },
    e => { delete e.inputTrees.astylar.nodes[0].interactionResolvedStyle; },
    e => { e.inputTrees.astylar.resolvedStyleEvidenceVersion = 1; },
    e => { e.inputTrees.astylar.resolvedStyleSource = 'mesh-metadata'; },
    e => { delete e.inputTrees.astylar.resolvedStyleRevision; },
    e => { e.inputTrees.astylar.nodes.push(structuredClone(e.inputTrees.astylar.nodes[0])); },
    e => { e.inputTrees.reference.nodes.push(structuredClone(e.inputTrees.reference.nodes[0])); },
    e => { e.inputTrees.astylar.errors.push('incomplete capture'); },
    e => { e.inputTrees.reference.nodes[0].type = 'body'; },
    e => { e.inputTrees.reference.nodes[0].type = 'button'; },
    e => { e.inputTrees.astylar.nodes[0].authored.type = 'showcase.material:panel'; },
    e => { e.styleInputs[0].astylarResolvedStyleEvidenceVersion = 1; },
    e => { e.styleInputs[0].astylarStructure.type = 'span'; },
    e => { delete e.styleInputs[0].astylarNormalResolvedStyle; },
    e => { e.styleInputs[0].astylarNormalResolvedStyle.overflow = 'hidden'; },
    e => { e.styleInputs[0].reference.overflowY = 'scroll'; },
    e => { delete e.styleInputs[0].astylarAuthored; },
    e => { e.styleInputs[0].astylarAuthored = [{ selector: '#core-root', declarations: { overflow: 'hidden' } }]; },
    e => { e.styleInputs[0].astylarAuthored = [{ selector: '#core-root', declarations: { 'overflow-y': 'auto' } }]; },
    e => { e.styleInputs[0].astylarAuthored = [{ selector: '#core-root', declarations: { all: 'initial' } }]; },
    e => { e.styleInputs[0].astylarAuthored = [{ selector: '#core-root' }]; },
  ];
  for (const mutate of mutations) {
    const raw = visibleOverflowReport();
    mutate(raw.results[0]);
    assert.ok(buildMaterialInputAudit(raw).discrepancies.every(entry => entry.attribution !== 'reviewed-visible-overflow-initial-value'), String(mutate));
  }
});

test('visible overflow validation replays inventory and rejects forged classification evidence', () => {
  const original = buildMaterialInputAudit(visibleOverflowReport());
  const mutations = [
    a => { delete a.visibleOverflowInputs; },
    a => { a.visibleOverflowInputs = []; },
    a => { a.visibleOverflowInputs.push(structuredClone(a.visibleOverflowInputs[0])); },
    a => { a.visibleOverflowInputs[0].revision++; },
    a => { a.discrepancies[0].reference = 'hidden'; },
    a => { a.discrepancies[0].astylar = 'auto'; },
    a => { a.discrepancies[0].property = 'width'; },
    a => { a.discrepancies[0].reviewEvidence.referenceNode = 'wrong'; },
    a => { a.discrepancies[0].classification = 'confirmed-core-renderer-defect'; },
    a => { a.elementInventory.styles.find(s => s.side === 'astylar').value.overflow = 'hidden'; },
  ];
  for (const mutate of mutations) {
    const changed = structuredClone(original);
    mutate(changed);
    assert.ok(validateMaterialInputAudit(changed, { requireComplete: false }).some(error => error.includes('visible overflow')), String(mutate));
  }
});

test('attributes the reviewed shared root only with matching captured authoring evidence', () => {
  const raw = parityReport({ display: 'block', position: 'static' }, { display: 'flex', position: 'relative' });
  const input = raw.results[0].styleInputs[0];
  input.referenceStructure = { schemaVersion: 2, type: 'section' };
  input.astylarStructure = { schemaVersion: 2, type: 'section' };
  input.referenceAuthored = [{ selector: '.demo[_ngcontent-test]', declarations: { 'max-width': { value: '720px' } } }];
  input.astylarAuthored = [{ selector: '#core-root', declarations: { display: 'flex', position: 'relative' } }];
  const audit = buildMaterialInputAudit(raw);
  assert.equal(audit.summary.unresolvedAttributions, 0);
  assert.ok(audit.discrepancies.every((entry) => entry.attribution === 'reviewed-authored-rule'));
  input.astylarAuthored[0].declarations.display = 'block';
  assert.equal(buildMaterialInputAudit(raw).discrepancies.find((entry) => entry.property === 'display').attribution, 'unresolved');
  input.astylarStructure.type = 'div';
  assert.equal(buildMaterialInputAudit(raw).summary.unresolvedAttributions, 2);
});

test('normalizes only a fixed max-width constraint across explicit box-sizing modes', () => {
  const reference = { boxSizing: 'content-box', maxWidth: '720px', padding: '28px', borderWidth: '1px' };
  const astylar = { boxSizing: 'border-box', maxWidth: '778px', padding: '28px', borderWidth: '1px' };
  const difference = (left, right) => buildMaterialInputAudit(parityReport(left, right)).discrepancies.find((entry) => entry.property === 'maxWidth');
  assert.equal(difference(reference, astylar).classification, 'equivalent-representation');
  assert.equal(difference(astylar, reference).classification, 'equivalent-representation');
  assert.notEqual(difference(reference, { ...astylar, maxWidth: '777px' }).classification, 'equivalent-representation');
  assert.notEqual(difference({ ...reference, padding: '5%' }, astylar).classification, 'equivalent-representation');
  assert.notEqual(difference({ boxSizing: 'content-box', maxWidth: '720px' }, astylar).classification, 'equivalent-representation');
  assert.notEqual(buildMaterialInputAudit(parityReport(reference, astylar)).discrepancies.find((entry) => entry.property === 'boxSizing').classification, 'equivalent-representation');
});

function rootFlowReport() {
  const raw = parityReport({ display: 'block', flexDirection: 'row', rowGap: 'normal', columnGap: 'normal', width: '200px' },
    { display: 'flex', flexDirection: 'column', gap: '16px', width: '201px' });
  const input = raw.results[0].styleInputs[0];
  input.referenceStructure = { schemaVersion: 2, type: 'section' };
  input.astylarStructure = { schemaVersion: 2, type: 'section' };
  input.astylarResolvedStyleEvidenceVersion = 2;
  input.astylarNormalResolvedStyle = structuredClone(input.astylar);
  input.astylarInteractionResolvedStyle = structuredClone(input.astylar);
  input.referenceAuthored = [{ selector: '.demo[_ngcontent-test]', declarations: { padding: { value: '28px' } } }];
  input.astylarAuthored = [{ selector: '#core-root', declarations: structuredClone(input.astylar) }];
  return raw;
}

test('root flow dependencies require the explicit shared container rule and all captured style stages', () => {
  for (const state of [undefined, 'hover', 'press', 'focus', 'open']) {
    const raw = rootFlowReport();
    if (state) { raw.interactions = [{ ...raw.results[0], state }]; raw.results = []; }
    const audit = buildMaterialInputAudit(raw);
    const found = audit.discrepancies.filter(d => d.attribution === 'reviewed-root-flow-dependency');
    assert.deepEqual(found.map(d => d.property), ['columnGap', 'flexDirection', 'rowGap']);
    assert.ok(found.every(d => d.classification === 'application-plugin-authoring-defect' &&
      d.reviewEvidence.inputEquivalent === false && d.reviewEvidence.finalRasterEquivalent === false));
    assert.equal(audit.discrepancies.find(d => d.property === 'width').attribution, 'unresolved');
    assert.equal(audit.summary.inputEquivalent, false);
  }
  const mutations = [
    i => { i.id = 'core-primary'; },
    i => { i.referenceStructure.type = 'div'; },
    i => { i.astylarStructure.type = 'showcase.material:container'; },
    i => { delete i.referenceStructure.schemaVersion; },
    i => { delete i.astylarStructure.schemaVersion; },
    i => { i.astylarResolvedStyleEvidenceVersion = 1; },
    i => { delete i.astylarNormalResolvedStyle; },
    i => { delete i.astylarInteractionResolvedStyle; },
    i => { i.astylarInteractionResolvedStyle.gap = '8px'; },
    i => { i.astylarNormalResolvedStyle.flexDirection = 'row'; },
    i => { i.reference.display = 'flex'; },
    i => { i.astylar.display = 'grid'; },
    i => { i.astylar.gap = '0'; },
    i => { delete i.referenceAuthored; },
    i => { i.referenceAuthored[0].selector = '.other'; },
    i => { delete i.referenceAuthored[0].declarations; },
    i => { i.referenceAuthored[0].declarations.gap = { value: '16px' }; },
    i => { i.referenceAuthored[0].declarations['flex-flow'] = { value: 'row' }; },
    i => { i.referenceAuthored[0].declarations.all = { value: 'initial' }; },
    i => { delete i.astylarAuthored; },
    i => { i.astylarAuthored[0].selector = '.some-container'; },
    i => { delete i.astylarAuthored[0].declarations; },
    i => { i.astylarAuthored[0].declarations.gap = '15px'; },
    i => { i.astylarAuthored.push(structuredClone(i.astylarAuthored[0])); },
    i => { i.astylarAuthored.push({ selector: 'section', declarations: { display: 'block' } }); },
    i => { i.astylarAuthored.push({ selector: 'section', declarations: { 'row-gap': '8px' } }); },
    i => { i.astylarAuthored.push({ selector: 'section', declarations: { flexWrap: 'wrap' } }); },
    i => { i.astylarAuthored.push({ selector: 'section', declarations: { flexFlow: 'column' } }); },
    i => { i.astylarAuthored.push({ selector: 'section', declarations: { all: 'initial' } }); },
  ];
  for (const mutate of mutations) {
    const raw = rootFlowReport();
    mutate(raw.results[0].styleInputs[0]);
    assert.ok(buildMaterialInputAudit(raw).discrepancies.every(d => d.attribution !== 'reviewed-root-flow-dependency'), String(mutate));
  }
});

test('browser block and column-flex demo requests differ even when a one-child screenshot can match', async () => {
  const { chromium } = await import('playwright-core');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    for (const dpr of [1, 2]) {
      const page = await browser.newPage({ viewport: { width: 640, height: 480 }, deviceScaleFactor: dpr });
      await page.setContent(`<style>
        section { width:200px; padding:28px; border:1px solid; }
        section > div { height:20px; flex-shrink:0; }
        #candidate { display:flex; flex-direction:column; gap:16px; }
      </style><section id="reference"><div></div></section><section id="candidate"><div></div></section>`);
      const measure = () => page.evaluate(() => Object.fromEntries(['reference', 'candidate'].map(id => {
        const el = document.getElementById(id), style = getComputedStyle(el), children = [...el.children].map(n => n.getBoundingClientRect());
        return [id, { height: el.getBoundingClientRect().height, display: style.display, direction: style.flexDirection,
          rowGap: style.rowGap, columnGap: style.columnGap, gap: children.length === 2 ? children[1].top - children[0].bottom : null }];
      })));
      const single = await measure();
      assert.equal(single.reference.height, single.candidate.height);
      assert.deepEqual([single.reference.display, single.reference.direction, single.reference.rowGap, single.reference.columnGap], ['block', 'row', 'normal', 'normal']);
      assert.deepEqual([single.candidate.display, single.candidate.direction, single.candidate.rowGap, single.candidate.columnGap], ['flex', 'column', '16px', '16px']);
      await page.evaluate(() => document.querySelectorAll('section').forEach(el => el.append(document.createElement('div'))));
      const multiple = await measure();
      assert.equal(multiple.reference.gap, 0);
      assert.equal(multiple.candidate.gap, 16);
      assert.equal(multiple.candidate.height - multiple.reference.height, 16);
      await page.close();
    }
  } finally { await browser.close(); }
});

test('root flow attribution retains every exact case beyond the display sample limit', () => {
  const raw = rootFlowReport();
  raw.results = Array.from({ length: 15 }, (_, index) => ({ ...structuredClone(raw.results[0]), viewport: { id: `viewport-${index}` } }));
  const differences = buildMaterialInputAudit(raw).discrepancies.filter(d => d.attribution === 'reviewed-root-flow-dependency');
  assert.equal(differences.length, 3);
  for (const difference of differences) {
    assert.equal(difference.occurrences, 15);
    assert.equal(difference.cases.length, 12);
    assert.equal(difference.reviewedCases.length, 15);
    assert.equal(new Set(difference.reviewedCases).size, 15);
  }
});

test('grid none proof does not waive template differences in grid or non-grid snapshots', () => {
  for (const display of ['block', 'flex', 'grid', 'inline-grid']) for (const property of ['gridTemplateColumns', 'gridTemplateRows']) {
    const raw = parityReport({ display, [property]: 'none' }, { display });
    const before = JSON.stringify(raw);
    const audit = buildMaterialInputAudit(raw);
    const difference = audit.discrepancies.find(d => d.property === property);
    assert.equal(difference?.reference, 'none');
    assert.equal(difference?.astylar, undefined);
    assert.equal(difference?.attribution, 'unresolved');
    assert.equal(audit.summary.inputEquivalent, false);
    assert.equal(JSON.stringify(raw), before);
  }
});

function nonGridTemplateReport(referenceDisplay = 'block', candidateDisplay = 'flex') {
  const raw = visibleOverflowReport(), e = raw.results[0], input = e.styleInputs[0];
  const reference = { display: referenceDisplay, gridTemplateColumns: 'none', gridTemplateRows: 'none' };
  const candidate = { display: candidateDisplay };
  Object.assign(input, { reference, astylar: { ...candidate },
    astylarNormalResolvedStyle: { ...candidate }, astylarInteractionResolvedStyle: { ...candidate },
    referenceAuthored: [{ selector: '#core-root', declarations: { display: { value: referenceDisplay, important: false } } }],
    astylarAuthored: [{ selector: '#core-root', declarations: { ...candidate } }] });
  e.inputTrees.reference.styles = [{ ...reference }];
  e.inputTrees.reference.rules = structuredClone(input.referenceAuthored);
  Object.assign(e.inputTrees.reference.nodes[0], { inline: {}, rules: [0] });
  Object.assign(e.inputTrees.astylar.nodes[0], { normalResolvedStyle: { ...candidate },
    resolvedStyle: { ...candidate }, interactionResolvedStyle: { ...candidate } });
  e.inputTrees.astylar.rules = [{ selector: '#core-root', ...candidate },
    { selector: '#other:hover, .unrelated.selected', gridTemplateColumns: '30px' },
    { selector: 'button', gridTemplateRows: 'none' }];
  return raw;
}

test('non-grid template omission requires complete captured ordinary block and flex contexts', () => {
  for (const ref of ['block', 'flex']) for (const ast of ['block', 'flex']) for (const state of [undefined, 'hover', 'active', 'focus']) {
    const raw = nonGridTemplateReport(ref, ast);
    if (state) raw.results[0].state = state;
    const before = JSON.stringify(raw), audit = buildMaterialInputAudit(raw);
    assert.equal(audit.nonGridTemplateInputs.filter(p => p.element === 'core-root').length, 1);
    const differences = audit.discrepancies.filter(d => d.attribution === 'reviewed-non-grid-template-omission');
    assert.deepEqual(differences.map(d => d.property), ['gridTemplateColumns', 'gridTemplateRows']);
    for (const d of differences) {
      assert.equal(d.classification, 'equivalent-representation');
      assert.equal(d.reference, 'none'); assert.equal(d.astylar, undefined);
      assert.equal(d.reviewEvidence.referenceDisplay, ref);
      assert.deepEqual(d.reviewEvidence.candidateDisplays, [ast, ast, ast]);
      assert.equal(d.reviewEvidence.revision, 7);
      assert.equal(d.reviewEvidence.excludedCandidateRules.length, 2);
      assert.equal(d.reviewEvidence.wholeElementInputEquivalent, false);
      assert.equal(d.reviewEvidence.finalRasterVerified, false);
    }
    if (ref !== ast) assert.equal(audit.discrepancies.find(d => d.property === 'display').attribution, 'unresolved');
    assert.deepEqual(validateMaterialInputAudit(audit, { requireComplete: false }), []);
    assert.equal(JSON.stringify(raw), before);
  }
});

test('non-grid template omission rejects grid, authored requests, ambiguous mappings and missing stages', () => {
  const mutations = [
    e => { e.inputTrees.reference.styles[0].display = 'grid'; },
    e => { e.inputTrees.reference.styles[0].display = 'inline-grid'; },
    e => { e.inputTrees.reference.styles[0].display = 'inline-block'; },
    e => { e.inputTrees.astylar.nodes[0].resolvedStyle.display = 'grid'; },
    e => { e.inputTrees.astylar.nodes[0].normalResolvedStyle.display = 'inline-grid'; },
    e => { e.inputTrees.astylar.nodes[0].interactionResolvedStyle.display = 'grid'; },
    e => { delete e.inputTrees.astylar.nodes[0].interactionResolvedStyle.display; },
    e => { delete e.inputTrees.reference.styles[0].gridTemplateRows; },
    e => { e.inputTrees.reference.styles[0].gridTemplateColumns = '40px'; },
    e => { e.inputTrees.reference.nodes[0].inline = { 'grid-template-columns': { value: 'none' } }; },
    e => { delete e.inputTrees.reference.nodes[0].inline; },
    e => { e.inputTrees.reference.rules[0].declarations.grid = { value: 'none' }; },
    e => { e.inputTrees.reference.rules[0].declarations.all = { value: 'initial' }; },
    e => { e.inputTrees.reference.rules[0].declarations.animation = { value: 'layout 1s' }; },
    e => { e.inputTrees.reference.nodes[0].type = 'button'; },
    e => { e.inputTrees.reference.nodes[0].type = 'mat-card'; },
    e => { e.inputTrees.reference.nodes[0].type = 'body'; },
    e => { e.inputTrees.astylar.nodes[0].authored.type = 'showcase.material:panel'; },
    e => { e.inputTrees.astylar.nodes[0].authored.class = {}; },
    e => { e.inputTrees.astylar.nodes[0].authored.style = { gridTemplateRows: 'none' }; },
    e => { e.inputTrees.astylar.nodes[0].normalResolvedStyle.gridAutoRows = '20px'; },
    e => { e.inputTrees.astylar.nodes[0].resolvedStyle.gridTemplateColumns = 'none'; },
    e => { e.inputTrees.astylar.nodes[0].interactionResolvedStyle.all = 'initial'; },
    e => { delete e.inputTrees.astylar.nodes[0].normalResolvedStyle; },
    e => { e.inputTrees.astylar.rules.push({ selector: '#core-root', gridTemplateRows: 'none' }); },
    e => { e.inputTrees.astylar.rules.push({ selector: '#core-root:hover', 'grid-template': 'none' }); },
    e => { e.inputTrees.astylar.rules.push({ selector: ':is(#core-root)', grid: 'none' }); },
    e => { e.inputTrees.astylar.rules.push({ selector: '.unrelated div', all: 'initial' }); },
    e => { e.inputTrees.astylar.rules.push({ selector: '#core-root', transition: 'all 1s' }); },
    e => { e.inputTrees.astylar.rules.push({ selector: '#other', nested: { grid: 'none' } }); },
    e => { delete e.inputTrees.astylar.rules; },
    e => { delete e.inputTrees.reference.rules; },
    e => { e.inputTrees.reference.errors.push('incomplete'); },
    e => { e.inputTrees.reference.nodes.push(structuredClone(e.inputTrees.reference.nodes[0])); },
    e => { e.inputTrees.astylar.nodes.push(structuredClone(e.inputTrees.astylar.nodes[0])); },
    e => { e.inputTrees.astylar.resolvedStyleEvidenceVersion = 1; },
    e => { e.inputTrees.astylar.resolvedStyleSource = 'mesh-metadata'; },
    e => { delete e.inputTrees.astylar.resolvedStyleRevision; },
    e => { e.styleInputs[0].referenceStructure.type = 'span'; },
    e => { e.styleInputs[0].astylarStructure.schemaVersion = 1; },
    e => { e.styleInputs[0].astylarResolvedStyleEvidenceVersion = 1; },
    e => { e.styleInputs[0].reference.display = 'flex'; },
    e => { e.styleInputs[0].reference.gridTemplateRows = '30px'; },
    e => { e.styleInputs[0].astylar.display = 'block'; },
    e => { delete e.styleInputs[0].astylarNormalResolvedStyle; },
    e => { e.styleInputs[0].astylarInteractionResolvedStyle.grid = 'none'; },
    e => { delete e.styleInputs[0].referenceAuthored; },
    e => { delete e.styleInputs[0].astylarAuthored; },
    e => { e.styleInputs[0].astylarAuthored[0].declarations.gridTemplateRows = 'none'; },
    e => { e.styleInputs[0].referenceAuthored[0].declarations['grid-template'] = { value: 'none' }; },
  ];
  for (const mutate of mutations) {
    const raw = nonGridTemplateReport(); mutate(raw.results[0]);
    assert.ok(buildMaterialInputAudit(raw).discrepancies.every(d => d.attribution !== 'reviewed-non-grid-template-omission'), String(mutate));
  }
});

test('non-grid template classifications replay inventory and retain all reviewed cases', () => {
  const raw = nonGridTemplateReport();
  raw.results = Array.from({ length: 15 }, (_, i) => ({ ...structuredClone(raw.results[0]), state: `state-${i}` }));
  const audit = buildMaterialInputAudit(raw);
  assert.equal(audit.nonGridTemplateInputs.filter(p => p.element === 'core-root').length, 15);
  const find = a => a.discrepancies.find(d => d.attribution === 'reviewed-non-grid-template-omission');
  assert.equal(find(audit).cases.length, 12);
  assert.equal(find(audit).reviewedCases.length, 15);
  assert.equal(find(audit).occurrences, 15);
  for (const change of [
    a => { delete a.nonGridTemplateInputs; },
    a => { a.nonGridTemplateInputs[0].referenceDisplay = 'grid'; },
    a => { a.nonGridTemplateInputs[0].candidateDisplays[2] = 'grid'; },
    a => { a.nonGridTemplateInputs[0].wholeElementInputEquivalent = true; },
    a => { a.elementInventory.variants.find(v => v.side === 'astylar').ruleEvidenceComplete = false; },
    a => { a.elementInventory.cases.push(structuredClone(a.elementInventory.cases[0])); },
    a => { find(a).property = 'display'; },
    a => { find(a).reference = '40px'; },
    a => { find(a).astylar = 'none'; },
    a => { find(a).classification = 'confirmed-core-renderer-defect'; },
    a => { find(a).reviewEvidence.revision = 99; },
    a => { find(a).reviewedCases.pop(); },
    a => { find(a).reviewedCases[0] = find(a).reviewedCases[1]; },
    a => { find(a).reviewedCases[0] = 'not-a-captured-case'; },
  ]) {
    const changed = structuredClone(audit); change(changed);
    assert.ok(validateMaterialInputAudit(changed, { requireComplete: false }).some(e => e.includes('non-grid template')), String(change));
  }
});

test('attributes sidenav container flow only with the reviewed paired declaration witnesses', () => {
  const raw = parityReport({ display: 'block' }, { display: 'flex' });
  raw.results[0].family = 'sidenav';
  const input = raw.results[0].styleInputs[0];
  input.id = 'sidenav-primary';
  input.referenceStructure = { schemaVersion: 2, type: 'mat-sidenav-container' };
  input.astylarStructure = { schemaVersion: 2, type: 'div' };
  input.referenceAuthored = [{ selector: '.mat-drawer-container', declarations: { display: { value: 'block' } } }];
  input.astylarAuthored = [{ selector: '.sidenav-container', declarations: { display: 'flex' } }];
  const difference = () => buildMaterialInputAudit(raw).discrepancies.find((entry) => entry.property === 'display');
  assert.equal(difference().classification, 'application-plugin-authoring-defect');
  assert.equal(difference().attribution, 'reviewed-authored-rule');
  input.referenceAuthored.push({ selector: '#sidenav-primary', declarations: { display: { value: 'grid' } } });
  assert.equal(difference().attribution, 'unresolved');
  input.referenceAuthored.pop();
  input.astylarAuthored[0].selector = '.another-container';
  assert.equal(difference().attribution, 'unresolved');
  input.astylarAuthored[0].selector = '.sidenav-container';
  input.astylarStructure.type = 'section';
  assert.equal(difference().attribution, 'unresolved');
});

test('attributes badge paint only with the reviewed paired token and color witnesses', () => {
  const raw = parityReport({ backgroundColor: 'rgb(179, 38, 30)' }, { background: '#6750a4' });
  raw.results[0].family = 'badge';
  const input = raw.results[0].styleInputs[0];
  input.id = 'badge-count';
  input.referenceStructure = { schemaVersion: 2, type: 'span' };
  input.astylarStructure = { schemaVersion: 2, type: 'span' };
  input.referenceAuthored = [{ selector: '.mat-badge-content', declarations: {
    'background-color': { value: 'var(--mat-badge-background-color, var(--mat-sys-error))' },
  } }];
  input.astylarAuthored = [{ selector: '.badge-bubble', declarations: { background: '#6750a4' } }];
  const difference = () => buildMaterialInputAudit(raw).discrepancies.find((entry) => entry.property === 'backgroundColor');
  assert.equal(difference().classification, 'application-plugin-authoring-defect');
  assert.equal(difference().attribution, 'reviewed-authored-rule');
  assert.equal(difference().reviewEvidence.referenceRule.selector, '.mat-badge-content');
  assert.equal(difference().reviewEvidence.candidateRule.declarations.background, '#6750a4');
  input.referenceAuthored.push({ selector: '#badge-count', declarations: { 'background-color': { value: 'red' } } });
  assert.equal(difference().attribution, 'unresolved');
  input.referenceAuthored.pop();
  input.astylarAuthored[0].declarations.background = '#ffffff';
  assert.equal(difference().attribution, 'unresolved');
  input.astylarAuthored[0].declarations.background = '#6750a4';
  input.astylarStructure.type = 'div';
  assert.equal(difference().attribution, 'unresolved');
});

test('source audit has an explicit classification and live location for every policy entry', () => {
  const audit = buildMaterialInputAudit(parityReport({}, {}));
  assert.equal(audit.summary.unclassifiedDifferences, 0);
  assert.equal(audit.summary.unexplainedSourceFindings, 0);
  assert.equal(audit.summary.undetectedSourceDefinitions, 0);
  assert.ok(audit.sourceFindings.every(({ detected, locations }) => detected && locations.length > 0));
  const expansion = audit.sourceFindings.find(({ id }) => id === 'fixture-expansion-flow-and-collapse-substitution');
  assert.equal(expansion.classification, 'application-plugin-authoring-defect');
  assert.match(expansion.justification, /grid-template-rows:0fr/);
  assert.match(expansion.justification, /not evidence of missing renderer text/);
  assert.match(expansion.introducedBy, /6e1c156.*a0f3328/);
  assert.equal(audit.sourceFindings.find(({ id }) => id === 'direct-style-calc-resolution-limit').classification,
    'intentional-documented-limitation');
  assert.equal(audit.sourceFindings.find(({ id }) => id === 'core-opposing-vertical-insets-ignore-auto-height').classification,
    'confirmed-core-renderer-defect');
  for (const id of ['core-inline-parent-ignores-descendant-intrinsic-width', 'core-absolute-insets-ignore-margin-box', 'core-explicit-font-list-appends-default-fallbacks', 'core-normal-line-height-samples-mg-font-box']) {
    assert.equal(audit.sourceFindings.find((finding) => finding.id === id).classification, 'confirmed-core-renderer-defect');
  }
});

test('grid-list display attribution requires its own authored and structural witnesses', () => {
  const raw = parityReport({ display: 'block', position: 'relative' }, { display: 'grid', position: 'static' });
  raw.results[0].family = 'grid-list';
  const input = raw.results[0].styleInputs[0];
  input.id = 'grid-list-primary';
  input.referenceStructure = { schemaVersion: 2, type: 'mat-grid-list' };
  input.astylarStructure = { schemaVersion: 2, type: 'div' };
  input.referenceAuthored = [{ selector: '.mat-grid-list', declarations: { display: { value: 'block' } } }];
  input.astylarAuthored = [{ selector: '.grid-list', declarations: { display: 'grid' } }];
  const difference = (property = 'display') => buildMaterialInputAudit(raw).discrepancies.find((entry) => entry.property === property);
  assert.equal(difference().attribution, 'reviewed-authored-rule');
  assert.equal(difference('position').attribution, 'unresolved');
  input.astylarAuthored.push({ selector: '#grid-list-primary', declarations: { display: 'flex' } });
  assert.equal(difference().attribution, 'unresolved');
  input.astylarAuthored.pop();
  input.referenceAuthored[0].selector = '.mat-drawer-container';
  assert.equal(difference().attribution, 'unresolved');
  input.referenceAuthored[0].selector = '.mat-grid-list';
  input.referenceStructure.type = 'div';
  assert.equal(difference().attribution, 'unresolved');
});

test('retains tooltip click-state divergence but rejects missing hover evidence', () => {
  const report = parityReport({}, {});
  report.interactions = ['open', 'hover'].map((state) => ({
    family: 'tooltip', profile: 'light', viewport: { id: 'desktop-dpr1' }, state,
    styleInputs: [{ id: 'tooltip-popup', astylar: { display: 'flex' } }],
  }));
  const audit = buildMaterialInputAudit(report);
  assert.equal(audit.coverage.presenceDifferences.length, 1);
  assert.match(audit.coverage.presenceDifferences[0].case, /\/open$/);
  assert.equal(audit.coverage.missingElements.length, 1);
  assert.match(audit.coverage.missingElements[0].case, /\/hover$/);
  assert.equal(audit.summary.inputEquivalent, false);
  assert.ok(validateMaterialInputAudit(audit, { requireComplete: false })
    .some((error) => error.includes('measured mappings')));
});

test('does not accept a missing origin for a transformed element or zero inset as auto', () => {
  const audit = buildMaterialInputAudit(parityReport({
    transform: 'matrix(0,-1,1,0,0,0)', transformOrigin: '20px 10px', left: '0px',
  }, { transform: 'rotate(-90deg)' }));
  for (const property of ['transformOrigin', 'left']) {
    assert.equal(audit.discrepancies.find((entry) => entry.property === property)?.classification,
      'parity-harness-defect');
    assert.equal(audit.discrepancies.find((entry) => entry.property === property)?.attribution, 'unresolved');
  }
});

test('does not waive unequal mapped content as a framework wrapper difference', () => {
  const report = parityReport({}, {});
  const input = report.results[0].styleInputs[0];
  input.referenceStructure = { schemaVersion: 2, tag: 'mat-card', text: 'First Second', descendantIds: ['first', 'second'] };
  input.astylarStructure = { schemaVersion: 2, tag: 'div', text: 'First', descendantIds: ['first'] };
  const audit = buildMaterialInputAudit(report);
  assert.equal(audit.summary.structureDifferences, 1);
  assert.equal(audit.summary.inputEquivalent, false);
});

test('matching text and descendant IDs do not waive a different framework host type', () => {
  const report = parityReport({}, {});
  const input = report.results[0].styleInputs[0];
  input.referenceStructure = { schemaVersion: 2, type: 'mat-card', text: 'First', descendantIds: ['first'] };
  input.astylarStructure = { schemaVersion: 2, type: 'div', text: 'First', descendantIds: ['first'] };
  assert.equal(buildMaterialInputAudit(report).structureEvidence[0].classification, 'parity-harness-defect');
  input.referenceStructure.type = 'div';
  assert.equal(buildMaterialInputAudit(report).structureEvidence[0].classification, 'legitimate-public-api-structure');
});

test('records source fingerprints and actual visual acceptance fields', () => {
  const additions = [
    ...['reviewed-source-batch-audit-source-binding.mjs', 'reviewed-source-batch-audit-source-binding.spec.mjs',
      'reviewed-source-batch-pipeline.spec.mjs', 'reviewed-source-batch-observation-binding.mjs',
      'reviewed-source-batch-observation-binding.spec.mjs', 'reviewed-source-batch-transition.mjs',
      'reviewed-source-batch-transition.spec.mjs', 'reviewed-source-batch.spec.mjs',
      'reviewed-batch-motion-replay.mjs', 'motion-source-conservation.mjs', 'motion-source-conservation.spec.mjs',
      'alignment-adapter-receipt-source.mjs', 'alignment-adapter-receipt-source.spec.mjs',
      'alignment-font-audit-source-binding.spec.mjs', 'text-align-audit-source-binding.spec.mjs',
      'ltr-alignment-audit-source-binding.spec.mjs', 'vertical-align-canonical-plan.spec.mjs',
      'text-align-canonical-plan.spec.mjs', 'additional-control-font-style-attribution.spec.mjs',
      'audit-normalization-contracts.mjs', 'audit-normalization-contracts.spec.mjs',
      'control-line-box-normalization.mjs', 'root-background-classification-preparation.mjs',
      'root-background-classification-preparation.spec.mjs', 'root-background-pipeline.spec.mjs',
      'control-line-box-reconciliation.spec.mjs', 'control-line-box-normalization-transition.spec.mjs',
      'line-box-normalization-census.spec.mjs', 'gap-survey-source-replay.mjs',
      'gap-survey-source-replay.spec.mjs', 'caret-normalization-transition.spec.mjs',
      'disabled-ink-source-transition.mjs', 'disabled-ink-source-transition.spec.mjs',
      'disabled-ink-precision-preparation.spec.mjs'].map(file => `tests/material-parity/${file}`),
    'scripts/prepare-material-reviewed-source-batch.mjs',
    'scripts/audit-material-root-background-inputs.mjs', 'docs/material-root-background-inputs.json',
    'scripts/audit-material-line-box-normalization.mjs', 'docs/material-line-box-normalization-census.json',
  ];
  const visibilityFiles = [
    'tests/material-parity/visibility-audit-source-binding.mjs',
    'tests/material-parity/visibility-audit-source-binding.spec.mjs',
    'tests/material-parity/visibility-audit-pipeline.spec.mjs',
    'tests/material-parity/visibility-observation-stage.mjs',
    'tests/material-parity/visibility-observation-stage.spec.mjs',
    'tests/material-parity/visibility-observation-binding.mjs',
    'tests/material-parity/visibility-observation-binding.spec.mjs',
    'scripts/audit-material-visibility-ancestry.mjs',
    'scripts/audit-material-visibility-population.mjs',
    'scripts/prepare-material-visibility-observation-stages.mjs',
    'tests/material-parity/visibility-ancestry.spec.mjs',
    'tests/material-parity/visibility-input-population.spec.mjs',
    'docs/material-visibility-input-population.json',
    'docs/material-visibility-observation-stages.json',
  ];
  const positionFiles = [
    'tests/material-parity/position-composition-audit-source-binding.mjs',
    'tests/material-parity/position-composition-audit-source-binding.spec.mjs',
    'tests/material-parity/position-composition-review.mjs',
    'tests/material-parity/position-composition-review.spec.mjs',
    'tests/material-parity/position-composition-producer-transition.mjs',
    'tests/material-parity/position-composition-producer-transition.spec.mjs',
    'scripts/audit-material-grid-position-substitution.mjs',
    'scripts/audit-material-flow-position-substitutions.mjs',
    'scripts/audit-material-position-population.mjs',
    'tests/material-parity/grid-position-substitution.spec.mjs',
    'tests/material-parity/flow-position-substitutions.spec.mjs',
    'tests/material-parity/position-input-population.spec.mjs',
    'docs/material-grid-position-substitution.json',
    'docs/material-flow-position-substitutions.json',
    'docs/material-position-input-population.json',
  ];
  const report = parityReport({}, {});
  const audit = buildMaterialInputAudit(report);
  assert.equal(audit.coverage.visualParityGreen, true);
  assert.equal(audit.sourceFingerprints.length, 424);
  assert.equal(new Set(audit.sourceFingerprints.map(entry => entry.file)).size, 424);
  const alignmentFiles = [
    'tests/material-parity/alignment-survey-conservation.mjs',
    'tests/material-parity/alignment-survey-conservation.spec.mjs',
    'tests/material-parity/prepared-alignment-canonical-transition.mjs',
    'tests/material-parity/prepared-alignment-canonical-integration.spec.mjs',
    'tests/material-parity/alignment-font-audit-source-binding.mjs',
    'tests/material-parity/text-align-audit-source-binding.mjs',
    'tests/material-parity/ltr-alignment-audit-source-binding.mjs',
    'scripts/audit-material-vertical-align-population.mjs',
    'scripts/audit-material-text-align-ancestry.mjs',
    'scripts/audit-material-ltr-alignment.mjs',
  ];
  assert.equal(alignmentFiles.length, 10);
  // All 38 follow-up source, proof, plan, transition and integration files
  // join the existing 308 entries; none of the earlier fingerprints is waived.
  const followupFiles = [
    'tests/material-parity/canonical-transition-composition.mjs',
    'tests/material-parity/canonical-transition-composition.spec.mjs',
    ...['followup-input-audit-source-binding.mjs', 'followup-input-audit-source-binding.spec.mjs',
      'followup-input-source-replay.mjs', 'followup-input-source-replay.spec.mjs',
      'followup-input-proposal-transition.mjs', 'followup-input-proposal-transition.spec.mjs',
      'followup-input-proposal-binding.spec.mjs', 'followup-input-canonical-integration.spec.mjs',
      'leaf-font-family-stages.spec.mjs', 'leaf-font-family-attribution.spec.mjs',
      'leaf-weight-tracking-stages.spec.mjs', 'leaf-weight-tracking-attribution.spec.mjs',
      'expansion-owner-mapping.spec.mjs', 'expansion-owner-attribution.spec.mjs',
      'control-font-style-reset.spec.mjs', 'control-font-style-attribution.spec.mjs']
      .map(f => `tests/material-parity/${f}`),
    ...['bind-material-followup-input-proposals.mjs', 'check-material-followup-input-transition.mjs',
      'audit-material-leaf-font-family-stages.mjs', 'audit-material-leaf-font-family-attribution.mjs',
      'audit-material-leaf-weight-tracking-stages.mjs', 'audit-material-leaf-weight-tracking-attribution.mjs',
      'audit-material-expansion-owner-mapping.mjs', 'audit-material-expansion-owner-attribution.mjs',
      'audit-material-control-font-style-reset.mjs', 'audit-material-control-font-style-attribution.mjs']
      .map(f => `scripts/${f}`),
    ...['leaf-font-family-stages', 'leaf-font-family-attribution-plan', 'leaf-weight-tracking-stages',
      'leaf-weight-tracking-attribution-plan', 'expansion-owner-mapping', 'expansion-owner-attribution-plan',
      'control-font-style-reset', 'control-font-style-attribution-plan', 'followup-input-proposal-binding',
      'followup-input-transition-dry-run'].map(f => `docs/material-${f}.json`),
  ];
  assert.equal(followupFiles.length, 38);
  const baselineSource = execFileSync('git', ['show', 'b1e973b:tests/material-parity/input-equivalence-audit.mjs'],
    { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
  const ast = ts.createSourceFile('baseline.mjs', baselineSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const fn = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'sourceFingerprints');
  const declaration = fn.body.statements.filter(ts.isVariableStatement)
    .flatMap(n => [...n.declarationList.declarations]).find(n => n.name.getText(ast) === 'files');
  assert.ok(ts.isArrayLiteralExpression(declaration.initializer));
  assert.ok(declaration.initializer.elements.every(ts.isStringLiteral));
  const baselineFiles = declaration.initializer.elements.map(n => n.text);
  assert.equal(baselineFiles.length, 308);
  assert.deepEqual(audit.sourceFingerprints.map(e => e.file).filter(f => !followupFiles.includes(f) && !alignmentFiles.includes(f) && !additions.includes(f) && !visibilityFiles.includes(f) && !positionFiles.includes(f)), baselineFiles,
    'every previous fingerprint remains in original order');
  assert.deepEqual(audit.sourceFingerprints.map(e => e.file).filter(f => !baselineFiles.includes(f)).sort(),
    [...followupFiles, ...alignmentFiles, ...additions, ...visibilityFiles, ...positionFiles].sort(), 'only the independently inventoried 38 follow-up, 10 alignment and 39 additional and 14 visibility and 15 positioning dependencies are added');
  for (const file of [...followupFiles, ...alignmentFiles, ...additions, ...visibilityFiles, ...positionFiles]) assert.deepEqual(audit.sourceFingerprints.filter(entry => entry.file === file),
    [{ file, sha256: createHash('sha256').update(readFileSync(file, 'utf8').replace(/\r\n/g, '\n')).digest('hex') }]);
  assert.ok(audit.focusedProofs.some(entry => entry.file ===
    'tests/material-parity/followup-input-canonical-integration.spec.mjs' && entry.status !== 'missing'));
  // The caret integration adds 17 authenticated proof, source and test files.
  for (const file of [
    'tests/material-parity/owner-caret-audit-source-binding.mjs',
    'tests/material-parity/owner-caret-source-binding.mjs',
    'tests/material-parity/owner-caret-classification.mjs',
    'tests/material-parity/owner-caret-attribution-coverage.mjs',
    'tests/material-parity/owner-caret-input-evidence.mjs',
    'tests/material-parity/owner-caret-input-evidence.spec.mjs',
    'tests/material-parity/owner-caret-canonical-membership.mjs',
    'tests/material-parity/owner-caret-proof-commands.spec.mjs',
    'tests/material-parity/owner-caret-canonical-integration.spec.mjs',
    'scripts/check-material-owner-caret-coverage.mjs',
    'scripts/check-material-owner-caret-source-binding.mjs',
    'scripts/check-material-owner-caret-subset-binding.mjs',
    'scripts/audit-material-owner-caret-inputs.mjs',
    'scripts/audit-material-owner-caret-attribution.mjs',
    'scripts/audit-material-caret-motion-requests.mjs',
    'docs/material-owner-caret-input-survey.json',
    'docs/material-owner-caret-attribution.json',
  ]) assert.deepEqual(audit.sourceFingerprints.filter(entry => entry.file === file), [{ file,
    sha256: createHash('sha256').update(readFileSync(file, 'utf8').replace(/\r\n/g, '\n')).digest('hex') }]);
  assert.ok(audit.focusedProofs.some(entry => entry.file ===
    'tests/material-parity/owner-caret-canonical-integration.spec.mjs' && entry.status !== 'missing'));
  // The original 129-source inventory gained one tooltip binding and three
  // slider binding files, followed by ten range-border, five field-host and
  // eight shared owner-attribution sources and six tooltip wrapping/proof
  // dependencies, four root-shadow sources and seven root-flow/button-radius
  // binding/proof sources, seven button formatting/host request sources and
  // seven fixed-width authoring/binding/classification/integration sources and
  // nine grid observation/binding/classification/coverage/integration sources,
  // then eight button box-sizing observation/binding/coverage sources and five
  // field-host layout observation/binding/integration sources and nine gap
  // observation/binding/coverage/integration sources, then eleven explicit-gap
  // classification, original-source binding, coverage and existing-proof sources.
  // No previous source was removed.
  // Require the actual entries/digests, not only a count.
  for (const file of ['tests/material-parity/tooltip-unpaired-style-evidence.mjs',
    'tests/material-parity/owner-gap-input-evidence.mjs',
    'tests/material-parity/owner-gap-input-evidence.spec.mjs',
    'tests/material-parity/owner-gap-classification.mjs',
    'tests/material-parity/owner-gap-source-binding.mjs',
    'tests/material-parity/owner-gap-source-binding.spec.mjs',
    'tests/material-parity/owner-gap-coverage.mjs',
    'tests/material-parity/owner-gap-coverage.spec.mjs',
    'tests/material-parity/owner-gap-integration-conservation.mjs',
    'tests/material-parity/owner-gap-canonical-integration.spec.mjs',
    'tests/material-parity/explicit-gap-classification.mjs',
    'tests/material-parity/explicit-gap-classification.spec.mjs',
    'tests/material-parity/explicit-gap-source-binding.mjs',
    'tests/material-parity/explicit-gap-source-binding.spec.mjs',
    'tests/material-parity/explicit-gap-coverage.mjs',
    'tests/material-parity/explicit-gap-coverage.spec.mjs',
    'tests/material-parity/explicit-gap-canonical-integration.spec.mjs',
    'tests/material-parity/explicit-gap-canonical-binding.spec.mjs',
    'scripts/bind-material-explicit-gap-composition.mjs',
    'scripts/audit-material-explicit-gap-composition.mjs',
    'docs/material-explicit-gap-canonical-binding.json',
    'tests/material-parity/gap-review-classification.mjs',
    'tests/material-parity/gap-review-classification.spec.mjs',
    'tests/material-parity/gap-review-source-binding.mjs',
    'tests/material-parity/gap-review-source-binding.spec.mjs',
    'tests/material-parity/gap-review-coverage.mjs',
    'tests/material-parity/gap-review-coverage.spec.mjs',
    'tests/material-parity/gap-review-canonical-integration.spec.mjs',
    'tests/material-parity/gap-review-membership.spec.mjs',
    'scripts/bind-material-gap-review-membership.mjs',
    'docs/material-gap-review-membership.json',
    'docs/material-owner-gap-motion-review.json',
    'docs/material-gap-scalar-rule-loss.json',
    'scripts/audit-material-gap-motion-requests.mjs',
    'scripts/audit-material-gap-scalar-rule-loss.mjs',
    'tests/material-parity/field-host-layout-input-evidence.mjs',
    'tests/material-parity/field-host-layout-input-evidence.spec.mjs',
    'tests/material-parity/field-host-layout-source-binding.mjs',
    'tests/material-parity/field-host-layout-source-binding.spec.mjs',
    'tests/material-parity/field-host-layout-canonical-integration.spec.mjs',
    'tests/material-parity/tooltip-wrapping-input-evidence.mjs',
    'tests/material-parity/tooltip-wrapping-source-binding.mjs',
    'tests/material-parity/tooltip-wrapping-source-binding.spec.mjs',
    'tests/material-parity/tooltip-wrapping-canonical-integration.spec.mjs',
    'tests/material-parity/overlay-owner-declaration-review.mjs',
    'tests/material-parity/generated-node-mapping-evidence.mjs',
    'tests/material-parity/root-shadow-input-evidence.mjs',
    'tests/material-parity/root-shadow-source-binding.mjs',
    'tests/material-parity/root-shadow-source-binding.spec.mjs',
    'tests/material-parity/root-shadow-canonical-integration.spec.mjs',
    'tests/material-parity/root-flow-height-override-evidence.mjs',
    'tests/material-parity/root-flow-height-source-binding.mjs',
    'tests/material-parity/root-flow-height-source-binding.spec.mjs',
    'tests/material-parity/button-pill-radius-evidence.mjs',
    'tests/material-parity/button-pill-radius-source-binding.mjs',
    'tests/material-parity/button-pill-radius-source-binding.spec.mjs',
    'tests/material-parity/reviewed-authoring-canonical-integration.spec.mjs',
    'tests/material-parity/button-flex-input-evidence.mjs',
    'tests/material-parity/button-flex-source-binding.mjs',
    'tests/material-parity/button-flex-source-binding.spec.mjs',
    'tests/material-parity/button-host-request-evidence.mjs',
    'tests/material-parity/button-host-request-source-binding.mjs',
    'tests/material-parity/button-host-request-source-binding.spec.mjs',
    'tests/material-parity/button-requests-canonical-integration.spec.mjs',
    'tests/material-parity/button-fixed-width-evidence.mjs',
    'tests/material-parity/button-fixed-width-evidence.spec.mjs',
    'tests/material-parity/button-fixed-width-source-binding.mjs',
    'tests/material-parity/button-fixed-width-source-binding.spec.mjs',
    'tests/material-parity/button-fixed-width-classification.mjs',
    'tests/material-parity/button-fixed-width-classification.spec.mjs',
    'tests/material-parity/button-fixed-width-canonical-integration.spec.mjs',
    'tests/material-parity/owner-grid-initial-evidence.mjs',
    'tests/material-parity/button-box-sizing-input-evidence.mjs',
    'tests/material-parity/button-box-sizing-input-evidence.spec.mjs',
    'tests/material-parity/button-box-sizing-source-binding.mjs',
    'tests/material-parity/button-box-sizing-source-binding.spec.mjs',
    'tests/material-parity/button-box-sizing-classification.mjs',
    'tests/material-parity/button-box-sizing-classification.spec.mjs',
    'tests/material-parity/button-box-sizing-coverage.mjs',
    'tests/material-parity/button-box-sizing-canonical-integration.spec.mjs',
    'tests/material-parity/owner-grid-initial-evidence.spec.mjs',
    'tests/material-parity/owner-grid-initial-source-binding.mjs',
    'tests/material-parity/owner-grid-initial-source-binding.spec.mjs',
    'tests/material-parity/owner-grid-initial-classification.mjs',
    'tests/material-parity/owner-grid-initial-classification.spec.mjs',
    'tests/material-parity/owner-grid-initial-coverage.mjs',
    'tests/material-parity/owner-grid-initial-coverage.spec.mjs',
    'tests/material-parity/owner-grid-initial-canonical-integration.spec.mjs',
    'tests/material-parity/slider-input-box-evidence.mjs',
    'tests/material-parity/slider-input-box-source-binding.mjs',
    'tests/material-parity/slider-input-box-source-binding.spec.mjs',
    'tests/material-parity/slider-border-default-evidence.mjs',
    'tests/material-parity/slider-border-default-evidence.spec.mjs',
    'tests/material-parity/slider-border-default-source-binding.mjs',
    'tests/material-parity/slider-border-default-source-binding.spec.mjs',
    'tests/material-parity/slider-border-canonical-integration.spec.mjs',
    'tests/material-parity/range-default-box-proof.spec.mjs',
    'examples/material-showcase/src/app/range-default-box-audit.spec.ts',
    'docs/material-range-default-box-audit.json',
    'scripts/audit-material-slider-border-defaults.mjs',
    'docs/material-slider-border-defaults.json',
    'tests/material-parity/field-host-initial-style-evidence.mjs',
    'tests/material-parity/field-host-initial-style-evidence.spec.mjs',
    'tests/material-parity/field-host-initial-style-integration.spec.mjs',
    'scripts/audit-material-field-host-initial-styles.mjs',
    'docs/material-field-host-initial-style-audit.json',
    'tests/material-parity/owner-initial-style-attribution.mjs',
    'tests/material-parity/owner-initial-style-attribution.spec.mjs',
    'tests/material-parity/owner-initial-style-baseline.mjs',
    'tests/material-parity/owner-initial-style-survey.mjs',
    'tests/material-parity/owner-initial-style-survey.spec.mjs',
    'tests/material-parity/owner-initial-style-membership.mjs',
    'tests/material-parity/owner-initial-style-membership.spec.mjs',
    'tests/material-parity/owner-initial-style-mappings.spec.mjs']) {
    assert.deepEqual(audit.sourceFingerprints.filter(entry => entry.file === file), [{ file,
      sha256: createHash('sha256').update(readFileSync(file, 'utf8').replace(/\r\n/g, '\n')).digest('hex') }]);
  }
  for (const file of ['tests/material-parity/origin-stage-inventory-evidence.mjs',
    'tests/material-parity/origin-stage-inventory-evidence.spec.mjs', 'tests/material-parity/origin-stage-source-binding.mjs',
    'tests/material-parity/transform-origin-stage-evidence.mjs', 'tests/material-parity/origin-alias-mapping-evidence.mjs'])
    assert.equal(audit.sourceFingerprints.filter(entry => entry.file === file).length, 1);
  assert.ok(audit.focusedProofs.some(entry => entry.file === 'tests/material-parity/origin-stage-inventory-evidence.spec.mjs' && entry.status !== 'missing'));
  for (const file of ['tests/material-parity/identity-transform-omission.spec.mjs', 'scripts/audit-material-identity-transform.mjs', 'scripts/audit-material-transform-origin.mjs'])
    assert.equal(audit.sourceFingerprints.filter(entry => entry.file === file).length, 1);
  assert.ok(audit.focusedProofs.some(entry => entry.file === 'tests/material-parity/identity-transform-omission.spec.mjs' && entry.status !== 'missing'));
  for (const file of ['tests/material-parity/input-audit-report-codec.mjs',
    'tests/material-parity/input-audit-report-codec.spec.mjs', 'tests/material-parity/input-audit-report-stream.mjs',
    'tests/material-parity/input-audit-report-stream.spec.mjs', 'tests/material-parity/input-audit-cli-transport.spec.mjs'])
    assert.equal(audit.sourceFingerprints.filter(entry => entry.file === file).length, 1);
  assert.ok(audit.focusedProofs.some(entry => entry.file === 'tests/material-parity/input-audit-cli-transport.spec.mjs' && entry.status !== 'missing'));
  assert.ok(audit.sourceFingerprints.some(s => s.file === 'tests/material-parity/inherited-default-sensitivity.spec.mjs'));
  assert.ok(audit.sourceFingerprints.some(s => s.file === 'tests/material-parity/caret-color-omission-sensitivity.spec.mjs'));
  assert.ok(audit.sourceFingerprints.some(s => s.file === 'tests/material-parity/root-line-height-proof.spec.mjs'));
  assert.ok(audit.sourceFingerprints.some(s => s.file === 'tests/material-parity/line-height-omission-sensitivity.spec.mjs'));
  assert.ok(audit.sourceFingerprints.some(s => s.file === 'tests/material-parity/root-height-input-evidence.mjs'));
  assert.ok(audit.sourceFingerprints.some(s => s.file === 'tests/material-parity/root-color-input-evidence.mjs'));
  assert.ok(audit.sourceFingerprints.some(entry => entry.file === 'tests/material-parity/appearance-input-evidence.mjs'));
  assert.ok(audit.sourceFingerprints.some(entry => entry.file === 'tests/material-parity/root-typography-input-evidence.mjs'));
  assert.ok(audit.sourceFingerprints.some(entry => entry.file === 'tests/material-parity/field-host-typography-evidence.mjs'));
  const fieldHost = audit.sourceFindings.find(entry => entry.id === 'fixture-field-host-typography-tokens-omitted');
  assert.equal(fieldHost?.detected, true);
  assert.equal(fieldHost?.classification, 'application-plugin-authoring-defect');
  assert.match(fieldHost.introducedBy, /2f44011/);
  assert.ok(audit.implementationPlan.some(entry => entry.priority === 5.225 && /token ownership/.test(entry.action)));
  for (const file of ['examples/material-showcase/src/app/font-relative-box-audit.spec.ts',
    'examples/material-showcase/node_modules/astylarui/dist/lib/app/services/dom/elements/element-dimension.service.js'])
    assert.equal(audit.sourceFingerprints.filter(entry => entry.file === file).length, 1);
  const fontBox = audit.sourceFindings.find(entry => entry.id === 'core-em-box-size-uses-uncomputed-font');
  assert.equal(fontBox?.detected, true);
  assert.equal(fontBox?.classification, 'confirmed-core-renderer-defect');
  assert.match(fontBox.owner, /core.*CSS font-relative used-size/);
  assert.match(fontBox.introducedBy, /21bdab9.*no historical runtime bisect/);
  assert.ok(audit.focusedProofs.some(entry => entry.file === fontBox.focusedProof && entry.line > 0 && entry.status !== 'missing'));
  assert.ok(audit.implementationPlan.some(entry => entry.priority === 3.45 && /computed CSS font/.test(entry.action)));
  assert.ok(audit.sourceFingerprints.some(p => p.file === 'tests/material-parity/chip-host-typography-evidence.mjs'));
  for (const file of ['src/lib/astylar-interaction-runtime.ts', 'src/lib/astylar-semantic-bridge.ts',
    'scripts/audit-button-pointer-focus.mjs', 'examples/material-showcase/audit/button-pointer-focus.mjs',
    'tests/material-parity/button-pointer-focus-evidence.spec.mjs', 'scripts/audit-material-paginator-navigation.mjs',
    'tests/material-parity/paginator-navigation-evidence.mjs'])
    assert.equal(audit.sourceFingerprints.filter(entry => entry.file === file).length, 1);
  const heldFocus = audit.sourceFindings.find(entry => entry.id === 'core-enabled-held-focus-delays-native-mirror');
  assert.equal(heldFocus?.detected, true); assert.equal(heldFocus?.classification, 'confirmed-core-renderer-defect');
  assert.ok(audit.focusedProofs.some(entry => entry.file === heldFocus.focusedProof && entry.line > 0 && entry.status !== 'missing'));
  const disabledInteractive = audit.sourceFindings.find(entry => entry.id === 'fixture-paginator-native-disabled-replaces-disabled-interactive');
  assert.equal(disabledInteractive?.detected, true); assert.equal(disabledInteractive?.classification, 'application-plugin-authoring-defect');
  assert.equal(audit.sourceFingerprints.filter(entry => entry.file === 'tests/material-parity/grid-template-input-evidence.mjs').length, 1);
  for (const file of ['src/app/services/dom/elements/grid.service.ts', 'src/app/services/dom/elements/grid-track-sizing.ts',
    'examples/material-showcase/node_modules/astylarui/dist/lib/app/services/dom/elements/grid.service.js',
    'examples/material-showcase/node_modules/astylarui/dist/lib/app/services/dom/elements/grid-track-sizing.js',
    'examples/material-showcase/src/app/grid-template-initial-audit.spec.ts'])
    assert.equal(audit.sourceFingerprints.filter(entry => entry.file === file).length, 1);
  const gridFinding = audit.sourceFindings.find(entry => entry.id === 'core-grid-none-template-becomes-zero-track');
  assert.equal(gridFinding?.classification, 'confirmed-core-renderer-defect');
  assert.equal(gridFinding?.detected, true);
  assert.ok(audit.focusedProofs.some(entry => entry.file === gridFinding.focusedProof && entry.line > 0 && entry.status !== 'missing'));
  const gridProof = audit.focusedProofs.find(entry => entry.file === gridFinding.focusedProof);
  assert.match(JSON.stringify(gridProof), /32 passing two-child block\/flex controls/);
  assert.match(JSON.stringify(gridProof), /async startup timeout/);
  assert.ok(audit.implementationPlan.some(entry => entry.rootCause === 'Grid none is parsed as a zero-length explicit track'));
  for (const file of ['tests/material-parity/control-line-box-validation.mjs', 'tests/material-parity/supplemental-line-box-report.mjs',
    'tests/material-parity/supplemental-line-box-fixtures.mjs', 'tests/material-parity/supplemental-capture-fixtures.mjs'])
    assert.equal(audit.sourceFingerprints.filter(entry => entry.file === file).length, 1);
  for (const file of ['tests/material-parity/control-line-box-report.mjs', 'tests/material-parity/control-line-box-evidence.mjs',
    'scripts/audit-material-control-line-boxes.mjs', 'scripts/run-material-input-audit.mjs', 'tests/material-parity/normal-line-box-report.spec.mjs'])
    assert.equal(audit.sourceFingerprints.filter(entry => entry.file === file).length, 1);
  for (const file of ['scripts/audit-material-calendar-close.mjs', 'tests/material-parity/calendar-close-evidence.mjs',
    'scripts/audit-material-tooltip-state.mjs', 'tests/material-parity/tooltip-state-evidence.mjs',
    'examples/material-showcase/node_modules/@angular/material/fesm2022/menu.mjs',
    'examples/material-showcase/node_modules/@angular/material/fesm2022/dialog.mjs',
    'examples/material-showcase/node_modules/@angular/material/fesm2022/module-Ce6F7TNm.mjs',
    'src/app/services/dom/style-defaults.service.ts',
    'tests/material-parity/supplemental-capture-evidence.spec.mjs']) {
    assert.equal(audit.sourceFingerprints.filter(entry => entry.file === file).length, 1);
  }
  for (const file of ['scripts/audit-material-calendar-close.mjs', 'tests/material-parity/supplemental-capture-evidence.spec.mjs']) {
    assert.ok(audit.focusedProofs.some(proof => proof.file === file && proof.line > 0 && proof.status !== 'missing'));
  }
  assert.equal(audit.sourceFingerprints.filter(({ file }) => file === 'scripts/audit-material-chip-inputs.mjs').length, 1);
  assert.equal(audit.sourceFingerprints.filter(({ file }) => file === 'scripts/audit-material-outline-inputs.mjs').length, 1);
  for (const id of ['fixture-outlined-button-literal-replaces-outline-token',
    'fixture-toggle-group-literal-replaces-divider-token', 'fixture-toggle-divider-literal-replaces-divider-token',
    'fixture-chip-outline-pseudo-replaced-by-host-border']) {
    const findings = audit.sourceFindings.filter(finding => finding.id === id);
    assert.equal(findings.length, 1);
    assert.equal(findings[0].detected, true);
    assert.equal(findings[0].classification, 'application-plugin-authoring-defect');
  }
  assert.equal(audit.sourceFingerprints.filter(({ file }) => file === 'src/app/services/dom/dom-ancestry.service.ts').length, 1);
  const cascadeProof = 'examples/material-showcase/src/app/label-cascade-input-audit.spec.ts';
  assert.equal(audit.sourceFingerprints.filter(({ file }) => file === cascadeProof).length, 1);
  assert.ok(audit.focusedProofs.some(({ file, line, status }) => file === cascadeProof && line > 0 && status !== 'missing'));
  assert.ok(audit.implementationPlan.some(({ rootCause, priority }) => priority < 0 && rootCause.includes('renderer ancestry')));
  assert.equal(audit.sourceFingerprints.filter(entry => entry.file === 'scripts/audit-material-button-defaults.mjs').length, 1);
  assert.ok(audit.sourceFingerprints.some(({ file }) => file === 'src/app/services/text/text-canvas-renderer.service.ts'));
  const trackingProof = 'examples/material-showcase/src/app/normal-letter-spacing-audit.spec.ts';
  assert.ok(audit.sourceFingerprints.some(({ file }) => file === trackingProof));
  assert.ok(audit.focusedProofs.some(({ file, line, status }) => file === trackingProof && line > 0 && status !== 'missing'));
  assert.ok(audit.sourceFingerprints.some(({ file }) => file === 'examples/material-showcase/node_modules/@angular/material/fesm2022/datepicker.mjs'));
  const tabProof = 'examples/material-showcase/src/app/material-plugin/tab-panel-input-audit.spec.ts';
  assert.ok(audit.sourceFingerprints.some(({ file }) => file === tabProof));
  assert.ok(audit.focusedProofs.some(({ file, line, status }) => file === tabProof && line > 0 && status !== 'missing'));
  for (const file of ['tests/material-parity/input-equivalence-audit.mjs', 'tests/material-parity/input-equivalence-policy.mjs',
    'tests/material-parity/normal-line-box-report.mjs', 'tests/material-parity/normal-line-box-evidence.mjs',
    'scripts/audit-material-normal-line-boxes.mjs']) assert.ok(audit.sourceFingerprints.some((item) => item.file === file));
  assert.ok(audit.sourceFingerprints.some(({ file }) => file === 'examples/material-showcase/src/app/normal-line-height-audit.spec.ts'));
  const snackbarLineBoxProof = 'examples/material-showcase/src/app/snackbar-action-line-box-audit.spec.ts';
  assert.ok(audit.sourceFingerprints.some(({ file }) => file === snackbarLineBoxProof));
  assert.ok(audit.focusedProofs.some(({ file, line, status }) => file === snackbarLineBoxProof && line > 0 && status !== 'missing'));
  const supplementalLineBoxProof = 'scripts/audit-material-supplemental-line-boxes.mjs';
  assert.ok(audit.sourceFingerprints.some(({ file }) => file === supplementalLineBoxProof));
  assert.ok(audit.sourceFingerprints.some(({ file }) => file === 'tests/material-parity/supplemental-line-box-evidence.mjs'));
  assert.ok(audit.focusedProofs.some(({ file, line, status }) => file === supplementalLineBoxProof && line > 0 && status !== 'missing'));
  assert.ok(audit.sourceFingerprints.some(({ file }) => file === 'examples/material-showcase/angular.json'));
  assert.ok(audit.sourceFingerprints.some(({ file }) => file === 'src/app/services/dom/input/button.manager.ts'));
  assert.ok(audit.sourceFingerprints.some(({ file }) => file === 'src/app/services/text/text-style-parser.service.ts'));
  for (const file of ['src/app/services/dom/elements/css-transform.ts',
    'src/app/services/dom/elements/element-material.service.ts', 'src/app/types/style-rule.ts']) {
    assert.ok(audit.sourceFingerprints.some((entry) => entry.file === file));
  }
  assert.ok(audit.sourceFingerprints.some(({ file }) => file === 'src/lib/astylar.ts'));
  assert.ok(audit.sourceFingerprints.some(({ file }) => file === 'src/app/services/dom/style.service.ts'));
  assert.ok(audit.sourceFingerprints.every(({ sha256 }) => /^[a-f0-9]{64}$/.test(sha256)));
  report.interactionSummary.meetsAcceptance = false;
  assert.equal(buildMaterialInputAudit(report).coverage.visualParityGreen, false);
});

test('border proof records separate default and paint causes without blanket scalar attribution', () => {
  const audit = buildMaterialInputAudit(parityReport({ borderColor: 'rgb(18, 52, 86)', borderWidth: '0px' },
    { borderColor: 'transparent', borderWidth: '0px' }));
  for (const [id, classification] of [
    ['core-border-initial-color-differs-from-css', 'intentional-documented-limitation'],
    ['core-border-paint-discards-color-alpha', 'confirmed-core-renderer-defect'],
    ['core-border-currentcolor-has-no-color-context', 'confirmed-core-renderer-defect'],
  ]) {
    const finding = audit.sourceFindings.find(entry => entry.id === id);
    assert.equal(finding.classification, classification);
    assert.equal(finding.detected, true);
    assert.ok(finding.locations.every(location => location.line > 0));
    assert.match(finding.focusedProof, /border-color-input-audit\.spec\.ts/);
  }
  const proof = audit.focusedProofs.find(entry => entry.file.endsWith('/border-color-input-audit.spec.ts'));
  assert.ok(proof.line > 0);
  assert.match(proof.status, /two pass and eight honest failures/);
  for (const file of ['src/app/services/dom/elements/element-border.service.ts',
    'src/app/services/babylon-mesh.service.ts', 'examples/material-showcase/src/app/border-color-input-audit.spec.ts']) {
    assert.equal(audit.sourceFingerprints.filter(entry => entry.file === file).length, 1);
  }
  const borders = audit.discrepancies.filter(entry => /^border.*Color$/.test(entry.property));
  assert.equal(borders.length, 4);
  assert.ok(borders.every(entry => entry.attribution === 'unresolved'));
  assert.ok(borders.every(entry => entry.classification !== 'equivalent-representation'));
  assert.ok(audit.implementationPlan.some(entry => entry.rootCause.includes('Border initial values')));
});

test('keeps used-pixel versus unresolved-expression comparisons open as harness gaps', () => {
  const audit = buildMaterialInputAudit(parityReport({ width: '640px', height: '48px' },
    { width: '100%', height: 'auto' }));
  assert.equal(audit.summary.inputEquivalent, false);
  for (const property of ['width', 'height']) {
    assert.equal(audit.discrepancies.find((entry) => entry.property === property)?.classification,
      'parity-harness-defect');
  }
});

test('retains unequal flex and elliptical radius shorthands instead of deleting evidence', () => {
  const audit = buildMaterialInputAudit(parityReport({ flex: '1 1 0%', borderRadius: '8px / 4px' },
    { flex: '0 0 auto', borderRadius: '8px / 6px' }));
  for (const property of ['flex', 'borderRadius']) {
    const difference = audit.discrepancies.find((entry) => entry.property === property);
    assert.ok(difference, `${property} difference must survive normalization`);
    assert.equal(difference.classification, 'parity-harness-defect');
    assert.match(difference.justification, /not been safely expanded/);
  }
});

test('normalizes supported shorthands on either side and preserves zero percentage basis', () => {
  const audit = buildMaterialInputAudit(parityReport({ padding: '0 24px', flexBasis: '0%' },
    { paddingTop: '0px', paddingRight: '24px', paddingBottom: '0px', paddingLeft: '24px', flexBasis: '0px' }));
  assert.ok(!audit.discrepancies.some(({ property }) => property.startsWith('padding')));
  const basis = audit.discrepancies.find(({ property }) => property === 'flexBasis');
  assert.ok(basis);
  assert.equal(basis.reference, '0%');
  assert.equal(basis.astylar, '0');
});

test('does not erase background image layers when a color longhand is also present', () => {
  const audit = buildMaterialInputAudit(parityReport({ background: 'url("A.png") center / cover', backgroundColor: '#fff' },
    { background: 'url("B.png") center / cover', backgroundColor: '#fff' }));
  const difference = audit.discrepancies.find(({ property }) => property === 'background');
  assert.ok(difference);
  assert.equal(difference.classification, 'parity-harness-defect');
  assert.match(difference.reference, /A\.png/);
  assert.match(difference.astylar, /B\.png/);
});

test('preserves case-sensitive CSS token contents and string whitespace', () => {
  const audit = buildMaterialInputAudit(parityReport({ backgroundImage: 'url("Images/Mark.png")', width: 'var(--Size)', content: '"A  B"' },
    { backgroundImage: 'url("images/mark.png")', width: 'var(--size)', content: '"A B"' }));
  for (const property of ['backgroundImage', 'width', 'content']) {
    const difference = audit.discrepancies.find((entry) => entry.property === property);
    assert.ok(difference, `${property} token difference must survive`);
    assert.notEqual(difference.reference, difference.astylar);
  }
});

test('requires layout and hit-target context for alignment and auto cursor equivalence', () => {
  const values = { alignItems: 'normal', alignContent: 'normal', justifyContent: 'normal', cursor: 'auto' };
  const candidate = { alignItems: 'stretch', alignContent: 'stretch', justifyContent: 'flex-start', cursor: 'default' };
  const unknown = buildMaterialInputAudit(parityReport(values, candidate));
  for (const property of Object.keys(values)) {
    assert.equal(unknown.discrepancies.find((entry) => entry.property === property)?.classification, 'parity-harness-defect');
  }
  const flex = buildMaterialInputAudit(parityReport({ ...values, display: 'flex' }, { ...candidate, display: 'flex' }));
  assert.ok(!flex.discrepancies.some(({ property }) => ['alignItems', 'alignContent', 'justifyContent'].includes(property)));
  assert.ok(flex.discrepancies.some(({ property }) => property === 'cursor'));
  const grid = buildMaterialInputAudit(parityReport({ ...values, display: 'grid' }, { ...candidate, display: 'grid' }));
  assert.ok(grid.discrepancies.some(({ property }) => property === 'alignItems'));
});

test('rejects empty evidence and duplicate records rather than treating case counts as coverage', () => {
  const report = parityReport({}, {});
  report.results.push(report.results[0]);
  const audit = buildMaterialInputAudit(report);
  assert.equal(audit.coverage.missingInputEvidence.length, 2);
  assert.equal(audit.coverage.duplicateCases.length, 1);
  assert.equal(audit.coverage.complete, false);
  assert.equal(audit.summary.inputEquivalent, false);
  const errors = validateMaterialInputAudit(audit, { requireComplete: false });
  assert.ok(errors.some((error) => error.includes('root style evidence')));
  assert.ok(errors.some((error) => error.includes('duplicate case')));
});

test('does not attribute legacy incompatible text and descendant collection to authoring', () => {
  const report = parityReport({ display: 'block' }, { display: 'block' });
  report.results[0].styleInputs[0].referenceStructure = { text: 'First', descendantIds: ['first'] };
  report.results[0].styleInputs[0].astylarStructure = { text: '', descendantIds: ['wrapper', 'first'] };
  const audit = buildMaterialInputAudit(report);
  assert.equal(audit.structureEvidence[0].classification, 'parity-harness-defect');
  assert.equal(audit.summary.inputEquivalent, false);
});

test('legacy normal-only interaction styles cannot be attributed as authoring defects', () => {
  const report = parityReport({ backgroundColor: 'purple' }, { backgroundColor: 'white' });
  report.interactions = [{ ...report.results[0], state: 'hover' }];
  report.results = [];
  const legacy = buildMaterialInputAudit(report);
  assert.equal(legacy.discrepancies[0].classification, 'parity-harness-defect');
  assert.match(legacy.discrepancies[0].justification, /normal-only/);
  report.interactions[0].styleInputs[0].astylarResolvedStyleEvidenceVersion = 2;
  const current = buildMaterialInputAudit(report);
  assert.equal(current.discrepancies[0].classification, 'parity-harness-defect');
  assert.equal(current.discrepancies[0].attribution, 'unresolved');
  assert.doesNotMatch(current.discrepancies[0].justification, /normal-only/);
  report.interactions.push({ ...report.interactions[0], state: 'held',
    styleInputs: [{ ...report.interactions[0].styleInputs[0], astylarResolvedStyleEvidenceVersion: undefined }] });
  const mixed = buildMaterialInputAudit(report);
  assert.equal(mixed.discrepancies.length, 2, 'different attribution evidence must not be pooled together');
  assert.equal(mixed.summary.unresolvedAttributions, 1);
});

function timepickerOptionReport() {
  const raw = retainedTypographyReport(), entry = raw.results[0];
  entry.family = 'timepicker';
  const { reference: r, astylar: a } = entry.inputTrees;
  const referenceStyle = { fontFamily: 'Roboto', fontSize: '16px', fontWeight: '400', fontStyle: 'normal',
    lineHeight: '24px', letterSpacing: '.496px', wordSpacing: '0px', textAlign: 'left',
    textTransform: 'none', textDecoration: 'none', color: '#1d1b1e' };
  const candidateStyle = { ...referenceStyle, fontFamily: 'Roboto, Arial, sans-serif', lineHeight: 'normal',
    letterSpacing: '0px', color: '#1d1b20' };
  r.nodes = []; r.styles = [referenceStyle]; a.nodes = [];
  const ref = (key, parent, type, attributes, text = '') => r.nodes.push({ key, parent, type, attributes,
    ownText: text, style: 0, rules: [], inline: {}, pseudoElements: [] });
  const ast = (key, parent, authored) => a.nodes.push({ key, parent, authored,
    resolvedStyle: candidateStyle, normalResolvedStyle: candidateStyle, interactionResolvedStyle: candidateStyle,
    ...(authored.textContent ? { retainedText: { source: 'core-text-registry', style: candidateStyle } } : {}) });
  ref('field', null, 'mat-form-field', { id: 'timepicker-primary', class: 'mat-mdc-form-field' });
  ref('infix', 'field', 'div', {});
  ref('label', 'infix', 'label', { id: 'label-0', for: 'timepicker-control', class: 'mat-mdc-floating-label' });
  ref('input', 'infix', 'input', { id: 'timepicker-control', role: 'combobox', 'aria-expanded': 'true',
    'aria-controls': 'mat-timepicker-panel-0', 'mat-timepicker-id': 'mat-timepicker-panel-0', 'aria-activedescendant': 'mat-option-0' });
  ref('panel', null, 'div', { id: 'mat-timepicker-panel-0', role: 'listbox', class: 'mat-timepicker-panel', 'aria-labelledby': 'label-0' });
  ast('field', null, { type: 'div', id: 'timepicker-primary', class: 'field-shell' });
  ast('region', 'field', { type: 'div', id: 'timepicker-input-region' });
  ast('input', 'region', { type: 'input', id: 'timepicker-control', role: 'combobox', ariaExpanded: true,
    ariaControls: 'timepicker-options', ariaHaspopup: 'dialog', ariaActivedescendant: 'timepicker-option-0' });
  ast('panel', 'field', { type: 'div', id: 'timepicker-options', class: 'picker-popup', role: 'listbox' });
  for (let index = 0; index < 48; index++) {
    const h = Math.floor(index / 2), text = `${h % 12 || 12}:${index % 2 ? '30' : '00'} ${h < 12 ? 'AM' : 'PM'}`;
    ref(`o${index}`, 'panel', 'mat-option', { id: `mat-option-${index}`, role: 'option', class: 'mat-mdc-option',
      'aria-selected': 'false', 'aria-disabled': 'false' });
    ref(`t${index}`, `o${index}`, 'span', { class: 'mdc-list-item__primary-text' }, text);
    ref(`r${index}`, `o${index}`, 'div', { class: 'mat-mdc-option-ripple', 'aria-hidden': 'true' });
    ast(`o${index}`, 'panel', { type: 'div', id: `timepicker-option-${index}`, class: 'picker-option', role: 'option',
      ariaSelected: index === 0, textContent: text });
  }
  return raw;
}

test('timepicker options map the complete linked half-hour domain without equating wrappers or selection', () => {
  const raw = timepickerOptionReport(), original = structuredClone(raw), cases = raw.results.map(e => ({ ...e, kind: 'static' }));
  const inventory = collectFullTreeInventory(cases), result = collectRetainedTypographyEvidence(cases, inventory);
  assert.equal(result.reviewedMappings.length, 48);
  assert.equal(result.comparisons.length, 48);
  assert.equal(result.differences.length, 192);
  assert.equal(result.gaps.length, 0);
  const [first] = result.reviewedMappings, last = result.reviewedMappings.at(-1);
  assert.equal(first.kind, 'reviewed-timepicker-option-text');
  assert.equal(first.inputEquivalent, false);
  assert.equal(first.finalRasterVerified, false);
  assert.equal(first.classification, 'application-plugin-authoring-defect');
  assert.equal(first.reviewEvidence.referenceSelection, 'false');
  assert.equal(first.reviewEvidence.candidateSelection, true);
  assert.equal(last.reviewEvidence.minutes, 1410);
  assert.equal(last.reviewEvidence.text, '11:30 PM');
  assert.deepEqual(raw, original);
});

test('timepicker option correspondence rejects incomplete reordered ambiguous or unlinked lists', () => {
  const controls = [
    (r, a) => { r.nodes.find(n => n.key === 'input').attributes['aria-controls'] = 'other'; },
    (r, a) => { a.nodes.find(n => n.key === 'input').authored.ariaControls = 'other'; },
    (r, a) => { r.nodes.find(n => n.key === 'input').attributes['aria-expanded'] = 'false'; },
    (r, a) => { a.nodes.find(n => n.key === 'input').authored.ariaExpanded = false; },
    (r, a) => { r.nodes.find(n => n.key === 'input').attributes['mat-timepicker-id'] = 'other'; },
    (r, a) => { r.nodes.find(n => n.key === 'label').attributes.for = 'other'; },
    (r, a) => { r.nodes.find(n => n.key === 'label').parent = 'other'; },
    (r, a) => { a.nodes.find(n => n.key === 'panel').parent = 'other'; },
    (r, a) => { r.nodes = r.nodes.filter(n => n.key !== 'o47'); },
    (r, a) => { a.nodes = a.nodes.filter(n => n.key !== 'o47'); },
    (r, a) => { r.nodes.find(n => n.key === 't47').ownText = '11:00 PM'; },
    (r, a) => { a.nodes.find(n => n.key === 'o0').authored.textContent = '12:30 AM'; },
    (r, a) => { r.nodes.find(n => n.key === 'o1').attributes.id = 'mat-option-0'; },
    (r, a) => { a.nodes.find(n => n.key === 'o1').authored.id = 'timepicker-option-0'; },
    (r, a) => { r.nodes.push(structuredClone(r.nodes.at(-1))); },
    (r, a) => { a.nodes.push(structuredClone(a.nodes.at(-1))); },
    (r, a) => { r.nodes.find(n => n.key === 'r0').ownText = 'extra text'; },
    (r, a) => { r.nodes.find(n => n.key === 'r0').attributes['aria-hidden'] = 'false'; },
    (r, a) => { r.nodes.find(n => n.key === 'input').attributes['aria-activedescendant'] = 'missing'; },
    (r, a) => { a.nodes.find(n => n.key === 'input').authored.ariaActivedescendant = 'missing'; },
    (r, a) => { r.nodes.find(n => n.key === 't0').attributes.id = 'timepicker-option-0'; },
    (r, a) => { a.nodes.find(n => n.key === 'o0').authored.role = 'button'; },
    (r, a) => { const i = r.nodes.findIndex(n => n.key === 'o0'), j = r.nodes.findIndex(n => n.key === 'o1'); [r.nodes[i], r.nodes[j]] = [r.nodes[j], r.nodes[i]]; },
    (r, a) => { const i = a.nodes.findIndex(n => n.key === 'o0'), j = a.nodes.findIndex(n => n.key === 'o1'); [a.nodes[i], a.nodes[j]] = [a.nodes[j], a.nodes[i]]; },
  ];
  for (const [index, mutate] of controls.entries()) {
    const raw = timepickerOptionReport(), { reference, astylar } = raw.results[0].inputTrees;
    mutate(reference, astylar);
    assert.deepEqual(reviewedTemplateTextMappings('timepicker', reference, astylar), [], `control ${index}`);
  }
});

test('timepicker option replay rejects deleted forged or transplanted evidence', () => {
  const original = buildMaterialInputAudit(timepickerOptionReport());
  assert.ok(!validateMaterialInputAudit(original, { requireComplete: false }).some(e => e.includes('timepicker option')));
  for (const mutate of [
    r => { r.retainedTypography.reviewedMappings.pop(); },
    r => { r.retainedTypography.reviewedMappings.push(r.retainedTypography.reviewedMappings[0]); },
    r => { r.retainedTypography.reviewedMappings[0].inputEquivalent = true; },
    r => { r.retainedTypography.reviewedMappings[0].reviewEvidence.referenceSelection = 'true'; },
    r => { r.retainedTypography.reviewedMappings[0].case = 'static:menu@light/desktop'; },
    r => { r.retainedTypography.comparisons[0].revision++; },
    r => { r.retainedTypography.comparisons[0].properties.lineHeight.retained = '24px'; },
    r => { r.retainedTypography.differences.pop(); },
    r => { r.retainedTypography.differences[0].attribution = 'equivalent-representation'; },
  ]) {
    const report = structuredClone(original); mutate(report);
    assert.ok(validateMaterialInputAudit(report, { requireComplete: false }).some(e => e.includes('timepicker option')));
  }
});

function materialOptionReport(family, referenceSelected = -1, candidateSelected = referenceSelected) {
  const raw = timepickerOptionReport(), entry = raw.results[0];
  entry.family = family;
  const { reference: r, astylar: a } = entry.inputTrees, auto = family === 'autocomplete';
  r.nodes = r.nodes.filter(n => ['field', 'infix', 'label', 'input', 'panel'].includes(n.key));
  a.nodes = a.nodes.filter(n => ['field', 'region', 'input', 'panel'].includes(n.key));
  const rn = key => r.nodes.find(n => n.key === key), an = key => a.nodes.find(n => n.key === key);
  rn('field').attributes.id = `${family}-primary`;
  rn('label').attributes.for = auto ? `${family}-control` : undefined;
  rn('input').type = auto ? 'input' : 'mat-select';
  rn('input').attributes = { id: `${family}-control`, role: 'combobox', 'aria-expanded': 'true',
    'aria-controls': auto ? 'mat-autocomplete-0' : 'select-control-panel', 'aria-label': auto ? 'City' : 'Plan',
    ...(auto ? { 'aria-autocomplete': 'list' } : { 'aria-activedescendant': `mat-option-${Math.max(0, referenceSelected)}` }) };
  rn('panel').attributes = { id: rn('input').attributes['aria-controls'], role: 'listbox', class: `mat-mdc-${family}-panel`,
    ...(auto ? { 'aria-labelledby': 'label-0' } : { 'aria-multiselectable': 'false', 'aria-label': 'Plan' }) };
  an('field').authored.id = `${family}-primary`;
  an('region').authored = { type: 'div', id: `${family}-input-region`, class: 'field-input-region' };
  an('input').authored = { type: 'input', id: `${family}-control`, role: 'combobox', ariaExpanded: true,
    ariaControls: auto ? 'field-options' : 'select-options', ...(auto ? { ariaAutocomplete: 'list' } : {}) };
  an('panel').authored = { type: 'div', id: an('input').authored.ariaControls, role: 'listbox', class: 'select-popup' };
  const domains = auto ? [['cape-town', 'Cape Town', 'Cape Town'], ['johannesburg', 'Johannesburg', 'Johannesburg']]
    : [['solo', 'Solo', 'solo'], ['team', 'Team', 'team']];
  const ref = (key, parent, type, attributes, ownText = '') => r.nodes.push({ ...structuredClone(rn('field')), key, parent, type, attributes, ownText });
  const ast = (key, parent, authored) => a.nodes.push({ ...structuredClone(an('field')), key, parent, authored,
    ...(authored.textContent ? { retainedText: { source: 'core-text-registry', style: an('field').resolvedStyle } } : {}) });
  for (const [index, [slug, text, value]] of domains.entries()) {
    ref(`o${index}`, 'panel', 'mat-option', { id: `mat-option-${index}`, role: 'option', value, class: 'mat-mdc-option',
      'aria-selected': String(index === referenceSelected), 'aria-disabled': 'false' });
    ref(`t${index}`, `o${index}`, 'span', { class: 'mdc-list-item__primary-text' }, text);
    if (index === referenceSelected) ref(`c${index}`, `o${index}`, 'mat-pseudo-checkbox', { state: 'checked', appearance: 'minimal',
      'aria-hidden': 'true', class: 'mat-mdc-option-pseudo-checkbox' });
    ref(`r${index}`, `o${index}`, 'div', { class: 'mat-mdc-option-ripple', 'aria-hidden': 'true' });
    const id = `${family}-option-${slug}`;
    ast(`o${index}`, 'panel', { type: 'div', id, class: 'select-option', role: 'option', ariaSelected: index === candidateSelected });
    ast(`t${index}`, `o${index}`, { type: 'span', id: auto ? `${id}-label` : `select-${slug}-label`, textContent: text });
    if (index === candidateSelected) ast(`c${index}`, `o${index}`, { type: 'showcase.material:check-mark',
      id: auto ? `${id}-check` : 'select-check', class: 'selection-mark select-check', role: 'presentation', data: { 'stroke-width': 1.8 } });
  }
  return raw;
}

test('material option mapping preserves complete domains and independent selection/indicator owners', () => {
  for (const family of ['autocomplete', 'select']) for (const [refSelected, astSelected] of [[-1, -1], [0, 0], [1, 1], [0, 1]]) {
    const raw = materialOptionReport(family, refSelected, astSelected), original = structuredClone(raw);
    const cases = raw.results.map(e => ({ ...e, kind: 'static' }));
    const result = collectRetainedTypographyEvidence(cases, collectFullTreeInventory(cases));
    assert.equal(result.reviewedMappings.length, 2);
    assert.equal(result.comparisons.length, 2);
    assert.equal(result.differences.length, 8, 'raw typography differences are not waived by a correspondence');
    assert.equal(result.gaps.length, 0);
    for (const [index, mapping] of result.reviewedMappings.entries()) {
      assert.equal(mapping.kind, 'reviewed-material-option-text');
      assert.equal(mapping.inputEquivalent, false);
      assert.equal(mapping.finalRasterVerified, false);
      assert.equal(mapping.classification, 'application-plugin-authoring-defect');
      assert.equal(mapping.reviewEvidence.referenceSelection, String(index === refSelected));
      assert.equal(mapping.reviewEvidence.candidateSelection, index === astSelected);
      assert.equal(Boolean(mapping.reviewEvidence.referenceCheck), index === refSelected);
      assert.equal(Boolean(mapping.reviewEvidence.candidateCheck), index === astSelected);
    }
    assert.deepEqual(raw, original);
  }
});

test('material option mapping rejects incomplete ambiguous or detached input domains and indicator paths', () => {
  const controls = [
    (r, a) => { r.nodes.find(n => n.key === 'input').attributes['aria-controls'] = 'other'; },
    (r, a) => { a.nodes.find(n => n.key === 'input').authored.ariaControls = 'other'; },
    (r, a) => { r.nodes.find(n => n.key === 'input').attributes['aria-expanded'] = 'false'; },
    (r, a) => { a.nodes.find(n => n.key === 'input').authored.ariaExpanded = false; },
    (r, a) => { r.nodes.find(n => n.key === 'input').parent = 'missing'; },
    (r, a) => { a.nodes.find(n => n.key === 'input').parent = 'field'; },
    (r, a) => { r.nodes.find(n => n.key === 'label').parent = 'missing'; },
    (r, a) => { a.nodes.find(n => n.key === 'panel').parent = 'missing'; },
    (r, a) => { r.nodes = r.nodes.filter(n => n.key !== 'o1'); },
    (r, a) => { a.nodes = a.nodes.filter(n => n.key !== 'o1'); },
    (r, a) => { r.nodes.find(n => n.key === 't1').ownText = 'Other'; },
    (r, a) => { a.nodes.find(n => n.key === 't1').authored.textContent = 'Other'; },
    (r, a) => { r.nodes.find(n => n.key === 'o1').attributes.id = 'mat-option-0'; },
    (r, a) => { a.nodes.find(n => n.key === 'o1').authored.id = a.nodes.find(n => n.key === 'o0').authored.id; },
    (r, a) => { r.nodes.push(structuredClone(r.nodes.at(-1))); },
    (r, a) => { a.nodes.push(structuredClone(a.nodes.at(-1))); },
    (r, a) => { r.nodes.find(n => n.key === 'r0').ownText = 'extra'; },
    (r, a) => { r.nodes.find(n => n.key === 'r0').attributes['aria-hidden'] = 'false'; },
    (r, a) => { r.nodes.find(n => n.key === 'input').attributes['aria-activedescendant'] = 'missing'; },
    (r, a) => { a.nodes.find(n => n.key === 'input').authored.ariaActivedescendant = 'missing'; },
    (r, a) => { r.nodes.find(n => n.key === 't0').attributes.id = a.nodes.find(n => n.key === 't0').authored.id; },
    (r, a) => { a.nodes.find(n => n.key === 'o0').authored.role = 'button'; },
    (r, a) => { const i = r.nodes.findIndex(n => n.key === 'o0'), j = r.nodes.findIndex(n => n.key === 'o1'); [r.nodes[i], r.nodes[j]] = [r.nodes[j], r.nodes[i]]; },
    (r, a) => { const i = a.nodes.findIndex(n => n.key === 'o0'), j = a.nodes.findIndex(n => n.key === 'o1'); [a.nodes[i], a.nodes[j]] = [a.nodes[j], a.nodes[i]]; },
    (r, a) => { r.nodes.find(n => n.key === 'o0').attributes.value = 'other'; },
    (r, a) => { r.nodes.find(n => n.key === 'o0').attributes['aria-selected'] = 'false'; },
    (r, a) => { a.nodes.find(n => n.key === 'o0').authored.ariaSelected = false; },
    (r, a) => { r.nodes.find(n => n.key === 'c0').attributes.appearance = 'full'; },
    (r, a) => { r.nodes.find(n => n.key === 'c0').attributes['aria-hidden'] = 'false'; },
    (r, a) => { r.nodes.find(n => n.key === 'c0').ownText = 'check'; },
    (r, a) => { a.nodes.find(n => n.key === 'c0').authored.type = 'span'; },
    (r, a) => { a.nodes.find(n => n.key === 'c0').authored.role = 'button'; },
    (r, a) => { a.nodes.find(n => n.key === 'c0').parent = 'panel'; },
    (r, a) => { a.nodes.find(n => n.key === 't0').parent = 'c0'; },
    (r, a) => { r.nodes.find(n => n.key === 'r0').parent = 't0'; },
    (r, a) => { r.nodes.find(n => n.key === 'panel').ownText = 'extra'; },
    (r, a) => { a.nodes.find(n => n.key === 'panel').authored.textContent = 'extra'; },
  ];
  for (const family of ['autocomplete', 'select']) for (const [index, mutate] of controls.entries()) {
    const raw = materialOptionReport(family, 0), { reference: r, astylar: a } = raw.results[0].inputTrees;
    mutate(r, a);
    assert.deepEqual(reviewedTemplateTextMappings(family, r, a), [], `${family} control ${index}`);
  }
});

test('material option mapping enforces each family association rather than substituting picker behavior', () => {
  for (const [family, mutate] of [
    ['autocomplete', r => { r.nodes.find(n => n.key === 'input').attributes['aria-autocomplete'] = 'none'; }],
    ['autocomplete', r => { r.nodes.find(n => n.key === 'label').attributes.for = 'other'; }],
    ['autocomplete', r => { r.nodes.find(n => n.key === 'panel').attributes['aria-labelledby'] = 'missing'; }],
    ['select', r => { r.nodes.find(n => n.key === 'panel').attributes['aria-multiselectable'] = 'true'; }],
    ['select', r => { r.nodes.find(n => n.key === 'panel').attributes['aria-label'] = 'Other'; }],
    ['select', r => { r.nodes.find(n => n.key === 'input').type = 'input'; }],
  ]) {
    const { reference, astylar } = materialOptionReport(family).results[0].inputTrees;
    mutate(reference);
    assert.deepEqual(reviewedTemplateTextMappings(family, reference, astylar), []);
  }
});

test('material option replay rejects dropped forged or transplanted mappings and typography', () => {
  for (const family of ['autocomplete', 'select']) {
    const original = buildMaterialInputAudit(materialOptionReport(family, 0));
    assert.ok(!validateMaterialInputAudit(original, { requireComplete: false }).some(e => e.includes('material option')));
    for (const mutate of [
      r => { r.retainedTypography.reviewedMappings.pop(); },
      r => { r.retainedTypography.reviewedMappings.push(r.retainedTypography.reviewedMappings[0]); },
      r => { r.retainedTypography.reviewedMappings[0].inputEquivalent = true; },
      r => { r.retainedTypography.reviewedMappings[0].finalRasterVerified = true; },
      r => { r.retainedTypography.reviewedMappings[0].classification = 'equivalent-representation'; },
      r => { r.retainedTypography.reviewedMappings[0].reviewEvidence.referenceCheck = null; },
      r => { r.retainedTypography.reviewedMappings[0].case = 'static:menu@light/desktop'; },
      r => { r.retainedTypography.comparisons[0].revision++; },
      r => { r.retainedTypography.comparisons[0].properties.lineHeight.retained = '24px'; },
      r => { r.retainedTypography.differences.pop(); },
      r => { r.retainedTypography.differences[0].attribution = 'equivalent-representation'; },
    ]) {
      const report = structuredClone(original); mutate(report);
      assert.ok(validateMaterialInputAudit(report, { requireComplete: false }).some(e => e.includes('material option')));
    }
  }
});

function materialOptionInkReport(family = 'autocomplete', selected = 0) {
  const raw = materialOptionReport(family, selected), { reference: r, astylar: a } = raw.results[0].inputTrees;
  r.rules = [
    { source: 'sheet:11/0', selector: '.mat-mdc-option', active: true, conditions: [],
      cssText: 'color:var(--mat-option-label-text-color, var(--mat-sys-on-surface));',
      declarations: { color: { value: 'var(--mat-option-label-text-color, var(--mat-sys-on-surface))', important: false } } },
    { source: 'sheet:11/1', selector: '.mat-mdc-option.mdc-list-item--selected:not(.mdc-list-item--disabled):not(.mat-mdc-option-multiple) .mdc-list-item__primary-text',
      active: true, conditions: [], cssText: 'color:var(--mat-option-selected-state-label-text-color, var(--mat-sys-on-secondary-container));',
      declarations: { color: { value: 'var(--mat-option-selected-state-label-text-color, var(--mat-sys-on-secondary-container))', important: false } } },
  ];
  r.styles.push({ ...r.styles[0], color: '#4b4357' });
  for (const node of r.nodes.filter(n => n.type === 'mat-option')) {
    node.rules = [0];
    if (node.attributes['aria-selected'] === 'true') {
      node.attributes.class += ' mdc-list-item--selected';
      const leaf = r.nodes.find(n => n.parent === node.key && n.type === 'span');
      leaf.rules = [1]; leaf.style = 1;
    }
  }
  for (const node of a.nodes.filter(n => n.authored.type === 'span')) {
    for (const stage of ['normalResolvedStyle', 'interactionResolvedStyle', 'resolvedStyle']) {
      node[stage] = { ...node[stage] }; delete node[stage].color;
    }
  }
  a.rules = [{ selector: '.select-option', color: '#1d1b20' }, { selector: '.select-option.selected', background: '#eadef7' },
    { selector: '.select-option:hover', background: '#e5dfe5' }];
  return raw;
}

test('material option ink distinguishes inherited base and selected leaf tokens without inventing own styles', () => {
  for (const family of ['autocomplete', 'select']) {
    const raw = materialOptionInkReport(family), original = structuredClone(raw), report = buildMaterialInputAudit(raw);
    const ink = report.retainedTypography.differences.filter(d => d.attribution === 'reviewed-material-option-ink-input');
    assert.equal(ink.length, 2);
    assert.equal(ink[0].reviewEvidence.selected, true);
    assert.equal(ink[1].reviewEvidence.selected, false);
    assert.deepEqual(ink[0].reviewEvidence.referenceRules.map(r => r.node), ['t0', 'o0']);
    assert.deepEqual(ink[1].reviewEvidence.referenceRules.map(r => r.node), ['o1']);
    assert.equal(ink[0].values.reference, 'rgba(75,67,87,1)');
    assert.equal(ink[1].values.reference, 'rgba(29,27,30,1)');
    for (const d of ink) {
      assert.equal(d.classification, 'application-plugin-authoring-defect');
      assert.equal(d.inputEquivalent, false);
      assert.equal(d.finalRasterVerified, false);
      assert.equal(d.values.normal, undefined);
      assert.equal(d.values.effective, undefined);
      assert.equal(d.values.retained, 'rgba(29,27,32,1)');
      const [leaf, owner] = d.reviewEvidence.candidateChain;
      assert.equal(leaf.normal.color, undefined);
      assert.equal(leaf.effective.color, undefined);
      assert.equal(owner.normal.color, '#1d1b20');
      assert.equal(owner.effective.color, '#1d1b20');
    }
    assert.ok(report.sourceFindings.find(f => f.id === 'fixture-material-option-ink-substitution').detected);
    assert.ok(!validateMaterialInputAudit(report, { requireComplete: false }).some(e => e.includes('material option')));
    assert.deepEqual(raw, original);
  }
});

test('material option ink rejects competing declarations missing inheritance and changed stages', () => {
  const controls = [
    (r, a) => { r.rules[0].active = false; },
    (r, a) => { delete r.rules[0].active; },
    (r, a) => { r.rules[0].selector = '.other'; },
    (r, a) => { r.rules[0].conditions = ['@media (min-width:1px)']; },
    (r, a) => { r.rules[0].declarations.color.important = true; },
    (r, a) => { r.rules[0].declarations.color.value = '#1d1b1e'; },
    (r, a) => { r.rules[0].declarations.all = { value: 'initial' }; },
    (r, a) => { r.rules[0].declarations.transition = { value: 'color 1s' }; },
    (r, a) => { r.nodes.find(n => n.key === 't0').inline.color = { value: 'inherit' }; },
    (r, a) => { r.nodes.find(n => n.key === 'o0').inline.all = { value: 'unset' }; },
    (r, a) => { r.nodes.find(n => n.key === 't0').attributes.style = 'color:inherit'; },
    (r, a) => { r.nodes.find(n => n.key === 'o0').attributes.style = 'animation: ink 1s'; },
    (r, a) => { r.nodes.find(n => n.key === 'o0').style = 999; },
    (r, a) => { r.rules.push(structuredClone(r.rules[0])); r.nodes.find(n => n.key === 'o0').rules.push(2); },
    (r, a) => { a.rules[0].color = '#000000'; },
    (r, a) => { a.rules[0].selector = '.other'; },
    (r, a) => { a.rules[0].all = 'initial'; },
    (r, a) => { a.rules.push({ selector: '.select-option', color: '#1d1b20' }); },
    (r, a) => { a.rules.push({ selector: '.field-shell .select-option:hover', color: '#1d1b20' }); },
    (r, a) => { a.rules.push({ selector: '[role=option]', color: '#1d1b20' }); },
    (r, a) => { a.rules.push({ selector: '', color: '#1d1b20' }); },
    (r, a) => { a.rules.push({ selector: '.select-option', transition: 'color 1s' }); },
    (r, a) => { a.rules.push({ selector: '.select-option span', color: '#1d1b20' }); },
    (r, a) => { a.rules.push({ selector: 'span:hover', '-webkit-text-fill-color': '#1d1b20' }); },
    ...['t0', 'o0'].flatMap(key => [
      (r, a) => { a.nodes.find(n => n.key === key).authored.style = { color: '#1d1b20' }; },
      (r, a) => { a.nodes.find(n => n.key === key).authored.style = 'color:#1d1b20'; },
      (r, a) => { a.nodes.find(n => n.key === key).authored.style = null; },
    ]),
    ...['normalResolvedStyle', 'interactionResolvedStyle'].flatMap(stage => [
      (r, a) => { const n = a.nodes.find(n => n.key === 'o0'); n[stage] = { ...n[stage], color: '#000000' }; },
      (r, a) => { const n = a.nodes.find(n => n.key === 't0'); n[stage] = { ...n[stage], color: '#1d1b20' }; },
      (r, a) => { const n = a.nodes.find(n => n.key === 't0'); n[stage] = { ...n[stage], all: 'initial' }; },
    ]),
    (r, a) => { const n = a.nodes.find(n => n.key === 't0'); n.retainedText = { ...n.retainedText, style: { ...n.retainedText.style, color: '#000000' } }; },
    (r, a) => { a.nodes.find(n => n.key === 'o0').normalResolvedStyle = undefined; },
    (r, a) => { a.nodes.find(n => n.key === 'o0').interactionResolvedStyle = undefined; },
  ];
  for (const family of ['autocomplete', 'select']) for (const selected of [-1, 0]) for (const [index, mutate] of controls.entries()) {
    const raw = materialOptionInkReport(family, selected), { reference: r, astylar: a } = raw.results[0].inputTrees;
    mutate(r, a);
    const cases = raw.results.map(e => ({ ...e, kind: 'static' }));
    const result = collectRetainedTypographyEvidence(cases, collectFullTreeInventory(cases));
    assert.ok(!result.differences.some(d => d.astylarNode === 't0' && d.attribution === 'reviewed-material-option-ink-input'), `${family}/${selected}/${index}`);
  }
});

test('material option ink checks the selected leaf rule separately from inherited unselected color', () => {
  const controls = [
    r => { r.rules[1].active = false; },
    r => { delete r.rules[1].active; },
    r => { r.rules[1].selector = '.mdc-list-item__primary-text'; },
    r => { r.rules[1].declarations.color.value = '#4b4357'; },
    r => { r.rules[1].declarations.color.important = true; },
    r => { r.rules[1].conditions = ['@media (min-width:1px)']; },
    r => { r.rules[1].declarations.all = { value: 'initial' }; },
    r => { r.rules[1].declarations['-webkit-text-fill-color'] = { value: '#4b4357' }; },
    r => { r.nodes.find(n => n.key === 't0').rules = []; },
    r => { r.nodes.find(n => n.key === 't0').rules.push(0); },
    r => { r.nodes.find(n => n.key === 'o0').attributes.class = 'mat-mdc-option'; },
    r => { r.nodes.find(n => n.key === 'o0').attributes.class += ' mat-mdc-option-multiple'; },
    r => { r.nodes.find(n => n.key === 'o0').attributes.class += ' mdc-list-item--disabled'; },
    r => { r.nodes.find(n => n.key === 'o0').attributes['aria-disabled'] = 'true'; },
  ];
  for (const family of ['autocomplete', 'select']) for (const [index, mutate] of controls.entries()) {
    const raw = materialOptionInkReport(family), { reference: r } = raw.results[0].inputTrees;
    mutate(r);
    const cases = raw.results.map(e => ({ ...e, kind: 'static' }));
    const result = collectRetainedTypographyEvidence(cases, collectFullTreeInventory(cases));
    assert.ok(!result.differences.some(d => d.astylarNode === 't0' && d.attribution === 'reviewed-material-option-ink-input'), `${family}/${index}`);
  }
  for (const mutate of [
    r => { r.nodes.find(n => n.key === 't1').rules = [1]; },
    r => { r.nodes.find(n => n.key === 'o1').style = 1; },
  ]) {
    const raw = materialOptionInkReport(), { reference: r } = raw.results[0].inputTrees; mutate(r);
    const cases = raw.results.map(e => ({ ...e, kind: 'static' }));
    const result = collectRetainedTypographyEvidence(cases, collectFullTreeInventory(cases));
    assert.ok(!result.differences.some(d => d.astylarNode === 't1' && d.attribution === 'reviewed-material-option-ink-input'));
  }
});

test('material option ink accepts different token results and excludes only unrelated candidate rules', () => {
  for (const family of ['autocomplete', 'select']) {
    const raw = materialOptionInkReport(family), { reference: r, astylar: a } = raw.results[0].inputTrees;
    r.styles[0].color = '#123456'; r.styles[1].color = '#abcdef';
    r.rules.push({ selector: '.mat-mdc-option:hover', active: false, conditions: [], declarations: { color: { value: '#abcdef', important: false } } });
    r.nodes.find(n => n.key === 'o0').rules.push(2);
    a.rules.push({ selector: '.unrelated:hover', color: '#abcdef' }, { selector: '#page', color: '#abcdef' });
    const report = buildMaterialInputAudit(raw);
    assert.equal(report.retainedTypography.differences.filter(d => d.attribution === 'reviewed-material-option-ink-input').length, 2);
    assert.ok(!validateMaterialInputAudit(report, { requireComplete: false }).some(e => e.includes('material option')));
  }
});

test('material option ink replay rejects invented own colors token evidence and renderer claims', () => {
  for (const family of ['autocomplete', 'select']) {
    const original = buildMaterialInputAudit(materialOptionInkReport(family));
    for (const mutate of [
      d => { d.classification = 'confirmed-core-renderer-defect'; },
      d => { d.element = 'menu-rename-label'; d.case = 'static:menu@light/desktop'; },
      d => { d.inputEquivalent = true; },
      d => { d.finalRasterVerified = true; },
      d => { d.reviewEvidence.referenceRules[0].rule.declarations.color.value = '#4b4357'; },
      d => { d.reviewEvidence.referenceChain.pop(); },
      d => { d.reviewEvidence.checkedCandidateRules = []; },
      d => { d.reviewEvidence.candidateChain[0].normal.color = '#1d1b20'; },
      d => { d.reviewEvidence.candidateChain[1].effective.color = '#4b4357'; },
      d => { d.reviewEvidence.candidateRetained.color = '#4b4357'; },
      d => { d.reviewEvidence.sourceFinding = 'unknown'; },
    ]) {
      const report = structuredClone(original), d = report.retainedTypography.differences.find(d => d.attribution === 'reviewed-material-option-ink-input');
      mutate(d);
      assert.ok(validateMaterialInputAudit(report, { requireComplete: false }).some(e => e.includes('material option')));
    }
  }
});

function timepickerOptionInkReport() {
  const raw = timepickerOptionReport(), { reference: r, astylar: a } = raw.results[0].inputTrees;
  r.rules = [{ source: 'sheet:11/0', selector: '.mat-mdc-option', active: true, conditions: [],
    cssText: 'color: var(--mat-option-label-text-color, var(--mat-sys-on-surface));',
    declarations: { color: { value: 'var(--mat-option-label-text-color, var(--mat-sys-on-surface))', important: false } } }];
  for (const node of r.nodes.filter(n => n.type === 'mat-option')) node.rules = [0];
  a.rules = [{ selector: '.picker-option', color: '#1d1b20' },
    { selector: '.picker-option:hover', background: '#e5dfe5' },
    { selector: '.picker-option.selected', background: '#d8d2d8' }];
  return raw;
}

test('timepicker option ink attributes the inherited token and unchanged candidate literal', () => {
  const raw = timepickerOptionInkReport(), copy = structuredClone(raw), report = buildMaterialInputAudit(raw);
  const ink = report.retainedTypography.differences.filter(d => d.attribution === 'reviewed-timepicker-option-ink-input');
  assert.equal(ink.length, 48);
  assert.equal(ink[0].classification, 'application-plugin-authoring-defect');
  assert.equal(ink[0].inputEquivalent, false);
  assert.equal(ink[0].finalRasterVerified, false);
  assert.deepEqual(ink[0].reviewEvidence.referenceChain.map(n => n.node), ['t0', 'o0']);
  assert.equal(ink[0].reviewEvidence.referenceRule.declarations.color.value, 'var(--mat-option-label-text-color, var(--mat-sys-on-surface))');
  assert.equal(ink[0].reviewEvidence.candidateRule.color, '#1d1b20');
  assert.equal(ink[0].values.reference, 'rgba(29,27,30,1)');
  for (const stage of ['normal', 'effective', 'retained']) assert.equal(ink[0].values[stage], 'rgba(29,27,32,1)');
  assert.equal(report.sourceFindings.find(f => f.id === 'fixture-timepicker-option-ink-substitution').detected, true);
  assert.ok(!validateMaterialInputAudit(report, { requireComplete: false }).some(e => e.includes('timepicker option')));
  assert.deepEqual(raw, copy);
});

test('timepicker option ink refuses competing rules incomplete provenance and changed stages', () => {
  const controls = [
    (r, a) => { r.rules[0].active = false; },
    (r, a) => { delete r.rules[0].active; },
    (r, a) => { r.rules[0].selector = '.other'; },
    (r, a) => { r.rules[0].conditions = ['@media (min-width:1px)']; },
    (r, a) => { r.rules[0].declarations.color.important = true; },
    (r, a) => { r.rules[0].declarations.color.value = '#1d1b1e'; },
    (r, a) => { r.rules[0].declarations.all = { value: 'initial' }; },
    (r, a) => { r.rules[0].declarations.transition = { value: 'color 1s' }; },
    (r, a) => { r.nodes.find(n => n.key === 't0').rules = [0]; },
    (r, a) => { r.nodes.find(n => n.key === 't0').inline.color = { value: '#1d1b1e' }; },
    (r, a) => { r.nodes.find(n => n.key === 'o0').inline.all = { value: 'unset' }; },
    (r, a) => { r.nodes.find(n => n.key === 't0').attributes.style = 'color: inherit'; },
    (r, a) => { r.nodes.find(n => n.key === 'o0').attributes.style = 'animation: ink 1s'; },
    (r, a) => { r.styles.push({ ...r.styles[0], color: '#000000' }); r.nodes.find(n => n.key === 'o0').style = 1; },
    (r, a) => { r.nodes.find(n => n.key === 'o0').style = 999; },
    (r, a) => { r.rules.push(structuredClone(r.rules[0])); r.nodes.find(n => n.key === 'o0').rules.push(1); },
    (r, a) => { a.rules[0].color = '#000000'; },
    (r, a) => { a.rules[0].selector = '.other'; },
    (r, a) => { a.rules[0].all = 'initial'; },
    (r, a) => { a.rules.push({ selector: '.picker-option', color: '#1d1b20' }); },
    (r, a) => { a.rules.push({ selector: '.field-shell .picker-option:hover', color: '#1d1b20' }); },
    (r, a) => { a.rules.push({ selector: '[role=option]', color: '#1d1b20' }); },
    (r, a) => { a.rules.push({ selector: '', color: '#1d1b20' }); },
    (r, a) => { a.rules.push({ selector: '.picker-option', transition: 'color 1s' }); },
    (r, a) => { a.nodes.find(n => n.key === 'o0').authored.style = { color: '#1d1b20' }; },
    (r, a) => { a.nodes.find(n => n.key === 'o0').authored.style = 'color:#1d1b20'; },
    (r, a) => { a.nodes.find(n => n.key === 'o0').authored.style = null; },
    ...['normalResolvedStyle', 'interactionResolvedStyle'].map(stage => (r, a) => {
      const node = a.nodes.find(n => n.key === 'o0'); node[stage] = { ...node[stage], color: '#000000' };
    }),
    (r, a) => { const node = a.nodes.find(n => n.key === 'o0'); node.retainedText = { ...node.retainedText, style: { ...node.retainedText.style, color: '#000000' } }; },
  ];
  for (const [index, mutate] of controls.entries()) {
    const raw = timepickerOptionInkReport(), trees = raw.results[0].inputTrees;
    mutate(trees.reference, trees.astylar);
    const cases = raw.results.map(e => ({ ...e, kind: 'static' }));
    const result = collectRetainedTypographyEvidence(cases, collectFullTreeInventory(cases));
    assert.ok(!result.differences.some(d => d.element === 'timepicker-option-0' && d.attribution === 'reviewed-timepicker-option-ink-input'), `control ${index}`);
  }
});

test('timepicker option ink excludes only irrelevant rules and does not assume a fixed reference token value', () => {
  for (const color of ['#1d1b1e', '#123456']) {
    const raw = timepickerOptionInkReport(), { reference: r, astylar: a } = raw.results[0].inputTrees;
    r.styles[0].color = color;
    r.rules.push({ selector: '.mat-mdc-option:hover', active: false, conditions: [], declarations: { color: { value: '#abcdef', important: false } } });
    r.nodes.find(n => n.key === 'o0').rules.push(1);
    a.rules.push({ selector: '.unrelated:hover', color: '#abcdef' }, { selector: '#page', color: '#abcdef' });
    const cases = raw.results.map(e => ({ ...e, kind: 'static' }));
    const result = collectRetainedTypographyEvidence(cases, collectFullTreeInventory(cases));
    assert.equal(result.differences.filter(d => d.attribution === 'reviewed-timepicker-option-ink-input').length, 48);
  }
});

test('timepicker option ink replay rejects fabricated classifications source and stage witnesses', () => {
  const original = buildMaterialInputAudit(timepickerOptionInkReport());
  for (const mutate of [
    (r, d) => { d.classification = 'confirmed-core-renderer-defect'; },
    (r, d) => { d.element = 'menu-rename-label'; d.case = 'static:menu@light/desktop'; },
    (r, d) => { d.inputEquivalent = true; },
    (r, d) => { d.finalRasterVerified = true; },
    (r, d) => { d.reviewEvidence.referenceRule.declarations.color.value = '#1d1b1e'; },
    (r, d) => { d.reviewEvidence.referenceChain.pop(); },
    (r, d) => { d.reviewEvidence.checkedCandidateRules = []; },
    (r, d) => { d.reviewEvidence.candidateEffective.color = '#1d1b1e'; },
    (r, d) => { d.reviewEvidence.sourceFinding = 'unknown'; },
  ]) {
    const report = structuredClone(original), d = report.retainedTypography.differences.find(d => d.attribution === 'reviewed-timepicker-option-ink-input');
    mutate(report, d);
    assert.ok(validateMaterialInputAudit(report, { requireComplete: false }).some(e => e.includes('timepicker option')));
  }
});

function retainedTypographyReport() {
  const typography = { fontFamily: 'Arial', fontSize: '24px', fontWeight: '400', fontStyle: 'normal',
    lineHeight: '32px', letterSpacing: '0px', wordSpacing: '0px', textAlign: 'left',
    textTransform: 'none', textDecoration: 'none', color: '#000000' };
  const declarations = { ...typography };
  delete declarations.fontSize;
  delete declarations.lineHeight;
  const raw = parityReport(typography, declarations);
  const entry = raw.results[0], input = entry.styleInputs[0];
  input.referenceStructure = { schemaVersion: 2, type: 'span', text: 'Inherited copy' };
  input.astylarStructure = { schemaVersion: 2, type: 'span', ownText: 'Inherited copy', text: 'Inherited copy' };
  input.astylarResolvedStyleEvidenceVersion = 2;
  entry.inputTrees = {
    reference: { schemaVersion: 1, styles: [typography], rules: [], errors: [], nodes: [
      { key: 'frame/0', parent: 'frame', type: 'span', attributes: { id: 'core-root' }, ownText: 'Inherited copy',
        style: 0, rules: [], pseudoElements: [] },
    ] },
    astylar: { schemaVersion: 1, resolvedStyleEvidenceVersion: 2, resolvedStyleSource: 'core-style-inspection',
      resolvedStyleRevision: 4, rules: [], errors: [], nodes: [
        { key: 'root/0', parent: 'root', authored: { id: 'core-root', type: 'span', textContent: 'Inherited copy' },
          resolvedStyle: declarations, normalResolvedStyle: declarations, interactionResolvedStyle: declarations,
          retainedText: { source: 'core-text-registry', style: typography } },
      ] },
  };
  return raw;
}

test('attributes inherited typography only to the demonstrated diagnostic-stage mismatch', () => {
  const report = buildMaterialInputAudit(retainedTypographyReport());
  assert.equal(report.retainedTypography.comparisons.length, 1);
  assert.deepEqual(report.retainedTypography.differences, []);
  assert.deepEqual(report.retainedTypography.gaps, []);
  for (const property of ['fontSize', 'lineHeight']) {
    const finding = report.discrepancies.find((entry) => entry.property === property);
    assert.equal(finding.classification, 'parity-harness-defect');
    assert.equal(finding.attribution, 'reviewed-stage-mismatch');
    assert.equal(finding.astylar, undefined, 'must not substitute the retained value into declarations');
    assert.equal(finding.reviewEvidence.source, 'core-text-registry');
    assert.equal(finding.reviewEvidence.values.retained, finding.reference);
  }
  const comparison = report.retainedTypography.comparisons[0];
  assert.equal(comparison.properties.fontSize.normal, undefined);
  assert.equal(comparison.properties.fontSize.retained, '24px');
  assert.equal(comparison.revision, 4);
  assert.equal(comparison.currentPseudoStatePaintVerified, false);
});

test('retained typography also exposes mismatches concealed by matching declarations', () => {
  const raw = retainedTypographyReport();
  const node = raw.results[0].inputTrees.astylar.nodes[0];
  node.retainedText.style = { ...node.retainedText.style, fontFamily: 'Arial, sans-serif', fontSize: '20px' };
  const report = buildMaterialInputAudit(raw);
  assert.deepEqual(report.retainedTypography.differences.map((entry) => entry.property), ['fontFamily', 'fontSize']);
  assert.ok(report.retainedTypography.differences.every((entry) => entry.attribution === 'unresolved'));
  assert.equal(report.discrepancies.find((entry) => entry.property === 'fontSize').attribution, 'unresolved');
  assert.ok(validateMaterialInputAudit(report).some((error) => error.includes('retained typography differences')));
});

test('typography stage attribution cannot waive interaction, mismapped, or explicit declaration differences', () => {
  const mutations = [
    (entry) => { entry.state = 'hover'; },
    (entry) => { entry.styleInputs[0].astylarResolvedStyleEvidenceVersion = 1; },
    (entry) => { entry.styleInputs[0].astylarStructure.ownText = 'Another copy'; },
    (entry) => { entry.styleInputs[0].astylar.fontSize = '18px'; },
  ];
  for (const mutate of mutations) {
    const raw = retainedTypographyReport();
    mutate(raw.results[0]);
    assert.notEqual(buildMaterialInputAudit(raw).discrepancies.find((entry) => entry.property === 'fontSize').attribution,
      'reviewed-stage-mismatch');
  }
});

test('retained typography rejects missing or ambiguous text mapping and untrusted stage provenance', () => {
  const mutations = [
    (entry) => { entry.inputTrees.astylar.resolvedStyleEvidenceVersion = 1; },
    (entry) => { entry.inputTrees.astylar.resolvedStyleSource = 'projected-mesh'; },
    (entry) => { delete entry.inputTrees.astylar.resolvedStyleRevision; },
    (entry) => { entry.inputTrees.astylar.nodes[0].retainedText.source = 'fixture-inheritance'; },
    (entry) => { delete entry.inputTrees.astylar.nodes[0].retainedText; },
    (entry) => { entry.inputTrees.astylar.nodes.push(entry.inputTrees.astylar.nodes[0]); },
    (entry) => { entry.inputTrees.reference.nodes[0].ownText = ''; },
    (entry) => { entry.inputTrees.reference.nodes[0].ownText = 'INHERITED COPY'; },
    (entry) => { delete entry.inputTrees.reference.nodes[0].attributes.id; },
    (entry) => { entry.inputTrees.astylar.errors.push('capture failed'); },
  ];
  for (const mutate of mutations) {
    const raw = retainedTypographyReport();
    mutate(raw.results[0]);
    const evidence = collectRetainedTypographyEvidence(raw.results, collectFullTreeInventory(raw.results));
    assert.equal(evidence.comparisons.length, 0);
    assert.ok(evidence.gaps.length > 0);
  }
});

test('retained typography retains missing property fields as gaps instead of accepting omitted defaults', () => {
  const raw = retainedTypographyReport();
  raw.results[0].inputTrees.astylar.nodes[0].retainedText.style = { fontSize: '24px' };
  const report = buildMaterialInputAudit(raw);
  assert.equal(report.retainedTypography.gaps.length, 10);
  assert.ok(validateMaterialInputAudit(report).some((error) => error.includes('retained typography mappings')));
  delete report.retainedTypography;
  assert.ok(validateMaterialInputAudit(report).includes('missing retained typography stage report'));
});

function inheritedComponentFontReport(direct = false) {
  const raw = retainedTypographyReport(), { reference: ref, astylar: ast } = raw.results[0].inputTrees;
  ref.styles = ref.styles.map(style => ({ ...style, fontFamily: 'Roboto' }));
  ref.rules = [{ active: true, selector: '.mat-mdc-card-title', declarations: {
    'font-family': { value: 'var(--mat-card-title-text-font, var(--mat-sys-title-large-font))' },
  } }, { active: true, selector: '.label', declarations: { 'font-family': { value: 'inherit' } } }];
  ref.nodes[0].rules = [direct ? 0 : 1];
  ref.nodes.push({ key: 'frame', parent: null, type: 'div', attributes: {}, ownText: '', style: 0,
    rules: [0], pseudoElements: [] });
  const stack = { fontFamily: 'Roboto, Arial, sans-serif' };
  ast.rules = [{ selector: '#page', ...stack }];
  const leaf = ast.nodes[0];
  leaf.parent = 'page-key';
  for (const field of ['normalResolvedStyle', 'interactionResolvedStyle', 'resolvedStyle']) {
    leaf[field] = { ...leaf[field] };
    delete leaf[field].fontFamily;
  }
  leaf.retainedText.style = { ...leaf.retainedText.style, ...stack };
  ast.nodes.push({ key: 'page-key', parent: 'root', authored: { id: 'page', type: 'main' },
    resolvedStyle: { ...stack }, normalResolvedStyle: { ...stack }, interactionResolvedStyle: { ...stack } });
  return raw;
}

test('retained font-stack attribution proves missing component input separately from core list rewriting', () => {
  for (const direct of [false, true]) {
    const raw = inheritedComponentFontReport(direct), before = structuredClone(raw);
    const report = buildMaterialInputAudit(raw);
    const findings = report.retainedTypography.differences.filter(d => d.attribution === 'reviewed-inherited-component-font-stack');
    assert.equal(findings.length, 1);
    const finding = findings[0];
    assert.equal(finding.classification, 'application-plugin-authoring-defect');
    assert.equal(finding.inputEquivalent, false);
    assert.equal(finding.currentPseudoStatePaintVerified, false);
    assert.deepEqual(finding.values, { reference: 'roboto', normal: undefined, effective: undefined, retained: 'roboto,arial,sans-serif' });
    assert.equal(finding.reviewEvidence.referenceChain.length, direct ? 1 : 2);
    assert.equal(finding.reviewEvidence.candidateChain.length, 2);
    assert.equal(finding.reviewEvidence.candidatePageRule.fontFamily, 'Roboto, Arial, sans-serif');
    assert.ok(report.sourceFindings.find(f => f.id === finding.reviewEvidence.sourceFinding)?.detected);
    assert.ok(!validateMaterialInputAudit(report, { requireComplete: false }).some(e => e.includes('font-stack attributions')));
    assert.equal(report.summary.inputEquivalent, false);
    assert.deepEqual(raw, before);
  }
});

test('component font attribution rejects ambiguous tokens, intervening declarations and unproven inheritance', () => {
  const mutations = [
    (ref) => { ref.rules[0].active = false; },
    (ref) => { ref.rules[0].selector = '.unrelated'; },
    (ref) => { ref.rules[0].declarations['font-family'].value = 'Roboto'; },
    (ref) => { ref.rules[0].declarations.font = { value: '14px Roboto' }; },
    (ref) => { ref.rules[1].declarations['font-family'].value = 'Arial'; },
    (ref) => { ref.nodes[1].rules.push(0); },
    (ref) => { ref.nodes[0].inline = { 'font-family': { value: 'Roboto' } }; },
    (ref) => { ref.nodes[0].attributes.style = 'font: 14px Roboto'; },
    (ref) => { ref.nodes[0].parent = 'missing'; },
    (ref) => { ref.nodes[0].parent = ref.nodes[0].key; },
    (ref) => { ref.nodes.push(structuredClone(ref.nodes[0])); },
    (_ref, ast) => { ast.nodes[0].normalResolvedStyle.fontFamily = 'Roboto'; },
    (_ref, ast) => { ast.nodes[0].interactionResolvedStyle.fontFamily = 'Roboto'; },
    (_ref, ast) => { ast.nodes[0].interactionResolvedStyle.font = '14px Roboto'; },
    (_ref, ast) => { ast.nodes[0].normalResolvedStyle = []; },
    (_ref, ast) => { ast.nodes[0].parent = 'missing'; },
    (_ref, ast) => { ast.nodes[0].parent = ast.nodes[0].key; },
    (_ref, ast) => { ast.nodes[1].authored.type = 'div'; },
    (_ref, ast) => { ast.nodes[1].normalResolvedStyle.fontFamily = 'Arial'; },
    (_ref, ast) => { ast.nodes[1].interactionResolvedStyle.fontFamily = 'Arial'; },
    (_ref, ast) => { ast.rules[0].fontFamily = 'Arial'; },
    (_ref, ast) => { ast.rules.push(structuredClone(ast.rules[0])); },
    (_ref, ast) => { ast.nodes[0].retainedText.style.fontFamily = 'Roboto, Arial, Helvetica, sans-serif'; },
  ];
  for (const mutate of mutations) {
    const raw = inheritedComponentFontReport();
    mutate(raw.results[0].inputTrees.reference, raw.results[0].inputTrees.astylar);
    const inventory = collectFullTreeInventory(raw.results);
    const section = collectRetainedTypographyEvidence(raw.results, inventory);
    assert.equal(section.differences.filter(d => d.attribution === 'reviewed-inherited-component-font-stack').length, 0, String(mutate));
  }
});

test('component font claims replay exact reference tokens, candidate inherited styles and attribution scope', () => {
  const baseline = buildMaterialInputAudit(inheritedComponentFontReport());
  const mutations = [
    (report, finding) => { finding.reviewEvidence.referenceChain.pop(); },
    (report, finding) => { finding.reviewEvidence.candidateChain.pop(); },
    (report, finding) => { finding.values.normal = 'roboto'; },
    (report, finding) => { finding.inputEquivalent = true; },
    (report, finding) => { finding.currentPseudoStatePaintVerified = true; },
    (report, finding) => { finding.classification = 'confirmed-core-renderer-defect'; },
    (report, finding) => { report.retainedTypography.differences.push(structuredClone(finding)); },
    report => { report.retainedTypography.differences = []; },
    report => { report.retainedTypography.comparisons[0].properties.fontFamily.retained = 'roboto'; },
    report => { report.elementInventory.rules.find(r => r.side === 'reference' && r.value.selector === '.mat-mdc-card-title').value.active = false; },
    report => { report.elementInventory.styles.find(s => s.side === 'astylar' && s.value.fontFamily === 'Roboto, Arial, sans-serif').value.fontFamily = 'Roboto'; },
  ];
  for (const mutate of mutations) {
    const report = structuredClone(baseline), finding = report.retainedTypography.differences.find(d => d.attribution === 'reviewed-inherited-component-font-stack');
    mutate(report, finding);
    assert.ok(validateMaterialInputAudit(report, { requireComplete: false }).some(e => e.includes('font-stack attributions')), String(mutate));
  }
});

function omittedComponentMetricReport(property = 'lineHeight', direct = false, kind = 'radio') {
  const raw = inheritedComponentFontReport(direct), { reference: ref, astylar: ast } = raw.results[0].inputTrees;
  const cssProperty = property === 'lineHeight' ? 'line-height' : 'letter-spacing';
  const suffix = property === 'lineHeight' ? 'line-height' : 'tracking';
  const selectors = {
    radio: ['.mat-mdc-radio-button .mat-internal-form-field', 'radio-label-text', 'body-medium'],
    checkbox: ['.mat-mdc-checkbox .mat-internal-form-field', 'checkbox-label-text', 'body-medium'],
    switch: ['.mat-mdc-slide-toggle .mat-internal-form-field', 'slide-toggle-label-text', 'body-medium'],
    list: ['.mdc-list-item__primary-text', 'list-list-item-label-text', 'body-large'],
    table: ['.mat-mdc-header-row', 'table-header-headline', 'title-small'],
    expansion: ['.mat-expansion-panel-header', 'expansion-header-text', 'title-medium'],
  };
  const [selector, component, system] = selectors[kind];
  ref.rules = [{ active: true, selector, declarations: { [cssProperty]: {
    value: `var(--mat-${component}-${suffix}, var(--mat-sys-${system}-${suffix}))`,
  } } }, { active: true, selector: '.label', declarations: { [cssProperty]: { value: 'inherit' } } }];
  ref.styles = ref.styles.map(style => ({ ...style, [property]: property === 'lineHeight' ? '20px' : '0.256px' }));
  for (const node of ast.nodes) {
    for (const field of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle']) delete node[field][property];
  }
  ast.nodes[0].retainedText.style[property] = property === 'lineHeight' ? 'normal' : '0px';
  return raw;
}

test('component text-metric omissions retain explicit reference tokens and complete candidate ancestry', () => {
  for (const property of ['lineHeight', 'letterSpacing']) {
    for (const kind of ['radio', 'checkbox', 'switch', 'list', 'table', 'expansion']) {
      for (const direct of [false, true]) {
        const raw = omittedComponentMetricReport(property, direct, kind), before = structuredClone(raw);
        const report = buildMaterialInputAudit(raw);
        const findings = report.retainedTypography.differences.filter(d => d.attribution === 'reviewed-omitted-component-text-metric');
        assert.equal(findings.length, 1, `${kind}/${property}/${direct}`);
        const finding = findings[0];
        assert.equal(finding.property, property);
        assert.equal(finding.classification, 'application-plugin-authoring-defect');
        assert.equal(finding.inputEquivalent, false);
        assert.equal(finding.currentPseudoStatePaintVerified, false);
        assert.equal(finding.reviewEvidence.referenceChain.length, direct ? 1 : 2);
        assert.equal(finding.reviewEvidence.candidateChain.length, 2);
        assert.deepEqual(finding.values, { reference: property === 'lineHeight' ? '20px' : '0.256px',
          normal: undefined, effective: undefined, retained: property === 'lineHeight' ? 'normal' : '0' });
        assert.ok(report.sourceFindings.find(f => f.id === finding.reviewEvidence.sourceFinding)?.detected);
        assert.ok(!validateMaterialInputAudit(report, { requireComplete: false }).some(e => e.includes('text-metric attributions')));
        assert.equal(report.summary.inputEquivalent, false);
        assert.deepEqual(raw, before);
      }
    }
  }
});

test('component metric attribution rejects overrides, ambiguous rules, missing ancestry and different retained values', () => {
  const mutations = [
    (ref) => { ref.rules[0].active = false; },
    (ref) => { ref.rules[0].selector = '.unrelated'; },
    (ref, _ast, css) => { ref.rules[0].declarations[css].value = '20px'; },
    (ref) => { ref.rules[0].declarations.font = { value: '14px Roboto' }; },
    (ref) => { ref.rules[1].declarations.all = { value: 'revert' }; },
    (ref, _ast, css) => { ref.rules[1].declarations[css].value = 'initial'; },
    (ref) => { ref.nodes[1].rules.push(0); },
    (ref, _ast, css) => { ref.nodes[0].inline = { [css]: { value: 'inherit' } }; },
    (ref, _ast, css) => { ref.nodes[0].attributes.style = `${css}: inherit`; },
    (ref) => { ref.nodes[0].parent = 'missing'; },
    (ref) => { ref.nodes[0].parent = ref.nodes[0].key; },
    (ref) => { ref.nodes.push(structuredClone(ref.nodes[1])); },
    (ref, _ast, _css, prop) => { ref.styles[0][prop] = 'normal'; },
    (_ref, ast, _css, prop) => { ast.nodes[0].normalResolvedStyle[prop] = 'inherit'; },
    (_ref, ast, _css, prop) => { ast.nodes[1].interactionResolvedStyle[prop] = '20px'; },
    (_ref, ast) => { ast.nodes[0].interactionResolvedStyle.font = '14px Roboto'; },
    (_ref, ast) => { ast.nodes[0].normalResolvedStyle = []; },
    (_ref, ast) => { ast.nodes[0].interactionResolvedStyle.all = 'revert'; },
    (_ref, ast) => { ast.nodes[0].parent = 'missing'; },
    (_ref, ast) => { ast.nodes[0].parent = ast.nodes[0].key; },
    (_ref, ast) => { ast.nodes[1].authored.type = 'div'; },
    (_ref, ast) => { ast.nodes.push(structuredClone(ast.nodes[1])); },
    (_ref, ast, _css, prop) => { ast.nodes[0].retainedText.style[prop] = '22px'; },
  ];
  for (const property of ['lineHeight', 'letterSpacing']) {
    for (const mutate of mutations) {
      const raw = omittedComponentMetricReport(property);
      mutate(raw.results[0].inputTrees.reference, raw.results[0].inputTrees.astylar,
        property === 'lineHeight' ? 'line-height' : 'letter-spacing', property);
      const evidence = collectRetainedTypographyEvidence(raw.results, collectFullTreeInventory(raw.results));
      assert.ok(!evidence.differences.some(d => d.attribution === 'reviewed-omitted-component-text-metric'), `${property}: ${mutate}`);
    }
  }
});

test('component metric claims replay raw token, omission and retained-stage evidence instead of trusting classification', () => {
  const mutations = [
    (_report, finding) => { finding.reviewEvidence.referenceChain.pop(); },
    (_report, finding) => { finding.reviewEvidence.candidateChain.pop(); },
    (_report, finding) => { finding.values.normal = 'normal'; },
    (_report, finding) => { finding.inputEquivalent = true; },
    (_report, finding) => { finding.currentPseudoStatePaintVerified = true; },
    (_report, finding) => { finding.classification = 'confirmed-core-renderer-defect'; },
    (report, finding) => { report.retainedTypography.differences.push(structuredClone(finding)); },
    report => { report.retainedTypography.differences = []; },
    (report, finding) => { report.retainedTypography.comparisons[0].properties[finding.property].retained = '22px'; },
    report => { report.elementInventory.rules.find(r => r.side === 'reference' && r.value.selector.includes('.mat-mdc-radio')).value.active = false; },
    (report, finding) => { const ast = report.elementInventory.variants.find(v => v.side === 'astylar').nodes[0];
      report.elementInventory.styles[ast.normalStyle].value[finding.property] = '20px'; },
  ];
  for (const property of ['lineHeight', 'letterSpacing']) {
    const baseline = buildMaterialInputAudit(omittedComponentMetricReport(property));
    for (const mutate of mutations) {
      const report = structuredClone(baseline);
      mutate(report, report.retainedTypography.differences.find(d => d.attribution === 'reviewed-omitted-component-text-metric'));
      assert.ok(validateMaterialInputAudit(report, { requireComplete: false }).some(e => e.includes('text-metric attributions')), `${property}: ${mutate}`);
    }
  }
});

function componentFontVariant(kind) {
  const raw = inheritedComponentFontReport(), ref = raw.results[0].inputTrees.reference;
  const rules = {
    'mdc-list': ['.mdc-list-item__primary-text', 'var(--mat-list-list-item-label-text-font, var(--mat-sys-body-large-font))'],
    'mdc-field': ['.mdc-text-field--filled .mdc-floating-label', 'var(--mat-form-field-filled-label-text-font, var(--mat-sys-body-large-font))'],
    'table-header': ['.mat-mdc-header-row', 'var(--mat-table-header-headline-font, var(--mat-sys-title-small-font, Roboto, sans-serif))'],
    'table-row': ['.mat-mdc-row, .mdc-data-table__content', 'var(--mat-table-row-item-label-text-font, var(--mat-sys-body-medium-font, Roboto, sans-serif))'],
    toggle: ['.mat-button-toggle-appearance-standard', 'var(--mat-button-toggle-label-text-font, var(--mat-sys-label-large-font))'],
  };
  const [selector, value] = rules[kind];
  ref.rules[0] = { active: true, selector, source: 'sheet:4/23', conditions: [], declarations: { 'font-family': { value, important: false } } };
  if (kind === 'toggle') {
    ref.rules.push({ active: true, selector: '.mat-button-toggle', source: 'sheet:4/9', conditions: [],
      declarations: { 'font-family': { value: 'var(--mat-button-toggle-legacy-label-text-font)', important: false } } });
    ref.nodes[1].type = 'mat-button-toggle';
    ref.nodes[1].attributes.class = 'mat-button-toggle mat-button-toggle-appearance-standard';
    ref.nodes[1].rules = [2, 0];
  }
  return raw;
}

test('font attribution recognizes captured MDC rules, nested table fallback tokens and the guarded standard toggle cascade', () => {
  for (const kind of ['mdc-list', 'mdc-field', 'table-header', 'table-row', 'toggle']) {
    const raw = componentFontVariant(kind), before = structuredClone(raw);
    const section = collectRetainedTypographyEvidence(raw.results, collectFullTreeInventory(raw.results));
    const findings = section.differences.filter(d => d.attribution === 'reviewed-inherited-component-font-stack');
    assert.equal(findings.length, 1, kind);
    assert.deepEqual(findings[0].reviewEvidence.referenceRule, raw.results[0].inputTrees.reference.rules[0]);
    assert.equal(findings[0].reviewEvidence.referenceChain.at(-1).fontRules.length, kind === 'toggle' ? 2 : 1);
    assert.equal(findings[0].classification, 'application-plugin-authoring-defect');
    assert.deepEqual(raw, before);
  }
});

test('toggle font winner is not guessed across importance, layers, specificity, unknown order or extra declarations', () => {
  const mutations = [
    ref => { ref.rules[2].source = 'sheet:4/24'; },
    ref => { ref.rules[2].source = 'sheet:4/23'; },
    ref => { ref.rules[2].source = 'sheet:5/9'; },
    ref => { ref.rules[2].source = 'sheet:4/8/0'; },
    ref => { ref.rules[0].source = 'sheet:4/25/0'; },
    ref => { ref.rules[0].source = 'sheet:4/999999999999999999999999'; },
    ref => { delete ref.rules[0].source; },
    ref => { ref.rules[2].declarations['font-family'].important = true; },
    ref => { ref.rules[0].declarations['font-family'].important = true; },
    ref => { delete ref.rules[2].declarations['font-family'].important; },
    ref => { delete ref.rules[0].conditions; },
    ref => { ref.rules[2].conditions = ['(min-width: 1px)']; },
    ref => { ref.rules[0].selector += '.extra-specificity'; },
    ref => { ref.rules[2].declarations['font-family'].value = 'Arial'; },
    ref => { ref.rules[0].declarations['font-family'].value = 'var(--other-font)'; },
    ref => { ref.nodes[1].type = 'div'; },
    ref => { ref.nodes[1].attributes.class = 'mat-button-toggle'; },
    ref => { ref.nodes[1].rules.push(0); },
    ref => { ref.rules[2].declarations.font = { value: '14px Arial' }; },
  ];
  for (const mutate of mutations) {
    const raw = componentFontVariant('toggle');
    mutate(raw.results[0].inputTrees.reference);
    const section = collectRetainedTypographyEvidence(raw.results, collectFullTreeInventory(raw.results));
    assert.ok(!section.differences.some(d => d.attribution === 'reviewed-inherited-component-font-stack'), String(mutate));
  }
  for (const kind of ['mdc-list', 'mdc-field', 'table-header', 'table-row']) {
    for (const mutate of [
      ref => { ref.rules[0].declarations['font-family'].value = undefined; },
      ref => { ref.styles[0].fontFamily = 'Roboto, sans-serif'; },
      ref => { ref.rules[0].selector = '.unreviewed-mdc-label'; },
    ]) {
      const raw = componentFontVariant(kind);
      mutate(raw.results[0].inputTrees.reference);
      const section = collectRetainedTypographyEvidence(raw.results, collectFullTreeInventory(raw.results));
      assert.ok(!section.differences.some(d => d.attribution === 'reviewed-inherited-component-font-stack'), `${kind}: ${mutate}`);
    }
  }
});

test('toggle font cascade review replays both competing declarations and their actual provenance', () => {
  const baseline = buildMaterialInputAudit(componentFontVariant('toggle'));
  assert.ok(!validateMaterialInputAudit(baseline, { requireComplete: false }).some(e => e.includes('font-stack attributions')));
  for (const mutate of [
    report => { report.elementInventory.rules.find(r => r.value.selector === '.mat-button-toggle').value.source = 'sheet:4/24'; },
    report => { report.elementInventory.rules.find(r => r.value.selector === '.mat-button-toggle').value.declarations['font-family'].important = true; },
    report => { report.retainedTypography.differences.find(d => d.attribution === 'reviewed-inherited-component-font-stack').reviewEvidence.referenceChain.at(-1).fontRules.shift(); },
  ]) {
    const report = structuredClone(baseline);
    mutate(report);
    assert.ok(validateMaterialInputAudit(report, { requireComplete: false }).some(e => e.includes('font-stack attributions')), String(mutate));
  }
});

function hiddenRetainedTypographyReport(referenceMechanism = 'display-none') {
  const raw = retainedTypographyReport();
  const { reference, astylar } = raw.results[0].inputTrees;
  reference.styles = [
    { ...reference.styles[0], display: 'inline', visibility: referenceMechanism === 'leaf-hidden' ? 'hidden' : 'visible' },
    { display: referenceMechanism === 'display-none' ? 'none' : 'block', visibility: 'visible' },
  ];
  reference.nodes.unshift({ key: 'frame', parent: null, type: 'main', attributes: {}, ownText: '', style: 1, rules: [], pseudoElements: [] });
  const leaf = astylar.nodes[0];
  leaf.parent = 'root/page';
  for (const stage of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle']) leaf[stage] = { ...leaf[stage], display: 'inline' };
  delete leaf.retainedText;
  astylar.nodes.unshift({ key: 'root', parent: null, authored: {} }, {
    key: 'root/page', parent: 'root', authored: { type: 'main', id: 'page' },
    resolvedStyle: { display: 'none' }, normalResolvedStyle: { display: 'none' }, interactionResolvedStyle: { display: 'none' },
  });
  // Use distinct node keys, just as the real tree does.
  leaf.key = 'root/page/label';
  return raw;
}

test('hidden retained-text attribution preserves complete declaration chains and does not claim input equivalence', () => {
  for (const mechanism of ['display-none', 'leaf-hidden']) {
    const raw = hiddenRetainedTypographyReport(mechanism), before = JSON.stringify(raw);
    const report = buildMaterialInputAudit(raw), [gap] = report.retainedTypography.gaps;
    assert.equal(report.retainedTypography.gaps.length, 1, 'the original gap record is not deleted');
    assert.equal(gap.attribution, 'reviewed-display-none-text-stage');
    assert.equal(gap.inputEquivalent, false);
    assert.equal(gap.reviewEvidence.inputEquivalent, false);
    assert.equal(gap.reviewEvidence.referenceChain.length, 2);
    assert.equal(gap.reviewEvidence.candidateChain.length, 2);
    assert.deepEqual(gap.reviewEvidence.candidateDisplayNoneNodes, ['root/page']);
    assert.equal(gap.reviewEvidence.referenceMechanism, mechanism === 'display-none' ? mechanism : 'computed-leaf-visibility-hidden');
    assert.equal(gap.reviewEvidence.referenceChain[0].computed.fontSize, '24px');
    assert.equal(gap.reviewEvidence.candidateChain[0].normal.fontSize, undefined);
    assert.equal(report.summary.inputEquivalent, false);
    assert.ok(!validateMaterialInputAudit(report).some((error) => /retained typography mappings|hidden retained-text/.test(error)));
    assert.equal(JSON.stringify(raw), before);
  }
});

test('hidden retained-text attribution rejects visible text, visibility overrides, opacity and incomplete current state', () => {
  const mutations = [
    (r, a) => { r.styles[1].display = 'block'; },
    (r, a) => { r.styles[1].display = 'block'; r.styles[1].visibility = 'hidden'; },
    (r, a) => { r.styles[1].display = 'block'; r.styles[0].opacity = '0'; },
    (r, a) => { a.nodes[1].normalResolvedStyle.display = 'block'; },
    (r, a) => { a.nodes[1].interactionResolvedStyle.display = 'block'; },
    (r, a) => { a.nodes[1].normalResolvedStyle = { visibility: 'hidden', opacity: '0' }; a.nodes[1].interactionResolvedStyle = { ...a.nodes[1].normalResolvedStyle }; },
    (r, a) => { a.resolvedStyleSource = 'mesh'; },
    (r, a) => { a.resolvedStyleEvidenceVersion = 1; },
    (r, a) => { delete a.resolvedStyleRevision; },
    (r, a) => { a.resolvedStyleRevision = -1; },
    (r, a) => { delete r.styles[0].display; },
    (r, a) => { delete r.styles[1].visibility; },
    (r, a) => { a.nodes[2].authored.textContent = 'Other text'; },
    (r, a) => { a.nodes[2].retainedText = { source: 'not-core', style: {} }; },
  ];
  for (const mutate of mutations) {
    const raw = hiddenRetainedTypographyReport(), { reference, astylar } = raw.results[0].inputTrees;
    mutate(reference, astylar);
    const gaps = buildMaterialInputAudit(raw).retainedTypography.gaps;
    assert.ok(gaps.length > 0);
    assert.ok(gaps.every((gap) => gap.attribution === 'unresolved'));
  }
});

test('hidden retained-text attribution requires unique complete ancestry to the captured surface roots', () => {
  const mutations = [
    (r, a) => { r.nodes.shift(); },
    (r, a) => { r.nodes.push(structuredClone(r.nodes[0])); },
    (r, a) => { r.nodes[0].parent = r.nodes[1].key; },
    (r, a) => { r.nodes[1].parent = 'missing'; },
    (r, a) => { a.nodes[2].parent = a.nodes[2].key; },
    (r, a) => { a.nodes.push(structuredClone(a.nodes[1])); },
    (r, a) => { a.nodes.shift(); },
    (r, a) => { a.nodes[0].authored = { type: 'div' }; },
    (r, a) => { a.nodes[1].parent = 'missing'; },
    (r, a) => { delete a.nodes[2].interactionResolvedStyle; },
    (r, a) => { a.nodes[2].interactionResolvedStyle = {}; },
  ];
  for (const mutate of mutations) {
    const raw = hiddenRetainedTypographyReport(), { reference, astylar } = raw.results[0].inputTrees;
    mutate(reference, astylar);
    const gaps = buildMaterialInputAudit(raw).retainedTypography.gaps;
    assert.ok(gaps.length > 0);
    assert.ok(gaps.every((gap) => gap.attribution === 'unresolved'));
  }
});

test('hidden retained-text evidence is recomputed during validation and cannot waive a tampered gap', () => {
  const original = buildMaterialInputAudit(hiddenRetainedTypographyReport());
  const mutations = [
    (report, gap) => { gap.inputEquivalent = true; },
    (report, gap) => { gap.reviewEvidence.candidateChain[0].normal.fontSize = '24px'; },
    (report, gap) => { gap.reviewEvidence.referenceMechanism = 'equivalent'; },
    (report, gap) => { gap.reviewEvidence.revision++; },
    (report, gap) => { gap.referenceNode = 'unrelated'; },
    (report, gap) => { gap.family = 'expansion'; },
    (report, gap) => { report.elementInventory.cases.push(structuredClone(report.elementInventory.cases[0])); },
    (report, gap) => { const tree = report.elementInventory.variants.find((t) => t.side === 'astylar');
      report.elementInventory.styles[tree.nodes[1].interactionStyle].value.display = 'block'; },
  ];
  for (const [index, mutate] of mutations.entries()) {
    const report = structuredClone(original), gap = report.retainedTypography.gaps[0];
    mutate(report, gap);
    assert.ok(validateMaterialInputAudit(report, { requireComplete: false }).some((error) => error.includes('hidden retained-text stage attributions')), `mutation ${index}`);
    assert.ok(validateMaterialInputAudit(report).some((error) => error.includes('retained typography mappings')));
  }
});

function templateTypographyReport(family) {
  const raw = retainedTypographyReport();
  const entry = raw.results[0];
  entry.family = family;
  entry.styleInputs = [];
  const { reference, astylar } = entry.inputTrees;
  const style = { ...reference.styles[0] };
  reference.nodes = [];
  astylar.nodes = [];
  const add = (side, key, parent, type, id, className, text) => {
    if (side === 'reference') reference.nodes.push({ key, parent, type,
      attributes: { ...(id ? { id } : {}), ...(className ? { class: className } : {}) },
      ownText: text ?? '', style: 0, rules: [], pseudoElements: [] });
    else astylar.nodes.push({ key, parent, authored: { type, id, class: className, ...(text ? { textContent: text } : {}) },
      resolvedStyle: style, normalResolvedStyle: style, interactionResolvedStyle: style,
      ...(text ? { retainedText: { source: 'core-text-registry', style: { ...style, fontSize: '99px' } } } : {}) });
  };
  if (family === 'tree') {
    add('reference', 'r', null, 'mat-tree', 'tree-primary', 'mat-tree');
    add('astylar', 'a', 'root', 'div', 'tree-primary', 'material-tree');
    for (const [index, text] of ['Documents', 'Projects', 'Archive'].entries()) {
      add('reference', `r/${index}`, 'r', 'mat-tree-node', `tree-item-${index}`, 'mat-tree-node', text);
      add('astylar', `a/${index}`, 'a', 'div', `tree-item-${index}`, 'tree-item');
      add('astylar', `a/${index}/0`, `a/${index}`, 'span', `tree-item-${index}-label`, 'tree-label', text);
    }
  } else if (family === 'grid-list') {
    add('reference', 'r', null, 'mat-grid-list', 'grid-list-primary', 'mat-grid-list');
    add('reference', 'r/w', 'r', 'div');
    add('astylar', 'a', 'root', 'div', 'grid-list-primary', 'grid-list');
    for (const [name, text] of [['one', 'One'], ['two', 'Two']]) {
      add('reference', `r/w/${name}`, 'r/w', 'mat-grid-tile', `grid-tile-${name}`, 'mat-grid-tile');
      add('reference', `r/w/${name}/0`, `r/w/${name}`, 'div', undefined, 'mat-grid-tile-content', text);
      add('astylar', `a/${name}`, 'a', 'div', `grid-tile-${name}`, 'grid-tile');
      add('astylar', `a/${name}/0`, `a/${name}`, 'span', `grid-tile-${name}-label`, 'grid-tile-label', text);
    }
  } else if (family === 'badge') {
    add('reference', 'r', null, 'span', 'badge-primary', 'mat-badge');
    add('reference', 'r/0', 'r', 'span', 'mat-badge-content-472', 'mat-badge-content', '4');
    add('astylar', 'a', 'root', 'span', 'badge-primary', 'badge-anchor');
    add('astylar', 'a/0', 'a', 'span', 'badge-count', 'badge-bubble', '4');
  } else if (family === 'sort') {
    add('reference', 'r', null, 'div', 'sort-primary', 'mat-sort');
    add('reference', 'r/t', 'r', 'div', 'sort-trigger', 'mat-sort-header');
    add('reference', 'r/t/w', 'r/t', 'div', undefined, 'mat-sort-header-container');
    add('reference', 'r/t/w/0', 'r/t/w', 'div', undefined, 'mat-sort-header-content', 'Sort by name');
    add('astylar', 'a', 'root', 'div', 'sort-primary', 'sort-header');
    add('astylar', 'a/t', 'a', 'div', 'sort-trigger', 'sort-trigger');
    add('astylar', 'a/t/0', 'a/t', 'span', 'sort-label', undefined, 'Sort by name');
  } else if (family === 'expansion') {
    add('reference', 'r', null, 'mat-expansion-panel', 'expansion-primary', 'mat-expansion-panel');
    add('reference', 'r/w', 'r', 'div', undefined, 'mat-expansion-panel-content-wrapper');
    add('reference', 'r/w/c', 'r/w', 'div', 'cdk-accordion-child-93', 'mat-expansion-panel-content');
    add('reference', 'r/w/c/b', 'r/w/c', 'div', undefined, 'mat-expansion-panel-body');
    add('reference', 'r/w/c/b/0', 'r/w/c/b', 'p', 'expansion-content', undefined, 'Additional options.');
    add('astylar', 'a', 'root', 'article', 'expansion-shell', 'expansion-panel');
    add('astylar', 'a/c', 'a', 'p', 'expansion-content');
    add('astylar', 'a/c/0', 'a/c', 'span', 'expansion-content-label', 'expansion-content-label', 'Additional options.');
  } else if (family === 'sidenav') {
    add('reference', 'r', null, 'mat-sidenav-container', 'sidenav-primary', 'mat-sidenav-container');
    add('reference', 'r/n', 'r', 'mat-sidenav', 'sidenav-nav', 'mat-sidenav');
    add('reference', 'r/n/0', 'r/n', 'div', undefined, 'mat-drawer-inner-container', 'Navigation');
    add('astylar', 'a', 'root', 'div', 'sidenav-primary', 'sidenav-container');
    add('astylar', 'a/n', 'a', 'aside', 'sidenav-nav', 'sidenav', 'Navigation');
  } else if (family === 'button-toggle') {
    add('reference', 'r', null, 'mat-button-toggle-group', 'button-toggle-primary', 'mat-button-toggle-group');
    add('astylar', 'a', 'root', 'div', 'button-toggle-primary');
    for (const [name, text] of [['one', 'List'], ['two', 'Grid']]) {
      add('reference', `r/${name}`, 'r', 'mat-button-toggle', `button-toggle-${name}`, 'mat-button-toggle');
      add('reference', `r/${name}/b`, `r/${name}`, 'button', `button-toggle-${name}-button`, 'mat-button-toggle-button');
      add('reference', `r/${name}/b/0`, `r/${name}/b`, 'span', undefined, 'mat-button-toggle-label-content', text);
      add('astylar', `a/${name}`, 'a', 'div', `button-toggle-${name}`, 'button-toggle-option');
      add('astylar', `a/${name}/0`, `a/${name}`, 'span', `button-toggle-${name}-label`, undefined, text);
    }
  } else if (family === 'chips') {
    add('reference', 'r', null, 'mat-chip-listbox', 'chips-primary', 'mat-mdc-chip-listbox');
    add('reference', 'r/w', 'r', 'div', undefined, 'mdc-evolution-chip-set__chips');
    add('astylar', 'a', 'root', 'div', 'chips-primary', 'row');
    for (const [index, text] of ['Angular', 'Astylar'].entries()) {
      add('reference', `r/w/${index}`, 'r/w', 'mat-chip-option', `chip-${index}`, 'mat-mdc-chip-option');
      add('reference', `r/w/${index}/c`, `r/w/${index}`, 'span', undefined, 'mdc-evolution-chip__cell--primary');
      add('reference', `r/w/${index}/c/b`, `r/w/${index}/c`, 'button', undefined, 'mdc-evolution-chip__action--primary');
      add('reference', `r/w/${index}/c/b/0`, `r/w/${index}/c/b`, 'span', undefined, 'mdc-evolution-chip__text-label', text);
      add('reference', `r/w/${index}/c/b/0/f`, `r/w/${index}/c/b/0`, 'span', undefined, 'mat-mdc-chip-primary-focus-indicator mat-focus-indicator');
      add('astylar', `a/${index}`, 'a', 'div', `chip-${index}`, 'chip');
      add('astylar', `a/${index}/0`, `a/${index}`, 'span', `chip-${index}-label`, 'chip-label', text);
    }
  } else if (family === 'paginator') {
    add('reference', 'r', null, 'mat-paginator', 'paginator-primary', 'mat-mdc-paginator');
    add('reference', 'r/w', 'r', 'div', undefined, 'mat-mdc-paginator-outer-container');
    add('reference', 'r/w/c', 'r/w', 'div', undefined, 'mat-mdc-paginator-container');
    add('reference', 'r/w/c/p', 'r/w/c', 'div', undefined, 'mat-mdc-paginator-page-size');
    add('reference', 'r/w/c/p/0', 'r/w/c/p', 'div', 'mat-paginator-page-size-label-73', 'mat-mdc-paginator-page-size-label', ' Items per page: ');
    add('reference', 'r/w/c/p/1', 'r/w/c/p', 'div', undefined, 'mat-mdc-paginator-page-size-value', '10');
    add('reference', 'r/w/c/r', 'r/w/c', 'div', undefined, 'mat-mdc-paginator-range-actions');
    add('reference', 'r/w/c/r/0', 'r/w/c/r', 'div', undefined, 'mat-mdc-paginator-range-label', ' 1 – 10 of 100 ');
    add('astylar', 'a', 'root', 'div', 'paginator-primary', 'paginator');
    add('astylar', 'a/c', 'a', 'div', 'paginator-container', 'paginator-container');
    add('astylar', 'a/c/p', 'a/c', 'div', 'paginator-page-size-group', 'paginator-page-size');
    add('astylar', 'a/c/p/0', 'a/c/p', 'span', 'paginator-size', undefined, 'Items per page:');
    add('astylar', 'a/c/p/1', 'a/c/p', 'span', 'paginator-page-size', undefined, '10');
    add('astylar', 'a/c/r', 'a/c', 'div', 'paginator-range-actions', 'paginator-range-actions');
    add('astylar', 'a/c/r/0', 'a/c/r', 'span', 'paginator-range', undefined, '1 – 10 of 100');
  } else if (family === 'select') {
    add('reference', 'r', null, 'mat-form-field', 'select-primary', 'mat-mdc-form-field');
    add('reference', 'r/w', 'r', 'div', undefined, 'mat-mdc-text-field-wrapper');
    add('reference', 'r/w/f', 'r/w', 'div', undefined, 'mat-mdc-form-field-flex');
    add('reference', 'r/w/f/i', 'r/w/f', 'div', undefined, 'mat-mdc-form-field-infix');
    add('reference', 'r/w/f/i/s', 'r/w/f/i', 'mat-select', 'select-control', 'mat-mdc-select');
    reference.nodes.at(-1).attributes.role = 'combobox';
    add('reference', 'r/w/f/i/s/t', 'r/w/f/i/s', 'div', undefined, 'mat-mdc-select-trigger');
    add('reference', 'r/w/f/i/s/t/v', 'r/w/f/i/s/t', 'div', 'mat-select-value-93', 'mat-mdc-select-value');
    add('reference', 'r/w/f/i/s/t/v/t', 'r/w/f/i/s/t/v', 'span', undefined, 'mat-mdc-select-value-text');
    add('reference', 'r/w/f/i/s/t/v/t/l', 'r/w/f/i/s/t/v/t', 'span', undefined, 'mat-mdc-select-min-line', 'Team');
    add('astylar', 'a', 'root', 'div', 'select-primary', 'field-shell');
    add('astylar', 'a/i', 'a', 'div', 'select-input-region', 'field-input-region');
    add('astylar', 'a/i/v', 'a/i', 'span', 'select-value', 'select-value', 'Team');
  } else if (family === 'stepper') {
    add('reference', 'r', null, 'mat-stepper', 'stepper-primary', 'mat-stepper-horizontal');
    add('reference', 'r/w', 'r', 'div', undefined, 'mat-horizontal-stepper-wrapper');
    add('reference', 'r/w/h', 'r/w', 'div', undefined, 'mat-horizontal-stepper-header-container');
    add('astylar', 'a', 'root', 'div', 'stepper-primary', 'stepper');
    add('astylar', 'a/h', 'a', 'div', 'stepper-head', 'stepper-head');
    for (const [index, name] of ['details', 'review'].entries()) {
      add('reference', `r/w/h/${index}`, 'r/w/h', 'mat-step-header', `cdk-stepper-38-label-${index}`, 'mat-step-header');
      add('reference', `r/w/h/${index}/i`, `r/w/h/${index}`, 'div', undefined, 'mat-step-icon-state-number');
      add('reference', `r/w/h/${index}/i/c`, `r/w/h/${index}/i`, 'div', undefined, 'mat-step-icon-content');
      add('reference', `r/w/h/${index}/i/c/0`, `r/w/h/${index}/i/c`, 'span', undefined, undefined, String(index + 1));
      add('astylar', `a/h/${index}`, 'a/h', 'div', `step-${name}`, 'step-tab');
      add('astylar', `a/h/${index}/0`, `a/h/${index}`, 'span', `step-${name}-badge`, 'step-badge', String(index + 1));
    }
    add('reference', 'r/w/c', 'r/w', 'div', undefined, 'mat-horizontal-content-container');
    add('reference', 'r/w/c/0', 'r/w/c', 'div', 'cdk-stepper-38-content-0', 'mat-horizontal-stepper-content-current');
    add('reference', 'r/w/c/0/0', 'r/w/c/0', 'span', undefined, undefined, 'Project details');
    reference.nodes.at(-1).attributes['data-parity-id'] = 'stepper-content';
    add('astylar', 'a/c', 'a', 'div', 'stepper-content-container', 'stepper-content-container');
    add('astylar', 'a/c/0', 'a/c', 'span', 'stepper-content', undefined, 'Project details');
  }
  return raw;
}

function omittedStepperPanelReport(selected = true) {
  const raw = templateTypographyReport('stepper'), { reference, astylar } = raw.results[0].inputTrees;
  const panel = reference.nodes.find((node) => node.key === 'r/w/c/0');
  panel.attributes.id = `cdk-stepper-38-content-${selected ? 0 : 1}`;
  panel.attributes.role = 'tabpanel';
  reference.nodes.at(-1).ownText = selected ? 'Project details' : 'Review changes';
  astylar.nodes.at(-1).authored.textContent = reference.nodes.at(-1).ownText;
  astylar.nodes.at(-1).authored.role = 'tabpanel';
  reference.styles.push({ ...reference.styles[0], display: 'block', visibility: 'hidden', height: '0px', transform: 'matrix(1, 0, 0, 1, 672, 0)' });
  reference.nodes.push({ key: 'r/w/c/inactive', parent: 'r/w/c', type: 'div', attributes: {
    id: `cdk-stepper-38-content-${selected ? 1 : 0}`, role: 'tabpanel', inert: '',
    class: `mat-horizontal-stepper-content mat-horizontal-stepper-content-${selected ? 'next' : 'previous'}`,
  }, ownText: '', style: 1, rules: [], pseudoElements: [] }, {
    key: 'r/w/c/inactive/0', parent: 'r/w/c/inactive', type: 'span', attributes: { 'data-parity-id': 'stepper-content' },
    ownText: selected ? 'Review changes' : 'Project details', style: 1, rules: [], pseudoElements: [],
  });
  return raw;
}

function stepperTextInputReport(fontSize = '16px', pageColor = '#1d1b20') {
  const raw = stepperNumberAlignmentReport(), { reference: r, astylar: a } = raw.results[0].inputTrees;
  r.styles[0].fontSize = r.styles[1].fontSize = fontSize;
  r.styles.push({ ...r.styles[0], fontSize: '14px', color: '#49454e' });
  r.rules.push({ selector: '.frame[_ngcontent-test]', active: true, conditions: [],
    declarations: { 'font-size': { value: 'calc(16px * var(--scale))', important: false } } });
  const frame = r.nodes.find(n => n.key === 'frame');
  frame.rules = [1];
  frame.inline = { '--scale': { value: String(Number.parseFloat(fontSize) / 16), important: false } };
  for (const [selector, value] of [
    ['.mat-step-label', 'var(--mat-stepper-header-label-text-color, var(--mat-sys-on-surface-variant))'],
    ['.mat-step-label.mat-step-label-active', 'var(--mat-stepper-header-selected-state-label-text-color, var(--mat-sys-on-surface-variant))'],
  ]) r.rules.push({ selector, active: true, conditions: [], declarations: { color: { value, important: false } } });
  for (const [index, name] of ['details', 'review'].entries()) {
    const base = `r/w/h/${index}/l`, text = index ? 'Review' : 'Details';
    for (const [key, parent, type, attributes, ownText, rules] of [
      [base, `r/w/h/${index}`, 'div', { class: 'mat-step-label mat-step-label-active' }, '', [2, 3]],
      [`${base}/w`, base, 'div', { class: 'mat-step-text-label' }, '', []],
      [`${base}/w/0`, `${base}/w`, 'span', { id: `step-${name}-text` }, text, []],
    ]) r.nodes.push({ key, parent, type, attributes, ownText, rules, style: 2, pseudoElements: [] });
    a.nodes.push({ key: `a/h/${index}/1`, parent: `a/h/${index}`, authored: { type: 'span', id: `step-${name}-text`, class: 'step-text', textContent: text },
      retainedText: { source: 'core-text-registry', style: { color: pageColor, fontSize: '14px' } } });
  }
  a.nodes[0].parent = 'page';
  a.nodes.push({ key: 'page', parent: 'root', authored: { type: 'main', id: 'page' } });
  a.rules[0].fontSize = '14px';
  a.rules.push({ selector: '#page', color: pageColor, fontSize });
  for (const n of a.nodes) {
    n.normalResolvedStyle = n.authored.class === 'step-badge' ? { width: '24px', height: '24px', textAlign: 'center', fontSize: '14px' }
      : n.authored.id === 'page' ? { color: pageColor, fontSize } : {};
    n.interactionResolvedStyle = { ...n.normalResolvedStyle };
    n.resolvedStyle = { ...n.normalResolvedStyle };
    if (n.authored.class === 'step-badge') n.retainedText.style.fontSize = '14px';
  }
  return raw;
}

test('stepper typography retains frame font inheritance and omitted component color as unequal inputs', () => {
  for (const [fontSize, pageColor] of [['16px', '#1d1b20'], ['14.4px', '#1d1b20'], ['18.4px', '#1d1b20'], ['16px', '#e6e1e5']]) {
    const raw = stepperTextInputReport(fontSize, pageColor), before = structuredClone(raw), report = buildMaterialInputAudit(raw);
    const findings = report.retainedTypography.differences.filter(d => d.attribution === 'reviewed-stepper-text-input');
    assert.equal(findings.length, 4);
    for (const f of findings) {
      assert.equal(f.inputEquivalent, false);
      assert.equal(f.currentPseudoStatePaintVerified, false);
      assert.equal(f.classification, 'application-plugin-authoring-defect');
      assert.ok(report.sourceFindings.find(s => s.id === f.reviewEvidence.sourceFinding)?.detected);
      if (f.property === 'fontSize') {
        assert.deepEqual(f.values, { reference: fontSize, normal: '14px', effective: '14px', retained: '14px' });
        assert.equal(f.reviewEvidence.referenceChain.at(-1).node, 'frame');
      } else {
        assert.equal(f.values.normal, undefined);
        assert.equal(f.values.effective, undefined);
        assert.equal(f.reviewEvidence.candidateChain.at(-1).node, 'page');
        assert.equal(f.reviewEvidence.referenceChain.at(-1).propertyRules.length, 2);
      }
    }
    assert.ok(!validateMaterialInputAudit(report, { requireComplete: false }).some(e => e.includes('stepper typography')));
    assert.deepEqual(raw, before);
  }
});

test('stepper typography attribution rejects altered inheritance, tokens and explicit overrides', () => {
  const mutations = [
    ['fontSize', r => { r.nodes[0].parent = 'missing'; }],
    ['fontSize', r => { r.nodes[0].parent = r.nodes[0].key; }],
    ['fontSize', r => { r.nodes.find(n => n.key === 'frame').type = 'div'; }],
    ['fontSize', r => { r.styles[1].fontSize = '18px'; }],
    ['fontSize', r => { r.rules[1].declarations['font-size'].value = '14px'; }],
    ['fontSize', r => { r.rules[1].declarations['font-size'].important = true; }],
    ['fontSize', r => { r.rules[1].conditions = ['@layer unknown']; }],
    ['fontSize', r => { r.nodes.find(n => n.key === 'frame').inline.font = '16px serif'; }],
    ['fontSize', (_r, a) => { a.rules[0].fontSize = '15px'; }],
    ['fontSize', (_r, a) => { a.rules[0].mediaMaxWidth = '500px'; }],
    ['fontSize', (_r, a) => { a.rules.push({ ...a.rules[0] }); }],
    ['fontSize', (_r, a) => { for (const n of a.nodes.filter(n => n.authored.class === 'step-badge')) n.interactionResolvedStyle.font = '16px serif'; }],
    ['fontSize', (_r, a) => { for (const n of a.nodes.filter(n => n.authored.class === 'step-badge')) n.normalResolvedStyle.all = 'initial'; }],
    ['fontSize', (_r, a) => { for (const n of a.nodes.filter(n => n.authored.class === 'step-badge')) n.interactionResolvedStyle.fontSize = '16px'; }],
    ['color', r => { r.rules[3].declarations.color.value = 'red'; }],
    ['color', r => { r.rules[3].active = false; }],
    ['color', r => { r.rules[3].declarations.color.important = true; }],
    ['color', r => { r.rules[3].conditions = ['@layer unknown']; }],
    ['color', r => { for (const n of r.nodes.filter(n => n.attributes.class?.includes('mat-step-label'))) n.attributes.class = 'mat-step-label'; }],
    ['color', r => { for (const n of r.nodes.filter(n => n.attributes.class === 'mat-step-text-label')) n.type = 'span'; }],
    ['color', r => { for (const n of r.nodes.filter(n => n.type === 'mat-step-header')) n.attributes.id = 'cdk-stepper-wrong'; }],
    ['color', r => { r.nodes.push(...r.nodes.filter(n => n.type === 'mat-step-header').map(n => structuredClone(n))); }],
    ['color', r => { for (const n of r.nodes.filter(n => /^step-.*-text$/.test(n.attributes.id ?? ''))) n.ownText = 'Other'; }],
    ['color', (_r, a) => { a.nodes.find(n => n.key === 'page').normalResolvedStyle.color = '#abcdef'; }],
    ['color', (_r, a) => { a.nodes.find(n => n.key === 'page').parent = 'missing'; }],
    ['color', (_r, a) => { a.nodes.push(structuredClone(a.nodes.find(n => n.key === 'page'))); }],
    ['color', (_r, a) => { a.nodes.find(n => n.key === 'page').authored.style = { color: 'red' }; }],
    ['color', (_r, a) => { for (const n of a.nodes.filter(n => n.authored.class === 'step-text')) n.interactionResolvedStyle.color = 'red'; }],
    ['color', (_r, a) => { a.rules.find(r => r.selector === '#page').color = '#abcdef'; }],
  ];
  for (const [property, mutate] of mutations) {
    const raw = stepperTextInputReport();
    mutate(raw.results[0].inputTrees.reference, raw.results[0].inputTrees.astylar);
    const evidence = collectRetainedTypographyEvidence(raw.results, collectFullTreeInventory(raw.results));
    assert.ok(!evidence.differences.some(d => d.property === property && d.attribution === 'reviewed-stepper-text-input'), String(mutate));
  }
});

test('stepper typography claims replay original evidence for both font and color', () => {
  const baseline = buildMaterialInputAudit(stepperTextInputReport());
  for (const property of ['fontSize', 'color']) for (const mutate of [
    (_r, f) => { f.inputEquivalent = true; },
    (_r, f) => { f.currentPseudoStatePaintVerified = true; },
    (_r, f) => { f.reviewEvidence.referenceChain.pop(); },
    (_r, f) => { f.values.reference = 'invented'; },
    (_r, f) => { f.classification = 'confirmed-core-renderer-defect'; },
    (r, f) => { r.retainedTypography.differences.push(structuredClone(f)); },
    r => { r.retainedTypography.differences = r.retainedTypography.differences.filter(d => d.property !== property); },
  ]) {
    const report = structuredClone(baseline);
    mutate(report, report.retainedTypography.differences.find(d => d.property === property && d.attribution === 'reviewed-stepper-text-input'));
    assert.ok(validateMaterialInputAudit(report, { requireComplete: false }).some(e => e.includes('stepper typography')), String(mutate));
  }
});

function toggleButtonAlignmentReport() {
  const raw = templateTypographyReport('button-toggle'), { reference: r, astylar: a } = raw.results[0].inputTrees;
  r.styles[0] = { ...r.styles[0], textAlign: 'start', direction: 'ltr', writingMode: 'horizontal-tb', unicodeBidi: 'normal', textAlignLast: 'auto', display: 'block' };
  r.styles.push({ ...r.styles[0], textAlign: 'center', display: 'inline-block' });
  r.nodes[0].parent = 'frame';
  r.nodes.push({ key: 'frame', parent: null, type: 'main', attributes: { class: 'frame' }, ownText: '', style: 0, rules: [], pseudoElements: [] });
  for (const n of r.nodes.filter(n => ['mat-button-toggle-button', 'mat-button-toggle-label-content'].includes(n.attributes?.class))) n.style = 1;
  a.nodes[0].parent = 'page';
  a.nodes.push({ key: 'page', parent: 'root', authored: { id: 'page', type: 'main' } });
  a.rules = [{ selector: '.button-toggle-option', display: 'flex', justifyContent: 'center' }];
  for (const n of a.nodes) {
    n.normalResolvedStyle = n.authored.class === 'button-toggle-option' ? { display: 'flex', justifyContent: 'center' } : {};
    n.interactionResolvedStyle = { ...n.normalResolvedStyle };
    n.resolvedStyle = { ...n.normalResolvedStyle };
    if (n.retainedText) n.retainedText.style.textAlign = 'left';
  }
  return raw;
}

test('toggle alignment attributes native-wrapper substitution without equating center and left', () => {
  const raw = toggleButtonAlignmentReport(), before = structuredClone(raw), report = buildMaterialInputAudit(raw);
  const findings = report.retainedTypography.differences.filter(d => d.attribution === 'reviewed-toggle-button-wrapper-substitution');
  assert.equal(findings.length, 2);
  for (const f of findings) {
    assert.equal(f.values.reference, 'center');
    assert.equal(f.values.normal, undefined);
    assert.equal(f.values.effective, undefined);
    assert.equal(f.values.retained, 'left');
    assert.equal(f.inputEquivalent, false);
    assert.equal(f.currentPseudoStatePaintVerified, false);
    assert.equal(f.classification, 'application-plugin-authoring-defect');
    assert.equal(f.reviewEvidence.referenceChain[1].type, 'button');
    assert.equal(f.reviewEvidence.referenceChain.at(-1).node, 'frame');
    assert.equal(f.reviewEvidence.candidateChain.at(-1).node, 'page');
    assert.ok(report.sourceFindings.find(s => s.id === f.reviewEvidence.sourceFinding)?.detected);
  }
  assert.ok(!validateMaterialInputAudit(report, { requireComplete: false }).some(e => e.includes('toggle button alignment')));
  assert.deepEqual(raw, before);
});

test('toggle alignment attribution rejects broken structure, ancestry or contradicted style evidence', () => {
  const mutations = [
    r => { r.nodes[0].parent = 'missing'; },
    r => { r.nodes[0].parent = r.nodes[0].key; },
    r => { r.nodes.at(-1).attributes.class = 'other'; },
    r => { r.nodes.push(structuredClone(r.nodes.at(-1))); },
    r => { r.styles[0].direction = 'rtl'; },
    r => { r.styles[1].display = 'flex'; },
    r => { r.styles[1].textAlign = 'left'; },
    r => { r.styles[1].textAlignLast = 'center'; },
    r => { r.styles[1].unicodeBidi = 'plaintext'; },
    r => { for (const n of r.nodes.filter(n => n.type === 'button')) n.type = 'div'; },
    r => { r.nodes.at(-1).inline = { all: 'revert' }; },
    r => { r.rules = [{ active: true, declarations: { 'text-align': { value: 'center' } } }];
      for (const n of r.nodes.filter(n => n.type === 'button')) n.rules = [0]; },
    (_r, a) => { a.nodes.at(-1).parent = 'missing'; },
    (_r, a) => { a.nodes.push(structuredClone(a.nodes.at(-1))); },
    (_r, a) => { a.nodes.at(-1).normalResolvedStyle.textAlign = 'right'; },
    (_r, a) => { a.nodes.at(-1).interactionResolvedStyle.all = 'initial'; },
    (_r, a) => { a.nodes.at(-1).authored.style = { textAlign: 'right' }; },
    (_r, a) => { a.rules.push({ ...a.rules[0] }); },
    (_r, a) => { a.rules[0].mediaMinWidth = '500px'; },
    (_r, a) => { for (const n of a.nodes.filter(n => n.authored.class === 'button-toggle-option')) n.interactionResolvedStyle.justifyContent = 'flex-start'; },
    (_r, a) => { for (const n of a.nodes.filter(n => n.retainedText)) n.retainedText.style.textAlign = 'center'; },
  ];
  for (const mutate of mutations) {
    const raw = toggleButtonAlignmentReport();
    mutate(raw.results[0].inputTrees.reference, raw.results[0].inputTrees.astylar);
    const evidence = collectRetainedTypographyEvidence(raw.results, collectFullTreeInventory(raw.results));
    assert.ok(!evidence.differences.some(d => d.attribution === 'reviewed-toggle-button-wrapper-substitution'), String(mutate));
  }
});

test('toggle alignment report claims independently replay from captured inputs', () => {
  const baseline = buildMaterialInputAudit(toggleButtonAlignmentReport());
  const mutations = [
    (_r, f) => { f.inputEquivalent = true; },
    (_r, f) => { f.currentPseudoStatePaintVerified = true; },
    (_r, f) => { f.reviewEvidence.referenceChain.pop(); },
    (_r, f) => { f.values.reference = 'left'; },
    (_r, f) => { f.classification = 'confirmed-core-renderer-defect'; },
    (r, f) => { r.retainedTypography.differences.push(structuredClone(f)); },
    r => { r.retainedTypography.differences = []; },
    r => { r.elementInventory.rules.find(p => p.side === 'astylar' && p.value.selector === '.button-toggle-option').value.justifyContent = 'flex-start'; },
  ];
  for (const mutate of mutations) {
    const report = structuredClone(baseline);
    mutate(report, report.retainedTypography.differences.find(d => d.attribution === 'reviewed-toggle-button-wrapper-substitution'));
    assert.ok(validateMaterialInputAudit(report, { requireComplete: false }).some(e => e.includes('toggle button alignment')), String(mutate));
  }
});

function paginatorTooltipReport() {
  const raw = templateTypographyReport('paginator'), e = raw.results[0], { reference: r, astylar: a } = e.inputTrees;
  e.state = 'hover'; raw.results = []; raw.interactions = [e];
  Object.assign(r.styles[0], { display: 'block', visibility: 'visible', opacity: '1' });
  const ref = (key, parent, type, attributes = {}, ownText = '') => ({ key, parent, type, attributes, ownText, style: 0, rules: [], pseudoElements: [] });
  r.nodes[0].parent = 'section'; r.nodes[0].attributes.role = 'group';
  r.nodes.push(ref('section', 'frame', 'section', { id: 'paginator-root', class: 'demo' }), ref('frame', null, 'main', { class: 'frame' }),
    ref('previous', 'r/w/c/r', 'button', { class: 'mat-mdc-paginator-navigation-previous', 'aria-label': 'Previous page', 'aria-disabled': 'true' }),
    ref('next', 'r/w/c/r', 'button', { class: 'mat-mdc-paginator-navigation-next mat-mdc-tooltip-trigger', 'aria-label': 'Next page', mattooltipposition: 'above' }),
    ref('overlay', null, 'div', { class: 'cdk-overlay-container' }), ref('bounds', 'overlay', 'div', { class: 'cdk-overlay-connected-position-bounding-box' }),
    ref('pane', 'bounds', 'div', { id: 'cdk-overlay-0', class: 'cdk-overlay-pane mat-mdc-tooltip-panel mat-mdc-tooltip-panel-above' }),
    ref('component', 'pane', 'mat-tooltip-component', { 'aria-hidden': 'true' }), ref('tooltip', 'component', 'div', { class: 'mat-mdc-tooltip mat-mdc-tooltip-show' }),
    ref('tooltip-text', 'tooltip', 'div', { class: 'mat-mdc-tooltip-surface mdc-tooltip__surface' }, 'Next page'));
  const ast = (key, parent, authored) => ({ key, parent, authored, resolvedStyle: {}, normalResolvedStyle: {}, interactionResolvedStyle: {} });
  a.nodes[0].parent = 'section'; a.nodes[0].authored.role = 'group';
  a.nodes.push(ast('section', 'page', { type: 'section', id: 'paginator-root' }), ast('page', 'root', { type: 'main', id: 'page' }),
    ast('previous', 'a/c/r', { type: 'button', id: 'paginator-previous', class: 'paginator-button', ariaLabel: 'Previous page', value: '‹', disabled: true }),
    ast('next', 'a/c/r', { type: 'button', id: 'paginator-next', class: 'paginator-button', ariaLabel: 'Next page', value: '›', disabled: false }));
  return raw;
}

test('paginator tooltip omission preserves shown overlay and complete candidate input evidence', () => {
  for (const state of ['hover', 'held', 'activate']) {
    const raw = paginatorTooltipReport(); raw.interactions[0].state = state;
    const before = structuredClone(raw), report = buildMaterialInputAudit(raw);
    const gap = report.retainedTypography.gaps.find(g => g.attribution === 'reviewed-paginator-tooltip-omission');
    assert.ok(gap); assert.deepEqual(gap.referenceNodes, ['tooltip-text']); assert.deepEqual(gap.astylarNodes, []);
    assert.equal(gap.inputEquivalent, false); assert.equal(gap.finalRasterVerified, false);
    assert.equal(gap.reviewEvidence.referenceOverlayPath.length, 6);
    assert.equal(gap.reviewEvidence.referenceTriggerPath.length, 7);
    assert.equal(gap.reviewEvidence.candidatePath.length, 6);
    assert.equal(gap.reviewEvidence.referenceOverlayPath[0].ownText, 'Next page');
    assert.equal(gap.reviewEvidence.referenceOverlayPath[2].attributes['aria-hidden'], 'true');
    assert.equal(gap.reviewEvidence.candidatePath[0].authored.value, '›');
    assert.equal(gap.reviewEvidence.textMappings.length, 3);
    assert.equal(report.retainedTypography.comparisons.length, 3, 'page labels remain independently compared');
    assert.ok(report.sourceFindings.find(f => f.id === 'fixture-paginator-tooltip-omitted')?.detected);
    assert.ok(!validateMaterialInputAudit(report, { requireComplete: false }).some(e => e.includes('paginator tooltip')));
    assert.deepEqual(raw, before);
  }
});

test('paginator tooltip omission rejects ambiguous owners changed state missing inputs and candidate content', () => {
  const controls = [
    (r, a, e) => { e.state = 'leave'; },
    (r, a) => { r.nodes.push(structuredClone(r.nodes[0])); },
    (r, a) => { a.nodes.push({ ...structuredClone(a.nodes[0]), key: 'duplicate' }); },
    (r, a) => { r.nodes.find(n => n.key === 'tooltip-text').ownText = 'Previous page'; },
    (r, a) => { r.nodes.find(n => n.key === 'tooltip-text').parent = 'pane'; },
    (r, a) => { r.nodes.find(n => n.key === 'tooltip').attributes.class = 'mat-mdc-tooltip mat-mdc-tooltip-hide'; },
    (r, a) => { r.nodes.find(n => n.key === 'component').attributes['aria-hidden'] = 'false'; },
    (r, a) => { r.nodes.find(n => n.key === 'pane').attributes.class = 'cdk-overlay-pane mat-mdc-tooltip-panel mat-mdc-tooltip-panel-below'; },
    (r, a) => { r.nodes.find(n => n.key === 'overlay').parent = 'frame'; },
    (r, a) => { r.styles[0].display = 'none'; },
    (r, a) => { r.styles[0].visibility = 'hidden'; },
    (r, a) => { r.styles[0].opacity = '0'; },
    (r, a) => { r.nodes.find(n => n.key === 'next').attributes['aria-label'] = 'Other'; },
    (r, a) => { r.nodes.find(n => n.key === 'next').attributes.mattooltipposition = 'below'; },
    (r, a) => { r.nodes.find(n => n.key === 'next').attributes['aria-disabled'] = 'true'; },
    (r, a) => { r.nodes.find(n => n.key === 'next').attributes.disabled = ''; },
    (r, a) => { r.nodes.find(n => n.key === 'next').attributes.class += ' mat-mdc-tooltip-disabled'; },
    (r, a) => { r.nodes.find(n => n.key === 'next').parent = 'frame'; },
    (r, a) => { r.nodes.find(n => n.key === 'previous').parent = 'frame'; },
    (r, a) => { a.nodes.find(n => n.key === 'next').authored.value = 'Next'; },
    (r, a) => { a.nodes.find(n => n.key === 'next').authored.disabled = true; },
    (r, a) => { a.nodes.find(n => n.key === 'previous').authored.disabled = false; },
    (r, a) => { a.nodes.find(n => n.key === 'next').authored.ariaDescribedby = 'popup'; },
    (r, a) => { a.nodes.find(n => n.key === 'next').authored.title = 'Next page'; },
    (r, a) => { a.nodes.find(n => n.key === 'next').authored.data = { tooltip: 'Next page' }; },
    (r, a) => { a.nodes.find(n => n.key === 'next').parent = 'page'; },
    (r, a) => { a.nodes.find(n => n.key === 'page').parent = 'elsewhere'; },
    (r, a) => { a.nodes.find(n => n.authored.id === 'paginator-range').authored.textContent = '11 – 20 of 100'; },
    (r, a) => { delete a.nodes.find(n => n.key === 'next').normalResolvedStyle; },
    (r, a) => { a.resolvedStyleSource = 'mesh'; },
    (r, a) => { a.nodes.push({ key: 'popup', parent: 'section', authored: { type: 'div', id: 'popup', role: 'tooltip', textContent: 'Next page' } }); },
    (r, a) => { a.nodes.push({ key: 'custom', parent: 'section', authored: { type: 'custom:tooltip', id: 'custom' } }); },
    (r, a) => { r.nodes.push({ key: 'extra', parent: 'tooltip', type: 'span', attributes: {}, ownText: 'Other', style: 0, rules: [], pseudoElements: [] }); },
  ];
  for (const [index, mutate] of controls.entries()) {
    const raw = paginatorTooltipReport(), e = raw.interactions[0]; mutate(e.inputTrees.reference, e.inputTrees.astylar, e);
    const cases = [{ ...e, kind: 'interaction' }], t = collectRetainedTypographyEvidence(cases, collectFullTreeInventory(cases));
    assert.ok(t.gaps.some(g => g.attribution === 'unresolved'), `control ${index} remains explicit`);
    assert.ok(!t.gaps.some(g => g.attribution === 'reviewed-paginator-tooltip-omission'), `control ${index}`);
  }
});

function supplementalPaginatorTooltipCase(state = 'previous-hover', profile = 'light', dpr = 1) {
  const e = paginatorTooltipReport().interactions[0], { reference: r, astylar: a } = e.inputTrees;
  Object.assign(e, { kind: 'supplemental', profile, state: `paginator-navigation-${state}`,
    viewport: { id: `paginator-navigation-desktop-dpr${dpr}`, width: 1440, height: 1000, deviceScaleFactor: dpr } });
  const previous = !['next-once', 'next-step-1'].includes(state);
  if (previous) {
    r.nodes.find(n => n.key === 'tooltip-text').ownText = 'Previous page';
    const trigger = r.nodes.find(n => n.key === 'previous');
    Object.assign(trigger.attributes, { class: 'mat-mdc-paginator-navigation-previous mat-mdc-tooltip-trigger', mattooltipposition: 'above' });
    delete trigger.attributes['aria-disabled'];
    a.nodes.find(n => n.key === 'previous').authored.disabled = false;
  }
  return e;
}

test('paginator supplemental tooltip omissions retain exact Previous and Next trigger evidence in all observed cohorts', () => {
  for (const profile of ['light', 'dark']) for (const dpr of [1, 2])
    for (const state of ['next-once', 'previous-hover', 'previous-press', 'next-step-1', 'previous-from-last', 'previous-space-held']) {
      const e = supplementalPaginatorTooltipCase(state, profile, dpr), before = structuredClone(e), cases = [e];
      const evidence = collectRetainedTypographyEvidence(cases, collectFullTreeInventory(cases));
      const gap = evidence.gaps.find(g => g.attribution === 'reviewed-paginator-tooltip-omission');
      assert.ok(gap, `${profile}/${dpr}/${state}`);
      const previous = !['next-once', 'next-step-1'].includes(state);
      assert.equal(gap.reviewEvidence.referenceOverlayPath[0].ownText, previous ? 'Previous page' : 'Next page');
      assert.equal(gap.reviewEvidence.referenceTriggerPath[0].key, previous ? 'previous' : 'next');
      assert.equal(gap.reviewEvidence.candidatePath[0].key, previous ? 'previous' : 'next');
      assert.equal(gap.classification, 'application-plugin-authoring-defect');
      assert.equal(gap.inputEquivalent, false); assert.equal(gap.finalRasterVerified, false);
      assert.equal(evidence.comparisons.length, 3); assert.deepEqual(e, before);
    }
});

test('paginator supplemental tooltip omissions do not waive unobserved states or changed trigger and overlay inputs', () => {
  const controls = [
    e => { e.state = 'paginator-navigation-initial'; },
    e => { e.state = 'paginator-navigation-previous-release'; },
    e => { e.profile = 'other'; },
    e => { e.viewport.id = 'paginator-navigation-desktop-dpr3'; },
    e => { e.kind = 'interaction'; },
    e => { e.inputTrees.reference.nodes.find(n => n.key === 'tooltip-text').ownText = 'Next page'; },
    e => { e.inputTrees.reference.nodes.find(n => n.key === 'previous').attributes.mattooltipposition = 'below'; },
    e => { e.inputTrees.reference.nodes.find(n => n.key === 'previous').attributes['aria-disabled'] = 'true'; },
    e => { e.inputTrees.reference.nodes.find(n => n.key === 'previous').attributes.disabled = ''; },
    e => { e.inputTrees.reference.nodes.find(n => n.key === 'tooltip').attributes.class = 'mat-mdc-tooltip-hide'; },
    e => { e.inputTrees.astylar.nodes.find(n => n.key === 'previous').authored.disabled = true; },
    e => { e.inputTrees.astylar.nodes.find(n => n.key === 'previous').authored.title = 'Previous page'; },
    e => { delete e.inputTrees.astylar.nodes.find(n => n.key === 'previous').normalResolvedStyle; },
    e => { e.inputTrees.astylar.nodes.push({ key: 'popup', authored: { id: 'popup', type: 'div', role: 'tooltip', textContent: 'Previous page' } }); },
  ];
  for (const [index, mutate] of controls.entries()) {
    const e = supplementalPaginatorTooltipCase(); mutate(e); const cases = [e];
    const evidence = collectRetainedTypographyEvidence(cases, collectFullTreeInventory(cases));
    assert.ok(!evidence.gaps.some(g => g.attribution === 'reviewed-paginator-tooltip-omission'), `control ${index}`);
    assert.ok(evidence.gaps.some(g => g.attribution === 'unresolved'), `control ${index} remains explicit`);
  }
});

test('paginator tooltip report independently replays complete omission evidence', () => {
  const original = buildMaterialInputAudit(paginatorTooltipReport());
  for (const mutate of [
    (r, g) => { g.inputEquivalent = true; },
    (r, g) => { g.finalRasterVerified = true; },
    (r, g) => { g.classification = 'confirmed-core-renderer-defect'; },
    (r, g) => { g.reviewEvidence.referenceOverlayPath[0].ownText = 'Other'; },
    (r, g) => { g.reviewEvidence.referenceOverlayPath.pop(); },
    (r, g) => { g.reviewEvidence.referenceTriggerPath[0].attributes.mattooltipposition = 'below'; },
    (r, g) => { g.reviewEvidence.candidateTree.pop(); },
    (r, g) => { g.reviewEvidence.candidatePath[0].authored.ariaDescribedby = 'popup'; },
    (r, g) => { g.reviewEvidence.textMappings = []; },
    (r, g) => { g.referenceNodes = []; },
    (r, g) => { g.case = 'interaction:tooltip@light/desktop/hover'; },
    (r, g) => { r.retainedTypography.gaps = r.retainedTypography.gaps.filter(v => v !== g); },
    (r, g) => { r.retainedTypography.gaps.push(structuredClone(g)); },
  ]) {
    const report = structuredClone(original), inventory = structuredClone(report.elementInventory);
    mutate(report, report.retainedTypography.gaps.find(g => g.attribution === 'reviewed-paginator-tooltip-omission'));
    assert.deepEqual(report.elementInventory, inventory);
    assert.ok(validateMaterialInputAudit(report, { requireComplete: false }).some(e => e.includes('paginator tooltip omissions')));
  }
});

function stepperEditReport() {
  const raw = retainedTypographyReport(), e = raw.results[0], { reference: r, astylar: a } = e.inputTrees;
  e.family = 'stepper'; e.state = 'activate'; raw.results = []; raw.interactions = [e];
  const ref = (key, parent, type, attributes = {}, ownText = '') => ({ key, parent, type, attributes, ownText, style: 0, rules: [], pseudoElements: [] });
  r.styles.push({ ...r.styles[0], position: 'absolute', width: '1px', height: '1px', clip: 'rect(0px, 0px, 0px, 0px)', overflowX: 'hidden', overflowY: 'hidden' });
  r.nodes = [ref('frame', null, 'main', { class: 'frame' }), ref('section', 'frame', 'section', { id: 'stepper-root', class: 'demo' }),
    ref('group', 'section', 'mat-stepper', { id: 'stepper-primary', class: 'mat-stepper-horizontal', role: 'tablist', 'aria-label': 'Project setup' }),
    ref('wrapper', 'group', 'div', { class: 'mat-horizontal-stepper-wrapper' }), ref('head', 'wrapper', 'div', { class: 'mat-horizontal-stepper-header-container' }),
    ref('details', 'head', 'mat-step-header', { id: 'cdk-stepper-0-label-0', class: 'mat-step-header', role: 'tab', 'aria-selected': 'false', 'aria-controls': 'cdk-stepper-0-content-0' }),
    ref('badge', 'details', 'div', { class: 'mat-step-icon mat-step-icon-state-edit' }), ref('content', 'badge', 'div', { class: 'mat-step-icon-content' }),
    { ...ref('hidden', 'content', 'span', { class: 'cdk-visually-hidden' }, 'Editable'), style: 1 },
    ref('icon', 'content', 'mat-icon', { class: 'mat-icon material-icons mat-ligature-font', role: 'img', 'aria-hidden': 'true', 'data-mat-icon-type': 'font' }, 'create'),
    ref('review', 'head', 'mat-step-header', { id: 'cdk-stepper-0-label-1', role: 'tab', 'aria-selected': 'true', 'aria-controls': 'cdk-stepper-0-content-1' })];
  const ast = (key, parent, authored) => ({ key, parent, authored, resolvedStyle: {}, normalResolvedStyle: {}, interactionResolvedStyle: {} });
  a.nodes = [ast('page', 'root', { type: 'main', id: 'page' }), ast('section', 'page', { type: 'section', id: 'stepper-root' }),
    ast('group', 'section', { type: 'div', id: 'stepper-primary', class: 'stepper', role: 'tablist', ariaLabel: 'Project setup' }),
    ast('head', 'group', { type: 'div', id: 'stepper-head', class: 'stepper-head' }),
    ast('details', 'head', { type: 'div', id: 'step-details', class: 'step-tab', role: 'tab', ariaSelected: false, tabindex: -1 }),
    ast('badge', 'details', { type: 'span', id: 'step-details-badge', class: 'step-badge completed' }),
    ast('mark', 'badge', { type: 'showcase.material:check-mark', id: 'step-details-complete', class: 'selection-mark step-complete-mark', role: 'presentation', data: { 'indicator-color': '#ffffff', 'stroke-width': 1.8 } }),
    ast('review', 'head', { type: 'div', id: 'step-review', role: 'tab', ariaSelected: true, tabindex: 0 })];
  return raw;
}

test('stepper edit substitution retains hidden description and icon input without inventing candidate text', () => {
  const raw = stepperEditReport(), before = structuredClone(raw), report = buildMaterialInputAudit(raw);
  const [gap] = report.retainedTypography.gaps;
  assert.equal(report.retainedTypography.gaps.length, 1);
  assert.equal(gap.attribution, 'reviewed-stepper-edit-state-substitution');
  assert.deepEqual(gap.referenceNodes, ['hidden', 'icon']); assert.deepEqual(gap.astylarNodes, []);
  assert.equal(gap.inputEquivalent, false); assert.equal(gap.finalRasterVerified, false); assert.equal(gap.currentPluginPaintCaptured, false);
  assert.equal(gap.reviewEvidence.referenceState, 'edit'); assert.equal(gap.reviewEvidence.candidateState, 'completed');
  assert.equal(gap.reviewEvidence.reference[0].style.clip, 'rect(0px, 0px, 0px, 0px)');
  assert.equal(gap.reviewEvidence.reference[1].ownText, 'create');
  assert.equal(gap.reviewEvidence.candidate[0].authored.type, 'showcase.material:check-mark');
  assert.equal(report.retainedTypography.comparisons.length, 0);
  assert.ok(report.sourceFindings.find(f => f.id === 'fixture-stepper-edit-state-replaced-by-checkmark')?.detected);
  assert.ok(!validateMaterialInputAudit(report).some(e => /stepper edit|retained typography mappings/.test(e)));
  assert.deepEqual(raw, before);
});

test('stepper edit substitution rejects changed state ancestry icon description and missing stages', () => {
  const controls = [
    (r, a, e) => { e.state = 'hover'; },
    (r, a) => { r.nodes.push(structuredClone(r.nodes[0])); },
    (r, a) => { a.nodes.push({ ...structuredClone(a.nodes[0]), key: 'duplicate' }); },
    (r, a) => { r.nodes.find(n => n.key === 'hidden').ownText = 'Completed'; },
    (r, a) => { r.nodes.find(n => n.key === 'hidden').attributes.class = ''; },
    (r, a) => { r.styles[1].clip = 'auto'; },
    (r, a) => { r.styles[1].width = '20px'; },
    (r, a) => { r.nodes.find(n => n.key === 'icon').ownText = 'done'; },
    (r, a) => { r.nodes.find(n => n.key === 'icon').attributes['aria-hidden'] = 'false'; },
    (r, a) => { r.nodes.find(n => n.key === 'icon').attributes['data-mat-icon-type'] = 'svg'; },
    (r, a) => { r.nodes.find(n => n.key === 'icon').parent = 'details'; },
    (r, a) => { r.nodes.find(n => n.key === 'badge').attributes.class = 'mat-step-icon mat-step-icon-state-done'; },
    (r, a) => { r.nodes.find(n => n.key === 'details').attributes['aria-selected'] = 'true'; },
    (r, a) => { r.nodes.find(n => n.key === 'details').attributes['aria-controls'] = 'other'; },
    (r, a) => { r.nodes.find(n => n.key === 'review').attributes['aria-selected'] = 'false'; },
    (r, a) => { r.nodes.find(n => n.key === 'frame').parent = 'other'; },
    (r, a) => { a.nodes.find(n => n.key === 'mark').authored.type = 'span'; },
    (r, a) => { a.nodes.find(n => n.key === 'mark').authored.role = 'img'; },
    (r, a) => { a.nodes.find(n => n.key === 'mark').authored.textContent = 'create'; },
    (r, a) => { a.nodes.find(n => n.key === 'mark').authored.data['stroke-width'] = 2; },
    (r, a) => { a.nodes.find(n => n.key === 'mark').parent = 'details'; },
    (r, a) => { a.nodes.find(n => n.key === 'badge').authored.class = 'step-badge selected'; },
    (r, a) => { a.nodes.find(n => n.key === 'details').authored.ariaSelected = true; },
    (r, a) => { a.nodes.find(n => n.key === 'review').authored.tabindex = -1; },
    (r, a) => { a.nodes.find(n => n.key === 'page').parent = 'other'; },
    (r, a) => { delete a.nodes.find(n => n.key === 'mark').normalResolvedStyle; },
    (r, a) => { a.nodes.find(n => n.key === 'mark').retainedText = { source: 'core-text-registry', style: {} }; },
    (r, a) => { a.resolvedStyleSource = 'mesh'; },
    (r, a) => { a.nodes.push({ key: 'extra', parent: 'details', authored: { type: 'span', textContent: 'Editable' } }); },
    (r, a) => { r.nodes.push({ key: 'extra', parent: 'content', type: 'span', attributes: {}, ownText: 'Other', style: 0, rules: [], pseudoElements: [] }); },
  ];
  for (const [index, mutate] of controls.entries()) {
    const raw = stepperEditReport(), e = raw.interactions[0]; mutate(e.inputTrees.reference, e.inputTrees.astylar, e);
    const cases = [{ ...e, kind: 'interaction' }], t = collectRetainedTypographyEvidence(cases, collectFullTreeInventory(cases));
    assert.ok(t.gaps.some(g => g.attribution === 'unresolved'), `control ${index} remains explicit`);
    assert.ok(!t.gaps.some(g => g.attribution === 'reviewed-stepper-edit-state-substitution'), `control ${index}`);
  }
});

test('stepper edit report independently replays complete state and style evidence', () => {
  const original = buildMaterialInputAudit(stepperEditReport());
  for (const mutate of [
    (r, g) => { g.inputEquivalent = true; },
    (r, g) => { g.currentPluginPaintCaptured = true; },
    (r, g) => { g.finalRasterVerified = true; },
    (r, g) => { g.reviewEvidence.referenceState = 'done'; },
    (r, g) => { g.reviewEvidence.reference[0].style.clip = 'auto'; },
    (r, g) => { g.reviewEvidence.reference.pop(); },
    (r, g) => { g.reviewEvidence.candidate[0].authored.data['stroke-width'] = 2; },
    (r, g) => { g.referenceNodes.pop(); },
    (r, g) => { g.case = 'interaction:dialog@light/desktop/activate'; },
    (r, g) => { r.retainedTypography.gaps = []; },
    (r, g) => { r.retainedTypography.gaps.push(structuredClone(g)); },
  ]) {
    const report = structuredClone(original), inventory = structuredClone(report.elementInventory);
    mutate(report, report.retainedTypography.gaps[0]);
    assert.deepEqual(report.elementInventory, inventory);
    assert.ok(validateMaterialInputAudit(report, { requireComplete: false }).some(e => e.includes('stepper edit substitutions')));
  }
});

function stepperNumberAlignmentReport() {
  const raw = templateTypographyReport('stepper'), { reference: r, astylar: a } = raw.results[0].inputTrees;
  r.styles[0] = { ...r.styles[0], textAlign: 'start', direction: 'ltr', writingMode: 'horizontal-tb', unicodeBidi: 'normal', textAlignLast: 'auto', display: 'block' };
  r.nodes[0].parent = 'frame';
  r.nodes.push({ key: 'frame', parent: null, type: 'main', attributes: { class: 'frame' }, ownText: '', style: 0, rules: [], pseudoElements: [] });
  r.styles.push({ ...r.styles[0], position: 'absolute', top: '12px', left: '12px', display: 'flex', transform: 'matrix(1, 0, 0, 1, -4.5, -9.5)' });
  r.rules = [{ selector: '.mat-step-icon-content', active: true, conditions: [], declarations: Object.fromEntries(Object.entries({
    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', display: 'flex',
  }).map(([key, value]) => [key, { value, important: false }])) }];
  for (const n of r.nodes.filter(n => n.attributes?.class === 'mat-step-icon-content')) { n.style = 1; n.rules = [0]; }
  a.rules = [{ selector: '.step-badge', width: '24px', height: '24px', textAlign: 'center' }];
  for (const n of a.nodes.filter(n => n.authored?.class === 'step-badge')) {
    n.normalResolvedStyle = { width: '24px', height: '24px', textAlign: 'center' };
    n.interactionResolvedStyle = { ...n.normalResolvedStyle };
    n.resolvedStyle = { ...n.normalResolvedStyle };
    n.retainedText.style.textAlign = 'center';
  }
  return raw;
}

test('stepper numeric alignment retains the original percentage wrapper and unequal centered-span input', () => {
  const raw = stepperNumberAlignmentReport(), before = structuredClone(raw), report = buildMaterialInputAudit(raw);
  const findings = report.retainedTypography.differences.filter(d => d.attribution === 'reviewed-stepper-number-wrapper-substitution');
  assert.equal(findings.length, 2);
  for (const f of findings) {
    assert.deepEqual(f.values, { reference: 'start', normal: 'center', effective: 'center', retained: 'center' });
    assert.equal(f.inputEquivalent, false);
    assert.equal(f.currentPseudoStatePaintVerified, false);
    assert.equal(f.classification, 'application-plugin-authoring-defect');
    assert.equal(f.reviewEvidence.referenceChain.at(-1).node, 'frame');
    assert.equal(f.reviewEvidence.referenceContentRule.declarations.transform.value, 'translate(-50%, -50%)');
    assert.ok(report.sourceFindings.find(s => s.id === f.reviewEvidence.sourceFinding)?.detected);
  }
  assert.ok(!validateMaterialInputAudit(report, { requireComplete: false }).some(e => e.includes('stepper number alignment')));
  assert.deepEqual(raw, before);
});

test('stepper alignment attribution rejects incomplete or contradictory layout and alignment evidence', () => {
  const mutations = [
    r => { r.nodes[0].parent = 'missing'; },
    r => { r.nodes[0].parent = r.nodes[0].key; },
    r => { r.nodes.at(-1).attributes.class = 'other'; },
    r => { r.nodes.push(structuredClone(r.nodes.at(-1))); },
    r => { r.styles[0].direction = 'rtl'; },
    r => { r.styles[0].textAlignLast = 'center'; },
    r => { r.styles[0].unicodeBidi = 'plaintext'; },
    r => { r.nodes.at(-1).inline = { all: 'revert' }; },
    r => { r.styles[1].position = 'relative'; },
    r => { r.rules[0].active = false; },
    r => { r.rules[0].conditions = ['@layer unknown']; },
    r => { r.rules[0].declarations.transform.value = 'translate(-12px, -12px)'; },
    r => { for (const n of r.nodes.filter(n => n.attributes?.class === 'mat-step-icon-content')) n.inline = { transform: 'none' }; },
    r => { r.rules.push({ active: true, selector: '.override', declarations: { transform: { value: 'none' } } });
      for (const n of r.nodes.filter(n => n.attributes?.class === 'mat-step-icon-content')) n.rules.push(1); },
    r => { r.rules[0].declarations.top.important = true; },
    r => { r.rules[0].declarations['text-align'] = { value: 'center' }; },
    (_r, a) => { a.rules[0].textAlign = 'left'; },
    (_r, a) => { a.rules[0].mediaMaxWidth = '500px'; },
    (_r, a) => { a.rules.push({ ...a.rules[0] }); },
    (_r, a) => { for (const n of a.nodes.filter(n => n.authored?.class === 'step-badge')) n.interactionResolvedStyle.textAlign = 'left'; },
    (_r, a) => { for (const n of a.nodes.filter(n => n.authored?.class === 'step-badge')) n.normalResolvedStyle.width = '25px'; },
    (_r, a) => { for (const n of a.nodes.filter(n => n.authored?.class === 'step-badge')) n.authored.style = { textAlign: 'center' }; },
  ];
  for (const mutate of mutations) {
    const raw = stepperNumberAlignmentReport();
    mutate(raw.results[0].inputTrees.reference, raw.results[0].inputTrees.astylar);
    const evidence = collectRetainedTypographyEvidence(raw.results, collectFullTreeInventory(raw.results));
    assert.ok(!evidence.differences.some(d => d.attribution === 'reviewed-stepper-number-wrapper-substitution'), String(mutate));
  }
});

test('stepper alignment claims replay from captured structure rather than report flags', () => {
  const baseline = buildMaterialInputAudit(stepperNumberAlignmentReport());
  const mutations = [
    (_r, f) => { f.inputEquivalent = true; },
    (_r, f) => { f.reviewEvidence.referenceChain.pop(); },
    (_r, f) => { f.values.reference = 'center'; },
    (_r, f) => { f.classification = 'confirmed-core-renderer-defect'; },
    (r, f) => { r.retainedTypography.differences.push(structuredClone(f)); },
    r => { r.retainedTypography.differences = []; },
    r => { r.elementInventory.rules.find(p => p.side === 'astylar' && p.value.selector === '.step-badge').value.width = '25px'; },
    r => { r.elementInventory.variants.find(v => v.side === 'reference').nodes.find(n => n.key === 'frame').parent = 'missing'; },
  ];
  for (const mutate of mutations) {
    const report = structuredClone(baseline);
    mutate(report, report.retainedTypography.differences.find(d => d.attribution === 'reviewed-stepper-number-wrapper-substitution'));
    assert.ok(validateMaterialInputAudit(report, { requireComplete: false }).some(e => e.includes('stepper number alignment')), String(mutate));
  }
});

test('stepper inactive-panel omission is an unequal structural input, not an absent core text entry', () => {
  for (const selected of [true, false]) {
    const raw = omittedStepperPanelReport(selected), before = structuredClone(raw), report = buildMaterialInputAudit(raw);
    const [gap] = report.retainedTypography.gaps;
    assert.equal(report.retainedTypography.gaps.length, 1);
    assert.equal(gap.attribution, 'reviewed-stepper-panel-substitution');
    assert.equal(gap.classification, 'application-plugin-authoring-defect');
    assert.equal(gap.inputEquivalent, false);
    assert.equal(gap.reviewEvidence.inactiveText, selected ? 'Review changes' : 'Project details');
    assert.equal(gap.reviewEvidence.observations.length, 5);
    assert.equal(report.retainedTypography.comparisons.length, 3);
    assert.equal(report.retainedTypography.differences.length, 3, 'active text differences remain independently unresolved');
    const errors = validateMaterialInputAudit(report);
    assert.ok(!errors.some((error) => /stepper panel substitutions|retained typography mappings/.test(error)));
    assert.ok(errors.some((error) => error.includes('retained typography differences')));
    assert.equal(report.summary.inputEquivalent, false);
    assert.deepEqual(raw, before);
  }
});

test('stepper structural attribution rejects incomplete, contradictory and ambiguous panel evidence', () => {
  const mutations = [
    (r, a) => { delete r.nodes.at(-2).attributes.inert; },
    (r, a) => { r.nodes.at(-2).attributes.role = 'region'; },
    (r, a) => { r.nodes.at(-2).attributes.class = 'mat-horizontal-stepper-content mat-horizontal-stepper-content-current'; },
    (r, a) => { r.nodes.at(-2).attributes.id = 'cdk-stepper-38-content-0'; },
    (r, a) => { r.nodes.at(-2).parent = 'other'; },
    (r, a) => { r.styles[1].visibility = 'visible'; },
    (r, a) => { r.styles[1].height = '20px'; },
    (r, a) => { r.nodes.at(-1).ownText = 'Unknown panel'; },
    (r, a) => { r.nodes.at(-1).attributes['data-parity-id'] = 'other'; },
    (r, a) => { r.nodes.push({ ...structuredClone(r.nodes.at(-2)), key: 'duplicate', parent: 'elsewhere' }); },
    (r, a) => { a.nodes.at(-1).authored.role = 'region'; },
    (r, a) => { a.nodes.push({ key: 'a/c/extra', parent: 'a/c', authored: { type: 'span', textContent: 'Review changes' } }); },
    (r, a) => { a.nodes.at(-1).authored.textContent = 'Other current text'; },
    (r, a) => { delete a.nodes.at(-1).normalResolvedStyle; },
    (r, a) => { a.resolvedStyleSource = 'mesh'; },
  ];
  for (const [index, mutate] of mutations.entries()) {
    const raw = omittedStepperPanelReport(), { reference, astylar } = raw.results[0].inputTrees;
    mutate(reference, astylar);
    const gaps = buildMaterialInputAudit(raw).retainedTypography.gaps;
    assert.ok(gaps.length > 0);
    assert.ok(gaps.every((gap) => gap.attribution !== 'reviewed-stepper-panel-substitution'), `mutation ${index}`);
  }
});

test('stepper panel omission validation recomputes the captured structural evidence', () => {
  const original = buildMaterialInputAudit(omittedStepperPanelReport());
  for (const mutate of [
    (report, gap) => { gap.inputEquivalent = true; },
    (report, gap) => { gap.reviewEvidence.inactiveText = 'Other text'; },
    (report, gap) => { gap.reviewEvidence.observations[2].computed.visibility = 'visible'; },
    (report, gap) => { gap.reviewEvidence.revision++; },
    (report, gap) => { gap.referenceNodes = ['unknown']; },
    (report, gap) => { report.elementInventory.cases.push(structuredClone(report.elementInventory.cases[0])); },
  ]) {
    const report = structuredClone(original), gap = report.retainedTypography.gaps[0];
    mutate(report, gap);
    assert.ok(validateMaterialInputAudit(report, { requireComplete: false }).some((error) => error.includes('stepper panel substitutions')));
    assert.ok(validateMaterialInputAudit(report).some((error) => error.includes('retained typography mappings')));
  }
});

test('stepper omitted panel attribution does not consume other anonymous icon or accessibility text', () => {
  const raw = omittedStepperPanelReport(false), { reference } = raw.results[0].inputTrees;
  for (const [index, text] of ['Editable', 'create'].entries()) reference.nodes.push({
    key: `unmapped/${index}`, parent: 'r/w/h/0', type: 'span', attributes: {},
    ownText: text, style: 0, rules: [], pseudoElements: [],
  });
  const report = buildMaterialInputAudit(raw), gaps = report.retainedTypography.gaps;
  assert.equal(gaps.length, 2);
  assert.equal(gaps[0].attribution, 'reviewed-stepper-panel-substitution');
  assert.deepEqual(gaps[0].referenceNodes, ['r/w/c/inactive/0']);
  assert.equal(gaps[1].attribution, 'unresolved');
  assert.deepEqual(gaps[1].referenceNodes, ['unmapped/0', 'unmapped/1']);
  assert.ok(validateMaterialInputAudit(report).some((error) => error.includes('1 retained typography mappings')));
});

test('reviewed template text paths close only identity gaps and retain unequal typography', () => {
  for (const [family, count] of [['tree', 3], ['grid-list', 2], ['badge', 1], ['sort', 1], ['expansion', 1], ['sidenav', 1], ['button-toggle', 2], ['chips', 2], ['paginator', 3], ['stepper', 3], ['select', 1]]) {
    const raw = templateTypographyReport(family);
    const before = structuredClone(raw);
    const report = buildMaterialInputAudit(raw);
    const evidence = report.retainedTypography;
    assert.equal(evidence.reviewedMappings.length, count, family);
    assert.equal(evidence.comparisons.length, count, family);
    assert.deepEqual(evidence.gaps, [], family);
    assert.equal(evidence.differences.length, count, family);
    assert.ok(evidence.comparisons.every((entry) => entry.mapping.kind === 'reviewed-showcase-template-text'));
    assert.ok(evidence.differences.every((entry) => entry.property === 'fontSize' && entry.attribution === 'unresolved'));
    assert.ok(validateMaterialInputAudit(report).some((error) => error.includes('retained typography differences')));
    assert.deepEqual(raw, before, 'mapping must not rewrite reference IDs or captured structure');
  }
});

test('select value mapping follows the combobox and generated value owner without absorbing caret text', () => {
  for (const text of ['Team', 'Solo']) {
    const raw = templateTypographyReport('select'), { reference, astylar } = raw.results[0].inputTrees;
    reference.nodes.at(-1).ownText = text;
    astylar.nodes.at(-1).authored.textContent = text;
    const value = astylar.nodes.at(-1);
    astylar.nodes.push({ ...structuredClone(value), key: 'a/caret', parent: 'a',
      authored: { type: 'span', id: 'select-caret', class: 'select-caret', textContent: '▼' } });
    const evidence = buildMaterialInputAudit(raw).retainedTypography;
    assert.equal(evidence.comparisons.length, 1);
    assert.equal(evidence.comparisons[0].text, text);
    assert.equal(evidence.differences[0].attribution, 'unresolved');
    assert.equal(evidence.gaps.length, 1);
    assert.equal(evidence.gaps[0].element, 'select-caret');
  }
  for (const mutate of [
    (r) => { r.nodes.find((n) => n.type === 'mat-select').attributes.role = 'button'; },
    (r) => { r.nodes.find((n) => n.attributes.id === 'mat-select-value-93').attributes.id = 'other-value'; },
    (r) => { const value = r.nodes.find((n) => n.attributes.id === 'mat-select-value-93'); r.nodes.push({ ...value, key: 'duplicate-owner', parent: 'other' }); },
  ]) {
    const { reference, astylar } = templateTypographyReport('select').results[0].inputTrees;
    mutate(reference);
    assert.deepEqual(reviewedTemplateTextMappings('select', reference, astylar), []);
  }
});

function pluginTabPanelReport(selected = true, custom = false) {
  const raw = retainedTypographyReport(), e = raw.results[0];
  e.family = 'tabs'; e.styleInputs = [];
  const { reference: r, astylar: a } = e.inputTrees;
  const index = selected ? 0 : 1, text = selected ? 'Overview content' : 'Activity content';
  r.nodes = [
    { key: 'group', parent: null, type: 'mat-tab-group', attributes: { id: 'tabs-primary' } },
    { key: 'wrapper', parent: 'group', type: 'div', attributes: { class: 'mat-mdc-tab-body-wrapper' } },
    { key: 'body', parent: 'wrapper', type: 'mat-tab-body', attributes: {
      id: `mat-tab-group-17-content-${index}`, role: 'tabpanel', class: 'mat-mdc-tab-body mat-mdc-tab-body-active',
      'aria-labelledby': `mat-tab-group-17-label-${index}`, 'aria-hidden': 'false' } },
    { key: 'content', parent: 'body', type: 'div', attributes: { class: 'mat-mdc-tab-body-content' } },
    { key: 'leaf', parent: 'content', type: 'span', attributes: { 'data-parity-id': 'tab-panel' }, ownText: text },
    { key: 'header', parent: 'group', type: 'div', attributes: { id: `mat-tab-group-17-label-${index}`,
      role: 'tab', 'aria-selected': 'true', 'aria-controls': `mat-tab-group-17-content-${index}` } },
  ].map(n => ({ ownText: '', style: 0, rules: [], inline: {}, pseudoElements: [], ...n }));
  const style = { display: 'block', width: '100%', height: custom ? '22px' : '20px' };
  a.nodes = [
    { key: 'a', parent: 'root', authored: { type: 'div', id: 'tabs-primary', class: 'tabs' } },
    { key: 'a/panel', parent: 'a', authored: { type: 'showcase.material:tab-panel', id: 'tab-panel', class: 'tab-panel',
      role: 'tabpanel', ariaLabel: text, data: { selected, phase: 1, 'text-color': '#1d1b20',
        'font-size': custom ? 18.4 : 16, 'baseline-offset': custom ? -.2 : 0 } } },
    ...['overview', 'activity'].map((name, i) => ({ key: `a/${name}`, parent: 'a', authored: { type: 'button',
      id: `tab-${name}`, role: 'tab', value: i === 0 ? 'Overview' : 'Activity',
      ariaControls: 'tab-panel', ariaSelected: i === 0 ? selected : !selected } })),
  ].map(n => ({ ...n, resolvedStyle: { ...style }, normalResolvedStyle: { ...style }, interactionResolvedStyle: { ...style } }));
  return raw;
}

test('plugin tab-panel mapping records unequal structure and data without inventing current text paint', () => {
  for (const selected of [false, true]) for (const custom of [false, true]) {
    const raw = pluginTabPanelReport(selected, custom), before = structuredClone(raw), report = buildMaterialInputAudit(raw);
    assert.deepEqual(raw, before);
    const gap = report.retainedTypography.gaps.find(g => g.attribution === 'reviewed-plugin-tab-panel-text-substitution');
    assert.ok(gap);
    assert.equal(gap.inputEquivalent, false);
    assert.equal(gap.finalRasterVerified, false);
    assert.equal(gap.currentPluginPaintCaptured, false);
    assert.equal(gap.reviewEvidence.source, 'captured-plugin-authored-input');
    assert.equal(gap.reviewEvidence.selected, selected);
    assert.equal(gap.reviewEvidence.referenceText, selected ? 'Overview content' : 'Activity content');
    assert.equal(gap.reviewEvidence.candidate[0].authored.data['baseline-offset'], custom ? -.2 : 0);
    assert.equal(gap.reviewEvidence.candidate[0].normal.fontSize, undefined);
    assert.deepEqual(gap.astylarNodes, []);
    assert.ok(!report.retainedTypography.comparisons.some(c => c.element === 'tab-panel'));
    assert.ok(!report.retainedTypography.controlTextMappings.some(c => c.element === 'tab-panel'));
    assert.ok(!validateMaterialInputAudit(report, { requireComplete: false }).some(e => e.includes('plugin tab-panel')));
  }
});

test('plugin tab-panel source detection requires private texture font and paint in the same class', () => {
  const report = buildMaterialInputAudit(parityReport({}, {}));
  const finding = report.sourceFindings.find(f => f.id === 'plugin-tab-panel-competing-text-renderer');
  assert.equal(finding.detected, true);
  const expression = new RegExp(finding.pattern);
  assert.ok(expression.test('class MaterialTabPanelRenderer {\n  new DynamicTexture();\n  canvas.font = font;\n  canvas.fillText(text);\n}'));
  for (const source of [
    'class MaterialTabPanelRenderer {}',
    'class MaterialTabPanelRenderer {\n  core.renderText();\n}\nclass Other {\n new DynamicTexture();\n canvas.font = font;\n canvas.fillText(text);\n}',
    'class MaterialTabPanelRenderer {\n  new DynamicTexture();\n  canvas.fillText(text);\n}',
    'class MaterialTabPanelRenderer {\n  new DynamicTexture();\n  canvas.font = font;\n}',
  ]) assert.equal(expression.test(source), false, source);
});

test('plugin tab-panel mapping rejects state contradictions, foreign ownership and invented core text', () => {
  const mutations = [
    (r) => { r.nodes.find(n => n.key === 'leaf').ownText = 'Other content'; },
    (r) => { r.nodes.find(n => n.key === 'leaf').attributes['data-parity-id'] = 'wrong'; },
    (r) => { r.nodes.find(n => n.key === 'leaf').attributes.id = 'tab-panel'; },
    (r) => { r.nodes.find(n => n.key === 'content').parent = 'group'; },
    (r) => { r.nodes.find(n => n.key === 'body').attributes['aria-hidden'] = 'true'; },
    (r) => { r.nodes.find(n => n.key === 'body').attributes['aria-labelledby'] = 'mat-tab-group-18-label-0'; },
    (r) => { r.nodes.find(n => n.key === 'header').attributes['aria-selected'] = 'false'; },
    (r) => { r.nodes.find(n => n.key === 'header').attributes['aria-controls'] = 'mat-tab-group-17-content-1'; },
    (r) => { r.nodes.find(n => n.key === 'header').parent = 'foreign'; },
    (r) => { r.nodes.push({ ...structuredClone(r.nodes.find(n => n.key === 'leaf')), key: 'other-leaf' }); },
    (_r, a) => { a.nodes[1].authored.type = 'div'; },
    (_r, a) => { a.nodes[1].authored.ariaLabel = 'Activity content'; },
    (_r, a) => { a.nodes[1].authored.data.selected = false; },
    (_r, a) => { a.nodes[1].authored.data.phase = .5; },
    (_r, a) => { delete a.nodes[1].authored.data['font-size']; },
    (_r, a) => { a.nodes[1].authored.data['baseline-offset'] = '0'; },
    (_r, a) => { a.nodes[1].authored.textContent = 'Overview content'; },
    (_r, a) => { a.nodes[1].retainedText = { source: 'core-text-registry', style: {} }; },
    (_r, a) => { a.nodes[1].paintedControlText = { source: 'core-control-texture', style: {} }; },
    (_r, a) => { a.nodes[2].authored.ariaSelected = false; },
    (_r, a) => { a.nodes[3].authored.ariaControls = 'other-panel'; },
    (_r, a) => { a.nodes[1].parent = 'root'; },
    (_r, a) => { a.nodes.push({ ...structuredClone(a.nodes[1]), key: 'duplicate' }); },
    (_r, a) => { delete a.nodes[1].normalResolvedStyle; },
  ];
  for (const mutate of mutations) {
    const raw = pluginTabPanelReport(), { reference, astylar } = raw.results[0].inputTrees;
    mutate(reference, astylar);
    const evidence = collectRetainedTypographyEvidence(raw.results, collectFullTreeInventory(raw.results));
    assert.ok(!evidence.gaps.some(g => g.attribution === 'reviewed-plugin-tab-panel-text-substitution'), String(mutate));
  }
});

test('plugin tab-panel findings replay captured evidence rather than trusting declared equivalence or paint', () => {
  const baseline = buildMaterialInputAudit(pluginTabPanelReport());
  for (const mutate of [
    (_r, g) => { g.inputEquivalent = true; },
    (_r, g) => { g.finalRasterVerified = true; },
    (_r, g) => { g.currentPluginPaintCaptured = true; },
    (_r, g) => { g.classification = 'confirmed-core-renderer-defect'; },
    (_r, g) => { g.reviewEvidence.source = 'core-text-registry'; },
    (_r, g) => { g.reviewEvidence.reference[0].computed.fontSize = '99px'; },
    (_r, g) => { g.reviewEvidence.candidate[0].authored.data['font-size'] = 99; },
    (_r, g) => { g.reviewEvidence.revision++; },
    (r, g) => { r.retainedTypography.gaps.push(structuredClone(g)); },
    r => { r.retainedTypography.gaps = []; },
    r => { r.elementInventory.variants.find(v => v.side === 'astylar').nodes[1].authored.data.phase = .5; },
    r => { r.elementInventory.styles.find(s => s.side === 'reference').value.color = '#abcdef'; },
  ]) {
    const report = structuredClone(baseline), gap = report.retainedTypography.gaps.find(g => g.attribution === 'reviewed-plugin-tab-panel-text-substitution');
    mutate(report, gap);
    assert.ok(validateMaterialInputAudit(report, { requireComplete: false }).some(e => e.includes('plugin tab-panel')), String(mutate));
  }
});

function selectArrowReport(compact = false) {
  const raw = templateTypographyReport('select'), { reference: r, astylar: a } = raw.results[0].inputTrees;
  const control = r.nodes.find(n => n.type === 'mat-select');
  control.attributes['aria-label'] = 'Plan';
  let parent = r.nodes.find(n => n.attributes?.class === 'mat-mdc-select-trigger').key;
  for (const [key, type, attributes] of [
    ['arrow-wrapper', 'div', { class: 'mat-mdc-select-arrow-wrapper' }],
    ['arrow', 'div', { class: 'mat-mdc-select-arrow' }],
    ['svg', 'svg', { viewBox: '0 0 24 24', width: '24px', height: '24px', focusable: 'false', 'aria-hidden': 'true' }],
    ['path', 'path', { d: 'M7 10l5 5 5-5z' }],
  ]) {
    r.nodes.push({ key, parent, type, attributes, ownText: '', style: 0, rules: [], inline: {}, pseudoElements: [] });
    parent = key;
  }
  const rule = { selector: '.select-caret', position: 'absolute', top: compact ? '8px' : '18px',
    right: '15px', fontSize: compact ? '14px' : '12px', color: '#1d1b20' };
  a.rules = [rule];
  const { selector, ...style } = rule;
  a.nodes.push({ key: 'a/i/control', parent: 'a/i', authored: { type: 'input', id: 'select-control', role: 'combobox', ariaLabel: 'Plan' },
    resolvedStyle: {}, normalResolvedStyle: {}, interactionResolvedStyle: {} },
  { key: 'a/caret', parent: 'a', authored: { type: 'span', id: 'select-caret', class: 'select-caret', role: 'presentation', textContent: '▼' },
    resolvedStyle: { ...style }, normalResolvedStyle: { ...style }, interactionResolvedStyle: { ...style },
    retainedText: { source: 'core-text-registry', style: { ...r.styles[0], ...style } } });
  return raw;
}

test('select arrow substitution preserves SVG and glyph inputs without inventing text correspondence', () => {
  for (const compact of [false, true]) {
    const raw = selectArrowReport(compact), before = structuredClone(raw), report = buildMaterialInputAudit(raw);
    assert.deepEqual(raw, before);
    const gap = report.retainedTypography.gaps.find(g => g.element === 'select-caret');
    assert.equal(gap.attribution, 'reviewed-select-vector-to-glyph-substitution');
    assert.equal(gap.inputEquivalent, false);
    assert.equal(gap.finalRasterVerified, false);
    assert.equal(gap.classification, 'application-plugin-authoring-defect');
    assert.deepEqual(gap.referenceNodes, []);
    assert.equal(gap.reviewEvidence.referenceChain.at(-1).attributes.d, 'M7 10l5 5 5-5z');
    assert.equal(gap.reviewEvidence.candidate.authored.textContent, '▼');
    assert.equal(gap.reviewEvidence.candidate.retained.fontSize, compact ? '14px' : '12px');
    assert.ok(!report.retainedTypography.comparisons.some(c => c.element === 'select-caret'));
    assert.ok(report.sourceFindings.find(f => f.id === 'fixture-select-arrow-vector-to-glyph-substitution').detected);
    assert.ok(!validateMaterialInputAudit(report, { requireComplete: false }).some(e => e.includes('select vector-to-glyph')));
  }
});

test('select arrow substitution refuses ambiguous content, broken ownership and inconsistent stages', () => {
  const mutations = [
    (r) => { r.nodes.find(n => n.type === 'path').attributes.d = 'M0 0'; },
    (r) => { r.nodes.find(n => n.type === 'svg').attributes.viewBox = '0 0 12 12'; },
    (r) => { r.nodes.find(n => n.type === 'svg').attributes.focusable = 'true'; },
    (r) => { r.nodes.find(n => n.type === 'svg').attributes.width = '12px'; },
    (r) => { r.nodes.find(n => n.type === 'path').parent = 'arrow'; },
    (r) => { r.nodes.find(n => n.key === 'arrow').attributes.class = 'unrelated'; },
    (r) => { r.nodes.find(n => n.type === 'path').ownText = 'text'; },
    (r) => { r.nodes.push({ ...structuredClone(r.nodes.at(-1)), key: 'extra-path' }); },
    (r) => { r.nodes.push(structuredClone(r.nodes.at(-1))); },
    (r) => { r.nodes.find(n => n.type === 'mat-select').attributes.role = 'button'; },
    (_r, a) => { a.nodes.at(-1).authored.textContent = '▾'; },
    (_r, a) => { a.nodes.at(-1).authored.role = 'button'; },
    (_r, a) => { a.nodes.at(-1).parent = 'a/i'; },
    (_r, a) => { a.nodes.find(n => n.authored.id === 'select-control').parent = 'missing'; },
    (_r, a) => { a.nodes.find(n => n.authored.id === 'select-control').authored.ariaLabel = 'Other'; },
    (_r, a) => { delete a.nodes.at(-1).retainedText; },
    (_r, a) => { a.nodes.at(-1).retainedText.style.fontSize = '99px'; },
    (_r, a) => { a.nodes.at(-1).interactionResolvedStyle.top = '99px'; },
    (_r, a) => { a.rules.push(structuredClone(a.rules[0])); },
    (_r, a) => { a.rules[0].mediaMaxWidth = '500px'; },
    (_r, a) => { a.nodes.push({ ...structuredClone(a.nodes.at(-1)), key: 'other-caret' }); },
  ];
  for (const mutate of mutations) {
    const raw = selectArrowReport(), { reference, astylar } = raw.results[0].inputTrees;
    mutate(reference, astylar);
    const e = collectRetainedTypographyEvidence(raw.results, collectFullTreeInventory(raw.results));
    assert.ok(!e.gaps.some(g => g.attribution === 'reviewed-select-vector-to-glyph-substitution'), String(mutate));
  }
});

test('select arrow claims are independently replayed including deleted and duplicated findings', () => {
  const baseline = buildMaterialInputAudit(selectArrowReport());
  for (const mutate of [
    (_r, g) => { g.inputEquivalent = true; },
    (_r, g) => { g.finalRasterVerified = true; },
    (_r, g) => { g.classification = 'equivalent-representation'; },
    (_r, g) => { g.reviewEvidence.referenceChain.at(-1).attributes.d = 'invented'; },
    (_r, g) => { g.reviewEvidence.referenceChain.at(-1).computed.fill = '#abcdef'; },
    (_r, g) => { g.reviewEvidence.candidate.retained.fontSize = '99px'; },
    (_r, g) => { g.reviewEvidence.revision++; },
    (r, g) => { r.retainedTypography.gaps.push(structuredClone(g)); },
    r => { r.retainedTypography.gaps = r.retainedTypography.gaps.filter(g => g.element !== 'select-caret'); },
    r => { r.elementInventory.variants.find(v => v.side === 'reference').nodes.find(n => n.type === 'path').attributes.d = 'changed'; },
    r => { r.elementInventory.styles.find(s => s.side === 'reference').value.fill = '#abcdef'; },
    r => { r.elementInventory.styles.find(s => s.side === 'astylar' && s.value.fontSize === '12px').value.top = '99px'; },
  ]) {
    const report = structuredClone(baseline), gap = report.retainedTypography.gaps.find(g => g.element === 'select-caret');
    mutate(report, gap);
    assert.ok(validateMaterialInputAudit(report, { requireComplete: false }).some(e => e.includes('select vector-to-glyph')), String(mutate));
  }
});

function disabledComponentInkReport(family = 'select', dark = false) {
  const select = family === 'select', raw = select ? selectValueTokenReport() : expansionFontReport('16px');
  const { reference: r, astylar: a } = raw.results[0].inputTrees;
  const color = dark ? 'rgba(230,225,229,0.38)' : 'rgba(29,27,32,0.38)';
  const opaque = select ? '#79747e' : dark ? '#69666a' : '#a9a6aa';
  r.styles = r.styles.map(s => ({ ...s, color }));
  const rule = (selector, value) => ({ selector, active: true, conditions: [], declarations: { color: { value, important: false } } });
  if (select) {
    r.rules = [rule('.mat-mdc-select', 'var(--mat-select-enabled-trigger-text-color, var(--mat-sys-on-surface))'),
      rule('.mat-mdc-select-disabled', 'var(--mat-select-disabled-trigger-text-color, color-mix(in srgb, var(--mat-sys-on-surface) 38%, transparent))')];
    const host = r.nodes.find(n => n.type === 'mat-select');
    host.rules = [0, 1]; host.attributes['aria-disabled'] = 'true'; host.attributes.class += ' mat-mdc-select-disabled';
    const leaf = a.nodes.find(n => n.authored.id === 'select-value');
    a.nodes.push({ key: 'control', parent: leaf.parent, authored: { type: 'input', id: 'select-control', role: 'combobox', disabled: true, value: 'Team' },
      resolvedStyle: {}, normalResolvedStyle: {}, interactionResolvedStyle: {} });
    for (const stage of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle']) leaf[stage].color = opaque;
    leaf.retainedText.style.color = opaque;
    a.rules.find(r => r.selector === '.select-value').color = opaque;
  } else {
    r.rules = [rule('.mat-expansion-panel-header-title', 'var(--mat-expansion-header-text-color, var(--mat-sys-on-surface))'),
      rule('.mat-expansion-panel-header[aria-disabled="true"] .mat-expansion-panel-header-title, .mat-expansion-panel-header[aria-disabled="true"] .mat-expansion-panel-header-description', 'inherit'),
      rule('.mat-expansion-panel-header[aria-disabled="true"]', 'var(--mat-expansion-header-disabled-state-text-color, color-mix(in srgb, var(--mat-sys-on-surface) 38%, transparent))')];
    r.nodes[0].rules = [0, 1]; r.nodes[2].rules = [2];
    Object.assign(r.nodes[2].attributes, { role: 'button', 'aria-disabled': 'true' });
    const trigger = a.nodes.find(n => n.authored.id === 'expansion-primary');
    Object.assign(trigger.authored, { role: 'button', ariaDisabled: true, class: 'expansion-trigger disabled' });
    for (const stage of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle']) trigger[stage].color = opaque;
    a.nodes[0].retainedText.style.color = opaque;
    a.rules.push({ selector: '.expansion-trigger', color: dark ? '#e6e1e5' : '#1d1b20' }, { selector: '.expansion-trigger.disabled', color: opaque });
  }
  return raw;
}

test('disabled component ink preserves translucent tokens and opaque candidate cascade', () => {
  for (const family of ['select', 'expansion']) for (const dark of [false, true]) {
    const raw = disabledComponentInkReport(family, dark), before = structuredClone(raw), report = buildMaterialInputAudit(raw);
    const f = report.retainedTypography.differences.find(d => d.attribution === 'reviewed-disabled-component-opaque-ink-input');
    assert.ok(f, `${family}/${dark}`);
    assert.equal(f.inputEquivalent, false); assert.equal(f.finalRasterVerified, false);
    assert.equal(f.reviewEvidence.referenceChain.length, family === 'select' ? 5 : 3);
    assert.equal(f.reviewEvidence.candidateChain.length, family === 'select' ? 1 : 2);
    assert.equal(f.reviewEvidence.referenceChain.at(-1).attributes['aria-disabled'], 'true');
    assert.ok(!validateMaterialInputAudit(report, { requireComplete: false }).some(e => e.includes('disabled component ink')));
    assert.deepEqual(raw, before);
  }
});

test('disabled component ink refuses missing state cascade inheritance and stage evidence', () => {
  const controls = [
    (r, a, ref, leaf) => { delete r.errors; },
    (r, a, ref, leaf) => { a.resolvedStyleEvidenceVersion = 1; },
    (r, a, ref, leaf) => { a.resolvedStyleSource = 'paint'; },
    (r, a, ref, leaf) => { ref.parent = 'missing'; },
    (r, a, ref, leaf) => { ref.inline = { color: { value: 'red' } }; },
    (r, a, ref, leaf) => { ref.attributes.style = 'all: initial'; },
    (r, a, ref, leaf) => { r.rules.at(-1).active = false; },
    (r, a, ref, leaf) => { r.rules.at(-1).conditions = ['@media print']; },
    (r, a, ref, leaf) => { r.rules.at(-1).declarations.color.important = true; },
    (r, a, ref, leaf) => { r.rules.at(-1).declarations.color.value = 'rgba(29,27,32,.38)'; },
    (r, a, ref, leaf) => { r.rules.at(-1).declarations.all = { value: 'initial' }; },
    (r, a, ref, leaf) => { r.nodes.find(n => n.attributes?.['aria-disabled']).attributes['aria-disabled'] = 'false'; },
    (r, a, ref, leaf) => { r.nodes.find(n => n.attributes?.['aria-disabled']).attributes.role = 'link'; },
    (r, a, ref, leaf) => { const control = a.nodes.find(n => n.authored?.disabled || n.authored?.ariaDisabled); control.authored.disabled = false; control.authored.ariaDisabled = false; },
    (r, a, ref, leaf) => { leaf.authored.style = { color: 'red' }; },
    (r, a, ref, leaf) => { leaf.authored.class = 'other'; },
    (r, a, ref, leaf) => { leaf.authored.textContent = 'Other'; },
    (r, a, ref, leaf) => { leaf.retainedText.style.color = '#112233'; },
    (r, a, ref, leaf) => { leaf.interactionResolvedStyle.color = '#112233'; },
    (r, a, ref, leaf) => { a.rules.push({ selector: `#${leaf.authored.id}`, color: '#112233' }); },
    (r, a, ref, leaf) => { a.rules.push({ selector: `#${leaf.authored.id}`, transition: 'color 1s' }); },
    (r, a, ref, leaf) => { a.rules.at(-1).mediaMaxWidth = '500px'; },
    (r, a, ref, leaf) => { a.rules.push(structuredClone(a.rules.at(-1))); },
    (r, a, ref, leaf) => { a.nodes.push(structuredClone(leaf)); },
  ];
  for (const family of ['select', 'expansion']) for (const [index, mutate] of controls.entries()) {
    const raw = disabledComponentInkReport(family), { reference: r, astylar: a } = raw.results[0].inputTrees;
    const leaf = a.nodes.find(n => n.authored?.id === (family === 'select' ? 'select-value' : 'expansion-title'));
    const ref = r.nodes.find(n => n.ownText === leaf.authored.textContent);
    mutate(r, a, ref, leaf);
    const evidence = collectRetainedTypographyEvidence(raw.results, collectFullTreeInventory(raw.results));
    assert.ok(!evidence.differences.some(d => d.attribution === 'reviewed-disabled-component-opaque-ink-input'), `${family}/${index}`);
  }
});

test('disabled component ink claims replay whole inventory and reject removed or altered reports', () => {
  for (const family of ['select', 'expansion']) {
    const baseline = buildMaterialInputAudit(disabledComponentInkReport(family));
    for (const [index, mutate] of [
      (r, f) => { f.inputEquivalent = true; }, (r, f) => { f.finalRasterVerified = true; },
      (r, f) => { f.reviewEvidence.referenceChain.pop(); }, (r, f) => { f.reviewEvidence.candidateChain.pop(); },
      (r, f) => { f.reviewEvidence.revision++; }, (r, f) => { f.reviewEvidence.control.authored.role = 'link'; },
      (r, f) => { f.values.retained = '#000000'; }, (r, f) => { f.family = 'chips'; },
      (r, f) => { r.retainedTypography.differences = []; }, (r, f) => { r.retainedTypography.comparisons = []; },
      (r, f) => { r.retainedTypography.differences.push(structuredClone(f)); },
    ].entries()) {
      const report = structuredClone(baseline), f = report.retainedTypography.differences.find(d => d.attribution === 'reviewed-disabled-component-opaque-ink-input');
      mutate(report, f);
      assert.ok(validateMaterialInputAudit(report, { requireComplete: false }).some(e => e.includes('disabled component ink')), `${family}/${index}`);
    }
  }
});

function selectValueTokenReport() {
  const raw = templateTypographyReport('select'), { reference, astylar } = raw.results[0].inputTrees;
  const computed = { ...reference.styles[0], fontFamily: 'Roboto', fontSize: '16px', lineHeight: '24px',
    letterSpacing: '0.496px', color: '#e6e1e5' };
  reference.styles = [computed];
  reference.rules = [{ selector: '.mat-mdc-select', active: true, declarations: {
    'font-family': { value: 'var(--mat-select-trigger-text-font, var(--mat-sys-body-large-font))' },
    'line-height': { value: 'var(--mat-select-trigger-text-line-height, var(--mat-sys-body-large-line-height))' },
    'letter-spacing': { value: 'var(--mat-select-trigger-text-tracking, var(--mat-sys-body-large-tracking))' },
    color: { value: 'var(--mat-select-enabled-trigger-text-color, var(--mat-sys-on-surface))' },
  } }];
  reference.nodes.find((node) => node.type === 'mat-select').rules = [0];
  const leaf = astylar.nodes.at(-1);
  for (const node of astylar.nodes) for (const stage of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle']) {
    node[stage] = { display: 'block', ...(node === leaf ? { color: '#1d1b20', fontSize: '16px' } : {}) };
  }
  leaf.retainedText.style = { ...computed, fontFamily: 'Roboto, Arial, sans-serif', lineHeight: 'normal', letterSpacing: '0px', color: '#1d1b20' };
  astylar.nodes[0].parent = 'root/page';
  astylar.nodes.unshift({ key: 'root/page', parent: 'root', authored: { type: 'main', id: 'page' },
    resolvedStyle: { fontFamily: 'Roboto, Arial, sans-serif' }, normalResolvedStyle: { fontFamily: 'Roboto, Arial, sans-serif' },
    interactionResolvedStyle: { fontFamily: 'Roboto, Arial, sans-serif' } });
  astylar.rules = [{ selector: '#page', fontFamily: 'Roboto, Arial, sans-serif' },
    { selector: '.select-value', fontSize: '16px', color: '#1d1b20' }];
  return raw;
}

test('select typography attribution follows original component tokens and candidate omission or fixed-ink evidence', () => {
  const raw = selectValueTokenReport(), before = structuredClone(raw), report = buildMaterialInputAudit(raw);
  const differences = report.retainedTypography.differences;
  assert.equal(differences.length, 4);
  assert.deepEqual(differences.map((entry) => entry.property).sort(), ['color', 'fontFamily', 'letterSpacing', 'lineHeight']);
  for (const entry of differences) {
    assert.equal(entry.attribution, 'reviewed-select-value-token-input');
    assert.equal(entry.classification, 'application-plugin-authoring-defect');
    assert.equal(entry.reviewEvidence.referenceChain.length, 5);
    assert.equal(entry.reviewEvidence.sourceFinding, 'fixture-select-value-typography-substitution');
  }
  assert.equal(report.summary.inputEquivalent, false);
  assert.ok(!validateMaterialInputAudit(report).some((error) => error.includes('retained typography differences')));
  assert.deepEqual(raw, before);
  assert.equal(report.sourceFindings.find((entry) => entry.id === 'fixture-select-value-typography-substitution').detected, true);
});

test('select token attribution rejects contradictory inheritance, authored rules and retained values', () => {
  const mutations = [
    ['lineHeight', (r, a) => { r.rules[0].declarations['line-height'].value = '23px'; }],
    ['lineHeight', (r, a) => { r.rules[0].active = false; }],
    ['lineHeight', (r, a) => { r.nodes.at(-1).inline = { 'line-height': { value: '24px' } }; }],
    ['lineHeight', (r, a) => { a.nodes[1].normalResolvedStyle.lineHeight = '24px'; }],
    ['lineHeight', (r, a) => { a.nodes[1].interactionResolvedStyle.lineHeight = '24px'; }],
    ['lineHeight', (r, a) => { a.rules[1].lineHeight = '24px'; }],
    ['lineHeight', (r, a) => { a.nodes.at(-1).retainedText.style.lineHeight = '25px'; }],
    ['fontFamily', (r, a) => { a.nodes[2].normalResolvedStyle.fontFamily = 'Roboto'; }],
    ['fontFamily', (r, a) => { a.rules[0].fontFamily = 'Arial'; }],
    ['fontFamily', (r, a) => { a.nodes[0].interactionResolvedStyle.fontFamily = 'Arial'; }],
    ['fontFamily', (r, a) => { a.nodes[1].parent = 'missing'; }],
    ['letterSpacing', (r, a) => { a.nodes[0].normalResolvedStyle.font = '16px Roboto'; }],
    ['letterSpacing', (r, a) => { a.nodes[0].interactionResolvedStyle.letterSpacing = '0px'; }],
    ['color', (r, a) => { a.rules[1].color = '#000000'; }],
    ['color', (r, a) => { a.nodes.at(-1).interactionResolvedStyle.color = '#000000'; }],
    ['color', (r, a) => { r.rules.push({ selector: '.override', active: true, declarations: { color: { value: '#e6e1e5' } } }); r.nodes.at(-1).rules = [1]; }],
  ];
  for (const [property, mutate] of mutations) {
    const raw = selectValueTokenReport(), { reference, astylar } = raw.results[0].inputTrees;
    mutate(reference, astylar);
    const difference = buildMaterialInputAudit(raw).retainedTypography.differences.find((entry) => entry.property === property);
    assert.ok(difference, property);
    assert.equal(difference.attribution, 'unresolved', property);
  }
});

test('template identity rejects path, uniqueness, text, child and ID conflicts instead of string matching', () => {
  const mutations = [
    (ref, _ast, leaf) => { leaf.ownText = 'Different'; },
    (ref, _ast, leaf) => { leaf.parent = 'other'; },
    (ref, _ast, leaf) => { leaf.type = 'button'; },
    (ref, _ast, leaf) => {
      if (leaf.attributes.class) leaf.attributes.class = 'unrelated';
      else ref.nodes.find((node) => node.key === leaf.parent).attributes.class = 'unrelated';
    },
    (ref, _ast, leaf) => { ref.nodes.push({ ...leaf, key: 'duplicate' }); },
    (ref, _ast, leaf, target) => { ref.nodes.push({ key: 'conflict', attributes: { id: target.authored.id } }); },
    (ref, _ast, leaf) => { ref.nodes.push({ key: 'child', parent: leaf.key }); },
    (_ref, ast, _leaf, target) => { target.parent = 'other'; },
    (_ref, ast, _leaf, target) => { target.authored.type = 'button'; },
    (_ref, ast, _leaf, target) => {
      if (target.authored.class) target.authored.class = 'unrelated';
      else ast.nodes.find((node) => node.key === target.parent).authored.class = 'unrelated';
    },
    (_ref, ast, _leaf, target) => { ast.nodes.push({ ...target, key: 'duplicate' }); },
    (_ref, ast, _leaf, target) => { ast.nodes.push({ key: 'child', parent: target.key }); },
    (ref) => { ref.nodes[0].attributes.id = 'other-anchor'; },
    (_ref, ast) => { ast.nodes[0].authored.id = 'other-anchor'; },
  ];
  for (const family of ['tree', 'grid-list', 'badge', 'sort', 'expansion', 'sidenav', 'button-toggle', 'chips', 'paginator', 'stepper', 'select']) {
    for (const mutate of mutations) {
      const { reference, astylar } = templateTypographyReport(family).results[0].inputTrees;
      const mapping = reviewedTemplateTextMappings(family, reference, astylar)[0];
      mutate(reference, astylar, reference.nodes.find((node) => node.key === mapping.referenceNode),
        astylar.nodes.find((node) => node.key === mapping.astylarNode));
      assert.ok(!reviewedTemplateTextMappings(family, reference, astylar).some((entry) => entry.element === mapping.element), family);
    }
  }
  const { reference, astylar } = templateTypographyReport('badge').results[0].inputTrees;
  reference.nodes[1].attributes.id = 'unrelated-472';
  assert.deepEqual(reviewedTemplateTextMappings('badge', reference, astylar), []);
  assert.deepEqual(reviewedTemplateTextMappings('unreviewed-family', reference, astylar), []);
});

test('same-ID wrapper aliases cannot hide their own text or unrelated competing IDs', () => {
  for (const mutate of [
    (ref) => { ref.nodes[1].ownText = 'Navigation'; },
    (ref) => { ref.nodes[1].attributes.id = 'different'; ref.nodes.push({ key: 'elsewhere', attributes: { id: 'sidenav-nav' } }); },
    (ref) => { ref.nodes.push({ ...ref.nodes[1], key: 'duplicate' }); },
  ]) {
    const { reference, astylar } = templateTypographyReport('sidenav').results[0].inputTrees;
    mutate(reference);
    assert.deepEqual(reviewedTemplateTextMappings('sidenav', reference, astylar), []);
  }
  const { reference, astylar } = templateTypographyReport('expansion').results[0].inputTrees;
  reference.nodes[2].attributes.id = 'unrelated-93';
  assert.deepEqual(reviewedTemplateTextMappings('expansion', reference, astylar), []);
});

test('chip text ownership only permits its exact empty focus-indicator leaf', () => {
  for (const mutate of [
    (ref, child) => { child.ownText = 'Additional text'; },
    (ref, child) => { child.attributes.id = 'other'; },
    (ref, child) => { child.attributes.class += ' unknown'; },
    (ref, child) => { child.type = 'button'; },
    (ref, child) => { ref.nodes.push({ ...child, key: 'another-child' }); },
    (ref, child) => { ref.nodes.push({ key: 'nested', parent: child.key, type: 'span', attributes: {}, ownText: '' }); },
    (ref, child) => { ref.nodes = ref.nodes.filter((node) => node !== child); },
  ]) {
    const { reference, astylar } = templateTypographyReport('chips').results[0].inputTrees;
    const mapping = reviewedTemplateTextMappings('chips', reference, astylar)[0];
    assert.equal(mapping.referenceDecorationNodes.length, 1);
    mutate(reference, reference.nodes.find((node) => node.key === mapping.referenceDecorationNodes[0]));
    assert.ok(!reviewedTemplateTextMappings('chips', reference, astylar).some((entry) => entry.element === mapping.element));
  }
});

test('stepper mapping distinguishes current content from hidden panels and numbered icons from completed icons', () => {
  const raw = templateTypographyReport('stepper');
  const { reference, astylar } = raw.results[0].inputTrees;
  const panel = reference.nodes.find((node) => node.attributes.id === 'cdk-stepper-38-content-0');
  const text = reference.nodes.find((node) => node.parent === panel.key);
  reference.nodes.push({ ...panel, key: 'hidden-panel', attributes: { id: 'cdk-stepper-38-content-1', class: 'mat-horizontal-stepper-content-next' } },
    { ...text, key: 'hidden-text', parent: 'hidden-panel', ownText: 'Review changes' });
  assert.equal(reviewedTemplateTextMappings('stepper', reference, astylar).find((entry) => entry.element === 'stepper-content').referenceNode, text.key);
  const report = buildMaterialInputAudit(raw);
  assert.ok(report.retainedTypography.gaps.some((gap) => gap.referenceNodes?.includes('hidden-text')), 'unmatched hidden content must remain inventoried');
  text.attributes['data-parity-id'] = 'other';
  assert.ok(!reviewedTemplateTextMappings('stepper', reference, astylar).some((entry) => entry.element === 'stepper-content'));
  text.attributes['data-parity-id'] = 'stepper-content';
  panel.attributes.class = 'mat-horizontal-stepper-content-previous';
  reference.nodes.find((node) => node.key === 'hidden-panel').attributes.class = 'mat-horizontal-stepper-content-current';
  astylar.nodes.find((node) => node.authored.id === 'stepper-content').authored.textContent = 'Review changes';
  assert.equal(reviewedTemplateTextMappings('stepper', reference, astylar).find((entry) => entry.element === 'stepper-content').referenceNode, 'hidden-text');
  reference.nodes.find((node) => node.key === 'r/w/h/0/i').attributes.class = 'mat-step-icon-state-edit';
  assert.ok(!reviewedTemplateTextMappings('stepper', reference, astylar).some((entry) => entry.element === 'step-details-badge'));
});

function controlLabelTypographyReport(family) {
  const raw = templateTypographyReport(family);
  const { reference, astylar } = raw.results[0].inputTrees;
  const chip = family === 'chips', component = chip ? 'chip' : 'button-toggle';
  reference.styles[0] = { ...reference.styles[0], fontWeight: '500', letterSpacing: chip ? '.096px' : 'normal' };
  reference.rules = [{ active: true,
    selector: chip ? '.mat-mdc-standard-chip .mdc-evolution-chip__text-label' : '.mat-button-toggle-appearance-standard',
    declarations: {
      'font-weight': { value: `var(--mat-${component}-label-text-weight, var(--mat-sys-label-large-weight))` },
      'letter-spacing': { value: `var(--mat-${component}-label-text-tracking, var(--mat-sys-label-large-tracking))` },
    } }];
  for (const node of reference.nodes) {
    if (chip ? !!node.ownText : node.type === 'mat-button-toggle') node.rules = [0];
  }
  for (const node of astylar.nodes) {
    node.normalResolvedStyle = {};
    node.interactionResolvedStyle = {};
    if (node.retainedText) node.retainedText.style = { ...reference.styles[0], fontWeight: 'normal', letterSpacing: '0px' };
  }
  astylar.nodes[0].parent = 'page-key';
  astylar.nodes.push({ key: 'page-key', parent: 'root', authored: { type: 'main', id: 'page' },
    normalResolvedStyle: {}, interactionResolvedStyle: {}, resolvedStyle: {} });
  return raw;
}

test('control label tokens classify missing weight and chip tracking without accepting unequal inputs', () => {
  for (const family of ['chips', 'button-toggle']) {
    const report = buildMaterialInputAudit(controlLabelTypographyReport(family));
    const differences = report.retainedTypography.differences;
    const attributed = differences.filter((entry) => entry.attribution === 'reviewed-control-label-token-input');
    assert.equal(attributed.length, family === 'chips' ? 4 : 2);
    assert.ok(attributed.every((entry) => entry.classification === 'application-plugin-authoring-defect' &&
      entry.values.normal === undefined && entry.values.effective === undefined && entry.reviewEvidence.candidateChain.length === 4));
    assert.ok(attributed.filter((entry) => entry.property === 'fontWeight').every((entry) =>
      entry.values.reference === '500' && entry.values.retained === '400'));
    assert.equal(report.summary.inputEquivalent, false);
    if (family === 'button-toggle') assert.ok(differences.filter((entry) => entry.property === 'letterSpacing').every((entry) => entry.attribution === 'unresolved'));
  }
});

test('control token attribution rejects absent active rules and incomplete or contradictory ancestry', () => {
  for (const family of ['chips', 'button-toggle']) {
    for (const mutate of [
      (r) => { r.rules[0].active = false; },
      (r) => { r.rules[0].selector = '.unrelated'; },
      (r) => { r.rules[0].declarations['font-weight'].value = '500'; },
      (r) => { r.styles[0].fontWeight = '600'; },
      (_r, a) => { a.nodes[1].normalResolvedStyle.fontWeight = '500'; },
      (_r, a) => { a.nodes[1].interactionResolvedStyle.font = '500 14px Roboto'; },
      (_r, a) => { a.nodes[0].parent = 'missing'; },
      (_r, a) => { a.nodes[0].parent = a.nodes[0].key; },
      (_r, a) => { delete a.nodes[0].interactionResolvedStyle; delete a.nodes[0].resolvedStyle; },
      (_r, a) => { a.nodes.at(-1).normalResolvedStyle.fontWeight = '500'; },
      (_r, a) => { a.nodes.at(-1).authored.type = 'div'; },
    ]) {
      const raw = controlLabelTypographyReport(family);
      mutate(raw.results[0].inputTrees.reference, raw.results[0].inputTrees.astylar);
      const report = buildMaterialInputAudit(raw);
      const element = family === 'chips' ? 'chip-0-label' : 'button-toggle-one-label';
      assert.ok(!report.retainedTypography.differences.some((entry) => entry.element === element &&
        entry.property === 'fontWeight' && entry.attribution === 'reviewed-control-label-token-input'));
    }
  }
});

function treeFontTypographyReport(size = '14.4px') {
  const raw = templateTypographyReport('tree');
  const { reference, astylar } = raw.results[0].inputTrees;
  reference.styles[0] = { ...reference.styles[0], fontSize: '16px' };
  reference.rules = [{ active: true, selector: '.mat-tree-node, .mat-nested-tree-node',
    declarations: { 'font-size': { value: 'var(--mat-tree-node-text-size, var(--mat-sys-body-large-size))' } } }];
  for (const node of reference.nodes.filter((node) => node.ownText)) node.rules = [0];
  for (const node of astylar.nodes) {
    node.normalResolvedStyle = {};
    node.interactionResolvedStyle = {};
    if (node.retainedText) node.retainedText.style = { ...reference.styles[0], fontSize: size };
  }
  astylar.nodes[0].parent = 'page-key';
  astylar.nodes.push({ key: 'page-key', parent: 'root', authored: { type: 'main', id: 'page' },
    normalResolvedStyle: { fontSize: size }, interactionResolvedStyle: { fontSize: size }, resolvedStyle: { fontSize: size } });
  astylar.rules = [{ selector: '#page', fontSize: size }];
  return raw;
}

function treeLineBoxReport(size = '16px', inherited = false) {
  const raw = treeFontTypographyReport(size), { reference: ref, astylar: ast } = raw.results[0].inputTrees;
  ref.styles[0] = { ...ref.styles[0], lineHeight: 'normal', display: 'flex' };
  ref.nodes[0].parent = 'frame';
  ref.nodes.push({ key: 'frame', parent: null, type: 'main', attributes: { class: 'frame benchmark' },
    ownText: '', style: 0, rules: [], pseudoElements: [] });
  if (inherited) {
    ref.rules.push({ active: true, selector: '.mat-tree-node', declarations: { 'line-height': { value: 'inherit' } } });
    for (const n of ref.nodes.filter(n => n.ownText)) n.rules.push(1);
  }
  const rule = { selector: '.tree-label', height: '20px', lineHeight: '20px', verticalAlign: 'middle' };
  ast.rules.push(rule);
  for (const n of ast.nodes.filter(n => n.retainedText)) {
    const style = { height: '20px', lineHeight: '20px', verticalAlign: 'middle' };
    n.normalResolvedStyle = { ...style };
    n.interactionResolvedStyle = { ...style };
    n.resolvedStyle = { ...style };
    n.retainedText.style.lineHeight = '20px';
    const parent = ast.nodes.find(p => p.key === n.parent);
    parent.normalResolvedStyle = { display: 'flex', alignItems: 'center' };
    parent.interactionResolvedStyle = { display: 'flex', alignItems: 'center' };
    parent.resolvedStyle = { display: 'flex', alignItems: 'center' };
  }
  return raw;
}

test('tree line-box substitution preserves normal reference ancestry and fixed candidate wrapper inputs', () => {
  for (const size of ['16px', '14.4px', '18.4px']) for (const inherited of [false, true]) {
    const raw = treeLineBoxReport(size, inherited), before = structuredClone(raw);
    const report = buildMaterialInputAudit(raw);
    const findings = report.retainedTypography.differences.filter(d => d.attribution === 'reviewed-tree-label-line-box-substitution');
    assert.equal(findings.length, 3);
    for (const f of findings) {
      assert.equal(f.classification, 'application-plugin-authoring-defect');
      assert.equal(f.inputEquivalent, false);
      assert.equal(f.currentPseudoStatePaintVerified, false);
      assert.deepEqual(f.values, { reference: 'normal', normal: '20px', effective: '20px', retained: '20px' });
      assert.equal(f.reviewEvidence.referenceChain.length, 3);
      assert.equal(f.reviewEvidence.referenceChain.at(-1).node, 'frame');
      assert.equal(f.reviewEvidence.candidateParent.normal.alignItems, 'center');
      assert.equal(f.reviewEvidence.candidateRule.height, '20px');
      assert.ok(report.sourceFindings.find(s => s.id === f.reviewEvidence.sourceFinding)?.detected);
    }
    assert.ok(!validateMaterialInputAudit(report, { requireComplete: false }).some(e => e.includes('tree label line-box attributions')));
    assert.equal(report.summary.inputEquivalent, false);
    assert.deepEqual(raw, before);
  }
});

test('tree line-box attribution rejects changed structure, ambiguous rules and incomplete normal ancestry', () => {
  const mutations = [
    (r) => { r.nodes[0].parent = 'missing'; },
    (r) => { r.nodes[0].parent = r.nodes[0].key; },
    (r) => { r.nodes.at(-1).type = 'div'; },
    (r) => { r.nodes.at(-1).parent = 'outer'; },
    (r) => { r.nodes.at(-1).attributes.class = 'other'; },
    (r) => { r.nodes.push(structuredClone(r.nodes.at(-1))); },
    (r) => { r.styles[0].lineHeight = '20px'; },
    (r) => { r.styles[0].display = 'block'; },
    (r) => { r.rules[0].declarations['line-height'] = { value: '20px' }; },
    (r) => { r.rules[0].declarations.font = { value: '16px/20px Roboto' }; },
    (r) => { r.rules[0].declarations.all = { value: 'revert' }; },
    (r) => { r.nodes.at(-1).attributes.style = 'line-height: normal'; },
    (r) => { r.nodes.at(-1).inline = { 'line-height': { value: 'normal' } }; },
    (_r, a) => { a.rules[1].height = '21px'; },
    (_r, a) => { a.rules[1].lineHeight = '21px'; },
    (_r, a) => { a.rules[1].verticalAlign = 'baseline'; },
    (_r, a) => { a.rules.push({ ...a.rules[1] }); },
    (_r, a) => { a.rules[1].mediaMaxWidth = '500px'; },
    (_r, a) => { a.rules[1].font = '16px/20px Roboto'; },
    (_r, a) => { for (const n of a.nodes.filter(n => n.retainedText)) n.normalResolvedStyle.lineHeight = '21px'; },
    (_r, a) => { for (const n of a.nodes.filter(n => n.retainedText)) n.interactionResolvedStyle.height = '21px'; },
    (_r, a) => { for (const n of a.nodes.filter(n => n.retainedText)) n.retainedText.style.lineHeight = 'normal'; },
    (_r, a) => { for (const n of a.nodes.filter(n => n.authored?.class === 'tree-item')) n.interactionResolvedStyle.alignItems = 'start'; },
  ];
  for (const mutate of mutations) {
    const raw = treeLineBoxReport();
    mutate(raw.results[0].inputTrees.reference, raw.results[0].inputTrees.astylar);
    const evidence = collectRetainedTypographyEvidence(raw.results, collectFullTreeInventory(raw.results));
    assert.ok(!evidence.differences.some(d => d.attribution === 'reviewed-tree-label-line-box-substitution'), String(mutate));
  }
});

test('tree line-box attribution replays structure, ancestry, declarations and retained values', () => {
  const baseline = buildMaterialInputAudit(treeLineBoxReport());
  const mutations = [
    (_r, f) => { f.reviewEvidence.referenceChain.pop(); },
    (_r, f) => { f.reviewEvidence.candidateRule.height = '21px'; },
    (_r, f) => { f.reviewEvidence.candidateParent.normal.alignItems = 'start'; },
    (_r, f) => { f.values.retained = 'normal'; },
    (_r, f) => { f.inputEquivalent = true; },
    (_r, f) => { f.classification = 'confirmed-core-renderer-defect'; },
    (r, f) => { r.retainedTypography.differences.push(structuredClone(f)); },
    r => { r.retainedTypography.differences = []; },
    r => { r.retainedTypography.comparisons[0].properties.lineHeight.normal = 'normal'; },
    r => { r.elementInventory.rules.find(s => s.side === 'astylar' && s.value.selector === '.tree-label').value.lineHeight = '21px'; },
    r => { r.elementInventory.variants.find(v => v.side === 'reference').nodes.find(n => n.key === 'frame').parent = 'missing'; },
  ];
  for (const mutate of mutations) {
    const report = structuredClone(baseline);
    mutate(report, report.retainedTypography.differences.find(d => d.attribution === 'reviewed-tree-label-line-box-substitution'));
    assert.ok(validateMaterialInputAudit(report, { requireComplete: false }).some(e => e.includes('tree label line-box attributions')), String(mutate));
  }
});

test('tree font attribution requires explicit Material token and complete candidate inheritance evidence', () => {
  for (const size of ['14.4px', '18.4px']) {
    const raw = treeFontTypographyReport(size);
    const report = buildMaterialInputAudit(raw);
    const differences = report.retainedTypography.differences;
    assert.equal(differences.length, 3);
    assert.ok(differences.every((entry) => entry.attribution === 'reviewed-tree-font-input' &&
      entry.classification === 'application-plugin-authoring-defect' && entry.values.normal === undefined &&
      entry.values.effective === undefined && entry.values.retained === size && entry.reviewEvidence.candidateChain.length === 4));
    assert.equal(report.summary.inputEquivalent, false);
    assert.ok(!validateMaterialInputAudit(report).some((error) => error.includes('retained typography differences')));
  }
});

test('tree attribution rejects missing stages, interrupted chains and competing font evidence', () => {
  const mutations = [
    (r) => { r.rules[0].active = false; },
    (r) => { r.rules[0].declarations['font-size'].value = '14.4px'; },
    (r) => { r.rules[0].selector = '.unrelated'; },
    (r) => { r.styles[0].fontSize = '17px'; },
    (_r, a) => { a.nodes[1].normalResolvedStyle = { fontSize: '14.4px' }; },
    (_r, a) => { a.nodes[1].interactionResolvedStyle = { fontSize: '14.4px' }; },
    (_r, a) => { a.nodes[1].normalResolvedStyle = { font: '14.4px Roboto' }; },
    (_r, a) => { delete a.nodes[1].interactionResolvedStyle; },
    (_r, a) => { a.nodes[0].parent = 'missing'; },
    (_r, a) => { a.nodes.at(-1).parent = 'different-root'; },
    (_r, a) => { a.nodes.at(-1).interactionResolvedStyle.fontSize = '16px'; },
    (_r, a) => { a.rules[0].fontSize = '16px'; },
    (_r, a) => { a.rules.push({ selector: '#page', fontSize: '18.4px' }); },
    (_r, a) => { a.nodes.push({ ...a.nodes.at(-1), key: 'another-page' }); },
  ];
  for (const mutate of mutations) {
    const raw = treeFontTypographyReport();
    mutate(raw.results[0].inputTrees.reference, raw.results[0].inputTrees.astylar);
    const report = buildMaterialInputAudit(raw);
    assert.ok(!report.retainedTypography.differences.some((entry) => entry.element === 'tree-item-0-label' && entry.attribution === 'reviewed-tree-font-input'));
  }
});

function headingTypographyReport() {
  const raw = retainedTypographyReport();
  const entry = raw.results[0];
  entry.styleInputs = [];
  const reference = entry.inputTrees.reference, astylar = entry.inputTrees.astylar;
  const refStyle = { ...reference.styles[0], opacity: '0' };
  const astStyle = { ...refStyle, color: '#ffffff', opacity: '1.0' };
  reference.styles = [refStyle, { color: '#000000', opacity: '1' }];
  reference.rules = [{ selector: '.benchmark > .eyebrow, .benchmark > h1', declarations: { opacity: { value: '0' } }, active: true }];
  reference.nodes = [{ key: 'frame', parent: null, type: 'main', attributes: { class: 'frame benchmark' },
    ownText: '', style: 1, rules: [], pseudoElements: [] }];
  const pageStyle = { background: '#ffffff', opacity: '1' };
  astylar.nodes = [{ key: 'root/0', parent: 'root', authored: { type: 'main', id: 'page' },
    resolvedStyle: pageStyle, normalResolvedStyle: pageStyle, interactionResolvedStyle: pageStyle }];
  astylar.rules = [{ selector: '#page', background: '#ffffff' }];
  for (const [index, id, type, text] of [[0, 'eyebrow', 'p', 'Angular Material 20 reference'], [1, 'title', 'h1', 'core']]) {
    reference.nodes.push({ key: `frame/${index}`, parent: 'frame', type,
      attributes: id === 'eyebrow' ? { class: 'eyebrow' } : {}, ownText: text, style: 0, rules: [0], pseudoElements: [] });
    astylar.nodes.push({ key: `root/0/${index}`, parent: 'root/0', authored: { type, id, textContent: text },
      resolvedStyle: astStyle, normalResolvedStyle: astStyle, interactionResolvedStyle: astStyle,
      retainedText: { source: 'core-text-registry', style: astStyle } });
    astylar.rules.push({ selector: `#${id}`, color: '#ffffff' });
  }
  return raw;
}

test('reviewed heading identity maps anonymous reference headings without accepting their unequal paint', () => {
  const raw = headingTypographyReport();
  const report = buildMaterialInputAudit(raw);
  const evidence = report.retainedTypography;
  assert.equal(evidence.reviewedMappings.length, 2);
  assert.equal(evidence.comparisons.length, 2);
  assert.deepEqual(evidence.gaps, []);
  assert.equal(evidence.paintMaskDifferences.length, 2);
  assert.equal(evidence.differences.length, 2);
  assert.ok(evidence.differences.every((entry) => entry.property === 'color' && entry.attribution === 'reviewed-heading-mask'));
  assert.ok(evidence.paintMaskDifferences.every((entry) => entry.classification === 'parity-harness-defect' &&
    entry.reviewEvidence.referenceOpacity === '0' && entry.reviewEvidence.candidateOpacity === '1.0'));
  assert.equal(report.summary.inputEquivalent, false);
  assert.equal(raw.results[0].inputTrees.reference.nodes[1].attributes.id, undefined, 'mapping must not rewrite the captured input');
  assert.ok(!validateMaterialInputAudit(report).some((error) => error.includes('retained typography differences')),
    'classified audit findings are not unreviewed differences or accepted parity');
  delete evidence.differences[0].attribution;
  assert.ok(validateMaterialInputAudit(report).some((error) => error.includes('retained typography differences')));
});

test('heading aliases require exact unique identity, direct containment, and unchanged text', () => {
  const mutations = [
    (ref) => { ref.nodes[0].attributes.class = 'unrelated'; },
    (ref) => { ref.nodes[1].parent = 'other'; },
    (ref) => { ref.nodes[1].type = 'span'; },
    (ref) => { ref.nodes[1].ownText = 'Different'; },
    (ref) => { ref.nodes[1].attributes.id = 'different'; },
    (ref) => { ref.nodes.push({ ...ref.nodes[1], key: 'frame/extra' }); },
    (ref) => { ref.nodes.push({ ...ref.nodes[1], key: 'frame/conflict', type: 'div', attributes: { id: 'eyebrow' } }); },
    (_ref, ast) => { ast.nodes[1].authored.type = 'span'; },
    (_ref, ast) => { ast.nodes[1].parent = 'other'; },
    (_ref, ast) => { ast.nodes.push({ ...ast.nodes[1], key: 'root/0/duplicate' }); },
  ];
  for (const mutate of mutations) {
    const raw = headingTypographyReport();
    const { reference, astylar } = raw.results[0].inputTrees;
    mutate(reference, astylar);
    assert.ok(!reviewedHeadingMappings(reference, astylar).some((entry) => entry.element === 'eyebrow'));
  }
});

test('heading paint attribution requires active authored masking and matching page paint evidence', () => {
  const mutations = [
    (entry) => { entry.inputTrees.reference.rules[0].active = false; },
    (entry) => { entry.inputTrees.reference.rules[0].declarations.opacity.value = '.5'; },
    (entry) => { entry.inputTrees.astylar.rules[1].color = '#000000'; },
    (entry) => { entry.inputTrees.astylar.rules[0].background = '#000000'; },
    (entry) => { entry.inputTrees.astylar.nodes[0].interactionResolvedStyle = { background: '#000000' }; },
    (entry) => { entry.inputTrees.reference.styles[0].opacity = '1'; },
  ];
  for (const mutate of mutations) {
    const raw = headingTypographyReport();
    mutate(raw.results[0]);
    const evidence = collectRetainedTypographyEvidence(raw.results, collectFullTreeInventory(raw.results));
    assert.ok(!evidence.paintMaskDifferences.some((entry) => entry.element === 'eyebrow'));
    assert.ok(evidence.differences.some((entry) => entry.element === 'eyebrow' && entry.attribution === 'unresolved'));
  }
});

function tableTypographyReport() {
  const raw = retainedTypographyReport();
  const entry = raw.results[0], input = entry.styleInputs[0];
  entry.family = 'table';
  input.id = 'table-atlas';
  input.reference.fontSize = '14px';
  input.referenceStructure.type = 'td';
  input.astylarStructure.type = 'td';
  const { reference, astylar } = entry.inputTrees;
  const refCell = reference.nodes[0], astCell = astylar.nodes[0];
  refCell.type = 'td'; refCell.attributes.id = 'table-atlas'; refCell.parent = 'ref-row';
  astCell.authored.type = 'td'; astCell.authored.id = 'table-atlas'; astCell.parent = 'ast-row';
  astCell.retainedText.style = { ...astCell.retainedText.style, fontSize: '16px' };
  reference.rules = [{ selector: '.mat-mdc-row', active: true, declarations: { 'font-size': {
    value: 'var(--mat-table-row-item-label-text-size, var(--mat-sys-body-medium-size, 14px))' } } }];
  reference.nodes.push({ key: 'ref-row', parent: 'ref-table', type: 'tr', attributes: {}, ownText: '',
    style: 0, rules: [0], pseudoElements: [] },
  { key: 'ref-table', parent: null, type: 'table', attributes: { id: 'table-primary' }, ownText: '',
    style: 0, rules: [], pseudoElements: [] });
  astylar.rules = [{ selector: '.material-table td', fontSize: '16px' }];
  astylar.nodes.push({ key: 'ast-row', parent: 'ast-table', authored: { type: 'tr' }, resolvedStyle: { display: 'table-row' } },
    { key: 'ast-table', parent: 'root', authored: { type: 'table', id: 'table-primary', class: 'material-table' }, resolvedStyle: { display: 'table' } });
  return raw;
}

test('attributes the table font change through captured row tokens, cell declarations, and retained core text', () => {
  const report = buildMaterialInputAudit(tableTypographyReport());
  const difference = report.retainedTypography.differences.find((entry) => entry.property === 'fontSize');
  assert.equal(difference.attribution, 'reviewed-table-font-input');
  assert.equal(difference.classification, 'application-plugin-authoring-defect');
  assert.equal(difference.reviewEvidence.referenceRule.declarations['font-size'].value,
    'var(--mat-table-row-item-label-text-size, var(--mat-sys-body-medium-size, 14px))');
  assert.equal(difference.reviewEvidence.candidateRule.fontSize, '16px');
  const declarationDifference = report.discrepancies.find((entry) => entry.property === 'fontSize');
  assert.equal(declarationDifference.attribution, 'reviewed-table-font-input');
  assert.equal(declarationDifference.astylar, undefined, 'do not replace missing table snapshot fields with retained styles');
  assert.equal(report.summary.inputEquivalent, false);
});

test('table font attribution fails closed without exact captured intent and corresponding table structure', () => {
  const mutations = [
    (entry) => { entry.family = 'card'; },
    (entry) => { entry.inputTrees.astylar.rules[0].fontSize = '14px'; },
    (entry) => { entry.inputTrees.astylar.rules[0].selector = '.unrelated td'; },
    (entry) => { entry.inputTrees.astylar.rules.push({ selector: '.material-table td', fontSize: '18px' }); },
    (entry) => { entry.inputTrees.reference.rules[0].active = false; },
    (entry) => { entry.inputTrees.reference.rules[0].declarations['font-size'].value = '16px'; },
    (entry) => { entry.inputTrees.astylar.nodes[1].authored.type = 'div'; },
    (entry) => { entry.inputTrees.astylar.nodes[2].authored.class = 'other'; },
    (entry) => { entry.inputTrees.astylar.nodes[0].retainedText.style.fontSize = '20px'; },
  ];
  for (const mutate of mutations) {
    const raw = tableTypographyReport();
    mutate(raw.results[0]);
    const evidence = collectRetainedTypographyEvidence(raw.results, collectFullTreeInventory(raw.results));
    assert.equal(evidence.differences.find((entry) => entry.property === 'fontSize').attribution, 'unresolved');
  }
});

function floatingLabelTypographyReport() {
  const raw = retainedTypographyReport();
  const entry = raw.results[0];
  entry.family = 'form-field';
  const { reference, astylar } = entry.inputTrees;
  reference.styles[0] = { ...reference.styles[0], fontSize: '16px' };
  Object.assign(reference.nodes[0], { type: 'mat-label', attributes: { id: 'form-field-label' }, parent: 'floating' });
  reference.styles.push({ fontSize: '16px', transformOrigin: '0px 0px', transform: 'matrix(0.75, 0, 0, 0.75, 0, -20.14)' });
  reference.rules.push({ active: true, selector: '.mdc-floating-label--float-above',
    declarations: { transform: { value: 'translateY(-106%) scale(0.75)' } } });
  reference.nodes.push({ key: 'floating', parent: null, type: 'label',
    attributes: { class: 'mdc-floating-label--float-above' }, style: 1, rules: [0], pseudoElements: [] });
  const node = astylar.nodes[0];
  node.authored = { ...node.authored, id: 'form-field-label', type: 'label', class: 'field-label' };
  node.parent = 'page';
  const declarations = { ...node.resolvedStyle, fontSize: '12px', position: 'absolute', top: '8px', left: '16px' };
  node.resolvedStyle = node.normalResolvedStyle = node.interactionResolvedStyle = declarations;
  node.retainedText.style = { ...node.retainedText.style, fontSize: '12px' };
  astylar.nodes.push({ key: 'page', parent: 'root', authored: { type: 'main', id: 'page' },
    resolvedStyle: {}, normalResolvedStyle: {}, interactionResolvedStyle: {} });
  astylar.rules.push({ selector: '.field-label', fontSize: '12px', position: 'absolute', top: '8px', left: '16px' });
  return raw;
}

function expansionFontReport(size = '18.4px') {
  const raw = retainedTypographyReport(), entry = raw.results[0];
  entry.family = 'expansion'; entry.styleInputs = [];
  const { reference: ref, astylar: ast } = entry.inputTrees;
  ref.styles[0] = { ...ref.styles[0], fontSize: '16px' };
  ref.rules = [{ active: true, conditions: [], selector: '.mat-expansion-panel-header', declarations: {
    'font-size': { value: 'var(--mat-expansion-header-text-size, var(--mat-sys-title-medium-size))', important: false } } }];
  ref.nodes = [
    { key: 'title', parent: 'content', type: 'mat-panel-title', attributes: { id: 'expansion-title', class: 'mat-expansion-panel-header-title' }, ownText: 'Advanced settings', style: 0, rules: [], pseudoElements: [] },
    { key: 'content', parent: 'header', type: 'span', attributes: { class: 'mat-content' }, ownText: '', style: 0, rules: [], pseudoElements: [] },
    { key: 'header', parent: null, type: 'mat-expansion-panel-header', attributes: { class: 'mat-expansion-panel-header' }, ownText: '', style: 0, rules: [0], pseudoElements: [] },
  ];
  ast.nodes = [
    ['title', 'trigger', 'span', 'expansion-title', 'expansion-title'],
    ['trigger', 'panel', 'div', 'expansion-primary', 'expansion-trigger'],
    ['panel', 'section', 'article', 'expansion-shell', 'expansion-panel'],
    ['section', 'page', 'section', 'expansion-root', undefined],
    ['page', 'root', 'main', 'page', undefined],
  ].map(([key, parent, type, id, className]) => ({ key, parent, authored: { type, id, class: className,
    ...(key === 'title' ? { textContent: 'Advanced settings' } : {}) },
    resolvedStyle: key === 'page' ? { fontSize: size } : {},
    normalResolvedStyle: key === 'page' ? { fontSize: size } : {},
    interactionResolvedStyle: key === 'page' ? { fontSize: size } : {},
    ...(key === 'title' ? { retainedText: { source: 'core-text-registry', style: { ...ref.styles[0], fontSize: size } } } : {}) }));
  ast.rules = [{ selector: '#page', fontSize: size }];
  return raw;
}

function expansionBodyFontReport(size = '18.4px') {
  const raw = templateTypographyReport('expansion'), { reference: r, astylar: a } = raw.results[0].inputTrees;
  r.styles[0].fontSize = '16px';
  r.rules = [{ active: true, conditions: [], selector: '.mat-expansion-panel-content', declarations: {
    'font-size': { value: 'var(--mat-expansion-container-text-size, var(--mat-sys-body-large-size))', important: false } } }];
  r.nodes.find(n => n.attributes.class === 'mat-expansion-panel-content').rules = [0];
  for (const node of a.nodes) {
    for (const stage of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle']) node[stage] = {};
    if (node.retainedText) node.retainedText.style = { ...r.styles[0], fontSize: size };
  }
  a.nodes[0].parent = 'section';
  a.nodes.push(...[
    ['section', 'page', { type: 'section', id: 'expansion-root' }, {}],
    ['page', 'root', { type: 'main', id: 'page' }, { fontSize: size }],
  ].map(([key, parent, authored, style]) => ({ key, parent, authored, resolvedStyle: { ...style }, normalResolvedStyle: { ...style }, interactionResolvedStyle: { ...style } })));
  a.rules = [{ selector: '#page', fontSize: size }];
  return raw;
}

test('expansion body size preserves its own component token and complete omission chain', () => {
  for (const size of ['14.4px', '18.4px']) {
    const raw = expansionBodyFontReport(size), before = structuredClone(raw), report = buildMaterialInputAudit(raw);
    const f = report.retainedTypography.differences.find(d => d.attribution === 'reviewed-expansion-font-token-omission');
    assert.ok(f); assert.equal(f.element, 'expansion-content-label'); assert.equal(f.inputEquivalent, false);
    assert.equal(f.reviewEvidence.sourceFinding, 'fixture-expansion-body-font-size-token-omitted');
    assert.equal(f.reviewEvidence.referenceChain.length, 3); assert.equal(f.reviewEvidence.candidateChain.length, 5);
    assert.equal(f.reviewEvidence.candidatePageRule.fontSize, size);
    assert.ok(!validateMaterialInputAudit(report, { requireComplete: false }).some(e => e.includes('expansion font attributions')));
    assert.deepEqual(raw, before);
  }
});

test('expansion body size refuses missing wrappers tokens and ignored candidate declarations', () => {
  const controls = [
    (r, a) => { delete r.errors; }, (r, a) => { a.resolvedStyleEvidenceVersion = 1; },
    (r, a) => { r.nodes.at(-1).attributes.id = 'wrong'; }, (r, a) => { r.nodes.at(-2).attributes.class = 'other'; },
    (r, a) => { r.nodes.at(-1).parent = 'r'; }, (r, a) => { r.rules[0].active = false; },
    (r, a) => { r.rules[0].conditions = ['@media print']; }, (r, a) => { r.rules[0].declarations['font-size'].important = true; },
    (r, a) => { r.rules[0].declarations['font-size'].value = 'var(--mat-expansion-header-text-size, var(--mat-sys-title-medium-size))'; },
    (r, a) => { r.nodes.at(-1).inline = { font: { value: '16px Arial' } }; },
    (r, a) => { a.nodes[2].authored.textContent = 'Other'; }, (r, a) => { a.nodes[1].parent = 'missing'; },
    (r, a) => { a.nodes[1].normalResolvedStyle.fontSize = '16px'; }, (r, a) => { a.nodes[1].interactionResolvedStyle.fontSize = '16px'; },
    (r, a) => { a.nodes[2].retainedText.style.fontSize = '19px'; },
    (r, a) => { a.rules.push({ selector: '.expansion-content-label', fontSize: '16px' }); },
    (r, a) => { a.rules.push({ selector: '.expansion-panel', fontSize: '16px' }); },
    (r, a) => { a.rules.push({ selector: '#expansion-content', font: '16px Arial' }); },
    (r, a) => { a.rules.push({ selector: '.expansion-content-label', transition: 'font-size 1s' }); },
    (r, a) => { a.rules[0].fontSize = '20px'; },
  ];
  for (const [index, mutate] of controls.entries()) {
    const raw = expansionBodyFontReport(), { reference: r, astylar: a } = raw.results[0].inputTrees;
    mutate(r, a);
    const evidence = collectRetainedTypographyEvidence(raw.results, collectFullTreeInventory(raw.results));
    assert.ok(!evidence.differences.some(d => d.attribution === 'reviewed-expansion-font-token-omission'), `control ${index}`);
  }
});

test('expansion body size independently replays findings and removed comparisons', () => {
  const baseline = buildMaterialInputAudit(expansionBodyFontReport());
  for (const [index, mutate] of [
    (r, f) => { f.inputEquivalent = true; }, (r, f) => { f.currentPseudoStatePaintVerified = true; },
    (r, f) => { f.reviewEvidence.referenceChain.pop(); }, (r, f) => { f.reviewEvidence.candidateChain.pop(); },
    (r, f) => { f.reviewEvidence.revision++; }, (r, f) => { f.values.normal = '16px'; },
    (r, f) => { r.retainedTypography.differences = []; }, (r, f) => { r.retainedTypography.comparisons = []; },
    (r, f) => { r.retainedTypography.differences.push(structuredClone(f)); },
  ].entries()) {
    const report = structuredClone(baseline), f = report.retainedTypography.differences.find(d => d.attribution === 'reviewed-expansion-font-token-omission');
    mutate(report, f);
    assert.ok(validateMaterialInputAudit(report, { requireComplete: false }).some(e => e.includes('expansion font attributions')), `mutation ${index}`);
  }
});

test('expansion font omission preserves component token and scaled page inheritance', () => {
  for (const size of ['14.4px', '18.4px']) {
    const raw = expansionFontReport(size), before = structuredClone(raw), report = buildMaterialInputAudit(raw);
    const findings = report.retainedTypography.differences.filter(d => d.attribution === 'reviewed-expansion-font-token-omission');
    assert.equal(findings.length, 1);
    const f = findings[0];
    assert.equal(f.inputEquivalent, false);
    assert.equal(f.currentPseudoStatePaintVerified, false);
    assert.equal(f.classification, 'application-plugin-authoring-defect');
    assert.deepEqual(f.values, { reference: '16px', normal: undefined, effective: undefined, retained: size });
    assert.equal(f.reviewEvidence.referenceChain.length, 3);
    assert.equal(f.reviewEvidence.candidateChain.length, 5);
    assert.equal(f.reviewEvidence.candidatePageRule.fontSize, size);
    assert.ok(report.sourceFindings.find(f => f.id === 'fixture-expansion-font-size-token-omitted')?.detected);
    assert.ok(!validateMaterialInputAudit(report, { requireComplete: false }).some(e => e.includes('expansion font attributions')));
    assert.deepEqual(raw, before);
  }
});

test('expansion font omission rejects incomplete tokens, overridden ancestors and unverified page values', () => {
  const mutations = [
    e => { e.family = 'tree'; },
    e => { e.inputTrees.reference.nodes[0].attributes.id = 'wrong'; },
    e => { e.inputTrees.reference.nodes[1].attributes.class = 'wrong'; },
    e => { e.inputTrees.reference.nodes[0].parent = 'missing'; },
    e => { e.inputTrees.reference.nodes[1].rules = [0]; },
    e => { e.inputTrees.reference.rules[0].active = false; },
    e => { e.inputTrees.reference.rules[0].conditions = ['@media other']; },
    e => { e.inputTrees.reference.rules[0].declarations['font-size'].important = true; },
    e => { e.inputTrees.reference.rules[0].declarations['font-size'].value = '16px'; },
    e => { e.inputTrees.reference.nodes[0].inline = { 'font-size': { value: '16px' } }; },
    e => { e.inputTrees.reference.nodes[0].attributes.style = 'font: 16px Arial'; },
    e => { e.inputTrees.reference.nodes[2].rules.push(0); },
    e => { e.inputTrees.astylar.nodes[0].authored.class = 'wrong'; },
    e => { e.inputTrees.astylar.nodes[0].parent = 'missing'; },
    e => { e.inputTrees.astylar.nodes[2].parent = 'panel'; },
    e => { e.inputTrees.astylar.nodes[1].authored.style = { fontSize: '16px' }; },
    e => { e.inputTrees.astylar.nodes[1].normalResolvedStyle.fontSize = '16px'; },
    e => { e.inputTrees.astylar.nodes[2].interactionResolvedStyle.fontSize = '16px'; },
    e => { e.inputTrees.astylar.nodes[2].normalResolvedStyle.all = 'initial'; },
    e => { e.inputTrees.astylar.nodes[4].authored.type = 'div'; },
    e => { e.inputTrees.astylar.nodes[4].normalResolvedStyle.fontSize = '16px'; },
    e => { e.inputTrees.astylar.nodes[0].retainedText.style.fontSize = '16px'; },
    e => { e.inputTrees.astylar.rules[0].fontSize = '16px'; },
    e => { e.inputTrees.astylar.rules[0].mediaMaxWidth = '500px'; },
    e => { e.inputTrees.astylar.rules.push({ ...e.inputTrees.astylar.rules[0] }); },
  ];
  for (const mutate of mutations) {
    const raw = expansionFontReport(); mutate(raw.results[0]);
    const e = collectRetainedTypographyEvidence(raw.results, collectFullTreeInventory(raw.results));
    assert.ok(!e.differences.some(d => d.attribution === 'reviewed-expansion-font-token-omission'), String(mutate));
  }
});

test('expansion font claims replay exact component token and omission chain', () => {
  const baseline = buildMaterialInputAudit(expansionFontReport());
  const mutations = [
    (_r, f) => { f.reviewEvidence.referenceChain.pop(); },
    (_r, f) => { f.reviewEvidence.candidateChain.pop(); },
    (_r, f) => { f.inputEquivalent = true; },
    (_r, f) => { f.currentPseudoStatePaintVerified = true; },
    (_r, f) => { f.values.normal = '18.4px'; },
    (r, f) => { r.retainedTypography.differences.push(structuredClone(f)); },
    r => { r.retainedTypography.differences = []; },
    r => { r.retainedTypography.comparisons[0].properties.fontSize.effective = '18.4px'; },
    r => { r.elementInventory.rules.find(x => x.side === 'reference').value.active = false; },
    r => { r.elementInventory.rules.find(x => x.side === 'astylar').value.fontSize = '16px'; },
  ];
  for (const mutate of mutations) {
    const report = structuredClone(baseline);
    mutate(report, report.retainedTypography.differences.find(d => d.attribution === 'reviewed-expansion-font-token-omission'));
    assert.ok(validateMaterialInputAudit(report, { requireComplete: false }).some(e => e.includes('expansion font attributions')), String(mutate));
  }
});

function sortTypographyReport(property = 'fontSize', referenceSize = '18.4px') {
  const raw = templateTypographyReport('sort'), { reference: ref, astylar: ast } = raw.results[0].inputTrees;
  const cssProperty = property === 'fontSize' ? 'font-size' : 'color';
  const referenceValue = property === 'fontSize' ? referenceSize : '#1d1b20';
  const candidateValue = property === 'fontSize' ? '16px' : '#000000';
  ref.styles[0] = { ...ref.styles[0], [property]: referenceValue };
  ref.nodes[0].parent = 'frame';
  ref.nodes.push({ key: 'frame', parent: null, type: 'main', attributes: { class: 'frame' },
    ownText: '', style: 0, rules: [0], pseudoElements: [], inline: { '--scale': { value: '1.15' } } });
  ref.rules = [{ active: true, conditions: [], selector: '.frame[_ngcontent-test]', declarations: {
    [cssProperty]: { value: property === 'fontSize' ? 'calc(16px * var(--scale))' : 'rgb(29, 27, 32)', important: false } } }];
  const leaf = ast.nodes.at(-1), parent = ast.nodes.at(-2);
  for (const node of ast.nodes) for (const stage of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle']) {
    node[stage] = { ...node[stage] };
    delete node[stage][property];
  }
  for (const stage of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle']) parent[stage][property] = candidateValue;
  leaf.retainedText.style = { ...ref.styles[0], [property]: candidateValue };
  ast.rules = [{ selector: '.sort-trigger', [property]: candidateValue }];
  return raw;
}

test('sort typography attribution preserves inherited frame inputs and explicit trigger substitutions', () => {
  for (const [property, size] of [['fontSize', '14.4px'], ['fontSize', '18.4px'], ['color', '16px']]) {
    const raw = sortTypographyReport(property, size), before = structuredClone(raw), report = buildMaterialInputAudit(raw);
    const findings = report.retainedTypography.differences.filter(d => d.attribution === 'reviewed-sort-typography-substitution');
    assert.equal(findings.length, 1);
    const f = findings[0];
    assert.equal(f.property, property);
    assert.equal(f.inputEquivalent, false);
    assert.equal(f.currentPseudoStatePaintVerified, false);
    assert.equal(f.classification, 'application-plugin-authoring-defect');
    assert.equal(f.values.reference, property === 'fontSize' ? size : 'rgba(29,27,32,1)');
    assert.equal(f.values.retained, property === 'fontSize' ? '16px' : 'rgba(0,0,0,1)');
    assert.equal(f.values.normal, undefined);
    assert.equal(f.values.effective, undefined);
    assert.equal(f.reviewEvidence.referenceChain.at(-1).node, 'frame');
    assert.equal(f.reviewEvidence.candidateChain.length, 2);
    assert.ok(report.sourceFindings.find(f => f.id === 'fixture-sort-typography-substitution')?.detected);
    assert.ok(!validateMaterialInputAudit(report, { requireComplete: false }).some(e => e.includes('sort typography attributions')));
    assert.deepEqual(raw, before);
  }
});

test('sort typography attribution rejects broken inheritance, conditional inputs and retained disagreement', () => {
  const mutations = [
    (r) => { r.family = 'tree'; },
    (r) => { r.inputTrees.reference.nodes[0].parent = 'missing'; },
    (r) => { r.inputTrees.reference.nodes.at(-1).attributes.class = 'other'; },
    (r) => { r.inputTrees.reference.nodes[2].rules.push(0); },
    (r) => { r.inputTrees.reference.rules[0].active = false; },
    (r) => { r.inputTrees.reference.rules[0].conditions = ['@layer other']; },
    (r, p, css) => { r.inputTrees.reference.rules[0].declarations[css].important = true; },
    (r, p, css) => { r.inputTrees.reference.rules[0].declarations[css].value = 'inherit'; },
    (r, p, css) => { r.inputTrees.reference.nodes[1].inline = { [css]: { value: 'inherit' } }; },
    (r) => { r.inputTrees.reference.nodes.at(-1).parent = 'frame'; },
    (r) => { r.inputTrees.astylar.nodes.at(-1).authored.style = {}; },
    (r, p) => { r.inputTrees.astylar.nodes.at(-1).normalResolvedStyle[p] = 'inherit'; },
    (r, p) => { r.inputTrees.astylar.nodes.at(-2).normalResolvedStyle[p] = 'inherit'; },
    (r, p) => { r.inputTrees.astylar.nodes.at(-2).interactionResolvedStyle[p] = 'inherit'; },
    (r, p) => { r.inputTrees.astylar.nodes.at(-1).retainedText.style[p] = 'inherit'; },
    (r) => { r.inputTrees.astylar.rules[0].mediaMaxWidth = '500px'; },
    (r) => { r.inputTrees.astylar.rules.push({ ...r.inputTrees.astylar.rules[0] }); },
    (r, p) => { r.inputTrees.astylar.rules.push({ selector: '#sort-label', [p]: 'inherit' }); },
    (r, p) => { r.inputTrees.astylar.rules.push({ selector: 'span', [p]: 'inherit' }); },
    (r) => { r.inputTrees.astylar.rules.push({ selector: '*', all: 'initial' }); },
  ];
  for (const property of ['fontSize', 'color']) for (const mutate of mutations) {
    const raw = sortTypographyReport(property);
    mutate(raw.results[0], property, property === 'fontSize' ? 'font-size' : 'color');
    const e = collectRetainedTypographyEvidence(raw.results, collectFullTreeInventory(raw.results));
    assert.ok(!e.differences.some(d => d.attribution === 'reviewed-sort-typography-substitution'), `${property}: ${mutate}`);
  }
});

test('sort typography report claims independently replay exact ancestry and candidate stages', () => {
  for (const property of ['fontSize', 'color']) {
    const baseline = buildMaterialInputAudit(sortTypographyReport(property));
    const mutations = [
      (_r, f) => { f.reviewEvidence.referenceChain.pop(); },
      (_r, f) => { f.reviewEvidence.candidateChain.pop(); },
      (_r, f) => { f.inputEquivalent = true; },
      (_r, f) => { f.currentPseudoStatePaintVerified = true; },
      (_r, f) => { f.values.normal = f.values.retained; },
      (r, f) => { r.retainedTypography.differences.push(structuredClone(f)); },
      r => { r.retainedTypography.differences = []; },
      r => { r.retainedTypography.comparisons[0].properties[property].effective = 'inherit'; },
      r => { r.elementInventory.rules.find(x => x.side === 'reference').value.active = false; },
      r => { r.elementInventory.rules.find(x => x.side === 'astylar' && x.value.selector === '.sort-trigger').value[property] = 'inherit'; },
    ];
    for (const mutate of mutations) {
      const report = structuredClone(baseline);
      mutate(report, report.retainedTypography.differences.find(d => d.attribution === 'reviewed-sort-typography-substitution'));
      assert.ok(validateMaterialInputAudit(report, { requireComplete: false }).some(e => e.includes('sort typography attributions')), `${property}: ${mutate}`);
    }
  }
});

function sidenavColorReport(content = false, dark = false) {
  const raw = templateTypographyReport('sidenav'), { reference: ref, astylar: ast } = raw.results[0].inputTrees;
  const color = content ? '#1d1b1e' : '#49454e', candidateColor = dark && !content ? '#49454f' : '#1d1b20';
  ref.styles[0] = { ...ref.styles[0], color };
  ref.nodes[0].attributes.class += ' mat-drawer-container';
  ref.nodes[1].attributes.class += ' mat-drawer';
  if (content) {
    ref.nodes = [ref.nodes[0], { ...ref.nodes[2], key: 'r/c', parent: 'r', type: 'mat-sidenav-content',
      attributes: { id: 'sidenav-content', class: 'mat-drawer-content mat-sidenav-content' }, ownText: 'Main content' }];
    ast.nodes[1].key = 'a/c';
    ast.nodes[1].authored = { type: 'main', id: 'sidenav-content', class: 'sidenav-content', textContent: 'Main content' };
  }
  ref.rules = [{ active: true, conditions: [], selector: content ? '.mat-drawer-container' : '.mat-drawer',
    declarations: { color: { value: content ? 'var(--mat-sidenav-content-text-color, var(--mat-sys-on-background))'
      : 'var(--mat-sidenav-container-text-color, var(--mat-sys-on-surface-variant))', important: false } } }];
  ref.nodes[content ? 0 : 1].rules = [0];
  ast.rules = [{ selector: content ? '.sidenav-content' : '.sidenav', color: candidateColor }];
  const leaf = ast.nodes[1], style = { ...ref.styles[0], color: candidateColor };
  leaf.resolvedStyle = { ...style }; leaf.normalResolvedStyle = { ...style }; leaf.interactionResolvedStyle = { ...style };
  leaf.retainedText.style = { ...style };
  return raw;
}

test('sidenav color tokens preserve distinct reference inheritance and literal substitutions', () => {
  for (const content of [false, true]) for (const dark of [false, true]) {
    const raw = sidenavColorReport(content, dark), before = structuredClone(raw);
    const evidence = collectRetainedTypographyEvidence(raw.results, collectFullTreeInventory(raw.results));
    const findings = evidence.differences.filter(d => d.attribution === 'reviewed-sidenav-color-substitution');
    assert.equal(findings.length, 1, `${content}/${dark}`);
    const f = findings[0];
    assert.equal(f.inputEquivalent, false);
    assert.equal(f.currentPseudoStatePaintVerified, false);
    assert.equal(f.classification, 'application-plugin-authoring-defect');
    assert.equal(f.values.reference, content ? 'rgba(29,27,30,1)' : 'rgba(73,69,78,1)');
    assert.equal(f.values.retained, dark && !content ? 'rgba(73,69,79,1)' : 'rgba(29,27,32,1)');
    assert.equal(f.values.normal, f.values.retained);
    assert.equal(f.values.effective, f.values.retained);
    assert.equal(f.reviewEvidence.referenceChain[1].colorRules[0].selector, content ? '.mat-drawer-container' : '.mat-drawer');
    assert.equal(f.reviewEvidence.candidateRule.rule.selector, content ? '.sidenav-content' : '.sidenav');
    assert.deepEqual(raw, before);
    const report = buildMaterialInputAudit(raw);
    assert.ok(report.sourceFindings.find(f => f.id === 'fixture-sidenav-color-token-substitution')?.detected);
    assert.ok(!validateMaterialInputAudit(report, { requireComplete: false }).some(e => e.includes('sidenav color attributions')));
  }
});

test('sidenav color attribution rejects incomplete token chains and competing candidate inputs', () => {
  const mutations = [
    e => { e.family = 'card'; },
    e => { e.inputTrees.reference.nodes.at(-1).parent = 'missing'; },
    e => { e.inputTrees.reference.nodes.at(-1).attributes.style = 'color: #49454e'; },
    e => { e.inputTrees.reference.nodes.at(-1).rules = [0]; },
    e => { e.inputTrees.reference.nodes[0].attributes.class = 'wrong'; },
    e => { e.inputTrees.reference.rules[0].active = false; },
    e => { e.inputTrees.reference.rules[0].conditions = ['@media unreviewed']; },
    e => { e.inputTrees.reference.rules[0].declarations.color.important = true; },
    e => { e.inputTrees.reference.rules[0].declarations.color.value = '#49454e'; },
    e => { e.inputTrees.reference.rules[0].declarations.all = { value: 'initial' }; },
    e => { e.inputTrees.reference.nodes.at(-2).rules.push(0); },
    e => { e.inputTrees.astylar.nodes[0].authored.id = 'wrong'; },
    e => { e.inputTrees.astylar.nodes[1].authored.type = 'span'; },
    e => { e.inputTrees.astylar.nodes[1].authored.class = 'other'; },
    e => { e.inputTrees.astylar.nodes[1].authored.style = { color: '#1d1b20' }; },
    e => { e.inputTrees.astylar.nodes[1].normalResolvedStyle.color = '#000000'; },
    e => { e.inputTrees.astylar.nodes[1].interactionResolvedStyle.color = '#000000'; },
    e => { e.inputTrees.astylar.nodes[1].retainedText.style.color = '#000000'; },
    e => { e.inputTrees.astylar.rules[0].color = '#000000'; },
    e => { e.inputTrees.astylar.rules[0].mediaMaxWidth = '500px'; },
    e => { e.inputTrees.astylar.rules.push({ ...e.inputTrees.astylar.rules[0] }); },
    e => { e.inputTrees.astylar.rules.push({ selector: '.sidenav:hover, .sidenav-content:hover', color: '#1d1b20' }); },
    e => { e.inputTrees.astylar.rules.push({ selector: 'aside, main', color: '#1d1b20' }); },
    e => { e.inputTrees.astylar.rules.push({ selector: '#sidenav-nav, #sidenav-content', color: '#1d1b20' }); },
    e => { e.inputTrees.astylar.rules.push({ selector: '*', all: 'initial' }); },
  ];
  for (const content of [false, true]) for (const mutate of mutations) {
    const raw = sidenavColorReport(content);
    mutate(raw.results[0]);
    const evidence = collectRetainedTypographyEvidence(raw.results, collectFullTreeInventory(raw.results));
    assert.ok(!evidence.differences.some(d => d.attribution === 'reviewed-sidenav-color-substitution'), `${content}: ${mutate}`);
  }
});

test('sidenav color claims independently replay captured tokens, identity and retained stages', () => {
  for (const content of [false, true]) {
    const baseline = buildMaterialInputAudit(sidenavColorReport(content));
    const mutations = [
      (_r, f) => { f.reviewEvidence.referenceChain.pop(); },
      (_r, f) => { f.reviewEvidence.candidateRule.order = -1; },
      (_r, f) => { f.values.normal = '#000000'; },
      (_r, f) => { f.inputEquivalent = true; },
      (_r, f) => { f.classification = 'confirmed-core-renderer-defect'; },
      (_r, f) => { f.currentPseudoStatePaintVerified = true; },
      (r, f) => { r.retainedTypography.differences.push(structuredClone(f)); },
      r => { r.retainedTypography.differences = []; },
      r => { r.retainedTypography.comparisons[0].properties.color.effective = '#123456'; },
      r => { r.elementInventory.rules.find(x => x.side === 'reference' && x.value.declarations?.color).value.active = false; },
      r => { r.elementInventory.rules.find(x => x.side === 'astylar' && x.value.color).value.color = '#000000'; },
    ];
    for (const mutate of mutations) {
      const report = structuredClone(baseline);
      mutate(report, report.retainedTypography.differences.find(d => d.attribution === 'reviewed-sidenav-color-substitution'));
      assert.ok(validateMaterialInputAudit(report, { requireComplete: false }).some(e => e.includes('sidenav color attributions')), `${content}: ${mutate}`);
    }
  }
});

function disabledChoiceInkReport(family = 'checkbox', color = '#1d1b20') {
  const raw = retainedTypographyReport(), entry = raw.results[0];
  entry.family = family;
  entry.styleInputs[0].id = `${family}-root`;
  const { reference: r, astylar: a } = entry.inputTrees;
  const id = family === 'checkbox' ? 'checkbox-label' : 'radio-solo-label';
  const ownerId = family === 'checkbox' ? 'checkbox-primary' : 'radio-solo';
  const text = family === 'checkbox' ? 'Include archived' : 'Solo';
  r.styles[0].color = 'color(srgb 0.113725 0.105882 0.12549 / 0.38)';
  r.rules = [{ active: true, conditions: [], selector: family === 'checkbox' ? '.mat-mdc-checkbox.mat-mdc-checkbox-disabled label' : '.mat-mdc-radio-button .mdc-radio--disabled + label',
    declarations: { color: { value: `var(--mat-${family}-disabled-label-color, color-mix(in srgb, var(--mat-sys-on-surface) 38%, transparent))`, important: false } } }];
  const node = (key, parent, type, attributes, ownText = '') => ({ key, parent, type, attributes, ownText, style: 0, rules: [], inline: {}, pseudoElements: [] });
  r.nodes = [node('host', null, family === 'checkbox' ? 'mat-checkbox' : 'mat-radio-button', { class: family === 'checkbox' ? 'mat-mdc-checkbox-disabled' : 'mat-mdc-radio-disabled' }),
    node('form', 'host', 'div', { class: 'mat-internal-form-field' }),
    node('control', 'form', 'div', { class: family === 'radio' ? 'mdc-radio--disabled' : 'mdc-checkbox--disabled' }),
    node('input', 'control', 'input', { id: 'native-input', type: family, disabled: '' }),
    node('label', 'form', 'label', { class: 'mdc-label', for: 'native-input' }), node('text', 'label', 'span', { id }, text)];
  r.nodes[4].rules = [0];
  const style = { ...r.styles[0] }; delete style.color;
  a.nodes = [ { key: 'owner', parent: 'root', authored: { type: 'div', id: ownerId, class: family === 'radio' ? 'radio-option' : undefined, role: family, ariaDisabled: true },
    resolvedStyle: { ...style }, normalResolvedStyle: { ...style }, interactionResolvedStyle: { ...style } },
    { key: 'text', parent: 'owner', authored: { type: 'span', id, class: family === 'checkbox' ? 'checkbox-label' : 'radio-label', textContent: text },
      resolvedStyle: { ...style }, normalResolvedStyle: { ...style }, interactionResolvedStyle: { ...style },
      retainedText: { source: 'core-text-registry', style: { ...style, color } } } ];
  const owner = a.nodes[family === 'checkbox' ? 1 : 0];
  for (const field of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle']) owner[field].color = color;
  a.rules = [{ selector: family === 'checkbox' ? '.checkbox-label' : '.radio-option', color }];
  return raw;
}

test('disabled choice label ink retains native disabled token and opaque candidate owner', () => {
  for (const family of ['checkbox', 'radio']) for (const color of ['#1d1b20', '#e6e1e5']) {
    const raw = disabledChoiceInkReport(family, color), before = structuredClone(raw), report = buildMaterialInputAudit(raw);
    const findings = report.retainedTypography.differences.filter(d => d.attribution === 'reviewed-disabled-choice-label-ink-input');
    assert.equal(findings.length, 1, `${family}/${color}`);
    assert.equal(findings[0].inputEquivalent, false);
    assert.equal(findings[0].finalRasterVerified, false);
    assert.equal(findings[0].reviewEvidence.candidateRetained.color, color);
    assert.equal(findings[0].reviewEvidence.candidateChain.length, family === 'checkbox' ? 1 : 2);
    assert.deepEqual(raw, before);
    assert.deepEqual(validateMaterialInputAudit(report, { requireComplete: false }), []);
  }
});

test('disabled choice label ink rejects incomplete and contradictory state and cascade evidence', () => {
  const controls = [
    (r, a) => { delete r.rules; }, (r, a) => { delete a.rules; },
    (r, a) => { a.resolvedStyleRevision = -1; }, (r, a) => { a.resolvedStyleEvidenceVersion = 1; },
    (r, a) => { r.nodes[3].attributes.disabled = undefined; delete r.nodes[3].attributes.disabled; },
    (r, a) => { r.nodes[3].attributes.id = 'other'; }, (r, a) => { r.nodes[3].parent = 'host'; },
    (r, a) => { r.nodes[0].attributes.class = ''; }, (r, a) => { r.nodes[4].type = 'div'; },
    (r, a) => { r.nodes[5].ownText = 'Different'; }, (r, a) => { a.nodes[0].authored.ariaDisabled = false; },
    (r, a) => { a.nodes[0].authored.role = 'button'; }, (r, a) => { a.nodes[1].parent = 'root'; },
    (r, a) => { r.rules[0].active = false; }, (r, a) => { r.rules[0].conditions = ['media']; },
    (r, a) => { r.rules[0].conditions = 'invalid'; }, (r, a) => { r.rules[0].declarations.color.important = true; },
    (r, a) => { r.rules[0].declarations.color.value = '#aaa'; },
    (r, a) => { r.nodes[5].inline = { color: { value: 'red' } }; },
    (r, a) => { r.nodes[5].rules = [0]; },
    (r, a) => { a.nodes[1].authored.style = { color: 'red' }; },
    (r, a) => { a.rules[0].mediaMaxWidth = '500px'; },
    (r, a) => { a.rules.push({ selector: '*', color: 'red' }); },
    (r, a) => { a.rules.push({ selector: '.checkbox-label, .radio-label', transition: 'color 1s' }); },
    (r, a) => { a.nodes[1].retainedText.style.color = '#aaa'; },
    (r, a) => { a.nodes[1].interactionResolvedStyle.color = '#aaa'; },
    (r, a) => { a.nodes.push(structuredClone(a.nodes[1])); },
  ];
  for (const family of ['checkbox', 'radio']) for (const [index, mutate] of controls.entries()) {
    const raw = disabledChoiceInkReport(family); mutate(raw.results[0].inputTrees.reference, raw.results[0].inputTrees.astylar);
    const report = buildMaterialInputAudit(raw);
    assert.equal(report.retainedTypography.differences.filter(d => d.attribution === 'reviewed-disabled-choice-label-ink-input').length, 0, `${family}/${index}`);
  }
});

test('disabled choice label ink validation replays claims and rejects removed or altered findings', () => {
  const baseline = buildMaterialInputAudit(disabledChoiceInkReport('radio'));
  const mutations = [
    (r, d) => { d.inputEquivalent = true; }, (r, d) => { d.finalRasterVerified = true; },
    (r, d) => { d.reviewEvidence.token.active = false; }, (r, d) => { d.reviewEvidence.candidateOwner.authored.ariaDisabled = false; },
    (r, d) => { d.reviewEvidence.candidateChain[0].normal.color = 'red'; },
    (r, d) => { d.reviewEvidence.revision++; }, (r, d) => { d.family = 'chips'; },
    (r, d) => { r.retainedTypography.differences = []; }, (r, d) => { r.retainedTypography.differences.push(structuredClone(d)); },
    (r, d) => { r.retainedTypography.comparisons = []; },
  ];
  for (const [index, mutate] of mutations.entries()) {
    const report = structuredClone(baseline), d = report.retainedTypography.differences.find(d => d.attribution === 'reviewed-disabled-choice-label-ink-input');
    mutate(report, d);
    assert.ok(validateMaterialInputAudit(report, { requireComplete: false }).some(e => e.includes('disabled choice label ink')), `mutation ${index}`);
  }
});

function chipLabelInkReport(color = '#1d1b20') {
  const raw = templateTypographyReport('chips'), entry = raw.results[0];
  const { reference: ref, astylar: ast } = entry.inputTrees;
  ref.styles[0] = { ...ref.styles[0], color: '#49454e' };
  ref.rules = [{ source: 'sheet:5/36', active: true, conditions: [],
    selector: '.mat-mdc-standard-chip:not(.mdc-evolution-chip--disabled) .mdc-evolution-chip__text-label',
    declarations: { color: { value: 'var(--mat-chip-label-text-color, var(--mat-sys-on-surface-variant))', important: false } } }];
  for (const n of ref.nodes) {
    if (n.type === 'mat-chip-option') n.attributes.class += ' mat-mdc-standard-chip';
    if (n.type === 'button') Object.assign(n.attributes, { role: 'option', 'aria-selected': 'false', 'aria-disabled': 'false' });
    if (String(n.attributes.class).includes('mdc-evolution-chip__text-label')) n.rules = [0];
  }
  ast.rules = [{ selector: '.chip', color }, { selector: '.chip.selected', color: '#4b4357' }];
  for (const n of ast.nodes) {
    if (/^chip-[01]$/.test(n.authored.id)) Object.assign(n.authored, { class: 'chip unselected', role: 'option', ariaSelected: false });
    for (const stage of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle']) {
      n[stage] = { ...n[stage] };
      delete n[stage].color;
      if (/^chip-[01]$/.test(n.authored.id)) n[stage].color = color;
    }
    if (n.retainedText) n.retainedText.style = { ...n.retainedText.style, color };
  }
  return raw;
}

test('unselected chip ink preserves direct reference token and candidate host inheritance', () => {
  for (const color of ['#1d1b20', '#e6e1e5']) {
    const raw = chipLabelInkReport(color), before = structuredClone(raw);
    const r = collectRetainedTypographyEvidence(raw.results, collectFullTreeInventory(raw.results));
    const findings = r.differences.filter(d => d.attribution === 'reviewed-chip-label-ink-input');
    assert.equal(findings.length, 2);
    for (const f of findings) {
      assert.equal(f.inputEquivalent, false);
      assert.equal(f.finalRasterVerified, false);
      assert.equal(f.currentPseudoStatePaintVerified, false);
      assert.equal(f.classification, 'application-plugin-authoring-defect');
      assert.equal(f.values.normal, undefined);
      assert.equal(f.values.effective, undefined);
      assert.equal(f.values.reference, 'rgba(73,69,78,1)');
      assert.equal(f.reviewEvidence.candidateRule.color, color);
      assert.equal(f.reviewEvidence.referencePath.length, 6);
      assert.equal(f.reviewEvidence.candidateChain.length, 2);
      assert.equal(f.reviewEvidence.candidateChain[1].normal.color, color);
    }
    assert.deepEqual(raw, before);
  }
  const report = buildMaterialInputAudit(chipLabelInkReport());
  assert.ok(report.sourceFindings.find(f => f.id === 'fixture-chip-label-ink-substitution')?.detected);
  assert.ok(!validateMaterialInputAudit(report, { requireComplete: false }).some(e => e.includes('chip label ink')));
});

test('unselected chip ink refuses altered state incomplete ownership and competing paint input', () => {
  const mutations = [
    e => { delete e.inputTrees.reference.errors; },
    e => { delete e.inputTrees.astylar.errors; },
    e => { e.inputTrees.reference.nodes.find(n => n.type === 'mat-chip-option').attributes.class += ' mdc-evolution-chip--selected'; },
    e => { e.inputTrees.reference.nodes.find(n => n.type === 'mat-chip-option').attributes.class += ' mdc-evolution-chip--disabled'; },
    e => { e.inputTrees.reference.nodes.find(n => n.type === 'button').attributes['aria-selected'] = 'true'; },
    e => { e.inputTrees.reference.nodes.find(n => n.type === 'button').attributes['aria-disabled'] = 'true'; },
    e => { e.inputTrees.reference.nodes.find(n => n.type === 'button').attributes.disabled = ''; },
    e => { e.inputTrees.reference.nodes.find(n => n.type === 'button').parent = 'missing'; },
    e => { e.inputTrees.reference.nodes.find(n => n.ownText === 'Angular').inline = { color: { value: 'inherit' } }; },
    e => { e.inputTrees.reference.nodes.find(n => n.ownText === 'Angular').attributes.style = '-webkit-text-fill-color: red'; },
    e => { e.inputTrees.reference.rules[0].active = false; },
    e => { e.inputTrees.reference.rules[0].conditions = ['@media print']; },
    e => { e.inputTrees.reference.rules[0].conditions = ''; },
    e => { e.inputTrees.reference.rules[0].declarations.color.value = '#49454e'; },
    e => { e.inputTrees.reference.rules[0].declarations.color.important = true; },
    e => { e.inputTrees.reference.rules[0].declarations.transition = { value: 'color 1s' }; },
    e => { e.inputTrees.reference.nodes.find(n => n.ownText === 'Angular').rules.push(0); },
    e => { e.inputTrees.reference.nodes.find(n => n.ownText === 'Angular').style = 999; },
    e => { e.inputTrees.astylar.nodes.find(n => n.authored.id === 'chip-0').authored.ariaSelected = true; },
    e => { e.inputTrees.astylar.nodes.find(n => n.authored.id === 'chip-0').authored.class += ' selected'; },
    e => { e.inputTrees.astylar.nodes.find(n => n.authored.id === 'chip-0').authored.ariaDisabled = true; },
    e => { e.inputTrees.astylar.nodes.find(n => n.authored.id === 'chip-0').authored.style = { color: '#1d1b20' }; },
    e => { e.inputTrees.astylar.nodes.find(n => n.authored.id === 'chip-0-label').authored.style = { color: 'inherit' }; },
    e => { e.inputTrees.astylar.nodes.find(n => n.authored.id === 'chip-0-label').normalResolvedStyle.color = '#1d1b20'; },
    e => { e.inputTrees.astylar.nodes.find(n => n.authored.id === 'chip-0').normalResolvedStyle.color = '#000000'; },
    e => { e.inputTrees.astylar.nodes.find(n => n.authored.id === 'chip-0').interactionResolvedStyle.color = '#000000'; },
    e => { e.inputTrees.astylar.nodes.find(n => n.authored.id === 'chip-0-label').retainedText.style.color = '#000000'; },
    e => { e.inputTrees.astylar.rules.push({ selector: '*', color: '#1d1b20' }); },
    e => { e.inputTrees.astylar.rules.push({ selector: '.chip:focus', color: '#1d1b20' }); },
    e => { e.inputTrees.astylar.rules.push({ selector: '.chip-label', color: '#1d1b20' }); },
    e => { e.inputTrees.astylar.rules[0].mediaMinWidth = '500px'; },
    e => { e.inputTrees.astylar.rules[0].transition = 'color 1s'; },
    e => { e.inputTrees.astylar.rules.push(structuredClone(e.inputTrees.astylar.rules[0])); },
  ];
  for (const mutate of mutations) {
    const raw = chipLabelInkReport(); mutate(raw.results[0]);
    const r = collectRetainedTypographyEvidence(raw.results, collectFullTreeInventory(raw.results));
    assert.ok(!r.differences.some(d => d.element === 'chip-0-label' && d.attribution === 'reviewed-chip-label-ink-input'), String(mutate));
  }
});

test('unselected chip ink claims independently replay token state inheritance and all report lists', () => {
  const baseline = buildMaterialInputAudit(chipLabelInkReport());
  for (const mutate of [
    (_r, f) => { f.inputEquivalent = true; },
    (_r, f) => { f.classification = 'confirmed-core-renderer-defect'; },
    (_r, f) => { f.finalRasterVerified = true; },
    (_r, f) => { f.reviewEvidence.referencePath.pop(); },
    (_r, f) => { f.reviewEvidence.referenceToken.declarations.color.value = '#49454e'; },
    (_r, f) => { f.reviewEvidence.candidateChain[1].normal.color = '#000000'; },
    (_r, f) => { f.reviewEvidence.candidateRule.color = '#000000'; },
    (r, f) => { r.retainedTypography.differences.push(structuredClone(f)); },
    r => { r.retainedTypography.differences = []; },
    r => { r.retainedTypography.reviewedMappings = []; },
    r => { r.retainedTypography.comparisons[0].properties.color.normal = '#1d1b20'; },
    r => { r.elementInventory.rules.find(x => x.side === 'astylar' && x.value.selector === '.chip').value.color = '#000000'; },
    r => { r.elementInventory.variants.find(v => v.side === 'reference').nodes.find(n => n.type === 'button').attributes['aria-selected'] = 'true'; },
  ]) {
    const report = structuredClone(baseline);
    mutate(report, report.retainedTypography.differences.find(d => d.attribution === 'reviewed-chip-label-ink-input'));
    assert.ok(validateMaterialInputAudit(report, { requireComplete: false }).some(e => e.includes('chip label ink')), String(mutate));
  }
});

function fieldLabelColorReport(family = 'form-field', empty = false) {
  const raw = fieldLabelTrackingReport(family, empty ? 'empty' : 'base'), entry = raw.results[0];
  const { reference: ref, astylar: ast } = entry.inputTrees;
  ref.styles = ref.styles.map(style => ({ ...style, color: '#49454e' }));
  ref.rules.push({ active: true, conditions: [],
    selector: '.mdc-text-field--filled:not(.mdc-text-field--disabled) .mdc-floating-label',
    declarations: { color: { value: 'var(--mat-form-field-filled-label-text-color, var(--mat-sys-on-surface-variant))', important: false } } });
  ref.nodes[1].rules.push(ref.rules.length - 1);
  ast.nodes[0].parent = 'shell';
  ast.nodes.push({ key: 'shell', parent: 'page', authored: { type: 'div', id: `${family}-primary`,
    class: `field-shell${['datepicker', 'timepicker'].includes(family) ? ` ${family}-shell` : ''}` },
    resolvedStyle: {}, normalResolvedStyle: {}, interactionResolvedStyle: {} });
  ast.rules.find(r => r.selector === '.field-label').color = '#49454f';
  ast.rules.find(r => r.selector === '.field-label.empty-field-label').color = '#1d1b20';
  ast.rules.push({ selector: '.timepicker-shell .field-label', color: '#e6e1e5' },
    { selector: '.datepicker-shell .field-label', color: '#e6e1e5' });
  const color = ['datepicker', 'timepicker'].includes(family) ? '#e6e1e5' : empty ? '#1d1b20' : '#49454f';
  for (const key of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle']) ast.nodes[0][key].color = color;
  ast.nodes[0].retainedText.style.color = color;
  return raw;
}

test('field color token and candidate cascade provenance retain unequal pre-render inputs', () => {
  for (const family of ['form-field', 'input', 'select', 'autocomplete', 'datepicker', 'timepicker']) for (const empty of [false, true]) {
    const raw = fieldLabelColorReport(family, empty), before = structuredClone(raw);
    const evidence = collectRetainedTypographyEvidence(raw.results, collectFullTreeInventory(raw.results));
    const findings = evidence.differences.filter(d => d.attribution === 'reviewed-field-label-color-substitution');
    assert.equal(findings.length, 1, `${family}/${empty}`);
    const f = findings[0];
    assert.equal(f.classification, 'application-plugin-authoring-defect');
    assert.equal(f.inputEquivalent, false);
    assert.equal(f.currentPseudoStatePaintVerified, false);
    assert.equal(f.values.reference, 'rgba(73,69,78,1)');
    assert.equal(f.values.normal, f.values.retained);
    assert.equal(f.values.effective, f.values.retained);
    assert.equal(f.reviewEvidence.selectedRule.rule.selector, ['datepicker', 'timepicker'].includes(family)
      ? `.${family}-shell .field-label` : empty ? '.field-label.empty-field-label' : '.field-label');
    assert.equal(f.reviewEvidence.candidateRules.length, 4);
    assert.deepEqual(raw, before);
  }
  const report = buildMaterialInputAudit(fieldLabelColorReport('datepicker', true));
  assert.ok(report.sourceFindings.find(f => f.id === 'fixture-field-label-color-substitution')?.detected);
  assert.ok(!validateMaterialInputAudit(report, { requireComplete: false }).some(e => e.includes('field-label color attributions')));
});

test('field color attribution rejects stale ancestry, unexplained states and incomplete token evidence', () => {
  const mutations = [
    e => { e.family = 'card'; },
    e => { e.inputTrees.reference.nodes[0].type = 'span'; },
    e => { e.inputTrees.reference.nodes[0].parent = 'missing'; },
    e => { e.inputTrees.reference.nodes[0].inline = { color: { value: 'inherit' } }; },
    e => { e.inputTrees.reference.nodes[1].attributes.style = 'color: #49454e'; },
    e => { e.inputTrees.reference.styles[1].color = '#000000'; },
    e => { e.inputTrees.reference.rules.at(-1).active = false; },
    e => { e.inputTrees.reference.rules.at(-1).declarations.color.important = true; },
    e => { e.inputTrees.reference.rules.at(-1).conditions = ['@layer unreviewed']; },
    e => { e.inputTrees.reference.rules.at(-1).declarations.color.value = '#49454e'; },
    e => { e.inputTrees.reference.nodes[1].rules.push(e.inputTrees.reference.rules.length - 1); },
    e => { e.inputTrees.astylar.nodes[0].authored.style = { color: '#e6e1e5' }; },
    e => { e.inputTrees.astylar.nodes.at(-1).authored.class = 'field-shell'; },
    e => { e.inputTrees.astylar.nodes.at(-1).authored.id = 'other'; },
    e => { e.inputTrees.astylar.nodes[0].normalResolvedStyle = { ...e.inputTrees.astylar.nodes[0].normalResolvedStyle, color: '#1d1b20' }; },
    e => { e.inputTrees.astylar.nodes[0].interactionResolvedStyle = { ...e.inputTrees.astylar.nodes[0].interactionResolvedStyle, color: '#000000' }; },
    e => { e.inputTrees.astylar.nodes[0].retainedText.style.color = '#1d1b20'; },
    e => { e.inputTrees.astylar.rules.at(-1).color = '#000000'; },
    e => { e.inputTrees.astylar.rules.at(-1).mediaMaxWidth = '500px'; },
    e => { e.inputTrees.astylar.rules.push({ selector: '.field-label:hover', color: '#e6e1e5' }); },
    e => { e.inputTrees.astylar.rules.push({ selector: '.field-label', color: '#49454f' }); },
    e => { e.inputTrees.astylar.rules.push({ selector: '#datepicker-label', color: '#e6e1e5' }); },
    e => { e.inputTrees.astylar.rules.push({ selector: '.field-shell label', color: '#e6e1e5' }); },
    e => { e.inputTrees.astylar.rules.push({ selector: '*', all: 'initial' }); },
    e => { e.inputTrees.astylar.rules.reverse(); },
  ];
  for (const mutate of mutations) {
    const raw = fieldLabelColorReport('datepicker', true);
    mutate(raw.results[0]);
    const evidence = collectRetainedTypographyEvidence(raw.results, collectFullTreeInventory(raw.results));
    assert.ok(!evidence.differences.some(d => d.attribution === 'reviewed-field-label-color-substitution'), String(mutate));
  }
});

test('field color claims independently replay rule order, reference inheritance and raw stages', () => {
  const baseline = buildMaterialInputAudit(fieldLabelColorReport('timepicker', true));
  const mutations = [
    (_r, f) => { f.reviewEvidence.referenceChain.pop(); },
    (_r, f) => { f.reviewEvidence.selectedRule.order = -1; },
    (_r, f) => { f.values.normal = '#1d1b20'; },
    (_r, f) => { f.inputEquivalent = true; },
    (_r, f) => { f.classification = 'confirmed-core-renderer-defect'; },
    (_r, f) => { f.currentPseudoStatePaintVerified = true; },
    (r, f) => { r.retainedTypography.differences.push(structuredClone(f)); },
    r => { r.retainedTypography.differences = []; },
    r => { r.retainedTypography.comparisons[0].properties.color.effective = '#123456'; },
    r => { r.elementInventory.rules.find(x => x.side === 'reference' && x.value.declarations?.color).value.active = false; },
    r => { r.elementInventory.rules.find(x => x.side === 'astylar' && x.value.selector === '.timepicker-shell .field-label').value.color = '#1d1b20'; },
  ];
  for (const mutate of mutations) {
    const report = structuredClone(baseline);
    mutate(report, report.retainedTypography.differences.find(d => d.attribution === 'reviewed-field-label-color-substitution'));
    assert.ok(validateMaterialInputAudit(report, { requireComplete: false }).some(e => e.includes('field-label color attributions')), String(mutate));
  }
});

function fieldStateColorReport(state = 'focus', disabledOverride = false, family = 'form-field') {
  const raw = fieldLabelColorReport(family), entry = raw.results[0];
  const { reference: ref, astylar: ast } = entry.inputTrees;
  const selector = state === 'disabled' ? '.mdc-text-field--filled.mdc-text-field--disabled .mdc-floating-label' :
    `.mdc-text-field--filled:not(.mdc-text-field--disabled)${state === 'focus' ? '.mdc-text-field--focused' : state === 'error' ? '.mdc-text-field--invalid' : ':not(.mdc-text-field--focused):hover'} .mdc-floating-label`;
  const value = state === 'disabled' ? 'var(--mat-form-field-filled-disabled-label-text-color, color-mix(in srgb, var(--mat-sys-on-surface) 38%, transparent))' :
    `var(--mat-form-field-filled-${state}-label-text-color, var(--mat-sys-${state === 'focus' ? 'primary' : state === 'error' ? 'error' : 'on-surface-variant'}))`;
  if (state === 'disabled') ref.nodes[1].rules.pop();
  ref.rules.push({ active: true, conditions: [], selector, declarations: { color: { value, important: false } } });
  ref.nodes[1].rules.push(ref.rules.length - 1);
  ref.styles = ref.styles.map(style => ({ ...style, color: state === 'focus' ? '#6750a4' : state === 'error' ? '#b3261e' : state === 'disabled' ? 'rgba(230,225,229,0.38)' : '#49454e' }));
  ref.nodes[1].parent = 'infix';
  ref.nodes.push(...[
    ['infix', 'flex', 'div', 'mat-mdc-form-field-infix'],
    ['flex', 'field-wrapper', 'div', 'mat-mdc-form-field-flex'],
    ['field-wrapper', 'field', 'div', `mdc-text-field--filled${state === 'focus' ? ' mdc-text-field--focused' : state === 'disabled' ? ' mdc-text-field--disabled' : state === 'error' ? ' mdc-text-field--invalid' : ''}`],
    ['field', null, 'mat-form-field', 'mat-mdc-form-field'],
  ].map(([key, parent, type, className]) => ({ key, parent, type, attributes: { class: className,
    ...(key === 'field' ? { id: `${family}-primary` } : {}) }, style: 0, rules: [], pseudoElements: [] })));
  if (disabledOverride) ast.rules.unshift({ selector: '.field-label, .picker-clock', color: '#79747e' });
  return raw;
}

test('field state color tokens expose focus hover disabled and error substitutions before paint', () => {
  for (const family of ['form-field', 'input', 'select', 'autocomplete', 'datepicker', 'timepicker']) {
    for (const state of ['focus', 'hover', 'disabled', 'error']) {
      const raw = fieldStateColorReport(state, state === 'disabled', family), before = structuredClone(raw);
      const evidence = collectRetainedTypographyEvidence(raw.results, collectFullTreeInventory(raw.results));
      const f = evidence.differences.find(d => d.attribution === 'reviewed-field-label-color-substitution');
      assert.ok(f, `${family}/${state}`);
      assert.equal(f.reviewEvidence.referenceState.state, state);
      assert.equal(f.reviewEvidence.referenceState.path.length, 4);
      assert.equal(f.reviewEvidence.referenceState.revision, 4);
      assert.equal(f.reviewEvidence.candidateRules.length, state === 'disabled' ? 5 : 4);
      assert.equal(f.inputEquivalent, false);
      assert.equal(f.classification, 'application-plugin-authoring-defect');
      assert.equal(f.currentPseudoStatePaintVerified, false);
      assert.equal(f.values.normal, f.values.retained);
      assert.equal(f.values.effective, f.values.retained);
      assert.deepEqual(raw, before);
    }
  }
  const plainDisabled = fieldStateColorReport('disabled');
  assert.ok(collectRetainedTypographyEvidence(plainDisabled.results, collectFullTreeInventory(plainDisabled.results))
    .differences.some(d => d.reviewEvidence?.referenceState?.state === 'disabled'));
});

test('field state color attribution refuses incomplete ancestor state and unreviewed cascade', () => {
  const mutations = [
    e => { e.inputTrees.reference.rules.at(-1).conditions = ''; },
    e => { e.inputTrees.astylar.resolvedStyleRevision = -1; },
    e => { delete e.inputTrees.reference.errors; },
    e => { delete e.inputTrees.astylar.errors; },
    e => { e.inputTrees.astylar.resolvedStyleEvidenceVersion = 1; },
    e => { e.inputTrees.astylar.resolvedStyleSource = 'mesh'; },
    e => { delete e.inputTrees.astylar.resolvedStyleRevision; },
    e => { e.inputTrees.reference.nodes.find(n => n.key === 'infix').parent = 'missing'; },
    e => { e.inputTrees.reference.nodes.find(n => n.key === 'flex').type = 'span'; },
    e => { e.inputTrees.reference.nodes.find(n => n.key === 'field-wrapper').attributes.class = 'other'; },
    e => { e.inputTrees.reference.nodes.find(n => n.key === 'field-wrapper').attributes.class += ' mdc-text-field--invalid'; },
    e => { e.inputTrees.reference.nodes.find(n => n.key === 'field').attributes.id = 'other'; },
    e => { e.inputTrees.reference.nodes.push(structuredClone(e.inputTrees.reference.nodes.find(n => n.key === 'flex'))); },
    e => { e.inputTrees.reference.nodes.find(n => n.key === 'flex').style = 999; },
    e => { e.inputTrees.reference.rules.at(-1).conditions = ['@media print']; },
    e => { e.inputTrees.reference.rules.at(-1).active = false; },
    e => { e.inputTrees.reference.rules.at(-1).declarations.color.important = true; },
    e => { e.inputTrees.reference.rules.at(-1).declarations.color.value = '#123456'; },
    e => { e.inputTrees.reference.rules.at(-1).declarations.all = { value: 'initial' }; },
    e => { e.inputTrees.reference.nodes[1].rules.push(e.inputTrees.reference.rules.length - 1); },
    e => { e.inputTrees.reference.nodes[1].rules.reverse(); },
    e => { e.inputTrees.astylar.rules.push({ selector: '*', color: '#49454f' }); },
    e => { e.inputTrees.astylar.rules.push({ selector: 'label:focus', color: '#49454f' }); },
    e => { e.inputTrees.astylar.rules.push({ selector: '.field-label:hover', color: '#49454f' }); },
    e => { e.inputTrees.astylar.nodes[0].normalResolvedStyle.color = '#123456'; },
    e => { e.inputTrees.astylar.nodes[0].interactionResolvedStyle.color = '#123456'; },
    e => { e.inputTrees.astylar.nodes[0].retainedText.style.color = '#123456'; },
  ];
  for (const mutate of mutations) {
    const raw = fieldStateColorReport(); mutate(raw.results[0]);
    assert.ok(!collectRetainedTypographyEvidence(raw.results, collectFullTreeInventory(raw.results)).differences
      .some(d => d.attribution === 'reviewed-field-label-color-substitution'), String(mutate));
  }
  for (const mutate of [
    e => { e.inputTrees.astylar.rules[0].color = '#79747f'; },
    e => { e.inputTrees.astylar.rules.push(e.inputTrees.astylar.rules.shift()); },
    e => { e.inputTrees.astylar.rules.unshift(structuredClone(e.inputTrees.astylar.rules[0])); },
  ]) {
    const raw = fieldStateColorReport('disabled', true); mutate(raw.results[0]);
    assert.ok(!collectRetainedTypographyEvidence(raw.results, collectFullTreeInventory(raw.results)).differences
      .some(d => d.attribution === 'reviewed-field-label-color-substitution'), String(mutate));
  }
});

test('field state color claims replay ancestor state token and overridden disabled rule', () => {
  const baseline = buildMaterialInputAudit(fieldStateColorReport('disabled', true));
  assert.ok(!validateMaterialInputAudit(baseline, { requireComplete: false }).some(e => e.includes('field-label color attributions')));
  const mutations = [
    (_r, f) => { f.reviewEvidence.referenceState.state = 'focus'; },
    (_r, f) => { f.reviewEvidence.referenceState.path.pop(); },
    (_r, f) => { f.reviewEvidence.referenceState.revision++; },
    (_r, f) => { f.reviewEvidence.referenceState.selectedRule.declarations.color.value = '#000000'; },
    (_r, f) => { f.reviewEvidence.matchingRules.shift(); },
    (_r, f) => { f.reviewEvidence.selectedRule.order = -1; },
    (_r, f) => { f.inputEquivalent = true; },
    (_r, f) => { f.currentPseudoStatePaintVerified = true; },
    (r, f) => { r.retainedTypography.differences.push(structuredClone(f)); },
    r => { r.retainedTypography.differences = []; },
    r => { r.elementInventory.variants.find(v => v.side === 'reference').nodes.find(n => n.key === 'field-wrapper').attributes.class = 'mdc-text-field--filled'; },
    r => { r.elementInventory.rules.find(r => r.side === 'astylar' && r.value.selector === '.field-label, .picker-clock').value.color = '#000000'; },
  ];
  for (const mutate of mutations) {
    const report = structuredClone(baseline);
    mutate(report, report.retainedTypography.differences.find(d => d.attribution === 'reviewed-field-label-color-substitution'));
    assert.ok(validateMaterialInputAudit(report, { requireComplete: false }).some(e => e.includes('field-label color attributions')), String(mutate));
  }
});

test('picker error label color preserves later shell override of authored error ink', () => {
  for (const family of ['datepicker', 'timepicker']) for (const color of ['#1d1b20', '#e6e1e5']) {
    const raw = fieldStateColorReport('error', false, family), e = raw.results[0], a = e.inputTrees.astylar;
    for (const r of a.rules.filter(r => ['.field-label', '.field-label.empty-field-label'].includes(r.selector))) r.color = '#b3261e';
    a.rules.find(r => r.selector === `.${family}-shell .field-label`).color = color;
    for (const key of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle']) a.nodes[0][key].color = color;
    a.nodes[0].retainedText.style.color = color;
    const report = buildMaterialInputAudit(raw), f = report.retainedTypography.differences.find(d => d.attribution === 'reviewed-field-label-color-substitution');
    assert.ok(f, family);
    assert.equal(f.reviewEvidence.referenceState.state, 'error');
    assert.equal(f.reviewEvidence.selectedRule.rule.selector, `.${family}-shell .field-label`);
    assert.equal(f.reviewEvidence.selectedRule.rule.color, color);
    assert.ok(f.reviewEvidence.matchingRules.some(r => r.rule.selector === '.field-label' && r.rule.color === '#b3261e'));
    assert.ok(!validateMaterialInputAudit(report, { requireComplete: false }).some(e => e.includes('field-label color attributions')));
    const altered = structuredClone(report);
    altered.retainedTypography.differences.find(d => d.attribution === 'reviewed-field-label-color-substitution').reviewEvidence.referenceState.state = 'focus';
    assert.ok(validateMaterialInputAudit(altered, { requireComplete: false }).some(e => e.includes('field-label color attributions')));
  }
});

function fieldLabelTrackingReport(family = 'form-field', kind = 'base') {
  const raw = floatingLabelTypographyReport(), entry = raw.results[0];
  entry.family = family;
  const { reference: ref, astylar: ast } = entry.inputTrees;
  ref.nodes[0].attributes.id = `${family}-label`;
  ref.styles = ref.styles.map(style => ({ ...style, letterSpacing: '0.496px' }));
  ref.nodes[1].attributes.class = 'mdc-floating-label mdc-floating-label--float-above';
  ref.rules.push({ active: true, selector: '.mdc-text-field--filled .mdc-floating-label', declarations: {
    'letter-spacing': { value: 'var(--mat-form-field-filled-label-text-tracking, var(--mat-sys-body-large-tracking))' },
  } });
  ref.nodes[1].rules.push(1);
  ast.nodes[0].authored.id = `${family}-label`;
  ast.nodes[0].authored.class = kind === 'base' ? 'field-label' : 'field-label empty-field-label';
  const tracking = kind === 'empty' ? '.65px' : '.4px';
  ast.rules.find(r => r.selector === '.field-label').letterSpacing = '.4px';
  ast.rules.push({ selector: '.field-label.empty-field-label', letterSpacing: tracking });
  for (const field of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle']) ast.nodes[0][field].letterSpacing = tracking;
  ast.nodes[0].retainedText.style.letterSpacing = tracking;
  if (kind === 'empty') ref.styles[1].transform = 'matrix(1, 0, 0, 1, 0, -9.5)';
  return raw;
}

test('field tracking substitution keeps reference wrapper and explicit state-rule inputs distinct', () => {
  for (const family of ['form-field', 'input', 'select', 'autocomplete', 'datepicker', 'timepicker']) {
    for (const kind of ['base', 'empty', 'active-empty']) {
      const raw = fieldLabelTrackingReport(family, kind), before = structuredClone(raw);
      const report = buildMaterialInputAudit(raw);
      const findings = report.retainedTypography.differences.filter(d => d.attribution === 'reviewed-field-label-tracking-substitution');
      assert.equal(findings.length, 1, `${family}/${kind}`);
      const finding = findings[0];
      assert.equal(finding.property, 'letterSpacing');
      assert.equal(finding.classification, 'application-plugin-authoring-defect');
      assert.equal(finding.inputEquivalent, false);
      assert.equal(finding.currentPseudoStatePaintVerified, false);
      assert.equal(finding.values.reference, '0.496px');
      assert.equal(finding.values.retained, kind === 'empty' ? '0.65px' : '0.4px');
      assert.equal(finding.reviewEvidence.referenceChain[1].computed.transform,
        kind === 'empty' ? 'matrix(1, 0, 0, 1, 0, -9.5)' : 'matrix(0.75, 0, 0, 0.75, 0, -20.14)');
      assert.equal(finding.reviewEvidence.selectedRule.selector, kind === 'base' ? '.field-label' : '.field-label.empty-field-label');
      assert.ok(report.sourceFindings.find(f => f.id === finding.reviewEvidence.sourceFinding)?.detected);
      assert.ok(!validateMaterialInputAudit(report, { requireComplete: false }).some(e => e.includes('field-label tracking attributions')));
      assert.equal(report.summary.inputEquivalent, false);
      assert.deepEqual(raw, before);
    }
  }
});

test('field tracking substitution rejects unproven identity, token inheritance, cascade and retained input', () => {
  const mutations = [
    e => { e.family = 'card'; },
    e => { e.inputTrees.reference.nodes[0].type = 'span'; },
    e => { e.inputTrees.reference.nodes[0].attributes.id = 'other'; },
    e => { e.inputTrees.reference.nodes[0].parent = 'missing'; },
    e => { e.inputTrees.reference.nodes[1].type = 'div'; },
    e => { e.inputTrees.reference.nodes[1].attributes.class = 'other'; },
    e => { e.inputTrees.reference.nodes.push(structuredClone(e.inputTrees.reference.nodes[1])); },
    e => { e.inputTrees.reference.nodes[0].rules.push(1); },
    e => { e.inputTrees.reference.nodes[1].rules.push(1); },
    e => { e.inputTrees.reference.rules[1].active = false; },
    e => { e.inputTrees.reference.rules[1].selector = '.unrelated'; },
    e => { e.inputTrees.reference.rules[1].declarations['letter-spacing'].value = '0.496px'; },
    e => { e.inputTrees.reference.rules[1].declarations.font = { value: '14px Roboto' }; },
    e => { e.inputTrees.reference.nodes[0].inline = { 'letter-spacing': { value: 'inherit' } }; },
    e => { e.inputTrees.reference.nodes[1].attributes.style = 'letter-spacing: .496px'; },
    e => { e.inputTrees.reference.styles[1].letterSpacing = '.372px'; },
    e => { e.inputTrees.astylar.nodes[0].authored.class = 'other'; },
    e => { e.inputTrees.astylar.nodes[0].retainedText.style.letterSpacing = '.372px'; },
    e => { e.inputTrees.astylar.nodes[0].interactionResolvedStyle = { ...e.inputTrees.astylar.nodes[0].interactionResolvedStyle, letterSpacing: '.7px' }; },
    e => { e.inputTrees.astylar.rules.find(r => r.selector === '.field-label').letterSpacing = '.5px'; },
    e => { e.inputTrees.astylar.rules.push({ selector: '.field-label', letterSpacing: '.4px' }); },
    e => { e.inputTrees.astylar.rules.push({ selector: '.field-label:hover', letterSpacing: '.4px' }); },
    e => { e.inputTrees.astylar.rules.find(r => r.selector === '.field-label').mediaMaxWidth = '500px'; },
    e => { e.inputTrees.astylar.rules.find(r => r.selector === '.field-label.empty-field-label').letterSpacing = '.8px'; },
  ];
  for (const mutate of mutations) {
    const raw = fieldLabelTrackingReport('timepicker', 'empty');
    mutate(raw.results[0]);
    const evidence = collectRetainedTypographyEvidence(raw.results, collectFullTreeInventory(raw.results));
    assert.ok(!evidence.differences.some(d => d.attribution === 'reviewed-field-label-tracking-substitution'), String(mutate));
  }
});

test('field tracking claims replay exact token, state rule and pooled values', () => {
  const baseline = buildMaterialInputAudit(fieldLabelTrackingReport('autocomplete', 'empty'));
  const mutations = [
    (_r, f) => { f.reviewEvidence.referenceChain.pop(); },
    (_r, f) => { f.reviewEvidence.selectedRule.letterSpacing = '.4px'; },
    (_r, f) => { f.values.retained = '.496px'; },
    (_r, f) => { f.inputEquivalent = true; },
    (_r, f) => { f.currentPseudoStatePaintVerified = true; },
    (_r, f) => { f.classification = 'confirmed-core-renderer-defect'; },
    (r, f) => { r.retainedTypography.differences.push(structuredClone(f)); },
    r => { r.retainedTypography.differences = []; },
    r => { r.retainedTypography.comparisons[0].properties.letterSpacing.normal = '.7px'; },
    r => { r.elementInventory.rules.find(x => x.side === 'reference' && x.value.declarations?.['letter-spacing']).value.active = false; },
    r => { r.elementInventory.rules.find(x => x.side === 'astylar' && x.value.selector === '.field-label.empty-field-label').value.letterSpacing = '.4px'; },
  ];
  for (const mutate of mutations) {
    const report = structuredClone(baseline);
    mutate(report, report.retainedTypography.differences.find(d => d.attribution === 'reviewed-field-label-tracking-substitution'));
    assert.ok(validateMaterialInputAudit(report, { requireComplete: false }).some(e => e.includes('field-label tracking attributions')), String(mutate));
  }
});

function verifiedFloatingLabelReport(family = 'form-field', empty = false) {
  const raw = floatingLabelTypographyReport(), e = raw.results[0], { reference: r, astylar: a } = e.inputTrees;
  e.family = family; e.styleInputs[0].id = `${family}-root`;
  r.nodes[0].attributes.id = `${family}-label`; a.nodes[0].authored.id = `${family}-label`;
  r.nodes[1].attributes.class = 'mdc-floating-label mdc-floating-label--float-above';
  const rule = (selector, property, value) => ({ selector, active: true, conditions: [], declarations: { [property]: { value, important: false } } });
  r.rules = [
    rule('.mdc-floating-label--float-above', 'transform', 'translateY(-106%) scale(0.75)'),
    rule('.mdc-text-field--filled .mdc-floating-label', 'font-size', 'var(--mat-form-field-filled-label-text-size, var(--mat-sys-body-large-size))'),
    rule('.mdc-floating-label', 'transform-origin', 'left top'),
    rule('.mdc-text-field .mdc-floating-label', 'transform', 'translateY(-50%)'),
    rule('.mdc-text-field--filled .mdc-floating-label--float-above', 'transform', 'translateY(-106%) scale(0.75)'),
  ];
  r.nodes[1].rules = [2, 3, 1, 0, 4];
  if (empty) {
    a.nodes[0].authored.class += ' empty-field-label';
    a.rules.push({ selector: '.field-label.empty-field-label', fontSize: '12px', top: '8px' });
  }
  return raw;
}

function unfloatedErrorLabelReport(family = 'timepicker', hidden = false) {
  const raw = verifiedFloatingLabelReport(family, true), { reference: r, astylar: a } = raw.results[0].inputTrees;
  r.nodes[1].attributes = { class: 'mdc-floating-label', for: `${family}-control` };
  r.nodes[1].parent = 'infix'; r.nodes[1].rules = [2, 3, 1];
  Object.assign(r.styles[1], { display: hidden ? 'none' : 'block', transform: hidden ? 'none' : 'matrix(1, 0, 0, 1, 0, -9.5)', transformOrigin: hidden ? '0% 0%' : '0px 0px' });
  for (const [selector, value] of [
    ['.mdc-text-field--filled:not(.mdc-text-field--disabled) .mdc-floating-label', 'var(--mat-form-field-filled-label-text-color, var(--mat-sys-on-surface-variant))'],
    ['.mdc-text-field--filled:not(.mdc-text-field--disabled).mdc-text-field--invalid .mdc-floating-label', 'var(--mat-form-field-filled-error-label-text-color, var(--mat-sys-error))'],
  ]) {
    r.rules.push({ active: true, conditions: [], selector, declarations: { color: { value, important: false } } });
    r.nodes[1].rules.push(r.rules.length - 1);
  }
  r.nodes.push(...[
    ['infix', 'flex', 'div', 'mat-mdc-form-field-infix'], ['flex', 'field-wrapper', 'div', 'mat-mdc-form-field-flex'],
    ['field-wrapper', 'field', 'div', 'mdc-text-field--filled mdc-text-field--invalid'], ['field', null, 'mat-form-field', 'mat-mdc-form-field'],
  ].map(([key, parent, type, className]) => ({ key, parent, type, attributes: { class: className, ...(key === 'field' ? { id: `${family}-primary` } : {}) }, style: 0, rules: [], pseudoElements: [] })));
  r.nodes.push({ key: 'input', parent: 'infix', type: 'input', attributes: { id: `${family}-control`, 'aria-invalid': 'true' }, value: '', ownText: '', style: 0, rules: [], pseudoElements: [] });
  a.nodes[0].parent = 'shell'; a.nodes[0].authored.for = `${family}-control`;
  a.nodes.push(...[
    ['shell', 'page', { type: 'div', id: `${family}-primary` }],
    ['region', 'shell', { type: 'div', id: `${family}-input-region` }],
    ['input', 'region', { type: 'input', id: `${family}-control`, ariaInvalid: true, value: '' }],
  ].map(([key, parent, authored]) => ({ key, parent, authored, resolvedStyle: {}, normalResolvedStyle: {}, interactionResolvedStyle: {} })));
  return raw;
}

function hiddenDenseLabelReport(density = 5) {
  const raw = unfloatedErrorLabelReport('datepicker', true), { reference: r, astylar: a } = raw.results[0].inputTrees;
  raw.results[0].profile = density === 5 ? 'contrast' : 'custom';
  r.nodes[1].attributes.class = 'mdc-floating-label mat-mdc-floating-label mdc-floating-label--float-above';
  r.nodes[1].rules = [2, 3, 1, 0, 4, 5, 6];
  r.rules[6].selector = '.mdc-text-field--filled:not(.mdc-text-field--disabled).mdc-text-field--focused .mdc-floating-label';
  r.rules[6].declarations.color.value = 'var(--mat-form-field-filled-focus-label-text-color, var(--mat-sys-primary))';
  r.rules.push({ active: true, conditions: [], selector: '.mdc-text-field--filled .mat-mdc-floating-label',
    declarations: { display: { value: 'var(--mat-form-field-filled-label-display, block)', important: false } } });
  r.nodes[1].rules.push(7);
  r.rules.push({ active: true, conditions: [], selector: `.density-${density}`,
    declarations: { '--mat-form-field-filled-label-display': { value: 'none', important: false } } });
  r.nodes.find(n => n.key === 'field-wrapper').attributes.class = 'mdc-text-field--filled mdc-text-field--focused';
  r.nodes.find(n => n.key === 'field').parent = 'demo';
  r.nodes.find(n => n.key === 'input').attributes['aria-invalid'] = 'false';
  r.nodes.push({ key: 'demo', parent: 'frame', type: 'section', attributes: { class: 'demo', id: 'datepicker-root' }, style: 0, rules: [], pseudoElements: [] },
    { key: 'frame', parent: null, type: 'main', attributes: { class: `frame density-${density}` }, style: 0, rules: [8], pseudoElements: [] });
  Object.assign(a.nodes.find(n => n.key === 'input').authored, { ariaInvalid: false, disabled: false });
  for (const n of a.nodes) for (const stage of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle']) {
    n[stage] = { ...n[stage], display: n.authored?.id === 'datepicker-label' ? 'inline' : 'block' };
  }
  a.rules.push({ selector: '.field-label.compact-filled-label', display: 'none' });
  return raw;
}

test('hidden dense datepicker label preserves display-token inheritance and unmatched candidate rule', () => {
  for (const density of [2, 5]) {
    const raw = hiddenDenseLabelReport(density), before = structuredClone(raw), report = buildMaterialInputAudit(raw);
    const f = report.retainedTypography.differences.find(d => d.attribution === 'reviewed-hidden-dense-label-input');
    assert.ok(f); assert.equal(f.inputEquivalent, false); assert.equal(f.finalRasterVerified, false);
    const e = f.reviewEvidence.denseVisibility;
    assert.equal(e.densityRule.selector, `.density-${density}`); assert.equal(e.inheritance.length, 7);
    assert.equal(e.referenceWrapperHidden, true); assert.equal(e.visibleReferenceFontComparison, false);
    assert.equal(e.candidateLabelDisplay, 'inline'); assert.equal(e.candidateUnmatchedHideRule.display, 'none');
    assert.equal(f.reviewEvidence.selectedReferenceRules.length, 5);
    assert.deepEqual(validateMaterialInputAudit(report, { requireComplete: false }), []);
    assert.deepEqual(raw, before);
  }
});

test('hidden dense label attribution rejects incomplete token inheritance state and visibility', () => {
  const controls = [
    (r, a) => { r.nodes[1].attributes.class = 'mdc-floating-label mdc-floating-label--float-above'; },
    (r, a) => { r.styles[1].display = 'block'; }, (r, a) => { r.styles[1].transform = 'matrix(.75,0,0,.75,0,-20)'; },
    (r, a) => { r.rules[7].active = false; }, (r, a) => { r.rules[7].conditions = ['@media print']; },
    (r, a) => { r.rules[7].declarations.display.value = 'none'; }, (r, a) => { r.rules[7].declarations.opacity = { value: '0' }; },
    (r, a) => { r.rules[8].declarations['--mat-form-field-filled-label-display'].value = 'block'; },
    (r, a) => { r.rules[8].declarations['--mat-form-field-filled-label-display'].important = true; },
    (r, a) => { r.rules[8].active = false; }, (r, a) => { r.rules[8].conditions = ['@media print']; },
    (r, a) => { r.nodes.find(n => n.key === 'frame').attributes.class = 'frame density-2'; },
    (r, a) => { r.nodes.find(n => n.key === 'frame').parent = 'external'; },
    (r, a) => { r.nodes.find(n => n.key === 'demo').parent = 'missing'; },
    (r, a) => { r.nodes.find(n => n.key === 'demo').inline = { '--mat-form-field-filled-label-display': { value: 'none' } }; },
    (r, a) => { r.nodes.find(n => n.key === 'demo').rules = [8]; },
    (r, a) => { r.nodes.find(n => n.key === 'field-wrapper').attributes.class = 'mdc-text-field--filled'; },
    (r, a) => { r.nodes.find(n => n.key === 'input').value = 'Typed'; },
    (r, a) => { r.nodes.find(n => n.key === 'input').attributes['aria-invalid'] = 'true'; },
    (r, a) => { r.nodes[1].attributes.for = 'other'; },
    (r, a) => { a.nodes[0].authored.class += ' compact-filled-label'; },
    (r, a) => { a.nodes[0].normalResolvedStyle.display = 'none'; },
    (r, a) => { a.nodes.find(n => n.key === 'shell').interactionResolvedStyle.visibility = 'hidden'; },
    (r, a) => { a.nodes.find(n => n.key === 'page').normalResolvedStyle.opacity = '0'; },
    (r, a) => { a.nodes[0].authored.style = { display: 'inline' }; },
    (r, a) => { a.nodes.find(n => n.key === 'input').authored.disabled = true; },
    (r, a) => { a.nodes.find(n => n.key === 'input').authored.value = 'Typed'; },
    (r, a) => { a.nodes.find(n => n.key === 'region').parent = 'page'; },
    (r, a) => { a.rules.pop(); }, (r, a) => { a.rules.at(-1).mediaMaxWidth = '500px'; },
    (r, a) => { a.rules.push({ selector: '.field-label', display: 'none' }); },
    (r, a) => { a.rules.push(structuredClone(a.rules.at(-1))); },
  ];
  for (const [index, mutate] of controls.entries()) {
    const raw = hiddenDenseLabelReport(), { reference: r, astylar: a } = raw.results[0].inputTrees;
    mutate(r, a);
    const evidence = collectRetainedTypographyEvidence(raw.results, collectFullTreeInventory(raw.results));
    assert.ok(!evidence.differences.some(d => d.attribution === 'reviewed-hidden-dense-label-input'), `control ${index}`);
  }
});

test('hidden dense label report replays density token visibility and all evidence lists', () => {
  const baseline = buildMaterialInputAudit(hiddenDenseLabelReport());
  const controls = [
    (r, f) => { f.inputEquivalent = true; }, (r, f) => { f.finalRasterVerified = true; },
    (r, f) => { f.reviewEvidence.denseVisibility.visibleReferenceFontComparison = true; },
    (r, f) => { f.reviewEvidence.denseVisibility.referenceWrapperHidden = false; },
    (r, f) => { f.reviewEvidence.denseVisibility.inheritance.pop(); },
    (r, f) => { f.reviewEvidence.denseVisibility.candidateUnmatchedHideRule.display = 'block'; },
    (r, f) => { f.reviewEvidence.denseVisibility.candidateInput.authored.value = 'Typed'; },
    (r, f) => { f.reviewEvidence.revision++; }, (r, f) => { f.family = 'timepicker'; },
    (r, f) => { r.retainedTypography.differences = []; }, (r, f) => { r.retainedTypography.comparisons = []; },
    (r, f) => { r.retainedTypography.differences.push(structuredClone(f)); },
  ];
  for (const [index, mutate] of controls.entries()) {
    const report = structuredClone(baseline), f = report.retainedTypography.differences.find(d => d.attribution === 'reviewed-hidden-dense-label-input');
    mutate(report, f);
    assert.ok(validateMaterialInputAudit(report, { requireComplete: false }).some(e => e.includes('floating-label font')), `mutation ${index}`);
  }
});

test('unfloated error label size distinguishes error-state shrink from scaled and hidden reference paint', () => {
  for (const family of ['autocomplete', 'datepicker', 'timepicker']) for (const hidden of [false, true]) {
    const raw = unfloatedErrorLabelReport(family, hidden), before = structuredClone(raw);
    const evidence = collectRetainedTypographyEvidence(raw.results, collectFullTreeInventory(raw.results));
    const f = evidence.differences.find(d => d.attribution === 'reviewed-unfloated-error-label-font-input');
    assert.ok(f, `${family}/${hidden}`);
    assert.equal(f.inputEquivalent, false); assert.equal(f.finalRasterVerified, false);
    assert.equal(f.reviewEvidence.selectedReferenceRules.length, 3);
    assert.equal(f.reviewEvidence.referenceErrorState.referenceWrapperDisplay, hidden ? 'none' : 'block');
    assert.equal(f.reviewEvidence.referenceErrorState.state.state, 'error');
    assert.equal(f.reviewEvidence.referenceErrorState.candidateInput.authored.ariaInvalid, true);
    assert.deepEqual(raw, before);
  }
  const report = buildMaterialInputAudit(unfloatedErrorLabelReport());
  assert.deepEqual(validateMaterialInputAudit(report, { requireComplete: false }), []);
});

test('unfloated error label size rejects missing state input identity and contradictory visibility', () => {
  const controls = [
    (r, a) => { r.nodes.find(n => n.key === 'field-wrapper').attributes.class = 'mdc-text-field--filled'; },
    (r, a) => { r.nodes.find(n => n.key === 'field-wrapper').attributes.class += ' mdc-text-field--focused'; },
    (r, a) => { r.rules.at(-1).active = false; }, (r, a) => { r.rules.at(-1).declarations.color.value = '#b3261e'; },
    (r, a) => { r.nodes.find(n => n.key === 'input').attributes['aria-invalid'] = 'false'; },
    (r, a) => { r.nodes.find(n => n.key === 'input').value = 'Typed'; },
    (r, a) => { r.nodes.find(n => n.key === 'input').attributes.disabled = ''; },
    (r, a) => { r.nodes.find(n => n.key === 'input').parent = 'flex'; },
    (r, a) => { r.nodes[1].attributes.for = 'other'; },
    (r, a) => { r.nodes[1].attributes.class += ' mdc-floating-label--float-above'; },
    (r, a) => { r.styles[1].transform = 'matrix(0.75, 0, 0, 0.75, 0, -9.5)'; },
    (r, a) => { r.styles[1].display = 'none'; },
    (r, a) => { a.nodes[0].authored.class = 'field-label'; },
    (r, a) => { a.nodes[0].authored.for = 'other'; },
    (r, a) => { a.nodes.find(n => n.key === 'input').authored.ariaInvalid = false; },
    (r, a) => { a.nodes.find(n => n.key === 'input').authored.value = 'Typed'; },
    (r, a) => { a.nodes.find(n => n.key === 'input').authored.disabled = true; },
    (r, a) => { a.nodes.find(n => n.key === 'input').parent = 'shell'; },
    (r, a) => { a.nodes.find(n => n.key === 'region').parent = 'page'; },
    (r, a) => { a.nodes.find(n => n.key === 'shell').authored.id = 'other'; },
    (r, a) => { a.nodes.push(structuredClone(a.nodes.find(n => n.key === 'input'))); },
  ];
  for (const [index, mutate] of controls.entries()) {
    const raw = unfloatedErrorLabelReport(); mutate(raw.results[0].inputTrees.reference, raw.results[0].inputTrees.astylar);
    assert.ok(!collectRetainedTypographyEvidence(raw.results, collectFullTreeInventory(raw.results)).differences.some(d => d.attribution === 'reviewed-unfloated-error-label-font-input'), `control ${index}`);
  }
});

test('unfloated error label size claims replay invalid input and visibility evidence', () => {
  const baseline = buildMaterialInputAudit(unfloatedErrorLabelReport('datepicker', true));
  const controls = [
    (r, f) => { f.inputEquivalent = true; }, (r, f) => { f.finalRasterVerified = true; },
    (r, f) => { f.reviewEvidence.referenceErrorState.input.value = 'Typed'; },
    (r, f) => { f.reviewEvidence.referenceErrorState.candidateInput.authored.ariaInvalid = false; },
    (r, f) => { f.reviewEvidence.referenceErrorState.referenceWrapperDisplay = 'block'; },
    (r, f) => { f.reviewEvidence.selectedReferenceRules.push({}); },
    (r, f) => { f.reviewEvidence.revision++; }, (r, f) => { f.family = 'chips'; },
    (r, f) => { r.retainedTypography.differences = []; },
    (r, f) => { r.retainedTypography.differences.push(structuredClone(f)); },
    (r, f) => { r.retainedTypography.comparisons = []; },
  ];
  for (const [index, mutate] of controls.entries()) {
    const report = structuredClone(baseline), f = report.retainedTypography.differences.find(d => d.attribution === 'reviewed-unfloated-error-label-font-input');
    mutate(report, f);
    assert.ok(validateMaterialInputAudit(report, { requireComplete: false }).some(e => e.includes('floating-label font')), `mutation ${index}`);
  }
});

test('attributes floating-label font substitution without equating scaled and smaller text inputs', () => {
  const raw = verifiedFloatingLabelReport();
  const evidence = collectRetainedTypographyEvidence(raw.results, collectFullTreeInventory(raw.results));
  const difference = evidence.differences.find((entry) => entry.property === 'fontSize');
  assert.equal(difference.attribution, 'reviewed-floating-label-font-input');
  assert.equal(difference.classification, 'application-plugin-authoring-defect');
  assert.equal(difference.values.reference, '16px');
  assert.equal(difference.values.retained, '12px');
  assert.equal(difference.reviewEvidence.referenceWrapperStyle.transform, 'matrix(0.75, 0, 0, 0.75, 0, -20.14)');
});

test('floating-label attribution rejects absent, competing, or differently transformed evidence', () => {
  const mutations = [
    (e) => { e.family = 'card'; },
    (e) => { e.inputTrees.reference.styles[1].transform = 'none'; },
    (e) => { e.inputTrees.reference.styles[1].transformOrigin = '50% 50%'; },
    (e) => { e.inputTrees.reference.styles[1].transform = 'matrix(0.5, 0, 0, 0.5, 0, -20.14)'; },
    (e) => { e.inputTrees.reference.styles[1].transform = 'matrix(0.75, 0, 0, 0.75, 0, --20..)'; },
    (e) => { e.inputTrees.reference.rules[0].active = false; },
    (e) => { e.inputTrees.reference.nodes[1].type = 'div'; },
    (e) => { e.inputTrees.astylar.nodes[0].authored.class = 'other'; },
    (e) => { e.inputTrees.astylar.nodes[0].retainedText.style.fontSize = '13px'; },
    (e) => { e.inputTrees.astylar.nodes[1].interactionResolvedStyle.transform = 'scale(.75)'; },
    (e) => { delete e.inputTrees.astylar.nodes[1].interactionResolvedStyle; },
    (e) => { e.inputTrees.astylar.nodes[0].parent = 'missing'; },
    (e) => { e.inputTrees.astylar.rules.push({ selector: '.field-label', fontSize: '16px' }); },
  ];
  for (const mutate of mutations) {
    const raw = verifiedFloatingLabelReport();
    mutate(raw.results[0]);
    const evidence = collectRetainedTypographyEvidence(raw.results, collectFullTreeInventory(raw.results));
    assert.equal(evidence.differences.find((entry) => entry.property === 'fontSize').attribution, 'unresolved');
  }
});

test('floating-label font audit covers all six filled controls and explicit floating empty-state rules', () => {
  for (const family of ['form-field', 'input', 'select', 'autocomplete', 'datepicker', 'timepicker']) for (const empty of [false, true]) {
    const raw = verifiedFloatingLabelReport(family, empty), before = structuredClone(raw);
    const evidence = collectRetainedTypographyEvidence(raw.results, collectFullTreeInventory(raw.results));
    const f = evidence.differences.find(d => d.attribution === 'reviewed-floating-label-font-input');
    assert.ok(f, `${family}/${empty}`);
    assert.equal(f.inputEquivalent, false); assert.equal(f.finalRasterVerified, false); assert.equal(f.currentPseudoStatePaintVerified, false);
    assert.equal(f.reviewEvidence.selectedReferenceRules.length, 5);
    assert.equal(f.reviewEvidence.selectedCandidateRule.selector, empty ? '.field-label.empty-field-label' : '.field-label');
    assert.equal(f.reviewEvidence.candidateChain.length, 2);
    assert.deepEqual(raw, before);
  }
  const report = buildMaterialInputAudit(verifiedFloatingLabelReport('timepicker', true));
  assert.deepEqual(validateMaterialInputAudit(report, { requireComplete: false }), []);
});

test('floating-label font audit rejects incomplete cascade, competing declarations and ancestor transforms', () => {
  const controls = [
    (r, a) => { r.nodes[0].inline = null; },
    (r, a) => { r.rules[0].declarations = null; },
    (r, a) => { r.rules[0].declarations.transform = null; },
    (r, a) => { delete r.rules; }, (r, a) => { delete a.rules; },
    (r, a) => { a.resolvedStyleRevision = -1; }, (r, a) => { a.resolvedStyleEvidenceVersion = 1; },
    (r, a) => { r.nodes[0].ownText = 'Other'; }, (r, a) => { a.nodes[0].authored.id = 'other'; },
    (r, a) => { r.nodes.push(structuredClone(r.nodes[1])); },
    (r, a) => { r.nodes[0].rules = [1]; }, (r, a) => { r.nodes[0].inline = { font: { value: '16px Arial' } }; },
    (r, a) => { r.nodes[1].attributes.style = 'transform: scale(.75)'; },
    (r, a) => { r.nodes[1].rules.reverse(); }, (r, a) => { r.nodes[1].rules.pop(); },
    (r, a) => { r.rules[4].active = false; }, (r, a) => { r.rules[4].conditions = ['media']; },
    (r, a) => { r.rules[4].conditions = 'invalid'; }, (r, a) => { r.rules[4].declarations.transform.important = true; },
    (r, a) => { r.rules[4].selector = '.other'; }, (r, a) => { r.rules[1].declarations['font-size'].value = '16px'; },
    (r, a) => { r.rules[4].declarations.transform.value = 'scale(.75) translateY(-106%)'; },
    (r, a) => { r.rules[4].declarations.zoom = { value: '1', important: false }; },
    (r, a) => { a.rules[1].fontSize = '16px'; }, (r, a) => { a.rules[1].top = '9px'; },
    (r, a) => { a.rules[1].mediaMaxWidth = '500px'; }, (r, a) => { a.rules.reverse(); },
    (r, a) => { a.rules.push({ selector: '*', font: '12px Arial' }); },
    (r, a) => { a.rules.push({ selector: '.field-label:hover', fontSize: '12px' }); },
    (r, a) => { a.rules.push({ selector: '#page', transform: 'scale(.75)' }); },
    (r, a) => { a.rules.push({ selector: '#page', transition: 'transform 1s' }); },
    (r, a) => { a.nodes[1].normalResolvedStyle.transform = 'scale(.75)'; },
    (r, a) => { a.nodes[1].authored.style = { zoom: '1.25' }; },
    (r, a) => { delete a.nodes[1].normalResolvedStyle; },
    (r, a) => { a.nodes[0].interactionResolvedStyle = { ...a.nodes[0].interactionResolvedStyle, top: '9px' }; },
    (r, a) => { a.nodes[1].parent = 'page'; },
  ];
  for (const [index, mutate] of controls.entries()) {
    const raw = verifiedFloatingLabelReport('timepicker', true);
    mutate(raw.results[0].inputTrees.reference, raw.results[0].inputTrees.astylar);
    const evidence = collectRetainedTypographyEvidence(raw.results, collectFullTreeInventory(raw.results));
    assert.ok(!evidence.differences.some(d => d.attribution === 'reviewed-floating-label-font-input'), `control ${index}`);
  }
});

test('floating-label font validation replays full claims and detects removed evidence', () => {
  const baseline = buildMaterialInputAudit(verifiedFloatingLabelReport('autocomplete', true));
  const controls = [
    (r, f) => { f.inputEquivalent = true; }, (r, f) => { f.finalRasterVerified = true; },
    (r, f) => { f.reviewEvidence.selectedReferenceRules[4].active = false; },
    (r, f) => { f.reviewEvidence.selectedCandidateRule.fontSize = '16px'; },
    (r, f) => { f.reviewEvidence.candidateChain[1].normal.transform = 'scale(.75)'; },
    (r, f) => { f.reviewEvidence.revision++; }, (r, f) => { f.family = 'chips'; },
    (r, f) => { r.retainedTypography.differences = []; },
    (r, f) => { r.retainedTypography.differences.push(structuredClone(f)); },
    (r, f) => { r.retainedTypography.comparisons = []; },
  ];
  for (const [index, mutate] of controls.entries()) {
    const r = structuredClone(baseline), f = r.retainedTypography.differences.find(d => d.attribution === 'reviewed-floating-label-font-input');
    mutate(r, f);
    assert.ok(validateMaterialInputAudit(r, { requireComplete: false }).some(e => e.includes('floating-label font')), `mutation ${index}`);
  }
});

test('full-tree state provenance survives pooling and legacy captures stay incomplete', () => {
  const entry = { family: 'core', profile: 'light', state: 'hover', viewport: { id: 'desktop' }, inputTrees: {
    astylar: { schemaVersion: 1, nodes: [{ key: 'root/0', parent: 'root', authored: { type: 'button' },
      resolvedStyle: { background: 'purple' }, normalResolvedStyle: { background: 'white' }, interactionResolvedStyle: { background: 'purple' } }], rules: [], errors: [] },
  } };
  assert.equal(collectFullTreeInventory([entry]).stateStyleGaps.length, 1);
  entry.inputTrees.astylar.resolvedStyleEvidenceVersion = 2;
  entry.inputTrees.astylar.resolvedStyleSource = 'core-style-inspection';
  entry.inputTrees.astylar.resolvedStyleRevision = 7;
  entry.inputTrees.astylar.nodes[0].retainedText = {
    source: 'core-text-registry', style: { fontSize: '24px', color: 'black' },
  };
  const result = collectFullTreeInventory([entry]);
  assert.equal(result.stateStyleGaps.length, 0);
  assert.equal(result.variants[0].resolvedStyleSource, 'core-style-inspection');
  assert.equal(result.cases[0].resolvedStyleRevision, 7);
  const node = result.variants[0].nodes[0];
  assert.equal(result.styles[node.normalStyle].value.background, 'white');
  assert.equal(result.styles[node.style].value.background, 'purple');
  assert.equal(result.styles[node.interactionStyle].value.background, 'purple');
  assert.equal(node.retainedText.source, 'core-text-registry');
  assert.equal(result.styles[node.retainedText.style].value.fontSize, '24px');
  assert.equal(result.styles[node.style].value.fontSize, undefined);
});

test('full-tree inventory retains anonymous nodes and pools identical variants without losing cases', () => {
  const entry = { family: 'core', profile: 'light', viewport: { id: 'desktop' }, inputTrees: {
    astylar: { schemaVersion: 1, nodes: [{ key: 'root/0', parent: 'root', authored: { type: 'div' }, resolvedStyle: { width: '100%' } }], rules: [], errors: [] },
    reference: { schemaVersion: 1, nodes: [{ key: 'frame/0', parent: 'frame', type: 'div', attributes: {}, style: 0, rules: [], pseudoElements: [] }], styles: [{ width: '640px' }], rules: [], errors: [] },
  } };
  const result = collectFullTreeInventory([entry, { ...entry, state: 'hover' }]);
  assert.equal(result.variants.length, 2);
  assert.equal(result.cases.length, 4);
  assert.equal(result.styles.length, 2);
  assert.equal(result.gaps.length, 0);
  assert.equal(result.variants[1].nodes[0].authored.type, 'div');
  assert.equal(collectFullTreeInventory([{ ...entry, inputTrees: {} }]).gaps.length, 2);
});

const contextProperties = ['direction', 'writingMode', 'unicodeBidi', 'textAlign', 'textAlignLast',
  'textJustify', 'clip', 'fontKerning', 'textRendering', 'fontVariantLigatures', 'fontFeatureSettings', 'fontVariationSettings'];
const contextStyle = { direction: 'rtl', writingMode: 'vertical-rl', unicodeBidi: 'isolate', textAlign: 'start',
  textAlignLast: 'justify', textJustify: 'inter-character', clip: 'auto', fontKerning: 'none',
  textRendering: 'optimizelegibility', fontVariantLigatures: 'none', fontFeatureSettings: '"kern" 0',
  fontVariationSettings: '"wght" 450' };
function contextCaptureReport() {
  const raw = parityReport({}, {});
  raw.results[0].inputTrees = { reference: { schemaVersion: 1, contextStyleEvidenceVersion: 1,
    contextStyleProperties: [...contextProperties], nodes: [{ key: 'frame', parent: null, type: 'main',
      attributes: { class: 'frame' }, ownText: 'Context', style: 0, rules: [], inline: {},
      pseudoElements: [{ pseudo: '::before', generated: true, style: 1, rules: [] }] }],
    styles: [{ ...contextStyle }, { ...contextStyle, clip: 'rect(0px, 0px, 0px, 0px)' }], rules: [], errors: [] },
    astylar: { schemaVersion: 1, nodes: [{ key: 'root', parent: null, authored: {} }], rules: [], errors: [] } };
  return raw;
}

test('computed browser context survives pooling and old captures remain explicitly incomplete', () => {
  const raw = contextCaptureReport(), entry = raw.results[0], before = structuredClone(raw);
  const result = collectFullTreeInventory([entry, { ...entry, state: 'hover' }]);
  assert.equal(result.referenceContextGaps.length, 0);
  const reference = result.variants.find(v => v.side === 'reference');
  assert.equal(reference.contextStyleEvidenceVersion, 1);
  assert.deepEqual(reference.contextStyleProperties, contextProperties);
  assert.deepEqual(result.styles[reference.nodes[0].style].value, contextStyle);
  assert.equal(result.styles[reference.nodes[0].pseudoElements[0].style].value.clip, 'rect(0px, 0px, 0px, 0px)');
  assert.deepEqual(raw, before);
  delete entry.inputTrees.reference.contextStyleEvidenceVersion;
  const legacy = collectFullTreeInventory([entry, { ...entry, state: 'hover' }]);
  assert.equal(legacy.referenceContextGaps.length, 2);
  assert.ok(legacy.referenceContextGaps.every(g => g.classification === 'parity-harness-defect'));
  assert.equal(new Set(legacy.referenceContextGaps.map(g => g.case)).size, 2);
  assert.ok(validateMaterialInputAudit(buildMaterialInputAudit(raw)).some(error => error.includes('computed-context observations')));
});

test('computed context requires exact metadata and every node and generated-pseudo field', () => {
  for (const mutate of [
    ref => { ref.contextStyleEvidenceVersion = 2; },
    ref => { delete ref.contextStyleProperties; },
    ref => { ref.contextStyleProperties.pop(); },
    ref => { ref.contextStyleProperties.push('direction'); },
    ref => { delete ref.styles[0].direction; },
    ref => { ref.styles[0].writingMode = ''; },
    ref => { ref.styles[0].fontKerning = null; },
    ref => { ref.styles[0].unicodeBidi = 0; },
    ref => { delete ref.styles[1].clip; },
    ref => { delete ref.nodes[0].pseudoElements[0].style; },
  ]) {
    const raw = contextCaptureReport();
    mutate(raw.results[0].inputTrees.reference);
    assert.ok(collectFullTreeInventory(raw.results).referenceContextGaps.length > 0);
  }
  const raw = contextCaptureReport();
  delete raw.results[0].inputTrees.reference.styles[1].clip;
  const gaps = collectFullTreeInventory(raw.results).referenceContextGaps;
  assert.equal(gaps.length, 1);
  assert.equal(gaps[0].node, 'frame');
  assert.equal(gaps[0].pseudo, '::before');
  assert.equal(gaps[0].property, 'clip');
});

test('computed-context completeness is replayed rather than trusting a report claim', () => {
  const audit = buildMaterialInputAudit(contextCaptureReport());
  assert.ok(!validateMaterialInputAudit(audit, { requireComplete: false }).some(e => e.includes('computed-context')));
  for (const mutate of [
    report => { delete report.elementInventory.referenceContextGaps; },
    report => { report.elementInventory.referenceContextGaps.push({ case: 'invented' }); },
    report => { delete report.elementInventory.variants.find(v => v.side === 'reference').contextStyleEvidenceVersion; },
    report => { const node = report.elementInventory.variants.find(v => v.side === 'reference').nodes[0];
      delete report.elementInventory.styles[node.style].value.direction; },
    report => { const node = report.elementInventory.variants.find(v => v.side === 'reference').nodes[0];
      report.elementInventory.styles[node.pseudoElements[0].style].side = 'astylar'; },
  ]) {
    const changed = structuredClone(audit);
    mutate(changed);
    assert.ok(validateMaterialInputAudit(changed, { requireComplete: false }).some(e => e.includes('computed-context gaps do not replay')));
  }
});

function controlTypographyReport() {
  const raw = retainedTypographyReport(), entry = raw.results[0];
  entry.family = 'button';
  const ref = entry.inputTrees.reference, ast = entry.inputTrees.astylar;
  ref.nodes = [
    { key: 'button', parent: 'frame', type: 'button', attributes: { id: 'action' }, ownText: '', style: 0, rules: [], pseudoElements: [] },
    { key: 'label', parent: 'button', type: 'span', attributes: { class: 'mdc-button__label' }, ownText: 'Action', style: 0, rules: [], pseudoElements: [] },
  ];
  ast.paintedControlTextEvidenceVersion = 1;
  ast.nodes[0].authored = { id: 'action', type: 'button', value: 'Action' };
  ast.nodes[0].normalResolvedStyle = { ...ast.nodes[0].normalResolvedStyle };
  ast.nodes[0].interactionResolvedStyle = { ...ast.nodes[0].interactionResolvedStyle };
  ast.nodes[0].retainedText.style = { ...ast.nodes[0].retainedText.style };
  ast.nodes[0].paintedControlText = { source: 'core-control-texture', text: 'Action', maxWidth: 120,
    style: { ...ref.styles[0], fontSize: 24, lineHeight: 32 / 24, letterSpacing: 0, wordSpacing: 0 } };
  return raw;
}

function controlEvidence(raw) {
  return collectControlTypographyEvidence(raw.results, collectFullTreeInventory(raw.results));
}

function horizontalAlignmentReport(control = false) {
  const raw = control ? controlTypographyReport() : retainedTypographyReport();
  const ref = raw.results[0].inputTrees.reference;
  ref.contextStyleEvidenceVersion = 1;
  ref.contextStyleProperties = [...contextProperties];
  ref.styles = ref.styles.map(style => ({ ...style, ...contextStyle, display: 'inline', direction: 'ltr',
    writingMode: 'horizontal-tb', unicodeBidi: 'normal', textAlignLast: 'auto' }));
  ref.styles.push({ ...ref.styles[0], display: 'block', unicodeBidi: 'isolate' });
  ref.nodes.push({ key: 'frame', parent: null, type: 'main', attributes: {}, ownText: '',
    style: 1, rules: [], pseudoElements: [] });
  return raw;
}

test('horizontal start/left interpretation requires complete captured context and preserves raw unequal inputs', () => {
  for (const control of [false, true]) {
    const raw = horizontalAlignmentReport(control), before = structuredClone(raw);
    const report = buildMaterialInputAudit(raw);
    const section = report[control ? 'controlTypography' : 'retainedTypography'];
    const findings = section.differences.filter(d => d.attribution === 'reviewed-horizontal-start-alignment');
    assert.equal(findings.length, 1);
    const finding = findings[0];
    assert.equal(finding.property, 'textAlign');
    assert.equal(finding.values.reference, 'start');
    assert.equal(finding.values[control ? 'painted' : 'retained'], 'left');
    assert.equal(finding.classification, 'equivalent-representation');
    assert.equal(finding.propertyEquivalent, true);
    assert.equal(finding.inputEquivalent, false);
    assert.equal(finding.finalRasterVerified, false);
    assert.equal(finding.reviewEvidence.chain.at(-1).node, 'frame');
    assert.equal(finding.reviewEvidence.chain.at(-1).computed.unicodeBidi, 'isolate');
    assert.ok(!validateMaterialInputAudit(report, { requireComplete: false }).some(e => e.includes('horizontal start')));
    assert.deepEqual(raw, before);
    assert.equal(report.summary.inputEquivalent, false);
  }
});

test('alignment attribution rejects unsafe or incomplete ancestors rather than guessing browser defaults', () => {
  const mutations = [
    ref => { delete ref.contextStyleEvidenceVersion; },
    ref => { ref.contextStyleProperties.pop(); },
    ref => { ref.styles[0].direction = 'rtl'; },
    ref => { ref.styles[1].direction = 'rtl'; },
    ref => { ref.styles[1].unicodeBidi = 'plaintext'; },
    ref => { ref.styles[1].unicodeBidi = 'bidi-override'; },
    ref => { ref.styles[1].unicodeBidi = 'isolate-override'; },
    ref => { ref.styles[1].unicodeBidi = 'embed'; },
    ref => { delete ref.styles[1].unicodeBidi; },
    ref => { ref.styles[1].writingMode = 'vertical-rl'; },
    ref => { ref.styles[0].writingMode = 'vertical-lr'; },
    ref => { ref.styles[1].textAlignLast = 'justify'; },
    ref => { ref.styles[0].textAlignLast = 'right'; },
    ref => { ref.styles[1].textAlign = 'center'; },
    ref => { ref.styles[1].textAlign = 'end'; },
    ref => { ref.styles[1].display = 'contents'; },
    ref => { ref.styles[1].display = 'inline'; },
    ref => { ref.styles[0].display = 'none'; },
    ref => { ref.nodes.pop(); },
    ref => { ref.nodes.push(structuredClone(ref.nodes.at(-1))); },
    ref => { ref.nodes.at(-1).parent = ref.nodes[0].key; },
    ref => { ref.nodes.at(-1).parent = 'missing'; },
    ref => { ref.nodes[0].parent = undefined; },
    ref => { ref.nodes.at(-1).key = 'arbitrary-boundary'; ref.nodes[0].parent = 'arbitrary-boundary'; },
  ];
  for (const control of [false, true]) for (const mutate of mutations) {
    const raw = horizontalAlignmentReport(control);
    mutate(raw.results[0].inputTrees.reference);
    const inventory = collectFullTreeInventory(raw.results);
    const section = control ? collectControlTypographyEvidence(raw.results, inventory)
      : collectRetainedTypographyEvidence(raw.results, inventory);
    assert.equal(section.differences.filter(d => d.attribution === 'reviewed-horizontal-start-alignment').length, 0,
      `${control ? 'control' : 'retained'}: ${mutate}`);
    assert.ok(section.differences.some(d => d.property === 'textAlign' && d.attribution === 'unresolved'));
  }
});

test('alignment claims replay their actual captured styles, ancestry, scope and unique difference records', () => {
  for (const control of [false, true]) {
    const baseline = buildMaterialInputAudit(horizontalAlignmentReport(control));
    const sectionName = control ? 'controlTypography' : 'retainedTypography';
    const mutations = [
      (report, finding) => { finding.reviewEvidence.chain.pop(); },
      (report, finding) => { finding.inputEquivalent = true; },
      (report, finding) => { finding.propertyEquivalent = false; },
      (report, finding) => { finding.finalRasterVerified = true; },
      (report, finding) => { finding.classification = 'application-plugin-authoring-defect'; },
      (report, finding) => { finding.reviewEvidence.comparedStage = 'authored'; },
      (report, finding) => { finding.values.reference = 'left'; },
      (report, finding) => { report[sectionName].differences.push(structuredClone(finding)); },
      report => { report[sectionName].differences = []; },
      report => { report[sectionName].comparisons[0].properties.textAlign.reference = 'left'; },
      report => { report.elementInventory.styles.find(s => s.side === 'reference' && s.value.display === 'block').value.unicodeBidi = 'plaintext'; },
      report => { report.elementInventory.styles.find(s => s.side === 'astylar' && s.value.textAlign === 'left').value.textAlign = 'right'; },
    ];
    for (const mutate of mutations) {
      const report = structuredClone(baseline);
      const finding = report[sectionName].differences.find(d => d.attribution === 'reviewed-horizontal-start-alignment');
      mutate(report, finding);
      assert.ok(validateMaterialInputAudit(report, { requireComplete: false }).some(e => e.includes('horizontal start')),
        `${sectionName}: ${mutate}`);
    }
  }
});

function fieldErrorReport() {
  const raw = retainedTypographyReport(), e = raw.results[0], { reference: r, astylar: a } = e.inputTrees;
  e.family = 'form-field';
  Object.assign(r.styles[0], { fontFamily: 'Roboto', fontSize: '12px', fontWeight: '400', lineHeight: '16px', letterSpacing: '.4px', color: '#b3261e', textAlign: 'left' });
  r.styles.push({ ...r.styles[0], display: 'inline-block', width: '0px', height: '16px', content: '\"\"' });
  const ref = (key, parent, type, attributes = {}, ownText = '') => ({ key, parent, type, attributes, ownText, style: 0, rules: [], pseudoElements: [] });
  r.nodes = [ref('frame', null, 'main', { class: 'frame' }), ref('section', 'frame', 'section', { id: 'form-field-root', class: 'demo' }),
    ref('field', 'section', 'mat-form-field', { id: 'form-field-primary', class: 'mat-mdc-form-field mat-form-field-invalid' }),
    ref('wrapper', 'field', 'div', { class: 'mat-mdc-text-field-wrapper' }),
    ref('flex', 'wrapper', 'div', { class: 'mat-mdc-form-field-flex' }), ref('infix', 'flex', 'div', { class: 'mat-mdc-form-field-infix' }),
    ref('floating', 'infix', 'label', { class: 'mat-mdc-floating-label', for: 'form-field-control' }),
    ref('label', 'floating', 'mat-label', { id: 'form-field-label' }, 'Project name'),
    { ...ref('input', 'infix', 'input', { id: 'form-field-control', matinput: '', 'aria-label': 'Project name', 'aria-invalid': 'true', 'aria-describedby': 'mat-mdc-error-0' }), value: 'Atlas' },
    ref('subscript', 'field', 'div', { class: 'mat-mdc-form-field-subscript-wrapper mat-mdc-form-field-bottom-align' }),
    ref('live', 'subscript', 'div', { class: 'mat-mdc-form-field-error-wrapper', 'aria-live': 'polite', 'aria-atomic': 'true' }),
    ref('error', 'live', 'mat-error', { id: 'mat-mdc-error-0', class: 'mat-mdc-form-field-error mat-mdc-form-field-bottom-align' }, 'Project name is required')];
  for (const key of ['error', 'subscript']) r.nodes.find(n => n.key === key).pseudoElements = [{ pseudo: '::before', generated: true, style: 1, rules: [] }];
  const ast = (key, parent, authored) => ({ key, parent, authored, resolvedStyle: {}, normalResolvedStyle: {}, interactionResolvedStyle: {} });
  a.rules = [{ selector: '#page', fontFamily: 'Roboto, Arial, sans-serif' }];
  a.nodes = [ast('page', 'root', { type: 'main', id: 'page' }), ast('section', 'page', { type: 'section', id: 'form-field-root' }),
    ast('field', 'section', { type: 'div', id: 'form-field-primary', class: 'field-shell' }),
    ast('surface', 'field', { type: 'div', id: 'form-field-control-surface', class: 'field-surface active' }),
    ast('line', 'field', { type: 'div', id: 'form-field-control-active-line', class: 'field-active-line' }),
    ast('label', 'field', { type: 'label', id: 'form-field-label', class: 'field-label', for: 'form-field-control', textContent: 'Project name' }),
    ast('region', 'field', { type: 'div', id: 'form-field-input-region', class: 'field-input-region' }),
    ast('input', 'region', { type: 'input', id: 'form-field-control', inputType: 'text', value: 'Atlas', ariaLabel: 'Project name', ariaInvalid: true }),
    ast('error', 'field', { type: 'span', id: 'form-field-error', class: 'field-error', textContent: 'Project name is required' })];
  a.nodes.at(-1).retainedText = { source: 'core-text-registry', style: { ...r.styles[0], fontFamily: 'Roboto, Arial, sans-serif', lineHeight: 'normal' } };
  for (const stage of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle']) a.nodes[0][stage].fontFamily = 'Roboto, Arial, sans-serif';
  return raw;
}

test('field error mapping preserves generated description linkage live wrapper and pseudo spacers', () => {
  const raw = fieldErrorReport(), before = structuredClone(raw), cases = raw.results.map(e => ({ ...e, kind: 'static' }));
  const t = collectRetainedTypographyEvidence(cases, collectFullTreeInventory(cases));
  const maps = t.reviewedMappings.filter(m => m.kind === 'reviewed-field-error-text');
  assert.equal(maps.length, 1);
  const m = maps[0];
  assert.equal(m.element, 'form-field-error'); assert.equal(m.inputEquivalent, false); assert.equal(m.finalRasterVerified, false);
  assert.equal(m.reviewEvidence.referencePath.length, 6); assert.equal(m.reviewEvidence.candidatePath.length, 4);
  assert.equal(m.reviewEvidence.referenceInputPath[0].attributes['aria-describedby'], m.reviewEvidence.referencePath[0].attributes.id);
  assert.equal(m.reviewEvidence.referencePath[1].attributes['aria-live'], 'polite');
  assert.equal(m.reviewEvidence.candidateInput.authored.ariaDescribedby, undefined);
  assert.ok([0, 2].every(index => m.reviewEvidence.referencePath[index].pseudoElements[0].generated === true));
  assert.ok(!t.gaps.some(g => ['form-field-error', 'mat-mdc-error-0'].includes(g.element)));
  assert.deepEqual(t.differences.filter(d => d.element === 'form-field-error').map(d => d.property), ['fontFamily', 'lineHeight']);
  assert.deepEqual(raw, before);
});

test('field error mapping refuses ambiguous IDs broken descriptions and changed field composition', () => {
  const controls = [
    (r, a) => { r.nodes.push(structuredClone(r.nodes[0])); },
    (r, a) => { a.nodes.push({ ...structuredClone(a.nodes[0]), key: 'duplicate' }); },
    (r, a) => { r.nodes.find(n => n.key === 'error').attributes.id = 'custom-error'; },
    (r, a) => { r.nodes.find(n => n.key === 'error').ownText = 'Other'; },
    (r, a) => { r.nodes.find(n => n.key === 'input').attributes['aria-describedby'] = 'other'; },
    (r, a) => { r.nodes.find(n => n.key === 'input').attributes['aria-invalid'] = 'false'; },
    (r, a) => { r.nodes.find(n => n.key === 'live').attributes['aria-live'] = 'off'; },
    (r, a) => { r.nodes.find(n => n.key === 'live').attributes['aria-atomic'] = 'false'; },
    (r, a) => { r.nodes.find(n => n.key === 'error').pseudoElements = []; },
    (r, a) => { r.nodes.find(n => n.key === 'subscript').pseudoElements = []; },
    (r, a) => { r.nodes.find(n => n.key === 'field').attributes.class = 'mat-mdc-form-field'; },
    (r, a) => { r.nodes.find(n => n.key === 'error').parent = 'field'; },
    (r, a) => { r.nodes.find(n => n.key === 'infix').parent = 'field'; },
    (r, a) => { r.nodes.find(n => n.key === 'floating').attributes.for = 'other'; },
    (r, a) => { r.nodes.find(n => n.key === 'label').ownText = 'Other'; },
    (r, a) => { r.nodes.find(n => n.key === 'frame').parent = 'other'; },
    (r, a) => { a.nodes.find(n => n.key === 'input').authored.value = 'Other'; },
    (r, a) => { a.nodes.find(n => n.key === 'input').authored.ariaInvalid = false; },
    (r, a) => { a.nodes.find(n => n.key === 'input').authored.ariaDescribedby = 'form-field-error'; },
    (r, a) => { a.nodes.find(n => n.key === 'error').authored.ariaLive = 'polite'; },
    (r, a) => { a.nodes.find(n => n.key === 'error').authored.role = 'alert'; },
    (r, a) => { a.nodes.find(n => n.key === 'error').authored.textContent = 'Other'; },
    (r, a) => { a.nodes.find(n => n.key === 'error').authored.type = 'div'; },
    (r, a) => { a.nodes.find(n => n.key === 'surface').authored.class = 'field-surface'; },
    (r, a) => { a.nodes.find(n => n.key === 'error').parent = 'region'; },
    (r, a) => { a.nodes.find(n => n.key === 'label').authored.for = 'other'; },
    (r, a) => { a.nodes.find(n => n.key === 'page').parent = 'other'; },
    (r, a) => { a.nodes.push({ key: 'hint', parent: 'field', authored: { type: 'span', id: 'form-field-hint', textContent: 'Public label' } }); },
    (r, a) => { const i = a.nodes.findIndex(n => n.key === 'error'), j = a.nodes.findIndex(n => n.key === 'region'); [a.nodes[i], a.nodes[j]] = [a.nodes[j], a.nodes[i]]; },
  ];
  for (const [index, mutate] of controls.entries()) {
    const raw = fieldErrorReport(), { reference: r, astylar: a } = raw.results[0].inputTrees; mutate(r, a);
    assert.deepEqual(reviewedTemplateTextMappings('form-field', r, a), [], `control ${index}`);
  }
});

test('field error mapping leaves missing text and retained stages as explicit gaps', () => {
  const raw = fieldErrorReport(), e = raw.results[0];
  delete e.inputTrees.astylar.nodes.at(-1).retainedText;
  let cases = [{ ...e, kind: 'static' }], t = collectRetainedTypographyEvidence(cases, collectFullTreeInventory(cases));
  assert.ok(t.gaps.some(g => g.element === 'form-field-error' && g.reason.includes('no authoritative retained')));
  e.inputTrees.astylar.nodes.pop();
  cases = [{ ...e, kind: 'static' }]; t = collectRetainedTypographyEvidence(cases, collectFullTreeInventory(cases));
  assert.equal(t.reviewedMappings.filter(m => m.kind === 'reviewed-field-error-text').length, 0);
  assert.ok(t.gaps.some(g => g.element === 'mat-mdc-error-0'));
});

test('field error report replays correspondence text relations pseudo and typography evidence', () => {
  const original = buildMaterialInputAudit(fieldErrorReport());
  assert.equal(original.retainedTypography.reviewedMappings.filter(m => m.kind === 'reviewed-field-error-text').length, 1);
  assert.ok(original.sourceFindings.find(f => f.id === 'fixture-field-error-subscript-substitution')?.detected);
  assert.ok(!validateMaterialInputAudit(original, { requireComplete: false }).some(e => e.includes('field error')));
  for (const mutate of [
    (r, m) => { r.retainedTypography.reviewedMappings = r.retainedTypography.reviewedMappings.filter(v => v !== m); },
    (r, m) => { m.inputEquivalent = true; },
    (r, m) => { m.finalRasterVerified = true; },
    (r, m) => { m.reviewEvidence.referenceInputPath[0].attributes['aria-describedby'] = 'other'; },
    (r, m) => { m.reviewEvidence.referencePath[1].attributes['aria-live'] = 'off'; },
    (r, m) => { m.reviewEvidence.referencePath[0].pseudoElements = []; },
    (r, m) => { m.reviewEvidence.candidateInput.authored.ariaDescribedby = 'form-field-error'; },
    (r, m) => { m.reviewEvidence.candidatePath.pop(); },
    (r, m) => { r.retainedTypography.differences.pop(); },
    (r, m) => { m.case = 'static:dialog@light/desktop'; m.element = 'other'; },
  ]) {
    const report = structuredClone(original), inventory = structuredClone(report.elementInventory);
    mutate(report, report.retainedTypography.reviewedMappings.find(m => m.kind === 'reviewed-field-error-text'));
    assert.deepEqual(report.elementInventory, inventory);
    assert.ok(validateMaterialInputAudit(report, { requireComplete: false }).some(e => e.includes('field error')));
  }
});

function dialogTextReport() {
  const raw = retainedTypographyReport(), e = raw.results[0], { reference: r, astylar: a } = e.inputTrees;
  e.family = 'dialog';
  Object.assign(r.styles[0], { fontFamily: 'Roboto', fontSize: '24px', fontWeight: '400', lineHeight: '32px', textAlign: 'left', color: '#1d1b1e' });
  r.styles.push({ ...r.styles[0], fontSize: '14px', lineHeight: '20px', color: '#49454e', letterSpacing: '.1px' });
  r.styles.push({ ...r.styles[0], display: 'inline-block', width: '0px', height: '40px', content: '\"\"' });
  const n = (key, parent, type, attributes = {}, ownText = '') => ({ key, parent, type, attributes, ownText, style: 0, rules: [], pseudoElements: [] });
  r.nodes = [n('frame', null, 'main', { class: 'frame' }), n('section', 'frame', 'section', { id: 'dialog-root' }),
    n('trigger', 'section', 'button', { id: 'dialog-primary', 'mat-flat-button': '' }),
    n('trigger-label', 'trigger', 'span', { class: 'mdc-button__label' }, 'Open dialog'),
    n('overlay', null, 'div', { class: 'cdk-overlay-container' }),
    n('backdrop', 'overlay', 'div', { class: 'cdk-overlay-backdrop cdk-overlay-dark-backdrop cdk-overlay-backdrop-showing' }),
    n('wrapper', 'overlay', 'div', { class: 'cdk-global-overlay-wrapper', dir: 'ltr' }),
    n('pane', 'wrapper', 'div', { id: 'cdk-overlay-0', class: 'cdk-overlay-pane mat-mdc-dialog-panel' }),
    n('focus-start', 'pane', 'div', { class: 'cdk-visually-hidden cdk-focus-trap-anchor', tabindex: '0', 'aria-hidden': 'true' }),
    n('dialog', 'pane', 'mat-dialog-container', { id: 'material-dialog', class: 'mat-mdc-dialog-container mdc-dialog--open', role: 'dialog', tabindex: '-1', 'aria-modal': 'false', 'aria-labelledby': 'mat-mdc-dialog-title-0' }),
    n('focus-end', 'pane', 'div', { class: 'cdk-visually-hidden cdk-focus-trap-anchor', tabindex: '0', 'aria-hidden': 'true' }),
    n('inner', 'dialog', 'div', { class: 'mat-mdc-dialog-inner-container' }), n('surface', 'inner', 'div', { class: 'mat-mdc-dialog-surface' }),
    n('title', 'surface', 'h2', { id: 'mat-mdc-dialog-title-0', 'mat-dialog-title': '', 'data-parity-id': 'dialog-title', class: 'mat-mdc-dialog-title' }, 'Confirm action'),
    n('copy', 'surface', 'mat-dialog-content', { 'data-parity-id': 'dialog-copy', class: 'mat-mdc-dialog-content' }, 'Save Project Atlas?'),
    n('actions', 'surface', 'mat-dialog-actions', { 'data-parity-id': 'dialog-actions', class: 'mat-mdc-dialog-actions' })];
  r.nodes.find(n => n.key === 'title').pseudoElements = [{ pseudo: '::before', generated: true, style: 2, rules: [] }];
  r.nodes.find(n => n.key === 'copy').style = 1;
  for (const [index, name] of ['Cancel', 'Save'].entries()) {
    const key = `actions/${name.toLowerCase()}`;
    r.nodes.push(n(key, 'actions', 'button', { 'data-parity-id': `dialog-${name.toLowerCase()}`, 'mat-dialog-close': '', [index ? 'mat-flat-button' : 'mat-button']: '' }),
      n(`${key}/label`, key, 'span', { class: 'mdc-button__label' }, name));
  }
  const ast = (key, parent, authored) => ({ key, parent, authored, resolvedStyle: {}, normalResolvedStyle: {}, interactionResolvedStyle: {} });
  a.rules = [{ selector: '#page', fontFamily: 'Roboto, Arial, sans-serif' }];
  a.nodes = [ast('page', 'root', { type: 'main', id: 'page' }), ast('section', 'page', { type: 'section', id: 'dialog-root' }),
    ast('trigger', 'section', { type: 'button', id: 'dialog-primary', class: 'material-button', value: 'Open dialog' }),
    ast('modal', 'section', { type: 'dialog', id: 'dialog-overlay', class: 'modal-overlay', open: true, modal: true, ariaLabel: 'Open dialog' }),
    ast('panel', 'modal', { type: 'section', id: 'dialog-panel', class: 'dialog-panel' }),
    ast('heading', 'panel', { type: 'h2', id: 'dialog-title', class: 'dialog-title' }),
    ast('title', 'heading', { type: 'span', id: 'dialog-title-label', textContent: 'Confirm action' }),
    ast('copy', 'panel', { type: 'p', id: 'dialog-copy', class: 'dialog-copy', textContent: 'Save Project Atlas?' }),
    ast('actions', 'panel', { type: 'div', id: 'dialog-actions', class: 'dialog-actions' }),
    ast('cancel', 'actions', { type: 'button', id: 'dialog-cancel', class: 'dialog-action', autofocus: true, value: 'Cancel' }),
    ast('save', 'actions', { type: 'button', id: 'dialog-save', class: 'dialog-action primary', value: 'Save' })];
  for (const [key, index, color] of [['title', 0, '#1d1b20'], ['copy', 1, '#49454f']])
    a.nodes.find(n => n.key === key).retainedText = { source: 'core-text-registry', style: { ...r.styles[index], fontFamily: 'Roboto, Arial, sans-serif', color, letterSpacing: '0px' } };
  for (const stage of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle']) a.nodes[0][stage].fontFamily = 'Roboto, Arial, sans-serif';
  return raw;
}

function dialogActionTypographyReport() {
  const raw = dialogTextReport(), { reference: r, astylar: a } = raw.results[0].inputTrees;
  a.paintedControlTextEvidenceVersion = 1;
  r.rules = [{ selector: 'button, input, select', active: true, conditions: [],
    declarations: { 'font-family': { value: 'inherit', important: false } } }];
  a.rules.push({ selector: 'button, input, select', fontFamily: 'Roboto, Arial, sans-serif' },
    { selector: '.dialog-action', fontSize: '14px', fontWeight: '500', height: '40px' },
    { selector: '.dialog-action.primary', background: '#7d00fa' });
  const style = { ...r.styles[0], fontSize: '14px', fontWeight: '500', lineHeight: 'normal', letterSpacing: '.096px', textAlign: 'center' };
  r.styles.push(style);
  for (const [name, kind] of [['cancel', 'text'], ['save', 'filled']]) {
    r.rules.push({ selector: kind === 'text' ? '.mat-mdc-button' : '.mat-mdc-unelevated-button', active: true, conditions: [],
      declarations: {
        'font-family': { value: `var(--mat-button-${kind}-label-text-font, var(--mat-sys-label-large-font))`, important: false },
        'letter-spacing': { value: `var(--mat-button-${kind}-label-text-tracking, var(--mat-sys-label-large-tracking))`, important: false },
      } });
    const parent = r.nodes.find(n => n.key === `actions/${name}`), label = r.nodes.find(n => n.key === `actions/${name}/label`);
    parent.rules = [0, r.rules.length - 1]; parent.style = label.style = r.styles.length - 1;
    const node = a.nodes.find(n => n.key === name);
    for (const stage of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle'])
      node[stage] = { fontFamily: 'Roboto, Arial, sans-serif', fontSize: '14px', fontWeight: '500' };
    node.paintedControlText = { source: 'core-control-texture', text: node.authored.value,
      style: { ...style, fontFamily: 'Roboto, Arial, sans-serif', fontSize: 14, lineHeight: 17 / 14, letterSpacing: 0, wordSpacing: 0 } };
  }
  r.rules.push({ selector: '.mat-mdc-button._mat-animation-noopable, .mat-mdc-unelevated-button._mat-animation-noopable, .mat-mdc-raised-button._mat-animation-noopable, .mat-mdc-outlined-button._mat-animation-noopable, .mat-tonal-button._mat-animation-noopable',
    active: true, conditions: [], declarations: { 'animation-name': { value: 'none', important: true } } });
  for (const name of ['cancel', 'save']) {
    const parent = r.nodes.find(n => n.key === `actions/${name}`);
    parent.attributes.class = '_mat-animation-noopable'; parent.rules.push(r.rules.length - 1);
  }
  return raw;
}

test('dialog action typography retains distinct text and filled tokens without accepting equal inputs', () => {
  const raw = dialogActionTypographyReport(), before = structuredClone(raw), report = buildMaterialInputAudit(raw);
  const findings = report.controlTypography.differences.filter(d => d.attribution === 'reviewed-dialog-action-typography-input');
  assert.equal(findings.length, 4);
  for (const f of findings) {
    assert.equal(f.inputEquivalent, false); assert.equal(f.finalRasterVerified, false);
    assert.equal(f.classification, 'application-plugin-authoring-defect');
    assert.equal(f.reviewEvidence.referenceChain.length, 2);
    assert.equal(f.reviewEvidence.referenceChain[1].disabledAnimationRules.length, 1);
    assert.equal(f.reviewEvidence.structure.referenceActions.length, 5);
    if (f.property === 'letterSpacing') assert.equal(f.reviewEvidence.candidateChain.length, 6);
    else assert.equal(f.reviewEvidence.candidateResetRule.fontFamily, 'Roboto, Arial, sans-serif');
  }
  assert.ok(report.controlTypography.differences.some(d => d.element === 'dialog-save' && d.property === 'lineHeight' && d.attribution === 'unresolved'));
  assert.ok(!validateMaterialInputAudit(report, { requireComplete: false }).some(e => e.includes('dialog action typography')));
  assert.deepEqual(raw, before);
});

test('dialog action typography rejects missing competing and contradictory font inputs', () => {
  const controls = [
    [null, (r, a) => { delete r.errors; }], [null, (r, a) => { delete a.errors; }],
    [null, (r, a) => { a.nodes.find(n => n.key === 'modal').authored.open = false; }],
    [null, (r, a) => { r.nodes.find(n => n.key === 'actions/cancel').parent = 'surface'; }],
    [null, (r, a) => { r.nodes.find(n => n.key === 'actions/cancel/label').ownText = 'Changed'; }],
    [null, (r, a) => { a.nodes.find(n => n.key === 'cancel').paintedControlText.text = 'Changed'; }],
    [null, (r, a) => { r.rules[1].active = false; }],
    [null, (r, a) => { r.rules[1].conditions = ['@media print']; }],
    [null, (r, a) => { r.rules[1].declarations.all = { value: 'initial', important: false }; }],
    [null, (r, a) => { r.rules.at(-1).declarations['animation-name'].value = 'animate-font'; }],
    [null, (r, a) => { r.rules.at(-1).active = false; }],
    [null, (r, a) => { r.rules.at(-1).declarations['animation-name'].important = false; }],
    ['fontFamily', (r, a) => { r.rules[0].declarations['font-family'].value = 'Arial'; }],
    ['fontFamily', (r, a) => { r.rules[1].declarations['font-family'].important = true; }],
    ['fontFamily', (r, a) => { r.rules[1].declarations['font-family'].value = 'Roboto'; }],
    ['fontFamily', (r, a) => { r.nodes.find(n => n.key === 'actions/cancel').rules.reverse(); }],
    ['fontFamily', (r, a) => { a.rules.find(r => r.selector === '.dialog-action').fontFamily = 'Roboto'; }],
    ['fontFamily', (r, a) => { a.rules.find(r => r.selector === 'button, input, select').mediaMaxWidth = '500px'; }],
    ['fontFamily', (r, a) => { a.nodes.find(n => n.key === 'cancel').normalResolvedStyle.fontFamily = 'Roboto'; }],
    ['fontFamily', (r, a) => { a.nodes.find(n => n.key === 'cancel').paintedControlText.style.fontFamily = 'Arial'; }],
    ['fontFamily', (r, a) => { a.rules.push({ selector: '.dialog-action:hover', fontFamily: 'Arial' }); }],
    ['letterSpacing', (r, a) => { r.rules[1].declarations['letter-spacing'].value = 'normal'; }],
    ['letterSpacing', (r, a) => { a.nodes.find(n => n.key === 'panel').normalResolvedStyle.letterSpacing = '0px'; }],
    ['letterSpacing', (r, a) => { a.nodes.find(n => n.key === 'cancel').authored.style = { letterSpacing: '0px' }; }],
    ['letterSpacing', (r, a) => { a.rules.push({ selector: '.dialog-panel', letterSpacing: '.096px' }); }],
    ['letterSpacing', (r, a) => { a.nodes.find(n => n.key === 'cancel').paintedControlText.style.letterSpacing = 1; }],
    ['letterSpacing', (r, a) => { a.nodes.find(n => n.key === 'page').parent = 'other'; }],
    [null, (r, a) => { r.rules.push({ selector: '.mdc-button__label', active: true, conditions: [], declarations: { font: { value: 'inherit', important: false } } }); r.nodes.find(n => n.key === 'actions/cancel/label').rules.push(r.rules.length - 1); }],
  ];
  for (const [index, [property, mutate]] of controls.entries()) {
    const raw = dialogActionTypographyReport(), { reference: r, astylar: a } = raw.results[0].inputTrees;
    mutate(r, a);
    const t = controlEvidence(raw);
    assert.ok(!t.differences.some(d => d.element === 'dialog-cancel' && (!property || d.property === property) &&
      d.attribution === 'reviewed-dialog-action-typography-input'), `control ${index}`);
  }
});

test('dialog action typography report replays all control evidence and rejects deleted claims', () => {
  const baseline = buildMaterialInputAudit(dialogActionTypographyReport());
  const controls = [
    (r, f) => { f.inputEquivalent = true; }, (r, f) => { f.finalRasterVerified = true; },
    (r, f) => { f.reviewEvidence.referenceChain.pop(); }, (r, f) => { f.reviewEvidence.candidateResetRule.fontFamily = 'Roboto'; },
    (r, f) => { f.values.painted = 'roboto'; }, (r, f) => { f.revision++; },
    (r, f) => { f.family = 'menu'; }, (r, f) => { f.case = 'static:dialog@dark/desktop'; },
    (r, f) => { r.controlTypography.differences = []; }, (r, f) => { r.controlTypography.comparisons = []; },
    (r, f) => { r.controlTypography.differences.push(structuredClone(f)); },
  ];
  for (const [index, mutate] of controls.entries()) {
    const report = structuredClone(baseline), finding = report.controlTypography.differences.find(d => d.attribution === 'reviewed-dialog-action-typography-input');
    mutate(report, finding);
    assert.ok(validateMaterialInputAudit(report, { requireComplete: false }).some(e => e.includes('dialog action typography')), `mutation ${index}`);
  }
});

test('dialog text mapping preserves generated title linkage pseudo spacer and unequal overlay structure', () => {
  const raw = dialogTextReport(), before = structuredClone(raw), cases = raw.results.map(e => ({ ...e, kind: 'static' }));
  const t = collectRetainedTypographyEvidence(cases, collectFullTreeInventory(cases));
  const mappings = t.reviewedMappings.filter(m => m.kind === 'reviewed-dialog-content-text');
  assert.deepEqual(mappings.map(m => m.element), ['dialog-title-label', 'dialog-copy']);
  for (const m of mappings) {
    assert.equal(m.inputEquivalent, false); assert.equal(m.finalRasterVerified, false); assert.equal(m.classification, 'application-plugin-authoring-defect');
    assert.equal(m.reviewEvidence.referencePath.length, 7); assert.equal(m.reviewEvidence.referenceFocusAnchors.length, 2);
    assert.equal(m.reviewEvidence.referenceTitle.attributes.id, 'mat-mdc-dialog-title-0');
    assert.equal(m.reviewEvidence.referenceTitle.pseudoElements[0].generated, true);
    assert.equal(m.reviewEvidence.referencePath[3].attributes['aria-labelledby'], 'mat-mdc-dialog-title-0');
    assert.equal(m.reviewEvidence.candidateActions.length, 3);
  }
  // This minimal helper does not supply authoritative control-texture evidence.
  // Preserve its independent trigger/action gaps, not the now-mapped title/copy.
  assert.equal(t.gaps.length, 1);
  assert.deepEqual(t.gaps[0].referenceNodes, ['trigger-label', 'actions/cancel/label', 'actions/save/label']);
  assert.equal(t.differences.filter(d => d.property === 'fontFamily' && d.attribution === 'unresolved').length, 2);
  assert.deepEqual(raw, before);
});

test('dialog text action evidence follows parent relationships rather than generated key prefixes', () => {
  const raw = dialogTextReport(), { reference: r, astylar: a } = raw.results[0].inputTrees;
  const keys = new Map(r.nodes.map((n, index) => [n.key, `node-${index}`]));
  for (const node of r.nodes) { node.key = keys.get(node.key); node.parent = keys.get(node.parent) ?? null; }
  const maps = reviewedTemplateTextMappings('dialog', r, a);
  assert.equal(maps.length, 2);
  for (const m of maps) assert.equal(m.reviewEvidence.referenceActions.length, 5);
});

test('dialog text mapping refuses missing ambiguous or contradictory structure and title linkage', () => {
  const controls = [
    (r, a) => { r.nodes.push(structuredClone(r.nodes[0])); },
    (r, a) => { a.nodes.push({ ...structuredClone(a.nodes[0]), key: 'duplicate-id' }); },
    (r, a) => { r.nodes.push({ key: 'duplicate-parity', attributes: { 'data-parity-id': 'dialog-copy' } }); },
    (r, a) => { r.nodes.find(n => n.key === 'title').attributes.id = 'other'; },
    (r, a) => { r.nodes.find(n => n.key === 'dialog').attributes['aria-labelledby'] = 'other'; },
    (r, a) => { r.nodes.find(n => n.key === 'dialog').attributes['aria-label'] = 'Confirm action'; },
    (r, a) => { r.nodes.find(n => n.key === 'dialog').attributes['aria-modal'] = 'true'; },
    (r, a) => { r.nodes.find(n => n.key === 'dialog').attributes.class = 'mat-mdc-dialog-container'; },
    (r, a) => { r.nodes.find(n => n.key === 'title').pseudoElements = []; },
    (r, a) => { r.nodes.find(n => n.key === 'title').ownText = 'Other'; },
    (r, a) => { r.nodes.find(n => n.key === 'copy').type = 'p'; },
    (r, a) => { r.nodes.find(n => n.key === 'copy').attributes.id = 'dialog-copy'; },
    (r, a) => { r.nodes.find(n => n.key === 'copy').parent = 'dialog'; },
    (r, a) => { const i = r.nodes.findIndex(n => n.key === 'title'), j = r.nodes.findIndex(n => n.key === 'copy'); [r.nodes[i], r.nodes[j]] = [r.nodes[j], r.nodes[i]]; },
    (r, a) => { r.nodes.find(n => n.key === 'inner').parent = 'pane'; },
    (r, a) => { r.nodes.find(n => n.key === 'wrapper').attributes.dir = 'rtl'; },
    (r, a) => { r.nodes.find(n => n.key === 'overlay').parent = 'frame'; },
    (r, a) => { r.nodes = r.nodes.filter(n => n.key !== 'focus-start'); },
    (r, a) => { r.nodes.find(n => n.key === 'focus-end').attributes['aria-hidden'] = 'false'; },
    (r, a) => { r.nodes.find(n => n.key === 'focus-end').attributes.tabindex = '-1'; },
    (r, a) => { r.nodes.find(n => n.key === 'backdrop').attributes.class = 'cdk-overlay-backdrop'; },
    (r, a) => { r.nodes.find(n => n.key === 'actions/cancel/label').ownText = 'Save'; },
    (r, a) => { delete r.nodes.find(n => n.key === 'actions/save').attributes['mat-dialog-close']; },
    (r, a) => { r.nodes.find(n => n.key === 'trigger-label').ownText = 'Other'; },
    (r, a) => { a.nodes.find(n => n.key === 'modal').authored.open = false; },
    (r, a) => { a.nodes.find(n => n.key === 'modal').authored.modal = false; },
    (r, a) => { a.nodes.find(n => n.key === 'modal').authored.ariaLabel = 'Confirm action'; },
    (r, a) => { a.nodes.find(n => n.key === 'modal').authored.ariaLabelledby = 'dialog-title'; },
    (r, a) => { a.nodes.find(n => n.key === 'title').parent = 'panel'; },
    (r, a) => { a.nodes.find(n => n.key === 'heading').authored.textContent = 'Confirm action'; },
    (r, a) => { a.nodes.find(n => n.key === 'copy').authored.type = 'div'; },
    (r, a) => { a.nodes.find(n => n.key === 'copy').authored.textContent = 'Other'; },
    (r, a) => { a.nodes.find(n => n.key === 'panel').parent = 'section'; },
    (r, a) => { a.nodes.find(n => n.key === 'cancel').authored.autofocus = false; },
    (r, a) => { a.nodes.find(n => n.key === 'save').authored.value = 'Cancel'; },
    (r, a) => { const i = a.nodes.findIndex(n => n.key === 'cancel'), j = a.nodes.findIndex(n => n.key === 'save'); [a.nodes[i], a.nodes[j]] = [a.nodes[j], a.nodes[i]]; },
    (r, a) => { a.nodes.push({ key: 'extra', parent: 'title', authored: { type: 'span', textContent: 'extra' } }); },
  ];
  for (const [index, mutate] of controls.entries()) {
    const raw = dialogTextReport(), { reference: r, astylar: a } = raw.results[0].inputTrees; mutate(r, a);
    assert.deepEqual(reviewedTemplateTextMappings('dialog', r, a), [], `control ${index}`);
  }
});

test('dialog text mapping keeps closed and missing retained stages explicit', () => {
  const raw = dialogTextReport(), e = raw.results[0];
  delete e.inputTrees.astylar.nodes.find(n => n.key === 'title').retainedText;
  let cases = [{ ...e, kind: 'static' }], t = collectRetainedTypographyEvidence(cases, collectFullTreeInventory(cases));
  assert.ok(t.gaps.some(g => g.element === 'dialog-title-label' && g.reason.includes('no authoritative retained')));
  e.inputTrees.astylar.nodes = e.inputTrees.astylar.nodes.filter(n => ['page', 'section', 'trigger'].includes(n.key));
  cases = [{ ...e, kind: 'static' }]; t = collectRetainedTypographyEvidence(cases, collectFullTreeInventory(cases));
  assert.equal(t.reviewedMappings.filter(m => m.kind === 'reviewed-dialog-content-text').length, 0);
  assert.ok(t.gaps.some(g => g.element === 'mat-mdc-dialog-title-0'));
});

test('dialog text replay rejects fabricated correspondence and independent stage mutations', () => {
  const original = buildMaterialInputAudit(dialogTextReport());
  assert.ok(original.sourceFindings.find(f => f.id === 'fixture-dialog-text-flow-substitution')?.detected);
  assert.equal(original.retainedTypography.reviewedMappings.filter(m => m.kind === 'reviewed-dialog-content-text').length, 2);
  assert.ok(!validateMaterialInputAudit(original, { requireComplete: false }).some(e => e.includes('dialog text')));
  for (const mutate of [
    (r, m) => { r.retainedTypography.reviewedMappings = r.retainedTypography.reviewedMappings.filter(v => v !== m); },
    (r, m) => { m.inputEquivalent = true; },
    (r, m) => { m.finalRasterVerified = true; },
    (r, m) => { m.reviewEvidence.referenceFocusAnchors.pop(); },
    (r, m) => { m.reviewEvidence.referenceTitle.attributes.id = 'other'; },
    (r, m) => { m.reviewEvidence.referenceTitle.pseudoElements = []; },
    (r, m) => { m.reviewEvidence.referencePath[3].attributes['aria-labelledby'] = 'other'; },
    (r, m) => { m.reviewEvidence.candidatePath.pop(); },
    (r, m) => { m.reviewEvidence.candidateActions.reverse(); },
    (r, m) => { r.retainedTypography.comparisons[0].revision++; },
    (r, m) => { r.retainedTypography.differences.pop(); },
    (r, m) => { r.retainedTypography.differences[0].values.retained = 'fake'; },
    (r, m) => { m.case = 'static:menu@light/desktop'; m.element = 'other'; },
  ]) {
    const report = structuredClone(original), inventory = structuredClone(report.elementInventory);
    mutate(report, report.retainedTypography.reviewedMappings.find(m => m.kind === 'reviewed-dialog-content-text'));
    assert.deepEqual(report.elementInventory, inventory);
    assert.ok(validateMaterialInputAudit(report, { requireComplete: false }).some(e => e.includes('dialog text')));
  }
});

function dialogInkReport() {
  const raw = dialogTextReport(), { reference: r, astylar: a } = raw.results[0].inputTrees;
  for (const [key, owner, selector, value, color] of [
    ['title', 'heading', '.dialog-title', 'var(--mat-dialog-subhead-color, var(--mat-sys-on-surface, rgba(0, 0, 0, 0.87)))', '#1d1b20'],
    ['copy', 'copy', '.dialog-copy', 'var(--mat-dialog-supporting-text-color, var(--mat-sys-on-surface-variant, rgba(0, 0, 0, 0.6)))', '#49454f'],
  ]) {
    const index = r.rules.length;
    r.rules.push({ source: `sheet:0/${index}`, selector: `.mat-mdc-dialog-container .mat-mdc-dialog-${key === 'title' ? 'title' : 'content'}`, active: true, conditions: [], declarations: { color: { value, important: false } } });
    r.nodes.find(n => n.key === key).rules = [index];
    a.rules.push({ selector, color });
    for (const stage of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle']) a.nodes.find(n => n.key === owner)[stage].color = color;
  }
  return raw;
}

test('dialog ink traces direct tokens versus literal content and inherited heading color', () => {
  const raw = dialogInkReport(), before = structuredClone(raw), cases = raw.results.map(e => ({ ...e, kind: 'static' }));
  const t = collectRetainedTypographyEvidence(cases, collectFullTreeInventory(cases));
  const ink = t.differences.filter(d => d.attribution === 'reviewed-dialog-text-ink-input');
  assert.equal(ink.length, 2);
  for (const d of ink) {
    assert.equal(d.inputEquivalent, false); assert.equal(d.currentPseudoStatePaintVerified, false); assert.equal(d.finalRasterVerified, false);
    assert.equal(d.classification, 'application-plugin-authoring-defect');
    assert.equal(d.reviewEvidence.referenceRule.declarations.color.important, false);
    assert.equal(d.reviewEvidence.candidateRetained.color, d.element === 'dialog-copy' ? '#49454f' : '#1d1b20');
    assert.equal(d.reviewEvidence.candidateChain.length, d.element === 'dialog-copy' ? 1 : 2);
  }
  assert.equal(ink[0].reviewEvidence.candidateChain[0].normal.color, undefined);
  assert.equal(t.differences.filter(d => d.property === 'fontFamily' && d.attribution === 'unresolved').length, 2);
  assert.ok(t.differences.some(d => d.property === 'letterSpacing' && d.attribution === 'unresolved'));
  assert.deepEqual(raw, before);
});

test('dialog ink refuses missing competing and contradictory declarations or retained stages', () => {
  const controls = [
    (r, a, ref, leaf, owner, rule, astRule) => { delete r.errors; },
    (r, a, ref, leaf, owner, rule, astRule) => { rule.active = false; },
    (r, a, ref, leaf, owner, rule, astRule) => { rule.declarations.color.important = true; },
    (r, a, ref, leaf, owner, rule, astRule) => { rule.conditions = ['@layer base']; },
    (r, a, ref, leaf, owner, rule, astRule) => { rule.source = 'sheet:0/1/2'; },
    (r, a, ref, leaf, owner, rule, astRule) => { rule.selector = 'h2'; },
    (r, a, ref, leaf, owner, rule, astRule) => { rule.declarations.color.value = 'red'; },
    (r, a, ref, leaf, owner, rule, astRule) => { rule.declarations.all = { value: 'unset', important: false }; },
    (r, a, ref, leaf, owner, rule, astRule) => { ref.rules = []; },
    (r, a, ref, leaf, owner, rule, astRule) => { ref.inline = { color: 'inherit' }; },
    (r, a, ref, leaf, owner, rule, astRule) => { ref.attributes.style = '-webkit-text-fill-color: red'; },
    (r, a, ref, leaf, owner, rule, astRule) => { r.rules.push({ ...rule, declarations: { color: { value: 'red', important: false } } }); ref.rules.push(r.rules.length - 1); },
    (r, a, ref, leaf, owner, rule, astRule) => { astRule.color = 'red'; },
    (r, a, ref, leaf, owner, rule, astRule) => { astRule.selector = '#other'; },
    (r, a, ref, leaf, owner, rule, astRule) => { astRule.transition = 'color 1s'; },
    (r, a, ref, leaf, owner, rule, astRule) => { a.rules.push({ selector: '#' + leaf.authored.id, color: 'inherit' }); },
    (r, a, ref, leaf, owner, rule, astRule) => { leaf.authored.style = { color: 'inherit' }; },
    (r, a, ref, leaf, owner, rule, astRule) => { owner.authored.style = { all: 'unset' }; },
    (r, a, ref, leaf, owner, rule, astRule) => { delete owner.normalResolvedStyle; },
    (r, a, ref, leaf, owner, rule, astRule) => { delete owner.interactionResolvedStyle; },
    (r, a, ref, leaf, owner, rule, astRule) => { owner.normalResolvedStyle.color = 'red'; },
    (r, a, ref, leaf, owner, rule, astRule) => { owner.interactionResolvedStyle.color = 'red'; },
    (r, a, ref, leaf, owner, rule, astRule) => { owner.normalResolvedStyle.WebkitTextFillColor = 'red'; },
    (r, a, ref, leaf, owner, rule, astRule) => { leaf.retainedText.source = 'private-texture'; },
    (r, a, ref, leaf, owner, rule, astRule) => { leaf.retainedText.style.color = 'red'; },
  ];
  for (const key of ['title', 'copy']) for (const [index, mutate] of controls.entries()) {
    const raw = dialogInkReport(), { reference: r, astylar: a } = raw.results[0].inputTrees;
    const ref = r.nodes.find(n => n.key === key), leaf = a.nodes.find(n => n.key === key), owner = a.nodes.find(n => n.key === (key === 'title' ? 'heading' : 'copy'));
    mutate(r, a, ref, leaf, owner, r.rules[ref.rules[0]], a.rules.find(rule => rule.selector === '.dialog-' + key));
    const cases = raw.results.map(e => ({ ...e, kind: 'static' })), t = collectRetainedTypographyEvidence(cases, collectFullTreeInventory(cases));
    assert.ok(!t.differences.some(d => d.element === leaf.authored.id && d.attribution === 'reviewed-dialog-text-ink-input'), `${key} control ${index}`);
  }
});

test('dialog ink evidence replay rejects forged claims without mutating the inventory', () => {
  const original = buildMaterialInputAudit(dialogInkReport());
  assert.equal(original.retainedTypography.differences.filter(d => d.attribution === 'reviewed-dialog-text-ink-input').length, 2);
  assert.ok(original.sourceFindings.find(f => f.id === 'fixture-dialog-text-ink-substitution')?.detected);
  assert.ok(!validateMaterialInputAudit(original, { requireComplete: false }).some(e => e.includes('dialog text')));
  for (const mutate of [
    d => { d.reviewEvidence.referenceRule.declarations.color.value = 'red'; },
    d => { d.reviewEvidence.referenceLeaf.computed.color = 'red'; },
    d => { d.reviewEvidence.candidateChain.pop(); },
    d => { d.reviewEvidence.candidateRule.color = 'red'; },
    d => { d.reviewEvidence.checkedCandidateRules = []; },
    d => { d.reviewEvidence.candidateRetained.color = 'red'; },
    d => { d.inputEquivalent = true; },
    d => { d.finalRasterVerified = true; },
    d => { d.values.retained = 'red'; },
    d => { d.case = 'static:menu@light/desktop'; d.family = 'menu'; d.element = 'other'; },
  ]) {
    const report = structuredClone(original), inventory = structuredClone(report.elementInventory);
    mutate(report.retainedTypography.differences.find(d => d.attribution === 'reviewed-dialog-text-ink-input'));
    assert.deepEqual(report.elementInventory, inventory);
    assert.ok(validateMaterialInputAudit(report, { requireComplete: false }).some(e => e.includes('dialog text')));
  }
});

function dialogMetricReport() {
  const raw = dialogInkReport(), { reference: r, astylar: a } = raw.results[0].inputTrees;
  a.nodes.unshift({ key: 'root', parent: null, authored: {} });
  for (const key of ['title', 'copy']) {
    const leaf = r.nodes.find(n => n.key === key), rule = r.rules[leaf.rules[0]];
    rule.declarations['font-family'] = { value: key === 'title'
      ? 'var(--mat-dialog-subhead-font, var(--mat-sys-headline-small-font, inherit))'
      : 'var(--mat-dialog-supporting-text-font, var(--mat-sys-body-medium-font, inherit))', important: false };
    if (key === 'copy') rule.declarations['letter-spacing'] = { value: 'var(--mat-dialog-supporting-text-tracking, var(--mat-sys-body-medium-tracking, 0.03125em))', important: false };
  }
  return raw;
}

test('dialog metrics preserve direct tokens complete page inheritance and default tracking omission', () => {
  const raw = dialogMetricReport(), before = structuredClone(raw), cases = raw.results.map(e => ({ ...e, kind: 'static' }));
  const t = collectRetainedTypographyEvidence(cases, collectFullTreeInventory(cases));
  const ds = t.differences.filter(d => d.attribution === 'reviewed-dialog-text-metric-omission');
  assert.equal(ds.length, 3);
  for (const d of ds) {
    assert.equal(d.classification, 'application-plugin-authoring-defect'); assert.equal(d.inputEquivalent, false);
    assert.equal(d.currentPseudoStatePaintVerified, false); assert.equal(d.finalRasterVerified, false);
    assert.equal(d.reviewEvidence.candidateChain.length, d.element === 'dialog-title-label' ? 6 : 5);
    const page = d.reviewEvidence.candidateChain.at(-1);
    assert.equal(page.authored.id, 'page');
    if (d.property === 'fontFamily') {
      assert.equal(d.reviewEvidence.candidatePageRule.fontFamily, 'Roboto, Arial, sans-serif');
      assert.equal(page.normal.fontFamily, 'Roboto, Arial, sans-serif');
      assert.ok(d.reviewEvidence.candidateChain.slice(0, -1).every(n => n.normal.fontFamily === undefined && n.effective.fontFamily === undefined));
    } else {
      assert.equal(d.values.retained, '0');
      assert.deepEqual(d.reviewEvidence.candidateEnvelope, { key: 'root', parent: null, authored: {},
        resolvedStyle: undefined, normalResolvedStyle: undefined, interactionResolvedStyle: undefined,
        style: undefined, normalStyle: undefined, interactionStyle: undefined });
      assert.ok(d.reviewEvidence.candidateChain.every(n => n.normal.letterSpacing === undefined && n.effective.letterSpacing === undefined));
    }
  }
  assert.equal(t.differences.filter(d => d.attribution === 'reviewed-dialog-text-ink-input').length, 2);
  assert.deepEqual(raw, before);
});

test('dialog metrics refuse ambiguous declarations and overrides anywhere in the inherited chain', () => {
  const controls = [
    (r, a, leaf, rule, property, css) => { delete r.errors; },
    (r, a, leaf, rule, property, css) => { rule.active = false; },
    (r, a, leaf, rule, property, css) => { rule.source = 'sheet:0/1/2'; },
    (r, a, leaf, rule, property, css) => { rule.conditions = ['@layer base']; },
    (r, a, leaf, rule, property, css) => { rule.declarations[css].important = true; },
    (r, a, leaf, rule, property, css) => { rule.declarations[css].value = 'inherit'; },
    (r, a, leaf, rule, property, css) => { rule.declarations.all = { value: 'unset', important: false }; },
    (r, a, leaf, rule, property, css) => { leaf.inline = { [css]: 'inherit' }; },
    (r, a, leaf, rule, property, css) => { leaf.attributes.style = css + ':inherit'; },
    (r, a, leaf, rule, property, css) => { r.rules.push({ ...rule }); leaf.rules.push(r.rules.length - 1); },
    (r, a, leaf, rule, property, css) => { a.rules.push({ selector: '.dialog-panel', [property]: 'inherit' }); },
    (r, a, leaf, rule, property, css) => { a.rules.push({ selector: '.modal-overlay', all: 'unset' }); },
    (r, a, leaf, rule, property, css) => { a.rules.push({ selector: '#page', [property]: 'inherit' }); },
    (r, a, leaf, rule, property, css) => { a.nodes.find(n => n.key === 'copy').retainedText.source = 'private-texture'; },
    (r, a, leaf, rule, property, css) => { a.nodes.find(n => n.key === 'copy').retainedText.style[property] = property === 'fontFamily' ? 'Arial' : '1px'; },
  ];
  for (const key of ['copy', 'panel', 'modal', 'section', 'page']) for (const stage of ['normalResolvedStyle', 'interactionResolvedStyle']) {
    controls.push((r, a, leaf, rule, property) => { a.nodes.find(n => n.key === key)[stage][property] = 'inherit'; });
    controls.push((r, a) => { delete a.nodes.find(n => n.key === key)[stage]; });
  }
  for (const key of ['copy', 'panel', 'modal', 'section', 'page']) controls.push((r, a) => { a.nodes.find(n => n.key === key).authored.style = { all: 'unset' }; });
  for (const property of ['fontFamily', 'letterSpacing']) for (const [index, mutate] of controls.entries()) {
    const raw = dialogMetricReport(), { reference: r, astylar: a } = raw.results[0].inputTrees;
    const leaf = r.nodes.find(n => n.key === 'copy'), rule = r.rules[leaf.rules[0]];
    mutate(r, a, leaf, rule, property, property === 'fontFamily' ? 'font-family' : 'letter-spacing');
    const cases = raw.results.map(e => ({ ...e, kind: 'static' })), t = collectRetainedTypographyEvidence(cases, collectFullTreeInventory(cases));
    assert.ok(!t.differences.some(d => d.element === 'dialog-copy' && d.property === property && d.attribution === 'reviewed-dialog-text-metric-omission'), `${property} control ${index}`);
  }
  for (const mutate of [
    a => { a.nodes = a.nodes.filter(n => n.key !== 'root'); },
    a => { a.nodes.find(n => n.key === 'root').authored = { type: 'div' }; },
    a => { a.nodes.find(n => n.key === 'root').normalResolvedStyle = {}; },
    a => { a.rules[0].fontFamily = 'Arial'; },
    a => { a.rules[0].mediaMaxWidth = '800px'; },
  ]) {
    const raw = dialogMetricReport(); mutate(raw.results[0].inputTrees.astylar);
    const cases = raw.results.map(e => ({ ...e, kind: 'static' })), t = collectRetainedTypographyEvidence(cases, collectFullTreeInventory(cases));
    assert.ok(t.differences.some(d => d.element === 'dialog-copy' && d.attribution === 'unresolved'));
  }
});

test('dialog metric evidence replays tokens omissions envelope and retained values independently', () => {
  const original = buildMaterialInputAudit(dialogMetricReport());
  assert.equal(original.retainedTypography.differences.filter(d => d.attribution === 'reviewed-dialog-text-metric-omission').length, 3);
  assert.ok(original.sourceFindings.find(f => f.id === 'fixture-dialog-text-metric-tokens-omitted')?.detected);
  assert.ok(!validateMaterialInputAudit(original, { requireComplete: false }).some(e => e.includes('dialog text')));
  for (const property of ['fontFamily', 'letterSpacing']) for (const mutate of [
    d => { d.reviewEvidence.referenceRule.declarations.all = { value: 'unset', important: false }; },
    d => { d.reviewEvidence.candidateChain.pop(); },
    d => { d.reviewEvidence.candidateChain[1].normal.font = '14px Arial'; },
    d => { d.reviewEvidence.checkedCandidateRules.push({ selector: '#fake', all: 'unset' }); },
    d => { d.reviewEvidence.candidateRetained[d.property] = 'fake'; },
    d => { d.inputEquivalent = true; },
    d => { d.finalRasterVerified = true; },
    d => { d.values.retained = 'fake'; },
    d => { d.case = 'static:menu@light/desktop'; d.family = 'menu'; d.element = 'other'; },
  ]) {
    const report = structuredClone(original), inventory = structuredClone(report.elementInventory);
    mutate(report.retainedTypography.differences.find(d => d.property === property && d.attribution === 'reviewed-dialog-text-metric-omission'));
    assert.deepEqual(report.elementInventory, inventory);
    assert.ok(validateMaterialInputAudit(report, { requireComplete: false }).some(e => e.includes('dialog text')));
  }
});

function menuTextReport() {
  const raw = retainedTypographyReport(), e = raw.results[0], { reference: r, astylar: a } = e.inputTrees;
  e.family = 'menu';
  Object.assign(r.styles[0], { fontFamily: 'Roboto', fontSize: '14px', fontWeight: '500', lineHeight: '20px',
    letterSpacing: '.096px', textAlign: 'left', color: '#1d1b1e' });
  r.rules = [{ selector: '.mat-mdc-menu-content, .mat-mdc-menu-content .mat-mdc-menu-item .mat-mdc-menu-item-text', active: true, conditions: [],
    declarations: { 'font-family': { value: 'var(--mat-menu-item-label-text-font, var(--mat-sys-label-large-font))', important: false },
      'letter-spacing': { value: 'var(--mat-menu-item-label-text-tracking, var(--mat-sys-label-large-tracking))', important: false } } }];
  const n = (key, parent, type, attributes = {}, ownText = '') => ({ key, parent, type, attributes, ownText, style: 0, rules: [], pseudoElements: [] });
  r.nodes = [n('frame', null, 'main', { class: 'frame' }), n('section', 'frame', 'section', { id: 'menu-root' }),
    n('trigger', 'section', 'button', { id: 'menu-primary', class: 'mat-mdc-menu-trigger', 'aria-haspopup': 'menu', 'aria-expanded': 'true', 'aria-controls': 'mat-menu-panel-0' }),
    n('trigger-label', 'trigger', 'span', { class: 'mdc-button__label' }, 'Open menu'), n('placeholder', 'section', 'mat-menu'),
    n('overlay', null, 'div', { class: 'cdk-overlay-container' }),
    n('backdrop', 'overlay', 'div', { class: 'cdk-overlay-backdrop cdk-overlay-transparent-backdrop cdk-overlay-backdrop-showing' }),
    n('bounds', 'overlay', 'div', { class: 'cdk-overlay-connected-position-bounding-box' }),
    n('pane', 'bounds', 'div', { class: 'cdk-overlay-pane', id: 'cdk-overlay-0' }),
    n('panel', 'pane', 'div', { id: 'mat-menu-panel-0', role: 'menu', tabindex: '-1', class: 'mat-mdc-menu-panel mat-menu-after mat-menu-below' }),
    n('content', 'panel', 'div', { class: 'mat-mdc-menu-content' })];
  const ast = (key, parent, authored) => ({ key, parent, authored, resolvedStyle: {}, normalResolvedStyle: {}, interactionResolvedStyle: {} });
  a.rules = [{ selector: '#page', fontFamily: 'Roboto, Arial, sans-serif' }];
  a.nodes = [ast('page', 'root', { type: 'main', id: 'page' }), ast('section', 'page', { type: 'section', id: 'menu-root' }),
    ast('trigger', 'section', { type: 'button', id: 'menu-primary', class: 'material-button', value: 'Open menu', ariaHaspopup: 'menu', ariaExpanded: true, ariaControls: 'menu-popup' }),
    ast('popup', 'section', { type: 'div', id: 'menu-popup', role: 'menu' })];
  for (const name of ['Rename', 'Delete']) {
    const key = name.toLowerCase(), item = n(key, 'content', 'button', { 'mat-menu-item': '', class: 'mat-mdc-menu-item', role: 'menuitem', tabindex: '0', 'aria-disabled': 'false' });
    const label = n(`${key}-label`, key, 'span', { class: 'mat-mdc-menu-item-text' }, name); label.rules = [0];
    r.nodes.push(item, label, n(`${key}-ripple`, key, 'div', { matripple: '', class: 'mat-ripple mat-mdc-menu-ripple' }));
    const button = ast(key, 'popup', { type: 'button', id: `menu-${key}`, role: 'menuitem', ariaLabel: name });
    const span = ast(`${key}-label`, key, { type: 'span', id: `menu-${key}-label`, class: 'menu-option-label', textContent: name });
    span.retainedText = { source: 'core-text-registry', style: { ...r.styles[0], fontFamily: 'Roboto, Arial, sans-serif', letterSpacing: '0px', color: '#1d1b20' } };
    for (const stage of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle']) button[stage].fontFamily = 'Roboto, Arial, sans-serif';
    a.nodes.push(button, span);
  }
  for (const stage of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle']) a.nodes[0][stage].fontFamily = 'Roboto, Arial, sans-serif';
  return raw;
}

test('menu text mapping preserves ordered direct labels and unequal overlay typography inputs', () => {
  const raw = menuTextReport(), before = structuredClone(raw), cases = raw.results.map(e => ({ ...e, kind: 'static' }));
  const evidence = collectRetainedTypographyEvidence(cases, collectFullTreeInventory(cases));
  const maps = evidence.reviewedMappings.filter(m => m.kind === 'reviewed-menu-item-text');
  assert.deepEqual(maps.map(m => m.element), ['menu-rename-label', 'menu-delete-label']);
  for (const m of maps) {
    assert.equal(m.classification, 'application-plugin-authoring-defect'); assert.equal(m.inputEquivalent, false); assert.equal(m.finalRasterVerified, false);
    assert.equal(m.reviewEvidence.referencePath.length, 7); assert.equal(m.reviewEvidence.candidatePath.length, 5);
    assert.equal(m.reviewEvidence.orderedItems.length, 2); assert.equal(m.reviewEvidence.referenceBackdrop.key, 'backdrop');
  }
  const diffs = evidence.differences.filter(d => /^menu-(rename|delete)-label$/.test(d.element));
  assert.equal(diffs.length, 6); assert.equal(diffs.filter(d => d.attribution === 'unresolved').length, 4);
  assert.equal(diffs.filter(d => d.attribution === 'reviewed-omitted-component-text-metric').length, 2);
  assert.ok(!evidence.gaps.some(g => ['menu-rename-label', 'menu-delete-label'].includes(g.element)));
  assert.deepEqual(raw, before);
});

test('menu text mapping rejects ambiguous reordered incomplete and contradictory item domains', () => {
  const controls = [
    (r, a) => { r.nodes.push(structuredClone(r.nodes[0])); },
    (r, a) => { a.nodes.push({ ...structuredClone(a.nodes[0]), key: 'duplicate-id' }); },
    (r, a) => { r.nodes.find(n => n.key === 'trigger').attributes['aria-expanded'] = 'false'; },
    (r, a) => { r.nodes.find(n => n.key === 'trigger').attributes['aria-controls'] = 'other'; },
    (r, a) => { r.nodes.find(n => n.key === 'trigger').attributes.class = 'other'; },
    (r, a) => { r.nodes.find(n => n.key === 'trigger-label').ownText = 'Other'; },
    (r, a) => { r.nodes.find(n => n.key === 'trigger').parent = 'frame'; },
    (r, a) => { r.nodes.find(n => n.key === 'frame').parent = 'other'; },
    (r, a) => { r.nodes = r.nodes.filter(n => n.key !== 'placeholder'); },
    (r, a) => { r.nodes.find(n => n.key === 'panel').attributes.role = 'listbox'; },
    (r, a) => { r.nodes.find(n => n.key === 'panel').attributes.class = 'mat-mdc-menu-panel mat-menu-before'; },
    (r, a) => { r.nodes.find(n => n.key === 'panel').parent = 'bounds'; },
    (r, a) => { r.nodes.find(n => n.key === 'content').attributes.class = 'other'; },
    (r, a) => { r.nodes.find(n => n.key === 'backdrop').attributes.class = 'cdk-overlay-backdrop'; },
    (r, a) => { r.nodes.find(n => n.key === 'overlay').parent = 'frame'; },
    (r, a) => { r.nodes.find(n => n.key === 'rename').attributes.role = 'option'; },
    (r, a) => { r.nodes.find(n => n.key === 'rename').attributes['aria-disabled'] = 'true'; },
    (r, a) => { r.nodes.find(n => n.key === 'rename').ownText = 'Rename'; },
    (r, a) => { r.nodes.find(n => n.key === 'rename-label').ownText = 'Delete'; },
    (r, a) => { r.nodes.find(n => n.key === 'rename-label').attributes.id = 'menu-rename-label'; },
    (r, a) => { r.nodes.find(n => n.key === 'rename-ripple').ownText = 'extra'; },
    (r, a) => { r.nodes = r.nodes.filter(n => n.key !== 'rename-ripple'); },
    (r, a) => { const i = r.nodes.findIndex(n => n.key === 'rename'), j = r.nodes.findIndex(n => n.key === 'delete'); [r.nodes[i], r.nodes[j]] = [r.nodes[j], r.nodes[i]]; },
    (r, a) => { a.nodes.find(n => n.key === 'trigger').authored.ariaExpanded = false; },
    (r, a) => { a.nodes.find(n => n.key === 'trigger').authored.ariaControls = 'other'; },
    (r, a) => { a.nodes.find(n => n.key === 'popup').authored.role = 'listbox'; },
    (r, a) => { a.nodes.find(n => n.key === 'popup').parent = 'page'; },
    (r, a) => { a.nodes.find(n => n.key === 'rename').authored.ariaLabel = 'Other'; },
    (r, a) => { a.nodes.find(n => n.key === 'rename').authored.value = 'Rename'; },
    (r, a) => { a.nodes.find(n => n.key === 'rename').authored.disabled = true; },
    (r, a) => { a.nodes.find(n => n.key === 'rename-label').authored.id = 'other'; },
    (r, a) => { a.nodes.find(n => n.key === 'rename-label').authored.textContent = 'Delete'; },
    (r, a) => { a.nodes.find(n => n.key === 'rename-label').parent = 'popup'; },
    (r, a) => { const i = a.nodes.findIndex(n => n.key === 'rename'), j = a.nodes.findIndex(n => n.key === 'delete'); [a.nodes[i], a.nodes[j]] = [a.nodes[j], a.nodes[i]]; },
    (r, a) => { a.nodes.push({ key: 'extra', parent: 'popup', authored: { type: 'button', role: 'menuitem', value: 'Other' } }); },
    (r, a) => { r.nodes.push({ key: 'extra', parent: 'rename-label', type: 'span', attributes: {}, ownText: 'extra' }); },
    (r, a) => { a.nodes.push({ key: 'extra', parent: 'rename-label', authored: { type: 'span', textContent: 'extra' } }); },
  ];
  for (const [i, mutate] of controls.entries()) {
    const raw = menuTextReport(), { reference: r, astylar: a } = raw.results[0].inputTrees; mutate(r, a);
    assert.deepEqual(reviewedTemplateTextMappings('menu', r, a), [], `control ${i}`);
  }
});

test('menu text mapping keeps closed missing-owner and missing-stage cases explicit', () => {
  for (const side of ['reference', 'astylar']) {
    const raw = menuTextReport(), e = raw.results[0], tree = e.inputTrees[side];
    tree.nodes = tree.nodes.filter(n => side === 'reference' ? !['overlay', 'backdrop', 'bounds', 'pane', 'panel', 'content', 'rename', 'rename-label', 'rename-ripple', 'delete', 'delete-label', 'delete-ripple'].includes(n.key) : !['popup', 'rename', 'rename-label', 'delete', 'delete-label'].includes(n.key));
    const cases = [{ ...e, kind: 'static' }], t = collectRetainedTypographyEvidence(cases, collectFullTreeInventory(cases));
    assert.equal(t.reviewedMappings.filter(m => m.kind === 'reviewed-menu-item-text').length, 0);
    assert.ok(t.gaps.length);
  }
  const raw = menuTextReport(), e = raw.results[0]; delete e.inputTrees.astylar.nodes.find(n => n.key === 'rename-label').retainedText;
  const cases = [{ ...e, kind: 'static' }], t = collectRetainedTypographyEvidence(cases, collectFullTreeInventory(cases));
  assert.ok(t.gaps.some(g => g.element === 'menu-rename-label' && g.reason.includes('no authoritative retained')));
});

test('menu text replay rejects missing forged and foreign-scope correspondence and typography', () => {
  const original = buildMaterialInputAudit(menuTextReport());
  assert.equal(original.retainedTypography.reviewedMappings.filter(m => m.kind === 'reviewed-menu-item-text').length, 2);
  for (const id of ['fixture-menu-label-composition-substitution', 'fixture-menu-label-density-offset'])
    assert.ok(original.sourceFindings.find(f => f.id === id)?.detected);
  assert.ok(!validateMaterialInputAudit(original, { requireComplete: false }).some(e => e.includes('menu text')));
  for (const mutate of [
    (r, m) => { r.retainedTypography.reviewedMappings = r.retainedTypography.reviewedMappings.filter(v => v !== m); },
    (r, m) => { r.retainedTypography.reviewedMappings.push(structuredClone(m)); },
    (r, m) => { m.inputEquivalent = true; },
    (r, m) => { m.finalRasterVerified = true; },
    (r, m) => { m.reviewEvidence.referencePath.pop(); },
    (r, m) => { m.reviewEvidence.orderedItems.reverse(); },
    (r, m) => { m.reviewEvidence.referenceBackdrop.attributes.class = 'other'; },
    (r, m) => { m.reviewEvidence.candidateTrigger.authored.ariaControls = 'other'; },
    (r, m) => { m.reviewEvidence.index = 99; },
    (r, m) => { r.retainedTypography.comparisons[0].revision++; },
    (r, m) => { r.retainedTypography.differences.pop(); },
    (r, m) => { r.retainedTypography.differences[0].values.retained = 'fake'; },
    (r, m) => { m.case = 'static:tooltip@light/desktop'; m.element = 'other'; },
  ]) {
    const report = structuredClone(original), m = report.retainedTypography.reviewedMappings.find(m => m.kind === 'reviewed-menu-item-text'); mutate(report, m);
    assert.ok(validateMaterialInputAudit(report, { requireComplete: false }).some(e => e.includes('menu text')));
  }
});

function menuInkReport() {
  const raw = menuTextReport(), { reference: r, astylar: a } = raw.results[0].inputTrees;
  for (const [selector, value] of [
    ['.mat-mdc-menu-item', 'inherit'],
    ['.mat-mdc-menu-item, .mat-mdc-menu-item:visited, .mat-mdc-menu-item:link', 'var(--mat-menu-item-label-text-color, var(--mat-sys-on-surface))'],
  ]) r.rules.push({ source: `sheet:0/${r.rules.length}`, selector, active: true, conditions: [], declarations: { color: { value, important: false } } });
  a.rules.push({ selector: '#menu-rename, #menu-delete', color: '#1d1b20' });
  for (const key of ['rename', 'delete']) {
    r.nodes.find(n => n.key === key).rules = [1, 2];
    const item = a.nodes.find(n => n.key === key);
    for (const stage of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle']) item[stage].color = '#1d1b20';
  }
  return raw;
}

test('menu label ink preserves ordered token cascade and inherited literal without claiming paint equivalence', () => {
  const raw = menuInkReport(), before = structuredClone(raw), cases = raw.results.map(e => ({ ...e, kind: 'static' }));
  const evidence = collectRetainedTypographyEvidence(cases, collectFullTreeInventory(cases));
  const ink = evidence.differences.filter(d => d.attribution === 'reviewed-menu-label-ink-input');
  assert.equal(ink.length, 2);
  for (const d of ink) {
    assert.equal(d.classification, 'application-plugin-authoring-defect'); assert.equal(d.inputEquivalent, false);
    assert.equal(d.currentPseudoStatePaintVerified, false); assert.equal(d.finalRasterVerified, false);
    assert.deepEqual(d.reviewEvidence.referenceRules.map(r => r.declarations.color.value), ['inherit', 'var(--mat-menu-item-label-text-color, var(--mat-sys-on-surface))']);
    assert.equal(d.reviewEvidence.referenceChain.length, 2); assert.equal(d.reviewEvidence.candidateChain.length, 2);
    assert.equal(d.reviewEvidence.candidateChain[0].normal.color, undefined);
    assert.equal(d.reviewEvidence.candidateChain[1].normal.color, '#1d1b20');
    assert.equal(d.reviewEvidence.candidateRetained.color, '#1d1b20');
    assert.equal(d.reviewEvidence.referenceComputed, 'rgba(29,27,30,1)');
  }
  assert.equal(evidence.differences.filter(d => d.property === 'fontFamily' && d.attribution === 'unresolved').length, 2);
  assert.deepEqual(raw, before);
});

test('menu label ink refuses incomplete competing or contradictory cascade and stage inputs', () => {
  const controls = [
    (r, a) => { delete r.errors; },
    (r, a) => { r.rules[1].active = false; },
    (r, a) => { r.rules[2].active = false; },
    (r, a) => { r.rules[1].declarations.color.important = true; },
    (r, a) => { r.rules[2].declarations.color.important = true; },
    (r, a) => { r.rules[1].conditions = ['@layer base']; },
    (r, a) => { r.rules[2].conditions = ['@media screen']; },
    (r, a) => { delete r.rules[1].source; },
    (r, a) => { r.rules[2].source = 'sheet:0/1/2'; },
    (r, a) => { r.rules[2].source = 'sheet:1/2'; },
    (r, a) => { r.rules[2].source = 'sheet:0/0'; },
    (r, a) => { r.rules[1].selector = 'button'; },
    (r, a) => { r.rules[2].selector = '.mat-mdc-menu-item'; },
    (r, a) => { r.rules[1].declarations.color.value = 'initial'; },
    (r, a) => { r.rules[2].declarations.color.value = '#1d1b1e'; },
    (r, a) => { r.nodes.find(n => n.key === 'rename').rules.reverse(); },
    (r, a) => { r.nodes.find(n => n.key === 'rename').rules.pop(); },
    (r, a) => { r.rules.push({ selector: '.mat-mdc-menu-item', active: true, conditions: [], declarations: { color: { value: 'red', important: false } } }); r.nodes.find(n => n.key === 'rename').rules.push(3); },
    (r, a) => { r.rules[2].declarations.all = { value: 'unset', important: false }; },
    (r, a) => { r.rules[0].declarations.color = { value: 'inherit', important: false }; },
    (r, a) => { r.nodes.find(n => n.key === 'rename-label').inline = { color: 'inherit' }; },
    (r, a) => { r.nodes.find(n => n.key === 'rename').attributes.style = 'color: inherit'; },
    (r, a) => { r.styles.push({ ...r.styles[0], color: 'red' }); r.nodes.find(n => n.key === 'rename').style = 1; },
    (r, a) => { a.rules[1].selector = 'button'; },
    (r, a) => { a.rules[1].color = '#1d1b1e'; },
    (r, a) => { a.rules.push({ selector: '.menu-option-label', color: 'inherit' }); },
    (r, a) => { a.rules.push({ selector: '#menu-rename', color: 'red' }); },
    (r, a) => { a.rules[1].transition = 'color 1s'; },
    (r, a) => { a.nodes.find(n => n.key === 'rename-label').authored.style = { color: 'inherit' }; },
    (r, a) => { a.nodes.find(n => n.key === 'rename').authored.style = { all: 'unset' }; },
    (r, a) => { a.nodes.find(n => n.key === 'rename-label').normalResolvedStyle.color = '#1d1b20'; },
    (r, a) => { a.nodes.find(n => n.key === 'rename-label').interactionResolvedStyle.color = '#1d1b20'; },
    (r, a) => { delete a.nodes.find(n => n.key === 'rename').normalResolvedStyle; },
    (r, a) => { delete a.nodes.find(n => n.key === 'rename').interactionResolvedStyle; },
    (r, a) => { a.nodes.find(n => n.key === 'rename').normalResolvedStyle.color = 'red'; },
    (r, a) => { a.nodes.find(n => n.key === 'rename').interactionResolvedStyle.color = 'red'; },
    (r, a) => { a.nodes.find(n => n.key === 'rename').normalResolvedStyle.WebkitTextFillColor = '#1d1b20'; },
    (r, a) => { a.nodes.find(n => n.key === 'rename-label').retainedText.source = 'private-texture'; },
    (r, a) => { a.nodes.find(n => n.key === 'rename-label').retainedText.style.color = 'red'; },
  ];
  for (const [index, mutate] of controls.entries()) {
    const raw = menuInkReport(), { reference: r, astylar: a } = raw.results[0].inputTrees; mutate(r, a);
    const cases = raw.results.map(e => ({ ...e, kind: 'static' }));
    const t = collectRetainedTypographyEvidence(cases, collectFullTreeInventory(cases));
    assert.ok(!t.differences.some(d => d.element === 'menu-rename-label' && d.attribution === 'reviewed-menu-label-ink-input'), `control ${index}`);
  }
});

test('menu label ink replay rejects forged evidence and retains independent inventory snapshots', () => {
  const original = buildMaterialInputAudit(menuInkReport());
  assert.ok(original.sourceFindings.find(f => f.id === 'fixture-menu-label-ink-substitution')?.detected);
  assert.equal(original.retainedTypography.differences.filter(d => d.attribution === 'reviewed-menu-label-ink-input').length, 2);
  assert.ok(!validateMaterialInputAudit(original, { requireComplete: false }).some(e => e.includes('menu text')));
  for (const mutate of [
    (r, d) => { d.reviewEvidence.referenceRules.reverse(); },
    (r, d) => { d.reviewEvidence.referenceChain[1].computed.color = 'red'; },
    (r, d) => { d.reviewEvidence.candidateChain[0].normal.color = '#1d1b20'; },
    (r, d) => { d.reviewEvidence.candidateRule.color = 'red'; },
    (r, d) => { d.reviewEvidence.checkedCandidateRules.pop(); },
    (r, d) => { d.reviewEvidence.candidateRetained.color = 'red'; },
    (r, d) => { d.inputEquivalent = true; },
    (r, d) => { d.finalRasterVerified = true; },
    (r, d) => { d.values.retained = 'red'; },
    (r, d) => { d.case = 'static:tooltip@light/desktop'; d.family = 'tooltip'; d.element = 'other'; delete d.mapping; },
  ]) {
    const report = structuredClone(original), inventory = structuredClone(report.elementInventory);
    const difference = report.retainedTypography.differences.find(d => d.attribution === 'reviewed-menu-label-ink-input');
    mutate(report, difference);
    assert.deepEqual(report.elementInventory, inventory);
    assert.ok(validateMaterialInputAudit(report, { requireComplete: false }).some(e => e.includes('menu text')));
  }
});

function menuFontReport() {
  const raw = menuInkReport(), { reference: r, astylar: a } = raw.results[0].inputTrees;
  r.rules[0].source = 'sheet:0/0';
  a.rules.push({ selector: 'button, input, select', fontFamily: 'Roboto, Arial, sans-serif' });
  return raw;
}

test('menu label font preserves direct component token versus authored control inheritance', () => {
  const raw = menuFontReport(), before = structuredClone(raw), cases = raw.results.map(e => ({ ...e, kind: 'static' }));
  const evidence = collectRetainedTypographyEvidence(cases, collectFullTreeInventory(cases));
  const font = evidence.differences.filter(d => d.attribution === 'reviewed-menu-label-font-input');
  assert.equal(font.length, 2);
  for (const d of font) {
    assert.equal(d.inputEquivalent, false); assert.equal(d.currentPseudoStatePaintVerified, false); assert.equal(d.finalRasterVerified, false);
    assert.equal(d.classification, 'application-plugin-authoring-defect');
    assert.equal(d.reviewEvidence.referenceRule.declarations['font-family'].value, 'var(--mat-menu-item-label-text-font, var(--mat-sys-label-large-font))');
    assert.equal(d.reviewEvidence.candidateRule.selector, 'button, input, select');
    assert.equal(d.reviewEvidence.candidateChain[0].normal.fontFamily, undefined);
    assert.equal(d.reviewEvidence.candidateChain[1].normal.fontFamily, 'Roboto, Arial, sans-serif');
    assert.equal(d.reviewEvidence.candidateRetained.fontFamily, 'Roboto, Arial, sans-serif');
    assert.equal(d.reviewEvidence.referenceComputed, 'roboto');
  }
  assert.equal(evidence.differences.filter(d => d.attribution === 'reviewed-menu-label-ink-input').length, 2);
  assert.deepEqual(raw, before);
});

test('menu label font refuses incomplete competing or contradictory authoring evidence', () => {
  const controls = [
    (r, a) => { delete r.errors; },
    (r, a) => { r.rules[0].active = false; },
    (r, a) => { delete r.rules[0].source; },
    (r, a) => { r.rules[0].source = 'sheet:0/0/0'; },
    (r, a) => { r.rules[0].conditions = ['@media screen']; },
    (r, a) => { r.rules[0].selector = '.mat-mdc-menu-item-text'; },
    (r, a) => { r.rules[0].declarations['font-family'].important = true; },
    (r, a) => { r.rules[0].declarations['font-family'].value = 'Roboto'; },
    (r, a) => { r.rules[0].declarations.font = { value: '14px Roboto', important: false }; },
    (r, a) => { r.rules[0].declarations.all = { value: 'revert', important: false }; },
    (r, a) => { r.nodes.find(n => n.key === 'rename-label').inline = { 'font-family': { value: 'Roboto', important: false } }; },
    (r, a) => { r.nodes.find(n => n.key === 'rename-label').attributes.style = 'font: 14px Roboto'; },
    (r, a) => { r.styles[0].fontFamily = 'Arial'; },
    (r, a) => { r.rules.push({ selector: 'span', active: true, conditions: [], declarations: { 'font-family': { value: 'Roboto', important: false } } }); r.nodes.find(n => n.key === 'rename-label').rules.push(3); },
    (r, a) => { a.rules.pop(); },
    (r, a) => { a.rules.at(-1).selector = 'button'; },
    (r, a) => { a.rules.at(-1).fontFamily = 'Roboto'; },
    (r, a) => { a.rules.at(-1).all = 'unset'; },
    (r, a) => { a.rules.at(-1).transition = 'all 1s'; },
    (r, a) => { a.rules.push({ selector: '.menu-option-label', fontFamily: 'inherit' }); },
    (r, a) => { a.rules.push({ selector: '#menu-rename', fontFamily: 'Roboto' }); },
    (r, a) => { a.nodes.find(n => n.key === 'rename').authored.style = { fontFamily: 'Roboto, Arial, sans-serif' }; },
    (r, a) => { a.nodes.find(n => n.key === 'rename-label').authored.style = { all: 'unset' }; },
    (r, a) => { a.nodes.find(n => n.key === 'rename-label').normalResolvedStyle.fontFamily = 'inherit'; },
    (r, a) => { a.nodes.find(n => n.key === 'rename-label').interactionResolvedStyle.fontFamily = 'Roboto, Arial, sans-serif'; },
    (r, a) => { delete a.nodes.find(n => n.key === 'rename').normalResolvedStyle; },
    (r, a) => { delete a.nodes.find(n => n.key === 'rename').interactionResolvedStyle; },
    (r, a) => { a.nodes.find(n => n.key === 'rename').normalResolvedStyle.fontFamily = 'Arial'; },
    (r, a) => { a.nodes.find(n => n.key === 'rename').interactionResolvedStyle.fontFamily = 'Arial'; },
    (r, a) => { a.nodes.find(n => n.key === 'rename').normalResolvedStyle.font = '14px Roboto'; },
    (r, a) => { a.nodes.find(n => n.key === 'rename-label').retainedText.source = 'private-texture'; },
    (r, a) => { a.nodes.find(n => n.key === 'rename-label').retainedText.style.fontFamily = 'Arial'; },
  ];
  for (const [index, mutate] of controls.entries()) {
    const raw = menuFontReport(), { reference: r, astylar: a } = raw.results[0].inputTrees; mutate(r, a);
    const cases = raw.results.map(e => ({ ...e, kind: 'static' })), t = collectRetainedTypographyEvidence(cases, collectFullTreeInventory(cases));
    assert.ok(!t.differences.some(d => d.element === 'menu-rename-label' && d.attribution === 'reviewed-menu-label-font-input'), `control ${index}`);
  }
});

test('menu label font replay rejects fabricated inheritance and foreign-scope claims', () => {
  const original = buildMaterialInputAudit(menuFontReport());
  assert.ok(original.sourceFindings.find(f => f.id === 'fixture-menu-label-font-token-omission')?.detected);
  assert.equal(original.retainedTypography.differences.filter(d => d.attribution === 'reviewed-menu-label-font-input').length, 2);
  assert.ok(!validateMaterialInputAudit(original, { requireComplete: false }).some(e => e.includes('menu text')));
  for (const mutate of [
    (r, d) => { d.reviewEvidence.referenceRule.declarations['font-family'].value = 'Arial'; },
    (r, d) => { d.reviewEvidence.referenceLeaf.computed.fontFamily = 'Arial'; },
    (r, d) => { d.reviewEvidence.candidateRule.selector = '#page'; },
    (r, d) => { d.reviewEvidence.candidateChain[0].normal.fontFamily = 'Roboto'; },
    (r, d) => { d.reviewEvidence.candidateRetained.fontFamily = 'Roboto'; },
    (r, d) => { d.reviewEvidence.checkedCandidateRules.pop(); },
    (r, d) => { d.inputEquivalent = true; },
    (r, d) => { d.finalRasterVerified = true; },
    (r, d) => { d.values.retained = 'roboto'; },
    (r, d) => { d.case = 'static:tooltip@light/desktop'; d.family = 'tooltip'; d.element = 'other'; delete d.mapping; },
  ]) {
    const report = structuredClone(original), inventory = structuredClone(report.elementInventory);
    mutate(report, report.retainedTypography.differences.find(d => d.attribution === 'reviewed-menu-label-font-input'));
    assert.deepEqual(report.elementInventory, inventory);
    assert.ok(validateMaterialInputAudit(report, { requireComplete: false }).some(e => e.includes('menu text')));
  }
});

function tooltipTextReport() {
  const raw = retainedTypographyReport(), e = raw.results[0], { reference: r, astylar: a } = e.inputTrees;
  e.family = 'tooltip';
  Object.assign(r.styles[0], { fontFamily: 'Roboto', fontSize: '12px', lineHeight: '16px', textAlign: 'center' });
  const n = (key, parent, type, attributes = {}, ownText = '') => ({ key, parent, type, attributes, ownText, style: 0, rules: [], pseudoElements: [] });
  r.nodes = [n('frame', null, 'main', { class: 'frame' }), n('section', 'frame', 'section', { id: 'tooltip-root' }),
    n('trigger', 'section', 'button', { id: 'tooltip-primary', mattooltip: 'Create a project', class: 'mat-mdc-tooltip-trigger', 'aria-describedby': 'cdk-describedby-message-ng-1-2' }),
    n('label', 'trigger', 'span', { class: 'mdc-button__label' }, 'Hover for help'),
    n('overlay', null, 'div', { class: 'cdk-overlay-container' }),
    n('bounds', 'overlay', 'div', { class: 'cdk-overlay-connected-position-bounding-box' }),
    n('pane', 'bounds', 'div', { id: 'cdk-overlay-0', class: 'cdk-overlay-pane mat-mdc-tooltip-panel mat-mdc-tooltip-panel-below' }),
    n('component', 'pane', 'mat-tooltip-component', { 'aria-hidden': 'true' }),
    n('wrapper', 'component', 'div', { class: 'mat-mdc-tooltip mat-mdc-tooltip-show' }),
    n('message', 'wrapper', 'div', { class: 'mat-mdc-tooltip-surface mdc-tooltip__surface' }, 'Create a project')];
  const astNode = (key, parent, authored) => ({ key, parent, authored, resolvedStyle: {}, normalResolvedStyle: {}, interactionResolvedStyle: {} });
  a.nodes = [astNode('page', 'root', { type: 'main', id: 'page' }),
    astNode('section', 'page', { type: 'section', id: 'tooltip-root' }),
    astNode('anchor', 'section', { type: 'div', id: 'tooltip-anchor', class: 'tooltip-anchor' }),
    astNode('button', 'anchor', { type: 'button', id: 'tooltip-primary', class: 'material-button', value: 'Hover for help', ariaDescribedby: 'tooltip-popup' }),
    astNode('popup', 'anchor', { type: 'div', id: 'tooltip-popup', role: 'tooltip', textContent: 'Create a project' })];
  a.nodes.at(-1).retainedText = { source: 'core-text-registry', style: { ...r.styles[0], fontFamily: 'Roboto, Arial, sans-serif', textAlign: 'left' } };
  return raw;
}

function unmatchedTooltipCase(side, { kind = 'supplemental', cohort = 'benchmark-open', action = side === 'reference' ? 'hover' : 'release', dpr = 1 } = {}) {
  const raw = tooltipTextReport(), entry = raw.results[0], { reference: r, astylar: a } = entry.inputTrees;
  if (side === 'reference') {
    a.nodes = a.nodes.filter(n => n.key !== 'popup');
    delete a.nodes.find(n => n.key === 'button').authored.ariaDescribedby;
  } else r.nodes = r.nodes.filter(n => !['bounds', 'pane', 'component', 'wrapper', 'message'].includes(n.key));
  Object.assign(entry, { kind, state: kind === 'interaction' ? 'open' : `tooltip-state-${cohort}-${action}`,
    profile: 'light', viewport: { id: kind === 'interaction' ? 'desktop' : `tooltip-state-desktop-dpr${dpr}` } });
  raw.results = []; raw.interactions = kind === 'interaction' ? [entry] : [];
  return { raw, entry, r, a };
}

function unmatchedTooltipEvidence(entry) {
  return collectRetainedTypographyEvidence([entry], collectFullTreeInventory([entry])).gaps
    .filter(g => g.attribution === 'reviewed-tooltip-unmatched-state-input');
}

function boundTooltipScalarFixture(run, mutate = () => {}) {
  const root = process.cwd(), artifacts = path.join(root, 'artifacts/material-parity');
  mkdirSync(artifacts, { recursive: true });
  const dir = mkdtempSync(path.join(artifacts, 'tooltip-style-test-'));
  try {
    const f = unmatchedTooltipCase('astylar', { kind: 'interaction' });
    const popup = f.a.nodes.find(n => n.key === 'popup');
    const style = { height: '24px', display: 'flex', color: '#f5eff4' };
    Object.assign(popup, { resolvedStyle: { ...style }, normalResolvedStyle: { ...style }, interactionResolvedStyle: { ...style } });
    f.entry.styleInputs = [{ id: 'tooltip-popup', referenceAuthored: [], astylarAuthored: [],
      astylarResolvedStyleEvidenceVersion: 2, astylar: { ...style }, astylarNormalResolvedStyle: { ...style },
      astylarInteractionResolvedStyle: { ...style }, astylarStructure: { schemaVersion: 2, type: 'div',
        ownText: 'Create a project', text: 'Create a project', directChildIds: [], descendantIds: [] } }];
    mutate(f);
    for (const side of ['reference', 'astylar']) {
      const bytes = JSON.stringify(f.entry.inputTrees[side]), file = path.relative(root, path.join(dir, `${side}.json`)).replaceAll('\\', '/');
      writeFileSync(path.join(root, file), bytes);
      f.entry.inputTrees[side] = { file, sha256: createHash('sha256').update(bytes).digest('hex') };
    }
    const parityPath = path.relative(root, path.join(dir, 'report.json')).replaceAll('\\', '/');
    writeFileSync(path.join(root, parityPath), JSON.stringify(f.raw));
    run({ ...f, root, parityPath, options: { root, parityPath,
      collectInventory: collectFullTreeInventory, reviewGap: reviewedTooltipStateGap } });
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

test('tooltip unpaired scalar styles retain unequal presence with independently bound original owners', () => {
  boundTooltipScalarFixture(({ raw, root, parityPath, options }) => {
    const before = structuredClone(raw), evidence = collectTooltipUnpairedStyles(raw, options);
    assert.equal(evidence.binding.status, 'bound'); assert.equal(evidence.binding.candidateOnlyInputs, 1);
    assert.equal(evidence.observations.length, 1);
    assert.deepEqual(validateTooltipUnpairedStyles(evidence, options), []);
    const report = buildMaterialInputAudit(raw, { root, parityPath });
    const rows = report.discrepancies.filter(d => d.attribution === tooltipUnpairedStyleAttribution);
    assert.equal(rows.length, 3);
    for (const row of rows) {
      assert.equal(row.reference, undefined); assert.equal(row.classification, 'application-plugin-authoring-defect');
      assert.equal(row.reviewEvidence.inputEquivalent, false); assert.equal(row.reviewEvidence.finalRasterVerified, false);
      assert.deepEqual(row.reviewedCases, ['interaction:tooltip@light/desktop/open']);
    }
    assert.deepEqual(raw, before);
    assert.ok(!validateMaterialInputAudit(report, { root, requireComplete: false }).some(e => e.includes('unpaired tooltip')));
    assert.equal(buildMaterialInputAudit(raw, { root }).discrepancies.filter(d => d.attribution === tooltipUnpairedStyleAttribution).length, 0);
  });
});

test('tooltip unpaired scalar binding rejects missing population changed bytes and contradictory owner stages', () => {
  const mutations = [
    f => { f.entry.state = 'hover'; },
    f => { f.entry.family = 'menu'; },
    f => { f.entry.styleInputs[0].reference = {}; },
    f => { f.entry.styleInputs[0].referenceStructure = { type: 'div' }; },
    f => { f.entry.styleInputs[0].astylar.height = '99px'; },
    f => { f.entry.styleInputs[0].astylarNormalResolvedStyle.height = '99px'; },
    f => { delete f.entry.styleInputs[0].astylarInteractionResolvedStyle; },
    f => { f.entry.styleInputs[0].astylarStructure.ownText = 'Other'; },
    f => { f.entry.styleInputs.push(structuredClone(f.entry.styleInputs[0])); },
    f => { f.r.nodes.push({ key: 'unexpected', parent: 'overlay', type: 'mat-tooltip-component', attributes: {}, style: 0, rules: [] }); },
    f => { f.a.nodes.find(n => n.key === 'popup').parent = 'section'; },
    f => { f.a.nodes.find(n => n.key === 'popup').authored.role = 'status'; },
  ];
  for (const mutate of mutations) boundTooltipScalarFixture(({ raw, options }) => {
    assert.equal(collectTooltipUnpairedStyles(raw, options).observations.length, 0);
  }, mutate);
  boundTooltipScalarFixture(({ raw, root, parityPath, options }) => {
    const evidence = collectTooltipUnpairedStyles(raw, options);
    const removed = structuredClone(raw); removed.interactions = [];
    assert.equal(collectTooltipUnpairedStyles(removed, options).binding.status, 'invalid');
    for (const mutate of [e => { e.captures = []; e.observations = []; e.binding.candidateOnlyInputs = 0; },
      e => { e.observations[0].gap.reviewEvidence.referencePopupAuthored = true; },
      e => { e.observations[0].input.astylar.height = '99px'; },
      e => { e.observations.push(structuredClone(e.observations[0])); }]) {
      const changed = structuredClone(evidence); mutate(changed);
      assert.ok(validateTooltipUnpairedStyles(changed, options).length);
    }
    const tree = path.join(root, raw.interactions[0].inputTrees.astylar.file), treeBytes = readFileSync(tree);
    writeFileSync(tree, '{}');
    assert.equal(collectTooltipUnpairedStyles(raw, options).binding.status, 'invalid');
    assert.ok(validateTooltipUnpairedStyles(evidence, options).length);
    writeFileSync(tree, treeBytes); writeFileSync(path.join(root, parityPath), '{}');
    assert.ok(validateTooltipUnpairedStyles(evidence, options).length);
  });
});

test('tooltip unpaired scalar replay rejects dropped reclassified duplicated and invented comparison rows', () => {
  boundTooltipScalarFixture(({ raw, root, parityPath }) => {
    const original = buildMaterialInputAudit(raw, { root, parityPath });
    for (const mutate of [
      (r, d) => { r.discrepancies = r.discrepancies.filter(row => row !== d); },
      (r, d) => { d.attribution = 'unresolved'; },
      (r, d) => { d.classification = 'equivalent-representation'; },
      (r, d) => { d.reference = '24px'; },
      (r, d) => { d.astylar = '99px'; },
      (r, d) => { d.reviewedCases = []; d.occurrences = 0; },
      (r, d) => { d.reviewedCases[0] = 'interaction:tooltip@light/desktop/hover'; },
      (r, d) => { d.reviewEvidence.inputEquivalent = true; },
      (r, d) => { d.reviewEvidence.candidateNode = 'invented'; },
      (r, d) => { r.discrepancies.push(structuredClone(d)); },
    ]) {
      const report = structuredClone(original), row = report.discrepancies.find(d => d.attribution === tooltipUnpairedStyleAttribution);
      mutate(report, row);
      assert.ok(validateMaterialInputAudit(report, { root, requireComplete: false }).some(e => e.includes('unpaired tooltip')));
    }
  });
});

test('tooltip unmatched state inputs preserve the sole authored text owner without creating a counterpart', () => {
  const contexts = [unmatchedTooltipCase('astylar', { kind: 'interaction' }),
    ...[1, 2].flatMap(dpr => [
      ...['hover', 'press'].map(action => unmatchedTooltipCase('reference', { action, dpr })),
      ...['benchmark-open', 'benchmark-hover', 'ordinary'].map(cohort => unmatchedTooltipCase('astylar', { cohort, dpr })),
    ])];
  for (const { entry } of contexts) {
    const before = structuredClone(entry), gaps = unmatchedTooltipEvidence(entry);
    assert.equal(gaps.length, 1, entry.state);
    const g = gaps[0], e = g.reviewEvidence;
    assert.equal(g.classification, 'application-plugin-authoring-defect');
    assert.equal(g.inputEquivalent, false); assert.equal(g.finalRasterVerified, false);
    assert.equal(g.referenceNodes.length + g.astylarNodes.length, 1);
    assert.equal(e.referencePopupAuthored, g.referenceNodes.length === 1);
    assert.equal(e.candidatePopupAuthored, g.astylarNodes.length === 1);
    assert.equal(e.source, 'core-style-inspection'); assert.equal(e.revision, 4);
    assert.equal(e.referenceNodeIdentities.length, entry.inputTrees.reference.nodes.length);
    assert.equal(e.candidateNodeIdentities.length, entry.inputTrees.astylar.nodes.length);
    assert.ok(e.referenceContext.every(n => n.style && Array.isArray(n.rules)));
    assert.ok(e.candidateContext.every(n => n.style && n.normalStyle && n.interactionStyle));
    assert.deepEqual(entry, before);
  }
});

test('tooltip unmatched state inputs reject ambiguous absent contradictory and foreign-scope evidence', () => {
  const common = [
    f => { f.entry.family = 'menu'; },
    f => { f.entry.kind = 'static'; },
    f => { f.entry.state = 'tooltip-state-ordinary-initial'; },
    f => { f.entry.viewport.id = 'unknown'; },
    f => { delete f.r.errors; },
    f => { delete f.a.errors; },
    f => { delete f.a.resolvedStyleRevision; },
    f => { f.a.resolvedStyleSource = 'other'; },
    f => { f.r.nodes.push(structuredClone(f.r.nodes[0])); },
    f => { f.a.nodes.push({ ...structuredClone(f.a.nodes[0]), key: 'duplicate-id' }); },
    f => { f.r.nodes.find(n => n.key === 'trigger').attributes.mattooltip = 'Other'; },
    f => { delete f.r.nodes.find(n => n.key === 'trigger').attributes['aria-describedby']; },
    f => { f.r.nodes.find(n => n.key === 'trigger').parent = 'frame'; },
    f => { f.r.nodes.find(n => n.key === 'label').ownText = 'Other'; },
    f => { f.r.nodes.find(n => n.key === 'overlay').parent = 'frame'; },
    f => { f.a.nodes.find(n => n.key === 'button').authored.value = 'Other'; },
    f => { f.a.nodes.find(n => n.key === 'anchor').parent = 'page'; },
    f => { delete f.a.nodes.find(n => n.key === 'anchor').normalResolvedStyle; },
    f => { f.r.nodes.find(n => n.key === 'label').style = 1000; },
    f => { f.a.nodes.push({ ...structuredClone(f.a.nodes[0]), key: 'foreign', parent: 'page', authored: { type: 'div', textContent: 'Create a project' } }); },
  ];
  const reference = [
    f => { f.r.nodes.find(n => n.key === 'message').ownText = 'Other'; },
    f => { f.r.nodes.find(n => n.key === 'message').parent = 'pane'; },
    f => { f.r.nodes.find(n => n.key === 'wrapper').attributes.class = 'mat-mdc-tooltip-hide'; },
    f => { f.r.nodes.find(n => n.key === 'component').attributes['aria-hidden'] = 'false'; },
    f => { f.a.nodes.find(n => n.key === 'button').authored.ariaDescribedby = 'tooltip-popup'; },
    f => { f.a.nodes.push({ ...structuredClone(f.a.nodes[0]), key: 'unexpected', parent: 'anchor', authored: { id: 'other', role: 'tooltip' } }); },
  ];
  const candidate = [
    f => { f.r.nodes.push({ ...structuredClone(f.r.nodes[0]), key: 'unexpected', parent: 'overlay', type: 'mat-tooltip-component' }); },
    f => { f.a.nodes.find(n => n.key === 'popup').authored.role = 'status'; },
    f => { f.a.nodes.find(n => n.key === 'popup').authored.textContent = 'Other'; },
    f => { f.a.nodes.find(n => n.key === 'popup').parent = 'section'; },
    f => { f.a.nodes.find(n => n.key === 'popup').retainedText.source = 'other'; },
    f => { delete f.a.nodes.find(n => n.key === 'popup').retainedText.style; },
    f => { f.a.nodes.find(n => n.key === 'button').authored.ariaDescribedby = 'other'; },
  ];
  for (const [side, controls] of [['reference', reference], ['astylar', candidate]]) for (const [i, mutate] of [...common, ...controls].entries()) {
    const f = unmatchedTooltipCase(side); mutate(f);
    assert.equal(unmatchedTooltipEvidence(f.entry).length, 0, `${side} control ${i}`);
  }
});

test('tooltip unmatched state replay rejects deleted altered duplicated and falsely accepted owner gaps', () => {
  const { raw } = unmatchedTooltipCase('astylar', { kind: 'interaction' });
  const original = buildMaterialInputAudit(raw), attribution = 'reviewed-tooltip-unmatched-state-input';
  assert.equal(original.retainedTypography.gaps.filter(g => g.attribution === attribution).length, 1);
  assert.ok(!validateMaterialInputAudit(original, { requireComplete: false }).some(e => /tooltip (text|state gaps)/.test(e)));
  for (const mutate of [
    (r, g) => { r.retainedTypography.gaps = r.retainedTypography.gaps.filter(item => item !== g); },
    (r, g) => { r.retainedTypography.gaps.push(structuredClone(g)); },
    (r, g) => { g.inputEquivalent = true; },
    (r, g) => { g.finalRasterVerified = true; },
    (r, g) => { g.classification = 'confirmed-core-defect'; },
    (r, g) => { g.referenceNodes = ['invented']; },
    (r, g) => { g.reviewEvidence.referencePopupAuthored = true; },
    (r, g) => { g.reviewEvidence.candidateContext.pop(); },
    (r, g) => { g.reviewEvidence.referenceContext[0].style.color = 'fake'; },
    (r, g) => { g.reviewEvidence.referenceNodeIdentities.pop(); },
    (r, g) => { g.reviewEvidence.candidateNodeIdentities.at(-1).authored.role = 'other'; },
    (r, g) => { g.reviewEvidence.revision++; },
    (r, g) => { g.reviewEvidence.sourceFinding = 'other'; },
    (r, g) => { g.case = 'static:menu@light/desktop'; g.family = 'menu'; g.element = 'other'; },
  ]) {
    const report = structuredClone(original), gap = report.retainedTypography.gaps.find(g => g.attribution === attribution); mutate(report, gap);
    assert.ok(validateMaterialInputAudit(report, { requireComplete: false }).some(e => /tooltip (text|state gaps)/.test(e)));
  }
});

function tooltipAlignmentReport() {
  const raw = tooltipTextReport(), { reference: r, astylar: a } = raw.results[0].inputTrees;
  r.rules.push({ selector: '.mat-mdc-tooltip-surface', active: true, conditions: [],
    declarations: { 'text-align': { value: 'center', important: false } } });
  r.nodes.find(n => n.key === 'message').rules = [r.rules.length - 1];
  const flex = { display: 'flex', alignItems: 'center', justifyContent: 'center' };
  a.rules.push({ selector: '#tooltip-popup', ...flex }, { selector: '#unrelated', textAlign: 'right' });
  for (const stage of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle']) Object.assign(a.nodes.at(-1)[stage], flex);
  return raw;
}

function tooltipAlignmentEvidence(raw) {
  const cases = raw.results.map(e => ({ ...e, kind: 'static' }));
  return collectRetainedTypographyEvidence(cases, collectFullTreeInventory(cases)).differences
    .filter(d => d.attribution === 'reviewed-tooltip-text-alignment-input');
}

test('tooltip text alignment traces original declaration and own-stage omission without equating flex centering', () => {
  const raw = tooltipAlignmentReport(), before = structuredClone(raw), differences = tooltipAlignmentEvidence(raw);
  assert.equal(differences.length, 1);
  const d = differences[0], e = d.reviewEvidence;
  assert.equal(d.property, 'textAlign'); assert.equal(d.classification, 'application-plugin-authoring-defect');
  assert.equal(d.inputEquivalent, false); assert.equal(d.finalRasterVerified, false); assert.equal(d.currentPseudoStatePaintVerified, false);
  assert.equal(e.referenceComputed, 'center'); assert.equal(e.candidateValue, 'left');
  assert.equal(e.candidateChain.length, 4); assert.equal(e.checkedCandidateRules.length, 1);
  for (const n of e.candidateChain) { assert.equal(n.normal.textAlign, undefined); assert.equal(n.effective.textAlign, undefined); }
  assert.equal(e.flexRule.justifyContent, 'center'); assert.equal(e.candidateRetained.textAlign, 'left');
  assert.deepEqual(raw, before);
});

test('tooltip text alignment rejects missing competing inline reset and contradictory stage evidence', () => {
  const controls = [
    (r, a, n, rule) => { delete r.errors; },
    (r, a, n, rule) => { n.rules = []; },
    (r, a, n, rule) => { rule.active = false; },
    (r, a, n, rule) => { delete rule.active; },
    (r, a, n, rule) => { rule.selector = '.other'; },
    (r, a, n, rule) => { rule.conditions = ['print']; },
    (r, a, n, rule) => { rule.declarations['text-align'].value = 'left'; },
    (r, a, n, rule) => { rule.declarations['text-align'].important = true; },
    (r, a, n, rule) => { rule.declarations.all = { value: 'initial', important: false }; },
    (r, a, n, rule) => { rule.declarations.animation = { value: 'align 1s', important: false }; },
    (r, a, n, rule) => { n.inline = { textAlign: 'center' }; },
    (r, a, n, rule) => { n.inline = null; },
    (r, a, n, rule) => { n.attributes.style = 'text-align: center'; },
    (r, a, n, rule) => { r.rules.push(structuredClone(rule)); n.rules.push(r.rules.length - 1); },
    (r, a, n, rule) => { r.styles[0].textAlign = 'right'; },
    (r, a, n, rule) => { a.nodes.at(-1).retainedText.style.textAlign = 'center'; },
    (r, a, n, rule) => { a.nodes.at(-1).retainedText.source = 'other'; },
    (r, a, n, rule) => { a.nodes[0].authored.style = { textAlign: 'left' }; },
    (r, a, n, rule) => { a.nodes[2].normalResolvedStyle.textAlign = 'inherit'; },
    (r, a, n, rule) => { a.nodes[1].interactionResolvedStyle.textAlign = 'center'; },
    (r, a, n, rule) => { a.nodes[0].normalResolvedStyle.all = 'unset'; },
    (r, a, n, rule) => { delete a.nodes[1].interactionResolvedStyle; },
    (r, a, n, rule) => { a.rules.push({ selector: '#page', textAlign: 'left' }); },
    (r, a, n, rule) => { a.rules.push({ selector: '*', all: 'initial' }); },
    (r, a, n, rule) => { a.rules.push({ selector: '#tooltip-popup:hover', textAlign: 'center' }); },
    (r, a, n, rule) => { a.rules.push({ selector: '*', transition: 'all 1s' }); },
    (r, a, n, rule) => { a.rules.at(-2).justifyContent = 'flex-start'; },
    (r, a, n, rule) => { a.rules.at(-2).mediaQuery = 'print'; },
    (r, a, n, rule) => { a.nodes.at(-1).normalResolvedStyle.alignItems = 'stretch'; },
    (r, a, n, rule) => { a.nodes.at(-1).interactionResolvedStyle.display = 'block'; },
  ];
  for (const [i, mutate] of controls.entries()) {
    const raw = tooltipAlignmentReport(), { reference: r, astylar: a } = raw.results[0].inputTrees;
    const n = r.nodes.find(n => n.key === 'message'); mutate(r, a, n, r.rules[n.rules[0]]);
    assert.equal(tooltipAlignmentEvidence(raw).length, 0, `control ${i}`);
  }
});

test('tooltip text alignment replay rejects altered declaration ancestry omission and acceptance claims', () => {
  const original = buildMaterialInputAudit(tooltipAlignmentReport());
  assert.ok(original.sourceFindings.find(f => f.id === 'fixture-tooltip-text-alignment-omission').detected);
  assert.ok(!validateMaterialInputAudit(original, { requireComplete: false }).some(e => e.includes('tooltip text')));
  for (const mutate of [
    (r, d) => { r.retainedTypography.differences = r.retainedTypography.differences.filter(v => v !== d); },
    (r, d) => { d.reviewEvidence.referenceRule.declarations = {}; },
    (r, d) => { d.reviewEvidence.candidateChain.pop(); },
    (r, d) => { d.reviewEvidence.candidateChain[0].normal.textAlign = 'left'; },
    (r, d) => { d.reviewEvidence.checkedCandidateRules = []; },
    (r, d) => { d.reviewEvidence.flexRule.justifyContent = 'flex-start'; },
    (r, d) => { d.reviewEvidence.sourceFinding = 'other'; },
    (r, d) => { d.inputEquivalent = true; },
    (r, d) => { d.finalRasterVerified = true; },
    (r, d) => { d.currentPseudoStatePaintVerified = true; },
    (r, d) => { d.classification = 'confirmed-core-defect'; },
    (r, d) => { d.family = 'menu'; d.element = 'other'; d.case = 'static:menu@light/desktop'; delete d.mapping; },
  ]) {
    const report = structuredClone(original), d = report.retainedTypography.differences.find(d => d.attribution === 'reviewed-tooltip-text-alignment-input');
    mutate(report, d);
    assert.ok(validateMaterialInputAudit(report, { requireComplete: false }).some(e => e.includes('tooltip text')));
  }
});

test('tooltip text mapping preserves connected-overlay versus flow ownership and unequal typography', () => {
  const raw = tooltipTextReport(), original = structuredClone(raw), cases = raw.results.map(e => ({ ...e, kind: 'static' }));
  const evidence = collectRetainedTypographyEvidence(cases, collectFullTreeInventory(cases));
  const maps = evidence.reviewedMappings.filter(m => m.kind === 'reviewed-tooltip-overlay-text');
  assert.equal(maps.length, 1); assert.equal(maps[0].referenceNode, 'message'); assert.equal(maps[0].astylarNode, 'popup');
  assert.equal(maps[0].inputEquivalent, false); assert.equal(maps[0].finalRasterVerified, false);
  assert.equal(maps[0].classification, 'application-plugin-authoring-defect');
  assert.equal(maps[0].reviewEvidence.referencePath.length, 6); assert.equal(maps[0].reviewEvidence.candidatePath.length, 4);
  assert.equal(maps[0].reviewEvidence.referencePath[2].attributes['aria-hidden'], 'true');
  assert.equal(maps[0].reviewEvidence.candidatePath[0].authored.role, 'tooltip');
  assert.equal(evidence.comparisons.filter(c => c.element === 'tooltip-popup').length, 1);
  assert.equal(evidence.differences.filter(d => d.element === 'tooltip-popup').length, 2);
  assert.deepEqual(raw, original);
});

test('tooltip text mapping rejects unrelated ambiguous or contradictory triggers and overlays', () => {
  const controls = [
    (r, a) => { r.nodes.find(n => n.key === 'trigger').attributes.mattooltip = 'Other'; },
    (r, a) => { delete r.nodes.find(n => n.key === 'trigger').attributes['aria-describedby']; },
    (r, a) => { r.nodes.find(n => n.key === 'trigger').parent = 'frame'; },
    (r, a) => { r.nodes.find(n => n.key === 'trigger').attributes.class = 'other'; },
    (r, a) => { r.nodes.find(n => n.key === 'label').ownText = 'Other'; },
    (r, a) => { r.nodes.find(n => n.key === 'section').type = 'div'; },
    (r, a) => { r.nodes.find(n => n.key === 'frame').parent = 'other'; },
    (r, a) => { r.nodes.find(n => n.key === 'message').ownText = 'Other'; },
    (r, a) => { r.nodes.find(n => n.key === 'message').attributes.id = 'tooltip-popup'; },
    (r, a) => { r.nodes.find(n => n.key === 'message').parent = 'component'; },
    (r, a) => { r.nodes.find(n => n.key === 'wrapper').attributes.class = 'mat-mdc-tooltip mat-mdc-tooltip-hide'; },
    (r, a) => { r.nodes.find(n => n.key === 'component').attributes['aria-hidden'] = 'false'; },
    (r, a) => { r.nodes.find(n => n.key === 'pane').attributes.id = 'other'; },
    (r, a) => { r.nodes.find(n => n.key === 'pane').attributes.class = 'cdk-overlay-pane mat-mdc-tooltip-panel mat-mdc-tooltip-panel-above'; },
    (r, a) => { r.nodes.find(n => n.key === 'overlay').parent = 'frame'; },
    (r, a) => { r.nodes.push(structuredClone(r.nodes.at(-1))); },
    (r, a) => { a.nodes.push(structuredClone(a.nodes.at(-1))); },
    (r, a) => { r.nodes.push({ ...structuredClone(r.nodes.at(-1)), key: 'second-surface' }); },
    (r, a) => { a.nodes.push({ ...structuredClone(a.nodes.at(-1)), key: 'second-popup' }); },
    (r, a) => { a.nodes.find(n => n.key === 'button').authored.ariaDescribedby = 'other'; },
    (r, a) => { a.nodes.find(n => n.key === 'button').authored.value = 'Other'; },
    (r, a) => { a.nodes.find(n => n.key === 'popup').authored.textContent = 'Other'; },
    (r, a) => { a.nodes.find(n => n.key === 'popup').authored.role = 'status'; },
    (r, a) => { a.nodes.find(n => n.key === 'popup').parent = 'section'; },
    (r, a) => { a.nodes.find(n => n.key === 'anchor').authored.class = 'other'; },
    (r, a) => { a.nodes.find(n => n.key === 'page').parent = 'other'; },
    (r, a) => { r.nodes.push({ key: 'extra', parent: 'message', type: 'span', attributes: {}, ownText: 'extra' }); },
    (r, a) => { a.nodes.push({ key: 'extra', parent: 'anchor', authored: { type: 'span', textContent: 'extra' } }); },
  ];
  for (const [index, mutate] of controls.entries()) {
    const raw = tooltipTextReport(), { reference: r, astylar: a } = raw.results[0].inputTrees; mutate(r, a);
    assert.deepEqual(reviewedTemplateTextMappings('tooltip', r, a), [], `control ${index}`);
  }
});

test('tooltip text replay preserves candidate-only state and missing retained-stage gaps', () => {
  for (const candidateOnly of [false, true]) {
    const raw = tooltipTextReport(), { reference: r, astylar: a } = raw.results[0].inputTrees;
    if (candidateOnly) r.nodes = r.nodes.filter(n => ['frame', 'section', 'trigger', 'label'].includes(n.key));
    else delete a.nodes.at(-1).retainedText;
    const report = buildMaterialInputAudit(raw), gaps = report.retainedTypography.gaps.filter(g => g.element === 'tooltip-popup');
    assert.equal(gaps.length, 1); assert.equal(gaps[0].attribution, 'unresolved');
    assert.match(gaps[0].reason, candidateOnly ? /missing or duplicated on one side/ : /no authoritative retained core text entry/);
    assert.equal(report.retainedTypography.reviewedMappings.filter(m => m.kind === 'reviewed-tooltip-overlay-text').length, candidateOnly ? 0 : 1);
    assert.ok(!validateMaterialInputAudit(report, { requireComplete: false }).some(e => e.includes('tooltip text')));
    report.retainedTypography.gaps = report.retainedTypography.gaps.filter(g => g !== gaps[0]);
    assert.ok(validateMaterialInputAudit(report, { requireComplete: false }).some(e => e.includes('tooltip text')));
  }
});

test('tooltip text replay rejects removed or fabricated mapping and typography evidence', () => {
  const original = buildMaterialInputAudit(tooltipTextReport());
  assert.ok(!validateMaterialInputAudit(original, { requireComplete: false }).some(e => e.includes('tooltip text')));
  for (const mutate of [
    r => { r.retainedTypography.reviewedMappings.pop(); },
    r => { r.retainedTypography.reviewedMappings.push(r.retainedTypography.reviewedMappings[0]); },
    r => { r.retainedTypography.reviewedMappings[0].inputEquivalent = true; },
    r => { r.retainedTypography.reviewedMappings[0].finalRasterVerified = true; },
    r => { r.retainedTypography.reviewedMappings[0].reviewEvidence.referencePath.pop(); },
    r => { r.retainedTypography.reviewedMappings[0].reviewEvidence.referenceTrigger.attributes.mattooltip = 'Other'; },
    r => { r.retainedTypography.reviewedMappings[0].reviewEvidence.candidateTrigger.authored.ariaDescribedby = 'Other'; },
    r => { r.retainedTypography.comparisons[0].revision++; },
    r => { r.retainedTypography.differences.pop(); },
    r => { r.retainedTypography.differences[0].values.retained = 'fake'; },
    r => { r.retainedTypography.reviewedMappings[0].case = 'static:menu@light/desktop'; },
  ]) {
    const report = structuredClone(original); mutate(report);
    assert.ok(validateMaterialInputAudit(report, { requireComplete: false }).some(e => e.includes('tooltip text')));
  }
});

function snackbarActionTypographyReport() {
  const raw = controlTypographyReport(), entry = raw.results[0], { reference: ref, astylar: ast } = entry.inputTrees;
  entry.family = 'snack-bar';
  const node = (key, parent, type, attributes = {}, ownText = '') => ({ key, parent, type, attributes, ownText,
    style: 0, rules: [], pseudoElements: [] });
  ref.nodes = [
    node('label', 'button', 'span', { class: 'mdc-button__label' }, ' UNDO '),
    node('button', 'actions', 'button', { class: 'mat-mdc-snack-bar-action mat-mdc-button mat-unthemed', matsnackbaraction: '' }),
    node('actions', 'simple', 'div', { class: 'mat-mdc-snack-bar-actions', matsnackbaractions: '' }),
    node('simple', 'wrapper', 'simple-snack-bar', { class: 'mat-mdc-simple-snack-bar' }),
    node('wrapper', 'live', 'div'),
    node('live', 'outer-label', 'div', { id: 'mat-snack-bar-container-live-13', 'aria-live': 'polite' }),
    node('outer-label', 'surface', 'div', { class: 'mat-mdc-snack-bar-label' }),
    node('surface', 'container', 'div', { class: 'mat-mdc-snackbar-surface' }),
    node('container', 'pane', 'mat-snack-bar-container', { class: 'mat-mdc-snack-bar-container' }),
    node('pane', 'global', 'div', { class: 'cdk-overlay-pane' }),
    node('global', 'overlay', 'div', { class: 'cdk-global-overlay-wrapper' }),
    node('overlay', null, 'div', { class: 'cdk-overlay-container' }),
    node('message', 'simple', 'div', { class: 'mat-mdc-snack-bar-label mdc-snackbar__label', matsnackbarlabel: '' }, ' Project saved\n'),
  ];
  Object.assign(ref.styles[0], { fontFamily: 'Roboto', fontSize: '14px', fontWeight: '500',
    lineHeight: 'normal', letterSpacing: '.096px', color: '#d5baff' });
  ref.rules = [
    { selector: '.mat-mdc-button', active: true, declarations: {
      'font-family': { value: 'var(--mat-button-text-label-text-font, var(--mat-sys-label-large-font))' },
      'letter-spacing': { value: 'var(--mat-button-text-label-text-tracking, var(--mat-sys-label-large-tracking))' },
    } },
    { selector: '.mat-mdc-snack-bar-container .mat-mdc-button.mat-mdc-snack-bar-action:not(:disabled).mat-unthemed', active: true,
      declarations: { color: { value: 'var(--mat-snack-bar-button-color, var(--mat-sys-inverse-primary))' } } },
  ];
  ref.nodes[1].rules = [0, 1];
  const action = ast.nodes[0];
  action.key = 'action'; action.parent = 'candidate-surface';
  action.authored = { id: 'snack-bar-dismiss', type: 'button', class: 'overlay-dismiss', value: 'UNDO' };
  Object.assign(action.normalResolvedStyle, { fontFamily: 'Roboto, Arial, sans-serif', fontSize: '16px', fontWeight: '500', color: '#6750a4' });
  delete action.normalResolvedStyle.letterSpacing;
  delete action.normalResolvedStyle.lineHeight;
  action.interactionResolvedStyle = { ...action.normalResolvedStyle };
  delete action.retainedText;
  action.paintedControlText.text = 'UNDO';
  Object.assign(action.paintedControlText.style, { fontFamily: 'Roboto, Arial, sans-serif', fontSize: 16, fontWeight: '500',
    lineHeight: 19 / 16, letterSpacing: 0, color: '#6750a4' });
  const candidateNode = (key, parent, authored) => ({ key, parent, authored,
    resolvedStyle: {}, normalResolvedStyle: {}, interactionResolvedStyle: {} });
  ast.nodes = [action,
    candidateNode('candidate-surface', 'candidate-overlay', { id: 'snack-bar-surface', type: 'div', class: 'snack-surface', role: 'status', ariaLive: 'polite', ariaAtomic: true }),
    candidateNode('candidate-overlay', 'section', { id: 'snack-bar-overlay', type: 'div', class: 'snack-overlay' }),
    candidateNode('section', 'page', { id: 'snack-bar-root', type: 'section' }),
    candidateNode('page', 'root', { id: 'page', type: 'main' }),
    candidateNode('candidate-message', 'candidate-surface', { id: 'snack-bar-title', type: 'span', textContent: 'Project saved' }),
  ];
  ast.rules = [{ selector: '.overlay-dismiss', color: '#6750a4', fontWeight: '500' },
    { selector: 'button, input, select', fontFamily: 'Roboto, Arial, sans-serif' }];
  return raw;
}

function snackbarActionSizeReport(pageSize = '16px') {
  const raw = snackbarActionTypographyReport(), { reference: r, astylar: a } = raw.results[0].inputTrees;
  r.rules[0].conditions = [];
  r.rules[0].declarations['font-size'] = { value: 'var(--mat-button-text-label-text-size, var(--mat-sys-label-large-size))', important: false };
  r.rules.push({ selector: 'button, input, select', active: true, conditions: [],
    declarations: { 'font-size': { value: 'inherit', important: false } } });
  r.nodes.find(n => n.key === 'button').rules.unshift(r.rules.length - 1);
  a.rules.push({ selector: '#page', fontSize: pageSize });
  for (const stage of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle'])
    a.nodes.find(n => n.key === 'page')[stage].fontSize = pageSize;
  return raw;
}

test('snackbar action size retains omitted component token and prepaint default independently of page scale', () => {
  for (const size of ['14.4px', '16px', '18.4px']) {
    const raw = snackbarActionSizeReport(size), before = structuredClone(raw), report = buildMaterialInputAudit(raw);
    const f = report.controlTypography.differences.find(d => d.attribution === 'reviewed-snackbar-action-size-token-omission');
    assert.ok(f); assert.equal(f.inputEquivalent, false); assert.equal(f.finalRasterVerified, false);
    assert.equal(f.values.reference, '14px'); assert.equal(f.values.normal, '16px'); assert.equal(f.values.painted, '16px');
    assert.equal(f.reviewEvidence.referenceChain[1].sizeRules.length, 2);
    assert.equal(f.reviewEvidence.candidateChain.length, 5);
    assert.equal(f.reviewEvidence.candidateChain.at(-1).normal.fontSize, size);
    assert.equal(f.reviewEvidence.sourceDefault.value, '16px');
    assert.ok(report.controlTypography.differences.some(d => d.property === 'lineHeight' && d.attribution === 'unresolved'));
    assert.ok(!validateMaterialInputAudit(report, { requireComplete: false }).some(e => e.includes('snackbar action size')));
    assert.deepEqual(raw, before);
  }
});

test('snackbar action size refuses competing declarations missing ancestry and inconsistent default stages', () => {
  const controls = [
    (r, a) => { delete r.errors; }, (r, a) => { delete a.errors; },
    (r, a) => { r.rules[0].active = false; }, (r, a) => { r.rules[0].conditions = ['@media print']; },
    (r, a) => { r.rules[0].declarations['font-size'].value = '14px'; },
    (r, a) => { r.rules[0].declarations['font-size'].important = true; },
    (r, a) => { r.nodes.find(n => n.key === 'button').rules.reverse(); },
    (r, a) => { r.nodes.find(n => n.key === 'label').inline = { fontSize: '14px' }; },
    (r, a) => { r.rules[0].declarations.all = { value: 'initial' }; },
    (r, a) => { r.rules[0].declarations['animation-name'] = { value: 'font-size-change' }; },
    (r, a) => { a.rules[0].fontSize = '14px'; },
    (r, a) => { a.rules.push({ selector: '.overlay-dismiss:hover', fontSize: '14px' }); },
    (r, a) => { a.rules.push({ selector: '.snack-surface', fontSize: '14px' }); },
    (r, a) => { a.rules.push({ selector: '.overlay-dismiss', animationName: 'font-size-change' }); },
    (r, a) => { a.rules.at(-1).mediaMaxWidth = '400px'; },
    (r, a) => { a.rules.at(-1).fontSize = '20px'; },
    (r, a) => { a.nodes.find(n => n.key === 'action').normalResolvedStyle.fontSize = '14px'; },
    (r, a) => { a.nodes.find(n => n.key === 'action').paintedControlText.style.fontSize = 14; },
    (r, a) => { a.nodes.find(n => n.key === 'candidate-surface').interactionResolvedStyle.fontSize = '16px'; },
    (r, a) => { a.nodes.find(n => n.key === 'page').normalResolvedStyle.fontSize = '18.4px'; },
    (r, a) => { a.nodes.find(n => n.key === 'page').parent = 'outside'; },
    (r, a) => { a.nodes.find(n => n.key === 'candidate-overlay').parent = 'missing'; },
    (r, a) => { a.nodes.find(n => n.key === 'action').authored.style = { fontSize: '16px' }; },
    (r, a) => { a.nodes.find(n => n.key === 'candidate-message').authored.textContent = 'Different'; },
  ];
  for (const [index, mutate] of controls.entries()) {
    const raw = snackbarActionSizeReport(), { reference: r, astylar: a } = raw.results[0].inputTrees;
    mutate(r, a);
    assert.ok(!controlEvidence(raw).differences.some(d => d.attribution === 'reviewed-snackbar-action-size-token-omission'), `control ${index}`);
  }
});

test('snackbar action size report replays all captured size evidence and rejects deleted claims', () => {
  const baseline = buildMaterialInputAudit(snackbarActionSizeReport());
  const controls = [
    (r, f) => { f.inputEquivalent = true; }, (r, f) => { f.finalRasterVerified = true; },
    (r, f) => { f.reviewEvidence.sourceDefault.value = '14px'; }, (r, f) => { f.reviewEvidence.candidateChain.pop(); },
    (r, f) => { f.reviewEvidence.referenceChain[1].sizeRules.reverse(); },
    (r, f) => { f.values.normal = '14px'; }, (r, f) => { f.revision++; },
    (r, f) => { f.family = 'dialog'; }, (r, f) => { r.controlTypography.differences = []; },
    (r, f) => { r.controlTypography.comparisons = []; }, (r, f) => { r.controlTypography.differences.push(structuredClone(f)); },
  ];
  for (const [index, mutate] of controls.entries()) {
    const report = structuredClone(baseline), f = report.controlTypography.differences.find(d => d.attribution === 'reviewed-snackbar-action-size-token-omission');
    mutate(report, f);
    assert.ok(validateMaterialInputAudit(report, { requireComplete: false }).some(e => e.includes('snackbar action size')), `mutation ${index}`);
  }
});

function snackbarMessageReport() {
  const raw = snackbarActionTypographyReport(), { reference: r, astylar: a } = raw.results[0].inputTrees;
  const style = { fontFamily: 'Roboto', fontSize: '14px', fontWeight: '400', fontStyle: 'normal', lineHeight: '20px',
    letterSpacing: 'normal', wordSpacing: '0px', textAlign: 'start', textTransform: 'none', textDecoration: 'none', color: '#f5eff4' };
  r.styles.push(style); r.nodes.find(n => n.key === 'message').style = r.styles.length - 1;
  a.nodes.find(n => n.key === 'candidate-message').retainedText = { source: 'core-text-registry', style: {
    ...style, fontFamily: 'Roboto, Arial, sans-serif', fontSize: '16px', lineHeight: 'normal', textAlign: 'left', color: '#ffffff' } };
  return raw;
}

function snackbarMessageTokenReport(size = '16px') {
  const raw = snackbarMessageReport(), { reference: r, astylar: a } = raw.results[0].inputTrees;
  r.rules.push({ selector: '.mat-mdc-snack-bar-container .mdc-snackbar__label', active: true, conditions: [],
    declarations: { 'font-size': { value: 'var(--mat-snack-bar-supporting-text-size, var(--mat-sys-body-medium-size))', important: false } } });
  r.nodes.find(n => n.key === 'message').rules = [r.rules.length - 1];
  r.rules.push({ selector: '.mat-mdc-snack-bar-container .mat-mdc-snackbar-surface', active: true, conditions: [],
    declarations: { color: { value: 'var(--mat-snack-bar-supporting-text-color, var(--mat-sys-inverse-on-surface))', important: false } } });
  r.nodes.find(n => n.key === 'surface').rules = [r.rules.length - 1];
  for (const key of ['simple', 'wrapper', 'live', 'outer-label', 'surface']) {
    r.styles.push({ ...r.styles[1], fontSize: '16px' });
    r.nodes.find(n => n.key === key).style = r.styles.length - 1;
  }
  a.rules.push({ selector: '#page', fontSize: size }, { selector: '.snack-surface', color: '#ffffff' });
  for (const stage of ['normalResolvedStyle', 'interactionResolvedStyle', 'resolvedStyle']) {
    a.nodes.find(n => n.key === 'page')[stage].fontSize = size;
    a.nodes.find(n => n.key === 'candidate-surface')[stage].color = '#ffffff';
  }
  a.nodes.find(n => n.key === 'candidate-message').retainedText.style.fontSize = size;
  return raw;
}

function snackbarMessageTokenEvidence(raw) {
  const cases = raw.results.map(e => ({ ...e, kind: 'static' }));
  return collectRetainedTypographyEvidence(cases, collectFullTreeInventory(cases)).differences
    .filter(d => d.attribution === 'reviewed-snackbar-message-token-input');
}

test('snackbar message tokens distinguish direct size from inherited surface ink without inventing own values', () => {
  for (const size of ['14.4px', '16px', '18.4px']) {
    const raw = snackbarMessageTokenReport(size), original = structuredClone(raw), observations = snackbarMessageTokenEvidence(raw);
    assert.equal(observations.length, 2);
    for (const d of observations) {
      const isSize = d.property === 'fontSize', e = d.reviewEvidence;
      assert.equal(d.classification, 'application-plugin-authoring-defect');
      assert.equal(d.inputEquivalent, false); assert.equal(d.finalRasterVerified, false);
      assert.equal(d.currentPseudoStatePaintVerified, false);
      assert.equal(e.referenceChain.length, isSize ? 1 : 6);
      assert.equal(e.candidateChain.length, isSize ? 5 : 2);
      assert.equal(e.candidateChain[0].normal[d.property], undefined);
      assert.equal(e.candidateChain[0].effective[d.property], undefined);
      assert.equal(e.candidateRule.selector, isSize ? '#page' : '.snack-surface');
      assert.equal(e.candidateValue, isSize ? size : 'rgba(255,255,255,1)');
    }
    assert.deepEqual(raw, original);
  }
});

test('snackbar message tokens reject missing competing reset and changed stage evidence', () => {
  for (const property of ['fontSize', 'color']) {
    const css = property === 'fontSize' ? 'font-size' : 'color', owner = property === 'fontSize' ? 'message' : 'surface';
    const candidateOwner = property === 'fontSize' ? 'page' : 'candidate-surface';
    const controls = [
      (r, a, n, cn, rule) => { delete r.errors; },
      (r, a, n, cn, rule) => { rule.active = false; },
      (r, a, n, cn, rule) => { delete rule.active; },
      (r, a, n, cn, rule) => { rule.conditions = ['@media print']; },
      (r, a, n, cn, rule) => { rule.selector = '.other'; },
      (r, a, n, cn, rule) => { rule.declarations[css].value = 'inherit'; },
      (r, a, n, cn, rule) => { rule.declarations[css].important = true; },
      (r, a, n, cn, rule) => { rule.declarations.all = { value: 'initial' }; },
      (r, a, n, cn, rule) => { rule.declarations.transition = { value: 'all 1s' }; },
      (r, a, n, cn, rule) => { n.rules = []; },
      (r, a, n, cn, rule) => { n.rules.push(n.rules[0]); },
      (r, a, n, cn, rule) => { n.attributes.style = css + ':inherit'; },
      (r, a, n, cn, rule) => { n.inline = { [css]: { value: 'inherit' } }; },
      (r, a, n, cn, rule) => { r.styles[n.style][property] = 'invalid'; },
      (r, a, n, cn, rule) => { cn.normalResolvedStyle[property] = 'invalid'; },
      (r, a, n, cn, rule) => { cn.interactionResolvedStyle[property] = 'invalid'; },
      (r, a, n, cn, rule) => { cn.normalResolvedStyle.all = 'initial'; },
      (r, a, n, cn, rule) => { cn.authored.style = { [property]: 'inherit' }; },
      (r, a, n, cn, rule) => { a.nodes.find(n => n.key === 'candidate-message').normalResolvedStyle[property] = 'inherit'; },
      (r, a, n, cn, rule) => { a.nodes.find(n => n.key === 'candidate-message').interactionResolvedStyle[property] = 'inherit'; },
      (r, a, n, cn, rule) => { a.nodes.find(n => n.key === 'candidate-message').retainedText.style[property] = 'invalid'; },
      (r, a, n, cn, rule) => { a.rules.push({ selector: 'span', [property]: 'inherit' }); },
      (r, a, n, cn, rule) => { a.rules.push({ selector: '[data-unknown]', [property]: 'inherit' }); },
      (r, a, n, cn, rule) => { a.rules.push({ selector: 'span:focus', all: 'initial' }); },
      (r, a, n, cn, rule) => { a.rules.push({ selector: '*', animation: 'ink 1s' }); },
      (r, a, n, cn, rule) => { a.rules.at(property === 'fontSize' ? -2 : -1).mediaQuery = 'print'; },
    ];
    for (const [index, mutate] of controls.entries()) {
      const raw = snackbarMessageTokenReport(), { reference: r, astylar: a } = raw.results[0].inputTrees;
      const node = r.nodes.find(n => n.key === owner), cn = a.nodes.find(n => n.key === candidateOwner);
      mutate(r, a, node, cn, r.rules[node.rules[0]]);
      assert.ok(!snackbarMessageTokenEvidence(raw).some(d => d.property === property), `${property} control ${index}`);
    }
  }
});

test('snackbar message tokens preserve independently varied token values and reject intervening ink', () => {
  const raw = snackbarMessageTokenReport();
  const { reference: r, astylar: a } = raw.results[0].inputTrees;
  r.styles[1].fontSize = '13px';
  for (const style of r.styles.slice(1)) style.color = '#112233';
  assert.equal(snackbarMessageTokenEvidence(raw).length, 2, 'token computation is observed, not replaced with a sampled reference literal');
  r.nodes.find(n => n.key === 'live').inline = { color: 'inherit' };
  assert.deepEqual(snackbarMessageTokenEvidence(raw).map(d => d.property), ['fontSize']);
  delete r.nodes.find(n => n.key === 'live').inline;
  a.nodes.find(n => n.key === 'candidate-overlay').normalResolvedStyle.fontSize = '16px';
  assert.deepEqual(snackbarMessageTokenEvidence(raw).map(d => d.property), ['color']);
});

test('snackbar message token replay rejects fabricated source ancestry stage or equivalence claims', () => {
  const original = buildMaterialInputAudit(snackbarMessageTokenReport());
  assert.ok(original.sourceFindings.find(f => f.id === 'fixture-snackbar-message-token-substitution').detected);
  assert.ok(!validateMaterialInputAudit(original, { requireComplete: false }).some(e => e.includes('snackbar message')));
  for (const property of ['fontSize', 'color']) {
    for (const mutate of [
      (r, d) => { r.retainedTypography.differences = r.retainedTypography.differences.filter(v => v !== d); },
      (r, d) => { d.reviewEvidence.referenceChain.pop(); },
      (r, d) => { d.reviewEvidence.candidateChain[0].normal[property] = d.reviewEvidence.candidateValue; },
      (r, d) => { d.reviewEvidence.checkedCandidateRules = []; },
      (r, d) => { d.reviewEvidence.referenceRule.declarations = {}; },
      (r, d) => { d.reviewEvidence.sourceFinding = 'other'; },
      (r, d) => { d.inputEquivalent = true; },
      (r, d) => { d.finalRasterVerified = true; },
      (r, d) => { d.currentPseudoStatePaintVerified = true; },
      (r, d) => { d.classification = 'confirmed-core-defect'; },
      (r, d) => { d.family = 'menu'; d.element = 'other'; d.case = 'static:menu@light/desktop'; },
    ]) {
      const report = structuredClone(original), d = report.retainedTypography.differences.find(d => d.property === property && d.element === 'snack-bar-title');
      mutate(report, d);
      assert.ok(validateMaterialInputAudit(report, { requireComplete: false }).some(e => e.includes('snackbar message')));
    }
  }
});

test('snackbar message mapping preserves live-region and action context without equating layout or typography', () => {
  const raw = snackbarMessageReport(), original = structuredClone(raw), cases = raw.results.map(e => ({ ...e, kind: 'static' }));
  const result = collectRetainedTypographyEvidence(cases, collectFullTreeInventory(cases));
  const maps = result.reviewedMappings.filter(m => m.kind === 'reviewed-snackbar-message-text');
  assert.equal(maps.length, 1);
  assert.equal(maps[0].referenceNode, 'message');
  assert.equal(maps[0].astylarNode, 'candidate-message');
  assert.equal(maps[0].classification, 'application-plugin-authoring-defect');
  assert.equal(maps[0].inputEquivalent, false);
  assert.equal(maps[0].finalRasterVerified, false);
  assert.equal(maps[0].reviewEvidence.referenceText, ' Project saved\n');
  assert.equal(maps[0].reviewEvidence.candidateText, 'Project saved');
  assert.equal(maps[0].reviewEvidence.referencePath.length, 10);
  assert.equal(maps[0].reviewEvidence.candidatePath.length, 5);
  assert.equal(result.comparisons.filter(c => c.element === 'snack-bar-title').length, 1);
  assert.equal(result.differences.filter(c => c.element === 'snack-bar-title').length, 5);
  assert.ok(!result.gaps.some(g => g.element === 'snack-bar-title' || g.referenceNodes?.includes('message')));
  assert.equal(result.controlTextMappings.length, 1, 'UNDO retains its independent control-texture owner');
  assert.deepEqual(raw, original);
});

test('snackbar message mapping rejects ambiguous broken or contradictory overlay paths', () => {
  const controls = [
    (r, a) => { r.nodes.find(n => n.key === 'message').ownText = 'Other'; },
    (r, a) => { a.nodes.find(n => n.key === 'candidate-message').authored.textContent = 'Other'; },
    (r, a) => { r.nodes.find(n => n.key === 'message').attributes.id = 'snack-bar-title'; },
    (r, a) => { r.nodes.find(n => n.key === 'message').parent = 'surface'; },
    (r, a) => { a.nodes.find(n => n.key === 'candidate-message').parent = 'candidate-overlay'; },
    (r, a) => { r.nodes.find(n => n.key === 'label').ownText = 'Cancel'; },
    (r, a) => { a.nodes.find(n => n.key === 'action').authored.value = 'Cancel'; },
    (r, a) => { r.nodes.find(n => n.key === 'actions').parent = 'surface'; },
    (r, a) => { delete r.nodes.find(n => n.key === 'actions').attributes.matsnackbaractions; },
    (r, a) => { delete r.nodes.find(n => n.key === 'message').attributes.matsnackbarlabel; },
    (r, a) => { r.nodes.find(n => n.key === 'simple').type = 'div'; },
    (r, a) => { r.nodes.find(n => n.key === 'live').attributes['aria-live'] = 'assertive'; },
    (r, a) => { r.nodes.find(n => n.key === 'live').attributes.id = 'other'; },
    (r, a) => { r.nodes.find(n => n.key === 'surface').attributes.class = 'other'; },
    (r, a) => { r.nodes.find(n => n.key === 'overlay').parent = 'page'; },
    (r, a) => { a.nodes.find(n => n.key === 'candidate-surface').authored.role = 'dialog'; },
    (r, a) => { a.nodes.find(n => n.key === 'candidate-surface').authored.ariaLive = 'assertive'; },
    (r, a) => { a.nodes.find(n => n.key === 'candidate-surface').authored.ariaAtomic = false; },
    (r, a) => { a.nodes.find(n => n.key === 'candidate-overlay').authored.class = 'other'; },
    (r, a) => { a.nodes.find(n => n.key === 'page').parent = 'other'; },
    (r, a) => { r.nodes.push(structuredClone(r.nodes[0])); },
    (r, a) => { a.nodes.push(structuredClone(a.nodes[0])); },
    (r, a) => { r.nodes.push({ key: 'duplicate-id', parent: null, type: 'div', attributes: { id: 'mat-snack-bar-container-live-13' } }); },
    (r, a) => { a.nodes.push({ key: 'duplicate-id', parent: null, authored: { id: 'snack-bar-title', type: 'span', textContent: 'Project saved' } }); },
    (r, a) => { r.nodes.push({ key: 'extra-text', parent: 'message', type: 'span', attributes: {}, ownText: 'extra' }); },
    (r, a) => { a.nodes.push({ key: 'extra-text', parent: 'candidate-message', authored: { type: 'span', textContent: 'extra' } }); },
    (r, a) => { r.nodes.push({ key: 'extra-message', parent: 'simple', type: 'div', attributes: {}, ownText: 'extra' }); },
    (r, a) => { a.nodes.push({ key: 'extra-message', parent: 'candidate-surface', authored: { type: 'span', textContent: 'extra' } }); },
  ];
  for (const [index, mutate] of controls.entries()) {
    const raw = snackbarMessageReport(), { reference, astylar } = raw.results[0].inputTrees;
    mutate(reference, astylar);
    assert.deepEqual(reviewedTemplateTextMappings('snack-bar', reference, astylar), [], `control ${index}`);
  }
});

test('snackbar message correspondence never invents retained text or hides stage gaps', () => {
  const raw = snackbarMessageReport(), { astylar } = raw.results[0].inputTrees;
  delete astylar.nodes.find(n => n.key === 'candidate-message').retainedText;
  const report = buildMaterialInputAudit(raw);
  assert.equal(report.retainedTypography.reviewedMappings.filter(m => m.kind === 'reviewed-snackbar-message-text').length, 1);
  const gap = report.retainedTypography.gaps.find(g => g.element === 'snack-bar-title');
  assert.match(gap.reason, /no authoritative retained core text entry/);
  assert.equal(gap.attribution, 'unresolved');
  assert.ok(!validateMaterialInputAudit(report, { requireComplete: false }).some(e => e.includes('snackbar message')));
  report.retainedTypography.gaps = report.retainedTypography.gaps.filter(g => g !== gap);
  assert.ok(validateMaterialInputAudit(report, { requireComplete: false }).some(e => e.includes('snackbar message')));
});

test('snackbar message replay rejects removed or fabricated correspondence and typography evidence', () => {
  const original = buildMaterialInputAudit(snackbarMessageReport());
  assert.ok(original.sourceFindings.find(f => f.id === 'fixture-snackbar-message-composition-substitution').detected);
  assert.ok(!validateMaterialInputAudit(original, { requireComplete: false }).some(e => e.includes('snackbar message')));
  for (const mutate of [
    r => { r.retainedTypography.reviewedMappings.pop(); },
    r => { r.retainedTypography.reviewedMappings.push(r.retainedTypography.reviewedMappings[0]); },
    r => { r.retainedTypography.reviewedMappings[0].inputEquivalent = true; },
    r => { r.retainedTypography.reviewedMappings[0].finalRasterVerified = true; },
    r => { r.retainedTypography.reviewedMappings[0].case = 'static:menu@light/desktop'; },
    r => { r.retainedTypography.reviewedMappings[0].reviewEvidence.context.referenceChain.pop(); },
    r => { r.retainedTypography.reviewedMappings[0].reviewEvidence.referencePath[0].style = 999; },
    r => { r.retainedTypography.comparisons[0].revision++; },
    r => { r.retainedTypography.comparisons[0].properties.fontSize.retained = '14px'; },
    r => { r.retainedTypography.differences.pop(); },
    r => { r.retainedTypography.differences[0].attribution = 'equivalent-representation'; },
  ]) {
    const report = structuredClone(original); mutate(report);
    assert.ok(validateMaterialInputAudit(report, { requireComplete: false }).some(e => e.includes('snackbar message')));
  }
});

test('snackbar action text maps by exact overlay and sibling message context, preserving unequal typography', () => {
  const raw = snackbarActionTypographyReport(), before = structuredClone(raw), evidence = controlEvidence(raw);
  assert.deepEqual(evidence.gaps, []);
  assert.equal(evidence.comparisons.length, 1);
  const comparison = evidence.comparisons[0];
  assert.equal(comparison.mapping.kind, 'reviewed-material-snackbar-action-label');
  assert.equal(comparison.mapping.reviewEvidence.referenceChain.length, 12);
  assert.equal(comparison.mapping.reviewEvidence.candidateChain.length, 5);
  assert.equal(comparison.element, 'snack-bar-dismiss');
  assert.equal(comparison.finalRasterVerified, false);
  assert.equal(evidence.differences.length, 5);
  for (const property of ['fontFamily', 'letterSpacing', 'color']) {
    const finding = evidence.differences.find(d => d.property === property);
    assert.equal(finding.attribution, 'reviewed-snackbar-action-typography-input');
    assert.equal(finding.classification, 'application-plugin-authoring-defect');
    assert.equal(finding.reviewEvidence.sourceFinding, 'fixture-snackbar-action-typography-substitution');
  }
  for (const property of ['fontSize', 'lineHeight']) assert.equal(evidence.differences.find(d => d.property === property).attribution, 'unresolved');
  assert.deepEqual(raw, before);
  const report = buildMaterialInputAudit(raw);
  assert.equal(report.retainedTypography.controlTextMappings.length, 1);
  assert.equal(report.retainedTypography.controlTextMappings[0].inputEquivalent, false);
  assert.equal(report.summary.inputEquivalent, false);
  assert.ok(!validateMaterialInputAudit(report, { requireComplete: false }).some(e => e.includes('snackbar action')));
  assert.ok(validateMaterialInputAudit(report).some(e => e.includes('control texture typography differences')));
});

test('snackbar action mapping rejects contradictory structure, message, owner and paint evidence', () => {
  const mutations = [
    ref => { ref.nodes[1].attributes.class = 'unrelated'; },
    ref => { delete ref.nodes[1].attributes.matsnackbaraction; },
    ref => { ref.nodes[0].parent = 'actions'; },
    ref => { ref.nodes[3].type = 'div'; },
    ref => { ref.nodes[5].attributes['aria-live'] = 'assertive'; },
    ref => { ref.nodes[5].attributes.id = 'different'; },
    ref => { ref.nodes[8].parent = 'missing'; },
    ref => { ref.nodes[11].parent = 'page'; },
    ref => { ref.nodes[12].ownText = 'Other message'; },
    ref => { ref.nodes.push({ ...ref.nodes[8], key: 'second-container' }); },
    ref => { ref.nodes.push({ ...ref.nodes[0], key: 'second-label' }); },
    ref => { ref.nodes.push({ ...ref.nodes[0], key: 'nested-label', parent: 'label' }); },
    ref => { ref.nodes[1].ownText = 'Additional text'; },
    (_ref, ast) => { ast.nodes[0].parent = 'section'; },
    (_ref, ast) => { ast.nodes[0].authored.value = 'CLOSE'; },
    (_ref, ast) => { ast.nodes[0].authored.type = 'a'; },
    (_ref, ast) => { ast.nodes[1].authored.role = 'dialog'; },
    (_ref, ast) => { ast.nodes[4].parent = 'missing'; },
    (_ref, ast) => { ast.nodes[5].authored.textContent = 'Other'; },
    (_ref, ast) => { ast.nodes.push({ ...ast.nodes[0], key: 'duplicate' }); },
    (_ref, ast) => { ast.nodes.push({ ...ast.nodes[5], key: 'extra', parent: 'action' }); },
    (_ref, ast) => { ast.nodes[0].paintedControlText.text = 'CLOSE'; },
    (_ref, ast) => { ast.nodes[0].paintedControlText.source = 'core-text-registry'; },
    (_ref, ast) => { delete ast.nodes[0].paintedControlText; },
    (_ref, ast) => { ast.paintedControlTextEvidenceVersion = 0; },
  ];
  for (const mutate of mutations) {
    const raw = snackbarActionTypographyReport(), trees = raw.results[0].inputTrees;
    mutate(trees.reference, trees.astylar);
    const evidence = controlEvidence(raw);
    assert.deepEqual(evidence.comparisons, [], String(mutate));
    assert.ok(evidence.gaps.length > 0, String(mutate));
    assert.deepEqual(buildMaterialInputAudit(raw).retainedTypography.controlTextMappings, [], String(mutate));
  }
});

test('snackbar action typography attribution requires actual token, omission and unchanged paint witnesses', () => {
  const mutations = [
    ['fontFamily', ref => { ref.rules[0].active = false; }],
    ['fontFamily', ref => { ref.rules[0].declarations['font-family'].value = 'Roboto'; }],
    ['fontFamily', (_ref, ast) => { ast.rules[0].fontFamily = 'Roboto'; }],
    ['fontFamily', (_ref, ast) => { ast.rules[1].fontFamily = 'Arial'; }],
    ['fontFamily', (_ref, ast) => { ast.nodes[0].interactionResolvedStyle.fontFamily = 'Arial'; }],
    ['fontFamily', ref => { ref.nodes[0].attributes.style = 'font-family: Roboto'; }],
    ['letterSpacing', (_ref, ast) => { ast.nodes[1].normalResolvedStyle.letterSpacing = '0'; }],
    ['letterSpacing', (_ref, ast) => { ast.rules[0].letterSpacing = '0'; }],
    ['letterSpacing', ref => { ref.rules[0].declarations['letter-spacing'].value = '0.096px'; }],
    ['color', ref => { ref.rules[1].declarations.color.value = 'var(--mat-sys-primary)'; }],
    ['color', (_ref, ast) => { ast.rules[0].color = '#123456'; }],
    ['color', (_ref, ast) => { ast.nodes[0].paintedControlText.style.color = '#123456'; }],
    ['color', (_ref, ast) => { ast.rules.push({ ...ast.rules[0] }); }],
    ['color', ref => { ref.rules.push({ active: true, declarations: { color: { value: 'red' } } }); ref.nodes[0].rules = [2]; }],
  ];
  for (const [property, mutate] of mutations) {
    const raw = snackbarActionTypographyReport(), trees = raw.results[0].inputTrees;
    mutate(trees.reference, trees.astylar);
    assert.equal(controlEvidence(raw).differences.find(d => d.property === property)?.attribution, 'unresolved', `${property}: ${mutate}`);
  }
});

test('snackbar action mapping validation replays captured context even with partial coverage', () => {
  for (const mutation of ['message', 'chain', 'candidate role', 'revision', 'raster', 'text']) {
    const report = buildMaterialInputAudit(snackbarActionTypographyReport()), comparison = report.controlTypography.comparisons[0];
    if (mutation === 'message') comparison.mapping.reviewEvidence.referenceMessage.text = 'Another';
    if (mutation === 'chain') comparison.mapping.reviewEvidence.referenceChain.pop();
    if (mutation === 'candidate role') comparison.mapping.reviewEvidence.candidateChain[1].authored.role = 'dialog';
    if (mutation === 'revision') comparison.revision++;
    if (mutation === 'raster') comparison.finalRasterVerified = true;
    if (mutation === 'text') comparison.text = 'Another';
    assert.ok(validateMaterialInputAudit(report, { requireComplete: false }).some(e => e.includes('snackbar action mappings')), mutation);
  }
});

test('snackbar action typography validation rejects detached or changed witnesses even in partial reports', () => {
  for (const mutation of ['token', 'paint', 'classification', 'omission', 'property', 'revision']) {
    const report = buildMaterialInputAudit(snackbarActionTypographyReport());
    const difference = report.controlTypography.differences.find(d => d.property === 'letterSpacing');
    if (mutation === 'token') difference.reviewEvidence.referenceRule.declarations['letter-spacing'].value = '0';
    if (mutation === 'paint') difference.values.painted = '0.096px';
    if (mutation === 'classification') difference.classification = 'equivalent-representation';
    if (mutation === 'omission') difference.reviewEvidence.candidateChain.pop();
    if (mutation === 'property') difference.property = 'fontSize';
    if (mutation === 'revision') difference.revision++;
    assert.ok(validateMaterialInputAudit(report, { requireComplete: false }).some(e => e.includes('snackbar action typography')), mutation);
  }
});

function bottomSheetItemTypographyReport() {
  const raw = controlTypographyReport(), entry = raw.results[0], { reference: ref, astylar: ast } = entry.inputTrees;
  entry.family = 'bottom-sheet';
  const node = (key, parent, type, attributes = {}, ownText = '') => ({ key, parent, type, attributes, ownText,
    style: 0, rules: [], pseudoElements: [] });
  const labels = ['Share', 'Copy link'];
  ref.nodes = labels.flatMap((label, index) => [
    node(`anchor-${index}`, 'list', 'a', { class: 'mat-mdc-list-item', 'mat-list-item': '', href: '#', 'aria-disabled': 'false' }),
    node(`content-${index}`, `anchor-${index}`, 'span', { class: 'mdc-list-item__content' }),
    node(`label-${index}`, `content-${index}`, 'span', { class: 'mat-mdc-list-item-unscoped-content mdc-list-item__primary-text' }, label),
  ]);
  ref.nodes.push(node('list', 'container', 'mat-nav-list', { class: 'mat-mdc-nav-list', role: 'navigation', 'aria-disabled': 'false' }),
    node('container', 'pane', 'mat-bottom-sheet-container', { class: 'mat-bottom-sheet-container', role: 'dialog', 'aria-label': 'Sharing options' }),
    node('pane', 'global', 'div', { class: 'cdk-overlay-pane' }),
    node('global', 'overlay', 'div', { class: 'cdk-global-overlay-wrapper', dir: 'ltr' }),
    node('overlay', null, 'div', { class: 'cdk-overlay-container' }));
  Object.assign(ref.styles[0], { fontFamily: 'Roboto', fontSize: '16px', fontWeight: '400', lineHeight: '24px',
    letterSpacing: '.496px', color: '#1d1b1e', textAlign: 'start', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflowX: 'hidden' });
  ref.rules = [{ selector: '.mdc-list-item__primary-text', active: true, declarations: {
    'font-family': { value: 'var(--mat-list-list-item-label-text-font, var(--mat-sys-body-large-font))' },
    'line-height': { value: 'var(--mat-list-list-item-label-text-line-height, var(--mat-sys-body-large-line-height))' },
    'letter-spacing': { value: 'var(--mat-list-list-item-label-text-tracking, var(--mat-sys-body-large-tracking))' },
    color: { value: 'var(--mat-list-list-item-label-text-color, var(--mat-sys-on-surface))' },
  } }, { selector: '.mdc-list-item:focus .mdc-list-item__primary-text', active: true,
    declarations: { color: { value: 'var(--mat-list-list-item-focus-label-text-color, var(--mat-sys-on-surface))' } } }];
  ref.nodes[2].rules = [0, 1]; ref.nodes[5].rules = [0];
  const action = ast.nodes[0];
  const candidates = labels.map((label, index) => {
    const n = structuredClone(action);
    n.key = `action-${index}`; n.parent = 'panel';
    n.authored = { id: index ? 'bottom-sheet-copy' : 'bottom-sheet-dismiss', type: 'button', class: 'bottom-sheet-option',
      value: label, ...(index ? {} : { autofocus: true }) };
    Object.assign(n.normalResolvedStyle, { fontFamily: 'Roboto, Arial, sans-serif', fontSize: '16px', color: '#1d1b20', textAlign: 'left' });
    delete n.normalResolvedStyle.lineHeight; delete n.normalResolvedStyle.letterSpacing;
    n.interactionResolvedStyle = { ...n.normalResolvedStyle };
    delete n.retainedText;
    n.paintedControlText.text = label;
    Object.assign(n.paintedControlText.style, { fontFamily: 'Roboto, Arial, sans-serif', fontSize: 16, fontWeight: 'normal',
      lineHeight: 19 / 16, letterSpacing: 0, textAlign: 'left', color: '#1d1b20', whiteSpace: 'normal' });
    return n;
  });
  const candidateNode = (key, parent, authored) => ({ key, parent, authored,
    resolvedStyle: {}, normalResolvedStyle: {}, interactionResolvedStyle: {} });
  ast.nodes = [...candidates,
    candidateNode('panel', 'candidate-overlay', { id: 'bottom-sheet-panel', type: 'section', class: 'bottom-sheet-panel' }),
    candidateNode('candidate-overlay', 'section', { id: 'bottom-sheet-overlay', type: 'div', class: 'modal-overlay bottom-sheet-overlay', role: 'dialog', ariaLabel: 'Open bottom sheet' }),
    candidateNode('section', 'page', { id: 'bottom-sheet-root', type: 'section' }),
    candidateNode('page', 'root', { id: 'page', type: 'main' }),
  ];
  ast.rules = [{ selector: '.bottom-sheet-option', fontSize: '16px', color: '#1d1b20', textAlign: 'left' },
    { selector: 'button, input, select', fontFamily: 'Roboto, Arial, sans-serif' }];
  return raw;
}

test('bottom-sheet item text maps the ordered anchor/list and value-button paths without equating them', () => {
  const raw = bottomSheetItemTypographyReport(), before = structuredClone(raw), evidence = controlEvidence(raw);
  assert.deepEqual(evidence.gaps, []);
  assert.equal(evidence.comparisons.length, 2);
  assert.equal(evidence.differences.length, 10);
  for (const [index, comparison] of evidence.comparisons.entries()) {
    assert.equal(comparison.mapping.kind, 'reviewed-material-bottom-sheet-item-label');
    const review = comparison.mapping.reviewEvidence;
    assert.equal(review.itemIndex, index);
    assert.equal(review.referenceChain.length, 8);
    assert.equal(review.candidateChain.length, 5);
    assert.deepEqual(review.referenceItems.map(i => i.href), ['#', '#']);
    assert.deepEqual(review.candidateItems.map(i => i.authored.type), ['button', 'button']);
    assert.deepEqual(review.accessibleNames, { reference: 'Sharing options', candidate: 'Open bottom sheet', inputEquivalent: false });
    assert.equal(review.inputEquivalent, false);
    assert.equal(comparison.finalRasterVerified, false);
    for (const property of ['fontFamily', 'lineHeight', 'letterSpacing', 'color']) {
      const d = evidence.differences.find(d => d.element === comparison.element && d.property === property);
      assert.equal(d.attribution, 'reviewed-bottom-sheet-item-typography-input');
      assert.equal(d.classification, 'application-plugin-authoring-defect');
    }
    assert.equal(evidence.differences.find(d => d.element === comparison.element && d.property === 'textAlign').attribution, 'unresolved');
  }
  assert.deepEqual(raw, before);
  const report = buildMaterialInputAudit(raw);
  assert.equal(report.retainedTypography.controlTextMappings.length, 2);
  assert.ok(report.retainedTypography.controlTextMappings.every(m => m.inputEquivalent === false));
  assert.equal(report.summary.inputEquivalent, false);
  assert.ok(!validateMaterialInputAudit(report, { requireComplete: false }).some(e => e.includes('bottom-sheet item')));
});

test('bottom-sheet item mapping rejects altered order, missing siblings, links, ancestry and current text', () => {
  const mutations = [
    ref => { ref.nodes[0].attributes.href = '/other'; },
    ref => { ref.nodes[0].type = 'button'; },
    ref => { ref.nodes[0].attributes['aria-disabled'] = 'true'; },
    ref => { delete ref.nodes[0].attributes['mat-list-item']; },
    ref => { ref.nodes[1].attributes.class = 'unrelated'; },
    ref => { ref.nodes[2].parent = 'anchor-0'; },
    ref => { ref.nodes[2].ownText = 'Copy link'; ref.nodes[5].ownText = 'Share'; },
    ref => { ref.nodes[5].ownText = 'Different'; },
    ref => { ref.nodes[6].attributes.role = 'list'; },
    ref => { ref.nodes[7].attributes['aria-label'] = 'Other'; },
    ref => { ref.nodes[10].parent = 'missing'; },
    ref => { ref.nodes[3].parent = 'missing'; },
    ref => { ref.nodes.push({ ...ref.nodes[0], key: 'extra-item' }); },
    ref => { ref.nodes.push({ ...ref.nodes[2], key: 'extra-label' }); },
    ref => { ref.nodes.push({ ...ref.nodes[7], key: 'second-container' }); },
    ref => { ref.nodes.push({ ...ref.nodes[2], key: 'nested-label', parent: 'label-0' }); },
    (_ref, ast) => { ast.nodes.reverse(); },
    (_ref, ast) => { ast.nodes[1].parent = 'missing'; },
    (_ref, ast) => { ast.nodes[1].authored.value = 'Other'; },
    (_ref, ast) => { ast.nodes[0].authored.type = 'a'; },
    (_ref, ast) => { ast.nodes[2].authored.class = 'unrelated'; },
    (_ref, ast) => { ast.nodes[3].authored.role = 'navigation'; },
    (_ref, ast) => { ast.nodes.push({ ...ast.nodes[0], key: 'duplicate' }); },
    (_ref, ast) => { ast.nodes.push({ ...ast.nodes[1], key: 'child', parent: 'action-0' }); },
    (_ref, ast) => { ast.nodes[5].parent = 'missing'; },
    (_ref, ast) => { ast.nodes[0].paintedControlText.text = 'Other'; },
    (_ref, ast) => { ast.nodes[0].paintedControlText.source = 'core-text-registry'; },
    (_ref, ast) => { ast.paintedControlTextEvidenceVersion = 0; },
  ];
  for (const mutate of mutations) {
    const raw = bottomSheetItemTypographyReport(), trees = raw.results[0].inputTrees;
    mutate(trees.reference, trees.astylar);
    const evidence = controlEvidence(raw);
    assert.ok(!evidence.comparisons.some(c => c.element === 'bottom-sheet-dismiss'), String(mutate));
    assert.ok(evidence.gaps.length > 0, String(mutate));
  }
});

test('bottom-sheet item typography attribution requires token rules and complete omission/current-paint witnesses', () => {
  const mutations = [
    ['fontFamily', ref => { ref.rules[0].declarations['font-family'].value = 'Roboto'; }],
    ['fontFamily', (_ref, ast) => { ast.rules[1].fontFamily = 'Arial'; }],
    ['fontFamily', (_ref, ast) => { ast.rules[0].fontFamily = 'Roboto'; }],
    ['fontFamily', (_ref, ast) => { ast.nodes[0].interactionResolvedStyle.fontFamily = 'Arial'; }],
    ['lineHeight', ref => { ref.rules[0].declarations['line-height'].value = 'normal'; }],
    ['lineHeight', (_ref, ast) => { ast.nodes[2].normalResolvedStyle.lineHeight = '19px'; }],
    ['lineHeight', (_ref, ast) => { ast.rules[0].lineHeight = '19px'; }],
    ['lineHeight', (_ref, ast) => { ast.nodes[0].paintedControlText.style.fontSize = 17; }],
    ['letterSpacing', ref => { ref.rules[0].active = false; }],
    ['letterSpacing', (_ref, ast) => { ast.nodes[4].interactionResolvedStyle.letterSpacing = '0'; }],
    ['letterSpacing', (_ref, ast) => { ast.rules[0].letterSpacing = '0'; }],
    ['color', ref => { ref.rules[1].declarations.color.value = 'red'; }],
    ['color', (_ref, ast) => { ast.rules[0].color = 'red'; }],
    ['color', (_ref, ast) => { ast.nodes[0].paintedControlText.style.color = 'red'; }],
    ['color', (_ref, ast) => { ast.rules.push({ ...ast.rules[0] }); }],
    ['color', ref => { ref.nodes[2].attributes.style = 'color: #1d1b1e'; }],
  ];
  for (const [property, mutate] of mutations) {
    const raw = bottomSheetItemTypographyReport(), trees = raw.results[0].inputTrees;
    mutate(trees.reference, trees.astylar);
    assert.equal(controlEvidence(raw).differences.find(d => d.element === 'bottom-sheet-dismiss' && d.property === property)?.attribution,
      'unresolved', `${property}: ${mutate}`);
  }
});

test('bottom-sheet item mapping and attribution validation replay evidence rather than trusting review labels', () => {
  for (const mutation of ['names', 'order', 'equivalence', 'revision', 'raster', 'token', 'paint', 'omission']) {
    const report = buildMaterialInputAudit(bottomSheetItemTypographyReport()), c = report.controlTypography.comparisons[0];
    const d = report.controlTypography.differences.find(d => d.element === c.element && d.property === 'lineHeight');
    if (mutation === 'names') c.mapping.reviewEvidence.accessibleNames.candidate = 'Sharing options';
    if (mutation === 'order') c.mapping.reviewEvidence.referenceItems.reverse();
    if (mutation === 'equivalence') c.mapping.reviewEvidence.inputEquivalent = true;
    if (mutation === 'revision') c.revision++;
    if (mutation === 'raster') c.finalRasterVerified = true;
    if (mutation === 'token') d.reviewEvidence.referenceRule.declarations['line-height'].value = 'normal';
    if (mutation === 'paint') d.values.painted = '24px';
    if (mutation === 'omission') d.reviewEvidence.candidateChain.pop();
    assert.ok(validateMaterialInputAudit(report, { requireComplete: false }).some(e => e.includes('bottom-sheet item')), mutation);
  }
});

function calendarDayTypographyReport() {
  const raw = controlTypographyReport(), entry = raw.results[0];
  entry.family = 'datepicker';
  const ref = entry.inputTrees.reference, ast = entry.inputTrees.astylar;
  const node = (key, parent, type, attributes = {}, ownText = '') => ({ key, parent, type, attributes, ownText,
    style: 0, rules: [], pseudoElements: [] });
  ref.nodes = [
    node('dialog', null, 'div', { class: 'mat-datepicker-content-container', role: 'dialog' }),
    node('calendar', 'dialog', 'mat-calendar', { class: 'mat-calendar' }),
    node('header', 'calendar', 'mat-calendar-header'),
    node('header-box', 'header', 'div', { class: 'mat-calendar-header' }),
    node('controls', 'header-box', 'div', { class: 'mat-calendar-controls' }),
    node('period', 'controls', 'span', { id: 'mat-calendar-period-label-0', class: 'cdk-visually-hidden', 'aria-live': 'polite' }, 'SEP 2026'),
    node('content', 'calendar', 'div', { class: 'mat-calendar-content' }),
    node('month', 'content', 'mat-month-view'),
    node('table', 'month', 'table', { class: 'mat-calendar-table', role: 'grid' }),
    node('body', 'table', 'tbody', { class: 'mat-calendar-body' }),
    node('row', 'body', 'tr', { role: 'row' }),
    node('cell', 'row', 'td', { class: 'mat-calendar-body-cell-container', role: 'gridcell' }),
    node('day', 'cell', 'button', { class: 'mat-calendar-body-cell', 'aria-label': 'September 1, 2026', 'aria-pressed': 'false' }),
    node('day-label', 'day', 'span', { class: 'mat-calendar-body-cell-content mat-focus-indicator' }, ' 1 '),
  ];
  const day = ast.nodes[0];
  day.key = 'ast-day'; day.parent = 'ast-grid';
  day.authored = { type: 'button', id: 'datepicker-day-1', class: 'datepicker-cell datepicker-day', ariaLabel: '1', value: '1' };
  day.paintedControlText.text = '1';
  delete day.retainedText;
  const extra = (key, parent, authored) => ({ key, parent, authored, resolvedStyle: {}, normalResolvedStyle: {}, interactionResolvedStyle: {} });
  ast.nodes = [day,
    extra('ast-popup', null, { type: 'div', id: 'datepicker-popup', class: 'datepicker-popup', role: 'dialog' }),
    extra('ast-grid', 'ast-popup', { type: 'div', id: 'datepicker-grid', class: 'datepicker-grid' }),
    extra('ast-header', 'ast-popup', { type: 'div', id: 'datepicker-header' }),
    extra('ast-period', 'ast-header', { type: 'button', id: 'datepicker-month', ariaLabel: 'Choose month and year', value: 'SEP 2026 ▾' }),
    extra('ast-marker', 'ast-grid', { type: 'span', id: 'datepicker-month-marker', textContent: 'SEP' }),
  ];
  return raw;
}

test('calendar day ownership requires full accessible date, month context and both structural paths', () => {
  const raw = calendarDayTypographyReport(), entry = raw.results[0];
  const inventory = collectFullTreeInventory(raw.results);
  const controls = collectControlTypographyEvidence(raw.results, inventory);
  assert.equal(controls.comparisons.length, 1);
  const comparison = controls.comparisons[0];
  assert.equal(comparison.element, 'datepicker-day-1');
  assert.equal(comparison.mapping.kind, 'reviewed-material-calendar-day-label');
  assert.equal(comparison.mapping.reviewEvidence.accessibleDate, 'September 1, 2026');
  assert.equal(comparison.mapping.reviewEvidence.referencePeriodLabel, 'period');
  assert.equal(comparison.mapping.reviewEvidence.referenceChain.length, 10);
  assert.equal(comparison.finalRasterVerified, false);
  const retained = collectRetainedTypographyEvidence(raw.results, inventory, controls);
  assert.equal(retained.controlTextMappings.length, 1);
  assert.equal(retained.controlTextMappings[0].inputEquivalent, false);
  assert.ok(retained.gaps.some((gap) => gap.element === 'datepicker-month-marker'));
  // Equal current text is not permission to waive a newly exposed property.
  entry.inputTrees.astylar.nodes[0].paintedControlText.style.fontSize = 30;
  assert.ok(controlEvidence(raw).differences.some((difference) => difference.element === 'datepicker-day-1' &&
    difference.property === 'fontSize' && difference.attribution === 'unresolved'));
});

test('calendar mapping rejects contradictory dates, broken ancestry, duplicates and stale paint', () => {
  const mutations = [
    (r, a) => { r.find(n => n.key === 'day').attributes['aria-label'] = 'October 1, 2026'; },
    (r, a) => { r.find(n => n.key === 'day').attributes['aria-label'] = 'September 31, 2026'; },
    (r, a) => { r.find(n => n.key === 'day-label').ownText = '2'; },
    (r, a) => { r.find(n => n.key === 'period').ownText = 'SEP 2027'; },
    (r, a) => { r.find(n => n.key === 'period').attributes['aria-live'] = 'off'; },
    (r, a) => { r.find(n => n.key === 'table').attributes.role = 'presentation'; },
    (r, a) => { r.find(n => n.key === 'month').type = 'mat-multi-year-view'; },
    (r, a) => { r.find(n => n.key === 'day-label').parent = 'cell'; },
    (r, a) => { r.push({ ...r.find(n => n.key === 'day'), key: 'duplicate-day' }); },
    (r, a) => { r.push({ ...r.find(n => n.key === 'day-label'), key: 'nested', parent: 'day-label' }); },
    (r, a) => { a.find(n => n.key === 'ast-period').authored.value = 'OCT 2026 ▾'; },
    (r, a) => { a.find(n => n.key === 'ast-marker').authored.textContent = 'OCT'; },
    (r, a) => { a.find(n => n.key === 'ast-grid').parent = null; },
    (r, a) => { a.find(n => n.key === 'ast-popup').authored.role = 'group'; },
    (r, a) => { a[0].authored.ariaLabel = '2'; },
    (r, a) => { a[0].paintedControlText.text = '2'; },
    (r, a) => { a[0].paintedControlText.source = 'plugin-guess'; },
    (r, a) => { a.push({ ...a[0], key: 'duplicate-ast' }); },
  ];
  for (const [index, mutate] of mutations.entries()) {
    const raw = calendarDayTypographyReport(), trees = raw.results[0].inputTrees;
    mutate(trees.reference.nodes, trees.astylar.nodes);
    const result = controlEvidence(raw);
    assert.equal(result.comparisons.length, 0, `mutation ${index}`);
    assert.ok(result.gaps.length > 0, `mutation ${index} must remain visible`);
  }
});

test('calendar date correspondence handles month length and leap years without a frozen current date', () => {
  for (const [month, day, year, valid] of [['January', 31, 2027, true], ['February', 29, 2028, true],
    ['February', 29, 2027, false], ['April', 31, 2027, false]]) {
    const raw = calendarDayTypographyReport(), { reference: ref, astylar: ast } = raw.results[0].inputTrees;
    const label = String(day), period = `${month.slice(0, 3).toUpperCase()} ${year}`;
    ref.nodes.find(n => n.key === 'day').attributes['aria-label'] = `${month} ${day}, ${year}`;
    ref.nodes.find(n => n.key === 'day-label').ownText = label;
    ref.nodes.find(n => n.key === 'period').ownText = period;
    Object.assign(ast.nodes[0].authored, { id: `datepicker-day-${day}`, ariaLabel: label, value: label });
    ast.nodes[0].paintedControlText.text = label;
    ast.nodes.find(n => n.key === 'ast-period').authored.value = `${period} ▾`;
    ast.nodes.find(n => n.key === 'ast-marker').authored.textContent = period.slice(0, 3);
    assert.equal(controlEvidence(raw).comparisons.length, valid ? 1 : 0, `${month} ${day}, ${year}`);
  }
});

test('calendar correspondence evidence is revalidated even when partial audit coverage is allowed', () => {
  const raw = calendarDayTypographyReport(), audit = buildMaterialInputAudit(raw);
  assert.ok(!validateMaterialInputAudit(audit, { requireComplete: false }).some(error => error.includes('calendar cell mappings')));
  for (const mutate of [
    report => { report.controlTypography.comparisons[0].mapping.reviewEvidence.period = 'OCT 2026'; },
    report => { report.controlTypography.comparisons[0].referenceControl = 'other'; },
    report => { report.controlTypography.comparisons[0].text = '2'; },
    report => { report.controlTypography.comparisons[0].revision += 1; },
    report => { report.controlTypography.comparisons[0].finalRasterVerified = true; },
  ]) {
    const changed = structuredClone(audit); mutate(changed);
    assert.ok(validateMaterialInputAudit(changed, { requireComplete: false }).some(error => error.includes('calendar cell mappings')));
  }
});

function calendarDayTypographyAttributionReport() {
  const raw = calendarDayTypographyReport(), { reference: ref, astylar: ast } = raw.results[0].inputTrees;
  Object.assign(ref.styles[0], { fontFamily: 'Roboto', fontSize: '14px', lineHeight: '14px', color: '#1d1b1e' });
  ref.rules = [
    { active: true, selector: '.mat-calendar-body-cell', declarations: {
      'font-family': { value: 'var(--mat-datepicker-calendar-text-font, var(--mat-sys-body-medium-font))' } } },
    { active: true, selector: '.mat-calendar-body-cell-content', declarations: {
      'line-height': { value: '1' }, color: { value: 'var(--mat-datepicker-calendar-date-text-color, var(--mat-sys-on-surface))' } } },
  ];
  ref.nodes.find(n => n.key === 'day').rules = [0];
  ref.nodes.find(n => n.key === 'day-label').rules = [1];
  ast.nodes.find(n => n.key === 'ast-popup').parent = 'page';
  ast.nodes.push({ key: 'page', parent: 'root', authored: { type: 'main', id: 'page' },
    resolvedStyle: {}, normalResolvedStyle: {}, interactionResolvedStyle: {} });
  const day = ast.nodes[0];
  for (const style of [day.normalResolvedStyle, day.interactionResolvedStyle]) {
    Object.assign(style, { fontFamily: 'Roboto, Arial, sans-serif', fontSize: '14px', color: '#1d1b20' });
    delete style.lineHeight;
  }
  Object.assign(day.paintedControlText.style, { fontFamily: 'Roboto, Arial, sans-serif', fontSize: 14, lineHeight: 17 / 14, color: '#1d1b20' });
  ast.rules = [
    { selector: 'button, input, select', fontFamily: 'Roboto, Arial, sans-serif' },
    { selector: '.datepicker-cell', fontSize: '14px', color: '#1d1b20' },
    { selector: '.datepicker-day', padding: '0' },
  ];
  return raw;
}

function calendarYearTypographyReport() {
  const raw = calendarDayTypographyReport(), { reference: ref, astylar: ast } = raw.results[0].inputTrees;
  ref.nodes.find(n => n.key === 'month').type = 'mat-multi-year-view';
  ref.nodes.find(n => n.key === 'period').ownText = '2016 to 2039';
  ref.nodes.find(n => n.key === 'day').attributes['aria-label'] = '2016';
  ref.nodes.find(n => n.key === 'day-label').ownText = ' 2016 ';
  Object.assign(ast.nodes[0].authored, { id: 'datepicker-year-2016', class: 'datepicker-year', value: '2016' });
  delete ast.nodes[0].authored.ariaLabel;
  ast.nodes[0].paintedControlText.text = '2016';
  Object.assign(ast.nodes.find(n => n.key === 'ast-grid').authored, { id: 'datepicker-year-grid', class: 'datepicker-year-grid' });
  Object.assign(ast.nodes.find(n => n.key === 'ast-period').authored, { ariaLabel: 'Choose date', value: '2016 – 2039 ▴' });
  ast.nodes = ast.nodes.filter(n => n.key !== 'ast-marker');
  return raw;
}

test('calendar year labels require matching range context and multi-year table ancestry', () => {
  const raw = calendarYearTypographyReport(), before = structuredClone(raw), report = buildMaterialInputAudit(raw);
  assert.equal(report.controlTypography.comparisons.length, 1);
  const comparison = report.controlTypography.comparisons[0];
  assert.equal(comparison.mapping.kind, 'reviewed-material-calendar-year-label');
  assert.equal(comparison.mapping.reviewEvidence.accessibleYear, '2016');
  assert.equal(comparison.mapping.reviewEvidence.period, '2016 to 2039');
  assert.equal(comparison.element, 'datepicker-year-2016');
  assert.equal(report.retainedTypography.controlTextMappings.length, 1);
  assert.equal(report.retainedTypography.controlTextMappings[0].inputEquivalent, false);
  assert.ok(!validateMaterialInputAudit(report, { requireComplete: false }).some(error => error.includes('calendar cell mappings')));
  assert.deepEqual(raw, before);
  comparison.mapping.reviewEvidence.period = '2017 to 2040';
  assert.ok(validateMaterialInputAudit(report, { requireComplete: false }).some(error => error.includes('calendar cell mappings')));
  raw.results[0].inputTrees.astylar.nodes[0].paintedControlText.style.fontSize = 30;
  assert.ok(controlEvidence(raw).differences.some(d => d.property === 'fontSize' && d.attribution === 'unresolved'));
});

test('calendar year mappings reject false range correspondence, day views and ambiguous controls', () => {
  const mutations = [
    (r, a) => { r.nodes.find(n => n.key === 'period').ownText = '2016 to 2040'; },
    (r, a) => { r.nodes.find(n => n.key === 'period').ownText = '2017 to 2040'; },
    (r, a) => { a.nodes.find(n => n.key === 'ast-period').authored.value = '2017 – 2040 ▴'; },
    (r, a) => { r.nodes.find(n => n.key === 'day').attributes['aria-label'] = '2017'; },
    (r, a) => { r.nodes.find(n => n.key === 'month').type = 'mat-month-view'; },
    (r, a) => { r.nodes.find(n => n.key === 'day-label').parent = 'row'; },
    (r, a) => { a.nodes.find(n => n.key === 'ast-grid').parent = null; },
    (r, a) => { a.nodes.find(n => n.key === 'ast-period').authored.ariaLabel = 'Choose month and year'; },
    (r, a) => { a.nodes[0].authored.class = 'datepicker-day'; },
    (r, a) => { a.nodes.push({ ...a.nodes[0], key: 'another' }); },
    (r, a) => { r.nodes.push({ ...r.nodes.find(n => n.key === 'day'), key: 'another' }); },
    (r, a) => { a.nodes[0].paintedControlText.text = '2017'; },
  ];
  for (const mutate of mutations) {
    const raw = calendarYearTypographyReport(), trees = raw.results[0].inputTrees;
    mutate(trees.reference, trees.astylar);
    const result = controlEvidence(raw);
    assert.equal(result.comparisons.length, 0, String(mutate));
    assert.ok(result.gaps.length > 0);
  }
});

function calendarYearTypographyAttributionReport() {
  const raw = calendarDayTypographyAttributionReport(), trees = raw.results[0].inputTrees;
  const year = calendarYearTypographyReport().results[0].inputTrees;
  trees.reference.nodes = year.reference.nodes;
  trees.reference.nodes.find(n => n.key === 'day').rules = [0];
  trees.reference.nodes.find(n => n.key === 'day-label').rules = [1];
  const day = trees.astylar.nodes[0], page = trees.astylar.nodes.at(-1);
  day.authored = year.astylar.nodes[0].authored;
  day.paintedControlText.text = '2016';
  trees.astylar.nodes = [day, ...year.astylar.nodes.slice(1), page];
  trees.astylar.nodes.find(n => n.key === 'ast-popup').parent = 'page';
  trees.astylar.rules = [trees.astylar.rules[0], { selector: '.datepicker-year', fontSize: '14px', color: '#1d1b20' }];
  return raw;
}

test('calendar year typography uses its own captured component declarations, not day attribution', () => {
  const raw = calendarYearTypographyAttributionReport(), report = buildMaterialInputAudit(raw);
  assert.equal(report.controlTypography.comparisons[0].mapping.kind, 'reviewed-material-calendar-year-label');
  const differences = report.controlTypography.differences;
  assert.equal(differences.length, 3);
  assert.ok(differences.every(d => d.attribution === 'reviewed-calendar-year-typography-input' &&
    d.reviewEvidence.sourceFinding === 'fixture-calendar-year-typography-substitution' &&
    d.reviewEvidence.candidateCellRule.selector === '.datepicker-year'));
  assert.equal(report.summary.inputEquivalent, false);
  assert.ok(!validateMaterialInputAudit(report).some(error => error.includes('control texture typography differences')));
  for (const [property, mutate] of [
    ['fontFamily', (r, a) => { a.rules[1].fontFamily = 'Roboto'; }],
    ['fontFamily', (r, a) => { r.rules[0].active = false; }],
    ['lineHeight', (r, a) => { a.nodes.at(-1).normalResolvedStyle.lineHeight = 'normal'; }],
    ['lineHeight', (r, a) => { r.rules[1].declarations['line-height'].value = 'normal'; }],
    ['color', (r, a) => { a.rules[1].color = '#abcdef'; }],
    ['color', (r, a) => { a.nodes[0].paintedControlText.style.color = '#abcdef'; }],
  ]) {
    const altered = calendarYearTypographyAttributionReport(), trees = altered.results[0].inputTrees;
    mutate(trees.reference, trees.astylar);
    assert.equal(controlEvidence(altered).differences.find(d => d.property === property)?.attribution, 'unresolved', String(mutate));
  }
});

function calendarNavigationReport(direction = 'previous', yearView = false) {
  const raw = yearView ? calendarYearTypographyReport() : calendarDayTypographyReport();
  const { reference: ref, astylar: ast } = raw.results[0].inputTrees;
  const glyph = direction === 'previous' ? '‹' : '›';
  const label = direction === 'previous' ? 'Previous month' : 'Next month';
  const path = direction === 'previous' ? 'M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z' : 'M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z';
  const node = (key, parent, type, attributes) => ({ key, parent, type, attributes, ownText: '', style: 0, rules: [], pseudoElements: [] });
  ref.nodes.push(
    node('nav', 'controls', 'button', { class: `mat-calendar-${direction}-button`, 'aria-label': yearView ? label.replace('month', '24 years') : label }),
    node('nav-svg', 'nav', 'svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' }),
    node('nav-path', 'nav-svg', 'path', { d: path }),
  );
  const candidate = structuredClone(ast.nodes[0]);
  Object.assign(candidate, { key: 'ast-nav', parent: 'ast-header',
    authored: { id: `datepicker-${direction}`, type: 'button', class: `datepicker-nav datepicker-${direction}`, ariaLabel: label, value: glyph } });
  candidate.paintedControlText.text = glyph;
  ast.nodes.push(candidate);
  return raw;
}

function calendarWeekdayReport() {
  const raw = calendarDayTypographyReport(), { reference: ref, astylar: ast } = raw.results[0].inputTrees;
  ref.styles[0] = { ...ref.styles[0], fontFamily: 'Roboto', fontSize: '14px', fontWeight: '500',
    lineHeight: 'normal', letterSpacing: 'normal', color: '#49454e', textAlign: 'center' };
  const node = (key, parent, type, attributes = {}, ownText = '') => ({ key, parent, type, attributes, ownText,
    style: 0, rules: [], pseudoElements: [] });
  const headers = [node('weekday-head', 'table', 'thead', { class: 'mat-calendar-table-header' }),
    node('weekday-row', 'weekday-head', 'tr'), node('divider-row', 'weekday-head', 'tr', { 'aria-hidden': 'true' }),
    node('divider', 'divider-row', 'th', { class: 'mat-calendar-table-header-divider', colspan: '7' })];
  ref.rules = [{ selector: '.mat-calendar', active: true,
    declarations: { 'font-family': { value: 'var(--mat-datepicker-calendar-text-font, var(--mat-sys-body-medium-font))' } } },
  { selector: '.mat-calendar-table-header th', active: true,
    declarations: { color: { value: 'var(--mat-datepicker-calendar-header-text-color, var(--mat-sys-on-surface-variant))' } } }];
  ref.nodes.find(n => n.key === 'calendar').rules = [0];
  const weekdays = [];
  for (const [index, [long, short]] of [['Sunday', 'S'], ['Monday', 'M'], ['Tuesday', 'T'], ['Wednesday', 'W'],
    ['Thursday', 'T'], ['Friday', 'F'], ['Saturday', 'S']].entries()) {
    headers.push({ ...node(`weekday-${index}`, 'weekday-row', 'th', { scope: 'col' }), rules: [1] },
      node(`full-${index}`, `weekday-${index}`, 'span', { class: 'cdk-visually-hidden' }, long),
      node(`narrow-${index}`, `weekday-${index}`, 'span', { 'aria-hidden': 'true' }, short));
    const style = { fontSize: '14px', fontWeight: '500', color: '#1d1b20', textAlign: 'center' };
    weekdays.push({ key: `ast-weekday-${index}`, parent: 'ast-grid',
      authored: { type: 'span', id: `datepicker-weekday-${index}`, class: 'datepicker-cell datepicker-weekday', textContent: short },
      resolvedStyle: { ...style }, normalResolvedStyle: { ...style }, interactionResolvedStyle: { ...style },
      retainedText: { source: 'core-text-registry', style: { ...ref.styles[0], fontFamily: 'Roboto, Arial, sans-serif',
        letterSpacing: '0px', color: '#1d1b20' } } });
  }
  ref.nodes.splice(ref.nodes.findIndex(n => n.key === 'body'), 0, ...headers);
  ast.nodes.unshift(...weekdays);
  ast.nodes.find(n => n.key === 'ast-popup').parent = 'page';
  ast.nodes.push({ key: 'page', parent: 'root', authored: { type: 'main', id: 'page' }, resolvedStyle: {},
    normalResolvedStyle: { fontFamily: 'Roboto, Arial, sans-serif' }, interactionResolvedStyle: { fontFamily: 'Roboto, Arial, sans-serif' } });
  ast.rules = [{ selector: '#page', fontFamily: 'Roboto, Arial, sans-serif' },
    { selector: '.datepicker-cell', color: '#1d1b20', fontSize: '14px', fontWeight: '400' },
    { selector: '.datepicker-weekday, .datepicker-month-marker', fontWeight: '500' }];
  return raw;
}

const weekdayEvidence = raw => collectRetainedTypographyEvidence(raw.results, collectFullTreeInventory(raw.results));

function calendarMonthMarkerReport(year = 2026, month = 8) {
  const raw = calendarWeekdayReport(), { reference: ref, astylar: ast } = raw.results[0].inputTrees;
  const names = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const label = names[month].slice(0, 3).toUpperCase(), leading = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate(), trailing = (7 - (leading + days) % 7) % 7;
  const sourceDay = structuredClone(ast.nodes.find(n => n.key === 'ast-day'));
  const sourceText = structuredClone(ast.nodes.find(n => n.key === 'ast-weekday-0'));
  ref.nodes = ref.nodes.filter(n => !['row', 'cell', 'day', 'day-label'].includes(n.key));
  ast.nodes = ast.nodes.filter(n => n.parent !== 'ast-grid' || n.authored.id.startsWith('datepicker-weekday-'));
  ref.nodes.find(n => n.key === 'period').ownText = `${label} ${year}`;
  ast.nodes.find(n => n.key === 'ast-period').authored.value = `${label} ${year} ▾`;
  const node = (key, parent, type, attributes = {}, ownText = '') => ({ key, parent, type, attributes, ownText,
    style: 0, rules: [], pseudoElements: [] });
  if (leading < 3) ref.nodes.push(node('label-row', 'body', 'tr', { 'aria-hidden': 'true' }),
    node('month-label', 'label-row', 'td', { class: 'mat-calendar-body-label', colspan: '7' }, ` ${label} `));
  let day = 1;
  for (let week = 0; day <= days; week++) {
    const row = `week-${week}`;
    ref.nodes.push(node(row, 'body', 'tr', { role: 'row' }));
    if (week === 0 && leading) ref.nodes.push(node('leading-label', row, 'td',
      { class: 'mat-calendar-body-label', colspan: String(leading) }, leading < 3 ? ' ' : label));
    for (let column = 0; column < 7 - (week === 0 ? leading : 0) && day <= days; column++, day++) {
      ref.nodes.push(node(`cell-${day}`, row, 'td', { class: 'mat-calendar-body-cell-container', role: 'gridcell',
        'data-mat-row': String(week), 'data-mat-col': String(column) }),
      node(`day-${day}`, `cell-${day}`, 'button', { class: 'mat-calendar-body-cell', 'aria-label': `${names[month]} ${day}, ${year}` }),
      node(`day-label-${day}`, `day-${day}`, 'span', { class: 'mat-calendar-body-cell-content' }, ` ${day} `));
    }
  }
  ref.styles.push({ ...ref.styles[0], lineHeight: '0px', textAlign: 'start', color: '#1d1b1e' });
  for (const n of ref.nodes.filter(n => n.type === 'td' && n.attributes.class === 'mat-calendar-body-label')) n.style = ref.styles.length - 1;
  ast.nodes.push({ ...sourceText, key: 'ast-marker', authored: { type: 'span', id: 'datepicker-month-marker',
    class: 'datepicker-cell datepicker-month-marker', textContent: label } });
  for (const [kind, count] of [['leading', leading], ['day', days], ['trailing', trailing]]) {
    for (let i = 0; i < count; i++) {
      const isDay = kind === 'day', key = `ast-${kind}-${i}`;
      const n = structuredClone(isDay ? sourceDay : sourceText);
      Object.assign(n, { key, parent: 'ast-grid', authored: isDay
        ? { type: 'button', id: `datepicker-day-${i + 1}`, class: 'datepicker-cell datepicker-day', ariaLabel: String(i + 1), value: String(i + 1) }
        : { type: 'span', id: `datepicker-${kind}-${i}`, class: 'datepicker-cell', textContent: '' } });
      if (isDay) n.paintedControlText.text = String(i + 1);
      ast.nodes.push(n);
    }
  }
  return raw;
}

test('calendar month marker maps complete conditional table rows without accepting the replacement grid', () => {
  const offsets = new Set();
  for (const [year, month] of [...Array.from({ length: 12 }, (_, i) => [2026, i]), [2024, 1]]) {
    const raw = calendarMonthMarkerReport(year, month), before = structuredClone(raw);
    const evidence = weekdayEvidence(raw), maps = evidence.reviewedMappings.filter(m => m.kind === 'reviewed-calendar-month-marker-text');
    assert.equal(maps.length, 1, `${year}-${month + 1}`);
    const m = maps[0], detail = m.reviewEvidence; offsets.add(detail.leading);
    assert.equal(detail.referencePlacement, detail.leading < 3 ? 'separate-label-row' : 'first-week-leading-cell');
    assert.equal(detail.referenceLabelColspan, detail.leading < 3 ? 7 : detail.leading);
    assert.equal(detail.days, new Date(Date.UTC(year, month + 1, 0)).getUTCDate());
    assert.equal(detail.referenceRows.length, Math.ceil((detail.leading + detail.days) / 7) + Number(detail.leading < 3));
    assert.equal(detail.candidateGridChildren.length, 8 + detail.leading + detail.days + detail.trailing);
    assert.equal(m.classification, 'application-plugin-authoring-defect');
    assert.equal(m.inputEquivalent, false); assert.equal(detail.finalRasterVerified, false);
    assert.ok(evidence.comparisons.some(c => c.element === m.element && c.properties.lineHeight.reference === '0'));
    assert.ok(evidence.differences.some(d => d.element === m.element && d.property === 'lineHeight' && d.attribution === 'unresolved'));
    assert.ok(!evidence.gaps.some(g => g.element === m.element));
    assert.deepEqual(raw, before);
  }
  assert.deepEqual([...offsets].sort(), [0, 1, 2, 3, 4, 5, 6]);
});

test('calendar month marker refuses incomplete dates changed spans or reordered replacement cells', () => {
  for (const mutate of [
    r => { r.nodes.find(n => n.key === 'month-label').attributes.colspan = '2'; },
    r => { r.nodes.find(n => n.key === 'month-label').ownText = 'OCT'; },
    r => { r.nodes.find(n => n.key === 'label-row').attributes['aria-hidden'] = 'false'; },
    r => { r.nodes.find(n => n.key === 'leading-label').ownText = 'SEP'; },
    r => { r.nodes.find(n => n.key === 'leading-label').attributes.colspan = '3'; },
    r => { r.nodes.find(n => n.key === 'day-30').attributes['aria-label'] = 'October 30, 2026'; },
    r => { r.nodes.find(n => n.key === 'cell-8').attributes['data-mat-col'] = '6'; },
    r => { r.nodes = r.nodes.filter(n => n.key !== 'day-label-30'); },
    r => { r.nodes.find(n => n.key === 'cell-8').parent = 'week-0'; },
    r => { r.nodes.push({ ...r.nodes.find(n => n.key === 'month-label') }); },
    r => { r.nodes.find(n => n.key === 'period').ownText = 'AUG 2026'; },
    r => { r.nodes.find(n => n.key === 'full-0').ownText = 'Saturday'; },
    (_r, a) => { a.nodes.find(n => n.key === 'ast-marker').parent = 'ast-popup'; },
    (_r, a) => { a.nodes.find(n => n.key === 'ast-marker').authored.role = 'gridcell'; },
    (_r, a) => { a.nodes.find(n => n.key === 'ast-marker').authored.textContent = 'OCT'; },
    (_r, a) => { a.nodes = a.nodes.filter(n => n.authored?.id !== 'datepicker-trailing-0'); },
    (_r, a) => { a.nodes.find(n => n.authored?.id === 'datepicker-leading-0').authored.textContent = ' '; },
    (_r, a) => { a.nodes.find(n => n.authored?.id === 'datepicker-day-30').authored.value = '31'; },
    (_r, a) => { const i = a.nodes.findIndex(n => n.key === 'ast-marker'); [a.nodes[i], a.nodes[i + 1]] = [a.nodes[i + 1], a.nodes[i]]; },
  ]) {
    const raw = calendarMonthMarkerReport(), t = raw.results[0].inputTrees; mutate(t.reference, t.astylar);
    assert.equal(weekdayEvidence(raw).reviewedMappings.filter(m => m.kind === 'reviewed-calendar-month-marker-text').length, 0, String(mutate));
  }
});

test('calendar month marker source witnesses retain conditional table spans and unconditional candidate row', async () => {
  const { readFileSync } = await import('node:fs');
  const reference = readFileSync('examples/material-showcase/node_modules/@angular/material/fesm2022/datepicker.mjs', 'utf8');
  const candidate = readFileSync('examples/material-showcase/src/app/astylar.component.ts', 'utf8');
  const template = type => {
    const start = reference.indexOf(`type: ${type},`);
    assert.ok(start >= 0);
    const match = /template: ("(?:\\.|[^"\\])*")/.exec(reference.slice(start));
    assert.ok(match); return JSON.parse(match[1]);
  };
  const body = template('MatCalendarBody'), month = template('MatMonthView');
  assert.ok(month.includes('[labelMinRequiredCells]="3"'));
  assert.match(body, /@if \(_firstRowOffset < labelMinRequiredCells\)\s*\{/);
  assert.ok(body.includes('[attr.colspan]="numCols"'));
  assert.match(body, /@if \(rowIndex === 0 && _firstRowOffset\)\s*\{/);
  assert.ok(body.includes('[attr.colspan]="_firstRowOffset"'));
  assert.ok(body.includes("{{_firstRowOffset >= labelMinRequiredCells ? label : ''}}"));
  assert.match(candidate, /selector: '\.datepicker-month-marker', gridColumn: '1 \/ -1'/);
  assert.match(candidate, /function materialSelectedDayRow\(\): number \{\s*return 2 \+ Math\.floor\(\(materialCalendarLeadingDays\(\) \+ materialCurrentDay\(\) - 1\) \/ 7\);\s*\}/);
  const report = buildMaterialInputAudit(calendarMonthMarkerReport());
  assert.equal(report.sourceFindings.find(f => f.id === 'fixture-calendar-month-marker-table-grid-substitution')?.detected, true);
  assert.equal(report.summary.inputEquivalent, false);
});

test('calendar month marker validation rejects deleted and forged correspondence or typography', () => {
  for (const mutate of [
    t => { t.reviewedMappings = t.reviewedMappings.filter(m => m.kind !== 'reviewed-calendar-month-marker-text'); },
    t => { t.reviewedMappings.push(structuredClone(t.reviewedMappings.find(m => m.kind === 'reviewed-calendar-month-marker-text'))); },
    t => { t.reviewedMappings.find(m => m.kind === 'reviewed-calendar-month-marker-text').inputEquivalent = true; },
    t => { t.reviewedMappings.find(m => m.kind === 'reviewed-calendar-month-marker-text').reviewEvidence.referenceLabelColspan = 2; },
    t => { t.comparisons = t.comparisons.filter(c => c.element !== 'datepicker-month-marker'); },
    t => { t.comparisons.find(c => c.element === 'datepicker-month-marker').revision++; },
    t => { t.differences = t.differences.filter(d => d.element !== 'datepicker-month-marker'); },
    t => { t.differences.find(d => d.element === 'datepicker-month-marker').attribution = 'equivalent'; },
  ]) {
    const report = buildMaterialInputAudit(calendarMonthMarkerReport());
    assert.ok(!validateMaterialInputAudit(report, { requireComplete: false }).some(e => e.includes('calendar month marker')));
    mutate(report.retainedTypography);
    assert.ok(validateMaterialInputAudit(report, { requireComplete: false }).some(e => e.includes('calendar month marker')), String(mutate));
  }
});

function calendarMonthMarkerTypographyReport() {
  const raw = calendarMonthMarkerReport(), { reference: ref, astylar: ast } = raw.results[0].inputTrees;
  const declarations = { height: '0px', 'line-height': '0', 'text-align': 'start',
    color: 'var(--mat-datepicker-calendar-body-label-text-color, var(--mat-sys-on-surface))' };
  ref.rules.push({ selector: '.mat-calendar-body-label', active: true, conditions: [],
    declarations: Object.fromEntries(Object.entries(declarations).map(([key, value]) => [key, { value, important: false }])) });
  for (const n of ref.nodes.filter(n => n.type === 'td' && n.attributes.class === 'mat-calendar-body-label')) n.rules = [ref.rules.length - 1];
  ast.rules.find(r => r.selector === '.datepicker-cell').textAlign = 'center';
  return raw;
}

const monthTypography = raw => weekdayEvidence(raw).differences.filter(d => d.element === 'datepicker-month-marker');

test('calendar month marker typography traces omitted zero line-height and authored alignment and ink', () => {
  const raw = calendarMonthMarkerTypographyReport(), before = structuredClone(raw), ds = monthTypography(raw);
  const reviewed = ds.filter(d => d.attribution === 'reviewed-calendar-month-marker-typography-input');
  assert.deepEqual(reviewed.map(d => d.property), ['lineHeight', 'textAlign', 'color']);
  assert.ok(reviewed.every(d => d.classification === 'application-plugin-authoring-defect' && d.inputEquivalent === false &&
    d.currentPseudoStatePaintVerified === false && d.reviewEvidence.finalRasterVerified === false));
  const line = reviewed[0];
  assert.equal(line.values.reference, '0'); assert.equal(line.values.retained, 'normal');
  assert.equal(line.values.normal, undefined); assert.equal(line.values.effective, undefined);
  assert.equal(line.reviewEvidence.candidateChain.at(-1).node, 'page');
  assert.equal(line.reviewEvidence.referenceRule.declarations['line-height'].value, '0');
  assert.equal(reviewed[1].reviewEvidence.candidateRule.textAlign, 'center');
  assert.equal(reviewed[2].reviewEvidence.candidateRule.color, '#1d1b20');
  assert.ok(reviewed[2].reviewEvidence.referenceRule.declarations.color.value.startsWith('var(--mat-datepicker-calendar-body-label-text-color'));
  assert.deepEqual(raw, before);
  const report = buildMaterialInputAudit(raw);
  assert.equal(report.sourceFindings.find(f => f.id === 'fixture-calendar-month-marker-typography-substitution')?.detected, true);
  assert.ok(!validateMaterialInputAudit(report, { requireComplete: false }).some(e => e.includes('calendar month marker')));
});

test('calendar month marker typography rejects conflicting declarations missing ancestry and changed stages', () => {
  const cases = [
    ['lineHeight', r => { r.rules.at(-1).active = false; }],
    ['lineHeight', r => { r.rules.at(-1).selector = '.other'; }],
    ['lineHeight', r => { r.rules.at(-1).declarations['line-height'].important = true; }],
    ['lineHeight', r => { r.rules.at(-1).conditions = ['media screen']; }],
    ['lineHeight', r => { r.rules.at(-1).declarations['line-height'].value = 'normal'; }],
    ['textAlign', r => { r.rules.at(-1).declarations['text-align'].value = 'left'; }],
    ['color', r => { r.rules.at(-1).declarations.color.value = '#1d1b1e'; }],
    ['color', r => { r.rules.at(-1).declarations.all = { value: 'initial', important: false }; }],
    ['lineHeight', r => { r.nodes.find(n => n.key === 'month-label').inline = { 'line-height': { value: '0' } }; }],
    ['textAlign', r => { r.nodes.find(n => n.key === 'month-label').attributes.style = 'text-align:start'; }],
    ['color', r => { r.rules.push({ selector: 'td', active: true, declarations: { color: { value: 'red' } } }); r.nodes.find(n => n.key === 'month-label').rules.push(r.rules.length - 1); }],
    ['lineHeight', (_r, a) => { a.nodes.find(n => n.key === 'ast-grid').parent = 'missing'; }],
    ['lineHeight', (_r, a) => { a.nodes.find(n => n.key === 'page').normalResolvedStyle.lineHeight = 'normal'; }],
    ['lineHeight', (_r, a) => { a.nodes.find(n => n.key === 'ast-popup').interactionResolvedStyle.lineHeight = '0'; }],
    ['lineHeight', (_r, a) => { a.nodes.find(n => n.key === 'ast-marker').authored.style = { lineHeight: '0' }; }],
    ['color', (_r, a) => { a.nodes.find(n => n.key === 'ast-marker').authored.style = 'color:red'; }],
    ['textAlign', (_r, a) => { a.rules.find(r => r.selector === '.datepicker-cell').textAlign = 'left'; }],
    ['color', (_r, a) => { a.rules.find(r => r.selector === '.datepicker-cell').color = 'red'; }],
    ['color', (_r, a) => { a.rules.find(r => r.selector === '.datepicker-cell').all = 'initial'; }],
    ['textAlign', (_r, a) => { a.rules.push({ ...a.rules.find(r => r.selector === '.datepicker-cell') }); }],
    ['lineHeight', (_r, a) => { a.rules.push({ selector: '.datepicker-popup .datepicker-month-marker', lineHeight: '0' }); }],
    ['lineHeight', (_r, a) => { a.rules.push({ selector: '.datepicker-month-marker:hover', lineHeight: '0' }); }],
    ['color', (_r, a) => { a.rules.push({ selector: '.unrelated > .datepicker-cell', color: 'red', minWidth: '9000px' }); }],
    ['color', (_r, a) => { a.rules.push({ selector: ':is(.unrelated)', color: 'red' }); }],
    ['lineHeight', (_r, a) => { a.rules.push({ selector: '*', font: '14px Roboto' }); }],
    ['lineHeight', (_r, a) => { a.rules.push({ selector: '#page', animationName: 'unknown' }); }],
    ['color', (_r, a) => { a.rules.push({ selector: '', color: 'red' }); }],
  ];
  for (const property of ['lineHeight', 'textAlign', 'color']) for (const stage of ['normalResolvedStyle', 'interactionResolvedStyle', 'retainedText']) {
    cases.push([property, (_r, a) => {
      const n = a.nodes.find(n => n.key === 'ast-marker'), style = stage === 'retainedText' ? n.retainedText.style : n[stage];
      style[property] = property === 'color' ? 'red' : property === 'textAlign' ? 'right' : '20px';
    }]);
  }
  for (const [property, mutate] of cases) {
    const raw = calendarMonthMarkerTypographyReport(), t = raw.results[0].inputTrees; mutate(t.reference, t.astylar);
    assert.ok(!monthTypography(raw).some(d => d.property === property && d.attribution === 'reviewed-calendar-month-marker-typography-input'), `${property}: ${mutate}`);
  }
});

test('calendar month marker typography excludes only definitely unrelated rule targets', () => {
  const raw = calendarMonthMarkerTypographyReport(), ast = raw.results[0].inputTrees.astylar;
  for (const selector of ['.unrelated > .other:hover', '#other + .other', '.datepicker-popup .other', '.other ~ p', 'button:focus, .other']) {
    ast.rules.push({ selector, lineHeight: '0', color: 'red', textAlign: 'right' });
  }
  assert.equal(monthTypography(raw).filter(d => d.attribution === 'reviewed-calendar-month-marker-typography-input').length, 3);
});

test('calendar month marker typography replay rejects forged scope rules and stage evidence', () => {
  for (const mutate of [
    d => { d.classification = 'equivalent-representation'; },
    d => { d.element = 'unrelated'; },
    d => { d.case = 'interaction:timepicker@light/desktop-dpr1/open'; },
    d => { d.reviewEvidence.referenceRule.declarations['line-height'].value = 'normal'; },
    d => { d.reviewEvidence.candidateChain.pop(); },
    d => { d.reviewEvidence.checkedCandidateRules.push({ selector: '*', lineHeight: '0' }); },
    d => { d.values.normal = '0'; },
    d => { d.reviewEvidence.finalRasterVerified = true; },
  ]) {
    const report = buildMaterialInputAudit(calendarMonthMarkerTypographyReport());
    mutate(report.retainedTypography.differences.find(d => d.element === 'datepicker-month-marker' && d.property === 'lineHeight'));
    assert.ok(validateMaterialInputAudit(report, { requireComplete: false }).some(e => e.includes('calendar month marker')), String(mutate));
  }
});

test('calendar weekday audit preserves seven ordered abbreviations and seven omitted full names', () => {
  const raw = calendarWeekdayReport(), before = structuredClone(raw), evidence = weekdayEvidence(raw);
  const maps = evidence.reviewedMappings.filter(m => m.kind === 'reviewed-calendar-weekday-text');
  assert.equal(maps.length, 7);
  assert.deepEqual(maps.map(m => m.reviewEvidence.fullName), ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']);
  assert.equal(maps[2].reviewEvidence.narrowText, maps[4].reviewEvidence.narrowText);
  assert.notEqual(maps[2].referenceNode, maps[4].referenceNode);
  assert.equal(evidence.gaps.filter(g => g.attribution === 'reviewed-calendar-weekday-name-omission').length, 7);
  assert.ok(maps.every(m => m.inputEquivalent === false && m.reviewEvidence.finalRasterVerified === false &&
    m.reviewEvidence.computedClippingVerified === false));
  const differences = evidence.differences.filter(d => d.element.startsWith('datepicker-weekday-'));
  assert.equal(differences.length, 14);
  assert.equal(differences.filter(d => d.attribution === 'reviewed-calendar-weekday-typography-input').length, 14);
  assert.equal(differences.filter(d => d.property === 'letterSpacing').length, 0);
  const tracking = evidence.comparisons.filter(c => c.element.startsWith('datepicker-weekday-'));
  assert.equal(tracking.length, 7);
  assert.ok(tracking.every(c => c.properties.letterSpacing.reference === '0' && c.properties.letterSpacing.retained === '0'));
  assert.ok(!evidence.comparisons.some(c => c.text === 'Sunday'));
  assert.deepEqual(raw, before);
  const report = buildMaterialInputAudit(raw);
  assert.equal(report.summary.inputEquivalent, false);
  assert.ok(!validateMaterialInputAudit(report, { requireComplete: false }).some(e => e.includes('calendar weekday')));
});

test('calendar weekday mappings reject ambiguous initials, altered order and missing header context', () => {
  for (const mutate of [
    ref => { ref.nodes.find(n => n.key === 'full-2').ownText = 'Thursday'; },
    ref => { ref.nodes.find(n => n.key === 'narrow-2').ownText = 'Q'; },
    ref => { ref.nodes.find(n => n.key === 'weekday-0').attributes.scope = 'row'; },
    ref => { ref.nodes.find(n => n.key === 'narrow-0').attributes['aria-hidden'] = 'false'; },
    ref => { ref.nodes.find(n => n.key === 'full-0').attributes.class = 'unrelated'; },
    ref => { ref.nodes.find(n => n.key === 'full-0').parent = 'weekday-1'; },
    ref => { ref.nodes.find(n => n.key === 'divider').attributes.colspan = '6'; },
    ref => { ref.nodes.find(n => n.key === 'divider-row').attributes['aria-hidden'] = 'false'; },
    ref => { ref.nodes.find(n => n.key === 'weekday-head').parent = 'unrelated-table'; },
    ref => { ref.nodes.push({ ...ref.nodes.find(n => n.key === 'narrow-0') }); },
    ref => { ref.nodes.find(n => n.key === 'period').ownText = 'OCT 2026'; },
    (_ref, ast) => { ast.nodes[0].authored.textContent = 'Sunday'; },
    (_ref, ast) => { ast.nodes[0].authored.ariaLabel = 'Sunday'; },
    (_ref, ast) => { ast.nodes[0].authored.role = 'columnheader'; },
    (_ref, ast) => { ast.nodes[0].authored.ariaHidden = true; },
    (_ref, ast) => { [ast.nodes[2], ast.nodes[4]] = [ast.nodes[4], ast.nodes[2]]; },
    (_ref, ast) => { ast.nodes[0].parent = 'ast-popup'; },
    (_ref, ast) => { ast.nodes.push({ key: 'extra', parent: 'ast-weekday-0', authored: { type: 'span', textContent: 'S' } }); },
  ]) {
    const raw = calendarWeekdayReport(), t = raw.results[0].inputTrees;
    mutate(t.reference, t.astylar);
    assert.equal(weekdayEvidence(raw).reviewedMappings.filter(m => m.kind === 'reviewed-calendar-weekday-text').length, 0, String(mutate));
  }
});

test('calendar weekday typography requires original tokens, inheritance and retained input witnesses', () => {
  for (const [property, mutate] of [
    ['fontFamily', ref => { ref.rules[0].declarations['font-family'].value = 'Roboto'; }],
    ['fontFamily', ref => { ref.nodes.find(n => n.key === 'weekday-0').attributes.style = 'font-family:Roboto'; }],
    ['fontFamily', ref => { ref.styles.push({ ...ref.styles[0], fontFamily: 'Arial' }); ref.nodes.find(n => n.key === 'table').style = 1; }],
    ['fontFamily', (_ref, ast) => { ast.nodes.find(n => n.key === 'ast-grid').normalResolvedStyle.fontFamily = 'Roboto'; }],
    ['fontFamily', (_ref, ast) => { ast.nodes.find(n => n.key === 'page').interactionResolvedStyle.fontFamily = 'serif'; }],
    ['fontFamily', (_ref, ast) => { ast.rules.push({ ...ast.rules[0] }); }],
    ['fontFamily', (_ref, ast) => { ast.nodes[0].retainedText.style.fontFamily = 'Arial'; }],
    ['color', ref => { ref.rules[1].active = false; }],
    ['color', ref => { ref.rules[1].declarations.color.value = '#49454e'; }],
    ['color', ref => { ref.nodes.find(n => n.key === 'narrow-0').attributes.style = 'color:#49454e'; }],
    ['color', (_ref, ast) => { ast.rules[2].color = '#1d1b20'; }],
    ['color', (_ref, ast) => { ast.nodes[0].interactionResolvedStyle.color = 'red'; }],
    ['color', (_ref, ast) => { ast.nodes[0].retainedText.style.color = 'red'; }],
    ['color', (_ref, ast) => { ast.rules.push({ ...ast.rules[1] }); }],
  ]) {
    const raw = calendarWeekdayReport(), t = raw.results[0].inputTrees;
    mutate(t.reference, t.astylar);
    assert.equal(weekdayEvidence(raw).differences.find(d => d.element === 'datepicker-weekday-0' && d.property === property)?.attribution,
      'unresolved', `${property}: ${mutate}`);
  }
});

test('calendar weekday validation replays mapping, omissions and typography and rejects deleted evidence', () => {
  for (const mutation of ['mapping', 'map-delete', 'map-duplicate', 'name', 'gap-delete', 'gap-duplicate', 'comparison',
    'comparison-delete', 'token', 'difference-delete', 'retained', 'equivalence', 'raster']) {
    const report = buildMaterialInputAudit(calendarWeekdayReport()), retained = report.retainedTypography;
    const m = retained.reviewedMappings.find(m => m.kind === 'reviewed-calendar-weekday-text');
    const g = retained.gaps.find(g => g.attribution === 'reviewed-calendar-weekday-name-omission');
    const c = retained.comparisons.find(c => c.element === 'datepicker-weekday-0');
    const d = retained.differences.find(d => d.element === c.element && d.property === 'fontFamily');
    if (mutation === 'mapping') m.reviewEvidence.referenceHeaderCells.reverse();
    if (mutation === 'map-delete') retained.reviewedMappings = retained.reviewedMappings.filter(x => x !== m);
    if (mutation === 'map-duplicate') retained.reviewedMappings.push(structuredClone(m));
    if (mutation === 'name') g.reviewEvidence.reviewEvidence.fullName = 'Thursday';
    if (mutation === 'gap-delete') retained.gaps = retained.gaps.filter(x => x !== g);
    if (mutation === 'gap-duplicate') retained.gaps.push(structuredClone(g));
    if (mutation === 'comparison') c.revision++;
    if (mutation === 'comparison-delete') retained.comparisons = retained.comparisons.filter(x => x !== c);
    if (mutation === 'token') d.reviewEvidence.referenceRule.declarations['font-family'].value = 'Arial';
    if (mutation === 'difference-delete') retained.differences = retained.differences.filter(x => x !== d);
    if (mutation === 'retained') d.values.retained = 'Roboto';
    if (mutation === 'equivalence') g.inputEquivalent = true;
    if (mutation === 'raster') m.reviewEvidence.finalRasterVerified = true;
    assert.ok(validateMaterialInputAudit(report, { requireComplete: false }).some(e => e.includes('calendar weekday')), mutation);
  }
});

function calendarCloseOmissionReport(yearView = false) {
  const raw = yearView ? calendarYearTypographyReport() : calendarDayTypographyReport();
  const { reference: ref, astylar: ast } = raw.results[0].inputTrees;
  const node = (key, parent, type, attributes = {}, ownText = '') => ({ key, parent, type, attributes, ownText,
    style: 0, rules: [], pseudoElements: [] });
  const dialog = ref.nodes.find(n => n.key === 'dialog');
  dialog.parent = 'datepicker-content';
  Object.assign(dialog.attributes, { cdktrapfocus: '', 'aria-modal': 'true' });
  ref.nodes.push(node('datepicker-content', null, 'mat-datepicker-content', { class: 'mat-datepicker-content' }),
    node('close', 'dialog', 'button', { type: 'button', matbutton: 'elevated',
      class: 'mat-datepicker-close-button mat-mdc-raised-button cdk-visually-hidden' }),
    node('close-label', 'close', 'span', { class: 'mdc-button__label' }, 'Close calendar'));
  ref.rules = [{ selector: '.cdk-visually-hidden', active: true,
    declarations: { clip: { value: 'rect(0px, 0px, 0px, 0px)' }, height: { value: '1px' } } }];
  ref.nodes.find(n => n.key === 'close').rules = [0];
  // Deliberately capture a non-1px used size and omit computed clip. Neither
  // the class nor its authored rule proves actual hidden/focused rendering.
  ref.styles.push({ ...ref.styles[0], display: 'flex', position: 'absolute', visibility: 'visible', width: '64px', height: '40px' });
  ref.nodes.find(n => n.key === 'close').style = ref.styles.length - 1;
  return raw;
}

test('calendar close omission preserves unequal controls in current and retained stages for both views', () => {
  for (const yearView of [false, true]) {
    const raw = calendarCloseOmissionReport(yearView), before = structuredClone(raw), evidence = controlEvidence(raw);
    const omitted = evidence.gaps.filter(g => g.attribution === 'reviewed-calendar-close-control-omission');
    assert.equal(omitted.length, 1);
    assert.equal(omitted[0].referenceNode, 'close-label');
    assert.equal(omitted[0].classification, 'application-plugin-authoring-defect');
    assert.equal(omitted[0].inputEquivalent, false);
    assert.equal(omitted[0].finalRasterVerified, false);
    assert.deepEqual(omitted[0].reviewEvidence.referenceDialogChildOrder, ['calendar', 'close']);
    assert.deepEqual(omitted[0].reviewEvidence.candidateMatchingControls, []);
    assert.equal(omitted[0].reviewEvidence.computedClip, null);
    assert.equal(omitted[0].reviewEvidence.focusRevealAndDismissalVerified, false);
    assert.equal(omitted[0].reviewEvidence.visibilityVerdict, 'not-established-by-structural-audit');
    assert.ok(!evidence.comparisons.some(c => c.referenceNode === 'close-label'));
    assert.deepEqual(raw, before);
    const report = buildMaterialInputAudit(raw);
    const retained = report.retainedTypography.gaps.find(g => g.attribution === 'reviewed-calendar-close-control-omission');
    assert.deepEqual(retained.referenceNodes, ['close-label']);
    assert.deepEqual(retained.astylarNodes, []);
    assert.deepEqual(retained.reviewEvidence, omitted[0].reviewEvidence);
    assert.ok(!report.retainedTypography.controlTextMappings.some(m => m.referenceNode === 'close-label'));
    assert.equal(report.summary.inputEquivalent, false);
    assert.ok(report.sourceFindings.find(s => s.id === 'fixture-calendar-close-control-omitted')?.detected);
    assert.ok(!validateMaterialInputAudit(report, { requireComplete: false }).some(e => e.includes('calendar close')));
  }
});

test('calendar close omission rejects changed control paths, contexts and candidate counterparts', () => {
  for (const yearView of [false, true]) for (const mutate of [
    ref => { ref.nodes.find(n => n.key === 'close-label').ownText = 'Close something else'; },
    ref => { ref.nodes.find(n => n.key === 'close-label').parent = 'calendar'; },
    ref => { ref.nodes.push({ ...ref.nodes.find(n => n.key === 'close-label') }); },
    ref => { ref.nodes.push({ ...ref.nodes.find(n => n.key === 'close'), key: 'other-close' }); },
    ref => { ref.nodes.find(n => n.key === 'close').attributes.matbutton = 'text'; },
    ref => { ref.nodes.find(n => n.key === 'close').attributes.disabled = ''; },
    ref => { ref.nodes.find(n => n.key === 'dialog').attributes['aria-modal'] = 'false'; },
    ref => { delete ref.nodes.find(n => n.key === 'dialog').attributes.cdktrapfocus; },
    ref => { ref.nodes.find(n => n.key === 'dialog').parent = 'unrelated-overlay'; },
    ref => { ref.nodes.find(n => n.key === 'period').ownText = 'OCT 2050'; },
    ref => { ref.nodes.find(n => n.key === 'close').style = 999; },
    ref => { ref.nodes.find(n => n.key === 'close').rules = [999]; },
    (_ref, ast) => { ast.resolvedStyleSource = 'projected-mesh'; },
    (_ref, ast) => { ast.nodes.find(n => n.key === 'ast-header').parent = 'unrelated-popup'; },
    (_ref, ast) => { ast.nodes.find(n => n.key === 'ast-popup').authored.role = 'presentation'; },
    (_ref, ast) => { ast.nodes.find(n => n.key === 'ast-period').authored.value = 'Close calendar'; },
    (_ref, ast) => { ast.nodes[0].paintedControlText.text = 'Close calendar'; },
    (_ref, ast) => { ast.nodes.push({ key: 'extra', parent: 'ast-popup', authored: { type: 'button', id: 'dismiss', value: 'Dismiss' } }); },
    (_ref, ast) => { ast.nodes.push({ key: 'extra', parent: 'ast-popup', authored: { type: 'span', id: 'dismiss', role: 'button', textContent: 'Dismiss' } }); },
    (_ref, ast) => { ast.nodes.push({ key: 'extra', parent: 'ast-popup', authored: { type: 'input', id: 'close-input' } }); },
  ]) {
    const raw = calendarCloseOmissionReport(yearView), trees = raw.results[0].inputTrees;
    mutate(trees.reference, trees.astylar);
    assert.ok(!controlEvidence(raw).gaps.some(g => g.attribution === 'reviewed-calendar-close-control-omission'), String(mutate));
  }
});

test('calendar close omission classification does not assume a hidden class proves visibility', () => {
  const raw = calendarCloseOmissionReport(), ref = raw.results[0].inputTrees.reference;
  ref.nodes.find(n => n.key === 'close').attributes.class = 'mat-datepicker-close-button mat-mdc-raised-button';
  const omission = controlEvidence(raw).gaps.find(g => g.attribution === 'reviewed-calendar-close-control-omission');
  assert.ok(omission);
  assert.equal(omission.reviewEvidence.visibilityVerdict, 'not-established-by-structural-audit');
  assert.equal(omission.reviewEvidence.focusRevealAndDismissalVerified, false);
  assert.equal(omission.inputEquivalent, false);
});

test('calendar close supplemental owner replay is restricted to the declared view DPR and action scope', () => {
  for (const yearView of [false, true]) for (const dpr of [1, 2]) {
    for (const action of ['opened', 'tab-close', 'blur-close', 'refocus-close']) {
      const raw = calendarCloseOmissionReport(yearView), entry = raw.results[0];
      Object.assign(entry, { kind: 'supplemental', profile: 'light', viewport: { id: `calendar-close-desktop-dpr${dpr}` },
        state: `calendar-close-${yearView ? 'multi-year' : 'month'}-${action}` });
      const control = controlEvidence(raw);
      const retained = collectRetainedTypographyEvidence(raw.results, collectFullTreeInventory(raw.results), control);
      for (const evidence of [control, retained]) {
        const gaps = evidence.gaps.filter(gap => gap.attribution === 'reviewed-calendar-close-control-omission');
        assert.equal(gaps.length, 1);
        assert.equal(gaps[0].reviewEvidence.focusRevealAndDismissalVerified, false,
          'Structural ownership must not turn into a live-focus claim');
      }
    }
  }
  for (const mutate of [
    entry => { entry.profile = 'dark'; },
    entry => { entry.viewport.id = 'calendar-close-desktop-dpr3'; },
    entry => { entry.state = 'calendar-close-year-opened'; },
    entry => { entry.state = 'calendar-close-month-unreviewed'; },
    entry => { entry.state = 'hover'; },
    entry => { entry.kind = 'unknown'; },
  ]) {
    const raw = calendarCloseOmissionReport(), entry = raw.results[0];
    Object.assign(entry, { kind: 'supplemental', profile: 'light', viewport: { id: 'calendar-close-desktop-dpr1' },
      state: 'calendar-close-month-opened' });
    mutate(entry);
    assert.ok(!controlEvidence(raw).gaps.some(gap => gap.attribution === 'reviewed-calendar-close-control-omission'), String(mutate));
  }
});

function calendarCloseStateReport(view = 'month', dpr = 1) {
  const raw = calendarYearTypographyReport(), entry = raw.results[0];
  Object.assign(entry, { kind: 'supplemental', profile: 'light', viewport: { id: `calendar-close-desktop-dpr${dpr}` },
    state: `calendar-close-${view}-activate-close`, action: 'Enter', inputEquivalent: false, finalRasterVerified: false,
    reference: { open: false, close: null, openerFocused: true, events: [
      { type: 'keydown', key: 'Enter', close: true, trusted: true }, { type: 'click', close: true, trusted: true }] },
    astylar: { open: true, close: null } });
  entry.inputTrees.reference.nodes = [{ key: 'frame', parent: null, type: 'main', attributes: {},
    ownText: '', style: 0, rules: [], pseudoElements: [] }];
  return raw;
}

test('calendar close state divergence preserves current candidate controls without inventing reference typography', () => {
  for (const view of ['month', 'multi-year']) for (const dpr of [1, 2]) {
    const raw = calendarCloseStateReport(view, dpr), before = structuredClone(raw), result = controlEvidence(raw);
    assert.equal(result.comparisons.length, 0);
    assert.equal(result.differences.length, 0);
    assert.equal(result.gaps.length, 1);
    const gap = result.gaps[0];
    assert.equal(gap.attribution, 'reviewed-calendar-close-state-divergence');
    assert.equal(gap.classification, 'application-plugin-authoring-defect');
    assert.equal(gap.inputEquivalent, false);
    assert.equal(gap.finalRasterVerified, false);
    assert.equal(gap.element, 'datepicker-year-2016');
    assert.equal(gap.reviewEvidence.currentText, '2016');
    assert.equal(gap.reviewEvidence.candidatePath.at(-1), 'ast-popup');
    assert.deepEqual(raw, before);
  }
});

test('calendar close state divergence rejects unproven actions states paint and popup ownership', () => {
  const mutations = [
    e => { e.kind = 'static'; },
    e => { e.profile = 'dark'; },
    e => { e.viewport.id = 'calendar-close-desktop-dpr3'; },
    e => { e.state = 'calendar-close-year-activate-close'; },
    e => { e.state = 'calendar-close-month-refocus-close'; },
    e => { e.action = 'Escape'; },
    e => { e.reference.open = true; },
    e => { e.reference.close = {}; },
    e => { e.reference.openerFocused = false; },
    e => { e.reference.events[0].trusted = false; },
    e => { e.reference.events[1].close = false; },
    e => { e.astylar.open = false; },
    e => { e.astylar.close = {}; },
    e => { e.inputEquivalent = true; },
    e => { e.finalRasterVerified = true; },
    e => { e.inputTrees.reference.nodes.push({ key: 'calendar', parent: 'frame', type: 'mat-calendar', attributes: {},
      ownText: '', style: 0, rules: [], pseudoElements: [] }); },
    e => { e.inputTrees.astylar.resolvedStyleSource = 'projected-mesh'; },
    e => { e.inputTrees.astylar.nodes[0].authored.type = 'span'; },
    e => { e.inputTrees.astylar.nodes[0].authored.id = 'another-control'; },
    e => { e.inputTrees.astylar.nodes[0].paintedControlText.source = 'plugin-guess'; },
    e => { e.inputTrees.astylar.nodes[0].paintedControlText.text = '2017'; },
    e => { e.inputTrees.astylar.nodes[0].parent = 'missing'; },
    e => { e.inputTrees.astylar.nodes.find(n => n.key === 'ast-grid').parent = 'ast-grid'; },
    e => { e.inputTrees.astylar.nodes.find(n => n.key === 'ast-popup').authored.role = 'presentation'; },
    e => { e.inputTrees.astylar.nodes.push(structuredClone(e.inputTrees.astylar.nodes[0])); },
    e => { e.inputTrees.astylar.nodes.push({ key: 'other', parent: 'ast-popup', authored: { type: 'button', value: 'Close calendar' } }); },
  ];
  for (const mutate of mutations) {
    const raw = calendarCloseStateReport(); mutate(raw.results[0]);
    assert.ok(!controlEvidence(raw).gaps.some(g => g.attribution === 'reviewed-calendar-close-state-divergence'), String(mutate));
  }
});

test('calendar close state divergence validation replays rather than trusting classification labels', () => {
  const raw = calendarCloseStateReport(), report = buildMaterialInputAudit(parityReport({}, {}));
  report.elementInventory = collectFullTreeInventory(raw.results);
  report.controlTypography = collectControlTypographyEvidence(raw.results, report.elementInventory);
  report.retainedTypography = collectRetainedTypographyEvidence(raw.results, report.elementInventory, report.controlTypography);
  report.supplementalCalendarClose.cases = raw.results;
  const errors = value => validateMaterialInputAudit(value, { requireComplete: false }).filter(e => e.includes('state-divergence controls'));
  assert.deepEqual(errors(report), []);
  for (const mutate of [
    r => { r.controlTypography.gaps = []; },
    r => { r.controlTypography.gaps.push(structuredClone(r.controlTypography.gaps[0])); },
    r => { r.controlTypography.gaps[0].reviewEvidence.candidatePath = []; },
    r => { r.controlTypography.gaps[0].reviewEvidence.currentText = '2017'; },
    r => { r.controlTypography.gaps[0].inputEquivalent = true; },
    r => { r.controlTypography.gaps[0].finalRasterVerified = true; },
    r => { r.controlTypography.gaps[0].classification = 'equivalent-representation'; },
    r => { r.supplementalCalendarClose.cases[0].reference.events = []; },
  ]) {
    const changed = structuredClone(report); mutate(changed);
    assert.ok(errors(changed).length, String(mutate));
  }
});

test('calendar close omission validation replays evidence and rejects deleted or fabricated records', () => {
  for (const stage of ['controlTypography', 'retainedTypography']) for (const mutation of
    ['delete', 'duplicate', 'context', 'reference', 'candidate', 'revision', 'equivalent', 'raster', 'focused', 'computed-clip']) {
    const report = buildMaterialInputAudit(calendarCloseOmissionReport());
    const gap = report[stage].gaps.find(g => g.attribution === 'reviewed-calendar-close-control-omission');
    assert.ok(gap);
    if (mutation === 'delete') report[stage].gaps = report[stage].gaps.filter(g => g !== gap);
    if (mutation === 'duplicate') report[stage].gaps.push(structuredClone(gap));
    if (mutation === 'context') gap.reviewEvidence.context.period = 'OCT 2026';
    if (mutation === 'reference') gap.reviewEvidence.referenceNodes[0].text = 'Dismiss';
    if (mutation === 'candidate') gap.reviewEvidence.candidateSubtree.pop();
    if (mutation === 'revision') gap.reviewEvidence.revision++;
    if (mutation === 'equivalent') gap.inputEquivalent = true;
    if (mutation === 'raster') gap.finalRasterVerified = true;
    if (mutation === 'focused') gap.reviewEvidence.focusRevealAndDismissalVerified = true;
    if (mutation === 'computed-clip') gap.reviewEvidence.computedClip = 'rect(0px, 0px, 0px, 0px)';
    assert.ok(validateMaterialInputAudit(report, { requireComplete: false }).some(e => e.includes('calendar close')), `${stage}:${mutation}`);
  }
});

function calendarAuxiliaryReport(yearView = false) {
  const raw = calendarPeriodTypographyReport(yearView), ref = raw.results[0].inputTrees.reference;
  const liveStyle = ref.styles.push({ ...ref.styles[0], position: 'absolute', display: 'block', width: '1px', height: '1px',
    clip: 'rect(0px, 0px, 0px, 0px)' }) - 1;
  const hiddenStyle = ref.styles.push({ ...ref.styles[0], display: 'none' }) - 1;
  const liveRule = ref.rules.push({ selector: '.cdk-visually-hidden', active: true,
    declarations: { clip: { value: 'rect(0px, 0px, 0px, 0px)' } } }) - 1;
  const hiddenRule = ref.rules.push({ selector: '.mat-calendar-body-hidden-label', active: true,
    declarations: { display: { value: 'none' } } }) - 1;
  Object.assign(ref.nodes.find(n => n.key === 'period'), { style: liveStyle, rules: [liveRule] });
  for (const [index, role] of ['start', 'end', 'comparison-start', 'comparison-end'].entries()) {
    ref.nodes.push({ key: `range-${role}`, parent: 'body', type: 'span',
      attributes: { id: `mat-calendar-body-${role}-0`, class: 'mat-calendar-body-hidden-label' },
      ownText: index < 2 ? '' : ' Comparison range ', style: hiddenStyle, rules: [hiddenRule], pseudoElements: [] });
  }
  return raw;
}

function calendarAuxiliaryGaps(raw) {
  return collectRetainedTypographyEvidence(raw.results, collectFullTreeInventory(raw.results)).gaps
    .filter(g => g.attribution === 'reviewed-calendar-auxiliary-label-omission');
}

test('calendar auxiliary labels preserve live-region and display-none source inputs without inventing candidate paint', () => {
  for (const yearView of [false, true]) {
    const raw = calendarAuxiliaryReport(yearView), before = structuredClone(raw), gaps = calendarAuxiliaryGaps(raw);
    assert.equal(gaps.length, 3);
    assert.deepEqual(gaps.map(g => g.reviewEvidence.kind), ['live-period', 'comparison-range', 'comparison-range']);
    for (const gap of gaps) {
      assert.equal(gap.classification, 'application-plugin-authoring-defect');
      assert.equal(gap.inputEquivalent, false);
      assert.equal(gap.finalRasterVerified, false);
      assert.deepEqual(gap.astylarNodes, []);
      assert.equal(gap.reviewEvidence.candidatePopup, 'ast-popup');
    }
    assert.deepEqual(gaps[0].reviewEvidence.referenceDescriptionUsers, ['period-button']);
    assert.equal(gaps[0].reviewEvidence.referenceOwners[0].computed.clip, 'rect(0px, 0px, 0px, 0px)');
    assert.equal(gaps[1].reviewEvidence.referenceOwners.length, 5);
    assert.deepEqual(gaps[1].reviewEvidence.referenceDescriptionUsers, []);
    assert.equal(gaps[1].reviewEvidence.referenceOwners[2].computed.display, 'none');
    assert.deepEqual(raw, before);
    const report = buildMaterialInputAudit(raw);
    assert.equal(report.summary.inputEquivalent, false);
    assert.ok(report.sourceFindings.find(f => f.id === 'fixture-calendar-accessibility-labels-omitted')?.detected);
    assert.ok(!validateMaterialInputAudit(report, { requireComplete: false }).some(e => e.includes('auxiliary label')));
  }
});

test('calendar auxiliary label attribution rejects changed scope context clipping and replacement owners', () => {
  for (const mutate of [
    e => { e.family = 'menu'; },
    e => { e.state = 'calendar-close-month-opened'; e.kind = 'supplemental'; e.profile = 'dark'; },
    e => { e.inputTrees.astylar.resolvedStyleSource = 'projected-mesh'; },
    e => { e.inputTrees.reference.nodes.find(n => n.key === 'period').ownText = 'OCT 2026'; },
    e => { e.inputTrees.reference.nodes.find(n => n.key === 'body').parent = 'unrelated'; },
    e => { e.inputTrees.reference.nodes.push(structuredClone(e.inputTrees.reference.nodes[0])); },
    e => { e.inputTrees.astylar.nodes.find(n => n.key === 'ast-grid').parent = null; },
    e => { e.inputTrees.astylar.nodes.push({ key: 'replacement', authored: { type: 'span', textContent: 'Comparison range' } }); },
    e => { e.inputTrees.astylar.nodes.push({ key: 'replacement', authored: { type: 'span', ariaLive: 'polite' } }); },
    e => { e.inputTrees.astylar.nodes.push({ key: 'replacement', authored: { type: 'span', role: 'status' } }); },
  ]) {
    const raw = calendarAuxiliaryReport(); mutate(raw.results[0]);
    assert.deepEqual(calendarAuxiliaryGaps(raw), [], String(mutate));
  }
  for (const [kind, mutate] of [
    ['live-period', (r, a) => { r.nodes.find(n => n.key === 'period').attributes['aria-live'] = 'off'; }],
    ['live-period', (r, a) => { r.nodes.find(n => n.key === 'period-button').attributes['aria-describedby'] = 'other'; }],
    ['live-period', (r, a) => { r.styles[r.nodes.find(n => n.key === 'period').style].clip = 'auto'; }],
    ['live-period', (r, a) => { r.styles[r.nodes.find(n => n.key === 'period').style].width = '100px'; }],
    ['live-period', (r, a) => { r.rules[r.nodes.find(n => n.key === 'period').rules[0]].active = false; }],
    ['live-period', (r, a) => { a.nodes.find(n => n.key === 'ast-period').authored.ariaDescribedBy = 'another-live'; }],
    ['comparison-range', (r, a) => { r.nodes.find(n => n.key === 'range-start').ownText = 'Start date'; }],
    ['comparison-range', (r, a) => { r.nodes = r.nodes.filter(n => n.key !== 'range-end'); }],
    ['comparison-range', (r, a) => { r.nodes.find(n => n.key === 'range-comparison-start').parent = 'calendar'; }],
    ['comparison-range', (r, a) => { r.nodes.find(n => n.key === 'range-comparison-end').attributes.id = 'mat-calendar-body-comparison-end-7'; }],
    ['comparison-range', (r, a) => { r.styles[r.nodes.find(n => n.key === 'range-start').style].display = 'block'; }],
    ['comparison-range', (r, a) => { r.rules[r.nodes.find(n => n.key === 'range-start').rules[0]].declarations.display.value = 'block'; }],
  ]) {
    const raw = calendarAuxiliaryReport(), t = raw.results[0].inputTrees; mutate(t.reference, t.astylar);
    assert.ok(!calendarAuxiliaryGaps(raw).some(g => g.reviewEvidence.kind === kind), String(mutate));
  }
});

test('calendar auxiliary label validation rejects removed forged and reclassified report records', () => {
  const report = buildMaterialInputAudit(calendarAuxiliaryReport());
  for (const mutate of [
    (r, g) => { r.retainedTypography.gaps = r.retainedTypography.gaps.filter(x => x !== g); },
    (r, g) => { r.retainedTypography.gaps.push(structuredClone(g)); },
    (r, g) => { g.attribution = 'unresolved'; },
    (r, g) => { g.classification = 'equivalent-representation'; },
    (r, g) => { g.inputEquivalent = true; },
    (r, g) => { g.finalRasterVerified = true; },
    (r, g) => { g.reviewEvidence.referenceDescriptionUsers = []; },
    (r, g) => { g.reviewEvidence.referenceOwners[0].computed.clip = 'auto'; },
    (r, g) => { g.reviewEvidence.candidateSubtree = []; },
  ]) {
    const changed = structuredClone(report), gap = changed.retainedTypography.gaps.find(g => g.reviewEvidence?.kind === 'live-period');
    assert.ok(gap); mutate(changed, gap);
    assert.ok(validateMaterialInputAudit(changed, { requireComplete: false }).some(e => e.includes('auxiliary label')), String(mutate));
  }
});

function calendarPeriodTypographyReport(yearView = false) {
  const raw = yearView ? calendarYearTypographyReport() : calendarDayTypographyReport();
  const { reference: ref, astylar: ast } = raw.results[0].inputTrees;
  const text = yearView ? '2016 – 2039' : 'SEP 2026';
  ref.styles.push({ ...ref.styles[0], fontFamily: 'Roboto', fontSize: '14px', fontWeight: '500',
    lineHeight: 'normal', letterSpacing: '.096px', color: '#49454e', transform: 'none' });
  ref.styles.push({ ...ref.styles[1], transform: yearView ? 'matrix(-1, 0, 0, -1, 0, 0)' : 'none', fill: '#49454e' });
  const node = (key, parent, type, attributes, ownText = '') => ({ key, parent, type, attributes, ownText,
    style: 1, rules: [], pseudoElements: [] });
  ref.nodes.push(
    node('period-button', 'controls', 'button', { class: 'mat-calendar-period-button mat-mdc-button',
      'aria-label': yearView ? 'Choose date' : 'Choose month and year', 'aria-describedby': 'mat-calendar-period-label-0' }),
    node('period-wrapper', 'period-button', 'span', { class: 'mdc-button__label' }),
    node('period-text', 'period-wrapper', 'span', { 'aria-hidden': 'true' }, text),
    node('period-svg', 'period-wrapper', 'svg', { class: `mat-calendar-arrow${yearView ? ' mat-calendar-invert' : ''}`,
      viewBox: '0 0 10 5', 'aria-hidden': 'true', focusable: 'false' }),
    node('period-polygon', 'period-svg', 'polygon', { points: '0,0 5,5 10,0' }),
  );
  ref.nodes.find(n => n.key === 'period-svg').style = 2;
  ref.rules = [{ selector: '.mat-mdc-button', active: true, declarations: {
    'font-family': { value: 'var(--mat-button-text-label-text-font, var(--mat-sys-label-large-font))' },
    'letter-spacing': { value: 'var(--mat-button-text-label-text-tracking, var(--mat-sys-label-large-tracking))' },
  } }, { selector: '.mat-mdc-button:not(:disabled)', active: true,
    declarations: { color: { value: 'var(--mat-button-text-label-text-color, var(--mat-sys-primary))' } } },
  { selector: '.mat-calendar-period-button', active: true,
    declarations: { '--mat-button-text-label-text-color': { value: 'var(--mat-datepicker-calendar-period-button-text-color, var(--mat-sys-on-surface-variant))' } } }];
  ref.nodes.find(n => n.key === 'period-button').rules = [0, 1, 2];
  const candidate = ast.nodes.find(n => n.key === 'ast-period');
  candidate.authored.class = `datepicker-month${yearView ? ' year-view' : ''}`;
  candidate.normalResolvedStyle = { fontFamily: 'Roboto, Arial, sans-serif', fontSize: '14px', fontWeight: '500', color: '#1d1b20' };
  candidate.interactionResolvedStyle = { ...candidate.normalResolvedStyle };
  candidate.paintedControlText = { source: 'core-control-texture', text: candidate.authored.value,
    style: { ...ast.nodes[0].paintedControlText.style, fontFamily: 'Roboto, Arial, sans-serif',
      fontSize: 14, fontWeight: '500', lineHeight: 17 / 14, letterSpacing: 0, color: '#1d1b20' } };
  ast.nodes.find(n => n.key === 'ast-popup').parent = 'page';
  ast.nodes.push({ key: 'page', parent: 'root', authored: { type: 'main', id: 'page' },
    resolvedStyle: {}, normalResolvedStyle: {}, interactionResolvedStyle: {} });
  ast.rules = [{ selector: '.datepicker-month', color: '#1d1b20', fontSize: '14px', fontWeight: '500' },
    { selector: 'button, input, select', fontFamily: 'Roboto, Arial, sans-serif' }];
  return raw;
}

test('calendar period composition preserves the full candidate string and original text plus SVG inputs', () => {
  for (const yearView of [false, true]) {
    const raw = calendarPeriodTypographyReport(yearView), before = structuredClone(raw), evidence = controlEvidence(raw);
    const comparison = evidence.comparisons.find(c => c.element === 'datepicker-month');
    assert.ok(comparison);
    assert.deepEqual(evidence.gaps, []);
    assert.equal(comparison.mapping.kind, 'reviewed-material-calendar-period-composition');
    assert.equal(comparison.referenceText, yearView ? '2016 – 2039' : 'SEP 2026');
    assert.equal(comparison.text, comparison.referenceText + (yearView ? ' ▴' : ' ▾'));
    assert.equal(comparison.finalRasterVerified, false);
    const review = comparison.mapping.reviewEvidence;
    assert.equal(review.yearView, yearView);
    assert.equal(review.content.inputEquivalent, false);
    assert.equal(review.content.referenceSvg.points, '0,0 5,5 10,0');
    assert.equal(review.accessibility.referenceDescription, yearView ? '2016 to 2039' : 'SEP 2026');
    assert.equal(review.accessibility.candidateDescriptionId, null);
    assert.equal(review.accessibility.descriptionInputsEquivalent, false);
    assert.equal(evidence.differences.filter(d => d.element === 'datepicker-month').length, 4);
    for (const property of ['fontFamily', 'letterSpacing', 'color']) assert.equal(evidence.differences.find(d =>
      d.element === 'datepicker-month' && d.property === property).attribution, 'reviewed-calendar-period-typography-input');
    assert.equal(evidence.differences.find(d => d.element === 'datepicker-month' && d.property === 'lineHeight').attribution, 'unresolved');
    assert.deepEqual(raw, before);
    const report = buildMaterialInputAudit(raw);
    assert.ok(report.retainedTypography.controlTextMappings.some(m => m.element === 'datepicker-month' && m.inputEquivalent === false));
    assert.equal(report.summary.inputEquivalent, false);
    assert.ok(!validateMaterialInputAudit(report, { requireComplete: false }).some(e => e.includes('calendar period')));
  }
});

test('calendar period composition mapping rejects mismatched context, vectors, prefix, suffix and current paint', () => {
  for (const yearView of [false, true]) for (const mutate of [
    (ref, ast) => { ref.nodes.find(n => n.key === 'period-text').ownText = 'Other'; },
    (ref, ast) => { ref.nodes.find(n => n.key === 'period-button').attributes['aria-describedby'] = 'other'; },
    (ref, ast) => { ref.nodes.find(n => n.key === 'period-button').parent = 'calendar'; },
    (ref, ast) => { ref.nodes.find(n => n.key === 'period-wrapper').ownText = 'Extra'; },
    (ref, ast) => { ref.nodes.find(n => n.key === 'period-svg').attributes.viewBox = '0 0 20 10'; },
    (ref, ast) => { ref.nodes.find(n => n.key === 'period-svg').attributes.class = 'other'; },
    (ref, ast) => { ref.nodes.find(n => n.key === 'period-polygon').attributes.points = '0,0 0,10 10,10'; },
    (ref, ast) => { ref.nodes.push({ ...ref.nodes.find(n => n.key === 'period-text'), key: 'extra-text', parent: 'period-button' }); },
    (ref, ast) => { ref.nodes.push({ ...ref.nodes.find(n => n.key === 'period-polygon'), key: 'extra-vector' }); },
    (ref, ast) => { ref.styles[2].transform = 'matrix(1,0,0,1,3,0)'; },
    (ref, ast) => { ref.nodes.find(n => n.key === 'period').ownText = 'Other range'; },
    (ref, ast) => { ast.nodes.find(n => n.key === 'ast-period').authored.value += ' extra'; },
    (ref, ast) => { ast.nodes.find(n => n.key === 'ast-period').authored.class = 'other'; },
    (ref, ast) => { ast.nodes.find(n => n.key === 'ast-period').authored.ariaDescribedBy = 'other'; },
    (ref, ast) => { ast.nodes.find(n => n.key === 'ast-period').paintedControlText.text = 'Other'; },
    (ref, ast) => { ast.nodes.find(n => n.key === 'ast-period').paintedControlText.source = 'core-text-registry'; },
    (ref, ast) => { delete ast.nodes.find(n => n.key === 'ast-period').paintedControlText; },
    (ref, ast) => { ast.nodes.find(n => n.key === 'ast-period').paintedControlText.style.fontSize = '14px'; },
    (ref, ast) => { ast.nodes.push({ ...ast.nodes.find(n => n.key === 'ast-period'), key: 'duplicate' }); },
    (ref, ast) => { ast.nodes.find(n => n.key === 'ast-header').parent = 'other'; },
  ]) {
    const raw = calendarPeriodTypographyReport(yearView), trees = raw.results[0].inputTrees;
    mutate(trees.reference, trees.astylar);
    const evidence = controlEvidence(raw);
    assert.ok(!evidence.comparisons.some(c => c.element === 'datepicker-month'), `${yearView}: ${mutate}`);
    assert.ok(evidence.gaps.length > 0, `${yearView}: ${mutate}`);
  }
});

test('calendar period typography attribution requires nested token and omission witnesses', () => {
  for (const [property, mutate] of [
    ['fontFamily', (r, a) => { r.rules[0].active = false; }],
    ['fontFamily', (r, a) => { a.rules[0].fontFamily = 'Roboto'; }],
    ['fontFamily', (r, a) => { a.rules[1].fontFamily = 'Arial'; }],
    ['letterSpacing', (r, a) => { a.nodes.find(n => n.key === 'page').normalResolvedStyle.letterSpacing = '0'; }],
    ['letterSpacing', (r, a) => { a.rules[0].letterSpacing = '0'; }],
    ['letterSpacing', (r, a) => { r.nodes.find(n => n.key === 'period-text').attributes.style = 'letter-spacing: .096px'; }],
    ['color', (r, a) => { r.rules[2].declarations['--mat-button-text-label-text-color'].value = 'red'; }],
    ['color', (r, a) => { r.rules[1].declarations.color.value = 'red'; }],
    ['color', (r, a) => { a.rules[0].color = 'red'; }],
    ['color', (r, a) => { a.nodes.find(n => n.key === 'ast-period').paintedControlText.style.color = 'red'; }],
  ]) {
    const raw = calendarPeriodTypographyReport(), trees = raw.results[0].inputTrees;
    mutate(trees.reference, trees.astylar);
    assert.equal(controlEvidence(raw).differences.find(d => d.element === 'datepicker-month' && d.property === property)?.attribution,
      'unresolved', `${property}: ${mutate}`);
  }
});

test('calendar period validation rejects altered composition, descriptions and typography review evidence', () => {
  for (const mutation of ['text', 'reference text', 'vector', 'description', 'glyph', 'equivalence', 'raster', 'revision', 'token', 'paint']) {
    const report = buildMaterialInputAudit(calendarPeriodTypographyReport(true));
    const c = report.controlTypography.comparisons.find(c => c.element === 'datepicker-month');
    const d = report.controlTypography.differences.find(d => d.element === c.element && d.property === 'color');
    if (mutation === 'text') c.text = c.referenceText;
    if (mutation === 'reference text') c.referenceText = c.text;
    if (mutation === 'vector') c.mapping.reviewEvidence.content.referenceSvg.points = '0,0';
    if (mutation === 'description') c.mapping.reviewEvidence.accessibility.candidateDescriptionId = 'period';
    if (mutation === 'glyph') c.mapping.reviewEvidence.content.appendedGlyph = '▼';
    if (mutation === 'equivalence') c.mapping.reviewEvidence.content.inputEquivalent = true;
    if (mutation === 'raster') c.finalRasterVerified = true;
    if (mutation === 'revision') c.revision++;
    if (mutation === 'token') d.reviewEvidence.referenceTokenOverride.declarations['--mat-button-text-label-text-color'].value = 'red';
    if (mutation === 'paint') d.values.painted = 'red';
    assert.ok(validateMaterialInputAudit(report, { requireComplete: false }).some(e => e.includes('calendar period')), mutation);
  }
});

test('calendar navigation SVG-to-glyph substitution witnesses retain distinct year-view accessible names', () => {
  for (const yearView of [false, true]) for (const direction of ['previous', 'next']) {
    const raw = calendarNavigationReport(direction, yearView), before = structuredClone(raw), report = buildMaterialInputAudit(raw);
    const substitutions = report.controlTypography.iconSubstitutions;
    assert.equal(substitutions.length, 1);
    const finding = substitutions[0];
    assert.equal(finding.attribution, 'reviewed-calendar-navigation-svg-to-glyph-input');
    assert.equal(finding.inputEquivalent, false);
    assert.equal(finding.finalRasterVerified, false);
    assert.equal(finding.reviewEvidence.yearView, yearView);
    assert.equal(finding.reviewEvidence.accessibleNames.inputEquivalent, !yearView);
    assert.ok(finding.reviewEvidence.referencePath.attributes.d.length > 0);
    assert.equal(finding.reviewEvidence.sourceFinding, 'fixture-calendar-navigation-svg-icons-replaced-by-text-glyphs');
    assert.ok(!report.controlTypography.comparisons.some(c => c.element === `datepicker-${direction}`));
    assert.ok(!validateMaterialInputAudit(report).some(e => e.includes('control icon substitutions')));
    assert.deepEqual(raw, before);
  }
});

test('calendar icon attribution requires exact vectors, control identity, period context and current glyph paint', () => {
  for (const yearView of [false, true]) for (const mutate of [
    (r, a) => { r.nodes.find(n => n.key === 'nav-path').attributes.d = 'M0 0L1 1'; },
    (r, a) => { r.nodes.find(n => n.key === 'nav-svg').attributes.viewBox = '0 0 12 12'; },
    (r, a) => { r.nodes.find(n => n.key === 'nav-svg').attributes['aria-hidden'] = 'false'; },
    (r, a) => { r.nodes.find(n => n.key === 'nav').parent = 'calendar'; },
    (r, a) => { r.nodes.find(n => n.key === 'nav').attributes['aria-label'] = 'Other'; },
    (r, a) => { r.nodes.find(n => n.key === 'period').ownText = 'wrong'; },
    (r, a) => { r.nodes.push({ ...r.nodes.find(n => n.key === 'nav-svg'), key: 'second-svg' }); },
    (r, a) => { r.nodes.push({ key: 'extra-label', parent: 'nav', type: 'span', ownText: 'Extra', style: 0, rules: [], pseudoElements: [] }); },
    (r, a) => { a.nodes.find(n => n.key === 'ast-nav').parent = 'ast-popup'; },
    (r, a) => { a.nodes.find(n => n.key === 'ast-nav').authored.value = '<'; },
    (r, a) => { a.nodes.find(n => n.key === 'ast-nav').paintedControlText.text = '<'; },
    (r, a) => { a.nodes.find(n => n.key === 'ast-nav').paintedControlText.source = 'inferred'; },
  ]) {
    const raw = calendarNavigationReport('previous', yearView), trees = raw.results[0].inputTrees;
    mutate(trees.reference, trees.astylar);
    const result = controlEvidence(raw);
    assert.equal(result.iconSubstitutions.length, 0, `${yearView}: ${mutate}`);
    assert.ok(result.gaps.some(g => g.element === 'datepicker-previous'));
  }
});

test('calendar vector substitution evidence is revalidated against the captured inventory', () => {
  const report = buildMaterialInputAudit(calendarNavigationReport('next', true));
  assert.ok(!validateMaterialInputAudit(report, { requireComplete: false }).some(e => e.includes('calendar navigation substitutions')));
  for (const mutate of [
    x => { x.reviewEvidence.accessibleNames.candidate = 'Next 24 years'; },
    x => { x.reviewEvidence.referencePath.attributes.d = 'M0 0L1 1'; },
    x => { x.reviewEvidence.calendarContext.period = 'wrong'; },
    x => { x.reference.path = 'M0 0L1 1'; },
    x => { x.revision += 1; },
    x => { x.inputEquivalent = true; },
  ]) {
    const changed = structuredClone(report);
    mutate(changed.controlTypography.iconSubstitutions[0]);
    assert.ok(validateMaterialInputAudit(changed, { requireComplete: false }).some(e => e.includes('calendar navigation substitutions')));
  }
});

test('calendar day typography attributes captured font tokens, omitted inner line-height and fixed ink', () => {
  const raw = calendarDayTypographyAttributionReport(), before = structuredClone(raw);
  const report = buildMaterialInputAudit(raw);
  const differences = report.controlTypography.differences;
  assert.equal(differences.length, 3);
  assert.deepEqual(differences.map(d => d.property).sort(), ['color', 'fontFamily', 'lineHeight']);
  assert.ok(differences.every(d => d.attribution === 'reviewed-calendar-day-typography-input' &&
    d.classification === 'application-plugin-authoring-defect' && d.reviewEvidence.sourceFinding === 'fixture-calendar-day-typography-substitution'));
  assert.equal(differences.find(d => d.property === 'lineHeight').reviewEvidence.candidateOmissionChain.at(-1).node, 'page');
  assert.equal(report.summary.inputEquivalent, false);
  assert.ok(!validateMaterialInputAudit(report).some(error => error.includes('control texture typography differences')));
  assert.deepEqual(raw, before);
});

test('calendar typography does not attribute through missing tokens, overrides, or a changed paint stage', () => {
  const mutations = [
    ['fontFamily', (r, a) => { r.rules[0].active = false; }],
    ['fontFamily', (r, a) => { r.rules[0].declarations['font-family'].value = 'Roboto'; }],
    ['fontFamily', (r, a) => { a.rules[0].fontFamily = 'Arial'; }],
    ['fontFamily', (r, a) => { a.rules[1].fontFamily = 'Roboto, Arial, sans-serif'; }],
    ['fontFamily', (r, a) => { a.nodes[0].paintedControlText.style.fontFamily = 'Arial'; }],
    ['fontFamily', (r, a) => { r.nodes.find(n => n.key === 'day-label').inline = { 'font-family': { value: 'Roboto' } }; }],
    ['lineHeight', (r, a) => { r.rules[1].declarations['line-height'].value = '14px'; }],
    ['lineHeight', (r, a) => { a.nodes.find(n => n.key === 'page').interactionResolvedStyle.lineHeight = 'normal'; }],
    ['lineHeight', (r, a) => { a.nodes.find(n => n.key === 'ast-popup').parent = 'missing'; }],
    ['lineHeight', (r, a) => { a.rules[2].lineHeight = 'normal'; }],
    ['lineHeight', (r, a) => { r.styles[0].lineHeight = '20px'; }],
    ['lineHeight', (r, a) => { a.nodes[0].paintedControlText.style.fontSize = 15; }],
    ['color', (r, a) => { r.rules[1].declarations.color.value = '#1d1b1e'; }],
    ['color', (r, a) => { a.rules[1].color = '#111111'; }],
    ['color', (r, a) => { a.nodes[0].interactionResolvedStyle.color = '#111111'; }],
    ['color', (r, a) => { a.nodes[0].paintedControlText.style.color = '#111111'; }],
    ['color', (r, a) => { r.rules.push({ active: true, selector: '.selected', declarations: { color: { value: 'red' } } }); r.nodes.find(n => n.key === 'day-label').rules.push(2); }],
    ['color', (r, a) => { a.rules.push({ ...a.rules[1] }); }],
  ];
  for (const [property, mutate] of mutations) {
    const raw = calendarDayTypographyAttributionReport(), trees = raw.results[0].inputTrees;
    mutate(trees.reference, trees.astylar);
    const difference = controlEvidence(raw).differences.find(d => d.property === property);
    assert.equal(difference?.attribution, 'unresolved', `${property}: ${mutate}`);
  }
});

test('registry audit routes an exact core control label to its actual texture stage without fabricating retained text', () => {
  const raw = controlTypographyReport();
  delete raw.results[0].inputTrees.astylar.nodes[0].retainedText;
  const before = structuredClone(raw), inventory = collectFullTreeInventory(raw.results);
  const retained = collectRetainedTypographyEvidence(raw.results, inventory);
  assert.deepEqual(retained.gaps, []);
  assert.deepEqual(retained.comparisons, []);
  assert.equal(retained.controlTextMappings.length, 1);
  assert.equal(retained.controlTextMappings[0].source, 'core-control-texture');
  assert.equal(retained.controlTextMappings[0].inputEquivalent, false);
  assert.equal(retained.controlTextMappings[0].referenceNode, 'label');
  assert.deepEqual(raw, before);
  const report = buildMaterialInputAudit(raw);
  assert.equal(report.controlTypography.comparisons.length, 1);
  assert.ok(!validateMaterialInputAudit(report).some((error) => error.includes('retained-to-control')));
});

test('control-stage routing cannot suppress unrelated anonymous reference text', () => {
  const raw = controlTypographyReport();
  raw.results[0].inputTrees.reference.nodes.push({ key: 'another-label', parent: 'frame', type: 'span',
    ownText: 'Unmapped text', style: 0, rules: [], pseudoElements: [] });
  const retained = collectRetainedTypographyEvidence(raw.results, collectFullTreeInventory(raw.results));
  assert.equal(retained.controlTextMappings.length, 1);
  assert.equal(retained.gaps.length, 1);
  assert.deepEqual(retained.gaps[0].referenceNodes, ['another-label']);
});

test('control-stage routing requires current authoritative source, structure and identity', () => {
  const mutations = [
    (tree) => { delete tree.nodes[0].paintedControlText; },
    (tree) => { tree.nodes[0].paintedControlText.source = 'core-text-registry'; },
    (tree) => { tree.paintedControlTextEvidenceVersion = 0; },
    (tree) => { delete tree.resolvedStyleRevision; },
    (tree) => { tree.nodes[0].paintedControlText.text = 'Other text'; },
    (tree) => { tree.nodes.push({ ...tree.nodes[0], key: 'duplicate-control' }); },
  ];
  for (const mutate of mutations) {
    const raw = controlTypographyReport(); mutate(raw.results[0].inputTrees.astylar);
    const retained = collectRetainedTypographyEvidence(raw.results, collectFullTreeInventory(raw.results));
    assert.deepEqual(retained.controlTextMappings, [], String(mutate));
    assert.ok(retained.gaps.length > 0, String(mutate));
  }
});

test('routing to current control text still enforces missing paint-property evidence', () => {
  const raw = controlTypographyReport();
  delete raw.results[0].inputTrees.astylar.nodes[0].paintedControlText.style.fontSize;
  const report = buildMaterialInputAudit(raw);
  assert.equal(report.retainedTypography.controlTextMappings.length, 1);
  assert.deepEqual(report.retainedTypography.gaps, []);
  assert.ok(report.controlTypography.gaps.length > 0);
  assert.ok(validateMaterialInputAudit(report).some((error) => error.includes('control texture mappings')));
});

test('retained-to-control stage claims are rejected when detached, duplicated or presented as input equivalence', () => {
  for (const mutation of ['missing control', 'different revision', 'different text', 'duplicate mapping', 'input equivalent']) {
    const report = buildMaterialInputAudit(controlTypographyReport());
    if (mutation === 'missing control') report.controlTypography.comparisons = [];
    if (mutation === 'different revision') report.retainedTypography.controlTextMappings[0].revision++;
    if (mutation === 'different text') report.retainedTypography.controlTextMappings[0].text = 'Other';
    if (mutation === 'duplicate mapping') report.retainedTypography.controlTextMappings.push(report.retainedTypography.controlTextMappings[0]);
    if (mutation === 'input equivalent') report.retainedTypography.controlTextMappings[0].inputEquivalent = true;
    assert.ok(validateMaterialInputAudit(report).some((error) => error.includes('retained-to-control')), mutation);
  }
});

function observedNormalLineBoxFixture() {
  const raw = controlTypographyReport(), trees = raw.results[0].inputTrees;
  trees.reference.styles[0].lineHeight = 'normal';
  const node = trees.astylar.nodes[0];
  node.parent = 'page';
  trees.astylar.nodes.push({ key: 'page', parent: 'root', authored: { type: 'main', id: 'page' },
    resolvedStyle: {}, normalResolvedStyle: {}, interactionResolvedStyle: {} });
  const inventory = collectFullTreeInventory(raw.results), control = collectControlTypographyEvidence(raw.results, inventory);
  const comparison = control.comparisons[0];
  const supplemental = { schemaVersion: 1, file: 'test-report.json', sha256: 'a'.repeat(64), errors: [], missing: [],
    observations: [{ schemaVersion: 1, case: comparison.case, element: comparison.element,
      referenceNode: comparison.referenceNode, text: comparison.text, fontReady: true,
      source: 'browser-natural-single-line-box', naturalHeight: 32, evidence: { file: 'test-observation.json', sha256: 'b'.repeat(64) } }] };
  return { raw, inventory, control, supplemental };
}

test('observed normal line box attributes the exact stage mismatch without rewriting inputs', () => {
  const f = observedNormalLineBoxFixture(), before = structuredClone(f);
  const result = attributeObservedNormalLineBoxes(f.control, f.inventory, f.supplemental);
  const line = result.differences.find((item) => item.property === 'lineHeight');
  assert.equal(line.attribution, 'reviewed-normal-line-box-stage-comparison');
  assert.equal(line.classification, 'parity-harness-defect');
  assert.equal(line.values.reference, 'normal');
  assert.equal(line.values.painted, '32px');
  assert.equal(line.values.normal, undefined);
  assert.equal(line.reviewEvidence.observation.naturalHeight, 32, 'not a hard-coded normal equals 17 rule');
  assert.equal(line.reviewEvidence.candidateOmissionChain.length, 2);
  assert.equal(line.reviewEvidence.inputEquivalent, false);
  assert.equal(result.comparisons[0].finalRasterVerified, false);
  assert.deepEqual(f, before, 'neither inputs nor unreviewed raw differences are changed');
  const report = buildMaterialInputAudit(f.raw);
  report.controlTypography = result;
  report.normalLineBoxes = structuredClone(f.supplemental);
  assert.ok(!validateMaterialInputAudit(report).some((error) => error.includes('control texture typography differences')));
  delete line.reviewEvidence.observation.evidence.sha256;
  assert.ok(validateMaterialInputAudit(report).some((error) => error.includes('control texture typography differences')));
});

test('report validation requires the same joined normal observation, not a detached review claim', () => {
  for (const mutation of ['missing observation', 'other hash', 'changed observation', 'false equivalence']) {
    const f = observedNormalLineBoxFixture(), report = buildMaterialInputAudit(f.raw);
    report.controlTypography = attributeObservedNormalLineBoxes(f.control, f.inventory, f.supplemental);
    report.normalLineBoxes = structuredClone(f.supplemental);
    if (mutation === 'missing observation') report.normalLineBoxes.observations = [];
    if (mutation === 'other hash') report.normalLineBoxes.sha256 = 'c'.repeat(64);
    if (mutation === 'changed observation') report.normalLineBoxes.observations[0].naturalHeight = 33;
    if (mutation === 'false equivalence') report.controlTypography.differences.find((item) => item.property === 'lineHeight').reviewEvidence.inputEquivalent = true;
    assert.ok(validateMaterialInputAudit(report).some((error) => error.includes('control texture typography differences')), mutation);
  }
});

test('observed line-box agreement never excuses other typography input differences', () => {
  const f = observedNormalLineBoxFixture();
  const node = f.raw.results[0].inputTrees.astylar.nodes[0];
  node.paintedControlText.style.fontFamily = 'Arial, sans-serif';
  node.paintedControlText.style.letterSpacing = 1;
  const inventory = collectFullTreeInventory(f.raw.results), control = collectControlTypographyEvidence(f.raw.results, inventory);
  const result = attributeObservedNormalLineBoxes(control, inventory, f.supplemental);
  assert.equal(result.differences.find((item) => item.property === 'lineHeight').attribution, 'reviewed-normal-line-box-stage-comparison');
  for (const property of ['fontFamily', 'letterSpacing']) assert.deepEqual(result.differences.find((item) => item.property === property),
    control.differences.find((item) => item.property === property));
});

test('observed normal attribution rejects incomplete, ambiguous, conflicting or substituted inputs', () => {
  const mutations = [
    (f) => { f.supplemental.errors.push('bad capture'); },
    (f) => { delete f.supplemental.sha256; },
    (f) => { f.supplemental.observations = []; },
    (f) => { f.supplemental.observations.push(f.supplemental.observations[0]); },
    (f) => { f.supplemental.observations[0].case = 'another case'; },
    (f) => { f.supplemental.observations[0].element = 'another control'; },
    (f) => { f.supplemental.observations[0].referenceNode = 'another node'; },
    (f) => { f.supplemental.observations[0].text = 'Other'; },
    (f) => { f.supplemental.observations[0].fontReady = false; },
    (f) => { delete f.supplemental.observations[0].evidence.sha256; },
    (f) => { f.supplemental.observations[0].naturalHeight = 33; },
    (f) => { f.control.comparisons[0].state = 'hover'; },
    (f) => { f.control.comparisons[0].properties.fontSize.painted = '25px'; },
    (f) => { f.control.comparisons[0].properties.fontWeight.painted = '700'; },
    (f) => { f.control.comparisons[0].properties.fontStyle.painted = 'italic'; },
    (f) => { f.control.comparisons[0].mapping.kind = 'inferred-text'; },
    (f) => { f.inventory.errors.push({ case: f.control.comparisons[0].case }); },
    (f) => { const tree = f.inventory.variants.find((item) => item.side === 'astylar'); tree.nodes[0].parent = 'missing'; },
    (f) => { const tree = f.inventory.variants.find((item) => item.side === 'astylar'); tree.nodes[0].parent = tree.nodes[0].key; },
    (f) => { const tree = f.inventory.variants.find((item) => item.side === 'astylar'); f.inventory.styles[tree.nodes[0].normalStyle].value.lineHeight = '32px'; },
    (f) => { const tree = f.inventory.variants.find((item) => item.side === 'astylar'); f.inventory.styles[tree.nodes[1].interactionStyle].value.lineHeight = '32px'; },
    (f) => { const tree = f.inventory.variants.find((item) => item.side === 'astylar'); f.inventory.styles[tree.nodes[1].normalStyle].value.font = '24px/32px Arial'; },
    (f) => { f.control.differences.push({ ...f.control.differences.find((item) => item.property === 'lineHeight') }); },
  ];
  for (const mutate of mutations) {
    const f = observedNormalLineBoxFixture(); mutate(f);
    const result = attributeObservedNormalLineBoxes(f.control, f.inventory, f.supplemental);
    assert.ok(result.differences.filter((item) => item.property === 'lineHeight').every((item) => item.attribution === 'unresolved'), String(mutate));
  }
});

test('normal observations remain required and a selected missing report cannot silently authorize attribution', () => {
  const f = observedNormalLineBoxFixture(), report = buildMaterialInputAudit(f.raw);
  assert.equal(report.normalLineBoxes.missing.length, 1);
  assert.ok(validateMaterialInputAudit(report).some((error) => error.includes('normal-line-box observations are missing')));
  const missing = buildMaterialInputAudit(f.raw, { normalLineBoxPath: 'artifacts/material-parity/no-such-normal-report.json' });
  assert.equal(missing.normalLineBoxes.errors.length, 1);
  assert.ok(validateMaterialInputAudit(missing, { requireComplete: false }).some((error) => error.includes('natural-line-box evidence errors')));
  assert.equal(missing.controlTypography.differences.find((item) => item.property === 'lineHeight').attribution, 'unresolved');
});

function observedInteractiveLineBoxFixture(state = 'hover') {
  const f = observedNormalLineBoxFixture(), entry = f.raw.results[0];
  Object.assign(entry, { kind: 'interaction', state }); f.raw.results = []; f.raw.interactions = [entry];
  f.inventory = collectFullTreeInventory(f.raw.interactions);
  f.control = collectControlTypographyEvidence(f.raw.interactions, f.inventory);
  const comparison = f.control.comparisons[0], observation = f.supplemental.observations[0];
  Object.assign(observation, { case: comparison.case, source: 'browser-control-natural-css-line-box',
    checkpointReferenceNode: comparison.referenceNode, checkpointCandidateNode: comparison.astylarNode,
    checkpointPaint: comparison.properties.lineHeight.painted, checkpointTypography: JSON.parse(JSON.stringify(comparison.properties)) });
  return f;
}

function observedSnackbarLineBoxFixture(parentSize = '16px', state = 'activate') {
  const raw = snackbarActionSizeReport(parentSize), entry = raw.results[0];
  Object.assign(entry, { kind: 'interaction', state }); raw.results = []; raw.interactions = [entry];
  const inventory = collectFullTreeInventory(raw.interactions), control = collectControlTypographyEvidence(raw.interactions, inventory);
  const comparison = control.comparisons[0], supplemental = observedInteractiveLineBoxFixture(state).supplemental;
  Object.assign(supplemental.observations[0], { case: comparison.case, element: comparison.element,
    referenceNode: comparison.referenceNode, checkpointReferenceNode: comparison.referenceNode,
    checkpointCandidateNode: comparison.astylarNode, text: comparison.text, naturalHeight: 17,
    checkpointPaint: comparison.properties.lineHeight.painted,
    checkpointTypography: JSON.parse(JSON.stringify(comparison.properties)) });
  return { raw, inventory, control, supplemental };
}

function observedSupplementalLineBoxFixture(family = 'tooltip', state = 'tooltip-state-ordinary-hover', dpr = 1) {
  const f = observedInteractiveLineBoxFixture(state), key = `supplemental:${family}@light/${family === 'tooltip' ? 'tooltip-state' : 'calendar-close'}-desktop-dpr${dpr}/${state}`;
  for (const entry of [...f.control.comparisons, ...f.control.differences]) Object.assign(entry, { case: key, family, state });
  for (const entry of f.inventory.cases) entry.case = key;
  f.supplemental.observations[0].case = key;
  if (family === 'datepicker') {
    const comparison = f.control.comparisons[0];
    comparison.mapping.kind = 'reviewed-material-calendar-period-composition';
    comparison.referenceText = comparison.text; comparison.text += ' ▾';
  }
  return f;
}

test('supplemental line-box attribution preserves original scalar and other inputs across all measured cohorts', () => {
  for (const dpr of [1, 2]) for (const [family, states] of [
    ['datepicker', ['month', 'multi-year'].flatMap(view => ['opened', 'tab-close', 'blur-close', 'refocus-close'].map(state => `calendar-close-${view}-${state}`))],
    ['tooltip', ['benchmark-open', 'benchmark-hover', 'ordinary'].flatMap(cohort => ['initial', 'hover', 'press', 'release', 'leave'].map(state => `tooltip-state-${cohort}-${state}`))],
  ]) for (const state of states) {
    const f = observedSupplementalLineBoxFixture(family, state, dpr), before = structuredClone(f);
    const result = attributeObservedSupplementalLineBoxes(f.control, f.inventory, f.supplemental);
    const line = result.differences.find(d => d.property === 'lineHeight');
    assert.equal(line.attribution, 'reviewed-supplemental-normal-line-box-stage-comparison', state);
    assert.equal(line.classification, 'parity-harness-defect'); assert.equal(line.reviewEvidence.observation.naturalHeight, 32);
    assert.equal(line.values.reference, 'normal'); assert.equal(line.values.painted, '32px');
    assert.equal(line.reviewEvidence.inputEquivalent, false); assert.equal(line.reviewEvidence.finalRasterVerified, false);
    assert.deepEqual(result.comparisons, f.control.comparisons);
    assert.deepEqual(result.differences.filter(d => d.property !== 'lineHeight'), f.control.differences.filter(d => d.property !== 'lineHeight'));
    assert.deepEqual(f, before);
    assert.deepEqual(attributeObservedControlLineBoxes(f.control, f.inventory, f.supplemental), f.control, 'supplemental evidence cannot enter main attribution');
  }
  const main = observedInteractiveLineBoxFixture();
  assert.deepEqual(attributeObservedSupplementalLineBoxes(main.control, main.inventory, main.supplemental), main.control);
});

test('supplemental line-box attribution rejects mismapped states owners metrics and candidate typography overrides', () => {
  const mutations = [
    f => { f.supplemental.errors.push('invalid'); }, f => { delete f.supplemental.sha256; },
    f => { f.supplemental.observations = []; }, f => { f.supplemental.observations.push(f.supplemental.observations[0]); },
    f => { f.control.comparisons[0].family = 'button'; },
    f => { f.control.comparisons[0].case = f.control.comparisons[0].case.replace('ordinary', 'unknown'); },
    f => { f.control.comparisons[0].case = f.control.comparisons[0].case.replace('dpr1', 'dpr3'); },
    f => { f.control.comparisons[0].state = 'static'; },
    f => { f.control.comparisons[0].source = 'plugin-private'; },
    f => { f.control.comparisons[0].mapping.kind = 'inferred-text'; },
    f => { f.supplemental.observations[0].case += '-different'; },
    f => { f.supplemental.observations[0].checkpointCandidateNode = 'other'; },
    f => { f.supplemental.observations[0].checkpointReferenceNode = 'other'; },
    f => { f.supplemental.observations[0].text = 'other'; },
    f => { f.supplemental.observations[0].naturalHeight = 33; },
    f => { f.supplemental.observations[0].fontReady = false; },
    f => { f.supplemental.observations[0].checkpointPaint = '33px'; },
    f => { f.supplemental.observations[0].checkpointTypography.fontSize.painted = '99px'; },
    f => { f.supplemental.observations[0].inputEquivalent = true; },
    f => { f.supplemental.observations[0].finalRasterVerified = true; },
    f => { f.inventory.errors.push({ case: f.control.comparisons[0].case }); },
    f => { const tree = f.inventory.variants.find(t => t.side === 'astylar'); tree.nodes[0].parent = 'missing'; },
    f => { const tree = f.inventory.variants.find(t => t.side === 'astylar'); f.inventory.styles[tree.nodes[0].normalStyle].value.lineHeight = '32px'; },
    f => { const tree = f.inventory.variants.find(t => t.side === 'astylar'); f.inventory.styles[tree.nodes[1].interactionStyle].value.font = '24px/32px Arial'; },
  ];
  for (const mutate of mutations) {
    const f = observedSupplementalLineBoxFixture(); mutate(f);
    assert.ok(attributeObservedSupplementalLineBoxes(f.control, f.inventory, f.supplemental).differences
      .filter(d => d.property === 'lineHeight').every(d => d.attribution === 'unresolved'), String(mutate));
  }
});

test('supplemental line-box report validation rejects detached stage and scalar claims', () => {
  for (const mutation of ['missing stage', 'forged observation', 'forged source', 'invented difference', 'moved difference', 'fabricated comparison']) {
    const report = buildMaterialInputAudit(parityReport({}, {})), errors = [];
    if (mutation === 'missing stage') delete report.supplementalLineBoxes;
    if (mutation === 'forged observation') report.supplementalLineBoxes.observations.push({ case: 'invented', naturalHeight: 17 });
    if (mutation === 'forged source') report.supplementalLineBoxes.file = 'artifacts/material-parity/missing-metrics/latest-report.json';
    if (['invented difference', 'moved difference', 'fabricated comparison'].includes(mutation)) {
      const f = observedSupplementalLineBoxFixture(), result = attributeObservedSupplementalLineBoxes(f.control, f.inventory, f.supplemental);
      if (mutation === 'fabricated comparison') report.controlTypography.comparisons.push(...result.comparisons);
      else {
        const line = result.differences.find(d => d.property === 'lineHeight');
        if (mutation === 'moved difference') line.case = 'static:tooltip@light/desktop';
        report.controlTypography.differences.push(line);
      }
    }
    validateSupplementalLineBoxInventory(report, errors, { requireComplete: false });
    assert.ok(errors.some(e => /supplemental (?:natural|normal)-line-box/.test(e)), mutation);
  }
});

test('snackbar observed line-box size dependency joins measured state and original token/default provenance', () => {
  for (const size of ['14.4px', '16px', '18.4px']) for (const state of ['activate', 'open', 'hover', 'held', 'focus', 'open-dismiss']) {
    const f = observedSnackbarLineBoxFixture(size, state), before = structuredClone(f);
    const result = attributeObservedControlLineBoxes(f.control, f.inventory, f.supplemental);
    const line = result.differences.find(d => d.property === 'lineHeight');
    assert.equal(line.attribution, 'reviewed-snackbar-normal-line-box-size-dependency', `${size}/${state}`);
    assert.equal(line.classification, 'application-plugin-authoring-defect');
    assert.equal(line.inputEquivalent, false); assert.equal(line.finalRasterVerified, false);
    assert.equal(line.reviewEvidence.sizeInput.attribution, 'reviewed-snackbar-action-size-token-omission');
    assert.equal(line.reviewEvidence.sizeInput.reviewEvidence.candidateChain.at(-1).normal.fontSize, size);
    assert.equal(line.reviewEvidence.candidateOmissionChain.length, 5);
    assert.equal(line.reviewEvidence.observation.naturalHeight, 17);
    assert.equal(line.values.reference, 'normal'); assert.equal(line.values.painted, '19px');
    assert.deepEqual(result.comparisons, f.control.comparisons);
    assert.deepEqual(result.differences.filter(d => d.property !== 'lineHeight'), f.control.differences.filter(d => d.property !== 'lineHeight'));
    assert.deepEqual(f, before);
  }
});

test('snackbar observed line-box size dependency rejects changed metrics fonts or detached provenance', () => {
  const referenceTree = f => f.inventory.variants.find(t => t.side === 'reference');
  const candidateTree = f => f.inventory.variants.find(t => t.side === 'astylar');
  const controls = [
    f => { f.supplemental.errors.push('bad capture'); },
    f => { f.supplemental.observations = []; },
    f => { f.supplemental.observations.push(f.supplemental.observations[0]); },
    f => { f.supplemental.observations[0].naturalHeight = 18; },
    f => { f.supplemental.observations[0].fontReady = false; },
    f => { f.supplemental.observations[0].checkpointCandidateNode = 'other'; },
    f => { f.supplemental.observations[0].checkpointPaint = '20px'; },
    f => { f.supplemental.observations[0].checkpointTypography.fontSize.painted = '18px'; },
    f => { f.control.comparisons[0].family = 'menu'; },
    f => { f.control.comparisons[0].mapping.kind = 'reviewed-material-button-label'; },
    f => { f.control.comparisons[0].text = f.supplemental.observations[0].text = 'Other'; },
    f => { f.control.comparisons[0].properties.lineHeight.painted = f.supplemental.observations[0].checkpointPaint = '20px'; },
    f => { f.control.comparisons[0].properties.fontSize.painted = '18px'; },
    f => { f.control.comparisons[0].properties.fontWeight.painted = '700'; },
    f => { f.control.comparisons[0].properties.fontStyle.painted = 'italic'; },
    f => { f.control.comparisons[0].properties.fontFamily.painted = 'arial,sans-serif'; },
    f => { f.inventory.cases = f.inventory.cases.filter(c => c.side !== 'reference'); },
    f => { referenceTree(f).ruleEvidenceComplete = false; },
    f => { candidateTree(f).ruleEvidenceComplete = false; },
    f => { referenceTree(f).nodes.find(n => n.key === 'label').parent = 'other'; },
    f => { referenceTree(f).nodes.find(n => n.key === 'label').inline = { fontSize: '14px' }; },
    f => { f.inventory.rules.find(r => r.side === 'reference' && r.value.declarations?.['font-size']?.value?.startsWith('var(')).value.declarations['font-size'].value = '14px'; },
    f => { f.inventory.rules.find(r => r.side === 'astylar' && r.value.selector === '.overlay-dismiss').value.fontSize = '16px'; },
    f => { f.inventory.styles[candidateTree(f).nodes.find(n => n.key === 'page').normalStyle].value.fontSize = '30px'; },
    f => { f.inventory.styles[candidateTree(f).nodes[0].interactionStyle].value.lineHeight = '19px'; },
    f => { f.control.differences.push(structuredClone(f.control.differences.find(d => d.property === 'lineHeight'))); },
  ];
  for (const [index, mutate] of controls.entries()) {
    const f = observedSnackbarLineBoxFixture(); mutate(f);
    // Keep the recorded typography consistent for comparison mutations, so
    // they must fail the root-cause guard, not just a stale JSON witness.
    if (index >= 8) f.supplemental.observations[0].checkpointTypography = JSON.parse(JSON.stringify(f.control.comparisons[0].properties));
    const result = attributeObservedControlLineBoxes(f.control, f.inventory, f.supplemental);
    assert.ok(result.differences.filter(d => d.property === 'lineHeight').every(d => d.attribution === 'unresolved'), `control ${index}`);
  }
});

test('snackbar observed line-box report replay rejects missing observations forged acceptance and removed scalars', () => {
  for (const mutation of ['unbound supplement', 'removed difference', 'removed comparison', 'changed scalar', 'false equivalence', 'wrong classification', 'changed case']) {
    const f = observedSnackbarLineBoxFixture(), report = buildMaterialInputAudit(f.raw);
    const result = attributeObservedControlLineBoxes(f.control, f.inventory, f.supplemental);
    const line = result.differences.find(d => d.property === 'lineHeight');
    if (mutation === 'unbound supplement') report.controlLineBoxes = f.supplemental;
    if (mutation === 'removed difference') result.differences = result.differences.filter(d => d !== line);
    if (mutation === 'removed comparison') result.comparisons = [];
    if (mutation === 'changed scalar') line.values.painted = '17px';
    if (mutation === 'false equivalence') line.inputEquivalent = line.reviewEvidence.inputEquivalent = true;
    if (mutation === 'wrong classification') line.classification = 'equivalent-representation';
    if (mutation === 'changed case') line.case = 'static:snack-bar@light/desktop';
    report.controlTypography = result;
    assert.ok(validateMaterialInputAudit(report, { requireComplete: false }).some(e => /interactive (?:natural|normal)-line-box/.test(e)), mutation);
  }
});

test('interactive line-box attribution explains only the exact scalar stage difference in each observed state', () => {
  for (const state of ['hover', 'held', 'focus', 'activate', 'open', 'open-dismiss']) {
    const f = observedInteractiveLineBoxFixture(state), before = structuredClone(f);
    const result = attributeObservedControlLineBoxes(f.control, f.inventory, f.supplemental);
    const line = result.differences.find(d => d.property === 'lineHeight');
    assert.equal(line.attribution, 'reviewed-interactive-normal-line-box-stage-comparison', state);
    assert.equal(line.classification, 'parity-harness-defect'); assert.equal(line.reviewEvidence.observation.naturalHeight, 32);
    assert.equal(line.values.reference, 'normal'); assert.equal(line.values.painted, '32px');
    assert.equal(line.reviewEvidence.inputEquivalent, false); assert.equal(line.reviewEvidence.finalRasterVerified, false);
    assert.equal(line.reviewEvidence.candidateOmissionChain.length, 2);
    assert.deepEqual(result.comparisons, f.control.comparisons);
    assert.deepEqual(result.differences.filter(d => d.property !== 'lineHeight'), f.control.differences.filter(d => d.property !== 'lineHeight'));
    assert.deepEqual(f, before);
  }
});

test('interactive line-box attribution retains unequal fonts tracking and period glyph composition', () => {
  const f = observedInteractiveLineBoxFixture(), entry = f.raw.interactions[0];
  entry.inputTrees.astylar.nodes[0].paintedControlText.style.fontFamily = 'Arial, sans-serif';
  entry.inputTrees.astylar.nodes[0].paintedControlText.style.letterSpacing = 1;
  f.inventory = collectFullTreeInventory(f.raw.interactions); f.control = collectControlTypographyEvidence(f.raw.interactions, f.inventory);
  const comparison = f.control.comparisons[0], observation = f.supplemental.observations[0];
  observation.checkpointTypography = JSON.parse(JSON.stringify(comparison.properties));
  comparison.mapping.kind = 'reviewed-material-calendar-period-composition'; comparison.referenceText = comparison.text;
  comparison.text += ' ▾';
  const result = attributeObservedControlLineBoxes(f.control, f.inventory, f.supplemental);
  assert.equal(result.differences.find(d => d.property === 'lineHeight').attribution, 'reviewed-interactive-normal-line-box-stage-comparison');
  assert.equal(result.comparisons[0].text, comparison.text);
  for (const property of ['fontFamily', 'letterSpacing']) assert.deepEqual(result.differences.find(d => d.property === property), f.control.differences.find(d => d.property === property));
});

test('interactive line-box attribution refuses detached observations substituted metrics or authoring changes', () => {
  const mutations = [
    f => { f.supplemental.errors.push('bad evidence'); }, f => { delete f.supplemental.sha256; },
    f => { f.supplemental.observations = []; }, f => { f.supplemental.observations.push(f.supplemental.observations[0]); },
    f => { f.supplemental.observations[0].source = 'browser-natural-single-line-box'; },
    f => { f.supplemental.observations[0].case += '-different'; }, f => { f.supplemental.observations[0].element = 'other'; },
    f => { f.supplemental.observations[0].referenceNode = 'other'; }, f => { f.supplemental.observations[0].text = 'other'; },
    f => { f.supplemental.observations[0].fontReady = false; }, f => { f.supplemental.observations[0].naturalHeight = 33; },
    f => { f.supplemental.observations[0].naturalHeight = 0; }, f => { delete f.supplemental.observations[0].evidence.sha256; },
    f => { f.supplemental.observations[0].checkpointCandidateNode = 'other'; },
    f => { f.supplemental.observations[0].checkpointReferenceNode = 'other'; },
    f => { f.supplemental.observations[0].checkpointPaint = '33px'; },
    f => { f.supplemental.observations[0].checkpointTypography.fontSize.painted = '99px'; },
    f => { f.supplemental.observations[0].inputEquivalent = true; }, f => { f.supplemental.observations[0].finalRasterVerified = true; },
    f => { f.control.comparisons[0].mapping.kind = 'inferred-text'; }, f => { f.control.comparisons[0].state = 'static'; },
    f => { f.control.comparisons[0].source = 'plugin-private-text'; },
    f => { f.control.comparisons[0].properties.fontSize.painted = '25px'; f.supplemental.observations[0].checkpointTypography.fontSize.painted = '25px'; },
    f => { f.control.comparisons[0].properties.fontWeight.painted = '700'; f.supplemental.observations[0].checkpointTypography.fontWeight.painted = '700'; },
    f => { f.inventory.errors.push({ case: f.control.comparisons[0].case }); },
    f => { const tree = f.inventory.variants.find(t => t.side === 'astylar'); tree.nodes[0].parent = 'missing'; },
    f => { const tree = f.inventory.variants.find(t => t.side === 'astylar'); tree.nodes[0].parent = tree.nodes[0].key; },
    f => { const tree = f.inventory.variants.find(t => t.side === 'astylar'); f.inventory.styles[tree.nodes[0].normalStyle].value.lineHeight = '32px'; },
    f => { const tree = f.inventory.variants.find(t => t.side === 'astylar'); f.inventory.styles[tree.nodes[1].interactionStyle].value.font = '24px/32px Arial'; },
    f => { f.control.differences.push(structuredClone(f.control.differences.find(d => d.property === 'lineHeight'))); },
  ];
  for (const mutate of mutations) {
    const f = observedInteractiveLineBoxFixture(); mutate(f);
    const result = attributeObservedControlLineBoxes(f.control, f.inventory, f.supplemental);
    assert.ok(result.differences.filter(d => d.property === 'lineHeight').every(d => d.attribution === 'unresolved'), String(mutate));
  }
});

test('interactive line-box report validation rejects removed differences and forged evidence instead of trusting metadata', () => {
  for (const mutation of ['missing report', 'missing targets', 'removed comparisons', 'changed comparison', 'removed differences', 'invented attribution', 'forged supplement']) {
    const f = observedInteractiveLineBoxFixture(), report = buildMaterialInputAudit(f.raw);
    if (mutation === 'missing report') delete report.controlLineBoxes;
    if (mutation === 'missing targets') report.controlLineBoxes.missing = [];
    if (mutation === 'removed comparisons') report.controlTypography.comparisons = [];
    if (mutation === 'changed comparison') report.controlTypography.comparisons[0].properties.fontSize.painted = '99px';
    if (mutation === 'removed differences') report.controlTypography.differences = report.controlTypography.differences.filter(d => d.property !== 'lineHeight');
    if (mutation === 'invented attribution') report.controlTypography.differences.find(d => d.property === 'lineHeight').attribution = 'reviewed-interactive-normal-line-box-stage-comparison';
    if (mutation === 'forged supplement') {
      report.controlLineBoxes = f.supplemental;
      report.controlTypography = attributeObservedControlLineBoxes(f.control, f.inventory, f.supplemental);
    }
    assert.ok(validateMaterialInputAudit(report, { requireComplete: false }).some(e => e.includes('interactive natural-line-box') || e.includes('interactive normal-line-box')), mutation);
  }
  const f = observedInteractiveLineBoxFixture(), report = buildMaterialInputAudit(f.raw);
  assert.equal(report.controlLineBoxes.missing.length, 1);
  assert.ok(validateMaterialInputAudit(report).some(e => e.includes('interactive normal-line-box observations are missing')));
  const absent = buildMaterialInputAudit(f.raw, { controlLineBoxPath: 'artifacts/material-parity/no-interactive-line-box-report.json' });
  assert.equal(absent.controlLineBoxes.errors.length, 1);
  assert.ok(validateMaterialInputAudit(absent, { requireComplete: false }).some(e => e.includes('interactive natural-line-box evidence errors')));
});

function paginatorIconReport(direction = 'previous') {
  const raw = controlTypographyReport(), entry = raw.results[0];
  entry.family = 'paginator';
  const ref = entry.inputTrees.reference, ast = entry.inputTrees.astylar;
  const previous = direction === 'previous', label = previous ? 'Previous page' : 'Next page', glyph = previous ? '‹' : '›';
  ref.nodes = [
    { key: 'button', parent: 'frame', type: 'button', attributes: { class: `mat-mdc-paginator-navigation-${direction}`, 'aria-label': label }, ownText: '', style: 0, rules: [], pseudoElements: [] },
    { key: 'svg', parent: 'button', type: 'svg', attributes: { class: 'mat-mdc-paginator-icon', viewBox: '0 0 24 24', focusable: 'false', 'aria-hidden': 'true' }, ownText: '', style: 0, rules: [], pseudoElements: [] },
    { key: 'path', parent: 'svg', type: 'path', attributes: { d: previous ? 'M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z' : 'M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z' }, ownText: '', style: 0, rules: [], pseudoElements: [] },
  ];
  ast.nodes[0].authored = { id: `paginator-${direction}`, type: 'button', class: 'paginator-button', ariaLabel: label, value: glyph };
  ast.nodes[0].paintedControlText.text = glyph;
  return raw;
}

test('paginator vector-to-glyph replacements remain unequal content, not fabricated typography comparisons', () => {
  for (const direction of ['previous', 'next']) {
    const raw = paginatorIconReport(direction), before = structuredClone(raw), evidence = controlEvidence(raw);
    assert.deepEqual(evidence.gaps, []);
    assert.deepEqual(evidence.comparisons, []);
    assert.deepEqual(evidence.differences, []);
    assert.equal(evidence.iconSubstitutions.length, 1);
    const finding = evidence.iconSubstitutions[0];
    assert.equal(finding.classification, 'application-plugin-authoring-defect');
    assert.equal(finding.attribution, 'reviewed-paginator-svg-to-glyph-input');
    assert.equal(finding.inputEquivalent, false);
    assert.equal(finding.finalRasterVerified, false);
    assert.equal(finding.reviewEvidence.referencePath.attributes.d, finding.reference.path);
    assert.equal(finding.astylar.painted, finding.astylar.authored);
    assert.equal(finding.reviewEvidence.candidatePaintedStyle.fontSize, 24);
    assert.deepEqual(raw, before);
    const report = buildMaterialInputAudit(raw);
    assert.equal(report.summary.inputEquivalent, false);
    assert.ok(!validateMaterialInputAudit(report).some((error) => error.includes('control icon substitutions')));
    delete report.controlTypography.iconSubstitutions[0].reviewEvidence.referencePath;
    assert.ok(validateMaterialInputAudit(report).some((error) => error.includes('control icon substitutions')));
  }
});

test('paginator icon substitution attribution rejects conflicting identities, geometry and texture provenance', () => {
  const mutations = [
    (ref) => { ref.nodes[0].attributes['aria-label'] = 'Other'; },
    (ref) => { ref.nodes[0].type = 'span'; },
    (ref) => { ref.nodes.push({ ...ref.nodes[0], key: 'duplicate' }); },
    (ref) => { ref.nodes[1].parent = 'other'; },
    (ref) => { ref.nodes[1].attributes.viewBox = '0 0 20 20'; },
    (ref) => { ref.nodes[1].attributes['aria-hidden'] = 'false'; },
    (ref) => { ref.nodes[2].attributes.d = 'M0 0L1 1'; },
    (ref) => { ref.nodes.push({ ...ref.nodes[2], key: 'extra' }); },
    (ref) => { ref.nodes.push({ ...ref.nodes[2], key: 'extra', parent: 'button', type: 'span', ownText: 'Text' }); },
    (ref) => { ref.nodes[2].ownText = 'Text'; },
    (_ref, ast) => { ast.nodes[0].authored.value = '›'; },
    (_ref, ast) => { ast.nodes[0].authored.ariaLabel = 'Next page'; },
    (_ref, ast) => { ast.nodes[0].paintedControlText.text = '›'; },
    (_ref, ast) => { ast.nodes[0].paintedControlText.source = 'core-text-registry'; },
    (_ref, ast) => { ast.nodes[0].paintedControlText.style.fontSize = '24px'; },
    (_ref, ast) => { ast.nodes.push({ ...ast.nodes[0], key: 'duplicate' }); },
    (_ref, ast) => { ast.nodes.push({ key: 'child', parent: ast.nodes[0].key, authored: { type: 'span' }, resolvedStyle: {} }); },
    (_ref, ast) => { ast.paintedControlTextEvidenceVersion = 0; },
  ];
  for (const mutate of mutations) {
    const raw = paginatorIconReport();
    mutate(raw.results[0].inputTrees.reference, raw.results[0].inputTrees.astylar);
    const evidence = controlEvidence(raw);
    assert.deepEqual(evidence.iconSubstitutions, [], String(mutate));
    assert.ok(evidence.gaps.length > 0, String(mutate));
  }
});

test('control typography compares current texture inputs separately from declarations and registry text', () => {
  const raw = controlTypographyReport(), node = raw.results[0].inputTrees.astylar.nodes[0];
  node.normalResolvedStyle.fontSize = '16px';
  node.interactionResolvedStyle.fontSize = '18px';
  node.retainedText.style.fontSize = '20px';
  const before = structuredClone(raw), evidence = controlEvidence(raw);
  assert.equal(evidence.comparisons.length, 1);
  assert.deepEqual(evidence.gaps, []);
  assert.deepEqual(evidence.differences, []);
  const comparison = evidence.comparisons[0];
  assert.deepEqual(comparison.properties.fontSize, { reference: '24px', normal: '16px', effective: '18px', retained: '20px', painted: '24px' });
  assert.equal(comparison.properties.lineHeight.painted, '32px');
  assert.equal(comparison.source, 'core-control-texture');
  assert.equal(comparison.finalRasterVerified, false);
  assert.equal(comparison.mapping.kind, 'reviewed-material-button-label');
  assert.equal(comparison.maxWidth, 120);
  assert.deepEqual(raw, before);
  delete node.retainedText;
  assert.deepEqual(controlEvidence(raw).gaps, [], 'a control need not also have a registry text entry');
  assert.equal(controlEvidence(raw).comparisons[0].properties.fontSize.retained, undefined);
  const ref = raw.results[0].inputTrees.reference.nodes[0];
  ref.attributes = { 'data-parity-id': 'action' };
  assert.equal(controlEvidence(raw).comparisons.length, 1, 'reviewed dialog-style identity is explicit');
});

function tabControlTypographyReport() {
  const raw = controlTypographyReport(), entry = raw.results[0], trees = entry.inputTrees;
  entry.family = 'tabs';
  trees.reference.nodes[0].type = 'div';
  trees.reference.nodes[0].attributes = { id: 'generated-tab-control', role: 'tab', class: 'mdc-tab mat-mdc-tab' };
  trees.reference.nodes[1].parent = 'tab-text';
  trees.reference.nodes[1].attributes = { id: 'tab-overview' };
  trees.reference.nodes[1].ownText = 'Overview';
  trees.reference.nodes.push(
    { key: 'tab-text', parent: 'tab-content', type: 'span', attributes: { class: 'mdc-tab__text-label' }, ownText: '', style: 0, rules: [], pseudoElements: [] },
    { key: 'tab-content', parent: 'button', type: 'span', attributes: { class: 'mdc-tab__content' }, ownText: '', style: 0, rules: [], pseudoElements: [] },
  );
  const node = trees.astylar.nodes[0];
  Object.assign(node.authored, { id: 'tab-overview', value: 'Overview', role: 'tab', class: 'tab' });
  node.paintedControlText.text = 'Overview';
  return raw;
}

test('explicit tab value labels route to the texture stage while unequal typography remains visible', () => {
  const raw = tabControlTypographyReport();
  raw.results[0].inputTrees.astylar.nodes[0].paintedControlText.style.fontSize = 30;
  const report = buildMaterialInputAudit(raw);
  assert.equal(report.retainedTypography.controlTextMappings.length, 1);
  assert.deepEqual(report.retainedTypography.gaps, []);
  assert.ok(report.controlTypography.differences.some((item) => item.property === 'fontSize' && item.attribution === 'unresolved'));
  assert.ok(validateMaterialInputAudit(report).some((error) => error.includes('control texture typography differences')));
});

test('control text maps explicit tab template leaves without equating their wrappers or typography', () => {
  const raw = tabControlTypographyReport(), trees = raw.results[0].inputTrees;
  Object.assign(trees.reference.styles[0], { fontFamily: 'Roboto', lineHeight: '14px', letterSpacing: '.096px' });
  Object.assign(trees.astylar.nodes[0].paintedControlText.style, { fontFamily: 'Roboto, Arial, sans-serif', lineHeight: 20 / 24 });
  const evidence = controlEvidence(raw);
  assert.deepEqual(evidence.gaps, []);
  assert.equal(evidence.comparisons.length, 1);
  assert.equal(evidence.comparisons[0].mapping.kind, 'reviewed-material-tab-label');
  assert.equal(evidence.comparisons[0].referenceControl, 'button');
  assert.equal(evidence.comparisons[0].referenceNode, 'label');
  assert.deepEqual(evidence.differences.map((finding) => finding.property), ['fontFamily', 'lineHeight', 'letterSpacing']);
  assert.ok(evidence.differences.every((finding) => finding.attribution === 'unresolved'));
  assert.equal(buildMaterialInputAudit(raw).summary.inputEquivalent, false);
});

function tabTypographyAttributionReport() {
  const raw = tabControlTypographyReport(), trees = raw.results[0].inputTrees;
  Object.assign(trees.reference.styles[0], { fontFamily: 'Roboto', fontSize: '14px', fontWeight: '500', lineHeight: '20px', letterSpacing: '.096px' });
  trees.reference.styles.push({ ...trees.reference.styles[0], lineHeight: '14px' });
  trees.reference.nodes[1].style = trees.reference.nodes[2].style = 1;
  trees.reference.rules = [
    { selector: '.mat-mdc-tab', active: true, declarations: {
      'font-family': { value: 'var(--mat-tab-label-text-font, var(--mat-sys-title-small-font))' },
      'letter-spacing': { value: 'var(--mat-tab-label-text-tracking, var(--mat-sys-title-small-tracking))' },
    } },
    { selector: '.mdc-tab__text-label', active: true, declarations: { 'line-height': { value: '1' } } },
  ];
  trees.reference.nodes[0].rules = [0];
  trees.reference.nodes[2].rules = [1];
  const node = trees.astylar.nodes[0];
  Object.assign(node.normalResolvedStyle, { fontFamily: 'Roboto, Arial, sans-serif', fontSize: '14px', fontWeight: '500', lineHeight: '20px' });
  Object.assign(node.interactionResolvedStyle, node.normalResolvedStyle);
  delete node.normalResolvedStyle.letterSpacing;
  delete node.interactionResolvedStyle.letterSpacing;
  Object.assign(node.paintedControlText.style, { fontFamily: 'Roboto, Arial, sans-serif', fontSize: 14, fontWeight: '500', lineHeight: 20 / 14 });
  node.parent = 'page';
  trees.astylar.nodes.push({ key: 'page', parent: 'root', authored: { id: 'page', type: 'main' },
    resolvedStyle: {}, normalResolvedStyle: {}, interactionResolvedStyle: {} });
  trees.astylar.rules = [{ selector: '.tab', fontSize: '14px', fontWeight: '500', lineHeight: '20px' },
    { selector: 'button, input, select', fontFamily: 'Roboto, Arial, sans-serif' }];
  return raw;
}

test('tab typography attribution distinguishes token omissions from the nested label line-height rule', () => {
  const raw = tabTypographyAttributionReport(), evidence = controlEvidence(raw);
  assert.deepEqual(evidence.gaps, []);
  assert.equal(evidence.differences.length, 3);
  for (const finding of evidence.differences) {
    assert.equal(finding.classification, 'application-plugin-authoring-defect');
    assert.equal(finding.attribution, 'reviewed-tab-label-typography-input');
    assert.equal(finding.reviewEvidence.referenceChain.length, 4);
    assert.equal(finding.reviewEvidence.sourceFinding, 'fixture-tab-label-typography-flattened');
  }
  assert.equal(evidence.differences.find((entry) => entry.property === 'letterSpacing').reviewEvidence.candidateChain.length, 2);
  assert.equal(evidence.differences.find((entry) => entry.property === 'lineHeight').reviewEvidence.referenceRule.declarations['line-height'].value, '1');
  const report = buildMaterialInputAudit(raw);
  assert.equal(report.summary.inputEquivalent, false);
  assert.ok(!validateMaterialInputAudit(report).some((error) => error.includes('control texture typography differences')));
  delete report.controlTypography.differences[0].reviewEvidence;
  assert.ok(validateMaterialInputAudit(report).some((error) => error.includes('control texture typography differences')));
});

test('tab typography attribution rejects missing, conflicting and duplicate declaration witnesses', () => {
  const mutations = [
    ['fontFamily', (ref) => { ref.rules[0].declarations['font-family'].value = 'Roboto'; }],
    ['fontFamily', (ref, ast) => { ast.rules[0].fontFamily = 'Roboto, Arial, sans-serif'; }],
    ['fontFamily', (ref, ast) => { ast.rules[1].fontFamily = 'Arial'; }],
    ['fontFamily', (ref, ast) => { ast.nodes[0].interactionResolvedStyle.fontFamily = 'Roboto'; }],
    ['fontFamily', (ref) => { ref.rules.push({ active: true, declarations: { 'font-family': { value: 'Roboto' } } }); ref.nodes[1].rules = [2]; }],
    ['letterSpacing', (ref) => { ref.rules[0].active = false; }],
    ['letterSpacing', (ref, ast) => { ast.nodes[1].normalResolvedStyle.letterSpacing = '0px'; }],
    ['letterSpacing', (ref, ast) => { ast.nodes[0].parent = 'missing'; }],
    ['letterSpacing', (ref, ast) => { ast.rules[0].letterSpacing = '0px'; }],
    ['lineHeight', (ref) => { ref.rules[1].declarations['line-height'].value = '14px'; }],
    ['lineHeight', (ref) => { ref.styles[0].lineHeight = '14px'; }],
    ['lineHeight', (ref, ast) => { ast.nodes[0].normalResolvedStyle.lineHeight = '21px'; }],
    ['lineHeight', (ref, ast) => { ast.rules[0].lineHeight = '21px'; }],
    ['lineHeight', (ref) => { ref.rules.push({ active: true, declarations: { 'line-height': { value: '14px' } } }); ref.nodes[1].rules = [2]; }],
    ['lineHeight', (ref, ast) => { ast.rules.push({ ...ast.rules[0] }); }],
  ];
  for (const [property, mutate] of mutations) {
    const raw = tabTypographyAttributionReport();
    mutate(raw.results[0].inputTrees.reference, raw.results[0].inputTrees.astylar);
    const finding = controlEvidence(raw).differences.find((entry) => entry.property === property);
    assert.equal(finding?.attribution, 'unresolved', `${property}: ${mutate}`);
  }
});

test('tab label mapping rejects wrong wrapper paths, roles, text, identities and nested content', () => {
  const mutations = [
    (ref) => { ref.nodes[2].attributes.class = 'other'; },
    (ref) => { ref.nodes[3].attributes.class = 'other'; },
    (ref) => { ref.nodes[0].attributes.role = 'button'; },
    (ref) => { ref.nodes[0].type = 'button'; },
    (ref) => { ref.nodes[2].ownText = 'Additional label'; },
    (ref) => { ref.nodes.push({ ...ref.nodes[3], key: 'duplicate-content' }); },
    (ref) => { ref.nodes.push({ ...ref.nodes[1], key: 'nested', parent: 'label', attributes: {} }); },
    (ref) => { ref.nodes.push({ ...ref.nodes[1], key: 'duplicate' }); },
    (ref) => { ref.nodes[1].attributes.id = 'other'; },
    (ref, ast) => { ast.nodes[0].authored.role = 'button'; },
    (ref, ast) => { ast.nodes[0].paintedControlText.text = 'Activity'; },
    (ref, ast) => { ast.nodes.push({ ...ast.nodes[0], key: 'duplicate' }); },
    (ref, ast) => { delete ast.paintedControlTextEvidenceVersion; },
  ];
  for (const mutate of mutations) {
    const raw = tabControlTypographyReport();
    mutate(raw.results[0].inputTrees.reference, raw.results[0].inputTrees.astylar);
    const evidence = controlEvidence(raw);
    assert.equal(evidence.comparisons.length, 0, String(mutate));
    assert.ok(evidence.gaps.length > 0, String(mutate));
  }
});

test('control typography does not waive font fallback, CSS normal line-height, tracking or composited ink', () => {
  const raw = controlTypographyReport();
  const refStyle = raw.results[0].inputTrees.reference.styles[0];
  Object.assign(refStyle, { lineHeight: 'normal', letterSpacing: '.096px', color: 'rgba(0,0,0,.38)' });
  raw.results[0].inputTrees.astylar.nodes[0].paintedControlText.style.fontFamily = 'Arial, sans-serif';
  const evidence = controlEvidence(raw);
  assert.deepEqual(evidence.differences.map((entry) => entry.property), ['fontFamily', 'lineHeight', 'letterSpacing', 'color']);
  assert.ok(evidence.differences.every((entry) => entry.attribution === 'unresolved'));
  const report = buildMaterialInputAudit(raw);
  assert.equal(report.controlTypography.differences.length, 4);
  assert.equal(report.summary.inputEquivalent, false);
  assert.ok(validateMaterialInputAudit(report).some((error) => error.includes('control texture typography differences')));
  delete report.controlTypography;
  assert.ok(validateMaterialInputAudit(report).includes('missing control texture typography stage report'));
});

function buttonTrackingReport(kind = 'filled') {
  const raw = controlTypographyReport(), trees = raw.results[0].inputTrees;
  trees.reference.styles[0].letterSpacing = '.096px';
  trees.reference.rules = [{ selector: kind === 'filled' ? '.mat-mdc-unelevated-button' : '.mat-mdc-outlined-button',
    active: true, declarations: { 'letter-spacing': { value: `var(--mat-button-${kind}-label-text-tracking, var(--mat-sys-label-large-tracking))` } } }];
  trees.reference.nodes[0].rules = [0];
  const node = trees.astylar.nodes[0];
  node.authored.class = 'material-button';
  delete node.normalResolvedStyle.letterSpacing;
  delete node.interactionResolvedStyle.letterSpacing;
  node.parent = 'page';
  trees.astylar.nodes.push({ key: 'page', parent: 'root', authored: { id: 'page', type: 'main' },
    resolvedStyle: {}, normalResolvedStyle: {}, interactionResolvedStyle: {} });
  trees.astylar.rules = [{ selector: '.material-button', fontSize: '14px', fontWeight: '500' }];
  return raw;
}

test('button tracking attribution requires captured token and complete candidate omission witnesses', () => {
  for (const kind of ['filled', 'outlined']) {
    const raw = buttonTrackingReport(kind), evidence = controlEvidence(raw);
    assert.deepEqual(evidence.gaps, []);
    assert.equal(evidence.differences.length, 1);
    const finding = evidence.differences[0];
    assert.equal(finding.attribution, 'reviewed-button-tracking-input');
    assert.equal(finding.classification, 'application-plugin-authoring-defect');
    assert.equal(finding.reviewEvidence.candidateChain.length, 2);
    assert.equal(finding.reviewEvidence.referenceComputed, '0.096px');
    assert.equal(finding.reviewEvidence.candidatePainted, '0');
    const report = buildMaterialInputAudit(raw);
    assert.equal(report.summary.inputEquivalent, false, 'classified inequality is not accepted equivalence');
    assert.ok(!validateMaterialInputAudit(report).some((error) => error.includes('control texture typography differences')));
    delete report.controlTypography.differences[0].reviewEvidence;
    assert.ok(validateMaterialInputAudit(report).some((error) => error.includes('control texture typography differences')));
  }
  const mutations = [
    (ref) => { ref.rules[0].active = false; },
    (ref) => { ref.rules[0].selector = '.other'; },
    (ref) => { ref.rules[0].declarations['letter-spacing'].value = '.096px'; },
    (ref) => { ref.rules.push({ active: true, declarations: { 'letter-spacing': { value: 'normal' } } }); ref.nodes[1].rules = [1]; },
    (ref, ast) => { ast.nodes[0].normalResolvedStyle.letterSpacing = '0px'; },
    (ref, ast) => { ast.nodes[1].interactionResolvedStyle.letterSpacing = '.1px'; },
    (ref, ast) => { ast.nodes[0].parent = 'absent'; },
    (ref, ast) => { ast.nodes[1].parent = 'not-root'; },
    (ref, ast) => { ast.rules[0].letterSpacing = '0'; },
    (ref, ast) => { ast.rules.push({ ...ast.rules[0] }); },
    (ref, ast) => { ast.nodes[0].authored.class = 'different'; },
  ];
  for (const mutate of mutations) {
    const raw = buttonTrackingReport();
    mutate(raw.results[0].inputTrees.reference, raw.results[0].inputTrees.astylar);
    assert.equal(controlEvidence(raw).differences[0].attribution, 'unresolved', String(mutate));
  }
});

function disabledButtonInkReport() {
  const raw = controlTypographyReport(), trees = raw.results[0].inputTrees;
  trees.reference.nodes[0].attributes = { id: 'button-disabled', disabled: '' };
  trees.reference.styles[0].color = 'rgba(29,27,32,.38)';
  trees.reference.rules = [{ active: true,
    selector: '.mat-mdc-unelevated-button[disabled], .mat-mdc-unelevated-button.mat-mdc-button-disabled',
    declarations: { color: { value: 'var(--mat-button-filled-disabled-label-text-color, color-mix(in srgb, var(--mat-sys-on-surface) 38%, transparent))' } } }];
  trees.reference.nodes[0].rules = [0];
  const node = trees.astylar.nodes[0];
  Object.assign(node.authored, { id: 'button-disabled', disabled: true });
  node.normalResolvedStyle.color = node.interactionResolvedStyle.color = node.paintedControlText.style.color = '#a4a0a7';
  trees.astylar.rules = [{ selector: '#button-disabled', color: '#a4a0a7' }];
  return raw;
}

function buttonHostTypographyReport(property = 'fontFamily', kind = 'filled') {
  const raw = property === 'letterSpacing' ? buttonTrackingReport(kind) : controlTypographyReport();
  const e = raw.results[0], trees = e.inputTrees, ref = trees.reference, ast = trees.astylar, node = ast.nodes[0];
  if (property === 'fontFamily') {
    ref.styles[0].fontFamily = 'Roboto';
    ref.rules = [{ active: true, selector: ({ filled: '.mat-mdc-unelevated-button', outlined: '.mat-mdc-outlined-button', text: '.mat-mdc-button' })[kind],
      declarations: { 'font-family': { value: `var(--mat-button-${kind}-label-text-font, var(--mat-sys-label-large-font))` } } }];
    ref.nodes[0].rules = [0];
    node.authored.class = kind === 'text' ? 'text-button' : 'material-button';
    node.normalResolvedStyle.fontFamily = node.interactionResolvedStyle.fontFamily = node.paintedControlText.style.fontFamily = 'Roboto, Arial, sans-serif';
    ast.rules = [{ selector: 'button, input, select', fontFamily: 'Roboto, Arial, sans-serif' },
      { selector: `.${node.authored.class}`, fontSize: '14px' }];
  }
  ref.nodes[0].inline = {};
  node.resolvedStyle = { ...node.normalResolvedStyle };
  e.styleInputs = [{ id: 'action', reference: { ...ref.styles[0] }, astylar: { ...node.resolvedStyle },
    astylarNormalResolvedStyle: { ...node.normalResolvedStyle }, astylarInteractionResolvedStyle: { ...node.interactionResolvedStyle },
    astylarResolvedStyleEvidenceVersion: 2,
    referenceStructure: { schemaVersion: 2, type: 'button', text: 'Action', descendantIds: [] },
    astylarStructure: { schemaVersion: 2, type: 'button', text: 'Action', ownText: 'Action', directChildIds: [], descendantIds: [] },
    referenceAuthored: structuredClone(ref.rules),
    astylarAuthored: ast.rules.map(({ selector, ...declarations }) => ({ selector, declarations: { ...declarations } })),
  }];
  return raw;
}

test('button host typography scalars retain the demonstrated component input cause across states', () => {
  for (const [property, kind] of [['fontFamily', 'filled'], ['fontFamily', 'outlined'], ['fontFamily', 'text'],
    ['letterSpacing', 'filled'], ['letterSpacing', 'outlined']]) for (const state of [undefined, 'hover', 'held', 'focus', 'disabled']) {
    const raw = buttonHostTypographyReport(property, kind);
    if (state) { raw.results[0].state = state; raw.interactions = raw.results; raw.results = []; }
    const before = JSON.stringify(raw), audit = buildMaterialInputAudit(raw);
    const proofs = audit.buttonTypographyScalarInputs.filter(p => p.element === 'action');
    assert.equal(proofs.length, 1);
    assert.equal(proofs[0].property, property);
    const finding = audit.discrepancies.find(d => d.attribution === 'reviewed-button-typography-host-input');
    assert.equal(finding?.property, property);
    assert.equal(finding.classification, 'application-plugin-authoring-defect');
    assert.equal(finding.reference, property === 'fontFamily' ? 'roboto' : '0.096px');
    assert.equal(finding.astylar, property === 'fontFamily' ? 'roboto,arial,sans-serif' : undefined);
    assert.equal(finding.reviewEvidence.values.painted, property === 'fontFamily' ? 'roboto,arial,sans-serif' : '0');
    assert.equal(finding.reviewEvidence.inputEquivalent, false);
    assert.equal(finding.reviewEvidence.finalRasterVerified, false);
    assert.equal(finding.reviewEvidence.referenceNode, 'button');
    assert.equal(finding.reviewEvidence.referenceLabel, 'label');
    assert.equal(audit.summary.inputEquivalent, false);
    // This reduced control-only fixture deliberately has no showcase root.
    // Keep that coverage failure visible; all ownership validation must pass.
    assert.deepEqual(validateMaterialInputAudit(audit, { requireComplete: false }), ['1 cases lack paired root style evidence']);
    assert.equal(JSON.stringify(raw), before);
  }
});

test('button host typography rejects disconnected scalar stages and unproved source or paint owners', () => {
  const mutations = [
    e => { e.styleInputs[0].referenceStructure.type = 'span'; },
    e => { e.styleInputs[0].astylarStructure.type = 'showcase.material:label'; },
    e => { e.styleInputs[0].referenceStructure.schemaVersion = 1; },
    e => { e.styleInputs[0].astylarResolvedStyleEvidenceVersion = 1; },
    e => { e.styleInputs[0].referenceStructure.text = 'Different'; },
    e => { e.styleInputs[0].astylarStructure.ownText = 'Different'; },
    e => { delete e.styleInputs[0].astylarNormalResolvedStyle; },
    e => { e.styleInputs[0].astylarNormalResolvedStyle.fontFamily = 'Arial'; },
    e => { e.styleInputs[0].astylarInteractionResolvedStyle.fontFamily = 'Arial'; },
    e => { e.styleInputs[0].astylar.fontFamily = 'Arial'; },
    e => { e.styleInputs[0].reference.fontFamily = 'Arial'; },
    e => { delete e.styleInputs[0].referenceAuthored; },
    e => { delete e.styleInputs[0].astylarAuthored; },
    e => { e.styleInputs[0].referenceAuthored[0].declarations['font-family'].value = 'Roboto'; },
    e => { e.styleInputs[0].astylarAuthored[0].declarations.fontFamily = 'Arial'; },
    e => { e.styleInputs[0].astylarAuthored[1].declarations.fontFamily = 'Roboto, Arial, sans-serif'; },
    e => { e.inputTrees.astylar.nodes[0].resolvedStyle.fontFamily = 'Arial'; },
    e => { e.inputTrees.astylar.nodes[0].paintedControlText.source = 'core-text-registry'; },
    e => { e.inputTrees.astylar.nodes[0].paintedControlText.text = 'Other'; },
    e => { e.inputTrees.astylar.nodes[0].paintedControlText.style.fontFamily = 'Roboto, Arial, Helvetica, sans-serif'; },
    e => { e.inputTrees.astylar.paintedControlTextEvidenceVersion = 0; },
    e => { e.inputTrees.astylar.resolvedStyleEvidenceVersion = 1; },
    e => { e.inputTrees.astylar.resolvedStyleRevision = -1; },
    e => { e.inputTrees.astylar.resolvedStyleSource = 'mesh-metadata'; },
    e => { delete e.inputTrees.reference.nodes[0].inline; },
    e => { e.inputTrees.reference.nodes[0].inline = { 'font-family': { value: 'Roboto' } }; },
    e => { e.inputTrees.astylar.nodes[0].authored.style = { fontFamily: 'Roboto, Arial, sans-serif' }; },
    e => { e.inputTrees.astylar.rules.push({ selector: '.material-button:hover', fontFamily: 'Roboto, Arial, sans-serif' }); },
    e => { e.inputTrees.astylar.rules.push({ selector: ':is(.material-button)', font: '14px Roboto' }); },
    e => { e.inputTrees.astylar.rules.push({ selector: '.unrelated div', all: 'initial' }); },
    e => { e.inputTrees.astylar.rules.push({ selector: '#other', nested: { fontFamily: 'Arial' } }); },
    e => { delete e.inputTrees.astylar.rules; },
    e => { e.inputTrees.reference.nodes.push(structuredClone(e.inputTrees.reference.nodes[0])); },
    e => { e.inputTrees.astylar.nodes.push(structuredClone(e.inputTrees.astylar.nodes[0])); },
    e => { e.inputTrees.reference.errors.push('incomplete'); },
  ];
  for (const mutate of mutations) {
    const raw = buttonHostTypographyReport(); mutate(raw.results[0]);
    assert.ok(buildMaterialInputAudit(raw).discrepancies.every(d => d.attribution !== 'reviewed-button-typography-host-input'), String(mutate));
  }
  for (const mutate of [
    e => { e.styleInputs[0].astylar.letterSpacing = '0'; },
    e => { e.styleInputs[0].astylarAuthored[0].declarations.letterSpacing = '0'; },
    e => { e.inputTrees.astylar.rules.push({ selector: '.material-button:hover', letterSpacing: '0' }); },
    e => { e.inputTrees.astylar.nodes[1].interactionResolvedStyle.letterSpacing = '0'; },
  ]) {
    const raw = buttonHostTypographyReport('letterSpacing'); mutate(raw.results[0]);
    assert.ok(buildMaterialInputAudit(raw).discrepancies.every(d => d.attribution !== 'reviewed-button-typography-host-input'), String(mutate));
  }
});

test('button host typography scalar validation replays causes and preserves every reviewed case', () => {
  const raw = buttonHostTypographyReport();
  raw.results = Array.from({ length: 15 }, (_, i) => ({ ...structuredClone(raw.results[0]), state: `state-${i}` }));
  const audit = buildMaterialInputAudit(raw);
  const find = a => a.discrepancies.find(d => d.attribution === 'reviewed-button-typography-host-input');
  assert.equal(find(audit).cases.length, 12);
  assert.equal(find(audit).reviewedCases.length, 15);
  assert.equal(find(audit).occurrences, 15);
  const cause = a => a.controlTypography.differences.find(d => d.attribution === 'reviewed-button-font-token-input');
  for (const mutate of [
    a => { delete a.buttonTypographyScalarInputs; },
    a => { a.buttonTypographyScalarInputs[0].referenceLabel = 'other'; },
    a => { a.buttonTypographyScalarInputs[0].causeEvidence.candidatePainted = 'Arial'; },
    a => { a.buttonTypographyScalarInputs[0].inputEquivalent = true; },
    a => { a.elementInventory.variants.find(v => v.side === 'reference').ruleEvidenceComplete = false; },
    a => { a.elementInventory.cases.push(structuredClone(a.elementInventory.cases[0])); },
    a => { a.controlTypography.differences = a.controlTypography.differences.filter(d => d !== cause(a)); },
    a => { cause(a).reviewEvidence.referenceComputed = 'Arial'; },
    a => { cause(a).values.painted = 'Arial'; },
    a => { find(a).classification = 'equivalent-representation'; },
    a => { find(a).property = 'lineHeight'; },
    a => { find(a).astylar = 'Roboto'; },
    a => { find(a).reviewedCases.pop(); },
    a => { find(a).reviewedCases[0] = find(a).reviewedCases[1]; },
    a => { find(a).reviewedCases[0] = 'missing'; },
  ]) {
    const changed = structuredClone(audit); mutate(changed);
    assert.ok(validateMaterialInputAudit(changed, { requireComplete: false }).some(e => e.includes('button typography scalar')), String(mutate));
  }
});

test('button font-family attribution requires the missing component override, not merely a common first font', () => {
  function fixture(kind = 'filled') {
    const raw = controlTypographyReport(), trees = raw.results[0].inputTrees;
    trees.reference.styles[0].fontFamily = 'Roboto';
    trees.reference.rules = [{ active: true, selector: ({ filled: '.mat-mdc-unelevated-button', outlined: '.mat-mdc-outlined-button', text: '.mat-mdc-button' })[kind],
      declarations: { 'font-family': { value: `var(--mat-button-${kind}-label-text-font, var(--mat-sys-label-large-font))` } } }];
    trees.reference.nodes[0].rules = [0];
    const node = trees.astylar.nodes[0];
    node.authored.class = kind === 'text' ? 'text-button' : 'material-button';
    node.normalResolvedStyle.fontFamily = node.interactionResolvedStyle.fontFamily = node.paintedControlText.style.fontFamily = 'Roboto, Arial, sans-serif';
    trees.astylar.rules = [{ selector: 'button, input, select', fontFamily: 'Roboto, Arial, sans-serif' }, { selector: `.${node.authored.class}`, fontSize: '14px' }];
    return raw;
  }
  for (const kind of ['filled', 'outlined', 'text']) {
    const raw = fixture(kind), evidence = controlEvidence(raw);
    assert.equal(evidence.differences.length, 1);
    assert.equal(evidence.differences[0].attribution, 'reviewed-button-font-token-input');
    assert.equal(evidence.differences[0].reviewEvidence.referenceComputed, 'roboto');
    assert.equal(evidence.differences[0].reviewEvidence.candidateMaterialRule.selector, kind === 'text' ? '.text-button' : '.material-button');
    const report = buildMaterialInputAudit(raw);
    assert.equal(report.summary.inputEquivalent, false);
    assert.ok(!validateMaterialInputAudit(report).some((error) => error.includes('control texture typography differences')));
  }
  const mutations = [
    (ref) => { ref.rules[0].active = false; },
    (ref) => { ref.rules[0].declarations['font-family'].value = 'Roboto'; },
    (ref, ast) => { ast.rules[1].fontFamily = 'Roboto, Arial, sans-serif'; },
    (ref, ast) => { ast.rules[0].fontFamily = 'Arial'; },
    (ref, ast) => { ast.nodes[0].interactionResolvedStyle.fontFamily = 'Arial'; },
    (ref, ast) => { ast.nodes[0].authored.class = 'unreviewed-button'; },
    (ref, ast) => { ast.rules.push({ ...ast.rules[1] }); },
    (ref) => { ref.rules.push({ active: true, declarations: { font: { value: '14px Roboto' } } }); ref.nodes[1].rules = [1]; },
  ];
  for (const kind of ['filled', 'outlined', 'text']) {
    for (const mutate of mutations) {
      const raw = fixture(kind);
      mutate(raw.results[0].inputTrees.reference, raw.results[0].inputTrees.astylar);
      assert.equal(controlEvidence(raw).differences[0].attribution, 'unresolved', `${kind}: ${mutate}`);
    }
  }
  const wrongKind = fixture('text');
  wrongKind.results[0].inputTrees.astylar.nodes[0].authored.class = 'material-button';
  wrongKind.results[0].inputTrees.astylar.rules[1].selector = '.material-button';
  assert.equal(controlEvidence(wrongKind).differences[0].attribution, 'unresolved', 'text token cannot attribute a filled/outlined candidate');
});

test('core font-list rewrite attribution requires matching browser and resolved inputs before current paint diverges', () => {
  function fixture(fontFamily = 'Roboto') {
    const raw = controlTypographyReport(), trees = raw.results[0].inputTrees;
    trees.reference.styles[0].fontFamily = fontFamily;
    const node = trees.astylar.nodes[0];
    node.normalResolvedStyle.fontFamily = node.interactionResolvedStyle.fontFamily = fontFamily;
    node.paintedControlText.style.fontFamily = `${fontFamily}, Arial, Helvetica, sans-serif`;
    return raw;
  }
  for (const family of ['Roboto', 'Arial']) {
    const raw = fixture(family), evidence = controlEvidence(raw);
    assert.deepEqual(evidence.gaps, []);
    assert.equal(evidence.differences.length, 1);
    const finding = evidence.differences[0];
    assert.equal(finding.attribution, 'reviewed-core-font-list-rewrite');
    assert.equal(finding.classification, 'confirmed-core-renderer-defect');
    assert.equal(finding.reviewEvidence.candidateNormal, family.toLowerCase());
    assert.equal(finding.reviewEvidence.candidateEffective, family.toLowerCase());
    assert.equal(finding.reviewEvidence.sourceFinding, 'core-explicit-font-list-appends-default-fallbacks');
    const report = buildMaterialInputAudit(raw);
    assert.equal(report.summary.inputEquivalent, false);
    assert.ok(!validateMaterialInputAudit(report).some((error) => error.includes('control texture typography differences')));
    report.controlTypography.differences[0].classification = 'application-plugin-authoring-defect';
    assert.ok(validateMaterialInputAudit(report).some((error) => error.includes('control texture typography differences')));
    report.controlTypography.differences[0].classification = 'confirmed-core-renderer-defect';
    delete report.controlTypography.differences[0].reviewEvidence;
    assert.ok(validateMaterialInputAudit(report).some((error) => error.includes('control texture typography differences')));
  }
  const mutations = [
    (ref, ast) => { ast.nodes[0].normalResolvedStyle.fontFamily = 'Arial'; },
    (ref, ast) => { delete ast.nodes[0].interactionResolvedStyle.fontFamily; },
    (ref, ast) => { ast.nodes[0].interactionResolvedStyle.fontFamily = 'Roboto, Arial, sans-serif'; },
    (ref, ast) => { ast.nodes[0].paintedControlText.style.fontFamily = 'Roboto, Arial, sans-serif'; },
    (ref) => { ref.styles.push({ ...ref.styles[0], fontFamily: 'Arial' }); ref.nodes[0].style = 1; },
  ];
  for (const mutate of mutations) {
    const raw = fixture();
    mutate(raw.results[0].inputTrees.reference, raw.results[0].inputTrees.astylar);
    assert.equal(controlEvidence(raw).differences[0].attribution, 'unresolved', String(mutate));
  }
  assert.equal(controlEvidence(fixture('serif')).differences[0].attribution, 'unresolved', 'do not extend the reviewed spelling scope');
});

test('toolbar line-height substitution requires its inherited token and explicit density-height witnesses', () => {
  function fixture(height = 40) {
    const raw = controlTypographyReport(), entry = raw.results[0], trees = entry.inputTrees;
    entry.family = 'toolbar';
    trees.reference.styles[0].lineHeight = '28px';
    trees.reference.nodes[0].parent = 'toolbar';
    trees.reference.nodes[0].rules = [0];
    trees.reference.nodes.push({ key: 'toolbar', parent: 'frame', type: 'mat-toolbar', attributes: {}, ownText: '', style: 0, rules: [1], pseudoElements: [] });
    trees.reference.rules = [
      { selector: '.mdc-button', active: true, declarations: { 'line-height': { value: 'inherit' } } },
      { selector: '.mat-toolbar, .mat-toolbar h1, .mat-toolbar h2, .mat-toolbar h3, .mat-toolbar h4, .mat-toolbar h5, .mat-toolbar h6',
        active: true, declarations: { 'line-height': { value: 'var(--mat-toolbar-title-text-line-height, var(--mat-sys-title-large-line-height))' } } },
    ];
    const node = trees.astylar.nodes[0];
    node.authored.class = 'toolbar-action';
    node.normalResolvedStyle.lineHeight = node.interactionResolvedStyle.lineHeight = `${height}px`;
    node.paintedControlText.style.lineHeight = height / node.paintedControlText.style.fontSize;
    trees.astylar.rules = [{ selector: '.toolbar-action', height: `${height}px`, lineHeight: `${height}px` }];
    return raw;
  }
  for (const height of [24, 40]) {
    const raw = fixture(height), evidence = controlEvidence(raw);
    assert.deepEqual(evidence.gaps, []);
    assert.equal(evidence.differences.length, 1);
    const finding = evidence.differences[0];
    assert.equal(finding.attribution, 'reviewed-toolbar-button-line-height-input');
    assert.equal(finding.classification, 'application-plugin-authoring-defect');
    assert.equal(finding.reviewEvidence.candidatePainted, `${height}px`);
    const report = buildMaterialInputAudit(raw);
    assert.equal(report.summary.inputEquivalent, false);
    assert.ok(!validateMaterialInputAudit(report).some((error) => error.includes('control texture typography differences')));
  }
  assert.deepEqual(controlEvidence(fixture(28)).differences, [], 'the matching density does not authorize unequal inputs elsewhere');
  const mutations = [
    (ref) => { ref.nodes[2].type = 'div'; },
    (ref) => { ref.rules[1].active = false; },
    (ref) => { ref.rules[1].declarations['line-height'].value = '28px'; },
    (ref) => { ref.rules[0].declarations['line-height'].value = 'normal'; },
    (ref) => { ref.rules.push({ active: true, declarations: { 'line-height': { value: '28px' } } }); ref.nodes[1].rules = [2]; },
    (ref, ast) => { ast.rules[0].height = '48px'; },
    (ref, ast) => { ast.rules.push({ ...ast.rules[0] }); },
    (ref, ast) => { ast.nodes[0].interactionResolvedStyle.lineHeight = '28px'; },
    (ref, ast) => { ast.nodes[0].authored.class = 'other'; },
  ];
  for (const mutate of mutations) {
    const raw = fixture();
    mutate(raw.results[0].inputTrees.reference, raw.results[0].inputTrees.astylar);
    assert.equal(controlEvidence(raw).differences[0].attribution, 'unresolved', String(mutate));
  }
});

test('disabled ink attribution is limited to the reviewed alpha rule and explicit opaque candidate paint', () => {
  const raw = disabledButtonInkReport(), evidence = controlEvidence(raw);
  assert.equal(evidence.differences.length, 1);
  assert.equal(evidence.differences[0].attribution, 'reviewed-disabled-button-ink');
  assert.equal(evidence.differences[0].reviewEvidence.candidatePainted, 'rgba(164,160,167,1)');
  assert.ok(!validateMaterialInputAudit(buildMaterialInputAudit(raw)).some((error) => error.includes('control texture typography differences')));
  const mutations = [
    (entry) => { entry.family = 'other'; },
    (entry) => { entry.inputTrees.reference.rules[0].active = false; },
    (entry) => { delete entry.inputTrees.reference.nodes[0].attributes.disabled; },
    (entry) => { entry.inputTrees.astylar.nodes[0].authored.disabled = false; },
    (entry) => { entry.inputTrees.astylar.nodes[0].interactionResolvedStyle.color = '#ffffff'; },
    (entry) => { entry.inputTrees.astylar.rules[0].color = '#ffffff'; },
    (entry) => { entry.inputTrees.reference.rules[0].declarations.color.value = 'rgba(29,27,32,.38)'; },
    (entry) => { entry.inputTrees.reference.styles[0].color = 'rgba(29,27,32,.5)'; },
    (entry) => { entry.inputTrees.astylar.nodes[0].normalResolvedStyle.color = 'rgba(164,160,167,.38)'; },
    (entry) => { entry.inputTrees.astylar.rules.push({ ...entry.inputTrees.astylar.rules[0] }); },
  ];
  for (const mutate of mutations) {
    const candidate = disabledButtonInkReport();
    mutate(candidate.results[0]);
    assert.equal(controlEvidence(candidate).differences[0].attribution, 'unresolved', String(mutate));
  }
});

test('disabled ink attribution follows captured alpha/opaque input witnesses across themes', () => {
  for (const [profile, reference, candidateColor] of [
    ['light', 'rgba(29,27,32,.38)', '#a4a0a7'],
    ['dark', 'rgba(230,225,229,.38)', '#706c72'],
    ['contrast', 'rgba(29,27,32,.38)', '#a09fa1'],
    ['custom', 'rgba(29,27,32,.38)', '#99a0a2'],
  ]) {
    const raw = disabledButtonInkReport(), entry = raw.results[0];
    entry.profile = profile;
    entry.inputTrees.reference.styles[0].color = reference;
    const node = entry.inputTrees.astylar.nodes[0];
    node.normalResolvedStyle.color = node.interactionResolvedStyle.color = node.paintedControlText.style.color = candidateColor;
    entry.inputTrees.astylar.rules[0].color = candidateColor;
    const evidence = controlEvidence(raw), finding = evidence.differences[0];
    assert.deepEqual(evidence.gaps, []);
    assert.equal(finding.attribution, 'reviewed-disabled-button-ink', profile);
    assert.equal(finding.reviewEvidence.sourceFinding, 'fixture-disabled-button-ink-precomposited');
    assert.equal(finding.reviewEvidence.candidatePainted, finding.reviewEvidence.candidateEffective);
    assert.equal(finding.reviewEvidence.candidateEffective, finding.reviewEvidence.candidateNormal);
    assert.equal(buildMaterialInputAudit(raw).summary.inputEquivalent, false);
  }
});

test('control typography rejects stale provenance, wrong text, nested labels and ambiguous owners', () => {
  const mutations = [
    (ref, ast) => { delete ast.paintedControlTextEvidenceVersion; },
    (ref, ast) => { ast.resolvedStyleSource = 'mesh-metadata'; },
    (ref, ast) => { delete ast.resolvedStyleRevision; },
    (ref, ast) => { delete ast.nodes[0].paintedControlText; },
    (ref, ast) => { ast.nodes[0].paintedControlText.source = 'core-text-registry'; },
    (ref, ast) => { ast.nodes[0].paintedControlText.text = 'Wrong'; },
    (ref, ast) => { ast.nodes[0].authored.value = 'Wrong'; },
    (ref, ast) => { ast.nodes.push(structuredClone(ast.nodes[0])); },
    (ref) => { ref.nodes.push({ ...ref.nodes[0], key: 'duplicate-owner' }); },
    (ref) => { ref.nodes.push({ ...ref.nodes[1], key: 'duplicate-label' }); },
    (ref) => { ref.nodes.push({ key: 'child', parent: 'label', type: 'span', attributes: {}, ownText: '', style: 0, rules: [], pseudoElements: [] }); },
    (ref) => { ref.nodes[1].parent = 'unknown'; },
    (ref) => { ref.nodes[0].ownText = 'Extra'; },
  ];
  for (const mutate of mutations) {
    const raw = controlTypographyReport();
    mutate(raw.results[0].inputTrees.reference, raw.results[0].inputTrees.astylar);
    const evidence = controlEvidence(raw);
    assert.equal(evidence.comparisons.length, 0, String(mutate));
    assert.ok(evidence.gaps.length > 0, String(mutate));
  }
});

test('control typography never fills missing or invalid parsed lengths from declarations or retained text', () => {
  for (const [property, value] of [['fontSize', '24px'], ['lineHeight', '1.333333'], ['letterSpacing', undefined], ['wordSpacing', null]]) {
    const raw = controlTypographyReport();
    raw.results[0].inputTrees.astylar.nodes[0].paintedControlText.style[property] = value;
    const evidence = controlEvidence(raw);
    assert.ok(evidence.gaps.some((entry) => entry.property === property));
    assert.equal(evidence.comparisons[0].properties[property].painted, undefined);
    assert.ok(validateMaterialInputAudit(buildMaterialInputAudit(raw)).some((error) => error.includes('control texture mappings')));
  }
});

test('observed non-button texture owners remain explicit mapping gaps', () => {
  const raw = controlTypographyReport();
  raw.results[0].inputTrees.reference.nodes = [{ key: 'frame', parent: null, type: 'main', attributes: {}, ownText: '', style: 0, rules: [], pseudoElements: [] }];
  raw.results[0].inputTrees.astylar.nodes[0].authored.type = 'input';
  const evidence = controlEvidence(raw);
  assert.equal(evidence.comparisons.length, 0);
  assert.ok(evidence.gaps.some((entry) => entry.reason.includes('no reviewed reference')));
});

test('full-tree pooling preserves control paint units, source, content and effects without laundering legacy evidence', () => {
  const entry = { family: 'button', profile: 'light', viewport: { id: 'desktop' }, inputTrees: {
    astylar: { schemaVersion: 1, resolvedStyleEvidenceVersion: 2, resolvedStyleSource: 'core-style-inspection',
      resolvedStyleRevision: 9, paintedControlTextEvidenceVersion: 1, nodes: [{ key: 'root/0', parent: 'root',
        authored: { type: 'button', id: 'action', value: 'Action' }, resolvedStyle: { fontSize: '24px' },
        retainedText: { source: 'core-text-registry', style: { fontSize: '20px' } },
        paintedControlText: { source: 'core-control-texture', text: 'Action', maxWidth: 120,
          style: { fontSize: 16, lineHeight: 1.5, letterSpacing: .5,
            textShadow: [{ offsetX: 1, offsetY: 2, blurRadius: 3, color: '#123456' }] } },
      }], rules: [], errors: [] },
  } };
  const before = structuredClone(entry);
  const result = collectFullTreeInventory([entry, { ...entry, state: 'hover' }]);
  assert.deepEqual(entry, before);
  assert.equal(result.variants.length, 1);
  assert.equal(result.cases.length, 2);
  const variant = result.variants[0], node = variant.nodes[0];
  assert.equal(variant.paintedControlTextEvidenceVersion, 1);
  assert.equal(node.paintedControlText.source, 'core-control-texture');
  assert.equal(node.paintedControlText.text, 'Action');
  assert.equal(node.paintedControlText.maxWidth, 120);
  assert.deepEqual(result.styles[node.paintedControlText.style].value, entry.inputTrees.astylar.nodes[0].paintedControlText.style);
  assert.equal(result.styles[node.retainedText.style].value.fontSize, '20px');
  assert.equal(result.styles[node.style].value.fontSize, '24px');
  const legacy = structuredClone(entry);
  delete legacy.inputTrees.astylar.paintedControlTextEvidenceVersion;
  delete legacy.inputTrees.astylar.nodes[0].paintedControlText;
  const mixed = collectFullTreeInventory([entry, { ...legacy, state: 'hover' }]);
  assert.equal(mixed.variants.length, 2);
  assert.equal(mixed.variants[1].paintedControlTextEvidenceVersion, undefined);
  assert.equal(mixed.variants[1].nodes[0].paintedControlText, undefined);
});

test('an inventoried hidden or anonymous element still requires resolved style evidence', () => {
  const entry = { family: 'core', profile: 'light', viewport: { id: 'desktop' }, inputTrees: {
    astylar: { schemaVersion: 1, nodes: [
      { key: 'root', parent: null, authored: {} },
      { key: 'root/0', parent: 'root', authored: { type: 'span', id: 'hidden', style: { display: 'none' } } },
      { key: 'root/1', parent: 'root', authored: { type: 'div' }, resolvedStyle: {} },
    ], rules: [], errors: [] },
    reference: { schemaVersion: 1, nodes: [{ key: 'frame', parent: null, type: 'div', attributes: {}, style: 0, rules: [], pseudoElements: [] }], styles: [{}], rules: [], errors: [] },
  } };
  const result = collectFullTreeInventory([entry]);
  assert.equal(result.gaps.length, 0);
  assert.equal(result.envelopes.length, 1);
  assert.equal(result.resolvedStyleGaps.length, 3);
  assert.ok(result.resolvedStyleGaps.some(({ element }) => element === 'hidden'));
  assert.ok(result.resolvedStyleGaps.every(({ classification }) => classification === 'parity-harness-defect'));
  const report = parityReport({ display: 'block' }, { display: 'block' });
  report.results[0].inputTrees = entry.inputTrees;
  const audit = buildMaterialInputAudit(report);
  assert.equal(audit.summary.inputEquivalent, false);
  assert.ok(validateMaterialInputAudit(audit).some((error) => error.includes('lack resolved style evidence')));
});

function rootHeightReport(family = 'chips', height = '98px', usedHeight = '40px') {
  const raw = rootTypographyReport(family), e = raw.results[0], { reference: r, astylar: a } = e.inputTrees;
  r.styles[0].height = usedHeight; r.styles[0].boxSizing = 'content-box';
  const declarations = { height, boxSizing: 'border-box' };
  a.rules.push({ selector: `#${family}-root`, ...declarations });
  for (const stage of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle']) Object.assign(a.nodes[2][stage], declarations);
  Object.assign(e.styleInputs[0].reference, { height: usedHeight, boxSizing: 'content-box' });
  for (const stage of ['astylar', 'astylarNormalResolvedStyle', 'astylarInteractionResolvedStyle']) Object.assign(e.styleInputs[0][stage], declarations);
  e.styleInputs[0].astylarAuthored[0].declarations = { ...e.styleInputs[0].astylarAuthored[0].declarations, ...declarations };
  return raw;
}

test('root box model accompanies fixed-height authoring without rejecting equivalent maximum constraints', () => {
  const raw = parityReport({}, {}); raw.results = [];
  for (const family of ['chips', 'toolbar', 'divider']) for (const height of ['98px', '152.5625px'])
    for (const state of [undefined, 'hover', 'held', 'focus', 'open']) {
      const e = rootHeightReport(family, height).results[0]; e.viewport = { ...e.viewport, id: `desktop-${height}` };
      Object.assign(e.styleInputs[0].reference, { maxWidth: '720px', padding: '28px', borderWidth: '1px' });
      Object.assign(e.styleInputs[0].astylar, { maxWidth: '778px', padding: '28px', borderWidth: '1px' });
      if (state) { e.state = state; raw.interactions.push(e); } else raw.results.push(e);
    }
  const before = JSON.stringify(raw), audit = buildMaterialInputAudit(raw);
  const ds = audit.discrepancies.filter(d => d.attribution === 'reviewed-root-fixed-height-box-model');
  assert.equal(ds.length, 3); assert.equal(ds.reduce((n, d) => n + d.occurrences, 0), 30);
  for (const d of ds) {
    assert.equal(d.property, 'boxSizing'); assert.equal(d.reference, 'content-box'); assert.equal(d.astylar, 'border-box');
    assert.equal(d.classification, 'application-plugin-authoring-defect'); assert.equal(d.reviewedCases.length, d.occurrences);
    assert.equal(d.reviewEvidence.property, 'height'); assert.equal(d.reviewEvidence.inputEquivalent, false);
    assert.equal(d.reviewEvidence.usedSizeEquivalentVerified, false);
  }
  assert.ok(audit.discrepancies.filter(d => d.property === 'maxWidth').every(d => d.classification === 'equivalent-representation'));
  assert.equal(audit.discrepancies.filter(d => d.property === 'maxWidth').reduce((n, d) => n + d.occurrences, 0), 30);
  assert.deepEqual(validateMaterialInputAudit(audit, { requireComplete: false }).filter(e => e.includes('root box model')), []);
  assert.equal(JSON.stringify(raw), before);
});

test('root box model requires explicit declaration ownership and an independently proved height substitution', () => {
  for (const [index, mutate] of [
    e => { e.inputTrees.reference.nodes[1].inline['box-sizing'] = { value: 'content-box', important: false }; },
    e => { e.inputTrees.reference.nodes[1].attributes.style = 'box-sizing:content-box'; },
    e => { e.inputTrees.reference.nodes[1].rules = [0]; e.inputTrees.reference.rules[0].declarations['box-sizing'] = { value: 'content-box', important: false }; },
    e => { delete e.inputTrees.astylar.rules.at(-1).boxSizing; },
    e => { e.inputTrees.astylar.rules.at(-1)['box-sizing'] = 'border-box'; },
    e => { e.inputTrees.astylar.rules.at(-1).boxSizing = 'content-box'; },
    e => { e.inputTrees.astylar.rules.push({ selector: ':is(section)', boxSizing: 'border-box' }); },
    e => { e.inputTrees.astylar.nodes[2].authored.style = { boxSizing: 'border-box' }; },
    e => { delete e.inputTrees.astylar.nodes[2].interactionResolvedStyle; },
    e => { e.inputTrees.astylar.nodes[2].resolvedStyle.height = 'auto'; },
    e => { e.inputTrees.astylar.nodes[2].parent = 'root'; },
    e => { e.inputTrees.reference.nodes[1].inline.height = { value: 'auto', important: false }; },
  ].entries()) {
    const raw = rootHeightReport(); mutate(raw.results[0]);
    assert.equal(buildMaterialInputAudit(raw).discrepancies.some(d => d.attribution === 'reviewed-root-fixed-height-box-model'), false, `mutation ${index}`);
  }
});

test('root box model attribution rejects scalar and companion-proof tampering', () => {
  for (const mutate of [i => { i.reference.boxSizing = 'border-box'; }, i => { i.astylar.boxSizing = 'content-box'; },
    i => { delete i.astylarAuthored[0].declarations.boxSizing; },
    i => { i.referenceAuthored[0].declarations['box-sizing'] = { value: 'content-box', important: false }; },
    i => { i.astylarNormalResolvedStyle.height = '99px'; }, i => { i.astylarResolvedStyleEvidenceVersion = 1; }]) {
    const raw = rootHeightReport(); mutate(raw.results[0].styleInputs[0]);
    assert.equal(buildMaterialInputAudit(raw).discrepancies.some(d => d.attribution === 'reviewed-root-fixed-height-box-model'), false);
  }
  const audit = buildMaterialInputAudit(rootHeightReport());
  for (const mutate of [d => { d.reviewEvidence.values.candidateHeightDeclaration = '99px'; },
    d => { d.reviewEvidence.candidatePath[1].rules = []; }, d => { d.reviewedCases = ['invented']; },
    d => { d.property = 'height'; }, d => { d.classification = 'equivalent-representation'; },
    d => { d.reference = 'border-box'; }]) {
    const copy = structuredClone(audit); mutate(copy.discrepancies.find(d => d.attribution === 'reviewed-root-fixed-height-box-model'));
    assert.ok(validateMaterialInputAudit(copy, { requireComplete: false }).some(e => e.includes('root box model')));
  }
});

test('root height preserves fixed authoring versus automatic used dimensions across states', () => {
  const raw = parityReport({}, {}); raw.results = [];
  for (const family of ['chips', 'button', 'expansion']) for (const height of ['98px', '186px'])
    for (const state of [undefined, 'hover', 'held', 'focus', 'open']) {
      const e = rootHeightReport(family, height).results[0]; e.viewport = { ...e.viewport, id: `desktop-${height}` };
      if (state) { e.state = state; raw.interactions.push(e); } else raw.results.push(e);
    }
  const before = JSON.stringify(raw), audit = buildMaterialInputAudit(raw);
  assert.equal(audit.rootHeightInputs.length, 30);
  const ds = audit.discrepancies.filter(d => d.attribution === 'reviewed-root-fixed-height-authoring');
  assert.equal(ds.reduce((n, d) => n + d.occurrences, 0), 30);
  for (const d of ds) {
    assert.equal(d.classification, 'application-plugin-authoring-defect'); assert.equal(d.reference, '40px');
    assert.equal(d.reviewedCases.length, d.occurrences); assert.equal(d.reviewEvidence.values.referenceHeightDeclaration, '<omitted>');
    for (const flag of ['inputEquivalent', 'usedSizeEquivalentVerified', 'responsiveRuleSelectionVerified', 'finalRasterVerified']) assert.equal(d.reviewEvidence[flag], false);
  }
  assert.deepEqual(validateMaterialInputAudit(audit, { requireComplete: false }).filter(e => e.includes('root height')), []);
  assert.equal(JSON.stringify(raw), before);
  const equal = buildMaterialInputAudit(rootHeightReport('chips', '98px', '98px'));
  assert.equal(equal.rootHeightInputs.length, 1); assert.equal(equal.rootHeightInputs[0].inputEquivalent, false);
});

test('root height joins fractional scalar precision without changing raw declarations', () => {
  for (const [height, usedHeight, scalarHeight, scalarUsed] of [
    ['152.5625px', '94.5625px', '152.563px', '94.563px'],
    ['176.5625px', '118.562px', '176.563px', '118.562px'],
  ]) {
    const raw = rootHeightReport('divider', height, usedHeight), before = JSON.stringify(raw);
    const audit = buildMaterialInputAudit(raw), proof = audit.rootHeightInputs[0];
    assert.equal(audit.rootHeightInputs.length, 1);
    const ds = audit.discrepancies.filter(d => d.attribution === 'reviewed-root-fixed-height-authoring');
    assert.equal(ds.length, 1);
    assert.equal(proof.values.candidateHeightDeclaration, height);
    assert.equal(proof.referencePath[1].computed.height, usedHeight);
    assert.equal(ds[0].astylar, scalarHeight); assert.equal(ds[0].reference, scalarUsed);
    assert.deepEqual(validateMaterialInputAudit(audit, { requireComplete: false }).filter(e => e.includes('root height')), []);
    assert.equal(JSON.stringify(raw), before);
    // A shared display rounding bucket must not hide a different raw stage.
    const mismatch = structuredClone(raw);
    mismatch.results[0].styleInputs[0].astylar.height = height.replace('5625', '5626');
    assert.equal(buildMaterialInputAudit(mismatch).discrepancies.some(d => d.attribution === 'reviewed-root-fixed-height-authoring'), false);
    const forged = structuredClone(audit);
    forged.discrepancies.find(d => d.attribution === 'reviewed-root-fixed-height-authoring').reviewEvidence.values.candidateHeightDeclaration = height.replace('5625', '5626');
    assert.ok(validateMaterialInputAudit(forged, { requireComplete: false }).some(e => e.includes('root height')));
  }
});

test('root height rejects incomplete ancestry and competing or unreviewed size requests', () => {
  for (const [index, mutate] of [
    e => { e.inputTrees.reference.nodes[1].inline.height = { value: 'auto', important: false }; },
    e => { e.inputTrees.reference.nodes[1].attributes.style = 'height:auto'; },
    e => { e.inputTrees.reference.nodes[1].rules = [0]; e.inputTrees.reference.rules[0].declarations.height = { value: '98px', important: false }; },
    e => { e.inputTrees.reference.styles[0].boxSizing = 'border-box'; },
    e => { e.inputTrees.reference.styles[0].height = 'auto'; },
    e => { e.inputTrees.astylar.nodes[2].authored.style = { height: '98px' }; },
    e => { e.inputTrees.astylar.rules.at(-1).minHeight = '1px'; },
    e => { e.inputTrees.astylar.rules.at(-1).height = '100%'; },
    e => { e.inputTrees.astylar.rules.at(-1).height = 'calc(98px)'; },
    e => { e.inputTrees.astylar.rules.at(-1).height = '0px'; },
    e => { e.inputTrees.astylar.nodes[2].normalResolvedStyle.height = '99px'; },
    e => { delete e.inputTrees.astylar.nodes[2].interactionResolvedStyle; },
    e => { e.inputTrees.astylar.nodes[2].parent = 'root'; },
    e => { e.inputTrees.astylar.rules.push({ selector: ':is(section)', height: '98px' }); },
    e => { e.inputTrees.astylar.nodes.push(structuredClone(e.inputTrees.astylar.nodes[2])); },
    e => { e.inputTrees.astylar.resolvedStyleSource = 'fixture'; },
  ].entries()) {
    const raw = rootHeightReport(); mutate(raw.results[0]); const audit = buildMaterialInputAudit(raw);
    assert.equal(audit.rootHeightInputs.length, 0, `mutation ${index}`);
    assert.ok(audit.discrepancies.every(d => d.attribution !== 'reviewed-root-fixed-height-authoring'));
  }
});

test('root height rejects scalar and report tampering without erasing original sizes', () => {
  for (const mutate of [i => { i.reference.height = '41px'; }, i => { i.astylar.height = '99px'; },
    i => { i.astylarNormalResolvedStyle.boxSizing = 'content-box'; }, i => { delete i.astylarInteractionResolvedStyle; },
    i => { i.referenceAuthored[0].declarations.height = { value: 'auto', important: false }; },
    i => { i.astylarAuthored[0].declarations.height = '99px'; }, i => { i.astylarResolvedStyleEvidenceVersion = 1; }]) {
    const raw = rootHeightReport(); mutate(raw.results[0].styleInputs[0]);
    assert.ok(buildMaterialInputAudit(raw).discrepancies.every(d => d.attribution !== 'reviewed-root-fixed-height-authoring'));
  }
  const audit = buildMaterialInputAudit(rootHeightReport());
  for (const mutate of [a => { a.rootHeightInputs[0].usedSizeEquivalentVerified = true; },
    a => { a.rootHeightInputs[0].values.referenceHeightDeclaration = '98px'; },
    a => { a.discrepancies.find(d => d.attribution === 'reviewed-root-fixed-height-authoring').classification = 'equivalent-representation'; },
    a => { a.discrepancies.find(d => d.attribution === 'reviewed-root-fixed-height-authoring').reviewedCases = []; },
    a => { a.discrepancies.find(d => d.attribution === 'reviewed-root-fixed-height-authoring').astylar = '40px'; }]) {
    const copy = structuredClone(audit); mutate(copy);
    assert.ok(validateMaterialInputAudit(copy, { requireComplete: false }).some(e => e.includes('root height')));
  }
});

function containerCaretReport(family = 'chips', dark = false, size = '16px') {
  const raw = family === 'chips' ? rootColorReport(family, dark, size) : fieldColorReport(family, dark, size);
  const e = raw.results[0];
  for (const s of e.inputTrees.reference.styles) s.caretColor = s.color;
  for (const i of e.styleInputs) i.reference.caretColor = i.reference.color;
  return raw;
}

test('container caret separates computed container color from declarations and descendant caret paint', () => {
  const raw = parityReport({}, {}); raw.results = [];
  for (const family of ['chips', 'autocomplete', 'timepicker']) for (const dark of [false, true]) for (const size of ['16px', '18.4px'])
    for (const state of [undefined, 'hover', 'held', 'focus', 'open']) {
      const e = containerCaretReport(family, dark, size).results[0]; e.profile = dark ? 'dark' : 'light';
      e.viewport = { ...e.viewport, id: `desktop-${size}` };
      if (state) { e.state = state; raw.interactions.push(e); } else raw.results.push(e);
    }
  const before = JSON.stringify(raw), audit = buildMaterialInputAudit(raw);
  assert.equal(audit.containerCaretInputs.length, 100);
  const ds = audit.discrepancies.filter(d => d.attribution === 'reviewed-container-caret-color-declaration-stage');
  assert.equal(ds.reduce((n, d) => n + d.occurrences, 0), 100);
  for (const d of ds) {
    assert.equal(d.property, 'caretColor'); assert.equal(d.astylar, undefined); assert.equal(d.classification, 'parity-harness-defect');
    assert.equal(d.reviewedCases.length, d.occurrences);
    for (const flag of ['computedCandidateVerified', 'descendantCaretVerified', 'finalRasterVerified']) assert.equal(d.reviewEvidence[flag], false);
  }
  assert.ok(audit.discrepancies.some(d => d.attribution === 'reviewed-field-host-typography-token-omission'));
  assert.deepEqual(validateMaterialInputAudit(audit, { requireComplete: false }).filter(e => e.includes('container caret')), []);
  assert.equal(JSON.stringify(raw), before);
});

test('container caret rejects local or ancestor overrides and incomplete source evidence', () => {
  for (const [index, mutate] of [
    e => { e.inputTrees.reference.nodes[1].inline['caret-color'] = { value: 'auto', important: false }; },
    e => { e.inputTrees.reference.nodes[0].attributes.style = 'caret-color:transparent'; },
    e => { e.inputTrees.reference.rules[0].declarations['caret-color'] = { value: 'auto', important: false }; },
    e => { e.inputTrees.reference.styles[0].caretColor = 'rgb(1, 2, 3)'; },
    e => { delete e.inputTrees.reference.styles[e.inputTrees.reference.nodes[1].style].caretColor; },
    e => { e.inputTrees.astylar.rules[0].caretColor = 'auto'; },
    e => { e.inputTrees.astylar.nodes[2].authored.style = { caretColor: 'auto' }; },
    e => { e.inputTrees.astylar.rules.push({ selector: ':is(section)', caretColor: 'transparent' }); },
    e => { e.inputTrees.astylar.nodes[1].normalResolvedStyle.caretColor = 'auto'; },
    e => { e.inputTrees.astylar.nodes[2].interactionResolvedStyle.caretColor = '#1d1b20'; },
    e => { e.inputTrees.astylar.resolvedStyleSource = 'fixture'; },
    e => { e.inputTrees.astylar.nodes[2].parent = 'root'; },
  ].entries()) {
    const raw = containerCaretReport(); mutate(raw.results[0]); const audit = buildMaterialInputAudit(raw);
    assert.equal(audit.containerCaretInputs.length, 0, `mutation ${index}`);
    assert.equal(audit.discrepancies.some(d => d.attribution === 'reviewed-container-caret-color-declaration-stage'), false);
  }
});

test('container caret rejects scalar changes and forged computed or painted claims', () => {
  for (const mutate of [i => { i.reference.caretColor = 'red'; }, i => { i.astylar.caretColor = 'auto'; },
    i => { delete i.astylarNormalResolvedStyle; }, i => { i.astylarResolvedStyleEvidenceVersion = 1; },
    i => { i.referenceAuthored[0].declarations['caret-color'] = { value: 'auto', important: false }; },
    i => { i.astylarAuthored[0].declarations.caretColor = 'auto'; }]) {
    const raw = containerCaretReport(); mutate(raw.results[0].styleInputs[0]);
    assert.equal(buildMaterialInputAudit(raw).discrepancies.some(d => d.attribution === 'reviewed-container-caret-color-declaration-stage'), false);
  }
  const audit = buildMaterialInputAudit(containerCaretReport());
  for (const mutate of [a => { a.containerCaretInputs[0].descendantCaretVerified = true; },
    a => { a.containerCaretInputs[0].candidatePath[0].normal.caretColor = 'auto'; },
    a => { a.discrepancies.find(d => d.attribution === 'reviewed-container-caret-color-declaration-stage').classification = 'equivalent-representation'; },
    a => { a.discrepancies.find(d => d.attribution === 'reviewed-container-caret-color-declaration-stage').reviewedCases = []; },
    a => { a.discrepancies.find(d => d.attribution === 'reviewed-container-caret-color-declaration-stage').astylar = 'auto'; }]) {
    const copy = structuredClone(audit); mutate(copy);
    assert.ok(validateMaterialInputAudit(copy, { requireComplete: false }).some(e => e.includes('container caret')));
  }
});

function fieldColorReport(family = 'autocomplete', dark = false, size = '16px') {
  const raw = fieldHostTypographyReport(family, size), e = raw.results[0], { reference: r, astylar: a } = e.inputTrees;
  const color = dark ? '#e6e1e5' : '#1d1b20';
  r.rules[0].source = 'sheet:3/1'; r.rules[0].declarations.color = { value: '#1d1b20', important: false };
  for (const style of r.styles) style.color = color;
  e.styleInputs[0].reference.color = color;
  if (dark) {
    r.nodes[0].attributes.class = 'frame dark'; r.nodes[0].rules.push(r.rules.length);
    r.rules.push({ source: 'sheet:3/2', selector: '.dark', active: true, conditions: [], declarations: { color: { value: color, important: false } } });
  }
  a.rules[0].color = color;
  for (const stage of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle']) a.nodes[1][stage].color = color;
  e.styleInputs.push(rootColorReport(family, dark, size).results[0].styleInputs[0]);
  return raw;
}

test('field host color joins exact ancestry without erasing missing font token evidence', () => {
  const raw = parityReport({}, {}); raw.results = [];
  for (const family of ['form-field', 'input', 'autocomplete', 'select', 'datepicker', 'timepicker'])
    for (const dark of [false, true]) for (const size of ['16px', '14.4px', '18.4px'])
      for (const state of [undefined, 'hover', 'held', 'focus', 'disabled']) {
        const e = fieldColorReport(family, dark, size).results[0]; e.profile = dark ? 'dark' : 'light';
        e.viewport = { ...e.viewport, id: `desktop-${size}` };
        if (state) { e.state = state; raw.interactions.push(e); } else raw.results.push(e);
      }
  const before = JSON.stringify(raw), audit = buildMaterialInputAudit(raw);
  assert.equal(audit.fieldColorInputs.length, 180);
  assert.equal(audit.fieldHostTypographyInputs.length, 540);
  const ds = audit.discrepancies.filter(d => d.attribution === 'reviewed-field-host-color-declaration-stage');
  assert.equal(ds.reduce((n, d) => n + d.occurrences, 0), 180);
  for (const d of ds) {
    assert.equal(d.classification, 'parity-harness-defect'); assert.equal(d.property, 'color'); assert.equal(d.astylar, undefined);
    assert.equal(d.reviewedCases.length, d.occurrences); assert.equal(d.reviewEvidence.referencePath.length, 3);
    assert.equal(d.reviewEvidence.candidatePath.length, 3); assert.equal(d.reviewEvidence.computedCandidateVerified, false);
    assert.equal(d.reviewEvidence.finalRasterVerified, false); assert.match(d.justification, /missing host font tokens/);
  }
  assert.equal(audit.discrepancies.filter(d => d.attribution === 'reviewed-field-host-typography-token-omission')
    .reduce((n, d) => n + d.occurrences, 0), 540);
  assert.deepEqual(validateMaterialInputAudit(audit, { requireComplete: false }).filter(e => e.includes('field host color')), []);
  assert.equal(JSON.stringify(raw), before);
});

test('field host color rejects changed host requests, ancestors, stages and identity', () => {
  for (const [i, mutate] of [
    e => { e.inputTrees.reference.rules[1].declarations.color = { value: 'inherit', important: false }; },
    e => { e.inputTrees.reference.rules[1].declarations.all = { value: 'unset', important: false }; },
    e => { e.inputTrees.reference.nodes[2].inline.color = { value: 'inherit', important: false }; },
    e => { e.inputTrees.reference.nodes[2].attributes.style = 'color:inherit'; },
    e => { e.inputTrees.reference.styles[1].color = '#ffffff'; },
    e => { e.inputTrees.reference.nodes[2].parent = 'frame'; },
    e => { e.inputTrees.reference.nodes[2].ownText = 'unmapped own text'; },
    e => { e.inputTrees.reference.rules[0].source = 'sheet:3/1/0'; },
    e => { e.inputTrees.astylar.rules.push({ selector: '.field-shell', color: 'inherit' }); },
    e => { e.inputTrees.astylar.rules.push({ selector: ':is(div)', color: '#1d1b20' }); },
    e => { e.inputTrees.astylar.rules.push({ selector: '#page', transition: 'color 1s' }); },
    e => { e.inputTrees.astylar.nodes[3].authored.style = { color: 'inherit' }; },
    e => { e.inputTrees.astylar.nodes[3].normalResolvedStyle.color = '#1d1b20'; },
    e => { delete e.inputTrees.astylar.nodes[3].interactionResolvedStyle; },
    e => { e.inputTrees.astylar.nodes[3].parent = 'page'; },
    e => { e.inputTrees.astylar.nodes[3].authored.type = 'input'; },
    e => { e.inputTrees.astylar.nodes.push(structuredClone(e.inputTrees.astylar.nodes[3])); },
    e => { e.inputTrees.astylar.resolvedStyleSource = 'fixture'; },
  ].entries()) {
    const raw = fieldColorReport(); mutate(raw.results[0]); const audit = buildMaterialInputAudit(raw);
    assert.equal(audit.fieldColorInputs.length, 0, `mutation ${i}`);
    assert.ok(audit.discrepancies.every(d => d.attribution !== 'reviewed-field-host-color-declaration-stage'));
  }
});

test('field host color rejects scalar and report tampering independently', () => {
  for (const mutate of [i => { i.reference.color = '#ffffff'; }, i => { i.astylar.color = '#1d1b20'; },
    i => { i.astylarNormalResolvedStyle.color = 'inherit'; }, i => { delete i.astylarInteractionResolvedStyle; },
    i => { i.referenceAuthored[0].declarations.color = { value: 'inherit', important: false }; },
    i => { i.astylarAuthored[0].declarations.color = 'inherit'; }, i => { i.astylarResolvedStyleEvidenceVersion = 1; }]) {
    const raw = fieldColorReport(); mutate(raw.results[0].styleInputs[0]);
    assert.ok(buildMaterialInputAudit(raw).discrepancies.every(d => d.attribution !== 'reviewed-field-host-color-declaration-stage'));
  }
  const audit = buildMaterialInputAudit(fieldColorReport());
  for (const mutate of [a => { a.fieldColorInputs[0].computedCandidateVerified = true; },
    a => { a.fieldColorInputs[0].candidatePath[2].normal.color = '#1d1b20'; },
    a => { a.discrepancies.find(d => d.attribution === 'reviewed-field-host-color-declaration-stage').classification = 'equivalent-representation'; },
    a => { a.discrepancies.find(d => d.attribution === 'reviewed-field-host-color-declaration-stage').reviewedCases = []; },
    a => { a.discrepancies.find(d => d.attribution === 'reviewed-field-host-color-declaration-stage').astylar = '#1d1b20'; }]) {
    const copy = structuredClone(audit); mutate(copy);
    assert.ok(validateMaterialInputAudit(copy, { requireComplete: false }).some(e => e.includes('field host color')));
  }
});

function rootColorReport(family = 'chips', dark = false, size = '16px') {
  const raw = rootTypographyReport(family, size), e = raw.results[0], { reference: r, astylar: a } = e.inputTrees;
  const color = dark ? '#e6e1e5' : '#1d1b20';
  r.rules[0].source = 'sheet:3/1'; r.rules[0].declarations.color = { value: '#1d1b20', important: false };
  r.styles[0].color = color; e.styleInputs[0].reference.color = color;
  if (dark) {
    r.nodes[0].attributes.class = 'frame dark';
    r.nodes[0].rules.push(r.rules.length);
    r.rules.push({ source: 'sheet:3/2', selector: '.dark', active: true, conditions: [], declarations: { color: { value: color, important: false } } });
  }
  a.rules[0].color = color;
  for (const stage of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle']) a.nodes[1][stage].color = color;
  return raw;
}

test('descendant color ancestry rejects broken links and intervening requests without claiming owner equivalence', async () => {
  const { collectRootTypographyInputs } = await import('./root-typography-input-evidence.mjs');
  const { collectRootColorInputs } = await import('./root-color-input-evidence.mjs');
  const { extendRootColorAncestry } = await import('./root-color-descendant-evidence.mjs');
  const { rootInitialSelectorCanApply } = await import('./root-initial-style-evidence.mjs');
  const { bindPreciseAuditNormalization } = await import('./audit-normalization-contracts.mjs');
  const canonical = bindPreciseAuditNormalization();
  for (const dark of [false, true]) {
    const raw = rootColorReport('chips', dark), inventory = collectFullTreeInventory(raw.results.map(e => ({...e, kind: 'static'})));
    const roots = collectRootColorInputs(collectRootTypographyInputs(inventory, canonical, rootInitialSelectorCanApply), canonical);
    assert.equal(roots.length, 1);
    const root = roots[0];
    const fixture = () => ({ root: structuredClone(root),
      reference: [...structuredClone(root.referencePath), { key: 'descendant', parent: root.referencePath.at(-1).key,
        type: 'span', attributes: { id: 'descendant' }, inline: {}, computed: structuredClone(root.referencePath.at(-1).computed), rules: [] }],
      candidate: [...structuredClone(root.candidatePath), { key: 'descendant', parent: root.candidatePath.at(-1).key,
        authored: { type: 'span', id: 'descendant' }, normal: {}, comparison: {}, effective: {}, rules: [] }] });
    const inspect = f => extendRootColorAncestry(f.root, f.reference, f.candidate, canonical);
    const f = fixture(), before = JSON.stringify(f), proof = inspect(f);
    assert.ok(proof); assert.equal(proof.ownerCorrespondenceVerified, false);
    assert.equal(proof.computedCandidateVerified, false); assert.equal(proof.finalRasterVerified, false);
    assert.equal(JSON.stringify(f), before);
    const changes = [
      x => { x.reference[2].parent = 'missing'; }, x => { x.candidate[2].parent = 'missing'; },
      x => { x.reference[2].key = x.reference[1].key; }, x => { x.candidate.pop(); },
      x => { x.root.computedCandidateVerified = true; }, x => { x.root.revision = -1; },
      x => { x.reference[2].computed.color = 'red'; },
      x => { x.reference[2].inline.color = { value: 'inherit', important: false }; },
      x => { x.reference[2].attributes.style = 'color: inherit'; },
      x => { x.candidate[2].authored.attributes = { style: 'color: inherit' }; },
      x => { x.candidate[2].authored.style = { color: 'inherit' }; },
      ...['normal', 'comparison', 'effective'].map(stage => x => { x.candidate[2][stage].color = '#1d1b20'; }),
      ...['color', 'all', 'transition', 'animation'].map(key => x => {
        x.candidate[2].rules.push({ selector: '#descendant:hover', declarations: { [key]: 'inherit' } });
      }),
      ...['color', 'all', 'transition', 'animation'].map(key => x => {
        x.reference[2].rules.push({ selector: '#descendant', active: true, conditions: [], declarations: { [key]: { value: 'inherit', important: false } } });
      }),
    ];
    for (const [i, change] of changes.entries()) { const changed = fixture(); change(changed); assert.equal(inspect(changed), undefined, `mutation ${i}`); }
    assert.equal(changes.length, 22);
  }
});

test('root color separates inherited browser values from local declarations across states and dark overrides', () => {
  const raw = parityReport({}, {}); raw.results = [];
  for (const family of ['chips', 'button', 'datepicker']) for (const dark of [false, true]) for (const size of ['16px', '14.4px', '18.4px'])
    for (const state of [undefined, 'hover', 'held', 'focus', 'disabled']) {
      const e = rootColorReport(family, dark, size).results[0]; e.profile = dark ? 'dark' : 'light';
      e.viewport = { ...e.viewport, id: `desktop-${size}` };
      if (state) { e.state = state; raw.interactions.push(e); } else raw.results.push(e);
    }
  const before = JSON.stringify(raw), audit = buildMaterialInputAudit(raw);
  assert.equal(audit.rootColorInputs.length, 90);
  const ds = audit.discrepancies.filter(d => d.attribution === 'reviewed-root-color-declaration-stage');
  assert.equal(ds.reduce((sum, d) => sum + d.occurrences, 0), 90);
  for (const d of ds) {
    assert.equal(d.property, 'color'); assert.equal(d.classification, 'parity-harness-defect');
    assert.equal(d.astylar, undefined); assert.equal(d.reviewedCases.length, d.occurrences);
    assert.equal(d.reviewEvidence.computedCandidateVerified, false); assert.equal(d.reviewEvidence.finalRasterVerified, false);
    assert.equal(d.reviewEvidence.candidatePath[1].comparison.color, undefined);
    assert.match(d.justification, /caret-color behavior/);
  }
  assert.deepEqual(validateMaterialInputAudit(audit, { requireComplete: false }).filter(e => e.includes('root color')), []);
  assert.equal(JSON.stringify(raw), before);
});

test('root color rejects uncertain cascade, competing requests and missing ancestor evidence', () => {
  const changes = [
    e => { e.inputTrees.reference.rules[0].declarations.color.important = true; },
    e => { e.inputTrees.reference.rules[0].declarations.color.value = 'currentColor'; },
    e => { e.inputTrees.reference.rules[0].source = 'sheet:3/1/0'; },
    e => { e.inputTrees.reference.rules[0].active = false; },
    e => { e.inputTrees.reference.rules[0].conditions = ['screen']; },
    e => { e.inputTrees.reference.rules.at(-1).source = 'sheet:3/0'; },
    e => { e.inputTrees.reference.rules.at(-1).source = 'sheet:4/2'; },
    e => { e.inputTrees.reference.rules.at(-1).selector = '.frame.dark'; },
    e => { e.inputTrees.reference.nodes[0].attributes.class = 'frame'; },
    e => { e.inputTrees.reference.nodes[1].rules = [0]; },
    e => { e.inputTrees.reference.nodes[1].inline.color = { value: 'inherit', important: false }; },
    e => { e.inputTrees.reference.styles[0].color = '#ffffff'; },
    e => { e.inputTrees.astylar.rules[0].color = '#000000'; },
    e => { e.inputTrees.astylar.rules.push({ selector: 'section', color: '#e6e1e5' }); },
    e => { e.inputTrees.astylar.rules.push({ selector: ':is(section)', color: '#e6e1e5' }); },
    e => { e.inputTrees.astylar.rules.push({ selector: '#chips-root', all: 'initial' }); },
    e => { e.inputTrees.astylar.rules.push({ selector: '#page', transition: 'color 1s' }); },
    e => { e.inputTrees.astylar.nodes[2].authored.style = { color: 'inherit' }; },
    e => { e.inputTrees.astylar.nodes[2].resolvedStyle.color = '#e6e1e5'; },
    e => { e.inputTrees.astylar.nodes[1].interactionResolvedStyle.color = '#ffffff'; },
    e => { e.inputTrees.astylar.nodes[2].parent = 'root'; },
    e => { delete e.inputTrees.astylar.nodes[1].normalResolvedStyle; },
    e => { e.inputTrees.astylar.resolvedStyleSource = 'predicted'; },
    e => { e.inputTrees.reference.nodes.push(structuredClone(e.inputTrees.reference.nodes[1])); },
  ];
  for (const [i, change] of changes.entries()) {
    const raw = rootColorReport('chips', true); change(raw.results[0]); const audit = buildMaterialInputAudit(raw);
    assert.equal(audit.rootColorInputs.length, 0, `mutation ${i}`);
    assert.ok(audit.discrepancies.every(d => d.attribution !== 'reviewed-root-color-declaration-stage'), `mutation ${i}`);
  }
});

test('root color rejects matching but invalid or unreviewed color literals', () => {
  for (const color of ['#12345', '#1234567', 'rgb(invalid)', 'rgb(999,0,0)', 'rgba(1,2,3,2)']) {
    const raw = rootColorReport(), e = raw.results[0], { reference: r, astylar: a } = e.inputTrees;
    r.rules[0].declarations.color.value = color; r.styles[0].color = color; e.styleInputs[0].reference.color = color;
    a.rules[0].color = color;
    for (const stage of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle']) a.nodes[1][stage].color = color;
    assert.equal(buildMaterialInputAudit(raw).rootColorInputs.length, 0, color);
  }
});

test('root color independently rejects scalar changes and forged report equivalence', () => {
  for (const mutate of [i => { i.reference.color = '#ffffff'; }, i => { i.astylar.color = '#1d1b20'; },
    i => { i.astylarNormalResolvedStyle.color = 'inherit'; }, i => { delete i.astylarInteractionResolvedStyle; },
    i => { i.referenceAuthored[0].declarations.color = { value: 'inherit', important: false }; },
    i => { i.astylarAuthored[0].declarations.color = 'inherit'; }, i => { i.astylarResolvedStyleEvidenceVersion = 1; }]) {
    const raw = rootColorReport(); mutate(raw.results[0].styleInputs[0]);
    assert.ok(buildMaterialInputAudit(raw).discrepancies.every(d => d.attribution !== 'reviewed-root-color-declaration-stage'));
  }
  const audit = buildMaterialInputAudit(rootColorReport());
  for (const mutate of [a => { a.rootColorInputs[0].computedCandidateVerified = true; },
    a => { a.rootColorInputs[0].candidatePath[1].normal.color = '#1d1b20'; },
    a => { a.discrepancies.find(d => d.attribution === 'reviewed-root-color-declaration-stage').classification = 'equivalent-representation'; },
    a => { a.discrepancies.find(d => d.attribution === 'reviewed-root-color-declaration-stage').reviewedCases = []; },
    a => { a.discrepancies.find(d => d.attribution === 'reviewed-root-color-declaration-stage').astylar = '#1d1b20'; }]) {
    const copy = structuredClone(audit); mutate(copy);
    assert.ok(validateMaterialInputAudit(copy, { requireComplete: false }).some(e => e.includes('root color')));
  }
});

function rootTypographyReport(family = 'chips', size = '16px') {
  const raw = fieldHostTypographyReport(family, size), e = raw.results[0];
  const section = { ...e.styleInputs[0], id: `${family}-root`,
    reference: { fontFamily: 'Roboto, Arial, sans-serif', fontSize: size, lineHeight: 'normal' },
    referenceStructure: { schemaVersion: 2, type: 'section', text: '' },
    astylarStructure: { schemaVersion: 2, type: 'section', ownText: '', text: '' },
    referenceAuthored: [{ selector: '.demo', declarations: { display: { value: 'block', important: false } } }],
    astylarAuthored: [{ selector: `#${family}-root`, declarations: { display: 'flex' } }],
  };
  e.styleInputs = [section];
  return raw;
}

test('root typography distinguishes captured inheritance requests from local declaration stages', () => {
  const raw = parityReport({}, {}); raw.results = [];
  for (const family of ['chips', 'button', 'datepicker']) for (const size of ['16px', '14.4px', '18.4px'])
    for (const state of [undefined, 'hover', 'held', 'focus', 'disabled']) {
      const e = rootTypographyReport(family, size).results[0];
      if (state) { e.state = state; raw.interactions.push(e); } else raw.results.push(e);
    }
  const before = JSON.stringify(raw), audit = buildMaterialInputAudit(raw);
  assert.equal(audit.rootTypographyInputs.length, 90);
  const diffs = audit.discrepancies.filter(d => d.attribution === 'reviewed-root-typography-declaration-stage');
  assert.equal(diffs.reduce((n, d) => n + d.occurrences, 0), 90);
  for (const d of diffs) {
    assert.equal(d.classification, 'parity-harness-defect');
    assert.equal(d.astylar, undefined);
    assert.equal(d.reviewEvidence.computedCandidateVerified, false);
    assert.equal(d.reviewEvidence.finalRasterVerified, false);
    assert.equal(d.reviewEvidence.candidatePath[1].comparison[d.property], undefined);
    assert.equal(d.reviewedCases.length, d.occurrences);
    assert.match(d.justification, /inherited em sizing/);
  }
  assert.deepEqual(validateMaterialInputAudit(audit, { requireComplete: false }).filter(e => /root typography/.test(e)), []);
  assert.equal(JSON.stringify(raw), before);
});

test('root typography refuses incomplete ancestry and competing or changed declarations', () => {
  const mutations = [
    e => { e.inputTrees.reference.nodes[1].parent = 'missing'; },
    e => { e.inputTrees.reference.nodes[0].parent = 'outside'; },
    e => { e.inputTrees.reference.nodes[1].ownText = 'direct text'; },
    e => { e.inputTrees.reference.nodes[1].inline = { 'font-size': { value: 'inherit', important: false } }; },
    e => { e.inputTrees.reference.rules[0].active = false; },
    e => { e.inputTrees.reference.rules[0].declarations['font-size'].value = '16px'; },
    e => { e.inputTrees.reference.styles[0].fontSize = '20px'; },
    e => { e.inputTrees.reference.nodes.push(structuredClone(e.inputTrees.reference.nodes[1])); },
    e => { e.inputTrees.astylar.nodes[0].authored = { style: { fontSize: '20px' } }; },
    e => { e.inputTrees.astylar.nodes[2].parent = 'root'; },
    e => { e.inputTrees.astylar.nodes[2].authored.textContent = 'own text'; },
    e => { e.inputTrees.astylar.nodes[2].authored.style = { fontSize: 'inherit' }; },
    e => { e.inputTrees.astylar.nodes[2].normalResolvedStyle.fontSize = '16px'; },
    e => { e.inputTrees.astylar.nodes[2].interactionResolvedStyle.lineHeight = '24px'; },
    e => { delete e.inputTrees.astylar.nodes[1].resolvedStyle; },
    e => { e.inputTrees.astylar.rules[0].fontSize = '18px'; },
    e => { e.inputTrees.astylar.rules.push({ selector: 'section:hover', fontSize: '16px' }); },
    e => { e.inputTrees.astylar.rules.push({ selector: ':is(section)', fontSize: '16px' }); },
    e => { e.inputTrees.astylar.rules.push({ selector: '.unknown section', all: 'initial' }); },
    e => { e.inputTrees.astylar.rules.push({ selector: '#chips-root', transition: 'all 1s' }); },
    e => { e.inputTrees.astylar.rules.push({ selector: 'section', nested: { fontSize: '16px' } }); },
    e => { e.inputTrees.astylar.resolvedStyleSource = 'predicted'; },
    e => { delete e.inputTrees.astylar.resolvedStyleRevision; },
    e => { e.inputTrees.astylar.errors.push('incomplete'); },
  ];
  for (const [i, change] of mutations.entries()) {
    const raw = rootTypographyReport(); change(raw.results[0]);
    const audit = buildMaterialInputAudit(raw);
    assert.equal(audit.rootTypographyInputs.length, 0, `mutation ${i}`);
    assert.equal(audit.discrepancies.some(d => d.attribution === 'reviewed-root-typography-declaration-stage'), false, `mutation ${i}`);
  }
});

test('root typography scalar and report tampering cannot manufacture computed equivalence', () => {
  for (const mutate of [
    i => { i.reference.fontSize = '20px'; }, i => { i.astylar.fontFamily = 'Arial'; },
    i => { i.astylarNormalResolvedStyle.fontSize = '16px'; }, i => { delete i.astylarInteractionResolvedStyle; },
    i => { i.referenceStructure.type = 'div'; }, i => { i.astylarResolvedStyleEvidenceVersion = 1; },
    i => { i.referenceAuthored[0].declarations.font = { value: 'inherit' }; },
    i => { i.astylarAuthored[0].declarations.fontSize = '16px'; },
  ]) {
    const raw = rootTypographyReport(); mutate(raw.results[0].styleInputs[0]);
    const audit = buildMaterialInputAudit(raw);
    const eligible = audit.discrepancies.filter(d => d.attribution === 'reviewed-root-typography-declaration-stage');
    assert.ok(eligible.every(d => d.reference === 'roboto,arial,sans-serif' && d.property === 'fontFamily'));
    assert.ok(eligible.length <= 1);
  }
  const base = buildMaterialInputAudit(rootTypographyReport());
  for (const mutate of [
    a => { a.rootTypographyInputs[0].computedCandidateVerified = true; },
    a => { a.rootTypographyInputs[0].candidatePath[1].normal.fontSize = '16px'; },
    a => { a.discrepancies.find(d => d.attribution === 'reviewed-root-typography-declaration-stage').reviewedCases = []; },
    a => { a.discrepancies.find(d => d.attribution === 'reviewed-root-typography-declaration-stage').classification = 'equivalent-representation'; },
  ]) {
    const report = structuredClone(base); mutate(report);
    assert.ok(validateMaterialInputAudit(report, { requireComplete: false }).some(e => /root typography/.test(e)));
  }
});

test('container caret case index links every root and field observation without claiming editable caret paint', async () => {
  const { readFileSync } = await import('node:fs'), { createHash } = await import('node:crypto');
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  const index = JSON.parse(readFileSync('docs/material-container-caret-audit.json', 'utf8'));
  const bytes = readFileSync(index.capture.file); assert.equal(hash(bytes), index.capture.sha256);
  assert.equal(index.sourceFingerprints.length, 11);
  assertHistoricalCaseIndexSources('docs/material-container-caret-audit.json', index);
  const sources = index.caseSources.map(s => {
    const value = JSON.parse(readFileSync(s.file, 'utf8'));
    assert.deepEqual(value.capture, index.capture); assert.equal(value.groups.length, s.groupCount); return value;
  });
  const covered = new Map(), groupLinks = new Set();
  for (const g of index.groups) {
    assert.equal(g.property, 'caretColor'); assert.equal(g.candidate, '<omitted>'); assert.equal(g.classification, 'parity-harness-defect');
    const link = `${g.sourceIndex}:${g.sourceGroupIndex}`; assert.equal(groupLinks.has(link), false); groupLinks.add(link);
    const source = sources[g.sourceIndex].groups[g.sourceGroupIndex];
    for (const key of ['family', 'element', 'reference', 'candidate', 'occurrences']) assert.equal(g[key], source[key]);
    assert.equal(source.reviewedCases.length, g.occurrences);
    for (const key of source.reviewedCases) {
      const id = `${key}/${g.element}`; assert.equal(covered.has(id), false); covered.set(id, g);
    }
  }
  const affects = d => Object.keys(d).some(k => ['caretcolor', 'all'].includes(k.replaceAll('-', '').toLowerCase()) || /^(animation|transition)/i.test(k));
  const raw = JSON.parse(bytes), expected = [], fields = ['form-field', 'input', 'autocomplete', 'select', 'datepicker', 'timepicker'];
  let treeCount = 0;
  for (const [kind, entries] of [['static', raw.results], ['interaction', raw.interactions]]) for (const e of entries) {
    const key = `${kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? `/${e.state}` : ''}`;
    const ids = [`${e.family}-root`, ...(fields.includes(e.family) ? [`${e.family}-primary`] : [])], trees = {};
    for (const side of ['reference', 'astylar']) {
      const f = e.inputTrees[side], bytes = readFileSync(f.file); assert.equal(hash(bytes), f.sha256); trees[side] = JSON.parse(bytes); treeCount++;
    }
    for (const id of ids) {
      const caseId = `${key}/${id}`, g = covered.get(caseId); expected.push(caseId); assert.ok(g, caseId);
      const browser = e.profile === 'dark' ? 'rgb(230, 225, 229)' : 'rgb(29, 27, 32)';
      assert.equal(g.reference, e.profile === 'dark' ? 'rgba(230,225,229,1)' : 'rgba(29,27,32,1)');
      const input = e.styleInputs.find(i => i.id === id); assert.equal(input.reference.caretColor, browser);
      assert.equal(input.reference.caretColor, input.reference.color);
      for (const stage of ['astylar', 'astylarNormalResolvedStyle', 'astylarInteractionResolvedStyle']) assert.equal(affects(input[stage]), false);
      for (const rules of [input.referenceAuthored, input.astylarAuthored]) assert.ok(rules.every(r => !affects(r.declarations)));
      for (const side of ['reference', 'astylar']) {
        const t = trees[side], matches = t.nodes.filter(n => (side === 'reference' ? n.attributes?.id : n.authored?.id) === id);
        assert.equal(matches.length, 1); let n = matches[0], depth = 0;
        while (n && (side === 'reference' || n.authored.type)) {
          depth++;
          if (side === 'reference') {
            assert.equal(t.styles[n.style].caretColor, browser); assert.equal(affects(n.inline), false);
            assert.ok(n.rules.every(i => !affects(t.rules[i].declarations)));
            assert.doesNotMatch(n.attributes?.style ?? '', /(?:^|;)\s*(?:caret-color|all|animation[^:]*|transition[^:]*)\s*:/i);
          } else {
            assert.equal(affects(n.authored.style ?? {}), false);
            for (const stage of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle']) assert.equal(affects(n[stage]), false);
            // The sole captured caret declaration belongs to a different control,
            // never these container ancestors. Any new rule requires review.
            for (const r of t.rules.filter(affects)) {
              assert.equal(r.selector, '.select-control, .select-control:focus');
              assert.equal(String(n.authored.class ?? '').split(/\s+/).includes('select-control'), false);
            }
          }
          n = t.nodes.find(p => p.key === n.parent);
        }
        assert.equal(depth, id.endsWith('-root') ? 2 : 3);
      }
    }
  }
  assert.deepEqual([...covered.keys()].sort(), expected.sort()); assert.equal(covered.size, 2888); assert.equal(index.caseCount, 2888);
  assert.equal(treeCount, 4622); assert.equal(groupLinks.size, 84); assert.equal(index.groupCount, 84);
  assert.deepEqual([...groupLinks].sort(), sources.flatMap((s, i) => s.groups.map((_, j) => `${i}:${j}`)).sort());
  for (const flag of ['computedCandidateVerified', 'descendantCaretVerified', 'finalRasterVerified']) assert.equal(index.verification[flag], false);
});

test('root box model case index links all companion declarations without duplicating or sampling boundaries', async () => {
  const { readFileSync } = await import('node:fs'), { createHash } = await import('node:crypto');
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  const index = JSON.parse(readFileSync('docs/material-root-height-audit.json', 'utf8'));
  const c = index.companionBoxModel, bytes = readFileSync(index.capture.file); assert.equal(hash(bytes), index.capture.sha256);
  const raw = JSON.parse(bytes), cases = new Map(), indices = new Set();
  assert.equal(c.attribution, 'reviewed-root-fixed-height-box-model'); assert.equal(c.groupCount, 36); assert.equal(c.groups.length, 36);
  for (const g of c.groups) {
    assert.equal(g.property, 'boxSizing'); assert.equal(g.reference, 'content-box'); assert.equal(g.candidate, 'border-box');
    assert.equal(g.classification, 'application-plugin-authoring-defect');
    let count = 0;
    for (const i of g.heightGroupIndices) {
      assert.ok(Number.isInteger(i)); assert.equal(indices.has(i), false); indices.add(i);
      const h = index.groups[i]; assert.equal(h.family, g.family); assert.equal(h.element, g.element);
      for (const key of h.reviewedCases) { assert.equal(cases.has(key), false); cases.set(key, g); count++; }
    }
    assert.equal(count, g.occurrences);
  }
  const affectsBox = d => Object.keys(d).some(k => ['boxsizing', 'all'].includes(k.replaceAll('-', '').toLowerCase()) || /^(animation|transition)/i.test(k));
  const expected = [];
  for (const [kind, entries] of [['static', raw.results], ['interaction', raw.interactions]]) for (const e of entries) {
    const key = `${kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? `/${e.state}` : ''}`;
    expected.push(key); const g = cases.get(key); assert.ok(g, key);
    const input = e.styleInputs.find(i => i.id === g.element); assert.equal(input.reference.boxSizing, 'content-box');
    assert.ok(input.referenceAuthored.every(r => !affectsBox(r.declarations)));
    assert.ok(input.astylarAuthored.some(r => r.selector === `#${g.element}` && r.declarations.boxSizing === 'border-box'));
    for (const s of ['astylar', 'astylarNormalResolvedStyle', 'astylarInteractionResolvedStyle']) assert.equal(input[s].boxSizing, 'border-box');
    for (const side of ['reference', 'astylar']) {
      const f = e.inputTrees[side], bytes = readFileSync(f.file); assert.equal(hash(bytes), f.sha256, `${key}/${side}`);
      const tree = JSON.parse(bytes), nodes = tree.nodes.filter(n => (side === 'reference' ? n.attributes?.id : n.authored?.id) === g.element);
      assert.equal(nodes.length, 1); const n = nodes[0];
      if (side === 'reference') {
        assert.equal(n.type, 'section'); assert.equal(tree.styles[n.style].boxSizing, 'content-box');
        assert.equal(affectsBox(n.inline), false); assert.ok(n.rules.every(i => !affectsBox(tree.rules[i].declarations)));
      } else {
        assert.equal(n.authored.type, 'section'); assert.equal(n.authored.style?.boxSizing, undefined);
        assert.ok(tree.rules.some(r => r.selector === `#${g.element}` && r.boxSizing === 'border-box'));
        for (const s of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle']) assert.equal(n[s].boxSizing, 'border-box');
      }
    }
  }
  assert.deepEqual([...indices].sort((a, b) => a - b), index.groups.map((_, i) => i));
  assert.deepEqual([...cases.keys()].sort(), expected.sort()); assert.equal(cases.size, 2311); assert.equal(c.caseCount, 2311);
  assert.equal(c.verification.usedSizeEquivalentVerified, false); assert.equal(c.verification.finalRasterVerified, false);
});

test('root height case index retains all fixed declarations and raw content-box measurements', async () => {
  const { readFileSync } = await import('node:fs'), { createHash } = await import('node:crypto');
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  const index = JSON.parse(readFileSync('docs/material-root-height-audit.json', 'utf8'));
  const bytes = readFileSync(index.capture.file); assert.equal(hash(bytes), index.capture.sha256);
  assert.equal(index.sourceFingerprints.length, 9);
  assertHistoricalCaseIndexSources('docs/material-root-height-audit.json', index);
  const report = JSON.parse(bytes), covered = new Map(), expected = [];
  for (const g of index.groups) {
    assert.equal(g.property, 'height'); assert.equal(g.classification, 'application-plugin-authoring-defect');
    assert.equal(g.reviewedCases.length, g.occurrences);
    for (const key of g.reviewedCases) { assert.equal(covered.has(key), false); covered.set(key, g); }
  }
  for (const [kind, entries] of [['static', report.results], ['interaction', report.interactions]]) for (const e of entries) {
    const key = `${kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? `/${e.state}` : ''}`, g = covered.get(key);
    expected.push(key); assert.ok(g, key); assert.equal(g.family, e.family); assert.equal(g.element, `${e.family}-root`);
    const input = e.styleInputs.find(i => i.id === g.element); assert.equal(input.reference.height, g.reference);
    assert.equal(input.reference.boxSizing, 'content-box');
    assert.ok(input.referenceAuthored.every(r => r.declarations.height === undefined));
    assert.ok(input.astylarAuthored.some(r => r.selector === `#${g.element}` && r.declarations.height === g.candidate));
    for (const stage of ['astylar', 'astylarNormalResolvedStyle', 'astylarInteractionResolvedStyle']) {
      assert.equal(input[stage].height, g.candidate); assert.equal(input[stage].boxSizing, 'border-box');
    }
    for (const side of ['reference', 'astylar']) {
      const source = e.inputTrees[side], raw = readFileSync(source.file); assert.equal(hash(raw), source.sha256, `${key}/${side}`);
      const tree = JSON.parse(raw), nodes = tree.nodes.filter(n => (side === 'reference' ? n.attributes?.id : n.authored?.id) === g.element);
      assert.equal(nodes.length, 1); const node = nodes[0];
      if (side === 'reference') {
        assert.equal(node.type, 'section'); assert.equal(tree.styles[node.style].height, g.reference);
        assert.equal(node.inline.height, undefined); assert.ok(node.rules.every(i => tree.rules[i].declarations.height === undefined));
      } else {
        assert.equal(node.authored.type, 'section');
        for (const stage of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle']) assert.equal(node[stage].height, g.candidate);
      }
    }
  }
  assert.deepEqual([...covered.keys()].sort(), expected.sort()); assert.equal(covered.size, 2311); assert.equal(index.caseCount, 2311);
  assert.equal(index.groups.length, 105); assert.equal(index.scalarGroups, 105);
  for (const flag of ['inputEquivalent', 'usedSizeEquivalentVerified', 'responsiveRuleSelectionVerified', 'finalRasterVerified']) assert.equal(index.verification[flag], false);
});

test('field host color case index preserves every raw host and separate font authoring', async () => {
  const { readFileSync } = await import('node:fs'), { createHash } = await import('node:crypto');
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  const index = JSON.parse(readFileSync('docs/material-field-host-color-audit.json', 'utf8'));
  const bytes = readFileSync(index.capture.file); assert.equal(hash(bytes), index.capture.sha256);
  assert.equal(index.sourceFingerprints.length, 9);
  assertHistoricalCaseIndexSources('docs/material-field-host-color-audit.json', index);
  const report = JSON.parse(bytes), covered = new Map(), expected = [];
  for (const g of index.groups) {
    assert.equal(g.property, 'color'); assert.equal(g.candidate, '<omitted>'); assert.equal(g.classification, 'parity-harness-defect');
    assert.equal(g.reviewedCases.length, g.occurrences);
    for (const key of g.reviewedCases) { assert.equal(covered.has(key), false); covered.set(key, g); }
  }
  const families = ['form-field', 'input', 'autocomplete', 'select', 'datepicker', 'timepicker'];
  for (const [kind, entries] of [['static', report.results], ['interaction', report.interactions]]) for (const e of entries) {
    if (!families.includes(e.family)) continue;
    const key = `${kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? `/${e.state}` : ''}`, g = covered.get(key);
    expected.push(key); assert.ok(g, key); assert.equal(g.family, e.family); assert.equal(g.element, `${e.family}-primary`);
    const browser = e.profile === 'dark' ? 'rgb(230, 225, 229)' : 'rgb(29, 27, 32)';
    assert.equal(g.reference, e.profile === 'dark' ? 'rgba(230,225,229,1)' : 'rgba(29,27,32,1)');
    const input = e.styleInputs.find(i => i.id === g.element); assert.equal(input.reference.color, browser);
    for (const stage of ['astylar', 'astylarNormalResolvedStyle', 'astylarInteractionResolvedStyle']) assert.equal(input[stage].color, undefined);
    const trees = {};
    for (const side of ['reference', 'astylar']) {
      const source = e.inputTrees[side], raw = readFileSync(source.file); assert.equal(hash(raw), source.sha256, `${key}/${side}`); trees[side] = JSON.parse(raw);
    }
    const r = trees.reference, a = trees.astylar, matches = r.nodes.filter(n => n.attributes?.id === g.element);
    assert.equal(matches.length, 1); const host = matches[0]; assert.equal(host.type, 'mat-form-field'); assert.equal(host.ownText, '');
    const section = r.nodes.find(n => n.key === host.parent), frame = r.nodes.find(n => n.key === section.parent);
    assert.equal(section.attributes.id, `${e.family}-root`); assert.equal(frame.type, 'main');
    for (const node of [frame, section, host]) assert.equal(r.styles[node.style].color, browser);
    assert.equal(host.inline.color, undefined);
    const rules = host.rules.map(i => r.rules[i]); assert.ok(rules.every(rule => rule.declarations.color === undefined));
    const token = rules.find(rule => rule.selector === '.mat-mdc-form-field'); assert.ok(token);
    assert.equal(token.declarations['font-family'].value, 'var(--mat-form-field-container-text-font, var(--mat-sys-body-large-font))');
    const candidates = a.nodes.filter(n => n.authored.id === g.element); assert.equal(candidates.length, 1);
    const node = candidates[0], parent = a.nodes.find(n => n.key === node.parent), page = a.nodes.find(n => n.key === parent.parent);
    assert.equal(node.authored.type, 'div'); assert.ok(node.authored.class.split(/\s+/).includes('field-shell'));
    assert.equal(parent.authored.id, `${e.family}-root`); assert.equal(page.authored.id, 'page');
    for (const stage of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle']) {
      assert.equal(node[stage].color, undefined); assert.equal(parent[stage].color, undefined);
      assert.equal(page[stage].color, e.profile === 'dark' ? '#e6e1e5' : '#1d1b20');
      assert.equal(node[stage].fontFamily, undefined);
    }
  }
  assert.deepEqual([...covered.keys()].sort(), expected.sort()); assert.equal(covered.size, 577); assert.equal(index.caseCount, 577);
  assert.equal(index.groups.length, 12); assert.equal(index.scalarGroups, 12);
  for (const flag of ['inputEquivalent', 'computedCandidateVerified', 'finalRasterVerified']) assert.equal(index.verification[flag], false);
});

test('root color case index covers every raw section and retains diagnostic stage limits', async () => {
  const { readFileSync } = await import('node:fs'), { createHash } = await import('node:crypto');
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  const index = JSON.parse(readFileSync('docs/material-root-color-audit.json', 'utf8'));
  const bytes = readFileSync(index.capture.file); assert.equal(hash(bytes), index.capture.sha256);
  assert.equal(index.sourceFingerprints.length, 7);
  assertHistoricalCaseIndexSources('docs/material-root-color-audit.json', index);
  const report = JSON.parse(bytes), covered = new Map(), expected = [];
  for (const group of index.groups) {
    assert.equal(group.property, 'color'); assert.equal(group.candidate, '<omitted>');
    assert.equal(group.classification, 'parity-harness-defect'); assert.equal(group.reviewedCases.length, group.occurrences);
    for (const key of group.reviewedCases) { assert.equal(covered.has(key), false); covered.set(key, group); }
  }
  const colors = { light: ['rgba(29,27,32,1)', 'rgb(29, 27, 32)', '#1d1b20'], dark: ['rgba(230,225,229,1)', 'rgb(230, 225, 229)', '#e6e1e5'] };
  for (const [kind, entries] of [['static', report.results], ['interaction', report.interactions]]) for (const e of entries) {
    const key = `${kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? `/${e.state}` : ''}`;
    expected.push(key); const group = covered.get(key); assert.ok(group, key);
    assert.equal(group.family, e.family); assert.equal(group.element, `${e.family}-root`);
    const [canonical, browser, candidate] = colors[e.profile === 'dark' ? 'dark' : 'light']; assert.equal(group.reference, canonical);
    const input = e.styleInputs.find(i => i.id === group.element); assert.ok(input, key);
    assert.equal(input.reference.color, browser);
    for (const stage of ['astylar', 'astylarNormalResolvedStyle', 'astylarInteractionResolvedStyle']) assert.equal(input[stage].color, undefined);
    const trees = {};
    for (const side of ['reference', 'astylar']) {
      const source = e.inputTrees[side], raw = readFileSync(source.file); assert.equal(hash(raw), source.sha256, `${key}/${side}`);
      trees[side] = JSON.parse(raw);
    }
    const r = trees.reference, a = trees.astylar;
    const sections = r.nodes.filter(n => n.attributes?.id === group.element); assert.equal(sections.length, 1);
    const section = sections[0], frame = r.nodes.find(n => n.key === section.parent);
    assert.equal(section.type, 'section'); assert.equal(section.ownText, ''); assert.equal(frame.type, 'main');
    assert.equal(r.styles[section.style].color, browser); assert.equal(r.styles[frame.style].color, browser);
    assert.equal(section.inline.color, undefined); assert.equal(frame.inline.color, undefined);
    assert.ok(section.rules.every(i => r.rules[i].declarations.color === undefined));
    const rules = frame.rules.map(i => r.rules[i]).filter(rule => rule.declarations.color);
    assert.equal(rules.length, e.profile === 'dark' ? 2 : 1);
    assert.match(rules[0].selector, /^\.frame\[_ngcontent-[\w-]+\]$/);
    assert.equal(rules[0].declarations.color.value, colors.light[1]);
    assert.equal(rules.at(-1).declarations.color.value, browser);
    for (const rule of rules) { assert.equal(rule.active, true); assert.deepEqual(rule.conditions, []); assert.equal(rule.declarations.color.important, false); }
    if (rules.length === 2) {
      assert.equal(rules[1].selector, rules[0].selector.replace('.frame', '.dark'));
      assert.equal(rules[1].source.split('/')[0], rules[0].source.split('/')[0]);
      assert.ok(Number(rules[1].source.split('/')[1]) > Number(rules[0].source.split('/')[1]));
    }
    const nodes = a.nodes.filter(n => n.authored.id === group.element); assert.equal(nodes.length, 1);
    const node = nodes[0], page = a.nodes.find(n => n.key === node.parent);
    assert.equal(node.authored.type, 'section'); assert.equal(page.authored.id, 'page');
    for (const stage of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle']) {
      assert.equal(node[stage].color, undefined); assert.equal(page[stage].color, candidate);
    }
    assert.equal(a.rules.filter(rule => rule.selector === '#page' && rule.color === candidate).length, 1);
  }
  assert.deepEqual([...covered.keys()].sort(), expected.sort()); assert.equal(covered.size, 2311);
  assert.equal(index.caseCount, covered.size); assert.equal(index.groups.length, 72);
  for (const flag of ['inputEquivalent', 'computedCandidateVerified', 'finalRasterVerified']) assert.equal(index.verification[flag], false);
});

test('root typography case index covers every main capture and preserves raw tree hashes', async () => {
  const { readFileSync } = await import('node:fs'), { createHash } = await import('node:crypto');
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  const index = JSON.parse(readFileSync('docs/material-root-typography-audit.json', 'utf8'));
  const bytes = readFileSync(index.capture.file); assert.equal(hash(bytes), index.capture.sha256);
  assertHistoricalCaseIndexSources('docs/material-root-typography-audit.json', index);
  assert.equal(index.sourceFingerprints.length, 6);
  const report = JSON.parse(bytes), covered = new Map(), expected = [];
  for (const group of index.groups) {
    assert.deepEqual(group.properties, ['fontFamily', 'fontSize']);
    assert.equal(group.candidateLocalDeclaration, '<omitted>');
    for (const key of group.cases) { assert.equal(covered.has(key), false); covered.set(key, group); }
  }
  for (const [kind, entries] of [['static', report.results], ['interaction', report.interactions]]) for (const entry of entries) {
    const key = `${kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? `/${entry.state}` : ''}`;
    expected.push(key); const group = covered.get(key); assert.ok(group, key); assert.equal(group.family, entry.family);
    const input = entry.styleInputs.find(i => i.id === `${entry.family}-root`); assert.ok(input, key);
    assert.equal(input.reference.fontFamily, 'Roboto, Arial, sans-serif'); assert.equal(input.reference.fontSize, group.pageSize);
    for (const property of group.properties) for (const stage of ['astylar', 'astylarNormalResolvedStyle', 'astylarInteractionResolvedStyle'])
      assert.equal(input[stage][property], undefined, `${key}/${stage}/${property}`);
    for (const side of ['reference', 'astylar']) {
      const source = entry.inputTrees[side]; assert.equal(hash(readFileSync(source.file)), source.sha256, `${key}/${side}`);
    }
  }
  assert.deepEqual([...covered.keys()].sort(), expected.sort());
  assert.equal(covered.size, 2311); assert.equal(index.caseCount, covered.size);
  assert.equal(index.propertyObservations, covered.size * 2);
  assert.equal(index.verification.classifiedGroups, 144);
  for (const flag of ['inputEquivalent', 'computedCandidateVerified', 'finalRasterVerified']) assert.equal(index.verification[flag], false);
});

test('field host alignment case index covers all explicit requests and unchanged ancestor omissions', async () => {
  const { readFileSync } = await import('node:fs'), { createHash } = await import('node:crypto');
  const { selectorCanApply } = await import('./border-initial-input-evidence.mjs');
  const hash = b => createHash('sha256').update(b).digest('hex');
  const index = JSON.parse(readFileSync('docs/material-field-host-alignment-audit.json', 'utf8'));
  const bytes = readFileSync(index.capture.file); assert.equal(hash(bytes), index.capture.sha256);
  assert.equal(index.sourceFingerprints.length, 7);
  assertHistoricalCaseIndexSources('docs/material-field-host-alignment-audit.json', index);
  const covered = new Map(), expected = [], raw = JSON.parse(bytes);
  const affects = d => Object.keys(d ?? {}).some(k => ['textalign', 'textalignlast', 'direction', 'unicodebidi', 'writingmode', 'all'].includes(k.replaceAll('-', '').toLowerCase()) || /^(animation|transition)/i.test(k));
  for (const g of index.groups) {
    assert.equal(g.property, 'textAlign'); assert.equal(g.reference, 'left'); assert.equal(g.candidate, '<omitted>');
    assert.equal(g.classification, 'application-plugin-authoring-defect'); assert.equal(g.occurrences, g.reviewedCases.length);
    for (const key of g.reviewedCases) { assert.equal(covered.has(key), false); covered.set(key, g); }
  }
  let treeCount = 0;
  for (const [kind, entries] of [['static', raw.results], ['interaction', raw.interactions]]) for (const e of entries) {
    if (!['form-field', 'input', 'autocomplete', 'select', 'datepicker', 'timepicker'].includes(e.family)) continue;
    const key = `${kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? `/${e.state}` : ''}`, g = covered.get(key);
    expected.push(key); assert.ok(g, key); assert.equal(g.family, e.family); assert.equal(g.element, `${e.family}-primary`);
    const input = e.styleInputs.find(i => i.id === g.element); assert.equal(input.reference.textAlign, 'left');
    const rules = input.referenceAuthored.filter(r => affects(r.declarations)); assert.equal(rules.length, 1);
    assert.equal(rules[0].selector, '.mat-mdc-form-field'); assert.deepEqual(rules[0].declarations['text-align'], { value: 'left', important: false });
    assert.ok(input.astylarAuthored.every(r => !affects(r.declarations)));
    for (const s of ['astylar', 'astylarNormalResolvedStyle', 'astylarInteractionResolvedStyle']) assert.equal(affects(input[s]), false);
    for (const side of ['reference', 'astylar']) {
      const f = e.inputTrees[side], bytes = readFileSync(f.file); assert.equal(hash(bytes), f.sha256); treeCount++;
      const t = JSON.parse(bytes), matches = t.nodes.filter(n => (side === 'reference' ? n.attributes?.id : n.authored?.id) === g.element);
      assert.equal(matches.length, 1); let n = matches[0], depth = 0;
      while (n && (side === 'reference' || n.authored.type)) {
        if (side === 'reference') {
          assert.equal(t.styles[n.style].textAlign, depth === 0 ? 'left' : 'start'); assert.equal(affects(n.inline), false);
          const rs = n.rules.map(i => t.rules[i]).filter(r => affects(r.declarations)); assert.equal(rs.length, depth === 0 ? 1 : 0);
          if (depth === 0) { assert.equal(rs[0].selector, '.mat-mdc-form-field'); assert.deepEqual(rs[0].declarations['text-align'], { value: 'left', important: false }); }
        } else {
          assert.equal(affects(n.authored.style), false);
          for (const s of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle']) assert.equal(affects(n[s]), false);
          for (const rule of t.rules.filter(affects)) {
            // These two descendant selectors cannot target a main/section/div;
            // all other captured alignment selectors must be provably excluded.
            if (/^\.material-table (th|td)$/.test(rule.selector)) assert.ok(!['th', 'td'].includes(n.authored.type));
            else assert.equal(selectorCanApply(rule.selector, n.authored), false, `${key}/${rule.selector}`);
          }
        }
        depth++; n = t.nodes.find(p => p.key === n.parent);
      }
      assert.equal(depth, 3);
    }
  }
  assert.deepEqual([...covered.keys()].sort(), expected.sort()); assert.equal(covered.size, 577); assert.equal(index.caseCount, 577);
  assert.equal(index.groups.length, 6); assert.equal(index.groupCount, 6); assert.equal(treeCount, 1154);
  for (const flag of ['computedCandidateVerified', 'descendantAlignmentVerified', 'finalRasterVerified']) assert.equal(index.verification[flag], false);
});

function fieldHostAlignmentReport(family = 'autocomplete', pageSize = '16px') {
  const raw = fieldHostTypographyReport(family, pageSize), e = raw.results[0], r = e.inputTrees.reference;
  r.styles[0].textAlign = 'start'; r.styles[1].textAlign = 'left';
  r.rules[1].declarations['text-align'] = { value: 'left', important: false };
  e.styleInputs[0].reference.textAlign = 'left';
  e.styleInputs[0].referenceAuthored[0].declarations['text-align'] = { value: 'left', important: false };
  return raw;
}

test('field host alignment preserves explicit left requests separately from inherited or painted alignment', () => {
  const raw = parityReport({}, {}); raw.results = [];
  for (const family of ['form-field', 'input', 'autocomplete', 'select', 'datepicker', 'timepicker'])
    for (const size of ['16px', '14.4px', '18.4px']) for (const state of [undefined, 'hover', 'held', 'focus', 'open']) {
      const e = fieldHostAlignmentReport(family, size).results[0];
      if (state) { e.state = state; raw.interactions.push(e); } else raw.results.push(e);
    }
  const before = JSON.stringify(raw), audit = buildMaterialInputAudit(raw);
  assert.equal(audit.fieldHostAlignmentInputs.length, 90);
  const groups = audit.discrepancies.filter(d => d.attribution === 'reviewed-field-host-alignment-request-omission');
  assert.equal(groups.length, 6); assert.equal(groups.reduce((n, g) => n + g.occurrences, 0), 90);
  for (const g of groups) {
    assert.equal(g.classification, 'application-plugin-authoring-defect'); assert.equal(g.reference, 'left'); assert.equal(g.astylar, undefined);
    assert.equal(g.reviewedCases.length, g.occurrences);
    for (const flag of ['computedCandidateVerified', 'descendantAlignmentVerified', 'finalRasterVerified']) assert.equal(g.reviewEvidence[flag], false);
  }
  assert.equal(audit.discrepancies.filter(d => d.attribution === 'reviewed-field-host-typography-token-omission').reduce((n, g) => n + g.occurrences, 0), 270);
  assert.deepEqual(validateMaterialInputAudit(audit, { requireComplete: false }).filter(e => e.includes('field host alignment')), []);
  assert.equal(JSON.stringify(raw), before);
});

test('field host alignment rejects changed host requests, ancestor overrides and missing evidence', () => {
  for (const [index, mutate] of [
    e => { e.inputTrees.reference.rules[1].declarations['text-align'].value = 'start'; },
    e => { delete e.inputTrees.reference.rules[1].declarations['text-align']; },
    e => { e.inputTrees.reference.rules[1].declarations['text-align'].important = true; },
    e => { e.inputTrees.reference.rules[0].declarations['text-align'] = { value: 'left', important: false }; },
    e => { e.inputTrees.reference.nodes[1].inline.direction = { value: 'rtl', important: false }; },
    e => { e.inputTrees.reference.nodes[0].attributes.style = 'text-align:center'; },
    e => { e.inputTrees.reference.styles[1].textAlign = 'start'; },
    e => { e.inputTrees.reference.styles[0].textAlign = 'left'; },
    e => { e.inputTrees.astylar.rules[0].textAlign = 'left'; },
    e => { e.inputTrees.astylar.rules.push({ selector: ':is(.field-shell)', textAlign: 'left' }); },
    e => { e.inputTrees.astylar.nodes[3].authored.style = { textAlign: 'inherit' }; },
    e => { e.inputTrees.astylar.nodes[1].normalResolvedStyle.textAlign = 'center'; },
    e => { e.inputTrees.astylar.nodes[3].interactionResolvedStyle.textAlign = 'left'; },
    e => { e.inputTrees.astylar.resolvedStyleSource = 'fixture'; },
    e => { e.inputTrees.astylar.nodes[3].parent = 'page'; },
  ].entries()) {
    const raw = fieldHostAlignmentReport(); mutate(raw.results[0]); const a = buildMaterialInputAudit(raw);
    assert.equal(a.fieldHostAlignmentInputs.length, 0, `mutation ${index}`);
    assert.equal(a.discrepancies.some(d => d.attribution === 'reviewed-field-host-alignment-request-omission'), false);
  }
});

test('field host alignment rejects scalar changes and forged computed descendant or raster claims', () => {
  for (const mutate of [i => { i.reference.textAlign = 'start'; }, i => { i.astylar.textAlign = 'left'; },
    i => { delete i.astylarNormalResolvedStyle; }, i => { i.astylarResolvedStyleEvidenceVersion = 1; },
    i => { i.referenceAuthored[0].declarations['text-align'].value = 'center'; },
    i => { i.astylarAuthored[0].declarations.textAlign = 'left'; }]) {
    const raw = fieldHostAlignmentReport(); mutate(raw.results[0].styleInputs[0]);
    assert.equal(buildMaterialInputAudit(raw).discrepancies.some(d => d.attribution === 'reviewed-field-host-alignment-request-omission'), false);
  }
  const audit = buildMaterialInputAudit(fieldHostAlignmentReport());
  for (const mutate of [a => { a.fieldHostAlignmentInputs[0].computedCandidateVerified = true; },
    a => { a.fieldHostAlignmentInputs[0].descendantAlignmentVerified = true; },
    a => { a.fieldHostAlignmentInputs[0].finalRasterVerified = true; },
    a => { a.fieldHostAlignmentInputs[0].candidatePath[0].normal.textAlign = 'left'; },
    a => { a.discrepancies.find(d => d.attribution === 'reviewed-field-host-alignment-request-omission').classification = 'equivalent-representation'; },
    a => { a.discrepancies.find(d => d.attribution === 'reviewed-field-host-alignment-request-omission').reviewedCases = []; }]) {
    const copy = structuredClone(audit); mutate(copy);
    assert.ok(validateMaterialInputAudit(copy, { requireComplete: false }).some(e => e.includes('field host alignment')));
  }
});

function fieldHostTypographyReport(family = 'autocomplete', pageSize = '16px') {
  const raw = parityReport({}, {}), entry = raw.results[0]; entry.family = family;
  entry.profile = pageSize === '14.4px' ? 'contrast' : pageSize === '18.4px' ? 'custom' : 'light';
  const declarations = values => Object.fromEntries(Object.entries(values).map(([key, value]) => [key, { value, important: false }]));
  const component = { fontFamily: 'Roboto', fontSize: '16px', lineHeight: '24px' };
  const page = { fontFamily: 'Roboto, Arial, sans-serif', fontSize: pageSize };
  const tokenRule = { selector: '.mat-mdc-form-field', declarations: declarations({
    'font-family': 'var(--mat-form-field-container-text-font, var(--mat-sys-body-large-font))',
    'font-size': 'var(--mat-form-field-container-text-size, var(--mat-sys-body-large-size))',
    'line-height': 'var(--mat-form-field-container-text-line-height, var(--mat-sys-body-large-line-height))',
  }) };
  const reference = { schemaVersion: 1, errors: [], styles: [{ ...page, lineHeight: 'normal' }, component],
    rules: [{ selector: '.frame', active: true, conditions: [], declarations: declarations({
      'font-family': page.fontFamily, 'font-size': 'calc(16px * var(--scale))' }) },
      { ...tokenRule, active: true, conditions: [] }],
    nodes: [
      { key: 'frame', parent: null, type: 'main', attributes: { class: 'frame' }, style: 0, rules: [0] },
      { key: 'section', parent: 'frame', type: 'section', attributes: { id: `${family}-root` }, style: 0, rules: [] },
      { key: 'host', parent: 'section', type: 'mat-form-field', attributes: { id: `${family}-primary`, class: 'mat-mdc-form-field' }, style: 1, rules: [1] },
    ].map(n => ({ ...n, ownText: '', inline: {}, pseudoElements: [] })),
  };
  const astylar = { schemaVersion: 1, errors: [], resolvedStyleEvidenceVersion: 2, resolvedStyleSource: 'core-style-inspection', resolvedStyleRevision: 9,
    rules: [{ selector: '#page', ...page }, { selector: '.field-shell', width: '100%' },
      { selector: '.material-table th', fontSize: '16px' }],
    nodes: [{ key: 'root', parent: null, authored: {} },
      { key: 'page', parent: 'root', authored: { type: 'main', id: 'page' } },
      { key: 'section', parent: 'page', authored: { type: 'section', id: `${family}-root` } },
      { key: 'host', parent: 'section', authored: { type: 'div', id: `${family}-primary`, class: 'field-shell' } },
    ].map(n => n.key === 'root' ? n : ({ ...n, resolvedStyle: n.key === 'page' ? { ...page } : {},
      normalResolvedStyle: n.key === 'page' ? { ...page } : {}, interactionResolvedStyle: n.key === 'page' ? { ...page } : {} })),
  };
  entry.inputTrees = { reference, astylar };
  entry.styleInputs = [{ id: `${family}-primary`, reference: { ...component }, astylar: {},
    astylarNormalResolvedStyle: {}, astylarInteractionResolvedStyle: {}, astylarResolvedStyleEvidenceVersion: 2,
    referenceStructure: { schemaVersion: 2, type: 'mat-form-field', ownText: '', text: '' },
    astylarStructure: { schemaVersion: 2, type: 'div', ownText: '', text: '' },
    referenceAuthored: [structuredClone(tokenRule)], astylarAuthored: [{ selector: '.field-shell', declarations: { width: '100%' } }],
  }];
  return raw;
}

test('field host typography preserves original token ownership across families, scales and states', () => {
  const raw = parityReport({}, {}); raw.results = [];
  for (const family of ['form-field', 'input', 'autocomplete', 'select', 'datepicker', 'timepicker'])
    for (const size of ['16px', '14.4px', '18.4px']) for (const state of [undefined, 'hover', 'held', 'focus', 'disabled']) {
      const entry = fieldHostTypographyReport(family, size).results[0];
      if (state) { entry.state = state; raw.interactions.push(entry); } else raw.results.push(entry);
    }
  const before = JSON.stringify(raw), audit = buildMaterialInputAudit(raw);
  assert.equal(audit.fieldHostTypographyInputs.length, 270);
  const diffs = audit.discrepancies.filter(d => d.attribution === 'reviewed-field-host-typography-token-omission');
  assert.equal(diffs.reduce((n, d) => n + d.occurrences, 0), 270);
  for (const d of diffs) {
    assert.equal(d.classification, 'application-plugin-authoring-defect'); assert.equal(d.astylar, undefined);
    assert.equal(d.reviewEvidence.values.candidateLocalDeclaration, '<omitted>');
    assert.equal(d.reviewEvidence.referencePath.length, 3); assert.equal(d.reviewEvidence.candidatePath.length, 3);
    assert.equal(d.reviewEvidence.finalRasterVerified, false);
    assert.equal(d.reviewedCases.length, d.occurrences);
  }
  assert.ok(!validateMaterialInputAudit(audit, { requireComplete: false }).some(e => e.includes('field host typography')));
  assert.equal(JSON.stringify(raw), before);
});

test('field host typography rejects incomplete, competing and altered ancestry or token declarations', () => {
  for (const mutate of [
    e => { e.inputTrees.reference.rules[1].active = false; },
    e => { e.inputTrees.reference.rules[1].declarations['font-size'].value = '15px'; },
    e => { e.inputTrees.reference.rules[1].declarations.font = { value: 'inherit', important: false }; },
    e => { e.inputTrees.reference.nodes[2].inline['font-size'] = { value: '16px', important: true }; },
    e => { e.inputTrees.reference.nodes[2].parent = 'frame'; },
    e => { e.inputTrees.reference.styles[1].lineHeight = 'normal'; },
    e => { e.inputTrees.astylar.rules.push({ selector: '.field-shell:hover', fontSize: '16px' }); },
    e => { e.inputTrees.astylar.rules.push({ selector: '.unknown .field-shell', fontSize: '16px' }); },
    e => { e.inputTrees.astylar.rules.push({ selector: ':is(div)', fontSize: '16px' }); },
    e => { e.inputTrees.astylar.rules.push({ selector: '.field-shell', all: 'initial' }); },
    e => { e.inputTrees.astylar.rules.push({ selector: '.field-shell', animation: 'size 1s' }); },
    e => { e.inputTrees.astylar.nodes[3].authored.style = { fontSize: 'inherit' }; },
    e => { e.inputTrees.astylar.nodes[3].interactionResolvedStyle.fontSize = '16px'; },
    e => { delete e.inputTrees.astylar.nodes[1].normalResolvedStyle; },
    e => { e.inputTrees.astylar.nodes[3].parent = 'root'; },
    e => { e.inputTrees.astylar.nodes.push(structuredClone(e.inputTrees.astylar.nodes[3])); },
    e => { delete e.inputTrees.astylar.resolvedStyleRevision; },
    e => { e.inputTrees.astylar.resolvedStyleSource = 'fixture'; },
    e => { e.inputTrees.astylar.errors.push('incomplete capture'); },
  ]) {
    const raw = fieldHostTypographyReport(); mutate(raw.results[0]); const audit = buildMaterialInputAudit(raw);
    assert.equal(audit.fieldHostTypographyInputs.length, 0, String(mutate));
    assert.ok(audit.discrepancies.every(d => d.attribution !== 'reviewed-field-host-typography-token-omission'), String(mutate));
  }
});

test('field host typography scalar mapping rejects changed stages, ownership and fabricated review records', () => {
  for (const mutate of [
    s => { s.reference.fontSize = '15px'; },
    s => { s.astylar.fontSize = '16px'; },
    s => { s.astylarNormalResolvedStyle.fontSize = '16px'; },
    s => { s.astylarInteractionResolvedStyle.lineHeight = 'normal'; },
    s => { delete s.astylarResolvedStyleEvidenceVersion; },
    s => { s.referenceStructure.type = 'input'; },
    s => { s.referenceAuthored[0].active = false; },
    s => { s.referenceAuthored[0].declarations['font-size'].value = 'inherit'; },
    s => { s.astylarAuthored = []; },
  ]) {
    const raw = fieldHostTypographyReport(); mutate(raw.results[0].styleInputs[0]); const audit = buildMaterialInputAudit(raw);
    assert.ok(audit.discrepancies.filter(d => d.property === 'fontSize').every(d => d.attribution !== 'reviewed-field-host-typography-token-omission'), String(mutate));
  }
  const baseline = buildMaterialInputAudit(fieldHostTypographyReport());
  for (const mutate of [
    a => { a.fieldHostTypographyInputs.pop(); },
    a => { a.fieldHostTypographyInputs[0].values.reference = 'arial'; },
    a => { a.discrepancies.find(d => d.attribution === 'reviewed-field-host-typography-token-omission').reviewedCases = []; },
    a => { a.discrepancies.find(d => d.attribution === 'reviewed-field-host-typography-token-omission').reviewEvidence.candidatePath.pop(); },
  ]) {
    const copy = structuredClone(baseline); mutate(copy);
    assert.ok(validateMaterialInputAudit(copy, { requireComplete: false }).some(e => e.includes('field host typography')), String(mutate));
  }
});

test('field host case index matches every captured field comparison and source fingerprint', async () => {
  const { readFileSync } = await import('node:fs');
  const { createHash } = await import('node:crypto');
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  const index = JSON.parse(readFileSync('docs/material-field-host-typography-audit.json', 'utf8'));
  const raw = readFileSync(index.capture.file);
  assert.equal(hash(raw), index.capture.sha256);
  assertHistoricalCaseIndexSources('docs/material-field-host-typography-audit.json', index);
  assert.equal(index.sourceFingerprints.length, 4);
  const report = JSON.parse(raw), covered = new Map();
  for (const group of index.groups) {
    assert.deepEqual(group.properties, ['fontFamily', 'fontSize', 'lineHeight']);
    assert.deepEqual(group.reference, { fontFamily: 'roboto', fontSize: '16px', lineHeight: '24px' });
    assert.equal(group.candidateLocalDeclaration, '<omitted>');
    for (const key of group.cases) {
      assert.equal(covered.has(key), false); covered.set(key, group);
    }
  }
  const expected = [];
  for (const [kind, entries] of [['static', report.results], ['interaction', report.interactions]]) for (const entry of entries) {
    const inputs = entry.styleInputs.filter(input => input.referenceStructure?.type === 'mat-form-field');
    if (!inputs.length) continue;
    assert.equal(inputs.length, 1);
    const input = inputs[0], key = `${kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? `/${entry.state}` : ''}`;
    expected.push(key); const group = covered.get(key); assert.ok(group, key);
    assert.equal(group.family, entry.family); assert.equal(input.id, `${entry.family}-primary`);
    const trees = {};
    for (const side of ['reference', 'astylar']) {
      const source = entry.inputTrees[side], bytes = readFileSync(source.file);
      assert.equal(hash(bytes), source.sha256, `${key}/${side}`); trees[side] = JSON.parse(bytes);
    }
    const page = trees.astylar.nodes.find(n => n.authored.id === 'page');
    assert.equal(page.normalResolvedStyle.fontSize, group.pageSize);
    for (const property of group.properties) {
      assert.equal(input.reference[property].toLowerCase(), group.reference[property]);
      assert.equal(input.astylar[property], undefined);
    }
  }
  assert.deepEqual([...covered.keys()].sort(), expected.sort());
  assert.equal(covered.size, 577); assert.equal(index.caseCount, covered.size);
  assert.equal(index.proofCount, covered.size * 3); assert.equal(index.scalarOccurrences, index.proofCount);
  assert.equal(index.scalarGroups, 18);
  assert.equal(index.verification.inputEquivalent, false);
});

function chipHostTypographyReport(fontSize = '16px') {
  const raw = templateTypographyReport('chips'), e = raw.results[0], { reference: r, astylar: a } = e.inputTrees;
  const declarations = values => Object.fromEntries(Object.entries(values).map(([k, value]) => [k, { value, important: false }]));
  r.styles = [{ fontSize, lineHeight: 'normal' }, { fontSize: '14px', lineHeight: '20px' }];
  r.rules = [
    { selector: '.frame', active: true, conditions: [], declarations: declarations({ 'font-size': 'calc(16px * var(--scale))' }) },
    { selector: '.mat-mdc-standard-chip .mdc-evolution-chip__text-label', active: true, conditions: [], declarations: declarations({
      'font-size': 'var(--mat-chip-label-text-size, var(--mat-sys-label-large-size))',
      'line-height': 'var(--mat-chip-label-text-line-height, var(--mat-sys-label-large-line-height))' }) },
    { selector: 'button, input, select', active: true, conditions: [], declarations: declarations({ 'font-size': 'inherit', 'line-height': 'inherit' }) },
    { selector: '.mat-mdc-standard-chip', active: false, conditions: ['(forced-colors: active)'], declarations: declarations({ color: 'CanvasText' }) },
  ];
  r.nodes[0].parent = 'section';
  r.nodes.unshift({ key: 'frame', parent: null, type: 'main', attributes: { class: 'frame' }, ownText: '', style: 0, rules: [0], inline: {} },
    { key: 'section', parent: 'frame', type: 'section', attributes: { id: 'chips-root' }, ownText: '', style: 0, rules: [], inline: {} });
  a.rules = [{ selector: '.chip', fontSize: '14px', lineHeight: '20px' }, { selector: '.chip-label', verticalAlign: 'middle' },
    { selector: '.material-table th', fontSize: '16px' }, { selector: '.material-table td', lineHeight: '24px' }];
  for (const n of r.nodes) {
    n.inline ??= {};
    n.pseudoElements ??= [];
    if (n.type === 'button') n.rules = [2];
    if (n.type === 'mat-chip-option') n.rules = [3];
    if (n.ownText) { n.rules = [1]; n.style = 1; }
  }
  for (const n of a.nodes) {
    const host = /^chip-[01]$/.test(n.authored.id ?? '');
    const s = host ? { fontSize: '14px', lineHeight: '20px' } : { verticalAlign: 'middle' };
    n.resolvedStyle = { ...s }; n.normalResolvedStyle = { ...s }; n.interactionResolvedStyle = { ...s };
    if (n.retainedText) n.retainedText.style = { fontSize: '14px', lineHeight: '20px' };
    if (host) e.styleInputs.push({ id: n.authored.id, reference: { ...r.styles[0] }, astylar: { ...s },
      astylarNormalResolvedStyle: { ...s }, astylarInteractionResolvedStyle: { ...s }, astylarResolvedStyleEvidenceVersion: 2,
      referenceStructure: { schemaVersion: 2, type: 'mat-chip-option', ownText: '', text: n.authored.id === 'chip-0' ? 'Angular' : 'Astylar' },
      astylarStructure: { schemaVersion: 2, type: 'div', ownText: '', text: n.authored.id === 'chip-0' ? 'Angular' : 'Astylar' },
      referenceAuthored: [], astylarAuthored: [{ selector: '.chip', declarations: { fontSize: '14px', lineHeight: '20px' } }] });
  }
  return raw;
}

test('chip host typography preserves nested label ownership across inherited scales and states', () => {
  for (const size of ['16px', '14.4px', '18.4px']) for (const state of [undefined, 'hover', 'held', 'selected', 'focus']) {
    const raw = chipHostTypographyReport(size);
    if (state) { raw.results[0].state = state; raw.interactions = raw.results; raw.results = []; }
    const before = JSON.stringify(raw), a = buildMaterialInputAudit(raw);
    assert.equal(a.chipHostTypographyInputs.length, 4);
    const diffs = a.discrepancies.filter(d => d.attribution === 'reviewed-chip-label-typography-promoted-to-host');
    assert.equal(diffs.length, 4);
    for (const d of diffs) {
      assert.equal(d.classification, 'application-plugin-authoring-defect');
      assert.equal(d.reference, d.property === 'fontSize' ? size : 'normal');
      assert.equal(d.astylar, d.property === 'fontSize' ? '14px' : '20px');
      assert.equal(d.reviewEvidence.inputEquivalent, false); assert.equal(d.reviewEvidence.finalRasterVerified, false);
      assert.equal(d.reviewEvidence.referencePath.length, 8);
      assert.equal(d.reviewEvidence.candidatePath.length, 2);
      assert.equal(d.reviewEvidence.values.retained, d.astylar);
    }
    assert.ok(!validateMaterialInputAudit(a, { requireComplete: false }).some(e => e.includes('chip host typography')));
    assert.equal(JSON.stringify(raw), before);
  }
});

test('chip host typography rejects ambiguous authoring, inheritance, mappings and captured stages', () => {
  const mutations = [
    e => { e.inputTrees.reference.nodes[1].parent = 'missing'; },
    e => { e.inputTrees.reference.nodes[0].parent = 'unknown-root'; },
    e => { e.inputTrees.reference.nodes[0].attributes.class = 'unknown'; },
    e => { e.inputTrees.reference.styles[0].lineHeight = '18px'; },
    e => { e.inputTrees.reference.styles[1].fontSize = '16px'; },
    e => { e.inputTrees.reference.nodes[2].inline = { 'font-size': { value: 'inherit', important: false } }; },
    e => { e.inputTrees.reference.rules[0].declarations['font-size'].value = '16px'; },
    e => { e.inputTrees.reference.rules[1].declarations['font-size'].important = true; },
    e => { e.inputTrees.reference.rules[1].active = false; },
    e => { delete e.inputTrees.reference.rules[1].active; },
    e => { e.inputTrees.reference.rules[1].declarations['font-size'].value = '14px'; },
    e => { e.inputTrees.reference.rules[2].declarations.all = { value: 'inherit', important: false }; },
    e => { e.inputTrees.reference.rules[2].declarations['line-height'].value = 'normal'; },
    e => { e.inputTrees.reference.rules[2].declarations['font-size'].important = true; },
    e => { e.inputTrees.reference.nodes.push(structuredClone(e.inputTrees.reference.nodes[2])); },
    e => { e.inputTrees.reference.errors.push('incomplete rules'); },
    e => { e.inputTrees.astylar.rules[0].fontSize = '16px'; },
    e => { e.inputTrees.astylar.rules[0].font = '14px/20px Roboto'; },
    e => { e.inputTrees.astylar.rules[0].all = 'initial'; },
    e => { e.inputTrees.astylar.rules[1].fontSize = '14px'; },
    e => { e.inputTrees.astylar.rules.push({ selector: '.chip:hover', fontSize: '14px' }); },
    e => { e.inputTrees.astylar.rules.push({ selector: ':is(.chip)', fontSize: '14px' }); },
    e => { e.inputTrees.astylar.rules.push({ selector: '.unknown div', fontSize: '14px' }); },
    e => { e.inputTrees.astylar.rules.push({ selector: '.chip', nested: { fontSize: '14px' } }); },
    e => { e.inputTrees.astylar.rules.push({ selector: '.chip', nested: [{ fontSize: '14px' }] }); },
    e => { e.inputTrees.astylar.resolvedStyleSource = 'mesh-metadata'; },
    e => { e.inputTrees.astylar.resolvedStyleEvidenceVersion = 1; },
    e => { delete e.inputTrees.astylar.resolvedStyleRevision; },
    e => { for (const n of e.inputTrees.astylar.nodes.filter(n => n.retainedText)) n.retainedText.style.fontSize = '16px'; },
    e => { for (const n of e.inputTrees.astylar.nodes.filter(n => n.retainedText)) n.retainedText.source = 'predicted'; },
    e => { for (const n of e.inputTrees.astylar.nodes) n.authored.style = { lineHeight: '20px' }; },
    e => { for (const n of e.inputTrees.astylar.nodes) delete n.interactionResolvedStyle; },
    e => { for (const n of e.inputTrees.astylar.nodes) n.normalResolvedStyle.lineHeight = '30px'; },
  ];
  for (const mutate of mutations) {
    const raw = chipHostTypographyReport(); mutate(raw.results[0]);
    const a = buildMaterialInputAudit(raw);
    assert.equal(a.chipHostTypographyInputs.length, 0, String(mutate));
    assert.ok(a.discrepancies.every(d => d.attribution !== 'reviewed-chip-label-typography-promoted-to-host'), String(mutate));
  }
});

test('chip host typography scalar attribution requires the same element, text, rules and every stage', () => {
  const mutations = [
    input => { input.referenceStructure.type = 'span'; },
    input => { input.astylarStructure.type = 'button'; },
    input => { input.referenceStructure.ownText = 'Angular'; },
    input => { input.astylarStructure.ownText = 'Angular'; },
    input => { input.referenceStructure.text = 'wrong'; },
    input => { input.astylarStructure.text = 'wrong'; },
    input => { input.referenceStructure.schemaVersion = 1; },
    input => { input.astylarResolvedStyleEvidenceVersion = 1; },
    input => { input.referenceAuthored = undefined; },
    input => { input.astylarAuthored = []; },
    input => { input.referenceAuthored = [{ declarations: { 'font-size': { value: '16px', important: false } } }]; },
    input => { delete input.astylarNormalResolvedStyle; },
    input => { delete input.astylarInteractionResolvedStyle; },
    input => { input.astylarNormalResolvedStyle = { fontSize: '16px', lineHeight: '24px' }; },
  ];
  for (const mutate of mutations) {
    const raw = chipHostTypographyReport(); raw.results[0].styleInputs.forEach(mutate);
    const a = buildMaterialInputAudit(raw);
    assert.equal(a.chipHostTypographyInputs.length, 4, 'tree proof remains separately available');
    assert.ok(a.discrepancies.every(d => d.attribution !== 'reviewed-chip-label-typography-promoted-to-host'), String(mutate));
  }
});

test('chip host typography validation replays proof and every grouped case without waiving other properties', () => {
  const raw = chipHostTypographyReport();
  raw.interactions = Array.from({ length: 15 }, (_, i) => ({ ...structuredClone(raw.results[0]), state: `boundary-${i}` }));
  raw.results = [];
  const baseline = buildMaterialInputAudit(raw), diffs = baseline.discrepancies.filter(d => d.attribution === 'reviewed-chip-label-typography-promoted-to-host');
  assert.equal(baseline.chipHostTypographyInputs.length, 60);
  assert.ok(diffs.every(d => d.occurrences === 15 && d.reviewedCases.length === 15 && d.cases.length === 12));
  for (const mutate of [
    a => { a.chipHostTypographyInputs.pop(); },
    a => { a.chipHostTypographyInputs[0].values.retained = '99px'; },
    a => { a.chipHostTypographyInputs[0].text = 'wrong'; },
    a => { a.chipHostTypographyInputs[0].revision++; },
    a => { a.discrepancies[0].reviewEvidence.values.normal = '99px'; },
    a => { a.discrepancies[0].classification = 'equivalent-representation'; },
    a => { a.discrepancies[0].reviewedCases.pop(); },
    a => { a.discrepancies[0].reviewedCases[1] = a.discrepancies[0].reviewedCases[0]; },
    a => { a.discrepancies[0].reference = '99px'; },
    a => { a.discrepancies[0].property = 'fontFamily'; },
  ]) {
    const a = structuredClone(baseline); mutate(a);
    assert.ok(validateMaterialInputAudit(a, { requireComplete: false }).some(e => e.includes('chip host typography')), String(mutate));
  }
  const varied = chipHostTypographyReport();
  varied.results[0].styleInputs[0].reference.fontFamily = 'Roboto';
  varied.results[0].styleInputs[0].astylar.fontFamily = 'Arial';
  const a = buildMaterialInputAudit(varied);
  assert.notEqual(a.discrepancies.find(d => d.property === 'fontFamily').attribution, 'reviewed-chip-label-typography-promoted-to-host');
});

test('font-relative box evidence retains equal-input failures and passing controls without normalization', async () => {
  const { readFileSync } = await import('node:fs');
  const { createHash } = await import('node:crypto');
  const evidence = JSON.parse(readFileSync('docs/material-font-relative-box-audit.json', 'utf8'));
  assert.equal(evidence.findingId, 'core-em-box-size-uses-uncomputed-font');
  assert.equal(evidence.classification, 'confirmed-core-renderer-defect');
  assert.equal(evidence.owner.history.historicalRuntimeBisect, false);
  assert.equal(evidence.sourceFingerprints.length, 6);
  for (const { file, sha256 } of evidence.sourceFingerprints) {
    assert.equal(createHash('sha256').update(readFileSync(file, 'utf8').replace(/\r\n/g, '\n')).digest('hex'), sha256, file);
  }
  const verify = (runs) => {
    assert.equal(runs.length, 2);
    assert.deepEqual(runs[0].observations, runs[1].observations);
    for (const run of runs) {
      assert.equal(run.exitCode, 1); // Recorded audit failure, not a renderer acceptance expectation.
      assert.equal(run.result, 'TOTAL: 6 FAILED, 4 SUCCESS');
      assert.equal(run.assertionFailures.length, 12);
      assert.ok(run.assertionFailures.every(line => /^font-box\.(width|height): Astylar=/.test(line)));
      const trials = run.observations;
      assert.equal(trials.length, 10);
      assert.equal(new Set(trials.map(trial => `${trial.parentSize}/${trial.mode}`)).size, 10);
      let failed = 0;
      for (const parentSize of [24, 32]) for (const mode of ['inherited', 'explicit-px', 'relative-em', 'relative-percent', 'pixel-box']) {
        const trial = trials.find(item => item.parentSize === parentSize && item.mode === mode);
        assert.ok(trial, `${parentSize}/${mode}`);
        assert.equal(trial.dpr, 1);
        const font = mode.startsWith('relative-') ? parentSize * 1.5 : parentSize;
        const declared = mode === 'explicit-px' ? `${parentSize}px`
          : mode === 'relative-em' ? '1.5em' : mode === 'relative-percent' ? '150%' : '<omitted>';
        assert.equal(trial.declaredFont, declared);
        assert.equal(trial.browserFont, `${font}px`);
        assert.equal(trial.browserTextFont, `${font}px`);
        assert.equal(trial.retainedTextFont, `${font}px`);
        const parentBox = { width: 320, height: 180 };
        assert.deepEqual(trial.observations['font-parent'], { actual: parentBox, reference: parentBox });
        const expected = { width: font * 2, height: font };
        assert.deepEqual(trial.observations['font-box'].reference, expected);
        const base = mode === 'inherited' ? 16 : mode === 'relative-em' ? 1.5 : mode === 'relative-percent' ? 150 : parentSize;
        const actual = { width: base * 2, height: base };
        assert.deepEqual(trial.observations['font-box'].actual, actual);
        if (actual.width !== expected.width || actual.height !== expected.height) failed++;
      }
      assert.equal(failed, 6);
    }
  };
  verify(evidence.runs);
  for (const mutate of [
    runs => { runs[0].observations.pop(); },
    runs => { runs[0].observations[0].retainedTextFont = '16px'; },
    runs => { for (const run of runs) for (const trial of run.observations) trial.observations['font-box'].actual = trial.observations['font-box'].reference; },
    runs => { for (const run of runs) run.observations[0].declaredFont = '<omitted>'; },
  ]) {
    const copy = structuredClone(evidence.runs); mutate(copy);
    assert.throws(() => verify(copy));
  }
});

function appearanceInitialReport(type = 'section') {
  const raw = parityReport({ appearance: 'none' }, {}), entry = raw.results[0];
  entry.styleInputs[0] = { ...entry.styleInputs[0],
    referenceStructure: { schemaVersion: 2, type, text: '' }, astylarStructure: { schemaVersion: 2, type, text: '' },
    referenceAuthored: [], astylarAuthored: [], astylarResolvedStyleEvidenceVersion: 2,
    astylarNormalResolvedStyle: {}, astylarInteractionResolvedStyle: {},
  };
  entry.inputTrees = {
    reference: { schemaVersion: 1, errors: [], styles: [{ appearance: 'none' }], rules: [],
      nodes: [{ key: 'node', parent: null, type, attributes: { id: 'core-root' }, ownText: '', inline: {}, style: 0, rules: [], pseudoElements: [] }] },
    astylar: { schemaVersion: 1, errors: [], rules: [], resolvedStyleEvidenceVersion: 2,
      resolvedStyleSource: 'core-style-inspection', resolvedStyleRevision: 9,
      nodes: [{ key: 'node', parent: null, authored: { type, id: 'core-root' },
        resolvedStyle: {}, normalResolvedStyle: {}, interactionResolvedStyle: {} }] },
  };
  return raw;
}

test('non-widget appearance initial request retains complete state evidence without normalizing declarations', () => {
  const raw = parityReport({}, {}); raw.results = [];
  for (const type of ['div', 'section', 'span', 'p', 'h2', 'a']) for (let state = 0; state < 15; state++) {
    const entry = appearanceInitialReport(type).results[0]; entry.family = type;
    entry.state = `state-${state}`; raw.interactions.push(entry);
  }
  const before = JSON.stringify(raw), audit = buildMaterialInputAudit(raw);
  assert.equal(audit.appearanceInitialInputs.filter(p => p.element === 'core-root').length, 90);
  const diffs = audit.discrepancies.filter(d => d.attribution === 'reviewed-nonwidget-appearance-initial-request');
  assert.equal(diffs.length, 6);
  for (const d of diffs) {
    assert.equal(d.classification, 'equivalent-representation'); assert.equal(d.astylar, undefined);
    assert.equal(d.reviewEvidence.candidateLocalDeclaration, '<omitted>');
    assert.equal(d.reviewEvidence.finalRasterVerified, false);
    assert.equal(d.occurrences, 15); assert.equal(d.cases.length, 12); assert.equal(d.reviewedCases.length, 15);
  }
  assert.ok(!validateMaterialInputAudit(audit, { requireComplete: false }).some(e => e.includes('non-widget appearance')));
  assert.equal(JSON.stringify(raw), before);
});

test('non-widget appearance excludes controls, substitutions, overrides and uncertain capture evidence', () => {
  const mutations = [
    e => { e.inputTrees.reference.nodes[0].type = 'button'; },
    e => { e.inputTrees.astylar.nodes[0].authored.type = 'select'; },
    e => { e.inputTrees.astylar.nodes[0].authored.type = 'showcase.material:panel'; },
    e => { e.inputTrees.astylar.nodes[0].authored.type = 'div'; },
    e => { e.inputTrees.astylar.nodes[0].authored.inputType = 'checkbox'; },
    e => { delete e.inputTrees.reference.nodes[0].inline; },
    e => { e.inputTrees.reference.nodes[0].inline = { appearance: { value: 'none' } }; },
    e => { e.inputTrees.reference.nodes[0].attributes.style = 'appearance:none'; },
    e => { e.inputTrees.reference.rules.push({ selector: 'section', active: true, declarations: { appearance: { value: 'none' } } }); e.inputTrees.reference.nodes[0].rules = [0]; },
    e => { e.inputTrees.astylar.nodes[0].authored.style = { appearance: 'none' }; },
    e => { e.inputTrees.astylar.nodes[0].normalResolvedStyle = { appearance: 'none' }; },
    e => { e.inputTrees.astylar.nodes[0].interactionResolvedStyle = { appearance: 'auto' }; },
    e => { e.inputTrees.astylar.rules.push({ selector: '#core-root', appearance: 'none' }); },
    e => { e.inputTrees.astylar.rules.push({ selector: ':is(#core-root)', appearance: 'none' }); },
    e => { e.inputTrees.astylar.rules.push({ selector: '.ancestor section:hover', all: 'initial' }); },
    e => { e.inputTrees.astylar.rules.push({ selector: 'section', WebkitAppearance: 'none' }); },
    e => { e.inputTrees.astylar.rules.push({ selector: 'section', transition: 'all 1s' }); },
    e => { e.inputTrees.astylar.rules.push({ selector: '#unrelated', nested: { appearance: 'none' } }); },
    e => { e.inputTrees.reference.nodes.push(structuredClone(e.inputTrees.reference.nodes[0])); },
    e => { e.inputTrees.astylar.nodes.push(structuredClone(e.inputTrees.astylar.nodes[0])); },
    e => { e.inputTrees.reference.errors.push('incomplete'); },
    e => { e.inputTrees.astylar.resolvedStyleRevision = -1; },
    e => { e.inputTrees.astylar.resolvedStyleSource = 'mesh-metadata'; },
    e => { delete e.inputTrees.astylar.rules; },
  ];
  for (const [index, mutate] of mutations.entries()) {
    const raw = appearanceInitialReport(); mutate(raw.results[0]);
    const audit = buildMaterialInputAudit(raw);
    assert.equal(audit.appearanceInitialInputs.filter(p => p.element === 'core-root').length, 0, `mutation ${index}`);
    assert.ok(audit.discrepancies.every(d => d.attribution !== 'reviewed-nonwidget-appearance-initial-request'), `mutation ${index}`);
  }
  const unrelated = appearanceInitialReport();
  unrelated.results[0].inputTrees.astylar.rules.push({ selector: '#different', appearance: 'none' });
  assert.equal(buildMaterialInputAudit(unrelated).appearanceInitialInputs.filter(p => p.element === 'core-root').length, 1);
});

test('non-widget appearance rejects scalar-stage drift and forged report classifications', () => {
  for (const mutate of [
    i => { i.reference.appearance = 'auto'; },
    i => { i.astylarNormalResolvedStyle.appearance = 'none'; },
    i => { i.astylarInteractionResolvedStyle.all = 'initial'; },
    i => { i.referenceStructure.type = 'button'; },
    i => { i.astylarStructure.type = 'div'; },
    i => { i.referenceAuthored.push({ selector: 'section', declarations: { appearance: { value: 'none' } } }); },
    i => { delete i.astylarAuthored; },
  ]) {
    const raw = appearanceInitialReport(); mutate(raw.results[0].styleInputs[0]);
    assert.ok(buildMaterialInputAudit(raw).discrepancies.every(d => d.attribution !== 'reviewed-nonwidget-appearance-initial-request'));
  }
  const audit = buildMaterialInputAudit(appearanceInitialReport());
  for (const mutate of [
    a => { a.appearanceInitialInputs[0].finalRasterVerified = true; },
    a => { a.discrepancies[0].astylar = 'none'; },
    a => { a.discrepancies[0].reviewedCases = []; },
    a => { a.discrepancies[0].classification = 'documented-limitation'; },
  ]) {
    const copy = structuredClone(audit); mutate(copy);
    assert.ok(validateMaterialInputAudit(copy, { requireComplete: false }).some(e => e.includes('non-widget appearance')));
  }
});

test('non-widget appearance case index preserves all attributed raw main-capture occurrences', async () => {
  const { readFileSync } = await import('node:fs');
  const { createHash } = await import('node:crypto');
  const index = JSON.parse(readFileSync('docs/material-nonwidget-appearance-audit.json', 'utf8'));
  assertHistoricalCaseIndexSources('docs/material-nonwidget-appearance-audit.json', index);
  const bytes = readFileSync(index.mainCapture.file);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), index.mainCapture.sha256);
  const report = JSON.parse(bytes), cases = new Map();
  for (const [kind, list] of [['static', report.results], ['interaction', report.interactions]]) for (const entry of list) {
    const key = `${kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`;
    assert.equal(cases.has(key), false); cases.set(key, entry);
  }
  const verify = groups => {
    assert.equal(groups.length, 49);
    assert.equal(new Set(groups.map(g => `${g.family}/${g.element}`)).size, 49);
    assert.equal(groups.reduce((sum, g) => sum + g.occurrences, 0), 3015);
    for (const group of groups) {
      assert.equal(group.classification, 'equivalent-representation');
      assert.equal(group.reference, 'none'); assert.equal(group.candidate, '<omitted>');
      assert.equal(new Set(group.reviewedCases).size, group.occurrences);
      assert.equal(group.reviewedCases.length, group.occurrences);
      const expected = [...cases].filter(([, entry]) => entry.family === group.family && entry.styleInputs.some(i => i.id === group.element)).map(([key]) => key);
      assert.deepEqual(group.reviewedCases, expected, group.element);
      for (const key of group.reviewedCases) {
        const inputs = cases.get(key).styleInputs.filter(i => i.id === group.element); assert.equal(inputs.length, 1);
        const input = inputs[0];
        assert.equal(input.referenceStructure.type, group.type); assert.equal(input.astylarStructure.type, group.type);
        assert.ok(['div', 'section', 'span', 'p', 'h2', 'a'].includes(group.type));
        assert.equal(input.reference.appearance, 'none'); assert.equal(input.astylarResolvedStyleEvidenceVersion, 2);
        for (const stage of ['astylar', 'astylarNormalResolvedStyle', 'astylarInteractionResolvedStyle']) assert.equal(input[stage].appearance, undefined);
        for (const rule of [...input.referenceAuthored, ...input.astylarAuthored]) assert.equal(rule.declarations.appearance, undefined);
      }
    }
  };
  verify(index.groups);
  for (const mutate of [
    groups => groups.pop(),
    groups => { groups[0].reviewedCases.pop(); },
    groups => { groups[0].type = 'button'; },
    groups => { groups[0].candidate = 'none'; },
  ]) { const copy = structuredClone(index.groups); mutate(copy); assert.throws(() => verify(copy)); }
});

function buttonAppearanceReport(className = 'material-button') {
  const raw = appearanceInitialReport('button'), e = raw.results[0];
  const rule = { selector: '.mdc-button', declarations: { appearance: { value: 'none', important: false } } };
  e.styleInputs[0].referenceAuthored = [structuredClone(rule)];
  e.inputTrees.reference.nodes[0].attributes.class = 'mdc-button mat-mdc-button-base';
  e.inputTrees.reference.rules = [{ ...structuredClone(rule), active: true, conditions: [] },
    { selector: '.mat-mdc-unelevated-button', active: true, conditions: [], declarations: {
      'transition-property': { value: 'box-shadow', important: false }, 'animation-name': { value: 'none', important: true } } }];
  e.inputTrees.reference.nodes[0].rules = [0, 1];
  e.inputTrees.astylar.nodes[0].authored.class = className;
  return raw;
}

test('button appearance preserves explicit original reset ownership across button classes and states', () => {
  const raw = parityReport({}, {}); raw.results = [];
  for (const cls of ['material-button', 'text-button', 'toolbar-action', 'dialog-action']) for (let state = 0; state < 15; state++) {
    const entry = buttonAppearanceReport(cls).results[0]; entry.family = cls; entry.state = `state-${state}`;
    raw.interactions.push(entry);
  }
  const before = JSON.stringify(raw), audit = buildMaterialInputAudit(raw);
  assert.equal(audit.buttonAppearanceInputs.filter(p => p.element === 'core-root').length, 60);
  const diffs = audit.discrepancies.filter(d => d.attribution === 'reviewed-material-button-appearance-omission');
  assert.equal(diffs.length, 4);
  for (const d of diffs) {
    assert.equal(d.classification, 'application-plugin-authoring-defect'); assert.equal(d.astylar, undefined);
    assert.equal(d.reviewEvidence.referenceRule.declarations.appearance.value, 'none');
    assert.equal(d.reviewEvidence.candidateLocalDeclaration, '<omitted>'); assert.equal(d.reviewEvidence.finalRasterVerified, false);
    assert.equal(d.occurrences, 15); assert.equal(d.reviewedCases.length, 15); assert.equal(d.cases.length, 12);
  }
  assert.equal(JSON.stringify(raw), before);
  assert.ok(!validateMaterialInputAudit(audit, { requireComplete: false }).some(e => e.includes('button appearance')));
  assert.ok(audit.sourceFindings.find(f => f.id === 'fixture-material-button-appearance-reset-omitted').detected);
  assert.ok(audit.implementationPlan.some(p => p.priority === 5.205));
});

test('button appearance refuses missing, competing or changed owner and declaration evidence', () => {
  const mutations = [
    e => { e.inputTrees.reference.nodes[0].type = 'a'; },
    e => { e.inputTrees.reference.nodes[0].attributes.class = ''; },
    e => { e.inputTrees.astylar.nodes[0].authored.type = 'input'; },
    e => { e.inputTrees.astylar.nodes[0].authored.class = 'unknown'; },
    e => { e.inputTrees.reference.rules[0].active = false; },
    e => { e.inputTrees.reference.rules[0].conditions = ['unknown-media']; },
    e => { e.inputTrees.reference.rules[0].selector = '.other'; },
    e => { e.inputTrees.reference.rules[0].declarations.appearance.value = 'auto'; },
    e => { e.inputTrees.reference.rules[0].declarations.appearance.important = true; },
    e => { e.inputTrees.reference.rules[0].declarations.all = { value: 'initial' }; },
    e => { e.inputTrees.reference.rules.push({ selector: 'button', active: true, declarations: { appearance: { value: 'none' } } }); e.inputTrees.reference.nodes[0].rules.push(2); },
    e => { e.inputTrees.reference.nodes[0].inline = { appearance: { value: 'none' } }; },
    e => { e.inputTrees.reference.nodes[0].attributes.style = '-webkit-appearance:none'; },
    e => { e.inputTrees.astylar.nodes[0].authored.style = { appearance: 'none' }; },
    e => { e.inputTrees.astylar.nodes[0].normalResolvedStyle.appearance = 'none'; },
    e => { delete e.inputTrees.astylar.nodes[0].interactionResolvedStyle; },
    e => { e.inputTrees.astylar.rules.push({ selector: '#core-root', appearance: 'none' }); },
    e => { e.inputTrees.astylar.rules.push({ selector: ':is(#core-root)', all: 'initial' }); },
    e => { e.inputTrees.astylar.rules.push({ selector: 'button:hover', transition: 'all 1s' }); },
    e => { e.inputTrees.reference.nodes.push(structuredClone(e.inputTrees.reference.nodes[0])); },
    e => { e.inputTrees.astylar.nodes.push(structuredClone(e.inputTrees.astylar.nodes[0])); },
    e => { e.inputTrees.reference.errors.push('incomplete'); },
    e => { e.inputTrees.astylar.resolvedStyleSource = 'mesh-metadata'; },
    e => { e.inputTrees.astylar.resolvedStyleRevision = -1; },
  ];
  for (const [i, mutate] of mutations.entries()) {
    const raw = buttonAppearanceReport(); mutate(raw.results[0]); const audit = buildMaterialInputAudit(raw);
    assert.equal(audit.buttonAppearanceInputs.filter(p => p.element === 'core-root').length, 0, `mutation ${i}`);
    assert.ok(audit.discrepancies.every(d => d.attribution !== 'reviewed-material-button-appearance-omission'), `mutation ${i}`);
  }
});

test('button appearance rejects scalar changes and independently replays report evidence', () => {
  for (const mutate of [
    i => { i.reference.appearance = 'auto'; },
    i => { i.referenceAuthored[0].declarations.appearance.important = true; },
    i => { i.referenceAuthored = []; },
    i => { i.astylarAuthored.push({ selector: 'button', declarations: { appearance: 'none' } }); },
    i => { i.astylarInteractionResolvedStyle.appearance = 'none'; },
    i => { i.astylarStructure.type = 'div'; },
    i => { delete i.astylarNormalResolvedStyle; },
  ]) {
    const raw = buttonAppearanceReport(); mutate(raw.results[0].styleInputs[0]);
    assert.ok(buildMaterialInputAudit(raw).discrepancies.every(d => d.attribution !== 'reviewed-material-button-appearance-omission'));
  }
  const audit = buildMaterialInputAudit(buttonAppearanceReport());
  for (const mutate of [
    a => { a.buttonAppearanceInputs[0].referenceRule.declarations.appearance.value = 'auto'; },
    a => { a.discrepancies[0].classification = 'equivalent-representation'; },
    a => { a.discrepancies[0].reviewedCases = []; },
    a => { a.discrepancies[0].astylar = 'none'; },
    a => { delete a.buttonAppearanceInputs; },
  ]) {
    const copy = structuredClone(audit); mutate(copy);
    assert.ok(validateMaterialInputAudit(copy, { requireComplete: false }).some(e => e.includes('button appearance')));
  }
});

test('button appearance case index retains every original reset and explicit mapping follow-up', async () => {
  const { readFileSync } = await import('node:fs');
  const { createHash } = await import('node:crypto');
  const index = JSON.parse(readFileSync('docs/material-button-appearance-audit.json', 'utf8'));
  assertHistoricalCaseIndexSources('docs/material-button-appearance-audit.json', index);
  const bytes = readFileSync(index.mainCapture.file);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), index.mainCapture.sha256);
  const report = JSON.parse(bytes), cases = new Map();
  for (const [kind, list] of [['static', report.results], ['interaction', report.interactions]]) for (const entry of list) {
    const key = `${kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`;
    assert.equal(cases.has(key), false); cases.set(key, entry);
  }
  const verify = groups => {
    assert.equal(groups.length, 13); assert.equal(new Set(groups.map(g => `${g.family}/${g.element}`)).size, 13);
    assert.equal(groups.reduce((sum, g) => sum + g.occurrences, 0), 768);
    for (const group of groups) {
      assert.equal(group.classification, 'application-plugin-authoring-defect');
      assert.equal(group.reference, 'none'); assert.equal(group.candidate, '<omitted>');
      assert.equal(new Set(group.reviewedCases).size, group.occurrences);
      const expected = [...cases].filter(([, e]) => e.family === group.family && e.styleInputs.some(i => i.id === group.element)).map(([key]) => key);
      assert.deepEqual(group.reviewedCases, expected);
      for (const key of group.reviewedCases) {
        const inputs = cases.get(key).styleInputs.filter(i => i.id === group.element); assert.equal(inputs.length, 1);
        const input = inputs[0]; assert.equal(input.referenceStructure.type, 'button'); assert.equal(input.astylarStructure.type, 'button');
        assert.equal(input.reference.appearance, 'none'); assert.equal(input.astylarResolvedStyleEvidenceVersion, 2);
        const rules = input.referenceAuthored.filter(r => r.declarations.appearance !== undefined);
        assert.equal(rules.length, 1); assert.equal(rules[0].selector, '.mdc-button');
        assert.deepEqual(rules[0].declarations.appearance, { value: 'none', important: false });
        for (const stage of ['astylar', 'astylarNormalResolvedStyle', 'astylarInteractionResolvedStyle']) assert.equal(input[stage].appearance, undefined);
        assert.ok(input.astylarAuthored.every(r => r.declarations.appearance === undefined));
      }
    }
  };
  verify(index.groups);
  for (const mutate of [groups => groups.pop(), groups => { groups[0].reviewedCases.pop(); },
    groups => { groups[0].classification = 'equivalent-representation'; }, groups => { groups[0].candidate = 'none'; }]) {
    const copy = structuredClone(index.groups); mutate(copy); assert.throws(() => verify(copy));
  }
  assert.match(readFileSync('examples/material-showcase/node_modules/@angular/material/fesm2022/button.mjs', 'utf8'), /\.mdc-button\{[^}]*-webkit-appearance:none/);
  assert.equal(index.remainingMappingFollowups.samples.length, 6);
  for (const sample of index.remainingMappingFollowups.samples) {
    assert.deepEqual(sample.inputTrees, cases.get(sample.case).inputTrees);
    for (const ref of Object.values(sample.inputTrees)) assert.equal(createHash('sha256').update(readFileSync(ref.file)).digest('hex'), ref.sha256);
    const tree = JSON.parse(readFileSync(sample.inputTrees.reference.file));
    const nodes = tree.nodes.filter(n => (n.attributes?.['data-parity-id'] ?? n.attributes?.id) === sample.element)
      .map(({ key, parent, type, attributes }) => ({ key, parent, type, attributes }));
    assert.deepEqual(nodes, sample.referenceIdMatches);
    assert.equal(nodes.length, sample.element === 'stepper-content' ? 2 : 0);
  }
});

test('appearance public proof preserves control sensitivity and does not waive pending Material inputs', async () => {
  const { readFileSync } = await import('node:fs');
  const { createHash } = await import('node:crypto');
  const evidence = JSON.parse(readFileSync('docs/material-appearance-input-audit.json', 'utf8'));
  for (const source of evidence.sourceFingerprints) {
    // Installed-package fingerprints are provenance, not a requirement that
    // every checkout already has the maintained consumer installed.
    if (source.file.includes('/node_modules/')) continue;
    assert.equal(createHash('sha256').update(readFileSync(source.file, 'utf8').replace(/\r\n/g, '\n')).digest('hex'), source.sha256, source.file);
  }
  const verify = observations => {
    assert.deepEqual(observations.map(item => item.type).sort(), ['a', 'checkbox', 'div', 'h2', 'p', 'section', 'select', 'span']);
    for (const item of observations) {
      assert.equal(item.dpr, 1);
      const control = ['checkbox', 'select'].includes(item.type);
      assert.deepEqual(item.observations.map(trial => trial.mode), ['<omitted>', 'auto', 'none']);
      for (const trial of item.observations) {
        assert.equal(trial.browserAppearance, trial.mode === '<omitted>' ? (control ? 'auto' : 'none') : trial.mode);
        assert.equal(trial.normalAppearance, trial.mode);
        assert.equal(trial.effectiveAppearance, trial.mode);
        assert.deepEqual(trial.actual, { width: 120, height: 48 });
        assert.deepEqual(trial.reference, trial.actual);
        assert.deepEqual(trial.renderSize, [320, 180]);
        if (control && trial.mode === 'none') assert.ok(trial.changedBytes > 0);
        else assert.equal(trial.changedBytes, 0);
      }
    }
  };
  verify(evidence.observations);
  for (const mutate of [
    observations => observations.pop(),
    observations => { observations.find(item => item.type === 'checkbox').observations[2].changedBytes = 0; },
    observations => { observations.find(item => item.type === 'select').observations[0].normalAppearance = 'none'; },
    observations => { observations.find(item => item.type === 'div').observations[1].changedBytes = 1; },
  ]) {
    const copy = structuredClone(evidence.observations); mutate(copy);
    assert.throws(() => verify(copy));
  }
  assert.equal(evidence.pendingMainGroups.attributionChanged, false);
  assert.equal(evidence.pendingMainGroups.groups.length, 117);
  assert.equal(evidence.pendingMainGroups.groups.reduce((sum, group) => sum + group.count, 0), 6938);
  assert.equal(evidence.runs.length, 2);
  for (const run of evidence.runs) assert.deepEqual([run.exitCode, run.tests, run.successes, run.mounts], [0, 8, 8, 24]);
  assert.equal(evidence.runs[1].observations, null, 'do not manufacture a complete repeated observation log');
  assert.equal(evidence.build.exitCode, 0);
});

test('generated node mapping binds active stepper panels and aliases without changing inputs', async () => {
  const { readFileSync } = await import('node:fs');
  const { checkGeneratedMappingPair } = await import('./generated-node-mapping-evidence.mjs');
  const report = JSON.parse(readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json'));
  for (const [family, element, state] of [['badge', 'badge-count', null], ['stepper', 'stepper-content', null],
    ['stepper', 'stepper-content', 'activate'], ['tooltip', 'tooltip-popup', 'hover'], ['snack-bar', 'snack-bar-surface', 'activate']]) {
    const entry = (state ? report.interactions : report.results).find(e => e.family === family && (!state || e.state === state));
    const reference = JSON.parse(readFileSync(entry.inputTrees.reference.file)), candidate = JSON.parse(readFileSync(entry.inputTrees.astylar.file));
    const before = JSON.stringify([reference, candidate, entry]);
    const proof = checkGeneratedMappingPair(entry, reference, candidate, element);
    assert.equal(proof.status, 'mapped', JSON.stringify(proof.errors));
    assert.equal(proof.checkedReferenceProperties, 89);
    assert.equal(proof.inputEquivalent, false);
    assert.equal(JSON.stringify([reference, candidate, entry]), before);
    if (family === 'stepper') {
      assert.equal(proof.rejected.length, 1);
      assert.equal(proof.ownText, state ? 'Review changes' : 'Project details');
      assert.ok(proof.owners.some(o => o.attributes['aria-selected'] === 'true'));
    }
  }
});

test('generated node mapping rejects ambiguous aliases, wrong owners and unsupported stepper states', async () => {
  const { readFileSync } = await import('node:fs');
  const { resolveGeneratedReferenceNode } = await import('./generated-node-mapping-evidence.mjs');
  const tree = JSON.parse(readFileSync('artifacts/material-parity/current-ancestry-audit/stepper/light/desktop/reference-input-tree.json'));
  const content = t => t.nodes.find(n => n.attributes?.['data-parity-id'] === 'stepper-content');
  const panel = t => t.nodes.find(n => n.key === content(t).parent);
  const header = t => t.nodes.find(n => n.attributes?.id === panel(t).attributes['aria-labelledby']);
  const mutations = [
    t => t.nodes.push(structuredClone(content(t))),
    t => { content(t).attributes.id = 'stepper-content'; },
    t => { panel(t).attributes.role = 'region'; },
    t => { panel(t).attributes.inert = ''; },
    t => { header(t).attributes['aria-selected'] = 'false'; },
    t => { header(t).attributes['aria-controls'] = 'other'; },
    t => { t.styles[panel(t).style].height = '0px'; },
    t => { t.styles[content(t).style].visibility = 'hidden'; },
    t => { content(t).parent = content(t).key; },
    t => { t.nodes.find(n => n.attributes?.id === 'stepper-primary').type = 'div'; },
    t => { t.nodes.find(n => n.attributes?.id === 'stepper-primary').parent = 'missing'; },
    t => { t.errors.push('unreadable rules'); },
    t => { delete t.styles; },
    t => { delete t.rules; },
  ];
  for (const [i, mutate] of mutations.entries()) {
    const changed = structuredClone(tree); mutate(changed);
    assert.equal(resolveGeneratedReferenceNode(changed, 'stepper-content', 'stepper').status, 'unresolved', `mutation ${i}`);
  }
  const overlay = JSON.parse(readFileSync('artifacts/material-parity/current-ancestry-audit/interactions/tooltip/light/desktop-dpr1/hover/reference-input-tree.json'));
  const popup = t => t.nodes.find(n => String(n.attributes?.class).includes('mat-mdc-tooltip-surface'));
  for (const mutate of [
    t => { const n = structuredClone(popup(t)); n.key += '/duplicate'; t.nodes.push(n); },
    t => { popup(t).attributes['data-parity-id'] = 'tooltip-popup'; },
    t => { popup(t).parent = 'frame'; },
    t => { t.nodes.find(n => n.type === 'mat-tooltip-component').type = 'div'; },
    t => { t.nodes.find(n => n.key === 'overlay:0').parent = 'frame'; },
  ]) {
    const changed = structuredClone(overlay); mutate(changed);
    assert.equal(resolveGeneratedReferenceNode(changed, 'tooltip-popup', 'tooltip').status, 'unresolved');
  }
  assert.equal(resolveGeneratedReferenceNode(overlay, 'tooltip-popup', 'snack-bar').status, 'unresolved');
});

test('generated node mapping independently rejects scalar style, rule, text and candidate-stage mutations', async () => {
  const { readFileSync } = await import('node:fs');
  const { checkGeneratedMappingPair } = await import('./generated-node-mapping-evidence.mjs');
  const report = JSON.parse(readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json'));
  const entry = report.results.find(e => e.family === 'badge');
  const ref = JSON.parse(readFileSync(entry.inputTrees.reference.file)), ast = JSON.parse(readFileSync(entry.inputTrees.astylar.file));
  const input = e => e.styleInputs.find(i => i.id === 'badge-count');
  for (const mutate of [
    e => { input(e).reference.width = '999px'; },
    e => { input(e).referenceStructure.text = 'wrong'; },
    e => { input(e).referenceAuthored.pop(); },
    e => { input(e).astylarResolvedStyleEvidenceVersion = 1; input(e).astylarNormalResolvedStyle = null; },
    e => { input(e).astylarInteractionResolvedStyle.appearance = 'none'; },
    e => { input(e).astylar.width = '999px'; },
    e => { e.styleInputs.push(structuredClone(input(e))); },
  ]) {
    const changed = structuredClone(entry); mutate(changed);
    assert.equal(checkGeneratedMappingPair(changed, ref, ast, 'badge-count').status, 'unresolved');
  }
  for (const mutate of [a => { a.resolvedStyleSource = 'inferred'; }, a => { a.resolvedStyleRevision = -1; },
    a => { a.nodes.push(structuredClone(a.nodes.find(n => n.authored?.id === 'badge-count'))); }]) {
    const changed = structuredClone(ast); mutate(changed);
    assert.equal(checkGeneratedMappingPair(entry, ref, changed, 'badge-count').status, 'unresolved');
  }
});

test('generated mapping case index preserves all boundaries, missing layer rules and one-sided tooltip states', async () => {
  const { readFileSync } = await import('node:fs');
  const { createHash } = await import('node:crypto');
  const { buildGeneratedMappingAudit } = await import('./generated-node-mapping-evidence.mjs');
  const { restoreMappingReadAdapterSource } = await import('./audit-evidence-session.mjs');
  const index = JSON.parse(readFileSync('docs/material-generated-node-mapping-audit.json'));
  for (const source of index.sourceFingerprints) assert.equal(createHash('sha256')
    .update(source.file === 'tests/material-parity/generated-node-mapping-evidence.mjs'
      ? restoreMappingReadAdapterSource(source, readFileSync(source.file))
      : readFileSync(source.file, 'utf8').replace(/\r\n/g, '\n')).digest('hex'), source.sha256, source.file);
  const bytes = readFileSync(index.mainCapture.file);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), index.mainCapture.sha256);
  const raw = JSON.parse(bytes), replay = buildGeneratedMappingAudit(raw);
  assert.deepEqual(index.summary, replay.summary);
  assert.deepEqual(index.observations, replay.observations);
  assert.deepEqual(replay.summary, { observations: 387, scalarObservations: 239, mapped: 172,
    unresolvedWithScalar: 67, pairedScalarObservations: 231, unresolvedPairedScalar: 59,
    oneSidedScalar: 8, boundariesWithoutScalar: 148 });
  const propsSource = readFileSync('tests/material-parity/run-material-parity.mjs', 'utf8')
    .match(/const materialStyleInputProperties = Object\.freeze\(\[([\s\S]*?)\]\);/)[1];
  const expectedProperties = [...propsSource.matchAll(/'([^']+)'/g)].map(m => m[1]).sort();
  assert.equal(expectedProperties.length, 89);
  for (const entry of [...raw.results, ...raw.interactions]) for (const input of entry.styleInputs) {
    if (input.reference) assert.deepEqual(Object.keys(input.reference).sort(), expectedProperties);
  }
  const gaps = replay.observations.filter(o => o.referenceScalarPresent && o.candidateScalarPresent && o.status !== 'mapped');
  assert.equal(gaps.length, 59);
  for (const gap of gaps) {
    assert.ok(['bottom-sheet-overlay', 'snack-bar-overlay'].includes(gap.element));
    assert.deepEqual(gap.errors, ['reference scalar authored rules differ from selected tree node']);
    assert.deepEqual(gap.missingScalarRules, [{ selector: '.cdk-global-overlay-wrapper',
      declarations: { 'z-index': { value: '1000', important: false } } }]);
    assert.deepEqual(gap.extraScalarRules, []);
  }
  const oneSided = replay.observations.filter(o => o.referenceScalarPresent !== o.candidateScalarPresent);
  assert.equal(oneSided.length, 8);
  for (const observation of oneSided) {
    assert.equal(observation.element, 'tooltip-popup'); assert.ok(observation.case.endsWith('/open'));
    assert.equal(observation.referenceScalarPresent, false); assert.equal(observation.candidateKeys.length, 1);
    assert.equal(observation.reason, 'alias absent in captured roots');
  }
  assert.ok(replay.observations.filter(o => o.scalarCount === 0).every(o => o.candidateKeys.length === 0));
  for (const mutate of [o => o.pop(), o => { o[0].status = 'unresolved'; },
    o => { o.find(r => r.missingScalarRules?.length).missingScalarRules = []; },
    o => { o.find(r => r.scalarCount && !r.referenceScalarPresent).referenceScalarPresent = true; }]) {
    const copy = structuredClone(index.observations); mutate(copy);
    assert.throws(() => assert.deepEqual(copy, replay.observations));
  }
  const broken = structuredClone(raw.results.find(e => e.family === 'badge'));
  broken.inputTrees.reference.file = 'package.json';
  assert.throws(() => buildGeneratedMappingAudit({ results: [broken], interactions: [] }), /outside Material artifacts/);
  broken.inputTrees.reference = { ...raw.results.find(e => e.family === 'badge').inputTrees.reference, sha256: '0'.repeat(64) };
  assert.throws(() => buildGeneratedMappingAudit({ results: [broken], interactions: [] }), /hash mismatch/);
});

test('full-tree artifact references cannot escape the captured Material artifact directory', () => {
  const result = collectFullTreeInventory([{ family: 'core', profile: 'light', viewport: { id: 'desktop' },
    inputTrees: { reference: { file: 'package.json', sha256: 'irrelevant' } },
  }]);
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0].error, /outside Material artifacts/);
  assert.equal(result.gaps.length, 2);
});
