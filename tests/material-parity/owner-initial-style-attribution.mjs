import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { inspectOwnerInitialStyle, ownerInitialValues } from './owner-initial-style-survey.mjs';
import { originStageTrees } from './origin-stage-inventory-evidence.mjs';

export const ownerInitialStyleAttribution = 'reviewed-owner-initial-style-observation-stage';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const keyOf = e => `${e.kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`;
const scalar = (p, v) => p === 'wordSpacing' && v === '0px' ? '0' : v;
// Extend the source-bound attribution, not the historical survey's population.
// Appearance remains a computed-reference/local-omission observation, never an
// inferred candidate default or a waiver of native control paint requirements.
const reviewedInitialValues = Object.freeze({ ...ownerInitialValues, appearance: 'none' });
const propertiesOf = input => Object.entries(reviewedInitialValues)
  .filter(([p, v]) => input.reference?.[p] === v && input.astylar?.[p] === undefined).map(([p]) => p);
const casesOf = report => [['static', report.results ?? []], ['interaction', report.interactions ?? []]]
  .flatMap(([kind, entries]) => entries.map(e => ({ ...e, kind,
    styleInputs: (e.styleInputs ?? []).filter(i => propertiesOf(i).length) }))).filter(e => e.styleInputs.length);
const captureOf = e => ({ kind: e.kind, family: e.family, profile: e.profile, viewport: { id: e.viewport.id },
  ...(e.state ? { state: e.state } : {}), styleInputs: e.styleInputs, inputTrees: e.inputTrees });
const safePath = (root, file) => {
  if (typeof file !== 'string') throw new Error('missing owner initial-style source path');
  const full = path.resolve(root, file), allowed = path.resolve(root, 'artifacts/material-parity') + path.sep;
  if (!full.startsWith(allowed)) throw new Error('owner initial-style source is outside Material artifacts');
  return full;
};

export function readOwnerInitialStyleSource(binding, { root = process.cwd() } = {}) {
  if (binding?.status !== 'bound') throw new Error('owner initial-style source binding is missing');
  const bytes = readFileSync(safePath(root, binding.file));
  if (hash(bytes) !== binding.sha256) throw new Error('owner initial-style capture digest changed');
  return JSON.parse(bytes);
}

export function bindOwnerInitialStyleSource(report, { root = process.cwd(), parityPath } = {}) {
  if (!parityPath) return { status: 'unbound', reason: 'No original capture path; no owner initial-style attribution.' };
  try {
    const file = safePath(root, parityPath), bytes = readFileSync(file), original = JSON.parse(bytes);
    const cases = casesOf(original);
    if (new Set(cases.map(keyOf)).size !== cases.length || cases.some(e =>
      new Set(e.styleInputs.map(i => i.id)).size !== e.styleInputs.length))
      throw new Error('duplicate owner initial-style cases or scalar owners');
    if (!isDeepStrictEqual(casesOf(original).map(captureOf), casesOf(report).map(captureOf)))
      throw new Error('owner initial-style cases, scalars or tree references differ from original capture');
    return { status: 'bound', file: path.relative(root, file).replaceAll('\\', '/'), sha256: hash(bytes) };
  } catch (error) { return { status: 'invalid', error: String(error) }; }
}

function inspect(entry, trees) {
  const observations = [];
  for (const input of entry.styleInputs) for (const property of propertiesOf(input)) {
    const proof = trees ? inspectOwnerInitialStyle(input, property, trees.reference, trees.candidate,
      { family: entry.family, reviewedGeneratedOwners: true, reviewedAppearance: true }) : {
      property, element: input.id, issues: [{ reason: 'missing-paired-inventory-evidence' }],
      disposition: 'requires-specific-review', computedCandidateVerified: false, renderingEquivalent: false };
    observations.push({ case: keyOf(entry), family: entry.family, element: input.id, property,
      referenceValue: scalar(property, input.reference[property]), ...proof });
  }
  return observations;
}

// Reuse the captured inventory without manufacturing inherited/used styles.
// Keep negative observations too: eligibility is not proof of equivalence.
export function collectOwnerInitialStyleEvidence(report, inventory) {
  const cases = casesOf(report);
  return { schemaVersion: 1, observations: cases.flatMap(e => inspect(e, originStageTrees(inventory, keyOf(e)))) };
}

export function classifyOwnerInitialStyleInput(input, property, reference, candidate, proof) {
  if (!proof || proof.disposition !== 'captured-default-versus-local-omission' || proof.issues?.length !== 0 ||
      proof.element !== input.id || proof.property !== property || !Object.hasOwn(reviewedInitialValues, property) ||
      reference !== scalar(property, reviewedInitialValues[property]) || reference !== proof.referenceValue ||
      candidate !== undefined || input.astylar?.[property] !== undefined ||
      proof.computedCandidateVerified !== false || proof.renderingEquivalent !== false ||
      proof.source !== 'core-style-inspection' || !Number.isInteger(proof.revision) || proof.revision < 0) return;
  return { classification: 'parity-harness-defect', attribution: ownerInitialStyleAttribution,
    owner: 'input audit captured computed defaults versus local declaration stages', reviewEvidence: proof,
    justification: 'The independently bound scalar and mapped tree retain a browser-computed initial value while all candidate local declaration stages omit it. Captured surface ancestry contains no relevant explicit, reset or motion request. This is an observation-stage mismatch, not a synthesized candidate computed value, an authoring waiver or rendering equivalence. Preserve uncaptured document inheritance, descendant used-value consumption, wrapping, hit testing, visibility, layout and raster obligations.' };
}

// Full original-source replay prevents self-consistent removal of both a
// retained observation and its claimed attribution from hiding a case.
export function validateOwnerInitialStyleSource(binding, evidence, { root = process.cwd() } = {}) {
  const errors = [];
  try {
    let index = 0;
    for (const entry of casesOf(readOwnerInitialStyleSource(binding, { root }))) {
      const trees = {};
      for (const [side, name] of [['reference', 'reference'], ['astylar', 'candidate']]) {
        const descriptor = entry.inputTrees?.[side];
        const bytes = readFileSync(safePath(root, descriptor?.file));
        if (hash(bytes) !== descriptor.sha256) throw new Error('owner initial-style tree digest changed');
        trees[name] = JSON.parse(bytes);
      }
      for (const proof of inspect(entry, trees)) {
        if (!isDeepStrictEqual(proof, evidence?.observations?.[index]))
          throw new Error(`owner initial-style original proof differs at ${proof.case}#${proof.element}/${proof.property}`);
        index++;
      }
    }
    if (evidence?.schemaVersion !== 1 || evidence.observations.length !== index)
      throw new Error('owner initial-style source observation coverage changed');
  } catch (error) { errors.push(String(error)); }
  return errors;
}
