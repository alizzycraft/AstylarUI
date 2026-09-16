import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { Readable } from 'node:stream';
import { createGunzip } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import Parser from 'jsonparse';

const surveyFile = 'docs/material-field-host-layout-inputs.json';
const manifestFile = 'docs/material-input-equivalence-audit.json';
const target = 'docs/material-field-host-layout-canonical-join.json';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const caseKey = (kind, e) => `${kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`;
const properties = ['display', 'flexDirection', 'position', 'width', 'height', 'minWidth', 'boxSizing', 'alignSelf'];
// Only the existing report's zero-length spelling is reproduced here. No
// percentage-to-pixel or declaration-to-used-value equivalence is inferred.
const scalar = v => v === '<omitted>' || v === undefined ? null : v === '0px' ? '0' : v;
const signature = (family, element, property, reference, candidate) => JSON.stringify([family, element, property, scalar(reference), scalar(candidate)]);

export async function readCanonicalFieldHostRows() {
  const manifest = JSON.parse(readFileSync(manifestFile));
  assert.match(manifest.payload, /^material-input-equivalence-audit[^/\\]*\.gz$/);
  const bytes = readFileSync(`docs/${manifest.payload}`);
  assert.equal(bytes.length, manifest.compressedBytes); assert.equal(hash(bytes), manifest.compressedSha256);
  const parser = new Parser(), projection = {}; let done = false;
  parser.onValue = function(value) {
    const top = this.stack[1]?.key ?? (this.stack.length === 1 ? this.key : undefined);
    if (this.stack.length === 1) {
      if (['summary', 'discrepancies'].includes(this.key)) projection[this.key] = value;
      if (this.key === 'discrepancies') done = true;
      delete this.value[this.key];
    } else if (this.value && !['summary', 'discrepancies'].includes(top)) delete this.value[this.key];
  };
  for await (const bytesPart of Readable.from([bytes]).pipe(createGunzip())) { parser.write(bytesPart); if (done) break; }
  assert.ok(done, 'missing canonical discrepancy section');
  return { manifest, ...projection };
}

export function joinFieldHostLayout({ survey, original, discrepancies }) {
  assert.equal(survey.kind, 'field-host-original-layout-input-survey');
  assert.equal(survey.caseCount, 577); assert.equal(survey.groupCount, 72); assert.equal(survey.propertyObservations, 4616);
  for (const flag of ['canonicalIntegration', 'computedCandidateVerified', 'rendererCauseProven', 'inputEquivalent']) assert.equal(survey[flag], false);
  const families = new Set(['autocomplete', 'datepicker', 'form-field', 'input', 'select', 'timepicker']);
  const originals = new Map();
  for (const [kind, entries] of [['static', original.results], ['interaction', original.interactions]]) for (const entry of entries) {
    const key = caseKey(kind, entry); assert.ok(!originals.has(key), 'duplicate original case'); originals.set(key, { kind, entry });
  }
  assert.equal(originals.size, 2311);
  const selected = [...originals].filter(([, { entry }]) => families.has(entry.family));
  assert.equal(selected.length, 577);
  assert.deepEqual(survey.cases.map(c => c.case).sort(), selected.map(([key]) => key).sort());
  assert.equal(new Set(survey.cases.map(c => c.case)).size, 577);
  const cases = new Map(survey.cases.map(c => [c.case, c]));
  const groups = new Map(survey.groups.map(g => [signature(g.family, g.element, g.property, g.referenceComputed, g.candidateComparison), g]));
  assert.equal(groups.size, 72);
  const observed = new Map([...groups.keys()].map(key => [key, []]));
  for (const [key, { kind, entry }] of selected) {
    const c = cases.get(key), inputs = entry.styleInputs.filter(i => i.id === `${entry.family}-primary`);
    assert.equal(inputs.length, 1); const input = inputs[0];
    assert.equal(c.family, entry.family); assert.equal(c.element, input.id);
    assert.deepEqual(c.inputTrees, entry.inputTrees, 'survey tree descriptors differ from original case');
    if (kind === 'static') {
      assert.equal(c.geometry.status, 'measured-original-static-box');
      const boxes = entry.geometry.elements.filter(g => g.id === input.id);
      assert.equal(boxes.length, 1); assert.deepEqual(c.geometry.evidence, boxes[0]);
    } else {
      assert.equal(c.geometry.status, 'original-capture-host-geometry-gap');
      assert.equal(Object.hasOwn(entry, 'geometry'), false); assert.equal(Object.hasOwn(c.geometry, 'evidence'), false);
    }
    for (const property of properties) {
      const groupKey = signature(entry.family, input.id, property, input.reference[property], input.astylar[property]);
      const group = groups.get(groupKey); assert.ok(group, `source scalar has no survey group ${key}/${property}`);
      assert.equal(group.referenceComputed, input.reference[property]);
      const cssProperty = property.replace(/[A-Z]/g, letter => '-' + letter.toLowerCase());
      const referenceRequests = [...new Set(input.referenceAuthored.flatMap(rule =>
        Object.hasOwn(rule.declarations, cssProperty) ? [rule.declarations[cssProperty].value] : []))];
      const candidateRequests = [...new Set(input.astylarAuthored.flatMap(rule =>
        Object.hasOwn(rule.declarations, property) ? [rule.declarations[property]] : []))];
      assert.ok(referenceRequests.length <= 1 && candidateRequests.length <= 1, 'conflicting requests need a separate cascade proof');
      assert.equal(group.referenceAuthored, referenceRequests[0] ?? '<omitted>');
      assert.equal(group.candidateAuthored, candidateRequests[0] ?? '<omitted>');
      for (const [field, stage] of [['candidateComparison', 'astylar'], ['candidateNormal', 'astylarNormalResolvedStyle'], ['candidateEffective', 'astylarInteractionResolvedStyle']])
        assert.equal(group[field], input[stage][property] ?? '<omitted>');
      const width = property === 'width';
      assert.equal(group.classification, width ? 'harness-instrumentation-defect' : 'application-plugin-authoring-defect');
      assert.equal(group.disposition, width ? 'same-percentage-request-compared-at-different-stages' : 'different-host-layout-request');
      for (const flag of ['inputEquivalent', 'computedCandidateVerified', 'rendererCauseProven']) assert.equal(group[flag], false);
      observed.get(groupKey).push({ case: key, state: entry.state ?? 'static', inputSha256: hash(JSON.stringify(input)) });
    }
  }
  const canonical = discrepancies.filter(r => families.has(r.family) && r.element === `${r.family}-primary` && properties.includes(r.property));
  assert.equal(canonical.length, 72);
  assert.equal(new Set(canonical.map(r => signature(r.family, r.element, r.property, r.reference, r.astylar))).size, 72);
  const rows = canonical.map(row => {
    const key = signature(row.family, row.element, row.property, row.reference, row.astylar), g = groups.get(key), observations = observed.get(key);
    assert.ok(g && observations?.length, 'canonical row lacks original survey binding');
    assert.equal(g.occurrences, observations.length); assert.equal(row.occurrences, observations.length);
    assert.deepEqual(g.cases, observations.map(o => o.case).sort(), 'survey case membership differs from original scalar population');
    assert.deepEqual(row.cases, observations.slice(0, 12).map(o => o.case), 'canonical sample/order differs');
    assert.deepEqual(row.states, [...new Set(observations.map(o => o.state))], 'canonical states differ');
    return { family: row.family, element: row.element, property: row.property, reference: row.reference,
      candidate: row.astylar ?? '<omitted>', currentClassification: row.classification, currentAttribution: row.attribution ?? '<omitted>',
      proposedClassification: row.property === 'width' ? 'parity-harness-defect' : 'application-plugin-authoring-defect',
      proposedAttribution: row.property === 'width' ? 'reviewed-field-host-width-observation-stage' : 'reviewed-field-host-layout-authoring',
      referenceAuthored: g.referenceAuthored, candidateAuthored: g.candidateAuthored,
      disposition: g.disposition, canonicalRowSha256: hash(JSON.stringify(row)), surveyGroupSha256: hash(JSON.stringify(g)),
      observations, occurrences: row.occurrences, states: row.states, inputEquivalent: false,
      computedCandidateVerified: false, rendererCauseProven: false };
  });
  assert.equal(rows.reduce((n, r) => n + r.occurrences, 0), 4616);
  return rows;
}

export async function buildFieldHostLayoutJoin() {
  const surveyBytes = readFileSync(surveyFile), survey = JSON.parse(surveyBytes);
  for (const source of survey.sourceFingerprints)
    assert.equal(hash(readFileSync(source.file, 'utf8').replaceAll('\r\n', '\n')), source.sha256, `stale survey source ${source.file}`);
  const bytes = readFileSync(survey.capture.file); assert.equal(hash(bytes), survey.capture.sha256);
  const canonical = await readCanonicalFieldHostRows();
  const rows = joinFieldHostLayout({ survey, original: JSON.parse(bytes), discrepancies: canonical.discrepancies });
  const count = field => Object.fromEntries([...new Set(rows.map(r => r[field]))].sort().map(v => [v, rows.filter(r => r[field] === v).length]));
  return { schemaVersion: 1, evidenceId: 'field-host-layout-canonical-membership-join',
    baselineCommit: 'b059b4345b5d513b9eecf1b4a804498e31094d41', canonicalIntegration: false,
    survey: { file: surveyFile, sha256: hash(surveyBytes) }, originalCapture: survey.capture,
    canonical: { manifest: manifestFile, compressedSha256: canonical.manifest.compressedSha256, totalGroups: canonical.discrepancies.length },
    sourceFingerprints: ['scripts/audit-material-field-host-layout-join.mjs', 'tests/material-parity/field-host-layout-canonical-join.spec.mjs']
      .map(file => ({ file, sha256: hash(readFileSync(file, 'utf8').replaceAll('\r\n', '\n')) })),
    counts: { cases: 577, groups: rows.length, propertyObservations: 4616, measuredCases: 72, geometryGapCases: 505,
      currentAttributions: count('currentAttribution'), currentClassifications: count('currentClassification'), proposedClassifications: count('proposedClassification') },
    rows, limits: ['Membership/interpretation preparation only: no production classifier or canonical report changed.',
      'Original scalar inputs, source fingerprints, tree descriptors and geometry are rebound here; complete tree declaration replay remains the existing field-host layout survey test.',
      'No missing candidate computed style is synthesized. Percentage width identity does not establish containing-block, layout or rendering equivalence.',
      'The separate inline-parent failure is core evidence, not the classification or complete causal trace for these differently authored original examples.'] };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert.ok(process.argv.slice(2).every(a => a === '--check'));
  const report = await buildFieldHostLayoutJoin(), output = JSON.stringify(report, null, 2) + '\n';
  if (process.argv.includes('--check')) assert.equal(readFileSync(target, 'utf8').replaceAll('\r\n', '\n'), output);
  else writeFileSync(target, output);
  console.log(JSON.stringify({ target, ...report.counts, canonicalIntegration: false }));
}
