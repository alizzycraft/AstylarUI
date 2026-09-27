import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { queryFindings } from '../../scripts/audit-findings-store.mjs';
import { inspectOwnerGridInitial } from './owner-grid-initial-evidence.mjs';
import { proveMappedGridTemplateOmission } from './mapped-grid-template-review.mjs';

test('mapped grid owners preserve all 884 original observations and reject explicit grid requests', () => {
  const hash = b => createHash('sha256').update(b).digest('hex');
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(hash(bytes), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const raw = JSON.parse(bytes), cases = [...raw.results.map(e => ({ ...e, kind: 'static' })),
    ...raw.interactions.map(e => ({ ...e, kind: 'interaction' }))];
  const snapshot = { generation: 'e25dab5fef84be5038dc83bff954f0681c3661c86bb0dd546dd118876d842760',
    indexSha256: '230d42b303bfd104b444d5c7e42ad0f69ce79ba943adc5bc144cca89aded585f' };
  const rows = [...new Set(cases.map(e => e.family))].flatMap(f => queryFindings('artifacts/material-parity/working-audit', f, snapshot))
    .filter(r => r.attribution === 'unresolved' && ['gridTemplateColumns', 'gridTemplateRows'].includes(r.property) && r.astylar === undefined);
  const cache = new Map();
  const read = d => {
    if (!cache.has(d.file)) { const b = readFileSync(d.file); cache.set(d.file, { hash: hash(b), tree: JSON.parse(b) }); }
    const item = cache.get(d.file); assert.equal(item.hash, d.sha256); return item.tree;
  };
  let total = 0, gaps = 0;
  const tested = new Set();
  for (const row of rows) {
    const members = cases.filter(e => e.family === row.family && row.states.includes(e.state ?? 'static') &&
      e.styleInputs.some(i => i.id === row.element && i.reference[row.property] === 'none' && i.astylar[row.property] === undefined));
    assert.equal(members.length, row.occurrences);
    for (const entry of members) {
      const input = entry.styleInputs.find(i => i.id === row.element), r = read(entry.inputTrees.reference), a = read(entry.inputTrees.astylar);
      const survey = inspectOwnerGridInitial(input, row.property, r, a);
      if (!survey.issues.some(i => i.reason === 'owner-mapping')) continue;
      const proof = proveMappedGridTemplateOmission(entry, input, r, a, row.property);
      total++; if (proof.identity.status === 'mapped-with-scalar-rule-gap') gaps++;
      assert.equal(proof.inputEquivalent, false); assert.equal(proof.gridLayoutEquivalent, false);
      assert.equal(proof.motionTargetsVerified, false); assert.equal(proof.candidateComputedVerified, false);
      const key = row.element + '/' + row.property;
      if (!tested.has(key)) {
        tested.add(key);
        for (const declaration of [{ gridTemplateRows: '1fr' }, { grid: 'none' }, { all: 'initial' }]) {
          const changed = structuredClone(a); changed.rules.push({ selector: '#' + row.element, ...declaration });
          assert.throws(() => proveMappedGridTemplateOmission(entry, input, r, changed, row.property));
        }
        const changedReference = structuredClone(r);
        changedReference.nodes.find(n => n.key === proof.referenceNode).inline.grid = { value: 'none', important: false };
        assert.throws(() => proveMappedGridTemplateOmission(entry, input, changedReference, a, row.property));
      }
    }
  }
  assert.equal(total, 884); assert.equal(gaps, 118);
});
