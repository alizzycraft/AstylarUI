import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { Readable } from 'node:stream';
import { createGunzip } from 'node:zlib';
import Parser from 'jsonparse';
import { explicitGapAttribution } from '../tests/material-parity/explicit-gap-classification.mjs';
import { gapReviewAttributions } from '../tests/material-parity/gap-review-classification.mjs';

const baselineRevision = '852a06d1c8958d926a4eb9a0977b7847a3b16140';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const encoded = value => hash(JSON.stringify(value));
const field = (row, key) => ({ present: Object.hasOwn(row, key), value: row[key] });
const scalar = row => [row.family, row.element, row.property, field(row, 'reference'), field(row, 'astylar'),
  row.occurrences, row.cases, row.states];
async function readRows(read) {
  const manifest = JSON.parse(read('docs/material-input-equivalence-audit.json'));
  assert.equal(manifest.payload, 'material-input-equivalence-audit.json.gz');
  const bytes = read('docs/' + manifest.payload);
  assert.equal(bytes.length, manifest.compressedBytes); assert.equal(hash(bytes), manifest.compressedSha256);
  const rows = [], parser = new Parser(), digest = createHash('sha256'); let length = 0, found = false;
  parser.onValue = function(value) {
    const top = this.stack[1]?.key ?? (this.stack.length === 1 ? this.key : undefined);
    if (this.stack.length === 2 && top === 'discrepancies') {
      rows.push({ identity: [value.family, value.element, value.property], scalarSha256: encoded(scalar(value)),
        completeSha256: encoded(value), attribution: value.attribution, classification: value.classification,
        authoredSha256: encoded([field(value, 'referenceAuthoredExamples'), field(value, 'astylarAuthoredExamples')]),
        occurrences: value.occurrences, reviewEvidence: value.reviewEvidence });
      delete this.value[this.key];
    } else if (this.stack.length === 1) { if (this.key === 'discrepancies') found = true; delete this.value[this.key]; }
    else if (this.value && top !== 'discrepancies') delete this.value[this.key];
  };
  for await (const chunk of Readable.from([bytes]).pipe(createGunzip())) {
    digest.update(chunk); length += chunk.length; parser.write(chunk);
  }
  assert.equal(length, manifest.uncompressedBytes); assert.equal(digest.digest('hex'), manifest.uncompressedSha256);
  assert.equal(found, true); assert.equal(rows.length, 8339);
  return { manifest, rows };
}
const previous = await readRows(file => execFileSync('git', ['show', `${baselineRevision}:${file}`], { maxBuffer: 64 * 1024 * 1024 }));
const current = await readRows(file => readFileSync(file));
const changed = [], unchanged = [], categories = {};
assert.equal(previous.rows.length, current.rows.length);
for (let i = 0; i < previous.rows.length; i++) {
  const a = previous.rows[i], b = current.rows[i];
  assert.deepEqual(b.identity, a.identity, `ordered identity ${i}`);
  assert.equal(b.scalarSha256, a.scalarSha256, `complete original scalar ${JSON.stringify(a.identity)}`);
  assert.equal(b.authoredSha256, a.authoredSha256, `original authored examples ${JSON.stringify(a.identity)}`);
  if (a.completeSha256 === b.completeSha256) { unchanged.push(b.completeSha256); continue; }
  assert.equal(a.attribution, 'unresolved', `prior classification ${JSON.stringify(a.identity)}`);
  assert.ok(b.attribution === explicitGapAttribution || Object.values(gapReviewAttributions).includes(b.attribution),
    `unexpected changed row ${JSON.stringify(a.identity)}: ${b.attribution}`);
  assert.equal(b.classification, b.attribution === explicitGapAttribution ? 'application-plugin-authoring-defect' : 'parity-harness-defect');
  for (const flag of ['inputEquivalent', 'wholeElementInputEquivalent', 'usedGapVerified', 'rendererCauseProven'])
    assert.equal(b.reviewEvidence[flag], false);
  if (b.attribution !== explicitGapAttribution) for (const flag of ['computedCandidateVerified', 'renderingEquivalent'])
    assert.equal(b.reviewEvidence[flag], false);
  categories[b.attribution] ??= { groups: 0, occurrences: 0 };
  categories[b.attribution].groups++; categories[b.attribution].occurrences += b.occurrences;
  changed.push({ identity: b.identity, attribution: b.attribution, occurrences: b.occurrences,
    originalScalarSha256: b.scalarSha256, previousCompleteSha256: a.completeSha256, currentCompleteSha256: b.completeSha256 });
}
assert.equal(changed.length, 52); assert.equal(unchanged.length, 8287);
assert.equal(categories[explicitGapAttribution].groups, 16); assert.equal(categories[explicitGapAttribution].occurrences, 1032);
assert.equal(Object.entries(categories).filter(([key]) => key !== explicitGapAttribution).reduce((n, [, v]) => n + v.groups, 0), 36);
assert.equal(Object.entries(categories).filter(([key]) => key !== explicitGapAttribution).reduce((n, [, v]) => n + v.occurrences, 0), 1838);
assert.equal(current.rows.reduce((n, row) => n + row.occurrences, 0), 386891);
assert.equal(previous.rows.filter(r => r.attribution === 'unresolved').length, 2330);
assert.equal(current.rows.filter(r => r.attribution === 'unresolved').length, 2278);
console.log(JSON.stringify({ schemaVersion: 1, kind: 'complete-gap-integration-canonical-row-conservation', baselineRevision,
  previous: previous.manifest, current: current.manifest, scalarRows: current.rows.length, occurrences: 386891,
  unchangedCompleteRows: unchanged.length, unchangedOrderedRowDigestsSha256: encoded(unchanged),
  changedRows: changed.length, categories, changes: changed, unresolved: 2278,
  inputEquivalent: false, renderingEquivalent: false,
  limit: 'Complete discrepancy-row conservation; new source/proof ledgers are separately replayed by the full audit validator.' }, null, 2));
