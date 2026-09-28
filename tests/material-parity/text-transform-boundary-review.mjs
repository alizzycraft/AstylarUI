import assert from 'node:assert/strict';
import { applyModalBoxReview } from './modal-position-inspection.mjs';
import { resolveOriginAliasPair } from './origin-alias-mapping-evidence.mjs';
import { rootInitialSelectorCanApply } from './root-initial-style-evidence.mjs';

export const textTransformOwners = {
  core: ['core-primary'], toolbar: ['toolbar-action'], card: ['card-open'],
  chips: ['chip-0', 'chip-1'], button: ['button-disabled', 'button-primary', 'button-secondary'],
  menu: ['menu-primary'], tabs: ['tab-panel'],
  'bottom-sheet': ['bottom-sheet-copy', 'bottom-sheet-dismiss', 'bottom-sheet-overlay', 'bottom-sheet-panel', 'bottom-sheet-primary'],
  dialog: ['dialog-actions', 'dialog-cancel', 'dialog-copy', 'dialog-panel', 'dialog-primary', 'dialog-save', 'dialog-title'],
  'snack-bar': ['snack-bar-overlay', 'snack-bar-primary', 'snack-bar-surface'],
  tooltip: ['tooltip-popup', 'tooltip-primary'],
};
const tokens = element => ['toolbar-action', 'card-open', 'dialog-cancel'].includes(element)
  ? ['.mat-mdc-button', 'text'] : element === 'button-secondary' ? ['.mat-mdc-outlined-button', 'outlined']
    : element.endsWith('-primary') || ['button-disabled', 'dialog-save'].includes(element)
      ? ['.mat-mdc-unelevated-button', 'filled'] : undefined;
const affects = key => ['texttransform', 'all'].includes(key.replaceAll('-', '').toLowerCase());
const select = style => Object.fromEntries(Object.entries(style ?? {}).filter(([key]) => affects(key)));
const path = (tree, leaf) => {
  const result = [], seen = new Set();
  for (let node = leaf; node;) {
    assert.ok(!seen.has(node.key)); seen.add(node.key); result.push(node);
    if (node.parent === null) return result;
    const parents = tree.nodes.filter(n => n.key === node.parent); assert.equal(parents.length, 1); node = parents[0];
  }
  assert.fail('Incomplete ancestry');
};

export function proveTextTransformBoundary(entry, reference, candidate, element) {
  assert.ok(textTransformOwners[entry.family]?.includes(element));
  for (const tree of [reference, candidate]) {
    assert.deepEqual(tree.errors, []); assert.equal(tree.ruleEvidenceComplete, true);
    assert.equal(new Set(tree.nodes.map(n => n.key)).size, tree.nodes.length);
  }
  const inputs = entry.styleInputs.filter(i => i.id === element); assert.equal(inputs.length, 1); const input = inputs[0];
  let native = reference.nodes.filter(n => n.attributes?.id === element || n.attributes?.['data-parity-id'] === element), identity;
  if (!native.length) {
    identity = resolveOriginAliasPair(entry, reference, candidate, input);
    const gap = ['bottom-sheet-overlay', 'snack-bar-overlay'].includes(element);
    assert.equal(identity.status, gap ? 'mapped-with-scalar-rule-gap' : 'mapped');
    assert.deepEqual(identity.extraRules, []);
    assert.deepEqual(identity.missingRules, gap ? [{ selector: '.cdk-global-overlay-wrapper',
      declarations: { 'z-index': { value: '1000', important: false } } }] : []);
    native = reference.nodes.filter(n => n.key === identity.referenceNode);
  }
  const ast = candidate.nodes.filter(n => n.authored?.id === element);
  assert.equal(native.length, 1); assert.equal(ast.length, 1); const r = native[0], a = ast[0];
  assert.equal(Object.keys(input.reference).length, 89);
  for (const [key, value] of Object.entries(input.reference)) assert.deepEqual(reference.styles[r.style][key], value);
  assert.equal(input.reference.textTransform, 'none'); assert.equal(input.astylarResolvedStyleEvidenceVersion, 2);
  assert.equal(candidate.resolvedStyleEvidenceVersion, 2); assert.equal(candidate.resolvedStyleSource, 'core-style-inspection');
  for (const [scalar, stage] of [['astylar', 'resolvedStyle'], ['astylarNormalResolvedStyle', 'normalResolvedStyle'], ['astylarInteractionResolvedStyle', 'interactionResolvedStyle']])
    assert.deepEqual(input[scalar], a[stage]);
  const request = tokens(element), nativePath = path(reference, r), candidatePath = path(candidate, a);
  const nativeRequests = [];
  for (const node of nativePath) {
    assert.deepEqual(select(node.inline), {});
    const expected = node === r && request ? [{ selector: request[0], conditions: [],
      declarations: { 'text-transform': { value: `var(--mat-button-${request[1]}-label-text-transform)`, important: false } } }] : [];
    const active = node.rules.map(i => reference.rules[i]).filter(rule => rule.active);
    const requests = active.map(rule => ({ selector: rule.selector, conditions: rule.conditions, declarations: select(rule.declarations) }))
      .filter(rule => Object.keys(rule.declarations).length);
    assert.deepEqual(requests, expected);
    const serialized = active.flatMap(rule => [...rule.cssText.matchAll(/(?:^|;)\s*([\w-]+)\s*:\s*([^;]*)(?=;|$)/g)]
      .filter(([, key]) => affects(key)).map(([, key, value]) => ({ selector: rule.selector, key, value: value.trim() })));
    assert.deepEqual(serialized, expected.map(rule => ({ selector: rule.selector, key: 'text-transform', value: rule.declarations['text-transform'].value })));
    nativeRequests.push(...requests.map(rule => ({ node: node.key, ...rule })));
  }
  for (const node of candidatePath) {
    assert.deepEqual(select(node.authored), {}); assert.deepEqual(select(node.authored.style), {});
    assert.equal(node.authored.attributes?.style, undefined);
    for (const stage of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle']) assert.deepEqual(select(node[stage]), {});
    for (const rule of candidate.rules.filter(rule => rootInitialSelectorCanApply(rule.selector, node.authored))) assert.deepEqual(select(rule), {});
  }
  return { referenceNode: r.key, astylarNode: a.key, identity, nativeRequests,
    referencePath: nativePath.map(n => n.key), candidatePath: candidatePath.map(n => n.key),
    nativeComputed: 'none', candidateLocalFieldPresent: false, tokenResolutionVerified: false,
    candidatePaintedTextVerified: false, inputEquivalent: false, renderingEquivalent: false };
}

export function applyTextTransformBoundaryReviews(rows, cases, inventory, normalize) {
  for (const [family, elements] of Object.entries(textTransformOwners)) for (const element of elements)
    rows = applyModalBoxReview(rows, cases, inventory, normalize, {
      family, element, properties: ['textTransform'], prove: (entry, r, a) => proveTextTransformBoundary(entry, r, a, element),
      classification: 'parity-harness-defect', attribution: 'reviewed-text-transform-computed-local-boundary',
      owner: 'computed inherited text versus local declaration inspection',
      justification: 'Native computed none is compared with omitted candidate local declarations. Exact original owners, ancestry, requests and three candidate stages are retained. Material button token requests are not asserted to be explicit none resets: token resolution and theme provenance remain separate. No candidate transform/reset request exists on the inspected ancestry. This proves unlike observation stages, not an authoring defect from omission, equivalent theme response, descendant text consumption or rendering parity. Preserve overlay z-index rule gaps.',
    });
  return rows;
}
