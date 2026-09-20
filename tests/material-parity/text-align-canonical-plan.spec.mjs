import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { collectTextAlignmentPlan, planTextAlignment, reviewTextAlignmentObservation } from '../../scripts/bind-material-text-align-ancestry.mjs';
import { bindHistoricalAuditNormalization } from './audit-normalization-contracts.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const digest = value => hash(JSON.stringify(value));
const file = 'docs/material-text-align-canonical-plan.json';
const savedBytes = readFileSync(file, 'utf8').replaceAll('\r\n', '\n'), saved = JSON.parse(savedBytes);
const sourceBytes = readFileSync(saved.sourceProof.file, 'utf8').replaceAll('\r\n', '\n');
assert.equal(hash(sourceBytes), saved.sourceProof.sha256);
const proof = JSON.parse(sourceBytes), originalBytes = readFileSync(saved.originalCapture.file);
assert.equal(hash(originalBytes), saved.originalCapture.sha256);
const original = JSON.parse(originalBytes);
const normalize = bindHistoricalAuditNormalization(saved.productionNormalization, '957774a');
const observations = ['proposed', 'retained', 'previous'].flatMap(name => saved[name]);
const rows = observations.map(group => ({ family: group.family, element: group.element, property: group.property,
  reference: group.reference, ...(Object.hasOwn(group, 'astylar') ? { astylar: group.astylar } : {}),
  occurrences: group.occurrences, cases: group.cases, states: group.states, attribution: group.previousAttribution }));
const sample = id => structuredClone(proof.patterns[proof.findings.find(f => f.element === id).pattern].proof);

test('text alignment plan replays original sources and the whole frozen canonical payload without writes', async () => {
  const before = new Map([file, saved.sourceProof.file, 'docs/material-input-equivalence-audit.json',
    'docs/material-input-equivalence-audit.json.gz'].map(file => [file, hash(readFileSync(file))]));
  const actual = await collectTextAlignmentPlan();
  assert.equal(hash(JSON.stringify(actual, null, 2) + '\n'), hash(savedBytes));
  for (const [file, sha256] of before) assert.equal(hash(readFileSync(file)), sha256, file);
  assert.equal(saved.originalGroups, 101); assert.equal(saved.originalObservations, 5978);
  assert.equal(saved.casesScanned, 2311); assert.equal(saved.equalScalarObservations, 960);
  assert.equal(saved.missingScalarObservations.length, 8);
  assert.equal(saved.proposedGroups + saved.retainedGroups + saved.previousGroups, 101);
  assert.equal(saved.proposedObservations + saved.retainedObservations + saved.previousObservations, 5978);
  assert.equal(saved.otherCompleteRows + saved.proposedGroups, 8339);
  assert.equal(saved.canonicalAttributionChanged, false);
});

test('classification boundaries retain inheritance requests resets direction and ambiguous attributes', () => {
  const base = sample('checkbox-label');
  assert.equal(reviewTextAlignmentObservation(base).attribution, 'reviewed-text-alignment-observation-stage-mismatch');
  const controls = [
    p => { p.candidate = 'left'; },
    p => { p.reference = 'right'; },
    p => { p.referencePath[0].computed.direction = 'rtl'; },
    p => { p.referencePath.at(-1).computed.textAlign = 'center'; },
    p => { p.candidateRequestNodes.push('ancestor'); },
    p => { p.referenceRequestNodes.push('ancestor'); },
    p => { p.candidatePath[0].localValues.resolvedStyle = 'right'; },
    p => { p.candidatePath[0].authored.attributes = { style: 'text-align: center' }; },
    p => { p.referencePath[0].attributes.style = 'all: inherit'; },
    p => { p.referencePath[0].attributes.style = '/* uncertain */ color: red'; },
  ];
  for (const mutate of controls) { const p = structuredClone(base); mutate(p); assert.equal(reviewTextAlignmentObservation(p), null); }
  assert.equal(reviewTextAlignmentObservation(sample('expansion-title')), null);
  assert.equal(reviewTextAlignmentObservation(sample('stepper-content')), null);
  assert.equal(reviewTextAlignmentObservation(sample('progress-bar-primary')), null);
  assert.equal(reviewTextAlignmentObservation(sample('bottom-sheet-overlay')), null);
  const tooltip = sample('tooltip-popup');
  assert.equal(reviewTextAlignmentObservation(tooltip).attribution, 'reviewed-tooltip-scalar-text-alignment-omission');
  for (const mutate of [p => { p.candidatePath[0].retainedText.textAlign = 'center'; },
    p => { p.candidatePath[0].retainedText.source = 'unverified'; },
    p => { p.referencePath[0].requests[0].active = false; },
    p => { p.candidateRequestNodes.push('popup'); }]) {
    const p = structuredClone(tooltip); mutate(p); assert.equal(reviewTextAlignmentObservation(p), null);
  }
});

test('canonical plan preserves prior reviews and unrelated rows rather than relabeling every survey group', () => {
  const extra = { family: 'unrelated', property: 'width', attribution: 'unresolved', occurrences: 1, cases: ['other'], states: ['static'] };
  const supplied = [...rows, extra], before = digest(supplied);
  const actual = planTextAlignment(proof, original, supplied, normalize);
  assert.equal(digest(supplied), before);
  assert.deepEqual(actual.proposed.map(g => [g.family, g.element, g.proposedAttribution, g.occurrences]),
    saved.proposed.map(g => [g.family, g.element, g.proposedAttribution, g.occurrences]));
  assert.deepEqual(actual.previous.map(g => g.previousAttribution), saved.previous.map(g => g.previousAttribution));
  assert.equal(actual.otherCompleteRows, saved.retainedGroups + saved.previousGroups + 1);
  const changed = structuredClone(rows), target = saved.proposed[0];
  changed.find(r => r.family === target.family && r.element === target.element).attribution = 'prior-review';
  const preserved = planTextAlignment(proof, original, changed, normalize);
  assert.equal(preserved.proposedGroups, saved.proposedGroups - 1);
  assert.ok(preserved.previous.some(g => g.previousAttribution === 'prior-review'));
  for (const group of saved.proposed) for (const flag of ['wholeElementInputEquivalent', 'candidateComputedVerified',
    'usedAlignmentVerified', 'renderingEquivalent', 'rendererCauseProven']) assert.equal(group[flag], false);
});

test('membership proof rejects changed groups source input identities and complete-row populations', () => {
  const controls = [
    p => { p.findings.pop(); },
    p => { p.findings.push(p.findings[0]); },
    p => { p.findings[0].originalInputSha256 = '0'.repeat(64); },
    p => { p.findings[0].inputTrees = {}; },
    p => { p.patterns[p.findings[0].pattern].proof.reference = 'invented'; },
    p => { p.groups[0].cases.pop(); },
    p => { p.groups.push(p.groups[0]); },
    p => { p.missingScalarObservations.pop(); },
    p => { p.equalScalarObservations++; },
    p => { p.casesScanned--; },
  ];
  for (const mutate of controls) { const p = structuredClone(proof); mutate(p); assert.throws(() => planTextAlignment(p, original, rows, normalize)); }
  for (const mutate of [r => r.pop(), r => r.push(r[0]), r => { r[0].occurrences++; },
    r => { r[0].cases = ['invented']; }, r => { r[0].states = ['invented']; }]) {
    const r = structuredClone(rows); mutate(r); assert.throws(() => planTextAlignment(proof, original, r, normalize));
  }
});
