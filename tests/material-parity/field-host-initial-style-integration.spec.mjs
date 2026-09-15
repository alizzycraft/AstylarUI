import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { buildMaterialInputAudit, validateMaterialInputAudit } from './input-equivalence-audit.mjs';
import { fieldHostInitialStyleAttribution, fieldHostInitialStyleValues } from './field-host-initial-style-evidence.mjs';

const index = JSON.parse(readFileSync('docs/material-field-host-initial-style-audit.json'));
const bytes = readFileSync(index.capture.file);
const hash = value => createHash('sha256').update(value).digest('hex');
assert.equal(hash(bytes), index.capture.sha256);
const original = JSON.parse(bytes);
const raw = { results: [original.results.find(e => e.family === 'autocomplete')],
  interactions: [original.interactions.find(e => e.family === 'autocomplete')] };
assert.ok(raw.results[0]); assert.ok(raw.interactions[0]);
const audit = buildMaterialInputAudit(raw);
const eligible = row => row.family === 'autocomplete' && row.element === 'autocomplete-primary' && Object.hasOwn(fieldHostInitialStyleValues, row.property);
const values = rows => rows.map(r => [r.family, r.element, r.property, r.reference, r.astylar, r.occurrences, r.cases, r.states]);

test('field host initial-style integration preserves scalar values and every unrelated row', t => {
  const rows = audit.discrepancies.filter(eligible);
  assert.equal(rows.length, 8);
  assert.equal(rows.reduce((n, row) => n + row.occurrences, 0), 16);
  // Frozen at ac91772 before canonical integration, from these original cases.
  assert.equal(hash(JSON.stringify(values(audit.discrepancies))), '8c66989fb7abe305d84feb3abdb97d64cf17869e2ed187da6b95d06e1f26186f');
  assert.equal(audit.discrepancies.filter(r => !eligible(r)).length, 105);
  assert.equal(hash(JSON.stringify(audit.discrepancies.filter(r => !eligible(r)))), 'aa3a0af27874b69dd8c54a92a4bf972ff4d34e599b60c31b1cb44d530c1b6d4e');
  t.diagnostic(JSON.stringify({ scalarSha256: hash(JSON.stringify(values(audit.discrepancies))),
    otherRows: audit.discrepancies.filter(r => !eligible(r)).length,
    otherRowsSha256: hash(JSON.stringify(audit.discrepancies.filter(r => !eligible(r)))) }));
  assert.ok(rows.every(row => row.attribution === fieldHostInitialStyleAttribution));
  assert.equal(audit.fieldHostInitialStyleInputs.length, 16);
  for (const row of rows) {
    assert.equal(row.classification, 'parity-harness-defect');
    assert.equal(row.astylar, undefined);
    assert.equal(row.reviewedCases.length, row.occurrences);
    assert.equal(row.reviewEvidence.computedCandidateVerified, false);
    assert.equal(row.reviewEvidence.finalRasterVerified, false);
  }
  assert.deepEqual(validateMaterialInputAudit(audit, { requireComplete: false }).filter(e => e.includes('field host initial-style')), []);
});

test('field host initial-style integration rejects removed rows, altered evidence and false equivalence', () => {
  assert.equal(audit.fieldHostInitialStyleInputs?.length, 16);
  for (const mutate of [
    a => { delete a.fieldHostInitialStyleInputs; },
    a => { a.fieldHostInitialStyleInputs.pop(); },
    a => { a.fieldHostInitialStyleInputs[0].computedCandidateVerified = true; },
    a => { a.fieldHostInitialStyleInputs[0].candidatePath[2].normal.visibility = 'visible'; },
    a => { a.discrepancies = a.discrepancies.filter(r => r !== a.discrepancies.find(eligible)); },
    a => { a.discrepancies.push(structuredClone(a.discrepancies.find(eligible))); },
    a => { a.discrepancies.find(eligible).attribution = 'unresolved'; },
    a => { a.discrepancies.find(eligible).classification = 'equivalent-representation'; },
    a => { a.discrepancies.find(eligible).reviewedCases = []; },
    a => { a.discrepancies.find(eligible).reference = 'changed'; },
    a => { a.discrepancies.find(eligible).cases = []; },
    a => { a.discrepancies.find(eligible).states = []; },
  ]) {
    const changed = structuredClone(audit); mutate(changed);
    assert.ok(validateMaterialInputAudit(changed, { requireComplete: false }).some(e => e.includes('field host initial-style')));
  }
});
