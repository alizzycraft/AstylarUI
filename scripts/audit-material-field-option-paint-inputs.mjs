import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import { chromium } from 'playwright-core';
import { fingerprintDirectory, materialBrowserLaunchOptions } from '../tests/material-parity/run-checkpoint.mjs';
import { interactionLayerCursorProbe } from '../tests/material-parity/cursor-metrics.mjs';

// Read missing numeric paint inputs only. Reuse original actions and frozen-host
// validation; do not repaint, inject styles, recapture screenshots or claim parity.
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const reportBytes = readFileSync('artifacts/material-parity/field-popup-bounds-recovered-20261008/latest-report.json');
assert.equal(hash(reportBytes), '4e4582308f9f76be4f663992e0e94ecf6c5bd6d7a1be1523bcb3c25a6d4b754d');
const report = JSON.parse(reportBytes);
const helperFile = 'tests/material-parity/sort-focus-structure.spec.mjs';
const helperBytes = readFileSync(helperFile);
const ast = ts.createSourceFile(helperFile, helperBytes.toString(), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const helpers = ast.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === 'withFrozenShowcase');
assert.equal(helpers.length, 1);
const helper = helpers[0].getText(ast);
assert.equal(hash(helper), '603ac9ca88b9bf2e3443f8be65f125d39002e1ca4e5157487d9ac86ed7d2527f');
const withFrozen = new Function('assert', 'path', 'readFileSync', 'fingerprintDirectory', 'createServer', 'existsSync', 'chromium',
  `${helper};return withFrozenShowcase;`)(assert, path, readFileSync, fingerprintDirectory, createServer, existsSync, chromium);
const action = report.actionSource, runner = readFileSync(action.file);
assert.equal(hash(runner), action.sha256);
assert.equal(hash(readFileSync(action.cursorDependency.file)), action.cursorDependency.sha256);
const runnerAst = ts.createSourceFile(action.file, runner.toString(), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const bodies = action.functionNames.map(name => {
  const matches = runnerAst.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
  assert.equal(matches.length, 1); return matches[0].getText(runnerAst);
});
assert.equal(hash(bodies.join('\n')), action.functionBodiesSha256);
const actions = new Function('assert', 'interactionLayerCursorProbe', `${bodies.join('\n')};
  return {profileTheme,sendShowcaseCommand,waitForThemeApplied,settleInteraction,performInteraction};`)(assert, interactionLayerCursorProbe);
// The eight autocomplete focus contexts already have numeric evidence. Do not rerun them.
assert.ok(process.argv.length === 2 || (process.argv.length === 3 && process.argv[2] === '--family=select'));
const selectOnly = process.argv[2] === '--family=select';
const cases = report.results.filter(r => !(r.family === 'autocomplete' && r.state === 'focus') && (!selectOnly || r.family === 'select'));
const expectedCount = selectOnly ? 32 : 72;
assert.equal(cases.length, expectedCount);
assert.equal(new Set(cases.map(r => r.caseId)).size, expectedCount);
const observations = [];
await withFrozen(async (browser, baseUrl) => {
  assert.equal(browser.version(), '154.0.8037.58');
  for (const row of cases) {
    const page = await browser.newPage({ viewport: { width: row.viewport.width, height: row.viewport.height },
      deviceScaleFactor: row.viewport.deviceScaleFactor, colorScheme: row.profile === 'dark' ? 'dark' : 'light', reducedMotion: 'reduce' });
    const errors = []; page.on('pageerror', error => errors.push(String(error)));
    try {
      await page.goto(`${baseUrl}/astylar/${row.family}?benchmark=1&profile=${row.profile}&interaction=${row.state}`, { waitUntil: 'commit' });
      await page.locator('.frame').waitFor();
      await actions.sendShowcaseCommand(page, { type: 'showcase:theme', theme: actions.profileTheme(row.profile) });
      await actions.waitForThemeApplied(page, actions.profileTheme(row.profile));
      await page.waitForFunction(() => !!window.__ASTYLAR_MATERIAL_BENCHMARK__);
      await actions.settleInteraction(page, 'astylar');
      await actions.sendShowcaseCommand(page, { type: 'showcase:benchmark', phase: 'start' });
      await actions.performInteraction(page, 'astylar', row);
      await actions.sendShowcaseCommand(page, { type: 'showcase:benchmark', phase: 'settled' });
      await actions.settleInteraction(page, 'astylar');
      const treeReceipt = row.astylar.inputTree, treeBytes = readFileSync(treeReceipt.file);
      assert.equal(hash(treeBytes), treeReceipt.sha256);
      const tree = JSON.parse(treeBytes);
      const ownerIds = row.astylar.observation.options.map(option => {
        const owner = tree.nodes.find(n => n.authored?.id === option.id); assert.ok(owner);
        const labels = tree.nodes.filter(n => n.parent === owner.key && n.retainedText?.source === 'core-text-registry');
        assert.equal(labels.length, 1); return labels[0].authored.id;
      });
      const observed = await page.evaluate(ids => {
        const surface = window.ng.getComponent(document.querySelector('app-astylar-showcase')).surface;
        const text = surface.host.inspection.textRenderingService;
        return [...text.getRetainedTextures()].flatMap(texture => {
          const owners = surface.scene.meshes.filter(m => ids.includes(m.metadata?.elementId) && m.material?.getActiveTextures().includes(texture));
          if (!owners.length) return [];
          return [{ inputs: text.inspectTexturePaintInputs(texture), logicalSize: text.getLogicalTextureSize(texture),
            owners: owners.map(m => ({ elementId: m.metadata.elementId, textDimensions: m.metadata?.textDimensions })) }];
        });
      }, ownerIds);
      assert.deepEqual(observed.flatMap(o => o.owners.map(m => m.elementId)).sort(), ownerIds.sort());
      for (const o of observed) {
        assert.ok(o.inputs && Number.isFinite(o.inputs.style.lineHeight));
        assert.ok(o.logicalSize.height > 0);
      }
      assert.deepEqual(errors, []);
      const result = { caseId: row.caseId, observed, pageErrors: errors };
      observations.push(result); console.log(JSON.stringify(result));
    } finally { await page.close(); }
  }
}, materialBrowserLaunchOptions(), { checkpointFile: 'artifacts/material-parity/current-full-20261005/checkpoint/manifest.json' });
assert.equal(observations.length, expectedCount);
console.log(JSON.stringify({ result: 'PASS', cases: observations.length, helperMethodSha256: hash(helper), runnerSha256: hash(runner),
  checkpointFile: 'artifacts/material-parity/current-full-20261005/checkpoint/manifest.json', acceptance: false,
  scope: 'missing candidate numeric option paint inputs at exact retained endpoints; no raster causal decomposition or full current-code acceptance' }));
