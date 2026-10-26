import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { collectFullTreeInventory } from './input-equivalence-audit.mjs';

// Observation only: do not normalize an absent candidate field to a CSS value.
function verifyRecordedVisibility(inventory) {
  for (const key of ['gaps', 'resolvedStyleGaps', 'stateStyleGaps', 'errors'])
    assert.deepEqual(inventory[key], []);
  const counts = { reference: 0, astylar: 0 };
  let envelopes = 0;
  for (const entry of inventory.cases) {
    const variant = inventory.variants[entry.variant];
    for (const index of variant.rules ?? []) {
      const declarations = inventory.rules[index].value.declarations ?? {};
      assert.ok(!Object.keys(declarations).some(key => key.toLowerCase() === 'visibility'));
    }
    for (const node of variant.nodes) {
      if (entry.side === 'astylar' && !node.authored?.type) {
        assert.equal(node.key, 'root');
        assert.equal(node.parent, null);
        envelopes++;
        continue;
      }
      const style = inventory.styles[node.style].value;
      if (entry.side === 'reference') assert.equal(style.visibility, 'visible');
      else assert.equal(Object.hasOwn(style, 'visibility'), false);
      for (const index of node.rules ?? []) {
        const declarations = inventory.rules[index].value.declarations ?? {};
        assert.ok(!Object.keys(declarations).some(key => key.toLowerCase() === 'visibility'));
      }
      assert.ok(!Object.keys(node.inline ?? {}).some(key => key.toLowerCase() === 'visibility'));
      assert.ok(!Object.keys(node.authored?.style ?? {}).some(key => key.toLowerCase() === 'visibility'));
      counts[entry.side]++;
    }
  }
  assert.deepEqual(counts, { reference: 216, astylar: 216 });
  assert.equal(envelopes, 24);
  return counts;
}

test('retained Divider visible inputs stay distinct from omitted candidate visibility', () => {
  const bytes = readFileSync('artifacts/material-parity/current-full-20261005/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'),
    'ab42dbec6280e0e27784ec4bbc6697d4ea451bfab307bccb720c0dec89a83b62');
  const report = JSON.parse(bytes);
  const cases = [...report.results, ...report.interactions].filter(row => row.family === 'divider');
  assert.equal(cases.length, 24);
  // The existing adapter authenticates each paired tree against its capture receipt.
  const inventory = collectFullTreeInventory(cases);
  verifyRecordedVisibility(inventory);
  const reference = inventory.styles.find(row => row.side === 'reference');
  for (const value of ['hidden', 'collapse']) {
    reference.value.visibility = value;
    assert.throws(() => verifyRecordedVisibility(inventory));
  }
  reference.value.visibility = 'visible';
  const candidate = inventory.styles.find(row => row.side === 'astylar');
  candidate.value.visibility = 'visible';
  assert.throws(() => verifyRecordedVisibility(inventory));
  delete candidate.value.visibility;
  verifyRecordedVisibility(inventory);
  const rule = inventory.rules[0].value;
  const declarations = rule.declarations;
  rule.declarations = { ...declarations, visibility: { value: 'hidden' } };
  assert.throws(() => verifyRecordedVisibility(inventory));
  if (declarations === undefined) delete rule.declarations;
  else rule.declarations = declarations;
  verifyRecordedVisibility(inventory);
  console.log(JSON.stringify({ cases: 24, referenceVisibleOwners: 216,
    candidateOwnersWithVisibilityAbsent: 216, structuralEnvelopesSeparate: 24,
    boundary: 'Retained authored-owner property evidence only. Not CSS visibility support, implicit-default equivalence, generated paint, current rendering or case closure.' }));
});
