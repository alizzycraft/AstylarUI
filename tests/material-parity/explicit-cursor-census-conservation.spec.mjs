import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { assertExplicitCursorCensusConserved } from './explicit-cursor-census-conservation.mjs';

const hash = file => createHash('sha256').update(readFileSync(file, 'utf8').replaceAll('\r\n', '\n')).digest('hex');
const replay = JSON.parse(readFileSync('docs/material-explicit-cursor-inputs.json'));
for (const file of ['tests/material-parity/input-equivalence-audit.mjs', 'scripts/audit-material-vertical-align-population.mjs']) {
  replay.sourceFingerprints.find(row => row.file === file).sha256 = hash(file);
}

test('cursor receipt projection conserves evidence without mutating its caller', () => {
  const before = structuredClone(replay);
  assert.equal(assertExplicitCursorCensusConserved(replay).allOtherEvidenceConserved, true);
  assert.deepEqual(replay, before);
});

test('cursor receipt projection rejects changed evidence, receipts and source', () => {
  const mutations = [
    r => { r.observations--; },
    r => { r.findings[0].case += '-forged'; },
    r => { r.patterns[0].proof.rendererCauseProven = true; },
    r => { r.sourceFingerprints[0].sha256 = 'forged'; },
    r => { r.sourceFingerprints.push(structuredClone(r.sourceFingerprints[0])); },
    r => { r.canonicalAttributionChanged = true; },
  ];
  for (const mutate of mutations) {
    const changed = structuredClone(replay); mutate(changed);
    assert.throws(() => assertExplicitCursorCensusConserved(changed));
  }
  assert.throws(() => assertExplicitCursorCensusConserved(replay, {
    read: file => file === 'docs/material-explicit-cursor-inputs.json'
      ? Buffer.from('{}') : readFileSync(file),
  }));
  assert.throws(() => assertExplicitCursorCensusConserved(replay, {
    read: file => file === 'tests/material-parity/input-equivalence-audit.mjs'
      ? Buffer.concat([readFileSync(file), Buffer.from('\nexport const forgedCursorEvidence = true;\n')]) : readFileSync(file),
  }));
});
