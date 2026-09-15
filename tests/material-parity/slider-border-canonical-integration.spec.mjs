import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { buildMaterialInputAudit, validateMaterialInputAudit } from './input-equivalence-audit.mjs';
import { sliderBorderDefaultAttribution } from './slider-border-default-source-binding.mjs';

const prior = JSON.parse(readFileSync('docs/material-slider-border-defaults.json'));
const bytes = readFileSync(prior.capture.file);
assert.equal(createHash('sha256').update(bytes).digest('hex'), prior.capture.sha256);
const original = JSON.parse(bytes);

function withCapture(run) {
  const root = process.cwd();
  const folder = mkdtempSync(path.join(root, 'artifacts/material-parity/slider-border-canonical-'));
  try {
    const raw = {
      results: [structuredClone(original.results.find(e => e.family === 'slider'))],
      interactions: [structuredClone(original.interactions.find(e => e.family === 'slider'))],
    };
    const parityPath = path.join(folder, 'report.json');
    writeFileSync(parityPath, JSON.stringify(raw));
    run({ raw, root, options: { root, parityPath } });
  } finally {
    // Remove only the exact disposable folder created above; original trees stay untouched.
    rmSync(folder, { recursive: true, force: true });
  }
}

const signature = row => JSON.stringify([row.family, row.element, row.property, row.reference, row.astylar,
  row.occurrences, row.cases, row.states]);

test('slider border canonical integration preserves raw values and attributes only the twelve proven properties', () => withCapture(({ raw, root, options }) => {
  const snapshot = structuredClone(raw), unbound = buildMaterialInputAudit(raw, { root });
  const audit = buildMaterialInputAudit(raw, options);
  const rows = audit.discrepancies.filter(row => row.attribution === sliderBorderDefaultAttribution);
  assert.equal(rows.length, 24);
  assert.equal(rows.reduce((sum, row) => sum + row.occurrences, 0), 48);
  assert.ok(rows.some(row => row.property === 'borderTopWidth' && row.reference === '0' && row.astylar === '1px'));
  assert.ok(rows.some(row => row.property === 'borderTopStyle' && row.reference === 'none' && row.astylar === 'solid'));
  assert.ok(rows.some(row => row.property === 'borderTopLeftRadius' && row.reference === '0' && row.astylar === '4px'));
  assert.ok(rows.every(row => row.classification === 'intentional-documented-limitation' &&
    row.reviewEvidence.borderAuthoringEquivalent && !row.reviewEvidence.inputEquivalent &&
    !row.reviewEvidence.usedBoxParityVerified && !row.reviewEvidence.finalRasterVerified));
  assert.deepEqual(raw, snapshot);
  assert.deepEqual(audit.discrepancies.map(signature), unbound.discrepancies.map(signature));
  // Frozen before integration at 165ec49, using these same two original cases.
  // Compare complete unrelated rows, including their existing source-bound
  // classifications; a bound/unbound comparison alone would also change those.
  const otherRows = audit.discrepancies.filter(row => !rows.includes(row));
  assert.equal(otherRows.length, 220);
  assert.equal(createHash('sha256').update(JSON.stringify(otherRows)).digest('hex'),
    '4e1f09fc03af948aec7b2d1d927ee13c298b6439ceaa3bb0145a72122eb315ee');
  assert.ok(!validateMaterialInputAudit(audit, { root, requireComplete: false }).some(error => error.includes('slider border')));
}));

test('slider border canonical validation rejects missing sources altered scalars and fabricated parity', () => withCapture(({ raw, root, options }) => {
  const originalAudit = buildMaterialInputAudit(raw, options);
  assert.equal(originalAudit.sliderBorderDefaults?.observations?.length, 4);
  for (const mutate of [
    (report, row) => { delete report.sliderBorderDefaults; },
    (report, row) => { report.sliderBorderDefaults.observations.pop(); },
    (report, row) => { report.sliderBorderDefaults.captures = []; },
    (report, row) => { report.discrepancies = report.discrepancies.filter(other => other !== row); },
    (report, row) => { report.discrepancies.push(structuredClone(row)); },
    (report, row) => { row.attribution = 'unresolved'; },
    (report, row) => { row.reference = '1px'; },
    (report, row) => { row.classification = 'equivalent-representation'; },
    (report, row) => { row.reviewEvidence.usedBoxParityVerified = true; },
    (report, row) => { row.reviewEvidence.inputEquivalent = true; },
  ]) {
    const report = structuredClone(originalAudit);
    mutate(report, report.discrepancies.find(row => row.attribution === sliderBorderDefaultAttribution));
    assert.ok(validateMaterialInputAudit(report, { root, requireComplete: false }).some(error => error.includes('slider border')));
  }
}));
