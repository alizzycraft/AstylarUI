import assert from 'node:assert/strict';
import { rootInitialSelectorCanApply } from './root-initial-style-evidence.mjs';
import { applyModalBoxReview } from './modal-position-inspection.mjs';
import { proveTabControlStage } from '../../scripts/audit-material-tab-position-substitution.mjs';

const owners = {
  icon: ['icon-primary', 'mat-icon', 'img'],
  slider: ['slider-visual', 'mat-slider', 'showcase.material:range-visual'],
  tabs: ['tab-panel', 'span', 'showcase.material:tab-panel'],
  table: ['table-primary', 'table', 'table'],
  divider: ['divider-primary', 'mat-divider', 'div'],
  'progress-bar': ['progress-bar-primary', 'mat-progress-bar', 'showcase.material:linear-progress'],
  'progress-spinner': ['progress-spinner-primary', 'mat-progress-spinner', 'showcase.material:circular-progress'],
};
const relevant = k => /^(border|all$|animation|transition)/.test(k.replaceAll('-', '').toLowerCase());
const sides = ['Top', 'Right', 'Bottom', 'Left'];

// Explicit host pairs, not a widening of ordinary-element or native-control
// assumptions. No claims about a plugin's generated children or painted output.
export function proveCustomOwnerBorder(entry, reference, candidate, normalize, element) {
  const tabControl = entry.family === 'tabs' && ['tab-overview', 'tab-activity'].includes(element);
  const [id, nativeType, candidateType] = tabControl ? [element, 'span', 'button'] : owners[entry.family];
  const inputs = entry.styleInputs.filter(i => i.id === id); assert.equal(inputs.length, 1);
  const input = inputs[0];
  const rs = reference.nodes.filter(n => n.attributes?.['data-parity-id'] === id || n.attributes?.id === id);
  const as = candidate.nodes.filter(n => n.authored?.id === id);
  assert.equal(rs.length, 1); assert.equal(as.length, 1);
  const r = rs[0], a = as[0];
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
    assert.deepEqual(border, { borderWidth: '0', borderStyle: 'none', borderColor: 'transparent', borderRadius: '0' });
    const normalized = normalize(stage);
    for (const side of sides) assert.equal(normalized[`border${side}Color`], 'rgba(0,0,0,0)');
  }
  return { referenceNode: r.key, astylarNode: a.key, nativeType, candidateType,
    nativeRules, candidateRules: ownRules, candidateRequests, referenceColor: native.color,
    ...(composition ? { composition } : {}),
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

export function applyCustomOwnerBorderReviews(rows, cases, inventory, normalize) {
  for (const [family, [element]] of Object.entries(owners)) rows = applyModalBoxReview(rows, cases, inventory, normalize, {
    family, element, properties: (family === 'divider' ? sides.slice(1) : sides).map(s => `border${s}Color`),
    classification: family === 'table' ? 'application-plugin-authoring-defect' : 'intentional-documented-limitation',
    attribution: family === 'table' ? 'reviewed-table-border-reset-omission' : 'reviewed-custom-host-border-initial-divergence',
    owner: 'core border initial-color contract and measured host identity',
    prove: (e, r, a) => proveCustomOwnerBorder(e, r, a, normalize),
    justification: family.startsWith('progress-')
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
