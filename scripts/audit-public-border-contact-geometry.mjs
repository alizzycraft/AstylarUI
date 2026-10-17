import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright-core';
import ts from 'typescript';
import { PNG } from 'pngjs';
import { materialBrowserLaunchOptions, inspectMaterialBrowserLaunch } from '../tests/material-parity/run-checkpoint.mjs';

// Add read-only live frame measurements to the exact public border recipe.
// No authored input,layout calculation,render method or old capture is changed.
const parentFile = 'scripts/audit-public-border-contact.mjs';
const parent = readFileSync(parentFile), hash = bytes => createHash('sha256').update(bytes).digest('hex');
const parentSha256 = 'd11f07d6dd6e4f72ca80fac2f500c6cb811836651471672025af5982a29bc7b6';
assert.equal(hash(parent), parentSha256);
let source = parent.toString().replaceAll('\r\n', '\n');
const snapshot = ` let borderGeometry=null;
 if(surface){
   const frame=surface.scene.getMeshByName('child-border_border_frame');
   if(!frame)throw Error('Missing live child border frame');
   frame.computeWorldMatrix(true);
   const engine=surface.scene.getEngine(),viewport=surface.scene.activeCamera.viewport.toGlobal(engine.getRenderWidth(),engine.getRenderHeight());
   const positions=frame.getVerticesData('position'),points=[];
   for(let i=0;i<positions.length;i+=3){
     const world=Vector3.TransformCoordinates(new Vector3(positions[i],positions[i+1],positions[i+2]),frame.getWorldMatrix());
     const p=Vector3.Project(world,Matrix.IdentityReadOnly,surface.scene.getTransformMatrix(),viewport);
     points.push({x:p.x*host.clientWidth/engine.getRenderWidth(),y:p.y*host.clientHeight/engine.getRenderHeight()});
   }
   borderGeometry={name:frame.name,parent:frame.parent?.name,points,indices:frame.getIndices().length};
 }
 return {borderGeometry,site,inputUnchanged:`;
const extra = `replace(' return {site,inputUnchanged:',${JSON.stringify(snapshot)});
replace('  return summary;',${JSON.stringify(`  for(const row of report.results) {
    assert.equal(row.reference.borderGeometry,null);
    const frame=row.astylar.borderGeometry; assert.equal(frame.name,'child-border_border_frame'); assert.equal(frame.parent,'child');
    assert.ok(frame.points.length>8 && frame.indices>0);
    for(const p of frame.points) {assert.ok(Number.isFinite(p.x));assert.ok(Number.isFinite(p.y));}
    const box=row.astylar.bounds.child;
    assert.ok(Math.abs(Math.min(...frame.points.map(p=>p.x))-box.left)<.001);
    assert.ok(Math.abs(Math.max(...frame.points.map(p=>p.x))-box.left-box.width)<.001);
    assert.ok(Math.abs(Math.min(...frame.points.map(p=>p.y))-box.top)<.001);
    assert.ok(Math.abs(Math.max(...frame.points.map(p=>p.y))-box.top-box.height)<.001);
    const middle=frame.points.filter(p=>Math.abs(p.x-(box.left+box.width/2))<=box.width/2-18+.001 && p.y>box.top+box.height/2);
    assert.ok(middle.length>=4);
    const outer=Math.max(...middle.map(p=>p.y)),inner=Math.min(...middle.map(p=>p.y));
    assert.ok(Math.abs(outer-inner-1)<.001);
    summary.contactPixels.find(r=>r.dpr===row.dpr&&r.phase===row.phase&&r.shadow===row.shadow).liveBottomBorder={outer,inner,vertices:frame.points.length};
  }
  return summary;`)});
`;
const marker = "const ast = ts.createSourceFile('border-contact-runner.mjs'";
assert.equal(source.split(marker).length, 2); source = source.replace(marker, extra + marker);
const recipeMarker = 'const recipe = { base:';
assert.equal(source.split(recipeMarker).length, 2);
source = source.replace(recipeMarker, `const recipe = { measurementParent:${JSON.stringify({ file: parentFile, sha256: parentSha256 })}, base:`);
const ast = ts.createSourceFile('border-geometry-wrapper.mjs', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
assert.equal(ast.parseDiagnostics.length, 0);
const replacements = ast.statements.filter(ts.isImportDeclaration).map(node=>({start:node.getFullStart(),end:node.end,text:''}));
assert.equal(replacements.length, 10);
function visit(node){if(ts.isPropertyAccessExpression(node)&&node.getText(ast)==='import.meta.filename')replacements.push({start:node.getStart(ast),end:node.end,text:'outerRunnerFile'});ts.forEachChild(node,visit);}
visit(ast); assert.equal(replacements.length, 11);
for(const range of replacements.sort((a,b)=>b.start-a.start)) source=source.slice(0,range.start)+range.text+source.slice(range.end);
const run = new (Object.getPrototypeOf(async function(){}).constructor)('assert','createHash','existsSync','mkdirSync','readFileSync','writeFileSync','createRequire','createServer','path','chromium','ts','PNG','materialBrowserLaunchOptions','inspectMaterialBrowserLaunch','outerRunnerFile',source);
await run(assert,createHash,existsSync,mkdirSync,readFileSync,writeFileSync,createRequire,createServer,path,chromium,ts,PNG,materialBrowserLaunchOptions,inspectMaterialBrowserLaunch,import.meta.filename);
