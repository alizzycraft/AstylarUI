import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { applyModalBoxReview } from './modal-position-inspection.mjs';
import { rootInitialSelectorCanApply } from './root-initial-style-evidence.mjs';

const one = values => { assert.equal(values.length, 1); return values[0]; };
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const relevant = key => ['color', 'all', 'webkittextfillcolor'].includes(key.replaceAll('-', '').toLowerCase()) || /^(animation|transition)/i.test(key);

// Bind measured containers to existing, freshly replayed text-owner ancestry.
// A child's retained ink must never fill a missing container-local declaration.
export function proveComponentColorRequest(entry, reference, candidate, retained, normalize) {
  assert.ok(['sort', 'sidenav'].includes(entry.family));
  const sort = entry.family === 'sort', element = `${entry.family}-primary`;
  const key = `${entry.kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`;
  const input = one(entry.styleInputs.filter(i => i.id === element));
  const native = one(reference.nodes.filter(n => n.attributes?.id === element));
  const owner = one(candidate.nodes.filter(n => n.authored?.id === element));
  const proof = one(retained.differences.filter(p => p.case === key && p.property === 'color' &&
    p.element === (sort ? 'sort-label' : 'sidenav-content')));
  assert.equal(proof.attribution, sort ? 'reviewed-sort-typography-substitution' : 'reviewed-sidenav-color-substitution');
  assert.equal(proof.inputEquivalent, false); assert.equal(proof.currentPseudoStatePaintVerified, false);
  assert.equal(proof.classification, 'application-plugin-authoring-defect');
  const link = one(proof.reviewEvidence.referenceChain.filter(n => n.node === native.key));
  assert.deepEqual(reference.styles[native.style], link.computed);
  assert.equal(normalize(input.reference).color, normalize(link.computed).color);
  assert.deepEqual(native.rules.map(i => reference.rules[i]).filter(r => r.active &&
    (r.declarations.color || r.declarations.all)), sort ? link.propertyRules : link.colorRules);
  assert.ok(!Object.keys(native.inline ?? {}).some(relevant));
  assert.ok(!/(?:^|;)\s*(?:color|all|-webkit-text-fill-color)\s*:/i.test(native.attributes?.style ?? ''));
  assert.ok(!Object.keys(owner.authored.style ?? {}).some(relevant));
  assert.equal(owner.authored.attributes?.style, undefined);
  const requests = candidate.rules.filter(rule => rootInitialSelectorCanApply(rule.selector, owner.authored))
    .flatMap(rule => Object.entries(rule).filter(([key]) => relevant(key))
      .map(([key, value]) => ({ selector: rule.selector, key, value })));
  assert.deepEqual(requests, sort ? [{ selector: '.sort-header', key: 'color', value: '#000000' }] : []);
  for (const [stage, field] of [['resolvedStyle', 'astylar'], ['normalResolvedStyle', 'astylarNormalResolvedStyle'],
    ['interactionResolvedStyle', 'astylarInteractionResolvedStyle']]) {
    assert.deepEqual(owner[stage], input[field]);
    assert.equal(owner[stage].color, sort ? '#000000' : undefined);
  }
  if (sort) {
    const trigger = one(candidate.nodes.filter(n => n.authored?.id === 'sort-trigger'));
    assert.equal(trigger.parent, owner.key);
    assert.equal(proof.reviewEvidence.candidateChain[1].node, trigger.key);
    assert.equal(proof.reviewEvidence.referenceComputed, normalize(input.reference).color);
    assert.notEqual(normalize(owner.resolvedStyle).color, normalize(input.reference).color);
  } else {
    assert.equal(proof.reviewEvidence.candidateParent.key, owner.key);
    assert.deepEqual(proof.reviewEvidence.candidateParent.authored, owner.authored);
    assert.equal(native.type, 'mat-sidenav-container');
    assert.equal(one(link.colorRules).declarations.color.value,
      'var(--mat-sidenav-content-text-color, var(--mat-sys-on-background))');
  }
  return { case: key, element, referenceNode: native.key, astylarNode: owner.key,
    retainedProofSha256: digest(proof), referenceOwner: link, candidateRequests: requests,
    candidateLocalColor: owner.resolvedStyle.color ?? null, localOmissionPreserved: true,
    childRetainedColor: proof.values.retained, childValueAppliedToContainer: false,
    inputEquivalent: false, renderingEquivalent: false, candidateComputedColorVerified: false };
}

export function applyComponentColorRequests(rows, cases, inventory, retained, normalize) {
  return ['sort', 'sidenav'].reduce((result, family) => applyModalBoxReview(result, cases, inventory, normalize, {
    family, element: `${family}-primary`, properties: ['color'],
    attribution: family === 'sort' ? 'reviewed-sort-header-color-substitution' : 'reviewed-sidenav-container-token-omission',
    owner: 'showcase component color authoring and scalar owner boundaries',
    justification: family === 'sort'
      ? 'The measured native header lies in the proved frame-color inheritance chain; its candidate counterpart independently requests black on .sort-header. Bind this own declaration separately from the existing child trigger/label proof. No color-conversion or raster-equivalence claim follows.'
      : 'The measured native container explicitly supplies its component content-color token. The corresponding candidate container omits local color; a different literal on its content child is not the container computed color. Preserve the token omission and measured/local distinction rather than copying the child value upward.',
    prove: (entry, reference, candidate) => proveComponentColorRequest(entry, reference, candidate, retained, normalize),
  }), rows);
}
