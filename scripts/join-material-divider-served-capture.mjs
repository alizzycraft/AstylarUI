import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fingerprintDirectory, materialCaseKey, openMaterialCheckpoint } from '../tests/material-parity/run-checkpoint.mjs';
import { saveReviewProposal, loadCaseObligationReview } from './audit-findings-store.mjs';

// Extend the existing exact-case review, without promoting inspection/rendering.
const base='artifacts/material-parity/working-audit';
const predecessor='84d695d9dd852ac2018b8eeefc7d1f01afaa299f030857e6656d98088d206b14';
const run='artifacts/material-parity/divider-alignment-provenance-20261015';
const hash=b=>createHash('sha256').update(b).digest('hex');
const receipt=file=>({file,sha256:hash(readFileSync(file))});
const reportReceipt=receipt(`${run}/latest-report.json`);
assert.equal(reportReceipt.sha256,'4be9c6d199952f35203f31d08def08d0d936071f4eb313b75ad3bbf72dd46f11');
const report=JSON.parse(readFileSync(reportReceipt.file));
const provenance=report.captureProvenance;
const servedRoot='examples/material-showcase/dist/material-showcase/browser';
const served=fingerprintDirectory(servedRoot);
assert.deepEqual(served,provenance.browserFiles);assert.equal(served.length,1887);
for(const captured of provenance.harnessFiles)assert.deepEqual(receipt(captured.file),captured);
assert.equal(provenance.harnessFiles.length,10);
assert.equal(receipt('node_modules/.package-lock.json').sha256,provenance.installedDependencies);
const mapFile=`${servedRoot}/chunk-PCHQTLJM.js.map`,map=JSON.parse(readFileSync(mapFile));
const sourceFile='examples/material-showcase/src/app/astylar.component.ts';
const index=map.sources.indexOf('src/app/astylar.component.ts');assert.ok(index>=0);
assert.equal(map.sourcesContent[index],readFileSync(sourceFile,'utf8'));
const checkpoint=openMaterialCheckpoint({directory:run,provenance,resume:true});
const rows=new Map();let trees=0;
for(const [kind,entries]of [['static',report.results],['interaction',report.interactions]])for(const row of entries){
  assert.equal(row.family,'divider');assert.equal(row.meetsAcceptance,true);
  const key=materialCaseKey(kind,row);assert.ok(!rows.has(key));
  assert.deepEqual(checkpoint.load(key),row);
  for(const r of Object.values(row.inputTrees)){assert.deepEqual(receipt(r.file),r);trees++;}
  const reviewKey=`${kind}:${row.family}@${row.profile}/${row.viewport.id}${row.state ? `/${row.state}` : ''}`;
  assert.ok(!rows.has(reviewKey));rows.set(reviewKey,row);
}
assert.equal(rows.size,24);assert.equal(trees,48);
assert.equal(provenance.enforce,false);assert.equal(provenance.textAudit,false);
assert.equal(report.summary.meetsAcceptance,false);assert.equal(report.interactionSummary.meetsAcceptance,false);
const review=JSON.parse(readFileSync(`${base}/proposals/${predecessor}.json`)).review;
assert.equal(hash(JSON.stringify(review)),predecessor);
const modified=[];
for(const group of review.groups.filter(g=>g.family==='divider')){
  const row=rows.get(group.case);assert.ok(row,group.case);
  const obligation=group.obligations.sourceCurrentness;
  assert.equal(obligation.disposition,'partial');assert.equal(obligation.retainedMatchingDividerCapture,undefined);
  obligation.retainedMatchingDividerCapture={
    disposition:'partial',case:group.case,recordedRowAcceptance:row.meetsAcceptance,
    capturedBrowser:report.browser,matchingServedFiles:1887,currentHarnessMatches:10,
    workspaceLockMatches:true,applicationExecutableSourceMatches:true,
    evidence:{report:reportReceipt,manifest:receipt(`${run}/checkpoint/manifest.json`),
      inputTrees:row.inputTrees,harness:provenance.harnessFiles,
      workspaceLock:receipt('node_modules/.package-lock.json'),source:receipt(sourceFile),sourceMap:receipt(mapFile),
      producer:receipt('scripts/join-material-divider-served-capture.mjs')},
    boundary:'Exact retained checkpoint/build/harness/application-source correspondence. Earlier no-matching-capture field covers only three October11 runs. No current browser execution,complete core-source/showcase-package equivalence,equal-input paint,full matrix or whole-case acceptance. Original remaining tasks and dispositions survive.'
  };
  modified.push(obligation);
}
assert.equal(modified.length,24);
const proposed=saveReviewProposal(base,review);
const loaded=loadCaseObligationReview(proposed.file,proposed.sha256,review.groups.map(g=>g.case));
for(const obligation of modified)delete obligation.retainedMatchingDividerCapture;
assert.equal(hash(JSON.stringify(review)),predecessor);
console.log(JSON.stringify({predecessor,proposed,cases:24,verifiedTrees:trees,servedFiles:served.length,
  harnessFiles:10,dependencyCount:loaded.evidenceFingerprints.length,allCases:loaded.cases.length,
  predecessorRecovered:true,scope:'Additive retained applicability only;no whole-case or current rendering promotion.'}));
