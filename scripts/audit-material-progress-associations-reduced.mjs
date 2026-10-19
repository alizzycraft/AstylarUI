import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { chromium } from 'playwright-core';
import { captureBrowserInputTree } from '../tests/material-parity/input-tree-evidence.mjs';
import { propertyGroups } from '../tests/material-parity/input-equivalence-policy.mjs';
import { openSupplementalCapture, validateSupplementalCapture } from '../tests/material-parity/supplemental-capture-evidence.mjs';
import { fingerprintModuleGraph, materialBrowserLaunchOptions, inspectMaterialBrowserLaunch, openMaterialCheckpoint } from '../tests/material-parity/run-checkpoint.mjs';

// The retained host-only AX log cannot prove section/host ancestry or exposure.
// Reuse the existing supplemental/checkpoint infrastructure, without pixels.
const script = 'scripts/audit-material-progress-associations-reduced.mjs';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const properties = Object.values(propertyGroups).flat();
const themeFile = 'examples/material-showcase/src/app/theme.ts', themes = {};
new Function('exports', ts.transpileModule(readFileSync(themeFile, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText)(themes);
const families = ['progress-bar', 'progress-spinner'];
const profiles = ['light', 'dark', 'contrast', 'custom'];
const viewports = [
  { id: 'desktop-dpr1', width: 1440, height: 1000, deviceScaleFactor: 1 },
  { id: 'desktop-dpr2', width: 1440, height: 1000, deviceScaleFactor: 2 },
  { id: 'tablet-dpr1', width: 768, height: 1024, deviceScaleFactor: 1 },
  { id: 'mobile-dpr2', width: 390, height: 844, deviceScaleFactor: 2 },
];

export function verifyProgressAssociations(raw) {
  assert.deepEqual(raw.results.map(r => `${r.family}/${r.profile}/${r.viewport.id}`),
    families.flatMap(f => profiles.flatMap(p => viewports.map(v => `${f}/${p}/${v.id}`))));
  const observations = [];
  for (const row of raw.results) {
    assert.deepEqual(row.viewport, viewports.find(v => v.id === row.viewport.id));
    for (const side of ['reference', 'astylar']) {
      const value = row[side];
      assert.equal(value.benchmarkMode, true);
      assert.equal(value.media.reducedMotion, true);
      assert.equal(value.media.dark, row.profile === "dark");
      assert.deepEqual(value.appliedTheme, themes.MATERIAL_THEME_PROFILES[row.profile]);
      const nodes = new Map(value.fullAX.nodes.map(n => [n.nodeId, n]));
      assert.equal(nodes.size, value.fullAX.nodes.length);
      const target = key => {
        const item = value.ax[key];
        assert.ok(item.backendNodeId > 0);
        const matches = value.fullAX.nodes.filter(n => n.backendDOMNodeId === item.backendNodeId);
        assert.equal(matches.length, 1);
        assert.ok(item.nodes.some(n => n.backendDOMNodeId === item.backendNodeId && n.nodeId === matches[0].nodeId));
        return matches[0];
      };
      const region = target('region'), host = target('host');
      assert.equal(region.ignored, false); assert.equal(region.role.value, 'region');
      assert.equal(region.name.value, `${row.family} showcase`);
      assert.equal(host.ignored, false); assert.equal(host.role.value, 'progressbar');
      assert.equal(host.name.value, ''); assert.equal(host.value.value, 64);
      const attrs = Object.fromEntries(host.properties.map(p => [p.name, p.value.value]));
      assert.equal(attrs.valuemin, 0); assert.equal(attrs.valuemax, 100);
      assert.deepEqual(host.childIds ?? [], []);
      const ancestors = [], seen = new Set([host.nodeId]);
      let current = host;
      while (current.parentId && current.nodeId !== region.nodeId) {
        assert.ok(!seen.has(current.parentId), 'cyclic AX ancestry'); seen.add(current.parentId);
        current = nodes.get(current.parentId); assert.ok(current, 'missing AX ancestor'); ancestors.push(current.nodeId);
      }
      assert.equal(current.nodeId, region.nodeId, 'host is not within its authored region');
      const dom = value.ax.host.dom.attributes;
      assert.equal(dom.role, 'progressbar'); assert.equal(dom['aria-valuenow'], '64');
      assert.equal(dom.tabindex ?? null, side === 'reference' ? '-1' : null);
      assert.equal(attrs.focusable ?? false, side === 'reference');
      observations.push({ family: row.family, profile: row.profile, viewport: row.viewport, side,
        region: { nodeId: region.nodeId, role: region.role.value, name: region.name.value },
        host: { nodeId: host.nodeId, role: host.role.value, value: host.value.value,
          children: host.childIds ?? [], properties: attrs }, ancestors });
    }
  }
  return { physicalContexts: 32, sideGraphs: 64, targetObservations: 128,
    retainedHostFocusDifferences: 32, observations, currentRenderingAccepted: false };
}

export function verifyProgressAssociationCapture(raw, file) {
  const manifest = JSON.parse(readFileSync(raw.capture.checkpointManifest.file));
  assert.deepEqual(validateSupplementalCapture(raw, { reportFile: file, expectedProvenance: manifest.provenance,
    script, styleProperties: properties }), { status: 'checkpoint-bound', errors: [] });
  assert.equal(hash(readFileSync(themeFile)), raw.themeSource.sha256);
  return verifyProgressAssociations(raw);
}

async function capture(output) {
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
  const server = createServer((request, response) => {
    const name = decodeURIComponent(new URL(request.url, 'http://localhost').pathname).replace(/^\/+/, '');
    const file = path.join(assetRoot, known.has(name) ? name : 'index.csr.html');
    response.writeHead(200, { 'content-type': { '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2' }[path.extname(file)] ?? 'text/html', 'cache-control': 'no-store' });
    response.end(readFileSync(file));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`, launch = materialBrowserLaunchOptions();
  let browser;
  try {
    browser = await chromium.launch(launch);
    openMaterialCheckpoint({ directory: output + '-checkpoint', provenance: { browser: browser.version(),
      browserLaunch: await inspectMaterialBrowserLaunch(browser, launch), browserFiles, harness: fingerprintModuleGraph(process.cwd(), script) } });
    const evidence = openSupplementalCapture({ options: { baseUrl, checkpoint: output + '-checkpoint/checkpoint', output }, browser, script, styleProperties: properties });
    const results = [];
    for (const family of families) for (const profile of profiles) for (const viewport of viewports) {
      const row = { family, profile, viewport };
      for (const side of ['reference', 'astylar']) {
        const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: viewport.deviceScaleFactor, colorScheme: profile === "dark" ? "dark" : "light", reducedMotion: "reduce" });
        const finishRuntime = evidence.observe(page);
        try {
          await page.goto(`${baseUrl}/${side}/${family}?benchmark=1`); await page.locator('.frame').waitFor();
          if (side === 'astylar') await page.waitForFunction(() => !!window.__ASTYLAR_MATERIAL_BENCHMARK__);
          const state = await page.evaluate(({ side, theme }) => {
            const component = window.ng.getComponent(document.querySelector(side === 'reference' ? 'app-reference' : 'app-astylar-showcase'));
            component.store.setTheme(theme); window.ng.applyChanges(component);
            return { appliedTheme: component.store.theme(), benchmarkMode: new URLSearchParams(location.search).get('benchmark') === '1', media: { reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches, dark: matchMedia('(prefers-color-scheme: dark)').matches } };
          }, { side, theme: themes.MATERIAL_THEME_PROFILES[profile] });
          if (side === 'astylar') await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled());
          await page.evaluate(async () => { await document.fonts.ready; await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); });
          const cdp = await page.context().newCDPSession(page), { root } = await cdp.send('DOM.getDocument'), ax = {};
          for (const [key, id] of [['region', `${family}-root`], ['host', `${family}-primary`]]) {
            const selector = side === 'reference' ? `#${id}` : `[data-astylar-id="${id}"]`;
            const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector }); assert.ok(nodeId);
            const { node } = await cdp.send('DOM.describeNode', { nodeId });
            const dom = await page.locator(selector).evaluate(n => ({ tag: n.tagName, text: n.textContent,
              attributes: Object.fromEntries([...n.attributes].map(a => [a.name, a.value])) }));
            ax[key] = { selector, backendNodeId: node.backendNodeId, dom,
              ...(await cdp.send('Accessibility.getPartialAXTree', { nodeId, fetchRelatives: true })) };
          }
          const fullAX = await cdp.send('Accessibility.getFullAXTree');
          const tree = side === 'reference' ? await page.evaluate(captureBrowserInputTree, { styleProperties: properties })
            : await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.measure([]).inputTree);
          const treeFile = `${evidence.directory}/${family}-${profile}-${viewport.id}-${side}-input-tree.json`, treeBytes = Buffer.from(JSON.stringify(tree));
          writeFileSync(treeFile, treeBytes, { flag: 'wx' });
          row[side] = { ...state, ax, fullAX, runtime: await finishRuntime(), inputTree: { file: treeFile, sha256: hash(treeBytes) } };
        } finally { await page.close(); }
      }
      results.push(row); console.log(JSON.stringify({ family, profile, viewport: viewport.id }));
    }
    const report = { schemaVersion: 1, browser: browser.version(), capture: evidence.capture,
      themeSource: { file: themeFile, sha256: hash(readFileSync(themeFile)) }, results,
      scope: 'Progress region/host AX associations in retained build with actual applied themes and original reduced-motion/color-scheme settings. Initial-state only; no AT, pixel, event or current-code acceptance.' };
    const file = `${evidence.directory}/latest-report.json`;
    writeFileSync(file, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
    console.log(JSON.stringify(verifyProgressAssociationCapture(report, file)));
  } finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  if (process.argv[2] === '--verify') {
    const file = process.argv[3];
    console.log(JSON.stringify(verifyProgressAssociationCapture(JSON.parse(readFileSync(file)), file)));
  } else await capture(path.resolve(process.argv[2] ?? ''));
}
