import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { collectFullTreeInventory } from '../tests/material-parity/input-equivalence-audit.mjs';

// Inspect the existing full-tree inventory,not another style normalizer or
// coverage framework. Named scalar targets are not the complete owner scope.
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const file = 'artifacts/material-parity/current-full-20261005/latest-report.json';
const bytes = readFileSync(file);
assert.equal(hash(bytes), 'ab42dbec6280e0e27784ec4bbc6697d4ea451bfab307bccb720c0dec89a83b62');
const report = JSON.parse(bytes);
const cases = [...report.results, ...report.interactions].filter(row => row.family === 'divider');
assert.equal(cases.length, 24);
const inventory = collectFullTreeInventory(cases);
for (const key of ['gaps', 'resolvedStyleGaps', 'stateStyleGaps', 'errors']) assert.deepEqual(inventory[key], []);
assert.equal(inventory.cases.length, 48); assert.equal(inventory.envelopes.length, 24);
const observations = [];
for (let index = 0; index < cases.length; index++) {
  const entry = cases[index];
  const mappings = inventory.cases.slice(index * 2, index * 2 + 2);
  assert.deepEqual(mappings.map(row => row.side), ['reference', 'astylar']);
  assert.equal(mappings[0].case, mappings[1].case);
  const native = inventory.variants[mappings[0].variant];
  const candidate = inventory.variants[mappings[1].variant];
  const owners = candidate.nodes.filter(node => node.authored?.type);
  assert.equal(native.nodes.length, 9); assert.equal(owners.length, 9);
  const byId = id => {
    const rows = owners.filter(node => node.authored.id === id); assert.equal(rows.length, 1); return rows[0];
  };
  const mapped = new Map();
  const add = (node, id) => { assert.ok(node); assert.equal(mapped.has(node.key), false); mapped.set(node.key, byId(id)); };
  const frame = native.nodes.find(node => node.parent === null && node.type === 'main');
  add(frame, 'page');
  add(native.nodes.find(node => node.parent === frame.key && node.type === 'p' && node.attributes.class === 'eyebrow'), 'eyebrow');
  add(native.nodes.find(node => node.parent === frame.key && node.type === 'h1'), 'title');
  for (const id of ['divider-root', 'divider-primary', 'divider-above', 'divider-below'])
    add(native.nodes.find(node => node.attributes.id === id), id);
  for (const id of ['divider-above', 'divider-below']) {
    const leaf = native.nodes.find(node => node.attributes.id === id);
    add(native.nodes.find(node => node.key === leaf.parent), `${id}-row`);
  }
  assert.equal(mapped.size, 9); assert.equal(new Set([...mapped.values()].map(node => node.key)).size, 9);
  for (const node of native.nodes) {
    const other = mapped.get(node.key);
    if (node.parent !== null) assert.equal(other.parent, mapped.get(node.parent).key);
    assert.equal(other.authored.type, node.type === 'mat-divider' ? 'div' : node.type);
    if (node.ownText.trim()) assert.equal(other.authored.textContent, node.ownText.trim());
    assert.deepEqual(native.nodes.filter(child => child.parent === node.key).map(child => mapped.get(child.key).key),
      owners.filter(child => child.parent === other.key).map(child => child.key));
  }
  const scalarIds = entry.styleInputs.map(row => row.id).sort();
  assert.deepEqual(scalarIds, ['divider-above', 'divider-below', 'divider-primary', 'divider-root']);
  const outsideScalarTargets = [...mapped].filter(([, node]) => !scalarIds.includes(node.authored.id)).map(([key, node]) => {
    const reference = native.nodes.find(owner => owner.key === key);
    const style = inventory.styles[reference.style]; assert.equal(style.side, 'reference');
    return { reference: key, candidate: node.key, id: node.authored.id,
      recordedReferenceProperties: Object.keys(style.value).length,
      referenceStyleSha256: hash(JSON.stringify(style.value)),
      candidateStyleSha256: hash(JSON.stringify(inventory.styles[node.style].value)),
      boundary: 'Inventoried and mapped,not all properties classified by this census.' };
  });
  assert.equal(outsideScalarTargets.length, 5);
  assert.ok(outsideScalarTargets.every(row => row.recordedReferenceProperties === 104));
  observations.push({ case: mappings[0].case, scalarIds, outsideScalarTargets, evidence: entry.inputTrees });
}
console.log(JSON.stringify({ producer: { file: 'scripts/check-divider-owner-coverage.mjs', sha256: hash(readFileSync(import.meta.filename)) },
  collector: { file: 'tests/material-parity/input-equivalence-audit.mjs', sha256: hash(readFileSync('tests/material-parity/input-equivalence-audit.mjs')) },
  report: { file, sha256: hash(bytes) }, cases: 24, completeOwnerPairs: 216,
  outsideScalarOwnerPairs: 120, referencePropertySlotsOutsideScalarTargets: 12480, observations,
  conclusion: 'All nine recorded owners map one-to-one after excluding the synthetic SiteData envelope. The scalar loop covers four targets;five other owners require their separate inspection evidence. These are not missing tree captures or newly discovered fixture nodes.',
  boundary: 'Recorded tree/structure and scalar-target membership only. Counts are not additional unresolved differences,an inspection percentage,complete CSS support or current rendering. Existing partial proofs may cover subsets of these property slots;no blanket uninspected classification or case promotion.' }));
