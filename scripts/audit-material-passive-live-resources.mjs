import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { chromium } from 'playwright-core';
import { propertyGroups } from '../tests/material-parity/input-equivalence-policy.mjs';
import { openSupplementalCapture, validateSupplementalCapture } from '../tests/material-parity/supplemental-capture-evidence.mjs';
import { fingerprintModuleGraph, materialBrowserLaunchOptions, inspectMaterialBrowserLaunch, openMaterialCheckpoint } from '../tests/material-parity/run-checkpoint.mjs';

// Missing live-scene/disposal cohorts,not another single-snapshot stability survey.
const script = 'scripts/audit-material-passive-live-resources.mjs';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const properties = Object.values(propertyGroups).flat();
const themeFile = 'examples/material-showcase/src/app/theme.ts', themes = {};
new Function('exports', ts.transpileModule(readFileSync(themeFile, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText)(themes);
const families = ['sidenav', 'grid-list', 'badge', 'list', 'table'];
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
  assert.deepEqual(raw.results.map(row => `${row.family}/${row.profile}/${row.viewport.id}`),
    families.flatMap(family => profiles.flatMap(profile => viewports.map(viewport => `${family}/${profile}/${viewport.id}`))));
  for (const row of raw.results) {
    assert.deepEqual(row.appliedTheme, themes.MATERIAL_THEME_PROFILES[row.profile]);
    assert.deepEqual(row.viewport, viewports.find(viewport => viewport.id === row.viewport.id));
    assert.equal(row.snapshots.length, 4);
    for (const snapshot of row.snapshots) {
      assert.equal(snapshot.session.status, 'idle'); assert.equal(snapshot.plugins.pending, 0);
      assert.deepEqual(snapshot.live, row.snapshots[0].live); assert.deepEqual(snapshot.tracked, snapshot.live);
      assert.equal(snapshot.cache, row.snapshots[0].cache); assert.equal(snapshot.loaded, row.snapshots[0].loaded);
      assert.deepEqual(snapshot.unbound, []);
    }
    assert.deepEqual(row.disposal.live, { meshes: 0, materials: 0, textures: 0 });
    for (const key of ['surface', 'scene', 'engine']) assert.equal(row.disposal[key], true);
    assert.equal(row.disposal.cache, 0); assert.equal(row.disposal.loaded, 0);
    assert.deepEqual(row.disposal.plugins, { owners: 0, resources: 0, cleanups: 0, pending: 0 });
  }
  return { families: families.length, physicalContexts: raw.results.length, idleSnapshots: raw.results.length * 4,
    disposals: raw.results.length, currentRenderingAccepted: false };
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
  const known = new Set(browserFiles.map(asset => asset.file));
  const server = createServer((request, response) => {
    const name = decodeURIComponent(new URL(request.url, 'http://localhost').pathname).replace(/^\/+/, '');
    const file = path.join(assetRoot, known.has(name) ? name : 'index.csr.html');
    response.writeHead(200, { 'content-type': { '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2' }[path.extname(file)] ?? 'text/html', 'cache-control': 'no-store' });
    response.end(readFileSync(file));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`, launch = materialBrowserLaunchOptions(), browser = await chromium.launch(launch);
  try {
    openMaterialCheckpoint({ directory: output + '-checkpoint', provenance: { browser: browser.version(),
      browserLaunch: await inspectMaterialBrowserLaunch(browser, launch), browserFiles, harness: fingerprintModuleGraph(process.cwd(), script) } });
    const evidence = openSupplementalCapture({ options: { baseUrl, checkpoint: output + '-checkpoint/checkpoint', output }, browser, script, styleProperties: properties });
    const results = [];
    for (const family of families) for (const profile of profiles) for (const viewport of viewports) {
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: viewport.deviceScaleFactor });
      const finishRuntime = evidence.observe(page);
      try {
        await page.goto(`${baseUrl}/astylar/${family}?benchmark=1`);
        await page.waitForFunction(() => !!window.__ASTYLAR_MATERIAL_BENCHMARK__);
        const appliedTheme = await page.evaluate(theme => {
          const component = window.ng.getComponent(document.querySelector('app-astylar-showcase'));
          component.store.setTheme(theme); window.ng.applyChanges(component); return component.store.theme();
        }, themes.MATERIAL_THEME_PROFILES[profile]);
        await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled());
        const tree = await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.measure([]).inputTree);
        const treeFile = `${evidence.directory}/${family}-${profile}-${viewport.id}-input-tree.json`, treeBytes = Buffer.from(JSON.stringify(tree));
        writeFileSync(treeFile, treeBytes, { flag: 'wx' });
        const observation = await page.evaluate(async () => {
          const component = window.ng.getComponent(document.querySelector('app-astylar-showcase'));
          const surface = component.surface, scene = surface.scene, engine = scene.getEngine();
          const text = surface.host.inspection.textRenderingService;
          const snapshot = () => ({ tracked: surface.diagnostics.resources,
            live: { meshes: scene.meshes.length, materials: scene.materials.length, textures: scene.textures.length },
            cache: text.getCacheStats().size, loaded: engine.getLoadedTexturesCache().length,
            unbound: scene.materials.filter(material => !scene.meshes.some(mesh => mesh.material === material)).map(material => ({ name: material.name, uniqueId: material.uniqueId })),
            session: surface.diagnostics.session, plugins: surface.diagnostics.pluginResources });
          const snapshots = [snapshot()];
          for (let update = 0; update < 3; update++) {
            await surface.update(component.siteData()); await surface.whenSettled();
            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); snapshots.push(snapshot());
          }
          surface.dispose(); await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          return { snapshots, disposal: { surface: surface.disposed, scene: scene.isDisposed, engine: engine.isDisposed,
            live: { meshes: scene.meshes.length, materials: scene.materials.length, textures: scene.textures.length },
            cache: text.getCacheStats().size, loaded: engine.getLoadedTexturesCache().length, plugins: surface.diagnostics.pluginResources } };
        });
        results.push({ family, profile, viewport, appliedTheme, inputTree: { file: treeFile, sha256: hash(treeBytes) }, ...observation, runtime: await finishRuntime() });
        console.log(JSON.stringify({ family, profile, viewport: viewport.id }));
      } finally { await page.close(); }
    }
    const report = { schemaVersion: 1, browser: browser.version(), capture: evidence.capture,
      themeSource: { file: themeFile, sha256: hash(readFileSync(themeFile)) }, results,
      scope: 'Candidate-only retained-build ordinary equivalent-update/live-count/final-disposal observations. Actual themes;not native lifetime,late completion,remount,peer isolation,paint,current source or whole-case acceptance.' };
    const file = `${evidence.directory}/latest-report.json`; writeFileSync(file, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
    console.log(JSON.stringify(verify(report, file)));
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
}
