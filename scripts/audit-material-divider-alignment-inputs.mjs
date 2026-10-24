import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

// Reuse the frozen served-build/response authentication and settlement workflow.
// Variants exist only in this page's public surface updates,never in fixtures.
const prior = 'scripts/audit-material-divider-baselines.mjs';
let source = readFileSync(prior, 'utf8');
assert.equal(createHash('sha256').update(source).digest('hex'), 'bb87aa6576b1c52b9c2aa077a94ddba832802942c0096fac3717d3ca2eac638f');
const replace = (before, after) => { assert.equal(source.split(before).length, 2); source = source.replace(before, after); };
replace("'../tests/material-parity/run-checkpoint.mjs'", JSON.stringify(pathToFileURL(path.resolve('tests/material-parity/run-checkpoint.mjs')).href));
replace("'playwright-core'", JSON.stringify(import.meta.resolve('playwright-core')));
replace('readFileSync(import.meta.filename)', "readFileSync('scripts/audit-material-divider-alignment-inputs.mjs')");
replace("for(const side of ['reference','astylar'])", "for(const side of ['astylar'])");
const start = source.indexOf('    await page.addInitScript(');
const end = source.indexOf('    try{\n      await page.goto', start);
assert.ok(start > 0 && end > start);
source = source.slice(0, start) + source.slice(end);
const observationStart = source.indexOf('      const observation=await page.evaluate(');
const observationEnd = source.indexOf('      await Promise.all(pending);', observationStart);
assert.ok(observationStart > 0 && observationEnd > observationStart);
source = source.slice(0, observationStart) + `      const observation=await page.evaluate(async()=>{
        const component=window.ng.getComponent(document.querySelector('astylar-surface'));
        const surface=component.surface(),original=structuredClone(component.siteData());
        const ids=['divider-above-row','divider-above','divider-below-row','divider-below'];
        const fields=['alignItems','alignContent','justifyContent'];
        const snapshot=()=>{
          const elements=surface.inspectResolvedStyles().elements;
          return ids.map(id=>{
            const row=elements.find(element=>element.id===id);
            if(!row?.retainedLayout)throw Error('Missing retained layout '+id);
            return {id,values:Object.fromEntries(fields.map(field=>[field,row.effective[field]])),layout:row.retainedLayout};
          });
        };
        const settle=async data=>{
          await surface.update(data);await surface.whenSettled();
          await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
          return snapshot();
        };
        const initial=snapshot(),variants=[];
        const variant=(overrides)=>({...structuredClone(original),styles:[...structuredClone(original.styles),
          ...ids.map(id=>({selector:'#'+id,...overrides}))]});
        let restored;
        try{
          for(const field of fields){
            const data=variant({[field]:'normal'});
            variants.push({name:field,overrides:{[field]:'normal'},rows:await settle(data)});
          }
          const overrides=Object.fromEntries(fields.map(field=>[field,'normal']));
          variants.push({name:'combined',overrides,rows:await settle(variant(overrides))});
          const height=initial.find(row=>row.id==='divider-above-row').layout.height+3;
          const data=structuredClone(original);
          data.styles.push({selector:'#divider-above-row',height:height+'px'});
          variants.push({name:'height-control',requestedHeight:height,rows:await settle(data)});
        }finally{restored=await settle(original);}
        return {dpr:devicePixelRatio,viewport:[innerWidth,innerHeight],original,initial,variants,restored,
          originalUnchanged:JSON.stringify(original)===JSON.stringify(component.siteData()),
          errors:surface.diagnostics.messages.filter(message=>message.severity==='error')};
      });
      console.log(JSON.stringify({phase:'alignment-observation',profile,side,observation}));
      assert.equal(observation.originalUnchanged,true);assert.deepEqual(observation.errors,[]);
      assert.equal(observation.dpr,1);assert.deepEqual(observation.viewport,[1440,1000]);
      assert.equal(observation.variants.length,5);
      const layouts=rows=>rows.map(row=>({id:row.id,layout:row.layout}));
      for(const variant of observation.variants.slice(0,4)){
        for(const row of variant.rows)for(const [field,value]of Object.entries(variant.overrides))assert.equal(row.values[field],value);
        assert.deepEqual(layouts(variant.rows),layouts(observation.initial));
      }
      const control=observation.variants[4];
      assert.equal(control.rows.find(row=>row.id==='divider-above-row').layout.height,control.requestedHeight);
      assert.notDeepEqual(layouts(control.rows),layouts(observation.initial));
      assert.deepEqual(observation.restored,observation.initial);
` + source.slice(observationEnd);
replace("boundary:'Fresh four-profile desktop DPR1 baseline diagnostic on authenticated served bytes. Marker-only native intervention preserves measured bounds;candidate draw coordinates remain texture-local. Not old-browser replay,global baseline equality,current core-source equivalence or full-case acceptance.'",
  "boundary:'Four-theme desktop DPR1 diagnostic public updates on authenticated retained served build. Individual/combined normal alignment inputs preserve retained layouts;positive height control changes geometry and original data restore. Not historical replay,native alignment equivalence,paint,all viewports,current core or whole-case acceptance.'");
await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
