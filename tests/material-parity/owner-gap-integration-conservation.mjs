import assert from 'node:assert/strict';
import { ownerGapAttribution } from './owner-gap-classification.mjs';
import { validateOwnerGapClassifications } from './owner-gap-coverage.mjs';
import { explicitGapAttribution } from './explicit-gap-classification.mjs';
import { validateExplicitGapInputs } from './explicit-gap-source-binding.mjs';
import { validateExplicitGapClassifications } from './explicit-gap-coverage.mjs';
import { gapReviewAttributions } from './gap-review-classification.mjs';
import { validateGapReviewInputs } from './gap-review-source-binding.mjs';
import { validateGapReviewClassifications } from './gap-review-coverage.mjs';
import { validateOwnerCaretAuditInputs } from './owner-caret-audit-source-binding.mjs';
import { validateOwnerCaretAttributionRows } from './owner-caret-attribution-coverage.mjs';
import { ownerCaretAttributions } from './owner-caret-classification.mjs';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { collectFullTreeInventory } from './input-equivalence-audit.mjs';
import { bindPreciseAuditNormalization } from './audit-normalization-contracts.mjs';
import { applyComponentCaretReviews, isComponentCaretReviewRow } from '../../scripts/audit-material-overlay-caret-context.mjs';

export const gapScalarProjection = row => [row.family, row.element, row.property, row.reference,
  row.astylar, row.occurrences, row.cases, row.states];

// This pure delta check consumes independently authenticated expected coverage.
// Callers must still compare every complete row outside the returned signatures.
export function assertCaretClassificationDelta(previous, current, expected) {
  assert.equal(expected.reviewedGroups, expected.rows.length);
  assert.equal(expected.reviewedObservations, expected.rows.reduce((n, r) => n + r.occurrences, 0));
  assert.equal(expected.pendingGroups, expected.pending.length);
  assert.equal(expected.pendingObservations, expected.pending.reduce((n, r) => n + r.occurrences, 0));
  assert.equal(expected.inputEquivalent, false); assert.equal(expected.renderingEquivalent, false);
  assert.deepEqual(validateOwnerCaretAttributionRows(expected, current), []);
  const before = new Map(previous.map(r => [JSON.stringify(gapScalarProjection(r)), r]));
  assert.equal(before.size, previous.length);
  const fields = new Set(['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']);
  const raw = row => Object.fromEntries(Object.entries(row).filter(([k]) => !fields.has(k)));
  const signatures = new Set();
  for (const row of current.filter(r => Object.values(ownerCaretAttributions).includes(r.attribution))) {
    const key = JSON.stringify(gapScalarProjection(row)), prior = before.get(key);
    assert.ok(prior, 'later caret row lacks its original complete scalar');
    assert.equal(prior.attribution, 'unresolved');
    assert.equal(row.property, 'caretColor'); assert.equal(row.classification, 'parity-harness-defect');
    assert.deepEqual(raw(row), raw(prior), 'later caret review changed raw/authored fields');
    for (const flag of ['inputEquivalent', 'computedCandidateVerified', 'descendantCaretVerified',
      'renderingEquivalent', 'rendererCauseProven', 'wholeElementInputEquivalent']) assert.equal(row.reviewEvidence[flag], false);
    assert.ok(!signatures.has(key)); signatures.add(key);
  }
  assert.equal(signatures.size, expected.reviewedGroups);
  for (const pending of expected.pending) {
    const matches = rows => rows.filter(r => r.family === pending.family && r.element === pending.element &&
      r.property === pending.property && r.reference === pending.reference && r.astylar === undefined);
    const a = matches(previous), b = matches(current);
    assert.equal(a.length, 1); assert.equal(b.length, 1);
    // Pending at this owner-review boundary can already carry a separate
    // component review. Preserve that whole row; do not promote it here.
    // The outer integration still authenticates unrelated classifications.
    assert.ok(!Object.values(ownerCaretAttributions).includes(b[0].attribution));
    assert.deepEqual(b[0], a[0], 'pending caret row changed');
    for (const k of ['occurrences', 'cases', 'states']) assert.deepEqual(b[0][k], pending[k]);
  }
  return signatures;
}

export function assertLaterCaretClassifications(audit, previous, options = {}) {
  // Replay the entire pinned original proof before accepting its exact supplied
  // subset. A caller-provided attribution or self-consistent expected list is
  // insufficient to exempt a row from historical conservation.
  assert.deepEqual(validateOwnerCaretAuditInputs(audit.ownerCaretInputs, { ...options, requireComplete: false }), []);
  const pending = audit.ownerCaretInputs.plannedCoverage.pending;
  const matches = (row, item) => row.family === item.family && row.element === item.element &&
    row.property === item.property && row.reference === item.reference && row.astylar === undefined;
  const changed = previous.discrepancies.filter(row => pending.some(item => matches(row, item)) &&
    !isDeepStrictEqual(row, audit.discrepancies.find(current =>
      JSON.stringify(gapScalarProjection(current)) === JSON.stringify(gapScalarProjection(row)))));
  let before = previous.discrepancies;
  if (changed.length) {
    const binding = audit.ownerCaretInputs.binding;
    const bytes = readFileSync(path.resolve(options.root ?? process.cwd(), binding.file));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), binding.sha256);
    const source = JSON.parse(bytes), cases = [...(source.results ?? []).map(entry => ({ ...entry, kind: 'static' })),
      ...(source.interactions ?? []).map(entry => ({ ...entry, kind: 'interaction' }))];
    const inventory = collectFullTreeInventory(cases, options);
    assert.deepEqual(inventory.errors, []);
    const replay = applyComponentCaretReviews(changed, cases, inventory, bindPreciseAuditNormalization());
    const metadata = new Set(['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']);
    const restored = new Map();
    for (const row of replay) {
      assert.ok(isComponentCaretReviewRow(row), 'pending caret change lacks independent component review');
      const key = JSON.stringify(gapScalarProjection(row));
      assert.deepEqual(audit.discrepancies.find(current => JSON.stringify(gapScalarProjection(current)) === key), row,
        'pending caret metadata differs from captured component replay');
      const caseKey = entry => `${entry.kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`;
      const members = row.reviewedCases.map(key => {
        const found = cases.filter(entry => caseKey(entry) === key); assert.equal(found.length, 1); return found[0];
      });
      const inputs = members[0].styleInputs.filter(input => input.id === row.element); assert.equal(inputs.length, 1);
      const compact = rules => (rules ?? []).slice(-4).map(rule => ({ selector: rule.selector, declarations: rule.declarations }));
      assert.deepEqual(Object.fromEntries(Object.entries(row).filter(([key]) => !metadata.has(key))), {
        family: members[0].family, element: inputs[0].id, property: 'caretColor', propertyGroup: 'typography',
        reference: row.reference, astylar: undefined, occurrences: members.length, cases: row.reviewedCases.slice(0, 12),
        states: [...new Set(members.map(entry => entry.state ?? 'static'))],
        referenceAuthoredExamples: compact(inputs[0].referenceAuthored), astylarAuthoredExamples: compact(inputs[0].astylarAuthored),
      }, 'pending caret raw evidence differs from captured inputs');
      assert.ok(!restored.has(key)); restored.set(key, row);
    }
    before = before.map(row => restored.get(JSON.stringify(gapScalarProjection(row))) ?? row);
  }
  return assertCaretClassificationDelta(before, audit.discrepancies,
    audit.ownerCaretInputs.plannedCoverage);
}

// Historical integration tests must verify the exact later gap classification
// before excluding it from their unrelated-row comparison. Never exempt a whole
// property, family, or arbitrary attribution string without source coverage.
export function assertLaterGapClassifications(audit, previous, options = {}) {
  assert.equal(audit.ownerGapInputs?.binding?.status, 'bound');
  assert.deepEqual(validateOwnerGapClassifications(audit.ownerGapInputs, audit.discrepancies, options), []);
  const added = audit.discrepancies.filter(row => row.attribution === ownerGapAttribution);
  const before = new Map(previous.discrepancies.map(row => [JSON.stringify(gapScalarProjection(row)), row]));
  assert.equal(before.size, previous.discrepancies.length);
  const signatures = new Set();
  for (const row of added) {
    const key = JSON.stringify(gapScalarProjection(row)), prior = before.get(key);
    assert.ok(prior, 'later gap classification must retain its complete prior scalar row');
    assert.equal(prior.attribution, 'unresolved');
    assert.equal(row.classification, 'parity-harness-defect');
    assert.deepEqual(row.referenceAuthoredExamples, prior.referenceAuthoredExamples);
    assert.deepEqual(row.astylarAuthoredExamples, prior.astylarAuthoredExamples);
    for (const flag of ['computedCandidateVerified', 'renderingEquivalent', 'inputEquivalent',
      'wholeElementInputEquivalent', 'usedGapVerified']) assert.equal(row.reviewEvidence[flag], false);
    signatures.add(key);
  }
  assert.equal(signatures.size, added.length);
  // Explicit spacing is a separate, later authoring finding, not a widening of
  // the normal/local-omission classifier. Authenticate its full proof and exact
  // selected source population before accounting for it in historical tests.
  assert.equal(audit.explicitGapInputs?.binding?.status, 'bound');
  const diagnostic = { ...options, requireComplete: false };
  assert.deepEqual(validateExplicitGapClassifications(audit.explicitGapInputs, audit.discrepancies, diagnostic), []);
  assert.deepEqual(validateExplicitGapInputs(audit.explicitGapInputs, diagnostic), []);
  const explicit = audit.discrepancies.filter(row => row.attribution === explicitGapAttribution);
  for (const row of explicit) {
    const key = JSON.stringify(gapScalarProjection(row)), prior = before.get(key);
    assert.ok(prior, 'explicit gap classification must retain its complete prior scalar row');
    assert.equal(prior.attribution, 'unresolved');
    assert.equal(row.classification, 'application-plugin-authoring-defect');
    assert.deepEqual(row.referenceAuthoredExamples, prior.referenceAuthoredExamples);
    assert.deepEqual(row.astylarAuthoredExamples, prior.astylarAuthoredExamples);
    for (const flag of ['inputEquivalent', 'wholeElementInputEquivalent', 'usedGapVerified', 'rendererCauseProven'])
      assert.equal(row.reviewEvidence[flag], false);
    assert.ok(!signatures.has(key), 'explicit and normal-gap attribution populations must be disjoint');
    signatures.add(key);
  }
  assert.equal(signatures.size, added.length + explicit.length);
  // Later capture/motion findings have their own original-source binding. An
  // attribution name alone is not permission to exempt a historical row.
  assert.equal(audit.gapReviewInputs?.binding?.status, 'bound');
  assert.deepEqual(validateGapReviewClassifications(audit.gapReviewInputs, audit.discrepancies, diagnostic), []);
  assert.deepEqual(validateGapReviewInputs(audit.gapReviewInputs, diagnostic), []);
  const reviewed = audit.discrepancies.filter(row => Object.values(gapReviewAttributions).includes(row.attribution));
  for (const row of reviewed) {
    const key = JSON.stringify(gapScalarProjection(row)), prior = before.get(key);
    assert.ok(prior, 'reviewed gap classification must retain its complete prior scalar row');
    assert.equal(prior.attribution, 'unresolved');
    assert.equal(row.classification, 'parity-harness-defect');
    assert.deepEqual(row.referenceAuthoredExamples, prior.referenceAuthoredExamples);
    assert.deepEqual(row.astylarAuthoredExamples, prior.astylarAuthoredExamples);
    for (const flag of ['inputEquivalent', 'wholeElementInputEquivalent', 'computedCandidateVerified',
      'usedGapVerified', 'renderingEquivalent', 'rendererCauseProven']) assert.equal(row.reviewEvidence[flag], false);
    assert.ok(!signatures.has(key), 'reviewed, explicit and normal-gap populations must be disjoint');
    signatures.add(key);
  }
  assert.equal(signatures.size, added.length + explicit.length + reviewed.length);
  return signatures;
}
