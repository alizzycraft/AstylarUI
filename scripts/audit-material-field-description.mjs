import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { fingerprintDirectory, materialBrowserLaunchOptions } from '../tests/material-parity/run-checkpoint.mjs';
import { openSupplementalCapture, parseSupplementalCaptureArguments } from '../tests/material-parity/supplemental-capture-evidence.mjs';

// Close the actual-AX hint-description gap, using the existing runtime receipt
// observer. This is not an input-tree report or an all-profile acceptance gate.
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const root = path.resolve('examples/material-showcase/dist/material-showcase/browser');
const checkpoint = 'artifacts/material-parity/current-full-20261005/checkpoint';
const manifest = JSON.parse(readFileSync(`${checkpoint}/manifest.json`));
assert.deepEqual(fingerprintDirectory(root), manifest.provenance.browserFiles);
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
    `--base-url=${baseUrl}`, `--checkpoint=${checkpoint}`, ...process.argv.slice(2),
  ]);
  const evidence = openSupplementalCapture({ options, browser,
    script: 'scripts/audit-material-field-description.mjs', styleProperties: [] });
  for (const context of [
    { profile: 'light', viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 },
    { profile: 'dark', viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 },
  ]) for (const state of ['hint', 'error']) for (const side of ['reference', 'astylar']) {
    const page = await browser.newPage(context);
    const finish = evidence.observe(page);
    try {
      await page.goto(`${baseUrl}/${side}/form-field?benchmark=1&profile=${context.profile}${state === 'error' ? '&interaction=error' : ''}`);
      await page.locator('.frame').waitFor();
      if (side === 'astylar') {
        await page.waitForFunction(() => !!window.__ASTYLAR_MATERIAL_BENCHMARK__);
        await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled());
      }
      const theme = await page.locator('.frame').evaluate(node => ({
        dark: node.classList.contains('dark'), background: getComputedStyle(node).backgroundColor,
      }));
      assert.equal(theme.dark, context.profile === 'dark');
      assert.equal(theme.background, context.profile === 'dark' ? 'rgb(28, 27, 31)' : 'rgb(255, 251, 254)');
      const selector = side === 'reference' ? '#form-field-control' : '[data-astylar-id="form-field-control"]';
      await page.locator(selector).waitFor({ state: 'attached' });
      const session = await page.context().newCDPSession(page);
      const { root: document } = await session.send('DOM.getDocument');
      const { nodeId } = await session.send('DOM.querySelector', { nodeId: document.nodeId, selector });
      assert.ok(nodeId);
      const { nodes } = await session.send('Accessibility.getPartialAXTree', { nodeId, fetchRelatives: false });
      const ax = nodes.find(node => node.role?.value === 'textbox');
      assert.ok(ax && !ax.ignored);
      const dom = await page.locator(selector).evaluate(node => ({
        describedBy: node.getAttribute('aria-describedby'),
        descriptions: (node.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean)
          .map(id => ({ id, text: document.getElementById(id)?.textContent ?? null })),
      }));
      const observation = { description: ax.description?.value ?? null, dom,
        role: ax.role.value, name: ax.name?.value,
        describedByProperty: ax.properties?.find(property => property.name === 'describedby') ?? null };
      const runtime = await finish();
      console.log(JSON.stringify({ context, state, side, theme, observation, runtime }));
      assert.equal(observation.name, 'Project name');
      assert.equal(observation.description, side === 'reference'
        ? state === 'error' ? 'Project name is required' : 'Public label' : null);
    } finally { await page.close(); }
  }
  console.log(JSON.stringify({ terminal: 'verified', browser: browser.version(), capture: evidence.capture,
    sourceReceipts: ['examples/material-showcase/src/app/astylar.component.ts', 'src/lib/astylar-semantic-bridge.ts']
      .map(file => ({ file, sha256: hash(readFileSync(file)) })),
    scope: 'Hint/error descriptions in two physically and theme-verified contexts; no live-announcement, all-profile or assistive-technology acceptance.' }));
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
