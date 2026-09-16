import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';
import { inspectButtonFixedWidth } from './button-fixed-width-evidence.mjs';
import { selectedButtonInputs } from './button-pill-radius-evidence.mjs';

const hash = b => createHash('sha256').update(b).digest('hex');
const durable = JSON.parse(readFileSync('docs/material-button-fixed-width-audit.json'));
const bytes = readFileSync(durable.capture.file); assert.equal(hash(bytes), durable.capture.sha256);
const raw = JSON.parse(bytes), entries = [...raw.results.map(e => ({ ...e, kind: 'static' })),
  ...raw.interactions.map(e => ({ ...e, kind: 'interaction' }))];
const keyOf = e => `${e.kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`;
const read = d => { const b = readFileSync(d.file); assert.equal(hash(b), d.sha256); return JSON.parse(b); };

test('button fixed widths retain all original authoring differences including the numerically matching core', () => {
  assert.deepEqual([entries.length, durable.captureCases, durable.cases, durable.owners, durable.families, durable.groups.length],
    [2311, 2311, 480, 600, 7, 9]);
  assert.equal(durable.classification, 'application-plugin-authoring-defect');
  for (const flag of ['canonicalAttributionChanged', 'inputEquivalent', 'candidateUsedLayoutVerified',
    'originalRasterCauseProven', 'structuralEquivalenceVerified', 'renderingEquivalent']) assert.equal(durable[flag], false);
  assert.deepEqual(durable.sourceFingerprints.map(s => s.file), [
    'scripts/audit-material-button-fixed-widths.mjs', 'tests/material-parity/button-fixed-width-evidence.mjs',
    'tests/material-parity/button-fixed-width-evidence.spec.mjs', 'tests/material-parity/button-flex-input-evidence.mjs',
    'tests/material-parity/button-pill-radius-evidence.mjs', 'tests/material-parity/root-initial-style-evidence.mjs',
    'tests/material-parity/border-initial-input-evidence.mjs',
    'examples/material-showcase/src/app/reference.component.ts', 'examples/material-showcase/src/app/astylar.component.ts']);
  for (const s of durable.sourceFingerprints) assert.equal(hash(readFileSync(s.file, 'utf8').replaceAll('\r\n', '\n')), s.sha256);
  const observations = [];
  for (const e of entries) {
    const inputs = selectedButtonInputs(e), a = read(e.inputTrees.astylar);
    assert.deepEqual(inputs.map(i => i.id).sort(), a.nodes.filter(n => n.authored?.class?.split(/\s+/)
      .includes('material-button')).map(n => n.authored.id).sort());
    if (!inputs.length) continue;
    const r = read(e.inputTrees.reference);
    for (const input of inputs) observations.push({ case: keyOf(e), family: e.family, profile: e.profile,
      viewport: e.viewport, state: e.state ?? 'static', inputTrees: e.inputTrees, proof: inspectButtonFixedWidth(input, r, a) });
  }
  assert.deepEqual(observations, durable.observations);
  const expected = observations.map(o => JSON.stringify([o.case, o.family, o.proof.element,
    o.proof.referenceAuthoredWidth, o.proof.referenceComputedWidth, o.proof.candidateAuthoredWidth]));
  const grouped = durable.groups.flatMap(g => g.cases.map(c => JSON.stringify([c, g.family, g.element,
    g.referenceAuthoredWidth, g.referenceComputedWidth, g.candidateAuthoredWidth])));
  assert.deepEqual(expected.sort(), grouped.sort()); assert.equal(new Set(grouped).size, 600);
  const core = observations.filter(o => o.proof.element === 'core-primary'); assert.equal(core.length, 52);
  assert.ok(core.every(o => o.proof.referenceAuthoredWidth === '<omitted>' &&
    o.proof.referenceComputedWidth === '212.234px' && o.proof.candidateAuthoredWidth === '212.234375px' && !o.proof.inputEquivalent));
  const source = 'examples/material-showcase/src/app/astylar.component.ts';
  assert.equal(durable.history.introducedBy, '2f440115740ff76fa9e55b3f4a11568207b2af5a');
  for (const text of [readFileSync(source, 'utf8'), execFileSync('git', ['show', `${durable.history.introducedBy}:${source}`]).toString()]) {
    const file = ts.createSourceFile(source, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS), found = [];
    function visit(node) {
      if (ts.isObjectLiteralExpression(node)) {
        const property = name => node.properties.find(p => ts.isPropertyAssignment(p) && p.name.getText(file) === name)?.initializer;
        const selector = property('selector'), width = property('width');
        if (selector && width && durable.history.initialAndCurrentWidthExpressions.some(r => r.selector === selector.getText(file)))
          found.push({ selector: selector.getText(file), widthExpression: width.getText(file) });
      }
      ts.forEachChild(node, visit);
    }
    visit(file); assert.equal(found.length, 9); assert.deepEqual(found, durable.history.initialAndCurrentWidthExpressions);
  }
});

test('button fixed width proof rejects invented authoring changed stages and unreviewed requests', () => {
  const e = entries.find(e => e.family === 'button' && e.profile === 'light');
  const input = selectedButtonInputs(e)[0], reference = read(e.inputTrees.reference), candidate = read(e.inputTrees.astylar);
  const id = input.id;
  const mutations = [
    v => { v.input.id = 'foreign'; },
    v => { v.reference.rules.find(r => r.selector === '.mdc-button').declarations.width = { value: '141px', important: false }; },
    v => { v.input.reference.width = '141px'; },
    v => { v.input.astylarNormalResolvedStyle.width = 'auto'; },
    v => { v.candidate.resolvedStyleSource = 'paint-guess'; },
    v => { v.candidate.rules.push({ selector: '#' + id, width: 'auto' }); },
    v => { v.candidate.rules.push({ selector: '[unreviewed]', inlineSize: '141px' }); },
    v => { v.candidate.rules.push({ selector: '.material-button:hover', width: '141px' }); },
    v => { v.candidate.nodes.find(n => n.authored?.id === id).authored.style = { width: '141px' }; },
    v => { v.candidate.nodes.find(n => n.authored?.id === id).authored.value = 'Different'; },
    v => { v.input.astylarAuthored.find(r => r.selector === '.material-button').declarations.width = 'auto'; },
    v => { v.reference.nodes.find(n => n.attributes?.id === id).attributes.style = 'inline-size:141px'; },
  ];
  for (const [index, mutate] of mutations.entries()) {
    const v = structuredClone({ input, reference, candidate }); mutate(v);
    assert.throws(() => inspectButtonFixedWidth(v.input, v.reference, v.candidate), undefined, `negative control ${index}`);
  }
  const core = entries.find(e => e.family === 'core' && e.profile === 'light');
  const ci = selectedButtonInputs(core)[0], cr = read(core.inputTrees.reference), ca = read(core.inputTrees.astylar);
  assert.ok(inspectButtonFixedWidth(ci, cr, ca));
  ca.rules.find(r => r.selector === '#core-primary').width = '212.234px';
  assert.throws(() => inspectButtonFixedWidth(ci, cr, ca));
  const unrelated = structuredClone(candidate);
  unrelated.rules.push({ selector: '#different-owner', width: '10px' });
  assert.deepEqual(inspectButtonFixedWidth(input, reference, unrelated), inspectButtonFixedWidth(input, reference, candidate));
});
