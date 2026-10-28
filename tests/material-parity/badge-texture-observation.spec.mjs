import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { PNG } from 'pngjs';
import { chromium } from 'playwright-core';
import { materialBrowserLaunchOptions } from './run-checkpoint.mjs';

const hash = b => createHash('sha256').update(b).digest('hex');
test('retained Badge CPU texture and projected plane explain visible prefix, not native glyph parity', t => {
  const file = 'artifacts/material-parity/badge-texture-observation-20261028/latest-report.json';
  const bytes = readFileSync(file);
  assert.equal(hash(bytes), 'd5c94aec9eb800e86c027be14ee1d0dadf63e4a12697a19c8d9dfa1b7a4576ff');
  const report = JSON.parse(bytes), receipt = report.capture.checkpointManifest;
  const manifestBytes = readFileSync(receipt.file); assert.equal(hash(manifestBytes), receipt.sha256);
  const manifest = JSON.parse(manifestBytes);
  assert.equal(report.currentBrowser, manifest.provenance.browser);
  for (const source of report.capture.sources) assert.equal(hash(readFileSync(source.file)), source.sha256);
  assert.equal(report.results.length, 4);
  const assets = new Map(manifest.provenance.browserFiles.map(f => [f.file, f.sha256]));
  for (const row of report.results) {
    assert.deepEqual(row.runtime.errors, []);
    for (const asset of row.runtime.assets) assert.equal(asset.sha256, assets.get(asset.file));
    const imageBytes = readFileSync(row.screenshot.file); assert.equal(hash(imageBytes), row.screenshot.sha256);
    assert.deepEqual(PNG.sync.read(imageBytes).data, PNG.sync.read(readFileSync(row.originalFile)).data);
  }
  const summaries = [];
  for (const row of report.results.filter(r => r.side === 'astylar')) {
    const o = row.observation, texture = o.texture, {width, height} = texture.size;
    assert.equal(texture.samplingMode, 1); assert.equal(texture.rgba.length, width * height * 4);
    const native = report.results.find(r => r.side === 'reference' && r.dpr === row.dpr);
    assert.ok(native); assert.equal(native.observation.style.fontSize, '14.4px');
    const frames = { candidate: PNG.sync.read(readFileSync(row.screenshot.file)), native: PNG.sync.read(readFileSync(native.screenshot.file)) };
    const left = Math.min(...o.projected.map(p => p.x)), right = Math.max(...o.projected.map(p => p.x));
    const top = Math.min(...o.projected.map(p => p.y)), bottom = Math.max(...o.projected.map(p => p.y));
    const stop = Math.floor(o.measurement.elements['badge-count'].borderBox.left * row.dpr) - 2;
    const stats = {};
    for (const [side, frame] of Object.entries(frames)) {
      const offset = (Math.floor(top) * frame.width + Math.floor(left) - 2) * 4;
      const background = [...frame.data.subarray(offset, offset + 4)];
      assert.deepEqual(background, [240,240,240,255]);
      let pixels=0, overOne=0, maximum=0, wrongRowOverTwo=0;
      for (let y=Math.ceil(top); y<Math.floor(bottom); y++) for (let x=Math.ceil(left); x<stop; x++) {
        const tx=Math.floor((x+.5-left)/(right-left)*width), ty=Math.floor((y+.5-top)/(bottom-top)*height);
        const screen=(y*frame.width+x)*4;
        const error = shift => {
          const index=(Math.min(height-1,ty+shift)*width+tx)*4, alpha=texture.rgba[index+3]/255;
          return Math.max(...[0,1,2].map(c=>Math.abs(Math.round(texture.rgba[index+c]*alpha+background[c]*(1-alpha))-frame.data[screen+c])));
        };
        const delta=error(0); pixels++; overOne+=delta>1; maximum=Math.max(maximum,delta); wrongRowOverTwo+=error(1)>2;
      }
      assert.ok(wrongRowOverTwo>0, 'wrong texel row must not pass');
      stats[side]={pixels,overOne,maximum};
    }
    assert.equal(stats.candidate.overOne,0); assert.equal(stats.candidate.maximum,1);
    assert.deepEqual(stats.native, row.dpr===1 ? {pixels:1122,overOne:412,maximum:82} : {pixels:4760,overOne:1222,maximum:213});
    summaries.push({dpr:row.dpr,...stats});
  }
  assert.equal(summaries.length,2);
  t.diagnostic(JSON.stringify({summaries,boundary:'Empirical CPU nearest-texel/straight-alpha fit for unoccluded plane interior only. Not hardware sample-address proof,complete glyph acceptance,equal authored inputs or original focus replay.'}));
});

test('authenticated retained baseline formula reproduces both Badge CPU textures exactly', async t => {
  const reportBytes = readFileSync('artifacts/material-parity/badge-texture-observation-20261028/latest-report.json');
  assert.equal(hash(reportBytes), 'd5c94aec9eb800e86c027be14ee1d0dadf63e4a12697a19c8d9dfa1b7a4576ff');
  const report = JSON.parse(reportBytes);
  const root = 'artifacts/material-parity/icon-fresh-producer-retained-build-20261016-browser/';
  const chunk = readFileSync(root + 'chunk-3JXWRYJY.js');
  assert.equal(hash(chunk), 'f366533bd9f80b7f85379db5031c0dea8c9c1840c14fb6ec35f57f1b65ad9eab');
  const source = chunk.toString(), signature = 'calculateCssLineBoxAlphabeticBaseline(ctx, style) {';
  assert.equal(source.split(signature).length, 2);
  const start = source.indexOf(signature) + signature.length;
  const end = source.indexOf('\n  }', start); assert.ok(end > start);
  const formula = source.slice(start, end);
  const font = readFileSync(root + 'media/roboto-latin-400-normal.woff2');
  assert.equal(hash(font), '425c0713a8176f92273d378599c7eac57de7fafabd4bd0ed457b70eb8f80d371');
  const browser = await chromium.launch(materialBrowserLaunchOptions());
  try {
    assert.equal(browser.version(), report.currentBrowser);
    const page = await browser.newPage();
    const results = await page.evaluate(async ({ font, formula, rows }) => {
      const face = new FontFace('Roboto', `url(data:font/woff2;base64,${font})`);
      await face.load(); document.fonts.add(face);
      const baselineFor = new Function('ctx', 'style', formula);
      return rows.map(row => {
        const canvas = document.createElement('canvas');
        canvas.width = row.observation.texture.size.width; canvas.height = row.observation.texture.size.height;
        const ctx = canvas.getContext('2d'); ctx.scale(row.dpr, row.dpr);
        ctx.font = 'normal normal 14.4px Roboto, Arial, sans-serif';
        ctx.fillStyle = '#1d1b20'; ctx.textBaseline = 'alphabetic';
        const metrics = ctx.measureText('Mg');
        const baseline = baselineFor(ctx, { fontSize:14.4, lineHeight:18/14.4 });
        const differences = shift => {
          ctx.clearRect(0,0,canvas.width/row.dpr,canvas.height/row.dpr);
          ctx.fillText('Notifications',0,baseline+shift);
          const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;
          return pixels.reduce((count,value,i)=>count+(value!==row.observation.texture.rgba[i]),0);
        };
        return {dpr:row.dpr,ascent:metrics.fontBoundingBoxAscent,descent:metrics.fontBoundingBoxDescent,
          baseline,changedChannels:differences(0),wrongBaselineChanges:differences(1)};
      });
    }, {font:font.toString('base64'),formula,rows:report.results.filter(r=>r.side==='astylar')});
    assert.equal(results.length,2);
    for(const result of results) {
      assert.equal(result.ascent,14); assert.equal(result.descent,4); assert.equal(result.baseline,14);
      assert.equal(result.changedChannels,0); assert.ok(result.wrongBaselineChanges>0);
    }
    t.diagnostic(JSON.stringify({results,boundary:'Exact CPU RGBA reconstruction at recorded texture size,using retained baseline function and font. Not a draw-call trace,native HTML baseline,global phase equality,or equal-input fixture acceptance.'}));
  } finally {await browser.close();}
});
