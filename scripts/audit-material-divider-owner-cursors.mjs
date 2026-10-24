import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

// One missing target cohort; reuse retained-build authentication and lifecycle.
const base = 'scripts/audit-material-divider-baselines.mjs';
let source = readFileSync(base, 'utf8');
assert.equal(createHash('sha256').update(source).digest('hex'), 'bb87aa6576b1c52b9c2aa077a94ddba832802942c0096fac3717d3ca2eac638f');
const replace = (before, after) => { assert.equal(source.split(before).length, 2); source = source.replace(before, after); };
replace("'../tests/material-parity/run-checkpoint.mjs'", JSON.stringify(pathToFileURL(path.resolve('tests/material-parity/run-checkpoint.mjs')).href));
replace("'playwright-core'", JSON.stringify(import.meta.resolve('playwright-core')));
replace('readFileSync(import.meta.filename)', "readFileSync('scripts/audit-material-divider-owner-cursors.mjs')");
const init = source.indexOf('    await page.addInitScript('), endInit = source.indexOf('    try{\n      await page.goto', init);
assert.ok(init > 0 && endInit > init); source = source.slice(0, init) + source.slice(endInit);
const start = source.indexOf('      const observation=await page.evaluate('), end = source.indexOf('      await Promise.all(pending);', start);
assert.ok(start > 0 && end > start);
source = source.slice(0, start) + `      const observation = { points: [] };
      for (const id of ['page','eyebrow','title','divider-above-row','divider-below-row']) {
        const target = await page.evaluate(({side,id}) => {
          const rect = b => ({left:b.left,top:b.top,width:b.width,height:b.height});
          if (side === 'reference') {
            const node = id === 'page' ? document.querySelector('.frame') : id === 'title' ? document.querySelector('.frame h1') :
              id === 'eyebrow' ? document.querySelector('.frame .eyebrow') : document.getElementById(id.replace('-row','')).parentElement;
            if (!node) throw Error('Missing owner '+id);
            const box = rect(node.getBoundingClientRect());
            let textBox;
            if (id === 'title' || id === 'eyebrow') { const range=document.createRange();range.selectNodeContents(node);textBox=rect(range.getBoundingClientRect()); }
            return {box,textBox,intendedType:node.tagName.toLowerCase(),point:textBox ? {x:textBox.left+6,y:textBox.top+textBox.height/2} :
              {x:box.left+box.width-4,y:box.top+(id==='page'?8:box.height/2)}};
          }
          const measured=window.__ASTYLAR_MATERIAL_BENCHMARK__.measure([id],false).elements[id];
          if (!measured?.exists) throw Error('Missing projected owner '+id);
          const box=rect(measured.borderBox),canvas=document.querySelector('canvas').getBoundingClientRect();
          return {box,intendedId:id,point:{x:canvas.left+box.left+(id==='title'||id==='eyebrow'?6:box.width-4),
            y:canvas.top+box.top+(id==='page'?8:box.height/2)}};
        },{side,id});
        assert.ok(Number.isFinite(target.point.x)&&Number.isFinite(target.point.y));
        const inViewport=target.point.x>=0&&target.point.x<1440&&target.point.y>=0&&target.point.y<1000;
        if (!inViewport) {observation.points.push({id,...target,inViewport:false});continue;}
        await page.mouse.move(target.point.x,target.point.y);
        if(side==='astylar')await page.evaluate(()=>window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled());
        const hit=await page.evaluate(point=>{
          const element=document.elementFromPoint(point.x,point.y);if(!element)throw Error('Missing hit');
          const caret=document.caretPositionFromPoint?.(point.x,point.y),node=caret?.offsetNode;
          const range=node?.nodeType===Node.TEXT_NODE?document.createRange():null;range?.selectNodeContents(node);
          const hasSelectableTextAtPoint=!!node?.textContent?.trim()&&!!range&&[...range.getClientRects()].some(r=>
            point.x>=r.left&&point.x<=r.right&&point.y>=r.top&&point.y<=r.bottom)&&getComputedStyle(node.parentElement).userSelect!=='none';
          const ancestry=[];for(let n=element;n;n=n.parentElement)ancestry.push({type:n.tagName.toLowerCase(),id:n.id,className:String(n.className)});
          return {hitType:element.tagName.toLowerCase(),hitId:element.id,ancestry,authoredCursor:getComputedStyle(element).cursor,
            hasSelectableTextAtPoint,caretText:node?.textContent??null};
        },target.point);
        observation.points.push({id,...target,inViewport:true,...hit,effectiveCursor:effectiveBrowserCursor(hit.authoredCursor,hit.hasSelectableTextAtPoint)});
      }
      assert.equal(observation.points.length,5);
` + source.slice(end);
replace("boundary:'Fresh four-profile desktop DPR1 baseline diagnostic on authenticated served bytes. Marker-only native intervention preserves measured bounds;candidate draw coordinates remain texture-local. Not old-browser replay,global baseline equality,current core-source equivalence or full-case acceptance.'",
  "cursorMetric:{file:'tests/material-parity/cursor-metrics.mjs',sha256:hash(readFileSync('tests/material-parity/cursor-metrics.mjs'))},boundary:'Fresh retained-build four-theme desktop-DPR1 owner points only. No styles,markers or build changes. Native heading text points and candidate projected left-edge heading points differ in masking inputs;blank owner points preserve actual DOM hits. Canvas hit does not identify internal visual hit owner. Not original action replay,current source,OS cursor pixels,all-point coverage or full-case acceptance.'");
source = `import { effectiveBrowserCursor } from ${JSON.stringify(pathToFileURL(path.resolve('tests/material-parity/cursor-metrics.mjs')).href)};\n` + source;
await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
