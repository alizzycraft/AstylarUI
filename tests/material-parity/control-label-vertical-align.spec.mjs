import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { inspectControlLabelAlignment } from '../../scripts/audit-material-control-label-vertical-align.mjs';

const file = 'docs/material-control-label-vertical-align.json', saved = JSON.parse(readFileSync(file));
const original = JSON.parse(readFileSync(saved.originalCapture.file));
const entries = new Map([['static', original.results], ['interaction', original.interactions]].flatMap(([kind, es]) =>
  es.map(e => [`${kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`, e])));
function fixture(f = saved.findings[0]) {
  const entry = entries.get(f.case);
  return { family: entry.family, input: structuredClone(entry.styleInputs.find(i => i.id === f.element)),
    reference: JSON.parse(readFileSync(f.inputTrees.reference.file)), candidate: JSON.parse(readFileSync(f.inputTrees.astylar.file)) };
}
const inspect = f => inspectControlLabelAlignment(f.family, f.input, f.reference, f.candidate);
const a = f => f.candidate.nodes.find(n => n.authored?.id === f.input.id);
const r = f => f.reference.nodes.find(n => n.attributes?.id === f.input.id);

test('all 272 control label observations distinguish substituted input from used alignment and glyph placement', () => {
  assert.equal(saved.originalCasesScanned, 2311); assert.equal(saved.observations, 272);
  assert.deepEqual(saved.counts, { 'checkbox-label': 68, 'radio-solo-label': 68, 'radio-team-label': 68, 'slide-toggle-label': 68 });
  for (const finding of saved.findings) {
    const f = fixture(finding), before = JSON.stringify(f), p = inspect(f);
    assert.deepEqual(p, finding.proof); assert.equal(JSON.stringify(f), before);
    assert.equal(p.referenceOwner.computed, 'baseline'); assert.equal(p.retainedText, 'middle');
    assert.equal(p.classification, 'application-plugin-authoring-defect');
    for (const key of ['inputEquivalent', 'wholeElementInputEquivalent', 'rendererCauseProven',
      'renderingEquivalent', 'usedAlignmentVerified', 'currentGlyphPaintVerified']) assert.equal(p[key], false);
  }
  assert.equal(saved.history.revision, '354084ea1f1a6abb3e010222062e3cea9f945b61');
  assert.equal(saved.history.changes.length, 3);
  assert.equal(saved.history.historicalRenderingReplayed, false); assert.equal(saved.history.concealedCoreCauseProven, false);
});

test('label alignment proof rejects mapping changes, competing inputs and inconsistent observation stages', () => {
  const mutations = [
    f => { f.family = 'wrong'; }, f => { f.input.id = 'wrong'; },
    f => { f.reference.errors.push('capture'); }, f => { f.candidate.errors.push('capture'); },
    f => { f.candidate.resolvedStyleSource = 'other'; }, f => { f.candidate.resolvedStyleEvidenceVersion = 1; },
    f => { f.input.astylarResolvedStyleEvidenceVersion = 1; },
    f => { f.reference.nodes.push(structuredClone(r(f))); }, f => { f.candidate.nodes.push(structuredClone(a(f))); },
    f => { r(f).type = 'label'; }, f => { a(f).authored.class = 'other-label'; },
    f => { r(f).ownText = 'changed'; }, f => { a(f).authored.textContent = 'changed'; },
    f => { f.input.referenceStructure.descendantIds.push('unexpected'); },
    f => { f.input.reference.color = 'changed'; }, f => { f.input.reference.verticalAlign = 'middle'; },
    f => { f.input.astylar.verticalAlign = 'baseline'; }, f => { a(f).normalResolvedStyle.verticalAlign = 'baseline'; },
    f => { r(f).inline['vertical-align'] = { value: 'middle', important: false }; },
    f => { r(f).attributes.style = 'vertical-align: middle'; }, f => { r(f).rules.push(0); },
    f => { a(f).authored.style = { verticalAlign: 'middle' }; },
    f => { a(f).authored.verticalAlign = 'middle'; },
    f => { f.candidate.rules.push({ selector: ':is(span)', verticalAlign: 'baseline' }); },
    f => { f.candidate.rules.push({ selector: '#' + f.input.id, all: 'unset' }); },
    f => { f.candidate.rules.find(rule => rule.selector === '.' + a(f).authored.class).mediaMaxWidth = '500px'; },
    f => { f.input.astylarAuthored[0].declarations.verticalAlign = 'baseline'; },
    f => { a(f).retainedText.source = 'other'; }, f => { a(f).retainedText.style.verticalAlign = 'baseline'; },
    f => { a(f).paintedControlText = { source: 'other' }; },
    f => { a(f).parent = 'missing'; }, f => { r(f).parent = 'missing'; },
  ];
  for (const [i, mutate] of mutations.entries()) {
    const f = fixture(), before = JSON.stringify(f); mutate(f);
    assert.notEqual(JSON.stringify(f), before, `mutation ${i} must change evidence`);
    assert.throws(() => inspect(f), `mutation ${i}`);
  }
  assert.equal(mutations.length, 32);
});

test('label alignment source and history replay is read-only and preserves every saved finding', () => {
  const before = readFileSync(file);
  const guard = `import fs from 'node:fs';import{syncBuiltinESMExports}from'node:module';
    fs.writeFileSync=()=>{throw Error('CHECK_MODE_ATTEMPTED_WRITE')};syncBuiltinESMExports();`;
  const result = JSON.parse(execFileSync(process.execPath, ['--import',
    'data:text/javascript;base64,' + Buffer.from(guard).toString('base64'),
    'scripts/audit-material-control-label-vertical-align.mjs', '--check'], { encoding: 'utf8', maxBuffer: 1024 * 1024 }));
  assert.equal(result.observations, 272); assert.equal(result.canonicalAttributionChanged, false);
  assert.deepEqual(readFileSync(file), before);
});
