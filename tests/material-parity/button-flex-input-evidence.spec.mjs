import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { inspectButtonFlexInput } from './button-flex-input-evidence.mjs';
import { selectedButtonInputs } from './button-pill-radius-evidence.mjs';

const hash = b => createHash('sha256').update(b).digest('hex');
const durable = JSON.parse(readFileSync('docs/material-button-flex-input-audit.json'));
const bytes = readFileSync(durable.capture.file); assert.equal(hash(bytes), durable.capture.sha256);
const raw = JSON.parse(bytes), entries = [...raw.results.map(e => ({ ...e, kind: 'static' })),
  ...raw.interactions.map(e => ({ ...e, kind: 'interaction' }))];
const keyOf = e => `${e.kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`;
const read = d => { const b = readFileSync(d.file); assert.equal(hash(b), d.sha256); return JSON.parse(b); };

test('button formatting survey retains complete original class inventory and every property observation', () => {
  assert.deepEqual([entries.length, durable.cases, durable.owners, durable.families, durable.groups.length,
    durable.propertyOccurrences], [2311, 480, 600, 7, 27, 1800]);
  assert.equal(durable.classification, 'application-plugin-authoring-defect');
  for (const flag of ['canonicalAttributionChanged', 'inputEquivalent', 'candidateUsedLayoutVerified',
    'originalRasterCauseProven', 'renderingEquivalent']) assert.equal(durable[flag], false);
  assert.deepEqual(durable.sourceFingerprints.map(s => s.file), [
    'scripts/audit-material-button-flex-inputs.mjs', 'tests/material-parity/button-flex-input-evidence.mjs',
    'tests/material-parity/button-flex-input-evidence.spec.mjs', 'tests/material-parity/button-pill-radius-evidence.mjs',
    'tests/material-parity/root-initial-style-evidence.mjs', 'tests/material-parity/border-initial-input-evidence.mjs',
    'src/app/config/browser-defaults.ts', 'src/app/services/dom/style-defaults.service.ts',
    'examples/material-showcase/src/app/reference.component.ts', 'examples/material-showcase/src/app/astylar.component.ts']);
  for (const s of durable.sourceFingerprints)
    assert.equal(hash(readFileSync(s.file, 'utf8').replaceAll('\r\n', '\n')), s.sha256);
  const observations = [];
  for (const e of entries) {
    const inputs = selectedButtonInputs(e), a = read(e.inputTrees.astylar);
    assert.deepEqual(inputs.map(i => i.id).sort(), a.nodes.filter(n => n.authored?.class?.split(/\s+/)
      .includes('material-button')).map(n => n.authored.id).sort());
    if (!inputs.length) continue;
    const r = read(e.inputTrees.reference);
    for (const input of inputs) observations.push({ case: keyOf(e), family: e.family, profile: e.profile,
      viewport: e.viewport, state: e.state ?? 'static', inputTrees: e.inputTrees, proof: inspectButtonFlexInput(input, r, a) });
  }
  assert.deepEqual(observations, durable.observations);
  const expected = observations.flatMap(o => o.proof.properties.map(p => JSON.stringify([o.case, o.family,
    o.proof.element, p.property, p.reference, p.candidateLocal])));
  const grouped = durable.groups.flatMap(g => g.cases.map(c => JSON.stringify([c, g.family, g.element,
    g.property, g.reference, g.candidateLocal])));
  assert.deepEqual(expected.sort(), grouped.sort()); assert.equal(new Set(grouped).size, 1800);
});

test('button formatting proof rejects competing declarations, identity loss and changed local stages', () => {
  const e = entries.find(e => e.family === 'button' && e.profile === 'light');
  const input = selectedButtonInputs(e)[0], reference = read(e.inputTrees.reference), candidate = read(e.inputTrees.astylar);
  const id = input.id;
  const mutations = [
    v => { v.input.id = 'foreign'; },
    v => { v.reference.nodes.push(structuredClone(v.reference.nodes.find(n => n.attributes?.id === id))); },
    v => { v.reference.rules.find(r => r.selector === '.mdc-button').declarations.display.value = 'block'; },
    v => { v.reference.rules.find(r => r.selector === '.mdc-button').active = false; },
    v => { v.reference.rules.find(r => r.selector === '.mdc-button').declarations['place-items'] = { value: 'end', important: true }; },
    v => { v.input.reference.alignItems = 'stretch'; },
    v => { v.input.reference.fontSize = '99px'; },
    v => { v.input.astylarNormalResolvedStyle.display = 'inline-flex'; },
    v => { v.candidate.resolvedStyleSource = 'paint-guess'; },
    v => { v.candidate.rules.push({ selector: '#' + id, display: 'inline-flex' }); },
    v => { v.candidate.rules.push({ selector: '[unreviewed]', placeContent: 'center' }); },
    v => { v.candidate.nodes.find(n => n.authored?.id === id).authored.style = { justifyContent: 'center' }; },
    v => { v.candidate.nodes.find(n => n.authored?.id === id).authored.value = 'Different text'; },
    v => { v.reference.nodes.find(n => n.parent === v.reference.nodes.find(n => n.attributes?.id === id).key &&
      n.attributes?.class === 'mdc-button__label').ownText = 'Different text'; },
  ];
  assert.ok(inspectButtonFlexInput(input, reference, candidate));
  for (const [index, mutate] of mutations.entries()) {
    const v = structuredClone({ input, reference, candidate }); mutate(v);
    assert.throws(() => inspectButtonFlexInput(v.input, v.reference, v.candidate), undefined, `negative control ${index}`);
  }
  const unrelated = structuredClone(candidate);
  unrelated.rules.push({ selector: '#different-owner', display: 'inline-flex', alignItems: 'center' });
  assert.deepEqual(inspectButtonFlexInput(input, reference, unrelated), inspectButtonFlexInput(input, reference, candidate));
});
