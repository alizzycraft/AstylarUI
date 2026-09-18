import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { collectLeafWeightTracking } from './audit-material-leaf-weight-tracking-stages.mjs';
import { readCaretConservationRows } from '../tests/material-parity/owner-caret-canonical-conservation.mjs';
import { bindOwnerCaretNormalization } from '../tests/material-parity/owner-caret-source-binding.mjs';

const hash = x => createHash('sha256').update(x).digest('hex');
const digest = x => hash(JSON.stringify(x));
const key = r => JSON.stringify([r.family, r.element, r.property, r.reference, r.astylar]);
const revision = '957774a';

export function planLeafWeightTracking(proof, original, rows, normalize) {
  for (const flag of ['canonicalAttributionChanged', 'rendererChanged', 'inputEquivalent', 'renderingEquivalent']) assert.equal(proof[flag], false);
  assert.equal(proof.observations, proof.findings.length);
  const entries = new Map([['static', original.results], ['interaction', original.interactions]].flatMap(([kind, es]) =>
    es.map(e => [`${kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`, e])));
  assert.equal(entries.size, proof.originalCasesScanned);
  assert.equal(entries.size, original.results.length + original.interactions.length);
  const groups = new Map(), seen = new Set();
  for (const f of proof.findings) {
    const e = entries.get(f.case); assert.ok(e);
    const identity = JSON.stringify([f.case, f.element, f.property]); assert.ok(!seen.has(identity)); seen.add(identity);
    assert.equal(f.family, e.family); assert.equal(f.profile, e.profile); assert.equal(f.state, e.state ?? 'static');
    assert.deepEqual(f.viewport, e.viewport); assert.deepEqual(f.inputTrees, e.inputTrees);
    const inputs = e.styleInputs.filter(i => i.id === f.element); assert.equal(inputs.length, 1);
    const input = inputs[0]; assert.equal(digest(input), f.originalInputSha256);
    const p = f.proof; assert.equal(p.property, f.property); assert.ok(['fontWeight', 'letterSpacing'].includes(p.property));
    assert.equal(p.classification, 'parity-harness-defect'); assert.equal(p.attribution, 'own-text-local-versus-retained-weight-tracking-stage');
    assert.equal(p.retainedScalarMatches, true); assert.equal(p.retainedText.source, 'core-text-registry');
    assert.equal(p.text, input.astylarStructure.ownText); assert.equal(p.text, input.referenceStructure.text);
    assert.equal(p.referenceRaw, input.reference[p.property]); assert.equal(p.candidateLocalRaw, '<omitted>');
    assert.equal(p.retainedRaw, p.retainedText.style[p.property]);
    const reference = normalize(input.reference)[p.property], candidate = normalize(input.astylar)[p.property];
    assert.equal(reference, p.normalizedReference); assert.equal(reference, p.normalizedRetained);
    assert.equal(normalize(p.retainedText.style)[p.property], reference); assert.equal(candidate, undefined);
    for (const flag of ['inputEquivalent', 'wholeElementInputEquivalent', 'rendererCauseProven', 'renderingEquivalent', 'physicalFontSelectionVerified']) assert.equal(p[flag], false);
    const kind = f.case.startsWith('static:') ? 'static' : 'interaction';
    const row = { family: f.family, element: f.element, property: f.property, reference }, id = JSON.stringify([kind, key(row)]);
    if (!groups.has(id)) groups.set(id, { ...row, kind, occurrences: 0, cases: [], states: [], observations: [] });
    const g = groups.get(id); g.occurrences++;
    if (g.cases.length < 12) g.cases.push(f.case); if (!g.states.includes(f.state)) g.states.push(f.state);
    g.observations.push({ case: f.case, originalInputSha256: f.originalInputSha256, inputTrees: f.inputTrees, proofSha256: digest(p) });
  }
  assert.equal(seen.size, proof.observations);
  const selected = new Set(), proposed = [], preserved = [];
  for (const g of groups.values()) {
    const attribution = g.kind === 'static' ? 'reviewed-stage-mismatch' : 'unresolved';
    const matches = rows.filter(r => key(r) === key(g) && r.attribution === attribution);
    assert.equal(matches.length, 1, 'exact original canonical group missing or ambiguous');
    const row = matches[0];
    for (const field of ['occurrences', 'cases', 'states']) assert.deepEqual(row[field], g[field]);
    const descriptor = { ...g, canonicalRowSha256: digest(row), previousAttribution: row.attribution };
    if (g.kind === 'static') { preserved.push(descriptor); continue; }
    assert.ok(!selected.has(row)); selected.add(row);
    proposed.push({ ...descriptor, proposedClassification: 'parity-harness-defect',
      proposedAttribution: 'reviewed-leaf-weight-tracking-observation-stage',
      proposedOwner: 'Material local style versus retained own-text typography boundary',
      justification: 'Original own-text paths and retained core-text provenance show weight/tracking values matching the reference scalar under unchanged normalization, while candidate local declarations omit them. Raw omission and prior static reviews remain intact. Physical font, glyph spacing, layout and whole-element equivalence remain unproven.',
      inputEquivalent: false, wholeElementInputEquivalent: false, renderingEquivalent: false, rendererCauseProven: false });
  }
  return { originalCasesScanned: entries.size, originalObservations: seen.size, proposedGroups: proposed.length,
    proposedObservations: proposed.reduce((n, r) => n + r.occurrences, 0), preservedStaticGroups: preserved.length,
    preservedStaticObservations: preserved.reduce((n, r) => n + r.occurrences, 0),
    canonicalRows: rows.length, baselineUnresolved: rows.filter(r => r.attribution === 'unresolved').length,
    otherCompleteRows: rows.length - selected.size, otherOrderedRowDigestsSha256: digest(rows.filter(r => !selected.has(r)).map(digest)),
    proposed, preserved, canonicalAttributionChanged: false, inputEquivalent: false, renderingEquivalent: false };
}

export async function collectLeafWeightTrackingAttribution() {
  const file = 'docs/material-leaf-weight-tracking-stages.json', bytes = readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
  const proof = collectLeafWeightTracking(); assert.equal(bytes, JSON.stringify(proof, null, 2) + '\n');
  const source = readFileSync(proof.originalCapture.file); assert.equal(hash(source), proof.originalCapture.sha256);
  const normalize = bindOwnerCaretNormalization(readFileSync(proof.productionNormalization.module, 'utf8'), proof.productionNormalization);
  const canonical = await readCaretConservationRows(f => execFileSync('git', ['show', `${revision}:${f}`], { maxBuffer: 64 * 1024 * 1024 }));
  return { schemaVersion: 1, kind: 'leaf-weight-tracking-proposed-attribution', canonicalRevision: revision,
    canonicalPayload: canonical.manifest, sourceProof: { file, sha256: hash(bytes) }, originalCapture: proof.originalCapture,
    productionNormalization: proof.productionNormalization,
    ...planLeafWeightTracking(proof, JSON.parse(source), canonical.rows, normalize) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2); assert.ok(!args.length || args.length === 1 && args[0] === '--check');
  const report = await collectLeafWeightTrackingAttribution(), file = 'docs/material-leaf-weight-tracking-attribution-plan.json';
  const output = JSON.stringify(report, null, 2) + '\n';
  if (args[0] === '--check') assert.equal(readFileSync(file, 'utf8').replaceAll('\r\n', '\n'), output); else writeFileSync(file, output);
  console.log(JSON.stringify({ proposedGroups: report.proposedGroups, proposedObservations: report.proposedObservations,
    preservedStaticGroups: report.preservedStaticGroups, preservedStaticObservations: report.preservedStaticObservations,
    otherCompleteRows: report.otherCompleteRows, otherOrderedRowDigestsSha256: report.otherOrderedRowDigestsSha256,
    reportSha256: hash(output), canonicalAttributionChanged: false }));
}
