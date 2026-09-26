import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { collectFullTreeInventory } from './input-equivalence-audit.mjs';
import { modalInventoryTrees } from './modal-position-inspection.mjs';
import { bindPreciseAuditNormalization } from './audit-normalization-contracts.mjs';
import { queryFindings } from '../../scripts/audit-findings-store.mjs';
import { clippingOwners, proveControlClippingRequests, applyControlClippingRequests,
  validateControlClippingRequests, proveMappedVisibleOverflow, applyMappedVisibleOverflow,
  validateMappedVisibleOverflow } from './control-overflow-observation.mjs';
import { applySnackbarPositionRequests, validateSnackbarPositionRequests } from './snackbar-position-observation.mjs';

test('265 mapped ordinary owners satisfy the retained initial-overflow proof prerequisites, not rendering equivalence', () => {
  // Reuse the existing browser/core sensitivity proof, but require its owning
  // sources and tests to remain unchanged. This does not apply classifications.
  const fingerprints = {
    'src/app/config/browser-defaults.ts': 'c429bec0fa047e71148f4ce743868a4c89986fde28cc7d11076bb7afa89993f3',
    'src/app/services/dom/style-defaults.service.ts': '379775839024538bcd2a6acc69528039e24fc58b849e52841ba9d6c88f4da7d0',
    'src/app/services/dom/elements/overflow-clip.service.ts': 'f66a26a20844e471cf7db4a4e6e9cf6f197f97a0d4eb9cad3cb23bc3892f802a',
    'src/lib/astylar-scroll-runtime.ts': '2c7f0667264471b12315c5619e446dde65c6bb266d0bf114f84688f76f5288ac',
    'src/app/services/dom/elements/overflow-clip.service.spec.ts': '1a1b9cf370ee02e9c7fa9f77cac2050cf36504f14f832f5239d7b9301f34fbf4',
    'src/lib/astylar-scroll-runtime.spec.ts': '91a1f492f15e6a2d27844655b8a017a6d632f8698450bb9ab20f09a24a461e8e',
  };
  for (const [file, expected] of Object.entries(fingerprints)) assert.equal(createHash('sha256')
    .update(readFileSync(file, 'utf8').replaceAll('\r\n', '\n')).digest('hex'), expected, file);
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'),
    'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const captured = JSON.parse(bytes), owners = {
    paginator: ['paginator-range', 'paginator-size'], stepper: ['stepper-content'],
    'bottom-sheet': ['bottom-sheet-overlay'], 'snack-bar': ['snack-bar-overlay', 'snack-bar-surface'],
  };
  const cases = [...captured.results.map(e => ({ ...e, kind: 'static' })),
    ...captured.interactions.map(e => ({ ...e, kind: 'interaction' }))].filter(e => owners[e.family]);
  const inventory = collectFullTreeInventory(cases), counts = {}, samples = new Map();
  const verify = (entry, r, a, input) => {
    const proof = proveMappedVisibleOverflow(entry, r, a, input.id);
    assert.equal(proof.initialValueEquivalent, true);
    for (const flag of ['inputEquivalent', 'structuralEquivalenceVerified', 'clippingVerified', 'scrollingVerified', 'renderingEquivalent'])
      assert.equal(proof[flag], false);
    return proof.mapping;
  };
  for (const entry of cases) for (const element of owners[entry.family]) {
    const inputs = entry.styleInputs.filter(i => i.id === element);
    if (!inputs.length) continue; // Closed overlays have no owner; expected totals below are exact.
    assert.equal(inputs.length, 1);
    const pair = modalInventoryTrees(inventory,
      `${entry.kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`);
    const mapping = verify(entry, ...pair, inputs[0]);
    counts[element] = (counts[element] ?? 0) + 1;
    if (!samples.has(element)) samples.set(element, { entry, pair, input: inputs[0], mapping });
  }
  assert.deepEqual(counts, { 'paginator-range': 52, 'paginator-size': 52, 'stepper-content': 68,
    'bottom-sheet-overlay': 25, 'snack-bar-overlay': 34, 'snack-bar-surface': 34 });
  for (const [element, { entry, pair, input, mapping }] of samples) {
    for (const mutate of [
      ([r]) => { r.ruleEvidenceComplete = false; },
      ([r]) => { r.nodes.find(n => n.key === mapping.referenceNode).attributes.id = element; },
      ([, a]) => { a.rules.push({ selector: '[unknown]', overflow: 'hidden' }); },
      ([, a]) => { a.nodes.find(n => n.key === mapping.candidateNode).authored.style = { overflowBlock: 'clip' }; },
      ([, a]) => { a.nodes.find(n => n.key === mapping.candidateNode).normalResolvedStyle.all = 'unset'; },
      ([, a]) => { a.nodes.find(n => n.key === mapping.candidateNode).authored.type = 'showcase.material:panel'; },
    ]) {
      const changed = structuredClone(pair); mutate(changed);
      assert.throws(() => verify(entry, ...changed, input), undefined, element);
    }
  }
});

test('combined snackbar and overflow proposal preserves all current raw rows and exact original case membership', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'),
    'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const captured = JSON.parse(bytes);
  const cases = [...captured.results.map(e => ({ ...e, kind: 'static' })),
    ...captured.interactions.map(e => ({ ...e, kind: 'interaction' }))];
  const inventory = collectFullTreeInventory(cases), normalize = bindPreciseAuditNormalization();
  const rows = [...new Set(cases.map(e => e.family))].flatMap(f => queryFindings('artifacts/material-parity/working-audit', f, {
    generation: 'f86307bd22b7699155bc1e28730c1a446c825a214d97c9258555c8b33a265162',
    indexSha256: '9222220df3105817b2f39275395d883ff8201560f00f696320dfec0171339c8a',
  })).filter(r => r.evidence.section === 'discrepancies').sort((a, b) => a.evidence.ordinal - b.evidence.ordinal);
  assert.equal(rows.length, 8483);
  const before = structuredClone(rows);
  const applied = applyMappedVisibleOverflow(applyControlClippingRequests(
    applySnackbarPositionRequests(rows, cases, inventory, normalize), cases, inventory, normalize), cases, inventory, normalize);
  assert.deepEqual(rows, before); assert.equal(applied.length, rows.length);
  const changed = applied.filter((r, i) => r !== rows[i]);
  assert.equal(changed.length, 31); assert.equal(changed.reduce((n, r) => n + r.occurrences, 0), 1292);
  assert.equal(applied.filter(r => r.attribution === 'unresolved').length, 1096);
  const visible = changed.filter(r => r.attribution === 'reviewed-mapped-visible-overflow-initial-value');
  assert.equal(visible.length, 12); assert.equal(visible.reduce((n, r) => n + r.occurrences, 0), 530);
  for (const row of changed) {
    assert.equal(row.reviewedCases.length, row.occurrences);
    assert.equal(new Set(row.reviewedCases).size, row.occurrences);
    const restored = { ...row };
    for (const key of ['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']) delete restored[key];
    Object.assign(restored, row.reviewEvidence.priorMetadata);
    assert.deepEqual(restored, rows.find(r => r.id === row.id));
  }
  for (const validate of [validateMappedVisibleOverflow, validateControlClippingRequests, validateSnackbarPositionRequests])
    assert.deepEqual(validate(applied, rows, cases, inventory, normalize), []);
  for (const mutate of [r => { r.reference = 'hidden'; }, r => r.reviewedCases.pop(),
    r => { r.reviewEvidence.observations[0].renderingEquivalent = true; },
    r => { r.classification = 'application-plugin-authoring-defect'; }]) {
    const altered = structuredClone(applied);
    mutate(altered.find(r => r.attribution === 'reviewed-mapped-visible-overflow-initial-value'));
    assert.ok(validateMappedVisibleOverflow(altered, rows, cases, inventory, normalize).length);
  }
  const target = cases.findIndex(e => e.family === 'snack-bar' && e.styleInputs.some(i => i.id === 'snack-bar-overlay'));
  assert.ok(target >= 0);
  assert.throws(() => applyMappedVisibleOverflow(rows, cases.filter((_, i) => i !== target), inventory, normalize));
  assert.throws(() => applyMappedVisibleOverflow(rows, [...cases, cases[target]], inventory, normalize));
});

test('330 control owners preserve clipping requests, competing visible rules and the progress computed axis', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'),
    'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const captured = JSON.parse(bytes);
  const cases = [...captured.results.map(e => ({ ...e, kind: 'static' })),
    ...captured.interactions.map(e => ({ ...e, kind: 'interaction' }))].filter(e => clippingOwners[e.family]);
  const inventory = collectFullTreeInventory(cases), normalize = bindPreciseAuditNormalization();
  const trees = e => modalInventoryTrees(inventory,
    `${e.kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`);
  const counts = {}, samples = new Map();
  for (const entry of cases) for (const element of Object.keys(clippingOwners[entry.family])) {
    const pair = trees(entry), proof = proveControlClippingRequests(entry, ...pair, element);
    assert.equal(proof.clippingVerified, false); assert.equal(proof.candidateComputedOverflowVerified, false);
    counts[element] = (counts[element] ?? 0) + 1;
    if (!samples.has(element)) samples.set(element, { entry, pair, proof });
  }
  assert.deepEqual(counts, { 'core-primary': 52, 'sidenav-primary': 62, 'grid-tile-one': 52,
    'grid-tile-two': 52, 'badge-count': 52, 'icon-primary': 20, 'progress-bar-primary': 20,
    'progress-spinner-primary': 20 });
  for (const [element, { entry, pair, proof }] of samples) {
    const ref = r => r.nodes.find(n => n.key === proof.referenceNode);
    const ast = a => a.nodes.find(n => n.key === proof.astylarNode);
    for (const mutate of [
      ([r]) => { r.ruleEvidenceComplete = false; },
      ([r]) => { ref(r).inline = { overflow: { value: 'visible' } }; },
      ([r]) => { ref(r).attributes.style = 'overflow-inline:visible'; },
      ([r]) => { r.rules[ref(r).rules[0]].cssText += ';all:initial'; },
      ([r]) => { r.styles[ref(r).style].overflowY = 'forged'; },
      ([, a]) => { a.rules.push({ selector: '#' + element, overflowBlock: 'hidden' }); },
      ([, a]) => { a.rules.push({ selector: '[unknown]', overflow: 'hidden' }); },
      ([, a]) => { ast(a).authored.style = { overflow: 'hidden' }; },
      ([, a]) => { ast(a).interactionResolvedStyle.overflowY = 'hidden'; },
      ([, a]) => { a.nodes.push(structuredClone(ast(a))); },
      ([, a]) => { ast(a).authored.type = 'other'; },
    ]) {
      const altered = structuredClone(pair); mutate(altered);
      assert.throws(() => proveControlClippingRequests(entry, ...altered, element), undefined, element);
    }
  }
  const rows = Object.keys(clippingOwners).flatMap(f => queryFindings('artifacts/material-parity/working-audit', f, {
    generation: 'fea569edc8edf1e05d1686bcb7c2a8eecc0bfb53bff5d5b8baeb6fbb59602040',
    indexSha256: '672b4d61922a8ef775f4e2c723ca09c9ab70684d93822cd3fe3b53d0df6c9d57',
  })).filter(r => r.evidence.section === 'discrepancies');
  const before = structuredClone(rows), applied = applyControlClippingRequests(rows, cases, inventory, normalize);
  assert.deepEqual(rows, before);
  const changed = applied.filter((r, i) => r !== rows[i]);
  assert.equal(changed.length, 16); assert.equal(changed.reduce((n, r) => n + r.occurrences, 0), 660);
  assert.deepEqual(changed.filter(r => r.attribution === 'reviewed-progress-overflow-computed-axis')
    .map(r => [r.element, r.property, r.reference, r.occurrences]), [['progress-bar-primary', 'overflowY', 'auto', 20]]);
  for (const row of changed) {
    assert.equal(row.reviewedCases.length, row.occurrences);
    assert.equal(new Set(row.reviewedCases).size, row.occurrences);
    const restored = { ...row };
    for (const key of ['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']) delete restored[key];
    Object.assign(restored, row.reviewEvidence.priorMetadata);
    assert.deepEqual(restored, rows.find(r => r.id === row.id));
  }
  const validate = values => validateControlClippingRequests(values, rows, cases, inventory, normalize);
  assert.deepEqual(validate(applied), []);
  for (const mutate of [r => { r.reference = 'forged'; }, r => r.reviewedCases.pop(),
    r => { r.reviewEvidence.observations[0].clippingVerified = true; }]) {
    const altered = structuredClone(applied);
    mutate(altered.find(r => r.attribution === 'reviewed-control-clipping-request-omission'));
    assert.ok(validate(altered).length);
  }
  assert.throws(() => applyControlClippingRequests(rows, cases.slice(1), inventory, normalize));
  assert.throws(() => applyControlClippingRequests(rows, [...cases, cases[0]], inventory, normalize));
});
