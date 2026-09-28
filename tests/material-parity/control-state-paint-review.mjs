import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { collectButtonPaintAllStates } from '../../scripts/audit-material-button-paint-all-states.mjs';
import { collectDisabledLabelColorStages } from '../../scripts/audit-material-disabled-label-color-stages.mjs';
import { applyOverlayTriggerPaintReview, overlayTriggerPaintAttribution } from './overlay-trigger-paint-review.mjs';
import { modalInventoryTrees, applyModalBoxReview, proveBottomSheetPanelPaint, proveBottomSheetActionLayout, proveModalPositionInspection } from './modal-position-inspection.mjs';
import { proveControlClippingRequests } from './control-overflow-observation.mjs';
import { proveRemainingControlOverflowInputs } from './control-overflow-observation.mjs';
import { rootInitialSelectorCanApply } from './root-initial-style-evidence.mjs';
import { resolveOriginAliasPair } from './origin-alias-mapping-evidence.mjs';
import { proveTabControlStage } from '../../scripts/audit-material-tab-position-substitution.mjs';
import { proveFlowPositionSubstitution } from '../../scripts/audit-material-flow-position-substitutions.mjs';
import { proveChipPositionInspection } from './chip-position-inspection.mjs';
import { proveTabPanelWrapping } from './wrapping-input-review.mjs';

const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const one = values => { assert.equal(values.length, 1); return values[0]; };
const keyOf = e => `${e.kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`;

export function proveSheetActionAppearance(entry, r, a, element) {
  const composition = proveBottomSheetActionLayout(entry, r, a, element);
  const native = one(r.nodes.filter(n => n.key === composition.referenceNode));
  const candidate = one(a.nodes.filter(n => n.key === composition.astylarNode));
  const affects = key => /^(appearance|webkitappearance|mozappearance|all)$/.test(key.replaceAll('-', '').toLowerCase());
  assert.equal(r.styles[native.style].appearance, 'none');
  for (const style of [native.inline, candidate.authored.style ?? {}, candidate.resolvedStyle,
    candidate.normalResolvedStyle, candidate.interactionResolvedStyle]) assert.deepEqual(Object.keys(style).filter(affects), []);
  for (const rule of native.rules.map(i => r.rules[i])) assert.deepEqual(Object.keys(rule.declarations).filter(affects), []);
  assert.deepEqual(a.rules.filter(rule => rootInitialSelectorCanApply(rule.selector, candidate.authored))
    .flatMap(rule => Object.keys(rule).filter(affects)), []);
  return { ...composition, referenceAppearance: 'none', candidateAppearanceRequest: '<omitted>',
    attributableProperties: ['appearance'],
    referenceType: 'a', candidateType: 'button', candidateComputedAppearanceInferred: false,
    nativeWidgetEquivalenceProven: false };
}

export function applySheetActionAppearance(rows, cases, inventory, normalize) {
  return ['bottom-sheet-copy', 'bottom-sheet-dismiss'].reduce((values, element) =>
    applyModalBoxReview(values, cases, inventory, normalize, {
      family: 'bottom-sheet', element, properties: ['appearance'],
      prove: (e, r, a) => proveSheetActionAppearance(e, r, a, element),
      classification: 'application-plugin-authoring-defect', attribution: 'reviewed-sheet-action-appearance-substitution',
      owner: 'bottom-sheet link/list-item authoring; retain core native-control support as a separate question',
      justification: 'The mapped native owner is a link with child label/state-layer structure; the candidate is a childless value button. Neither authors appearance, but the changed element type prevents interpreting native link computed none as an equivalent candidate control default. Existing action-layout proof binds the original mapping and unequal composition. No candidate computed appearance, native-widget parity or renderer appearance defect is inferred.',
    }), rows);
}

export function validateSheetActionAppearance(rows, originals, cases, inventory, normalize) {
  try {
    const select = values => values.filter(r => r.attribution === 'reviewed-sheet-action-appearance-substitution');
    assert.deepEqual(select(rows), select(applySheetActionAppearance(originals, cases, inventory, normalize))); return [];
  } catch (error) { return [`sheet action appearance lacks original inputs: ${error.message}`]; }
}

export function proveAppearanceOwnerBoundary(entry, r, a, element) {
  assert.ok(entry.family === 'chips' ? ['chip-0', 'chip-1'].includes(element) : entry.family === 'tabs' && element === 'tab-panel');
  for (const tree of [r, a]) { assert.equal(tree.ruleEvidenceComplete, true); assert.deepEqual(tree.errors, []); }
  assert.equal(a.resolvedStyleSource, 'core-style-inspection'); assert.equal(a.resolvedStyleEvidenceVersion, 2);
  const input = one(entry.styleInputs.filter(i => i.id === element));
  const candidate = one(a.nodes.filter(n => n.authored?.id === element));
  let boundary, native, nativeAction;
  if (entry.family === 'chips') {
    boundary = proveChipPositionInspection(r, a);
    native = one(r.nodes.filter(n => n.attributes?.id === element));
    assert.equal(native.type, 'mat-chip-option'); assert.equal(candidate.authored.type, 'div');
    const cell = one(r.nodes.filter(n => n.parent === native.key && n.attributes.class?.split(/\s+/).includes('mdc-evolution-chip__cell')));
    nativeAction = one(r.nodes.filter(n => n.parent === cell.key && n.type === 'button'));
    assert.equal(nativeAction.attributes.role, 'option'); assert.equal(candidate.authored.role, 'option');
    assert.equal(r.styles[nativeAction.style].appearance, 'auto');
  } else {
    boundary = proveTabPanelWrapping(entry, input, r, a);
    native = one(r.nodes.filter(n => n.key === boundary.referenceNode));
    assert.equal(native.type, 'span'); assert.equal(candidate.authored.type, 'showcase.material:tab-panel');
  }
  const affects = key => /^(appearance|webkitappearance|mozappearance|all)$/.test(key.replaceAll('-', '').toLowerCase());
  for (const node of [native, ...(nativeAction ? [nativeAction] : [])]) {
    assert.deepEqual(Object.keys(node.inline ?? {}).filter(affects), []);
    assert.doesNotMatch(node.attributes.style ?? '', /(?:^|;)\s*(?:(?:-webkit-|-moz-)?appearance|all)\s*:/i);
    for (const rule of node.rules.map(i => r.rules[i])) assert.deepEqual(Object.keys(rule.declarations).filter(affects), []);
  }
  assert.equal(r.styles[native.style].appearance, 'none');
  assert.equal(Object.keys(input.reference).length, 89);
  for (const [key, value] of Object.entries(input.reference)) assert.equal(r.styles[native.style][key], value);
  assert.deepEqual(Object.keys(candidate.authored.style ?? {}).filter(affects), []);
  assert.doesNotMatch(candidate.authored.attributes?.style ?? '', /(?:^|;)\s*(?:(?:-webkit-|-moz-)?appearance|all)\s*:/i);
  assert.deepEqual(a.rules.filter(rule => rootInitialSelectorCanApply(rule.selector, candidate.authored))
    .flatMap(rule => Object.keys(rule).filter(affects)), []);
  for (const [stage, scalar] of [['resolvedStyle', 'astylar'], ['normalResolvedStyle', 'astylarNormalResolvedStyle'],
    ['interactionResolvedStyle', 'astylarInteractionResolvedStyle']]) {
    assert.deepEqual(candidate[stage], input[scalar]); assert.deepEqual(Object.keys(candidate[stage]).filter(affects), []);
  }
  const motion = native.rules.map(i => r.rules[i]).flatMap(rule => Object.entries(rule.declarations)
    .filter(([key]) => /^(animation|transition)/.test(key)).map(([key, value]) =>
      ({ selector: rule.selector, conditions: rule.conditions, active: rule.active, key, ...value })));
  return { case: keyOf(entry), element, referenceNode: native.key, astylarNode: candidate.key,
    referenceType: native.type, candidateType: candidate.authored.type, boundary, motion,
    ...(nativeAction ? { referenceActionNode: nativeAction.key, referenceActionAppearance: 'auto' } : {}),
    inputEquivalent: false, renderingEquivalent: false, candidateComputedAppearanceInferred: false,
    pluginAppearanceSupportProven: false, motionEquivalenceProven: false };
}

export function applyAppearanceOwnerBoundaries(rows, cases, inventory, normalize) {
  return [['chips', 'chip-0'], ['chips', 'chip-1'], ['tabs', 'tab-panel']].reduce((values, [family, element]) =>
    applyModalBoxReview(values, cases, inventory, normalize, { family, element, properties: ['appearance'],
      prove: (e, r, a) => proveAppearanceOwnerBoundary(e, r, a, element),
      classification: 'parity-harness-defect', attribution: 'reviewed-appearance-owner-boundary',
      owner: 'comparison appearance observation ownership; separate chip flattening and competing tab text renderer',
      justification: family === 'chips'
        ? 'The native measurement is a mat-chip-option non-widget host computing none; its nested role=option button computes auto. Candidate measurement is a flattened div with role=option, combining the host and action responsibilities without a nested native button. Existing full chip structure/selection evidence binds this owner mismatch. Appearance requests are absent, but native motion declarations are retained, not waived. The semantic role does not turn the div into a native button; do not infer its computed appearance or certify flattened chip paint/semantics.'
        : 'The measured native span computes none; candidate is a childless custom tab-panel plugin that owns a private text renderer, as established by the existing wrapping/ownership proof. This local observation mismatch is not an equivalent non-widget appearance comparison. Keep the plugin defect and motion obligations separate; no candidate computed appearance, plugin appearance support or shared-core fault is inferred.',
    }), rows);
}

export function validateAppearanceOwnerBoundaries(rows, originals, cases, inventory, normalize) {
  try {
    const select = values => values.filter(r => r.attribution === 'reviewed-appearance-owner-boundary');
    assert.deepEqual(select(rows), select(applyAppearanceOwnerBoundaries(originals, cases, inventory, normalize))); return [];
  } catch (error) { return [`appearance owner boundary lacks original inputs: ${error.message}`]; }
}

export function proveRangeAppearanceInitial(entry, r, a, element) {
  assert.equal(entry.family, 'slider'); assert.ok(['slider-start', 'slider-primary'].includes(element));
  const identity = proveRemainingControlOverflowInputs(entry, r, a, element);
  const native = one(r.nodes.filter(n => n.key === identity.referenceNode));
  const candidate = one(a.nodes.filter(n => n.key === identity.astylarNode));
  const affects = key => /^(appearance|webkitappearance|mozappearance|all)$/.test(key.replaceAll('-', '').toLowerCase()) || /^(animation|transition)/i.test(key);
  for (const raw of [native.attributes.style, candidate.authored.attributes?.style]) {
    assert.doesNotMatch(raw ?? '', /[\\/]/);
    assert.doesNotMatch(raw ?? '', /(?:^|;)\s*(?:(?:-webkit-|-moz-)?appearance|all|animation[^:]*|transition[^:]*)\s*:/i);
  }
  for (const style of [native.inline ?? {}, candidate.authored.style ?? {}, candidate.normalResolvedStyle,
    candidate.resolvedStyle, candidate.interactionResolvedStyle]) assert.deepEqual(Object.keys(style).filter(affects), []);
  for (const rule of native.rules.map(i => r.rules[i])) assert.deepEqual(Object.keys(rule.declarations).filter(affects), []);
  assert.deepEqual(a.rules.filter(rule => rootInitialSelectorCanApply(rule.selector, candidate.authored))
    .flatMap(rule => Object.keys(rule).filter(affects)), []);
  assert.equal(r.styles[native.style].appearance, 'auto');
  assert.equal(r.styles[native.style].opacity, '0');
  for (const stage of ['normalResolvedStyle', 'resolvedStyle', 'interactionResolvedStyle']) assert.equal(candidate[stage].opacity, '0');
  const source = 'src/app/services/dom/input/range.manager.ts';
  const sha256 = createHash('sha256').update(readFileSync(source, 'utf8').replaceAll('\r\n', '\n')).digest('hex');
  assert.equal(sha256, '5300fd18403ff659f4ef415df796f0e9ea0260e7c591004fa407fd99ec24b4db');
  return { case: keyOf(entry), element, ...identity, source: { file: source, sha256 },
    referenceAppearance: 'auto', candidateDeclaration: '<omitted>', originalOpacity: '0',
    initialRequestEquivalent: true, candidateComputedAppearanceInferred: false,
    inputEquivalent: false, renderingEquivalent: false,
    separateSupportGap: 'public reduction: explicit none changes native range paint but not core range paint' };
}

export function applyRangeAppearanceInitial(rows, cases, inventory, normalize) {
  return ['slider-start', 'slider-primary'].reduce((values, element) => applyModalBoxReview(values, cases, inventory, normalize, {
    family: 'slider', element, properties: ['appearance'], prove: (e, r, a) => proveRangeAppearanceInitial(e, r, a, element),
    classification: 'equivalent-representation', attribution: 'reviewed-range-appearance-initial-request',
    owner: 'none for omitted initial appearance; core owns separately demonstrated explicit none support gap',
    justification: 'Both original type=range owners omit appearance/reset/motion requests; native auto is the computed initial keyword and candidate local stages remain omitted. Both original controls request opacity zero. The root-package reduction at DPR 1/2 proves omitted versus explicit auto pixel equality within each renderer with opacity sensitivity, while independently exposing ignored explicit none in core. This classification covers the initial request only, not native-widget raster parity, core none support, hit testing, hidden-input composition or complete slider equivalence.',
  }), rows);
}

export function validateRangeAppearanceInitial(rows, originals, cases, inventory, normalize) {
  try {
    const select = values => values.filter(r => r.attribution === 'reviewed-range-appearance-initial-request');
    assert.deepEqual(select(rows), select(applyRangeAppearanceInitial(originals, cases, inventory, normalize))); return [];
  } catch (error) { return [`range initial appearance lacks original inputs: ${error.message}`]; }
}

const modalNonwidgetTypes = { 'dialog-actions': ['mat-dialog-actions', 'div'],
  'dialog-copy': ['mat-dialog-content', 'p'], 'dialog-panel': ['div', 'section'],
  'bottom-sheet-panel': ['mat-bottom-sheet-container', 'section'] };
const mappedNonwidgetAppearance = { 'bottom-sheet': ['bottom-sheet-overlay', 'bottom-sheet-panel'],
  dialog: ['dialog-actions', 'dialog-copy', 'dialog-panel'],
  'snack-bar': ['snack-bar-overlay', 'snack-bar-surface'], tooltip: ['tooltip-popup'] };
export function proveMappedNonwidgetAppearance(entry, r, a, element) {
  assert.ok(mappedNonwidgetAppearance[entry.family]?.includes(element));
  for (const tree of [r, a]) {
    assert.equal(tree.ruleEvidenceComplete, true); assert.deepEqual(tree.errors, []);
  }
  const input = one(entry.styleInputs.filter(i => i.id === element));
  const modal = Object.hasOwn(modalNonwidgetTypes, element);
  const mapping = modal ? proveModalPositionInspection(entry, r, a, element).mapping : resolveOriginAliasPair(entry, r, a, input);
  const gap = element.endsWith('-overlay');
  assert.equal(mapping.status, gap ? 'mapped-with-scalar-rule-gap' : 'mapped');
  assert.deepEqual(mapping.missingRules, gap ? [{ selector: '.cdk-global-overlay-wrapper',
    declarations: { 'z-index': { value: '1000', important: false } } }] : []);
  assert.deepEqual(mapping.extraRules, []);
  const native = one(r.nodes.filter(n => n.key === mapping.referenceNode));
  const candidate = one(a.nodes.filter(n => n.key === mapping.candidateNode));
  const [nativeType, candidateType] = modalNonwidgetTypes[element] ?? ['div', 'div'];
  assert.equal(native.type, nativeType); assert.equal(candidate.authored.type, candidateType);
  assert.equal(candidate.authored.inputType, undefined);
  const affects = key => /^(appearance|webkitappearance|mozappearance|all)$/.test(key.replaceAll('-', '').toLowerCase()) || /^(animation|transition)/i.test(key);
  for (const raw of [native.attributes.style, candidate.authored.attributes?.style]) {
    assert.doesNotMatch(raw ?? '', /[\\/]/);
    assert.doesNotMatch(raw ?? '', /(?:^|;)\s*(?:(?:-webkit-|-moz-)?appearance|all|animation[^:]*|transition[^:]*)\s*:/i);
  }
  for (const style of [native.inline ?? {}, candidate.authored.style ?? {}, candidate.normalResolvedStyle,
    candidate.resolvedStyle, candidate.interactionResolvedStyle]) assert.deepEqual(Object.keys(style).filter(affects), []);
  const motion = [];
  for (const rule of native.rules.map(i => r.rules[i])) {
    assert.ok(!rule.cssText.includes('\\'));
    const keys = Object.keys(rule.declarations).filter(affects);
    if (element === 'dialog-panel') {
      assert.ok(keys.every(key => key.startsWith('transition-')));
      motion.push(...keys.map(key => ({ selector: rule.selector, conditions: rule.conditions,
        active: rule.active, key, ...rule.declarations[key], cssText: rule.cssText })));
    } else assert.deepEqual(keys, []);
  }
  if (element === 'dialog-panel') {
    assert.equal(motion.length, 10);
    assert.deepEqual(motion.filter(d => d.selector === '.mat-mdc-dialog-surface').map(d => d.value), ['', '', '', '', '']);
    assert.deepEqual(motion.filter(d => d.selector === '._mat-animation-noopable .mat-mdc-dialog-surface')
      .map(d => [d.key, d.value]), [['transition-behavior', 'normal'], ['transition-duration', '0s'],
        ['transition-timing-function', 'ease'], ['transition-delay', '0s'], ['transition-property', 'none']]);
    assert.ok(motion.every(d => d.active && d.conditions.length === 0));
  }
  assert.deepEqual(a.rules.filter(rule => rootInitialSelectorCanApply(rule.selector, candidate.authored))
    .flatMap(rule => Object.keys(rule).filter(affects)), []);
  assert.equal(r.styles[native.style].appearance, 'none');
  return { case: keyOf(entry), element, mapping, referenceNode: native.key, astylarNode: candidate.key,
    referenceAppearance: 'none', candidateDeclaration: '<omitted>', initialRequestEquivalent: true,
    ...(modal ? { referenceType: nativeType, candidateType, motion, motionEquivalenceProven: false,
      nativeAppearanceProof: 'modal non-widget native appearance is invariant across mapped tags and noop transition context' } : {}),
    inputEquivalent: false, renderingEquivalent: false, ancestorClippingOrOverlayPlacementProven: false };
}

function bindNonwidgetAppearanceEvidence() {
  const proofFile = 'docs/material-appearance-input-audit.json';
  const bytes = readFileSync(proofFile, 'utf8').replaceAll('\r\n', '\n');
  const publicProofSha256 = createHash('sha256').update(bytes).digest('hex');
  assert.equal(publicProofSha256, 'a6cb4ca97c8428402c738af53808f5ff1a931eb07c2b0ea7595c512b24ecebcb');
  const evidence = JSON.parse(bytes);
  // Reuse the checked public non-widget reduction only while all seven of its
  // declared source/package dependencies match, rather than refreshing hashes.
  assert.equal(evidence.sourceFingerprints.length, 7);
  for (const source of evidence.sourceFingerprints) assert.equal(createHash('sha256')
    .update(readFileSync(source.file, 'utf8').replaceAll('\r\n', '\n')).digest('hex'), source.sha256, source.file);
  return { file: proofFile, sha256: publicProofSha256, dependencies: evidence.sourceFingerprints };
}

export function applyMappedNonwidgetAppearance(rows, cases, inventory, normalize) {
  if (!rows.some(r => r.attribution === 'unresolved' && r.property === 'appearance' &&
    mappedNonwidgetAppearance[r.family]?.includes(r.element))) return rows;
  const publicProof = bindNonwidgetAppearanceEvidence();
  return Object.entries(mappedNonwidgetAppearance).reduce((values, [family, elements]) => elements.reduce((items, element) =>
    applyModalBoxReview(items, cases, inventory, normalize, { family, element, properties: ['appearance'],
      prove: (e, r, a) => ({ ...proveMappedNonwidgetAppearance(e, r, a, element), publicProof }),
      classification: 'equivalent-representation', attribution: 'reviewed-mapped-nonwidget-appearance-initial-request',
      owner: 'none for initial non-widget appearance; retain independent overlay ownership findings',
      justification: Object.hasOwn(modalNonwidgetTypes, element)
        ? 'Original mapped owners are non-widgets with omitted appearance/reset requests, despite separately documented structural/layout differences. Native mapped-tag tests at DPR 1/2 retain pixels across omitted/auto/none with content and noop transition context; unchanged public-package evidence covers the candidate div/p/section initial request. Original dialog transition declarations, including empty CSSOM expansions, remain recorded and are not motion-parity evidence. This classifies only the initial appearance request, never candidate computed style, complete modal input equivalence or final rendering.'
        : 'The independently mapped native and candidate owners are div non-widgets. Complete own authoring, rules and candidate stages omit appearance/reset/motion inputs; native computed none is an initial-value observation, not missing candidate authoring. The existing public non-widget proof is reused only with unchanged source/package fingerprints. Original overlay z-index scalar-rule gaps remain recorded. No candidate computed value, complete input equivalence, placement, clipping, focus or final raster parity is inferred.',
    }), values), rows);
}

export function validateMappedNonwidgetAppearance(rows, originals, cases, inventory, normalize) {
  try {
    const select = values => values.filter(r => r.attribution === 'reviewed-mapped-nonwidget-appearance-initial-request');
    assert.deepEqual(select(rows), select(applyMappedNonwidgetAppearance(originals, cases, inventory, normalize))); return [];
  } catch (error) { return [`mapped non-widget appearance lacks original inputs: ${error.message}`]; }
}

const focusShadowFamilies = ['core', 'button', 'menu', 'bottom-sheet', 'dialog', 'snack-bar', 'tooltip'];
const transparentFocusShadow = '0 0 0 1px rgba(0,0,0,0)';
export function proveCardShadowSyntax(entry, r, a, normalize) {
  assert.equal(entry.family, 'card');
  for (const tree of [r, a]) {
    assert.equal(tree.ruleEvidenceComplete, true); assert.deepEqual(tree.errors, []);
  }
  assert.equal(a.resolvedStyleSource, 'core-style-inspection'); assert.equal(a.resolvedStyleEvidenceVersion, 2);
  const native = one(r.nodes.filter(n => n.attributes?.id === 'card-primary'));
  const candidate = one(a.nodes.filter(n => n.authored?.id === 'card-primary'));
  assert.equal(native.type, 'mat-card'); assert.equal(candidate.authored.type, 'div');
  const affects = key => ['boxshadow', 'all'].includes(key.replaceAll('-', '').toLowerCase());
  for (const style of [native.inline ?? {}, candidate.authored.style ?? {}]) assert.deepEqual(Object.keys(style).filter(affects), []);
  for (const raw of [native.attributes.style, candidate.authored.attributes?.style])
    assert.doesNotMatch(raw ?? '', /(?:^|;)\s*(?:box-shadow|all)\s*:/i);
  const requests = native.rules.map(i => r.rules[i]).filter(rule => rule.active).flatMap(rule =>
    Object.entries(rule.declarations).filter(([key]) => affects(key)).map(([key, value]) =>
      ({ selector: rule.selector, conditions: rule.conditions, key, ...value })));
  assert.deepEqual(requests, [{ selector: '.mat-mdc-card', conditions: [], key: 'box-shadow',
    value: 'var(--mat-card-elevated-container-elevation, var(--mat-sys-level1))', important: false }]);
  const expected = '0 2px 1px -1px rgba(0,0,0,0.2),0 1px 1px 0 rgba(0,0,0,0.14),0 1px 3px 0 rgba(0,0,0,0.12)';
  const candidateRequests = a.rules.filter(rule => rootInitialSelectorCanApply(rule.selector, candidate.authored))
    .flatMap(rule => Object.entries(rule).filter(([key]) => affects(key)).map(([key, value]) =>
      ({ selector: rule.selector, key, value: normalize({ [key]: value })[key] })));
  assert.deepEqual(candidateRequests, [{ selector: '.material-card', key: 'boxShadow', value: expected }]);
  const input = one(entry.styleInputs.filter(i => i.id === 'card-primary'));
  assert.equal(input.reference.boxShadow, r.styles[native.style].boxShadow);
  assert.equal(normalize(input.reference).boxShadow,
    'rgba(0,0,0,0.2) 0 2px 1px -1px,rgba(0,0,0,0.14) 0 1px 1px 0,rgba(0,0,0,0.12) 0 1px 3px 0');
  for (const [stage, scalar] of [['resolvedStyle', 'astylar'], ['normalResolvedStyle', 'astylarNormalResolvedStyle'],
    ['interactionResolvedStyle', 'astylarInteractionResolvedStyle']]) {
    assert.deepEqual(candidate[stage], input[scalar]); assert.equal(normalize(candidate[stage]).boxShadow, expected);
  }
  const parserSha256 = createHash('sha256').update(readFileSync('src/app/services/dom/elements/box-shadow.ts', 'utf8').replaceAll('\r\n', '\n')).digest('hex');
  assert.equal(parserSha256, 'f8e30403ce764f401524f07900c50c9f1094b72b0da8b7d4334d787897247e8b');
  return { case: keyOf(entry), referenceNode: native.key, astylarNode: candidate.key, requests, candidateRequests,
    parserSha256, equivalentShadowRepresentation: true, inputEquivalent: false, renderingEquivalent: false,
    uncapturedThemeTokenEquivalenceProven: false, webglShadowRasterProven: false };
}

export function applyCardShadowSyntax(rows, cases, inventory, normalize) {
  return applyModalBoxReview(rows, cases, inventory, normalize, {
    family: 'card', element: 'card-primary', properties: ['boxShadow'],
    prove: (e, r, a) => proveCardShadowSyntax(e, r, a, normalize),
    classification: 'equivalent-representation', attribution: 'reviewed-card-shadow-layer-serialization',
    owner: 'none for captured shadow serialization; retain independent paint and token investigations',
    justification: 'All captured native token results and candidate authored/live requests retain the same three ordered layers with only color-first versus color-last syntax. The pinned core parser and DPR 1/2 browser pixel sensitivity test establish syntax equivalence. This does not certify WebGL shadow pixels, whole-card input equivalence or token behavior outside the captured themes.',
  });
}

export function validateCardShadowSyntax(rows, originals, cases, inventory, normalize) {
  try {
    const select = values => values.filter(r => r.attribution === 'reviewed-card-shadow-layer-serialization');
    assert.deepEqual(select(rows), select(applyCardShadowSyntax(originals, cases, inventory, normalize))); return [];
  } catch (error) { return [`card shadow syntax lacks original inputs: ${error.message}`]; }
}

export function proveFocusShadowSubstitution(entry, r, a) {
  assert.ok(focusShadowFamilies.includes(entry.family));
  const element = `${entry.family}-primary`;
  for (const tree of [r, a]) {
    assert.equal(tree.ruleEvidenceComplete, true); assert.deepEqual(tree.errors, []);
  }
  assert.equal(a.resolvedStyleSource, 'core-style-inspection');
  assert.equal(a.resolvedStyleEvidenceVersion, 2);
  const native = one(r.nodes.filter(n => n.attributes?.id === element));
  const candidate = one(a.nodes.filter(n => n.authored?.id === element));
  assert.equal(native.type, 'button'); assert.equal(candidate.authored.type, 'button');
  assert.ok(candidate.authored.class.split(/\s+/).includes('material-button'));
  const affects = key => /^(boxshadow|outline.*|all)$/.test(key.replaceAll('-', '').toLowerCase());
  assert.deepEqual(Object.keys(native.inline ?? {}).filter(affects), []);
  for (const raw of [native.attributes.style, candidate.authored.attributes?.style])
    assert.doesNotMatch(raw ?? '', /(?:^|;)\s*(?:box-shadow|outline(?:-[a-z]+)?|all)\s*:/i);
  assert.deepEqual(Object.keys(candidate.authored.style ?? {}).filter(affects), []);
  const referenceRequests = native.rules.map(i => r.rules[i]).filter(rule => rule.active).flatMap(rule => {
    assert.ok(!rule.cssText.includes('\\'));
    return Object.entries(rule.declarations).filter(([key]) => affects(key))
      .map(([key, value]) => ({ selector: rule.selector, conditions: rule.conditions, key, ...value }));
  });
  const selectors = [...new Set(referenceRequests.map(r => r.selector))];
  assert.ok(selectors.length === 1 || selectors.length === 2);
  assert.deepEqual(selectors, selectors.length === 1 ? ['.mdc-button'] : ['.mdc-button', '.mdc-button:active']);
  assert.deepEqual(referenceRequests, selectors.flatMap(selector =>
    [['outline-color', 'initial'], ['outline-style', 'none'], ['outline-width', 'initial']]
      .map(([key, value]) => ({ selector, conditions: [], key, value, important: false }))));
  const candidateRequests = a.rules.filter(rule => rootInitialSelectorCanApply(rule.selector, candidate.authored))
    .flatMap(rule => Object.entries(rule).filter(([key]) => affects(key))
      .map(([key, value]) => ({ selector: rule.selector, key, value })));
  assert.deepEqual(candidateRequests, [0, 1].map(() =>
    ({ selector: '.material-button:focus', key: 'boxShadow', value: transparentFocusShadow })));
  const input = one(entry.styleInputs.filter(i => i.id === element));
  assert.equal(input.astylarResolvedStyleEvidenceVersion, 2);
  assert.equal(r.styles[native.style].boxShadow, 'none');
  assert.equal(input.reference.boxShadow, 'none');
  for (const [stage, scalar] of [['resolvedStyle', 'astylar'], ['normalResolvedStyle', 'astylarNormalResolvedStyle'],
    ['interactionResolvedStyle', 'astylarInteractionResolvedStyle']]) {
    assert.deepEqual(candidate[stage], input[scalar]);
    assert.equal(candidate[stage].boxShadow, stage === 'normalResolvedStyle' ? undefined : transparentFocusShadow);
    assert.deepEqual(Object.keys(candidate[stage]).filter(k => /^outline/i.test(k)), []);
  }
  return { case: keyOf(entry), element, referenceNode: native.key, astylarNode: candidate.key,
    referenceRequests, candidateRequests, normalShadowOmitted: true, effectiveShadow: transparentFocusShadow,
    firstDivergence: 'native outline reset replaced with candidate transparent focus-shadow request',
    inputEquivalent: false, renderingEquivalent: false, originalFocusTimingProven: false,
    originalRasterCauseProven: false };
}

export function applyFocusShadowSubstitutions(rows, cases, inventory, normalize) {
  return rows.map(row => {
    if (row.attribution !== 'unresolved' || row.property !== 'boxShadow' ||
      !focusShadowFamilies.includes(row.family) || row.element !== `${row.family}-primary`) return row;
    assert.equal(row.reference, 'none'); assert.equal(row.astylar, transparentFocusShadow);
    const members = cases.filter(e => e.family === row.family && e.styleInputs.some(i => i.id === row.element &&
      normalize(i.reference).boxShadow === row.reference && normalize(i.astylar).boxShadow === row.astylar));
    const keys = members.map(keyOf);
    assert.equal(keys.length, row.occurrences); assert.equal(new Set(keys).size, keys.length);
    assert.deepEqual(keys.slice(0, 12), row.cases);
    assert.deepEqual([...new Set(members.map(e => e.state ?? 'static'))], row.states);
    const observations = members.map(e => proveFocusShadowSubstitution(e, ...modalInventoryTrees(inventory, keyOf(e))));
    return { ...row, classification: 'application-plugin-authoring-defect',
      attribution: 'reviewed-focus-outline-shadow-substitution',
      recommendedOwner: 'comparison focus authoring and core outline/fallback contract',
      justification: 'The original native button explicitly resets outline and has no shadow request; the candidate omits outline and authors transparent focus shadows. Normal candidate style omits the shadow while both live stages retain it. A public reduction demonstrates that this shadow disables core fallback focus paint, unlike native shadow behavior. This is unequal input, not harmless no-paint serialization. Original focus timing, complete focus presentation and original raster causation remain unproved.',
      reviewedCases: keys, reviewEvidence: { originalRowSha256: digest(row), observations,
        inputEquivalent: false, renderingEquivalent: false, originalRasterCauseProven: false } };
  });
}

export function validateFocusShadowSubstitutions(rows, originals, cases, inventory, normalize) {
  try {
    const select = values => values.filter(r => r.attribution === 'reviewed-focus-outline-shadow-substitution');
    assert.deepEqual(select(rows), select(applyFocusShadowSubstitutions(originals, cases, inventory, normalize)));
    return [];
  } catch (error) { return [`focus outline/shadow substitution lacks original inputs: ${error.message}`]; }
}

const omittedPaintRequests = {
  badge: { element: 'badge-count', property: 'textOverflow', css: 'text-overflow',
    selector: '.mat-badge-content', value: 'ellipsis' },
  'bottom-sheet': { element: 'bottom-sheet-panel', property: 'boxShadow', css: 'box-shadow',
    selector: '.mat-bottom-sheet-container',
    value: 'rgba(0, 0, 0, 0.2) 0px 8px 10px -5px, rgba(0, 0, 0, 0.14) 0px 16px 24px 2px, rgba(0, 0, 0, 0.12) 0px 6px 30px 5px' },
};

export function proveOmittedOwnerPaintRequest(entry, r, a) {
  const specification = omittedPaintRequests[entry.family]; assert.ok(specification);
  for (const tree of [r, a]) {
    assert.equal(tree.ruleEvidenceComplete, true); assert.deepEqual(tree.errors, []);
  }
  assert.equal(a.resolvedStyleSource, 'core-style-inspection');
  assert.equal(a.resolvedStyleEvidenceVersion, 2);
  const { element, property, css, selector, value } = specification;
  const mapping = entry.family === 'badge' ? proveControlClippingRequests(entry, r, a, element)
    : proveBottomSheetPanelPaint(entry, r, a);
  const reference = one(r.nodes.filter(n => n.key === mapping.referenceNode));
  const candidate = one(a.nodes.filter(n => n.key === mapping.astylarNode));
  const relevant = key => [property.toLowerCase(), 'all'].includes(key.replaceAll('-', '').toLowerCase());
  assert.deepEqual(Object.keys(reference.inline ?? {}).filter(relevant), []);
  const inlineRequest = new RegExp(`(?:^|;)\\s*(?:${css}|all)\\s*:`, 'i');
  assert.doesNotMatch(reference.attributes.style ?? '', inlineRequest);
  assert.doesNotMatch(candidate.authored.attributes?.style ?? '', inlineRequest);
  const requests = reference.rules.map(i => r.rules[i]).filter(rule => rule.active).flatMap(rule => {
    assert.ok(!rule.cssText.includes('\\'));
    return Object.entries(rule.declarations).filter(([key]) => relevant(key))
      .map(([key, declaration]) => ({ selector: rule.selector, conditions: rule.conditions, key, ...declaration }));
  });
  assert.deepEqual(requests, [{ selector, conditions: [], key: css, value, important: false }]);
  assert.equal(r.styles[reference.style][property], value);
  for (const style of [candidate.authored.style ?? {}, candidate.normalResolvedStyle,
    candidate.resolvedStyle, candidate.interactionResolvedStyle]) {
    assert.ok(style && typeof style === 'object');
    assert.deepEqual(Object.keys(style).filter(relevant), []);
  }
  assert.deepEqual(a.rules.filter(rule => rootInitialSelectorCanApply(rule.selector, candidate.authored))
    .flatMap(rule => Object.keys(rule).filter(relevant)), []);
  const input = one(entry.styleInputs.filter(i => i.id === element));
  assert.equal(input.reference[property], value);
  for (const [field, stage] of [['astylar', 'resolvedStyle'], ['astylarNormalResolvedStyle', 'normalResolvedStyle'],
    ['astylarInteractionResolvedStyle', 'interactionResolvedStyle']]) assert.deepEqual(input[field], candidate[stage]);
  return { element, referenceNode: reference.key, astylarNode: candidate.key, mapping,
    referenceRequests: requests, candidateRequests: [], inputEquivalent: false, renderingEquivalent: false,
    firstDivergence: 'explicit native owner paint request omitted from candidate authoring',
    coreDefectProven: false, originalRasterCauseProven: false };
}

export function applyOmittedOwnerPaintRequests(rows, cases, inventory, normalize) {
  return Object.entries(omittedPaintRequests).reduce((values, [family, { element, property }]) =>
    applyModalBoxReview(values, cases, inventory, normalize, { family, element, properties: [property],
      prove: proveOmittedOwnerPaintRequest, attribution: 'reviewed-owner-paint-request-omission',
      owner: 'showcase badge clipping and bottom-sheet elevation authoring',
      justification: 'The original native owner explicitly requests this paint property; candidate authoring, potentially applicable rules and all three inspected local stages omit it. Existing owner-mapping evidence is retained. This is unequal input before rendering, not evidence that core ignored an equivalent request. Actual truncation, shadow pixels and the cause of the original visible symptom remain unproved.',
    }), rows);
}

export function validateOmittedOwnerPaintRequests(rows, originalRows, cases, inventory, normalize) {
  try {
    const select = values => values.filter(r => r.attribution === 'reviewed-owner-paint-request-omission');
    assert.deepEqual(select(rows), select(applyOmittedOwnerPaintRequests(originalRows, cases, inventory, normalize)));
    return [];
  } catch (error) { return [`omitted owner paint requests lack original evidence: ${error.message}`]; }
}

export function collectPaintReviewSources() {
  const buttons = collectButtonPaintAllStates(), disabled = collectDisabledLabelColorStages();
  assert.deepEqual(buttons, JSON.parse(readFileSync('docs/material-button-paint-all-states.json')));
  assert.deepEqual(disabled, JSON.parse(readFileSync('docs/material-disabled-label-color-stages.json')));
  assert.equal(createHash('sha256').update(readFileSync('artifacts/material-parity/range-background-default-public-5ee5ae4.log')).digest('hex'),
    '0b44bb9b05ecb484532407f49dfd6f35b1d57e9920ec09402548182f6d629560');
  return { buttons, disabled };
}

export function isPaintReviewRow(row) {
  if (!['color', 'backgroundColor'].includes(row.property)) return false;
  return [overlayTriggerPaintAttribution, controlStatePaintAttribution, cardSurfacePaintAttribution,
    opaqueSurfacePaintAttribution, ...Object.values(specialPaintDefinitions).map(d => d.attribution),
    'reviewed-disabled-component-opaque-ink-input', 'reviewed-disabled-choice-label-ink-input',
    'reviewed-stepper-text-input'].includes(row.attribution);
}

export function applyPaintReviews(rows, cases, inventory, retained, normalize, sources) {
  return applyStepperLabelColorReview(applyDisabledLabelColorReview(applyControlStatePaintReview(
    applyOverlayTriggerPaintReview(rows, sources.buttons, normalize), cases, inventory, normalize),
    sources.disabled), cases, retained, normalize);
}

export function validatePaintReviews(rows, originalRows, cases, inventory, retained, normalize, sources) {
  try {
    const persisted = value => JSON.parse(JSON.stringify(value));
    const expected = applyPaintReviews(originalRows, cases, inventory, retained, normalize, sources).filter(isPaintReviewRow);
    assert.deepEqual(persisted(rows.filter(isPaintReviewRow)), persisted(expected));
    return [];
  } catch (error) { return [`paint review evidence does not replay: ${error.message}`]; }
}

export function applyStepperLabelColorReview(rows, cases, retained, normalize) {
  return rows.map(row => {
    if (row.attribution !== 'unresolved' || row.family !== 'stepper' || row.property !== 'color' ||
        !['step-details-text', 'step-review-text'].includes(row.element)) return row;
    const observations = retained.differences.filter(p => p.family === row.family && p.element === row.element &&
      p.property === 'color' && p.attribution === 'reviewed-stepper-text-input');
    const keys = observations.map(p => p.case);
    assert.equal(keys.length, row.occurrences); assert.equal(new Set(keys).size, keys.length);
    assert.deepEqual(keys.slice(0, 12), row.cases); assert.equal(row.astylar, undefined);
    const members = observations.map(p => {
      const entry = one(cases.filter(e => keyOf(e) === p.case));
      const input = one(entry.styleInputs.filter(i => i.id === row.element));
      assert.equal(normalize(input.reference).color, p.values.reference);
      assert.equal(p.values.reference, row.reference);
      for (const stage of ['astylar', 'astylarNormalResolvedStyle', 'astylarInteractionResolvedStyle'])
        assert.equal(normalize(input[stage]).color, undefined);
      assert.equal(p.classification, 'application-plugin-authoring-defect');
      assert.equal(p.inputEquivalent, false); assert.equal(p.currentPseudoStatePaintVerified, false);
      return entry;
    });
    assert.deepEqual([...new Set(members.map(e => e.state ?? 'static'))], row.states);
    return { ...row, classification: 'application-plugin-authoring-defect', attribution: 'reviewed-stepper-text-input',
      recommendedOwner: 'showcase stepper typography and token inheritance',
      justification: 'The existing retained-text proof traces the native label token through its wrappers while candidate labels omit local color and retain page ink. Preserve omission, authored ancestry and retained values separately; this is unequal input, not a core color-conversion or current pseudo-state paint claim.',
      reviewedCases: keys, reviewEvidence: { originalRowSha256: digest(row), observations,
        inputEquivalent: false, renderingEquivalent: false, localOmissionPreserved: true } };
  });
}

// Caller supplies the independently replayed disabled-label stage collector,
// not inferred inherited values or classifications from the proposed export.
export function applyDisabledLabelColorReview(rows, evidence) {
  assert.deepEqual(evidence.counts, { groups: 8, cases: 24, observations: 32, ownColorOmitted: 24 });
  assert.equal(evidence.observations.length, 32);
  return rows.map(row => {
    if (row.attribution !== 'unresolved' || row.property !== 'color' ||
        !['checkbox', 'radio', 'expansion'].includes(row.family) ||
        row.states.length !== 1 || row.states[0] !== 'disabled') return row;
    const observations = evidence.observations.filter(o => o.family === row.family && o.element === row.element &&
      o.reference === row.reference && (o.candidateLocal ?? undefined) === row.astylar);
    const keys = observations.map(o => o.case);
    assert.equal(keys.length, row.occurrences); assert.equal(new Set(keys).size, keys.length);
    assert.deepEqual(keys.slice(0, 12), row.cases);
    for (const o of observations) {
      assert.equal(o.classification, 'application-plugin-authoring-defect');
      assert.equal(o.inputEquivalent, false); assert.equal(o.renderingEquivalent, false);
      assert.equal(o.localOmissionPreserved, true);
      assert.notEqual(o.candidateRetained, o.reference);
    }
    assert.ok(observations.length);
    const first = observations[0];
    assert.ok(observations.every(o => o.attribution === first.attribution));
    return { ...row, classification: first.classification, attribution: first.attribution,
      recommendedOwner: first.recommendedOwner,
      justification: 'The existing source-bound retained-style proof identifies unequal disabled-label ink authoring. Join its exact precise-color observations without replacing omitted local declarations with inherited values. This is not local/computed style or final rendering equivalence.',
      reviewedCases: keys, reviewEvidence: { originalRowSha256: digest(row), observations,
        capture: evidence.capture, transition: evidence.transition,
        inputEquivalent: false, renderingEquivalent: false, localOmissionPreserved: true } };
  });
}
const targets = { tabs: ['tab-overview', 'tab-activity'], card: ['card-open', 'card-primary'], dialog: ['dialog-cancel'],
  toolbar: ['toolbar-action'], 'grid-list': ['grid-tile-one', 'grid-tile-two'], 'button-toggle': ['button-toggle-primary', 'button-toggle-two'],
  'bottom-sheet': ['bottom-sheet-dismiss', 'bottom-sheet-overlay'], divider: ['divider-primary'], slider: ['slider-start', 'slider-primary'] };
export const controlStatePaintAttribution = 'reviewed-control-state-layer-substitution';
export const cardSurfacePaintAttribution = 'reviewed-card-surface-token-substitution';
export const opaqueSurfacePaintAttribution = 'reviewed-opaque-surface-fill-substitution';
export const specialPaintDefinitions = Object.freeze({
  'slider-start': { attribution: 'reviewed-disabled-range-background-default', classification: 'intentional-documented-limitation',
    justification: 'Both disabled range owners omit background authoring; native computes transparent while all candidate style stages retain generic input white. The public equal-input reduction isolates disabled-state default selection, with enabled and explicit-transparent controls passing. This default-policy limitation is not same-input rendering parity. Original input opacity is zero; no visible thumb/ring, layout or drag diagnosis follows.' },
  'slider-primary': { attribution: 'reviewed-disabled-range-background-default', classification: 'intentional-documented-limitation',
    justification: 'Both disabled range owners omit background authoring; native computes transparent while all candidate style stages retain generic input white. The public equal-input reduction isolates disabled-state default selection, with enabled and explicit-transparent controls passing. This default-policy limitation is not same-input rendering parity. Original input opacity is zero; no visible thumb/ring, layout or drag diagnosis follows.' },
  'button-toggle-two': { attribution: 'reviewed-selected-toggle-paint-layer-substitution', classification: 'application-plugin-authoring-defect',
    justification: 'The native selected host keeps its base color with a separate theme-colored .08 focus overlay and captured ripple descendants. Candidate state rules replace the host background using different fixed blend colors. Preserve the captured layers and profile-dependent foreground; neither equal composition nor ripple timing follows from matching sampled fills.' },
  'bottom-sheet-dismiss': { attribution: 'reviewed-sheet-unconditional-focus-fill', classification: 'application-plugin-authoring-defect',
    justification: 'The reference action has a separate .12 focus layer; the candidate substitutes an unconditional opaque fill, including its normal style. Preserve this authoring difference separately from the focus-lifecycle defect and do not equate final pixels.' },
  'bottom-sheet-overlay': { attribution: 'reviewed-sheet-backdrop-measurement-owner', classification: 'parity-harness-defect',
    justification: 'The native measurement identifies a transparent wrapper rather than its separate dim backdrop. Candidate wrapper and backdrop are merged. Matching backdrop RGBA does not establish equivalent structure, stacking, hit testing, lifecycle or rendering; the native scalar rule gap remains explicit.' },
  'divider-primary': { attribution: 'reviewed-divider-border-fill-substitution', classification: 'application-plugin-authoring-defect',
    justification: 'The existing flow proof identifies a native zero-height block with a 1px top border, replaced by an absolute 1px candidate background strip. Both paint model and requested color differ; this is not an equivalent border-to-fill transformation or a new core diagnosis.' },
});

export function proveControlStatePaint(entry, input, reference, candidate, normalize) {
  assert.ok(targets[entry.family]?.includes(input.id));
  const ast = one(candidate.nodes.filter(n => n.authored?.id === input.id));
  let native, identity;
  if (input.id === 'dialog-cancel' || entry.family === 'bottom-sheet') {
    identity = resolveOriginAliasPair(entry, reference, candidate, input);
    assert.equal(identity.status, input.id === 'bottom-sheet-overlay' ? 'mapped-with-scalar-rule-gap' : 'mapped');
    assert.deepEqual(identity.missingRules, input.id === 'bottom-sheet-overlay' ? [{ selector: '.cdk-global-overlay-wrapper',
      declarations: { 'z-index': { value: '1000', important: false } } }] : []);
    assert.deepEqual(identity.extraRules, []);
    native = one(reference.nodes.filter(n => n.key === identity.referenceNode));
  } else native = one(reference.nodes.filter(n => n.attributes?.id === input.id));
  for (const [key, value] of Object.entries(input.reference)) assert.equal(reference.styles[native.style][key], value);
  for (const [stage, scalar] of [['resolvedStyle', 'astylar'], ['normalResolvedStyle', 'astylarNormalResolvedStyle'],
    ['interactionResolvedStyle', 'astylarInteractionResolvedStyle']]) assert.deepEqual(ast[stage], input[scalar]);
  const candidateAuthoredRuleProjectionGaps = [];
  for (const rule of input.astylarAuthored) {
    const original = candidate.rules[rule.index]; assert.equal(original.selector, rule.selector);
    for (const [key, value] of Object.entries(rule.declarations)) assert.deepEqual(original[key], value);
    const extra = Object.fromEntries(Object.entries(original).filter(([key]) => key !== 'selector' && !Object.hasOwn(rule.declarations, key)));
    if (Object.keys(extra).length) {
      assert.equal(input.id, 'toolbar-action'); assert.equal(rule.declarations.width, '64px');
      assert.deepEqual(extra, { mediaMaxWidth: '500px' });
      candidateAuthoredRuleProjectionGaps.push({ index: rule.index, extra });
    }
  }
  const base = { case: keyOf(entry), element: input.id, referenceNode: native.key, astylarNode: ast.key,
    identity, candidateAuthoredRuleProjectionGaps, inputEquivalent: false, renderingEquivalent: false, rendererCauseProven: false };
  if (entry.family === 'slider') {
    assert.equal(entry.state, 'disabled');
    assert.equal(native.type, 'input'); assert.equal(native.attributes.type, 'range');
    assert.ok(Object.hasOwn(native.attributes, 'disabled'));
    assert.equal(ast.authored.type, 'input'); assert.equal(ast.authored.inputType, 'range');
    assert.equal(ast.authored.disabled, true);
    const affects = key => /^(background|all$|animation|transition)/i.test(key);
    assert.deepEqual(Object.keys(native.inline ?? {}).filter(affects), []);
    for (const index of native.rules) assert.deepEqual(Object.keys(reference.rules[index].declarations).filter(affects), []);
    for (const rule of input.astylarAuthored) assert.deepEqual(Object.keys(rule.declarations).filter(affects), []);
    assert.equal(reference.styles[native.style].backgroundColor, 'rgba(0, 0, 0, 0)');
    assert.equal(reference.styles[native.style].opacity, '0');
    for (const stage of ['normalResolvedStyle', 'resolvedStyle', 'interactionResolvedStyle']) {
      assert.equal(ast[stage].background, '#ffffff'); assert.equal(ast[stage].opacity, '0');
    }
    return { ...base, backgroundAuthoringEquivalent: true, defaultStageDivergence: true,
      originalInputLayersInvisible: true, visibleThumbCauseProven: false,
      publicReduction: 'examples/material-showcase/src/app/range-background-default-audit.spec.ts',
      publicReductionCommit: '93cbe54',
      publicReductionLogSha256: '0b44bb9b05ecb484532407f49dfd6f35b1d57e9920ec09402548182f6d629560',
      defaultOwner: 'src/app/config/browser-defaults.ts; src/app/services/dom/style-defaults.service.ts' };
  }
  if (input.id === 'divider-primary') {
    const flow = proveFlowPositionSubstitution(reference, candidate, input.id);
    assert.equal(reference.styles[native.style].backgroundColor, 'rgba(0, 0, 0, 0)');
    assert.equal(reference.styles[native.style].borderTopColor, 'rgb(123, 117, 127)');
    const nativeRules = native.rules.map(i => reference.rules[i]);
    assert.ok(nativeRules.some(r => r.cssText.includes('var(--mat-divider-color, var(--mat-sys-outline))')));
    const request = one(candidate.rules.filter(r => r.selector === '.divider'));
    assert.equal(request.background, '#cac4d0');
    for (const stage of ['normalResolvedStyle', 'resolvedStyle', 'interactionResolvedStyle'])
      assert.equal(ast[stage].background, '#cac4d0');
    return { ...base, flow, nativePaintRules: nativeRules, candidatePaintRequest: request };
  }
  if (entry.family === 'bottom-sheet') {
    assert.equal(reference.styles[native.style].backgroundColor, 'rgba(0, 0, 0, 0)');
    const overlay = input.id === 'bottom-sheet-overlay';
    const request = one(candidate.rules.filter(r => r.selector === (overlay ? '.modal-overlay' : '#bottom-sheet-dismiss')));
    for (const stage of ['normalResolvedStyle', 'resolvedStyle', 'interactionResolvedStyle'])
      assert.equal(normalize(ast[stage]).backgroundColor, normalize(request).backgroundColor);
    if (overlay) {
      const backdrop = one(reference.nodes.filter(n => n.parent === native.parent &&
        n.attributes?.class?.split(/\s+/).includes('cdk-overlay-backdrop')));
      assert.equal(reference.styles[backdrop.style].backgroundColor, 'rgba(0, 0, 0, 0.32)');
      assert.equal(reference.styles[backdrop.style].opacity, '1');
      assert.equal(normalize(request).backgroundColor, normalize(reference.styles[backdrop.style]).backgroundColor);
      return { ...base, nativeBackdrop: backdrop.key, nativeBackdropStyle: reference.styles[backdrop.style],
        candidatePaintRequest: request, compositionEquivalent: false };
    }
    const pseudo = one(native.pseudoElements.filter(p => p.pseudo === '::before'));
    assert.equal(pseudo.generated, true);
    const paint = reference.styles[pseudo.style];
    assert.equal(paint.backgroundColor, 'rgb(29, 27, 30)'); assert.equal(paint.opacity, '0.12');
    assert.ok(['#e6e1e5', '#312f35'].includes(request.background));
    assert.equal(candidate.nodes.filter(n => n.key.startsWith(ast.key + '/')).length, 0);
    return { ...base, nativeLayer: native.key, nativeLayerOpacity: paint.opacity,
      nativePseudoRules: pseudo.rules.map(i => reference.rules[i]), candidatePaintRequest: request,
      candidateFillUnconditional: true, focusLifecycleCauseProven: false };
  }
  if (input.id === 'button-toggle-two') {
    assert.equal(native.type, 'mat-button-toggle');
    assert.equal(reference.styles[native.style].backgroundColor, 'rgb(234, 222, 247)');
    assert.equal(ast.normalResolvedStyle.background, '#eadef7');
    const descendants = reference.nodes.filter(n => n.key.startsWith(native.key + '/'));
    const layer = one(descendants.filter(n => n.attributes?.class?.split(/\s+/).includes('mat-button-toggle-focus-overlay')));
    const paint = reference.styles[layer.style];
    assert.equal(paint.opacity, '0.08');
    assert.ok(['rgb(29, 27, 32)', 'rgb(230, 225, 229)'].includes(paint.backgroundColor));
    const rules = candidate.rules.filter(r => ['.button-toggle-option.selected:hover', '.button-toggle-option.selected:active'].includes(r.selector));
    assert.deepEqual(rules.map(r => [r.selector, r.background]), [
      ['.button-toggle-option.selected:hover', '#ddd2ea'], ['.button-toggle-option.selected:active', '#d7cbe4']]);
    const effective = normalize(ast.resolvedStyle).backgroundColor;
    assert.equal(effective, normalize(ast.interactionResolvedStyle).backgroundColor);
    const matching = rules.filter(r => normalize(r).backgroundColor === effective); assert.equal(matching.length, 1);
    const candidateDescendants = candidate.nodes.filter(n => n.key.startsWith(ast.key + '/'));
    assert.deepEqual(candidateDescendants.filter(n => {
      const background = normalize(n.resolvedStyle ?? {}).backgroundColor;
      return background !== undefined && background !== normalize({ background: 'transparent' }).backgroundColor;
    }), []);
    const ripples = descendants.filter(n => n.attributes?.class?.split(/\s+/).includes('mat-ripple-element'));
    return { ...base, nativeFocusLayer: layer.key, nativeLayerOpacity: paint.opacity, nativeLayerBackground: paint.backgroundColor,
      nativeFocusRules: layer.rules.map(i => reference.rules[i]),
      nativeRipples: ripples.map(n => ({ key: n.key, style: reference.styles[n.style], inline: n.inline })),
      candidateMatchedStateRules: matching, candidateStateRules: rules, rippleTimingInferred: false };
  }
  if (entry.family === 'grid-list' || input.id === 'button-toggle-primary') {
    assert.equal(native.type, entry.family === 'grid-list' ? 'mat-grid-tile' : 'mat-button-toggle-group');
    assert.equal(ast.authored.type, 'div');
    assert.equal(reference.styles[native.style].backgroundColor, 'rgba(0, 0, 0, 0)');
    const affects = key => /^(background($|-)|all$|animation($|-)|transition($|-))/.test(key);
    assert.deepEqual(Object.keys(native.inline ?? {}).filter(affects), []);
    for (const index of native.rules) assert.deepEqual(Object.keys(reference.rules[index].declarations).filter(affects), []);
    const requests = input.astylarAuthored.filter(rule => Object.hasOwn(rule.declarations, 'background'));
    assert.equal(requests.length, 1);
    assert.equal(requests[0].selector, entry.family === 'grid-list' ? '.grid-tile' : '#button-toggle-primary');
    assert.ok(['#f6f1f9', '#27252c', '#f0f0f0', '#e5f2f1'].includes(requests[0].declarations.background));
    for (const stage of ['normalResolvedStyle', 'resolvedStyle', 'interactionResolvedStyle'])
      assert.equal(normalize(ast[stage]).backgroundColor, normalize(requests[0].declarations).backgroundColor);
    return { ...base, candidatePaintRequest: requests[0], nativeOwnPaintRequestAbsent: true,
      compensationIntentProven: false };
  }
  if (input.id === 'card-primary') {
    assert.equal(entry.profile, 'dark');
    const rule = one(native.rules.map(i => reference.rules[i]).filter(r => r.selector === '.mat-mdc-card'));
    assert.equal(rule.declarations['background-color'].value,
      'var(--mat-card-elevated-container-color, var(--mat-sys-surface-container-low))');
    assert.equal(reference.styles[native.style].backgroundColor, 'rgb(248, 242, 246)');
    const authored = one(candidate.rules.filter(r => r.selector === '.material-card'));
    assert.equal(authored.background, '#fff7ff');
    for (const stage of ['normalResolvedStyle', 'resolvedStyle', 'interactionResolvedStyle'])
      assert.equal(normalize(ast[stage]).backgroundColor, normalize(authored).backgroundColor);
    return { ...base, nativeRule: rule, candidateRule: authored, tokenAncestryReconstructed: false };
  }
  let host = native;
  if (entry.family === 'tabs') {
    identity = proveTabControlStage(reference, candidate, input.id);
    host = one(reference.nodes.filter(n => n.key === identity.referenceControl));
  }
  const layerClass = entry.family === 'tabs' ? 'mdc-tab__ripple' : 'mat-mdc-button-persistent-ripple';
  const layer = one(reference.nodes.filter(n => n.parent === host.key && n.attributes?.class?.split(/\s+/).includes(layerClass)));
  const pseudo = one(layer.pseudoElements.filter(p => p.pseudo === '::before'));
  assert.equal(pseudo.generated, true);
  const paint = reference.styles[pseudo.style];
  assert.ok((entry.family === 'tabs' ? ['0', '0.04', '0.12'] : ['0.08', '0.12']).includes(paint.opacity));
  assert.equal(reference.styles[native.style].backgroundColor, 'rgba(0, 0, 0, 0)');
  assert.equal(reference.styles[host.style].backgroundColor, 'rgba(0, 0, 0, 0)');
  assert.equal(ast.normalResolvedStyle.background, 'transparent');
  assert.equal(candidate.nodes.filter(n => n.key.startsWith(ast.key + '/')).length, 0);
  const selector = entry.family === 'tabs' ? '.tab' : entry.family === 'card' ? '.text-button'
    : entry.family === 'toolbar' ? '#toolbar-action' : '.dialog-action';
  const effective = normalize(ast.resolvedStyle).backgroundColor;
  assert.notEqual(effective, normalize(ast.normalResolvedStyle).backgroundColor);
  assert.equal(effective, normalize(ast.interactionResolvedStyle).backgroundColor);
  const rules = candidate.rules.filter(r => ['hover', 'active', 'focus'].some(state => r.selector === `${selector}:${state}`));
  const matching = rules.filter(r => normalize(r).backgroundColor === effective);
  if (matching.length === 2) {
    assert.equal(entry.family, 'toolbar');
    assert.deepEqual(matching.map(r => r.selector), ['#toolbar-action:hover', '#toolbar-action:active']);
  } else assert.equal(matching.length, 1);
  return { ...base, identity, nativeHost: host.key, nativeLayer: layer.key, nativeLayerOpacity: paint.opacity,
    nativeLayerBackground: paint.backgroundColor, nativePseudoRules: pseudo.rules.map(i => reference.rules[i]),
    candidateMatchedStateRules: matching, candidateStateRules: rules,
    measuredNativeOwnerIsTextLabel: entry.family === 'tabs', stateTimingInferred: false };
}

export function applyControlStatePaintReview(rows, cases, inventory, normalize) {
  const proofs = new Map();
  return rows.map(row => {
    if (row.attribution !== 'unresolved' || row.property !== 'backgroundColor' || !targets[row.family]?.includes(row.element)) return row;
    const members = cases.filter(e => e.family === row.family && e.styleInputs.some(i => i.id === row.element &&
      normalize(i.reference).backgroundColor === row.reference && normalize(i.astylar).backgroundColor === row.astylar));
    const keys = members.map(keyOf);
    assert.equal(keys.length, row.occurrences); assert.equal(new Set(keys).size, keys.length);
    assert.deepEqual(keys.slice(0, 12), row.cases); assert.deepEqual([...new Set(members.map(e => e.state ?? 'static'))], row.states);
    const observations = members.map(entry => {
      const key = JSON.stringify([keyOf(entry), row.element]);
      if (!proofs.has(key)) proofs.set(key, proveControlStatePaint(entry, entry.styleInputs.find(i => i.id === row.element),
        ...modalInventoryTrees(inventory, keyOf(entry)), normalize));
      return proofs.get(key);
    });
    const surface = row.element === 'card-primary', opaque = ['grid-list', 'button-toggle'].includes(row.family);
    const special = specialPaintDefinitions[row.element];
    return { ...row, classification: special?.classification ?? 'application-plugin-authoring-defect',
      attribution: special?.attribution ?? (surface ? cardSurfacePaintAttribution : opaque ? opaqueSurfacePaintAttribution : controlStatePaintAttribution),
      recommendedOwner: row.family === 'slider' ? 'core input defaults and compatibility policy; not visible thumb paint'
        : 'Material comparison paint authoring; retain tab measurement-owner distinction',
      justification: special?.justification ?? (surface
        ? 'The captured dark card resolves the native surface token to a different color than the candidate fixed surface request. These authored inputs already differ; token ancestry, compensation intent and renderer causation are not inferred.'
        : opaque ? 'The native owner has no own background/reset/motion request and computes transparent; the candidate explicitly requests an opaque surface fill at every captured stage. This is unequal authoring before paint, not a proved renderer conversion defect or historical compensation intent.'
        : 'A separate native translucent state layer is replaced by a childless candidate control with opaque state fill. Tabs additionally compare native label IDs with candidate control IDs. Preserve both differences, captured layer opacity and the matching authored state rule; do not infer focus timing or final pixel equivalence.'),
      reviewedCases: keys, reviewEvidence: { originalRowSha256: digest(row), observations,
        inputEquivalent: false, renderingEquivalent: false, rendererCauseProven: false } };
  });
}
