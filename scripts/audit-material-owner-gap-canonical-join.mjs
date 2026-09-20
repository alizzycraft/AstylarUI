import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { Readable } from 'node:stream';
import { createGunzip } from 'node:zlib';
import { pathToFileURL } from 'node:url';
import Parser from 'jsonparse';
import { readGapSurveySource, bindGapSurveyNormalizer } from '../tests/material-parity/gap-survey-source-replay.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const surveyFile = 'docs/material-owner-gap-input-survey.json';
const canonicalRevision = '2408285b0a3cff2a6366825bb9dee214758bf91d';
const omitted = value => value === undefined || value === '<omitted>' ? null : value;
const signature = (family, element, property, reference, candidate) =>
  JSON.stringify([family, element, property, omitted(reference), omitted(candidate)]);
const rowKey = row => signature(row.family, row.element, row.property, row.reference, row.astylar);
const groupKey = group => signature(group.family, group.element, group.property, group.reference, group.candidate);

export function prepareGapOriginalIndex(original, rows, canonicalStyle) {
  const wanted = new Set(rows.map(rowKey)); assert.equal(wanted.size, 162);
  const observations = new Map([...wanted].map(key => [key, []])), cases = new Map();
  for (const [kind, entries] of [['static', original.results], ['interaction', original.interactions]]) {
    for (const entry of entries) {
      const id = `${kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`;
      assert.ok(!cases.has(id), 'duplicate original case');
      cases.set(id, { case: id, inputTrees: entry.inputTrees });
      const seen = new Set();
      for (const input of entry.styleInputs) {
        assert.ok(!seen.has(input.id), 'duplicate original scalar owner'); seen.add(input.id);
        const reference = canonicalStyle(input.reference ?? {}), candidate = canonicalStyle(input.astylar ?? {});
        for (const property of ['columnGap', 'rowGap']) {
          const key = signature(entry.family, input.id, property, reference[property], candidate[property]);
          if (!observations.has(key)) continue;
          observations.get(key).push({ case: id, state: entry.state ?? 'static', inputSha256: hash(JSON.stringify(input)),
            referenceRaw: input.reference[property] ?? '<omitted>', candidateRaw: input.astylar[property] ?? '<omitted>',
            candidateRawShorthand: input.astylar.gap ?? '<omitted>' });
        }
      }
    }
  }
  assert.equal(cases.size, 2311);
  return { cases: [...cases.values()], groups: [...observations].map(([key, observations]) => ({ key, observations })) };
}

export function joinOwnerGapInputs(survey, rows, originalIndex) {
  assert.equal(survey.kind, 'owner-gap-local-input-survey');
  for (const flag of ['canonicalIntegration', 'inputEquivalent', 'computedCandidateVerified', 'renderingEquivalent']) assert.equal(survey[flag], false);
  assert.equal(survey.groupCount, 162); assert.equal(rows.length, 162); assert.equal(survey.groups.length, 162);
  assert.equal(survey.canonicalOccurrences, 9254); assert.equal(survey.observations, 9254);
  const groups = new Map(survey.groups.map(g => [groupKey(g), g])); assert.equal(groups.size, 162);
  const observed = new Map(originalIndex.groups.map(g => [g.key, g.observations])); assert.equal(observed.size, 162);
  assert.equal(new Set(rows.map(rowKey)).size, 162);
  assert.equal(survey.cases.length, 2311); assert.equal(originalIndex.cases.length, 2311);
  const cases = new Map(originalIndex.cases.map(c => [c.case, c])); assert.equal(cases.size, 2311);
  assert.equal(new Set(survey.cases.map(c => c.case)).size, 2311);
  for (const c of survey.cases) assert.deepEqual(c, cases.get(c.case), 'case/tree descriptors differ');
  const joined = rows.map(row => {
    assert.equal(row.attribution, 'unresolved');
    const key = rowKey(row), group = groups.get(key), observations = observed.get(key);
    assert.ok(group && observations?.length, 'canonical group missing original membership');
    assert.equal(new Set(observations.map(o => o.case)).size, observations.length);
    assert.ok(observations.every(o => cases.has(o.case)));
    assert.equal(group.originalCountMatchesCanonical, true);
    assert.equal(group.canonicalOccurrences, observations.length); assert.equal(row.occurrences, observations.length);
    assert.deepEqual(group.originalCases, observations.map(o => o.case), 'survey exact membership/order differs');
    assert.deepEqual(row.cases, observations.slice(0, 12).map(o => o.case), 'canonical sample membership/order differs');
    assert.deepEqual(row.states, [...new Set(observations.map(o => o.state))], 'canonical states differ');
    assert.equal(group.reference, row.reference); assert.equal(omitted(group.candidate), omitted(row.astylar));
    return { family: row.family, element: row.element, property: row.property, reference: row.reference,
      candidate: row.astylar ?? '<omitted>', canonicalClassification: row.classification,
      canonicalAttribution: row.attribution, canonicalRowSha256: hash(JSON.stringify(row)),
      surveyGroupSha256: hash(JSON.stringify(group)), originalProofSha256: group.proofSha256,
      occurrences: row.occurrences, states: row.states, canonicalSample: row.cases, observations,
      inputEquivalent: false, computedCandidateVerified: false, rendererCauseProven: false };
  });
  assert.equal(joined.reduce((n, r) => n + r.occurrences, 0), 9254);
  return joined;
}

export async function loadGapJoinInputs() {
  const surveyBytes = readFileSync(surveyFile), survey = JSON.parse(surveyBytes);
  for (const source of survey.sourceFingerprints) readGapSurveySource(source);
  assert.equal(survey.baselineRevision, canonicalRevision);
  const git = file => execFileSync('git', ['show', `${canonicalRevision}:${file}`], { maxBuffer: 64 * 1024 * 1024 });
  const manifest = JSON.parse(git('docs/material-input-equivalence-audit.json'));
  assert.equal(manifest.compressedSha256, survey.baselineCompressedSha256);
  assert.match(manifest.payload, /^material-input-equivalence-audit[^/\\]*\.gz$/);
  const payload = git('docs/' + manifest.payload);
  assert.equal(payload.length, manifest.compressedBytes); assert.equal(hash(payload), manifest.compressedSha256);
  const rows = [], parser = new Parser(); let done = false, canonicalTotalGroups = 0;
  parser.onValue = function(value) {
    const top = this.stack[1]?.key ?? (this.stack.length === 1 ? this.key : undefined);
    if (this.stack.length === 2 && top === 'discrepancies') {
      canonicalTotalGroups++;
      if (value.attribution === 'unresolved' && ['columnGap', 'rowGap'].includes(value.property)) rows.push(value);
      delete this.value[this.key];
    } else if (this.stack.length === 1) { if (this.key === 'discrepancies') done = true; delete this.value[this.key]; }
    else if (this.value && top !== 'discrepancies') delete this.value[this.key];
  };
  for await (const chunk of Readable.from([payload]).pipe(createGunzip())) { parser.write(chunk); if (done) break; }
  assert.ok(done); assert.equal(rows.length, 162); assert.equal(canonicalTotalGroups, 8339);
  const canonicalStyle = bindGapSurveyNormalizer(survey);
  const bytes = readFileSync(survey.capture.file); assert.equal(hash(bytes), survey.capture.sha256);
  const original = JSON.parse(bytes);
  const originalIndex = prepareGapOriginalIndex(original, rows, canonicalStyle);
  return { survey, surveyBytes, manifest, rows, originalIndex, canonicalTotalGroups };
}

export function buildGapJoinReport(inputs) {
  const rows = joinOwnerGapInputs(inputs.survey, inputs.rows, inputs.originalIndex);
  return { schemaVersion: 1, kind: 'owner-gap-canonical-membership-join',
    canonicalRevision, canonicalCompressedSha256: inputs.manifest.compressedSha256,
    canonicalTotalGroups: inputs.canonicalTotalGroups,
    survey: { file: surveyFile, sha256: hash(inputs.surveyBytes) }, capture: inputs.survey.capture,
    productionNormalization: inputs.survey.productionNormalization,
    counts: { groups: rows.length, cases: inputs.originalIndex.cases.length, observations: 9254,
      rawOmittedLonghandsWithPresentShorthand: rows.reduce((n, r) => n + r.observations.filter(o =>
        o.candidateRaw === '<omitted>' && o.candidateRawShorthand !== '<omitted>').length, 0) },
    rows, canonicalIntegration: false, inputEquivalent: false,
    limits: ['Historical canonical rows, original complete case membership, sample order and states are bound without changing classifications.',
      'Candidate shorthand is expanded only by the original production comparison functions; raw local fields remain visible.',
      'Membership is not computed/default, structural or rendered equivalence. Existing declaration/tree proofs remain separately required.'] };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2); assert.ok(args.length === 0 || args.length === 1 && args[0] === '--check');
  const report = buildGapJoinReport(await loadGapJoinInputs());
  report.sourceFingerprint = { file: 'scripts/audit-material-owner-gap-canonical-join.mjs',
    sha256: hash(readFileSync('scripts/audit-material-owner-gap-canonical-join.mjs', 'utf8').replaceAll('\r\n', '\n')) };
  const target = 'docs/material-owner-gap-canonical-join.json', output = JSON.stringify(report, null, 2) + '\n';
  if (args[0] === '--check') assert.equal(readFileSync(target, 'utf8').replaceAll('\r\n', '\n'), output);
  else writeFileSync(target, output);
  console.log(JSON.stringify({ ...report.counts, canonicalIntegration: false }));
}
