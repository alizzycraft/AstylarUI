import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { chromium } from 'playwright-core';
import { captureBrowserInputTree } from '../tests/material-parity/input-tree-evidence.mjs';
import { propertyGroups } from '../tests/material-parity/input-equivalence-policy.mjs';
import { openSupplementalCapture, validateSupplementalCapture } from '../tests/material-parity/supplemental-capture-evidence.mjs';
import { fingerprintModuleGraph, materialBrowserLaunchOptions, inspectMaterialBrowserLaunch, openMaterialCheckpoint } from '../tests/material-parity/run-checkpoint.mjs';

// Missing Badge count/label AX contexts; reuse existing capture and checkpoint infrastructure.
const script = 'scripts/audit-material-badge-exposure.mjs';
const hash = b => createHash('sha256').update(b).digest('hex');
const properties = Object.values(propertyGroups).flat();
const themeFile = 'examples/material-showcase/src/app/theme.ts', themes = {};
new Function('exports', ts.transpileModule(readFileSync(themeFile, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText)(themes);
const profiles = ['light', 'dark', 'contrast', 'custom'];
const viewports = [
  { id: 'desktop-dpr1', width: 1440, height: 1000, deviceScaleFactor: 1 },
  { id: 'desktop-dpr2', width: 1440, height: 1000, deviceScaleFactor: 2 },
  { id: 'tablet-dpr1', width: 768, height: 1024, deviceScaleFactor: 1 },
  { id: 'mobile-dpr2', width: 390, height: 844, deviceScaleFactor: 2 },
];
function verify(raw, file) {
  const manifest = JSON.parse(readFileSync(raw.capture.checkpointManifest.file));
  assert.deepEqual(validateSupplementalCapture(raw, { reportFile: file, expectedProvenance: manifest.provenance,
    script, styleProperties: properties }), { status: 'checkpoint-bound', errors: [] });
  assert.equal(hash(readFileSync(themeFile)), raw.themeSource.sha256);
  assert.deepEqual(raw.results.map(r => `${r.profile}/${r.viewport.id}`), profiles.flatMap(p => viewports.map(v => `${p}/${v.id}`)));
  let exposedCountDifferences = 0;
  for (const row of raw.results) {
    assert.deepEqual(row.viewport, viewports.find(v => v.id === row.viewport.id));
    for (const side of ['reference', 'astylar']) {
      const observation = row[side];
      assert.equal(observation.benchmarkMode, true);
      assert.deepEqual(observation.appliedTheme, themes.MATERIAL_THEME_PROFILES[row.profile]);
      for (const id of ['label', 'count']) {
        const target = observation.ax[id];
        assert.ok(target.backendNodeId > 0);
        assert.equal(target.nodes[0].backendDOMNodeId, target.backendNodeId);
        assert.equal(target.dom.tag, 'SPAN');
        assert.equal(target.dom.text, id === 'label' ? 'Notifications' : '4');
      }
    }
    const native = row.reference.ax.count.nodes[0], candidate = row.astylar.ax.count.nodes[0];
    assert.equal(native.ignored, true);
    assert.ok(native.ignoredReasons.some(reason => reason.name === 'ariaHiddenElement' && reason.value.value === true));
    assert.equal(candidate.ignored, false);
    assert.ok(row.astylar.ax.count.nodes.some(node => node.role?.value === 'StaticText' && node.name?.value === '4'));
    exposedCountDifferences++;
  }
  return { contexts: 16, targetObservations: 64, exposedCountDifferences, currentRenderingAccepted: false };
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
  const baseUrl = `http://127.0.0.1:${server.address().port}`, launch = materialBrowserLaunchOptions(), browser = await chromium.launch(launch);
  try {
    openMaterialCheckpoint({ directory: output + '-checkpoint', provenance: { browser: browser.version(),
      browserLaunch: await inspectMaterialBrowserLaunch(browser, launch), browserFiles, harness: fingerprintModuleGraph(process.cwd(), script) } });
    const evidence = openSupplementalCapture({ options: { baseUrl, checkpoint: output + '-checkpoint/checkpoint', output }, browser, script, styleProperties: properties });
    const results = [];
    for (const profile of profiles) for (const viewport of viewports) {
      const row = { family: 'badge', profile, viewport };
      for (const side of ['reference', 'astylar']) {
        const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: viewport.deviceScaleFactor });
        const finishRuntime = evidence.observe(page);
        try {
          await page.goto(`${baseUrl}/${side}/badge?benchmark=1`); await page.locator('.frame').waitFor();
          if (side === 'astylar') await page.waitForFunction(() => !!window.__ASTYLAR_MATERIAL_BENCHMARK__);
          const state = await page.evaluate(({ side, theme }) => {
            const component = window.ng.getComponent(document.querySelector(side === 'reference' ? 'app-reference' : 'app-astylar-showcase'));
            component.store.setTheme(theme); window.ng.applyChanges(component);
            return { appliedTheme: component.store.theme(), benchmarkMode: new URLSearchParams(location.search).get('benchmark') === '1' };
          }, { side, theme: themes.MATERIAL_THEME_PROFILES[profile] });
          if (side === 'astylar') await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled());
          await page.evaluate(async () => { await document.fonts.ready; await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); });
          const cdp = await page.context().newCDPSession(page), { root } = await cdp.send('DOM.getDocument');
          const ax = {};
          for (const id of ['label', 'count']) {
            const selector = side === 'reference' ? id === 'label' ? '#badge-label' : '#badge-primary .mat-badge-content' : `[data-astylar-id="badge-${id}"]`;
            const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector }); assert.ok(nodeId);
            const { node } = await cdp.send('DOM.describeNode', { nodeId });
            const dom = await page.locator(selector).evaluate(n => ({ tag: n.tagName, text: n.textContent }));
            ax[id] = { selector, backendNodeId: node.backendNodeId, dom, ...(await cdp.send('Accessibility.getPartialAXTree', { nodeId, fetchRelatives: true })) };
          }
          const tree = side === 'reference' ? await page.evaluate(captureBrowserInputTree, { styleProperties: properties }) : await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.measure(['badge-label', 'badge-count']).inputTree);
          const treeFile = `${evidence.directory}/${profile}-${viewport.id}-${side}-input-tree.json`, treeBytes = Buffer.from(JSON.stringify(tree));
          writeFileSync(treeFile, treeBytes, { flag: 'wx' });
          row[side] = { ...state, ax, runtime: await finishRuntime(), inputTree: { file: treeFile, sha256: hash(treeBytes) } };
        } finally { await page.close(); }
      }
      results.push(row); console.log(JSON.stringify({ profile, viewport: viewport.id }));
    }
    const report = { schemaVersion: 1, browser: browser.version(), capture: evidence.capture,
      themeSource: { file: themeFile, sha256: hash(readFileSync(themeFile)) }, results,
      scope: 'Configured Badge label/count AX only; retained build, actual applied themes. No pixel, AT or whole-case acceptance.' };
    const file = `${evidence.directory}/latest-report.json`; writeFileSync(file, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
    console.log(JSON.stringify(verify(report, file)));
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
}
