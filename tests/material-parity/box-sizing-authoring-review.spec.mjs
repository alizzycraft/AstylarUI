import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { queryFindings } from '../../scripts/audit-findings-store.mjs';
import { proveExplicitBoxSizing, explicitBoxSizingTargets, proveNativeBoxSizingRequest, nativeBoxSizingTargets,
  proveBoxSizingOmission, applyBoxSizingReviews, validateBoxSizingReviews, replayBoxSizingPredecessors, boxSizingReviewAttributions } from './box-sizing-authoring-review.mjs';
import { collectFullTreeInventory } from './input-equivalence-audit.mjs';
import { bindPreciseAuditNormalization } from './audit-normalization-contracts.mjs';

const hash = b => createHash('sha256').update(b).digest('hex');
const keyOf = e => `${e.kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`;
test('all ten canonical explicit box-sizing populations preserve declarations, owners and uncertainty', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(hash(bytes), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const raw = JSON.parse(bytes), cases = [...raw.results.map(e => ({ ...e, kind: 'static' })),
    ...raw.interactions.map(e => ({ ...e, kind: 'interaction' }))];
  const snapshot = { generation: '462dddc705e4be1cfb3be863b9707f579782f8c440759c31f59185718acbc651',
    indexSha256: '093a70699e5e2016095ecc92d42a3e77ca2f9964ae7dc493d5829d9111cc2d4c' };
  const cache = new Map();
  const read = d => { if (!cache.has(d.file)) { const b = readFileSync(d.file); cache.set(d.file, { hash: hash(b), tree: JSON.parse(b) }); }
    const item = cache.get(d.file); assert.equal(item.hash, d.sha256); return item.tree; };
  let total = 0;
  for (const [element, [family, , count]] of Object.entries(explicitBoxSizingTargets)) {
    // Expansion is a newly authenticated reference-rule substitution whose
    // predecessor compact snapshot predates this owner; the cold export
    // exercises it against the current capture separately.
    if (element === 'expansion-primary') continue;
    const rows = queryFindings('artifacts/material-parity/working-audit', family, snapshot)
      .filter(r => r.element === element && r.property === 'boxSizing' && r.attribution === 'unresolved');
    assert.equal(rows.length, 1); const row = rows[0];
    assert.equal(row.reference, 'content-box'); assert.equal(row.astylar, 'border-box');
    const members = cases.filter(e => e.family === family && row.states.includes(e.state ?? 'static') &&
      e.styleInputs.some(i => i.id === element && i.reference.boxSizing === row.reference && i.astylar.boxSizing === row.astylar));
    assert.equal(members.length, count); assert.equal(row.occurrences, count);
    assert.deepEqual(members.slice(0, 12).map(keyOf), row.cases);
    for (const entry of members) {
      const input = entry.styleInputs.find(i => i.id === element), r = read(entry.inputTrees.reference), a = read(entry.inputTrees.astylar);
      const proof = proveExplicitBoxSizing(entry, input, r, a); total++;
      assert.equal(proof.inputEquivalent, false); assert.equal(proof.rendererCauseProven, false);
      if (entry === members[0]) {
        const changed = structuredClone(a);
        changed.rules.push({ selector: `#${element}`, boxSizing: 'content-box' });
        assert.throws(() => proveExplicitBoxSizing(entry, input, r, changed));
        const wrongStage = structuredClone(input); wrongStage.astylarNormalResolvedStyle.boxSizing = 'content-box';
        assert.throws(() => proveExplicitBoxSizing(entry, wrongStage, r, a));
        const nativeRequest = structuredClone(r);
        const native = nativeRequest.nodes.find(n => n.key === proof.referenceNode);
        native.rules.push(nativeRequest.rules.length);
        nativeRequest.rules.push({ active: true, selector: '*', conditions: [],
          declarations: { 'box-sizing': { value: 'content-box', important: false } } });
        assert.throws(() => proveExplicitBoxSizing(entry, input, nativeRequest, a));
      }
    }
  }
  assert.equal(total, 621);
});

test('six native border-box requests retain all 290 omitted candidate observations', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(hash(bytes), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const raw = JSON.parse(bytes), cases = [...raw.results.map(e => ({ ...e, kind: 'static' })),
    ...raw.interactions.map(e => ({ ...e, kind: 'interaction' }))];
  const snapshot = { generation: '462dddc705e4be1cfb3be863b9707f579782f8c440759c31f59185718acbc651',
    indexSha256: '093a70699e5e2016095ecc92d42a3e77ca2f9964ae7dc493d5829d9111cc2d4c' };
  const cache = new Map();
  const read = d => { if (!cache.has(d.file)) { const b = readFileSync(d.file); cache.set(d.file, { hash: hash(b), tree: JSON.parse(b) }); }
    const item = cache.get(d.file); assert.equal(item.hash, d.sha256); return item.tree; };
  let total = 0;
  for (const [element, [family, , count]] of Object.entries(nativeBoxSizingTargets)) {
    const rows = queryFindings('artifacts/material-parity/working-audit', family, snapshot)
      .filter(r => r.element === element && r.property === 'boxSizing' && r.attribution === 'unresolved');
    assert.equal(rows.length, 1); const row = rows[0];
    assert.equal(row.reference, 'border-box'); assert.equal(row.astylar, undefined);
    const members = cases.filter(e => e.family === family && row.states.includes(e.state ?? 'static') &&
      e.styleInputs.some(i => i.id === element && i.reference.boxSizing === row.reference && i.astylar.boxSizing === undefined));
    assert.equal(members.length, count); assert.equal(row.occurrences, count);
    assert.deepEqual(members.slice(0, 12).map(keyOf), row.cases);
    for (const entry of members) {
      const input = entry.styleInputs.find(i => i.id === element), r = read(entry.inputTrees.reference), a = read(entry.inputTrees.astylar);
      const proof = proveNativeBoxSizingRequest(entry, input, r, a); total++;
      assert.equal(proof.usedGeometryVerified, false); assert.equal(proof.candidateComputedVerified, false);
      if (entry === members[0]) {
        const changed = structuredClone(a); changed.rules.push({ selector: `#${element}`, boxSizing: 'border-box' });
        assert.throws(() => proveNativeBoxSizingRequest(entry, input, r, changed));
        const changedNative = structuredClone(r);
        const native = changedNative.nodes.find(n => n.key === proof.referenceNode);
        const rule = native.rules.map(i => changedNative.rules[i]).find(r => r.active && r.declarations['box-sizing']);
        rule.declarations['box-sizing'].value = 'content-box';
        assert.throws(() => proveNativeBoxSizingRequest(entry, input, changedNative, a));
      }
    }
  }
  assert.equal(total, 290);
});

test('remaining 33 omission populations keep computed/local and table UA boundaries', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(hash(bytes), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const raw = JSON.parse(bytes), cases = [...raw.results.map(e => ({ ...e, kind: 'static' })),
    ...raw.interactions.map(e => ({ ...e, kind: 'interaction' }))];
  const snapshot = { generation: '462dddc705e4be1cfb3be863b9707f579782f8c440759c31f59185718acbc651',
    indexSha256: '093a70699e5e2016095ecc92d42a3e77ca2f9964ae7dc493d5829d9111cc2d4c' };
  const families = [...new Set(cases.map(e => e.family))];
  const rows = families.flatMap(f => queryFindings('artifacts/material-parity/working-audit', f, snapshot))
    .filter(r => r.property === 'boxSizing' && r.attribution === 'unresolved' && r.astylar === undefined &&
      (r.reference === 'content-box' || r.element === 'table-primary'));
  assert.equal(rows.length, 33);
  const cache = new Map();
  const read = d => { if (!cache.has(d.file)) { const b = readFileSync(d.file); cache.set(d.file, { hash: hash(b), tree: JSON.parse(b) }); }
    const item = cache.get(d.file); assert.equal(item.hash, d.sha256); return item.tree; };
  let total = 0, table = 0;
  for (const row of rows) {
    const members = cases.filter(e => e.family === row.family && row.states.includes(e.state ?? 'static') &&
      e.styleInputs.some(i => i.id === row.element && i.reference.boxSizing === row.reference && i.astylar.boxSizing === undefined));
    assert.equal(members.length, row.occurrences); assert.ok(members.length);
    assert.deepEqual(members.slice(0, 12).map(keyOf), row.cases);
    for (const entry of members) {
      const input = entry.styleInputs.find(i => i.id === row.element), r = read(entry.inputTrees.reference), a = read(entry.inputTrees.astylar);
      const proof = proveBoxSizingOmission(entry, input, r, a); total++;
      if (row.element === 'table-primary') table++;
      assert.equal(proof.inputEquivalent, false); assert.equal(proof.candidateComputedVerified, false);
      assert.equal(proof.nativeUserAgentRuleCaptured, false);
      if (entry === members[0]) {
        const changed = structuredClone(a); changed.rules.push({ selector: `#${row.element}`, boxSizing: 'content-box' });
        assert.throws(() => proveBoxSizingOmission(entry, input, r, changed));
      }
    }
  }
  assert.equal(total, 1746); assert.equal(table, 52);
});

test('existing scalar join changes only the 49 prepared groups and preserves every raw value', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(hash(bytes), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const raw = JSON.parse(bytes), cases = [...raw.results.map(e => ({ ...e, kind: 'static' })),
    ...raw.interactions.map(e => ({ ...e, kind: 'interaction' }))];
  const snapshot = { generation: 'e25dab5fef84be5038dc83bff954f0681c3661c86bb0dd546dd118876d842760',
    indexSha256: '230d42b303bfd104b444d5c7e42ad0f69ce79ba943adc5bc144cca89aded585f' };
  const rows = [...new Set(cases.map(e => e.family))].flatMap(f => queryFindings('artifacts/material-parity/working-audit', f, snapshot))
    .filter(r => r.evidence.section === 'discrepancies');
  assert.equal(rows.length, 8483);
  const inventory = collectFullTreeInventory(cases); assert.deepEqual(inventory.errors, []);
  const result = applyBoxSizingReviews(rows, cases, inventory, bindPreciseAuditNormalization());
  const mutable = new Set(['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']);
  const rawRow = r => Object.fromEntries(Object.entries(r).filter(([k]) => !mutable.has(k)));
  const counts = new Map(); let untouched = 0;
  for (let i = 0; i < rows.length; i++) {
    assert.deepEqual(rawRow(result[i]), rawRow(rows[i]));
    if (!boxSizingReviewAttributions.includes(result[i].attribution)) {
      assert.deepEqual(result[i], rows[i]); untouched++; continue;
    }
    const evidence = result[i].reviewEvidence;
    assert.equal(evidence.originalRowSha256, hash(JSON.stringify(rows[i])));
    assert.equal(evidence.observations.length, rows[i].occurrences);
    assert.equal(result[i].reviewedCases.length, rows[i].occurrences);
    assert.equal(evidence.inputEquivalent, false); assert.equal(evidence.renderingEquivalent, false);
    for (const proof of evidence.observations) {
      assert.equal(proof.rendererCauseProven, false); assert.equal(proof.usedGeometryVerified, false);
    }
    const count = counts.get(result[i].attribution) ?? [0, 0]; count[0]++; count[1] += rows[i].occurrences;
    counts.set(result[i].attribution, count);
  }
  assert.equal(untouched, 8434);
  assert.deepEqual(boxSizingReviewAttributions.map(k => counts.get(k)), [[10, 621], [6, 290], [33, 1746]]);
  const normalize = bindPreciseAuditNormalization();
  const priorAttributions = ['reviewed-bottom-sheet-action-layout-substitution',
    'reviewed-bottom-sheet-panel-constraint-omission', 'reviewed-dialog-panel-constraint-omission', 'reviewed-tab-control-stage'];
  const prior = rows.filter(r => r.property === 'boxSizing' && priorAttributions.includes(r.attribution));
  assert.equal(prior.length, 6);
  const replayed = replayBoxSizingPredecessors(prior.map(r => ({ ...r, attribution: 'unresolved' })), cases, inventory, normalize);
  assert.deepEqual(replayed.map(r => r.attribution), prior.map(r => r.attribution));
  assert.deepEqual(applyBoxSizingReviews(replayed, cases, inventory, normalize), replayed);
  assert.deepEqual(validateBoxSizingReviews(result, rows, cases, inventory, normalize), []);
  // Each attribution must reject fabricated geometry/equivalence and a missing
  // receipt. Replaying one original group per mutation keeps this focused.
  for (const attribution of boxSizingReviewAttributions) {
    const index = result.findIndex(r => r.attribution === attribution);
    const before = [rows[index]], submitted = [result[index]];
    for (const mutate of [
      r => { r.reviewEvidence.observations[0].usedGeometryVerified = true; },
      r => { r.reviewEvidence.inputEquivalent = true; },
      r => { r.reviewEvidence.observations.pop(); },
      r => { r.reference = 'fabricated'; },
      r => { r.attribution = 'unresolved'; },
    ]) {
      const changed = structuredClone(submitted); mutate(changed[0]);
      assert.equal(validateBoxSizingReviews(changed, before, cases, inventory, normalize).length, 1);
    }
    assert.equal(validateBoxSizingReviews([], before, cases, inventory, normalize).length, 1);
  }
  const untouchedIndex = result.findIndex(r => !boxSizingReviewAttributions.includes(r.attribution));
  const original = [rows[untouchedIndex]], changed = structuredClone(original);
  changed[0].justification = 'unrelated mutation';
  assert.equal(validateBoxSizingReviews(changed, original, cases, inventory, normalize).length, 1);
  assert.equal(validateBoxSizingReviews([...original, ...original], original, cases, inventory, normalize).length, 1);
});
