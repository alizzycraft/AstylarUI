import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import test from 'node:test';
import { readFieldHostFlowProof, buildFieldHostFlowReport } from '../../scripts/audit-material-field-host-flow.mjs';

const log = readFileSync('artifacts/material-parity/field-host-flow-input-audit/test.log', 'utf8');
test('repeated field-flow proof retains the exact two failing tests and all twelve state observations', () => {
  const report = buildFieldHostFlowReport();
  assert.equal(report.cases.length, 12); assert.equal(report.rawRecords, 24);
  assert.equal(report.mismatches.length, 12);
  assert.equal(report.rendererDefectProven, true); assert.equal(report.materialInputEquivalent, false);
  assert.equal(report.originalCaseCausalTraceComplete, false); assert.equal(report.originalObservationsReclassified, 0);
  assert.ok(isDeepStrictEqual(report, JSON.parse(readFileSync('docs/material-field-host-flow-public-proof.json'))));
});
test('flow evidence rejects input compensation, missing cases, changed observations and concealed or extra failures', () => {
  const proof = readFieldHostFlowProof(log), rows = proof.cases;
  const failures = proof.mismatches.map(m => `${m.case}/${m.element}/${m.property}: Expected ${m.error} to be less than 0.5.`).join('\n');
  const encode = values => values.map(r => `INFO: 'MATERIAL_FIELD_HOST_FLOW_PROOF', '${JSON.stringify(r)}'`).join('\n') + `\n${failures}\nTOTAL: 2 FAILED, 2 SUCCESS`;
  assert.throws(() => readFieldHostFlowProof(encode(rows.slice(1))));
  assert.throws(() => readFieldHostFlowProof(encode(rows).replace('2 FAILED, 2 SUCCESS', '4 SUCCESS')));
  assert.throws(() => readFieldHostFlowProof(encode(rows).replace(failures, '')));
  assert.throws(() => readFieldHostFlowProof(encode(rows) + '\nExpected diagnostics to be empty.'));
  assert.throws(() => readFieldHostFlowProof(encode(rows) + '\nERROR'));
  const mutations = [
    r => { r.css += '\n#flow-host{display:flex}'; },
    r => { r.site.styles[3].height = '76px'; },
    r => { r.site.styles[4].position = 'absolute'; },
    r => { r.site.root.children[0].children[0].children[0].children.reverse(); },
    r => { r.measurements[1].stages[0].height = '76px'; },
    r => { r.measurements[1].reference.height += 1; },
    r => { r.measurements[2].actual.height += 1; },
    r => { r.measurements[1].browserStyle.height = '340px'; },
    r => { r.subscriptHeight += 1; },
    r => { r.renderSize[0] = 500; },
    r => { r.dpr = 2; },
    r => { r.scope = 'Material rendering parity'; },
  ];
  mutations.forEach((mutate, index) => {
    const copy = structuredClone(rows); mutate(copy[0]);
    assert.throws(() => readFieldHostFlowProof(encode(copy)), `mutation ${index}`);
    assert.throws(() => readFieldHostFlowProof(encode([...rows, copy[0]])), `duplicate ${index}`);
  });
  const corrected = structuredClone(rows);
  const inline = corrected.find(r => r.display === 'inline-flex');
  inline.measurements[1].actual.height = inline.measurements[1].reference.height;
  assert.throws(() => readFieldHostFlowProof(encode(corrected)), 'a future fix requires a new receipt, not false preservation of failing evidence');
});
