import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { bindOwnerCaretCaptureSubset } from './owner-caret-audit-source-binding.mjs';
import { collectVisibilityObservationStages, visibilityObservationAttribution } from './visibility-observation-stage.mjs';
import { bindVisibilityObservationStages } from './visibility-observation-binding.mjs';
import { reviewedInputClassificationContexts, classifyReviewedInput } from './reviewed-input-audit-source-binding.mjs';

const hash = x => createHash('sha256').update(x).digest('hex');
const digest = x => hash(JSON.stringify(x));
const capture = { file: 'artifacts/material-parity/current-ancestry-audit/latest-report.json',
  sha256: 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a' };
const signature = row => JSON.stringify([row.family, row.element, row.property, row.reference, row.astylar]);
const metadata = ['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence'];
export { visibilityObservationAttribution };
export const visibilityClassificationContexts = reviewedInputClassificationContexts;
export const classifyVisibilityAuditInput = classifyReviewedInput;

export function prepareVisibilityAuditInputs(supplied) {
  const bytes = readFileSync(capture.file); assert.equal(hash(bytes), capture.sha256);
  const original = JSON.parse(bytes), subset = bindOwnerCaretCaptureSubset(supplied, original);
  assert.equal(subset.coverage.complete, true, 'complete unchanged original capture required');
  const prepared = collectVisibilityObservationStages(), bound = bindVisibilityObservationStages(prepared);
  const states = new Map([['static', original.results], ['interaction', original.interactions]].flatMap(([kind, entries]) => entries.map(e => [
    `${kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`, e.state ?? 'static'])));
  const groups = [], observations = [];
  for (const group of prepared.reviewed) {
    const classification = { classification: group.classification, attribution: visibilityObservationAttribution,
      recommendedOwner: 'input audit browser-computed versus candidate resolved-style observation stages',
      justification: group.observations[0].proof.justification,
      reviewEvidence: { originalCompleteRowSha256: group.priorRowSha256,
        completeGroupProofSha256: digest(group), observationCount: group.occurrences,
        inputEquivalent: false, computedCandidateVerified: false, renderingEquivalent: false,
        rendererCauseProven: false, missingHiddenStateSupportWaived: false } };
    const members = group.observations.map(o => {
      const input = subset.inputs.get(JSON.stringify([o.case, group.element])); assert.ok(input);
      const decision = bound.classify(o.case, input, 'visibility', input.reference?.visibility, input.astylar?.visibility);
      assert.equal(decision?.attribution, visibilityObservationAttribution, 'unbound source decision');
      assert.equal(decision.justification, classification.justification);
      return { case: o.case, family: group.family, element: group.element, property: 'visibility',
        reference: 'visible', inputSha256: o.inputSha256, classification };
    });
    observations.push(...members);
    groups.push({ ...classification, family: group.family, element: group.element,
      property: 'visibility', reference: 'visible', occurrences: members.length,
      cases: members.slice(0, 12).map(o => o.case), reviewedCases: members.map(o => o.case),
      states: [...new Set(members.map(o => states.get(o.case)))] });
  }
  assert.equal(groups.length, 15); assert.equal(observations.length, 530);
  return { schemaVersion: 1, binding: { status: 'bound', capture, sourceProofsReplayed: true },
    groups, observations, pending: prepared.pending, coverage: subset.coverage,
    inputEquivalent: false, renderingEquivalent: false, canonicalCoverageProven: false };
}

export function collectVisibilityAuditInputs(report, { root = process.cwd(), parityPath } = {}) {
  const empty = { schemaVersion: 1, binding: { status: 'unbound' }, groups: [], observations: [] };
  if (!parityPath) return empty;
  try {
    assert.equal(realpathSync(root), realpathSync(process.cwd()));
    const boundary = realpathSync(path.resolve(root, 'artifacts/material-parity'));
    const target = realpathSync(path.resolve(root, parityPath)), relative = path.relative(boundary, target);
    assert.ok(relative && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
    const supplied = JSON.parse(readFileSync(target));
    assert.equal(bindOwnerCaretCaptureSubset(report, supplied).coverage.complete, true);
    return prepareVisibilityAuditInputs(supplied);
  } catch (error) { return { ...empty, binding: { status: 'invalid', error: String(error) } }; }
}

export function validateVisibilityAuditInputs(evidence) {
  try {
    const original = JSON.parse(readFileSync(capture.file));
    assert.ok(isDeepStrictEqual(evidence, prepareVisibilityAuditInputs(original)), 'visibility evidence differs from fresh source replay');
  } catch (error) { return [`visibility evidence replay failed: ${error}`]; }
  return [];
}

// Source validation must precede this exact aggregation/membership check.
export function validateVisibilityAuditClassifications(evidence, rows) {
  try {
    assert.equal(evidence.binding.status, 'bound'); assert.equal(evidence.coverage.complete, true);
    assert.equal(evidence.groups.length, 15);
    const expected = new Map(evidence.groups.map(g => [signature(g), g])); assert.equal(expected.size, 15);
    const actual = rows.filter(r => r.attribution === visibilityObservationAttribution);
    const indexed = new Map(actual.map(r => [signature(r), r]));
    assert.equal(indexed.size, actual.length); assert.equal(indexed.size, expected.size);
    for (const [key, group] of expected) {
      const row = indexed.get(key); assert.ok(row, 'missing or altered visibility group');
      for (const field of [...metadata, 'occurrences', 'cases', 'reviewedCases', 'states'])
        assert.ok(isDeepStrictEqual(row[field], group[field]), `visibility ${field} differs`);
    }
    assert.equal(actual.reduce((n, r) => n + r.occurrences, 0), 530);
  } catch (error) { return [`visibility classification coverage failed: ${error}`]; }
  return [];
}
