import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';
import ts from 'typescript';
import { restoreRetainedFocusExportSource, restoreRetainedFocusProducer } from './static-semantic-registration.mjs';
import { restoreSliderHoverHeldExportSource } from './slider-hover-held-case-review-source.mjs';
import { loadCaseObligationReview } from '../../scripts/audit-findings-store.mjs';
import { joinRetainedPointerFocus, pointerFocusCapture, pointerFocusPredecessor,
  joinRetainedFocusObservationBatch, disabledFocusPredecessor,
  retainedFocusObservationReview, createRetainedFocusReviewReader } from '../../scripts/join-material-retained-pointer-focus.mjs';

test('retained pointer focus reuses exact measured boundaries without substituting focus actions', () => {
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  const predecessor = JSON.parse(readFileSync(`artifacts/material-parity/working-audit/proposals/${pointerFocusPredecessor}.json`)).review;
  const capture = readFileSync(pointerFocusCapture.file), report = JSON.parse(capture);
  const joined = joinRetainedPointerFocus(predecessor, capture);
  const groups = joined.groups.filter(g => g.obligations.programmaticFocus.retainedPointerFocusBoundaries);
  assert.equal(groups.length, 113);
  assert.ok(joined.groups.every(g => g.inspection === 'partial' && g.currentRendering === 'unverified'));
  assert.ok(predecessor.groups.every(g => !g.obligations.programmaticFocus.retainedPointerFocusBoundaries));
  let boundaries = 0, trees = 0;
  for (const group of groups) {
    const source = group.obligations.authoredActivation.configuredRawPointerObservation;
    const child = group.obligations.programmaticFocus.retainedPointerFocusBoundaries;
    assert.equal(child.completeSourceObservationSha256, hash(JSON.stringify(source)));
    assert.equal(child.currentRenderingAccepted, false);
    const row = report.results.find(row => row.caseId === child.caseId);
    assert.ok(row);
    for (const side of ['reference','astylar']) {
      assert.deepEqual(child.observations[side].map(value => value.active), row[side].observations.map(value => value.active));
      const receipt = row[side].inputTree;
      assert.equal(hash(readFileSync(receipt.file)), receipt.sha256);
      trees++; boundaries += child.observations[side].length;
    }
  }
  assert.equal(trees, 226); assert.equal(boundaries, 678);
  const altered = structuredClone(predecessor);
  altered.groups[0].currentRendering = 'accepted';
  assert.throws(() => joinRetainedPointerFocus(altered, capture));
  assert.throws(() => joinRetainedPointerFocus(predecessor, Buffer.concat([capture,Buffer.from(' ')])));
});

test('retained focus successor reader conserves both prior reviews and authenticates all dependencies', () => {
  const root=process.cwd(),file=`artifacts/material-parity/working-audit/proposals/${retainedFocusObservationReview}.json`;
  const pointer=readFileSync('artifacts/material-parity/working-audit/current.json');
  const envelope=JSON.parse(readFileSync(file));
  const reader=createRetainedFocusReviewReader({root,read:readFileSync,reviewSha256:retainedFocusObservationReview});
  assert.equal(reader.sourceApplicability.completePredecessorsRecovered,true);
  assert.deepEqual([reader.sourceApplicability.pointerFocusChildren,reader.sourceApplicability.disabledFocusChildren,
    reader.sourceApplicability.axFocusChildren],[113,16,9]);
  const loaded=loadCaseObligationReview(file,retainedFocusObservationReview,envelope.review.groups.map(g=>g.case),{root,read:reader.read});
  assert.equal(loaded.cases.length,2311);assert.equal(loaded.evidenceFingerprints.length,17481);
  assert.equal(loaded.inspectionComplete,false);assert.equal(loaded.currentRenderingAccepted,false);
  assert.ok(loaded.cases.every(g=>g.inspection==='partial'&&g.currentRendering==='unverified'));
  assert.throws(()=>createRetainedFocusReviewReader({root,read:readFileSync,reviewSha256:'0'.repeat(64)}));
  assert.deepEqual(readFileSync('artifacts/material-parity/working-audit/current.json'),pointer);
});

test('disabled and AX focus reuse bind exact retained observations without widening action scope', () => {
  const predecessor = JSON.parse(readFileSync(`artifacts/material-parity/working-audit/proposals/${disabledFocusPredecessor}.json`)).review;
  const joined = joinRetainedFocusObservationBatch(predecessor, readFileSync);
  const groups = joined.groups.filter(g => g.obligations.programmaticFocus.retainedDisabledFocusOwners);
  assert.equal(groups.length, 16);
  assert.equal(groups.reduce((count,g) => count + g.obligations.programmaticFocus.retainedDisabledFocusOwners.sources.length,0),39);
  assert.ok(joined.groups.every(g => g.inspection === 'partial' && g.currentRendering === 'unverified'));
  for (const group of groups) {
    const child = group.obligations.programmaticFocus.retainedDisabledFocusOwners;
    assert.equal(child.currentRenderingAccepted,false);
    assert.match(child.boundary,/supplementary/);
    assert.equal(group.obligations.programmaticFocus.disposition,'partial');
  }
  const menu = joined.groups.filter(g => g.obligations.authoredActivation.supplementaryMenuActions);
  assert.equal(menu.length,8);
  assert.ok(menu.every(g => g.obligations.programmaticFocus.disposition === 'evidence-join-pending'));
  const ax = joined.groups.filter(g=>g.obligations.programmaticFocus.retainedAxEndpointFocus);
  assert.equal(ax.length,9);
  for(const group of ax){
    const child=group.obligations.programmaticFocus.retainedAxEndpointFocus;
    assert.equal(child.observations.length,2);assert.equal(child.currentRenderingAccepted,false);
    assert.equal(group.obligations.programmaticFocus.disposition,'partial');
    assert.match(child.boundary,/not a new core diagnosis/);
  }
  assert.throws(() => joinRetainedFocusObservationBatch(predecessor,
    file => Buffer.concat([readFileSync(file),Buffer.from(' ')])));
  assert.ok(predecessor.groups.every(g => !g.obligations.programmaticFocus.retainedDisabledFocusOwners));
});

test('retained focus selection preserves prior sources invocations and actual reader routing', () => {
  const launcher='scripts/export-material-input-audit-current-ancestry.mjs';
  const launch=flags=>spawnSync(process.execPath,[launcher,'--dry-run',...flags],{encoding:'utf8',windowsHide:true});
  const selected=launch(['--retained-focus']);assert.equal(selected.status,0,selected.stderr);
  const invocation=JSON.parse(selected.stdout);
  assert.ok(invocation.args.includes(`--case-obligation-review-sha256=${retainedFocusObservationReview}`));
  assert.ok(invocation.args.includes(`--case-obligation-review=artifacts/material-parity/working-audit/proposals/${retainedFocusObservationReview}.json`));
  for(const flag of ['--static-ax','--card-inputs','--expansion-semantics','--stepper-inputs','--tabs-menu-sheet',
    '--static-semantic-inputs','--popup-depth-inputs','--scrollbar-paint','--table-label-paint','--radio-caret-paint']){
    const older=launch([flag]);assert.equal(older.status,0,older.stderr);
    assert.ok(!older.stdout.includes(retainedFocusObservationReview));
    const combined=launch([flag,'--retained-focus']);assert.notEqual(combined.status,0);
    assert.match(combined.stderr,/Choose one case-review supplement/);
  }
  const ordinary=launch([]);assert.equal(ordinary.status,0);assert.ok(!ordinary.stdout.includes(retainedFocusObservationReview));
  const runnerFile='scripts/run-material-input-audit.mjs',source=readFileSync(runnerFile,'utf8');
  const ast=ts.createSourceFile(runnerFile,source,99,true),declarations=[];
  const visit=node=>{if(ts.isVariableDeclaration(node)&&node.name.getText(ast)==='finalReaderFactory')declarations.push(node);ts.forEachChild(node,visit);};
  visit(ast);assert.equal(declarations.length,1);
  const choose=new Function('options','retainedFocusObservationReview','createRetainedFocusReviewReader','selectedReaderFactory',
    `return ${declarations[0].initializer.getText(ast)};`),older=()=>{};
  assert.equal(choose({caseObligationReviewSha256:retainedFocusObservationReview},retainedFocusObservationReview,createRetainedFocusReviewReader,older),createRetainedFocusReviewReader);
  assert.equal(choose({caseObligationReviewSha256:'0'.repeat(64)},retainedFocusObservationReview,createRetainedFocusReviewReader,older),older);
  for(const[file,kind]of[[runnerFile,'runner'],[launcher,'launcher']]){
    const text=readFileSync(file,'utf8');
    const prior=execFileSync('git',['show',`6f40e1e0:${file}`],{encoding:'utf8'}).replaceAll('\r\n','\n');
    assert.equal(restoreRetainedFocusExportSource(restoreSliderHoverHeldExportSource(text,kind),kind),prior);
    assert.throws(()=>restoreRetainedFocusExportSource(text+'\n// drift\n',kind));
  }
});

test('retained focus producer registration preserves complete accepted sources and proofs', () => {
  const file='tests/material-parity/input-equivalence-audit.mjs',source=readFileSync(file,'utf8');
  const prior=restoreRetainedFocusProducer(source);
  assert.equal(prior,execFileSync('git',['show',`6f40e1e0:${file}`],{encoding:'utf8',maxBuffer:8000000}).replaceAll('\r\n','\n'));
  assert.throws(()=>restoreRetainedFocusProducer(source+'\n// drift\n'));
  const collect=text=>{
    const ast=ts.createSourceFile(file,text,99,true);
    const owner=name=>ast.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name);
    const code=['proof','sourceFingerprints','focusedProofInventory'].map(name=>owner(name).getText(ast)).join('\n');
    return new Function('readFileSync','path','createHash',code+';return {sources:sourceFingerprints(process.cwd()),proofs:focusedProofInventory(process.cwd())};')(readFileSync,path,createHash);
  };
  const current=collect(source),previous=collect(prior);
  assert.equal(current.sources.length,955);assert.equal(new Set(current.sources.map(row=>row.file)).size,955);
  assert.equal(current.proofs.length,278);
  assert.deepEqual(current.sources.slice(2),previous.sources);
  assert.deepEqual(current.proofs.slice(5),previous.proofs);
  assert.ok(current.proofs.slice(0,5).every(row=>row.line>0));
});
