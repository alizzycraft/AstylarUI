import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { fingerprintDirectory, fingerprintModuleGraph, materialBrowserLaunchOptions,
  inspectMaterialBrowserLaunch, openMaterialCheckpoint } from '../tests/material-parity/run-checkpoint.mjs';
import { openSupplementalCapture } from '../tests/material-parity/supplemental-capture-evidence.mjs';

// Exact showcase SiteData through the existing public service,not a second
// renderer. Angular debug access obtains the handle;all mutations use public APIs.
const script = 'scripts/audit-material-divider-remount.mjs';
const output = path.resolve(process.argv[2] ?? '');
assert.ok(output.startsWith(path.resolve('artifacts/material-parity') + path.sep));
assert.ok(!existsSync(output) && !existsSync(output + '-checkpoint'));
const root = path.resolve('examples/material-showcase/dist/material-showcase/browser');
const browserFiles = fingerprintDirectory(root), hash = bytes => createHash('sha256').update(bytes).digest('hex');
const sourceReceipt = { file: script, sha256: hash(readFileSync(script)) };
const server = createServer((request, response) => {
  const file = path.resolve(root, new URL(request.url, 'http://localhost').pathname.replace(/^\/+/, ''));
  const target = file.startsWith(root + path.sep) && path.extname(file) && existsSync(file)
    ? file : path.join(root, 'index.csr.html');
  response.writeHead(200, { 'content-type': { '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2' }[path.extname(target)] ?? 'text/html',
    'cache-control': 'no-store' });
  response.end(readFileSync(target));
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}`, launch = materialBrowserLaunchOptions();
let browser;
const results = [];
try {
  browser = await chromium.launch(launch);
  const provenance = { browser: browser.version(), platform: process.platform, architecture: process.arch, node: process.version,
    browserLaunch: await inspectMaterialBrowserLaunch(browser, launch), browserFiles,
    harness: fingerprintModuleGraph(process.cwd(), script) };
  openMaterialCheckpoint({ directory: output + '-checkpoint', provenance });
  const evidence = openSupplementalCapture({ options: { baseUrl, checkpoint: output + '-checkpoint/checkpoint', output },
    browser, script, styleProperties: [] });
  for (const dpr of [1, 2]) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: dpr });
    const finish = evidence.observe(page);
    try {
      await page.goto(`${baseUrl}/astylar/divider?benchmark=1&profile=light`);
      await page.waitForFunction(() => !!window.__ASTYLAR_MATERIAL_BENCHMARK__);
      await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled());
      const observation = await page.evaluate(async () => {
        const component = window.ng.getComponent(document.querySelector('astylar-surface'));
        const showcase = window.ng.getComponent(document.querySelector('app-astylar-showcase'));
        const service = component.astylar, data = component.siteData(), options = component.options();
        if (typeof service?.mount !== 'function') throw Error('Public Astylar service bridge unavailable');
        const canvas = document.querySelector('astylar-surface canvas'), bounds = canvas.getBoundingClientRect();
        const peerCanvas = document.createElement('canvas');
        peerCanvas.style.cssText = `position:absolute;left:0;top:0;width:${bounds.width}px;height:${bounds.height}px;pointer-events:none`;
        canvas.parentElement.append(peerCanvas);
        const retired = [], steps = [];
        let current = component.surface(), peer;
        const snapshot = surface => {
          const diagnostics = surface.diagnostics, scene = surface.scene;
          const materials = new Set([...scene.materials, ...scene.multiMaterials]);
          return { disposed: surface.disposed, sceneDisposed: scene.isDisposed,
            revision: diagnostics.session?.revision, status: diagnostics.session?.status,
            tracked: diagnostics.resources ?? null, plugins: diagnostics.pluginResources,
            live: { meshes: scene.meshes.length, materials: scene.materials.length, textures: scene.textures.length },
            materialIds: scene.materials.map(value => value.uniqueId), textureIds: scene.textures.map(value => value.uniqueId),
            invalidMeshBindings: scene.meshes.filter(mesh => mesh.getScene() !== scene || mesh.material && !materials.has(mesh.material)).map(mesh => mesh.name),
            messages: diagnostics.messages };
        };
        const mark = label => steps.push({ label, current: snapshot(current), peer: peer ? snapshot(peer) : null,
          retired: retired.map(snapshot), distinctScenes: peer ? peer.scene !== current.scene : null });
        try {
          mark('original');
          peer = service.mount(peerCanvas, data, options);
          await peer.whenSettled();
          mark('peer-mounted');
          for (let cycle = 0; cycle < 3; cycle++) {
            current.dispose(); retired.push(current); mark(`disposed-${cycle}`);
            current = service.mount(canvas, data, options);
            await current.whenSettled(); mark(`remounted-${cycle}`);
            await current.update(data); await current.whenSettled(); mark(`updated-${cycle}`);
          }
          current.dispose(); retired.push(current); mark('final-current-disposed');
          await peer.update(data); await peer.whenSettled(); mark('peer-updated');
          peer.dispose(); mark('all-disposed');
          return { dpr: devicePixelRatio, profile: showcase.store.theme().mode, bounds: { width: bounds.width, height: bounds.height },
            peerBounds: { width: peerCanvas.clientWidth, height: peerCanvas.clientHeight },
            siteData: data, options, steps };
        } finally { current.dispose(); peer?.dispose(); peerCanvas.remove(); }
      });
      const runtime = await finish();
      results.push({ dpr, observation, runtime });
      // Retain observations before asserting so a failure never loses its trace.
      writeFileSync(`${evidence.directory}/observations-dpr${dpr}.json`, JSON.stringify(results.at(-1), null, 2), { flag: 'wx' });
      assert.equal(observation.dpr, dpr); assert.equal(observation.profile, 'light');
      assert.deepEqual(observation.peerBounds, observation.bounds);
      const steps = observation.steps, peerBaseline = steps.find(step => step.label === 'peer-mounted').peer;
      const remounts = steps.filter(step => step.label.startsWith('remounted-'));
      assert.equal(remounts.length, 3);
      for (const step of steps) {
        for (const owner of [step.current, step.peer, ...step.retired].filter(Boolean)) {
          assert.deepEqual(owner.invalidMeshBindings, []);
          if (owner.disposed) {
            assert.equal(owner.sceneDisposed, true);
            assert.deepEqual(owner.live, { meshes: 0, materials: 0, textures: 0 });
          } else assert.equal(owner.status, 'idle');
        }
        if (step.peer && !['peer-updated', 'all-disposed'].includes(step.label)) assert.deepEqual(step.peer, peerBaseline);
        if (step.peer && !step.current.disposed) assert.equal(step.distinctScenes, true);
      }
      for (const step of remounts) assert.deepEqual(step.current.live, remounts[0].current.live);
      for (const step of steps.filter(step => step.label.startsWith('updated-')))
        assert.deepEqual(step.current.live, remounts[0].current.live);
      assert.equal(steps.at(-1).peer.disposed, true);
    } finally { await page.close(); }
  }
  assert.equal(hash(readFileSync(script)), sourceReceipt.sha256);
  assert.deepEqual(fingerprintDirectory(root), browserFiles);
  writeFileSync(`${evidence.directory}/latest-report.json`, JSON.stringify({ capture: evidence.capture, sourceReceipt, results,
    boundary: 'Actual divider SiteData,light desktop DPR1/2,three public same-canvas remounts,updates and peer survival. Not Angular remount,late-font intervention,other profiles,paint or full-case acceptance.' }, null, 2), { flag: 'wx' });
  console.log(JSON.stringify({ sourceReceipt, browser: browser.version(), cohorts: results.length, remountsPerCohort: 3, output }));
} finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
