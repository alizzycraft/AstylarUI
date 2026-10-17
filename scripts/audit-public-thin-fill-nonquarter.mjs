import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright-core';
import ts from 'typescript';
import { materialBrowserLaunchOptions, inspectMaterialBrowserLaunch } from '../tests/material-parity/run-checkpoint.mjs';

// The quarter-phase proof cannot distinguish continuous area from sample-grid
// coverage at the newly observed Material contact phase. Reuse it,not a new
// harness. Grid-aligned CSS fractions isolate paint from layout quantization;
// the measured Material .546875/.559997 geometry difference remains recorded.
const parentFile = 'scripts/audit-public-thin-fill-phase.mjs';
const parent = readFileSync(parentFile);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const parentSha256 = '75e7055e910c8210d9771a730345ab415fed55082b4c119c271a1d37b1e8a4b4';
assert.equal(hash(parent), parentSha256);
let source = parent.toString().replaceAll('\r\n', '\n');
const replace = (before, after) => {
  assert.equal(source.split(before).length, 2, `Ambiguous nonquarter recipe:${before}`);
  source = source.replace(before, after);
};
replace('assert.ok([0, .25, .5, .75].includes(row.phase))', 'assert.ok([0, .546875, .5625, .875].includes(row.phase))');
replace('for (const phase of [0, .25, .5, .75])', 'for (const phase of [0, .546875, .5625, .875])');
replace("'public-thin-fill-phase-diagnostic'", "'public-thin-fill-nonquarter-diagnostic'");
replace('phases0/.25/.5/.75', 'phases0/.546875/.5625/.875');
replace('const recipe = { base:', `const recipe = { parent: ${JSON.stringify({ file: parentFile, sha256: parentSha256 })}, base:`);
const ast = ts.createSourceFile('nonquarter-runner.mjs', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
assert.equal(ast.parseDiagnostics.length, 0);
const ranges = ast.statements.filter(ts.isImportDeclaration).map(node => ({ start: node.getFullStart(), end: node.end, replacement: '' }));
assert.equal(ranges.length, 9);
let metas = 0;
function visit(node) {
  if (ts.isPropertyAccessExpression(node) && node.getText(ast) === 'import.meta.filename') {
    ranges.push({ start: node.getStart(ast), end: node.end, replacement: 'outerRunnerFile' }); metas++;
  }
  ts.forEachChild(node, visit);
}
visit(ast); assert.equal(metas, 1);
for (const range of ranges.sort((a, b) => b.start - a.start))
  source = source.slice(0, range.start) + range.replacement + source.slice(range.end);
const run = new (Object.getPrototypeOf(async function () {}).constructor)(
  'assert', 'createHash', 'existsSync', 'mkdirSync', 'readFileSync', 'writeFileSync',
  'createRequire', 'createServer', 'path', 'chromium', 'ts', 'materialBrowserLaunchOptions',
  'inspectMaterialBrowserLaunch', 'outerRunnerFile', source);
await run(assert, createHash, existsSync, mkdirSync, readFileSync, writeFileSync,
  createRequire, createServer, path, chromium, ts, materialBrowserLaunchOptions,
  inspectMaterialBrowserLaunch, import.meta.filename);
