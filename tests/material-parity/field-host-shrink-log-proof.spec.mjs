import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import test from 'node:test';
import { readFieldHostShrinkProof, buildFieldHostShrinkReport } from '../../scripts/audit-material-field-host-shrink.mjs';

const log = readFileSync('artifacts/material-parity/field-host-shrink-input-audit/test.log', 'utf8');
test('all twelve public shrink control cases replay, including input identity, geometry and provenance', () => {
  const proof = readFieldHostShrinkProof(log);
  assert.equal(proof.cases.length, 12);
  assert.equal(proof.rawRecords, 24);
  const report = buildFieldHostShrinkReport();
  assert.ok(isDeepStrictEqual(report, JSON.parse(readFileSync('docs/material-field-host-shrink-public-proof.json'))));
  assert.equal(report.materialInputEquivalent, false);
  assert.equal(report.originalCaseCausalTraceComplete, false);
  assert.equal(report.rendererDefectProven, false);
});
test('shrink proof rejects missing/contradictory cases, divergent CSS, input correction and incorrect measurements', () => {
  const rows = readFieldHostShrinkProof(log).cases;
  const encode = values => values.map(r => `INFO: 'MATERIAL_FIELD_HOST_SHRINK_PROOF', '${JSON.stringify(r)}'`).join('\n') + '\nTOTAL: 12 SUCCESS';
  assert.throws(() => readFieldHostShrinkProof(encode(rows.slice(1))));
  assert.throws(() => readFieldHostShrinkProof(encode(rows).replace('12 SUCCESS', '11 SUCCESS')));
  assert.throws(() => readFieldHostShrinkProof(encode(rows) + '\nERROR'));
  const mutations = [
    r => { r.css += '\n#shrink-host{height:56px}'; },
    r => { r.site.styles[2].height = '56px'; },
    r => { r.stages[1].height = '56px'; },
    r => { r.measurements[1].actual.height += 2; },
    r => { r.measurements[1].expected.height += 2; },
    r => { r.measurements[1].reference.height += 2; },
    r => { r.measurements[1].browserStyle.flexShrink = '9'; },
    r => { r.site.root.children[0].children[0].children = []; },
    r => { r.renderSize[0] = 500; },
    r => { r.dpr = 2; },
    r => { r.scope = 'full Material equivalence'; },
  ];
  mutations.forEach((mutate, index) => {
    const copy = structuredClone(rows); mutate(copy[0]);
    assert.throws(() => readFieldHostShrinkProof(encode(copy)), `mutation ${index}`);
    assert.throws(() => readFieldHostShrinkProof(encode([...rows, copy[0]])), `contradictory duplicate ${index}`);
  });
});
