import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { buildMaterialInputAudit, validateMaterialInputAudit } from './input-equivalence-audit.mjs';
import { sliderBorderDefaultAttribution } from './slider-border-default-source-binding.mjs';
import { ownerInitialStyleAttribution } from './owner-initial-style-attribution.mjs';

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
  // Retain the historical complete-row guard. Only the 22 explicitly reviewed
  // later owner-stage attributions may be projected back to unresolved; every
  // other complete row must still reproduce the original frozen digest.
  const otherRows = audit.discrepancies.filter(row => !rows.includes(row));
  assert.equal(otherRows.length, 220);
  const shared = otherRows.filter(row => row.attribution === ownerInitialStyleAttribution);
  const common = ['overflowWrap', 'pointerEvents', 'textTransform', 'visibility', 'whiteSpace', 'wordBreak', 'wordSpacing'];
  const expected = ['slider-primary', 'slider-start', 'slider-visual'].flatMap(element =>
    (element === 'slider-visual' ? ['fontStyle', ...common] : common).map(property => [element, property]));
  assert.deepEqual(shared.map(row => [row.element, row.property]), expected);
  const oldRows = new Map(unbound.discrepancies.map(row => [signature(row), row]));
  assert.equal(oldRows.size, unbound.discrepancies.length);
  for (const row of shared) {
    assert.equal(row.classification, 'parity-harness-defect');
    assert.equal(row.astylar, undefined); assert.equal(row.occurrences, 2);
    assert.deepEqual(row.reviewedCases, ['static:slider@light/desktop', 'interaction:slider@light/desktop-dpr1/focus']);
    assert.equal(row.reviewEvidence.computedCandidateVerified, false);
    assert.equal(row.reviewEvidence.renderingEquivalent, false);
  }
  const historicalRows = otherRows.map(row => {
    if (row.attribution !== ownerInitialStyleAttribution) return row;
    const previous = oldRows.get(signature(row)); assert.equal(previous.attribution, 'unresolved'); return previous;
  });
  assert.equal(createHash('sha256').update(JSON.stringify(historicalRows)).digest('hex'),
    '4e1f09fc03af948aec7b2d1d927ee13c298b6439ceaa3bb0145a72122eb315ee');
  const errors = validateMaterialInputAudit(audit, { root, requireComplete: false });
  assert.ok(!errors.some(error => error.includes('slider border') || error.includes('owner initial-style')));
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
