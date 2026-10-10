import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { collectTabPositionSubstitution, proveTabPositionSubstitution, proveTabControlStage, proveTabWidthInputs } from '../../scripts/audit-material-tab-position-substitution.mjs';
import { applyTabControlStage, validateTabControlStage, applyDialogTextFlow, validateDialogTextFlow } from './modal-position-inspection.mjs';
import { collectFullTreeInventory } from './input-equivalence-audit.mjs';
import { bindPreciseAuditNormalization } from './audit-normalization-contracts.mjs';
import { queryFindings, loadFindingEvidence } from '../../scripts/audit-findings-store.mjs';
import { applyTabWidthOwners, validateTabWidthOwners } from './modal-position-inspection.mjs';
import { inputDifferenceClassifications } from './input-equivalence-policy.mjs';

test('tab stage review preserves raw findings and does not classify typography or unrelated rows', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const captured = JSON.parse(bytes);
  const allCases = [...captured.results.map(c => ({ ...c, kind: 'static' })),
    ...captured.interactions.map(c => ({ ...c, kind: 'interaction' }))];
  const cases = allCases.filter(c => c.family === 'tabs');
  assert.equal(cases.length, 70);
  assert.equal(allCases.length, 2311);
  const inventory = collectFullTreeInventory(allCases), normalize = bindPreciseAuditNormalization();
  const snapshot = { generation: 'ed33d97cd19daa01bdfa984abfaac85e5a5f1dafc6e31fa739400e58b14835e7',
    indexSha256: '626379adeb7777aff365bab1e9a4c9594ad927a2bcbeecf1e8fb08b91907a958' };
  const rows = queryFindings('artifacts/material-parity/working-audit', 'tabs', snapshot)
    .filter(r => r.evidence.section === 'discrepancies' && r.attribution === 'unresolved' &&
      ['tab-overview', 'tab-activity'].includes(r.element) &&
      ['height', 'boxSizing', 'flexShrink', 'lineHeight', 'paddingTop'].includes(r.property))
    .map(({ id, evidence, ...row }) => row);
  const untouched = rows.filter(r => ['lineHeight', 'paddingTop'].includes(r.property));
  assert.equal(untouched.length, 4);
  assert.equal(rows.length, 14);
  const original = structuredClone(rows);
  const applied = applyTabControlStage(rows, cases, inventory, normalize);
  assert.deepEqual(rows, original);
  const changed = applied.filter(r => r.attribution === 'reviewed-tab-control-stage');
  assert.equal(changed.length, 10);
  assert.equal(changed.reduce((n, r) => n + r.occurrences, 0), 420);
  assert.ok(changed.every(r => r.classification === 'parity-harness-defect'));
  assert.ok(changed.every(r => inputDifferenceClassifications.includes(r.classification)));
  for (const row of untouched) assert.ok(applied.includes(row));
  const metadata = new Set(['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']);
  const raw = row => Object.fromEntries(Object.entries(row).filter(([key]) => !metadata.has(key)));
  assert.deepEqual(applied.map(raw), rows.map(raw));
  assert.deepEqual(validateTabControlStage(applied, rows, cases, inventory, normalize), []);
  const dialogProperties = { 'dialog-title': ['display', 'flexShrink', 'paddingTop', 'paddingBottom'],
    'dialog-copy': ['display', 'maxHeight', 'overflowX', 'overflowY', 'paddingTop'] };
  const dialogRows = queryFindings('artifacts/material-parity/working-audit', 'dialog', snapshot)
    .filter(r => r.evidence.section === 'discrepancies' && r.attribution === 'unresolved' && dialogProperties[r.element]?.includes(r.property))
    .map(({ id, evidence, ...row }) => row);
  assert.equal(dialogRows.length, 9);
  const batch = [...rows, ...dialogRows];
  const reviewed = applyTabControlStage(applyDialogTextFlow(batch, allCases, inventory, normalize), allCases, inventory, normalize);
  const reviews = reviewed.filter(r => ['reviewed-tab-control-stage', 'reviewed-dialog-text-flow-inputs'].includes(r.attribution));
  assert.equal(reviews.length, 19);
  assert.equal(reviews.reduce((n, r) => n + r.occurrences, 0), 708);
  assert.deepEqual(reviewed.map(raw), batch.map(raw));
  assert.deepEqual(validateDialogTextFlow(reviewed, batch, allCases, inventory, normalize), []);
  assert.deepEqual(validateTabControlStage(reviewed, batch, allCases, inventory, normalize), []);
  assert.throws(() => applyTabControlStage(rows, cases.slice(1), inventory, normalize));
  assert.throws(() => applyTabControlStage(rows, [...cases, cases[0]], inventory, normalize));
  for (const mutate of [
    values => { values.splice(values.findIndex(r => r.attribution === 'reviewed-tab-control-stage'), 1); },
    values => { values.find(r => r.attribution === 'reviewed-tab-control-stage').reference = 'forged'; },
    values => { values.find(r => r.attribution === 'reviewed-tab-control-stage').reviewEvidence.observations[0].rendererCauseProven = true; },
  ]) {
    const values = structuredClone(applied); mutate(values);
    assert.equal(validateTabControlStage(values, rows, cases, inventory, normalize).length, 1);
  }
});

test('all 140 tab labels compare a different box while three control stages agree', () => {
  const observations = collectTabPositionSubstitution().observations;
  const heights = {}, properties = ['height', 'boxSizing', 'flexShrink'];
  let count = 0, first;
  for (const observation of observations) {
    const trees = ['reference', 'astylar'].map(side => JSON.parse(readFileSync(observation.inputTrees[side].file)));
    first ??= trees;
    for (const id of ['tab-overview', 'tab-activity']) {
      const proof = proveTabControlStage(...trees, id);
      assert.deepEqual(proof.attributableProperties, properties);
      assert.equal(proof.inputEquivalent, false);
      assert.equal(proof.rendererCauseProven, false);
      assert.ok(inputDifferenceClassifications.includes(proof.classification));
      heights[proof.controlValues.height] = (heights[proof.controlValues.height] ?? 0) + 1;
      count++;
    }
  }
  assert.equal(count, 140);
  assert.deepEqual(heights, { '48px': 72, '32px': 34, '40px': 34 });
  for (const stage of ['normalResolvedStyle', 'resolvedStyle', 'interactionResolvedStyle']) {
    for (const property of properties) {
      const trees = structuredClone(first);
      trees[1].nodes.find(n => n.authored?.id === 'tab-overview')[stage][property] = 'forged';
      assert.throws(() => proveTabControlStage(...trees, 'tab-overview'));
    }
  }
  for (const mutate of [
    ([r]) => { const n = r.nodes.find(n => n.attributes?.id === 'tab-overview'); n.parent = n.key; },
    ([r]) => { r.nodes.push(structuredClone(r.nodes.find(n => n.attributes?.id === 'tab-overview'))); },
    ([, a]) => { a.nodes.find(n => n.authored?.id === 'tab-overview').authored.role = 'button'; },
    ([r]) => { r.errors.push('capture failed'); },
  ]) {
    const trees = structuredClone(first); mutate(trees);
    assert.throws(() => proveTabControlStage(...trees, 'tab-overview'));
  }
});
test('all 140 tab width observations retain owner mismatch and unequal control sizing requests', () => {
  const observations = collectTabPositionSubstitution().observations;
  let count = 0, first;
  for (const observation of observations) {
    const trees = ['reference', 'astylar'].map(side => JSON.parse(readFileSync(observation.inputTrees[side].file)));
    first ??= trees;
    for (const id of ['tab-overview', 'tab-activity']) {
      const proof = proveTabWidthInputs(...trees, id);
      assert.equal(proof.measurementClassification, 'parity-harness-defect');
      assert.equal(proof.sizingClassification, 'application-plugin-authoring-defect');
      assert.equal(proof.inputEquivalent, false);
      assert.equal(proof.rendererCauseProven, false);
      count++;
    }
  }
  assert.equal(count, 140);
  const candidate = a => a.nodes.find(n => n.authored?.id === 'tab-overview');
  for (const stage of ['normalResolvedStyle', 'resolvedStyle', 'interactionResolvedStyle']) {
    for (const [property, value] of [['width', 'auto'], ['flexGrow', '1'], ['flexBasis', '50%'], ['minWidth', '90px']]) {
      const trees = structuredClone(first); candidate(trees[1])[stage][property] = value;
      assert.throws(() => proveTabWidthInputs(...trees, 'tab-overview'));
    }
  }
  for (const mutate of [
    ([r]) => { r.styles[r.nodes.find(n => n.attributes?.id === 'tab-overview').style].width = '50%'; },
    ([, a]) => { a.rules.find(r => r.selector === '.tab').width = 'auto'; },
    ([, a]) => { candidate(a).authored.style = { width: '50%' }; },
    ([r]) => { r.rules.find(r => r.selector === '.mdc-tab').declarations['flex-grow'].value = '0'; },
  ]) {
    const trees = structuredClone(first); mutate(trees);
    assert.throws(() => proveTabWidthInputs(...trees, 'tab-overview'));
  }
});

test('tab width integration conserves both complete rows including omitted attribution', async () => {
  const snapshot = { generation: '90c59d984b2a021384f07da008395cfd6dbea59497f27190d0554b4a763767a3',
    indexSha256: '3a8a22a1dae2fd7dab79fd6fac7334b649ab71a6171198dbd658e424ab4800f2' };
  const compact = queryFindings('artifacts/material-parity/working-audit', 'tabs', snapshot)
    .filter(row => row.evidence.section === 'discrepancies' && ['tab-overview', 'tab-activity'].includes(row.element) && row.property === 'width');
  assert.equal(compact.length, 2);
  const loaded = await loadFindingEvidence('artifacts/material-parity/working-audit', 'tabs', compact.map(row => row.id), snapshot);
  const rows = loaded;
  for (const row of rows) {
    assert.equal(Object.hasOwn(row, 'attribution'), false);
    assert.equal(row.occurrences, 70);
  }
  const source = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(source).digest('hex'), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const capture = JSON.parse(source);
  const cases = [...capture.results.map(c => ({ ...c, kind: 'static' })), ...capture.interactions.map(c => ({ ...c, kind: 'interaction' }))]
    .filter(c => c.family === 'tabs');
  const inventory = collectFullTreeInventory(cases), normalize = bindPreciseAuditNormalization();
  const original = structuredClone(rows), applied = applyTabWidthOwners(rows, cases, inventory, normalize);
  assert.deepEqual(rows, original);
  assert.equal(applied.filter(r => r.attribution === 'reviewed-tab-width-owner-inputs').length, 2);
  const metadata = ['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases'];
  for (let i = 0; i < rows.length; i++) {
    const row = applied[i], restored = structuredClone(row);
    assert.equal(row.reviewEvidence.originalRowSha256, createHash('sha256').update(JSON.stringify(rows[i])).digest('hex'));
    assert.equal(row.reviewEvidence.observations.length, 70);
    assert.equal(Object.hasOwn(row.reviewEvidence.priorMetadata, 'attribution'), false);
    const prior = row.reviewEvidence.priorMetadata;
    for (const key of metadata) delete restored[key];
    Object.assign(restored, prior);
    assert.deepEqual(restored, rows[i]);
  }
  assert.deepEqual(validateTabWidthOwners(applied, rows, cases, inventory, normalize), []);
  for (const mutate of [
    rows => rows.pop(),
    rows => { rows[0].reference = 'forged'; },
    rows => { rows[0].reviewEvidence.priorMetadata.attribution = 'unresolved'; },
    rows => { rows[0].reviewEvidence.observations[0].rendererCauseProven = true; },
  ]) {
    const changed = structuredClone(applied); mutate(changed);
    assert.equal(validateTabWidthOwners(changed, original, cases, inventory, normalize).length, 1);
  }
  assert.throws(() => applyTabWidthOwners(rows, cases.slice(1), inventory, normalize));
  assert.throws(() => applyTabWidthOwners(rows, [...cases, cases[0]], inventory, normalize));
});

test('all 70 tab cases retain the border-to-positioned-strip substitution', () => {
  assert.deepEqual(collectTabPositionSubstitution(), JSON.parse(readFileSync('docs/material-tab-position-substitution.json')));
});
test('tab proof rejects changed border ownership, positioning and calibrated width evidence', () => {
  const o = collectTabPositionSubstitution().observations[0];
  const find = (t, id) => t.nodes.find(n => (n.attributes?.id ?? n.authored?.id) === id);
  const base = t => t.nodes.find(n => n.attributes?.class?.split(/\s+/).includes('mat-mdc-tab-label-container'));
  for (const mutate of [
    ([r]) => { r.styles[base(r).style].borderBottomWidth = '0px'; },
    ([r]) => { base(r).parent = find(r, 'tabs-primary').key; },
    ([, a]) => { find(a, 'tabs-primary').interactionResolvedStyle.position = 'static'; },
    ([, a]) => { find(a, 'tab-baseline').normalResolvedStyle.position = 'relative'; },
    ([, a]) => { find(a, 'tab-indicator').parent = find(a, 'tabs-list').key; },
    ([, a]) => { find(a, 'tab-indicator').resolvedStyle.width = '50%'; },
    ([r]) => { r.errors.push('failed capture'); },
  ]) {
    const trees = ['reference', 'astylar'].map(s => JSON.parse(readFileSync(o.inputTrees[s].file)));
    mutate(trees); assert.throws(() => proveTabPositionSubstitution(...trees));
  }
});
