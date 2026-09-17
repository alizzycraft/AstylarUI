import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { Readable } from 'node:stream';
import { createGunzip } from 'node:zlib';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import Parser from 'jsonparse';
import ts from 'typescript';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export const explicitGapCanonicalRevision = '3f55f189708dcf4ab640fc18f797a44f5b39bab6';
const compositionFile = 'docs/material-explicit-gap-composition.json';
const joinFile = 'docs/material-owner-gap-canonical-join.json';
const key = row => JSON.stringify([row.family, row.element, row.property]);

// Bind the existing complete composition proof, rather than writing a second
// implementation of it or normalizing away the candidate's explicit shorthand.
export function bindExplicitGapComposition(composition, join, rows, inputs) {
  assert.equal(composition.kind, 'explicit-gap-original-composition-review');
  assert.deepEqual(composition.counts, { groups: 16, owners: 8, cases: 296, propertyObservations: 1032, negativeControls: 40 });
  assert.equal(composition.canonicalIntegration, false); assert.equal(composition.inputEquivalent, false);
  assert.equal(composition.rendererCauseProven, false);
  assert.equal(join.kind, 'owner-gap-canonical-membership-join');
  assert.deepEqual(composition.survey, join.survey);
  assert.equal(rows.length, 16); assert.equal(new Set(rows.map(key)).size, 16);
  assert.equal(composition.owners.length, 8);
  assert.equal(new Set(composition.owners.map(o => o.element)).size, 8);
  const bound = [], cases = new Set(), consumed = new Set();
  for (const owner of composition.owners) {
    assert.equal(owner.classification, 'application-plugin-authoring-defect');
    assert.equal(owner.attribution, 'reviewed-unequal-spacing-composition');
    for (const flag of ['inputEquivalent', 'usedGapVerified', 'rendererCauseProven']) assert.equal(owner[flag], false);
    assert.equal(owner.records.length, owner.cases); assert.equal(owner.propertyObservations, owner.cases * 2);
    assert.equal(new Set(owner.records.map(r => r.case)).size, owner.cases);
    const pair = rows.filter(r => r.family === owner.family && r.element === owner.element);
    assert.deepEqual(pair.map(r => r.property).sort(), ['columnGap', 'rowGap']);
    for (const row of pair) {
      assert.equal(row.attribution, 'unresolved');
      assert.equal(row.reference, 'normal'); assert.equal(row.astylar, owner.candidateGap);
      assert.equal(row.occurrences, owner.cases);
      const matches = join.rows.filter(r => key(r) === key(row)); assert.equal(matches.length, 1);
      const original = matches[0];
      assert.equal(original.canonicalRowSha256, hash(JSON.stringify(row)), 'full canonical group unchanged since original join');
      assert.equal(original.occurrences, row.occurrences);
      assert.deepEqual(original.canonicalSample, row.cases); assert.deepEqual(original.states, row.states);
      assert.deepEqual(original.observations.map(o => o.case), owner.records.map(r => r.case));
      const observations = owner.records.map((record, index) => {
        const source = original.observations[index], input = inputs.get(`${record.case}/${owner.element}`);
        assert.ok(input, 'original complete input missing');
        assert.equal(hash(JSON.stringify(input.input)), record.inputSha256);
        assert.equal(record.inputSha256, source.inputSha256);
        assert.deepEqual(record.inputTrees, input.inputTrees);
        assert.equal(source.candidateRaw, '<omitted>');
        assert.equal(source.candidateRawShorthand, owner.candidateGap);
        assert.equal(source.referenceRaw, 'normal');
        assert.match(record.compositionSha256, /^[a-f0-9]{64}$/);
        assert.equal(record.finding, owner.witness.finding);
        cases.add(record.case);
        return { case: record.case, inputTrees: record.inputTrees, inputSha256: record.inputSha256,
          compositionSha256: record.compositionSha256, rawReference: source.referenceRaw,
          rawCandidateLonghand: source.candidateRaw, rawCandidateShorthand: source.candidateRawShorthand };
      });
      consumed.add(key(row));
      bound.push({ family: owner.family, element: owner.element, property: row.property,
        canonicalRowSha256: original.canonicalRowSha256, reference: row.reference, candidate: row.astylar,
        priorAttribution: row.attribution, classification: owner.classification,
        proposedAttribution: owner.attribution, cause: owner.witness.finding,
        originalProofSha256: original.originalProofSha256, observations,
        inputEquivalent: false, usedGapVerified: false, rendererCauseProven: false });
    }
  }
  assert.equal(consumed.size, rows.length); assert.equal(cases.size, 296);
  assert.equal(bound.reduce((n, r) => n + r.observations.length, 0), 1032);
  return bound;
}

export async function loadExplicitGapBindingInputs() {
  const git = file => execFileSync('git', ['show', `${explicitGapCanonicalRevision}:${file}`], { maxBuffer: 64 * 1024 * 1024 });
  const compositionBytes = readFileSync(compositionFile), composition = JSON.parse(compositionBytes);
  const joinBytes = readFileSync(joinFile); assert.equal(hash(joinBytes), composition.join.sha256);
  const join = JSON.parse(joinBytes);
  const originalComposition = JSON.parse(git(compositionFile)), originalJoin = JSON.parse(git(joinFile));
  // Only dependency receipt hashes may advance after independently replaying
  // the same proof. Every finding, scalar, tree digest and membership stays fixed.
  assert.deepEqual({ ...composition,
    survey: { ...composition.survey, sha256: originalComposition.survey.sha256 },
    join: { ...composition.join, sha256: originalComposition.join.sha256 } }, originalComposition,
    'complete composition evidence changed beyond dependency receipts');
  assert.deepEqual({ ...join, survey: { ...join.survey, sha256: originalJoin.survey.sha256 } }, originalJoin,
    'independent canonical join changed beyond its survey receipt');
  assert.equal(hash(readFileSync(composition.sourceFingerprint.file, 'utf8').replaceAll('\r\n', '\n')), composition.sourceFingerprint.sha256);
  const surveyBytes = readFileSync(composition.survey.file); assert.equal(hash(surveyBytes), composition.survey.sha256);
  const survey = JSON.parse(surveyBytes);
  for (const source of survey.sourceFingerprints)
    assert.equal(hash(readFileSync(source.file, 'utf8').replaceAll('\r\n', '\n')), source.sha256);
  const auditFile = 'tests/material-parity/input-equivalence-audit.mjs';
  const parsed = bytes => ts.createSourceFile(auditFile, bytes.toString(), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const previous = parsed(git(auditFile)), current = parsed(readFileSync(auditFile));
  const functionText = (file, name) => {
    const matches = file.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
    assert.equal(matches.length, 1); return matches[0].getText(file);
  };
  for (const name of ['canonicalStyle', 'expandQuad', 'expandPair', 'splitCssTerms', 'normalizeValue',
    'normalizeColor', 'formatNumber', 'reviewedTemplateTextMappings'])
    assert.equal(functionText(current, name), functionText(previous, name), `unchanged original gap dependency ${name}`);
  const rawBytes = readFileSync(join.capture.file); assert.equal(hash(rawBytes), join.capture.sha256);
  const raw = JSON.parse(rawBytes), inputs = new Map();
  for (const [kind, entries] of [['static', raw.results], ['interaction', raw.interactions]]) for (const entry of entries) {
    const caseId = `${kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`;
    for (const input of entry.styleInputs) {
      const id = `${caseId}/${input.id}`; assert.ok(!inputs.has(id));
      inputs.set(id, { input, inputTrees: entry.inputTrees });
    }
  }
  const manifest = JSON.parse(git('docs/material-input-equivalence-audit.json'));
  assert.equal(manifest.payload, 'material-input-equivalence-audit.json.gz');
  const payload = git('docs/' + manifest.payload);
  assert.equal(payload.length, manifest.compressedBytes); assert.equal(hash(payload), manifest.compressedSha256);
  const elements = new Set(composition.owners.map(o => o.element)), rows = [], parser = new Parser();
  let done = false, totalGroups = 0, unresolvedGroups = 0;
  parser.onValue = function(value) {
    const top = this.stack[1]?.key ?? (this.stack.length === 1 ? this.key : undefined);
    if (this.stack.length === 2 && top === 'discrepancies') {
      totalGroups++; if (value.attribution === 'unresolved') unresolvedGroups++;
      if (elements.has(value.element) && ['columnGap', 'rowGap'].includes(value.property)) rows.push(value);
      delete this.value[this.key];
    } else if (this.stack.length === 1) { if (this.key === 'discrepancies') done = true; delete this.value[this.key]; }
    else if (this.value && top !== 'discrepancies') delete this.value[this.key];
  };
  for await (const chunk of Readable.from([payload]).pipe(createGunzip())) { parser.write(chunk); if (done) break; }
  assert.ok(done); assert.equal(totalGroups, 8339); assert.equal(unresolvedGroups, 2330);
  return { composition, join, rows, inputs, manifest, totalGroups, unresolvedGroups,
    compositionDescriptor: { file: compositionFile, sha256: hash(compositionBytes) },
    joinDescriptor: { file: joinFile, sha256: hash(joinBytes) } };
}

export function recordExplicitGapBinding(input) {
  const rows = bindExplicitGapComposition(input.composition, input.join, input.rows, input.inputs);
  return { schemaVersion: 1, kind: 'explicit-gap-canonical-classification-binding',
    canonicalRevision: explicitGapCanonicalRevision, canonicalCompressedSha256: input.manifest.compressedSha256,
    canonicalTotalGroups: input.totalGroups, canonicalUnresolvedGroups: input.unresolvedGroups,
    composition: input.compositionDescriptor, join: input.joinDescriptor,
    counts: { groups: 16, owners: 8, cases: 296, observations: 1032 }, rows,
    sourceFingerprints: ['scripts/bind-material-explicit-gap-composition.mjs',
      'tests/material-parity/explicit-gap-canonical-binding.spec.mjs'].map(file => ({ file,
      sha256: hash(readFileSync(file, 'utf8').replaceAll('\r\n', '\n')) })),
    canonicalIntegration: false, inputEquivalent: false,
    limitation: 'Binds the already verified complete composition review to all current baseline canonical groups and original inputs. The complete compressed payload is hash-checked; parsing stops after the full discrepancy inventory. This does not regenerate the canonical audit, independently recompute composition proofs, or establish computed/used-gap or renderer equivalence.' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2); assert.ok(!args.length || args.length === 1 && args[0] === '--check');
  const result = recordExplicitGapBinding(await loadExplicitGapBindingInputs());
  const output = 'docs/material-explicit-gap-canonical-binding.json';
  if (args[0] === '--check') assert.deepEqual(JSON.parse(readFileSync(output)), result);
  else writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({ ...result.counts, canonicalUnresolved: result.canonicalUnresolvedGroups, canonicalIntegration: false }));
}
