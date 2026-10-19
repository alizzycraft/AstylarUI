import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import ts from 'typescript';
const hash=b=>createHash('sha256').update(b).digest('hex');
const root='examples/material-showcase/dist/material-showcase/browser';
const mapFile=`${root}/chunk-XOU37TRR.js.map`,map=JSON.parse(readFileSync(mapFile));
const capture=JSON.parse(readFileSync('artifacts/material-parity/divider-live-baseline-copy-diagnostic-20261019.log'));
const baseline=JSON.parse(readFileSync(capture.baseline.file));
for(const file of ['chunk-XOU37TRR.js','chunk-XOU37TRR.js.map'])
  assert.equal(hash(readFileSync(`${root}/${file}`)),baseline.captureProvenance.browserFiles.find(r=>r.file===file).sha256);
const method=(text,name)=>{
  const ast=ts.createSourceFile('owner.js',text,99,true,ts.ScriptKind.JS),found=[];
  const visit=n=>{if(ts.isMethodDeclaration(n)&&n.name.getText(ast)===name)found.push(n.getText(ast));ts.forEachChild(n,visit);};visit(ast);
  assert.equal(found.length,1);return found[0];
};
const tokens=text=>{
  const ast=ts.createSourceFile('method.js',`class Owner {${text}}`,99,true,ts.ScriptKind.JS),out=[];
  const visit=n=>{const children=n.getChildren(ast);if(children.length)children.forEach(visit);
    else if(n.kind!==ts.SyntaxKind.EndOfFileToken&&n.getText(ast))out.push(n.getText(ast));};visit(ast);
  // Formatting only: optional trailing commas and parentheses around one bare arrow parameter.
  return out.filter((token,i)=>!(token===','&&['}',']',')'].includes(out[i+1]))
    &&!(token==='('&&out[i+2]===')'&&out[i+3]==='=>'&&/^[A-Za-z_$][\w$]*$/.test(out[i+1]))
    &&!(token===')'&&out[i+1]==='=>'&&out[i-2]==='('&&/^[A-Za-z_$][\w$]*$/.test(out[i-1])));
};
const observations=[];
for(const [owner,names]of [['text-canvas-renderer',['createStyledCanvas','measureTextBounds']],
  ['text-style-parser',['resolveNormalLineHeight']],['text-rendering',['renderTextToTexture','getLogicalTextureSize']]]){
  const index=map.sources.findIndex(s=>s.endsWith(`${owner}.service.js`));assert.ok(index>=0);
  const installedFile=`examples/material-showcase/${map.sources[index]}`,installed=readFileSync(installedFile,'utf8');
  for(const name of names){
    const current=method(installed,name),captured=method(map.sourcesContent[index],name);
    assert.deepEqual(tokens(current),tokens(captured));
    assert.notDeepEqual(tokens(current+';unexpectedMutation()'),tokens(captured));
    observations.push({owner,name,installedFile,installedSha256:hash(installed),capturedSource:map.sources[index],
      capturedSourceSha256:hash(map.sourcesContent[index]),tokensSha256:hash(JSON.stringify(tokens(current)))});
  }
}
const logical=18.4*(22/18.4);assert.equal(logical,22.000000000000004);assert.equal(Math.ceil(logical),23);
const custom=capture.results.find(r=>r.profile==='custom'&&r.side==='astylar');
for(const live of custom.observation.live){assert.equal(live.textureSize.height,23);assert.equal(live.textDimensions.height,22);
  assert.equal(live.copies.length,1);assert.deepEqual(live.copies[0].arguments,[0,0]);}
console.log(JSON.stringify({producerSha256:hash(readFileSync(import.meta.filename)),mapFile,mapSha256:hash(readFileSync(mapFile)),
  observations,logicalHeight:logical,allocatedHeight:Math.ceil(logical),customLiveOwners:custom.observation.live.length,
  negativeControls:observations.length,boundary:'Five complete owning methods bind installed code to captured executable source map after explicit syntax-only normalization. Allocation arithmetic and live backing/mesh mismatch,not complete renderer or general raster acceptance.'}));
