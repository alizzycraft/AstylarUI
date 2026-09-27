import assert from 'node:assert/strict';
import { resolveOriginAliasPair } from './origin-alias-mapping-evidence.mjs';
import { inspectOverlayOwnerDeclarations } from './overlay-owner-declaration-review.mjs';
import { rootInitialSelectorCanApply } from './root-initial-style-evidence.mjs';
import { inspectOwnerGridInitial } from './owner-grid-initial-evidence.mjs';
import { applyModalBoxReview, modalInventoryTrees } from './modal-position-inspection.mjs';
import { proveGridPositionSubstitution } from '../../scripts/audit-material-grid-position-substitution.mjs';

export const gridTemplateReviewAttributions = Object.freeze([
  'reviewed-grid-template-layout-substitution', 'reviewed-mapped-grid-template-observation-stage',
  'reviewed-direct-grid-template-motion-boundary',
]);
export function applyGridTemplateReviews(rows, cases, inventory, normalize) {
  return rows.map(row => {
    if (row.attribution !== 'unresolved' || !['gridTemplateColumns', 'gridTemplateRows'].includes(row.property)) return row;
    const layout = row.family === 'grid-list' && row.element === 'grid-list-primary';
    const members = cases.filter(e => e.family === row.family && row.states.includes(e.state ?? 'static') &&
      e.styleInputs.some(i => i.id === row.element && normalize(i.reference)[row.property] === row.reference &&
        normalize(i.astylar)[row.property] === row.astylar));
    const first = members[0]?.styleInputs.find(i => i.id === row.element);
    assert.ok(first);
    const entry = members[0];
    const [reference, candidate] = modalInventoryTrees(inventory,
      `${entry.kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`);
    const direct = !inspectOwnerGridInitial(first, row.property, reference, candidate).issues.some(i => i.reason === 'owner-mapping');
    return applyModalBoxReview([row], members, inventory, normalize, {
      family: row.family, element: row.element, properties: [row.property],
      attribution: gridTemplateReviewAttributions[layout ? 0 : direct ? 2 : 1],
      classification: layout ? 'application-plugin-authoring-defect' : 'parity-harness-defect',
      owner: layout ? 'showcase grid-list layout translation' : 'grid-template computed/local measurement boundary',
      justification: layout
        ? 'Native positioned block tiles are replaced with a zero-gap two-column grid and relative flex tiles. Reuse the complete original composition proof. Neither implicit rows nor matching sampled geometry makes these inputs equivalent.'
        : 'Browser-computed none and absent candidate local templates are different measurement stages. Preserve the exact owner mapping, captured declarations, motion-target uncertainty and rule gaps. No candidate computed default, track sizing, animation settlement or rendering equivalence is inferred.',
      prove: (entry, r, a) => {
        const input = entry.styleInputs.find(i => i.id === row.element);
        if (!layout) return direct ? proveDirectGridTemplateMotionBoundary(input, r, a, row.property)
          : proveMappedGridTemplateOmission(entry, input, r, a, row.property);
        const composition = proveGridPositionSubstitution(r, a);
        const native = r.nodes.find(n => n.key === composition.referenceRootKey);
        const candidate = a.nodes.find(n => n.key === composition.candidateRootKey);
        for (const [key, value] of Object.entries(input.reference)) assert.equal(r.styles[native.style][key], value);
        for (const [stage, scalar] of [['resolvedStyle', 'astylar'], ['normalResolvedStyle', 'astylarNormalResolvedStyle'],
          ['interactionResolvedStyle', 'astylarInteractionResolvedStyle']]) assert.deepEqual(candidate[stage], input[scalar]);
        return { property: row.property, referenceNode: native.key, astylarNode: candidate.key, composition,
          inputEquivalent: false, gridLayoutEquivalent: false, renderingEquivalent: false };
      },
    })[0];
  });
}

export function proveDirectGridTemplateMotionBoundary(input, reference, candidate, property) {
  const survey = inspectOwnerGridInitial(input, property, reference, candidate);
  assert.ok(survey.issues.length);
  assert.ok(survey.issues.every(i => i.reason === 'motion-request-needs-review' && i.side === 'reference'),
    `${input.id}/${property}: ${JSON.stringify(survey.issues)}`);
  const node = reference.nodes.find(n => n.key === survey.referenceNode);
  assert.ok(node);
  const motion = declarations => Object.fromEntries(Object.entries(declarations ?? {})
    .filter(([key]) => /^(animation|transition)/.test(key)));
  const rules = node.rules.map(index => ({ index, ...reference.rules[index] }))
    .filter(rule => Object.keys(motion(rule.declarations)).length)
    .map(rule => ({ ...rule, declarations: motion(rule.declarations) }));
  const inline = motion(node.inline);
  const active = [...rules.filter(rule => rule.active).map(rule => rule.declarations),
    ...(Object.keys(inline).length ? [inline] : [])];
  const safeTargets = new Set(['none', 'box-shadow', 'border', 'opacity']);
  const declaredTargetsDisjoint = active.length > 0 && active.every(d =>
    !d.transition && !d.animation && (!d['animation-name'] || d['animation-name'].value === 'none') &&
    typeof d['transition-property']?.value === 'string' &&
    d['transition-property'].value.split(',').every(target => safeTargets.has(target.trim())));
  return { property, element: input.id, referenceNode: survey.referenceNode, astylarNode: survey.candidateNode,
    survey, rules, inline, declaredTargetsDisjoint,
    disposition: declaredTargetsDisjoint ? 'captured-declared-targets-disjoint' : 'motion-targets-remain-unverified',
    candidateComputedVerified: false, animationSettlementVerified: false, indirectEffectsExcluded: false,
    inputEquivalent: false, gridLayoutEquivalent: false, renderingEquivalent: false };
}

// Grid templates are not inherited. Existing alias proofs establish measurement
// identity, not equal structure, computed candidate defaults or track geometry.
export function proveMappedGridTemplateOmission(entry, input, reference, candidate, property) {
  assert.ok(['gridTemplateColumns', 'gridTemplateRows'].includes(property));
  assert.equal(input.reference[property], 'none');
  const identity = resolveOriginAliasPair(entry, reference, candidate, input);
  assert.ok(['mapped', 'mapped-with-scalar-rule-gap'].includes(identity.status));
  const r = reference.nodes.find(n => n.key === identity.referenceNode);
  const a = candidate.nodes.find(n => n.key === identity.candidateNode);
  assert.ok(r && a);
  const grid = key => /^(grid|all$)/.test(key.replaceAll('-', '').toLowerCase());
  const rejectRequests = declarations => assert.ok(!Object.keys(declarations ?? {}).some(grid),
    'mapped owner has a grid or reset request requiring separate review');
  for (const [node, authored] of [[r, false], [a, true]]) {
    rejectRequests(authored ? node.authored.style : node.inline);
    const inline = authored ? node.authored.attributes?.style : node.attributes?.style;
    if (inline !== undefined) {
      assert.equal(typeof inline, 'string'); assert.ok(!/[\\/]/.test(inline));
      for (const part of inline.split(';')) {
        const at = part.indexOf(':');
        if (at >= 0) assert.equal(grid(part.slice(0, at).trim()), false);
      }
    }
  }
  // Preserve inactive rules too: this is not a cascade or animation evaluator.
  for (const index of r.rules) rejectRequests(reference.rules[index].declarations);
  for (const rule of candidate.rules.filter(rule => rootInitialSelectorCanApply(rule.selector, a.authored)))
    rejectRequests(rule);
  for (const stage of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle']) {
    rejectRequests(a[stage]); assert.equal(Object.hasOwn(a[stage], property), false);
  }
  const trace = inspectOverlayOwnerDeclarations(property, identity, reference, candidate);
  return { property, element: input.id, referenceNode: r.key, astylarNode: a.key, identity, trace,
    referenceComputed: 'none', candidateLocalDeclaration: '<omitted>',
    ownerGridRequestsAbsent: true, candidateComputedVerified: false,
    motionTargetsVerified: false, animationSettlementVerified: false,
    inputEquivalent: false, gridLayoutEquivalent: false, renderingEquivalent: false };
}
