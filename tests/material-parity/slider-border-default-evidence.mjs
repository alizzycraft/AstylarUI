import { isDeepStrictEqual } from 'node:util';
import { inspectSliderInputBox } from './slider-input-box-evidence.mjs';
import { selectorCanApply } from './border-initial-input-evidence.mjs';

const object = value => value && typeof value === 'object' && !Array.isArray(value);
const related = name => /^(border|appearance$|webkitappearance$|all$)/.test(name.replaceAll('-', '').toLowerCase());
const sides = ['Top', 'Right', 'Bottom', 'Left'];
const corners = ['TopLeft', 'TopRight', 'BottomRight', 'BottomLeft'];
const referenceValues = Object.fromEntries([
  ...sides.map(side => [`border${side}Width`, '0px']),
  ...sides.map(side => [`border${side}Style`, 'none']),
  ...corners.map(corner => [`border${corner}Radius`, '0px']),
]);
const candidateValues = { borderWidth: '1px', borderStyle: 'solid', borderRadius: '4px' };
const declarationsOmitBorder = declarations => object(declarations) && !Object.keys(declarations).some(related);
const affectsBorderColor = key => {
  const name = key.replaceAll('-', '').toLowerCase();
  return /^(all$|appearance$|webkitappearance$|animation|transition)/.test(name) ||
    (name.startsWith('border') && !/(width|style|radius)$/.test(name) && !name.startsWith('borderimage'));
};

// Declaration/default evidence only. The original application has other unequal
// box requests, so the isolated public proof's 2px effect is NOT its used-box delta.
export function inspectSliderBorderDefaults(entry, input, reference, candidate) {
  const owner = inspectSliderInputBox(entry, input, reference, candidate);
  if (!owner) return;
  const ref = reference.nodes.find(node => node.key === owner.reference.node);
  const ast = candidate.nodes.find(node => node.key === owner.candidate.node);
  if (!Array.isArray(ref.rules) || new Set(ref.rules).size !== ref.rules.length ||
      !Array.isArray(input.referenceAuthored) || !Array.isArray(candidate.rules)) return;
  const matchedReference = ref.rules.map(index => reference.rules?.[index]);
  if (matchedReference.some(rule => !object(rule) || rule.active !== true ||
      !declarationsOmitBorder(rule.declarations)) || !declarationsOmitBorder(ref.inline)) return;
  // Compare the independent mapped declaration capture with the full-tree rules,
  // including inline styles. Missing rules cannot be interpreted as omission.
  const mappedReference = input.referenceAuthored.filter(rule => rule.selector !== '<inline>');
  if (!isDeepStrictEqual(mappedReference.map(rule => ({ selector: rule.selector, declarations: rule.declarations })),
    matchedReference.map(rule => ({ selector: rule.selector, declarations: rule.declarations })))) return;
  const inline = input.referenceAuthored.filter(rule => rule.selector === '<inline>');
  if (inline.length !== 1 || !isDeepStrictEqual(inline[0].declarations, ref.inline)) return;
  if (input.referenceAuthored.some(rule => !declarationsOmitBorder(rule.declarations)) ||
      !declarationsOmitBorder(ast.authored.style ?? {})) return;
  if (new Set(input.astylarAuthored.map(rule => rule.index)).size !== input.astylarAuthored.length) return;
  for (const rule of input.astylarAuthored) {
    if (!Number.isInteger(rule.index) || rule.index < 0 || !declarationsOmitBorder(rule.declarations) ||
        !isDeepStrictEqual(candidate.rules[rule.index], { selector: rule.selector, ...rule.declarations })) return;
  }
  if (input.reference.appearance !== 'auto' ||
      Object.entries(referenceValues).some(([property, value]) => input.reference[property] !== value)) return;
  for (const style of [ast.resolvedStyle, ast.normalResolvedStyle, ast.interactionResolvedStyle]) {
    if (Object.entries(candidateValues).some(([property, value]) => style[property] !== value) ||
        Object.keys(style).some(property => related(property) &&
          !['borderWidth', 'borderStyle', 'borderRadius', 'borderColor'].includes(property))) return;
  }
  const properties = Object.entries(referenceValues).map(([property, value]) => ({
    property, reference: value,
    candidate: property.endsWith('Width') ? '1px' : property.endsWith('Style') ? 'solid' : '4px',
    candidateSourceProperty: property.endsWith('Width') ? 'borderWidth' : property.endsWith('Style') ? 'borderStyle' : 'borderRadius',
  }));
  // Native disabled border colors are not currentColor. Require the captured
  // value and all three candidate stages; do not derive either from text color.
  const colors = sides.map(side => input.reference[`border${side}Color`]);
  if (colors.every(color => color === colors[0]) &&
      ['rgb(16, 16, 16)', 'rgba(118, 118, 118, 0.3)'].includes(colors[0]) &&
      !candidate.rules.some(rule => selectorCanApply(rule.selector, ast.authored) &&
        Object.keys(rule).some(affectsBorderColor)) &&
      [ast.resolvedStyle, ast.normalResolvedStyle, ast.interactionResolvedStyle]
        .every(style => style.borderColor === '#bdc3c7') && input.reference.opacity === '0') {
    properties.push(...sides.map(side => ({ property: `border${side}Color`,
      reference: colors[0], candidate: '#bdc3c7', candidateSourceProperty: 'borderColor' })));
  }
  return {
    element: input.id,
    classification: 'intentional-documented-limitation',
    attribution: 'observed-range-native-border-default-policy',
    owner: 'core input-type default selection and compatibility catalog',
    inputEquivalent: false,
    borderAuthoringEquivalent: true,
    usedBoxParityVerified: false,
    finalRasterVerified: false,
    reference: { node: ref.key, matchingRules: matchedReference, inline: ref.inline,
      mappedAuthoring: input.referenceAuthored, values: { ...referenceValues }, appearance: input.reference.appearance },
    candidate: { node: ast.key, authored: ast.authored, matchingRules: input.astylarAuthored,
      stages: ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle'].map(stage => ({
        stage, values: Object.fromEntries(Object.keys(candidateValues).map(property => [property, ast[stage][property]])),
      })) },
    properties,
    limitation: 'Border width/style/radius requests are omitted on both captured owners; core generic input defaults differ from Chromium native range defaults. Documented default-policy divergence is not acceptance of same-input rendering parity. Other box requests differ; no application used-box, drag, hit-test or raster result is inferred.',
  };
}
