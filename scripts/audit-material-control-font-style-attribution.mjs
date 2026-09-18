import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { collectControlFontStyleReset } from './audit-material-control-font-style-reset.mjs';
import { selectedButtonInputs } from '../tests/material-parity/button-pill-radius-evidence.mjs';
import { bindOwnerCaretNormalization } from '../tests/material-parity/owner-caret-source-binding.mjs';
import { readCaretConservationRows } from '../tests/material-parity/owner-caret-canonical-conservation.mjs';

const hash = x => createHash('sha256').update(x).digest('hex');
const digest = x => hash(JSON.stringify(x));
const signature = r => JSON.stringify([r.family, r.element, r.property, r.reference, r.astylar]);
const revision = '957774a';
const normalization = { module: 'tests/material-parity/input-equivalence-audit.mjs',
  functions: ['canonicalStyle', 'expandQuad', 'expandPair', 'splitCssTerms', 'normalizeValue', 'normalizeColor', 'formatNumber'],
  sha256: '8929720cf30769ac3148458bf954402466f6f296c0d764c3123cd797f1e9300e' };
const selected = e => [...selectedButtonInputs(e), ...e.styleInputs.filter(i =>
  e.family === 'slider' && ['slider-start', 'slider-primary'].includes(i.id))];

// Pure membership join. Source authenticity is established independently by the
// collector below; a matching font scalar alone never proves inherited intent.
export function planControlFontStyleAttribution(proof, original, rows, normalize) {
  for (const flag of ['canonicalAttributionChanged', 'rendererChanged', 'inputEquivalent', 'renderingEquivalent'])
    assert.equal(proof[flag], false);
  assert.equal(proof.observations, proof.findings.length);
  const proofs = new Map(proof.findings.map(f => [JSON.stringify([f.case, f.element]), f]));
  assert.equal(proofs.size, proof.observations);
  const seen = new Set(), cases = new Set(), groups = new Map();
  const counts = { buttonTexture: 0, rangeWithoutTextOwner: 0 };
  for (const [kind, entries] of [['static', original.results], ['interaction', original.interactions]]) for (const e of entries) {
    const caseId = `${kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`;
    assert.ok(!cases.has(caseId)); cases.add(caseId);
    for (const input of selected(e)) {
      const key = JSON.stringify([caseId, input.id]), f = proofs.get(key);
      assert.ok(f, 'original control lacks source proof'); assert.ok(!seen.has(key)); seen.add(key);
      assert.equal(f.family, e.family); assert.equal(f.profile, e.profile); assert.equal(f.state, e.state ?? 'static');
      assert.deepEqual(f.viewport, e.viewport); assert.deepEqual(f.inputTrees, e.inputTrees);
      assert.equal(f.originalInputSha256, digest(input), 'original input changed');
      const p = f.proof;
      assert.equal(p.property, 'fontStyle'); assert.equal(p.classification, 'application-plugin-authoring-defect');
      assert.equal(p.attribution, 'control-font-style-inheritance-reset-omission');
      assert.equal(p.referenceComputed, input.reference.fontStyle); assert.equal(p.referenceComputed, 'normal');
      assert.equal(p.candidateLocalDeclaration, '<omitted>');
      assert.deepEqual(p.referenceReset.declarations['font-style'], { value: 'inherit', important: false });
      assert.equal(p.referenceReset.selector, 'button, input, select'); assert.equal(p.referenceReset.cssText, 'font: inherit;');
      assert.deepEqual(p.translatedReset, { selector: 'button, input, select', fontFamily: 'Roboto, Arial, sans-serif' });
      assert.equal(p.candidateOwner.authored.id, input.id);
      for (const flag of ['inputEquivalent', 'wholeElementInputEquivalent', 'rendererCauseProven',
        'candidateComputedVerified', 'renderingEquivalent', 'nonNormalAncestorBehaviorVerified']) assert.equal(p[flag], false);
      const reference = normalize(input.reference).fontStyle;
      assert.equal(reference, 'normal'); assert.equal(normalize(input.astylar).fontStyle, undefined);
      const range = input.astylarStructure.type === 'input';
      if (range) {
        assert.equal(e.family, 'slider'); assert.ok(['slider-start', 'slider-primary'].includes(input.id));
        assert.deepEqual(p.observedTextStage, { kind: 'range-input-without-captured-text-owner', glyphComparisonApplicable: false });
        counts.rangeWithoutTextOwner++;
      } else {
        assert.equal(input.astylarStructure.type, 'button');
        assert.equal(p.observedTextStage.kind, 'core-control-texture');
        assert.equal(p.observedTextStage.fontStyle, 'normal'); assert.equal(p.observedTextStage.matchesCapturedReferenceScalar, true);
        assert.equal(p.observedTextStage.text, input.referenceStructure.text);
        assert.equal(p.observedTextStage.text, input.astylarStructure.ownText); counts.buttonTexture++;
      }
      const row = { family: e.family, element: input.id, property: 'fontStyle', reference }, id = signature(row);
      if (!groups.has(id)) groups.set(id, { ...row, occurrences: 0, cases: [], states: [], observations: [] });
      const g = groups.get(id); g.occurrences++;
      if (g.cases.length < 12) g.cases.push(caseId); if (!g.states.includes(f.state)) g.states.push(f.state);
      g.observations.push({ case: caseId, originalInputSha256: f.originalInputSha256,
        inputTrees: f.inputTrees, proofSha256: digest(p) });
    }
  }
  assert.equal(cases.size, proof.originalCasesScanned); assert.equal(seen.size, proof.observations);
  assert.deepEqual(counts, proof.counts);
  const proposed = [], chosen = new Set();
  for (const g of groups.values()) {
    const matches = rows.filter(r => signature(r) === signature(g));
    assert.equal(matches.length, 1, 'canonical control font-style group missing, split or duplicated');
    const row = matches[0]; assert.equal(row.attribution, 'unresolved', 'previous classification must not be overwritten');
    for (const field of ['occurrences', 'cases', 'states']) assert.deepEqual(row[field], g[field]);
    assert.ok(!chosen.has(row)); chosen.add(row);
    proposed.push({ ...g, canonicalRowSha256: digest(row), previousAttribution: row.attribution,
      proposedClassification: 'application-plugin-authoring-defect',
      proposedAttribution: 'reviewed-control-font-style-inheritance-reset-omission',
      proposedOwner: 'Material shared control font reset translation',
      justification: 'The reference authors font-style:inherit through font:inherit, while the candidate family-only reset and complete captured ancestry omit the request. Button textures already report normal and range inputs have no captured text owner. This proves omitted authored inheritance intent, not a current glyph mismatch, renderer inheritance failure or behavior under non-normal ancestors.',
      inputEquivalent: false, wholeElementInputEquivalent: false, renderingEquivalent: false,
      candidateComputedVerified: false, rendererCauseProven: false, nonNormalAncestorBehaviorVerified: false });
  }
  return { originalCasesScanned: cases.size, originalObservations: seen.size, counts,
    proposedGroups: proposed.length, proposedObservations: proposed.reduce((n, g) => n + g.occurrences, 0),
    canonicalRows: rows.length, baselineUnresolved: rows.filter(r => r.attribution === 'unresolved').length,
    otherCompleteRows: rows.length - chosen.size,
    otherOrderedRowDigestsSha256: digest(rows.filter(r => !chosen.has(r)).map(digest)), proposed,
    canonicalAttributionChanged: false, inputEquivalent: false, renderingEquivalent: false };
}

export async function collectControlFontStyleAttribution() {
  const file = 'docs/material-control-font-style-reset.json', bytes = readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
  const proof = collectControlFontStyleReset(); assert.equal(bytes, JSON.stringify(proof, null, 2) + '\n');
  const original = readFileSync(proof.originalCapture.file); assert.equal(hash(original), proof.originalCapture.sha256);
  const normalize = bindOwnerCaretNormalization(readFileSync(normalization.module, 'utf8'), normalization);
  const canonical = await readCaretConservationRows(f =>
    execFileSync('git', ['show', `${revision}:${f}`], { maxBuffer: 64 * 1024 * 1024 }));
  return { schemaVersion: 1, kind: 'control-font-style-reset-proposed-attribution',
    canonicalRevision: revision, canonicalPayload: canonical.manifest,
    sourceProof: { file, sha256: hash(bytes) }, originalCapture: proof.originalCapture,
    productionNormalization: normalization,
    ...planControlFontStyleAttribution(proof, JSON.parse(original), canonical.rows, normalize) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2); assert.ok(!args.length || args.length === 1 && args[0] === '--check');
  const report = await collectControlFontStyleAttribution(), file = 'docs/material-control-font-style-attribution-plan.json';
  const output = JSON.stringify(report, null, 2) + '\n';
  if (args[0] === '--check') assert.equal(readFileSync(file, 'utf8').replaceAll('\r\n', '\n'), output);
  else writeFileSync(file, output);
  console.log(JSON.stringify({ proposedGroups: report.proposedGroups, proposedObservations: report.proposedObservations,
    counts: report.counts, otherCompleteRows: report.otherCompleteRows,
    otherOrderedRowDigestsSha256: report.otherOrderedRowDigestsSha256,
    canonicalAttributionChanged: false, reportSha256: hash(output) }));
}
