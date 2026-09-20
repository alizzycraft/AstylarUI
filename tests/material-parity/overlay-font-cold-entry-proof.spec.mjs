import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';

const owner='scripts/audit-material-font-ownership-attribution.mjs';
const collector='scripts/audit-material-overlay-font-inputs.mjs';
const builder='tests/material-parity/input-equivalence-audit.mjs';
const reportFile='docs/material-overlay-font-inputs.json';
const eager='targets: Object.keys(overlayFontTargets),';
const deferred='get targets() { return Object.keys(overlayFontTargets); },';
const hash=x=>createHash('sha256').update(x).digest('hex');
const before=readFileSync(owner),source=before.toString('utf8');
// Normal entry must work without a loader. The hook below reinstates the old
// eager read only as a negative control in an isolated child process.
assert.equal(source.split(eager).length,1);
assert.equal(source.split(deferred).length,2);
const guard=`import fs from'node:fs';import{syncBuiltinESMExports}from'node:module';
fs.writeFileSync=()=>{throw Error('CHECK_MODE_ATTEMPTED_WRITE')};syncBuiltinESMExports();`;
const hook=`import assert from'node:assert/strict';import fs from'node:fs';
import{registerHooks,syncBuiltinESMExports}from'node:module';
fs.writeFileSync=()=>{throw Error('CHECK_MODE_ATTEMPTED_WRITE')};syncBuiltinESMExports();
let hits=0;registerHooks({load(url,context,nextLoad){const result=nextLoad(url,context);
if(url!==${JSON.stringify(pathToFileURL(path.resolve(owner)).href)})return result;
const source=typeof result.source==='string'?result.source:Buffer.from(result.source).toString('utf8');
assert.equal(source.split(${JSON.stringify(deferred)}).length,2);hits++;
return{...result,source:source.replace(${JSON.stringify(deferred)},${JSON.stringify(eager)})};}});
process.on('exit',()=>assert.equal(hits,1,'exactly one owning module was replaced in memory'));`;
const hookArgs=['--import','data:text/javascript;base64,'+Buffer.from(hook).toString('base64')];
const guardArgs=['--import','data:text/javascript;base64,'+Buffer.from(guard).toString('base64')];
const invoke=(args,reintroduceBug)=>spawnSync(process.execPath,['--max-old-space-size=1536',
  ...(reintroduceBug?hookArgs:guardArgs),...args],
  {encoding:'utf8',maxBuffer:1024*1024});
const status=(result,expected)=>{
  assert.equal(result.error,undefined);assert.equal(result.signal,null);
  assert.equal(result.status,expected,result.stderr);
};

test('normal cold entries succeed and reintroducing eager binding restores the original failure',()=>{
  for(const first of [collector,builder,owner]) for(const reintroduceBug of [false,true]) {
    const script=`await import(${JSON.stringify(pathToFileURL(path.resolve(first)).href)});console.log('imported');`;
    const result=invoke(['--input-type=module','-e',script],reintroduceBug);
    const fails=first===collector&&reintroduceBug;status(result,fails?1:0);
    if(fails)assert.match(result.stderr,/Cannot access 'overlayFontTargets' before initialization/);
    else assert.equal(result.stdout.trim(),'imported');
  }
  assert.deepEqual(readFileSync(owner),before);
});

test('actual direct CLI replays the full report without an import-order shim or loader replacement',()=>{
  const originalReport=readFileSync(reportFile);
  const negative=invoke([collector,'--check'],true);status(negative,1);
  assert.match(negative.stderr,/Cannot access 'overlayFontTargets' before initialization/);
  const fixed=invoke([collector,'--check'],false);status(fixed,0);
  const receipt=JSON.parse(fixed.stdout);
  assert.equal(receipt.observations,182);assert.equal(receipt.contextCases,91);
  assert.equal(receipt.reportSha256,hash(originalReport.toString('utf8').replaceAll('\r\n','\n')));
  assert.equal(receipt.canonicalAttributionChanged,false);
  assert.deepEqual(receipt.counts,{owners:{'bottom-sheet-overlay':25,'bottom-sheet-panel':25,
    'dialog-panel':32,'dialog-actions':32,'snack-bar-overlay':34,'snack-bar-surface':34},
    matchingPageSizes:94,differingPageSizes:88,scalarRuleGapsPreserved:59});
  assert.deepEqual(readFileSync(owner),before);assert.deepEqual(readFileSync(reportFile),originalReport);
  console.log(JSON.stringify({sourceRawSha256:hash(before),reportSha256:receipt.reportSha256,
    directCliNegativeControl:negative.status,directCliUnmodified:fixed.status,observations:182,contextCases:91,
    sourceChangedDuringTest:false,reportChanged:false,productionFixApplied:true}));
});
