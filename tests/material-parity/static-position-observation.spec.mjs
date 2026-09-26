import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { buttonOffsetOwners, proveButtonOffsetObservation, applyButtonOffsetObservations,
  validateButtonOffsetObservations } from './static-position-observation.mjs';
import { collectFullTreeInventory } from './input-equivalence-audit.mjs';
import { modalInventoryTrees } from './modal-position-inspection.mjs';
import { bindPreciseAuditNormalization } from './audit-normalization-contracts.mjs';
import { queryFindings } from '../../scripts/audit-findings-store.mjs';
import { applyChipPositionRequests, validateChipPositionRequests } from './chip-position-inspection.mjs';
import { collectStaticPositionObservations, proveStaticPositionObservation } from './static-position-observation.mjs';
test('button offset observation review preserves 36 complete groups and candidate positioning distinctions', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const report = JSON.parse(bytes);
  const cases = [...report.results.map(e => ({ ...e, kind: 'static' })),
    ...report.interactions.map(e => ({ ...e, kind: 'interaction' }))].filter(e => buttonOffsetOwners[e.family]);
  const inventory = collectFullTreeInventory(cases), normalize = bindPreciseAuditNormalization();
  const rows = Object.keys(buttonOffsetOwners).flatMap(family => queryFindings('artifacts/material-parity/working-audit', family, {
    generation: '77595d08eb0f857cf058eb072074a433702f11e022dac2f1bfb666375d923752',
    indexSha256: 'd84236477a9da75dc58de0e5d3d48db58c98bab5232d746cdf5d88501ced2459',
  })).filter(row => row.evidence.section === 'discrepancies');
  const before = structuredClone(rows), applied = applyButtonOffsetObservations(rows, cases, inventory, normalize);
  const changed = applied.filter((row, i) => row !== rows[i]);
  assert.equal(changed.length, 36); assert.equal(changed.reduce((n, r) => n + r.occurrences, 0), 2400);
  assert.deepEqual(rows, before);
  for (const row of changed) {
    assert.equal(row.classification, 'parity-harness-defect');
    assert.equal(row.reviewedCases.length, row.occurrences);
    assert.equal(new Set(row.reviewedCases).size, row.occurrences);
    assert.equal(row.reviewEvidence.observations.length, row.occurrences);
    for (const proof of row.reviewEvidence.observations) {
      assert.equal(proof.candidatePositionRequests.length, row.element === 'card-open' ? 1 : 0);
      for (const flag of ['candidateComputedPositionVerified', 'candidateUsedOffsetsVerified',
        'inputEquivalent', 'renderingEquivalent', 'rendererCauseProven']) assert.equal(proof[flag], false);
    }
    const restored = { ...row };
    for (const key of ['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']) delete restored[key];
    Object.assign(restored, row.reviewEvidence.priorMetadata);
    assert.deepEqual(restored, rows.find(r => r.id === row.id));
  }
  const validate = values => validateButtonOffsetObservations(values, rows, cases, inventory, normalize);
  assert.deepEqual(validate(applied), []);
  const target = values => values.find(r => r.attribution === 'reviewed-button-computed-offset-stage');
  for (const mutate of [values => values.splice(values.indexOf(target(values)), 1), values => values.push(target(values)),
    values => target(values).reviewedCases.pop(), values => { target(values).reviewEvidence.inputEquivalent = true; }]) {
    const altered = structuredClone(applied); mutate(altered); assert.ok(validate(altered).length);
  }
  for (const altered of [cases.slice(1), [...cases, cases[0]]])
    assert.throws(() => applyButtonOffsetObservations(rows, altered, inventory, normalize));
  for (const element of ['button-primary', 'card-open']) {
    const entry = cases.find(e => e.styleInputs.some(i => i.id === element));
    const key = `${entry.kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`;
    const original = modalInventoryTrees(inventory, key);
    const ref = r => r.nodes.find(n => n.attributes?.id === element);
    const ast = a => a.nodes.find(n => n.authored?.id === element);
    for (const mutate of [([r]) => { r.ruleEvidenceComplete = false; },
      ([, a]) => { a.resolvedStyleSource = 'guessed'; },
      ([r]) => { ref(r).inline = { top: '0px' }; },
      ([, a]) => { ast(a).authored.style = { inset: '0' }; },
      ([, a]) => { a.rules.push({ selector: '#' + element, insetInlineStart: '0' }); },
      ([r]) => { r.rules[ref(r).rules[0]].cssText += 'all:initial;'; },
      ([r]) => { r.styles[ref(r).style].left = '1px'; },
      ([, a]) => { ast(a).normalResolvedStyle.position = element === 'card-open' ? undefined : 'relative'; },
      ([, a]) => { ast(a).authored.type = 'div'; },
      ([, a]) => { a.nodes.push(structuredClone(ast(a))); }]) {
      const trees = structuredClone(original); mutate(trees);
      assert.throws(() => proveButtonOffsetObservation(entry, ...trees, element));
    }
  }
});

test('production control position step composes chip and button reviews only with bound original cases', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const captured = JSON.parse(bytes), families = ['chips', ...Object.keys(buttonOffsetOwners)];
  const cases = [...captured.results.map(e => ({ ...e, kind: 'static' })),
    ...captured.interactions.map(e => ({ ...e, kind: 'interaction' }))].filter(e => families.includes(e.family));
  const inventory = collectFullTreeInventory(cases), normalize = bindPreciseAuditNormalization();
  const rows = families.flatMap(family => queryFindings('artifacts/material-parity/working-audit', family, {
    generation: '77595d08eb0f857cf058eb072074a433702f11e022dac2f1bfb666375d923752',
    indexSha256: 'd84236477a9da75dc58de0e5d3d48db58c98bab5232d746cdf5d88501ced2459',
  })).filter(row => row.evidence.section === 'discrepancies');
  const source = readFileSync('tests/material-parity/input-equivalence-audit.mjs', 'utf8').replaceAll('\r\n', '\n');
  const producer = source.slice(source.indexOf("  const discrepancies = ownerInitialStyleBinding.status === 'bound'"),
    source.indexOf('  const classifications = countBy(discrepancies'));
  assert.ok(producer.includes('applyButtonOffsetObservations(applyChipPositionRequests('));
  const run = new Function('ownerInitialStyleBinding', 'beforeControlPositionRequests', 'cases', 'elementInventory',
    'canonicalStyle', 'applyChipPositionRequests', 'applyButtonOffsetObservations', producer + '\nreturn discrepancies;');
  const applied = run({ status: 'bound' }, rows, cases, inventory, normalize, applyChipPositionRequests, applyButtonOffsetObservations);
  assert.equal(run({ status: 'unbound' }, rows, cases, inventory, normalize, applyChipPositionRequests, applyButtonOffsetObservations), rows);
  const changed = applied.filter((row, i) => row !== rows[i]);
  assert.equal(changed.length, 46); assert.equal(changed.reduce((n, r) => n + r.occurrences, 0), 3160);
  const start = source.indexOf('      errors.push(...validateChipPositionRequests(');
  const end = source.indexOf('      if (JSON.stringify(selected(replayedRows))', start);
  assert.ok(start > 0 && end > start);
  const check = new Function('report', 'replayedRows', 'cases', 'canonicalStyle', 'validateChipPositionRequests',
    'validateButtonOffsetObservations', 'const errors = [];\n' + source.slice(start, end) + '\nreturn errors;');
  assert.deepEqual(check({ discrepancies: applied, elementInventory: inventory }, rows, cases, normalize,
    validateChipPositionRequests, validateButtonOffsetObservations), []);
});

test('seven same-type populations retain mixed-stage position evidence without computed-value claims', () => {
  assert.deepEqual(collectStaticPositionObservations(), JSON.parse(readFileSync('docs/material-static-position-observation.json')));
});
test('static-position review rejects explicit requests, reset rules, missing stages and changed owner types', () => {
  const entry = collectStaticPositionObservations().reviewed[0].observations[0];
  const node = t => t.nodes.find(n => (n.attributes?.id ?? n.authored?.id) === 'badge-label');
  for (const mutate of [
    ([r]) => { node(r).inline.position = 'static'; },
    ([r]) => { node(r).inline.all = 'initial'; },
    ([r]) => { r.styles[node(r).style].position = 'relative'; },
    ([, a]) => { node(a).normalResolvedStyle.position = 'static'; },
    ([, a]) => { delete node(a).interactionResolvedStyle; },
    ([, a]) => { node(a).authored.type = 'div'; },
    ([, a]) => { a.rules.push({ selector: '#badge-label', all: 'initial' }); },
    ([, a]) => { a.resolvedStyleSource = 'guessed'; },
  ]) {
    const trees = ['reference', 'astylar'].map(s => JSON.parse(readFileSync(entry.inputTrees[s].file)));
    mutate(trees); assert.throws(() => proveStaticPositionObservation(...trees, 'badge-label'));
  }
});
