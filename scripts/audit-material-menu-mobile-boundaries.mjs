import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { materialMobileFlowCases } from '../tests/material-parity/benchmark.config.mjs';
import { chromium } from 'playwright-core';
import { captureBrowserInputTree } from '../tests/material-parity/input-tree-evidence.mjs';
import { propertyGroups } from '../tests/material-parity/input-equivalence-policy.mjs';
import { fingerprintDirectory, materialBrowserLaunchOptions } from '../tests/material-parity/run-checkpoint.mjs';
import { openSupplementalCapture, parseSupplementalCaptureArguments } from '../tests/material-parity/supplemental-capture-evidence.mjs';

// Fill uncaptured mobile Menu open intervals and live scene ownership; earlier evidence stays immutable.
const args = process.argv.slice(2), checkpoint = args.find(a => a.startsWith('--checkpoint='));
assert.equal(args.length, 2); assert.ok(checkpoint);
const manifest = JSON.parse(readFileSync(path.join(checkpoint.slice(13), 'manifest.json')));
const root = path.resolve('examples/material-showcase/dist/material-showcase/browser');
assert.deepEqual(fingerprintDirectory(root), manifest.provenance.browserFiles);
const hash = b => createHash('sha256').update(b).digest('hex');
const runnerFile = 'tests/material-parity/run-material-parity.mjs', runner = readFileSync(runnerFile);
assert.equal(hash(runner), manifest.provenance.harnessFiles.find(f => f.file === runnerFile).sha256);
const ast = ts.createSourceFile(runnerFile, runner.toString(), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const names = ['profileTheme', 'sendShowcaseCommand', 'waitForThemeApplied', 'settleInteraction'];
const bodies = names.map(name => {
  const nodes = ast.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
  assert.equal(nodes.length, 1); return nodes[0].getText(ast);
});
const helpers = new Function('assert', `${bodies.join('\n')};return {${names.join(',')}};`)(assert);
const server = createServer((req, res) => {
  const candidate = path.resolve(root, decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/^\/+/, ''));
  const file = candidate.startsWith(root + path.sep) && path.extname(candidate) && existsSync(candidate) ? candidate : path.join(root, 'index.csr.html');
  const ext = path.extname(file);
  res.writeHead(200, { 'content-type': ext === '.js' ? 'text/javascript' : ext === '.css' ? 'text/css' : ext === '.woff2' ? 'font/woff2' : 'text/html', 'cache-control': 'no-store' });
  res.end(readFileSync(file));
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  const options = parseSupplementalCaptureArguments([...args, `--base-url=http://127.0.0.1:${server.address().port}`]);
  browser = await chromium.launch(materialBrowserLaunchOptions());
  const properties = Object.values(propertyGroups).flat();
  const evidence = openSupplementalCapture({ options, browser, script: 'scripts/audit-material-menu-mobile-boundaries.mjs', styleProperties: properties });
  const results = [];
  const cohorts = materialMobileFlowCases.filter(c => c.family === 'menu');
  assert.equal(cohorts.length, 2);
  for (const cohort of cohorts) for (const mode of ['reference', 'astylar']) {
    const context = await browser.newContext({ viewport: { width: cohort.viewport.width, height: cohort.viewport.height }, deviceScaleFactor: cohort.viewport.deviceScaleFactor, colorScheme: cohort.profile === 'dark' ? 'dark' : 'light', reducedMotion: 'reduce' });
    try {
      const page = await context.newPage(), finishRuntime = evidence.observe(page), boundaries = [];
      await page.goto(`${options.baseUrl}/${mode}/menu?benchmark=1&profile=${cohort.profile}&interaction=open`, { waitUntil: 'commit' });
      await page.locator('.frame').waitFor({ state: 'visible' });
      await helpers.sendShowcaseCommand(page, { type: 'showcase:theme', theme: helpers.profileTheme(cohort.profile) });
      await helpers.waitForThemeApplied(page, helpers.profileTheme(cohort.profile));
      if (mode === 'astylar') await page.waitForFunction(() => !!window.__ASTYLAR_MATERIAL_BENCHMARK__);
      await helpers.settleInteraction(page, mode);
      const box = async id => mode === 'reference' ? page.locator(id === 'menu-primary' ? '#menu-primary' : '.mat-mdc-menu-panel button').first().boundingBox()
        : page.evaluate(id => { const b = window.__ASTYLAR_MATERIAL_BENCHMARK__.measure([id], false).elements[id]?.borderBox;
          const c = document.querySelector('canvas').getBoundingClientRect(); return b ? { x: c.x+b.left, y: c.y+b.top, width: b.width, height: b.height } : null; }, id);
      const move = async id => { const b = await box(id); assert.ok(b?.width > 0); await page.mouse.move(b.x+b.width/2, b.y+b.height/2); };
      const snapshot = async state => {
        await helpers.settleInteraction(page, mode);
        const observation = await page.evaluate(mode => {
          const active = document.activeElement;
          const candidate = mode === 'astylar';
          const component = candidate ? window.ng?.getComponent(document.querySelector('app-astylar-showcase')) : null;
          const surface = component?.surface, scene = surface?.scene;
          const measurement = candidate ? window.__ASTYLAR_MATERIAL_BENCHMARK__.measure(['menu-popup'], false) : null;
          const nativeBox = !candidate ? document.querySelector('.mat-mdc-menu-panel')?.getBoundingClientRect() : null;
          const canvas = candidate ? document.querySelector('canvas').getBoundingClientRect() : null;
          const b = measurement?.elements['menu-popup']?.borderBox;
          const popup = candidate ? (b ? { x: canvas.x+b.left, y: canvas.y+b.top, width: b.width, height: b.height } : null)
            : (nativeBox ? { x: nativeBox.x, y: nativeBox.y, width: nativeBox.width, height: nativeBox.height } : null);
          return { open: mode === 'reference' ? !!document.querySelector('.mat-mdc-menu-panel') : window.__ASTYLAR_MATERIAL_BENCHMARK__.state().open,
            active: { id: active?.id, astylarId: active?.getAttribute('data-astylar-id'), text: active?.textContent?.trim().slice(0,80) },
            popup, resources: candidate ? { tracked: measurement.diagnostics.surface.resources,
              liveScene: scene ? { meshes: scene.meshes.length, materials: scene.materials.length, textures: scene.textures.length } : null,
              materials: scene?.materials.map(m => ({ id: m.uniqueId, name: m.name })) } : null,
            events: mode === 'astylar' ? window.__ASTYLAR_MATERIAL_BENCHMARK__.events() : null };
        }, mode);
        const tree = mode === 'reference' ? await page.evaluate(captureBrowserInputTree, { styleProperties: properties }) : await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.measure([]).inputTree);
        assert.deepEqual(tree.errors, []);
        const stem = `${evidence.directory}/${cohort.profile}-${cohort.viewport.id}-${mode}-${state}`, pixels = await page.screenshot({ animations: 'disabled', caret: 'hide' }), treeBytes = Buffer.from(JSON.stringify(tree));
        writeFileSync(`${stem}.png`, pixels, { flag: 'wx' }); writeFileSync(`${stem}.json`, treeBytes, { flag: 'wx' });
        boundaries.push({ state, observation, screenshot: { file: `${stem}.png`, sha256: hash(pixels) }, inputTree: { file: `${stem}.json`, sha256: hash(treeBytes) } });
      };
      await snapshot('initial-closed'); assert.equal(boundaries.at(-1).observation.open, false);
      for (let cycle = 1; cycle <= 3; cycle++) {
        await move('menu-primary'); await page.mouse.down(); await page.mouse.up(); await snapshot('open-'+cycle);
        assert.equal(boundaries.at(-1).observation.open, true, 'Real mobile trigger must open each cycle');
        assert.ok(boundaries.at(-1).observation.popup?.width > 0, 'Open menu must have a CSS popup box');
        await page.keyboard.press('Escape'); await snapshot('closed-'+cycle);
        assert.equal(boundaries.at(-1).observation.open, false, 'Escape must close each cycle');
      }
      results.push({ family: 'menu', mode, profile: cohort.profile, viewport: cohort.viewport, boundaries, runtime: await finishRuntime() });
      await page.close();
    } finally { await context.close(); }
  }
  writeFileSync(`${evidence.directory}/latest-report.json`, JSON.stringify({ schemaVersion: 1, browser: browser.version(), capture: evidence.capture,
    actionSource: { file: runnerFile, sha256: hash(runner), names, bodiesSha256: hash(bodies.join('\n')) }, results,
    scope: 'Real three-cycle mobile Menu open/close with CSS popup boxes and live-vs-tracked scene populations; not current full paint or ownership cause acceptance', inputEquivalent: false }, null, 2)+'\n', { flag: 'wx' });
  console.log(JSON.stringify(results.map(r => ({ mode: r.mode, boundaries: r.boundaries.map(b => ({ state: b.state, ...b.observation, events: undefined })) }))));
} finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
