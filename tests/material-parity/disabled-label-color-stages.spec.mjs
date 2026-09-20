import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { collectDisabledLabelColorStages, joinDisabledLabelColorStages } from '../../scripts/audit-material-disabled-label-color-stages.mjs';
import { collectFullTreeInventory, collectRetainedTypographyEvidence } from './input-equivalence-audit.mjs';
import { bindPreciseAuditNormalization } from './audit-normalization-contracts.mjs';

test('32 precise foreground observations reconcile without erasing 24 local omissions', () => {
  const report = collectDisabledLabelColorStages();
  assert.deepEqual(report, JSON.parse(readFileSync('docs/material-disabled-label-color-stages.json')));
  assert.deepEqual(report.counts, { groups: 8, cases: 24, observations: 32, ownColorOmitted: 24 });
  for (const row of report.observations) {
    assert.equal(row.classification, 'application-plugin-authoring-defect');
    assert.equal(row.canonicalAttributionChanged, false);
    assert.equal(row.localOmissionPreserved, true);
    if (row.family !== 'checkbox') assert.equal(row.candidateLocal, null);
    else assert.equal(row.candidateLocal, row.candidateRetained);
    assert.notEqual(row.reference, row.candidateRetained);
  }
});

test('stage join rejects changed identity, precise values, membership and attribution', () => {
  const transition = JSON.parse(readFileSync('docs/material-color-normalization-transition.json'));
  const capture = JSON.parse(readFileSync(transition.capture.file));
  const group = transition.findings.find(row => row.property === 'color' && row.family === 'radio');
  const key = entry => `interaction:${entry.family}@${entry.profile}/${entry.viewport.id}/${entry.state}`;
  const entry = capture.interactions.find(entry => key(entry) === group.cases[0]);
  const cases = [{ ...entry, kind: 'interaction' }];
  const review = collectRetainedTypographyEvidence(cases, collectFullTreeInventory(cases)).differences
    .find(row => row.element === group.element && row.property === 'color');
  const input = entry.styleInputs.find(input => input.id === group.element);
  const base = [input, group, review], normalize = bindPreciseAuditNormalization();
  assert.equal(joinDisabledLabelColorStages(...base, normalize).ownColorOmitted, true);
  const controls = [
    pair => { pair[0].id = 'wrong'; },
    pair => { pair[0].astylar.color = '#ffffff'; },
    pair => { pair[1].after.reference = pair[1].before.reference; },
    pair => { pair[1].after.candidate = review.values.retained; },
    pair => { pair[1].cases = []; },
    pair => { pair[2].family = 'checkbox'; },
    pair => { pair[2].element = 'wrong'; },
    pair => { pair[2].property = 'backgroundColor'; },
    pair => { pair[2].classification = 'equivalent'; },
    pair => { pair[2].attribution = 'unresolved'; },
    pair => { pair[2].values.reference = pair[1].before.reference; },
    pair => { pair[2].values.effective = review.values.retained; },
  ];
  for (const mutate of controls) {
    const pair = structuredClone(base); mutate(pair);
    assert.throws(() => joinDisabledLabelColorStages(...pair, normalize));
  }
});
