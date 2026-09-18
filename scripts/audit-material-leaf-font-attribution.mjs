import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { collectLeafFontStages } from './audit-material-leaf-font-stages.mjs';
import { bindOwnerCaretNormalization } from '../tests/material-parity/owner-caret-source-binding.mjs';
import { readCaretConservationRows } from '../tests/material-parity/owner-caret-canonical-conservation.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const digest = value => hash(JSON.stringify(value));
const same = (a, b, message) => assert.ok(isDeepStrictEqual(a, b), message);
const signature = row => JSON.stringify([row.family, row.element, row.property, row.reference, row.astylar]);
const targets = ['badge-label', 'card-copy', 'divider-above', 'divider-below', 'stepper-content'];
const canonicalRevision = '06e50dbcd3594c5987d63a4ec38e792b87b08dde';
const normalization = { module: 'tests/material-parity/input-equivalence-audit.mjs',
  functions: ['canonicalStyle', 'expandQuad', 'expandPair', 'splitCssTerms', 'normalizeValue', 'normalizeColor', 'formatNumber'],
  sha256: '8929720cf30769ac3148458bf954402466f6f296c0d764c3123cd797f1e9300e' };

// Join only after independent source/tree replay. Existing static classifications
// remain witnesses, not new promotions. Candidate omissions remain omitted.
export function planLeafFontAttribution(proof, original, rows, normalize) {
  assert.equal(proof.canonicalAttributionChanged, false); assert.equal(proof.inputEquivalent, false);
  assert.equal(proof.observations, proof.findings.length);
  const observations = new Map(proof.findings.map(o => [JSON.stringify([o.case, o.element]), o]));
  assert.equal(observations.size, proof.findings.length, 'duplicate proof observation');
  const cases = new Set(), seen = new Set(), groups = new Map();
  for (const [kind, entries] of [['static', original.results], ['interaction', original.interactions]]) for (const entry of entries) {
    const caseId = `${kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`;
    assert.ok(!cases.has(caseId)); cases.add(caseId);
    for (const input of entry.styleInputs) {
      if (!targets.includes(input.id)) continue;
      const key = JSON.stringify([caseId, input.id]), observation = observations.get(key);
      assert.ok(observation, 'original observation lacks proof'); assert.ok(!seen.has(key)); seen.add(key);
      assert.equal(observation.family, entry.family); same(observation.viewport, entry.viewport, 'viewport changed');
      assert.equal(observation.state, entry.state ?? 'static'); same(observation.inputTrees, entry.inputTrees, 'trees changed');
      assert.equal(observation.originalInputSha256, digest(input), 'original input changed');
      const p = observation.proof, reference = normalize(input.reference).fontSize;
      assert.equal(normalize(input.astylar).fontSize, undefined);
      assert.equal(reference, p.referenceComputedFontSize);
      assert.equal(reference, normalize(p.retainedText.style).fontSize);
      assert.equal(p.retainedText.source, 'core-text-registry'); assert.equal(p.retainedFontSizeMatches, true);
      assert.equal(p.candidateLocalFontSize, '<omitted>'); assert.equal(p.classification, 'parity-harness-defect');
      assert.equal(p.attribution, 'plain-text-local-declaration-versus-retained-inherited-font-size');
      for (const flag of ['wholeElementInputEquivalent', 'renderingEquivalent', 'rendererCauseProven']) assert.equal(p[flag], false);
      assert.equal(p.text, input.referenceStructure.text); assert.equal(p.text, input.astylarStructure.ownText);
      const identity = { family: entry.family, element: input.id, property: 'fontSize', reference };
      const id = JSON.stringify([kind, signature(identity)]);
      if (!groups.has(id)) groups.set(id, { ...identity, kind, occurrences: 0, cases: [], states: [], observations: [] });
      const group = groups.get(id); group.occurrences++;
      if (group.cases.length < 12) group.cases.push(caseId);
      if (!group.states.includes(entry.state ?? 'static')) group.states.push(entry.state ?? 'static');
      group.observations.push({ case: caseId, originalInputSha256: observation.originalInputSha256,
        inputTrees: observation.inputTrees, proofSha256: digest(p) });
    }
  }
  assert.equal(cases.size, proof.originalCasesScanned); assert.equal(seen.size, observations.size);
  const selected = new Set(), proposed = [], preservedStatic = [];
  for (const group of groups.values()) {
    const expectedAttribution = group.kind === 'static' ? 'reviewed-stage-mismatch' : 'unresolved';
    const matches = rows.filter(r => signature(r) === signature(group) && r.attribution === expectedAttribution);
    assert.equal(matches.length, 1, 'missing, changed or split canonical classification');
    const row = matches[0];
    for (const field of ['occurrences', 'cases', 'states']) same(row[field], group[field], `canonical ${field} changed`);
    const witness = { ...group, canonicalRowSha256: digest(row), previousAttribution: row.attribution };
    if (group.kind === 'static') preservedStatic.push(witness);
    else {
      assert.ok(!selected.has(row)); selected.add(row);
      proposed.push({ ...witness, proposedClassification: 'parity-harness-defect',
        proposedAttribution: 'reviewed-leaf-font-size-observation-stage',
        proposedOwner: 'Material audit local versus retained inherited text font-size',
        justification: 'Original own-text ancestry and separately captured core text-registry inputs match the browser computed font size while candidate normal/effective/comparison declarations omit it. This explains only the measurement-stage difference, not current pseudo-state glyph paint or other input/layout/raster equivalence.',
        wholeElementInputEquivalent: false, renderingEquivalent: false, rendererCauseProven: false });
    }
  }
  return { originalCasesScanned: cases.size, originalObservations: seen.size,
    proposedGroups: proposed.length, proposedObservations: proposed.reduce((n, g) => n + g.occurrences, 0),
    preservedStaticGroups: preservedStatic.length, preservedStaticObservations: preservedStatic.reduce((n, g) => n + g.occurrences, 0),
    canonicalRows: rows.length, baselineUnresolved: rows.filter(r => r.attribution === 'unresolved').length,
    otherCompleteRows: rows.length - selected.size,
    otherOrderedRowDigestsSha256: digest(rows.filter(r => !selected.has(r)).map(digest)),
    proposed, preservedStatic, canonicalAttributionChanged: false, inputEquivalent: false, renderingEquivalent: false };
}

export async function collectLeafFontAttributionPlan() {
  const proofFile = 'docs/material-leaf-font-stages.json', bytes = readFileSync(proofFile, 'utf8').replaceAll('\r\n', '\n');
  const proof = collectLeafFontStages(); assert.equal(bytes, JSON.stringify(proof, null, 2) + '\n');
  const originalBytes = readFileSync(proof.originalCapture.file); assert.equal(hash(originalBytes), proof.originalCapture.sha256);
  const normalize = bindOwnerCaretNormalization(readFileSync(normalization.module, 'utf8'), normalization);
  const { manifest, rows } = await readCaretConservationRows(file =>
    execFileSync('git', ['show', `${canonicalRevision}:${file}`], { maxBuffer: 64 * 1024 * 1024 }));
  return { schemaVersion: 1, kind: 'leaf-font-stage-proposed-canonical-attribution',
    scope: 'Source-bound proposal only; no canonical classifications or raw observations changed.',
    proof: { file: proofFile, sha256: hash(bytes) }, originalCapture: proof.originalCapture,
    productionNormalization: normalization, canonicalRevision, canonicalPayload: manifest,
    ...planLeafFontAttribution(proof, JSON.parse(originalBytes), rows, normalize) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2); assert.ok(!args.length || args.length === 1 && args[0] === '--check');
  const report = await collectLeafFontAttributionPlan(), file = 'docs/material-leaf-font-attribution-plan.json';
  const output = JSON.stringify(report, null, 2) + '\n';
  if (args[0] === '--check') assert.equal(readFileSync(file, 'utf8').replaceAll('\r\n', '\n'), output);
  else writeFileSync(file, output);
  console.log(JSON.stringify({ proposedGroups: report.proposedGroups, proposedObservations: report.proposedObservations,
    preservedStaticGroups: report.preservedStaticGroups, preservedStaticObservations: report.preservedStaticObservations,
    otherCompleteRows: report.otherCompleteRows, baselineUnresolved: report.baselineUnresolved,
    canonicalAttributionChanged: false, reportSha256: hash(output) }));
}
