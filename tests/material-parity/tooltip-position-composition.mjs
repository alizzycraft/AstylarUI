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

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  assert.equal(process.argv.length, 2);
  const report = collectTooltipPositionComposition();
  writeFileSync('docs/material-tooltip-position-composition.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report.counts));
}
