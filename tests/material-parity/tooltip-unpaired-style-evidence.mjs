import { readFileSync, realpathSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';

export const tooltipUnpairedStyleAttribution = 'reviewed-tooltip-unpaired-style-owner';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const readSource = (root, file) => {
  const absolute = path.resolve(root, file), boundary = realpathSync(path.resolve(root, 'artifacts/material-parity'));
  const relative = path.relative(boundary, realpathSync(absolute));
  if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative))
    throw new Error('unpaired tooltip source escapes Material artifacts');
  return readFileSync(absolute);
};
const keyOf = e => `${e.kind}:${e.family}@${e.profile}/${e.viewport?.id}${e.state ? '/' + e.state : ''}`;
const select = report => [['static', report.results ?? []], ['interaction', report.interactions ?? []]]
  .flatMap(([kind, rows]) => rows.map(e => ({ kind, family: e.family, profile: e.profile,
    viewport: e.viewport, ...(e.state ? { state: e.state } : {}), inputTrees: e.inputTrees,
    styleInputs: (e.styleInputs ?? []).filter(i => i.reference === undefined && i.astylar !== undefined) })))
  .filter(e => e.styleInputs.length);

// Bind the entire candidate-only population, not a caller-selected list of
// apparently convenient tooltip cases. Other families remain unclassified.
export function collectTooltipUnpairedStyles(report, { root = process.cwd(), parityPath,
  collectInventory, reviewGap } = {}) {
  const empty = { binding: { status: 'unbound' }, captures: [], observations: [] };
  if (!parityPath) return empty;
  try {
    const read = file => readSource(root, file);
    const bytes = read(parityPath), captures = select(JSON.parse(bytes));
    if (!isDeepStrictEqual(captures, select(report))) throw new Error('candidate-only scalar population differs from original capture');
    const observations = [];
    for (const entry of captures) {
      const key = keyOf(entry);
      if (entry.kind !== 'interaction' || entry.family !== 'tooltip' || entry.state !== 'open') continue;
      // File digests are checked before the inventory reader. Inline or absent
      // trees cannot establish an independently captured missing counterpart.
      for (const side of ['reference', 'astylar']) {
        const source = entry.inputTrees?.[side];
        if (!source?.file || hash(read(source.file)) !== source.sha256) throw new Error(`unbound tooltip tree: ${key}/${side}`);
      }
      const inventory = collectInventory([entry], { root }), gap = reviewGap(key, inventory);
      if (!gap || gap.referenceNodes.length || gap.astylarNodes.length !== 1 ||
          gap.inputEquivalent !== false || gap.finalRasterVerified !== false) continue;
      const popup = gap.reviewEvidence.candidateContext.find(n => n.key === gap.astylarNodes[0]);
      const inputs = entry.styleInputs.filter(i => i.id === 'tooltip-popup');
      if (inputs.length !== 1 || !popup) continue;
      const input = inputs[0];
      if (input.referenceStructure !== undefined || input.referenceAuthored?.length !== 0 ||
          input.astylarResolvedStyleEvidenceVersion !== 2 || input.astylarStructure?.schemaVersion !== 2 ||
          input.astylarStructure.type !== popup.authored.type || input.astylarStructure.ownText !== popup.authored.textContent ||
          input.astylarStructure.directChildIds?.length !== 0 || input.astylarStructure.descendantIds?.length !== 0 ||
          !isDeepStrictEqual(input.astylar, popup.style) ||
          !isDeepStrictEqual(input.astylarNormalResolvedStyle, popup.normalStyle) ||
          !isDeepStrictEqual(input.astylarInteractionResolvedStyle, popup.interactionStyle)) continue;
      observations.push({ case: key, element: input.id, input: structuredClone(input), gap,
        inputEquivalent: false, finalRasterVerified: false });
    }
    return { binding: { status: 'bound', file: path.relative(root, path.resolve(root, parityPath)).replaceAll('\\', '/'),
      sha256: hash(bytes), candidateOnlyInputs: captures.reduce((n, c) => n + c.styleInputs.length, 0) }, captures, observations };
  } catch (error) { return { ...empty, binding: { status: 'invalid', error: String(error) } }; }
}

export function classifyTooltipUnpairedStyle(input, property, reference, astylar, proof, canonicalStyle) {
  if (!proof || reference !== undefined || astylar === undefined || !isDeepStrictEqual(input, proof.input) ||
      canonicalStyle(proof.input.astylar)[property] !== astylar) return;
  return { classification: 'application-plugin-authoring-defect', attribution: tooltipUnpairedStyleAttribution,
    owner: 'showcase tooltip state authoring and benchmark adapter neutrality',
    reviewEvidence: { case: proof.case, element: proof.element, referenceOwner: 'absent',
      candidateNode: proof.gap.astylarNodes[0], inputEquivalent: false, finalRasterVerified: false },
    justification: 'The original paired capture contains the trigger and empty reference overlay container, but only the candidate authors this trigger-linked tooltip popup. Its scalar effective, normal and interaction styles match that unique full-tree owner. These values have no reference counterpart in this state; they are consequences of unequal popup presence, not independent renderer failures or equivalent defaults. The separately captured pointer-state proof identifies benchmark forced-open click and missing ordinary dismissal. This attribution does not invent absent-side styles or accept typography, positioning, clipping, accessibility, visibility or raster.' };
}

export function validateTooltipUnpairedStyles(evidence, { root = process.cwd(), collectInventory, reviewGap } = {}) {
  if (evidence?.binding?.status !== 'bound') return ['unpaired tooltip styles lack original capture binding'];
  try {
    const bytes = readSource(root, evidence.binding.file);
    if (hash(bytes) !== evidence.binding.sha256) return ['unpaired tooltip original capture digest changed'];
    const replay = collectTooltipUnpairedStyles(JSON.parse(bytes), { root, parityPath: evidence.binding.file, collectInventory, reviewGap });
    if (!isDeepStrictEqual(evidence, replay)) return ['unpaired tooltip styles do not replay from the complete original scalar/tree population'];
  } catch (error) { return [`unpaired tooltip source replay failed: ${error}`]; }
  return [];
}

export function validateTooltipUnpairedStyleClassifications(evidence, discrepancies, canonicalStyle, equivalentValue) {
  const expected = [], actual = [], errors = [];
  for (const proof of evidence?.observations ?? []) {
    const styles = canonicalStyle(proof.input.astylar);
    for (const property of Object.keys(styles)) {
      if (!equivalentValue(property, undefined, styles[property], {}, styles))
        expected.push(JSON.stringify([proof.case, proof.element, property, styles[property]]));
    }
  }
  for (const row of discrepancies.filter(d => d.attribution === tooltipUnpairedStyleAttribution)) {
    const keys = row.reviewedCases ?? [], proof = evidence?.observations?.find(p => p.case === keys[0] && p.element === row.element);
    const classification = proof && classifyTooltipUnpairedStyle(proof.input, row.property, row.reference, row.astylar, proof, canonicalStyle);
    if (!classification || row.family !== 'tooltip' || row.classification !== classification.classification ||
        row.recommendedOwner !== classification.owner || row.justification !== classification.justification ||
        !isDeepStrictEqual(row.reviewEvidence, classification.reviewEvidence) || keys.length !== row.occurrences ||
        new Set(keys).size !== keys.length || !isDeepStrictEqual(row.cases, keys.slice(0, 12)) ||
        !isDeepStrictEqual(row.states, ['open'])) errors.push('unpaired tooltip scalar classification lacks exact owner/state evidence');
    for (const key of keys) actual.push(JSON.stringify([key, row.element, row.property, row.astylar]));
  }
  if (!isDeepStrictEqual(expected.sort(), actual.sort())) errors.push('unpaired tooltip scalar coverage differs from original observations');
  return errors;
}
