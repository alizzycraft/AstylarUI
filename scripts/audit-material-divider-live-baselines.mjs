import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

// Keep the prior capture producer immutable; extend only observation identity.
const prior='scripts/audit-material-divider-baselines.mjs';
let source=readFileSync(prior,'utf8');
assert.equal(createHash('sha256').update(source).digest('hex'),'bb87aa6576b1c52b9c2aa077a94ddba832802942c0096fac3717d3ca2eac638f');
const replace=(before,after)=>{assert.equal(source.split(before).length,2);source=source.replace(before,after);};
replace("'../tests/material-parity/run-checkpoint.mjs'",JSON.stringify(pathToFileURL(path.resolve('tests/material-parity/run-checkpoint.mjs')).href));
replace("'playwright-core'",JSON.stringify(import.meta.resolve('playwright-core')));
replace('readFileSync(import.meta.filename)',"readFileSync('scripts/audit-material-divider-live-baselines.mjs')");
replace('window.baselineDraws=[];const original=',
  'window.baselineDraws=[];window.baselineCanvases=new WeakMap();window.baselineNextCanvas=0;const original=');
replace('const original=CanvasRenderingContext2D.prototype.fillText;',`window.baselineCopies=[];
      const identify=canvas=>{if(!window.baselineCanvases.has(canvas))window.baselineCanvases.set(canvas,++window.baselineNextCanvas);return window.baselineCanvases.get(canvas);};
      const drawImage=CanvasRenderingContext2D.prototype.drawImage;
      CanvasRenderingContext2D.prototype.drawImage=function(...args){window.baselineCopies.push({source:identify(args[0]),destination:identify(this.canvas),arguments:args.slice(1)});return Reflect.apply(drawImage,this,args);};
      const original=CanvasRenderingContext2D.prototype.fillText;`);
replace("window.baselineDraws.push({text:args[0]", "window.baselineDraws.push({canvasId:(window.baselineCanvases.has(this.canvas)?window.baselineCanvases.get(this.canvas):(window.baselineCanvases.set(this.canvas,++window.baselineNextCanvas),window.baselineNextCanvas)),text:args[0]");
replace('baselineOffset:box.top-before.top,','baselineOffset:box.top-before.top,baselineCssY:box.top,paragraphCssTop:before.top,');
replace('return {native,draws:window.baselineDraws};',`const live=[];
        if(side==='astylar'){
          const surface=window.ng.getComponent(document.querySelector('astylar-surface')).surface();
          const scene=surface.scene,engine=scene.getEngine(),canvas=engine.getRenderingCanvas(),camera=scene.activeCamera;
          const rect=canvas.getBoundingClientRect(),viewport=camera.viewport.toGlobal(engine.getRenderWidth(),engine.getRenderHeight());
          for(const id of ['divider-above','divider-below']){
            const meshes=scene.meshes.filter(m=>m.metadata?.elementId===id&&m.metadata?.isTextMesh);
            if(meshes.length!==1)throw Error('Ambiguous live text owner '+id);
            const mesh=meshes[0],texture=mesh.material.diffuseTexture,backing=texture.getContext().canvas;
            const canvasId=window.baselineCanvases.get(backing),ancestry=new Set([canvasId]);
            for(let pass=0;pass<window.baselineCopies.length;pass++)for(const copy of window.baselineCopies)if(ancestry.has(copy.destination))ancestry.add(copy.source);
            const draws=window.baselineDraws.filter(d=>ancestry.has(d.canvasId));
            if(!draws.length)throw Error('Live backing has no observed draw '+id);
            const positions=mesh.getVerticesData('position'),V=mesh.position.constructor,projected=[];
            for(let i=0;i<positions.length;i+=3){
              const point=V.Project(new V(...positions.slice(i,i+3)),mesh.getWorldMatrix(),scene.getTransformMatrix(),viewport);
              projected.push({x:rect.left+point.x*canvas.clientWidth/engine.getRenderWidth(),y:rect.top+point.y*canvas.clientHeight/engine.getRenderHeight()});
            }
            live.push({id,canvasId,draws,copies:window.baselineCopies.filter(c=>ancestry.has(c.destination)),textureSize:texture.getSize(),invertY:texture.invertY,
              textDimensions:mesh.metadata.textDimensions,projected,uvs:Array.from(mesh.getVerticesData('uv')),
              textureMatrix:Array.from(texture.getTextureMatrix().asArray())});
          }
        }
        return {native,draws:window.baselineDraws,live};`);
await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
