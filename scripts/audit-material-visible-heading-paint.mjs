import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { chromium } from 'playwright-core';
import { PNG } from 'pngjs';
import { captureBrowserInputTree } from '../tests/material-parity/input-tree-evidence.mjs';
import { propertyGroups } from '../tests/material-parity/input-equivalence-policy.mjs';
import { evaluateFocusedRaster } from '../tests/material-parity/focused-raster-metrics.mjs';
import { openSupplementalCapture, validateSupplementalCapture } from '../tests/material-parity/supplemental-capture-evidence.mjs';
import { fingerprintModuleGraph, materialBrowserLaunchOptions, inspectMaterialBrowserLaunch, openMaterialCheckpoint } from '../tests/material-parity/run-checkpoint.mjs';

// Diagnostic for the demonstrated missing measured,unmasked heading boundary.
// Ordinary showcase mode changes no fixture styles or reference truth.
const script = 'scripts/audit-material-visible-heading-paint.mjs';
const hash = value => createHash('sha256').update(value).digest('hex');
const properties = Object.values(propertyGroups).flat();
const themeFile = 'examples/material-showcase/src/app/theme.ts', themes = {};
new Function('exports', ts.transpileModule(readFileSync(themeFile, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText)(themes);
const viewports = [
  { id: 'desktop-dpr1', width: 1440, height: 1000, deviceScaleFactor: 1 },
  { id: 'desktop-dpr2', width: 1440, height: 1000, deviceScaleFactor: 2 },
  { id: 'tablet-dpr1', width: 768, height: 1024, deviceScaleFactor: 1 },
  { id: 'mobile-dpr2', width: 390, height: 844, deviceScaleFactor: 2 },
];
const profiles = ['light', 'dark', 'contrast', 'custom'], ids = ['eyebrow', 'title'];
function crop(image, b) {
  const width = b.right - b.left, height = b.bottom - b.top, data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) data.set(image.data.subarray(((b.top + y) * image.width + b.left) * 4,
    ((b.top + y) * image.width + b.right) * 4), y * width * 4);
  return { width, height, data };
}
function paint(row) {
  const images = Object.fromEntries(['reference', 'astylar'].map(side => {
    const receipt = row[side].screenshot, bytes = readFileSync(receipt.file); assert.equal(hash(bytes), receipt.sha256);
    return [side, PNG.sync.read(bytes)];
  }));
  assert.equal(images.reference.width, row.viewport.width * row.viewport.deviceScaleFactor);
  assert.equal(images.reference.height, row.viewport.height * row.viewport.deviceScaleFactor);
  assert.equal(images.astylar.width, images.reference.width); assert.equal(images.astylar.height, images.reference.height);
  return Object.fromEntries(ids.map(id => {
    const boxes = ['reference', 'astylar'].map(side => row[side].headings[id].viewportBox);
    for (const box of boxes) {
      assert.ok(['left', 'top', 'right', 'bottom', 'width', 'height'].every(k => Number.isFinite(box[k])));
      assert.ok(box.width > 0 && box.height > 0 && box.right > box.left && box.bottom > box.top);
    }
    const dpr = row.viewport.deviceScaleFactor, b = {
      left: Math.max(0, Math.floor((Math.min(...boxes.map(b => b.left)) - 8) * dpr)),
      top: Math.max(0, Math.floor((Math.min(...boxes.map(b => b.top)) - 8) * dpr)),
      right: Math.min(images.reference.width, Math.ceil((Math.max(...boxes.map(b => b.right)) + 8) * dpr)),
      bottom: Math.min(images.reference.height, Math.ceil((Math.max(...boxes.map(b => b.bottom)) + 8) * dpr)),
    };
    assert.ok(b.right > b.left && b.bottom > b.top);
    return [id, { bounds: b, metrics: evaluateFocusedRaster(crop(images.reference, b), crop(images.astylar, b)),
      boundary: 'Measured owner union+8CSSpx;diagnostic defaults,not a newly configured release gate or equal-input renderer attribution.' }];
  }));
}
function verify(raw, file) {
  const manifest = JSON.parse(readFileSync(raw.capture.checkpointManifest.file));
  assert.deepEqual(validateSupplementalCapture(raw, { reportFile: file, expectedProvenance: manifest.provenance,
    script, styleProperties: properties }), { status: 'checkpoint-bound', errors: [] });
  assert.equal(hash(readFileSync(raw.themeSource.file)), raw.themeSource.sha256);
  assert.deepEqual(raw.results.map(r => `${r.profile}/${r.viewport.id}`), profiles.flatMap(p => viewports.map(v => `${p}/${v.id}`)));
  for (const row of raw.results) {
    assert.equal(row.family, 'icon');
    assert.deepEqual(row.viewport, viewports.find(v => v.id === row.viewport.id));
    for (const side of ['reference', 'astylar']) {
      const observation = row[side], theme = themes.resolveTheme(themes.MATERIAL_THEME_PROFILES[row.profile]);
      assert.equal(observation.benchmarkMode, false);
      assert.deepEqual(observation.appliedTheme, themes.MATERIAL_THEME_PROFILES[row.profile]);
      const tree = JSON.parse(readFileSync(observation.inputTree.file)); assert.deepEqual(tree.errors, []);
      for (const id of ids) {
        const node = tree.nodes.find(n => side === 'reference' ? n.type === (id === 'eyebrow' ? 'p' : 'h1') : n.authored?.id === id);
        assert.ok(node); assert.equal(side === 'reference' ? node.ownText.trim() : node.authored.textContent,
          id === 'eyebrow' ? 'Angular Material 20 reference' : 'icon');
        const style = side === 'reference' ? tree.styles[node.style] : node.normalResolvedStyle;
        if (side === 'reference') assert.equal(style.opacity, '1');
        else assert.equal(style.color, id === 'eyebrow' ? theme.primary : theme.onSurface);
      }
    }
    assert.deepEqual(row.paint, paint(row));
  }
  return { contexts: 16, measuredHeadingPairs: 32, currentRenderingAccepted: false };
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
      const row = { family: 'icon', profile, viewport };
      for (const side of ['reference', 'astylar']) {
        const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: viewport.deviceScaleFactor });
        const finishRuntime = evidence.observe(page);
        try {
          await page.goto(`${baseUrl}/${side}/icon`); await page.locator('.frame').waitFor();
          if (side === 'astylar') await page.waitForFunction(() => !!window.__ASTYLAR_MATERIAL_BENCHMARK__);
          await page.evaluate(({ side, theme }) => {
            const component = window.ng.getComponent(document.querySelector(side === 'reference' ? 'app-reference' : 'app-astylar-showcase'));
            component.store.setTheme(theme); window.ng.applyChanges(component);
          }, { side, theme: themes.MATERIAL_THEME_PROFILES[profile] });
          if (side === 'astylar') await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled());
          await page.evaluate(async () => { await document.fonts.ready; await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); });
          const measured = await page.evaluate(side => {
            const component = window.ng.getComponent(document.querySelector(side === 'reference' ? 'app-reference' : 'app-astylar-showcase'));
            const rect = b => ({ left: b.left, top: b.top, right: b.right, bottom: b.bottom, width: b.width, height: b.height });
            const measurement = side === 'astylar' ? window.__ASTYLAR_MATERIAL_BENCHMARK__.measure(['eyebrow', 'title']) : null;
            const canvas = side === 'astylar' ? document.querySelector('canvas').getBoundingClientRect() : null;
            const headings = Object.fromEntries(['eyebrow', 'title'].map(id => {
              if (side === 'reference') return [id, { viewportBox: rect(document.querySelector(id === 'eyebrow' ? '.frame p' : '.frame h1').getBoundingClientRect()) }];
              const owner = measurement.elements[id]; if (!owner?.exists) throw new Error(`Missing measured heading:${id}`);
              const b = owner.borderBox;
              return [id, { viewportBox: { ...b, left: b.left + canvas.left, right: b.right + canvas.left,
                top: b.top + canvas.top, bottom: b.bottom + canvas.top }, canvasBox: rect(canvas), owner }];
            }));
            return { appliedTheme: component.store.theme(), benchmarkMode: new URLSearchParams(location.search).get('benchmark') === '1',
              headings, ...(measurement ? { inputTree: measurement.inputTree } : {}) };
          }, side);
          const tree = side === 'reference' ? await page.evaluate(captureBrowserInputTree, { styleProperties: properties }) : measured.inputTree;
          delete measured.inputTree;
          const stem = `${evidence.directory}/${profile}-${viewport.id}-${side}`, treeBytes = Buffer.from(JSON.stringify(tree)), pixels = await page.screenshot({ animations: 'allow' });
          writeFileSync(stem + '-input-tree.json', treeBytes, { flag: 'wx' }); writeFileSync(stem + '.png', pixels, { flag: 'wx' });
          row[side] = { ...measured, runtime: await finishRuntime(), inputTree: { file: stem + '-input-tree.json', sha256: hash(treeBytes) }, screenshot: { file: stem + '.png', sha256: hash(pixels) } };
        } finally { await page.close(); }
      }
      row.paint = paint(row); results.push(row); console.log(JSON.stringify({ profile, viewport: viewport.id, diagnostics: row.paint }));
    }
    const report = { schemaVersion: 1, browser: browser.version(), capture: evidence.capture,
      themeSource: { file: themeFile, sha256: hash(readFileSync(themeFile)) }, results,
      scope: 'Ordinary unmasked Icon heading owner measurements and pixels across16contexts;retained build,not current full matrix or equivalent-input acceptance.' };
    const file = `${evidence.directory}/latest-report.json`; writeFileSync(file, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
    console.log(JSON.stringify(verify(report, file)));
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
}
