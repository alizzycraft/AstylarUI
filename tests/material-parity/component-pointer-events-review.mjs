import assert from 'node:assert/strict';
import { applyModalBoxReview } from './modal-position-inspection.mjs';
import { proveControlStatePaint } from './control-state-paint-review.mjs';
import { inspectOverlayOwnerDeclarations } from './overlay-owner-declaration-review.mjs';

// Reuse the established wrapper/backdrop identity proof. A wrapper's none
// cannot stand in for its separately interactive backdrop's pointer policy.
export function proveSheetPointerOwners(entry, reference, candidate, normalize) {
  assert.equal(entry.family, 'bottom-sheet');
  const input = entry.styleInputs.find(i => i.id === 'bottom-sheet-overlay');
  const paint = proveControlStatePaint(entry, input, reference, candidate, normalize);
  const trace = inspectOverlayOwnerDeclarations('pointerEvents', paint.identity, reference, candidate);
  assert.equal(trace.referencePath[0].computed, 'none');
  const backdrop = reference.nodes.find(n => n.key === paint.nativeBackdrop);
  assert.ok(backdrop); assert.equal(paint.nativeBackdropStyle.pointerEvents, 'auto');
  const relevant = key => ['pointerevents', 'all'].includes(key.replaceAll('-', '').toLowerCase());
  assert.ok(!Object.keys(backdrop.inline ?? {}).some(relevant));
  const rules = backdrop.rules.map(i => reference.rules[i]).filter(r => r.active && Object.keys(r.declarations).some(relevant));
  assert.equal(rules.length, 1); assert.equal(rules[0].selector, '.cdk-overlay-backdrop');
  assert.deepEqual(rules[0].declarations['pointer-events'], { value: 'auto', important: false });
  assert.equal(rules[0].declarations.all, undefined);
  assert.ok(trace.referencePath[0].rules.some(r => r.active &&
    r.selector === '.cdk-overlay-container, .cdk-global-overlay-wrapper' && r.declarations['pointer-events']?.value === 'none'));
  for (const node of trace.candidatePath) {
    assert.deepEqual(Object.values(node.localValues), ['<omitted>', '<omitted>', '<omitted>']);
    assert.ok(!Object.keys(node.inline).some(relevant));
    assert.ok(node.possibleRules.every(r => !Object.keys(r.declarations).some(relevant)));
  }
  return { referenceNode: paint.referenceNode, astylarNode: paint.astylarNode,
    identity: paint.identity, nativeBackdrop: paint.nativeBackdrop, nativeBackdropPointerEvents: 'auto',
    nativeBackdropRules: rules, trace,
    inputEquivalent: false, renderingEquivalent: false, candidateComputedPointerEventsVerified: false,
    actualHitTargetVerified: false, modalScopeCauseProven: false,
    limitation: 'The original scalar measures the non-picking wrapper, not the separately picking backdrop. Candidate backdrop/wrapper composition is merged. No default is synthesized from omitted local values, and window-wide click capture or dismissal causation is unproven.' };
}

export function applySheetPointerOwnerReview(rows, cases, inventory, normalize) {
  return applyModalBoxReview(rows, cases, inventory, normalize, {
    family: 'bottom-sheet', element: 'bottom-sheet-overlay', properties: ['pointerEvents'],
    classification: 'parity-harness-defect', attribution: 'reviewed-sheet-pointer-measurement-owner',
    owner: 'overlay wrapper/backdrop measurement ownership; separate modal interaction scope',
    justification: 'The native scalar none belongs to a transparent CDK wrapper; the sibling dim backdrop explicitly requests auto. Candidate wrapper and backdrop are merged, so the scalar compares different interaction owners and a computed native value with omitted local candidate values. This is not proof that the candidate should use none, that the overlay is click-through, or that modal scope and dismissal behavior are correct.',
    prove: (entry, reference, candidate) => proveSheetPointerOwners(entry, reference, candidate, normalize),
  });
}
