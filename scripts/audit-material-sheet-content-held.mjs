import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import { chromium } from 'playwright-core';
import { fingerprintDirectory, materialBrowserLaunchOptions } from '../tests/material-parity/run-checkpoint.mjs';
import { captureBrowserInputTree } from '../tests/material-parity/input-tree-evidence.mjs';

// Reuse the owning held-content protocol without changing its frozen producer.
// This closes the missing actual sheet-action boundary, not raster acceptance.
const hash = value => createHash('sha256').update(value).digest('hex');
assert.ok(process.argv.slice(2).every(argument => ['--hover-only', '--describe'].includes(argument)));
const hoverOnly = process.argv.includes('--hover-only');
const file = 'tests/material-parity/sort-focus-structure.spec.mjs';
const bytes = readFileSync(file);
assert.equal(hash(bytes), '1afa971226301b8c6f01e3923099a0889ff1e4924a95da412f974217a85f0583');
const ast = ts.createSourceFile(file, bytes.toString(), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const helper = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'withFrozenShowcase').getText(ast);
assert.equal(hash(helper), '603ac9ca88b9bf2e3443f8be65f125d39002e1ca4e5157487d9ac86ed7d2527f');
const frozen = new Function('assert', 'path', 'readFileSync', 'fingerprintDirectory', 'createServer', 'existsSync', 'chromium',
  `${helper}; return withFrozenShowcase;`)(assert, path, readFileSync, fingerprintDirectory, createServer, existsSync, chromium);
const owningTest = ast.statements.find(node => ts.isExpressionStatement(node) && ts.isCallExpression(node.expression)
  && node.expression.expression.getText(ast) === 'test'
  && node.expression.arguments[0].text === 'held popup option boundaries capture active paint inputs before commit');
assert.ok(owningTest);
const original = owningTest.expression.arguments[1].getText(ast);
let source = original;
const replaceOnce = (before, after) => {
  assert.equal(source.split(before).length, 2, `exact single diagnostic extension: ${before}`);
  source = source.replace(before, after);
};
replaceOnce("process.env.ASTYLAR_AUDIT_CURRENT_OPTION_BOXES === '1'", 'true');
replaceOnce("process.env.ASTYLAR_AUDIT_HELD_CONTENT === '1'", 'true');
const targetStart = source.indexOf("        ['datepicker', 'datepicker-icon'");
const targetEnd = source.indexOf("      ]) for (const mode", targetStart);
assert.ok(targetStart >= 0 && targetEnd > targetStart);
source = source.slice(0, targetStart) +
  "        ['bottom-sheet', 'bottom-sheet-primary', 'bottom-sheet-dismiss', '#bottom-sheet-primary', 'a[mat-list-item]:nth-child(1)'],\n" +
  "        ['bottom-sheet', 'bottom-sheet-primary', 'bottom-sheet-copy', '#bottom-sheet-primary', 'a[mat-list-item]:nth-child(2)'],\n" + source.slice(targetEnd);
replaceOnce("hit?.closest('button')", "hit?.closest('a[mat-list-item]')");
replaceOnce("node.type === 'button' &&", "node.type === 'a' &&");
replaceOnce("}, {}, { checkpointFile: currentOptionBoxes", "}, materialBrowserLaunchOptions(), { checkpointFile: currentOptionBoxes");
const assertionsStart = source.indexOf('      assert.equal(observations.length, 6);');
const assertionsEnd = source.indexOf('      return;', assertionsStart);
assert.ok(assertionsStart >= 0 && assertionsEnd > assertionsStart);
source = source.slice(0, assertionsStart) + `
      assert.equal(observations.length, 4);
      for (const targetId of ['bottom-sheet-dismiss', 'bottom-sheet-copy']) {
        const pair = observations.filter(row => row.targetId === targetId);
        assert.deepEqual(pair.map(row => row.mode), ['reference', 'astylar']);
        assert.equal(pair[0].held.attributes.href, '#');
        assert.equal(pair[0].held.text, targetId === 'bottom-sheet-dismiss' ? 'Share' : 'Copy link');
        assert.ok(pair[0].held.statePaint.length > 0);
      }
      t.diagnostic(JSON.stringify({ browser: browser.version(), observations: 4,
        claim: 'Real held Share/Copy link requested paint and owner evidence; light desktop DPR1 only. No hover-only, matched-time raster, equal-input or whole-case acceptance.' }));
` + source.slice(assertionsEnd);
if (hoverOnly) {
  replaceOnce('await page.mouse.move(target.x, target.y); await page.mouse.down(); await page.waitForTimeout(125);',
    'await page.mouse.move(target.x, target.y); await page.waitForTimeout(125);');
  replaceOnce("active: owner?.matches(':active'),", "active: owner?.matches(':active'), hovered: owner?.matches(':hover'),");
  replaceOnce("events.filter(event => event.type === 'pointerdown').at(-1)",
    "events.filter(event => event.type === 'pointermove').at(-1)");
  replaceOnce("assert.equal(held.active, true, 'actual native content owns held pointer');",
    "{ assert.equal(held.active, false, 'hover-only must not press native content'); assert.equal(held.hovered, true, 'native action is hovered'); }");
  replaceOnce("'Real held Share/Copy link requested paint and owner evidence; light desktop DPR1 only. No hover-only, matched-time raster, equal-input or whole-case acceptance.'",
    "'Real hover-only Share/Copy link requested paint and pointer-move owner evidence; light desktop DPR1 only. No held, matched-time raster, equal-input or whole-case acceptance.'");
}
const checkpointFile = 'artifacts/material-parity/selection-pointer-directions-20261011/checkpoint/manifest.json';
assert.equal(hash(readFileSync(checkpointFile)), '2aac425d216cdb274ebff0876f2fa365c9ab6e845ed1b1c3b30d9e1bbcaea5c8');
const execute = new Function('withFrozenShowcase', 'assert', 'captureBrowserInputTree', 'materialBrowserLaunchOptions',
  `return (${source});`)(frozen, assert, captureBrowserInputTree, materialBrowserLaunchOptions);
console.log(JSON.stringify({ sourceFile: file, sourceSha256: hash(bytes), helperSha256: hash(helper),
  originalCallbackSha256: hash(original), diagnosticCallbackSha256: hash(source),
  scriptSha256: hash(readFileSync('scripts/audit-material-sheet-content-held.mjs')),
  checkpointFile, checkpointSha256: hash(readFileSync(checkpointFile)), hoverOnly, acceptance: false }));
if (!process.argv.includes('--describe')) {
  await execute({ diagnostic: value => console.log(value) });
  assert.equal(hash(readFileSync(file)), hash(bytes), 'source remains frozen');
  console.log(JSON.stringify({ result: 'PASS', pairs: 2, hoverOnly, acceptance: false }));
}
