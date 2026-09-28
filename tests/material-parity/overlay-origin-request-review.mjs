import assert from 'node:assert/strict';
import { proveOverlayCaretBoundary } from '../../scripts/audit-material-overlay-caret-context.mjs';
import { rootInitialSelectorCanApply } from './root-initial-style-evidence.mjs';
import { applyModalBoxReview } from './modal-position-inspection.mjs';

const relevant = key => /^(all|transform|translate|rotate|scale|animation|transition)/.test(key.replaceAll('-', '').toLowerCase());
const origin = key => /^(all|transformorigin|transformbox)$/.test(key.replaceAll('-', '').toLowerCase());
const owners = { tooltip: ['tooltip-popup'], dialog: ['dialog-panel', 'dialog-title', 'dialog-copy', 'dialog-actions', 'dialog-cancel', 'dialog-save'] };

export function proveOverlayOriginBoundary(entry, reference, candidate, element) {
  assert.ok(owners[entry.family]?.includes(element));
  // Reuse original scalar/type/ancestry/rule-gap and motion identity evidence.
  // Caret semantics do not establish origin semantics; inspect those separately.
  const context = proveOverlayCaretBoundary(entry, reference, candidate, element);
  const { identity } = context;
  const requests = [];
  for (const key of identity.referencePath) {
    const node = reference.nodes.find(n => n.key === key);
    for (const rule of [{ selector: '<inline>', declarations: node.inline, active: true },
      ...node.rules.map(i => reference.rules[i])]) {
      const declarations = Object.fromEntries(Object.entries(rule.declarations).filter(([k]) => relevant(k)));
      if (Object.keys(declarations).length) requests.push({ node: key, selector: rule.selector, active: rule.active,
        declarations, ...(rule.cssText ? { cssText: rule.cssText } : {}) });
    }
  }
  const target = reference.nodes.find(n => n.key === identity.referenceNode);
  assert.ok(!requests.some(r => r.node === target.key && Object.keys(r.declarations).some(origin)));
  const origins = requests.filter(r => Object.keys(r.declarations).some(origin));
  if (entry.family === 'tooltip') {
    assert.equal(origins.length, 1);
    assert.notEqual(origins[0].node, target.key); assert.equal(origins[0].selector, '<inline>');
    assert.deepEqual(origins[0].declarations, { 'transform-origin': { value: 'center top', important: false } });
    const translated = requests.filter(r => r.selector === '<inline>' && r.declarations.transform);
    assert.equal(translated.length, 1); assert.notEqual(translated[0].node, target.key);
    assert.deepEqual(translated[0].declarations, { transform: { value: 'translateY(8px)', important: false } });
  } else assert.deepEqual(origins, []);
  assert.equal(reference.styles[target.style].transform, 'none');
  const candidatePath = identity.candidatePath.map(key => {
    const node = candidate.nodes.find(n => n.key === key);
    assert.ok(!Object.keys(node.authored).some(relevant));
    assert.equal(node.authored.style, undefined); assert.equal(node.authored.attributes?.style, undefined);
    const applicable = candidate.rules.filter(r => rootInitialSelectorCanApply(r.selector, node.authored));
    assert.ok(applicable.every(r => !Object.keys(r).some(relevant)));
    const syntheticRoot = node.parent === null && Object.keys(node.authored).length === 0;
    for (const stage of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle']) {
      if (syntheticRoot) assert.equal(node[stage], undefined);
      else assert.ok(!Object.keys(node[stage]).some(relevant));
    }
    return { key, authored: node.authored, applicableRules: applicable };
  });
  return { referenceNode: target.key, astylarNode: identity.candidateNode, identity, referenceRequests: requests,
    candidatePath, referenceOrigin: reference.styles[target.style].transformOrigin,
    inputEquivalent: false, renderingEquivalent: false, candidateComputedOriginVerified: false,
    referenceBoxEqualityVerified: false, motionSettlementVerified: false, popupMisplacementCauseProven: false };
}

export function applyOverlayOriginReviews(rows, cases, inventory, normalize) {
  for (const [family, elements] of Object.entries(owners)) for (const element of elements)
    rows = applyModalBoxReview(rows, cases, inventory, normalize, {
      family, element, properties: ['transformOrigin'], classification: 'parity-harness-defect',
      attribution: 'reviewed-overlay-origin-owner-boundary', owner: 'overlay origin measurement stage and transform-owner translation',
      prove: (entry, r, a) => proveOverlayOriginBoundary(entry, r, a, element),
      justification: 'The measured native owner has no authored origin/reference-box request and reports computed pixel origins; candidate local declarations omit them. Preserve ancestor motion/transform requests separately: tooltip center-top origin and 8px translation belong to other native boxes, absent in candidate ancestry. Dialog motion requests also differ. Neither computed origin pixels nor ancestor origin values should be copied onto the candidate leaf. Structure, reference-box geometry, settlement and popup misplacement remain unproven; this classification is not equal-input or rendering acceptance.',
    });
  return rows;
}
