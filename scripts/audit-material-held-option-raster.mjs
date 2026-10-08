import assert from 'node:assert/strict';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import { chromium } from 'playwright-core';
import { PNG } from 'pngjs';
import { fingerprintDirectory, materialBrowserLaunchOptions } from '../tests/material-parity/run-checkpoint.mjs';

// Diagnostic extension of the existing held-input protocol, not a replacement
// acceptance test. No fixture, CSS, render state or ripple clock is injected.
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
assert.ok(process.argv.length === 2 || process.argv.length === 4);
const profile = process.argv.length === 2 ? 'dark' : process.argv[2].replace(/^--profile=/, '');
const dpr = process.argv.length === 2 ? 2 : Number(process.argv[3].replace(/^--dpr=/, ''));
assert.ok(['light', 'dark', 'contrast', 'custom'].includes(profile) && [1, 2].includes(dpr));
const file = 'tests/material-parity/sort-focus-structure.spec.mjs';
const bytes = readFileSync(file);
assert.equal(hash(bytes), '4a386f107cee16cb120910717a42b6ee9b40c724f02860b68a60ce29d4784f30');
const ast = ts.createSourceFile(file, bytes.toString(), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const helper = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'withFrozenShowcase').getText(ast);
assert.equal(hash(helper), '603ac9ca88b9bf2e3443f8be65f125d39002e1ca4e5157487d9ac86ed7d2527f');
const frozen = new Function('assert', 'path', 'readFileSync', 'fingerprintDirectory', 'createServer', 'existsSync', 'chromium',
  `${helper};return withFrozenShowcase;`)(assert, path, readFileSync, fingerprintDirectory, createServer, existsSync, chromium);
const original = ast.statements.find(n => ts.isExpressionStatement(n) && ts.isCallExpression(n.expression)
  && n.expression.expression.getText(ast) === 'test'
  && n.expression.arguments[0].text === 'held popup option boundaries capture active paint inputs before commit');
assert.ok(original);
const callback = original.expression.arguments[1];
const runnerFile = 'tests/material-parity/run-material-parity.mjs';
const runner = readFileSync(runnerFile);
assert.equal(hash(runner), 'e01ef9dc44386d93885ca06428da0b8b42ccb8bad37f9de99bdd61a5c95c6eb0');
const runnerAst = ts.createSourceFile(runnerFile, runner.toString(), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const actionSource = ['profileTheme', 'sendShowcaseCommand', 'waitForThemeApplied'].map(name =>
  runnerAst.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === name).getText(runnerAst)).join('\n');
const actions = new Function('assert', `${actionSource};return {profileTheme,sendShowcaseCommand,waitForThemeApplied};`)(assert);
let source = callback.getText(ast);
const replaceOnce = (before, after) => {
  assert.equal(source.split(before).length, 2, `unique diagnostic extension: ${before}`);
  source = source.replace(before, after);
};
replaceOnce('deviceScaleFactor: 1', `deviceScaleFactor: ${dpr}, colorScheme: '${profile === 'dark' ? 'dark' : 'light'}', reducedMotion: 'reduce'`);
replaceOnce('benchmark=1&profile=light', `benchmark=1&profile=${profile}`);
replaceOnce("await page.locator('.frame').waitFor();", `await page.locator('.frame').waitFor();
        await actions.sendShowcaseCommand(page, { type: 'showcase:theme', theme: actions.profileTheme('${profile}') });
        await actions.waitForThemeApplied(page, actions.profileTheme('${profile}'));`);
replaceOnce('await page.mouse.down();', 'const heldStart = performance.now();\n        await page.mouse.down();');
replaceOnce('observations.push({ family, mode, target, held });', `
        const measuredAtMs = performance.now() - heldStart;
        const screenshotFile = path.join(output, family + '-' + mode + '.png');
        const captureStartMs = performance.now() - heldStart;
        const pixels = await page.screenshot({ path: screenshotFile, caret: 'initial', animations: 'allow' });
        const captureEndMs = performance.now() - heldStart;
        const png = PNG.sync.read(pixels), sampleRgb = [];
        for (const dx of [-100, -20, 0, 20, 100]) {
          const x = Math.round((target.x + dx) * ${dpr}), y = Math.round(target.y * ${dpr});
          assert.ok(x >= 0 && y >= 0 && x < png.width && y < png.height);
          const i = (y * png.width + x) * 4;
          sampleRgb.push({ dxCss: dx, rgb: [...png.data.subarray(i, i + 3)] });
        }
        observations.push({ family, mode, target, held, measuredAtMs, captureStartMs, captureEndMs,
          screenshot: { file: screenshotFile, sha256: hash(pixels) }, sampleRgb });`);
replaceOnce('}, {}, { checkpointFile:', '}, materialBrowserLaunchOptions(), { checkpointFile:');
replaceOnce("light desktop DPR1 only; not matched-time local-raster equivalence or ripple animation parity.",
  `${profile} desktop DPR${dpr} diagnostic with real held raster and elapsed brackets; not matched-time ripple animation, equal inputs or full-case parity.`);
const output = path.resolve(`artifacts/material-parity/held-option-${profile}-dpr${dpr}-20261008`);
assert.ok(!existsSync(output), 'new diagnostic directory required; never overwrite retained captures');
mkdirSync(output);
const execute = new Function('withFrozenShowcase', 'assert', 'path', 'PNG', 'hash', 'output', 'materialBrowserLaunchOptions', 'actions',
  `return (${source});`)(frozen, assert, path, PNG, hash, output, materialBrowserLaunchOptions, actions);
console.log(JSON.stringify({ profile, dpr, scriptSha256: hash(readFileSync('scripts/audit-material-held-option-raster.mjs')),
  sourceFile: file, sourceSha256: hash(bytes), helperSha256: hash(helper),
  runnerSha256: hash(runner), actionBodiesSha256: hash(actionSource), originalCallbackSha256: hash(callback.getText(ast)),
  diagnosticCallbackSha256: hash(source), output, acceptance: false }));
await execute({ diagnostic: text => console.log(text) });
console.log(JSON.stringify({ result: 'PASS', pairs: 3, screenshots: 6, acceptance: false }));
