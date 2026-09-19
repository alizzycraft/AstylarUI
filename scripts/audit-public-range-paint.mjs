import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { PNG } from 'pngjs';

export const paintRoot = 'artifacts/material-parity/public-range-paint-inspection-v1';
const output = 'docs/material-public-range-paint-audit.json';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

export function countNonwhitePixels(png, box, dpr) {
  assert.ok([1, 2].includes(dpr));
  const { x, y, width, height } = box;
  assert.ok([x, y, width, height].every(Number.isFinite));
  assert.ok(x >= 0 && y >= 0 && width > 0 && height > 0);
  assert.ok((x + width) * dpr <= png.width && (y + height) * dpr <= png.height);
  let nonwhite = 0, pixels = 0;
  for (let py = y * dpr; py < (y + height) * dpr; py++)
    for (let px = x * dpr; px < (x + width) * dpr; px++) {
      assert.ok(Number.isInteger(px) && Number.isInteger(py));
      const i = (py * png.width + px) * 4;
      assert.equal(png.data[i + 3], 255);
      pixels++;
      if (png.data[i] !== 255 || png.data[i + 1] !== 255 || png.data[i + 2] !== 255) nonwhite++;
    }
  return { pixels, nonwhite };
}

export function inspectRangePaint(report, readArtifact) {
  assert.equal(report.kind, 'public-range-passive-paint-inspection');
  assert.equal(report.schemaVersion, 1);
  assert.deepEqual(report.runtimeErrors, []);
  assert.deepEqual(report.viewport, { width: 640, height: 360 });
  assert.equal(report.results.length, 8);
  const observations = [];
  let index = 0;
  for (const dpr of [1, 2]) for (const translated of [false, true]) {
    const pair = report.results.slice(index, index += 2);
    const rasters = [];
    for (const [side, entry] of pair.entries()) {
      assert.equal(entry.dpr, dpr); assert.equal(entry.translated, translated);
      assert.equal(entry.mode, side ? 'astylar' : 'reference');
      assert.equal(entry.disposed, true);
      for (const key of ['site', 'controls', 'nativeEvents', 'publicEvents', 'updates', 'surfaceBox', 'active'])
        assert.deepEqual(entry.before[key], entry.after[key], `passive ${key}`);
      assert.deepEqual(entry.before.nativeEvents, []); assert.deepEqual(entry.before.publicEvents, []);
      assert.deepEqual(entry.before.updates, []);
      assert.deepEqual(entry.before.site, pair[0].before.site);
      assert.deepEqual(entry.before.controls.map(({ nativeBox, ...c }) => c),
        pair[0].before.controls.map(({ nativeBox, ...c }) => c));
      assert.deepEqual(entry.before.surfaceBox, { x: translated ? 64 : 0, y: translated ? 40 : 0,
        width: 440, height: 140 });
      const bytes = readArtifact(entry.screenshot.file);
      assert.equal(hash(bytes), entry.screenshot.sha256);
      assert.equal(hash(readArtifact(entry.afterScreenshot.file)), entry.afterScreenshot.sha256);
      assert.equal(entry.afterScreenshot.sha256, entry.screenshot.sha256);
      const png = PNG.sync.read(bytes);
      assert.equal(png.width, 640 * dpr); assert.equal(png.height, 360 * dpr);
      rasters.push(png);
    }
    assert.equal(pair[0].paint, null);
    const candidate = pair[1], scene = candidate.paint;
    assert.equal(scene.camera.mode, 1); assert.ok(scene.camera.position.z > 0);
    assert.deepEqual([scene.camera.orthoLeft, scene.camera.orthoRight, scene.camera.orthoTop, scene.camera.orthoBottom],
      [-220, 220, 70, -70]);
    assert.equal(scene.meshes.length, 9);
    const mesh = name => { const matches = scene.meshes.filter(m => m.name === name); assert.equal(matches.length, 1); return matches[0]; };
    const root = mesh('root-body'); assert.equal(root.absolutePosition.z, 0);
    for (const m of scene.meshes) {
      assert.equal(m.active, true); assert.equal(m.isVisible, true); assert.equal(m.enabled, true);
      assert.equal(m.visibility, 1); assert.ok(scene.activeNames.includes(m.name));
      assert.equal(m.renderingGroupId, 0); assert.equal(m.material.alpha, 1);
      assert.equal(m.material.disableDepthWrite, false); assert.equal(m.material.disableColorWrite, false);
    }
    for (const [i, id] of ['first', 'second'].entries()) {
      const owner = mesh(id), track = mesh(`${id}-range-track`), active = mesh(`${id}-range-active`), thumb = mesh(`${id}-range-thumb`);
      assert.equal(owner.material.name, `${id}-material`);
      assert.equal(owner.material.emissiveColor, '#FFFFFF');
      assert.equal(owner.parent, 'root-body'); assert.ok(owner.absolutePosition.z > root.absolutePosition.z);
      for (const m of [track, active, thumb]) assert.equal(m.parent, id);
      assert.equal(track.position.z, 0); assert.equal(track.absolutePosition.z, owner.absolutePosition.z);
      assert.equal(active.position.z, -.02); assert.equal(thumb.position.z, -.04);
      for (const m of [active, thumb]) {
        assert.ok(m.absolutePosition.z < root.absolutePosition.z);
        for (const axis of ['x', 'y']) {
          assert.ok(m.bounds.minimumWorld[axis] >= owner.bounds.minimumWorld[axis]);
          assert.ok(m.bounds.maximumWorld[axis] <= owner.bounds.maximumWorld[axis]);
        }
      }
      assert.deepEqual(candidate.before.diagnostics.messages, []);
      const style = candidate.before.resolved.elements.find(e => e.id === id).effective;
      assert.equal(style.background, '#ffffff');
      const box = pair[0].before.controls[i].nativeBox;
      assert.deepEqual(box, { x: (translated ? 64 : 0) + (i ? 240 : 20), y: (translated ? 40 : 0) + 40, width: 160, height: 40 });
      const nativePixels = countNonwhitePixels(rasters[0], box, dpr), candidatePixels = countNonwhitePixels(rasters[1], box, dpr);
      assert.ok(nativePixels.nonwhite > 100 * dpr * dpr);
      assert.equal(candidatePixels.nonwhite, 0);
      observations.push({ dpr, translated, id, box, nativePixels, candidatePixels,
        rootZ: root.absolutePosition.z, ownerZ: owner.absolutePosition.z,
        trackZ: track.absolutePosition.z, activeZ: active.absolutePosition.z, thumbZ: thumb.absolutePosition.z,
        material: owner.material, screenshot: candidate.screenshot });
    }
  }
  return observations;
}

export function buildRangePaintAudit() {
  const bytes = readFileSync(`${paintRoot}/latest-report.json`), report = JSON.parse(bytes);
  const artifact = file => { assert.equal(path.basename(file), file); return readFileSync(`${paintRoot}/${file}`); };
  const provenanceBytes = artifact(report.provenance.file);
  assert.equal(hash(provenanceBytes), report.provenance.sha256);
  const p = JSON.parse(provenanceBytes);
  assert.equal(p.script.file, 'scripts/capture-public-range-paint.mjs');
  assert.equal(hash(readFileSync(p.script.file)), p.script.sha256);
  assert.equal(new Set(p.bundleInputs.map(x => x.file)).size, p.bundleInputs.length);
  for (const input of p.bundleInputs) assert.equal(hash(readFileSync(input.file)), input.sha256, input.file);
  const bundle = artifact('audit.js');
  assert.equal(hash(bundle), p.bundleSha256);
  const lines = bundle.toString('utf8').split('\n');
  const servedInstructions = [
    'hitMaterial.disableDepthWrite = true;',
    'this.materialService.applyElementMaterial(dom, render, mesh, element2, false, style);',
    'const material = render.actions.mesh.createMaterial(`${element2.id || mesh.name}-material`, backgroundData.color, finalOpacity);',
    'const center = render.actions.camera.projectCssLocalPoint({ x: -width / 2 + activeWidth / 2, y: 0 }, -0.02);',
    'const center = render.actions.camera.projectCssLocalPoint({ x: -width / 2 + width * ratio, y: 0 }, -0.04);',
    'this.camera = new FreeCamera("camera", new Vector3(0, 0, cameraDistance), scene);',
    'this.camera.setTarget(Vector3.Zero());',
  ].map((instruction, item) => {
    const owner = ['RangeManager', 'ElementCreationService', 'ElementMaterialService', 'RangeManager',
      'RangeManager', 'BabylonCameraService', 'BabylonCameraService'][item];
    const start = lines.findIndex(line => line.startsWith(`var ${owner} = class `));
    assert.ok(start >= 0, owner);
    let end = lines.findIndex((line, i) => i > start && line.startsWith('var '));
    if (end < 0) end = lines.length;
    const matches = lines.flatMap((line, index) => index > start && index < end && line.trim() === instruction ? [index + 1] : []);
    assert.equal(matches.length, 1, instruction);
    return { owner, line: matches[0], instruction };
  });
  for (const entry of report.results) for (const [type, digest] of [['script', p.bundleSha256], ['document', p.htmlSha256]])
    assert.ok(entry.served.some(a => a.type === type && a.sha256 === digest));
  const prior = JSON.parse(readFileSync('artifacts/material-parity/public-range-drag-audit-v2/provenance.json'));
  const currentInputs = new Map(p.bundleInputs.map(x => [x.file, x.sha256]));
  // The companion adds observation only; every original consumer/package input is unchanged.
  for (const input of prior.bundleInputs) assert.equal(currentInputs.get(input.file), input.sha256, input.file);
  const sources = ['src/app/services/dom/input/range.manager.ts', 'src/app/services/dom/elements/element-creation.service.ts',
    'src/app/services/dom/elements/element-material.service.ts', 'src/app/config/browser-defaults.ts',
    'src/app/services/babylon-camera.service.ts', 'src/app/services/css-babylon-projection.ts']
    .map(file => ({ file, sha256: hash(readFileSync(file)) }));
  return { schemaVersion: 1, kind: 'public-range-paint-audit', evidence: { file: `${paintRoot}/latest-report.json`, sha256: hash(bytes) },
    browser: report.browser, sourceCommit: p.sourceCommit, provenance: report.provenance, sources, servedInstructions,
    cases: 8, screenshots: 16, observations: inspectRangePaint(report, artifact),
    classification: 'confirmed-core-paint-order-defect-in-public-reduction',
    ownerMaterialReplacementObserved: true, activeAndThumbBehindOpaqueAncestors: true,
    fullTrackOcclusionMechanismProven: false, materialSwappedThumbCauseProven: false,
    rendererChanged: false, renderingEquivalent: false,
    limitations: ['Passive scene inspection is diagnostic, not part of application authoring.',
      'Coplanar track disappearance needs draw-order/depth testing evidence; mesh presence is not visibility.',
      'No private mutation or proposed paint correction was tested; Material slider causality remains separate.'] };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  assert.ok(process.argv.length === 2 || (process.argv.length === 3 && process.argv[2] === '--check'));
  const result = buildRangePaintAudit(), serialized = JSON.stringify(result, null, 2) + '\n';
  if (process.argv[2] === '--check') assert.equal(readFileSync(output, 'utf8'), serialized);
  else writeFileSync(output, serialized);
  console.log(JSON.stringify({ cases: result.cases, screenshots: result.screenshots, controls: result.observations.length,
    sha256: hash(serialized), renderingEquivalent: false }));
}
