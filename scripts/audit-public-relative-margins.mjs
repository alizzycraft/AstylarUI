import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { materialBrowserLaunchOptions, inspectMaterialBrowserLaunch } from '../tests/material-parity/run-checkpoint.mjs';

// The existing public em-box reduction does not exercise margins. Preserve its
// inputs and runner; this diagnostic isolates formatting context with px controls.
const verifyOnly = process.argv[2] === '--verify';
const output = path.resolve(process.argv[verifyOnly ? 3 : 2] ?? '');
assert.ok(output.startsWith(path.resolve('artifacts/material-parity') + path.sep));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
function verify(report) {
  assert.equal(report.kind, 'public-relative-margin-diagnostic');
  assert.equal(report.scriptSha256, hash(readFileSync(import.meta.filename)));
  assert.deepEqual(report.errors, []);
  assert.equal(report.results.length, 16);
  const keys = new Set();
  const summary = { blockEm: [], flexEm: [], pixelControls: 0 };
  for (const receipt of report.inputs) assert.equal(hash(readFileSync(receipt.file)), receipt.sha256);
  for (const row of report.results) {
    const key = JSON.stringify([row.dpr, row.font, row.context, row.unit]);
    assert.ok(!keys.has(key)); keys.add(key);
    assert.ok([1, 2].includes(row.dpr) && [16, 24].includes(row.font));
    assert.ok(['block', 'flex'].includes(row.context) && ['em', 'px'].includes(row.unit));
    assert.deepEqual(row.reference.site, row.astylar.site);
    for (const side of ['reference', 'astylar']) {
      const observation = row[side];
      assert.equal(observation.inputUnchanged, true);
      assert.deepEqual(observation.errors, []);
      assert.equal(observation.site.styles[2].margin, row.unit === 'em' ? '1em 0' : `${row.font}px 0`);
      assert.equal(observation.site.styles[2].fontSize, `${row.font}px`);
      for (const owner of ['parent', 'child']) for (const value of Object.values(observation.bounds[owner])) assert.ok(Number.isFinite(value));
      const screenshot = observation.screenshot;
      assert.equal(path.basename(screenshot.file), screenshot.file);
      assert.equal(hash(readFileSync(path.join(output, screenshot.file))), screenshot.sha256);
    }
    assert.equal(row.reference.computed.marginTop, `${row.font}px`);
    assert.equal(row.reference.computed.fontSize, `${row.font}px`);
    assert.equal(row.astylar.declared.margin, row.unit === 'em' ? '1em 0' : `${row.font}px 0`);
    assert.equal(row.astylar.declared.fontSize, `${row.font}px`);
    const offset = side => row[side].bounds.child.top - row[side].bounds.parent.top;
    assert.ok(Math.abs(offset('reference') - (20 + row.font)) < .01);
    const observation = { dpr: row.dpr, font: row.font, referenceOffset: offset('reference'), candidateOffset: offset('astylar'),
      error: offset('astylar') - offset('reference') };
    if (row.unit === 'px') {
      for (const owner of ['parent', 'child']) for (const axis of ['left', 'top', 'width', 'height'])
        assert.ok(Math.abs(row.reference.bounds[owner][axis] - row.astylar.bounds[owner][axis]) < .5, `Pixel control ${key}/${owner}/${axis}`);
      summary.pixelControls++;
    } else summary[row.context === 'block' ? 'blockEm' : 'flexEm'].push(observation);
  }
  assert.equal(keys.size, 16); assert.equal(summary.pixelControls, 8);
  return summary;
}
if (verifyOnly) {
  const report = JSON.parse(readFileSync(path.join(output, 'latest-report.json')));
  const summary = verify(report);
  const unequal = structuredClone(report); unequal.results[0].astylar.site.styles[2].margin = '0';
  assert.throws(() => verify(unequal));
  const incomplete = structuredClone(report); incomplete.results.pop(); assert.throws(() => verify(incomplete));
  console.log(JSON.stringify({ verified: summary, negativeControlsRejected: 2, boundary: 'Retained public geometry and equal authored inputs; not Material placement or aggregate parity' }));
  process.exit(0);
}
assert.ok(!existsSync(output), 'Never overwrite original or failure evidence');
const require = createRequire(path.resolve('examples/material-showcase/package.json'));
const contents = `import '@angular/compiler';
import {provideZonelessChangeDetection} from '@angular/core';
import {createApplication} from '@angular/platform-browser';
import {Astylar} from 'astylarui';
import {Matrix,Vector3} from '@babylonjs/core';
const query=new URLSearchParams(location.search),mode=query.get('mode'),font=Number(query.get('font')),context=query.get('context'),unit=query.get('unit');
document.body.style.cssText='margin:0;padding:0';
const site={root:{children:[{type:'div',id:'parent',children:[{type:'div',id:'child'}]}]},styles:[
{selector:'*',boxSizing:'border-box',margin:'0',padding:'0',borderWidth:'0',borderStyle:'none'},
{selector:'#parent',position:'absolute',left:'20px',top:'20px',width:'300px',height:'180px',padding:'20px',display:context,flexDirection:'column',alignItems:'flex-start',background:'#eeeeee'},
{selector:'#child',display:'block',width:'80px',height:'24px',fontSize:font+'px',fontFamily:'Arial, sans-serif',margin:unit==='em'?'1em 0':font+'px 0',background:'#123456'}]};
const original=JSON.stringify(site),host=document.createElement(mode==='reference'?'div':'canvas');
host.style.cssText='position:relative;display:block;width:400px;height:260px';document.body.append(host);
let app,surface;
if(mode==='reference'){
 const css=document.createElement('style');css.textContent=site.styles.map(({selector,...style})=>selector+'{'+Object.entries(style).map(([key,value])=>key.replace(/[A-Z]/g,c=>'-'+c.toLowerCase())+':'+value).join(';')+'}').join('');document.head.append(css);
 const parent=document.createElement('div'),child=document.createElement('div');parent.id='parent';child.id='child';parent.append(child);host.append(parent);
}else{app=await createApplication({providers:[provideZonelessChangeDetection()]});surface=app.injector.get(Astylar).mount(host,site,{diagnostics:{logLevel:'silent'}});await surface.whenSettled();}
await document.fonts.ready;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
window.marginAudit={snapshot:()=>{
 const bounds={};for(const id of ['parent','child']){
  if(mode==='reference'){const box=document.getElementById(id).getBoundingClientRect(),origin=host.getBoundingClientRect();bounds[id]={left:box.left-origin.left,top:box.top-origin.top,width:box.width,height:box.height};}
  else{const mesh=surface.scene.getMeshByName(id);if(!mesh)throw Error('Missing '+id);mesh.computeWorldMatrix(true);const engine=surface.scene.getEngine(),viewport=surface.scene.activeCamera.viewport.toGlobal(engine.getRenderWidth(),engine.getRenderHeight());
   const points=mesh.getBoundingInfo().boundingBox.vectorsWorld.map(point=>Vector3.Project(point,Matrix.IdentityReadOnly,surface.scene.getTransformMatrix(),viewport));
   const xs=points.map(p=>p.x*host.clientWidth/engine.getRenderWidth()),ys=points.map(p=>p.y*host.clientHeight/engine.getRenderHeight());bounds[id]={left:Math.min(...xs),top:Math.min(...ys),width:Math.max(...xs)-Math.min(...xs),height:Math.max(...ys)-Math.min(...ys)};}
 }
 const native=mode==='reference'?getComputedStyle(document.getElementById('child')):null;
 return {site,inputUnchanged:JSON.stringify(site)===original,bounds,computed:native?{marginTop:native.marginTop,fontSize:native.fontSize}:null,
 declared:surface?.inspectResolvedStyles().elements.find(element=>element.id==='child').effective??null,errors:surface?.diagnostics.messages.filter(message=>message.severity==='error')??[]};
},dispose:()=>{surface?.dispose();app?.destroy();}};`;
const built = await require('esbuild').build({ absWorkingDir: process.cwd(), stdin: { contents, resolveDir: path.resolve('examples/material-showcase'), sourcefile: 'relative-margin-public-diagnostic.mjs' }, bundle: true, write: false, format: 'esm', platform: 'browser', target: 'es2022', metafile: true });
const bundle = built.outputFiles[0].contents;
const inputs = Object.keys(built.metafile.inputs).filter(file => existsSync(file)).sort().map(file => ({ file, sha256: hash(readFileSync(file)) }));
const html = '<!doctype html><script type="module" src="/audit.js"></script>';
mkdirSync(output); writeFileSync(path.join(output, 'audit.js'), bundle); writeFileSync(path.join(output, 'index.html'), html);
const server = createServer((request, response) => { const script = request.url === '/audit.js'; response.setHeader('content-type', script ? 'text/javascript' : 'text/html'); response.end(script ? bundle : html); });
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const launch = materialBrowserLaunchOptions(), browser = await chromium.launch(launch), results = [], errors = [];
try {
  const runtime = { browser: browser.version(), launch: await inspectMaterialBrowserLaunch(browser, launch), bundleSha256: hash(bundle), htmlSha256: hash(html) };
  for (const dpr of [1, 2]) for (const font of [16, 24]) for (const context of ['block', 'flex']) for (const unit of ['em', 'px']) {
    const row = { dpr, font, context, unit };
    for (const mode of ['reference', 'astylar']) {
      const page = await browser.newPage({ viewport: { width: 400, height: 260 }, deviceScaleFactor: dpr }), assets = [];
      page.on('pageerror', error => errors.push(String(error)));
      page.on('response', response => { if (['script', 'document'].includes(response.request().resourceType())) assets.push(response.body().then(bytes => ({ type: response.request().resourceType(), sha256: hash(bytes) }))); });
      try {
        await page.goto(`http://127.0.0.1:${server.address().port}/?mode=${mode}&font=${font}&context=${context}&unit=${unit}`);
        await page.waitForFunction(() => !!window.marginAudit);
        row[mode] = await page.evaluate(() => window.marginAudit.snapshot());
        const file = `${dpr}-${font}-${context}-${unit}-${mode}.png`;
        row[mode].screenshot = { file, sha256: hash(await page.screenshot({ path: path.join(output, file) })) };
        row[mode].assets = await Promise.all(assets);
        assert.ok(row[mode].assets.some(asset => asset.sha256 === runtime.bundleSha256));
        await page.evaluate(() => window.marginAudit.dispose());
      } finally { await page.close(); }
    }
    results.push(row);
  }
  for (const receipt of inputs) assert.equal(hash(readFileSync(receipt.file)), receipt.sha256);
  const report = { kind: 'public-relative-margin-diagnostic', scriptSha256: hash(readFileSync(import.meta.filename)), inputs, runtime, errors, results };
  writeFileSync(path.join(output, 'latest-report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ observations: verify(report), errors, boundary: 'Public equal-input diagnostic,not aggregate parity or authorization to alter fixture margins' }));
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
