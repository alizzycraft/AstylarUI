// This is a conservative declaration-exclusion proof, not another cascade or
// selector engine. A possibly applicable color/reset rule prevents attribution,
// even when overridden, inactive, unsupported, or outside the current media.
const ordinaryTypes = new Set(['div', 'section', 'article', 'header', 'footer', 'nav', 'main', 'aside', 'span', 'p', 'label']);
export const borderColorProperties = ['borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor'];
export const borderInitialAttribution = 'reviewed-border-initial-color-divergence';
export const buttonBorderResetAttribution = 'reviewed-material-button-border-reset-omission';
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
  return collectBorderColorInputs(inventory, canonicalStyle, false);
}

export function collectButtonBorderResetInputs(inventory, canonicalStyle) {
  return collectBorderColorInputs(inventory, canonicalStyle, true);
}

function materialButtonReset(rules) {
  if (!Array.isArray(rules) || rules.some(rule => !object(rule?.declarations))) return;
  const reset = rules.filter(rule => rule.selector === '.mdc-button' && ['top', 'right', 'bottom', 'left'].every(side =>
    rule.declarations[`border-${side}-color`]?.value?.toLowerCase() === 'currentcolor' &&
    rule.declarations[`border-${side}-style`]?.value === 'none' && rule.declarations[`border-${side}-width`]?.value === 'medium'));
  if (reset.length !== 1) return;
  // Material disables animation in this benchmark. Require its actual matched
  // important declarations, not a class-name assumption or elapsed timeout.
  const noMotion = rules.filter(rule => rule.selector?.includes('._mat-animation-noopable') &&
    ['animation-name', 'transition-property'].every(key => rule.declarations[key]?.value === 'none' && rule.declarations[key]?.important === true));
  if (!noMotion.length) return;
  for (const rule of rules) for (const [key, declaration] of Object.entries(rule.declarations)) {
    if (!colorOrResetKey(key)) continue;
    if (/^(?:-webkit-|-moz-)?(?:animation|transition)/.test(key)) {
      if (declaration?.important && !noMotion.includes(rule)) return;
    } else if (rule !== reset[0] || !/^border-(top|right|bottom|left)-color$/.test(key)) return;
  }
  return { selector: reset[0].selector, reset: 'medium none currentColor',
    noMotionSelectors: noMotion.map(rule => rule.selector) };
}

function collectBorderColorInputs(inventory, canonicalStyle, buttonReset) {
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
      if (!id || !(buttonReset ? referenceNode.type === 'button' : ordinaryTypes.has(referenceNode.type) || /^mat-[a-z-]+$/.test(referenceNode.type)) ||
          ref.nodes.filter(node => idOf(node) === id).length !== 1 || !noColorOrReset(referenceNode.inline)) continue;
      const candidates = ast.nodes.filter(node => node.authored?.id === id);
      if (candidates.length !== 1 || !(buttonReset ? candidates[0].authored.type === 'button' : ordinaryTypes.has(candidates[0].authored.type))) continue;
      const candidate = candidates[0], authored = candidate.authored;
      if ((authored.class !== undefined && typeof authored.class !== 'string') || !noColorOrReset(authored.style ?? {})) continue;
      const refRules = referenceNode.rules.map(index => ruleAt(index, 'reference'));
      const resetEvidence = buttonReset ? materialButtonReset(refRules) : undefined;
      if (buttonReset ? !resetEvidence : refRules.some(rule => !noColorOrReset(rule?.declarations))) continue;
      const buttonRules = buttonReset ? rules.filter(rule => ['.material-button', '.text-button', '.toolbar-action'].includes(rule.selector) &&
        selectorCanApply(rule.selector, authored) &&
        canonicalStyle(rule).borderTopWidth === '0') : [];
      if (buttonReset && buttonRules.length !== 1) continue;
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
      if (buttonReset && [reference, ...normalizedStages].some(style => ['Top', 'Right', 'Bottom', 'Left'].some(side =>
        style[`border${side}Width`] !== '0' || style[`border${side}Style`] !== 'none'))) continue;
      result.push({ case: refCase.case, element: id, referenceNode: referenceNode.key, astylarNode: candidate.key,
        referenceType: referenceNode.type, astylarType: authored.type, source: ast.resolvedStyleSource,
        revision: astCases[0].resolvedStyleRevision, referenceColor: reference.color,
        referenceBorderColors: Object.fromEntries(borderColorProperties.map(property => [property, reference[property]])),
        candidateBorderColor: 'rgba(0,0,0,0)', referenceRules: [...referenceNode.rules], excludedCandidateRules: excludedRules,
        candidateRuleCount: ast.rules.length,
        ...(buttonReset ? { referenceReset: resetEvidence, candidateWidthRule: buttonRules[0].selector } : {}),
        classification: buttonReset ? 'application-plugin-authoring-defect' : 'intentional-documented-limitation',
        attribution: buttonReset ? buttonBorderResetAttribution : borderInitialAttribution,
        sourceFinding: buttonReset ? 'fixture-button-border-reset-reduced-to-width' : 'core-border-initial-color-differs-from-css',
        inputEquivalent: false, finalRasterVerified: false,
        scope: buttonReset ? 'Material button border reset omitted in translation. No border-box, typography, state paint, alpha or final-raster equivalence claim.' :
          'Omitted border-color initial input only. No structure, width, style, alpha paint, contextual-color paint or final-raster equivalence claim.' });
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

export function classifyButtonBorderResetInput(input, property, reference, astylar, proof, canonicalStyle) {
  if (!proof || proof.attribution !== buttonBorderResetAttribution || !materialButtonReset(input.referenceAuthored)) return;
  // Reuse strict mapped-stage checks after independently proving the explicit
  // reference reset. Do not describe its color declaration as omitted.
  const result = classifyBorderInitialInput({ ...input, referenceAuthored: [] }, property, reference, astylar, proof, canonicalStyle);
  if (!result || !input.astylarAuthored?.some(rule => rule.selector === proof.candidateWidthRule &&
      canonicalStyle(rule.declarations ?? {}).borderTopWidth === '0')) return;
  if ([input.reference, input.astylar, input.astylarNormalResolvedStyle, input.astylarInteractionResolvedStyle].some(raw => {
    const style = canonicalStyle(raw);
    return ['Top', 'Right', 'Bottom', 'Left'].some(side => style[`border${side}Width`] !== '0' || style[`border${side}Style`] !== 'none');
  })) return;
  return { classification: proof.classification, attribution: buttonBorderResetAttribution, reviewEvidence: structuredClone(proof),
    owner: 'showcase Material button border-reset translation; core currentColor support separately',
    justification: 'The captured .mdc-button rule explicitly resets every border side to medium none currentColor, with matched important no-animation declarations. The mapped core button instead authors only zero border width in its Material button rule; complete candidate rules and inline inputs omit border color/reset, and all three resolved stages retain transparent. This is incomplete authored reset semantics, not a native-UA guess, accepted zero-width equivalence or evidence that a shared color input was misrendered. The source omission exists in initial showcase commit 2f44011. Restore equivalent reset/color intent when the separate core contextual-color gap is addressed; do not sample a literal color or retune the fixture.' };
}
