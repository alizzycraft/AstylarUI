import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { resolveOriginAliasPair } from '../tests/material-parity/origin-alias-mapping-evidence.mjs';
import { applyModalBoxReview } from '../tests/material-parity/modal-position-inspection.mjs';

const hash = x => createHash('sha256').update(x).digest('hex');
const populationFile = 'docs/material-visibility-input-population.json';
const populationSha256 = '2ca5eb09c5ebdcd6236225ee8bd64cce4a9f7061f78a29bd54a5bd22bfa8fb18';
const one = a => { assert.equal(a.length, 1); return a[0]; };
export function provePanelVisibilityOwnership(entry, reference, candidate) {
  assert.equal(reference.ruleEvidenceComplete, true); assert.equal(candidate.ruleEvidenceComplete, true);
  assert.equal(candidate.resolvedStyleEvidenceVersion, 2); assert.equal(candidate.resolvedStyleSource, 'core-style-inspection');
  const state = inspectPanelState(reference, candidate, entry.family);
  const element = entry.family === 'tabs' ? 'tab-panel' : 'stepper-content';
  const input = one(entry.styleInputs.filter(i => i.id === element));
  const mapping = resolveOriginAliasPair(entry, reference, candidate, input);
  assert.equal(mapping.status, 'mapped'); assert.deepEqual(mapping.missingRules, []); assert.deepEqual(mapping.extraRules, []);
  assert.equal(mapping.checkedReferenceProperties, 89);
  assert.equal(mapping.candidateNode, state.candidatePanel.key);
  const active = one(state.referencePanels.filter(p => p.selected));
  assert.equal(mapping.referenceNode, active.text[0].key);
  assert.equal(input.reference.visibility, 'visible');
  const a = candidate.nodes.find(n => n.key === mapping.candidateNode);
  for (const [scalar, stage] of [['astylar', 'resolvedStyle'], ['astylarNormalResolvedStyle', 'normalResolvedStyle'], ['astylarInteractionResolvedStyle', 'interactionResolvedStyle']]) {
    assert.deepEqual(input[scalar], a[stage]); assert.equal(Object.hasOwn(a[stage], 'visibility'), false);
  }
  return { referenceNode: mapping.referenceNode, astylarNode: mapping.candidateNode, mapping, state,
    firstDivergence: 'two linked native panel owners replaced by one candidate content/state owner',
    inputEquivalent: false, renderingEquivalent: null, liveAnimationVerified: false,
    activeVisibilityOmissionIsCause: false, coreVisibilitySupportGapWaived: false };
}

export function applyPanelVisibilityOwnership(rows, cases, inventory, normalize) {
  for (const family of ['tabs', 'stepper']) rows = applyModalBoxReview(rows, cases, inventory, normalize, {
    family, element: family === 'tabs' ? 'tab-panel' : 'stepper-content', properties: ['visibility'], prove: provePanelVisibilityOwnership,
    attribution: 'reviewed-panel-visibility-state-owner-substitution', owner: 'showcase panel state structure and custom tab text ownership',
    justification: 'All original state owners and header links are checked, not only active text. Native retains two tabpanel owners; candidate retains one changing content owner. Stepper keeps inactive hidden/inert zero-height content; tabs retain inert outer panels with different text mounting and use a custom candidate painter. The visible-versus-omitted scalar compares stages and is not proof that adding visible fixes anything. This row is bound to the demonstrated state-owner substitution; core hidden-state support, live animation, focus/accessibility outcomes and used visibility remain separate, unwaived questions.',
  });
  return rows;
}

export function validatePanelVisibilityOwnership(rows, originalRows, cases, inventory, normalize) {
  try {
    const select = values => values.filter(r => r.attribution === 'reviewed-panel-visibility-state-owner-substitution');
    assert.deepEqual(select(rows), select(applyPanelVisibilityOwnership(originalRows, cases, inventory, normalize)));
    return [];
  } catch (error) { return [`panel visibility lacks original state ownership evidence: ${error.message}`]; }
}

export function inspectPanelState(reference, candidate, family) {
  assert.ok(['tabs', 'stepper'].includes(family));
  assert.deepEqual(reference.errors, []); assert.deepEqual(candidate.errors, []);
  for (const t of [reference, candidate]) assert.equal(new Set(t.nodes.map(n => n.key)).size, t.nodes.length);
  const id = family === 'tabs' ? 'tab-panel' : 'stepper-content';
  const panels = reference.nodes.filter(n => n.attributes?.role === 'tabpanel');
  assert.equal(panels.length, 2);
  const contents = reference.nodes.filter(n => n.attributes?.['data-parity-id'] === id);
  assert.equal(contents.length, family === 'tabs' ? 1 : 2);
  const byKey = new Map(reference.nodes.map(n => [n.key, n]));
  function belongs(node, panel) {
    const seen = new Set();
    while (node) {
      assert.ok(!seen.has(node.key)); seen.add(node.key);
      if (node === panel) return true;
      if (node.parent === null) return false;
      node = byKey.get(node.parent); assert.ok(node, 'missing ancestor');
    }
    return false;
  }
  const referencePanels = panels.map(panel => {
    const header = one(reference.nodes.filter(n => n.attributes?.id === panel.attributes['aria-labelledby']));
    assert.equal(header.attributes.role, 'tab');
    assert.equal(header.attributes['aria-controls'], panel.attributes.id);
    const selected = header.attributes['aria-selected']; assert.ok(['true', 'false'].includes(selected));
    const style = reference.styles[panel.style]; assert.ok(style);
    const text = contents.filter(n => belongs(n, panel)).map(n => {
      const style = reference.styles[n.style]; assert.ok(style);
      return { key: n.key, text: n.ownText, visibility: style.visibility };
    });
    const active = selected === 'true';
    assert.equal(Object.hasOwn(panel.attributes, 'inert'), !active);
    assert.equal(style.visibility, family === 'stepper' && !active ? 'hidden' : 'visible');
    assert.equal(text.length, family === 'tabs' && !active ? 0 : 1);
    if (family === 'stepper' && !active) assert.equal(style.height, '0px');
    if (text.length) assert.equal(text[0].visibility, active ? 'visible' : 'hidden');
    return { key: panel.key, type: panel.type, attributes: panel.attributes, selected: active,
      visibility: style.visibility, height: style.height, text, header: { key: header.key, attributes: header.attributes } };
  });
  const active = one(referencePanels.filter(p => p.selected));
  const candidates = candidate.nodes.filter(n => n.authored?.role === 'tabpanel');
  const node = one(candidates); assert.equal(node.authored.id, id);
  const expectedTexts = family === 'tabs' ? ['Overview content', 'Activity content'] : ['Project details', 'Review changes'];
  assert.ok(expectedTexts.includes(active.text[0].text));
  if (family === 'tabs') {
    assert.equal(node.authored.type, 'showcase.material:tab-panel');
    assert.equal(node.authored.data.phase, 1, 'captured benchmark does not prove live animation');
    assert.equal(node.authored.data.selected, active.text[0].text === expectedTexts[0]);
    assert.equal(node.authored.ariaLabel, active.text[0].text);
    assert.equal(node.authored.textContent, undefined);
  } else {
    assert.equal(node.authored.type, 'span'); assert.equal(node.authored.textContent, active.text[0].text);
  }
  return { referencePanels, candidatePanel: { key: node.key, parent: node.parent, authored: node.authored },
    selectedTextMatches: true, equivalentStateOwnerStructure: false,
    classification: 'application-plugin-authoring-defect',
    scope: 'Different authored state-owner representation; this does not assert an observed accessibility or animation failure.' };
}

export function collectPanelStateOwnership() {
  const bytes = readFileSync(populationFile); assert.equal(hash(bytes), populationSha256);
  const population = JSON.parse(bytes), observations = [];
  for (const group of population.groups.filter(g => ['tabs', 'stepper'].includes(g.family))) {
    for (const o of group.observations) {
      const trees = Object.fromEntries(['reference', 'astylar'].map(side => {
        const bytes = readFileSync(o.inputTrees[side].file); assert.equal(hash(bytes), o.inputTrees[side].sha256);
        return [side, JSON.parse(bytes)];
      }));
      observations.push({ case: o.case, family: group.family, inputSha256: o.inputSha256, inputTrees: o.inputTrees,
        ...inspectPanelState(trees.reference, trees.astylar, group.family) });
    }
  }
  const sourceFiles = ['examples/material-showcase/src/app/reference.component.ts',
    'examples/material-showcase/src/app/astylar.component.ts',
    'examples/material-showcase/src/app/material-plugin/material-showcase.plugin.ts'];
  return { schemaVersion: 1, population: { file: populationFile, sha256: populationSha256 },
    currentSourceReceipts: sourceFiles.map(file => ({ file, lfSha256: hash(readFileSync(file, 'utf8').replaceAll('\r\n', '\n')) })),
    counts: { observations: observations.length, tabs: observations.filter(o => o.family === 'tabs').length,
      stepper: observations.filter(o => o.family === 'stepper').length }, observations,
    canonicalAttributionChanged: false, liveAnimationTested: false,
    limitation: 'These are captured settled states; source receipts do not establish runtime equivalence of the entire current renderer or plugin.' };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const report = collectPanelStateOwnership();
  writeFileSync('docs/material-panel-state-ownership.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report.counts));
}
