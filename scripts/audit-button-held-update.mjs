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
export const heldUpdateScenarios = ['none', 'equivalent', 'sibling-text', 'sibling-paint', 'after-release'];

export function inspectHeldUpdateCase(entry) {
  const errors = [], checks = {};
  try {
    assert.ok(heldUpdateScenarios.includes(entry.scenario));
    assert.deepEqual(entry.stages.map(s => s.name), ['initial', 'hover', 'held-before-update', 'held-after-update', 'released', 'after-release-update']);
    for (const [index, stage] of entry.stages.entries()) {
      const { reference, astylar } = stage;
      assert.deepEqual(astylar.site, reference.site, 'equal authored inputs at every boundary');
      assert.deepEqual(astylar.initialSite, reference.initialSite);
      for (const mode of ['reference', 'astylar']) {
        const sample = stage[mode];
        assert.equal(sample.mode, mode); assert.equal(sample.stackTracing, entry.stackTracing);
        assert.equal(sample.controls.length, 2);
        for (const [i, control] of sample.controls.entries()) {
          assert.equal(control.id, ['first', 'second'][i]); assert.equal(control.tag, 'BUTTON');
          assert.equal(control.nativeType, 'button'); assert.equal(control.disabled, false);
          assert.equal(control.tabIndex, 0); assert.equal(control.retainedNativeNode, true);
          assert.equal(control.text, sample.site.root.children[i].textContent);
        }
        assert.ok(sample.nativeEvents.every(e => e.trusted === true));
        assert.equal(count(sample.nativeEvents, 'pointercancel'), 0);
        assert.equal(count(sample.nativeEvents, 'pointerdown'), index >= 2 ? 1 : 0);
        assert.equal(count(sample.nativeEvents, 'pointerup'), index >= 4 ? 1 : 0);
        assert.equal(count(sample.nativeEvents, 'click'), index >= 4 ? 1 : 0);
        if (index >= 2) {
          const down = sample.nativeEvents.find(e => e.type === 'pointerdown');
          assert.equal(down.buttons, 1); assert.equal(down.target.tag, mode === 'reference' ? 'BUTTON' : 'CANVAS');
          if (mode === 'reference') assert.equal(down.target.id, 'first');
        }
        if (index) assert.deepEqual(sample.nativeEvents.slice(0, entry.stages[index - 1][mode].nativeEvents.length), entry.stages[index - 1][mode].nativeEvents);
      }
      assert.ok(astylar.diagnostics && astylar.diagnostics.messages.every(m => m.severity !== 'error'));
      assert.equal(astylar.diagnostics.session.status, 'idle');
      assert.deepEqual(astylar.site.root.children[0], astylar.initialSite.root.children[0], 'pressed owner authored node unchanged');
      assert.deepEqual(astylar.site.styles.filter(r => r.selector !== '#second'), astylar.initialSite.styles.filter(r => r.selector !== '#second'), 'pressed owner styles unchanged');
      assert.equal(reference.controls[0].active, index === 2 || index === 3);
      if (index >= 2) assert.equal(astylar.publicEvents.find(e => e.type === 'pointerdown')?.targetId, 'first');
      const pressed = astylar.diagnostics.interaction.pressedElementId ?? null;
      checks[`${stage.name}:pressed`] = pressed === (index === 2 || index === 3 ? 'first' : null);
      checks[`${stage.name}:release-count`] = count(astylar.publicEvents, 'pointerup') === (index >= 4 ? 1 : 0);
      checks[`${stage.name}:click-count`] = count(astylar.publicEvents, 'click') === (index >= 4 ? 1 : 0);
      const first = astylar.resolved.elements.filter(e => e.id === 'first'); assert.equal(first.length, 1);
      const expected = index === 2 || index === 3 ? '#bbbbbb' : index >= 1 ? '#dddddd' : '#eeeeee';
      const rgb = expected === '#bbbbbb' ? 'rgb(187, 187, 187)' : expected === '#dddddd' ? 'rgb(221, 221, 221)' : 'rgb(238, 238, 238)';
      assert.equal(reference.controls[0].computed.backgroundColor, rgb);
      checks[`${stage.name}:active-style`] = first[0].effective.background === expected;
    }
    const after = entry.stages[3];
    const wantedUpdates = ['equivalent', 'sibling-text', 'sibling-paint'].includes(entry.scenario) ? 1 : 0;
    for (const side of ['reference', 'astylar']) {
      assert.equal(after[side].updates.length, wantedUpdates);
      assert.equal(entry.stages[5][side].updates.length, entry.scenario === 'none' ? 0 : 1);
    }
  } catch (error) { errors.push(error.message); }
  return { errors, checks };
}

async function main() {
  const root = process.cwd(), script = 'scripts/audit-button-held-update.mjs';
  const output = path.resolve(process.argv.find(a => a.startsWith('--output='))?.slice(9) ?? 'artifacts/material-parity/button-held-update-audit');
  assert.ok(!existsSync(output), 'Preserve previous evidence; use a new output directory.');
  const requireConsumer = createRequire(path.join(root, 'examples/material-showcase/package.json'));
  const built = await requireConsumer('esbuild').build({ absWorkingDir: root,
    entryPoints: ['examples/material-showcase/audit/button-held-update.mjs'], bundle: true, write: false,
    format: 'esm', platform: 'browser', target: 'es2022', metafile: true });
  const bundle = built.outputFiles[0].contents;
  const html = Buffer.from('<!doctype html><html><head><meta charset="utf-8"><title>Held update audit</title></head><body><script type="module" src="/audit.js"></script></body></html>');
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
    for (const dpr of [1, 2]) for (const repetition of [1, 2]) for (const stackTracing of [false, true]) for (const scenario of heldUpdateScenarios) {
      const entry = { dpr, repetition, stackTracing, scenario,
        stages: ['initial', 'hover', 'held-before-update', 'held-after-update', 'released', 'after-release-update'].map(name => ({ name })) };
      for (const mode of ['reference', 'astylar']) {
        const page = await browser.newPage({ viewport: { width: 640, height: 360 }, deviceScaleFactor: dpr });
        const assets = [];
        page.on('pageerror', e => runtimeErrors.push({ mode, dpr, repetition, stackTracing, scenario, error: String(e) }));
        page.on('response', response => {
          if (['script', 'document'].includes(response.request().resourceType()))
            assets.push(response.body().then(bytes => ({ type: response.request().resourceType(), sha256: hash(bytes) })));
        });
        try {
          await page.goto(`http://127.0.0.1:${server.address().port}/?mode=${mode}&stacks=${stackTracing}`);
          await page.waitForFunction(() => !!window.buttonHeldUpdateAudit);
          for (const [index, stage] of entry.stages.entries()) {
            if (index === 1) await page.mouse.move(80, 40);
            if (index === 2) await page.mouse.down();
            if (index === 3 && ['equivalent', 'sibling-text', 'sibling-paint'].includes(scenario))
              await page.evaluate(kind => window.buttonHeldUpdateAudit.update(kind), scenario);
            if (index === 4) await page.mouse.up();
            if (index === 5 && scenario === 'after-release') await page.evaluate(() => window.buttonHeldUpdateAudit.update('sibling-text'));
            await page.evaluate(() => window.buttonHeldUpdateAudit.settle());
            stage[mode] = await page.evaluate(() => window.buttonHeldUpdateAudit.snapshot());
            if (index === 3) {
              const file = `${scenario}-dpr${dpr}-repeat${repetition}-stacks${stackTracing}-${mode}.png`;
              const png = await page.screenshot({ path: path.join(output, file) });
              stage[mode].screenshot = { file, sha256: hash(png) };
            }
          }
          const served = await Promise.all(assets);
          assert.ok(served.some(a => a.type === 'script' && a.sha256 === provenance.bundleSha256));
          assert.ok(served.some(a => a.type === 'document' && a.sha256 === provenance.htmlSha256));
          entry[`${mode}Runtime`] = { assets: served, disposed: (await page.evaluate(() => window.buttonHeldUpdateAudit.dispose())).disposed };
        } finally { await page.close(); }
      }
      Object.assign(entry, inspectHeldUpdateCase(entry)); results.push(entry);
      console.log(JSON.stringify({ dpr, repetition, stackTracing, scenario, errors: entry.errors,
        failures: Object.entries(entry.checks).filter(([, pass]) => !pass).map(([name]) => name) }));
    }
    const report = { schemaVersion: 1, kind: 'public-button-held-compatible-update-proof', browser: browser.version(),
      viewport: { width: 640, height: 360 }, surfaceCssSize: { width: 400, height: 160 }, scenarios: heldUpdateScenarios,
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
