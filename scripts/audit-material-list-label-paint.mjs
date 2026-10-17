import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { chromium } from 'playwright-core';
import { materialStaticCases, materialInteractionCases } from '../tests/material-parity/benchmark.config.mjs';
import { interactionLayerCursorProbe } from '../tests/material-parity/cursor-metrics.mjs';
import { captureBrowserInputTree } from '../tests/material-parity/input-tree-evidence.mjs';
import { propertyGroups } from '../tests/material-parity/input-equivalence-policy.mjs';
import { fingerprintModuleGraph, materialBrowserLaunchOptions, inspectMaterialBrowserLaunch, openMaterialCheckpoint } from '../tests/material-parity/run-checkpoint.mjs';
import { openSupplementalCapture, validateSupplementalCapture } from '../tests/material-parity/supplemental-capture-evidence.mjs';

// Demonstrated gap: old reports measure list root/primary,not either label.
// Reuse existing configured actions and capture receipts; do not invent bounds.
const script = 'scripts/audit-material-list-label-paint.mjs', hash = b => createHash('sha256').update(b).digest('hex');
const properties = Object.values(propertyGroups).flat(), ids = ['list-inbox-label', 'list-archive-label'];
const cases = [...materialStaticCases.filter(c => c.family === 'list').map(c => ({ kind: 'static', ...c })),
  ...materialInteractionCases.filter(c => c.family === 'list').map(c => ({ kind: 'interaction', ...c }))];
assert.equal(cases.length, 52);
const key = c => `${c.kind}:list@${c.profile}/${c.viewport.id}${c.state ? '/' + c.state : ''}`;
const runnerFile = 'tests/material-parity/run-material-parity.mjs', runner = readFileSync(runnerFile, 'utf8');
const names = ['profileTheme', 'sendShowcaseCommand', 'waitForThemeApplied', 'settleInteraction', 'popupHoverBox', 'popupOptionBox', 'interactionTargetBox', 'performInteraction'];
const ast = ts.createSourceFile(runnerFile, runner, ts.ScriptTarget.Latest, true);
const functions = names.map(name => {
  const matches = ast.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
  assert.equal(matches.length, 1); return matches[0].getText(ast);
});
const actions = new Function('assert', 'interactionLayerCursorProbe', `${functions.join('\n')};return {${names.join(',')}};`)(assert, interactionLayerCursorProbe);
function verify(report, file) {
  const manifest = JSON.parse(readFileSync(report.capture.checkpointManifest.file));
  assert.deepEqual(validateSupplementalCapture(report, { reportFile: file, expectedProvenance: manifest.provenance,
    script, styleProperties: properties }), { status: 'checkpoint-bound', errors: [] });
  assert.equal(report.actionSource.sha256, hash(runner));
  assert.equal(report.actionSource.functionBodiesSha256, hash(functions.join('\n')));
  assert.deepEqual(report.results.map(key), cases.map(key));
  for (const row of report.results) for (const side of ['reference', 'astylar']) {
    const value = row[side]; assert.deepEqual(Object.keys(value.labels), ids);
    for (const id of ids) {
      const box = value.labels[id];
      for (const n of ['x', 'y', 'width', 'height']) assert.ok(Number.isFinite(box[n]));
      assert.ok(box.width > 0 && box.height > 0);
    }
    assert.equal(hash(readFileSync(value.screenshot.file)), value.screenshot.sha256);
  }
  return { cases: 52, pairedLabels: 104, screenshots: 104, currentRenderingAccepted: false };
}
if (process.argv[2] === '--verify') {
  const file = process.argv[3]; console.log(JSON.stringify(verify(JSON.parse(readFileSync(file)), file)));
} else {
  const output = path.resolve(process.argv[2] ?? '');
  assert.ok(output.startsWith(path.resolve('artifacts/material-parity') + path.sep));
  assert.ok(!existsSync(output) && !existsSync(output + '-checkpoint'));
  const browserFiles = JSON.parse(readFileSync('artifacts/material-parity/current-full-20261005/checkpoint/manifest.json')).provenance.browserFiles;
  const assetRoot = path.resolve('artifacts/material-parity/icon-fresh-producer-retained-build-20261016-browser');
  assert.equal(browserFiles.length, 1887);
  for (const asset of browserFiles) {
    assert.ok(!path.isAbsolute(asset.file) && !asset.file.split(/[\\/]/).includes('..'));
    assert.equal(hash(readFileSync(path.join(assetRoot, asset.file))), asset.sha256);
  }
  const known = new Set(browserFiles.map(a => a.file));
  const server = createServer((req, res) => {
    const name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/^\/+/, '');
    const file = path.join(assetRoot, known.has(name) ? name : 'index.csr.html');
    res.writeHead(200, { 'content-type': { '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2' }[path.extname(file)] ?? 'text/html', 'cache-control': 'no-store' });
    res.end(readFileSync(file));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`, launch = materialBrowserLaunchOptions(); let browser;
  try {
    browser = await chromium.launch(launch);
    openMaterialCheckpoint({ directory: output + '-checkpoint', provenance: { browser: browser.version(),
      browserLaunch: await inspectMaterialBrowserLaunch(browser, launch), browserFiles, harness: fingerprintModuleGraph(process.cwd(), script) } });
    const evidence = openSupplementalCapture({ options: { baseUrl, checkpoint: output + '-checkpoint/checkpoint', output }, browser, script, styleProperties: properties });
    const results = [];
    for (const c of cases) {
      const context = await browser.newContext({ viewport: { width: c.viewport.width, height: c.viewport.height },
        deviceScaleFactor: c.viewport.deviceScaleFactor, colorScheme: c.profile === 'dark' ? 'dark' : 'light', reducedMotion: 'reduce' });
      const row = { ...c };
      try {
        for (const side of ['reference', 'astylar']) {
          const page = await context.newPage(), finishRuntime = evidence.observe(page);
          await page.goto(`${baseUrl}/${side}/list?benchmark=1&profile=${c.profile}${c.state ? '&interaction=' + c.state : ''}`);
          await page.locator('.frame').waitFor({ state: 'visible' });
          await actions.sendShowcaseCommand(page, { type: 'showcase:theme', theme: actions.profileTheme(c.profile) });
          await actions.waitForThemeApplied(page, actions.profileTheme(c.profile));
          if (side === 'astylar') await page.waitForFunction(() => !!window.__ASTYLAR_MATERIAL_BENCHMARK__);
          await actions.settleInteraction(page, side);
          await actions.sendShowcaseCommand(page, { type: 'showcase:benchmark', phase: 'start' });
          if (c.kind === 'interaction') await actions.performInteraction(page, side, c);
          await actions.sendShowcaseCommand(page, { type: 'showcase:benchmark', phase: 'settled' });
          await actions.settleInteraction(page, side);
          const labels = {};
          for (const id of ids) labels[id] = side === 'reference' ? await page.locator('#' + id).boundingBox()
            : await page.evaluate(id => {
              const box = window.__ASTYLAR_MATERIAL_BENCHMARK__.measure([id], false).elements[id]?.borderBox;
              const canvas = document.querySelector('canvas').getBoundingClientRect();
              return box ? { x: canvas.x + box.left, y: canvas.y + box.top, width: box.width, height: box.height } : null;
            }, id);
          for (const id of ids) assert.ok(labels[id], `${key(c)} ${side} ${id}: missing runtime geometry`);
          const tree = side === 'reference' ? await page.evaluate(captureBrowserInputTree, { styleProperties: properties })
            : await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.measure([]).inputTree);
          const stem = `${evidence.directory}/${c.kind}-${c.profile}-${c.viewport.id}-${c.state ?? 'initial'}-${side}`;
          const pixels = await page.screenshot({ animations: 'disabled', caret: 'hide' }), treeBytes = Buffer.from(JSON.stringify(tree));
          writeFileSync(stem + '.png', pixels, { flag: 'wx' }); writeFileSync(stem + '.json', treeBytes, { flag: 'wx' });
          row[side] = { labels, screenshot: { file: stem + '.png', sha256: hash(pixels) },
            inputTree: { file: stem + '.json', sha256: hash(treeBytes) }, runtime: await finishRuntime() };
          await page.close();
        }
      } finally { await context.close(); }
      results.push(row); console.log(JSON.stringify({ case: key(c) }));
    }
    const report = { schemaVersion: 1, browser: browser.version(), capture: evidence.capture,
      actionSource: { file: runnerFile, sha256: hash(runner), functionNames: names, functionBodiesSha256: hash(functions.join('\n')) }, results,
      scope: 'All52 configured list endpoints: paired absolute CSS label bounds,full viewport paint and input trees. Retained build with current recorded actions;not retrospective old-PNG registration,local metric,current whole-runtime or complete-case acceptance.' };
    const file = `${evidence.directory}/latest-report.json`; writeFileSync(file, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
    console.log(JSON.stringify(verify(report, file)));
  } finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
}
