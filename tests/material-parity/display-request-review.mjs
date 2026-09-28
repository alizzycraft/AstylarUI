import assert from 'node:assert/strict';
import { applyModalBoxReview } from './modal-position-inspection.mjs';
import { resolveOriginAliasPair } from './origin-alias-mapping-evidence.mjs';
import { rootInitialSelectorCanApply } from './root-initial-style-evidence.mjs';

// Explicit requests only. Radio/tab type defaults and toolbar blockification
// need different proofs; do not classify them by comparing computed strings.
export const displayRequestOwners = [
  ['button-toggle', 'button-toggle-one', 'mat-button-toggle', 'div', 'block', 'flex', null, '.button-toggle-option'],
  ['button-toggle', 'button-toggle-two', 'mat-button-toggle', 'div', 'block', 'flex', null, '.button-toggle-option'],
  ['button-toggle', 'button-toggle-primary', 'mat-button-toggle-group', 'div', 'inline-flex', 'flex', '.mat-button-toggle-standalone, .mat-button-toggle-group', '#button-toggle-primary'],
  ['checkbox', 'checkbox-primary', 'mat-checkbox', 'div', 'inline-block', 'flex', '.mat-mdc-checkbox', '#checkbox-primary'],
  ['dialog', 'dialog-cancel', 'button', 'button', 'flex', 'block', '.mdc-button', null, 'inline-flex'],
  ['dialog', 'dialog-save', 'button', 'button', 'flex', 'block', '.mdc-button', null, 'inline-flex'],
  ['expansion', 'expansion-title', 'mat-panel-title', 'span', 'flex', 'inline', '.mat-expansion-panel-header-title, .mat-expansion-panel-header-description', null],
  ['grid-list', 'grid-tile-one', 'mat-grid-tile', 'div', 'block', 'flex', '.mat-grid-tile', '.grid-tile'],
  ['grid-list', 'grid-tile-two', 'mat-grid-tile', 'div', 'block', 'flex', '.mat-grid-tile', '.grid-tile'],
  ['list', 'list-primary', 'mat-list', 'div', 'block', 'flex', '.mat-mdc-list-base', '.material-list'],
  ['slide-toggle', 'slide-toggle-primary', 'mat-slide-toggle', 'div', 'inline-block', 'block', '.mat-mdc-slide-toggle', null],
  ['slider', 'slider-visual', 'mat-slider', 'showcase.material:range-visual', 'inline-block', 'block', '.mat-mdc-slider', null],
  ['stepper', 'stepper-primary', 'mat-stepper', 'div', 'block', 'flex', '.mat-stepper-vertical, .mat-stepper-horizontal', '.stepper'],
  ['tooltip', 'tooltip-popup', 'div', 'div', 'block', 'flex', null, '#tooltip-popup'],
  ['tree', 'tree-primary', 'mat-tree', 'div', 'block', 'flex', '.mat-tree', '.material-tree'],
];

export function proveDisplayRequest(entry, reference, candidate, element) {
  const scope = displayRequestOwners.find(([family, id]) => entry.family === family && id === element);
  assert.ok(scope);
  for (const tree of [reference, candidate]) {
    assert.deepEqual(tree.errors, []); assert.equal(tree.ruleEvidenceComplete, true);
    assert.equal(new Set(tree.nodes.map(n => n.key)).size, tree.nodes.length);
  }
  const inputs = entry.styleInputs.filter(i => i.id === element); assert.equal(inputs.length, 1);
  const input = inputs[0];
  let natives = reference.nodes.filter(n => n.attributes?.id === element || n.attributes?.['data-parity-id'] === element), identity;
  if (!natives.length) {
    identity = resolveOriginAliasPair(entry, reference, candidate, input);
    assert.ok(['mapped', 'mapped-with-scalar-rule-gap'].includes(identity.status));
    assert.deepEqual(identity.extraRules, []);
    if (identity.status === 'mapped') assert.deepEqual(identity.missingRules, []);
    else {
      assert.equal(element, 'tooltip-popup');
      // Preserve the existing overlay-rule gap; it is not a display request.
      assert.equal(identity.missingRules.length, 1);
      assert.ok(JSON.stringify(identity.missingRules).includes('.cdk-global-overlay-wrapper'));
      assert.ok(!/display|\ball\b/.test(JSON.stringify(identity.missingRules)));
    }
    natives = reference.nodes.filter(n => n.key === identity.referenceNode);
  }
  const candidates = candidate.nodes.filter(n => n.authored?.id === element);
  assert.equal(natives.length, 1); assert.equal(candidates.length, 1);
  const r = natives[0], a = candidates[0];
  assert.equal(r.type, scope[2]); assert.equal(a.authored.type, scope[3]);
  assert.equal(candidate.resolvedStyleEvidenceVersion, 2); assert.equal(candidate.resolvedStyleSource, 'core-style-inspection');
  assert.equal(input.astylarResolvedStyleEvidenceVersion, 2); assert.equal(Object.keys(input.reference).length, 89);
  for (const [key, value] of Object.entries(input.reference)) assert.deepEqual(reference.styles[r.style][key], value);
  const select = style => Object.fromEntries(Object.entries(style ?? {}).filter(([key]) => ['display', 'all'].includes(key.toLowerCase())));
  assert.deepEqual(select(r.inline), {}); assert.deepEqual(select(a.authored.style), {}); assert.equal(a.authored.attributes?.style, undefined);
  const nativeRules = r.rules.map(i => reference.rules[i]).filter(rule => rule.active);
  const nativeRequests = nativeRules.map(rule => ({ selector: rule.selector, conditions: rule.conditions, declarations: select(rule.declarations) })).filter(rule => Object.keys(rule.declarations).length);
  assert.deepEqual(nativeRequests, scope[6] ? [{ selector: scope[6], conditions: [], declarations: { display: { value: scope[8] ?? scope[4], important: false } } }] : []);
  const serialized = nativeRules.flatMap(rule => [...rule.cssText.matchAll(/(?:^|;)\s*(display|all)\s*:\s*([^;]*)(?=;|$)/gi)].map(([, key, value]) => ({ selector: rule.selector, key: key.toLowerCase(), value: value.trim() })));
  assert.deepEqual(serialized, scope[6] ? [{ selector: scope[6], key: 'display', value: scope[8] ?? scope[4] }] : []);
  const candidateRequests = candidate.rules.filter(rule => rootInitialSelectorCanApply(rule.selector, a.authored)).map(({ selector, ...style }) => ({ selector, declarations: select(style) })).filter(rule => Object.keys(rule.declarations).length);
  assert.deepEqual(candidateRequests, scope[7] ? [{ selector: scope[7], declarations: { display: scope[5] } }] : []);
  assert.equal(reference.styles[r.style].display, scope[4]);
  for (const [scalar, stage] of [['astylar', 'resolvedStyle'], ['astylarNormalResolvedStyle', 'normalResolvedStyle'], ['astylarInteractionResolvedStyle', 'interactionResolvedStyle']]) {
    assert.deepEqual(input[scalar], a[stage]); assert.deepEqual(select(a[stage]), { display: scope[5] });
  }
  const rp = reference.nodes.find(n => n.key === r.parent), ap = candidate.nodes.find(n => n.key === a.parent);
  assert.ok(rp); assert.ok(ap);
  if (scope[8]) assert.equal(reference.styles[rp.style].display, 'flex');
  if (['button-toggle-one', 'button-toggle-two'].includes(element)) assert.equal(reference.styles[rp.style].display, 'inline-flex');
  return { referenceNode: r.key, astylarNode: a.key, identity, nativeRequests, candidateRequests,
    nativeComputedDisplay: scope[4], candidateLocalDisplay: scope[5],
    parentDisplays: { reference: reference.styles[rp.style].display, candidate: ap.resolvedStyle.display },
    ownerTypes: { reference: r.type, candidate: a.authored.type },
    directChildTypes: { reference: reference.nodes.filter(n => n.parent === r.key).map(n => n.type), candidate: candidate.nodes.filter(n => n.parent === a.key).map(n => n.authored.type) },
    structuralEquivalenceProven: false, candidateUsedDisplayVerified: false, renderingEquivalent: false };
}

export function applyDisplayRequestReviews(rows, cases, inventory, normalize) {
  for (const [family, element] of displayRequestOwners) rows = applyModalBoxReview(rows, cases, inventory, normalize, {
    family, element, properties: ['display'],
    prove: (entry, r, a) => proveDisplayRequest(entry, r, a, element),
    classification: 'application-plugin-authoring-defect', attribution: 'reviewed-display-request-substitution',
    owner: 'comparison display authoring and wrapper structure',
    justification: 'Exact native display requests differ from candidate requests or are omitted; preserve browser computed versus candidate local stages and differing owner/child types. This identifies unequal input authoring, not equivalent wrapper flattening, candidate used display, a core defect, or rendering parity. Browser blockification does not erase the native inner flex request.',
  });
  return rows;
}
