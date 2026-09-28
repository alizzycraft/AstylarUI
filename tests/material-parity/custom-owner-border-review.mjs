import assert from 'node:assert/strict';
import { rootInitialSelectorCanApply } from './root-initial-style-evidence.mjs';
import { applyModalBoxReview } from './modal-position-inspection.mjs';

const owners = {
  icon: ['icon-primary', 'mat-icon', 'img'],
  slider: ['slider-visual', 'mat-slider', 'showcase.material:range-visual'],
  tabs: ['tab-panel', 'span', 'showcase.material:tab-panel'],
  table: ['table-primary', 'table', 'table'],
};
const relevant = k => /^(border|all$|animation|transition)/.test(k.replaceAll('-', '').toLowerCase());
const sides = ['Top', 'Right', 'Bottom', 'Left'];

// Explicit host pairs, not a widening of ordinary-element or native-control
// assumptions. No claims about a plugin's generated children or painted output.
export function proveCustomOwnerBorder(entry, reference, candidate, normalize) {
  const [id, nativeType, candidateType] = owners[entry.family];
  const inputs = entry.styleInputs.filter(i => i.id === id); assert.equal(inputs.length, 1);
  const input = inputs[0];
  const rs = reference.nodes.filter(n => n.attributes?.['data-parity-id'] === id || n.attributes?.id === id);
  const as = candidate.nodes.filter(n => n.authored?.id === id);
  assert.equal(rs.length, 1); assert.equal(as.length, 1);
  const r = rs[0], a = as[0];
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
  } else assert.ok(nativeRules.every(rule => !Object.keys(rule.declarations).some(relevant)));
  assert.equal(a.authored.attributes?.style, undefined);
  assert.ok(!Object.keys(a.authored.style ?? {}).some(relevant));
  assert.ok(candidate.rules.every(rule => Object.values(rule).every(v => v === null || typeof v !== 'object')));
  const ownRules = candidate.rules.filter(rule => rootInitialSelectorCanApply(rule.selector, a.authored));
  const candidateRequests = ownRules.flatMap(rule => Object.entries(rule).filter(([k]) => relevant(k))
    .map(([property, value]) => ({ selector: rule.selector, property, value })));
  assert.deepEqual(candidateRequests, entry.family === 'table'
    ? [{ selector: '.material-table', property: 'borderWidth', value: '0' }] : []);
  const native = normalize(input.reference);
  assert.match(native.color, /^rgba\(\d+,\d+,\d+,1\)$/);
  for (const side of sides) {
    assert.equal(native[`border${side}Color`], native.color);
    assert.equal(native[`border${side}Width`], '0'); assert.equal(native[`border${side}Style`], 'none');
  }
  for (const stage of [a.resolvedStyle, a.normalResolvedStyle, a.interactionResolvedStyle]) {
    const border = Object.fromEntries(Object.entries(stage).filter(([k]) => relevant(k)));
    assert.deepEqual(border, { borderWidth: '0', borderStyle: 'none', borderColor: 'transparent', borderRadius: '0' });
    const normalized = normalize(stage);
    for (const side of sides) assert.equal(normalized[`border${side}Color`], 'rgba(0,0,0,0)');
  }
  return { referenceNode: r.key, astylarNode: a.key, nativeType, candidateType,
    nativeRules, candidateRules: ownRules, candidateRequests, referenceColor: native.color,
    inputEquivalent: false, renderingEquivalent: false, generatedChildPaintVerified: false,
    scope: 'Captured host-only initial border color; zero/none borders do not establish contextual-color paint equivalence.' };
}

export function applyCustomOwnerBorderReviews(rows, cases, inventory, normalize) {
  for (const [family, [element]] of Object.entries(owners)) rows = applyModalBoxReview(rows, cases, inventory, normalize, {
    family, element, properties: sides.map(s => `border${s}Color`),
    classification: family === 'table' ? 'application-plugin-authoring-defect' : 'intentional-documented-limitation',
    attribution: family === 'table' ? 'reviewed-table-border-reset-omission' : 'reviewed-custom-host-border-initial-divergence',
    owner: 'core border initial-color contract and measured host identity',
    prove: (e, r, a) => proveCustomOwnerBorder(e, r, a, normalize),
    justification: family === 'table'
      ? 'The native table explicitly requests border: 0px, including none styles and currentcolor colors; the candidate authors only borderWidth: 0. All three candidate stages retain transparent defaults. This is an unequal reset request at authoring, despite both captured hosts having invisible zero/none borders. Do not copy computed theme colors as compensation. Table cells, collapsed-border behavior, inherited ink and final raster remain separate.'
      : 'Authenticated native/custom host pairs omit authored border and motion requests locally. Native zero/none borders compute their color from currentcolor; all three candidate host stages expose transparent initial borders. This extends the existing initial-color limitation to explicit host pairs, not generated icon/plugin children. Structure, inherited ink, future visible borders and final raster remain separate; no compensation or rendering equivalence is approved.',
  });
  return rows;
}
