import { readFileSync, realpathSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { inspectRootShadowInput } from './root-shadow-input-evidence.mjs';

export const rootShadowAttribution = 'reviewed-root-shadow-inputs';
const hash = b => createHash('sha256').update(b).digest('hex');
const keyOf = e => `${e.kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`;
// Keep every original case. Only the target scalar is selected; the two full
// original trees still supply all ancestry, rules and owner-stage evidence.
const select = report => [['static', report.results ?? []], ['interaction', report.interactions ?? []]]
  .flatMap(([kind, rows]) => rows.map(e => ({ kind, family: e.family, profile: e.profile,
    viewport: e.viewport, ...(e.state ? { state: e.state } : {}), inputTrees: e.inputTrees,
    styleInputs: (e.styleInputs ?? []).filter(i => i.id === `${e.family}-root`) })));
const read = (root, file) => {
  const boundary = realpathSync(path.resolve(root, 'artifacts/material-parity'));
  const target = realpathSync(path.resolve(root, file)), relative = path.relative(boundary, target);
  if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative))
    throw new Error('root shadow source escapes Material artifacts');
  return readFileSync(target);
};

export function collectRootShadowInputs(report, { root = process.cwd(), parityPath } = {}) {
  const empty = { binding: { status: 'unbound' }, captures: [], observations: [] };
  if (!parityPath) return empty;
  try {
    const bytes = read(root, parityPath), captures = select(JSON.parse(bytes));
    if (!isDeepStrictEqual(captures, select(report))) throw new Error('root shadow population differs from original capture');
    if (!captures.length || new Set(captures.map(keyOf)).size !== captures.length)
      throw new Error('empty or duplicate root shadow case population');
    const observations = captures.flatMap(entry => {
      const trees = {};
      for (const side of ['reference', 'astylar']) {
        const descriptor = entry.inputTrees?.[side], bytes = read(root, descriptor.file);
        if (hash(bytes) !== descriptor.sha256) throw new Error('root shadow input tree digest changed');
        trees[side] = JSON.parse(bytes);
      }
      // Separate diagnostic reports may deliberately select different scalar
      // owners. Preserve those negative cases; never invent a missing scalar.
      if (entry.styleInputs.length === 0) return [];
      const proof = inspectRootShadowInput(entry, trees.reference, trees.astylar);
      return [{ case: keyOf(entry), family: entry.family, state: entry.state ?? 'static',
        element: proof.element, input: entry.styleInputs[0], proof }];
    });
    return { binding: { status: 'bound', file: path.relative(root, path.resolve(root, parityPath)).replaceAll('\\', '/'),
      sha256: hash(bytes) }, captures, observations };
  } catch (error) { return { ...empty, binding: { status: 'invalid', error: String(error) } }; }
}

export function classifyRootShadowInput(input, property, reference, candidate, observation, canonicalStyle) {
  const p = observation?.proof;
  if (!p || property !== 'boxShadow' || p.property !== property ||
      p.classification !== 'application-plugin-authoring-defect' || p.source !== 'core-style-inspection' ||
      !Number.isInteger(p.revision) || p.revision < 0 ||
      ['inputEquivalent', 'originalRasterCauseProven', 'candidateUsedPaintVerified', 'renderingEquivalent'].some(k => p[k] !== false) ||
      observation.element !== `${observation.family}-root` || p.element !== observation.element || input.id !== observation.element ||
      !isDeepStrictEqual(input, observation.input) ||
      input.reference.boxShadow !== p.reference || input.astylar.boxShadow !== p.candidate ||
      canonicalStyle(input.reference)[property] !== reference || canonicalStyle(input.astylar)[property] !== candidate) return;
  return { classification: 'application-plugin-authoring-defect', attribution: rootShadowAttribution,
    owner: 'Material showcase shared container authoring',
    reviewEvidence: { case: observation.case, element: observation.element,
      referenceNode: p.referenceNode, candidateNode: p.candidateNode,
      inputEquivalent: false, originalRasterCauseProven: false, candidateUsedPaintVerified: false, renderingEquivalent: false },
    justification: 'The mapped reference root requests a shadow whose #0002 alpha is 34/255 (computed as 0.133), while the candidate explicitly authors alpha 0.14 in all three local style stages. Original source/tree/scalar joins establish unequal color inputs before layout or projection, not merely different shadow token ordering or zero-spread serialization. Both requests originate in initial showcase authoring, not a demonstrated later compensation. This does not establish candidate used paint, shadow raster, clipping or whole-render equivalence.' };
}

export function validateRootShadowInputs(evidence, { root = process.cwd() } = {}) {
  if (evidence?.binding?.status !== 'bound') return ['root shadow lacks original source binding'];
  try {
    const bytes = read(root, evidence.binding.file);
    if (hash(bytes) !== evidence.binding.sha256) return ['root shadow original capture digest changed'];
    const replay = collectRootShadowInputs(JSON.parse(bytes), { root, parityPath: evidence.binding.file });
    if (!isDeepStrictEqual(evidence, replay)) return ['root shadow evidence differs from complete original-source replay'];
  } catch (error) { return [`root shadow source replay failed: ${error}`]; }
  return [];
}

export function validateRootShadowClassifications(evidence, discrepancies, canonicalStyle, equivalentValue) {
  const expected = [], actual = [], errors = [];
  const byOwner = new Map((evidence?.observations ?? []).map(o => [JSON.stringify([o.case, o.element]), o]));
  for (const o of evidence?.observations ?? []) {
    const r = canonicalStyle(o.input.reference), a = canonicalStyle(o.input.astylar);
    if (!equivalentValue('boxShadow', r.boxShadow, a.boxShadow, r, a))
      expected.push(JSON.stringify([o.case, o.element, 'boxShadow', r.boxShadow, a.boxShadow]));
  }
  for (const row of discrepancies.filter(d => d.attribution === rootShadowAttribution)) {
    const keys = row.reviewedCases ?? [], first = byOwner.get(JSON.stringify([keys[0], row.element]));
    const classified = first && classifyRootShadowInput(first.input, row.property, row.reference, row.astylar, first, canonicalStyle);
    const states = [...new Set(keys.map(key => byOwner.get(JSON.stringify([key, row.element]))?.state))];
    if (!classified || row.family !== first.family || row.classification !== classified.classification ||
        row.recommendedOwner !== classified.owner || row.justification !== classified.justification ||
        !isDeepStrictEqual(row.reviewEvidence, classified.reviewEvidence) || keys.length !== row.occurrences ||
        new Set(keys).size !== keys.length || !isDeepStrictEqual(row.cases, keys.slice(0, 12)) ||
        !isDeepStrictEqual(row.states, states)) errors.push('root shadow classification lacks exact source owner/state evidence');
    for (const key of keys) actual.push(JSON.stringify([key, row.element, row.property, row.reference, row.astylar]));
  }
  if (!isDeepStrictEqual(expected.sort(), actual.sort())) errors.push('root shadow classification coverage differs from original observations');
  return errors;
}
