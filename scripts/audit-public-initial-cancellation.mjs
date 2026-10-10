import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { materialBrowserLaunchOptions, inspectMaterialBrowserLaunch } from '../tests/material-parity/run-checkpoint.mjs';

// Minimal public mount/dispose: no Material, images, fonts or custom scheduling.
const script = 'scripts/audit-public-initial-cancellation.mjs';
const output = path.resolve(process.argv[2] ?? '');
assert(output.startsWith(path.resolve('artifacts/material-parity') + path.sep) && !existsSync(output));
const entry = `import '@angular/compiler';
import { provideZonelessChangeDetection } from '@angular/core';
import { createApplication } from '@angular/platform-browser';
import { Astylar } from 'astylarui';
const application = await createApplication({ providers: [provideZonelessChangeDetection()] });
const canvas = document.createElement('canvas'); canvas.style.cssText='width:100px;height:100px'; document.body.append(canvas);
const surface = application.injector.get(Astylar).mount(canvas, { root: { children: [] }, styles: [] });
const before = surface.diagnostics.session;
const outcome = surface.whenSettled().then(() => ({status:'resolved'}), error => ({status:'rejected',message:error.message}));
if(new URLSearchParams(location.search).get('mode')==='immediate') surface.dispose();
const settlement = await outcome;
if(!surface.disposed) surface.dispose();
application.destroy();
await new Promise(resolve=>setTimeout(resolve,0));
window.initialCancellationAudit={before,settlement,disposed:surface.disposed,session:surface.diagnostics.session,
resources:surface.diagnostics.resources,live:{meshes:surface.scene.meshes.length,materials:surface.scene.materials.length,textures:surface.scene.textures.length}};`;
const consumer = createRequire(path.resolve('examples/material-showcase/package.json'));
const built = await consumer('esbuild').build({ stdin: { contents: entry, resolveDir: path.resolve('examples/material-showcase/audit'), sourcefile: 'initial-cancellation.mjs' },
  absWorkingDir: process.cwd(), bundle: true, write: false, format: 'esm', platform: 'browser', target: 'es2022', metafile: true });
const hash = bytes => createHash('sha256').update(bytes).digest('hex'), bundle = built.outputFiles[0].contents;
const virtualEntry = path.resolve('examples/material-showcase/audit/initial-cancellation.mjs');
const inputs = Object.keys(built.metafile.inputs).filter(file => path.resolve(file) !== virtualEntry).sort().map(file => ({ file, sha256: hash(readFileSync(file)) }));
const html = Buffer.from('<!doctype html><html><body><script type="module" src="/audit.js"></script></body></html>');
mkdirSync(output); writeFileSync(path.join(output, 'audit.js'), bundle); writeFileSync(path.join(output, 'index.html'), html);
const server = createServer((req,res) => { res.setHeader('content-type', req.url === '/audit.js' ? 'text/javascript' : 'text/html'); res.end(req.url === '/audit.js' ? bundle : html); });
await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
const launch = materialBrowserLaunchOptions(), browser = await chromium.launch(launch), results = [];
try {
  for (const mode of ['immediate','settled']) {
    const page = await browser.newPage({ viewport: { width: 300, height: 200 }, deviceScaleFactor: 1 }), errors = [], pageErrors = [], assets = [];
    page.on('console', message => { if(message.type()==='error') errors.push(message.text()); });
    page.on('pageerror', error => pageErrors.push(String(error)));
    page.on('response', response => { if(['script','document'].includes(response.request().resourceType())) assets.push(response.body().then(bytes => ({type:response.request().resourceType(),sha256:hash(bytes)}))); });
    await page.goto(`http://127.0.0.1:${server.address().port}/?mode=${mode}`);
    await page.waitForFunction(() => !!window.initialCancellationAudit);
    results.push({mode,...await page.evaluate(()=>window.initialCancellationAudit),errors,pageErrors,assets:await Promise.all(assets)});
    await page.close();
  }
  for(const input of inputs) assert.equal(hash(readFileSync(input.file)),input.sha256);
  const record = { schemaVersion:1, kind:'public-initial-render-cancellation-diagnostic',
    provenance:{browser:browser.version(),launch:await inspectMaterialBrowserLaunch(browser,launch),script:{file:script,sha256:hash(readFileSync(script))},bundleInputs:inputs,bundleSha256:hash(bundle),htmlSha256:hash(html),entrySha256:hash(entry)},results,
    scope:'Immediate public mount disposal versus settled control; known runtime diagnostic retained as failure, not accepted parity or complete lifecycle coverage.' };
  writeFileSync(path.join(output,'failure-observations.json'),JSON.stringify(record,null,2)+'\n');
  for(const row of results) {
    assert.equal(row.disposed,true); assert.equal(row.session.status,'disposed');
    assert.deepEqual(row.resources,{meshes:0,materials:0,textures:0}); assert.deepEqual(row.live,row.resources); assert.deepEqual(row.pageErrors,[]);
    assert.equal(row.settlement.status,row.mode==='immediate'?'rejected':'resolved');
    if(row.mode==='immediate') { assert.match(row.settlement.message,/disposed before settling/); assert.equal(row.errors.length,1); assert.match(row.errors[0],/Initial render failed.*disposed before settling/); }
    else assert.deepEqual(row.errors,[]);
  }
  console.log(JSON.stringify({diagnosticAssertions:'passed',runtimeAcceptance:'failed',results:results.map(({assets,...row})=>row)}));
} finally { await browser.close(); await new Promise(resolve=>server.close(resolve)); }
