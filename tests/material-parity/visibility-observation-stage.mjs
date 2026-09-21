import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolveVisibilityOwner, visibilityOwnerChain } from '../../scripts/audit-material-visibility-ancestry.mjs';

const hash = x => createHash('sha256').update(x).digest('hex');
const digest = x => hash(JSON.stringify(x));
export const visibilityObservationAttribution = 'reviewed-visibility-observation-stage';
const families = ['bottom-sheet', 'chips', 'dialog', 'snack-bar', 'tooltip'];
const forbidden = key => ['visibility', 'all'].includes(key);

export function proveVisibilityObservationStage(reference, candidate, family, element) {
  assert.ok(families.includes(family), 'state-owner substitutions require separate review');
  assert.deepEqual(reference.errors, []); assert.deepEqual(candidate.errors, []);
  // The raw tree schema records stylesheet-read errors, not the derived
  // ruleEvidenceComplete flag used by retained-typography ledgers.
  assert.equal(reference.schemaVersion, 1);
  assert.equal(reference.contextStyleEvidenceVersion, 1);
  assert.ok(reference.rules.every(r => typeof r.active === 'boolean' && r.declarations
    && typeof r.declarations === 'object'));
  assert.equal(candidate.resolvedStyleEvidenceVersion, 2);
  assert.equal(candidate.resolvedStyleSource, 'core-style-inspection');
  assert.ok(Number.isInteger(candidate.resolvedStyleRevision));
  const ref = resolveVisibilityOwner(reference, family, element);
  const candidates = candidate.nodes.filter(n => n.authored?.id === element);
  assert.equal(candidates.length, 1); const ast = candidates[0];
  assert.ok(!ast.authored.type.includes(':'), 'custom renderer needs separate proof');
  const rchain = visibilityOwnerChain(reference, ref.key, 'reference');
  const achain = visibilityOwnerChain(candidate, ast.key, 'astylar');
  assert.ok(rchain.every(n => n.visibility?.value === 'visible' && n.visibility.present));
  for (const n of rchain) {
    assert.equal(n.rules.length, 0, 'authored ancestor visibility');
    assert.equal(n.inlineVisibility, undefined);
    const raw = reference.nodes.find(raw => raw.key === n.key);
    assert.ok(!Object.keys(raw.inline ?? {}).some(forbidden));
    for (const index of raw.rules) {
      const rule = reference.rules[index]; assert.ok(rule);
      if (rule.active) assert.ok(!Object.keys(rule.declarations).some(forbidden), 'visibility/reset rule');
    }
  }
  // Deliberately conservative: reject even currently unmatched candidate
  // visibility/all rules rather than guessing selector or future-state scope.
  assert.ok(candidate.rules.every(rule => !Object.keys(rule).some(forbidden)));
  const stages = achain.filter(n => !n.visibilityNotCaptured).map(n => {
    const raw = candidate.nodes.find(raw => raw.key === n.key);
    assert.ok(!Object.hasOwn(raw.authored, 'style'), 'inline candidate style requires review');
    assert.ok(!Object.keys(raw.authored).some(forbidden));
    const captured = {};
    for (const stage of ['normalResolvedStyle', 'resolvedStyle', 'interactionResolvedStyle']) {
      assert.ok(raw[stage] && typeof raw[stage] === 'object', 'missing captured style stage');
      assert.ok(!Object.keys(raw[stage]).some(forbidden), 'candidate visibility/reset');
      captured[stage] = { visibilityPresent: false, sha256: digest(raw[stage]) };
    }
    return { key: n.key, authoredSha256: digest(raw.authored), stages: captured };
  });
  return { family, element, referenceOwner: ref.key, candidateOwner: ast.key,
    referenceChain: rchain, candidateStages: stages,
    syntheticRootUncaptured: achain.some(n => n.visibilityNotCaptured),
    computedCandidateVerified: false, renderingEquivalent: false, rendererCauseProven: false,
    classification: 'parity-harness-defect', attribution: visibilityObservationAttribution,
    justification: 'Authenticated captured owner ancestry contains no authored visibility or reset request. Browser computed visible is compared with omission at every captured candidate style stage. This attributes the mixed observation stages only; it does not invent a candidate computed value, assert uncaptured document ancestry, accept other input differences, or waive missing hidden-state support.' };
}

export function collectVisibilityObservationStages() {
  const bytes = readFileSync('docs/material-visibility-input-population.json');
  assert.equal(hash(bytes), '2ca5eb09c5ebdcd6236225ee8bd64cce4a9f7061f78a29bd54a5bd22bfa8fb18');
  const population = JSON.parse(bytes), cache = new Map();
  const load = receipt => {
    if (!cache.has(receipt.file)) { const bytes = readFileSync(receipt.file);
      cache.set(receipt.file, { sha256: hash(bytes), tree: JSON.parse(bytes) }); }
    const result = cache.get(receipt.file); assert.equal(result.sha256, receipt.sha256); return result.tree;
  };
  const reviewed = [], pending = [];
  for (const group of population.groups) {
    if (!families.includes(group.family)) {
      pending.push({ family: group.family, element: group.element, occurrences: group.occurrences,
        reason: 'state-owner substitutions; see material-panel-state-ownership.json' }); continue;
    }
    const observations = group.observations.map(o => ({ case: o.case, inputSha256: o.inputSha256,
      inputTrees: o.inputTrees,
      proof: proveVisibilityObservationStage(load(o.inputTrees.reference), load(o.inputTrees.astylar), group.family, group.element) }));
    reviewed.push({ family: group.family, element: group.element, property: 'visibility',
      reference: 'visible', candidateOmitted: true, priorRowSha256: group.priorRowSha256,
      occurrences: observations.length, observations, classification: 'parity-harness-defect', attribution: visibilityObservationAttribution });
  }
  return { schemaVersion: 1, reviewed, pending, counts: { reviewedGroups: reviewed.length,
    reviewedObservations: reviewed.reduce((n, g) => n + g.occurrences, 0), pendingGroups: pending.length,
    pendingObservations: pending.reduce((n, g) => n + g.occurrences, 0) }, canonicalIntegrationApplied: false };
}

export function classifyVisibilityObservationStage(input, property, reference, candidate, observation) {
  if (property !== 'visibility' || reference !== 'visible' || candidate !== undefined || !observation
    || digest(input) !== observation.inputSha256 || input.id !== observation.proof.element
    || observation.proof.classification !== 'parity-harness-defect'
    || observation.proof.attribution !== visibilityObservationAttribution
    || ['computedCandidateVerified', 'renderingEquivalent', 'rendererCauseProven'].some(k => observation.proof[k] !== false)) return;
  return { classification: 'parity-harness-defect', attribution: visibilityObservationAttribution,
    owner: 'input audit browser-computed versus candidate resolved-style observation stages',
    justification: observation.proof.justification, reviewEvidence: structuredClone(observation) };
}
