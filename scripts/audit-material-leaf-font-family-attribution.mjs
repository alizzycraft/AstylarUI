import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { collectLeafFontFamily, leafFontFamilyTargets } from './audit-material-leaf-font-family-stages.mjs';
import { bindHistoricalAuditNormalization } from '../tests/material-parity/audit-normalization-contracts.mjs';
import { readCaretConservationRows } from '../tests/material-parity/owner-caret-canonical-conservation.mjs';

const hash = x => createHash('sha256').update(x).digest('hex');
const digest = x => hash(JSON.stringify(x));
const signature = r => JSON.stringify([r.family, r.element, r.property, r.reference, r.astylar]);
const canonicalRevision = '06e50dbcd3594c5987d63a4ec38e792b87b08dde';
const normalization = { module: 'tests/material-parity/input-equivalence-audit.mjs',
  functions: ['canonicalStyle', 'expandQuad', 'expandPair', 'splitCssTerms', 'normalizeValue', 'normalizeColor', 'formatNumber'],
  sha256: '8929720cf30769ac3148458bf954402466f6f296c0d764c3123cd797f1e9300e' };

export function planLeafFontFamilyAttribution(proof, original, rows, normalize) {
  for (const flag of ['canonicalAttributionChanged', 'rendererChanged', 'inputEquivalent', 'renderingEquivalent']) assert.equal(proof[flag], false);
  assert.equal(proof.observations, proof.findings.length);
  const byOwner = new Map(proof.findings.map(o => [JSON.stringify([o.case, o.element]), o]));
  assert.equal(byOwner.size, proof.findings.length);
  const groups = new Map(), seen = new Set(), cases = new Set();
  for (const [kind, entries] of [['static', original.results], ['interaction', original.interactions]]) for (const e of entries) {
    const caseId = `${kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`;
    assert.ok(!cases.has(caseId)); cases.add(caseId);
    for (const input of e.styleInputs.filter(i => Object.hasOwn(leafFontFamilyTargets, i.id))) {
      const key = JSON.stringify([caseId, input.id]), o = byOwner.get(key); assert.ok(o); assert.ok(!seen.has(key)); seen.add(key);
      assert.equal(o.family, e.family); assert.equal(o.profile, e.profile); assert.equal(o.state, e.state ?? 'static');
      assert.deepEqual(o.viewport, e.viewport); assert.deepEqual(o.inputTrees, e.inputTrees); assert.equal(o.originalInputSha256, digest(input));
      const p = o.proof; assert.equal(p.property, 'fontFamily'); assert.equal(p.classification, 'parity-harness-defect');
      assert.equal(p.attribution, 'plain-text-local-declaration-versus-retained-inherited-font-family');
      assert.equal(p.authoredFamilyInheritanceMatches, true); assert.equal(p.retainedFontFamilyMatches, true);
      assert.equal(p.candidateLocalFontFamily, '<omitted>'); assert.equal(p.retainedText.source, 'core-text-registry');
      for (const flag of ['physicalFontSelectionVerified', 'wholeElementInputEquivalent', 'renderingEquivalent', 'rendererCauseProven']) assert.equal(p[flag], false);
      const reference = normalize(input.reference).fontFamily;
      assert.equal(reference, 'roboto,arial,sans-serif'); assert.equal(normalize(input.astylar).fontFamily, undefined);
      assert.equal(normalize(p.retainedText.style).fontFamily, reference);
      assert.equal(p.referenceComputedFontFamily, input.reference.fontFamily);
      assert.equal(p.text, input.referenceStructure.text); assert.equal(p.text, input.astylarStructure.ownText);
      const identity = { family: e.family, element: input.id, property: 'fontFamily', reference };
      const id = JSON.stringify([kind, signature(identity)]);
      if (!groups.has(id)) groups.set(id, { ...identity, kind, occurrences: 0, cases: [], states: [], observations: [] });
      const g = groups.get(id); g.occurrences++;
      if (g.cases.length < 12) g.cases.push(caseId);
      if (!g.states.includes(o.state)) g.states.push(o.state);
      g.observations.push({ case: caseId, originalInputSha256: o.originalInputSha256, inputTrees: o.inputTrees, proofSha256: digest(p) });
    }
  }
  assert.equal(cases.size, proof.originalCasesScanned); assert.equal(seen.size, proof.observations);
  assert.deepEqual(Object.fromEntries(Object.keys(leafFontFamilyTargets).map(id => [id, proof.findings.filter(o => o.element === id).length])), proof.counts);
  const selected = new Set(), proposed = [], preservedStatic = [];
  for (const g of groups.values()) {
    const attribution = g.kind === 'static' ? 'reviewed-stage-mismatch' : 'unresolved';
    const matches = rows.filter(r => signature(r) === signature(g) && r.attribution === attribution);
    assert.equal(matches.length, 1, 'canonical leaf-family group missing, split or previously reclassified');
    const row = matches[0];
    for (const k of ['occurrences', 'cases', 'states']) assert.deepEqual(row[k], g[k]);
    const witness = { ...g, canonicalRowSha256: digest(row), previousAttribution: row.attribution };
    if (g.kind === 'static') preservedStatic.push(witness);
    else {
      assert.ok(!selected.has(row)); selected.add(row);
      proposed.push({ ...witness, proposedClassification: 'parity-harness-defect',
        proposedAttribution: 'reviewed-leaf-font-family-observation-stage',
        proposedOwner: 'Material audit local versus retained inherited text font-family',
        justification: 'Original own-text inheritance paths and separately retained core-text family agree with browser computed family, while candidate local declarations omit it. This explains the measurement-stage discrepancy only; physical font selection, loading, fallback, glyph paint, layout and other properties remain unproven.',
        inputEquivalent: false, physicalFontSelectionVerified: false, wholeElementInputEquivalent: false,
        renderingEquivalent: false, rendererCauseProven: false });
    }
  }
  return { originalCasesScanned: cases.size, originalObservations: seen.size,
    proposedGroups: proposed.length, proposedObservations: proposed.reduce((n, g) => n + g.occurrences, 0),
    preservedStaticGroups: preservedStatic.length, preservedStaticObservations: preservedStatic.reduce((n, g) => n + g.occurrences, 0),
    canonicalRows: rows.length, baselineUnresolved: rows.filter(r => r.attribution === 'unresolved').length,
    otherCompleteRows: rows.length - selected.size, otherOrderedRowDigestsSha256: digest(rows.filter(r => !selected.has(r)).map(digest)),
    proposed, preservedStatic, canonicalAttributionChanged: false, inputEquivalent: false, renderingEquivalent: false };
}

export async function collectLeafFontFamilyAttributionPlan() {
  const proofFile = 'docs/material-leaf-font-family-stages.json', bytes = readFileSync(proofFile, 'utf8').replaceAll('\r\n', '\n');
  const proof = collectLeafFontFamily(); assert.equal(bytes, JSON.stringify(proof, null, 2) + '\n');
  const originalBytes = readFileSync(proof.originalCapture.file); assert.equal(hash(originalBytes), proof.originalCapture.sha256);
  const normalize = bindHistoricalAuditNormalization(normalization, canonicalRevision);
  const { manifest, rows } = await readCaretConservationRows(file =>
    execFileSync('git', ['show', `${canonicalRevision}:${file}`], { maxBuffer: 64 * 1024 * 1024 }));
  return { schemaVersion: 1, kind: 'leaf-font-family-proposed-canonical-attribution', canonicalRevision, canonicalPayload: manifest,
    proof: { file: proofFile, sha256: hash(bytes) }, originalCapture: proof.originalCapture, productionNormalization: normalization,
    ...planLeafFontFamilyAttribution(proof, JSON.parse(originalBytes), rows, normalize) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2); assert.ok(!args.length || args.length === 1 && args[0] === '--check');
  const report = await collectLeafFontFamilyAttributionPlan(), file = 'docs/material-leaf-font-family-attribution-plan.json';
  const output = JSON.stringify(report, null, 2) + '\n';
  if (args.includes('--check')) assert.equal(readFileSync(file, 'utf8').replaceAll('\r\n', '\n'), output); else writeFileSync(file, output);
  console.log(JSON.stringify({ proposedGroups: report.proposedGroups, proposedObservations: report.proposedObservations,
    preservedStaticGroups: report.preservedStaticGroups, preservedStaticObservations: report.preservedStaticObservations,
    otherCompleteRows: report.otherCompleteRows, otherOrderedRowDigestsSha256: report.otherOrderedRowDigestsSha256,
    canonicalAttributionChanged: false, reportSha256: hash(output) }));
}
