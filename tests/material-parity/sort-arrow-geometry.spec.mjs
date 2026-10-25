import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import ts from 'typescript';

const hash=b=>createHash('sha256').update(b).digest('hex');
test('Sort arrow bounds conceal extra filled area and overlapping current plugin triangles',t=>{
  const file='artifacts/material-parity/current-full-20261005/latest-report.json',bytes=readFileSync(file);
  assert.equal(hash(bytes),'ab42dbec6280e0e27784ec4bbc6697d4ea451bfab307bccb720c0dec89a83b62');
  const report=JSON.parse(bytes),rows=report.interactions.filter(r=>r.family==='sort'&&r.profile==='light'&&r.viewport.deviceScaleFactor===1&&['focus','activate'].includes(r.state));
  assert.equal(rows.length,2);let polygon;
  for(const row of rows){
    const trees={};for(const side of ['reference','astylar']){const receipt=row.inputTrees[side],b=readFileSync(receipt.file);assert.equal(hash(b),receipt.sha256);trees[side]=JSON.parse(b);}
    const svgs=trees.reference.nodes.filter(n=>n.type==='svg');assert.equal(svgs.length,1);const svg=svgs[0];
    const paths=trees.reference.nodes.filter(n=>n.type==='path'&&n.parent===svg.key);assert.equal(paths.length,1);
    const d=paths[0].attributes.d;assert.equal(d,'M440-240v-368L296-464l-56-56 240-240 240 240-56 56-144-144v368h-80Z');
    assert.equal(svg.attributes.viewBox,'0 -960 960 960');
    const style=trees.reference.styles[svg.style];assert.equal(style.width,'24px');assert.equal(style.height,'24px');
    const tokens=d.match(/[MLHVZmlhvz]|[-+]?(?:\d*\.)?\d+/g);assert.equal(tokens.join(''),d.replace(/[\s,]/g,''));
    let i=0,command,x=0,y=0;const points=[];
    while(i<tokens.length){
      if(/^[a-z]$/i.test(tokens[i]))command=tokens[i++];
      if(command==='Z')break;
      assert.ok(['M','L','l','v','h'].includes(command));
      if(['M','L','l'].includes(command)){const a=Number(tokens[i++]),b=Number(tokens[i++]);x=command==='l'?x+a:a;y=command==='l'?y+b:b;if(command==='M')command='L';}
      else if(command==='v')y+=Number(tokens[i++]);else x+=Number(tokens[i++]);
      points.push({x:(x-480)/40,y:(y+480)/40});
    }
    if(polygon)assert.deepEqual(points,polygon);polygon=points;
    const nativeOwner=trees.reference.nodes.find(n=>n.key===svg.parent),candidate=trees.astylar.nodes.filter(n=>n.authored?.id==='sort-arrow');assert.equal(candidate.length,1);
    assert.equal(candidate[0].authored.data.direction,'asc');
    const opacity=row.state==='focus'?.54:1;
    assert.equal(Number(trees.reference.styles[nativeOwner.style].opacity),opacity);assert.equal(candidate[0].authored.data.opacity,opacity);
  }
  const pluginFile='examples/material-showcase/src/app/material-plugin/material-showcase.plugin.ts',source=readFileSync(pluginFile,'utf8'),tree=ts.createSourceFile(pluginFile,source,99,true);
  const functions=tree.statements.filter(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='materialSortArrowTriangles');assert.equal(functions.length,1);
  const code=ts.transpileModule(functions[0].getText(tree).replace('export ',''),{compilerOptions:{target:99,module:0}}).outputText;
  const generate=new Function(code+';return materialSortArrowTriangles;')(),vertices=generate('asc');assert.equal(vertices.length,15);
  assert.deepEqual(generate('desc'),vertices.map(p=>({x:-p.x,y:-p.y})));
  const bounds=points=>[Math.min(...points.map(p=>p.x)),Math.max(...points.map(p=>p.x)),Math.min(...points.map(p=>p.y)),Math.max(...points.map(p=>p.y))];
  assert.deepEqual(bounds(vertices),bounds(polygon));
  const area=points=>Math.abs(points.reduce((sum,p,i)=>sum+p.x*points[(i+1)%points.length].y-points[(i+1)%points.length].x*p.y,0))/2;
  const cross=(a,b,p)=>(b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x);
  const triangleContains=(p,a,b,c)=>{const d=[cross(a,b,p),cross(b,c,p),cross(c,a,p)];return d.every(v=>v>1e-10)||d.every(v=>v< -1e-10);};
  const coverage=p=>[0,3,6,9,12].filter(i=>triangleContains(p,...vertices.slice(i,i+3))).length;
  const nativeContains=p=>{let inside=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
    const a=polygon[i],b=polygon[j];if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)inside=!inside;}return inside;};
  assert.equal(nativeContains({x:2,y:-1.5}),false);assert.equal(coverage({x:2,y:-1.5}),1);
  assert.equal(nativeContains({x:0,y:-2}),true);assert.equal(coverage({x:0,y:-2}),2);
  const nativeArea=area(polygon),triangleArea=[0,3,6,9,12].reduce((sum,i)=>sum+area(vertices.slice(i,i+3)),0);
  assert.ok(Math.abs(nativeArea-49.08)<1e-9);assert.ok(Math.abs(triangleArea-64.48)<1e-9);
  const introduction='5b74d1b3e79016a1ba402090d66c60a123718e71',parent='6a43034a5f42a03f96f413c9301b136afff776a6',cssBoundary='e4ca3db4070b1aaac0c1a43dda67bc135f18900a';
  assert.equal(execFileSync('git',['rev-parse',introduction+'^'],{encoding:'utf8'}).trim(),parent);
  const historical=(revision,file)=>execFileSync('git',['show',revision+':'+file],{encoding:'utf8',maxBuffer:3e6});
  const initial=historical(introduction,pluginFile),before=historical(parent,pluginFile),boundary=historical(cssBoundary,pluginFile);
  const declaration=s=>{const t=ts.createSourceFile(pluginFile,s,99,true);return t.statements.filter(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='materialSortArrowTriangles').map(n=>n.getText(t));};
  assert.equal(declaration(before).length,0);assert.equal(declaration(initial).length,1);assert.equal(declaration(boundary).length,1);
  const compile=s=>new Function('Vector3',ts.transpileModule(declaration(s)[0].replace('export ',''),{compilerOptions:{target:99,module:0}}).outputText+';return materialSortArrowTriangles;')(class Vector3{constructor(x,y,z){Object.assign(this,{x,y,z});}});
  const initialGenerate=compile(initial),boundaryGenerate=compile(boundary);
  const xy=points=>points.map(({x,y})=>({x,y}));
  assert.deepEqual(xy(initialGenerate(1,'asc')),vertices);assert.deepEqual(xy(initialGenerate(1,'desc')),generate('desc'));
  assert.deepEqual(boundaryGenerate('asc'),vertices);assert.deepEqual(boundaryGenerate('desc'),generate('desc'));
  const componentFile='examples/material-showcase/src/app/astylar.component.ts',oldComponent=historical(parent,componentFile),newComponent=historical(introduction,componentFile);
  assert.match(oldComponent,/id: 'sort-arrow', class: 'sort-arrow', textContent: state\.open && state\.sortDirection === 'desc' \? '↓' : '↑'/);
  assert.match(newComponent,/type: 'showcase\.material:sort-arrow' as const/);
  assert.equal(typeof report.captureProvenance.installedDependencies,'string');
  t.diagnostic(JSON.stringify({cases:rows.map(r=>`interaction:sort@light/desktop-dpr1/${r.state}`),source:{file:pluginFile,sha256:hash(source)},nativeArea,triangleArea,
    id:'fixture-sort-arrow-triangulation-fills-notch-and-overdraws',
    witnesses:[{point:{x:2,y:-1.5},nativeFilled:false,candidateTriangles:1},{point:{x:0,y:-2},nativeFilled:true,candidateTriangles:2}],
    finding:'Current plugin geometry fills a point outside the retained reference path and double-covers another despite matching bounds.',
    classification:'application-plugin-authoring-defect',owner:'Material sort-arrow CSS-space vector paint geometry',
    history:{introduction,parent,cssBoundary,initialSourceSha256:hash(initial),boundarySourceSha256:hash(boundary),
      topologyPreserved:true,boundary:'Initial world-scaled function evaluated at unit scale only;not historical projection or browser execution. The CSS-boundary revision preserves identical CSS vertices.'},
    boundary:'Two retained native/authored inputs versus executed current plugin geometry only. Not captured-plugin source equivalence,GPU alpha composition,all contexts,current browser rendering or whole-case closure.'}));
});
