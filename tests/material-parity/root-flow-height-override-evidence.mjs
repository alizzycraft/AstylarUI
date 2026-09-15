import assert from 'node:assert/strict';
import { rootInitialSelectorCanApply } from './root-initial-style-evidence.mjs';

const one = values => { assert.equal(values.length, 1); return values[0]; };
const flowKey = key => ['all', 'display', 'flexflow', 'flexdirection', 'flexwrap', 'gap', 'rowgap', 'columngap']
  .includes(key.replaceAll('-', '').toLowerCase());
const flow = value => Object.fromEntries(Object.entries(value ?? {}).filter(([k]) => flowKey(k)));

// This is a property-specific review of repeated root selectors, not a general
// media/cascade resolver. Height and formatting-context claims remain separate.
export function inspectRootFlowHeightOverrides(entry, reference, candidate) {
  assert.ok(['button', 'toolbar', 'paginator'].includes(entry.family));
  const id = entry.family + '-root', input = one(entry.styleInputs.filter(i => i.id === id));
  for (const tree of [reference, candidate]) {
    assert.equal(tree.schemaVersion, 1); assert.deepEqual(tree.errors, []);
    assert.equal(new Set(tree.nodes.map(n => n.key)).size, tree.nodes.length);
  }
  const r = one(reference.nodes.filter(n => n.attributes?.id === id));
  const a = one(candidate.nodes.filter(n => n.authored?.id === id));
  assert.equal(r.type, 'section'); assert.equal(a.authored.type, 'section');
  assert.ok(r.attributes.class.split(/\s+/).includes('demo'));
  assert.equal(input.referenceStructure.schemaVersion, 2); assert.equal(input.referenceStructure.type, 'section');
  assert.equal(input.astylarStructure.schemaVersion, 2); assert.equal(input.astylarStructure.type, 'section');
  const frame = one(reference.nodes.filter(n => n.key === r.parent));
  const page = one(candidate.nodes.filter(n => n.key === a.parent));
  assert.equal(frame.type, 'main'); assert.equal(frame.parent, null);
  assert.ok(frame.attributes.class.split(/\s+/).includes('frame'));
  assert.equal(page.authored.id, 'page'); assert.equal(page.authored.type, 'main');
  const computed = reference.styles[r.style];
  assert.equal(Object.keys(input.reference).length, 89);
  for (const [k, v] of Object.entries(input.reference)) assert.deepEqual(v, computed[k]);
  const referenceFlow = { display: 'block', flexDirection: 'row', flexWrap: 'nowrap', gap: 'normal', rowGap: 'normal', columnGap: 'normal' };
  for (const [k, v] of Object.entries(referenceFlow)) assert.equal(computed[k], v);
  assert.deepEqual(flow(r.inline), {});
  assert.ok(!/(?:^|;)\s*(?:all|display|flex(?:-flow|-direction|-wrap)?|(?:row-|column-)?gap)\s*:/i.test(r.attributes.style ?? ''));
  const referenceRules = r.rules.map(i => reference.rules[i]);
  assert.ok(referenceRules.some(rule => rule.active && /^\.demo(?:\[_ngcontent-[\w-]+\])?$/.test(rule.selector)));
  for (const rule of referenceRules) assert.deepEqual(flow(rule.declarations), {});
  for (const rule of input.referenceAuthored) assert.deepEqual(flow(rule.declarations), {});
  assert.deepEqual(flow(a.authored.style), {});
  assert.ok(!/(?:^|;)\s*(?:all|display|flex(?:-flow|-direction|-wrap)?|(?:row-|column-)?gap)\s*:/i.test(a.authored.attributes?.style ?? ''));
  const possible = candidate.rules.filter(rule => rootInitialSelectorCanApply(rule.selector, a.authored));
  const base = one(possible.filter(rule => Object.keys(flow(rule)).length));
  assert.equal(base.selector, '#' + id);
  assert.deepEqual(flow(base), { display: 'flex', flexDirection: 'column', gap: '16px' });
  assert.equal(base.mediaMaxWidth, undefined); assert.equal(base.mediaMinWidth, undefined);
  const rootRules = candidate.rules.filter(rule => rule.selector === '#' + id);
  const heightOverrides = rootRules.filter(rule => rule !== base);
  assert.ok(heightOverrides.length <= 1);
  for (const rule of heightOverrides) {
    assert.deepEqual(Object.keys(rule).sort(), ['height', 'mediaMaxWidth', 'selector']);
    assert.equal(rule.mediaMaxWidth, '500px'); assert.match(rule.height, /^\d+(?:\.\d+)?px$/);
  }
  // The scalar collector omits media metadata but retains each declaration.
  // Join every repeated rule to its full-tree source instead of dropping it.
  const scalarRules = input.astylarAuthored.filter(rule => rule.selector === '#' + id);
  assert.deepEqual(scalarRules.map(rule => ({ selector: rule.selector, declarations: rule.declarations })),
    rootRules.map(({ selector, mediaMaxWidth: _media, ...declarations }) => ({ selector, declarations })));
  assert.equal(candidate.resolvedStyleSource, 'core-style-inspection');
  assert.equal(candidate.resolvedStyleEvidenceVersion, 2); assert.equal(input.astylarResolvedStyleEvidenceVersion, 2);
  assert.ok(Number.isInteger(candidate.resolvedStyleRevision) && candidate.resolvedStyleRevision >= 0);
  for (const [stage, field] of [['resolvedStyle', 'astylar'], ['normalResolvedStyle', 'astylarNormalResolvedStyle'],
    ['interactionResolvedStyle', 'astylarInteractionResolvedStyle']]) {
    assert.deepEqual(a[stage], input[field]);
    assert.deepEqual(flow(a[stage]), { display: 'flex', flexDirection: 'column', flexWrap: 'nowrap', gap: '16px' });
  }
  return { element: id, referenceNode: r.key, candidateNode: a.key,
    source: candidate.resolvedStyleSource, revision: candidate.resolvedStyleRevision,
    properties: [
      { property: 'flexDirection', reference: 'row', candidate: 'column' },
      { property: 'rowGap', reference: 'normal', candidate: '16px' },
      { property: 'columnGap', reference: 'normal', candidate: '16px' },
    ], referenceFlow, candidateFlow: flow(a.resolvedStyle), referenceRules, candidateRootRules: rootRules,
    heightOverrides, firstDivergence: 'authored block-to-column-flex formatting-context substitution',
    owner: 'showcase demo-section block-flow translation', classification: 'application-plugin-authoring-defect',
    inputEquivalent: false, heightBehaviorVerified: false, originalRasterCauseProven: false, renderingEquivalent: false };
}
