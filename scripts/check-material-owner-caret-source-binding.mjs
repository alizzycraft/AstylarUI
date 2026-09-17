import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { collectOwnerCaretInputs, validateOwnerCaretInputs, ownerCaretClassificationContexts,
  bindOwnerCaretNormalization } from '../tests/material-parity/owner-caret-source-binding.mjs';
import { classifyOwnerCaretInput } from '../tests/material-parity/owner-caret-classification.mjs';
import { validateOwnerCaretAttributionRows } from '../tests/material-parity/owner-caret-attribution-coverage.mjs';

assert.equal(process.argv.length, 2);
const hash = x => createHash('sha256').update(x).digest('hex');
const parityPath = 'artifacts/material-parity/current-ancestry-audit/latest-report.json';
const raw = JSON.parse(readFileSync(parityPath));
const canonicalFiles = ['docs/material-input-equivalence-audit.json', 'docs/material-input-equivalence-audit.json.gz',
  'docs/material-input-equivalence-audit.md'];
const before = canonicalFiles.map(f => hash(readFileSync(f)));
const evidence = collectOwnerCaretInputs(raw, { parityPath });
assert.equal(evidence.binding.status, 'bound', evidence.binding.error);
assert.equal(evidence.observations.length, 4050); assert.equal(evidence.captures.length, 1734);
assert.deepEqual(validateOwnerCaretInputs(evidence), []);
const contexts = ownerCaretClassificationContexts(evidence), rows = new Map(); let retained = 0, reviewed = 0;
for (const [kind, entries] of [['static', raw.results], ['interaction', raw.interactions]]) for (const entry of entries) {
  const caseId = `${kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`;
  for (const input of entry.styleInputs) {
    const context = contexts.get(JSON.stringify([caseId, input.id, 'caretColor'])); if (!context) continue;
    const result = classifyOwnerCaretInput(input, 'caretColor', context.reference, undefined, context);
    if (!result) { retained++; continue; } reviewed++;
    const id = JSON.stringify([entry.family, input.id, context.reference, result.attribution, result.justification]);
    if (!rows.has(id)) rows.set(id, { family: entry.family, element: input.id, property: 'caretColor',
      reference: context.reference, astylar: undefined, classification: result.classification, attribution: result.attribution,
      recommendedOwner: result.owner, justification: result.justification, reviewEvidence: result.reviewEvidence,
      reviewedCases: [], cases: [], states: [], occurrences: 0 });
    const row = rows.get(id); row.occurrences++; row.reviewedCases.push(caseId);
    if (row.cases.length < 12) row.cases.push(caseId);
    const state = entry.state ?? 'static'; if (!row.states.includes(state)) row.states.push(state);
  }
}
const producedRows = [...rows.values()].sort((a, b) => a.family.localeCompare(b.family) ||
  a.element.localeCompare(b.element) || a.property.localeCompare(b.property));
assert.deepEqual([producedRows.length, reviewed, retained], [118, 3154, 896]);
assert.deepEqual(validateOwnerCaretAttributionRows(evidence.plannedCoverage, producedRows), []);
let rejected = 0;
const chosen = raw.results.findIndex(e => e.family === 'badge' && e.profile === 'light' && e.viewport.id === 'desktop');
const owner = raw.results[chosen].styleInputs.findIndex(i => i.id === 'badge-label');
for (const mutate of [
  e => { e.profile = 'invented'; }, e => { e.state = 'hover'; },
  e => { e.styleInputs[owner].reference.caretColor = 'red'; },
  e => { e.styleInputs[owner].astylar.caretColor = 'auto'; },
  e => { e.styleInputs.splice(owner, 1); },
  e => { e.inputTrees.astylar.sha256 = '0'.repeat(64); },
]) {
  const changed = { ...raw, results: [...raw.results] }; changed.results[chosen] = structuredClone(raw.results[chosen]);
  mutate(changed.results[chosen]);
  const result = collectOwnerCaretInputs(changed, { parityPath });
  assert.equal(result.binding.status, 'invalid'); assert.match(result.binding.error, /caller population differs/); rejected++;
}
assert.equal(collectOwnerCaretInputs(raw).binding.status, 'unbound');
assert.equal(collectOwnerCaretInputs(raw, { parityPath: 'package.json' }).binding.status, 'invalid'); rejected++;
const wrongReceipt = { ...evidence, binding: { ...evidence.binding, sha256: '0'.repeat(64) } };
assert.equal(validateOwnerCaretInputs(wrongReceipt).length, 1); rejected++;
const duplicateContext = { ...evidence, observations: [...evidence.observations, evidence.observations[0]] };
assert.throws(() => ownerCaretClassificationContexts(duplicateContext), /duplicate caret context/); rejected++;
const forged = { ...evidence, plannedCoverage: { ...evidence.plannedCoverage, renderingEquivalent: true } };
assert.ok(validateOwnerCaretInputs(forged).some(e => e.includes('differs from complete original-source replay'))); rejected++;
const descriptor = evidence.binding.productionNormalization, source = readFileSync(descriptor.module, 'utf8');
for (const change of [
  s => s.replace('function canonicalStyle(', 'function removedCanonicalStyle('),
  s => s + '\nfunction canonicalStyle() {}',
  s => s.replace('function canonicalStyle(', 'function canonicalStyle(/* altered */'),
]) { assert.throws(() => bindOwnerCaretNormalization(change(source), descriptor)); rejected++; }
const withComment = bindOwnerCaretNormalization('// unrelated module comment\n' + source, descriptor);
const originalNormalize = bindOwnerCaretNormalization(source, descriptor);
assert.deepEqual(withComment(raw.results[chosen].styleInputs[owner].reference),
  originalNormalize(raw.results[chosen].styleInputs[owner].reference));
assert.deepEqual(canonicalFiles.map(f => hash(readFileSync(f))), before);
console.log(JSON.stringify({ originalCases: raw.results.length + raw.interactions.length,
  selectedCases: evidence.captures.length, observations: evidence.observations.length,
  reviewedGroups: producedRows.length, reviewedObservations: reviewed, retainedObservations: retained,
  negativeControls: rejected, wholeSourceReceipts: evidence.binding.sources.filter(s => s.verification === 'complete-source').length,
  normalizationFunctions: descriptor.functions.length, completeBindingReplayMatches: true,
  producedCoverageMatches: true, canonicalIntegration: false, canonicalUnchanged: true,
  bindingSha256: hash(JSON.stringify(evidence.binding)), observationsSha256: hash(JSON.stringify(evidence.observations)) }));
