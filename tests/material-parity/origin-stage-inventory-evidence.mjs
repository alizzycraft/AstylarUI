import { isDeepStrictEqual } from 'node:util';
import { inspectTransformOriginDeclarationStage } from './transform-origin-stage-evidence.mjs';

export const originStageAttribution = 'reviewed-origin-declaration-stage';
const one = values => values.length === 1 ? values[0] : undefined;
const keyOf = e => `${e.kind ?? (e.state ? 'interaction' : 'static')}:${e.family}@${e.profile}/${e.viewport?.id}${e.state ? '/' + e.state : ''}`;

// Rehydrate the already hash-checked inventory. Keep its global reference style
// and rule indices intact; candidate rules have no index-bearing node fields.
// This bridge does not read files, resolve CSS or manufacture used values.
export function originStageTrees(inventory, key) {
  if (inventory?.schemaVersion !== 1 || !['errors', 'cases', 'variants', 'styles', 'rules'].every(k => Array.isArray(inventory[k])) ||
      inventory.errors.some(e => e.case === key)) return;
  const pair = ['reference', 'astylar'].map(side => one(inventory.cases.filter(c => c.case === key && c.side === side)));
  if (pair.some(c => !c)) return;
  const [rc, ac] = pair, ref = inventory.variants[rc.variant], ast = inventory.variants[ac.variant];
  if (ref?.side !== 'reference' || ast?.side !== 'astylar' || !ref.ruleEvidenceComplete || !ast.ruleEvidenceComplete ||
      !Array.isArray(ref.nodes) || !Array.isArray(ast.nodes) || !Array.isArray(ast.rules)) return;
  const style = (i, side) => inventory.styles[i]?.side === side ? inventory.styles[i].value : undefined;
  const rule = (i, side) => inventory.rules[i]?.side === side ? inventory.rules[i].value : undefined;
  return {
    reference: { ...ref, schemaVersion: 1, errors: [],
      styles: inventory.styles.map((_, i) => style(i, 'reference')),
      rules: inventory.rules.map((_, i) => rule(i, 'reference')) },
    candidate: { ...ast, schemaVersion: 1, errors: [], resolvedStyleRevision: ac.resolvedStyleRevision,
      rules: ast.rules.map(i => rule(i, 'astylar')),
      nodes: ast.nodes.map(n => ({ ...n, resolvedStyle: style(n.style, 'astylar'),
        normalResolvedStyle: style(n.normalStyle, 'astylar'), interactionResolvedStyle: style(n.interactionStyle, 'astylar') })) },
  };
}

export function collectOriginStageEvidence(cases, inventory, canonicalStyle = style => style) {
  const observations = [], captures = [];
  for (const entry of cases) {
    const inputs = (entry.styleInputs ?? []).filter(i => i.reference?.transformOrigin !== undefined && i.astylar?.transformOrigin === undefined);
    if (!inputs.length) continue;
    const key = keyOf(entry), trees = originStageTrees(inventory, key);
    captures.push({ ...(entry.kind ? { kind: entry.kind } : {}), family: entry.family, profile: entry.profile, viewport: { id: entry.viewport?.id },
      ...(entry.state ? { state: entry.state } : {}), styleInputs: JSON.parse(JSON.stringify(inputs)) });
    for (const input of inputs) observations.push({ case: key, family: entry.family, element: input.id,
      property: 'transformOrigin', comparisonOrigin: canonicalStyle({ transformOrigin: input.reference.transformOrigin }).transformOrigin,
      ...(!trees ? { status: 'unresolved', reason: 'missing paired inventory evidence' }
        : inspectTransformOriginDeclarationStage(entry, trees.reference, trees.candidate, input)) });
  }
  return { schemaVersion: 1, captures, observations };
}

export function classifyOriginStageInput(input, property, reference, candidate, proof) {
  if (property !== 'transformOrigin' || proof?.status !== 'observed-declaration-stage-gap' ||
      proof.element !== input.id || proof.property !== property || reference !== proof.comparisonOrigin || candidate !== undefined ||
      proof.attribution !== originStageAttribution || proof.classification !== 'parity-harness-defect' ||
      ['inputEquivalent', 'candidateComputedOriginVerified', 'referenceBoxEqualityVerified', 'finalRasterVerified'].some(k => proof[k] !== false)) return;
  return { classification: proof.classification, attribution: proof.attribution, owner: proof.owner,
    justification: proof.justification, reviewEvidence: proof };
}

export function validateOriginStageEvidence(evidence, inventory, discrepancies, canonicalStyle = style => style) {
  const errors = [];
  if (evidence?.schemaVersion !== 1 || !Array.isArray(evidence.captures) || !Array.isArray(evidence.observations))
    return ['origin stage evidence is missing or malformed'];
  const replay = collectOriginStageEvidence(evidence.captures, inventory, canonicalStyle);
  if (!isDeepStrictEqual(replay, evidence)) errors.push('origin stage evidence does not replay from captured scalars and inventory');
  const positive = replay.observations.filter(o => o.status === 'observed-declaration-stage-gap');
  const identities = positive.map(o => JSON.stringify([o.case, o.element]));
  if (new Set(identities).size !== identities.length) errors.push('origin stage evidence has duplicate case/element identities');
  const consumed = new Set();
  for (const d of discrepancies.filter(d => d.attribution === originStageAttribution)) {
    const proof = positive.find(p => p.case === d.reviewEvidence?.case && p.element === d.element);
    if (!proof || !isDeepStrictEqual(proof, d.reviewEvidence) || d.property !== 'transformOrigin' ||
        d.reference !== proof.comparisonOrigin || d.astylar !== undefined || d.classification !== 'parity-harness-defect' ||
        d.recommendedOwner !== proof.owner || d.justification !== proof.justification || !Array.isArray(d.reviewedCases) ||
        d.reviewedCases.length !== d.occurrences || new Set(d.reviewedCases).size !== d.occurrences) {
      errors.push('origin stage attribution lacks exact property, owner, classification and full case evidence'); continue;
    }
    for (const key of d.reviewedCases) {
      const p = positive.find(p => p.case === key && p.element === d.element && p.comparisonOrigin === d.reference);
      const identity = JSON.stringify([key, d.element]);
      if (!p || consumed.has(identity)) errors.push('origin stage attribution has missing or duplicated observation');
      consumed.add(identity);
    }
  }
  if (consumed.size !== positive.length) errors.push('origin stage observations are not completely attributed');
  return errors;
}
