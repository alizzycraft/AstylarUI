import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { queryFindings } from '../../scripts/audit-findings-store.mjs';
import { proveExplicitBoxSizing, explicitBoxSizingTargets, proveNativeBoxSizingRequest, nativeBoxSizingTargets } from './box-sizing-authoring-review.mjs';

const hash = b => createHash('sha256').update(b).digest('hex');
const keyOf = e => `${e.kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`;
test('all ten explicit box-sizing populations preserve declarations, owners and uncertainty', () => {
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
