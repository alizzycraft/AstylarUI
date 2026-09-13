import { selectorCanApply } from './border-initial-input-evidence.mjs';

// Inactive declarations are not a universal missing-value normalization. This
// proof covers only omitted templates on uniquely mapped ordinary block/flex
// nodes at the captured state. Active grid and plugin/native ownership stay out.
export const nonGridTemplateAttribution = 'reviewed-non-grid-template-omission';
export const gridTemplateProperties = ['gridTemplateColumns', 'gridTemplateRows'];
const ordinaryTypes = new Set(['div', 'section', 'article', 'header', 'footer', 'nav', 'main', 'aside', 'span', 'p', 'label']);
const nonGridDisplays = new Set(['block', 'flex']);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const gridOrResetKey = key => {
  const name = key.replaceAll('-', '').toLowerCase().replace(/^(webkit|moz)/, '');
  return name === 'all' || /^(grid|animation|transition)/.test(name);
};
const noGridOrReset = value => object(value) && !Object.keys(value).some(gridOrResetKey);

export function collectNonGridTemplateInputs(inventory) {
  const result = [];
  const styleAt = (index, side) => inventory.styles[index]?.side === side ? inventory.styles[index].value : undefined;
  const ruleAt = (index, side) => inventory.rules[index]?.side === side ? inventory.rules[index].value : undefined;
  const idOf = node => node.attributes?.['data-parity-id'] ?? node.attributes?.id;
  const casesByKey = new Map();
  for (const entry of inventory.cases) {
    const key = JSON.stringify([entry.case, entry.side]);
    const entries = casesByKey.get(key) ?? [];
    entries.push(entry); casesByKey.set(key, entries);
  }
  for (const refCase of inventory.cases.filter(entry => entry.side === 'reference')) {
    const astCases = casesByKey.get(JSON.stringify([refCase.case, 'astylar'])) ?? [];
    if (casesByKey.get(JSON.stringify([refCase.case, 'reference'])).length !== 1 || astCases.length !== 1 ||
        !Number.isInteger(astCases[0].resolvedStyleRevision) || astCases[0].resolvedStyleRevision < 0 ||
        inventory.errors.some(entry => entry.case === refCase.case)) continue;
    const ref = inventory.variants[refCase.variant], ast = inventory.variants[astCases[0].variant];
    if (ref?.side !== 'reference' || ast?.side !== 'astylar' || !ref.ruleEvidenceComplete || !ast.ruleEvidenceComplete ||
        ast.resolvedStyleEvidenceVersion !== 2 || ast.resolvedStyleSource !== 'core-style-inspection') continue;
    const rules = ast.rules.map(index => ruleAt(index, 'astylar'));
    if (rules.some(rule => !object(rule) || Object.values(rule).some(value => object(value) || Array.isArray(value)))) continue;
    for (const referenceNode of ref.nodes) {
      const id = idOf(referenceNode);
      if (!id || !ordinaryTypes.has(referenceNode.type) || ref.nodes.filter(node => idOf(node) === id).length !== 1 ||
          !noGridOrReset(referenceNode.inline)) continue;
      const candidates = ast.nodes.filter(node => node.authored?.id === id);
      if (candidates.length !== 1 || !ordinaryTypes.has(candidates[0].authored.type)) continue;
      const candidate = candidates[0], authored = candidate.authored;
      if ((authored.class !== undefined && typeof authored.class !== 'string') || !noGridOrReset(authored.style ?? {})) continue;
      const refRules = referenceNode.rules.map(index => ruleAt(index, 'reference'));
      if (refRules.some(rule => !noGridOrReset(rule?.declarations))) continue;
      const excludedCandidateRules = [];
      let possibleDeclaration = false;
      for (let index = 0; index < rules.length; index++) {
        if (noGridOrReset(rules[index])) continue;
        if (selectorCanApply(rules[index].selector, authored)) { possibleDeclaration = true; break; }
        excludedCandidateRules.push(ast.rules[index]);
      }
      if (possibleDeclaration) continue;
      const reference = styleAt(referenceNode.style, 'reference');
      const stages = [candidate.normalStyle, candidate.style, candidate.interactionStyle].map(index => styleAt(index, 'astylar'));
      if (!object(reference) || !nonGridDisplays.has(reference.display) ||
          gridTemplateProperties.some(property => reference[property] !== 'none') ||
          stages.some(stage => !noGridOrReset(stage) || !nonGridDisplays.has(stage.display))) continue;
      result.push({ case: refCase.case, element: id, referenceNode: referenceNode.key, astylarNode: candidate.key,
        referenceType: referenceNode.type, astylarType: authored.type, source: ast.resolvedStyleSource,
        revision: astCases[0].resolvedStyleRevision, referenceDisplay: reference.display,
        candidateDisplays: stages.map(stage => stage.display), referenceRules: [...referenceNode.rules],
        excludedCandidateRules, candidateRuleCount: ast.rules.length,
        classification: 'equivalent-representation', attribution: nonGridTemplateAttribution,
        propertyInputEquivalent: true, wholeElementInputEquivalent: false, finalRasterVerified: false,
        scope: 'Omitted grid templates in captured ordinary block/flex contexts only. No display, structure, layout, other-state or final-raster equivalence claim.' });
    }
  }
  return result;
}

export function classifyNonGridTemplateInput(input, property, reference, astylar, proof) {
  if (!proof || proof.attribution !== nonGridTemplateAttribution || !gridTemplateProperties.includes(property) ||
      reference !== 'none' || astylar !== undefined || input.id !== proof.element ||
      input.astylarResolvedStyleEvidenceVersion !== 2 || input.referenceStructure?.schemaVersion !== 2 || input.astylarStructure?.schemaVersion !== 2 ||
      input.referenceStructure.type !== proof.referenceType || input.astylarStructure.type !== proof.astylarType ||
      !object(input.reference) || input.reference.display !== proof.referenceDisplay ||
      gridTemplateProperties.some(key => input.reference[key] !== 'none')) return;
  const stages = [input.astylarNormalResolvedStyle, input.astylar, input.astylarInteractionResolvedStyle];
  if (stages.some((stage, index) => !noGridOrReset(stage) || stage.display !== proof.candidateDisplays[index]) ||
      !Array.isArray(input.referenceAuthored) || input.referenceAuthored.some(rule => !noGridOrReset(rule?.declarations)) ||
      !Array.isArray(input.astylarAuthored) || input.astylarAuthored.some(rule => !noGridOrReset(rule?.declarations))) return;
  return { classification: proof.classification, attribution: nonGridTemplateAttribution, reviewEvidence: structuredClone(proof),
    owner: 'core formatting-context dispatch; active-grid template semantics remain a separate confirmed defect',
    justification: 'Both uniquely mapped ordinary nodes use captured block/flex formatting contexts, with complete rules and inline declarations omitting grid templates and resets. Normal, comparison and interaction candidate stages omit the templates; browser computed values are none. Potential grid/animation/transition rules with unknown or possibly applicable selectors prevent this classification. Public equal-input two-child block/flex controls demonstrate that these templates do not select grid layout or assign track dimensions. Only the omitted-template request is equivalent here; unequal display/flow, structure, paint, future states and the active-grid none defect remain separate obligations.' };
}
