import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { collectFullTreeInventory, collectRetainedTypographyEvidence, collectStyleDiscrepancies } from './input-equivalence-audit.mjs';
import { bindPreciseAuditNormalization } from './audit-normalization-contracts.mjs';
import { queryFindings } from '../../scripts/audit-findings-store.mjs';
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

test('interactive control-label weight stages cover every case without claiming current glyph paint', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const raw = JSON.parse(bytes);
  const cases = raw.interactions.filter(c => ['checkbox', 'radio', 'slide-toggle'].includes(c.family))
    .map(c => ({ ...c, kind: 'interaction' }));
  assert.equal(cases.length, 168);
  const inventory = collectFullTreeInventory(cases); assert.deepEqual(inventory.errors, []);
  const retained = collectRetainedTypographyEvidence(cases, inventory);
  const collect = (entries, evidence) => collectStyleDiscrepancies(entries, { observations: [] }, evidence,
    ...Array.from({ length: 19 }, () => []), { observations: [] }, { observations: [] }, { observations: [] }, [], { observations: [] });
  const rows = collect(cases, retained);
  const weights = rows.filter(r => r.property === 'fontWeight' && r.attribution === 'reviewed-stage-mismatch');
  assert.equal(weights.length, 4);
  assert.deepEqual(weights.map(r => r.element).sort(), ['checkbox-label', 'radio-solo-label', 'radio-team-label', 'slide-toggle-label']);
  assert.equal(weights.reduce((n, r) => n + r.occurrences, 0), 224);
  assert.ok(rows.filter(r => r.attribution === 'reviewed-stage-mismatch').every(r => r.property === 'fontWeight'));
  for (const row of weights) {
    assert.equal(row.occurrences, 56); assert.equal(row.reference, '400'); assert.equal(row.astylar, undefined);
    assert.equal(row.classification, 'parity-harness-defect');
    assert.equal(row.reviewEvidence.currentPseudoStatePaintVerified, false);
    assert.equal(row.reviewEvidence.inputEquivalent, false); assert.equal(row.reviewEvidence.renderingEquivalent, false);
  }
  const entry = cases.find(c => c.family === 'checkbox');
  const target = r => r.comparisons.find(c => c.element === 'checkbox-label' && c.case === `interaction:checkbox@${entry.profile}/${entry.viewport.id}/${entry.state}`);
  for (const mutate of [
    p => { p.state = 'foreign'; }, p => { p.source = 'guessed'; }, p => { p.revision = -1; },
    p => { p.currentPseudoStatePaintVerified = true; }, p => { p.properties.fontWeight.retained = '500'; },
    p => { p.properties.fontWeight.normal = '400'; }, p => { p.text = 'different'; },
  ]) {
    const changed = structuredClone(retained); mutate(target(changed));
    const actual = collect([entry], changed);
    assert.equal(actual.find(r => r.element === 'checkbox-label' && r.property === 'fontWeight').attribution, 'unresolved');
  }
});

test('retained weight host join covers all toggle cases and rejects detached leaf or host evidence', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const raw = JSON.parse(bytes);
  const cases = [...raw.results.map(c => ({ ...c, kind: 'static' })), ...raw.interactions.map(c => ({ ...c, kind: 'interaction' }))]
    .filter(c => c.family === 'button-toggle');
  assert.equal(cases.length, 68);
  const inventory = collectFullTreeInventory(cases); assert.deepEqual(inventory.errors, []);
  const retained = collectRetainedTypographyEvidence(cases, inventory), canonical = bindPreciseAuditNormalization();
  const snapshot = { generation: 'fcb44846abf9e0b7a63a0277d3990b8420709765748ef27fb625c2ebf40812a9',
    indexSha256: '95d98fbe2cafb17e8a2ef0d9ed3cd04c3a909637461a684bd237de7bf3bfa4b8' };
  const rows = queryFindings('artifacts/material-parity/working-audit', 'button-toggle', snapshot)
    .filter(r => r.evidence.section === 'discrepancies' && r.property === 'fontWeight' && r.reference === '500' && r.attribution === 'unresolved');
  assert.equal(rows.length, 2);
  const result = applyRetainedFontScalar(rows, cases, inventory, retained, canonical);
  assert.ok(result.every(r => r.attribution === retainedFontScalarAttribution));
  assert.equal(result.reduce((n, r) => n + r.reviewEvidence.proofs.length, 0), 136);
  for (const [i, row] of result.entries()) {
    for (const field of ['reference', 'astylar', 'occurrences', 'cases', 'states']) assert.deepEqual(row[field], rows[i][field]);
    assert.equal(row.reviewEvidence.inputEquivalent, false); assert.equal(row.reviewEvidence.renderingEquivalent, false);
  }
  assert.deepEqual(validateRetainedFontScalar(result, rows, cases, inventory, retained, canonical), []);
  const target = r => r.differences.find(d => d.element === 'button-toggle-one-label' && d.property === 'fontWeight');
  for (const mutate of [
    r => { target(r).reviewEvidence.referenceChain.pop(); },
    r => { target(r).reviewEvidence.candidateChain.splice(1, 1); },
    r => { target(r).revision++; },
    r => { target(r).values.retained = '500'; },
    r => { target(r).reviewEvidence.referenceRule.declarations['font-weight'].value = '400'; },
    r => { r.differences.push(structuredClone(target(r))); },
  ]) {
    const changed = structuredClone(retained); mutate(changed);
    const rejected = applyRetainedFontScalar(rows, cases, inventory, changed, canonical);
    assert.equal(rejected.find(r => r.element === 'button-toggle-one').attribution, 'unresolved');
  }
  assert.deepEqual(applyRetainedFontScalar(rows, cases.slice(1), inventory, retained, canonical), rows);
  for (const mutate of [r => r.pop(), r => r.push(structuredClone(r[0])), r => { r[0].reviewEvidence.proofs.pop(); }]) {
    const changed = structuredClone(result); mutate(changed);
    assert.equal(validateRetainedFontScalar(changed, rows, cases, inventory, retained, canonical).length, 1);
  }
});
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
