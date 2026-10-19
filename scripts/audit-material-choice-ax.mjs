import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import ts from 'typescript';
import { chromium } from 'playwright-core';
import { materialInteractionCases } from '../tests/material-parity/benchmark.config.mjs';
import { interactionLayerCursorProbe } from '../tests/material-parity/cursor-metrics.mjs';
import { propertyGroups } from '../tests/material-parity/input-equivalence-policy.mjs';
import { fingerprintDirectory, fingerprintModuleGraph, materialBrowserLaunchOptions,
  inspectMaterialBrowserLaunch, materialCaseKey, openMaterialCheckpoint } from '../tests/material-parity/run-checkpoint.mjs';
import { openSupplementalCapture, validateSupplementalCapture } from '../tests/material-parity/supplemental-capture-evidence.mjs';

// Actual AX exposure is absent from retained DOM-only choice focus witnesses.
// Reuse exact configured focus/theme/settlement and the existing CDP AX query.
const script = 'scripts/audit-material-choice-ax.mjs', hash = b => createHash('sha256').update(b).digest('hex');
const properties = Object.values(propertyGroups).flat();
const cases = materialInteractionCases.filter(c => ['checkbox', 'radio'].includes(c.family) && c.state === 'focus');
assert.equal(cases.length, 16);
const runnerFile = 'tests/material-parity/run-material-parity.mjs', runner = readFileSync(runnerFile);
const ast = ts.createSourceFile(runnerFile, runner.toString(), 99, true, ts.ScriptKind.JS);
const names = ['performInteraction', 'interactionTargetBox', 'settleInteraction', 'profileTheme', 'sendShowcaseCommand', 'waitForThemeApplied'];
const methods = names.map(name => {
  const found = ast.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
  assert.equal(found.length, 1); return found[0].getText(ast);
});
const actionSource = { file: runnerFile, sha256: hash(runner), methodsSha256: hash(methods.join('\n')) };
const actions = new Function('assert', 'interactionLayerCursorProbe', methods.join('\n') +
  ';return {performInteraction,settleInteraction,profileTheme,sendShowcaseCommand,waitForThemeApplied};')(assert, interactionLayerCursorProbe);
function selectors(family, side) {
  if (family === 'checkbox') return { checkbox: side === 'reference' ? '#checkbox-primary input[type="checkbox"]' : '[data-astylar-id="checkbox-primary"]' };
  return side === 'reference'
    ? { group: '#radio-primary', solo: '#radio-primary input[value="solo"]', team: '#radio-primary input[value="team"]' }
    : { group: '[data-astylar-id="radio-primary"]', solo: '[data-astylar-id="radio-solo"]', team: '[data-astylar-id="radio-team"]' };
}
function verify(report, file) {
  const manifest = JSON.parse(readFileSync(report.capture.checkpointManifest.file));
  assert.deepEqual(validateSupplementalCapture(report, { reportFile: file, expectedProvenance: manifest.provenance,
    script, styleProperties: properties }), { status: 'checkpoint-bound', errors: [] });
  for (const r of [...manifest.provenance.harnessFiles, ...manifest.provenance.diagnosticFiles]) assert.equal(hash(readFileSync(r.file)), r.sha256);
  assert.deepEqual(report.actionSource, actionSource);
  assert.deepEqual(report.results.map(r=>r.caseId), cases.map(c=>materialCaseKey('interaction',c)));
  let targets = 0;
  for (const row of report.results) for (const side of ['reference','astylar']) {
    const evidence = row[side]; assert.equal(evidence.boundary, 'after-exact-configured-focus-and-settlement');
    assert.deepEqual(Object.keys(evidence.ax), Object.keys(selectors(row.family,side)));
    for (const [key,target] of Object.entries(evidence.ax)) {
      assert.equal(target.selector,selectors(row.family,side)[key]); assert.ok(target.backendNodeId>0);
      assert.ok(target.nodes.some(n=>n.backendDOMNodeId===target.backendNodeId));
      assert.equal(typeof target.dom.focused,'boolean'); targets++;
    }
  }
  assert.equal(targets,64);
  return { cases:16,targetObservations:targets,reportSha256:hash(readFileSync(file)),scope:'Actual AX/DOM observations only;not AT behavior,paint,current rendering or whole-case closure.' };
}
if (process.argv[2]==='--verify') {
  const file=process.argv[3];console.log(JSON.stringify(verify(JSON.parse(readFileSync(file)),file)));
} else {
  const output=path.resolve(process.argv[2]??'');
  assert.ok(output.startsWith(path.resolve('artifacts/material-parity')+path.sep)); assert.ok(!existsSync(output));
  const root=path.resolve('artifacts/material-parity/icon-fresh-producer-retained-build-20261016-browser');
  const server=createServer((req,res)=>{
    const name=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname), candidate=path.resolve(root,name.replace(/^\/+/,''));
    const file=candidate.startsWith(root+path.sep)&&path.extname(candidate)&&existsSync(candidate)?candidate:path.join(root,'index.csr.html');
    res.writeHead(200,{'content-type':{'.js':'text/javascript','.css':'text/css','.woff2':'font/woff2'}[path.extname(file)]??'text/html','cache-control':'no-store'});
    res.end(readFileSync(file));
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
  try {
    const launch=materialBrowserLaunchOptions();browser=await chromium.launch(launch);
    const provenance={browser:browser.version(),browserLaunch:await inspectMaterialBrowserLaunch(browser,launch),
      browserFiles:fingerprintDirectory(root),harnessFiles:fingerprintModuleGraph(process.cwd(),runnerFile),diagnosticFiles:fingerprintModuleGraph(process.cwd(),script)};
    openMaterialCheckpoint({directory:output+'-provenance',provenance});
    const baseUrl=`http://127.0.0.1:${server.address().port}`;
    const evidence=openSupplementalCapture({options:{baseUrl,checkpoint:output+'-provenance/checkpoint',output},browser,script,styleProperties:properties}),results=[];
    for(const c of cases){
      const context=await browser.newContext({viewport:{width:c.viewport.width,height:c.viewport.height},deviceScaleFactor:c.viewport.deviceScaleFactor,
        colorScheme:c.profile==='dark'?'dark':'light',reducedMotion:'reduce'});
      const row={family:c.family,profile:c.profile,viewport:c.viewport,state:c.state,caseId:materialCaseKey('interaction',c)};
      try{for(const side of ['reference','astylar']){
        const page=await context.newPage(),finish=evidence.observe(page);
        try{
          await page.goto(`${baseUrl}/${side}/${c.family}?benchmark=1&profile=${c.profile}&interaction=focus`,{waitUntil:'commit'});
          await page.locator('.frame').waitFor({state:'visible'});
          const theme=actions.profileTheme(c.profile);await actions.sendShowcaseCommand(page,{type:'showcase:theme',theme});await actions.waitForThemeApplied(page,theme);
          if(side==='astylar')await page.waitForFunction(()=>!!window.__ASTYLAR_MATERIAL_BENCHMARK__);
          await actions.settleInteraction(page,side);await actions.sendShowcaseCommand(page,{type:'showcase:benchmark',phase:'start'});
          await actions.performInteraction(page,side,c);await actions.settleInteraction(page,side);
          await actions.sendShowcaseCommand(page,{type:'showcase:benchmark',phase:'settled'});
          const cdp=await context.newCDPSession(page),{root:document}=await cdp.send('DOM.getDocument'),ax={};
          for(const [key,selector] of Object.entries(selectors(c.family,side))){
            const {nodeId}=await cdp.send('DOM.querySelector',{nodeId:document.nodeId,selector});assert.ok(nodeId);
            const {node}=await cdp.send('DOM.describeNode',{nodeId});
            const dom=await page.locator(selector).evaluate(n=>({tag:n.tagName,text:n.textContent,role:n.getAttribute('role'),id:n.id,
              ariaChecked:n.getAttribute('aria-checked'),checked:'checked'in n?n.checked:null,disabled:'disabled'in n?n.disabled:null,
              ariaLabel:n.getAttribute('aria-label'),labelledby:n.getAttribute('aria-labelledby'),describedby:n.getAttribute('aria-describedby'),
              labels:n.labels?[...n.labels].map(l=>({id:l.id,text:l.textContent})):null,focused:n===document.activeElement}));
            ax[key]={selector,backendNodeId:node.backendNodeId,dom,...await cdp.send('Accessibility.getPartialAXTree',{nodeId,fetchRelatives:true})};
          }
          await cdp.detach();row[side]={boundary:'after-exact-configured-focus-and-settlement',ax,runtime:await finish()};
        }finally{await page.close();}
      }results.push(row);console.log(JSON.stringify({caseId:row.caseId}));}finally{await context.close();}
    }
    const report={schemaVersion:1,browser:browser.version(),capture:evidence.capture,actionSource,results,
      scope:'Actual checkbox/radio AX at configured focus endpoints;retained build,no new pixel or AT acceptance.'};
    const file=`${evidence.directory}/latest-report.json`;writeFileSync(file,JSON.stringify(report)+'\n',{flag:'wx'});
    console.log(JSON.stringify(verify(report,file)));
  }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
}
