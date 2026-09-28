import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { applyModalBoxReview } from './modal-position-inspection.mjs';
import { rootInitialSelectorCanApply } from './root-initial-style-evidence.mjs';
import { reviewedTemplateTextMappings } from './input-equivalence-audit.mjs';
import { resolveOriginAliasPair } from './origin-alias-mapping-evidence.mjs';

const one = values => { assert.equal(values.length, 1); return values[0]; };
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const relevant = key => ['color', 'all', 'webkittextfillcolor'].includes(key.replaceAll('-', '').toLowerCase()) || /^(animation|transition)/i.test(key);

const overlayColors = { 'dialog-panel': 'dialog', 'dialog-actions': 'dialog',
  'snack-bar-overlay': 'snack-bar', 'bottom-sheet-overlay': 'bottom-sheet' };

export function proveOverlayContainerColor(entry, reference, candidate, element) {
  assert.equal(entry.family, overlayColors[element]); assert.ok(overlayColors[element]);
  const input = one(entry.styleInputs.filter(i => i.id === element));
  const mapping = resolveOriginAliasPair(entry, reference, candidate, input);
  const wrapper = element.endsWith('-overlay');
  assert.equal(mapping.status, wrapper ? 'mapped-with-scalar-rule-gap' : 'mapped');
  assert.deepEqual(mapping.missingRules, wrapper ? [{ selector: '.cdk-global-overlay-wrapper',
    declarations: { 'z-index': { value: '1000', important: false } } }] : []);
  assert.deepEqual(mapping.extraRules, []);
  const ink = key => relevant(key) && !/^(animation|transition)/i.test(key);
  const referencePath = mapping.referencePath.map(key => {
    const node = one(reference.nodes.filter(n => n.key === key));
    assert.equal(reference.styles[node.style].color, 'rgb(0, 0, 0)');
    assert.ok(!Object.keys(node.inline ?? {}).some(ink));
    const rules = node.rules.map(i => reference.rules[i]).filter(r => r.active);
    assert.ok(rules.every(r => !Object.keys(r.declarations).some(ink)));
    return { node: key, parent: node.parent, type: node.type, computedColor: 'rgb(0, 0, 0)',
      motionRules: rules.filter(r => Object.keys(r.declarations).some(k => /^(animation|transition)/i.test(k))) };
  });
  assert.equal(referencePath.at(-1).parent, null);
  const candidatePath = mapping.candidatePath.map(key => {
    const node = one(candidate.nodes.filter(n => n.key === key));
    assert.ok(!Object.keys(node.authored.style ?? {}).some(relevant)); assert.equal(node.authored.attributes?.style, undefined);
    const requests = candidate.rules.filter(r => rootInitialSelectorCanApply(r.selector, node.authored))
      .flatMap(r => Object.entries(r).filter(([k]) => relevant(k)).map(([k, value]) => ({ selector: r.selector, key: k, value })));
    const selector = node.authored.id === 'page' ? '#page' : node.authored.id === 'dialog-panel' ? '.dialog-panel' : undefined;
    const color = selector === '#page' && entry.profile === 'dark' ? '#e6e1e5' : '#1d1b20';
    assert.deepEqual(requests, selector ? [{ selector, key: 'color', value: color }] : []);
    for (const stage of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle'])
      assert.equal(node[stage]?.color, selector ? color : undefined);
    return { node: key, parent: node.parent, requests, localColor: node.resolvedStyle?.color ?? null };
  });
  return { mapping, referenceNode: mapping.referenceNode, astylarNode: mapping.candidateNode,
    referencePath, candidatePath, candidateLocalColor: input.astylar.color ?? null,
    nativeDetachedOverlayRoot: referencePath.at(-1).node, nativePageInheritanceAssumed: false,
    candidateComputedColorVerified: false, motionSettlementVerified: false,
    inputEquivalent: false, renderingEquivalent: false, positionOrVisibilityCauseProven: false };
}

export function applyOverlayContainerColors(rows, cases, inventory, normalize) {
  return Object.entries(overlayColors).reduce((result, [element, family]) => applyModalBoxReview(result, cases, inventory, normalize, {
    family, element, properties: ['color'],
    classification: element === 'dialog-panel' ? 'application-plugin-authoring-defect' : 'parity-harness-defect',
    attribution: element === 'dialog-panel' ? 'reviewed-dialog-container-color-substitution' : 'reviewed-overlay-color-computed-local-boundary',
    owner: 'showcase overlay ancestry, container authoring and scalar measurement boundaries',
    justification: 'The mapped native container computes black throughout its detached overlay-root path, with no captured local color requests. Candidate ancestry stays under #page; only the dialog panel adds its own explicit color. Preserve omitted container-local values, alias rule gaps and native motion rules. This does not copy page or label color into a container, prove candidate computed ink, settle animations, or diagnose overlay position/visibility.',
    prove: (entry, reference, candidate) => proveOverlayContainerColor(entry, reference, candidate, element),
  }), rows);
}

export function proveRangeDefaultColor(entry, reference, candidate, element) {
  assert.equal(entry.family, 'slider');
  assert.ok(['slider-start', 'slider-primary'].includes(element));
  const input = one(entry.styleInputs.filter(i => i.id === element));
  const native = one(reference.nodes.filter(n => n.attributes?.id === element));
  const owner = one(candidate.nodes.filter(n => n.authored?.id === element));
  const disabled = entry.state === 'disabled';
  assert.equal(native.type, 'input'); assert.equal(native.attributes.type, 'range');
  assert.equal(Object.hasOwn(native.attributes, 'disabled'), disabled);
  assert.equal(owner.authored.type, 'input'); assert.equal(owner.authored.inputType, 'range');
  assert.equal(Boolean(owner.authored.disabled), disabled);
  for (const [key, value] of Object.entries(input.reference)) assert.equal(reference.styles[native.style][key], value);
  assert.equal(input.reference.color, disabled ? 'rgb(197, 197, 197)' : 'rgb(16, 16, 16)');
  assert.equal(input.reference.opacity, '0');
  assert.ok(!Object.keys(native.inline ?? {}).some(relevant));
  for (const index of native.rules) assert.ok(!Object.keys(reference.rules[index].declarations).some(relevant));
  assert.ok(!Object.keys(owner.authored.style ?? {}).some(relevant));
  assert.equal(owner.authored.attributes?.style, undefined);
  for (const rule of candidate.rules.filter(r => rootInitialSelectorCanApply(r.selector, owner.authored)))
    assert.ok(!Object.keys(rule).some(relevant));
  for (const [stage, field] of [['resolvedStyle', 'astylar'], ['normalResolvedStyle', 'astylarNormalResolvedStyle'],
    ['interactionResolvedStyle', 'astylarInteractionResolvedStyle']]) {
    assert.deepEqual(owner[stage], input[field]);
    assert.equal(owner[stage].color, '#2c3e50'); assert.equal(owner[stage].opacity, '0');
  }
  return { referenceNode: native.key, astylarNode: owner.key, disabled,
    referenceColor: input.reference.color, candidateColor: '#2c3e50', colorAuthoringOmitted: true,
    inputEquivalent: false, renderingEquivalent: false, originalInputLayersInvisible: true,
    visibleThumbCauseProven: false, defaultStageDivergence: true,
    publicReduction: 'examples/material-showcase/src/app/range-color-default-audit.spec.ts',
    publicReductionCommit: '1421e34',
    publicReductionLogSha256: 'd8530e48b61ff0966a64cc88efd030de80131f3b510e226465342f54298eb4ec',
    defaultOwner: 'src/app/config/browser-defaults.ts; src/app/services/dom/style-defaults.service.ts' };
}

export function applyRangeDefaultColors(rows, cases, inventory, normalize) {
  assert.equal(createHash('sha256').update(readFileSync('artifacts/material-parity/range-color-default-public-23e361f.log')).digest('hex'),
    'd8530e48b61ff0966a64cc88efd030de80131f3b510e226465342f54298eb4ec');
  return ['slider-start', 'slider-primary'].reduce((result, element) => applyModalBoxReview(result, cases, inventory, normalize, {
    family: 'slider', element, properties: ['color'], classification: 'intentional-documented-limitation',
    attribution: 'reviewed-range-color-default-policy', owner: 'core input default selection and browser UA compatibility policy',
    justification: 'Original range owners omit local color authoring but retain the generic input default in all three candidate stages, unlike native enabled/disabled defaults. The public same-input reduction reproduces both discrepancies while explicit colors pass. This is the documented incomplete-UA-default policy boundary, not equal rendering or a Material fixture correction. Both original input layers are invisible; no visible thumb, ring or drag causation is asserted.',
    prove: (entry, reference, candidate) => proveRangeDefaultColor(entry, reference, candidate, element),
  }), rows);
}

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
