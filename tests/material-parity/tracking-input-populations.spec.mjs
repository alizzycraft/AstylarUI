import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { collectFullTreeInventory, collectRetainedTypographyEvidence } from './input-equivalence-audit.mjs';
import { modalInventoryTrees } from './modal-position-inspection.mjs';
import { queryFindings } from '../../scripts/audit-findings-store.mjs';
import { bindPreciseAuditNormalization } from './audit-normalization-contracts.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const one = values => { assert.equal(values.length, 1); return values[0]; };
const keyOf = e => `${e.kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`;

test('seven nonzero tracking scalar groups distinguish 340 retained label omissions from 136 host tokens', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(hash(bytes), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const raw = JSON.parse(bytes), cases = [...raw.results.map(e => ({ ...e, kind: 'static' })),
    ...raw.interactions.map(e => ({ ...e, kind: 'interaction' }))];
  // Global ordering is necessary to replay accepted retained-proof hashes.
  const inventory = collectFullTreeInventory(cases); assert.deepEqual(inventory.errors, []);
  const families = ['checkbox', 'radio', 'slide-toggle', 'expansion', 'button-toggle'];
  const selected = cases.filter(e => families.includes(e.family));
  const retained = collectRetainedTypographyEvidence(selected, inventory);
  const snapshot = { generation: 'baf0ccb8d7f5adad44efff3a8e165448e550b7455999a182ce138975b2bfff3b',
    indexSha256: '00e5b5296d3d4af5ee27086fc41db3fbc21238bb6ee8b6a36315be68d25d60e0' };
  const accepted = families.flatMap(family => queryFindings('artifacts/material-parity/working-audit', family, snapshot));
  const rows = accepted.filter(r => r.evidence.section === 'discrepancies' && r.attribution === 'unresolved' &&
    r.property === 'letterSpacing' && r.reference !== '0');
  assert.equal(rows.length, 7);
  const normalize = bindPreciseAuditNormalization();
  let labels = 0, hosts = 0;
  for (const row of rows) {
    const members = selected.filter(e => e.family === row.family && e.styleInputs.some(i =>
      i.id === row.element && normalize(i.reference).letterSpacing === row.reference && normalize(i.astylar).letterSpacing === undefined));
    assert.equal(members.length, row.occurrences); assert.equal(new Set(members.map(keyOf)).size, members.length);
    assert.deepEqual(members.slice(0, 12).map(keyOf), row.cases);
    for (const entry of members) {
      const key = keyOf(entry), input = one(entry.styleInputs.filter(i => i.id === row.element));
      const [r, a] = modalInventoryTrees(inventory, key);
      const native = one(r.nodes.filter(n => n.attributes?.id === row.element));
      const candidate = one(a.nodes.filter(n => n.authored?.id === row.element));
      // Full-tree styles retain more properties than the 89-field scalar view.
      assert.equal(Object.keys(input.reference).length, 89);
      for (const [property, value] of Object.entries(input.reference)) assert.equal(r.styles[native.style][property], value);
      for (const [stage, scalar] of [['resolvedStyle', 'astylar'], ['normalResolvedStyle', 'astylarNormalResolvedStyle'],
        ['interactionResolvedStyle', 'astylarInteractionResolvedStyle']]) assert.deepEqual(candidate[stage], input[scalar]);
      if (row.family !== 'button-toggle') {
        const proof = one(retained.differences.filter(d => d.case === key && d.element === row.element && d.property === 'letterSpacing'));
        const receipt = one(accepted.filter(d => d.evidence.section === 'retainedTypography.differences' &&
          d.case === key && d.element === row.element && d.property === 'letterSpacing'));
        assert.equal(hash(JSON.stringify(proof)), receipt.evidence.completeRowSha256);
        assert.equal(proof.referenceNode, native.key); assert.equal(proof.astylarNode, candidate.key);
        assert.equal(proof.attribution, 'reviewed-omitted-component-text-metric');
        assert.equal(proof.classification, 'application-plugin-authoring-defect');
        assert.deepEqual(proof.values, { reference: row.reference, retained: '0', normal: undefined, effective: undefined });
        labels++;
      } else {
        assert.equal(row.reference, '0.096px'); assert.equal(native.type, 'mat-button-toggle');
        const label = one(retained.comparisons.filter(c => c.case === key && c.element === `${row.element}-label`));
        const leaf = one(r.nodes.filter(n => n.key === label.referenceNode));
        const button = one(r.nodes.filter(n => n.key === leaf.parent));
        assert.equal(leaf.type, 'span'); assert.equal(button.type, 'button'); assert.equal(button.parent, native.key);
        for (const n of [leaf, button]) {
          assert.equal(r.styles[n.style].letterSpacing, 'normal');
          assert.ok(!n.rules.map(i => r.rules[i]).some(rule => rule.active &&
            Object.keys(rule.declarations).some(k => ['letter-spacing', 'all'].includes(k))));
        }
        const token = one(native.rules.map(i => r.rules[i]).filter(rule => rule.active && rule.selector === '.mat-button-toggle-appearance-standard'));
        assert.deepEqual(token.declarations['letter-spacing'], {
          value: 'var(--mat-button-toggle-label-text-tracking, var(--mat-sys-label-large-tracking))', important: false });
        const astLabel = one(a.nodes.filter(n => n.key === label.astylarNode));
        assert.equal(astLabel.parent, candidate.key); assert.equal(astLabel.authored.id, `${row.element}-label`);
        assert.deepEqual(label.properties.letterSpacing, { reference: '0', retained: '0', normal: undefined, effective: undefined });
        hosts++;
      }
    }
  }
  assert.equal(labels, 340); assert.equal(hosts, 136);
  // No classification mutation: equal leaf zeros do not establish host token,
  // inheritance, current glyph paint or rendering equivalence.
});
