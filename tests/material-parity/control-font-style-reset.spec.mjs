import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { inspectControlFontStyleReset } from '../../scripts/audit-material-control-font-style-reset.mjs';
import { materialAuditHarnessPlan } from '../../scripts/run-material-audit-harness.mjs';

const file = 'docs/material-control-font-style-reset.json';
const saved = JSON.parse(readFileSync(file));
const original = JSON.parse(readFileSync(saved.originalCapture.file));
const entries = new Map([['static', original.results], ['interaction', original.interactions]].flatMap(([kind, es]) =>
  es.map(e => [`${kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`, e])));
function fixture(f = saved.findings[0]) {
  const entry = entries.get(f.case);
  return { input: structuredClone(entry.styleInputs.find(i => i.id === f.element)),
    reference: JSON.parse(readFileSync(f.inputTrees.reference.file)),
    candidate: JSON.parse(readFileSync(f.inputTrees.astylar.file)) };
}
const inspect = f => inspectControlFontStyleReset(f.input, f.reference, f.candidate);
const candidateOwner = f => f.candidate.nodes.find(n => n.authored?.id === f.input.id);
const referenceOwner = f => f.reference.nodes.find(n => (n.attributes?.['data-parity-id'] ?? n.attributes?.id) === f.input.id);

test('every original button and range observation replays with distinct typography-stage obligations', () => {
  assert.equal(saved.originalCasesScanned, 2311); assert.equal(saved.observations, 756);
  assert.deepEqual(saved.counts, { buttonTexture: 600, rangeWithoutTextOwner: 156 });
  for (const f of saved.findings) {
    const value = fixture(f), before = structuredClone(value), proof = inspect(value);
    assert.deepEqual(proof, f.proof); assert.deepEqual(value, before);
    for (const k of ['inputEquivalent', 'wholeElementInputEquivalent', 'rendererCauseProven',
      'candidateComputedVerified', 'renderingEquivalent', 'nonNormalAncestorBehaviorVerified']) assert.equal(proof[k], false);
  }
  assert.equal(saved.history.authorIntentProven, false);
});

test('font-style reset proof rejects changed controls, declarations, scalar owners and paint-stage evidence', () => {
  const mutations = [
    f => { f.reference.errors.push('capture-error'); },
    f => { f.candidate.errors.push('capture-error'); },
    f => { f.candidate.resolvedStyleEvidenceVersion = 1; },
    f => { f.input.astylarResolvedStyleEvidenceVersion = 1; },
    f => { f.candidate.resolvedStyleSource = 'synthetic'; },
    f => { f.reference.nodes.push(structuredClone(referenceOwner(f))); },
    f => { f.candidate.nodes.push(structuredClone(candidateOwner(f))); },
    f => { referenceOwner(f).type = 'span'; },
    f => { candidateOwner(f).authored.type = 'span'; },
    f => { candidateOwner(f).authored.class = 'different'; },
    f => { f.input.referenceStructure.type = 'span'; },
    f => { f.input.astylarStructure.type = 'span'; },
    f => { f.input.reference.color = 'changed'; },
    f => { f.input.reference.fontStyle = 'italic'; },
    f => { f.input.astylar.fontStyle = 'normal'; },
    f => { candidateOwner(f).normalResolvedStyle.fontStyle = 'normal'; },
    f => { referenceOwner(f).inline['font-style'] = { value: 'italic', important: false }; },
    f => { referenceOwner(f).attributes.style = 'font-style: italic'; },
    f => { const r = f.reference.rules.find(r => r.cssText === 'font: inherit;'); r.cssText = 'font: normal'; },
    f => { const r = f.reference.rules.find(r => r.cssText === 'font: inherit;'); r.active = false; },
    f => { const r = f.reference.rules.find(r => r.cssText === 'font: inherit;'); r.conditions.push('unreviewed'); },
    f => { const r = f.reference.rules.find(r => r.cssText === 'font: inherit;'); r.declarations['font-style'].value = 'normal'; },
    f => { const r = f.reference.rules.find(r => r.cssText === 'font: inherit;'); r.declarations['font-style'].important = true; },
    f => { f.input.referenceAuthored.find(r => r.selector === 'button, input, select').declarations['font-style'].value = 'normal'; },
    f => { f.candidate.rules.find(r => r.selector === 'button, input, select').fontStyle = 'inherit'; },
    f => { f.candidate.rules.push({ selector: ':is(button)', fontStyle: 'italic' }); },
    f => { f.candidate.rules.push({ selector: '#page', font: 'inherit' }); },
    f => { f.candidate.rules.push({ selector: '#page', all: 'unset' }); },
    f => { candidateOwner(f).authored.style = { fontStyle: 'inherit' }; },
    f => { candidateOwner(f).authored.attributes = { style: 'font-style: inherit' }; },
    f => { candidateOwner(f).parent = candidateOwner(f).key; },
    f => { f.candidate.nodes.find(n => n.authored?.id === 'page').resolvedStyle.fontStyle = 'italic'; },
    f => { candidateOwner(f).paintedControlText.source = 'core-text-registry'; },
    f => { candidateOwner(f).paintedControlText.text = 'changed'; },
    f => { candidateOwner(f).paintedControlText.style.fontStyle = 'italic'; },
    f => { candidateOwner(f).retainedText = { source: 'unexpected' }; },
  ];
  for (const [i, mutate] of mutations.entries()) {
    const f = fixture(); mutate(f); assert.throws(() => inspect(f), `font-style reset mutation ${i}`);
  }
  assert.equal(mutations.length, 36);
  const f = fixture(saved.findings.find(f => f.family === 'slider'));
  candidateOwner(f).paintedControlText = { source: 'core-control-texture', style: { fontStyle: 'normal' } };
  assert.throws(() => inspect(f), 'range absence cannot be turned into a text comparison');
});

test('control font-style source and historical reset proof regenerate with writes prohibited', () => {
  const files = [file, 'docs/material-input-equivalence-audit.json', 'docs/material-input-equivalence-audit.json.gz',
    'docs/material-input-equivalence-audit.md'];
  const before = files.map(f => readFileSync(f));
  const guard = `import fs from 'node:fs'; import {syncBuiltinESMExports} from 'node:module';
    fs.writeFileSync = () => {throw new Error('CHECK_MODE_ATTEMPTED_WRITE');}; syncBuiltinESMExports();`;
  const receipt = JSON.parse(execFileSync(process.execPath, ['--import',
    'data:text/javascript;base64,' + Buffer.from(guard).toString('base64'),
    'scripts/audit-material-control-font-style-reset.mjs', '--check'], { encoding: 'utf8', maxBuffer: 1024 * 1024 }));
  assert.equal(receipt.observations, 756); assert.equal(receipt.canonicalAttributionChanged, false);
  files.forEach((f, i) => assert.deepEqual(readFileSync(f), before[i]));
  assert.ok(materialAuditHarnessPlan(process.cwd()).files.includes('tests/material-parity/control-font-style-reset.spec.mjs'));
});
