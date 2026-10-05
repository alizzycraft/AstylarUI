import assert from 'node:assert/strict';
import { applyModalBoxReview } from './modal-position-inspection.mjs';
import { resolveOriginAliasPair } from './origin-alias-mapping-evidence.mjs';
import { rootInitialSelectorCanApply } from './root-initial-style-evidence.mjs';
import { proveStepperPositionSubstitution } from '../../scripts/audit-material-stepper-position-substitution.mjs';
import { proveChipPositionInspection } from './chip-position-inspection.mjs';
import { proveChoiceLabelStacking } from './choice-label-stacking-substitution.mjs';
import { proveRadioPositionSubstitution } from './radio-position-substitution.mjs';
import { proveToolbarPositionInspection } from './toolbar-position-inspection.mjs';
import { inspectOwnerGapInput } from './owner-gap-input-evidence.mjs';

export function proveExpansionTreeFormatting(entry, reference, candidate) {
  const expansion = entry.family === 'expansion';
  assert.ok(expansion || entry.family === 'tree');
  const element = expansion ? 'expansion-title' : 'tree-primary';
  const display = proveDisplayRequest(entry, reference, candidate, element);
  const r = reference.nodes.find(n => n.key === display.referenceNode);
  const a = candidate.nodes.find(n => n.key === display.astylarNode);
  const relevant = key => /^(align-?items|place-?items|margin(?:-?right)?|text-?align|flex-?direction|flex-?flow|all)$/i.test(key);
  const select = style => Object.fromEntries(Object.entries(style ?? {}).filter(([key]) => relevant(key)));
  assert.deepEqual(select(r.inline), {}); assert.deepEqual(select(a.authored.style), {});
  const native = r.rules.map(i => reference.rules[i]).filter(q => q.active);
  const requests = native.map(q => ({ selector: q.selector, declarations: select(q.declarations) })).filter(q => Object.keys(q.declarations).length);
  assert.deepEqual(requests, expansion ? [{ selector: '.mat-expansion-panel-header-title, .mat-expansion-panel-header-description', declarations: {
    'margin-right': { value: '16px', important: false }, 'align-items': { value: 'center', important: false },
  } }] : []);
  const serialized = native.flatMap(q => [...q.cssText.matchAll(/(?:^|;)\s*(align-items|place-items|margin(?:-right)?|text-align|flex-direction|flex-flow|all)\s*:\s*([^;]*)(?=;|$)/gi)].map(([, property, value]) => [property, value.trim()]));
  assert.deepEqual(serialized, expansion ? [['margin-right', '16px'], ['align-items', 'center']] : []);
  const candidateRequests = candidate.rules.filter(q => rootInitialSelectorCanApply(q.selector, a.authored)).map(q => ({ selector: q.selector, declarations: select(q) })).filter(q => Object.keys(q.declarations).length);
  assert.deepEqual(candidateRequests, expansion ? [] : [{ selector: '.material-tree', declarations: { flexDirection: 'column' } }]);
  for (const stage of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle']) {
    assert.equal(a[stage].flexDirection, expansion ? 'row' : 'column');
    assert.equal(a[stage].alignItems, 'stretch'); assert.equal(a[stage].margin, '0');
    assert.equal(a[stage].marginRight, undefined); assert.equal(a[stage].textAlign, undefined);
  }
  if (expansion) {
    assert.equal(reference.styles[r.style].alignItems, 'center');
    assert.equal(reference.styles[r.style].marginRight, '16px');
    assert.equal(reference.styles[r.style].textAlign, 'start');
    assert.equal(r.ownText, 'Advanced settings'); assert.equal(a.authored.textContent, r.ownText);
    const parent = candidate.nodes.find(n => n.key === a.parent);
    assert.equal(parent.authored.id, 'expansion-primary');
    for (const stage of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle']) assert.equal(parent[stage].textAlign, 'left');
  } else {
    assert.equal(reference.styles[r.style].flexDirection, 'row');
    const rc = reference.nodes.filter(n => n.parent === r.key), ac = candidate.nodes.filter(n => n.parent === a.key);
    assert.deepEqual(rc.map(n => n.ownText), ['Documents', 'Projects', 'Archive']);
    assert.deepEqual(ac.map(n => candidate.nodes.filter(c => c.parent === n.key).map(c => c.authored.textContent)), [['Documents'], ['Projects'], ['Archive']]);
    assert.ok(rc.every(n => reference.styles[n.style].display === 'flex'));
    assert.ok(ac.every(n => n.resolvedStyle.display === 'flex'));
  }
  return { referenceNode: r.key, astylarNode: a.key, display, requests, candidateRequests,
    firstDivergence: expansion ? 'native flex title alignment and trailing margin omitted from inline candidate title' : 'native block tree replaced by column flex owner',
    candidateComputedTextAlignProven: false, usedLayoutProven: false, renderingEquivalent: null };
}

export function applyExpansionTreeFormattingReviews(rows, cases, inventory, normalize) {
  for (const [family, element, properties] of [['expansion', 'expansion-title', ['alignItems', 'marginRight']], ['tree', 'tree-primary', ['flexDirection']]]) rows = applyModalBoxReview(rows, cases, inventory, normalize, {
    family, element, properties, prove: proveExpansionTreeFormatting,
    attribution: 'reviewed-expansion-tree-formatting-substitution', owner: 'comparison formatting-owner authoring',
    justification: 'Expansion drops explicit native title flex formatting, centered items and 16px trailing margin. Tree replaces a native block owner with a column flex owner; native computed row is not an active row-layout request. Preserve these unequal formatting contracts without inferring used-layout equivalence or a core defect from scalar differences.',
  });
  return applyModalBoxReview(rows, cases, inventory, normalize, {
    family: 'expansion', element: 'expansion-title', properties: ['textAlign'], prove: proveExpansionTreeFormatting,
    classification: 'parity-harness-defect', attribution: 'reviewed-expansion-text-alignment-observation-stage', owner: 'computed versus local inherited alignment evidence',
    justification: 'Native title computes start without a direct alignment request; candidate title omits local textAlign while its parent requests left. The scalar comparison does not observe candidate computed/inherited alignment or used placement. Keep the omission and separate formatting substitution; do not manufacture a candidate default or claim start/left rendering equivalence.',
  });
}

export function validateExpansionTreeFormattingReviews(rows, originalRows, cases, inventory, normalize) {
  // Audit evidence is persisted JSON. Compare the entire serialized rows, not
  // live-only undefined properties; values, membership and order stay enforced.
  try {
    const select = values => values.filter(r => ['reviewed-expansion-tree-formatting-substitution', 'reviewed-expansion-text-alignment-observation-stage'].includes(r.attribution));
    assert.equal(JSON.stringify(select(rows)), JSON.stringify(select(applyExpansionTreeFormattingReviews(originalRows, cases, inventory, normalize))));
    return [];
  } catch (error) { return [`expansion/tree formatting lacks original evidence: ${error.message}`]; }
}

export function proveTooltipShrinkComposition(entry, reference, candidate, element) {
  assert.equal(entry.family, 'tooltip');
  assert.ok(['tooltip-primary', 'tooltip-popup'].includes(element));
  const one = values => { assert.equal(values.length, 1); return values[0]; };
  for (const tree of [reference, candidate]) {
    assert.deepEqual(tree.errors, []); assert.equal(tree.ruleEvidenceComplete, true);
  }
  assert.equal(candidate.resolvedStyleEvidenceVersion, 2);
  assert.equal(candidate.resolvedStyleSource, 'core-style-inspection');
  const input = one(entry.styleInputs.filter(i => i.id === element));
  const display = element === 'tooltip-popup' ? proveDisplayRequest(entry, reference, candidate, element) : null;
  const r = one(reference.nodes.filter(n => display ? n.key === display.referenceNode : n.attributes?.id === element));
  const a = one(candidate.nodes.filter(n => n.authored?.id === element));
  assert.equal(Object.keys(input.reference).length, 89);
  for (const [key, value] of Object.entries(input.reference)) assert.deepEqual(reference.styles[r.style][key], value);
  const relevant = key => /^(flex|flex-shrink|flexShrink|all)$/.test(key);
  const select = value => Object.fromEntries(Object.entries(value ?? {}).filter(([key]) => relevant(key)));
  assert.deepEqual(select(r.inline), {}); assert.deepEqual(select(a.authored.style), {});
  assert.equal(a.authored.attributes?.style, undefined);
  const rules = r.rules.map(i => reference.rules[i]).filter(q => q.active);
  assert.ok(rules.every(q => Object.keys(select(q.declarations)).length === 0));
  assert.ok(rules.every(q => !/(?:^|;)\s*(?:flex(?:-shrink)?|all)\s*:/i.test(q.cssText)));
  const selector = element === 'tooltip-primary' ? '.tooltip-anchor .material-button' : '#tooltip-popup';
  const request = one(input.astylarAuthored.filter(q => Object.keys(select(q.declarations)).length));
  assert.equal(request.selector, selector); assert.deepEqual(select(request.declarations), { flexShrink: '0' });
  assert.deepEqual(select(one(candidate.rules.filter(q => q.selector === selector))), { flexShrink: '0' });
  const competing = candidate.rules.filter(q => (q.selector === selector || rootInitialSelectorCanApply(q.selector, a.authored)) && Object.keys(select(q)).length);
  assert.deepEqual(competing.map(q => ({ selector: q.selector, declarations: select(q) })), [{ selector, declarations: { flexShrink: '0' } }]);
  assert.equal(reference.styles[r.style].flexShrink, '1');
  for (const [scalar, stage] of [['astylar', 'resolvedStyle'], ['astylarNormalResolvedStyle', 'normalResolvedStyle'], ['astylarInteractionResolvedStyle', 'interactionResolvedStyle']]) {
    assert.deepEqual(input[scalar], a[stage]); assert.equal(a[stage].flexShrink, '0');
  }
  const rp = one(reference.nodes.filter(n => n.key === r.parent));
  const ap = one(candidate.nodes.filter(n => n.key === a.parent));
  assert.equal(ap.authored.id, 'tooltip-anchor');
  for (const stage of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle']) {
    assert.equal(ap[stage].display, 'flex'); assert.equal(ap[stage].flexDirection, 'column');
    assert.equal(ap[stage].height, '72px'); assert.equal(ap[stage].gap, '8px');
  }
  const primary = element === 'tooltip-primary';
  assert.equal(reference.styles[rp.style].display, primary ? 'block' : 'inline-flex');
  if (primary) assert.equal(rp.attributes.id, 'tooltip-root');
  else assert.ok(rp.attributes.class.split(/\s+/).includes('mat-mdc-tooltip'));
  return { referenceNode: r.key, astylarNode: a.key, display, request,
    referenceParent: { key: rp.key, display: reference.styles[rp.style].display },
    candidateParent: { key: ap.key, id: ap.authored.id, display: 'flex', flexDirection: 'column', height: '72px', gap: '8px' },
    referenceComputedShrink: '1', candidateRequestedShrink: '0', nativeOwnerIsFlexItem: !primary,
    firstDivergence: 'separate native button/overlay owners replaced by a nonshrinking shared column',
    inputEquivalent: false, renderingEquivalent: null, usedShrinkEffectProven: false, originalRasterCauseProven: false };
}

export function applyTooltipShrinkReviews(rows, cases, inventory, normalize) {
  for (const element of ['tooltip-primary', 'tooltip-popup']) rows = applyModalBoxReview(rows, cases, inventory, normalize, {
    family: 'tooltip', element, properties: ['flexShrink'],
    prove: (entry, r, a) => proveTooltipShrinkComposition(entry, r, a, element),
    attribution: 'reviewed-tooltip-shrink-composition-substitution', owner: 'tooltip fixture structure and flex sizing authoring',
    justification: 'Candidate explicitly disables shrinking inside a shared 72px column with an 8px gap. Native button belongs to normal block flow (its computed shrink is not an active flex-item request); native tooltip surface belongs to a separate inline-flex overlay owner with default shrink. These distinct parent/axis contracts are not equivalent inputs. This does not prove used shrink, a core flex defect, or the cause of tooltip position/blur.',
  });
  return rows;
}

export function validateTooltipShrinkReviews(rows, originalRows, cases, inventory, normalize) {
  try {
    const select = values => values.filter(r => r.attribution === 'reviewed-tooltip-shrink-composition-substitution');
    assert.equal(JSON.stringify(select(rows)), JSON.stringify(select(applyTooltipShrinkReviews(originalRows, cases, inventory, normalize))));
    return [];
  } catch (error) { return [`tooltip shrink lacks original evidence: ${error.message}`]; }
}

export function proveDialogPanelGap(entry, reference, candidate) {
  assert.equal(entry.family, 'dialog');
  assert.equal(reference.ruleEvidenceComplete, true); assert.equal(candidate.ruleEvidenceComplete, true);
  const inputs = entry.styleInputs.filter(i => i.id === 'dialog-panel'); assert.equal(inputs.length, 1);
  const proofs = ['rowGap', 'columnGap'].map(property => inspectOwnerGapInput(inputs[0], property, reference, candidate, { family: 'dialog' }));
  for (const proof of proofs) {
    assert.equal(proof.disposition, 'requires-specific-review');
    assert.deepEqual(proof.issues, [{ reason: 'relevant-authored-request', side: 'reference' }]);
    assert.equal(proof.generatedIdentity.status, 'mapped');
    assert.equal(proof.referenceComputed, 'normal'); assert.equal(proof.candidateLocal, '<omitted>');
    assert.deepEqual(proof.requests.astylar, []);
    assert.deepEqual(proof.candidateStages, { resolvedStyle: {}, normalResolvedStyle: {}, interactionResolvedStyle: {} });
    assert.deepEqual(proof.requests.reference, [
      { source: '.mat-mdc-dialog-surface', declarations: Object.fromEntries(['property', 'duration', 'timing-function', 'delay', 'behavior'].map(k => ['transition-' + k, { value: '', important: false }])) },
      { source: '._mat-animation-noopable .mat-mdc-dialog-surface', declarations: Object.fromEntries(Object.entries({ behavior: 'normal', duration: '0s', 'timing-function': 'ease', delay: '0s', property: 'none' }).map(([k, value]) => ['transition-' + k, { value, important: false }])) },
    ]);
  }
  const r = reference.nodes.find(n => n.key === proofs[0].referenceNode);
  const rules = r.rules.map(i => reference.rules[i]);
  assert.ok(rules.every(q => q.active && q.conditions.length === 0));
  const serialized = rules.flatMap(q => [...q.cssText.matchAll(/(?:^|;)\s*(transition(?:-[\w-]+)?|animation(?:-[\w-]+)?|(?:grid-)?(?:row-|column-)?gap|all)\s*:\s*([^;]*)(?=;|$)/gi)]
    .map(([, key, value]) => ({ selector: q.selector, key, value: value.trim() })));
  assert.deepEqual(serialized, [
    { selector: '.mat-mdc-dialog-surface', key: 'transition', value: 'transform var(--mat-dialog-transition-duration, 0ms) cubic-bezier(0, 0, 0.2, 1)' },
    { selector: '._mat-animation-noopable .mat-mdc-dialog-surface', key: 'transition', value: 'none' },
  ]);
  return { referenceNode: proofs[0].referenceNode, astylarNode: proofs[0].astylarNode, proofs, serialized,
    firstDivergence: 'browser computed normal compared to omitted local gap; serialized transform transition resolves empty CSSOM evidence',
    inputEquivalent: false, renderingEquivalent: null, candidateComputedGapProven: false, usedGapProven: false,
    directGapMotionRequested: false, indirectMotionEffectsExcluded: false };
}

export function applyDialogPanelGapReview(rows, cases, inventory, normalize) {
  return applyModalBoxReview(rows, cases, inventory, normalize, {
    family: 'dialog', element: 'dialog-panel', properties: ['rowGap', 'columnGap'], prove: proveDialogPanelGap,
    attribution: 'reviewed-dialog-panel-gap-observation-stage', classification: 'parity-harness-defect',
    owner: 'Material audit computed versus local gap observation and serialized transition evidence',
    justification: 'Original full-tree mapping and all local stages preserve browser-computed normal versus omitted candidate gap fields. Empty transition longhands belong to a preserved transform-only shorthand followed by an active transition:none rule; neither requests gap motion. This closes the direct motion-request ambiguity without substituting candidate computed normal/zero, accepting whole-panel input equivalence, resolving indirect transform effects or proving used spacing/rendering equivalence.',
  });
}

export function validateDialogPanelGapReview(rows, originalRows, cases, inventory, normalize) {
  try {
    const select = values => values.filter(r => r.attribution === 'reviewed-dialog-panel-gap-observation-stage');
    assert.deepEqual(select(rows), select(applyDialogPanelGapReview(originalRows, cases, inventory, normalize)));
    return [];
  } catch (error) { return [`dialog panel gap lacks original evidence: ${error.message}`]; }
}

export function proveDialogActionSpacing(entry, reference, candidate, element) {
  assert.equal(entry.family, 'dialog');
  assert.ok(['dialog-cancel', 'dialog-save'].includes(element));
  const composition = proveDisplayRequest(entry, reference, candidate, element);
  const r = reference.nodes.find(n => n.key === composition.referenceNode);
  const a = candidate.nodes.find(n => n.key === composition.astylarNode);
  const save = element === 'dialog-save';
  const relevant = key => /^(padding.*|margin.*|alignitems|justifycontent|all)$/.test(key.replaceAll('-', '').toLowerCase());
  assert.deepEqual(Object.keys(r.inline).filter(relevant), []);
  assert.equal(a.authored.style, undefined); assert.equal(a.authored.attributes?.style, undefined);
  const nativeRules = r.rules.map(i => reference.rules[i]).filter(q => q.active);
  const referenceRequests = nativeRules.flatMap(q => [...q.cssText.matchAll(/(?:^|;)\s*(padding(?:-[\w-]+)?|margin(?:-[\w-]+)?|align-items|justify-content|all)\s*:\s*([^;]*)(?=;|$)/gi)]
    .map(([, key, value]) => ({ selector: q.selector, key, value: value.trim() })));
  assert.deepEqual(referenceRequests, [
    { selector: '.mdc-button', key: 'align-items', value: 'center' },
    { selector: '.mdc-button', key: 'justify-content', value: 'center' },
    { selector: '.mdc-button', key: 'padding', value: '0px 8px' },
    { selector: save ? '.mat-mdc-unelevated-button' : '.mat-mdc-button', key: 'padding',
      value: save ? '0 var(--mat-button-filled-horizontal-padding, 24px)' : '0 var(--mat-button-text-horizontal-padding, 12px)' },
    ...(save ? [{ selector: '.mat-mdc-dialog-actions .mat-button-base + .mat-button-base, .mat-mdc-dialog-actions .mat-mdc-button-base + .mat-mdc-button-base', key: 'margin-left', value: '8px' }] : []),
  ]);
  // Inspect expanded declarations too: variable-containing padding shorthand
  // may serialize while its CSSOM longhands are empty.
  for (const q of nativeRules) for (const [key, value] of Object.entries(q.declarations).filter(([key]) => relevant(key))) {
    assert.equal(value.important, false);
    if (key.startsWith('padding')) {
      assert.ok(q.selector === '.mdc-button' || q.selector === (save ? '.mat-mdc-unelevated-button' : '.mat-mdc-button'));
      assert.ok(['padding-top', 'padding-right', 'padding-bottom', 'padding-left'].includes(key));
      assert.equal(value.value, q.selector === '.mdc-button' ? (['padding-left', 'padding-right'].includes(key) ? '8px' : '0px') : '');
    }
    else assert.ok(referenceRequests.some(request => request.selector === q.selector && request.key === key && request.value === value.value));
  }
  const candidateRequests = candidate.rules.filter(q => rootInitialSelectorCanApply(q.selector, a.authored))
    .flatMap(q => Object.entries(q).filter(([key]) => relevant(key)).map(([key, value]) => ({ selector: q.selector, key, value })));
  assert.deepEqual(candidateRequests, []);
  const native = reference.styles[r.style];
  for (const [key, value] of Object.entries({ alignItems: 'center', justifyContent: 'center', paddingTop: '0px', paddingBottom: '0px',
    paddingLeft: save ? '24px' : '12px', paddingRight: save ? '24px' : '12px', marginLeft: save ? '8px' : '0px' })) assert.equal(native[key], value);
  for (const stage of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle']) {
    for (const [key, value] of Object.entries({ alignItems: 'stretch', justifyContent: 'flex-start', padding: '10px 20px', margin: '0' })) assert.equal(a[stage][key], value);
    for (const key of ['paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight', 'marginLeft']) assert.equal(a[stage][key], undefined);
  }
  return { referenceNode: r.key, astylarNode: a.key, composition, referenceRequests, candidateRequests,
    firstDivergence: 'explicit Material button alignment and token padding omitted from candidate dialog action authoring',
    inputEquivalent: false, renderingEquivalent: null, coreDefectProven: false, originalRasterCauseProven: false,
    saveMarginScope: save ? 'native sibling margin omitted; candidate parent gap is a separately reviewed substitution' : null };
}

export function applyDialogActionSpacingReviews(rows, cases, inventory, normalize) {
  for (const element of ['dialog-cancel', 'dialog-save']) rows = applyModalBoxReview(rows, cases, inventory, normalize, {
    family: 'dialog', element,
    properties: ['alignItems', 'justifyContent', 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight', ...(element === 'dialog-save' ? ['marginLeft'] : [])],
    prove: (entry, reference, candidate) => proveDialogActionSpacing(entry, reference, candidate, element),
    attribution: 'reviewed-dialog-action-spacing-request-omission', owner: 'showcase dialog action authoring and shared button input contract',
    justification: 'Native Material buttons explicitly request centered flex layout and token-based horizontal padding with zero vertical padding; candidate dialog action rules omit these inputs and retain captured local block/default alignment and 10px 20px padding in all three stages. The native Save sibling margin is also absent, while the candidate parent gap remains a separately reviewed substitution. This establishes unequal authoring, not a core alignment failure or proof of the original oversized raster cause. Restore equivalent structure and requests before testing used control layout and text paint.',
  });
  return rows;
}

export function validateDialogActionSpacingReviews(rows, originalRows, cases, inventory, normalize) {
  try {
    const select = values => values.filter(r => r.attribution === 'reviewed-dialog-action-spacing-request-omission');
    assert.equal(JSON.stringify(select(rows)), JSON.stringify(select(applyDialogActionSpacingReviews(originalRows, cases, inventory, normalize))));
    return [];
  } catch (error) { return [`dialog action spacing lacks original evidence: ${error.message}`]; }
}

export function proveToolbarSpacingComposition(entry, reference, candidate, element) {
  assert.equal(entry.family, 'toolbar');
  assert.ok(['toolbar-primary', 'toolbar-title', 'toolbar-action'].includes(element));
  assert.equal(reference.ruleEvidenceComplete, true); assert.equal(candidate.ruleEvidenceComplete, true);
  assert.equal(candidate.resolvedStyleEvidenceVersion, 2); assert.equal(candidate.resolvedStyleSource, 'core-style-inspection');
  const composition = proveToolbarPositionInspection(reference, candidate);
  const one = ns => { assert.equal(ns.length, 1); return ns[0]; };
  const r = one(reference.nodes.filter(n => n.attributes?.id === element));
  const a = one(candidate.nodes.filter(n => n.authored?.id === element));
  const input = one(entry.styleInputs.filter(i => i.id === element));
  assert.equal(Object.keys(input.reference).length, 89);
  for (const [key, value] of Object.entries(input.reference)) assert.deepEqual(reference.styles[r.style][key], value);
  for (const [scalar, stage] of [['astylar', 'resolvedStyle'], ['astylarNormalResolvedStyle', 'normalResolvedStyle'], ['astylarInteractionResolvedStyle', 'interactionResolvedStyle']])
    assert.deepEqual(input[scalar], a[stage]);
  const host = element === 'toolbar-primary';
  const relevant = key => (host ? /^(padding.*|all)$/ : /^(margin.*|flex.*|all)$/).test(key.replaceAll('-', '').toLowerCase());
  assert.deepEqual(Object.keys(r.inline).filter(relevant), []);
  const referenceRequests = r.rules.map(i => reference.rules[i]).filter(q => q.active).flatMap(q =>
    Object.entries(q.declarations).filter(([key]) => relevant(key)).map(([key, value]) => ({ selector: q.selector, key, ...value })));
  assert.deepEqual(referenceRequests, host ? ['top', 'right', 'bottom', 'left'].map(side => ({
    selector: '.mat-toolbar-row, .mat-toolbar-single-row', key: 'padding-' + side,
    value: ['left', 'right'].includes(side) ? '16px' : '0px', important: false,
  })) : []);
  assert.equal(a.authored.style, undefined); assert.equal(a.authored.attributes?.style, undefined);
  const candidateRequests = candidate.rules.filter(q => rootInitialSelectorCanApply(q.selector, a.authored)).flatMap(q =>
    Object.entries(q).filter(([key]) => relevant(key)).map(([key, value]) => ({ selector: q.selector, key, value })));
  const title = element === 'toolbar-title';
  assert.deepEqual(candidateRequests, host ? [] : [
    { selector: title ? '.toolbar-title' : '.toolbar-action', key: title ? 'marginLeft' : 'margin', value: title ? '16px' : '0 16px 0 auto' },
    { selector: title ? '.toolbar-title' : '.toolbar-action', key: 'flexShrink', value: '0' },
  ]);
  const native = reference.styles[r.style];
  if (host) assert.equal(native.padding, '0px 16px');
  else { assert.equal(native.margin, '0px'); assert.equal(native.flexShrink, '1'); }
  for (const stage of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle']) {
    if (host) assert.equal(a[stage].padding, '0');
    else {
      assert.equal(a[stage].flexShrink, '0');
      assert.equal(a[stage].margin, title ? '0' : '0 16px 0 auto');
      if (title) assert.equal(a[stage].marginLeft, '16px');
    }
  }
  return { referenceNode: r.key, astylarNode: a.key, composition, referenceRequests, candidateRequests,
    firstDivergence: 'padded toolbar and growing spacer replaced by fixed-width nonshrinking children and child margins',
    inputEquivalent: false, renderingEquivalent: null, coreDefectProven: false, compensationIntentProven: false,
    constrainedWidthEquivalenceProven: false };
}

export function applyToolbarSpacingReviews(rows, cases, inventory, normalize) {
  for (const [element, properties] of [
    ['toolbar-primary', ['paddingLeft', 'paddingRight']], ['toolbar-title', ['marginLeft', 'flexShrink']],
    ['toolbar-action', ['marginLeft', 'marginRight', 'flexShrink']],
  ]) rows = applyModalBoxReview(rows, cases, inventory, normalize, {
    family: 'toolbar', element, properties, prove: (entry, reference, candidate) => proveToolbarSpacingComposition(entry, reference, candidate, element),
    attribution: 'reviewed-toolbar-spacing-composition-substitution', owner: 'showcase toolbar flex structure, sizing and spacing authoring',
    justification: 'The native toolbar owns 16px side padding and a growing spacer between shrinking title/action items. Candidate omits that spacer and host padding, using fixed widths, flex-shrink:0 and child margins including an auto left action margin. Auto margin and a spacer may align on some unconstrained boxes, but these different shrink/sizing and padding owners do not establish equivalent inputs under constraint. Preserve the authoring substitution without blaming core flex or claiming historical intent or whole-toolbar rendering equivalence.',
  });
  return rows;
}

export function validateToolbarSpacingReviews(rows, originalRows, cases, inventory, normalize) {
  try {
    const select = values => values.filter(r => r.attribution === 'reviewed-toolbar-spacing-composition-substitution');
    assert.deepEqual(select(rows), select(applyToolbarSpacingReviews(originalRows, cases, inventory, normalize)));
    return [];
  } catch (error) { return [`toolbar spacing lacks original evidence: ${error.message}`]; }
}

export function proveChoiceSpacingComposition(entry, reference, candidate, element) {
  const checkbox = entry.family === 'checkbox';
  assert.ok(checkbox ? ['checkbox-primary', 'checkbox-label'].includes(element)
    : entry.family === 'radio' && ['radio-primary', 'radio-solo-label', 'radio-team-label'].includes(element));
  assert.equal(reference.ruleEvidenceComplete, true); assert.equal(candidate.ruleEvidenceComplete, true);
  assert.equal(candidate.resolvedStyleEvidenceVersion, 2); assert.equal(candidate.resolvedStyleSource, 'core-style-inspection');
  const one = ns => { assert.equal(ns.length, 1); return ns[0]; };
  const labelId = checkbox ? 'checkbox-label' : element === 'radio-primary' ? 'radio-solo-label' : element;
  const composition = proveChoiceLabelStacking(reference, candidate, labelId);
  const position = checkbox ? proveDisplayRequest(entry, reference, candidate, 'checkbox-primary')
    : proveRadioPositionSubstitution(reference, candidate);
  const r = one(reference.nodes.filter(n => n.attributes?.id === element));
  const a = one(candidate.nodes.filter(n => n.authored?.id === element));
  const input = one(entry.styleInputs.filter(i => i.id === element));
  assert.equal(Object.keys(input.reference).length, 89);
  for (const [key, value] of Object.entries(input.reference)) assert.deepEqual(reference.styles[r.style][key], value);
  for (const [scalar, stage] of [['astylar', 'resolvedStyle'], ['astylarNormalResolvedStyle', 'normalResolvedStyle'], ['astylarInteractionResolvedStyle', 'interactionResolvedStyle']])
    assert.deepEqual(input[scalar], a[stage]);
  const relevant = key => /^(padding.*|margin.*|all)$/.test(key.replaceAll('-', '').toLowerCase());
  assert.deepEqual(Object.keys(r.inline).filter(relevant), []);
  const requests = r.rules.map(i => reference.rules[i]).filter(q => q.active).flatMap(q =>
    Object.entries(q.declarations).filter(([key]) => relevant(key)));
  assert.deepEqual(requests, []);
  assert.equal(a.authored.style, undefined); assert.equal(a.authored.attributes?.style, undefined);
  const candidateRequests = candidate.rules.filter(q => rootInitialSelectorCanApply(q.selector, a.authored)).flatMap(q =>
    Object.entries(q).filter(([key]) => relevant(key)).map(([key, value]) => ({ selector: q.selector, key, value,
      ...(q.mediaMaxWidth === undefined ? {} : { mediaMaxWidth: q.mediaMaxWidth }) })));
  const group = element.endsWith('-primary');
  const margin = ['light', 'dark'].includes(entry.profile) ? '9px' : '4px';
  const expected = checkbox ? { selector: group ? '#checkbox-primary' : '.checkbox-label', key: 'padding',
    value: group ? '0 11px' : '0 0 1px', ...(group ? {} : { mediaMaxWidth: '500px' }) }
    : { selector: group ? '#radio-primary' : '.radio-label', key: group ? 'marginTop' : 'marginLeft', value: group ? margin : '8px' };
  assert.deepEqual(candidateRequests, [expected]);
  const parentLabel = one(reference.nodes.filter(n => n.key === composition.reference.associatedLabel));
  assert.equal(reference.styles[parentLabel.style].padding, '0px 0px 0px 4px');
  const nativeControl = one(reference.nodes.filter(n => n.key === composition.reference.control));
  const controlBox = one(reference.nodes.filter(n => n.key === nativeControl.parent));
  const controlPadding = checkbox ? { light: '11px', dark: '11px', contrast: '5px', custom: '7px' }[entry.profile]
    : { light: '10px', dark: '10px', contrast: '4px', custom: '6px' }[entry.profile];
  assert.ok(controlPadding); assert.equal(reference.styles[controlBox.style].padding, controlPadding);
  const native = reference.styles[r.style];
  assert.equal(native.margin, '0px'); assert.equal(native.padding, '0px');
  if (checkbox && !group) {
    assert.equal(entry.profile, 'custom'); assert.equal(entry.viewport.id, 'mobile');
    assert.equal(entry.kind, 'static');
  }
  for (const stage of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle']) {
    assert.equal(a[stage].margin, '0');
    if (checkbox) {
      assert.equal(a[stage].padding, expected.value);
      if (group) { assert.equal(a[stage].gap, '14px'); assert.equal(a[stage].display, 'flex'); }
    } else { assert.equal(a[stage][expected.key], expected.value); assert.equal(a[stage].padding, '0'); }
  }
  return { referenceNode: r.key, astylarNode: a.key, composition, position,
    referenceRequests: requests, candidateRequests, associatedLabelPadding: '0px 0px 0px 4px', controlPadding,
    firstDivergence: checkbox && !group ? 'custom mobile label adds a one-pixel padding adjustment'
      : 'native control and associated-label spacing replaced by custom host or label spacing',
    inputEquivalent: false, renderingEquivalent: false, coreDefectProven: false, compensationIntentProven: false };
}

export function applyChoiceSpacingReviews(rows, cases, inventory, normalize) {
  for (const [family, element, properties] of [
    ['checkbox', 'checkbox-primary', ['paddingLeft', 'paddingRight']], ['checkbox', 'checkbox-label', ['paddingBottom']],
    ['radio', 'radio-primary', ['marginTop']], ['radio', 'radio-solo-label', ['marginLeft']], ['radio', 'radio-team-label', ['marginLeft']],
  ]) rows = applyModalBoxReview(rows, cases, inventory, normalize, {
    family, element, properties, prove: (entry, reference, candidate) => proveChoiceSpacingComposition(entry, reference, candidate, element),
    attribution: 'reviewed-choice-spacing-authoring-substitution', owner: 'showcase native-control and associated-label composition',
    justification: element === 'checkbox-label'
      ? 'The custom mobile candidate label explicitly adds one pixel of bottom padding through a media rule; the corresponding native span has no padding request and computed zero padding. Preserve this profile-specific input adjustment rather than treating it as equal-input evidence of a core baseline defect.'
      : 'Native control padding and associated-label padding belong to nested owners. Candidate replaces that structure with a custom flex checkbox or absolutely placed radio options, adding host padding/top margin or label left margin. These explicit requests are not equivalent owner inputs; the evidence does not diagnose core spacing or establish historical compensation intent.',
  });
  return rows;
}

export function validateChoiceSpacingReviews(rows, originalRows, cases, inventory, normalize) {
  try {
    const select = values => values.filter(r => r.attribution === 'reviewed-choice-spacing-authoring-substitution');
    assert.equal(JSON.stringify(select(rows)), JSON.stringify(select(applyChoiceSpacingReviews(originalRows, cases, inventory, normalize))));
    return [];
  } catch (error) { return [`choice spacing lacks original evidence: ${error.message}`]; }
}

export function proveChipSpacingComposition(entry, reference, candidate, element) {
  assert.equal(entry.family, 'chips');
  assert.ok(['chips-primary', 'chip-0', 'chip-1'].includes(element));
  assert.equal(reference.ruleEvidenceComplete, true); assert.equal(candidate.ruleEvidenceComplete, true);
  assert.equal(candidate.resolvedStyleEvidenceVersion, 2); assert.equal(candidate.resolvedStyleSource, 'core-style-inspection');
  const composition = proveChipPositionInspection(reference, candidate);
  const one = ns => { assert.equal(ns.length, 1); return ns[0]; };
  const rn = id => one(reference.nodes.filter(n => n.attributes?.id === id));
  const an = id => one(candidate.nodes.filter(n => n.authored?.id === id));
  const relevant = key => /^(padding.*|margin.*|flexwrap|gap|rowgap|columngap|all)$/.test(key.replaceAll('-', '').toLowerCase());
  const nativeRequests = node => {
    assert.deepEqual(Object.keys(node.inline).filter(relevant), []);
    return node.rules.map(i => reference.rules[i]).filter(q => q.active).flatMap(q =>
      Object.entries(q.declarations).filter(([k]) => relevant(k)).map(([key, value]) => ({ selector: q.selector, key, ...value })));
  };
  const ownRequests = node => {
    assert.equal(node.authored.style, undefined); assert.equal(node.authored.attributes?.style, undefined);
    return candidate.rules.filter(q => rootInitialSelectorCanApply(q.selector, node.authored)).flatMap(q =>
      Object.entries(q).filter(([k]) => relevant(k)).map(([key, value]) => ({ selector: q.selector, key, value })));
  };
  const r = rn(element), a = an(element), input = one(entry.styleInputs.filter(i => i.id === element));
  assert.equal(Object.keys(input.reference).length, 89);
  for (const [k, v] of Object.entries(input.reference)) assert.deepEqual(reference.styles[r.style][k], v);
  for (const [scalar, stage] of [['astylar', 'resolvedStyle'], ['astylarNormalResolvedStyle', 'normalResolvedStyle'], ['astylarInteractionResolvedStyle', 'interactionResolvedStyle']])
    assert.deepEqual(input[scalar], a[stage]);
  const wrapper = one(reference.nodes.filter(n => n.key === composition.referenceWrapper));
  assert.deepEqual(nativeRequests(wrapper), [
    { selector: '.mat-mdc-chip-set .mdc-evolution-chip-set__chips', key: 'margin-left', value: '-8px', important: false },
    { selector: '.mat-mdc-chip-set .mdc-evolution-chip-set__chips', key: 'margin-right', value: '0px', important: false },
    { selector: '.mdc-evolution-chip-set__chips', key: 'flex-wrap', value: 'wrap', important: false },
  ]);
  const wrapperStyle = reference.styles[wrapper.style];
  assert.equal(wrapperStyle.marginLeft, '-8px'); assert.equal(wrapperStyle.flexWrap, 'wrap'); assert.equal(wrapperStyle.minWidth, '100%');
  const host = element === 'chips-primary';
  assert.deepEqual(nativeRequests(r), host ? [] : ['top', 'right', 'bottom', 'left'].map((side, i) => ({
    selector: '.mat-mdc-chip-set .mdc-evolution-chip', key: 'margin-' + side, value: ['4px', '0px', '4px', '8px'][i], important: false,
  })));
  assert.deepEqual(ownRequests(a), host ? [
    { selector: '.row', key: 'flexWrap', value: 'wrap' }, { selector: '.row', key: 'gap', value: '0' },
    { selector: '#chips-primary', key: 'gap', value: '8px' },
  ] : [{ selector: '.chip', key: 'padding', value: '0 12px' }, { selector: '.chip', key: 'gap', value: '8px' }]);
  if (host) assert.equal(reference.styles[r.style].flexWrap, 'nowrap');
  else {
    const rs = reference.styles[r.style];
    assert.equal(rs.padding, '0px'); assert.equal(rs.margin, '4px 0px 4px 8px');
    const chip = composition.chips.find(c => c.id === element);
    const graphic = one(reference.nodes.filter(n => n.key === chip.referenceGraphicOwner));
    const button = one(reference.nodes.filter(n => n.key === graphic.parent));
    assert.equal(button.type, 'button');
    assert.equal(reference.styles[button.style].padding, '0px 12px 0px 0px');
    assert.equal(reference.styles[graphic.style].padding, '0px 6px');
  }
  for (const stage of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle']) {
    assert.equal(a[stage].margin, '0'); assert.equal(a[stage].padding, host ? '0' : '0 12px');
    assert.equal(a[stage].gap, '8px'); if (host) assert.equal(a[stage].flexWrap, 'wrap');
  }
  return { referenceNode: r.key, astylarNode: a.key, composition,
    referenceRequests: nativeRequests(r), candidateRequests: ownRequests(a), wrapperRequests: nativeRequests(wrapper),
    firstDivergence: 'negative-margin wrapping wrapper and nested padded action replaced by direct gap and host padding',
    inputEquivalent: false, renderingEquivalent: false, coreDefectProven: false,
    compensationIntentProven: false, usedSpacingEquivalenceProven: false };
}

export function applyChipSpacingReviews(rows, cases, inventory, normalize) {
  for (const element of ['chips-primary', 'chip-0', 'chip-1'])
    rows = applyModalBoxReview(rows, cases, inventory, normalize, {
      family: 'chips', element, properties: element === 'chips-primary' ? ['flexWrap']
        : ['marginTop', 'marginBottom', 'marginLeft', 'paddingLeft', 'paddingRight'],
      prove: (entry, reference, candidate) => proveChipSpacingComposition(entry, reference, candidate, element),
      attribution: 'reviewed-chip-spacing-composition-substitution', owner: 'showcase chip wrapper, action and graphic authoring',
      justification: 'Native chip wrapping belongs to a negative-margin child wrapper, with margins on chip hosts and padding on retained action/graphic descendants. Candidate wraps direct children with a gap, removes host margins, and moves padding onto fixed-width flattened chip hosts. The nowrap/wrap scalar compares different composition owners; it does not prove broken core wrapping. Preserve these structural substitutions separately from intrinsic-size, outline and state findings; nominal spacing and matching screenshots cannot establish equal inputs or used-layout equivalence.',
    });
  return rows;
}

export function validateChipSpacingReviews(rows, originalRows, cases, inventory, normalize) {
  try {
    const select = values => values.filter(r => r.attribution === 'reviewed-chip-spacing-composition-substitution');
    assert.deepEqual(select(rows), select(applyChipSpacingReviews(originalRows, cases, inventory, normalize)));
    return [];
  } catch (error) { return [`chip spacing composition lacks original evidence: ${error.message}`]; }
}

export function proveStepperSpacingComposition(entry, reference, candidate, element) {
  assert.equal(entry.family, 'stepper');
  assert.ok(['stepper-primary', 'step-details-text', 'step-review-text'].includes(element));
  const mapping = proveDisplayRequest(entry, reference, candidate, 'stepper-primary');
  const position = proveStepperPositionSubstitution(reference, candidate);
  const one = nodes => { assert.equal(nodes.length, 1); return nodes[0]; };
  const r = one(reference.nodes.filter(n => n.attributes?.id === element));
  const a = one(candidate.nodes.filter(n => n.authored?.id === element));
  const input = one(entry.styleInputs.filter(i => i.id === element));
  for (const [key, value] of Object.entries(input.reference)) assert.deepEqual(reference.styles[r.style][key], value);
  assert.equal(Object.keys(input.reference).length, 89);
  for (const [scalar, stage] of [['astylar', 'resolvedStyle'], ['astylarNormalResolvedStyle', 'normalResolvedStyle'], ['astylarInteractionResolvedStyle', 'interactionResolvedStyle']])
    assert.deepEqual(input[scalar], a[stage]);
  const relevant = key => /^(padding.*|margin.*|flexdirection|all)$/.test(key.replaceAll('-', '').toLowerCase());
  const nativeRequests = node => {
    assert.deepEqual(Object.keys(node.inline).filter(relevant), []);
    return node.rules.map(i => reference.rules[i]).filter(rule => rule.active).flatMap(rule =>
      Object.entries(rule.declarations).filter(([key]) => relevant(key))
        .map(([key, value]) => ({ selector: rule.selector, key, ...value })));
  };
  const candidateRequests = node => {
    assert.equal(node.authored.style, undefined); assert.equal(node.authored.attributes?.style, undefined);
    return candidate.rules.filter(rule => rootInitialSelectorCanApply(rule.selector, node.authored)).flatMap(rule =>
        Object.entries(rule).filter(([key]) => relevant(key)).map(([key, value]) => ({ selector: rule.selector, key, value })));
  };
  const headers = reference.nodes.filter(n => n.attributes?.class?.split(/\s+/).includes('mat-horizontal-stepper-header'));
  assert.equal(headers.length, 2);
  for (const header of headers) {
    assert.equal(reference.styles[header.style].padding, '0px 24px');
    assert.deepEqual(nativeRequests(header), ['top', 'right', 'bottom', 'left'].map(side => ({
      selector: '.mat-horizontal-stepper-header', key: 'padding-' + side,
      value: ['left', 'right'].includes(side) ? '24px' : '0px', important: false,
    })));
  }
  for (const id of ['step-details', 'step-review'])
    for (const stage of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle'])
      assert.equal(one(candidate.nodes.filter(n => n.authored?.id === id))[stage].padding, '0 24px');
  assert.deepEqual(nativeRequests(r), []);
  const host = element === 'stepper-primary';
  assert.deepEqual(candidateRequests(a), host ? [
    { selector: '.stepper', key: 'flexDirection', value: 'column' },
    { selector: '.stepper', key: 'padding', value: '0 24px' },
  ] : [{ selector: '.step-text', key: 'marginLeft', value: '8px' }]);
  const native = reference.styles[r.style];
  if (host) {
    assert.equal(native.paddingLeft, '0px'); assert.equal(native.paddingRight, '0px');
    assert.equal(native.flexDirection, 'row'); assert.equal(native.display, 'block');
    const wrapper = one(reference.nodes.filter(n => n.parent === r.key && n.attributes?.class === 'mat-horizontal-stepper-wrapper'));
    assert.equal(reference.styles[wrapper.style].display, 'flex');
    assert.equal(reference.styles[wrapper.style].flexDirection, 'column');
    assert.deepEqual(nativeRequests(wrapper), [{ selector: '.mat-horizontal-stepper-wrapper', key: 'flex-direction', value: 'column', important: false }]);
  } else {
    assert.equal(r.type, 'span'); assert.equal(a.authored.type, 'span');
    assert.equal(r.ownText, element === 'step-details-text' ? 'Details' : 'Review');
    assert.equal(a.authored.textContent, r.ownText); assert.equal(native.marginLeft, '0px');
    const header = one(reference.nodes.filter(n => r.key.startsWith(n.key + '/') &&
      n.attributes?.class?.split(/\s+/).includes('mat-horizontal-stepper-header')));
    const icon = one(reference.nodes.filter(n => n.parent === header.key && n.attributes?.class?.split(/\s+/).includes('mat-step-icon')));
    assert.deepEqual(nativeRequests(icon), [{ selector: '.mat-horizontal-stepper-header .mat-step-icon', key: 'margin-right', value: '8px', important: false }]);
    assert.equal(reference.styles[icon.style].marginRight, '8px');
    const parent = one(candidate.nodes.filter(n => n.key === a.parent));
    assert.equal(parent.authored.id, element.replace('-text', ''));
    const siblings = candidate.nodes.filter(n => n.parent === parent.key);
    assert.deepEqual(siblings.map(n => n.authored.id), [element.replace('-text', '-badge'), element]);
    for (const stage of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle'])
      assert.equal(siblings[0][stage].margin, '0');
  }
  for (const stage of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle']) {
    assert.equal(a[stage].padding, host ? '0 24px' : '0');
    assert.equal(a[stage].margin, '0');
    assert.equal(a[stage].flexDirection, host ? 'column' : 'row');
    if (!host) assert.equal(a[stage].marginLeft, '8px');
  }
  return { referenceNode: r.key, astylarNode: a.key, mapping, position,
    referenceRequests: nativeRequests(r), candidateRequests: candidateRequests(a),
    firstDivergence: host ? 'native block host and column wrapper replaced with padded column host'
      : 'native icon right margin replaced with text left margin in a flattened positioned header',
    inputEquivalent: false, renderingEquivalent: false, coreDefectProven: false,
    compensationIntentProven: false, usedSpacingEquivalenceProven: false };
}

export function applyStepperSpacingReviews(rows, cases, inventory, normalize) {
  for (const element of ['stepper-primary', 'step-details-text', 'step-review-text'])
    rows = applyModalBoxReview(rows, cases, inventory, normalize, {
      family: 'stepper', element,
      properties: element === 'stepper-primary' ? ['paddingLeft', 'paddingRight', 'flexDirection'] : ['marginLeft'],
      prove: (entry, reference, candidate) => proveStepperSpacingComposition(entry, reference, candidate, element),
      attribution: 'reviewed-stepper-spacing-composition-substitution', owner: 'showcase stepper structure and spacing authoring',
      justification: 'Native block host contains a column wrapper and in-flow padded headers; candidate adds host padding and uses positioned headers. Native icon right margin becomes a left margin on a flattened label. These are authored owner/composition substitutions, not equal-input evidence of broken padding or flex direction. Equal nominal eight-pixel spacing does not prove whole-header equivalence; retain the independent position and state findings and restore native structure before renderer parity assessment.',
    });
  return rows;
}

export function validateStepperSpacingReviews(rows, originalRows, cases, inventory, normalize) {
  try {
    const select = values => values.filter(r => r.attribution === 'reviewed-stepper-spacing-composition-substitution');
    assert.equal(JSON.stringify(select(rows)), JSON.stringify(select(applyStepperSpacingReviews(originalRows, cases, inventory, normalize))));
    return [];
  } catch (error) { return [`stepper spacing composition lacks original evidence: ${error.message}`]; }
}

export function proveListSpacingComposition(entry, reference, candidate) {
  assert.equal(entry.family, 'list');
  const mapping = proveDisplayRequest(entry, reference, candidate, 'list-primary');
  const r = reference.nodes.find(n => n.key === mapping.referenceNode);
  const a = candidate.nodes.find(n => n.key === mapping.astylarNode);
  const relevant = key => /^(padding.*|flexdirection|all)$/.test(key.replaceAll('-', '').toLowerCase());
  assert.deepEqual(Object.keys(r.inline).filter(relevant), []);
  assert.equal(a.authored.style, undefined);
  const requests = r.rules.map(i => reference.rules[i]).filter(rule => rule.active).flatMap(rule => {
    assert.doesNotMatch(rule.cssText, /\\/);
    return Object.entries(rule.declarations).filter(([key]) => relevant(key))
      .map(([key, value]) => ({ selector: rule.selector, conditions: rule.conditions, key, ...value }));
  });
  assert.deepEqual(requests, ['top', 'right', 'bottom', 'left'].map(side => ({ selector: '.mdc-list',
    conditions: [], key: 'padding-' + side, value: ['top', 'bottom'].includes(side) ? '8px' : '0px', important: false })));
  const ownRequests = node => candidate.rules.filter(rule => rootInitialSelectorCanApply(rule.selector, node.authored))
    .flatMap(rule => Object.entries(rule).filter(([key]) => relevant(key))
      .map(([key, value]) => ({ selector: rule.selector, key, value })));
  assert.deepEqual(ownRequests(a), [{ selector: '.material-list', key: 'flexDirection', value: 'column' }]);
  const native = reference.styles[r.style];
  assert.equal(native.paddingTop, '8px'); assert.equal(native.paddingBottom, '8px');
  assert.equal(native.flexDirection, 'row'); assert.equal(native.display, 'block');
  for (const stage of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle'])
    assert.deepEqual(Object.fromEntries(Object.entries(a[stage]).filter(([key]) => relevant(key))), { padding: '0', flexDirection: 'column' });
  const rc = reference.nodes.filter(n => n.parent === r.key), ac = candidate.nodes.filter(n => n.parent === a.key);
  assert.equal(rc.length, 2); assert.deepEqual(rc.map(n => n.type), ['mat-list-item', 'mat-list-item']);
  assert.deepEqual(ac.map(n => n.authored.id), ['list-inbox', 'list-archive']);
  const expected = { light: ['48px', '56px'], dark: ['48px', '56px'], contrast: ['24px', '40px'], custom: ['40px', '48px'] }[entry.profile];
  assert.ok(expected);
  const children = rc.map((rn, index) => {
    const an = ac[index], rs = reference.styles[rn.style];
    const text = index === 0 ? 'Inbox' : 'Archive';
    assert.equal(reference.nodes.filter(n => n.key.startsWith(rn.key + '/')).map(n => n.ownText ?? '').join(''), text);
    const labels = candidate.nodes.filter(n => n.parent === an.key); assert.equal(labels.length, 1);
    assert.equal(labels[0].authored.textContent, text); assert.equal(labels[0].authored.type, 'span');
    assert.equal(an.authored.type, 'div'); assert.equal(an.authored.style, undefined);
    assert.equal(an.authored.attributes?.style, undefined);
    const heightRequests = candidate.rules.filter(rule => rootInitialSelectorCanApply(rule.selector, an.authored))
      .flatMap(rule => Object.entries(rule).filter(([key]) => /^(height|minheight|maxheight|blocksize|minblocksize|maxblocksize|all)$/.test(key.replaceAll('-', '').toLowerCase()))
        .map(([key, value]) => ({ selector: rule.selector, key, value })));
    assert.deepEqual(heightRequests, [{ selector: '.list-item', key: 'height', value: expected[1] }]);
    assert.equal(rs.height, expected[0]); assert.equal(rs.padding, '0px 16px');
    for (const stage of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle']) {
      assert.equal(an[stage].height, expected[1]); assert.equal(an[stage].padding, '0');
      assert.equal(an[stage].alignItems, 'center'); assert.equal(labels[0][stage].marginLeft, '16px');
    }
    return { referenceNode: rn.key, astylarNode: an.key, text,
      referenceComputedHeight: rs.height, candidateLocalHeight: expected[1],
      candidateHeightRequests: heightRequests,
      referenceComputedPadding: rs.padding, candidatePadding: '0', candidateLabelMarginLeft: '16px' };
  });
  return { referenceNode: r.key, astylarNode: a.key, mapping, referenceRequests: requests,
    candidateHostRequests: ownRequests(a), children, inputEquivalent: false, renderingEquivalent: false,
    firstDivergence: 'padded block list replaced by unpadded column flex list with different row heights',
    coreDefectProven: false, compensationIntentProven: false, candidateUsedLayoutVerified: false };
}

export function applyListSpacingReviews(rows, cases, inventory, normalize) {
  return applyModalBoxReview(rows, cases, inventory, normalize, {
    family: 'list', element: 'list-primary', properties: ['paddingTop', 'paddingBottom', 'flexDirection'],
    prove: proveListSpacingComposition, attribution: 'reviewed-list-spacing-composition-substitution',
    owner: 'showcase list block-to-flex and row-size authoring',
    justification: 'Native block list requests 8px top/bottom padding; candidate column flex list omits padding and has larger fixed row heights with label margins instead of native row padding. The native computed flex-direction:row is not an authored flex layout request on this block owner. Matching two-row total height in some themes cannot establish equivalent inputs or internal spacing, and contrast row inflation differs. Preserve this composition substitution without claiming a core padding/flex defect or proving historical compensation intent.',
  });
}

export function validateListSpacingReviews(rows, originalRows, cases, inventory, normalize) {
  try {
    const select = values => values.filter(r => r.attribution === 'reviewed-list-spacing-composition-substitution');
    assert.equal(JSON.stringify(select(rows)), JSON.stringify(select(applyListSpacingReviews(originalRows, cases, inventory, normalize))));
    return [];
  } catch (error) { return [`list spacing composition lacks original evidence: ${error.message}`]; }
}

// Explicit requests only. Radio/tab type defaults and toolbar blockification
// need different proofs; do not classify them by comparing computed strings.
export const displayRequestOwners = [
  ['button-toggle', 'button-toggle-one', 'mat-button-toggle', 'div', 'block', 'flex', null, '.button-toggle-option'],
  ['button-toggle', 'button-toggle-two', 'mat-button-toggle', 'div', 'block', 'flex', null, '.button-toggle-option'],
  ['button-toggle', 'button-toggle-primary', 'mat-button-toggle-group', 'div', 'inline-flex', 'flex', '.mat-button-toggle-standalone, .mat-button-toggle-group', '#button-toggle-primary'],
  ['checkbox', 'checkbox-primary', 'mat-checkbox', 'div', 'inline-block', 'flex', '.mat-mdc-checkbox', '#checkbox-primary'],
  ['dialog', 'dialog-cancel', 'button', 'button', 'flex', 'block', '.mdc-button', null, 'inline-flex'],
  ['dialog', 'dialog-save', 'button', 'button', 'flex', 'block', '.mdc-button', null, 'inline-flex'],
  ['expansion', 'expansion-title', 'mat-panel-title', 'span', 'flex', 'inline', '.mat-expansion-panel-header-title, .mat-expansion-panel-header-description', null],
  ['grid-list', 'grid-tile-one', 'mat-grid-tile', 'div', 'block', 'flex', '.mat-grid-tile', '.grid-tile'],
  ['grid-list', 'grid-tile-two', 'mat-grid-tile', 'div', 'block', 'flex', '.mat-grid-tile', '.grid-tile'],
  ['list', 'list-primary', 'mat-list', 'div', 'block', 'flex', '.mat-mdc-list-base', '.material-list'],
  ['slide-toggle', 'slide-toggle-primary', 'mat-slide-toggle', 'div', 'inline-block', 'block', '.mat-mdc-slide-toggle', null],
  ['slider', 'slider-visual', 'mat-slider', 'showcase.material:range-visual', 'inline-block', 'block', '.mat-mdc-slider', null],
  ['stepper', 'stepper-primary', 'mat-stepper', 'div', 'block', 'flex', '.mat-stepper-vertical, .mat-stepper-horizontal', '.stepper'],
  ['tooltip', 'tooltip-popup', 'div', 'div', 'block', 'flex', null, '#tooltip-popup'],
  ['tree', 'tree-primary', 'mat-tree', 'div', 'block', 'flex', '.mat-tree', '.material-tree'],
];
export const displayBoundaryOwners = [
  ['radio', 'radio-primary', 'mat-radio-group', 'div', 'inline', 'block', null, null],
  ['tabs', 'tab-panel', 'span', 'showcase.material:tab-panel', 'inline', 'block', null, null],
  ['toolbar', 'toolbar-title', 'span', 'span', 'block', 'inline', null, null],
];

export function proveDisplayRequest(entry, reference, candidate, element) {
  const scope = [...displayRequestOwners, ...displayBoundaryOwners].find(([family, id]) => entry.family === family && id === element);
  assert.ok(scope);
  for (const tree of [reference, candidate]) {
    assert.deepEqual(tree.errors, []); assert.equal(tree.ruleEvidenceComplete, true);
    assert.equal(new Set(tree.nodes.map(n => n.key)).size, tree.nodes.length);
  }
  const inputs = entry.styleInputs.filter(i => i.id === element); assert.equal(inputs.length, 1);
  const input = inputs[0];
  let natives = reference.nodes.filter(n => n.attributes?.id === element || n.attributes?.['data-parity-id'] === element), identity;
  if (!natives.length) {
    identity = resolveOriginAliasPair(entry, reference, candidate, input);
    assert.ok(['mapped', 'mapped-with-scalar-rule-gap'].includes(identity.status));
    assert.deepEqual(identity.extraRules, []);
    if (identity.status === 'mapped') assert.deepEqual(identity.missingRules, []);
    else {
      assert.equal(element, 'tooltip-popup');
      // Preserve the existing overlay-rule gap; it is not a display request.
      assert.equal(identity.missingRules.length, 1);
      assert.ok(JSON.stringify(identity.missingRules).includes('.cdk-global-overlay-wrapper'));
      assert.ok(!/display|\ball\b/.test(JSON.stringify(identity.missingRules)));
    }
    natives = reference.nodes.filter(n => n.key === identity.referenceNode);
  }
  const candidates = candidate.nodes.filter(n => n.authored?.id === element);
  assert.equal(natives.length, 1); assert.equal(candidates.length, 1);
  const r = natives[0], a = candidates[0];
  assert.equal(r.type, scope[2]); assert.equal(a.authored.type, scope[3]);
  assert.equal(candidate.resolvedStyleEvidenceVersion, 2); assert.equal(candidate.resolvedStyleSource, 'core-style-inspection');
  assert.equal(input.astylarResolvedStyleEvidenceVersion, 2); assert.equal(Object.keys(input.reference).length, 89);
  for (const [key, value] of Object.entries(input.reference)) assert.deepEqual(reference.styles[r.style][key], value);
  const select = style => Object.fromEntries(Object.entries(style ?? {}).filter(([key]) => ['display', 'all'].includes(key.toLowerCase())));
  assert.deepEqual(select(r.inline), {}); assert.deepEqual(select(a.authored.style), {}); assert.equal(a.authored.attributes?.style, undefined);
  const nativeRules = r.rules.map(i => reference.rules[i]).filter(rule => rule.active);
  const nativeRequests = nativeRules.map(rule => ({ selector: rule.selector, conditions: rule.conditions, declarations: select(rule.declarations) })).filter(rule => Object.keys(rule.declarations).length);
  assert.deepEqual(nativeRequests, scope[6] ? [{ selector: scope[6], conditions: [], declarations: { display: { value: scope[8] ?? scope[4], important: false } } }] : []);
  const serialized = nativeRules.flatMap(rule => [...rule.cssText.matchAll(/(?:^|;)\s*(display|all)\s*:\s*([^;]*)(?=;|$)/gi)].map(([, key, value]) => ({ selector: rule.selector, key: key.toLowerCase(), value: value.trim() })));
  assert.deepEqual(serialized, scope[6] ? [{ selector: scope[6], key: 'display', value: scope[8] ?? scope[4] }] : []);
  const candidateRequests = candidate.rules.filter(rule => rootInitialSelectorCanApply(rule.selector, a.authored)).map(({ selector, ...style }) => ({ selector, declarations: select(style) })).filter(rule => Object.keys(rule.declarations).length);
  assert.deepEqual(candidateRequests, scope[7] ? [{ selector: scope[7], declarations: { display: scope[5] } }] : []);
  assert.equal(reference.styles[r.style].display, scope[4]);
  for (const [scalar, stage] of [['astylar', 'resolvedStyle'], ['astylarNormalResolvedStyle', 'normalResolvedStyle'], ['astylarInteractionResolvedStyle', 'interactionResolvedStyle']]) {
    assert.deepEqual(input[scalar], a[stage]); assert.deepEqual(select(a[stage]), { display: scope[5] });
  }
  const rp = reference.nodes.find(n => n.key === r.parent), ap = candidate.nodes.find(n => n.key === a.parent);
  assert.ok(rp); assert.ok(ap);
  if (scope[8]) assert.equal(reference.styles[rp.style].display, 'flex');
  if (['button-toggle-one', 'button-toggle-two'].includes(element)) assert.equal(reference.styles[rp.style].display, 'inline-flex');
  const rc = reference.nodes.filter(n => n.parent === r.key), ac = candidate.nodes.filter(n => n.parent === a.key);
  if (displayBoundaryOwners.includes(scope)) {
    assert.equal(ap.resolvedStyle.display, 'flex');
    assert.equal(reference.styles[rp.style].display, element === 'toolbar-title' ? 'flex' : 'block');
    if (element === 'radio-primary') {
      assert.equal(rp.type, 'section'); assert.equal(ap.authored.type, 'section');
      assert.deepEqual(rc.map(n => [n.type, reference.styles[n.style].position]), [['mat-radio-button', 'static'], ['mat-radio-button', 'static']]);
      assert.deepEqual(ac.map(n => [n.authored.type, n.resolvedStyle.position]), [['div', 'absolute'], ['div', 'absolute']]);
    } else {
      assert.deepEqual(rc, []); assert.deepEqual(ac, []);
      if (element === 'toolbar-title') {
        assert.equal(rp.type, 'mat-toolbar'); assert.equal(ap.authored.type, 'div');
        assert.equal(r.ownText, 'Material workspace'); assert.equal(a.authored.textContent, r.ownText);
      } else {
        assert.equal(rp.type, 'div'); assert.equal(ap.authored.type, 'div');
        assert.ok(['Overview content', 'Activity content'].includes(r.ownText));
        assert.equal(a.authored.textContent, undefined);
        assert.equal(a.authored.role, 'tabpanel');
        assert.ok(['Overview content', 'Activity content'].includes(a.authored.ariaLabel));
        assert.equal(typeof a.authored.data.selected, 'boolean');
        // Animation observations may show outgoing native text. Preserve both
        // states without claiming the plugin label is native rendered content.
      }
    }
  }
  return { referenceNode: r.key, astylarNode: a.key, identity, nativeRequests, candidateRequests,
    nativeComputedDisplay: scope[4], candidateLocalDisplay: scope[5],
    parentDisplays: { reference: reference.styles[rp.style].display, candidate: ap.resolvedStyle.display },
    ownerTypes: { reference: r.type, candidate: a.authored.type },
    directChildTypes: { reference: rc.map(n => n.type), candidate: ac.map(n => n.authored.type) },
    contentOwnership: { nativeOwnText: r.ownText, candidateText: a.authored.textContent, candidateLabel: a.authored.ariaLabel, candidateData: a.authored.data },
    structuralEquivalenceProven: false, candidateUsedDisplayVerified: false, renderingEquivalent: false };
}

export function applyDisplayRequestReviews(rows, cases, inventory, normalize) {
  for (const [family, element] of displayRequestOwners) rows = applyModalBoxReview(rows, cases, inventory, normalize, {
    family, element, properties: ['display'],
    prove: (entry, r, a) => proveDisplayRequest(entry, r, a, element),
    classification: 'application-plugin-authoring-defect', attribution: 'reviewed-display-request-substitution',
    owner: 'comparison display authoring and wrapper structure',
    justification: 'Exact native display requests differ from candidate requests or are omitted; preserve browser computed versus candidate local stages and differing owner/child types. This identifies unequal input authoring, not equivalent wrapper flattening, candidate used display, a core defect, or rendering parity. Browser blockification does not erase the native inner flex request.',
  });
  return rows;
}

export function applyDisplayBoundaryReviews(rows, cases, inventory, normalize) {
  for (const [family, element] of displayBoundaryOwners) {
    const toolbar = family === 'toolbar';
    rows = applyModalBoxReview(rows, cases, inventory, normalize, {
      family, element, properties: ['display'],
      prove: (entry, r, a) => proveDisplayRequest(entry, r, a, element),
      classification: toolbar ? 'parity-harness-defect' : 'application-plugin-authoring-defect',
      attribution: toolbar ? 'reviewed-display-computed-local-boundary' : 'reviewed-display-owner-substitution',
      owner: toolbar ? 'computed flex-item versus local type-default measurement' : 'comparison element/plugin and flow ownership',
      justification: toolbar
        ? 'Both owners are spans without authored display/reset requests under flex parents. Native computed block is compared with candidate local inline, not candidate used display. Preserve other style differences; this is an observation-stage boundary, not proof of correct flex-item layout or rendering equivalence.'
        : family === 'radio'
          ? 'Native inline mat-radio-group with two static mat-radio-button children is replaced by a locally block div and two absolute div children; neither host requests display. Element defaults, parent layout and child flow ownership differ before core layout. This is not evidence that equal authored inputs fail in core or that the representations are equivalent.'
          : 'Native inline span owns text; candidate is a locally block private tab-panel plugin with no authored text children, using label/data state instead. Preserve both content owners and state values; this structural/paint ownership substitution is not a core display defect or a proven equivalent representation.',
    });
  }
  return rows;
}
