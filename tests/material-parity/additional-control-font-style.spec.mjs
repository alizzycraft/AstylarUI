import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { inspectAdditionalControlFontStyle } from '../../scripts/audit-material-additional-control-font-style.mjs';

const file = 'docs/material-additional-control-font-style.json';
const saved = JSON.parse(readFileSync(file));
const original = JSON.parse(readFileSync(saved.originalCapture.file));
const entries = new Map([['static', original.results], ['interaction', original.interactions]].flatMap(([kind, es]) =>
  es.map(e => [`${kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`, e])));
function fixture(f = saved.findings[0]) {
  const entry = entries.get(f.case);
  return { family: entry.family, input: structuredClone(entry.styleInputs.find(i => i.id === f.element)),
    reference: JSON.parse(readFileSync(f.inputTrees.reference.file)),
    candidate: JSON.parse(readFileSync(f.inputTrees.astylar.file)) };
}
const inspect = f => inspectAdditionalControlFontStyle(f.family, f.input, f.reference, f.candidate);
const a = f => f.candidate.nodes.find(n => n.authored?.id === f.input.id);
const r = f => f.reference.nodes.find(n => (n.attributes?.['data-parity-id'] ?? n.attributes?.id) === f.input.id);

test('all additional control observations retain actual classes, ancestry and normal texture evidence', () => {
  assert.equal(saved.originalCasesScanned, 2311); assert.equal(saved.observations, 168);
  assert.deepEqual(saved.counts, { 'card-open': 52, 'toolbar-action': 52, 'dialog-cancel': 32, 'dialog-save': 32 });
  for (const finding of saved.findings) {
    const f = fixture(finding), before = structuredClone(f), p = inspect(f);
    assert.deepEqual(p, finding.proof); assert.deepEqual(f, before);
    assert.equal(p.referenceReset.declarations['font-style'].value, 'inherit');
    assert.equal(p.observedTextStage.fontStyle, 'normal');
    for (const k of ['inputEquivalent', 'wholeElementInputEquivalent', 'rendererCauseProven',
      'candidateComputedVerified', 'renderingEquivalent', 'nonNormalAncestorBehaviorVerified']) assert.equal(p[k], false);
  }
  assert.equal(saved.history.authorIntentProven, false);
});

test('additional control proof rejects changed identities, reset requests, inherited paths and texture stages', () => {
  const changes = [
    f => { f.family = 'buttons'; }, f => { f.input.id = 'buttons-primary'; },
    f => { f.reference.errors.push('capture'); }, f => { f.candidate.errors.push('capture'); },
    f => { f.candidate.resolvedStyleSource = 'invented'; }, f => { f.candidate.resolvedStyleEvidenceVersion = 1; },
    f => { f.input.astylarResolvedStyleEvidenceVersion = 1; },
    f => { f.reference.nodes.push(structuredClone(r(f))); }, f => { f.candidate.nodes.push(structuredClone(a(f))); },
    f => { r(f).type = 'div'; }, f => { a(f).authored.type = 'div'; },
    f => { a(f).authored.class = 'material-button'; },
    f => { f.input.reference.color = 'changed'; }, f => { f.input.reference.fontStyle = 'italic'; },
    f => { f.input.astylar.fontStyle = 'normal'; }, f => { a(f).normalResolvedStyle.fontStyle = 'normal'; },
    f => { r(f).inline['font-style'] = { value: 'normal', important: false }; },
    f => { r(f).attributes.style = 'font-style: normal'; },
    f => { f.reference.rules.find(x => x.cssText === 'font: inherit;').active = false; },
    f => { f.reference.rules.find(x => x.cssText === 'font: inherit;').conditions.push('unreviewed'); },
    f => { f.reference.rules.find(x => x.cssText === 'font: inherit;').declarations['font-style'].value = 'normal'; },
    f => { f.candidate.rules.find(x => x.selector === 'button, input, select').fontStyle = 'inherit'; },
    f => { f.candidate.rules.push({ selector: '#page', fontStyle: 'italic' }); },
    f => { f.candidate.rules.push({ selector: ':is(button)', all: 'unset' }); },
    f => { a(f).authored.style = { fontStyle: 'inherit' }; },
    f => { a(f).parent = a(f).key; },
    f => { f.candidate.nodes.find(n => n.authored?.id === 'page').resolvedStyle.fontStyle = 'italic'; },
    f => { a(f).paintedControlText.source = 'core-text-registry'; },
    f => { a(f).paintedControlText.text = 'changed'; }, f => { a(f).paintedControlText.style.fontStyle = 'italic'; },
    f => { a(f).retainedText = { source: 'unexpected' }; },
  ];
  for (const [i, change] of changes.entries()) {
    const f = fixture(), before = JSON.stringify(f); change(f);
    assert.notEqual(JSON.stringify(f), before, `mutation ${i} must change evidence`);
    assert.throws(() => inspect(f), `mutation ${i}`);
  }
  assert.equal(changes.length, 31);
});

test('additional control source and history proof reproduces with writes prohibited', () => {
  const before = readFileSync(file);
  const guard = `import fs from 'node:fs';import{syncBuiltinESMExports}from'node:module';
    fs.writeFileSync=()=>{throw Error('CHECK_MODE_ATTEMPTED_WRITE')};syncBuiltinESMExports();`;
  const result = JSON.parse(execFileSync(process.execPath, ['--import',
    'data:text/javascript;base64,' + Buffer.from(guard).toString('base64'),
    'scripts/audit-material-additional-control-font-style.mjs', '--check'], { encoding: 'utf8', maxBuffer: 1024 * 1024 }));
  assert.equal(result.observations, 168); assert.equal(result.canonicalAttributionChanged, false);
  assert.deepEqual(readFileSync(file), before);
});
