import { readFileSync, realpathSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { ownerGridInitialProperties } from './owner-grid-initial-evidence.mjs';
import { classifyOwnerGridInitialInput, ownerGridInitialAttribution } from './owner-grid-initial-classification.mjs';
import { classifyNonGridTemplateInput, nonGridTemplateAttribution } from './grid-template-input-evidence.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const keyOf = (kind, entry) => `${kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`;
const ownerKey = (key, element) => JSON.stringify([key, element]);
const fields = ['family', 'element', 'property', 'reference', 'astylar', 'classification', 'attribution',
  'recommendedOwner', 'justification', 'reviewEvidence', 'reviewedCases', 'occurrences', 'cases', 'states'];

// Use with validateOwnerGridInitialInputs and the original non-grid inventory
// validator. This check reopens the scalar source and proves complete classified
// coverage and precedence; it does not replace either tree/declaration replay.
export function validateOwnerGridInitialClassifications(evidence, discrepancies, nonGridInputs,
  { root = process.cwd() } = {}) {
  try {
    if (evidence?.binding?.status !== 'bound') throw new Error('missing original binding');
    const boundary = realpathSync(path.resolve(root, 'artifacts/material-parity'));
    const file = realpathSync(path.resolve(root, evidence.binding.file));
    const relative = path.relative(boundary, file);
    if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative))
      throw new Error('source escapes Material artifacts');
    const bytes = readFileSync(file);
    if (hash(bytes) !== evidence.binding.sha256) throw new Error('original capture digest changed');
    const original = JSON.parse(bytes), owners = [], cases = new Set(), prior = new Map();
    for (const proof of nonGridInputs) {
      const key = ownerKey(proof.case, proof.element);
      if (prior.has(key)) throw new Error('duplicate earlier non-grid proof');
      prior.set(key, proof);
    }
    for (const [kind, entries] of [['static', original.results ?? []], ['interaction', original.interactions ?? []]]) {
      for (const entry of entries) {
        const key = keyOf(kind, entry);
        if (cases.has(key)) throw new Error('duplicate original case');
        cases.add(key);
        for (const input of entry.styleInputs ?? []) for (const property of ownerGridInitialProperties) {
          if (input.reference?.[property] !== 'none' || !input.astylar || Object.hasOwn(input.astylar, property)) continue;
          owners.push({ key, input, property, entry });
        }
      }
    }
    if (owners.length !== evidence.observations.length) throw new Error('incomplete original population including review gaps');
    const expected = new Map(), identities = new Set();
    for (const [index, { key, input, property, entry }] of owners.entries()) {
      const o = evidence.observations[index], identity = JSON.stringify([key, input.id, property]);
      if (identities.has(identity)) throw new Error('duplicate original owner property');
      identities.add(identity);
      if (o.case !== key || o.family !== entry.family || o.profile !== entry.profile ||
          o.state !== (entry.state ?? 'static') || !isDeepStrictEqual(o.viewport, entry.viewport) ||
          o.inputSha256 !== hash(JSON.stringify(input)) || o.proof.element !== input.id || o.proof.property !== property)
        throw new Error('observation lacks exact original scalar owner/state');
      // Preserve the earlier stronger, independently validated block/flex proof.
      // A row must not opt itself out of this check by changing its attribution.
      const earlier = classifyNonGridTemplateInput(input, property, 'none', undefined, prior.get(ownerKey(key, input.id)));
      const classified = earlier ?? classifyOwnerGridInitialInput(input, property, 'none', undefined, o);
      if (!classified) continue;
      const signature = JSON.stringify([entry.family, input.id, property, classified.attribution]);
      if (!expected.has(signature)) expected.set(signature, {
        family: entry.family, element: input.id, property, reference: 'none', astylar: undefined,
        classification: classified.classification, attribution: classified.attribution,
        recommendedOwner: classified.owner, justification: classified.justification,
        reviewEvidence: classified.reviewEvidence, reviewedCases: [], occurrences: 0, cases: [], states: [],
      });
      const row = expected.get(signature);
      row.reviewedCases.push(key); row.occurrences++;
      if (row.cases.length < 12) row.cases.push(key);
      if (!row.states.includes(o.state)) row.states.push(o.state);
    }
    const ordered = [...expected.values()].sort((a, b) => a.family.localeCompare(b.family) ||
      a.element.localeCompare(b.element) || a.property.localeCompare(b.property));
    const actual = discrepancies.filter(row => [ownerGridInitialAttribution, nonGridTemplateAttribution].includes(row.attribution))
      .map(row => Object.fromEntries(fields.map(field => [field, row[field]])));
    if (!isDeepStrictEqual(actual, ordered))
      return ['owner grid classifications differ from complete original coverage or earlier non-grid precedence'];
  } catch (error) { return [`owner grid classification replay failed: ${error}`]; }
  return [];
}
