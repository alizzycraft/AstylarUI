import { selectorCanApply } from './border-initial-input-evidence.mjs';

export const rootInitialStyleAttribution = 'reviewed-root-initial-style-declaration-stage';
export const rootInitialStyleValues = Object.freeze({ fontWeight: '400', textAlign: 'start', verticalAlign: 'baseline', lineHeight: 'normal',
  fontStyle: 'normal', letterSpacing: 'normal', wordSpacing: '0px', textTransform: 'none', whiteSpace: 'normal',
  overflowWrap: 'normal', wordBreak: 'normal', pointerEvents: 'auto', visibility: 'visible' });
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const one = list => list.length === 1 ? list[0] : undefined;
const normalized = k => k.replaceAll('-', '').toLowerCase();
const relevantProperties = new Set([...Object.keys(rootInitialStyleValues).map(normalized), 'font', 'textalignlast',
  'whitespacecollapse', 'textwrap', 'textwrapmode', 'textwrapstyle', 'wordwrap', 'direction', 'writingmode', 'unicodebidi', 'all']);
const relevant = k => relevantProperties.has(normalized(k)) || /^(animation|transition)/i.test(k);
// Match the audit's two proven scalar serializations without rewriting captured
// reference values or treating omitted inherited declarations as explicit zero.
const comparisonValue = (p, v) => p === 'letterSpacing' && v === 'normal' || p === 'wordSpacing' && v === '0px' ? '0' : v;
const safe = d => object(d) && !Object.keys(d).some(relevant);
const safeAttribute = text => text === undefined || typeof text === 'string' && !text.includes('\\') &&
  !/(?:^|;)\s*(?:font(?:-weight|-style)?|text-align(?:-last)?|vertical-align|line-height|letter-spacing|word-spacing|text-transform|white-space(?:-collapse)?|text-wrap(?:-mode|-style)?|overflow-wrap|word-wrap|word-break|pointer-events|visibility|direction|writing-mode|unicode-bidi|all|animation[^:]*|transition[^:]*)\s*:/i.test(text);
const unique = values => values.every(v => typeof v === 'string' && v.length > 0) && new Set(values).size === values.length;

// Declaration exclusion only. Unknown selector syntax remains possibly active;
// no ancestor/state truth, cascade winner or computed candidate is synthesized.
export function rootInitialSelectorCanApply(selector, authored) {
  if (!object(authored) || (authored.class !== undefined && typeof authored.class !== 'string') ||
      typeof selector !== 'string' || !selector.trim()) return true;
  const compound = /^(?:[a-zA-Z][\w-]*|\*)?(?:[.#][_a-zA-Z][\w-]*)*(?::(?:hover|active|focus|focus-visible|focus-within|disabled|enabled|checked))*$/;
  return selector.split(',').some(part => {
    const tokens = part.trim().split(/\s*[>+~]\s*|\s+/);
    return !tokens.length || tokens.some(t => !t || !compound.test(t)) || selectorCanApply(tokens.at(-1), authored);
  });
}

export function collectRootInitialStyleInputs(inventory) {
  const results = [], style = (i, side) => inventory.styles[i]?.side === side ? inventory.styles[i].value : undefined;
  const rule = (i, side) => inventory.rules[i]?.side === side ? inventory.rules[i].value : undefined;
  for (const rc of inventory.cases.filter(c => c.side === 'reference')) {
    const family = /^(?:static|interaction):([^@]+)@/.exec(rc.case)?.[1];
    const ac = one(inventory.cases.filter(c => c.case === rc.case && c.side === 'astylar'));
    if (!family || !ac || inventory.cases.filter(c => c.case === rc.case && c.side === 'reference').length !== 1 ||
        inventory.errors.some(e => e.case === rc.case) || !Number.isInteger(ac.resolvedStyleRevision) || ac.resolvedStyleRevision < 0) continue;
    const ref = inventory.variants[rc.variant], ast = inventory.variants[ac.variant];
    if (ref?.side !== 'reference' || ast?.side !== 'astylar' || ref.ruleEvidenceComplete !== true || ast.ruleEvidenceComplete !== true ||
        ast.resolvedStyleEvidenceVersion !== 2 || ast.resolvedStyleSource !== 'core-style-inspection' ||
        ref.contextStyleEvidenceVersion !== 1 || !Array.isArray(ref.contextStyleProperties) ||
        !['textAlign', 'direction', 'writingMode', 'unicodeBidi', 'textAlignLast'].every(p => ref.contextStyleProperties.includes(p)) ||
        [ref, ast].some(t => !Array.isArray(t.nodes) || !unique(t.nodes.map(n => n.key))) ||
        !unique(ref.nodes.map(n => n.attributes?.id).filter(v => v !== undefined)) ||
        !unique(ast.nodes.map(n => n.authored?.id).filter(v => v !== undefined))) continue;
    const id = `${family}-root`, rs = one(ref.nodes.filter(n => n.attributes?.id === id)), as = one(ast.nodes.filter(n => n.authored?.id === id));
    if (!rs || !as || rs.type !== 'section' || as.authored.type !== 'section' || typeof rs.ownText !== 'string' || rs.ownText.trim() ||
        as.authored.textContent !== undefined) continue;
    const rf = one(ref.nodes.filter(n => n.key === rs.parent && n.parent === null && n.type === 'main' &&
      String(n.attributes?.class ?? '').split(/\s+/).includes('frame')));
    const ap = one(ast.nodes.filter(n => n.key === as.parent && n.authored?.type === 'main' && n.authored.id === 'page'));
    const ar = ap && one(ast.nodes.filter(n => n.key === ap.parent && n.parent === null && object(n.authored) && !Object.keys(n.authored).length));
    if (!rf || !ap || !ar || !Array.isArray(ast.rules)) continue;
    const referencePath = [rf, rs].map(n => ({ key: n.key, parent: n.parent, type: n.type, ownText: n.ownText, attributes: n.attributes,
      inline: n.inline, computed: style(n.style, 'reference'), rules: n.rules?.map(i => rule(i, 'reference')) }));
    if (referencePath.some(n => !safe(n.inline) || !safeAttribute(n.attributes?.style) || n.attributes?.dir !== undefined ||
        !Array.isArray(n.rules) || n.rules.some(r => !object(r) || typeof r.active !== 'boolean' || !Array.isArray(r.conditions) ||
          !safe(r.declarations) || Object.values(r.declarations).some(d => !object(d) || typeof d.value !== 'string' || typeof d.important !== 'boolean')) ||
        !object(n.computed) || Object.entries(rootInitialStyleValues).some(([p, v]) => n.computed[p] !== v) ||
        n.computed.direction !== 'ltr' || n.computed.writingMode !== 'horizontal-tb' || n.computed.unicodeBidi !== 'isolate' ||
        n.computed.textAlignLast !== 'auto')) continue;
    const astRules = ast.rules.map(i => rule(i, 'astylar'));
    if (astRules.some(r => !object(r) || Object.values(r).some(v => v !== null && typeof v === 'object'))) continue;
    const candidatePath = [ap, as].map(n => ({ key: n.key, parent: n.parent, authored: n.authored,
      normal: style(n.normalStyle, 'astylar'), comparison: style(n.style, 'astylar'), effective: style(n.interactionStyle, 'astylar'),
      rules: astRules.filter(r => rootInitialSelectorCanApply(r.selector, n.authored)).map(({ selector, ...declarations }) => ({ selector, declarations })) }));
    if (candidatePath.some(n => (n.authored.style !== undefined && !safe(n.authored.style)) ||
        n.authored.dir !== undefined || n.authored.direction !== undefined ||
        (n.authored.class !== undefined && typeof n.authored.class !== 'string') ||
        n.rules.some(r => !safe(r.declarations)) || [n.normal, n.comparison, n.effective].some(s => !safe(s)))) continue;
    for (const [property, value] of Object.entries(rootInitialStyleValues)) results.push({ case: rc.case, family, element: id, property,
      values: { reference: comparisonValue(property, value), referenceComputed: value, candidateLocalDeclaration: '<omitted>' }, source: ast.resolvedStyleSource, revision: ac.resolvedStyleRevision,
      referencePath: structuredClone(referencePath), candidatePath: structuredClone(candidatePath),
      classification: 'parity-harness-defect', computedCandidateVerified: false, descendantConsumersVerified: false, finalRasterVerified: false });
  }
  return results;
}

export function classifyRootInitialStyleInput(input, property, reference, astylar, proof) {
  if (!proof || proof.classification !== 'parity-harness-defect' || proof.computedCandidateVerified !== false ||
      proof.descendantConsumersVerified !== false || proof.finalRasterVerified !== false ||
      proof.source !== 'core-style-inspection' || !Number.isInteger(proof.revision) || proof.revision < 0 ||
      !Object.hasOwn(rootInitialStyleValues, property) || property !== proof.property || input.id !== proof.element ||
      reference !== comparisonValue(property, rootInitialStyleValues[property]) || reference !== proof.values.reference ||
      proof.values.referenceComputed !== rootInitialStyleValues[property] || astylar !== undefined ||
      input.astylarResolvedStyleEvidenceVersion !== 2 || input.referenceStructure?.schemaVersion !== 2 || input.astylarStructure?.schemaVersion !== 2 ||
      input.referenceStructure.type !== 'section' || input.astylarStructure.type !== 'section' ||
      typeof proof.referencePath?.[1]?.ownText !== 'string' || proof.referencePath[1].ownText.trim() ||
      (input.referenceStructure.ownText !== undefined && (typeof input.referenceStructure.ownText !== 'string' || input.referenceStructure.ownText.trim())) ||
      typeof input.astylarStructure.ownText !== 'string' || input.astylarStructure.ownText.trim() ||
      !object(input.reference) || input.reference[property] !== rootInitialStyleValues[property] ||
      ['astylar', 'astylarNormalResolvedStyle', 'astylarInteractionResolvedStyle'].some(s => !safe(input[s])) ||
      !Array.isArray(input.referenceAuthored) || !Array.isArray(input.astylarAuthored) ||
      [...input.referenceAuthored, ...input.astylarAuthored].some(r => !safe(r.declarations))) return;
  return { classification: 'parity-harness-defect', attribution: rootInitialStyleAttribution,
    owner: 'input audit root computed initial/inherited values versus local declarations', reviewEvidence: structuredClone(proof),
    justification: 'The empty mapped section and its captured frame/page ancestry omit the relevant authored requests; browser computed values include defaults and inheritance while candidate inspection records local declaration omission. This diagnoses unequal observation stages, not missing authoring or verified candidate computed values. Font, text, wrapping, pointer-events and visibility properties require inherited-value evidence; vertical alignment has separate non-inherited and formatting-context semantics. A normal line-height keyword does not establish natural line-box metrics. Preserve raw spacing serializations, direction, ancestor changes, descendant consumers, layout, hit testing, visibility and raster as independent obligations; do not inject initial values or equate start with left to hide the diagnostic mismatch.' };
}
