import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

// Reuse the live draw/copy identity observer. This measures font freshness,
// not another baseline/layout or physical-font-name inference.
const prior = 'scripts/audit-material-divider-live-baselines.mjs';
let source = readFileSync(prior, 'utf8');
assert.equal(createHash('sha256').update(source).digest('hex'), '0c0f7df063dad2f5b4e4d28b0d2f52371143c4fc8d65733f580c635c6e92cb2b');
// The immutable wrapper performs its own exact replacements on its immutable
// predecessor. Extend those replacement inputs, not renderer or fixture files.
const needle = "await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);";
assert.equal(source.split(needle).length, 2);
const extension = `
replace("for(const profile of ['light','dark','contrast','custom'])for(const side of ['reference','astylar'])", "for(const profile of ['light','dark','contrast','custom'])for(const side of ['astylar'])");
replace('font:this.font,transform:', "font:this.font,fontStatus:document.fonts.status,fontAvailable:document.fonts.check(this.font,args[0]),drawState:Object.fromEntries(['fillStyle','globalAlpha','globalCompositeOperation','fontKerning','fontStretch','fontVariantCaps','letterSpacing','wordSpacing','textRendering','direction','textAlign','textBaseline','filter','shadowColor','shadowBlur','shadowOffsetX','shadowOffsetY'].map(key=>[key,this[key]])),transform:");
replace('textureMatrix:Array.from(texture.getTextureMatrix().asArray())',
  \`textureMatrix:Array.from(texture.getTextureMatrix().asArray()),
              actualRGBA:Array.from(texture.getContext().getImageData(0,0,texture.getSize().width,texture.getSize().height).data),
              fontSetStatus:document.fonts.status,
              freshControls:[false,true].map(fallback=>{
                if(draws.length!==1)throw Error('Expected single live font draw');
                const draw=draws[0],size=texture.getSize(),fresh=document.createElement('canvas');
                fresh.width=size.width;fresh.height=size.height;
                const ctx=fresh.getContext('2d');ctx.font=draw.font;
                for(const [key,value]of Object.entries(draw.drawState))if(value!==undefined)ctx[key]=value;
                if(fallback){if(!draw.font.includes('Roboto, '))throw Error('Unexpected font control');ctx.font=draw.font.replace('Roboto, ','');}
                ctx.setTransform(draw.transform.a,draw.transform.b,draw.transform.c,draw.transform.d,draw.transform.e,draw.transform.f);
                ctx.fillText(draw.text,draw.x,draw.y);
                const backing=document.createElement('canvas');backing.width=size.width;backing.height=size.height;
                const copy=backing.getContext('2d');copy.drawImage(fresh,0,0);
                return{fallback,font:ctx.font,pixels:Array.from(copy.getImageData(0,0,size.width,size.height).data)};
              })\`);
replace("boundary:'Fresh four-profile desktop DPR1 baseline diagnostic on authenticated served bytes. Marker-only native intervention preserves measured bounds;candidate draw coordinates remain texture-local. Not old-browser replay,global baseline equality,current core-source equivalence or full-case acceptance.'",
  "boundary:'Four-profile candidate desktop DPR1 live-font freshness diagnostic. Fresh transparent draw/copy controls reproduce observed font/settings;Arial fallback is a negative control. Not historical font timing,physical canvas font-name API,all-state lifecycle or whole-case acceptance.'");
`;
source = source.replace(needle, extension + '\n' + needle);
// Resolve the bare dependency before the outer data-URL evaluation.
assert.equal(source.split("import.meta.resolve('playwright-core')").length, 2);
source = source.replace("import.meta.resolve('playwright-core')", JSON.stringify(import.meta.resolve('playwright-core')));
source = source.replace('readFileSync(\'scripts/audit-material-divider-live-baselines.mjs\')',
  "readFileSync('scripts/audit-material-divider-font-freshness.mjs')");
await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
