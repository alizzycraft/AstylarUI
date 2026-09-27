import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { modalInventoryTrees } from './modal-position-inspection.mjs';
import { resolveOriginAliasPair } from './origin-alias-mapping-evidence.mjs';
import { proveTabControlStage } from '../../scripts/audit-material-tab-position-substitution.mjs';

const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const one = values => { assert.equal(values.length, 1); return values[0]; };
const keyOf = e => `${e.kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`;
const targets = { tabs: ['tab-overview', 'tab-activity'], card: ['card-open', 'card-primary'], dialog: ['dialog-cancel'],
  toolbar: ['toolbar-action'], 'grid-list': ['grid-tile-one', 'grid-tile-two'], 'button-toggle': ['button-toggle-primary'] };
export const controlStatePaintAttribution = 'reviewed-control-state-layer-substitution';
export const cardSurfacePaintAttribution = 'reviewed-card-surface-token-substitution';
export const opaqueSurfacePaintAttribution = 'reviewed-opaque-surface-fill-substitution';

export function proveControlStatePaint(entry, input, reference, candidate, normalize) {
  assert.ok(targets[entry.family]?.includes(input.id));
  const ast = one(candidate.nodes.filter(n => n.authored?.id === input.id));
  let native, identity;
  if (input.id === 'dialog-cancel') {
    identity = resolveOriginAliasPair(entry, reference, candidate, input);
    assert.equal(identity.status, 'mapped'); assert.deepEqual(identity.missingRules, []); assert.deepEqual(identity.extraRules, []);
    native = one(reference.nodes.filter(n => n.key === identity.referenceNode));
  } else native = one(reference.nodes.filter(n => n.attributes?.id === input.id));
  for (const [key, value] of Object.entries(input.reference)) assert.equal(reference.styles[native.style][key], value);
  for (const [stage, scalar] of [['resolvedStyle', 'astylar'], ['normalResolvedStyle', 'astylarNormalResolvedStyle'],
    ['interactionResolvedStyle', 'astylarInteractionResolvedStyle']]) assert.deepEqual(ast[stage], input[scalar]);
  const candidateAuthoredRuleProjectionGaps = [];
  for (const rule of input.astylarAuthored) {
    const original = candidate.rules[rule.index]; assert.equal(original.selector, rule.selector);
    for (const [key, value] of Object.entries(rule.declarations)) assert.deepEqual(original[key], value);
    const extra = Object.fromEntries(Object.entries(original).filter(([key]) => key !== 'selector' && !Object.hasOwn(rule.declarations, key)));
    if (Object.keys(extra).length) {
      assert.equal(input.id, 'toolbar-action'); assert.equal(rule.declarations.width, '64px');
      assert.deepEqual(extra, { mediaMaxWidth: '500px' });
      candidateAuthoredRuleProjectionGaps.push({ index: rule.index, extra });
    }
  }
  const base = { case: keyOf(entry), element: input.id, referenceNode: native.key, astylarNode: ast.key,
    identity, candidateAuthoredRuleProjectionGaps, inputEquivalent: false, renderingEquivalent: false, rendererCauseProven: false };
  if (['grid-list', 'button-toggle'].includes(entry.family)) {
    assert.equal(native.type, entry.family === 'grid-list' ? 'mat-grid-tile' : 'mat-button-toggle-group');
    assert.equal(ast.authored.type, 'div');
    assert.equal(reference.styles[native.style].backgroundColor, 'rgba(0, 0, 0, 0)');
    const affects = key => /^(background($|-)|all$|animation($|-)|transition($|-))/.test(key);
    assert.deepEqual(Object.keys(native.inline ?? {}).filter(affects), []);
    for (const index of native.rules) assert.deepEqual(Object.keys(reference.rules[index].declarations).filter(affects), []);
    const requests = input.astylarAuthored.filter(rule => Object.hasOwn(rule.declarations, 'background'));
    assert.equal(requests.length, 1);
    assert.equal(requests[0].selector, entry.family === 'grid-list' ? '.grid-tile' : '#button-toggle-primary');
    assert.ok(['#f6f1f9', '#27252c', '#f0f0f0', '#e5f2f1'].includes(requests[0].declarations.background));
    for (const stage of ['normalResolvedStyle', 'resolvedStyle', 'interactionResolvedStyle'])
      assert.equal(normalize(ast[stage]).backgroundColor, normalize(requests[0].declarations).backgroundColor);
    return { ...base, candidatePaintRequest: requests[0], nativeOwnPaintRequestAbsent: true,
      compensationIntentProven: false };
  }
  if (input.id === 'card-primary') {
    assert.equal(entry.profile, 'dark');
    const rule = one(native.rules.map(i => reference.rules[i]).filter(r => r.selector === '.mat-mdc-card'));
    assert.equal(rule.declarations['background-color'].value,
      'var(--mat-card-elevated-container-color, var(--mat-sys-surface-container-low))');
    assert.equal(reference.styles[native.style].backgroundColor, 'rgb(248, 242, 246)');
    const authored = one(candidate.rules.filter(r => r.selector === '.material-card'));
    assert.equal(authored.background, '#fff7ff');
    for (const stage of ['normalResolvedStyle', 'resolvedStyle', 'interactionResolvedStyle'])
      assert.equal(normalize(ast[stage]).backgroundColor, normalize(authored).backgroundColor);
    return { ...base, nativeRule: rule, candidateRule: authored, tokenAncestryReconstructed: false };
  }
  let host = native;
  if (entry.family === 'tabs') {
    identity = proveTabControlStage(reference, candidate, input.id);
    host = one(reference.nodes.filter(n => n.key === identity.referenceControl));
  }
  const layerClass = entry.family === 'tabs' ? 'mdc-tab__ripple' : 'mat-mdc-button-persistent-ripple';
  const layer = one(reference.nodes.filter(n => n.parent === host.key && n.attributes?.class?.split(/\s+/).includes(layerClass)));
  const pseudo = one(layer.pseudoElements.filter(p => p.pseudo === '::before'));
  assert.equal(pseudo.generated, true);
  const paint = reference.styles[pseudo.style];
  assert.ok((entry.family === 'tabs' ? ['0', '0.04', '0.12'] : ['0.08', '0.12']).includes(paint.opacity));
  assert.equal(reference.styles[native.style].backgroundColor, 'rgba(0, 0, 0, 0)');
  assert.equal(reference.styles[host.style].backgroundColor, 'rgba(0, 0, 0, 0)');
  assert.equal(ast.normalResolvedStyle.background, 'transparent');
  assert.equal(candidate.nodes.filter(n => n.key.startsWith(ast.key + '/')).length, 0);
  const selector = entry.family === 'tabs' ? '.tab' : entry.family === 'card' ? '.text-button'
    : entry.family === 'toolbar' ? '#toolbar-action' : '.dialog-action';
  const effective = normalize(ast.resolvedStyle).backgroundColor;
  assert.notEqual(effective, normalize(ast.normalResolvedStyle).backgroundColor);
  assert.equal(effective, normalize(ast.interactionResolvedStyle).backgroundColor);
  const rules = candidate.rules.filter(r => ['hover', 'active', 'focus'].some(state => r.selector === `${selector}:${state}`));
  const matching = rules.filter(r => normalize(r).backgroundColor === effective);
  if (matching.length === 2) {
    assert.equal(entry.family, 'toolbar');
    assert.deepEqual(matching.map(r => r.selector), ['#toolbar-action:hover', '#toolbar-action:active']);
  } else assert.equal(matching.length, 1);
  return { ...base, identity, nativeHost: host.key, nativeLayer: layer.key, nativeLayerOpacity: paint.opacity,
    nativeLayerBackground: paint.backgroundColor, nativePseudoRules: pseudo.rules.map(i => reference.rules[i]),
    candidateMatchedStateRules: matching, candidateStateRules: rules,
    measuredNativeOwnerIsTextLabel: entry.family === 'tabs', stateTimingInferred: false };
}

export function applyControlStatePaintReview(rows, cases, inventory, normalize) {
  const proofs = new Map();
  return rows.map(row => {
    if (row.attribution !== 'unresolved' || row.property !== 'backgroundColor' || !targets[row.family]?.includes(row.element)) return row;
    const members = cases.filter(e => e.family === row.family && e.styleInputs.some(i => i.id === row.element &&
      normalize(i.reference).backgroundColor === row.reference && normalize(i.astylar).backgroundColor === row.astylar));
    const keys = members.map(keyOf);
    assert.equal(keys.length, row.occurrences); assert.equal(new Set(keys).size, keys.length);
    assert.deepEqual(keys.slice(0, 12), row.cases); assert.deepEqual([...new Set(members.map(e => e.state ?? 'static'))], row.states);
    const observations = members.map(entry => {
      const key = JSON.stringify([keyOf(entry), row.element]);
      if (!proofs.has(key)) proofs.set(key, proveControlStatePaint(entry, entry.styleInputs.find(i => i.id === row.element),
        ...modalInventoryTrees(inventory, keyOf(entry)), normalize));
      return proofs.get(key);
    });
    const surface = row.element === 'card-primary', opaque = ['grid-list', 'button-toggle'].includes(row.family);
    return { ...row, classification: 'application-plugin-authoring-defect',
      attribution: surface ? cardSurfacePaintAttribution : opaque ? opaqueSurfacePaintAttribution : controlStatePaintAttribution,
      recommendedOwner: 'Material comparison paint authoring; retain tab measurement-owner distinction',
      justification: surface
        ? 'The captured dark card resolves the native surface token to a different color than the candidate fixed surface request. These authored inputs already differ; token ancestry, compensation intent and renderer causation are not inferred.'
        : opaque ? 'The native owner has no own background/reset/motion request and computes transparent; the candidate explicitly requests an opaque surface fill at every captured stage. This is unequal authoring before paint, not a proved renderer conversion defect or historical compensation intent.'
        : 'A separate native translucent state layer is replaced by a childless candidate control with opaque state fill. Tabs additionally compare native label IDs with candidate control IDs. Preserve both differences, captured layer opacity and the matching authored state rule; do not infer focus timing or final pixel equivalence.',
      reviewedCases: keys, reviewEvidence: { originalRowSha256: digest(row), observations,
        inputEquivalent: false, renderingEquivalent: false, rendererCauseProven: false } };
  });
}
