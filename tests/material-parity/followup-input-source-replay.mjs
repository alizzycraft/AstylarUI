import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { restoreGapCaptureDiagnostics } from './gap-survey-source-replay.mjs';
import { collectLeafFontFamily } from '../../scripts/audit-material-leaf-font-family-stages.mjs';
import { collectLeafWeightTracking } from '../../scripts/audit-material-leaf-weight-tracking-stages.mjs';
import { collectExpansionOwnerMapping } from '../../scripts/audit-material-expansion-owner-mapping.mjs';
import { collectControlFontStyleReset } from '../../scripts/audit-material-control-font-style-reset.mjs';
import { bindPreciseAuditNormalization, preciseAuditNormalization } from './audit-normalization-contracts.mjs';

const hash = x => createHash('sha256').update(x).digest('hex');
const digest = x => hash(JSON.stringify(x));
const bindingRevision = 'd2e773ae';
const bindingFile = 'docs/material-followup-input-proposal-binding.json';
const collectors = {
  leafFamily: collectLeafFontFamily,
  leafWeightTracking: collectLeafWeightTracking,
  expansionOwner: collectExpansionOwnerMapping,
  controlFontStyle: collectControlFontStyleReset,
};
const normalization = { module: 'tests/material-parity/input-equivalence-audit.mjs',
  functions: ['canonicalStyle', 'expandQuad', 'expandPair', 'splitCssTerms', 'normalizeValue', 'normalizeColor', 'formatNumber'],
  sha256: '8929720cf30769ac3148458bf954402466f6f296c0d764c3123cd797f1e9300e' };
const originalCapture = { file: 'artifacts/material-parity/current-ancestry-audit/latest-report.json',
  sha256: 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a' };

// Pure receipt comparison. This does not authenticate caller-provided objects:
// the synchronous reader below pins plans to their verified commits and obtains
// each proof by executing its original source collector, not by trusting JSON.
export function verifyFollowupSourceReceipt(kind, binding, plan, proof, proofBytes) {
  assert.ok(Object.hasOwn(collectors, kind));
  assert.equal(binding.kind, 'source-replayed-followup-input-proposal-binding');
  assert.equal(binding.sourceProofsReplayed, true);
  assert.equal(binding.originalCanonicalJoinsReplayed, true);
  for (const flag of ['canonicalIntegration', 'canonicalAttributionChanged', 'completeAuditAccepted', 'inputEquivalent', 'renderingEquivalent'])
    assert.equal(binding[flag], false);
  const descriptor = binding.plans[kind];
  assert.equal(descriptor.sourceProofsReplayed, true);
  assert.equal(descriptor.originalCanonicalJoinReplayed, true);
  assert.equal(hash(JSON.stringify(plan, null, 2) + '\n'), descriptor.sha256);
  assert.deepEqual(plan.productionNormalization, normalization);
  assert.deepEqual(plan.originalCapture, originalCapture);
  assert.deepEqual(proof.originalCapture, originalCapture);
  assert.equal(JSON.stringify(proof, null, 2) + '\n', proofBytes, 'fresh source proof differs from saved evidence');
  const proofDescriptor = plan.proof ?? plan.sourceProof;
  assert.equal(hash(proofBytes), proofDescriptor.sha256);
  assert.deepEqual(binding.groups.filter(g => g.kind === kind).map(g => g.proposal), plan.proposed);
  assert.equal(plan.proposedGroups, plan.proposed.length);
  assert.equal(plan.proposedObservations, plan.proposed.reduce((n, p) => n + p.occurrences, 0));
  assert.equal(proof.observations, proof.findings.length);
  const key = (f, property) => JSON.stringify([f.case, f.element,
    kind === 'leafWeightTracking' ? property : undefined]);
  const bySource = new Map(proof.findings.map(f => [key(f, f.property), f]));
  assert.equal(bySource.size, proof.findings.length);
  const seen = new Set();
  for (const p of plan.proposed) for (const o of p.observations) {
    const observationKey = JSON.stringify([o.case, p.element, p.property]);
    assert.ok(!seen.has(observationKey)); seen.add(observationKey);
    const f = bySource.get(key({ ...o, element: p.element }, p.property));
    assert.ok(f, 'proposed observation lacks independently replayed source proof');
    assert.equal(f.family, p.family);
    assert.equal(f.originalInputSha256, o.inputSha256 ?? o.originalInputSha256);
    assert.deepEqual(f.inputTrees, o.inputTrees);
    assert.equal(digest(f.proof), o.proofSha256);
  }
  assert.equal(seen.size, plan.proposedObservations);
  return { ...descriptor, proof: proofDescriptor, proposedGroups: plan.proposedGroups,
    proposedObservations: plan.proposedObservations, freshSourceProofReplayed: true,
    frozenCanonicalJoinReplayedNow: false };
}

function readPinned(file, revision) {
  const bytes = readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
  const committed = execFileSync('git', ['show', `${revision}:${file}`],
    { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }).replaceAll('\r\n', '\n');
  assert.equal(bytes, committed, 'follow-up evidence differs from verified committed file');
  return { value: JSON.parse(bytes), bytes };
}

// Reuse the existing exact runner reversal for the historical expansion proof.
// Return a projected copy only after every other source and observation matches.
export function conserveExpansionOwnerProof(proof, proofBytes) {
  const projected = structuredClone(proof), historical = JSON.parse(proofBytes);
  const restoreAstylarDiagnostics = source => {
    let restored = source.replaceAll('\r\n', '\n');
    const replaceOnce = (before, after) => {
      assert.equal(restored.split(before).length, 2, 'Astylar diagnostic restoration must match exactly once');
      restored = restored.replace(before, after);
    };
    replaceOnce(`        // Read-only audit diagnostics: retain the final mesh depth and camera\n        // bounds alongside CSS-space measurements. These values are observed\n        // after layout/projection and never feed authoring or interaction.\n        paintDepth: {\n          meshZ: mesh.position.z,\n          enabled: mesh.isEnabled(),\n          visible: mesh.isVisible,\n          visibility: mesh.visibility,\n        },\n`, '');
    replaceOnce(`        camera: {\n          position: { x: camera.position.x, y: camera.position.y, z: camera.position.z },\n          viewport: { x: viewport.x, y: viewport.y, width: viewport.width, height: viewport.height },\n        },\n`, '');
    return restored;
  };
  const restoreExpansionTitleReceipt = source => {
    let restored = source;
    const replaceOnce = (before, after) => {
      assert.equal(restored.split(before).length, 2, 'Expansion title receipt restoration must match exactly once');
      restored = restored.replace(before, after);
    };
    replaceOnce("import { restoreAstylarDiagnostics } from '../tests/material-parity/alignment-survey-conservation.mjs';\n", '');
    replaceOnce('hash(restoreAstylarDiagnostics(source))', 'hash(source)');
    return restored;
  };
  for (const file of ['tests/material-parity/run-material-parity.mjs', 'examples/material-showcase/src/app/astylar.component.ts']) {
    const current = projected.sourceFingerprints.filter(s => s.file === file);
    const prior = historical.sourceFingerprints.filter(s => s.file === file);
    assert.equal(current.length, 1); assert.equal(prior.length, 1);
    const source = readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
    assert.equal(hash(source), current[0].sha256);
    if (current[0].sha256 !== prior[0].sha256) {
      const restored = file.endsWith('/astylar.component.ts') ? restoreAstylarDiagnostics(source) : restoreGapCaptureDiagnostics(source);
      assert.equal(hash(restored), prior[0].sha256);
      // A refreshed source-transition receipt intentionally retains the live
      // diagnostic fingerprint; only the known diagnostic-only delta is
      // accepted, and the full source hash remains authenticated above.
    }
  }
  const currentTitle = projected.sourceFingerprints.filter(s => s.file === 'scripts/audit-material-expansion-title-inputs.mjs');
  const priorTitle = historical.sourceFingerprints.filter(s => s.file === 'scripts/audit-material-expansion-title-inputs.mjs');
  assert.equal(currentTitle.length, 1); assert.equal(priorTitle.length, 1);
  const titleSource = readFileSync('scripts/audit-material-expansion-title-inputs.mjs', 'utf8').replaceAll('\r\n', '\n');
  assert.equal(hash(titleSource), currentTitle[0].sha256);
  assert.equal(hash(restoreExpansionTitleReceipt(titleSource)), priorTitle[0].sha256);
  currentTitle[0].sha256 = priorTitle[0].sha256;
  assert.equal(JSON.stringify(projected, null, 2) + '\n', proofBytes,
    'expansion source proof changed beyond reviewed capture diagnostics');
  return projected;
}

// The live builder is synchronous. Replay all original source proofs here;
// do not claim that this also decodes or rejoins the historical 2GB payloads.
// Those independent complete joins remain pinned to the verified binding.
export function replayFollowupInputSourcePlans() {
  const pinned = readPinned(bindingFile, bindingRevision), binding = pinned.value;
  assert.deepEqual(Object.keys(binding.plans).sort(), Object.keys(collectors).sort());
  const bytes = readFileSync(originalCapture.file);
  assert.equal(hash(bytes), originalCapture.sha256);
  const original = JSON.parse(bytes);
  const normalize = bindPreciseAuditNormalization();
  const descriptors = {}, plans = {};
  for (const [kind, collect] of Object.entries(collectors)) {
    const descriptor = binding.plans[kind];
    const plan = readPinned(descriptor.file, descriptor.revision).value;
    const proofDescriptor = plan.proof ?? plan.sourceProof;
    const proofBytes = readFileSync(proofDescriptor.file, 'utf8').replaceAll('\r\n', '\n');
    let proof = collect();
    // This retained capture predates the additive paint diagnostics. Authenticate
    // the complete current source and its exact reversal before replaying the
    // historical receipt; never relax comparison of observations or other sources.
    if (kind === 'expansionOwner') {
      proof = conserveExpansionOwnerProof(proof, proofBytes);
    }
    descriptors[kind] = verifyFollowupSourceReceipt(kind, binding, plan, proof, proofBytes);
    plans[kind] = plan;
  }
  return { binding, original, normalize, plans, descriptors, originalCapture,
    normalizationContracts: { historicalPlans: normalization, current: preciseAuditNormalization },
    proposalBinding: { file: bindingFile, revision: bindingRevision, sha256: hash(pinned.bytes) },
    sourceProofsReplayed: true, frozenCanonicalJoinReplayedNow: false };
}
