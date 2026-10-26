import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import ts from 'typescript';
import {restoreDividerMarginRegistry} from './divider-margin-registration.mjs';

const hash=b=>createHash('sha256').update(b).digest('hex');

test('Focus selection staged registry preserves every accepted source proof finding and plan',async t=>{
  const {prepareFocusSelectionAuditRegistry:prepare,restoreFocusSelectionAuditRegistry:restore,createFocusSelectionAuditPriorRead:priorFactory}=await import('./public-tab-selection-finding.mjs');
  const acceptedRead=priorFactory({root:process.cwd(),read:readFileSync});
  const raw={},staged={};for(const [kind,file]of Object.entries({producer:'tests/material-parity/input-equivalence-audit.mjs',policy:'tests/material-parity/input-equivalence-policy.mjs'})){
    const rawLive=readFileSync(file,'utf8').replaceAll('\r\n','\n');const live=kind==='producer'?restoreDividerMarginRegistry(rawLive):rawLive;raw[kind]=acceptedRead(file,'utf8');staged[kind]=prepare(raw[kind],kind,readFileSync);
    assert.equal(restore(staged[kind],kind),raw[kind]);assert.equal(readFileSync(file,'utf8').replaceAll('\r\n','\n'),rawLive);if(live!==raw[kind])assert.equal(live,staged[kind]);
    assert.throws(()=>prepare(raw[kind]+'\n// drift',kind,readFileSync));assert.throws(()=>restore(staged[kind]+'\n// drift',kind));assert.throws(()=>prepare(staged[kind],kind,readFileSync));
  }
  assert.throws(()=>prepare(raw.producer,'producer',()=>Buffer.alloc(0)));
  const arrays=source=>{const tree=ts.createSourceFile('registry.mjs',source,99,true,ts.ScriptKind.JS),out={};assert.equal(tree.parseDiagnostics.length,0);
    for(const name of ['sourceFingerprints','focusedProofInventory','implementationPlan']){const fn=tree.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name);if(!fn)continue;let array;const visit=n=>{if(!array&&ts.isArrayLiteralExpression(n))array=n;ts.forEachChild(n,visit);};visit(fn);out[name]=array.elements.map(n=>n.getText(tree));}
    const variable=tree.statements.flatMap(n=>ts.isVariableStatement(n)?[...n.declarationList.declarations]:[]).find(n=>n.name.getText(tree)==='sourceAuditDefinitions');if(variable)out.definitions=variable.initializer.arguments[0].elements.map(n=>n.getText(tree));return out;};
  const before=arrays(raw.producer),after=arrays(staged.producer);
  for(const [name,count,added]of [['sourceFingerprints',1070,7],['focusedProofInventory',398,9],['implementationPlan',69,1]]){
    assert.equal(before[name].length,count);assert.equal(after[name].length,count+added);assert.deepEqual(after[name].slice(added),before[name]);
  }
  assert.equal(new Set(after.sourceFingerprints).size,1077);
  const old=arrays(raw.policy).definitions,next=arrays(staged.policy).definitions;assert.equal(old.length,202);assert.equal(next.length,203);assert.deepEqual(next.slice(1),old);
  const finding=new Function('return '+next[0])();assert.equal(finding.id,'core-native-tab-selection-overwritten-by-control-sync');assert.ok(Array.isArray(finding.evidence));
  const tree=ts.createSourceFile('audit.mjs',raw.producer,99,true,ts.ScriptKind.JS),validator=tree.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='validateMaterialInputAudit');
  const block=validator.body.statements.find(n=>ts.isForOfStatement(n)&&n.expression.getText().startsWith('sourceAuditDefinitions.filter'));
  const {existsSync}=await import('node:fs'),{default:path}=await import('node:path');
  const validate=new Function('sourceAuditDefinitions','report','root','path','existsSync','createHash','readFileSync','const errors=[];'+block.getText()+';return errors;');
  const run=f=>validate([f],{sourceFindings:[f]},process.cwd(),path,existsSync,createHash,readFileSync);
  assert.deepEqual(run(finding),[]);assert.throws(()=>run({...finding,evidence:{report:finding.evidence[0]}}));
  assert.ok(run({...finding,evidence:[{...finding.evidence[0],sha256:'0'.repeat(64)}]}).length);
  const api=await import('./public-tab-selection-finding.mjs'),root=process.cwd();
  const entries=[['tests/material-parity/input-equivalence-audit.mjs','producer'],['tests/material-parity/input-equivalence-policy.mjs','policy'],['scripts/run-material-input-audit.mjs','runner'],['scripts/export-material-input-audit-current-ancestry.mjs','launcher']];
  for(const [file,kind]of entries.slice(2)){
    const live=readFileSync(file,'utf8').replaceAll('\r\n','\n');raw[kind]=acceptedRead(file,'utf8');staged[kind]=api.prepareFocusSelectionAuditSelection(raw[kind],kind);if(live!==raw[kind])assert.equal(live,staged[kind]);
    assert.equal(api.restoreFocusSelectionAuditSelection(staged[kind],kind),raw[kind]);
    assert.throws(()=>api.restoreFocusSelectionAuditSelection(staged[kind]+'\n// drift',kind));
  }
  const launcherRoot="const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');";
  const {spawnSync}=await import('node:child_process');
  const launch=(source,flags)=>spawnSync(process.execPath,['--input-type=module','-','--dry-run',...flags],{input:source.replace(launcherRoot,`const root = ${JSON.stringify(root)};`),encoding:'utf8',windowsHide:true});
  const selected=launch(staged.launcher,['--focus-selection']);assert.equal(selected.status,0,selected.stderr);
  assert.ok(JSON.parse(selected.stdout).args.includes('--case-obligation-review-sha256='+api.focusSelectionReview));
  assert.deepEqual(JSON.parse(launch(staged.launcher,[]).stdout),JSON.parse(launch(raw.launcher,[]).stdout));
  for(const flag of [...raw.launcher.matchAll(/rawRequested\.includes\('(--[^']+)'\)/g)].map(m=>m[1])){
    const a=launch(raw.launcher,[flag]),b=launch(staged.launcher,[flag]);assert.equal(a.status,0,a.stderr);assert.equal(b.status,0,b.stderr);assert.deepEqual(JSON.parse(a.stdout),JSON.parse(b.stdout));assert.notEqual(launch(staged.launcher,['--focus-selection',flag]).status,0);
  }
  const runnerTree=ts.createSourceFile('runner.mjs',staged.runner,99,true,ts.ScriptKind.JS),variables={};assert.equal(runnerTree.parseDiagnostics.length,0);
  const visit=n=>{if(ts.isVariableDeclaration(n)&&['focusSelectionReaderFactory','applicability'].includes(n.name.getText(runnerTree)))variables[n.name.getText(runnerTree)]=n.getText(runnerTree);ts.forEachChild(n,visit);};visit(runnerTree);
  const syntax=spawnSync(process.execPath,['--check','--input-type=module'],{input:staged.runner,encoding:'utf8',windowsHide:true});assert.equal(syntax.status,0,syntax.stderr);
  assert.equal(variables.applicability.includes('await '),false);
  let syncGuard;const findGuard=n=>{if(ts.isExpressionStatement(n)&&n.getText(runnerTree).includes('Audit evidence readers must be synchronous within evidence session'))syncGuard=n.getText(runnerTree);ts.forEachChild(n,findGuard);};findGuard(runnerTree);assert.ok(syncGuard);
  const choose=new Function('options','focusSelectionReview','createFocusSelectionAuditReviewReader','sortArrowReaderFactory','root','auditReadFileSync','assert',
    'const '+variables.focusSelectionReaderFactory+';const '+variables.applicability+';'+syncGuard+';return applicability?.read;');
  const freshRead=()=>{},oldRead=()=>{},fresh=()=>({read:freshRead}),previous=()=>({read:oldRead});
  assert.equal(choose({caseObligationReviewSha256:api.focusSelectionReview},api.focusSelectionReview,fresh,previous,root,readFileSync,assert),freshRead);
  assert.equal(choose({caseObligationReviewSha256:'0'.repeat(64)},api.focusSelectionReview,fresh,previous,root,readFileSync,assert),oldRead);
  assert.throws(()=>choose({caseObligationReviewSha256:api.focusSelectionReview},api.focusSelectionReview,async()=>({read:freshRead}),previous,root,readFileSync,assert),/must be synchronous/);
  const stages=new Map(entries.map(([file,kind])=>[path.resolve(root,file),Buffer.from(staged[kind])]));
  const {withAuditEvidenceSession,auditReadFileSync}=await import('./audit-evidence-session.mjs');
  const read=(file,options)=>{const bytes=stages.get(path.resolve(root,file));if(!bytes)return auditReadFileSync(file,options);auditReadFileSync(file);const encoding=typeof options==='string'?options:options?.encoding;return encoding?bytes.toString(encoding):Buffer.from(bytes);};
  assert.throws(()=>api.createFocusSelectionAuditReviewReader({root,read,reviewSha256:'0'.repeat(64)}));
  const sharedFile='tests/material-parity/tree-focus-registration.mjs',shared=readFileSync(sharedFile,'utf8').replaceAll('\r\n','\n'),oldShared=api.restoreFocusSelectionSharedSource(shared);
  assert.equal(api.prepareFocusSelectionSharedSource(oldShared),shared);assert.equal(api.restoreFocusSelectionSharedSource(oldShared),oldShared);
  assert.throws(()=>api.restoreFocusSelectionSharedSource(shared+'\n// drift'));
  const {restoreTextHeldProducer}=await import('./text-held-registration.mjs');
  assert.equal(restoreTextHeldProducer(staged.producer),restoreTextHeldProducer(raw.producer));
  const {createTreeFocusPriorRead,restoreTreeFocusSelection}=await import('./tree-focus-registration.mjs');
  for(const kind of ['runner','launcher'])assert.equal(restoreTreeFocusSelection(staged[kind],kind),restoreTreeFocusSelection(raw[kind],kind));
  const historical=createTreeFocusPriorRead({root,read});assert.equal(historical(sharedFile,'utf8'),oldShared);
  const directPrior=api.createFocusSelectionAuditPriorRead({root,read});
  for(const [file,kind]of entries)assert.equal(directPrior(file,'utf8'),raw[kind]);
  const sortFile='tests/material-parity/sort-arrow-findings.mjs',sortSource=readFileSync(sortFile,'utf8').replaceAll('\r\n','\n'),oldSort=api.restoreFocusSelectionSortSource(sortSource);
  assert.equal(api.prepareFocusSelectionSortSource(oldSort),sortSource);assert.throws(()=>api.restoreFocusSelectionSortSource(sortSource+'\n// drift'));
  const {createSortArrowPriorRead}=await import('./sort-arrow-findings.mjs'),sortRead=createSortArrowPriorRead({root,read}),sortControl=createSortArrowPriorRead({root,read:readFileSync});
  for(const [file]of entries)assert.equal(sortRead(file,'utf8'),sortControl(file,'utf8'));
  if(process.env.ASTYLAR_AUDIT_FOCUS_SELECTION_FULL==='1'){
    const {loadCaseObligationReview}=await import('../../scripts/audit-findings-store.mjs');
    const loaded=withAuditEvidenceSession(()=>{
      const reader=api.createFocusSelectionAuditReviewReader({root,read,reviewSha256:api.focusSelectionReview});assert.equal(typeof reader.then,'undefined');
      const file=reader.file.slice(root.length+1).replaceAll('\\','/');
      return loadCaseObligationReview(file,api.focusSelectionReview,reader.review.groups.map(g=>g.case),{root,read:reader.read});
    },{root,onMetrics:metrics=>t.diagnostic(JSON.stringify({evidenceSession:metrics}))});
    assert.equal(loaded.cases.length,2311);assert.equal(loaded.inspectionComplete,false);assert.equal(loaded.currentRenderingAccepted,false);
    t.diagnostic(JSON.stringify({review:api.focusSelectionReview,dependencies:loaded.evidenceFingerprints.length,restoredRegistrySelectionSources:4,stagedOnly:true}));
  }
  t.diagnostic(JSON.stringify({stagedSources:1077,stagedProofs:407,stagedFindings:203,stagedTracks:70,completePredecessorRecovered:true,liveWrites:false,canonicalUnchanged:true}));
});

test('pending public Tab-selection finding authenticates its bounded cause without promoting the audit',async()=>{
  const {publicTabSelectionFinding:f}=await import('./public-tab-selection-finding.mjs');
  assert.equal(f.classification,'confirmed-core-renderer-defect');
  assert.equal([...readFileSync(f.file,'utf8').matchAll(new RegExp(f.pattern,'g'))].length,1);
  for(const receipt of f.evidence)assert.equal(hash(readFileSync(receipt.file)),receipt.sha256);
  assert.equal(f.observation.causalTrace.pairs,1);assert.equal(f.observation.publicPairs,4);
  assert.match(f.recommendation,/Do not globally selectAll/);
  assert.match(f.boundary,/Not email-specific setter attribution/);
});

test('public Tab trace observes native selection overwritten by queued semantic control sync',()=>{
  const directory='artifacts/material-parity/public-tab-selection-trace-20261025',bytes=readFileSync(directory+'/latest-report.json');
  assert.equal(hash(bytes),'966276cd72bd0043b30e86923b67e130a0a8048831d43906db875e754b15f1dd');
  const report=JSON.parse(bytes),verified=JSON.parse(execFileSync(process.execPath,['scripts/audit-public-tab-selection-trace.mjs','--verify',directory],{encoding:'utf8'}));
  assert.equal(verified.endpointControlMatches,true);
  const check=report=>{
    for(const row of report.results){const first=row.tabTrace.find(r=>r.kind==='focus-capture');assert.deepEqual([first.state.start,first.state.end],[0,16]);}
    const native=report.results.find(r=>r.mode==='reference'),candidate=report.results.find(r=>r.mode==='astylar');
    assert.equal(native.tabTrace.some(r=>r.kind==='range-before'),false);
    const index=candidate.tabTrace.findIndex(r=>r.kind==='range-before'),write=candidate.tabTrace[index];
    assert.deepEqual([write.state.start,write.state.end],[0,16]);assert.deepEqual(write.args,[0,0,'none']);
    assert.match(write.stack,/AstylarSemanticBridge\.applyControlState/);assert.match(write.stack,/AstylarSemanticBridge\.syncControlStates/);
    const after=candidate.tabTrace[index+1];assert.equal(after.kind,'range-after');assert.deepEqual([after.state.start,after.state.end],[0,0]);
  };check(report);
  const wrong=structuredClone(report);wrong.results[1].tabTrace.find(r=>r.kind==='range-before').state.end=0;assert.throws(()=>check(wrong));
});

test('Tab selection trace binds complete current and installed selection-sync methods',t=>{
  const report=JSON.parse(readFileSync('artifacts/material-parity/public-email-tab-entry-20261025/latest-report.json'));
  const normalize=text=>{const scan=ts.createScanner(99,true,ts.LanguageVariant.Standard,text),out=[];let token;
    while((token=scan.scan())!==ts.SyntaxKind.EndOfFileToken)out.push([token,scan.getTokenText()]);return JSON.stringify(out);};
  const body=(source,name,owner)=>{const tree=ts.createSourceFile('owner.js',source,99,true,ts.ScriptKind.JS),found=[];
    assert.equal(tree.parseDiagnostics.length,0);const visit=n=>{if((ts.isMethodDeclaration(n)||ts.isPropertyDeclaration(n))&&n.parent.name?.text===owner&&n.name?.getText(tree)===name&&(n.body||n.initializer))found.push((n.body??n.initializer).getText(tree));ts.forEachChild(n,visit);};visit(tree);assert.equal(found.length,1,name);return normalize(found[0]);};
  const receipts=[];for(const [source,installed,owner,names]of [
    ['src/lib/astylar-semantic-bridge.ts','examples/material-showcase/node_modules/astylarui/dist/lib/lib/astylar-semantic-bridge.js','AstylarSemanticBridge',['handleFocusIn','queueControlStateSync','syncControlStates','applyControlState']],
    ['src/lib/astylar.ts','examples/material-showcase/node_modules/astylarui/dist/lib/lib/astylar.js','AstylarRenderer',['mount','getLiveSemanticControlState']]]){
    const original=readFileSync(source),compiled=ts.transpileModule(original.toString(),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022,experimentalDecorators:true}}).outputText,packed=readFileSync(installed);
    assert.ok(report.inputs.some(r=>r.file===installed&&r.sha256===hash(packed)));
    for(const name of names){const current=body(compiled,name,owner);assert.equal(current,body(packed.toString(),name,owner),name);receipts.push({source:{file:source,sha256:hash(original)},installed:{file:installed,sha256:hash(packed)},owner,method:name,completeBodySha256:hash(current)});}
  }
  t.diagnostic(JSON.stringify({methods:receipts,boundary:'Six complete current/installed methods bound to the traced bundle;not original Material cause,all focus origins or historical introduction.'}));
});
test('public text and email Tab-entry failures separate initial selection from explicit replacement',()=>{
  const load=(name,sha)=>{const directory='artifacts/material-parity/'+name+'-20261025',bytes=readFileSync(directory+'/latest-report.json');
    assert.equal(hash(bytes),sha);const summary=JSON.parse(execFileSync(process.execPath,['scripts/audit-'+name+'.mjs','--verify',directory],{encoding:'utf8'}));
    assert.equal(summary.negativeControlsRejected,4);return{report:JSON.parse(bytes),summary};};
  const explicit=load('public-email-selection','c5ee5295c582fe7506c21b3e3124cc357e4cac82785822dfa5294d36caa26683');
  const tab=load('public-email-tab-entry','beb04e64610f8c4ef4d6b6298ff504874d4fc2e9fbafa2c8b507fc6488fbee3a');
  assert.equal(explicit.summary.replacementFailingPairs,0);assert.equal(tab.summary.replacementFailingPairs,4);
  assert.equal(explicit.report.source.sha256,tab.report.source.sha256);
  assert.equal(explicit.report.bundle.sha256,tab.report.bundle.sha256);
  assert.deepEqual(explicit.report.inputs,tab.report.inputs);
  for(let i=0;i<tab.report.results.length;i++){
    const row=tab.report.results[i],control=explicit.report.results[i];assert.deepEqual(row.site,control.site);
    assert.equal(row.samples[0].focused,true);assert.equal(control.samples[0].focused,true);
    if(row.kind==='text')assert.deepEqual([row.samples[0].selectionStart,row.samples[0].selectionEnd],row.mode==='reference'?[0,16]:[0,0]);
    else for(const sample of row.samples){assert.equal(sample.selectionStart,null);assert.equal(sample.selectionEnd,null);}
    assert.equal(row.samples[1].value,row.mode==='reference'?'Z':'Zteam@example.com');
    assert.equal(control.samples[1].value,'Z');
    const events=row.samples.at(-1).events;
    assert.equal(events.filter(e=>e.type==='beforeinput').length,row.mode==='reference'?3:0);
    assert.equal(events.filter(e=>e.type==='input').length,row.mode==='reference'?2:0);
  }
  // Equal output after explicit Ctrl+A is a control,not event parity. Text Tab
  // endpoints expose the divergence without inventing email selection values.
});

test('public selection controls reuse authenticated installed keyboard-owner applicability',()=>{
  const file='artifacts/material-parity/public-readonly-owning-methods-20261020.log',bytes=readFileSync(file);
  assert.equal(hash(bytes),'4d4dd8440ab6c2a3c9c357b24fa6f6d00110f67b288284a86466b8d73500b81a');
  const methods=JSON.parse(bytes).methods,report=JSON.parse(readFileSync('artifacts/material-parity/public-email-tab-entry-20261025/latest-report.json'));
  assert.equal(methods.length,6);
  for(const item of methods){
    assert.equal(item.completeBodyEqual,true);
    for(const receipt of [item.source,item.installed])assert.equal(hash(readFileSync(receipt.file)),receipt.sha256);
    assert.ok(report.inputs.some(r=>r.file===item.installed.file&&r.sha256===item.installed.sha256));
  }
  // Keyboard/insertion methods only. Tab focus/selection synchronization still
  // needs its own causal trace;this does not attribute a particular setter.
});
