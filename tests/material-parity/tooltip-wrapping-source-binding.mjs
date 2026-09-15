import { readFileSync, realpathSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { inspectTooltipWrappingInput } from './tooltip-wrapping-input-evidence.mjs';

export const tooltipWrappingAttribution = 'reviewed-tooltip-wrapping-inputs';
const hash = b => createHash('sha256').update(b).digest('hex');
const keyOf = e => `${e.kind}:tooltip@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`;
const select = report => [['static', report.results ?? []], ['interaction', report.interactions ?? []]]
  .flatMap(([kind, rows]) => rows.filter(e => e.family === 'tooltip').map(e => ({ kind, family: e.family,
    profile: e.profile, viewport: e.viewport, ...(e.state ? { state: e.state } : {}),
    inputTrees: e.inputTrees, styleInputs: e.styleInputs })));
const read = (root, file) => {
  const boundary = realpathSync(path.resolve(root, 'artifacts/material-parity'));
  const target = realpathSync(path.resolve(root, file)), relative = path.relative(boundary, target);
  if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative))
    throw new Error('tooltip wrapping source escapes Material artifacts');
  return readFileSync(target);
};

export function collectTooltipWrappingInputs(report, { root = process.cwd(), parityPath } = {}) {
  const empty = { binding: { status: 'unbound' }, captures: [], observations: [] };
  if (!parityPath) return empty;
  try {
    const bytes = read(root, parityPath), captures = select(JSON.parse(bytes));
    if (!isDeepStrictEqual(captures, select(report))) throw new Error('tooltip population differs from original capture');
    if (new Set(captures.map(keyOf)).size !== captures.length) throw new Error('duplicate tooltip case identity');
    const observations = [];
    for (const entry of captures) {
      const trees = {};
      for (const side of ['reference', 'astylar']) {
        const source = entry.inputTrees?.[side], bytes = read(root, source.file);
        if (hash(bytes) !== source.sha256) throw new Error('tooltip input tree digest changed');
        trees[side] = JSON.parse(bytes);
      }
      const inputs = entry.styleInputs?.filter(i => i.id === 'tooltip-popup');
      if (inputs?.length > 1) throw new Error('duplicate tooltip scalar owner');
      if (inputs?.length !== 1) continue;
      const proof = inspectTooltipWrappingInput(entry, inputs[0], trees.reference, trees.astylar);
      if (proof) observations.push({ case: keyOf(entry), state: entry.state, element: 'tooltip-popup', input: inputs[0], proof });
    }
    return { binding: { status: 'bound', file: path.relative(root, path.resolve(root, parityPath)).replaceAll('\\', '/'),
      sha256: hash(bytes) }, captures, observations };
  } catch (error) { return { ...empty, binding: { status: 'invalid', error: String(error) } }; }
}

export function classifyTooltipWrappingInput(input, property, reference, candidate, observation, canonicalStyle) {
  if (!observation || !['whiteSpace', 'overflowWrap'].includes(property) ||
      observation.proof.classification !== 'application-plugin-authoring-defect' ||
      observation.proof.source !== 'core-style-inspection' || !Number.isInteger(observation.proof.revision) || observation.proof.revision < 0 ||
      ['inputEquivalent', 'candidateComputedVerified', 'originalVisualSymptomCauseProven', 'finalRasterVerified'].some(k => observation.proof[k] !== false) ||
      !isDeepStrictEqual(input, observation.input) ||
      !observation.proof.properties.some(p => p.property === property) ||
      reference !== (property === 'whiteSpace' ? 'normal' : 'anywhere') || candidate !== (property === 'whiteSpace' ? 'nowrap' : undefined) ||
      canonicalStyle(input.reference)[property] !== reference || canonicalStyle(input.astylar)[property] !== candidate) return;
  return { classification: 'application-plugin-authoring-defect', attribution: tooltipWrappingAttribution,
    owner: 'Material showcase tooltip wrapping authoring through core text/style APIs',
    reviewEvidence: { case: observation.case, element: observation.element,
      referenceNode: observation.proof.identity.referenceNode, candidateNode: observation.proof.identity.candidateNode,
      inputEquivalent: false, candidateComputedVerified: false, originalVisualSymptomCauseProven: false, finalRasterVerified: false },
    justification: (property === 'whiteSpace'
      ? 'The mapped reference tooltip computes normal white-space while the candidate explicitly authors nowrap in all three captured local stages. '
      : 'The mapped reference tooltip has an active overflow-wrap:anywhere request, while the candidate omits both overflowWrap and its public wordWrap alias along the captured owner path. ') +
      'Original scalar, owner and three-stage evidence establish unequal wrapping inputs before layout/projection. This does not attribute the original displacement, blur or clipping to wrapping, infer external ancestry or candidate computed values, waive motion/settlement evidence, or verify rendering equivalence.' };
}

export function validateTooltipWrappingInputs(evidence, { root = process.cwd() } = {}) {
  if (evidence?.binding?.status !== 'bound') return ['tooltip wrapping lacks original source binding'];
  try {
    const bytes = read(root, evidence.binding.file);
    if (hash(bytes) !== evidence.binding.sha256) return ['tooltip wrapping original capture digest changed'];
    const replay = collectTooltipWrappingInputs(JSON.parse(bytes), { root, parityPath: evidence.binding.file });
    if (!isDeepStrictEqual(evidence, replay)) return ['tooltip wrapping evidence differs from complete original-source replay'];
  } catch (error) { return [`tooltip wrapping source replay failed: ${error}`]; }
  return [];
}

export function validateTooltipWrappingClassifications(evidence, discrepancies, canonicalStyle, equivalentValue) {
  const expected = [], actual = [], errors = [];
  const byOwner = new Map((evidence?.observations ?? []).map(o => [JSON.stringify([o.case, o.element]), o]));
  for (const o of evidence?.observations ?? []) {
    const r = canonicalStyle(o.input.reference), a = canonicalStyle(o.input.astylar);
    for (const { property } of o.proof.properties) if (!equivalentValue(property, r[property], a[property], r, a))
      expected.push(JSON.stringify([o.case, o.element, property, r[property], a[property]]));
  }
  for (const row of discrepancies.filter(d => d.attribution === tooltipWrappingAttribution)) {
    const keys = row.reviewedCases ?? [], first = byOwner.get(JSON.stringify([keys[0], row.element]));
    const classified = first && classifyTooltipWrappingInput(first.input, row.property, row.reference, row.astylar, first, canonicalStyle);
    const states = [...new Set(keys.map(key => byOwner.get(JSON.stringify([key, row.element]))?.state))];
    if (!classified || row.family !== 'tooltip' || row.classification !== classified.classification ||
        row.recommendedOwner !== classified.owner || row.justification !== classified.justification ||
        !isDeepStrictEqual(row.reviewEvidence, classified.reviewEvidence) || keys.length !== row.occurrences ||
        new Set(keys).size !== keys.length || !isDeepStrictEqual(row.cases, keys.slice(0, 12)) ||
        !isDeepStrictEqual(row.states, states)) errors.push('tooltip wrapping classification lacks exact source owner/state evidence');
    for (const key of keys) actual.push(JSON.stringify([key, row.element, row.property, row.reference, row.astylar]));
  }
  if (!isDeepStrictEqual(expected.sort(), actual.sort())) errors.push('tooltip wrapping classification coverage differs from original observations');
  return errors;
}
