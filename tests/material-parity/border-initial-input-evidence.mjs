// This is a conservative declaration-exclusion proof, not another cascade or
// selector engine. A possibly applicable color/reset rule prevents attribution,
// even when overridden, inactive, unsupported, or outside the current media.
const ordinaryTypes = new Set(['div', 'section', 'article', 'header', 'footer', 'nav', 'main', 'aside', 'span', 'p', 'label']);
export const borderColorProperties = ['borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor'];
export const borderInitialAttribution = 'reviewed-border-initial-color-divergence';
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const colorOrResetKey = key => {
  const normalized = key.replaceAll('-', '').toLowerCase().replace(/^(webkit|moz)/, '');
  return normalized === 'all' || /^(animation|transition)/.test(normalized) || (normalized.startsWith('border') &&
    !/(width|style|radius)$/.test(normalized) && !normalized.startsWith('borderimage'));
};
const noColorOrReset = declarations => object(declarations) && !Object.keys(declarations).some(colorOrResetKey);

function selectorCanApply(selector, authored) {
  if (typeof selector !== 'string' || !selector.trim()) return true;
  return selector.split(',').some(part => {
    // Only unescaped compound type/id/class selectors and these state suffixes
    // can be excluded. Unknown syntax means possible, never a negative match.
    const match = part.trim().match(/^((?:[a-zA-Z][\w-]*|\*)?(?:[.#][_a-zA-Z][\w-]*)*)((?::(?:hover|active|focus|focus-visible|focus-within|disabled|enabled|checked))*)$/);
    if (!match || !match[1]) return true;
    const base = match[1], type = base.match(/^[a-zA-Z][\w-]*/)?.[0];
    if (type && type.toLowerCase() !== authored.type) return false;
    const classes = new Set((authored.class ?? '').split(/\s+/));
    return [...base.matchAll(/([.#])([_a-zA-Z][\w-]*)/g)].every(([, prefix, value]) =>
      prefix === '#' ? authored.id === value : classes.has(value));
  });
}

export function collectBorderInitialInputs(inventory, canonicalStyle) {
  const result = [];
  const styleAt = (index, side) => inventory.styles[index]?.side === side ? inventory.styles[index].value : undefined;
  const ruleAt = (index, side) => inventory.rules[index]?.side === side ? inventory.rules[index].value : undefined;
  const idOf = node => node.attributes?.['data-parity-id'] ?? node.attributes?.id;
  for (const refCase of inventory.cases.filter(entry => entry.side === 'reference')) {
    if (inventory.cases.filter(entry => entry.case === refCase.case && entry.side === 'reference').length !== 1) continue;
    const astCases = inventory.cases.filter(entry => entry.case === refCase.case && entry.side === 'astylar');
    if (astCases.length !== 1 || !Number.isInteger(astCases[0].resolvedStyleRevision) || astCases[0].resolvedStyleRevision < 0 ||
        inventory.errors.some(entry => entry.case === refCase.case)) continue;
    const ref = inventory.variants[refCase.variant], ast = inventory.variants[astCases[0].variant];
    if (ref?.side !== 'reference' || ast?.side !== 'astylar' || !ref.ruleEvidenceComplete || !ast.ruleEvidenceComplete ||
        ast.resolvedStyleEvidenceVersion !== 2 || ast.resolvedStyleSource !== 'core-style-inspection') continue;
    const rules = ast.rules.map(index => ruleAt(index, 'astylar'));
    // Nested declarations cannot be ruled out using the flat SiteStyle schema.
    if (rules.some(rule => !object(rule) || Object.values(rule).some(value => object(value) || Array.isArray(value)))) continue;
    for (const referenceNode of ref.nodes) {
      const id = idOf(referenceNode);
      // No browser-native control defaults or SVG paint are inferred. Custom
      // Material hosts have captured author rules but no native-control UA skin.
      if (!id || !(ordinaryTypes.has(referenceNode.type) || /^mat-[a-z-]+$/.test(referenceNode.type)) ||
          ref.nodes.filter(node => idOf(node) === id).length !== 1 || !noColorOrReset(referenceNode.inline)) continue;
      const candidates = ast.nodes.filter(node => node.authored?.id === id);
      if (candidates.length !== 1 || !ordinaryTypes.has(candidates[0].authored.type)) continue;
      const candidate = candidates[0], authored = candidate.authored;
      if ((authored.class !== undefined && typeof authored.class !== 'string') || !noColorOrReset(authored.style ?? {})) continue;
      const refRules = referenceNode.rules.map(index => ruleAt(index, 'reference'));
      if (refRules.some(rule => !noColorOrReset(rule?.declarations))) continue;
      const excludedRules = [];
      let possibleDeclaration = false;
      for (let index = 0; index < rules.length; index++) {
        if (noColorOrReset(rules[index])) continue;
        if (selectorCanApply(rules[index].selector, authored)) { possibleDeclaration = true; break; }
        excludedRules.push(ast.rules[index]);
      }
      if (possibleDeclaration) continue;
      const referenceRaw = styleAt(referenceNode.style, 'reference');
      const stages = [candidate.normalStyle, candidate.style, candidate.interactionStyle].map(index => styleAt(index, 'astylar'));
      if (!object(referenceRaw) || stages.some(stage => !object(stage))) continue;
      const reference = canonicalStyle(referenceRaw), normalizedStages = stages.map(canonicalStyle);
      if (!/^rgba\([\d.,]+\)$/.test(reference.color ?? '') || reference.color === 'rgba(0,0,0,0)' ||
          borderColorProperties.some(property => reference[property] !== reference.color) ||
          stages.some(stage => Object.keys(stage).some(key => colorOrResetKey(key) && key !== 'borderColor')) ||
          normalizedStages.some(stage => borderColorProperties.some(property => stage[property] !== 'rgba(0,0,0,0)'))) continue;
      result.push({ case: refCase.case, element: id, referenceNode: referenceNode.key, astylarNode: candidate.key,
        referenceType: referenceNode.type, astylarType: authored.type, source: ast.resolvedStyleSource,
        revision: astCases[0].resolvedStyleRevision, referenceColor: reference.color,
        referenceBorderColors: Object.fromEntries(borderColorProperties.map(property => [property, reference[property]])),
        candidateBorderColor: 'rgba(0,0,0,0)', referenceRules: [...referenceNode.rules], excludedCandidateRules: excludedRules,
        candidateRuleCount: ast.rules.length, classification: 'intentional-documented-limitation',
        attribution: borderInitialAttribution, sourceFinding: 'core-border-initial-color-differs-from-css',
        inputEquivalent: false, finalRasterVerified: false,
        scope: 'Omitted border-color initial input only. No structure, width, style, alpha paint, contextual-color paint or final-raster equivalence claim.' });
    }
  }
  return result;
}

export function classifyBorderInitialInput(input, property, reference, astylar, proof, canonicalStyle) {
  if (!proof || !borderColorProperties.includes(property) || reference !== proof.referenceColor || astylar !== proof.candidateBorderColor ||
      input.astylarResolvedStyleEvidenceVersion !== 2 || input.referenceStructure?.schemaVersion !== 2 || input.astylarStructure?.schemaVersion !== 2 ||
      input.referenceStructure.type !== proof.referenceType || input.astylarStructure.type !== proof.astylarType) return;
  const stages = [input.astylarNormalResolvedStyle, input.astylar, input.astylarInteractionResolvedStyle];
  if (stages.some(stage => !object(stage) || Object.keys(stage).some(key => colorOrResetKey(key) && key !== 'borderColor') ||
      borderColorProperties.some(key => canonicalStyle(stage)[key] !== proof.candidateBorderColor)) ||
      borderColorProperties.some(key => canonicalStyle(input.reference ?? {})[key] !== proof.referenceColor) ||
      canonicalStyle(input.reference ?? {}).color !== proof.referenceColor ||
      !Array.isArray(input.astylarAuthored) || input.astylarAuthored.some(rule => !noColorOrReset(rule.declarations)) ||
      !Array.isArray(input.referenceAuthored) || input.referenceAuthored.some(rule => !noColorOrReset(rule.declarations))) return;
  return { classification: proof.classification, attribution: borderInitialAttribution, reviewEvidence: structuredClone(proof),
    owner: 'core browser defaults and contextual border-color resolution',
    justification: 'The captured reference border colors equal its computed color and its matched author/inline rules omit border color and resets. The uniquely mapped ordinary candidate omits those declarations inline and in every potentially applicable captured rule, yet all three current core style stages resolve transparent. Complete candidate rules are checked independently of semantic-DOM matching; unknown selectors and possibly active state/media declarations prevent attribution. This is the documented core transparent initial value versus CSS currentColor, demonstrated by the public border-color proof, not equivalent inputs or a fixture fix. Border width, structure, alpha/contextual paint defects and final raster remain separate.' };
}
