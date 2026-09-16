import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { stripVTControlCharacters } from 'node:util';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const logFile = 'artifacts/material-parity/field-host-shrink-input-audit/test.log';
const target = 'docs/material-field-host-shrink-public-proof.json';
const hash = value => createHash('sha256').update(value).digest('hex');
const scope = 'Identical fixed-height flex parent and block host with an absolute child; shrink mechanism only, not Material input or raster equivalence.';
const dimensions = { normal: [134, 78], contrast: [114, 62], compact: [126, 70] };

export function readFieldHostShrinkProof(log) {
  assert.match(log, /TOTAL: 12 SUCCESS/);
  assert.doesNotMatch(log, /\b(?:FAILED|ERROR)\b/);
  const rows = stripVTControlCharacters(log).split(/\r?\n/).filter(l => l.includes("INFO: 'MATERIAL_FIELD_HOST_SHRINK_PROOF', '"))
    .map(l => JSON.parse(l.slice(l.indexOf('{'), l.lastIndexOf('}') + 1)));
  const unique = new Map();
  for (const row of rows) {
    const key = `${row.profile}/${row.extraRoom}/${row.shrink}`;
    if (unique.has(key)) assert.deepEqual(row, unique.get(key), `contradictory duplicate ${key}`);
    else unique.set(key, row);
  }
  assert.deepEqual([...unique.keys()].sort(), Object.keys(dimensions).flatMap(p => [0, 40].flatMap(room => ['0', '1'].map(s => `${p}/${room}/${s}`))).sort());
  for (const row of unique.values()) {
    const { profile, parentHeight, hostHeight, extraRoom, shrink } = row;
    assert.deepEqual([parentHeight, hostHeight], dimensions[profile]);
    assert.equal(row.dpr, 1); assert.match(row.userAgent, /HeadlessChrome\/152\./);
    assert.deepEqual(row.renderSize, [400, 280]); assert.equal(row.scope, scope);
    assert.deepEqual(row.site.root, { children: [{ type: 'section', id: 'shrink-parent', children: [{ type: 'div', id: 'shrink-host',
      children: [{ type: 'div', id: 'shrink-absolute-child' }] }] }] });
    assert.deepEqual(row.site.styles, [
      { selector: 'body', margin: '0', padding: '0' },
      { selector: '#shrink-parent', position: 'absolute', left: '32px', top: '32px', width: '300px',
        height: `${parentHeight + extraRoom}px`, boxSizing: 'border-box', margin: '0', padding: '28px',
        borderWidth: '1px', borderStyle: 'solid', borderColor: '#123456', borderRadius: '0',
        display: 'flex', flexDirection: 'column', gap: '16px', background: '#eeeeee' },
      { selector: '#shrink-host', position: 'relative', display: 'block', width: '100%', height: `${hostHeight}px`,
        boxSizing: 'border-box', margin: '0', padding: '0', borderWidth: '0', alignSelf: 'flex-start',
        flexGrow: '0', flexShrink: shrink, flexBasis: 'auto', background: '#ddccff' },
      { selector: '#shrink-absolute-child', position: 'absolute', top: '0', left: '0', width: '100%', height: '24px',
        boxSizing: 'border-box', margin: '0', padding: '0', borderWidth: '0', background: '#6750a4' },
    ]);
    const css = row.site.styles.map(({ selector, ...values }) => `${selector}{${Object.entries(values)
      .map(([key, value]) => `${key.replace(/[A-Z]/g, c => '-' + c.toLowerCase())}:${value}`).join(';')}}`).join('\n');
    assert.equal(row.css, css, 'one rule source must feed both surfaces');
    const stage = { height: `${hostHeight}px`, flexShrink: shrink, flexBasis: 'auto', boxSizing: 'border-box', position: 'relative' };
    assert.deepEqual(row.stages, [stage, stage]);
    const usedHeight = shrink === '1' ? Math.min(hostHeight, parentHeight + extraRoom - 58) : hostHeight;
    const expected = [
      { x: 32, y: 32, width: 300, height: parentHeight + extraRoom },
      { x: 61, y: 61, width: 242, height: usedHeight },
      { x: 61, y: 61, width: 242, height: 24 },
    ];
    assert.deepEqual(row.measurements.map(m => m.id), ['shrink-parent', 'shrink-host', 'shrink-absolute-child']);
    row.measurements.forEach((m, i) => {
      assert.deepEqual(m.expected, expected[i]);
      assert.deepEqual(m.browserStyle, { display: i === 0 ? 'flex' : 'block', height: `${expected[i].height}px`,
        flexShrink: i === 1 ? shrink : '1', position: i === 1 ? 'relative' : 'absolute', boxSizing: 'border-box' });
      for (const key of ['x', 'y', 'width', 'height']) {
        assert.ok(Number.isFinite(m.reference[key]) && Math.abs(m.reference[key] - expected[i][key]) < .01, `reference ${m.id}/${key}`);
        assert.ok(Number.isFinite(m.actual[key]) && Math.abs(m.actual[key] - m.reference[key]) < .5, `candidate ${m.id}/${key}`);
      }
    });
  }
  return { rawRecords: rows.length, cases: [...unique.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, value]) => value) };
}

export function buildFieldHostShrinkReport() {
  const bytes = readFileSync(logFile), proof = readFieldHostShrinkProof(bytes.toString());
  const files = ['scripts/audit-material-field-host-shrink.mjs', 'tests/material-parity/field-host-shrink-log-proof.spec.mjs',
    'examples/material-showcase/src/app/field-host-shrink-input-audit.spec.ts', 'examples/material-showcase/angular.json',
    'examples/material-showcase/src/styles.scss', 'examples/material-showcase/node_modules/astylarui/package.json',
    'src/app/services/dom/elements/flex-layout.service.ts', 'src/app/services/dom/elements/flex.service.ts',
    'src/app/services/dom/elements/element-dimension.service.ts',
    'examples/material-showcase/node_modules/astylarui/dist/lib/app/services/dom/elements/flex-layout.service.js',
    'examples/material-showcase/node_modules/astylarui/dist/lib/app/services/dom/elements/flex.service.js',
    'examples/material-showcase/node_modules/astylarui/dist/lib/app/services/dom/elements/element-dimension.service.js'];
  const version = name => JSON.parse(readFileSync(`examples/material-showcase/node_modules/${name}/package.json`)).version;
  return { schemaVersion: 1, evidenceId: 'field-host-fixed-parent-shrink-public-proof',
    baselineCommit: '4c3e5c3b6bf8e61c17a1a779b3705db2bf0cc593', branch: 'codex/material-ui-showcase',
    command: 'npm --prefix examples/material-showcase test -- --watch=false --browsers=ChromeHeadless --include=src/app/field-host-shrink-input-audit.spec.ts',
    log: { file: logFile, sha256: hash(bytes), result: 'TOTAL: 12 SUCCESS', terminalSession: 73237, exitCode: 0 },
    environment: { astylarui: version('astylarui'), angular: version('@angular/core'), material: version('@angular/material'), babylon: version('@babylonjs/core'),
      dpr: 1, canvasCssSize: [400, 280], settlement: 'reference document.fonts.ready then surface.whenSettled()',
      warning: 'NG0914: zoneless change detection with Zone.js loaded by Karma polyfills' },
    sourceFingerprints: files.map(file => ({ file, sha256: hash(readFileSync(file, 'utf8').replaceAll('\r\n', '\n')) })),
    ...proof, scope, classification: 'bounded-equal-input-flex-shrink-mechanism-confirmed',
    originalCaseCausalTraceComplete: false, materialInputEquivalent: false, rendererDefectProven: false, originalObservationsReclassified: 0,
    conclusion: 'Both renderers shrink the isolated candidate-like host to 76/56/68px only when constrained by the original parent heights and flex-shrink:1. Disabling shrink or adding 40px parent room retains authored 78/62/70px on both sides. This confirms a sufficient ordinary flex-sizing mechanism for matching boxes, not equivalence to Material auto-height/in-flow composition or a core defect.' };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert.ok(process.argv.slice(2).every(a => a === '--check'));
  const report = buildFieldHostShrinkReport(), output = JSON.stringify(report, null, 2) + '\n';
  if (process.argv.includes('--check')) assert.equal(readFileSync(target, 'utf8').replaceAll('\r\n', '\n'), output);
  else writeFileSync(target, output);
  console.log(JSON.stringify({ target, cases: report.cases.length, rawRecords: report.rawRecords, logSha256: report.log.sha256, originalObservationsReclassified: 0 }));
}
