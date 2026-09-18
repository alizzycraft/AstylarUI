import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { reconstructBeforeReviewedInputMetadata, reconstructBeforeFollowupInputMetadata,
  independentlyReconstructBeforeReviewedInputs } from './later-reviewed-input-conservation.mjs';

const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
function fixture(kind = 'followup') {
  const binding = JSON.parse(readFileSync(`docs/material-${kind}-input-proposal-binding.json`));
  const transition = JSON.parse(readFileSync(`docs/material-${kind}-input-transition-dry-run.json`));
  const previous = binding.groups.map(g => structuredClone(g.originalCompleteRow));
  const byHash = new Map(transition.changes.map(c => [c.originalCompleteRowSha256, c.projectedRow]));
  const current = previous.map(row => structuredClone(byHash.get(digest(row))));
  const groups = current.map(row => {
    const { family, element, property, reference, astylar, occurrences, cases, states, reviewedCases,
      classification, attribution, justification, recommendedOwner, reviewEvidence } = row;
    return { family, element, property, reference, astylar, occurrences, cases, states, reviewedCases,
      classification, attribution, justification, recommendedOwner, reviewEvidence,
      originalCompleteRowSha256: reviewEvidence.originalCompleteRowSha256 };
  });
  return { previous, current, evidence: { binding: { status: 'bound' }, groups: structuredClone(groups),
    coverage: { suppliedObservations: groups.reduce((n, g) => n + g.occurrences, 0) } } };
}

test('follow-up reconstruction restores only the exact 66-group metadata and retains unrelated mutations', () => {
  const f = fixture(), before = digest(f);
  const result = reconstructBeforeFollowupInputMetadata(f.previous, f.current, f.evidence);
  assert.deepEqual(result.rows, f.previous); assert.equal(result.changes.length, 66);
  assert.equal(result.changes.reduce((n, r) => n + r.occurrences, 0), 2640);
  assert.equal(digest(f), before);
  const other = { family: 'other', element: 'unrelated', property: 'color', reference: 'red',
    astylar: 'blue', occurrences: 1, cases: ['source'], states: ['static'], attribution: 'unresolved' };
  const changed = { ...other, extraRawField: 'must remain detectable' };
  f.previous.push(other); f.current.push(changed);
  assert.deepEqual(reconstructBeforeFollowupInputMetadata(f.previous, f.current, f.evidence).rows.at(-1), changed);
});

test('composed pure reconstruction keeps earlier and later reviewed memberships separate', () => {
  const first = fixture('reviewed'), later = fixture();
  const previous = [...first.previous, ...later.previous], current = [...first.current, ...later.current];
  const originalDigest = digest([previous, current]);
  const followup = reconstructBeforeFollowupInputMetadata(previous, current, later.evidence);
  assert.deepEqual(followup.rows.slice(0, first.current.length), first.current);
  assert.equal(followup.changes.length, 66);
  const reviewed = reconstructBeforeReviewedInputMetadata(previous, followup.rows, first.evidence);
  assert.deepEqual(reviewed.rows, previous); assert.equal(reviewed.changes.length, 134);
  assert.equal(reviewed.changes.reduce((n, r) => n + r.occurrences, 0), 3325);
  assert.equal(digest([previous, current]), originalDigest);
});

test('follow-up reconstruction rejects changed membership, raw evidence and unsupported metadata', () => {
  const mutations = [
    f => { f.previous.pop(); }, f => { f.previous.push(structuredClone(f.previous[0])); },
    f => { f.previous[0].attribution = 'previously-reviewed'; },
    f => { f.current.pop(); }, f => { f.current.push(structuredClone(f.current[0])); },
    f => { f.current[0].reference = 'changed'; }, f => { f.current[0].astylar = 'changed'; },
    f => { f.current[0].family = 'changed'; }, f => { f.current[0].element = 'changed'; },
    f => { f.current[0].property = 'changed'; }, f => { f.current[0].occurrences++; },
    f => { f.current[0].cases.push('invented'); }, f => { f.current[0].states.push('invented'); },
    f => { f.current[0].referenceAuthoredExamples = ['changed']; },
    f => { f.current[0].astylarAuthoredExamples = ['changed']; },
    f => { f.current[0].extraRawField = 'new'; },
    f => { f.current[0].attribution = 'unresolved'; },
    f => { f.current[0].classification = 'equivalent-representation'; },
    f => { f.current[0].justification = 'invented'; },
    f => { f.current[0].recommendedOwner = 'invented'; },
    f => { f.current[0].reviewedCases.pop(); },
    f => { f.current[0].reviewEvidence.rendererCauseProven = true; },
    f => { f.current[0].reviewEvidence.originalCompleteRowSha256 = 'changed'; },
    f => { f.evidence.binding.status = 'unbound'; },
    f => { f.evidence.groups.pop(); }, f => { f.evidence.coverage.suppliedObservations++; },
  ];
  for (const [index, mutate] of mutations.entries()) {
    const f = fixture(), before = digest(f); mutate(f); assert.notEqual(digest(f), before);
    assert.throws(() => reconstructBeforeFollowupInputMetadata(f.previous, f.current, f.evidence), `mutation ${index}`);
  }
  assert.equal(mutations.length, 26);
});

test('historical wrapper refuses missing or merely self-consistent follow-up authentication', () => {
  const f = fixture();
  for (const followupInputs of [undefined, f.evidence]) {
    assert.throws(() => independentlyReconstructBeforeReviewedInputs(
      { discrepancies: f.current, followupInputs }, { discrepancies: f.previous }));
  }
});

test('combined historical reconstruction independently replays all original reviewed and follow-up sources', () => {
  const code = `import assert from 'node:assert/strict';import{readFileSync}from'node:fs';import{createHash}from'node:crypto';
    import{collectReviewedInputAuditInputs}from'./tests/material-parity/reviewed-input-audit-source-binding.mjs';
    import{collectFollowupInputAuditInputs}from'./tests/material-parity/followup-input-audit-source-binding.mjs';
    import{independentlyReconstructBeforeReviewedInputs}from'./tests/material-parity/later-reviewed-input-conservation.mjs';
    const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
    const file='artifacts/material-parity/current-ancestry-audit/latest-report.json', raw=JSON.parse(readFileSync(file));
    const reviewedInputs=collectReviewedInputAuditInputs(raw,{parityPath:file});
    const followupInputs=collectFollowupInputAuditInputs(raw,{parityPath:file});
    const previous=[], current=[];
    for(const kind of ['reviewed','followup']) {
      const b=JSON.parse(readFileSync('docs/material-'+kind+'-input-proposal-binding.json'));
      const t=JSON.parse(readFileSync('docs/material-'+kind+'-input-transition-dry-run.json'));
      const byHash=new Map(t.changes.map(c=>[c.originalCompleteRowSha256,c.projectedRow]));
      for(const g of b.groups){previous.push(g.originalCompleteRow);current.push(byHash.get(digest(g.originalCompleteRow)));}
    }
    const audit={discrepancies:current,reviewedInputs,followupInputs};
    const before=digest([audit,previous]);
    const result=independentlyReconstructBeforeReviewedInputs(audit,{discrepancies:previous});
    assert.deepEqual(result.rows,previous);assert.equal(result.changes.length,134);assert.equal(result.followupChanges.length,66);
    assert.equal(result.changes.reduce((n,r)=>n+r.occurrences,0),3325);
    assert.equal(result.followupChanges.reduce((n,r)=>n+r.occurrences,0),2640);
    assert.equal(digest([audit,previous]),before);
    const changed=structuredClone(followupInputs);changed.observations.pop();
    assert.throws(()=>independentlyReconstructBeforeReviewedInputs({...audit,followupInputs:changed},{discrepancies:previous}));
    console.log(JSON.stringify({earlierGroups:134,earlierObservations:3325,laterGroups:66,laterObservations:2640,
      sourceReplayed:true,canonicalFilesChanged:false}));`;
  const guard = `import fs from 'node:fs';import{syncBuiltinESMExports}from'node:module';
    fs.writeFileSync=()=>{throw Error('CHECK_MODE_ATTEMPTED_WRITE')};syncBuiltinESMExports();`;
  const output = execFileSync(process.execPath, ['--max-old-space-size=1536', '--import',
    'data:text/javascript;base64,' + Buffer.from(guard).toString('base64'), '--input-type=module', '-e', code],
  { encoding: 'utf8', maxBuffer: 1024 * 1024 });
  assert.deepEqual(JSON.parse(output), { earlierGroups: 134, earlierObservations: 3325, laterGroups: 66,
    laterObservations: 2640, sourceReplayed: true, canonicalFilesChanged: false });
});
