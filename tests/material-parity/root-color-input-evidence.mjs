export const rootColorAttribution = 'reviewed-root-color-declaration-stage';
export const fieldColorAttribution = 'reviewed-field-host-color-declaration-stage';
export const containerCaretAttribution = 'reviewed-container-caret-color-declaration-stage';
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

// A host typography omission is not evidence of a color omission. Join the
// independently proven host identity with its exact root color ancestry first.
export function collectFieldColorInputs(fieldHostTypographyInputs, rootColorInputs, canonical) {
  const results = [];
  for (const base of fieldHostTypographyInputs.filter(p => p.property === 'fontFamily')) {
    const roots = rootColorInputs.filter(p => p.case === base.case && p.family === base.family);
    if (roots.length !== 1) continue;
    const root = roots[0], ref = base.referencePath[2], ast = base.candidatePath[2];
    if (base.referencePath.length !== 3 || base.candidatePath.length !== 3 ||
        JSON.stringify(base.referencePath.slice(0, 2)) !== JSON.stringify(root.referencePath) ||
        JSON.stringify(base.candidatePath.slice(0, 2)) !== JSON.stringify(root.candidatePath) ||
        base.source !== root.source || base.revision !== root.revision ||
        ref.parent !== root.referencePath[1].key || ast.parent !== root.candidatePath[1].key ||
        unsafe(ref.inline) || /(?:^|;)\s*(?:color|all|animation[^:]*|transition[^:]*)\s*:/i.test(ref.attributes?.style ?? '') ||
        !Array.isArray(ref.rules) || ref.rules.some(r => unsafe(r.declarations)) ||
        !Array.isArray(ast.rules) || ast.rules.some(r => unsafe(r.declarations)) ||
        (ast.authored.style !== undefined && unsafe(ast.authored.style)) ||
        [ast.normal, ast.comparison, ast.effective].some(unsafe) ||
        canonical(ref.computed).color !== root.values.reference) continue;
    results.push({ case: base.case, family: base.family, element: base.element, property: 'color',
      values: structuredClone(root.values), source: base.source, revision: base.revision,
      referencePath: structuredClone(base.referencePath), candidatePath: structuredClone(base.candidatePath),
      colorRuleSources: [...root.colorRuleSources], classification: 'parity-harness-defect',
      computedCandidateVerified: false, finalRasterVerified: false });
  }
  return results;
}

export function classifyFieldColorInput(input, property, reference, astylar, proof, canonical) {
  if (!proof || property !== 'color' || input.id !== proof.element || reference !== proof.values.reference || astylar !== undefined ||
      input.astylarResolvedStyleEvidenceVersion !== 2 || input.referenceStructure?.schemaVersion !== 2 || input.astylarStructure?.schemaVersion !== 2 ||
      input.referenceStructure.type !== 'mat-form-field' || input.astylarStructure.type !== 'div' ||
      input.referenceStructure.ownText?.trim() || input.astylarStructure.ownText?.trim() || !object(input.reference) ||
      canonical(input.reference).color !== reference ||
      ['astylar', 'astylarNormalResolvedStyle', 'astylarInteractionResolvedStyle'].some(stage => unsafe(input[stage])) ||
      !Array.isArray(input.referenceAuthored) || !Array.isArray(input.astylarAuthored) ||
      !input.astylarAuthored.some(r => r.selector === '.field-shell') ||
      [...input.referenceAuthored, ...input.astylarAuthored].some(r => unsafe(r.declarations))) return;
  return { classification: 'parity-harness-defect', attribution: fieldColorAttribution,
    owner: 'input audit field-host inherited color versus local declaration stages', reviewEvidence: structuredClone(proof),
    justification: 'The mapped Material form-field and candidate field-shell have no local color request. Independently checked complete frame/page-to-section-to-host paths provide the same ancestor color; browser computed host color includes inheritance while candidate inspection preserves local omission. This color-stage finding does not erase the separately proven missing host font tokens, approve structural/layout substitutions, synthesize a computed candidate color, or prove descendant control/caret/currentColor paint.' };
}

const affectsCaret = declarations => Object.keys(declarations ?? {}).some(key =>
  ['caretcolor', 'all'].includes(key.replaceAll('-', '').toLowerCase()) || /^(animation|transition)/i.test(key));
const unsafeCaret = value => !object(value) || affectsCaret(value);

// These are container declarations, not the descendant editable control's
// computed caret style or painted caret. Reuse verified color ancestry and
// independently check the complete captured chain for caret requests.
export function collectContainerCaretInputs(colorInputs, canonical) {
  const results = [];
  for (const base of colorInputs) {
    if (base.property !== 'color' || base.classification !== 'parity-harness-defect' ||
        base.referencePath.some(n => unsafeCaret(n.inline) ||
          /(?:^|;)\s*(?:caret-color|all|animation[^:]*|transition[^:]*)\s*:/i.test(n.attributes?.style ?? '') ||
          !Array.isArray(n.rules) || n.rules.some(r => unsafeCaret(r.declarations)) ||
          canonical(n.computed).caretColor !== base.values.reference) ||
        base.candidatePath.some(n => (n.authored.style !== undefined && unsafeCaret(n.authored.style)) ||
          !Array.isArray(n.rules) || n.rules.some(r => unsafeCaret(r.declarations)) ||
          [n.normal, n.comparison, n.effective].some(unsafeCaret))) continue;
    results.push({ case: base.case, family: base.family, element: base.element, property: 'caretColor',
      values: { reference: base.values.reference, candidateLocalDeclaration: '<omitted>' },
      source: base.source, revision: base.revision, referencePath: structuredClone(base.referencePath),
      candidatePath: structuredClone(base.candidatePath), classification: 'parity-harness-defect',
      computedCandidateVerified: false, descendantCaretVerified: false, finalRasterVerified: false });
  }
  return results;
}

export function classifyContainerCaretInput(input, property, reference, astylar, proof, canonical) {
  if (!proof || property !== 'caretColor' || input.id !== proof.element || reference !== proof.values.reference || astylar !== undefined ||
      input.astylarResolvedStyleEvidenceVersion !== 2 || input.referenceStructure?.schemaVersion !== 2 || input.astylarStructure?.schemaVersion !== 2 ||
      input.referenceStructure.type !== proof.referencePath.at(-1).type || input.astylarStructure.type !== proof.candidatePath.at(-1).authored.type ||
      !object(input.reference) || canonical(input.reference).caretColor !== reference ||
      ['astylar', 'astylarNormalResolvedStyle', 'astylarInteractionResolvedStyle'].some(stage => unsafeCaret(input[stage])) ||
      !Array.isArray(input.referenceAuthored) || !Array.isArray(input.astylarAuthored) ||
      [...input.referenceAuthored, ...input.astylarAuthored].some(r => unsafeCaret(r.declarations))) return;
  return { classification: 'parity-harness-defect', attribution: containerCaretAttribution,
    owner: 'input audit container computed caret color versus local declaration stages', reviewEvidence: structuredClone(proof),
    justification: 'The independently mapped section or form-field host and its complete captured frame/page ancestry omit caret-color requests on both sides. Browser computed container caretColor equals the separately verified inherited color, while all candidate local declaration stages omit caretColor. This is a diagnostic-stage mismatch, not absent authored caret intent, a synthesized candidate computed value, or proof that any editable descendant renders a correct caret. Preserve descendant overrides, caret visibility/placement/color, focus and selection findings independently; adding fixture caret-color values would change the original input.' };
}
