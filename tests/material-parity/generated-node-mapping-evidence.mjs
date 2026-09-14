import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, relative, isAbsolute } from 'node:path';
import { isDeepStrictEqual } from 'node:util';

export const mappingTargets = {
  'badge-count': { family: 'badge', selector: '#badge-primary .mat-badge-content', type: 'span' },
  'stepper-content': { family: 'stepper', selector: '[data-parity-id="stepper-content"] (active panel)', type: 'span' },
  'bottom-sheet-overlay': { family: 'bottom-sheet', selector: '.cdk-global-overlay-wrapper', type: 'div' },
  'snack-bar-overlay': { family: 'snack-bar', selector: '.cdk-global-overlay-wrapper', type: 'div' },
  'snack-bar-surface': { family: 'snack-bar', selector: '.mdc-snackbar__surface', type: 'div' },
  'tooltip-popup': { family: 'tooltip', selector: '.mat-mdc-tooltip-surface', type: 'div' },
};
const hasClass = (node, name) => String(node?.attributes?.class ?? '').split(/\s+/).includes(name);
const one = values => values.length === 1 ? values[0] : undefined;
const hash = value => createHash('sha256').update(value).digest('hex');
const compact = node => ({ key: node.key, parent: node.parent, type: node.type, attributes: node.attributes });

// Read-only correspondence proof, not a CSS selector implementation or a
// visibility oracle. Match only the reviewed harness aliases and owner chains.
export function resolveGeneratedReferenceNode(tree, element, family) {
  const target = mappingTargets[element];
  const reject = reason => ({ status: 'unresolved', reason });
  if (!target || target.family !== family) return reject('unreviewed target or family');
  if (tree?.schemaVersion !== 1 || !Array.isArray(tree.nodes) || !Array.isArray(tree.styles) || !Array.isArray(tree.rules) ||
      !Array.isArray(tree.errors) || tree.errors.length || new Set(tree.nodes.map(n => n.key)).size !== tree.nodes.length)
    return reject('missing, erroneous or ambiguous captured tree');
  const byKey = new Map(tree.nodes.map(n => [n.key, n]));
  const chain = node => {
    const result = [], seen = new Set();
    while (node) {
      if (seen.has(node.key)) return undefined;
      seen.add(node.key); result.push(node);
      if (node.parent === null) return result;
      node = byKey.get(node.parent);
    }
    return undefined;
  };
  const ancestry = node => chain(node)?.slice(1) ?? [];
  const inOverlay = node => ancestry(node).some(n => hasClass(n, 'cdk-overlay-container') && n.parent === null);
  const named = name => tree.nodes.filter(n => n.attributes?.id === name);
  // The harness resolves a real id before either parity attributes or aliases.
  if (named(element).length) return reject('direct id shadows reviewed alias');
  let nodes, selected, owners = [], rejected = [];
  if (element === 'stepper-content') {
    nodes = tree.nodes.filter(n => n.attributes?.['data-parity-id'] === element);
    const host = one(named('stepper-primary'));
    if (!host || host.type !== 'mat-stepper' || host.attributes.role !== 'tablist' || nodes.length !== 2)
      return reject('stepper host or two content instances missing');
    const active = [];
    for (const node of nodes) {
      const panel = byKey.get(node.parent), style = tree.styles[node.style], panelStyle = tree.styles[panel?.style];
      if (node.type !== 'span' || !panel || panel.attributes?.role !== 'tabpanel' || !ancestry(node).includes(host) ||
          !style || !panelStyle) return reject('content panel ownership missing');
      const header = one(named(panel.attributes['aria-labelledby']));
      if (!header || header.attributes.role !== 'tab' || header.attributes['aria-controls'] !== panel.attributes.id ||
          !ancestry(header).includes(host)) return reject('panel/header linkage missing');
      if (hasClass(panel, 'mat-horizontal-stepper-content-current') && header.attributes['aria-selected'] === 'true' &&
          !Object.hasOwn(panel.attributes, 'inert') && style.visibility === 'visible' && panelStyle.visibility === 'visible' &&
          panelStyle.display !== 'none' && /^\d+(?:\.\d+)?px$/.test(panelStyle.width) && parseFloat(panelStyle.width) > 0 &&
          /^\d+(?:\.\d+)?px$/.test(panelStyle.height) && parseFloat(panelStyle.height) > 0) {
        active.push(node); owners.push(panel, header, host);
      } else if (header.attributes['aria-selected'] === 'false' && Object.hasOwn(panel.attributes, 'inert') &&
          style.visibility === 'hidden' && panelStyle.visibility === 'hidden' && panelStyle.height === '0px') {
        rejected.push({ node: compact(node), panel: compact(panel), header: compact(header), reason: 'inactive inert hidden panel' });
      } else return reject('stepper state not independently established');
    }
    selected = one(active);
    if (!selected || rejected.length !== 1) return reject('active stepper mapping is not unique');
  } else {
    if (tree.nodes.some(n => n.attributes?.['data-parity-id'] === element)) return reject('parity id shadows reviewed alias');
    const cls = element === 'badge-count' ? 'mat-badge-content' : element === 'tooltip-popup' ? 'mat-mdc-tooltip-surface'
      : element === 'snack-bar-surface' ? 'mdc-snackbar__surface' : 'cdk-global-overlay-wrapper';
    nodes = tree.nodes.filter(n => hasClass(n, cls));
    if (element === 'badge-count') {
      const host = one(named('badge-primary'));
      if (!host || !hasClass(host, 'mat-badge')) return reject('badge owner missing');
      nodes = nodes.filter(n => ancestry(n).includes(host)); owners = [host];
    }
    selected = one(nodes);
    if (!selected) return reject(nodes.length ? 'alias is ambiguous' : 'alias absent in captured roots');
    if (element !== 'badge-count') {
      if (!inOverlay(selected)) return reject('generated target is outside captured overlay owner');
      const subtree = tree.nodes.filter(n => n === selected || ancestry(n).includes(selected));
      const containerType = family === 'bottom-sheet' ? 'mat-bottom-sheet-container' : family === 'snack-bar' ? 'mat-snack-bar-container' : 'mat-tooltip-component';
      const owner = one([...ancestry(selected), ...subtree].filter(n => n.type === containerType));
      if (!owner || !inOverlay(owner)) return reject('component overlay owner missing or ambiguous');
      owners = [owner, ...ancestry(selected).filter(n => hasClass(n, 'cdk-overlay-container') || hasClass(n, 'cdk-overlay-pane'))];
    }
  }
  if (selected.type !== target.type || !chain(selected)) return reject('target type or ancestry changed');
  if (element === 'stepper-content' && chain(selected).some(n => !tree.styles[n.style] || tree.styles[n.style].display === 'none'))
    return reject('active content has missing or non-rendering ancestor style');
  return { status: 'mapped', selector: target.selector, node: compact(selected),
    owners: [...new Map(owners.map(n => [n.key, compact(n)])).values()], rejected,
    styleIndex: selected.style, ruleIndices: selected.rules, ownText: selected.ownText };
}

export function checkGeneratedMappingPair(entry, referenceTree, candidateTree, element) {
  const proof = resolveGeneratedReferenceNode(referenceTree, element, entry.family);
  if (proof.status !== 'mapped') return proof;
  const input = one((entry.styleInputs ?? []).filter(i => i.id === element));
  const candidate = one((candidateTree?.nodes ?? []).filter(n => n.authored?.id === element));
  const errors = [];
  if (!input || input.astylarResolvedStyleEvidenceVersion !== 2 || !candidate || candidateTree?.errors?.length !== 0 || candidateTree?.resolvedStyleEvidenceVersion !== 2 ||
      candidateTree.resolvedStyleSource !== 'core-style-inspection' || !Number.isInteger(candidateTree.resolvedStyleRevision) ||
      candidateTree.resolvedStyleRevision < 0 || new Set(candidateTree.nodes.map(n => n.key)).size !== candidateTree.nodes.length)
    return { ...proof, status: 'unresolved', reason: 'missing unique scalar/candidate evidence or core provenance' };
  const reference = referenceTree.styles[proof.styleIndex];
  if (input.referenceStructure?.schemaVersion !== 2 || input.referenceStructure.type !== proof.node.type ||
      input.astylarStructure?.schemaVersion !== 2 || input.astylarStructure.type !== candidate.authored.type)
    errors.push('scalar structure does not match captured owner');
  // Frozen scalar schema has 89 fields. A shortened snapshot must not pass by
  // comparing only its surviving keys; the case-index test binds the exact set.
  if (!input.reference || !reference || Object.keys(input.reference).length !== 89 ||
      Object.entries(input.reference).some(([key, value]) => reference[key] !== value)) errors.push('reference scalar styles differ from selected tree node');
  const node = referenceTree.nodes.find(n => n.key === proof.node.key);
  if (!referenceTree.nodes.some(n => n.parent === node.key) &&
      String(input.referenceStructure?.text ?? '').replace(/\s+/g, ' ').trim() !== String(node.ownText ?? '').replace(/\s+/g, ' ').trim())
    errors.push('reference scalar leaf text differs from selected tree node');
  const expectedRules = node.rules.map(i => referenceTree.rules[i]).filter(r => r?.active === true)
    .map(r => ({ selector: r.selector, declarations: r.declarations }));
  if (Object.keys(node.inline ?? {}).length) expectedRules.push({ selector: '<inline>', declarations: node.inline });
  const actualRules = input.referenceAuthored?.map(r => ({ selector: r.selector, declarations: r.declarations }));
  const missingScalarRules = expectedRules.filter(r => !actualRules?.some(a => isDeepStrictEqual(a, r)));
  const extraScalarRules = actualRules?.filter(r => !expectedRules.some(a => isDeepStrictEqual(a, r))) ?? [];
  if (!isDeepStrictEqual(expectedRules, actualRules)) errors.push('reference scalar authored rules differ from selected tree node');
  for (const [scalar, stage] of [['astylar', 'resolvedStyle'], ['astylarNormalResolvedStyle', 'normalResolvedStyle'],
    ['astylarInteractionResolvedStyle', 'interactionResolvedStyle']]) {
    if (!input[scalar] || !candidate[stage] || !isDeepStrictEqual(input[scalar], candidate[stage])) errors.push(`${scalar} differs from candidate tree`);
  }
  return { ...proof, status: errors.length ? 'unresolved' : 'mapped', errors,
    missingScalarRules, extraScalarRules,
    candidate: { key: candidate.key, parent: candidate.parent, authored: candidate.authored },
    checkedReferenceProperties: Object.keys(input.reference ?? {}).length, inputEquivalent: false,
    claim: 'Node correspondence and independently captured scalar/tree consistency only; no style, structure, interaction or raster equivalence inferred.' };
}

export function buildGeneratedMappingAudit(report, root = process.cwd()) {
  const artifactRoot = resolve(root, 'artifacts/material-parity'), cache = new Map(), observations = [];
  const load = ref => {
    if (!ref?.file || !/^[a-f0-9]{64}$/.test(ref.sha256 ?? '')) throw new Error('invalid input-tree reference');
    const file = resolve(root, ref.file), rel = relative(artifactRoot, file);
    if (isAbsolute(rel) || rel === '..' || rel.startsWith('..\\') || rel.startsWith('../')) throw new Error('tree outside Material artifacts');
    if (!cache.has(file)) { const bytes = readFileSync(file); cache.set(file, { sha256: hash(bytes), tree: JSON.parse(bytes) }); }
    const item = cache.get(file);
    if (item.sha256 !== ref.sha256) throw new Error(`input-tree hash mismatch: ${ref.file}`);
    return item.tree;
  };
  for (const [kind, entries] of [['static', report.results], ['interaction', report.interactions]]) for (const entry of entries) {
    const key = `${kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`;
    const targets = Object.entries(mappingTargets).filter(([, t]) => t.family === entry.family);
    if (!targets.length) continue;
    const reference = load(entry.inputTrees.reference), candidate = load(entry.inputTrees.astylar);
    for (const [element] of targets) {
      // Keep closed/unmapped boundaries visible; absence is not a passing mapping.
      const inputs = entry.styleInputs.filter(i => i.id === element), scalarCount = inputs.length;
      observations.push({ case: key, element, inputTrees: entry.inputTrees, scalarCount,
        referenceScalarPresent: inputs.some(i => i.reference !== undefined),
        candidateScalarPresent: inputs.some(i => i.astylar !== undefined),
        candidateKeys: candidate.nodes.filter(n => n.authored?.id === element).map(n => n.key),
        ...checkGeneratedMappingPair(entry, reference, candidate, element) });
    }
  }
  return { schemaVersion: 1, observations, summary: {
    observations: observations.length, scalarObservations: observations.filter(o => o.scalarCount > 0).length,
    mapped: observations.filter(o => o.status === 'mapped').length,
    unresolvedWithScalar: observations.filter(o => o.scalarCount > 0 && o.status !== 'mapped').length,
    pairedScalarObservations: observations.filter(o => o.referenceScalarPresent && o.candidateScalarPresent).length,
    unresolvedPairedScalar: observations.filter(o => o.referenceScalarPresent && o.candidateScalarPresent && o.status !== 'mapped').length,
    oneSidedScalar: observations.filter(o => o.referenceScalarPresent !== o.candidateScalarPresent).length,
    boundariesWithoutScalar: observations.filter(o => o.scalarCount === 0).length,
  } };
}
