import { readFileSync, realpathSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { selectedButtonInputs } from './button-pill-radius-evidence.mjs';
import { classifyButtonBoxSizingInput, buttonBoxSizingAttribution } from './button-box-sizing-classification.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const fields = ['family', 'element', 'property', 'reference', 'astylar', 'classification', 'attribution',
  'recommendedOwner', 'justification', 'reviewEvidence', 'reviewedCases', 'occurrences', 'cases', 'states'];

// Use together with validateButtonBoxSizingInputs, which reopens both complete
// trees and rechecks declarations/stages. This independently reopens the scalar
// and measured geometry population to check complete canonical classification.
export function validateButtonBoxSizingClassifications(evidence, discrepancies, { root = process.cwd() } = {}) {
  try {
    if (evidence?.binding?.status !== 'bound') throw new Error('missing original binding');
    const boundary = realpathSync(path.resolve(root, 'artifacts/material-parity'));
    const file = realpathSync(path.resolve(root, evidence.binding.file)), relative = path.relative(boundary, file);
    if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative))
      throw new Error('source escapes Material artifacts');
    const bytes = readFileSync(file);
    if (hash(bytes) !== evidence.binding.sha256) throw new Error('original capture digest changed');
    const original = JSON.parse(bytes), owners = [], cases = new Set();
    for (const [kind, entries] of [['static', original.results ?? []], ['interaction', original.interactions ?? []]])
      for (const entry of entries) {
        const key = `${kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`;
        if (cases.has(key)) throw new Error('duplicate original case');
        cases.add(key);
        for (const input of selectedButtonInputs(entry)) owners.push({ key, kind, entry, input });
      }
    if (owners.length !== evidence.observations.length) throw new Error('incomplete original population including geometry gaps');
    const expected = new Map(), identities = new Set();
    for (const [index, { key, kind, entry, input }] of owners.entries()) {
      const o = evidence.observations[index], identity = JSON.stringify([key, input.id]);
      if (identities.has(identity)) throw new Error('duplicate original owner');
      identities.add(identity);
      if (o.case !== key || o.family !== entry.family || o.profile !== entry.profile ||
          o.state !== (entry.state ?? 'static') || !isDeepStrictEqual(o.viewport, entry.viewport) ||
          o.inputSha256 !== hash(JSON.stringify(input)) || o.proof.element !== input.id)
        throw new Error('observation lacks exact original scalar owner/state');
      if (kind === 'static') {
        const boxes = entry.geometry?.elements?.filter(g => g.id === input.id);
        if (boxes?.length !== 1 || !isDeepStrictEqual(o.proof.geometry, boxes[0]))
          throw new Error('static geometry differs from original captured measurement');
      } else if (Object.hasOwn(entry, 'geometry') || o.proof.geometry !== null)
        throw new Error('interaction geometry gap was changed');
      const c = classifyButtonBoxSizingInput(input, 'boxSizing', input.reference.boxSizing, input.astylar.boxSizing, o);
      if (!c) throw new Error('original observation lacks reviewed box-sizing classification');
      const signature = JSON.stringify([entry.family, input.id, 'border-box', undefined]);
      if (!expected.has(signature)) expected.set(signature, {
        family: entry.family, element: input.id, property: 'boxSizing', reference: 'border-box', astylar: undefined,
        classification: c.classification, attribution: c.attribution, recommendedOwner: c.owner,
        justification: c.justification, reviewEvidence: c.reviewEvidence,
        reviewedCases: [], occurrences: 0, cases: [], states: [],
      });
      const row = expected.get(signature); row.reviewedCases.push(key); row.occurrences++;
      if (row.cases.length < 12) row.cases.push(key);
      if (!row.states.includes(o.state)) row.states.push(o.state);
    }
    const ordered = [...expected.values()].sort((a, b) => a.family.localeCompare(b.family) ||
      a.element.localeCompare(b.element) || a.property.localeCompare(b.property));
    const actual = discrepancies.filter(row => row.attribution === buttonBoxSizingAttribution)
      .map(row => Object.fromEntries(fields.map(field => [field, row[field]])));
    if (!isDeepStrictEqual(actual, ordered))
      return ['button box sizing classifications differ from complete original owner/value/state coverage'];
  } catch (error) { return [`button box sizing classification replay failed: ${error}`]; }
  return [];
}
