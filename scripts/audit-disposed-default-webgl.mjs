import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright-core';

// Substrate diagnostic, not a public-API Material parity fixture or renderer fix.
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const ownerFile = 'src/lib/astylar-scene-resources.ts';
const ownerBytes = readFileSync(ownerFile);
assert.equal(hash(ownerBytes), '1221cedda97c49abc7e977a5c7b6f939324b4b8a0b8a380eee5d864644bdd93a');
const consumer = path.resolve('examples/material-showcase');
const esbuild = createRequire(path.join(consumer, 'package.json'))('esbuild');
const owner = esbuild.transformSync(ownerBytes.toString(), { loader: 'ts', target: 'es2022' }).code
  .replace('export class AstylarSceneResources', 'class AstylarSceneResources');
assert.ok(!owner.includes('export '));
const applicationSource = `
import {Engine,Scene,FreeCamera,Vector3,HemisphericLight,MeshBuilder,Color4} from '@babylonjs/core';
${owner}
document.body.style.margin='0';
const canvas=document.createElement('canvas');canvas.width=200;canvas.height=100;
canvas.style.cssText='display:block;width:200px;height:100px';document.body.append(canvas);
const engine=new Engine(canvas,false,{preserveDrawingBuffer:true});
engine.setHardwareScalingLevel(1/window.devicePixelRatio);engine.resize();
const results=[];
for(const mode of ['live','disposed-cache','fresh-after-dispose']){
 const scene=new Scene(engine);scene.clearColor=new Color4(.1,.2,.3,1);
 const resources=new AstylarSceneResources(scene),original=scene.defaultMaterial;let disposalCallbacks=0;
 original.onDisposeObservable.add(()=>disposalCallbacks++);
 resources.adopt(original);
 if(mode!=='live')resources.replace(()=>{});
 if(mode==='fresh-after-dispose')scene.defaultMaterial=undefined;
 const camera=new FreeCamera('camera',new Vector3(0,0,-4),scene);camera.setTarget(Vector3.Zero());
 new HemisphericLight('light',new Vector3(0,1,-1),scene);
 const mesh=MeshBuilder.CreateBox('box',{size:1},scene);
 const fallback=mesh.subMeshes[0].getMaterial();const errors=[];
 let pixels;
 try{
  for(let i=0;i<12;i++){scene.render();await new Promise(r=>requestAnimationFrame(r));}
  pixels=Array.from(await engine.readPixels(0,0,engine.getRenderWidth(),engine.getRenderHeight()));
 }catch(error){errors.push(String(error));}
 results.push({mode,disposalCallbacks,fallbackSame:original===fallback,
  fallbackLive:scene.materials.includes(fallback),ready:fallback.isReady(mesh),
  renderWidth:engine.getRenderWidth(),renderHeight:engine.getRenderHeight(),errors,pixels});
 scene.dispose();
}
window.audit={results,version:Engine.Version,dispose(){engine.dispose();}};
`;
const built = await esbuild.build({ stdin: { contents: applicationSource, resolveDir: consumer },
  bundle: true, write: false, metafile: true, format: 'esm', platform: 'browser', target: 'es2022' });
const dependencies = Object.keys(built.metafile.inputs).filter(file => existsSync(file)).sort()
  .map(file => ({ file, sha256: hash(readFileSync(file)) }));
const server = createServer((request, response) => {
  response.setHeader('content-type', request.url === '/audit.js' ? 'text/javascript' : 'text/html');
  response.end(request.url === '/audit.js' ? built.outputFiles[0].contents : '<script type="module" src="/audit.js"></script>');
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  for (const dpr of [1, 2]) {
    const page = await browser.newPage({ viewport: { width: 200, height: 100 }, deviceScaleFactor: dpr });
    const errors = []; page.on('pageerror', error => errors.push(String(error)));
    try {
      await page.goto(`http://127.0.0.1:${server.address().port}`);
      await page.waitForFunction(() => !!window.audit, { timeout: 30000 });
      const observed = await page.evaluate(() => ({ results: window.audit.results, version: window.audit.version }));
      const rasterHashes = observed.results.map(row => row.pixels ? hash(Buffer.from(row.pixels)) : null);
      const distinctColors = observed.results.map(row => {
        const colors = new Set();
        for (let i = 0; i < (row.pixels?.length ?? 0); i += 4) colors.add(row.pixels.slice(i, i + 4).join(','));
        return colors.size;
      });
      console.log(JSON.stringify({ dpr, version: observed.version, pageErrors: errors,
        results: observed.results.map(({ pixels, ...row }, i) => ({ ...row, rgbaSha256: rasterHashes[i],
          rgbaBase64: pixels ? Buffer.from(pixels).toString('base64') : undefined,
          distinctColors: distinctColors[i], byteLength: pixels?.length })),
        disposedMatchesLive: rasterHashes[0] !== null && rasterHashes[0] === rasterHashes[1],
        freshMatchesLive: rasterHashes[0] !== null && rasterHashes[0] === rasterHashes[2] }));
      assert.deepEqual(errors, []);
      assert.ok(distinctColors.every(count => count > 1), 'Blank render cannot establish fallback paint');
      assert.equal(observed.results[0].fallbackSame, true);
      assert.equal(observed.results[1].fallbackSame, true); assert.equal(observed.results[1].fallbackLive, false);
      assert.equal(observed.results[2].fallbackSame, false); assert.equal(observed.results[2].fallbackLive, true);
      await page.evaluate(() => window.audit.dispose());
    } finally { await page.close(); }
  }
  for (const receipt of dependencies) assert.equal(hash(readFileSync(receipt.file)), receipt.sha256);
  assert.equal(hash(readFileSync(ownerFile)), hash(ownerBytes));
  console.log(JSON.stringify({ status: 'complete', applicationSource, ownerFile, ownerSha256: hash(ownerBytes),
    dependencyCount: dependencies.length, dependencyReceiptSha256: hash(JSON.stringify(dependencies)),
    browser: browser.version(), scope: 'Original core cleanup and installed Babylon real-WebGL fallback control; not public mount,Material-map or all-lifetime acceptance.' }));
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
