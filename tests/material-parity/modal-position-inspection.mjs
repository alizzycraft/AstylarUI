import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { resolveOriginAliasPair } from './origin-alias-mapping-evidence.mjs';
const hash = b => createHash('sha256').update(b).digest('hex');
const ids = ['bottom-sheet-copy', 'bottom-sheet-dismiss', 'bottom-sheet-panel', 'dialog-actions',
  'dialog-cancel', 'dialog-copy', 'dialog-panel', 'dialog-save', 'dialog-title'];
const one = ns => { assert.equal(ns.length, 1); return ns[0]; };
const caseKey = (e, kind) => `${kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`;
export function proveModalPositionInspection(entry, r, a, id) {
  assert.ok(ids.includes(id));
  const input = one(entry.styleInputs.filter(i => i.id === id));
  const mapping = resolveOriginAliasPair(entry, r, a, input);
  assert.ok(['mapped', 'mapped-with-scalar-rule-gap'].includes(mapping.status), mapping.reason);
  const rn = one(r.nodes.filter(n => n.key === mapping.referenceNode));
  const an = one(a.nodes.filter(n => n.key === mapping.candidateNode));
  const rs = r.styles[rn.style];
  assert.equal(rs.position, id === 'dialog-copy' ? 'static' : 'relative');
  for (const stage of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle']) assert.ok(!Object.hasOwn(an[stage], 'position'));
  const properties = ['position', 'display', 'width', 'height', 'minWidth', 'maxWidth', 'minHeight', 'maxHeight',
    'boxSizing', 'padding', 'margin', 'fontSize', 'lineHeight', 'transform', 'borderRadius',
    'borderTopLeftRadius', 'overflow', 'overflowX', 'overflowY'];
  const project = style => Object.fromEntries(properties.map(p => [p,
    Object.hasOwn(style, p) ? { present: true, value: style[p] } : { present: false }]));
  return { element: id, mapping, reference: { type: rn.type, style: project(rs) },
    candidate: { type: an.authored.type, style: project(an.resolvedStyle) },
    classification: 'unresolved', inputEquivalenceProven: false, rendererCauseProven: false,
    remainingQuestion: 'Generated reference owner is mapped, but differing modal structure and sizing must be compared before position omission can be classified.' };
}
export function collectModalPositionInspection() {
  const file = 'docs/material-position-input-population.json', b = readFileSync(file);
  assert.equal(hash(b), '71ed7689534232fe8c167532455abbf9510e89ae69b4c918d9dc7f40d3d346ff');
  const captureFile = 'artifacts/material-parity/current-ancestry-audit/latest-report.json', source = readFileSync(captureFile);
  assert.equal(hash(source), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const capture = JSON.parse(source), entries = new Map();
  for (const [kind, list] of [['static', capture.results], ['interaction', capture.interactions]]) for (const e of list) {
    const key = caseKey(e, kind); assert.ok(!entries.has(key)); entries.set(key, e);
  }
  const groups = JSON.parse(b).groups.filter(g => ids.includes(g.element)); assert.deepEqual(groups.map(g => g.element), ids);
  const reviewed = groups.map(g => {
    const expected = g.family === 'dialog' ? 32 : 25;
    assert.equal(g.observations.length, expected); assert.equal(new Set(g.observations.map(o => o.case)).size, expected);
    return { element: g.element, priorRowSha256: g.priorRowSha256, observations: g.observations.map(o => {
      const entry = entries.get(o.case); assert.ok(entry);
      const trees = ['reference', 'astylar'].map(side => { const receipt = o.inputTrees[side], bytes = readFileSync(receipt.file);
        assert.equal(hash(bytes), receipt.sha256); return JSON.parse(bytes); });
      return { case: o.case, inputTrees: o.inputTrees, proof: proveModalPositionInspection(entry, ...trees, g.element) };
    }) };
  });
  return { schemaVersion: 1, kind: 'modal-position-inspection', population: { file, sha256: hash(b) },
    capture: { file: captureFile, sha256: hash(source) }, groups: reviewed,
    counts: { groups: 9, observations: 267 }, canonicalAttributionChanged: false };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const report = collectModalPositionInspection();
  writeFileSync('docs/material-modal-position-inspection.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report.counts));
}
