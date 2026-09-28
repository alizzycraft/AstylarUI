import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolveOriginAliasPair } from './origin-alias-mapping-evidence.mjs';
import { rootInitialSelectorCanApply } from './root-initial-style-evidence.mjs';
import { applyModalBoxReview } from './modal-position-inspection.mjs';
import { proveTabPanelWrapping } from './wrapping-input-review.mjs';

export const mappedVisibleOwners = Object.freeze({
  paginator: ['paginator-range', 'paginator-size'], stepper: ['stepper-content'],
  'bottom-sheet': ['bottom-sheet-overlay'], 'snack-bar': ['snack-bar-overlay', 'snack-bar-surface'],
});

export const visibleButtonOwners = Object.freeze({
  toolbar: ['toolbar-action'], card: ['card-open'],
  button: ['button-disabled', 'button-primary', 'button-secondary'], menu: ['menu-primary'],
  'bottom-sheet': ['bottom-sheet-primary'], dialog: ['dialog-primary', 'dialog-cancel', 'dialog-save'],
  'snack-bar': ['snack-bar-primary'], tooltip: ['tooltip-primary'],
});

// Establish the exact original population before extending an initial-value
// proof to controls. This alone does not prove their clipping implementation.
export function proveVisibleButtonOverflowInputs(entry, r, a, element) {
  assert.ok(visibleButtonOwners[entry.family]?.includes(element));
  for (const tree of [r, a]) { assert.equal(tree.ruleEvidenceComplete, true); assert.deepEqual(tree.errors, []); }
  const unique = values => { assert.equal(values.length, 1); return values[0]; };
  const input = unique(entry.styleInputs.filter(i => i.id === element));
  const ref = unique(r.nodes.filter(n => (n.attributes?.['data-parity-id'] ?? n.attributes?.id) === element));
  const ast = unique(a.nodes.filter(n => n.authored?.id === element));
  assert.equal(ref.type, 'button'); assert.equal(ast.authored.type, 'button');
  const affects = key => /^(overflow[\w-]*|all)$/i.test(key);
  for (const node of [ref, ast]) assert.doesNotMatch(
    node.attributes?.style ?? node.authored?.attributes?.style ?? '', /(?:overflow(?:-[\w-]+)?|all)\s*:/i);
  assert.ok(!Object.keys(ref.inline ?? {}).some(affects));
  const requests = ref.rules.map(i => r.rules[i]).filter(rule => rule.active).flatMap(rule => {
    assert.ok(!rule.cssText.includes('\\'));
    assert.doesNotMatch(rule.cssText, /(?:^|[;{])\s*(?:overflow-(?:inline|block)[\w-]*|all)\s*:/i);
    return Object.entries(rule.declarations).filter(([key]) => affects(key))
      .map(([key, value]) => ({ selector: rule.selector, conditions: rule.conditions, key, ...value }));
  });
  assert.deepEqual(requests, ['overflow-x', 'overflow-y'].map(key => ({
    selector: '.mdc-button', conditions: [], key, value: 'visible', important: false,
  })));
  for (const key of ['overflowX', 'overflowY']) {
    assert.equal(r.styles[ref.style][key], 'visible'); assert.equal(input.reference[key], 'visible');
  }
  for (const style of [ast.authored.style ?? {}, ast.normalResolvedStyle, ast.resolvedStyle, ast.interactionResolvedStyle]) {
    assert.ok(style && typeof style === 'object'); assert.ok(!Object.keys(style).some(affects));
  }
  for (const [scalar, stage] of [['astylar', 'resolvedStyle'], ['astylarNormalResolvedStyle', 'normalResolvedStyle'],
    ['astylarInteractionResolvedStyle', 'interactionResolvedStyle']]) assert.deepEqual(input[scalar], ast[stage]);
  assert.equal(input.astylarResolvedStyleEvidenceVersion, 2);
  assert.deepEqual(a.rules.filter(rule => rootInitialSelectorCanApply(rule.selector, ast.authored))
    .flatMap(rule => Object.keys(rule).filter(affects)), []);
  assert.ok(Array.isArray(input.astylarAuthored));
  assert.ok(input.astylarAuthored.every(rule => rule.declarations && !Object.keys(rule.declarations).some(affects)));
  return { element, referenceNode: ref.key, astylarNode: ast.key, referenceRequests: requests,
    candidateAxes: 'omitted', inputEquivalent: false, clippingVerified: false, renderingEquivalent: false };
}

// Applicability of the existing initial-overflow proof, not a fresh rendering
// experiment. Invalidate reuse if any owning implementation or sensitivity test changes.
const initialOverflowSources = Object.freeze({
  'src/app/config/browser-defaults.ts': 'c429bec0fa047e71148f4ce743868a4c89986fde28cc7d11076bb7afa89993f3',
  'src/app/services/dom/style-defaults.service.ts': '379775839024538bcd2a6acc69528039e24fc58b849e52841ba9d6c88f4da7d0',
  'src/app/services/dom/elements/overflow-clip.service.ts': 'f66a26a20844e471cf7db4a4e6e9cf6f197f97a0d4eb9cad3cb23bc3892f802a',
  'src/lib/astylar-scroll-runtime.ts': '2c7f0667264471b12315c5619e446dde65c6bb266d0bf114f84688f76f5288ac',
  'src/app/services/dom/elements/overflow-clip.service.spec.ts': '53b6723c8b7d241afdc8b610b81a9158d9f5720c79a5926f51aa0b7cbb37fac8',
  'src/lib/astylar-scroll-runtime.spec.ts': '91a1f492f15e6a2d27844655b8a017a6d632f8698450bb9ab20f09a24a461e8e',
});

const buttonOverflowSources = Object.freeze({ ...initialOverflowSources,
  'src/app/services/dom/input/button.manager.ts': '270c57f672c2f54bd5bd6b0e255e0207912fa9fa8bedbf983b765e6a3f207aa5',
  'src/app/services/dom/input/button.manager.spec.ts': '3b15c52a96e5743268e09a4a83cafb8d24aa22034a0503cd0a3f6fdcfad93a02',
  'scripts/audit-button-overflow-core.mjs': '0c1656115a99f0854ad8f04e594c55193f5870bbc218a6a768ee9b195202228c',
  'tests/material-parity/button-overflow-initial.spec.mjs': 'e1072e113e2621af7861c05f7366cb141ce6b951c32ba012c71a7d801c5cd80d',
});
export const visibleButtonOverflowAttribution = 'reviewed-button-visible-overflow-initial-value';

export function applyVisibleButtonOverflow(rows, cases, inventory, normalize) {
  for (const [file, expected] of Object.entries(buttonOverflowSources)) assert.equal(createHash('sha256')
    .update(readFileSync(file, 'utf8').replaceAll('\r\n', '\n')).digest('hex'), expected, file);
  let result = rows;
  for (const [family, owners] of Object.entries(visibleButtonOwners)) for (const element of owners)
    result = applyModalBoxReview(result, cases, inventory, normalize, {
      family, element, properties: ['overflowX', 'overflowY'],
      classification: 'equivalent-representation', attribution: visibleButtonOverflowAttribution, owner: 'none',
      justification: 'The exact native button requests visible overflow on both axes while the candidate omits overflow in authoring and all captured stages. Dependency-pinned browser and actual ButtonManager/shared-clip tests establish the same initial no-own-clipping branch for omission and visible, with hidden/mixed/ancestor negative controls kept distinct. This explains only the scalar initial value, not equal structure, inherited clipping, scrolling, hit regions, Angular compilation or final raster.',
      prove: (entry, r, a) => ({ ...proveVisibleButtonOverflowInputs(entry, r, a, element),
        buttonOverflowSources, initialValueEquivalent: true, ownClippingBranchVerified: true,
        ancestorClippingVerified: false, scrollingVerified: false, structuralEquivalenceVerified: false }),
    });
  return result;
}

export function validateVisibleButtonOverflow(rows, originalRows, cases, inventory, normalize) {
  try {
    const select = values => values.filter(r => r.attribution === visibleButtonOverflowAttribution);
    assert.deepEqual(select(rows), select(applyVisibleButtonOverflow(originalRows, cases, inventory, normalize)));
    return [];
  } catch (error) { return [`button initial overflow lacks original population and dependency-bound proof: ${error.message}`]; }
}

export function proveMappedVisibleOverflow(entry, r, a, element) {
  assert.ok(mappedVisibleOwners[entry.family]?.includes(element));
  for (const tree of [r, a]) { assert.equal(tree.ruleEvidenceComplete, true); assert.deepEqual(tree.errors, []); }
  const inputs = entry.styleInputs.filter(i => i.id === element); assert.equal(inputs.length, 1);
  const input = inputs[0], mapping = resolveOriginAliasPair(entry, r, a, input);
  assert.ok(['mapped', 'mapped-with-scalar-rule-gap'].includes(mapping.status));
  const ref = r.nodes.find(n => n.key === mapping.referenceNode), ast = a.nodes.find(n => n.key === mapping.candidateNode);
  assert.ok(['div', 'span'].includes(ast.authored.type));
  assert.ok(!['html', 'body', 'input', 'textarea', 'select', 'button', 'img', 'svg'].includes(ref.type));
  for (const key of ['overflowX', 'overflowY']) assert.equal(r.styles[ref.style][key], 'visible');
  const affects = key => key.replaceAll('-', '').toLowerCase().startsWith('overflow') || key.toLowerCase() === 'all';
  for (const style of [ast.authored.style ?? {}, ast.normalResolvedStyle, ast.resolvedStyle, ast.interactionResolvedStyle]) {
    assert.ok(style && typeof style === 'object' && !Array.isArray(style));
    assert.ok(!Object.keys(style).some(affects));
  }
  assert.doesNotMatch(ast.authored.attributes?.style ?? '', /(?:overflow(?:-[\w-]+)?|all)\s*:/i);
  assert.ok(!a.rules.filter(rule => rootInitialSelectorCanApply(rule.selector, ast.authored))
    .some(rule => Object.keys(rule).some(affects)));
  assert.ok(Array.isArray(input.astylarAuthored));
  assert.ok(input.astylarAuthored.every(rule => rule.declarations && !Object.keys(rule.declarations).some(affects)));
  return { element, mapping, referenceNode: ref.key, astylarNode: ast.key,
    referenceAxes: { overflowX: 'visible', overflowY: 'visible' }, candidateAxes: 'omitted',
    initialOverflowSources, initialValueEquivalent: true, inputEquivalent: false,
    structuralEquivalenceVerified: false, clippingVerified: false, scrollingVerified: false,
    renderingEquivalent: false,
    scope: 'Initial overflow value only; no container, clipping, reachability or final-raster equivalence claim.' };
}

export function applyMappedVisibleOverflow(rows, cases, inventory, normalize) {
  for (const [file, expected] of Object.entries(initialOverflowSources)) assert.equal(createHash('sha256')
    .update(readFileSync(file, 'utf8').replaceAll('\r\n', '\n')).digest('hex'), expected, file);
  let values = rows;
  for (const [family, owners] of Object.entries(mappedVisibleOwners)) for (const element of owners)
    values = applyModalBoxReview(values, cases, inventory, normalize, { family, element,
      properties: ['overflowX', 'overflowY'], prove: (entry, r, a) => proveMappedVisibleOverflow(entry, r, a, element),
      classification: 'equivalent-representation', attribution: 'reviewed-mapped-visible-overflow-initial-value',
      owner: 'none',
      justification: 'Existing alias proofs identify the ordinary div/span owner without equating structure or dropping scalar-rule gaps. Native axes both compute visible; candidate rules, inline inputs and all three local stages omit overflow/reset. The unchanged defaults/clip/scroll sources and sensitivity tests establish the same initial no-clipping/no-scroll-container branch for omission and visible. This extends only that existing initial-value proof to mapped owners; it does not establish container geometry, ancestor clipping, reachability, plugin/control behavior or equal rendering.',
    });
  return values;
}

export function validateMappedVisibleOverflow(rows, originalRows, cases, inventory, normalize) {
  try {
    const select = values => values.filter(r => r.attribution === 'reviewed-mapped-visible-overflow-initial-value');
    assert.deepEqual(select(rows), select(applyMappedVisibleOverflow(originalRows, cases, inventory, normalize)));
    return [];
  } catch (error) { return [`mapped visible overflow does not replay from original owners: ${error.message}`]; }
}

export function proveHeadingVisibleOverflow(entry, r, a) {
  const element = { card: 'card-title', dialog: 'dialog-title' }[entry.family]; assert.ok(element);
  return { ...proveOmittedOverflowOwner(entry, r, a, element, entry.family === 'card' ? 'mat-card-title' : 'h2', 'h2'),
    initialValueEquivalent: true, inputEquivalent: false, ownClippingBranchVerified: true,
    structuralEquivalenceVerified: false, ancestorClippingVerified: false, renderingEquivalent: false };
}

// Input binding only. Table layout/default/clipping applicability requires its own proof.
export function proveTableOverflowInputs(entry, r, a) {
  assert.equal(entry.family, 'table');
  return { ...proveOmittedOverflowOwner(entry, r, a, 'table-primary', 'table', 'table'),
    initialValueEquivalent: false, inputEquivalent: false, ownClippingBranchVerified: false,
    structuralEquivalenceVerified: false, ancestorClippingVerified: false, renderingEquivalent: false };
}

export function applyTableVisibleOverflow(rows, cases, inventory, normalize) {
  const sources = { ...initialOverflowSources,
    'src/app/services/dom/elements/table.service.ts': '0d96f98c3bdcfbba71a1eaa839cfa34d19e5621471b27929574334535e7733c9',
    'src/app/services/dom/elements/element-creation.service.ts': 'bf5fd5861c7d1b412520a41abf5bfa0aa1085d9a139a96f3d202dde6cbf8ea3a',
    'src/app/services/dom/elements/element-creation.service.spec.ts': 'c968bb582c470305f1a83144319d6aaa9d85f6089e19c21c7eff6ca4b09e2830',
    'tests/material-parity/control-overflow-observation.spec.mjs': '7dd26e7d37cee3402ce75b6dac78a63cf57549b182607aaa8592672ff798fb1e' };
  for (const [file, expected] of Object.entries(sources)) assert.equal(createHash('sha256')
    .update(readFileSync(file, 'utf8').replaceAll('\r\n', '\n')).digest('hex'), expected, file);
  return applyModalBoxReview(rows, cases, inventory, normalize, {
    family: 'table', element: 'table-primary', properties: ['overflowX', 'overflowY'],
    classification: 'equivalent-representation', attribution: 'reviewed-table-visible-overflow-initial-value', owner: 'none',
    justification: 'The original paired table owners omit overflow/reset requests; native axes compute visible and all captured candidate stages omit overflow. Dependency-pinned native table sensitivity and actual table-dispatch/shared-clip tests establish the same initial no-own-clipping branch. The reviewed table layout path introduces no separate overflow boundary. This explains only the initial overflow scalar, not equal table sizing, descendants, ancestor clipping, scrolling or final raster.',
    prove: (entry, r, a) => ({ ...proveTableOverflowInputs(entry, r, a), sources,
      initialValueEquivalent: true, ownClippingBranchVerified: true,
      tableSizingAlgorithmVerified: false, scrollingVerified: false }),
  });
}

export function validateTableVisibleOverflow(rows, originalRows, cases, inventory, normalize) {
  try {
    const select = values => values.filter(row => row.attribution === 'reviewed-table-visible-overflow-initial-value');
    assert.deepEqual(select(rows), select(applyTableVisibleOverflow(originalRows, cases, inventory, normalize)));
    return [];
  } catch (error) { return [`table initial overflow lacks original population and applicability proof: ${error.message}`]; }
}

function proveOmittedOverflowOwner(entry, r, a, element, referenceType, candidateType) {
  for (const tree of [r, a]) { assert.equal(tree.ruleEvidenceComplete, true); assert.deepEqual(tree.errors, []); }
  assert.equal(a.resolvedStyleSource, 'core-style-inspection'); assert.equal(a.resolvedStyleEvidenceVersion, 2);
  const one = values => { assert.equal(values.length, 1); return values[0]; };
  const input = one(entry.styleInputs.filter(i => i.id === element));
  const ref = one(r.nodes.filter(n => (n.attributes?.['data-parity-id'] ?? n.attributes?.id) === element));
  const ast = one(a.nodes.filter(n => n.authored?.id === element));
  assert.equal(ref.type, referenceType); assert.equal(ast.authored.type, candidateType);
  const affects = key => /^(overflow.*|all)$/.test(key.replaceAll('-', '').toLowerCase());
  assert.deepEqual(Object.keys(ref.inline ?? {}).filter(affects), []);
  for (const value of [ref.attributes?.style, ast.authored.attributes?.style])
    assert.doesNotMatch(value ?? '', /(?:overflow(?:-[\w-]+)?|all)\s*:/i);
  for (const rule of ref.rules.map(i => r.rules[i]).filter(rule => rule.active)) {
    assert.ok(!rule.cssText.includes('\\'));
    assert.deepEqual(Object.keys(rule.declarations).filter(affects), []);
  }
  for (const key of ['overflowX', 'overflowY']) {
    assert.equal(r.styles[ref.style][key], 'visible'); assert.equal(input.reference[key], 'visible');
  }
  for (const style of [ast.authored.style ?? {}, ast.normalResolvedStyle, ast.resolvedStyle, ast.interactionResolvedStyle]) {
    assert.ok(style && typeof style === 'object'); assert.deepEqual(Object.keys(style).filter(affects), []);
  }
  for (const [field, stage] of [['astylar', 'resolvedStyle'], ['astylarNormalResolvedStyle', 'normalResolvedStyle'],
    ['astylarInteractionResolvedStyle', 'interactionResolvedStyle']]) assert.deepEqual(input[field], ast[stage]);
  assert.deepEqual(a.rules.filter(rule => rootInitialSelectorCanApply(rule.selector, ast.authored))
    .flatMap(rule => Object.keys(rule).filter(affects)), []);
  assert.ok(Array.isArray(input.astylarAuthored));
  assert.ok(input.astylarAuthored.every(rule => rule.declarations && !Object.keys(rule.declarations).some(affects)));
  return { element, referenceNode: ref.key, astylarNode: ast.key, referenceAxes: 'visible', candidateAxes: 'omitted' };
}

export function proveRemainingControlOverflowInputs(entry, r, a, element) {
  const types = entry.family === 'slider' ? {
    'slider-start': ['input', 'input'], 'slider-primary': ['input', 'input'],
    'slider-visual': ['mat-slider', 'showcase.material:range-visual'],
  } : entry.family === 'tabs' ? {
    'tab-overview': ['span', 'button'], 'tab-activity': ['span', 'button'],
  } : {};
  assert.ok(types[element]);
  return { ...proveOmittedOverflowOwner(entry, r, a, element, ...types[element]),
    referenceType: types[element][0], candidateType: types[element][1],
    initialValueEquivalent: false, ownClippingBranchVerified: false, renderingEquivalent: false };
}

export function applyHeadingVisibleOverflow(rows, cases, inventory, normalize) {
  const sources = { ...initialOverflowSources,
    'tests/material-parity/input-tree-evidence.spec.mjs': 'e442a49c26b916eed34300e22a1897d977b723df83a31da3c955421e52d95c5e',
    'src/app/services/dom/elements/element-creation.service.ts': 'bf5fd5861c7d1b412520a41abf5bfa0aa1085d9a139a96f3d202dde6cbf8ea3a' };
  for (const [file, expected] of Object.entries(sources)) assert.equal(createHash('sha256')
    .update(readFileSync(file, 'utf8').replaceAll('\r\n', '\n')).digest('hex'), expected, file);
  return [['card', 'card-title'], ['dialog', 'dialog-title']].reduce((values, [family, element]) =>
    applyModalBoxReview(values, cases, inventory, normalize, { family, element, properties: ['overflowX', 'overflowY'],
      prove: (entry, r, a) => ({ ...proveHeadingVisibleOverflow(entry, r, a), sources }),
      classification: 'equivalent-representation', attribution: 'reviewed-heading-visible-overflow-initial-value', owner: 'none',
      justification: 'Exact original heading owners omit own overflow/reset requests; both native axes compute visible and all three candidate h2 stages omit overflow. Dependency-pinned heading-default/shared-clip and browser sensitivity tests establish the same initial own-clipping branch for omission and visible. This explains only the overflow scalar representation, not heading structure, text raster, ancestor clipping or full rendering equivalence. Controls, tables and custom plugins are excluded.',
    }), rows);
}

export function validateHeadingVisibleOverflow(rows, originalRows, cases, inventory, normalize) {
  try {
    const select = values => values.filter(r => r.attribution === 'reviewed-heading-visible-overflow-initial-value');
    assert.deepEqual(select(rows), select(applyHeadingVisibleOverflow(originalRows, cases, inventory, normalize)));
    return [];
  } catch (error) { return [`heading initial overflow lacks bound original owners: ${error.message}`]; }
}

export function proveTabPanelOverflowBoundary(entry, r, a) {
  const inputs = entry.styleInputs.filter(i => i.id === 'tab-panel'); assert.equal(inputs.length, 1);
  const mapping = proveTabPanelWrapping(entry, inputs[0], r, a);
  for (const tree of [r, a]) { assert.equal(tree.ruleEvidenceComplete, true); assert.deepEqual(tree.errors, []); }
  const ref = r.nodes.find(n => n.key === mapping.referenceNode), ast = a.nodes.find(n => n.key === mapping.astylarNode);
  assert.equal(ref.type, 'span');
  const affects = key => /^(overflow.*|all)$/.test(key.replaceAll('-', '').toLowerCase());
  assert.deepEqual(Object.keys(ref.inline ?? {}).filter(affects), []);
  assert.doesNotMatch(ref.attributes?.style ?? '', /(?:overflow(?:-[\w-]+)?|all)\s*:/i);
  for (const rule of ref.rules.map(i => r.rules[i]).filter(rule => rule.active)) {
    assert.ok(!rule.cssText.includes('\\')); assert.deepEqual(Object.keys(rule.declarations).filter(affects), []);
  }
  for (const key of ['overflowX', 'overflowY']) assert.equal(r.styles[ref.style][key], 'visible');
  assert.doesNotMatch(ast.authored.attributes?.style ?? '', /(?:overflow(?:-[\w-]+)?|all)\s*:/i);
  for (const style of [ast.authored.style ?? {}, ast.normalResolvedStyle, ast.resolvedStyle, ast.interactionResolvedStyle])
    assert.deepEqual(Object.keys(style).filter(affects), []);
  assert.deepEqual(a.rules.filter(rule => rootInitialSelectorCanApply(rule.selector, ast.authored))
    .flatMap(rule => Object.keys(rule).filter(affects)), []);
  const file = 'examples/material-showcase/src/app/material-plugin/material-showcase.plugin.ts';
  const sourceSha256 = createHash('sha256').update(readFileSync(file, 'utf8').replaceAll('\r\n', '\n')).digest('hex');
  assert.equal(sourceSha256, 'dee2c10af7f3116bc6a476d63182ac182e5717b90f5333a327b77213e0b9107e');
  return { referenceNode: ref.key, astylarNode: ast.key, mapping, file, sourceSha256,
    referenceAxes: 'visible', candidateLocalAxes: 'omitted',
    inputEquivalent: false, renderingEquivalent: false, candidateComputedOverflowVerified: false,
    pluginOverflowSensitivityVerified: false, originalRasterClippingVerified: false, coreDefectProven: false,
    limitation: 'Native inline text owner versus a childless private-texture plugin. Existing wrapping evidence establishes paint ownership, not an overflow-mode comparison or raster clipping in these original cases.' };
}

export function applyTabPanelOverflowBoundary(rows, cases, inventory, normalize) {
  return applyModalBoxReview(rows, cases, inventory, normalize, {
    family: 'tabs', element: 'tab-panel', properties: ['overflowX', 'overflowY'], prove: proveTabPanelOverflowBoundary,
    classification: 'parity-harness-defect', attribution: 'reviewed-tab-panel-overflow-owner-boundary',
    owner: 'tab-panel inline-text versus plugin observation boundary; existing competing plugin text renderer',
    justification: 'The measured native owner is an inline text span; the candidate owner is a childless custom plugin that paints its label on a dimension-bounded private texture. Both omit own overflow requests, but their local style observations do not establish equivalent text overflow handling. Reuse the existing plugin text/wrapping ownership proof and retain the source finding; do not normalize this plugin as an ordinary visible-overflow node, invent hidden overflow, or claim original-case clipping or a shared-core defect.',
  });
}

export function validateTabPanelOverflowBoundary(rows, originalRows, cases, inventory, normalize) {
  try {
    const select = values => values.filter(r => r.attribution === 'reviewed-tab-panel-overflow-owner-boundary');
    assert.deepEqual(select(rows), select(applyTabPanelOverflowBoundary(originalRows, cases, inventory, normalize)));
    return [];
  } catch (error) { return [`tab-panel overflow boundary lacks original ownership evidence: ${error.message}`]; }
}

export const clippingOwners = Object.freeze({
  core: { 'core-primary': ['button', 'button', '.mat-ripple'] },
  sidenav: { 'sidenav-primary': ['mat-sidenav-container', 'div', '.mat-drawer-container'] },
  'grid-list': { 'grid-tile-one': ['mat-grid-tile', 'div', '.mat-grid-tile'],
    'grid-tile-two': ['mat-grid-tile', 'div', '.mat-grid-tile'] },
  badge: { 'badge-count': ['span', 'span', '.mat-badge-content'] },
  icon: { 'icon-primary': ['mat-icon', 'img', '.mat-icon'] },
  'progress-bar': { 'progress-bar-primary': ['mat-progress-bar', 'showcase.material:linear-progress', '.mdc-linear-progress'] },
  'progress-spinner': { 'progress-spinner-primary': ['mat-progress-spinner', 'showcase.material:circular-progress', '.mat-mdc-progress-spinner'] },
});

export function proveControlClippingRequests(entry, r, a, element) {
  const specification = clippingOwners[entry.family]?.[element]; assert.ok(specification);
  for (const tree of [r, a]) { assert.equal(tree.ruleEvidenceComplete, true); assert.deepEqual(tree.errors, []); }
  assert.equal(a.resolvedStyleSource, 'core-style-inspection'); assert.equal(a.resolvedStyleEvidenceVersion, 2);
  const inputs = entry.styleInputs.filter(i => i.id === element); assert.equal(inputs.length, 1);
  const candidates = a.nodes.filter(n => n.authored.id === element); assert.equal(candidates.length, 1);
  const candidate = candidates[0];
  let reference, mapping;
  if (entry.family === 'badge') {
    mapping = resolveOriginAliasPair(entry, r, a, inputs[0]); assert.equal(mapping.status, 'mapped');
    reference = r.nodes.find(n => n.key === mapping.referenceNode);
  } else {
    const references = r.nodes.filter(n => n.attributes.id === element); assert.equal(references.length, 1);
    reference = references[0];
    for (const key of ['overflowX', 'overflowY']) assert.equal(inputs[0].reference[key], r.styles[reference.style][key]);
    for (const [scalar, stage] of [['astylar', 'resolvedStyle'], ['astylarNormalResolvedStyle', 'normalResolvedStyle'],
      ['astylarInteractionResolvedStyle', 'interactionResolvedStyle']]) assert.deepEqual(inputs[0][scalar], candidate[stage]);
    mapping = { status: 'unique-direct-id', inputEquivalent: false };
  }
  assert.equal(reference.type, specification[0]); assert.equal(candidate.authored.type, specification[1]);
  const relevant = key => /^(overflow|overflowx|overflowy|overflowinline|overflowblock|all)$/.test(key.replaceAll('-', '').toLowerCase());
  assert.ok(!Object.keys(reference.inline ?? {}).some(relevant));
  assert.doesNotMatch(reference.attributes.style ?? '', /(?:overflow(?:-[\w-]+)?|all)\s*:/i);
  assert.ok(!Object.keys(candidate.authored.style ?? {}).some(relevant));
  assert.doesNotMatch(candidate.authored.attributes?.style ?? '', /(?:overflow(?:-[\w-]+)?|all)\s*:/i);
  const requests = reference.rules.map(i => r.rules[i]).filter(rule => rule.active).flatMap(rule => {
    assert.ok(!rule.cssText.includes('\\'));
    assert.doesNotMatch(rule.cssText, /(?:^|[;{])\s*(?:overflow-(?:inline|block)[\w-]*|all)\s*:/i);
    return Object.entries(rule.declarations).filter(([key]) => relevant(key))
      .map(([key, value]) => ({ selector: rule.selector, conditions: rule.conditions, key, ...value }));
  });
  const axes = selector => ['overflow-x', 'overflow-y'].map(key => ({ selector, conditions: [], key,
    value: selector === '.mdc-button' ? 'visible' : 'hidden', important: false }));
  const expected = entry.family === 'core' ? [...axes('.mdc-button'), ...axes(specification[2])]
    : entry.family === 'progress-bar' ? axes(specification[2]).slice(0, 1) : axes(specification[2]);
  assert.deepEqual(requests, expected);
  const computedY = entry.family === 'progress-bar' ? 'auto' : 'hidden';
  assert.equal(r.styles[reference.style].overflowX, 'hidden');
  assert.equal(r.styles[reference.style].overflowY, computedY);
  assert.deepEqual(a.rules.filter(rule => rootInitialSelectorCanApply(rule.selector, candidate.authored))
    .flatMap(rule => Object.keys(rule).filter(relevant)), []);
  for (const stage of ['normalResolvedStyle', 'resolvedStyle', 'interactionResolvedStyle'])
    assert.ok(!Object.keys(candidate[stage]).some(relevant));
  return { element, referenceNode: reference.key, astylarNode: candidate.key, mapping,
    referenceRequests: requests, referenceComputed: { overflowX: 'hidden', overflowY: computedY },
    candidateRequests: [], inputEquivalent: false, structuralEquivalenceVerified: false,
    candidateComputedOverflowVerified: false, clippingVerified: false, scrollingVerified: false,
    renderingEquivalent: false, originalRasterCauseProven: false };
}

export function applyControlClippingRequests(rows, cases, inventory, normalize) {
  let values = rows;
  for (const [family, owners] of Object.entries(clippingOwners)) for (const element of Object.keys(owners)) {
    for (const property of ['overflowX', 'overflowY']) {
      const computed = family === 'progress-bar' && property === 'overflowY';
      values = applyModalBoxReview(values, cases, inventory, normalize, { family, element, properties: [property],
        prove: (entry, r, a) => proveControlClippingRequests(entry, r, a, element),
        classification: computed ? 'parity-harness-defect' : 'application-plugin-authoring-defect',
        attribution: computed ? 'reviewed-progress-overflow-computed-axis' : 'reviewed-control-clipping-request-omission',
        owner: computed ? 'input audit coupled overflow-axis observation' : 'showcase control clipping authoring',
        justification: computed
          ? 'The native progress owner explicitly requests only horizontal hidden overflow, while CSSOM reports vertical auto. The candidate omits overflow in authoring and all three local stages. This vertical computed observation is not an authored auto request to copy. Candidate computed overflow, scrolling and raster equivalence remain unproved.'
          : 'Complete retained owner rules explicitly request hidden overflow, whereas candidate authoring and all three local stages omit it. The core demonstration also has an earlier visible button rule; both requests and final native hidden value are retained. Changed owner types, plugin/replaced-element structure and used clipping remain distinct; this is not evidence of a core clipping failure or equivalent rendering.',
      });
    }
  }
  return values;
}

export function validateControlClippingRequests(rows, originalRows, cases, inventory, normalize) {
  try {
    const select = values => values.filter(r => ['reviewed-progress-overflow-computed-axis',
      'reviewed-control-clipping-request-omission'].includes(r.attribution));
    assert.deepEqual(select(rows), select(applyControlClippingRequests(originalRows, cases, inventory, normalize)));
    return [];
  } catch (error) { return [`control clipping requests do not replay from original owners: ${error.message}`]; }
}
