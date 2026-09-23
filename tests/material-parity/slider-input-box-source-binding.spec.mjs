import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { collectSliderInputBoxes, classifySliderInputBox, sliderInputBoxAttribution, validateSliderInputBoxes, validateSliderInputBoxClassifications } from './slider-input-box-source-binding.mjs';
import { hash, canonical, equivalent, withCapture, rowsOf } from './slider-input-box-test-support.mjs';

test('slider box source binding retains both owners and states and rejects unrelated property attribution', () => withCapture(({ raw, options }) => {
  const before = structuredClone(raw), evidence = collectSliderInputBoxes(raw, options);
  assert.equal(evidence.binding.status, 'bound'); assert.equal(evidence.captures.length, 2);
  assert.equal(evidence.observations.length, 4); assert.deepEqual(raw, before);
  assert.deepEqual(validateSliderInputBoxes(evidence, options), []);
  const rows = rowsOf(evidence); assert.equal(rows.length, 14);
  assert.equal(rows.reduce((n, r) => n + r.occurrences, 0), 20);
  assert.deepEqual(validateSliderInputBoxClassifications(evidence, rows, canonical, equivalent), []);
  const o = evidence.observations[0];
  assert.equal(classifySliderInputBox(o.input, 'width', '200px', '50%', o, canonical), undefined);
  assert.equal(classifySliderInputBox(o.input, 'paddingLeft', '999px', '8px', o, canonical), undefined);
  assert.equal(collectSliderInputBoxes(raw).binding.status, 'unbound');
}));

test('slider box binding independently rejects removed captures changed sources and fabricated evidence', () => withCapture(({ raw, root, options, parityPath }) => {
  const evidence = collectSliderInputBoxes(raw, options);
  for (const mutate of [r => { r.results = []; }, r => { r.interactions[0].styleInputs.pop(); },
    r => { r.results[0].styleInputs[0].astylar.width = '25%'; }]) {
    const changed = structuredClone(raw); mutate(changed);
    assert.equal(collectSliderInputBoxes(changed, options).binding.status, 'invalid');
  }
  for (const mutate of [e => { e.captures = []; e.observations = []; }, e => { e.observations.pop(); },
    e => { e.observations[0].proof.inputEquivalent = true; }, e => { e.observations[0].input.astylar.padding = '0px'; },
    e => { e.observations.push(structuredClone(e.observations[0])); }]) {
    const changed = structuredClone(evidence); mutate(changed);
    assert.ok(validateSliderInputBoxes(changed, options).length);
  }
  const file = path.join(root, raw.results[0].inputTrees.astylar.file), bytes = readFileSync(file);
  writeFileSync(file, '{}');
  assert.equal(collectSliderInputBoxes(raw, options).binding.status, 'invalid');
  assert.ok(validateSliderInputBoxes(evidence, options).length);
  writeFileSync(file, bytes); writeFileSync(path.join(root, parityPath), '{}');
  assert.ok(validateSliderInputBoxes(evidence, options).length);
}));

test('slider box row coverage rejects dropped duplicated relabeled or falsely equivalent observations', () => withCapture(({ raw, options }) => {
  const evidence = collectSliderInputBoxes(raw, options), original = rowsOf(evidence);
  for (const mutate of [r => { r.pop(); }, r => { r.push(structuredClone(r[0])); },
    r => { r[0].attribution = 'unresolved'; }, r => { r[0].classification = 'equivalent-representation'; },
    r => { r[0].family = 'button'; }, r => { r[0].astylar = '0px'; }, r => { r[0].reference = '8px'; },
    r => { r[0].reviewEvidence.inputEquivalent = true; }, r => { r[0].reviewEvidence.candidateNode = 'wrong'; },
    r => { r[0].reviewedCases.pop(); }, r => { r[0].occurrences++; }, r => { r[0].states = ['other']; },
    r => { r[0].cases = []; }, r => { r[0].recommendedOwner = 'none'; }, r => { r[0].justification = 'looks right'; }]) {
    const rows = structuredClone(original); mutate(rows);
    assert.ok(validateSliderInputBoxClassifications(evidence, rows, canonical, equivalent).length);
  }
  assert.ok(original.every(r => r.attribution === sliderInputBoxAttribution));
}));

test('slider source binding rejects escaped sources and duplicate captures while retaining rejected owners', () => withCapture(({ raw, root, options, parityPath }) => {
  const persist = r => writeFileSync(path.join(root, parityPath), JSON.stringify(r));
  const outside = path.join(root, 'outside.json'); writeFileSync(outside, '{}');
  const escaped = structuredClone(raw);
  escaped.results[0].inputTrees.astylar = { file: 'outside.json', sha256: hash('{}') };
  persist(escaped); assert.equal(collectSliderInputBoxes(escaped, options).binding.status, 'invalid');
  const duplicated = structuredClone(raw); duplicated.results.push(structuredClone(duplicated.results[0]));
  persist(duplicated); assert.equal(collectSliderInputBoxes(duplicated, options).binding.status, 'invalid');
  const rejected = structuredClone(raw); rejected.results[0].styleInputs[0].astylarAuthored[0].declarations.padding = '0';
  persist(rejected); const evidence = collectSliderInputBoxes(rejected, options);
  assert.equal(evidence.binding.status, 'bound'); assert.equal(evidence.captures.length, 2);
  assert.equal(evidence.captures[0].styleInputs.length, 2);
  assert.equal(evidence.observations.length, 3);
  assert.deepEqual(validateSliderInputBoxes(evidence, options), []);
}));

test('slider source collector reproduces all original 156 audited native owners without discarding values', () => {
  const root = process.cwd(), prior = JSON.parse(readFileSync(path.join(root, 'docs/material-slider-input-boxes.json')));
  const bytes = readFileSync(path.join(root, prior.capture.file)); assert.equal(hash(bytes), prior.capture.sha256);
  const evidence = collectSliderInputBoxes(JSON.parse(bytes), { root, parityPath: prior.capture.file });
  assert.equal(evidence.binding.status, 'bound'); assert.equal(evidence.captures.length, 78);
  assert.equal(evidence.observations.length, 156);
  for (const [index, o] of evidence.observations.entries()) {
    const { case: key, kind, profile, viewport, state, inputTrees, ...proof } = prior.observations[index];
    assert.equal(o.case, key); assert.equal(o.state, state); assert.deepEqual(o.proof, proof);
  }
  const rows = rowsOf(evidence); assert.equal(rows.length, 14);
  assert.equal(rows.reduce((n, r) => n + r.occurrences, 0), 780);
  // Mirror the report's 12-case presentation cap, preserving exhaustive review coverage.
  rows.forEach(r => { r.cases = r.cases.slice(0, 12); });
  assert.deepEqual(validateSliderInputBoxClassifications(evidence, rows, canonical, equivalent), []);
  assert.deepEqual(validateSliderInputBoxes(evidence, { root }), []);
});
