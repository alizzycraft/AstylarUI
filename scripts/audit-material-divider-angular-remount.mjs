import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { fingerprintDirectory, fingerprintModuleGraph, materialBrowserLaunchOptions,
  inspectMaterialBrowserLaunch, openMaterialCheckpoint } from '../tests/material-parity/run-checkpoint.mjs';
import { openSupplementalCapture } from '../tests/material-parity/supplemental-capture-evidence.mjs';

const script = 'scripts/audit-material-divider-angular-remount.mjs', hash = bytes => createHash('sha256').update(bytes).digest('hex');
const output = path.resolve(process.argv[2] ?? '');
assert.ok(output.startsWith(path.resolve('artifacts/material-parity') + path.sep));
assert.ok(!existsSync(output) && !existsSync(output + '-checkpoint'));
const root = path.resolve('examples/material-showcase/dist/material-showcase/browser');
const baselineFile = 'artifacts/material-parity/divider-alignment-provenance-20261015/latest-report.json';
const baselineBytes = readFileSync(baselineFile);
assert.equal(hash(baselineBytes), '4be9c6d199952f35203f31d08def08d0d936071f4eb313b75ad3bbf72dd46f11');
const baseline = JSON.parse(baselineBytes), browserFiles = fingerprintDirectory(root);
assert.deepEqual(browserFiles, baseline.captureProvenance.browserFiles);
const server = createServer((request, response) => {
  const file = path.resolve(root, new URL(request.url, 'http://localhost').pathname.slice(1));
  const target = file.startsWith(root + path.sep) && path.extname(file) && existsSync(file) ? file : path.join(root, 'index.csr.html');
  response.writeHead(200, { 'content-type': { '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2' }[path.extname(target)] ?? 'text/html', 'cache-control': 'no-store' });
  response.end(readFileSync(target));
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}`, launch = materialBrowserLaunchOptions();
let browser;
const results = [];
try {
  browser = await chromium.launch(launch);
  const provenance = { browser: browser.version(), browserLaunch: await inspectMaterialBrowserLaunch(browser, launch),
    browserFiles, harness: fingerprintModuleGraph(process.cwd(), script) };
  openMaterialCheckpoint({ directory: output + '-checkpoint', provenance });
  const evidence = openSupplementalCapture({ options: { baseUrl, checkpoint: output + '-checkpoint/checkpoint', output }, browser, script, styleProperties: [] });
  for (const dpr of [1, 2]) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: dpr });
    const finish = evidence.observe(page);
    try {
      await page.goto(`${baseUrl}/astylar/divider?benchmark=1&profile=light`);
      await page.waitForFunction(() => !!window.__ASTYLAR_MATERIAL_BENCHMARK__);
      await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled());
      const observation = await page.evaluate(async () => {
        const outlet = window.ng.getDirectives(document.querySelector('router-outlet')).find(value => typeof value.deactivate === 'function' && typeof value.activateWith === 'function');
        if (!outlet?.isActivated) throw Error('Active Angular RouterOutlet unavailable');
        const route = outlet.activatedRoute;
        // Debug read obtains the original route injector; mutations below use
        // public RouterOutlet methods, never manual DestroyRef callbacks.
        const environmentInjector = outlet.parentContexts.getContext(outlet.name).injector;
        const initial = window.ng.getComponent(document.querySelector('astylar-surface'));
        const showcase = outlet.component;
        const service = initial.astylar;
        const data = showcase.siteData(), options = showcase.options;
        const initialSurface = initial.surface(), initialCanvas = document.querySelector('astylar-surface canvas');
        const peerCanvas = document.createElement('canvas');
        peerCanvas.style.cssText = 'position:absolute;left:-10000px;top:0;width:1440px;height:1000px;pointer-events:none';
        document.body.append(peerCanvas);
        let peer, current = initialSurface;
        const retired = [], steps = [], destroyWitnesses = [];
        let activated = 0, deactivated = 0;
        const activeSub = outlet.activateEvents.subscribe(() => activated++);
        const inactiveSub = outlet.deactivateEvents.subscribe(() => deactivated++);
        const snapshot = surface => ({ disposed: surface.disposed, sceneDisposed: surface.scene.isDisposed,
          live: { meshes: surface.scene.meshes.length, materials: surface.scene.materials.length, textures: surface.scene.textures.length },
          status: surface.diagnostics.session?.status ?? null,
          invalidBindings: surface.scene.meshes.filter(mesh => mesh.material && !surface.scene.materials.includes(mesh.material) && !surface.scene.multiMaterials.includes(mesh.material)).map(mesh => mesh.name) });
        const tick = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        try {
          peer = service.mount(peerCanvas, data, options); await peer.whenSettled();
          steps.push({ label: 'initial', current: snapshot(current), peer: snapshot(peer) });
          for (let cycle = 0; cycle < 3; cycle++) {
            const surfaceElement = document.querySelector('astylar-surface'), canvas = surfaceElement.querySelector('canvas');
            const component = window.ng.getComponent(surfaceElement), routed = outlet.component;
            const witness = { cycle, surfaceDestroyed: false, routedDestroyed: false };
            component.destroyRef.onDestroy(() => { witness.surfaceDestroyed = true; });
            routed.destroyRef.onDestroy(() => { witness.routedDestroyed = true; });
            destroyWitnesses.push(witness);
            retired.push({ surface: current, element: surfaceElement, canvas, component });
            outlet.deactivate(); await tick();
            steps.push({ label: `angular-destroyed-${cycle}`, outletActive: outlet.isActivated,
              surfaceHostConnected: surfaceElement.isConnected, canvasConnected: canvas.isConnected,
              benchmarkPresent: !!window.__ASTYLAR_MATERIAL_BENCHMARK__, current: snapshot(current), peer: snapshot(peer), witness: { ...witness } });
            outlet.activateWith(route, environmentInjector);
            let next;
            for (let frame = 0; frame < 240; frame++) {
              const element = document.querySelector('astylar-surface');
              next = element && window.ng.getComponent(element);
              if (next?.surface() && window.__ASTYLAR_MATERIAL_BENCHMARK__) break;
              await tick();
            }
            if (!next?.surface()) throw Error('Angular surface recreation did not mount');
            await window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled(); await tick();
            const nextSurface = next.surface();
            steps.push({ label: `angular-remounted-${cycle}`, distinctSurface: nextSurface !== current,
              distinctComponent: next !== component, distinctCanvas: document.querySelector('astylar-surface canvas') !== canvas,
              distinctRoutedComponent: outlet.component !== routed, current: snapshot(nextSurface), peer: snapshot(peer),
              retired: retired.map(value => snapshot(value.surface)) });
            current = nextSurface;
          }
          await peer.update(data); await peer.whenSettled();
          steps.push({ label: 'peer-updated', current: snapshot(current), peer: snapshot(peer) });
          outlet.deactivate(); await tick();
          steps.push({ label: 'final-angular-destroyed', current: snapshot(current), peer: snapshot(peer),
            initialCanvasConnected: initialCanvas.isConnected });
          peer.dispose(); steps.push({ label: 'all-disposed', current: snapshot(current), peer: snapshot(peer) });
          return { dpr: devicePixelRatio, activated, deactivated, destroyWitnesses, steps,
            boundary: 'Public Angular outlet deactivation/reactivation diagnostic,not trusted user navigation or full Router transition parity. Passive divider peer survival only;no delayed font intervention.' };
        } catch (error) { return { error: String(error), steps, destroyWitnesses, activated, deactivated }; }
        finally { activeSub.unsubscribe(); inactiveSub.unsubscribe(); if (outlet.isActivated) outlet.deactivate(); peer?.dispose(); peerCanvas.remove(); }
      });
      const runtime = await finish();
      const row = { dpr, observation, runtime }; results.push(row);
      writeFileSync(path.join(output, `observations-dpr${dpr}.json`), JSON.stringify(row, null, 2), { flag: 'wx' });
      assert.equal(observation.error, undefined); assert.equal(observation.dpr, dpr);
      assert.equal(observation.activated, 3); assert.equal(observation.deactivated, 4);
      assert.equal(observation.destroyWitnesses.length, 3);
      const remounts = observation.steps.filter(step => step.label.startsWith('angular-remounted-'));
      assert.equal(remounts.length, 3);
      for (const witness of observation.destroyWitnesses) { assert.equal(witness.surfaceDestroyed, true); assert.equal(witness.routedDestroyed, true); }
      for (const step of observation.steps) {
        for (const owner of [step.current, step.peer, ...(step.retired ?? [])]) {
          assert.deepEqual(owner.invalidBindings, []);
          if (owner.disposed) { assert.equal(owner.sceneDisposed, true); assert.deepEqual(owner.live, { meshes: 0, materials: 0, textures: 0 }); }
        }
        if (step.label.startsWith('angular-destroyed-')) {
          assert.equal(step.outletActive, false); assert.equal(step.surfaceHostConnected, false); assert.equal(step.canvasConnected, false); assert.equal(step.benchmarkPresent, false);
        }
        if (step.label !== 'all-disposed') assert.equal(step.peer.disposed, false);
      }
      for (const step of remounts) {
        for (const key of ['distinctSurface', 'distinctComponent', 'distinctCanvas', 'distinctRoutedComponent']) assert.equal(step[key], true);
        assert.deepEqual(step.current.live, remounts[0].current.live);
      }
      assert.deepEqual(observation.steps.find(step => step.label === 'peer-updated').peer.live, observation.steps[0].peer.live);
      assert.equal(observation.steps.at(-1).peer.disposed, true);
      assert.deepEqual(runtime.errors, []);
      console.log(JSON.stringify({ dpr, angularRemounts: 3, retiredScenesZero: true, peerSurvived: true }));
    } finally { await page.close(); }
  }
  assert.deepEqual(fingerprintDirectory(root), browserFiles);
  writeFileSync(path.join(output, 'latest-report.json'), JSON.stringify({ capture: evidence.capture, results,
    baseline: { file: baselineFile, sha256: hash(baselineBytes) },
    boundary: 'Light desktop DPR1/2 real Angular destroy/recreate cycles and passive public peer. Not all20 physical contexts,delayed font/media teardown,interactive late callbacks,paint or whole-case acceptance.' }, null, 2), { flag: 'wx' });
} finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
