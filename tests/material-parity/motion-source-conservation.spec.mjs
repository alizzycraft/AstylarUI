import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { collectOwnerInitialMotion } from '../../scripts/audit-material-owner-initial-motion.mjs';
import { verifyMotionSourceConservation, restoreTypographyMotionOptIns, restoreOwnerInitialSurveyOptIns, verifyOwnerInitialSurveyReplay } from './motion-source-conservation.mjs';

test('owner survey replay authenticates actual receipts and rejects changed evidence or unrelated sources', async () => {
  const saved = JSON.parse(readFileSync('docs/material-owner-initial-style-survey.json', 'utf8'));
  const receipt = file => createHash('sha256').update(readFileSync(file, 'utf8').replaceAll('\r\n', '\n')).digest('hex');
  const fresh = { ...saved, sourceFingerprints: saved.sourceFingerprints.map(s => ({ ...s, sha256: receipt(s.file) })) };
  await verifyOwnerInitialSurveyReplay(saved, fresh);
  await assert.rejects(verifyOwnerInitialSurveyReplay(saved, { ...fresh, observations: 32143 }));
  await assert.rejects(verifyOwnerInitialSurveyReplay(saved, { ...fresh, sourceFingerprints: saved.sourceFingerprints }));
  await assert.rejects(verifyOwnerInitialSurveyReplay({ ...saved, observations: 32143 }, fresh));
  for (const descriptor of saved.sourceFingerprints) {
    const reader = file => readFileSync(file, 'utf8') + (file === descriptor.file ? '\n// unrelated\n' : '');
    const altered = { ...fresh, sourceFingerprints: fresh.sourceFingerprints.map(s => s.file === descriptor.file
      ? { ...s, sha256: createHash('sha256').update(reader(s.file).replaceAll('\r\n', '\n')).digest('hex') } : s) };
    await assert.rejects(verifyOwnerInitialSurveyReplay(saved, altered, reader));
  }
});

test('original owner survey opt-ins restore the complete retained source and reject changed defaults', () => {
  const file = 'tests/material-parity/owner-initial-style-survey.mjs';
  const current = readFileSync(file, 'utf8');
  const retained = execFileSync('git', ['show', `a99cc87d:${file}`], { encoding: 'utf8' }).replaceAll('\r\n', '\n');
  assert.equal(restoreOwnerInitialSurveyOptIns(current), retained);
  for (const changed of [current + '\n// unrelated\n', current + current,
    current.replace('reviewedAppearance = false', 'reviewedAppearance = true'),
    current.replace("fontStyle: 'normal'", "fontStyle: 'italic'")]) {
    assert.notEqual(changed, current);
    assert.throws(() => restoreOwnerInitialSurveyOptIns(changed));
  }
});

test('typography opt-ins restore exact predecessors and reject unrelated or duplicated source edits', () => {
  for (const [kind, file] of [['survey', 'tests/material-parity/owner-initial-style-survey.mjs'],
    ['motion', 'scripts/audit-material-owner-initial-motion.mjs'], ['delay', 'scripts/audit-material-motion-delay-targets.mjs']]) {
    const current = readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
    const prior = execFileSync('git', ['show', `082050d:${file}`], { encoding: 'utf8' }).replaceAll('\r\n', '\n');
    assert.equal(restoreTypographyMotionOptIns(current, kind), prior);
    assert.equal(restoreTypographyMotionOptIns(prior, kind), prior);
    assert.throws(() => restoreTypographyMotionOptIns(current + '\n// unrelated edit\n', kind));
    assert.throws(() => restoreTypographyMotionOptIns(current.replace('reviewedTracking = false', 'reviewedTracking = true'), kind));
    assert.throws(() => restoreTypographyMotionOptIns(current + current, kind));
  }
});

test('motion replay conserves every finding and rejects stale or changed mapping evidence', () => {
  const file = 'tests/material-parity/input-equivalence-audit.mjs';
  const historical = execFileSync('git', ['show', `4650791a7208b841dd29f1ced015f98234949623:${file}`],
    { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
  const current = readFileSync(file, 'utf8');
  const saved = JSON.parse(readFileSync('docs/material-owner-initial-motion-review.json', 'utf8'));
  const fresh = collectOwnerInitialMotion();
  const verify = (value = fresh, source = current) => verifyMotionSourceConservation(saved, value, historical, source);
  const result = verify();
  assert.equal(result.groups, 121); assert.equal(result.observations, 7254);
  assert.equal(result.unchangedMappingDeclarations.length, 12);
  assert.equal(result.historicalReceiptsRewritten, false);
  assert.equal(result.inputEquivalent, false);
  assert.deepEqual(result.sourceReceiptTransitions.map(s => s.file),
    ['scripts/audit-material-owner-initial-motion.mjs', 'tests/material-parity/owner-initial-style-survey.mjs', file]);
  for (const { name } of result.unchangedMappingDeclarations) {
    const changed = current.replace(`function ${name}(`, `function changed_${name}(`);
    assert.notEqual(changed, current);
    assert.throws(() => verify(fresh, changed), /mapping/);
  }
  assert.throws(() => verify({ ...fresh, observations: 7253 }), /evidence changed/);
  assert.throws(() => verify({ ...fresh, findings: fresh.findings.slice(1) }), /evidence changed/);
  assert.throws(() => verify({ ...fresh, sourceFingerprints: saved.sourceFingerprints }), /not current/);
  const receipts = fresh.sourceFingerprints.map((s, i) => i ? s : { ...s, sha256: '0'.repeat(64) });
  assert.throws(() => verify({ ...fresh, sourceFingerprints: receipts }), /not current/);
  const staleSurvey = fresh.sourceFingerprints.map(s => s.file.endsWith('/owner-initial-style-survey.mjs')
    ? saved.sourceFingerprints.find(old => old.file === s.file) : s);
  assert.throws(() => verify({ ...fresh, sourceFingerprints: staleSurvey }), /not current/);
});
