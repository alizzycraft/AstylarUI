import assert from 'node:assert/strict';
import { applyModalBoxReview } from './modal-position-inspection.mjs';
import { proveControlStatePaint } from './control-state-paint-review.mjs';
import { inspectOverlayOwnerDeclarations } from './overlay-owner-declaration-review.mjs';
import { resolveOriginAliasPair } from './origin-alias-mapping-evidence.mjs';
import { proveExplicitComponentCursor } from './component-cursor-request-review.mjs';
import { inspectSliderInputBox } from './slider-input-box-evidence.mjs';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { proveChipPositionInspection } from './chip-position-inspection.mjs';

export function proveOmittedPointerBoundary(entry, reference, candidate, element) {
  assert.ok((entry.family === 'chips' && ['chip-0', 'chip-1'].includes(element)) ||
    (entry.family === 'tabs' && element === 'tab-panel'));
  const input = entry.styleInputs.find(i => i.id === element);
  let identity;
  if (entry.family === 'tabs') {
    identity = resolveOriginAliasPair(entry, reference, candidate, input);
    assert.equal(identity.status, 'mapped');
  } else {
    const composition = proveChipPositionInspection(reference, candidate);
    const pair = composition.chips.find(c => c.id === element); assert.ok(pair);
    const r = reference.nodes.find(n => n.key === pair.referenceOwner);
    const a = candidate.nodes.find(n => n.key === pair.candidateOwner);
    assert.equal(Object.keys(input.reference).length, 89);
    for (const [key, value] of Object.entries(input.reference)) assert.deepEqual(reference.styles[r.style][key], value);
    assert.equal(candidate.resolvedStyleEvidenceVersion, 2);
    assert.equal(candidate.resolvedStyleSource, 'core-style-inspection');
    for (const [field, stage] of [['astylar', 'resolvedStyle'], ['astylarNormalResolvedStyle', 'normalResolvedStyle'], ['astylarInteractionResolvedStyle', 'interactionResolvedStyle']])
      assert.deepEqual(input[field], a[stage]);
    const path = (tree, node) => {
      const keys = [];
      while (node) { assert.ok(!keys.includes(node.key)); keys.push(node.key);
        if (node.parent === null) return keys;
        node = tree.nodes.find(n => n.key === node.parent); assert.ok(node);
      }
      assert.fail('missing chip owner');
    };
    identity = { status: 'mapped', inputEquivalent: false, referenceNode: r.key, candidateNode: a.key,
      referencePath: path(reference, r), candidatePath: path(candidate, a), composition };
  }
  const trace = inspectOverlayOwnerDeclarations('pointerEvents', identity, reference, candidate);
  const relevant = key => ['pointerevents', 'all'].includes(key.replaceAll('-', '').toLowerCase());
  for (const node of trace.referencePath) {
    assert.equal(node.computed, 'auto'); assert.ok(!Object.keys(node.inline).some(relevant));
    assert.ok(node.rules.every(r => !r.active || !Object.keys(r.declarations).some(relevant)));
  }
  for (const node of trace.candidatePath) {
    assert.deepEqual(Object.values(node.localValues), ['<omitted>', '<omitted>', '<omitted>']);
    assert.ok(!Object.keys(node.inline).some(relevant));
    assert.ok(node.possibleRules.every(r => !Object.keys(r.declarations).some(relevant)));
  }
  return { referenceNode: identity.referenceNode, astylarNode: identity.candidateNode, identity, trace,
    inputEquivalent: false, renderingEquivalent: false, candidateComputedPointerEventsVerified: false,
    actualHitTargetVerified: false,
    limitation: 'No captured pointer request exists on either owner-to-root path. Browser computed auto and omitted candidate local declarations are different measurement stages. This does not establish candidate defaults, equivalent structures or actual hit behavior.' };
}

export function applyOmittedPointerBoundaryReviews(rows, cases, inventory, normalize) {
  return [['chips', 'chip-0'], ['chips', 'chip-1'], ['tabs', 'tab-panel']].reduce((result, [family, element]) =>
    applyModalBoxReview(result, cases, inventory, normalize, {
      family, element, properties: ['pointerEvents'], classification: 'parity-harness-defect',
      attribution: 'reviewed-pointer-computed-local-boundary',
      owner: 'audit computed/local pointer measurement; separate chip/tab composition and hit ownership',
      justification: 'Mapped owner-to-root paths omit pointer-events authoring on both sides, while the scalar compares browser computed auto with absent candidate local fields. It cannot demonstrate a missing authored auto declaration or a core hit-test defect. Candidate computed defaults, structure and actual interaction equivalence remain unproven.',
      prove: (entry, reference, candidate) => proveOmittedPointerBoundary(entry, reference, candidate, element),
    }), rows);
}

export function collectSliderPointerSource() {
  const file = 'docs/material-slider-peer-pointer-survey.json', bytes = readFileSync(file);
  const survey = JSON.parse(bytes), hash = value => createHash('sha256').update(value).digest('hex');
  for (const source of survey.sourceFingerprints)
    assert.equal(hash(readFileSync(source.file, 'utf8').replaceAll('\r\n', '\n')), source.sha256, source.file);
  assert.equal(hash(readFileSync(survey.capture.file)), survey.capture.sha256);
  assert.equal(survey.cases, 78); assert.equal(survey.owners, 156); assert.equal(survey.suppressedSiblingCases, 8);
  assert.equal(survey.dragCauseVerified, false);
  return { file, sha256: hash(bytes), survey };
}

export function proveSliderPointerRequest(entry, reference, candidate, evidence) {
  assert.equal(entry.family, 'slider'); assert.equal(entry.state, 'held');
  const key = `${entry.kind}:slider@${entry.profile}/${entry.viewport.id}/${entry.state}`;
  const observed = evidence.survey.observations.filter(o => o.case === key);
  assert.equal(observed.length, 1); assert.deepEqual(observed[0].inputTrees, entry.inputTrees);
  const pairs = ['slider-start', 'slider-primary'].map(id => {
    const input = entry.styleInputs.find(i => i.id === id);
    const box = inspectSliderInputBox(entry, input, reference, candidate); assert.ok(box);
    const r = reference.nodes.find(n => n.key === box.reference.node);
    const a = candidate.nodes.find(n => n.key === box.candidate.node);
    const path = (tree, node) => {
      const keys = [];
      while (node) { assert.ok(!keys.includes(node.key)); keys.push(node.key);
        if (node.parent === null) return keys;
        node = tree.nodes.find(n => n.key === node.parent); assert.ok(node);
      }
      assert.fail('missing owner');
    };
    const identity = { status: 'mapped', inputEquivalent: false, referenceNode: r.key, candidateNode: a.key,
      referencePath: path(reference, r), candidatePath: path(candidate, a) };
    const trace = inspectOverlayOwnerDeclarations('pointerEvents', identity, reference, candidate);
    const relevant = key => ['pointerevents', 'all'].includes(key.replaceAll('-', '').toLowerCase());
    const requests = trace.referencePath.flatMap(n => {
      assert.ok(!Object.keys(n.inline).some(relevant));
      return n.rules.filter(r => r.active && Object.keys(r.declarations).some(relevant));
    });
    assert.equal(trace.referencePath[0].computed, id === 'slider-start' ? 'none' : 'auto');
    assert.equal(requests.length, id === 'slider-start' ? 1 : 0);
    if (requests.length) {
      assert.equal(requests[0].selector, '.mdc-slider__input.mat-mdc-slider-input-no-pointer-events');
      assert.deepEqual(requests[0].declarations, { 'pointer-events': { value: 'none', important: false } });
    }
    for (const node of trace.candidatePath) {
      assert.deepEqual(Object.values(node.localValues), ['<omitted>', '<omitted>', '<omitted>']);
      assert.ok(!Object.keys(node.inline).some(relevant));
      assert.ok(node.possibleRules.every(r => !Object.keys(r.declarations).some(relevant)));
    }
    const old = observed[0].owners.find(o => o.element === id); assert.ok(old);
    assert.equal(old.referenceNode, r.key); assert.equal(old.candidateNode, a.key);
    assert.equal(old.referenceComputed, trace.referencePath[0].computed);
    return { id, box, trace };
  });
  assert.equal(pairs[0].box.reference.parent, pairs[1].box.reference.parent);
  return { referenceNode: pairs[0].box.reference.node, astylarNode: pairs[0].box.candidate.node,
    pairs, source: { file: evidence.file, sha256: evidence.sha256,
      mechanism: evidence.survey.installedReferenceMechanism, fingerprints: evidence.survey.sourceFingerprints },
    inputEquivalent: false, renderingEquivalent: false, dragCauseVerified: false,
    candidateComputedPointerEventsVerified: false,
    limitation: 'Held-state sibling suppression is an unequal input. Both drag directions, pointer capture, release/cancel and peer-dependent geometry require separate causal proof; no fixture pointer patch is justified here.' };
}

export function applySliderPointerRequestReview(rows, cases, inventory, normalize) {
  const evidence = collectSliderPointerSource();
  return applyModalBoxReview(rows, cases, inventory, normalize, {
    family: 'slider', element: 'slider-start', properties: ['pointerEvents'],
    classification: 'application-plugin-authoring-defect', attribution: 'reviewed-slider-held-pointer-request-omission',
    owner: 'range plugin peer interaction state versus native sibling hit policy',
    justification: 'Every original held-state pair has explicit native start-sibling pointer suppression and an auto end thumb. Candidate authoring and three local stages omit the peer-state request throughout ancestry. Existing installed-source evidence explains the native class; neither this classification nor local omission proves the cause of swapped or jerky dragging.',
    prove: (entry, reference, candidate) => proveSliderPointerRequest(entry, reference, candidate, evidence),
  });
}

const disabledOwners = [
  ['button', 'button-disabled'], ['checkbox', 'checkbox-primary'],
  ['checkbox', 'checkbox-label'], ['radio', 'radio-solo-label'], ['radio', 'radio-team-label'],
];

export function proveDisabledPointerRequest(entry, reference, candidate, element) {
  assert.ok(disabledOwners.some(([family, id]) => family === entry.family && id === element));
  // Reuse independently checked owner/stage and ancestry correspondence, not
  // the cursor result as proof of pointer behavior.
  const owners = proveExplicitComponentCursor(entry, reference, candidate, element);
  const identity = { status: 'mapped', inputEquivalent: false,
    referenceNode: owners.referenceNode, candidateNode: owners.astylarNode,
    referencePath: owners.nativePath.map(n => n.node), candidatePath: owners.candidatePath.map(n => n.node) };
  const trace = inspectOverlayOwnerDeclarations('pointerEvents', identity, reference, candidate);
  const relevant = key => ['pointerevents', 'all'].includes(key.replaceAll('-', '').toLowerCase());
  const inherited = element.endsWith('-label'), requestIndex = inherited ? 3 : 0;
  const expected = entry.family === 'button'
    ? ['.mdc-button:disabled', '.mat-mdc-unelevated-button[disabled], .mat-mdc-unelevated-button.mat-mdc-button-disabled']
    : [entry.family === 'checkbox' ? '.mdc-checkbox--disabled' : '.mat-mdc-radio-disabled'];
  for (const [index, node] of trace.referencePath.entries()) {
    assert.equal(node.computed, index <= requestIndex ? 'none' : 'auto');
    assert.ok(!Object.keys(node.inline).some(relevant));
    const requests = node.rules.filter(r => r.active && Object.keys(r.declarations).some(relevant));
    assert.deepEqual(requests.map(r => r.selector), index === requestIndex ? expected : []);
    for (const rule of requests) {
      assert.deepEqual(rule.declarations['pointer-events'], { value: 'none', important: false });
      assert.equal(rule.declarations.all, undefined);
    }
  }
  for (const node of trace.candidatePath) {
    assert.deepEqual(Object.values(node.localValues), ['<omitted>', '<omitted>', '<omitted>']);
    assert.ok(!Object.keys(node.inline).some(relevant));
    assert.ok(node.possibleRules.every(r => !Object.keys(r.declarations).some(relevant)));
  }
  return { referenceNode: owners.referenceNode, astylarNode: owners.astylarNode,
    ownerCorrespondence: owners, trace, inherited, requestOwner: trace.referencePath[requestIndex].node,
    inputEquivalent: false, renderingEquivalent: false, actualHitTargetVerified: false,
    candidateComputedPointerEventsVerified: false, disabledGuardEquivalentToPointerSuppression: false,
    limitation: 'Native disabled CSS suppression, including inherited label suppression, is absent from candidate authored paths. Event-handler disabled guards are a different mechanism; no actual picked-mesh, event delivery or renderer causation is inferred.' };
}

export function applyDisabledPointerRequestReviews(rows, cases, inventory, normalize) {
  return disabledOwners.reduce((result, [family, element]) => applyModalBoxReview(result, cases, inventory, normalize, {
    family, element, properties: ['pointerEvents'], classification: 'application-plugin-authoring-defect',
    attribution: 'reviewed-disabled-pointer-request-omission',
    owner: 'Material disabled-state authoring and inherited pointer policy; separate core event guards',
    justification: 'Native disabled controls explicitly request pointer-events none; measured labels inherit it through their retained ancestors. Candidate owner-to-root authoring and all three local stages omit that CSS request. This is an input omission, not evidence that activation guards implement equivalent hit suppression or that the renderer delivered an incorrect event.',
    prove: (entry, reference, candidate) => proveDisabledPointerRequest(entry, reference, candidate, element),
  }), rows);
}

export function proveBadgePointerRequest(entry, reference, candidate) {
  assert.equal(entry.family, 'badge');
  const input = entry.styleInputs.find(i => i.id === 'badge-count');
  const identity = resolveOriginAliasPair(entry, reference, candidate, input);
  assert.equal(identity.status, 'mapped');
  const trace = inspectOverlayOwnerDeclarations('pointerEvents', identity, reference, candidate);
  const relevant = key => ['pointerevents', 'all'].includes(key.replaceAll('-', '').toLowerCase());
  assert.equal(trace.referencePath[0].type, 'span');
  assert.equal(trace.candidatePath[0].authored.type, 'span');
  for (const [index, node] of trace.referencePath.entries()) {
    assert.equal(node.computed, index === 0 ? 'none' : 'auto');
    assert.ok(!Object.keys(node.inline).some(relevant));
    const requests = node.rules.filter(r => r.active && Object.keys(r.declarations).some(relevant));
    assert.equal(requests.length, index === 0 ? 1 : 0);
    if (index === 0) {
      assert.equal(requests[0].selector, '.mat-badge-content');
      assert.deepEqual(requests[0].declarations['pointer-events'], { value: 'none', important: false });
      assert.equal(requests[0].declarations.all, undefined);
    }
  }
  for (const node of trace.candidatePath) {
    assert.deepEqual(Object.values(node.localValues), ['<omitted>', '<omitted>', '<omitted>']);
    assert.ok(!Object.keys(node.inline).some(relevant));
    assert.ok(node.possibleRules.every(r => !Object.keys(r.declarations).some(relevant)));
  }
  return { referenceNode: identity.referenceNode, astylarNode: identity.candidateNode,
    identity, trace, inputEquivalent: false, renderingEquivalent: false,
    actualHitTargetVerified: false, candidateComputedPointerEventsVerified: false,
    limitation: 'Explicit native badge hit-suppression request is absent from candidate authoring and all captured local stages. This does not reconstruct candidate computed defaults or prove actual event delivery.' };
}

export function applyBadgePointerRequestReview(rows, cases, inventory, normalize) {
  return applyModalBoxReview(rows, cases, inventory, normalize, {
    family: 'badge', element: 'badge-count', properties: ['pointerEvents'],
    classification: 'application-plugin-authoring-defect', attribution: 'reviewed-badge-pointer-request-omission',
    owner: 'Material badge fixture authoring; core pointer hit-suppression contract',
    justification: 'Corresponding badge spans differ before layout: native .mat-badge-content explicitly requests pointer-events none; candidate authoring, ancestry and all three local style stages omit that request. Unlike the sheet wrapper, these are mapped badge-content owners. Actual candidate hit behavior and rendering equivalence remain unproven.',
    prove: proveBadgePointerRequest,
  });
}

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
