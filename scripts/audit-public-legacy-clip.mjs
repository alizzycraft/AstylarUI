import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { PNG } from 'pngjs';
import { materialBrowserLaunchOptions, inspectMaterialBrowserLaunch } from '../tests/material-parity/run-checkpoint.mjs';

// Specific unresolved boundary: legacy clip requests on omitted native anchors.
// No fixture edits, private imports, overflow substitutes or support inference.
const script = 'scripts/audit-public-legacy-clip.mjs';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const verifying = process.argv[2] === '--verify';
const output = path.resolve(process.argv[verifying ? 3 : 2] ?? '');
assert.ok(output.startsWith(path.resolve('artifacts/material-parity') + path.sep));
function redPixels(bytes) {
  const png = PNG.sync.read(bytes); let count = 0;
  for (let i = 0; i < png.data.length; i += 4)
    if (png.data[i] > 220 && png.data[i + 1] < 30 && png.data[i + 2] < 30 && png.data[i + 3] > 220) count++;
  return count;
}
function verify(report) {
  assert.equal(report.kind, 'public-loaded-css-legacy-clip');
  const currentSource = readFileSync(script, 'utf8');
  if (report.scriptSha256 !== hash(currentSource)) {
    // Preserve the complete captured producer. Only the overly broad diagnostic
    // predicate changes in replay; inputs, capture and pixel assertions do not.
    const originalGuard = "  assert.equal(report.scriptSha256, hash(readFileSync(script)));";
    const start = currentSource.indexOf('  const currentSource =');
    const end = currentSource.indexOf('\n  for (const receipt of', start) + 1;
    assert.ok(start >= 0 && end > start);
    const base = currentSource.slice(0, start) + originalGuard + '\n' + currentSource.slice(end);
    assert.equal(base.split("d.property === 'clip'").length, 3);
    assert.equal(hash(base.replaceAll("d.property === 'clip'", "JSON.stringify(d).includes('clip')")), report.scriptSha256);
  }
  for (const receipt of [report.inputSource, report.bundle, report.html, ...report.inputs])
    assert.equal(hash(readFileSync(receipt.file)), receipt.sha256);
  assert.deepEqual(report.errors, []);
  assert.deepEqual(report.results.map(r => [r.dpr, r.clipped]), [[1, false], [1, true], [2, false], [2, true]]);
  for (const row of report.results) {
    assert.deepEqual(row.reference.site, row.astylar.site);
    assert.equal(row.reference.css, row.astylar.css);
    assert.equal(row.reference.computedClip, row.clipped ? 'rect(0px, 0px, 0px, 0px)' : 'auto');
    for (const side of ['reference', 'astylar']) {
      const value = row[side];
      assert.equal(hash(readFileSync(value.png.file)), value.png.sha256);
      assert.equal(redPixels(readFileSync(value.png.file)), value.redPixels);
      for (const type of ['document', 'script'])
        assert.ok(value.assets.some(a => a.type === type && a.sha256 === report[type === 'document' ? 'html' : 'bundle'].sha256));
    }
    if (row.clipped) {
      assert.equal(row.reference.redPixels, 0);
      assert.ok(row.astylar.redPixels >= 300 * row.dpr ** 2);
      assert.ok(row.astylar.diagnostics.some(d => d.code === 'document-css-declaration-unsupported' && d.property === 'clip'));
    } else {
      assert.ok(row.reference.redPixels >= 300 * row.dpr ** 2);
      assert.ok(row.astylar.redPixels >= 300 * row.dpr ** 2);
      assert.equal(row.astylar.diagnostics.some(d => d.code === 'document-css-declaration-unsupported' && d.property === 'clip'), false);
    }
  }
  return { pairs: 4, unclippedPaintControls: 2, legacyClipSupportFailures: 2, currentRenderingAccepted: false };
}
if (verifying) {
  const report = JSON.parse(readFileSync(path.join(output, 'latest-report.json'))), summary = verify(report);
  let rejected = 0;
  for (const mutate of [r => r.results.pop(), r => r.results[1].astylar.css += ' ',
    r => r.results[1].astylar.diagnostics = [], r => r.results[1].reference.redPixels = 1]) {
    const forged = structuredClone(report); mutate(forged); assert.throws(() => verify(forged)); rejected++;
  }
  console.log(JSON.stringify({ ...summary, negativeControlsRejected: rejected }));
} else {
  assert.ok(!existsSync(output), 'Fresh directory required; preserve failures');
  const contents = `import '@angular/compiler';
import {provideZonelessChangeDetection} from '@angular/core';
import {createApplication} from '@angular/platform-browser';
import {Astylar,provideAstylar} from 'astylarui';
const q=new URLSearchParams(location.search),mode=q.get('mode'),clipped=q.get('clipped')==='true';
const css='#clip-root{position:relative;width:120px;height:80px;background:rgb(255,255,255)}'+
'#clip-target{position:absolute;left:20px;top:20px;width:20px;height:20px;background:rgb(255,0,0);'+(clipped?'clip:rect(0px,0px,0px,0px);':'')+'}';
const sheet=document.createElement('style');sheet.textContent=css;document.head.append(sheet);
const site={root:{children:[{type:'div',id:'clip-root',children:[{type:'div',id:'clip-target'}]}]},styles:[]};
const host=document.createElement(mode==='reference'?'div':'canvas');host.id='host';
host.style.cssText='display:block;width:120px;height:80px';document.body.append(host);
let app,surface,computedClip;
if(mode==='reference'){const root=document.createElement('div'),target=document.createElement('div');root.id='clip-root';target.id='clip-target';root.append(target);host.append(root);computedClip=getComputedStyle(target).clip;}
else{app=await createApplication({providers:[provideZonelessChangeDetection(),provideAstylar({css:{useDocumentStyles:true}})]});surface=app.injector.get(Astylar).mount(host,site,{diagnostics:{logLevel:'silent'}});await surface.whenSettled();}
await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
window.clipAudit={site,css,computedClip,diagnostics:surface?surface.diagnostics.messages:[],dispose(){surface?.dispose();app?.destroy();}};`;
  const require = createRequire(path.resolve('examples/material-showcase/package.json'));
  const built = await require('esbuild').build({ absWorkingDir: process.cwd(), stdin: { resolveDir: path.resolve('examples/material-showcase'),
    sourcefile: 'public-legacy-clip.mjs', contents }, bundle: true, write: false, format: 'esm', platform: 'browser', target: 'es2022', metafile: true });
  const inputs = Object.keys(built.metafile.inputs).filter(f => path.basename(f) !== 'public-legacy-clip.mjs')
    .map(file => ({ file, sha256: hash(readFileSync(file)) }));
  assert.ok(!inputs.some(r => r.file.includes('material-showcase/src') || r.file.includes('astylarui/dist/lib/plugins/material')));
  mkdirSync(output, { recursive: true });
  const bundle = built.outputFiles[0].contents, html = Buffer.from('<!doctype html><body style="margin:0"><script type="module" src="/audit.js"></script>');
  const receipt = (name, bytes) => { const file = path.join(output, name); writeFileSync(file, bytes, { flag: 'wx' }); return { file, sha256: hash(bytes) }; };
  const inputSource = receipt('input.mjs', contents), bundleReceipt = receipt('audit.js', bundle), htmlReceipt = receipt('index.html', html);
  const server = createServer((request, response) => {
    const js = new URL(request.url, 'http://127.0.0.1').pathname === '/audit.js';
    response.setHeader('content-type', js ? 'text/javascript' : 'text/html'); response.end(js ? bundle : html);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const launch = materialBrowserLaunchOptions(); let browser; const errors = [], results = [];
  try {
    browser = await chromium.launch(launch);
    for (const dpr of [1, 2]) for (const clipped of [false, true]) {
      const row = { dpr, clipped };
      for (const mode of ['reference', 'astylar']) {
        const page = await browser.newPage({ viewport: { width: 160, height: 120 }, deviceScaleFactor: dpr }), assets = [];
        page.on('pageerror', error => errors.push(String(error)));
        page.on('response', r => { if (['document', 'script'].includes(r.request().resourceType())) assets.push(r.body().then(b => ({ type: r.request().resourceType(), sha256: hash(b) }))); });
        try {
          await page.goto('http://127.0.0.1:' + server.address().port + '/?mode=' + mode + '&clipped=' + clipped);
          await page.waitForFunction(() => !!window.clipAudit);
          const png = await page.locator('#host').screenshot();
          row[mode] = { ...await page.evaluate(() => { const {dispose,...value}=window.clipAudit;return value; }),
            assets: await Promise.all(assets), png: receipt(dpr + '-' + clipped + '-' + mode + '.png', png), redPixels: redPixels(png) };
          await page.evaluate(() => window.clipAudit.dispose());
        } finally { await page.close(); }
      }
      results.push(row);
    }
    const report = { kind: 'public-loaded-css-legacy-clip', scriptSha256: hash(readFileSync(script)), inputSource, bundle: bundleReceipt,
      html: htmlReceipt, inputs, runtime: { browser: browser.version(), launch: await inspectMaterialBrowserLaunch(browser, launch) }, errors, results };
    writeFileSync(path.join(output, 'latest-report.json'), JSON.stringify(report, null, 2), { flag: 'wx' });
    console.log(JSON.stringify(verify(report)));
  } catch (error) {
    writeFileSync(path.join(output, 'failure.json'), JSON.stringify({ error: String(error), errors, results,
      scriptSha256: hash(readFileSync(script)), inputSource, bundle: bundleReceipt, html: htmlReceipt, inputs }, null, 2), { flag: 'wx' });
    throw error;
  } finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
}
