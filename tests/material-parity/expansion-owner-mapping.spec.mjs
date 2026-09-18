import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { inspectExpansionOwnerMapping } from '../../scripts/audit-material-expansion-owner-mapping.mjs';

const reportFile = 'docs/material-expansion-owner-mapping.json';
const report = JSON.parse(readFileSync(reportFile));
const original = JSON.parse(readFileSync(report.originalCapture.file));
const source = [...original.results, ...original.interactions].filter(e => e.family === 'expansion');
const load = entry => ({ input: structuredClone(entry.styleInputs.find(i => i.id === 'expansion-primary')),
  title: structuredClone(entry.styleInputs.find(i => i.id === 'expansion-title')),
  r: JSON.parse(readFileSync(entry.inputTrees.reference.file)), a: JSON.parse(readFileSync(entry.inputTrees.astylar.file)) });
const run = f => inspectExpansionOwnerMapping(f.input, f.title, f.r, f.a);
const rn = (f, type) => f.r.nodes.find(n => n.type === type);
const an = (f, id) => f.a.nodes.find(n => n.authored.id === id);

test('expansion owner audit replays every original state and history without rewriting canonical or evidence files', () => {
  const files = [reportFile, 'docs/material-input-equivalence-audit.json',
    'docs/material-input-equivalence-audit.json.gz', 'docs/material-input-equivalence-audit.md'];
  const before = files.map(f => readFileSync(f));
  const guard = `import fs from 'node:fs';import{syncBuiltinESMExports}from'node:module';
    fs.writeFileSync=()=>{throw Error('CHECK_MODE_ATTEMPTED_WRITE')};syncBuiltinESMExports();`;
  const output = execFileSync(process.execPath, ['--import',
    'data:text/javascript;base64,' + Buffer.from(guard).toString('base64'),
    'scripts/audit-material-expansion-owner-mapping.mjs', '--check'], { encoding: 'utf8', maxBuffer: 1024 * 1024 });
  const result = JSON.parse(output);
  assert.equal(result.observations, 68);
  assert.deepEqual(result.counts, { sameIdRoleMismatches: 68, headerWeightMatches: 68, disabledHeaderCursorDifferences: 8 });
  assert.equal(result.canonicalAttributionChanged, false);
  files.forEach((f, i) => assert.deepEqual(readFileSync(f), before[i]));
});

test('role correspondence preserves genuine header differences and does not establish whole-element equivalence', () => {
  assert.equal(source.length, 68);
  let disabled = 0;
  for (const entry of source) {
    const f = load(entry), before = JSON.stringify(f), proof = run(f);
    assert.equal(JSON.stringify(f), before);
    assert.equal(proof.fontWeight.originalReferencePanel, '400');
    assert.equal(proof.fontWeight.referenceHeader, '500');
    assert.equal(proof.fontWeight.candidateHeader, '500');
    assert.equal(proof.headerCursor.unequal, entry.state === 'disabled');
    if (proof.headerCursor.unequal) {
      disabled++;
      assert.equal(proof.headerCursor.classification, 'application-plugin-authoring-defect');
      assert.equal(proof.headerCursor.reference, 'auto');
      assert.equal(proof.headerCursor.candidate, 'pointer');
    }
    for (const flag of ['inputEquivalent', 'renderingEquivalent', 'rendererCauseProven', 'canonicalMappingChanged'])
      assert.equal(proof[flag], false);
  }
  assert.equal(disabled, 8);
});

test('expansion correspondence rejects changed scalar ownership, paths, roles, tokens and state', () => {
  const mutations = [
    f => { f.input.id = 'different'; },
    f => { f.input.reference.fontWeight = '500'; },
    f => { delete f.input.reference.width; },
    f => { f.input.astylar.fontWeight = '400'; },
    f => { f.input.astylarNormalResolvedStyle.padding = '0'; },
    f => { f.input.astylarInteractionResolvedStyle.cursor = 'default'; },
    f => { f.input.referenceStructure.type = 'mat-expansion-panel-header'; },
    f => { f.input.astylarStructure.directChildIds = []; },
    f => { rn(f, 'mat-expansion-panel-header').parent = 'missing'; },
    f => { rn(f, 'mat-expansion-panel-header').attributes.role = 'region'; },
    f => { rn(f, 'mat-expansion-panel').attributes.role = 'button'; },
    f => { an(f, 'expansion-primary').authored.role = 'region'; },
    f => { an(f, 'expansion-shell').authored.role = 'button'; },
    f => { an(f, 'expansion-primary').parent = 'missing'; },
    f => { an(f, 'expansion-content').parent = an(f, 'expansion-primary').key; },
    f => { rn(f, 'mat-expansion-panel-header').attributes['aria-expanded'] = 'different'; },
    f => { rn(f, 'mat-expansion-panel-header').attributes['aria-disabled'] = 'different'; },
    f => { an(f, 'expansion-primary').authored.tabindex = 9; },
    f => { f.r.styles[rn(f, 'mat-expansion-panel-header').style].fontWeight = '400'; },
    f => { f.r.rules.find(r => r.selector === '.mat-expansion-panel-header').declarations['font-weight'].value = '400'; },
    f => { f.a.rules.find(r => r.selector === '.expansion-trigger').cursor = 'default'; },
    f => { f.r.nodes.push(structuredClone(rn(f, 'mat-expansion-panel-header'))); },
    f => { f.a.nodes.push(structuredClone(an(f, 'expansion-primary'))); },
  ];
  for (const entry of [source[0], source.find(e => e.state === 'disabled')]) {
    for (const [i, mutate] of mutations.entries()) {
      const f = load(entry); mutate(f); assert.throws(() => run(f), `mapping mutation ${i}/${entry.state ?? 'static'}`);
    }
  }
  assert.equal(mutations.length * 2, 46);
});
