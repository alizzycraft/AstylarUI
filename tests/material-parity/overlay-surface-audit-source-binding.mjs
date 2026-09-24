import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { bindOwnerCaretCaptureSubset } from './owner-caret-audit-source-binding.mjs';
import { collectTooltipPositionComposition } from './tooltip-position-composition.mjs';
import { proveSnackbarSurfaceRequests, proveTooltipSizingRequests, applyOverlaySurfaceRows,
  snackbarSurfaceValues } from './overlay-surface-review.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export const overlaySurfaceAttributions = ['reviewed-snackbar-surface-input-substitution', 'reviewed-tooltip-sizing-constraint-omission'];
const capture = { file: 'artifacts/material-parity/current-ancestry-audit/latest-report.json',
  sha256: 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a' };
const reviewSource = { file: 'docs/material-overlay-surface-review.json',
  sha256: 'b71a89b5ad9fdb23e8405c3e414f6807efb7703e4480eda8f9939eb4494e0cfd' };
const readBound = receipt => {
  const bytes = readFileSync(receipt.file); assert.equal(hash(bytes), receipt.sha256);
  return JSON.parse(bytes);
};

function prepare(report) {
  assert.equal(bindOwnerCaretCaptureSubset(report, readBound(capture)).coverage.complete, true);
  const review = readBound(reviewSource);
  for (const source of review.sources)
    assert.equal(hash(readFileSync(source.file, 'utf8').replaceAll('\r\n', '\n')), source.sha256);
  const population = readBound({ file: 'docs/material-position-input-population.json',
    sha256: '71ed7689534232fe8c167532455abbf9510e89ae69b4c918d9dc7f40d3d346ff' });
  const snacks = population.groups.find(g => g.element === 'snack-bar-overlay').observations;
  const tooltips = collectTooltipPositionComposition().observations;
  assert.equal(snacks.length, 34); assert.equal(tooltips.length, 18);
  const candidates = new Map();
  for (const o of snacks) {
    proveSnackbarSurfaceRequests(readBound(o.inputTrees.reference), readBound(o.inputTrees.astylar));
  }
  for (const o of tooltips) {
    const r = readBound(o.inputTrees.reference), a = readBound(o.inputTrees.astylar);
    for (const property of proveTooltipSizingRequests(o, r, a)) {
      const value = r.styles[r.nodes.find(n => n.key === o.paths.reference[0].key).style][property];
      const key = JSON.stringify([property, value]);
      if (!candidates.has(key)) candidates.set(key, []);
      candidates.get(key).push(o);
    }
  }
  assert.equal(review.groups.length, 13); let observations = 0;
  for (const group of review.groups) {
    const snack = group.family === 'snack-bar';
    assert.ok(snack || group.family === 'tooltip');
    assert.equal(group.element, snack ? 'snack-bar-surface' : 'tooltip-popup');
    assert.equal(group.attribution, overlaySurfaceAttributions[snack ? 0 : 1]);
    const expected = snack ? snacks : candidates.get(JSON.stringify([group.property, group.reference]));
    assert.ok(expected);
    if (snack) {
      const values = snackbarSurfaceValues[group.property]; assert.ok(values);
      assert.equal(group.reference, values[0]); assert.equal(Object.hasOwn(group, 'astylar'), values.length === 2);
      if (values.length === 2) assert.equal(group.astylar, values[1]);
    } else assert.equal(Object.hasOwn(group, 'astylar'), false);
    assert.deepEqual(group.reviewEvidence.observations, expected.map(o => ({ case: o.case, inputTrees: o.inputTrees })));
    assert.deepEqual(group.reviewedCases, expected.map(o => o.case));
    assert.equal(group.occurrences, expected.length); observations += expected.length;
  }
  assert.equal(observations, 344);
  return { schemaVersion: 1, binding: { status: 'bound', capture, reviewSource }, review,
    observations: review.groups.flatMap(g => g.reviewedCases.map(caseKey => ({ case: caseKey,
      family: g.family, element: g.element, property: g.property }))),
    inputEquivalent: false, renderingEquivalent: false };
}

export function collectOverlaySurfaceAuditInputs(report, { root = process.cwd(), parityPath } = {}) {
  const empty = { schemaVersion: 1, binding: { status: 'unbound' }, observations: [] };
  if (!parityPath) return empty;
  try {
    assert.equal(realpathSync(root), realpathSync(process.cwd()));
    const boundary = realpathSync(path.resolve(root, 'artifacts/material-parity'));
    const target = realpathSync(path.resolve(root, parityPath)), relative = path.relative(boundary, target);
    assert.ok(relative && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
    assert.equal(bindOwnerCaretCaptureSubset(report, JSON.parse(readFileSync(target))).coverage.complete, true);
    return prepare(report);
  } catch (error) { return { ...empty, binding: { status: 'invalid', error: String(error) } }; }
}
export function validateOverlaySurfaceAuditInputs(evidence) {
  try { assert.deepEqual(evidence, prepare(readBound(capture))); }
  catch (error) { return [`overlay surface replay failed: ${error}`]; }
  return [];
}
export function validateOverlaySurfaceAuditClassifications(evidence, rows) {
  try {
    assert.equal(evidence.binding.status, 'bound');
    const matched = rows.filter(row => overlaySurfaceAttributions.includes(row.attribution));
    assert.equal(matched.length, 13);
    const originals = matched.map(row => {
      const original = structuredClone(row);
      assert.deepEqual(row.reviewEvidence.priorMetadata.map(p => p.field),
        ['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']);
      for (const p of row.reviewEvidence.priorMetadata) {
        assert.equal(typeof p.present, 'boolean');
        assert.deepEqual(Object.keys(p).sort(), (p.present ? ['field', 'present', 'value'] : ['field', 'present']).sort());
        if (p.present) original[p.field] = p.value; else delete original[p.field];
      }
      return original;
    });
    assert.deepEqual(applyOverlaySurfaceRows(originals, evidence.review), matched);
  } catch (error) { return [`overlay surface coverage failed: ${error}`]; }
  return [];
}
export function applyOverlaySurfaceAuditRows(rows, evidence) {
  if (evidence?.binding?.status !== 'bound') {
    assert.ok(!rows.some(row => overlaySurfaceAttributions.includes(row.attribution))); return rows;
  }
  assert.deepEqual(validateOverlaySurfaceAuditInputs(evidence), []);
  const result = applyOverlaySurfaceRows(rows, evidence.review);
  assert.deepEqual(validateOverlaySurfaceAuditClassifications(evidence, result), []);
  return result;
}
