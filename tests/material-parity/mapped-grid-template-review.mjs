import assert from 'node:assert/strict';
import { resolveOriginAliasPair } from './origin-alias-mapping-evidence.mjs';
import { inspectOverlayOwnerDeclarations } from './overlay-owner-declaration-review.mjs';
import { rootInitialSelectorCanApply } from './root-initial-style-evidence.mjs';

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
