export const fieldHostTypographyAttribution = 'reviewed-field-host-typography-token-omission';
const families = new Set(['form-field', 'input', 'autocomplete', 'select', 'datepicker', 'timepicker']);
const properties = {
  fontFamily: ['font-family', 'font', 'roboto'],
  fontSize: ['font-size', 'size', '16px'],
  lineHeight: ['line-height', 'line-height', '24px'],
};
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const one = values => values.length === 1 ? values[0] : undefined;
const affects = value => Object.keys(value ?? {}).some(key =>
  ['all', 'font', 'fontfamily', 'fontsize', 'lineheight'].includes(key.replaceAll('-', '').toLowerCase()) || /^(animation|transition)/i.test(key));
const cls = (node, name) => String(node?.attributes?.class ?? node?.authored?.class ?? '').split(/\s+/).includes(name);

function referenceRulesValid(rules, kind) {
  if (!Array.isArray(rules) || rules.some(rule => !object(rule) || !object(rule.declarations))) return false;
  const relevant = rules.filter(rule => affects(rule.declarations));
  if (relevant.some(rule => rule.active !== true || rule.declarations.all !== undefined || rule.declarations.font !== undefined)) return false;
  if (kind === 'section') return relevant.length === 0;
  if (relevant.length !== 1) return false;
  const { selector, declarations: d } = relevant[0];
  if (kind === 'frame') return /^\.frame(?:\[_ngcontent-[\w-]+\])?$/.test(selector ?? '') &&
    d['font-family']?.value === 'Roboto, Arial, sans-serif' && d['font-family'].important === false &&
    d['font-size']?.value === 'calc(16px * var(--scale))' && d['font-size'].important === false &&
    Object.keys(d).every(key => !affects({ [key]: true }) || ['font-family', 'font-size'].includes(key));
  return selector === '.mat-mdc-form-field' && Object.values(properties).every(([css, token]) =>
    d[css]?.value === `var(--mat-form-field-container-text-${token}, var(--mat-sys-body-large-${token}))` && d[css].important === false) &&
    Object.keys(d).every(key => !affects({ [key]: true }) || Object.values(properties).some(([css]) => css === key));
}

function candidateRulesValid(rules, kind, pageSize) {
  if (!Array.isArray(rules) || rules.some(rule => !object(rule?.declarations))) return false;
  const relevant = rules.filter(rule => affects(rule.declarations));
  if (kind !== 'page') return relevant.length === 0;
  return relevant.length === 1 && relevant[0].selector === '#page' &&
    relevant[0].declarations.fontFamily === 'Roboto, Arial, sans-serif' && relevant[0].declarations.fontSize === pageSize &&
    Object.keys(relevant[0].declarations).every(key => !affects({ [key]: true }) || ['fontFamily', 'fontSize'].includes(key));
}

// This records ownership of authored requests, not synthesized computed values.
// In light/dark the page size happens to equal the component's fixed size;
// the inherited request still differs across the captured page-scale profiles.
export function collectFieldHostTypographyInputs(inventory, canonical, selectorCanApply) {
  const results = [], style = (index, side) => inventory.styles[index]?.side === side ? inventory.styles[index].value : undefined;
  for (const refCase of inventory.cases.filter(c => c.side === 'reference')) {
    const family = /^(?:static|interaction):([^@]+)@/.exec(refCase.case)?.[1];
    if (!families.has(family)) continue;
    const astCase = one(inventory.cases.filter(c => c.case === refCase.case && c.side === 'astylar'));
    if (!astCase || inventory.cases.filter(c => c.case === refCase.case && c.side === 'reference').length !== 1 ||
        inventory.errors.some(e => e.case === refCase.case) || !Number.isInteger(astCase.resolvedStyleRevision) || astCase.resolvedStyleRevision < 0) continue;
    const ref = inventory.variants[refCase.variant], ast = inventory.variants[astCase.variant];
    if (ref?.side !== 'reference' || ast?.side !== 'astylar' || !ref.ruleEvidenceComplete || !ast.ruleEvidenceComplete ||
        ast.resolvedStyleEvidenceVersion !== 2 || ast.resolvedStyleSource !== 'core-style-inspection' ||
        [ref, ast].some(tree => new Set(tree.nodes.map(n => n.key)).size !== tree.nodes.length)) continue;
    const id = `${family}-primary`;
    const rh = one(ref.nodes.filter(n => n.attributes?.id === id)), ah = one(ast.nodes.filter(n => n.authored?.id === id));
    if (!rh || !ah || rh.type !== 'mat-form-field' || !cls(rh, 'mat-mdc-form-field') || rh.ownText?.trim() ||
        ah.authored.type !== 'div' || !cls(ah, 'field-shell') || ah.authored.textContent !== undefined) continue;
    const rs = one(ref.nodes.filter(n => n.key === rh.parent && n.type === 'section' && n.attributes?.id === `${family}-root`));
    const rf = rs && one(ref.nodes.filter(n => n.key === rs.parent && n.type === 'main' && cls(n, 'frame') && n.parent === null));
    const as = one(ast.nodes.filter(n => n.key === ah.parent && n.authored.type === 'section' && n.authored.id === `${family}-root`));
    const ap = as && one(ast.nodes.filter(n => n.key === as.parent && n.authored.type === 'main' && n.authored.id === 'page'));
    const ar = ap && one(ast.nodes.filter(n => n.key === ap.parent && n.parent === null && object(n.authored) && Object.keys(n.authored).length === 0));
    if (!rs || !rf || !as || !ap || !ar || !Array.isArray(ast.rules)) continue;
    const astRules = ast.rules.map(i => inventory.rules[i]?.side === 'astylar' ? inventory.rules[i].value : undefined);
    if (astRules.some(rule => !object(rule) || Object.values(rule).some(value => value !== null && typeof value === 'object'))) continue;
    const referencePath = [rf, rs, rh].map(n => ({ key: n.key, parent: n.parent, type: n.type, attributes: n.attributes,
      inline: n.inline, computed: style(n.style, 'reference'), rules: n.rules?.map(i => inventory.rules[i]?.side === 'reference' ? inventory.rules[i].value : undefined) }));
    if (referencePath.some(n => !object(n.computed) || !object(n.inline) || affects(n.inline) ||
        /(?:^|;)\s*(?:font[^:]*|line-height|all|animation[^:]*|transition[^:]*)\s*:/i.test(n.attributes?.style ?? ''))) continue;
    const refStyles = referencePath.map(n => canonical(n.computed)), pageSize = refStyles[0].fontSize;
    if (!['16px', '14.4px', '18.4px'].includes(pageSize) || refStyles.slice(0, 2).some(s =>
      s.fontFamily !== 'roboto,arial,sans-serif' || s.fontSize !== pageSize || s.lineHeight !== 'normal') ||
      Object.entries(properties).some(([property, [, , value]]) => refStyles[2][property] !== value) ||
      referencePath.some((n, i) => !referenceRulesValid(n.rules, ['frame', 'section', 'host'][i]))) continue;
    const candidatePath = [ap, as, ah].map(n => ({ key: n.key, parent: n.parent, authored: n.authored,
      normal: style(n.normalStyle, 'astylar'), comparison: style(n.style, 'astylar'), effective: style(n.interactionStyle, 'astylar'),
      rules: astRules.filter(rule => selectorCanApply(rule.selector, n.authored)).map(({ selector, ...declarations }) => ({ selector, declarations })) }));
    if (!candidatePath[2].rules.some(rule => rule.selector === '.field-shell') || candidatePath.some((n, i) => (n.authored.style !== undefined && (!object(n.authored.style) || affects(n.authored.style))) ||
      !candidateRulesValid(n.rules, i === 0 ? 'page' : 'omitted', pageSize) ||
      [n.normal, n.comparison, n.effective].some(s => !object(s) || (i === 0
        ? canonical(s).fontFamily !== 'roboto,arial,sans-serif' || canonical(s).fontSize !== pageSize ||
          Object.keys(s).some(key => affects({ [key]: true }) && !['fontFamily', 'fontSize'].includes(key))
        : affects(s))))) continue;
    for (const [property, [, , value]] of Object.entries(properties)) results.push({
      case: refCase.case, family, element: id, property, values: { reference: value, candidateLocalDeclaration: '<omitted>', pageSize },
      source: ast.resolvedStyleSource, revision: astCase.resolvedStyleRevision,
      referencePath: structuredClone(referencePath), candidatePath: structuredClone(candidatePath),
      classification: 'application-plugin-authoring-defect', finalRasterVerified: false,
    });
  }
  return results;
}

export function classifyFieldHostTypographyInput(input, property, reference, astylar, proof, canonical) {
  if (!proof || property !== proof.property || input.id !== proof.element || reference !== proof.values.reference || astylar !== undefined ||
      input.astylarResolvedStyleEvidenceVersion !== 2 || input.referenceStructure?.schemaVersion !== 2 || input.astylarStructure?.schemaVersion !== 2 ||
      input.referenceStructure.type !== 'mat-form-field' || input.astylarStructure.type !== 'div' ||
      input.referenceStructure.ownText?.trim() || input.astylarStructure.ownText?.trim() ||
      input.referenceAuthored?.some(rule => rule.active !== undefined && rule.active !== true) ||
      !input.astylarAuthored?.some(rule => rule.selector === '.field-shell') ||
      !referenceRulesValid(input.referenceAuthored?.map(rule => ({ ...rule, active: true })), 'host') ||
      !candidateRulesValid(input.astylarAuthored, 'omitted')) return;
  for (const stage of ['astylar', 'astylarNormalResolvedStyle', 'astylarInteractionResolvedStyle'])
    if (!object(input[stage]) || affects(input[stage])) return;
  if (!object(input.reference) || canonical(input.reference)[property] !== reference) return;
  return { classification: 'application-plugin-authoring-defect', attribution: fieldHostTypographyAttribution,
    owner: 'showcase form-field host typography token authoring', reviewEvidence: structuredClone(proof),
    justification: 'The reference form-field host applies Material container font, size and line-height tokens. Candidate field-shell omits them through a complete captured page/section/host chain; only the page authors its fallback stack and scaled size. This identifies missing component-level authored requests, not a computed candidate font synthesized from local diagnostics. Light/dark page size happens to match 16px; contrast/custom page size does not. Preserve token ownership instead of patching child fonts, baselines or dimensions. Separate explicit descendant styles, core inheritance/length consumption, variable fallback origin and final raster still require their own evidence.' };
}
