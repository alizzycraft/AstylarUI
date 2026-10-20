import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { materialBrowserLaunchOptions, inspectMaterialBrowserLaunch } from '../tests/material-parity/run-checkpoint.mjs';

// Specific demonstrated gap: readonly typing mutates before Material's value
// normalization. Reuse the existing public mount/native-control driver pattern,
// with no Material imports, callbacks, document updates or corrected styles.
const script = 'scripts/audit-public-readonly-editing.mjs';
const hash = value => createHash('sha256').update(value).digest('hex');
const verifyOnly = process.argv[2] === '--verify';
const output = path.resolve(process.argv[verifyOnly ? 3 : 2] ?? '');
assert.ok(output.startsWith(path.resolve('artifacts/material-parity') + path.sep));
const kinds = ['writable', 'readonly', 'disabled'];
function verify(report) {
  assert.equal(report.kind, 'public-readonly-editing');
  assert.equal(report.scriptSha256, hash(readFileSync(script)));
  for (const receipt of [report.source, report.bundle, report.html, ...report.inputs])
    assert.equal(hash(readFileSync(receipt.file)), receipt.sha256);
  assert.deepEqual(report.errors, []);
  assert.deepEqual(report.results.map(r => `${r.dpr}/${r.kind}/${r.mode}`),
    [1, 2].flatMap(dpr => kinds.flatMap(kind => ['reference', 'astylar'].map(mode => `${dpr}/${kind}/${mode}`))));
  let readonlyFailures = 0, writableControls = 0, disabledControls = 0;
  for (const dpr of [1, 2]) for (const kind of kinds) {
    const pair = report.results.filter(r => r.dpr === dpr && r.kind === kind);
    assert.deepEqual(pair[0].site, pair[1].site);
    for (const row of pair) {
      assert.equal(row.inputUnchanged, true); assert.deepEqual(row.diagnostics, []);
      assert.deepEqual(row.samples.map(s => s.boundary), ['focused-home', 'typed-x', 'delete', 'backspace']);
      assert.ok(row.assets.some(r => r.sha256 === report.bundle.sha256));
      assert.equal(row.samples[0].value, 'Atlas');
      for (const sample of row.samples) {
        assert.equal(sample.readonly, kind === 'readonly'); assert.equal(sample.disabled, kind === 'disabled');
      }
      const expected = kind === 'writable' ? ['Atlas', 'xAtlas', 'xtlas', 'tlas'] : ['Atlas', 'Atlas', 'Atlas', 'Atlas'];
      const values = row.samples.map(s => s.value), matches = JSON.stringify(values) === JSON.stringify(expected);
      assert.equal(row.contractPass, matches);
      if (kind === 'writable') { assert.equal(matches, true); writableControls++; }
      else if (kind === 'disabled') { assert.equal(matches, true); disabledControls++; }
      else if (row.mode === 'reference') assert.equal(matches, true);
      else if (!matches) readonlyFailures++;
    }
  }
  assert.equal(report.readonlyFailingPairs, readonlyFailures);
  assert.equal(report.currentRenderingAccepted, false);
  return { pairs: 6, readonlyFailingPairs: readonlyFailures, writableControls, disabledControls, currentRenderingAccepted: false };
}
if (verifyOnly) {
  const report = JSON.parse(readFileSync(path.join(output, 'latest-report.json'))), summary = verify(report);
  let rejected = 0;
  for (const mutate of [r => r.results.pop(), r => r.results[3].site.root.children[0].readonly = false,
    r => r.results[3].samples[1].readonly = false, r => r.results[0].contractPass = !r.results[0].contractPass,
    r => r.inputs[0].sha256 = '0'.repeat(64), r => r.currentRenderingAccepted = true]) {
    const changed = structuredClone(report); mutate(changed); assert.throws(() => verify(changed)); rejected++;
  }
  console.log(JSON.stringify({ ...summary, negativeControlsRejected: rejected }));
} else {
  assert.ok(!existsSync(output), 'Use a fresh output path; never overwrite original evidence');
  const contents = `import '@angular/compiler';
import {provideZonelessChangeDetection} from '@angular/core';
import {createApplication} from '@angular/platform-browser';
import {Astylar} from 'astylarui';
const q=new URLSearchParams(location.search),mode=q.get('mode'),kind=q.get('kind');
const site={root:{children:[{type:'input',id:'control',inputType:'text',value:'Atlas',readonly:kind==='readonly',disabled:kind==='disabled'}]},styles:[
{selector:'*',margin:'0',padding:'0',boxSizing:'border-box'},
{selector:'#control',display:'block',width:'240px',height:'40px',padding:'8px',fontFamily:'Arial',fontSize:'16px',lineHeight:'20px',color:'#111111',background:'#ffffff',borderWidth:'1px',borderStyle:'solid',borderColor:'#000000'}]};
const authored=JSON.stringify(site),host=document.createElement(mode==='reference'?'div':'canvas');
host.style.cssText='display:block;width:390px;height:140px';document.body.append(host);let app,surface,library;
if(mode==='reference'){
 const style=document.createElement('style');style.textContent=site.styles.map(({selector,...s})=>selector+'{'+Object.entries(s).map(([k,v])=>k.replace(/[A-Z]/g,c=>'-'+c.toLowerCase())+':'+v).join(';')+'}').join('');document.head.append(style);
 const control=document.createElement('input');control.id='control';control.type='text';control.value='Atlas';control.readOnly=kind==='readonly';control.disabled=kind==='disabled';host.append(control);
}else{app=await createApplication({providers:[provideZonelessChangeDetection()]});library=app.injector.get(Astylar);surface=library.mount(host,site,{diagnostics:{logLevel:'silent'}});await surface.whenSettled();}
const settle=async()=>{await document.fonts.ready;if(surface)await surface.whenSettled();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));};await settle();
const control=document.querySelector(mode==='reference'?'#control':'[data-astylar-id="control"]'),events=[];if(!control)throw Error('Missing public input');
for(const type of ['focus','blur','keydown','keyup','input','change'])control.addEventListener(type,e=>events.push({type,key:e.key??null,trusted:e.isTrusted,value:control.value,readonly:control.readOnly}));
window.readonlyAudit={async focus(){control.focus();await settle();},settle,snapshot(){return{site,inputUnchanged:JSON.stringify(site)===authored,value:control.value,readonly:control.readOnly,disabled:control.disabled,focused:document.activeElement===control,events:structuredClone(events),diagnostics:surface?surface.diagnostics.messages:[]};},dispose(){surface?.dispose();app?.destroy();}};`;
  const require = createRequire(path.resolve('examples/material-showcase/package.json'));
  const built = await require('esbuild').build({ absWorkingDir: process.cwd(), stdin: {
    resolveDir: path.resolve('examples/material-showcase'), sourcefile: 'public-readonly-editing.mjs', contents,
  }, bundle: true, write: false, format: 'esm', platform: 'browser', target: 'es2022', metafile: true });
  const inputs = Object.keys(built.metafile.inputs).filter(f => path.basename(f) !== 'public-readonly-editing.mjs')
    .map(file => ({ file, sha256: hash(readFileSync(file)) }));
  assert.ok(!inputs.some(r => r.file.includes('material-showcase/src') || r.file.includes('astylarui/dist/lib/plugins/material')));
  mkdirSync(output, { recursive: true });
  const sourceFile = path.join(output, 'input.mjs'), bundleFile = path.join(output, 'audit.js'), htmlFile = path.join(output, 'index.html');
  writeFileSync(sourceFile, contents); writeFileSync(bundleFile, built.outputFiles[0].contents);
  writeFileSync(htmlFile, '<!doctype html><html><head><meta charset="utf-8"></head><body><script type="module" src="/audit.js"></script></body></html>');
  const report = { kind: 'public-readonly-editing', scriptSha256: hash(readFileSync(script)),
    source: { file: sourceFile, sha256: hash(readFileSync(sourceFile)) },
    bundle: { file: bundleFile, sha256: hash(readFileSync(bundleFile)) },
    html: { file: htmlFile, sha256: hash(readFileSync(htmlFile)) }, inputs, errors: [], results: [],
    readonlyFailingPairs: 0, currentRenderingAccepted: false,
    scope: 'Package-root equal authored inputs and real keyboard behavior only. No Material/plugin/callback/update;not raster,all keys,all browsers,current full-package or Material case acceptance.' };
  const server = createServer((req, res) => {
    const scriptRequest = new URL(req.url, 'http://127.0.0.1').pathname === '/audit.js';
    res.setHeader('content-type', scriptRequest ? 'text/javascript' : 'text/html');
    res.end(readFileSync(scriptRequest ? bundleFile : htmlFile));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); let browser;
  try {
    const launch = materialBrowserLaunchOptions(); browser = await chromium.launch(launch);
    report.browser = browser.version(); report.launch = await inspectMaterialBrowserLaunch(browser, launch);
    for (const dpr of [1, 2]) for (const kind of kinds) for (const mode of ['reference', 'astylar']) {
      const page = await browser.newPage({ viewport: { width: 400, height: 180 }, deviceScaleFactor: dpr }), assets = [];
      page.on('pageerror', e => report.errors.push(String(e)));
      page.on('response', async response => {
        if (new URL(response.url()).pathname === '/audit.js') assets.push({ url: response.url(), sha256: hash(await response.body()) });
      });
      try {
        await page.goto(`http://127.0.0.1:${server.address().port}/?${new URLSearchParams({ mode, kind })}`);
        await page.waitForFunction(() => !!window.readonlyAudit); await page.evaluate(() => window.readonlyAudit.focus());
        await page.keyboard.press('Home'); await page.evaluate(() => window.readonlyAudit.settle());
        const samples = [];
        const sample = async boundary => samples.push({ boundary, ...await page.evaluate(() => window.readonlyAudit.snapshot()) });
        await sample('focused-home');
        for (const [key, boundary] of [['x', 'typed-x'], ['Delete', 'delete'], ['Backspace', 'backspace']]) {
          await page.keyboard.press(key); await page.evaluate(() => window.readonlyAudit.settle()); await sample(boundary);
        }
        const expected = kind === 'writable' ? ['Atlas', 'xAtlas', 'xtlas', 'tlas'] : ['Atlas', 'Atlas', 'Atlas', 'Atlas'];
        const contractPass = JSON.stringify(samples.map(s => s.value)) === JSON.stringify(expected);
        if (kind === 'readonly' && mode === 'astylar' && !contractPass) report.readonlyFailingPairs++;
        report.results.push({ dpr, kind, mode, site: samples[0].site, inputUnchanged: samples.every(s => s.inputUnchanged),
          diagnostics: samples.flatMap(s => s.diagnostics), samples, assets, contractPass });
        await page.evaluate(() => window.readonlyAudit.dispose());
      } finally { await page.close(); }
    }
    for (const receipt of inputs) assert.equal(hash(readFileSync(receipt.file)), receipt.sha256, 'Build input changed');
    const summary = verify(report); writeFileSync(path.join(output, 'latest-report.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify({ output, ...summary, browser: report.browser, reportSha256: hash(readFileSync(path.join(output, 'latest-report.json'))) }));
  } catch (error) {
    writeFileSync(path.join(output, 'failure.json'), JSON.stringify({ error: String(error), report }, null, 2) + '\n'); throw error;
  } finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
}
