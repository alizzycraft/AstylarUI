import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import test from 'node:test';
import ts from 'typescript';
import {execFileSync} from 'node:child_process';
import { materialInteractionCases } from './benchmark.config.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');

test('supplementary Timepicker staged reader recovers exact historical tests and validates all dependencies',async t=>{
  const {createTimepickerProgrammaticFocusPriorRead:priorRead,createTimepickerProgrammaticFocusReviewReader:createReader}=await import('../../scripts/join-material-timepicker-programmatic-focus.mjs');
  const root=process.cwd(),prior=priorRead({root,read:readFileSync});
  for(const [file,sha]of [
    ['tests/material-parity/focus-action-scope.spec.mjs','20b1abea5c4ec7b2bab6f2fad7fb3af6080fb2c1c05ff1106a2695ff716d7676'],
    ['tests/material-parity/sort-arrow-geometry.spec.mjs','8accd5980a5984603ed7256990ada1322d10b5040b34ff77829cc4715c5b34cb']]){
    assert.equal(hash(prior(file)),sha);assert.equal(hash(prior(file,'utf8')),sha);
    const raw=readFileSync(file);assert.throws(()=>priorRead({root,read:()=>Buffer.concat([raw,Buffer.from('\n// drift')])})(file));
    const restored=prior(file);assert.equal(hash(priorRead({root,read:()=>restored})(file)),sha);
  }
  const reader=await createReader({root,read:readFileSync});
  const {loadCaseObligationReview}=await import('../../scripts/audit-findings-store.mjs');
  const relative=reader.file.slice(root.length+1).replaceAll('\\','/');
  const loaded=loadCaseObligationReview(relative,reader.sha256,reader.review.groups.map(g=>g.case),{root,read:reader.read});
  assert.equal(loaded.cases.length,2311);assert.equal(loaded.inspectionComplete,false);assert.equal(loaded.currentRenderingAccepted,false);
  t.diagnostic(JSON.stringify({review:reader.sha256,authenticatedDependencies:loaded.evidenceFingerprints.length,restoredTestSources:2,cases:2311,stagedOnly:true,canonicalUnchanged:true}));
});

test('supplementary Timepicker focus join preserves the complete accepted predecessor and rejects forged evidence',async t=>{
  const generation='7a22e84a0034a5c887cc7a0d8c68ac68b269dfd7a9d414d9f57a71c2d86e42f1';
  const bytes=readFileSync(`artifacts/material-parity/working-audit/${generation}/index.json`);
  assert.equal(hash(bytes),'0d9f52fae32e7783dc7dbb6bc08587fe6a0b01b1e3bf0ff94b9c4b6b08837850');
  const coverage=JSON.parse(bytes).metadata.coverage.inspectionEvidence;
  const parent={kind:'case-obligation-coverage-extension',status:'proposal-not-canonical',scope:coverage.scope,groups:coverage.cases};
  const {joinTimepickerProgrammaticFocus:join,restoreTimepickerProgrammaticFocus:restore,timepickerProgrammaticFocusPredecessor}=await import('../../scripts/join-material-timepicker-programmatic-focus.mjs');
  assert.equal(hash(JSON.stringify(parent)),timepickerProgrammaticFocusPredecessor);
  const joined=join(parent);assert.equal(joined.cases,8);assert.equal(joined.addedChildren,8);
  assert.equal(hash(JSON.stringify(restore(joined.review))),timepickerProgrammaticFocusPredecessor);
  let changed=0;for(let i=0;i<parent.groups.length;i++){
    const a=parent.groups[i],b=joined.review.groups[i];changed+=Number(a!==b);
    assert.equal(a.inspection,b.inspection);assert.equal(a.currentRendering,b.currentRendering);
    assert.deepEqual(a.obligations.authoredActivation,b.obligations.authoredActivation);
    for(const name of Object.keys(a.obligations)){
      assert.equal(a.obligations[name].disposition,b.obligations[name].disposition);
      assert.deepEqual(a.obligations[name].remaining,b.obligations[name].remaining);
    }
  }
  assert.equal(changed,8);assert.throws(()=>join(joined.review));
  for(const ending of ['latest-report.json','timepicker-light-desktop-dpr1-astylar.json'])
    assert.throws(()=>join(parent,(file,...args)=>String(file).endsWith(ending)?Buffer.from('forged'):readFileSync(file,...args)));
  t.diagnostic(JSON.stringify({predecessor:timepickerProgrammaticFocusPredecessor,review:joined.sha256,cases:8,addedChildren:8,completePredecessorRecovered:true,canonicalUnchanged:true,currentRenderingAccepted:false}));
});

test('supplementary Timepicker DOM focus opens only the candidate popup across eight retained contexts', () => {
  const directory='artifacts/material-parity/timepicker-programmatic-focus-20261025';
  const bytes=readFileSync(directory+'/latest-report.json');
  assert.equal(hash(bytes),'4d4a445de38fa7f562a05f3ed35cd014deee8afd39d260d9fc738c99b38a123f');
  const report=JSON.parse(bytes),script='scripts/audit-material-timepicker-programmatic-focus.mjs';
  const verified=JSON.parse(execFileSync(process.execPath,[script,'--verify',directory],{encoding:'utf8'}));
  assert.equal(verified.cases,8);assert.equal(verified.observedNotParityAccepted,true);
  const recipe=JSON.parse(execFileSync(process.execPath,[script,'--dry-run'],{encoding:'utf8'}));
  assert.equal(recipe.action,report.actionSource.executedAction.source);
  assert.equal(recipe.actionSha256,report.actionSource.executedAction.sha256);
  assert.equal(recipe.notConfiguredAction,true);assert.equal(recipe.noDatepicker,true);
  assert.deepEqual(report.results.map(r=>`${r.profile}/${r.viewport.id}`),
    ['light','dark','contrast','custom'].flatMap(p=>['desktop-dpr1','desktop-dpr2'].map(v=>`${p}/${v}`)));
  for(const row of report.results)for(const side of ['reference','astylar']){
    assert.equal(row.family,'timepicker');const observations=row[side].observations;
    assert.deepEqual(observations.map(o=>o.action),Array(3).fill('supplementary-dom-programmatic-focus'));
    assert.deepEqual(observations.map(o=>o.activeEqualsTarget),[false,true,true]);
    assert.deepEqual(observations.map(o=>o.popupCount),side==='reference'?[0,0,0]:[0,1,1]);
    assert.equal(observations.at(-1).active.logicalId,'timepicker-control');
  }
  // Preserves observed failure,not a passing parity requirement or a substitute
  // for configured pointer actions,Tab,public scene focus or Datepicker behavior.
});
test('configured focus action scope is 248 programmatic requests and eight pointer clicks, never Tab', async () => {
  const file = 'artifacts/material-parity/configured-input-focus-boundaries-20261024/latest-report.json';
  const bytes = readFileSync(file); assert.equal(hash(bytes), '8e176417defd6d8bbd2f9276adc8d37828867fce006cf80b4a74e4034aa9d118');
  const capture = JSON.parse(bytes), saved = Buffer.from(capture.sourceRecipe.actionRunnerSnapshot.base64, 'base64');
  assert.equal(hash(saved), capture.actionSource.sha256);
  const method = bytes => {
    const ast = ts.createSourceFile('runner.mjs', bytes.toString(), 99, true, ts.ScriptKind.JS);
    const nodes = ast.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === 'performInteraction');
    assert.equal(nodes.length, 1); return nodes[0].getText(ast);
  };
  const source = method(saved);
  assert.equal(method(readFileSync('tests/material-parity/run-material-parity.mjs')), source);
  assert.equal(hash(readFileSync('tests/material-parity/benchmark.config.mjs')), 'a55e95abe098be26d6a99e3faab22a951ae140143fece8701726a23624b98535');
  const perform = new Function('assert', 'interactionTargetBox', source + ';return performInteraction;')
    (assert, async () => ({ x: 0, y: 0, width: 10, height: 10 }));
  const cases = materialInteractionCases.filter(c => c.state === 'focus'); assert.equal(cases.length, 256);
  let focusRequests = 0, pointerClicks = 0;
  for (const row of cases) for (const side of ['reference', 'astylar']) {
    const calls = [];
    const page = {
      mouse: { click: async () => calls.push('pointer-click') },
      // Observe the driver's request; do not fake activeElement or execute DOM in a stub.
      evaluate: async (callback, id) => { assert.equal(id, `${row.family}-primary`);
        assert.match(callback.toString(), /target\.focus\(\)/); calls.push('programmatic-request'); },
      keyboard: { press: async () => assert.fail('Configured focus unexpectedly uses keyboard navigation') },
    };
    await perform(page, side, row);
    assert.deepEqual(calls, [row.family === 'timepicker' ? 'pointer-click' : 'programmatic-request']);
    if (row.family === 'timepicker') pointerClicks++; else focusRequests++;
  }
  assert.equal(focusRequests, 496); assert.equal(pointerClicks, 16);
  // Paired call counts represent 248/8 configured cases, not measured browser success.
  // The saved maintained runner is not the missing original e01 capture procedure.
});

test('configured focus labels preserve forty already-inspected noninteractive exclusions', () => {
  const file = 'artifacts/material-parity/working-audit/proposals/c394338eb185b3f410e7e18825cd370391b8daeb827f9b60f4d7355b46862823.json';
  const bytes = readFileSync(file);
  assert.equal(hash(bytes), 'ed7ecfea82fef0406fc9e0430a2df16a7db4555d2fdd074568c96cb5f3b39868');
  const envelope = JSON.parse(bytes);
  assert.equal(envelope.sha256, 'c394338eb185b3f410e7e18825cd370391b8daeb827f9b60f4d7355b46862823');
  const excluded = new Map(); let applicableProgrammatic = 0, applicablePointer = 0;
  const byCase = new Map(envelope.review.groups.map(g => [g.case, g]));
  for (const row of materialInteractionCases.filter(c => c.state === 'focus')) {
    const key = `interaction:${row.family}@${row.profile}/${row.viewport.id}/focus`;
    const group = byCase.get(key); assert.ok(group, key);
    const focus = group.obligations.programmaticFocus;
    if (focus.applicability === 'not-applicable') {
      assert.equal(focus.disposition, 'inspected-authored-exclusion');
      excluded.set(row.family, (excluded.get(row.family) ?? 0) + 1);
    } else {
      assert.equal(focus.applicability, 'applicable');
      if (row.family === 'timepicker') applicablePointer++; else applicableProgrammatic++;
    }
  }
  assert.deepEqual([...excluded].sort(), [['badge', 8], ['grid-list', 8], ['list', 8], ['sidenav', 8], ['table', 8]]);
  assert.equal(applicableProgrammatic, 208); assert.equal(applicablePointer, 8);
  // Reuse the authenticated review's exclusions, not fresh browser success or revised applicability.
});
