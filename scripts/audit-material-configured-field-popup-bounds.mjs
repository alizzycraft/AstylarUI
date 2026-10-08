import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { chromium } from 'playwright-core';
import { materialInteractionCases } from '../tests/material-parity/benchmark.config.mjs';
import { interactionLayerCursorProbe } from '../tests/material-parity/cursor-metrics.mjs';
import { captureBrowserInputTree } from '../tests/material-parity/input-tree-evidence.mjs';
import { propertyGroups } from '../tests/material-parity/input-equivalence-policy.mjs';
import { fingerprintDirectory, materialBrowserLaunchOptions, materialCaseKey } from '../tests/material-parity/run-checkpoint.mjs';
import { openSupplementalCapture, parseSupplementalCaptureArguments } from '../tests/material-parity/supplemental-capture-evidence.mjs';

// Close exactly80 missing configured field-popup endpoint bounds observations.
// Reuse authenticated runner actions; do not change fixtures or acceptance gates.
const args = process.argv.slice(2), root = path.resolve('examples/material-showcase/dist/material-showcase/browser');
assert.equal(args.length, 2);
const checkpoint = args.find(a => a.startsWith('--checkpoint=')); assert.ok(checkpoint);
const manifest = JSON.parse(readFileSync(path.join(checkpoint.slice(13), 'manifest.json')));
assert.deepEqual(fingerprintDirectory(root), manifest.provenance.browserFiles);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const runnerFile = 'tests/material-parity/run-material-parity.mjs', runner = readFileSync(runnerFile);
assert.equal(hash(runner), manifest.provenance.harnessFiles.find(f => f.file === runnerFile).sha256);
const ast = ts.createSourceFile(runnerFile, runner.toString(), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const cursorFile = 'tests/material-parity/cursor-metrics.mjs';
assert.equal(hash(readFileSync(cursorFile)), manifest.provenance.harnessFiles.find(f => f.file === cursorFile).sha256);
const names = ['profileTheme', 'sendShowcaseCommand', 'waitForThemeApplied', 'settleInteraction', 'popupHoverBox', 'popupOptionBox', 'interactionTargetBox', 'performInteraction'];
const functions = names.map(name => {
  const matches = ast.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
  assert.equal(matches.length, 1); return matches[0].getText(ast);
});
const actions = new Function('assert', 'interactionLayerCursorProbe', `${functions.join('\n')};return {${names.join(',')}};`)(assert, interactionLayerCursorProbe);
const openStates = { autocomplete: ['focus', 'held', 'activate', 'activate-leave', 'open-commit-reopen', 'open'], select: ['activate', 'activate-leave', 'open-commit-reopen', 'open'] };
const cases = materialInteractionCases.filter(c => openStates[c.family]?.includes(c.state));
assert.equal(cases.length, 80);
assert.equal(cases.filter(c => c.family === 'autocomplete').length, 48);
assert.equal(cases.filter(c => c.family === 'select').length, 32);
const server = createServer((req, res) => {
  const name = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
  const candidate = path.resolve(root, name.replace(/^\/+/, ''));
  const file = candidate.startsWith(root + path.sep) && path.extname(candidate) && existsSync(candidate) ? candidate : path.join(root, 'index.csr.html');
  const ext = path.extname(file);
  res.writeHead(200, { 'content-type': ext === '.js' ? 'text/javascript' : ext === '.css' ? 'text/css' : ext === '.woff2' ? 'font/woff2' : 'text/html', 'cache-control': 'no-store' });
  res.end(readFileSync(file));
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  const options = parseSupplementalCaptureArguments([...args, `--base-url=http://127.0.0.1:${server.address().port}`]);
  browser = await chromium.launch(materialBrowserLaunchOptions());
  const properties = Object.values(propertyGroups).flat();
  const evidence = openSupplementalCapture({ options, browser, script: 'scripts/audit-material-configured-field-popup-bounds.mjs', styleProperties: properties });
  const results = [];
  for (const c of cases) {
    const context = await browser.newContext({ viewport: { width: c.viewport.width, height: c.viewport.height },
      deviceScaleFactor: c.viewport.deviceScaleFactor, colorScheme: c.profile === 'dark' ? 'dark' : 'light', reducedMotion: 'reduce' });
    const row = { ...c, caseId: materialCaseKey('interaction', c) };
    try {
      for (const mode of ['reference', 'astylar']) {
        const page = await context.newPage(), finishRuntime = evidence.observe(page);
        await page.goto(`${options.baseUrl}/${mode}/${c.family}?benchmark=1&profile=${c.profile}&interaction=${c.state}`, { waitUntil: 'commit' });
        await page.locator('.frame').waitFor({ state: 'visible' });
        await actions.sendShowcaseCommand(page, { type: 'showcase:theme', theme: actions.profileTheme(c.profile) });
        await actions.waitForThemeApplied(page, actions.profileTheme(c.profile));
        if (mode === 'astylar') await page.waitForFunction(() => !!window.__ASTYLAR_MATERIAL_BENCHMARK__);
        await actions.settleInteraction(page, mode);
        await actions.sendShowcaseCommand(page, { type: 'showcase:benchmark', phase: 'start' });
        const cssBox = async id => {
          if (mode === 'reference') return page.locator(`#${id}`).boundingBox();
          return page.evaluate(id => {
            const b = window.__ASTYLAR_MATERIAL_BENCHMARK__.measure([id], false).elements[id]?.borderBox;
            const canvas = document.querySelector('canvas').getBoundingClientRect();
            return b ? { x: canvas.x + b.left, y: canvas.y + b.top, width: b.width, height: b.height } : null;
          }, id);
        };
        const primary = await cssBox(`${c.family}-primary`); assert.ok(primary);
        await actions.performInteraction(page, mode, c);
        await actions.sendShowcaseCommand(page, { type: 'showcase:benchmark', phase: 'settled' });
        await actions.settleInteraction(page, mode);
        const popupSelector = c.family === 'autocomplete' ? '.mat-mdc-autocomplete-panel' : '.mat-mdc-select-panel';
        const popup = mode === 'reference' ? await page.locator(popupSelector).boundingBox() : await cssBox(c.family === 'autocomplete' ? 'field-options' : 'select-options');
        const optionRows = mode === 'reference' ? await page.locator(`${popupSelector} mat-option`).evaluateAll(nodes => nodes.map(n => {
          const b = n.getBoundingClientRect(); return { text: n.textContent.trim(), box: { x: b.x, y: b.y, width: b.width, height: b.height }, hover: n.matches(':hover') };
        })) : await Promise.all((c.family === 'autocomplete' ? ['autocomplete-option-cape-town', 'autocomplete-option-johannesburg'] : ['select-option-solo', 'select-option-team']).map(async id => ({ id, box: await cssBox(id) })));
        const tree = mode === 'reference' ? await page.evaluate(captureBrowserInputTree, { styleProperties: properties })
          : await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.measure([]).inputTree);
        assert.ok(popup); assert.ok(optionRows.length > 0); assert.deepEqual(tree.errors, []);
        const stem = `${evidence.directory}/${c.family}-${c.profile}-${c.viewport.id}-${c.state}-${mode}`;
        const pixels = await page.screenshot({ animations: 'disabled', caret: 'hide' }), treeBytes = Buffer.from(JSON.stringify(tree));
        writeFileSync(`${stem}.png`, pixels, { flag: 'wx' }); writeFileSync(`${stem}.json`, treeBytes, { flag: 'wx' });
        row[mode] = { observation: { primary: await cssBox(`${c.family}-primary`), popup, options: optionRows },
          screenshot: { file: `${stem}.png`, sha256: hash(pixels) }, inputTree: { file: `${stem}.json`, sha256: hash(treeBytes) }, runtime: await finishRuntime() };
        await page.close();
      }
    } finally { await context.close(); }
    results.push(row); console.log(JSON.stringify({ caseId: row.caseId, reference: row.reference.observation.popup, astylar: row.astylar.observation.popup }));
  }
  writeFileSync(`${evidence.directory}/latest-report.json`, JSON.stringify({ schemaVersion: 1, browser: browser.version(), generatedAt: new Date().toISOString(),
    capture: evidence.capture, actionSource: { file: runnerFile, sha256: hash(runner), functionNames: names, functionBodiesSha256: hash(functions.join('\n')),
      cursorDependency: { file: cursorFile, sha256: hash(readFileSync(cursorFile)) } }, results,
    scope: 'Eighty configured autocomplete/select open endpoints excluding open-hover-content; CSS bounds, trees and rasters. Not retrospective pixel registration or current renderer acceptance.',
    inputEquivalent: false, renderingEquivalent: false }, null, 2) + '\n', { flag: 'wx' });
} finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
