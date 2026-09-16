import { isDeepStrictEqual } from 'node:util';
import { rootInitialSelectorCanApply } from './root-initial-style-evidence.mjs';

export const ownerGapProperties = Object.freeze(['columnGap', 'rowGap']);
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const one = values => values.length === 1 ? values[0] : undefined;
const normalize = key => key.replaceAll('-', '').toLowerCase();
const relevant = key => /^(?:gap|rowgap|columngap|gridgap|gridrowgap|gridcolumngap|all|animation.*|transition.*)$/.test(normalize(key));
const project = declarations => Object.fromEntries(Object.entries(declarations).filter(([key]) => relevant(key)));

// A property-local survey, not a cascade resolver or a canonical classification.
// In particular, a normal browser keyword and a missing local field are never
// converted to synthetic zero or accepted as computed/rendered equivalence.
export function inspectOwnerGapInput(input, property, reference, candidate) {
  const issues = [];
  const issue = (reason, detail = {}) => issues.push({ reason, ...detail });
  const finish = extra => ({ element: input?.id, property, issues,
    disposition: issues.length ? 'requires-specific-review' : 'captured-normal-versus-local-omission',
    computedCandidateVerified: false, renderingEquivalent: false, inputEquivalent: false, ...extra });
  if (!ownerGapProperties.includes(property) || !object(input) ||
      ![reference, candidate].every(t => object(t) && t.schemaVersion === 1 &&
        Array.isArray(t.nodes) && Array.isArray(t.rules) && Array.isArray(t.errors) && !t.errors.length) ||
      !Array.isArray(reference.styles) || candidate.resolvedStyleEvidenceVersion !== 2 ||
      candidate.resolvedStyleSource !== 'core-style-inspection' ||
      !Number.isInteger(candidate.resolvedStyleRevision) || candidate.resolvedStyleRevision < 0 ||
      input.astylarResolvedStyleEvidenceVersion !== 2) {
    issue('incomplete-provenance'); return finish();
  }
  if ([reference, candidate].some(t => new Set(t.nodes.map(n => n.key)).size !== t.nodes.length)) {
    issue('duplicate-tree-key'); return finish();
  }
  const ids = reference.nodes.filter(n => n.attributes?.id === input.id);
  const aliases = reference.nodes.filter(n => n.attributes?.['data-parity-id'] === input.id);
  const rn = ids.length ? one(ids) : one(aliases);
  const an = one(candidate.nodes.filter(n => n.authored?.id === input.id));
  if (!rn || !an || input.referenceStructure?.schemaVersion !== 2 || input.astylarStructure?.schemaVersion !== 2 ||
      input.referenceStructure.type !== rn.type || input.astylarStructure.type !== an.authored.type) {
    issue('owner-mapping'); return finish();
  }
  const stages = ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle'];
  const scalarStages = ['astylar', 'astylarNormalResolvedStyle', 'astylarInteractionResolvedStyle'];
  if (!object(input.reference) || reference.styles[rn.style]?.[property] !== input.reference[property] ||
      stages.some((stage, i) => !object(an[stage]) || !isDeepStrictEqual(an[stage], input[scalarStages[i]]))) {
    issue('scalar-tree-disagreement'); return finish();
  }
  const requests = { reference: [], astylar: [] };
  const declarations = (value, side, source) => {
    if (!object(value)) { issue('missing-declarations', { side, source }); return; }
    const selected = project(value);
    if (Object.keys(selected).length) requests[side].push({ source, declarations: selected });
  };
  const attribute = (value, side) => {
    if (value === undefined) return;
    if (typeof value !== 'string' || /[\\/]/.test(value)) {
      issue('unparsed-style-attribute', { side }); return;
    }
    for (const part of value.split(';')) {
      const at = part.indexOf(':');
      if (at >= 0 && relevant(part.slice(0, at).trim()))
        issue('relevant-style-attribute', { side, declaration: part.trim() });
    }
  };
  declarations(rn.inline, 'reference', '<inline>');
  attribute(rn.attributes?.style, 'reference');
  if (!Array.isArray(rn.rules)) issue('missing-rule-evidence', { side: 'reference' });
  else for (const index of rn.rules) {
    const rule = reference.rules[index];
    if (!object(rule) || typeof rule.selector !== 'string' || typeof rule.active !== 'boolean' || !Array.isArray(rule.conditions))
      issue('missing-rule-evidence', { side: 'reference', index });
    else declarations(rule.declarations, 'reference', rule.selector);
  }
  if (an.authored.style !== undefined) declarations(an.authored.style, 'astylar', '<inline>');
  attribute(an.authored.attributes?.style, 'astylar');
  for (const rule of candidate.rules) {
    if (!object(rule) || typeof rule.selector !== 'string') { issue('missing-rule-evidence', { side: 'astylar' }); continue; }
    // Unknown terminal/state selectors are possibly applicable, never discarded.
    if (rootInitialSelectorCanApply(rule.selector, an.authored)) {
      const { selector, ...value } = rule; declarations(value, 'astylar', selector);
    }
  }
  const candidateStages = Object.fromEntries(stages.map(stage => [stage, project(an[stage])]));
  if (input.reference[property] !== 'normal') issue('reference-non-normal-value');
  for (const side of ['reference', 'astylar']) if (requests[side].length)
    issue('relevant-authored-request', { side });
  if (Object.values(candidateStages).some(value => Object.keys(value).length)) issue('candidate-local-gap-or-motion-value');
  return finish({ referenceNode: rn.key, astylarNode: an.key,
    mapping: ids.length ? 'unique-shared-id' : 'unique-reference-data-parity-id',
    referenceComputed: input.reference[property], candidateLocal: input.astylar[property] ?? '<omitted>',
    formatting: { reference: reference.styles[rn.style]?.display, astylar: an.resolvedStyle.display },
    requests, candidateStages, source: candidate.resolvedStyleSource, revision: candidate.resolvedStyleRevision,
    limit: 'Local request/stage evidence only; structural equivalence, inherited reset requests, used gaps, descendants and renderer causality are not established.' });
}
