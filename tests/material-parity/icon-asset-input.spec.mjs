import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { collectFullTreeInventory } from './input-equivalence-audit.mjs';
import { modalInventoryTrees } from './modal-position-inspection.mjs';
import { sourceAuditDefinitions } from './input-equivalence-policy.mjs';

const one = values => { assert.equal(values.length, 1); return values[0]; };

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
