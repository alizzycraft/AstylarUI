import { readFileSync, realpathSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { ownerGapProperties } from './owner-gap-input-evidence.mjs';
import { classifyOwnerGapInput, ownerGapAttribution } from './owner-gap-classification.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const fields = ['family', 'element', 'property', 'reference', 'astylar', 'classification', 'attribution',
  'recommendedOwner', 'justification', 'reviewEvidence', 'reviewedCases', 'occurrences', 'cases', 'states'];

// Complements validateOwnerGapInputs: independently reopens the scalar source
// and requires exactly the eligible classifications, including ordered states
// and full membership. Removing a row or changing its attribution cannot opt
// it out. Tree replay remains mandatory; this is not a replacement for it.
export function expectedOwnerGapClassifications(evidence, { root = process.cwd() } = {}) {
  if (evidence?.binding?.status !== 'bound') throw new Error('missing original gap binding');
  const boundary = realpathSync(path.resolve(root, 'artifacts/material-parity'));
  const file = realpathSync(path.resolve(root, evidence.binding.file)), relative = path.relative(boundary, file);
  if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative))
    throw new Error('gap source escapes Material artifacts');
  const bytes = readFileSync(file);
  if (hash(bytes) !== evidence.binding.sha256) throw new Error('original gap capture digest changed');
  const original = JSON.parse(bytes), expected = new Map(), cases = new Set(), identities = new Set();
  let index = 0;
  for (const [kind, entries] of [['static', original.results ?? []], ['interaction', original.interactions ?? []]]) {
    for (const entry of entries) {
      const key = `${kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`;
      if (cases.has(key)) throw new Error('duplicate original gap case');
      cases.add(key);
      for (const input of entry.styleInputs ?? []) for (const property of ownerGapProperties) {
        if (input.reference?.[property] !== 'normal' || !input.astylar || Object.hasOwn(input.astylar, property)) continue;
        const o = evidence.observations[index++], identity = JSON.stringify([key, input.id, property]);
        if (identities.has(identity)) throw new Error('duplicate original gap owner property');
        identities.add(identity);
        if (!o || o.case !== key || o.family !== entry.family || o.profile !== entry.profile ||
            o.state !== (entry.state ?? 'static') || !isDeepStrictEqual(o.viewport, entry.viewport) ||
            o.inputSha256 !== hash(JSON.stringify(input)) || o.proof.element !== input.id || o.proof.property !== property)
          throw new Error('gap observation lacks exact original scalar owner/state');
        const classified = classifyOwnerGapInput(input, property, 'normal', undefined, o);
        if (!classified) continue;
        const signature = JSON.stringify([entry.family, input.id, property, classified.attribution]);
        if (!expected.has(signature)) expected.set(signature, {
          family: entry.family, element: input.id, property, reference: 'normal', astylar: undefined,
          classification: classified.classification, attribution: classified.attribution,
          recommendedOwner: classified.owner, justification: classified.justification,
          reviewEvidence: classified.reviewEvidence, reviewedCases: [], occurrences: 0, cases: [], states: [],
        });
        const row = expected.get(signature);
        row.reviewedCases.push(key); row.occurrences++;
        if (row.cases.length < 12) row.cases.push(key);
        if (!row.states.includes(o.state)) row.states.push(o.state);
      }
    }
  }
  if (index !== evidence.observations.length) throw new Error('incomplete original gap population including review gaps');
  return [...expected.values()].sort((a, b) => a.family.localeCompare(b.family) ||
    a.element.localeCompare(b.element) || a.property.localeCompare(b.property));
}

export function validateOwnerGapClassifications(evidence, discrepancies, options = {}) {
  try {
    const expected = expectedOwnerGapClassifications(evidence, options);
    const actual = discrepancies.filter(row => row.attribution === ownerGapAttribution)
      .map(row => Object.fromEntries(fields.map(field => [field, row[field]])));
    if (!isDeepStrictEqual(actual, expected))
      return ['owner gap classifications differ from complete original coverage'];
  } catch (error) { return [`owner gap classification replay failed: ${error}`]; }
  return [];
}
