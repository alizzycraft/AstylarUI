import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { inspectRootFlowHeightOverrides } from './root-flow-height-override-evidence.mjs';

const hash = b => createHash('sha256').update(b).digest('hex');
const durable = JSON.parse(readFileSync('docs/material-root-flow-height-overrides.json'));
const bytes = readFileSync(durable.capture.file); assert.equal(hash(bytes), durable.capture.sha256);
const raw = JSON.parse(bytes);
const entries = [['static', raw.results], ['interaction', raw.interactions]].flatMap(([kind, rows]) =>
  rows.filter(e => ['button', 'toolbar', 'paginator'].includes(e.family)).map(e => ({ ...e, kind })));
const read = d => { const b = readFileSync(d.file); assert.equal(hash(b), d.sha256); return JSON.parse(b); };

test('repeated root selector proof preserves all 164 affected-family cases and height rules', () => {
  assert.equal(durable.cases, 164); assert.equal(durable.observations.length, 164);
  assert.equal(durable.repeatedRootCases, 138); assert.equal(durable.singleRootControls, 26);
  assert.equal(durable.unresolvedPropertyObservationsReviewed, 414);
  assert.equal(durable.canonicalAttributionChanged, false);
  for (const flag of ['inputEquivalent', 'heightBehaviorVerified', 'originalRasterCauseProven', 'renderingEquivalent'])
    assert.equal(durable[flag], false);
  assert.deepEqual(durable.sourceFingerprints.map(s => s.file), [
    'scripts/audit-material-root-flow-height-overrides.mjs', 'tests/material-parity/root-flow-height-override-evidence.mjs',
    'tests/material-parity/root-flow-height-override-evidence.spec.mjs', 'tests/material-parity/root-initial-style-evidence.mjs',
    'tests/material-parity/border-initial-input-evidence.mjs', 'examples/material-showcase/src/app/astylar.component.ts',
    'examples/material-showcase/src/app/reference.component.ts']);
  for (const s of durable.sourceFingerprints) assert.equal(hash(readFileSync(s.file, 'utf8').replaceAll('\r\n', '\n')), s.sha256);
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i], o = durable.observations[i];
    assert.equal(o.case, `${e.kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`);
    assert.equal(o.family, e.family); assert.equal(o.profile, e.profile); assert.deepEqual(o.viewport, e.viewport);
    assert.equal(o.state, e.state ?? 'static'); assert.deepEqual(o.inputTrees, e.inputTrees);
    assert.deepEqual(o.proof, inspectRootFlowHeightOverrides(e, read(e.inputTrees.reference), read(e.inputTrees.astylar)));
    assert.equal(o.proof.classification, 'application-plugin-authoring-defect');
    for (const flag of ['inputEquivalent', 'heightBehaviorVerified', 'originalRasterCauseProven', 'renderingEquivalent'])
      assert.equal(o.proof[flag], false);
  }
  assert.equal(durable.observations.filter(o => o.proof.heightOverrides.length).length, 138);
  assert.equal(new Set(durable.observations.map(o => o.case)).size, 164);
});

test('repeated root selector proof rejects formatting overrides and ambiguous owners', () => {
  const e = entries.find(e => e.family === 'button'), r = read(e.inputTrees.reference), a = read(e.inputTrees.astylar);
  const id = 'button-root';
  const mutations = [
    v => { v.a.rules.find(rule => rule.selector === '#' + id && rule.mediaMaxWidth).gap = '8px'; },
    v => { v.a.rules.find(rule => rule.selector === '#' + id && rule.mediaMaxWidth).all = 'initial'; },
    v => { v.a.rules.find(rule => rule.selector === '#' + id && rule.mediaMaxWidth).flexDirection = 'row'; },
    v => { v.a.rules.find(rule => rule.selector === '#' + id && rule.mediaMaxWidth).padding = '10px'; },
    v => { v.a.rules.find(rule => rule.selector === '#' + id && rule.mediaMaxWidth).mediaMaxWidth = '600px'; },
    v => { v.a.rules.push({ selector: '#' + id + ':hover', gap: '8px' }); },
    v => { v.a.rules.push({ selector: '*', flexFlow: 'row wrap' }); },
    v => { v.a.nodes.push(structuredClone(v.a.nodes.find(n => n.authored?.id === id))); },
    v => { v.e.styleInputs.find(i => i.id === id).astylarNormalResolvedStyle.gap = '8px'; },
    v => { v.r.rules.find(rule => rule.selector.startsWith('.demo')).declarations.gap = { value: 'normal', important: false }; },
    v => { v.a.nodes.find(n => n.authored?.id === id).authored.style = { gap: '16px' }; },
    v => { v.e.styleInputs.find(i => i.id === id).astylarAuthored.pop(); },
    v => { v.e.styleInputs.find(i => i.id === id).reference.fontSize = '999px'; },
    v => { v.a.resolvedStyleSource = 'invented'; },
  ];
  assert.ok(inspectRootFlowHeightOverrides(e, r, a));
  for (const [i, mutate] of mutations.entries()) {
    const copy = structuredClone({ e, r, a }); mutate(copy);
    assert.throws(() => inspectRootFlowHeightOverrides(copy.e, copy.r, copy.a), undefined, `mutation ${i}`);
  }
});
