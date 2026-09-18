import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { collectAdditionalControlFontStyle, additionalControlFontStyleTargets }
  from './audit-material-additional-control-font-style.mjs';
import { bindOwnerCaretNormalization } from '../tests/material-parity/owner-caret-source-binding.mjs';
import { readCaretConservationRows } from '../tests/material-parity/owner-caret-canonical-conservation.mjs';

const hash = x => createHash('sha256').update(x).digest('hex');
const digest = x => hash(JSON.stringify(x));
const key = r => JSON.stringify([r.family, r.element, r.property, r.reference, r.astylar]);
const revision = '957774a';
const normalization = { module: 'tests/material-parity/input-equivalence-audit.mjs',
  functions: ['canonicalStyle', 'expandQuad', 'expandPair', 'splitCssTerms', 'normalizeValue', 'normalizeColor', 'formatNumber'],
  sha256: '8929720cf30769ac3148458bf954402466f6f296c0d764c3123cd797f1e9300e' };

// Pure membership projection. It is not source authentication; the collector
// pins and independently regenerates the complete proof before calling it.
export function planAdditionalControlFontStyle(proof, original, rows, normalize) {
  for (const k of ['canonicalAttributionChanged', 'rendererChanged', 'inputEquivalent', 'renderingEquivalent']) assert.equal(proof[k], false);
  assert.equal(proof.observations, proof.findings.length);
  const proofs = new Map(proof.findings.map(f => [JSON.stringify([f.case, f.element]), f]));
  assert.equal(proofs.size, proof.observations);
  const cases = new Set(), seen = new Set(), groups = new Map();
  for (const [kind, entries] of [['static', original.results], ['interaction', original.interactions]]) for (const e of entries) {
    const caseId = `${kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`;
    assert.ok(!cases.has(caseId)); cases.add(caseId);
    for (const input of e.styleInputs.filter(i => Object.hasOwn(additionalControlFontStyleTargets, i.id))) {
      const id = JSON.stringify([caseId, input.id]), f = proofs.get(id);
      assert.ok(f, 'original additional control lacks proof'); assert.ok(!seen.has(id)); seen.add(id);
      assert.equal(e.family, additionalControlFontStyleTargets[input.id].family);
      assert.equal(f.family, e.family); assert.equal(f.profile, e.profile); assert.equal(f.state, e.state ?? 'static');
      assert.deepEqual(f.viewport, e.viewport); assert.deepEqual(f.inputTrees, e.inputTrees);
      assert.equal(f.originalInputSha256, digest(input));
      const p = f.proof;
      assert.equal(p.property, 'fontStyle'); assert.equal(p.classification, 'application-plugin-authoring-defect');
      assert.equal(p.attribution, 'additional-control-font-style-reset-omission');
      assert.equal(p.candidateOwner.authored.id, input.id);
      assert.equal(p.candidateOwner.authored.class, additionalControlFontStyleTargets[input.id].class);
      assert.deepEqual(p.referenceReset.declarations['font-style'], { value: 'inherit', important: false });
      assert.deepEqual(p.translatedReset, { selector: 'button, input, select', fontFamily: 'Roboto, Arial, sans-serif' });
      assert.equal(p.referenceComputed, input.reference.fontStyle); assert.equal(p.referenceComputed, 'normal');
      assert.equal(p.candidateLocalDeclaration, '<omitted>');
      assert.equal(p.observedTextStage.kind, 'core-control-texture'); assert.equal(p.observedTextStage.fontStyle, 'normal');
      assert.equal(p.observedTextStage.text, input.referenceStructure.text);
      assert.equal(p.observedTextStage.text, input.astylarStructure.ownText);
      for (const flag of ['inputEquivalent', 'wholeElementInputEquivalent', 'rendererCauseProven',
        'candidateComputedVerified', 'renderingEquivalent', 'nonNormalAncestorBehaviorVerified']) assert.equal(p[flag], false);
      assert.equal(normalize(input.reference).fontStyle, 'normal'); assert.equal(normalize(input.astylar).fontStyle, undefined);
      const row = { family: e.family, element: input.id, property: 'fontStyle', reference: 'normal' }, signature = key(row);
      if (!groups.has(signature)) groups.set(signature, { ...row, occurrences: 0, cases: [], states: [], observations: [] });
      const g = groups.get(signature); g.occurrences++;
      if (g.cases.length < 12) g.cases.push(caseId); if (!g.states.includes(f.state)) g.states.push(f.state);
      g.observations.push({ case: caseId, originalInputSha256: f.originalInputSha256,
        inputTrees: f.inputTrees, proofSha256: digest(p) });
    }
  }
  assert.equal(cases.size, proof.originalCasesScanned); assert.equal(seen.size, proof.observations);
  assert.deepEqual(Object.fromEntries(Object.keys(additionalControlFontStyleTargets).map(id =>
    [id, [...groups.values()].filter(g => g.element === id).reduce((n, g) => n + g.occurrences, 0)])), proof.counts);
  const selected = new Set(), proposed = [];
  for (const g of groups.values()) {
    const matches = rows.filter(r => key(r) === key(g)); assert.equal(matches.length, 1);
    const row = matches[0]; assert.equal(row.attribution, 'unresolved', 'earlier classification must not be overwritten');
    for (const k of ['occurrences', 'cases', 'states']) assert.deepEqual(row[k], g[k]);
    assert.ok(!selected.has(row)); selected.add(row);
    proposed.push({ ...g, canonicalRowSha256: digest(row), previousAttribution: row.attribution,
      proposedClassification: 'application-plugin-authoring-defect',
      proposedAttribution: 'reviewed-additional-control-font-style-reset-omission',
      proposedOwner: 'Material shared control font reset translation',
      justification: 'These four actual non-material-button controls explicitly inherit reference font style, but candidate family-only reset authoring omits it through their complete captured ancestry. Their original textures already report normal. This establishes omitted inheritance intent, not a glyph mismatch, a core inheritance defect, or behavior under non-normal ancestors.',
      inputEquivalent: false, wholeElementInputEquivalent: false, renderingEquivalent: false,
      candidateComputedVerified: false, rendererCauseProven: false, nonNormalAncestorBehaviorVerified: false });
  }
  return { originalCasesScanned: cases.size, originalObservations: seen.size, counts: proof.counts,
    proposedGroups: proposed.length, proposedObservations: proposed.reduce((n, p) => n + p.occurrences, 0),
    canonicalRows: rows.length, baselineUnresolved: rows.filter(r => r.attribution === 'unresolved').length,
    otherCompleteRows: rows.length - selected.size,
    otherOrderedRowDigestsSha256: digest(rows.filter(r => !selected.has(r)).map(digest)), proposed,
    canonicalAttributionChanged: false, inputEquivalent: false, renderingEquivalent: false };
}

export async function collectAdditionalControlFontStyleAttribution() {
  const file = 'docs/material-additional-control-font-style.json', bytes = readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
  const committed = execFileSync('git', ['show', `a0112fe:${file}`], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 }).replaceAll('\r\n', '\n');
  assert.equal(bytes, committed);
  const proof = collectAdditionalControlFontStyle(); assert.equal(bytes, JSON.stringify(proof, null, 2) + '\n');
  const source = readFileSync(proof.originalCapture.file); assert.equal(hash(source), proof.originalCapture.sha256);
  const normalize = bindOwnerCaretNormalization(readFileSync(normalization.module, 'utf8'), normalization);
  const canonical = await readCaretConservationRows(f => execFileSync('git', ['show', `${revision}:${f}`], { maxBuffer: 64 * 1024 * 1024 }));
  return { schemaVersion: 1, kind: 'additional-control-font-style-proposed-attribution',
    canonicalRevision: revision, canonicalPayload: canonical.manifest,
    sourceProof: { file, revision: 'a0112fe', sha256: hash(bytes) }, originalCapture: proof.originalCapture,
    productionNormalization: normalization,
    ...planAdditionalControlFontStyle(proof, JSON.parse(source), canonical.rows, normalize) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2); assert.ok(!args.length || args.length === 1 && args[0] === '--check');
  const report = await collectAdditionalControlFontStyleAttribution(), file = 'docs/material-additional-control-font-style-attribution-plan.json';
  assert.equal(report.proposedGroups, 4); assert.equal(report.proposedObservations, 168); assert.equal(report.otherCompleteRows, 8335);
  const output = JSON.stringify(report, null, 2) + '\n';
  if (args[0] === '--check') assert.equal(readFileSync(file, 'utf8').replaceAll('\r\n', '\n'), output); else writeFileSync(file, output);
  console.log(JSON.stringify({ proposedGroups: report.proposedGroups, proposedObservations: report.proposedObservations,
    otherCompleteRows: report.otherCompleteRows, otherOrderedRowDigestsSha256: report.otherOrderedRowDigestsSha256,
    reportSha256: hash(output), canonicalAttributionChanged: false }));
}
