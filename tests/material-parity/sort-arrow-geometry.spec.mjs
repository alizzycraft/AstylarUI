import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync as nativeReadFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import ts from 'typescript';
import {createFocusSelectionAuditPriorRead} from './public-tab-selection-finding.mjs';
import {PNG} from 'pngjs';
import {evaluateFocusedRaster} from './focused-raster-metrics.mjs';

const readFileSync=createFocusSelectionAuditPriorRead({root:process.cwd(),read:nativeReadFileSync});
const hash=b=>createHash('sha256').update(b).digest('hex');
test('Sort staged registry preserves all existing sources proofs findings and plans',async t=>{
  const {prepareSortArrowRegistry:prepare,restoreSortArrowRegistry:restore,createSortArrowPriorRead,sortArrowSources,sortArrowProofTitles}=await import('./sort-arrow-findings.mjs');
  const files={producer:'tests/material-parity/input-equivalence-audit.mjs',policy:'tests/material-parity/input-equivalence-policy.mjs'},before={},staged={},raw={};
  const readPrior=createSortArrowPriorRead({root:process.cwd(),read:readFileSync});
  for(const [kind,file]of Object.entries(files)){
    raw[kind]=readFileSync(file,'utf8').replaceAll('\r\n','\n');before[kind]=readPrior(file,'utf8');staged[kind]=prepare(before[kind],kind,readFileSync);
    assert.equal(restore(staged[kind],kind),before[kind]);
    assert.throws(()=>prepare(before[kind]+'\n// drift',kind,readFileSync));
    assert.throws(()=>restore(staged[kind]+'\n// drift',kind));
    assert.throws(()=>prepare(staged[kind],kind,readFileSync));
    assert.equal(readFileSync(file,'utf8').replaceAll('\r\n','\n'),raw[kind]);if(raw[kind]!==before[kind])assert.equal(raw[kind],staged[kind]);
  }
  assert.throws(()=>prepare(before.producer,'producer',()=>Buffer.alloc(0)));
  const arrays=source=>{const tree=ts.createSourceFile('registry.mjs',source,99,true,ts.ScriptKind.JS);assert.equal(tree.parseDiagnostics.length,0);
    const result={};for(const name of ['sourceFingerprints','focusedProofInventory','implementationPlan']){
      const fn=tree.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name);if(!fn)continue;
      let array;const visit=n=>{if(!array&&ts.isArrayLiteralExpression(n))array=n;ts.forEachChild(n,visit);};visit(fn);result[name]=array.elements.map(n=>n.getText(tree));
    }
    const declaration=tree.statements.flatMap(n=>ts.isVariableStatement(n)?[...n.declarationList.declarations]:[]).find(n=>n.name.getText(tree)==='sourceAuditDefinitions');
    if(declaration)result.definitions=declaration.initializer.arguments[0].elements.map(n=>n.getText(tree));return result;};
  const old=arrays(before.producer),next=arrays(staged.producer);
  for(const [key,added,total]of [['sourceFingerprints',sortArrowSources.length,1067],['focusedProofInventory',sortArrowProofTitles.length,392],['implementationPlan',2,67]]){
    assert.equal(old[key].length,total);assert.equal(next[key].length,total+added);assert.deepEqual(next[key].slice(added),old[key]);
  }
  assert.equal(new Set(next.sourceFingerprints).size,1070);
  const oldPolicy=arrays(before.policy).definitions,newPolicy=arrays(staged.policy).definitions;
  assert.equal(oldPolicy.length,200);assert.equal(newPolicy.length,202);assert.deepEqual(newPolicy.slice(2),oldPolicy);
  for(const entry of newPolicy.slice(0,2)){const f=new Function('return '+entry)();assert.equal([...readFileSync(f.file,'utf8').matchAll(new RegExp(f.pattern,'g'))].length,1);assert.ok(f.justification);}
  // Execute the actual validator's source-diagnostic block, not a parallel
  // schema invented by registration tests. The failed full export reached this
  // contract only after the expensive unrelated collectors/validators.
  const {sourceAuditDefinitions}=await import('./input-equivalence-policy.mjs');
  for(const f of sourceAuditDefinitions.filter(f=>f.evidence)){
    assert.ok(Array.isArray(f.evidence),f.id);for(const r of f.evidence){assert.equal(typeof r.file,'string');assert.match(r.sha256,/^[a-f0-9]{64}$/);}
  }
  const selected=sourceAuditDefinitions.slice(0,4);assert.equal(selected.length,4);assert.ok(selected.every(f=>Array.isArray(f.evidence)&&f.evidence.length));
  const validator=ts.createSourceFile('audit.mjs',before.producer,99,true,ts.ScriptKind.JS).statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='validateMaterialInputAudit');
  const block=validator.body.statements.find(n=>ts.isForOfStatement(n)&&n.expression.getText().startsWith('sourceAuditDefinitions.filter'));
  assert.ok(block);const validate=new Function('sourceAuditDefinitions','report','root','path','existsSync','createHash','readFileSync','const errors=[];'+block.getText()+';return errors;');
  const run=definitions=>validate(definitions,{sourceFindings:definitions},process.cwd(),path,existsSync,createHash,readFileSync);
  assert.deepEqual(run(selected),[]);
  assert.throws(()=>run([{...selected[0],evidence:{report:selected[0].evidence[0]}}]),TypeError);
  const changed={...selected[0],evidence:[{...selected[0].evidence[0],sha256:'0'.repeat(64)}]};
  assert.ok(run([changed]).some(error=>error.includes('receipt missing, changed or outside root')));
  const {restoreTextHeldProducer,restoreTextHeldSelection}=await import('./text-held-registration.mjs');
  assert.equal(restoreTextHeldProducer(staged.producer),restoreTextHeldProducer(before.producer));
  const {createTreeFocusPriorRead}=await import('./tree-focus-registration.mjs');
  const stages=new Map(Object.entries(files).map(([kind,file])=>[path.resolve(file),staged[kind]]));
  const read=(file,encoding)=>stages.has(path.resolve(file))?(encoding?stages.get(path.resolve(file)):Buffer.from(stages.get(path.resolve(file)))):readFileSync(file,encoding);
  const historical=createTreeFocusPriorRead({root:process.cwd(),read});
  const control=createTreeFocusPriorRead({root:process.cwd(),read:readPrior});
  for(const file of Object.values(files))assert.equal(historical(file,'utf8'),control(file,'utf8'));
  t.diagnostic(JSON.stringify({stagedSources:1070,stagedProofs:398,stagedFindings:202,stagedTracks:69,completePredecessorRecovered:true,liveWrites:false,readerReconciled:false,canonicalPublished:false}));
});
test('Sort staged selection and reader preserve older routes and authenticate the exact successor',async t=>{
  const api=await import('./sort-arrow-findings.mjs'),root=process.cwd(),staged=new Map();
  const entries=[['tests/material-parity/input-equivalence-audit.mjs','producer'],['tests/material-parity/input-equivalence-policy.mjs','policy'],['scripts/run-material-input-audit.mjs','runner'],['scripts/export-material-input-audit-current-ancestry.mjs','launcher']];
  const previous=api.createSortArrowPriorRead({root,read:readFileSync});
  for(const [file,kind]of entries){const bytes=previous(file),prepare=['producer','policy'].includes(kind)?api.prepareSortArrowRegistry:api.prepareSortArrowSelection;
    staged.set(path.resolve(file),Buffer.from(prepare(bytes,kind,readFileSync)));}
  const read=(file,options)=>{const b=staged.get(path.resolve(file));if(!b)return readFileSync(file,options);const encoding=typeof options==='string'?options:options?.encoding;return encoding?b.toString(encoding):Buffer.from(b);};
  const prior=api.createSortArrowPriorRead({root,read});for(const [file]of entries){assert.equal(prior(file,'utf8'),previous(file,'utf8'));
    const key=path.resolve(file),bytes=staged.get(key);staged.set(key,Buffer.concat([bytes,Buffer.from('\n// drift')]));assert.throws(()=>prior(file));staged.set(key,bytes);}
  // Derive the intermediate through its owning inverse, then prove repeated
  // Tree routing preserves it and still rejects unrecognized source drift.
  const {restoreEditingLegacySource}=await import('./editing-context-registration.mjs');
  const {createTreeFocusPriorRead}=await import('./tree-focus-registration.mjs');
  const divider='tests/material-parity/divider-owner-context-registration.spec.mjs',restoredDivider=restoreEditingLegacySource(readFileSync(divider),'proof');
  assert.equal(hash(restoredDivider),'035e13aab28532b8e832992c1027ab15d340193d5940df46af5917e0a67380e7');
  const repeated=createTreeFocusPriorRead({root,read:(_file,encoding)=>encoding?restoredDivider:Buffer.from(restoredDivider)});assert.equal(repeated(divider,'utf8'),restoredDivider);
  assert.throws(()=>createTreeFocusPriorRead({root,read:()=>Buffer.from(restoredDivider+'\n// drift')})(divider));
  const launcherFile=entries[3][0],before=previous(launcherFile,'utf8'),after=read(launcherFile,'utf8');
  const rootLine="const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');";
  const run=(source,flags)=>spawnSync(process.execPath,['--input-type=module','-','--dry-run',...flags],{input:source.replace(rootLine,`const root = ${JSON.stringify(root)};`),encoding:'utf8',windowsHide:true});
  const selected=run(after,['--sort-arrow']);assert.equal(selected.status,0,selected.stderr);assert.ok(JSON.parse(selected.stdout).args.includes('--case-obligation-review-sha256='+api.sortArrowReview));
  assert.deepEqual(JSON.parse(run(after,[]).stdout),JSON.parse(run(before,[]).stdout));
  for(const flag of [...before.matchAll(/rawRequested\.includes\('(--[^']+)'\)/g)].map(m=>m[1])){
    const a=run(before,[flag]),b=run(after,[flag]);assert.equal(a.status,0,a.stderr);assert.equal(b.status,0,b.stderr);assert.deepEqual(JSON.parse(a.stdout),JSON.parse(b.stdout));assert.notEqual(run(after,['--sort-arrow',flag]).status,0);}
  const runner=ts.createSourceFile('runner.mjs',read(entries[2][0],'utf8'),99,true,ts.ScriptKind.JS);assert.equal(runner.parseDiagnostics.length,0);let selector;
  const visit=n=>{if(ts.isVariableDeclaration(n)&&n.name.getText(runner)==='sortArrowReaderFactory')selector=n.initializer.getText(runner);ts.forEachChild(n,visit);};visit(runner);assert.ok(selector);
  const choose=new Function('options','sortArrowReview','createSortArrowReviewReader','treeFocusReaderFactory','return '+selector),fresh=()=>{},old=()=>{};
  assert.equal(choose({caseObligationReviewSha256:api.sortArrowReview},api.sortArrowReview,fresh,old),fresh);assert.equal(choose({caseObligationReviewSha256:'0'.repeat(64)},api.sortArrowReview,fresh,old),old);
  assert.throws(()=>api.createSortArrowReviewReader({root,read,reviewSha256:'0'.repeat(64)}));
  const reader=api.createSortArrowReviewReader({root,read,reviewSha256:api.sortArrowReview}),file=`artifacts/material-parity/working-audit/proposals/${api.sortArrowReview}.json`;
  const review=JSON.parse(reader.read(file)).review;assert.equal(hash(JSON.stringify(review)),api.sortArrowReview);
  const {loadCaseObligationReview}=await import('../../scripts/audit-findings-store.mjs');
  const loaded=loadCaseObligationReview(file,api.sortArrowReview,review.groups.map(g=>g.case),{root,read:reader.read});
  assert.equal(loaded.cases.length,2311);assert.equal(loaded.inspectionComplete,false);assert.equal(loaded.currentRenderingAccepted,false);
  t.diagnostic(JSON.stringify({review:api.sortArrowReview,authenticatedDependencies:loaded.evidenceFingerprints.length,restoredSourcePaths:4,stagedOnly:true,canonicalPublished:false}));
});
test('Sort arrow partial join conserves the complete Tree predecessor and all remaining work',async t=>{
  const base='artifacts/material-parity/working-audit',pointer={generation:'8848ae5b1ca0b18bc04116ebdd1eb2c360b7497a298e69fca9578df4a1b2b420',indexSha256:'3a73b61ec4e00539a62f17cf96f75c12bb29a74ae202a882ffdb2c55d73a118b'};
  // Authenticate the retained predecessor, independently of the mutable current pointer.
  const bytes=readFileSync(`${base}/${pointer.generation}/index.json`);assert.equal(hash(bytes),pointer.indexSha256);
  const coverage=JSON.parse(bytes).metadata.coverage.inspectionEvidence;
  const accepted={kind:'case-obligation-coverage-extension',status:'proposal-not-canonical',scope:coverage.scope,groups:coverage.cases};
  const {joinTextHeldEvidence}=await import('../../scripts/join-material-text-held-evidence.mjs');
  const {joinTreeFocusEvidence}=await import('../../scripts/join-material-tree-focus-evidence.mjs');
  const {joinSortArrowEvidence,restoreSortArrowEvidence,sortArrowPredecessor}=await import('../../scripts/join-material-sort-arrow-evidence.mjs');
  const parent=joinTreeFocusEvidence(joinTextHeldEvidence(accepted).review).review;assert.equal(hash(JSON.stringify(parent)),sortArrowPredecessor);
  const joined=joinSortArrowEvidence(parent);assert.equal(joined.cases,60);assert.equal(joined.addedChildren,62);
  assert.deepEqual(restoreSortArrowEvidence(joined.review),parent);let changed=0,paint=0;
  for(let i=0;i<parent.groups.length;i++){const a=parent.groups[i],b=joined.review.groups[i];
    assert.equal(b.inspection,a.inspection);assert.equal(b.currentRendering,a.currentRendering);
    for(const name of Object.keys(a.obligations)){assert.equal(b.obligations[name].disposition,a.obligations[name].disposition);assert.deepEqual(b.obligations[name].remaining,a.obligations[name].remaining);}
    if(a!==b)changed++;paint+=Number(!!b.obligations.localPaint.supplementarySortArrowLocalPixels);
  }
  assert.equal(changed,60);assert.equal(paint,2);
  assert.throws(()=>joinSortArrowEvidence(joined.review));
  assert.throws(()=>joinSortArrowEvidence(parent,(file,...args)=>file.endsWith('focus/sort-primary-raster-astylar.png')?Buffer.from('forged'):readFileSync(file,...args)));
  t.diagnostic(JSON.stringify({review:joined.sha256,predecessor:sortArrowPredecessor,cases:60,addedChildren:62,retainedPaintCases:2,completePredecessorRecovered:true,physicalProposalWritten:false,canonicalPublished:false,currentRenderingAccepted:false}));
});
test('pending Sort arrow findings preserve separate state and vector ownership',async()=>{
  const {sortArrowFindings:findings}=await import('./sort-arrow-findings.mjs');assert.equal(findings.length,2);
  assert.equal(new Set(findings.map(f=>f.id)).size,2);
  for(const f of findings){assert.equal(f.classification,'application-plugin-authoring-defect');assert.equal([...readFileSync(f.file,'utf8').matchAll(new RegExp(f.pattern,'g'))].length,1);assert.ok(f.owner&&f.action&&f.boundary);}
  assert.equal(findings[0].observation.hoverFailures,8);assert.equal(findings[0].observation.cases,60);
  assert.match(findings[1].retainedPaint.attribution,/not proof of capture-time plugin identity/);
  const file='examples/material-showcase/src/app/astylar.component.ts';
  const branch=revision=>{const s=execFileSync('git',['show',revision+':'+file],{encoding:'utf8',maxBuffer:3e6}),t=ts.createSourceFile(file,s,99,true);let found;
    const visit=n=>{if(ts.isIfStatement(n)&&n.expression.getText(t)==="family === 'sort'")found=n.getText(t);ts.forEachChild(n,visit);};visit(t);assert.ok(found);return found;};
  const history=findings[0].history;
  assert.match(branch(history.initialArrow),/\.\.\.\(state\.open \? \[/);
  assert.match(branch(history.focusGate),/state\.open \|\| focused/);
  assert.match(branch(history.pluginArrow),/state\.open \|\| focused/);
  for(const revision of Object.values(history))assert.equal(/hoveredId/.test(branch(revision)),false);
});
test('all retained Sort hover contexts omit the candidate arrow despite visible native opacity',t=>{
  const bytes=readFileSync('artifacts/material-parity/current-full-20261005/latest-report.json');
  assert.equal(hash(bytes),'ab42dbec6280e0e27784ec4bbc6697d4ea451bfab307bccb720c0dec89a83b62');
  const report=JSON.parse(bytes);let cases=0,hover=0,hidden=0,present=0;const observations=[];
  for(const [kind,rows]of [['static',report.results],['interaction',report.interactions]])for(const row of rows.filter(r=>r.family==='sort')){
    cases++;const trees={};for(const side of ['reference','astylar']){const q=row.inputTrees[side],b=readFileSync(q.file);assert.equal(hash(b),q.sha256);trees[side]=JSON.parse(b);}
    const svg=trees.reference.nodes.filter(n=>n.type==='svg');assert.equal(svg.length,1);
    const owner=trees.reference.nodes.find(n=>n.key===svg[0].parent);assert.ok(owner);
    const opacity=Number(trees.reference.styles[owner.style].opacity),arrows=trees.astylar.nodes.filter(n=>n.authored?.id==='sort-arrow');
    if(kind==='static'){assert.equal(opacity,0);assert.equal(arrows.length,0);hidden++;}
    else if(row.state==='hover'){assert.equal(opacity,.54);assert.equal(arrows.length,0);hover++;
      observations.push({case:`interaction:sort@${row.profile}/${row.viewport.id}/hover`,nativeOpacity:opacity,candidateArrowCount:0,evidence:row.inputTrees});}
    else{assert.ok(['focus','held','activate','activate-leave','activate-twice'].includes(row.state));assert.equal(arrows.length,1);
      assert.equal(arrows[0].authored.data.opacity,opacity);assert.equal(arrows[0].authored.data.direction,row.state==='activate-twice'?'desc':'asc');present++;}
  }
  assert.deepEqual({cases,hover,hidden,present},{cases:60,hover:8,hidden:12,present:40});
  const f='examples/material-showcase/src/app/astylar.component.ts',source=readFileSync(f,'utf8'),tree=ts.createSourceFile(f,source,99,true,ts.ScriptKind.TS);let branch;
  const visit=n=>{if(ts.isIfStatement(n)&&n.expression.getText(tree)==="family === 'sort'")branch=n;ts.forEachChild(n,visit);};visit(tree);assert.ok(branch);
  assert.match(branch.getText(tree),/state\.open \|\| focused \? \[\{/);
  assert.equal(/hoveredId/.test(branch.getText(tree)),false);
  t.diagnostic(JSON.stringify({id:'fixture-sort-hover-arrow-omitted',classification:'application-plugin-authoring-defect',
    owner:'showcase Sort arrow presence/state translation',counts:{cases,hover,hidden,present},observations,
    boundary:'Retained native opacity versus authored candidate presence;current source gate agrees. Not raw hover timing,animation,paint,current served-code equality or whole-case closure.'}));
});
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
  const rasterHashes={focus:{reference:'811cf77777b732c2c3470a623c1074159f348eb6bed0a29e9b86152dcf6aca2f',astylar:'928b374f2f2470653c0c2bdf0e12fe93b9bccc62d890150965536a56893a603e'},
    activate:{reference:'377516f4a20733938c9a81d872e3325dbdae9fd6e7ff879325d69cca54e85fec',astylar:'0df80abafbdf7f3701fdf61234c333092781d2b03cebe9f7f2b45b785db67c67'}};
  const rasterObservations=[];
  const pixel=(p,x,y)=>[...p.data.slice((y*p.width+x)*4,(y*p.width+x)*4+4)];
  for(const row of rows){const images={},receipts={};
    for(const side of ['reference','astylar']){const file=`artifacts/material-parity/current-full-20261005/interactions/sort/light/desktop-dpr1/${row.state}/sort-primary-raster-${side}.png`,bytes=readFileSync(file);
      assert.equal(hash(bytes),rasterHashes[row.state][side]);images[side]=PNG.sync.read(bytes);receipts[side]={file,sha256:hash(bytes)};}
    const {id,...recorded}=row.focusedRasters.find(r=>r.id==='sort-primary');assert.equal(id,'sort-primary');
    assert.deepEqual(evaluateFocusedRaster(images.reference,images.astylar),recorded);
    assert.deepEqual(recorded.phaseOffset,{x:0,y:0});
    const background=pixel(images.reference,0,0),nativeStem=pixel(images.reference,114,15),candidateStem=pixel(images.astylar,114,15);
    assert.deepEqual(pixel(images.astylar,0,0),background);
    assert.deepEqual(pixel(images.reference,112,16),background);assert.notDeepEqual(pixel(images.astylar,112,16),background);
    if(row.state==='activate'){assert.deepEqual(nativeStem,[29,27,32,255]);assert.deepEqual(candidateStem,nativeStem);}
    else{const estimate=c=>background.slice(0,3).reduce((sum,b,i)=>sum+(b-c[i])/(b-[29,27,32][i]),0)/3;
      assert.ok(Math.abs(estimate(nativeStem)-.54)<.006);assert.ok(Math.abs(estimate(candidateStem)-(1-(1-.54)**2))<.006);}
    rasterObservations.push({state:row.state,receipts,background,nativeStem,candidateStem,
      nativeNotch:pixel(images.reference,112,16),candidateNotch:pixel(images.astylar,112,16)});
  }
  t.diagnostic(JSON.stringify({cases:rows.map(r=>`interaction:sort@light/desktop-dpr1/${r.state}`),source:{file:pluginFile,sha256:hash(source)},nativeArea,triangleArea,
    id:'fixture-sort-arrow-triangulation-fills-notch-and-overdraws',
    witnesses:[{point:{x:2,y:-1.5},nativeFilled:false,candidateTriangles:1},{point:{x:0,y:-2},nativeFilled:true,candidateTriangles:2}],
    finding:'Current plugin geometry fills a point outside the retained reference path and double-covers another despite matching bounds.',
    classification:'application-plugin-authoring-defect',owner:'Material sort-arrow CSS-space vector paint geometry',
    history:{introduction,parent,cssBoundary,initialSourceSha256:hash(initial),boundarySourceSha256:hash(boundary),
      topologyPreserved:true,boundary:'Initial world-scaled function evaluated at unit scale only;not historical projection or browser execution. The CSS-boundary revision preserves identical CSS vertices.'},
    rasterObservations,
    boundary:'Two retained inputs and audit-pinned existing PNGs with exact metric replay versus current plugin geometry. Pixel observations fit single/double alpha coverage but do not prove capture-time plugin identity or historical GPU cause. Not current browser rendering,all contexts or whole-case closure.'}));
});
