import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import { createGunzip } from 'node:zlib';
import Parser from 'jsonparse';
import { readOwnerInitialBaseline } from '../tests/material-parity/owner-initial-style-baseline.mjs';
import { ownerInitialStyleAttribution } from '../tests/material-parity/owner-initial-style-attribution.mjs';

const hash = b => createHash('sha256').update(b).digest('hex');
const baseline = await readOwnerInitialBaseline();
const manifest = JSON.parse(readFileSync('docs/material-input-equivalence-audit.json'));
const bytes = readFileSync('docs/' + manifest.payload);
assert.equal(hash(bytes), manifest.compressedSha256);
const parser = new Parser(), rows = []; let summary, done = false;
parser.onValue = function (value) {
  const top = this.stack[1]?.key ?? (this.stack.length === 1 ? this.key : undefined);
  if (this.stack.length === 2 && top === 'discrepancies') { rows.push(value); delete this.value[this.key]; }
  else if (this.stack.length === 1) {
    if (this.key === 'summary') summary = value;
    if (this.key === 'discrepancies') done = true;
    delete this.value[this.key];
  } else if (this.value && !['summary', 'discrepancies'].includes(top)) delete this.value[this.key];
};
for await (const chunk of Readable.from([bytes]).pipe(createGunzip())) { parser.write(chunk); if (done) break; }
assert.ok(done);
const mapping = JSON.parse(readFileSync('docs/material-owner-initial-style-mappings.json'));
assert.equal(mapping.canonicalCompressedSha256, baseline.manifest.compressedSha256);
const eligible = mapping.groups.filter(g => g.allCasesHaveCapturedObservationStageEvidence);
const key = r => JSON.stringify([r.family, r.element, r.property, r.reference]);
const expected = new Map(eligible.map(g => [key(g), g]));
assert.equal(expected.size, 326);
const replacement = rows.filter(r => r.attribution === ownerInitialStyleAttribution);
assert.equal(replacement.length, expected.size);
for (const row of replacement) {
  const group = expected.get(key(row)); assert.ok(group, 'unexpected new attribution');
  assert.equal(row.classification, 'parity-harness-defect');
  assert.equal(row.astylar, undefined);
  assert.deepEqual(row.reviewedCases, group.cases);
  assert.equal(row.occurrences, group.occurrences);
  assert.equal(row.reviewEvidence.computedCandidateVerified, false);
  assert.equal(row.reviewEvidence.renderingEquivalent, false);
}
const beforeOthers = baseline.rows.filter(r => !(r.attribution === 'unresolved' && expected.has(key(r))));
const afterOthers = rows.filter(r => r.attribution !== ownerInitialStyleAttribution);
assert.deepEqual(afterOthers, beforeOthers, 'an unrelated complete row changed');
const scalarProjection = rs => rs.map(r => ({ family: r.family, element: r.element, property: r.property,
  reference: r.reference, astylar: r.astylar, occurrences: r.occurrences, cases: r.cases, states: r.states }));
assert.deepEqual(scalarProjection(rows), scalarProjection(baseline.rows), 'raw values or coverage changed');
assert.equal(summary.unresolvedAttributions, 2812);
assert.equal(summary.inputEquivalent, false);
assert.equal(summary.totalStyleDifferenceOccurrences, 386891);
console.log(JSON.stringify({ groups: rows.length, newObservationStageGroups: replacement.length,
  observations: replacement.reduce((n, r) => n + r.occurrences, 0), unrelatedRows: afterOthers.length,
  scalarProjectionSha256: hash(JSON.stringify(scalarProjection(rows))),
  unrelatedRowsSha256: hash(JSON.stringify(afterOthers)), unresolved: summary.unresolvedAttributions,
  inputEquivalent: false }));
