import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, unlinkSync, rmdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { buildMaterialInputAudit } from '../tests/material-parity/input-equivalence-audit.mjs';
import { sliderBorderDefaultAttribution } from '../tests/material-parity/slider-border-default-source-binding.mjs';
import { ownerInitialStyleAttribution } from '../tests/material-parity/owner-initial-style-attribution.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const sourceFile = 'tests/material-parity/input-equivalence-audit.mjs';
const inventory = source => {
  const start = source.indexOf('function sourceFingerprints(root) {'); assert.ok(start >= 0);
  const end = source.indexOf('\nfunction focusedProofInventory', start); assert.ok(end > start);
  return [...source.slice(start, end).matchAll(/^\s+'([^']+)',?\r?$/gm)].map(match => match[1]);
};
const beforeSources = inventory(execFileSync('git', ['show', `02a62c0:${sourceFile}`], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 }));
const afterSources = inventory(readFileSync(sourceFile, 'utf8'));
const addedSources = afterSources.filter(file => !beforeSources.includes(file));
assert.equal(beforeSources.length, 148); assert.equal(afterSources.length, 156);
assert.equal(new Set(afterSources).size, 156);
assert.deepEqual(beforeSources.filter(file => !afterSources.includes(file)), []);
assert.deepEqual(addedSources, ['tests/material-parity/owner-initial-style-attribution.mjs',
  'tests/material-parity/owner-initial-style-attribution.spec.mjs', 'tests/material-parity/owner-initial-style-baseline.mjs',
  'tests/material-parity/owner-initial-style-survey.mjs', 'tests/material-parity/owner-initial-style-survey.spec.mjs',
  'tests/material-parity/owner-initial-style-membership.mjs', 'tests/material-parity/owner-initial-style-membership.spec.mjs',
  'tests/material-parity/owner-initial-style-mappings.spec.mjs']);
const prior = JSON.parse(readFileSync('docs/material-slider-border-defaults.json'));
const bytes = readFileSync(prior.capture.file); assert.equal(hash(bytes), prior.capture.sha256);
const original = JSON.parse(bytes), root = process.cwd();
const folder = mkdtempSync(path.join(root, 'artifacts/material-parity/slider-attribution-diagnostic-'));
const parityPath = path.join(folder, 'report.json');
try {
  const raw = { results: [structuredClone(original.results.find(e => e.family === 'slider'))],
    interactions: [structuredClone(original.interactions.find(e => e.family === 'slider'))] };
  writeFileSync(parityPath, JSON.stringify(raw), { flag: 'wx' });
  const unbound = buildMaterialInputAudit(raw, { root }), bound = buildMaterialInputAudit(raw, { root, parityPath });
  const signature = row => JSON.stringify([row.family, row.element, row.property, row.reference, row.astylar,
    row.occurrences, row.cases, row.states]);
  assert.deepEqual(bound.discrepancies.map(signature), unbound.discrepancies.map(signature));
  const before = new Map(unbound.discrepancies.map(row => [signature(row), row]));
  assert.equal(before.size, unbound.discrepancies.length);
  const other = bound.discrepancies.filter(row => row.attribution !== sliderBorderDefaultAttribution);
  const replacements = other.filter(row => row.attribution === ownerInitialStyleAttribution);
  const common = ['overflowWrap', 'pointerEvents', 'textTransform', 'visibility', 'whiteSpace', 'wordBreak', 'wordSpacing'];
  const expected = ['slider-primary', 'slider-start', 'slider-visual'].flatMap(element =>
    (element === 'slider-visual' ? ['fontStyle', ...common] : common).map(property => [element, property]));
  assert.deepEqual(replacements.map(row => [row.element, row.property]), expected);
  for (const row of replacements) {
    assert.equal(row.classification, 'parity-harness-defect');
    assert.equal(row.astylar, undefined); assert.equal(row.occurrences, 2);
    assert.deepEqual(row.reviewedCases, ['static:slider@light/desktop', 'interaction:slider@light/desktop-dpr1/focus']);
    assert.equal(row.reviewEvidence.computedCandidateVerified, false);
    assert.equal(row.reviewEvidence.renderingEquivalent, false);
  }
  const restored = other.map(row => {
    if (row.attribution !== ownerInitialStyleAttribution) return row;
    const previous = before.get(signature(row)); assert.equal(previous.attribution, 'unresolved'); return previous;
  });
  assert.equal(other.length, 220);
  assert.equal(hash(JSON.stringify(restored)), '4e1f09fc03af948aec7b2d1d927ee13c298b6439ceaa3bb0145a72122eb315ee',
    'Restoring only the new owner attributions must recover the untouched historical guard');
  console.log(JSON.stringify({ otherRows: other.length, newOwnerRows: replacements.length,
    sourceMembership: { before: beforeSources.length, after: afterSources.length, removed: [], added: addedSources },
    historicalHash: hash(JSON.stringify(restored)), currentHash: hash(JSON.stringify(other)),
    replacements: replacements.map(row => ({ element: row.element, property: row.property,
      reference: row.reference, occurrences: row.occurrences, reviewedCases: row.reviewedCases,
      classification: row.classification, attribution: row.attribution })) }, null, 2));
} finally {
  unlinkSync(parityPath); rmdirSync(folder);
}
