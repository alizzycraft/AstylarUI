import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import ts from 'typescript';
import { chromium } from 'playwright-core';
import { PNG } from 'pngjs';
import { fingerprintDirectory } from './run-checkpoint.mjs';
import { validateSupplementalCapture } from './supplemental-capture-evidence.mjs';
import { propertyGroups } from './input-equivalence-policy.mjs';
import { readGapSurveySource } from './gap-survey-source-replay.mjs';

const file = 'artifacts/material-parity/input-boundaries-keypress-559f95c/latest-report.json';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const bytes = readFileSync(file);
assert.equal(hash(bytes), '39df94e0eb87480d3824927a41a9950d1d275f7c97ab97a571c449efdc6da7d7');
const report = JSON.parse(bytes);

test('public divider typography reduction observes equal paragraph span inputs and opaque backing control', async t => {
  const consumer = path.resolve('examples/material-showcase');
  // Bind the paint/baseline owner, not the entire installed rendering pipeline.
  const canvasPath = path.join(consumer, 'node_modules/astylarui/dist/lib/app/services/text/text-canvas-renderer.service.js');
  const installedCanvas = readFileSync(canvasPath, 'utf8');
  const canvasSource = readFileSync('src/app/services/text/text-canvas-renderer.service.ts', 'utf8');
  const compiledCanvas = ts.transpileModule(canvasSource,
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const ownerBindings = [];
  for (const [start, end, minimum] of [
    ['createStyledCanvas', 'calculateLayoutMetrics', 1000],
    ['calculateCssLineBoxAlphabeticBaseline', 'applyTextTransform', 300]
  ]) {
    const extract = source => {
      const from = source.indexOf(`    ${start}(`), to = source.indexOf(`    ${end}(`);
      assert.ok(from >= 0 && to > from, `missing complete ${start} method boundary`);
      return source.slice(from, to).replace(/\s+/g, ' ').trim();
    };
    const method = extract(installedCanvas);
    assert.ok(method.length > minimum);
    assert.equal(method, extract(compiledCanvas), `${start} installed/current source drift`);
    ownerBindings.push({ method: start, normalizedSha256: hash(method) });
  }
  const downstreamSources = [];
  for (const [relative, start, end] of [
    ['text/multi-line-text-renderer.service', 'calculateLinePositions', 'handleWhiteSpace'],
    ['text/text-rendering.service', 'renderTextToTexture', 'updateTextTexture'],
    ['dom/renderer.service', 'createTextMesh', 'resolveAnonymousFlexTextAlignment'],
    ['babylon-mesh.service', 'createTextMesh', 'createMaterial']
  ]) {
    const sourcePath = `src/app/services/${relative}.ts`;
    const installedPath = path.join(consumer, `node_modules/astylarui/dist/lib/app/services/${relative}.js`);
    const source = readFileSync(sourcePath, 'utf8'), installed = readFileSync(installedPath, 'utf8');
    const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
    const extract = text => {
      const from = text.indexOf(`    ${start}(`), to = text.indexOf(`    ${end}(`);
      assert.ok(from >= 0 && to > from, `missing ${relative} complete method boundaries`);
      return text.slice(from, to).replace(/\s+/g, ' ').trim();
    };
    const methods = extract(installed);
    assert.ok(methods.length > 300);
    assert.equal(methods, extract(compiled), `${relative} downstream installed/current drift`);
    ownerBindings.push({ owner: relative, from: start, until: end, normalizedSha256: hash(methods) });
    downstreamSources.push({ sourcePath, installedPath, source, installed });
  }
  const font = readFileSync(path.join(consumer, 'node_modules/@fontsource/roboto/files/roboto-latin-400-normal.woff2'));
  const built = await createRequire(path.join(consumer, 'package.json'))('esbuild').build({
    stdin: { resolveDir: consumer, sourcefile: 'divider-text-reduction.mjs', contents: `
      import '@angular/compiler';
      import {provideZonelessChangeDetection} from '@angular/core';
      import {createApplication} from '@angular/platform-browser';
      import {Astylar} from 'astylarui';
      import {Vector3,Matrix} from '@babylonjs/core/Maths/math.vector';
      const mode=new URLSearchParams(location.search).get('mode');
      const font=new FontFace('AuditRoboto','url(/font.woff2)',{weight:'400'});
      await font.load();document.fonts.add(font);
      const paintCalls=[];
      const originalFillText=CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText=function(text,x,y,...rest){
        paintCalls.push({text,x,y,font:this.font,canvasWidth:this.canvas.width,canvasHeight:this.canvas.height,
          cssWidth:this.canvas.style.width,cssHeight:this.canvas.style.height,transform:Array.from([this.getTransform().a,this.getTransform().d,this.getTransform().e,this.getTransform().f])});
        return originalFillText.call(this,text,x,y,...rest);
      };
      const origins=[20,20.25,20.5,20.75];
      const site={root:{children:[{type:'div',id:'proof-root',children:origins.map((left,i)=>({type:'p',id:'row-'+i,children:[{type:'span',id:'text-'+i,textContent:i%2?'Below':'Above'}]}))}]},
        styles:[{selector:'#proof-root',width:'200px',height:'180px',padding:'0',margin:'0',borderWidth:'0',background:'#f0f0f0'},
        {selector:'*',fontFamily:'AuditRoboto',fontSize:'14.4px',fontWeight:'400',fontStyle:'normal',lineHeight:'normal',letterSpacing:'normal',color:'#1d1b20'},
        ...origins.map((left,i)=>({selector:'#row-'+i,position:'absolute',left:left+'px',top:(20+i*32+left-20)+'px',width:'120px',height:'24px',padding:'0',margin:'0',borderWidth:'0'}))]};
      document.body.style.cssText='margin:0;background:#f0f0f0';
      const host=document.createElement(mode==='reference'?'div':'canvas');host.style.cssText='position:relative;display:block;width:200px;height:180px;background:#f0f0f0';document.body.append(host);
      let app,surface;
      if(mode==='reference'){
        host.id='proof-root';
        const css=document.createElement('style');css.textContent=site.styles.map(({selector,...v})=>selector+'{'+Object.entries(v).map(([k,x])=>k.replace(/[A-Z]/g,c=>'-'+c.toLowerCase())+':'+x).join(';')+'}').join('');document.head.append(css);
        for(const row of site.root.children[0].children){const p=document.createElement('p');p.id=row.id;const span=document.createElement('span');span.id=row.children[0].id;span.textContent=row.children[0].textContent;p.append(span);host.append(p);}
      }else{app=await createApplication({providers:[provideZonelessChangeDetection()]});surface=app.injector.get(Astylar).mount(host,site,{diagnostics:{logLevel:'silent'}});}
      await surface?.whenSettled();await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
      CanvasRenderingContext2D.prototype.fillText=originalFillText;
      const runtimeText=surface?.scene.meshes.filter(m=>m.metadata?.isTextMesh).map(mesh=>{
        const scene=surface.scene,engine=scene.getEngine(),texture=mesh.material?.diffuseTexture;
        mesh.computeWorldMatrix(true);
        const viewport=scene.activeCamera.viewport.toGlobal(engine.getRenderWidth(),engine.getRenderHeight());
        const corners=mesh.getBoundingInfo().boundingBox.vectorsWorld.map(v=>Vector3.Project(v,Matrix.Identity(),scene.getTransformMatrix(),viewport));
        return {id:mesh.metadata.elementId,logicalSize:texture?.metadata?.astylarLogicalTextSize,
          backingSize:texture?.getSize(),samplingMode:texture?.samplingMode,
          transfer:{textureGammaSpace:texture.gammaSpace,textureHasAlpha:texture.hasAlpha,textureLevel:texture.level,
            materialAlpha:mesh.material.alpha,alphaMode:mesh.material.alphaMode,transparencyMode:mesh.material.transparencyMode,
            useAlphaFromDiffuseTexture:mesh.material.useAlphaFromDiffuseTexture,
            useEmissiveAsIllumination:mesh.material.useEmissiveAsIllumination,disableLighting:mesh.material.disableLighting,
            emissiveIsDiffuse:mesh.material.emissiveTexture===texture,
            imageProcessing:{enabled:scene.imageProcessingConfiguration.isEnabled,exposure:scene.imageProcessingConfiguration.exposure,
              contrast:scene.imageProcessingConfiguration.contrast,toneMappingEnabled:scene.imageProcessingConfiguration.toneMappingEnabled},
            framebuffer:engine._gl?.getContextAttributes()},
          pixels:Array.from(texture.getContext().getImageData(0,0,texture.getSize().width,texture.getSize().height).data),
          bounds:{left:Math.min(...corners.map(v=>v.x))/devicePixelRatio,top:Math.min(...corners.map(v=>v.y))/devicePixelRatio,
            right:Math.max(...corners.map(v=>v.x))/devicePixelRatio,bottom:Math.max(...corners.map(v=>v.y))/devicePixelRatio}};
      })??[];
      const control=document.createElement('canvas');control.width=200*devicePixelRatio;control.height=180*devicePixelRatio;
      const ctx=control.getContext('2d',{alpha:false});ctx.fillStyle='#f0f0f0';ctx.fillRect(0,0,control.width,control.height);ctx.scale(devicePixelRatio,devicePixelRatio);ctx.font='normal 400 14.4px AuditRoboto';ctx.fillStyle='#1d1b20';
      const baselines=origins.map((left,i)=>{const p=document.createElement('p');p.style.cssText='position:absolute;visibility:hidden;font:normal 400 14.4px AuditRoboto;line-height:normal;letter-spacing:normal;padding:0;margin:0;border:0';p.style.left=left+'px';p.style.top=(20+i*32+left-20)+'px';p.textContent=i%2?'Below':'Above';const marker=document.createElement('span');marker.style.cssText='display:inline-block;width:0;height:0;vertical-align:baseline';p.append(marker);document.body.append(p);const y=marker.getBoundingClientRect().top;p.remove();ctx.fillText(i%2?'Below':'Above',left,y);return y;});
      window.dividerTextReduction={site,baselines,paintCalls,runtimeText,control:Array.from(ctx.getImageData(0,0,control.width,control.height).data),errors:surface?.diagnostics.messages.filter(m=>m.severity==='error')??[],dispose(){surface?.dispose();app?.destroy();return surface?.disposed??true;}};
    ` }, bundle: true, write: false, format: 'esm', platform: 'browser', target: 'es2022', metafile: true });
  const inputs = Object.keys(built.metafile.inputs).filter(f => !f.endsWith('divider-text-reduction.mjs'))
    .map(file => ({ file, sha256: hash(readFileSync(file)) }));
  assert.ok(inputs.some(i => i.file.includes('node_modules/astylarui/')));
  const server = createServer((req, res) => {
    const script = req.url.startsWith('/audit.js'), isFont = req.url.startsWith('/font.woff2');
    res.setHeader('content-type', script ? 'text/javascript' : isFont ? 'font/woff2' : 'text/html');
    res.end(script ? built.outputFiles[0].contents : isFont ? font : '<!doctype html><script type="module" src="/audit.js"></script>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser; const results = [];
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    for (const dpr of [1, 2]) {
      const pair = {};
      for (const mode of ['reference', 'astylar']) {
        const page = await browser.newPage({ viewport: { width: 200, height: 180 }, deviceScaleFactor: dpr });
        const errors = []; page.on('pageerror', e => errors.push(String(e)));
        try {
          await page.goto(`http://127.0.0.1:${server.address().port}/?mode=${mode}`);
          await page.waitForFunction(() => !!window.dividerTextReduction);
          const data = await page.evaluate(() => { const {site,baselines,control,errors,paintCalls,runtimeText}=window.dividerTextReduction;return {site,baselines,control,errors,paintCalls,runtimeText}; });
          // Diagnostic backing intervention only: preserve the same global CSS
          // origins/baselines, then composite transparent ink onto the same gray.
          const transparentControl = await page.evaluate(() => {
            const { baselines } = window.dividerTextReduction;
            const ink = document.createElement('canvas');
            ink.width = 200 * devicePixelRatio; ink.height = 180 * devicePixelRatio;
            const pen = ink.getContext('2d', { alpha: true });
            pen.scale(devicePixelRatio, devicePixelRatio);
            pen.font = 'normal 400 14.4px AuditRoboto'; pen.fillStyle = '#1d1b20';
            baselines.forEach((y, i) => pen.fillText(i % 2 ? 'Below' : 'Above', 20 + i * .25, y));
            const result = document.createElement('canvas');
            result.width = ink.width; result.height = ink.height;
            const ctx = result.getContext('2d', { alpha: false });
            ctx.fillStyle = '#f0f0f0'; ctx.fillRect(0, 0, result.width, result.height);
            ctx.drawImage(ink, 0, 0);
            return Array.from(ctx.getImageData(0, 0, result.width, result.height).data);
          });
          const image = PNG.sync.read(await page.screenshot());
          const localControl = await page.evaluate(() => {
            const { baselines } = window.dividerTextReduction;
            const result = document.createElement('canvas');
            result.width = 200 * devicePixelRatio; result.height = 180 * devicePixelRatio;
            const composite = result.getContext('2d', { alpha: false });
            composite.fillStyle = '#f0f0f0'; composite.fillRect(0, 0, result.width, result.height);
            composite.imageSmoothingEnabled = false;
            const rows = baselines.map((baseline, i) => {
              const left = 20 + i * .25, top = 20 + i * 32 + i * .25;
              const ink = document.createElement('canvas');
              ink.width = 120 * devicePixelRatio; ink.height = 24 * devicePixelRatio;
              const pen = ink.getContext('2d', { alpha: true });
              pen.scale(devicePixelRatio, devicePixelRatio);
              pen.font = 'normal 400 14.4px AuditRoboto'; pen.fillStyle = '#1d1b20';
              pen.fillText(i % 2 ? 'Below' : 'Above', 0, baseline - top);
              composite.drawImage(ink, left * devicePixelRatio, top * devicePixelRatio);
              return { left, top, baseline, localBaseline: baseline - top };
            });
            return { rows, pixels: Array.from(composite.getImageData(0, 0, result.width, result.height).data) };
          });
          const mappedControl = await page.evaluate(() => {
            const { baselines } = window.dividerTextReduction;
            const result = document.createElement('canvas');
            result.width = 200 * devicePixelRatio; result.height = 180 * devicePixelRatio;
            const composite = result.getContext('2d', { alpha: false });
            composite.fillStyle = '#f0f0f0'; composite.fillRect(0, 0, result.width, result.height);
            composite.imageSmoothingEnabled = false;
            const rows = baselines.map((baseline, i) => {
              // Measured runtime dimensions from the preceding observation;
              // assert applicability against this run below, never author them.
              const width = i % 2 ? 39.1429 : 40.1062, height = 18;
              const left = 20 + i * .25, top = 20 + i * 32 + i * .25;
              const ink = document.createElement('canvas');
              ink.width = Math.ceil(width * devicePixelRatio); ink.height = height * devicePixelRatio;
              const pen = ink.getContext('2d', { alpha: true });
              pen.scale(devicePixelRatio, devicePixelRatio);
              pen.font = 'normal 400 14.4px AuditRoboto'; pen.fillStyle = '#1d1b20';
              pen.fillText(i % 2 ? 'Below' : 'Above', 0, baseline - top);
              const actual = window.dividerTextReduction.runtimeText.find(row => row.id === 'text-' + i);
              const modeled = pen.getImageData(0, 0, ink.width, ink.height).data;
              let actualTextureDifferences = actual ? 0 : null;
              if (actual) {
                if (actual.pixels.length !== modeled.length) throw new Error('actual/model texture size drift');
                for (let p = 0; p < modeled.length; p += 4)
                  if ([0,1,2,3].some(c => actual.pixels[p+c] !== modeled[p+c])) actualTextureDifferences++;
              }
              composite.drawImage(ink, 0, 0, ink.width, ink.height,
                left * devicePixelRatio, top * devicePixelRatio, width * devicePixelRatio, height * devicePixelRatio);
              return { width, height, backingWidth: ink.width, backingHeight: ink.height, actualTextureDifferences };
            });
            return { rows, pixels: Array.from(composite.getImageData(0, 0, result.width, result.height).data) };
          });
          assert.deepEqual([...image.data.subarray(0, 4)], [240, 240, 240, 255], 'untouched root background must match the control');
          let different = 0;
          for (let i = 0; i < image.data.length; i += 4)
            if ([0,1,2,3].some(c => image.data[i+c] !== data.control[i+c])) different++;
          pair[mode] = { site: data.site, baselines: data.baselines, opaqueControlSha256: hash(Buffer.from(data.control)), differingPixels: different };
          pair[mode].paintCalls = data.paintCalls;
          pair[mode].runtimeText = data.runtimeText.map(({pixels, ...row}) => ({...row, pixelsSha256: hash(Buffer.from(pixels))}));
          let transparentDifference = 0, backingDifference = 0;
          for (let i = 0; i < image.data.length; i += 4) {
            if ([0,1,2,3].some(c => image.data[i+c] !== transparentControl[i+c])) transparentDifference++;
            if ([0,1,2,3].some(c => data.control[i+c] !== transparentControl[i+c])) backingDifference++;
          }
          pair[mode].transparentControlSha256 = hash(Buffer.from(transparentControl));
          pair[mode].transparentControlDifferences = transparentDifference;
          pair[mode].opaqueVersusTransparentDifferences = backingDifference;
          let localDifference = 0, originDifference = 0;
          for (let i = 0; i < image.data.length; i += 4) {
            if ([0,1,2,3].some(c => image.data[i+c] !== localControl.pixels[i+c])) localDifference++;
            if ([0,1,2,3].some(c => transparentControl[i+c] !== localControl.pixels[i+c])) originDifference++;
          }
          pair[mode].localControl = { rows: localControl.rows, sha256: hash(Buffer.from(localControl.pixels)),
            screenshotDifferences: localDifference, globalTransparentDifferences: originDifference };
          let mappedDifference = 0, mappingDifference = 0;
          const mappedDifferenceSamples = [];
          const residualHistogram = {}, signedChannelHistogram = {};
          let maximumChannelDifference = 0, alphaDifferences = 0;
          for (let i = 0; i < image.data.length; i += 4) {
            const deltas = [0,1,2,3].map(c => image.data[i+c] - mappedControl.pixels[i+c]);
            const magnitude = Math.max(...deltas.map(Math.abs));
            maximumChannelDifference = Math.max(maximumChannelDifference, magnitude);
            if (deltas[3]) alphaDifferences++;
            if (magnitude) {
              residualHistogram[magnitude] = (residualHistogram[magnitude] ?? 0) + 1;
              for (const delta of deltas.slice(0, 3))
                signedChannelHistogram[delta] = (signedChannelHistogram[delta] ?? 0) + 1;
            }
            if ([0,1,2,3].some(c => image.data[i+c] !== mappedControl.pixels[i+c])) {
              mappedDifference++;
              if (mappedDifferenceSamples.length < 12) mappedDifferenceSamples.push({
                x: (i / 4) % image.width, y: Math.floor(i / 4 / image.width),
                actual: Array.from(image.data.subarray(i, i + 4)), control: mappedControl.pixels.slice(i, i + 4) });
            }
            if ([0,1,2,3].some(c => localControl.pixels[i+c] !== mappedControl.pixels[i+c])) mappingDifference++;
          }
          pair[mode].mappedControl = { rows: mappedControl.rows, sha256: hash(Buffer.from(mappedControl.pixels)),
            screenshotDifferences: mappedDifference, unmappedLocalDifferences: mappingDifference, samples: mappedDifferenceSamples,
            residualHistogram, signedChannelHistogram, maximumChannelDifference, alphaDifferences };
          assert.equal(Object.values(residualHistogram).reduce((sum, count) => sum + count, 0), mappedDifference);
          if (mode === 'astylar') {
            assert.equal(data.runtimeText.length, 4);
            for (let i = 0; i < 4; i++) {
              const observed = data.runtimeText.find(row => row.id === `text-${i}`), expected = mappedControl.rows[i];
              assert.deepEqual(observed.logicalSize, { width: expected.width, height: expected.height });
              assert.deepEqual(observed.backingSize, { width: expected.backingWidth, height: expected.backingHeight });
              assert.equal(observed.samplingMode, 1);
              assert.equal(expected.actualTextureDifferences, 0, 'actual texture RGBA agrees with the modeled canvas before composition');
            }
          }
          assert.deepEqual(errors, []); assert.deepEqual(data.errors, []);
          assert.equal(await page.evaluate(() => window.dividerTextReduction.dispose()), true);
        } finally { await page.close(); }
      }
      assert.deepEqual(pair.reference.site, pair.astylar.site);
      assert.deepEqual(pair.reference.baselines, pair.astylar.baselines);
      assert.equal(pair.reference.opaqueControlSha256, pair.astylar.opaqueControlSha256);
      assert.equal(pair.reference.transparentControlSha256, pair.astylar.transparentControlSha256);
      assert.deepEqual(pair.reference.localControl.rows, pair.astylar.localControl.rows);
      assert.equal(pair.reference.localControl.sha256, pair.astylar.localControl.sha256);
      assert.equal(pair.reference.mappedControl.sha256, pair.astylar.mappedControl.sha256);
      assert.equal(pair.reference.opaqueVersusTransparentDifferences, pair.astylar.opaqueVersusTransparentDifferences);
      if (dpr === 1) {
        assert.equal(pair.reference.differingPixels, 0, 'opaque baseline control matches native DPR1 paragraph/span paint');
        assert.ok(pair.astylar.differingPixels > 0, 'retain the equal-input candidate paint counterexample');
        assert.ok(pair.reference.opaqueVersusTransparentDifferences > 0, 'backing alone changes paint at identical origins');
        assert.ok(pair.astylar.transparentControlDifferences > 0, 'transparent global backing alone does not reproduce candidate paint');
      }
      results.push({ dpr, ...pair });
    }
    for (const input of inputs) assert.equal(hash(readFileSync(input.file)), input.sha256);
    assert.equal(readFileSync(canvasPath, 'utf8'), installedCanvas);
    assert.equal(readFileSync('src/app/services/text/text-canvas-renderer.service.ts', 'utf8'), canvasSource);
    for (const receipt of downstreamSources) {
      assert.equal(readFileSync(receipt.sourcePath, 'utf8'), receipt.source);
      assert.equal(readFileSync(receipt.installedPath, 'utf8'), receipt.installed);
    }
    t.diagnostic(JSON.stringify({ browser: browser.version(), results, inputs, ownerBindings, fontSha256: hash(font), acceptance: false,
      scope: 'Equal14.4px normal paragraph/span typography at four fractional origins,DPR1/2; opaque baseline control,not full divider flow or causal intervention on renderer backing.' }));
  } finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
});

test('retained divider responsive accessibility and replacement ownership preserve exact bounded observations', () => {
  const load = (name, receipt) => {
    const bytes = readFileSync(`artifacts/material-parity/${name}`);
    assert.equal(hash(bytes), receipt);
    const evidence = JSON.parse(bytes);
    assert.equal(evidence.helperSourceSha256,
      hash(readFileSync('tests/material-parity/sort-focus-structure.spec.mjs')));
    assert.equal(evidence.checkpoint, 'artifacts/material-parity/current-full-20261005/checkpoint/manifest.json');
    assert.equal(evidence.browser, '154.0.8037.58');
    return evidence;
  };
  const ax = load('divider-responsive-ax-20261006.log',
    '0504ec4a2381b9c67a1b931fce33bbb98cba7c6fc43fd2807a87e22cd104f1eb');
  const expected = ['light', 'dark', 'contrast', 'custom'].flatMap(profile =>
    ['tablet', 'mobile'].flatMap(viewport => ['reference', 'astylar'].map(mode => `${profile}:${viewport}:${mode}`)));
  assert.deepEqual(ax.rows.map(r => `${r.profile}:${r.viewport}:${r.mode}`).sort(), expected.sort());
  for (const row of ax.rows) {
    assert.equal(row.dpr, 1);
    assert.deepEqual([row.width, row.height], row.viewport === 'tablet' ? [768, 1024] : [390, 844]);
    assert.deepEqual(row.errors, []);
    assert.equal(row.target.ignored, false);
    assert.equal(row.target.role.value, 'separator');
    assert.equal(row.target.name.value, '');
    assert.equal(row.target.properties.find(p => p.name === 'orientation').value.value, 'horizontal');
    assert.deepEqual(row.target.childIds, []);
  }
  const ownership = load('divider-update-disposal-20261006.log',
    '5260c2abddc5b4d3d0a3ee87bcaca765b8e969841e31df5e9ee1851367c26b51');
  assert.deepEqual(ownership.rows.map(r => `${r.profile}:${r.dpr}`).sort(),
    ['light', 'dark', 'contrast', 'custom'].flatMap(profile => [1, 2].map(dpr => `${profile}:${dpr}`)).sort());
  for (const row of ownership.rows) {
    assert.deepEqual(row.errors, []);
    assert.equal(row.updates.length, 3);
    for (const sample of [row.before, ...row.updates]) {
      assert.deepEqual(sample.live, { meshes: 17, materials: 16, textures: 4 });
      assert.deepEqual(sample.tracked, sample.live);
      assert.equal(sample.cache.size, 4);
      assert.equal(sample.loadedTextures, 4);
      assert.deepEqual(sample.unboundMaterials, []);
      assert.equal(sample.session.status, 'idle');
      assert.deepEqual(sample.session.pendingReasons, []);
    }
    for (const key of ['surfaceDisposed', 'sceneDisposed', 'engineDisposed']) assert.equal(row.after[key], true);
    for (const key of ['meshes', 'materials', 'textures', 'cacheSize', 'loadedTextures']) assert.equal(row.after[key], 0);
    assert.deepEqual(row.after.tracked, { meshes: 0, materials: 0, textures: 0 });
    assert.deepEqual(row.after.plugins, { owners: 0, resources: 0, cleanups: 0, pending: 0 });
  }
  // Receipt replay conserves these observed cohorts; it is not a new browser run,
  // mobile lifecycle, late-async/remount proof or complete accessibility acceptance.
});

test('current list wrapper inputs retain clipping and row-height divergence for all configured cases', () => {
  const fullBytes = readFileSync('artifacts/material-parity/current-full-20261005/latest-report.json');
  assert.equal(hash(fullBytes), 'ab42dbec6280e0e27784ec4bbc6697d4ea451bfab307bccb720c0dec89a83b62');
  const full = JSON.parse(fullBytes);
  const cases = [...full.results, ...full.interactions].filter(row => row.family === 'list');
  assert.equal(cases.length, 52);
  const heights = {};
  for (const row of cases) {
    const trees = Object.fromEntries(['reference', 'astylar'].map(side => {
      const receipt = row.inputTrees[side], raw = readFileSync(receipt.file);
      assert.equal(hash(raw), receipt.sha256);
      return [side, JSON.parse(raw)];
    }));
    for (const id of ['list-inbox-label', 'list-archive-label']) {
      const chains = {};
      for (const side of ['reference', 'astylar']) {
        const tree = trees[side], byKey = new Map(tree.nodes.map(node => [node.key, node]));
        let node = tree.nodes.find(node => (node.attributes?.id ?? node.authored?.id) === id);
        assert.ok(node, id);
        chains[side] = [];
        while (node && (node.attributes?.id ?? node.authored?.id) !== 'list-root') {
          chains[side].push(node);
          node = byKey.get(node.parent);
        }
        assert.ok(node, 'Complete root ancestry is required');
      }
      const content = chains.reference.find(node => node.attributes?.class?.split(' ').includes('mdc-list-item__content'));
      assert.ok(content, 'Native content wrapper is not optional evidence');
      const style = trees.reference.styles[content.style];
      assert.equal(style.flexGrow, '1');
      assert.equal(style.whiteSpace, 'nowrap');
      assert.equal(style.textOverflow, 'ellipsis');
      assert.equal(style.overflowX, 'hidden');
      assert.equal(chains.astylar.length, 3, 'Candidate flattened label/item/list ancestry');
      const nativeItem = chains.reference.find(node => node.type === 'mat-list-item');
      const candidateItem = chains.astylar.find(node => node.authored?.class === 'list-item');
      assert.ok(nativeItem && candidateItem);
      const pair = `${trees.reference.styles[nativeItem.style].height}/${candidateItem.resolvedStyle.height}`;
      heights[pair] = (heights[pair] ?? 0) + 1;
    }
  }
  assert.deepEqual(heights, { '48px/56px': 52, '24px/40px': 26, '40px/48px': 26 });
});

test('configured progress inputs preserve determinate state and original SVG attributes across forty cases', () => {
  const raw = readFileSync('artifacts/material-parity/progress-configured-input-membership-20261006.log');
  assert.equal(hash(raw), 'd64d73bea9a8e7d6ad2640bea3bc6a59c072ae9465f1aa3ca8577c5111fb6684');
  const rows = raw.toString().trim().split(/\r?\n/).map(JSON.parse).filter(row => row.family);
  assert.equal(rows.length, 40);
  const counts = {};
  for (const row of rows) {
    const trees = Object.fromEntries(['reference', 'astylar'].map(side => {
      const receipt = row.receipts[side].receipt, bytes = readFileSync(receipt.file);
      assert.equal(hash(bytes), receipt.sha256);
      return [side, JSON.parse(bytes)];
    }));
    const native = trees.reference.nodes.find(node => node.attributes?.id === `${row.family}-primary`);
    const candidate = trees.astylar.nodes.find(node => node.authored?.id === `${row.family}-primary`);
    assert.equal(native.attributes.value, '64');
    assert.equal(native.attributes.mode, 'determinate');
    assert.equal(candidate.authored.data.progress, .64);
    assert.equal(candidate.authored.data.mode, 'determinate');
    if (row.family === 'progress-spinner') {
      const circle = trees.reference.nodes.find(node => node.attributes?.class === 'mdc-circular-progress__determinate-circle');
      assert.equal(circle.attributes.r, '45');
      assert.equal(circle.attributes.style, row.detail.circle.style);
      assert.equal(candidate.authored.data['stroke-width'], 10);
    } else {
      assert.equal(row.family, 'progress-bar');
      const indicator = trees.reference.nodes.find(node => node.attributes?.class?.split(' ').includes('mdc-linear-progress__primary-bar'));
      assert.equal(indicator.attributes.style, 'transform: scaleX(0.64);');
    }
    counts[row.family] = (counts[row.family] ?? 0) + 1;
  }
  assert.deepEqual(counts, { 'progress-bar': 20, 'progress-spinner': 20 });
});

test('passive descendant semantics retain accessibility hiding omissions independently of visible target gates', () => {
  const raw = readFileSync('artifacts/material-parity/passive-descendant-semantics-20261006.log');
  assert.equal(hash(raw), 'aa5932cda3140e3f15fa661316c9da38a7e8b274fe6dce24eccb63602233147d');
  const records = raw.toString().trim().split(/\r?\n/).map(JSON.parse);
  const summary = records.at(-1);
  assert.equal(summary.summary.cases, 354);
  assert.equal(summary.summary.idReferences, 0);
  assert.deepEqual(summary.summary.hiddenByFamily, {
    'sidenav/reference': 124, 'badge/reference': 52, 'icon/reference': 20,
    'progress-bar/reference': 60, 'progress-spinner/reference': 40,
  });
  for (const receipt of summary.sources) assert.equal(hash(readFileSync(receipt.file)), receipt.sha256);
  const type = readFileSync('src/app/types/dom-element.ts', 'utf8');
  const bridge = readFileSync('src/lib/astylar-semantic-bridge.ts', 'utf8');
  assert.equal(/ariaHidden\s*\??\s*:/.test(type), false);
  assert.equal(/element\.ariaHidden/.test(bridge), false);
  assert.ok(bridge.includes('if (child.hidden) continue;'), 'Visual hidden is not accessibility-only hiding');
  const icon = records.find(row => row.family === 'icon');
  const native = icon.sides.reference.find(node => node.type === 'mat-icon');
  assert.equal(native.attrs['aria-label'], 'Favorite');
  assert.equal(native.attrs['aria-hidden'], 'true');
  assert.equal(icon.sides.astylar.some(node => node.attrs.ariaHidden !== undefined), false);
});

test('captured runtime class bodies match current repository compilation without Angular metadata', async () => {
  const { transform } = await import('esbuild');
  const consumer = 'examples/material-showcase';
  const map = JSON.parse(readFileSync(path.join(consumer,
    'dist/material-showcase/browser/chunk-3JXWRYJY.js.map'), 'utf8'));
  const modules = map.sources.filter(file => file.startsWith('node_modules/astylarui/'));
  assert.equal(modules.length, 88, 'Mapped runtime scope changed; reconcile coverage explicitly.');
  const generated = new Set(['ɵfac', 'ɵprov', 'ɵcmp', 'ɵdir', 'ɵmod', 'ɵinj']);
  const extract = async code => {
    const ast = ts.createSourceFile('proof.js', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
    assert.equal(ast.parseDiagnostics.length, 0);
    const classes = [];
    const visit = node => {
      if ((ts.isClassDeclaration(node) || ts.isClassExpression(node)) && node.name) classes.push(node);
      ts.forEachChild(node, visit);
    };
    visit(ast);
    const result = new Map();
    const imports = new Set();
    const exports = [];
    for (const node of classes) {
      assert.equal(result.has(`class:${node.name.text}`), false, 'Duplicate class identity.');
      const members = node.members.filter(member => !generated.has(member.name?.getText(ast)));
      const heritage = (node.heritageClauses ?? []).map(clause => clause.getText(ast)).join(' ');
      const text = `class Proof ${heritage} {${members.map(member => member.getText(ast)).join('\n')}}`;
      result.set(`class:${node.name.text}`, (await transform(text, {
        loader: 'js', legalComments: 'none', minifyWhitespace: true,
      })).code);
    }
    for (const statement of ast.statements) {
      if (ts.isExportDeclaration(statement)) {
        if (statement.exportClause && ts.isNamedExports(statement.exportClause))
          for (const element of statement.exportClause.elements)
            exports.push(`${statement.moduleSpecifier?.text ?? 'local'}|${element.propertyName?.text ?? element.name.text}|${element.name.text}`);
        else exports.push(`star|${statement.moduleSpecifier?.text}`);
      }
      if (statement.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword)) {
        if (ts.isVariableStatement(statement)) for (const declaration of statement.declarationList.declarations) {
          const name = declaration.name.getText(ast);
          exports.push(`local|${name}|${name}`);
        }
        else if (statement.name) exports.push(`local|${statement.name.text}|${statement.name.text}`);
      }
      if (ts.isImportDeclaration(statement)) {
        const module = statement.moduleSpecifier.text;
        const clause = statement.importClause;
        if (!clause) imports.add(`${module}|side-effect`);
        if (clause?.name) imports.add(`${module}|default|${clause.name.text}`);
        const bindings = clause?.namedBindings;
        if (bindings && ts.isNamespaceImport(bindings)) imports.add(`${module}|namespace|${bindings.name.text}`);
        if (bindings && ts.isNamedImports(bindings)) for (const element of bindings.elements)
          imports.add(`${module}|${element.propertyName?.text ?? element.name.text}|${element.name.text}`);
      }
      if (ts.isExpressionStatement(statement)) {
        const expression = statement.expression;
        const decorator = ts.isBinaryExpression(expression) && ts.isCallExpression(expression.right)
          && expression.right.expression.getText(ast) === '__decorate';
        const metadata = ts.isCallExpression(expression) && ts.isPropertyAccessExpression(expression.expression)
          && expression.expression.name.text === 'ɵɵngDeclareClassMetadata';
        if (!decorator && !metadata) result.set(`effect:${[...result.keys()].filter(key => key.startsWith('effect:')).length}`,
          (await transform(statement.getText(ast), {
            loader: 'js', legalComments: 'none', minifyWhitespace: true,
          })).code);
      }
      if (ts.isFunctionDeclaration(statement) && statement.name) {
        result.set(`function:${statement.name.text}`, (await transform(statement.getText(ast), {
          loader: 'js', legalComments: 'none', minifyWhitespace: true,
        })).code);
      }
      if (ts.isVariableStatement(statement)) for (const declaration of statement.declarationList.declarations) {
        const name = declaration.name.getText(ast);
        if (['__decorate', '__metadata', '__param'].includes(name)) continue;
        if (declaration.initializer && ts.isClassExpression(declaration.initializer)) continue;
        const kind = statement.declarationList.flags & ts.NodeFlags.Const ? 'const'
          : statement.declarationList.flags & ts.NodeFlags.Let ? 'let' : 'var';
        result.set(`variable:${name}`, (await transform(`${kind} ${declaration.getText(ast)};`, {
          loader: 'js', legalComments: 'none', minifyWhitespace: true,
        })).code);
      }
    }
    return { declarations: result, imports, exports: exports.sort() };
  };
  let classCount = 0;
  let functionCount = 0;
  let variableCount = 0;
  let importCount = 0;
  let effectCount = 0;
  let authoredExtraCount = 0;
  let namespaceExtraCount = 0;
  let metadataUseCount = 0;
  let exportCount = 0;
  let decoratorCount = 0;
  let dependencyCount = 0;
  let componentCount = 0;
  for (const module of modules) {
    const sourceFile = path.join('src', module.slice('node_modules/astylarui/dist/lib/'.length)
      .replace(/\.js$/, '.ts'));
    const source = readFileSync(sourceFile, 'utf8');
    const compiled = ts.transpileModule(source, {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022,
        experimentalDecorators: true },
    }).outputText;
    const sourceProjection = await extract(compiled);
    const installedProjection = await extract(readFileSync(path.join(consumer, module), 'utf8'));
    const sourceClasses = sourceProjection.declarations;
    assert.deepEqual(installedProjection.declarations, sourceClasses, sourceFile);
    assert.deepEqual(installedProjection.exports, sourceProjection.exports, `${sourceFile}: export wiring`);
    exportCount += sourceProjection.exports.length;
    for (const binding of sourceProjection.imports)
      assert.ok(installedProjection.imports.has(binding), `${sourceFile}: missing runtime import ${binding}`);
    const authored = ts.createSourceFile(sourceFile, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const authoredBindings = new Set();
    const authoredModules = new Set();
    for (const statement of authored.statements) if (ts.isImportDeclaration(statement)) {
      const from = statement.moduleSpecifier.text;
      authoredModules.add(from);
      const bindings = statement.importClause?.namedBindings;
      if (bindings && ts.isNamedImports(bindings)) for (const element of bindings.elements)
        authoredBindings.add(`${from}|${element.propertyName?.text ?? element.name.text}|${element.name.text}`);
    }
    const namespaceNames = new Set();
    for (const binding of installedProjection.imports) if (!sourceProjection.imports.has(binding)) {
      const [from, imported, local] = binding.split('|');
      if (authoredBindings.has(binding)) authoredExtraCount++;
      else {
        assert.ok(imported === 'namespace' && /^i\d+$/.test(local)
          && (from === '@angular/core' || authoredModules.has(from)), `${sourceFile}: unexplained extra import ${binding}`);
        namespaceNames.add(local);
        namespaceExtraCount++;
      }
    }
    const installedAst = ts.createSourceFile('installed.js', readFileSync(path.join(consumer, module), 'utf8'),
      ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
    const installedDecorators = new Map();
    for (const statement of installedAst.statements) if (ts.isExpressionStatement(statement)
      && ts.isCallExpression(statement.expression) && ts.isPropertyAccessExpression(statement.expression.expression)
      && statement.expression.expression.name.text === 'ɵɵngDeclareClassMetadata') {
      const properties = new Map(statement.expression.arguments[0].properties
        .map(property => [property.name.getText(installedAst), property.initializer]));
      installedDecorators.set(properties.get('type').getText(installedAst), properties.get('decorators').getText(installedAst));
    }
    const canonicalDecorator = async expression => (await transform(ts.transpileModule(`const proof=${expression};`, {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
    }).outputText, { loader: 'js', legalComments: 'none', minifyWhitespace: true, minifySyntax: true })).code;
    let authoredDecoratorCount = 0;
    for (const node of authored.statements.filter(ts.isClassDeclaration)) {
      const decorators = ts.getDecorators(node);
      if (!decorators?.length) continue;
      authoredDecoratorCount++;
      decoratorCount++;
      const expected = `[${decorators.map(decorator => {
        const expression = decorator.expression;
        return ts.isCallExpression(expression)
          ? `{type:${expression.expression.getText(authored)}${expression.arguments.length
            ? `,args:[${expression.arguments.map(argument => argument.getText(authored)).join(',')}]` : ''}}`
          : `{type:${expression.getText(authored)}}`;
      }).join(',')}]`;
      assert.ok(installedDecorators.has(node.name.text), `${sourceFile}: missing authored decorator metadata`);
      assert.equal(await canonicalDecorator(installedDecorators.get(node.name.text)),
        await canonicalDecorator(expected), `${sourceFile}: authored decorator requests`);
      for (const member of node.members)
        assert.equal(ts.getDecorators(member)?.length ?? 0, 0, `${sourceFile}: new property decorator requires coverage`);
      const installedClass = installedAst.statements.find(statement => ts.isClassDeclaration(statement)
        && statement.name?.text === node.name.text);
      const factory = installedClass.members.find(member => member.name?.getText(installedAst) === 'ɵfac');
      const component = installedClass.members.find(member => member.name?.getText(installedAst) === 'ɵcmp');
      if (component) {
        componentCount++;
        const literal = expression => {
          if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) return expression.text;
          if (expression.kind === ts.SyntaxKind.TrueKeyword) return true;
          if (expression.kind === ts.SyntaxKind.FalseKeyword) return false;
          if (expression.kind === ts.SyntaxKind.NullKeyword) return null;
          if (ts.isArrayLiteralExpression(expression)) return expression.elements.map(literal);
          if (ts.isObjectLiteralExpression(expression)) return Object.fromEntries(expression.properties
            .map(property => [property.name.text, literal(property.initializer)]));
          assert.fail(`${sourceFile}: nonliteral component metadata requires coverage`);
        };
        const componentProperties = new Map(component.initializer.arguments[0].properties
          .map(property => [property.name.getText(installedAst), property.initializer]));
        const expectedInputs = {};
        const expectedOutputs = {};
        const expectedQueries = [];
        for (const member of node.members) if (ts.isPropertyDeclaration(member)
          && member.initializer && ts.isCallExpression(member.initializer)) {
          const call = member.initializer;
          const name = member.name.getText(authored);
          const callee = call.expression.getText(authored);
          if (callee === 'input' || callee === 'input.required') expectedInputs[name] = {
            classPropertyName: name, publicName: name, isSignal: true,
            isRequired: callee === 'input.required', transformFunction: null,
          };
          else if (callee === 'output') expectedOutputs[name] = name;
          else if (callee === 'viewChild.required') expectedQueries.push({
            propertyName: name, first: true, predicate: [literal(call.arguments[0])],
            descendants: true, isSignal: true,
          });
        }
        assert.deepEqual(literal(componentProperties.get('inputs')), expectedInputs, `${sourceFile}: signal inputs`);
        assert.deepEqual(literal(componentProperties.get('outputs')), expectedOutputs, `${sourceFile}: signal outputs`);
        assert.deepEqual(literal(componentProperties.get('viewQueries')), expectedQueries, `${sourceFile}: signal queries`);
        const decorator = decorators.find(value => ts.isCallExpression(value.expression)
          && value.expression.expression.getText(authored) === 'Component');
        const request = literal(decorator.expression.arguments[0]);
        assert.equal(literal(componentProperties.get('selector')), request.selector);
        assert.equal(literal(componentProperties.get('isStandalone')), request.standalone);
        assert.equal(literal(componentProperties.get('template')), request.template);
        assert.deepEqual(literal(componentProperties.get('styles')), request.styles);
        assert.equal(literal(componentProperties.get('isInline')), true);
      }
      const factoryProperties = new Map(factory.initializer.arguments[0].properties
        .map(property => [property.name.getText(installedAst), property.initializer]));
      const dependencies = factoryProperties.get('deps');
      assert.ok(ts.isArrayLiteralExpression(dependencies), `${sourceFile}: unsupported dependency representation`);
      const parameters = node.members.find(ts.isConstructorDeclaration)?.parameters ?? [];
      assert.equal(dependencies.elements.length, parameters.length, `${sourceFile}: constructor dependency count`);
      for (const [index, parameter] of parameters.entries()) {
        const requested = { token: parameter.type?.getText(authored) };
        for (const decorator of ts.getDecorators(parameter) ?? []) {
          assert.ok(ts.isCallExpression(decorator.expression), `${sourceFile}: dependency decorator representation`);
          const name = decorator.expression.expression.getText(authored);
          if (name === 'Inject') requested.token = decorator.expression.arguments[0].getText(authored);
          else if (name === 'Optional') requested.optional = true;
          else assert.fail(`${sourceFile}: uncovered dependency decorator ${name}`);
        }
        const actual = {};
        for (const property of dependencies.elements[index].properties) {
          const key = property.name.getText(installedAst);
          if (key === 'token') {
            const token = property.initializer;
            if (ts.isPropertyAccessExpression(token)) {
              const namespace = token.expression.getText(installedAst);
              const binding = [...installedProjection.imports].find(value => value.endsWith(`|namespace|${namespace}`));
              assert.ok(binding, `${sourceFile}: unresolved DI namespace`);
              const from = binding.split('|')[0];
              assert.ok(authoredBindings.has(`${from}|${token.name.text}|${requested.token}`), `${sourceFile}: DI module identity`);
              actual.token = token.name.text;
            } else actual.token = token.getText(installedAst);
          } else {
            assert.equal(property.initializer.kind, ts.SyntaxKind.TrueKeyword, `${sourceFile}: dependency flag representation`);
            actual[key] = true;
          }
        }
        assert.deepEqual(actual, requested, `${sourceFile}: dependency ${index}`);
        dependencyCount++;
      }
    }
    assert.equal(installedDecorators.size, authoredDecoratorCount, `${sourceFile}: extra decorator metadata`);
    const inspectNamespaceUse = node => {
      if (ts.isIdentifier(node) && namespaceNames.has(node.text)) {
        let owner = node;
        let allowed = false;
        while (owner) {
          if (ts.isImportDeclaration(owner)) { allowed = true; break; }
          if (ts.isPropertyDeclaration(owner) && generated.has(owner.name.getText(installedAst))) {
            allowed = true; metadataUseCount++; break;
          }
          if (ts.isExpressionStatement(owner) && ts.isCallExpression(owner.expression)
            && ts.isPropertyAccessExpression(owner.expression.expression)
            && owner.expression.expression.name.text === 'ɵɵngDeclareClassMetadata') {
            allowed = true; metadataUseCount++; break;
          }
          owner = owner.parent;
        }
        assert.ok(allowed, `${sourceFile}: compiler namespace escapes metadata: ${node.text}`);
      }
      ts.forEachChild(node, inspectNamespaceUse);
    };
    inspectNamespaceUse(installedAst);
    importCount += sourceProjection.imports.size;
    effectCount += [...sourceClasses.keys()].filter(key => key.startsWith('effect:')).length;
    classCount += [...sourceClasses.keys()].filter(key => key.startsWith('class:')).length;
    functionCount += [...sourceClasses.keys()].filter(key => key.startsWith('function:')).length;
    variableCount += [...sourceClasses.keys()].filter(key => key.startsWith('variable:')).length;
  }
  assert.equal(classCount, 80, 'Class scope changed; do not infer whole-module provenance.');
  assert.equal(functionCount, 98, 'Function scope changed; reconcile coverage.');
  assert.equal(variableCount, 53, 'Variable scope changed; reconcile coverage.');
  assert.equal(importCount, 373, 'Runtime import scope changed; reconcile coverage.');
  assert.equal(effectCount, 4, 'Module effect scope changed; reconcile coverage.');
  assert.equal(authoredExtraCount, 110, 'Authored DI import scope changed.');
  assert.equal(namespaceExtraCount, 171, 'Generated namespace scope changed.');
  assert.equal(metadataUseCount, 644, 'Generated namespace metadata use scope changed.');
  assert.equal(exportCount, 130, 'Mapped export scope changed; reconcile coverage.');
  assert.equal(decoratorCount, 60, 'Authored decorator scope changed; reconcile coverage.');
  assert.equal(dependencyCount, 113, 'Constructor dependency scope changed; reconcile coverage.');
  assert.equal(componentCount, 1, 'Generated component scope changed; reconcile coverage.');
});

test('public input lifecycle isolates caret material retention without Material plugins', async t => {
  const consumer = path.resolve('examples/material-showcase');
  const methods = [
    ['text/text-selection.service','createTextCursor'],
    ['dom/input/text-cursor.renderer','disposeCursor'],
    ['dom/input/text-input.manager','disposeTextInput'],
    ['dom/input/text-input.manager','handleFocus'],
    ['dom/input/input-element.service','releaseInputMesh'],
    ['dom/input/input-element.service','cleanup'],
    ['dom/renderer.service','createSiteFromData'],
    ['../../lib/astylar-scene-resources','replace'],
    ['../../lib/astylar-scene-resources','clearMaterials'],
    ['../../lib/astylar-visual-resource-reconciler','stage'],
    ['../../lib/astylar','createScene'],
  ].map(([module,name])=>{
    const sourceFile=path.normalize('src/app/services/'+module+'.ts');
    const installedFile=path.join(consumer,'node_modules/astylarui/dist/lib/app/services',module+'.js');
    const source=readFileSync(sourceFile,'utf8'), installed=readFileSync(installedFile,'utf8');
    const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
    const extract=code=>{
      const ast=ts.createSourceFile('method.js',code,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
      assert.equal(ast.parseDiagnostics.length,0);
      const matches=[];
      const visit=node=>{if(ts.isMethodDeclaration(node)&&node.name.getText(ast)===name) matches.push(node.getText(ast).replace(/\s+/g,' ').trim());ts.forEachChild(node,visit);};
      visit(ast);assert.equal(matches.length,1,name);return matches[0];
    };
    assert.equal(extract(installed),extract(compiled),name+' installed method differs from current source');
    return {sourceFile,sourceSha256:hash(Buffer.from(source)),installedFile,installedSha256:hash(Buffer.from(installed)),method:name};
  });
  const requireConsumer = createRequire(path.join(consumer, 'package.json'));
  const built = await requireConsumer('esbuild').build({absWorkingDir:process.cwd(),
    stdin:{resolveDir:consumer,sourcefile:'public-caret-lifetime.mjs',contents:`
      import '@angular/compiler';
      import {provideZonelessChangeDetection} from '@angular/core';
      import {createApplication} from '@angular/platform-browser';
      import {Astylar} from 'astylarui';
      document.body.style.cssText='margin:0;padding:0';
      const canvas=document.createElement('canvas');
      canvas.style.cssText='display:block;width:390px;height:140px';document.body.append(canvas);
      const app=await createApplication({providers:[provideZonelessChangeDetection()]});
      const documentFor=(present=true,revision=0)=>({root:{children:present?[{
        type:'input',inputType:'text',id:'lifetime-input',value:'Atlas',ariaLabel:'lifetime input'}]:[]},
        styles:[{selector:'#lifetime-input',position:'absolute',left:'20px',top:'40px',width:'228px',height:'24px',
          boxSizing:'border-box',padding:'0',borderWidth:'0',fontFamily:'Arial',fontSize:'16px',lineHeight:'24px',
          color:'#222222',background:revision%2?'#dddddd':'#eeeeee'}]});
      const surface=app.injector.get(Astylar).mount(canvas,documentFor(),{diagnostics:{logLevel:'silent'}});
      const scene=surface.scene;
      const settle=async()=>{await document.fonts.ready;await surface.whenSettled();
        await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));};
      const snapshot=()=>{
        const input=document.querySelector('[data-astylar-id="lifetime-input"]');
        const cursors=scene.meshes.filter(m=>m.name.startsWith('cursor_'));
        const materials=scene.materials.filter(m=>m.name.startsWith('cursorMaterial_'));
        return {focused:input===document.activeElement,value:input?.value??null,
          meshes:scene.meshes.length,materials:scene.materials.length,textures:scene.textures.length,
          cursors:cursors.map(m=>({id:m.uniqueId,name:m.name,material:m.material?.uniqueId})),
          cursorMaterials:materials.map(m=>({id:m.uniqueId,name:m.name,
            bound:scene.meshes.some(mesh=>mesh.material===m)})),
          tracked:surface.diagnostics.resources,diagnostics:surface.diagnostics.messages};};
      await settle();
      window.lifetimeAudit={settle,snapshot,async update(present,revision){
        await surface.update(documentFor(present,revision));await settle();return snapshot();},
        dispose(){surface.dispose();app.destroy();return {disposed:surface.disposed,
          sceneDisposed:scene.isDisposed,meshes:scene.meshes.length,materials:scene.materials.length,textures:scene.textures.length};}};
    `},bundle:true,write:false,format:'esm',platform:'browser',target:'es2022',metafile:true});
  const inputs=Object.keys(built.metafile.inputs).filter(file=>path.basename(file)!=='public-caret-lifetime.mjs')
    .map(file=>({file,sha256:hash(readFileSync(file))}));
  assert.ok(!inputs.some(({file})=>file.includes('material-showcase/src') || file.includes('astylarui/dist/lib/plugins/material')));
  const server=createServer((request,response)=>{
    const script=new URL(request.url,'http://localhost').pathname==='/audit.js';
    response.setHeader('content-type',script?'text/javascript':'text/html');
    response.end(script?built.outputFiles[0].contents:'<!doctype html><script type="module" src="/audit.js"></script>');
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;
  const samples=[],errors=[];
  try {
    browser=await chromium.launch({channel:'chrome',headless:true});
    const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});
    page.on('pageerror',error=>errors.push(String(error)));
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await page.waitForFunction(()=>!!window.lifetimeAudit);
    const sample=async label=>{await page.evaluate(()=>window.lifetimeAudit.settle());
      const state=await page.evaluate(()=>window.lifetimeAudit.snapshot());samples.push({label,...state});
      assert.deepEqual(state.diagnostics,[]);return state;};
    await sample('mounted');
    for(let cycle=0;cycle<3;cycle++) {
      await page.locator('[data-astylar-id="lifetime-input"]').focus();await sample('focus-'+cycle);
      await page.mouse.click(10,10);await sample('blur-'+cycle);
    }
    await page.locator('[data-astylar-id="lifetime-input"]').focus();
    for(let revision=1;revision<=3;revision++) {
      await page.evaluate(revision=>window.lifetimeAudit.update(true,revision),revision);await sample('update-'+revision);
    }
    for(let cycle=0;cycle<3;cycle++) {
      await page.evaluate(()=>window.lifetimeAudit.update(false,0));await sample('removed-'+cycle);
      await page.evaluate(()=>window.lifetimeAudit.update(true,0));
      await page.locator('[data-astylar-id="lifetime-input"]').focus();await sample('recreated-'+cycle);
    }
    const disposed=await page.evaluate(()=>window.lifetimeAudit.dispose());
    t.diagnostic(JSON.stringify({browser:browser.version(),viewport:{width:390,height:844,dpr:2},
      bundleSha256:hash(built.outputFiles[0].contents),dependencyCount:inputs.length,
      packages:Object.fromEntries(['@angular/core','@babylonjs/core','astylarui'].map(name=>
        [name,JSON.parse(readFileSync(path.join(consumer,'node_modules',name,'package.json'))).version])),
      dependencyReceipt:hash(Buffer.from(JSON.stringify(inputs))),methods,samples,disposed,errors,
      ownershipAttribution:{firstDivergence:'post-render focus allocates resources outside synchronous transaction ownership',
        cleanupGap:'cursor mesh disposal does not dispose its separate material',
        updateDistinction:'focus restoration inside replacement transaction adopts replacement material',
        classification:'confirmed-core-lifecycle-defect',scope:'one public input, Chrome154 DPR2; not GPU or performance attribution'},
      resourcePlateauAccepted:false}));
    assert.deepEqual(errors,[]);
    const first=samples.find(sample=>sample.label==='focus-0');
    const mounted=samples.find(sample=>sample.label==='mounted');
    assert.deepEqual(mounted.tracked,{meshes:mounted.meshes,materials:mounted.materials,textures:mounted.textures});
    assert.equal(first.focused,true);assert.equal(first.cursorMaterials.length,1);assert.equal(first.cursors.length,1);
    for(const sample of samples.filter(sample=>/^(focus|blur)-/.test(sample.label))) {
      assert.equal(sample.value,'Atlas');assert.equal(sample.focused,sample.label.startsWith('focus-'));
      assert.deepEqual(sample.cursorMaterials,first.cursorMaterials,'blur/refocus negative control retains one bound material');
      assert.deepEqual(sample.cursors,first.cursors);
      assert.deepEqual(sample.tracked,mounted.tracked,'post-render focus allocations are outside synchronous transaction ownership');
      assert.ok(sample.meshes>sample.tracked.meshes);assert.ok(sample.materials>sample.tracked.materials);
    }
    for(const sample of samples.filter(sample=>sample.label.startsWith('update-'))) {
      assert.equal(sample.focused,true);assert.equal(sample.value,'Atlas');
      assert.equal(sample.cursorMaterials.length,2);assert.equal(sample.cursors.length,1);
      assert.deepEqual(sample.cursorMaterials.filter(material=>!material.bound),[
        {...first.cursorMaterials[0],bound:false}],'same-ID updates retain the first orphan, not three accumulating orphans');
    }
    for(let cycle=0;cycle<3;cycle++) {
      const removed=samples.find(sample=>sample.label==='removed-'+cycle);
      const recreated=samples.find(sample=>sample.label==='recreated-'+cycle);
      assert.equal(removed.value,null);assert.equal(removed.focused,false);assert.deepEqual(removed.cursors,[]);
      assert.equal(removed.cursorMaterials.length,cycle+1);assert.ok(removed.cursorMaterials.every(material=>!material.bound));
      assert.equal(removed.materials-removed.tracked.materials,removed.cursorMaterials.length,
        'every material outside transaction ownership after removal is a retained caret material');
      assert.equal(recreated.value,'Atlas');assert.equal(recreated.focused,true);assert.equal(recreated.cursors.length,1);
      assert.equal(recreated.cursorMaterials.length,cycle+2);
      assert.deepEqual(recreated.cursorMaterials.filter(material=>!material.bound),removed.cursorMaterials);
      assert.equal(recreated.cursorMaterials.filter(material=>material.bound).length,1);
    }
    // Audit counterexample, not cleanup acceptance: preserve the failing invariant.
    assert.throws(()=>assert.equal(samples.find(sample=>sample.label==='removed-2').cursorMaterials.length,0),
      {code:'ERR_ASSERTION'});
    assert.deepEqual(disposed,{disposed:true,sceneDisposed:true,meshes:0,materials:0,textures:0});
    for(const input of inputs) assert.equal(hash(readFileSync(input.file)),input.sha256,input.file+' changed during proof');
    for(const method of methods) {
      assert.equal(hash(readFileSync(method.sourceFile)),method.sourceSha256);
      assert.equal(hash(readFileSync(method.installedFile)),method.installedSha256);
    }
  } finally {await browser?.close();await new Promise(resolve=>server.close(resolve));}
});

test('served core isolates Home and End selection collapse from Material popup behavior', async () => {
  const source = readFileSync('examples/material-showcase/dist/material-showcase/browser/chunk-3JXWRYJY.js');
  assert.equal(hash(source), 'f366533bd9f80b7f85379db5031c0dea8c9c1840c14fb6ec35f57f1b65ad9eab');
  const ast = ts.createSourceFile('served.js', source.toString(), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  assert.equal(ast.parseDiagnostics.length, 0);
  const methods = [];
  const visit = node => {
    if (ts.isMethodDeclaration(node) && node.name.getText(ast) === 'moveCursor') methods.push(node);
    ts.forEachChild(node, visit);
  };
  visit(ast); assert.equal(methods.length, 1);
  // Execute the complete shipped arithmetic method. No mesh/controller is
  // needed for these horizontal cases; public Material evidence above supplies
  // the composed application proof. This is not a replacement renderer.
  const directions = Object.fromEntries(['Left', 'Right', 'Up', 'Down', 'Home', 'End'].map(k => [k, k.toLowerCase()]));
  const move = new Function('CursorDirection', `return ({${methods[0].getText(ast)}}).moveCursor;`)(directions);
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    assert.equal(browser.version(), report.browser);
    const page = await browser.newPage();
    await page.setContent('<input value="Atlas" aria-label="isolated text input">');
    for (const c of [
      { key: 'End', range: [0, 3], native: 5, shipped: 3 },
      { key: 'Home', range: [2, 5], native: 0, shipped: 2 },
      { key: 'End', range: [2, 2], native: 5, shipped: 5 },
      { key: 'Home', range: [2, 2], native: 0, shipped: 0 },
      { key: 'ArrowRight', range: [0, 3], native: 3, shipped: 3 },
      { key: 'ArrowLeft', range: [2, 5], native: 2, shipped: 2 },
    ]) {
      await page.locator('input').focus();
      await page.locator('input').evaluate((input, range) => input.setSelectionRange(...range), c.range);
      await page.keyboard.press(c.key);
      const native = await page.locator('input').evaluate(input => [input.selectionStart, input.selectionEnd]);
      const input = { textContent: 'Atlas', selectionStart: c.range[0], selectionEnd: c.range[1], cursorPosition: c.range[1],
        cursorState: { position: c.range[1], selectionStart: c.range[0], selectionEnd: c.range[1], selectionActive: c.range[0] !== c.range[1] } };
      move.call({}, input, directions[c.key.replace('Arrow', '')], false);
      assert.deepEqual(native, [c.native, c.native], c.key);
      assert.deepEqual([input.selectionStart, input.selectionEnd], [c.shipped, c.shipped], c.key);
    }
  } finally { await browser.close(); }
});

test('native Tab selection is collapsed by the served semantic-state synchronization', async () => {
  const manifest = JSON.parse(readFileSync(report.capture.checkpointManifest.file));
  const browserRoot = path.resolve('examples/material-showcase/dist/material-showcase/browser');
  assert.deepEqual(fingerprintDirectory(browserRoot), manifest.provenance.browserFiles,
    'served showcase differs from the retained input-boundary build');
  const server = createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
    const candidate = path.resolve(browserRoot, pathname.replace(/^\/+/, ''));
    const target = candidate.startsWith(browserRoot + path.sep) && path.extname(candidate) && existsSync(candidate)
      ? candidate : path.join(browserRoot, 'index.csr.html');
    const extension = path.extname(target);
    const contentType = extension === '.js' ? 'text/javascript' : extension === '.css' ? 'text/css' :
      extension === '.woff2' ? 'font/woff2' : extension === '.svg' ? 'image/svg+xml' : 'text/html';
    response.writeHead(200, { 'content-type': contentType, 'cache-control': 'no-store' });
    response.end(readFileSync(target));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    const referencePage = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    await referencePage.goto(`http://127.0.0.1:${server.address().port}/reference/form-field?benchmark=1&profile=light&interaction=audit-tab-focus`);
    await referencePage.locator('.frame').waitFor();
    await referencePage.keyboard.press('Tab');
    const currentReference = await referencePage.locator('#form-field-control').evaluate(input =>
      [document.activeElement === input, input.value, input.selectionStart, input.selectionEnd]);
    assert.deepEqual(currentReference, [true, 'Atlas', 0, 5],
      'current browser no longer selects the HTML reference value on Tab');
    await referencePage.close();
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', error => errors.push(String(error)));
    await page.addInitScript(() => {
      window.__tabSelectionEvidence = { focus: [], writes: [] };
      const original = HTMLInputElement.prototype.setSelectionRange;
      HTMLInputElement.prototype.setSelectionRange = function(start, end, direction) {
        if (this.dataset.astylarId === 'form-field-control') {
          window.__tabSelectionEvidence.writes.push({
            before: [this.selectionStart, this.selectionEnd], after: [start, end],
            stack: new Error().stack,
          });
        }
        return original.call(this, start, end, direction);
      };
      document.addEventListener('focusin', event => {
        if (event.target instanceof HTMLInputElement &&
            event.target.dataset.astylarId === 'form-field-control') {
          window.__tabSelectionEvidence.focus.push([
            event.target.selectionStart, event.target.selectionEnd,
          ]);
        }
      }, true);
    });
    await page.goto(`http://127.0.0.1:${server.address().port}/astylar/form-field?benchmark=1&profile=light&interaction=audit-tab-focus`);
    await page.locator('.frame').waitFor();
    await page.waitForFunction(() => !!window.__ASTYLAR_MATERIAL_BENCHMARK__);
    await page.keyboard.press('Tab');
    await page.evaluate(async () => {
      await window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled();
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
    const observed = await page.evaluate(() => {
      const semantic = document.querySelector('[data-astylar-id="form-field-control"]');
      const input = window.ng.getComponent(document.querySelector('app-astylar-showcase'))
        .surface.host.inputElementService.getInputElement('form-field-control');
      return {
        evidence: window.__tabSelectionEvidence,
        active: document.activeElement === semantic,
        semantic: [semantic.selectionStart, semantic.selectionEnd],
        scene: [input.selectionStart, input.selectionEnd],
      };
    });
    const retained = report.results.find(row => row.family === 'form-field' &&
      row.viewport.deviceScaleFactor === 1 && row.state === 'keyboard-focus');
    assert.ok(retained);
    assert.deepEqual([retained.reference.observation.control.selectionStart,
      retained.reference.observation.control.selectionEnd], [0, 5]);
    assert.deepEqual([retained.astylar.observation.control.selectionStart,
      retained.astylar.observation.control.selectionEnd], [0, 0]);
    assert.deepEqual(observed.evidence.focus[0], [0, 5],
      'native Tab focus did not initially select the semantic value');
    assert.ok(observed.evidence.writes.some(write =>
      write.before[0] === 0 && write.before[1] === 5 &&
      write.after[0] === 0 && write.after[1] === 0 &&
      write.stack.includes('AstylarSemanticBridge.applyControlState') &&
      write.stack.includes('AstylarSemanticBridge.syncControlStates')),
    'served semantic-state sync did not overwrite the native selection');
    assert.equal(observed.active, true);
    assert.deepEqual(observed.semantic, [0, 0]);
    assert.deepEqual(observed.scene, [0, 0]);
    assert.deepEqual(errors, []);
    await page.close();
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});

test('retained reference screenshots suppress the native caret by Playwright default', async () => {
  const producer = 'scripts/audit-material-input-boundaries.mjs';
  const source = readFileSync(producer);
  assert.equal(hash(source), report.capture.sources.find(item => item.file === producer)?.sha256);
  assert.match(source.toString(), /page\.screenshot\(\{ clip \}\)/,
    'retained capture did not use the default screenshot caret setting');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 300, height: 100 } });
    await page.setContent('<input id="probe">');
    await page.locator('#probe').evaluate(input => {
      input.style.font = '20px Arial';
      input.style.caretColor = 'black';
      input.style.width = '200px';
      input.style.height = '40px';
    });
    await page.locator('#probe').focus();
    assert.equal(await page.locator('#probe').evaluate(input => document.activeElement === input), true);
    const clip = { x: 0, y: 0, width: 240, height: 60 };
    const hidden = PNG.sync.read(await page.screenshot({ clip, caret: 'hide' }));
    let observedNativeCaret = false;
    for (let sample = 0; sample < 8; sample++) {
      const initial = PNG.sync.read(await page.screenshot({ clip, caret: 'initial' }));
      let pixels = 0, minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (let y = 0; y < initial.height; y++) for (let x = 0; x < initial.width; x++) {
        const i = (y * initial.width + x) * 4;
        if (initial.data[i] === hidden.data[i] &&
            initial.data[i + 1] === hidden.data[i + 1] &&
            initial.data[i + 2] === hidden.data[i + 2]) continue;
        pixels++; minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      }
      if (pixels > 0) {
        assert.ok(maxX - minX <= 3 && maxY - minY >= 10,
          `Screenshot option changed more than the native caret: ${JSON.stringify({ pixels, minX, maxX, minY, maxY })}`);
        observedNativeCaret = true;
        break;
      }
      await page.waitForTimeout(100);
    }
    assert.equal(observedNativeCaret, true,
      'Explicit initial caret option did not reveal a native caret in timed screenshots');
    await page.close();
  } finally { await browser.close(); }
});

test('current paired caret-visible capture binds its pixels to unequal caret authoring', () => {
  const currentFile = 'artifacts/material-parity/caret-visible-form-field-154/latest-report.json';
  const currentBytes = readFileSync(currentFile);
  assert.equal(hash(currentBytes), '8111da2cef29dd5a79af5e2723f4cdb73f98a56328860178a14d7301628992c3');
  const current = JSON.parse(currentBytes);
  const manifest = JSON.parse(readFileSync(current.capture.checkpointManifest.file));
  const historicalManifest = JSON.parse(readFileSync(report.capture.checkpointManifest.file));
  assert.equal(current.browser, '154.0.8037.58');
  assert.deepEqual(manifest.provenance.browserFiles, historicalManifest.provenance.browserFiles);
  assert.equal(manifest.provenance.installedDependencies, historicalManifest.provenance.installedDependencies);
  assert.equal(manifest.provenance.browserFiles.length, 1887);
  const producer = current.capture.sources.find(item => item.file === 'scripts/audit-material-visible-caret.mjs');
  assert.ok(producer);
  assert.throws(() => readGapSurveySource(producer, {
    current: file => readFileSync(file, 'utf8').replace("await page.keyboard.press('Tab')", "await page.keyboard.press('Enter')"),
  }), /Unreviewed visible-caret producer drift/);
  assert.deepEqual(validateSupplementalCapture(current, { reportFile: currentFile,
    expectedProvenance: manifest.provenance, script: 'scripts/audit-material-visible-caret.mjs',
    styleProperties: Object.values(propertyGroups).flat(),
    readBytes: file => path.resolve(file) === path.resolve(producer.file)
      ? Buffer.from(readGapSurveySource(producer)) : readFileSync(file),
  }), { status: 'checkpoint-bound', errors: [] });
  assert.deepEqual(current.results.map(row => row.state), Array.from({ length: 6 }, (_, i) => `focused-empty-${i}`));
  for (const row of current.results) for (const mode of ['reference', 'astylar']) {
    const side = row[mode];
    assert.equal(side.observation.control.value, '');
    assert.equal(side.observation.control.focused, true);
    for (const item of [side.screenshot, side.hiddenCaretControl]) {
      assert.equal(hash(readFileSync(item.file)), item.sha256, `${row.state}/${mode}/${item.caret}`);
      assert.deepEqual(item.clip, side.screenshot.clip);
    }
    assert.equal(side.screenshot.caret, 'initial');
    assert.equal(side.hiddenCaretControl.caret, 'hide');
    assert.equal(side.nativeCaretPixelDelta.changedPixels,
      rasterDifference(readFileSync(side.screenshot.file), readFileSync(side.hiddenCaretControl.file)).count);
  }
  const first = current.results[0], off = current.results[2];
  assert.deepEqual(first.reference.nativeCaretPixelDelta,
    { changedPixels: 19, bounds: { minX: 16, minY: 19, maxX: 16, maxY: 37 } });
  assert.equal(first.astylar.nativeCaretPixelDelta.changedPixels, 0);
  assert.deepEqual(off.reference.nativeCaretPixelDelta, { changedPixels: 0, bounds: null });
  const referenceOnOff = rasterDifference(readFileSync(first.reference.screenshot.file),
    readFileSync(off.reference.screenshot.file));
  const astylarOnOff = rasterDifference(readFileSync(first.astylar.screenshot.file),
    readFileSync(off.astylar.screenshot.file));
  assert.deepEqual(referenceOnOff, { count: 19, bounds: { minX: 16, minY: 19, maxX: 16, maxY: 37 },
    colors: ['103,80,164'] });
  assert.deepEqual(astylarOnOff.bounds, { minX: 15, minY: 18, maxX: 16, maxY: 37 });
  assert.ok(astylarOnOff.colors.includes('29,27,32'));
  const referenceTree = JSON.parse(readFileSync(first.reference.inputTree.file));
  const candidateTree = JSON.parse(readFileSync(first.astylar.inputTree.file));
  const referenceInput = referenceTree.nodes.find(node => node.attributes?.id === 'form-field-control');
  const candidateInput = candidateTree.nodes.find(node => node.authored?.id === 'form-field-control');
  assert.equal(referenceTree.styles[referenceInput.style].caretColor, 'rgb(103, 80, 164)');
  assert.ok(referenceInput.rules.map(index => referenceTree.rules[index]).some(rule =>
    rule.declarations?.['caret-color']?.value.includes('--mat-form-field-filled-caret-color')));
  assert.equal(candidateInput.resolvedStyle.caretColor, undefined);
  assert.equal(candidateInput.resolvedStyle.color, '#1d1b20');
});

test('desktop five-family empty caret preserves native visibility and candidate blink evidence', () => {
  for (const family of ['form-field','input','autocomplete','datepicker','timepicker']) for (const dpr of [1,2]) {
  const file = `artifacts/material-parity/visible-caret-${family}-desktop-dpr${dpr}-20261006/latest-report.json`;
  const capture = JSON.parse(readFileSync(file));
  const manifest = JSON.parse(readFileSync(capture.capture.checkpointManifest.file));
  assert.deepEqual(validateSupplementalCapture(capture, { reportFile: file,
    expectedProvenance: manifest.provenance, script: 'scripts/audit-material-visible-caret.mjs',
    styleProperties: Object.values(propertyGroups).flat() }), { status: 'checkpoint-bound', errors: [] });
  assert.equal(capture.results.length, 6);
  const images = [];
  for (const row of capture.results) {
    assert.equal(row.family, family); assert.equal(row.profile, 'light');
    assert.deepEqual(row.viewport, { width: 1440, height: 900, deviceScaleFactor: dpr });
    for (const mode of ['reference', 'astylar']) {
      assert.equal(row[mode].observation.control.value, '');
      assert.equal(row[mode].observation.control.focused, true);
      assert.equal(row[mode].observation.control.type, family === 'input' ? 'email' : 'text');
      for (const image of [row[mode].screenshot, row[mode].hiddenCaretControl])
        assert.equal(hash(readFileSync(image.file)), image.sha256);
      assert.equal(row[mode].screenshot.caret, 'initial');
      assert.equal(row[mode].hiddenCaretControl.caret, 'hide');
    }
    const referenceTree = JSON.parse(readFileSync(row.reference.inputTree.file));
    const candidateTree = JSON.parse(readFileSync(row.astylar.inputTree.file));
    const id = `${family}-control`;
    const referenceInput = referenceTree.nodes.find(node => node.attributes?.id === id);
    const candidateInput = candidateTree.nodes.find(node => node.authored?.id === id);
    assert.equal(referenceTree.styles[referenceInput.style].caretColor, 'rgb(103, 80, 164)');
    for (const stage of ['resolvedStyle','normalResolvedStyle','interactionResolvedStyle']) {
      assert.equal(candidateInput[stage].caretColor, undefined);
      assert.equal(candidateInput[stage].color, '#1d1b20');
    }
    for (const selector of ['.field-control','.field-control:focus']) {
      const rule = candidateTree.rules.find(rule => rule.selector === selector);
      assert.ok(rule); assert.equal(rule.caretColor, undefined);
      assert.equal(rule.color, '#1d1b20');
    }
    const byKey = new Map(candidateTree.nodes.map(node => [node.key,node]));
    for (let node = candidateInput; node; node = byKey.get(node.parent))
      assert.equal(node.resolvedStyle?.caretColor, undefined, 'no inherited caret color in captured ancestry');
    images.push(PNG.sync.read(readFileSync(row.astylar.screenshot.file)));
  }
  assert.ok(capture.results.some(row => row.reference.nativeCaretPixelDelta.changedPixels > 0));
  let stroke = false;
  let widestColumns = [];
  for (const on of images) for (const off of images) {
  const columns = [];
  for (let x = 0; x < 24*dpr; x++) {
    let run = 0;
    let longest = 0;
    for (let y = 0; y < on.height; y++) {
      const i = (y * on.width + x) * 4;
      const foreground = on.data[i] === 29 && on.data[i+1] === 27 && on.data[i+2] === 32;
      const changed = on.data[i] !== off.data[i] || on.data[i+1] !== off.data[i+1] || on.data[i+2] !== off.data[i+2];
      run = foreground && changed ? run + 1 : 0;
      longest = Math.max(longest, run);
      if (run >= 10*dpr) stroke = true;
    }
    if (longest >= 10*dpr) columns.push({x, longest});
  }
  if (columns.length > widestColumns.length) widestColumns = columns;
  }
  assert.equal(stroke, true, 'candidate has a localized contiguous blinking caret, not just label animation');
  const nativeOn = capture.results.find(row => row.reference.nativeCaretPixelDelta.changedPixels > 0).reference.nativeCaretPixelDelta;
  assert.equal(nativeOn.bounds.maxX-nativeOn.bounds.minX+1, dpr);
  assert.deepEqual(widestColumns.map(column => column.x), Array.from({length:2*dpr},(_,i)=>15*dpr+i));
  assert.ok(widestColumns.every(column => column.longest === (dpr === 1 ? 18 : 38)));
  }
});

test('dark mobile empty inputs expose caret pixels without changing retained producers', async t => {
  const browserRoot = path.resolve('examples/material-showcase/dist/material-showcase/browser');
  const checkpoint = JSON.parse(readFileSync('artifacts/material-parity/caret-visible-checkpoint-154/checkpoint/manifest.json'));
  assert.deepEqual(fingerprintDirectory(browserRoot), checkpoint.provenance.browserFiles);
  const server = createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
    const candidate = path.resolve(browserRoot, pathname.replace(/^\/+/, ''));
    const target = candidate.startsWith(browserRoot + path.sep) && path.extname(candidate) && existsSync(candidate)
      ? candidate : path.join(browserRoot, 'index.csr.html');
    const extension = path.extname(target);
    response.writeHead(200, { 'content-type': extension === '.js' ? 'text/javascript' : extension === '.css' ? 'text/css' :
      extension === '.woff2' ? 'font/woff2' : extension === '.svg' ? 'image/svg+xml' : 'text/html', 'cache-control': 'no-store' });
    response.end(readFileSync(target));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    assert.equal(browser.version(), '154.0.8037.58');
    const observations = {};
    for (const family of ['form-field', 'input']) {
      observations[family] = {};
      for (const mode of ['reference', 'astylar']) {
        const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
        const errors = [], samples = [];
        page.on('pageerror', error => errors.push(String(error)));
        await page.goto(`http://127.0.0.1:${server.address().port}/${mode}/${family}?benchmark=1&profile=dark`);
        await page.locator('.frame').waitFor();
        if (mode === 'astylar') await page.waitForFunction(() => !!window.__ASTYLAR_MATERIAL_BENCHMARK__);
        await page.keyboard.press('Tab');
        await page.keyboard.press('Control+A');
        await page.keyboard.press('Backspace');
        for (let index = 0; index < 6; index++) {
          if (index) await page.waitForTimeout(125);
          if (mode === 'astylar') await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled());
          await page.evaluate(async () => { await document.fonts.ready;
            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); });
          const control = await page.evaluate(({ mode, family }) => {
            const id = `${family}-control`;
            const node = mode === 'reference' ? document.querySelector(`#${id}`) : document.querySelector(`[data-astylar-id="${id}"]`);
            let box = node.getBoundingClientRect().toJSON();
            if (mode === 'astylar') {
              const measured = window.__ASTYLAR_MATERIAL_BENCHMARK__.measure([id], false).elements[id].borderBox;
              const canvas = document.querySelector('canvas').getBoundingClientRect();
              box = { x: canvas.x + measured.left, y: canvas.y + measured.top, width: measured.width, height: measured.height };
            }
            return { value: node.value, focused: document.activeElement === node, type: node.type,
              selection: [node.selectionStart, node.selectionEnd], caretColor: getComputedStyle(node).caretColor, box };
          }, { mode, family });
          const { box } = control;
          const clip = { x: Math.max(0, box.x - 8), y: Math.max(0, box.y - 8),
            width: Math.min(390, box.x + box.width + 8) - Math.max(0, box.x - 8),
            height: Math.min(844, box.y + box.height + 8) - Math.max(0, box.y - 8) };
          const visible = await page.screenshot({ clip, caret: 'initial' });
          const hidden = await page.screenshot({ clip, caret: 'hide' });
          samples.push({ control, visible, delta: rasterDifference(visible, hidden) });
        }
        const pairs = samples.flatMap((sample, index) => samples.slice(index + 1).flatMap(other => [
          rasterDifference(sample.visible, other.visible), rasterDifference(other.visible, sample.visible),
        ]));
        const authoring = mode === 'reference' ? await page.evaluate(({ family }) => {
          const node = document.querySelector(`#${family}-control`);
          return { color: getComputedStyle(node).color, caretColor: getComputedStyle(node).caretColor };
        }, { family }) : await page.evaluate(family => {
          const id = `${family}-control`;
          const measurement = window.__ASTYLAR_MATERIAL_BENCHMARK__.measure([id]);
          const node = measurement.inputTree.nodes.find(node => node.authored?.id === id);
          return { color: node.resolvedStyle.color, caretColor: node.resolvedStyle.caretColor ?? null };
        }, family);
        observations[family][mode] = { controls: samples.map(sample => sample.control),
          authoring, deltas: samples.map(sample => sample.delta), blink: pairs.sort((a, b) => b.count - a.count)[0],
          // Both directions retain the caret-on palette even when the first
          // sampled image has an off-phase background at these pixels.
          blinkColors: [...new Set(pairs.flatMap(pair => pair.colors))].sort(), errors };
        await page.close();
      }
    }
    for (const family of ['form-field', 'input']) {
      for (const mode of ['reference', 'astylar']) {
        const side = observations[family][mode];
        assert.deepEqual(side.errors, []);
        assert.equal(side.controls.length, 6);
        for (const control of side.controls) {
          assert.equal(control.value, '');
          assert.equal(control.focused, true);
          assert.equal(control.type, family === 'input' ? 'email' : 'text');
          assert.deepEqual(control.selection, family === 'input' ? [null, null] : [0, 0]);
        }
      }
      const reference = observations[family].reference, candidate = observations[family].astylar;
      const nativeOn = reference.deltas.find(delta => delta.count > 0);
      assert.ok(nativeOn, 'six samples never exposed the native caret');
      assert.deepEqual(nativeOn, { count: 76, bounds: { minX: 16, minY: 22, maxX: 17, maxY: 59 }, colors: ['208,188,255'] });
      assert.deepEqual(reference.authoring, { color: 'rgb(230, 225, 229)', caretColor: 'rgb(208, 188, 255)' });
      assert.deepEqual(candidate.authoring, { color: '#1d1b20', caretColor: null });
      assert.equal(candidate.blink.count, 156);
      assert.deepEqual(candidate.blink.bounds, { minX: 14, minY: 21, maxX: 17, maxY: 59 });
      assert.ok(candidate.blinkColors.includes('29,27,32'), 'canvas caret color never appeared in sampled pixels');
      for (const key of ['x', 'y', 'width', 'height']) {
        assert.ok(Math.abs(reference.controls[0].box[key] - candidate.controls[0].box[key]) < .01, `control ${key} differs`);
      }
      t.diagnostic(JSON.stringify({ family, referenceCaret: nativeOn, candidateBlink: candidate.blink,
        candidateBlinkColors: candidate.blinkColors, referenceAuthoring: reference.authoring, candidateAuthoring: candidate.authoring }));
    }
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});

test('shipped caret geometry fixes width before projection independently of caret color', async t => {
  const source = readFileSync('examples/material-showcase/dist/material-showcase/browser/chunk-3JXWRYJY.js');
  assert.equal(hash(source), 'f366533bd9f80b7f85379db5031c0dea8c9c1840c14fb6ec35f57f1b65ad9eab');
  const ast = ts.createSourceFile('served.js', source.toString(), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  assert.equal(ast.parseDiagnostics.length, 0);
  const names = ['createTextCursor', 'updateTextCursorColor', 'projectCursorX', 'calculateCursorPosition'];
  const methods = new Map(names.map(name => [name, []]));
  const visit = node => {
    if (ts.isMethodDeclaration(node) && methods.has(node.name.getText(ast))) methods.get(node.name.getText(ast)).push(node);
    ts.forEachChild(node, visit);
  };
  visit(ast);
  for (const matches of methods.values()) assert.equal(matches.length, 1);
  const { NullEngine, Scene, MeshBuilder, StandardMaterial, Color3 } = await import('@babylonjs/core');
  // Execute the complete shipped methods with actual Babylon meshes, not copied
  // caret arithmetic. NullEngine proves pre-projection geometry, not pixels.
  const service = new Function('MeshBuilder', 'StandardMaterial', 'Color3',
    `return ({${[...methods.values()].map(matches => matches[0].getText(ast)).join(',')}});`)(MeshBuilder, StandardMaterial, Color3);
  service.CURSOR_WIDTH_SCALE = 1;
  service.styleService = { parseBackgroundColor: value => ({ type: 'color', color: Color3.FromHexString(value), alpha: 1 }) };
  const engine = new NullEngine(), scene = new Scene(engine);
  const parent = MeshBuilder.CreatePlane('equal-input-caret', { width: 228, height: 24 }, scene);
  const sizes = [], points = [];
  const projection = {
    projectCssSize: size => { sizes.push({ ...size }); return size; },
    projectCssLocalPoint: point => { points.push({ ...point }); return { ...point, z: 0 }; },
  };
  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    assert.equal(browser.version(), '154.0.8037.58');
    for (const dpr of [1, 2]) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: dpr });
      try {
        const page = await context.newPage();
        await page.setContent('<input aria-label="isolated empty input" style="position:absolute;left:20px;top:40px;width:228px;height:24px;padding:0;border:0;outline:0;background:#e8e0eb;color:#e6e1e5;caret-color:#d0bcff;font:16px/24px Arial">');
        await page.keyboard.press('Tab');
        const input = page.locator('input'), box = await input.boundingBox();
        const style = await input.evaluate(node => { const s = getComputedStyle(node); return { color: s.color, caretColor: s.caretColor, fontSize: s.fontSize, value: node.value, focused: document.activeElement === node }; });
        assert.deepEqual(style, { color: 'rgb(230, 225, 229)', caretColor: 'rgb(208, 188, 255)', fontSize: '16px', value: '', focused: true });
        let native = { count: 0 };
        for (let sample = 0; sample < 6; sample++) {
          const visible = await page.screenshot({ clip: box, caret: 'initial' });
          const hidden = await page.screenshot({ clip: box, caret: 'hide' });
          const delta = rasterDifference(visible, hidden);
          if (delta.count > native.count) native = delta;
          await page.waitForTimeout(125);
        }
        assert.ok(native.count > 0, 'native empty caret must have visible pixels');
        assert.deepEqual(native.colors, ['208,188,255']);
        assert.equal(native.bounds.maxX - native.bounds.minX + 1, dpr);
        assert.equal(native.bounds.minX, 0);
        sizes.length = 0; points.length = 0;
        const cursor = service.createTextCursor(0, { characters: [] }, parent, scene, projection,
          { fontSize: 16, color: '#e6e1e5', caretColor: '#d0bcff' }, { width: 228, height: 24 }, 0, 1, 0, -114);
        try {
          assert.deepEqual(sizes, [{ width: 2, height: 19.2 }]);
          assert.deepEqual(points, [{ x: -114, y: 0 }]);
          assert.equal(cursor.position.x, -114);
          assert.equal(cursor.material.emissiveColor.toHexString().toLowerCase(), '#d0bcff');
          const bounds = cursor.getBoundingInfo().boundingBox;
          assert.equal(bounds.minimum.x, -1);
          assert.equal(bounds.maximum.x, 1);
          t.diagnostic(JSON.stringify({ dpr, native, shippedCssWidth: sizes[0].width, shippedCenterAtInsertionEdge: cursor.position.x,
            classification: 'core-caret-geometry-policy', limitation: 'NullEngine geometry is not a full paired WebGL raster' }));
        } finally { cursor.dispose(false, true); }
      } finally { await context.close(); }
    }
  } finally { await browser?.close(); parent.dispose(false, true); scene.dispose(); engine.dispose(); }
});

test('public equal-input empty caret has paired WebGL raster evidence', async t => {
  const calibration = new PNG({width:2,height:1});
  calibration.data.set([208,188,255,255,136,136,136,255]);
  const removed = new PNG({width:2,height:1});
  removed.data.set([232,224,235,255,232,224,235,255]);
  assert.deepEqual(rasterDifference(PNG.sync.write(calibration),PNG.sync.write(removed),[208,188,255]),
    {count:1,bounds:{minX:0,minY:0,maxX:0,maxY:0},colors:['208,188,255']},
    'caret-color isolation preserves the requested foreground and rejects unrelated glyph changes');
  // Compile a public consumer in memory: no canonical fixture, Material plugin,
  // renderer replacement, retained mesh mutation or capture directory.
  const consumer = path.resolve('examples/material-showcase');
  const requireConsumer = createRequire(path.join(consumer, 'package.json'));
  const built = await requireConsumer('esbuild').build({ absWorkingDir: process.cwd(),
    stdin: { resolveDir: consumer, sourcefile: 'equal-input-caret.mjs', contents: `
      import '@angular/compiler';
      import { provideZonelessChangeDetection } from '@angular/core';
      import { createApplication } from '@angular/platform-browser';
      import { Astylar } from 'astylarui';
      const mode = new URLSearchParams(location.search).get('mode');
      const variant = new URLSearchParams(location.search).get('variant');
      const child = {type:variant.endsWith('textarea')?'textarea':'input',inputType:'text',id:'audit-empty',
        value:variant.startsWith('selection')?'Atlas':'',ariaLabel:'empty input',
        ...(variant.startsWith('placeholder')?{placeholder:'Project name'}:{})};
      const site = { root: { children: [child] },
        styles: [{selector:'#audit-empty',position:'absolute',left:'20px',top:'40px',width:'228px',height:'24px',
          boxSizing:'border-box',display:'block',margin:'0',padding:'0',paddingLeft:'8px',paddingRight:'8px',borderWidth:'0',borderRadius:'0',
          background:'#e8e0eb',color:'#e6e1e5',caretColor:'#d0bcff',
          fontFamily:'Arial',fontSize:'16px',fontWeight:'400',lineHeight:'24px',textAlign:'left'}] };
      document.body.style.cssText='margin:0;padding:0';
      const stage=document.createElement(mode==='reference'?'div':'canvas');
      stage.style.cssText='position:relative;display:block;width:390px;height:140px;margin:0;padding:0';
      document.body.append(stage);
      let application, surface;
      if(mode==='reference') {
        const css=document.createElement('style');
        css.textContent=site.styles.map(({selector,...values})=>selector+'{'+Object.entries(values)
          .map(([key,value])=>key.replace(/[A-Z]/g,c=>'-'+c.toLowerCase())+':'+value).join(';')+'}').join('');
        document.head.append(css);
        const input=document.createElement(child.type); input.id='audit-empty';
        if(child.type==='input') input.type='text';
        input.value=child.value;
        if(child.placeholder) input.placeholder=child.placeholder;
        input.setAttribute('aria-label','empty input'); stage.append(input);
      } else {
        application=await createApplication({providers:[provideZonelessChangeDetection()]});
        surface=application.injector.get(Astylar).mount(stage,site,{diagnostics:{logLevel:'silent'}});
      }
      const settle=async()=>{await document.fonts.ready; await surface?.whenSettled();
        await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));};
      await settle();
      window.caretAudit={settle,snapshot(){
        const input=mode==='reference'?document.getElementById('audit-empty'):
          document.querySelector('[data-astylar-id="audit-empty"]');
        if(!(input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement)) throw Error('Missing public control');
        const computed=mode==='reference'?getComputedStyle(input):null;
        return {site,focused:input===document.activeElement,value:input.value,selection:[input.selectionStart,input.selectionEnd],direction:input.selectionDirection,
          nativeFocusPaint:computed?{outlineStyle:computed.outlineStyle,outlineWidth:computed.outlineWidth,
            outlineColor:computed.outlineColor,borderWidth:computed.borderWidth,lineHeight:computed.lineHeight}:null,
          resolved:surface?.inspectResolvedStyles()??null,diagnostics:surface?.diagnostics??null,
          highlights:surface?.scene.meshes.filter(m=>m.metadata?.highlight?.ownerElementId==='audit-empty').map(m=>({
            visible:m.isVisible&&m.isEnabled(),color:m.material?.emissiveColor?.toHexString(),alpha:m.material?.alpha}))??[],
          cursorMeshes:surface?.scene.meshes.filter(m=>/cursor/i.test(m.name)).map(m=>({name:m.name,enabled:m.isEnabled(),visible:m.isVisible}))??[],
          coreControl:surface?.scene.meshes.filter(m=>m.metadata?.textInput).map(m=>{
            const c=m.metadata.textInput; return {value:c.value,textContent:c.textContent,cursorPosition:c.cursorPosition,
              selection:[c.selectionStart,c.selectionEnd],origin:c.visualTextLeftEdgeCss,
              cssSize:c.cssSize,scrollTop:c.scrollTop??0,
              lines:c.textLayoutMetrics?.lines.map(line=>({index:line.index,startIndex:line.startIndex,endIndex:line.endIndex,
                top:line.top,bottom:line.bottom,baseline:line.baseline}))??[]};})??[]};
      },dispose(){surface?.dispose();application?.destroy();return surface?.disposed??true;}};
    ` }, bundle: true, write: false, format: 'esm', platform: 'browser', target: 'es2022', metafile: true });
  const inputs = Object.keys(built.metafile.inputs).filter(file => path.basename(file) !== 'equal-input-caret.mjs')
    .map(file => ({ file, sha256: hash(readFileSync(file)) }));
  const packages = Object.fromEntries(['@angular/core', '@babylonjs/core', 'astylarui'].map(name =>
    [name, JSON.parse(readFileSync(path.join(consumer, 'node_modules', name, 'package.json'))).version]));
  const bundle = built.outputFiles[0].contents;
  const html = '<!doctype html><html><head><meta charset="utf-8"></head><body><script type="module" src="/audit.js"></script></body></html>';
  const server = createServer((request, response) => {
    const script = new URL(request.url, 'http://localhost').pathname === '/audit.js';
    response.setHeader('content-type', script ? 'text/javascript' : 'text/html');
    response.end(script ? bundle : html);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  const results = [], errors = [];
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    const allCases = ['plain', 'placeholder', 'placeholder-keyboard', 'textarea', 'selection-input', 'selection-textarea'];
    const cases = process.env.ASTYLAR_AUDIT_TEXT_CASE?.split(',') ?? allCases;
    assert.ok(cases.length && cases.every(value => allCases.includes(value)));
    for (const variant of cases) for (const dpr of [1, 2]) {
      const pair = {};
      for (const mode of ['reference', 'astylar']) {
        const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: dpr });
        try {
          const page = await context.newPage();
          page.on('pageerror', error => errors.push(String(error)));
          await page.goto(`http://127.0.0.1:${server.address().port}/?mode=${mode}&variant=${variant}`);
          await page.waitForFunction(() => !!window.caretAudit);
          if (variant.startsWith('selection')) {
            await page.mouse.click(50, 52);
            await page.keyboard.press('Home');
            await page.evaluate(() => window.caretAudit.settle());
            const clip = {x:20,y:40,width:228,height:24};
            const baseline = await page.screenshot({clip,caret:'hide'});
            const samples = [];
            const sample = async label => {
              await page.evaluate(() => window.caretAudit.settle());
              const state = await page.evaluate(() => window.caretAudit.snapshot());
              const pixels = await page.screenshot({clip,caret:'hide'});
              const before = PNG.sync.read(baseline), after = PNG.sync.read(pixels), palette = new Map();
              for (let i=0;i<after.data.length;i+=4) {
                if (after.data[i]===before.data[i]&&after.data[i+1]===before.data[i+1]&&after.data[i+2]===before.data[i+2]) continue;
                const color=[...after.data.subarray(i,i+3)].join(','); palette.set(color,(palette.get(color)??0)+1);
              }
              samples.push({label,value:state.value,selection:state.selection,direction:state.direction,focused:state.focused,
                core:state.coreControl,highlights:state.highlights,commonChangedColors:[...palette].sort((a,b)=>b[1]-a[1]).slice(0,6),
                nativeFocusPaint:state.nativeFocusPaint,
                whiteForegroundPixels:palette.get('255,255,255')??0,
                highlightRaster:rasterDifference(pixels,baseline,mode==='reference'?[46,97,205]:[23,63,107])});
              assert.equal(state.value,'Atlas'); assert.equal(state.focused,true);
              if(mode==='astylar') assert.deepEqual(state.diagnostics.messages,[]);
            };
            for(let i=0;i<3;i++) await page.keyboard.press('Shift+ArrowRight');
            await sample('forward');
            // Collapse first; keep the previously isolated End-on-selection
            // defect separate from this selection-paint investigation.
            await page.keyboard.press('ArrowRight'); await page.keyboard.press('End');
            await sample('collapsed');
            for(let i=0;i<3;i++) await page.keyboard.press('Shift+ArrowLeft');
            await sample('backward');
            pair[mode]={site:(await page.evaluate(()=>window.caretAudit.snapshot())).site,samples};
            t.diagnostic(JSON.stringify({variant,dpr,mode,samples}));
            assert.equal(await page.evaluate(()=>window.caretAudit.dispose()),true);
            continue;
          }
          const initial = await page.evaluate(() => window.caretAudit.snapshot());
          assert.equal(initial.focused, false); assert.equal(initial.value, '');
          // Interior crop excludes native platform focus outline. Baseline subtraction
          // leaves visible caret pixels, not a native-only screenshot caret override.
          const clip = { x: 24, y: 44, width: 220, height: 16 };
          const baseline = await page.screenshot({ clip, caret: 'initial' });
          const stageBaseline = await page.screenshot({ clip: { x: 0, y: 0, width: 390, height: 140 }, caret: 'initial' });
          if (variant === 'placeholder-keyboard') await page.keyboard.press('Tab');
          else await page.mouse.click(50, 52);
          await page.evaluate(() => window.caretAudit.settle());
          const focused = await page.evaluate(() => window.caretAudit.snapshot());
          assert.equal(focused.focused, true); assert.equal(focused.value, '');
          assert.deepEqual(focused.selection, [0, 0]);
          let paint = { count: 0 }, stageDelta = { count: 0 };
          for (let sample = 0; sample < 6; sample++) {
            const delta = rasterDifference(await page.screenshot({ clip, caret: 'initial' }), baseline,
              variant === 'plain' ? undefined : [208, 188, 255]);
            if (delta.count > paint.count) paint = delta;
            const fullDelta = rasterDifference(await page.screenshot({ clip: { x: 0, y: 0, width: 390, height: 140 }, caret: 'initial' }), stageBaseline,
              variant === 'plain' ? undefined : [208, 188, 255]);
            if (fullDelta.count > stageDelta.count) stageDelta = fullDelta;
            await page.waitForTimeout(125);
          }
          pair[mode] = { site: focused.site, paint, stageDelta, resolved: focused.resolved,
            initialCore:focused.coreControl,cursorMeshes: focused.cursorMeshes };
          if (mode === 'reference') assert.ok(paint.count > 0, 'native empty caret must paint');
          if (mode === 'astylar') {
            assert.deepEqual(focused.diagnostics.messages, [], 'minimal public input must have no unsupported declarations');
            assert.ok(stageDelta.count > 0, 'candidate caret must be located across the whole surface, not assumed absent from interior');
          }
          {
            // Same empty value reached through editing exercises the normal text
            // display path. No cursor/mesh state is set by the diagnostic.
            await page.keyboard.type('A');
            await page.evaluate(() => window.caretAudit.settle());
            const typed = await page.evaluate(() => window.caretAudit.snapshot());
            assert.equal(typed.value, 'A');
            if (mode === 'astylar') {
              assert.equal(focused.coreControl[0].cursorPosition, variant === 'placeholder' ? 3 : 0);
              assert.equal(typed.coreControl[0].cursorPosition, variant === 'placeholder' ? 4 : 1);
            }
            await page.keyboard.press('Backspace');
            await page.evaluate(() => window.caretAudit.settle());
            const edited = await page.evaluate(() => window.caretAudit.snapshot());
            t.diagnostic(JSON.stringify({ variant, dpr, mode, typed: {value:typed.value,selection:typed.selection},
              deleted: {value:edited.value,selection:edited.selection,focused:edited.focused}, typedCore:typed.coreControl,deletedCore:edited.coreControl }));
            const placeholderDeletionDefect = mode === 'astylar' && variant === 'placeholder';
            assert.equal(edited.value, placeholderDeletionDefect ? 'A' : '', `${variant}/${mode}/DPR${dpr} Backspace after settled typing`);
            assert.equal(edited.focused, true);
            assert.deepEqual(edited.selection, placeholderDeletionDefect ? [1, 1] : [0, 0]);
            pair[mode].deletion = {value:edited.value,selection:edited.selection,core:edited.coreControl,
              classification:placeholderDeletionDefect?'exposed-placeholder-deletion-defect':'empty-state-reached'};
            let editedEmpty = { count: 0 };
            for (let sample = 0; !placeholderDeletionDefect && sample < 6; sample++) {
              const delta = rasterDifference(await page.screenshot({ clip: mode === 'astylar'
                ? { x: 0, y: 0, width: 390, height: 140 } : clip, caret: 'initial' }),
                mode === 'astylar' ? stageBaseline : baseline, variant === 'plain' ? undefined : [208, 188, 255]);
              if (delta.count > editedEmpty.count) editedEmpty = delta;
              await page.waitForTimeout(125);
            }
            if (!placeholderDeletionDefect) assert.ok(editedEmpty.count > 0);
            pair[mode].editedEmpty = placeholderDeletionDefect ? null : editedEmpty;
          }
          assert.equal(await page.evaluate(() => window.caretAudit.dispose()), true);
        } finally { await context.close(); }
      }
      assert.deepEqual(pair.reference.site, pair.astylar.site);
      if (variant.startsWith('selection')) {
        for(const mode of ['reference','astylar']) {
          const samples=pair[mode].samples;
          assert.deepEqual(samples.map(s=>s.selection),[[0,3],[5,5],[2,5]]);
          assert.equal(samples[0].direction,'forward');assert.equal(samples[2].direction,'backward');
          for(const i of [0,2]) {
            assert.equal(samples[i].commonChangedColors[0][0],mode==='reference'?'46,97,205':'23,63,107');
            assert.ok(samples[i].highlightRaster.count>0,'selected background must be visible');
            assert.ok(samples[i].whiteForegroundPixels>0,'selected white foreground must be visible');
            if(mode==='astylar') assert.deepEqual(samples[i].highlights,[{visible:true,color:'#173F6B',alpha:1}]);
          }
          assert.equal(samples[1].highlightRaster.count,0,'collapse removes the observed highlight pixels');
        }
        assert.deepEqual(pair.astylar.samples[1].highlights,[],'collapse releases candidate highlight owners');
        results.push({variant,dpr,selections:{reference:pair.reference.samples,astylar:pair.astylar.samples},
          classification:'equal-authored-input; selection-state-agrees; documented-contrast-palette-differs; highlight-bounds-confounded-by-native-outline-and-clipping'});
        continue;
      }
      assert.equal(pair.reference.paint.bounds.maxX - pair.reference.paint.bounds.minX + 1, dpr);
      assert.deepEqual(pair.reference.paint.colors, ['208,188,255']);
      assert.deepEqual(pair.reference.editedEmpty, pair.reference.paint, 'native insertion stays at the same padded origin after equal editing');
      const center = paint => (paint.bounds.minX + paint.bounds.maxX + 1) / (2 * dpr);
      if (variant === 'plain') {
        assert.equal(pair.astylar.paint.count, 0, 'record the initial caret outside the padded interior, not parity');
        assert.equal(center(pair.astylar.stageDelta), 21.5, 'initial empty caret takes the core insertion-edge fallback');
        assert.equal(center(pair.astylar.editedEmpty), 28, 'editing establishes the authored padded insertion edge');
      } else if (variant === 'textarea') {
        assert.equal(center(pair.astylar.stageDelta), 21.5, 'textarea shares initial insertion-edge fallback');
        assert.equal(center(pair.astylar.editedEmpty), 28, 'textarea editing initializes the padded origin');
        const initial = pair.astylar.initialCore[0], edited = pair.astylar.deletion.core[0];
        assert.deepEqual(initial.lines, edited.lines, 'editing did not change the empty CSS line metrics');
        assert.deepEqual(initial.lines, [{index:0,startIndex:0,endIndex:0,top:16,bottom:16,baseline:16}]);
        assert.deepEqual(initial.cssSize, {width:228,height:24});
        assert.equal(initial.scrollTop, 0); assert.equal(edited.scrollTop, 0);
        const updateCssY = -edited.cssSize.height / 2 + (edited.lines[0].top + edited.lines[0].bottom) / 2 - edited.scrollTop;
        assert.equal(updateCssY, 4, 'core update treats empty glyph bounds as the line center, unlike initial creation');
        assert.equal((pair.astylar.editedEmpty.bounds.minY - pair.astylar.stageDelta.bounds.minY) / dpr, 4,
          'CSS update placement matches the observed four-pixel shift, independently of DPR');
      } else {
        assert.equal(center(pair.astylar.stageDelta), 28, 'placeholder paint initializes the padded origin');
        if (variant === 'placeholder-keyboard') assert.deepEqual(pair.astylar.editedEmpty, pair.astylar.stageDelta);
      }
      t.diagnostic(JSON.stringify({ variant, dpr, reference: pair.reference.paint, astylar: pair.astylar.stageDelta, editedEmpty: pair.astylar.editedEmpty }));
      results.push({ variant, dpr, reference: pair.reference.paint, astylar: pair.astylar.paint,
        referenceEditedEmpty: pair.reference.editedEmpty, stageDelta: pair.astylar.stageDelta,
        editedEmpty: pair.astylar.editedEmpty, deletion:pair.astylar.deletion,cursorMeshes: pair.astylar.cursorMeshes,
        initialCore:pair.astylar.initialCore,
        effective: pair.astylar.resolved.elements.find(e => e.id === 'audit-empty').effective });
    }
    assert.deepEqual(errors, []);
    for (const input of inputs) assert.equal(hash(readFileSync(input.file)), input.sha256, input.file);
    const coreSources = inputs.filter(input => /(?:text-input\.manager|text-selection\.service)\.js$/.test(input.file));
    assert.equal(coreSources.length, 2);
    t.diagnostic(JSON.stringify({ browser: browser.version(), packages, bundleSha256: hash(bundle),
      dependencyCount: inputs.length, dependencyReceiptSha256: hash(JSON.stringify(inputs)), coreSources, results,
      cases, focused:!!process.env.ASTYLAR_AUDIT_TEXT_CASE,
      classification: 'core-caret-initialization-and-placeholder-pointer-defects; equal-input-selection-palette-documented-difference',
      limitation: 'installed packed public consumer, not frozen Material bundle; selection background bounds can be occluded by native focus outline or crop; native-only caret hide is not caret parity evidence; all Material states and full selection raster remain unproven' }));
  } finally {
    await browser?.close();
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});

test('public equal-input overflow isolates scrollbar gutter before projection', async t => {
  const installedPath = 'examples/material-showcase/node_modules/astylarui/dist/lib/lib/astylar-scroll-runtime.js';
  const installed = readFileSync(installedPath, 'utf8');
  const compiled = ts.transpileModule(readFileSync('src/lib/astylar-scroll-runtime.ts', 'utf8'),
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const method = source => {
    const start = source.indexOf('    createContainer('), end = source.indexOf('    findDirectChildMesh(', start);
    assert.ok(start > 0 && end > start);
    return source.slice(start, end).replace(/\s+/g, ' ').trim();
  };
  assert.equal(method(installed), method(compiled), 'installed client-area calculation matches current source');
  const paintAdapterPath = path.join('examples/material-showcase/node_modules/astylarui/dist/lib/app/services', 'babylon-scroll-paint-adapter.js');
  const installedPaintAdapter = readFileSync(paintAdapterPath, 'utf8');
  const compiledPaintAdapter = ts.transpileModule(readFileSync('src/app/services/babylon-scroll-paint-adapter.ts', 'utf8'),
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const scrollbarCreation = source => {
    const start = source.indexOf('    createScrollbar('), end = source.indexOf('    positionScrollbarThumb(', start);
    assert.ok(start > 0 && end > start);
    return source.slice(start, end).replace(/\s+/g, ' ').trim();
  };
  assert.equal(scrollbarCreation(installedPaintAdapter), scrollbarCreation(compiledPaintAdapter));
  const consumer = path.resolve('examples/material-showcase');
  const built = await createRequire(path.join(consumer, 'package.json'))('esbuild').build({
    stdin: { resolveDir: consumer, sourcefile: 'equal-input-scroll-gutter.mjs', contents: `
      import '@angular/compiler';
      import {provideZonelessChangeDetection} from '@angular/core';
      import {createApplication} from '@angular/platform-browser';
      import {Astylar} from 'astylarui';
      const query=new URLSearchParams(location.search), mode=query.get('mode'), overflow=query.get('overflow');
      const site={root:{children:[{type:'div',id:'box',children:[{type:'div',id:'content'}]}]},styles:[
        {selector:'#box',display:'block',position:'absolute',left:'20px',top:'20px',width:'260px',height:'128px',
          boxSizing:'border-box',padding:'0',margin:'0',borderWidth:'0',background:'#eeeeee',overflow},
        {selector:'#content',display:'block',width:'100%',height:'400px',boxSizing:'border-box',padding:'0',margin:'0',borderWidth:'0',background:'#8844aa'}]};
      document.body.style.cssText='margin:0;padding:0';
      const host=document.createElement(mode==='reference'?'div':'canvas');
      host.style.cssText='position:relative;display:block;width:320px;height:200px;margin:0;padding:0';document.body.append(host);
      let app,surface;
      if(mode==='reference'){
        const css=document.createElement('style');css.textContent=site.styles.map(({selector,...values})=>selector+'{'+
          Object.entries(values).map(([key,value])=>key.replace(/[A-Z]/g,c=>'-'+c.toLowerCase())+':'+value).join(';')+'}').join('');document.head.append(css);
        const box=document.createElement('div'),content=document.createElement('div');box.id='box';content.id='content';box.append(content);host.append(box);
      }else{app=await createApplication({providers:[provideZonelessChangeDetection()]});surface=app.injector.get(Astylar).mount(host,site,{diagnostics:{logLevel:'silent'}});}
      const settle=async()=>{await surface?.whenSettled();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));};
      await settle();window.gutterAudit={settle,snapshot(){const box=document.getElementById('box');
        return {site,scroll:surface?surface.diagnostics.scrolling.containers.box:{clientWidth:box.clientWidth,clientHeight:box.clientHeight,scrollTop:box.scrollTop,scrollHeight:box.scrollHeight},
          native:mode==='reference'?{width:box.getBoundingClientRect().width,childWidth:document.getElementById('content').getBoundingClientRect().width,overflow:getComputedStyle(box).overflow}:null,
          resolved:surface?.inspectResolvedStyles()??null,errors:surface?.diagnostics.messages.filter(m=>m.severity==='error')??[]};},
        dispose(){surface?.dispose();app?.destroy();return surface?.disposed??true;}};
    ` }, bundle:true,write:false,format:'esm',platform:'browser',target:'es2022',metafile:true });
  const inputs = Object.keys(built.metafile.inputs).filter(file => !file.endsWith('equal-input-scroll-gutter.mjs'))
    .map(file => ({file,sha256:hash(readFileSync(file))}));
  const packages=Object.fromEntries(['@angular/core','@babylonjs/core','astylarui'].map(name=>
    [name,JSON.parse(readFileSync(path.join(consumer,'node_modules',name,'package.json'))).version]));
  assert.ok(inputs.some(input => input.file.includes('node_modules/astylarui/')));
  assert.ok(!inputs.some(input => /^src[\\/]/.test(input.file)), 'public root package only');
  const server=createServer((req,res)=>{const script=req.url.startsWith('/audit.js');
    res.setHeader('content-type',script?'text/javascript':'text/html');
    res.end(script?built.outputFiles[0].contents:'<!doctype html><script type="module" src="/audit.js"></script>');});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const {materialBrowserLaunchOptions,inspectMaterialBrowserLaunch}=await import('./run-checkpoint.mjs');
  let browser;const results=[];
  try{
    const launch=materialBrowserLaunchOptions();browser=await chromium.launch(launch);
    const launchEvidence=await inspectMaterialBrowserLaunch(browser,launch);
    for(const overflow of ['hidden','auto','scroll'])for(const dpr of [1,2]){
      const pair={};
      for(const mode of ['reference','astylar']){
        const page=await browser.newPage({viewport:{width:320,height:200},deviceScaleFactor:dpr});
        const errors=[];page.on('pageerror',error=>errors.push(String(error)));
        try{
          await page.goto('http://127.0.0.1:'+server.address().port+'/?mode='+mode+'&overflow='+overflow);
          await page.waitForFunction(()=>!!window.gutterAudit);await page.evaluate(()=>window.gutterAudit.settle());
          pair[mode]=await page.evaluate(()=>window.gutterAudit.snapshot());
          if (overflow !== 'hidden') {
            // Identical CSS outer box; use its below-thumb right-edge track.
            await page.mouse.move(274, 115);
            await page.mouse.down();
            await page.waitForTimeout(100);
            await page.evaluate(()=>window.gutterAudit.settle());
            pair[mode].trackHeld=await page.evaluate(()=>window.gutterAudit.snapshot().scroll);
            await page.mouse.up();
          }
          assert.deepEqual(errors,[]);assert.deepEqual(pair[mode].errors,[]);
          assert.equal(await page.evaluate(()=>window.gutterAudit.dispose()),true);
        }finally{await page.close();}
      }
      assert.deepEqual(pair.reference.site,pair.astylar.site);
      const effective=pair.astylar.resolved.elements.find(e=>e.id==='box').effective;
      assert.equal(effective.overflow,overflow);assert.equal(effective.width,'260px');assert.equal(effective.height,'128px');
      assert.equal(pair.reference.native.width,260);assert.equal(pair.reference.native.overflow,overflow);
      assert.equal(pair.reference.scroll.clientWidth,overflow==='hidden'?260:245);
      assert.equal(pair.reference.native.childWidth,pair.reference.scroll.clientWidth);
      assert.equal(pair.reference.scroll.clientHeight,overflow==='scroll'?113:128);
      if(overflow==='hidden'){
        assert.equal(pair.astylar.scroll,undefined,'clipping-only box has no public scroll-container state');
      }else{
        assert.equal(pair.astylar.scroll.clientWidth,260);
        assert.equal(pair.astylar.scroll.clientHeight,128);
        assert.ok(pair.reference.trackHeld.scrollTop > 0, 'public native track press scrolls');
        assert.equal(pair.astylar.trackHeld.scrollTop,0, 'public candidate track press does not scroll');
      }
      results.push({overflow,dpr,native:pair.reference.scroll,candidate:pair.astylar.scroll,
        trackHeld:overflow==='hidden'?null:{native:pair.reference.trackHeld.scrollTop,candidate:pair.astylar.trackHeld.scrollTop},
        candidateScrollContainerPresent:pair.astylar.scroll!==undefined});
    }
    for(const input of inputs)assert.equal(hash(readFileSync(input.file)),input.sha256);
    t.diagnostic(JSON.stringify({browser:browser.version(),packages,launchEvidence,results,
      installedScrollRuntimeSha256:hash(installed),bundleSha256:hash(built.outputFiles[0].contents),
      installedScrollPaintAdapterSha256:hash(installedPaintAdapter),
      dependencyReceiptSha256:hash(JSON.stringify(inputs)),dependencyCount:inputs.length,
      classification:'equal-input core scrollbar client-area divergence',acceptance:false,
      limitation:'geometry diagnostic only; scrollbar raster, wheel and cross-platform gutter metrics are not accepted by this proof'}));
  }finally{await browser?.close();await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));}
});

test('public equal-input text separates fractional origins from texture raster phase', async t => {
  const consumer = path.resolve('examples/material-showcase');
  const font = readFileSync(path.join(consumer, 'node_modules/@fontsource/roboto/files/roboto-latin-400-normal.woff2'));
  const canvasPath = path.join(consumer, 'node_modules/astylarui/dist/lib/app/services/text/text-canvas-renderer.service.js');
  const installed = readFileSync(canvasPath, 'utf8');
  const compiled = ts.transpileModule(readFileSync('src/app/services/text/text-canvas-renderer.service.ts', 'utf8'),
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const paintMethods = source => source.slice(source.indexOf('    createStyledCanvas('), source.indexOf('    calculateLayoutMetrics(')).replace(/\s+/g, ' ').trim();
  assert.ok(paintMethods(installed).length > 1000);
  assert.equal(paintMethods(installed), paintMethods(compiled));
  const baselineMethod = source => source.slice(source.indexOf('    calculateCssLineBoxAlphabeticBaseline('),
    source.indexOf('    applyTextTransform(')).replace(/\s+/g, ' ').trim();
  assert.ok(baselineMethod(installed).length > 300);
  assert.equal(baselineMethod(installed), baselineMethod(compiled));
  const built = await createRequire(path.join(consumer, 'package.json'))('esbuild').build({
    stdin: { resolveDir: consumer, sourcefile: 'equal-input-text-phase.mjs', contents: `
      import '@angular/compiler';
      import {provideZonelessChangeDetection} from '@angular/core';
      import {createApplication} from '@angular/platform-browser';
      import {Astylar} from 'astylarui';
      const mode=new URLSearchParams(location.search).get('mode');
      const loaded=new FontFace('AuditRoboto','url(/font.woff2)',{weight:'400'});await loaded.load();document.fonts.add(loaded);
      const origins=[80,80.25,80.5,80.75];
      const site={root:{children:origins.map((left,i)=>({type:'div',id:'text-'+i,textContent:'Create a project'}))},
        styles:origins.map((left,i)=>({selector:'#text-'+i,display:'block',position:'absolute',left:left+'px',top:(20+i*32)+'px',
          width:'120px',height:'24px',boxSizing:'border-box',padding:'4px 8px',margin:'0',borderWidth:'0',
          fontFamily:'AuditRoboto',fontSize:'12px',fontWeight:'400',fontStyle:'normal',lineHeight:'16px',letterSpacing:'.4px',
          textAlign:'left',whiteSpace:'nowrap',color:'#f5eff4',background:'#323033'}))};
      document.body.style.cssText='margin:0;padding:0';
      const host=document.createElement(mode==='reference'?'div':'canvas');
      host.style.cssText='position:relative;display:block;width:320px;height:180px;margin:0;padding:0';document.body.append(host);
      let app,surface;
      if(mode==='reference'){
        const css=document.createElement('style');css.textContent=site.styles.map(({selector,...values})=>selector+'{'+
          Object.entries(values).map(([key,value])=>key.replace(/[A-Z]/g,c=>'-'+c.toLowerCase())+':'+value).join(';')+'}').join('');document.head.append(css);
        for(const element of site.root.children){const node=document.createElement('div');node.id=element.id;node.textContent=element.textContent;host.append(node);}
      }else{app=await createApplication({providers:[provideZonelessChangeDetection()]});surface=app.injector.get(Astylar).mount(host,site,{diagnostics:{logLevel:'silent'}});}
      const settle=async()=>{await surface?.whenSettled();await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));};
      await settle();window.textPhaseAudit={settle,snapshot(){return {site,resolved:surface?.inspectResolvedStyles()??null,
        errors:surface?.diagnostics.messages.filter(m=>m.severity==='error')??[],rows:origins.map((left,i)=>{
          const id='text-'+i;
          // A hidden diagnostic DOM copy measures the alphabetic baseline;
          // neither the visible reference nor the Astylar document is changed.
          const probe=document.createElement('div');
          for(const [key,value] of Object.entries(site.styles[i]))if(key!=='selector')probe.style[key]=value;
          probe.style.visibility='hidden';probe.textContent='Create a project';
          const marker=document.createElement('span');marker.style.cssText='display:inline-block;width:0;height:0;padding:0;margin:0;border:0;vertical-align:baseline';
          probe.append(marker);document.body.append(probe);
          const nativeBaseline=marker.getBoundingClientRect().top,probeRange=document.createRange();probeRange.selectNodeContents(probe.firstChild);
          const diagnosticRange=probeRange.getBoundingClientRect().toJSON();probe.remove();
          const directCanvas=document.createElement('canvas');directCanvas.width=320*devicePixelRatio;directCanvas.height=180*devicePixelRatio;
          const direct=directCanvas.getContext('2d');direct.scale(devicePixelRatio,devicePixelRatio);
          direct.font='normal 400 12px AuditRoboto';direct.letterSpacing='.4px';direct.fillStyle='#f5eff4';
          const metrics=direct.measureText('Mg');
          direct.fillText('Create a project',left+8,nativeBaseline);
          const directPixels=direct.getImageData(0,0,directCanvas.width,directCanvas.height).data;
          let directMinX=Infinity,directMaxX=-Infinity,directMinY=Infinity,directMaxY=-Infinity,directCount=0;
          for(let y=0;y<directCanvas.height;y++)for(let x=0;x<directCanvas.width;x++)if(directPixels[(y*directCanvas.width+x)*4+3]===255){
            directCount++;directMinX=Math.min(directMinX,x);directMaxX=Math.max(directMaxX,x);directMinY=Math.min(directMinY,y);directMaxY=Math.max(directMaxY,y);}
          const solidCanvas=document.createElement('canvas');solidCanvas.width=directCanvas.width;solidCanvas.height=directCanvas.height;
          const solid=solidCanvas.getContext('2d',{alpha:false});solid.fillStyle='#323033';solid.fillRect(0,0,solidCanvas.width,solidCanvas.height);
          solid.scale(devicePixelRatio,devicePixelRatio);solid.font=direct.font;solid.letterSpacing=direct.letterSpacing;solid.fillStyle='#f5eff4';
          solid.fillText('Create a project',left+8,nativeBaseline);
          const solidPixels=solid.getImageData(0,0,solidCanvas.width,solidCanvas.height).data;
          let solidCount=0,solidMinX=Infinity,solidMaxX=-Infinity;
          for(let y=0;y<solidCanvas.height;y++)for(let x=0;x<solidCanvas.width;x++){
            const p=(y*solidCanvas.width+x)*4;
            if(solidPixels[p]===245&&solidPixels[p+1]===239&&solidPixels[p+2]===244){solidCount++;solidMinX=Math.min(solidMinX,x);solidMaxX=Math.max(solidMaxX,x);}}
          const crop={left:Math.ceil((left+8)*devicePixelRatio),top:(24+i*32)*devicePixelRatio,
            width:Math.floor((left+112)*devicePixelRatio)-Math.ceil((left+8)*devicePixelRatio),height:16*devicePixelRatio};
          const cropBytes=solid.getImageData(crop.left,crop.top,crop.width,crop.height).data;
          const directEvidence={nativeBaseline,diagnosticRange,fontAscent:metrics.fontBoundingBoxAscent,fontDescent:metrics.fontBoundingBoxDescent,
            opaque:{minX:directCount?directMinX:null,maxX:directCount?directMaxX:null,minY:directCount?directMinY:null,maxY:directCount?directMaxY:null,count:directCount},
            solidBacking:{minX:solidCount?solidMinX:null,maxX:solidCount?solidMaxX:null,count:solidCount,crop:{...crop,rgba:Array.from(cropBytes)}}};
          if(mode==='reference'){const node=document.getElementById(id),range=document.createRange();range.selectNodeContents(node);
            return {id,left,directEvidence,box:node.getBoundingClientRect().toJSON(),textRange:range.getBoundingClientRect().toJSON(),
              style:Object.fromEntries(['fontFamily','fontSize','fontWeight','lineHeight','letterSpacing','textAlign'].map(k=>[k,getComputedStyle(node)[k]]))};}
          const scene=surface.scene,engine=scene.getEngine(),camera=scene.activeCamera;
          const mesh=scene.meshes.find(m=>m.metadata?.isTextMesh&&m.metadata?.elementId===id),texture=mesh.material.diffuseTexture;
          const viewport=camera.viewport.toGlobal(engine.getRenderWidth(),engine.getRenderHeight());
          const points=mesh.getBoundingInfo().boundingBox.vectorsWorld.map(p=>p.constructor.Project(p,scene.getTransformMatrix().constructor.Identity(),scene.getTransformMatrix(),viewport));
          const size=texture.getSize(),pixels=texture.getContext().getImageData(0,0,size.width,size.height).data;
          let directGlobalAlphaDifferentPixels=0;
          const globalLeft=Math.floor((left+8)*devicePixelRatio),globalTop=(24+i*32)*devicePixelRatio;
          for(let y=0;y<size.height;y++)for(let x=0;x<size.width;x++){
            if(pixels[(y*size.width+x)*4+3]!==directPixels[((globalTop+y)*directCanvas.width+globalLeft+x)*4+3])directGlobalAlphaDifferentPixels++;}
          let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity,count=0,inkMinX=Infinity,inkMaxX=-Infinity,inkCount=0;
          for(let y=0;y<size.height;y++)for(let x=0;x<size.width;x++){
            const alpha=pixels[(y*size.width+x)*4+3];
            if(alpha===255){count++;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}
            if(alpha>=128){inkCount++;inkMinX=Math.min(inkMinX,x);inkMaxX=Math.max(inkMaxX,x);}
          }
          return {id,left,directEvidence,directGlobalAlphaDifferentPixels,texture:{size,logicalSize:texture.metadata.astylarLogicalTextSize,samplingMode:texture.samplingMode,
            opaque:{minX:count?minX:null,maxX:count?maxX:null,minY:count?minY:null,maxY:count?maxY:null,count},ink:{minX:inkMinX,maxX:inkMaxX,count:inkCount}},
            projected:{left:Math.min(...points.map(p=>p.x)),right:Math.max(...points.map(p=>p.x)),top:Math.min(...points.map(p=>p.y))}};
        })};},dispose(){surface?.dispose();app?.destroy();return surface?.disposed??true;}};
    ` }, bundle: true, write: false, format: 'esm', platform: 'browser', target: 'es2022', metafile: true });
  const inputs = Object.keys(built.metafile.inputs).filter(file => !file.endsWith('equal-input-text-phase.mjs'))
    .map(file => ({ file, sha256: hash(readFileSync(file)) }));
  const packages = Object.fromEntries(['@angular/core', '@babylonjs/core', 'astylarui'].map(name =>
    [name, JSON.parse(readFileSync(path.join(consumer, 'node_modules', name, 'package.json'))).version]));
  assert.ok(inputs.some(input => input.file.includes('node_modules/astylarui/')));
  assert.ok(!inputs.some(input => /^src[\\/]/.test(input.file)));
  const server = createServer((req, res) => {
    const script = req.url.startsWith('/audit.js'), isFont = req.url.startsWith('/font.woff2');
    res.setHeader('content-type', script ? 'text/javascript' : isFont ? 'font/woff2' : 'text/html');
    res.end(script ? built.outputFiles[0].contents : isFont ? font : '<!doctype html><script type="module" src="/audit.js"></script>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser; const results = [];
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    for (const dpr of [1, 2]) {
      const pair = {};
      for (const mode of ['reference', 'astylar']) {
        const page = await browser.newPage({ viewport: { width: 320, height: 180 }, deviceScaleFactor: dpr });
        const errors = []; page.on('pageerror', error => errors.push(String(error)));
        try {
          await page.goto('http://127.0.0.1:' + server.address().port + '/?mode=' + mode);
          await page.waitForFunction(() => !!window.textPhaseAudit); await page.evaluate(() => window.textPhaseAudit.settle());
          pair[mode] = await page.evaluate(() => window.textPhaseAudit.snapshot());
          const image = PNG.sync.read(await page.screenshot({ caret: 'hide' }));
          for (const [i, row] of pair[mode].rows.entries()) {
            const solidCrop = row.directEvidence.solidBacking.crop;
            let differingPixels = 0;
            for (let y = 0; y < solidCrop.height; y++) for (let x = 0; x < solidCrop.width; x++) {
              const full = ((solidCrop.top + y) * image.width + solidCrop.left + x) * 4;
              const local = (y * solidCrop.width + x) * 4;
              if ([0, 1, 2, 3].some(channel => image.data[full + channel] !== solidCrop.rgba[local + channel])) differingPixels++;
            }
            solidCrop.sha256 = hash(Buffer.from(solidCrop.rgba)); delete solidCrop.rgba;
            solidCrop.fullFrameDifferingPixels = differingPixels;
            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, count = 0, inkMinX = Infinity, inkMaxX = -Infinity, inkCount = 0;
            for (let y = (20 + i * 32) * dpr; y < (44 + i * 32) * dpr; y++) for (let x = 70 * dpr; x < 210 * dpr; x++) {
              const p = (y * image.width + x) * 4;
              if (image.data[p] === 245 && image.data[p + 1] === 239 && image.data[p + 2] === 244) {
                count++; minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
              }
              if (x >= Math.ceil((row.left + 8) * dpr) && x < Math.floor((row.left + 112) * dpr) &&
                  image.data[p] >= 148 && image.data[p + 1] >= 144 && image.data[p + 2] >= 148) {
                inkCount++; inkMinX = Math.min(inkMinX, x); inkMaxX = Math.max(inkMaxX, x);
              }
            }
            assert.ok(inkCount > 0, JSON.stringify({mode,dpr,row,errors,diagnostics:pair[mode].errors}));
            row.fullFrameOpaque = { minX: count ? minX : null, maxX: count ? maxX : null, minY: count ? minY : null, maxY: count ? maxY : null, count };
            row.fullFrameInk = { minX: inkMinX, maxX: inkMaxX, count: inkCount };
          }
          assert.deepEqual(errors, []); assert.deepEqual(pair[mode].errors, []);
          assert.equal(await page.evaluate(() => window.textPhaseAudit.dispose()), true);
        } finally { await page.close(); }
      }
      assert.deepEqual(pair.reference.site, pair.astylar.site);
      results.push({ dpr, reference: pair.reference.rows, candidate: pair.astylar.rows });
      assert.deepEqual(pair.reference.rows.map(row => row.box.x), [80, 80.25, 80.5, 80.75]);
      assert.deepEqual(pair.reference.rows.map(row => row.textRange.x), [88, 88.25, 88.5, 88.75]);
      for (let i = 0; i < 4; i++) {
        const reference = pair.reference.rows[i], candidate = pair.astylar.rows[i];
        assert.deepEqual(reference.directEvidence.diagnosticRange, reference.textRange);
        assert.equal(reference.directEvidence.nativeBaseline, 36 + i * 32);
        assert.ok(Math.abs(candidate.projected.top - (24 + i * 32) * dpr) < .001);
        assert.equal(reference.directEvidence.solidBacking.crop.fullFrameDifferingPixels, 0,
          'opaque canvas at the measured native baseline exactly reproduces the native text content crop');
        assert.ok(candidate.directEvidence.solidBacking.crop.fullFrameDifferingPixels > 0);
        assert.equal(candidate.directEvidence.solidBacking.crop.sha256, reference.directEvidence.solidBacking.crop.sha256);
      }
      for (const row of pair.astylar.rows) {
        const effective = pair.astylar.resolved.elements.find(e => e.id === row.id).effective;
        assert.equal(effective.fontFamily, 'AuditRoboto'); assert.equal(effective.fontSize, '12px');
        assert.equal(effective.fontWeight, '400'); assert.equal(effective.lineHeight, '16px');
        assert.equal(effective.letterSpacing, '.4px'); assert.equal(effective.textAlign, 'left');
        assert.equal(effective.left, row.left + 'px');
        assert.ok(Math.abs(row.projected.left - (row.left + 8) * dpr) < .001);
        assert.equal(row.texture.samplingMode, 1);
      }
      // Record known unequal output rather than turning this diagnostic into an
      // acceptance pass. Raw local raster is unchanged across fractional origins.
      assert.equal(browser.version(), '154.0.8037.58');
      assert.deepEqual(pair.astylar.rows.map(row => row.texture), Array(4).fill(pair.astylar.rows[0].texture));
      assert.deepEqual(pair.astylar.rows.map(row => row.directGlobalAlphaDifferentPixels),
        dpr === 1 ? [0, 497, 507, 548] : [0, 1364, 0, 1364]);
      assert.deepEqual(pair.astylar.rows.map(row => row.fullFrameOpaque.count), Array(4).fill(dpr === 1 ? 0 : 249));
      assert.deepEqual(pair.reference.rows.map(row => row.fullFrameOpaque.count), dpr === 1 ? [7, 9, 9, 11] : [335, 346, 335, 346]);
      if (dpr === 2) {
        assert.deepEqual(pair.reference.rows.map(row => row.fullFrameOpaque.minX), [178, 179, 179, 180]);
        assert.deepEqual(pair.astylar.rows.map(row => row.fullFrameOpaque.minX), [178, 178, 179, 179]);
      }
    }
    for (const input of inputs) assert.equal(hash(readFileSync(input.file)), input.sha256);
    t.diagnostic(JSON.stringify({ browser: browser.version(), packages, results, fontSha256: hash(font),
      installedCanvasPaintSha256: hash(installed), bundleSha256: hash(built.outputFiles[0].contents),
      dependencyCount: inputs.length, dependencyReceiptSha256: hash(JSON.stringify(inputs)), acceptance: false,
      classification: 'equal-input core text paint difference with unchanged local texture across fractional origins',
      limitation: 'opaque canvas exactly matches eight native content crops; renderer still differs, with backing and phase effects separate; not general sharpness or full audit acceptance' }));
  } finally { await browser?.close(); await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
});

function rasterDifference(firstBytes, secondBytes, exactForeground) {
  const first = PNG.sync.read(firstBytes), second = PNG.sync.read(secondBytes);
  assert.equal(first.width, second.width);
  assert.equal(first.height, second.height);
  let count = 0, minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const colors = new Set();
  for (let y = 0; y < first.height; y++) for (let x = 0; x < first.width; x++) {
    const i = (y * first.width + x) * 4;
    // Opt-in caret-color isolation excludes removed placeholder glyphs and the
    // native focus outline. Other evidence retains the original full delta.
    if (exactForeground && exactForeground.some((value, channel) => first.data[i + channel] !== value)) continue;
    if (first.data[i] === second.data[i] && first.data[i + 1] === second.data[i + 1] &&
        first.data[i + 2] === second.data[i + 2]) continue;
    count++; minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    colors.add([first.data[i], first.data[i + 1], first.data[i + 2]].join(','));
  }
  return { count, bounds: count ? { minX, minY, maxX, maxY } : null, colors: [...colors].sort() };
}

test('retained input boundaries authenticate all runtime assets, trees, actions and local rasters', () => {
  const manifest = JSON.parse(readFileSync(report.capture.checkpointManifest.file));
  assert.deepEqual(validateSupplementalCapture(report, { reportFile: file,
    expectedProvenance: manifest.provenance, script: 'scripts/audit-material-input-boundaries.mjs',
    styleProperties: Object.values(propertyGroups).flat() }), { status: 'checkpoint-bound', errors: [] });
  const expected = ['initial', 'keyboard-focus', 'pointer-focus', 'focused-empty-0', 'focused-empty-1',
    'focused-empty-2', 'focused-empty-3', 'typed', 'selection-forward', 'selection-backward', 'blur'];
  assert.equal(report.results.length, 110);
  for (const family of ['form-field', 'input', 'autocomplete', 'datepicker', 'timepicker']) for (const dpr of [1, 2]) {
    const rows = report.results.filter(r => r.family === family && r.viewport.deviceScaleFactor === dpr);
    assert.deepEqual(rows.map(r => r.state), expected);
    for (const row of rows) {
      assert.equal(row.profile, 'light');
      assert.deepEqual(row.viewport, { width: 1440, height: 900, deviceScaleFactor: dpr });
      for (const side of ['reference', 'astylar']) {
        const sample = row[side];
        assert.equal(hash(readFileSync(sample.screenshot.file)), sample.screenshot.sha256);
        assert.ok(sample.screenshot.clip.width > 0 && sample.screenshot.clip.height > 0);
        assert.ok(sample.observation.events.every(e => e.trusted));
        if (row.state.startsWith('focused-empty')) {
          assert.equal(sample.observation.control.value, '');
          assert.equal(sample.observation.control.focused, true);
        }
      }
      if (row.state === 'typed') assert.equal(row.reference.observation.control.value, row.astylar.observation.control.value);
    }
  }
  assert.equal(report.inputEquivalent, false);
  assert.equal(report.renderingEquivalent, false);
});

test('historical keyboard evidence retains selection mismatch and native email observability limits', () => {
  for (const dpr of [1, 2]) {
    const get = (family, state) => report.results.find(r => r.family === family && r.state === state && r.viewport.deviceScaleFactor === dpr);
    for (const family of ['form-field', 'autocomplete', 'datepicker']) {
      const forward = get(family, 'selection-forward'), backward = get(family, 'selection-backward');
      const pair = c => [c.selectionStart, c.selectionEnd];
      assert.deepEqual(pair(forward.reference.observation.control), [0, 3]);
      assert.deepEqual(pair(forward.astylar.observation.control), [0, 3]);
      const native = backward.reference.observation.control;
      assert.deepEqual(pair(native), [native.value.length - 3, native.value.length]);
      assert.deepEqual(pair(backward.astylar.observation.control), [0, 3]);
      assert.equal(backward.astylar.observation.control.cursorPosition, 0);
      for (const side of ['reference', 'astylar']) assert.ok(backward[side].observation.events.some(e => e.type === 'keydown' && e.key === 'End'));
    }
    const tab = get('form-field', 'keyboard-focus');
    assert.deepEqual([tab.reference.observation.control.selectionStart, tab.reference.observation.control.selectionEnd], [0, 5]);
    assert.deepEqual([tab.astylar.observation.control.selectionStart, tab.astylar.observation.control.selectionEnd], [0, 0]);
    for (const state of ['selection-forward', 'selection-backward']) {
      const native = get('input', state).reference.observation.control;
      assert.equal(native.type, 'email');
      assert.equal(native.selectionStart, null); assert.equal(native.selectionEnd, null);
      assert.equal(native.selectionDirection, null);
    }
  }
});

test('public button pointer states diagnose materials outside render ownership', async t => {
  const consumer = path.resolve('examples/material-showcase');
  const methods = [['src/lib/astylar.ts','lib/astylar.js','applyElementPseudoState'],
    ['src/lib/astylar.ts','lib/astylar.js','setButtonLabelPseudoMaterial'],
    ['src/lib/astylar-scene-resources.ts','lib/astylar-scene-resources.js','replace'],
    ['src/app/services/dom/elements/element-interaction.service.ts','app/services/dom/elements/element-interaction.service.js','setupMouseEvents'],
    ['src/app/services/dom/elements/element-interaction.service.ts','app/services/dom/elements/element-interaction.service.js','applyElementMaterial'],
    ['src/app/services/babylon-mesh.service.ts','app/services/babylon-mesh.service.js','createMaterial']].map(([sourceFile, relative, method]) => {
    const installedFile = path.join(consumer, 'node_modules/astylarui/dist/lib', relative);
    const source = readFileSync(sourceFile, 'utf8'), installed = readFileSync(installedFile, 'utf8');
    const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
    const extract = code => {
      const ast = ts.createSourceFile('method.js', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS), matches = [];
      assert.equal(ast.parseDiagnostics.length, 0);
      const visit = n => { if (ts.isMethodDeclaration(n) && n.name.getText(ast) === method) matches.push(n.getText(ast).replace(/\s+/g, ' ').trim()); ts.forEachChild(n, visit); };
      visit(ast); assert.equal(matches.length, 1); return matches[0];
    };
    assert.equal(extract(installed), extract(compiled));
    return { method, sourceFile, sourceSha256: hash(source), installedFile, installedSha256: hash(installed) };
  });
  const applicationSource = `import '@angular/compiler';
  import {provideZonelessChangeDetection} from '@angular/core';
  import {createApplication} from '@angular/platform-browser';
  import {Astylar} from 'astylarui';
  document.body.style.cssText='margin:0';
  const outside=document.createElement('button');outside.id='outside';outside.textContent='Outside';document.body.append(outside);
  const canvas=document.createElement('canvas');canvas.style.cssText='display:block;width:390px;height:160px';document.body.append(canvas);
  const app=await createApplication({providers:[provideZonelessChangeDetection()]});
  const site=present=>({root:{children:present?[{type:'button',id:'probe',value:'Probe',ariaLabel:'Probe'}]:[]},styles:[
  {selector:'#probe',position:'absolute',left:'20px',top:'20px',width:'120px',height:'40px',padding:'0',borderWidth:'0',background:'#dddddd',color:'#222222',fontFamily:'Arial',fontSize:'14px'},
  {selector:'#probe:hover',background:'#cccccc'},{selector:'#probe:focus',background:'#bbbbbb'},{selector:'#probe:active',background:'#aaaaaa'}]});
  const clicks=[];const surface=app.injector.get(Astylar).mount(canvas,site(true),{diagnostics:{logLevel:'silent'},events:{handlers:{probe:{click:e=>clicks.push(e.targetId)}}}});
  const scene=surface.scene;const settle=async()=>{await document.fonts.ready;await surface.whenSettled();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));};
  const snapshot=()=>({tracked:surface.diagnostics.resources,live:{meshes:scene.meshes.length,materials:scene.materials.length,textures:scene.textures.length},materials:scene.materials.map(m=>({id:m.uniqueId,name:m.name,bound:scene.meshes.some(mesh=>mesh.material===m)})),focus:document.activeElement?.getAttribute('data-astylar-id')??document.activeElement?.id,clicks:[...clicks],diagnostics:surface.diagnostics.messages});
  await settle();window.pseudoAudit={settle,snapshot,point(){const c=canvas.getBoundingClientRect();return{x:c.x+80,y:c.y+40};},async update(present){await surface.update(site(present));await settle();return snapshot();},dispose(){surface.dispose();app.destroy();return snapshot();}};`;
  const esbuild = createRequire(path.join(consumer, 'package.json'))('esbuild');
  const built = await esbuild.build({ absWorkingDir: process.cwd(), stdin: { resolveDir: consumer, sourcefile: 'public-pseudo-ownership.mjs', contents: applicationSource }, bundle: true, write: false, metafile: true, format: 'esm', platform: 'browser', target: 'es2022' });
  const diskFiles = Object.keys(built.metafile.inputs).filter(file => existsSync(path.resolve(file))).sort();
  const virtualFiles = Object.keys(built.metafile.inputs).filter(file => !existsSync(path.resolve(file)));
  assert.equal(virtualFiles.length, 1); assert.ok(virtualFiles[0].endsWith('public-pseudo-ownership.mjs'));
  const inputs = diskFiles.map(file => ({ file, sha256: hash(readFileSync(path.resolve(file))) }));
  assert.ok(!inputs.some(i => i.file.includes('material-showcase/src') || /^src[\\/]/.test(i.file)));
  const server = createServer((req, res) => { const script = req.url === '/audit.js'; res.setHeader('content-type', script ? 'text/javascript' : 'text/html'); res.end(script ? built.outputFiles[0].contents : '<!doctype html><script type="module" src="/audit.js"></script>'); });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const start = performance.now(), results = []; let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    for (const dpr of [1, 2]) {
      const page = await browser.newPage({ viewport: { width: 390, height: 400 }, deviceScaleFactor: dpr }), errors = [];
      page.on('pageerror', e => errors.push(String(e)));
      try {
        await page.goto('http://127.0.0.1:' + server.address().port); await page.waitForFunction(() => !!window.pseudoAudit);
        const samples = [], sample = async label => { await page.evaluate(() => window.pseudoAudit.settle()); const s = await page.evaluate(() => window.pseudoAudit.snapshot()); samples.push({ label, ...s }); return s; };
        await sample('mount');
        for (let i = 0; i < 3; i++) { await page.evaluate(() => window.pseudoAudit.update(false)); await sample('no-interaction-removed-' + i); await page.evaluate(() => window.pseudoAudit.update(true)); }
        for (let i = 0; i < 3; i++) {
          const p = await page.evaluate(() => window.pseudoAudit.point()); await page.mouse.move(p.x, p.y); await sample('hover-' + i);
          await page.mouse.down(); await sample('held-' + i); await page.mouse.up(); await sample('clicked-' + i);
          await page.locator('#outside').click(); await sample('blur-' + i);
          await page.evaluate(() => window.pseudoAudit.update(false)); await sample('removed-' + i); await page.evaluate(() => window.pseudoAudit.update(true));
        }
        const disposed = await page.evaluate(() => window.pseudoAudit.dispose());
        t.diagnostic(JSON.stringify({ dpr, samples, disposed, errors }));
        assert.deepEqual(errors, []);
        for (const s of samples.filter(s => s.label.startsWith('no-interaction-removed'))) assert.deepEqual(s.live, s.tracked);
        const removed = samples.filter(s => s.label.startsWith('removed'));
        assert.deepEqual(removed.map(s => s.live.materials - s.tracked.materials), [5, 10, 15]);
        for (const [cycle, s] of removed.entries()) {
          assert.equal(s.live.meshes, s.tracked.meshes);
          assert.equal(s.live.textures, s.tracked.textures);
          assert.equal(s.materials.filter(m => !m.bound).length, 5 * (cycle + 1));
          assert.deepEqual(s.clicks, Array(cycle + 1).fill('probe'));
          assert.deepEqual(s.diagnostics, []);
        }
        assert.deepEqual(disposed.live, { meshes: 0, materials: 0, textures: 0 });
        assert.deepEqual(disposed.tracked, disposed.live);
        results.push({ dpr, samples, disposed, errors });
      } finally { await page.close(); }
    }
    for (const i of inputs) assert.equal(hash(readFileSync(path.resolve(i.file))), i.sha256);
    t.diagnostic(JSON.stringify({ browser: browser.version(), applicationSource, applicationSha256: hash(applicationSource), methods,
      bundleSha256: hash(built.outputFiles[0].contents), dependencyCount: inputs.length, dependencyReceipt: hash(JSON.stringify(inputs)), results,
      elapsedMs: performance.now() - start, scope: 'Plugin-free public button pointer pseudo-state lifecycle at DPR1/2; owning methods match current source. Diagnostic counterexample, not lifecycle or equal-rendering acceptance.', acceptance: false }));
  } finally { if (browser) await browser.close(); await new Promise(r => server.close(r)); }

});

test('public same-document surfaces isolate modal focus and independent disposal', async t => {
  const consumer = path.resolve('examples/material-showcase');
  const methods = [
    ['astylar-semantic-bridge', 'applyModalInertnessFor'],
    ['astylar-semantic-bridge', 'semanticEventElementId'],
    ['astylar-interaction-runtime', 'moveFocus'],
    ['astylar-interaction-runtime', 'isAllowedByModal'],
  ].map(([module, method]) => {
    const sourceFile = 'src/lib/' + module + '.ts';
    const installedFile = path.join(consumer, 'node_modules/astylarui/dist/lib/lib', module + '.js');
    const source = readFileSync(sourceFile, 'utf8'), installed = readFileSync(installedFile, 'utf8');
    const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
    const extract = code => {
      const ast = ts.createSourceFile('method.js', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS), matches = [];
      assert.equal(ast.parseDiagnostics.length, 0);
      const visit = node => { if (ts.isMethodDeclaration(node) && node.name.getText(ast) === method) matches.push(node.getText(ast).replace(/\s+/g, ' ').trim()); ts.forEachChild(node, visit); };
      visit(ast); assert.equal(matches.length, 1); return matches[0];
    };
    assert.equal(extract(installed), extract(compiled));
    return { sourceFile, sourceSha256: hash(source), installedFile, installedSha256: hash(installed), method };
  });
  const applicationSource = "\nimport '@angular/compiler';\nimport {provideZonelessChangeDetection} from '@angular/core';\nimport {createApplication} from '@angular/platform-browser';\nimport {Astylar} from 'astylarui';\ndocument.body.style.cssText='margin:0';\nconst select=document.createElement('select');select.id='outside';select.innerHTML='<option>One</option><option>Two</option>';document.body.append(select);\nconst app=await createApplication({providers:[provideZonelessChangeDetection()]});\nconst handles=[],hosts=[];\nconst site=(modal,peer=false)=>({root:{children:[{type:'button',id:'background',value:peer?'Peer':'Trigger'},...(!peer?[{type:'dialog',id:'modal',open:modal,modal:true,children:[{type:'button',id:'action',value:'Continue',autofocus:true},{type:'button',id:'cancel',value:'Cancel'}]}]:[])]},styles:[\n{selector:'#background',position:'absolute',left:'20px',top:'20px',width:'120px',height:'40px',padding:'0',borderWidth:'0',background:'#eeeeee',fontFamily:'Arial',fontSize:'14px'},\n{selector:'#modal',position:'absolute',left:'10px',top:'70px',width:'280px',height:'90px',padding:'0',borderWidth:'0',background:'#ffffff',display:'flex'},\n{selector:'#action,#cancel',width:'120px',height:'40px',padding:'0',borderWidth:'0',background:'#eeeeee',fontFamily:'Arial',fontSize:'14px'}]});\nfor(let i=0;i<2;i++){const host=document.createElement('section');host.id='surface-'+i;document.body.append(host);hosts.push(host);const canvas=document.createElement('canvas');canvas.style.cssText='display:block;width:390px;height:180px';host.append(canvas);handles.push(app.injector.get(Astylar).mount(canvas,site(false,i===1),{diagnostics:{logLevel:'silent'}}));}\nconst settle=async()=>{await document.fonts.ready;await Promise.all(handles.filter(s=>!s.disposed).map(s=>s.whenSettled()));await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));};\nconst snapshot=()=>({active:document.activeElement?.getAttribute('data-astylar-id')??document.activeElement?.id,activeHost:document.activeElement?.closest('section')?.id??null,\noutsideInert:select.inert,surfaces:handles.map((s,i)=>({disposed:s.disposed,modalOpen:hosts[i].querySelector('[data-astylar-id=\"modal\"]')?.open??false,backgroundInert:hosts[i].querySelector('[data-astylar-id=\"background\"]')?.inert??null,\nsemanticRoots:hosts[i].querySelectorAll('[data-astylar-semantic-root]').length,resources:s.diagnostics.resources,messages:s.diagnostics.messages})),nativeIds:[...document.querySelectorAll('[data-astylar-id=\"background\"]')].map(n=>n.id)});\nawait settle();window.isolationAudit={settle,snapshot,async open(){await handles[0].update(site(true));await settle();},disposeFirst(){handles[0].dispose();},dispose(){handles.filter(s=>!s.disposed).forEach(s=>s.dispose());app.destroy();return snapshot();}};\n";
  const built = await createRequire(path.join(consumer, 'package.json'))('esbuild').build({
    absWorkingDir: process.cwd(), stdin: { resolveDir: consumer, sourcefile: 'public-modal-isolation.mjs', contents: applicationSource },
    bundle: true, write: false, metafile: true, format: 'esm', platform: 'browser', target: 'es2022' });
  const diskFiles = Object.keys(built.metafile.inputs).filter(file => existsSync(path.resolve(file))).sort();
  const virtualFiles = Object.keys(built.metafile.inputs).filter(file => !existsSync(path.resolve(file)));
  assert.deepEqual(virtualFiles, [path.relative(process.cwd(), path.join(consumer, 'public-modal-isolation.mjs')).replaceAll('\\', '/')]);
  const inputs = diskFiles.map(file => ({ file, sha256: hash(readFileSync(path.resolve(file))) }));
  assert.ok(!inputs.some(input => /^src[\\/]/.test(input.file) || input.file.includes('material-showcase/src')));
  const server = createServer((req, res) => { const script = req.url === '/audit.js';
    res.setHeader('content-type', script ? 'text/javascript' : 'text/html');
    res.end(script ? built.outputFiles[0].contents : '<!doctype html><script type="module" src="/audit.js"></script>'); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser; const results = [], started = performance.now();
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    for (const dpr of [1, 2]) {
      const page = await browser.newPage({ viewport: { width: 800, height: 600 }, deviceScaleFactor: dpr });
      const errors = []; page.on('pageerror', error => errors.push(String(error)));
      try {
        await page.goto('http://127.0.0.1:' + server.address().port);
        await page.waitForFunction(() => !!window.isolationAudit);
        const samples = [], sample = async label => { await page.evaluate(() => window.isolationAudit.settle());
          const state = await page.evaluate(() => window.isolationAudit.snapshot()); samples.push({ label, ...state });
          assert.equal(state.outsideInert, false);
          for (const surface of state.surfaces) assert.deepEqual(surface.messages, []);
          return state; };
        const mounted = await sample('mounted');
        assert.equal(new Set(mounted.nativeIds).size, 2, 'equal authored IDs must have isolated native IDs');
        await page.evaluate(() => window.isolationAudit.open()); const opened = await sample('modal-open');
        assert.equal(opened.active, 'action'); assert.equal(opened.activeHost, 'surface-0');
        assert.equal(opened.surfaces[0].backgroundInert, true); assert.equal(opened.surfaces[1].backgroundInert, false);
        await page.keyboard.press('Tab'); assert.equal((await sample('modal-tab')).active, 'cancel');
        const peerPoint = await page.locator('#surface-1 canvas').evaluate(canvas => { const box = canvas.getBoundingClientRect(); return { x: box.x + 80, y: box.y + 40 }; });
        await page.mouse.click(peerPoint.x, peerPoint.y); const peer = await sample('peer-pointer');
        assert.equal(peer.activeHost, 'surface-1'); assert.equal(peer.active, 'background');
        await page.keyboard.press('Escape'); const escaped = await sample('peer-escape');
        assert.equal(escaped.surfaces[0].modalOpen, true, 'peer Escape must not dismiss another surface modal');
        await page.locator('#outside').selectOption({ index: 1 }); await page.locator('#outside').focus();
        assert.equal((await sample('outside-selector')).active, 'outside');
        await page.evaluate(() => window.isolationAudit.disposeFirst()); const removed = await sample('first-disposed');
        assert.equal(removed.surfaces[0].semanticRoots, 0);
        assert.deepEqual(removed.surfaces[0].resources, { meshes: 0, materials: 0, textures: 0 });
        assert.deepEqual(removed.surfaces[1], mounted.surfaces[1]);
        await page.mouse.click(peerPoint.x, peerPoint.y); const survived = await sample('surviving-peer');
        assert.equal(survived.activeHost, 'surface-1'); assert.equal(survived.active, 'background');
        const disposed = await page.evaluate(() => window.isolationAudit.dispose());
        assert.deepEqual(disposed.nativeIds, []);
        for (const surface of disposed.surfaces) { assert.equal(surface.disposed, true); assert.equal(surface.semanticRoots, 0);
          assert.deepEqual(surface.resources, { meshes: 0, materials: 0, textures: 0 }); assert.deepEqual(surface.messages, []); }
        assert.deepEqual(errors, []); results.push({ dpr, samples, disposed, errors });
      } finally { await page.close(); }
    }
    for (const input of inputs) assert.equal(hash(readFileSync(path.resolve(input.file))), input.sha256);
    t.diagnostic(JSON.stringify({ browser: browser.version(), applicationSource, methods,
      bundleSha256: hash(built.outputFiles[0].contents), dependencyCount: inputs.length, dependencyReceipt: hash(JSON.stringify(inputs)),
      results, elapsedMs: performance.now() - started,
      scope: 'Public same-document modal isolation DPR1/2; not Material input equivalence, equal-rendering acceptance, focus restoration, late async work or all profiles.' }));
  } finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
});
