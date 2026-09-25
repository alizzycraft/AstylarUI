import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyRetainedFontScalar, validateRetainedFontScalar, retainedFontScalarAttribution } from './retained-font-scalar.mjs';

const normalize = style => ({ ...style, ...(style.fontFamily ? { fontFamily: style.fontFamily.toLowerCase() } : {}) });
function fixture() {
  const key = 'static:card@light/desktop';
  const reference = {fontFamily:'Roboto', ...Object.fromEntries(Array.from({length:88},(_,i)=>['field'+i,'value']))};
  const rows = [{family:'card',element:'card-title',property:'fontFamily',reference:'roboto',occurrences:1,attribution:'unresolved',cases:['not-membership']}];
  const cases = [{family:'card',profile:'light',viewport:{id:'desktop'},styleInputs:[{id:'card-title',reference,
    astylar:{},astylarNormalResolvedStyle:{},astylarInteractionResolvedStyle:{},astylarResolvedStyleEvidenceVersion:2}]}];
  const inventory = {errors:[],cases:[{case:key,side:'reference',variant:0},{case:key,side:'astylar',variant:1,resolvedStyleRevision:1}],
    styles:[{side:'reference',value:reference},{side:'astylar',value:{}}],variants:[
      {side:'reference',nodes:[{key:'r',attributes:{id:'card-title'},style:0}]},
      {side:'astylar',resolvedStyleEvidenceVersion:2,resolvedStyleSource:'core-style-inspection',nodes:[
        {key:'a',authored:{id:'card-title'},style:1,normalStyle:1,interactionStyle:1}]}]};
  const values={reference:'roboto',retained:'roboto,arial,sans-serif'};
  const difference={case:key,family:'card',element:'card-title',property:'fontFamily',referenceNode:'r',astylarNode:'a',
    source:'core-text-registry',attribution:'reviewed-inherited-component-font-stack',classification:'application-plugin-authoring-defect',
    inputEquivalent:false,currentPseudoStatePaintVerified:false,values,
    reviewEvidence:{referenceChain:[{node:'r'}],candidateChain:[{node:'a'}],referenceComputed:values.reference,candidateRetained:values.retained}};
  const comparison={case:key,element:'card-title',referenceNode:'r',astylarNode:'a',source:'core-text-registry',properties:{fontFamily:values}};
  return {rows,cases,inventory,retained:{differences:[difference],comparisons:[comparison]}};
}
const apply=f=>applyRetainedFontScalar(f.rows,f.cases,f.inventory,f.retained,normalize);
test('retained font join preserves original scalar values and complete owner proof membership',()=>{
  const f=fixture(), before=structuredClone(f), rows=apply(f);
  assert.equal(rows[0].attribution,retainedFontScalarAttribution);
  assert.equal(rows[0].reviewEvidence.proofs.length,1);
  assert.equal(rows[0].reviewEvidence.inputEquivalent,false);
  assert.equal(rows[0].reviewEvidence.renderingEquivalent,false);
  for(const k of Object.keys(f.rows[0]).filter(k=>k!=='attribution'))assert.deepEqual(rows[0][k],f.rows[0][k]);
  assert.deepEqual(f,before);
});
test('retained font join rejects incomplete membership wrong owners stages and detached comparison evidence',()=>{
  const mutations=[
    f=>f.rows[0].occurrences++,f=>f.cases.push(structuredClone(f.cases[0])),
    f=>f.cases[0].styleInputs.push(structuredClone(f.cases[0].styleInputs[0])),
    f=>delete f.cases[0].styleInputs[0].astylar,f=>f.cases[0].styleInputs[0].astylar.fontFamily='Roboto',
    f=>f.cases[0].styleInputs[0].astylarResolvedStyleEvidenceVersion=1,
    f=>f.inventory.variants[0].nodes[0].attributes.id='other',f=>f.inventory.variants[1].nodes[0].authored.id='other',
    f=>f.inventory.variants[1].nodes.push(structuredClone(f.inventory.variants[1].nodes[0])),
    f=>f.inventory.errors.push({case:'static:card@light/desktop'}),
    f=>f.inventory.styles[1].value.fontFamily='Roboto',
    f=>f.retained.differences.splice(0),f=>f.retained.differences.push(structuredClone(f.retained.differences[0])),
    f=>f.retained.differences[0].referenceNode='wrong',f=>f.retained.differences[0].astylarNode='wrong',
    f=>f.retained.differences[0].source='core-control-texture',f=>f.retained.differences[0].values.normal='roboto',
    f=>f.retained.differences[0].reviewEvidence.candidateChain[0].node='wrong',
    f=>f.retained.differences[0].inputEquivalent=true,f=>f.retained.comparisons.splice(0),
    f=>f.retained.comparisons[0].referenceNode='wrong',f=>f.rows[0].attribution='already-reviewed',
    f=>{delete f.cases[0].styleInputs[0].reference.field0;},
  ];
  for(const mutate of mutations){const f=fixture();mutate(f);assert.deepEqual(apply(f),f.rows);}
});
test('retained font validation rejects altered missing and duplicated persisted classifications',()=>{
  const f=fixture(), rows=apply(f), validate=r=>validateRetainedFontScalar(r,f.rows,f.cases,f.inventory,f.retained,normalize);
  assert.deepEqual(validate(JSON.parse(JSON.stringify(rows))),[]);
  for(const mutate of [r=>r.splice(0),r=>r.push(structuredClone(r[0])),r=>r[0].occurrences++,
    r=>r[0].reviewEvidence.inputEquivalent=true,r=>r[0].reviewEvidence.proofs[0].proofSha256='forged']){
    const changed=structuredClone(rows);mutate(changed);assert.equal(validate(changed).length,1);
  }
});
