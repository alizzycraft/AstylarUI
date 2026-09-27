import assert from 'node:assert/strict';
import { applyModalBoxReview } from './modal-position-inspection.mjs';
import { resolveOriginAliasPair } from './origin-alias-mapping-evidence.mjs';
import { rootInitialSelectorCanApply } from './root-initial-style-evidence.mjs';
import { inspectOverlayOwnerDeclarations } from './overlay-owner-declaration-review.mjs';

export const explicitNowrapTargets = Object.freeze({
  'card-title': ['card', '.card-title', 52],
  'card-copy': ['card', '.card-copy', 52],
  'paginator-range': ['paginator', '#paginator-size, #paginator-page-size, #paginator-range', 52],
  'paginator-size': ['paginator', '#paginator-size, #paginator-page-size, #paginator-range', 52],
  'checkbox-label': ['checkbox', '.checkbox-label', 68],
  'slide-toggle-label': ['slide-toggle', '.switch-label', 68],
});
export const explicitNowrapAttribution = 'reviewed-explicit-nowrap-input-substitution';
const one = xs => { assert.equal(xs.length, 1); return xs[0]; };
const keyOf = e => `${e.kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`;

// Authored mismatch only. Keep owner types and every local stage; do not infer
// a used width, raster wrapping failure, or deliberate compensation intent.
export function proveExplicitNowrap(entry, input, reference, candidate) {
  const [family, selector] = explicitNowrapTargets[input.id];
  assert.equal(entry.family, family);
  const ast = one(candidate.nodes.filter(n => n.authored?.id === input.id));
  let native;
  if (family === 'paginator') {
    const identity = resolveOriginAliasPair(entry, reference, candidate, input);
    assert.equal(identity.status, 'mapped');
    assert.deepEqual(identity.missingRules, []); assert.deepEqual(identity.extraRules, []);
    assert.equal(identity.candidateNode, ast.key);
    native = one(reference.nodes.filter(n => n.key === identity.referenceNode));
  } else native = one(reference.nodes.filter(n => n.attributes?.id === input.id));
  assert.equal(native.type, input.referenceStructure.type);
  assert.equal(ast.authored.type, input.astylarStructure.type);
  assert.equal(reference.styles[native.style].whiteSpace, 'normal');
  assert.equal(input.reference.whiteSpace, 'normal');
  for (const [stage, scalar] of [
    ['resolvedStyle', 'astylar'], ['normalResolvedStyle', 'astylarNormalResolvedStyle'],
    ['interactionResolvedStyle', 'astylarInteractionResolvedStyle'],
  ]) {
    assert.deepEqual(ast[stage], input[scalar]);
    assert.equal(ast[stage].whiteSpace, 'nowrap');
  }
  assert.ok(candidate.rules.some(r => r.selector === selector && r.whiteSpace === 'nowrap'));
  return { case: keyOf(entry), element: input.id, referenceNode: native.key,
    astylarNode: ast.key, referenceType: native.type, candidateType: ast.authored.type,
    selector, reference: 'normal', candidate: 'nowrap',
    classification: 'application-plugin-authoring-defect',
    inputEquivalent: false, rendererCauseProven: false, renderingEquivalent: false };
}

export function applyExplicitNowrap(rows, cases, inventory, normalize) {
  return Object.entries(explicitNowrapTargets).reduce((values, [element, [family]]) =>
    applyModalBoxReview(values, cases, inventory, normalize, {
      family, element, properties: ['whiteSpace'], attribution: explicitNowrapAttribution,
      owner: 'showcase Material fixture text-wrapping input authoring',
      justification: 'The complete original owner/state population retains native normal wrapping versus an explicit candidate nowrap rule at comparison, normal and effective stages. Preserve unequal owner structure separately. The declaration predates later layout fixes; historical persistence does not prove that it deliberately concealed a renderer defect. This establishes unequal wrapping inputs, not responsive output or a renderer cause.',
      prove: (entry, reference, candidate) => proveExplicitNowrap(entry,
        one(entry.styleInputs.filter(i => i.id === element)), reference, candidate),
    }), rows);
}

export function validateExplicitNowrap(rows, originalRows, cases, inventory, normalize) {
  try {
    const selected = values => values.filter(r => r.attribution === explicitNowrapAttribution);
    assert.deepEqual(selected(rows), selected(applyExplicitNowrap(originalRows, cases, inventory, normalize)));
    return [];
  } catch (error) { return [`explicit nowrap inputs do not replay from original owners: ${error.message}`]; }
}

export const omittedNowrapTargets = Object.freeze({
  'tab-overview': ['tabs', 70], 'tab-activity': ['tabs', 70],
  'toolbar-action': ['toolbar', 52], 'toolbar-primary': ['toolbar', 52],
  'badge-count': ['badge', 52], 'button-toggle-one': ['button-toggle', 68],
  'button-toggle-two': ['button-toggle', 68], 'button-toggle-primary': ['button-toggle', 68],
});
export const omittedNowrapAttribution = 'reviewed-native-nowrap-request-omission';
const ancestry = (tree, node) => {
  const result = [], seen = new Set();
  while (node) {
    assert.ok(!seen.has(node.key)); seen.add(node.key); result.push(node);
    if (node.parent === null) return result;
    node = one(tree.nodes.filter(n => n.key === node.parent));
  }
  assert.fail('incomplete ancestry');
};
const wrappingRequest = key => ['whitespace', 'whitespacecollapse', 'textwrap',
  'textwrapmode', 'textwrapstyle', 'all'].includes(key.replaceAll('-', '').toLowerCase());

// A host's computed normal value does not describe its nested text owner.
// Prove the missing label request without approving the host's motion/defaults.
export function proveChipLabelWrapping(entry, input, reference, candidate, inventory) {
  assert.equal(entry.family, 'chips');
  assert.ok(['chip-0', 'chip-1'].includes(input.id));
  const host = one(reference.nodes.filter(n => n.attributes?.id === input.id));
  const astHost = one(candidate.nodes.filter(n => n.authored?.id === input.id));
  const native = one(reference.nodes.filter(n => n.key.startsWith(host.key + '/') &&
    String(n.attributes?.class).split(/\s+/).includes('mdc-evolution-chip__text-label')));
  const label = one(candidate.nodes.filter(n => n.parent === astHost.key && n.authored?.id === `${input.id}-label`));
  assert.equal(native.type, 'span'); assert.equal(label.authored.type, 'span');
  assert.equal(native.ownText.trim(), label.authored.textContent);
  assert.equal(reference.styles[native.style].whiteSpace, 'nowrap');
  const rule = one(native.rules.map(i => reference.rules[i]).filter(r => r.active &&
    r.selector === '.mdc-evolution-chip__text-label'));
  assert.equal(rule.declarations['white-space-collapse']?.value, 'collapse');
  assert.equal(rule.declarations['text-wrap-mode']?.value, 'nowrap');
  const path = ancestry(candidate, label).filter(n => n.key !== 'root');
  for (const n of path) {
    for (const style of [n.authored.style ?? {}, n.resolvedStyle, n.normalResolvedStyle, n.interactionResolvedStyle]) {
      assert.ok(style); assert.ok(!Object.keys(style).some(wrappingRequest));
    }
    assert.ok(!/(?:^|;)\s*(?:white-space(?:-collapse)?|text-wrap(?:-mode|-style)?|all)\s*:/i.test(n.authored.attributes?.style ?? ''));
    for (const applicable of candidate.rules.filter(r => rootInitialSelectorCanApply(r.selector, n.authored)))
      assert.ok(!Object.keys(applicable).some(wrappingRequest));
  }
  assert.equal(label.retainedText?.source, 'core-text-registry');
  const retained = inventory.styles[label.retainedText.style];
  assert.equal(retained.side, 'astylar'); assert.equal(retained.value.whiteSpace, undefined);
  assert.equal(label.paintedControlText, undefined);
  return { case: keyOf(entry), element: label.authored.id, referenceNode: native.key,
    astylarNode: label.key, selector: rule.selector, text: label.authored.textContent,
    reference: 'nowrap', candidateLocalDeclaration: '<omitted>',
    candidateCapturedPath: path.map(n => n.key), classification: 'application-plugin-authoring-defect',
    candidateComputedVerified: false, externalInheritanceVerified: false,
    hostMotionReviewed: false, rendererCauseProven: false, renderingEquivalent: false };
}

export function proveOmittedNowrap(entry, input, reference, candidate, inventory) {
  assert.equal(entry.family, omittedNowrapTargets[input.id][0]);
  const ast = one(candidate.nodes.filter(n => n.authored?.id === input.id));
  let native;
  if (input.id === 'badge-count') {
    const identity = resolveOriginAliasPair(entry, reference, candidate, input);
    assert.equal(identity.status, 'mapped');
    assert.deepEqual(identity.missingRules, []); assert.deepEqual(identity.extraRules, []);
    assert.equal(identity.candidateNode, ast.key);
    native = one(reference.nodes.filter(n => n.key === identity.referenceNode));
  } else native = one(reference.nodes.filter(n => n.attributes?.id === input.id));
  assert.equal(native.type, input.referenceStructure.type);
  assert.equal(ast.authored.type, input.astylarStructure.type);
  assert.equal(input.reference.whiteSpace, 'nowrap');
  assert.equal(reference.styles[native.style].whiteSpace, 'nowrap');
  const rp = ancestry(reference, native), ap = ancestry(candidate, ast);
  const requests = rp.flatMap(n => n.rules.map(i => reference.rules[i])
    .filter(rule => rule.active && rule.declarations['white-space-collapse']?.value === 'collapse' &&
      rule.declarations['text-wrap-mode']?.value === 'nowrap')
    .map(rule => ({ node: n.key, selector: rule.selector,
      declarations: Object.fromEntries(Object.entries(rule.declarations).filter(([key]) => wrappingRequest(key))) })));
  assert.ok(requests.length);
  for (const [stage, scalar] of [
    ['resolvedStyle', 'astylar'], ['normalResolvedStyle', 'astylarNormalResolvedStyle'],
    ['interactionResolvedStyle', 'astylarInteractionResolvedStyle'],
  ]) assert.deepEqual(ast[stage], input[scalar]);
  // Inspect only captured nodes, never assign a computed default to the
  // synthetic root. Reject a relevant request rather than assuming inheritance.
  const captured = ap.filter(n => n.key !== 'root');
  for (const n of captured) {
    for (const style of [n.authored.style ?? {}, n.resolvedStyle, n.normalResolvedStyle, n.interactionResolvedStyle]) {
      assert.ok(style); assert.ok(!Object.keys(style).some(wrappingRequest));
    }
    assert.ok(!/(?:^|;)\s*(?:white-space(?:-collapse)?|text-wrap(?:-mode|-style)?|all)\s*:/i.test(n.authored.attributes?.style ?? ''));
    for (const rule of candidate.rules.filter(rule => rootInitialSelectorCanApply(rule.selector, n.authored)))
      assert.ok(!Object.keys(rule).some(wrappingRequest));
  }
  let paint;
  if (['tab-overview', 'tab-activity', 'toolbar-action'].includes(input.id)) {
    assert.equal(ast.paintedControlText?.source, 'core-control-texture');
    assert.equal(ast.paintedControlText.text, ast.authored.value);
    const style = inventory.styles[ast.paintedControlText.style];
    assert.equal(style.side, 'astylar'); assert.equal(style.value.whiteSpace, 'normal');
    paint = { source: ast.paintedControlText.source, text: ast.paintedControlText.text, whiteSpace: 'normal' };
  } else assert.equal(ast.paintedControlText, undefined);
  return { case: keyOf(entry), element: input.id, referenceNode: native.key, astylarNode: ast.key,
    referenceType: native.type, candidateType: ast.authored.type, requests,
    referencePath: rp.map(n => n.key), candidateCapturedPath: captured.map(n => n.key),
    reference: 'nowrap', candidateLocalDeclaration: '<omitted>', ...(paint ? { paint } : {}),
    candidateComputedVerified: false, inputEquivalent: false, rendererCauseProven: false,
    renderingEquivalent: false, externalInheritanceVerified: false };
}

export function applyOmittedNowrap(rows, cases, inventory, normalize) {
  return Object.entries(omittedNowrapTargets).reduce((values, [element, [family]]) =>
    applyModalBoxReview(values, cases, inventory, normalize, {
      family, element, properties: ['whiteSpace'], attribution: omittedNowrapAttribution,
      owner: 'showcase Material native text-owner wrapping request translation',
      justification: 'Native owner ancestry explicitly supplies collapse/nowrap while candidate captured ancestry and applicable author rules omit the wrapping request. Local omission is not normalized to a computed value. Only tab and toolbar-action controls have separate captured normal paint values; wrapper and retained text observations do not inherit that conclusion. Preserve external inheritance, unequal structure, responsive wrapping and renderer correctness as separate obligations.',
      prove: (entry, reference, candidate) => proveOmittedNowrap(entry,
        one(entry.styleInputs.filter(i => i.id === element)), reference, candidate, inventory),
    }), rows);
}

export function validateOmittedNowrap(rows, originalRows, cases, inventory, normalize) {
  try {
    const selected = values => values.filter(r => r.attribution === omittedNowrapAttribution);
    assert.deepEqual(selected(rows), selected(applyOmittedNowrap(originalRows, cases, inventory, normalize)));
    return [];
  } catch (error) { return [`omitted native nowrap requests do not replay from original owners: ${error.message}`]; }
}

export const overlayNormalTargets = Object.freeze({
  'bottom-sheet-overlay': 'bottom-sheet', 'bottom-sheet-panel': 'bottom-sheet',
  'bottom-sheet-dismiss': 'bottom-sheet', 'bottom-sheet-copy': 'bottom-sheet',
  'snack-bar-overlay': 'snack-bar', 'snack-bar-surface': 'snack-bar',
  'dialog-title': 'dialog', 'dialog-copy': 'dialog', 'dialog-cancel': 'dialog',
  'dialog-save': 'dialog', 'dialog-panel': 'dialog', 'dialog-actions': 'dialog',
});
const transitionNone = { 'transition-behavior': 'normal', 'transition-duration': '0s',
  'transition-timing-function': 'ease', 'transition-delay': '0s', 'transition-property': 'none' };
const animationFields = new Set(['animation-name', 'animation-duration', 'animation-delay',
  'animation-timing-function', 'animation-iteration-count', 'animation-direction',
  'animation-fill-mode', 'animation-play-state', 'animation-timeline', 'animation-range-start', 'animation-range-end']);
const motionKey = key => /^(animation|transition)/.test(key.replaceAll('-', '').toLowerCase());
export function proveDialogWrappingMotion(trace, reference) {
  const overrides = [], disjoint = [];
  for (const node of trace.candidatePath) {
    for (const declarations of [node.inline, ...Object.values(node.declarations),
      ...node.possibleRules.map(r => r.declarations)])
      assert.ok(!Object.keys(declarations).some(motionKey));
  }
  for (const node of trace.referencePath) {
    assert.ok(!Object.keys(node.inline).some(motionKey));
    for (const request of node.rules) {
      const entries = Object.entries(request.declarations).filter(([key]) => motionKey(key));
      if (!entries.length) continue;
      assert.equal(request.active, true); assert.deepEqual(request.conditions, []);
      const rule = reference.rules[request.index];
      if (entries.some(([, d]) => d.value === '')) {
        const shorthand = { '.mat-mdc-dialog-inner-container': 'opacity linear var(--mat-dialog-transition-duration, 0ms)',
          '.mat-mdc-dialog-surface': 'transform var(--mat-dialog-transition-duration, 0ms) cubic-bezier(0, 0, 0.2, 1)' }[rule.selector];
        assert.ok(shorthand);
        assert.ok(rule.cssText.split(';').map(s => s.trim()).includes(`transition: ${shorthand}`));
        assert.deepEqual(Object.fromEntries(entries), Object.fromEntries(Object.keys(transitionNone)
          .map(key => [key, { value: '', important: false }])));
        const override = one(node.rules.filter(r => r.selector === `._mat-animation-noopable ${rule.selector}`));
        assert.equal(override.active, true); assert.deepEqual(override.conditions, []);
        assert.deepEqual(override.declarations, Object.fromEntries(Object.entries(transitionNone)
          .map(([key, value]) => [key, { value, important: false }])));
        // Exact class vs descendant-class selectors: 0,1,0 < 0,2,0.
        // Also bind their original sheet/order rather than relying on list order.
        const before = /^sheet:(\d+)\/(\d+)$/.exec(rule.source);
        const after = /^sheet:(\d+)\/(\d+)$/.exec(reference.rules[override.index].source);
        assert.ok(before && after); assert.equal(before[1], after[1]); assert.ok(+after[2] > +before[2]);
        overrides.push({ node: node.node, source: rule.source, cssText: rule.cssText,
          declarations: request.declarations, override: reference.rules[override.index] });
      } else {
        for (const [key, value] of entries) {
          assert.ok(Object.hasOwn(transitionNone, key) || animationFields.has(key), `${request.selector}: ${JSON.stringify(request.declarations)}`);
          assert.equal(typeof value.important, 'boolean');
          assert.ok(typeof value.value === 'string' && value.value.trim() && !/var\(|env\(|inherit|initial|revert|unset/.test(value.value));
        }
        if (entries.some(([key]) => key.startsWith('transition-')))
          assert.ok(['none', 'box-shadow'].includes(request.declarations['transition-property']?.value));
        if (entries.some(([key]) => key.startsWith('animation-')))
          assert.equal(request.declarations['animation-name']?.value, 'none');
        disjoint.push({ node: node.node, ...request });
      }
    }
  }
  assert.ok(overrides.length >= 2);
  return { overrides, disjoint, disposition: 'captured-wrapping-motion-targets-disjoint',
    animationSettlementVerified: false, indirectEffectsExcluded: false };
}
export const overlayNormalAttribution = 'reviewed-overlay-wrapping-observation-stage';
export function proveOverlayNormal(entry, input, reference, candidate) {
  assert.equal(entry.family, overlayNormalTargets[input.id]);
  assert.equal(input.reference.whiteSpace, 'normal');
  assert.equal(input.astylar.whiteSpace, undefined);
  const identity = resolveOriginAliasPair(entry, reference, candidate, input);
  const gap = ['bottom-sheet-overlay', 'snack-bar-overlay'].includes(input.id);
  assert.equal(identity.status, gap ? 'mapped-with-scalar-rule-gap' : 'mapped');
  assert.deepEqual(identity.extraRules, []);
  assert.deepEqual(identity.missingRules, gap ? [{ selector: '.cdk-global-overlay-wrapper',
    declarations: { 'z-index': { value: '1000', important: false } } }] : []);
  const trace = inspectOverlayOwnerDeclarations('whiteSpace', identity, reference, candidate);
  assert.equal(trace.hasRelevantRequest, false);
  const motionReview = entry.family === 'dialog' ? proveDialogWrappingMotion(trace, reference) : undefined;
  if (!motionReview) assert.equal(trace.hasMotionRequest, false);
  for (const node of trace.candidatePath)
    assert.ok(!/(?:^|;)\s*(?:white-space(?:-collapse)?|text-wrap(?:-mode|-style)?|all|animation[^:;]*|transition[^:;]*)\s*:/i
      .test(node.authored.attributes?.style ?? ''));
  assert.ok(trace.referencePath.every(n => n.computed === 'normal'));
  assert.ok(trace.candidatePath.filter(n => n.node !== 'root')
    .every(n => Object.values(n.localValues).every(v => v === '<omitted>')));
  // Native scalar rule omissions are preserved, not silently repaired; they
  // concern z-index, not a wrapping/reset/motion declaration.
  let nestedText;
  if (['bottom-sheet-dismiss', 'bottom-sheet-copy'].includes(input.id)) {
    const native = one(reference.nodes.filter(n => n.key === identity.referenceNode));
    const ast = one(candidate.nodes.filter(n => n.key === identity.candidateNode));
    assert.equal(native.type, 'a'); assert.equal(ast.authored.type, 'button');
    const leaf = one(reference.nodes.filter(n => n.key.startsWith(native.key + '/') &&
      String(n.attributes?.class).split(/\s+/).includes('mdc-list-item__primary-text')));
    assert.equal(reference.styles[leaf.style].whiteSpace, 'nowrap');
    assert.equal(leaf.ownText.trim(), ast.authored.value);
    nestedText = { referenceNode: leaf.key, whiteSpace: 'nowrap',
      sourceFinding: 'fixture-bottom-sheet-list-structure-and-token-substitution',
      inputEquivalent: false };
  }
  return { case: keyOf(entry), element: input.id, referenceNode: identity.referenceNode,
    astylarNode: identity.candidateNode, identity, trace, ...(nestedText ? { nestedText } : {}),
    ...(motionReview ? { motionReview } : {}),
    candidateComputedVerified: false, externalInheritanceVerified: false,
    inputEquivalent: false, renderingEquivalent: false };
}

export function applyOverlayNormal(rows, cases, inventory, normalize) {
  return Object.entries(overlayNormalTargets).reduce((values, [element, family]) =>
    applyModalBoxReview(values, cases, inventory, normalize, {
      family, element, properties: ['whiteSpace'], attribution: overlayNormalAttribution,
      classification: 'parity-harness-defect',
      owner: 'input audit computed host wrapping versus local declaration observation stages',
      justification: 'Exact mapped host scalars compare native computed normal with omitted candidate local declarations. Captured owner ancestry has no wrapping/reset request. Non-dialog owners have no motion requests; dialog variable-dependent transition shorthands have exact active higher-specificity noopable overrides, and remaining captured motion targets are none or box-shadow. This diagnoses different observation stages, not candidate computed normal or equivalent authoring/rendering. Preserve motion records without claiming settlement or excluding indirect effects, unrelated z-index scalar-rule gaps, and nested bottom-sheet nowrap labels. External inheritance, descendants, plugin/control consumption and final raster remain separate obligations.',
      prove: (entry, reference, candidate) => proveOverlayNormal(entry,
        one(entry.styleInputs.filter(i => i.id === element)), reference, candidate),
    }), rows);
}

export function validateOverlayNormal(rows, originalRows, cases, inventory, normalize) {
  try {
    const selected = values => values.filter(r => r.attribution === overlayNormalAttribution);
    assert.deepEqual(selected(rows), selected(applyOverlayNormal(originalRows, cases, inventory, normalize)));
    return [];
  } catch (error) { return [`overlay wrapping stages do not replay from original owners: ${error.message}`]; }
}

export const tableWrappingAttribution = 'reviewed-table-wrapping-observation-stage';
export function proveTableWrapping(entry, input, reference, candidate) {
  assert.equal(entry.family, 'table'); assert.equal(input.id, 'table-primary');
  const native = one(reference.nodes.filter(n => n.attributes?.id === input.id));
  const ast = one(candidate.nodes.filter(n => n.authored?.id === input.id));
  assert.equal(native.type, 'table'); assert.equal(input.referenceStructure.type, native.type);
  assert.equal(ast.authored.type, 'table'); assert.equal(input.astylarStructure.type, ast.authored.type);
  assert.equal(input.reference.whiteSpace, 'normal');
  for (const [stage, scalar] of [['resolvedStyle', 'astylar'], ['normalResolvedStyle', 'astylarNormalResolvedStyle'],
    ['interactionResolvedStyle', 'astylarInteractionResolvedStyle']]) assert.deepEqual(ast[stage], input[scalar]);
  const identity = { status: 'mapped', inputEquivalent: false, referenceNode: native.key,
    candidateNode: ast.key, referencePath: ancestry(reference, native).map(n => n.key),
    candidatePath: ancestry(candidate, ast).map(n => n.key), missingRules: [], extraRules: [] };
  const trace = inspectOverlayOwnerDeclarations('whiteSpace', identity, reference, candidate);
  assert.equal(trace.hasMotionRequest, false);
  for (const [index, node] of trace.referencePath.entries()) {
    assert.equal(node.computed, 'normal'); assert.deepEqual(node.inline, {});
    if (index) assert.deepEqual(node.rules, []);
    else {
      const rule = one(node.rules); assert.equal(rule.selector, '.mat-mdc-table');
      assert.equal(rule.active, true); assert.deepEqual(rule.conditions, []);
      assert.deepEqual(rule.declarations, {
        'white-space-collapse': { value: 'collapse', important: false },
        'text-wrap-mode': { value: 'wrap', important: false },
      });
    }
  }
  for (const node of trace.candidatePath) {
    assert.deepEqual(node.inline, {}); assert.deepEqual(node.possibleRules, []);
    assert.ok(Object.values(node.declarations).every(d => Object.keys(d).length === 0));
    assert.ok(Object.values(node.localValues).every(v => v === '<omitted>'));
    assert.ok(!/(?:^|;)\s*(?:white-space(?:-collapse)?|text-wrap(?:-mode|-style)?|all|animation[^:;]*|transition[^:;]*)\s*:/i.test(node.authored.attributes?.style ?? ''));
  }
  return { case: keyOf(entry), element: input.id, referenceNode: native.key, astylarNode: ast.key, trace,
    referenceExplicitRequestRetained: true, candidateComputedVerified: false,
    descendantConsumptionVerified: false, externalInheritanceVerified: false,
    inputEquivalent: false, renderingEquivalent: false };
}
export function applyTableWrapping(rows, cases, inventory, normalize) {
  return applyModalBoxReview(rows, cases, inventory, normalize, {
    family: 'table', element: 'table-primary', properties: ['whiteSpace'], attribution: tableWrappingAttribution,
    classification: 'parity-harness-defect', owner: 'input audit computed table wrapping versus local declaration stage',
    justification: 'The native table explicitly requests collapse/wrap and computes normal; candidate captured ancestry omits wrapping requests and local values. Preserve that native declaration rather than relabeling it unauthored or copying normal into the fixture. The scalar compares different observation stages. This does not establish candidate computed defaults, descendant inheritance/consumption, equal input semantics or renderer correctness.',
    prove: (entry, reference, candidate) => proveTableWrapping(entry,
      one(entry.styleInputs.filter(i => i.id === 'table-primary')), reference, candidate),
  });
}
export function validateTableWrapping(rows, originalRows, cases, inventory, normalize) {
  try {
    const selected = values => values.filter(r => r.attribution === tableWrappingAttribution);
    assert.deepEqual(selected(rows), selected(applyTableWrapping(originalRows, cases, inventory, normalize)));
    return [];
  } catch (error) { return [`table wrapping stages do not replay from original owners: ${error.message}`]; }
}

export const tabPanelWrappingAttribution = 'reviewed-private-tab-panel-wrapping-owner';
export function proveTabPanelWrapping(entry, input, reference, candidate) {
  assert.equal(entry.family, 'tabs'); assert.equal(input.id, 'tab-panel');
  const identity = resolveOriginAliasPair(entry, reference, candidate, input);
  assert.equal(identity.status, 'mapped'); assert.deepEqual(identity.missingRules, []); assert.deepEqual(identity.extraRules, []);
  const native = one(reference.nodes.filter(n => n.key === identity.referenceNode));
  const ast = one(candidate.nodes.filter(n => n.key === identity.candidateNode));
  assert.equal(input.reference.whiteSpace, 'normal'); assert.equal(reference.styles[native.style].whiteSpace, 'normal');
  assert.equal(ast.authored.type, 'showcase.material:tab-panel');
  assert.equal(ast.authored.ariaLabel, input.referenceStructure.text);
  assert.equal(candidate.nodes.filter(n => n.parent === ast.key).length, 0);
  assert.equal(ast.retainedText, undefined); assert.equal(ast.paintedControlText, undefined);
  for (const [stage, scalar] of [['resolvedStyle', 'astylar'], ['normalResolvedStyle', 'astylarNormalResolvedStyle'],
    ['interactionResolvedStyle', 'astylarInteractionResolvedStyle']]) {
    assert.deepEqual(ast[stage], input[scalar]); assert.equal(ast[stage].whiteSpace, undefined);
  }
  return { case: keyOf(entry), element: input.id, referenceNode: native.key, astylarNode: ast.key, identity,
    sourceFinding: 'plugin-tab-panel-competing-text-renderer',
    diagnostic: 'examples/material-showcase/src/app/material-plugin/tab-panel-wrapping-audit.spec.ts',
    candidateLocalDeclaration: '<omitted>', candidateComputedVerified: false,
    coreRendererCauseProven: false, motionEquivalenceVerified: false, renderingEquivalent: false };
}
export function applyTabPanelWrapping(rows, cases, inventory, normalize) {
  return applyModalBoxReview(rows, cases, inventory, normalize, {
    family: 'tabs', element: 'tab-panel', properties: ['whiteSpace'], attribution: tabPanelWrappingAttribution,
    owner: 'showcase Material private tab-panel text renderer',
    justification: 'The mapped native text owner computes normal; the candidate is a childless plugin leaf with no retained shared text or control paint record. The existing competing-text-renderer finding and its package-root narrow-width diagnostic locate wrapping outside shared CSS text layout: matched native normal text wraps while the private renderer draws the complete label at one baseline for both normal and nowrap. This is plugin ownership failure, not evidence that omitted candidate whiteSpace computes nowrap or that the shared renderer fails equal inputs. Preserve native motion and final raster as separate obligations.',
    prove: (entry, reference, candidate) => proveTabPanelWrapping(entry,
      one(entry.styleInputs.filter(i => i.id === 'tab-panel')), reference, candidate),
  });
}
export function validateTabPanelWrapping(rows, originalRows, cases, inventory, normalize) {
  try {
    const selected = values => values.filter(r => r.attribution === tabPanelWrappingAttribution);
    assert.deepEqual(selected(rows), selected(applyTabPanelWrapping(originalRows, cases, inventory, normalize)));
    return [];
  } catch (error) { return [`private tab wrapping owners do not replay: ${error.message}`]; }
}

export const chipHostWrappingAttribution = 'reviewed-chip-host-wrapping-observation-stage';
export function proveChipHostWrapping(entry, input, reference, candidate, inventory) {
  const nestedLabel = proveChipLabelWrapping(entry, input, reference, candidate, inventory);
  const native = one(reference.nodes.filter(n => n.attributes?.id === input.id));
  const ast = one(candidate.nodes.filter(n => n.authored?.id === input.id));
  assert.equal(input.reference.whiteSpace, 'normal');
  for (const [stage, scalar] of [['resolvedStyle', 'astylar'], ['normalResolvedStyle', 'astylarNormalResolvedStyle'],
    ['interactionResolvedStyle', 'astylarInteractionResolvedStyle']]) assert.deepEqual(ast[stage], input[scalar]);
  const identity = { status: 'mapped', inputEquivalent: false, referenceNode: native.key,
    candidateNode: ast.key, referencePath: ancestry(reference, native).map(n => n.key),
    candidatePath: ancestry(candidate, ast).map(n => n.key), missingRules: [], extraRules: [] };
  const trace = inspectOverlayOwnerDeclarations('whiteSpace', identity, reference, candidate);
  assert.equal(trace.hasRelevantRequest, false); assert.equal(trace.hasMotionRequest, true);
  for (const [index, node] of trace.referencePath.entries()) {
    assert.equal(node.computed, 'normal'); assert.deepEqual(node.inline, {});
    if (index) assert.deepEqual(node.rules, []);
    else {
      const rule = one(node.rules);
      assert.equal(rule.selector, '.mat-mdc-standard-chip._mat-animation-noopable, .mat-mdc-standard-chip._mat-animation-noopable .mdc-evolution-chip__graphic, .mat-mdc-standard-chip._mat-animation-noopable .mdc-evolution-chip__checkmark, .mat-mdc-standard-chip._mat-animation-noopable .mdc-evolution-chip__checkmark-path');
      assert.equal(rule.active, true); assert.deepEqual(rule.conditions, []);
      assert.deepEqual(rule.declarations, {
        'transition-duration': { value: '1ms', important: false },
        'animation-duration': { value: '1ms', important: false },
      });
    }
  }
  for (const node of trace.candidatePath) {
    assert.deepEqual(node.inline, {}); assert.deepEqual(node.possibleRules, []);
    assert.ok(Object.values(node.declarations).every(d => Object.keys(d).length === 0));
    assert.ok(Object.values(node.localValues).every(v => v === '<omitted>'));
    assert.ok(!/(?:^|;)\s*(?:white-space(?:-collapse)?|text-wrap(?:-mode|-style)?|all|animation[^:;]*|transition[^:;]*)\s*:/i.test(node.authored.attributes?.style ?? ''));
  }
  // Duration-only declarations cannot establish motion targets or settlement.
  // Classify the observation boundary, not initial-value or motion equivalence.
  return { case: keyOf(entry), element: input.id, referenceNode: native.key, astylarNode: ast.key,
    trace, nestedLabel, motionDisposition: 'duration-only-declarations-retained-targets-unverified',
    animationSettlementVerified: false, indirectEffectsExcluded: false,
    candidateComputedVerified: false, externalInheritanceVerified: false,
    rendererCauseProven: false, inputEquivalent: false, renderingEquivalent: false };
}
export function applyChipHostWrapping(rows, cases, inventory, normalize) {
  return ['chip-0', 'chip-1'].reduce((values, element) => applyModalBoxReview(values, cases, inventory, normalize, {
    family: 'chips', element, properties: ['whiteSpace'], attribution: chipHostWrappingAttribution,
    classification: 'parity-harness-defect', owner: 'input audit chip host observation stage; separate nested label authoring',
    justification: 'Native computed host normal and omitted candidate local declarations are different observation stages, not proof of equivalent defaults. Preserve the active native 1ms duration-only motion declarations without inferring targets, settlement or absence of indirect effects. Separately retain the nested native label collapse/nowrap request omitted from candidate ancestry and retained label style. This classifies the host measurement boundary while retaining the label authoring defect; it does not approve equal input, motion, computed candidate wrapping or renderer correctness.',
    prove: (entry, reference, candidate) => proveChipHostWrapping(entry,
      one(entry.styleInputs.filter(i => i.id === element)), reference, candidate, inventory),
  }), rows);
}
export function validateChipHostWrapping(rows, originalRows, cases, inventory, normalize) {
  try {
    const selected = values => values.filter(r => r.attribution === chipHostWrappingAttribution);
    assert.deepEqual(selected(rows), selected(applyChipHostWrapping(originalRows, cases, inventory, normalize)));
    return [];
  } catch (error) { return [`chip host wrapping stages do not replay: ${error.message}`]; }
}

export const wrappingAttributions = Object.freeze([explicitNowrapAttribution, omittedNowrapAttribution,
  overlayNormalAttribution, tableWrappingAttribution, tabPanelWrappingAttribution, chipHostWrappingAttribution]);
export function applyWrappingReviews(rows, cases, inventory, normalize) {
  return [applyExplicitNowrap, applyOmittedNowrap, applyOverlayNormal, applyTableWrapping,
    applyTabPanelWrapping, applyChipHostWrapping].reduce((values, apply) => apply(values, cases, inventory, normalize), rows);
}
export function validateWrappingReviews(rows, originalRows, cases, inventory, normalize) {
  return [validateExplicitNowrap, validateOmittedNowrap, validateOverlayNormal, validateTableWrapping,
    validateTabPanelWrapping, validateChipHostWrapping].flatMap(validate => validate(rows, originalRows, cases, inventory, normalize));
}
