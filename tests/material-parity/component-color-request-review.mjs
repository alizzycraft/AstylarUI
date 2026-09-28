import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { applyModalBoxReview } from './modal-position-inspection.mjs';
import { rootInitialSelectorCanApply } from './root-initial-style-evidence.mjs';
import { reviewedTemplateTextMappings } from './input-equivalence-audit.mjs';

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

const inheritedComponents = {
  'icon-primary': { family: 'icon', selector: 'mat-icon, mat-icon.mat-primary, mat-icon.mat-accent, mat-icon.mat-warn', token: 'var(--mat-icon-color, inherit)', candidate: '#page' },
  'paginator-primary': { family: 'paginator', selector: '.mat-mdc-paginator', token: 'var(--mat-paginator-container-text-color, var(--mat-sys-on-surface))', candidate: '#page' },
  'paginator-range': { family: 'paginator', selector: '.mat-mdc-paginator', token: 'var(--mat-paginator-container-text-color, var(--mat-sys-on-surface))', candidate: '#page' },
  'paginator-size': { family: 'paginator', selector: '.mat-mdc-paginator', token: 'var(--mat-paginator-container-text-color, var(--mat-sys-on-surface))', candidate: '#page' },
  'toolbar-title': { family: 'toolbar', selector: '.mat-toolbar', token: 'var(--mat-toolbar-container-text-color, var(--mat-sys-on-surface))', candidate: '.toolbar' },
  'radio-solo-label': { family: 'radio', selector: '.mat-mdc-radio-button .mat-internal-form-field', token: 'var(--mat-radio-label-text-color, var(--mat-sys-on-surface))', candidate: '.radio-option' },
  'radio-team-label': { family: 'radio', selector: '.mat-mdc-radio-button .mat-internal-form-field', token: 'var(--mat-radio-label-text-color, var(--mat-sys-on-surface))', candidate: '.radio-option' },
  'expansion-title': { family: 'expansion', selector: '.mat-expansion-panel-header-title', token: 'var(--mat-expansion-header-text-color, var(--mat-sys-on-surface))', candidate: '.expansion-trigger' },
};

export function proveInheritedComponentColor(entry, reference, candidate, element, normalize) {
  const definition = inheritedComponents[element]; assert.ok(definition);
  assert.equal(entry.family, definition.family); assert.notEqual(entry.state, 'disabled');
  const input = one(entry.styleInputs.filter(i => i.id === element));
  const owner = one(candidate.nodes.filter(n => n.authored?.id === element));
  let native = reference.nodes.find(n => n.attributes?.id === element);
  let mapping = { kind: 'unique-captured-id' };
  if (!native) {
    mapping = one(reviewedTemplateTextMappings(entry.family, reference, candidate).filter(m => m.element === element));
    assert.equal(mapping.astylarNode, owner.key);
    native = one(reference.nodes.filter(n => n.key === mapping.referenceNode));
  } else assert.equal(reference.nodes.filter(n => n.attributes?.id === element).length, 1);
  for (const [key, value] of Object.entries(input.reference)) assert.equal(reference.styles[native.style][key], value);
  for (const [stage, field] of [['resolvedStyle', 'astylar'], ['normalResolvedStyle', 'astylarNormalResolvedStyle'],
    ['interactionResolvedStyle', 'astylarInteractionResolvedStyle']]) assert.deepEqual(owner[stage], input[field]);
  const referenceColor = normalize(input.reference).color, referencePath = [], candidatePath = [];
  const seen = new Set(); let node = native;
  while (node) {
    assert.ok(!seen.has(node.key)); seen.add(node.key);
    assert.equal(normalize(reference.styles[node.style]).color, referenceColor);
    assert.ok(!Object.keys(node.inline ?? {}).some(relevant));
    assert.ok(!/(?:^|;)\s*(?:color|all|-webkit-text-fill-color)\s*:/i.test(node.attributes?.style ?? ''));
    const requests = node.rules.map(i => reference.rules[i]).filter(r => r.active)
      .flatMap(rule => Object.entries(rule.declarations).filter(([key]) => relevant(key))
        .map(([key, declaration]) => ({ selector: rule.selector, key, declaration })));
    referencePath.push({ node: node.key, parent: node.parent, requests, computedColor: referenceColor });
    if (requests.length) {
      assert.deepEqual(requests, [{ selector: definition.selector, key: 'color', declaration: { value: definition.token, important: false } }]);
      break;
    }
    node = one(reference.nodes.filter(n => n.key === node.parent));
  }
  assert.ok(referencePath.at(-1).requests.length);
  seen.clear(); node = owner;
  while (node) {
    assert.ok(!seen.has(node.key)); seen.add(node.key);
    assert.ok(!Object.keys(node.authored.style ?? {}).some(relevant)); assert.equal(node.authored.attributes?.style, undefined);
    const requests = candidate.rules.filter(r => rootInitialSelectorCanApply(r.selector, node.authored))
      .flatMap(rule => Object.entries(rule).filter(([key]) => relevant(key)).map(([key, value]) => ({ selector: rule.selector, key, value })));
    const local = node.resolvedStyle.color;
    for (const stage of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle']) assert.equal(node[stage].color, local);
    candidatePath.push({ node: node.key, parent: node.parent, requests, localColor: local ?? null });
    if (requests.length) {
      assert.notEqual(node.key, owner.key);
      assert.equal(requests.length, 1); assert.equal(requests[0].selector, definition.candidate);
      assert.equal(requests[0].key, 'color'); assert.equal(requests[0].value, local);
      assert.equal(normalize({ color: local }).color, referenceColor);
      break;
    }
    assert.equal(local, undefined);
    node = one(candidate.nodes.filter(n => n.key === node.parent));
  }
  assert.ok(candidatePath.at(-1).requests.length);
  return { referenceNode: native.key, astylarNode: owner.key, mapping, referencePath, candidatePath,
    candidateLocalColor: null, candidateAncestorRequestMatchesReference: true,
    candidateComputedColorVerified: false, tokenSemanticsEquivalent: false,
    inputEquivalent: false, renderingEquivalent: false };
}

export function applyInheritedComponentColors(rows, cases, inventory, normalize) {
  return rows.map(row => {
    const definition = inheritedComponents[row.element];
    if (!definition || row.family !== definition.family || row.property !== 'color' || row.attribution !== 'unresolved' || row.states.includes('disabled')) return row;
    const members = cases.filter(e => row.states.includes(e.state ?? 'static'));
    return applyModalBoxReview([row], members, inventory, normalize, {
      family: row.family, element: row.element, properties: ['color'],
      classification: 'parity-harness-defect', attribution: 'reviewed-component-color-computed-local-boundary',
      owner: 'comparison computed versus local style measurement; component token translation remains separate',
      justification: 'The native computed leaf color comes from a captured component token; the candidate leaf omits local color and its captured ancestor explicitly requests the same normalized color. The scalar compares different stages. Preserve both ancestry paths and token-versus-literal authoring; this does not synthesize candidate computed ink or establish token semantics, text paint or rendering equivalence.',
      prove: (entry, reference, candidate) => proveInheritedComponentColor(entry, reference, candidate, row.element, normalize),
    })[0];
  });
}
