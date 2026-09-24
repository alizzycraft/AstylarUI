import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { bindOwnerCaretCaptureSubset } from './owner-caret-audit-source-binding.mjs';
import { applyChipPaintRows } from './chip-position-inspection.mjs';

export const chipPaintAttribution = 'reviewed-chip-state-layer-substitution';
const hash = value => createHash('sha256').update(value).digest('hex');
const capture = { file: 'artifacts/material-parity/current-ancestry-audit/latest-report.json',
  sha256: 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a' };
const reviewSource = { file: 'docs/material-chip-paint-review.json',
  sha256: 'a942d0d83df0a19efdd84f88f691f5a35cdc0f6123597024242020d14671d3ef' };

function prepare(report) {
  const bytes = readFileSync(capture.file); assert.equal(hash(bytes), capture.sha256);
  assert.equal(bindOwnerCaretCaptureSubset(report, JSON.parse(bytes)).coverage.complete, true);
  const reviewBytes = readFileSync(reviewSource.file); assert.equal(hash(reviewBytes), reviewSource.sha256);
  const review = JSON.parse(reviewBytes);
  for (const source of review.sources) assert.equal(hash(readFileSync(source.file, 'utf8').replaceAll('\r\n', '\n')), source.sha256);
  assert.equal(review.groups.length, 10);
  for (const group of review.groups) for (const observation of group.reviewEvidence.observations) {
    const [r, a] = ['reference', 'astylar'].map(side => {
      const receipt = observation.inputTrees[side], bytes = readFileSync(receipt.file);
      assert.equal(hash(bytes), receipt.sha256); return JSON.parse(bytes);
    });
    const ref = r.nodes.find(n => n.attributes?.id === group.element);
    const layer = r.nodes.find(n => n.key === observation.referenceLayer);
    const ast = a.nodes.find(n => n.authored?.id === group.element);
    assert.equal(layer.parent, ref.key);
    assert.equal(layer.attributes.class, 'mat-mdc-chip-focus-overlay');
    assert.equal(r.styles[layer.style].position, 'absolute');
    assert.equal(r.styles[layer.style].backgroundColor, observation.layerInk);
    assert.equal(r.styles[layer.style].opacity, observation.layerOpacity);
    assert.ok(Number(observation.layerOpacity) > 0);
    assert.equal(ast.normalResolvedStyle.background, observation.candidateNormalBackground);
    assert.equal(ast.interactionResolvedStyle.background, observation.candidateInteractiveBackground);
    assert.notEqual(observation.candidateNormalBackground, observation.candidateInteractiveBackground);
  }
  return { schemaVersion: 1, binding: { status: 'bound', capture, reviewSource }, review,
    observations: review.groups.flatMap(group => group.reviewedCases.map(caseKey => ({ case: caseKey,
      family: group.family, element: group.element, property: group.property }))),
    inputEquivalent: false, renderingEquivalent: false };
}
export function collectChipPaintAuditInputs(report, { root = process.cwd(), parityPath } = {}) {
  const empty = { schemaVersion: 1, binding: { status: 'unbound' }, observations: [] };
  if (!parityPath) return empty;
  try {
    assert.equal(realpathSync(root), realpathSync(process.cwd()));
    const boundary = realpathSync(path.resolve(root, 'artifacts/material-parity'));
    const target = realpathSync(path.resolve(root, parityPath)), relative = path.relative(boundary, target);
    assert.ok(relative && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
    const supplied = JSON.parse(readFileSync(target));
    assert.equal(bindOwnerCaretCaptureSubset(report, supplied).coverage.complete, true);
    return prepare(supplied);
  } catch (error) { return { ...empty, binding: { status: 'invalid', error: String(error) } }; }
}
export function validateChipPaintAuditInputs(evidence) {
  try { assert.deepEqual(evidence, prepare(JSON.parse(readFileSync(capture.file)))); }
  catch (error) { return [`chip paint replay failed: ${error}`]; }
  return [];
}
export function validateChipPaintAuditClassifications(evidence, rows) {
  try {
    assert.equal(evidence.binding.status, 'bound');
    const matched = rows.filter(row => row.attribution === chipPaintAttribution);
    assert.equal(matched.length, 10);
    const originals = matched.map(row => {
      const original = structuredClone(row);
      assert.deepEqual(row.reviewEvidence.priorMetadata.map(p => p.field),
        ['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewedCases', 'reviewEvidence']);
      for (const prior of row.reviewEvidence.priorMetadata) {
        assert.equal(typeof prior.present, 'boolean');
        assert.deepEqual(Object.keys(prior).sort(), (prior.present ? ['field', 'present', 'value'] : ['field', 'present']).sort());
        if (prior.present) original[prior.field] = prior.value; else delete original[prior.field];
      }
      return original;
    });
    assert.deepEqual(applyChipPaintRows(originals, evidence.review), matched);
  } catch (error) { return [`chip paint coverage failed: ${error}`]; }
  return [];
}
export function applyChipPaintAuditRows(rows, evidence) {
  if (evidence?.binding?.status !== 'bound') {
    assert.ok(!rows.some(row => row.attribution === chipPaintAttribution)); return rows;
  }
  assert.deepEqual(validateChipPaintAuditInputs(evidence), []);
  const result = applyChipPaintRows(rows, evidence.review);
  assert.deepEqual(validateChipPaintAuditClassifications(evidence, result), []);
  return result;
}
