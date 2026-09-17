import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const captureFile = 'artifacts/material-parity/current-ancestry-audit/latest-report.json';
const captureSha256 = 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a';
const output = 'docs/material-button-state-paint-survey.json';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const classes = value => (value ?? '').split(/\s+/);
const only = (items, message) => { assert.equal(items.length, 1, message); return items[0]; };

// This records paint authoring and observation stages, never pixel equivalence.
export function observeButtonStatePaint(item, node, reference, candidate) {
  const id = node.authored.id;
  const input = only(item.styleInputs.filter(i => i.id === id), 'one scalar owner');
  const owner = only(reference.nodes.filter(n => n.attributes?.id === id), 'one reference owner');
  const host = reference.styles[owner.style];
  const layer = only(reference.nodes.filter(n => n.parent === owner.key &&
    classes(n.attributes?.class).includes('mat-mdc-button-persistent-ripple')), 'one reference state layer');
  const pseudo = only(layer.pseudoElements.filter(p => p.pseudo === '::before'), 'one before pseudo');
  assert.equal(pseudo.generated, true);
  const paint = reference.styles[pseudo.style];
  assert.ok(paint && ['0', '0.08', '0.12'].includes(paint.opacity));
  assert.equal(host.backgroundColor, input.reference.backgroundColor);
  assert.equal(candidate.resolvedStyleEvidenceVersion, 2);
  assert.equal(candidate.resolvedStyleSource, 'core-style-inspection');
  for (const [tree, scalar] of [['normalResolvedStyle', 'astylarNormalResolvedStyle'],
    ['interactionResolvedStyle', 'astylarInteractionResolvedStyle'], ['resolvedStyle', 'astylar']])
    assert.deepEqual(node[tree], input[scalar], `${id} ${tree} agrees with original scalar capture`);
  const descendants = candidate.nodes.filter(n => n.key.startsWith(node.key + '/'));
  assert.equal(descendants.length, 0, 'captured shared button is a leaf');
  const active = Number(paint.opacity) > 0;
  return {
    case: `${item.family}/${item.profile}/${item.viewport.id}/${item.state}`,
    family: item.family, profile: item.profile, viewport: item.viewport, state: item.state, element: id,
    inputTrees: item.inputTrees,
    reference: { key: owner.key, hostBackground: host.backgroundColor, hostOpacity: host.opacity,
      layerKey: layer.key, layer: reference.styles[layer.style], pseudo: paint,
      pseudoRules: pseudo.rules.map(index => reference.rules[index]) },
    candidate: { key: node.key, authored: node.authored, normal: node.normalResolvedStyle,
      interaction: node.interactionResolvedStyle, effective: node.resolvedStyle,
      authoredRules: input.astylarAuthored, descendantCount: descendants.length,
      sharedStateRules: candidate.rules.filter(rule => rule.selector === '.material-button:hover' ||
        rule.selector === '.material-button:active'),
      siblingPluginNodes: candidate.nodes.filter(n => n.parent === node.parent &&
        n.authored?.type?.includes(':')).map(n => ({ key: n.key, authored: n.authored })) },
    classification: active ? 'application-plugin-authoring-defect' : 'inactive-control-retained-for-review',
    justification: active
      ? 'Reference retains host background plus a translucent child pseudo-element; candidate authors a replacement host background. This is different paint composition, not proof of equivalent rendering.'
      : 'Reference state-layer opacity is zero. This control remains in the population; its base or disabled paint is not certified equivalent by this survey.',
    inputEquivalent: false, renderingEquivalent: false, rendererCauseProven: false,
  };
}

export function collectButtonStatePaint({ read = readFileSync } = {}) {
  const bytes = read(captureFile); assert.equal(hash(bytes), captureSha256);
  const report = JSON.parse(bytes), rows = [], cases = new Set();
  const tree = descriptor => {
    assert.match(descriptor.file, /^artifacts\/material-parity\/current-ancestry-audit\//);
    assert.ok(!descriptor.file.split('/').includes('..'));
    const bytes = read(descriptor.file); assert.equal(hash(bytes), descriptor.sha256);
    const data = JSON.parse(bytes); assert.deepEqual(data.errors, []); return data;
  };
  for (const item of report.interactions.filter(c => ['hover', 'held'].includes(c.state))) {
    const candidate = tree(item.inputTrees.astylar);
    const owners = candidate.nodes.filter(n => classes(n.authored?.class).includes('material-button'));
    if (!owners.length) continue;
    const reference = tree(item.inputTrees.reference);
    for (const node of owners) {
      const row = observeButtonStatePaint(item, node, reference, candidate);
      cases.add(row.case); rows.push(row);
    }
  }
  assert.equal(cases.size, 114); assert.equal(rows.length, 146);
  assert.equal(new Set(rows.map(r => `${r.case}/${r.element}`)).size, rows.length);
  const sources = ['scripts/audit-material-button-state-paint.mjs',
    'tests/material-parity/button-state-paint-survey.spec.mjs',
    'examples/material-showcase/src/app/astylar.component.ts', 'examples/material-showcase/src/app/theme.ts'];
  return { schemaVersion: 1, kind: 'shared-button-state-paint-input-survey',
    capture: { file: captureFile, sha256: captureSha256 },
    sourceFingerprints: sources.map(file => ({ file, sha256: hash(read(file).toString('utf8').replaceAll('\r\n', '\n')) })),
    cases: cases.size, owners: rows.length,
    activeLayerOwners: rows.filter(r => Number(r.reference.pseudo.opacity) > 0).length,
    inactiveLayerOwners: rows.filter(r => r.reference.pseudo.opacity === '0').length,
    observations: rows, canonicalAttributionChanged: false,
    inputEquivalent: false, renderingEquivalent: false,
    limitation: 'Complete shared material-button host census within original hover/held captures only. Sibling plugin paint is retained but not evaluated. No pixel equivalence, active-state lifecycle cause, disabled-paint equivalence, canonical integration or general pseudo-element support is inferred.' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const report = collectButtonStatePaint();
  if (process.argv.includes('--check')) assert.deepEqual(JSON.parse(readFileSync(output)), report);
  else writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ cases: report.cases, owners: report.owners,
    activeLayerOwners: report.activeLayerOwners, inactiveLayerOwners: report.inactiveLayerOwners,
    canonicalAttributionChanged: false, inputEquivalent: false }));
}
