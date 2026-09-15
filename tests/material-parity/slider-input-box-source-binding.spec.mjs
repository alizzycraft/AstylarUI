import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { collectSliderInputBoxes, classifySliderInputBox, sliderInputBoxAttribution,
  validateSliderInputBoxes, validateSliderInputBoxClassifications } from './slider-input-box-source-binding.mjs';
import { buildMaterialInputAudit, validateMaterialInputAudit } from './input-equivalence-audit.mjs';

const sides = ['Top', 'Right', 'Bottom', 'Left'];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
// A deliberately small normalization callback tests the binding contract. The
// production report's own canonicalization must be supplied at integration.
const canonical = style => {
  const result = { ...style };
  if (result.padding !== undefined) {
    for (const side of sides) if (result[`padding${side}`] === undefined) {
      assert.ok(!result.padding.includes(' '), 'test callback only expands uniform padding');
      result[`padding${side}`] = result.padding;
    }
    delete result.padding;
  }
  return result;
};
const equivalent = (_property, r, a) => r === a;

function withCapture(run, repository = false) {
  const temporary = mkdtempSync(repository
    ? path.join(process.cwd(), 'artifacts/material-parity/slider-box-binding-')
    : path.join(tmpdir(), 'astylar-slider-binding-'));
  const root = repository ? process.cwd() : temporary;
  try {
    const folder = repository ? path.relative(root, temporary).replaceAll('\\', '/') : 'artifacts/material-parity/proof';
    mkdirSync(path.join(root, folder), { recursive: true });
    const save = (name, object) => {
      const file = `${folder}/${name}.json`, bytes = JSON.stringify(object);
      writeFileSync(path.join(root, file), bytes); return { file, sha256: hash(bytes) };
    };
    const raw = { results: [], interactions: [] };
    for (const state of ['static', 'held']) {
      const rStyle = { width: '200px', boxSizing: 'content-box', ...Object.fromEntries(sides.map(side =>
        [`padding${side}`, state === 'held' && ['Left', 'Right'].includes(side) ? '16px' : '0px'])) };
      const aStyle = { padding: '8px', width: '50%', height: '44px', opacity: '0' };
      const r = { schemaVersion: 1, errors: [], nodes: [], styles: [rStyle], rules: [{ selector: '.mdc-slider__input',
        declarations: { 'box-sizing': { value: 'content-box', important: false } } }] };
      const a = { schemaVersion: 1, errors: [], nodes: [], resolvedStyleEvidenceVersion: 2,
        resolvedStyleSource: 'core-style-inspection', resolvedStyleRevision: 1 };
      const entry = { family: 'slider', profile: 'light', viewport: { id: 'desktop' }, styleInputs: [],
        ...(state !== 'static' ? { state } : {}) };
      for (const id of ['slider-start', 'slider-primary']) {
        r.nodes.push({ key: id, parent: 'ref-parent', type: 'input', attributes: { id, type: 'range', class: 'mdc-slider__input' },
          style: 0, rules: [0], pseudoElements: [], inline: Object.fromEntries(sides.map(side => [`padding-${side.toLowerCase()}`,
            { value: rStyle[`padding${side}`], important: false }])) });
        a.nodes.push({ key: id, parent: 'ast-parent', authored: { id, type: 'input', inputType: 'range', class: 'range-layer' },
          resolvedStyle: aStyle, normalResolvedStyle: aStyle, interactionResolvedStyle: aStyle });
        entry.styleInputs.push({ id, reference: rStyle, astylar: aStyle, astylarNormalResolvedStyle: aStyle,
          astylarInteractionResolvedStyle: aStyle, astylarResolvedStyleEvidenceVersion: 2,
          referenceStructure: { schemaVersion: 2, type: 'input' }, astylarStructure: { schemaVersion: 2, type: 'input' },
          astylarAuthored: [{ selector: '.range-layer', declarations: { width: '50%' } }] });
      }
      entry.inputTrees = { reference: save(`${state}-reference`, r), astylar: save(`${state}-astylar`, a) };
      raw[state === 'static' ? 'results' : 'interactions'].push(entry);
    }
    const parityPath = save('report', raw).file, options = { root, parityPath };
    run({ raw, root, options, parityPath, save });
  } finally { rmSync(temporary, { recursive: true, force: true }); }
}

function rowsOf(evidence) {
  const groups = new Map();
  for (const o of evidence.observations) for (const { property } of o.proof.properties) {
    const reference = canonical(o.input.reference)[property], astylar = canonical(o.input.astylar)[property];
    const c = classifySliderInputBox(o.input, property, reference, astylar, o, canonical);
    assert.ok(c);
    const key = JSON.stringify([o.element, property, reference, astylar]);
    if (!groups.has(key)) groups.set(key, { family: 'slider', element: o.element, property, reference, astylar,
      ...c, recommendedOwner: c.owner, occurrences: 0, cases: [], reviewedCases: [], states: [] });
    const row = groups.get(key); row.occurrences++; row.cases.push(o.case); row.reviewedCases.push(o.case);
    if (!row.states.includes(o.state)) row.states.push(o.state);
  }
  return [...groups.values()];
}

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

test('slider box canonical integration uses production normalization without changing values or other rows', () => withCapture(({ raw, root, options }) => {
  const before = structuredClone(raw), unbound = buildMaterialInputAudit(raw, { root });
  const report = buildMaterialInputAudit(raw, options);
  const rows = report.discrepancies.filter(r => r.attribution === sliderInputBoxAttribution);
  assert.equal(rows.length, 14); assert.equal(rows.reduce((n, r) => n + r.occurrences, 0), 20);
  assert.ok(rows.some(r => r.property === 'paddingLeft' && r.reference === '0' && r.astylar === '8px'));
  assert.ok(rows.some(r => r.property === 'paddingLeft' && r.reference === '16px' && r.astylar === '8px'));
  assert.ok(rows.some(r => r.property === 'boxSizing' && r.reference === 'content-box' && r.astylar === undefined));
  assert.deepEqual(raw, before);
  const projection = r => [r.family, r.element, r.property, r.reference, r.astylar, r.occurrences, r.cases, r.states];
  assert.deepEqual(report.discrepancies.map(projection), unbound.discrepancies.map(projection));
  const keys = new Set(rows.map(r => JSON.stringify(projection(r))));
  assert.deepEqual(report.discrepancies.filter(r => !keys.has(JSON.stringify(projection(r)))),
    unbound.discrepancies.filter(r => !keys.has(JSON.stringify(projection(r)))));
  assert.ok(!validateMaterialInputAudit(report, { root, requireComplete: false }).some(e => e.includes('slider box')));
}, true));

test('slider box canonical validation rejects missing binding changed rows and false equivalence', () => withCapture(({ raw, root, options }) => {
  const original = buildMaterialInputAudit(raw, options);
  for (const mutate of [
    (r, d) => { delete r.sliderInputBoxes; },
    (r, d) => { r.sliderInputBoxes.captures = []; r.sliderInputBoxes.observations = []; },
    (r, d) => { r.discrepancies = r.discrepancies.filter(row => row !== d); },
    (r, d) => { d.attribution = 'unresolved'; },
    (r, d) => { d.classification = 'equivalent-representation'; },
    (r, d) => { d.reference = '8px'; },
    (r, d) => { d.reviewEvidence.inputEquivalent = true; },
    (r, d) => { r.discrepancies.push(structuredClone(d)); },
  ]) {
    const r = structuredClone(original); mutate(r, r.discrepancies.find(d => d.attribution === sliderInputBoxAttribution));
    assert.ok(validateMaterialInputAudit(r, { root, requireComplete: false }).some(e => e.includes('slider box')));
  }
}, true));
