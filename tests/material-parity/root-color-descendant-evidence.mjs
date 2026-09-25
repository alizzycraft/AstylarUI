import { isDeepStrictEqual } from 'node:util';
import { collectRootColorInputs } from './root-color-input-evidence.mjs';
import { rootInitialSelectorCanApply } from './root-initial-style-evidence.mjs';
import { reviewedTemplateTextMappings } from './input-equivalence-audit.mjs';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const unsafe = value => !object(value) || Object.keys(value).some(key =>
  ['color', 'all'].includes(key.replaceAll('-', '').toLowerCase()) || /^(animation|transition)/i.test(key));

// Bind diagnostic scalar identity and all local stages to complete captured
// trees before using an inherited-request proof. No used color is synthesized.
export function inspectDescendantColor(input, root, reference, candidate, canonical, { family, case: caseKey } = {}) {
  const one = xs => xs.length === 1 ? xs[0] : undefined;
  if (!object(input) || !root || root.family !== family || root.case !== caseKey ||
      input.astylarResolvedStyleEvidenceVersion !== 2 ||
      ![reference, candidate].every(t => object(t) && t.schemaVersion === 1 && t.ruleEvidenceComplete === true &&
        Array.isArray(t.nodes) && Array.isArray(t.rules) && Array.isArray(t.errors) && !t.errors.length) ||
      !Array.isArray(reference.styles) || candidate.resolvedStyleEvidenceVersion !== 2 ||
      candidate.resolvedStyleSource !== root.source || candidate.resolvedStyleRevision !== root.revision ||
      candidate.rules.some(r => !object(r) || typeof r.selector !== 'string' ||
        Object.values(r).some(v => v !== null && typeof v === 'object'))) return;
  let rn = one(reference.nodes.filter(n => n.attributes?.id === input.id));
  const an = one(candidate.nodes.filter(n => n.authored?.id === input.id));
  let mapping = { kind: 'unique-captured-id' };
  if (!reference.nodes.some(n => n.attributes?.id === input.id)) {
    const aliases = reference.nodes.filter(n => n.attributes?.['data-parity-id'] === input.id);
    if (aliases.length === 1) { rn = aliases[0]; mapping = { kind: 'unique-captured-data-parity-id' }; }
    else {
      mapping = one(reviewedTemplateTextMappings(family, reference, candidate).filter(m => m.element === input.id));
      if (mapping && an && mapping.astylarNode === an.key && (!aliases.length || aliases.some(n => n.key === mapping.referenceNode)))
        rn = one(reference.nodes.filter(n => n.key === mapping.referenceNode));
    }
  }
  if (!rn || !an || input.referenceStructure?.schemaVersion !== 2 || input.astylarStructure?.schemaVersion !== 2 ||
      input.referenceStructure.type !== rn.type || input.astylarStructure.type !== an.authored.type) return;
  const path = (tree, node) => {
    const byKey = new Map(tree.nodes.map(n => [n.key, n]));
    if (byKey.size !== tree.nodes.length) return;
    const result = [], seen = new Set();
    while (node && !seen.has(node.key)) {
      seen.add(node.key); result.unshift(node);
      if (node.parent === null) return result;
      node = byKey.get(node.parent);
    }
  };
  const rp = path(reference, rn), ap = path(candidate, an);
  if (!rp || !ap || !object(ap[0].authored) || Object.keys(ap[0].authored).length ||
      ap[1]?.authored?.id !== 'page') return;
  // Reject cycles anywhere before reconstructing subtree text.
  if (reference.nodes.some(n => !path(reference, n))) return;
  const text = n => String(n.ownText ?? '') + reference.nodes.filter(c => c.parent === n.key).map(text).join('');
  const normalize = v => String(v ?? '').replace(/\s+/g, ' ').trim();
  if (normalize(['input', 'textarea'].includes(rn.type) ? rn.value : text(rn)) !== input.referenceStructure.text ||
      normalize(an.authored.textContent ?? an.authored.value) !== input.astylarStructure.ownText ||
      reference.styles[rn.style]?.color !== input.reference?.color ||
      !object(input.reference) || canonical(input.reference).color !== root.values.reference ||
      ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle'].some((stage, i) =>
        !isDeepStrictEqual(an[stage], input[['astylar', 'astylarNormalResolvedStyle', 'astylarInteractionResolvedStyle'][i]]))) return;
  const referencePath = rp.map(n => ({ key: n.key, parent: n.parent, type: n.type, attributes: n.attributes,
    inline: n.inline, computed: reference.styles[n.style], rules: n.rules?.map(i => reference.rules[i]) }));
  const candidatePath = ap.slice(1).map(n => ({ key: n.key, parent: n.parent, authored: n.authored,
    normal: n.normalResolvedStyle, comparison: n.resolvedStyle, effective: n.interactionResolvedStyle,
    rules: candidate.rules.filter(r => rootInitialSelectorCanApply(r.selector, n.authored))
      .map(({selector, ...declarations}) => ({selector, declarations})) }));
  const ancestry = extendRootColorAncestry(root, referencePath, candidatePath, canonical);
  if (!ancestry) return;
  return { ...ancestry, element: input.id, ownerCorrespondenceVerified: true,
    mapping: { ...mapping, referenceNode: rn.key, astylarNode: an.key },
    inputEquivalent: false, renderingEquivalent: false };
}

// Reuse the unchanged historical root reader. The extension proves declaration
// ancestry only; callers must bind owners, original scalars and source inventory.
// Keeping this separately imported avoids changing historical collector receipts.
export function extendRootColorAncestry(root, referencePath, candidatePath, canonical) {
  if (!root || root.property !== 'color' || root.classification !== 'parity-harness-defect' ||
      root.computedCandidateVerified !== false || root.finalRasterVerified !== false ||
      root.source !== 'core-style-inspection' || !Number.isInteger(root.revision) || root.revision < 0 ||
      !Array.isArray(referencePath) || !Array.isArray(candidatePath) ||
      referencePath.length <= 2 || candidatePath.length <= 2 ||
      !isDeepStrictEqual(referencePath.slice(0, 2), root.referencePath) ||
      !isDeepStrictEqual(candidatePath.slice(0, 2), root.candidatePath)) return;
  const replay = collectRootColorInputs([{ ...root, property: 'fontFamily' }], canonical);
  if (replay.length !== 1 || !isDeepStrictEqual(replay[0], root)) return;
  const complete = nodes => nodes.every((n, i) => object(n) && typeof n.key === 'string' &&
    n.key.length > 0 && (!i || n.parent === nodes[i - 1].key)) && new Set(nodes.map(n => n.key)).size === nodes.length;
  if (!complete(referencePath) || !complete(candidatePath)) return;
  const safeAttribute = value => value === undefined || typeof value === 'string' &&
    !/[\\/]/.test(value) && !/(?:^|;)\s*(?:color|all|animation[^:]*|transition[^:]*)\s*:/i.test(value);
  if (referencePath.slice(2).some(n => unsafe(n.inline) || !safeAttribute(n.attributes?.style) ||
      !object(n.computed) || canonical(n.computed).color !== root.values.reference ||
      !Array.isArray(n.rules) || n.rules.some(r => !object(r) || typeof r.active !== 'boolean' ||
        !Array.isArray(r.conditions) || unsafe(r.declarations))) ||
      candidatePath.slice(2).some(n => !object(n.authored) ||
        (n.authored.style !== undefined && unsafe(n.authored.style)) || !safeAttribute(n.authored.attributes?.style) ||
        !Array.isArray(n.rules) || n.rules.some(r => !object(r) || unsafe(r.declarations)) ||
        [n.normal, n.comparison, n.effective].some(unsafe))) return;
  return { case: root.case, family: root.family, property: 'color',
    values: structuredClone(root.values), source: root.source, revision: root.revision,
    rootElement: root.element, referencePath: structuredClone(referencePath), candidatePath: structuredClone(candidatePath),
    classification: 'parity-harness-defect', computedCandidateVerified: false, finalRasterVerified: false,
    ownerCorrespondenceVerified: false };
}
