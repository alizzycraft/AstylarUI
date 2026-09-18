import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { collectExpansionOwnerMapping } from './audit-material-expansion-owner-mapping.mjs';
import { readCaretConservationRows } from '../tests/material-parity/owner-caret-canonical-conservation.mjs';
import { bindOwnerCaretNormalization } from '../tests/material-parity/owner-caret-source-binding.mjs';

const hash = x => createHash('sha256').update(x).digest('hex');
const digest = x => hash(JSON.stringify(x));
const revision = '957774a';
const normalization = { module: 'tests/material-parity/input-equivalence-audit.mjs',
  functions: ['canonicalStyle', 'expandQuad', 'expandPair', 'splitCssTerms', 'normalizeValue', 'normalizeColor', 'formatNumber'],
  sha256: '8929720cf30769ac3148458bf954402466f6f296c0d764c3123cd797f1e9300e' };

// Pure membership projection. The collector below authenticates the entire
// canonical payload and independently regenerates the original owner proof.
export function planExpansionOwnerAttribution(proof, original, rows, normalize) {
  for (const flag of ['canonicalAttributionChanged', 'rendererChanged', 'inputEquivalent', 'renderingEquivalent']) assert.equal(proof[flag], false);
  assert.equal(proof.observations, proof.findings.length);
  const findings = new Map(proof.findings.map(f => [f.case, f]));
  assert.equal(findings.size, 68);
  const observations = [], seen = new Set();
  for (const [kind, entries] of [['static', original.results], ['interaction', original.interactions]]) for (const e of entries) {
    const caseId = `${kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`;
    assert.ok(!seen.has(caseId)); seen.add(caseId);
    if (e.family !== 'expansion') continue;
    const f = findings.get(caseId); assert.ok(f, 'original expansion case lacks owner proof');
    const inputs = e.styleInputs.filter(i => i.id === 'expansion-primary'); assert.equal(inputs.length, 1);
    const input = inputs[0]; assert.equal(digest(input), f.originalInputSha256);
    assert.equal(f.element, input.id); assert.equal(f.family, e.family);
    assert.equal(f.profile, e.profile); assert.equal(f.state, e.state ?? 'static');
    assert.deepEqual(f.viewport, e.viewport); assert.deepEqual(f.inputTrees, e.inputTrees);
    const p = f.proof;
    assert.equal(p.attribution, 'same-id-compares-expansion-panel-to-header');
    assert.equal(p.classification, 'parity-harness-defect');
    assert.equal(p.originalReferenceOwner.type, 'mat-expansion-panel');
    assert.equal(p.originalCandidateOwner.authored.role, 'button');
    assert.equal(p.originalCandidateOwner.authored.id, input.id);
    assert.equal(p.checkedOriginalReferenceProperties, 89);
    for (const [property, value] of Object.entries(input.reference)) assert.equal(p.originalReferenceOwner.computed[property], value);
    assert.deepEqual(p.originalCandidateOwner.stages.resolvedStyle, input.astylar);
    for (const flag of ['inputEquivalent', 'renderingEquivalent', 'rendererCauseProven', 'canonicalMappingChanged']) assert.equal(p[flag], false);
    observations.push({ case: caseId, state: e.state ?? 'static', inputSha256: digest(input),
      inputTrees: e.inputTrees, proofSha256: digest(p), reference: normalize(input.reference), candidate: normalize(input.astylar) });
  }
  assert.equal(seen.size, proof.originalCasesScanned); assert.equal(observations.length, proof.observations);
  const owners = rows.filter(r => r.family === 'expansion' && r.element === 'expansion-primary');
  const tuples = new Set(), proposed = [], preserved = [], selected = new Set();
  for (const row of owners) {
    const key = JSON.stringify([row.property, row.reference, row.astylar]);
    assert.ok(!tuples.has(key), 'ambiguous canonical owner/property group'); tuples.add(key);
    const members = observations.filter(o => o.reference[row.property] === row.reference && o.candidate[row.property] === row.astylar);
    assert.equal(members.length, row.occurrences, 'canonical owner membership changed');
    assert.deepEqual(members.slice(0, 12).map(o => o.case), row.cases);
    assert.deepEqual([...new Set(members.map(o => o.state))], row.states);
    const descriptor = { family: row.family, element: row.element, property: row.property,
      reference: row.reference, astylar: row.astylar, occurrences: row.occurrences, cases: row.cases,
      states: row.states, canonicalRowSha256: digest(row), previousAttribution: row.attribution,
      observations: members.map(({ reference: _r, candidate: _a, state: _s, ...o }) => o) };
    if (row.attribution !== 'unresolved') { preserved.push(descriptor); continue; }
    selected.add(row);
    proposed.push({ ...descriptor, proposedClassification: 'parity-harness-defect',
      proposedAttribution: 'reviewed-expansion-panel-header-owner-mismatch',
      proposedOwner: 'Material comparison role mapping before style/layout attribution',
      justification: 'The original scalar compares the entire reference expansion panel with the candidate header button. Authenticated full trees and all original reference scalar properties establish noncorresponding owners before renderer interpretation. Raw differences remain; correct panel/header mappings require new capture and independent property review. This does not establish equal inputs, matching paint, or a core cause.',
      inputEquivalent: false, wholeElementInputEquivalent: false, renderingEquivalent: false,
      rendererCauseProven: false, canonicalMappingChanged: false });
  }
  assert.equal(owners.length, 102); assert.equal(proposed.length, 43); assert.equal(preserved.length, 59);
  return { originalCasesScanned: seen.size, ownerObservations: observations.length,
    canonicalOwnerGroups: owners.length, proposedGroups: proposed.length,
    proposedObservations: proposed.reduce((n, r) => n + r.occurrences, 0),
    preservedReviewedOwnerGroups: preserved.length, preserved,
    canonicalRows: rows.length, baselineUnresolved: rows.filter(r => r.attribution === 'unresolved').length,
    otherCompleteRows: rows.length - selected.size,
    otherOrderedRowDigestsSha256: digest(rows.filter(r => !selected.has(r)).map(digest)), proposed,
    disabledHeaderCursorDifferencesRetained: proof.counts.disabledHeaderCursorDifferences,
    canonicalAttributionChanged: false, inputEquivalent: false, renderingEquivalent: false,
    limitation: 'Preserved prior owner rows retain their existing narrow findings, not endorsement of role equivalence. All 102 original owner groups need role-correct recapture before input-equivalence acceptance; the eight disabled header cursor differences are a separate genuine authoring finding.' };
}

export async function collectExpansionOwnerAttribution() {
  const file = 'docs/material-expansion-owner-mapping.json', bytes = readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
  const proof = collectExpansionOwnerMapping(); assert.equal(bytes, JSON.stringify(proof, null, 2) + '\n');
  const source = readFileSync(proof.originalCapture.file); assert.equal(hash(source), proof.originalCapture.sha256);
  const normalize = bindOwnerCaretNormalization(readFileSync(normalization.module, 'utf8'), normalization);
  const canonical = await readCaretConservationRows(file => execFileSync('git', ['show', `${revision}:${file}`], { maxBuffer: 64 * 1024 * 1024 }));
  return { schemaVersion: 1, kind: 'expansion-owner-mismatch-proposed-attribution', canonicalRevision: revision,
    canonicalPayload: canonical.manifest, sourceProof: { file, sha256: hash(bytes) },
    originalCapture: proof.originalCapture, productionNormalization: normalization,
    ...planExpansionOwnerAttribution(proof, JSON.parse(source), canonical.rows, normalize) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2); assert.ok(!args.length || args.length === 1 && args[0] === '--check');
  const report = await collectExpansionOwnerAttribution(), file = 'docs/material-expansion-owner-attribution-plan.json';
  const output = JSON.stringify(report, null, 2) + '\n';
  if (args[0] === '--check') assert.equal(readFileSync(file, 'utf8').replaceAll('\r\n', '\n'), output); else writeFileSync(file, output);
  console.log(JSON.stringify({ groups: report.proposedGroups, observations: report.proposedObservations,
    preservedReviewedOwnerGroups: report.preservedReviewedOwnerGroups, otherCompleteRows: report.otherCompleteRows,
    otherOrderedRowDigestsSha256: report.otherOrderedRowDigestsSha256, reportSha256: hash(output), canonicalAttributionChanged: false }));
}
