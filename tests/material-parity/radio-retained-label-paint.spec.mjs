import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { PNG } from 'pngjs';
import { cropRgba } from '../parity/sharpness-metrics.mjs';
import { evaluateFocusedRaster } from './focused-raster-metrics.mjs';
import { materialCaseKey, openMaterialCheckpoint } from './run-checkpoint.mjs';

test('retained Radio label regions preserve exact original cases owners bounds and paint failures', () => {
  const hash = b => createHash('sha256').update(b).digest('hex');
  const pinned = receipt => {
    const bytes = readFileSync(receipt.file); assert.equal(hash(bytes),receipt.sha256,receipt.file); return bytes;
  };
  const recordFile = 'artifacts/material-parity/radio-retained-label-region-paint-exact-population-20261023.log';
  const data = JSON.parse(pinned({ file:recordFile,sha256:'85af4cd3aad32a0c4145145b02668096651aaf8f6f36ca8f5a67f6325370f2f8' }));
  pinned(data.evidence.producer);
  for (const r of [...data.evidence.metricGraph,...data.evidence.cropGraph]) pinned(r);
  const report = JSON.parse(pinned(data.evidence.report)),manifest = JSON.parse(pinned(data.evidence.manifest));
  assert.deepEqual(manifest.provenance,report.captureProvenance);
  const base = path.dirname(data.evidence.report.file);
  const checkpoint = openMaterialCheckpoint({ directory:base,provenance:manifest.provenance,resume:true });
  const key = (kind,r) => `${kind}:radio@${r.profile}/${r.viewport.id}${kind === 'interaction' ? '/' + r.state : ''}`;
  const originals = new Map([...report.results.filter(r => r.family === 'radio').map(r => [key('static',r),{kind:'static',row:r}]),
    ...report.interactions.filter(r => r.family === 'radio').map(r => [key('interaction',r),{kind:'interaction',row:r}])]);
  assert.equal(originals.size,68);
  const imageCache = new Map(),treeCache = new Map();
  const decoded = (receipt,cache,parse) => {
    const bytes = pinned(receipt);
    if (!cache.has(receipt.sha256)) cache.set(receipt.sha256,parse(bytes));
    return cache.get(receipt.sha256);
  };
  const font = s => Object.fromEntries(['fontFamily','fontSize','lineHeight','letterSpacing','color','opacity','textAlign','verticalAlign']
    .filter(k => Object.hasOwn(s ?? {},k)).map(k => [k,s[k]]));
  const verifyRegion = (region,row,trees,images) => {
    const g = row.geometry.elements.find(g => g.id === region.id && !g.missing); assert.ok(g);
    assert.deepEqual(region.geometry,g);
    const native = trees.reference.nodes.filter(n => n.attributes?.id === region.id);
    const candidate = trees.astylar.nodes.filter(n => n.authored?.id === region.id);
    assert.equal(native.length,1); assert.equal(candidate.length,1);
    assert.equal(region.referenceKey,native[0].key); assert.equal(region.candidateKey,candidate[0].key);
    assert.equal(region.text,native[0].ownText); assert.equal(region.text,candidate[0].authored.textContent);
    assert.deepEqual(region.referenceFont,font(trees.reference.styles[native[0].style]));
    assert.deepEqual(region.candidateRetainedFont,font(candidate[0].retainedText?.style));
    const a = g.expected,b = g.actual,dpr = row.viewport.deviceScaleFactor;
    const bounds = {left:Math.floor(Math.min(a.left,b.left)*dpr),top:Math.floor(Math.min(a.top,b.top)*dpr),
      right:Math.ceil(Math.max(a.right,b.right)*dpr),bottom:Math.ceil(Math.max(a.bottom,b.bottom)*dpr)};
    assert.deepEqual(region.commonPhysicalBounds,bounds);
    for (const image of Object.values(images))
      assert.ok(bounds.left >= 0 && bounds.top >= 0 && bounds.right <= image.width && bounds.bottom <= image.height);
    const ca = cropRgba(images.reference,bounds),cb = cropRgba(images.astylar,bounds);
    assert.equal(JSON.stringify(evaluateFocusedRaster(ca,cb,{maximumPhaseOffset:0})),JSON.stringify(region.zeroPhaseMetric));
    assert.equal(JSON.stringify(evaluateFocusedRaster(ca,cb)),JSON.stringify(region.standardPhaseMetric));
  };
  const verifyCase = (r,original) => {
    assert.equal(r.case,key(original.kind,original.row));
    assert.equal(original.kind,'interaction'); assert.equal(r.currentRenderingAccepted,false);
    const checkpointKey = materialCaseKey(original.kind,original.row);
    assert.equal(path.basename(r.checkpoint.file),hash(checkpointKey)+'.json');
    const saved = JSON.parse(pinned(r.checkpoint));
    assert.deepEqual(saved.result,original.row); assert.deepEqual(checkpoint.load(checkpointKey),original.row);
    assert.deepEqual(r.pairedTrees,original.row.inputTrees);
    return saved;
  };
  let regions = 0,zeroFailures = 0,standardFailures = 0,sample;
  const seen = new Set();
  for (const r of data.records) {
    assert.ok(!seen.has(r.case)); seen.add(r.case);
    const original = originals.get(r.case); assert.ok(original);
    const saved = verifyCase(r,original);
    const trees = {},images = {};
    for (const side of ['reference','astylar']) {
      trees[side] = decoded(r.pairedTrees[side],treeCache,JSON.parse);
      const savedPng = saved.files.filter(f => path.resolve(base,f.file) === path.resolve(r.imageReceipts[side].file));
      assert.equal(savedPng.length,1); assert.equal(savedPng[0].sha256,r.imageReceipts[side].sha256);
      images[side] = decoded(r.imageReceipts[side],imageCache,PNG.sync.read);
    }
    assert.deepEqual(r.regions.map(r => r.id),['radio-solo-label','radio-team-label']);
    for (const region of r.regions) {
      verifyRegion(region,original.row,trees,images); regions++;
      zeroFailures += Number(!region.zeroPhaseMetric.matches); standardFailures += Number(!region.standardPhaseMetric.matches);
      sample ??= {region,row:original.row,trees,images};
    }
  }
  for (const missing of data.unavailable) {
    assert.ok(!seen.has(missing.case)); seen.add(missing.case);
    const original = originals.get(missing.case); assert.ok(original); assert.equal(original.kind,'static');
    assert.deepEqual(missing.missing,['radio-solo-label','radio-team-label']);
    for (const id of missing.missing) assert.ok(!original.row.geometry.elements.some(g => g.id === id && !g.missing));
  }
  assert.deepEqual([...seen].sort(),[...originals.keys()].sort());
  assert.deepEqual([data.records.length,data.unavailable.length,regions,zeroFailures,standardFailures],[56,12,112,112,106]);
  assert.equal(data.currentRenderingAccepted,false);
  const mutations = [r => r.id = 'radio-primary',r => r.text = 'Wrong',r => r.referenceKey = 'wrong-owner',
    r => r.candidateKey = 'wrong-owner',r => r.geometry.actual.left += 1,r => r.commonPhysicalBounds.left += 1,
    r => r.commonPhysicalBounds.top += 1,r => r.referenceFont.fontSize = '99px',
    r => r.candidateRetainedFont.fontSize = '99px',r => r.zeroPhaseMetric.matches = !r.zeroPhaseMetric.matches,
    r => r.standardPhaseMetric.similarity += .01];
  for (const mutate of mutations) {
    const region = structuredClone(sample.region); mutate(region);
    assert.throws(() => verifyRegion(region,sample.row,sample.trees,sample.images));
  }
  const wrongCase = [...originals.values()].find(o => o.kind === 'interaction' && o.row.profile !== sample.row.profile);
  assert.throws(() => verifyCase(data.records[0],wrongCase));
  assert.throws(() => verifyCase({...data.records[0],currentRenderingAccepted:true},originals.get(data.records[0].case)));
  assert.throws(() => pinned({...data.records[0].imageReceipts.reference,sha256:'0'.repeat(64)}));
  console.log(JSON.stringify({cases:56,regions,staticMissingBounds:12,zeroFailures,standardFailures,
    negativeControls:mutations.length+3,canonicalPublication:false,currentRenderingAccepted:false,
    boundary:'Original full-run measured union regions only;not ancestry-map substitution,isolated glyph/ring/ripple paint,renderer causality or case closure.'}));
});
