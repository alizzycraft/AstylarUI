import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { collectFontScopeInputs, inspectFontScopeInputs } from '../../scripts/audit-material-font-scope-inputs.mjs';
import { materialAuditHarnessPlan } from '../../scripts/run-material-audit-harness.mjs';

test('all original toolbar/paginator owners retain the component-to-descendant font scope mismatch', () => {
  const report = collectFontScopeInputs();
  assert.deepEqual(report, JSON.parse(readFileSync('docs/material-font-scope-inputs.json')));
  assert.equal(report.originalCasesScanned, 2311); assert.equal(report.observations, 104);
  assert.deepEqual(report.counts, { toolbar: 52, paginator: 52 });
  assert.equal(report.canonicalAttributionChanged, false); assert.equal(report.rendererChanged, false);
  for (const finding of report.findings) {
    const p = finding.proof;
    assert.equal(p.classification, 'application-plugin-authoring-defect');
    assert.equal(p.referenceComputedFontSize, p.candidateDescendantLocalFontSize);
    for (const flag of ['sameInheritanceScope', 'candidateComputedHostSizeVerified', 'wholeElementInputEquivalent',
      'rendererCauseProven', 'renderingEquivalent', 'descendantRasterVerified']) assert.equal(p[flag], false);
  }
  assert.equal(report.history.revisions[0].beforeFileAbsent, true);
  assert.ok(materialAuditHarnessPlan(process.cwd()).files.includes('tests/material-parity/font-scope-inputs.spec.mjs'));
});

test('scope proof rejects lost tokens, unknown requests, changed ancestry, and synthesized measurements', () => {
  const original = JSON.parse(readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json'));
  for (const family of ['toolbar', 'paginator']) {
    const entry = original.results.find(e => e.family === family && e.profile === 'contrast' && e.viewport.id === 'desktop');
    const input = entry.styleInputs.find(i => i.id === family + '-primary');
    const reference = JSON.parse(readFileSync(entry.inputTrees.reference.file)), candidate = JSON.parse(readFileSync(entry.inputTrees.astylar.file));
    const r = tree => tree.nodes.find(n => n.attributes?.id === input.id);
    const a = tree => tree.nodes.find(n => n.authored?.id === input.id);
    const child = tree => tree.nodes.find(n => n.authored?.id === (family === 'toolbar' ? 'toolbar-title' : 'paginator-container'));
    const rule = tree => tree.rules.find(rule => rule.selector === '.' + child(tree).authored.id);
    const rchild = tree => family === 'toolbar' ? tree.nodes.find(n => n.attributes?.id === 'toolbar-title')
      : tree.nodes.find(n => n.attributes?.class === 'mat-mdc-paginator-container');
    const before = JSON.stringify([input, reference, candidate]);
    assert.equal(inspectFontScopeInputs(family, input, reference, candidate).referencePageFontSize, '14.4px');
    const changes = [
      (i, r) => { r.nodes.find(n => n.key === 'frame').inline['--scale'].value = '1'; },
      (i, ref) => { r(ref).inline['font-size'] = { value: '12px' }; },
      (i, ref) => { ref.rules[r(ref).rules.find(index => ref.rules[index].declarations['font-size'])].active = false; },
      (i, ref) => { ref.rules[r(ref).rules.find(index => ref.rules[index].declarations['font-size'])].declarations['font-size'].value = '16px'; },
      (i, ref) => { ref.styles[r(ref).style].fontSize = '16px'; },
      (i, ref) => { rchild(ref).inline.font = { value: '12px Arial' }; },
      (i, ref) => { rchild(ref).parent = 'frame'; },
      (i, ref) => { rchild(ref).ownText = 'changed'; },
      (i, _r, c) => { a(c).normalResolvedStyle.fontSize = '16px'; },
      (i, _r, c) => { a(c).interactionResolvedStyle.fontSize = '16px'; },
      (i, _r, c) => { a(c).resolvedStyle.fontSize = '16px'; },
      (i, _r, c) => { a(c).authored.style = { fontSize: '12px' }; },
      (i, _r, c) => { a(c).parent = 'root'; },
      (i, _r, c) => { c.rules.push({ selector: 'div[data-scope]', fontSize: '16px' }); },
      (i, _r, c) => { c.rules.push({ selector: '.' + family, font: '12px Arial' }); },
      (i, _r, c) => { c.rules.push({ selector: '#page', all: 'initial' }); },
      (i, _r, c) => { c.rules.push({ selector: '.unknown', nested: { fontSize: '12px' } }); },
      (i, _r, c) => { child(c).parent = 'root/0'; },
      (i, _r, c) => { rule(c).fontSize = '16px'; },
      (i, _r, c) => { child(c).normalResolvedStyle.fontSize = '16px'; },
      (i, _r, c) => { child(c).interactionResolvedStyle.fontSize = '16px'; },
      (i, _r, c) => { child(c).resolvedStyle.fontSize = '16px'; },
      (i, _r, c) => { c.nodes.push(structuredClone(a(c))); },
      (i, _r, c) => { c.resolvedStyleSource = 'synthesized'; },
      (i, _r, c) => { c.errors.push('capture failed'); },
      i => { i.astylarResolvedStyleEvidenceVersion = 1; },
      i => { i.reference.fontSize = '16px'; },
      i => { i.astylar.fontSize = '16px'; },
    ];
    for (const [index, change] of changes.entries()) {
      const args = structuredClone([input, reference, candidate]); change(...args);
      assert.throws(() => inspectFontScopeInputs(family, ...args), `${family} negative control ${index}`);
    }
    assert.equal(changes.length, 28); assert.equal(JSON.stringify([input, reference, candidate]), before);
  }
});
