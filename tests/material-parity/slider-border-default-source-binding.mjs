import { readFileSync, realpathSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { collectSliderInputBoxes } from './slider-input-box-source-binding.mjs';
import { inspectSliderBorderDefaults } from './slider-border-default-evidence.mjs';

export const sliderBorderDefaultAttribution = 'reviewed-slider-native-border-default-policy';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const keyOf = entry => `${entry.kind}:slider@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`;
const readSource = (root, file) => {
  const boundary = realpathSync(path.resolve(root, 'artifacts/material-parity'));
  const absolute = realpathSync(path.resolve(root, file));
  const relative = path.relative(boundary, absolute);
  if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative))
    throw new Error('slider border source escapes Material artifacts');
  return readFileSync(absolute);
};

// Reuse the existing complete-population binding, not caller-provided accepted
// owners. Rejected border owners remain in captures and cannot disappear silently.
export function collectSliderBorderDefaults(report, options = {}) {
  const root = options.root ?? process.cwd();
  const boxes = collectSliderInputBoxes(report, options);
  const empty = { binding: boxes.binding, captures: [], observations: [] };
  if (boxes.binding.status !== 'bound') return empty;
  try {
    const observations = [];
    for (const entry of boxes.captures) {
      const trees = {};
      for (const side of ['reference', 'astylar']) {
        const source = entry.inputTrees[side], bytes = readSource(root, source.file);
        if (hash(bytes) !== source.sha256) throw new Error('slider border tree digest changed');
        trees[side] = JSON.parse(bytes);
      }
      for (const element of ['slider-start', 'slider-primary']) {
        const inputs = entry.styleInputs.filter(input => input.id === element);
        if (inputs.length !== 1) continue;
        const proof = inspectSliderBorderDefaults(entry, inputs[0], trees.reference, trees.astylar);
        if (proof) observations.push({ case: keyOf(entry), state: entry.state ?? 'static',
          element, input: structuredClone(inputs[0]), proof });
      }
    }
    return { binding: boxes.binding, captures: boxes.captures, observations };
  } catch (error) {
    return { ...empty, binding: { status: 'invalid', error: String(error) } };
  }
}

export function classifySliderBorderDefault(input, property, reference, astylar, observation, canonicalStyle) {
  if (!observation || !isDeepStrictEqual(input, observation.input) ||
      !observation.proof.properties.some(item => item.property === property) ||
      canonicalStyle(input.reference)[property] !== reference ||
      canonicalStyle(input.astylar)[property] !== astylar) return;
  if (property.endsWith('Color')) return {
    classification: 'intentional-documented-limitation', attribution: sliderBorderDefaultAttribution,
    owner: 'core input-type default selection and compatibility catalog',
    reviewEvidence: { case: observation.case, element: observation.element,
      referenceNode: observation.proof.reference.node, candidateNode: observation.proof.candidate.node,
      borderAuthoringEquivalent: true, inputEquivalent: false,
      usedBoxParityVerified: false, finalRasterVerified: false },
    justification: 'Both captured native range owners omit border and appearance declarations. Chromium computes the captured native border color (including a distinct disabled color, not inferred currentColor); all three candidate stages retain the generic input borderColor #bdc3c7 from browser-defaults.ts. Complete original owner and declaration replay establishes this default-stage divergence. Both input layers have opacity zero; this is not the visible thumb/ring and does not diagnose drag, hit testing or final raster. The existing isolated public proof establishes width/style/radius default selection, not this color observation; no new public color-parity claim is made.',
  };
  return {
    classification: 'intentional-documented-limitation', attribution: sliderBorderDefaultAttribution,
    owner: 'core input-type default selection and compatibility catalog',
    reviewEvidence: { case: observation.case, element: observation.element,
      referenceNode: observation.proof.reference.node, candidateNode: observation.proof.candidate.node,
      borderAuthoringEquivalent: true, inputEquivalent: false,
      usedBoxParityVerified: false, finalRasterVerified: false },
    justification: 'Both original native range owners omit border and appearance author declarations. Chromium computes zero-width, none-style, zero-radius borders; all three candidate stages retain generic input defaults of 1px, solid and 4px. The shared-input public range reduction demonstrates default selection before layout as the cause of these border differences and a content-box size effect. This documented default-policy divergence is not accepted same-input parity. The original Material padding, box sizing, domain and peer-dependent width inputs remain unequal; no original used-box delta, drag, hit-test or raster equivalence is inferred.',
  };
}

export function validateSliderBorderDefaults(evidence, { root = process.cwd() } = {}) {
  if (evidence?.binding?.status !== 'bound') return ['slider border evidence lacks original capture binding'];
  try {
    const bytes = readSource(root, evidence.binding.file);
    if (hash(bytes) !== evidence.binding.sha256) return ['slider border original capture digest changed'];
    const replay = collectSliderBorderDefaults(JSON.parse(bytes), { root, parityPath: evidence.binding.file });
    if (!isDeepStrictEqual(evidence, replay)) return ['slider border evidence does not replay from complete original sources'];
  } catch (error) { return [`slider border source replay failed: ${error}`]; }
  return [];
}

export function validateSliderBorderDefaultClassifications(evidence, discrepancies, canonicalStyle, equivalentValue) {
  const expected = [], actual = [], errors = [];
  const byOwner = new Map((evidence?.observations ?? []).map(o => [JSON.stringify([o.case, o.element]), o]));
  for (const o of evidence?.observations ?? []) {
    const r = canonicalStyle(o.input.reference), a = canonicalStyle(o.input.astylar);
    for (const { property } of o.proof.properties) if (!equivalentValue(property, r[property], a[property], r, a))
      expected.push(JSON.stringify([o.case, o.element, property, r[property], a[property]]));
  }
  for (const row of discrepancies.filter(d => d.attribution === sliderBorderDefaultAttribution)) {
    const keys = row.reviewedCases ?? [], first = byOwner.get(JSON.stringify([keys[0], row.element]));
    const classification = first && classifySliderBorderDefault(first.input, row.property, row.reference, row.astylar, first, canonicalStyle);
    const states = [...new Set(keys.map(key => byOwner.get(JSON.stringify([key, row.element]))?.state))];
    if (!classification || row.family !== 'slider' || row.classification !== classification.classification ||
        row.recommendedOwner !== classification.owner || row.justification !== classification.justification ||
        !isDeepStrictEqual(row.reviewEvidence, classification.reviewEvidence) || keys.length !== row.occurrences ||
        new Set(keys).size !== keys.length || !isDeepStrictEqual(row.cases, keys.slice(0, 12)) ||
        !isDeepStrictEqual(row.states, states)) errors.push('slider border classification lacks exact source owner/state evidence');
    for (const key of keys) actual.push(JSON.stringify([key, row.element, row.property, row.reference, row.astylar]));
  }
  if (!isDeepStrictEqual(expected.sort(), actual.sort())) errors.push('slider border scalar coverage differs from original observations');
  return errors;
}
