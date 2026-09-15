import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { originalCaseKey } from '../tests/material-parity/owner-initial-style-membership.mjs';
import { resolveOriginAliasPair } from '../tests/material-parity/origin-alias-mapping-evidence.mjs';
import { collectOriginalOverlayContextSurvey } from '../tests/material-parity/original-overlay-context-survey.mjs';
import { inspectOverlayOwnerDeclarations } from '../tests/material-parity/overlay-owner-declaration-review.mjs';

const hash = b => createHash('sha256').update(b).digest('hex');
const readHashed = descriptor => {
  const bytes = readFileSync(descriptor.file); assert.equal(hash(bytes), descriptor.sha256); return JSON.parse(bytes);
};
const sourceFile = 'docs/material-owner-initial-style-mappings.json', sourceBytes = readFileSync(sourceFile);
const source = JSON.parse(sourceBytes);
for (const f of source.sourceFingerprints) assert.equal(hash(readFileSync(f.file, 'utf8').replaceAll('\r\n', '\n')), f.sha256);
const groups = source.groups.filter(g => Object.keys(g.reasons).length === 1 && g.reasons['incomplete-surface-ancestry']);
assert.equal(groups.length, 48);
const original = readHashed(source.capture);
const entries = new Map([...original.results.map(e => ({ ...e, kind: 'static' })),
  ...original.interactions.map(e => ({ ...e, kind: 'interaction' }))].map(e => [originalCaseKey(e), e]));
assert.equal(entries.size, 2311);
const contextFile = 'artifacts/material-parity/original-overlay-context-current-ancestry-audit/latest-report.json';
const contextBytes = readFileSync(contextFile), contexts = JSON.parse(contextBytes);
const verified = collectOriginalOverlayContextSurvey(contextFile); assert.equal(verified.cases, 91);
const replay = new Map(contexts.results.map(d => [d.case, d]));
const selected = new Map();
for (const g of groups) for (const key of g.cases) {
  if (!selected.has(key)) selected.set(key, new Set()); selected.get(key).add(g.element);
}
assert.equal(selected.size, 50);
const owners = [], treesByCase = new Map(); let freshMatches = 0, identityNegativeControls = 0;
for (const [key, ids] of selected) {
  const entry = entries.get(key); assert.ok(entry);
  const reference = readHashed(entry.inputTrees.reference), candidate = readHashed(entry.inputTrees.astylar);
  treesByCase.set(key, { reference, candidate });
  const fresh = replay.has(key) ? readHashed(replay.get(key)) : undefined;
  if (fresh) assert.deepEqual(fresh.originalInputTrees, entry.inputTrees);
  for (const id of ids) {
    const inputs = entry.styleInputs.filter(i => i.id === id); assert.equal(inputs.length, 1);
    const proof = resolveOriginAliasPair(entry, reference, candidate, inputs[0]);
    assert.ok(['mapped', 'mapped-with-scalar-rule-gap'].includes(proof.status), `${key}/${id}: ${proof.reason}`);
    if (fresh) {
      assert.deepEqual(resolveOriginAliasPair(entry, fresh.freshReferenceTree, candidate, inputs[0]), proof,
        `Fresh owner differs from original: ${key}/${id}`); freshMatches++;
    }
    const changed = structuredClone(inputs[0]); changed.reference.fontStyle = '__changed__';
    assert.equal(resolveOriginAliasPair(entry, reference, candidate, changed).status, 'unresolved'); identityNegativeControls++;
    const duplicate = structuredClone(candidate); duplicate.nodes.push(duplicate.nodes.find(n => n.key === proof.candidateNode));
    assert.equal(resolveOriginAliasPair(entry, reference, duplicate, inputs[0]).status, 'unresolved'); identityNegativeControls++;
    owners.push({ case: key, family: entry.family, element: id, inputTrees: entry.inputTrees, proof,
      freshReferenceOwnerMatched: Boolean(fresh), externalContext: fresh ? replay.get(key) : null,
      contextStatus: fresh ? 'verified-original-state-reference-replay' : 'original-state-external-context-not-replayed' });
  }
}
assert.equal(owners.length, 178); assert.equal(freshMatches, 160); assert.equal(identityNegativeControls, 356);
const rows = [], patterns = [], patternIds = new Map();
for (const g of groups) {
  const variants = new Map();
  for (const key of g.cases) {
    const owner = owners.find(o => o.case === key && o.element === g.element), { reference, candidate } = treesByCase.get(key);
    const trace = inspectOverlayOwnerDeclarations(g.property, owner.proof, reference, candidate);
    const raw = trace.referencePath[0].computed;
    assert.equal(g.property === 'wordSpacing' && raw === '0px' ? '0' : raw, g.reference);
    assert.deepEqual(Object.values(trace.candidatePath[0].localValues), Array(3).fill(g.candidateLocalDeclaration));
    const digest = hash(JSON.stringify(trace));
    if (!patternIds.has(digest)) { patternIds.set(digest, patterns.length); patterns.push({ sha256: digest, trace }); }
    const pattern = patternIds.get(digest);
    if (!variants.has(pattern)) variants.set(pattern, []); variants.get(pattern).push(key);
  }
  rows.push({ family: g.family, element: g.element, property: g.property, reference: g.reference,
    candidateLocalDeclaration: g.candidateLocalDeclaration, occurrences: g.occurrences,
    variants: [...variants].map(([pattern, cases]) => ({ pattern, cases })) });
}
const observations = rows.reduce((n, g) => n + g.occurrences, 0); assert.equal(observations, 1424);
for (const row of rows.filter(g => g.element === 'tooltip-popup' && ['whiteSpace', 'overflowWrap'].includes(g.property))) {
  row.reviewedFinding = {
    classification: 'application-plugin-authoring-defect', owner: 'Material showcase tooltip wrapping authoring',
    earliestDivergence: 'authored wrapping request, before layout or Babylon projection',
    evidence: row.property === 'whiteSpace'
      ? 'All 18 captured reference surfaces compute normal; the candidate #tooltip-popup rule explicitly requests nowrap in all three local stages.'
      : 'All 18 captured reference surfaces have an active overflow-wrap:anywhere declaration; candidate owner and captured ancestors omit both overflowWrap and public wordWrap requests.',
    originalVisualSymptomCauseProven: false,
    limitation: 'Classifies unequal wrapping inputs only. Original tooltip displacement, blur and clipping are not attributed to this difference, and the existing source-bound canonical classifier is not changed here.'
  };
}
const result = { schemaVersion: 1, kind: 'remaining-overlay-ancestry-review',
  source: { file: sourceFile, sha256: hash(sourceBytes) }, capture: source.capture,
  originalStateContext: { file: contextFile, sha256: hash(contextBytes) },
  cases: [...selected.keys()], groups: rows, observations, owners, patterns, freshMatches, identityNegativeControls,
  sourceFingerprints: ['scripts/audit-material-remaining-overlay-ancestry.mjs',
    'tests/material-parity/owner-initial-style-membership.mjs', 'tests/material-parity/origin-alias-mapping-evidence.mjs',
    'tests/material-parity/original-overlay-context-survey.mjs', 'tests/material-parity/overlay-owner-declaration-review.mjs',
    'tests/material-parity/root-initial-style-evidence.mjs', 'tests/material-parity/border-initial-input-evidence.mjs',
    'tests/material-parity/input-equivalence-audit.mjs', 'tests/material-parity/generated-node-mapping-evidence.mjs',
    'tests/material-parity/run-material-parity.mjs'].map(file => ({ file, sha256: hash(readFileSync(file, 'utf8').replaceAll('\r\n', '\n')) })),
  canonicalAttributionChanged: false, candidateComputedVerified: false, renderingEquivalent: false,
  limitation: '40 dialog groups reuse verified original-state reference context; eight tooltip groups retain original-state context gaps. Mapping and declaration traces do not establish candidate computed values or input/rendering equivalence.' };
const file = 'docs/material-remaining-overlay-ancestry-review.json', output = JSON.stringify(result, null, 2) + '\n';
if (process.argv.includes('--check')) assert.equal(readFileSync(file, 'utf8').replaceAll('\r\n', '\n'), output);
else writeFileSync(file, output);
console.log(JSON.stringify({ groups: rows.length, observations, cases: selected.size, owners: owners.length,
  freshMatches, identityNegativeControls, patterns: patterns.length,
  pendingContextOwners: owners.filter(o => !o.freshReferenceOwnerMatched).length, canonicalAttributionChanged: false }));
