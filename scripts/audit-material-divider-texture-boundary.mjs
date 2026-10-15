import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { PNG } from 'pngjs';
import { fingerprintDirectory, materialBrowserLaunchOptions, inspectMaterialBrowserLaunch, materialCaseKey } from '../tests/material-parity/run-checkpoint.mjs';
import { openSupplementalCapture } from '../tests/material-parity/supplemental-capture-evidence.mjs';

const script = 'scripts/audit-material-divider-texture-boundary.mjs', hash = bytes => createHash('sha256').update(bytes).digest('hex');
const baselineFile = 'artifacts/material-parity/divider-alignment-provenance-20261015/latest-report.json';
assert.equal(hash(readFileSync(baselineFile)), '4be9c6d199952f35203f31d08def08d0d936071f4eb313b75ad3bbf72dd46f11');
const baseline = JSON.parse(readFileSync(baselineFile));
const selected = [...baseline.results.map(row => ['static', row]), ...baseline.interactions.map(row => ['interaction', row])]
  .filter(([, row]) => row.profile === 'contrast' && row.viewport.deviceScaleFactor === 1);
assert.equal(selected.length, 4);
const output = path.resolve(process.argv[2] ?? '');
assert.ok(output.startsWith(path.resolve('artifacts/material-parity') + path.sep) && !existsSync(output));
const root = path.resolve('examples/material-showcase/dist/material-showcase/browser');
assert.deepEqual(fingerprintDirectory(root), baseline.captureProvenance.browserFiles);
const server = createServer((request, response) => {
  const file = path.resolve(root, new URL(request.url, 'http://localhost').pathname.slice(1));
  const target = file.startsWith(root + path.sep) && path.extname(file) && existsSync(file) ? file : path.join(root, 'index.csr.html');
  response.setHeader('content-type', { '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2' }[path.extname(target)] ?? 'text/html');
  response.end(readFileSync(target));
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}`, launch = materialBrowserLaunchOptions(), results = [];
let browser;
try {
  browser = await chromium.launch(launch);
  assert.equal(browser.version(), baseline.browser.version);
  assert.deepEqual(await inspectMaterialBrowserLaunch(browser, launch), baseline.captureProvenance.browserLaunch);
  const evidence = openSupplementalCapture({ options: { baseUrl,
    checkpoint: path.dirname(baselineFile) + '/checkpoint', output }, browser, script, styleProperties: [] });
  for (const [kind, row] of selected) {
    const label = `${kind}-${row.viewport.id}`, page = await browser.newPage({
      viewport: { width: row.viewport.width, height: row.viewport.height }, deviceScaleFactor: 1, colorScheme: 'light', reducedMotion: 'reduce' });
    const finish = evidence.observe(page);
    try {
      await page.goto(`${baseUrl}/astylar/divider?benchmark=1&profile=contrast${kind === 'interaction' ? '&interaction=inspect' : ''}`);
      await page.waitForFunction(() => !!window.__ASTYLAR_MATERIAL_BENCHMARK__);
      await page.evaluate(async () => { await document.fonts.ready; await window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled();
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); });
      const screenshot = await page.screenshot({ animations: 'disabled' }), actual = PNG.sync.read(screenshot);
      const originalFile = row.inputTrees.astylar.file.replace(/-input-tree\.json$/, '.png');
      const original = PNG.sync.read(readFileSync(originalFile));
      if (hash(actual.data) !== hash(original.data)) writeFileSync(path.join(output, `${label}-different-frame.png`), screenshot, { flag: 'wx' });
      assert.equal(hash(actual.data), hash(original.data), 'Live observer frame differs from source-bound failing capture');
      const observation = await page.evaluate(async () => {
        const surface = window.ng.getComponent(document.querySelector('astylar-surface')).surface();
        const scene = surface.scene, engine = scene.getEngine(), canvas = engine.getRenderingCanvas(), camera = scene.activeCamera;
        const gl = engine._gl;
        const beforeSamples = gl.getParameter(gl.SAMPLES), targets = [];
        for (const id of ['divider-above', 'divider-below']) {
          const meshes = scene.meshes.filter(mesh => mesh.metadata?.elementId === id && mesh.metadata?.isTextMesh);
          if (meshes.length !== 1) throw Error('Ambiguous text mesh ' + id);
          const mesh = meshes[0], material = mesh.material, texture = material.diffuseTexture;
          const context = texture.getContext(), size = texture.getSize(), backing = context.canvas;
          const rgba = Array.from(context.getImageData(0, 0, backing.width, backing.height).data);
          const gpu = await texture.readPixels();
          if (!gpu) throw Error('Missing GPU texture readback');
          const positions = Array.from(mesh.getVerticesData('position')), Vector = mesh.position.constructor;
          const viewport = camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight());
          const projected = [];
          for (let index = 0; index < positions.length; index += 3) {
            const point = Vector.Project(new Vector(...positions.slice(index, index + 3)), mesh.getWorldMatrix(), scene.getTransformMatrix(), viewport);
            projected.push({ device: { x: point.x, y: point.y, z: point.z }, css: {
              x: point.x / (engine.getRenderWidth() / canvas.clientWidth), y: point.y / (engine.getRenderHeight() / canvas.clientHeight) } });
          }
          targets.push({ id, meshName: mesh.name, textDimensions: mesh.metadata.textDimensions,
            retainedStyle: mesh.metadata.astylarResolvedStyle, positions, uvs: Array.from(mesh.getVerticesData('uv')),
            indices: Array.from(mesh.getIndices()), projected, world: Array.from(mesh.getWorldMatrix().asArray()),
            viewProjection: Array.from(scene.getTransformMatrix().asArray()),
            texture: { size, canvas: { width: backing.width, height: backing.height }, samplingMode: texture.samplingMode,
              invertY: texture.invertY, hasAlpha: texture.hasAlpha, gammaSpace: texture.gammaSpace,
              uScale: texture.uScale, vScale: texture.vScale, uOffset: texture.uOffset, vOffset: texture.vOffset,
              matrix: Array.from(texture.getTextureMatrix().asArray()), font: context.font, baseline: context.textBaseline,
              textAlign: context.textAlign, transform: context.getTransform().toJSON(), rgba, gpuRGBA: Array.from(gpu) },
            material: { alpha: material.alpha, alphaMode: material.alphaMode, useAlphaFromDiffuseTexture: material.useAlphaFromDiffuseTexture,
              disableLighting: material.disableLighting, diffuse: material.diffuseColor.asArray(), emissive: material.emissiveColor.asArray() } });
        }
        return { theme: window.ng.getComponent(document.querySelector('app-astylar-showcase')).store.theme(),
          dpr: devicePixelRatio, viewport: { width: canvas.clientWidth, height: canvas.clientHeight },
          renderSize: { width: engine.getRenderWidth(), height: engine.getRenderHeight() },
          antialias: gl.getContextAttributes().antialias, samplesBeforeRead: beforeSamples,
          samplesAfterRead: gl.getParameter(gl.SAMPLES), measurement: window.__ASTYLAR_MATERIAL_BENCHMARK__.measure(['divider-above', 'divider-below']), targets };
      });
      const runtime = await finish();
      for (const target of observation.targets) for (const [name, pixels] of [['canvas', target.texture.rgba], ['gpu-readback', target.texture.gpuRGBA]]) {
        const size = target.texture.size; assert.equal(pixels.length, size.width * size.height * 4);
        const image = new PNG(size); image.data.set(pixels);
        writeFileSync(path.join(output, `${label}-${target.id}-${name}.png`), PNG.sync.write(image), { flag: 'wx' });
      }
      results.push({ case: materialCaseKey(kind, row), originalFrame: { file: originalFile, sha256: hash(readFileSync(originalFile)), decodedRGBA: hash(original.data) },
        observation, runtime });
      writeFileSync(path.join(output, `${label}-observations.json`), JSON.stringify(results.at(-1), null, 2), { flag: 'wx' });
    } finally { await page.close(); }
  }
  assert.deepEqual(fingerprintDirectory(root), baseline.captureProvenance.browserFiles);
  writeFileSync(path.join(output, 'latest-report.json'), JSON.stringify({ capture: evidence.capture, baseline: { file: baselineFile, sha256: hash(readFileSync(baselineFile)) }, results,
    boundary: 'Read-only configured contrast DPR1 text texture/UV/projection observations with identical full-frame RGBA. Raw GPU row order is retained without inferred orientation. Not native glyph equality,causal sampling intervention or full-case acceptance.' }, null, 2), { flag: 'wx' });
  console.log(JSON.stringify({ cases: results.length, targets: results.reduce((count, row) => count + row.observation.targets.length, 0), output }));
} finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
