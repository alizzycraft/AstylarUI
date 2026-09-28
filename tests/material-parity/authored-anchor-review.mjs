import assert from 'node:assert/strict';
import { applyModalBoxReview } from './modal-position-inspection.mjs';
import { proveFlowPositionSubstitution } from '../../scripts/audit-material-flow-position-substitutions.mjs';
import { proveBadgePointerRequest } from './component-pointer-events-review.mjs';
import { rootInitialSelectorCanApply } from './root-initial-style-evidence.mjs';
import { inspectButtonHostRequests } from './button-host-request-evidence.mjs';

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
