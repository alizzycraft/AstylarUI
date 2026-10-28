import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { PNG } from 'pngjs';
import { materialBrowserLaunchOptions, inspectMaterialBrowserLaunch, fingerprintModuleGraph, openMaterialCheckpoint } from '../tests/material-parity/run-checkpoint.mjs';
import { openSupplementalCapture } from '../tests/material-parity/supplemental-capture-evidence.mjs';

const script = 'scripts/audit-material-badge-texture-observation.mjs';
const hash = b => createHash('sha256').update(b).digest('hex');
const baselineFile = 'artifacts/material-parity/current-full-20261005/latest-report.json';
const baselineBytes = readFileSync(baselineFile);
assert.equal(hash(baselineBytes), 'ab42dbec6280e0e27784ec4bbc6697d4ea451bfab307bccb720c0dec89a83b62');
const baseline = JSON.parse(baselineBytes);
const manifestFile = 'artifacts/material-parity/current-full-20261005/checkpoint/manifest.json';
const manifestBytes = readFileSync(manifestFile), old = JSON.parse(manifestBytes);
assert.equal(hash(manifestBytes), '7ae2cba1739353661a0c84e28ef70819157311cc824fd00ae94ced29fadeb352');
const root = path.resolve('artifacts/material-parity/icon-fresh-producer-retained-build-20261016-browser');
const browserFiles = old.provenance.browserFiles;
assert.equal(browserFiles.length, 1887);
for (const f of browserFiles) {
  assert.ok(!path.isAbsolute(f.file) && !f.file.split(/[\\/]/).includes('..'));
  assert.equal(hash(readFileSync(path.join(root, f.file))), f.sha256);
}
const output = path.resolve(process.argv[2] ?? '');
assert.ok(output.startsWith(path.resolve('artifacts/material-parity') + path.sep));
assert.ok(!existsSync(output) && !existsSync(output + '-checkpoint'));
const known = new Set(browserFiles.map(f => f.file));
const server = createServer((req, res) => {
  const name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/^\/+/, '');
  const file = path.join(root, known.has(name) ? name : 'index.csr.html');
  res.setHeader('content-type', { '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2' }[path.extname(file)] ?? 'text/html');
  res.end(readFileSync(file));
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
let browser;
try {
  const launch = materialBrowserLaunchOptions(); browser = await chromium.launch(launch);
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  openMaterialCheckpoint({ directory: output + '-checkpoint', provenance: { browser: browser.version(),
    browserLaunch: await inspectMaterialBrowserLaunch(browser, launch), browserFiles, harness: fingerprintModuleGraph(process.cwd(), script) } });
  const evidence = openSupplementalCapture({ options: { baseUrl, checkpoint: output + '-checkpoint/checkpoint', output }, browser, script, styleProperties: [] });
  const results = [];
  for (const dpr of [1, 2]) for (const side of ['reference', 'astylar']) {
    const row = baseline.interactions.find(r => r.family === 'badge' && r.profile === 'contrast' && r.viewport.deviceScaleFactor === dpr && r.state === 'focus');
    assert.ok(row);
    const page = await browser.newPage({ viewport: { width: row.viewport.width, height: row.viewport.height }, deviceScaleFactor: dpr, reducedMotion: 'reduce' });
    const finish = evidence.observe(page);
    try {
      await page.goto(`${baseUrl}/${side}/badge?benchmark=1&profile=contrast&interaction=inspect`);
      await page.locator('.frame').waitFor();
      if (side === 'astylar') await page.waitForFunction(() => !!window.__ASTYLAR_MATERIAL_BENCHMARK__);
      await page.evaluate(async () => { await document.fonts.ready; await window.__ASTYLAR_MATERIAL_BENCHMARK__?.waitForSettled();
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); });
      const observation = await page.evaluate(side => {
        const component = window.ng.getComponent(document.querySelector(side === 'reference' ? 'app-reference' : 'app-astylar-showcase'));
        const theme = component.store.theme();
        if (side === 'reference') {
          const node = document.querySelector('#badge-label'), range = document.createRange(); range.selectNodeContents(node);
          const style = getComputedStyle(node);
          return { theme, element: node.getBoundingClientRect().toJSON(), textRange: range.getBoundingClientRect().toJSON(),
            style: Object.fromEntries(['fontFamily','fontSize','fontWeight','color','lineHeight','whiteSpace'].map(k => [k,style[k]])) };
        }
        const surface = window.ng.getComponent(document.querySelector('astylar-surface')).surface(), scene = surface.scene;
        const engine = scene.getEngine(), canvas = engine.getRenderingCanvas(), camera = scene.activeCamera;
        const meshes = scene.meshes.filter(m => m.metadata?.elementId === 'badge-label' && m.metadata?.isTextMesh);
        if (meshes.length !== 1) throw Error('Expected one label text mesh');
        const mesh = meshes[0], texture = mesh.material.diffuseTexture, context = texture.getContext();
        const Vector = mesh.position.constructor, positions = mesh.getVerticesData('position'), projected = [];
        for (let i=0;i<positions.length;i+=3) {
          const p = Vector.Project(new Vector(...positions.slice(i,i+3)), mesh.getWorldMatrix(), scene.getTransformMatrix(), camera.viewport.toGlobal(engine.getRenderWidth(),engine.getRenderHeight()));
          projected.push({x:p.x,y:p.y});
        }
        return { theme, measurement: window.__ASTYLAR_MATERIAL_BENCHMARK__.measure(['badge-label','badge-count']), projected,
          textDimensions: mesh.metadata.textDimensions, renderSize: {width:engine.getRenderWidth(),height:engine.getRenderHeight()},
          canvasSize: {width:canvas.clientWidth,height:canvas.clientHeight}, texture: {size:texture.getSize(), font:context.font,
            baseline:context.textBaseline, transform:context.getTransform().toJSON(), samplingMode:texture.samplingMode,
            rgba:Array.from(context.getImageData(0,0,context.canvas.width,context.canvas.height).data)} };
      }, side);
      const shot = await page.screenshot({animations:'disabled'}), image = PNG.sync.read(shot);
      const originalFile = row.inputTrees[side].file.replace(/-input-tree\.json$/, '.png');
      const original = PNG.sync.read(readFileSync(originalFile));
      const screenshot = path.join(output, `${side}-dpr${dpr}.png`); writeFileSync(screenshot,shot,{flag:'wx'});
      results.push({side,dpr,observation,runtime:await finish(),screenshot:{file:screenshot,sha256:hash(shot)},
        originalFile,identicalFullFrame:hash(image.data)===hash(original.data)});
    } finally {await page.close();}
  }
  writeFileSync(path.join(output,'latest-report.json'),JSON.stringify({capture:evidence.capture,baseline:{file:baselineFile,sha256:hash(baselineBytes)},
    originalBrowser:old.provenance.browser,currentBrowser:browser.version(),results,
    boundary:'Retained assets in a new browser; initial inspect state,not original focus replay. No original-case or current-source rendering acceptance.'}),{flag:'wx'});
  console.log(JSON.stringify({output,contexts:results.length,identicalFullFrames:results.filter(r=>r.identicalFullFrame).length}));
} finally {if(browser)await browser.close();await new Promise(r=>server.close(r));}
