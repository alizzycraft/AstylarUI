import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

// Reuse authenticated retained-build workflow;only add the missing heading observation.
const base = 'scripts/audit-material-divider-baselines.mjs';
let source = readFileSync(base, 'utf8');
assert.equal(createHash('sha256').update(source).digest('hex'), 'bb87aa6576b1c52b9c2aa077a94ddba832802942c0096fac3717d3ca2eac638f');
const replace = (before,after) => { assert.equal(source.split(before).length,2); source=source.replace(before,after); };
replace("'../tests/material-parity/run-checkpoint.mjs'", JSON.stringify(pathToFileURL(path.resolve('tests/material-parity/run-checkpoint.mjs')).href));
replace("'playwright-core'", JSON.stringify(import.meta.resolve('playwright-core')));
replace('readFileSync(import.meta.filename)', "readFileSync('scripts/audit-material-divider-heading-boxes.mjs')");
const start=source.indexOf('    await page.addInitScript('),end=source.indexOf('    try{\n      await page.goto',start);
assert.ok(start>0&&end>start);source=source.slice(0,start)+source.slice(end);
const a=source.indexOf('      const observation=await page.evaluate('),b=source.indexOf('      await Promise.all(pending);',a);
assert.ok(a>0&&b>a);
source=source.slice(0,a)+`      const observation=await page.evaluate(side=>{
        const rect=b=>({left:b.left,top:b.top,width:b.width,height:b.height});
        const context={width:innerWidth,height:innerHeight,dpr:devicePixelRatio,fontsReady:document.fonts.status};
        if(side==='reference')return {context,headings:['title','eyebrow'].map(id=>{
          const node=document.querySelector(id==='title'?'.frame h1':'.frame .eyebrow');
          if(!node)throw Error('Missing native heading '+id);
          const range=document.createRange();range.selectNodeContents(node);const style=getComputedStyle(node);
          return {id,text:node.textContent,box:rect(node.getBoundingClientRect()),range:rect(range.getBoundingClientRect()),
            style:Object.fromEntries(['fontFamily','fontSize','fontWeight','lineHeight','opacity','color','overflowX','overflowY','clip','clipPath','textTransform'].map(k=>[k,style[k]]))};
        })};
        const surface=window.ng.getComponent(document.querySelector('astylar-surface')).surface();
        const inspected=surface.inspectResolvedStyles();
        const measured=window.__ASTYLAR_MATERIAL_BENCHMARK__.measure(['title','eyebrow'],false);
        return {context,headings:['title','eyebrow'].map(id=>{
          const entry=inspected.elements.find(e=>e.id===id),box=measured.elements[id];
          if(!entry?.retainedLayout||!box?.exists)throw Error('Missing retained heading '+id);
          return {id,retainedLayout:entry.retainedLayout,retainedText:entry.retainedText,
            normal:entry.normal,effective:entry.effective,projected:box.borderBox,paintDepth:box.paintDepth};
        }),errors:surface.diagnostics.messages.filter(e=>e.severity==='error')};
      },side);
      assert.equal(observation.headings.length,2);assert.equal(observation.context.fontsReady,'loaded');
      if(side==='astylar')assert.deepEqual(observation.errors,[]);
`+source.slice(b);
replace("boundary:'Fresh four-profile desktop DPR1 baseline diagnostic on authenticated served bytes. Marker-only native intervention preserves measured bounds;candidate draw coordinates remain texture-local. Not old-browser replay,global baseline equality,current core-source equivalence or full-case acceptance.'",
  "boundary:'Read-only title/eyebrow native boxes/ranges and public retained CSS layout plus existing projected measurement in four desktop-DPR1 themes. No marker/style/input edits,new build or raster. Native mask/unequal paint remain;not original browser replay,current core,equal inputs,glyph clipping or whole-case acceptance.'");
await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
