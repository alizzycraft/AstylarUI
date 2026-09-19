import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import path from 'node:path';
import { chromium } from 'playwright-core';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const args = process.argv.slice(2); assert.equal(args.length, 1); assert.ok(args[0].startsWith('--output='));
const output = path.resolve(args[0].slice(9)); assert.ok(!existsSync(output), 'Use a new evidence directory');
const consumer = createRequire(path.resolve('examples/material-showcase/package.json'));
const build = await consumer('esbuild').build({ absWorkingDir: process.cwd(),
  entryPoints: ['examples/material-showcase/audit/range-paint-inspection.mjs'], bundle: true,
  write: false, format: 'esm', platform: 'browser', target: 'es2022', metafile: true });
const bundle = build.outputFiles[0].contents;
const html = Buffer.from('<!doctype html><html><head><meta charset="utf-8"><title>Range paint inspection</title></head><body><script type="module" src="/audit.js"></script></body></html>');
mkdirSync(output, { recursive: true }); writeFileSync(path.join(output, 'audit.js'), bundle);
const provenance = { sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  script: { file: 'scripts/capture-public-range-paint.mjs', sha256: hash(readFileSync('scripts/capture-public-range-paint.mjs')) },
  bundleSha256: hash(bundle), htmlSha256: hash(html),
  bundleInputs: Object.keys(build.metafile.inputs).sort().map(file => ({ file, sha256: hash(readFileSync(file)) })) };
writeFileSync(path.join(output, 'provenance.json'), JSON.stringify(provenance, null, 2) + '\n');
const server = createServer((request, response) => {
  response.setHeader('content-type', request.url === '/audit.js' ? 'text/javascript' : 'text/html');
  response.end(request.url === '/audit.js' ? bundle : html);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ channel: 'chrome', headless: true }), results = [], runtimeErrors = [];
try {
  for (const dpr of [1, 2]) for (const translated of [false, true]) for (const mode of ['reference', 'astylar']) {
    const page = await browser.newPage({ viewport: { width: 640, height: 360 }, deviceScaleFactor: dpr });
    const assets = [];
    page.on('pageerror', e => runtimeErrors.push({ dpr, translated, mode, error: String(e) }));
    page.on('console', m => { if (m.type() === 'error') runtimeErrors.push({ dpr, translated, mode, error: m.text() }); });
    page.on('response', r => { if (['script', 'document'].includes(r.request().resourceType()))
      assets.push(r.body().then(b => ({ type: r.request().resourceType(), sha256: hash(b) }))); });
    try {
      await page.goto(`http://127.0.0.1:${server.address().port}/?mode=${mode}&translated=${translated}&stacks=false`);
      await page.waitForFunction(() => !!window.rangePaintInspection);
      await page.evaluate(() => window.rangeDragAudit.settle());
      const before = await page.evaluate(() => window.rangeDragAudit.snapshot());
      const file = `dpr${dpr}-translated${translated}-${mode}.png`;
      const screenshot = { file, sha256: hash(await page.screenshot({ path: path.join(output, file) })) };
      const paint = await page.evaluate(() => window.rangePaintInspection());
      const after = await page.evaluate(() => window.rangeDragAudit.snapshot());
      assert.deepEqual(after.site, before.site); assert.deepEqual(after.controls, before.controls);
      assert.deepEqual(after.nativeEvents, before.nativeEvents); assert.deepEqual(after.publicEvents, before.publicEvents);
      assert.deepEqual(after.updates, before.updates);
      const afterFile = `dpr${dpr}-translated${translated}-${mode}-after-inspection.png`;
      const afterScreenshot = { file: afterFile,
        sha256: hash(await page.screenshot({ path: path.join(output, afterFile) })) };
      assert.equal(afterScreenshot.sha256, screenshot.sha256, 'passive inspection changed raster');
      const served = await Promise.all(assets);
      assert.ok(served.some(a => a.type === 'script' && a.sha256 === provenance.bundleSha256));
      assert.ok(served.some(a => a.type === 'document' && a.sha256 === provenance.htmlSha256));
      const disposed = (await page.evaluate(() => window.rangeDragAudit.dispose())).disposed;
      results.push({ dpr, translated, mode, before, after, paint, screenshot, afterScreenshot, served, disposed });
    } finally { await page.close(); }
  }
  assert.deepEqual(runtimeErrors, []);
  const report = { schemaVersion: 1, kind: 'public-range-passive-paint-inspection', browser: browser.version(),
    viewport: { width: 640, height: 360 }, provenance: { file: 'provenance.json',
      sha256: hash(readFileSync(path.join(output, 'provenance.json'))) }, runtimeErrors, results };
  writeFileSync(path.join(output, 'latest-report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ output, cases: results.length, runtimeErrors }));
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
