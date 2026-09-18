import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';
import { PNG } from 'pngjs';
import { alignments, contexts, verticalAlignInput } from '../examples/material-showcase/audit/vertical-align-input.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export function blueInk(png, dpr, box) {
  let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity, count = 0;
  for (let y = 0; y < png.height; y++) for (let x = 0; x < png.width; x++) {
    const i = (y * png.width + x) * 4, [r, g, b, a] = png.data.subarray(i, i + 4);
    if (a > 200 && b > 110 && b - r > 70 && b - g > 50) {
      left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y); count++;
    }
  }
  assert.ok(count > 20, 'Missing blue target glyphs');
  return { x: left / dpr - box.x, y: top / dpr - box.y,
    width: (right - left + 1) / dpr, height: (bottom - top + 1) / dpr, pixels: count };
}

export function inspectVerticalAlign(results) {
  assert.equal(results.length, contexts.length * alignments.length * 4);
  assert.equal(new Set(results.map(e => `${e.dpr}/${e.translated}/${e.context}/${e.alignment}`)).size, results.length);
  for (const entry of results) {
    assert.ok([1, 2].includes(entry.dpr)); assert.equal(typeof entry.translated, 'boolean');
    for (const side of ['reference', 'astylar']) {
      const sample = entry[side]; assert.equal(sample.mode, side);
      assert.deepEqual(sample.site, verticalAlignInput(entry.context, entry.alignment));
      assert.equal(sample.context, entry.context); assert.equal(sample.alignment, entry.alignment);
      assert.equal(sample.translated, entry.translated); assert.equal(sample.fontAvailable, true);
      assert.deepEqual(sample.surfaceBox, { x: entry.translated ? 64 : 0, y: entry.translated ? 40 : 0, width: 400, height: 200 });
      for (const key of ['x', 'y', 'width', 'height', 'pixels']) assert.ok(Number.isFinite(sample.ink[key]));
      assert.ok(sample.ink.pixels > 20); assert.equal(sample.disposed, true);
    }
    assert.ok(entry.astylar.diagnostics.messages.every(m => m.severity !== 'error'));
    assert.equal(entry.astylar.diagnostics.session.status, 'idle');
    const target = entry.reference.reference.find(e => e.id === 'target');
    assert.equal(target.style.verticalAlign, entry.alignment === 'omitted' ? 'baseline' : entry.alignment);
  }
  return results.filter(e => e.alignment !== 'baseline').map(entry => {
    const base = results.find(e => e.dpr === entry.dpr && e.translated === entry.translated && e.context === entry.context && e.alignment === 'baseline');
    const delta = side => ({ x: entry[side].ink.x - base[side].ink.x, y: entry[side].ink.y - base[side].ink.y });
    const reference = delta('reference'), astylar = delta('astylar');
    return { dpr: entry.dpr, translated: entry.translated, context: entry.context, alignment: entry.alignment,
      reference, astylar, deltaMatches: Math.abs(reference.x - astylar.x) <= 0.5 && Math.abs(reference.y - astylar.y) <= 0.5 };
  });
}

async function main() {
  const root = process.cwd(), args = process.argv.slice(2);
  assert.equal(args.length, 1); assert.ok(args[0].startsWith('--output='));
  const output = path.resolve(args[0].slice(9)); assert.ok(!existsSync(output), 'Use a new evidence directory');
  const requireConsumer = createRequire(path.join(root, 'examples/material-showcase/package.json'));
  const built = await requireConsumer('esbuild').build({ absWorkingDir: root,
    entryPoints: ['examples/material-showcase/audit/vertical-align.mjs'], bundle: true, write: false,
    format: 'esm', platform: 'browser', target: 'es2022', metafile: true });
  const bundle = built.outputFiles[0].contents;
  const html = Buffer.from('<!doctype html><html><head><meta charset="utf-8"><title>Public vertical alignment audit</title></head><body><script type="module" src="/audit.js"></script></body></html>');
  mkdirSync(output, { recursive: true }); writeFileSync(path.join(output, 'audit.js'), bundle);
  const provenance = { sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    script: { file: 'scripts/audit-public-vertical-align.mjs', sha256: hash(readFileSync('scripts/audit-public-vertical-align.mjs')) },
    bundleSha256: hash(bundle), htmlSha256: hash(html),
    packages: Object.fromEntries(['@angular/core', '@angular/platform-browser', '@babylonjs/core', 'astylarui', 'esbuild']
      .map(name => [name, JSON.parse(readFileSync(`examples/material-showcase/node_modules/${name}/package.json`)).version])),
    bundleInputs: Object.keys(built.metafile.inputs).sort().map(file => ({ file, sha256: hash(readFileSync(file)) })) };
  writeFileSync(path.join(output, 'provenance.json'), JSON.stringify(provenance, null, 2) + '\n');
  const server = createServer((req, res) => { res.setHeader('content-type', req.url === '/audit.js' ? 'text/javascript' : 'text/html'); res.end(req.url === '/audit.js' ? bundle : html); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const results = [], runtimeErrors = [];
  try {
    for (const dpr of [1, 2]) for (const translated of [false, true]) for (const context of contexts) for (const alignment of alignments) {
      const entry = { dpr, translated, context, alignment };
      for (const mode of ['reference', 'astylar']) {
        const page = await browser.newPage({ viewport: { width: 560, height: 320 }, deviceScaleFactor: dpr });
        const assets = [];
        page.on('pageerror', e => runtimeErrors.push({ ...entry, mode, error: String(e) }));
        page.on('console', m => { if (m.type() === 'error') runtimeErrors.push({ dpr, translated, context, alignment, mode, error: m.text() }); });
        page.on('response', response => { if (['script', 'document'].includes(response.request().resourceType())) assets.push(response.body().then(bytes => ({ type: response.request().resourceType(), sha256: hash(bytes) }))); });
        try {
          await page.goto(`http://127.0.0.1:${server.address().port}/?mode=${mode}&context=${context}&alignment=${alignment}&translated=${translated}`);
          await page.waitForFunction(() => !!window.verticalAlignAudit);
          await page.evaluate(() => window.verticalAlignAudit.settle());
          const sample = await page.evaluate(() => window.verticalAlignAudit.snapshot());
          const file = `dpr${dpr}-translated${translated}-${context}-${alignment}-${mode}.png`;
          const bytes = await page.screenshot({ path: path.join(output, file) });
          sample.ink = blueInk(PNG.sync.read(bytes), dpr, sample.surfaceBox);
          sample.screenshot = { file, sha256: hash(bytes) }; sample.assets = await Promise.all(assets);
          assert.ok(sample.assets.some(a => a.type === 'script' && a.sha256 === provenance.bundleSha256));
          assert.ok(sample.assets.some(a => a.type === 'document' && a.sha256 === provenance.htmlSha256));
          sample.disposed = (await page.evaluate(() => window.verticalAlignAudit.dispose())).disposed;
          entry[mode] = sample;
        } finally { await page.close(); }
      }
      results.push(entry); console.log(JSON.stringify({ dpr, translated, context, alignment, reference: entry.reference.ink, astylar: entry.astylar.ink }));
    }
    const deltas = inspectVerticalAlign(results);
    const report = { schemaVersion: 1, kind: 'public-vertical-align-applicability-reduction', browser: browser.version(),
      viewport: { width: 560, height: 320 }, packages: provenance.packages,
      provenance: { file: 'provenance.json', sha256: hash(readFileSync(path.join(output, 'provenance.json'))) }, runtimeErrors, results, deltas };
    writeFileSync(path.join(output, 'latest-report.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify({ cases: results.length, mismatchingDeltas: deltas.filter(d => !d.deltaMatches).length, runtimeErrors, output }));
    process.exitCode = runtimeErrors.length ? 2 : deltas.some(d => !d.deltaMatches) ? 1 : 0;
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href)
  main().catch(error => { console.error(error); process.exitCode = 2; });
