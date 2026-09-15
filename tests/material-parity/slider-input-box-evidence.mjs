import { isDeepStrictEqual } from 'node:util';

const one = nodes => nodes?.length === 1 ? nodes[0] : undefined;
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const sides = ['Top', 'Right', 'Bottom', 'Left'];
const relevant = key => /^(all$|padding|boxsizing)/.test(key.replaceAll('-', '').toLowerCase());

// This establishes unequal authored box requests, not the cause of every drag
// failure. Native dynamic hit-region generation is retained rather than replaced
// by sampled pixel widths, half-domains, or a fixture padding correction.
export function inspectSliderInputBox(entry, input, reference, candidate) {
  if (entry.family !== 'slider' || !['slider-start', 'slider-primary'].includes(input.id) ||
      reference?.schemaVersion !== 1 || candidate?.schemaVersion !== 1 ||
      reference.errors?.length !== 0 || candidate.errors?.length !== 0 ||
      candidate.resolvedStyleEvidenceVersion !== 2 || candidate.resolvedStyleSource !== 'core-style-inspection' ||
      !Number.isInteger(candidate.resolvedStyleRevision) || candidate.resolvedStyleRevision < 0) return;
  for (const tree of [reference, candidate]) if (!Array.isArray(tree.nodes) ||
      new Set(tree.nodes.map(n => n.key)).size !== tree.nodes.length) return;
  const ref = one(reference.nodes.filter(n => n.attributes?.id === input.id));
  const ast = one(candidate.nodes.filter(n => n.authored?.id === input.id));
  if (!ref || !ast || ref.type !== 'input' || ref.attributes.type !== 'range' ||
      !String(ref.attributes.class).split(/\s+/).includes('mdc-slider__input') ||
      ast.authored.type !== 'input' || ast.authored.inputType !== 'range' || ast.authored.class !== 'range-layer' ||
      reference.nodes.some(n => n.parent === ref.key) || candidate.nodes.some(n => n.parent === ast.key)) return;
  if (input.referenceStructure?.schemaVersion !== 2 || input.astylarStructure?.schemaVersion !== 2 ||
      input.referenceStructure.type !== 'input' || input.astylarStructure.type !== 'input' ||
      input.astylarResolvedStyleEvidenceVersion !== 2 ||
      !object(input.reference) || !object(reference.styles?.[ref.style]) ||
      Object.entries(input.reference).some(([key, value]) => !isDeepStrictEqual(value, reference.styles[ref.style][key])) ||
      !isDeepStrictEqual(input.astylar, ast.resolvedStyle) ||
      !isDeepStrictEqual(input.astylarNormalResolvedStyle, ast.normalResolvedStyle) ||
      !isDeepStrictEqual(input.astylarInteractionResolvedStyle, ast.interactionResolvedStyle)) return;
  const inline = ref.inline;
  if (!object(inline) || sides.some(side => {
    const property = `padding${side}`, declaration = inline[`padding-${side.toLowerCase()}`];
    return !declaration || declaration.important !== false || !['0px', '16px'].includes(declaration.value) ||
      input.reference[property] !== declaration.value;
  })) return;
  const referenceRules = ref.rules?.map(i => reference.rules?.[i]);
  const boxRule = one(referenceRules?.filter(r => r?.selector === '.mdc-slider__input' &&
    r.declarations?.['box-sizing']?.value === 'content-box'));
  if (!boxRule || input.reference.boxSizing !== 'content-box' || !Array.isArray(input.astylarAuthored) ||
      input.astylarAuthored.some(r => !object(r.declarations) || Object.keys(r.declarations).some(relevant)) ||
      Object.keys(ast.authored.style ?? {}).some(relevant)) return;
  for (const style of [ast.resolvedStyle, ast.normalResolvedStyle, ast.interactionResolvedStyle]) {
    if (!object(style) || style.padding !== '8px' || Object.keys(style).some(k => relevant(k) && k !== 'padding') ||
        style.width !== '50%' || style.height !== '44px' || style.opacity !== '0') return;
  }
  return { element: input.id, classification: 'application-plugin-authoring-defect',
    attribution: 'observed-slider-native-box-request-replacement', inputEquivalent: false, finalRasterVerified: false,
    scope: 'Explicit native padding and content-box requests versus omitted candidate requests and fixed-half sizing. Other style differences, core default compatibility and drag/raster outcomes are not classified by this proof.',
    reference: { node: ref.key, parent: ref.parent, attributes: ref.attributes, inline,
      boxRule, computed: input.reference, fullTreeComputed: reference.styles[ref.style] },
    candidate: { node: ast.key, parent: ast.parent, authored: ast.authored,
      matchingRules: input.astylarAuthored, effective: ast.resolvedStyle,
      normal: ast.normalResolvedStyle, interaction: ast.interactionResolvedStyle },
    properties: [...sides.map(side => ({ property: `padding${side}`, reference: input.reference[`padding${side}`],
      candidate: '8px', referenceSource: 'native input inline style', candidateSource: 'generic input default, no captured authored override' })),
    { property: 'boxSizing', reference: 'content-box', candidate: null,
      referenceSource: '.mdc-slider__input', candidateSource: 'omitted in all captured candidate stages and matching rules; no used-value equivalence inferred' }] };
}
