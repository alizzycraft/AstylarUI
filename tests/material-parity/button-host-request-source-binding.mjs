import { readFileSync, realpathSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { inspectButtonHostRequests, buttonHostRequests } from './button-host-request-evidence.mjs';
import { selectedButtonInputs } from './button-pill-radius-evidence.mjs';

export const buttonHostRequestAttribution = 'reviewed-button-host-requests';
const hash = b => createHash('sha256').update(b).digest('hex');
const keyOf = e => `${e.kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`;
const flags = ['inputEquivalent', 'candidateUsedLayoutVerified', 'originalRasterCauseProven', 'structuralEquivalenceVerified', 'renderingEquivalent'];
const select = report => [['static', report.results ?? []], ['interaction', report.interactions ?? []]]
  .flatMap(([kind, rows]) => rows.map(e => ({ kind, family: e.family, profile: e.profile,
    viewport: e.viewport, ...(e.state ? { state: e.state } : {}), inputTrees: e.inputTrees,
    styleInputs: selectedButtonInputs(e) })));
const read = (root, file) => {
  const boundary = realpathSync(path.resolve(root, 'artifacts/material-parity'));
  const target = realpathSync(path.resolve(root, file)), relative = path.relative(boundary, target);
  if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative))
    throw new Error('button host request source escapes Material artifacts');
  return readFileSync(target);
};

export function collectButtonHostRequestInputs(report, { root = process.cwd(), parityPath } = {}) {
  const empty = { binding: { status: 'unbound' }, captures: [], observations: [] };
  if (!parityPath) return empty;
  try {
    const bytes = read(root, parityPath), captures = select(JSON.parse(bytes));
    if (!isDeepStrictEqual(captures, select(report))) throw new Error('button host request population differs from original capture');
    if (!captures.length || new Set(captures.map(keyOf)).size !== captures.length)
      throw new Error('empty or duplicate button host request case population');
    const observations = captures.flatMap(entry => {
      const trees = {};
      for (const side of ['reference', 'astylar']) {
        const d = entry.inputTrees?.[side], bytes = read(root, d.file);
        if (hash(bytes) !== d.sha256) throw new Error('button host request input tree digest changed');
        trees[side] = JSON.parse(bytes);
      }
      // Diagnostic reports may retain cases but select other scalar owners.
      // Original-source equality above still rejects caller population loss.
      return entry.styleInputs.map(input => ({ case: keyOf(entry), family: entry.family,
        state: entry.state ?? 'static', element: input.id, input,
        proof: inspectButtonHostRequests(input, trees.reference, trees.astylar) }));
    });
    return { binding: { status: 'bound', file: path.relative(root, path.resolve(root, parityPath)).replaceAll('\\', '/'),
      sha256: hash(bytes) }, captures, observations };
  } catch (error) { return { ...empty, binding: { status: 'invalid', error: String(error) } }; }
}

export function classifyButtonHostRequestInput(input, property, reference, candidate, observation, canonicalStyle) {
  const p = observation?.proof, value = p?.properties?.find(v => v.property === property);
  const coreAbsolute = input.id === 'core-primary' && property === 'position';
  const expected = coreAbsolute ? 'absolute' : undefined;
  if (!p || !value || !Object.hasOwn(buttonHostRequests, property) ||
      p.classification !== 'application-plugin-authoring-defect' || p.source !== 'core-style-inspection' ||
      !Number.isInteger(p.revision) || p.revision < 0 || flags.some(k => p[k] !== false) ||
      p.element !== observation.element || input.id !== observation.element || !isDeepStrictEqual(input, observation.input) ||
      value.reference !== buttonHostRequests[property] || value.candidateLocal !== (expected ?? null) ||
      value.candidateOwnStageAbsent !== !coreAbsolute ||
      Object.hasOwn(input.astylar, property) !== coreAbsolute ||
      !p.referenceRules?.some(r => r.selector === '.mdc-button') ||
      p.referenceLabel?.type !== 'span' || p.referenceLabel?.ownText !== p.candidateValue ||
      reference !== value.reference || candidate !== expected ||
      canonicalStyle(input.reference)[property] !== reference || canonicalStyle(input.astylar)[property] !== candidate) return;
  return { classification: 'application-plugin-authoring-defect', attribution: buttonHostRequestAttribution,
    owner: 'Material showcase shared button and core demo authoring',
    reviewEvidence: { case: observation.case, element: observation.element,
      referenceNode: p.referenceNode, candidateNode: p.candidateNode,
      referenceRules: p.referenceRules, candidateRules: p.candidateRules,
      referenceLabel: p.referenceLabel, candidateValue: p.candidateValue,
      propertyEvidence: value,
      inputEquivalent: false, candidateUsedLayoutVerified: false, originalRasterCauseProven: false,
      structuralEquivalenceVerified: false, renderingEquivalent: false },
    justification: 'The original Material button explicitly requests relative positioning, min-width:64px and vertical-align:middle. Candidate core-primary requests absolute positioning; all other reviewed own-stage host values are absent. Complete source/scalar/stage joins preserve absence, not synthetic computed defaults. Native-value versus label-span composition, used layout, containing blocks and raster remain unproven. Both candidate source rules are unchanged from the initial showcase; this is unequal authoring, not proof of later compensating edits, a core defect or rendering equivalence.' };
}

export function validateButtonHostRequestInputs(evidence, { root = process.cwd() } = {}) {
  if (evidence?.binding?.status !== 'bound') return ['button host request lacks original source binding'];
  try {
    const bytes = read(root, evidence.binding.file);
    if (hash(bytes) !== evidence.binding.sha256) return ['button host request original capture digest changed'];
    const replay = collectButtonHostRequestInputs(JSON.parse(bytes), { root, parityPath: evidence.binding.file });
    if (!isDeepStrictEqual(evidence, replay)) return ['button host request evidence differs from complete original-source replay'];
  } catch (error) { return [`button host request source replay failed: ${error}`]; }
  return [];
}

export function validateButtonHostRequestClassifications(evidence, discrepancies, canonicalStyle, equivalentValue) {
  const expected = [], actual = [], errors = [];
  const byOwner = new Map((evidence?.observations ?? []).map(o => [JSON.stringify([o.case, o.element]), o]));
  for (const o of evidence?.observations ?? []) {
    const r = canonicalStyle(o.input.reference), a = canonicalStyle(o.input.astylar);
    for (const property of Object.keys(buttonHostRequests)) if (!equivalentValue(property, r[property], a[property], r, a))
      expected.push(JSON.stringify([o.case, o.element, property, r[property], a[property]]));
  }
  for (const row of discrepancies.filter(d => d.attribution === buttonHostRequestAttribution)) {
    const keys = row.reviewedCases ?? [], first = byOwner.get(JSON.stringify([keys[0], row.element]));
    const classified = first && classifyButtonHostRequestInput(first.input, row.property, row.reference, row.astylar, first, canonicalStyle);
    const states = [...new Set(keys.map(key => byOwner.get(JSON.stringify([key, row.element]))?.state))];
    if (!classified || row.family !== first.family || row.classification !== classified.classification ||
        row.recommendedOwner !== classified.owner || row.justification !== classified.justification ||
        !isDeepStrictEqual(row.reviewEvidence, classified.reviewEvidence) || keys.length !== row.occurrences ||
        new Set(keys).size !== keys.length || !isDeepStrictEqual(row.cases, keys.slice(0, 12)) ||
        !isDeepStrictEqual(row.states, states)) errors.push('button host request classification lacks exact source owner/state evidence');
    for (const key of keys) actual.push(JSON.stringify([key, row.element, row.property, row.reference, row.astylar]));
  }
  if (!isDeepStrictEqual(expected.sort(), actual.sort())) errors.push('button host request classification coverage differs from original observations');
  return errors;
}
