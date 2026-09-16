import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';
import { collectFieldHostTypographyInputs } from './field-host-typography-evidence.mjs';
import { rootInitialSelectorCanApply } from './root-initial-style-evidence.mjs';

export const fieldHostLayoutProperties = Object.freeze([
  'display', 'flexDirection', 'position', 'width', 'height', 'minWidth', 'boxSizing', 'alignSelf',
]);
export const fieldHostLayoutCaseKey = e => `${e.kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? `/${e.state}` : ''}`;
const omitted = '<omitted>';
const value = (s, p) => Object.hasOwn(s, p) ? s[p] : omitted;
const normalized = p => p.replaceAll('-', '').toLowerCase();
const relevant = p => /^(?:display|position|width|height|minwidth|maxwidth|minheight|maxheight|boxsizing|alignself|flex.*|inset.*|top|right|bottom|left|.*size|all|animation.*|transition.*)$/.test(normalized(p));
const project = s => Object.fromEntries(Object.entries(s).filter(([p]) => relevant(p)));
const canonicalFont = s => ({ ...s, fontFamily: s.fontFamily?.toLowerCase().replaceAll(' ', '').replaceAll('"', '') });
const cssValue = v => ({ value: v, important: false });

// A strict original-capture survey, not a CSS resolver or canonical classifier.
// The reused mapping proves identity/ancestry; layout requests are checked here
// independently rather than inferred from the earlier typography findings.
export function inspectFieldHostLayout(base, input) {
  assert.equal(base.property, 'fontFamily');
  assert.equal(input.id, base.element);
  assert.equal(input.referenceStructure?.schemaVersion, 2);
  assert.equal(input.astylarStructure?.schemaVersion, 2);
  assert.equal(input.referenceStructure.type, 'mat-form-field');
  assert.equal(input.astylarStructure.type, 'div');
  assert.equal(input.astylarResolvedStyleEvidenceVersion, 2);
  const ref = base.referencePath[2], ast = base.candidatePath[2];
  assert.deepEqual(project(ref.inline), {}, 'unexpected reference inline layout request');
  assert.deepEqual(project(ast.authored.style ?? {}), {}, 'unexpected candidate inline layout request');
  assert.equal(ref.attributes.style, undefined, 'raw reference inline style requires separate review');
  assert.equal(ast.authored.attributes?.style, undefined, 'raw candidate inline style requires separate review');
  const refRules = ref.rules.filter(r => Object.keys(r.declarations).some(relevant));
  assert.equal(refRules.length, 2, 'reference layout cascade changed');
  assert.ok(ref.rules.every(r => r.active === true && Array.isArray(r.conditions)));
  const widthRule = refRules.find(r => /^mat-slider\[_ngcontent-[\w-]+\], mat-form-field\[_ngcontent-[\w-]+\], table\[_ngcontent-[\w-]+\]$/.test(r.selector));
  assert.ok(widthRule, 'missing authored reference percentage-width rule');
  assert.deepEqual(project(widthRule.declarations), { width: cssValue('100%') });
  const materialRule = refRules.find(r => r.selector === '.mat-mdc-form-field');
  assert.ok(materialRule);
  // font-size is captured but not part of this layout declaration comparison.
  const materialLayout = project(materialRule.declarations);
  delete materialLayout['font-size'];
  assert.deepEqual(materialLayout, { display: cssValue('inline-flex'), 'flex-direction': cssValue('column'), 'min-width': cssValue('0px') });
  const astRules = ast.rules.filter(r => Object.keys(r.declarations).some(p => relevant(p) && p !== 'fontSize'));
  assert.equal(astRules.length, 1, 'candidate layout cascade changed');
  assert.equal(astRules[0].selector, '.field-shell');
  const height = astRules[0].declarations.height;
  assert.ok(['78px', '62px', '70px'].includes(height));
  const candidateRequests = { position: 'relative', width: '100%', height, alignSelf: 'flex-start', boxSizing: 'border-box' };
  assert.deepEqual(project(astRules[0].declarations), candidateRequests);
  const refAuthored = input.referenceAuthored.map(r => ({ selector: r.selector, declarations: r.declarations }));
  assert.ok(input.referenceAuthored.every(r => r.active === undefined || r.active === true));
  assert.deepEqual(refAuthored, ref.rules.map(r => ({ selector: r.selector, declarations: r.declarations })), 'scalar reference rules disagree with tree');
  assert.deepEqual(input.astylarAuthored.map(r => ({ selector: r.selector, declarations: r.declarations })), ast.rules, 'scalar candidate rules disagree with tree');
  assert.ok(isDeepStrictEqual(input.reference, Object.fromEntries(Object.entries(ref.computed).filter(([p]) => Object.hasOwn(input.reference, p)))), 'scalar reference values disagree with tree');
  for (const p of fieldHostLayoutProperties) assert.equal(input.reference[p], ref.computed[p], `missing/mismatched scalar ${p}`);
  for (const [scalar, tree] of [['astylar', 'comparison'], ['astylarNormalResolvedStyle', 'normal'], ['astylarInteractionResolvedStyle', 'effective']]) {
    assert.deepEqual(input[scalar], ast[tree], `${scalar} disagrees with original tree`);
    assert.equal(ast[tree].display, 'block');
    assert.equal(ast[tree].flexDirection, 'row');
    assert.equal(ast[tree].flexShrink, '1');
    assert.equal(ast[tree].flexBasis, 'auto');
    assert.equal(ast[tree].minWidth, undefined);
    for (const [p, v] of Object.entries(candidateRequests)) assert.equal(ast[tree][p], v);
  }
  const referenceValues = { display: 'inline-flex', flexDirection: 'column', position: 'static', minWidth: '0px', boxSizing: 'content-box', alignSelf: 'auto' };
  for (const [p, v] of Object.entries(referenceValues)) assert.equal(ref.computed[p], v);
  assert.ok(['720px', '638px', '260px'].includes(ref.computed.width));
  assert.equal(ref.computed.height, ({ '78px': '76px', '62px': '56px', '70px': '68px' })[height]);
  const referenceRequests = { display: 'inline-flex', flexDirection: 'column', minWidth: '0px', width: '100%' };
  return fieldHostLayoutProperties.map(property => ({ property,
    referenceAuthored: value(referenceRequests, property), candidateAuthored: value(candidateRequests, property),
    referenceComputed: value(ref.computed, property),
    candidateNormal: value(ast.normal, property), candidateComparison: value(ast.comparison, property), candidateEffective: value(ast.effective, property),
    classification: property === 'width' ? 'harness-instrumentation-defect' : 'application-plugin-authoring-defect',
    disposition: property === 'width' ? 'same-percentage-request-compared-at-different-stages' : 'different-host-layout-request',
    inputEquivalent: false, computedCandidateVerified: false, rendererCauseProven: false,
  }));
}

export function collectFieldHostLayoutInputs(inventory, entries) {
  assert.deepEqual(inventory.errors, []);
  const indexed = new Map(entries.map(e => [fieldHostLayoutCaseKey(e), e]));
  assert.equal(indexed.size, entries.length, 'duplicate original case');
  const bases = collectFieldHostTypographyInputs(inventory, canonicalFont, rootInitialSelectorCanApply).filter(p => p.property === 'fontFamily');
  assert.deepEqual(bases.map(b => b.case).sort(), [...indexed.keys()].sort(), 'every original field-host case must be mapped');
  const style = (i, side) => { assert.equal(inventory.styles[i]?.side, side); return inventory.styles[i].value; };
  return bases.map(base => {
    const entry = indexed.get(base.case), inputs = entry.styleInputs.filter(i => i.id === base.element);
    assert.equal(inputs.length, 1);
    const properties = inspectFieldHostLayout(base, inputs[0]);
    const children = {};
    for (const side of ['reference', 'astylar']) {
      const c = inventory.cases.filter(c => c.case === base.case && c.side === side);
      assert.equal(c.length, 1);
      const nodes = inventory.variants[c[0].variant].nodes;
      const parent = side === 'reference' ? base.referencePath[2].key : base.candidatePath[2].key;
      children[side] = nodes.filter(n => n.parent === parent).map(n => ({ key: n.key, parent: n.parent,
        ...(side === 'reference' ? { type: n.type, attributes: n.attributes, computed: style(n.style, side) }
          : { authored: n.authored, normal: style(n.normalStyle, side), comparison: style(n.style, side), effective: style(n.interactionStyle, side) }) }));
      assert.ok(children[side].length >= 2, 'missing host child evidence');
    }
    const measured = entry.geometry?.elements?.filter(g => g.id === base.element) ?? [];
    assert.ok(measured.length <= 1, 'ambiguous measured host');
    const geometry = measured.length ? { status: 'measured-original-static-box', evidence: structuredClone(measured[0]) }
      : { status: 'original-capture-host-geometry-gap' };
    if (measured.length) {
      assert.equal(entry.kind, 'static');
      assert.equal(measured[0].missing, false);
      for (const side of ['expected', 'actual']) for (const p of ['left', 'top', 'right', 'bottom', 'width', 'height'])
        assert.ok(Number.isFinite(measured[0][side]?.[p]), 'incomplete measured geometry');
    } else assert.equal(entry.kind, 'interaction', 'static measurement unexpectedly missing');
    return { case: base.case, family: base.family, element: base.element, properties,
      source: base.source, revision: base.revision, inputTrees: entry.inputTrees,
      referencePath: base.referencePath, candidatePath: base.candidatePath, children, geometry };
  });
}
