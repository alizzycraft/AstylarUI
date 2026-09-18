import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { collectContainerFontInputs } from './audit-material-container-font-inputs.mjs';
import { collectRangeFontReset } from './audit-material-range-font-reset.mjs';
import { collectSliderDisabledInputs } from './audit-material-slider-disabled-inputs.mjs';
import { bindOwnerCaretNormalization } from '../tests/material-parity/owner-caret-source-binding.mjs';
import { readCaretConservationRows } from '../tests/material-parity/owner-caret-canonical-conservation.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const digest = value => hash(JSON.stringify(value));
const signature = row => JSON.stringify([row.family, row.element, row.property, row.reference, row.astylar]);
const identity = (caseId, element) => JSON.stringify([caseId, element]);
const canonicalRevision = '06e50dbcd3594c5987d63a4ec38e792b87b08dde';
const normalization = {
  module: 'tests/material-parity/input-equivalence-audit.mjs',
  functions: ['canonicalStyle', 'expandQuad', 'expandPair', 'splitCssTerms', 'normalizeValue', 'normalizeColor', 'formatNumber'],
  sha256: '8929720cf30769ac3148458bf954402466f6f296c0d764c3123cd797f1e9300e',
};
const equivalence = { module: normalization.module, function: 'equivalentValue',
  sha256: '77a23b4812c8650d4319c09bc6c417e4471737881d8738eb20ede229b5232681' };
export function bindAuthoringInputEquivalence(source, descriptor = equivalence) {
  const parsed = ts.createSourceFile(descriptor.module, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  assert.equal(parsed.parseDiagnostics.length, 0);
  const nodes = parsed.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === descriptor.function);
  assert.equal(nodes.length, 1);
  const code = nodes[0].getText(parsed).replaceAll('\r\n', '\n');
  assert.equal(hash(code), descriptor.sha256, 'production equality function changed');
  return new Function(code + '\nreturn equivalentValue;')();
}
const definitions = {
  container: { file: 'docs/material-container-font-inputs.json', collect: collectContainerFontInputs,
    attribution: 'reviewed-container-fixed-font-authoring', owner: 'Material list/table container font inheritance authoring' },
  range: { file: 'docs/material-range-font-reset.json', collect: collectRangeFontReset,
    attribution: 'reviewed-range-font-reset-omission', owner: 'Material input font reset translation' },
  disabled: { file: 'docs/material-slider-disabled-inputs.json', collect: collectSliderDisabledInputs,
    attribution: 'reviewed-slider-disabled-visual-state-omission', owner: 'Material slider visual disabled-state propagation' },
};

// The collector authenticates complete proofs and source trees before this
// pure join. Membership comes from every original case, not surviving rows.
export function planAuthoringInputAttribution(proofs, original, rows, normalize, equivalent) {
  const observations = new Map(), seen = new Set(), groups = new Map(), caseIds = new Set();
  const counts = Object.fromEntries(Object.keys(definitions).map(k => [k, { owners: 0, matching: 0, unequal: 0 }]));
  for (const [kind, proof] of Object.entries(proofs)) {
    assert.ok(Object.hasOwn(definitions, kind));
    for (const flag of ['canonicalAttributionChanged', 'rendererChanged', 'inputEquivalent']) assert.equal(proof[flag], false);
    const findings = kind === 'disabled' ? proof.observations : proof.findings;
    if (kind !== 'disabled') assert.equal(proof.observations, findings.length);
    for (const finding of findings) {
      const element = kind === 'container' ? finding.family + '-primary' : kind === 'range' ? finding.element : 'slider-visual';
      const key = identity(finding.case, element);
      assert.ok(!observations.has(key), 'duplicate proof owner'); observations.set(key, { kind, finding });
    }
  }
  assert.deepEqual(Object.keys(proofs).sort(), Object.keys(definitions).sort());
  for (const [mode, entries] of [['static', original.results], ['interaction', original.interactions]]) for (const entry of entries) {
    const caseId = `${mode}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`;
    assert.ok(!caseIds.has(caseId), 'duplicate original case'); caseIds.add(caseId);
    const targets = ['list', 'table'].includes(entry.family) ? [[entry.family + '-primary', 'fontSize', 'container']]
      : entry.family === 'slider' ? [['slider-start', 'fontSize', 'range'], ['slider-primary', 'fontSize', 'range'], ['slider-visual', 'opacity', 'disabled']] : [];
    for (const [element, property, kind] of targets) {
      const inputs = entry.styleInputs.filter(i => i.id === element); assert.equal(inputs.length, 1);
      const input = inputs[0], referenceStyle = normalize(input.reference), candidateStyle = normalize(input.astylar);
      const r = referenceStyle[property], a = candidateStyle[property];
      assert.equal(typeof r, 'string'); assert.equal(typeof a, 'string');
      const equal = equivalent(property, r, a, referenceStyle, candidateStyle), count = counts[kind];
      count.owners++; count[equal ? 'matching' : 'unequal']++;
      const key = identity(caseId, element), observation = observations.get(key);
      // Disabled proof deliberately covers only disabled mismatches. All 70
      // numeric matches are still counted from the full original population.
      if (kind === 'disabled' && equal) { assert.equal(observation, undefined); continue; }
      assert.ok(observation, `original owner lacks proof: ${kind} ${key} (${r} versus ${a})`); assert.equal(observation.kind, kind);
      assert.ok(!seen.has(key)); seen.add(key);
      const { finding } = observation, p = finding.proof;
      assert.deepEqual(finding.viewport, entry.viewport); assert.deepEqual(finding.inputTrees, entry.inputTrees);
      assert.equal(finding.state, entry.state ?? 'static'); assert.equal(finding.originalInputSha256, digest(input));
      assert.equal(p.classification, 'application-plugin-authoring-defect');
      for (const flag of ['inputEquivalent', 'rendererCauseProven']) assert.equal(p[flag], false);
      if (kind === 'disabled') {
        assert.equal(mode, 'interaction'); assert.equal(entry.state, 'disabled');
        assert.equal(p.referenceOpacity, input.reference.opacity); assert.equal(p.candidateOpacity, input.astylar.opacity);
        assert.equal(p.renderedOpacityVerified, false);
      } else {
        assert.equal(p.scalarMatches, equal); assert.equal(p.referenceFontSize, input.reference.fontSize);
        assert.equal(p.candidateFontSize, input.astylar.fontSize);
        assert.equal(p.candidateFontSize, input.astylarNormalResolvedStyle.fontSize);
        assert.equal(p.candidateFontSize, input.astylarInteractionResolvedStyle.fontSize);
        assert.equal(p.renderingEquivalent, false);
      }
      if (equal) continue;
      const rowIdentity = { family: entry.family, element, property, reference: r, astylar: a };
      const sig = signature(rowIdentity);
      if (!groups.has(sig)) groups.set(sig, { ...rowIdentity, kind, occurrences: 0, cases: [], states: [], observations: [] });
      const group = groups.get(sig); assert.equal(group.kind, kind); group.occurrences++;
      if (group.cases.length < 12) group.cases.push(caseId);
      if (!group.states.includes(entry.state ?? 'static')) group.states.push(entry.state ?? 'static');
      group.observations.push({ case: caseId, inputSha256: finding.originalInputSha256, inputTrees: finding.inputTrees, proofSha256: digest(p) });
    }
  }
  assert.equal(seen.size, observations.size, 'unused proof owner');
  for (const proof of Object.values(proofs)) assert.equal(caseIds.size, proof.originalCasesScanned);
  assert.deepEqual(counts.container, { owners: proofs.container.observations,
    matching: Object.values(proofs.container.counts).reduce((n, c) => n + c.matchingScalars, 0),
    unequal: Object.values(proofs.container.counts).reduce((n, c) => n + c.unequalScalars, 0) });
  assert.deepEqual(counts.range, { owners: proofs.range.observations, ...proofs.range.counts });
  assert.deepEqual(counts.disabled, { owners: proofs.disabled.sliderCases, matching: proofs.disabled.matchingOpacityCases,
    unequal: proofs.disabled.observations.length });
  const selected = new Set(), findings = [];
  for (const [sig, group] of groups) {
    const matches = rows.filter(row => signature(row) === sig);
    assert.equal(matches.length, 1, 'canonical group missing, duplicated or split');
    const row = matches[0]; assert.equal(row.attribution, 'unresolved', 'do not replace an existing review');
    for (const field of ['occurrences', 'cases', 'states']) assert.deepEqual(row[field], group[field], `incomplete canonical ${field}`);
    assert.ok(!selected.has(row)); selected.add(row);
    findings.push({ ...group, canonicalRowSha256: digest(row), proposedClassification: 'application-plugin-authoring-defect',
      proposedAttribution: definitions[group.kind].attribution, proposedOwner: definitions[group.kind].owner,
      inputEquivalent: false, rendererCauseProven: false, renderingEquivalent: false });
  }
  return { originalCasesScanned: caseIds.size, counts, proofObservations: seen.size,
    proposedGroups: findings.length, proposedObservations: findings.reduce((n, f) => n + f.occurrences, 0),
    canonicalRows: rows.length, baselineUnresolved: rows.filter(r => r.attribution === 'unresolved').length,
    otherCompleteRows: rows.length - selected.size,
    otherOrderedRowDigestsSha256: digest(rows.filter(r => !selected.has(r)).map(digest)), findings,
    canonicalAttributionChanged: false, inputEquivalent: false, renderingEquivalent: false };
}

export async function collectAuthoringInputAttributionPlan() {
  const proofs = {}, descriptors = {};
  for (const [kind, definition] of Object.entries(definitions)) {
    const bytes = readFileSync(definition.file, 'utf8').replaceAll('\r\n', '\n');
    const proof = definition.collect(); assert.equal(bytes, JSON.stringify(proof, null, 2) + '\n', 'source proof must independently replay');
    proofs[kind] = proof; descriptors[kind] = { file: definition.file, sha256: hash(bytes) };
  }
  const originalCapture = proofs.container.originalCapture;
  for (const proof of Object.values(proofs)) assert.deepEqual(proof.originalCapture, originalCapture);
  const bytes = readFileSync(originalCapture.file); assert.equal(hash(bytes), originalCapture.sha256);
  const source = readFileSync(normalization.module, 'utf8');
  const normalize = bindOwnerCaretNormalization(source, normalization), equivalent = bindAuthoringInputEquivalence(source);
  const { manifest, rows } = await readCaretConservationRows(file =>
    execFileSync('git', ['show', `${canonicalRevision}:${file}`], { maxBuffer: 64 * 1024 * 1024 }));
  return { schemaVersion: 1, kind: 'source-bound-authoring-input-proposed-attribution',
    scope: 'Proposal only. Preserves matching numeric inputs and every unrelated canonical row; does not establish rendered or interactive equivalence.',
    proofs: descriptors, originalCapture, productionNormalization: normalization, productionEquivalence: equivalence,
    canonicalRevision, canonicalPayload: manifest,
    ...planAuthoringInputAttribution(proofs, JSON.parse(bytes), rows, normalize, equivalent) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2); assert.ok(!args.length || args.length === 1 && args[0] === '--check');
  const report = await collectAuthoringInputAttributionPlan(), file = 'docs/material-authoring-input-attribution-plan.json';
  const output = JSON.stringify(report, null, 2) + '\n';
  if (args[0] === '--check') assert.equal(readFileSync(file, 'utf8').replaceAll('\r\n', '\n'), output);
  else writeFileSync(file, output);
  console.log(JSON.stringify({ proposedGroups: report.proposedGroups, proposedObservations: report.proposedObservations,
    counts: report.counts, otherCompleteRows: report.otherCompleteRows, baselineUnresolved: report.baselineUnresolved,
    canonicalAttributionChanged: false, reportSha256: hash(output) }));
}
