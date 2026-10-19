import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

// A reference-only reduction of the remaining glyph-generation boundary. Reuse
// the exact source-bound server, font settlement and response authentication.
const prior = 'scripts/audit-material-divider-baselines.mjs';
let source = readFileSync(prior, 'utf8');
assert.equal(createHash('sha256').update(source).digest('hex'), 'bb87aa6576b1c52b9c2aa077a94ddba832802942c0096fac3717d3ca2eac638f');
const replace = (before, after) => { assert.equal(source.split(before).length, 2); source = source.replace(before, after); };
replace("'../tests/material-parity/run-checkpoint.mjs'", JSON.stringify(pathToFileURL(path.resolve('tests/material-parity/run-checkpoint.mjs')).href));
replace("'playwright-core'", JSON.stringify(import.meta.resolve('playwright-core')));
source = `import { PNG } from ${JSON.stringify(import.meta.resolve('pngjs'))};\n` + source;
replace('readFileSync(import.meta.filename)', "readFileSync('scripts/audit-material-divider-native-canvas.mjs')");
replace("for(const profile of ['light','dark','contrast','custom'])for(const side of ['reference','astylar'])", "for(const profile of ['light','dark','contrast','custom'])for(const side of ['reference'])");
replace('const cs=getComputedStyle(leaf);native.push({', `const cs=getComputedStyle(leaf);
          const crop={left:Math.floor(ink.left)-2,top:Math.floor(before.top)-2,
            width:Math.ceil(ink.right)-Math.floor(ink.left)+4,height:Math.ceil(before.bottom)-Math.floor(before.top)+4};
          let owner=leaf,background;
          while(owner){const color=getComputedStyle(owner).backgroundColor;
            if(color!=='rgba(0, 0, 0, 0)'&&color!=='transparent'){background=color;break;}owner=owner.parentElement;}
          if(!background)throw Error('No opaque background owner');
          const probes=[];
          for(const opaque of [true,false])for(const rounded of [false,true]){
            const canvas=document.createElement('canvas');canvas.width=crop.width;canvas.height=crop.height;
            const ctx=canvas.getContext('2d',{alpha:!opaque});
            if(opaque){ctx.fillStyle=background;ctx.fillRect(0,0,canvas.width,canvas.height);}
            ctx.font=cs.font;ctx.fillStyle=cs.color;ctx.textBaseline='alphabetic';ctx.textAlign='left';
            ctx.fontKerning=cs.fontKerning;ctx.letterSpacing=cs.letterSpacing==='normal'?'0px':cs.letterSpacing;
            const x=ink.left-crop.left,y=box.top-crop.top;
            ctx.fillText(leaf.textContent,x,rounded?Math.round(y):y);
            probes.push({opaque,rounded,requestedFont:cs.font,actualFont:ctx.font,baseline:y,
              drawBaseline:rounded?Math.round(y):y,drawX:x,pixels:Array.from(ctx.getImageData(0,0,canvas.width,canvas.height).data)});
          }
          native.push({crop,background,probes,baselineCssY:box.top,`);
replace('await Promise.all(pending);assert.ok(assets.length>0);results.push({', `
      const screenshot=PNG.sync.read(await page.screenshot({animations:'disabled'}));
      for(const native of observation.native){
        const {left,top,width,height}=native.crop;
        assert.ok(left>=0&&top>=0&&left+width<=screenshot.width&&top+height<=screenshot.height);
        const rgba=[];for(let y=top;y<top+height;y++)for(let x=left;x<left+width;x++){
          const offset=(y*screenshot.width+x)*4;rgba.push(...screenshot.data.subarray(offset,offset+4));}
        native.referenceRGBA=rgba;
        const background=rgba.slice(0,4);assert.equal(background[3],255);
        native.referenceBackground=background;
        for(const probe of native.probes){
          let differingPixels=0,maximumRGBError=0,aboveOne=0;
          for(let i=0;i<rgba.length;i+=4){const alpha=probe.pixels[i+3]/255;let error=0;
            for(let c=0;c<3;c++)error=Math.max(error,Math.abs(Math.round(probe.pixels[i+c]*alpha+background[c]*(1-alpha))-rgba[i+c]));
            differingPixels+=error>0;aboveOne+=error>1;maximumRGBError=Math.max(maximumRGBError,error);}
          probe.comparison={differingPixels,aboveOne,maximumRGBError};
        }
      }
      await Promise.all(pending);assert.ok(assets.length>0);results.push({`);
replace("boundary:'Fresh four-profile desktop DPR1 baseline diagnostic on authenticated served bytes. Marker-only native intervention preserves measured bounds;candidate draw coordinates remain texture-local. Not old-browser replay,global baseline equality,current core-source equivalence or full-case acceptance.'",
  "boundary:'Reference-only four-theme desktop DPR1 measured-baseline DOM versus offscreen Canvas diagnostic. Opaque/transparent and rounded-baseline controls are not canonical authoring or renderer changes. No Astylar capture,all-viewport/font coverage,shader causality or whole-case acceptance.'");
await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
