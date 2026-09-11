import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import {
  buildMaterialInputAudit,
  collectFullTreeInventory,
  collectRetainedTypographyEvidence,
  parseMaterialInputAuditArguments,
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
  for (const id of ['core-inline-parent-ignores-descendant-intrinsic-width', 'core-absolute-insets-ignore-margin-box']) {
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
  assert.equal(audit.sourceFingerprints.length, 16);
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
