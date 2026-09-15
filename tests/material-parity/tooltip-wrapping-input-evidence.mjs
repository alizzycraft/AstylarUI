import { resolveOriginAliasPair } from './origin-alias-mapping-evidence.mjs';
import { inspectOverlayOwnerDeclarations } from './overlay-owner-declaration-review.mjs';

const norm = key => key.replaceAll('-', '').toLowerCase();
const same = (values, expected) => values.every(v => v === expected);

// Authored wrapping differences only. Preserve unrelated ancestor motion and
// missing external context; neither is a reason to invent candidate used values.
export function inspectTooltipWrappingInput(entry, input, reference, candidate) {
  if (entry?.family !== 'tooltip' || entry.kind !== 'interaction' ||
      !['hover', 'held'].includes(entry.state) || input?.id !== 'tooltip-popup') return;
  const identity = resolveOriginAliasPair(entry, reference, candidate, input);
  if (identity.status !== 'mapped' || identity.missingRules.length || identity.extraRules.length) return;
  const properties = [];
  for (const property of ['whiteSpace', 'overflowWrap']) {
    const trace = inspectOverlayOwnerDeclarations(property, identity, reference, candidate);
    const owner = trace.candidatePath[0], values = Object.values(owner.localValues);
    if (property === 'whiteSpace') {
      if (trace.referencePath[0].computed !== 'normal' || !same(values, 'nowrap') ||
          !owner.possibleRules.some(r => r.selector === '#tooltip-popup' && r.declarations.whiteSpace === 'nowrap')) continue;
    } else {
      if (trace.referencePath[0].computed !== 'anywhere' || !same(values, '<omitted>') ||
          !trace.referencePath[0].rules.some(r => r.active && r.selector === '.mat-mdc-tooltip-surface' &&
            r.declarations['overflow-wrap']?.value === 'anywhere')) continue;
      const relevant = d => Object.keys(d).some(k => ['overflowwrap', 'wordwrap', 'all'].includes(norm(k)));
      if (trace.candidatePath.some(n => relevant(n.inline) || Object.values(n.declarations).some(relevant) ||
          n.possibleRules.some(r => relevant(r.declarations)) ||
          /(?:^|;)\s*(?:overflow-wrap|word-wrap|all)\s*:/i.test(n.authored.attributes?.style ?? ''))) continue;
    }
    properties.push({ property, reference: trace.referencePath[0].computed,
      candidateLocalDeclaration: property === 'whiteSpace' ? 'nowrap' : '<omitted>', trace });
  }
  if (!properties.length) return;
  return { identity, properties, source: candidate.resolvedStyleSource, revision: candidate.resolvedStyleRevision,
    classification: 'application-plugin-authoring-defect', inputEquivalent: false,
    candidateComputedVerified: false, originalVisualSymptomCauseProven: false, finalRasterVerified: false };
}
