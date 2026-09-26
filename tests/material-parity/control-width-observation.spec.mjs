import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { controlWidthOwners, proveControlWidthRequest, applyControlWidthRequests,
  validateControlWidthRequests, omittedWidthOwners, proveOmittedWidthObservation,
  applyOmittedWidthObservations, validateOmittedWidthObservations } from './control-width-observation.mjs';
import { collectFullTreeInventory } from './input-equivalence-audit.mjs';
import { modalInventoryTrees } from './modal-position-inspection.mjs';
import { queryFindings } from '../../scripts/audit-findings-store.mjs';
import { bindPreciseAuditNormalization } from './audit-normalization-contracts.mjs';

test('control fixed-width requests retain all 544 original owners and reject false equivalence', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'),
    'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const report = JSON.parse(bytes);
  const cases = [...report.results.map(e => ({ ...e, kind: 'static' })),
    ...report.interactions.map(e => ({ ...e, kind: 'interaction' }))].filter(e => controlWidthOwners[e.family]);
  const inventory = collectFullTreeInventory(cases), counts = {}, examples = new Map(), seen = new Set();
  for (const entry of cases) {
    const key = `${entry.kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`;
    const trees = modalInventoryTrees(inventory, key);
    for (const element of Object.keys(controlWidthOwners[entry.family])) {
      const proof = proveControlWidthRequest(entry, ...trees, element);
      const owner = JSON.stringify([key, element]); assert.ok(!seen.has(owner)); seen.add(owner);
      const signature = `${element}:${proof.candidateAuthoredWidth}`;
      counts[signature] = (counts[signature] ?? 0) + 1;
      for (const flag of ['inputEquivalent', 'structuralEquivalenceVerified', 'candidateUsedLayoutVerified',
        'renderingEquivalent', 'originalRasterCauseProven']) assert.equal(proof[flag], false);
      if (!examples.has(element)) examples.set(element, { entry, trees });
    }
  }
  assert.equal(seen.size, 544);
  assert.deepEqual(counts, {
    'checkbox-primary:149.5625px': 34, 'checkbox-primary:137.5625px': 17, 'checkbox-primary:141.5625px': 17,
    'badge-primary:90.953125px': 26, 'badge-primary:81.859375px': 13, 'badge-primary:104.65625px': 13,
    'radio-primary:153px': 34, 'radio-primary:129px': 17, 'radio-primary:137px': 17,
    'slide-toggle-primary:179px': 68, 'button-toggle-primary:130px': 68, 'button-toggle-two:81px': 68,
    'chip-0:97px': 52, 'chip-0:68px': 24, 'chip-1:93px': 68, 'chip-1:64px': 8,
  });
  for (const [element, { entry, trees }] of examples) {
    const ref = r => r.nodes.find(n => n.attributes?.id === element);
    const ast = a => a.nodes.find(n => n.authored?.id === element);
    for (const mutate of [
      ([r]) => { r.ruleEvidenceComplete = false; },
      ([, a]) => { a.resolvedStyleSource = 'paint-guess'; },
      ([r]) => { r.nodes.push(structuredClone(ref(r))); },
      ([, a]) => { ast(a).authored.type = 'foreign'; },
      ([r]) => { ref(r).inline = { width: '100px' }; },
      ([r]) => { ref(r).attributes.style = 'inline-size:100px'; },
      ([r]) => { ref(r).rules.push(r.rules.length); r.rules.push({ active: true, cssText: '',
        declarations: { blockSize: { value: '100px' } } }); },
      ([r]) => { ref(r).rules.push(r.rules.length); r.rules.push({ active: true,
        cssText: 'owner { width:100px; }', declarations: {} }); },
      ([, a]) => { ast(a).authored.style = { width: '100px' }; },
      ([, a]) => { a.rules.push({ selector: '#' + element, inlineSize: '100px' }); },
      ([, a]) => { a.rules.push({ selector: '[unreviewed]', blockSize: '100px' }); },
      ([, a]) => { ast(a).normalResolvedStyle.width = 'auto'; },
      ([, a]) => { ast(a).interactionResolvedStyle.all = 'initial'; },
    ]) {
      const altered = structuredClone(trees); mutate(altered);
      assert.throws(() => proveControlWidthRequest(entry, ...altered, element), undefined, element);
    }
    const unrelated = structuredClone(trees); unrelated[1].rules.push({ selector: '#different-owner', width: '1px' });
    assert.deepEqual(proveControlWidthRequest(entry, ...unrelated, element),
      proveControlWidthRequest(entry, ...trees, element));
  }
  const snapshot = {
    generation: '77595d08eb0f857cf058eb072074a433702f11e022dac2f1bfb666375d923752',
    indexSha256: 'd84236477a9da75dc58de0e5d3d48db58c98bab5232d746cdf5d88501ced2459',
  };
  const rows = Object.keys(controlWidthOwners).flatMap(family =>
    queryFindings('artifacts/material-parity/working-audit', family, snapshot))
    .filter(row => row.evidence.section === 'discrepancies');
  const before = structuredClone(rows), normalize = bindPreciseAuditNormalization();
  const applied = applyControlWidthRequests(rows, cases, inventory, normalize);
  assert.deepEqual(rows, before); assert.equal(applied.length, rows.length);
  const changed = applied.filter((row, i) => row !== rows[i]);
  assert.equal(changed.length, 16);
  assert.equal(changed.reduce((sum, row) => sum + row.occurrences, 0), 544);
  const reviewed = new Set();
  for (const row of changed) {
    assert.equal(row.attribution, 'reviewed-control-fixed-width-authoring');
    assert.equal(row.classification, 'application-plugin-authoring-defect');
    assert.equal(row.reviewedCases.length, row.occurrences);
    assert.equal(row.reviewEvidence.observations.length, row.occurrences);
    for (const key of row.reviewedCases) {
      const owner = JSON.stringify([key, row.element]); assert.ok(!reviewed.has(owner)); reviewed.add(owner);
    }
    const restored = { ...row };
    for (const key of ['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases'])
      delete restored[key];
    Object.assign(restored, row.reviewEvidence.priorMetadata);
    assert.deepEqual(restored, rows.find(original => original.id === row.id));
  }
  assert.deepEqual(reviewed, seen);
  const validate = values => validateControlWidthRequests(values, rows, cases, inventory, normalize);
  assert.deepEqual(validate(applied), []);
  const target = values => values.find(row => row.attribution === 'reviewed-control-fixed-width-authoring');
  for (const mutate of [values => values.splice(values.indexOf(target(values)), 1),
    values => values.push(target(values)), values => target(values).reviewedCases.pop(),
    values => { target(values).reference = 'fabricated'; },
    values => { target(values).reviewEvidence.priorMetadata.attribution = 'fabricated'; },
    values => { target(values).reviewEvidence.observations[0].inputEquivalent = true; }]) {
    const altered = structuredClone(applied); mutate(altered); assert.ok(validate(altered).length);
  }
  for (const altered of [cases.slice(1), [...cases, cases[0]]])
    assert.throws(() => applyControlWidthRequests(rows, altered, inventory, normalize));
  // Full production wiring/export still awaits the current position export's
  // reconciliation. This replay does not alter the accepted canonical package.
});

test('omitted width stage review binds 14 groups without erasing layout and unpaired tooltip gaps', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'),
    'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const report = JSON.parse(bytes);
  const cases = [...report.results.map(e => ({ ...e, kind: 'static' })),
    ...report.interactions.map(e => ({ ...e, kind: 'interaction' }))].filter(e => omittedWidthOwners[e.family]);
  const inventory = collectFullTreeInventory(cases), normalize = bindPreciseAuditNormalization();
  const snapshot = {
    generation: '77595d08eb0f857cf058eb072074a433702f11e022dac2f1bfb666375d923752',
    indexSha256: 'd84236477a9da75dc58de0e5d3d48db58c98bab5232d746cdf5d88501ced2459',
  };
  const rows = Object.keys(omittedWidthOwners).flatMap(family =>
    queryFindings('artifacts/material-parity/working-audit', family, snapshot))
    .filter(row => row.evidence.section === 'discrepancies');
  const before = structuredClone(rows), applied = applyOmittedWidthObservations(rows, cases, inventory, normalize);
  assert.deepEqual(rows, before); assert.equal(applied.length, rows.length);
  const changed = applied.filter((row, i) => row !== rows[i]);
  assert.equal(changed.length, 14); assert.equal(changed.reduce((sum, row) => sum + row.occurrences, 0), 370);
  const counts = {}, reviewed = new Set();
  for (const row of changed) {
    counts[row.element] = (counts[row.element] ?? 0) + row.occurrences;
    assert.equal(row.classification, 'parity-harness-defect');
    assert.equal(Object.hasOwn(row, 'astylar'), false);
    assert.equal(row.reviewedCases.length, row.occurrences);
    for (const [i, key] of row.reviewedCases.entries()) {
      const owner = JSON.stringify([key, row.element]); assert.ok(!reviewed.has(owner)); reviewed.add(owner);
      const proof = row.reviewEvidence.observations[i];
      for (const flag of ['inputEquivalent', 'structuralEquivalenceVerified', 'candidateComputedWidthVerified',
        'candidateUsedLayoutVerified', 'renderingEquivalent', 'originalRasterCauseProven']) assert.equal(proof[flag], false);
    }
    const restored = { ...row };
    for (const key of ['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases'])
      delete restored[key];
    Object.assign(restored, row.reviewEvidence.priorMetadata);
    assert.deepEqual(restored, rows.find(original => original.id === row.id));
  }
  assert.deepEqual(counts, { 'card-copy': 52, 'card-title': 52, 'chips-primary': 76,
    'expansion-title': 68, 'paginator-range': 52, 'paginator-size': 52, 'tooltip-popup': 18 });
  const keyOf = entry => `${entry.kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`;
  for (const family of Object.keys(omittedWidthOwners)) for (const element of omittedWidthOwners[family]) {
    const entry = cases.find(e => e.family === family && e.styleInputs.some(i => i.id === element) &&
      (family !== 'tooltip' || e.state === 'hover'));
    const trees = modalInventoryTrees(inventory, keyOf(entry));
    const proof = proveOmittedWidthObservation(entry, ...trees, element);
    const ref = r => r.nodes.find(n => n.key === proof.referenceNode);
    const ast = a => a.nodes.find(n => n.key === proof.astylarNode);
    for (const mutate of [
      ([r]) => { r.ruleEvidenceComplete = false; },
      ([r]) => { ref(r).inline.width = '100px'; },
      ([r]) => { ref(r).rules.push(r.rules.length); r.rules.push({ active: true,
        cssText: 'owner { inline-size:100px; }', declarations: {} }); },
      ([, a]) => { a.rules.push({ selector: '#' + element, blockSize: '100px' }); },
      ([, a]) => { ast(a).resolvedStyle.width = '100px'; },
      ([, a]) => { ast(a).authored.attributes = { style: 'width:100px' }; },
      ([r]) => { r.nodes.push(structuredClone(ref(r))); },
    ]) {
      const altered = structuredClone(trees); mutate(altered);
      assert.throws(() => proveOmittedWidthObservation(entry, ...altered, element));
    }
  }
  const open = cases.find(e => e.family === 'tooltip' && e.state === 'open');
  assert.ok(open);
  assert.throws(() => proveOmittedWidthObservation(open, ...modalInventoryTrees(inventory, keyOf(open)), 'tooltip-popup'));
  const validate = values => validateOmittedWidthObservations(values, rows, cases, inventory, normalize);
  assert.deepEqual(validate(applied), []);
  const target = values => values.find(row => row.attribution === 'reviewed-omitted-width-observation-stage');
  for (const mutate of [values => values.splice(values.indexOf(target(values)), 1),
    values => target(values).reviewedCases.pop(), values => { target(values).astylar = 'auto'; },
    values => { target(values).reviewEvidence.observations[0].renderingEquivalent = true; }]) {
    const altered = structuredClone(applied); mutate(altered); assert.ok(validate(altered).length);
  }
});
