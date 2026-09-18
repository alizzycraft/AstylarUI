import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { collectButtonHoverComposition } from './audit-material-button-hover-composition.mjs';
import { bindOwnerCaretNormalization } from '../tests/material-parity/owner-caret-source-binding.mjs';
import { readCaretConservationRows } from '../tests/material-parity/owner-caret-canonical-conservation.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const digest = value => hash(JSON.stringify(value));
const same = (a, b, message) => assert.ok(isDeepStrictEqual(a, b), message);
const key = e => `interaction:button@${e.profile}/${e.viewport.id}/${e.state}`;
const signature = row => JSON.stringify([row.family, row.element, row.property, row.reference, row.astylar]);
const canonicalRevision = '06e50dbcd3594c5987d63a4ec38e792b87b08dde';
const normalization = {
  module: 'tests/material-parity/input-equivalence-audit.mjs',
  functions: ['canonicalStyle', 'expandQuad', 'expandPair', 'splitCssTerms', 'normalizeValue', 'normalizeColor', 'formatNumber'],
  sha256: '8929720cf30769ac3148458bf954402466f6f296c0d764c3123cd797f1e9300e',
};

// Pure join after the caller has independently replayed/authenticated the proof,
// original capture and complete canonical payload. Never derives expected
// membership by filtering whichever canonical rows happen to remain.
export function planButtonPaintAttribution(proof, original, canonicalRows, normalize) {
  assert.equal(proof.canonicalAttributionChanged, false);
  assert.equal(proof.inputEquivalent, false);
  assert.equal(proof.cases, proof.observations.length);
  const observations = new Map(proof.observations.map(o => [key(o), o]));
  assert.equal(observations.size, proof.observations.length, 'duplicate proof state');
  const seen = new Set(), groups = new Map(), cases = new Set();
  let scanned = 0, primary = 0, equalBackgrounds = 0;
  for (const [kind, entries] of [['static', original.results], ['interaction', original.interactions]]) {
    for (const entry of entries) {
      scanned++;
      const caseId = `${kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`;
      assert.ok(!cases.has(caseId), 'duplicate original case'); cases.add(caseId);
      if (entry.family !== 'button') continue;
      const inputs = entry.styleInputs.filter(i => i.id === 'button-primary');
      assert.equal(inputs.length, 1); primary++;
      const input = inputs[0], r = normalize(input.reference), a = normalize(input.astylar);
      assert.equal(typeof r.backgroundColor, 'string'); assert.equal(typeof a.backgroundColor, 'string');
      if (r.backgroundColor === a.backgroundColor) { equalBackgrounds++; continue; }
      assert.equal(kind, 'interaction');
      const observation = observations.get(caseId); assert.ok(observation, 'unequal original case lacks proof');
      assert.ok(!seen.has(caseId)); seen.add(caseId);
      same(observation.viewport, entry.viewport, 'complete viewport changed');
      same(observation.inputTrees, entry.inputTrees, 'original trees changed');
      assert.equal(observation.originalInputSha256, digest(input), 'original scalar input changed');
      const p = observation.proof;
      assert.equal(p.state, entry.state);
      assert.equal(p.classification, 'application-plugin-authoring-defect');
      for (const flag of ['inputEquivalent', 'renderedCompositeVerified', 'rendererCauseProven']) assert.equal(p[flag], false);
      assert.equal(p.referenceBackground, input.reference.backgroundColor);
      assert.equal(p.candidateNormalBackground, input.astylarNormalResolvedStyle.background);
      assert.equal(p.candidateEffectiveBackground, input.astylar.background);
      assert.equal(p.candidateEffectiveBackground, input.astylarInteractionResolvedStyle.background);
      const identity = { family: 'button', element: 'button-primary', property: 'backgroundColor',
        reference: r.backgroundColor, astylar: a.backgroundColor };
      const id = signature(identity);
      if (!groups.has(id)) groups.set(id, { ...identity, occurrences: 0, cases: [], states: [], observations: [] });
      const group = groups.get(id); group.occurrences++;
      if (group.cases.length < 12) group.cases.push(caseId);
      if (!group.states.includes(entry.state)) group.states.push(entry.state);
      group.observations.push({ case: caseId, inputSha256: observation.originalInputSha256,
        inputTrees: observation.inputTrees, checkpoint: observation.checkpoint, proofSha256: digest(p) });
    }
  }
  same([scanned, primary, equalBackgrounds, seen.size],
    [proof.originalCasesScanned, proof.primaryCases, proof.equalBackgroundCasesRetained, observations.size],
    'complete original background population changed');
  const selected = new Set(), findings = [];
  for (const [id, group] of groups) {
    const matches = canonicalRows.filter(row => signature(row) === id);
    assert.equal(matches.length, 1, 'canonical group missing, duplicated or split');
    const row = matches[0]; assert.equal(row.attribution, 'unresolved', 'existing classification must not be replaced');
    for (const field of ['occurrences', 'cases', 'states']) same(row[field], group[field], `canonical ${field} incomplete`);
    assert.ok(!selected.has(row)); selected.add(row);
    findings.push({ ...group, canonicalRowSha256: digest(row),
      proposedClassification: 'application-plugin-authoring-defect',
      proposedAttribution: 'reviewed-button-state-layer-preblending',
      proposedOwner: 'Material showcase button state-layer authoring',
      justification: 'The complete original state population replaces a separately generated token-colored alpha layer with an opaque preblended host background. The unequal authored paint composition is retained; arithmetic agreement does not prove composited raster equivalence or a renderer defect.',
      inputEquivalent: false, renderedCompositeVerified: false, rendererCauseProven: false });
  }
  assert.equal(selected.size, groups.size);
  return { originalCasesScanned: scanned, primaryCases: primary, equalBackgroundCasesRetained: equalBackgrounds,
    proposedGroups: findings.length, proposedObservations: seen.size,
    canonicalRows: canonicalRows.length, baselineUnresolved: canonicalRows.filter(r => r.attribution === 'unresolved').length,
    otherCompleteRows: canonicalRows.length - selected.size,
    otherOrderedRowDigestsSha256: digest(canonicalRows.filter(r => !selected.has(r)).map(digest)),
    findings, canonicalAttributionChanged: false, inputEquivalent: false, renderingEquivalent: false };
}

export async function collectButtonPaintAttributionPlan() {
  const proofFile = 'docs/material-button-hover-composition.json', proofBytes = readFileSync(proofFile, 'utf8').replaceAll('\r\n', '\n');
  const proof = collectButtonHoverComposition();
  assert.equal(proofBytes, JSON.stringify(proof, null, 2) + '\n', 'composition proof must replay from original sources');
  const originalBytes = readFileSync(proof.originalCapture.file);
  assert.equal(hash(originalBytes), proof.originalCapture.sha256);
  const source = readFileSync(normalization.module, 'utf8');
  const normalize = bindOwnerCaretNormalization(source, normalization);
  // A fixed pre-integration parent prevents a later inventory refresh or actual
  // promotion from silently rewriting the proposal's original-row witness.
  const { manifest, rows } = await readCaretConservationRows(file =>
    execFileSync('git', ['show', `${canonicalRevision}:${file}`], { maxBuffer: 64 * 1024 * 1024 }));
  return { schemaVersion: 1, kind: 'button-state-layer-proposed-canonical-attribution',
    scope: 'Source-bound proposal only; does not mutate or promote any canonical discrepancy.',
    proof: { file: proofFile, sha256: hash(proofBytes) }, originalCapture: proof.originalCapture,
    productionNormalization: normalization, canonicalRevision, canonicalPayload: manifest,
    ...planButtonPaintAttribution(proof, JSON.parse(originalBytes), rows, normalize) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2); assert.ok(!args.length || args.length === 1 && args[0] === '--check');
  const report = await collectButtonPaintAttributionPlan(), file = 'docs/material-button-paint-attribution-plan.json';
  const output = JSON.stringify(report, null, 2) + '\n';
  if (args[0] === '--check') assert.equal(readFileSync(file, 'utf8').replaceAll('\r\n', '\n'), output);
  else writeFileSync(file, output);
  console.log(JSON.stringify({ proposedGroups: report.proposedGroups, proposedObservations: report.proposedObservations,
    otherCompleteRows: report.otherCompleteRows, baselineUnresolved: report.baselineUnresolved,
    canonicalAttributionChanged: false, reportSha256: hash(output) }));
}
