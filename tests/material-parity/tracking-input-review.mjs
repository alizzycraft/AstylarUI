import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { applyModalBoxReview } from './modal-position-inspection.mjs';
import { inspectOverlayOwnerDeclarations } from './overlay-owner-declaration-review.mjs';
import { rootInitialSelectorCanApply } from './root-initial-style-evidence.mjs';
import { inspectRangeFontReset } from '../../scripts/audit-material-range-font-reset.mjs';
import { resolveOriginAliasPair } from './origin-alias-mapping-evidence.mjs';

const one = xs => { assert.equal(xs.length, 1); return xs[0]; };
export const rangeLineHeightAttribution = 'reviewed-range-line-height-inheritance-omission';
export function applyRangeLineHeights(rows, cases, inventory, normalize) {
  return ['slider-start', 'slider-primary'].reduce((values, element) => applyModalBoxReview(values, cases, inventory, normalize, {
    family: 'slider', element, properties: ['lineHeight'], attribution: rangeLineHeightAttribution,
    owner: 'Material control font reset translation',
    justification: 'The native range input explicitly requests inherited line-height and computes normal. The candidate captured owner-to-root path omits that request. Preserve the authoring mismatch without treating omitted as computed normal, deriving pixel line boxes, or attributing slider gesture/paint defects to typography.',
    prove: (entry, reference, candidate) => proveRangeLineHeight(entry,
      one(entry.styleInputs.filter(i => i.id === element)), reference, candidate),
  }), rows);
}
export function proveRangeLineHeight(entry, input, reference, candidate) {
  assert.equal(entry.family, 'slider');
  // Reuse the independently established input/range owner paths and reset
  // boundary; the earlier proof's font-size conclusion is not a line-height proof.
  const owners = inspectRangeFontReset(input, reference, candidate);
  const relevant = key => ['lineheight', 'font', 'all'].includes(key.replaceAll('-', '').toLowerCase());
  const referencePath = owners.referencePath.map(({ key }) => {
    const node = one(reference.nodes.filter(n => n.key === key));
    assert.equal(reference.styles[node.style].lineHeight, 'normal');
    assert.ok(Object.keys(node.inline).every(k => !relevant(k)));
    const requests = node.rules.map(i => reference.rules[i]).filter(r => r.active && Object.keys(r.declarations).some(relevant));
    if (key === owners.referencePath[0].key) {
      assert.equal(requests.length, 1);
      assert.equal(requests[0].selector, 'button, input, select');
      assert.deepEqual(requests[0].declarations['line-height'], { value: 'inherit', important: false });
      assert.equal(requests[0].declarations.font, undefined); assert.equal(requests[0].declarations.all, undefined);
    } else assert.equal(requests.length, 0);
    return { key, computed: 'normal', requests };
  });
  for (const { key } of owners.candidatePath) {
    const node = one(candidate.nodes.filter(n => n.key === key));
    assert.equal(node.authored.style, undefined); assert.equal(node.authored.attributes?.style, undefined);
    for (const stage of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle'])
      assert.ok(Object.keys(node[stage]).every(k => !relevant(k)));
    for (const rule of candidate.rules.filter(r => rootInitialSelectorCanApply(r.selector, node.authored)))
      assert.ok(Object.keys(rule).every(k => !relevant(k)));
  }
  assert.equal(input.reference.lineHeight, 'normal');
  for (const [stage, scalar] of [['resolvedStyle', 'astylar'], ['normalResolvedStyle', 'astylarNormalResolvedStyle'], ['interactionResolvedStyle', 'astylarInteractionResolvedStyle']]) {
    const node = one(candidate.nodes.filter(n => n.key === owners.candidatePath[0].key));
    assert.deepEqual(node[stage], input[scalar]);
  }
  return { case: keyOf(entry), element: input.id, referenceNode: referencePath[0].key,
    astylarNode: owners.candidatePath[0].key, referencePath, candidatePath: owners.candidatePath.map(n => n.key),
    classification: 'application-plugin-authoring-defect', owner: 'Material control font reset translation',
    candidateComputedVerified: false, rendererCauseProven: false, inputEquivalent: false, renderingEquivalent: false,
    limitation: 'Explicit inherited line-height is absent from the candidate captured path; normal is not a pixel line box or proof of current slider paint/gesture causality.' };
}
const keyOf = e => `${e.kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`;
const targets = { 'checkbox-label': 'checkbox', 'radio-solo-label': 'radio', 'radio-team-label': 'radio',
  'slide-toggle-label': 'slide-toggle', 'expansion-title': 'expansion' };
export const trackingLabelAttribution = 'reviewed-scalar-component-tracking-omission';

// Caller supplies authenticated original inventory and independently replayed
// retained typography. This join cannot authenticate a detached retained report.
export function proveTrackingLabel(entry, input, reference, candidate, retained) {
  return proveComponentTextMetric(entry, input, reference, candidate, retained, 'letterSpacing');
}
function proveComponentTextMetric(entry, input, reference, candidate, retained, property) {
  assert.equal(entry.family, targets[input.id]);
  assert.ok(['letterSpacing', 'lineHeight'].includes(property));
  if (property === 'lineHeight') assert.notEqual(entry.family, 'expansion');
  const native = one(reference.nodes.filter(n => n.attributes?.id === input.id));
  const ast = one(candidate.nodes.filter(n => n.authored?.id === input.id));
  const expected = property === 'lineHeight' ? '20px' : entry.family === 'expansion' ? '0.144px' : '0.256px';
  const retainedValue = property === 'lineHeight' ? 'normal' : '0';
  assert.equal(input.reference[property], expected);
  assert.equal(Object.keys(input.reference).length, 89);
  for (const [key, value] of Object.entries(input.reference)) assert.equal(reference.styles[native.style][key], value);
  for (const [stage, scalar] of [['resolvedStyle', 'astylar'], ['normalResolvedStyle', 'astylarNormalResolvedStyle'],
    ['interactionResolvedStyle', 'astylarInteractionResolvedStyle']]) {
    assert.deepEqual(ast[stage], input[scalar]); assert.equal(ast[stage][property], undefined);
  }
  const key = keyOf(entry);
  const proof = one(retained.differences.filter(d => d.case === key && d.element === input.id && d.property === property));
  const comparison = one(retained.comparisons.filter(d => d.case === key && d.element === input.id));
  for (const value of [proof, comparison]) {
    assert.equal(value.referenceNode, native.key); assert.equal(value.astylarNode, ast.key);
    assert.equal(value.source, 'core-text-registry'); assert.equal(value.currentPseudoStatePaintVerified, false);
  }
  assert.equal(proof.revision, comparison.revision);
  assert.equal(proof.attribution, 'reviewed-omitted-component-text-metric');
  assert.equal(proof.classification, 'application-plugin-authoring-defect'); assert.equal(proof.inputEquivalent, false);
  assert.deepEqual(proof.values, { reference: expected, retained: retainedValue, normal: undefined, effective: undefined });
  assert.deepEqual(comparison.properties[property], proof.values);
  const evidence = proof.reviewEvidence;
  assert.equal(evidence.sourceFinding, 'fixture-retained-component-text-metrics-omitted');
  assert.equal(evidence.property, property); assert.equal(evidence.referenceComputed, expected);
  assert.equal(evidence.candidateRetained, retainedValue);
  assert.equal(evidence.referenceChain[0].node, native.key); assert.equal(evidence.candidateChain[0].node, ast.key);
  assert.equal(evidence.referenceRule.active, true);
  assert.ok(evidence.referenceRule.declarations[property === 'lineHeight' ? 'line-height' : 'letter-spacing'].value.startsWith('var(--mat-'));
  return { case: key, element: input.id, referenceNode: native.key, astylarNode: ast.key,
    sourceAttribution: proof.attribution, retainedProofSha256: createHash('sha256').update(JSON.stringify(proof)).digest('hex'),
    candidateComputedVerified: false, currentPseudoStatePaintVerified: false,
    rendererCauseProven: false, inputEquivalent: false, renderingEquivalent: false };
}
export const componentLineHeightAttribution = 'reviewed-scalar-component-line-height-omission';
export function applyComponentLineHeights(rows, cases, inventory, retained, normalize) {
  return Object.entries(targets).filter(([, family]) => family !== 'expansion').reduce((values, [element, family]) =>
    applyModalBoxReview(values, cases, inventory, normalize, {
      family, element, properties: ['lineHeight'], attribution: componentLineHeightAttribution,
      owner: 'showcase Material component line-height token translation',
      justification: 'Each scalar label maps to its independently replayed retained omitted-component-text-metric proof. The active native token computes 20px; candidate normal/effective declarations omit line-height and the text registry retains normal. Preserve that unequal request without substituting a computed pixel default, claiming current glyph placement or attributing a renderer defect.',
      prove: (entry, reference, candidate) => proveComponentTextMetric(entry,
        one(entry.styleInputs.filter(i => i.id === element)), reference, candidate, retained, 'lineHeight'),
    }), rows);
}
export function applyTrackingLabels(rows, cases, inventory, retained, normalize) {
  return Object.entries(targets).reduce((values, [element, family]) => applyModalBoxReview(values, cases, inventory, normalize, {
    family, element, properties: ['letterSpacing'], attribution: trackingLabelAttribution,
    owner: 'showcase Material component tracking-token translation',
    justification: 'Each scalar label maps to the exact native and candidate owners of its independently replayed omitted-component-text-metric proof. Native Material tracking tokens compute 0.256px or 0.144px; candidate declaration stages omit tracking and the text registry retains zero. Preserve omission and complete retained-proof hashes; this identifies unequal authoring, not a computed default substitution, current glyph-paint equivalence or a core renderer defect.',
    prove: (entry, reference, candidate) => proveTrackingLabel(entry,
      one(entry.styleInputs.filter(i => i.id === element)), reference, candidate, retained),
  }), rows);
}
export function validateTrackingLabels(rows, originalRows, cases, inventory, retained, normalize) {
  try {
    const selected = values => values.filter(r => r.attribution === trackingLabelAttribution);
    assert.deepEqual(selected(rows), selected(applyTrackingLabels(originalRows, cases, inventory, retained, normalize)));
    return [];
  } catch (error) { return [`tracking label scalar join does not replay: ${error.message}`]; }
}

export const trackingHostAttribution = 'reviewed-toggle-host-tracking-boundary';
export function proveToggleTrackingHost(entry, input, reference, candidate, retained) {
  assert.equal(entry.family, 'button-toggle');
  assert.ok(['button-toggle-one', 'button-toggle-two'].includes(input.id));
  const native = one(reference.nodes.filter(n => n.attributes?.id === input.id));
  const ast = one(candidate.nodes.filter(n => n.authored?.id === input.id));
  assert.equal(native.type, 'mat-button-toggle'); assert.equal(native.ownText, '');
  assert.equal(ast.authored.type, 'div'); assert.equal(ast.authored.textContent, undefined);
  assert.equal(ast.retainedText, undefined);
  for (const [property, value] of Object.entries(input.reference)) assert.equal(reference.styles[native.style][property], value);
  assert.equal(input.reference.letterSpacing, '0.096px');
  for (const [stage, scalar] of [['resolvedStyle', 'astylar'], ['normalResolvedStyle', 'astylarNormalResolvedStyle'],
    ['interactionResolvedStyle', 'astylarInteractionResolvedStyle']]) {
    assert.deepEqual(ast[stage], input[scalar]); assert.equal(ast[stage].letterSpacing, undefined);
  }
  const token = one(native.rules.map(i => reference.rules[i]).filter(rule => rule.active &&
    rule.selector === '.mat-button-toggle-appearance-standard'));
  assert.deepEqual(token.declarations['letter-spacing'], {
    value: 'var(--mat-button-toggle-label-text-tracking, var(--mat-sys-label-large-tracking))', important: false });
  const label = one(retained.comparisons.filter(c => c.case === keyOf(entry) && c.element === `${input.id}-label`));
  const leaf = one(reference.nodes.filter(n => n.key === label.referenceNode));
  const button = one(reference.nodes.filter(n => n.key === leaf.parent));
  const astLabel = one(candidate.nodes.filter(n => n.key === label.astylarNode));
  assert.equal(leaf.type, 'span'); assert.equal(button.type, 'button'); assert.equal(button.parent, native.key);
  for (const node of [button, leaf]) {
    assert.equal(reference.styles[node.style].letterSpacing, 'normal');
    assert.ok(!node.rules.map(i => reference.rules[i]).some(rule => rule.active &&
      Object.keys(rule.declarations).some(k => ['letter-spacing', 'all'].includes(k))));
  }
  assert.equal(astLabel.parent, ast.key); assert.equal(astLabel.authored.id, `${input.id}-label`);
  assert.equal(astLabel.authored.textContent, leaf.ownText);
  assert.equal(label.source, 'core-text-registry'); assert.equal(label.currentPseudoStatePaintVerified, false);
  assert.deepEqual(label.properties.letterSpacing, { reference: '0', retained: '0', normal: undefined, effective: undefined });
  return { case: keyOf(entry), element: input.id, referenceNode: native.key, astylarNode: ast.key,
    referenceHostToken: token.declarations['letter-spacing'], referenceHostTracking: '0.096px',
    referenceLabelPath: [native.key, button.key, leaf.key], candidateLabelPath: [ast.key, astLabel.key],
    labelComparisonSha256: createHash('sha256').update(JSON.stringify(label)).digest('hex'),
    hostHasOwnText: false, leafTracking: label.properties.letterSpacing,
    uncapturedResetCauseProven: false, candidateComputedVerified: false,
    currentPseudoStatePaintVerified: false, rendererCauseProven: false,
    inputEquivalent: false, renderingEquivalent: false };
}
export function applyToggleTrackingHosts(rows, cases, inventory, retained, normalize) {
  return ['button-toggle-one', 'button-toggle-two'].reduce((values, element) => applyModalBoxReview(values, cases, inventory, normalize, {
    family: 'button-toggle', element, properties: ['letterSpacing'], attribution: trackingHostAttribution,
    owner: 'showcase button-toggle host request and nested text ownership',
    justification: 'The native textless Material host requests a tracking token computing 0.096px; the replacement div omits it. Its nested native button/span compute normal, while the candidate direct span retains zero. Record the unequal host request without transferring its nonzero value to label glyphs or inferring an uncaptured reset cause, current paint equivalence or a renderer defect.',
    prove: (entry, reference, candidate) => proveToggleTrackingHost(entry,
      one(entry.styleInputs.filter(i => i.id === element)), reference, candidate, retained),
  }), rows);
}

export const toggleLineHeightAttribution = 'reviewed-toggle-host-line-height-boundary';
export function proveToggleLineHeightHost(entry, input, reference, candidate, retained) {
  const host = proveToggleTrackingHost(entry, input, reference, candidate, retained);
  assert.equal(input.reference.lineHeight, '20px');
  for (const stage of ['astylar', 'astylarNormalResolvedStyle', 'astylarInteractionResolvedStyle'])
    assert.equal(input[stage].lineHeight, undefined);
  const [nativeHost, button, leaf] = host.referenceLabelPath.map(key => one(reference.nodes.filter(n => n.key === key)));
  const astLeaf = one(candidate.nodes.filter(n => n.key === host.candidateLabelPath[1]));
  const comparison = one(retained.comparisons.filter(c => c.case === host.case && c.element === `${input.id}-label`));
  assert.equal(reference.styles[button.style].lineHeight, '20px');
  const height = reference.styles[leaf.style].lineHeight;
  assert.ok(['24px', '40px'].includes(height));
  assert.deepEqual(comparison.properties.lineHeight, { reference: height, normal: height, effective: height, retained: height });
  for (const stage of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle']) assert.equal(astLeaf[stage].lineHeight, height);
  const requests = [nativeHost, button, leaf].map(node => ({ node: node.key,
    rules: node.rules.map(index => reference.rules[index]).filter(rule => rule.active && rule.declarations['line-height'])
      .map(rule => ({ selector: rule.selector, declaration: rule.declarations['line-height'] })) }));
  assert.ok(requests[0].rules.some(r => r.declaration.value === 'var(--mat-button-toggle-label-text-line-height, var(--mat-sys-label-large-line-height))'));
  assert.ok(requests[1].rules.length > 0); assert.ok(requests[1].rules.every(r => r.declaration.value === 'inherit'));
  assert.ok(requests[2].rules.some(r => r.declaration.value === 'var(--mat-button-toggle-height, 40px)'));
  return { case: host.case, element: input.id, referenceNode: host.referenceNode, astylarNode: host.astylarNode,
    referenceLabelPath: host.referenceLabelPath, candidateLabelPath: host.candidateLabelPath,
    referenceHostLineHeight: '20px', candidateHostLineHeight: '<omitted>', leafLineHeight: height,
    requests, labelComparisonSha256: host.labelComparisonSha256,
    candidateComputedVerified: false, currentPseudoStatePaintVerified: false,
    rendererCauseProven: false, inputEquivalent: false, renderingEquivalent: false };
}
export function applyToggleLineHeights(rows, cases, inventory, retained, normalize) {
  return ['button-toggle-one', 'button-toggle-two'].reduce((values, element) => applyModalBoxReview(values, cases, inventory, normalize, {
    family: 'button-toggle', element, properties: ['lineHeight'], attribution: toggleLineHeightAttribution,
    owner: 'showcase button-toggle host request and nested line-height ownership',
    justification: 'The textless Material host computes its 20px line-height token while the replacement host omits it. Native nested label rules override the inherited button value with the 40px/24px control-height line box, matching candidate label declarations and retained values. Preserve the unequal host request without applying its 20px to labels, equating token authoring or claiming current glyph placement/rendering equivalence.',
    prove: (entry, reference, candidate) => proveToggleLineHeightHost(entry,
      one(entry.styleInputs.filter(i => i.id === element)), reference, candidate, retained),
  }), rows);
}

const zeroTokens = {
  'toolbar-title': 'var(--mat-toolbar-title-text-tracking, var(--mat-sys-title-large-tracking))',
  'card-title': 'var(--mat-card-title-text-tracking, var(--mat-sys-title-large-tracking))',
  'dialog-title': 'var(--mat-dialog-subhead-tracking, var(--mat-sys-headline-small-tracking, 0.03125em))',
};

export const explicitHostLineHeightAttribution = 'reviewed-textless-host-line-height-request';
const hostLineHeights = {
  'toolbar-primary': ['toolbar', 'mat-toolbar', 'div', '28px', 'var(--mat-toolbar-title-text-line-height, var(--mat-sys-title-large-line-height))'],
  'paginator-primary': ['paginator', 'mat-paginator', 'div', '16px', 'var(--mat-paginator-container-text-line-height, var(--mat-sys-body-small-line-height))'],
  'progress-spinner-primary': ['progress-spinner', 'mat-progress-spinner', 'showcase.material:circular-progress', '0px', '0'],
};
export function proveExplicitHostLineHeight(entry, input, reference, candidate) {
  const [family, nativeType, candidateType, computed, token] = hostLineHeights[input.id];
  assert.equal(entry.family, family);
  const native = one(reference.nodes.filter(n => n.attributes?.id === input.id));
  const ast = one(candidate.nodes.filter(n => n.authored?.id === input.id));
  assert.equal(native.type, nativeType); assert.equal(ast.authored.type, candidateType);
  assert.equal(native.ownText, ''); assert.equal(ast.authored.textContent, undefined); assert.equal(ast.retainedText, undefined);
  assert.equal(input.reference.lineHeight, computed);
  for (const [property, value] of Object.entries(input.reference)) assert.equal(reference.styles[native.style][property], value);
  for (const [stage, scalar] of [['resolvedStyle', 'astylar'], ['normalResolvedStyle', 'astylarNormalResolvedStyle'],
    ['interactionResolvedStyle', 'astylarInteractionResolvedStyle']]) {
    assert.deepEqual(ast[stage], input[scalar]); assert.equal(ast[stage].lineHeight, undefined);
  }
  const requests = native.rules.map(i => reference.rules[i]).filter(r => r.active && r.declarations['line-height']);
  assert.equal(requests.length, 1); assert.deepEqual(requests[0].declarations['line-height'], { value: token, important: false });
  const relevant = key => ['lineheight', 'font', 'all'].includes(key.replaceAll('-', '').toLowerCase());
  assert.ok(Object.keys(ast.authored.style ?? {}).every(key => !relevant(key)));
  assert.equal(ast.authored.attributes?.style, undefined);
  for (const rule of candidate.rules.filter(r => rootInitialSelectorCanApply(r.selector, ast.authored)))
    assert.ok(Object.keys(rule).every(key => !relevant(key)));
  return { case: keyOf(entry), element: input.id, referenceNode: native.key, astylarNode: ast.key,
    referenceComputed: computed, candidateLocalDeclaration: '<omitted>', requests,
    hostHasOwnText: false, descendantConsumptionVerified: false, tokenSensitivityMeasured: false,
    motionActivityVerified: false, candidateComputedVerified: false, rendererCauseProven: false,
    inputEquivalent: false, renderingEquivalent: false };
}
export function applyExplicitHostLineHeights(rows, cases, inventory, normalize) {
  return Object.entries(hostLineHeights).reduce((values, [element, [family]]) => applyModalBoxReview(values, cases, inventory, normalize, {
    family, element, properties: ['lineHeight'], attribution: explicitHostLineHeightAttribution,
    owner: 'showcase Material container line-height requests',
    justification: 'The exact textless native host has an active Material line-height request (toolbar/paginator typography token or spinner zero); candidate host rules and captured stages omit it. Preserve the host request and original rule including motion, without copying it to descendants, assuming candidate computed defaults, claiming a text-placement effect for a graphic or inferring renderer causality.',
    prove: (entry, reference, candidate) => proveExplicitHostLineHeight(entry,
      one(entry.styleInputs.filter(i => i.id === element)), reference, candidate),
  }), rows);
}
// Identity is independently established by the original scalar/tree mapping.
// Preserve the token even when the current computed value normalizes to zero.
export function proveZeroTrackingToken(entry, input, reference, candidate, identity) {
  if (!identity) {
    const native = reference.nodes.filter(n => n.attributes?.id === input.id);
    if (!native.length) identity = resolveOriginAliasPair(entry, reference, candidate, input);
    else {
      const ast = one(candidate.nodes.filter(n => n.authored?.id === input.id));
      const ancestry = (tree, node) => {
        const result = [];
        while (node) {
          assert.ok(!result.includes(node.key)); result.push(node.key);
          if (node.parent === null) return result;
          node = one(tree.nodes.filter(n => n.key === node.parent));
        }
        assert.fail('incomplete tracking owner ancestry');
      };
      const owner = one(native);
      identity = { status: 'mapped', inputEquivalent: false, referenceNode: owner.key, candidateNode: ast.key,
        referencePath: ancestry(reference, owner), candidatePath: ancestry(candidate, ast), missingRules: [], extraRules: [] };
    }
  }
  assert.ok(Object.hasOwn(zeroTokens, input.id));
  assert.equal(input.reference.letterSpacing, 'normal');
  const native = one(reference.nodes.filter(n => n.key === identity.referenceNode));
  const ast = one(candidate.nodes.filter(n => n.key === identity.candidateNode));
  assert.equal(ast.authored.id, input.id);
  for (const [property, value] of Object.entries(input.reference)) assert.equal(reference.styles[native.style][property], value);
  for (const [stage, scalar] of [['resolvedStyle', 'astylar'], ['normalResolvedStyle', 'astylarNormalResolvedStyle'],
    ['interactionResolvedStyle', 'astylarInteractionResolvedStyle']]) {
    assert.deepEqual(ast[stage], input[scalar]); assert.equal(ast[stage].letterSpacing, undefined);
  }
  const trace = inspectOverlayOwnerDeclarations('letterSpacing', identity, reference, candidate);
  const requests = trace.referencePath.flatMap(n => {
    assert.deepEqual(n.inline, {});
    return n.rules.flatMap(rule => Object.entries(rule.declarations)
      .filter(([key]) => !/^(animation|transition)/.test(key))
      .map(([property, declaration]) => ({ node: n.node, property, declaration, active: rule.active, selector: rule.selector })));
  });
  const request = one(requests);
  assert.equal(request.property, 'letter-spacing'); assert.equal(request.active, true);
  assert.deepEqual(request.declaration, { value: zeroTokens[input.id], important: false });
  for (const n of trace.candidatePath) {
    assert.deepEqual(n.inline, {});
    for (const declarations of [...Object.values(n.declarations), ...n.possibleRules.map(r => r.declarations)])
      assert.ok(Object.keys(declarations).every(key => /^(animation|transition)/.test(key)));
  }
  return { case: keyOf(entry), element: input.id, referenceNode: native.key, astylarNode: ast.key,
    request, trace, referenceComputed: 'normal', candidateLocalDeclaration: '<omitted>',
    tokenSensitivityMeasured: false, motionActivityVerified: false,
    candidateComputedVerified: false, rendererCauseProven: false,
    inputEquivalent: false, renderingEquivalent: false };
}
export const zeroTrackingTokenAttribution = 'reviewed-zero-tracking-token-omission';
export function applyZeroTrackingTokens(rows, cases, inventory, normalize) {
  return [['toolbar', 'toolbar-title'], ['card', 'card-title'], ['dialog', 'dialog-title']].reduce((values, [family, element]) =>
    values.map(row => applyModalBoxReview([row], cases.filter(entry => row.states.includes(entry.state ?? 'static')), inventory, normalize, {
      family, element, properties: ['letterSpacing'], attribution: zeroTrackingTokenAttribution,
      owner: 'Material typography tracking-token translation',
      justification: 'The native owner or captured ancestor explicitly requests a Material tracking token while candidate captured paths omit tracking. A current computed normal/zero value does not erase that request. Preserve motion declarations and owner identity; token sensitivity, candidate computed tracking, current paint and rendering equivalence remain unproved.',
      prove: (entry, reference, candidate) => proveZeroTrackingToken(entry,
        one(entry.styleInputs.filter(i => i.id === element)), reference, candidate),
    })[0]), rows);
}
