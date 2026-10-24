import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

// Reuse the existing authenticated server/assets/settlement workflow. Replace
// baseline instrumentation rather than recapturing already settled metrics.
const prior = 'scripts/audit-material-divider-baselines.mjs';
let source = readFileSync(prior, 'utf8');
assert.equal(createHash('sha256').update(source).digest('hex'), 'bb87aa6576b1c52b9c2aa077a94ddba832802942c0096fac3717d3ca2eac638f');
const replace = (before, after) => { assert.equal(source.split(before).length, 2); source = source.replace(before, after); };
replace("'../tests/material-parity/run-checkpoint.mjs'", JSON.stringify(pathToFileURL(path.resolve('tests/material-parity/run-checkpoint.mjs')).href));
replace("'playwright-core'", JSON.stringify(import.meta.resolve('playwright-core')));
replace('readFileSync(import.meta.filename)', "readFileSync('scripts/audit-material-divider-paint-context.mjs')");
const start = source.indexOf('    await page.addInitScript(');
const end = source.indexOf('    try{\n      await page.goto', start);
assert.ok(start > 0 && end > start);
source = source.slice(0, start) + source.slice(end);
const observationStart = source.indexOf('      const observation=await page.evaluate(');
const observationEnd = source.indexOf('      await Promise.all(pending);', observationStart);
assert.ok(observationStart > 0 && observationEnd > observationStart);
source = source.slice(0, observationStart) + `      const observation=await page.evaluate(side=>{
        const properties=['backgroundImage','filter','backdropFilter','mixBlendMode','isolation','backgroundColor','opacity'];
        const chain=element=>{
          const rows=[];
          for(let owner=element;owner;owner=owner.parentElement){
            const style=getComputedStyle(owner);
            rows.push({tag:owner.tagName.toLowerCase(),id:owner.id,class:owner.className,
              values:Object.fromEntries(properties.map(property=>[property,style[property]]))});
          }
          return rows;
        };
        if(side==='reference')return {properties,targets:['divider-above','divider-below'].map(id=>{
          const element=document.getElementById(id);if(!element)throw Error('Missing native paint owner '+id);
          return {id,chain:chain(element)};
        })};
        const canvas=document.querySelector('astylar-surface canvas');
        if(!canvas)throw Error('Missing candidate canvas host');
        return {properties,targets:[{id:'canvas-host',chain:chain(canvas)}]};
      },side);
      assert.equal(observation.targets.length,side==='reference'?2:1);
      assert.ok(observation.targets.every(target=>target.chain.at(-1).tag==='html'));
` + source.slice(observationEnd);
replace("boundary:'Fresh four-profile desktop DPR1 baseline diagnostic on authenticated served bytes. Marker-only native intervention preserves measured bounds;candidate draw coordinates remain texture-local. Not old-browser replay,global baseline equality,current core-source equivalence or full-case acceptance.'",
  "boundary:'Read-only four-profile desktop DPR1 missing computed-paint fields on authenticated retained served bytes. Native leaf-to-HTML and candidate canvas-host-to-HTML only;not candidate logical material execution,original-browser replay,all viewports,current core or whole-case acceptance.'");
await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
