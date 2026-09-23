import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { collectSliderInputBoxes, classifySliderInputBox, sliderInputBoxAttribution,
  validateSliderInputBoxes, validateSliderInputBoxClassifications } from './slider-input-box-source-binding.mjs';

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

export { hash, canonical, equivalent, withCapture, rowsOf };
