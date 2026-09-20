import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { collectFullTreeInventory, collectRetainedTypographyEvidence } from '../tests/material-parity/input-equivalence-audit.mjs';
import { bindPreciseAuditNormalization, preciseAuditNormalization } from '../tests/material-parity/audit-normalization-contracts.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const digest = value => hash(JSON.stringify(value));
const attribution = family => family === 'expansion' ? 'reviewed-disabled-component-opaque-ink-input' : 'reviewed-disabled-choice-label-ink-input';

// Pure join only. Source authentication and fresh typography replay are required
// in the collector; an internally consistent supplied review is not evidence.
export function joinDisabledLabelColorStages(input, group, review, normalize) {
  assert.equal(input.id, group.element);
  assert.equal(group.property, 'color');
  assert.ok(['checkbox', 'radio', 'expansion'].includes(group.family));
  assert.equal(review.family, group.family); assert.equal(review.element, group.element);
  assert.equal(review.property, 'color'); assert.ok(group.cases.includes(review.case));
  assert.equal(review.attribution, attribution(group.family));
  assert.equal(review.classification, 'application-plugin-authoring-defect');
  const reference = normalize(input.reference).color;
  const candidateLocal = normalize(input.astylar).color ?? null;
  assert.equal(reference, group.after.reference);
  assert.equal(candidateLocal, group.after.candidate);
  assert.equal(review.values.reference, reference);
  assert.equal(review.values.effective ?? null, candidateLocal);
  assert.equal(review.values.normal ?? null, candidateLocal);
  assert.equal(typeof review.values.retained, 'string');
  assert.notEqual(review.values.retained, reference);
  assert.notEqual(group.before.reference, reference);
  assert.ok(review.reviewEvidence && review.recommendedOwner);
  return { case: review.case, family: group.family, element: group.element, property: 'color',
    originalInputSha256: digest(input), reference, candidateLocal,
    candidateRetained: review.values.retained, ownColorOmitted: candidateLocal === null,
    attribution: review.attribution, classification: review.classification,
    recommendedOwner: review.recommendedOwner, justification: review.justification,
    retainedReviewSha256: digest(review),
    localOmissionPreserved: true, canonicalAttributionChanged: false,
    inputEquivalent: false, renderingEquivalent: false };
}

export function collectDisabledLabelColorStages() {
  const file = 'docs/material-color-normalization-transition.json', bytes = readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
  const transition = JSON.parse(bytes), captureBytes = readFileSync(transition.capture.file);
  assert.equal(hash(captureBytes), transition.capture.sha256);
  const original = JSON.parse(captureBytes), normalize = bindPreciseAuditNormalization();
  const groups = transition.findings.filter(group => group.property === 'color' && ['checkbox', 'radio', 'expansion'].includes(group.family));
  assert.equal(groups.length, 8);
  const wanted = new Set(groups.flatMap(group => group.cases));
  const key = entry => `interaction:${entry.family}@${entry.profile}/${entry.viewport.id}/${entry.state}`;
  const cases = original.interactions.filter(entry => wanted.has(key(entry))).map(entry => ({ ...entry, kind: 'interaction' }));
  assert.equal(cases.length, 24); assert.equal(wanted.size, 24);
  const inventory = collectFullTreeInventory(cases);
  for (const field of ['errors', 'gaps', 'resolvedStyleGaps', 'stateStyleGaps', 'referenceContextGaps']) assert.deepEqual(inventory[field], []);
  const typography = collectRetainedTypographyEvidence(cases, inventory);
  const reviews = typography.differences.filter(row => row.property === 'color' && row.attribution === attribution(row.family));
  assert.equal(reviews.length, 32);
  const observations = groups.flatMap(group => group.cases.map(caseId => {
    const entry = cases.find(entry => key(entry) === caseId); assert.ok(entry);
    const inputs = entry.styleInputs.filter(input => input.id === group.element); assert.equal(inputs.length, 1);
    const matches = reviews.filter(row => row.case === caseId && row.element === group.element); assert.equal(matches.length, 1);
    return { ...joinDisabledLabelColorStages(inputs[0], group, matches[0], normalize), inputTrees: entry.inputTrees };
  }));
  assert.equal(observations.length, 32);
  return { schemaVersion: 1, kind: 'disabled-label-color-stage-reconciliation',
    capture: transition.capture, transition: { file, sha256: hash(bytes) }, normalization: preciseAuditNormalization,
    counts: { groups: 8, cases: 24, observations: 32, ownColorOmitted: observations.filter(row => row.ownColorOmitted).length },
    observations, canonicalAttributionChanged: false, rendererChanged: false,
    limitation: 'Reconciles current precise local-style differences with independently replayed retained typography findings. Does not rewrite omitted styles as inherited values or prove raster equivalence. Canonical discrepancy classification remains separate.' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  assert.ok(process.argv.length === 2 || process.argv.length === 3 && process.argv[2] === '--check');
  const report = collectDisabledLabelColorStages(), output = JSON.stringify(report, null, 2) + '\n';
  const file = 'docs/material-disabled-label-color-stages.json';
  if (process.argv[2] === '--check') assert.equal(readFileSync(file, 'utf8').replaceAll('\r\n', '\n'), output);
  else writeFileSync(file, output);
  console.log(JSON.stringify({ ...report.counts, sha256: hash(output) }));
}
