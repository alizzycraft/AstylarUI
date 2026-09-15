import assert from 'node:assert/strict';
import { rootInitialSelectorCanApply } from './root-initial-style-evidence.mjs';

const normalize = key => key.replaceAll('-', '').toLowerCase();
const aliases = { fontStyle: ['font'], overflowWrap: ['wordwrap'],
  whiteSpace: ['whitespacecollapse', 'textwrap', 'textwrapmode', 'textwrapstyle'] };
const stages = ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle'];

// Preserve declarations, including empty CSSOM values and motion/reset requests.
// This is not a cascade evaluator or candidate computed-style reconstruction.
export function inspectOverlayOwnerDeclarations(property, proof, reference, candidate) {
  assert.equal(proof.inputEquivalent, false);
  assert.ok(['mapped', 'mapped-with-scalar-rule-gap'].includes(proof.status));
  const requested = new Set([normalize(property), 'all', ...(aliases[property] ?? [])]);
  const select = declarations => Object.fromEntries(Object.entries(declarations ?? {})
    .filter(([key]) => requested.has(normalize(key)) || /^(animation|transition)/.test(normalize(key))));
  const nodesFor = (tree, keys, first) => {
    assert.equal(new Set(tree.nodes.map(n => n.key)).size, tree.nodes.length);
    assert.equal(keys[0], first); assert.equal(new Set(keys).size, keys.length);
    return keys.map((key, i) => {
      const node = tree.nodes.find(n => n.key === key); assert.ok(node);
      assert.equal(node.parent, keys[i + 1] ?? null); return node;
    });
  };
  const rp = nodesFor(reference, proof.referencePath, proof.referenceNode);
  const cp = nodesFor(candidate, proof.candidatePath, proof.candidateNode);
  const referencePath = rp.map(n => ({ node: n.key, type: n.type,
    attributes: n.attributes, computed: reference.styles[n.style]?.[property] ?? '<missing>',
    inline: select(n.inline), rules: n.rules.map(index => {
      const r = reference.rules[index]; assert.ok(r && typeof r.active === 'boolean');
      return { index, selector: r.selector, active: r.active, conditions: r.conditions,
        declarations: select(r.declarations) };
    }).filter(r => Object.keys(r.declarations).length) }));
  const candidatePath = cp.map(n => ({ node: n.key, authored: n.authored,
    localValues: Object.fromEntries(stages.map(stage => [stage, n[stage]?.[property] ?? '<omitted>'])),
    declarations: Object.fromEntries(stages.map(stage => [stage, select(n[stage])])),
    inline: select(n.authored.style), possibleRules: candidate.rules.flatMap((r, index) => {
      if (!rootInitialSelectorCanApply(r.selector, n.authored)) return [];
      const { selector, ...d } = r, declarations = select(d);
      return Object.keys(declarations).length ? [{ index, selector, declarations }] : [];
    }) }));
  const requests = [
    ...referencePath.flatMap(n => [n.inline, ...n.rules.map(r => r.declarations)]),
    ...candidatePath.flatMap(n => [n.inline, ...Object.values(n.declarations), ...n.possibleRules.map(r => r.declarations)])
  ];
  return { property, referencePath, candidatePath,
    hasRelevantRequest: requests.some(d => Object.keys(d).some(k => requested.has(normalize(k)))),
    hasMotionRequest: requests.some(d => Object.keys(d).some(k => /^(animation|transition)/.test(normalize(k)))),
    ruleGaps: { missing: proof.missingRules, extra: proof.extraRules },
    candidateComputedVerified: false, inputEquivalent: false, renderingEquivalent: false,
    limitation: 'Captured owner-to-root paths only. Possible candidate rules are conservative, not proven matches. External ancestor CSSOM is separately retained, not resolved here. Motion presence is not animation activity. No initial/default classification follows from absent requests.' };
}
