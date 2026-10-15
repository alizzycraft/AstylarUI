import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { chromium } from 'playwright-core';
import { PNG } from 'pngjs';
import { materialBrowserLaunchOptions, inspectMaterialBrowserLaunch, fingerprintModuleGraph } from '../tests/material-parity/run-checkpoint.mjs';

// One missing causal boundary: observed context/sample settings. Serve the
// authenticated existing bundle unchanged; never rebuild or patch the renderer.
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const retained = 'artifacts/material-parity/public-thin-fill-phase-corrected-20261015';
const originalBytes = fs.readFileSync(`${retained}/latest-report.json`);
assert.equal(hash(originalBytes), '7eef112b2c7615874d4bbced11a2e04f40ab8c3e71ce7eda30e593a6075907b8');
const original = JSON.parse(originalBytes);
const bundle = fs.readFileSync(`${retained}/audit.js`), html = fs.readFileSync(`${retained}/index.html`);
assert.equal(hash(bundle), original.runtime.bundleSha256);
assert.equal(hash(html), original.runtime.htmlSha256);
const verifyOnly = process.argv[2] === '--verify';
const output = path.resolve(process.argv[verifyOnly ? 3 : 2] ?? '');
assert.ok(output.startsWith(path.resolve('artifacts/material-parity') + path.sep));

function verify(report) {
  assert.equal(report.scriptSha256, hash(fs.readFileSync(import.meta.filename)));
  assert.deepEqual(report.producerDependencies, fingerprintModuleGraph(process.cwd(), import.meta.filename));
  assert.equal(report.bundleSha256, original.runtime.bundleSha256);
  assert.equal(report.htmlSha256, original.runtime.htmlSha256);
  assert.equal(report.browser, original.runtime.browser);
  assert.deepEqual(report.errors, []);
  assert.equal(report.results.length, 18);
  const keys = new Set();
  for (const row of report.results) {
    const key = `${row.dpr}/${row.phase}/${row.mode}`;
    assert.ok(!keys.has(key)); keys.add(key);
    assert.ok([1, 2].includes(row.dpr) && [0, .25, .5].includes(row.phase));
    assert.ok(['reference', 'baseline', 'force-no-aa'].includes(row.mode));
    assert.equal(row.runtime.dpr, row.dpr);
    assert.deepEqual(row.runtime.viewport, [400, 260]);
    assert.equal(row.snapshot.inputUnchanged, true);
    const prior = original.results.find(x => x.dpr === row.dpr && x.phase === row.phase);
    const side = row.mode === 'reference' ? 'reference' : 'astylar';
    assert.deepEqual(row.snapshot.site, prior[side].site);
    assert.deepEqual(row.snapshot.bounds, prior[side].bounds);
    if (row.mode === 'reference') assert.equal(row.runtime.contexts.length, 0);
    else {
      assert.equal(row.runtime.contexts.length, 1);
      const context = row.runtime.contexts[0];
      assert.deepEqual(context.drawingBuffer, [400 * row.dpr, 260 * row.dpr]);
      assert.equal(context.requested.antialias, true);
      assert.equal(context.attributes.antialias, row.mode === 'baseline');
      if (row.mode === 'force-no-aa') {
        assert.equal(context.samples, 0); assert.equal(context.sampleBuffers, 0);
      } else assert.ok(context.samples > 0 && context.sampleBuffers > 0);
    }
    const pngBytes = fs.readFileSync(path.join(output, row.screenshot.file));
    assert.equal(hash(pngBytes), row.screenshot.sha256);
    const png = PNG.sync.read(pngBytes);
    assert.equal(png.width, 400 * row.dpr); assert.equal(png.height, 260 * row.dpr);
  }
  return { cases: keys.size, contextInterventionEffective: true,
    boundary: 'Observed context and equal-input geometry only; raster causality requires separate pixel comparison,not whole-Material acceptance' };
}
if (verifyOnly) {
  const report = JSON.parse(fs.readFileSync(path.join(output, 'latest-report.json')));
  console.log(JSON.stringify(verify(report)));
} else {
  assert.equal(process.argv.length, 3, 'Provide a new capture directory or --verify <directory>');
  assert.ok(!fs.existsSync(output), 'Never overwrite retained capture evidence');
  fs.mkdirSync(output);
  const server = createServer((request, response) => {
    const script = request.url === '/audit.js';
    response.setHeader('content-type', script ? 'text/javascript' : 'text/html');
    response.end(script ? bundle : html);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  const report = { scriptSha256: hash(fs.readFileSync(import.meta.filename)),
    producerDependencies: fingerprintModuleGraph(process.cwd(), import.meta.filename),
    bundleSha256: hash(bundle), htmlSha256: hash(html), errors: [], results: [] };
  try {
    const launch = materialBrowserLaunchOptions();
    browser = await chromium.launch(launch);
    report.browser = browser.version(); report.launch = await inspectMaterialBrowserLaunch(browser, launch);
    for (const dpr of [1, 2]) for (const phase of [0, .25, .5]) for (const mode of ['reference', 'baseline', 'force-no-aa']) {
      const page = await browser.newPage({ viewport: { width: 400, height: 260 }, deviceScaleFactor: dpr });
      page.on('pageerror', error => report.errors.push(String(error)));
      try {
        await page.addInitScript(force => {
          const original = HTMLCanvasElement.prototype.getContext;
          const contexts = [];
          HTMLCanvasElement.prototype.getContext = function (kind, options, ...rest) {
            const webgl = ['webgl', 'webgl2', 'experimental-webgl'].includes(kind);
            const requested = options ? { ...options } : {};
            const context = original.call(this, kind, webgl && force ? { ...options, antialias: false } : options, ...rest);
            if (webgl && context && !contexts.some(entry => entry.context === context)) contexts.push({ canvas: this, context, requested });
            return context;
          };
          window.thinFillContextSnapshot = () => ({ dpr: window.devicePixelRatio,
            viewport: [innerWidth, innerHeight], contexts: contexts.filter(entry => entry.canvas === document.querySelector('canvas')).map(({ context, requested }) => ({
              requested, attributes: context.getContextAttributes(), samples: context.getParameter(context.SAMPLES),
              sampleBuffers: context.getParameter(context.SAMPLE_BUFFERS), drawingBuffer: [context.drawingBufferWidth, context.drawingBufferHeight],
            })) });
        }, mode === 'force-no-aa');
        const query = new URLSearchParams({ mode: mode === 'reference' ? 'reference' : 'astylar', font: '16', context: 'block', unit: 'px', phase: String(phase) });
        await page.goto(`http://127.0.0.1:${server.address().port}/?${query}`);
        await page.waitForFunction(() => !!window.marginAudit);
        const snapshot = await page.evaluate(() => window.marginAudit.snapshot());
        const runtime = await page.evaluate(() => window.thinFillContextSnapshot());
        const file = `${dpr}-${phase}-${mode}.png`;
        const screenshot = await page.screenshot({ path: path.join(output, file) });
        report.results.push({ dpr, phase, mode, snapshot, runtime, screenshot: { file, sha256: hash(screenshot) } });
        await page.evaluate(() => window.marginAudit.dispose());
      } finally { await page.close(); }
    }
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
    fs.writeFileSync(path.join(output, 'latest-report.json'), JSON.stringify(report, null, 2));
  }
  console.log(JSON.stringify(verify(report)));
}
