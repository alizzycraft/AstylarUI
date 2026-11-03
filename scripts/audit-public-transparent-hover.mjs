import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { chromium } from 'playwright-core';
import { cursorInput } from '../examples/material-showcase/audit/transparent-hover-input.mjs';
import { materialBrowserLaunchOptions, inspectMaterialBrowserLaunch } from '../tests/material-parity/run-checkpoint.mjs';

const hash = b => createHash('sha256').update(b).digest('hex');
const output = path.resolve(process.argv[2] ?? '');
assert.ok(output.startsWith(path.resolve('artifacts/material-parity') + path.sep));
assert.ok(!fs.existsSync(output), 'Preserve existing evidence');
const entry = path.resolve('examples/material-showcase/audit/cursor-defaults.mjs');
const original = fs.readFileSync(entry, 'utf8');
const marker = "from './cursor-default-input.mjs'";
assert.equal(original.split(marker).length, 2);
// Reuse the established package-root mount and identical native CSS translator.
const transformed = original.replace(marker, "from './transparent-hover-input.mjs'");
const consumer = createRequire(path.resolve('examples/material-showcase/package.json'));
const built = await consumer('esbuild').build({ absWorkingDir: process.cwd(), entryPoints: [entry],
  bundle: true, write: false, format: 'esm', platform: 'browser', target: 'es2022', metafile: true,
  plugins: [{ name: 'diagnostic-input-only', setup(build) {
    build.onLoad({ filter: /cursor-defaults\.mjs$/ }, () => ({ contents: transformed, loader: 'js', resolveDir: path.dirname(entry) }));
  } }] });
const bundle = built.outputFiles[0].contents;
const html = Buffer.from('<!doctype html><html><head><meta charset="utf-8"></head><body><script type="module" src="/audit.js"></script></body></html>');
const inputs = Object.keys(built.metafile.inputs).sort().map(file => ({ file, sha256: hash(fs.readFileSync(file)) }));
fs.mkdirSync(output);
fs.writeFileSync(path.join(output, 'audit.js'), bundle);
fs.writeFileSync(path.join(output, 'index.html'), html);
const server = createServer((req, res) => {
  res.setHeader('content-type', req.url === '/audit.js' ? 'text/javascript' : 'text/html');
  res.end(req.url === '/audit.js' ? bundle : html);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
const results = [], errors = [];
try {
  browser = await chromium.launch(materialBrowserLaunchOptions());
  const launch = await inspectMaterialBrowserLaunch(browser);
  for (const dpr of [1, 2]) for (const name of ['transparent', 'rgba', 'opaque']) {
    const pair = { dpr, name, stages: [] };
    for (const mode of ['reference', 'astylar']) {
      const page = await browser.newPage({ viewport: { width: 480, height: 300 }, deviceScaleFactor: dpr });
      const pending = [], assets = [];
      page.on('pageerror', e => errors.push(String(e)));
      page.on('response', response => {
        if (!['script', 'document'].includes(response.request().resourceType())) return;
        pending.push(response.body().then(bytes => assets.push({ type: response.request().resourceType(), sha256: hash(bytes) })));
      });
      try {
        await page.goto(`http://127.0.0.1:${server.address().port}/?mode=${mode}&case=${name}&translated=false`);
        await page.waitForFunction(() => !!window.cursorDefaultAudit);
        for (const state of ['static', 'hover', 'leave', 'leave-later']) {
          if (state === 'hover') await page.mouse.move(172, 84);
          if (state === 'leave') await page.mouse.move(1, 1);
          if (state === 'leave-later') await page.waitForTimeout(300);
          await page.evaluate(() => window.cursorDefaultAudit.settle());
          const snapshot = await page.evaluate(() => window.cursorDefaultAudit.snapshot({ x: 172, y: 84 }));
          assert.deepEqual(snapshot.site, cursorInput(name));
          const file = `${mode}-${name}-dpr${dpr}-${state}.png`;
          const png = await page.screenshot({ path: path.join(output, file), animations: 'disabled' });
          pair.stages.push({ mode, state, snapshot, screenshot: { file, sha256: hash(png) } });
        }
        await Promise.all(pending);
        assert.ok(assets.some(x => x.type === 'script' && x.sha256 === hash(bundle)));
        assert.ok(assets.some(x => x.type === 'document' && x.sha256 === hash(html)));
        pair[mode + 'Assets'] = assets;
        assert.equal((await page.evaluate(() => window.cursorDefaultAudit.dispose())).disposed, true);
      } finally { await page.close(); }
    }
    results.push(pair);
  }
  assert.deepEqual(errors, []);
  const report = { launch, browser: browser.version(), inputs, bundleSha256: hash(bundle), htmlSha256: hash(html),
    transform: { file: entry, originalSha256: hash(original), transformedSha256: hash(transformed),
      operation: "Replace only cursor-default-input.mjs import with transparent-hover-input.mjs" }, results, errors,
    boundary: 'Public package-root mount and identical native CSS/SiteData;pointer-only hover/leave,not focus/click. Transparent keyword versus alpha-zero/opaque controls,DPR1/2. No Material or core mutation. Source/captured implementation binding and original-case attribution are separate.' };
  fs.writeFileSync(path.join(output, 'latest-report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ output, pairs: results.length, errors }));
} finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
