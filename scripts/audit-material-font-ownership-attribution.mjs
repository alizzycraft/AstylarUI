import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { collectFontScopeInputs } from './audit-material-font-scope-inputs.mjs';
import { collectExpansionTitleInputs } from './audit-material-expansion-title-inputs.mjs';
import { collectTabPanelInputs } from './audit-material-tab-panel-inputs.mjs';
import { bindOwnerCaretNormalization } from '../tests/material-parity/owner-caret-source-binding.mjs';
import { readCaretConservationRows } from '../tests/material-parity/owner-caret-canonical-conservation.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const digest = value => hash(JSON.stringify(value));
const signature = row => JSON.stringify([row.family, row.element, row.property, row.reference, row.astylar]);
const canonicalRevision = '06e50dbcd3594c5987d63a4ec38e792b87b08dde';
const normalization = { module: 'tests/material-parity/input-equivalence-audit.mjs',
  functions: ['canonicalStyle', 'expandQuad', 'expandPair', 'splitCssTerms', 'normalizeValue', 'normalizeColor', 'formatNumber'],
  sha256: '8929720cf30769ac3148458bf954402466f6f296c0d764c3123cd797f1e9300e' };
const definitions = {
  scope: { file: 'docs/material-font-scope-inputs.json', collect: collectFontScopeInputs,
    targets: ['toolbar-primary', 'paginator-primary'], attribution: 'reviewed-component-font-declaration-scope' },
  expansion: { file: 'docs/material-expansion-title-inputs.json', collect: collectExpansionTitleInputs,
    targets: ['expansion-title'], attribution: 'reviewed-expansion-header-font-input-omission' },
  tab: { file: 'docs/material-tab-panel-inputs.json', collect: collectTabPanelInputs,
    targets: ['tab-panel'], attribution: 'reviewed-tab-panel-private-typography-inputs' },
};

export function planFontOwnershipAttribution(proofs, original, rows, normalize) {
  assert.deepEqual(Object.keys(proofs).sort(), Object.keys(definitions).sort());
  const observations = new Map(), seen = new Set(), cases = new Set(), groups = new Map(), matches = [];
  for (const [kind, proof] of Object.entries(proofs)) {
    assert.equal(proof.observations, proof.findings.length);
    for (const flag of ['canonicalAttributionChanged', 'rendererChanged', 'inputEquivalent']) assert.equal(proof[flag], false);
    for (const finding of proof.findings) {
      const key = JSON.stringify([finding.case, finding.element]); assert.ok(!observations.has(key));
      assert.ok(definitions[kind].targets.includes(finding.element)); observations.set(key, { kind, finding });
    }
  }
  for (const [mode, entries] of [['static', original.results], ['interaction', original.interactions]]) for (const entry of entries) {
    const caseId = `${mode}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`;
    assert.ok(!cases.has(caseId)); cases.add(caseId);
    const target = { toolbar: 'toolbar-primary', paginator: 'paginator-primary', expansion: 'expansion-title', tabs: 'tab-panel' }[entry.family];
    if (!target) continue;
    const inputs = entry.styleInputs.filter(i => i.id === target); assert.equal(inputs.length, 1);
    const input = inputs[0], key = JSON.stringify([caseId, input.id]), witness = observations.get(key);
    assert.ok(witness, 'original owner lacks proof'); assert.ok(!seen.has(key)); seen.add(key);
    const { kind, finding } = witness, p = finding.proof;
    assert.equal(finding.family, entry.family); assert.equal(finding.profile, entry.profile); assert.equal(finding.state, entry.state ?? 'static');
    assert.deepEqual(finding.viewport, entry.viewport); assert.deepEqual(finding.inputTrees, entry.inputTrees);
    assert.equal(finding.originalInputSha256, digest(input));
    assert.equal(p.classification, 'application-plugin-authoring-defect');
    for (const flag of ['rendererCauseProven', 'renderingEquivalent']) assert.equal(p[flag], false);
    assert.equal(kind === 'scope' ? p.wholeElementInputEquivalent : p.inputEquivalent, false);
    assert.equal(p.referenceComputedFontSize, input.reference.fontSize);
    assert.equal(p.candidateLocalFontSize, input.astylar.fontSize ?? '<omitted>');
    for (const stage of ['astylarNormalResolvedStyle', 'astylarInteractionResolvedStyle']) assert.equal(input[stage].fontSize, input.astylar.fontSize);
    if (kind === 'scope') assert.equal(p.sameInheritanceScope, false);
    if (kind === 'expansion') {
      assert.equal(p.sameInheritanceScope, false); assert.equal(p.retainedText.source, 'core-text-registry');
      assert.equal(p.retainedFontSizeMatches, p.retainedText.style.fontSize === input.reference.fontSize);
    }
    if (kind === 'tab') {
      assert.equal(p.perCasePaintVerified, false); assert.equal(p.numericDataSizeMatches, true);
      assert.equal(`${p.privateData['font-size']}px`, input.reference.fontSize);
    }
    const reference = normalize(input.reference).fontSize, astylar = normalize(input.astylar).fontSize;
    const observation = { case: caseId, originalInputSha256: finding.originalInputSha256,
      inputTrees: finding.inputTrees, proofSha256: digest(p) };
    if (reference === astylar) { assert.equal(kind, 'expansion'); matches.push(observation); continue; }
    assert.equal(astylar, undefined);
    // Only six static expansion omissions have a matching retained size and
    // the prior stage review. Three custom static omissions remain unresolved
    // together with 42 interactive omissions; do not erase that distinction.
    const prior = kind === 'expansion' && mode === 'static' && p.retainedFontSizeMatches
      ? 'reviewed-stage-mismatch' : 'unresolved';
    const identity = { family: entry.family, element: input.id, property: 'fontSize', reference };
    const sig = JSON.stringify([signature(identity), prior]);
    if (!groups.has(sig)) groups.set(sig, { ...identity, kind, prior, occurrences: 0, cases: [], states: [], observations: [] });
    const group = groups.get(sig); assert.equal(group.kind, kind); group.occurrences++;
    if (group.cases.length < 12) group.cases.push(caseId);
    if (!group.states.includes(entry.state ?? 'static')) group.states.push(entry.state ?? 'static');
    group.observations.push(observation);
  }
  for (const proof of Object.values(proofs)) assert.equal(cases.size, proof.originalCasesScanned);
  assert.equal(seen.size, observations.size, 'unused proof owner');
  const selected = new Set(), proposed = [], preserved = [];
  for (const group of groups.values()) {
    const found = rows.filter(r => signature(r) === signature(group) && r.attribution === group.prior);
    assert.equal(found.length, 1, 'missing, duplicate or changed canonical group');
    const row = found[0];
    for (const field of ['occurrences', 'cases', 'states']) assert.deepEqual(row[field], group[field], `incomplete canonical ${field}`);
    const joined = { ...group, canonicalRowSha256: digest(row) };
    if (group.prior !== 'unresolved') { preserved.push(joined); continue; }
    assert.ok(!selected.has(row)); selected.add(row);
    proposed.push({ ...joined, proposedClassification: 'application-plugin-authoring-defect',
      proposedAttribution: definitions[group.kind].attribution,
      inputEquivalent: false, rendererCauseProven: false, renderingEquivalent: false });
  }
  return { originalCasesScanned: cases.size, originalObservations: seen.size,
    matchingScalarObservations: matches.length, matches, proposedGroups: proposed.length,
    proposedObservations: proposed.reduce((n, g) => n + g.occurrences, 0),
    preservedGroups: preserved.length, preservedObservations: preserved.reduce((n, g) => n + g.occurrences, 0),
    canonicalRows: rows.length, baselineUnresolved: rows.filter(r => r.attribution === 'unresolved').length,
    otherCompleteRows: rows.length - selected.size,
    otherOrderedRowDigestsSha256: digest(rows.filter(r => !selected.has(r)).map(digest)),
    proposed, preserved, canonicalAttributionChanged: false, inputEquivalent: false, renderingEquivalent: false };
}

export async function collectFontOwnershipAttributionPlan() {
  const proofs = {}, descriptors = {};
  for (const [kind, definition] of Object.entries(definitions)) {
    const bytes = readFileSync(definition.file, 'utf8').replaceAll('\r\n', '\n'), proof = definition.collect();
    assert.equal(bytes, JSON.stringify(proof, null, 2) + '\n', 'source proof must independently replay');
    proofs[kind] = proof; descriptors[kind] = { file: definition.file, sha256: hash(bytes) };
  }
  const originalCapture = proofs.scope.originalCapture;
  for (const proof of Object.values(proofs)) assert.deepEqual(proof.originalCapture, originalCapture);
  const bytes = readFileSync(originalCapture.file); assert.equal(hash(bytes), originalCapture.sha256);
  const normalize = bindOwnerCaretNormalization(readFileSync(normalization.module, 'utf8'), normalization);
  const { manifest, rows } = await readCaretConservationRows(file =>
    execFileSync('git', ['show', `${canonicalRevision}:${file}`], { maxBuffer: 64 * 1024 * 1024 }));
  return { schemaVersion: 1, kind: 'source-bound-font-ownership-attribution-proposal',
    scope: 'Proposal only. Prior complete rows and matching scalars are preserved; no canonical or renderer changes.',
    proofs: descriptors, originalCapture, canonicalRevision, canonicalPayload: manifest, productionNormalization: normalization,
    ...planFontOwnershipAttribution(proofs, JSON.parse(bytes), rows, normalize) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2); assert.ok(!args.length || args.length === 1 && args[0] === '--check');
  const report = await collectFontOwnershipAttributionPlan(), file = 'docs/material-font-ownership-attribution-plan.json';
  const output = JSON.stringify(report, null, 2) + '\n';
  if (args[0] === '--check') assert.equal(readFileSync(file, 'utf8').replaceAll('\r\n', '\n'), output); else writeFileSync(file, output);
  console.log(JSON.stringify({ proposedGroups: report.proposedGroups, proposedObservations: report.proposedObservations,
    preservedGroups: report.preservedGroups, preservedObservations: report.preservedObservations,
    matchingScalarObservations: report.matchingScalarObservations, otherCompleteRows: report.otherCompleteRows,
    reportSha256: hash(output), canonicalAttributionChanged: false }));
}
