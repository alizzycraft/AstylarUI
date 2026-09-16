import { isDeepStrictEqual } from 'node:util';
import { rootInitialSelectorCanApply } from './root-initial-style-evidence.mjs';

export const ownerGridInitialProperties = ['gridTemplateColumns', 'gridTemplateRows'];
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const normalize = key => key.replaceAll('-', '').toLowerCase();
const relevant = key => ['all', 'grid', 'gridtemplate', 'gridtemplatecolumns', 'gridtemplaterows', 'gridtemplateareas'].includes(normalize(key)) ||
  /^(animation|transition)/.test(normalize(key));

// Grid-template properties are not inherited. Inspect the actual owner, not a
// parent's unrelated grid formatting. This is a declaration-stage survey, not
// a computed-style engine, implicit-track solver or renderer-equivalence proof.
export function inspectOwnerGridInitial(input, property, reference, candidate) {
  const issues = [];
  const issue = (reason, detail = {}) => issues.push({ reason, ...detail });
  const finish = extra => ({ property, element: input?.id, issues,
    disposition: issues.length ? 'requires-specific-review' : 'captured-none-versus-local-omission',
    computedCandidateVerified: false, gridLayoutEquivalent: false, renderingEquivalent: false, ...extra });
  if (!ownerGridInitialProperties.includes(property) || !object(input) ||
      ![reference, candidate].every(t => object(t) && t.schemaVersion === 1 && Array.isArray(t.nodes) &&
        Array.isArray(t.rules) && Array.isArray(t.errors) && !t.errors.length) ||
      !Array.isArray(reference.styles) || candidate.resolvedStyleEvidenceVersion !== 2 ||
      candidate.resolvedStyleSource !== 'core-style-inspection' || input.astylarResolvedStyleEvidenceVersion !== 2 ||
      !Number.isInteger(candidate.resolvedStyleRevision) || candidate.resolvedStyleRevision < 0) {
    issue('incomplete-provenance'); return finish();
  }
  if (input.reference?.[property] !== 'none' || !object(input.astylar) || Object.hasOwn(input.astylar, property)) {
    issue('ineligible-value-pair'); return finish();
  }
  if ([reference, candidate].some(t => new Set(t.nodes.map(n => n.key)).size !== t.nodes.length)) {
    issue('duplicate-node-key'); return finish();
  }
  const ids = reference.nodes.filter(n => n.attributes?.id === input.id);
  const aliases = reference.nodes.filter(n => n.attributes?.['data-parity-id'] === input.id);
  const matches = ids.length ? ids : aliases;
  const candidates = candidate.nodes.filter(n => n.authored?.id === input.id);
  if (matches.length !== 1 || candidates.length !== 1) { issue('owner-mapping'); return finish(); }
  const r = matches[0], a = candidates[0];
  if (input.referenceStructure?.schemaVersion !== 2 || input.astylarStructure?.schemaVersion !== 2 ||
      input.referenceStructure.type !== r.type || input.astylarStructure.type !== a.authored.type) {
    issue('owner-type-mismatch'); return finish();
  }
  const stages = ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle'];
  const scalarStages = ['astylar', 'astylarNormalResolvedStyle', 'astylarInteractionResolvedStyle'];
  if (!Object.entries(input.reference).every(([k, v]) => reference.styles[r.style]?.[k] === v) ||
      stages.some((stage, index) => !isDeepStrictEqual(a[stage], input[scalarStages[index]]))) {
    issue('scalar-tree-disagreement'); return finish();
  }
  function declarations(value, side, source) {
    if (!object(value)) { issue('missing-declaration-evidence', { side, source }); return; }
    for (const [key, val] of Object.entries(value)) if (relevant(key))
      issue(/^(animation|transition)/.test(normalize(key)) ? 'motion-request-needs-review' : 'explicit-grid-or-reset-request',
        { side, source, key, value: val });
  }
  function attribute(value, side) {
    if (value === undefined) return;
    if (typeof value !== 'string' || /[\\/]/.test(value)) { issue('unparsed-inline-style', { side }); return; }
    for (const part of value.split(';')) {
      const at = part.indexOf(':');
      if (at >= 0 && relevant(part.slice(0, at).trim())) issue('inline-request', { side, declaration: part.trim() });
    }
  }
  declarations(r.inline, 'reference', 'inline'); attribute(r.attributes?.style, 'reference');
  if (!Array.isArray(r.rules)) issue('missing-rule-evidence', { side: 'reference' });
  else for (const index of r.rules) {
    const rule = reference.rules[index];
    if (!object(rule) || typeof rule.active !== 'boolean' || !Array.isArray(rule.conditions) || typeof rule.selector !== 'string')
      issue('missing-rule-evidence', { side: 'reference' });
    else declarations(rule.declarations, 'reference', rule.selector);
  }
  if (a.authored.style !== undefined) declarations(a.authored.style, 'astylar', 'inline');
  attribute(a.authored.attributes?.style, 'astylar');
  for (const stage of stages) declarations(a[stage], 'astylar', stage);
  for (const rule of candidate.rules) {
    if (!object(rule) || typeof rule.selector !== 'string') { issue('missing-rule-evidence', { side: 'astylar' }); continue; }
    if (rootInitialSelectorCanApply(rule.selector, a.authored)) {
      const { selector, ...values } = rule; declarations(values, 'astylar', selector);
    }
  }
  return finish({ referenceComputed: 'none', candidateLocalDeclaration: '<omitted>',
    referenceNode: r.key, candidateNode: a.key, referenceType: r.type, candidateType: a.authored.type,
    mapping: ids.length ? 'unique-id' : 'unique-data-parity-id',
    referenceDisplay: input.reference.display, candidateLocalDisplay: input.astylar.display,
    source: candidate.resolvedStyleSource, revision: candidate.resolvedStyleRevision });
}
