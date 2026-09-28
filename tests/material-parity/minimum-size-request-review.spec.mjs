import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { queryFindings } from '../../scripts/audit-findings-store.mjs';
import { collectFullTreeInventory } from './input-equivalence-audit.mjs';
import { modalInventoryTrees } from './modal-position-inspection.mjs';
import { bindPreciseAuditNormalization } from './audit-normalization-contracts.mjs';
import { minimumSizeOwners, proveMinimumSizeRequest, applyMinimumSizeReviews } from './minimum-size-request-review.mjs';

test('all 41 minimum-size groups retain raw evidence and separate requests from observation boundaries', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const capture = JSON.parse(bytes);
  const cases = [...capture.results.map(entry => ({ ...entry, kind: 'static' })), ...capture.interactions.map(entry => ({ ...entry, kind: 'interaction' }))];
  const inventory = collectFullTreeInventory(cases); assert.deepEqual(inventory.errors, []);
  const rows = [...new Set(minimumSizeOwners.map(([family]) => family))].flatMap(family => queryFindings('artifacts/material-parity/working-audit', family, {
    generation: 'a593d4c7e804b6cf5ba863163122fde6cb31774c88c5fe6f97f6504cee2fa948',
    indexSha256: 'c5224eea34da7aa30570bcad482ac04e55c39ba0a8988a0d7ec0b88629f350c1',
  })).filter(row => row.evidence.section === 'discrepancies');
  const reviewed = applyMinimumSizeReviews(rows, cases, inventory, bindPreciseAuditNormalization());
  const changes = reviewed.filter((row, index) => row !== rows[index]);
  assert.equal(changes.length, 41); assert.equal(changes.reduce((n, row) => n + row.occurrences, 0), 2197);
  const explicit = changes.filter(row => row.attribution === 'reviewed-minimum-size-request-omission');
  assert.equal(explicit.length, 8); assert.equal(explicit.reduce((n, row) => n + row.occurrences, 0), 402);
  const boundary = changes.filter(row => row.attribution === 'reviewed-minimum-size-observation-boundary');
  assert.equal(boundary.length, 33); assert.equal(boundary.reduce((n, row) => n + row.occurrences, 0), 1795);
  const metadata = new Set(['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']);
  const raw = row => Object.fromEntries(Object.entries(row).filter(([key]) => !metadata.has(key)));
  reviewed.forEach((row, index) => {
    assert.deepEqual(raw(row), raw(rows[index]));
    if (row !== rows[index]) {
      assert.equal(rows[index].attribution, 'unresolved');
      assert.equal(row.reviewEvidence.renderingEquivalent, false);
      assert.equal(row.reviewEvidence.observations.length, row.occurrences);
      row.reviewEvidence.observations.forEach(proof => assert.equal(proof.candidateUsedMinimumVerified, false));
    }
  });
  let mutations = 0;
  for (const [family, element, , , properties = ['minWidth', 'minHeight']] of minimumSizeOwners) for (const property of properties) {
    const entry = cases.find(entry => entry.family === family && entry.styleInputs.some(input => input.id === element));
    const [r, a] = modalInventoryTrees(inventory, `${entry.kind}:${family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`);
    const proof = proveMinimumSizeRequest(entry, r, a, element, property);
    const cssProperty = property === 'minWidth' ? 'min-width' : 'min-height';
    const native = structuredClone(r); native.nodes.find(node => node.key === proof.referenceNode).inline[cssProperty] = { value: '0px', important: false };
    assert.throws(() => proveMinimumSizeRequest(entry, native, a, element, property));
    const serialized = structuredClone(r), owner = serialized.nodes.find(node => node.key === proof.referenceNode);
    const rule = owner.rules.find(index => serialized.rules[index].active);
    if (rule === undefined) {
      owner.rules.push(serialized.rules.length);
      serialized.rules.push({ selector: '#injected-minimum', active: true, conditions: [], declarations: {}, cssText: `${cssProperty}: 0px;` });
    } else serialized.rules[rule].cssText += ` ${cssProperty}: 0px;`;
    assert.throws(() => proveMinimumSizeRequest(entry, serialized, a, element, property));
    const candidate = structuredClone(a); candidate.rules.push({ selector: '#' + element, [property === 'minWidth' ? 'minInlineSize' : 'minBlockSize']: '0' });
    assert.throws(() => proveMinimumSizeRequest(entry, r, candidate, element, property));
    const stage = structuredClone(a); stage.nodes.find(node => node.key === proof.astylarNode).interactionResolvedStyle[property] = 'auto';
    assert.throws(() => proveMinimumSizeRequest(entry, r, stage, element, property));
    mutations++;
  }
  assert.equal(mutations, 41);
});
