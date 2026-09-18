import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { collectContainerFontStages, planContainerFontStages } from './audit-material-container-font-stages.mjs';
import { collectLeafFontStages } from './audit-material-leaf-font-stages.mjs';
import { planLeafFontAttribution } from './audit-material-leaf-font-attribution.mjs';
import { collectContainerFontInputs } from './audit-material-container-font-inputs.mjs';
import { collectRangeFontReset } from './audit-material-range-font-reset.mjs';
import { collectSliderDisabledInputs } from './audit-material-slider-disabled-inputs.mjs';
import { planAuthoringInputAttribution, bindAuthoringInputEquivalence } from './audit-material-authoring-input-attribution.mjs';
import { collectFontScopeInputs } from './audit-material-font-scope-inputs.mjs';
import { collectExpansionTitleInputs } from './audit-material-expansion-title-inputs.mjs';
import { collectTabPanelInputs } from './audit-material-tab-panel-inputs.mjs';
import { collectOverlayFontInputs } from './audit-material-overlay-font-inputs.mjs';
import { planFontOwnershipAttribution } from './audit-material-font-ownership-attribution.mjs';
import { collectButtonHoverComposition } from './audit-material-button-hover-composition.mjs';
import { planButtonPaintAttribution } from './audit-material-button-paint-attribution.mjs';
import { collectHostFontTokens, planHostFontTokens } from './audit-material-host-font-token-inputs.mjs';
import { collectContainerFontFamily, planContainerFontFamily } from './audit-material-container-font-family-stages.mjs';
import { bindOwnerCaretNormalization } from '../tests/material-parity/owner-caret-source-binding.mjs';
import { readCaretConservationRows } from '../tests/material-parity/owner-caret-canonical-conservation.mjs';

const hash = x => createHash('sha256').update(x).digest('hex');
const digest = x => hash(JSON.stringify(x));
const signature = row => JSON.stringify([row.family, row.element, row.property, row.reference, row.astylar]);
const canonicalRevision = '06e50dbcd3594c5987d63a4ec38e792b87b08dde';
const normalization = { module: 'tests/material-parity/input-equivalence-audit.mjs',
  functions: ['canonicalStyle', 'expandQuad', 'expandPair', 'splitCssTerms', 'normalizeValue', 'normalizeColor', 'formatNumber'],
  sha256: '8929720cf30769ac3148458bf954402466f6f296c0d764c3123cd797f1e9300e' };
const proof = (name, collect) => ({ file: `docs/material-${name}.json`, collect });
const definitions = {
  containerSize: { revision: 'f5285a4', file: 'docs/material-container-font-stage-plan.json', field: 'findings',
    proofs: { single: proof('container-font-stages', collectContainerFontStages) }, join: (p, ...a) => planContainerFontStages(p.single, ...a) },
  leafSize: { revision: '9933ac1', file: 'docs/material-leaf-font-attribution-plan.json', field: 'proposed',
    proofs: { single: proof('leaf-font-stages', collectLeafFontStages) }, join: (p, ...a) => planLeafFontAttribution(p.single, ...a) },
  authoring: { revision: '8591649', file: 'docs/material-authoring-input-attribution-plan.json', field: 'findings',
    proofs: { container: proof('container-font-inputs', collectContainerFontInputs), range: proof('range-font-reset', collectRangeFontReset),
      disabled: proof('slider-disabled-inputs', collectSliderDisabledInputs) }, join: planAuthoringInputAttribution },
  ownership: { revision: 'eaf2a32', file: 'docs/material-font-ownership-attribution-plan.json', field: 'proposed',
    proofs: { scope: proof('font-scope-inputs', collectFontScopeInputs), expansion: proof('expansion-title-inputs', collectExpansionTitleInputs),
      tab: proof('tab-panel-inputs', collectTabPanelInputs), overlay: proof('overlay-font-inputs', collectOverlayFontInputs) }, join: planFontOwnershipAttribution },
  buttonPaint: { revision: '547d349', file: 'docs/material-button-paint-attribution-plan.json', field: 'findings',
    proofs: { single: proof('button-hover-composition', collectButtonHoverComposition) }, join: (p, ...a) => planButtonPaintAttribution(p.single, ...a) },
  hostTokens: { revision: '1f3d642', file: 'docs/material-host-font-token-attribution-plan.json', field: 'proposed',
    proofs: { single: proof('host-font-token-inputs', collectHostFontTokens) }, join: (p, ...a) => planHostFontTokens(p.single, ...a) },
  containerFamily: { revision: '44f37fe', file: 'docs/material-container-font-family-attribution-plan.json', field: 'proposed',
    proofs: { single: proof('container-font-family-stages', collectContainerFontFamily) }, join: (p, ...a) => planContainerFontFamily(p.single, ...a) },
};

// This only joins already source-replayed plans. It cannot substitute a plan's
// self-consistent counts for its independent source and canonical replay.
export function joinReviewedInputProposals(plans, rows) {
  assert.deepEqual(Object.keys(plans).sort(), Object.keys(definitions).sort());
  const bySignature = new Map();
  for (const row of rows) {
    const key = signature(row);
    if (!bySignature.has(key)) bySignature.set(key, []);
    bySignature.get(key).push(row);
  }
  const selected = new Set(), observations = new Set(), groups = [], counts = {};
  for (const [kind, plan] of Object.entries(plans)) {
    assert.equal(plan.canonicalRevision, canonicalRevision); assert.equal(plan.canonicalAttributionChanged, false);
    assert.equal(plan.renderingEquivalent, false); assert.equal(plan.canonicalRows, rows.length);
    assert.equal(plan.baselineUnresolved, rows.filter(r => r.attribution === 'unresolved').length);
    const proposals = plan[definitions[kind].field];
    assert.equal(plan.proposedGroups, proposals.length);
    assert.equal(plan.proposedObservations, proposals.reduce((n, p) => n + p.occurrences, 0));
    counts[kind] = { groups: proposals.length, observations: plan.proposedObservations };
    for (const p of proposals) {
      // A prior static review and a pending interactive review can have the
      // same family/element/property/value tuple. Select by the authenticated
      // COMPLETE row hash, never by a broad tuple or an attribution override.
      const key = signature(p), matches = (bySignature.get(key) ?? []).filter(r => digest(r) === p.canonicalRowSha256);
      assert.equal(matches.length, 1, 'proposal must identify one complete canonical row');
      const row = matches[0]; assert.equal(row.attribution, 'unresolved');
      assert.equal(p.canonicalRowSha256, digest(row)); assert.ok(!selected.has(row), 'overlapping proposed row'); selected.add(row);
      for (const field of ['occurrences', 'cases', 'states']) assert.deepEqual(p[field], row[field]);
      assert.equal(p.proposedClassification, ['containerSize', 'leafSize', 'containerFamily'].includes(kind)
        ? 'parity-harness-defect' : 'application-plugin-authoring-defect');
      assert.ok(p.proposedAttribution.startsWith('reviewed-'));
      for (const flag of ['inputEquivalent', 'wholeElementInputEquivalent', 'renderingEquivalent', 'rendererCauseProven', 'computedCandidateVerified', 'renderedCompositeVerified'])
        if (Object.hasOwn(p, flag)) assert.equal(p[flag], false);
      assert.equal(p.observations.length, p.occurrences);
      assert.deepEqual(p.cases, p.observations.slice(0, 12).map(o => o.case));
      for (const o of p.observations) {
        const id = JSON.stringify([o.case, p.family, p.element, p.property]);
        assert.ok(!observations.has(id), 'overlapping original property observation'); observations.add(id);
        assert.match(o.inputSha256 ?? o.originalInputSha256, /^[a-f0-9]{64}$/);
        assert.match(o.proofSha256, /^[a-f0-9]{64}$/);
      }
      groups.push({ kind, originalCompleteRow: row, proposal: p });
    }
  }
  return { counts, groups, proposedGroups: groups.length, proposedObservations: observations.size,
    canonicalRows: rows.length, baselineUnresolved: rows.filter(r => r.attribution === 'unresolved').length,
    otherCompleteRows: rows.length - selected.size, otherOrderedRowDigestsSha256: digest(rows.filter(r => !selected.has(r)).map(digest)),
    canonicalAttributionChanged: false, inputEquivalent: false, renderingEquivalent: false };
}

export async function readReviewedProposalCanonical() {
  // Authenticate every byte of the frozen payload once, rather than opening the
  // same two-gigabyte parent seven times. Each original independent join still
  // receives every complete row and preserves its existing assertions.
  return readCaretConservationRows(file =>
    execFileSync('git', ['show', `${canonicalRevision}:${file}`], { maxBuffer: 64 * 1024 * 1024 }));
}

// Internal replay boundary. `canonical` must come from the byte-authenticating
// reader above. Keeping that object allows a subsequent no-write transition
// proof to examine the very same complete rows without decoding them twice.
export function replayReviewedInputProposalBinding({ manifest, rows }) {
  const originalCapture = { file: 'artifacts/material-parity/current-ancestry-audit/latest-report.json',
    sha256: 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a' };
  const originalBytes = readFileSync(originalCapture.file); assert.equal(hash(originalBytes), originalCapture.sha256);
  const original = JSON.parse(originalBytes);
  const source = readFileSync(normalization.module, 'utf8');
  const normalize = bindOwnerCaretNormalization(source, normalization), equivalent = bindAuthoringInputEquivalence(source);
  const plans = {}, descriptors = {};
  for (const [kind, definition] of Object.entries(definitions)) {
    const revision = execFileSync('git', ['rev-parse', definition.revision], { encoding: 'utf8' }).trim();
    const committed = execFileSync('git', ['show', `${revision}:${definition.file}`], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }).replaceAll('\r\n', '\n');
    assert.equal(readFileSync(definition.file, 'utf8').replaceAll('\r\n', '\n'), committed, 'working proposal differs from verified committed evidence');
    const plan = JSON.parse(committed); assert.deepEqual(plan.canonicalPayload, manifest); assert.deepEqual(plan.productionNormalization, normalization);
    const proofs = {}, proofDescriptors = {};
    for (const [id, spec] of Object.entries(definition.proofs)) {
      const bytes = readFileSync(spec.file, 'utf8').replaceAll('\r\n', '\n');
      const replay = spec.collect(); assert.equal(JSON.stringify(replay, null, 2) + '\n', bytes, 'original source proof no longer reproduces');
      assert.deepEqual(replay.originalCapture, originalCapture);
      proofs[id] = replay; proofDescriptors[id] = { file: spec.file, sha256: hash(bytes) };
    }
    if (definition.proofs.single) assert.deepEqual(plan.proof, proofDescriptors.single);
    else assert.deepEqual(plan.proofs, proofDescriptors);
    const replay = definition.join(proofs, original, rows, normalize, equivalent);
    // Preserve every field returned by the original join, including matching or
    // previously reviewed observations, not only its proposed classifications.
    for (const [key, value] of Object.entries(replay)) assert.deepEqual(plan[key], value, `${kind}/${key} changed on replay`);
    plans[kind] = plan; descriptors[kind] = { file: definition.file, revision, sha256: hash(committed), proofs: proofDescriptors,
      completeJoinSha256: digest(replay), sourceProofsReplayed: true };
  }
  const joined = joinReviewedInputProposals(plans, rows);
  assert.equal(joined.proposedGroups, 134); assert.equal(joined.proposedObservations, 3325);
  assert.equal(joined.otherCompleteRows, 8205);
  return { schemaVersion: 1, kind: 'source-replayed-reviewed-input-proposal-binding', canonicalRevision,
    canonicalPayload: manifest, originalCapture, productionNormalization: normalization, plans: descriptors, ...joined,
    canonicalIntegration: false, sourceProofsReplayed: true, completeAuditAccepted: false,
    limitation: 'Seven committed proposal sets are independently replayed from original sources and the full frozen canonical payload, then joined without overlapping rows or property observations. This is an integration boundary, not canonical promotion or output parity. Unjoined findings, including the later leaf-family proof, remain outside this bounded population.' };
}

export async function collectReviewedInputProposalBinding() {
  return replayReviewedInputProposalBinding(await readReviewedProposalCanonical());
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2); assert.ok(!args.length || args.length === 1 && args[0] === '--check');
  const report = await collectReviewedInputProposalBinding(), file = 'docs/material-reviewed-input-proposal-binding.json';
  const output = JSON.stringify(report, null, 2) + '\n';
  if (args.includes('--check')) assert.equal(readFileSync(file, 'utf8').replaceAll('\r\n', '\n'), output); else writeFileSync(file, output);
  console.log(JSON.stringify({ proposedGroups: report.proposedGroups, proposedObservations: report.proposedObservations,
    counts: report.counts, otherCompleteRows: report.otherCompleteRows, otherOrderedRowDigestsSha256: report.otherOrderedRowDigestsSha256,
    reportSha256: hash(output), sourceProofsReplayed: true, canonicalIntegration: false }));
}
