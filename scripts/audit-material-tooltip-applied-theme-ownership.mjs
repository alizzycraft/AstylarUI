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
import { fingerprintModuleGraph, materialBrowserLaunchOptions,
  inspectMaterialBrowserLaunch, openMaterialCheckpoint } from '../tests/material-parity/run-checkpoint.mjs';

// Missing ACTUAL-theme evidence only. Historical requested-profile runs remain
// unchanged. Ordinary mode is essential:benchmark mode has different tooltip behavior.
const script = 'scripts/audit-material-tooltip-applied-theme-ownership.mjs';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const properties = Object.values(propertyGroups).flat();
const themeFile = 'examples/material-showcase/src/app/theme.ts';
const themes = {};
new Function('exports', ts.transpileModule(readFileSync(themeFile, 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText)(themes);
const shortBoundary = process.argv.includes('--short-boundary');
assert.equal(process.argv.filter(arg => arg === '--short-boundary').length, Number(shortBoundary));
const depthPair = process.argv.includes('--paint-depth-pair');
assert.equal(process.argv.filter(arg => arg === '--paint-depth-pair').length, Number(depthPair));
assert.ok(!depthPair || shortBoundary, '--paint-depth-pair requires --short-boundary');
const defaultViewports = [
  { id: 'desktop-dpr1', width: 1440, height: 1000, deviceScaleFactor: 1 },
  { id: 'desktop-dpr2', width: 1440, height: 1000, deviceScaleFactor: 2 },
  { id: 'tablet-dpr1', width: 768, height: 1024, deviceScaleFactor: 1 },
  { id: 'mobile-dpr2', width: 390, height: 844, deviceScaleFactor: 2 },
];
const viewports = shortBoundary ? [
  { id: 'tall-dpr1', width: 900, height: 1000, deviceScaleFactor: 1 },
  { id: 'short-dpr1', width: 900, height: 240, deviceScaleFactor: 1 },
  { id: 'tall-dpr2', width: 900, height: 1000, deviceScaleFactor: 2 },
  { id: 'short-dpr2', width: 900, height: 240, deviceScaleFactor: 2 },
] : defaultViewports;
const activeViewports = depthPair ? viewports.filter(viewport => viewport.deviceScaleFactor === 1) : viewports;
const profiles = depthPair ? ['contrast'] : ['dark', 'contrast', 'custom'];
function verify(raw, file) {
  assert.equal(raw.kind, depthPair ? 'actual-theme-tooltip-paint-depth-pair'
    : shortBoundary ? 'actual-theme-tooltip-short-boundary' : undefined);
  const manifest = JSON.parse(readFileSync(raw.capture.checkpointManifest.file));
  assert.deepEqual(validateSupplementalCapture(raw, { reportFile: file,
    expectedProvenance: manifest.provenance, script, styleProperties: properties }),
  { status: 'checkpoint-bound', errors: [] });
  assert.equal(raw.themeSource.sha256, hash(readFileSync(raw.themeSource.file)));
  const expected = profiles.flatMap(profile => activeViewports.map(v => `${profile}/${v.id}`));
  assert.deepEqual(raw.results.map(r => `${r.profile}/${r.viewport.id}`), expected);
  for (const row of raw.results) for (const side of ['reference', 'astylar']) {
    const observation = row[side];
    assert.deepEqual(observation.appliedTheme, themes.MATERIAL_THEME_PROFILES[row.profile]);
    assert.equal(observation.benchmarkMode, false);
    if (shortBoundary) {
      const open = observation.openBoundary;
      assert.ok(open && open.viewport.width === row.viewport.width && open.viewport.height === row.viewport.height);
      for (const box of [open.trigger, open.popup]) {
        for (const key of ['left', 'top', 'right', 'bottom', 'width', 'height']) assert.ok(Number.isFinite(box[key]));
        assert.ok(box.width > 0 && box.height > 0);
      }
      for (const receipt of [open.inputTree, open.screenshot]) assert.equal(hash(readFileSync(receipt.file)), receipt.sha256);
      assert.deepEqual(JSON.parse(readFileSync(open.inputTree.file)).errors, []);
      if (depthPair && side === 'astylar') {
        assert.equal(open.opened, true);
        assert.ok(Number.isFinite(open.paintDepth?.meshZ) && Number.isFinite(open.camera?.position?.z));
        for (const key of ['enabled', 'visible']) assert.equal(typeof open.paintDepth[key], 'boolean');
        assert.ok(Number.isFinite(open.paintDepth.visibility));
        assert.equal(open.canvas.width, row.viewport.width); assert.equal(open.canvas.height, row.viewport.height);
        assert.equal(open.drawingBuffer.width, row.viewport.width); assert.equal(open.drawingBuffer.height, row.viewport.height);
      }
    }
    const tree = JSON.parse(readFileSync(observation.inputTree.file));
    const surface = observation.appliedTheme.surface;
    assert.match(surface, /^#[0-9a-f]{6}$/i);
    if (side === 'reference') {
      const frame = tree.nodes.filter(n => n.attributes?.class?.split(' ').includes('frame'));
      assert.equal(frame.length, 1);
      const rgb = surface.slice(1).match(/../g).map(x => parseInt(x, 16));
      assert.equal(tree.styles[frame[0].style].backgroundColor, `rgb(${rgb.join(', ')})`);
    } else {
      const page = tree.nodes.filter(n => n.authored?.id === 'page');
      assert.equal(page.length, 1); assert.equal(page[0].normalResolvedStyle.background.toLowerCase(), surface.toLowerCase());
    }
    assert.equal(observation.cycles.length, 3);
    for (const cycle of observation.cycles) assert.equal(cycle.popupCount, 0);
    if (side === 'astylar') assert.deepEqual(observation.disposal,
      { disposed: true, meshes: 0, materials: 0, textures: 0 });
    const image = readFileSync(observation.screenshot.file);
    assert.equal(hash(image), observation.screenshot.sha256);
  }
  return { contexts: expected.length, pairedCycles: expected.length * 3, currentRenderingAccepted: false };
}
if (process.argv[2] === '--verify') {
  const file = process.argv[3];
  console.log(JSON.stringify(verify(JSON.parse(readFileSync(file)), file)));
} else {
  const output = path.resolve(process.argv[2] ?? '');
  assert.ok(output.startsWith(path.resolve('artifacts/material-parity') + path.sep));
  assert.ok(!existsSync(output) && !existsSync(output + '-checkpoint'));
  // Reuse the same retained application bytes as the completed input audit.
  const baseline = JSON.parse(readFileSync('artifacts/material-parity/current-full-20261005/checkpoint/manifest.json'));
  const browserFiles = baseline.provenance.browserFiles;
  const known = new Set(browserFiles.map(item => item.file));
  const assetPath = name => path.resolve(name === 'chunk-JPEJK334.js.map'
    ? 'artifacts/material-parity/retained-evidence/component-map-recovery-20261011/'
    : ['chunk-JPEJK334.js', 'main.js'].includes(name)
      ? 'artifacts/material-parity/retained-evidence/component-code-recovery-20261011/'
      : 'examples/material-showcase/.audit-historical-build-1275fa1d/dist/authenticated-replay/browser/', name);
  // Same explicit retained locations as verifyRetainedMaterialBrowserFiles,
  // without importing unrelated historical producer-replay graphs into capture.
  assert.equal(browserFiles.length, 1887);
  for (const item of browserFiles) {
    assert.ok(!path.isAbsolute(item.file) && !item.file.split(/[\\/]/).includes('..'));
    assert.equal(hash(readFileSync(assetPath(item.file))), item.sha256, item.file);
  }
  const server = createServer((req, res) => {
    const name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/^\/+/, '');
    const file = assetPath(known.has(name) ? name : 'index.csr.html');
    res.writeHead(200, { 'content-type': { '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2' }[path.extname(file)] ?? 'text/html', 'cache-control': 'no-store' });
    res.end(readFileSync(file));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const launch = materialBrowserLaunchOptions(), browser = await chromium.launch(launch);
  try {
    openMaterialCheckpoint({ directory: output + '-checkpoint', provenance: {
      browser: browser.version(), browserLaunch: await inspectMaterialBrowserLaunch(browser, launch),
      browserFiles, harness: fingerprintModuleGraph(process.cwd(), script),
    } });
    const evidence = openSupplementalCapture({ options: { baseUrl, checkpoint: output + '-checkpoint/checkpoint', output }, browser, script, styleProperties: properties });
    const results = [];
    for (const profile of profiles) for (const viewport of activeViewports) {
      const row = { family: 'tooltip', profile, viewport };
      for (const side of ['reference', 'astylar']) {
        const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: viewport.deviceScaleFactor });
        const finishRuntime = evidence.observe(page);
        try {
          await page.goto(`${baseUrl}/${side}/tooltip`);
          await page.locator('.frame').waitFor();
          if (side === 'astylar') await page.waitForFunction(() => !!window.__ASTYLAR_MATERIAL_BENCHMARK__);
          await page.evaluate(({ side, theme }) => {
            const component = window.ng.getComponent(document.querySelector(side === 'reference' ? 'app-reference' : 'app-astylar-showcase'));
            component.store.setTheme(theme); window.ng.applyChanges(component);
          }, { side, theme: themes.MATERIAL_THEME_PROFILES[profile] });
          const settle = async () => {
            if (side === 'astylar') await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled());
            await page.evaluate(async () => { await document.fonts.ready; await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); });
          };
          await settle();
          const setup = await page.evaluate(side => {
            const component = window.ng.getComponent(document.querySelector(side === 'reference' ? 'app-reference' : 'app-astylar-showcase'));
            return { appliedTheme: component.store.theme(), benchmarkMode: new URLSearchParams(location.search).get('benchmark') === '1' };
          }, side);
          assert.deepEqual(setup.appliedTheme, themes.MATERIAL_THEME_PROFILES[profile]);
          const point = await page.evaluate(side => {
            if (side === 'reference') { const b = document.getElementById('tooltip-primary').getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; }
            const b = window.__ASTYLAR_MATERIAL_BENCHMARK__.measure(['tooltip-primary'], false).elements['tooltip-primary'].borderBox;
            const c = document.querySelector('canvas').getBoundingClientRect(); return { x: c.x + b.left + b.width / 2, y: c.y + b.top + b.height / 2 };
          }, side);
          const selector = side === 'reference' ? '.mat-mdc-tooltip-surface' : '[data-astylar-id="tooltip-popup"]';
          const cycles = [];
          let openBoundary;
          for (let i = 0; i < 3; i++) {
            await page.mouse.move(point.x, point.y); await page.locator(selector).waitFor({ state: 'visible' }); await settle();
            assert.equal(await page.locator(selector).count(), 1);
            if (shortBoundary && i === 0) {
              openBoundary = await page.evaluate(({ side, depthPair }) => {
                const api = window.__ASTYLAR_MATERIAL_BENCHMARK__;
                const measurement = side === 'astylar' ? api.measure(['tooltip-primary', 'tooltip-popup'], false) : null;
                const rect = node => {
                  const b = node.getBoundingClientRect();
                  return { left: b.left, top: b.top, right: b.right, bottom: b.bottom, width: b.width, height: b.height };
                };
                const localRect = id => {
                  const b = measurement.elements[id].borderBox;
                  const canvas = document.querySelector('canvas').getBoundingClientRect();
                  const left = canvas.left + b.left, top = canvas.top + b.top;
                  return { left, top, right: left + b.width, bottom: top + b.height, width: b.width, height: b.height };
                };
                return { viewport: { width: innerWidth, height: innerHeight }, scrollY,
                  scrollHeight: document.documentElement.scrollHeight,
                  trigger: side === 'reference' ? rect(document.getElementById('tooltip-primary')) : localRect('tooltip-primary'),
                  popup: side === 'reference' ? rect(document.querySelector('.mat-mdc-tooltip-surface')) : localRect('tooltip-popup'),
                  ...(depthPair && side === 'astylar' ? {
                    opened: api.state().open, paintDepth: measurement.elements['tooltip-popup'].paintDepth,
                    camera: measurement.diagnostics.camera, canvas: rect(document.querySelector('canvas')),
                    drawingBuffer: { width: document.querySelector('canvas').width, height: document.querySelector('canvas').height },
                  } : {}) };
              }, { side, depthPair });
              const openTree = side === 'reference' ? await page.evaluate(captureBrowserInputTree, { styleProperties: properties })
                : await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.measure([]).inputTree);
              const stem = `${evidence.directory}/${profile}-${viewport.id}-${side}-open`;
              const treeBytes = Buffer.from(JSON.stringify(openTree)), pixels = await page.screenshot({ animations: 'allow' });
              writeFileSync(stem + '-input-tree.json', treeBytes, { flag: 'wx' });
              writeFileSync(stem + '.png', pixels, { flag: 'wx' });
              openBoundary.inputTree = { file: stem + '-input-tree.json', sha256: hash(treeBytes) };
              openBoundary.screenshot = { file: stem + '.png', sha256: hash(pixels) };
            }
            await page.mouse.move(10, 10); await page.locator(selector).waitFor({ state: 'detached' }); await settle();
            cycles.push(await page.evaluate(side => {
              if (side === 'reference') return { popupCount: document.querySelectorAll('.mat-mdc-tooltip-surface').length };
              const s = window.ng.getComponent(document.querySelector('app-astylar-showcase')).surface, scene = s.scene;
              return { popupCount: document.querySelectorAll('[data-astylar-id="tooltip-popup"]').length, tracked: s.diagnostics.resources,
                live: { meshes: scene.meshes.length, materials: scene.materials.length, textures: scene.textures.length },
                unbound: scene.materials.filter(m => !scene.meshes.some(mesh => mesh.material === m)).map(m => ({ name: m.name, uniqueId: m.uniqueId })) };
            }, side));
          }
          const tree = side === 'reference' ? await page.evaluate(captureBrowserInputTree, { styleProperties: properties })
            : await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.measure([]).inputTree);
          const stem = `${evidence.directory}/${profile}-${viewport.id}-${side}`, treeBytes = Buffer.from(JSON.stringify(tree)), pixels = await page.screenshot({ animations: 'allow' });
          writeFileSync(stem + '-input-tree.json', treeBytes, { flag: 'wx' }); writeFileSync(stem + '.png', pixels, { flag: 'wx' });
          const disposal = side === 'astylar' ? await page.evaluate(() => { const s = window.ng.getComponent(document.querySelector('app-astylar-showcase')).surface, scene = s.scene; s.dispose(); return { disposed: s.disposed, meshes: scene.meshes.length, materials: scene.materials.length, textures: scene.textures.length }; }) : null;
          row[side] = { ...setup, cycles, ...(shortBoundary ? { openBoundary } : {}), disposal, runtime: await finishRuntime(), inputTree: { file: stem + '-input-tree.json', sha256: hash(treeBytes) }, screenshot: { file: stem + '.png', sha256: hash(pixels) } };
        } finally { await page.close(); }
      }
      results.push(row); console.log(JSON.stringify({ profile, viewport: viewport.id, live: row.astylar.cycles.map(x => x.live.materials) }));
    }
    const report = { schemaVersion: 1, ...(shortBoundary ? { kind: depthPair ? 'actual-theme-tooltip-paint-depth-pair' : 'actual-theme-tooltip-short-boundary' } : {}), browser: browser.version(), capture: evidence.capture, themeSource: { file: themeFile, sha256: hash(readFileSync(themeFile)) }, results,
      scope: shortBoundary ? 'Twelve ordinary actual-theme tall/short fallback contexts with retained open geometry/trees/rasters. Frozen application;not equal inputs,current renderer,complete scroll/lifetime or rendering acceptance.'
        : 'Twelve missing ordinary applied-theme pointer-cycle contexts;not all states,paint,async,remount,GPU or rendering acceptance.' };
    const file = `${evidence.directory}/latest-report.json`; writeFileSync(file, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
    console.log(JSON.stringify(verify(report, file)));
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
}
