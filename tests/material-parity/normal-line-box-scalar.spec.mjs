import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyNormalLineBoxScalar, validateNormalLineBoxScalar, normalLineBoxScalarAttribution } from './normal-line-box-scalar.mjs';

function fixture() {
  const key = 'static:button@light/desktop';
  const rows = [{ family: 'button', element: 'action', property: 'lineHeight', reference: 'normal', occurrences: 1, attribution: 'unresolved', cases: ['sample-not-used'] }];
  const cases = [{ family: 'button', profile: 'light', viewport: { id: 'desktop' }, styleInputs: [{ id: 'action', reference: {lineHeight:'normal'}, astylar: {} }] }];
  const style = { lineHeight:'normal', fontSize:'14px', fontWeight:'500', fontStyle:'normal', fontFamily:'Roboto', letterSpacing:'0px' };
  const inventory = { errors: [], cases: [{case:key,side:'reference',variant:0},{case:key,side:'astylar',variant:1}],
    styles: [{side:'reference',value:style},{side:'reference',value:{...style}}],
    variants: [{side:'reference',nodes:[{key:'host',type:'button',attributes:{id:'action'},style:0},
      {key:'label',parent:'host',type:'span',attributes:{class:'mdc-button__label'},style:1}]},
      {side:'astylar',nodes:[{key:'candidate',authored:{id:'action',type:'button'}}]}] };
  const difference = {case:key,element:'action',property:'lineHeight',referenceNode:'label',astylarNode:'candidate',
    attribution:'reviewed-normal-line-box-stage-comparison',classification:'parity-harness-defect',source:'core-control-texture',
    values:{reference:'normal',painted:'17px'},reviewEvidence:{observation:{referenceNode:'label',fontReady:true,naturalHeight:17},
      candidateOmissionChain:[{node:'candidate'}],currentPaintedLineHeight:'17px',inputEquivalent:false,finalRasterVerified:false}};
  return {rows,cases,inventory,control:{differences:[difference]}};
}
const apply = f => applyNormalLineBoxScalar(f.rows,f.cases,f.inventory,f.control);
test('line-box scalar validation rejects missing forged or altered attributions', () => {
  const f=fixture(), rows=apply(f);
  const validate = r => validateNormalLineBoxScalar(r,f.rows,f.cases,f.inventory,f.control);
  assert.deepEqual(validate(rows),[]);
  assert.deepEqual(validate(JSON.parse(JSON.stringify(rows))),[]);
  assert.equal(validate([]).length,1);
  for(const mutate of [r=>r[0].occurrences++,r=>r[0].reviewEvidence.inputEquivalent=true,
    r=>r[0].reviewEvidence.proofs[0].referenceLabel='other',r=>r.push(structuredClone(r[0]))]){
    const changed=structuredClone(rows);mutate(changed);assert.equal(validate(changed).length,1);
  }
});
test('line-box scalar join preserves raw values and requires full original membership', () => {
  const f=fixture(), before=structuredClone(f), result=apply(f);
  assert.equal(result[0].attribution,normalLineBoxScalarAttribution);
  assert.equal(result[0].reviewEvidence.proofs.length,1);
  for(const k of Object.keys(f.rows[0]).filter(k=>k!=='attribution'))assert.deepEqual(result[0][k],f.rows[0][k]);
  assert.equal(result[0].reviewEvidence.inputEquivalent,false);
  assert.deepEqual(f,before);
});
test('line-box scalar join rejects missing duplicate wrong-owner and changed-stage evidence', () => {
  const mutations=[
    f=>f.control.differences.splice(0), f=>f.control.differences.push(structuredClone(f.control.differences[0])),
    f=>f.control.differences[0].referenceNode='host', f=>f.control.differences[0].astylarNode='other',
    f=>f.control.differences[0].reviewEvidence.observation.referenceNode='other',
    f=>f.control.differences[0].reviewEvidence.inputEquivalent=true,
    f=>f.control.differences[0].values.painted='18px',
    f=>f.inventory.styles[1].value.fontSize='16px', f=>f.inventory.variants[0].nodes[1].parent='other',
    f=>f.inventory.variants[0].nodes.push(structuredClone(f.inventory.variants[0].nodes[1])),
    f=>f.rows[0].occurrences=2, f=>f.cases.push(structuredClone(f.cases[0])),
    f=>f.cases[0].styleInputs.push(structuredClone(f.cases[0].styleInputs[0])),
    f=>f.cases[0].styleInputs[0].astylar.lineHeight='20px',
    f=>f.rows[0].attribution='already-reviewed', f=>f.inventory.errors.push({case:'static:button@light/desktop'}),
  ];
  for(const mutate of mutations){const f=fixture();mutate(f);assert.deepEqual(apply(f),f.rows);}
});
