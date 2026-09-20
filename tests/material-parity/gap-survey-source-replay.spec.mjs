import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { isDeepStrictEqual } from 'node:util';
import test from 'node:test';
import { readGapSurveySource, bindGapSurveyNormalizer, gapSurveyNormalizationRevision } from './gap-survey-source-replay.mjs';

const survey = JSON.parse(readFileSync('docs/material-owner-gap-input-survey.json'));
const moduleFile = survey.productionNormalization.module;
const source = readFileSync(moduleFile, 'utf8');
const sha = text => createHash('sha256').update(text).digest('hex');

test('historical dependency reading is explicit and still rejects changed or substituted sources', () => {
  const descriptor = survey.sourceFingerprints.find(s => s.file === moduleFile);
  const historical = readGapSurveySource(descriptor);
  assert.notEqual(sha(historical.replaceAll('\r\n', '\n')), sha(source.replaceAll('\r\n', '\n')));
  const requests = [];
  assert.equal(readGapSurveySource(descriptor, { current() { assert.fail('historical module read as current'); },
    historical(revision, file) { requests.push([revision, file]); return historical; } }), historical);
  assert.deepEqual(requests, [[gapSurveyNormalizationRevision, moduleFile]]);
  assert.throws(() => readGapSurveySource(descriptor, { historical: () => source }), /dependency changed/);
  assert.throws(() => readGapSurveySource({ file: 'other.mjs', sha256: sha('original') },
    { current: () => 'changed', historical() { assert.fail('non-normalizer read historically'); } }), /dependency changed/);
  assert.throws(() => bindGapSurveyNormalizer({ ...survey, sourceFingerprints: [] }), /one full-source receipt/);
  const altered = structuredClone(survey); altered.productionNormalization.sha256 = '0'.repeat(64);
  assert.throws(() => bindGapSurveyNormalizer(altered), /normalization changed/);
});

test('all four original style stages preserve exact gap normalization despite the color correction', () => {
  const bytes = readFileSync(survey.capture.file); assert.equal(sha(bytes), survey.capture.sha256);
  const raw = JSON.parse(bytes), normalize = bindGapSurveyNormalizer(survey);
  let owners = 0, stages = 0;
  for (const entry of [...raw.results, ...raw.interactions]) for (const input of entry.styleInputs) {
    owners++;
    for (const stage of ['reference', 'astylar', 'astylarNormalResolvedStyle', 'astylarInteractionResolvedStyle']) {
      normalize(input[stage] ?? {}); stages++;
    }
  }
  assert.equal(owners, 6946); assert.equal(stages, 27784);
});

test('a live gap regression cannot hide behind a valid historical source hash', () => {
  assert.deepEqual(bindGapSurveyNormalizer(survey)({ gap: '8px 16px', color: 'color(srgb .5 0 1)' }),
    { rowGap: '8px', columnGap: '16px' });
  for (const property of ['rowGap', 'columnGap']) {
    const changed = source.replace("expandPair(result, 'gap', ['rowGap', 'columnGap']);",
      `expandPair(result, 'gap', ['rowGap', 'columnGap']); result.${property} = '99px';`);
    assert.notEqual(changed, source);
    const normalize = bindGapSurveyNormalizer(survey, changed);
    assert.throws(() => normalize({ gap: '8px 16px' }), new RegExp(`current ${property} differs`));
  }
});

test('historical gap report refresh changes exactly sixteen dependency receipts and no finding data', () => {
  const files = [
    ['docs/material-owner-gap-input-survey.json', ['sourceFingerprints.0']],
    ['docs/material-owner-gap-canonical-join.json', ['survey', 'sourceFingerprint']],
    ['docs/material-explicit-gap-composition.json', ['survey', 'join', 'sourceFingerprint']],
    ['docs/material-explicit-gap-canonical-binding.json', ['composition', 'join', 'sourceFingerprints.0']],
    ['docs/material-owner-gap-motion-review.json', ['parent', 'sources.0']],
    ['docs/material-gap-scalar-rule-loss.json', ['parent', 'sourceFingerprints.0']],
    ['docs/material-gap-review-membership.json', ['sources.0', 'sources.1', 'sources.2']],
  ];
  const get = (object, address) => address.split('.').reduce((value, key) => value[key], object);
  let changes = 0;
  for (const [file, addresses] of files) {
    const before = JSON.parse(execFileSync('git', ['show', `${gapSurveyNormalizationRevision}:${file}`],
      { maxBuffer: 16 * 1024 * 1024 }));
    const after = JSON.parse(readFileSync(file));
    const conserve = report => {
      const projected = structuredClone(report);
      for (const address of addresses) {
        const current = get(projected, address), prior = get(before, address);
        assert.equal(current.file, prior.file);
        const bytes = readFileSync(current.file);
        assert.equal(current.sha256, sha(current.file.endsWith('.mjs')
          ? bytes.toString('utf8').replaceAll('\r\n', '\n') : bytes));
        assert.notEqual(current.sha256, prior.sha256);
        current.sha256 = prior.sha256;
      }
      assert.ok(isDeepStrictEqual(projected, before), `gap finding data changed: ${file}`);
    };
    conserve(after); changes += addresses.length;
    const changed = structuredClone(after); changed.inputEquivalent = true;
    assert.throws(() => conserve(changed), /finding data changed/);
    const forged = structuredClone(after); get(forged, addresses[0]).sha256 = '0'.repeat(64);
    assert.throws(() => conserve(forged));
  }
  assert.equal(changes, 16);
});
