import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { collectSliderBorderDefaults, classifySliderBorderDefault, sliderBorderDefaultAttribution,
  validateSliderBorderDefaults, validateSliderBorderDefaultClassifications } from './slider-border-default-source-binding.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const prior = JSON.parse(readFileSync('docs/material-slider-border-defaults.json'));
const bytes = readFileSync(prior.capture.file);
assert.equal(hash(bytes), prior.capture.sha256);
assert.equal(hash(readFileSync(prior.publicProof.file)), prior.publicProof.sha256);
const raw = JSON.parse(bytes);
// This callback tests source binding, not the production report's normalization.
// Production canonicalization and complete-row conservation require integration.
const canonical = style => {
  const result = { ...style };
  for (const [shorthand, suffixes] of [
    ['borderWidth', ['TopWidth', 'RightWidth', 'BottomWidth', 'LeftWidth']],
    ['borderStyle', ['TopStyle', 'RightStyle', 'BottomStyle', 'LeftStyle']],
    ['borderColor', ['TopColor', 'RightColor', 'BottomColor', 'LeftColor']],
    ['borderRadius', ['TopLeftRadius', 'TopRightRadius', 'BottomRightRadius', 'BottomLeftRadius']],
  ]) if (result[shorthand] !== undefined) {
    assert.ok(!result[shorthand].includes(' '), 'test callback only expands uniform borders');
    for (const suffix of suffixes) result[`border${suffix}`] ??= result[shorthand];
    delete result[shorthand];
  }
  return result;
};
const equivalent = (_property, r, a) => r === a;

function rowsOf(evidence) {
  const grouped = new Map();
  for (const o of evidence.observations) for (const { property } of o.proof.properties) {
    const reference = canonical(o.input.reference)[property], astylar = canonical(o.input.astylar)[property];
    const c = classifySliderBorderDefault(o.input, property, reference, astylar, o, canonical);
    assert.ok(c);
    const key = JSON.stringify([o.element, property, reference, astylar]);
    if (!grouped.has(key)) grouped.set(key, { family: 'slider', element: o.element, property, reference, astylar,
      ...c, recommendedOwner: c.owner, occurrences: 0, cases: [], reviewedCases: [], states: [] });
    const row = grouped.get(key); row.occurrences++; row.reviewedCases.push(o.case);
    if (row.cases.length < 12) row.cases.push(o.case);
    if (!row.states.includes(o.state)) row.states.push(o.state);
  }
  return [...grouped.values()];
}

function withCapture(run) {
  const root = mkdtempSync(path.join(tmpdir(), 'astylar-border-binding-'));
  const folder = 'artifacts/material-parity/proof';
  mkdirSync(path.join(root, folder), { recursive: true });
  const save = (name, object) => {
    const file = `${folder}/${name}.json`, bytes = JSON.stringify(object);
    writeFileSync(path.join(root, file), bytes); return { file, sha256: hash(bytes) };
  };
  try {
    const first = structuredClone(raw.results.find(entry => entry.family === 'slider'));
    for (const side of ['reference', 'astylar']) first.inputTrees[side] = save(side,
      JSON.parse(readFileSync(first.inputTrees[side].file)));
    const report = { results: [first], interactions: Array.from({ length: 13 }, (_, index) =>
      ({ ...structuredClone(first), state: `synthetic-binding-state-${index}` })) };
    const parityPath = save('report', report).file;
    run({ root, report, options: { root, parityPath }, save,
      persist: value => writeFileSync(path.join(root, parityPath), JSON.stringify(value)) });
  } finally {
    // root is the exact directory returned by mkdtempSync, never a parent/root.
    rmSync(root, { recursive: true, force: true });
  }
}

test('slider border binding preserves twelve historical differences and adds four captured colors', () => {
  const options = { root: process.cwd(), parityPath: prior.capture.file };
  const evidence = collectSliderBorderDefaults(raw, options);
  assert.equal(evidence.binding.status, 'bound'); assert.equal(evidence.captures.length, 78);
  assert.equal(evidence.observations.length, 156);
  for (const [index, o] of evidence.observations.entries()) {
    const { case: key, state, inputTrees, ...proof } = prior.observations[index];
    assert.equal(o.case, key); assert.equal(o.state, state);
    const historical = structuredClone(o.proof);
    historical.properties = historical.properties.filter(p => !p.property.endsWith('Color'));
    assert.deepEqual(historical, proof);
  }
  assert.deepEqual(validateSliderBorderDefaults(evidence, options), []);
  const rows = rowsOf(evidence);
  assert.equal(rows.length, 40); assert.equal(rows.reduce((n, row) => n + row.occurrences, 0), 2496);
  assert.ok(rows.every(row => row.reviewedCases.length === row.occurrences && row.cases.length === Math.min(12, row.occurrences)));
  assert.deepEqual(validateSliderBorderDefaultClassifications(evidence, rows, canonical, equivalent), []);
  assert.ok(rows.every(row => row.attribution === sliderBorderDefaultAttribution &&
    row.reviewEvidence.borderAuthoringEquivalent && !row.reviewEvidence.inputEquivalent &&
    !row.reviewEvidence.usedBoxParityVerified && !row.reviewEvidence.finalRasterVerified));
});

test('slider border binding rejects caller subsets changed source files and fabricated omissions', () => withCapture(({ report, options, root }) => {
  const evidence = collectSliderBorderDefaults(report, options), snapshot = structuredClone(report);
  assert.equal(evidence.observations.length, 28); assert.deepEqual(report, snapshot);
  assert.equal(collectSliderBorderDefaults(report).binding.status, 'unbound');
  for (const mutate of [r => { r.results = []; }, r => { r.interactions.pop(); },
    r => { r.results[0].styleInputs.pop(); },
    r => { r.results[0].styleInputs.find(i => i.id === 'slider-start').astylarAuthored = []; }]) {
    const changed = structuredClone(report); mutate(changed);
    assert.equal(collectSliderBorderDefaults(changed, options).binding.status, 'invalid');
  }
  for (const mutate of [e => { e.captures = []; }, e => { e.observations.pop(); },
    e => { e.observations[0].input.astylarAuthored = []; },
    e => { e.observations[0].proof.properties.pop(); },
    e => { e.observations[0].proof.inputEquivalent = true; },
    e => { e.observations[0].proof.usedBoxParityVerified = true; },
    e => { e.observations[0].proof.finalRasterVerified = true; },
    e => { e.observations.push(structuredClone(e.observations[0])); }]) {
    const changed = structuredClone(evidence); mutate(changed);
    assert.ok(validateSliderBorderDefaults(changed, options).length);
  }
  const source = path.join(root, report.results[0].inputTrees.astylar.file);
  writeFileSync(source, '{}');
  assert.equal(collectSliderBorderDefaults(report, options).binding.status, 'invalid');
  assert.ok(validateSliderBorderDefaults(evidence, options).length);
}));

test('slider border scalar coverage rejects missing duplicated relabeled or falsely equivalent rows', () => withCapture(({ report, options }) => {
  const evidence = collectSliderBorderDefaults(report, options), original = rowsOf(evidence);
  assert.deepEqual(validateSliderBorderDefaultClassifications(evidence, original, canonical, equivalent), []);
  const observation = evidence.observations[0];
  for (const property of ['width', 'paddingLeft', 'boxSizing', 'appearance'])
    assert.equal(classifySliderBorderDefault(observation.input, property,
      canonical(observation.input.reference)[property], canonical(observation.input.astylar)[property], observation, canonical), undefined);
  assert.equal(classifySliderBorderDefault(observation.input, 'borderTopWidth', '999px', '1px', observation, canonical), undefined);
  for (const mutate of [r => { r.pop(); }, r => { r.push(structuredClone(r[0])); },
    r => { r[0].attribution = 'unresolved'; }, r => { r[0].classification = 'equivalent-representation'; },
    r => { r[0].family = 'button'; }, r => { r[0].astylar = '0px'; }, r => { r[0].reference = '1px'; },
    r => { r[0].reviewEvidence.inputEquivalent = true; }, r => { r[0].reviewEvidence.usedBoxParityVerified = true; },
    r => { r[0].reviewEvidence.candidateNode = 'wrong'; }, r => { r[0].reviewedCases.pop(); },
    r => { r[0].reviewedCases[13] = r[0].reviewedCases[0]; }, r => { r[0].occurrences++; },
    r => { r[0].states = ['other']; }, r => { r[0].cases = []; },
    r => { r[0].recommendedOwner = 'none'; }, r => { r[0].justification = 'looks right'; }]) {
    const rows = structuredClone(original); mutate(rows);
    assert.ok(validateSliderBorderDefaultClassifications(evidence, rows, canonical, equivalent).length);
  }
}));

test('slider border source binding rejects escaped and duplicate captures while retaining rejected owners', () => withCapture(({ report, options, root, persist }) => {
  writeFileSync(path.join(root, 'outside.json'), '{}');
  const escaped = structuredClone(report);
  escaped.results[0].inputTrees.astylar = { file: 'outside.json', sha256: hash('{}') };
  persist(escaped); assert.equal(collectSliderBorderDefaults(escaped, options).binding.status, 'invalid');
  const duplicate = structuredClone(report); duplicate.results.push(structuredClone(duplicate.results[0]));
  persist(duplicate); assert.equal(collectSliderBorderDefaults(duplicate, options).binding.status, 'invalid');
  const rejected = structuredClone(report);
  rejected.results[0].styleInputs.find(i => i.id === 'slider-start').astylarAuthored[0].declarations.borderWidth = '0';
  persist(rejected); const evidence = collectSliderBorderDefaults(rejected, options);
  assert.equal(evidence.binding.status, 'bound'); assert.equal(evidence.captures.length, 14);
  assert.equal(evidence.observations.length, 27);
  assert.deepEqual(validateSliderBorderDefaults(evidence, options), []);
  persist({}); assert.ok(validateSliderBorderDefaults(evidence, options).length);
}));
