import assert from 'node:assert/strict';
import { applyModalBoxReview } from './modal-position-inspection.mjs';
import { resolveOriginAliasPair } from './origin-alias-mapping-evidence.mjs';
import { rootInitialSelectorCanApply } from './root-initial-style-evidence.mjs';

export function proveListSpacingComposition(entry, reference, candidate) {
  assert.equal(entry.family, 'list');
  const mapping = proveDisplayRequest(entry, reference, candidate, 'list-primary');
  const r = reference.nodes.find(n => n.key === mapping.referenceNode);
  const a = candidate.nodes.find(n => n.key === mapping.astylarNode);
  const relevant = key => /^(padding.*|flexdirection|all)$/.test(key.replaceAll('-', '').toLowerCase());
  assert.deepEqual(Object.keys(r.inline).filter(relevant), []);
  assert.equal(a.authored.style, undefined);
  const requests = r.rules.map(i => reference.rules[i]).filter(rule => rule.active).flatMap(rule => {
    assert.doesNotMatch(rule.cssText, /\\/);
    return Object.entries(rule.declarations).filter(([key]) => relevant(key))
      .map(([key, value]) => ({ selector: rule.selector, conditions: rule.conditions, key, ...value }));
  });
  assert.deepEqual(requests, ['top', 'right', 'bottom', 'left'].map(side => ({ selector: '.mdc-list',
    conditions: [], key: 'padding-' + side, value: ['top', 'bottom'].includes(side) ? '8px' : '0px', important: false })));
  const ownRequests = node => candidate.rules.filter(rule => rootInitialSelectorCanApply(rule.selector, node.authored))
    .flatMap(rule => Object.entries(rule).filter(([key]) => relevant(key))
      .map(([key, value]) => ({ selector: rule.selector, key, value })));
  assert.deepEqual(ownRequests(a), [{ selector: '.material-list', key: 'flexDirection', value: 'column' }]);
  const native = reference.styles[r.style];
  assert.equal(native.paddingTop, '8px'); assert.equal(native.paddingBottom, '8px');
  assert.equal(native.flexDirection, 'row'); assert.equal(native.display, 'block');
  for (const stage of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle'])
    assert.deepEqual(Object.fromEntries(Object.entries(a[stage]).filter(([key]) => relevant(key))), { padding: '0', flexDirection: 'column' });
  const rc = reference.nodes.filter(n => n.parent === r.key), ac = candidate.nodes.filter(n => n.parent === a.key);
  assert.equal(rc.length, 2); assert.deepEqual(rc.map(n => n.type), ['mat-list-item', 'mat-list-item']);
  assert.deepEqual(ac.map(n => n.authored.id), ['list-inbox', 'list-archive']);
  const expected = { light: ['48px', '56px'], dark: ['48px', '56px'], contrast: ['24px', '40px'], custom: ['40px', '48px'] }[entry.profile];
  assert.ok(expected);
  const children = rc.map((rn, index) => {
    const an = ac[index], rs = reference.styles[rn.style];
    const text = index === 0 ? 'Inbox' : 'Archive';
    assert.equal(reference.nodes.filter(n => n.key.startsWith(rn.key + '/')).map(n => n.ownText ?? '').join(''), text);
    const labels = candidate.nodes.filter(n => n.parent === an.key); assert.equal(labels.length, 1);
    assert.equal(labels[0].authored.textContent, text); assert.equal(labels[0].authored.type, 'span');
    assert.equal(an.authored.type, 'div'); assert.equal(an.authored.style, undefined);
    assert.equal(an.authored.attributes?.style, undefined);
    const heightRequests = candidate.rules.filter(rule => rootInitialSelectorCanApply(rule.selector, an.authored))
      .flatMap(rule => Object.entries(rule).filter(([key]) => /^(height|minheight|maxheight|blocksize|minblocksize|maxblocksize|all)$/.test(key.replaceAll('-', '').toLowerCase()))
        .map(([key, value]) => ({ selector: rule.selector, key, value })));
    assert.deepEqual(heightRequests, [{ selector: '.list-item', key: 'height', value: expected[1] }]);
    assert.equal(rs.height, expected[0]); assert.equal(rs.padding, '0px 16px');
    for (const stage of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle']) {
      assert.equal(an[stage].height, expected[1]); assert.equal(an[stage].padding, '0');
      assert.equal(an[stage].alignItems, 'center'); assert.equal(labels[0][stage].marginLeft, '16px');
    }
    return { referenceNode: rn.key, astylarNode: an.key, text,
      referenceComputedHeight: rs.height, candidateLocalHeight: expected[1],
      candidateHeightRequests: heightRequests,
      referenceComputedPadding: rs.padding, candidatePadding: '0', candidateLabelMarginLeft: '16px' };
  });
  return { referenceNode: r.key, astylarNode: a.key, mapping, referenceRequests: requests,
    candidateHostRequests: ownRequests(a), children, inputEquivalent: false, renderingEquivalent: false,
    firstDivergence: 'padded block list replaced by unpadded column flex list with different row heights',
    coreDefectProven: false, compensationIntentProven: false, candidateUsedLayoutVerified: false };
}

export function applyListSpacingReviews(rows, cases, inventory, normalize) {
  return applyModalBoxReview(rows, cases, inventory, normalize, {
    family: 'list', element: 'list-primary', properties: ['paddingTop', 'paddingBottom', 'flexDirection'],
    prove: proveListSpacingComposition, attribution: 'reviewed-list-spacing-composition-substitution',
    owner: 'showcase list block-to-flex and row-size authoring',
    justification: 'Native block list requests 8px top/bottom padding; candidate column flex list omits padding and has larger fixed row heights with label margins instead of native row padding. The native computed flex-direction:row is not an authored flex layout request on this block owner. Matching two-row total height in some themes cannot establish equivalent inputs or internal spacing, and contrast row inflation differs. Preserve this composition substitution without claiming a core padding/flex defect or proving historical compensation intent.',
  });
}

export function validateListSpacingReviews(rows, originalRows, cases, inventory, normalize) {
  try {
    const select = values => values.filter(r => r.attribution === 'reviewed-list-spacing-composition-substitution');
    assert.deepEqual(select(rows), select(applyListSpacingReviews(originalRows, cases, inventory, normalize)));
    return [];
  } catch (error) { return [`list spacing composition lacks original evidence: ${error.message}`]; }
}

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
export const displayBoundaryOwners = [
  ['radio', 'radio-primary', 'mat-radio-group', 'div', 'inline', 'block', null, null],
  ['tabs', 'tab-panel', 'span', 'showcase.material:tab-panel', 'inline', 'block', null, null],
  ['toolbar', 'toolbar-title', 'span', 'span', 'block', 'inline', null, null],
];

export function proveDisplayRequest(entry, reference, candidate, element) {
  const scope = [...displayRequestOwners, ...displayBoundaryOwners].find(([family, id]) => entry.family === family && id === element);
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
  const rc = reference.nodes.filter(n => n.parent === r.key), ac = candidate.nodes.filter(n => n.parent === a.key);
  if (displayBoundaryOwners.includes(scope)) {
    assert.equal(ap.resolvedStyle.display, 'flex');
    assert.equal(reference.styles[rp.style].display, element === 'toolbar-title' ? 'flex' : 'block');
    if (element === 'radio-primary') {
      assert.equal(rp.type, 'section'); assert.equal(ap.authored.type, 'section');
      assert.deepEqual(rc.map(n => [n.type, reference.styles[n.style].position]), [['mat-radio-button', 'static'], ['mat-radio-button', 'static']]);
      assert.deepEqual(ac.map(n => [n.authored.type, n.resolvedStyle.position]), [['div', 'absolute'], ['div', 'absolute']]);
    } else {
      assert.deepEqual(rc, []); assert.deepEqual(ac, []);
      if (element === 'toolbar-title') {
        assert.equal(rp.type, 'mat-toolbar'); assert.equal(ap.authored.type, 'div');
        assert.equal(r.ownText, 'Material workspace'); assert.equal(a.authored.textContent, r.ownText);
      } else {
        assert.equal(rp.type, 'div'); assert.equal(ap.authored.type, 'div');
        assert.ok(['Overview content', 'Activity content'].includes(r.ownText));
        assert.equal(a.authored.textContent, undefined);
        assert.equal(a.authored.role, 'tabpanel');
        assert.ok(['Overview content', 'Activity content'].includes(a.authored.ariaLabel));
        assert.equal(typeof a.authored.data.selected, 'boolean');
        // Animation observations may show outgoing native text. Preserve both
        // states without claiming the plugin label is native rendered content.
      }
    }
  }
  return { referenceNode: r.key, astylarNode: a.key, identity, nativeRequests, candidateRequests,
    nativeComputedDisplay: scope[4], candidateLocalDisplay: scope[5],
    parentDisplays: { reference: reference.styles[rp.style].display, candidate: ap.resolvedStyle.display },
    ownerTypes: { reference: r.type, candidate: a.authored.type },
    directChildTypes: { reference: rc.map(n => n.type), candidate: ac.map(n => n.authored.type) },
    contentOwnership: { nativeOwnText: r.ownText, candidateText: a.authored.textContent, candidateLabel: a.authored.ariaLabel, candidateData: a.authored.data },
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

export function applyDisplayBoundaryReviews(rows, cases, inventory, normalize) {
  for (const [family, element] of displayBoundaryOwners) {
    const toolbar = family === 'toolbar';
    rows = applyModalBoxReview(rows, cases, inventory, normalize, {
      family, element, properties: ['display'],
      prove: (entry, r, a) => proveDisplayRequest(entry, r, a, element),
      classification: toolbar ? 'parity-harness-defect' : 'application-plugin-authoring-defect',
      attribution: toolbar ? 'reviewed-display-computed-local-boundary' : 'reviewed-display-owner-substitution',
      owner: toolbar ? 'computed flex-item versus local type-default measurement' : 'comparison element/plugin and flow ownership',
      justification: toolbar
        ? 'Both owners are spans without authored display/reset requests under flex parents. Native computed block is compared with candidate local inline, not candidate used display. Preserve other style differences; this is an observation-stage boundary, not proof of correct flex-item layout or rendering equivalence.'
        : family === 'radio'
          ? 'Native inline mat-radio-group with two static mat-radio-button children is replaced by a locally block div and two absolute div children; neither host requests display. Element defaults, parent layout and child flow ownership differ before core layout. This is not evidence that equal authored inputs fail in core or that the representations are equivalent.'
          : 'Native inline span owns text; candidate is a locally block private tab-panel plugin with no authored text children, using label/data state instead. Preserve both content owners and state values; this structural/paint ownership substitution is not a core display defect or a proven equivalent representation.',
    });
  }
  return rows;
}
