import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const hash = b => createHash('sha256').update(b).digest('hex');
const one = ns => { assert.equal(ns.length, 1); return ns[0]; };
export function proveToolbarPositionInspection(r, a) {
  for (const t of [r, a]) {
    assert.deepEqual(t.errors, []);
    assert.equal(new Set(t.nodes.map(n => n.key)).size, t.nodes.length);
  }
  const rh = one(r.nodes.filter(n => n.attributes?.id === 'toolbar-primary'));
  const ah = one(a.nodes.filter(n => n.authored?.id === 'toolbar-primary'));
  const rc = r.nodes.filter(n => n.parent === rh.key);
  const ac = a.nodes.filter(n => n.parent === ah.key);
  assert.deepEqual(rc.map(n => n.attributes.id ?? n.attributes.class), ['toolbar-title', 'spacer', 'toolbar-action']);
  assert.deepEqual(ac.map(n => n.authored.id), ['toolbar-title', 'toolbar-action']);
  const rs = r.styles[rh.style];
  assert.equal(rs.position, 'static'); assert.equal(rs.display, 'flex');
  assert.equal(rs.padding, '0px 16px');
  assert.equal(r.styles[rc[1].style].flexGrow, '1');
  for (const stage of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle']) {
    const s = ah[stage];
    assert.equal(s.position, 'relative'); assert.equal(s.display, 'flex'); assert.equal(s.padding, '0');
    for (const n of ac) assert.equal(Object.hasOwn(n[stage], 'position'), false);
    assert.equal(ac[0][stage].width, '192.15625px'); assert.equal(ac[0][stage].marginLeft, '16px');
    assert.equal(ac[1][stage].margin, '0 16px 0 auto');
    assert.ok(['65.140625px', '64px'].includes(ac[1][stage].width));
  }
  return { reference: { host: rh.key, position: rs.position, padding: rs.padding, spacer: rc[1].key, spacerFlexGrow: '1' },
    candidate: { host: ah.key, position: 'relative', padding: '0', titleWidth: ac[0].resolvedStyle.width,
      titleMarginLeft: '16px', actionMargin: '0 16px 0 auto', actionWidth: ac[1].resolvedStyle.width,
      childPositionDeclarationOmitted: true },
    classification: 'unresolved', rendererCauseProven: false, inputEquivalenceProven: false,
    remainingQuestion: 'Does retained host positioning affect containing-block or stacking behavior? Spacing substitutions require separate equivalent-input proof.' };
}
export function collectToolbarPositionInspection() {
  const file = 'docs/material-position-input-population.json', bytes = readFileSync(file);
  assert.equal(hash(bytes), '71ed7689534232fe8c167532455abbf9510e89ae69b4c918d9dc7f40d3d346ff');
  const g = one(JSON.parse(bytes).groups.filter(g => g.element === 'toolbar-primary'));
  assert.equal(g.observations.length, 52); assert.equal(new Set(g.observations.map(o => o.case)).size, 52);
  return { schemaVersion: 1, kind: 'toolbar-position-inspection', population: { file, sha256: hash(bytes) },
    priorRowSha256: g.priorRowSha256, observations: g.observations.map(o => {
      const trees = ['reference', 'astylar'].map(side => { const receipt = o.inputTrees[side], b = readFileSync(receipt.file);
        assert.equal(hash(b), receipt.sha256); return JSON.parse(b); });
      return { case: o.case, inputTrees: o.inputTrees, proof: proveToolbarPositionInspection(...trees) };
    }), counts: { groups: 1, observations: 52 }, canonicalAttributionChanged: false };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const report = collectToolbarPositionInspection();
  writeFileSync('docs/material-toolbar-position-inspection.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report.counts));
}
