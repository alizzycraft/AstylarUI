import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const hash = b => createHash('sha256').update(b).digest('hex');
test('Public block alignment reduction preserves wrong default separately from explicit center failure', () => {
  const root = 'artifacts/material-parity/public-block-align-content-20261025/';
  const bytes = readFileSync(root+'latest-report.json');
  assert.equal(hash(bytes),'e13cac751581f025897691bd8279e23fd2b0068f64b8f31e8d222dff8c1519c5');
  const report = JSON.parse(bytes);
  assert.equal(hash(readFileSync(report.producer.file)),report.producer.sha256);
  assert.equal(hash(readFileSync(root+'audit.js')),report.bundleSha256);
  assert.equal(hash(readFileSync(root+'input.mjs')),report.inputSha256);
  const source = readFileSync(root+'input.mjs','utf8');
  assert.match(source,/import \{Astylar\} from 'astylarui'/);
  assert.doesNotMatch(source,/from ['"]astylarui\//);
  for (const receipt of report.inputs) assert.equal(hash(readFileSync(receipt.file)),receipt.sha256);
  assert.deepEqual(report.errors,[]);
  const validate = results => {
    assert.deepEqual(results.map(r=>[r.dpr,r.value]),[1,2].flatMap(d=>['omitted','normal','stretch','center'].map(v=>[d,v])));
    for (const row of results) {
      assert.deepEqual(row.reference.site,row.astylar.site);
      for (const side of ['reference','astylar']) {
        assert.equal(row[side].inputUnchanged,true);assert.deepEqual(row[side].errors,[]);
        assert.ok(row[side].assets.some(a=>a.sha256===report.bundleSha256));
        assert.equal(row[side].site.styles[1].display,'block');
        assert.equal(row[side].site.styles[1].position,'absolute');
        assert.equal(row[side].site.styles[1].alignContent,row.value==='omitted'?undefined:row.value);
      }
      assert.equal(row.reference.alignContent,row.value==='omitted'?'normal':row.value);
      assert.equal(row.astylar.alignContent,row.value==='omitted'?'stretch':row.value);
      const offset = side => row[side].bounds.child.top-row[side].bounds.parent.top;
      assert.ok(Math.abs(offset('reference')-(row.value==='center'?55:20))<.01);
      assert.ok(Math.abs(offset('astylar')-20)<.01);
      if(row.value==='center')assert.ok(Math.abs(offset('astylar')-offset('reference')+35)<.01);
    }
  };
  validate(report.results);
  const unequal=structuredClone(report.results);unequal[0].astylar.site.styles[1].alignContent='normal';assert.throws(()=>validate(unequal));
  const hidden=structuredClone(report.results);hidden.pop();assert.throws(()=>validate(hidden));
  // This test conserves a documented failure;passing it is NOT parity acceptance.
  assert.match(report.boundary,/Not local pixel\/raster/);
});
