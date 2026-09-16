import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { stripVTControlCharacters } from 'node:util';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const target = 'docs/material-field-host-flow-public-proof.json';
const logRoot = 'artifacts/material-parity/field-host-flow-input-audit';
const scope = 'Equal-input auto-height column host and block section with two empty in-flow wrappers and a following sibling; geometry/update proof, not Material controls, typography or raster equivalence.';
const result = 'TOTAL: 2 FAILED, 2 SUCCESS';
const hash = value => createHash('sha256').update(value).digest('hex');
const ids = ['flow-frame', 'flow-section', 'flow-host', 'flow-field', 'flow-subscript', 'flow-following'];
const steps = { initial: 20, grown: 40, restored: 20 };
const toCss = styles => styles.map(({ selector, ...values }) => `${selector}{${Object.entries(values)
  .map(([key, value]) => `${key.replace(/[A-Z]/g, c => '-' + c.toLowerCase())}:${value}`).join(';')}}`).join('\n');

// Independent input contract: changing both logged CSS and SiteData cannot
// silently turn this into a fixed-height or out-of-flow compensation proof.
function expectedSite(display, width, subscriptHeight) {
  return {
    root: { children: [{ type: 'main', id: 'flow-frame', children: [
      { type: 'section', id: 'flow-section', children: [{ type: 'div', id: 'flow-host', children: [
        { type: 'div', id: 'flow-field' }, { type: 'div', id: 'flow-subscript' },
      ] }] }, { type: 'div', id: 'flow-following' },
    ] }] },
    styles: [
      { selector: 'body', margin: '0', padding: '0' },
      { selector: '#flow-frame', position: 'absolute', top: '16px', left: '16px', width: '400px', height: '340px',
        margin: '0', padding: '0', borderWidth: '0', display: 'block', boxSizing: 'border-box', background: '#ffffff' },
      { selector: '#flow-section', display: 'block', width: `${width}px`, margin: '0', padding: '28px',
        borderWidth: '1px', borderStyle: 'solid', borderColor: '#123456', boxSizing: 'content-box',
        fontFamily: 'Arial', fontSize: '16px', lineHeight: '24px', background: '#eeeeee' },
      { selector: '#flow-host', display, flexDirection: 'column', minWidth: '0', width: '100%',
        margin: '0', padding: '0', borderWidth: '0', boxSizing: 'content-box',
        fontFamily: 'Arial', fontSize: '16px', lineHeight: '24px', background: '#ddccff' },
      { selector: '#flow-field', position: 'relative', display: 'flex', height: '56px', margin: '0', padding: '0', borderWidth: '0', background: '#6750a4' },
      { selector: '#flow-subscript', position: 'relative', display: 'block', height: `${subscriptHeight}px`, margin: '0', padding: '0', borderWidth: '0', background: '#999999' },
      { selector: '#flow-following', display: 'block', width: '100%', height: '8px', margin: '0', padding: '0', borderWidth: '0', background: '#111111' },
    ],
  };
}

export function readFieldHostFlowProof(rawLog) {
  const log = stripVTControlCharacters(rawLog);
  assert.deepEqual(log.match(/^TOTAL:.*$/gm), [result]);
  assert.doesNotMatch(log, /\bERROR\b/);
  const rows = log.split(/\r?\n/).filter(l => l.startsWith("INFO: 'MATERIAL_FIELD_HOST_FLOW_PROOF', '"))
    .map(l => JSON.parse(l.slice(l.indexOf('{'), l.lastIndexOf('}') + 1)));
  const unique = new Map();
  for (const row of rows) {
    const key = `${row.display}/${row.width}/${row.step}`;
    if (unique.has(key)) assert.deepEqual(row, unique.get(key), `contradictory duplicate ${key}`);
    else unique.set(key, row);
  }
  assert.deepEqual([...unique.keys()].sort(), ['flex', 'inline-flex'].flatMap(d => [120, 240]
    .flatMap(w => Object.keys(steps).map(s => `${d}/${w}/${s}`))).sort());
  const mismatches = [];
  for (const [key, row] of unique) {
    const { display, width, step, subscriptHeight } = row;
    assert.equal(subscriptHeight, steps[step]);
    assert.equal(row.dpr, 1); assert.match(row.userAgent, /HeadlessChrome\/152\.0\.0\.0/);
    assert.deepEqual(row.renderSize, [480, 400]); assert.equal(row.scope, scope);
    const site = expectedSite(display, width, subscriptHeight);
    assert.deepEqual(row.site, site); assert.equal(row.css, toCss(site.styles));
    const height = 56 + subscriptHeight;
    const boxes = [
      { x: 16, y: 16, width: 400, height: 340 },
      { x: 16, y: 16, width: width + 58, height: height + 58 },
      { x: 45, y: 45, width, height },
      { x: 45, y: 45, width, height: 56 },
      { x: 45, y: 101, width, height: subscriptHeight },
      { x: 16, y: height + 74, width: 400, height: 8 },
    ];
    assert.deepEqual(row.measurements.map(m => m.id), ids);
    row.measurements.forEach((m, index) => {
      const style = site.styles[index + 1];
      const stage = { display: style.display, height: style.height ?? '<omitted>', width: style.width ?? '<omitted>',
        flexDirection: style.flexDirection ?? 'row', boxSizing: style.boxSizing ?? '<omitted>' };
      assert.deepEqual(m.stages, [stage, stage]);
      assert.deepEqual(m.browserStyle, { display: style.display, height: `${index === 1 ? height : boxes[index].height}px`,
        width: `${index === 1 ? width : boxes[index].width}px`, flexDirection: style.flexDirection ?? 'row',
        position: style.position ?? 'static', boxSizing: style.boxSizing ?? 'content-box', verticalAlign: 'baseline' });
      for (const property of ['x', 'y', 'width', 'height']) {
        const reference = boxes[index][property];
        assert.ok(Number.isFinite(m.reference[property]) && Math.abs(m.reference[property] - reference) < .01, `${key}/${m.id}/${property} reference`);
        const failing = display === 'inline-flex' && ((index === 1 && property === 'height') || (index === 5 && property === 'y'));
        const observed = failing ? (index === 1 ? 340 : 356) : reference;
        assert.ok(Number.isFinite(m.actual[property]) && Math.abs(m.actual[property] - observed) < .01, `${key}/${m.id}/${property} recorded observation`);
        if (failing) mismatches.push({ case: key, element: m.id, property, reference, actual: observed, error: observed - reference });
      }
    });
  }
  mismatches.sort((a, b) => `${a.case}/${a.element}/${a.property}`.localeCompare(`${b.case}/${b.element}/${b.property}`));
  const expectedFailures = mismatches.map(m => `${m.case}/${m.element}/${m.property}: Expected ${m.error} to be less than 0.5.`).sort();
  assert.deepEqual(log.split(/\r?\n/).map(l => l.trim()).filter(l => l.includes('Expected ')).sort(), expectedFailures,
    'Only the twelve recorded geometry assertions may fail; lifecycle/input/diagnostic failures are not accepted');
  return { rawRecords: rows.length, cases: [...unique.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, value]) => value), mismatches };
}

export function buildFieldHostFlowReport() {
  const logs = ['test.log', 'repeat.log'].map(name => {
    const file = `${logRoot}/${name}`, bytes = readFileSync(file);
    return { file, sha256: hash(bytes), result, proof: readFieldHostFlowProof(bytes.toString()) };
  });
  assert.deepEqual(logs[0].proof, logs[1].proof, 'repeated runs must retain identical inputs and measurements');
  const files = ['scripts/audit-material-field-host-flow.mjs', 'tests/material-parity/field-host-flow-log-proof.spec.mjs',
    'examples/material-showcase/src/app/field-host-flow-input-audit.spec.ts', 'examples/material-showcase/angular.json',
    'examples/material-showcase/src/styles.scss', 'examples/material-showcase/node_modules/astylarui/package.json',
    ...['element-creation', 'element-dimension', 'flex'].flatMap(name => [
      `src/app/services/dom/elements/${name}.service.ts`,
      `examples/material-showcase/node_modules/astylarui/dist/lib/app/services/dom/elements/${name}.service.js`,
    ])];
  const version = name => JSON.parse(readFileSync(`examples/material-showcase/node_modules/${name}/package.json`)).version;
  return { schemaVersion: 1, evidenceId: 'field-host-inline-parent-auto-height-public-proof',
    baselineCommit: '8267a2d31db6d9a27fcb95953f7a8a7ed3fb4280', branch: 'codex/material-ui-showcase',
    command: 'npm --prefix examples/material-showcase test -- --watch=false --browsers=ChromeHeadless --include=src/app/field-host-flow-input-audit.spec.ts',
    logs: logs.map(({ proof, ...receipt }, index) => ({ ...receipt, terminalSession: index === 0 ? 92712 : 13035,
      exitCode: index === 0 ? 1 : null, exitEvidence: index === 0 ? 'terminal exit observed during original run' : 'session handle expired before exit code was recovered; complete Karma terminal summary retained' })),
    environment: { astylarui: version('astylarui'), angular: version('@angular/core'), material: version('@angular/material'), babylon: version('@babylonjs/core'),
      dpr: 1, canvasCssSize: [480, 400], settlement: 'reference document.fonts.ready then surface.whenSettled()',
      warning: 'NG0914: zoneless change detection with Zone.js loaded by Karma polyfills' },
    sourceFingerprints: files.map(file => ({ file, sha256: hash(readFileSync(file, 'utf8').replaceAll('\r\n', '\n')) })),
    ...logs[0].proof, scope, classification: 'confirmed-core-inline-parent-auto-height-defect',
    rendererDefectProven: true, materialInputEquivalent: false, originalCaseCausalTraceComplete: false, originalObservationsReclassified: 0,
    sourceDiagnosis: { owner: 'ElementCreationService.layoutInlineChildren',
      earliestIncorrectStage: 'inline flow consumes provisional descendant dimensions when calculating parent line height',
      evidenceKind: 'repeated equal-input public geometry proof plus source-order inspection; no internal runtime trace or corrective intervention',
      locations: ['src/app/services/dom/elements/element-creation.service.ts:870', 'src/app/services/dom/elements/element-creation.service.ts:914',
        'src/app/services/dom/elements/element-creation.service.ts:1000', 'src/app/services/dom/elements/element-creation.service.ts:1112',
        'src/app/services/dom/elements/element-dimension.service.ts:118', 'src/app/services/dom/elements/element-dimension.service.ts:593',
        'src/app/services/dom/elements/flex.service.ts:435'],
      mechanism: 'Inline flow reads child dimensions and commits parent height before processing child descendants. Flex descendant layout later corrects host height without recomputing the parent. Block flow processes descendants before consuming child dimensions.',
      ownership: 'Core CSS layout finalization, not a plugin replacement layout or Babylon coordinate correction.' },
    conclusion: 'Both runs fail the same two inline-flex tests and pass two flex controls. Across twelve state observations, only inline parent height and following-sibling y differ (12 property failures). Final host/child boxes match. Keep the failing parity assertions; flex is a diagnostic control, never a substitute comparison input.' };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert.ok(process.argv.slice(2).every(a => a === '--check'));
  const report = buildFieldHostFlowReport(), output = JSON.stringify(report, null, 2) + '\n';
  if (process.argv.includes('--check')) assert.equal(readFileSync(target, 'utf8').replaceAll('\r\n', '\n'), output);
  else writeFileSync(target, output);
  console.log(JSON.stringify({ target, tests: 4, failed: 2, passed: 2, observations: report.cases.length,
    propertyFailures: report.mismatches.length, repeatIdentical: true, originalObservationsReclassified: 0 }));
}
