import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { materialBrowserLaunchOptions, inspectMaterialBrowserLaunch } from '../tests/material-parity/run-checkpoint.mjs';

// Public package-root reduction of the observed semantic text-transform gap.
// No Material plugin, geometry projection, screenshot or renderer intervention.
const script = 'scripts/audit-public-text-transform-ax.mjs';
const hash = b => createHash('sha256').update(b).digest('hex');
const transforms = ['none', 'capitalize', 'uppercase'];
const expectedName = transform => ({ none: 'project atlas', capitalize: 'Project Atlas', uppercase: 'PROJECT ATLAS' })[transform];
function verify(report, output) {
  assert.equal(report.kind, 'public-text-transform-ax');
  assert.equal(report.scriptSha256, hash(readFileSync(script)));
  assert.equal(hash(readFileSync(path.join(output, 'audit.js'))), report.runtime.bundleSha256);
  assert.equal(hash(readFileSync(path.join(output, 'index.html'))), report.runtime.htmlSha256);
  assert.deepEqual(report.errors, []);
  for (const receipt of report.inputs) assert.equal(hash(readFileSync(receipt.file)), receipt.sha256);
  assert.deepEqual(report.results.map(r => `${r.dpr}/${r.transform}`), [1, 2].flatMap(d => transforms.map(t => `${d}/${t}`)));
  let controls = 0, mismatches = 0;
  for (const row of report.results) {
    assert.deepEqual(row.reference.site, row.astylar.site);
    assert.equal(row.reference.site.root.children[0].textContent, 'project atlas');
    assert.equal(row.reference.site.styles[1].textTransform, row.transform);
    for (const side of ['reference', 'astylar']) {
      const observation = row[side];
      assert.equal(observation.inputUnchanged, true); assert.deepEqual(observation.errors, []);
      assert.equal(observation.resolvedTransform, row.transform);
      assert.equal(observation.dom.tag, 'H1'); assert.equal(observation.dom.text, 'project atlas');
      assert.ok(observation.backendNodeId > 0);
      const node = observation.ax.nodes[0];
      assert.equal(node.backendDOMNodeId, observation.backendNodeId);
      assert.equal(node.ignored, false); assert.equal(node.role.value, 'heading');
      assert.equal(node.properties.find(p => p.name === 'level').value.value, 1);
      for (const type of ['document', 'script']) assert.ok(observation.assets.some(a => a.type === type && a.sha256 === report.runtime[type === 'document' ? 'htmlSha256' : 'bundleSha256']));
    }
    const native = row.reference.ax.nodes[0].name.value, candidate = row.astylar.ax.nodes[0].name.value;
    assert.equal(native, expectedName(row.transform)); assert.equal(candidate, 'project atlas');
    if (row.transform === 'none') { assert.equal(native, candidate); controls++; }
    else { assert.notEqual(native, candidate); mismatches++; }
  }
  return { pairs: 6, noTransformControls: controls, equalInputSemanticMismatches: mismatches, currentRenderingAccepted: false };
}
const verifyOnly = process.argv[2] === '--verify', output = path.resolve(process.argv[verifyOnly ? 3 : 2] ?? '');
assert.ok(output.startsWith(path.resolve('artifacts/material-parity') + path.sep));
if (verifyOnly) {
  const report = JSON.parse(readFileSync(path.join(output, 'latest-report.json'))), summary = verify(report, output);
  let rejected = 0;
  for (const mutate of [r => r.results.pop(), r => { r.results[0].astylar.site.styles[1].textTransform = 'uppercase'; },
    r => { r.results[1].astylar.ax.nodes[0].name.value = 'Project Atlas'; }]) {
    const forged = structuredClone(report); mutate(forged); assert.throws(() => verify(forged, output)); rejected++;
  }
  console.log(JSON.stringify({ ...summary, negativeControlsRejected: rejected }));
} else {
  assert.ok(!existsSync(output), 'Never overwrite original/failure evidence');
  const require = createRequire(path.resolve('examples/material-showcase/package.json'));
  const contents = `import '@angular/compiler';
import {provideZonelessChangeDetection} from '@angular/core';
import {createApplication} from '@angular/platform-browser';
import {Astylar} from 'astylarui';
const q=new URLSearchParams(location.search),mode=q.get('mode'),transform=q.get('transform');
const site={root:{children:[{type:'h1',id:'title',textContent:'project atlas'}]},styles:[
 {selector:'*',margin:'0',padding:'0',boxSizing:'border-box'},
 {selector:'#title',fontFamily:'Arial, sans-serif',fontSize:'24px',lineHeight:'30px',textTransform:transform}]};
const before=JSON.stringify(site),host=document.createElement(mode==='reference'?'div':'canvas');
host.style.cssText='display:block;width:400px;height:160px';document.body.append(host);
let app,surface;
if(mode==='reference'){
 const style=document.createElement('style');style.textContent=site.styles.map(({selector,...s})=>selector+'{'+Object.entries(s).map(([k,v])=>k.replace(/[A-Z]/g,c=>'-'+c.toLowerCase())+':'+v).join(';')+'}').join('');document.head.append(style);
 const title=document.createElement('h1');title.id='title';title.textContent='project atlas';host.append(title);
}else{app=await createApplication({providers:[provideZonelessChangeDetection()]});surface=app.injector.get(Astylar).mount(host,site,{diagnostics:{logLevel:'silent'}});await surface.whenSettled();}
await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
window.transformAudit={snapshot:()=>({site,inputUnchanged:JSON.stringify(site)===before,resolvedTransform:mode==='reference'?getComputedStyle(document.getElementById('title')).textTransform:surface.inspectResolvedStyles().elements.find(e=>e.id==='title').effective.textTransform,errors:surface?.diagnostics.messages.filter(m=>m.severity==='error')??[]}),dispose:()=>{surface?.dispose();app?.destroy();}};`;
  const built = await require('esbuild').build({ absWorkingDir: process.cwd(), stdin: { contents, resolveDir: path.resolve('examples/material-showcase'), sourcefile: 'public-text-transform-ax.mjs' }, bundle: true, write: false, format: 'esm', platform: 'browser', target: 'es2022', metafile: true });
  const bundle = built.outputFiles[0].contents, html = '<!doctype html><script type="module" src="/audit.js"></script>';
  const inputs = Object.keys(built.metafile.inputs).filter(f => existsSync(f)).sort().map(file => ({ file, sha256: hash(readFileSync(file)) }));
  mkdirSync(output); writeFileSync(path.join(output, 'audit.js'), bundle); writeFileSync(path.join(output, 'index.html'), html);
  const server = createServer((req, res) => { const js = req.url === '/audit.js'; res.setHeader('content-type', js ? 'text/javascript' : 'text/html'); res.end(js ? bundle : html); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const launch = materialBrowserLaunchOptions(), browser = await chromium.launch(launch), errors = [], results = [];
  try {
    const runtime = { browser: browser.version(), launch: await inspectMaterialBrowserLaunch(browser, launch), bundleSha256: hash(bundle), htmlSha256: hash(html) };
    for (const dpr of [1, 2]) for (const transform of transforms) {
      const row = { dpr, transform };
      for (const mode of ['reference', 'astylar']) {
        const page = await browser.newPage({ viewport: { width: 400, height: 160 }, deviceScaleFactor: dpr }), assets = [];
        page.on('pageerror', error => errors.push(String(error)));
        page.on('response', response => { if (['script', 'document'].includes(response.request().resourceType())) assets.push(response.body().then(b => ({ type: response.request().resourceType(), sha256: hash(b) }))); });
        try {
          await page.goto(`http://127.0.0.1:${server.address().port}/?mode=${mode}&transform=${transform}`);
          await page.waitForFunction(() => !!window.transformAudit);
          const observation = await page.evaluate(() => window.transformAudit.snapshot());
          const selector = mode === 'reference' ? '#title' : '[data-astylar-id="title"]';
          const cdp = await page.context().newCDPSession(page), { root } = await cdp.send('DOM.getDocument');
          const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector }); assert.ok(nodeId);
          const { node } = await cdp.send('DOM.describeNode', { nodeId });
          row[mode] = { ...observation, backendNodeId: node.backendNodeId,
            dom: await page.locator(selector).evaluate(n => ({ tag: n.tagName, text: n.textContent })),
            ax: await cdp.send('Accessibility.getPartialAXTree', { nodeId, fetchRelatives: true }), assets: await Promise.all(assets) };
          await page.evaluate(() => window.transformAudit.dispose());
        } finally { await page.close(); }
      }
      results.push(row);
    }
    const report = { kind: 'public-text-transform-ax', scriptSha256: hash(readFileSync(script)), inputs, runtime, errors, results };
    writeFileSync(path.join(output, 'latest-report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(verify(report, output)));
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
}
