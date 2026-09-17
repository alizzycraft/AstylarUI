import { isDeepStrictEqual } from 'node:util';
import { resolveOriginAliasPair } from './origin-alias-mapping-evidence.mjs';
import { rootInitialSelectorCanApply } from './root-initial-style-evidence.mjs';

const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const one = xs => xs.length === 1 ? xs[0] : undefined;
const relevant = key => /^(caret.*|all|animation.*|transition.*)$/.test(key.replaceAll('-', '').toLowerCase());
const project = declarations => Object.fromEntries(Object.entries(declarations).filter(([key]) => relevant(key)));

function ancestry(tree, leaf) {
  const nodes = new Map(tree.nodes.map(n => [n.key, n])), seen = new Set(), result = [];
  for (let n = leaf; n; n = nodes.get(n.parent)) {
    if (seen.has(n.key)) return;
    seen.add(n.key); result.unshift(n);
    if (n.parent === null) return result;
  }
}

// A captured-ancestry survey, not a computed-value or visible-caret model.
// Reuse existing owner/selector proofs; never infer caret inheritance from an
// equal text color or fill the candidate omission with that color.
export function inspectOwnerCaretInput(input, reference, candidate, { family } = {}) {
  const issues = [], issue = (reason, detail = {}) => issues.push({ reason, ...detail });
  const finish = extra => ({ element: input?.id, property: 'caretColor', issues,
    disposition: issues.length ? 'requires-specific-review' : 'captured-caret-computed-versus-local-omission',
    inputEquivalent: false, computedCandidateVerified: false, descendantCaretVerified: false,
    renderingEquivalent: false, rendererCauseProven: false, ...extra });
  if (!object(input) || ![reference, candidate].every(t => object(t) && t.schemaVersion === 1 &&
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
  const an = one(candidate.nodes.filter(n => n.authored?.id === input.id));
  let rn = ids.length ? one(ids) : one(aliases), generatedIdentity;
  if (!rn && !ids.length && typeof family === 'string') {
    generatedIdentity = resolveOriginAliasPair({ family }, reference, candidate, input);
    if (['mapped', 'mapped-with-scalar-rule-gap'].includes(generatedIdentity.status) &&
        generatedIdentity.candidateNode === an?.key) {
      rn = one(reference.nodes.filter(n => n.key === generatedIdentity.referenceNode));
      if (generatedIdentity.status === 'mapped-with-scalar-rule-gap') issue('scalar-authored-rule-gap');
    }
  }
  if (!rn || !an || input.referenceStructure?.schemaVersion !== 2 || input.astylarStructure?.schemaVersion !== 2 ||
      input.referenceStructure.type !== rn.type || input.astylarStructure.type !== an.authored.type) {
    issue('owner-mapping'); return finish(generatedIdentity ? { generatedIdentity } : {});
  }
  const stages = ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle'];
  const scalarStages = ['astylar', 'astylarNormalResolvedStyle', 'astylarInteractionResolvedStyle'];
  if (!object(input.reference) || Object.keys(input.reference).length !== 89 ||
      typeof input.reference.caretColor !== 'string' || typeof input.reference.color !== 'string' ||
      Object.entries(input.reference).some(([key, value]) => reference.styles[rn.style]?.[key] !== value) ||
      stages.some((stage, i) => !object(an[stage]) || !isDeepStrictEqual(an[stage], input[scalarStages[i]]))) {
    issue('scalar-tree-disagreement'); return finish();
  }
  if (Array.isArray(rn.rules)) {
    const expected = rn.rules.map(i => reference.rules[i]).filter(r => r?.active === true)
      .map(r => ({ selector: r.selector, declarations: r.declarations }));
    if (object(rn.inline) && Object.keys(rn.inline).length) expected.push({ selector: '<inline>', declarations: rn.inline });
    const actual = Array.isArray(input.referenceAuthored)
      ? input.referenceAuthored.map(r => ({ selector: r.selector, declarations: r.declarations })) : undefined;
    if (!isDeepStrictEqual(expected, actual) && !issues.some(i => i.reason === 'scalar-authored-rule-gap'))
      issue('scalar-authored-rule-gap');
  }
  const rp = ancestry(reference, rn), ap = ancestry(candidate, an);
  if (!rp || !ap) { issue('incomplete-surface-ancestry'); return finish(); }
  if (rp[0].type !== 'main' || !String(rp[0].attributes?.class).split(/\s+/).includes('frame') ||
      !object(ap[0].authored) || Object.keys(ap[0].authored).length ||
      ap[1]?.authored?.type !== 'main' || ap[1]?.authored?.id !== 'page') {
    issue('unreviewed-captured-root-context');
    return finish({ referenceRoot: { key: rp[0].key, type: rp[0].type, attributes: rp[0].attributes },
      candidateRoot: { key: ap[0].key, authored: ap[0].authored },
      referencePath: rp.map(n => n.key), candidatePath: ap.map(n => n.key) });
  }
  const requests = { reference: [], astylar: [] };
  const declarations = (value, side, node, source, cssText) => {
    if (!object(value)) { issue('missing-declaration-evidence', { side, node, source }); return; }
    const selected = project(value);
    if (Object.keys(selected).length) {
      requests[side].push({ node, source, declarations: selected, ...(cssText === undefined ? {} : { cssText }) });
      issue('authored-caret-reset-or-motion-request', { side, node, source });
    }
  };
  const attribute = (value, side, node) => {
    if (value === undefined) return;
    if (typeof value !== 'string' || /[\\/]/.test(value)) { issue('unparsed-style-attribute', { side, node }); return; }
    for (const part of value.split(';')) {
      const at = part.indexOf(':');
      if (at >= 0 && relevant(part.slice(0, at).trim())) issue('relevant-style-attribute', { side, node, declaration: part.trim() });
    }
  };
  for (const n of rp) {
    const style = reference.styles[n.style];
    if (!object(style) || typeof style.caretColor !== 'string' || typeof style.color !== 'string')
      issue('missing-reference-computed-context', { node: n.key });
    if (['input', 'textarea'].includes(n.type) || n.attributes?.contenteditable !== undefined && n.attributes.contenteditable !== 'false')
      issue('editable-or-input-owner-needs-separate-proof', { side: 'reference', node: n.key });
    declarations(n.inline, 'reference', n.key, '<inline>'); attribute(n.attributes?.style, 'reference', n.key);
    if (!Array.isArray(n.rules)) issue('missing-rule-evidence', { side: 'reference', node: n.key });
    else for (const index of n.rules) {
      const rule = reference.rules[index];
      if (!object(rule) || typeof rule.selector !== 'string' || typeof rule.active !== 'boolean' || !Array.isArray(rule.conditions))
        issue('missing-rule-evidence', { side: 'reference', node: n.key, index });
      else declarations(rule.declarations, 'reference', n.key, rule.source ?? rule.selector, rule.cssText);
    }
  }
  for (const n of ap.filter(n => n.authored.type)) {
    if (['input', 'textarea'].includes(n.authored.type) || n.authored.attributes?.contenteditable !== undefined && n.authored.attributes.contenteditable !== 'false')
      issue('editable-or-input-owner-needs-separate-proof', { side: 'astylar', node: n.key });
    if (n.authored.style !== undefined) declarations(n.authored.style, 'astylar', n.key, '<inline>');
    attribute(n.authored.attributes?.style, 'astylar', n.key);
    for (const rule of candidate.rules) {
      if (!object(rule) || typeof rule.selector !== 'string') { issue('missing-rule-evidence', { side: 'astylar', node: n.key }); continue; }
      if (rootInitialSelectorCanApply(rule.selector, n.authored)) {
        const { selector, ...value } = rule; declarations(value, 'astylar', n.key, selector);
      }
    }
    for (const stage of stages) {
      if (!object(n[stage])) issue('missing-candidate-stage', { node: n.key, stage });
      else if (Object.keys(project(n[stage])).length) issue('candidate-local-caret-reset-or-motion-value', { node: n.key, stage });
    }
  }
  if (input.reference.caretColor !== input.reference.color) issue('reference-caret-differs-from-text-color');
  return finish({ referenceNode: rn.key, astylarNode: an.key,
    mapping: generatedIdentity?.method ?? (ids.length ? 'unique-shared-id' : 'unique-reference-data-parity-id'),
    ...(generatedIdentity ? { generatedIdentity } : {}), requests,
    referencePath: rp.map(n => ({ key: n.key, parent: n.parent, type: n.type,
      caretColor: reference.styles[n.style]?.caretColor, color: reference.styles[n.style]?.color })),
    candidatePath: ap.map(n => ({ key: n.key, parent: n.parent, type: n.authored.type,
      caretColor: n.resolvedStyle?.caretColor ?? '<omitted>', color: n.resolvedStyle?.color ?? '<omitted>' })),
    referenceComputedCaret: input.reference.caretColor, referenceComputedColor: input.reference.color,
    candidateLocalCaret: input.astylar.caretColor ?? '<omitted>',
    source: candidate.resolvedStyleSource, revision: candidate.resolvedStyleRevision,
    limit: 'Captured surface ancestry only; document-external inheritance, candidate computed colors, editable descendants, visible caret behavior and renderer causality are not established.' });
}
