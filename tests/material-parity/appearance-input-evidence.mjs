export const appearanceInitialAttribution = 'reviewed-nonwidget-appearance-initial-request';
export const buttonAppearanceAttribution = 'reviewed-material-button-appearance-omission';
const types = new Set(['div', 'section', 'span', 'p', 'h2', 'a']);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const one = values => values.length === 1 ? values[0] : undefined;
const affects = declarations => Object.keys(declarations ?? {}).some(key =>
  ['appearance', 'webkitappearance', 'mozappearance', 'all'].includes(key.replaceAll('-', '').toLowerCase()) || /^(animation|transition)/i.test(key));
const unsafe = value => !object(value) || affects(value);

// Only the initial appearance request on matching built-in non-widgets.
// Never synthesize used styles or substitute a custom control/plugin owner.
export function collectAppearanceInitialInputs(inventory, selectorCanApply) {
  const results = [], style = (index, side) => inventory.styles[index]?.side === side ? inventory.styles[index].value : undefined;
  const refId = node => node.attributes?.['data-parity-id'] ?? node.attributes?.id;
  for (const rc of inventory.cases.filter(c => c.side === 'reference')) {
    const ac = one(inventory.cases.filter(c => c.case === rc.case && c.side === 'astylar'));
    if (!ac || inventory.cases.filter(c => c.case === rc.case && c.side === 'reference').length !== 1 ||
        inventory.errors.some(e => e.case === rc.case) || !Number.isInteger(ac.resolvedStyleRevision) || ac.resolvedStyleRevision < 0) continue;
    const ref = inventory.variants[rc.variant], ast = inventory.variants[ac.variant];
    if (ref?.side !== 'reference' || ast?.side !== 'astylar' || ref.ruleEvidenceComplete !== true || ast.ruleEvidenceComplete !== true ||
        ast.resolvedStyleEvidenceVersion !== 2 || ast.resolvedStyleSource !== 'core-style-inspection' || !Array.isArray(ast.rules) ||
        [ref, ast].some(tree => new Set(tree.nodes.map(n => n.key)).size !== tree.nodes.length)) continue;
    const pool = ast.rules.map(i => inventory.rules[i]?.side === 'astylar' ? inventory.rules[i].value : undefined);
    if (pool.some(r => !object(r) || Object.values(r).some(v => v !== null && typeof v === 'object'))) continue;
    for (const rn of ref.nodes) {
      const id = refId(rn);
      if (!id || !types.has(rn.type) || ref.nodes.filter(n => refId(n) === id).length !== 1) continue;
      const an = one(ast.nodes.filter(n => n.authored?.id === id));
      if (!an || an.authored.type !== rn.type || an.authored.inputType !== undefined ||
          unsafe(rn.inline) || (an.authored.style !== undefined && unsafe(an.authored.style)) ||
          /(?:^|;)\s*(?:(?:-webkit-|-moz-)?appearance|all|animation[^:]*|transition[^:]*)\s*:/i.test(rn.attributes?.style ?? '') ||
          !Array.isArray(rn.rules)) continue;
      const rs = style(rn.style, 'reference'), stages = [an.normalStyle, an.style, an.interactionStyle].map(i => style(i, 'astylar'));
      if (!object(rs) || rs.appearance !== 'none' || stages.some(unsafe)) continue;
      const referenceRules = rn.rules.map(i => inventory.rules[i]?.side === 'reference' ? inventory.rules[i].value : undefined);
      if (referenceRules.some(r => !object(r) || typeof r.active !== 'boolean' || unsafe(r.declarations))) continue;
      const candidateRuleIndices = ast.rules.filter((i, j) => selectorCanApply(pool[j].selector, an.authored));
      if (candidateRuleIndices.some(i => affects(inventory.rules[i].value))) continue;
      results.push({ case: rc.case, element: id, type: rn.type, referenceNode: rn.key, astylarNode: an.key,
        referenceStyleIndex: rn.style, candidateStyleIndices: [an.normalStyle, an.style, an.interactionStyle],
        referenceRuleIndices: [...rn.rules], candidateRuleIndices, referenceInline: structuredClone(rn.inline),
        candidateAuthored: structuredClone(an.authored), source: ast.resolvedStyleSource, revision: ac.resolvedStyleRevision,
        referenceAppearance: 'none', candidateLocalDeclaration: '<omitted>', finalRasterVerified: false });
    }
  }
  return results;
}

export function classifyAppearanceInitialInput(input, property, reference, astylar, proof) {
  if (!proof || property !== 'appearance' || reference !== 'none' || astylar !== undefined || input.id !== proof.element ||
      !types.has(proof.type) || input.astylarResolvedStyleEvidenceVersion !== 2 ||
      input.referenceStructure?.schemaVersion !== 2 || input.astylarStructure?.schemaVersion !== 2 ||
      input.referenceStructure.type !== proof.type || input.astylarStructure.type !== proof.type ||
      input.reference?.appearance !== 'none' ||
      ['astylar', 'astylarNormalResolvedStyle', 'astylarInteractionResolvedStyle'].some(stage => unsafe(input[stage])) ||
      !Array.isArray(input.referenceAuthored) || !Array.isArray(input.astylarAuthored) ||
      [...input.referenceAuthored, ...input.astylarAuthored].some(r => unsafe(r.declarations))) return;
  return { classification: 'equivalent-representation', attribution: appearanceInitialAttribution,
    owner: 'none for this initial non-widget appearance request', reviewEvidence: structuredClone(proof),
    justification: 'Matching built-in non-widget types omit authored appearance/reset requests in complete captured rules and inline inputs. The browser exposes initial none; all candidate core declaration stages retain omission. These types do not own native-control indicator appearance: checked source routes the appearance switch to select/checkbox managers, and the public-package non-widget proof preserves geometry and byte-identical Astylar variant rasters with indicator-sensitive controls. This accepts only the initial non-widget appearance request, not a synthetic candidate computed value or complete rendering parity. Explicit appearance inputs, controls, plugin types, structural substitutions, uncertain selectors, animation/reset rules, descendant layout, state effects and final cross-engine raster remain separate.' };
}

const appearanceRequest = declarations => Object.keys(declarations ?? {}).some(key =>
  ['appearance', 'webkitappearance', 'mozappearance', 'all'].includes(key.replaceAll('-', '').toLowerCase()));
const candidateButtonClasses = new Set(['material-button', 'text-button', 'toolbar-action', 'dialog-action']);

// Explicit original declaration versus absent candidate authoring. Reference
// transition/animation rules do not erase the authored request being audited.
export function collectButtonAppearanceInputs(inventory, selectorCanApply) {
  const results = [], style = (index, side) => inventory.styles[index]?.side === side ? inventory.styles[index].value : undefined;
  const refId = node => node.attributes?.['data-parity-id'] ?? node.attributes?.id;
  for (const rc of inventory.cases.filter(c => c.side === 'reference')) {
    const ac = one(inventory.cases.filter(c => c.case === rc.case && c.side === 'astylar'));
    if (!ac || inventory.cases.filter(c => c.case === rc.case && c.side === 'reference').length !== 1 ||
        inventory.errors.some(e => e.case === rc.case) || !Number.isInteger(ac.resolvedStyleRevision) || ac.resolvedStyleRevision < 0) continue;
    const ref = inventory.variants[rc.variant], ast = inventory.variants[ac.variant];
    if (ref?.side !== 'reference' || ast?.side !== 'astylar' || ref.ruleEvidenceComplete !== true || ast.ruleEvidenceComplete !== true ||
        ast.resolvedStyleEvidenceVersion !== 2 || ast.resolvedStyleSource !== 'core-style-inspection' || !Array.isArray(ast.rules) ||
        [ref, ast].some(tree => new Set(tree.nodes.map(n => n.key)).size !== tree.nodes.length)) continue;
    const pool = ast.rules.map(i => inventory.rules[i]?.side === 'astylar' ? inventory.rules[i].value : undefined);
    if (pool.some(r => !object(r) || Object.values(r).some(v => v !== null && typeof v === 'object'))) continue;
    for (const rn of ref.nodes) {
      const id = refId(rn);
      if (!id || rn.type !== 'button' || !String(rn.attributes?.class ?? '').split(/\s+/).includes('mdc-button') ||
          ref.nodes.filter(n => refId(n) === id).length !== 1) continue;
      const an = one(ast.nodes.filter(n => n.authored?.id === id));
      if (!an || an.authored.type !== 'button' || an.authored.inputType !== undefined ||
          !String(an.authored.class ?? '').split(/\s+/).some(c => candidateButtonClasses.has(c)) ||
          !object(rn.inline) || appearanceRequest(rn.inline) || (an.authored.style !== undefined && unsafe(an.authored.style)) ||
          /(?:^|;)\s*(?:(?:-webkit-|-moz-)?appearance|all)\s*:/i.test(rn.attributes?.style ?? '') || !Array.isArray(rn.rules)) continue;
      const referenceRules = rn.rules.map(i => inventory.rules[i]?.side === 'reference' ? inventory.rules[i].value : undefined);
      if (referenceRules.some(r => !object(r) || typeof r.active !== 'boolean' || !object(r.declarations))) continue;
      const requests = referenceRules.filter(r => appearanceRequest(r.declarations)), rule = requests[0];
      if (requests.length !== 1 || rule.selector !== '.mdc-button' || rule.active !== true || rule.conditions?.length !== 0 ||
          rule.declarations.appearance?.value !== 'none' || rule.declarations.appearance.important !== false ||
          Object.keys(rule.declarations).some(k => k !== 'appearance' && appearanceRequest({ [k]: true }))) continue;
      const stages = [an.normalStyle, an.style, an.interactionStyle].map(i => style(i, 'astylar'));
      if (style(rn.style, 'reference')?.appearance !== 'none' || stages.some(unsafe)) continue;
      const candidateRuleIndices = ast.rules.filter((i, j) => selectorCanApply(pool[j].selector, an.authored));
      if (candidateRuleIndices.some(i => affects(inventory.rules[i].value))) continue;
      results.push({ case: rc.case, element: id, referenceNode: rn.key, astylarNode: an.key,
        referenceRule: structuredClone(rule), referenceRuleIndices: [...rn.rules], candidateRuleIndices,
        referenceStyleIndex: rn.style, candidateStyleIndices: [an.normalStyle, an.style, an.interactionStyle],
        candidateAuthored: structuredClone(an.authored), source: ast.resolvedStyleSource, revision: ac.resolvedStyleRevision,
        referenceAppearance: 'none', candidateLocalDeclaration: '<omitted>',
        sourceFinding: 'fixture-material-button-appearance-reset-omitted', finalRasterVerified: false });
    }
  }
  return results;
}

export function classifyButtonAppearanceInput(input, property, reference, astylar, proof) {
  if (!proof || property !== 'appearance' || reference !== 'none' || astylar !== undefined || input.id !== proof.element ||
      input.astylarResolvedStyleEvidenceVersion !== 2 || input.referenceStructure?.schemaVersion !== 2 || input.astylarStructure?.schemaVersion !== 2 ||
      input.referenceStructure.type !== 'button' || input.astylarStructure.type !== 'button' || input.reference?.appearance !== 'none' ||
      ['astylar', 'astylarNormalResolvedStyle', 'astylarInteractionResolvedStyle'].some(stage => unsafe(input[stage])) ||
      !Array.isArray(input.referenceAuthored) || input.referenceAuthored.some(r => !object(r.declarations)) ||
      !Array.isArray(input.astylarAuthored) || input.astylarAuthored.some(r => unsafe(r.declarations))) return;
  const requests = input.referenceAuthored.filter(r => appearanceRequest(r.declarations)), rule = requests[0];
  if (requests.length !== 1 || rule.selector !== '.mdc-button' || rule.declarations.appearance?.value !== 'none' ||
      rule.declarations.appearance.important !== false ||
      Object.keys(rule.declarations).some(k => k !== 'appearance' && appearanceRequest({ [k]: true }))) return;
  return { classification: 'application-plugin-authoring-defect', attribution: buttonAppearanceAttribution,
    owner: 'showcase original Material button appearance-reset translation', reviewEvidence: structuredClone(proof),
    justification: 'The original active .mdc-button rule explicitly requests appearance:none (the installed Material CSS uses the browser-canonicalized -webkit-appearance alias). The mapped candidate button omits this input in complete applicable rules, inline authoring and all core declaration stages. This is an omitted authored reset, not a confirmed core appearance defect or a historical workaround inferred from pixels. Preserve the original reset when restoring equivalent inputs; do not waive it because the current custom-painted button may look similar. Native-widget support, other button resets, layout, state, fonts and final raster remain independent.' };
}
