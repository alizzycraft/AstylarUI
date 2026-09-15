import { isDeepStrictEqual } from 'node:util';
import { rootInitialSelectorCanApply } from './root-initial-style-evidence.mjs';

export const ownerInitialValues = Object.freeze({ fontStyle: 'normal', wordSpacing: '0px',
  textTransform: 'none', whiteSpace: 'normal', overflowWrap: 'normal', wordBreak: 'normal',
  pointerEvents: 'auto', visibility: 'visible' });
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const normalize = k => k.replaceAll('-', '').toLowerCase();
const one = xs => xs.length === 1 ? xs[0] : undefined;
const aliases = { fontStyle: ['font'], overflowWrap: ['wordwrap'],
  whiteSpace: ['whitespacecollapse', 'textwrap', 'textwrapmode', 'textwrapstyle'] };

function pathToRoot(tree, owner) {
  const byKey = new Map(tree.nodes.map(n => [n.key, n]));
  if (byKey.size !== tree.nodes.length) return;
  const result = [], seen = new Set();
  let node = owner;
  while (node) {
    if (seen.has(node.key)) return;
    seen.add(node.key); result.unshift(node);
    if (node.parent === null) return result;
    node = byKey.get(node.parent);
  }
}

// A conservative survey, NOT an attribution or a CSS computed-style engine.
// Unknown selectors and animation/transition declarations remain review blockers.
// Root paths stop at the captured surface: document-external inheritance remains
// unverified even when every captured node computes the same initial keyword.
export function inspectOwnerInitialStyle(input, property, reference, candidate) {
  const issues = [];
  const issue = (reason, detail = {}) => issues.push({ reason, ...detail });
  const finish = extra => ({ property, element: input?.id, issues,
    disposition: issues.length ? 'requires-specific-review' : 'captured-default-versus-local-omission',
    computedCandidateVerified: false, renderingEquivalent: false, ...extra });
  if (!Object.hasOwn(ownerInitialValues, property) || !object(input) ||
      ![reference, candidate].every(t => object(t) && t.schemaVersion === 1 &&
        Array.isArray(t.nodes) && Array.isArray(t.rules) && Array.isArray(t.errors) && !t.errors.length) ||
      candidate.resolvedStyleEvidenceVersion !== 2 || candidate.resolvedStyleSource !== 'core-style-inspection' ||
      !Number.isInteger(candidate.resolvedStyleRevision) || candidate.resolvedStyleRevision < 0 ||
      input.astylarResolvedStyleEvidenceVersion !== 2 || !Array.isArray(reference.styles)) {
    issue('incomplete-provenance'); return finish();
  }
  const rn = one(reference.nodes.filter(n => n.attributes?.id === input.id));
  const an = one(candidate.nodes.filter(n => n.authored?.id === input.id));
  if (!rn || !an || input.referenceStructure?.type !== rn.type || input.astylarStructure?.type !== an.authored.type) {
    issue('owner-mapping'); return finish();
  }
  const rp = pathToRoot(reference, rn), ap = pathToRoot(candidate, an);
  if (!rp || !ap || rp[0].type !== 'main' || !String(rp[0].attributes?.class).split(/\s+/).includes('frame') ||
      ap[0].parent !== null || !object(ap[0].authored) || Object.keys(ap[0].authored).length ||
      ap[1]?.authored?.type !== 'main' || ap[1]?.authored?.id !== 'page') {
    issue('incomplete-surface-ancestry'); return finish();
  }
  const stages = ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle'];
  const scalarStages = ['astylar', 'astylarNormalResolvedStyle', 'astylarInteractionResolvedStyle'];
  if (reference.styles[rn.style]?.[property] !== input.reference?.[property] ||
      stages.some((stage, i) => !isDeepStrictEqual(an[stage], input[scalarStages[i]]))) {
    issue('scalar-tree-disagreement'); return finish();
  }
  const relevant = k => [normalize(property), 'all', ...(aliases[property] ?? [])].includes(normalize(k)) ||
    /^(animation|transition)/.test(normalize(k));
  const declarations = (d, side, node, source) => {
    if (!object(d)) { issue('missing-declaration-evidence', { side, node, source }); return; }
    for (const [key, value] of Object.entries(d)) if (relevant(key))
      issue(/^(animation|transition)/.test(normalize(key)) ? 'motion-request-needs-review' : 'explicit-relevant-request',
        { side, node, source, key, value });
  };
  const attribute = (value, side, node) => {
    if (value === undefined) return;
    if (typeof value !== 'string' || /[\\/]/.test(value)) {
      issue('unparsed-inline-style', { side, node }); return;
    }
    // The parsed inline object is also reviewed. This separate conservative
    // check catches authored attributes not represented in candidate snapshots.
    for (const part of value.split(';')) {
      const at = part.indexOf(':');
      if (at >= 0 && relevant(part.slice(0, at).trim()))
        issue('inline-style-request', { side, node, declaration: part.trim() });
    }
  };
  for (const n of rp) {
    if (reference.styles[n.style]?.[property] !== ownerInitialValues[property])
      issue('reference-noninitial-value', { node: n.key, value: reference.styles[n.style]?.[property] });
    declarations(n.inline, 'reference', n.key, 'inline');
    attribute(n.attributes?.style, 'reference', n.key);
    if (!Array.isArray(n.rules)) issue('missing-rule-evidence', { side: 'reference', node: n.key });
    else for (const i of n.rules) {
      const rule = reference.rules[i];
      if (!object(rule) || typeof rule.active !== 'boolean' || !Array.isArray(rule.conditions) || typeof rule.selector !== 'string')
        issue('missing-rule-evidence', { side: 'reference', node: n.key });
      else declarations(rule.declarations, 'reference', n.key, rule.selector);
    }
  }
  for (const n of ap.slice(1)) {
    if (n.authored.style !== undefined) declarations(n.authored.style, 'astylar', n.key, 'inline');
    attribute(n.authored.attributes?.style, 'astylar', n.key);
    for (const stage of stages) declarations(n[stage], 'astylar', n.key, stage);
    for (const rule of candidate.rules) {
      if (!object(rule) || typeof rule.selector !== 'string') { issue('missing-rule-evidence', { side: 'astylar', node: n.key }); continue; }
      if (rootInitialSelectorCanApply(rule.selector, n.authored)) {
        const { selector, ...d } = rule;
        declarations(d, 'astylar', n.key, selector);
      }
    }
  }
  return finish({ referenceComputed: input.reference[property], candidateLocalDeclaration: input.astylar[property] ?? '<omitted>',
    referencePath: rp.map(n => n.key), candidatePath: ap.map(n => n.key),
    source: candidate.resolvedStyleSource, revision: candidate.resolvedStyleRevision });
}
