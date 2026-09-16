import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { inspectOwnerGridInitial, ownerGridInitialProperties } from '../tests/material-parity/owner-grid-initial-evidence.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const file = 'artifacts/material-parity/current-ancestry-audit/latest-report.json', bytes = readFileSync(file);
assert.equal(hash(bytes), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
const raw = JSON.parse(bytes), observations = [], captures = [];
const read = descriptor => { const b = readFileSync(descriptor.file); assert.equal(hash(b), descriptor.sha256); return JSON.parse(b); };
for (const [kind, entries] of [['static', raw.results], ['interaction', raw.interactions]]) for (const entry of entries) {
  const key = `${kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`;
  const selected = (entry.styleInputs ?? []).flatMap(input => ownerGridInitialProperties
    .filter(p => input.reference?.[p] === 'none' && input.astylar && !Object.hasOwn(input.astylar, p)).map(property => ({ input, property })));
  captures.push({ case: key, inputTrees: entry.inputTrees, selected: selected.map(({ input, property }) =>
    ({ element: input.id, property, inputSha256: hash(JSON.stringify(input)) })) });
  if (!selected.length) continue;
  const reference = read(entry.inputTrees.reference), candidate = read(entry.inputTrees.astylar);
  for (const { input, property } of selected) observations.push({ case: key, family: entry.family,
    profile: entry.profile, viewport: entry.viewport, state: entry.state ?? 'static', inputSha256: hash(JSON.stringify(input)),
    proof: inspectOwnerGridInitial(input, property, reference, candidate) });
}
assert.equal(captures.length, 2311);
assert.equal(new Set(observations.map(o => JSON.stringify([o.case, o.proof.element, o.proof.property]))).size, observations.length);
const groups = [];
for (const o of observations) {
  let group = groups.find(g => g.family === o.family && g.element === o.proof.element && g.property === o.proof.property);
  if (!group) { group = { family: o.family, element: o.proof.element, property: o.proof.property,
    reviewedCases: [], gapCases: [], reasons: {} }; groups.push(group); }
  (o.proof.disposition === 'captured-none-versus-local-omission' ? group.reviewedCases : group.gapCases).push(o.case);
  for (const reason of new Set(o.proof.issues.map(i => i.reason))) group.reasons[reason] = (group.reasons[reason] ?? 0) + 1;
}
const paths = ['scripts/audit-material-owner-grid-initial.mjs', 'tests/material-parity/owner-grid-initial-evidence.mjs',
  'tests/material-parity/owner-grid-initial-evidence.spec.mjs', 'tests/material-parity/root-initial-style-evidence.mjs'];
const report = { schemaVersion: 1, kind: 'noninherited-owner-grid-initial-survey', capture: { file, sha256: hash(bytes) },
  sourceFingerprints: paths.map(file => ({ file, sha256: hash(readFileSync(file, 'utf8').replaceAll('\r\n', '\n')) })),
  captureCases: captures.length, observations: observations.length,
  reviewedObservations: observations.filter(o => !o.proof.issues.length).length,
  reviewGaps: observations.filter(o => o.proof.issues.length).length,
  canonicalAttributionChanged: false, computedCandidateVerified: false, gridLayoutEquivalent: false, renderingEquivalent: false,
  groups, captures, evidence: observations,
  limitation: 'Original scalar/tree observation-stage review only. Explicit/reset/motion requests and uncertain mappings remain gaps. Does not synthesize candidate computed values, solve implicit tracks, prove equivalent authored structure or establish rendering equivalence.' };
const target = 'docs/material-owner-grid-initial-survey.json', text = JSON.stringify(report, null, 2) + '\n';
if (process.argv.includes('--check')) assert.equal(readFileSync(target, 'utf8'), text); else writeFileSync(target, text);
console.log(JSON.stringify({ cases: captures.length, observations: report.observations, reviewed: report.reviewedObservations,
  gaps: report.reviewGaps, groups: groups.length, fullyReviewedGroups: groups.filter(g => !g.gapCases.length).length,
  reasons: Object.fromEntries([...new Set(observations.flatMap(o => o.proof.issues.map(i => i.reason)))].map(reason =>
    [reason, observations.filter(o => o.proof.issues.some(i => i.reason === reason)).length])) }));
