import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { fingerprintDirectory, materialBrowserLaunchOptions } from '../tests/material-parity/run-checkpoint.mjs';
import { openSupplementalCapture, parseSupplementalCaptureArguments } from '../tests/material-parity/supplemental-capture-evidence.mjs';
import { materialProfiles, materialViewports, materialComparisonViewport } from '../tests/material-parity/benchmark.config.mjs';
import { captureReferenceRootAncestorContext } from '../tests/material-parity/reference-root-ancestor-context.mjs';

// Close the actual-AX hint-description gap, using the existing runtime receipt
// observer. This is not an input-tree report or an all-profile acceptance gate.
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
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
