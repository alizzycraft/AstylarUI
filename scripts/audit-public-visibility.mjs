import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { PNG } from 'pngjs';
import { visibilityCases, visibilityInput } from '../examples/material-showcase/audit/visibility-input.mjs';

const hash = x => createHash('sha256').update(x).digest('hex');
const points = [{ x: 10, y: 10 }, { x: 80, y: 40 }, { x: 80, y: 70 }];
async function main() {
  const root = process.cwd(), args = process.argv.slice(2);
  assert.equal(args.length, 1); assert.ok(args[0].startsWith('--output='));
  const output = path.resolve(args[0].slice(9)); assert.ok(!existsSync(output), 'Use a new evidence directory');
  const consumer = createRequire(path.join(root, 'examples/material-showcase/package.json'));
  const built = await consumer('esbuild').build({ absWorkingDir: root,
    entryPoints: ['examples/material-showcase/audit/visibility.mjs'], bundle: true, write: false,
    format: 'esm', platform: 'browser', target: 'es2022', metafile: true });
  const bundle = built.outputFiles[0].contents;
  const html = Buffer.from('<!doctype html><html><head><meta charset="utf-8"><title>Visibility audit</title></head><body><script type="module" src="/audit.js"></script></body></html>');
  mkdirSync(output, { recursive: true }); writeFileSync(path.join(output, 'audit.js'), bundle);
  const provenance = { sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    script: { file: 'scripts/audit-public-visibility.mjs', sha256: hash(readFileSync('scripts/audit-public-visibility.mjs')) },
    bundleSha256: hash(bundle), htmlSha256: hash(html),
    packages: Object.fromEntries(['@angular/core', '@angular/platform-browser', '@babylonjs/core', 'astylarui', 'esbuild']
      .map(name => [name, JSON.parse(readFileSync(`examples/material-showcase/node_modules/${name}/package.json`)).version])),
    bundleInputs: Object.keys(built.metafile.inputs).sort().map(file => ({ file, sha256: hash(readFileSync(file)) })) };
  writeFileSync(path.join(output, 'provenance.json'), JSON.stringify(provenance, null, 2) + '\n');
  const server = createServer((req, res) => { res.setHeader('content-type', req.url === '/audit.js' ? 'text/javascript' : 'text/html'); res.end(req.url === '/audit.js' ? bundle : html); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  const results = [], runtimeErrors = [], differences = [];
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    for (const dpr of [1, 2]) for (const name of visibilityCases) {
      const entry = { name, dpr };
      for (const mode of ['reference', 'astylar']) {
        const page = await browser.newPage({ viewport: { width: 300, height: 180 }, deviceScaleFactor: dpr }), assets = [];
        page.on('pageerror', e => runtimeErrors.push({ name, dpr, mode, error: String(e) }));
        page.on('console', m => { if (m.type() === 'error') runtimeErrors.push({ name, dpr, mode, error: m.text() }); });
        page.on('response', r => { if (['script', 'document'].includes(r.request().resourceType())) assets.push(r.body().then(b => ({ type: r.request().resourceType(), sha256: hash(b) }))); });
        try {
          await page.goto(`http://127.0.0.1:${server.address().port}/?mode=${mode}&case=${name}`);
          await page.waitForFunction(() => !!window.visibilityAudit);
          const samples = [];
          for (const point of points) {
            await page.mouse.move(point.x, point.y);
            await page.evaluate(() => window.visibilityAudit.settle());
            const snapshot = await page.evaluate(p => window.visibilityAudit.snapshot(p), point);
            assert.deepEqual(snapshot.site, visibilityInput(name));
            assert.deepEqual(snapshot.surfaceBox, { x: 0, y: 0, width: 240, height: 140 });
            if (mode === 'astylar') {
              assert.equal(snapshot.diagnostics.session.status, 'idle');
              const expectedWarnings = visibilityInput(name).styles.filter(s => 'visibility' in s).length;
              assert.equal(snapshot.diagnostics.messages.length, expectedWarnings);
              assert.ok(snapshot.diagnostics.messages.every(m => m.code === 'unsupported-style-property'
                && m.property === 'visibility' && m.severity === 'warning'));
            }
            samples.push(snapshot);
          }
          const file = `${name}-dpr${dpr}-${mode}.png`, bytes = await page.screenshot({ path: path.join(output, file) });
          const png = PNG.sync.read(bytes);
          assert.equal(png.width, 300 * dpr); assert.equal(png.height, 180 * dpr);
          const colors = points.map(p => [...png.data.subarray((p.y * dpr * png.width + p.x * dpr) * 4, (p.y * dpr * png.width + p.x * dpr) * 4 + 4)]);
          const served = await Promise.all(assets);
          assert.ok(served.some(a => a.type === 'script' && a.sha256 === provenance.bundleSha256));
          assert.ok(served.some(a => a.type === 'document' && a.sha256 === provenance.htmlSha256));
          const disposed = (await page.evaluate(() => window.visibilityAudit.dispose())).disposed; assert.equal(disposed, true);
          entry[mode] = { samples, colors, screenshot: { file, sha256: hash(bytes) }, served, disposed };
        } finally { await page.close(); }
      }
      for (const [i, point] of points.entries()) {
        if (JSON.stringify(entry.reference.colors[i]) !== JSON.stringify(entry.astylar.colors[i])) differences.push({ name, dpr, point, kind: 'raster-sample', reference: entry.reference.colors[i], astylar: entry.astylar.colors[i] });
        const r = entry.reference.samples[i].hit, a = entry.astylar.samples[i].hit;
        // Empty reference stage and null candidate target both mean no authored box was hit.
        if ((r === 'audit-stage' ? null : r) !== (a ?? null)) differences.push({ name, dpr, point, kind: 'hover-target', reference: r, astylar: a });
      }
      results.push(entry); console.log(JSON.stringify({ name, dpr, reference: entry.reference.colors, astylar: entry.astylar.colors }));
    }
    const report = { schemaVersion: 1, kind: 'public-equal-input-visibility-reduction', browser: browser.version(),
      viewport: { width: 300, height: 180 }, points, packages: provenance.packages,
      provenance: { file: 'provenance.json', sha256: hash(readFileSync(path.join(output, 'provenance.json'))) },
      runtimeErrors, results, differences,
      limitations: ['Point samples do not establish full raster parity.', 'No click, focus, accessibility or update behavior is asserted.', 'Unsupported visibility input is retained deliberately; this does not assert existing promised support.', 'This does not establish the cause of any Material overlay symptom.'] };
    writeFileSync(path.join(output, 'latest-report.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify({ cases: results.length, differences: differences.length, runtimeErrors, output }));
    process.exitCode = runtimeErrors.length ? 2 : differences.length ? 1 : 0;
  } finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
}
main().catch(error => { console.error(error); process.exitCode = 2; });
