// Specific conservation of the frozen5ed→2035 transition,not a new audit collector.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import { createGunzip } from 'node:zlib';
import Parser from 'jsonparse';
import ts from 'typescript';
import { createPopupDepthReviewReader, popupDepthInputsReview } from '../tests/material-parity/popup-depth-case-review-source.mjs';
import { collectOwnerInitialMotion } from './audit-material-owner-initial-motion.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const digest = value => hash(JSON.stringify(value));
const same = (a,b,label) => assert.equal(digest(a),digest(b),label);
const oldModule = 'a0480845099038416ce2f420dca03e3cd99712ea083c18075c8bebabbc00f747';
const newModule = '6479b848b42c90c7435c4792dd83e630acb6f7e7b9254aeac8aeec2d2e7cc34b';
const comparison = JSON.parse(fs.readFileSync('artifacts/material-parity/popup-depth-full-section-comparison-20261023.log'));
const leaves = JSON.parse(fs.readFileSync('artifacts/material-parity/popup-depth-fixed-shape-leaves-20261023.log'));
const beforeManifest = comparison.previous.manifest, afterManifest = comparison.current.manifest;
assert.equal(beforeManifest.compressedSha256,'5ed659b3cee9b0947213e8eae570247066fe6fe880c5704eeafbb91ba5289fac');
assert.equal(afterManifest.compressedSha256,'2035d3791c7973ff4b117349684113ca5add0fccb14a2a5ec69fdb03ce6423ef');
assert.equal(leaves.previous,beforeManifest.compressedSha256); assert.equal(leaves.current,afterManifest.compressedSha256);
assert.equal(comparison.previous.sections.length,80); assert.equal(comparison.current.sections.length,80);
assert.deepEqual(comparison.added,[]); assert.deepEqual(comparison.removed,[]);
const sections = new Set(['sourceFingerprints','coverage','summary','sourceFindings','focusedProofs','implementationPlan']);
const controlIndices = new Set(leaves.changes.filter(c=>c.path[0]==='controlTypography').map(c=>c.path[2]));
assert.equal(controlIndices.size,48);

// Same streaming/pruning boundary as the existing readAudit helper,retaining
// only the six demonstrated structural sections and48 required proof owners.
async function selected(file,manifest) {
  const bytes=fs.readFileSync(file); assert.equal(bytes.length,manifest.compressedBytes);
  assert.equal(hash(bytes),manifest.compressedSha256);
  const parser=new Parser(), result={controls:{}}, fullHash=createHash('sha256'); let length=0;
  parser.onValue=function(value) {
    const keys=[...this.stack.slice(1).map(frame=>frame.key),this.key];
    if (!this.stack.length) return;
    const keepSection=sections.has(keys[0]);
    const keepControl=keys[0]==='controlTypography'&&keys[1]==='differences'&&controlIndices.has(keys[2]);
    if (keepSection && keys.length===1) result[keys[0]]=value;
    else if (keepControl && keys.length===3) result.controls[keys[2]]=value;
    else if (keepSection||keepControl) return;
    if(this.value) delete this.value[this.key];
  };
  for await(const chunk of Readable.from([bytes]).pipe(createGunzip())) {
    length+=chunk.length; fullHash.update(chunk); parser.write(chunk);
  }
  assert.equal(length,manifest.uncompressedBytes); assert.equal(fullHash.digest('hex'),manifest.uncompressedSha256);
  assert.equal(parser.stack.length,0);
  for(const name of sections) assert.ok(Object.hasOwn(result,name),name);
  assert.equal(Object.keys(result.controls).length,48); return result;
}
console.log('Reading authenticated predecessor structural sections');
const before=await selected(`artifacts/material-parity/working-audit/${beforeManifest.compressedSha256}/${beforeManifest.payload}`,beforeManifest);
console.log('Reading authenticated candidate structural sections');
const after=await selected(`docs/${afterManifest.payload}`,afterManifest);
const producerFile='tests/material-parity/input-equivalence-audit.mjs',producerText=fs.readFileSync(producerFile,'utf8');
assert.equal(hash(producerText.replaceAll('\r\n','\n')),newModule);
const ast=ts.createSourceFile(producerFile,producerText,99,true);
const code=['proof','sourceFingerprints','scanMaterialSources','focusedProofInventory','implementationPlan']
  .map(name=>ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name).getText(ast)).join('\n');
const definitions=(await import('../tests/material-parity/input-equivalence-policy.mjs')).sourceAuditDefinitions;
const production=new Function('readFileSync','path','createHash','sourceAuditDefinitions',code+
  ';return {sourceFingerprints:sourceFingerprints(process.cwd()),sourceFindings:scanMaterialSources(process.cwd()),focusedProofs:focusedProofInventory(process.cwd()),implementationPlan:implementationPlan()};')
  (fs.readFileSync,path,createHash,definitions);
for(const name of ['sourceFingerprints','sourceFindings','focusedProofs','implementationPlan']) same(after[name],production[name],`Current production ${name}`);
same(after.sourceFindings.slice(0,191),before.sourceFindings,'All191 prior findings');
assert.equal(after.sourceFindings.length,192);
assert.equal(after.sourceFindings[191].id,'core-root-paint-depth-crosses-viewport-camera');
same(after.sourceFingerprints.slice(6).map(r=>r.file),before.sourceFingerprints.map(r=>r.file),'Prior928 source order');
assert.equal(after.sourceFingerprints.length,934);
const changedSources=[];
for(const old of before.sourceFingerprints) {
  const current=after.sourceFingerprints.find(r=>r.file===old.file); assert.ok(current);
  if(old.sha256===current.sha256) continue;
  for(const [revision,expected] of [['3e753aa4',old.sha256],['a0ffa23e',current.sha256]])
    assert.equal(hash(execFileSync('git',['show',`${revision}:${old.file}`],{encoding:'utf8',maxBuffer:8e6}).replaceAll('\r\n','\n')),expected,old.file);
  changedSources.push(old.file);
}
for(const row of after.sourceFingerprints.slice(0,6))
  assert.equal(hash(execFileSync('git',['show',`a0ffa23e:${row.file}`],{encoding:'utf8',maxBuffer:8e6}).replaceAll('\r\n','\n')),row.sha256,row.file);
assert.equal(before.focusedProofs.length,248); assert.equal(after.focusedProofs.length,261);
same(after.focusedProofs.slice(13).map((r,i)=>({...r,line:before.focusedProofs[i].line})),before.focusedProofs,'All248 prior non-line proof fields');
same(after.implementationPlan.filter(r=>r.rootCause!=='Unbounded root paint depth crosses the viewport-dependent camera'),before.implementationPlan,'Prior implementation plan');
same(after.summary,{...before.summary,sourceFindings:192},'Only summary finding count');

const {inspectionEvidence:oldEvidence,...oldCoverage}=before.coverage;
const {inspectionEvidence:newEvidence,...newCoverage}=after.coverage;
same(oldCoverage,newCoverage,'All base coverage fields');
assert.equal(oldEvidence.reviewSha256,'821919099916339a177403d8c6cc66ede9aeaa20501a23ace9c568df75160f11');
assert.equal(newEvidence.reviewSha256,popupDepthInputsReview);
const caseReview=evidence=>({kind:'case-obligation-coverage-extension',status:'proposal-not-canonical',scope:evidence.scope,groups:evidence.cases});
assert.equal(digest(caseReview(oldEvidence)),oldEvidence.reviewSha256);
assert.equal(digest(caseReview(newEvidence)),newEvidence.reviewSha256);
let children=0;
for(const row of newEvidence.cases) if(row.obligations.localPaint?.retainedPopupDepthInputApplicability) {
  assert.equal(row.obligations.localPaint.retainedPopupDepthInputApplicability.sharedMechanism.applicableToCaseRuntimeProven,false);
  delete row.obligations.localPaint.retainedPopupDepthInputApplicability;children++;
}
assert.equal(children,133); same(newEvidence.cases,oldEvidence.cases,'Complete2311 prior cases and remaining work');
const extras=new Set(newEvidence.evidenceFingerprints.filter(r=>!oldEvidence.evidenceFingerprints.some(o=>o.file===r.file)).map(r=>r.file));
assert.equal(extras.size,6);
same(newEvidence.evidenceFingerprints.filter(r=>!extras.has(r.file)),oldEvidence.evidenceFingerprints,'All prior dependency receipts');
const reader=createPopupDepthReviewReader({root:process.cwd(),read:fs.readFileSync,reviewSha256:popupDepthInputsReview});
same(newEvidence.sourceApplicability,reader.sourceApplicability,'Exact queued source applicability');
for(const receipt of newEvidence.evidenceFingerprints.filter(r=>extras.has(r.file))) assert.equal(hash(reader.read(receipt.file)),receipt.sha256);
const ignored=new Set(['cases','evidenceFingerprints','sourceApplicability','reviewSha256']);
const rest=value=>Object.fromEntries(Object.entries(value).filter(([key])=>!ignored.has(key)));
same(rest(newEvidence),rest(oldEvidence),'All remaining inspection metadata');

const derived=new Map();
for(const index of controlIndices) {
  const old=before.controls[index],current=after.controls[index];
  const expected=structuredClone(old); assert.equal(expected.reviewEvidence.observation.normalizationReconciliation.currentModuleSha256,oldModule);
  expected.reviewEvidence.observation.normalizationReconciliation.currentModuleSha256=newModule;
  same(expected,current,'Only control normalization receipt'); derived.set(digest(old),digest(current));
}
assert.equal(derived.size,48);
const motion=collectOwnerInitialMotion(),reportHash=value=>hash(JSON.stringify(value,null,2)+'\n');
const newReportHash=reportHash(motion),oldMotion=structuredClone(motion);
const owner=oldMotion.sourceFingerprints.filter(r=>r.file===producerFile); assert.equal(owner.length,1); assert.equal(owner[0].sha256,newModule);owner[0].sha256=oldModule;
const oldReportHash=reportHash(oldMotion); let direct=0,proofs=0,reports=0;
const modulePaths=new Set([
  JSON.stringify(['controlLineBoxes','observations','#','normalizationReconciliation','currentModuleSha256']),
  JSON.stringify(['ownerCaretInputs','binding','completeSource','sources','#','current']),
  JSON.stringify(['reviewedSourceBatchInputs','binding','sourceConservation','sourceReceiptTransitions','#','currentSha256']),
  JSON.stringify(['controlTypography','differences','#','reviewEvidence','observation','normalizationReconciliation','currentModuleSha256']),
]);
for(const change of leaves.changes) {
  const shape=JSON.stringify(change.path.map(p=>typeof p==='number'?'#':p));
  if(modulePaths.has(shape)) {assert.equal(change.before,oldModule);assert.equal(change.after,newModule);direct++;}
  else if(shape===JSON.stringify(['discrepancies','#','reviewEvidence','proofs','#','controlProofSha256'])) {assert.equal(derived.get(change.before),change.after);proofs++;}
  else {assert.deepEqual(change.path,['reviewedSourceBatchInputs','binding','sourceConservation','currentReportSha256']);assert.equal(change.before,oldReportHash);assert.equal(change.after,newReportHash);reports++;}
}
assert.deepEqual([direct,proofs,reports],[98,48,1]);
console.log(JSON.stringify({producer:{file:'scripts/check-popup-depth-canonical-conservation.mjs',sha256:hash(fs.readFileSync('scripts/check-popup-depth-canonical-conservation.mjs'))},
  previous:beforeManifest.compressedSha256,current:afterManifest.compressedSha256,unchangedSections:69,reconciledChangedSections:11,
  fixedShapeEntriesCompared:Object.values(leaves.counts).reduce((a,b)=>a+b,0),changedLeaves:147,directModuleReceipts:direct,derivedProofHashes:proofs,derivedMotionReports:reports,
  addedFindings:1,addedProofs:13,addedSourcePaths:6,changedSources,addedCaseChildren:children,priorCasesPreserved:2311,
  inspectionPromoted:false,currentRenderingAccepted:false,canonicalPublication:false}));
