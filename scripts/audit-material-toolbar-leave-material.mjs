import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { chromium } from 'playwright-core';
import { fingerprintDirectory, materialBrowserLaunchOptions, inspectMaterialBrowserLaunch } from '../tests/material-parity/run-checkpoint.mjs';

// One-context read-only diagnostic using the established authenticated build.
// No CSS, fixture, pointer handler, material, or render scheduling is patched.
const hash = b => createHash('sha256').update(b).digest('hex');
const output = path.resolve(process.argv[2] ?? '');
assert.ok(output.startsWith(path.resolve('artifacts/material-parity') + path.sep));
assert.ok(!fs.existsSync(output), 'Preserve previous evidence');
const root = path.resolve('examples/material-showcase/dist/material-showcase/browser');
const baselineBytes = fs.readFileSync('artifacts/material-parity/divider-alignment-provenance-20261015/latest-report.json');
assert.equal(hash(baselineBytes), '4be9c6d199952f35203f31d08def08d0d936071f4eb313b75ad3bbf72dd46f11');
const files = fingerprintDirectory(root);
assert.deepEqual(files, JSON.parse(baselineBytes).captureProvenance.browserFiles);
const expected = new Map(files.map(x => [x.file, x.sha256]));
const server = createServer((req, res) => {
  const file = path.resolve(root, new URL(req.url, 'http://localhost').pathname.slice(1));
  const target = file.startsWith(root + path.sep) && path.extname(file) && fs.existsSync(file)
    ? file : path.join(root, 'index.csr.html');
  res.setHeader('content-type', ({ '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2' })[path.extname(target)] ?? 'text/html');
  res.end(fs.readFileSync(target));
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
fs.mkdirSync(output);
let browser;
const observations = [], errors = [], assets = [], pending = [];
try {
  browser = await chromium.launch(materialBrowserLaunchOptions());
  const launch = await inspectMaterialBrowserLaunch(browser);
  for (const side of ['reference', 'astylar']) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    page.on('pageerror', e => errors.push(String(e)));
    page.on('response', response => {
      if (!['document', 'script', 'stylesheet', 'font'].includes(response.request().resourceType())) return;
      pending.push((async () => {
        const url = new URL(response.url());
        assert.equal(url.origin, `http://127.0.0.1:${server.address().port}`);
        const file = response.request().resourceType() === 'document' ? 'index.csr.html' : decodeURIComponent(url.pathname).slice(1);
        const sha256 = hash(await response.body());
        assert.equal(response.status(), 200); assert.equal(sha256, expected.get(file));
        assets.push({ side, file, sha256 });
      })());
    });
    try {
      await page.goto(`http://127.0.0.1:${server.address().port}/${side}/toolbar?benchmark=1&profile=contrast`);
      await page.waitForSelector(side === 'reference' ? '#toolbar-action' : 'astylar-surface');
      if (side === 'astylar') await page.waitForFunction(() => !!window.__ASTYLAR_MATERIAL_BENCHMARK__);
      const settle = () => page.evaluate(async () => {
        await document.fonts.ready;
        await window.__ASTYLAR_MATERIAL_BENCHMARK__?.waitForSettled();
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      });
      await settle();
      const snapshot = async state => {
        const data = await page.evaluate(side => {
          if (side === 'reference') {
            const host = document.getElementById('toolbar-action');
            const layer = host.querySelector('.mat-mdc-button-persistent-ripple');
            const style = getComputedStyle(layer, '::before');
            return { box: host.getBoundingClientRect().toJSON(), focused: document.activeElement?.id,
              hostBackground: getComputedStyle(host).backgroundColor, layer: { opacity: style.opacity, color: style.backgroundColor } };
          }
          const surface = window.ng.getComponent(document.querySelector('astylar-surface')).surface();
          const measurement = window.__ASTYLAR_MATERIAL_BENCHMARK__.measure(['toolbar-action']);
          const nodes = measurement.inputTree.nodes.filter(n => n.authored?.id === 'toolbar-action');
          const meshes = surface.scene.meshes.filter(m => m.metadata?.elementId === 'toolbar-action').map(m => ({
            name: m.name, text: !!m.metadata?.isTextMesh, enabled: m.isEnabled(), visible: m.isVisible,
            material: m.material ? { name: m.material.name, id: m.material.uniqueId, alpha: m.material.alpha,
              diffuse: m.material.diffuseColor?.asArray(), emissive: m.material.emissiveColor?.asArray() } : null,
          }));
          return { measurement, nodes, meshes, diagnostics: surface.diagnostics, frameId: surface.scene.getFrameId() };
        }, side);
        const file = path.join(output, `${side}-${state}.png`), png = await page.screenshot({ animations: 'disabled' });
        fs.writeFileSync(file, png, { flag: 'wx' });
        observations.push({ side, state, data, screenshot: { file, sha256: hash(png) } });
      };
      await snapshot('static');
      const box = side === 'reference' ? await page.locator('#toolbar-action').boundingBox() :
        await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.measure(['toolbar-action']).elements['toolbar-action'].borderBox);
      const x = (box.x ?? box.left) + box.width / 2, y = (box.y ?? box.top) + box.height / 2;
      await page.mouse.move(x, y); await settle(); await snapshot('hover');
      await page.mouse.down(); await page.mouse.up(); await page.mouse.move(1, 1);
      await settle(); await snapshot('leave');
      await page.waitForTimeout(300); await settle(); await snapshot('leave-later');
    } finally { await page.close(); }
  }
  await Promise.all(pending); assert.deepEqual(errors, []);
  const report = { browser: await browser.version(), launch, browserFiles: files, assets, observations, errors,
    script: { file: import.meta.filename, sha256: hash(fs.readFileSync(import.meta.filename)) },
    boundary: 'Authenticated retained served build,contrast desktop DPR1. Read-only scene observation after normal real-pointer actions and settlement. Not original session execution,current-source equivalence,public equal-input reduction or whole-case acceptance.' };
  fs.writeFileSync(path.join(output, 'latest-report.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ output, observations: observations.length, errors }));
} finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
