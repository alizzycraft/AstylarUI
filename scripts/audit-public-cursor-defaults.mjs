import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';
import { cursorCases, cursorInput } from '../examples/material-showcase/audit/cursor-default-input.mjs';

const hash = x => createHash('sha256').update(x).digest('hex');
export function inspectCursorDefaults(results) {
  assert.equal(results.length, 36);
  assert.equal(new Set(results.map(e => `${e.name}/${e.dpr}/${e.translated}`)).size, 36);
  const differences = [];
  for (const e of results) {
    assert.ok(cursorCases.includes(e.name)); assert.ok([1, 2].includes(e.dpr)); assert.equal(typeof e.translated, 'boolean');
    assert.deepEqual(e.stages.map(s => s.name), ['initial', 'hover', 'held', 'release', 'leave']);
    const origin = { x: e.translated ? 64 : 0, y: e.translated ? 40 : 0 };
    assert.deepEqual(e.insidePoint, { x: origin.x + 172, y: origin.y + 84 });
    for (const [index, stage] of e.stages.entries()) {
      for (const side of ['reference', 'astylar']) {
        const s = stage[side]; assert.equal(s.mode, side); assert.equal(s.name, e.name); assert.equal(s.translated, e.translated);
        assert.deepEqual(s.site, cursorInput(e.name));
        assert.deepEqual(s.surfaceBox, { ...origin, width: 240, height: 140 });
        assert.deepEqual(s.point, index === 0 || index === 4 ? { x: 400, y: 250 } : e.insidePoint);
      }
      const r = stage.reference, a = stage.astylar;
      assert.deepEqual(r.target.box, { x: origin.x + 36, y: origin.y + 48, width: 140, height: 40 });
      assert.ok(a.diagnostics.messages.every(m => m.severity !== 'error'));
      assert.equal(a.diagnostics.session.status, 'idle');
      const target = a.resolved.elements.filter(n => n.id === 'target'); assert.equal(target.length, 1);
      const resolved = target[0].effective.cursor;
      if (r.target.cursor !== resolved) differences.push({ name: e.name, dpr: e.dpr, translated: e.translated,
        stage: stage.name, boundary: 'owner-style', reference: r.target.cursor, astylar: resolved });
      if (index > 0 && index < 4) {
        assert.equal(r.hit.id, 'target'); assert.equal(r.hit.pointTouchesText, false);
        assert.equal(a.hit.id, 'audit-stage');
        assert.equal(a.diagnostics.interaction.hoveredElementId, 'target');
        const reference = r.hit.cursor === 'auto' ? 'default' : r.hit.cursor;
        assert.ok(['default', 'pointer'].includes(reference));
        if (reference !== a.canvasCursor) differences.push({ name: e.name, dpr: e.dpr, translated: e.translated,
          stage: stage.name, boundary: 'blank-inset-effective-cursor', reference, astylar: a.canvasCursor });
      }
    }
    for (const side of ['reference', 'astylar']) assert.equal(e[`${side}Disposed`], true);
  }
  return differences;
}

async function main() {
  const root = process.cwd(), args = process.argv.slice(2); assert.equal(args.length, 1); assert.ok(args[0].startsWith('--output='));
  const output = path.resolve(args[0].slice(9)); assert.ok(!existsSync(output), 'Use a new evidence directory');
  const consumer = createRequire(path.join(root, 'examples/material-showcase/package.json'));
  const built = await consumer('esbuild').build({ absWorkingDir: root,
    entryPoints: ['examples/material-showcase/audit/cursor-defaults.mjs'], bundle: true, write: false,
    format: 'esm', platform: 'browser', target: 'es2022', metafile: true });
  const bundle = built.outputFiles[0].contents;
  const html = Buffer.from('<!doctype html><html><head><meta charset="utf-8"><title>Public cursor default audit</title></head><body><script type="module" src="/audit.js"></script></body></html>');
  mkdirSync(output, { recursive: true }); writeFileSync(path.join(output, 'audit.js'), bundle);
  const provenance = { sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    script: { file: 'scripts/audit-public-cursor-defaults.mjs', sha256: hash(readFileSync('scripts/audit-public-cursor-defaults.mjs')) },
    bundleSha256: hash(bundle), htmlSha256: hash(html),
    packages: Object.fromEntries(['@angular/core', '@angular/platform-browser', '@babylonjs/core', 'astylarui', 'esbuild']
      .map(name => [name, JSON.parse(readFileSync(`examples/material-showcase/node_modules/${name}/package.json`)).version])),
    bundleInputs: Object.keys(built.metafile.inputs).sort().map(file => ({ file, sha256: hash(readFileSync(file)) })) };
  writeFileSync(path.join(output, 'provenance.json'), JSON.stringify(provenance, null, 2) + '\n');
  const server = createServer((req, res) => { res.setHeader('content-type', req.url === '/audit.js' ? 'text/javascript' : 'text/html'); res.end(req.url === '/audit.js' ? bundle : html); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ channel: 'chrome', headless: true }), results = [], runtimeErrors = [];
  try {
    for (const dpr of [1, 2]) for (const translated of [false, true]) for (const name of cursorCases) {
      const origin = { x: translated ? 64 : 0, y: translated ? 40 : 0 };
      const entry = { name, dpr, translated, insidePoint: { x: origin.x + 172, y: origin.y + 84 },
        stages: ['initial', 'hover', 'held', 'release', 'leave'].map(name => ({ name })) };
      for (const mode of ['reference', 'astylar']) {
        const page = await browser.newPage({ viewport: { width: 480, height: 300 }, deviceScaleFactor: dpr }), assets = [];
        page.on('pageerror', e => runtimeErrors.push({ name, dpr, translated, mode, error: String(e) }));
        page.on('console', m => { if (m.type() === 'error') runtimeErrors.push({ name, dpr, translated, mode, error: m.text() }); });
        page.on('response', r => { if (['script', 'document'].includes(r.request().resourceType())) assets.push(r.body().then(b => ({ type: r.request().resourceType(), sha256: hash(b) }))); });
        try {
          await page.goto(`http://127.0.0.1:${server.address().port}/?mode=${mode}&case=${name}&translated=${translated}`);
          await page.waitForFunction(() => !!window.cursorDefaultAudit);
          for (const [index, stage] of entry.stages.entries()) {
            const point = index === 0 || index === 4 ? { x: 400, y: 250 } : entry.insidePoint;
            if ([0, 1, 4].includes(index)) await page.mouse.move(point.x, point.y);
            if (index === 2) await page.mouse.down(); if (index === 3) await page.mouse.up();
            await page.evaluate(() => window.cursorDefaultAudit.settle());
            stage[mode] = await page.evaluate(p => window.cursorDefaultAudit.snapshot(p), point);
            if (index === 1) {
              const file = `${name}-dpr${dpr}-translated${translated}-${mode}.png`;
              stage[mode].screenshot = { file, sha256: hash(await page.screenshot({ path: path.join(output, file) })) };
            }
          }
          const served = await Promise.all(assets);
          assert.ok(served.some(a => a.type === 'script' && a.sha256 === provenance.bundleSha256));
          assert.ok(served.some(a => a.type === 'document' && a.sha256 === provenance.htmlSha256));
          entry[`${mode}Assets`] = served;
          entry[`${mode}Disposed`] = (await page.evaluate(() => window.cursorDefaultAudit.dispose())).disposed;
        } finally { await page.close(); }
      }
      results.push(entry); console.log(JSON.stringify({ name, dpr, translated,
        reference: entry.stages.map(s => s.reference.target.cursor), candidate: entry.stages.map(s =>
          s.astylar.resolved.elements.find(e => e.id === 'target')?.effective.cursor),
        canvas: entry.stages.map(s => s.astylar.canvasCursor) }));
    }
    let differences, evidenceError;
    try { differences = inspectCursorDefaults(results); } catch (e) { evidenceError = String(e); }
    const report = { schemaVersion: 1, kind: 'public-equal-input-cursor-default-reduction', browser: browser.version(),
      viewport: { width: 480, height: 300 }, packages: provenance.packages,
      provenance: { file: 'provenance.json', sha256: hash(readFileSync(path.join(output, 'provenance.json'))) },
      runtimeErrors, evidenceError: evidenceError ?? null, results, differences: differences ?? null };
    writeFileSync(path.join(output, 'latest-report.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify({ cases: results.length, differences: differences?.length, runtimeErrors, evidenceError, output }));
    process.exitCode = runtimeErrors.length || evidenceError ? 2 : differences.length ? 1 : 0;
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href)
  main().catch(error => { console.error(error); process.exitCode = 2; });
