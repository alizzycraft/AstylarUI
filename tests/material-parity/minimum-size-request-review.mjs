import assert from 'node:assert/strict';
import { applyModalBoxReview } from './modal-position-inspection.mjs';
import { resolveOriginAliasPair } from './origin-alias-mapping-evidence.mjs';
import { rootInitialSelectorCanApply } from './root-initial-style-evidence.mjs';

// Exact measured owners. In particular the native tab span is not silently
// replaced with its containing tab button, nor a plugin with generated paint.
export const minimumSizeOwners = [
  ['badge', 'badge-count', 'span', 'span', ['minWidth', 'minHeight']],
  ['bottom-sheet', 'bottom-sheet-panel', 'mat-bottom-sheet-container', 'section', ['minHeight']],
  ['button-toggle', 'button-toggle-one', 'mat-button-toggle', 'div'],
  ['button-toggle', 'button-toggle-two', 'mat-button-toggle', 'div'],
  ['card', 'card-copy', 'mat-card-content', 'p'], ['card', 'card-open', 'button', 'button'],
  ['chips', 'chip-0', 'mat-chip-option', 'div'], ['chips', 'chip-1', 'mat-chip-option', 'div'],
  ['dialog', 'dialog-actions', 'mat-dialog-actions', 'div', ['minWidth']],
  ['dialog', 'dialog-cancel', 'button', 'button'], ['dialog', 'dialog-copy', 'mat-dialog-content', 'p'],
  ['dialog', 'dialog-save', 'button', 'button'], ['dialog', 'dialog-title', 'h2', 'h2'],
  ['expansion', 'expansion-title', 'mat-panel-title', 'span'],
  ['paginator', 'paginator-range', 'div', 'span'], ['paginator', 'paginator-size', 'div', 'span'],
  ['slider', 'slider-visual', 'mat-slider', 'showcase.material:range-visual', ['minWidth']],
  ['snack-bar', 'snack-bar-surface', 'div', 'div', ['minHeight']],
  ['table', 'table-primary', 'table', 'table', ['minWidth']],
  ['tabs', 'tab-activity', 'span', 'button'], ['tabs', 'tab-overview', 'span', 'button'],
  ['toolbar', 'toolbar-action', 'button', 'button'], ['toolbar', 'toolbar-title', 'span', 'span'],
];
const explicit = (element, property) => element === 'badge-count'
  ? ['.mat-badge-medium .mat-badge-content', 'var(--mat-badge-container-size, 16px)', '16px']
  : property !== 'minWidth' ? undefined
    : ['card-open', 'dialog-cancel', 'dialog-save', 'toolbar-action'].includes(element) ? ['.mdc-button', '64px', '64px']
      : element === 'slider-visual' ? ['.mat-mdc-slider', '112px', '112px']
        : element === 'table-primary' ? ['.mat-mdc-table', '100%', '100%'] : undefined;

export function proveMinimumSizeRequest(entry, reference, candidate, element, property) {
  const scope = minimumSizeOwners.find(([family, id]) => entry.family === family && id === element);
  assert.ok(scope); assert.ok((scope[4] ?? ['minWidth', 'minHeight']).includes(property));
  for (const tree of [reference, candidate]) {
    assert.deepEqual(tree.errors, []); assert.equal(tree.ruleEvidenceComplete, true);
    assert.equal(new Set(tree.nodes.map(node => node.key)).size, tree.nodes.length);
  }
  const matches = entry.styleInputs.filter(input => input.id === element); assert.equal(matches.length, 1);
  const input = matches[0];
  let native = reference.nodes.filter(node => node.attributes?.id === element || node.attributes?.['data-parity-id'] === element), identity;
  if (!native.length) {
    identity = resolveOriginAliasPair(entry, reference, candidate, input);
    assert.equal(identity.status, 'mapped'); assert.deepEqual(identity.missingRules, []); assert.deepEqual(identity.extraRules, []);
    native = reference.nodes.filter(node => node.key === identity.referenceNode);
  }
  const candidates = candidate.nodes.filter(node => node.authored?.id === element);
  assert.equal(native.length, 1); assert.equal(candidates.length, 1);
  const r = native[0], a = candidates[0];
  assert.equal(r.type, scope[2]); assert.equal(a.authored.type, scope[3]);
  assert.equal(candidate.resolvedStyleEvidenceVersion, 2); assert.equal(candidate.resolvedStyleSource, 'core-style-inspection');
  assert.equal(input.astylarResolvedStyleEvidenceVersion, 2); assert.equal(Object.keys(input.reference).length, 89);
  for (const [key, value] of Object.entries(input.reference)) assert.deepEqual(reference.styles[r.style][key], value);
  assert.equal(reference.styles[r.style].writingMode, 'horizontal-tb');
  const cssProperty = property === 'minWidth' ? 'min-width' : 'min-height';
  const logicalProperty = property === 'minWidth' ? 'mininlinesize' : 'minblocksize';
  const affects = key => ['all', property.toLowerCase(), logicalProperty].includes(key.replaceAll('-', '').toLowerCase());
  const select = style => Object.fromEntries(Object.entries(style ?? {}).filter(([key]) => affects(key)));
  assert.deepEqual(select(r.inline), {}); assert.deepEqual(select(a.authored.style), {});
  assert.equal(a.authored.attributes?.style, undefined);
  const expected = explicit(element, property);
  const nativeRules = r.rules.map(index => reference.rules[index]).filter(rule => rule.active);
  const requests = nativeRules.map(rule => ({ selector: rule.selector, conditions: rule.conditions, declarations: select(rule.declarations) }))
    .filter(rule => Object.keys(rule.declarations).length);
  assert.deepEqual(requests, expected ? [{ selector: expected[0], conditions: [], declarations: { [cssProperty]: { value: expected[1], important: false } } }] : []);
  // Check serialized declarations too: duplicate overrides or logical/reset
  // requests must not disappear behind the scalar CSSOM projection.
  const serialized = nativeRules.flatMap(rule => [...rule.cssText.matchAll(/(?:^|;)\s*([\w-]+)\s*:\s*([^;]*)(?=;|$)/g)]
    .filter(([, key]) => affects(key)).map(([, key, value]) => ({ selector: rule.selector, key, value: value.trim() })));
  assert.deepEqual(serialized, expected ? [{ selector: expected[0], key: cssProperty, value: expected[1] }] : []);
  const candidateRequests = candidate.rules.filter(rule => rootInitialSelectorCanApply(rule.selector, a.authored))
    .map(({ selector, ...style }) => ({ selector, declarations: select(style) })).filter(rule => Object.keys(rule.declarations).length);
  assert.deepEqual(candidateRequests, []);
  for (const [scalar, stage] of [['astylar', 'resolvedStyle'], ['astylarNormalResolvedStyle', 'normalResolvedStyle'], ['astylarInteractionResolvedStyle', 'interactionResolvedStyle']]) {
    assert.deepEqual(input[scalar], a[stage]); assert.deepEqual(select(a[stage]), {});
  }
  assert.equal(reference.styles[r.style][property], expected?.[2] ?? 'auto');
  return { referenceNode: r.key, astylarNode: a.key, identity, property,
    ownerTypes: { reference: r.type, candidate: a.authored.type }, nativeRequests: requests,
    nativeComputed: reference.styles[r.style][property], candidateRequests,
    candidateLocalFieldPresent: false, explicitNativeConstraint: Boolean(expected),
    candidateUsedMinimumVerified: false, structuralEquivalenceProven: false, renderingEquivalent: false };
}

export function applyMinimumSizeReviews(rows, cases, inventory, normalize) {
  for (const [family, element, , , properties = ['minWidth', 'minHeight']] of minimumSizeOwners) for (const property of properties) {
    const authored = Boolean(explicit(element, property));
    rows = applyModalBoxReview(rows, cases, inventory, normalize, {
      family, element, properties: [property],
      prove: (entry, reference, candidate) => proveMinimumSizeRequest(entry, reference, candidate, element, property),
      classification: authored ? 'application-plugin-authoring-defect' : 'parity-harness-defect',
      attribution: authored ? 'reviewed-minimum-size-request-omission' : 'reviewed-minimum-size-observation-boundary',
      owner: authored ? 'component minimum-size authoring' : 'computed minimum versus local declaration measurement',
      justification: authored
        ? 'The exact native owner explicitly requests a minimum size; candidate authoring and all three local stages omit it. Fixed width/height are not substituted as proof of an equivalent constraint. This establishes unequal authored inputs, not candidate used-size behavior or a renderer defect.'
        : 'Native owner computes auto without an authored physical/logical minimum or reset for this axis; candidate local declarations omit that field. Preserve mapped owner types and original observations. Missing local values do not prove candidate computed auto, automatic minimum behavior, structural equality, or rendering equivalence.',
    });
  }
  return rows;
}
