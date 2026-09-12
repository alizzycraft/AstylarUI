import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import {
  buildMaterialInputAudit,
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
  assert.equal(audit.sourceFindings.find(({ id }) => id === 'direct-style-calc-resolution-limit').classification,
    'intentional-documented-limitation');
  assert.equal(audit.sourceFindings.find(({ id }) => id === 'core-opposing-vertical-insets-ignore-auto-height').classification,
    'confirmed-core-renderer-defect');
  for (const id of ['core-inline-parent-ignores-descendant-intrinsic-width', 'core-absolute-insets-ignore-margin-box', 'core-explicit-font-list-appends-default-fallbacks']) {
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
  assert.equal(audit.sourceFingerprints.length, 21);
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

test('reviewed template text paths close only identity gaps and retain unequal typography', () => {
  for (const [family, count] of [['tree', 3], ['grid-list', 2], ['badge', 1], ['sort', 1], ['expansion', 1], ['sidenav', 1], ['button-toggle', 2], ['chips', 2], ['paginator', 3], ['stepper', 3]]) {
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
  for (const family of ['tree', 'grid-list', 'badge', 'sort', 'expansion', 'sidenav', 'button-toggle', 'chips', 'paginator', 'stepper']) {
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
    (entry) => { entry.profile = 'dark'; },
    (entry) => { entry.inputTrees.reference.rules[0].active = false; },
    (entry) => { delete entry.inputTrees.reference.nodes[0].attributes.disabled; },
    (entry) => { entry.inputTrees.astylar.nodes[0].authored.disabled = false; },
    (entry) => { entry.inputTrees.astylar.nodes[0].interactionResolvedStyle.color = '#ffffff'; },
    (entry) => { entry.inputTrees.astylar.rules[0].color = '#ffffff'; },
    (entry) => { entry.inputTrees.reference.rules[0].declarations.color.value = 'rgba(29,27,32,.38)'; },
  ];
  for (const mutate of mutations) {
    const candidate = disabledButtonInkReport();
    mutate(candidate.results[0]);
    assert.equal(controlEvidence(candidate).differences[0].attribution, 'unresolved', String(mutate));
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
