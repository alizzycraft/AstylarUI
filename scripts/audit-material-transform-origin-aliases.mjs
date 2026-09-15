import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolveOriginAliasPair } from '../tests/material-parity/origin-alias-mapping-evidence.mjs';

// Generate audit evidence only; frozen inputs, implementation and classifiers
// are never modified. --check replays every case without writing the artifact.
assert.ok(process.argv.length === 2 || (process.argv.length === 3 && process.argv[2] === '--check'));
const file = 'docs/material-transform-origin-alias-survey.json';
const capturePath = 'artifacts/material-parity/current-ancestry-audit/latest-report.json';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const bytes = readFileSync(capturePath), captureSha256 = sha(bytes);
assert.equal(captureSha256, 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
const raw = JSON.parse(bytes), rows = [], controls = [], checkedAliases = new Set(), trees = new Set();
const priorSurveyFile = 'docs/material-transform-origin-authorship-survey.json';
const priorSurveyText = readFileSync(priorSurveyFile, 'utf8').replace(/\r\n/g, '\n');
const priorSurvey = JSON.parse(priorSurveyText).verification.data;
assert.equal(priorSurvey.captureSha256, captureSha256);
const load = ref => { const data = readFileSync(ref.file); assert.equal(sha(data), ref.sha256, ref.file); trees.add(ref.file); return JSON.parse(data); };
const inactive = v => v === undefined || ['none', 'matrix(1,0,0,1,0,0)'].includes(v.replace(/\s/g, ''));
for (const [kind, entries] of [['static', raw.results], ['interaction', raw.interactions]]) for (const entry of entries) {
  const inputs = entry.styleInputs.filter(i => i.reference?.transformOrigin !== undefined && i.astylar?.transformOrigin === undefined &&
    inactive(i.reference?.transform) && inactive(i.astylar?.transform));
  if (!inputs.length) continue;
  const reference = load(entry.inputTrees.reference), candidate = load(entry.inputTrees.astylar);
  for (const input of inputs) {
    if (reference.nodes.some(n => n.attributes?.id === input.id)) continue;
    const before = sha(JSON.stringify([entry, reference, candidate]));
    const proof = resolveOriginAliasPair(entry, reference, candidate, input);
    assert.equal(sha(JSON.stringify([entry, reference, candidate])), before);
    rows.push({ case: `${kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`,
      family: entry.family, element: input.id, inputTrees: entry.inputTrees, ...proof });
    if (proof.status === 'unresolved' || checkedAliases.has(input.id)) continue;
    checkedAliases.add(input.id);
    const mutations = [
      ['changed-reference-origin', (r, a, i) => { i.reference.transformOrigin = '99999px 99999px'; }],
      ['shortened-reference-snapshot', (r, a, i) => { delete i.reference.width; }],
      ['substituted-reference-key', (r, a, i) => { delete i.reference.width; i.reference.unknownAuditField = undefined; }],
      ['changed-candidate-origin', (r, a, i) => { i.astylar.transformOrigin = '0px 0px'; }],
      ['duplicate-reference-key', r => { r.nodes.push(structuredClone(r.nodes[0])); }],
      ['direct-id-shadow', r => { r.nodes[0].attributes.id = input.id; }],
      ['candidate-provenance-missing', (r, a) => { delete a.resolvedStyleEvidenceVersion; }],
      ['orphaned-reference-target', r => { r.nodes.find(n => n.key === proof.referenceNode).parent = '__missing'; }],
      ['duplicate-candidate-id', (r, a) => { a.nodes[0].authored.id = input.id; }],
    ];
    for (const [name, mutate] of mutations) {
      const r = structuredClone(reference), a = structuredClone(candidate), i = structuredClone(input);
      mutate(r, a, i);
      const rejected = resolveOriginAliasPair(entry, r, a, i);
      assert.equal(rejected.status, 'unresolved', `${input.id}: ${name}`);
      controls.push({ element: input.id, mutation: name, status: rejected.status, reason: rejected.reason });
    }
  }
}
assert.equal(rows.length, 750);
const byElement = {};
for (const row of rows) {
  const counts = byElement[row.element] ??= { observations: 0, mapped: 0, mappedWithRuleGap: 0, unresolved: 0 };
  counts.observations++; counts[row.status === 'mapped' ? 'mapped' : row.status === 'mapped-with-scalar-rule-gap' ? 'mappedWithRuleGap' : 'unresolved']++;
}
assert.deepEqual(Object.fromEntries(Object.entries(byElement).map(([id, counts]) => [id, counts.observations])),
  Object.fromEntries(Object.entries(priorSurvey.mappingGaps).map(([id, counts]) => [id, counts.observations])));
const summary = { observations: rows.length, aliases: Object.keys(byElement).length,
  mapped: rows.filter(r => r.status === 'mapped').length,
  mappedWithRuleGap: rows.filter(r => r.status === 'mapped-with-scalar-rule-gap').length,
  unresolved: rows.filter(r => r.status === 'unresolved').length,
  mutationControls: controls.length, checkedTreeFiles: trees.size, byElement };
const sources = ['scripts/audit-material-transform-origin-aliases.mjs', 'tests/material-parity/origin-alias-mapping-evidence.mjs',
  'tests/material-parity/generated-node-mapping-evidence.mjs', 'tests/material-parity/input-equivalence-audit.mjs',
  'tests/material-parity/run-material-parity.mjs', 'examples/material-showcase/src/app/reference.component.ts'];
const record = { schemaVersion: 1, baselineCommit: '5814e42', kind: 'origin-alias-measurement-identity-survey', capturePath, captureSha256,
  priorSurvey: { file: priorSurveyFile, sha256: sha(priorSurveyText), hashNormalization: 'LF', generatedAliasObservations: 750 },
  commands: { generate: 'node scripts/audit-material-transform-origin-aliases.mjs', check: 'node scripts/audit-material-transform-origin-aliases.mjs --check' },
  scope: 'All 750 generated-alias origin observations. Node identity and scalar/tree consistency, not origin equivalence or renderer acceptance.',
  summary, observations: rows, mutationControls: controls,
  limitations: ['Mapped-with-scalar-rule-gap preserves the existing CSS-layer capture discrepancy; mapping does not repair or waive it.',
    'The 6188 directly mapped observations remain in the preceding authorship survey.',
    'No origin group is reclassified. Candidate computed origins, default/reference-box semantics and rendering require separate proof.'],
  sourceFingerprints: sources.map(file => ({ file, sha256: sha(readFileSync(file, 'utf8').replace(/\r\n/g, '\n')) })) };
const output = JSON.stringify(record, null, 2) + '\n';
if (process.argv[2] === '--check') assert.equal(readFileSync(file, 'utf8').replace(/\r\n/g, '\n'), output);
else writeFileSync(file, output);
console.log(JSON.stringify({ mode: process.argv[2] === '--check' ? 'check' : 'generate', file, summary,
  unresolvedExamples: rows.filter(r => r.status === 'unresolved').filter((r, i, a) => a.findIndex(v => v.element === r.element && v.reason === r.reason) === i)
    .map(({ element, reason }) => ({ element, reason })), bytes: Buffer.byteLength(output), sha256: sha(output) }));
