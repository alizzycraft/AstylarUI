export const rootHeightAttribution = 'reviewed-root-fixed-height-authoring';
export const rootBoxSizingAttribution = 'reviewed-root-fixed-height-box-model';
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const px = value => typeof value === 'string' && /^\d+(?:\.\d+)?px$/.test(value);
const affects = declarations => Object.keys(declarations ?? {}).some(key =>
  ['height', 'minheight', 'maxheight', 'blocksize', 'minblocksize', 'maxblocksize', 'aspectratio', 'all']
    .includes(key.replaceAll('-', '').toLowerCase()) || /^(animation|transition|containintrinsic)/i.test(key.replaceAll('-', '')));
const noSize = declarations => object(declarations) && !affects(declarations);
const noInlineSize = node => noSize(node.inline) &&
  !/(?:^|;)\s*(?:(?:min-|max-)?(?:height|block-size)|aspect-ratio|all|animation[^:]*|transition[^:]*|contain-intrinsic[^:]*)\s*:/i.test(node.attributes?.style ?? '');
const validCandidateRules = (rules, id, height) => Array.isArray(rules) && rules.every(r => object(r.declarations)) &&
  rules.some(r => r.selector === `#${id}` && r.declarations.height === height) && rules.every(r => !affects(r.declarations) ||
    (r.selector === `#${id}` && px(r.declarations.height) &&
      Object.keys(r.declarations).every(k => k === 'height' || !affects({ [k]: true }))));

// The full root mapping has already been independently validated. This proves
// the declaration substitution, not a used-size or viewport-rule equivalence.
export function collectRootHeightInputs(rootTypographyInputs, canonical) {
  const results = [];
  for (const base of rootTypographyInputs.filter(p => p.property === 'fontFamily')) {
    const ref = base.referencePath[1], ast = base.candidatePath[1];
    if (!noInlineSize(ref) || !Array.isArray(ref.rules) || ref.rules.some(r => !noSize(r.declarations)) ||
        (ast.authored.style !== undefined && !noSize(ast.authored.style))) continue;
    const reference = canonical(ref.computed), stages = [ast.normal, ast.comparison, ast.effective];
    if (!px(reference.height) || reference.boxSizing !== 'content-box' || !stages.every(object)) continue;
    const height = ast.comparison.height;
    if (!px(height) || Number.parseFloat(height) <= 0 || stages.some(s => s.height !== height || s.boxSizing !== 'border-box') ||
        !validCandidateRules(ast.rules, base.element, height)) continue;
    results.push({ case: base.case, family: base.family, element: base.element, property: 'height',
      values: { referenceUsedHeight: reference.height, referenceHeightDeclaration: '<omitted>',
        referenceBoxSizing: reference.boxSizing, candidateHeightDeclaration: height, candidateBoxSizing: 'border-box' },
      source: base.source, revision: base.revision, referencePath: structuredClone(base.referencePath),
      candidatePath: structuredClone(base.candidatePath), classification: 'application-plugin-authoring-defect',
      inputEquivalent: false, usedSizeEquivalentVerified: false, responsiveRuleSelectionVerified: false, finalRasterVerified: false });
  }
  return results;
}

export function classifyRootHeightInput(input, property, reference, astylar, proof, canonical) {
  if (!proof || property !== 'height' || input.id !== proof.element || reference !== proof.values.referenceUsedHeight ||
      astylar !== canonical({ height: proof.values.candidateHeightDeclaration }).height || input.astylarResolvedStyleEvidenceVersion !== 2 ||
      input.referenceStructure?.schemaVersion !== 2 || input.astylarStructure?.schemaVersion !== 2 ||
      input.referenceStructure.type !== 'section' || input.astylarStructure.type !== 'section' || !object(input.reference) ||
      canonical(input.reference).height !== reference || input.reference.boxSizing !== 'content-box' ||
      !Array.isArray(input.referenceAuthored) || input.referenceAuthored.some(r => !noSize(r.declarations)) ||
      !validCandidateRules(input.astylarAuthored, input.id, proof.values.candidateHeightDeclaration) ||
      ['astylar', 'astylarNormalResolvedStyle', 'astylarInteractionResolvedStyle'].some(stage =>
        !object(input[stage]) || input[stage].height !== proof.values.candidateHeightDeclaration || input[stage].boxSizing !== 'border-box')) return;
  return { classification: 'application-plugin-authoring-defect', attribution: rootHeightAttribution,
    owner: 'showcase fixed demo-height tables and responsive height substitutions', reviewEvidence: structuredClone(proof),
    justification: 'The mapped HTML section has no authored height constraint and reports a used content-box height. The candidate root rule explicitly requests a fixed pixel border-box height, retained by all three declaration stages. Source findings fixture-fixed-reference-heights and fixture-responsive-height-compensation identify the measured per-family tables and breakpoint overrides. This is unequal authoring even when the outer boxes happen to coincide. Preserve both raw sizes and box-sizing modes: their numeric difference alone is not a core height defect. This attribution does not verify responsive winner selection, actual candidate used size, descendant layout or raster, and does not justify adding further measured dimensions.' };
}

const affectsBox = declarations => Object.keys(declarations ?? {}).some(key =>
  ['boxsizing', 'all'].includes(key.replaceAll('-', '').toLowerCase()) || /^(animation|transition)/i.test(key));
const noBox = declarations => object(declarations) && !affectsBox(declarations);
const explicitRootBox = (rules, id) => Array.isArray(rules) && rules.every(r => object(r.declarations)) &&
  rules.some(r => r.selector === `#${id}` && r.declarations.boxSizing === 'border-box') &&
  rules.every(r => !affectsBox(r.declarations) || (r.selector === `#${id}` &&
    r.declarations.boxSizing === 'border-box' && Object.keys(r.declarations).every(k => k === 'boxSizing' || !affectsBox({ [k]: true }))));

// Attribute the box-model change only as a companion to independently proven
// fixed-height authoring. Different box modes alone do not prove a defect:
// converted maximum-width constraints can still be equivalent.
export function hasRootBoxSizingWitness(proof) {
  if (!proof || proof.property !== 'height' || proof.classification !== 'application-plugin-authoring-defect' || !object(proof.values) ||
      !Array.isArray(proof.referencePath) || !Array.isArray(proof.candidatePath) ||
      proof.values.referenceBoxSizing !== 'content-box' || proof.values.candidateBoxSizing !== 'border-box') return false;
  const ref = proof.referencePath[1], ast = proof.candidatePath[1];
  return object(ref) && object(ast) && object(ast.authored) && noBox(ref.inline) && !/(?:^|;)\s*(?:box-sizing|all|animation[^:]*|transition[^:]*)\s*:/i.test(ref.attributes?.style ?? '') &&
    Array.isArray(ref.rules) && ref.rules.every(r => noBox(r.declarations)) &&
    (ast.authored.style === undefined || noBox(ast.authored.style)) && explicitRootBox(ast.rules, proof.element);
}

export function classifyRootBoxSizingInput(input, property, reference, astylar, proof, canonical) {
  if (property !== 'boxSizing' || reference !== 'content-box' || astylar !== 'border-box' ||
      !hasRootBoxSizingWitness(proof) || !Array.isArray(input.referenceAuthored) ||
      input.referenceAuthored.some(r => !noBox(r.declarations)) || !explicitRootBox(input.astylarAuthored, input.id) ||
      !classifyRootHeightInput(input, 'height', proof.values.referenceUsedHeight,
        canonical({ height: proof.values.candidateHeightDeclaration }).height, proof, canonical)) return;
  return { classification: 'application-plugin-authoring-defect', attribution: rootBoxSizingAttribution,
    owner: 'showcase fixed demo-height authoring and associated box-model translation', reviewEvidence: structuredClone(proof),
    justification: 'The original mapped section has no authored box-sizing override and computes content-box. The candidate root rule explicitly supplies border-box along with the independently proven fixed-height substitution, retained by every captured declaration stage. This attributes the companion box-model change to that existing unequal-authoring path; it is not another core defect, nor a claim that different box modes can never express equivalent constraints. Preserve separately verified maximum-width conversions, both raw dimensions and the fixed-versus-content-driven distinction. Actual used geometry, responsive rule selection, descendant layout and final raster require their own evidence.' };
}
