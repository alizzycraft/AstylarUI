import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { PNG } from 'pngjs';

// Run the unchanged Jasmine reduction against the installed package. Private
// imports below are read-only repository instrumentation, never fixture authoring.
const root = process.cwd();
const output = path.resolve(process.argv[2] ?? '');
const dpr = Number(process.argv[3] ?? 1);
assert.ok(dpr === 1 || dpr === 2, 'DPR must be 1 or 2');
assert.ok(process.argv[2] && !existsSync(output), 'Supply a new evidence directory');
const consumer = createRequire(path.join(root, 'examples/material-showcase/package.json'));
const local = createRequire(import.meta.url);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const packageRoot = path.dirname(consumer.resolve('astylarui'));
const freshBuild = path.resolve(process.argv[4] ?? 'artifacts/material-parity/overlay-source-build-bb5a07c');
const compiledReceipts = readdirSync(freshBuild, { recursive: true }).filter(file => file.endsWith('.js')).sort().map(file => {
  const fresh = readFileSync(path.join(freshBuild, file));
  assert.deepEqual(readFileSync(path.join(packageRoot, '..', file)), fresh, `Installed code differs: ${file}`);
  assert.deepEqual(readFileSync(path.join(root, 'dist/lib', file)), fresh, `Local compiled code differs: ${file}`);
  const source = `src/${file.replaceAll('\\', '/').replace(/\.js$/, '.ts')}`;
  return { file, emittedSha256: hash(fresh), source, sourceSha256: hash(readFileSync(source)) };
});
assert.ok(compiledReceipts.length > 0);
const aliases = new Map([
  ['../lib/index', path.join(packageRoot, 'index.js')],
  ['../lib/astylar', path.join(packageRoot, 'astylar.js')],
  ['../app/services/css-layout-geometry', path.join(packageRoot, '../app/services/css-layout-geometry.js')],
]);
const built = await consumer('esbuild').build({ absWorkingDir: root,
  stdin: { contents: `import '@angular/compiler';
    import {getTestBed} from '@angular/core/testing';
    import {BrowserTestingModule,platformBrowserTesting} from '@angular/platform-browser/testing';
    getTestBed().initTestEnvironment(BrowserTestingModule,platformBrowserTesting());
    await import('./src/parity/overlay-layout-stage.audit.spec.ts');
    const results=[];
    jasmine.getEnv().addReporter({specDone:r=>results.push({description:r.fullName,status:r.status,failures:r.failedExpectations.map(e=>e.message)}),jasmineDone:r=>window.auditDone={status:r.overallStatus,results}});
    jasmine.getEnv().configure({random:false}); jasmine.getEnv().execute();`, resolveDir: root },
  bundle: true, write: false, format: 'esm', platform: 'browser', target: 'es2022', metafile: true,
  plugins: [{ name: 'installed-audit-package', setup(build) {
    build.onResolve({ filter: /^\.\.\/(lib\/(index|astylar)|app\/services\/css-layout-geometry)$/ }, args => ({ path: aliases.get(args.path) }));
    build.onResolve({ filter: /^(@angular\/|@babylonjs\/core)/ }, args => ({ path: consumer.resolve(args.path) }));
  } }],
});
mkdirSync(output, { recursive: true });
const bundle = built.outputFiles[0].contents;
writeFileSync(path.join(output, 'audit.js'), bundle);
const jasmineRoot = path.dirname(local.resolve('jasmine-core/lib/jasmine-core/jasmine.js'));
const assets = new Map([
  ['/audit.js', bundle],
  ['/jasmine.js', readFileSync(path.join(jasmineRoot, 'jasmine.js'))],
  ['/jasmine-html.js', readFileSync(path.join(jasmineRoot, 'jasmine-html.js'))],
  ['/boot0.js', readFileSync(path.join(jasmineRoot, 'boot0.js'))],
]);
const html = '<!doctype html><html><body><script src="/jasmine.js"></script><script src="/jasmine-html.js"></script><script src="/boot0.js"></script><script type="module" src="/audit.js"></script></body></html>';
const provenance = { commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  freshBuild, compiledReceipts,
  runnerSha256: hash(readFileSync('scripts/audit-overlay-layout-stage.mjs')),
  htmlSha256: hash(html), runtimeAssets: [...assets].map(([url, bytes]) => ({ url, sha256: hash(bytes) })),
  packages: Object.fromEntries(['@angular/core', '@babylonjs/core', 'astylarui', 'esbuild'].map(name => [name,
    JSON.parse(readFileSync(`examples/material-showcase/node_modules/${name}/package.json`)).version])),
  bundleSha256: hash(bundle), inputs: Object.keys(built.metafile.inputs).filter(f => f !== '<stdin>').sort().map(file => ({ file, sha256: hash(readFileSync(file)) })) };
writeFileSync(path.join(output, 'provenance.json'), JSON.stringify(provenance, null, 2));
const server = createServer((req, res) => { res.setHeader('content-type', assets.has(req.url) ? 'text/javascript' : 'text/html'); res.end(assets.get(req.url) ?? html); });
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 900, height: 800 }, deviceScaleFactor: dpr });
  const observations = [], errors = [];
  const screenshots = [];
  await page.exposeFunction('auditCapture', async ({ composition }) => {
    assert.ok(['fixed-clip', 'absolute-clip'].includes(composition));
    const captures = {};
    const rasters = {};
    for (const [side, selector] of [['reference', 'iframe'], ['astylar', 'canvas']]) {
      const file = `${composition}-${side}.png`;
      const bytes = await page.locator(selector).screenshot({ path: path.join(output, file) });
      captures[side] = { file, sha256: hash(bytes) };
      rasters[side] = PNG.sync.read(bytes);
    }
    const reference = rasters.reference, candidate = rasters.astylar;
    assert.equal(reference.width, 320 * dpr);
    assert.equal(reference.height, 200 * dpr);
    assert.equal(candidate.width, reference.width);
    assert.equal(candidate.height, reference.height);
    const isPane = (pixels, offset) => pixels[offset] === 48 && pixels[offset + 1] === 45 && pixels[offset + 2] === 50 && pixels[offset + 3] === 255;
    let referencePanePixels = 0, candidatePanePixels = 0, paneMaskDifferences = 0, allPixelDifferences = 0;
    for (let offset = 0; offset < reference.data.length; offset += 4) {
      const r = isPane(reference.data, offset), a = isPane(candidate.data, offset);
      referencePanePixels += Number(r); candidatePanePixels += Number(a);
      paneMaskDifferences += Number(r !== a);
      allPixelDifferences += Number(!reference.data.subarray(offset, offset + 4).equals(candidate.data.subarray(offset, offset + 4)));
    }
    const paint = { referencePanePixels, candidatePanePixels, paneMaskDifferences, allPixelDifferences };
    screenshots.push({ composition, captures, paint });
    // Fixed pane extends 20px beyond viewport; absolute pane extends 20px
    // beyond its clipping host. Both leave exactly 28px of the 48px pane.
    assert.equal(referencePanePixels, 120 * 28 * dpr * dpr);
    assert.equal(paneMaskDifferences, 0, 'Pane clipping differs from native paint');
  });
  page.on('pageerror', error => errors.push(String(error)));
  page.on('console', message => { if (message.text().startsWith('OVERLAY_LAYOUT_STAGE ')) observations.push(JSON.parse(message.text().slice(21))); });
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  try {
    await page.waitForFunction(() => !!window.auditDone, undefined, { timeout: 120000 });
  } catch (error) {
    writeFileSync(path.join(output, 'failure.json'), JSON.stringify({ errors, observations, error: String(error) }, null, 2));
    throw error;
  }
  const result = await page.evaluate(() => window.auditDone);
  writeFileSync(path.join(output, 'result.json'), JSON.stringify({ browser: browser.version(), result, observations, screenshots, errors }, null, 2));
  console.log(JSON.stringify({ output, result, observations: observations.length, errors }));
  process.exitCode = errors.length || result.status !== 'passed' ? 1 : 0;
} finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
