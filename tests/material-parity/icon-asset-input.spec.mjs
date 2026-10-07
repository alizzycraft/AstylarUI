import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import { PNG } from 'pngjs';
import { collectFullTreeInventory } from './input-equivalence-audit.mjs';
import { modalInventoryTrees } from './modal-position-inspection.mjs';
import { sourceAuditDefinitions } from './input-equivalence-policy.mjs';

const one = values => { assert.equal(values.length, 1); return values[0]; };

test('retained original SVG upload failure binds public runtime and matched alpha controls', () => {
  const digest = bytes => createHash('sha256').update(bytes).digest('hex');
  const load = (name, expected) => {
    const raw = readFileSync(`artifacts/material-parity/${name}.log`);
    assert.equal(digest(raw), expected);
    return raw.toString().split(/\r?\n/).filter(line => line.startsWith('{')).map(JSON.parse);
  };
  const runtime = load('icon-svg-runtime-upload-20261007',
    '9cba551e122dc41ca7cb01fe80d201ba18799e26f8c628d7f1b22cd34ffd9f53');
  const controls = load('icon-svg-alpha-controls-20261007',
    '764a2dfba3828497e65b13bae2fad600fb091aba12f8e40f910ef74c0c0d1231');
  const [upload] = load('icon-svg-native-upload-boundary-20261007',
    'd08a6efff4c16dcd148ba1b4f5430bcfdb2eccbda8da5fcfe62c95648edb3aac');
  const [owners] = load('icon-svg-owner-binding-20261007',
    '3fad20ad2f518a13036ebd10a3d6197ca9bd4faa53235039ec3d4121e9b17ba2');
  for (const collection of [runtime, controls]) {
    assert.equal(collection[0].receipts.length, 2515);
    for (const receipt of collection[0].receipts)
      assert.equal(digest(readFileSync(receipt.file)), receipt.sha256);
  }
  assert.equal(digest(readFileSync(upload.source.file)), upload.source.sha256);
  for (const binding of owners.bindings) {
    assert.equal(digest(readFileSync(binding.sourceFile)), binding.sourceSha256);
    assert.equal(digest(readFileSync(binding.installedFile)), binding.installedSha256);
    const compiled = ts.transpileModule(readFileSync(binding.sourceFile, 'utf8'),
      { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
    const extract = text => {
      const start = text.indexOf(binding.start), end = text.indexOf(binding.end, start);
      assert.ok(start >= 0 && end > start);
      return text.slice(start, end).replace(/\s+/g, ' ').trim();
    };
    assert.equal(extract(compiled), extract(readFileSync(binding.installedFile, 'utf8')));
    assert.equal(digest(extract(compiled)), binding.normalizedMethodSha256);
  }
  const verifyRuntime = rows => {
    assert.deepEqual(rows.map(r => r.dpr), [1, 2]);
    for (const row of rows) {
      assert.deepEqual(row.errors, []);
      assert.deepEqual(row.data.diagnostics, []);
      assert.equal(row.disposed, true);
      const call = one(row.data.uploads);
      assert.equal(call.error, 1281);
      assert.deepEqual([call.width, call.height, call.naturalWidth, call.naturalHeight], [150, 150, 150, 150]);
      assert.match(call.stack, /_prepareWebGLTexture/);
      assert.ok(row.data.textures.every(t => t.ready));
      const raw = readFileSync(row.raster.file);
      assert.equal(digest(raw), row.raster.sha256);
      assert.equal(digest(readFileSync(row.raster.matchesOriginal)), row.raster.sha256);
      const image = PNG.sync.read(raw);
      const offset = (21 * row.dpr * image.width + 21 * row.dpr) * 4;
      assert.deepEqual([...image.data.subarray(offset, offset + 4)], [0, 0, 0, 255]);
    }
  };
  verifyRuntime(runtime.slice(1));
  const altered = structuredClone(runtime.slice(1)); altered[0].data.uploads[0].error = 0;
  assert.throws(() => verifyRuntime(altered));
  assert.equal(controls.length, 9);
  for (const row of controls.slice(1)) {
    assert.deepEqual(row.errors, []);
    assert.deepEqual(row.data.errors, []);
    assert.equal(row.disposed, true);
    assert.equal(digest(readFileSync(row.raster.file)), row.raster.sha256);
    for (const sample of row.samples) {
      assert.deepEqual(sample.transparentCorner, [240, 240, 240, 255]);
      assert.deepEqual(sample.heartCenter, [0, 0, 0, 255]);
    }
    for (const texture of row.data.textures) assert.deepEqual(texture.alphaRange, [0, 255]);
  }
  assert.deepEqual(upload.results.map(r => r.kind), ['original', 'dimensioned', 'png', 'original-assigned-size']);
  for (const row of upload.results) {
    assert.equal(row.uploadError, row.kind === 'original' ? 1281 : 0);
    assert.equal(row.complete, row.kind !== 'original');
    assert.equal(row.readError, row.kind === 'original' ? 1286 : 0);
  }
});

function inspect(entry, reference, candidate, assets, svgPath) {
  for (const tree of [reference, candidate]) {
    assert.deepEqual(tree.errors, []);
    assert.equal(tree.ruleEvidenceComplete, true);
  }
  const ref = one(reference.nodes.filter(n => n.attributes?.id === 'icon-primary'));
  const ast = one(candidate.nodes.filter(n => n.authored?.id === 'icon-primary'));
  assert.equal(ref.type, 'mat-icon');
  assert.equal(ast.authored.type, 'img');
  const svg = one(reference.nodes.filter(n => n.parent === ref.key));
  assert.equal(svg.type, 'svg');
  assert.equal(svg.attributes.viewBox, '0 0 24 24');
  assert.equal(svg.attributes.preserveAspectRatio, 'xMidYMid meet');
  const path = one(reference.nodes.filter(n => n.parent === svg.key));
  assert.equal(path.type, 'path');
  assert.equal(path.attributes.d, svgPath);
  assert.equal(path.attributes.fill, 'currentColor');
  const mode = entry.profile === 'dark' ? 'DARK' : 'LIGHT';
  assert.equal(ast.authored.src, assets[mode]);
  const bytes = Buffer.from(ast.authored.src.split(',')[1], 'base64');
  assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(bytes.subarray(12, 16).toString(), 'IHDR');
  assert.equal(bytes.readUInt32BE(16), 24);
  assert.equal(bytes.readUInt32BE(20), 24);
  const input = one(entry.styleInputs.filter(i => i.id === 'icon-primary'));
  assert.equal(reference.styles[ref.style].objectFit, 'fill');
  for (const [field, stage] of [['astylar', 'resolvedStyle'],
    ['astylarNormalResolvedStyle', 'normalResolvedStyle'],
    ['astylarInteractionResolvedStyle', 'interactionResolvedStyle']]) {
    assert.deepEqual(input[field], ast[stage]);
    assert.equal(ast[stage].objectFit, 'contain');
    assert.equal(ast[stage].width, '24px');
    assert.equal(ast[stage].height, '24px');
  }
  return { mode, assetInputEquivalent: false, coreDefectProven: false, rasterVerified: false };
}

test('all original icon owners replace currentColor SVG with fixed 24px theme rasters', () => {
  const finding = one(sourceAuditDefinitions.filter(d => d.id === 'fixture-icon-svg-replaced-by-fixed-raster'));
  assert.equal(finding.classification, 'application-plugin-authoring-defect');
  assert.match(finding.focusedProof, /icon-asset-input\.spec\.mjs/);
  const authoredSource = readFileSync(finding.file, 'utf8');
  assert.equal([...authoredSource.matchAll(new RegExp(finding.pattern, 'g'))].length, 1);
  assert.doesNotMatch(authoredSource.replace(
    new RegExp(finding.pattern, 'g'), "src: '/icons/favorite.svg'"), new RegExp(finding.pattern));
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'),
    'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const capture = JSON.parse(bytes);
  const cases = [...capture.results.map(e => ({ ...e, kind: 'static' })),
    ...capture.interactions.map(e => ({ ...e, kind: 'interaction' }))].filter(e => e.family === 'icon');
  assert.equal(cases.length, 20);
  const inventory = collectFullTreeInventory(cases);
  assert.deepEqual(inventory.errors, []);
  const source = readFileSync('examples/material-showcase/src/app/material-assets.ts', 'utf8');
  const assets = Object.fromEntries([...source.matchAll(
    /export const MATERIAL_FAVORITE_ICON_(LIGHT|DARK)\s*=\s*'(data:image\/png;base64,[^']+)'/g,
  )].map(m => [m[1], m[2]]));
  assert.deepEqual(Object.keys(assets).sort(), ['DARK', 'LIGHT']);
  const svg = readFileSync('examples/material-showcase/public/icons/favorite.svg', 'utf8');
  const svgPath = one([...svg.matchAll(/<path fill="currentColor" d="([^"]+)"/g)])[1];
  const counts = { LIGHT: 0, DARK: 0 };
  for (const entry of cases) {
    const pair = modalInventoryTrees(inventory,
      `${entry.kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`);
    const result = inspect(entry, ...pair, assets, svgPath);
    counts[result.mode]++;
    assert.equal(result.coreDefectProven, false);
    assert.equal(result.rasterVerified, false);
    const changed = structuredClone(pair);
    changed[1].nodes.find(n => n.authored?.id === 'icon-primary').authored.src = '/icons/favorite.svg';
    assert.throws(() => inspect(entry, ...changed, assets, svgPath));
    assert.throws(() => inspect(entry, ...pair, assets, svgPath + 'Z'));
    const resized = structuredClone(pair);
    resized[1].nodes.find(n => n.authored?.id === 'icon-primary').resolvedStyle.width = '25px';
    assert.throws(() => inspect(entry, ...resized, assets, svgPath));
    const wrongDimensions = { ...assets };
    const png = Buffer.from(assets[result.mode].split(',')[1], 'base64');
    png.writeUInt32BE(48, 16);
    wrongDimensions[result.mode] = 'data:image/png;base64,' + png.toString('base64');
    const changedAsset = structuredClone(pair);
    changedAsset[1].nodes.find(n => n.authored?.id === 'icon-primary').authored.src = wrongDimensions[result.mode];
    assert.throws(() => inspect(entry, ...changedAsset, wrongDimensions, svgPath));
  }
  assert.deepEqual(counts, { LIGHT: 15, DARK: 5 });
});
