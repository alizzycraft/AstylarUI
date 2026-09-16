import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { stripVTControlCharacters } from 'node:util';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export const scope = 'Native button declared pixel sizes with nonzero padding/border; not auto/intrinsic sizing, label composition, clipping, hit testing or raster equivalence.';
export function readButtonBoxSizingProof(log) {
  assert.match(log, /TOTAL: 6 SUCCESS/);
  assert.doesNotMatch(log, /\b(?:FAILED|ERROR)\b/);
  // Karma repeats records with ANSI color decoration; retain and compare both.
  const rows = stripVTControlCharacters(log).split(/\r?\n/).filter(line => line.includes("INFO: 'MATERIAL_BUTTON_BOX_SIZING_PROOF', '"))
    .map(line => JSON.parse(line.slice(line.indexOf('{'), line.lastIndexOf('}') + 1)));
  const unique = new Map();
  for (const row of rows) {
    const key = `${row.width}/${row.mode}`;
    if (unique.has(key)) assert.deepEqual(row, unique.get(key), `contradictory duplicate ${key}`);
    else unique.set(key, row);
  }
  assert.deepEqual([...unique.keys()].sort(), [120, 240].flatMap(width =>
    ['omitted', 'border-box', 'content-box'].map(mode => `${width}/${mode}`)).sort());
  for (const row of unique.values()) {
    const { width, mode } = row;
    assert.equal(row.dpr, 1); assert.match(row.userAgent, /HeadlessChrome\/152\./);
    assert.deepEqual(row.renderSize, [400, 180]); assert.equal(row.scope, scope);
    const style = { selector: '#button-box-sizing-probe', position: 'absolute', display: 'block',
      left: '32px', top: '32px', width: `${width}px`, height: '44px', margin: '0', padding: '6px 14px',
      borderWidth: '2px', borderStyle: 'solid', borderColor: '#123456', borderRadius: '0px',
      appearance: 'none', fontFamily: 'Arial', fontSize: '16px', lineHeight: '20px', fontWeight: '400',
      color: '#123456', background: '#eeeeee', ...(mode === 'omitted' ? {} : { boxSizing: mode }) };
    assert.deepEqual(row.site, { root: { children: [{ type: 'button', id: 'button-box-sizing-probe', value: 'Probe' }] },
      styles: [{ selector: 'body', margin: '0', padding: '0' }, style] });
    const css = row.site.styles.map(({ selector, ...values }) => `${selector}{${Object.entries(values)
      .map(([key, value]) => `${key.replace(/[A-Z]/g, c => '-' + c.toLowerCase())}:${value}`).join(';')}}`).join('\n');
    assert.equal(row.css, css, 'paired CSS must come from the same authored rules');
    const stage = { width: `${width}px`, height: '44px', padding: '6px 14px', borderWidth: '2px',
      boxSizing: mode === 'omitted' ? '<omitted>' : mode };
    assert.deepEqual(row.stages, [stage, stage]);
    assert.deepEqual(row.browserStyle, { boxSizing: mode === 'content-box' ? 'content-box' : 'border-box',
      width: `${width}px`, height: '44px', padding: '6px 14px', borderWidth: '2px' });
    const expected = { x: 32, y: 32, width: width + (mode === 'content-box' ? 32 : 0),
      height: 44 + (mode === 'content-box' ? 16 : 0) };
    assert.deepEqual(row.expected, expected);
    for (const key of Object.keys(expected)) {
      assert.ok(Number.isFinite(row.reference[key]) && Math.abs(row.reference[key] - expected[key]) < .01, `reference ${key}`);
      assert.ok(Number.isFinite(row.actual[key]) && Math.abs(row.actual[key] - row.reference[key]) < .5, `candidate ${key}`);
    }
  }
  return { rawRecords: rows.length, cases: [...unique.values()].sort((a, b) => a.width - b.width || a.mode.localeCompare(b.mode)) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const logFile = 'artifacts/material-parity/button-box-sizing-input-audit/test.log';
  const bytes = readFileSync(logFile), proof = readButtonBoxSizingProof(bytes.toString());
  const files = ['scripts/audit-material-button-box-sizing.mjs',
    'tests/material-parity/button-box-sizing-log-proof.spec.mjs',
    'examples/material-showcase/src/app/button-box-sizing-input-audit.spec.ts',
    'examples/material-showcase/angular.json', 'examples/material-showcase/src/styles.scss',
    'src/app/config/browser-defaults.ts', 'src/app/services/dom/elements/element-dimension.service.ts',
    'src/app/services/dom/input/button.manager.ts',
    'examples/material-showcase/node_modules/astylarui/package.json',
    'examples/material-showcase/node_modules/astylarui/dist/lib/app/config/browser-defaults.js',
    'examples/material-showcase/node_modules/astylarui/dist/lib/app/services/dom/elements/element-dimension.service.js',
    'examples/material-showcase/node_modules/astylarui/dist/lib/app/services/dom/input/button.manager.js'];
  const version = name => JSON.parse(readFileSync(`examples/material-showcase/node_modules/${name}/package.json`)).version;
  const report = { schemaVersion: 1, evidenceId: 'native-button-declared-box-sizing-public-proof',
    baselineCommit: 'a576a81131977ceb974d433995379dc27b0da46e', branch: 'codex/material-ui-showcase',
    classification: 'bounded-used-box-equivalence-despite-local-style-omission',
    command: 'npm --prefix examples/material-showcase test -- --watch=false --browsers=ChromeHeadless --include=src/app/button-box-sizing-input-audit.spec.ts',
    log: { file: logFile, sha256: hash(bytes), result: 'TOTAL: 6 SUCCESS',
      terminalHandleAvailableAtRecovery: false, processExitCodeRecovered: false },
    environment: { astylarui: version('astylarui'), angular: version('@angular/core'),
      material: version('@angular/material'), babylon: version('@babylonjs/core'), dpr: 1,
      canvasCssSize: [400, 180], font: 'Arial', settlement: 'reference document.fonts.ready then surface.whenSettled()',
      warning: 'NG0914: zoneless change detection with Zone.js loaded by Karma polyfills' },
    sourceFingerprints: files.map(file => ({ file, sha256: hash(readFileSync(file, 'utf8').replaceAll('\r\n', '\n')) })),
    ...proof, originalMaterialObservationsReclassified: 0, materialInputEquivalenceProven: false,
    scope, conclusion: 'An omitted local boxSizing field does not establish content-box consumption. In these six public native-button cases the final border box matches the native browser. No conclusion about auto/intrinsic Material sizing, whole-control rendering or other element defaults.' };
  const target = 'docs/material-button-box-sizing-public-proof.json', text = JSON.stringify(report, null, 2) + '\n';
  if (process.argv.includes('--check')) assert.equal(readFileSync(target, 'utf8'), text);
  else writeFileSync(target, text);
  console.log(JSON.stringify({ cases: proof.cases.length, rawRecords: proof.rawRecords, originalMaterialObservationsReclassified: 0, logSha256: hash(bytes) }));
}
