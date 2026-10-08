import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { fingerprintDirectory, materialBrowserLaunchOptions } from '../tests/material-parity/run-checkpoint.mjs';
import { openSupplementalCapture, parseSupplementalCaptureArguments } from '../tests/material-parity/supplemental-capture-evidence.mjs';
import { propertyGroups } from '../tests/material-parity/input-equivalence-policy.mjs';

// Actual description exposure, not a role/name-only semantic gate. The existing
// provenance helper authenticates runtime assets; no fixture mutations occur.
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
    script: 'scripts/audit-material-tooltip-description.mjs', styleProperties: Object.values(propertyGroups).flat() });
  for (const context of [
    { profile: 'light', viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 },
    { profile: 'dark', viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 },
  ]) for (const side of ['reference', 'astylar']) {
    const page = await browser.newPage(context);
    const finish = evidence.observe(page);
    try {
      await page.goto(`${baseUrl}/${side}/tooltip?profile=${context.profile}`);
      await page.locator('.frame').waitFor();
      if (side === 'astylar') await page.waitForFunction(() => !!window.__ASTYLAR_MATERIAL_BENCHMARK__);
      const selector = side === 'reference' ? '#tooltip-primary' : '[data-astylar-id="tooltip-primary"]';
      const session = await page.context().newCDPSession(page);
      const observations = [];
      for (const state of ['closed', 'hover', 'leave']) {
        if (state === 'hover') {
          const point = await page.evaluate(side => {
            if (side === 'reference') {
              const box = document.getElementById('tooltip-primary').getBoundingClientRect();
              return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
            }
            const box = window.__ASTYLAR_MATERIAL_BENCHMARK__.measure(['tooltip-primary'], false).elements['tooltip-primary'].borderBox;
            const canvas = document.querySelector('canvas').getBoundingClientRect();
            return { x: canvas.x + box.left + box.width / 2, y: canvas.y + box.top + box.height / 2 };
          }, side);
          await page.mouse.move(point.x, point.y);
        }
        if (state === 'leave') await page.mouse.move(1, 1);
        if (side === 'astylar') await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled());
        await page.waitForTimeout(250);
        const { root: document } = await session.send('DOM.getDocument');
        const { nodeId } = await session.send('DOM.querySelector', { nodeId: document.nodeId, selector });
        assert.ok(nodeId);
        const { nodes } = await session.send('Accessibility.getPartialAXTree', { nodeId, fetchRelatives: false });
        const ax = nodes.find(node => node.role?.value === 'button');
        assert.ok(ax && !ax.ignored);
        const dom = await page.locator(selector).evaluate(node => ({
          describedBy: node.getAttribute('aria-describedby'),
          descriptions: (node.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean)
            .map(id => ({ id, text: document.getElementById(id)?.textContent ?? null })),
        }));
        const description = ax.description?.value ?? null;
        observations.push({ state, description, dom, role: ax.role.value, name: ax.name?.value,
          describedByProperty: ax.properties?.find(property => property.name === 'describedby') ?? null });
        assert.equal(description, side === 'reference' || state === 'hover' ? 'Create a project' : null);
      }
      const runtime = await finish();
      console.log(JSON.stringify({ context, side, observations, runtime }));
    } finally { await page.close(); }
  }
  console.log(JSON.stringify({ terminal: 'verified', browser: browser.version(), capture: evidence.capture,
    sourceReceipts: ['examples/material-showcase/src/app/astylar.component.ts',
      'src/lib/astylar-semantic-bridge.ts'].map(file => ({ file, sha256: hash(readFileSync(file)) })),
    scope: 'Two ordinary physical contexts,actual CDP button descriptions across closed/hover/leave. No all-profile AX or assistive-technology acceptance.' }));
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
