import { readFileSync, realpathSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { buttonFixedWidths } from './button-fixed-width-evidence.mjs';
import { selectedButtonInputs } from './button-pill-radius-evidence.mjs';

export const buttonFixedWidthAttribution = 'reviewed-button-fixed-width-authoring';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const owner = 'Material showcase shared and ID-specific button width authoring';
const flags = ['inputEquivalent', 'candidateUsedLayoutVerified', 'originalRasterCauseProven',
  'structuralEquivalenceVerified', 'renderingEquivalent'];
const ownerKey = (key, element) => JSON.stringify([key, element]);

export function classifyButtonFixedWidthInput(input, property, reference, candidate, observation, canonicalStyle) {
  const p = observation?.proof;
  if (property !== 'width' || !p || !Object.hasOwn(buttonFixedWidths, input.id) ||
      p.element !== input.id || observation.element !== input.id ||
      observation.inputSha256 !== hash(JSON.stringify(input)) ||
      p.source !== 'core-style-inspection' || !Number.isInteger(p.revision) || p.revision < 0 ||
      p.classification !== 'application-plugin-authoring-defect' || p.owner !== owner ||
      flags.some(flag => p[flag] !== false) || p.referenceAuthoredWidth !== '<omitted>' ||
      p.referenceComputedWidth !== input.reference.width ||
      p.candidateAuthoredWidth !== buttonFixedWidths[input.id] || p.candidateLocalWidth !== input.astylar.width ||
      p.candidateLocalWidth !== p.candidateAuthoredWidth ||
      p.referenceLabel?.type !== 'span' || p.referenceLabel.ownText !== p.candidateValue ||
      !p.candidateRules?.some(r => r.selector === '.material-button' && r.width === '141px') ||
      canonicalStyle(input.reference).width !== reference || canonicalStyle(input.astylar).width !== candidate) return;
  return { classification: 'application-plugin-authoring-defect', attribution: buttonFixedWidthAttribution,
    owner, reviewEvidence: { case: observation.case, element: observation.element,
      inputSha256: observation.inputSha256, referenceNode: p.referenceNode, candidateNode: p.candidateNode,
      referenceLabel: p.referenceLabel, candidateValue: p.candidateValue, candidateRules: p.candidateRules,
      referenceAuthoredWidth: p.referenceAuthoredWidth, referenceComputedWidth: p.referenceComputedWidth,
      candidateAuthoredWidth: p.candidateAuthoredWidth, candidateLocalWidth: p.candidateLocalWidth,
      inputEquivalent: false, candidateUsedLayoutVerified: false, originalRasterCauseProven: false,
      structuralEquivalenceVerified: false, renderingEquivalent: false },
    justification: 'Original reference button rules omit width; candidate rules replace content-dependent sizing with an explicit fixed-pixel request. Full original-source joins retain this authoring difference even where computed/local scalars normalize equally. This does not prove candidate used width, intrinsic-sizing failure, label/native-value composition or original raster cause. Initial/current width expressions agree; their exact derivation and intermediate history remain unproven.' };
}

// Use together with validateButtonFixedWidthInputs: that validator reopens
// complete trees/rules; this one independently reopens original scalar inputs
// and uses the supplied production callbacks without fabricating a style object.
export function validateButtonFixedWidthClassifications(evidence, discrepancies, canonicalStyle, equivalentValue,
  { root = process.cwd() } = {}) {
  try {
    if (evidence?.binding?.status !== 'bound') throw new Error('missing source binding');
    const boundary = realpathSync(path.resolve(root, 'artifacts/material-parity'));
    const file = realpathSync(path.resolve(root, evidence.binding.file)), relative = path.relative(boundary, file);
    if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative))
      throw new Error('source escapes Material artifacts');
    const bytes = readFileSync(file);
    if (hash(bytes) !== evidence.binding.sha256) throw new Error('original capture digest changed');
    const original = JSON.parse(bytes), inputs = new Map();
    for (const [kind, entries] of [['static', original.results ?? []], ['interaction', original.interactions ?? []]])
      for (const entry of entries) {
        const key = `${kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`;
        for (const input of selectedButtonInputs(entry)) {
          const id = ownerKey(key, input.id);
          if (inputs.has(id)) throw new Error('duplicate original owner');
          inputs.set(id, { input, family: entry.family, state: entry.state ?? 'static' });
        }
      }
    const observed = new Set(), expected = new Map();
    for (const o of evidence.observations) {
      const key = ownerKey(o.case, o.element), original = inputs.get(key);
      if (!original || observed.has(key) || original.family !== o.family || original.state !== o.state)
        throw new Error('observation lacks exact original owner/state');
      observed.add(key);
      const r = canonicalStyle(original.input.reference), a = canonicalStyle(original.input.astylar);
      const classified = classifyButtonFixedWidthInput(original.input, 'width', r.width, a.width, o, canonicalStyle);
      if (!classified) throw new Error('observation proof differs from original input');
      // This filter affects scalar rows ONLY. The observed population above
      // must still include numerically matching, unequally authored controls.
      if (equivalentValue('width', r.width, a.width, r, a)) continue;
      const group = JSON.stringify([o.family, o.element, r.width, a.width]);
      if (!expected.has(group)) expected.set(group, { family: o.family, element: o.element, property: 'width',
        reference: r.width, astylar: a.width, attribution: classified.attribution,
        classification: classified.classification, recommendedOwner: classified.owner,
        justification: classified.justification, reviewEvidence: classified.reviewEvidence,
        reviewedCases: [], cases: [], states: [], occurrences: 0 });
      const row = expected.get(group); row.reviewedCases.push(o.case); row.occurrences++;
      if (row.cases.length < 12) row.cases.push(o.case);
      if (!row.states.includes(o.state)) row.states.push(o.state);
    }
    if (observed.size !== inputs.size) throw new Error('incomplete authoring population including scalar-matching owners');
    const fields = ['family', 'element', 'property', 'reference', 'astylar', 'attribution', 'classification',
      'recommendedOwner', 'justification', 'reviewEvidence', 'reviewedCases', 'cases', 'states', 'occurrences'];
    const actual = discrepancies.filter(r => r.attribution === buttonFixedWidthAttribution)
      .map(row => Object.fromEntries(fields.map(k => [k, row[k]])));
    const ordered = [...expected.values()].sort((a, b) => a.family.localeCompare(b.family) ||
      a.element.localeCompare(b.element) || a.property.localeCompare(b.property));
    if (!isDeepStrictEqual(actual, ordered))
      return ['button fixed width classifications differ from complete original owner/value/state coverage'];
  } catch (error) { return [`button fixed width classification replay failed: ${error}`]; }
  return [];
}
