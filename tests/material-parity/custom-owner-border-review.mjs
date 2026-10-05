import assert from 'node:assert/strict';
import { rootInitialSelectorCanApply } from './root-initial-style-evidence.mjs';
import { applyModalBoxReview } from './modal-position-inspection.mjs';
import { proveTabControlStage } from '../../scripts/audit-material-tab-position-substitution.mjs';
import { proveBadgePointerRequest } from './component-pointer-events-review.mjs';
import { proveMotionCaretRequests } from '../../scripts/audit-material-caret-motion-context.mjs';
import { applyOverlayOriginReviews } from './overlay-origin-request-review.mjs';

const boundaryAttributions = new Set([
  'reviewed-custom-host-border-initial-divergence', 'reviewed-table-border-reset-omission',
  'reviewed-divider-border-background-substitution', 'reviewed-tab-border-measurement-owner',
  'reviewed-divider-coordinate-substitution', 'reviewed-progress-position-request-omission',
  'reviewed-progress-computed-offset-boundary', 'reviewed-badge-progress-origin-boundary',
  'reviewed-chip-tab-origin-owner-boundary', 'reviewed-toggle-position-request-omission',
  'reviewed-toggle-computed-offset-boundary', 'reviewed-overlay-origin-owner-boundary',
]);
export const isOwnerBoundaryReviewRow = row => boundaryAttributions.has(row.attribution);
export function applyOwnerBoundaryReviews(rows, cases, inventory, normalize) {
  return [applyCustomOwnerBorderReviews, applyDividerPositionReviews, applyProgressPositionReviews,
    applyBadgeProgressOriginReviews, applyChipTabOriginReviews, applyTogglePositionReviews,
    applyOverlayOriginReviews].reduce((values, apply) => apply(values, cases, inventory, normalize), rows);
}
export function validateOwnerBoundaryReviews(rows, originalRows, cases, inventory, normalize) {
  try {
    const expected = applyOwnerBoundaryReviews(originalRows, cases, inventory, normalize).filter(isOwnerBoundaryReviewRow);
    assert.equal(JSON.stringify(rows.filter(isOwnerBoundaryReviewRow)), JSON.stringify(expected),
      'complete owner boundary review differs');
    return [];
  } catch (error) { return [`owner boundary review does not replay: ${error.message}`]; }
}

const owners = {
  icon: ['icon-primary', 'mat-icon', 'img'],
  slider: ['slider-visual', 'mat-slider', 'showcase.material:range-visual'],
  tabs: ['tab-panel', 'span', 'showcase.material:tab-panel'],
  table: ['table-primary', 'table', 'table'],
  divider: ['divider-primary', 'mat-divider', 'div'],
  'progress-bar': ['progress-bar-primary', 'mat-progress-bar', 'showcase.material:linear-progress'],
  'progress-spinner': ['progress-spinner-primary', 'mat-progress-spinner', 'showcase.material:circular-progress'],
  badge: ['badge-count', 'span', 'span'],
};
const relevant = k => /^(border|all$|animation|transition)/.test(k.replaceAll('-', '').toLowerCase());
const sides = ['Top', 'Right', 'Bottom', 'Left'];

export function proveFinalOwnerStyles(entry, reference, candidate, normalize, element) {
  const proof = proveCustomOwnerBorder(entry, reference, candidate, normalize, element);
  const r = reference.nodes.find(n => n.key === proof.referenceNode), a = candidate.nodes.find(n => n.key === proof.astylarNode);
  const tabs = entry.family === 'tabs', icon = entry.family === 'icon';
  assert.ok(tabs || icon || ['progress-bar', 'progress-spinner'].includes(entry.family));
  const relevant = key => tabs ? /^(padding(?:-?(?:top|right|bottom|left))?|all)$/i.test(key)
    : icon ? /^(object-?fit|all)$/i.test(key) : /^(text-?align|all)$/i.test(key);
  const select = value => Object.fromEntries(Object.entries(value ?? {}).filter(([k]) => relevant(k)));
  assert.deepEqual(select(r.inline), {}); assert.deepEqual(select(a.authored.style), {});
  const nativeRules = r.rules.map(i => reference.rules[i]).filter(q => q.active);
  const nativeRequests = nativeRules.map(q => ({ selector: q.selector, declarations: select(q.declarations) })).filter(q => Object.keys(q.declarations).length);
  const bar = entry.family === 'progress-bar';
  assert.deepEqual(nativeRequests, bar ? [{ selector: '.mat-mdc-progress-bar', declarations: { 'text-align': { value: 'start', important: false } } }] : []);
  const serialized = nativeRules.flatMap(q => [...q.cssText.matchAll(/(?:^|;)\s*([\w-]+)\s*:\s*([^;]*)(?=;|$)/g)]
    .filter(([, key]) => relevant(key)).map(([, key, value]) => [key, value.trim()]));
  assert.deepEqual(serialized, bar ? [['text-align', 'start']] : []);
  const candidateRequests = candidate.rules.filter(q => rootInitialSelectorCanApply(q.selector, a.authored))
    .map(q => ({ selector: q.selector, declarations: select(q) })).filter(q => Object.keys(q.declarations).length);
  assert.deepEqual(candidateRequests, tabs ? [{ selector: '.tab', declarations: { padding: '1px 0 0' } }]
    : icon ? [{ selector: '.material-icon', declarations: { objectFit: 'contain' } }] : []);
  if (tabs) {
    assert.equal(normalize(reference.styles[r.style]).paddingTop, '0');
    const control = reference.nodes.find(n => n.key === proof.composition.referenceControl);
    assert.equal(normalize(reference.styles[control.style]).paddingTop, '0');
    for (const stage of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle']) {
      assert.equal(a[stage].padding, '1px 0 0'); assert.equal(normalize(a[stage]).paddingTop, '1px');
    }
  } else if (icon) {
    assert.equal(reference.styles[r.style].objectFit, 'fill');
    const children = reference.nodes.filter(n => n.parent === r.key); assert.equal(children.length, 1);
    assert.equal(children[0].type, 'svg');
    assert.equal(children[0].attributes.viewBox, '0 0 24 24');
    assert.equal(children[0].attributes.preserveAspectRatio, 'xMidYMid meet');
    assert.match(a.authored.src, /^data:image\/png;base64,/);
    assert.deepEqual(candidate.nodes.filter(n => n.parent === a.key), []);
    for (const stage of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle']) assert.equal(a[stage].objectFit, 'contain');
  } else {
    assert.equal(reference.styles[r.style].textAlign, 'start'); assert.equal(r.ownText, '');
    assert.equal(a.authored.textContent, undefined); assert.equal(a.authored.value, undefined);
    assert.equal(a.authored.role, 'progressbar');
    for (const stage of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle']) assert.equal(a[stage].textAlign, undefined);
  }
  return { referenceNode: r.key, astylarNode: a.key, composition: proof.composition, nativeRequests, candidateRequests,
    firstDivergence: tabs ? 'compact candidate control adds top padding absent from native label and control'
      : icon ? 'non-replaced SVG host compared to PNG replaced element' : bar ? 'explicit native text alignment omitted' : 'computed inherited alignment compared to omitted local style',
    renderingEquivalent: null, candidateComputedAlignmentProven: false, actualRasterVerified: false,
    sourceReplacementApproved: false };
}

export function applyFinalOwnerStyleReviews(rows, cases, inventory, normalize) {
  for (const [family, element, property, classification, explanation] of [
    ['tabs', 'tab-overview', 'paddingTop', 'application-plugin-authoring-defect', 'Candidate compact control adds 1px top padding absent from both native label and its containing control. Existing owner mapping is retained; this authoring adjustment is not evidence that core text placement is correct.'],
    ['tabs', 'tab-activity', 'paddingTop', 'application-plugin-authoring-defect', 'Candidate compact control adds 1px top padding absent from both native label and its containing control. Existing owner mapping is retained; this authoring adjustment is not evidence that core text placement is correct.'],
    ['progress-bar', 'progress-bar-primary', 'textAlign', 'application-plugin-authoring-defect', 'Native linear-progress host explicitly requests text-align:start; candidate custom host omits it. Lack of host text does not make the requests equal or establish inherited alignment, generated paint or output equivalence.'],
    ['progress-spinner', 'progress-spinner-primary', 'textAlign', 'parity-harness-defect', 'Native spinner computes start without a local request; candidate custom host omits local textAlign. This compares computed and local stages, not candidate inherited/used alignment. No generated progress-paint equivalence is claimed.'],
    ['icon', 'icon-primary', 'objectFit', 'parity-harness-defect', 'Native scalar owner is a non-replaced mat-icon containing SVG with xMidYMid meet; candidate is a PNG img requesting contain. Host object-fit:fill does not describe SVG fitting. Preserve the separately recorded SVG-to-raster authoring substitution; this measurement-boundary classification neither approves it nor proves asset, aspect-ratio or raster equivalence.'],
  ]) rows = applyModalBoxReview(rows, cases, inventory, normalize, {
    family, element, properties: [property], classification,
    attribution: 'reviewed-final-owner-style-boundary', owner: 'comparison owner identity and authored/local style boundary',
    prove: (e, r, a) => proveFinalOwnerStyles(e, r, a, normalize, element), justification: explanation,
  });
  return rows;
}

export function validateFinalOwnerStyleReviews(rows, originalRows, cases, inventory, normalize) {
  try {
    const select = values => values.filter(r => r.attribution === 'reviewed-final-owner-style-boundary');
    assert.equal(JSON.stringify(select(rows)), JSON.stringify(select(applyFinalOwnerStyleReviews(originalRows, cases, inventory, normalize))));
    return [];
  } catch (error) { return [`final owner styles lack original evidence: ${error.message}`]; }
}

export function proveRemainingBorderRequests(entry, reference, candidate, normalize) {
  if (entry.family === 'divider') {
    const proof = proveCustomOwnerBorder(entry, reference, candidate, normalize);
    return { ...proof, renderingEquivalent: null, originalHeightDefectReinvestigated: false };
  }
  const identity = proveTogglePositionRequests(entry, reference, candidate, 'button-toggle-two');
  const r = reference.nodes.find(n => n.key === identity.referenceNode);
  const a = candidate.nodes.find(n => n.key === identity.astylarNode);
  const select = value => Object.fromEntries(Object.entries(value ?? {}).filter(([k]) => relevant(k)));
  assert.deepEqual(select(r.inline), {}); assert.deepEqual(select(a.authored.style), {});
  const rules = r.rules.map(i => reference.rules[i]).filter(q => q.active);
  const nativeRequests = rules.filter(q => Object.keys(select(q.declarations)).length);
  assert.equal(nativeRequests.length, 1);
  const request = nativeRequests[0];
  assert.equal(request.selector, '.mat-button-toggle-group-appearance-standard .mat-button-toggle-appearance-standard + .mat-button-toggle-appearance-standard');
  assert.deepEqual(request.conditions, []);
  assert.equal(request.cssText, 'border-left: solid 1px var(--mat-button-toggle-divider-color, var(--mat-sys-outline));');
  assert.deepEqual(select(request.declarations), Object.fromEntries(['width', 'style', 'color'].map(p => ['border-left-' + p, { value: '', important: false }])));
  assert.ok(rules.filter(q => q !== request).every(q => !/(?:^|;)\s*(?:border[^:]*|all|transition[^:]*|animation[^:]*)\s*:/i.test(q.cssText)));
  const candidateRequests = candidate.rules.filter(q => rootInitialSelectorCanApply(q.selector, a.authored))
    .map(q => ({ selector: q.selector, declarations: select(q) })).filter(q => Object.keys(q.declarations).length);
  assert.deepEqual(candidateRequests, [{ selector: '#button-toggle-two', declarations: { borderWidth: '0 0 0 1px', borderStyle: 'solid', borderColor: '#79747e', borderRadius: '0' } }]);
  const native = normalize(reference.styles[r.style]);
  for (const side of ['Top', 'Right', 'Bottom']) {
    assert.equal(native['border' + side + 'Width'], '0'); assert.equal(native['border' + side + 'Style'], 'none');
  }
  assert.equal(native.borderLeftWidth, '1px'); assert.equal(native.borderLeftStyle, 'solid');
  for (const stage of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle']) {
    const local = normalize(a[stage]);
    for (const side of ['Top', 'Right', 'Bottom']) {
      assert.equal(local['border' + side + 'Width'], '0'); assert.equal(local['border' + side + 'Style'], 'solid');
    }
    assert.equal(local.borderLeftWidth, '1px'); assert.equal(local.borderLeftStyle, 'solid');
  }
  return { ...identity, nativeRequests, candidateRequests, renderingEquivalent: null,
    firstDivergence: 'left-only native border request translated to all-side solid style with zero non-left widths',
    nonLeftPaintAreaFromWidths: 0, actualRasterVerified: false, roundedClippingCauseProven: false };
}

export function applyRemainingBorderReviews(rows, cases, inventory, normalize) {
  for (const [family, element, properties] of [
    ['button-toggle', 'button-toggle-two', ['borderTopStyle', 'borderRightStyle', 'borderBottomStyle']],
    ['divider', 'divider-primary', ['borderTopWidth', 'borderTopStyle']],
  ]) rows = applyModalBoxReview(rows, cases, inventory, normalize, {
    family, element, properties, prove: (e, r, a) => proveRemainingBorderRequests(e, r, a, normalize),
    attribution: 'reviewed-remaining-border-request-substitution', owner: 'comparison side-specific border and paint-primitive authoring',
    justification: family === 'divider'
      ? 'Existing exact border/background proof applies to width and style too: native requests a token-colored solid 1px top border; candidate requests a 1px-high background and retains zero/none borders. This is unequal paint-primitive input, not a new diagnosis of the separately proven empty-block height defect or rendering equivalence.'
      : 'Native requests only a left divider; candidate sets solid on all sides while non-left widths remain zero in all three stages. Preserve this authored side-scope difference, but zero-width style differences do not explain rounded clipping or establish a visible non-left border defect. Existing token/color and position findings remain separate.',
  });
  return rows;
}

export function validateRemainingBorderReviews(rows, originalRows, cases, inventory, normalize) {
  try {
    const select = values => values.filter(r => r.attribution === 'reviewed-remaining-border-request-substitution');
    assert.deepEqual(select(rows), select(applyRemainingBorderReviews(originalRows, cases, inventory, normalize)));
    return [];
  } catch (error) { return [`remaining borders lack original evidence: ${error.message}`]; }
}

// Explicit host pairs, not a widening of ordinary-element or native-control
// assumptions. No claims about a plugin's generated children or painted output.
export function proveCustomOwnerBorder(entry, reference, candidate, normalize, element) {
  const tabControl = entry.family === 'tabs' && ['tab-overview', 'tab-activity'].includes(element);
  const [id, nativeType, candidateType] = tabControl ? [element, 'span', 'button'] : owners[entry.family];
  const inputs = entry.styleInputs.filter(i => i.id === id); assert.equal(inputs.length, 1);
  const input = inputs[0];
  const alias = entry.family === 'badge' ? proveBadgePointerRequest(entry, reference, candidate).identity : undefined;
  const rs = reference.nodes.filter(n => alias ? n.key === alias.referenceNode : n.attributes?.['data-parity-id'] === id || n.attributes?.id === id);
  const as = candidate.nodes.filter(n => n.authored?.id === id);
  assert.equal(rs.length, 1); assert.equal(as.length, 1);
  const r = rs[0], a = as[0];
  if (alias) assert.equal(alias.candidateNode, a.key);
  const composition = tabControl ? proveTabControlStage(reference, candidate, id) : undefined;
  if (composition) {
    assert.equal(composition.referenceLabel, r.key); assert.equal(composition.candidateControl, a.key);
  }
  assert.equal(r.type, nativeType); assert.equal(a.authored.type, candidateType);
  assert.equal(reference.ruleEvidenceComplete, true); assert.equal(candidate.ruleEvidenceComplete, true);
  assert.equal(candidate.resolvedStyleEvidenceVersion, 2);
  assert.equal(candidate.resolvedStyleSource, 'core-style-inspection');
  for (const [k, v] of Object.entries(input.reference)) assert.deepEqual(reference.styles[r.style][k], v);
  assert.equal(input.astylarResolvedStyleEvidenceVersion, 2);
  for (const [scalar, stage] of [['astylar', 'resolvedStyle'], ['astylarNormalResolvedStyle', 'normalResolvedStyle'], ['astylarInteractionResolvedStyle', 'interactionResolvedStyle']])
    assert.deepEqual(input[scalar], a[stage]);
  assert.ok(!Object.keys(r.inline).some(relevant));
  const nativeRules = r.rules.map(i => reference.rules[i]);
  if (entry.family === 'table') {
    const resets = nativeRules.filter(rule => Object.keys(rule.declarations).some(relevant));
    assert.equal(resets.length, 1);
    const reset = resets[0];
    assert.equal(reset.selector, '.mat-mdc-table'); assert.equal(reset.active, true);
    assert.deepEqual(reset.conditions, []);
    assert.match(reset.cssText, /(?:^|;)\s*border: 0px;/);
    const expected = {};
    for (const side of ['top', 'right', 'bottom', 'left']) for (const [property, value] of [['width', '0px'], ['style', 'none'], ['color', 'currentcolor']])
      expected[`border-${side}-${property}`] = { value, important: false };
    for (const [property, value] of [['source', 'none'], ['slice', '100%'], ['width', '1'], ['outset', '0'], ['repeat', 'stretch']])
      expected[`border-image-${property}`] = { value, important: false };
    assert.deepEqual(Object.fromEntries(Object.entries(reset.declarations).filter(([k]) => relevant(k))), expected);
  } else if (entry.family === 'divider') {
    const borders = nativeRules.filter(rule => Object.keys(rule.declarations).some(relevant));
    assert.equal(borders.length, 1);
    assert.equal(borders[0].selector, '.mat-divider'); assert.equal(borders[0].active, true);
    assert.deepEqual(borders[0].conditions, []);
    assert.deepEqual(Object.fromEntries(Object.entries(borders[0].declarations).filter(([k]) => relevant(k))), {
      'border-top-style': { value: 'solid', important: false },
      'border-top-color': { value: 'var(--mat-divider-color, var(--mat-sys-outline))', important: false },
      'border-top-width': { value: 'var(--mat-divider-width, 1px)', important: false },
    });
    assert.deepEqual(ownDividerRules(candidate, a), [{ selector: '.divider', background: '#cac4d0', height: '1px' }]);
    for (const stage of [a.resolvedStyle, a.normalResolvedStyle, a.interactionResolvedStyle]) {
      assert.equal(stage.background, '#cac4d0'); assert.equal(stage.height, '1px');
    }
  } else if (entry.family === 'badge') {
    const requests = nativeRules.filter(rule => Object.keys(rule.declarations).some(relevant));
    assert.equal(requests.length, 3);
    requests.forEach((rule, index) => {
      assert.equal(rule.selector, index === 2 ? '.ng-animate-disabled .mat-badge-content, .mat-badge-content._mat-animation-noopable' : '.mat-badge-content');
      assert.equal(rule.active, index !== 1);
      assert.deepEqual(rule.conditions, index === 1 ? ['(forced-colors: active)'] : []);
      const expected = {};
      if (index !== 1) {
        const values = { 'transition-behavior': 'normal', 'transition-duration': index === 0 ? '200ms' : '0s',
          'transition-timing-function': index === 0 ? 'ease-in-out' : 'ease',
          'transition-delay': '0s', 'transition-property': index === 0 ? 'transform' : 'none' };
        for (const [k, value] of Object.entries(values)) expected[k] = { value, important: false };
      }
      if (index !== 2) for (const corner of ['top-left', 'top-right', 'bottom-right', 'bottom-left'])
        expected[`border-${corner}-radius`] = { value: index === 0 ? '' : '0px', important: false };
      assert.deepEqual(Object.fromEntries(Object.entries(rule.declarations).filter(([k]) => relevant(k))), expected);
      const serialized = [...rule.cssText.matchAll(/(?:^|;)\s*transition\s*:\s*([^;]+)(?=;|$)/g)].map(m => m[1].trim());
      assert.deepEqual(serialized, index === 1 ? [] : [index === 0 ? 'transform 200ms ease-in-out' : 'none']);
      if (index === 0) assert.match(rule.cssText, /border-radius: var\(--mat-badge-container-shape, var\(--mat-sys-corner-full\)\);/);
    });
  } else if (entry.family.startsWith('progress-')) {
    const motion = nativeRules.filter(rule => Object.keys(rule.declarations).some(relevant));
    const spinner = entry.family === 'progress-spinner';
    assert.equal(motion.length, spinner ? 2 : 1);
    const expectedSelectors = spinner ? ['.mat-mdc-progress-spinner',
      '.mat-mdc-progress-spinner._mat-animation-noopable, .mat-mdc-progress-spinner._mat-animation-noopable .mdc-circular-progress__determinate-circle']
      : ['.mdc-linear-progress'];
    motion.forEach((rule, index) => {
      assert.equal(rule.selector, expectedSelectors[index]); assert.equal(rule.active, true);
      assert.deepEqual(rule.conditions, []);
      const stop = index === 1;
      const values = { 'transition-behavior': 'normal', 'transition-duration': stop ? '0s' : '250ms',
        'transition-timing-function': stop ? 'ease' : 'cubic-bezier(0.4, 0, 0.6, 1)',
        'transition-delay': spinner ? '0s' : '0ms', 'transition-property': stop ? 'none' : 'opacity' };
      assert.deepEqual(Object.fromEntries(Object.entries(rule.declarations).filter(([k]) => relevant(k))),
        Object.fromEntries(Object.entries(values).map(([k, value]) => [k, { value, important: stop }])));
      const serialized = [...rule.cssText.matchAll(/(?:^|;)\s*transition\s*:\s*([^;]+)(?=;|$)/g)].map(m => m[1].trim());
      assert.deepEqual(serialized, [stop ? 'none !important' : 'opacity 250ms cubic-bezier(0.4, 0, 0.6, 1)']);
    });
  } else assert.ok(nativeRules.every(rule => !Object.keys(rule.declarations).some(relevant)));
  assert.equal(a.authored.attributes?.style, undefined);
  assert.ok(!Object.keys(a.authored.style ?? {}).some(relevant));
  assert.ok(candidate.rules.every(rule => Object.values(rule).every(v => v === null || typeof v !== 'object')));
  const ownRules = candidate.rules.filter(rule => rootInitialSelectorCanApply(rule.selector, a.authored));
  const candidateRequests = ownRules.flatMap(rule => Object.entries(rule).filter(([k]) => relevant(k))
    .map(([property, value]) => ({ selector: rule.selector, property, value })));
  assert.deepEqual(candidateRequests, tabControl
    ? [{ selector: '.tab', property: 'borderWidth', value: '0' }, { selector: '.tab', property: 'borderRadius', value: '0' }]
    : entry.family === 'badge' ? [{ selector: '.badge-bubble', property: 'borderRadius', value: '8px' }]
    : entry.family === 'table' ? [{ selector: '.material-table', property: 'borderWidth', value: '0' }] : []);
  const native = normalize(input.reference);
  assert.match(native.color, /^rgba\(\d+,\d+,\d+,1\)$/);
  for (const side of sides) {
    if (entry.family === 'divider' && side === 'Top') {
      assert.equal(native.borderTopColor, 'rgba(123,117,127,1)');
      assert.equal(native.borderTopWidth, '1px'); assert.equal(native.borderTopStyle, 'solid');
      continue;
    }
    assert.equal(native[`border${side}Color`], native.color);
    assert.equal(native[`border${side}Width`], '0'); assert.equal(native[`border${side}Style`], 'none');
  }
  for (const stage of [a.resolvedStyle, a.normalResolvedStyle, a.interactionResolvedStyle]) {
    const border = Object.fromEntries(Object.entries(stage).filter(([k]) => relevant(k)));
    assert.deepEqual(border, { borderWidth: '0', borderStyle: 'none', borderColor: 'transparent', borderRadius: entry.family === 'badge' ? '8px' : '0' });
    const normalized = normalize(stage);
    for (const side of sides) assert.equal(normalized[`border${side}Color`], 'rgba(0,0,0,0)');
  }
  return { referenceNode: r.key, astylarNode: a.key, nativeType, candidateType,
    nativeRules, candidateRules: ownRules, candidateRequests, referenceColor: native.color,
    ...(composition ? { composition } : {}),
    ...(alias ? { alias } : {}),
    inputEquivalent: false, renderingEquivalent: false, generatedChildPaintVerified: false,
    motionSettlementVerified: false,
    scope: entry.family === 'divider' ? 'Explicit top-border/background substitution; three other native sides retain zero/none initial colors. No paint equivalence.'
      : 'Captured host-only initial border color; zero/none borders do not establish contextual-color paint equivalence.' };
}

function ownDividerRules(candidate, node) {
  return candidate.rules.filter(rule => rootInitialSelectorCanApply(rule.selector, node.authored))
    .filter(rule => rule.background !== undefined || rule.height !== undefined)
    .map(rule => ({ selector: rule.selector, background: rule.background, height: rule.height }));
}

export function proveDividerPositionRequests(entry, reference, candidate, normalize) {
  assert.equal(entry.family, 'divider');
  const identity = proveCustomOwnerBorder(entry, reference, candidate, normalize);
  const r = reference.nodes.find(n => n.key === identity.referenceNode);
  const a = candidate.nodes.find(n => n.key === identity.astylarNode);
  const position = k => /^(position|top|right|bottom|left|all)$|^inset/.test(k.replaceAll('-', '').toLowerCase());
  assert.ok(!Object.keys(r.inline).some(position));
  assert.ok(r.rules.map(i => reference.rules[i]).every(rule => !Object.keys(rule.declarations).some(position)));
  const native = reference.styles[r.style];
  assert.equal(native.position, 'static');
  for (const side of ['top', 'right', 'bottom', 'left']) assert.equal(native[side], 'auto');
  const top = entry.profile === 'contrast' ? '74.785px' : entry.profile === 'custom' ? '86.785px' : '79px';
  const expected = { position: 'absolute', top, left: '28px', right: '28px' };
  const select = o => Object.fromEntries(Object.entries(o).filter(([k]) => position(k)));
  assert.deepEqual(candidate.rules.filter(rule => rootInitialSelectorCanApply(rule.selector, a.authored))
    .map(rule => ({ selector: rule.selector, ...select(rule) })).filter(rule => Object.keys(rule).length > 1),
    [{ selector: '.divider', ...expected }]);
  assert.ok(!Object.keys(a.authored.style ?? {}).some(position));
  for (const stage of [a.resolvedStyle, a.normalResolvedStyle, a.interactionResolvedStyle]) assert.deepEqual(select(stage), expected);
  return { ...identity, nativePosition: native.position, candidatePositionRequests: expected,
    sourceFinding: 'fixture-divider-replaces-paragraph-flow-with-coordinates',
    coreCoordinateDefectProven: false };
}

export function applyDividerPositionReviews(rows, cases, inventory, normalize) {
  return applyModalBoxReview(rows, cases, inventory, normalize, {
    family: 'divider', element: 'divider-primary', properties: ['top', 'left', 'right'],
    classification: 'application-plugin-authoring-defect', attribution: 'reviewed-divider-coordinate-substitution',
    owner: 'showcase divider block-flow authoring',
    prove: (e, r, a) => proveDividerPositionRequests(e, r, a, normalize),
    justification: 'Native static divider authoring omits insets; the candidate requests absolute positioning with 28px opposing edges and density-specific top offsets. Exact original requests and all candidate stages bind these scalar rows to the existing historical paragraph-flow compensation finding. Native auto is computed, not an instruction to copy auto onto the positioned substitute. The first divergence is authoring; equal-input block-flow reductions, not further offset tuning, must determine core layout behavior.',
  });
}

export function proveProgressPositionRequests(entry, reference, candidate, normalize) {
  assert.ok(['progress-bar', 'progress-spinner'].includes(entry.family));
  const identity = proveCustomOwnerBorder(entry, reference, candidate, normalize);
  return proveRelativePositionRequests(reference, candidate, identity,
    entry.family === 'progress-bar' ? '.mdc-linear-progress' : '.mat-mdc-progress-spinner', entry.family === 'progress-bar');
}

function proveRelativePositionRequests(reference, candidate, identity, selector, bar) {
  const r = reference.nodes.find(n => n.key === identity.referenceNode), a = candidate.nodes.find(n => n.key === identity.astylarNode);
  const relevant = k => /^(position|top|right|bottom|left|transform|translate|rotate|scale|all)$|^inset/.test(k.replaceAll('-', '').toLowerCase());
  const select = o => Object.fromEntries(Object.entries(o).filter(([k]) => relevant(k)));
  assert.deepEqual(select(r.inline), {});
  const requests = r.rules.map(i => reference.rules[i]).filter(rule => Object.keys(select(rule.declarations)).length);
  assert.equal(requests.length, 1); assert.equal(requests[0].selector, selector);
  assert.equal(requests[0].active, true); assert.deepEqual(requests[0].conditions, []);
  assert.deepEqual(select(requests[0].declarations), { position: { value: 'relative', important: false },
    ...(bar ? { transform: { value: 'translateZ(0px)', important: false } } : {}) });
  const native = select(reference.styles[r.style]);
  assert.deepEqual(native, { position: 'relative', top: '0px', right: '0px', bottom: '0px', left: '0px',
    transform: bar ? 'matrix(1, 0, 0, 1, 0, 0)' : 'none' });
  assert.deepEqual(select(a.authored.style ?? {}), {});
  assert.ok(candidate.rules.filter(rule => rootInitialSelectorCanApply(rule.selector, a.authored)).every(rule => !Object.keys(select(rule)).length));
  for (const stage of [a.resolvedStyle, a.normalResolvedStyle, a.interactionResolvedStyle]) assert.deepEqual(select(stage), {});
  return { ...identity, referencePositionRequests: requests, nativePositionValues: native,
    candidateUsedOffsetsVerified: false, containingBlockEquivalenceProven: false };
}

export function proveTogglePositionRequests(entry, reference, candidate, element) {
  assert.equal(entry.family, 'button-toggle');
  assert.ok(['button-toggle-primary', 'button-toggle-one', 'button-toggle-two'].includes(element));
  const inputs = entry.styleInputs.filter(i => i.id === element); assert.equal(inputs.length, 1);
  const input = inputs[0], rs = reference.nodes.filter(n => n.attributes?.id === element || n.attributes?.['data-parity-id'] === element);
  const as = candidate.nodes.filter(n => n.authored?.id === element); assert.equal(rs.length, 1); assert.equal(as.length, 1);
  const r = rs[0], a = as[0], group = element === 'button-toggle-primary';
  assert.equal(r.type, group ? 'mat-button-toggle-group' : 'mat-button-toggle'); assert.equal(a.authored.type, 'div');
  assert.equal(reference.ruleEvidenceComplete, true); assert.equal(candidate.ruleEvidenceComplete, true);
  assert.equal(candidate.resolvedStyleEvidenceVersion, 2); assert.equal(candidate.resolvedStyleSource, 'core-style-inspection');
  assert.equal(input.astylarResolvedStyleEvidenceVersion, 2); assert.equal(Object.keys(input.reference).length, 89);
  for (const [k, v] of Object.entries(input.reference)) assert.deepEqual(reference.styles[r.style][k], v);
  for (const [scalar, stage] of [['astylar', 'resolvedStyle'], ['astylarNormalResolvedStyle', 'normalResolvedStyle'], ['astylarInteractionResolvedStyle', 'interactionResolvedStyle']])
    assert.deepEqual(input[scalar], a[stage]);
  assert.equal(a.authored.attributes?.style, undefined);
  const identity = { referenceNode: r.key, astylarNode: a.key, inputEquivalent: false, renderingEquivalent: false };
  return proveRelativePositionRequests(reference, candidate, identity,
    group ? '.mat-button-toggle-standalone, .mat-button-toggle-group' : '.mat-button-toggle', group);
}

export function applyTogglePositionReviews(rows, cases, inventory, normalize) {
  for (const element of ['button-toggle-primary', 'button-toggle-one', 'button-toggle-two']) {
    const common = { family: 'button-toggle', element, prove: (e, r, a) => proveTogglePositionRequests(e, r, a, element) };
    rows = applyModalBoxReview(rows, cases, inventory, normalize, { ...common,
      properties: element === 'button-toggle-primary' ? ['position', 'transform'] : ['position'],
      classification: 'application-plugin-authoring-defect', attribution: 'reviewed-toggle-position-request-omission',
      owner: 'toggle host relative-position and transform authoring',
      justification: 'Native toggle group and hosts request relative positioning; the group also requests translateZ(0px). Corresponding candidate divs omit these requests at authoring and all three stages. Identity matrix pixels do not establish transform:none or stacking/containing-block equivalence. This proves unequal inputs, not the cause of the rounded-border overflow or a renderer coordinate fault.',
    });
    rows = applyModalBoxReview(rows, cases, inventory, normalize, { ...common,
      properties: ['top', 'right', 'bottom', 'left'], classification: 'parity-harness-defect',
      attribution: 'reviewed-toggle-computed-offset-boundary', owner: 'toggle used-inset versus local declaration measurement',
      justification: 'Native relative toggle owners compute zero offsets without authored insets; candidate local declarations omit insets. Preserve zero computed observations without copying them as missing CSS requests. Relative-position and transform omissions are separately classified. Used layout, rounded clipping and final output remain unproven.',
    });
  }
  return rows;
}

export function applyProgressPositionReviews(rows, cases, inventory, normalize) {
  for (const family of ['progress-bar', 'progress-spinner']) {
    const common = { family, element: `${family}-primary`, prove: (e, r, a) => proveProgressPositionRequests(e, r, a, normalize) };
    rows = applyModalBoxReview(rows, cases, inventory, normalize, { ...common,
      properties: family === 'progress-bar' ? ['position', 'transform'] : ['position'],
      classification: 'application-plugin-authoring-defect', attribution: 'reviewed-progress-position-request-omission',
      owner: 'progress host position and transform authoring',
      justification: 'Native progress hosts explicitly request relative positioning, and the linear host also requests translateZ(0px); candidate local authoring and all three stages omit them. An identity computed matrix does not prove transform:none equivalence for containing-block/stacking semantics. Preserve original requests rather than copying sampled zero offsets or inferring a projection bug. Generated progress content, opacity settlement and final layout/paint remain unverified.',
    });
    rows = applyModalBoxReview(rows, cases, inventory, normalize, { ...common,
      properties: ['top', 'right', 'bottom', 'left'], classification: 'parity-harness-defect',
      attribution: 'reviewed-progress-computed-offset-boundary', owner: 'native used insets versus candidate local declarations',
      justification: 'Native relatively positioned progress hosts have no authored insets and compute zero pixel offsets; candidate local stages omit insets. The zero measurements are not missing literal authored requests. Explicit relative-position/transform omissions are classified separately, and candidate used offsets or containing-block equivalence are not established.',
    });
  }
  return rows;
}

export function proveBadgeProgressOrigin(entry, reference, candidate, normalize) {
  assert.ok(['badge', 'progress-bar', 'progress-spinner'].includes(entry.family));
  return proveOwnerOriginBoundary(reference, candidate, proveCustomOwnerBorder(entry, reference, candidate, normalize));
}

export function proveChipTabOrigin(entry, reference, candidate, element) {
  assert.ok(['chips', 'tabs'].includes(entry.family));
  // Reuse scalar/owner/motion authentication, not caret-color semantics.
  return proveOwnerOriginBoundary(reference, candidate, proveMotionCaretRequests(entry, reference, candidate, element));
}

function proveOwnerOriginBoundary(reference, candidate, identity) {
  const origin = k => /^(all|transformorigin|transformbox)$/.test(k.replaceAll('-', '').toLowerCase());
  const context = k => origin(k) || /^(transform|translate|rotate|scale|animation|transition)/.test(k.replaceAll('-', '').toLowerCase());
  const walk = (tree, key) => {
    const result = [], seen = new Set();
    while (key !== null) {
      assert.ok(!seen.has(key)); seen.add(key);
      const nodes = tree.nodes.filter(n => n.key === key); assert.equal(nodes.length, 1);
      result.push(nodes[0]); key = nodes[0].parent;
    }
    return result;
  };
  const nativePath = walk(reference, identity.referenceNode).map(node => {
    assert.ok(!['svg', 'g', 'path', 'circle', 'rect'].includes(node.type));
    assert.ok(!Object.keys(node.attributes ?? {}).some(origin));
    const rules = [{ selector: '<inline>', declarations: node.inline, active: true }, ...node.rules.map(i => reference.rules[i])];
    assert.ok(rules.every(rule => !Object.keys(rule.declarations).some(origin)));
    return { node: node.key, type: node.type, requests: rules.map(rule => ({ ...rule,
      declarations: Object.fromEntries(Object.entries(rule.declarations).filter(([k]) => context(k))) }))
      .filter(rule => Object.keys(rule.declarations).length) };
  });
  const candidatePath = walk(candidate, identity.astylarNode).map(node => {
    assert.ok(!Object.keys(node.authored).some(origin));
    assert.equal(node.authored.attributes?.style, undefined);
    const rules = [node.authored.style ?? {}, ...candidate.rules.filter(rule => rootInitialSelectorCanApply(rule.selector, node.authored))];
    assert.ok(rules.every(rule => !Object.keys(rule).some(origin)));
    for (const stage of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle']) {
      if (node.parent === null && Object.keys(node.authored).length === 0) assert.equal(node[stage], undefined);
      else assert.ok(!Object.keys(node[stage]).some(origin));
    }
    return { node: node.key, authored: node.authored, possibleRules: rules };
  });
  const measured = reference.nodes.find(n => n.key === identity.referenceNode);
  const referenceOrigin = reference.styles[measured.style].transformOrigin;
  assert.match(referenceOrigin, /^-?\d+(?:\.\d+)?px -?\d+(?:\.\d+)?px(?: 0px)?$/);
  return { ...identity, nativePath, candidatePath, referenceOrigin,
    inputEquivalent: false, renderingEquivalent: false, motionSettlementVerified: false,
    candidateComputedOriginVerified: false, referenceBoxEqualityVerified: false };
}

export function applyChipTabOriginReviews(rows, cases, inventory, normalize) {
  for (const [family, elements] of Object.entries({ chips: ['chip-0', 'chip-1'], tabs: ['tab-overview', 'tab-activity', 'tab-panel'] }))
    for (const element of elements) rows = applyModalBoxReview(rows, cases, inventory, normalize, {
      family, element, properties: ['transformOrigin'], classification: 'parity-harness-defect',
      attribution: 'reviewed-chip-tab-origin-owner-boundary', owner: 'chip/tab computed origin versus local declaration inspection',
      prove: (e, r, a) => proveChipTabOrigin(e, r, a, element),
      justification: 'Existing scalar/owner/motion identity is reused, then complete captured ancestry is checked separately for origin/reference-box/reset requests. Native computed pixel origins and candidate local omission are different observation stages. Competing native motion declarations, unresolved variable-based transitions and label/control structural differences remain explicit; neither choosing transition:none nor copying measured origin pixels establishes equal rendering. Candidate computed origins, reference-box equality and motion settlement remain unproven.',
    });
  return rows;
}

export function applyBadgeProgressOriginReviews(rows, cases, inventory, normalize) {
  for (const family of ['badge', 'progress-bar', 'progress-spinner']) rows = applyModalBoxReview(rows, cases, inventory, normalize, {
    family, element: owners[family][0], properties: ['transformOrigin'],
    classification: 'parity-harness-defect', attribution: 'reviewed-badge-progress-origin-boundary',
    owner: 'computed transform-origin versus local declaration measurement',
    prove: (e, r, a) => proveBadgeProgressOrigin(e, r, a, normalize),
    justification: 'Authenticated host/alias owners report native pixel origins but candidate local stages omit origin. Complete ancestry has no origin/reference-box/reset requests. Native motion and transform requests are preserved, including badge transform transitions and linear translateZ; they are not treated as settled or equal to candidate behavior. Computed pixel centers are not authored offsets to copy. Reference-box equality, candidate computed origin, indirect motion effects and rendered correctness remain unproven.',
  });
  return rows;
}

export function applyCustomOwnerBorderReviews(rows, cases, inventory, normalize) {
  for (const [family, [element]] of Object.entries(owners)) rows = applyModalBoxReview(rows, cases, inventory, normalize, {
    family, element, properties: (family === 'divider' ? sides.slice(1) : sides).map(s => `border${s}Color`),
    classification: family === 'table' ? 'application-plugin-authoring-defect' : 'intentional-documented-limitation',
    attribution: family === 'table' ? 'reviewed-table-border-reset-omission' : 'reviewed-custom-host-border-initial-divergence',
    owner: 'core border initial-color contract and measured host identity',
    prove: (e, r, a) => proveCustomOwnerBorder(e, r, a, normalize),
    justification: family === 'badge'
      ? 'The generated native badge span is authenticated by the existing alias/ancestry proof, not a fabricated parity ID. Its border colors are omitted and zero/none colors compute from currentcolor; candidate stages use transparent initial colors. Native radius tokens and transform-only motion/none override are retained alongside the candidate 8px radius and absent motion. Those unequal requests are not normalized away or accepted as equivalent; this classification covers border color only, not radius, transform settlement, hit testing or final paint.'
      : family.startsWith('progress-')
      ? 'The explicitly mapped progress hosts omit border requests. Captured native motion is restricted to opacity (plus spinner transition:none !important), not border or color; candidate motion remains omitted. Zero/none native border colors use currentcolor while candidate host stages use transparent defaults. This scoped initial-color limitation neither accepts the unequal motion inputs nor proves opacity settlement, generated progress paint, inherited ink or final raster.'
      : family === 'divider'
      ? 'Only the three non-top sides are covered: no native side requests exist and zero/none colors compute from currentcolor, while candidate stages retain transparent initial borders. The explicit native top border and candidate background replacement are preserved by a separate authoring classification. This is not a claim that the whole divider omits borders or that paint/layout inputs are equivalent.'
      : family === 'table'
      ? 'The native table explicitly requests border: 0px, including none styles and currentcolor colors; the candidate authors only borderWidth: 0. All three candidate stages retain transparent defaults. This is an unequal reset request at authoring, despite both captured hosts having invisible zero/none borders. Do not copy computed theme colors as compensation. Table cells, collapsed-border behavior, inherited ink and final raster remain separate.'
      : 'Authenticated native/custom host pairs omit authored border and motion requests locally. Native zero/none borders compute their color from currentcolor; all three candidate host stages expose transparent initial borders. This extends the existing initial-color limitation to explicit host pairs, not generated icon/plugin children. Structure, inherited ink, future visible borders and final raster remain separate; no compensation or rendering equivalence is approved.',
  });
  rows = applyModalBoxReview(rows, cases, inventory, normalize, {
    family: 'divider', element: 'divider-primary', properties: ['borderTopColor'],
    classification: 'application-plugin-authoring-defect', attribution: 'reviewed-divider-border-background-substitution',
    owner: 'showcase divider border and theme-token input translation',
    prove: (e, r, a) => proveCustomOwnerBorder(e, r, a, normalize),
    justification: 'The native divider requests a solid 1px top border using the Material outline token; the candidate omits borders and paints a 1px-high background with literal #cac4d0. This is an authored paint-primitive and token substitution, consistent with the separately retained absolute-flow compensation finding. Matching thin-line screenshots cannot establish equal inputs. Other omitted border sides, layout, contextual theme resolution and final raster remain separate; restore authored intent before diagnosing equal-input core paint.',
  });
  for (const element of ['tab-overview', 'tab-activity']) rows = applyModalBoxReview(rows, cases, inventory, normalize, {
    family: 'tabs', element, properties: sides.map(s => `border${s}Color`),
    classification: 'parity-harness-defect', attribution: 'reviewed-tab-border-measurement-owner',
    owner: 'tab label versus control measurement boundary',
    prove: (e, r, a) => proveCustomOwnerBorder(e, r, a, normalize, element),
    justification: 'The authenticated scalar owner is a native text-label span inside the tab control, compared with a candidate button. The native label omits border declarations and computes zero/none currentcolor borders; the candidate button explicitly sets width/radius zero and retains transparent initial color. Existing tab composition proof preserves the distinct control/label hierarchy. This local observation cannot establish equivalent control borders, missing native reset translation or a renderer paint defect. Parent control requests and output remain separate.',
  });
  return rows;
}
