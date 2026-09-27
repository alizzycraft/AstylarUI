import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { applyModalBoxReview } from './modal-position-inspection.mjs';

const one = xs => { assert.equal(xs.length, 1); return xs[0]; };
const keyOf = e => `${e.kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`;
const targets = { 'checkbox-label': 'checkbox', 'radio-solo-label': 'radio', 'radio-team-label': 'radio',
  'slide-toggle-label': 'slide-toggle', 'expansion-title': 'expansion' };
export const trackingLabelAttribution = 'reviewed-scalar-component-tracking-omission';

// Caller supplies authenticated original inventory and independently replayed
// retained typography. This join cannot authenticate a detached retained report.
export function proveTrackingLabel(entry, input, reference, candidate, retained) {
  assert.equal(entry.family, targets[input.id]);
  const native = one(reference.nodes.filter(n => n.attributes?.id === input.id));
  const ast = one(candidate.nodes.filter(n => n.authored?.id === input.id));
  const expected = entry.family === 'expansion' ? '0.144px' : '0.256px';
  assert.equal(input.reference.letterSpacing, expected);
  assert.equal(Object.keys(input.reference).length, 89);
  for (const [key, value] of Object.entries(input.reference)) assert.equal(reference.styles[native.style][key], value);
  for (const [stage, scalar] of [['resolvedStyle', 'astylar'], ['normalResolvedStyle', 'astylarNormalResolvedStyle'],
    ['interactionResolvedStyle', 'astylarInteractionResolvedStyle']]) {
    assert.deepEqual(ast[stage], input[scalar]); assert.equal(ast[stage].letterSpacing, undefined);
  }
  const key = keyOf(entry);
  const proof = one(retained.differences.filter(d => d.case === key && d.element === input.id && d.property === 'letterSpacing'));
  const comparison = one(retained.comparisons.filter(d => d.case === key && d.element === input.id));
  for (const value of [proof, comparison]) {
    assert.equal(value.referenceNode, native.key); assert.equal(value.astylarNode, ast.key);
    assert.equal(value.source, 'core-text-registry'); assert.equal(value.currentPseudoStatePaintVerified, false);
  }
  assert.equal(proof.revision, comparison.revision);
  assert.equal(proof.attribution, 'reviewed-omitted-component-text-metric');
  assert.equal(proof.classification, 'application-plugin-authoring-defect'); assert.equal(proof.inputEquivalent, false);
  assert.deepEqual(proof.values, { reference: expected, retained: '0', normal: undefined, effective: undefined });
  assert.deepEqual(comparison.properties.letterSpacing, proof.values);
  const evidence = proof.reviewEvidence;
  assert.equal(evidence.sourceFinding, 'fixture-retained-component-text-metrics-omitted');
  assert.equal(evidence.property, 'letterSpacing'); assert.equal(evidence.referenceComputed, expected);
  assert.equal(evidence.candidateRetained, '0');
  assert.equal(evidence.referenceChain[0].node, native.key); assert.equal(evidence.candidateChain[0].node, ast.key);
  assert.equal(evidence.referenceRule.active, true);
  assert.ok(evidence.referenceRule.declarations['letter-spacing'].value.startsWith('var(--mat-'));
  return { case: key, element: input.id, referenceNode: native.key, astylarNode: ast.key,
    sourceAttribution: proof.attribution, retainedProofSha256: createHash('sha256').update(JSON.stringify(proof)).digest('hex'),
    candidateComputedVerified: false, currentPseudoStatePaintVerified: false,
    rendererCauseProven: false, inputEquivalent: false, renderingEquivalent: false };
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
