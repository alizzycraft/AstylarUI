import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const count = (events, type) => events.filter(e => e.type === type).length;
export function inspectRangeDrag(entry) {
  const errors = [], checks = {};
  try {
    assert.ok(['first', 'second'].includes(entry.target));
    assert.ok(['none', 'held-equivalent'].includes(entry.update));
    assert.deepEqual(entry.stages.map(s => s.name), ['initial', 'hover', 'held', 'updated',
      ...Array.from({ length: 8 }, (_, i) => `move-${i + 1}`), 'released']);
    const targetIndex = entry.target === 'first' ? 0 : 1, peerIndex = 1 - targetIndex;
    for (const [index, stage] of entry.stages.entries()) {
      assert.deepEqual(stage.reference.site, stage.astylar.site, 'equal authored input');
      assert.deepEqual(stage.reference.surfaceBox, stage.astylar.surfaceBox, 'equal CSS host origin and size');
      for (const side of ['reference', 'astylar']) {
        const sample = stage[side];
        assert.equal(sample.mode, side); assert.equal(sample.translated, entry.translated);
        assert.equal(sample.stackTracing, entry.stackTracing);
        assert.equal(sample.controls.length, 2);
        assert.deepEqual(sample.controls.map(c => [c.id, c.type, c.min, c.max, c.step, c.disabled]),
          [['first', 'range', '0', '100', '5', false], ['second', 'range', '0', '100', '5', false]]);
        assert.ok(sample.nativeEvents.every(e => e.trusted === true));
        assert.equal(count(sample.nativeEvents, 'pointerdown'), index >= 2 ? 1 : 0);
        assert.equal(count(sample.nativeEvents, 'pointerup'), index === 12 ? 1 : 0);
        assert.equal(count(sample.nativeEvents, 'pointercancel'), 0);
        assert.equal(sample.updates.length, entry.update === 'held-equivalent' && index >= 3 ? 1 : 0);
        if (index) assert.deepEqual(sample.nativeEvents.slice(0, entry.stages[index - 1][side].nativeEvents.length),
          entry.stages[index - 1][side].nativeEvents);
      }
      assert.ok(stage.astylar.diagnostics.messages.every(m => m.severity !== 'error'));
      assert.equal(stage.astylar.diagnostics.session.status, 'idle');
      assert.equal(stage.reference.controls[peerIndex].value, peerIndex ? '65' : '30');
      checks[`${stage.name}:peer-stable`] = stage.astylar.controls[peerIndex].value === (peerIndex ? '65' : '30');
      checks[`${stage.name}:value`] = stage.astylar.controls[targetIndex].value === stage.reference.controls[targetIndex].value;
      if (index >= 2) checks[`${stage.name}:down-target`] = stage.astylar.publicEvents.find(e => e.type === 'pointerdown')?.targetId === entry.target;
      checks[`${stage.name}:release-count`] = count(stage.astylar.publicEvents, 'pointerup') === (index === 12 ? 1 : 0);
      checks[`${stage.name}:pressed-owner`] = (stage.astylar.diagnostics.interaction.pressedElementId ?? null)
        === (index >= 2 && index < 12 ? entry.target : null);
    }
  } catch (error) { errors.push(error.message); }
  return { errors, checks };
}

async function main() {
  const root = process.cwd(), script = 'scripts/audit-public-range-drag.mjs';
  const arg = process.argv.slice(2); assert.equal(arg.length, 1); assert.ok(arg[0].startsWith('--output='));
  const output = path.resolve(arg[0].slice(9)); assert.ok(!existsSync(output), 'Use a new evidence directory');
  const requireConsumer = createRequire(path.join(root, 'examples/material-showcase/package.json'));
  const built = await requireConsumer('esbuild').build({ absWorkingDir: root,
    entryPoints: ['examples/material-showcase/audit/range-drag.mjs'], bundle: true, write: false,
    format: 'esm', platform: 'browser', target: 'es2022', metafile: true });
  const bundle = built.outputFiles[0].contents;
  const html = Buffer.from('<!doctype html><html><head><meta charset="utf-8"><title>Public range drag audit</title></head><body><script type="module" src="/audit.js"></script></body></html>');
  mkdirSync(output, { recursive: true }); writeFileSync(path.join(output, 'audit.js'), bundle);
  const provenance = { sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    script: { file: script, sha256: hash(readFileSync(script)) }, bundleSha256: hash(bundle), htmlSha256: hash(html),
    packages: Object.fromEntries(['@angular/core', '@angular/platform-browser', '@babylonjs/core', 'astylarui', 'esbuild']
      .map(name => [name, JSON.parse(readFileSync(`examples/material-showcase/node_modules/${name}/package.json`)).version])),
    bundleInputs: Object.keys(built.metafile.inputs).sort().map(file => ({ file, sha256: hash(readFileSync(file)) })) };
  writeFileSync(path.join(output, 'provenance.json'), JSON.stringify(provenance, null, 2) + '\n');
  const server = createServer((request, response) => {
    response.setHeader('content-type', request.url === '/audit.js' ? 'text/javascript' : 'text/html');
    response.end(request.url === '/audit.js' ? bundle : html);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const results = [], runtimeErrors = [];
  try {
    for (const dpr of [1, 2]) for (const translated of [false, true]) for (const target of ['first', 'second'])
      for (const update of ['none', 'held-equivalent']) for (const stackTracing of [false, true]) {
        const entry = { dpr, translated, target, update, stackTracing, stages: ['initial', 'hover', 'held', 'updated',
          ...Array.from({ length: 8 }, (_, i) => `move-${i + 1}`), 'released'].map(name => ({ name })) };
        const origin = { x: translated ? 64 : 0, y: translated ? 40 : 0 };
        const left = target === 'first' ? 20 : 240, initial = target === 'first' ? .3 : .65;
        const from = { x: origin.x + left + 160 * initial, y: origin.y + 60 };
        const to = { x: origin.x + left + (target === 'first' ? 175 : -15), y: from.y };
        entry.pointer = { from, to };
        for (const mode of ['reference', 'astylar']) {
          const page = await browser.newPage({ viewport: { width: 640, height: 360 }, deviceScaleFactor: dpr });
          const assets = [];
          page.on('pageerror', e => runtimeErrors.push({ mode, dpr, translated, target, update, type: 'pageerror', error: String(e) }));
          page.on('console', m => { if (m.type() === 'error') runtimeErrors.push({ mode, dpr, translated, target, update, type: 'console', error: m.text() }); });
          page.on('response', response => {
            if (['script', 'document'].includes(response.request().resourceType()))
              assets.push(response.body().then(bytes => ({ type: response.request().resourceType(), sha256: hash(bytes) })));
          });
          try {
            await page.goto(`http://127.0.0.1:${server.address().port}/?mode=${mode}&translated=${translated}&stacks=${stackTracing}`);
            await page.waitForFunction(() => !!window.rangeDragAudit);
            for (const [index, stage] of entry.stages.entries()) {
              if (index === 1) await page.mouse.move(from.x, from.y);
              if (index === 2) await page.mouse.down();
              if (index === 3 && update === 'held-equivalent') await page.evaluate(() => window.rangeDragAudit.update());
              if (index >= 4 && index <= 11) await page.mouse.move(from.x + (to.x - from.x) * (index - 3) / 8, from.y);
              if (index === 12) await page.mouse.up();
              await page.evaluate(() => window.rangeDragAudit.settle());
              stage[mode] = await page.evaluate(() => window.rangeDragAudit.snapshot());
              if ([0, 3, 11, 12].includes(index)) {
                const file = `dpr${dpr}-translated${translated}-${target}-${update}-stacks${stackTracing}-${stage.name}-${mode}.png`;
                stage[mode].screenshot = { file, sha256: hash(await page.screenshot({ path: path.join(output, file) })) };
              }
            }
            const served = await Promise.all(assets);
            assert.ok(served.some(a => a.type === 'script' && a.sha256 === provenance.bundleSha256));
            assert.ok(served.some(a => a.type === 'document' && a.sha256 === provenance.htmlSha256));
            entry[`${mode}Runtime`] = { assets: served, disposed: (await page.evaluate(() => window.rangeDragAudit.dispose())).disposed };
          } finally { await page.close(); }
        }
        Object.assign(entry, inspectRangeDrag(entry)); results.push(entry);
        console.log(JSON.stringify({ dpr, translated, target, update, stackTracing, errors: entry.errors,
          failures: Object.entries(entry.checks).filter(([, pass]) => !pass).map(([name]) => name),
          reference: entry.stages.map(s => s.reference.controls.map(c => c.value)),
          astylar: entry.stages.map(s => s.astylar.controls.map(c => c.value)) }));
      }
    const report = { schemaVersion: 1, kind: 'public-range-pointer-drag-reduction', browser: browser.version(),
      viewport: { width: 640, height: 360 }, surfaceCssSize: { width: 440, height: 140 },
      provenance: { file: 'provenance.json', sha256: hash(readFileSync(path.join(output, 'provenance.json'))) },
      packages: provenance.packages, runtimeErrors, results };
    writeFileSync(path.join(output, 'latest-report.json'), JSON.stringify(report, null, 2) + '\n');
    const invalid = results.filter(r => r.errors.length), failed = results.filter(r => Object.values(r.checks).some(pass => !pass));
    console.log(JSON.stringify({ cases: results.length, invalid: invalid.length, failed: failed.length, runtimeErrors, output }));
    process.exitCode = invalid.length || runtimeErrors.length ? 2 : failed.length ? 1 : 0;
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href)
  main().catch(error => { console.error(error); process.exitCode = 2; });
