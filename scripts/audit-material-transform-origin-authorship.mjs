import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { rootInitialSelectorCanApply } from '../tests/material-parity/root-initial-style-evidence.mjs';

// Read-only provenance survey, not a classifier. Candidate styles are retained
// declarations, not invented computed origins or evidence of rendered parity.
const sha = value => createHash('sha256').update(value).digest('hex');
const capturePath = 'artifacts/material-parity/current-ancestry-audit/latest-report.json';
const bytes = readFileSync(capturePath), captureSha256 = sha(bytes);
assert.equal(captureSha256, 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
const raw = JSON.parse(bytes), rows = [], treeFiles = new Map(), contexts = new Map();
const inactive = v => v === undefined || ['none', 'matrix(1,0,0,1,0,0)'].includes(v.replace(/\s/g, ''));
const relevant = k => /^(transformorigin|transformbox|all|animation.*|transition.*)$/.test(k.replaceAll('-', '').toLowerCase());
const declarations = d => Object.fromEntries(Object.entries(d ?? {}).filter(([key]) => relevant(key)));
const nonempty = d => Object.keys(d).length > 0;
const one = (nodes, id) => { assert.equal(nodes.length, 1, id); return nodes[0]; };
const loadTree = entry => {
  const data = readFileSync(entry.file); assert.equal(sha(data), entry.sha256, entry.file);
  treeFiles.set(entry.file, entry.sha256);
  const tree = JSON.parse(data); assert.deepEqual(tree.errors, [], entry.file); return tree;
};
const pathTo = (tree, leaf) => {
  const nodes = [], seen = new Set();
  for (let n = leaf; n; n = n.parent === null ? undefined : one(tree.nodes.filter(v => v.key === n.parent), n.parent)) {
    assert.ok(!seen.has(n.key)); seen.add(n.key); nodes.unshift(n);
  }
  return nodes;
};
for (const [kind, entries] of [['static', raw.results], ['interaction', raw.interactions]]) for (const entry of entries) {
  const inputs = (entry.styleInputs ?? []).filter(i => i.reference?.transformOrigin !== undefined && i.astylar?.transformOrigin === undefined &&
    inactive(i.reference?.transform) && inactive(i.astylar?.transform));
  if (!inputs.length) continue;
  const reference = loadTree(entry.inputTrees.reference), candidate = loadTree(entry.inputTrees.astylar);
  assert.equal(candidate.resolvedStyleEvidenceVersion, 2); assert.equal(candidate.resolvedStyleSource, 'core-style-inspection');
  for (const input of inputs) {
    const refNodes = reference.nodes.filter(n => n.attributes?.id === input.id), astNodes = candidate.nodes.filter(n => n.authored?.id === input.id);
    const row = { case: `${kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`,
      family: entry.family, element: input.id, referenceTree: entry.inputTrees.reference, candidateTree: entry.inputTrees.astylar };
    if (refNodes.length !== 1 || astNodes.length !== 1) {
      const context = { mappingGap: true, element: input.id, referenceIdMatches: refNodes.length, candidateIdMatches: astNodes.length };
      const hash = sha(JSON.stringify(context)); contexts.set(hash, context); rows.push({ ...row, context: hash }); continue;
    }
    const rn = refNodes[0], an = astNodes[0];
    const rs = reference.styles[rn.style]; assert.equal(rs.transformOrigin, input.reference.transformOrigin);
    const refPath = pathTo(reference, rn).map(n => ({ key: n.key, type: n.type,
      inline: declarations(n.inline), rules: n.rules.map(i => reference.rules[i]).filter(r => nonempty(declarations(r.declarations)))
        .map(r => ({ source: r.source, selector: r.selector, active: r.active, conditions: r.conditions, declarations: declarations(r.declarations) })) }));
    const candidatePath = pathTo(candidate, an).map(n => ({ key: n.key, type: n.authored.type ?? '<synthetic-root>',
      inline: declarations(n.authored.style), rules: candidate.rules.filter(r => rootInitialSelectorCanApply(r.selector, n.authored) && nonempty(declarations(r)))
        .map(r => ({ selector: r.selector, declarations: declarations(r) })) }));
    const stages = Object.fromEntries(['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle'].map(s => [s, declarations(an[s])]));
    const context = { referenceType: rn.type, candidateType: an.authored.type, referenceDisplay: rs.display,
      referenceTransformOrigin: rs.transformOrigin, referenceTransform: rs.transform, referenceTransformBox: rs.transformBox ?? '<not-captured>',
      referenceBoxSizing: rs.boxSizing, referenceWidth: rs.width, referenceHeight: rs.height,
      referencePath: refPath, candidatePath, candidateStages: stages };
    const hash = sha(JSON.stringify(context)); contexts.set(hash, context);
    rows.push({ ...row, referenceNode: rn.key, candidateNode: an.key, context: hash });
  }
}
assert.equal(rows.length, 6938);
const count = predicate => rows.filter(row => !contexts.get(row.context).mappingGap && predicate(contexts.get(row.context))).length;
const referenceRequests = (context, pattern) => context.referencePath.some(n => [n.inline, ...n.rules.map(r => r.declarations)]
  .some(d => Object.keys(d).some(key => pattern.test(key.replaceAll('-', '').toLowerCase()))));
const typePairs = {}, mappingGaps = {};
for (const row of rows) {
  const c = contexts.get(row.context);
  if (c.mappingGap) {
    const gap = mappingGaps[row.element] ??= { ...c, observations: 0 };
    assert.equal(gap.referenceIdMatches, c.referenceIdMatches); assert.equal(gap.candidateIdMatches, c.candidateIdMatches);
    gap.observations++; continue;
  }
  const k = `${c.referenceType}/${c.candidateType}`; typePairs[k] = (typePairs[k] ?? 0) + 1;
}
const sourceFiles = ['scripts/audit-material-transform-origin-authorship.mjs', 'tests/material-parity/root-initial-style-evidence.mjs', 'tests/material-parity/border-initial-input-evidence.mjs'];
console.log(JSON.stringify({ schemaVersion: 1, capturePath, captureSha256,
  scope: 'Full pinned raw origin population and both captured ancestry trees; read-only declaration/provenance survey, not classification or computed candidate origin proof.',
  observations: rows.length, directlyMappedObservations: count(() => true), mappingGaps, uniqueContexts: contexts.size, treeFiles: treeFiles.size,
  orderedRowsSha256: sha(JSON.stringify(rows)), orderedContextsSha256: sha(JSON.stringify([...contexts])), typePairs,
  referenceWithRelevantPathRequests: count(c => c.referencePath.some(n => nonempty(n.inline) || n.rules.length)),
  referenceWithOriginBoxOrResetPathRequests: count(c => referenceRequests(c, /^(transformorigin|transformbox|all)$/)),
  referenceWithAnimationOrTransitionPathRequests: count(c => referenceRequests(c, /^(animation|transition)/)),
  candidateWithPotentialRelevantPathRequests: count(c => c.candidatePath.some(n => nonempty(n.inline) || n.rules.length)),
  candidateWithRelevantRetainedStageValues: count(c => Object.values(c.candidateStages).some(nonempty)),
  withoutCapturedTransformBox: count(c => c.referenceTransformBox === '<not-captured>'),
  contextSamples: [...contexts].slice(0, 3).map(([hash, context]) => ({ hash, context })),
  limitations: ['Context samples are illustrations only; all reported counts and hashes traverse all 6938 observations.',
    'Direct-ID mapping gaps remain explicit; generated aliases need independently proven mappings. Declaration counts only concern directly mapped observations.',
    'Candidate selector filtering is conservative possible applicability, not a computed cascade or state winner.',
    'Ancestry ends at the captured frame/synthetic root. Absence of requests does not prove browser UA rules, uncaptured outer scopes, transform-box semantics, reference-box equality or candidate computed defaults.',
    'All origin groups remain unresolved. No existing attribution, report or fixture is rewritten.'],
  sourceFingerprints: sourceFiles.map(file => ({ file, sha256: sha(readFileSync(file, 'utf8').replace(/\r\n/g, '\n')) })) }));
