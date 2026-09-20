import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { collectOwnerInitialMotion } from './audit-material-owner-initial-motion.mjs';
import { planOwnerMotionAttribution } from './audit-material-owner-motion-attribution.mjs';
import { collectControlSelfAlignment } from './audit-material-control-self-alignment.mjs';
import { collectContentFlexRequests } from './audit-material-content-flex-requests.mjs';
import { collectBadgeWhitespace } from './audit-material-badge-whitespace.mjs';
import { planLayoutRequestAttribution } from './audit-material-layout-request-attribution.mjs';
import { collectButtonPaintAllStates } from './audit-material-button-paint-all-states.mjs';
import { planButtonPaintAttribution } from './audit-material-shared-button-paint-attribution.mjs';
import { collectButtonBaseAlpha } from './audit-material-button-base-alpha.mjs';
import { collectMotionDelayTargets } from './audit-material-motion-delay-targets.mjs';
import { bindOwnerCaretNormalization } from '../tests/material-parity/owner-caret-source-binding.mjs';
import { readCaretConservationRows } from '../tests/material-parity/owner-caret-canonical-conservation.mjs';

const hash = x => createHash('sha256').update(x).digest('hex');
const digest = x => hash(JSON.stringify(x));
const same = (a,b,message) => assert.ok(isDeepStrictEqual(a,b),message);
const signature = r => JSON.stringify([r.family,r.element,r.property,r.reference,r.astylar]);
const states = cases => [...new Set(cases.map(k => k.startsWith('static:') ? 'static' : k.split('/').slice(2).join('/')))];
const canonicalSha256 = 'c08d24e94671c18e0c640638ca234b9571720080474115cc2b8388a2883a810e';

// Join the two newer proof populations without widening their stated scope.
export function additionalReviewedGroups(base, delay, normalize) {
  assert.equal(base.kind,'inactive-button-base-alpha-authoring-review');
  assert.equal(delay.kind,'owner-motion-delay-target-review');
  for(const report of [base,delay]) for(const flag of ['canonicalAttributionChanged','inputEquivalent','renderingEquivalent']) assert.equal(report[flag],false);
  assert.equal(base.observations,base.findings.length); assert.equal(base.observations,120);
  const grouped = new Map();
  for(const f of base.findings) {
    const p=f.proof;
    assert.equal(p.classification,'application-plugin-authoring-defect');
    assert.equal(p.element,f.element); assert.equal(f.family,'button');
    for(const flag of ['inputEquivalent','renderingEquivalent','rendererCauseProven']) assert.equal(p[flag],false);
    assert.equal(p.candidateAlpha,1);
    assert.equal(p.referenceAlpha,f.element==='button-secondary'?0:.12);
    const owner={family:f.family,element:f.element,property:'backgroundColor',
      reference:normalize({backgroundColor:p.referenceBackground}).backgroundColor,
      astylar:normalize({backgroundColor:p.candidateBackground}).backgroundColor};
    const key=signature(owner);
    if(!grouped.has(key)) grouped.set(key,{...owner,batch:'base-alpha',classification:p.classification,
      attribution:'reviewed-'+p.attribution,observations:[]});
    const g=grouped.get(key); assert.equal(g.attribution,'reviewed-'+p.attribution);
    g.observations.push({case:f.case,originalInputSha256:f.originalInputSha256,inputTrees:f.inputTrees,proofSha256:digest(p)});
  }
  assert.equal(grouped.size,8);
  const result=[...grouped.values()];
  for(const g of delay.findings.filter(g=>g.disposition==='captured-owner-target-set-disjoint')) {
    for(const o of g.observations) {
      const p=delay.patterns[o.pattern]; assert.ok(p);
      const {sha256,...content}=p; assert.equal(sha256,digest(content));
      assert.equal(p.result.disposition,'captured-owner-target-set-disjoint');
      assert.equal(o.disposition,p.result.disposition);
      for(const flag of ['inputEquivalent','computedCandidateVerified','renderingEquivalent','inactiveMotionProven','cascadeWinnerProven']) assert.equal(p.result[flag],false);
    }
    result.push({family:g.family,element:g.element,property:g.property,
      reference:normalize({[g.property]:g.reference})[g.property],batch:'motion-delay',
      classification:'parity-harness-defect',attribution:'reviewed-owner-delay-target-observation-stage',
      observations:g.observations.map(o=>({case:o.case,originalInputSha256:o.originalInputSha256,
        originalProofSha256:o.originalProofSha256,proofSha256:delay.patterns[o.pattern].sha256}))});
  }
  assert.equal(result.length,20);
  assert.equal(result.reduce((n,g)=>n+g.observations.length,0),960);
  return result.map(g=>({...g,cases:g.observations.map(o=>o.case),occurrences:g.observations.length,
    inputEquivalent:false,renderingEquivalent:false,rendererCauseProven:false}));
}

// Metadata proposal only. Never mutates rows or accepts two owners for a row.
export function joinReviewedSourceBatch(groups,rows) {
  const selected=new Set(), findings=[];
  for(const g of groups) {
    assert.ok(['application-plugin-authoring-defect','parity-harness-defect'].includes(g.classification));
    assert.match(g.attribution,/^reviewed-/);
    for(const flag of ['inputEquivalent','renderingEquivalent','rendererCauseProven']) assert.equal(g[flag],false);
    const found=rows.filter(r=>signature(r)===signature(g)&&r.attribution==='unresolved');
    assert.equal(found.length,1,'unresolved canonical identity missing or ambiguous: '+signature(g));
    const row=found[0]; assert.equal(row.attribution,'unresolved','prior classification must remain');
    assert.ok(!selected.has(row),'overlapping proposal ownership'); selected.add(row);
    assert.equal(g.cases.length,g.occurrences); assert.equal(new Set(g.cases).size,g.cases.length);
    assert.equal(row.occurrences,g.occurrences); same(row.cases,g.cases.slice(0,12),'ordered cases differ');
    same(row.states,states(g.cases),'complete states differ');
    if(g.canonicalRowSha256) assert.equal(g.canonicalRowSha256,digest(row),'original complete row differs');
    findings.push({...g,canonicalRowSha256:digest(row),states:row.states});
  }
  return {groups:findings.length,observations:findings.reduce((n,g)=>n+g.occurrences,0),findings,
    otherCompleteRows:rows.length-selected.size,otherOrderedRowDigestsSha256:digest(rows.filter(r=>!selected.has(r)).map(digest)),
    baselineUnresolved:rows.filter(r=>r.attribution==='unresolved').length,
    canonicalFilesChanged:false,inputEquivalent:false,renderingEquivalent:false};
}

export async function collectReviewedSourceBatch() {
  const sources={};
  const fresh=(file,collect)=>{
    const bytes=readFileSync(file,'utf8').replaceAll('\r\n','\n'), value=collect();
    same(value,JSON.parse(bytes),'complete source report must freshly replay: '+file);
    sources[file]=hash(bytes); return value;
  };
  const motion=fresh('docs/material-owner-initial-motion-review.json',collectOwnerInitialMotion);
  const layout={alignment:fresh('docs/material-control-self-alignment.json',collectControlSelfAlignment),
    flex:fresh('docs/material-content-flex-requests.json',collectContentFlexRequests),
    whitespace:fresh('docs/material-badge-whitespace-audit.json',collectBadgeWhitespace)};
  const paint=fresh('docs/material-button-paint-all-states.json',collectButtonPaintAllStates);
  const base=fresh('docs/material-button-base-alpha.json',collectButtonBaseAlpha);
  const delay=fresh('docs/material-motion-delay-target-review.json',collectMotionDelayTargets);
  const normalization=JSON.parse(readFileSync('docs/material-font-ownership-attribution-plan.json')).productionNormalization;
  assert.equal(normalization.sha256,'8929720cf30769ac3148458bf954402466f6f296c0d764c3123cd797f1e9300e');
  const normalize=bindOwnerCaretNormalization(readFileSync(normalization.module,'utf8'),normalization);
  const {manifest,rows}=await readCaretConservationRows(readFileSync);
  assert.equal(manifest.compressedSha256,canonicalSha256,'prepared alignment payload changed; review transition before rebinding');
  const m=planOwnerMotionAttribution(motion,rows,normalize), l=planLayoutRequestAttribution(layout,rows,normalize),
    p=planButtonPaintAttribution(paint,rows,normalize);
  const groups=[...m.proposed.map(g=>({...g,batch:'owner-motion'})),
    ...l.proposed.map(g=>({...g,batch:'layout-authoring',classification:g.proposedClassification,
      attribution:g.proposedAttribution,cases:g.observations.map(o=>o.case)})),
    ...p.proposed.map(g=>({...g,batch:'button-state-paint',classification:g.proposedClassification,
      attribution:g.proposedAttribution,canonicalRowSha256:g.canonicalMatches[0].canonicalRowSha256,
      cases:g.observations.map(o=>o.case)})),...additionalReviewedGroups(base,delay,normalize)];
  const plan=joinReviewedSourceBatch(groups,rows);
  assert.equal(plan.groups,146); assert.equal(plan.observations,6295);
  return {schemaVersion:1,kind:'prepared-reviewed-source-batch',sources,sourceReportsFreshlyReplayed:true,
    canonicalPayload:manifest,productionNormalization:normalization,
    scope:'Read-only preparation against the alignment candidate; not accepted canonical integration, input equivalence or output parity.',
    ...plan};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  assert.ok(process.argv.length===2||process.argv.length===3&&process.argv[2]==='--check');
  const report=await collectReviewedSourceBatch(),output=JSON.stringify(report,null,2)+'\n',file='docs/material-reviewed-source-batch.json';
  if(process.argv[2]==='--check') assert.equal(hash(readFileSync(file,'utf8').replaceAll('\r\n','\n')),hash(output));
  else writeFileSync(file,output);
  console.log(JSON.stringify({groups:report.groups,observations:report.observations,otherCompleteRows:report.otherCompleteRows,
    baselineUnresolved:report.baselineUnresolved,sha256:hash(output)}));
}
