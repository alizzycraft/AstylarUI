import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import ts from 'typescript';
import { chromium } from 'playwright-core';
import { materialInteractionCases } from '../tests/material-parity/benchmark.config.mjs';
import { interactionLayerCursorProbe } from '../tests/material-parity/cursor-metrics.mjs';
import { propertyGroups } from '../tests/material-parity/input-equivalence-policy.mjs';
import { captureBrowserInputTree } from '../tests/material-parity/input-tree-evidence.mjs';
import { fingerprintDirectory, fingerprintModuleGraph, materialBrowserLaunchOptions,
  inspectMaterialBrowserLaunch, materialCaseKey, openMaterialCheckpoint } from '../tests/material-parity/run-checkpoint.mjs';
import { openSupplementalCapture, validateSupplementalCapture } from '../tests/material-parity/supplemental-capture-evidence.mjs';

// Close a demonstrated missing positive AX observation, not another paint/timer test.
const script = 'scripts/audit-material-snackbar-ax.mjs';
const hash = b => createHash('sha256').update(b).digest('hex');
const properties = Object.values(propertyGroups).flat();
const cases = materialInteractionCases.filter(c => c.family === 'snack-bar' && c.profile === 'light' &&
  c.viewport.id === 'desktop-dpr1' && c.state === 'open');
assert.equal(cases.length, 1);
const runnerFile = 'tests/material-parity/run-material-parity.mjs', runner = readFileSync(runnerFile);
const ast = ts.createSourceFile(runnerFile, runner.toString(), 99, true, ts.ScriptKind.JS);
const methods = ['performInteraction', 'interactionTargetBox', 'settleInteraction', 'profileTheme',
  'sendShowcaseCommand', 'waitForThemeApplied'].map(name => {
  const found = ast.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
  assert.equal(found.length, 1); return found[0].getText(ast);
});
const actionSource = { file: runnerFile, sha256: hash(runner), methodsSha256: hash(methods.join('\n')) };
const actions = new Function('assert', 'interactionLayerCursorProbe', methods.join('\n') +
  ';return {performInteraction,settleInteraction,profileTheme,sendShowcaseCommand,waitForThemeApplied};')(assert, interactionLayerCursorProbe);
const selectors = side => side === 'reference'
  ? { surface: '.mat-mdc-snack-bar-container [aria-live]', undo: '.mat-mdc-snack-bar-container button' }
  : { surface: '[data-astylar-id="snack-bar-surface"]', undo: '[data-astylar-id="snack-bar-dismiss"]' };
function verify(report, file) {
  const manifest = JSON.parse(readFileSync(report.capture.checkpointManifest.file));
  assert.deepEqual(validateSupplementalCapture(report, { reportFile: file, expectedProvenance: manifest.provenance,
    script, styleProperties: properties }), { status: 'checkpoint-bound', errors: [] });
  for (const r of [...manifest.provenance.harnessFiles, ...manifest.provenance.diagnosticFiles]) assert.equal(hash(readFileSync(r.file)), r.sha256);
  assert.deepEqual(report.actionSource, actionSource);
  assert.deepEqual(report.results.map(r => r.caseId), cases.map(c => materialCaseKey('interaction', c)));
  for (const row of report.results) for (const side of ['reference', 'astylar']) {
    assert.deepEqual(Object.keys(row[side].ax), ['surface', 'undo']);
    for (const [key, target] of Object.entries(row[side].ax)) {
      assert.equal(target.selector, selectors(side)[key]); assert.ok(target.backendNodeId > 0);
      assert.ok(target.nodes.some(n => n.backendDOMNodeId === target.backendNodeId));
    }
  }
  return { cases: 1, targetObservations: 4, reportSha256: hash(readFileSync(file)),
    scope: 'One retained-build light desktop open endpoint; actual AX/DOM, not AT speech, paint, current-code or whole-case acceptance.' };
}
if (process.argv[2] === '--verify') {
  const file = process.argv[3]; console.log(JSON.stringify(verify(JSON.parse(readFileSync(file)), file)));
} else {
  const output = path.resolve(process.argv[2] ?? '');
  assert.ok(output.startsWith(path.resolve('artifacts/material-parity') + path.sep)); assert.ok(!existsSync(output));
  const root = path.resolve('artifacts/material-parity/icon-fresh-producer-retained-build-20261016-browser');
  const server = createServer((req, res) => {
    const name = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
    const candidate = path.resolve(root, name.replace(/^\/+/, ''));
    const file = candidate.startsWith(root + path.sep) && path.extname(candidate) && existsSync(candidate) ? candidate : path.join(root, 'index.csr.html');
    res.writeHead(200, { 'content-type': { '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2' }[path.extname(file)] ?? 'text/html', 'cache-control': 'no-store' });
    res.end(readFileSync(file));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); let browser;
  try {
    const launch = materialBrowserLaunchOptions(); browser = await chromium.launch(launch);
    const provenance = { browser: browser.version(), browserLaunch: await inspectMaterialBrowserLaunch(browser, launch),
      browserFiles: fingerprintDirectory(root), harnessFiles: fingerprintModuleGraph(process.cwd(), runnerFile), diagnosticFiles: fingerprintModuleGraph(process.cwd(), script) };
    openMaterialCheckpoint({ directory: output + '-provenance', provenance });
    const baseUrl = `http://127.0.0.1:${server.address().port}`;
    const evidence = openSupplementalCapture({ options: { baseUrl, checkpoint: output + '-provenance/checkpoint', output }, browser, script, styleProperties: properties }), results = [];
    for (const c of cases) {
      const context = await browser.newContext({ viewport: { width: c.viewport.width, height: c.viewport.height }, deviceScaleFactor: c.viewport.deviceScaleFactor, colorScheme: 'light', reducedMotion: 'reduce' });
      const row = { ...c, caseId: materialCaseKey('interaction', c) };
      try {
        for (const side of ['reference', 'astylar']) {
          const page = await context.newPage(), finish = evidence.observe(page);
          try {
            await page.goto(`${baseUrl}/${side}/${c.family}?benchmark=1&profile=${c.profile}&interaction=open`, { waitUntil: 'commit' });
            await page.locator('.frame').waitFor({ state: 'visible' });
            const theme = actions.profileTheme(c.profile); await actions.sendShowcaseCommand(page, { type: 'showcase:theme', theme }); await actions.waitForThemeApplied(page, theme);
            if (side === 'astylar') await page.waitForFunction(() => !!window.__ASTYLAR_MATERIAL_BENCHMARK__);
            await actions.settleInteraction(page, side); await actions.sendShowcaseCommand(page, { type: 'showcase:benchmark', phase: 'start' });
            await actions.performInteraction(page, side, c); await actions.settleInteraction(page, side);
            await actions.sendShowcaseCommand(page, { type: 'showcase:benchmark', phase: 'settled' });
            const cdp = await context.newCDPSession(page), { root: document } = await cdp.send('DOM.getDocument'), ax = {};
            for (const [key, selector] of Object.entries(selectors(side))) {
              const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: document.nodeId, selector }); assert.ok(nodeId);
              const { node } = await cdp.send('DOM.describeNode', { nodeId });
              const dom = await page.locator(selector).evaluate(n => ({ tag: n.tagName, text: n.textContent, role: n.getAttribute('role'), ariaLive: n.getAttribute('aria-live'), ariaAtomic: n.getAttribute('aria-atomic'), ariaRelevant: n.getAttribute('aria-relevant'), ariaLabel: n.getAttribute('aria-label'), disabled: 'disabled' in n ? n.disabled : null, tabIndex: n.tabIndex }));
              ax[key] = { selector, backendNodeId: node.backendNodeId, dom, ...await cdp.send('Accessibility.getPartialAXTree', { nodeId, fetchRelatives: true }) };
            }
            await cdp.detach();
            const tree = side === 'reference' ? await page.evaluate(captureBrowserInputTree, { styleProperties: properties })
              : await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.measure(['snack-bar-surface', 'snack-bar-dismiss']).inputTree);
            const treeFile = `${evidence.directory}/${side}-input-tree.json`, treeBytes = Buffer.from(JSON.stringify(tree));
            writeFileSync(treeFile, treeBytes, { flag: 'wx' });
            row[side] = { ax, runtime: await finish(), inputTree: { file: treeFile, sha256: hash(treeBytes) } };
          } finally { await page.close(); }
        }
        results.push(row);
      } finally { await context.close(); }
    }
    const report = { schemaVersion: 1, browser: browser.version(), capture: evidence.capture, actionSource, results,
      scope: 'Focused positive snackbar AX evidence on retained build; does not recover original e01 runner or establish current rendering/AT speech.' };
    const file = `${evidence.directory}/latest-report.json`; writeFileSync(file, JSON.stringify(report) + '\n', { flag: 'wx' });
    console.log(JSON.stringify(verify(report, file)));
  } finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
}
