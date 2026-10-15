import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright-core';
import ts from 'typescript';
import { materialBrowserLaunchOptions, inspectMaterialBrowserLaunch } from '../tests/material-parity/run-checkpoint.mjs';

// Reuse the authenticated public margin runner. This diagnostic changes only
// the font ownership/context matrix, never the original capture or fixture.
const baseFile = 'scripts/audit-public-relative-margins.mjs';
const base = readFileSync(baseFile);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const baseSha256 = '58c335b85f8405bd807a4a7b023c8a889e52e817d5924d549121c6e6e5cb5474';
assert.equal(hash(base), baseSha256);
let source = base.toString().replaceAll('\r\n', '\n');
const replace = (before, after) => {
  assert.equal(source.split(before).length, 2, `Ambiguous runner recipe: ${before}`);
  source = source.replace(before, after);
};
replace("    const key = JSON.stringify([row.dpr, row.font, row.context, row.unit]);",
  "    const key = JSON.stringify([row.dpr, row.font, row.context, row.unit, row.own]);");
replace("    assert.ok(['block', 'flex'].includes(row.context) && ['em', 'px'].includes(row.unit));",
  "    assert.equal(row.context, 'block'); assert.equal(typeof row.own, 'boolean'); assert.ok(['em', 'px'].includes(row.unit));");
replace("  const summary = { blockEm: [], flexEm: [], pixelControls: 0 };",
  "  assert.deepEqual(report.sourceRecipe, recipe); const summary = { inheritedEm: [], ownEm: [], pixelControls: 0 };");
replace('      assert.equal(observation.site.styles[2].fontSize, `${row.font}px`);',
  '      assert.equal(observation.site.styles[1].fontSize, `${row.font}px`); assert.equal(observation.site.styles[2].fontSize, row.own ? `${row.font}px` : undefined);');
replace('    assert.equal(row.astylar.declared.fontSize, `${row.font}px`);',
  '    assert.equal(row.astylar.declared.fontSize, row.own ? `${row.font}px` : undefined);');
replace("    } else summary[row.context === 'block' ? 'blockEm' : 'flexEm'].push(observation);",
  "    } else summary[row.own ? 'ownEm' : 'inheritedEm'].push(observation);");
replace('  assert.equal(keys.size, 16); assert.equal(summary.pixelControls, 8);',
  '  assert.equal(keys.size, 16); assert.equal(summary.pixelControls, 8); assert.equal(summary.ownEm.length, 4); assert.equal(summary.inheritedEm.length, 4); assert.ok(summary.ownEm.every(row => Math.abs(row.error) < .5));');
replace("background:'#eeeeee'},", "background:'#eeeeee',fontSize:font+'px'},");
replace("fontSize:font+'px',fontFamily:'Arial, sans-serif',margin:",
  "...(query.get('own')==='1'?{fontSize:font+'px'}:{}),fontFamily:'Arial, sans-serif',margin:");
replace("for (const context of ['block', 'flex']) for (const unit of ['em', 'px'])",
  "for (const context of ['block']) for (const own of [false, true]) for (const unit of ['em', 'px'])");
replace('    const row = { dpr, font, context, unit };', '    const row = { dpr, font, context, unit, own };');
replace('&context=${context}&unit=${unit}`);', '&context=${context}&unit=${unit}&own=${own ? 1 : 0}`);');
replace('`${dpr}-${font}-${context}-${unit}-${mode}.png`', '`${dpr}-${font}-${context}-${own}-${unit}-${mode}.png`');
assert.equal(source.split('public-relative-margin-diagnostic').length, 3);
source = source.replaceAll('public-relative-margin-diagnostic', 'public-inherited-margin-diagnostic');
assert.equal(source.split('import.meta.filename').length, 3);
source = source.replaceAll('import.meta.filename', 'runnerFile');
replace('inputs, runtime, errors, results };', 'inputs, runtime, errors, results, sourceRecipe: recipe };');
const tree = ts.createSourceFile('margin-runner.mjs', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
assert.equal(tree.parseDiagnostics.length, 0);
const imports = tree.statements.filter(ts.isImportDeclaration);
assert.equal(imports.length, 8);
for (const declaration of imports.toReversed()) {
  source = source.slice(0, declaration.getFullStart()) + source.slice(declaration.end);
}
const recipe = { base: { file: baseFile, sha256: baseSha256 }, logicalRunnerSha256: hash(source),
  scope: 'Block em margins with inherited versus own16/24px font; eight pixel controls; DPR1/2. No Material or whole-case acceptance.' };
const run = new (Object.getPrototypeOf(async function () {}).constructor)(
  'assert', 'createHash', 'existsSync', 'mkdirSync', 'readFileSync', 'writeFileSync',
  'createRequire', 'createServer', 'path', 'chromium', 'materialBrowserLaunchOptions',
  'inspectMaterialBrowserLaunch', 'runnerFile', 'recipe', source);
await run(assert, createHash, existsSync, mkdirSync, readFileSync, writeFileSync,
  createRequire, createServer, path, chromium, materialBrowserLaunchOptions,
  inspectMaterialBrowserLaunch, import.meta.filename, recipe);
