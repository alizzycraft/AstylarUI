// Exact module executed through `node --input-type=module` stdin after cold99596 exited0.
// Kept as command provenance,not a repeatable import against an already advanced pointer.
import fs from 'node:fs';import assert from 'node:assert/strict';import{importFindings,verifyFindings}from'./scripts/audit-findings-store.mjs';
const destination='artifacts/material-parity/working-audit',candidateRoot=destination+'/candidate-validation',candidate=JSON.parse(fs.readFileSync(candidateRoot+'/current.json'));
assert.equal(candidate.generation,'7fa7ca3503d018f59009dd4dfdcd86213d1af3f5d31bc089d3d201f42c0ae802');assert.equal(candidate.indexSha256,'77af769e6e8a0054f6247bc3ffc9919e546e55702bb8abda97619d02847a20f8');
const prior=JSON.parse(fs.readFileSync(destination+'/current.json'));assert.equal(prior.generation,'8d6c596421e6b96018328199aea28981b85d15921c611fe2b1837b3b412a976f');
verifyFindings(candidateRoot+'/'+candidate.generation,candidate.indexSha256);const target=destination+'/'+candidate.generation;assert.equal(fs.existsSync(target),false);fs.cpSync(candidateRoot+'/'+candidate.generation,target,{recursive:true,force:false,errorOnExist:true});
const result=await importFindings('docs',destination);assert.equal(result.reused,true);const pointer=JSON.parse(fs.readFileSync(destination+'/current.json'));assert.deepEqual(pointer,candidate);const verified=verifyFindings(target,candidate.indexSha256);
console.log(JSON.stringify({producerArgs:process.execArgv,prior,result,pointer,counts:verified.counts,allShardsVerified:true,candidateAndMainExact:true,verifiedCandidateIndexReusedWithoutFullDecode:true}));
