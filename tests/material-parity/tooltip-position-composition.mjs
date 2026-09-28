import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { collectTooltipPositionAncestry } from '../../scripts/inspect-material-tooltip-position-ancestry.mjs';

// This proves a non-equivalent positioning request, not the renderer's response.
export function proveTooltipPositionComposition(observation) {
  const { reference: r, astylar: a } = observation.paths;
  assert.equal(r.length, 6); assert.equal(a.length, 5);
  for (const chain of [r, a]) {
    assert.equal(new Set(chain.map(n => n.key)).size, chain.length);
    chain.forEach((node, i) => assert.equal(node.parent, chain[i + 1]?.key ?? null));
  }
  assert.deepEqual(r.map(n => n.styles.position),
    ['static', 'relative', 'static', 'absolute', 'absolute', 'fixed'].map(value => ({ present: true, value })));
  assert.deepEqual(a.map(n => n.styles.position),
    ['relative', null, 'relative', null, null].map(value => ({ present: value !== null, value })));
  assert.ok(r[0].attributes.class.split(/\s+/).includes('mat-mdc-tooltip-surface'));
  assert.ok(r[3].attributes.class.split(/\s+/).includes('cdk-overlay-pane'));
  assert.ok(r[5].attributes.class.split(/\s+/).includes('cdk-overlay-container'));
  assert.equal(a[0].authored.id, 'tooltip-popup');
  assert.equal(a[1].authored.id, 'tooltip-anchor');
  assert.equal(a[2].authored.id, 'tooltip-root');
  for (const [property, value] of Object.entries({ display: 'flex', flexDirection: 'column', width: '138px', height: '72px' })) {
    assert.deepEqual(a[1].styles[property], { present: true, value });
  }
  assert.deepEqual(a[0].styles.transform, { present: false, value: null });
  return {
    element: 'tooltip-popup', property: 'position', reference: 'static', candidate: 'relative',
    classification: 'application-plugin-authoring-defect',
    firstDivergence: 'authored placement composition before layout',
    referencePlacement: 'surface inside absolute pane within fixed overlay container',
    candidatePlacement: 'relative flex item in fixed-size local trigger wrapper',
    justification: 'The reference overlay leaves document flow; the candidate popup participates in the trigger wrapper flex layout. The local-flow rewrite does not preserve the reference placement contract.',
    recommendedOwner: 'Material comparison authoring; core overlay/layout support must be proved with equivalent inputs before implementation',
    rendererCauseProven: false, inputEquivalent: false, renderingEquivalent: false,
  };
}

export function collectTooltipPositionComposition() {
  const inspection = collectTooltipPositionAncestry();
  return { schemaVersion: 1, kind: 'tooltip-position-composition-review', population: inspection.population,
    observations: inspection.observations.map(observation => ({ ...observation,
      proof: proveTooltipPositionComposition(observation) })),
    counts: { groups: 1, scalarObservations: 18 }, canonicalAttributionChanged: false,
    rendererCauseProven: false, inputEquivalent: false, renderingEquivalent: false };
}

// Stacking ownership differs even though both applications request an overlay
// level of 1000 somewhere. Do not compare the leaf's scalar in isolation.
export function proveTooltipStackingComposition(reference, candidate) {
  for (const tree of [reference, candidate]) {
    assert.equal(tree.schemaVersion, 1);
    assert.deepEqual(tree.errors, []);
  }
  assert.equal(candidate.resolvedStyleEvidenceVersion, 2);
  assert.equal(candidate.resolvedStyleSource, 'core-style-inspection');
  const mapped = reference.nodes.filter(n => String(n.attributes?.class ?? '').split(/\s+/).includes('mat-mdc-tooltip-surface'));
  const authored = candidate.nodes.filter(n => n.authored?.id === 'tooltip-popup');
  assert.equal(mapped.length, 1); assert.equal(authored.length, 1);
  const chain = (tree, leaf) => {
    const result = [], seen = new Set();
    for (let node = leaf; node;) {
      assert.ok(!seen.has(node.key)); seen.add(node.key); result.push(node);
      if (node.parent === null) break;
      node = tree.nodes.find(n => n.key === node.parent);
      assert.ok(node, 'Incomplete stacking ancestry');
    }
    return result;
  };
  const r = chain(reference, mapped[0]), a = chain(candidate, authored[0]);
  assert.equal(r.length, 6); assert.equal(a.length, 5);
  assert.deepEqual(r.map(n => reference.styles[n.style].zIndex), ['auto', 'auto', 'auto', '1000', '1000', '1000']);
  for (const [index, selector] of [[3, '.cdk-overlay-pane'], [4, '.cdk-overlay-connected-position-bounding-box'], [5, '.cdk-overlay-container']]) {
    assert.ok(String(r[index].attributes.class).split(/\s+/).includes(selector.slice(1)));
    assert.ok(r[index].rules.map(i => reference.rules[i]).some(rule => rule.active && rule.selector === selector &&
      rule.declarations?.['z-index']?.value === '1000'));
  }
  for (const node of r.slice(0, 3)) {
    assert.equal(node.inline?.['z-index'], undefined);
    assert.ok(node.rules.map(i => reference.rules[i]).filter(rule => rule.active && !rule.selector.includes('::'))
      .every(rule => !rule.declarations?.['z-index']), 'Leaf has an unreviewed stacking request');
  }
  assert.deepEqual(a.map(n => n.authored.id ?? null), ['tooltip-popup', 'tooltip-anchor', 'tooltip-root', 'page', null]);
  for (const stage of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle']) {
    assert.equal(a[0][stage].zIndex, '1000');
    assert.ok(a.slice(1).every(n => !Object.hasOwn(n[stage] ?? {}, 'zIndex')));
  }
  assert.ok(candidate.rules.some(rule => rule.selector === '#tooltip-popup' && rule.zIndex === '1000' && rule.position === 'relative'));
  return { classification: 'application-plugin-authoring-defect',
    firstDivergence: 'different authored stacking owners and overlay ancestry',
    referenceLeafZIndex: 'auto', candidateLeafZIndex: '1000',
    referenceOverlayOwners: r.slice(3).map(n => n.key), candidateOverlayOwner: a[0].key,
    inputEquivalent: false, renderingEquivalent: false, rendererCauseProven: false };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  assert.equal(process.argv.length, 2);
  const report = collectTooltipPositionComposition();
  writeFileSync('docs/material-tooltip-position-composition.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report.counts));
}
