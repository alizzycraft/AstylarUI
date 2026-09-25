import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { inspectOwnerInitialStyle, ownerInitialValues } from './owner-initial-style-survey.mjs';
import { originStageTrees } from './origin-stage-inventory-evidence.mjs';
import { inspectOwnerInitialMotion } from '../../scripts/audit-material-owner-initial-motion.mjs';
import { inspectMotionDelayTargets } from '../../scripts/audit-material-motion-delay-targets.mjs';
import { inspectDescendantColor } from './root-color-descendant-evidence.mjs';
import { collectRootTypographyInputs } from './root-typography-input-evidence.mjs';
import { collectRootColorInputs } from './root-color-input-evidence.mjs';
import { rootInitialSelectorCanApply } from './root-initial-style-evidence.mjs';
import { bindPreciseAuditNormalization } from './audit-normalization-contracts.mjs';
import { collectFullTreeInventory } from './input-equivalence-audit.mjs';

export const ownerInitialStyleAttribution = 'reviewed-owner-initial-style-observation-stage';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const keyOf = e => `${e.kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`;
const scalar = (p, v) => p === 'wordSpacing' && v === '0px' ? '0' : v;
// Extend the source-bound attribution, not the historical survey's population.
// Appearance remains a computed-reference/local-omission observation, never an
// inferred candidate default or a waiver of native control paint requirements.
// Read lazily: the survey's reviewed owner mappings import the audit module,
// which imports this attribution module in turn.
const reviewedInitialValues = () => ({ ...ownerInitialValues, appearance: 'none' });
const propertiesOf = input => Object.entries(reviewedInitialValues())
  .filter(([p, v]) => input.reference?.[p] === v && input.astylar?.[p] === undefined).map(([p]) => p)
  .concat(input.reference?.color !== undefined && input.astylar?.color === undefined ? ['color'] : []);
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

function inspect(entry, trees, colorRoot, canonical) {
  const observations = [];
  for (const input of entry.styleInputs) for (const property of propertiesOf(input)) {
    if (property === 'color') {
      const proof = trees && inspectDescendantColor(input, colorRoot, trees.reference, trees.candidate,
        canonical, { family: entry.family, case: keyOf(entry) });
      observations.push({ case: keyOf(entry), family: entry.family, element: input.id, property,
        referenceValue: canonical(input.reference).color,
        disposition: proof ? 'captured-inherited-color-versus-local-omission' : 'requires-specific-review',
        computedCandidateVerified: false, renderingEquivalent: false,
        ...(proof ? { descendantColor: proof, source: proof.source, revision: proof.revision }
          : { issues: [{reason: 'descendant-color-ancestry-or-owner-not-proven'}] }) });
      continue;
    }
    const proof = trees ? inspectOwnerInitialStyle(input, property, trees.reference, trees.candidate,
      { family: entry.family, reviewedGeneratedOwners: true, reviewedAppearance: true }) : {
      property, element: input.id, issues: [{ reason: 'missing-paired-inventory-evidence' }],
      disposition: 'requires-specific-review', computedCandidateVerified: false, renderingEquivalent: false };
    const motionReview = property === 'appearance' && trees && proof.issues.length &&
      proof.issues.every(i => i.reason === 'motion-request-needs-review' && i.side === 'reference')
      ? inspectOwnerInitialMotion(input, property, trees.reference, trees.candidate, entry.family,
        { reviewedAppearance: true }) : undefined;
    observations.push({ case: keyOf(entry), family: entry.family, element: input.id, property,
      referenceValue: scalar(property, input.reference[property]), ...proof,
      ...(motionReview ? { motionReview } : {}) });
  }
  return observations;
}

// Reuse the captured inventory without manufacturing inherited/used styles.
// Keep negative observations too: eligibility is not proof of equivalence.
export function collectOwnerInitialStyleEvidence(report, inventory) {
  const cases = casesOf(report), canonical = bindPreciseAuditNormalization();
  const roots = new Map(collectRootColorInputs(collectRootTypographyInputs(inventory, canonical,
    rootInitialSelectorCanApply), canonical).map(p => [p.case, p]));
  return { schemaVersion: 1, observations: cases.flatMap(e => inspect(e, originStageTrees(inventory, keyOf(e)), roots.get(keyOf(e)), canonical)) };
}

export function classifyOwnerInitialStyleInput(input, property, reference, candidate, proof) {
  if (property === 'color') {
    const p = proof?.descendantColor;
    if (!p || proof.disposition !== 'captured-inherited-color-versus-local-omission' ||
        proof.element !== input.id || p.element !== input.id || proof.property !== property || p.property !== property ||
        p.case !== proof.case || p.family !== proof.family || p.source !== proof.source || p.revision !== proof.revision ||
        p.ownerCorrespondenceVerified !== true || p.classification !== 'parity-harness-defect' ||
        ['computedCandidateVerified', 'finalRasterVerified', 'inputEquivalent', 'renderingEquivalent'].some(k => p[k] !== false) ||
        proof.computedCandidateVerified !== false || proof.renderingEquivalent !== false ||
        proof.source !== 'core-style-inspection' || !Number.isInteger(proof.revision) || proof.revision < 0 ||
        candidate !== undefined || reference !== proof.referenceValue || reference !== p.values?.reference ||
        !['astylar', 'astylarNormalResolvedStyle', 'astylarInteractionResolvedStyle'].every(s => input[s] && input[s].color === undefined)) return;
    return { classification: 'parity-harness-defect', attribution: ownerInitialStyleAttribution,
      owner: 'input audit inherited computed color versus local declaration stages', reviewEvidence: proof,
      justification: 'Original scalar values, owner mappings and complete captured ancestry are independently bound. The browser includes the root color through inheritance while candidate local declaration stages omit color; no intervening color, reset or motion request is waived. This diagnoses different observation stages only, not a missing authored request, synthesized candidate computed color or equal rendering. Descendant color consumption, currentColor paint, compositing and raster remain separate obligations.' };
  }
  const initialValues = reviewedInitialValues();
  let disjointMotion = false;
  if (property === 'appearance' && proof?.motionReview) {
    const { case: caseKey, family, referenceValue, motionReview, ...originalProof } = proof;
    disjointMotion = isDeepStrictEqual(originalProof, motionReview.proof) &&
      proof.issues?.length > 0 && proof.issues.every(i => i.reason === 'motion-request-needs-review' && i.side === 'reference') &&
      ['inputEquivalent', 'computedCandidateVerified', 'renderingEquivalent'].every(k => motionReview[k] === false) &&
      ((motionReview.disposition === 'captured-motion-targets-disjoint' && motionReview.reasons?.length === 0) ||
        inspectMotionDelayTargets(motionReview, { reviewedAppearance: true }).disposition === 'captured-owner-target-set-disjoint');
  }
  if (!proof || !(disjointMotion || proof.disposition === 'captured-default-versus-local-omission' && proof.issues?.length === 0) ||
      proof.element !== input.id || proof.property !== property || !Object.hasOwn(initialValues, property) ||
      reference !== scalar(property, initialValues[property]) || reference !== proof.referenceValue ||
      candidate !== undefined || input.astylar?.[property] !== undefined ||
      proof.computedCandidateVerified !== false || proof.renderingEquivalent !== false ||
      proof.source !== 'core-style-inspection' || !Number.isInteger(proof.revision) || proof.revision < 0) return;
  return { classification: 'parity-harness-defect', attribution: ownerInitialStyleAttribution,
    owner: 'input audit captured computed defaults versus local declaration stages', reviewEvidence: proof,
    justification: disjointMotion
      ? 'The independently bound appearance scalar and mapped tree retain browser-computed none versus omitted candidate local declarations. Original motion issues remain recorded: complete captured reference transition targets are disjoint, including explicit same-owner target witnesses for delay-only rules where required. No relevant explicit appearance/reset request is waived. This identifies an observation-stage mismatch only; it proves neither a cascade winner, inactive motion, candidate computed appearance, native control paint nor rendering equivalence.'
      : 'The independently bound scalar and mapped tree retain a browser-computed initial value while all candidate local declaration stages omit it. Captured surface ancestry contains no relevant explicit, reset or motion request. This is an observation-stage mismatch, not a synthesized candidate computed value, an authoring waiver or rendering equivalence. Preserve uncaptured document inheritance, descendant used-value consumption, wrapping, hit testing, visibility, layout and raster obligations.' };
}

// Full original-source replay prevents self-consistent removal of both a
// retained observation and its claimed attribution from hiding a case.
export function validateOwnerInitialStyleSource(binding, evidence, { root = process.cwd() } = {}) {
  const errors = [];
  try {
    const original = readOwnerInitialStyleSource(binding, { root });
    const inventory = collectFullTreeInventory(casesOf(original), { root });
    if (inventory.errors.length) throw new Error('owner initial-style tree digest or inventory changed');
    const replay = collectOwnerInitialStyleEvidence(original, inventory);
    if (!isDeepStrictEqual(replay, evidence)) throw new Error('owner initial-style source observation coverage or proof changed');
  } catch (error) { errors.push(String(error)); }
  return errors;
}
