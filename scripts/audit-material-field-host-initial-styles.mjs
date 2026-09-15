import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { collectFullTreeInventory } from '../tests/material-parity/input-equivalence-audit.mjs';
import { collectFieldHostInitialStyleInputs, classifyFieldHostInitialStyleInput,
  fieldHostInitialStyleAttribution } from '../tests/material-parity/field-host-initial-style-evidence.mjs';

const target = 'docs/material-field-host-initial-style-audit.json';
const sha256 = data => createHash('sha256').update(data).digest('hex');
const indexFile = 'docs/material-field-host-typography-audit.json';
const index = JSON.parse(readFileSync(indexFile));
const capture = readFileSync(index.capture.file);
assert.equal(sha256(capture), index.capture.sha256);
const raw = JSON.parse(capture), families = new Set(index.groups.map(g => g.family));
const entries = [...raw.results.map(e => ({ ...e, kind: 'static' })), ...raw.interactions.map(e => ({ ...e, kind: 'interaction' }))].filter(e => families.has(e.family));
const inventory = collectFullTreeInventory(entries);
assert.deepEqual(inventory.errors, []);
const canonical = value => ({ ...value, fontFamily: value.fontFamily?.toLowerCase().replaceAll(' ', '').replaceAll('"', '') });
const proofs = collectFieldHostInitialStyleInputs(inventory, canonical);
assert.equal(proofs.length, 4616);
const key = e => `${e.kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? `/${e.state}` : ''}`;
const cases = new Map(entries.map(e => [key(e), e]));
assert.equal(cases.size, 577);
assert.deepEqual([...cases.keys()].sort(), index.groups.flatMap(g => g.cases).sort());
const groups = new Map();
for (const proof of proofs) {
  const entry = cases.get(proof.case), input = entry.styleInputs.find(i => i.id === proof.element);
  const result = classifyFieldHostInitialStyleInput(input, proof.property, proof.values.reference, input.astylar[proof.property], proof);
  assert.equal(result?.attribution, fieldHostInitialStyleAttribution);
  const id = `${proof.family}/${proof.property}`;
  if (!groups.has(id)) groups.set(id, { family: proof.family, element: proof.element, property: proof.property,
    values: proof.values, classification: result.classification, attribution: result.attribution, owner: result.owner, cases: [] });
  groups.get(id).cases.push(proof.case);
}
assert.equal(groups.size, 48);
const sourceFiles = [indexFile, 'scripts/audit-material-field-host-initial-styles.mjs',
  'tests/material-parity/field-host-initial-style-evidence.mjs', 'tests/material-parity/field-host-initial-style-evidence.spec.mjs',
  'tests/material-parity/field-host-typography-evidence.mjs', 'tests/material-parity/root-initial-style-evidence.mjs',
  'tests/material-parity/border-initial-input-evidence.mjs', 'tests/material-parity/input-equivalence-audit.mjs'];
const report = { schemaVersion: 1, kind: 'field-host-initial-style-observation-stage-survey', capture: index.capture,
  sourceFingerprints: sourceFiles.map(file => ({ file, sha256: sha256(readFileSync(file, 'utf8').replaceAll('\r\n', '\n')) })),
  caseCount: cases.size, groupCount: groups.size, propertyObservations: proofs.length,
  originalCaptureUnchanged: sha256(readFileSync(index.capture.file)) === index.capture.sha256,
  canonicalIntegration: false, computedCandidateVerified: false, descendantConsumersVerified: false, finalRasterVerified: false,
  groups: [...groups.values()].sort((a, b) => `${a.family}/${a.property}`.localeCompare(`${b.family}/${b.property}`))
    .map(g => ({ ...g, cases: g.cases.sort(), occurrences: g.cases.length })),
  cases: entries.map(e => ({ case: key(e), inputTrees: e.inputTrees })).sort((a, b) => a.case.localeCompare(b.case)),
  proofSha256: sha256(JSON.stringify(proofs)),
  limits: ['This is a standalone observation-stage finding, not canonical attribution or computed-value equivalence.',
    'Browser defaults and omitted candidate local declarations are preserved rather than normalized into equal values.',
    'Existing component token, line-box, alignment, inheritance, wrapping, hit-testing, visibility and paint obligations remain independent.',
    'The complete original capture and paired tree digests are checked on every replay. No renderer or canonical fixture is changed.'] };
const output = JSON.stringify(report, null, 2) + '\n';
if (process.argv.includes('--check')) assert.equal(readFileSync(target, 'utf8').replaceAll('\r\n', '\n'), output, 'field-host initial-style report is stale');
else writeFileSync(target, output);
console.log(JSON.stringify({ file: target, cases: report.caseCount, groups: report.groupCount, observations: report.propertyObservations, canonicalIntegration: false }));
