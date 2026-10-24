import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

// Fill only the missing actual frame-box boundary. No baseline/paint intervention.
const prior = 'scripts/audit-material-divider-baselines.mjs';
let source = readFileSync(prior, 'utf8');
assert.equal(createHash('sha256').update(source).digest('hex'), 'bb87aa6576b1c52b9c2aa077a94ddba832802942c0096fac3717d3ca2eac638f');
const replace = (before, after) => { assert.equal(source.split(before).length, 2); source = source.replace(before, after); };
replace("'../tests/material-parity/run-checkpoint.mjs'", JSON.stringify(pathToFileURL(path.resolve('tests/material-parity/run-checkpoint.mjs')).href));
replace("'playwright-core'", JSON.stringify(import.meta.resolve('playwright-core')));
replace('readFileSync(import.meta.filename)', "readFileSync('scripts/audit-material-divider-frame-sizes.mjs')");
replace("for(const profile of ['light','dark','contrast','custom'])for(const side of ['reference','astylar'])",
  "for(const context of [{id:'desktop',width:1440,height:1000,deviceScaleFactor:1},{id:'tablet',width:768,height:1024,deviceScaleFactor:1},{id:'mobile',width:390,height:844,deviceScaleFactor:2},{id:'comparison',width:609,height:844,deviceScaleFactor:1},{id:'desktop-dpr2',width:1440,height:1000,deviceScaleFactor:2}])for(const profile of ['light','dark','contrast','custom'])for(const side of ['reference','astylar'])");
replace('viewport:{width:1440,height:1000},deviceScaleFactor:1', 'viewport:{width:context.width,height:context.height},deviceScaleFactor:context.deviceScaleFactor');
replace('results.push({profile,side,observation,assets})', "results.push({profile,side,context,observation,assets});console.log(JSON.stringify({phase:'frame-size-observation',profile,side,context,observation}))");
const start = source.indexOf('    await page.addInitScript(');
const end = source.indexOf('    try{\n      await page.goto', start);
assert.ok(start > 0 && end > start);
source = source.slice(0, start) + source.slice(end);
const observationStart = source.indexOf('      const observation=await page.evaluate(');
const observationEnd = source.indexOf('      await Promise.all(pending);', observationStart);
assert.ok(observationStart > 0 && observationEnd > observationStart);
source = source.slice(0, observationStart) + `      const observation=await page.evaluate(side=>{
        const rect=b=>({left:b.left,top:b.top,right:b.right,bottom:b.bottom,width:b.width,height:b.height});
        const host=document.querySelector('.frame');
        const common={viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},hostBox:rect(host.getBoundingClientRect())};
        if(side==='reference'){
          const style=getComputedStyle(host);
          return {...common,frameBox:common.hostBox,computed:Object.fromEntries(['width','height','minHeight','maxHeight','boxSizing','paddingTop','paddingRight','paddingBottom','paddingLeft','marginTop','marginRight','marginBottom','marginLeft','overflowX','overflowY'].map(key=>[key,style[key]]))};
        }
        const surface=window.ng.getComponent(document.querySelector('astylar-surface')).surface();
        const page=surface.inspectResolvedStyles().elements.find(row=>row.id==='page');
        const measured=window.__ASTYLAR_MATERIAL_BENCHMARK__.measure(['page'],false).elements.page;
        if(!page?.retainedLayout||!measured?.exists)throw Error('Missing candidate frame geometry');
        const canvas=rect(document.querySelector('astylar-surface canvas').getBoundingClientRect());
        const b=measured.borderBox;
        return {...common,canvasBox:canvas,frameBox:{...b,left:b.left+canvas.left,right:b.right+canvas.left,top:b.top+canvas.top,bottom:b.bottom+canvas.top},
          retained:page.retainedLayout,normal:page.normal,effective:page.effective,
          errors:surface.diagnostics.messages.filter(row=>row.severity==='error')};
      },side);
      assert.deepEqual(observation.viewport,{width:context.width,height:context.height,dpr:context.deviceScaleFactor});
      if(side==='astylar')assert.deepEqual(observation.errors,[]);
` + source.slice(observationEnd);
replace("boundary:'Fresh four-profile desktop DPR1 baseline diagnostic on authenticated served bytes. Marker-only native intervention preserves measured bounds;candidate draw coordinates remain texture-local. Not old-browser replay,global baseline equality,current core-source equivalence or full-case acceptance.'",
  "boundary:'Read-only actual native frame and candidate retained/projected page boxes in20 retained served-build physical contexts. Existing public geometry helper supplies projection;no layout mutation. Not original case/browser replay,full input equivalence,paint/current-core or whole-case acceptance.'");
await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
