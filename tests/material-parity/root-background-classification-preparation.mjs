import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { collectRootBackgroundInputs, inspectSidenavBackgroundInputs } from '../../scripts/audit-material-root-background-inputs.mjs';
import { modalInventoryTrees } from './modal-position-inspection.mjs';
import { bindPreciseAuditNormalization, preciseAuditNormalization } from './audit-normalization-contracts.mjs';
import { bindOwnerCaretCaptureSubset } from './owner-caret-audit-source-binding.mjs';
import { reviewedInputClassificationContexts, classifyReviewedInput } from './reviewed-input-audit-source-binding.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const digest = value => hash(JSON.stringify(value));
const signature = row => JSON.stringify([row.family, row.element, row.property, row.reference, row.astylar]);
const metadataKeys = ['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence'];
export const rootBackgroundAttribution = 'reviewed-root-background-prequantized-theme-input';
export const rootBackgroundClassificationContexts = reviewedInputClassificationContexts;
export const classifyRootBackgroundInput = classifyReviewedInput;
export const sidenavBackgroundAttribution = 'reviewed-sidenav-background-token-input';

// Reuse the authenticated original cases/inventory. A partial scalar population
// or failed owner proof stays unresolved, never a sampled or inferred success.
export function applySidenavBackgroundScalar(rows, cases, inventory, normalize) {
  return rows.map(row => {
    if (row.attribution !== 'unresolved' || row.family !== 'sidenav' ||
        row.element !== 'sidenav-primary' || row.property !== 'backgroundColor') return row;
    try {
      const members = cases.filter(c => c.family === row.family && c.styleInputs?.some(i =>
        i.id === row.element && i.reference && i.astylar &&
        normalize(i.reference).backgroundColor === row.reference && normalize(i.astylar).backgroundColor === row.astylar));
      assert.ok(members.length); assert.equal(members.length, row.occurrences);
      const seen = new Set(), proofs = members.map(c => {
        const key = `${c.kind ?? (c.state ? 'interaction' : 'static')}:${c.family}@${c.profile}/${c.viewport.id}${c.state ? '/' + c.state : ''}`;
        assert.ok(!seen.has(key), 'duplicate original case'); seen.add(key);
        const inputs = c.styleInputs.filter(i => i.id === row.element);
        assert.equal(inputs.length, 1);
        const proof = inspectSidenavBackgroundInputs(inputs[0], ...modalInventoryTrees(inventory, key));
        assert.equal(normalize({ backgroundColor: proof.referenceComputed }).backgroundColor, row.reference);
        assert.equal(normalize({ background: proof.candidateRequested }).backgroundColor, row.astylar);
        return { case: key, inputSha256: digest(inputs[0]), proofSha256: digest(proof),
          referenceNode: proof.referenceNode, candidateNode: proof.candidateNode,
          referenceToken: proof.referenceToken, candidateRequested: proof.candidateRequested };
      });
      return { ...row, classification: 'application-plugin-authoring-defect', attribution: sidenavBackgroundAttribution,
        recommendedOwner: 'showcase sidenav background token translation',
        justification: 'Every original member has a unique sidenav container owner and one captured background declaration path. The reference resolves its Material background token to a different color from the candidate authored literal, which survives unchanged through all three core style snapshots. This is unequal component authoring before paint, not a demonstrated renderer color defect or output-equivalence claim.',
        reviewEvidence: { proofs, inputEquivalent: false, rendererDefectProven: false, renderingEquivalent: false } };
    } catch { return row; }
  });
}

export function validateSidenavBackgroundScalar(rows, originalRows, cases, inventory, normalize) {
  const select = values => values.filter(r => r.attribution === sidenavBackgroundAttribution);
  const expected = select(applySidenavBackgroundScalar(originalRows, cases, inventory, normalize));
  return isDeepStrictEqual(JSON.parse(JSON.stringify(select(rows))), JSON.parse(JSON.stringify(expected))) ? [] :
    ['sidenav background scalar attribution lacks complete original membership and captured declaration replay'];
}

export function collectRootBackgroundAuditInputs(report, { root = process.cwd(), parityPath } = {}) {
  const empty = { schemaVersion: 1, binding: { status: 'unbound' }, observations: [], groups: [] };
  if (!parityPath) return empty;
  try {
    assert.equal(realpathSync(root), realpathSync(process.cwd()), 'root background replay requires the current worktree');
    const boundary = realpathSync(path.resolve(root, 'artifacts/material-parity'));
    const target = realpathSync(path.resolve(root, parityPath));
    const relative = path.relative(boundary, target);
    assert.ok(relative && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative),
      'root background capture escapes Material artifacts');
    const supplied = JSON.parse(readFileSync(target));
    assert.equal(bindOwnerCaretCaptureSubset(report, supplied).coverage.complete, true,
      'root background caller differs from supplied capture');
    return prepareRootBackgroundClassifications(supplied);
  } catch (error) { return { ...empty, binding: { status: 'invalid', error: String(error) } }; }
}

// Preparation only: no canonical report is read, written, or reclassified here.
// Re-run the source proof before projecting its exact captured observations.
export function prepareRootBackgroundClassifications(supplied) {
  const proof = collectRootBackgroundInputs();
  const bytes = readFileSync(proof.capture.file);
  assert.equal(hash(bytes), proof.capture.sha256);
  const original = JSON.parse(bytes);
  const subset = bindOwnerCaretCaptureSubset(supplied, original);
  assert.equal(subset.coverage.complete, true, 'complete original capture required');
  const normalize = bindPreciseAuditNormalization();
  const states = new Map([['static', original.results], ['interaction', original.interactions]]
    .flatMap(([kind, entries]) => entries.map(entry => [
      `${kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`,
      entry.state ?? 'static'])));
  const observations = [], groups = [], seen = new Set();
  for (const finding of proof.findings) {
    const reference = normalize({ backgroundColor: finding.reference }).backgroundColor;
    const astylar = normalize({ background: finding.candidate }).backgroundColor;
    assert.notEqual(reference, astylar, 'unequal authored colors must stay unequal');
    const classification = {
      classification: finding.classification, attribution: rootBackgroundAttribution,
      justification: 'The reference requests a fractional CSS color mix; the showcase theme rounds its channels to integer hex before passing the background to AstylarUI.',
      recommendedOwner: finding.owner,
      reviewEvidence: { source: proof.source, sourceFindingSha256: digest(finding),
        referenceMix: finding.referenceMix, candidateChannelNumerators: finding.candidateChannelNumerators,
        inputEquivalent: false, rendererCauseProven: false, renderingEquivalent: false,
        rasterDifferenceProven: false },
    };
    const members = finding.observations.map(observation => {
      const key = JSON.stringify([observation.case, finding.element, finding.property]);
      assert.ok(!seen.has(key), 'duplicate root observation'); seen.add(key);
      const input = subset.inputs.get(JSON.stringify([observation.case, finding.element]));
      assert.ok(input, 'source-proven input missing');
      assert.equal(digest(input), observation.inputSha256);
      assert.equal(normalize(input.reference).backgroundColor, reference);
      assert.equal(normalize(input.astylar).backgroundColor, astylar);
      return { ...observation, family: finding.family, element: finding.element,
        property: finding.property, reference, astylar, classification };
    });
    assert.equal(members.length, finding.occurrences);
    observations.push(...members);
    groups.push({ ...classification, family: finding.family, element: finding.element,
      property: finding.property, reference, astylar, occurrences: members.length,
      cases: members.slice(0, 12).map(member => member.case),
      reviewedCases: members.map(member => member.case),
      states: [...new Set(members.map(member => states.get(member.case)))] });
  }
  assert.equal(groups.length, 144); assert.equal(observations.length, 2311);
  return { schemaVersion: 1, binding: { status: 'bound', capture: proof.capture,
    sourceProofsReplayed: true, normalization: preciseAuditNormalization },
    observations, groups, coverage: subset.coverage, canonicalIntegration: false, canonicalCoverageProven: false,
    inputEquivalent: false, renderingEquivalent: false };
}

// Evidence must reproduce independently, not merely have plausible counts or
// self-consistent metadata. Use the fixed original capture, never a caller path.
export function validateRootBackgroundEvidence(evidence) {
  try {
    const original = JSON.parse(readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json'));
    const replay = prepareRootBackgroundClassifications(original);
    assert.ok(isDeepStrictEqual(evidence, replay), 'root background evidence differs from fresh source replay');
  } catch (error) { return [`root background evidence replay failed: ${error}`]; }
  return [];
}

// Separate from source authentication: this proves no reviewed observation was
// dropped, duplicated, relabeled, or attached to another scalar/owner by a caller.
export function validateRootBackgroundClassifications(evidence, rows) {
  try {
    assert.equal(evidence?.binding?.status, 'bound');
    assert.equal(evidence?.coverage?.complete, true);
    assert.equal(evidence.groups.length, 144);
    const expected = new Map(evidence.groups.map(group => [signature(group), group]));
    assert.equal(expected.size, evidence.groups.length, 'duplicate expected root group');
    const actual = rows.filter(row => row.attribution === rootBackgroundAttribution);
    const indexed = new Map(actual.map(row => [signature(row), row]));
    assert.equal(indexed.size, actual.length, 'duplicate classified root group');
    assert.equal(indexed.size, expected.size, 'root group coverage changed');
    for (const [key, group] of expected) {
      const row = indexed.get(key); assert.ok(row, 'root group missing or scalar changed');
      for (const field of [...metadataKeys, 'occurrences', 'cases', 'reviewedCases', 'states'])
        assert.ok(isDeepStrictEqual(row[field], group[field]), `root ${field} changed`);
    }
    assert.equal(actual.reduce((count, row) => count + row.occurrences, 0), 2311);
  } catch (error) { return [`root background classification coverage failed: ${error}`]; }
  return [];
}
