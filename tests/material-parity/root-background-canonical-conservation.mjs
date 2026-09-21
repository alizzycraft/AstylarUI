import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { rootBackgroundAttribution, validateRootBackgroundClassifications } from './root-background-classification-preparation.mjs';

const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const classificationFields = new Set(['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']);
const raw = row => Object.fromEntries(Object.entries(row).filter(([key]) => !classificationFields.has(key)));

// The source collector must be replayed/authenticated by the caller. This
// proves whole-row conservation, not the rest of the canonical document.
export function conserveRootBackgroundCanonicalRows(previous, current, evidence) {
  assert.equal(previous.length, current.length, 'row population changed');
  assert.deepEqual(validateRootBackgroundClassifications(evidence, current), []);
  const remaining = new Map();
  for (const row of previous) {
    const key = digest(row), entries = remaining.get(key) ?? [];
    entries.push(row); remaining.set(key, entries);
  }
  const changed = [], unchanged = [];
  for (const row of current) {
    const exact = remaining.get(digest(row));
    if (exact?.length) {
      assert.deepEqual(exact.pop(), row); unchanged.push(digest(row)); continue;
    }
    assert.equal(row.attribution, rootBackgroundAttribution, 'unrelated classification changed');
    const matches = [...remaining.values()].flat().filter(old => old.attribution === 'unresolved' && isDeepStrictEqual(raw(old), raw(row)));
    assert.equal(matches.length, 1, 'raw values/membership changed or predecessor ambiguous');
    const old = matches[0], list = remaining.get(digest(old)); list.splice(list.indexOf(old), 1);
    assert.equal(row.reviewEvidence.rendererCauseProven, false);
    assert.equal(row.reviewEvidence.rasterDifferenceProven, false);
    changed.push({ family: row.family, element: row.element, property: row.property,
      occurrences: row.occurrences, previousRowSha256: digest(old), currentRowSha256: digest(row) });
  }
  assert.equal([...remaining.values()].flat().length, 0, 'old rows lost');
  assert.equal(changed.length, 144);
  assert.equal(changed.reduce((n, row) => n + row.occurrences, 0), 2311);
  return { rows: current.length, occurrences: current.reduce((n, row) => n + row.occurrences, 0),
    changedRows: changed.length, changedOccurrences: 2311, unchangedRows: unchanged.length,
    unchangedOrderedDigestsSha256: digest(unchanged), changes: changed,
    previousUnresolved: previous.filter(row => row.attribution === 'unresolved').length,
    currentUnresolved: current.filter(row => row.attribution === 'unresolved').length,
    inputEquivalent: false, renderingEquivalent: false };
}
