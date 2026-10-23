import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import { cropRgba } from '../tests/parity/sharpness-metrics.mjs';
import { evaluateFocusedRaster } from '../tests/material-parity/focused-raster-metrics.mjs';
import { materialCaseKey, openMaterialCheckpoint, fingerprintModuleGraph } from '../tests/material-parity/run-checkpoint.mjs';

// Existing measured regions only. Do not infer the twelve static label boxes
// from styles,or describe a union rectangle as isolated glyph/ring paint.
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const pinned = (file, sha256) => {
  const bytes = readFileSync(file); assert.equal(hash(bytes), sha256, file); return bytes;
};
const receipt = file => ({ file, sha256: hash(readFileSync(file)) });
const base = 'artifacts/material-parity/current-full-20261005';
const reportFile = `${base}/latest-report.json`;
const report = JSON.parse(pinned(reportFile, 'ab42dbec6280e0e27784ec4bbc6697d4ea451bfab307bccb720c0dec89a83b62'));
const manifestFile = `${base}/checkpoint/manifest.json`;
const manifest = JSON.parse(pinned(manifestFile, '7ae2cba1739353661a0c84e28ef70819157311cc824fd00ae94ced29fadeb352'));
assert.deepEqual(manifest.provenance, report.captureProvenance);
const checkpoint = openMaterialCheckpoint({ directory: base, provenance: manifest.provenance, resume: true });
const caseId = (kind,row) => `${kind}:radio@${row.profile}/${row.viewport.id}${kind === 'interaction' ? '/' + row.state : ''}`;
const crop = (image,bounds) => {
  assert.ok(bounds.left >= 0 && bounds.top >= 0 && bounds.right <= image.width && bounds.bottom <= image.height);
  assert.ok(bounds.right > bounds.left && bounds.bottom > bounds.top);
  return cropRgba(image,bounds);
};
const font = style => Object.fromEntries(['fontFamily','fontSize','lineHeight','letterSpacing','color','opacity','textAlign','verticalAlign']
  .filter(key => Object.hasOwn(style ?? {},key)).map(key => [key,style[key]]));
const records = [], unavailable = []; let controls = 0;
for (const [kind,rows] of [['static',report.results],['interaction',report.interactions]]) {
  for (const row of rows.filter(row => row.family === 'radio')) {
    const id = caseId(kind,row), key = materialCaseKey(kind,row);
    assert.deepEqual(checkpoint.load(key),row);
    const checkpointFile = `${base}/checkpoint/${hash(key)}.json`;
    const checkpointBytes = readFileSync(checkpointFile), saved = JSON.parse(checkpointBytes);
    const geometry = ['radio-solo-label','radio-team-label'].map(id => row.geometry.elements.find(g => g.id === id && !g.missing));
    if (geometry.some(g => !g)) {
      assert.equal(kind,'static');
      unavailable.push({ case:id,missing:geometry.map((g,i) => g ? null : ['radio-solo-label','radio-team-label'][i]).filter(Boolean),
        reason:'No original measured label rectangles;do not substitute container bounds or derive positions from styles.' });
      continue;
    }
    const images = {}, imageReceipts = {}, trees = {};
    for (const side of ['reference','astylar']) {
      trees[side] = JSON.parse(pinned(row.inputTrees[side].file,row.inputTrees[side].sha256));
      const file = path.join(path.dirname(row.inputTrees[side].file),`${side}.png`), bytes = readFileSync(file);
      const original = saved.files.filter(r => path.resolve(base,r.file) === path.resolve(file));
      assert.equal(original.length,1); assert.equal(hash(bytes),original[0].sha256);
      images[side] = PNG.sync.read(bytes); imageReceipts[side] = { file,sha256:original[0].sha256 };
    }
    assert.equal(images.reference.width,images.astylar.width); assert.equal(images.reference.height,images.astylar.height);
    const regions = geometry.map((g,i) => {
      const natives = trees.reference.nodes.filter(n => n.attributes?.id === g.id);
      const candidates = trees.astylar.nodes.filter(n => n.authored?.id === g.id);
      assert.equal(natives.length,1); assert.equal(candidates.length,1);
      const native = natives[0],candidate = candidates[0];
      assert.equal(native.attributes.id,g.id); assert.equal(candidate.authored.id,g.id);
      assert.equal(native.ownText,candidate.authored.textContent);
      const a = g.expected,b = g.actual,dpr = row.viewport.deviceScaleFactor;
      const bounds = { left:Math.floor(Math.min(a.left,b.left)*dpr),top:Math.floor(Math.min(a.top,b.top)*dpr),
        right:Math.ceil(Math.max(a.right,b.right)*dpr),bottom:Math.ceil(Math.max(a.bottom,b.bottom)*dpr) };
      const ca = crop(images.reference,bounds),cb = crop(images.astylar,bounds);
      const zero = evaluateFocusedRaster(ca,cb,{ maximumPhaseOffset:0 });
      const standard = evaluateFocusedRaster(ca,cb);
      if (!controls) {
        assert.equal(evaluateFocusedRaster(ca,ca,{ maximumPhaseOffset:0 }).similarity,1);
        assert.notEqual(evaluateFocusedRaster(ca,{ ...cb,data:new Uint8Array(cb.data.length).fill(255) },{ maximumPhaseOffset:0 }).similarity,zero.similarity);
        assert.throws(() => crop(images.reference,{ ...bounds,left:-1 })); controls = 3;
      }
      return { id:g.id,text:native.ownText,geometry:g,commonPhysicalBounds:bounds,
        referenceKey:native.key,candidateKey:candidate.key,
        referenceFont:font(trees.reference.styles[native.style]),candidateRetainedFont:font(candidate.retainedText?.style),
        zeroPhaseMetric:zero,standardPhaseMetric:standard,
        boundary:'Same absolute union rectangle on both original PNGs;neighbouring control pixels can contribute. No independent label alignment,isolated glyph sharpness or ring/ripple acceptance.' };
    });
    records.push({ case:id,checkpoint:{ file:checkpointFile,sha256:hash(checkpointBytes) },pairedTrees:row.inputTrees,
      imageReceipts,regions,currentRenderingAccepted:false });
  }
}
assert.equal(records.length,56); assert.equal(unavailable.length,12); assert.equal(controls,3);
const regions = records.flatMap(r => r.regions); assert.equal(regions.length,112);
console.log(JSON.stringify({ scope:'Retained Radio measured-label-union regions only. Unequal placement/font/state inputs and original failures preserve;not equal-input renderer causality,current rendering,isolated glyph/ring/ripple paint or case closure.',
  evidence:{ report:receipt(reportFile),manifest:receipt(manifestFile),
    producer:receipt('scripts/audit-material-retained-radio-label-paint.mjs'),
    metricGraph:fingerprintModuleGraph(process.cwd(),'tests/material-parity/focused-raster-metrics.mjs'),
    cropGraph:fingerprintModuleGraph(process.cwd(),'tests/parity/sharpness-metrics.mjs') },
  cases:records.length,regions:regions.length,unavailableCases:unavailable.length,controls,
  zeroPhaseBelowExistingDefault:regions.filter(r => !r.zeroPhaseMetric.matches).length,
  standardPhaseBelowExistingDefault:regions.filter(r => !r.standardPhaseMetric.matches).length,
  minimumStandardSimilarity:Math.min(...regions.map(r => r.standardPhaseMetric.similarity)),
  maximumStandardSimilarity:Math.max(...regions.map(r => r.standardPhaseMetric.similarity)),
  records,unavailable,currentRenderingAccepted:false }));
