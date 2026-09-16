import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { stripVTControlCharacters } from 'node:util';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const target = 'docs/material-gap-value-public-proof.json';
const modes = ['flex-row', 'flex-column', 'grid'];
const variants = { omitted: {}, normal: { gap: 'normal' }, zero: { gap: '0' },
  'one-pixel-value': { gap: '8px' }, 'two-pixel-values': { gap: '8px 16px' },
  'separate-longhands': { rowGap: '8px', columnGap: '16px' }, percentage: { gap: '10%' }, 'font-relative': { gap: '1em' } };
const ids = ['gap-host', 'gap-one', 'gap-two', 'gap-three', 'gap-four'];
const keys = modes.flatMap(m => Object.keys(variants).map(v => `${m}/${v}`)).sort();
const scope = 'Equal authored gap inputs and projected box geometry; not glyph raster or original Material cause.';
const toCss = styles => styles.map(({ selector, ...rules }) => `${selector}{${Object.entries(rules)
  .map(([name, value]) => `${name.replace(/[A-Z]/g, c => '-' + c.toLowerCase())}:${value}`).join(';')}}`).join('\n');

function expectedSite(mode, variant) {
  return { root: { children: [{ type: 'div', id: 'gap-host', children:
    ids.slice(1).map(id => ({ type: 'div', id, class: 'gap-item' })) }] }, styles: [
    { selector: '*', boxSizing: 'border-box', margin: '0', padding: '0', borderWidth: '0', fontSize: '20px' },
    { selector: '#gap-host', width: mode === 'flex-row' ? '70px' : '140px', height: mode === 'flex-column' ? '70px' : '90px',
      display: mode === 'grid' ? 'grid' : 'flex',
      ...(mode === 'grid' ? { gridTemplateColumns: '20px 20px', gridTemplateRows: '20px 20px' }
        : { flexDirection: mode === 'flex-row' ? 'row' : 'column', flexWrap: 'wrap',
          justifyContent: 'flex-start', alignItems: 'flex-start', alignContent: 'flex-start' }), ...variants[variant] },
    { selector: '.gap-item', width: '20px', height: '20px', flexShrink: '0', background: '#6750a4' },
  ] };
}

export function readGapValueProof(raw) {
  const log = stripVTControlCharacters(raw), terminal = log.match(/^TOTAL:.*$/gm);
  assert.deepEqual(terminal, ['TOTAL: 10 FAILED, 14 SUCCESS']);
  assert.doesNotMatch(log, /\bERROR\b/);
  const rows = log.split(/\r?\n/).filter(l => l.startsWith("INFO: 'MATERIAL_GAP_VALUE_PROOF', '"))
    .map(l => JSON.parse(l.slice(l.indexOf('{'), l.lastIndexOf('}') + 1)));
  const unique = new Map();
  for (const row of rows) {
    const key = `${row.mode}/${row.variant}`;
    if (unique.has(key)) assert.deepEqual(row, unique.get(key), 'contradictory repeated record');
    else unique.set(key, row);
  }
  assert.deepEqual([...unique.keys()].sort(), keys);
  const mismatches = [], failures = [];
  for (const key of keys) {
    const row = unique.get(key), { mode, variant } = row, site = expectedSite(mode, variant);
    assert.deepEqual(row.site, site); assert.equal(row.css, toCss(site.styles));
    assert.equal(row.scope, scope); assert.equal(row.dpr, 1); assert.match(row.userAgent, /HeadlessChrome\/152\.0\.0\.0/);
    assert.deepEqual(row.diagnostics, []); assert.deepEqual(row.observations.map(o => o.id), ids);
    const width = mode === 'flex-row' ? 70 : 140, height = mode === 'flex-column' ? 70 : 90;
    const [rg, cg] = variant === 'percentage' ? [height * .1, width * .1] : variant === 'font-relative' ? [20, 20]
      : ['two-pixel-values', 'separate-longhands'].includes(variant) ? [8, 16] : variant === 'one-pixel-value' ? [8, 8] : [0, 0];
    const keyword = ['omitted', 'normal'].includes(variant);
    assert.deepEqual(row.browserGap, { rowGap: keyword ? 'normal' : variant === 'percentage' ? '10%' : `${rg}px`,
      columnGap: keyword ? 'normal' : variant === 'percentage' ? '10%' : `${cg}px`, fontSize: '20px' });
    for (const stage of [row.normal, row.effective]) {
      assert.ok(stage);
      for (const property of ['gap', 'rowGap', 'columnGap']) assert.equal(stage[property], variants[variant][property]);
      for (const [p, v] of Object.entries(site.styles[1])) assert.equal(stage[p], v);
      assert.equal(stage.fontSize, '20px');
    }
    const perLine = mode === 'grid' ? 2 : mode === 'flex-row' ? Math.floor((width + cg) / (20 + cg)) : Math.floor((height + rg) / (20 + rg));
    const referenceBoxes = [{ x: 0, y: 0, width, height }, ...Array.from({ length: 4 }, (_, i) => ({
      x: (mode === 'flex-column' ? Math.floor(i / perLine) : i % perLine) * (20 + cg),
      y: (mode === 'flex-column' ? i % perLine : Math.floor(i / perLine)) * (20 + rg), width: 20, height: 20 }))];
    row.observations.forEach((o, i) => {
      assert.deepEqual(o.reference, referenceBoxes[i]);
      for (const p of ['x', 'y', 'width', 'height']) {
        assert.ok(Number.isFinite(o.actual[p]));
        const error = Math.abs(o.actual[p] - o.reference[p]);
        if (error >= .5) {
          mismatches.push({ case: key, element: o.id, property: p, reference: o.reference[p], actual: o.actual[p], error });
          failures.push(`${key}/${o.id}/${p}: actual=${o.actual[p]}, reference=${o.reference[p]}: Expected ${error} to be less than 0.5.`);
        }
      }
    });
  }
  assert.equal(mismatches.length, 34);
  const failedCases = [...new Set(mismatches.map(m => m.case))].sort();
  assert.deepEqual(failedCases, [...modes.flatMap(m => ['two-pixel-values', 'percentage', 'font-relative'].map(v => `${m}/${v}`)),
    'flex-column/separate-longhands'].sort());
  assert.deepEqual(log.split(/\r?\n/).map(l => l.trim()).filter(l => l.includes('Expected ')).sort(), failures.sort(),
    'input, lifecycle and diagnostic failures must not be hidden among geometry failures');
  return { rawRecords: rows.length, cases: keys.map(k => unique.get(k)), failedCases, mismatches };
}

function sourceMethod(file, className, name) {
  const text = readFileSync(file, 'utf8'), source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const classes = source.statements.filter(n => ts.isClassDeclaration(n) && n.name?.text === className); assert.equal(classes.length, 1);
  const methods = classes[0].members.filter(n => ts.isMethodDeclaration(n) && n.name?.getText(source) === name); assert.equal(methods.length, 1);
  const method = methods[0], code = `function probe(${method.parameters.map(p => p.getText(source)).join(',')}) ${method.body.getText(source)}`;
  const javascript = ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  return { method: name, file, line: source.getLineAndCharacterOfPosition(method.getStart(source)).line + 1,
    sha256: hash(method.getText(source).replaceAll('\r\n', '\n')), invoke: new Function(javascript + '\nreturn probe;')() };
}

export function buildGapValueProof() {
  const logs = ['browser-proof.log', 'browser-proof-repeat.log'].map(name => {
    const file = `artifacts/material-parity/gap-value-input-audit/${name}`, bytes = readFileSync(file);
    return { file, sha256: hash(bytes), bytes: bytes.length, proof: readGapValueProof(bytes.toString()) };
  });
  assert.deepEqual(logs[0].proof, logs[1].proof, 'repeat inputs and geometry must be identical');
  const consumers = [['flex', 'FlexService', 'parseGapProperties'], ['grid', 'GridService', 'parseLength'],
    ['flex-layout', 'FlexLayoutService', 'alignContentFlexStart']].map(([file, className, method]) => {
    const source = sourceMethod(`src/app/services/dom/elements/${file}.service.ts`, className, method);
    const installed = sourceMethod(`examples/material-showcase/node_modules/astylarui/dist/lib/app/services/dom/elements/${file}.service.js`, className, method);
    const records = logs[0].proof.cases.map(row => {
      const evaluate = implementation => file === 'flex' ? implementation(row.effective) : file === 'grid'
        ? { rowGap: implementation(row.effective.rowGap ?? row.effective.gap), columnGap: implementation(row.effective.columnGap ?? row.effective.gap) }
        : implementation([{ crossSize: 20 }, { crossSize: 20 }], { ...row.effective, rowGap: 8, columnGap: 16 }).map(l => l.crossOffset);
      const result = evaluate(source.invoke); assert.deepEqual(evaluate(installed.invoke), result);
      return { case: `${row.mode}/${row.variant}`, result };
    });
    const { invoke: _, ...sourceDescriptor } = source, { invoke: __, ...installedDescriptor } = installed;
    return { source: sourceDescriptor, installed: installedDescriptor, records,
      scope: 'Execution of unchanged extracted method bodies; source diagnostic, not a live internal runtime trace.' };
  });
  const buildFile = 'artifacts/material-parity/gap-value-input-audit/build.log', buildBytes = readFileSync(buildFile);
  assert.match(buildBytes.toString(), /Application bundle generation complete/);
  assert.match(buildBytes.toString(), /Prerendered 2 static routes/);
  assert.doesNotMatch(buildBytes.toString(), /\bERROR\b|\bWARNING\b/);
  const files = ['scripts/audit-material-gap-value-proof.mjs', 'scripts/check-material-gap-value-proof.mjs',
    'examples/material-showcase/src/app/gap-value-input-audit.spec.ts',
    'examples/material-showcase/angular.json', 'examples/material-showcase/src/styles.scss',
    'docs/compatibility/capabilities.json', 'examples/material-showcase/node_modules/astylarui/package.json',
    ...consumers.flatMap(c => [c.source.file, c.installed.file])];
  const version = name => JSON.parse(readFileSync(`examples/material-showcase/node_modules/${name}/package.json`)).version;
  return { schemaVersion: 1, kind: 'gap-value-equal-input-public-proof',
    baselineCommit: '91e141a7e346c926eea9d496d24a472e155c4f39', branch: 'codex/material-ui-showcase',
    command: 'npm --prefix examples/material-showcase test -- --watch=false --browsers=ChromeHeadless --include=src/app/gap-value-input-audit.spec.ts --progress=false',
    logs: logs.map(({ proof, ...receipt }, i) => ({ ...receipt, terminalSession: i === 0 ? 5257 : 81036, exitCode: 1, failed: 10, passed: 14 })),
    build: { file: buildFile, sha256: hash(buildBytes), bytes: buildBytes.length, terminalSession: 49389, exitCode: 0,
      command: 'npm --prefix examples/material-showcase run build -- --output-path=dist/material-gap-value-audit',
      scope: 'Separate application build; frozen reference server output is not replaced. Test compilation is proven by the two browser runs.' },
    environment: { astylarui: version('astylarui'), angular: version('@angular/core'), babylon: version('@babylonjs/core'),
      dpr: 1, canvasCssSize: [640, 360], settlement: 'surface.whenSettled(); empty boxes need no font asset',
      acceptedWarning: 'NG0914: zoneless tests with existing Zone.js Karma polyfills' },
    sourceFingerprints: files.map(file => ({ file, sha256: hash(readFileSync(file, 'utf8').replaceAll('\r\n', '\n')) })),
    ...logs[0].proof, consumers, classification: 'confirmed-core-css-gap-behavior-discrepancies',
    originalMaterialCauseProven: false, originalObservationsReclassified: 0,
    limits: ['Typed public inputs only; loaded stylesheet translation is not exercised.',
      'Repeated DPR1 empty-box geometry, not raster, full unit grammar, dynamic updates or original Material causality.',
      'Catalog groups flex gap with a compatible supported-length/shorthand subset and lists percent/em units; exact per-property grammar is not separately specified.',
      'Source execution supports ownership diagnosis without a corrective intervention or live internal trace.'],
    implementationOrder: ['Resolve two-value gap shorthand and CSS units in core CSS-space used-value calculation shared by flex/grid consumers.',
      'Select cross-line gap by flex direction rather than always using rowGap.',
      'Keep these exact paired inputs; do not repair Material examples by expanding values, replacing units or changing direction.',
      'Extend reverse axes, padding/percent bases, intrinsic/cyclic percentages, updates and DPR before broad compatibility claims.'] };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2); assert.ok(!args.length || args.length === 1 && args[0] === '--check');
  const report = buildGapValueProof(), output = JSON.stringify(report, null, 2) + '\n';
  if (args[0] === '--check') assert.equal(readFileSync(target, 'utf8').replaceAll('\r\n', '\n'), output);
  else writeFileSync(target, output);
  console.log(JSON.stringify({ cases: report.cases.length, failed: report.failedCases.length, propertyFailures: report.mismatches.length,
    repeatIdentical: true, originalObservationsReclassified: 0 }));
}
