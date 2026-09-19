import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import { paintRoot, inspectRangePaint, countNonwhitePixels } from '../../scripts/audit-public-range-paint.mjs';

const saved = 'docs/material-public-range-paint-audit.json';
test('range paint proof replays served inputs, all paired rasters and passive observations without writing', () => {
  const before = readFileSync(saved);
  const guard = `import fs from 'node:fs';import{syncBuiltinESMExports}from'node:module';
    fs.writeFileSync=()=>{throw Error('CHECK_MODE_ATTEMPTED_WRITE')};syncBuiltinESMExports();`;
  const result = JSON.parse(execFileSync(process.execPath, ['--import',
    'data:text/javascript;base64,' + Buffer.from(guard).toString('base64'),
    'scripts/audit-public-range-paint.mjs', '--check'], { encoding: 'utf8' }));
  assert.equal(result.cases, 8); assert.equal(result.screenshots, 16); assert.equal(result.controls, 8);
  assert.equal(result.renderingEquivalent, false); assert.deepEqual(readFileSync(saved), before);
});

test('range paint rejects missing or altered scene, state, projection, screenshot and depth evidence', () => {
  const original = JSON.parse(readFileSync(`${paintRoot}/latest-report.json`));
  const read = file => readFileSync(`${paintRoot}/${file}`);
  const changes = [
    r => r.results.pop(),
    r => { r.results[1].paint.meshes.find(m => m.name === 'first-range-thumb').absolutePosition.z = .04; },
    r => { r.results[1].paint.meshes.find(m => m.name === 'first-range-active').position.z = .02; },
    r => { r.results[1].paint.meshes.find(m => m.name === 'first').material.disableDepthWrite = true; },
    r => { r.results[1].paint.meshes.find(m => m.name === 'first').material.alpha = .001; },
    r => { r.results[1].paint.meshes.find(m => m.name === 'first-range-thumb').active = false; },
    r => { r.results[1].paint.camera.position.z = -100; },
    r => { r.results[1].paint.camera.orthoRight = 440; },
    r => { r.results[1].after.site.styles[0].top = '50px'; },
    r => { r.results[1].after.controls[0].value = '50'; },
    r => { r.results[1].afterScreenshot.sha256 = '0'.repeat(64); },
    r => { r.results[1].screenshot = r.results[0].screenshot; r.results[1].afterScreenshot = r.results[0].afterScreenshot; },
    r => { r.results[0].before.controls[0].nativeBox.x++; r.results[0].after.controls[0].nativeBox.x++; },
    r => { r.results[1].disposed = false; },
    r => r.runtimeErrors.push('capture error'),
  ];
  for (const [i, mutate] of changes.entries()) {
    const changed = structuredClone(original); mutate(changed);
    assert.throws(() => inspectRangePaint(changed, read), `mutation ${i}`);
  }
});

test('local paint metric detects a single changed pixel at both DPRs and rejects invalid crops', () => {
  for (const dpr of [1, 2]) {
    const png = new PNG({ width: 20 * dpr, height: 10 * dpr }); png.data.fill(255);
    const box = { x: 1, y: 1, width: 10, height: 5 };
    assert.deepEqual(countNonwhitePixels(png, box, dpr), { pixels: 50 * dpr * dpr, nonwhite: 0 });
    png.data[((2 * dpr) * png.width + 2 * dpr) * 4] = 254;
    assert.equal(countNonwhitePixels(png, box, dpr).nonwhite, 1);
    assert.throws(() => countNonwhitePixels(png, { ...box, x: -1 }, dpr));
    assert.throws(() => countNonwhitePixels(png, { ...box, width: 30 }, dpr));
  }
});

test('paint findings preserve causal limits and do not claim a renderer fix or Material slider diagnosis', () => {
  const report = JSON.parse(readFileSync(saved));
  assert.equal(report.ownerMaterialReplacementObserved, true);
  assert.equal(report.activeAndThumbBehindOpaqueAncestors, true);
  for (const field of ['fullTrackOcclusionMechanismProven', 'materialSwappedThumbCauseProven', 'rendererChanged', 'renderingEquivalent'])
    assert.equal(report[field], false);
  assert.equal(report.servedInstructions.length, 7);
  assert.equal(report.sources.length, 6);
  assert.equal(report.observations.length, 8);
});
