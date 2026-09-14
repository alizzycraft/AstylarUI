export const rootColorAttribution = 'reviewed-root-color-declaration-stage';
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const affects = declarations => Object.keys(declarations ?? {}).some(key =>
  ['color', 'all'].includes(key.replaceAll('-', '').toLowerCase()) || /^(animation|transition)/i.test(key));
const unsafe = value => !object(value) || affects(value);
const literalColor = (value, canonical) => {
  if (typeof value !== 'string' || !/^(?:#(?:[a-f0-9]{3}|[a-f0-9]{4}|[a-f0-9]{6}|[a-f0-9]{8})|rgba?\([^)]*\))$/i.test(value)) return;
  const color = canonical({ color: value }).color;
  const channels = /^rgba\((\d+(?:\.\d+)?),(\d+(?:\.\d+)?),(\d+(?:\.\d+)?),(\d+(?:\.\d+)?)\)$/.exec(color ?? '');
  if (channels && channels.slice(1, 4).every(v => Number(v) <= 255) && Number(channels[4]) <= 1) return color;
};

// Reuse the independently proven complete frame/page-to-empty-section mapping,
// then establish color ownership separately. Font evidence alone proves no color.
export function collectRootColorInputs(rootTypographyInputs, canonical) {
  const results = [];
  for (const base of rootTypographyInputs.filter(p => p.property === 'fontFamily')) {
    const [frame, section] = base.referencePath, [page, candidate] = base.candidatePath;
    if ([frame, section].some(n => unsafe(n.inline) ||
      /(?:^|;)\s*(?:color|all|animation[^:]*|transition[^:]*)\s*:/i.test(n.attributes?.style ?? '') ||
      !Array.isArray(n.rules) || n.rules.some(r => !object(r.declarations)))) continue;
    const rules = frame.rules.filter(r => affects(r.declarations));
    if (![1, 2].includes(rules.length) || section.rules.some(r => affects(r.declarations))) continue;
    const first = rules[0], last = rules.at(-1), firstSelector = /^\.frame(\[_ngcontent-[\w-]+\])?$/.exec(first.selector ?? '');
    if (!firstSelector || rules.some(r => r.active !== true || r.conditions?.length !== 0 ||
      !/^sheet:\d+\/\d+$/.test(r.source ?? '') || r.declarations.color?.important !== false ||
      !literalColor(r.declarations.color.value, canonical) ||
      Object.keys(r.declarations).some(k => k !== 'color' && affects({ [k]: true })))) continue;
    if (rules.length === 2) {
      const [firstSheet, firstIndex] = first.source.split('/'), [lastSheet, lastIndex] = last.source.split('/');
      if (!String(frame.attributes.class ?? '').split(/\s+/).includes('dark') ||
          last.selector !== `.dark${firstSelector[1] ?? ''}` || firstSheet !== lastSheet || Number(lastIndex) <= Number(firstIndex)) continue;
    }
    const color = literalColor(last.declarations.color.value, canonical);
    if ([frame, section].some(n => canonical(n.computed).color !== color)) continue;
    const pageRules = page.rules.filter(r => affects(r.declarations));
    if (pageRules.length !== 1 || pageRules[0].selector !== '#page' ||
        literalColor(pageRules[0].declarations.color, canonical) !== color ||
        Object.keys(pageRules[0].declarations).some(k => k !== 'color' && affects({ [k]: true })) ||
        candidate.rules.some(r => affects(r.declarations)) ||
        [page, candidate].some(n => n.authored.style !== undefined && unsafe(n.authored.style))) continue;
    if ([page.normal, page.comparison, page.effective].some(s => !object(s) || literalColor(s.color, canonical) !== color ||
        Object.keys(s).some(k => k !== 'color' && affects({ [k]: true }))) ||
        [candidate.normal, candidate.comparison, candidate.effective].some(unsafe)) continue;
    results.push({ case: base.case, family: base.family, element: base.element, property: 'color',
      values: { reference: color, candidateLocalDeclaration: '<omitted>' },
      source: base.source, revision: base.revision, referencePath: structuredClone(base.referencePath),
      candidatePath: structuredClone(base.candidatePath), colorRuleSources: rules.map(r => r.source),
      classification: 'parity-harness-defect', computedCandidateVerified: false, finalRasterVerified: false });
  }
  return results;
}

export function classifyRootColorInput(input, property, reference, astylar, proof, canonical) {
  if (!proof || property !== 'color' || input.id !== proof.element || reference !== proof.values.reference || astylar !== undefined ||
      input.astylarResolvedStyleEvidenceVersion !== 2 || input.referenceStructure?.schemaVersion !== 2 || input.astylarStructure?.schemaVersion !== 2 ||
      input.referenceStructure.type !== 'section' || input.astylarStructure.type !== 'section' ||
      input.referenceStructure.ownText?.trim() || input.astylarStructure.ownText?.trim() || !object(input.reference) ||
      canonical(input.reference).color !== reference ||
      ['astylar', 'astylarNormalResolvedStyle', 'astylarInteractionResolvedStyle'].some(stage => unsafe(input[stage])) ||
      !Array.isArray(input.referenceAuthored) || !Array.isArray(input.astylarAuthored) ||
      [...input.referenceAuthored, ...input.astylarAuthored].some(r => unsafe(r.declarations))) return;
  return { classification: 'parity-harness-defect', attribution: rootColorAttribution,
    owner: 'input audit inherited computed color versus local declaration stages', reviewEvidence: structuredClone(proof),
    justification: 'The empty section has no local color request on either authored side. Its complete captured frame/page ancestry supplies the same color, with an independently checked same-sheet, top-level, equal-specificity, non-important dark override where present. Browser computed color includes inheritance; the core inspection contract exposes local declarations. Preserve the candidate omission rather than synthesizing a computed color or diagnosing absent authoring. This identifies a diagnostic-stage mismatch only: actual descendant color consumers, caret-color behavior, currentColor paint, alpha compositing and final raster remain separate.' };
}
