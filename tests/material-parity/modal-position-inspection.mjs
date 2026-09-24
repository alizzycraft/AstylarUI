import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { resolveOriginAliasPair } from './origin-alias-mapping-evidence.mjs';
import { rootInitialSelectorCanApply } from './root-initial-style-evidence.mjs';
const hash = b => createHash('sha256').update(b).digest('hex');
const ids = ['bottom-sheet-copy', 'bottom-sheet-dismiss', 'bottom-sheet-panel', 'dialog-actions',
  'dialog-cancel', 'dialog-copy', 'dialog-panel', 'dialog-save', 'dialog-title'];
const one = ns => { assert.equal(ns.length, 1); return ns[0]; };
const caseKey = (e, kind) => `${kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`;

// Adapt only the inventory's indexed storage, preserving captured values and
// rule order. No defaults or inferred style values are introduced.
export function modalInventoryTrees(inventory, key) {
  assert.deepEqual(inventory.errors, []);
  return ['reference', 'astylar'].map(side => {
    const entry = one(inventory.cases.filter(c => c.case === key && c.side === side));
    const variant = inventory.variants[entry.variant]; assert.equal(variant.side, side);
    const style = index => {
      assert.equal(inventory.styles[index].side, side); return inventory.styles[index].value;
    };
    return { ...variant, schemaVersion: 1, errors: [], resolvedStyleRevision: entry.resolvedStyleRevision,
      styles: inventory.styles.map(s => s.value),
      rules: side === 'reference' ? inventory.rules.map(r => r.value) : variant.rules.map(index => {
        assert.equal(inventory.rules[index].side, side); return inventory.rules[index].value;
      }),
      nodes: variant.nodes.map(n => side === 'reference' ? n : { ...n,
        resolvedStyle: n.style === undefined ? undefined : style(n.style),
        normalResolvedStyle: n.normalStyle === undefined ? undefined : style(n.normalStyle),
        interactionResolvedStyle: n.interactionStyle === undefined ? undefined : style(n.interactionStyle) }) };
  });
}

// Pure semantic join over evidence already collected by the audit. The caller
// owns capture authentication and complete scalar population selection.
// This does not reread trees, normalize omitted values, or accept raster parity.
export function proveBottomSheetScalarTypography(entry, r, a, element, property) {
  assert.equal(entry.family, 'bottom-sheet');
  assert.ok(['bottom-sheet-panel', 'bottom-sheet-copy', 'bottom-sheet-dismiss'].includes(element));
  const tokens = {
    fontFamily: ['font-family', 'var(--mat-bottom-sheet-container-text-font, var(--mat-sys-body-large-font))', 'Roboto'],
    lineHeight: ['line-height', 'var(--mat-bottom-sheet-container-text-line-height, var(--mat-sys-body-large-line-height))', '24px'],
    letterSpacing: ['letter-spacing', 'var(--mat-bottom-sheet-container-text-tracking, var(--mat-sys-body-large-tracking))', '0.496px'],
    color: ['color', 'var(--mat-bottom-sheet-container-text-color, var(--mat-sys-on-surface))', 'rgb(29, 27, 30)'],
  };
  assert.ok(Object.hasOwn(tokens, property));
  const [css, token, computed] = tokens[property];
  const key = caseKey(entry, entry.kind);
  const { mapping } = proveModalPositionInspection(entry, r, a, element);
  const referencePath = mapping.referencePath.map(key => r.nodes.find(n => n.key === key));
  const candidatePath = mapping.candidatePath.map(key => a.nodes.find(n => n.key === key));
  const depth = element === 'bottom-sheet-panel' ? 0 : 2;
  assert.deepEqual(referencePath.slice(0, depth + 1).map(n => n.type), depth
    ? ['a', 'mat-nav-list', 'mat-bottom-sheet-container'] : ['mat-bottom-sheet-container']);
  assert.equal(candidatePath[0].authored.id, element);
  const affects = key => [property.toLowerCase(), 'all', ...(property === 'color' ? ['webkittextfillcolor'] : ['font'])]
    .includes(key.replaceAll('-', '').toLowerCase()) || /^(animation|transition)/i.test(key);
  for (let index = 0; index <= depth; index++) {
    const node = referencePath[index];
    assert.equal(r.styles[node.style][property], computed);
    assert.ok(!Object.keys(node.inline ?? {}).some(affects));
    const requests = node.rules.map(i => r.rules[i]).filter(rule => rule.active)
      .flatMap(rule => Object.entries(rule.declarations).filter(([key]) => affects(key) && !/^(animation|transition)/i.test(key))
        .map(([key, value]) => ({ selector: rule.selector, key, value: value.value })));
    assert.deepEqual(requests, index === depth ? [{ selector: '.mat-bottom-sheet-container', key: css, value: token }]
      : property === 'color' && index === 0 ? [{ selector: 'a.mdc-list-item', key: css, value: 'inherit' }] : []);
  }
  const owner = candidatePath[0], stages = ['normalResolvedStyle', 'resolvedStyle', 'interactionResolvedStyle'].map(s => owner[s]);
  const actual = stages[0][property];
  for (const stage of stages) assert.equal(stage[property], actual);
  if (property === 'fontFamily' || property === 'color') {
    const ink = key.includes('@dark/') ? '#e6e1e5' : '#1d1b20';
    for (const node of candidatePath.filter(n => n.authored.type)) {
      assert.ok(!Object.keys(node.authored.style ?? {}).some(affects));
      assert.equal(node.authored.attributes?.style, undefined);
      const id = node.authored.id;
      const requests = a.rules.filter(rule => rootInitialSelectorCanApply(rule.selector, node.authored))
        .flatMap(rule => Object.entries(rule).filter(([key]) => affects(key))
          .map(([key, value]) => ({ selector: rule.selector, key, value })));
      const expected = property === 'fontFamily'
        ? id === 'page' ? [{ selector: '#page', key: property, value: 'Roboto, Arial, sans-serif' }]
          : node.authored.type === 'button' ? [{ selector: 'button, input, select', key: property, value: 'Roboto, Arial, sans-serif' }] : []
        : id === 'page' ? [{ selector: '#page', key: property, value: ink }]
          : id === 'bottom-sheet-panel' ? [{ selector: '.bottom-sheet-panel', key: property, value: ink }]
            : node.authored.type === 'button' ? ['.bottom-sheet-option', '.bottom-sheet-option:focus']
              .map(selector => ({ selector, key: property, value: ink })) : [];
      assert.deepEqual(requests, expected);
      for (const stage of ['normalResolvedStyle', 'resolvedStyle', 'interactionResolvedStyle'])
        assert.equal(node[stage]?.[property], expected.length ? expected[0].value : undefined);
    }
  }
  if (property === 'lineHeight' || property === 'letterSpacing') {
    for (const node of candidatePath) {
      assert.ok(!Object.keys(node.authored.style ?? {}).some(affects));
      const inlineText = node.authored.attributes?.style;
      assert.ok(inlineText === undefined || typeof inlineText === 'string' && !inlineText.includes('\\') &&
        !/(?:^|;)\s*(?:font(?:-[\w-]+)?|line-height|letter-spacing|all|animation[^:]*|transition[^:]*)\s*:/i.test(inlineText));
      for (const stage of ['normalResolvedStyle', 'resolvedStyle', 'interactionResolvedStyle'])
        assert.ok(!Object.keys(node[stage] ?? {}).some(affects));
      assert.ok(a.rules.filter(rule => rootInitialSelectorCanApply(rule.selector, node.authored))
        .every(rule => !Object.keys(rule).some(affects)));
    }
  }
  return { case: key, element, property, reference: computed, astylar: actual,
    referenceNode: referencePath[0].key, astylarNode: candidatePath[0].key,
    tokenOwner: referencePath[depth].key, token,
    classification: 'application-plugin-authoring-defect', inputEquivalent: false,
    renderingEquivalent: false };
}

export function proveDialogScalarTypographyJoin(row, proofs, inventory, caseKeys) {
  const allowed = {
    'dialog-copy': ['fontFamily', 'letterSpacing', 'color'],
    'dialog-cancel': ['fontFamily', 'letterSpacing'],
    'dialog-save': ['fontFamily', 'letterSpacing'],
    'dialog-title': ['fontFamily', 'color'],
  };
  const { element, property } = row, title = element === 'dialog-title';
  assert.equal(row.family, 'dialog'); assert.ok(allowed[element]?.includes(property));
  assert.equal(row.attribution, 'unresolved');
  assert.ok(caseKeys.length > 0); assert.equal(new Set(caseKeys).size, caseKeys.length);
  assert.equal(row.occurrences, caseKeys.length); assert.deepEqual(row.cases, caseKeys.slice(0, 12));
  assert.deepEqual(proofs.map(p => p.case), caseKeys);
  const attribution = !['dialog-copy', 'dialog-title'].includes(element) ? 'reviewed-dialog-action-typography-input'
    : property === 'color' ? 'reviewed-dialog-text-ink-input' : 'reviewed-dialog-text-metric-omission';
  for (const proof of proofs) {
    assert.equal(proof.family, 'dialog'); assert.equal(proof.attribution, attribution);
    assert.equal(proof.element, title ? 'dialog-title-label' : element); assert.equal(proof.property, property);
    assert.equal(proof.classification, 'application-plugin-authoring-defect');
    assert.equal(proof.inputEquivalent, false); assert.equal(proof.values.reference, row.reference);
    const entry = one(inventory.cases.filter(c => c.case === proof.case && c.side === 'astylar'));
    const node = one(inventory.variants[entry.variant].nodes.filter(n => n.authored?.id === element));
    const normal = inventory.styles[node.normalStyle].value, effective = inventory.styles[node.interactionStyle].value;
    const referenceOwner = element === 'dialog-copy' || title ? proof.reviewEvidence.referenceLeaf : proof.reviewEvidence.referenceChain[1];
    assert.equal(referenceOwner.attributes['data-parity-id'], element);
    if (title) {
      const [label, owner] = proof.reviewEvidence.candidateChain;
      assert.equal(label.authored.id, 'dialog-title-label'); assert.equal(label.authored.type, 'span');
      assert.equal(label.authored.textContent, 'Confirm action'); assert.equal(label.parent, owner.node);
      assert.equal(owner.node, node.key); assert.equal(owner.authored.type, 'h2');
      assert.equal(owner.authored.id, element); assert.equal(node.parent, owner.parent);
      for (const stage of ['normal', 'effective']) assert.equal(label[stage][property], undefined);
    } else if (element === 'dialog-copy') assert.equal(proof.reviewEvidence.candidateChain[0].node, node.key);
    else assert.ok(proof.reviewEvidence.structure.candidateActions.some(n => n.key === node.key));
    if (row.astylar === undefined) {
      assert.ok(['fontFamily', 'letterSpacing'].includes(property));
      for (const stage of [normal, effective]) assert.equal(Object.hasOwn(stage, property), false);
    } else {
      if (title) assert.equal(proof.values.retained, row.astylar);
      else { assert.equal(proof.values.normal, row.astylar); assert.equal(proof.values.effective, row.astylar); }
      for (const stage of [normal, effective]) assert.equal(stage[property], property === 'color'
        ? title ? '#1d1b20' : '#49454f' : 'Roboto, Arial, sans-serif');
    }
  }
  return { element, property, sourceAttribution: attribution, cases: [...caseKeys],
    classification: 'application-plugin-authoring-defect', inputEquivalent: false,
    renderingEquivalent: false };
}

// These are CSS-contract content intervals, not measured candidate layout.
// Equal outer heights do not make opposite-edge border/padding interchangeable.
export function proveDialogActionBoxSubstitution(entry, r, a) {
  assert.equal(entry.family, 'dialog');
  const { mapping } = proveModalPositionInspection(entry, r, a, 'dialog-actions');
  const reference = one(r.nodes.filter(n => n.key === mapping.referenceNode));
  const candidate = one(a.nodes.filter(n => n.key === mapping.candidateNode));
  assert.deepEqual(reference.inline, {});
  assert.equal(candidate.authored.style, undefined);
  assert.equal(candidate.authored.attributes?.style, undefined);
  const rule = one(reference.rules.map(i => r.rules[i]).filter(rule => rule.active));
  assert.equal(rule.selector, '.mat-mdc-dialog-actions');
  assert.deepEqual(rule.conditions, []);
  assert.ok(rule.cssText.includes('padding: var(--mat-dialog-actions-padding, 16px 24px);'));
  for (const [key, value] of Object.entries({ 'border-top-width': '1px', 'border-top-style': 'solid',
    'border-top-color': 'rgba(0, 0, 0, 0)', 'flex-wrap': 'wrap', 'flex-shrink': '0', 'min-height': '52px' }))
    assert.deepEqual(rule.declarations[key], { value, important: false });
  const native = r.styles[reference.style];
  const expectedNative = { height: '73px', boxSizing: 'border-box', paddingTop: '16px', paddingBottom: '16px',
    borderTopWidth: '1px', borderBottomWidth: '0px', borderTopStyle: 'solid',
    borderTopColor: 'rgba(0, 0, 0, 0)', flexWrap: 'wrap', flexShrink: '0', minHeight: '52px' };
  for (const [key, value] of Object.entries(expectedNative)) assert.equal(native[key], value);
  const affects = key => /^(padding|border|height|boxSizing|flexWrap|flexShrink|minHeight|all$|animation|transition)/.test(key);
  const requests = a.rules.filter(rule => rootInitialSelectorCanApply(rule.selector, candidate.authored))
    .flatMap(rule => Object.entries(rule).filter(([key]) => affects(key)).map(([key, value]) => ({ selector: rule.selector, key, value })));
  assert.deepEqual(requests, [
    { selector: '.dialog-actions', key: 'height', value: '73px' },
    { selector: '.dialog-actions', key: 'boxSizing', value: 'border-box' },
    { selector: '.dialog-actions', key: 'padding', value: '16px 24px 17px' },
  ]);
  for (const stage of ['normalResolvedStyle', 'resolvedStyle', 'interactionResolvedStyle']) {
    const style = candidate[stage];
    for (const [key, value] of Object.entries({ height: '73px', boxSizing: 'border-box', padding: '16px 24px 17px',
      borderWidth: '0', borderStyle: 'none', flexWrap: 'nowrap', flexShrink: '1' })) assert.equal(style[key], value);
    assert.equal(style.minHeight, undefined);
    for (const key of ['paddingTop', 'paddingBottom', 'borderTopWidth', 'borderBottomWidth', 'borderTopStyle'])
      assert.equal(style[key], undefined);
  }
  return { case: caseKey(entry, entry.kind), element: 'dialog-actions',
    referenceNode: reference.key, astylarNode: candidate.key,
    cssContract: { reference: { contentTop: 17, contentBottom: 57, contentHeight: 40 },
      astylar: { contentTop: 16, contentBottom: 56, contentHeight: 40 } },
    separateConstraintDifferences: { flexWrap: { reference: 'wrap', astylar: 'nowrap' },
      flexShrink: { reference: '0', astylar: '1' }, minHeight: { reference: '52px' } },
    classification: 'application-plugin-authoring-defect', inputEquivalent: false,
    candidateUsedLayoutMeasured: false, renderingEquivalent: false };
}

export function proveDialogPanelConstraints(entry, r, a) {
  assert.equal(entry.family, 'dialog');
  const { mapping } = proveModalPositionInspection(entry, r, a, 'dialog-panel');
  const reference = one(r.nodes.filter(n => n.key === mapping.referenceNode));
  const candidate = one(a.nodes.filter(n => n.key === mapping.candidateNode));
  assert.deepEqual(reference.inline, {});
  assert.equal(candidate.authored.style, undefined);
  assert.equal(candidate.authored.attributes?.style, undefined);
  const rules = reference.rules.map(i => r.rules[i]).filter(rule => rule.active);
  const rule = one(rules.filter(rule => rule.selector === '.mat-mdc-dialog-surface'));
  const expectedDeclarations = { width: '100%', height: '100%', 'min-width': 'inherit', 'max-width': 'inherit',
    'min-height': 'inherit', 'max-height': 'inherit', 'box-sizing': 'border-box', 'flex-shrink': '0' };
  for (const [key, value] of Object.entries(expectedDeclarations)) {
    const declarations = rules.filter(rule => Object.hasOwn(rule.declarations, key));
    assert.deepEqual(declarations, [rule]);
    assert.deepEqual(rule.declarations[key], { value, important: false });
  }
  assert.deepEqual(rule.conditions, []);
  const native = r.styles[reference.style];
  for (const [key, value] of Object.entries({ width: '280px', height: '161px', minWidth: '280px', maxWidth: '560px',
    minHeight: 'auto', maxHeight: '100%', boxSizing: 'border-box', flexShrink: '0' })) assert.equal(native[key], value);
  const affects = key => /^(width|height|minWidth|maxWidth|minHeight|maxHeight|boxSizing|flexShrink|flex$|all$|animation|transition)/.test(key);
  const requests = a.rules.filter(rule => rootInitialSelectorCanApply(rule.selector, candidate.authored))
    .flatMap(rule => Object.entries(rule).filter(([key]) => affects(key)).map(([key, value]) => ({ selector: rule.selector, key, value })));
  assert.deepEqual(requests, [{ selector: '.dialog-panel', key: 'width', value: '280px' },
    { selector: '.dialog-panel', key: 'height', value: '161px' }]);
  for (const stage of ['normalResolvedStyle', 'resolvedStyle', 'interactionResolvedStyle']) {
    assert.equal(candidate[stage].width, native.width); assert.equal(candidate[stage].height, native.height);
    assert.equal(candidate[stage].flexShrink, '1');
    for (const key of ['minWidth', 'maxWidth', 'minHeight', 'maxHeight', 'boxSizing'])
      assert.equal(Object.hasOwn(candidate[stage], key), false);
  }
  return { case: caseKey(entry, entry.kind), element: 'dialog-panel', referenceNode: reference.key, astylarNode: candidate.key,
    referenceRequests: expectedDeclarations, candidateRequests: { width: '280px', height: '161px' },
    classification: 'application-plugin-authoring-defect', inputEquivalent: false,
    candidateUsedLayoutMeasured: false, renderingEquivalent: false };
}

export function proveBottomSheetPanelConstraints(entry, r, a) {
  assert.equal(entry.family, 'bottom-sheet');
  const { mapping } = proveModalPositionInspection(entry, r, a, 'bottom-sheet-panel');
  const reference = one(r.nodes.filter(n => n.key === mapping.referenceNode));
  const candidate = one(a.nodes.filter(n => n.key === mapping.candidateNode));
  assert.deepEqual(reference.inline, {});
  assert.equal(candidate.authored.style, undefined);
  assert.equal(candidate.authored.attributes?.style, undefined);
  const compact = entry.viewport.id === 'comparison-pane-dpr1';
  assert.ok(compact || /^desktop-dpr[12]$/.test(entry.viewport.id));
  const affects = key => /^(?:width|height|minwidth|maxwidth|minheight|maxheight|boxsizing|overflow(?:x|y)?|all)$/.test(key.replaceAll('-', '').toLowerCase()) || /^(animation|transition)/i.test(key);
  const rules = reference.rules.map(i => r.rules[i]).filter(rule => rule.active);
  const requests = rules.flatMap(rule => Object.entries(rule.declarations).filter(([key]) => affects(key))
    .map(([key, value]) => ({ selector: rule.selector, conditions: rule.conditions, key, ...value })));
  const base = { 'min-width': '100vw', 'box-sizing': 'border-box', 'max-height': '80vh', 'overflow-x': 'auto', 'overflow-y': 'auto' };
  const large = { 'min-width': '512px', 'max-width': 'calc(-256px + 100vw)' };
  const declarations = (selector, values) => Object.entries(values).map(([key, value]) => ({ selector, conditions: [], key, value, important: false }));
  assert.deepEqual(requests, [...declarations('.mat-bottom-sheet-container', base),
    ...(compact ? [] : declarations('.mat-bottom-sheet-container-large', large))]);
  const candidateRequests = a.rules.filter(rule => rootInitialSelectorCanApply(rule.selector, candidate.authored))
    .flatMap(rule => Object.entries(rule).filter(([key]) => affects(key))
      .map(([key, value]) => ({ selector: rule.selector, ...(rule.mediaMaxWidth === undefined ? {} : { mediaMaxWidth: rule.mediaMaxWidth }), key, value })));
  assert.deepEqual(candidateRequests, [
    { selector: '.bottom-sheet-panel', key: 'width', value: '512px' },
    { selector: '.bottom-sheet-panel', key: 'height', value: '128px' },
    { selector: '.bottom-sheet-panel', mediaMaxWidth: '960px', key: 'width', value: '100%' },
  ]);
  const native = r.styles[reference.style];
  const values = { minWidth: compact ? '900px' : '512px', maxWidth: compact ? 'none' : '1184px',
    maxHeight: compact ? '640px' : '800px', boxSizing: 'border-box', overflowX: 'auto', overflowY: 'auto' };
  for (const [key, value] of Object.entries(values)) assert.equal(native[key], value);
  for (const stage of ['normalResolvedStyle', 'resolvedStyle', 'interactionResolvedStyle']) {
    assert.equal(candidate[stage].width, compact ? '100%' : '512px');
    assert.equal(candidate[stage].height, '128px');
    for (const key of [...Object.keys(values), 'overflow']) assert.equal(Object.hasOwn(candidate[stage], key), false);
  }
  return { case: caseKey(entry, entry.kind), element: 'bottom-sheet-panel', referenceNode: reference.key, astylarNode: candidate.key,
    referenceRequests: requests, candidateRequests, reference: values,
    omittedCandidateProperties: Object.keys(values),
    // The compact native max-width is an initial value, not an omitted explicit request.
    attributableProperties: Object.keys(values).filter(key => !compact || key !== 'maxWidth'),
    classification: 'application-plugin-authoring-defect', inputEquivalent: false,
    candidateUsedLayoutMeasured: false, renderingEquivalent: false };
}

export function proveBottomSheetPanelFlow(entry, r, a) {
  const constraints = proveBottomSheetPanelConstraints(entry, r, a);
  const reference = one(r.nodes.filter(n => n.key === constraints.referenceNode));
  const candidate = one(a.nodes.filter(n => n.key === constraints.astylarNode));
  const list = one(r.nodes.filter(n => n.parent === reference.key));
  assert.equal(list.type, 'mat-nav-list'); assert.deepEqual(list.inline, {});
  const anchors = r.nodes.filter(n => n.parent === list.key);
  assert.deepEqual(anchors.map(n => [n.type, n.attributes.href]), [['a', '#'], ['a', '#']]);
  const buttons = a.nodes.filter(n => n.parent === candidate.key);
  assert.deepEqual(buttons.map(n => [n.authored.type, n.authored.id, n.authored.value]),
    [['button', 'bottom-sheet-dismiss', 'Share'], ['button', 'bottom-sheet-copy', 'Copy link']]);
  const affects = key => /^(padding.*|display|flex(?:direction|flow)?|all)$/.test(key.replaceAll('-', '').toLowerCase()) || /^(animation|transition)/i.test(key);
  const requests = node => node.rules.map(i => r.rules[i]).filter(rule => rule.active)
    .flatMap(rule => Object.entries(rule.declarations).filter(([key]) => affects(key))
      .map(([key, value]) => ({ selector: rule.selector, conditions: rule.conditions, key, ...value })));
  const declaration = (selector, key, value) => ({ selector, conditions: [], key, value, important: false });
  const padding = (selector, horizontal) => ['top', 'right', 'bottom', 'left'].map((side, index) =>
    declaration(selector, 'padding-' + side, index % 2 ? horizontal : '8px'));
  const referenceRequests = requests(reference), listRequests = requests(list);
  assert.deepEqual(referenceRequests, [...padding('.mat-bottom-sheet-container', '16px'), declaration('.mat-bottom-sheet-container', 'display', 'block')]);
  assert.deepEqual(listRequests, [...padding('.mdc-list', '0px'), declaration('.mat-mdc-list-base', 'display', 'block')]);
  const candidateRequests = a.rules.filter(rule => rootInitialSelectorCanApply(rule.selector, candidate.authored))
    .flatMap(rule => Object.entries(rule).filter(([key]) => affects(key)).map(([key, value]) => ({ selector: rule.selector, key, value })));
  assert.deepEqual(candidateRequests, [
    { selector: '.bottom-sheet-panel', key: 'padding', value: '16px' },
    { selector: '.bottom-sheet-panel', key: 'display', value: 'flex' },
    { selector: '.bottom-sheet-panel', key: 'flexDirection', value: 'column' },
  ]);
  for (const node of [reference, list]) {
    const style = r.styles[node.style];
    assert.equal(style.display, 'block'); assert.equal(style.flexDirection, 'row');
    assert.equal(style.paddingTop, '8px'); assert.equal(style.paddingBottom, '8px');
  }
  for (const stage of ['normalResolvedStyle', 'resolvedStyle', 'interactionResolvedStyle']) {
    assert.equal(candidate[stage].display, 'flex'); assert.equal(candidate[stage].flexDirection, 'column');
    assert.equal(candidate[stage].padding, '16px');
    for (const key of ['paddingTop', 'paddingBottom', 'paddingBlock', 'paddingBlockStart', 'paddingBlockEnd'])
      assert.equal(Object.hasOwn(candidate[stage], key), false);
  }
  return { case: constraints.case, element: constraints.element, referenceNode: reference.key, astylarNode: candidate.key,
    referenceListNode: list.key, referenceRequests, listRequests, candidateRequests,
    referenceChildren: anchors.map(n => n.key), candidateChildren: buttons.map(n => n.key),
    nativeFlexDirectionIsInactive: true, classification: 'application-plugin-authoring-defect',
    inputEquivalent: false, candidateUsedLayoutMeasured: false, renderingEquivalent: false };
}

export function proveBottomSheetActionLayout(entry, r, a, element) {
  assert.equal(entry.family, 'bottom-sheet');
  assert.ok(['bottom-sheet-copy', 'bottom-sheet-dismiss'].includes(element));
  const { mapping } = proveModalPositionInspection(entry, r, a, element);
  const reference = one(r.nodes.filter(n => n.key === mapping.referenceNode));
  const candidate = one(a.nodes.filter(n => n.key === mapping.candidateNode));
  assert.equal(reference.type, 'a'); assert.equal(reference.attributes.href, '#');
  assert.equal(candidate.authored.type, 'button');
  assert.equal(candidate.authored.value, element === 'bottom-sheet-copy' ? 'Copy link' : 'Share');
  assert.deepEqual(reference.inline, {});
  assert.equal(candidate.authored.style, undefined);
  assert.equal(candidate.authored.attributes?.style, undefined);
  const children = r.nodes.filter(n => n.parent === reference.key);
  assert.deepEqual(children.map(n => n.type), ['span', 'div']);
  assert.deepEqual(a.nodes.filter(n => n.parent === candidate.key), []);
  const affects = key => /^(display|position|overflow.*|boxsizing|all)$/.test(key.replaceAll('-', '').toLowerCase()) || /^(animation|transition)/i.test(key);
  const referenceRequests = reference.rules.map(i => r.rules[i]).filter(rule => rule.active)
    .flatMap(rule => Object.entries(rule.declarations).filter(([key]) => affects(key))
      .map(([key, value]) => ({ selector: rule.selector, conditions: rule.conditions, key, ...value })));
  const expected = [
    ['.mdc-list-item', 'display', 'flex'], ['.mdc-list-item', 'position', 'relative'],
    ['.mdc-list-item', 'overflow-x', 'hidden'], ['.mdc-list-item', 'overflow-y', 'hidden'],
    ['.mat-mdc-list-item, .mat-mdc-list-option', 'box-sizing', 'border-box'],
  ].map(([selector, key, value]) => ({ selector, conditions: [], key, value, important: false }));
  assert.deepEqual(referenceRequests, expected);
  const candidateRequests = a.rules.filter(rule => rootInitialSelectorCanApply(rule.selector, candidate.authored))
    .flatMap(rule => Object.entries(rule).filter(([key]) => affects(key))
      .map(([key, value]) => ({ selector: rule.selector, key, value })));
  assert.deepEqual(candidateRequests, []);
  const values = { display: 'flex', position: 'relative', overflowX: 'hidden', overflowY: 'hidden', boxSizing: 'border-box' };
  for (const [key, value] of Object.entries(values)) assert.equal(r.styles[reference.style][key], value);
  for (const stage of ['normalResolvedStyle', 'resolvedStyle', 'interactionResolvedStyle']) {
    assert.equal(candidate[stage].display, 'block');
    for (const property of ['position', 'overflow', 'overflowX', 'overflowY', 'overflowInline', 'overflowBlock', 'boxSizing'])
      assert.equal(Object.hasOwn(candidate[stage], property), false);
  }
  return { case: caseKey(entry, entry.kind), element, referenceNode: reference.key, astylarNode: candidate.key,
    referenceRequests, candidateRequests, reference: values, candidate: { display: 'block' },
    referenceChildren: children.map(n => n.key), candidateChildren: [],
    attributableProperties: Object.keys(values), classification: 'application-plugin-authoring-defect',
    inputEquivalent: false, candidateUsedLayoutMeasured: false, renderingEquivalent: false,
    limitation: 'Native list-item requests are not authored on candidate value buttons. Missing candidate fields stay omitted; no browser defaults, core layout failure or equivalent child rendering is inferred.' };
}

export function proveBottomSheetActionCorners(entry, r, a, element) {
  assert.ok(['light', 'dark', 'contrast', 'custom'].includes(entry.profile));
  const layout = proveBottomSheetActionLayout(entry, r, a, element);
  const reference = one(r.nodes.filter(n => n.key === layout.referenceNode));
  const candidate = one(a.nodes.filter(n => n.key === layout.astylarNode));
  const affects = key => /^(border.*radius|all|animation.*|transition.*)$/.test(key.replaceAll('-', '').toLowerCase());
  const rules = reference.rules.map(i => r.rules[i]).filter(rule => rule.active);
  const tokens = [
    ['.mdc-list-item', 'var(--mat-list-list-item-container-shape, var(--mat-sys-corner-none))'],
    ['.mat-mdc-nav-list .mat-mdc-list-item', 'var(--mat-list-active-indicator-shape, var(--mat-sys-corner-full))'],
  ];
  const cssCorners = ['border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius'];
  const corners = ['borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomRightRadius', 'borderBottomLeftRadius'];
  const referenceRequests = rules.flatMap(rule => Object.entries(rule.declarations).filter(([key]) => affects(key))
    .map(([key, value]) => ({ selector: rule.selector, conditions: rule.conditions, key, ...value })));
  assert.deepEqual(referenceRequests, tokens.flatMap(([selector]) => cssCorners.map(key =>
    ({ selector, conditions: [], key, value: '', important: false }))));
  for (const [selector, token] of tokens) {
    const rule = one(rules.filter(rule => rule.selector === selector));
    assert.deepEqual(rule.cssText.split(';').map(s => s.trim()).filter(s => /^border.*radius\s*:/.test(s)),
      [`border-radius: ${token}`]);
  }
  const radius = ({ contrast: '18px', custom: '36px' }[entry.profile] ?? '24px');
  const candidateRequests = a.rules.filter(rule => rootInitialSelectorCanApply(rule.selector, candidate.authored))
    .flatMap(rule => Object.entries(rule).filter(([key]) => affects(key)).map(([key, value]) =>
      ({ selector: rule.selector, ...(rule.mediaMaxWidth === undefined ? {} : { mediaMaxWidth: rule.mediaMaxWidth }), key, value })));
  assert.deepEqual(candidateRequests, [{ selector: '.bottom-sheet-option', key: 'borderRadius', value: radius }]);
  for (const stage of ['normalResolvedStyle', 'resolvedStyle', 'interactionResolvedStyle']) {
    assert.equal(candidate[stage].borderRadius, radius);
    assert.equal(candidate[stage].height, '48px');
    for (const key of corners) assert.equal(Object.hasOwn(candidate[stage], key), false);
  }
  const native = r.styles[reference.style];
  assert.equal(native.height, '48px');
  assert.equal(native.width, entry.viewport.id === 'comparison-pane-dpr1' ? '868px' : '480px');
  for (const key of corners) assert.equal(native[key], '9999px');
  return { case: layout.case, element, referenceNode: reference.key, astylarNode: candidate.key,
    referenceRequests, radiusTokensFromCssText: tokens, candidateRequests,
    reference: Object.fromEntries(corners.map(key => [key, '9999px'])),
    candidate: Object.fromEntries(corners.map(key => [key, radius])),
    candidateUsedLayoutMeasured: false, renderingEquivalent: null,
    // This is a conditional CSS geometry statement, not a candidate layout measurement.
    sameShapeOnEqual48pxHighWideBoxes: radius !== '18px',
    attributableProperties: radius === '18px' ? corners : [],
    limitation: 'Full-round token versus scaled literal. Only contrast has an inequivalent corner request on equal 48px-high wide boxes. The 24px/36px cases require used-box and paint proof before equivalence is claimed; empty native CSSOM expansions are preserved, not interpreted as defaults.' };
}

export function proveBottomSheetPanelPaint(entry, r, a) {
  const { mapping } = proveModalPositionInspection(entry, r, a, 'bottom-sheet-panel');
  assert.equal(entry.family, 'bottom-sheet');
  assert.ok(['light', 'dark', 'contrast', 'custom'].includes(entry.profile));
  const reference = one(r.nodes.filter(n => n.key === mapping.referenceNode));
  const candidate = one(a.nodes.filter(n => n.key === mapping.candidateNode));
  assert.deepEqual(reference.inline, {});
  assert.equal(candidate.authored.style, undefined); assert.equal(candidate.authored.attributes?.style, undefined);
  const compact = entry.viewport.id === 'comparison-pane-dpr1';
  const affects = key => /^(background.*|border.*radius|all|animation.*|transition.*)$/.test(key.replaceAll('-', '').toLowerCase());
  const rules = reference.rules.map(i => r.rules[i]).filter(rule => rule.active);
  const base = one(rules.filter(rule => rule.selector === '.mat-bottom-sheet-container'));
  const backgroundToken = 'var(--mat-bottom-sheet-container-background-color, var(--mat-sys-surface-container-low))';
  assert.ok(base.cssText.includes('background: ' + backgroundToken + ';'));
  const requests = rules.flatMap(rule => Object.entries(rule.declarations).filter(([key]) => affects(key))
    .map(([key, value]) => ({ selector: rule.selector, conditions: rule.conditions, key, ...value })));
  const backgrounds = requests.filter(request => request.key.startsWith('background-'));
  assert.equal(backgrounds.length, 9);
  for (const request of backgrounds) {
    assert.equal(request.selector, '.mat-bottom-sheet-container'); assert.deepEqual(request.conditions, []);
    assert.equal(request.value, ''); assert.equal(request.important, false);
  }
  const shapeSelector = '.mat-bottom-sheet-container-xlarge, .mat-bottom-sheet-container-large, .mat-bottom-sheet-container-medium';
  assert.deepEqual(requests.filter(request => !request.key.startsWith('background-')), compact ? [] :
    ['border-top-left-radius', 'border-top-right-radius'].map(key => ({ selector: shapeSelector, conditions: [], key,
      value: 'var(--mat-bottom-sheet-container-shape, 28px)', important: false })));
  const radius = ({ contrast: '21px', custom: '42px' }[entry.profile] ?? '28px');
  const background = entry.profile === 'dark' ? '#211f26' : '#f8f2f6';
  const candidateRequests = a.rules.filter(rule => rootInitialSelectorCanApply(rule.selector, candidate.authored))
    .flatMap(rule => Object.entries(rule).filter(([key]) => affects(key)).map(([key, value]) =>
      ({ selector: rule.selector, ...(rule.mediaMaxWidth === undefined ? {} : { mediaMaxWidth: rule.mediaMaxWidth }), key, value })));
  assert.deepEqual(candidateRequests, [
    { selector: '.bottom-sheet-panel', key: 'borderRadius', value: `${radius} ${radius} 0 0` },
    { selector: '.bottom-sheet-panel', key: 'background', value: background },
    { selector: '.bottom-sheet-panel', mediaMaxWidth: '960px', key: 'borderRadius', value: '0' },
  ]);
  const native = r.styles[reference.style];
  assert.equal(native.backgroundColor, 'rgb(248, 242, 246)');
  for (const key of ['borderTopLeftRadius', 'borderTopRightRadius']) assert.equal(native[key], compact ? '0px' : '28px');
  for (const stage of ['normalResolvedStyle', 'resolvedStyle', 'interactionResolvedStyle']) {
    assert.equal(candidate[stage].background, background);
    assert.equal(candidate[stage].borderRadius, compact ? '0' : `${radius} ${radius} 0 0`);
    for (const key of ['backgroundColor', 'borderTopLeftRadius', 'borderTopRightRadius']) assert.equal(Object.hasOwn(candidate[stage], key), false);
  }
  return { case: caseKey(entry, entry.kind), element: 'bottom-sheet-panel', referenceNode: reference.key, astylarNode: candidate.key,
    referenceRequests: requests, backgroundTokenFromCssText: backgroundToken, candidateRequests,
    tokenAncestryReconstructed: false, classification: 'application-plugin-authoring-defect',
    inputEquivalent: false, renderingEquivalent: false,
    limitation: 'Original owner requests and observed styles only. Supplemental ancestor captures are not substituted for original interaction context. Empty CSSOM expansions are not resolved token values; no renderer paint cause is inferred.' };
}

function applyModalBoxReview(rows, cases, inventory, canonicalStyle, definition) {
  const properties = new Set(definition.properties);
  const proofs = new Map();
  return rows.map(row => {
    if (row.family !== (definition.family ?? 'dialog') || row.element !== definition.element || row.attribution !== 'unresolved' || !properties.has(row.property)) return row;
    const matching = cases.filter(c => c.family === row.family).flatMap(c => (c.styleInputs ?? [])
      .filter(i => i.id === row.element && canonicalStyle(i.reference ?? {})[row.property] === row.reference &&
        canonicalStyle(i.astylar ?? {})[row.property] === row.astylar)
      .map(i => { assert.equal(i.astylarResolvedStyleEvidenceVersion, 2); return c; }));
    const keys = matching.map(c => caseKey(c, c.kind));
    assert.ok(keys.length > 0); assert.equal(new Set(keys).size, keys.length);
    assert.equal(row.occurrences, keys.length); assert.deepEqual(row.cases, keys.slice(0, 12));
    const observations = matching.map((c, index) => {
      if (!proofs.has(keys[index])) {
        const trees = modalInventoryTrees(inventory, keys[index]);
        const proof = definition.prove(c, ...trees);
        const native = trees[0].nodes.find(n => n.key === proof.referenceNode);
        const candidate = trees[1].nodes.find(n => n.key === proof.astylarNode);
        proofs.set(keys[index], { proof, reference: canonicalStyle(trees[0].styles[native.style]),
          astylar: canonicalStyle(candidate.normalResolvedStyle) });
      }
      const result = proofs.get(keys[index]);
      if (result.proof.attributableProperties) assert.ok(result.proof.attributableProperties.includes(row.property));
      assert.equal(result.reference[row.property], row.reference);
      assert.equal(result.astylar[row.property], row.astylar);
      return result.proof;
    });
    const metadata = ['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases'];
    return { ...row, classification: 'application-plugin-authoring-defect', attribution: definition.attribution,
      recommendedOwner: definition.owner, justification: definition.justification,
      reviewedCases: keys, reviewEvidence: { originalRowSha256: hash(JSON.stringify(row)),
        priorMetadata: Object.fromEntries(metadata.filter(k => Object.hasOwn(row, k)).map(k => [k, structuredClone(row[k])])),
        observations, inputEquivalent: false, renderingEquivalent: false } };
  });
}

export function applyBottomSheetActionLayout(rows, cases, inventory, canonicalStyle) {
  return ['bottom-sheet-copy', 'bottom-sheet-dismiss'].reduce((values, element) =>
    applyModalBoxReview(values, cases, inventory, canonicalStyle, {
      family: 'bottom-sheet', element,
      properties: ['display', 'position', 'overflowX', 'overflowY', 'boxSizing'],
      prove: (entry, r, a) => proveBottomSheetActionLayout(entry, r, a, element),
      attribution: 'reviewed-bottom-sheet-action-layout-substitution',
      owner: 'showcase bottom-sheet list-item structure and layout authoring',
      justification: 'Native anchor list items explicitly request flex, relative positioning, hidden overflow and border-box sizing and contain span/div wrappers. Candidate childless value buttons omit those authored requests and retain block display. Complete original owner populations and all captured candidate stages establish unequal inputs, not defaults, measured candidate layout, equivalent semantics or a renderer failure.',
    }), rows);
}

export function applyBottomSheetContrastCorners(rows, cases, inventory, canonicalStyle) {
  // The other radii may be technically equivalent once normalized. Do not
  // classify them as authoring defects solely because their scalar values differ.
  const selected = rows.filter(row => row.family === 'bottom-sheet' && row.astylar === '18px' &&
    row.attribution === 'unresolved' && ['bottom-sheet-copy', 'bottom-sheet-dismiss'].includes(row.element) &&
    ['borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomRightRadius', 'borderBottomLeftRadius'].includes(row.property));
  const reviewed = ['bottom-sheet-copy', 'bottom-sheet-dismiss'].reduce((values, element) =>
    applyModalBoxReview(values, cases, inventory, canonicalStyle, {
      family: 'bottom-sheet', element,
      properties: ['borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomRightRadius', 'borderBottomLeftRadius'],
      prove: (entry, r, a) => proveBottomSheetActionCorners(entry, r, a, element),
      attribution: 'reviewed-bottom-sheet-contrast-corner-substitution',
      owner: 'showcase bottom-sheet action shape-token authoring',
      justification: 'Native actions request the full-round component token and compute 9999px corners at 48px height; contrast candidates author and retain 18px corners at that requested height. Even on equal 48px-high wide boxes these corner requests are not equivalent. Original owner requests and candidate stages establish input substitution, not measured candidate geometry or a renderer paint defect. Other profile radii are deliberately not classified by this proof.',
    }), selected);
  const byId = new Map(reviewed.map(row => [row.id, row]));
  return rows.map(row => byId.get(row.id) ?? row);
}

export function validateBottomSheetContrastCorners(rows, originalRows, cases, inventory, canonicalStyle) {
  try {
    const select = values => values.filter(r => r.attribution === 'reviewed-bottom-sheet-contrast-corner-substitution');
    assert.equal(JSON.stringify(select(rows)), JSON.stringify(select(applyBottomSheetContrastCorners(originalRows, cases, inventory, canonicalStyle))));
    return [];
  } catch (error) { return [`bottom-sheet contrast corners do not replay from original owner inputs: ${error.message}`]; }
}

export function validateBottomSheetActionLayout(rows, originalRows, cases, inventory, canonicalStyle) {
  try {
    const select = values => values.filter(r => r.attribution === 'reviewed-bottom-sheet-action-layout-substitution');
    assert.equal(JSON.stringify(select(rows)), JSON.stringify(select(applyBottomSheetActionLayout(originalRows, cases, inventory, canonicalStyle))));
    return [];
  } catch (error) { return [`bottom-sheet action layout does not replay from original owner inputs: ${error.message}`]; }
}

export function applyBottomSheetPanelPaint(rows, cases, inventory, canonicalStyle) {
  return applyModalBoxReview(rows, cases, inventory, canonicalStyle, {
    family: 'bottom-sheet', element: 'bottom-sheet-panel',
    properties: ['backgroundColor', 'borderTopLeftRadius', 'borderTopRightRadius'],
    prove: proveBottomSheetPanelPaint, attribution: 'reviewed-bottom-sheet-panel-paint-inputs',
    owner: 'reference and candidate bottom-sheet theme/token authoring contract',
    justification: 'Native component paint tokens and observed values differ from candidate theme-scaled corner radii and literal dark background. Original owner requests and all candidate stages bind the complete differing population. Empty expanded background CSSOM is preserved alongside its var expression; neither token ancestry nor a renderer paint fault is inferred. Restore equivalent component tokens and theme scope before evaluating rendering.',
  });
}

export function validateBottomSheetPanelPaint(rows, originalRows, cases, inventory, canonicalStyle) {
  try {
    const select = values => values.filter(r => r.attribution === 'reviewed-bottom-sheet-panel-paint-inputs');
    assert.equal(JSON.stringify(select(rows)), JSON.stringify(select(applyBottomSheetPanelPaint(originalRows, cases, inventory, canonicalStyle))));
    return [];
  } catch (error) { return [`bottom-sheet panel paint does not replay from original owner inputs: ${error.message}`]; }
}

export function applyBottomSheetPanelFlow(rows, cases, inventory, canonicalStyle) {
  return applyModalBoxReview(rows, cases, inventory, canonicalStyle, {
    family: 'bottom-sheet', element: 'bottom-sheet-panel',
    properties: ['display', 'flexDirection', 'paddingTop', 'paddingBottom'],
    prove: proveBottomSheetPanelFlow, attribution: 'reviewed-bottom-sheet-panel-flow-substitution',
    owner: 'showcase bottom-sheet list structure and padding ownership',
    justification: 'Native block panel and nested block navigation list each request 8px vertical padding; candidate column-flex panel requests 16px and directly contains two buttons instead of the list and anchor children. Native computed row direction is inactive, not a horizontal layout. Original declarations, child ownership and captured stages prove unequal inputs without certifying used placement, scrolling or semantic equivalence.',
  });
}

export function validateBottomSheetPanelFlow(rows, originalRows, cases, inventory, canonicalStyle) {
  try {
    const select = values => values.filter(r => r.attribution === 'reviewed-bottom-sheet-panel-flow-substitution');
    assert.equal(JSON.stringify(select(rows)), JSON.stringify(select(applyBottomSheetPanelFlow(originalRows, cases, inventory, canonicalStyle))));
    return [];
  } catch (error) { return [`bottom-sheet panel flow does not replay from original owner inputs: ${error.message}`]; }
}

export function applyBottomSheetPanelConstraints(rows, cases, inventory, canonicalStyle) {
  return applyModalBoxReview(rows, cases, inventory, canonicalStyle, {
    family: 'bottom-sheet', element: 'bottom-sheet-panel',
    properties: ['minWidth', 'maxWidth', 'maxHeight', 'boxSizing', 'overflowX', 'overflowY'],
    prove: proveBottomSheetPanelConstraints, attribution: 'reviewed-bottom-sheet-panel-constraint-omission',
    owner: 'showcase bottom-sheet responsive constraints and scrolling authoring',
    justification: 'Original native owner rules explicitly request responsive width constraints, 80vh max-height, border-box and automatic overflow. Candidate authoring substitutes fixed dimensions with a width-only breakpoint and omits those requests in all captured stages. Full population replay distinguishes these input omissions from renderer failure; it does not prove used layout or functional scrolling, and does not classify the compact initial max-width value.',
  });
}

export function validateBottomSheetPanelConstraints(rows, originalRows, cases, inventory, canonicalStyle) {
  try {
    const select = values => values.filter(r => r.attribution === 'reviewed-bottom-sheet-panel-constraint-omission');
    assert.equal(JSON.stringify(select(rows)), JSON.stringify(select(applyBottomSheetPanelConstraints(originalRows, cases, inventory, canonicalStyle))));
    return [];
  } catch (error) { return [`bottom-sheet panel constraints do not replay from original owner inputs: ${error.message}`]; }
}

export function applyDialogActionBox(rows, cases, inventory, canonicalStyle) {
  return applyModalBoxReview(rows, cases, inventory, canonicalStyle, {
    element: 'dialog-actions', properties: ['borderTopStyle', 'borderTopWidth', 'paddingBottom', 'flexWrap', 'flexShrink', 'minHeight'],
    prove: proveDialogActionBoxSubstitution, attribution: 'reviewed-dialog-action-box-substitution',
    owner: 'showcase dialog action box and flex constraints',
    justification: 'The original top border is replaced with bottom padding, preserving sampled height but shifting the CSS-contract content interval. Wrapping, shrink and minimum-height requests are also omitted. Original owner declarations and all captured candidate stages are checked; candidate used layout and renderer causality are not inferred.',
  });
}

export function applyDialogPanelConstraints(rows, cases, inventory, canonicalStyle) {
  return applyModalBoxReview(rows, cases, inventory, canonicalStyle, {
    element: 'dialog-panel', properties: ['minWidth', 'maxWidth', 'minHeight', 'maxHeight', 'boxSizing', 'flexShrink'],
    prove: proveDialogPanelConstraints, attribution: 'reviewed-dialog-panel-constraint-omission',
    owner: 'showcase dialog surface percentage sizing and inherited constraints',
    justification: 'The native surface explicitly inherits all four size constraints and requests border-box and zero shrink. Candidate authoring replaces percentage sizing with sampled dimensions, omits those constraints and retains default shrink one. Complete owner declarations and captured stages prove unequal requests; equal sampled dimensions do not establish responsive or rendered equivalence.',
  });
}

export function validateDialogPanelConstraints(rows, originalRows, cases, inventory, canonicalStyle) {
  try {
    const select = values => values.filter(r => r.attribution === 'reviewed-dialog-panel-constraint-omission');
    assert.equal(JSON.stringify(select(rows)), JSON.stringify(select(applyDialogPanelConstraints(originalRows, cases, inventory, canonicalStyle))));
    return [];
  } catch (error) { return [`dialog panel constraints do not replay from original owner inputs: ${error.message}`]; }
}

export function validateDialogActionBox(rows, originalRows, cases, inventory, canonicalStyle) {
  try {
    const select = values => values.filter(r => r.attribution === 'reviewed-dialog-action-box-substitution');
    assert.equal(JSON.stringify(select(rows)), JSON.stringify(select(applyDialogActionBox(originalRows, cases, inventory, canonicalStyle))));
    return [];
  } catch (error) { return [`dialog action box does not replay from original owner inputs: ${error.message}`]; }
}

export function applyDialogScalarTypography(rows, cases, inventory, retained, control, canonicalStyle) {
  const pairs = new Set(['dialog-copy/fontFamily', 'dialog-copy/letterSpacing', 'dialog-copy/color',
    'dialog-cancel/fontFamily', 'dialog-cancel/letterSpacing', 'dialog-save/fontFamily',
    'dialog-save/letterSpacing', 'dialog-title/fontFamily', 'dialog-title/color']);
  const metadata = ['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases'];
  return rows.map(row => {
    if (row.family !== 'dialog' || row.attribution !== 'unresolved' || !pairs.has(`${row.element}/${row.property}`)) return row;
    const matching = cases.filter(c => c.family === row.family).flatMap(c => (c.styleInputs ?? [])
      .filter(i => i.id === row.element && canonicalStyle(i.reference ?? {})[row.property] === row.reference &&
        canonicalStyle(i.astylar ?? {})[row.property] === row.astylar)
      .map(i => { assert.equal(i.astylarResolvedStyleEvidenceVersion, 2); return caseKey(c, c.kind); }));
    const proofElement = row.element === 'dialog-title' ? 'dialog-title-label' : row.element;
    const proofs = [...retained.differences, ...control.differences].filter(p =>
      p.family === row.family && p.element === proofElement && p.property === row.property && matching.includes(p.case));
    const joined = proveDialogScalarTypographyJoin(row, proofs, inventory, matching);
    return { ...row, classification: joined.classification, attribution: 'reviewed-dialog-scalar-typography-owner',
      recommendedOwner: 'showcase dialog component typography inputs',
      justification: 'The complete scalar population joins existing component-token authoring proofs at the same native owner and candidate declaration stage. Missing local declarations remain missing; inherited/retained values are not substituted into scalar inputs. No glyph or raster equivalence is inferred.',
      reviewedCases: matching,
      reviewEvidence: { sourceAttribution: joined.sourceAttribution,
        originalRowSha256: hash(JSON.stringify(row)), proofRowsSha256: hash(JSON.stringify(proofs)),
        priorMetadata: Object.fromEntries(metadata.filter(k => Object.hasOwn(row, k)).map(k => [k, structuredClone(row[k])])),
        observations: proofs.map(p => ({ case: p.case, element: p.element, property: p.property,
          referenceNode: p.referenceNode, astylarNode: p.astylarNode })),
        inputEquivalent: false, renderingEquivalent: false } };
  });
}

export function applyBottomSheetScalarTypography(rows, cases, inventory, canonicalStyle) {
  const trees = new Map();
  return rows.map(row => {
    if (row.family !== 'bottom-sheet' || row.attribution !== 'unresolved' ||
      !['bottom-sheet-panel', 'bottom-sheet-copy', 'bottom-sheet-dismiss'].includes(row.element) ||
      !['fontFamily', 'lineHeight', 'letterSpacing', 'color'].includes(row.property)) return row;
    const matching = cases.filter(c => c.family === row.family).flatMap(c => (c.styleInputs ?? [])
      .filter(i => i.id === row.element && canonicalStyle(i.reference ?? {})[row.property] === row.reference &&
        canonicalStyle(i.astylar ?? {})[row.property] === row.astylar)
      .map(i => { assert.equal(i.astylarResolvedStyleEvidenceVersion, 2); return c; }));
    const keys = matching.map(c => caseKey(c, c.kind));
    assert.ok(keys.length > 0); assert.equal(new Set(keys).size, keys.length);
    assert.equal(row.occurrences, keys.length); assert.deepEqual(row.cases, keys.slice(0, 12));
    const proofs = matching.map((c, index) => {
      if (!trees.has(keys[index])) trees.set(keys[index], modalInventoryTrees(inventory, keys[index]));
      const proof = proveBottomSheetScalarTypography(c, ...trees.get(keys[index]), row.element, row.property);
      assert.equal(canonicalStyle({ [row.property]: proof.reference })[row.property], row.reference);
      assert.equal(canonicalStyle(proof.astylar === undefined ? {} : { [row.property]: proof.astylar })[row.property], row.astylar);
      return proof;
    });
    const metadata = ['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases'];
    return { ...row, classification: 'application-plugin-authoring-defect',
      attribution: 'reviewed-bottom-sheet-scalar-typography-owner',
      recommendedOwner: 'showcase bottom-sheet container and option typography inputs',
      justification: 'Native container typography tokens propagate to item anchors, while candidate declarations omit metrics or substitute font/ink inputs. The complete scalar population is checked at its actual owner, not the inner list-label token scope. Missing declarations remain missing; rendering equivalence is not inferred.',
      reviewedCases: keys,
      reviewEvidence: { originalRowSha256: hash(JSON.stringify(row)),
        priorMetadata: Object.fromEntries(metadata.filter(k => Object.hasOwn(row, k)).map(k => [k, structuredClone(row[k])])),
        observations: proofs, inputEquivalent: false, renderingEquivalent: false } };
  });
}

export function validateBottomSheetScalarTypography(rows, originalRows, cases, inventory, canonicalStyle) {
  try {
    const select = values => values.filter(r => r.attribution === 'reviewed-bottom-sheet-scalar-typography-owner');
    const expected = select(applyBottomSheetScalarTypography(originalRows, cases, inventory, canonicalStyle));
    assert.equal(JSON.stringify(select(rows)), JSON.stringify(expected));
    return [];
  } catch (error) { return [`bottom-sheet scalar typography does not replay from original cases and owner declarations: ${error.message}`]; }
}

export function validateDialogScalarTypography(rows, originalRows, cases, inventory, retained, control, canonicalStyle) {
  try {
    const select = values => values.filter(r => r.attribution === 'reviewed-dialog-scalar-typography-owner');
    const expected = select(applyDialogScalarTypography(originalRows, cases, inventory, retained, control, canonicalStyle));
    // Original rows come from independent scalar replay, never from the saved
    // row's own priorMetadata. JSON comparison preserves omission on disk.
    assert.equal(JSON.stringify(select(rows)), JSON.stringify(expected));
    return [];
  } catch (error) { return [`dialog scalar typography does not replay from original cases and existing owner proofs: ${error.message}`]; }
}

export function proveModalPositionInspection(entry, r, a, id) {
  assert.ok(ids.includes(id));
  const input = one(entry.styleInputs.filter(i => i.id === id));
  const mapping = resolveOriginAliasPair(entry, r, a, input);
  assert.ok(['mapped', 'mapped-with-scalar-rule-gap'].includes(mapping.status), mapping.reason);
  const rn = one(r.nodes.filter(n => n.key === mapping.referenceNode));
  const an = one(a.nodes.filter(n => n.key === mapping.candidateNode));
  const rs = r.styles[rn.style];
  assert.equal(rs.position, id === 'dialog-copy' ? 'static' : 'relative');
  for (const stage of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle']) assert.ok(!Object.hasOwn(an[stage], 'position'));
  const properties = ['position', 'display', 'width', 'height', 'minWidth', 'maxWidth', 'minHeight', 'maxHeight',
    'boxSizing', 'padding', 'margin', 'fontSize', 'lineHeight', 'transform', 'borderRadius',
    'borderTopLeftRadius', 'overflow', 'overflowX', 'overflowY'];
  const project = style => Object.fromEntries(properties.map(p => [p,
    Object.hasOwn(style, p) ? { present: true, value: style[p] } : { present: false }]));
  return { element: id, mapping, reference: { type: rn.type, style: project(rs) },
    candidate: { type: an.authored.type, style: project(an.resolvedStyle) },
    classification: 'unresolved', inputEquivalenceProven: false, rendererCauseProven: false,
    remainingQuestion: 'Generated reference owner is mapped, but differing modal structure and sizing must be compared before position omission can be classified.' };
}
export function collectModalPositionInspection() {
  const file = 'docs/material-position-input-population.json', b = readFileSync(file);
  assert.equal(hash(b), '71ed7689534232fe8c167532455abbf9510e89ae69b4c918d9dc7f40d3d346ff');
  const captureFile = 'artifacts/material-parity/current-ancestry-audit/latest-report.json', source = readFileSync(captureFile);
  assert.equal(hash(source), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const capture = JSON.parse(source), entries = new Map();
  for (const [kind, list] of [['static', capture.results], ['interaction', capture.interactions]]) for (const e of list) {
    const key = caseKey(e, kind); assert.ok(!entries.has(key)); entries.set(key, e);
  }
  const groups = JSON.parse(b).groups.filter(g => ids.includes(g.element)); assert.deepEqual(groups.map(g => g.element), ids);
  const reviewed = groups.map(g => {
    const expected = g.family === 'dialog' ? 32 : 25;
    assert.equal(g.observations.length, expected); assert.equal(new Set(g.observations.map(o => o.case)).size, expected);
    return { element: g.element, priorRowSha256: g.priorRowSha256, observations: g.observations.map(o => {
      const entry = entries.get(o.case); assert.ok(entry);
      const trees = ['reference', 'astylar'].map(side => { const receipt = o.inputTrees[side], bytes = readFileSync(receipt.file);
        assert.equal(hash(bytes), receipt.sha256); return JSON.parse(bytes); });
      return { case: o.case, inputTrees: o.inputTrees, proof: proveModalPositionInspection(entry, ...trees, g.element) };
    }) };
  });
  return { schemaVersion: 1, kind: 'modal-position-inspection', population: { file, sha256: hash(b) },
    capture: { file: captureFile, sha256: hash(source) }, groups: reviewed,
    counts: { groups: 9, observations: 267 }, canonicalAttributionChanged: false };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const report = collectModalPositionInspection();
  writeFileSync('docs/material-modal-position-inspection.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report.counts));
}
