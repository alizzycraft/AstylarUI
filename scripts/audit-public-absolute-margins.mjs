import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright-core';
import ts from 'typescript';
import { materialBrowserLaunchOptions, inspectMaterialBrowserLaunch } from '../tests/material-parity/run-checkpoint.mjs';

// Reuse the public margin runner, not a second mounting or projection system.
// This is an absolute-position diagnostic, not the original Material recipe.
const baseFile = 'scripts/audit-public-relative-margins.mjs';
const base = readFileSync(baseFile);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const baseSha256 = '58c335b85f8405bd807a4a7b023c8a889e52e817d5924d549121c6e6e5cb5474';
assert.equal(hash(base), baseSha256);
let source = base.toString().replaceAll('\r\n', '\n');
const replace = (before, after) => {
  assert.equal(source.split(before).length, 2, `Ambiguous absolute-margin recipe: ${before}`);
  source = source.replace(before, after);
};
replace('  assert.equal(report.results.length, 16);', '  assert.equal(report.results.length, 8);');
replace("  const summary = { blockEm: [], flexEm: [], pixelControls: 0 };",
  "  assert.deepEqual(report.sourceRecipe, recipe); const summary = { blockEm: [], flexEm: [], pixelControls: 0 };");
replace("    assert.ok(['block', 'flex'].includes(row.context) && ['em', 'px'].includes(row.unit));",
  "    assert.equal(row.context, 'block'); assert.ok(['em', 'px'].includes(row.unit));");
replace("{selector:'#child',display:'block',width:'80px'",
  "{selector:'#child',position:'absolute',left:'0px',top:'0px',display:'block',width:'80px'");
replace("      assert.equal(observation.site.styles[2].fontSize, `${row.font}px`);",
  "      assert.equal(observation.site.styles[2].fontSize, `${row.font}px`); assert.equal(observation.site.styles[2].position, 'absolute'); assert.equal(observation.site.styles[2].top, '0px');");
replace("    assert.ok(Math.abs(offset('reference') - (20 + row.font)) < .01);",
  "    assert.ok(Math.abs(offset('reference') - row.font) < .01, 'Absolute child margin starts at containing-block padding edge, not content edge');");
replace('  assert.equal(keys.size, 16); assert.equal(summary.pixelControls, 8);',
  '  assert.equal(keys.size, 8); assert.equal(summary.pixelControls, 4); assert.equal(summary.blockEm.length, 4); assert.deepEqual(summary.flexEm, []);');
replace("for (const context of ['block', 'flex']) for (const unit of ['em', 'px'])",
  "for (const context of ['block']) for (const unit of ['em', 'px'])");
assert.equal(source.split('public-relative-margin-diagnostic').length, 3);
source = source.replaceAll('public-relative-margin-diagnostic', 'public-absolute-margin-diagnostic');
assert.equal(source.split('import.meta.filename').length, 3);
source = source.replaceAll('import.meta.filename', 'runnerFile');
replace('inputs, runtime, errors, results };', 'inputs, runtime, errors, results, sourceRecipe: recipe };');
const tree = ts.createSourceFile('absolute-margin-runner.mjs', source, 99, true, ts.ScriptKind.JS);
assert.equal(tree.parseDiagnostics.length, 0);
const imports = tree.statements.filter(ts.isImportDeclaration);
assert.equal(imports.length, 8);
for (const declaration of imports.toReversed())
  source = source.slice(0, declaration.getFullStart()) + source.slice(declaration.end);
const recipe = { base: { file: baseFile, sha256: baseSha256 }, logicalRunnerSha256: hash(source),
  scope: 'Absolute child with explicit own16/24px font and1em versus pixel margins; padded block containing block,DPR1/2. Not Material placement,inheritance,collapse or full parity.' };
const run = new (Object.getPrototypeOf(async function () {}).constructor)(
  'assert', 'createHash', 'existsSync', 'mkdirSync', 'readFileSync', 'writeFileSync',
  'createRequire', 'createServer', 'path', 'chromium', 'materialBrowserLaunchOptions',
  'inspectMaterialBrowserLaunch', 'runnerFile', 'recipe', source);
await run(assert, createHash, existsSync, mkdirSync, readFileSync, writeFileSync,
  createRequire, createServer, path, chromium, materialBrowserLaunchOptions,
  inspectMaterialBrowserLaunch, import.meta.filename, recipe);
