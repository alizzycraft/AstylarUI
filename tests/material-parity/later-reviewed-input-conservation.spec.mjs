import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { reconstructBeforeReviewedInputMetadata, independentlyReconstructBeforeReviewedInputs } from './later-reviewed-input-conservation.mjs';

const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
function fixture() {
  const binding = JSON.parse(readFileSync('docs/material-reviewed-input-proposal-binding.json'));
  const transition = JSON.parse(readFileSync('docs/material-reviewed-input-transition-dry-run.json'));
  const previous = binding.groups.map(g => structuredClone(g.originalCompleteRow));
  const byHash = new Map(transition.changes.map(c => [c.originalCompleteRowSha256, c.projectedRow]));
  const current = previous.map(r => structuredClone(byHash.get(digest(r))));
  const groups = current.map(row => {
    const { family, element, property, reference, astylar, occurrences, cases, states, reviewedCases,
      classification, attribution, justification, recommendedOwner, reviewEvidence } = row;
    return { family, element, property, reference, astylar, occurrences, cases, states, reviewedCases,
      classification, attribution, justification, recommendedOwner, reviewEvidence,
      originalCompleteRowSha256: reviewEvidence.originalCompleteRowSha256 };
  });
  const evidence = { binding: { status: 'bound' }, groups: structuredClone(groups),
    coverage: { suppliedObservations: groups.reduce((n, g) => n + g.occurrences, 0) } };
  return { previous, current, evidence };
}

test('pure historical reconstruction restores exactly reviewed metadata and retains unrelated differences', () => {
  const f = fixture(), before = digest(f);
  const result = reconstructBeforeReviewedInputMetadata(f.previous, f.current, f.evidence);
  assert.deepEqual(result.rows, f.previous); assert.equal(result.changes.length, 134);
  assert.equal(result.changes.reduce((n, r) => n + r.occurrences, 0), 3325);
  assert.equal(digest(f), before, 'inputs mutated');
  const other = { family: 'unrelated', element: 'other', property: 'width', reference: '10px',
    astylar: '11px', occurrences: 1, cases: ['original'], states: ['static'], attribution: 'unresolved' };
  const changed = { ...other, justification: 'unexplained later change' };
  f.previous.push(other); f.current.push(changed);
  const retained = reconstructBeforeReviewedInputMetadata(f.previous, f.current, f.evidence);
  assert.deepEqual(retained.rows.at(-1), changed);
  assert.notDeepEqual(retained.rows, f.previous, 'unrelated change must remain detectable');
});

test('historical reconstruction rejects missing membership, changed raw inputs and unsupported metadata', () => {
  const mutations = [
    f => { f.previous.pop(); }, f => { f.previous.push(structuredClone(f.previous[0])); },
    f => { f.previous[0].attribution = 'already-reviewed'; },
    f => { f.current.pop(); }, f => { f.current.push(structuredClone(f.current[0])); },
    f => { f.current[0].reference = 'changed'; }, f => { f.current[0].occurrences++; },
    f => { f.current[0].cases.push('invented'); }, f => { f.current[0].states.reverse(); f.current[0].states.push('invented'); },
    f => { f.current[0].referenceAuthoredExamples = ['changed']; },
    f => { f.current[0].astylarAuthoredExamples = ['changed']; },
    f => { f.current[0].extraRawField = 'new'; },
    f => { f.current[0].attribution = 'unresolved'; },
    f => { f.current[0].classification = 'equivalent-representation'; },
    f => { f.current[0].justification = 'invented'; },
    f => { f.current[0].reviewedCases.pop(); },
    f => { f.current[0].reviewEvidence.rendererCauseProven = true; },
    f => { f.evidence.binding.status = 'unbound'; },
    f => { f.evidence.groups.pop(); }, f => { f.evidence.coverage.suppliedObservations++; },
  ];
  for (const [index, mutate] of mutations.entries()) {
    const f = fixture(); mutate(f);
    assert.throws(() => reconstructBeforeReviewedInputMetadata(f.previous, f.current, f.evidence), `mutation ${index}`);
  }
  assert.equal(mutations.length, 20);
});

test('historical entry point rejects a self-consistent but unauthenticated source projection', () => {
  const f = fixture();
  assert.throws(() => independentlyReconstructBeforeReviewedInputs(
    { discrepancies: f.current, reviewedInputs: f.evidence }, { discrepancies: f.previous }));
});

test('historical reconstruction independently authenticates every reviewed source before restoring metadata', () => {
  const code = `import assert from 'node:assert/strict';import{readFileSync}from'node:fs';
    import{collectReviewedInputAuditInputs}from'./tests/material-parity/reviewed-input-audit-source-binding.mjs';
    import{independentlyReconstructBeforeReviewedInputs}from'./tests/material-parity/later-reviewed-input-conservation.mjs';
    const file='artifacts/material-parity/current-ancestry-audit/latest-report.json';
    const evidence=collectReviewedInputAuditInputs(JSON.parse(readFileSync(file)),{parityPath:file});
    assert.equal(evidence.binding.status,'bound',evidence.binding.error);
    const binding=JSON.parse(readFileSync('docs/material-reviewed-input-proposal-binding.json'));
    const transition=JSON.parse(readFileSync('docs/material-reviewed-input-transition-dry-run.json'));
    const byHash=new Map(transition.changes.map(c=>[c.originalCompleteRowSha256,c.projectedRow]));
    const previous=binding.groups.map(g=>g.originalCompleteRow);
    const current=binding.groups.map(g=>byHash.get(g.proposal.canonicalRowSha256));
    const result=independentlyReconstructBeforeReviewedInputs({discrepancies:current,reviewedInputs:evidence},{discrepancies:previous});
    assert.deepEqual(result.rows,previous);assert.equal(result.changes.length,134);
    assert.equal(result.changes.reduce((n,r)=>n+r.occurrences,0),3325);
    const changed=structuredClone(evidence);changed.observations.pop();
    assert.throws(()=>independentlyReconstructBeforeReviewedInputs({discrepancies:current,reviewedInputs:changed},{discrepancies:previous}));
    console.log(JSON.stringify({sourceGroups:134,sourceObservations:3325,sourceReplayed:true,canonicalFilesChanged:false}));`;
  const guard = `import fs from 'node:fs';import{syncBuiltinESMExports}from'node:module';
    fs.writeFileSync=()=>{throw Error('CHECK_MODE_ATTEMPTED_WRITE')};syncBuiltinESMExports();`;
  const output = execFileSync(process.execPath, ['--max-old-space-size=1536', '--import',
    'data:text/javascript;base64,' + Buffer.from(guard).toString('base64'), '--input-type=module', '-e', code],
  { encoding: 'utf8', maxBuffer: 1024 * 1024 });
  assert.deepEqual(JSON.parse(output), { sourceGroups: 134, sourceObservations: 3325,
    sourceReplayed: true, canonicalFilesChanged: false });
});
