// This is a conservative declaration-exclusion proof, not another cascade or
// selector engine. A possibly applicable color/reset rule prevents attribution,
// even when overridden, inactive, unsupported, or outside the current media.
const ordinaryTypes = new Set(['div', 'section', 'article', 'header', 'footer', 'nav', 'main', 'aside', 'span', 'p', 'label']);
export const borderColorProperties = ['borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor'];
export const borderInitialAttribution = 'reviewed-border-initial-color-divergence';
export const buttonBorderResetAttribution = 'reviewed-material-button-border-reset-omission';
export const outlineTokenAttribution = 'reviewed-material-outline-token-substitution';
export const chipOutlineAttribution = 'reviewed-chip-outline-owner-substitution';
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const colorOrResetKey = key => {
  const normalized = key.replaceAll('-', '').toLowerCase().replace(/^(webkit|moz)/, '');
  return normalized === 'all' || /^(animation|transition)/.test(normalized) || (normalized.startsWith('border') &&
    !/(width|style|radius)$/.test(normalized) && !normalized.startsWith('borderimage'));
};
const noColorOrReset = declarations => object(declarations) && !Object.keys(declarations).some(colorOrResetKey);

export function selectorCanApply(selector, authored) {
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

const outlineTargets = [
  { candidate: '.outlined', referenceType: 'button', candidateType: 'button',
    reference: '.mat-mdc-outlined-button:not(:disabled)',
    declaration: 'border-color: var(--mat-button-outlined-outline-color, var(--mat-sys-outline))',
    sides: ['Top', 'Right', 'Bottom', 'Left'], sourceFinding: 'fixture-outlined-button-literal-replaces-outline-token' },
  { candidate: '#button-toggle-primary', referenceType: 'mat-button-toggle-group', candidateType: 'div',
    reference: '.mat-button-toggle-standalone.mat-button-toggle-appearance-standard, .mat-button-toggle-group-appearance-standard',
    declaration: 'border: solid 1px var(--mat-button-toggle-divider-color, var(--mat-sys-outline))',
    sides: ['Top', 'Right', 'Bottom', 'Left'], sourceFinding: 'fixture-toggle-group-literal-replaces-divider-token' },
  { candidate: '#button-toggle-two', referenceType: 'mat-button-toggle', candidateType: 'div',
    reference: '.mat-button-toggle-group-appearance-standard .mat-button-toggle-appearance-standard + .mat-button-toggle-appearance-standard',
    declaration: 'border-left: solid 1px var(--mat-button-toggle-divider-color, var(--mat-sys-outline))',
    sides: ['Left'], sourceFinding: 'fixture-toggle-divider-literal-replaces-divider-token' },
];

// A deliberately finite authored-expression witness, not a CSS parser. The
// browser keeps these pending variable shorthands in cssText while serializing
// expanded longhands as empty. Empty values alone never prove token authorship.
function outlineReference(rules, target, requireSerialized) {
  if (!Array.isArray(rules) || rules.some(rule => !object(rule?.declarations))) return;
  const tokens = rules.filter(rule => rule.selector === target.reference);
  if (tokens.length !== 1) return;
  const token = tokens[0], colorKeys = target.sides.map(side => `border-${side.toLowerCase()}-color`);
  if (requireSerialized && (typeof token.cssText !== 'string' ||
      token.cssText.split(';').filter(part => part.trim() === target.declaration).length !== 1)) return;
  if (colorKeys.some(key => token.declarations[key]?.value !== '' || token.declarations[key]?.important !== false) ||
      Object.keys(token.declarations).some(key => colorOrResetKey(key) && !colorKeys.includes(key))) return;
  const rest = rules.filter(rule => rule !== token);
  const reset = target.referenceType === 'button' ? materialButtonReset(rest) : undefined;
  if (target.referenceType === 'button' ? !reset : rest.some(rule => !noColorOrReset(rule.declarations))) return;
  return { token, ...(reset ? { reset } : {}) };
}

function outlineStyles(referenceRaw, stages, sides, canonicalStyle) {
  if (!object(referenceRaw) || stages.some(stage => !object(stage) ||
      Object.keys(stage).some(key => colorOrResetKey(key) && key !== 'borderColor'))) return;
  const reference = canonicalStyle(referenceRaw), candidate = stages.map(canonicalStyle);
  const color = reference[`border${sides[0]}Color`];
  if (!/^rgba\(\d+,\d+,\d+,1\)$/.test(color ?? '') || color === 'rgba(121,116,126,1)' ||
      sides.some(side => reference[`border${side}Color`] !== color || reference[`border${side}Width`] !== '1px' ||
        reference[`border${side}Style`] !== 'solid') ||
      candidate.some(style => borderColorProperties.some(key => style[key] !== 'rgba(121,116,126,1)') ||
        sides.some(side => style[`border${side}Width`] !== '1px' || style[`border${side}Style`] !== 'solid'))) return;
  return { referenceColor: color, candidateBorderColor: 'rgba(121,116,126,1)' };
}

export function collectOutlineTokenInputs(inventory, canonicalStyle) {
  const result = [], cases = new Map();
  for (const entry of inventory.cases) {
    if (!cases.has(entry.case)) cases.set(entry.case, []);
    cases.get(entry.case).push(entry);
  }
  const styleAt = (index, side) => inventory.styles[index]?.side === side ? inventory.styles[index].value : undefined;
  const ruleAt = (index, side) => inventory.rules[index]?.side === side ? inventory.rules[index].value : undefined;
  const idOf = node => node.attributes?.['data-parity-id'] ?? node.attributes?.id;
  for (const [key, entries] of cases) {
    const refs = entries.filter(entry => entry.side === 'reference'), asts = entries.filter(entry => entry.side === 'astylar');
    if (refs.length !== 1 || asts.length !== 1 || !Number.isInteger(asts[0].resolvedStyleRevision) || asts[0].resolvedStyleRevision < 0 ||
        inventory.errors.some(error => error.case === key)) continue;
    const ref = inventory.variants[refs[0].variant], ast = inventory.variants[asts[0].variant];
    if (ref?.side !== 'reference' || ast?.side !== 'astylar' || !ref.ruleEvidenceComplete || !ast.ruleEvidenceComplete ||
        ast.resolvedStyleEvidenceVersion !== 2 || ast.resolvedStyleSource !== 'core-style-inspection') continue;
    const rules = ast.rules.map(index => ruleAt(index, 'astylar'));
    if (rules.some(rule => !object(rule) || Object.values(rule).some(value => object(value) || Array.isArray(value)))) continue;
    for (const candidate of ast.nodes) for (const target of outlineTargets) {
      const authored = candidate.authored, id = authored?.id;
      if (!id || authored.type !== target.candidateType || (authored.class !== undefined && typeof authored.class !== 'string') ||
          !selectorCanApply(target.candidate, authored) || !noColorOrReset(authored.style ?? {}) ||
          ast.nodes.filter(node => node.authored?.id === id).length !== 1) continue;
      const refNodes = ref.nodes.filter(node => idOf(node) === id);
      if (refNodes.length !== 1 || refNodes[0].type !== target.referenceType || !noColorOrReset(refNodes[0].inline)) continue;
      const node = refNodes[0], refRules = node.rules.map(index => ruleAt(index, 'reference'));
      if (refRules.some(rule => !object(rule) || typeof rule.active !== 'boolean')) continue;
      const referenceWitness = outlineReference(refRules.filter(rule => rule.active), target, true);
      if (!referenceWitness) continue;
      const literals = rules.filter(rule => rule.selector === target.candidate);
      if (literals.length !== 1 || literals[0].borderColor !== '#79747e' ||
          Object.keys(literals[0]).some(key => colorOrResetKey(key) && key !== 'borderColor')) continue;
      const excluded = [];
      let conflict = false;
      for (const [index, rule] of rules.entries()) {
        if (rule === literals[0] || noColorOrReset(rule)) continue;
        if (selectorCanApply(rule.selector, authored)) { conflict = true; break; }
        excluded.push(ast.rules[index]);
      }
      if (conflict) continue;
      const colors = outlineStyles(styleAt(node.style, 'reference'),
        [candidate.normalStyle, candidate.style, candidate.interactionStyle].map(index => styleAt(index, 'astylar')), target.sides, canonicalStyle);
      if (!colors) continue;
      result.push({ case: key, element: id, referenceNode: node.key, astylarNode: candidate.key,
        referenceType: node.type, astylarType: authored.type, source: ast.resolvedStyleSource, revision: asts[0].resolvedStyleRevision,
        ...colors, properties: target.sides.map(side => `border${side}Color`), referenceWitness,
        candidateRule: literals[0], referenceRules: [...node.rules], excludedCandidateRules: excluded, candidateRuleCount: ast.rules.length,
        classification: 'application-plugin-authoring-defect', attribution: outlineTokenAttribution, sourceFinding: target.sourceFinding,
        inputEquivalent: false, finalRasterVerified: false,
        scope: 'Captured explicit token versus literal border-color input only; no other-side, shape, typography, animation paint or final-raster equivalence claim.' });
    }
  }
  return result;
}

export function classifyOutlineTokenInput(input, property, reference, astylar, proof, canonicalStyle) {
  const target = outlineTargets.find(target => target.sourceFinding === proof?.sourceFinding);
  if (!target || proof.attribution !== outlineTokenAttribution || input.id !== proof.element ||
      !proof.properties.includes(property) || reference !== proof.referenceColor || astylar !== proof.candidateBorderColor ||
      input.astylarResolvedStyleEvidenceVersion !== 2 || input.referenceStructure?.schemaVersion !== 2 || input.astylarStructure?.schemaVersion !== 2 ||
      input.referenceStructure.type !== proof.referenceType || input.astylarStructure.type !== proof.astylarType) return;
  const witness = outlineReference(input.referenceAuthored, target, false);
  if (!witness || JSON.stringify(witness.token.declarations) !== JSON.stringify(proof.referenceWitness.token.declarations) ||
      JSON.stringify(witness.reset) !== JSON.stringify(proof.referenceWitness.reset)) return;
  const colors = outlineStyles(input.reference, [input.astylarNormalResolvedStyle, input.astylar, input.astylarInteractionResolvedStyle], target.sides, canonicalStyle);
  if (!colors || colors.referenceColor !== reference || colors.candidateBorderColor !== astylar || !Array.isArray(input.astylarAuthored)) return;
  const literals = input.astylarAuthored.filter(rule => rule.selector === target.candidate);
  if (literals.length !== 1 || literals[0].declarations?.borderColor !== '#79747e' ||
      input.astylarAuthored.some(rule => !object(rule.declarations) || Object.keys(rule.declarations).some(key =>
        colorOrResetKey(key) && !(rule === literals[0] && key === 'borderColor')))) return;
  return { classification: proof.classification, attribution: outlineTokenAttribution, reviewEvidence: structuredClone(proof),
    owner: 'showcase Material outline/divider token and side-specific border input translation',
    justification: 'The uniquely mapped reference has the exact active serialized Material token shorthand and pending expanded color declarations. Its computed relevant border colors differ from the explicit candidate #79747e rule retained at all three current core style stages. Complete candidate rules exclude other possibly applicable color/reset inputs; duplicate, unknown, incomplete or conflicting witnesses reject attribution. Reference button reset/no-animation evidence is checked separately, and the second toggle covers only its left divider. This is source-traced unequal color authoring, not an accepted palette alias or equal-input core paint failure. Preserve the original token/side intent rather than sampling the observed color; shape, other sides and final raster remain separate.' };
}

const chipSides = ['Top', 'Right', 'Bottom', 'Left'];
const chipProperties = chipSides.flatMap(side => [`border${side}Color`, `border${side}Style`, `border${side}Width`]);
const chipBorderKey = key => {
  const k = key.replaceAll('-', '').toLowerCase().replace(/^(webkit|moz)/, '');
  return k === 'all' || /^(animation|transition)/.test(k) || (k.startsWith('border') && !k.endsWith('radius'));
};
const chipNoBorder = declarations => object(declarations) && !Object.keys(declarations).some(chipBorderKey);
function chipSelectorCanApply(selector, authored) {
  if (typeof selector !== 'string') return true;
  return selector.split(',').some(part => {
    // A finite descendant selector ending in a different element type cannot
    // target this host, regardless of its ancestors. Unknown syntax stays possible.
    const terminal = part.trim().match(/^(?:[.#][_a-zA-Z][\w-]*\s+)+([a-zA-Z][\w-]*)$/)?.[1];
    if (terminal && terminal.toLowerCase() !== authored.type) return false;
    return selectorCanApply(part, authored);
  });
}
function chipHostRules(rules) {
  return Array.isArray(rules) && rules.every(rule => object(rule?.declarations) && Object.entries(rule.declarations).every(([key, value]) =>
    !chipBorderKey(key) || (['animation-duration', 'transition-duration'].includes(key) &&
      rule.selector === '.mat-mdc-standard-chip._mat-animation-noopable, .mat-mdc-standard-chip._mat-animation-noopable .mdc-evolution-chip__graphic, .mat-mdc-standard-chip._mat-animation-noopable .mdc-evolution-chip__checkmark, .mat-mdc-standard-chip._mat-animation-noopable .mdc-evolution-chip__checkmark-path' &&
      value?.value === '1ms' && value?.important === false)));
}
const chipPseudoBase = '.mat-mdc-standard-chip .mdc-evolution-chip__action--primary::before';
const chipPseudoColor = '.mat-mdc-standard-chip:not(.mdc-evolution-chip--disabled) .mdc-evolution-chip__action--primary::before';
const chipPseudoSelected = '.mat-mdc-standard-chip.mdc-evolution-chip--selected .mdc-evolution-chip__action--primary::before';
const chipPseudoFocus = '.mdc-evolution-chip__action--primary:not(.mdc-evolution-chip__action--presentational):not(.mdc-ripple-upgraded):focus::before';
function chipPseudoRules(rules, selected) {
  const expected = new Map([
    [chipPseudoBase, 'border-width: var(--mat-chip-outline-width, 1px); border-radius: var(--mat-chip-container-shape-radius, 8px); box-sizing: border-box; content: ""; height: 100%; left: 0px; position: absolute; pointer-events: none; top: 0px; width: 100%; z-index: 1; border-style: solid;'],
    [chipPseudoColor, 'border-color: var(--mat-chip-outline-color, var(--mat-sys-outline));'],
    [chipPseudoSelected, 'border-width: var(--mat-chip-flat-selected-outline-width, 0);'],
    [chipPseudoFocus, 'border-color: var(--mat-chip-focus-outline-color, var(--mat-sys-on-surface-variant));'],
  ]);
  if (!Array.isArray(rules) || rules.some(rule => !object(rule?.declarations) ||
      expected.get(rule.selector) !== rule.cssText || Object.values(rule.declarations).some(d => d?.important !== false)) ||
      new Set(rules.map(rule => rule.selector)).size !== rules.length) return false;
  for (const selector of [chipPseudoBase, chipPseudoColor, ...(selected ? [chipPseudoSelected] : [])]) {
    if (!rules.some(rule => rule.selector === selector)) return false;
  }
  if (!selected && rules.some(rule => rule.selector === chipPseudoSelected)) return false;
  return rules.every(rule => {
    const expected = {};
    if (rule.selector === chipPseudoBase) {
      Object.assign(expected, { 'box-sizing': 'border-box', content: '""', height: '100%', left: '0px', position: 'absolute',
        'pointer-events': 'none', top: '0px', width: '100%', 'z-index': '1' });
      for (const corner of ['top-left', 'top-right', 'bottom-right', 'bottom-left']) expected[`border-${corner}-radius`] = '';
      for (const side of chipSides) { expected[`border-${side.toLowerCase()}-width`] = ''; expected[`border-${side.toLowerCase()}-style`] = 'solid'; }
    } else for (const side of chipSides) expected[`border-${side.toLowerCase()}-${rule.selector === chipPseudoSelected ? 'width' : 'color'}`] = '';
    return Object.keys(rule.declarations).length === Object.keys(expected).length &&
      Object.entries(expected).every(([k, value]) => rule.declarations[k]?.value === value);
  });
}
function chipStyles(referenceRaw, stages, selected, canonicalStyle) {
  if (!object(referenceRaw) || stages.some(s => !object(s) || Object.keys(s).some(k =>
    chipBorderKey(k) && !['borderWidth', 'borderStyle', 'borderColor'].includes(k)))) return;
  const reference = canonicalStyle(referenceRaw), candidate = stages.map(canonicalStyle);
  if (!/^rgba\(\d+,\d+,\d+,1\)$/.test(reference.color ?? '') || chipSides.some(side =>
      reference[`border${side}Width`] !== '0' || reference[`border${side}Style`] !== 'none' || reference[`border${side}Color`] !== reference.color) ||
      candidate.some(style => chipSides.some(side => style[`border${side}Width`] !== (selected ? '0' : '1px') ||
        style[`border${side}Style`] !== 'solid' || style[`border${side}Color`] !== 'rgba(121,116,126,1)'))) return;
  return { reference: Object.fromEntries(chipProperties.map(p => [p, reference[p]])),
    candidate: Object.fromEntries(chipProperties.map(p => [p, candidate[0][p]])) };
}

export function collectChipOutlineInputs(inventory, canonicalStyle) {
  const result = [], cases = new Map();
  for (const entry of inventory.cases) { if (!cases.has(entry.case)) cases.set(entry.case, []); cases.get(entry.case).push(entry); }
  const valueAt = (pool, index, side) => pool[index]?.side === side ? pool[index].value : undefined;
  const classes = value => typeof value === 'string' ? value.split(/\s+/) : [];
  for (const [key, entries] of cases) {
    const refs = entries.filter(e => e.side === 'reference'), asts = entries.filter(e => e.side === 'astylar');
    if (refs.length !== 1 || asts.length !== 1 || !Number.isInteger(asts[0].resolvedStyleRevision) || asts[0].resolvedStyleRevision < 0 ||
        inventory.errors.some(e => e.case === key)) continue;
    const ref = inventory.variants[refs[0].variant], ast = inventory.variants[asts[0].variant];
    if (ref?.side !== 'reference' || ast?.side !== 'astylar' || !ref.ruleEvidenceComplete || !ast.ruleEvidenceComplete ||
        ast.resolvedStyleEvidenceVersion !== 2 || ast.resolvedStyleSource !== 'core-style-inspection' ||
        new Set(ref.nodes.map(n => n.key)).size !== ref.nodes.length || new Set(ast.nodes.map(n => n.key)).size !== ast.nodes.length) continue;
    const rules = ast.rules.map(i => valueAt(inventory.rules, i, 'astylar'));
    if (rules.some(rule => !object(rule) || Object.values(rule).some(v => object(v) || Array.isArray(v)))) continue;
    for (const id of ['chip-0', 'chip-1']) {
      const hosts = ref.nodes.filter(n => (n.attributes?.['data-parity-id'] ?? n.attributes?.id) === id);
      const candidates = ast.nodes.filter(n => n.authored?.id === id);
      if (hosts.length !== 1 || candidates.length !== 1) continue;
      const host = hosts[0], candidate = candidates[0], authored = candidate.authored;
      if (host.type !== 'mat-chip-option' || authored.type !== 'div' || !classes(authored.class).includes('chip') ||
          typeof authored.ariaSelected !== 'boolean' || !chipNoBorder(host.inline) || !chipNoBorder(authored.style ?? {})) continue;
      const selected = authored.ariaSelected;
      if (!classes(authored.class).includes(selected ? 'selected' : 'unselected') ||
          classes(authored.class).includes(selected ? 'unselected' : 'selected') ||
          !classes(host.attributes?.class).includes('mat-mdc-standard-chip') ||
          classes(host.attributes?.class).includes('mdc-evolution-chip--selected') !== selected) continue;
      const actions = ref.nodes.filter(n => {
        if (n.type !== 'button' || !classes(n.attributes?.class).includes('mdc-evolution-chip__action--primary')) return false;
        const seen = new Set(); let parent = n.parent;
        while (parent !== null && !seen.has(parent)) { if (parent === host.key) return true; seen.add(parent); parent = ref.nodes.find(n => n.key === parent)?.parent; }
        return false;
      });
      if (actions.length !== 1 || actions[0].attributes?.['aria-selected'] !== String(selected) ||
          actions[0].attributes?.['aria-disabled'] !== 'false') continue;
      const action = actions[0], pseudos = action.pseudoElements?.filter(p => p.pseudo === '::before' && p.generated);
      if (pseudos?.length !== 1) continue;
      const pseudo = pseudos[0], refRules = host.rules.map(i => valueAt(inventory.rules, i, 'reference'));
      const pseudoRules = pseudo.rules.map(i => valueAt(inventory.rules, i, 'reference'));
      if ([...refRules, ...pseudoRules].some(rule => !object(rule) || typeof rule.active !== 'boolean') ||
          !chipHostRules(refRules.filter(r => r.active)) || !chipPseudoRules(pseudoRules.filter(r => r.active), selected)) continue;
      const outline = valueAt(inventory.styles, pseudo.style, 'reference');
      if (!object(outline) || outline.position !== 'absolute' || outline.boxSizing !== 'border-box' || outline.pointerEvents !== 'none' ||
          outline.content !== '""' || chipSides.some(side => outline[`border${side}Width`] !== (selected ? '0px' : '1px') ||
            outline[`border${side}Style`] !== 'solid')) continue;
      const outlineColors = canonicalStyle(outline);
      if (!/^rgba\(\d+,\d+,\d+,1\)$/.test(outlineColors.borderTopColor ?? '') ||
          chipSides.some(side => outlineColors[`border${side}Color`] !== outlineColors.borderTopColor)) continue;
      const bases = rules.filter(r => r.selector === '.chip'), selections = rules.filter(r => r.selector === '.chip.selected');
      if (bases.length !== 1 || selections.length !== 1 || bases[0].borderWidth !== '1px' || bases[0].borderStyle !== 'solid' ||
          bases[0].borderColor !== '#79747e' || selections[0].borderWidth !== '0' ||
          Object.keys(bases[0]).some(k => chipBorderKey(k) && !['borderWidth', 'borderStyle', 'borderColor'].includes(k)) ||
          Object.keys(selections[0]).some(k => chipBorderKey(k) && k !== 'borderWidth')) continue;
      const excluded = []; let conflict = false;
      for (const [index, rule] of rules.entries()) {
        if (rule === bases[0] || rule === selections[0] || chipNoBorder(rule)) continue;
        if (chipSelectorCanApply(rule.selector, authored)) { conflict = true; break; }
        excluded.push(ast.rules[index]);
      }
      if (conflict) continue;
      const styles = chipStyles(valueAt(inventory.styles, host.style, 'reference'),
        [candidate.normalStyle, candidate.style, candidate.interactionStyle].map(i => valueAt(inventory.styles, i, 'astylar')), selected, canonicalStyle);
      if (!styles) continue;
      result.push({ case: key, element: id, selected, referenceNode: host.key, astylarNode: candidate.key, actionNode: action.key,
        source: ast.resolvedStyleSource, revision: asts[0].resolvedStyleRevision, ...styles,
        referenceHostRules: refRules.filter(r => r.active), referenceOutline: { owner: action.key, pseudo: pseudo.pseudo,
          style: outline, rules: pseudoRules.filter(r => r.active) },
        candidateRules: [bases[0], selections[0]], excludedCandidateRules: excluded, candidateRuleCount: ast.rules.length,
        classification: 'application-plugin-authoring-defect', attribution: chipOutlineAttribution,
        sourceFinding: 'fixture-chip-outline-pseudo-replaced-by-host-border', inputEquivalent: false, finalRasterVerified: false });
    }
  }
  return result;
}

export function classifyChipOutlineInput(input, property, reference, astylar, proof, canonicalStyle) {
  if (!proof || proof.attribution !== chipOutlineAttribution || !chipProperties.includes(property) || input.id !== proof.element ||
      input.referenceStructure?.schemaVersion !== 2 || input.astylarStructure?.schemaVersion !== 2 ||
      input.referenceStructure.type !== 'mat-chip-option' || input.astylarStructure.type !== 'div' ||
      input.astylarResolvedStyleEvidenceVersion !== 2 || reference !== proof.reference[property] || astylar !== proof.candidate[property] ||
      !chipHostRules(input.referenceAuthored)) return;
  const styles = chipStyles(input.reference, [input.astylarNormalResolvedStyle, input.astylar, input.astylarInteractionResolvedStyle], proof.selected, canonicalStyle);
  if (!styles || JSON.stringify(styles.reference) !== JSON.stringify(proof.reference) || JSON.stringify(styles.candidate) !== JSON.stringify(proof.candidate) ||
      !Array.isArray(input.astylarAuthored)) return;
  const base = input.astylarAuthored.filter(r => r.selector === '.chip'), selected = input.astylarAuthored.filter(r => r.selector === '.chip.selected');
  if (base.length !== 1 || selected.length !== (proof.selected ? 1 : 0) ||
      base[0].declarations?.borderWidth !== '1px' || base[0].declarations?.borderStyle !== 'solid' || base[0].declarations?.borderColor !== '#79747e' ||
      input.astylarAuthored.some(rule => !object(rule.declarations) || Object.keys(rule.declarations).some(k => chipBorderKey(k) &&
        !(rule === base[0] && ['borderWidth', 'borderStyle', 'borderColor'].includes(k)) &&
        !(rule === selected[0] && k === 'borderWidth' && rule.declarations[k] === '0')))) return;
  return { classification: proof.classification, attribution: chipOutlineAttribution, reviewEvidence: structuredClone(proof),
    owner: 'showcase chip outline owner, state and token translation',
    justification: 'The captured zero-border reference host contains a separate action-button generated outline; the candidate instead authors the border on the chip host. Exact selected state, active pseudo declarations, parent-chain ownership, all three core stages and complete candidate rule exclusions are proved. The scalar host border remains distinct from the recorded pseudo border; neither its color nor box-model effect is an equivalent alias or a demonstrated core failure. Restore original outline/token/state ownership before reducing remaining renderer differences; do not shift labels, subtract padding or tune widths. Other styling, accessibility, hit regions and final raster remain separate.' };
}
