import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import {
  buildMaterialInputAudit,
  attributeObservedNormalLineBoxes,
  collectFullTreeInventory,
  collectControlTypographyEvidence,
  collectRetainedTypographyEvidence,
  parseMaterialInputAuditArguments,
  reviewedHeadingMappings,
  reviewedTemplateTextMappings,
  summarizeSupplementalBehavior,
  summarizeSupplementalOverlays,
  summarizeSupplementalSlider,
  validateMaterialInputAudit,
} from './input-equivalence-audit.mjs';

const browserDefaults = {
  visibility: 'visible', minWidth: '0px', maxWidth: 'none', minHeight: '0px', maxHeight: 'none',
  fontStyle: 'normal', transform: 'none', pointerEvents: 'auto',
};

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

test('normalizes shorthand, colors, numeric precision, and implicit browser values', () => {
  const audit = buildMaterialInputAudit(parityReport({
    ...browserDefaults,
    paddingTop: '0px', paddingRight: '24px', paddingBottom: '0px', paddingLeft: '24px',
    backgroundColor: 'rgb(103, 80, 164)', opacity: '1', width: '212.234px',
  }, {
    padding: '0 24px', background: '#6750a4', opacity: '1.0', width: '212.234375px',
  }));
  assert.ok(audit.discrepancies.every(({ classification }) => classification === 'equivalent-representation'));
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
  const report = parityReport({}, {});
  const audit = buildMaterialInputAudit(report);
  assert.equal(audit.coverage.visualParityGreen, true);
  assert.equal(audit.sourceFingerprints.length, 35);
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

test('attributes floating-label font substitution without equating scaled and smaller text inputs', () => {
  const raw = floatingLabelTypographyReport();
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
    const raw = floatingLabelTypographyReport();
    mutate(raw.results[0]);
    const evidence = collectRetainedTypographyEvidence(raw.results, collectFullTreeInventory(raw.results));
    assert.equal(evidence.differences.find((entry) => entry.property === 'fontSize').attribution, 'unresolved');
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

test('full-tree artifact references cannot escape the captured Material artifact directory', () => {
  const result = collectFullTreeInventory([{ family: 'core', profile: 'light', viewport: { id: 'desktop' },
    inputTrees: { reference: { file: 'package.json', sha256: 'irrelevant' } },
  }]);
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0].error, /outside Material artifacts/);
  assert.equal(result.gaps.length, 2);
});
