import { readFileSync, realpathSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { inspectButtonPillRadius, selectedButtonInputs, buttonRadiusProperties } from './button-pill-radius-evidence.mjs';

export const buttonPillRadiusAttribution = 'reviewed-button-pill-radius-inputs';
const hash = b => createHash('sha256').update(b).digest('hex');
const keyOf = e => `${e.kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`;
const flags = ['authoredIntentEquivalent', 'candidateUsedPaintVerified', 'originalRasterCauseProven', 'renderingEquivalent'];
const select = report => [['static', report.results ?? []], ['interaction', report.interactions ?? []]]
  .flatMap(([kind, rows]) => rows.map(e => ({ kind, family: e.family, profile: e.profile,
    viewport: e.viewport, ...(e.state ? { state: e.state } : {}), inputTrees: e.inputTrees,
    styleInputs: selectedButtonInputs(e) })));
const read = (root, file) => {
  const boundary = realpathSync(path.resolve(root, 'artifacts/material-parity'));
  const target = realpathSync(path.resolve(root, file)), relative = path.relative(boundary, target);
  if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative))
    throw new Error('button pill radius source escapes Material artifacts');
  return readFileSync(target);
};

export function collectButtonPillRadiusInputs(report, { root = process.cwd(), parityPath } = {}) {
  const empty = { binding: { status: 'unbound' }, captures: [], observations: [] };
  if (!parityPath) return empty;
  try {
    const bytes = read(root, parityPath), captures = select(JSON.parse(bytes));
    if (!isDeepStrictEqual(captures, select(report))) throw new Error('button pill radius population differs from original capture');
    if (!captures.length || new Set(captures.map(keyOf)).size !== captures.length)
      throw new Error('empty or duplicate button pill radius case population');
    const observations = captures.flatMap(entry => {
      const trees = {};
      for (const side of ['reference', 'astylar']) {
        const d = entry.inputTrees?.[side], bytes = read(root, d.file);
        if (hash(bytes) !== d.sha256) throw new Error('button pill radius input tree digest changed');
        trees[side] = JSON.parse(bytes);
      }
      // Retain negative cases and diagnostic reports selecting other owners.
      // The caller still has to match the independently reopened source exactly.
      return entry.styleInputs.map(input => ({ case: keyOf(entry), family: entry.family,
        state: entry.state ?? 'static', element: input.id, input,
        proof: inspectButtonPillRadius(entry, input, trees.reference, trees.astylar) }));
    });
    return { binding: { status: 'bound', file: path.relative(root, path.resolve(root, parityPath)).replaceAll('\\', '/'),
      sha256: hash(bytes) }, captures, observations };
  } catch (error) { return { ...empty, binding: { status: 'invalid', error: String(error) } }; }
}

export function classifyButtonPillRadiusInput(input, property, reference, candidate, observation, canonicalStyle) {
  const p = observation?.proof, value = p?.properties?.find(v => v.property === property);
  if (!p || !value || !buttonRadiusProperties.includes(property) ||
      p.classification !== 'application-plugin-authoring-defect' || p.source !== 'core-style-inspection' ||
      !Number.isInteger(p.revision) || p.revision < 0 || flags.some(k => p[k] !== false) ||
      p.currentBrowserShapeMayCoincide !== true || p.element !== observation.element || input.id !== observation.element ||
      !isDeepStrictEqual(input, observation.input) || value.reference !== '9999px' ||
      !['15px', '20px', '30px'].includes(value.candidate) ||
      input.reference[property] !== value.reference || input.astylar.borderRadius !== value.candidate ||
      p.candidateRule?.selector !== '.material-button' || p.candidateRule?.borderRadius !== value.candidate ||
      canonicalStyle(input.reference)[property] !== reference || canonicalStyle(input.astylar)[property] !== candidate) return;
  return { classification: 'application-plugin-authoring-defect', attribution: buttonPillRadiusAttribution,
    owner: 'Material showcase shared button authoring',
    reviewEvidence: { case: observation.case, element: observation.element,
      referenceNode: p.referenceNode, candidateNode: p.candidateNode,
      referenceRule: p.referenceRule, candidateRule: p.candidateRule,
      authoredIntentEquivalent: false, currentBrowserShapeMayCoincide: true,
      candidateUsedPaintVerified: false, originalRasterCauseProven: false, renderingEquivalent: false },
    justification: 'The original Material var()-containing border-radius shorthand retains full-pill intent and computes to 9999px on every corner. The candidate explicitly replaces it with a fixed 20px, 15px or 30px theme-scaled radius, retained through all three local style stages. Browser-only controls show equal pixels at the captured constrained heights but divergent pixels when height grows; that conditional coincidence does not establish equivalent authoring. The base candidate rule already appears in the initial showcase, not a demonstrated later compensating edit. This finding does not establish a renderer defect, original candidate used paint, clipping, hit testing or whole-render equivalence.' };
}

export function validateButtonPillRadiusInputs(evidence, { root = process.cwd() } = {}) {
  if (evidence?.binding?.status !== 'bound') return ['button pill radius lacks original source binding'];
  try {
    const bytes = read(root, evidence.binding.file);
    if (hash(bytes) !== evidence.binding.sha256) return ['button pill radius original capture digest changed'];
    const replay = collectButtonPillRadiusInputs(JSON.parse(bytes), { root, parityPath: evidence.binding.file });
    if (!isDeepStrictEqual(evidence, replay)) return ['button pill radius evidence differs from complete original-source replay'];
  } catch (error) { return [`button pill radius source replay failed: ${error}`]; }
  return [];
}

export function validateButtonPillRadiusClassifications(evidence, discrepancies, canonicalStyle, equivalentValue) {
  const expected = [], actual = [], errors = [];
  const byOwner = new Map((evidence?.observations ?? []).map(o => [JSON.stringify([o.case, o.element]), o]));
  for (const o of evidence?.observations ?? []) {
    const r = canonicalStyle(o.input.reference), a = canonicalStyle(o.input.astylar);
    for (const property of buttonRadiusProperties) if (!equivalentValue(property, r[property], a[property], r, a))
      expected.push(JSON.stringify([o.case, o.element, property, r[property], a[property]]));
  }
  for (const row of discrepancies.filter(d => d.attribution === buttonPillRadiusAttribution)) {
    const keys = row.reviewedCases ?? [], first = byOwner.get(JSON.stringify([keys[0], row.element]));
    const classified = first && classifyButtonPillRadiusInput(first.input, row.property, row.reference, row.astylar, first, canonicalStyle);
    const states = [...new Set(keys.map(key => byOwner.get(JSON.stringify([key, row.element]))?.state))];
    if (!classified || row.family !== first.family || row.classification !== classified.classification ||
        row.recommendedOwner !== classified.owner || row.justification !== classified.justification ||
        !isDeepStrictEqual(row.reviewEvidence, classified.reviewEvidence) || keys.length !== row.occurrences ||
        new Set(keys).size !== keys.length || !isDeepStrictEqual(row.cases, keys.slice(0, 12)) ||
        !isDeepStrictEqual(row.states, states)) errors.push('button pill radius classification lacks exact source owner/state evidence');
    for (const key of keys) actual.push(JSON.stringify([key, row.element, row.property, row.reference, row.astylar]));
  }
  if (!isDeepStrictEqual(expected.sort(), actual.sort())) errors.push('button pill radius classification coverage differs from original observations');
  return errors;
}
