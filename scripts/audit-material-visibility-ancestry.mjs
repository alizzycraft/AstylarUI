import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { resolveGeneratedReferenceNode, mappingTargets } from '../tests/material-parity/generated-node-mapping-evidence.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const populationFile = 'docs/material-visibility-input-population.json';
const populationHash = '2ca5eb09c5ebdcd6236225ee8bd64cce4a9f7061f78a29bd54a5bd22bfa8fb18';
const hasClass = (n, cls) => String(n.attributes?.class ?? '').split(/\s+/).includes(cls);
const one = nodes => { assert.equal(nodes.length, 1, 'owner must be unique'); return nodes[0]; };

export function visibilityOwnerChain(tree, key, side) {
  assert.equal(new Set(tree.nodes.map(n => n.key)).size, tree.nodes.length, 'duplicate node key');
  const byKey = new Map(tree.nodes.map(n => [n.key, n])), seen = new Set(), chain = [];
  let node = byKey.get(key); assert.ok(node, 'missing owner');
  while (node) {
    assert.ok(!seen.has(node.key), 'cyclic ancestry'); seen.add(node.key);
    if (side === 'astylar' && node.key === 'root' && node.resolvedStyle === undefined) {
      assert.deepEqual(node, { key: 'root', parent: null, authored: {} });
      chain.push({ key: node.key, visibilityNotCaptured: true }); break;
    }
    const style = side === 'reference' ? tree.styles[node.style] : node.resolvedStyle;
    assert.ok(style, 'missing style');
    const rules = side === 'reference' ? node.rules.map(index => {
      const rule = tree.rules[index]; assert.ok(rule, 'missing rule'); return rule;
    }).filter(r => r.active && Object.hasOwn(r.declarations, 'visibility')) : [];
    chain.push({ key: node.key, type: node.type ?? node.authored.type,
      visibility: { present: Object.hasOwn(style, 'visibility'), value: style.visibility ?? null },
      rules: rules.map(r => ({ selector: r.selector, declaration: r.declarations.visibility })),
      ...(side === 'reference' && Object.hasOwn(node.inline ?? {}, 'visibility') ? { inlineVisibility: node.inline.visibility } : {}) });
    if (node.parent === null) break;
    node = byKey.get(node.parent); assert.ok(node, 'missing parent');
  }
  return chain;
}

export function resolveVisibilityOwner(tree, family, element) {
  assert.deepEqual(tree.errors, []);
  const direct = tree.nodes.filter(n => n.attributes?.id === element);
  if (direct.length) return one(direct);
  const parity = tree.nodes.filter(n => n.attributes?.['data-parity-id'] === element
    && tree.styles[n.style]?.visibility === 'visible');
  if (parity.length) return one(parity);
  if (mappingTargets[element]) {
    const mapping = resolveGeneratedReferenceNode(tree, element, family);
    assert.equal(mapping.status, 'mapped', mapping.reason);
    return one(tree.nodes.filter(n => n.key === mapping.node.key));
  }
  const cls = element === 'dialog-panel' ? 'mat-mdc-dialog-surface'
    : element === 'bottom-sheet-panel' ? 'mat-bottom-sheet-container' : null;
  if (cls) return one(tree.nodes.filter(n => hasClass(n, cls)));
  assert.ok(['bottom-sheet-copy', 'bottom-sheet-dismiss'].includes(element), 'unreviewed owner alias');
  const panel = one(tree.nodes.filter(n => hasClass(n, 'mat-bottom-sheet-container')));
  const items = tree.nodes.filter(n => hasClass(n, 'mat-mdc-list-item')
    && visibilityOwnerChain(tree, n.key, 'reference').some(a => a.key === panel.key));
  assert.equal(items.length, 2); assert.equal(items[0].type, 'a'); assert.equal(items[1].type, 'a');
  assert.equal(items[0].parent, items[1].parent);
  const siblings = tree.nodes.filter(n => n.parent === items[0].parent && n.type === 'a');
  assert.deepEqual(siblings, items, 'nth-of-type mapping differs');
  return items[element === 'bottom-sheet-copy' ? 1 : 0];
}

export function collectVisibilityAncestry() {
  const bytes = readFileSync(populationFile); assert.equal(hash(bytes), populationHash);
  const population = JSON.parse(bytes), cache = new Map();
  function load(receipt) {
    if (!cache.has(receipt.file)) {
      const bytes = readFileSync(receipt.file);
      cache.set(receipt.file, { sha256: hash(bytes), tree: JSON.parse(bytes) });
    }
    const saved = cache.get(receipt.file); assert.equal(saved.sha256, receipt.sha256);
    return saved.tree;
  }
  const groups = population.groups.map(group => {
    const observations = group.observations.map(o => {
      const chains = {};
      for (const side of ['reference', 'astylar']) {
        const tree = load(o.inputTrees[side]); assert.deepEqual(tree.errors, []);
        const node = side === 'reference' ? resolveVisibilityOwner(tree, group.family, group.element)
          : one(tree.nodes.filter(n => n.authored?.id === group.element));
        assert.equal(node.type ?? node.authored.type, side === 'reference' ? o.referenceType : o.candidateType);
        chains[side] = visibilityOwnerChain(tree, node.key, side);
        assert.deepEqual(chains[side][0].visibility, side === 'reference' ? o.reference : o.candidate);
      }
      return { case: o.case, inputSha256: o.inputSha256, inputTrees: o.inputTrees, chains };
    });
    return { family: group.family, element: group.element, observations,
      counts: { observations: observations.length,
        referenceVisibilityRuleOwners: observations.filter(o => o.chains.reference.some(n => n.rules?.length || n.inlineVisibility)).length,
        referenceHiddenAncestors: observations.filter(o => o.chains.reference.some(n => n.visibility?.value === 'hidden')).length,
        candidateExplicitVisibility: observations.filter(o => o.chains.astylar.some(n => n.visibility?.present)).length },
      classification: 'pending-state-owner-review' };
  });
  return { schemaVersion: 1, population: { file: populationFile, sha256: populationHash },
    counts: { groups: groups.length, observations: groups.reduce((n, g) => n + g.observations.length, 0), authenticatedTrees: cache.size },
    groups, canonicalAttributionChanged: false,
    limitation: 'Ancestry establishes rule involvement, not equivalence of absent candidate visibility or the cause of overlay failures.' };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const report = collectVisibilityAncestry();
  writeFileSync('docs/material-visibility-ancestry.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ ...report.counts, groups: report.groups.map(({ family, element, counts }) => ({ family, element, ...counts })) }, null, 2));
}
