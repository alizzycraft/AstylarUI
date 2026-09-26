import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolveOriginAliasPair } from './origin-alias-mapping-evidence.mjs';
import { rootInitialSelectorCanApply } from './root-initial-style-evidence.mjs';
import { applyModalBoxReview } from './modal-position-inspection.mjs';

export const mappedVisibleOwners = Object.freeze({
  paginator: ['paginator-range', 'paginator-size'], stepper: ['stepper-content'],
  'bottom-sheet': ['bottom-sheet-overlay'], 'snack-bar': ['snack-bar-overlay', 'snack-bar-surface'],
});

// Applicability of the existing initial-overflow proof, not a fresh rendering
// experiment. Invalidate reuse if any owning implementation or sensitivity test changes.
const initialOverflowSources = Object.freeze({
  'src/app/config/browser-defaults.ts': 'c429bec0fa047e71148f4ce743868a4c89986fde28cc7d11076bb7afa89993f3',
  'src/app/services/dom/style-defaults.service.ts': '379775839024538bcd2a6acc69528039e24fc58b849e52841ba9d6c88f4da7d0',
  'src/app/services/dom/elements/overflow-clip.service.ts': 'f66a26a20844e471cf7db4a4e6e9cf6f197f97a0d4eb9cad3cb23bc3892f802a',
  'src/lib/astylar-scroll-runtime.ts': '2c7f0667264471b12315c5619e446dde65c6bb266d0bf114f84688f76f5288ac',
  'src/app/services/dom/elements/overflow-clip.service.spec.ts': '1a1b9cf370ee02e9c7fa9f77cac2050cf36504f14f832f5239d7b9301f34fbf4',
  'src/lib/astylar-scroll-runtime.spec.ts': '91a1f492f15e6a2d27844655b8a017a6d632f8698450bb9ab20f09a24a461e8e',
});

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
