import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { additionalReviewedGroups, joinReviewedSourceBatch } from '../../scripts/prepare-material-reviewed-source-batch.mjs';
import { bindOwnerCaretNormalization } from './owner-caret-source-binding.mjs';

const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const report=JSON.parse(readFileSync('docs/material-reviewed-source-batch.json'));
const normalize=bindOwnerCaretNormalization(readFileSync(report.productionNormalization.module,'utf8'),report.productionNormalization);
function fixture() {
  const groups=structuredClone(report.findings);
  const rows=groups.map(g=>({...Object.fromEntries(['family','element','property','reference','astylar'].filter(k=>Object.hasOwn(g,k)).map(k=>[k,g[k]])),
    occurrences:g.occurrences,cases:g.cases.slice(0,12),states:g.states,attribution:'unresolved',raw:{preserved:true}}));
  groups.forEach((g,i)=>g.canonicalRowSha256=digest(rows[i]));
  rows.push({family:'unrelated',element:'kept',property:'color',reference:'black',attribution:'prior',raw:{preserved:true}});
  return {groups,rows};
}

test('prepared batch joins complete nonoverlapping populations without changing any input',()=>{
  const f=fixture(),before=digest(f),result=joinReviewedSourceBatch(f.groups,f.rows);
  assert.equal(result.groups,146); assert.equal(result.observations,6295);
  assert.equal(result.otherCompleteRows,1); assert.equal(digest(f),before);
  const counts=Object.fromEntries([...new Set(result.findings.map(g=>g.batch))].map(k=>[k,
    {groups:result.findings.filter(g=>g.batch===k).length,observations:result.findings.filter(g=>g.batch===k).reduce((n,g)=>n+g.occurrences,0)}]));
  assert.deepEqual(counts,{'owner-motion':{groups:86,observations:4708},'layout-authoring':{groups:8,observations:492},
    'button-state-paint':{groups:32,observations:135},'base-alpha':{groups:8,observations:120},'motion-delay':{groups:12,observations:840}});
  assert.equal(result.canonicalFilesChanged,false);
});

test('already reviewed same-signature populations remain complete and unchanged',()=>{
  const f=fixture(),reviewed={...structuredClone(f.rows[0]),attribution:'prior-review',occurrences:1,cases:['static:prior@light/desktop'],states:['static']};
  f.rows.push(reviewed);const before=digest(f),result=joinReviewedSourceBatch(f.groups,f.rows);
  assert.equal(result.groups,146);assert.equal(result.otherCompleteRows,2);assert.equal(digest(f),before);
  assert.equal(result.otherOrderedRowDigestsSha256,digest([digest(f.rows.at(-2)),digest(reviewed)]));
});

test('batch refuses stale, partial, overlapping or already-classified membership',()=>{
  const mutations=[
    f=>f.groups.push(structuredClone(f.groups[0])),
    f=>f.rows.push(structuredClone(f.rows[0])),
    f=>f.rows.shift(),
    f=>{f.rows[0].attribution='previous-review'},
    f=>{f.rows[0].occurrences++},
    f=>{f.rows[0].cases.reverse()},
    f=>{f.rows[0].states.push('missing-source-state')},
    f=>{f.rows[0].raw.preserved=false},
    f=>{f.groups[0].inputEquivalent=true},
    f=>{f.groups[0].rendererCauseProven=true},
    f=>{f.groups[0].classification='confirmed-core-defect'},
    f=>{f.groups[0].canonicalRowSha256='changed'},
    f=>{f.groups[0].cases[1]=f.groups[0].cases[0]},
  ];
  for(const mutate of mutations) {
    const f=fixture();mutate(f);const before=digest(f);
    assert.throws(()=>joinReviewedSourceBatch(f.groups,f.rows));assert.equal(digest(f),before);
  }
});

test('new alpha/delay groups retain observation limits and reject inflated proof claims',()=>{
  const load=()=>({base:JSON.parse(readFileSync('docs/material-button-base-alpha.json')),
    delay:JSON.parse(readFileSync('docs/material-motion-delay-target-review.json'))});
  const f=load(),before=digest(f),groups=additionalReviewedGroups(f.base,f.delay,normalize);
  assert.equal(groups.length,20);assert.equal(digest(f),before);
  for(const mutate of [
    f=>{f.base.findings.pop()}, f=>{f.base.inputEquivalent=true},
    f=>{f.base.findings[0].proof.candidateAlpha=.12},
    f=>{f.base.findings[0].proof.rendererCauseProven=true},
    f=>{f.delay.patterns.find(p=>p.result.disposition==='captured-owner-target-set-disjoint').sha256='changed'},
    f=>{const p=f.delay.patterns.find(p=>p.result.disposition==='captured-owner-target-set-disjoint');p.result.cascadeWinnerProven=true;const{sha256,...content}=p;p.sha256=digest(content)},
  ]) {const altered=load();mutate(altered);assert.throws(()=>additionalReviewedGroups(altered.base,altered.delay,normalize));}
});

test('prepared batch freshly replays all reports and authenticates the complete current payload without writes',()=>{
  const guard=`import fs from'node:fs';import{syncBuiltinESMExports}from'node:module';fs.writeFileSync=()=>{throw Error('CHECK_MODE_ATTEMPTED_WRITE')};syncBuiltinESMExports();`;
  const output=execFileSync(process.execPath,['--max-old-space-size=1536','--import',
    'data:text/javascript;base64,'+Buffer.from(guard).toString('base64'),
    'scripts/prepare-material-reviewed-source-batch.mjs','--check'],{encoding:'utf8',maxBuffer:1024*1024});
  const r=JSON.parse(output);assert.equal(r.groups,146);assert.equal(r.observations,6295);
  assert.equal(r.otherCompleteRows,8193);assert.equal(r.baselineUnresolved,1835);
});
