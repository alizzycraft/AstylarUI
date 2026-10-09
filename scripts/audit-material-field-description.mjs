import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { chromium } from 'playwright-core';
import { fingerprintDirectory, materialBrowserLaunchOptions } from '../tests/material-parity/run-checkpoint.mjs';
import { openSupplementalCapture, parseSupplementalCaptureArguments } from '../tests/material-parity/supplemental-capture-evidence.mjs';
import { materialProfiles, materialViewports, materialComparisonViewport } from '../tests/material-parity/benchmark.config.mjs';
import { captureReferenceRootAncestorContext } from '../tests/material-parity/reference-root-ancestor-context.mjs';

// Close the actual-AX hint-description gap, using the existing runtime receipt
// observer. This is not an input-tree report or an all-profile acceptance gate.
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
if (process.argv.includes('--divider-layout')) {
  await inspectFreshDividerLayout();
  process.exit(0);
}
const root = path.resolve('examples/material-showcase/dist/material-showcase/browser');
const checkpoint = 'artifacts/material-parity/current-full-20261005/checkpoint';
const manifest = JSON.parse(readFileSync(`${checkpoint}/manifest.json`));
assert.deepEqual(fingerprintDirectory(root), manifest.provenance.browserFiles);
const allContexts = process.argv.includes('--all-contexts');
const ordinaryTooltip = process.argv.includes('--ordinary-tooltip');
const divider = process.argv.includes('--divider');
const dividerHostContext = process.argv.includes('--divider-host-context');
assert.ok(!dividerHostContext || divider, 'Host context is a separate opt-in divider observation.');
const comparisonOnly = process.argv.includes('--comparison-only');
assert.ok(!comparisonOnly || divider && !allContexts, 'Comparison-only is a separate bounded divider cohort.');
assert.ok(!divider || !ordinaryTooltip, 'Divider and ordinary tooltip are separate capture scopes.');
assert.ok(!ordinaryTooltip || !allContexts, 'Ordinary tooltip scope is the two explicitly declared contexts.');
const family = divider ? 'divider' : ordinaryTooltip ? 'tooltip' : 'form-field';
const states = divider ? ['inspect'] : ordinaryTooltip ? ['closed', 'hover', 'leave'] : ['hint', 'error'];
const darkTheme = { mode: 'dark', primary: '#d0bcff', tertiary: '#efb8c8', surface: '#1c1b1f',
  error: '#f2b8b5', density: 0, cornerScale: 1, typographyScale: 1 };
const contexts = comparisonOnly ? materialProfiles.map(profile => ({ profile, viewportId: materialComparisonViewport.id,
  viewport: { width: materialComparisonViewport.width, height: materialComparisonViewport.height },
  deviceScaleFactor: materialComparisonViewport.deviceScaleFactor })) : allContexts ? materialProfiles.flatMap(profile => [
  ...materialViewports, { id: 'desktop-dpr2', width: 1440, height: 1000, deviceScaleFactor: 2 },
].map(({ id, width, height, deviceScaleFactor }) => ({ profile, viewportId: id,
  viewport: { width, height }, deviceScaleFactor }))) : [
  { profile: 'light', viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 },
  { profile: 'dark', viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 },
];
const surfaceRgb = { light: 'rgb(255, 251, 254)', dark: 'rgb(28, 27, 31)',
  contrast: 'rgb(255, 255, 255)', custom: 'rgb(244, 251, 250)' };
const server = createServer((request, response) => {
  const name = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
  const candidate = path.resolve(root, name.replace(/^\/+/, ''));
  const file = candidate.startsWith(root + path.sep) && path.extname(candidate) && existsSync(candidate)
    ? candidate : path.join(root, 'index.csr.html');
  const ext = path.extname(file);
  response.writeHead(200, { 'content-type': ext === '.js' ? 'text/javascript' :
    ext === '.css' ? 'text/css' : ext === '.woff2' ? 'font/woff2' : 'text/html' });
  response.end(readFileSync(file));
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}`;
let browser;
try {
  browser = await chromium.launch(materialBrowserLaunchOptions());
  const options = parseSupplementalCaptureArguments([
    `--base-url=${baseUrl}`, `--checkpoint=${checkpoint}`, ...process.argv.slice(2).filter(arg => !['--all-contexts', '--ordinary-tooltip', '--divider', '--comparison-only', '--divider-host-context'].includes(arg)),
  ]);
  const evidence = openSupplementalCapture({ options, browser,
    script: 'scripts/audit-material-field-description.mjs', styleProperties: [] });
  const ancestorReceipt = dividerHostContext ? {
    file: 'tests/material-parity/reference-root-ancestor-context.mjs',
    sha256: hash(readFileSync('tests/material-parity/reference-root-ancestor-context.mjs')),
  } : null;
  if (ancestorReceipt) evidence.capture.sources.push(ancestorReceipt);
  for (const context of contexts) for (const state of states) for (const side of ['reference', 'astylar']) {
    const page = await browser.newPage(context);
    const finish = evidence.observe(page);
    try {
      await page.goto(`${baseUrl}/${side}/${family}?${ordinaryTooltip ? '' : 'benchmark=1&'}profile=${context.profile}${state === 'error' ? '&interaction=error' : ''}`);
      await page.locator('.frame').waitFor();
      if (ordinaryTooltip) {
        await page.waitForFunction(() => !!window.__MATERIAL_SHOWCASE_COMMAND__);
        assert.equal(await page.evaluate(theme => window.__MATERIAL_SHOWCASE_COMMAND__({ type: 'showcase:theme', theme }),
          context.profile === 'dark' ? darkTheme : { ...darkTheme, mode: 'light', primary: '#6750a4', tertiary: '#7d5260', surface: '#fffbfe', error: '#b3261e' }), true);
      }
      if (side === 'astylar') {
        await page.waitForFunction(() => !!window.__ASTYLAR_MATERIAL_BENCHMARK__);
        await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled());
      }
      const theme = await page.locator('.frame').evaluate(node => ({
        dark: node.classList.contains('dark'), background: getComputedStyle(node).backgroundColor,
      }));
      assert.equal(theme.dark, context.profile === 'dark');
      assert.equal(theme.background, surfaceRgb[context.profile]);
      const target = divider ? 'divider-primary' : ordinaryTooltip ? 'tooltip-primary' : 'form-field-control';
      const selector = side === 'reference' ? `#${target}` : `[data-astylar-id="${target}"]`;
      await page.locator(selector).waitFor({ state: 'attached' });
      if (ordinaryTooltip && state !== 'closed') {
        const point = await page.evaluate(side => {
          if (side === 'reference') { const b = document.getElementById('tooltip-primary').getBoundingClientRect();
            return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; }
          const b = window.__ASTYLAR_MATERIAL_BENCHMARK__.measure(['tooltip-primary'], false).elements['tooltip-primary'].borderBox;
          const canvas = document.querySelector('canvas').getBoundingClientRect();
          return { x: canvas.x + b.left + b.width / 2, y: canvas.y + b.top + b.height / 2 };
        }, side);
        await page.mouse.move(point.x, point.y);
        await page.waitForTimeout(250);
        if (state === 'leave') { await page.mouse.move(1, 1); await page.waitForTimeout(250); }
        if (side === 'astylar') await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled());
      }
      const session = await page.context().newCDPSession(page);
      const { root: document } = await session.send('DOM.getDocument');
      const { nodeId } = await session.send('DOM.querySelector', { nodeId: document.nodeId, selector });
      assert.ok(nodeId);
      const { nodes } = await session.send('Accessibility.getPartialAXTree', { nodeId, fetchRelatives: false });
      const ax = nodes.find(node => node.role?.value === (divider ? 'separator' : ordinaryTooltip ? 'button' : 'textbox'));
      assert.ok(ax && !ax.ignored);
      const dom = await page.locator(selector).evaluate(node => ({
        describedBy: node.getAttribute('aria-describedby'),
        descriptions: (node.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean)
          .map(id => ({ id, text: document.getElementById(id)?.textContent ?? null })),
      }));
      const observation = { description: ax.description?.value ?? null, dom,
        role: ax.role.value, name: ax.name?.value,
        ...(divider ? { orientation: ax.properties?.find(property => property.name === 'orientation')?.value?.value ?? null,
          childIds: ax.childIds ?? [] } : {}),
        describedByProperty: ax.properties?.find(property => property.name === 'describedby') ?? null };
      const hostContext = !dividerHostContext ? undefined : side === 'reference'
        ? await page.evaluate(captureReferenceRootAncestorContext)
        : await page.evaluate(() => {
          const canvas = document.querySelector('canvas'), nodes = [];
          if (!canvas) throw new Error('Candidate rendering canvas is missing');
          for (let node = canvas; node; node = node.parentElement) {
            const style = getComputedStyle(node);
            nodes.push({ type: node.tagName.toLowerCase(), id: node.id,
              computed: Object.fromEntries(['overflow-x', 'overflow-y', 'clip-path', 'contain', 'transform']
                .map(property => [property, style.getPropertyValue(property)])),
              viewportRect: node.getBoundingClientRect().toJSON() });
          }
          return { kind: 'candidate-dom-canvas-host-chain', nodes,
            limitation: 'DOM canvas host ancestry only; not internal scene clipping or rendered edge acceptance.' };
        });
      if (hostContext?.errors) assert.deepEqual(hostContext.errors, []);
      const runtime = await finish();
      console.log(JSON.stringify({ context, state, side, url: page.url(), theme, observation, runtime,
        ...(dividerHostContext ? { hostContext } : {}) }));
      assert.equal(observation.name, divider ? '' : ordinaryTooltip ? 'Hover for help' : 'Project name');
      if (divider) {
        assert.equal(observation.orientation, 'horizontal');
        assert.deepEqual(observation.childIds, []);
      }
      assert.equal(observation.description, divider ? null : ordinaryTooltip
        ? side === 'reference' || state === 'hover' ? 'Create a project' : null
        : side === 'reference' ? state === 'error' ? 'Project name is required' : 'Public label' : null);
    } finally { await page.close(); }
  }
  if (ancestorReceipt) assert.equal(hash(readFileSync(ancestorReceipt.file)), ancestorReceipt.sha256,
    'Ancestor collector changed during capture.');
  console.log(JSON.stringify({ terminal: 'verified', browser: browser.version(), capture: evidence.capture,
    sourceReceipts: ['examples/material-showcase/src/app/astylar.component.ts', 'src/lib/astylar-semantic-bridge.ts',
      'tests/material-parity/benchmark.config.mjs', 'examples/material-showcase/src/app/theme.ts',
      'examples/material-showcase/src/app/frame-sync.ts', 'examples/material-showcase/src/app/frame-protocol.ts']
      .map(file => ({ file, sha256: hash(readFileSync(file)) })),
    contexts: contexts.length, family, states,
    scope: divider ? 'Separator AX in explicitly verified theme/physical contexts; not paint, lifecycle or complete accessibility acceptance.'
      : 'Descriptions in explicitly listed physical/theme/state contexts; no other action-state, live-announcement or assistive-technology acceptance.' }));
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}

async function inspectFreshDividerLayout() {
  const argument = process.argv.find(arg => arg.startsWith('--package-root='));
  assert.ok(argument, 'Fresh divider layout requires an explicit packed library');
  const outputArgument = process.argv.find(arg => arg.startsWith('--layout-output='));
  assert.ok(outputArgument, 'Supply a new retained layout evidence file');
  const output = path.resolve(outputArgument.slice('--layout-output='.length));
  assert.ok(!existsSync(output), 'Do not overwrite retained evidence');
  const packedRoot = path.resolve(argument.slice('--package-root='.length));
  const consumer = createRequire(path.resolve('examples/material-showcase/package.json'));
  const packed = createRequire(path.join(packedRoot, 'package.json'));
  const entry = packed.resolve('astylarui');
  const applicationSource = `
    import 'zone.js'; import '@angular/compiler';
    import {createComponent,provideZoneChangeDetection} from '@angular/core';
    import {createApplication} from '@angular/platform-browser';
    import {ActivatedRoute,convertToParamMap} from '@angular/router';
    import {AstylarShowcaseComponent} from './examples/material-showcase/src/app/astylar.component';
    import {provideMaterialShowcasePlugin} from './examples/material-showcase/src/app/material-plugin/material-showcase.plugin';
    await Promise.all([400,500,700].map(weight=>document.fonts.load(weight+' 16px Roboto')));
    await document.fonts.ready;
    const app=await createApplication({providers:[provideZoneChangeDetection({eventCoalescing:true}),
      {provide:ActivatedRoute,useValue:{snapshot:{paramMap:convertToParamMap({family:'divider'})}}},
      provideMaterialShowcasePlugin({benchmarkMode:true})]});
    const host=document.createElement('app-astylar-showcase');document.body.append(host);
    const component=createComponent(AstylarShowcaseComponent,{environmentInjector:app.injector,hostElement:host});
    app.attachView(component.hostView);component.changeDetectorRef.detectChanges();
    window.dividerLayout={dispose(){app.detachView(component.hostView);component.destroy();app.destroy();host.remove();}};
  `;
  const built = await consumer('esbuild').build({ absWorkingDir: process.cwd(),
    stdin: { contents: applicationSource, resolveDir: process.cwd(), sourcefile: 'fresh-divider-layout.mjs' },
    bundle: true, write: false, metafile: true, format: 'esm', platform: 'browser', target: 'es2022',
    nodePaths: [path.resolve('examples/material-showcase/node_modules')],
    plugins: [{ name: 'fresh-public-library', setup(build) {
      build.onResolve({ filter: /^astylarui$/ }, () => ({ path: entry }));
      build.onResolve({ filter: /^(@angular\/|@babylonjs\/core)/ }, args => ({ path: consumer.resolve(args.path) }));
    } }],
  });
  const sources = Object.keys(built.metafile.inputs).filter(file => existsSync(file)).sort()
    .map(file => ({ file, sha256: hash(readFileSync(file)) }));
  assert.ok(!sources.some(row => /^src[\\/]/.test(row.file)), 'No core source imports in the application');
  assert.ok(sources.some(row => path.resolve(row.file) === entry));
  const assets = new Map([['/fresh.js', built.outputFiles[0].contents]]);
  const faces = [400, 500, 700].map(weight => {
    const url = `/roboto-${weight}.woff2`;
    assets.set(url, readFileSync(`examples/material-showcase/node_modules/@fontsource/roboto/files/roboto-latin-${weight}-normal.woff2`));
    return `@font-face{font-family:Roboto;font-style:normal;font-weight:${weight};src:url('${url}') format('woff2')}`;
  }).join('');
  const html = `<!doctype html><style>${faces}html,body{height:100%;margin:0}body{font-family:Roboto,Arial,sans-serif}</style><script type="module" src="/fresh.js"></script>`;
  const server = createServer((req, res) => {
    res.setHeader('content-type', req.url.endsWith('.woff2') ? 'font/woff2' : assets.has(req.url) ? 'text/javascript' : 'text/html');
    res.end(assets.get(req.url) ?? html);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  const observations = [];
  try {
    browser = await chromium.launch(materialBrowserLaunchOptions());
    const contexts = materialProfiles.flatMap(profile => [...materialViewports,
      { id: 'desktop-dpr2', width: 1440, height: 1000, deviceScaleFactor: 2 }, materialComparisonViewport]
      .map(viewport => ({ profile, viewport })));
    for (const context of contexts) {
      const page = await browser.newPage({ viewport: { width: context.viewport.width, height: context.viewport.height },
        deviceScaleFactor: context.viewport.deviceScaleFactor });
      const errors = [], responses = [];
      page.on('pageerror', error => errors.push(String(error)));
      page.on('response', response => responses.push(response.body().then(bytes => ({
        path: new URL(response.url()).pathname, sha256: hash(bytes) }))));
      try {
        await page.goto(`http://127.0.0.1:${server.address().port}/?benchmark=1&profile=${context.profile}`);
        await page.waitForFunction(() => !!window.__ASTYLAR_MATERIAL_BENCHMARK__ && !!window.dividerLayout);
        await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled());
        const measure = await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.measure(['divider-above','divider-below']));
        const owners = measure.inputTree.nodes.filter(node => ['divider-above','divider-below'].includes(node.authored?.id));
        assert.equal(owners.length, 2);
        for (const owner of owners) assert.equal(owner.retainedLayout?.source, 'core-dimension-registry');
        const runtime = await Promise.all(responses);
        assert.ok(runtime.some(row => row.path === '/fresh.js' && row.sha256 === hash(built.outputFiles[0].contents)));
        assert.deepEqual(errors, []);
        const fonts = await page.evaluate(() => [...document.fonts].map(face => ({ family: face.family, weight: face.weight, status: face.status })));
        assert.ok([400,500,700].every(weight => fonts.some(face => face.family === 'Roboto' && face.weight === String(weight) && face.status === 'loaded')));
        observations.push({ context, owners, runtime, fonts });
        console.log(JSON.stringify({ context, widths: owners.map(owner => owner.retainedLayout.width) }));
        await page.evaluate(() => window.dividerLayout.dispose());
      } finally { await page.close(); }
    }
    for (const receipt of sources) assert.equal(hash(readFileSync(receipt.file)), receipt.sha256);
    const terminal = { terminal: 'verified', browser: browser.version(), contexts: observations.length,
      sourceReceipts: sources, scriptSha256: hash(readFileSync('scripts/audit-material-field-description.mjs')),
      packedRoot, applicationSource, htmlSha256: hash(html), bundleSha256: hash(built.outputFiles[0].contents),
      scope: 'Current full divider authoring in a bounded JIT component host; retained CSS dimensions only,not historical texture inputs or full application/parity acceptance.' };
    writeFileSync(output, [...observations, terminal].map(record => JSON.stringify(record)).join('\n')+'\n');
    console.log(JSON.stringify({ terminal: terminal.terminal, contexts: observations.length, output, sha256: hash(readFileSync(output)) }));
  } catch (error) {
    writeFileSync(output, [...observations, { terminal: 'failed', error: String(error) }].map(record => JSON.stringify(record)).join('\n')+'\n');
    throw error;
  } finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
}
