import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { collectVerticalAlignPopulation } from '../../scripts/audit-material-vertical-align-population.mjs';
import { collectAdditionalControlFontStyle } from '../../scripts/audit-material-additional-control-font-style.mjs';
import { bindOwnerCaretCaptureSubset } from './owner-caret-audit-source-binding.mjs';
import { bindOwnerCaretNormalization } from './owner-caret-source-binding.mjs';
import { reviewedInputClassificationContexts, classifyReviewedInput } from './reviewed-input-audit-source-binding.mjs';

const hash = x => createHash('sha256').update(x).digest('hex');
const digest = x => hash(JSON.stringify(x));
const revision = 'f8a1642';
const originalFile = 'artifacts/material-parity/current-ancestry-audit/latest-report.json';
const originalSha256 = 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a';
const definitions = {
  alignment: { file: 'docs/material-vertical-align-canonical-plan.json', collect: collectVerticalAlignPopulation, groups: 68, observations: 3848 },
  fontStyle: { file: 'docs/material-additional-control-font-style-attribution-plan.json', collect: collectAdditionalControlFontStyle, groups: 4, observations: 168 },
};
export const alignmentFontAttributions = ['reviewed-alignment-observation-stage-mismatch',
  'reviewed-reference-alignment-request-omission', 'reviewed-candidate-alignment-request-substitution',
  'reviewed-additional-control-font-style-reset-omission'];
export const alignmentFontClassificationContexts = reviewedInputClassificationContexts;
export const classifyAlignmentFontInput = classifyReviewedInput;

function pinned(file) {
  const text = readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
  assert.equal(text, execFileSync('git', ['show', `${revision}:${file}`],
    { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }).replaceAll('\r\n', '\n'), `changed reviewed plan ${file}`);
  return { value: JSON.parse(text), descriptor: { file, revision, sha256: hash(text) } };
}

// Replays original input-tree proofs, not a current canonical JSON classification.
// The complete frozen joins are separately proved and pinned; this synchronous
// builder boundary does not claim to stream the historical 2GB payload again.
export function replayAlignmentFontPlans() {
  const originalBytes = readFileSync(originalFile); assert.equal(hash(originalBytes), originalSha256);
  const original = JSON.parse(originalBytes), plans = {}, proofs = {}, descriptors = {};
  for (const [kind, definition] of Object.entries(definitions)) {
    const { value: plan, descriptor } = pinned(definition.file);
    assert.equal(plan.canonicalAttributionChanged, false);
    assert.equal(plan.inputEquivalent, false); assert.equal(plan.renderingEquivalent, false);
    assert.equal(plan.proposedGroups, definition.groups); assert.equal(plan.proposed.length, definition.groups);
    assert.equal(plan.proposedObservations, definition.observations);
    const proof = definition.collect();
    const source = readFileSync(plan.sourceProof.file, 'utf8').replaceAll('\r\n', '\n');
    assert.equal(hash(source), plan.sourceProof.sha256);
    assert.equal(JSON.stringify(proof, null, 2) + '\n', source, 'original proof no longer replays');
    assert.deepEqual(proof.originalCapture, { file: originalFile, sha256: originalSha256 });
    assert.deepEqual(plan.originalCapture, proof.originalCapture);
    plans[kind] = plan; proofs[kind] = proof;
    descriptors[kind] = { ...descriptor, sourceProof: plan.sourceProof, sourceProofReplayed: true,
      frozenCanonicalJoinReplayedNow: false, frozenCanonicalJoinVerifiedAt: revision };
  }
  assert.deepEqual(plans.alignment.productionNormalization, plans.fontStyle.productionNormalization);
  const n = plans.alignment.productionNormalization;
  const normalize = bindOwnerCaretNormalization(readFileSync(n.module, 'utf8'), n);
  return { original, plans, proofs, descriptors, normalize };
}

export function projectAlignmentFontInputs(supplied, replay) {
  const { original, plans, proofs, descriptors, normalize } = replay;
  assert.deepEqual(Object.keys(plans).sort(), Object.keys(definitions).sort());
  const subset = bindOwnerCaretCaptureSubset(supplied, original), observations = [], groups = [], missing = [];
  const stateByCase = new Map([['static', original.results], ['interaction', original.interactions]].flatMap(([kind, entries]) =>
    entries.map(e => [`${kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`, e.state ?? 'static'])));
  const seen = new Set();
  for (const [kind, plan] of Object.entries(plans)) {
    assert.equal(hash(JSON.stringify(plan, null, 2) + '\n'), descriptors[kind].sha256, 'projected plan changed after authentication');
    assert.equal(hash(JSON.stringify(proofs[kind], null, 2) + '\n'), plan.sourceProof.sha256, 'projected source proof changed');
    assert.equal(plan.proposedGroups, definitions[kind].groups); assert.equal(plan.proposed.length, definitions[kind].groups);
    const source = new Map(proofs[kind].findings.map(f => [JSON.stringify([f.case, f.element]), f]));
    assert.equal(source.size, proofs[kind].findings.length);
    let sourceCount = 0;
    for (const p of plan.proposed) {
      assert.equal(p.property, kind === 'alignment' ? 'verticalAlign' : 'fontStyle');
      assert.equal(p.previousAttribution, 'unresolved');
      assert.ok(alignmentFontAttributions.includes(p.proposedAttribution));
      for (const flag of ['wholeElementInputEquivalent', 'renderingEquivalent', 'rendererCauseProven']) assert.equal(p[flag], false);
      assert.equal(p.occurrences, p.observations.length);
      const classification = { classification: p.proposedClassification, attribution: p.proposedAttribution,
        justification: p.justification, recommendedOwner: p.proposedOwner,
        reviewEvidence: { sourcePlan: descriptors[kind], originalCompleteRowSha256: p.canonicalRowSha256,
          sourceProposalSha256: digest(p), originalObservationsSha256: digest(p.observations),
          inputEquivalent: false, wholeElementInputEquivalent: false, computedCandidateVerified: false,
          usedAlignmentVerified: false, renderingEquivalent: false, rendererCauseProven: false } };
      const members = [];
      for (const o of p.observations) {
        const key = JSON.stringify([o.case, p.element, p.property]); assert.ok(!seen.has(key)); seen.add(key); sourceCount++;
        const f = source.get(JSON.stringify([o.case, p.element])); assert.ok(f, 'proposal missing original source finding');
        assert.equal(f.family, p.family); assert.equal(f.originalInputSha256, o.originalInputSha256);
        assert.deepEqual(f.inputTrees, o.inputTrees); assert.equal(digest(f.proof), o.proofSha256);
        const input = subset.inputs.get(JSON.stringify([o.case, p.element]));
        if (!input) { missing.push({ case: o.case, element: p.element, property: p.property }); continue; }
        assert.equal(digest(input), o.originalInputSha256);
        assert.equal(normalize(input.reference ?? {})[p.property], p.reference);
        assert.equal(normalize(input.astylar ?? {})[p.property], p.astylar);
        const member = { case: o.case, family: p.family, element: p.element, property: p.property,
          reference: p.reference, astylar: p.astylar, inputSha256: o.originalInputSha256,
          proofSha256: o.proofSha256, originalCompleteRowSha256: p.canonicalRowSha256, classification };
        observations.push(member); members.push(member);
      }
      if (members.length) groups.push({ ...classification, family: p.family, element: p.element, property: p.property,
        reference: p.reference, astylar: p.astylar, originalCompleteRowSha256: p.canonicalRowSha256,
        occurrences: members.length, cases: members.slice(0, 12).map(o => o.case), reviewedCases: members.map(o => o.case),
        states: [...new Set(members.map(o => stateByCase.get(o.case)))] });
    }
    assert.equal(sourceCount, definitions[kind].observations); assert.equal(sourceCount, plan.proposedObservations);
  }
  return { observations, groups, coverage: { ...subset.coverage, sourceObservations: seen.size,
    suppliedObservations: observations.length, missingObservations: missing,
    complete: subset.coverage.complete && !missing.length }, inputEquivalent: false, renderingEquivalent: false };
}

export function collectAlignmentFontAuditInputs(report, { root = process.cwd(), parityPath } = {}) {
  const empty = { schemaVersion: 1, binding: { status: 'unbound' }, observations: [], groups: [] };
  if (!parityPath) return empty;
  try {
    assert.equal(realpathSync(root), realpathSync(process.cwd()));
    const boundary = realpathSync('artifacts/material-parity'), target = realpathSync(parityPath);
    const relative = path.relative(boundary, target);
    assert.ok(relative && !relative.startsWith('..') && !path.isAbsolute(relative));
    const bytes = readFileSync(target), supplied = JSON.parse(bytes);
    // Also protects original order and missing owner/case enumeration.
    const caller = bindOwnerCaretCaptureSubset(report, supplied); assert.equal(caller.coverage.complete, true);
    const replay = replayAlignmentFontPlans();
    return { schemaVersion: 1, binding: { status: 'bound', file: path.relative(root, target).replaceAll('\\', '/'),
      sha256: hash(bytes), originalCapture: { file: originalFile, sha256: originalSha256 }, sourcePlans: replay.descriptors,
      sourceProofsReplayed: true, frozenCanonicalJoinReplayedNow: false }, ...projectAlignmentFontInputs(supplied, replay) };
  } catch (error) { return { ...empty, binding: { status: 'invalid', error: String(error) } }; }
}

export function validateAlignmentFontClassifications(evidence, rows) {
  try {
    assert.equal(evidence.binding.status, 'bound');
    const actual = rows.filter(r => alignmentFontAttributions.includes(r.attribution));
    assert.equal(actual.length, evidence.groups.length);
    const bySource = new Map(actual.map(r => [r.reviewEvidence?.originalCompleteRowSha256, r]));
    assert.equal(bySource.size, actual.length);
    for (const expected of evidence.groups) {
      const row = bySource.get(expected.originalCompleteRowSha256); assert.ok(row);
      for (const key of ['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence',
        'family', 'element', 'property', 'reference', 'astylar', 'occurrences', 'cases', 'reviewedCases', 'states'])
        assert.deepEqual(row[key], expected[key], key);
    }
    assert.equal(actual.reduce((n, r) => n + r.occurrences, 0), evidence.coverage.suppliedObservations);
  } catch (error) { return [`alignment/font classification coverage failed: ${error}`]; }
  return [];
}

export function validateAlignmentFontAuditInputs(evidence, { root = process.cwd(), requireComplete = true } = {}) {
  try {
    assert.equal(evidence.binding.status, 'bound');
    if (requireComplete) assert.equal(evidence.coverage.complete, true);
    const bytes = readFileSync(path.resolve(root, evidence.binding.file)); assert.equal(hash(bytes), evidence.binding.sha256);
    const replay = collectAlignmentFontAuditInputs(JSON.parse(bytes), { root, parityPath: evidence.binding.file });
    assert.equal(replay.binding.status, 'bound', replay.binding.error);
    assert.deepEqual(evidence, replay);
  } catch (error) { return [`alignment/font source replay failed: ${error}`]; }
  return [];
}

// Read-only dry run: call only with independently replayed source evidence.
// Exact complete-row hashes prevent overwriting intervening/prior reviews.
export function stageAlignmentFontTransitions(rows, evidence) {
  assert.equal(evidence.binding.status, 'bound'); assert.equal(evidence.coverage.complete, true);
  const expected = new Map(evidence.groups.map(g => [g.originalCompleteRowSha256, g]));
  assert.equal(expected.size, evidence.groups.length);
  const seen = new Set(), changes = [], unchanged = [];
  const projected = rows.map(row => {
    const beforeHash = digest(row), group = expected.get(beforeHash);
    if (!group) { unchanged.push(beforeHash); return row; }
    assert.ok(!seen.has(beforeHash)); seen.add(beforeHash);
    assert.equal(row.attribution, 'unresolved', 'do not replace prior classification');
    for (const field of ['family', 'element', 'property', 'reference', 'astylar', 'occurrences', 'cases', 'states'])
      assert.deepEqual(row[field], group[field], `transition ${field}`);
    const after = { ...row };
    for (const field of ['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases'])
      after[field] = group[field];
    changes.push({ family: row.family, element: row.element, property: row.property, occurrences: row.occurrences,
      previousCompleteRowSha256: beforeHash, projectedCompleteRowSha256: digest(after), attribution: after.attribution });
    return after;
  });
  assert.equal(seen.size, expected.size, 'missing or changed original canonical row');
  assert.deepEqual(validateAlignmentFontClassifications(evidence, projected), []);
  return { rows: projected, changes, unchangedCompleteRows: unchanged.length,
    unchangedOrderedRowDigestsSha256: digest(unchanged),
    previousUnresolved: rows.filter(r => r.attribution === 'unresolved').length,
    projectedUnresolved: projected.filter(r => r.attribution === 'unresolved').length,
    canonicalFilesChanged: false, inputEquivalent: false, renderingEquivalent: false };
}
