export const rootTypographyAttribution = 'reviewed-root-typography-declaration-stage';
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const one = values => values.length === 1 ? values[0] : undefined;
const affects = value => Object.keys(value ?? {}).some(key =>
  ['all', 'font', 'fontfamily', 'fontsize', 'lineheight'].includes(key.replaceAll('-', '').toLowerCase()) || /^(animation|transition)/i.test(key));
const unsafeInline = value => value !== undefined && (!object(value) || affects(value));
const props = ['fontFamily', 'fontSize'];

// Establish the authored inheritance request, not a synthetic computed font.
// Empty sections have no own glyphs; actual font consumers remain independent.
export function collectRootTypographyInputs(inventory, canonical, selectorCanApply) {
  const results = [], style = (index, side) => inventory.styles[index]?.side === side ? inventory.styles[index].value : undefined;
  for (const rc of inventory.cases.filter(c => c.side === 'reference')) {
    const family = /^(?:static|interaction):([^@]+)@/.exec(rc.case)?.[1];
    const ac = one(inventory.cases.filter(c => c.case === rc.case && c.side === 'astylar'));
    if (!family || !ac || inventory.cases.filter(c => c.case === rc.case && c.side === 'reference').length !== 1 ||
        inventory.errors.some(e => e.case === rc.case) || !Number.isInteger(ac.resolvedStyleRevision) || ac.resolvedStyleRevision < 0) continue;
    const ref = inventory.variants[rc.variant], ast = inventory.variants[ac.variant];
    if (ref?.side !== 'reference' || ast?.side !== 'astylar' || ref.ruleEvidenceComplete !== true || ast.ruleEvidenceComplete !== true ||
        ast.resolvedStyleEvidenceVersion !== 2 || ast.resolvedStyleSource !== 'core-style-inspection' ||
        [ref, ast].some(t => new Set(t.nodes.map(n => n.key)).size !== t.nodes.length)) continue;
    const id = `${family}-root`;
    const rs = one(ref.nodes.filter(n => n.attributes?.id === id)), as = one(ast.nodes.filter(n => n.authored?.id === id));
    if (!rs || !as || rs.type !== 'section' || as.authored.type !== 'section' || rs.ownText?.trim() || as.authored.textContent !== undefined) continue;
    const rf = one(ref.nodes.filter(n => n.key === rs.parent && n.parent === null && n.type === 'main' &&
      String(n.attributes?.class ?? '').split(/\s+/).includes('frame')));
    const ap = one(ast.nodes.filter(n => n.key === as.parent && n.authored?.type === 'main' && n.authored.id === 'page'));
    const ar = ap && one(ast.nodes.filter(n => n.key === ap.parent && n.parent === null && object(n.authored) && Object.keys(n.authored).length === 0));
    if (!rf || !ap || !ar || !Array.isArray(ast.rules)) continue;
    const referencePath = [rf, rs].map(n => ({ key: n.key, parent: n.parent, type: n.type, attributes: n.attributes,
      inline: n.inline, computed: style(n.style, 'reference'), rules: n.rules?.map(i => inventory.rules[i]?.side === 'reference' ? inventory.rules[i].value : undefined) }));
    if (referencePath.some(n => !object(n.computed) || !object(n.inline) || unsafeInline(n.inline) ||
        /(?:^|;)\s*(?:font[^:]*|line-height|all|animation[^:]*|transition[^:]*)\s*:/i.test(n.attributes?.style ?? '') ||
        !Array.isArray(n.rules) || n.rules.some(r => !object(r?.declarations)))) continue;
    const rules = referencePath.map(n => n.rules.filter(r => affects(r.declarations)));
    const frameRule = rules[0][0], d = frameRule?.declarations;
    if (rules[0].length !== 1 || rules[1].length || frameRule.active !== true ||
        !/^\.frame(?:\[_ngcontent-[\w-]+\])?$/.test(frameRule.selector ?? '') ||
        d['font-family']?.value !== 'Roboto, Arial, sans-serif' || d['font-family'].important !== false ||
        d['font-size']?.value !== 'calc(16px * var(--scale))' || d['font-size'].important !== false ||
        Object.keys(d).some(k => affects({ [k]: true }) && !['font-family', 'font-size'].includes(k))) continue;
    const pageSize = canonical(referencePath[0].computed).fontSize;
    if (!['16px', '14.4px', '18.4px'].includes(pageSize) || referencePath.some(n => {
      const s = canonical(n.computed); return s.fontFamily !== 'roboto,arial,sans-serif' || s.fontSize !== pageSize || s.lineHeight !== 'normal';
    })) continue;
    const astRules = ast.rules.map(i => inventory.rules[i]?.side === 'astylar' ? inventory.rules[i].value : undefined);
    if (astRules.some(r => !object(r) || Object.values(r).some(v => v !== null && typeof v === 'object'))) continue;
    const candidatePath = [ap, as].map(n => ({ key: n.key, parent: n.parent, authored: n.authored,
      normal: style(n.normalStyle, 'astylar'), comparison: style(n.style, 'astylar'), effective: style(n.interactionStyle, 'astylar'),
      rules: astRules.filter(r => selectorCanApply(r.selector, n.authored)).map(({ selector, ...declarations }) => ({ selector, declarations })) }));
    if (candidatePath.some((n, i) => {
      if (unsafeInline(n.authored.style)) return true;
      const relevant = n.rules.filter(r => affects(r.declarations));
      if (i === 1 ? relevant.length !== 0 : relevant.length !== 1 || relevant[0].selector !== '#page' ||
          relevant[0].declarations.fontFamily !== 'Roboto, Arial, sans-serif' || relevant[0].declarations.fontSize !== pageSize ||
          Object.keys(relevant[0].declarations).some(k => affects({ [k]: true }) && !props.includes(k))) return true;
      return [n.normal, n.comparison, n.effective].some(s => !object(s) || (i === 1 ? affects(s) :
        canonical(s).fontFamily !== 'roboto,arial,sans-serif' || canonical(s).fontSize !== pageSize ||
        Object.keys(s).some(k => affects({ [k]: true }) && !props.includes(k))));
    })) continue;
    for (const property of props) results.push({ case: rc.case, family, element: id, property,
      values: { reference: canonical(referencePath[1].computed)[property], candidateLocalDeclaration: '<omitted>', pageSize },
      source: ast.resolvedStyleSource, revision: ac.resolvedStyleRevision,
      referencePath: structuredClone(referencePath), candidatePath: structuredClone(candidatePath),
      classification: 'parity-harness-defect', computedCandidateVerified: false, finalRasterVerified: false });
  }
  return results;
}

export function classifyRootTypographyInput(input, property, reference, astylar, proof, canonical) {
  if (!proof || property !== proof.property || !props.includes(property) || input.id !== proof.element ||
      reference !== proof.values.reference || astylar !== undefined || input.astylarResolvedStyleEvidenceVersion !== 2 ||
      input.referenceStructure?.schemaVersion !== 2 || input.astylarStructure?.schemaVersion !== 2 ||
      input.referenceStructure.type !== 'section' || input.astylarStructure.type !== 'section' ||
      input.referenceStructure.ownText?.trim() || input.astylarStructure.ownText?.trim() ||
      !Array.isArray(input.referenceAuthored) || !Array.isArray(input.astylarAuthored) ||
      [...input.referenceAuthored, ...input.astylarAuthored].some(r => !object(r.declarations) || affects(r.declarations)) ||
      !object(input.reference) || canonical(input.reference)[property] !== reference ||
      ['astylar', 'astylarNormalResolvedStyle', 'astylarInteractionResolvedStyle'].some(stage => !object(input[stage]) || affects(input[stage]))) return;
  return { classification: 'parity-harness-defect', attribution: rootTypographyAttribution,
    owner: 'input audit computed inheritance versus local declaration stages', reviewEvidence: structuredClone(proof),
    justification: 'The empty mapped section omits local typography on both authored sides. Its complete captured frame/page ancestry supplies the same font stack and corresponding scaled size; the browser exposes inherited computed values but core inspection exposes local declarations. This scalar difference compares different stages, not evidence of missing authored typography. No computed candidate font is synthesized or accepted. Core font consumers, inherited em sizing, descendant overrides, other section layout inputs and final glyph paint remain independently unverified by this attribution.' };
}
