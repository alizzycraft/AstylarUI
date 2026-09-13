import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const hash = value => createHash('sha256').update(value).digest('hex');
export const buttonFocusPlan = [
  ['initial', 'inspect', null, null],
  ['keyboard-first', 'tab', null, 'first'],
  ['space-held', 'space-down', null, 'first'],
  ['space-released', 'space-up', null, 'first'],
  ['second-hover', 'move', 'second', 'first'],
  ['second-held', 'down', 'second', 'second'],
  ['second-released', 'up', 'second', 'second'],
  ['first-hover', 'move', 'first', 'second'],
  ['first-held', 'down', 'first', 'first'],
  ['first-released', 'up', 'first', 'first'],
].map(([state, action, target, expectedFocus]) => ({ state, action, target, expectedFocus }));

// Evidence validity is separate from a failed focus assertion. Never turn a
// missing target, synthetic event, or runtime error into evidence of a core bug.
export function checkButtonFocusSample(entry) {
  const errors = [], checks = {};
  if (JSON.stringify(entry.reference.authored) !== JSON.stringify(entry.astylar.authored)) errors.push('unequal authored inputs');
  if (JSON.stringify(entry.reference.controls) !== JSON.stringify(entry.astylar.controls)) errors.push('unequal native control inputs');
  for (const mode of ['reference', 'astylar']) {
    const sample = entry[mode];
    if (!sample.authoredUnchanged) errors.push(`${mode}: mutated inputs`);
    if (!sample.nativeEvents.length && entry.action !== 'inspect') errors.push(`${mode}: missing native input`);
    if (sample.nativeEvents.some(event => event.trusted !== true)) errors.push(`${mode}: untrusted input`);
    if (sample.controls.length !== 2 || sample.controls.some((control, index) =>
      control.id !== ['first', 'second'][index] || control.text !== control.id || control.nativeType !== 'button' ||
      control.tag !== 'BUTTON' || control.disabled !== false || control.tabIndex !== 0)) {
      errors.push(`${mode}: not two enabled focusable buttons`);
    }
    const activeButton = mode === 'reference' ? (['first', 'second'].includes(sample.active.id) ? sample.active.id : null) : sample.active.authoredId;
    if (sample.activeButton !== activeButton) errors.push(`${mode}: inconsistent active identity`);
    const required = { tab: ['keyup', 'Tab'], 'space-down': ['keydown', ' '], 'space-up': ['keyup', ' '],
      move: ['pointermove', null], down: ['pointerdown', null], up: ['pointerup', null] }[entry.action];
    if (required && !sample.nativeEvents.some(event => event.type === required[0] && event.key === required[1])) errors.push(`${mode}: missing action event`);
    if (entry.action === 'down') {
      const native = sample.nativeEvents.filter(event => event.type === 'pointerdown').at(-1);
      if (!native || native.buttons !== 1 || native.target.tag !== (mode === 'reference' ? 'BUTTON' : 'CANVAS')) errors.push(`${mode}: missing held pointer input`);
      if (mode === 'reference' && native?.target.id !== entry.target) errors.push('reference: wrong pointer target');
      if (mode === 'astylar' && sample.publicEvents.filter(event => event.type === 'pointerdown').at(-1)?.targetId !== entry.target) errors.push('astylar: wrong pointer target');
    }
    checks[`${mode}Focus`] = sample.activeButton === entry.expectedFocus;
  }
  if (!entry.astylar.diagnostics || entry.astylar.diagnostics.messages.some(message => message.severity === 'error')) errors.push('astylar: missing/failed diagnostics');
  const resolved = entry.astylar.resolved;
  for (const id of ['first', 'second']) {
    const found = resolved?.elements?.filter(element => element.id === id);
    if (found?.length !== 1) { errors.push(`astylar: missing/duplicate resolved ${id}`); continue; }
    for (const rule of entry.astylar.authored.styles.filter(rule => rule.selector === 'button' || rule.selector === `#${id}`)) {
      for (const [property, value] of Object.entries(rule).filter(([property]) => property !== 'selector')) {
        if (found[0].normal[property] !== value || found[0].effective[property] !== value) errors.push(`astylar: unresolved input ${id}.${property}`);
      }
    }
  }
  checks.logicalFocus = (entry.astylar.diagnostics?.interaction?.focusedElementId ?? null) === entry.expectedFocus;
  checks.semanticMatchesLogical = entry.astylar.activeButton === (entry.astylar.diagnostics?.interaction?.focusedElementId ?? null);
  return { errors, checks };
}

export function validateButtonFocusReport(report, { artifactRoot, root = process.cwd() }) {
  assert.equal(report.schemaVersion, 1);
  assert.deepEqual(report.plan, buttonFocusPlan);
  assert.deepEqual(report.viewport, { width: 640, height: 360 });
  assert.deepEqual(report.surfaceCssSize, { width: 400, height: 160 });
  assert.equal(report.settleDelayMs, 250);
  assert.deepEqual(report.runtimeErrors, []);
  assert.equal(report.results.length, 40);
  const provenanceBytes = readFileSync(path.join(artifactRoot, 'provenance.json'));
  assert.equal(report.provenance.sha256, hash(provenanceBytes));
  const provenance = JSON.parse(provenanceBytes);
  assert.equal(provenance.scriptSha256, hash(readFileSync(path.join(root, 'scripts/audit-button-pointer-focus.mjs'))));
  assert.equal(provenance.bundleSha256, hash(readFileSync(path.join(artifactRoot, 'audit.js'))));
  assert.ok(provenance.bundleInputs.length > 0);
  for (const input of provenance.bundleInputs) assert.equal(hash(readFileSync(path.join(root, input.file))), input.sha256, input.file);
  let index = 0;
  for (const dpr of [1, 2]) for (const repetition of [1, 2]) {
    let previous = null;
    for (const step of buttonFocusPlan) {
      const sample = report.results[index++];
      for (const [key, value] of Object.entries({ ...step, dpr, repetition })) assert.equal(sample[key], value, key);
      const replay = checkButtonFocusSample(sample);
      assert.deepEqual(replay.errors, []);
      assert.deepEqual(sample.errors, replay.errors);
      assert.deepEqual(sample.checks, replay.checks);
      for (const mode of ['reference', 'astylar']) {
        if (previous) assert.deepEqual(sample[mode].nativeEvents.slice(0, previous[mode].nativeEvents.length), previous[mode].nativeEvents);
        const file = `${mode}-dpr${dpr}-repeat${repetition}-${step.state}.png`;
        assert.equal(sample[mode].screenshot.file, file);
        const png = readFileSync(path.join(artifactRoot, file));
        assert.equal(hash(png), sample[mode].screenshot.sha256);
        assert.equal(png.readUInt32BE(16), 640 * dpr);
        assert.equal(png.readUInt32BE(20), 360 * dpr);
      }
      previous = sample;
    }
  }
  return { cases: report.results.length, failures: report.results.filter(sample => Object.values(sample.checks).some(value => !value)).length };
}

async function main() {
  const root = process.cwd();
  const output = path.resolve(process.argv.find(arg => arg.startsWith('--output='))?.slice(9) ??
    'artifacts/material-parity/button-pointer-focus-audit');
  assert.ok(!existsSync(output), 'Use a new output directory; existing evidence is preserved');
  const entry = 'examples/material-showcase/audit/button-pointer-focus.mjs';
  const requireConsumer = createRequire(path.join(root, 'examples/material-showcase/package.json'));
  const { build } = requireConsumer('esbuild');
  const built = await build({ absWorkingDir: root, entryPoints: [entry], bundle: true, write: false,
    format: 'esm', platform: 'browser', target: 'es2022', metafile: true });
  const bundle = built.outputFiles[0].contents;
  const html = Buffer.from('<!doctype html><html><head><meta charset="utf-8"><title>Button focus audit</title></head><body><script type="module" src="/audit.js"></script></body></html>');
  mkdirSync(output, { recursive: true });
  writeFileSync(path.join(output, 'audit.js'), bundle);
  const provenance = { sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    scriptSha256: hash(readFileSync('scripts/audit-button-pointer-focus.mjs')), htmlSha256: hash(html), bundleSha256: hash(bundle),
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
    for (const dpr of [1, 2]) for (const repetition of [1, 2]) {
      const sequence = buttonFocusPlan.map(step => ({ ...step, dpr, repetition }));
      for (const mode of ['reference', 'astylar']) {
        const page = await browser.newPage({ viewport: { width: 640, height: 360 }, deviceScaleFactor: dpr });
        const resources = [];
        page.on('pageerror', error => runtimeErrors.push({ mode, dpr, repetition, message: String(error) }));
        page.on('response', response => {
          if (response.request().resourceType() === 'script') resources.push(response.body().then(body => ({ url: response.url(), sha256: hash(body) })));
        });
        try {
          await page.goto(`http://127.0.0.1:${server.address().port}/?mode=${mode}`);
          await page.waitForFunction(() => !!window.buttonFocusAudit);
          for (const sample of sequence) {
            if (sample.action === 'tab') await page.keyboard.press('Tab');
            else if (sample.action === 'space-down') await page.keyboard.down('Space');
            else if (sample.action === 'space-up') await page.keyboard.up('Space');
            // Both sides use the same authored CSS-space point. The captured
            // native/public target must independently prove the intended hit.
            else if (sample.action === 'move') await page.mouse.move(sample.target === 'first' ? 80 : 220, 40);
            else if (sample.action === 'down') await page.mouse.down();
            else if (sample.action === 'up') await page.mouse.up();
            await page.evaluate(() => window.buttonFocusAudit.settle());
            await page.waitForTimeout(250);
            sample[mode] = await page.evaluate(() => window.buttonFocusAudit.snapshot());
            const file = `${mode}-dpr${dpr}-repeat${repetition}-${sample.state}.png`;
            const png = await page.screenshot({ path: path.join(output, file) });
            sample[mode].screenshot = { file, sha256: hash(png) };
          }
          const served = await Promise.all(resources);
          assert.ok(served.some(resource => resource.sha256 === provenance.bundleSha256), 'served bundle differs from inspected build');
          await page.evaluate(() => window.buttonFocusAudit.dispose());
        } finally { await page.close(); }
      }
      for (const sample of sequence) Object.assign(sample, checkButtonFocusSample(sample));
      results.push(...sequence);
    }
    const report = { schemaVersion: 1, browser: browser.version(), viewport: { width: 640, height: 360 },
      surfaceCssSize: { width: 400, height: 160 }, settleDelayMs: 250, plan: buttonFocusPlan,
      provenance: { file: 'provenance.json', sha256: hash(readFileSync(path.join(output, 'provenance.json'))) },
      packages: provenance.packages, runtimeErrors, results };
    writeFileSync(path.join(output, 'latest-report.json'), JSON.stringify(report, null, 2) + '\n');
    const errors = results.flatMap(sample => sample.errors);
    const failures = results.filter(sample => Object.values(sample.checks).some(value => !value));
    console.log(JSON.stringify({ output, cases: results.length, runtimeErrors, evidenceErrors: errors,
      failures: failures.map(({ state, dpr, repetition, checks, astylar }) => ({ state, dpr, repetition, checks,
        documentFocus: astylar.active, logicalFocus: astylar.diagnostics.interaction.focusedElementId })) }, null, 2));
    process.exitCode = runtimeErrors.length || errors.length ? 2 : failures.length ? 1 : 0;
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error); process.exitCode = 2; });
}
