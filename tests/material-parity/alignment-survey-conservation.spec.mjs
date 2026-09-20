import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { alignmentSurveyBaseline, verifyAlignmentAuditProjection, verifyAlignmentCollectorProjection,
  verifyAlignmentSurveyConservation } from './alignment-survey-conservation.mjs';

const hash = x => createHash('sha256').update(x).digest('hex');
const read = f => readFileSync(f, 'utf8').replaceAll('\r\n', '\n');
const old = f => execFileSync('git', ['show', `${alignmentSurveyBaseline}:${f}`], { encoding: 'utf8' }).replaceAll('\r\n', '\n');
const main = 'tests/material-parity/input-equivalence-audit.mjs';
const source = 'scripts/audit-material-text-align-ancestry.mjs';
const report = 'docs/material-text-align-ancestry.json';

test('alignment integration changes only reviewed orchestration and final snapshot conservation calls', () => {
  assert.equal(verifyAlignmentAuditProjection(old(main), read(main)).retainedStatements, 231);
  for (const [reportName, sourceName] of [
    ['material-vertical-align-population', 'audit-material-vertical-align-population'],
    ['material-text-align-ancestry', 'audit-material-text-align-ancestry'],
    ['material-ltr-alignment-review', 'audit-material-ltr-alignment'],
    ['material-remaining-text-alignment', 'audit-remaining-text-alignment'],
  ]) {
    const f = `scripts/${sourceName}.mjs`;
    assert.equal(verifyAlignmentCollectorProjection(`docs/${reportName}.json`, old(f), read(f)).unchangedCollectorBody, true);
  }
});

test('audit projection rejects retained behavior changes, import aliases and orchestration coupling', () => {
  const previous = old(main), current = read(main);
  const mutations = [
    s => s.replace('materialInputAuditSchemaVersion = 3', 'materialInputAuditSchemaVersion = 99'),
    s => s.replace('collectAlignmentFontAuditInputs, validateAlignmentFontAuditInputs', 'collectAlignmentFontAuditInputs as unexpected, validateAlignmentFontAuditInputs'),
    s => s.replace('collectAlignmentFontAuditInputs, validateAlignmentFontAuditInputs', 'collectAlignmentFontAuditInputs, unexpectedMember, validateAlignmentFontAuditInputs'),
    s => s + '\nconst hiddenCoupling = buildMaterialInputAudit;\n',
    s => s + "\nimport { classifyAlignmentFontInput } from './alignment-font-audit-source-binding.mjs';\n",
    s => s.replace('function sourceFingerprints(root)', 'function renamedSourceFingerprints(root)'),
  ];
  for (const mutate of mutations) { const changed = mutate(current); assert.notEqual(changed, current); assert.throws(() => verifyAlignmentAuditProjection(previous, changed)); }
});

test('collector projection rejects changed observations and widened conservation wrappers', () => {
  const previous = old(source), current = read(source);
  const mutations = [
    s => s.replace('assert.equal(seen.size, 2311)', 'assert.equal(seen.size, 2310)'),
    s => s.replace("'docs/material-text-align-ancestry.json', { schemaVersion", "'docs/unreviewed.json', { schemaVersion"),
    s => s.replace('canonicalAttributionChanged: false', 'canonicalAttributionChanged: true'),
    s => s.replace('import { conserveAlignmentSurveySnapshot }', 'import { conserveAlignmentSurveySnapshot as other }'),
    s => s + '\nconst stolen = conserveAlignmentSurveySnapshot("docs/material-text-align-ancestry.json", {});\n',
    s => s.replace('return conserveAlignmentSurveySnapshot(', 'return fake(conserveAlignmentSurveySnapshot('),
  ];
  for (const mutate of mutations) { const changed = mutate(current); assert.notEqual(changed, current); assert.throws(() => verifyAlignmentCollectorProjection(report, previous, changed)); }
});

function fixture() {
  const originals = new Map([[main, old(main)], [source, old(source)]]);
  const sources = new Map([[main, read(main)], [source, read(source)]]);
  const initial = { sourceFingerprints: [...originals].map(([file, text]) => ({ file, sha256: hash(text) })),
    observations: [{ case: 'original', reference: 'start', candidate: '<omitted>' }], inputEquivalent: false };
  const current = { ...structuredClone(initial), sourceFingerprints: [...sources].map(([file, text]) => ({ file, sha256: hash(text) })) };
  originals.set(report, JSON.stringify(initial)); sources.set(report, JSON.stringify(initial));
  return { current, initial, originals, sources, options: {
    readCurrent: f => { assert.ok(sources.has(f)); return sources.get(f); },
    readBaseline: f => { assert.ok(originals.has(f)); return originals.get(f); },
  } };
}

test('receipt conservation retains historical hashes only after proving all current observations', () => {
  const f = fixture(), before = JSON.stringify(f.current);
  const result = verifyAlignmentSurveyConservation(report, f.current, f.options);
  assert.deepEqual(result.report, f.initial); assert.equal(JSON.stringify(f.current), before);
  assert.equal(result.evidence.sourceChanges.length, 2);
  assert.equal(result.evidence.allObservationsUnchanged, true);
  for (const receipt of result.evidence.sourceChanges) assert.notEqual(receipt.historicalSha256, receipt.currentSha256);
  const mutations = [
    f => { f.current.observations[0].reference = 'right'; },
    f => { f.current.observations.push({ case: 'invented' }); },
    f => { f.current.inputEquivalent = true; },
    f => { f.current.sourceFingerprints.reverse(); },
    f => { f.current.sourceFingerprints.pop(); },
    f => { f.current.sourceFingerprints[0].sha256 = 'invented'; },
    f => { f.sources.set(report, '{}'); },
    f => { f.sources.set(source, read(source) + '\nconst altered = true;');
      f.current.sourceFingerprints[1].sha256 = hash(f.sources.get(source)); },
  ];
  for (const mutate of mutations) { const f = fixture(); mutate(f); assert.throws(() => verifyAlignmentSurveyConservation(report, f.current, f.options)); }
});
