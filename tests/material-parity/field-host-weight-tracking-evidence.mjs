export const fieldHostWeightTrackingAttribution = 'reviewed-field-host-weight-tracking-token-omission';
export const fieldHostWeightTrackingProperties = Object.freeze({
  fontWeight: { css: 'font-weight', token: 'weight', reference: '400' },
  letterSpacing: { css: 'letter-spacing', token: 'tracking', reference: '0.496px' },
});
const families = new Set(['form-field', 'input', 'autocomplete', 'select', 'datepicker', 'timepicker']);
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const relevant = key => ['font', 'fontweight', 'letterspacing', 'all'].includes(key.replaceAll('-', '').toLowerCase()) || /^(animation|transition)/i.test(key);
const safe = value => object(value) && !Object.keys(value).some(relevant);
const safeAttribute = value => value === undefined || typeof value === 'string' && !value.includes('\\') &&
  !/(?:^|;)\s*(?:font(?:-weight)?|letter-spacing|all|animation[^:]*|transition[^:]*)\s*:/i.test(value);
const cls = (value, name) => typeof value === 'string' && value.split(/\s+/).includes(name);

function rulesValid(rules, host = false, reference = true) {
  if (!Array.isArray(rules) || rules.some(r => !object(r) || typeof r.selector !== 'string' || !object(r.declarations) ||
      reference && (r.active !== true || !Array.isArray(r.conditions) || Object.values(r.declarations).some(d =>
        !object(d) || typeof d.value !== 'string' || typeof d.important !== 'boolean')))) return false;
  const requests = rules.filter(r => Object.keys(r.declarations).some(relevant));
  if (!host) return requests.length === 0;
  if (requests.length !== 1 || requests[0].selector !== '.mat-mdc-form-field') return false;
  const d = requests[0].declarations;
  return Object.values(fieldHostWeightTrackingProperties).every(({ css, token }) =>
    d[css]?.value === `var(--mat-form-field-container-text-${token}, var(--mat-sys-body-large-${token}))` && d[css].important === false) &&
    Object.keys(d).every(key => !relevant(key) || Object.values(fieldHostWeightTrackingProperties).some(p => p.css === key));
}

// Input must come from collectFieldHostTypographyInputs, independently replayed
// from captured trees. Reuse its identity mapping, never its font conclusions as
// evidence about weight/tracking: inspect these declarations at every stage.
export function collectFieldHostWeightTrackingInputs(typographyInputs) {
  const results = [];
  if (!Array.isArray(typographyInputs)) return results;
  const bases = typographyInputs.filter(p => p?.property === 'fontFamily');
  for (const base of bases) {
    if (!families.has(base.family) || base.element !== `${base.family}-primary` ||
        typeof base.case !== 'string' || !base.case.startsWith(`static:${base.family}@`) && !base.case.startsWith(`interaction:${base.family}@`) ||
        bases.filter(p => p.case === base.case).length !== 1 || base.source !== 'core-style-inspection' ||
        !Number.isInteger(base.revision) || base.revision < 0 || base.classification !== 'application-plugin-authoring-defect' ||
        base.finalRasterVerified !== false || !Array.isArray(base.referencePath) || base.referencePath.length !== 3 ||
        !Array.isArray(base.candidatePath) || base.candidatePath.length !== 3) continue;
    const [frame, section, host] = base.referencePath, [page, candidateSection, candidateHost] = base.candidatePath;
    if ([frame, section, host, page, candidateSection, candidateHost].some(n => !object(n) || typeof n.key !== 'string') ||
        new Set(base.referencePath.map(n => n.key)).size !== 3 || new Set(base.candidatePath.map(n => n.key)).size !== 3 ||
        frame.type !== 'main' || frame.parent !== null || !cls(frame.attributes?.class, 'frame') ||
        section.type !== 'section' || section.parent !== frame.key || section.attributes?.id !== `${base.family}-root` ||
        host.type !== 'mat-form-field' || host.parent !== section.key || host.attributes?.id !== base.element || !cls(host.attributes?.class, 'mat-mdc-form-field') ||
        page.authored?.type !== 'main' || page.authored.id !== 'page' ||
        candidateSection.authored?.type !== 'section' || candidateSection.parent !== page.key || candidateSection.authored.id !== `${base.family}-root` ||
        candidateHost.authored?.type !== 'div' || candidateHost.parent !== candidateSection.key || candidateHost.authored.id !== base.element || !cls(candidateHost.authored.class, 'field-shell')) continue;
    if (base.referencePath.some((n, i) => !safe(n.inline) || !safeAttribute(n.attributes?.style) || !rulesValid(n.rules, i === 2) ||
        !object(n.computed)) || Object.entries(fieldHostWeightTrackingProperties).some(([p, v]) => host.computed[p] !== v.reference) ||
        base.candidatePath.some(n => !object(n.authored) || n.authored.textContent !== undefined || !safeAttribute(n.authored.attributes?.style) ||
          n.authored.style !== undefined && !safe(n.authored.style) || !rulesValid(n.rules, false, false) ||
          [n.normal, n.comparison, n.effective].some(s => !safe(s))) ||
        !candidateHost.rules.some(r => r.selector === '.field-shell')) continue;
    for (const [property, { reference }] of Object.entries(fieldHostWeightTrackingProperties)) results.push({
      case: base.case, family: base.family, element: base.element, property,
      values: { reference, candidateLocalDeclaration: '<omitted>' }, source: base.source, revision: base.revision,
      referencePath: structuredClone(base.referencePath), candidatePath: structuredClone(base.candidatePath),
      classification: 'application-plugin-authoring-defect', computedCandidateVerified: false,
      themeTokenOriginVerified: false, descendantConsumersVerified: false, finalRasterVerified: false,
    });
  }
  return results;
}

export function classifyFieldHostWeightTrackingInput(input, property, reference, astylar, proof) {
  const spec = fieldHostWeightTrackingProperties[property];
  if (!spec || !proof || proof.property !== property || proof.values?.reference !== spec.reference || reference !== spec.reference || astylar !== undefined ||
      proof.classification !== 'application-plugin-authoring-defect' ||
      ['computedCandidateVerified', 'themeTokenOriginVerified', 'descendantConsumersVerified', 'finalRasterVerified'].some(f => proof[f] !== false) ||
      input.id !== proof.element || input.astylarResolvedStyleEvidenceVersion !== 2 ||
      input.referenceStructure?.schemaVersion !== 2 || input.astylarStructure?.schemaVersion !== 2 ||
      input.referenceStructure.type !== 'mat-form-field' || input.astylarStructure.type !== 'div' ||
      input.referenceStructure.ownText !== undefined && input.referenceStructure.ownText !== '' || input.astylarStructure.ownText !== '' ||
      input.reference?.[property] !== reference || !Array.isArray(input.referenceAuthored) ||
      input.referenceAuthored.some(r => r.active !== undefined && r.active !== true) ||
      !rulesValid(input.referenceAuthored.map(r => ({ ...r, active: true, conditions: r.conditions ?? [] })), true) ||
      !rulesValid(input.astylarAuthored, false, false) || !input.astylarAuthored.some(r => r.selector === '.field-shell') ||
      ['astylar', 'astylarNormalResolvedStyle', 'astylarInteractionResolvedStyle'].some(s => !safe(input[s]))) return;
  return { classification: proof.classification, attribution: fieldHostWeightTrackingAttribution,
    owner: 'showcase form-field host weight and tracking token authoring', reviewEvidence: structuredClone(proof),
    justification: 'Material explicitly requests host weight and tracking through component tokens with system-token fallbacks. The mapped candidate host, section and page omit these requests in captured authoring and all three local diagnostic stages. This is missing input ownership, not inferred candidate computed values or proof of a visible text defect. Preserve token semantics, ancestor sensitivity and descendant overrides; do not replace tokens with captured literals or child offsets. Theme-token origins, actual candidate inheritance consumers and raster remain separately unverified.' };
}
