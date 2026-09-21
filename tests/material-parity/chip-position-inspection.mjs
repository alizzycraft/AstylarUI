import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const hash = b => createHash('sha256').update(b).digest('hex');
const ids = ['chip-0', 'chip-1', 'chips-primary'];
const one = ns => { assert.equal(ns.length, 1); return ns[0]; };
const hasClass = (n, c) => n.attributes?.class?.split(/\s+/).includes(c);
export function proveChipPositionInspection(r, a) {
  for (const t of [r, a]) { assert.deepEqual(t.errors, []); assert.equal(new Set(t.nodes.map(n => n.key)).size, t.nodes.length); }
  const rn = id => one(r.nodes.filter(n => n.attributes?.id === id));
  const an = id => one(a.nodes.filter(n => n.authored?.id === id));
  const rh = rn('chips-primary'), ah = an('chips-primary');
  assert.equal(rh.type, 'mat-chip-listbox'); assert.equal(r.styles[rh.style].position, 'static');
  const wrap = one(r.nodes.filter(n => n.parent === rh.key && hasClass(n, 'mdc-evolution-chip-set__chips')));
  const chips = ['chip-0', 'chip-1'].map((id, i) => {
    const ref = rn(id), ast = an(id); assert.equal(ref.parent, wrap.key); assert.equal(ast.parent, ah.key);
    assert.equal(r.styles[ref.style].position, 'relative');
    const overlay = one(r.nodes.filter(n => n.parent === ref.key && hasClass(n, 'mat-mdc-chip-focus-overlay')));
    assert.equal(r.styles[overlay.style].position, 'absolute');
    const cell = one(r.nodes.filter(n => n.parent === ref.key && hasClass(n, 'mdc-evolution-chip__cell')));
    const button = one(r.nodes.filter(n => n.parent === cell.key && n.type === 'button'));
    assert.equal(button.attributes.role, 'option'); assert.equal(ast.authored.role, 'option');
    assert.equal(button.attributes['aria-selected'], String(ast.authored.ariaSelected));
    const graphic = one(r.nodes.filter(n => n.parent === button.key && hasClass(n, 'mdc-evolution-chip__graphic')));
    assert.equal(r.styles[graphic.style].position, 'relative');
    const children = a.nodes.filter(n => n.parent === ast.key);
    assert.ok(children.every(n => ['span', 'showcase.material:check-mark'].includes(n.authored.type)));
    assert.equal(children.filter(n => n.authored.type === 'span').length, 1);
    assert.equal(children.filter(n => n.authored.type === 'showcase.material:check-mark').length, ast.authored.ariaSelected ? 1 : 0);
    const width = ast.authored.ariaSelected ? (i ? '93px' : '97px') : (i ? '64px' : '68px');
    for (const stage of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle']) {
      assert.ok(!Object.hasOwn(ast[stage], 'position')); assert.equal(ast[stage].width, width);
      assert.equal(ast[stage].padding, '0 12px'); assert.equal(ast[stage].gap, '8px');
    }
    return { id, referenceOwner: ref.key, candidateOwner: ast.key, selected: ast.authored.ariaSelected,
      referenceGraphicOwner: graphic.key, referenceGraphicWidth: r.styles[graphic.style].width,
      referenceWidth: r.styles[ref.style].width, candidateWidth: width,
      candidateMarkPresent: ast.authored.ariaSelected, candidatePositionPresent: false };
  });
  for (const stage of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle']) assert.ok(!Object.hasOwn(ah[stage], 'position'));
  return { referenceList: rh.key, referenceWrapper: wrap.key, candidateList: ah.key, chips,
    classification: 'unresolved', rendererCauseProven: false, inputEquivalenceProven: false,
    remainingQuestion: 'Position omissions belong to a flattened button/graphic/focus composition; prove original structure before attributing text alignment or hover failures to core.' };
}
export function collectChipPositionInspection() {
  const file = 'docs/material-position-input-population.json', b = readFileSync(file);
  assert.equal(hash(b), '71ed7689534232fe8c167532455abbf9510e89ae69b4c918d9dc7f40d3d346ff');
  const groups = JSON.parse(b).groups.filter(g => ids.includes(g.element)); assert.deepEqual(groups.map(g => g.element), ids);
  const cases = groups[0].observations.map(o => o.case); assert.equal(cases.length, 76); assert.equal(new Set(cases).size, 76);
  for (const g of groups) assert.deepEqual(g.observations.map(o => o.case), cases);
  const observations = groups[0].observations.map((o, i) => {
    for (const g of groups) assert.deepEqual(g.observations[i].inputTrees, o.inputTrees);
    const trees = ['reference', 'astylar'].map(side => { const receipt = o.inputTrees[side], data = readFileSync(receipt.file);
      assert.equal(hash(data), receipt.sha256); return JSON.parse(data); });
    return { case: o.case, inputTrees: o.inputTrees, proof: proveChipPositionInspection(...trees) };
  });
  return { schemaVersion: 1, kind: 'chip-position-inspection', population: { file, sha256: hash(b) },
    groups: groups.map(g => ({ element: g.element, priorRowSha256: g.priorRowSha256, cases })), observations,
    counts: { groups: 3, observations: 228, distinctCases: 76 }, canonicalAttributionChanged: false };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const report = collectChipPositionInspection();
  writeFileSync('docs/material-chip-position-inspection.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report.counts));
}
