import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { execFileSync,spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import { gunzipSync } from 'node:zlib';
import { chromium } from 'playwright-core';
import path from 'node:path';
import { joinTextHeldEvidence,restoreTextHeldEvidence,textHeldPredecessor } from '../../scripts/join-material-text-held-evidence.mjs';
import { prepareTextHeldProducer,restoreTextHeldProducer,textHeldSources,textHeldProofTitles,
  prepareTextHeldSelection,restoreTextHeldSelection,createTextHeldPriorRead,createTextHeldReviewReader,textHeldReview } from './text-held-registration.mjs';

// Diagnose the retained harness, not a requirement that a future harness keep
// this defect. Git source was compared with the capture-pinned working bytes,
// allowing only CRLF normalization; the raw capture receipt is checked below.
const hash = value => createHash('sha256').update(value).digest('hex');
const source = execFileSync('git', ['show', '58ce15f:tests/material-parity/run-material-parity.mjs'], { encoding: 'utf8', maxBuffer: 4e6 });
assert.equal(hash(source), 'c3cabcfde7b9a0cd911eb919774e258145aefc629ff308a48f1f51ece0f34e10');
const ast = ts.createSourceFile('retained.mjs', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const functions = ast.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === 'focusedIdentity');
assert.equal(functions.length, 1);
const focusedIdentity = new Function(`return (${functions[0].getText(ast)})`)();
const gates = [];
const visit = n => { if (ts.isVariableDeclaration(n) && n.name.getText(ast) === 'focusMatches') gates.push(n.initializer.getText(ast)); ts.forEachChild(n, visit); };
visit(ast); assert.deepEqual(gates, ["state !== 'focus' || referenceFocus === astylarFocus"]);
const gate = new Function('state', 'referenceFocus', 'astylarFocus', `return ${gates[0]}`);

test('original text-input held rows retain post-release focus,not held-focus evidence',t=>{
  const bytes=readFileSync('artifacts/material-parity/current-full-20261005/latest-report.json');
  assert.equal(hash(bytes),'ab42dbec6280e0e27784ec4bbc6697d4ea451bfab307bccb720c0dec89a83b62');
  const report=JSON.parse(bytes),encoded=readFileSync('docs/evidence/material-original-runner-e01.mjs.gz.b64');
  const original=gunzipSync(Buffer.from(encoded.toString().replace(/\s/g,''),'base64'));
  assert.equal(hash(original),'e01ef9dc44386d93885ca06428da0b8b42ccb8bad37f9de99bdd61a5c95c6eb0');
  assert.equal(report.captureProvenance.harnessFiles.find(r=>r.file==='tests/material-parity/run-material-parity.mjs').sha256,hash(original));
  const tree=ts.createSourceFile('original.mjs',original.toString(),99,true,ts.ScriptKind.JS);
  const capture=tree.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='captureInteractionCase');
  const statements=capture.body.statements.find(ts.isTryStatement).tryBlock.statements;
  const position=fragment=>{
    const matches=[...statements].map((n,i)=>[n.getText(tree),i]).filter(([text])=>text.includes(fragment));
    assert.equal(matches.length,1);return matches[0][1];
  };
  const release=position('for (const release of heldReleases)');
  assert.ok(position('captureInteractionImage(reference.page')<release);
  assert.ok(position('const referenceFocus =')>release);assert.ok(position('const astylarFocus =')>release);
  const cases=[];
  for(const family of ['input','form-field']){
    const rows=report.interactions.filter(r=>r.family===family&&r.state==='held');assert.equal(rows.length,8);
    for(const row of rows){
      assert.deepEqual(row.focus,{reference:family+'-primary',astylar:family+'-primary',matches:true});
      assert.equal(gate('held','different-native-owner','different-candidate-owner'),true);
      cases.push(`interaction:${family}@${row.profile}/${row.viewport.id}/held`);
    }
  }
  assert.equal(new Set(cases).size,16);
  t.diagnostic(JSON.stringify({cases,originalRunnerSha256:hash(original),
    boundary:'Exact original input/form-field held records only. Screenshots precede release;focus reads follow release and non-focus gate accepts mismatched owners. Matching normalized post-release IDs do not establish held native focus,raw owner identity,default-action continuity or current rendering. No new renderer diagnosis or acceptance change.'}));
});

test('supplementary text-control holds retain raw input owners without accepting event parity',()=>{
  const file='artifacts/material-parity/text-control-held-focus-20261025/latest-report.json';
  const bytes=readFileSync(file);assert.equal(hash(bytes),'b4899d94b58f2aed5d7a51557b6461778e6a6a1a32749b6a616817c3618b3e2e');
  const report=JSON.parse(bytes);assert.equal(report.results.length,16);
  assert.equal(report.inputEquivalent,false);assert.equal(report.renderingEquivalent,false);
  assert.match(report.scope,/Tree\/screenshot are AFTER explicit release,not held paint/);
  const verificationBytes=readFileSync('artifacts/material-parity/text-control-held-focus-verify-20261025.log');
  const verification=JSON.parse(verificationBytes.toString(verificationBytes[0]===255?'utf16le':'utf8').replace(/^\ufeff/,''));
  assert.equal(verification.reportSha256,hash(bytes));assert.equal(verification.cases,16);
  assert.equal(verification.pairedBoundaries,48);assert.equal(verification.observedNotParityAccepted,true);
  const contexts=new Set();let canvasBlurs=0;
  for(const row of report.results){
    assert.ok(['input','form-field'].includes(row.family));assert.equal(row.state,'held');
    contexts.add(`${row.family}/${row.profile}/${row.viewport.deviceScaleFactor}`);
    for(const side of ['reference','astylar']){
      assert.deepEqual(row[side].runtime.errors,[]);
      for(const sample of row[side].observations.slice(1)){
        assert.equal(sample.active.tag,'INPUT');assert.equal(sample.active.logicalId,row.family+'-control');
        assert.equal(sample.activeEqualsTarget,true);assert.equal(sample.activeWithinHost,true);
        const down=sample.events.filter(e=>e.type==='pointerdown');assert.equal(down.length,1);
        assert.equal(down[0].trusted,true);assert.equal(down[0].buttons,1);
        assert.equal(sample.events.filter(e=>['pointerup','pointercancel'].includes(e.type)).length,0);
        assert.equal(sample.events.filter(e=>e.type==='blur'&&e.target.tag==='INPUT').length,0);
      }
      const blurs=row[side].observations.at(-1).events.filter(e=>e.type==='blur');
      assert.equal(blurs.length,side==='reference'?0:2);
      if(side==='astylar'){assert.ok(blurs.every(e=>e.target.tag==='CANVAS'));canvasBlurs+=blurs.length;}
    }
  }
  assert.equal(contexts.size,16);assert.equal(canvasBlurs,32);
});

test('one traced text-input hold exposes blur-synthesized public release before native release',()=>{
  const file='artifacts/material-parity/text-held-event-order-20261025/latest-report.json',bytes=readFileSync(file);
  assert.equal(hash(bytes),'7a1ec887eb360d636a43585e739155d41b011cb7e73589da902df7725a8e222c');
  const report=JSON.parse(bytes);assert.equal(report.results.length,1);
  const row=report.results[0];assert.equal(row.family,'input');assert.equal(row.profile,'light');
  assert.equal(row.viewport.deviceScaleFactor,1);assert.equal(row.state,'held');
  const mb=readFileSync(report.capture.checkpointManifest.file);
  assert.equal(hash(mb),report.capture.checkpointManifest.sha256);const manifest=JSON.parse(mb);
  const bundles=new Map();
  const frame=(stack,name,expected)=>{
    const matches=[...stack.matchAll(/at ([^\n]+?) \(http:\/\/127\.0\.0\.1:\d+\/([^/:]+\.js):(\d+):(\d+)\)/g)].filter(m=>m[1]===name);
    assert.equal(matches.length,1);const m=matches[0];
    if(!bundles.has(m[2])){
      const b=readFileSync('examples/material-showcase/dist/material-showcase/browser/'+m[2]);
      assert.equal(hash(b),manifest.provenance.browserFiles.find(r=>r.file===m[2]).sha256);
      bundles.set(m[2],b.toString().split('\n'));
    }
    const lines=bundles.get(m[2]),line=Number(m[3]);assert.ok(line>0&&line<=lines.length);
    assert.match(lines[line-1],expected);return {lines,line};
  };
  for(const sample of row.astylar.observations.slice(1)){
    assert.equal(sample.events.filter(e=>e.type==='pointerdown'&&e.trusted&&e.buttons===1).length,1);
    assert.equal(sample.events.filter(e=>['pointerup','pointercancel'].includes(e.type)).length,0);
    assert.deepEqual(sample.publicEvents.filter(e=>['pointerdown','pointerup','click'].includes(e.type)).map(e=>[e.type,e.targetId]),
      [['pointerdown','input-control'],['pointerup','input-control'],['click','input-control']]);
    assert.equal(sample.active.tag,'INPUT');assert.equal(sample.active.logicalId,'input-control');
    assert.equal(Object.hasOwn(sample.interaction,'pressedElementId'),false);
    const calls=sample.focusCalls;assert.deepEqual(calls.map(c=>c.tag),['CANVAS','CANVAS','INPUT','CANVAS','INPUT']);
    frame(calls[0].stack,'_InputManager._onPointerDown',/elementToAttachTo\.focus\(\)/);
    frame(calls[1].stack,'AstylarInteractionRuntime.handlePointer',/this\.canvas\?\.focus\(\)/);
    frame(calls[2].stack,'_AstylarSemanticBridge.syncFocus',/node\.focus\(/);
    frame(calls[3].stack,'_InputManager._onPointerUp',/elementToAttachTo\.focus\(\)/);
    const blur=frame(calls[3].stack,'HTMLCanvasElement._pointerBlurEvent',/this\._onInputChanged\(DeviceType\.Mouse/);
    assert.match(blur.lines.slice(blur.line-3,blur.line).join('\n'),/pointer\[inputIndex\] = 0/);
    frame(calls[4].stack,'_AstylarSemanticBridge.syncFocus',/node\.focus\(/);
    assert.throws(()=>frame(calls[3].stack.replace('HTMLCanvasElement._pointerBlurEvent','unknownCaller'),'HTMLCanvasElement._pointerBlurEvent',/./));
  }
  assert.equal(report.inputEquivalent,false);assert.equal(report.renderingEquivalent,false);
});

test('Text held obligation join conserves the accepted review and validates existing full receipt rules',async t=>{
  const base='artifacts/material-parity/working-audit',pointer=JSON.parse(readFileSync(base+'/current.json'));
  assert.equal(pointer.generation,'8848ae5b1ca0b18bc04116ebdd1eb2c360b7497a298e69fca9578df4a1b2b420');
  const bytes=readFileSync(`${base}/${pointer.generation}/index.json`);assert.equal(hash(bytes),pointer.indexSha256);
  const coverage=JSON.parse(bytes).metadata.coverage.inspectionEvidence;
  const parent={kind:'case-obligation-coverage-extension',status:'proposal-not-canonical',scope:coverage.scope,groups:coverage.cases};
  assert.equal(hash(JSON.stringify(parent)),textHeldPredecessor);
  const joined=joinTextHeldEvidence(parent);assert.equal(joined.cases,16);assert.equal(joined.addedChildren,33);
  assert.equal(hash(JSON.stringify(restoreTextHeldEvidence(joined.review))),textHeldPredecessor);
  let changed=0,causes=0;
  for(const [i,g]of joined.review.groups.entries()){
    const p=parent.groups[i];assert.equal(g.case,p.case);assert.equal(g.inspection,p.inspection);assert.equal(g.currentRendering,p.currentRendering);
    if(g===p)continue;changed++;
    for(const name of Object.keys(p.obligations))assert.deepEqual(g.obligations[name].remaining,p.obligations[name].remaining);
    causes+=Number(!!g.obligations.authoredActivation.supplementaryTextHeldReleaseCause);
  }
  assert.equal(changed,16);assert.equal(causes,1);
  const corrupt=(f,...args)=>f.endsWith('text-control-held-focus-20261025/latest-report.json')?Buffer.from('{}'):readFileSync(f,...args);
  assert.throws(()=>joinTextHeldEvidence(parent,corrupt));assert.throws(()=>joinTextHeldEvidence(joined.review));
  const staged=new Map([
    ['tests/material-parity/input-equivalence-audit.mjs',prepareTextHeldProducer(readFileSync('tests/material-parity/input-equivalence-audit.mjs'),readFileSync)],
    ...['launcher','runner'].map((kind,i)=>{const file=['scripts/export-material-input-audit-current-ancestry.mjs','scripts/run-material-input-audit.mjs'][i];return [file,prepareTextHeldSelection(readFileSync(file),kind)];}),
  ].map(([file,source])=>[path.resolve(file),Buffer.from(source)]));
  const stagedRead=(file,options)=>{
    const b=staged.get(path.resolve(file));if(!b)return readFileSync(file,options);
    const encoding=typeof options==='string'?options:options?.encoding;return encoding?b.toString(encoding):Buffer.from(b);
  };
  assert.throws(()=>createTextHeldReviewReader({root:process.cwd(),read:stagedRead,reviewSha256:'0'.repeat(64)}));
  const reader=createTextHeldReviewReader({root:process.cwd(),read:stagedRead,reviewSha256:textHeldReview});
  const file=`${base}/proposals/${joined.sha256}.json`;
  const {loadCaseObligationReview}=await import('../../scripts/audit-findings-store.mjs');
  const loaded=loadCaseObligationReview(file,joined.sha256,parent.groups.map(g=>g.case),{root:process.cwd(),read:reader.read});
  assert.equal(loaded.cases.length,2311);assert.equal(loaded.inspectionComplete,false);assert.equal(loaded.currentRenderingAccepted,false);
  assert.equal(reader.sourceApplicability.addedChildren,33);assert.equal(reader.sourceApplicability.reviewSha256,joined.sha256);
  t.diagnostic(JSON.stringify({reviewSha256:joined.sha256,modifiedCases:16,addedChildren:33,causeCases:1,
    dependencies:loaded.evidenceFingerprints.length,completePredecessorRecovered:true,physicalProposalWritten:false,canonicalPublished:false}));
});

test('Text held registration conserves all accepted sources and proofs without live writes',()=>{
  const file='tests/material-parity/input-equivalence-audit.mjs',before=readFileSync(file,'utf8').replaceAll('\r\n','\n');
  const staged=prepareTextHeldProducer(before,readFileSync);assert.equal(restoreTextHeldProducer(staged),before);
  const inventory=source=>{
    const tree=ts.createSourceFile(file,source,99,true,ts.ScriptKind.JS);assert.equal(tree.parseDiagnostics.length,0);
    const list=name=>{
      const f=tree.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name),arrays=[];
      const visit=n=>{if(ts.isArrayLiteralExpression(n))arrays.push(n);ts.forEachChild(n,visit);};visit(f);
      return arrays[0].elements.map(n=>n.getText(tree));
    };
    return {sources:list('sourceFingerprints'),proofs:list('focusedProofInventory'),plan:list('implementationPlan')};
  };
  const old=inventory(before),next=inventory(staged);
  assert.equal(old.sources.length,1055);assert.equal(old.proofs.length,378);assert.equal(old.plan.length,65);
  assert.equal(next.sources.length,1060);assert.equal(next.proofs.length,383);
  assert.deepEqual(next.sources.slice(textHeldSources.length),old.sources);
  assert.deepEqual(next.proofs.slice(textHeldProofTitles.length),old.proofs);assert.deepEqual(next.plan,old.plan);
  assert.equal(new Set(next.sources).size,1060);
  assert.throws(()=>restoreTextHeldProducer(staged+'\n// unexpected drift'));
  assert.throws(()=>prepareTextHeldProducer(before+'\n// unexpected drift',readFileSync));
  const missing=(f,...args)=>f.endsWith('audit-material-text-held-event-order.mjs')?Buffer.alloc(0):readFileSync(f,...args);
  assert.throws(()=>prepareTextHeldProducer(before,missing));
  assert.equal(readFileSync(file,'utf8').replaceAll('\r\n','\n'),before);
  const launcherFile='scripts/export-material-input-audit-current-ancestry.mjs',runnerFile='scripts/run-material-input-audit.mjs';
  const launcher=readFileSync(launcherFile,'utf8').replaceAll('\r\n','\n'),runner=readFileSync(runnerFile,'utf8').replaceAll('\r\n','\n');
  const selected=prepareTextHeldSelection(launcher,'launcher'),selectedRunner=prepareTextHeldSelection(runner,'runner');
  assert.equal(restoreTextHeldSelection(selected,'launcher'),launcher);assert.equal(restoreTextHeldSelection(selectedRunner,'runner'),runner);
  const rootLine="const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');";
  const run=(s,flags)=>spawnSync(process.execPath,['--input-type=module','-','--dry-run',...flags],{input:s.replace(rootLine,`const root = ${JSON.stringify(process.cwd())};`),encoding:'utf8',windowsHide:true});
  const fresh=run(selected,['--text-held']);assert.equal(fresh.status,0,fresh.stderr);
  assert.ok(JSON.parse(fresh.stdout).args.includes('--case-obligation-review-sha256='+textHeldReview));
  assert.deepEqual(JSON.parse(run(selected,[]).stdout),JSON.parse(run(launcher,[]).stdout));
  for(const flag of [...launcher.matchAll(/rawRequested\.includes\('(--[^']+)'\)/g)].map(m=>m[1])){
    const a=run(launcher,[flag]),b=run(selected,[flag]);assert.equal(a.status,0,a.stderr);assert.equal(b.status,0,b.stderr);
    assert.deepEqual(JSON.parse(a.stdout),JSON.parse(b.stdout));assert.notEqual(run(selected,['--text-held',flag]).status,0);
  }
  const runnerTree=ts.createSourceFile(runnerFile,selectedRunner,99,true,ts.ScriptKind.JS);assert.equal(runnerTree.parseDiagnostics.length,0);
  let selector;const visit=n=>{if(ts.isVariableDeclaration(n)&&n.name.getText(runnerTree)==='textHeldReaderFactory')selector=n.initializer.getText(runnerTree);ts.forEachChild(n,visit);};visit(runnerTree);assert.ok(selector);
  const choose=new Function('options','textHeldReview','createTextHeldReviewReader','editingReaderFactory','return '+selector),newReader=()=>{},oldReader=()=>{};
  assert.equal(choose({caseObligationReviewSha256:textHeldReview},textHeldReview,newReader,oldReader),newReader);
  assert.equal(choose({caseObligationReviewSha256:'0'.repeat(64)},textHeldReview,newReader,oldReader),oldReader);
  const stages=new Map([[file,staged],[launcherFile,selected],[runnerFile,selectedRunner]].map(([f,s])=>[path.resolve(f),Buffer.from(s)]));
  const read=(f,options)=>stages.get(path.resolve(f))??readFileSync(f,options),prior=createTextHeldPriorRead({root:process.cwd(),read});
  for(const [f,expected]of [[file,before],[launcherFile,launcher],[runnerFile,runner]]){
    assert.equal(prior(f,'utf8'),expected);const old=stages.get(path.resolve(f));stages.set(path.resolve(f),Buffer.concat([old,Buffer.from('\n// drift')]));
    assert.throws(()=>prior(f));stages.set(path.resolve(f),old);
  }
  for(const f of ['tests/material-parity/divider-original-crop-provenance.spec.mjs','docs/evidence/material-divider-light-desktop-requirement-review.json']){
    assert.equal(prior(f,'utf8'),execFileSync('git',['show','4b37d857:'+f],{encoding:'utf8'}));
    stages.set(path.resolve(f),Buffer.concat([readFileSync(f),Buffer.from('\n// drift')]));assert.throws(()=>prior(f));stages.delete(path.resolve(f));
  }
});

test('current overlay authoring has distinct menu, sheet and dialog focus requests', async t => {
  // Execute the actual authoring methods with a minimal surface boundary.
  // This diagnoses authored requests, not browser scheduling or core behavior.
  const bytes = readFileSync('examples/material-showcase/src/app/astylar.component.ts');
  const tree = ts.createSourceFile('current.ts', bytes.toString(), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const owner = tree.statements.find(n => ts.isClassDeclaration(n) && n.name?.text === 'AstylarShowcaseComponent');
  const names = ['handleClick', 'familyElements', 'dismissPopupForOutsideTarget'];
  const methods = names.map(name => {
    const matches = owner.members.filter(n => ts.isMethodDeclaration(n) && n.name.getText(tree) === name);
    assert.equal(matches.length, 1);
    return matches[0].getText(tree);
  });
  const emitted = ts.transpileModule(`class Probe { ${methods.join('\n')} }`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  }).outputText;
  const Probe = new Function(`${emitted}; return Probe;`)();
  const flatten = nodes => nodes.flatMap(n => [n, ...flatten(n.children ?? [])]);
  for (const family of ['menu', 'bottom-sheet', 'dialog']) {
    let state = { open: false, disabled: false };
    const requests = [], trace = [], probe = new Probe();
    Object.assign(probe, {
      store: { state: () => state, tokens: () => ({}), patchState: patch => {
        state = { ...state, ...patch }; trace.push('authored-state');
      } },
      family: () => family, status: { set() {} },
      surface: { whenSettled: () => { trace.push('settlement-request'); return Promise.resolve(); },
        focus: id => { requests.push(id); trace.push('focus-request'); return false; } },
    });
    probe.handleClick(`${family}-primary`, { targetId: `${family}-primary` });
    await Promise.resolve();
    assert.equal(state.open, true);
    const nodes = flatten(probe.familyElements(family));
    if (family === 'menu') {
      assert.deepEqual(requests, []);
      assert.deepEqual(nodes.filter(n => n.autofocus), []);
      assert.equal(nodes.find(n => n.id === 'menu-popup').role, 'menu');
    } else {
      assert.deepEqual(trace, ['authored-state', 'settlement-request', 'focus-request']);
      assert.deepEqual(requests, [`${family}-dismiss`]);
      if (family === 'dialog') {
        assert.equal(nodes.some(n => n.id === requests[0]), false);
        assert.equal(nodes.find(n => n.autofocus).id, 'dialog-cancel');
        assert.equal(nodes.find(n => n.id === 'dialog-overlay').modal, true);
      } else {
        assert.equal(nodes.find(n => n.autofocus).id, requests[0]);
        assert.equal(nodes.find(n => n.id === 'bottom-sheet-overlay').type, 'div');
      }
    }
  }
  t.diagnostic(`Current authoring source SHA-256 ${hash(bytes)}; mocked surface, no current-browser attribution`);
});

test('remaining overlay focus coverage preserves unknown identities and held capture timing', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(hash(bytes), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const report = JSON.parse(bytes);
  const capture = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'captureInteractionCase');
  const statements = capture.body.statements.find(ts.isTryStatement).tryBlock.statements;
  const position = fragment => {
    const matches = [...statements].map((n, i) => [n.getText(ast), i]).filter(([text]) => text.includes(fragment));
    assert.equal(matches.length, 1, fragment);
    return matches[0][1];
  };
  const release = position('for (const release of heldReleases)');
  assert.ok(position('const referenceMeasurement =') < release);
  assert.ok(position('const astylarMeasurement =') < release);
  assert.ok(position('captureInteractionImage(reference.page') < release);
  assert.ok(position('const referenceFocus =') > release);
  assert.ok(position('const astylarFocus =') > release);
  let accounted = 0;
  for (const [family, total] of [['menu', 82], ['bottom-sheet', 51], ['dialog', 66]]) {
    const rows = report.interactions.filter(r => r.family === family);
    assert.equal(rows.length, total);
    const remaining = rows.filter(r => !['open', 'activate', 'activate-leave',
      'open-dismiss', 'open-dismiss-outside', 'open-dismiss-canvas'].includes(r.state));
    const expected = { focus: 8, hover: 8, held: 8,
      ...(family !== 'bottom-sheet' ? { 'open-hover-content': 8 } : {}),
      ...(family === 'menu' ? { disabled: 8 } : {}) };
    assert.deepEqual(Object.fromEntries(Object.entries(Object.groupBy(remaining, r => r.state))
      .map(([state, cases]) => [state, cases.length])), expected);
    for (const row of remaining) {
      assert.equal(row.focus.matches, true);
      if (row.state === 'focus') {
        assert.equal(row.focus.reference, `${family}-primary`);
        assert.equal(row.focus.astylar, `${family}-primary`);
      } else {
        assert.equal(Object.hasOwn(row.focus, 'reference'), false);
        if (['hover', 'disabled'].includes(row.state))
          assert.equal(Object.hasOwn(row.focus, 'astylar'), false);
        else assert.equal(row.focus.astylar,
          row.state === 'open-hover-content' && family === 'dialog' ? 'dialog-cancel' : `${family}-primary`);
        assert.equal(gate(row.state, 'reference-owner', 'wrong-owner'), true);
      }
    }
    accounted += remaining.length;
  }
  assert.equal(accounted, 96);
  // Alongside the 73 opening and 30 dismissal records covered below, this
  // accounts for all 199 overlay interactions. Missing identity is unknown,
  // not proof of no focus; post-release focus is not held-state focus.
});

test('retained focus measurement loses parity IDs and generated action identity; open gate ignores mismatch', async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent('<button id="dialog-primary">Open</button><button data-parity-id="dialog-cancel">Cancel</button><div class="mat-bottom-sheet-container"><a class="mat-mdc-list-item" href="#">Share</a></div><button data-astylar-id="dialog-cancel">Cancel</button>');
    await page.locator('#dialog-primary').focus();
    assert.equal(await focusedIdentity(page, 'reference', 'dialog'), 'dialog-primary');
    await page.locator('[data-parity-id]').focus();
    assert.equal(await page.evaluate(() => document.activeElement.dataset.parityId), 'dialog-cancel');
    const reference = await focusedIdentity(page, 'reference', 'dialog');
    assert.equal(reference, undefined);
    await page.locator('[data-astylar-id]').focus();
    const candidate = await focusedIdentity(page, 'astylar', 'dialog');
    assert.equal(candidate, 'dialog-cancel');
    assert.equal(gate('focus', reference, candidate), false);
    for (const state of ['open', 'activate', 'activate-leave']) assert.equal(gate(state, reference, candidate), true);
    await page.locator('a').focus();
    assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Share');
    assert.equal(await focusedIdentity(page, 'reference', 'bottom-sheet'), undefined);
    // Even the enforced focus state accepts two unidentifiable/missing owners.
    assert.equal(gate('focus', undefined, undefined), true);
  } finally { await browser.close(); }
});

test('original overlay records expose missing identities without proving focus equivalence', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(hash(bytes), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const report = JSON.parse(bytes);
  assert.equal(report.captureProvenance.harnessFiles.find(f => f.file === 'tests/material-parity/run-material-parity.mjs').sha256,
    'b2477a124293aec6bba3a2413ff58d41f409288dcf0cb53a54ed17d162b9fa97');
  for (const [family, count, candidate] of [['bottom-sheet', 25, 'bottom-sheet-primary'], ['menu', 24, 'menu-primary'], ['dialog', 24, 'dialog-cancel']]) {
    const rows = report.interactions.filter(r => r.family === family && ['open', 'activate', 'activate-leave'].includes(r.state));
    assert.equal(rows.length, count);
    for (const row of rows) {
      assert.equal(Object.hasOwn(row.focus, 'reference'), false);
      assert.equal(row.focus.astylar, candidate);
      assert.equal(row.focus.matches, true);
      assert.equal(gate(row.state, row.focus.reference, row.focus.astylar), true);
    }
  }
});

test('retained focus selectors distinguish sheet/menu mismatches from matching dialog focus', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(hash(bytes), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const report = JSON.parse(bytes);
  assert.equal(report.captureProvenance.harnessFiles.find(f => f.file === 'tests/material-parity/input-tree-evidence.mjs').sha256,
    '06197edaf92b2296e3e0564771f307a1036ce7bc5eb13d8e242a5c420e7a7e3b');
  assert.equal(hash(readFileSync('tests/material-parity/input-tree-evidence.mjs')),
    '06197edaf92b2296e3e0564771f307a1036ce7bc5eb13d8e242a5c420e7a7e3b',
    'matched-rule interpretation requires the capture-pinned reader');
  for (const [family, selector, label, count] of [
    ['bottom-sheet', '.mdc-list-item:focus', 'Share', 25],
    ['menu', '.mat-mdc-menu-item:focus', 'Rename', 32],
  ]) {
    const rows = report.interactions.filter(r => r.family === family && ['open', 'activate', 'activate-leave', 'open-hover-content'].includes(r.state));
    assert.equal(rows.length, count);
    for (const row of rows) {
      const descriptor = row.inputTrees.reference, treeBytes = readFileSync(descriptor.file);
      assert.equal(hash(treeBytes), descriptor.sha256);
      const tree = JSON.parse(treeBytes);
      // Exact non-pseudo, single-selector rules: a list containing :focus or
      // a class named "focused" would not prove this element matched :focus.
      const owners = tree.nodes.filter(n => n.rules.some(i =>
        tree.rules[i].selector === selector && tree.rules[i].active === true));
      assert.equal(owners.length, 1);
      const text = n => (n.ownText ?? '') + tree.nodes.filter(c => c.parent === n.key).map(text).join('');
      assert.equal(text(owners[0]).trim(), label);
      assert.equal(row.focus.astylar, `${family}-primary`);
      assert.equal(Object.hasOwn(row.focus, 'reference'), false);
      assert.equal(row.focus.matches, true);
    }
  }
  // Every branch in this exact captured list requires the indicator's direct
  // parent to be focused. Unlike the ripple's cdk-program-focused class list,
  // there is no branch that can match merely because a class remains present.
  const selector = ['mat-mdc-button', 'mat-mdc-unelevated-button', 'mat-mdc-raised-button',
    'mat-mdc-outlined-button', 'mat-tonal-button']
    .map(c => `.${c}:focus > .mat-focus-indicator::before`).join(', ');
  const dialogs = report.interactions.filter(r => r.family === 'dialog' && ['open', 'activate', 'activate-leave', 'open-hover-content'].includes(r.state));
  assert.equal(dialogs.length, 32);
  for (const row of dialogs) {
    const descriptor = row.inputTrees.reference, bytes = readFileSync(descriptor.file);
    assert.equal(hash(bytes), descriptor.sha256);
    const tree = JSON.parse(bytes);
    const indicators = tree.nodes.filter(n => n.pseudoElements?.some(p => p.pseudo === '::before' &&
      p.rules.some(i => tree.rules[i].selector === selector && tree.rules[i].active === true)));
    assert.equal(indicators.length, 1);
    const parent = tree.nodes.find(n => n.key === indicators[0].parent);
    assert.equal(parent.type, 'button');
    assert.equal(parent.attributes['data-parity-id'], 'dialog-cancel');
    assert.equal(row.focus.astylar, 'dialog-cancel');
    assert.equal(Object.hasOwn(row.focus, 'reference'), false);
  }
  // This recovers reference focus at tree-capture time, not an event timeline
  // or a diagnosis of the current candidate runtime.
});

test('retained dismissal focus has four matching identities and twenty-six unmeasured candidate identities', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(hash(bytes), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const report = JSON.parse(bytes);
  let matched = 0, unknown = 0;
  for (const [family, state, count, candidateKnown] of [
    ['menu', 'open-dismiss', 2, true],
    ['bottom-sheet', 'open-dismiss', 2, true],
    ['dialog', 'open-dismiss', 2, false],
    ['menu', 'open-dismiss-outside', 8, false],
    ['menu', 'open-dismiss-canvas', 8, false],
    ['dialog', 'open-dismiss-outside', 8, false],
  ]) {
    const rows = report.interactions.filter(r => r.family === family && r.state === state);
    assert.equal(rows.length, count);
    for (const row of rows) {
      assert.equal(row.focus.reference, `${family}-primary`);
      assert.equal(row.focus.matches, true);
      assert.equal(Object.hasOwn(row.focus, 'astylar'), candidateKnown);
      if (candidateKnown) { assert.equal(row.focus.astylar, row.focus.reference); matched++; }
      else unknown++;
      // The retained gate skips these states, even for a demonstrably wrong
      // identity. An omitted identity cannot distinguish body focus from an
      // unidentified element; preserve uncertainty rather than call it parity.
      assert.equal(gate(state, row.focus.reference, 'wrong-owner'), true);
    }
  }
  assert.equal(matched, 4); assert.equal(unknown, 26);
});
