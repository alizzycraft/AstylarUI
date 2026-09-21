import assert from 'node:assert/strict';
import { readFileSync, createReadStream } from 'node:fs';
import { createHash } from 'node:crypto';
import { createGunzip } from 'node:zlib';
import { isDeepStrictEqual } from 'node:util';
import Parser from 'jsonparse';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const hash = value => createHash('sha256').update(value).digest('hex');
const same = (a, b, message) => assert.ok(isDeepStrictEqual(a, b), message);
export async function readAudit(directory) {
  const manifest = JSON.parse(readFileSync(`${directory}/material-input-equivalence-audit.json`));
  assert.equal(manifest.payload, 'material-input-equivalence-audit.json.gz');
  const path = `${directory}/${manifest.payload}`, compressed = readFileSync(path);
  assert.equal(compressed.length, manifest.compressedBytes);
  assert.equal(hash(compressed), manifest.compressedSha256);
  const parser = new Parser(), digest = createHash('sha256'), rows = [];
  let control, length = 0, roots = 0, arrays = 0;
  parser.onValue = function(value) {
    const top = this.stack[1]?.key ?? (this.stack.length === 1 ? this.key : undefined);
    if (this.stack.length === 2 && top === 'discrepancies') {
      rows.push(value); delete this.value[this.key];
    } else if (this.stack.length === 1) {
      if (this.key === 'controlTypography') control = value;
      if (this.key === 'discrepancies') arrays++;
      delete this.value[this.key];
    } else if (this.stack.length === 0) roots++;
    else if (this.value && !['controlTypography', 'discrepancies'].includes(top)) delete this.value[this.key];
  };
  for await (const chunk of createReadStream(path).pipe(createGunzip())) {
    digest.update(chunk); length += chunk.length; parser.write(chunk);
  }
  assert.equal(length, manifest.uncompressedBytes);
  assert.equal(digest.digest('hex'), manifest.uncompressedSha256);
  same([roots, arrays, parser.stack.length], [1, 1, 0], 'incomplete report');
  assert.ok(control && Array.isArray(control.differences));
  return { manifest, rows, control };
}

export function compareDisabledInkCanonical(previous, current, expected) {
same(current.rows, previous.rows, 'scalar discrepancy records changed');
assert.equal(expected.length, 60);
assert.equal(new Set(expected.map(row => row.case)).size, 60);
const copy = structuredClone(current.control), changed = [];
assert.equal(copy.differences.length, previous.control.differences.length);
const fields = new Set(['classification', 'attribution', 'recommendedOwner', 'justification', 'reviewEvidence']);
const raw = row => Object.fromEntries(Object.entries(row).filter(([key]) => !fields.has(key)));
for (let i = 0; i < copy.differences.length; i++) {
  const before = previous.control.differences[i], after = copy.differences[i];
  if (isDeepStrictEqual(before, after)) continue;
  same(raw(before), raw(after), 'raw control input changed');
  assert.equal(before.attribution, 'unresolved');
  assert.equal(after.attribution, 'reviewed-disabled-button-ink');
  assert.equal(after.classification, 'application-plugin-authoring-defect');
  assert.equal(after.family, 'button'); assert.equal(after.element, 'button-disabled');
  assert.equal(after.property, 'color');
  const matches = expected.filter(row => row.case === after.case);
  assert.equal(matches.length, 1);
  assert.equal(matches[0].reference, after.values.reference);
  assert.equal(matches[0].candidate, after.values.painted);
  assert.equal(after.reviewEvidence.referenceComputed, after.values.reference);
  assert.equal(after.reviewEvidence.candidatePainted, after.values.painted);
  changed.push(after.case); copy.differences[i] = before;
}
same(changed.slice().sort(), expected.map(row => row.case).sort(), 'changed population differs from independent source review');
same(copy, previous.control, 'unrelated control evidence changed');
return { previous: previous.manifest, current: current.manifest,
  changedControlRecords: changed.length, changedCases: changed,
  unchangedScalarRecords: current.rows.length,
  allRawControlInputsConserved: true, allOtherControlEvidenceConserved: true,
  scalarRecordsSha256: hash(JSON.stringify(current.rows)),
  canonicalAttributionChanged: true, renderingEquivalent: false };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  assert.equal(process.argv.length, 2);
  const previous = await readAudit('artifacts/material-parity/pre-disabled-ink-308e8bd');
  assert.equal(previous.manifest.uncompressedSha256, 'b1a0e6e9f8c2a72625666444f9828f46e42d649acafd95354b5b75e62731424e');
  const current = await readAudit('docs');
  const bytes = readFileSync('docs/material-disabled-button-ink.json');
  assert.equal(hash(bytes), '7fc910200d9c6727bd72ced2e81fbef2d5bc81f4eae7eb6e2595fae2ce048ee5');
  console.log(JSON.stringify(compareDisabledInkCanonical(previous, current, JSON.parse(bytes).findings), null, 2));
}
