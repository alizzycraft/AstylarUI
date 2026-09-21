import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { collectTooltipPositionComposition, proveTooltipPositionComposition } from './tooltip-position-composition.mjs';

test('all 18 tooltip cases demonstrate overlay-to-local-flow input substitution', () => {
  const report = collectTooltipPositionComposition();
  assert.deepEqual(report, JSON.parse(readFileSync('docs/material-tooltip-position-composition.json')));
  assert.equal(report.observations.length, 18);
  assert.equal(new Set(report.observations.map(o => o.case)).size, 18);
  for (const observation of report.observations) {
    assert.equal(observation.proof.classification, 'application-plugin-authoring-defect');
    assert.equal(observation.proof.rendererCauseProven, false);
    assert.equal(observation.proof.inputEquivalent, false);
  }
});

test('tooltip proof rejects changed containing blocks, layout, mapping and omitted-value claims', () => {
  const original = collectTooltipPositionComposition().observations[0];
  for (const mutate of [
    o => { o.paths.reference[3].styles.position.value = 'relative'; },
    o => { o.paths.reference[5].styles.position.value = 'absolute'; },
    o => { o.paths.astylar[0].styles.position.value = 'absolute'; },
    o => { o.paths.astylar[1].styles.position = { present: true, value: 'static' }; },
    o => { o.paths.astylar[1].styles.flexDirection.value = 'row'; },
    o => { o.paths.astylar[0].parent = o.paths.astylar[2].key; },
    o => { o.paths.astylar[0].styles.transform = { present: true, value: 'none' }; },
    o => { o.paths.reference[3].attributes.class = 'unrelated'; },
    o => { o.paths.astylar[1].authored.id = 'unrelated'; },
    o => { o.paths.reference.pop(); },
  ]) {
    const changed = structuredClone(original); mutate(changed);
    assert.throws(() => proveTooltipPositionComposition(changed));
  }
});
