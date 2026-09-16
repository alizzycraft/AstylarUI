import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { inspectButtonHostRequests } from './button-host-request-evidence.mjs';
import { selectedButtonInputs } from './button-pill-radius-evidence.mjs';

const hash = b => createHash('sha256').update(b).digest('hex');
const durable = JSON.parse(readFileSync('docs/material-button-host-request-audit.json'));
const bytes = readFileSync(durable.capture.file); assert.equal(hash(bytes), durable.capture.sha256);
const raw = JSON.parse(bytes), entries = [...raw.results.map(e => ({ ...e, kind: 'static' })),
  ...raw.interactions.map(e => ({ ...e, kind: 'interaction' }))];
const keyOf = e => `${e.kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`;
const read = d => { const b = readFileSync(d.file); assert.equal(hash(b), d.sha256); return JSON.parse(b); };

test('button host requests retain all original owners and distinguish omissions from absolute requests', () => {
  assert.deepEqual([entries.length, durable.cases, durable.owners, durable.families, durable.groups.length,
    durable.propertyOccurrences], [2311, 480, 600, 7, 27, 1800]);
  assert.equal(durable.classification, 'application-plugin-authoring-defect');
  for (const flag of ['canonicalAttributionChanged', 'inputEquivalent', 'candidateUsedLayoutVerified',
    'originalRasterCauseProven', 'structuralEquivalenceVerified', 'renderingEquivalent']) assert.equal(durable[flag], false);
  assert.deepEqual(durable.sourceFingerprints.map(s => s.file), [
    'scripts/audit-material-button-host-requests.mjs', 'tests/material-parity/button-host-request-evidence.mjs',
    'tests/material-parity/button-host-request-evidence.spec.mjs', 'tests/material-parity/button-flex-input-evidence.mjs',
    'tests/material-parity/button-pill-radius-evidence.mjs', 'tests/material-parity/root-initial-style-evidence.mjs',
    'tests/material-parity/border-initial-input-evidence.mjs',
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
      viewport: e.viewport, state: e.state ?? 'static', inputTrees: e.inputTrees, proof: inspectButtonHostRequests(input, r, a) });
  }
  assert.deepEqual(observations, durable.observations);
  const expected = observations.flatMap(o => o.proof.properties.map(p => JSON.stringify([o.case, o.family,
    o.proof.element, p.property, p.reference, p.candidateLocal, p.candidateOwnStageAbsent, p.firstDivergence])));
  const grouped = durable.groups.flatMap(g => g.cases.map(c => JSON.stringify([c, g.family, g.element,
    g.property, g.reference, g.candidateLocal, g.candidateOwnStageAbsent, g.firstDivergence])));
  assert.deepEqual(expected.sort(), grouped.sort()); assert.equal(new Set(grouped).size, 1800);
  const properties = observations.flatMap(o => o.proof.properties);
  assert.equal(properties.filter(p => p.candidateLocal === 'absolute').length, 52);
  assert.equal(properties.filter(p => p.candidateOwnStageAbsent && p.candidateLocal === null).length, 1748);
  const source = 'examples/material-showcase/src/app/astylar.component.ts';
  assert.equal(durable.history.introducedBy, '2f440115740ff76fa9e55b3f4a11568207b2af5a');
  const initial = execFileSync('git', ['show', `${durable.history.introducedBy}:${source}`]).toString();
  for (const rule of durable.history.rules) for (const text of [initial, readFileSync(source, 'utf8')]) {
    const lines = text.split(/\r?\n/).filter(l => l.includes(rule.selector)).map(l => l.trim());
    assert.deepEqual(lines, [rule.initialAndCurrentRule]);
  }
});

test('button host request proof rejects competing requests false defaults and source loss', () => {
  const e = entries.find(e => e.family === 'button' && e.profile === 'light');
  const input = selectedButtonInputs(e)[0], reference = read(e.inputTrees.reference), candidate = read(e.inputTrees.astylar);
  const id = input.id;
  const mutations = [
    v => { v.input.id = 'foreign'; },
    v => { v.reference.rules.find(r => r.selector === '.mdc-button').declarations['min-width'].value = '0px'; },
    v => { v.reference.rules.find(r => r.selector === '.mdc-button').declarations['vertical-align'].value = 'baseline'; },
    v => { v.reference.rules.find(r => r.selector === '.mdc-button').declarations.position.value = 'static'; },
    v => { v.input.reference.minWidth = '0px'; },
    v => { v.input.astylarNormalResolvedStyle.position = 'static'; },
    v => { v.candidate.resolvedStyleSource = 'paint-guess'; },
    v => { v.candidate.rules.push({ selector: '#' + id, minWidth: '64px' }); },
    v => { v.candidate.rules.push({ selector: '[unreviewed]', minInlineSize: '64px' }); },
    v => { v.candidate.rules.push({ selector: '.material-button:disabled', verticalAlign: 'middle' }); },
    v => { v.candidate.nodes.find(n => n.authored?.id === id).authored.style = { position: 'relative' }; },
    v => { v.candidate.nodes.find(n => n.authored?.id === id).authored.value = 'Different text'; },
    v => { v.input.referenceAuthored.find(r => r.selector === '.mdc-button').declarations.position.important = true; },
  ];
  for (const [index, mutate] of mutations.entries()) {
    const v = structuredClone({ input, reference, candidate }); mutate(v);
    assert.throws(() => inspectButtonHostRequests(v.input, v.reference, v.candidate), undefined, `negative control ${index}`);
  }
  const core = entries.find(e => e.family === 'core' && e.profile === 'light');
  const ci = selectedButtonInputs(core)[0], cr = read(core.inputTrees.reference), ca = read(core.inputTrees.astylar);
  assert.ok(inspectButtonHostRequests(ci, cr, ca));
  ca.rules.find(r => r.selector === '#core-primary').position = 'relative';
  assert.throws(() => inspectButtonHostRequests(ci, cr, ca));
  const unrelated = structuredClone(candidate);
  unrelated.rules.push({ selector: '#different-owner', minWidth: '64px', position: 'absolute', verticalAlign: 'middle' });
  assert.deepEqual(inspectButtonHostRequests(input, reference, unrelated), inspectButtonHostRequests(input, reference, candidate));
});
