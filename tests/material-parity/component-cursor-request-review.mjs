import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { applyModalBoxReview } from './modal-position-inspection.mjs';
import { resolveOriginAliasPair } from './origin-alias-mapping-evidence.mjs';
import { rootInitialSelectorCanApply } from './root-initial-style-evidence.mjs';
import { validateCursorEvidence } from './public-cursor-defaults-evidence.mjs';
import { inspectExpansionOwnerMapping } from '../../scripts/audit-material-expansion-owner-mapping.mjs';

const one = items => { assert.equal(items.length, 1); return items[0]; };
const relevant = key => ['cursor', 'all'].includes(key.replaceAll('-', '').toLowerCase());
export function isComponentCursorReviewRow(row) {
  return row.property === 'cursor' && [
    'reviewed-slider-host-cursor-omission', 'reviewed-disabled-component-cursor-substitution',
    'reviewed-button-cursor-request-substitution', 'reviewed-dialog-button-cursor-default-policy',
    'reviewed-choice-label-cursor-ancestry-substitution',
    'reviewed-disabled-range-cursor-request',
    'reviewed-expansion-panel-header-cursor-owner', 'reviewed-expansion-disabled-title-cursor-ancestry',
  ].includes(row.attribution);
}

// Same original-row replay boundary as the other component reviews. Callers
// authenticate original capture/inventory; proposed classifications are not input.
export function validateComponentCursorReviews(rows, originalRows, cases, inventory, normalize) {
  try {
    const expected = applyExplicitComponentCursors(originalRows, cases, inventory, normalize).filter(isComponentCursorReviewRow);
    assert.ok(JSON.stringify(rows.filter(isComponentCursorReviewRow)) === JSON.stringify(expected),
      'cursor reviews differ from original-source replay');
    return [];
  } catch (error) { return [`component cursor evidence does not replay: ${error.message}`]; }
}

const definitions = [
  ...['expansion-primary', 'expansion-title'].map(element => ({ family: 'expansion', element, expansionOwner: true })),
  ...['slider-primary', 'slider-start'].map(element => ({ family: 'slider', element,
    nativeType: 'input', candidateType: 'input', selector: '.range-layer', disabledRange: true,
    nativeSelector: '.mat-mdc-slider.mdc-slider--disabled .mdc-slider__input' })),
  { family: 'button', element: 'button-disabled', nativeType: 'button', candidateType: 'button', selector: '.material-button', nativeSelector: '.mdc-button:disabled' },
  { family: 'checkbox', element: 'checkbox-primary', nativeType: 'mat-checkbox', candidateType: 'div', selector: '#checkbox-primary', nativeSelector: '.mdc-checkbox--disabled' },
  { family: 'slider', element: 'slider-visual', nativeType: 'mat-slider', candidateType: 'showcase.material:range-visual', nativeSelector: '.mat-mdc-slider' },
  ...[
    ['core', 'core-primary', '.material-button'], ['toolbar', 'toolbar-action', '.toolbar-action'],
    ['card', 'card-open', '.text-button'], ['button', 'button-primary', '.material-button'],
    ['button', 'button-secondary', '.material-button'], ['menu', 'menu-primary', '.material-button'],
    ['bottom-sheet', 'bottom-sheet-primary', '.material-button'], ['dialog', 'dialog-primary', '.material-button'],
    ['snack-bar', 'snack-bar-primary', '.material-button'], ['tooltip', 'tooltip-primary', '.material-button'],
  ].map(([family, element, selector]) => ({ family, element, selector, nativeType: 'button', candidateType: 'button' })),
  ...['dialog-cancel', 'dialog-save'].map(element => ({ family: 'dialog', element,
    nativeType: 'button', candidateType: 'button', defaultPolicy: true })),
  ...[
    ['checkbox', 'checkbox-label', 'checkbox-primary', '#checkbox-primary'],
    ['radio', 'radio-solo-label', 'radio-solo', '.radio-option'],
    ['radio', 'radio-team-label', 'radio-team', '.radio-option'],
    ['slide-toggle', 'slide-toggle-label', 'slide-toggle-primary', '#slide-toggle-primary'],
  ].map(([family, element, parentId, selector]) => ({ family, element, parentId, selector,
    nativeType: 'span', candidateType: 'span', inheritedLabel: true })),
];

export function collectCursorDefaultPolicyEvidence() {
  const artifactRoot = 'artifacts/material-parity/public-cursor-defaults-4cf733e';
  const read = file => readFileSync(`${artifactRoot}/${file}`), bytes = read('latest-report.json');
  const reportSha256 = createHash('sha256').update(bytes).digest('hex');
  assert.equal(reportSha256, '4773eb64cb37931bfb53e2c3852b7b439eac366e2da51aaf2eb22f0c7133b9a8');
  const proof = validateCursorEvidence(JSON.parse(bytes), read);
  const observations = proof.observations.filter(p => p.name === 'button-omitted');
  assert.equal(observations.length, 4);
  assert.equal(proof.sourceProof.defaultStyles.button, 'pointer');
  for (const observation of observations) for (const stage of observation.stages) {
    assert.equal(stage.referenceOwnerCursor, 'default'); assert.equal(stage.candidateOwnerCursor, 'pointer');
  }
  return { artifactRoot, reportSha256, provenance: proof.provenance, sourceCommit: proof.sourceCommit,
    browser: proof.browser, sourceWitnesses: proof.sourceProof.witnesses, observations,
    classification: 'intentional-documented-limitation',
    contract: 'docs/compatibility/html-css.md: Values, units, inheritance, and defaults; Complete browser UA defaults',
    historicalMaterialHoverCauseProven: false };
}

// Bind explicit request differences; omitted native button authoring is kept
// distinct from explicit disabled requests. Neither proves a hovered cursor.
export function proveExplicitComponentCursor(entry, reference, candidate, element, defaultEvidence) {
  const definition = one(definitions.filter(d => d.family === entry.family && d.element === element));
  if (definition.expansionOwner) return proveExpansionCursorOwner(entry, reference, candidate, element);
  if (definition.defaultPolicy) {
    assert.equal(defaultEvidence?.reportSha256, '4773eb64cb37931bfb53e2c3852b7b439eac366e2da51aaf2eb22f0c7133b9a8');
    assert.equal(defaultEvidence.classification, 'intentional-documented-limitation');
  }
  const input = one(entry.styleInputs.filter(i => i.id === element));
  const direct = reference.nodes.filter(n => n.attributes?.id === element);
  assert.ok(direct.length <= 1);
  let native = direct[0], mapping;
  if (!native) {
    mapping = resolveOriginAliasPair(entry, reference, candidate, input);
    assert.ok(['mapped', 'mapped-with-scalar-rule-gap'].includes(mapping.status), mapping.reason);
    native = one(reference.nodes.filter(n => n.key === mapping.referenceNode));
  }
  const owner = one(candidate.nodes.filter(n => n.authored?.id === element));
  assert.equal(native.type, definition.nativeType); assert.equal(owner.authored.type, definition.candidateType);
  for (const [property, value] of Object.entries(input.reference)) assert.equal(reference.styles[native.style][property], value);
  const slider = entry.family === 'slider', expectedReference = definition.disabledRange ? 'auto' : slider ? 'pointer' : 'default';
  if (definition.disabledRange) {
    assert.equal(native.attributes.type, 'range'); assert.equal(Object.hasOwn(native.attributes, 'disabled'), true);
    assert.equal(owner.authored.inputType, 'range'); assert.equal(owner.authored.disabled, true);
    const parent = one(reference.nodes.filter(n => n.key === native.parent));
    assert.ok(parent.attributes.class.split(/\s+/).includes('mdc-slider--disabled'));
    assert.equal(reference.styles[native.style].pointerEvents, 'auto');
    for (const stage of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle'])
      assert.equal(Object.hasOwn(owner[stage], 'pointerEvents'), false);
  }
  assert.equal(input.reference.cursor, expectedReference);
  assert.ok(!Object.keys(native.inline ?? {}).some(relevant));
  const nativeRequests = native.rules.map(i => reference.rules[i]).filter(r => r.active && Object.keys(r.declarations).some(relevant));
  if (definition.nativeSelector) assert.ok(nativeRequests.some(r => r.selector === definition.nativeSelector));
  else assert.deepEqual(nativeRequests, []);
  if (definition.disabledRange) assert.deepEqual(nativeRequests.map(rule => ({ selector: rule.selector, declarations:
    Object.fromEntries(Object.entries(rule.declarations).filter(([key]) => relevant(key))) })), [
    { selector: '.mdc-slider__input', declarations: { cursor: { value: 'pointer', important: false } } },
    { selector: definition.nativeSelector, declarations: { cursor: { value: 'auto', important: false } } },
  ]);
  else for (const rule of nativeRequests) {
    assert.ok(!Object.hasOwn(rule.declarations, 'all'));
    assert.equal(rule.declarations.cursor?.value, expectedReference);
    assert.equal(rule.declarations.cursor?.important, false);
  }
  if (!slider && definition.nativeSelector) assert.match(native.attributes.class, /disabled/);
  const nativePath = [], nativeSeen = new Set();
  for (let node = native; node; node = node.parent === null ? null : one(reference.nodes.filter(n => n.key === node.parent))) {
    assert.ok(!nativeSeen.has(node.key)); nativeSeen.add(node.key);
    const requests = node.rules.map(i => reference.rules[i]).filter(r => r.active && Object.keys(r.declarations).some(relevant));
    if (definition.inheritedLabel) {
      assert.ok(!Object.keys(node.inline ?? {}).some(relevant));
      assert.ok(['default', 'auto'].includes(reference.styles[node.style].cursor));
      for (const rule of requests) {
        const expected = entry.family === 'checkbox' ? {
          '.mat-mdc-checkbox label': 'pointer',
          '.mat-mdc-checkbox.mat-mdc-checkbox-disabled label': 'default',
          '.mdc-checkbox--disabled': 'default',
        } : entry.family === 'radio' ? { '.mat-mdc-radio-disabled': 'default' } : {};
        assert.ok(Object.hasOwn(expected, rule.selector));
        assert.equal(rule.declarations.cursor?.value, expected[rule.selector]);
        assert.equal(rule.declarations.cursor?.important, false); assert.equal(rule.declarations.all, undefined);
      }
    } else if (!definition.nativeSelector) {
      assert.ok(!Object.keys(node.inline ?? {}).some(relevant)); assert.deepEqual(requests, []);
      assert.equal(reference.styles[node.style].cursor, node === native ? 'default' : 'auto');
    }
    nativePath.push({ node: node.key, type: node.type, cursor: reference.styles[node.style].cursor, requests });
  }
  if (definition.inheritedLabel) {
    assert.equal(nativePath[1]?.type, 'label'); assert.equal(nativePath[1].cursor, 'default');
    const requests = nativePath.flatMap(n => n.requests);
    if (entry.family === 'checkbox') {
      assert.equal(nativePath[1].requests.length, 2); assert.equal(requests.length, 3);
    } else if (entry.family === 'radio') assert.ok(requests.length === 0 || requests.length === 1);
    else assert.equal(requests.length, 0);
  }
  const path = [], seen = new Set();
  for (let node = owner; node; node = node.parent === null ? null : one(candidate.nodes.filter(n => n.key === node.parent))) {
    assert.ok(!seen.has(node.key)); seen.add(node.key);
    assert.ok(!Object.keys(node.authored.style ?? {}).some(relevant));
    assert.equal(node.authored.attributes?.style, undefined);
    const requests = candidate.rules.filter(r => rootInitialSelectorCanApply(r.selector, node.authored) && Object.keys(r).some(relevant));
    const requestOwner = definition.inheritedLabel ? path.length === 1 : node === owner && (!slider || definition.disabledRange) && !definition.defaultPolicy;
    if (requestOwner) {
      assert.equal(requests.length, 1); assert.equal(requests[0].selector, definition.selector);
      assert.equal(requests[0].cursor, 'pointer'); assert.equal(requests[0].all, undefined);
      if (definition.inheritedLabel) {
        assert.equal(node.authored.id, definition.parentId); assert.equal(node.authored.type, 'div');
        for (const stage of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle']) assert.equal(node[stage].cursor, 'pointer');
      }
    } else assert.deepEqual(requests, []);
    if (definition.defaultPolicy && node !== owner && node.normalResolvedStyle) assert.equal(node.normalResolvedStyle.cursor, 'default');
    path.push({ node: node.key, authored: node.authored, requests });
  }
  for (const [stage, field] of [['resolvedStyle', 'astylar'], ['normalResolvedStyle', 'astylarNormalResolvedStyle'], ['interactionResolvedStyle', 'astylarInteractionResolvedStyle']]) {
    assert.deepEqual(owner[stage], input[field]); assert.equal(owner[stage].cursor, slider && !definition.disabledRange ? 'default' : 'pointer');
  }
  return { referenceNode: native.key, astylarNode: owner.key, mapping,
    nativeRequests, nativePath, nativeAuthorCursorOmitted: !definition.nativeSelector,
    inheritedLabel: definition.inheritedLabel ?? false,
    candidatePath: path, nativeCursor: expectedReference,
    candidateCursor: owner.normalResolvedStyle.cursor,
    ...(definition.disabledRange ? { disabledRange: true, nativeDisabled: true, candidateDisabled: true,
      nativePointerEvents: reference.styles[native.style].pointerEvents, candidatePointerEventsPresent: false } : {}),
    ...(definition.defaultPolicy ? { defaultPolicyEvidence: defaultEvidence } : {}),
    inputEquivalent: false, renderingEquivalent: false, actualHoverCursorVerified: false,
    limitation: 'Original authored request and owner-stage discrepancy only. Disabled hit suppression, inherited label behavior, plugin mesh cursor and actual canvas hover remain separate questions.' };
}

export function proveExpansionCursorOwner(entry, reference, candidate, element) {
  assert.equal(entry.family, 'expansion');
  assert.ok(['expansion-primary', 'expansion-title'].includes(element));
  const primary = one(entry.styleInputs.filter(i => i.id === 'expansion-primary'));
  const title = one(entry.styleInputs.filter(i => i.id === 'expansion-title'));
  const mapping = inspectExpansionOwnerMapping(primary, title, reference, candidate);
  const input = element === 'expansion-primary' ? primary : title;
  const native = one(reference.nodes.filter(n => (n.attributes?.['data-parity-id'] ?? n.attributes?.id) === element));
  const owner = one(candidate.nodes.filter(n => n.authored?.id === element));
  for (const [property, value] of Object.entries(input.reference)) assert.equal(reference.styles[native.style][property], value);
  assert.equal(input.reference.cursor, 'auto');
  for (const [stage, field] of [['resolvedStyle','astylar'],['normalResolvedStyle','astylarNormalResolvedStyle'],['interactionResolvedStyle','astylarInteractionResolvedStyle']]) {
    assert.deepEqual(owner[stage], input[field]); assert.equal(owner[stage].cursor, 'pointer');
  }
  let titleAncestry;
  if (element === 'expansion-title') {
    assert.equal(mapping.state.disabled, true);
    const referenceParent = one(reference.nodes.filter(n => n.key === native.parent));
    const candidateParent = one(candidate.nodes.filter(n => n.key === owner.parent));
    assert.equal(referenceParent.type, 'span'); assert.equal(candidateParent.authored.id, 'expansion-primary');
    assert.equal(reference.styles[referenceParent.style].cursor, 'auto');
    assert.equal(mapping.headerCursor.reference, 'auto');
    assert.ok(!Object.keys(native.inline ?? {}).some(relevant));
    assert.deepEqual(native.rules.map(i => reference.rules[i]).filter(r => r.active && Object.keys(r.declarations).some(relevant)), []);
    assert.ok(!Object.keys(owner.authored.style ?? {}).some(relevant));
    assert.equal(owner.authored.attributes?.style, undefined);
    assert.deepEqual(candidate.rules.filter(r => rootInitialSelectorCanApply(r.selector, owner.authored) && Object.keys(r).some(relevant)), []);
    for (const stage of ['resolvedStyle','normalResolvedStyle','interactionResolvedStyle']) assert.equal(candidateParent[stage].cursor, 'pointer');
    titleAncestry = { referenceParent: referenceParent.key, candidateParent: candidateParent.key,
      referenceParentCursor: 'auto', candidateParentCursor: 'pointer', titleLocalCursorRequests: [] };
  }
  return { referenceNode: native.key, astylarNode: owner.key, nativeCursor: input.reference.cursor,
    candidateCursor: owner.normalResolvedStyle.cursor, mapping, ...(titleAncestry ? { titleAncestry } : {}),
    inputEquivalent: false, renderingEquivalent: false, actualHoverCursorVerified: false,
    limitation: 'Retained panel/header role and disabled ancestry evidence; no physical hit target, emitted cursor or current rendering acceptance.' };
}

export function applyExplicitComponentCursors(rows, cases, inventory, normalize) {
  const defaultEvidence = rows.some(r => r.family === 'dialog' && ['dialog-cancel', 'dialog-save'].includes(r.element) &&
    r.property === 'cursor' && r.attribution === 'unresolved') ? collectCursorDefaultPolicyEvidence() : undefined;
  return definitions.reduce((result, d) => applyModalBoxReview(result, cases, inventory, normalize, {
    family: d.family, element: d.element, properties: ['cursor'],
    ...(d.disabledRange ? { acceptsRow: row => !Object.hasOwn(row, 'attribution') &&
      row.classification === 'parity-harness-defect' && row.reference === 'auto' && row.astylar === 'pointer' } : {}),
    ...(d.expansionOwner ? { acceptsRow: row => !Object.hasOwn(row, 'attribution') &&
      row.classification === 'parity-harness-defect' && row.reference === 'auto' && row.astylar === 'pointer' } : {}),
    classification: d.expansionOwner && d.element === 'expansion-primary' ? 'parity-harness-defect'
      : d.defaultPolicy ? 'intentional-documented-limitation' : 'application-plugin-authoring-defect',
    attribution: d.expansionOwner ? d.element === 'expansion-primary' ? 'reviewed-expansion-panel-header-cursor-owner' : 'reviewed-expansion-disabled-title-cursor-ancestry'
      : d.disabledRange ? 'reviewed-disabled-range-cursor-request' : d.inheritedLabel ? 'reviewed-choice-label-cursor-ancestry-substitution' : d.defaultPolicy ? 'reviewed-dialog-button-cursor-default-policy' : d.family === 'slider' ? 'reviewed-slider-host-cursor-omission' : d.nativeSelector
      ? 'reviewed-disabled-component-cursor-substitution' : 'reviewed-button-cursor-request-substitution',
    owner: d.defaultPolicy ? 'core button cursor defaults; incomplete browser UA baseline policy' : 'Material comparison authored cursor requests and component-owner mapping',
    justification: d.expansionOwner
      ? d.element === 'expansion-primary'
        ? 'The original native ID measures the panel while the candidate ID measures its replacement header. Role-correct enabled header cursors match; eight disabled headers retain native auto versus candidate unconditional pointer. Preserve the raw panel/header values and that separate authoring defect; role correspondence is not structural equivalence or actual hovered-canvas verification.'
        : 'The eight disabled native titles have no local cursor request and inherit auto through the native header. Candidate titles have no local request and inherit pointer from the unconditional expansion-trigger rule. This is unequal disabled header authoring,not a separate title inheritance algorithm failure or actual physical cursor proof.'
      : d.disabledRange
      ? 'Both mapped range inputs are explicitly disabled. The native active disabled selector overrides pointer with auto; candidate range-layer still requests pointer in every captured style stage. Preserve native pointer-events auto and candidate omission without inventing a suppression rule. This is unequal disabled-state authoring, not physical hit suppression, emitted canvas cursor or a core defect.'
      : d.inheritedLabel
      ? 'The measured native span sits under a label computing default; the candidate span sits under a div explicitly requesting pointer, retained by both parent and span in all three stages. Native disabled declarations and complete ancestry remain recorded. The inherited cursor inputs and structure differ before a core comparison; no faulty inheritance algorithm or actual hovered-canvas cursor is inferred.'
      : d.defaultPolicy
      ? 'Both mapped dialog actions omit cursor authoring through their captured ancestries; native button default differs from candidate pointer in all three stages. The fresh public equal-input button reduction and matching package/source default methods reproduce this documented incomplete-UA-default boundary. This is not equal rendering, not a fixture offset remedy, and not proof of the historical Material hovered-canvas cursor.'
      : d.family === 'slider'
      ? 'The native slider host explicitly requests pointer; the corresponding candidate visual owner and captured ancestry omit that request and resolve default in all three stages. This is unequal authoring, not proof of a core hit-test defect or the cursor emitted by plugin meshes.'
      : d.nativeSelector
        ? 'The native disabled component explicitly requests default; the candidate owner explicitly requests pointer and retains it in all three stages. This proves unequal disabled-state authoring, not actual hover behavior or disabled hit suppression.'
        : 'The native button and captured ancestry omit author cursor requests and the native button computes default. The candidate button explicitly requests pointer, retained in all three stages. These are unequal inputs before a core comparison; this does not claim that removing the candidate request would restore browser defaults or prove the actual hovered canvas cursor.',
    prove: (entry, reference, candidate) => proveExplicitComponentCursor(entry, reference, candidate, d.element, defaultEvidence),
  }), rows);
}
