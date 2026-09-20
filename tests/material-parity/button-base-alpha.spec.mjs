import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { inspectButtonBaseAlpha } from '../../scripts/audit-material-button-base-alpha.mjs';

const source = JSON.parse(readFileSync('docs/material-button-paint-all-states.json'));
const report = JSON.parse(readFileSync('docs/material-button-base-alpha.json'));
function fixture(id) {
  const f = source.findings.find(f => f.element === id);
  return { proof: structuredClone(source.patterns[f.pattern].proof),
    reference: JSON.parse(readFileSync(f.inputTrees.reference.file)) };
}

test('all 120 base observations retain transparent/translucent reference requests and opaque candidate authors', () => {
  assert.equal(report.observations, 120); assert.equal(report.groups.length, 8);
  const selected = source.findings.filter(f => ['button-secondary', 'button-disabled'].includes(f.element));
  assert.deepEqual(report.findings.map(({ proof, ...f }) => f), selected);
  for (const f of report.findings) {
    assert.equal(f.proof.referenceAlpha, f.element === 'button-secondary' ? 0 : .12);
    assert.equal(f.proof.candidateAlpha, 1);
    assert.equal(f.proof.classification, 'application-plugin-authoring-defect');
    assert.equal(f.proof.rendererCauseProven, false);
  }
  assert.equal(report.canonicalAttributionChanged, false);
});

test('base proof rejects altered authoring, alpha, ownership and state-stage evidence', () => {
  const changes = [
    p => { p.element = 'button-primary'; },
    p => { p.classification = 'application-plugin-authoring-defect'; },
    p => { p.inputEquivalent = true; },
    p => { p.reference.pseudo.opacity = '.08'; },
    p => { p.reference.hostOpacity = '.5'; },
    p => { p.candidate.descendantCount = 1; },
    p => { p.candidate.normal.background = '#ffffff'; },
    p => { p.candidate.interaction.opacity = '.5'; },
    p => { p.candidate.effective.background = 'transparent'; },
    p => { p.candidate.authoredRules = []; },
    p => { p.candidate.authored.id = 'other'; },
    (_p, r) => { r.nodes.push(structuredClone(r.nodes.find(n => n.attributes?.id === 'button-disabled'))); },
    (_p, r) => { r.rules.find(r => r.selector.startsWith('.mat-mdc-unelevated-button[disabled],')).declarations['background-color'].value = '#ffffff'; },
  ];
  for (const change of changes) {
    const { proof, reference } = fixture('button-disabled'); change(proof, reference);
    assert.throws(() => inspectButtonBaseAlpha(proof, reference));
  }
  for (const id of ['button-secondary', 'button-disabled']) {
    const { proof, reference } = fixture(id), before = JSON.stringify([proof, reference]);
    inspectButtonBaseAlpha(proof, reference);
    assert.equal(JSON.stringify([proof, reference]), before);
  }
});

test('base review freshly replays complete parent census with writes prohibited', () => {
  const guard = `import fs from 'node:fs';import{syncBuiltinESMExports}from'node:module';
    fs.writeFileSync=()=>{throw Error('CHECK_MODE_ATTEMPTED_WRITE')};syncBuiltinESMExports();`;
  const r = JSON.parse(execFileSync(process.execPath, ['--max-old-space-size=1536', '--import',
    'data:text/javascript;base64,' + Buffer.from(guard).toString('base64'),
    'scripts/audit-material-button-base-alpha.mjs', '--check'], { encoding: 'utf8', maxBuffer: 1024 * 1024 }));
  assert.equal(r.groups, 8); assert.equal(r.observations, 120);
});
