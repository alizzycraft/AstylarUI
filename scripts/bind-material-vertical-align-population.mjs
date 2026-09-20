import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { collectVerticalAlignPopulation } from './audit-material-vertical-align-population.mjs';
import { bindHistoricalAuditNormalization } from '../tests/material-parity/audit-normalization-contracts.mjs';
import { readCaretConservationRows } from '../tests/material-parity/owner-caret-canonical-conservation.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const digest = value => hash(JSON.stringify(value));
const key = row => JSON.stringify([row.family, row.element, row.property, row.reference, row.astylar]);
const proofFile = 'docs/material-vertical-align-population.json';
const outputFile = 'docs/material-vertical-align-canonical-plan.json';
const normalization = { module: 'tests/material-parity/input-equivalence-audit.mjs',
  functions: ['canonicalStyle', 'expandQuad', 'expandPair', 'splitCssTerms', 'normalizeValue', 'normalizeColor', 'formatNumber'],
  sha256: '8929720cf30769ac3148458bf954402466f6f296c0d764c3123cd797f1e9300e' };
const dispositions = {
  'computed-initial-versus-omitted-local-declaration': {
    classification: 'parity-harness-defect', attribution: 'reviewed-alignment-observation-stage-mismatch',
    owner: 'input audit computed-default versus local-declaration observation stages',
    justification: 'The browser computes baseline while neither local author supplies an alignment request and the captured candidate local stages omit it. This identifies unequal observation stages, not equal computed/used alignment or correct rendering.',
  },
  'reference-explicit-middle-versus-candidate-omission': {
    classification: 'application-plugin-authoring-defect', attribution: 'reviewed-reference-alignment-request-omission',
    owner: 'Material alignment authoring translation',
    justification: 'The reference explicitly requests middle while candidate local authoring and all captured local stages omit it. CSS applicability, defaults, owner structure and visual consequences still require separate investigation.',
  },
  'candidate-explicit-middle-versus-reference-baseline': {
    classification: 'application-plugin-authoring-defect', attribution: 'reviewed-candidate-alignment-request-substitution',
    owner: 'Material alignment authoring translation',
    justification: 'Candidate authoring explicitly adds middle while the reference computes baseline without a local alignment declaration. Source history locates the substitution; neither a concealed core cause nor historical rendering is proved by that history.',
  },
};

// Membership binding only. The collector authenticates and independently replays
// source evidence before calling this pure function. No canonical row is edited.
export function planVerticalAlignPopulation(proof, original, rows, normalize, existingPlan) {
  for (const flag of ['canonicalAttributionChanged', 'rendererChanged', 'comparisonInputsChanged']) assert.equal(proof[flag], false);
  const findings = new Map(proof.findings.map(f => [JSON.stringify([f.case, f.element]), f]));
  assert.equal(findings.size, proof.observations);
  assert.equal(proof.findings.length, proof.observations);
  const cases = new Set(), seen = new Set(), groups = new Map(), missing = [];
  let equal = 0;
  for (const [kind, entries] of [['static', original.results], ['interaction', original.interactions]]) for (const entry of entries) {
    const caseId = `${kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`;
    assert.ok(!cases.has(caseId)); cases.add(caseId);
    assert.equal(new Set(entry.styleInputs.map(i => i.id)).size, entry.styleInputs.length);
    for (const input of entry.styleInputs) {
      if (!input.reference || !input.astylar) { missing.push({ case: caseId, element: input.id, originalInput: input }); continue; }
      if (input.reference.verticalAlign === input.astylar.verticalAlign) { equal++; continue; }
      const identity = JSON.stringify([caseId, input.id]), f = findings.get(identity);
      assert.ok(f, 'original alignment difference lacks proof'); assert.ok(!seen.has(identity)); seen.add(identity);
      assert.equal(f.family, entry.family); assert.equal(f.profile, entry.profile);
      assert.equal(f.state, entry.state ?? 'static'); assert.equal(f.property, 'verticalAlign');
      assert.deepEqual(f.viewport, entry.viewport); assert.deepEqual(f.inputTrees, entry.inputTrees);
      assert.equal(f.originalInputSha256, digest(input));
      const p = f.proof;
      assert.equal(p.reference, input.reference.verticalAlign);
      assert.equal(p.candidate, input.astylar.verticalAlign ?? '<omitted>');
      for (const flag of ['wholeElementInputEquivalent', 'usedAlignmentVerified', 'renderingEquivalent',
        'rendererCauseProven', 'canonicalAttributionChanged']) assert.equal(p[flag], false);
      const disposition = dispositions[p.status];
      if (disposition) assert.equal(p.classification, disposition.classification);
      else { assert.equal(p.status, 'unresolved-alias-scalar-rule-gap'); assert.equal(p.classification, 'unresolved'); }
      const row = { family: entry.family, element: input.id, property: 'verticalAlign',
        reference: normalize(input.reference).verticalAlign };
      const candidate = normalize(input.astylar).verticalAlign;
      if (candidate !== undefined) row.astylar = candidate;
      const signature = key(row);
      if (!groups.has(signature)) groups.set(signature, { ...row, occurrences: 0, cases: [], states: [], status: p.status, observations: [] });
      const group = groups.get(signature); assert.equal(group.status, p.status, 'mixed proof dispositions need separate review');
      group.occurrences++; if (group.cases.length < 12) group.cases.push(caseId);
      if (!group.states.includes(f.state)) group.states.push(f.state);
      group.observations.push({ case: caseId, originalInputSha256: f.originalInputSha256,
        inputTrees: f.inputTrees, proofSha256: digest(p) });
    }
  }
  assert.equal(cases.size, proof.casesScanned); assert.equal(seen.size, proof.observations);
  assert.equal(equal, proof.equalScalarObservations); assert.deepEqual(missing, proof.missingScalarObservations);
  assert.equal(groups.size, proof.groupCount);
  const checkedGroups = new Set();
  assert.equal(proof.groups.length, groups.size);
  for (const g of proof.groups) {
    const matches = [...groups.values()].filter(p => p.family === g.family && p.element === g.element &&
      p.reference === g.reference && (p.astylar ?? '<omitted>') === g.candidate);
    assert.equal(matches.length, 1); const p = matches[0];
    assert.ok(!checkedGroups.has(p), 'duplicated source group'); checkedGroups.add(p);
    assert.equal(g.property, p.property); assert.equal(g.occurrences, p.occurrences);
    assert.deepEqual(g.cases, p.observations.map(o => o.case));
    assert.deepEqual(g.statuses, { [p.status]: p.occurrences });
  }
  const statusCounts = {};
  for (const g of groups.values()) statusCounts[g.status] = (statusCounts[g.status] ?? 0) + g.occurrences;
  assert.deepEqual(proof.statusCounts, statusCounts);
  assert.equal(existingPlan.canonicalRevision, '957774af2ac560f2059ca05782fb1b6b47b1038c');
  assert.equal(existingPlan.canonicalAttributionChanged, false);
  assert.equal(existingPlan.proposedGroups, existingPlan.groups.length);
  const reserved = new Map(existingPlan.groups.map(g => [key(g.originalCompleteRow), g]));
  assert.equal(reserved.size, existingPlan.groups.length, 'duplicate existing proposal');
  const selected = new Set(), proposed = [], retainedGaps = [], previouslyReviewed = [], reservedByExistingPlan = [];
  for (const group of groups.values()) {
    const matches = rows.filter(row => key(row) === key(group)); assert.equal(matches.length, 1, 'canonical membership missing or duplicated');
    const row = matches[0];
    for (const field of ['occurrences', 'cases', 'states']) assert.deepEqual(row[field], group[field], field);
    const bound = { ...group, canonicalRowSha256: digest(row), previousAttribution: row.attribution };
    if (reserved.has(key(row))) {
      const reservation = reserved.get(key(row));
      assert.deepEqual(reservation.originalCompleteRow, row, 'existing plan no longer has the same complete canonical row');
      assert.equal(row.attribution, 'unresolved');
      assert.equal(reservation.proposal.canonicalRowSha256, digest(row));
      for (const field of ['family', 'element', 'property', 'reference', 'astylar', 'occurrences', 'cases', 'states'])
        assert.deepEqual(reservation.proposal[field], row[field], `reservation ${field}`);
      reservedByExistingPlan.push({ ...bound, existingKind: reservation.kind,
        existingProposedAttribution: reservation.proposal.proposedAttribution });
      continue; // Reservation avoids competing attribution; it does not adopt or prove that review.
    }
    if (row.attribution !== 'unresolved') {
      previouslyReviewed.push(bound); continue; // Never replace an earlier review.
    }
    const disposition = dispositions[group.status];
    if (!disposition) { retainedGaps.push(bound); continue; }
    selected.add(row);
    proposed.push({ ...bound, proposedClassification: disposition.classification,
      proposedAttribution: disposition.attribution, proposedOwner: disposition.owner, justification: disposition.justification,
      wholeElementInputEquivalent: false, usedAlignmentVerified: false, renderingEquivalent: false, rendererCauseProven: false });
  }
  const count = entries => entries.reduce((n, g) => n + g.occurrences, 0);
  return { originalCasesScanned: cases.size, originalGroups: groups.size, originalObservations: seen.size,
    equalScalarObservations: equal, missingScalarObservations: missing,
    canonicalRows: rows.length, baselineUnresolved: rows.filter(r => r.attribution === 'unresolved').length,
    proposedGroups: proposed.length, proposedObservations: count(proposed),
    retainedGapGroups: retainedGaps.length, retainedGapObservations: count(retainedGaps),
    previouslyReviewedGroups: previouslyReviewed.length, previouslyReviewedObservations: count(previouslyReviewed),
    reservedGroups: reservedByExistingPlan.length, reservedObservations: count(reservedByExistingPlan),
    otherCompleteRows: rows.length - selected.size,
    otherOrderedRowDigestsSha256: digest(rows.filter(r => !selected.has(r)).map(digest)),
    proposed, retainedGaps, previouslyReviewed, reservedByExistingPlan, canonicalAttributionChanged: false, rendererChanged: false,
    inputEquivalent: false, renderingEquivalent: false };
}

export async function collectVerticalAlignCanonicalPlan() {
  const bytes = readFileSync(proofFile, 'utf8').replaceAll('\r\n', '\n');
  assert.equal(bytes, execFileSync('git', ['show', `4d940bd:${proofFile}`],
    { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }).replaceAll('\r\n', '\n'));
  const proof = collectVerticalAlignPopulation(); assert.equal(bytes, JSON.stringify(proof, null, 2) + '\n');
  const originalBytes = readFileSync(proof.originalCapture.file); assert.equal(hash(originalBytes), proof.originalCapture.sha256);
  const normalize = bindHistoricalAuditNormalization(normalization, '957774a');
  const reservedFile = 'docs/material-followup-input-proposal-binding.json';
  const reservedBytes = readFileSync(reservedFile, 'utf8').replaceAll('\r\n', '\n');
  assert.equal(reservedBytes, execFileSync('git', ['show', `11bd538:${reservedFile}`],
    { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }).replaceAll('\r\n', '\n'));
  const existingPlan = JSON.parse(reservedBytes);
  const canonical = await readCaretConservationRows(file => execFileSync('git', ['show', `957774a:${file}`], { maxBuffer: 64 * 1024 * 1024 }));
  assert.deepEqual(existingPlan.canonicalPayload, canonical.manifest);
  return { schemaVersion: 1, kind: 'original-vertical-align-canonical-membership-plan',
    canonicalRevision: '957774a', canonicalPayload: canonical.manifest,
    sourceProof: { file: proofFile, revision: '4d940bd', sha256: hash(bytes) },
    originalCapture: proof.originalCapture, productionNormalization: normalization,
    reservedPlan: { file: reservedFile, revision: '11bd538', sha256: hash(reservedBytes),
      purpose: 'Prevent overlapping proposals against the same exact frozen row; existing semantic classifications are not adopted or re-proved by this join.' },
    ...planVerticalAlignPopulation(proof, JSON.parse(originalBytes), canonical.rows, normalize, existingPlan) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2); assert.ok(!args.length || args.length === 1 && args[0] === '--check');
  const report = await collectVerticalAlignCanonicalPlan();
  assert.equal(report.originalGroups, 116); assert.equal(report.originalObservations, 6886);
  assert.equal(report.proposedGroups + report.retainedGapGroups + report.previouslyReviewedGroups + report.reservedGroups, report.originalGroups);
  assert.equal(report.proposedObservations + report.retainedGapObservations + report.previouslyReviewedObservations + report.reservedObservations, report.originalObservations);
  const output = JSON.stringify(report, null, 2) + '\n';
  if (args[0] === '--check') assert.equal(readFileSync(outputFile, 'utf8').replaceAll('\r\n', '\n'), output);
  else writeFileSync(outputFile, output);
  console.log(JSON.stringify({ proposedGroups: report.proposedGroups, proposedObservations: report.proposedObservations,
    retainedGapGroups: report.retainedGapGroups, previouslyReviewedGroups: report.previouslyReviewedGroups,
    reservedGroups: report.reservedGroups, reservedObservations: report.reservedObservations,
    otherCompleteRows: report.otherCompleteRows, otherOrderedRowDigestsSha256: report.otherOrderedRowDigestsSha256,
    reportSha256: hash(output), canonicalAttributionChanged: false }));
}
