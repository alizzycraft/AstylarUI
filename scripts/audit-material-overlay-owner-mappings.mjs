import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { resolveOriginAliasPair } from '../tests/material-parity/origin-alias-mapping-evidence.mjs';
import { originalCaseKey } from '../tests/material-parity/owner-initial-style-membership.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const sourceFile = 'docs/material-owner-initial-style-mappings.json', sourceBytes = readFileSync(sourceFile);
const source = JSON.parse(sourceBytes);
const priorAliasFile = 'docs/material-transform-origin-alias-survey.json', priorAliasBytes = readFileSync(priorAliasFile);
const priorAlias = JSON.parse(priorAliasBytes);
assert.equal(priorAlias.capturePath.replaceAll('\\', '/'), source.capture.file.replaceAll('\\', '/'));
assert.equal(priorAlias.captureSha256, source.capture.sha256);
const priorIdentities = new Map(priorAlias.observations.map(o => [JSON.stringify([o.case, o.element]), o]));
assert.equal(priorIdentities.size, priorAlias.observations.length);
for (const entry of source.sourceFingerprints) assert.equal(hash(readFileSync(entry.file, 'utf8').replaceAll('\r\n', '\n')), entry.sha256);
const groups = source.groups.filter(g => Object.keys(g.reasons).length === 1 && g.reasons['owner-mapping']);
assert.equal(groups.length, 54);
const bytes = readFileSync(source.capture.file); assert.equal(hash(bytes), source.capture.sha256);
const raw = JSON.parse(bytes), wanted = new Map();
for (const group of groups) for (const key of group.cases) {
  if (!wanted.has(key)) wanted.set(key, new Set()); wanted.get(key).add(group.element);
}
assert.equal(wanted.size, 91);
const observations = [], cases = []; let mutationChecks = 0;
const signatures = new Set();
for (const entry of [...raw.results.map(e => ({ ...e, kind: 'static' })), ...raw.interactions.map(e => ({ ...e, kind: 'interaction' }))]) {
  const key = originalCaseKey(entry); if (!wanted.has(key)) continue;
  const trees = {};
  for (const side of ['reference', 'astylar']) {
    const descriptor = entry.inputTrees[side], file = path.resolve(descriptor.file);
    assert.ok(file.startsWith(path.resolve('artifacts/material-parity') + path.sep));
    const bytes = readFileSync(file); assert.equal(hash(bytes), descriptor.sha256); trees[side] = JSON.parse(bytes);
  }
  for (const id of wanted.get(key)) {
    const inputs = entry.styleInputs.filter(input => input.id === id); assert.equal(inputs.length, 1);
    const input = inputs[0], proof = resolveOriginAliasPair(entry, trees.reference, trees.astylar, input);
    const signature = JSON.stringify([key, id]); assert.ok(!signatures.has(signature)); signatures.add(signature);
    const priorIdentity = priorIdentities.get(signature); assert.ok(priorIdentity, 'Existing origin alias evidence must cover the owner');
    const { case: priorCase, family: priorFamily, element: priorElement, inputTrees: priorTrees, ...priorProof } = priorIdentity;
    assert.deepEqual(priorTrees, entry.inputTrees); assert.equal(priorFamily, entry.family);
    assert.deepEqual(proof, priorProof, 'Existing source-reviewed identity must replay without alteration');
    observations.push({ case: key, family: entry.family, element: id, proof });
    if (proof.status !== 'unresolved') {
      assert.equal(proof.checkedReferenceProperties, 89);
      const scalar = structuredClone(input); scalar.reference.fontStyle = '__changed_reference_scalar__';
      assert.equal(resolveOriginAliasPair(entry, trees.reference, trees.astylar, scalar).status, 'unresolved'); mutationChecks++;
      const candidate = structuredClone(trees.astylar);
      candidate.nodes.push(structuredClone(candidate.nodes.find(n => n.authored?.id === id)));
      assert.equal(resolveOriginAliasPair(entry, trees.reference, candidate, input).status, 'unresolved'); mutationChecks++;
      const reference = structuredClone(trees.reference);
      reference.nodes.find(n => n.key === proof.referenceNode).attributes.id = id;
      assert.equal(resolveOriginAliasPair(entry, reference, trees.astylar, input).status, 'unresolved'); mutationChecks++;
    }
  }
  cases.push({ case: key, inputTrees: entry.inputTrees });
}
assert.equal(cases.length, wanted.size);
const byIdentity = new Map(observations.map(o => [JSON.stringify([o.case, o.element]), o]));
const rows = groups.map(g => {
  const paired = g.cases.map(key => byIdentity.get(JSON.stringify([key, g.element]))); assert.ok(paired.every(Boolean));
  const statuses = Object.fromEntries([...new Set(paired.map(o => o.proof.status))].map(status =>
    [status, paired.filter(o => o.proof.status === status).map(o => o.case)]));
  return { family: g.family, element: g.element, property: g.property, reference: g.reference,
    occurrences: g.occurrences, cases: g.cases, statuses, mappingProofSha256: hash(JSON.stringify(paired)),
    allCasesHaveIdentityEvidence: paired.every(o => o.proof.status !== 'unresolved') };
});
const files = ['scripts/audit-material-overlay-owner-mappings.mjs',
  'tests/material-parity/origin-alias-mapping-evidence.mjs', 'tests/material-parity/generated-node-mapping-evidence.mjs',
  'tests/material-parity/owner-initial-style-membership.mjs', 'tests/material-parity/input-equivalence-audit.mjs',
  'tests/material-parity/run-material-parity.mjs'];
const result = { schemaVersion: 1, kind: 'overlay-owner-identity-gap-survey',
  inputSurvey: { file: sourceFile, sha256: hash(sourceBytes) }, capture: source.capture,
  reusedAliasSurvey: { file: priorAliasFile, sha256: hash(priorAliasBytes), matchedOwnerObservations: observations.length },
  sourceFingerprints: files.map(file => ({ file, sha256: hash(readFileSync(file, 'utf8').replaceAll('\r\n', '\n')) })),
  groups: rows, cases, observations, mutationChecks,
  canonicalAttributionChanged: false, computedCandidateVerified: false, renderingEquivalent: false,
  limitation: 'Existing alias proofs establish measurement identity only. Scalar rule gaps and uncaptured external overlay ancestry remain explicit; no initial-style attribution, CSS support or used-value/rendering equivalence inferred.' };
const file = 'docs/material-overlay-owner-mapping-survey.json', output = JSON.stringify(result, null, 2) + '\n';
if (process.argv.includes('--check')) assert.equal(readFileSync(file, 'utf8').replaceAll('\r\n', '\n'), output);
else writeFileSync(file, output);
console.log(JSON.stringify({ groups: rows.length, cases: cases.length, ownerObservations: observations.length,
  statuses: Object.fromEntries([...new Set(observations.map(o => o.proof.status))].map(status =>
    [status, observations.filter(o => o.proof.status === status).length])),
  allCasesHaveIdentityEvidence: rows.filter(g => g.allCasesHaveIdentityEvidence).length,
  mutationChecks, canonicalAttributionChanged: false }));
