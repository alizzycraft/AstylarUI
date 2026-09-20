import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { verifyFollowupSourceReceipt } from './followup-input-source-replay.mjs';

test('followup source replay freshly validates all four proofs without writes or claiming a new frozen join', () => {
  const guard = `import fs from 'node:fs';import{syncBuiltinESMExports}from'node:module';
    fs.writeFileSync=()=>{throw Error('CHECK_MODE_ATTEMPTED_WRITE')};syncBuiltinESMExports();`;
  const code = `import assert from 'node:assert/strict';
    import{replayFollowupInputSourcePlans}from'./tests/material-parity/followup-input-source-replay.mjs';
    const r=replayFollowupInputSourcePlans();
    assert.equal(r.sourceProofsReplayed,true);assert.equal(r.frozenCanonicalJoinReplayedNow,false);
    assert.equal(r.original.results.length+r.original.interactions.length,2311);
    assert.equal(r.binding.groups.length,66);assert.equal(r.binding.proposedObservations,2640);
    assert.equal(r.binding.canonicalIntegration,false);
    assert.equal(r.normalize({fontFamily:'Roboto, Arial, sans-serif'}).fontFamily,'roboto,arial,sans-serif');
    assert.equal(r.normalize({color:'color(srgb .5 0 1)'}).color,'rgba(127.5,0,255,1)');
    assert.notEqual(r.normalizationContracts.current.sha256,r.normalizationContracts.historicalPlans.sha256);
    const ds=Object.values(r.descriptors);
    assert.equal(ds.reduce((n,d)=>n+d.proposedGroups,0),66);
    assert.equal(ds.reduce((n,d)=>n+d.proposedObservations,0),2640);
    assert.ok(ds.every(d=>d.freshSourceProofReplayed&&!d.frozenCanonicalJoinReplayedNow));
    console.log(JSON.stringify({groups:66,observations:2640,sourceProofs:ds.length,canonicalIntegration:false}));`;
  const result = JSON.parse(execFileSync(process.execPath, ['--max-old-space-size=1536', '--import',
    'data:text/javascript;base64,' + Buffer.from(guard).toString('base64'), '--input-type=module', '-e', code],
  { encoding: 'utf8', maxBuffer: 1024 * 1024 }));
  assert.deepEqual(result, { groups: 66, observations: 2640, sourceProofs: 4, canonicalIntegration: false });
});

function fixture(kind = 'controlFontStyle') {
  const binding = JSON.parse(readFileSync('docs/material-followup-input-proposal-binding.json'));
  const plan = JSON.parse(readFileSync(binding.plans[kind].file));
  const proofBytes = readFileSync((plan.proof ?? plan.sourceProof).file, 'utf8').replaceAll('\r\n', '\n');
  return { kind, binding, plan, proof: JSON.parse(proofBytes), proofBytes };
}
const verify = f => verifyFollowupSourceReceipt(f.kind, f.binding, f.plan, f.proof, f.proofBytes);

test('receipt checking preserves bounded claims and rejects changed plans, sources, and unsupported acceptance', () => {
  for (const kind of ['leafFamily', 'leafWeightTracking', 'expansionOwner', 'controlFontStyle']) {
    const f = fixture(kind), r = verify(f);
    assert.equal(r.freshSourceProofReplayed, true); assert.equal(r.frozenCanonicalJoinReplayedNow, false);
    assert.equal(r.proposedObservations, f.plan.proposedObservations);
  }
  const changes = [
    f => { f.kind = 'invented'; }, f => { f.binding.kind = 'unverified'; },
    f => { f.binding.sourceProofsReplayed = false; }, f => { f.binding.originalCanonicalJoinsReplayed = false; },
    f => { f.binding.canonicalIntegration = true; }, f => { f.binding.canonicalAttributionChanged = true; },
    f => { f.binding.completeAuditAccepted = true; }, f => { f.binding.inputEquivalent = true; },
    f => { f.binding.renderingEquivalent = true; },
    f => { f.binding.plans[f.kind].sourceProofsReplayed = false; },
    f => { f.binding.plans[f.kind].originalCanonicalJoinReplayed = false; },
    f => { f.binding.plans[f.kind].sha256 = '0'.repeat(64); },
    f => { f.plan.productionNormalization.sha256 = '0'.repeat(64); },
    f => { f.plan.originalCapture.sha256 = '0'.repeat(64); },
    f => { f.plan.proposed.pop(); },
    f => { f.plan.proposed[0].observations[0].proofSha256 = '0'.repeat(64); },
    f => { f.plan.proposed[0].renderingEquivalent = true; },
    f => { f.proof.originalCapture.sha256 = '0'.repeat(64); },
    f => { f.proof.findings[0].originalInputSha256 = '0'.repeat(64); },
    f => { f.proof.findings[0].proof.translatedReset.fontStyle = 'normal'; },
    f => { f.proof.findings.pop(); }, f => { f.proofBytes += '\n'; },
    f => { f.binding.groups.find(g => g.kind === f.kind).proposal.justification = 'invented'; },
  ];
  for (const [i, change] of changes.entries()) {
    const f = fixture(); change(f); assert.throws(() => verify(f), `source receipt mutation ${i}`);
  }
  assert.equal(changes.length, 23);
});

test('source replay rejects changed capture bytes before granting any classifications', () => {
  const code = `import assert from 'node:assert/strict';import fs from 'node:fs';
    import{syncBuiltinESMExports}from'node:module';
    const read=fs.readFileSync;
    fs.readFileSync=(file,...args)=>{
      const out=read(file,...args);
      return String(file).replaceAll('\\\\','/').endsWith('current-ancestry-audit/latest-report.json')
        ? Buffer.concat([out,Buffer.from(' ')]) : out;
    };syncBuiltinESMExports();
    const{replayFollowupInputSourcePlans}=await import('./tests/material-parity/followup-input-source-replay.mjs');
    assert.throws(()=>replayFollowupInputSourcePlans());console.log('changed capture rejected');`;
  assert.match(execFileSync(process.execPath, ['--input-type=module', '-e', code],
    { encoding: 'utf8', maxBuffer: 1024 * 1024 }), /changed capture rejected/);
});
