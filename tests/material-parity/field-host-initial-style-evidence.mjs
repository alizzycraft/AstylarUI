import { isDeepStrictEqual } from 'node:util';
import { collectFieldHostTypographyInputs } from './field-host-typography-evidence.mjs';
import { rootInitialSelectorCanApply } from './root-initial-style-evidence.mjs';

export const fieldHostInitialStyleAttribution = 'reviewed-field-host-initial-style-declaration-stage';
export const fieldHostInitialStyleValues = Object.freeze({
  fontStyle: 'normal', wordSpacing: '0px', textTransform: 'none', whiteSpace: 'normal',
  overflowWrap: 'normal', wordBreak: 'normal', pointerEvents: 'auto', visibility: 'visible',
});
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const normalized = key => key.replaceAll('-', '').toLowerCase();
const relevantNames = new Set([...Object.keys(fieldHostInitialStyleValues).map(normalized),
  'font', 'wordwrap', 'whitespacecollapse', 'textwrap', 'textwrapmode', 'textwrapstyle', 'all']);
const relevant = key => relevantNames.has(normalized(key)) || /^(animation|transition)/i.test(key);
const safe = value => object(value) && !Object.keys(value).some(relevant);
const safeAttribute = value => value === undefined || typeof value === 'string' && !value.includes('\\') &&
  !/(?:^|;)\s*(?:font(?:-style)?|word-spacing|text-transform|white-space(?:-collapse)?|text-wrap(?:-mode|-style)?|overflow-wrap|word-wrap|word-break|pointer-events|visibility|all|animation[^:]*|transition[^:]*)\s*:/i.test(value);
const scalarValue = (property, value) => property === 'wordSpacing' && value === '0px' ? '0' : value;

function safeRules(rules, reference) {
  return Array.isArray(rules) && rules.every(rule => object(rule) && typeof rule.selector === 'string' &&
    safe(rule.declarations) && (!reference || rule.active === true && Array.isArray(rule.conditions) &&
      Object.values(rule.declarations).every(d => object(d) && typeof d.value === 'string' && typeof d.important === 'boolean')));
}

// Rebuild the public host correspondence from the complete inventory. Use the
// conservative selector exclusion helper so unknown candidate selectors cannot
// disappear from the ancestry review. Font-token conclusions are not reused as
// evidence for these distinct inherited properties.
export function collectFieldHostInitialStyleInputs(inventory, canonicalStyle) {
  const results = [];
  const bases = collectFieldHostTypographyInputs(inventory, canonicalStyle, rootInitialSelectorCanApply)
    .filter(proof => proof.property === 'fontFamily');
  for (const base of bases) {
    if (base.referencePath.some(node => !safe(node.inline) || !safeAttribute(node.attributes?.style) ||
        !safeRules(node.rules, true) || !object(node.computed) ||
        Object.entries(fieldHostInitialStyleValues).some(([property, value]) => node.computed[property] !== value)) ||
        base.candidatePath.some(node => !safeAttribute(node.authored.attributes?.style) ||
          node.authored.style !== undefined && !safe(node.authored.style) || !safeRules(node.rules, false) ||
          [node.normal, node.comparison, node.effective].some(style => !safe(style)))) continue;
    for (const [property, referenceComputed] of Object.entries(fieldHostInitialStyleValues)) results.push({
      case: base.case, family: base.family, element: base.element, property,
      values: { reference: scalarValue(property, referenceComputed), referenceComputed, candidateLocalDeclaration: '<omitted>' },
      source: base.source, revision: base.revision,
      referencePath: structuredClone(base.referencePath), candidatePath: structuredClone(base.candidatePath),
      classification: 'parity-harness-defect', computedCandidateVerified: false,
      descendantConsumersVerified: false, finalRasterVerified: false,
    });
  }
  return results;
}

export function classifyFieldHostInitialStyleInput(input, property, reference, astylar, proof) {
  if (!proof || !Object.hasOwn(fieldHostInitialStyleValues, property) || proof.property !== property ||
      proof.classification !== 'parity-harness-defect' || proof.source !== 'core-style-inspection' ||
      !Number.isInteger(proof.revision) || proof.revision < 0 ||
      ['computedCandidateVerified', 'descendantConsumersVerified', 'finalRasterVerified'].some(flag => proof[flag] !== false) ||
      input.id !== proof.element || astylar !== undefined || reference !== scalarValue(property, fieldHostInitialStyleValues[property]) ||
      proof.values?.reference !== reference || proof.values.referenceComputed !== fieldHostInitialStyleValues[property] ||
      input.reference?.[property] !== fieldHostInitialStyleValues[property] ||
      input.astylarResolvedStyleEvidenceVersion !== 2 || input.referenceStructure?.schemaVersion !== 2 || input.astylarStructure?.schemaVersion !== 2 ||
      input.referenceStructure.type !== 'mat-form-field' || input.astylarStructure.type !== 'div' ||
      input.referenceStructure.ownText !== undefined && input.referenceStructure.ownText !== '' || input.astylarStructure.ownText !== '' ||
      !Array.isArray(input.referenceAuthored) || input.referenceAuthored.some(rule =>
        !object(rule) || !safe(rule.declarations) || rule.active !== undefined && rule.active !== true) ||
      !safeRules(input.astylarAuthored, false) || !input.astylarAuthored.some(rule => rule.selector === '.field-shell') ||
      !Array.isArray(proof.candidatePath) || proof.candidatePath.length !== 3 ||
      ['astylar', 'astylarNormalResolvedStyle', 'astylarInteractionResolvedStyle'].some((stage, index) =>
        !safe(input[stage]) || !isDeepStrictEqual(input[stage], proof.candidatePath[2][['comparison', 'normal', 'effective'][index]]))) return;
  return {
    classification: 'parity-harness-defect', attribution: fieldHostInitialStyleAttribution,
    owner: 'input audit field-host computed inherited values versus local declarations', reviewEvidence: structuredClone(proof),
    justification: 'The mapped Material form-field host and its complete captured frame/section ancestry omit these inherited requests and compute the recorded defaults. Candidate page/section/field-shell authoring and all three local diagnostic stages omit them too. This establishes a computed-versus-local-declaration observation gap, not candidate computed values, missing authoring or accepted rendering equivalence. Component font/size/line-height/weight/tracking and alignment requests remain independently unequal. Preserve descendant inheritance, wrapping, hit testing, visibility and raster obligations; do not add initial declarations to the candidate or equate omission with the reference keyword.',
  };
}

export function validateFieldHostInitialStyleInputs(report, canonicalStyle) {
  const errors = [], supplied = report.fieldHostInitialStyleInputs;
  const replayed = collectFieldHostInitialStyleInputs(report.elementInventory, canonicalStyle);
  if (!Array.isArray(supplied) || supplied.length !== replayed.length ||
      replayed.some((proof, i) => !isDeepStrictEqual(proof, supplied[i])))
    errors.push('field host initial-style evidence does not replay from captured ancestry and declaration stages');
  const expected = new Map(), key = p => JSON.stringify([p.family, p.element, p.property, p.values.reference]);
  for (const proof of replayed) {
    const id = key(proof);
    if (!expected.has(id)) expected.set(id, []);
    expected.get(id).push(proof);
  }
  const seen = new Set();
  for (const row of report.discrepancies) {
    const id = JSON.stringify([row.family, row.element, row.property, row.reference]);
    const proofs = expected.get(id);
    if (!proofs && row.attribution !== fieldHostInitialStyleAttribution) continue;
    const cases = proofs?.map(p => p.case) ?? [];
    const witness = proofs?.find(p => p.case === row.reviewEvidence?.case);
    const states = [...new Set(cases.map(c => c.startsWith('static:') ? 'static' : c.split('/').slice(2).join('/')))];
    if (!proofs || seen.has(id) || row.attribution !== fieldHostInitialStyleAttribution ||
        row.classification !== 'parity-harness-defect' || row.astylar !== undefined ||
        !witness || !isDeepStrictEqual(row.reviewEvidence, witness) ||
        row.occurrences !== cases.length || !isDeepStrictEqual(row.reviewedCases, cases) ||
        !isDeepStrictEqual(row.cases, cases.slice(0, 12)) || !isDeepStrictEqual(row.states, states))
      errors.push('field host initial-style attribution lacks exact values, replayed evidence and complete unique case coverage');
    seen.add(id);
  }
  if ([...expected.keys()].some(id => !seen.has(id)))
    errors.push('field host initial-style attribution is missing a captured property group');
  return errors;
}
