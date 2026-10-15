import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright-core';
import ts from 'typescript';
import { materialBrowserLaunchOptions, inspectMaterialBrowserLaunch } from '../tests/material-parity/run-checkpoint.mjs';

// Isolate the demonstrated missing paint control, not another Material matrix.
// The original margin runner/captures are immutable; every recipe edit is exact.
const baseFile = 'scripts/audit-public-relative-margins.mjs';
const base = readFileSync(baseFile);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const baseSha256 = '58c335b85f8405bd807a4a7b023c8a889e52e817d5924d549121c6e6e5cb5474';
assert.equal(hash(base), baseSha256);
let source = base.toString().replaceAll('\r\n', '\n');
const replace = (before, after) => {
  assert.equal(source.split(before).length, 2, `Ambiguous thin-fill recipe: ${before}`);
  source = source.replace(before, after);
};
replace('  assert.equal(report.results.length, 16);', '  assert.deepEqual(report.sourceRecipe, recipe); assert.equal(report.results.length, 8);');
replace('    const key = JSON.stringify([row.dpr, row.font, row.context, row.unit]);',
  '    const key = JSON.stringify([row.dpr, row.phase]); assert.ok([0, .25, .5, .75].includes(row.phase));');
replace("    assert.ok(['block', 'flex'].includes(row.context) && ['em', 'px'].includes(row.unit));",
  "    assert.equal(row.context, 'block'); assert.equal(row.unit, 'px'); assert.equal(row.font, 16);");
replace("  const summary = { blockEm: [], flexEm: [], pixelControls: 0 };",
  "  const summary = { blockEm: [], flexEm: [], pixelControls: 0, phaseGeometry: [] };");
replace("      assert.equal(observation.site.styles[2].margin, row.unit === 'em' ? '1em 0' : `${row.font}px 0`);",
  "      assert.equal(observation.site.styles[2].margin, '0'); assert.equal(observation.site.styles[2].top, (60 + row.phase) + 'px'); assert.equal(observation.site.styles[2].height, '1px');");
replace('    assert.equal(row.reference.computed.marginTop, `${row.font}px`);', "    assert.equal(row.reference.computed.marginTop, '0px');");
replace("    assert.equal(row.astylar.declared.margin, row.unit === 'em' ? '1em 0' : `${row.font}px 0`);",
  "    assert.equal(row.astylar.declared.margin, '0');");
replace("    assert.ok(Math.abs(offset('reference') - (20 + row.font)) < .01);",
  "    assert.ok(Math.abs(offset('reference') - (60 + row.phase)) < .01); summary.phaseGeometry.push({dpr:row.dpr,phase:row.phase,reference:row.reference.bounds.child,candidate:row.astylar.bounds.child});");
replace("< .5, `Pixel control", "< .01, `Pixel control");
replace('  assert.equal(keys.size, 16); assert.equal(summary.pixelControls, 8);', '  assert.equal(keys.size, 8); assert.equal(summary.pixelControls, 8);');
replace("unit=query.get('unit');", "unit=query.get('unit'),phase=Number(query.get('phase'));");
replace("height:'24px',fontSize:", "height:'1px',position:'absolute',left:'20px',top:(60+phase)+'px',fontSize:");
replace("margin:unit==='em'?'1em 0':font+'px 0',", "margin:'0',");
replace("for (const font of [16, 24]) for (const context of ['block', 'flex']) for (const unit of ['em', 'px'])",
  "for (const phase of [0, .25, .5, .75]) for (const font of [16]) for (const context of ['block']) for (const unit of ['px'])");
replace('    const row = { dpr, font, context, unit };', '    const row = { dpr, font, context, unit, phase };');
replace('&context=${context}&unit=${unit}`);', '&context=${context}&unit=${unit}&phase=${phase}`);');
replace('`${dpr}-${font}-${context}-${unit}-${mode}.png`', '`${dpr}-${phase}-${mode}.png`');
assert.equal(source.split('public-relative-margin-diagnostic').length, 3);
source = source.replaceAll('public-relative-margin-diagnostic', 'public-thin-fill-phase-diagnostic');
assert.equal(source.split('import.meta.filename').length, 3);
source = source.replaceAll('import.meta.filename', 'runnerFile');
replace('inputs, runtime, errors, results };', 'inputs, runtime, errors, results, sourceRecipe: recipe };');
const tree = ts.createSourceFile('thin-fill-runner.mjs', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
assert.equal(tree.parseDiagnostics.length, 0);
const imports = tree.statements.filter(ts.isImportDeclaration);
assert.equal(imports.length, 8);
for (const declaration of imports.toReversed()) source = source.slice(0, declaration.getFullStart()) + source.slice(declaration.end);
const recipe = { base: { file: baseFile, sha256: baseSha256 }, logicalRunnerSha256: hash(source),
  scope: 'Equal opaque1CSSpx fill at phases0/.25/.5/.75,DPR1/2;integer controls and strict paired geometry. Not Material or raster acceptance.' };
const run = new (Object.getPrototypeOf(async function () {}).constructor)(
  'assert', 'createHash', 'existsSync', 'mkdirSync', 'readFileSync', 'writeFileSync',
  'createRequire', 'createServer', 'path', 'chromium', 'materialBrowserLaunchOptions',
  'inspectMaterialBrowserLaunch', 'runnerFile', 'recipe', source);
await run(assert, createHash, existsSync, mkdirSync, readFileSync, writeFileSync,
  createRequire, createServer, path, chromium, materialBrowserLaunchOptions,
  inspectMaterialBrowserLaunch, import.meta.filename, recipe);
