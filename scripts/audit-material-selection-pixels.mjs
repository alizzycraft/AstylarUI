import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { captureBrowserInputTree } from '../tests/material-parity/input-tree-evidence.mjs';
import { propertyGroups } from '../tests/material-parity/input-equivalence-policy.mjs';
import { fingerprintDirectory, materialBrowserLaunchOptions } from '../tests/material-parity/run-checkpoint.mjs';
import { openSupplementalCapture, parseSupplementalCaptureArguments } from '../tests/material-parity/supplemental-capture-evidence.mjs';

// Add only the absent local pixel/bounds observations to the retained real-key
// form-field sequence. Never inject selection endpoints or fixture styles.
const args = process.argv.slice(2), root = path.resolve('examples/material-showcase/dist/material-showcase/browser');
assert.equal(args.length, 2);
const checkpoint = args.find(a => a.startsWith('--checkpoint=')); assert.ok(checkpoint);
const manifest = JSON.parse(readFileSync(path.join(checkpoint.slice(13), 'manifest.json')));
assert.deepEqual(fingerprintDirectory(root), manifest.provenance.browserFiles);
const hash = b => createHash('sha256').update(b).digest('hex');
const server = createServer((req, res) => {
  const name = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
  const candidate = path.resolve(root, name.replace(/^\/+/, ''));
  const file = candidate.startsWith(root+path.sep) && path.extname(candidate) && existsSync(candidate) ? candidate : path.join(root, 'index.csr.html');
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
  const evidence = openSupplementalCapture({ options, browser, script: 'scripts/audit-material-selection-pixels.mjs', styleProperties: properties });
  const actionFile = 'tests/material-parity/sort-focus-structure.spec.mjs';
  const actionSource = { file: actionFile, sha256: hash(readFileSync(actionFile)) };
  const results = [];
  for (const profile of ['light', 'dark', 'contrast', 'custom']) {
    const viewport = { width: 390, height: 844, deviceScaleFactor: 2 };
    const rows = ['typed', 'forward', 'end-collapsed', 'backward'].map(state => ({ family: 'form-field', profile, viewport, state }));
    for (const mode of ['reference', 'astylar']) {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
      const finishRuntime = evidence.observe(page);
      try {
        await page.goto(`${options.baseUrl}/${mode}/form-field?benchmark=1&profile=${profile}`);
        await page.locator('.frame').waitFor();
        if (mode === 'astylar') await page.waitForFunction(() => !!window.__ASTYLAR_MATERIAL_BENCHMARK__);
        await page.keyboard.press('Tab'); await page.keyboard.press('Control+A'); await page.keyboard.type('Atlas');
        for (const row of rows) {
          if (row.state === 'forward') { await page.keyboard.press('Home'); for (let i=0;i<3;i++) await page.keyboard.press('Shift+ArrowRight'); }
          if (row.state === 'end-collapsed') { await page.keyboard.press('ArrowRight'); await page.keyboard.press('End'); }
          if (row.state === 'backward') for (let i=0;i<3;i++) await page.keyboard.press('Shift+ArrowLeft');
          if (mode === 'astylar') await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled());
          await page.evaluate(async () => { await document.fonts.ready; await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); });
          const observation = await page.evaluate(mode => {
            const id = 'form-field-control', node = mode === 'reference' ? document.getElementById(id) : document.querySelector(`[data-astylar-id="${id}"]`);
            const control = { value: node.value, focused: document.activeElement === node, selectionStart: node.selectionStart, selectionEnd: node.selectionEnd, selectionDirection: node.selectionDirection };
            if (mode === 'reference') return { control, box: node.getBoundingClientRect().toJSON() };
            const surface = window.ng.getComponent(document.querySelector('app-astylar-showcase')).surface;
            const measured = window.__ASTYLAR_MATERIAL_BENCHMARK__.measure([id], false).elements[id].borderBox;
            const canvas = document.querySelector('canvas').getBoundingClientRect();
            const highlights = surface.scene.meshes.filter(m => m.metadata?.highlight?.ownerElementId === id).map(m => {
              m.computeWorldMatrix(true); const b = m.getBoundingInfo().boundingBox;
              return { name: m.name, visible: m.isVisible && m.isEnabled(), material: m.material?.emissiveColor?.toHexString() ?? null,
                // World bounds are a read-only rendering observation, never a layout input.
                minimumWorld: b.minimumWorld.asArray(), maximumWorld: b.maximumWorld.asArray() };
            });
            return { control, box: { x: canvas.x+measured.left, y: canvas.y+measured.top, width: measured.width, height: measured.height }, highlights };
          }, mode);
          const b = observation.box, clip = { x: Math.max(0, b.x-8), y: Math.max(0, b.y-8), width: b.width+16, height: b.height+16 };
          const tree = mode === 'reference' ? await page.evaluate(captureBrowserInputTree, { styleProperties: properties }) : await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.measure([]).inputTree);
          const stem = `${evidence.directory}/${profile}-${mode}-${row.state}`;
          const pixels = await page.screenshot({ clip, caret: 'hide' }), treeBytes = Buffer.from(JSON.stringify(tree));
          writeFileSync(`${stem}.png`, pixels, { flag: 'wx' }); writeFileSync(`${stem}.json`, treeBytes, { flag: 'wx' });
          row[mode] = { observation, screenshot: { file: `${stem}.png`, sha256: hash(pixels), clip, caret: 'hide' }, inputTree: { file: `${stem}.json`, sha256: hash(treeBytes) } };
        }
        const runtime = await finishRuntime(); for (const row of rows) row[mode].runtime = runtime;
      } finally { await page.close(); }
    }
    results.push(...rows); console.log(JSON.stringify({ profile, states: rows.map(r => ({ state: r.state, reference: r.reference.observation.control, astylar: r.astylar.observation.control })) }));
  }
  writeFileSync(`${evidence.directory}/latest-report.json`, JSON.stringify({ schemaVersion: 1, browser: browser.version(), generatedAt: new Date().toISOString(), capture: evidence.capture, actionSource, results,
    scope: 'Form-field mobile DPR2, four profiles, retained real-key four-boundary selection sequence; local pixels and read-only paint bounds, not parity acceptance', inputEquivalent: false, renderingEquivalent: false }, null, 2)+'\n', { flag: 'wx' });
} finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
