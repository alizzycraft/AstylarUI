import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const hash = b => createHash('sha256').update(b).digest('hex');
const one = ns => { assert.equal(ns.length, 1); return ns[0]; };
const cls = (n, c) => n.attributes?.class?.split(/\s+/).includes(c);
export function proveStepperPositionSubstitution(r, a) {
  assert.deepEqual(r.errors, []); assert.deepEqual(a.errors, []);
  const rh = one(r.nodes.filter(n => n.attributes?.id === 'stepper-primary'));
  const head = one(r.nodes.filter(n => cls(n, 'mat-horizontal-stepper-header-container')));
  const line = one(r.nodes.filter(n => cls(n, 'mat-stepper-horizontal-line')));
  const tabs = r.nodes.filter(n => cls(n, 'mat-horizontal-stepper-header'));
  assert.equal(tabs.length, 2); assert.equal(line.parent, head.key);
  assert.equal(r.styles[rh.style].position, 'static');
  assert.equal(r.styles[head.style].display, 'flex');
  for (const tab of tabs) { assert.equal(tab.parent, head.key); assert.equal(r.styles[tab.style].position, 'relative'); }
  const ls = r.styles[line.style];
  assert.equal(ls.position, 'static'); assert.equal(ls.flexGrow, '1');
  assert.equal(ls.height, '0px'); assert.equal(ls.borderTopWidth, '1px');
  assert.equal(ls.borderTopStyle, 'solid');
  const pick = id => one(a.nodes.filter(n => n.authored?.id === id));
  const ah = pick('stepper-primary'), ahead = pick('stepper-head');
  assert.equal(ahead.parent, ah.key); assert.equal(ahead.resolvedStyle.display, 'block');
  for (const stage of ['normalResolvedStyle', 'interactionResolvedStyle', 'resolvedStyle']) {
    assert.equal(ah[stage].position, 'relative'); assert.equal(ahead[stage].position, 'relative');
    for (const id of ['step-details', 'step-review', 'step-connector']) {
      const node = pick(id); assert.equal(node.parent, ahead.key); assert.equal(node[stage].position, 'absolute');
    }
  }
  const start = pick('step-details').resolvedStyle, end = pick('step-review').resolvedStyle,
    connector = pick('step-connector').resolvedStyle;
  assert.equal(start.width, '130px'); assert.equal(end.width, '130px');
  assert.equal(start.left, '-24px'); assert.equal(end.right, '-24px');
  assert.ok(['73.2%', '69.5%', '15.1%'].includes(connector.width));
  assert.equal(connector.height, '1px');
  return { reference: { host: rh.key, head: head.key, connector: line.key,
    layout: 'in-flow headers with flex-growing zero-height border connector' },
    candidate: { host: ah.key, head: ahead.key, headerWidth: start.width,
      startLeft: start.left, endRight: end.right, connectorTop: connector.top,
      connectorLeft: connector.left, connectorWidth: connector.width },
    classification: 'application-plugin-authoring-defect', firstDivergence: 'authored header and connector layout',
    rendererCauseProven: false, inputEquivalent: false, renderingEquivalent: false };
}
export function collectStepperPositionSubstitution() {
  const file = 'docs/material-position-input-population.json', bytes = readFileSync(file);
  assert.equal(hash(bytes), '71ed7689534232fe8c167532455abbf9510e89ae69b4c918d9dc7f40d3d346ff');
  const group = JSON.parse(bytes).groups.find(g => g.element === 'stepper-primary');
  assert.equal(group.observations.length, 68);
  return { schemaVersion: 1, kind: 'stepper-position-substitution', population: { file, sha256: hash(bytes) },
    priorRowSha256: group.priorRowSha256, observations: group.observations.map(o => {
      const trees = ['reference', 'astylar'].map(s => {
        const receipt = o.inputTrees[s], source = readFileSync(receipt.file);
        assert.equal(hash(source), receipt.sha256); return JSON.parse(source);
      });
      return { case: o.case, inputTrees: o.inputTrees, proof: proveStepperPositionSubstitution(...trees) };
    }), counts: { groups: 1, observations: 68 }, canonicalAttributionChanged: false };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const report = collectStepperPositionSubstitution();
  writeFileSync('docs/material-stepper-position-substitution.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report.counts));
}
