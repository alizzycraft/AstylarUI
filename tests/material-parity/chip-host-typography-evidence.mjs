export const chipHostTypographyAttribution = 'reviewed-chip-label-typography-promoted-to-host';
const properties = { fontSize: ['font-size', 'size', '14px'], lineHeight: ['line-height', 'line-height', '20px'] };
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const affects = d => Object.keys(d ?? {}).some(k => ['font', 'all', 'fontSize', 'font-size', 'lineHeight', 'line-height'].includes(k));
const one = values => values.length === 1 ? values[0] : undefined;
const cls = (node, name) => String(node?.attributes?.class ?? '').split(/\s+/).includes(name);

function referenceDeclarations(rules, kind) {
  if (!Array.isArray(rules) || rules.some(r => !object(r?.declarations))) return false;
  const relevant = rules.filter(r => affects(r.declarations));
  if (kind === 'host') return relevant.every(r => r.declarations.all === undefined && Object.entries(r.declarations).every(([k, d]) =>
    !affects({ [k]: true }) || (d?.value === 'inherit' && d.important === false)));
  if (relevant.length !== 1) return false;
  const rule = relevant[0], d = rule.declarations;
  if (d.all !== undefined || d.font !== undefined || d.fontSize !== undefined || d.lineHeight !== undefined) return false;
  if (kind === 'frame') return /^\.frame(?:\[_ngcontent-[\w-]+\])?$/.test(rule.selector ?? '') &&
    d['font-size']?.value === 'calc(16px * var(--scale))' && d['font-size'].important === false && d['line-height'] === undefined;
  return rule.selector === '.mat-mdc-standard-chip .mdc-evolution-chip__text-label' && Object.values(properties).every(([css, token]) =>
    d[css]?.value === `var(--mat-chip-label-text-${token}, var(--mat-sys-label-large-${token}))` && d[css].important === false);
}

function candidateDeclarations(rules, kind) {
  if (!Array.isArray(rules) || rules.some(r => !object(r?.declarations))) return false;
  const relevant = rules.filter(r => affects(r.declarations));
  return kind === 'label' ? relevant.length === 0 : relevant.length === 1 && relevant[0].selector === '.chip' &&
    Object.entries(relevant[0].declarations).every(([k, v]) => !affects({ [k]: true }) ||
      (k === 'fontSize' && v === '14px') || (k === 'lineHeight' && v === '20px')) &&
    relevant[0].declarations.fontSize === '14px' && relevant[0].declarations.lineHeight === '20px';
}

// Keep host inputs and nested text inputs separate. Equal label sizes do not
// establish equivalent host authoring, generated boxes, layout or final paint.
export function collectChipHostTypographyInputs(inventory, mapText, canonical, selectorCanApply) {
  const result = [], style = (i, side) => inventory.styles[i]?.side === side ? inventory.styles[i].value : undefined;
  for (const refCase of inventory.cases.filter(c => c.side === 'reference' && /^(static|interaction):chips@/.test(c.case))) {
    const refCases = inventory.cases.filter(c => c.case === refCase.case && c.side === 'reference');
    const astCase = one(inventory.cases.filter(c => c.case === refCase.case && c.side === 'astylar'));
    if (refCases.length !== 1 || !astCase || inventory.errors.some(e => e.case === refCase.case) ||
        !Number.isInteger(astCase.resolvedStyleRevision) || astCase.resolvedStyleRevision < 0) continue;
    const ref = inventory.variants[refCase.variant], ast = inventory.variants[astCase.variant];
    if (ref?.side !== 'reference' || ast?.side !== 'astylar' || !ref.ruleEvidenceComplete || !ast.ruleEvidenceComplete ||
        ast.resolvedStyleEvidenceVersion !== 2 || ast.resolvedStyleSource !== 'core-style-inspection') continue;
    if ([ref, ast].some(tree => new Set(tree.nodes.map(n => n.key)).size !== tree.nodes.length)) continue;
    const refRules = n => Array.isArray(n.rules) ? n.rules.map(i => inventory.rules[i]?.side === 'reference' ? inventory.rules[i].value : undefined) : undefined;
    if (!Array.isArray(ast.rules)) continue;
    const astRules = ast.rules.map(i => inventory.rules[i]?.side === 'astylar' ? inventory.rules[i].value : undefined);
    if (astRules.some(r => !object(r) || Object.values(r).some(v => v !== null && typeof v === 'object'))) continue;
    for (const mapping of mapText('chips', ref, ast)) {
      if (!/^chip-[01]-label$/.test(mapping.element)) continue;
      const rp = mapping.referencePath.map(k => one(ref.nodes.filter(n => n.key === k)));
      const ap = mapping.astylarPath.map(k => one(ast.nodes.filter(n => n.key === k)));
      if (rp.length !== 6 || ap.length !== 3 || [...rp, ...ap].some(n => !n)) continue;
      const rh = rp[2], ah = ap[1], rl = rp.at(-1), al = ap.at(-1);
      const section = one(ref.nodes.filter(n => n.key === rp[0].parent && n.type === 'section' && n.attributes?.id === 'chips-root'));
      const frame = section && one(ref.nodes.filter(n => n.key === section.parent && n.type === 'main' && cls(n, 'frame') && n.parent === null));
      if (!section || !frame || rh.ownText?.trim() || ah.authored.textContent !== undefined ||
          ah.authored.id !== rh.attributes.id || al.retainedText?.source !== 'core-text-registry') continue;
      const referencePath = [frame, section, ...rp];
      if (referencePath.some(n => !object(style(n.style, 'reference')) || affects(n.inline))) continue;
      const referenceStyles = referencePath.map(n => canonical(style(n.style, 'reference')));
      const frameStyle = referenceStyles[0];
      if (!/^\d+(?:\.\d+)?px$/.test(frameStyle.fontSize ?? '') || frameStyle.lineHeight !== 'normal' || frameStyle.fontSize === '14px' ||
          referenceStyles.slice(0, -1).some(s => s.fontSize !== frameStyle.fontSize || s.lineHeight !== 'normal') ||
          referenceStyles.at(-1).fontSize !== '14px' || referenceStyles.at(-1).lineHeight !== '20px') continue;
      if (referencePath.some((n, i) => {
        const rules = refRules(n);
        return !rules || rules.some(r => !object(r) || (affects(r.declarations) && r.active !== true)) ||
          !referenceDeclarations(rules, i === 0 ? 'frame' : i === referencePath.length - 1 ? 'label' : 'host');
      })) continue;
      const candidatePath = [ah, al].map(n => ({ key: n.key, parent: n.parent, authored: n.authored,
        normal: style(n.normalStyle, 'astylar'), comparison: style(n.style, 'astylar'), effective: style(n.interactionStyle, 'astylar'),
        rules: astRules.filter(r => selectorCanApply(r.selector, n.authored)).map(({ selector, ...declarations }) => ({ selector, declarations })) }));
      if (candidatePath.some((n, i) => affects(n.authored.style) || !candidateDeclarations(n.rules, i ? 'label' : 'host') ||
          [n.normal, n.comparison, n.effective].some(s => !object(s) || (i ? affects(s) :
            canonical(s).fontSize !== '14px' || canonical(s).lineHeight !== '20px' || s.font !== undefined || s.all !== undefined)))) continue;
      const retained = style(al.retainedText.style, 'astylar');
      if (!object(retained) || canonical(retained).fontSize !== '14px' || canonical(retained).lineHeight !== '20px') continue;
      for (const [property, [, , value]] of Object.entries(properties)) result.push({
        case: refCase.case, family: 'chips', element: ah.authored.id, property,
        values: { reference: frameStyle[property], normal: value, comparison: value, effective: value, label: value, retained: value },
        source: ast.resolvedStyleSource, revision: astCase.resolvedStyleRevision, mapping: structuredClone(mapping), text: rl.ownText.trim(),
        referencePath: referencePath.map(n => ({ key: n.key, parent: n.parent, type: n.type, attributes: n.attributes,
          ownText: n.ownText, inline: n.inline, computed: style(n.style, 'reference'), rules: refRules(n) })),
        candidatePath: structuredClone(candidatePath), candidateRetained: structuredClone(retained),
        inputEquivalent: false, finalRasterVerified: false,
      });
    }
  }
  return result;
}

export function classifyChipHostTypographyInput(input, property, reference, astylar, proof, canonical) {
  if (!proof || property !== proof.property || input.id !== proof.element || reference !== proof.values.reference || astylar !== proof.values.comparison ||
      input.astylarResolvedStyleEvidenceVersion !== 2 || input.referenceStructure?.schemaVersion !== 2 || input.astylarStructure?.schemaVersion !== 2 ||
      input.referenceStructure.type !== 'mat-chip-option' || input.astylarStructure.type !== 'div' ||
      input.referenceStructure.ownText?.trim() || input.astylarStructure.ownText?.trim() ||
      input.referenceStructure.text?.trim() !== proof.text || input.astylarStructure.text?.trim() !== proof.text ||
      !referenceDeclarations(input.referenceAuthored, 'host') || !candidateDeclarations(input.astylarAuthored, 'host')) return;
  for (const [field, stage] of [['reference', 'reference'], ['astylarNormalResolvedStyle', 'normal'], ['astylar', 'comparison'], ['astylarInteractionResolvedStyle', 'effective']])
    if (!object(input[field]) || canonical(input[field])[property] !== proof.values[stage]) return;
  return { classification: 'application-plugin-authoring-defect', attribution: chipHostTypographyAttribution,
    owner: 'showcase chip host versus label typography authoring', reviewEvidence: structuredClone(proof),
    justification: 'Material leaves the chip host and action on inherited frame typography, then applies component size and line-height tokens to its nested label. Candidate .chip instead authors 14px/20px on the host and leaves the label declarations empty. The retained label values agree with those authored host values, not with an invented core correction. Exact paths, inherited reference inputs, token declarations and all candidate stages establish different input ownership. This does not prove a visible label-size error, equivalent structure, font-family/weight/tracking, layout or raster parity; preserve both host and label inputs when removing compensation.' };
}
