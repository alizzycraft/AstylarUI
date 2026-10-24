import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { sourceAuditDefinitions } from './input-equivalence-policy.mjs';

const hash=b=>createHash('sha256').update(b).digest('hex');
const read=receipt=>{const b=readFileSync(receipt.file);assert.equal(hash(b),receipt.sha256);return b;};
test('All eight retained Select focus contexts expose readonly mutation before application selection',()=>{
  const r=JSON.parse(read({file:'artifacts/material-parity/select-readonly-focus-contexts-unique-outputs-20261025/latest-report.json',sha256:'06ff959a06ad3f85d0e9014079f4de98db904cd58039175d00187da82937d35f'}));
  read(r.capture.checkpointManifest);
  assert.deepEqual(r.results.map(row=>[row.profile,row.viewport.deviceScaleFactor]),['light','dark','contrast','custom'].flatMap(p=>[1,2].map(d=>[p,d])));
  for(const row of r.results){
    assert.equal(row.family,'select');assert.equal(row.state,'focus');
    for(const side of ['reference','astylar']){
      const result=row[side],trial=result.readonlyTrial;
      read(result.inputTree);assert.deepEqual(result.runtime.errors,[]);
      assert.equal(trial.action,'supplementary-x-after-configured-focus');assert.equal(trial.before.focused,true);
      assert.ok(trial.keys.some(k=>k.key==='x'&&k.trusted&&k.id===trial.before.id));
    }
    assert.equal(row.reference.readonlyTrial.after.text,'Team');assert.equal(row.reference.readonlyTrial.after.focused,true);
    const trial=row.astylar.readonlyTrial;assert.equal(trial.before.readonly,true);assert.equal(trial.before.disabled,false);assert.equal(trial.before.value,'Team');
    assert.ok(trial.after.events.some(e=>e.type==='input'&&e.value==='xTeam'));
    assert.equal(trial.after.value,'Solo');assert.equal(trial.after.focused,false);
  }
  assert.equal(sourceAuditDefinitions.find(f=>f.id==='core-readonly-text-keyboard-defaults-mutate-value')?.classification,'confirmed-core-renderer-defect');
});
