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
const spec = process.argv[5] ?? 'src/parity/overlay-layout-stage.audit.spec.ts';
const materialReduction = 'examples/material-showcase/src/app/input-equivalence-proof.spec.ts';
const inspectionConsumer = 'examples/angular-consumer/src/app/style-inspection.browser.spec.ts';
assert.ok(['src/parity/overlay-layout-stage.audit.spec.ts', 'src/parity/rounded-radius.audit.spec.ts', materialReduction, inspectionConsumer].includes(spec));
const packedRoot = process.argv[6] ? path.resolve(process.argv[6]) : null;
assert.ok(!packedRoot || spec === inspectionConsumer, 'Explicit packed root is bounded to the public inspection suite');
if (spec === inspectionConsumer) assert.equal(process.env.ASTYLAR_AUDIT_SPEC_FILTER ?? '', '', 'Run the complete public inspection suite');
if (spec === materialReduction) {
  assert.equal(process.env.ASTYLAR_AUDIT_SPEC_FILTER,
    'paragraph flow places a divider without absolute text or separator offsets',
    'Material reduction execution requires the exact audited divider filter');
}
assert.ok(dpr === 1 || dpr === 2, 'DPR must be 1 or 2');
assert.ok(process.argv[2] && !existsSync(output), 'Supply a new evidence directory');
const consumer = createRequire(path.join(root, 'examples/material-showcase/package.json'));
const local = createRequire(import.meta.url);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const packageResolver = packedRoot ? createRequire(path.join(packedRoot, 'package.json')) : consumer;
const packageRoot = path.dirname(packageResolver.resolve('astylarui'));
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
  ['../app/services/dom/elements/flex.service', path.join(packageRoot, '../app/services/dom/elements/flex.service.js')],
]);
const built = await consumer('esbuild').build({ absWorkingDir: root,
  stdin: { contents: `${spec === inspectionConsumer ? "import 'zone.js'; import 'zone.js/testing';" : ''}
    import '@angular/compiler';
    import {getTestBed} from '@angular/core/testing';
    import {BrowserTestingModule,platformBrowserTesting} from '@angular/platform-browser/testing';
    getTestBed().initTestEnvironment(BrowserTestingModule,platformBrowserTesting());
    await import('./${spec}');
    const results=[];
    jasmine.getEnv().addReporter({specDone:r=>results.push({description:r.fullName,status:r.status,failures:r.failedExpectations.map(e=>e.message)}),jasmineDone:r=>window.auditDone={status:r.overallStatus,results}});
    jasmine.getEnv().configure({random:false, specFilter: spec => spec.getFullName().includes(${JSON.stringify(process.env.ASTYLAR_AUDIT_SPEC_FILTER ?? '')})}); jasmine.getEnv().execute();`, resolveDir: root },
  bundle: true, write: false, format: 'esm', platform: 'browser', target: 'es2022', metafile: true,
  ...(packedRoot ? { nodePaths: [path.join(root, 'examples/material-showcase/node_modules')] } : {}),
  plugins: [{ name: 'installed-audit-package', setup(build) {
    build.onResolve({ filter: /^astylarui$/ }, () => ({ path: packageResolver.resolve('astylarui') }));
    build.onResolve({ filter: /^\.\.\/(lib\/(index|astylar)|app\/services\/(css-layout-geometry|dom\/elements\/flex.service))$/ }, args => ({ path: aliases.get(args.path) }));
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
  ['/audit-roboto.woff2', readFileSync('examples/material-showcase/node_modules/@fontsource/roboto/files/roboto-latin-500-normal.woff2')],
]);
const html = '<!doctype html><html><body><script src="/jasmine.js"></script><script src="/jasmine-html.js"></script><script src="/boot0.js"></script><script type="module" src="/audit.js"></script></body></html>';
const provenance = { commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  specFilter: process.env.ASTYLAR_AUDIT_SPEC_FILTER ?? '',
  freshBuild, compiledReceipts, packedRoot,
  runnerSha256: hash(readFileSync('scripts/audit-overlay-layout-stage.mjs')),
  htmlSha256: hash(html), runtimeAssets: [...assets].map(([url, bytes]) => ({ url, sha256: hash(bytes) })),
  packages: Object.fromEntries(['@angular/core', '@babylonjs/core', 'astylarui', 'esbuild'].map(name => [name,
    JSON.parse(readFileSync(name === 'astylarui' && packedRoot ? path.join(packedRoot, 'package.json') : `examples/material-showcase/node_modules/${name}/package.json`)).version])),
  bundleSha256: hash(bundle), inputs: Object.keys(built.metafile.inputs).filter(f => f !== '<stdin>').sort().map(file => ({ file, sha256: hash(readFileSync(file)) })) };
writeFileSync(path.join(output, 'provenance.json'), JSON.stringify(provenance, null, 2));
const server = createServer((req, res) => { res.setHeader('content-type', req.url === '/audit-roboto.woff2' ? 'font/woff2' : assets.has(req.url) ? 'text/javascript' : 'text/html'); res.end(assets.get(req.url) ?? html); });
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 900, height: 800 }, deviceScaleFactor: dpr });
  const observations = [], errors = [];
  const screenshots = [];
  await page.exposeFunction('auditCapture', async ({ composition, width, height }) => {
    const radiusDiagnostic = /^radius-(div|button)-(24|36|9999)$/.test(composition);
    const depthDiagnostic = /^depth-(low|high)$/.test(composition);
    assert.ok(depthDiagnostic || radiusDiagnostic || ['fixed-clip', 'absolute-clip', 'rounded-toggle', 'rounded-border-only'].includes(composition));
    const captures = {};
    const rasters = {};
    for (const [side, selector] of [['reference', 'iframe'], ['astylar', 'canvas']]) {
      const file = `${composition}${depthDiagnostic ? `-${height}` : ''}-${side}.png`;
      const bytes = await page.locator(selector).screenshot({ path: path.join(output, file) });
      captures[side] = { file, sha256: hash(bytes) };
      rasters[side] = PNG.sync.read(bytes);
    }
    const reference = rasters.reference, candidate = rasters.astylar;
    assert.equal(reference.width, width * dpr);
    assert.equal(reference.height, height * dpr);
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
    screenshots.push({ composition, width, height, captures, paint });
    if (depthDiagnostic) {
      assert.equal(referencePanePixels, 120 * 24 * dpr * dpr);
      assert.equal(paneMaskDifferences, 0, 'Fully in-viewport pane must paint regardless of z-index');
      return;
    }
    if (radiusDiagnostic) {
      assert.ok(referencePanePixels > 20000 * dpr * dpr, 'Native capsule must be present');
      assert.ok(candidatePanePixels > 0, 'Candidate capsule must be present');
      // Bounded shape diagnostic, not full antialiasing equivalence. Preserve
      // failing pixels rather than allowing a grossly under-sampled outline.
      assert.ok(paneMaskDifferences / referencePanePixels < .01,
        `Rounded shape solid-mask disagreement exceeds 1%: ${JSON.stringify(paint)}`);
      return;
    }
    // Fixed pane extends 20px beyond viewport; absolute pane extends 20px
    // beyond its clipping host. Both leave exactly 28px of the 48px pane.
    if (!composition.startsWith('rounded-')) {
      assert.equal(referencePanePixels, 120 * 28 * dpr * dpr);
      assert.equal(paneMaskDifferences, 0, 'Pane clipping differs from native paint');
    } else {
      assert.ok(composition === 'rounded-border-only' ? referencePanePixels === 0 : referencePanePixels > 0);
      // Record curved-edge differences without pretending exact solid-pixel
      // masks establish equivalent antialiasing or complete border paint.
      let referenceSolidBorderPixels = 0, borderPixelsCoveredByChildren = 0, solidBorderMismatches = 0;
      const coveredSamples = [];
      for (let offset = 0; offset < reference.data.length; offset += 4) {
        const ref = reference.data.subarray(offset, offset + 4);
        const actual = candidate.data.subarray(offset, offset + 4);
        if (ref[0] !== 121 || ref[1] !== 116 || ref[2] !== 126 || ref[3] !== 255) continue;
        referenceSolidBorderPixels++;
        solidBorderMismatches += Number(!ref.equals(actual));
        const whiteChild = actual[0] === 255 && actual[1] === 255 && actual[2] === 255 && actual[3] === 255;
        if (!whiteChild && !isPane(candidate.data, offset)) continue;
        borderPixelsCoveredByChildren++;
        if (coveredSamples.length < 8) coveredSamples.push({
          x: (offset / 4) % reference.width, y: Math.floor(offset / 4 / reference.width),
          reference: [...ref], candidate: [...actual],
        });
      }
      Object.assign(paint, { referenceSolidBorderPixels, solidBorderMismatches, borderPixelsCoveredByChildren, coveredSamples });
      assert.ok(referenceSolidBorderPixels > 0, 'Native border control must be visible');
      if (composition === 'rounded-border-only') {
        assert.equal(candidatePanePixels, 0, 'Transparent children must not paint dark fill');
        assert.equal(solidBorderMismatches, 0, 'Border-only control differs at solid native border pixels');
      }
      assert.equal(borderPixelsCoveredByChildren, 0, 'Solid native border pixels are replaced by child fill');
    }
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
  if (spec === inspectionConsumer) assert.equal(result.results.length, 2, 'Both public inspection tests must execute');
  process.exitCode = errors.length || result.status !== 'passed' ? 1 : 0;
} finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
