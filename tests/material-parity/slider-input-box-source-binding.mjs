import { readFileSync, realpathSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { inspectSliderInputBox } from './slider-input-box-evidence.mjs';

export const sliderInputBoxAttribution = 'reviewed-slider-native-box-requests';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const keyOf = e => `${e.kind}:slider@${e.profile}/${e.viewport?.id}${e.state ? '/' + e.state : ''}`;
const select = report => [['static', report.results ?? []], ['interaction', report.interactions ?? []]]
  .flatMap(([kind, rows]) => rows.filter(e => e.family === 'slider').map(e => ({
    kind, family: e.family, profile: e.profile, viewport: e.viewport,
    ...(e.state ? { state: e.state } : {}), inputTrees: e.inputTrees, styleInputs: e.styleInputs,
  })));
const readSource = (root, file) => {
  const boundary = realpathSync(path.resolve(root, 'artifacts/material-parity'));
  const absolute = realpathSync(path.resolve(root, file)), relative = path.relative(boundary, absolute);
  if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative))
    throw new Error('slider box source escapes Material artifacts');
  return readFileSync(absolute);
};

// Preserve the complete original slider population, including rejected owners.
// An attribution cannot be established from a caller-selected evidence subset.
export function collectSliderInputBoxes(report, { root = process.cwd(), parityPath } = {}) {
  const empty = { binding: { status: 'unbound' }, captures: [], observations: [] };
  if (!parityPath) return empty;
  try {
    const bytes = readSource(root, parityPath), captures = select(JSON.parse(bytes));
    if (!isDeepStrictEqual(captures, select(report))) throw new Error('slider population differs from original capture');
    if (new Set(captures.map(keyOf)).size !== captures.length) throw new Error('duplicate slider capture identity');
    const observations = [];
    for (const entry of captures) {
      const trees = {};
      for (const side of ['reference', 'astylar']) {
        const source = entry.inputTrees?.[side];
        if (!source?.file) throw new Error('slider tree lacks source file');
        const treeBytes = readSource(root, source.file);
        if (hash(treeBytes) !== source.sha256) throw new Error('slider tree digest changed');
        trees[side] = JSON.parse(treeBytes);
      }
      for (const element of ['slider-start', 'slider-primary']) {
        const inputs = entry.styleInputs?.filter(i => i.id === element);
        if (inputs?.length !== 1) continue;
        const proof = inspectSliderInputBox(entry, inputs[0], trees.reference, trees.astylar);
        if (proof) observations.push({ case: keyOf(entry), state: entry.state ?? 'static',
          element, input: structuredClone(inputs[0]), proof });
      }
    }
    return { binding: { status: 'bound',
      file: path.relative(root, path.resolve(root, parityPath)).replaceAll('\\', '/'), sha256: hash(bytes) },
    captures, observations };
  } catch (error) { return { ...empty, binding: { status: 'invalid', error: String(error) } }; }
}

export function classifySliderInputBox(input, property, reference, astylar, observation, canonicalStyle) {
  if (!observation || !isDeepStrictEqual(input, observation.input) ||
      !observation.proof.properties.some(p => p.property === property) ||
      canonicalStyle(input.reference)[property] !== reference ||
      canonicalStyle(input.astylar)[property] !== astylar) return;
  return { classification: 'application-plugin-authoring-defect', attribution: sliderInputBoxAttribution,
    owner: 'showcase range control native box authoring through shared CSS layout and control APIs',
    reviewEvidence: { case: observation.case, element: observation.element,
      referenceNode: observation.proof.reference.node, candidateNode: observation.proof.candidate.node,
      inputEquivalent: false, finalRasterVerified: false },
    justification: 'The original native range owner explicitly requests inline padding and Material content-box sizing. The corresponding candidate omits those requests, retains generic input padding in all three captured style stages and authors fixed-half hit inputs instead of the reference peer/state-dependent mechanism. These five box-request differences begin before layout/projection. This is not proof that padding alone causes swapped or jerky dragging, that omitted box sizing has an equivalent used value, or that core defaults, hit testing, pointer capture and raster are correct.' };
}

export function validateSliderInputBoxes(evidence, { root = process.cwd() } = {}) {
  if (evidence?.binding?.status !== 'bound') return ['slider box evidence lacks original capture binding'];
  try {
    const bytes = readSource(root, evidence.binding.file);
    if (hash(bytes) !== evidence.binding.sha256) return ['slider box original capture digest changed'];
    const replay = collectSliderInputBoxes(JSON.parse(bytes), { root, parityPath: evidence.binding.file });
    if (!isDeepStrictEqual(evidence, replay)) return ['slider box evidence does not replay from complete original sources'];
  } catch (error) { return [`slider box source replay failed: ${error}`]; }
  return [];
}

export function validateSliderInputBoxClassifications(evidence, discrepancies, canonicalStyle, equivalentValue) {
  const expected = [], actual = [], errors = [];
  const byOwner = new Map((evidence?.observations ?? []).map(o => [JSON.stringify([o.case, o.element]), o]));
  for (const o of evidence?.observations ?? []) {
    const r = canonicalStyle(o.input.reference), a = canonicalStyle(o.input.astylar);
    for (const { property } of o.proof.properties) if (!equivalentValue(property, r[property], a[property], r, a))
      expected.push(JSON.stringify([o.case, o.element, property, r[property], a[property]]));
  }
  for (const row of discrepancies.filter(d => d.attribution === sliderInputBoxAttribution)) {
    const keys = row.reviewedCases ?? [], first = byOwner.get(JSON.stringify([keys[0], row.element]));
    const classification = first && classifySliderInputBox(first.input, row.property, row.reference, row.astylar, first, canonicalStyle);
    const states = [...new Set(keys.map(key => byOwner.get(JSON.stringify([key, row.element]))?.state))];
    if (!classification || row.family !== 'slider' || row.classification !== classification.classification ||
        row.recommendedOwner !== classification.owner || row.justification !== classification.justification ||
        !isDeepStrictEqual(row.reviewEvidence, classification.reviewEvidence) || keys.length !== row.occurrences ||
        new Set(keys).size !== keys.length || !isDeepStrictEqual(row.cases, keys.slice(0, 12)) ||
        !isDeepStrictEqual(row.states, states)) errors.push('slider box classification lacks exact source owner/state evidence');
    for (const key of keys) actual.push(JSON.stringify([key, row.element, row.property, row.reference, row.astylar]));
  }
  if (!isDeepStrictEqual(expected.sort(), actual.sort())) errors.push('slider box scalar coverage differs from original observations');
  return errors;
}
