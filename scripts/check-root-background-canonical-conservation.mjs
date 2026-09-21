import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { readCaretConservationRows } from '../tests/material-parity/owner-caret-canonical-conservation.mjs';
import { prepareRootBackgroundClassifications } from '../tests/material-parity/root-background-classification-preparation.mjs';
import { conserveRootBackgroundCanonicalRows } from '../tests/material-parity/root-background-canonical-conservation.mjs';

assert.equal(process.argv.length, 2);
const before = await readCaretConservationRows(file => readFileSync(path.join('artifacts/material-parity/pre-root-classification-e5a8bf2', path.basename(file))));
assert.equal(before.manifest.compressedSha256, 'd4dc68ab9a12d9de733e2a3c9aa462724ed2bb013ec402f04f8ab9fa291b6d7c');
const after = await readCaretConservationRows(readFileSync);
assert.notEqual(after.manifest.compressedSha256, before.manifest.compressedSha256, 'regeneration not available');
const original = JSON.parse(readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json'));
const evidence = prepareRootBackgroundClassifications(original);
const report = { schemaVersion: 1, before: before.manifest, after: after.manifest,
  result: conserveRootBackgroundCanonicalRows(before.rows, after.rows, evidence),
  scope: 'All canonical discrepancy rows. Control typography, full document provenance and enforced output parity require separate verification.' };
writeFileSync('docs/material-root-background-canonical-conservation.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ ...report.result, changes: undefined }));
