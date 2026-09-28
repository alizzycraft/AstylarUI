import assert from 'node:assert/strict';
import { applyModalBoxReview, proveBottomSheetActionCorners } from './modal-position-inspection.mjs';
import { proveFlowPositionSubstitution } from '../../scripts/audit-material-flow-position-substitutions.mjs';
import { proveBadgePointerRequest } from './component-pointer-events-review.mjs';
import { rootInitialSelectorCanApply } from './root-initial-style-evidence.mjs';
import { inspectButtonHostRequests } from './button-host-request-evidence.mjs';
import { resolveOriginAliasPair } from './origin-alias-mapping-evidence.mjs';
import { applyMinimumSizeReviews } from './minimum-size-request-review.mjs';
import { applyTextTransformBoundaryReviews } from './text-transform-boundary-review.mjs';
import { applyDisplayRequestReviews, applyDisplayBoundaryReviews } from './display-request-review.mjs';
import { applyInheritedWordReviews, applyOmittedFontReviews, applyWeightRequestReviews, applyFamilyRequestReviews } from './wrapping-input-review.mjs';

const followupAttributions = new Set([
  'reviewed-display-request-substitution', 'reviewed-display-owner-substitution',
  'reviewed-display-computed-local-boundary', 'reviewed-inherited-word-computed-local-boundary',
  'reviewed-font-initial-computed-local-boundary', 'reviewed-overlay-weight-token-request-omission',
  'reviewed-range-weight-inherit-observation-boundary', 'reviewed-page-family-computed-local-boundary',
  'reviewed-toggle-family-token-request-omission', 'reviewed-overlay-family-ancestry-substitution',
]);
export const isPreparedInputFollowupRow = row => followupAttributions.has(row.attribution);
export function applyPreparedInputFollowups(rows, cases, inventory, normalize) {
  return [applyDisplayRequestReviews, applyDisplayBoundaryReviews, applyInheritedWordReviews,
    applyOmittedFontReviews, applyWeightRequestReviews, applyFamilyRequestReviews]
    .reduce((values, apply) => apply(values, cases, inventory, normalize), rows);
}
export function validatePreparedInputFollowups(rows, originalRows, cases, inventory, normalize) {
  try {
    const expected = applyPreparedInputFollowups(originalRows, cases, inventory, normalize).filter(isPreparedInputFollowupRow);
    assert.equal(JSON.stringify(rows.filter(isPreparedInputFollowupRow)), JSON.stringify(expected));
    return [];
  } catch (error) { return [`prepared input followup does not replay: ${error.message}`]; }
}

const preparedAttributions = new Set([
  'reviewed-authored-anchor-substitution', 'reviewed-core-anchor-substitution',
  'reviewed-core-transform-request-omission', 'reviewed-core-computed-offset-boundary',
  'reviewed-relative-owner-position-omission', 'reviewed-relative-owner-computed-insets',
  'reviewed-static-owner-relative-substitution', 'reviewed-static-owner-observation-boundary',
  'reviewed-chip-toggle-radius-token-substitution', 'reviewed-card-contrast-radius-substitution',
  'reviewed-minimum-size-request-omission', 'reviewed-minimum-size-observation-boundary',
  'reviewed-text-transform-computed-local-boundary',
]);
export const isPreparedInputReviewRow = row => preparedAttributions.has(row.attribution);
export function applyPreparedInputReviews(rows, cases, inventory, normalize) {
  return [applyAuthoredAnchorReviews, applyCoreAnchorReviews, applyRelativeOwnerOffsetReviews,
    applyStaticOwnerPositionReviews, applyAuthoredCornerReviews, applyCardContrastCornerReview,
    applyMinimumSizeReviews, applyTextTransformBoundaryReviews]
    .reduce((values, apply) => apply(values, cases, inventory, normalize), rows);
}
export function validatePreparedInputReviews(rows, originalRows, cases, inventory, normalize) {
  try {
    const expected = applyPreparedInputReviews(originalRows, cases, inventory, normalize).filter(isPreparedInputReviewRow);
    assert.equal(JSON.stringify(rows.filter(isPreparedInputReviewRow)), JSON.stringify(expected));
    return [];
  } catch (error) { return [`prepared input review does not replay: ${error.message}`]; }
}

const cornerProperties = ['borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomRightRadius', 'borderBottomLeftRadius'];
const radiusProperty = key => key === 'all' || /^border.*radius$/i.test(key.replaceAll('-', ''));
const radiusFields = object => Object.fromEntries(Object.entries(object ?? {}).filter(([key]) => radiusProperty(key)));

export function proveSheetCornerBoxEvidence(entry, reference, candidate, element) {
  const inputs = proveBottomSheetActionCorners(entry, reference, candidate, element);
  const overlay = entry.overlayPlacement;
  assert.ok(!(entry.focusedRasters ?? []).some(raster => ['bottom-sheet-dismiss', 'bottom-sheet-copy'].includes(raster.id)));
  assert.equal(overlay.targetId, 'bottom-sheet-panel');
  assert.equal(overlay.referenceRows.length, 2); assert.equal(overlay.astylarRows.length, 2);
  // The retained harness emits Share, Copy link in this order. Bind that order
  // to authenticated native/candidate children rather than trusting a pass flag.
  const rn = reference.nodes.find(node => node.key === inputs.referenceNode);
  const an = candidate.nodes.find(node => node.key === inputs.astylarNode);
  const nativeSiblings = reference.nodes.filter(node => node.parent === rn.parent && node.type === 'a');
  const candidateSiblings = candidate.nodes.filter(node => node.parent === an.parent && node.authored?.type === 'button');
  const index = element === 'bottom-sheet-dismiss' ? 0 : 1;
  assert.equal(nativeSiblings.length, 2); assert.equal(candidateSiblings.length, 2);
  assert.equal(nativeSiblings[index].key, rn.key); assert.equal(candidateSiblings[index].key, an.key);
  const nativeBox = overlay.referenceRows[index], candidateBox = overlay.astylarRows[index];
  const expectedWidth = entry.viewport.id === 'comparison-pane-dpr1' ? 868 : 480;
  for (const box of [nativeBox, candidateBox]) {
    for (const property of ['left', 'top', 'right', 'bottom', 'width', 'height']) assert.ok(Number.isFinite(box[property]));
    assert.ok(Math.abs(box.width - expectedWidth) < 1e-6); assert.ok(Math.abs(box.height - 48) < 1e-6);
    assert.ok(Math.abs(box.right - box.left - box.width) < 1e-6);
    assert.ok(Math.abs(box.bottom - box.top - box.height) < 1e-6);
  }
  const reduce = (radius, box) => Math.min(radius, box.width / 2, box.height / 2);
  const nativeUsedRadius = reduce(9999, nativeBox);
  const candidateCssUsedRadius = reduce(Number.parseFloat(inputs.candidate.borderTopLeftRadius), candidateBox);
  const sameCssCornerGeometry = Math.abs(nativeUsedRadius - candidateCssUsedRadius) < 1e-6;
  assert.equal(sameCssCornerGeometry, entry.profile !== 'contrast');
  return { ...inputs, measuredBoxes: { reference: nativeBox, candidate: candidateBox },
    nativeUsedRadius, candidateCssUsedRadius, sameCssCornerGeometry,
    candidateUsedLayoutMeasured: true, candidateUsedPaintVerified: false,
    renderingEquivalent: null,
    limitation: 'Original row border boxes establish equal dimensions and conditional CSS radius reduction, not renderer paint. Retained focused row rasters are absent; no radius classification is promoted to rendering equivalence.' };
}

// Authored token substitution is not a used-corner or clipping diagnosis: CSS
// may reduce distinct radii to the same shape on a sufficiently short box.
export function proveAuthoredCornerRequests(entry, reference, candidate, element) {
  const chip = entry.family === 'chips';
  const actionSelector = ({ 'card-open': '.text-button', 'toolbar-action': '.toolbar-action',
    'dialog-cancel': '.dialog-action', 'dialog-save': '.dialog-action' })[element];
  const action = Boolean(actionSelector);
  assert.ok(action ? ({ 'card-open': 'card', 'toolbar-action': 'toolbar', 'dialog-cancel': 'dialog', 'dialog-save': 'dialog' })[element] === entry.family
    : chip ? ['chip-0', 'chip-1'].includes(element) : entry.family === 'button-toggle' && element === 'button-toggle-primary');
  const inputs = entry.styleInputs.filter(input => input.id === element); assert.equal(inputs.length, 1);
  const native = reference.nodes.filter(node => node.attributes?.id === element || node.attributes?.['data-parity-id'] === element);
  const candidates = candidate.nodes.filter(node => node.authored?.id === element);
  assert.equal(native.length, 1); assert.equal(candidates.length, 1);
  const r = native[0], a = candidates[0], input = inputs[0];
  assert.equal(r.type, action ? 'button' : chip ? 'mat-chip-option' : 'mat-button-toggle-group'); assert.equal(a.authored.type, action ? 'button' : 'div');
  assert.equal(reference.ruleEvidenceComplete, true); assert.equal(candidate.ruleEvidenceComplete, true);
  assert.equal(candidate.resolvedStyleEvidenceVersion, 2); assert.equal(candidate.resolvedStyleSource, 'core-style-inspection');
  assert.equal(input.astylarResolvedStyleEvidenceVersion, 2); assert.equal(Object.keys(input.reference).length, 89);
  for (const [key, value] of Object.entries(input.reference)) assert.deepEqual(reference.styles[r.style][key], value);
  assert.deepEqual(radiusFields(r.inline), {});
  const requests = r.rules.map(index => reference.rules[index]).filter(rule => rule.active).flatMap(rule => {
    const declarations = [...rule.cssText.matchAll(/(?:^|;)\s*([\w-]+)\s*:\s*([^;]*)(?=;|$)/g)]
      .filter(([, key]) => radiusProperty(key)).map(([, key, value]) => [key, value.trim()]);
    if (!declarations.length && !Object.keys(radiusFields(rule.declarations)).length) return [];
    assert.deepEqual(radiusFields(rule.declarations), Object.fromEntries(cornerProperties.map(key => [key.replace(/[A-Z]/g, c => '-' + c.toLowerCase()), { value: '', important: false }])));
    return [{ selector: rule.selector, declarations }];
  });
  const filled = element === 'dialog-save';
  assert.deepEqual(requests, action ? [{
    selector: filled ? '.mat-mdc-unelevated-button, .mat-mdc-unelevated-button .mdc-button__ripple' : '.mat-mdc-button, .mat-mdc-button .mdc-button__ripple',
    declarations: [['border-radius', `var(--mat-button-${filled ? 'filled' : 'text'}-container-shape, var(--mat-sys-corner-full))`]],
  }] : chip ? [
    { selector: '.mat-mdc-standard-chip', declarations: [['border-radius', 'var(--mat-chip-container-shape-radius, 8px)']] },
  ] : [
    { selector: '.mat-button-toggle-standalone, .mat-button-toggle-group', declarations: [['border-radius', 'var(--mat-button-toggle-legacy-shape)']] },
    { selector: '.mat-button-toggle-standalone.mat-button-toggle-appearance-standard, .mat-button-toggle-group-appearance-standard', declarations: [['border-radius', 'var(--mat-button-toggle-shape, var(--mat-sys-corner-extra-large))']] },
  ]);
  const nativeRadius = action ? '9999px' : chip ? '8px' : { light: '28px', dark: '28px', contrast: '21px', custom: '42px' }[entry.profile];
  const candidateRadius = action ? (element === 'card-open' ? { light: '20px', dark: '20px', contrast: '9px', custom: '21px' }[entry.profile] : '20px') : (chip ? { light: '8px', dark: '8px', contrast: '6px', custom: '12px' }
    : { light: '21px', dark: '21px', contrast: '9.75px', custom: '31.5px' })[entry.profile];
  assert.ok(nativeRadius && candidateRadius);
  for (const property of cornerProperties) assert.equal(reference.styles[r.style][property], nativeRadius);
  assert.deepEqual(radiusFields(a.authored.style), {}); assert.equal(a.authored.attributes?.style, undefined);
  const candidateRequests = candidate.rules.filter(rule => rootInitialSelectorCanApply(rule.selector, a.authored))
    .map(({ selector, ...style }) => ({ selector, declarations: radiusFields(style) })).filter(rule => Object.keys(rule.declarations).length);
  assert.deepEqual(candidateRequests, [{ selector: actionSelector ?? (chip ? '.chip' : '#button-toggle-primary'), declarations: { borderRadius: candidateRadius } }]);
  for (const [field, stage] of [['astylar', 'resolvedStyle'], ['astylarNormalResolvedStyle', 'normalResolvedStyle'], ['astylarInteractionResolvedStyle', 'interactionResolvedStyle']]) {
    assert.deepEqual(input[field], a[stage]); assert.deepEqual(radiusFields(a[stage]), { borderRadius: candidateRadius });
  }
  return { referenceNode: r.key, astylarNode: a.key, referenceRequests: requests, candidateRequests,
    nativeRadius, candidateRadius, usedCornerEquivalenceProven: false, clippingCauseProven: false,
    attributableProperties: cornerProperties };
}

export function proveActionCornerBoxInputs(entry, reference, candidate, element) {
  const proof = proveAuthoredCornerRequests(entry, reference, candidate, element);
  const height = entry.family === 'dialog' ? '40px' : ({ light: '40px', dark: '40px', contrast: '24px', custom: '28px' })[entry.profile];
  const r = reference.nodes.find(node => node.key === proof.referenceNode), a = candidate.nodes.find(node => node.key === proof.astylarNode);
  assert.equal(reference.styles[r.style].height, height);
  for (const stage of ['normalResolvedStyle', 'resolvedStyle', 'interactionResolvedStyle']) assert.equal(a[stage].height, height);
  const halfHeight = Number.parseFloat(height) / 2;
  const cssRadiusOnEqualWideBoxes = Math.min(Number.parseFloat(proof.candidateRadius), halfHeight);
  // State the required width condition; dialog captures do not contain action
  // border boxes, and declared height alone is not proof of used geometry.
  const sameShapeOnEqualWideBoxes = cssRadiusOnEqualWideBoxes === halfHeight;
  assert.equal(sameShapeOnEqualWideBoxes, !(element === 'card-open' && entry.profile === 'contrast'));
  return { ...proof, nativeComputedHeight: height, candidateHeightDeclaration: height,
    referenceRadiusOnEqualWideBoxes: halfHeight, candidateRadiusOnEqualWideBoxes: cssRadiusOnEqualWideBoxes,
    sameShapeOnEqualWideBoxes, candidateUsedLayoutMeasured: false,
    renderingEquivalent: null, limitation: 'Uniform corner reduction is conditional on equal used boxes at least as wide as high. This does not establish candidate painting or structural equivalence.' };
}

export function applyCardContrastCornerReview(rows, cases, inventory, normalize) {
  const selected = rows.filter(row => row.family === 'card' && row.element === 'card-open' && row.astylar === '9px');
  const reviewed = applyModalBoxReview(selected, cases, inventory, normalize, {
    family: 'card', element: 'card-open', properties: cornerProperties,
    prove: (entry, reference, candidate) => {
      assert.equal(entry.profile, 'contrast');
      return proveActionCornerBoxInputs(entry, reference, candidate, 'card-open');
    },
    attribution: 'reviewed-card-contrast-radius-substitution', owner: 'card action shape-token authoring',
    justification: 'The native full-pill token resolves to 9999px on a 24px-high button, whereas candidate .text-button explicitly requests 9px in all three stages. Even on equal wide 24px-high boxes those requests reduce to 12px versus 9px; preserve the other profiles as conditional cases. This proves an authoring difference, not its original motivation or a renderer paint defect.',
  });
  const replacements = new Map(selected.map((row, index) => [row, reviewed[index]]));
  return rows.map(row => replacements.get(row) ?? row);
}

// Keep this separate from the accepted historical batch until its coherent
// export/conservation milestone. This classifies test-input coverage, not paint.
export function applyFullRadiusActionReview(rows, cases, inventory, normalize) {
  const selected = rows.filter(row => row.attribution === 'unresolved' && cornerProperties.includes(row.property) &&
    ['card-open', 'toolbar-action', 'dialog-cancel', 'dialog-save'].includes(row.element) && row.astylar !== '9px');
  let reviewed = selected;
  for (const [family, element] of [['card', 'card-open'], ['toolbar', 'toolbar-action'],
    ['dialog', 'dialog-cancel'], ['dialog', 'dialog-save']]) {
    reviewed = applyModalBoxReview(reviewed, cases, inventory, normalize, {
      family, element, properties: cornerProperties,
      classification: 'parity-harness-defect', attribution: 'reviewed-full-radius-action-request-coverage-gap',
      owner: 'comparison request fidelity; core rounded-rectangle sampling owns the independent rendering defect',
      justification: 'Native full-radius tokens resolve to 9999px while these candidate owners explicitly request 20px or 21px. On equal sufficiently wide boxes the CSS used radius can be identical, so this is not classified as a different intended shape. The comparison nevertheless does not exercise the native full-radius request through AstylarUI; the independent equal-input radius proof demonstrates that this request has a core sampling failure. Classify the missing request coverage, not presumed historical intent or whole-control equivalence. Restore equal requests only alongside a general core correction, never tune the smaller radius against antialiasing pixels.',
      prove: (entry, reference, candidate) => {
        const proof = proveActionCornerBoxInputs(entry, reference, candidate, element);
        assert.equal(proof.sameShapeOnEqualWideBoxes, true);
        return { ...proof, firstDivergence: 'authored full-radius request replaced before renderer input',
          sourceFinding: 'core-rounded-radius-sampling-uses-unclamped-request',
          originalCompensationIntentProven: false, allStatesUsedBoxesMeasured: false,
          actualCaseRendererCauseProven: false, inputEquivalent: null, renderingEquivalent: null };
      },
    });
  }
  const replacements = new Map(selected.map((row, index) => [row, { ...reviewed[index],
    reviewEvidence: { ...reviewed[index].reviewEvidence, inputEquivalent: null, renderingEquivalent: null } } ]));
  return rows.map(row => replacements.get(row) ?? row);
}

export function validateFullRadiusActionReview(rows, originalRows, cases, inventory, normalize) {
  try {
    const select = values => values.filter(row => row.attribution === 'reviewed-full-radius-action-request-coverage-gap');
    assert.deepEqual(select(rows), select(applyFullRadiusActionReview(originalRows, cases, inventory, normalize)));
    return [];
  } catch (error) { return [`full-radius action review does not replay: ${error.message}`]; }
}

export function applyAuthoredCornerReviews(rows, cases, inventory, normalize) {
  for (const [family, element] of [['chips', 'chip-0'], ['chips', 'chip-1'], ['button-toggle', 'button-toggle-primary']]) {
    rows = applyModalBoxReview(rows, cases, inventory, normalize, {
      family, element, properties: cornerProperties,
      prove: (entry, reference, candidate) => proveAuthoredCornerRequests(entry, reference, candidate, element),
      attribution: 'reviewed-chip-toggle-radius-token-substitution',
      owner: 'chip/toggle authored shape-token substitution',
      justification: 'Native owners retain Material shape-token declarations, while corresponding candidate rules substitute profile-specific numeric radii. Exact native scalar joins and all three candidate stages bind this authoring discrepancy. Distinct specified radii may reduce to the same used shape; this does not diagnose clipping, prove unequal painted corners, or authorize fixture compensation.',
    });
  }
  return rows;
}

const staticOwners = [
  ['card', 'card-copy', 'mat-card-content', 'p'], ['card', 'card-title', 'mat-card-title', 'h2'],
  ['chips', 'chips-primary', 'mat-chip-listbox', 'div'], ['icon', 'icon-primary', 'mat-icon', 'img'],
  ['list', 'list-primary', 'mat-list', 'div'], ['tree', 'tree-primary', 'mat-tree', 'div'],
  ['paginator', 'paginator-primary', 'mat-paginator', 'div'], ['paginator', 'paginator-range', 'div', 'span'],
  ['paginator', 'paginator-size', 'div', 'span'], ['tabs', 'tab-panel', 'span', 'showcase.material:tab-panel'],
  ['tabs', 'tab-overview', 'span', 'button'], ['tabs', 'tab-activity', 'span', 'button'],
  ['stepper', 'stepper-content', 'span', 'span'], ['expansion', 'expansion-title', 'mat-panel-title', 'span'],
  ['sort', 'sort-primary', 'div', 'div', '.sort-header'], ['toolbar', 'toolbar-primary', 'mat-toolbar', 'div', '.toolbar'],
];
export function proveStaticOwnerPosition(entry, reference, candidate, element) {
  const definition = staticOwners.find(([family, id]) => family === entry.family && id === element); assert.ok(definition);
  const [, , nativeType, candidateType, selector] = definition;
  const inputs = entry.styleInputs.filter(i => i.id === element); assert.equal(inputs.length, 1);
  const input = inputs[0];
  let matches = reference.nodes.filter(n => n.attributes?.id === element), identity;
  if (!matches.length) {
    identity = resolveOriginAliasPair(entry, reference, candidate, input); assert.equal(identity.status, 'mapped');
    assert.deepEqual(identity.missingRules, []); assert.deepEqual(identity.extraRules, []);
    matches = reference.nodes.filter(n => n.key === identity.referenceNode);
  }
  assert.equal(matches.length, 1); const r = matches[0];
  const candidates = candidate.nodes.filter(n => n.authored?.id === element); assert.equal(candidates.length, 1); const a = candidates[0];
  assert.equal(r.type, nativeType); assert.equal(a.authored.type, candidateType);
  assert.equal(reference.ruleEvidenceComplete, true); assert.equal(candidate.ruleEvidenceComplete, true);
  assert.equal(candidate.resolvedStyleEvidenceVersion, 2); assert.equal(candidate.resolvedStyleSource, 'core-style-inspection');
  assert.equal(Object.keys(input.reference).length, 89);
  for (const [key, value] of Object.entries(input.reference)) assert.deepEqual(reference.styles[r.style][key], value);
  const relevant = key => /^(all|position|top|right|bottom|left|transform)$|^(inset|animation|transition)/.test(key.replaceAll('-', '').toLowerCase());
  assert.ok(!Object.keys(r.inline ?? {}).some(relevant));
  const rules = r.rules.map(i => reference.rules[i]).filter(rule => rule.active);
  assert.ok(rules.every(rule => !Object.keys(rule.declarations).some(relevant)));
  assert.equal(reference.styles[r.style].position, 'static');
  assert.equal(a.authored.style, undefined); assert.equal(a.authored.attributes?.style, undefined);
  const pick = o => Object.fromEntries(Object.entries(o ?? {}).filter(([k]) => relevant(k)));
  const requests = candidate.rules.filter(rule => rootInitialSelectorCanApply(rule.selector, a.authored))
    .map(({ selector, ...d }) => ({ selector, declarations: pick(d) })).filter(rule => Object.keys(rule.declarations).length);
  assert.deepEqual(requests, selector ? [{ selector, declarations: { position: 'relative' } }] : []);
  for (const [field, stage] of [['astylar', 'resolvedStyle'], ['astylarNormalResolvedStyle', 'normalResolvedStyle'], ['astylarInteractionResolvedStyle', 'interactionResolvedStyle']]) {
    assert.deepEqual(input[field], a[stage]); assert.deepEqual(pick(a[stage]), selector ? { position: 'relative' } : {});
  }
  return { referenceNode: r.key, astylarNode: a.key, identity, referenceRules: rules, candidateRequests: requests,
    ownerTypes: { reference: nativeType, candidate: candidateType }, inputEquivalent: false, renderingEquivalent: false,
    structuralEquivalenceProven: false, candidateComputedPositionVerified: false };
}
export function applyStaticOwnerPositionReviews(rows, cases, inventory, normalize) {
  for (const [family, element, , , selector] of staticOwners) rows = applyModalBoxReview(rows, cases, inventory, normalize, {
    family, element, properties: ['position'], prove: (entry, r, a) => proveStaticOwnerPosition(entry, r, a, element),
    classification: selector ? 'application-plugin-authoring-defect' : 'parity-harness-defect',
    attribution: selector ? 'reviewed-static-owner-relative-substitution' : 'reviewed-static-owner-observation-boundary',
    owner: 'mapped native static owner versus candidate positioning authoring',
    justification: selector
      ? 'Native owner computes static without an authored position/reset/motion request. Candidate explicitly requests relative in a matching rule and all local stages. This is unequal positioning authoring, not proof of a renderer defect or equivalent containing blocks.'
      : 'Native owner computes static without an authored position/reset/motion request, while candidate authoring and all local stages omit position. Preserve exact owner types and alias mapping where needed; this observation boundary does not prove structural equivalence or candidate computed positioning.',
  });
  return rows;
}

export function proveCoreAnchor(entry, reference, candidate) {
  assert.equal(entry.family, 'core');
  const input = entry.styleInputs.find(i => i.id === 'core-primary');
  const identity = inspectButtonHostRequests(input, reference, candidate);
  const r = reference.nodes.find(n => n.key === identity.referenceNode), a = candidate.nodes.find(n => n.key === identity.candidateNode);
  const selected = key => /^(all|position|top|right|bottom|left|transform)$|^inset/.test(key.replaceAll('-', '').toLowerCase());
  const select = value => Object.fromEntries(Object.entries(value ?? {}).filter(([key]) => selected(key)));
  assert.equal(reference.ruleEvidenceComplete, true); assert.equal(candidate.ruleEvidenceComplete, true);
  assert.deepEqual(select(r.inline), {});
  const requests = r.rules.map(i => reference.rules[i]).filter(rule => rule.active)
    .map(rule => ({ selector: rule.selector, declarations: select(rule.declarations) })).filter(rule => Object.keys(rule.declarations).length);
  assert.deepEqual(requests, [
    { selector: '.mdc-button', declarations: { position: { value: 'relative', important: false } } },
    { selector: '.mat-ripple', declarations: { position: { value: 'relative', important: false } } },
    { selector: '.mat-ripple:not(:empty)', declarations: { transform: { value: 'translateZ(0px)', important: false } } },
  ]);
  const candidateRequests = candidate.rules.filter(rule => rootInitialSelectorCanApply(rule.selector, a.authored))
    .map(({ selector, ...declarations }) => ({ selector, declarations: select(declarations) })).filter(rule => Object.keys(rule.declarations).length);
  assert.deepEqual(candidateRequests, [{ selector: '#core-primary', declarations: { position: 'absolute', top: '28px', left: '28px' } }]);
  for (const stage of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle'])
    assert.deepEqual(select(a[stage]), { position: 'absolute', top: '28px', left: '28px' });
  for (const property of ['top', 'right', 'bottom', 'left']) assert.equal(reference.styles[r.style][property], '0px');
  assert.equal(reference.styles[r.style].transform, 'matrix(1, 0, 0, 1, 0, 0)');
  return { identity, referenceNode: r.key, astylarNode: a.key, referenceRequests: requests, candidateRequests,
    referenceRules: r.rules.map(i => reference.rules[i]), inputEquivalent: false, renderingEquivalent: false,
    candidateUsedOffsetsVerified: false, containingBlockEquivalenceProven: false };
}

export function applyCoreAnchorReviews(rows, cases, inventory, normalize) {
  for (const [properties, classification, attribution, justification] of [
    [['top', 'left'], 'application-plugin-authoring-defect', 'reviewed-core-anchor-substitution',
      'The existing relative-to-absolute host substitution also introduces top/left 28px, absent from native authoring. Native CSSOM zeros are not literal input. Preserve the existing fixed-width and host findings; no renderer coordinate cause is established.'],
    [['transform'], 'application-plugin-authoring-defect', 'reviewed-core-transform-request-omission',
      'Native ripple host explicitly requests translateZ(0px); candidate authoring and all local stages omit transform. Its identity computed matrix is not proof that omitting the request preserves containing blocks, stacking or rendering.'],
    [['right', 'bottom'], 'parity-harness-defect', 'reviewed-core-computed-offset-boundary',
      'Neither owner authors right/bottom; the native relative host computes zero while candidate local declarations omit them. Keep this observation boundary separate from the explicit absolute-position/top/left substitution. Candidate used offsets and containing blocks remain unproven.'],
  ]) rows = applyModalBoxReview(rows, cases, inventory, normalize, {
    family: 'core', element: 'core-primary', properties, prove: proveCoreAnchor, classification, attribution,
    owner: 'core demo button fixture positioning and computed/local offset inspection', justification,
  });
  return rows;
}

const relevant = key => /^(all|position|top|right|bottom|left)$|^(inset|margin)/.test(key.replaceAll('-', '').toLowerCase());
const pick = value => Object.fromEntries(Object.entries(value ?? {}).filter(([key]) => relevant(key)));

const relativeOwners = {
  badge: ['badge-primary', 'span', 'span', '.mat-badge', '.badge-anchor'],
  card: ['card-primary', 'mat-card', 'div', '.mat-mdc-card', '.material-card'],
  checkbox: ['checkbox-primary', 'mat-checkbox', 'div', '.mat-mdc-checkbox', '#checkbox-primary'],
  sidenav: ['sidenav-primary', 'mat-sidenav-container', 'div', '.mat-drawer-container', null],
  toolbar: ['toolbar-action', 'button', 'button', '.mdc-button', null],
};
export function proveRelativeOwnerOffsets(entry, reference, candidate) {
  const [element, nativeType, candidateType, nativeSelector, candidateSelector] = relativeOwners[entry.family];
  const one = values => { assert.equal(values.length, 1); return values[0]; };
  const input = one(entry.styleInputs.filter(i => i.id === element));
  const r = one(reference.nodes.filter(n => n.attributes?.id === element));
  const a = one(candidate.nodes.filter(n => n.authored?.id === element));
  assert.equal(r.type, nativeType); assert.equal(a.authored.type, candidateType);
  assert.equal(reference.ruleEvidenceComplete, true); assert.equal(candidate.ruleEvidenceComplete, true);
  assert.equal(candidate.resolvedStyleEvidenceVersion, 2); assert.equal(candidate.resolvedStyleSource, 'core-style-inspection');
  assert.equal(Object.keys(input.reference).length, 89);
  for (const [key, value] of Object.entries(input.reference)) assert.deepEqual(reference.styles[r.style][key], value);
  const selected = key => /^(all|position|top|right|bottom|left|transform)$|^inset/.test(key.replaceAll('-', '').toLowerCase());
  const select = value => Object.fromEntries(Object.entries(value ?? {}).filter(([key]) => selected(key)));
  assert.deepEqual(select(r.inline), {}); assert.equal(a.authored.style, undefined); assert.equal(a.authored.attributes?.style, undefined);
  const referenceRules = r.rules.map(i => reference.rules[i]).filter(rule => rule.active);
  assert.deepEqual(referenceRules.map(rule => ({ selector: rule.selector, declarations: select(rule.declarations) }))
    .filter(rule => Object.keys(rule.declarations).length), [{ selector: nativeSelector, declarations: { position: { value: 'relative', important: false } } }]);
  for (const rule of referenceRules) assert.doesNotMatch(rule.cssText, /(?:^|;)\s*(?:inset[\w-]*|top|right|bottom|left|all)\s*:/i);
  const candidateRequests = candidate.rules.filter(rule => rootInitialSelectorCanApply(rule.selector, a.authored))
    .map(({ selector, ...declarations }) => ({ selector, declarations: select(declarations) })).filter(rule => Object.keys(rule.declarations).length);
  assert.deepEqual(candidateRequests, candidateSelector ? [{ selector: candidateSelector, declarations: { position: 'relative' } }] : []);
  for (const [field, stage] of [['astylar', 'resolvedStyle'], ['astylarNormalResolvedStyle', 'normalResolvedStyle'], ['astylarInteractionResolvedStyle', 'interactionResolvedStyle']]) {
    assert.deepEqual(input[field], a[stage]); assert.deepEqual(select(a[stage]), candidateSelector ? { position: 'relative' } : {});
  }
  for (const property of ['top', 'right', 'bottom', 'left']) assert.equal(reference.styles[r.style][property], '0px');
  assert.equal(reference.styles[r.style].position, 'relative'); assert.equal(reference.styles[r.style].transform, 'none');
  return { referenceNode: r.key, astylarNode: a.key, referenceRules, candidateRequests,
    inputEquivalent: false, renderingEquivalent: false, candidateUsedOffsetsVerified: false,
    containingBlockEquivalenceProven: false };
}
export function applyRelativeOwnerOffsetReviews(rows, cases, inventory, normalize) {
  for (const [family, [element, , , , candidateSelector]] of Object.entries(relativeOwners)) {
    if (!candidateSelector) rows = applyModalBoxReview(rows, cases, inventory, normalize, {
      family, element, properties: ['position'], prove: proveRelativeOwnerOffsets,
      attribution: 'reviewed-relative-owner-position-omission', owner: 'Material container/button host authoring',
      justification: 'The exact native host explicitly requests relative positioning; candidate authoring and all three local stages omit it. Preserve the owner mapping and unequal request without assuming candidate computed positioning or matching containing blocks.',
    });
    rows = applyModalBoxReview(rows, cases, inventory, normalize, {
      family, element, properties: ['top', 'right', 'bottom', 'left'], prove: proveRelativeOwnerOffsets,
      classification: 'parity-harness-defect', attribution: 'reviewed-relative-owner-computed-insets',
      owner: 'native computed relative insets versus candidate local declarations',
      justification: 'Native relative owner has no authored inset/reset request and computes zero insets. Candidate omits insets in authoring and all three local stages. These zeros are not literal authoring to copy. Preserve differing host structure and any missing relative request; used offsets and containing-block equivalence are not established.',
    });
  }
  return rows;
}

export function proveAuthoredAnchor(entry, reference, candidate) {
  const badge = entry.family === 'badge';
  assert.ok(badge || entry.family === 'slide-toggle');
  const element = badge ? 'badge-count' : 'slide-toggle-label';
  const identity = badge ? proveBadgePointerRequest(entry, reference, candidate)
    : proveFlowPositionSubstitution(reference, candidate, element);
  const r = reference.nodes.find(n => n.key === (identity.referenceNode ?? identity.referenceKey));
  const a = candidate.nodes.find(n => n.key === (identity.astylarNode ?? identity.candidateKey));
  assert.equal(r.type, 'span'); assert.equal(a.authored.type, 'span');
  assert.equal(reference.ruleEvidenceComplete, true); assert.equal(candidate.ruleEvidenceComplete, true);
  assert.equal(candidate.resolvedStyleEvidenceVersion, 2); assert.equal(candidate.resolvedStyleSource, 'core-style-inspection');
  const inputs = entry.styleInputs.filter(i => i.id === element); assert.equal(inputs.length, 1);
  for (const [key, value] of Object.entries(inputs[0].reference)) assert.deepEqual(reference.styles[r.style][key], value);
  for (const [field, stage] of [['astylar', 'resolvedStyle'], ['astylarNormalResolvedStyle', 'normalResolvedStyle'], ['astylarInteractionResolvedStyle', 'interactionResolvedStyle']]) {
    assert.deepEqual(inputs[0][field], a[stage]);
    assert.deepEqual(pick(a[stage]), badge ? { margin: '0', position: 'absolute', top: '-4px', right: '-4px' }
      : { margin: '0', position: 'absolute', top: '6px', left: '60px' });
  }
  assert.deepEqual(pick(r.inline), {});
  assert.equal(a.authored.style, undefined); assert.equal(a.authored.attributes?.style, undefined);
  const candidateRequests = candidate.rules.filter(rule => rootInitialSelectorCanApply(rule.selector, a.authored))
    .map(({ selector, ...declarations }) => ({ selector, declarations: pick(declarations) }))
    .filter(rule => Object.keys(rule.declarations).length);
  assert.deepEqual(candidateRequests, [{ selector: badge ? '.badge-bubble' : '.switch-label', declarations: badge
    ? { position: 'absolute', top: '-4px', right: '-4px' } : { position: 'absolute', top: '6px', left: '60px' } }]);
  const referenceRules = r.rules.map(i => reference.rules[i]).filter(rule => rule.active);
  const referenceRequests = referenceRules.map(rule => ({ selector: rule.selector, declarations: pick(rule.declarations), cssText: rule.cssText }));
  if (badge) {
    assert.deepEqual(referenceRules.flatMap(rule => Object.entries(rule.declarations)
      .filter(([key]) => relevant(key) && !key.startsWith('margin'))
      .map(([property, value]) => ({ selector: rule.selector, property, value }))), [
      { selector: '.mat-badge-content', property: 'position', value: { value: 'absolute', important: false } },
      { selector: '.mat-badge-above .mat-badge-content', property: 'bottom', value: { value: '100%', important: false } },
      { selector: '.mat-badge-after .mat-badge-content', property: 'left', value: { value: '100%', important: false } },
    ]);
    const marginRules = referenceRules.filter(rule => Object.keys(rule.declarations).some(key => key.startsWith('margin')));
    assert.deepEqual(marginRules.map(rule => rule.selector), ['.mat-badge-medium .mat-badge-content', '.mat-badge-medium.mat-badge-overlap .mat-badge-content']);
    for (const [index, rule] of marginRules.entries()) {
      assert.deepEqual(pick(rule.declarations), Object.fromEntries(['top', 'right', 'bottom', 'left'].map(side => ['margin-' + side, { value: '', important: false }])));
      assert.deepEqual([...rule.cssText.matchAll(/(?:^|;)\s*margin\s*:\s*([^;]+)(?=;|$)/g)].map(m => m[1].trim()),
        [index ? 'var(--mat-badge-container-overlap-offset, -12px)' : 'var(--mat-badge-container-offset, -12px 0)']);
    }
    assert.equal(reference.styles[r.style].margin, '-12px');
    for (const p of ['top', 'right']) assert.equal(reference.styles[r.style][p], '8px');
  } else {
    assert.ok(referenceRules.every(rule => !Object.keys(pick(rule.declarations)).length));
    for (const p of ['top', 'left']) assert.equal(reference.styles[r.style][p], 'auto');
  }
  return { identity, referenceNode: r.key, astylarNode: a.key, referenceRequests, candidateRequests,
    referenceComputed: reference.styles[r.style], inputEquivalent: false, renderingEquivalent: false,
    compoundPlacementEquivalenceProven: false, rendererCauseProven: false };
}

export function applyAuthoredAnchorReviews(rows, cases, inventory, normalize) {
  for (const [family, element, properties] of [
    ['slide-toggle', 'slide-toggle-label', ['top', 'left']],
    ['badge', 'badge-count', ['top', 'right', 'bottom', 'left']],
  ]) rows = applyModalBoxReview(rows, cases, inventory, normalize, {
    family, element, properties, prove: proveAuthoredAnchor,
    classification: 'application-plugin-authoring-defect', attribution: 'reviewed-authored-anchor-substitution',
    owner: family === 'badge' ? 'badge anchor/margin composition; existing intrinsic-width and margin-box core findings'
      : 'slide-toggle label flow authoring',
    justification: family === 'badge'
      ? 'Native bottom/left percentage anchors and token-resolved negative margins are replaced with candidate top/right fixed negative offsets and zero margin. Native computed top/right are not authored requests. Preserve those observations and the existing independent intrinsic-width/margin-box defects without claiming the replacement composition is equivalent.'
      : 'A native static label in centered inline-flex flow is replaced by an absolute label at left 60px/top 6px in a fixed-height relative host. Reuse the established flow-position proof; these are unequal authored inputs, not a demonstrated renderer translation defect.',
  });
  return rows;
}
