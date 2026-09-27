import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { queryFindings } from '../../scripts/audit-findings-store.mjs';
import { fixedHeightOwners, proveFixedHeightRequest } from './control-height-request-review.mjs';
import { collectFullTreeInventory } from './input-equivalence-audit.mjs';
import { modalInventoryTrees } from './modal-position-inspection.mjs';

test('all 14 remaining fixed-height groups preserve owner requests and stage boundaries', () => {
  const hash = b => createHash('sha256').update(b).digest('hex');
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(hash(bytes), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const raw = JSON.parse(bytes), cases = [...raw.results.map(e => ({ ...e, kind: 'static' })),
    ...raw.interactions.map(e => ({ ...e, kind: 'interaction' }))];
  const snapshot = { generation: 'e25dab5fef84be5038dc83bff954f0681c3661c86bb0dd546dd118876d842760',
    indexSha256: '230d42b303bfd104b444d5c7e42ad0f69ce79ba943adc5bc144cca89aded585f' };
  const rows = [...new Set(cases.map(e => e.family))].flatMap(f => queryFindings('artifacts/material-parity/working-audit', f, snapshot))
    .filter(r => r.attribution === 'unresolved' && r.property === 'height' && r.astylar !== undefined);
  assert.equal(rows.length, 14);
  const inventory = collectFullTreeInventory(cases); assert.deepEqual(inventory.errors, []);
  const cache = new Map(), read = d => {
    if (!cache.has(d.file)) { const b = readFileSync(d.file); cache.set(d.file, { sha: hash(b), tree: JSON.parse(b) }); }
    const v = cache.get(d.file); assert.equal(v.sha, d.sha256); return v.tree;
  };
  let total = 0, token = 0;
  for (const row of rows) {
    assert.ok(Object.hasOwn(fixedHeightOwners, row.element));
    const members = cases.filter(e => e.family === row.family && row.states.includes(e.state ?? 'static') &&
      e.styleInputs.some(i => i.id === row.element && i.astylar.height === row.astylar &&
        (i.reference.height === row.reference || i.reference.height === '0px' && row.reference === '0')));
    assert.equal(members.length, row.occurrences);
    for (const entry of members) {
      read(entry.inputTrees.reference); read(entry.inputTrees.astylar);
      const input = entry.styleInputs.find(i => i.id === row.element);
      const [r, a] = modalInventoryTrees(inventory,
        `${entry.kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`);
      const proof = proveFixedHeightRequest(entry, input, r, a); total++;
      if (row.family === 'progress-bar') token++;
      assert.equal(proof.candidateUsedLayoutVerified, false); assert.equal(proof.inputEquivalent, false);
      if (entry === members[0]) {
        const changed = structuredClone(a); changed.rules.push({ selector: '#' + row.element, blockSize: '10px' });
        assert.throws(() => proveFixedHeightRequest(entry, input, r, changed));
        const changedReference = structuredClone(r);
        changedReference.nodes.find(n => n.key === proof.referenceNode).inline.height = { value: '10px', important: false };
        assert.throws(() => proveFixedHeightRequest(entry, input, changedReference, a));
        const changedStage = structuredClone(a);
        changedStage.nodes.find(n => n.key === proof.astylarNode).normalResolvedStyle.height = '999px';
        assert.throws(() => proveFixedHeightRequest(entry, input, r, changedStage));
      }
    }
  }
  assert.equal(total, 338); assert.equal(token, 20);
});
