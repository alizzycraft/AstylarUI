import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { cursorInput } from '../examples/material-showcase/audit/cursor-default-input.mjs';
import { materialBrowserLaunchOptions, inspectMaterialBrowserLaunch } from '../tests/material-parity/run-checkpoint.mjs';

// Reuse the existing package-root mount and same-input native CSS translator.
// No Material, tooltip handler, renderer mutation, or canonical fixture change.
const script = 'scripts/audit-public-host-scroll-hover.mjs';
const output = path.resolve(process.argv[2] ?? '');
assert.ok(output.startsWith(path.resolve('artifacts/material-parity') + path.sep));
assert.ok(!existsSync(output), 'Preserve previous evidence.');
const consumer = createRequire(path.resolve('examples/material-showcase/package.json'));
const built = await consumer('esbuild').build({ absWorkingDir: process.cwd(), entryPoints: ['examples/material-showcase/audit/cursor-defaults.mjs'], bundle: true, write: false, format: 'esm', platform: 'browser', target: 'es2022', metafile: true });
const bundle = built.outputFiles[0].contents;
const html = Buffer.from('<!doctype html><html><head><meta charset="utf-8"><title>Host scroll hover reduction</title></head><body><script type="module" src="/audit.js"></script></body></html>');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const inputs = Object.keys(built.metafile.inputs).sort().map(file => ({ file, sha256: hash(readFileSync(file)) }));
mkdirSync(output);
writeFileSync(path.join(output, 'audit.js'), bundle);
writeFileSync(path.join(output, 'index.html'), html);
const server = createServer((req, res) => { res.setHeader('content-type', req.url === '/audit.js' ? 'text/javascript' : 'text/html'); res.end(req.url === '/audit.js' ? bundle : html); });
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const launch = materialBrowserLaunchOptions(), browser = await chromium.launch(launch), results = [], errors = [];
try {
  const provenance = { browser: browser.version(), launch: await inspectMaterialBrowserLaunch(browser, launch), script: { file: script, sha256: hash(readFileSync(script)) }, bundleInputs: inputs,
    packages: Object.fromEntries(['astylarui', '@angular/core', '@babylonjs/core', 'esbuild'].map(name => [name, JSON.parse(readFileSync(`examples/material-showcase/node_modules/${name}/package.json`)).version])),
    bundleSha256: hash(bundle), htmlSha256: hash(html) };
  for (const dpr of [1, 2]) for (const translated of [false, true]) {
    const origin = { x: translated ? 64 : 0, y: translated ? 40 : 0 };
    const point = { x: origin.x + 172, y: origin.y + 84 };
    const entry = { dpr, translated, stages: ['hover', 'host-scroll', 'pointer-recheck'].map(name => ({ name })) };
    for (const mode of ['reference', 'astylar']) {
      const page = await browser.newPage({ viewport: { width: 480, height: 300 }, deviceScaleFactor: dpr }), assets = [];
      page.on('pageerror', e => errors.push(String(e)));
      page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
      page.on('response', r => { if (['script', 'document'].includes(r.request().resourceType())) assets.push(r.body().then(b => ({ type: r.request().resourceType(), sha256: hash(b) }))); });
      try {
        await page.goto(`http://127.0.0.1:${server.address().port}/?mode=${mode}&case=button-hover&translated=${translated}`);
        await page.waitForFunction(() => !!window.cursorDefaultAudit);
        await page.evaluate(() => { const spacer = document.createElement('div'); spacer.style.cssText = 'position:absolute;top:600px;left:0;width:1px;height:1px;pointer-events:none'; document.body.append(spacer); });
        await page.mouse.move(point.x, point.y);
        for (const stage of entry.stages) {
          if (stage.name === 'host-scroll') await page.evaluate(() => window.scrollTo(0, 40));
          if (stage.name === 'pointer-recheck') await page.mouse.move(point.x + 1, point.y);
          await page.evaluate(() => window.cursorDefaultAudit.settle());
          await page.waitForTimeout(80);
          stage[mode] = await page.evaluate(point => ({ ...window.cursorDefaultAudit.snapshot(point), scrollY, scrollHeight: document.documentElement.scrollHeight }), point);
          const file = `dpr${dpr}-translated${translated}-${mode}-${stage.name}.png`;
          stage[mode].screenshot = { file, sha256: hash(await page.screenshot({ path: path.join(output, file) })) };
          assert.deepEqual(stage[mode].site, cursorInput('button-hover'));
        }
        const served = await Promise.all(assets);
        assert.ok(served.some(x => x.type === 'script' && x.sha256 === provenance.bundleSha256));
        assert.ok(served.some(x => x.type === 'document' && x.sha256 === provenance.htmlSha256));
        entry[mode + 'Assets'] = served;
        assert.equal((await page.evaluate(() => window.cursorDefaultAudit.dispose())).disposed, true);
      } finally { await page.close(); }
    }
    for (const stage of entry.stages) {
      assert.equal(stage.reference.scrollY, stage.astylar.scrollY);
      assert.equal(stage.reference.scrollHeight, stage.astylar.scrollHeight);
    }
    results.push(entry);
    console.log(JSON.stringify({ dpr, translated, reference: entry.stages.map(s => s.reference.target.cursor), candidate: entry.stages.map(s => s.astylar.canvasCursor), hovered: entry.stages.map(s => s.astylar.diagnostics.interaction.hoveredElementId ?? null) }));
  }
  for (const item of inputs) assert.equal(hash(readFileSync(item.file)), item.sha256);
  assert.deepEqual(errors, []);
  const report = { schemaVersion: 1, kind: 'public-equal-input-external-scroll-hover-reduction', provenance, viewport: { width: 480, height: 300 }, diagnosticHostStyle: 'position:absolute;top:600px;left:0;width:1px;height:1px;pointer-events:none', results, errors };
  writeFileSync(path.join(output, 'latest-report.json'), JSON.stringify(report, null, 2) + '\n');
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
