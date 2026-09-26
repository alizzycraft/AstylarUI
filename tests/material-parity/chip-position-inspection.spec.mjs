import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { proveChipPositionRequests, applyChipPositionRequests, validateChipPositionRequests } from './control-position-observation.mjs';
import { bindPreciseAuditNormalization } from './audit-normalization-contracts.mjs';
import { collectFullTreeInventory } from './input-equivalence-audit.mjs';
import { modalInventoryTrees } from './modal-position-inspection.mjs';
import { collectChipPositionInspection, proveChipPositionInspection, collectChipPaintProposal, applyChipPaintProposal, chipPaintPredecessor } from './chip-position-inspection.mjs';
import { queryFindings, loadFindingEvidence } from '../../scripts/audit-findings-store.mjs';
import { collectChipPaintAuditInputs, validateChipPaintAuditInputs, validateChipPaintAuditClassifications, applyChipPaintAuditRows } from './chip-paint-audit-source-binding.mjs';
test('chip position requests separate explicit relative rules from computed zero offsets', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const report = JSON.parse(bytes);
  const cases = [...report.results.map(e => ({ ...e, kind: 'static' })),
    ...report.interactions.map(e => ({ ...e, kind: 'interaction' }))].filter(e => e.family === 'chips');
  assert.equal(cases.length, 76);
  const inventory = collectFullTreeInventory(cases);
  const keys = cases.map(e => `${e.kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`);
  assert.equal(new Set(keys).size, 76);
  let owners = 0;
  for (const key of keys) {
    const trees = modalInventoryTrees(inventory, key);
    for (const element of ['chip-0', 'chip-1']) {
      const proof = proveChipPositionRequests(...trees, element);
      assert.equal(proof.referencePositionRequests.length, 2);
      assert.deepEqual(proof.referenceComputedOffsets, { top: '0px', right: '0px', bottom: '0px', left: '0px' });
      assert.equal(proof.positionClassification, 'application-plugin-authoring-defect');
      assert.equal(proof.offsetClassification, 'parity-harness-defect');
      for (const flag of ['candidateComputedPositionVerified', 'candidateUsedOffsetsVerified',
        'inputEquivalent', 'renderingEquivalent', 'rendererCauseProven']) assert.equal(proof[flag], false);
      owners++;
    }
  }
  assert.equal(owners, 152);
  const original = modalInventoryTrees(inventory, keys[0]);
  const ref = r => r.nodes.find(n => n.attributes?.id === 'chip-0');
  const ast = a => a.nodes.find(n => n.authored?.id === 'chip-0');
  const positionRule = r => r.rules[ref(r).rules.find(i => r.rules[i].selector === '.mat-mdc-chip')];
  for (const mutate of [
    ([r]) => { r.ruleEvidenceComplete = false; },
    ([, a]) => { a.ruleEvidenceComplete = false; },
    ([r]) => { ref(r).inline = { top: '1px' }; },
    ([, a]) => { ast(a).authored.style = { position: 'relative' }; },
    ([, a]) => { ast(a).authored.attributes = { style: 'inset:0' }; },
    ([, a]) => { a.rules.push({ selector: '#chip-0', insetInlineStart: '1px' }); },
    ([r]) => { positionRule(r).declarations.position.important = true; },
    ([r]) => { positionRule(r).conditions = ['(min-width: 1px)']; },
    ([r]) => { positionRule(r).active = false; },
    ([r]) => { r.rules[ref(r).rules[0]].cssText += 'inset-inline:1px;'; },
    ([r]) => { r.rules[ref(r).rules[0]].declarations.all = { value: 'initial', important: false }; },
    ([r]) => { r.styles[ref(r).style].left = '1px'; },
    ([, a]) => { ast(a).interactionResolvedStyle.top = '1px'; },
    ([r]) => { ref(r).parent = 'wrong-owner'; },
  ]) {
    const trees = structuredClone(original); mutate(trees);
    assert.throws(() => proveChipPositionRequests(...trees, 'chip-0'));
  }
  assert.throws(() => proveChipPositionRequests(...original, 'chips-primary'));
});

test('chip position attribution conserves ten complete scalar groups and rejects forged membership', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const captured = JSON.parse(bytes);
  const cases = [...captured.results.map(e => ({ ...e, kind: 'static' })),
    ...captured.interactions.map(e => ({ ...e, kind: 'interaction' }))].filter(e => e.family === 'chips');
  const inventory = collectFullTreeInventory(cases), normalize = bindPreciseAuditNormalization();
  const rows = queryFindings('artifacts/material-parity/working-audit', 'chips', {
    generation: '77595d08eb0f857cf058eb072074a433702f11e022dac2f1bfb666375d923752',
    indexSha256: 'd84236477a9da75dc58de0e5d3d48db58c98bab5232d746cdf5d88501ced2459',
  }).filter(row => row.evidence.section === 'discrepancies');
  const before = structuredClone(rows);
  const applied = applyChipPositionRequests(rows, cases, inventory, normalize);
  const changed = applied.filter((row, index) => row !== rows[index]);
  assert.equal(changed.length, 10);
  assert.equal(changed.reduce((sum, row) => sum + row.occurrences, 0), 760);
  assert.equal(changed.filter(row => row.classification === 'application-plugin-authoring-defect').length, 2);
  assert.equal(changed.filter(row => row.classification === 'parity-harness-defect').length, 8);
  assert.deepEqual(rows, before);
  for (const row of changed) {
    assert.equal(row.reviewedCases.length, 76); assert.equal(new Set(row.reviewedCases).size, 76);
    assert.equal(row.reviewEvidence.observations.length, 76);
    const restored = { ...row };
    for (const key of ['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']) delete restored[key];
    Object.assign(restored, row.reviewEvidence.priorMetadata);
    assert.deepEqual(restored, rows.find(original => original.id === row.id));
    assert.equal(row.reviewEvidence.inputEquivalent, false); assert.equal(row.reviewEvidence.renderingEquivalent, false);
  }
  const validate = values => validateChipPositionRequests(values, rows, cases, inventory, normalize);
  assert.deepEqual(validate(applied), []);
  assert.deepEqual(validate(JSON.parse(JSON.stringify(applied))), []);
  const target = values => values.find(row => row.attribution === 'reviewed-chip-computed-offset-stage');
  for (const mutate of [values => values.splice(values.indexOf(target(values)), 1),
    values => values.push(target(values)), values => target(values).reviewedCases.pop(),
    values => { target(values).reviewEvidence.observations[0].referenceComputedOffsets.top = '4px'; },
    values => { target(values).reviewEvidence.inputEquivalent = true; }]) {
    const altered = structuredClone(applied); mutate(altered); assert.ok(validate(altered).length);
  }
  for (const altered of [cases.slice(1), [...cases, cases[0]]])
    assert.throws(() => applyChipPositionRequests(rows, altered, inventory, normalize));
  for (let index = 0; index < rows.length; index++)
    if (!changed.includes(applied[index])) assert.equal(applied[index], rows[index]);
});

test('chips retain three complete source-backed owner groups across 76 states', () => {
  assert.deepEqual(collectChipPositionInspection(), JSON.parse(readFileSync('docs/material-chip-position-inspection.json')));
});
test('chip inspection rejects altered wrapper, selection, position, graphic and sizing', () => {
  const o = collectChipPositionInspection().observations[0];
  const pick = (t, id) => t.nodes.find(n => (n.authored?.id ?? n.attributes?.id) === id);
  for (const mutate of [
    ([r]) => { pick(r, 'chip-0').parent = 'unrelated'; },
    ([, a]) => { pick(a, 'chip-0').authored.ariaSelected = false; },
    ([, a]) => { pick(a, 'chip-0').normalResolvedStyle.position = 'static'; },
    ([, a]) => { pick(a, 'chip-1').resolvedStyle.width = 'auto'; },
    ([r]) => { const n = r.nodes.find(n => n.attributes?.class?.split(/\s+/).includes('mdc-evolution-chip__graphic')); r.styles[n.style].position = 'static'; },
  ]) {
    const trees = ['reference', 'astylar'].map(s => JSON.parse(readFileSync(o.inputTrees[s].file)));
    mutate(trees); assert.throws(() => proveChipPositionInspection(...trees));
  }
});

test('all retained chip states distinguish authored overlay paint from flat background substitution', () => {
  const report = collectChipPositionInspection(); // authenticates every paired tree
  const counts = { owners: 0, visibleLayers: 0, focusWithoutBackgroundChange: 0, selectedHover: 0, selectedHeld: 0 };
  for (const observation of report.observations) {
    const [r, a] = ['reference', 'astylar'].map(side => JSON.parse(readFileSync(observation.inputTrees[side].file)));
    const phase = observation.case.startsWith('static:') ? 'static' : observation.case.split('/').at(-1);
    for (const id of ['chip-0', 'chip-1']) {
      const ref = r.nodes.find(n => n.attributes?.id === id);
      const ast = a.nodes.find(n => n.authored?.id === id);
      const layers = r.nodes.filter(n => n.parent === ref.key && n.attributes?.class === 'mat-mdc-chip-focus-overlay');
      assert.equal(layers.length, 1);
      const style = r.styles[layers[0].style];
      assert.equal(style.position, 'absolute');
      assert.equal(style.pointerEvents, 'none');
      assert.equal(a.nodes.some(n => n.parent === ast.key && !['span', 'showcase.material:check-mark'].includes(n.authored.type)), false);
      counts.owners++;
      if (Number(style.opacity) > 0) counts.visibleLayers++;
      if (id !== 'chip-0') continue;
      if (phase === 'focus' || phase === 'activate-leave') {
        assert.equal(style.opacity, '0.12');
        assert.equal(ast.interactionResolvedStyle.background, ast.normalResolvedStyle.background);
        counts.focusWithoutBackgroundChange++;
      }
      if (phase === 'hover') {
        assert.equal(style.opacity, '0.08');
        assert.equal(style.backgroundColor, 'rgb(73, 69, 78)');
        assert.equal(r.styles[ref.style].backgroundColor, 'rgb(234, 222, 247)');
        assert.equal(ast.interactionResolvedStyle.background, '#ddd2ea');
        // Even the flat-color substitution uses different authored layer ink:
        // rounded native source-over channels would be #ddd2e9, not #ddd2ea.
        assert.deepEqual([234, 222, 247].map((v, i) => Math.round(v * .92 + [73, 69, 78][i] * .08)), [221, 210, 233]);
        counts.selectedHover++;
      }
      if (phase === 'held') {
        assert.equal(style.opacity, '0.12');
        assert.equal(style.backgroundColor, 'rgb(75, 67, 87)');
        assert.equal(ast.interactionResolvedStyle.background, '#d7cbe4');
        counts.selectedHeld++;
      }
    }
  }
  assert.deepEqual(counts, { owners: 152, visibleLayers: 48, focusWithoutBackgroundChange: 16, selectedHover: 8, selectedHeld: 8 });
  const source = readFileSync('examples/material-showcase/src/app/astylar.component.ts', 'utf8');
  assert.ok(source.includes("selector: '.chip.selected:hover', background: mixHex('#eadef7', '#4b4357', .08)"));
  assert.ok(source.includes("selector: '.chip.selected:active', background: mixHex('#eadef7', '#4b4357', .12)"));
  assert.equal(/selector:\s*['"][^'"]*\.chip[^'"]*:focus/.test(source), false);
});

test('chip paint proposal binds ten complete canonical rows without accepting rendering parity', async () => {
  const proposal = await collectChipPaintProposal();
  assert.equal(proposal.groups.length, 10);
  assert.equal(proposal.canonicalAttributionChanged, false);
  assert.equal(new Set(proposal.groups.map(g => g.reviewEvidence.originalCompleteRowSha256)).size, 10);
  for (const group of proposal.groups) {
    assert.equal(group.reviewedCases.length, group.occurrences);
    assert.deepEqual(group.reviewEvidence.observations.map(o => o.case), group.reviewedCases);
    assert.equal(group.reviewEvidence.rendererCauseProven, false);
  }
  const directory = 'artifacts/material-parity/working-audit';
  const compact = queryFindings(directory, 'chips', chipPaintPredecessor);
  assert.throws(() => queryFindings(directory, 'chips', { ...chipPaintPredecessor, indexSha256: '0'.repeat(64) }), /Working index changed/);
  const original = [];
  for (const group of proposal.groups) {
    const finding = compact.find(row => row.evidence.completeRowSha256 === group.reviewEvidence.originalCompleteRowSha256);
    original.push(await loadFindingEvidence(directory, 'chips', finding.id, chipPaintPredecessor));
  }
  const unrelatedFinding = compact.find(row => row.property === 'appearance');
  const unrelated = await loadFindingEvidence(directory, 'chips', unrelatedFinding.id, chipPaintPredecessor);
  original.splice(4, 0, unrelated);
  const before = structuredClone(original);
  const result = await applyChipPaintProposal(original, proposal);
  const parityPath = 'artifacts/material-parity/current-ancestry-audit/latest-report.json';
  const evidence = collectChipPaintAuditInputs(JSON.parse(readFileSync(parityPath)), { parityPath });
  assert.equal(evidence.binding.status, 'bound', evidence.binding.error);
  assert.deepEqual(applyChipPaintAuditRows(original, evidence), result);
  assert.deepEqual(validateChipPaintAuditClassifications(evidence, result), []);
  for (const mutate of [rows => rows.pop(), rows => rows.push(rows[0]), rows => { rows[0].occurrences++; }]) {
    const changed = structuredClone(original); mutate(changed);
    assert.throws(() => applyChipPaintAuditRows(changed, evidence));
  }
  assert.deepEqual(original, before, 'application mutated its input');
  assert.equal(result.length, original.length);
  assert.equal(result[4], unrelated, 'unrelated row must be passed through untouched');
  assert.equal(result.filter(row => row.attribution === 'reviewed-chip-state-layer-substitution').length, 10);
  for (const row of result.filter(row => row !== unrelated)) {
    const restored = structuredClone(row);
    for (const prior of row.reviewEvidence.priorMetadata) {
      if (prior.present) restored[prior.field] = prior.value; else delete restored[prior.field];
    }
    assert.deepEqual(restored, before.find(item => item.element === row.element && item.property === row.property && item.reference === row.reference && item.astylar === row.astylar));
  }
});

test('chip production binding rejects incomplete, foreign and forged evidence', () => {
  const parityPath = 'artifacts/material-parity/current-ancestry-audit/latest-report.json';
  const original = JSON.parse(readFileSync(parityPath));
  const evidence = collectChipPaintAuditInputs(original, { parityPath });
  assert.equal(evidence.binding.status, 'bound', evidence.binding.error);
  assert.equal(evidence.observations.length, 32);
  assert.deepEqual(validateChipPaintAuditInputs(evidence), []);
  for (const mutate of [e => e.observations.pop(), e => { e.review.groups[0].classification = 'equivalent-representation'; },
    e => { e.binding.reviewSource.sha256 = 'forged'; }, e => { e.inputEquivalent = true; }]) {
    const changed = structuredClone(evidence); mutate(changed);
    assert.ok(validateChipPaintAuditInputs(changed).length);
  }
  assert.equal(collectChipPaintAuditInputs({ ...original, results: original.results.slice(1) }, { parityPath }).binding.status, 'invalid');
  assert.equal(collectChipPaintAuditInputs(original, { parityPath: 'docs/material-chip-paint-review.json' }).binding.status, 'invalid');
  const unbound = collectChipPaintAuditInputs({});
  assert.equal(unbound.binding.status, 'unbound');
  assert.throws(() => applyChipPaintAuditRows([{ attribution: 'reviewed-chip-state-layer-substitution' }], unbound));
});
