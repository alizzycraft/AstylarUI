import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const digest = x => createHash('sha256').update(JSON.stringify(x)).digest('hex');
const file = 'docs/material-button-paint-all-states.json';

test('all-state button census retains inactive controls, complete states and original hover/held proofs', () => {
  const r = JSON.parse(readFileSync(file)), original = JSON.parse(readFileSync(r.capture.file));
  const expectedCases = [['static', original.results], ['interaction', original.interactions]].flatMap(([kind, es]) =>
    es.map(e => `${kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`));
  assert.equal(r.casesScanned, 2311); assert.equal(r.scannedCaseOrderSha256, digest(expectedCases));
  assert.equal(r.observations, 600); assert.equal(r.findings.length, 600);
  assert.equal(r.activeLayerObservations, 235); assert.equal(r.inactiveLayerObservations, 365);
  assert.equal(new Set(r.findings.map(f => JSON.stringify([f.case, f.element]))).size, 600);
  const known = new Set(expectedCases);
  for (const f of r.findings) {
    assert.ok(known.has(f.case)); const p = r.patterns[f.pattern]; assert.equal(p.sha256, digest(p.proof));
    assert.equal(p.proof.element, f.element); assert.equal(p.proof.candidate.descendantCount, 0);
    for (const flag of ['inputEquivalent', 'renderingEquivalent', 'rendererCauseProven']) assert.equal(p.proof[flag], false);
    assert.ok(['0', '0.08', '0.12'].includes(p.proof.reference.pseudo.opacity));
    assert.equal(p.proof.classification === 'application-plugin-authoring-defect', Number(p.proof.reference.pseudo.opacity) > 0);
  }
  const old = JSON.parse(readFileSync(r.priorSurvey.file));
  const subset = r.findings.filter(f => f.case.startsWith('interaction:') && ['hover', 'held'].includes(f.state)).map(f =>
    ({ case: `${f.family}/${f.profile}/${f.viewport.id}/${f.state}`, family: f.family, profile: f.profile,
      viewport: f.viewport, state: f.state, inputTrees: f.inputTrees, ...r.patterns[f.pattern].proof }));
  assert.deepEqual(subset, old.observations); assert.equal(subset.length, 146);
  for (const state of ['static', 'activate', 'open']) assert.ok(r.findings.some(f => f.state === state));
  assert.equal(r.canonicalAttributionChanged, false); assert.equal(r.inputEquivalent, false);
});

test('all-state button collector freshly replays every source tree with writes prohibited', () => {
  const guard = `import fs from 'node:fs';import{syncBuiltinESMExports}from'node:module';
    fs.writeFileSync=()=>{throw Error('CHECK_MODE_ATTEMPTED_WRITE')};syncBuiltinESMExports();`;
  const result = JSON.parse(execFileSync(process.execPath, ['--max-old-space-size=1536', '--import',
    'data:text/javascript;base64,' + Buffer.from(guard).toString('base64'),
    'scripts/audit-material-button-paint-all-states.mjs', '--check'], { encoding: 'utf8', maxBuffer: 1024 * 1024 }));
  assert.deepEqual({ cases: result.cases, observations: result.observations, active: result.active,
    inactive: result.inactive, preserved: result.preserved },
  { cases: 2311, observations: 600, active: 235, inactive: 365, preserved: 146 });
});
