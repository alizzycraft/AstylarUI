import { readFileSync, realpathSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { inspectRootFlowHeightOverrides } from './root-flow-height-override-evidence.mjs';

export const rootFlowHeightAttribution = 'reviewed-root-flow-height-overrides';
const families = ['button', 'toolbar', 'paginator'];
const hash = b => createHash('sha256').update(b).digest('hex');
const keyOf = e => `${e.kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`;
const select = report => [['static', report.results ?? []], ['interaction', report.interactions ?? []]]
  .flatMap(([kind, rows]) => rows.filter(e => families.includes(e.family)).map(e => ({ kind, family: e.family,
    profile: e.profile, viewport: e.viewport, ...(e.state ? { state: e.state } : {}), inputTrees: e.inputTrees,
    styleInputs: (e.styleInputs ?? []).filter(i => i.id === e.family + '-root') })));
const read = (root, file) => {
  const boundary = realpathSync(path.resolve(root, 'artifacts/material-parity'));
  const target = realpathSync(path.resolve(root, file)), relative = path.relative(boundary, target);
  if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative))
    throw new Error('root flow height source escapes Material artifacts');
  return readFileSync(target);
};

export function collectRootFlowHeightInputs(report, { root = process.cwd(), parityPath } = {}) {
  const empty = { binding: { status: 'unbound' }, captures: [], observations: [] };
  if (!parityPath) return empty;
  try {
    const bytes = read(root, parityPath), captures = select(JSON.parse(bytes));
    if (!isDeepStrictEqual(captures, select(report))) throw new Error('root flow height population differs from original capture');
    if (new Set(captures.map(keyOf)).size !== captures.length) throw new Error('duplicate root flow height case');
    const observations = captures.flatMap(entry => {
      const trees = {};
      for (const side of ['reference', 'astylar']) {
        const d = entry.inputTrees?.[side], bytes = read(root, d.file);
        if (hash(bytes) !== d.sha256) throw new Error('root flow height input tree digest changed');
        trees[side] = JSON.parse(bytes);
      }
      // Preserve diagnostic cases selecting other scalar owners as negatives.
      if (entry.styleInputs.length === 0) return [];
      const proof = inspectRootFlowHeightOverrides(entry, trees.reference, trees.astylar);
      return [{ case: keyOf(entry), family: entry.family, state: entry.state ?? 'static',
        element: proof.element, input: entry.styleInputs[0], proof }];
    });
    return { binding: { status: 'bound', file: path.relative(root, path.resolve(root, parityPath)).replaceAll('\\', '/'),
      sha256: hash(bytes) }, captures, observations };
  } catch (error) { return { ...empty, binding: { status: 'invalid', error: String(error) } }; }
}

export function classifyRootFlowHeightInput(input, property, reference, candidate, observation, canonicalStyle) {
  const p = observation?.proof, value = p?.properties?.find(v => v.property === property);
  if (!p || !value || p.heightOverrides?.length !== 1 ||
      p.classification !== 'application-plugin-authoring-defect' || p.source !== 'core-style-inspection' ||
      !Number.isInteger(p.revision) || p.revision < 0 ||
      ['inputEquivalent', 'heightBehaviorVerified', 'originalRasterCauseProven', 'renderingEquivalent'].some(k => p[k] !== false) ||
      !families.includes(observation.family) || observation.element !== observation.family + '-root' ||
      input.id !== observation.element || p.element !== observation.element ||
      !isDeepStrictEqual(input, observation.input) || reference !== value.reference || candidate !== value.candidate ||
      canonicalStyle(input.reference)[property] !== reference || canonicalStyle(input.astylar)[property] !== candidate) return;
  return { classification: 'application-plugin-authoring-defect', attribution: rootFlowHeightAttribution,
    owner: 'showcase demo-section block-flow translation',
    reviewEvidence: { case: observation.case, element: observation.element,
      referenceNode: p.referenceNode, candidateNode: p.candidateNode,
      referenceFlow: p.referenceFlow, candidateFlow: p.candidateFlow, heightOverrides: p.heightOverrides,
      inputEquivalent: false, heightBehaviorVerified: false, originalRasterCauseProven: false, renderingEquivalent: false },
    justification: 'The mapped reference section retains block flow with no direction/gap request, while the candidate explicitly requests column flex and 16px gap. The repeated root selector adds only a responsive height declaration; full-tree/scalar rule joins retain that declaration and exclude any competing formatting request. All three candidate local stages preserve the unequal formatting inputs. This extends the traced initial-showcase block-to-flex authoring cause, not a core layout diagnosis, height validation, or rendering-equivalence claim. Previously classified single-root cases and every other property remain independent.' };
}

export function validateRootFlowHeightInputs(evidence, { root = process.cwd() } = {}) {
  if (evidence?.binding?.status !== 'bound') return ['root flow height lacks original source binding'];
  try {
    const bytes = read(root, evidence.binding.file);
    if (hash(bytes) !== evidence.binding.sha256) return ['root flow height original capture digest changed'];
    const replay = collectRootFlowHeightInputs(JSON.parse(bytes), { root, parityPath: evidence.binding.file });
    if (!isDeepStrictEqual(evidence, replay)) return ['root flow height evidence differs from complete original-source replay'];
  } catch (error) { return [`root flow height source replay failed: ${error}`]; }
  return [];
}

export function validateRootFlowHeightClassifications(evidence, discrepancies, canonicalStyle, equivalentValue) {
  const expected = [], actual = [], errors = [];
  const byOwner = new Map((evidence?.observations ?? []).map(o => [JSON.stringify([o.case, o.element]), o]));
  for (const o of evidence?.observations ?? []) {
    if (o.proof.heightOverrides.length !== 1) continue;
    const r = canonicalStyle(o.input.reference), a = canonicalStyle(o.input.astylar);
    for (const { property } of o.proof.properties) if (!equivalentValue(property, r[property], a[property], r, a))
      expected.push(JSON.stringify([o.case, o.element, property, r[property], a[property]]));
  }
  for (const row of discrepancies.filter(d => d.attribution === rootFlowHeightAttribution)) {
    const keys = row.reviewedCases ?? [], first = byOwner.get(JSON.stringify([keys[0], row.element]));
    const classified = first && classifyRootFlowHeightInput(first.input, row.property, row.reference, row.astylar, first, canonicalStyle);
    const states = [...new Set(keys.map(key => byOwner.get(JSON.stringify([key, row.element]))?.state))];
    if (!classified || row.family !== first.family || row.classification !== classified.classification ||
        row.recommendedOwner !== classified.owner || row.justification !== classified.justification ||
        !isDeepStrictEqual(row.reviewEvidence, classified.reviewEvidence) || keys.length !== row.occurrences ||
        new Set(keys).size !== keys.length || !isDeepStrictEqual(row.cases, keys.slice(0, 12)) ||
        !isDeepStrictEqual(row.states, states)) errors.push('root flow height classification lacks exact source owner/state evidence');
    for (const key of keys) actual.push(JSON.stringify([key, row.element, row.property, row.reference, row.astylar]));
  }
  if (!isDeepStrictEqual(expected.sort(), actual.sort())) errors.push('root flow height classification coverage differs from original observations');
  return errors;
}
