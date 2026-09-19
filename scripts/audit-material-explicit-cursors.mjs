import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { inspectVerticalAlignPopulationInput } from './audit-material-vertical-align-population.mjs';
import { rootInitialSelectorCanApply } from '../tests/material-parity/root-initial-style-evidence.mjs';

const hash = x => createHash('sha256').update(x).digest('hex');
const digest = x => hash(JSON.stringify(x));
const own = (o, k) => Object.hasOwn(o ?? {}, k) ? o[k] : '<omitted>';
const relevant = key => ['cursor', 'all', 'pointerevents'].includes(key.replaceAll('-', '').toLowerCase());
const pick = o => Object.fromEntries(Object.entries(o ?? {}).filter(([k]) => relevant(k)));
const stages = ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle'];
const target = 'docs/material-explicit-cursor-inputs.json';

function ancestors(tree, key) {
  const byKey = new Map(tree.nodes.map(n => [n.key, n])), result = [], seen = new Set();
  assert.equal(byKey.size, tree.nodes.length);
  while (key !== null) {
    assert.ok(!seen.has(key), 'cyclic cursor ancestry'); seen.add(key);
    const node = byKey.get(key); assert.ok(node, 'missing cursor ancestor');
    result.push(node); key = node.parent;
  }
  return result;
}

// Reuse only the exact original scalar/tree identity proof. Its vertical-align
// classification is not a cursor classification, cascade or hit-test result.
export function inspectExplicitCursor(input, reference, candidate, family) {
  assert.ok(['default', 'pointer'].includes(input.reference?.cursor));
  assert.ok(['default', 'pointer'].includes(input.astylar?.cursor));
  assert.notEqual(input.reference.cursor, input.astylar.cursor);
  const identity = inspectVerticalAlignPopulationInput(input, reference, candidate, family);
  assert.ok(identity.referenceOwner && identity.candidateOwner, 'unproved cursor owner identity');
  const rp = ancestors(reference, identity.referenceOwner.key), cp = ancestors(candidate, identity.candidateOwner.key);
  const referencePath = rp.map(n => ({ node: n.key, type: n.type, attributes: n.attributes,
    computed: { cursor: reference.styles[n.style].cursor, pointerEvents: reference.styles[n.style].pointerEvents },
    inline: pick(n.inline), requests: n.rules.map(index => {
      const r = reference.rules[index]; assert.ok(r && typeof r.active === 'boolean');
      return { index, source: r.source, selector: r.selector, active: r.active,
        conditions: r.conditions, declarations: pick(r.declarations) };
    }).filter(r => Object.keys(r.declarations).length) }));
  const candidatePath = cp.map(n => ({ node: n.key, authored: n.authored,
    values: Object.fromEntries(stages.map(s => [s, { cursor: own(n[s], 'cursor'), pointerEvents: own(n[s], 'pointerEvents') }])),
    inline: pick(n.authored.style), possibleRules: candidate.rules.flatMap((r, index) => {
      if (!n.authored.type || !rootInitialSelectorCanApply(r.selector, n.authored)) return [];
      const declarations = pick(r);
      return Object.keys(declarations).length ? [{ index, selector: r.selector, declarations,
        mediaMinWidth: own(r, 'mediaMinWidth'), mediaMaxWidth: own(r, 'mediaMaxWidth') }] : [];
    }) }));
  const cursorRequests = n => n.possibleRules.filter(r => Object.keys(r.declarations).some(k =>
    ['cursor', 'all'].includes(k.toLowerCase()))).length || Object.keys(n.inline).some(k => ['cursor', 'all'].includes(k.toLowerCase()));
  const ownRequest = !!cursorRequests(candidatePath[0]), ancestorRequest = candidatePath.slice(1).some(cursorRequests);
  return { reference: input.reference.cursor, candidate: input.astylar.cursor,
    identity: identity.mapping, referencePath, candidatePath,
    candidateRequestScope: ownRequest ? 'owner-request' : ancestorRequest ? 'ancestor-request' : 'no-captured-request',
    scalarDifferenceVerified: true, actualHitTargetVerified: false, effectivePointerCursorVerified: false,
    cascadeWinnerVerified: false, historicalCauseVerified: false, inputEquivalent: false,
    renderingEquivalent: false, rendererCauseProven: false };
}

export function collectExplicitCursors() {
  const file = 'artifacts/material-parity/current-ancestry-audit/latest-report.json', bytes = readFileSync(file);
  assert.equal(hash(bytes), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const raw = JSON.parse(bytes), groups = new Map(), patterns = [], patternIndex = new Map(), findings = [], seen = new Set();
  const boundary = realpathSync('artifacts/material-parity') + path.sep;
  const load = d => {
    const file = realpathSync(d.file); assert.ok(file.startsWith(boundary));
    const bytes = readFileSync(file); assert.equal(hash(bytes), d.sha256); return JSON.parse(bytes);
  };
  let equal = 0, auto = 0, missing = 0;
  for (const [kind, entries] of [['static', raw.results], ['interaction', raw.interactions]]) for (const e of entries) {
    const caseId = `${kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`;
    assert.ok(!seen.has(caseId)); seen.add(caseId);
    const selected = e.styleInputs.filter(i => {
      if (!i.reference || !i.astylar) { missing++; return false; }
      if (i.reference.cursor === i.astylar.cursor) { equal++; return false; }
      if ([i.reference.cursor, i.astylar.cursor].includes('auto')) { auto++; return false; }
      return true;
    });
    if (!selected.length) continue;
    const reference = load(e.inputTrees.reference), candidate = load(e.inputTrees.astylar);
    for (const input of selected) {
      const proof = inspectExplicitCursor(input, reference, candidate, e.family), sha256 = digest(proof);
      if (!patternIndex.has(sha256)) { patternIndex.set(sha256, patterns.length); patterns.push({ sha256, proof }); }
      const pattern = patternIndex.get(sha256), key = JSON.stringify([e.family, input.id, proof.reference, proof.candidate]);
      if (!groups.has(key)) groups.set(key, { family: e.family, element: input.id, property: 'cursor',
        reference: proof.reference, candidate: proof.candidate, cases: [], patterns: [], requestScopes: {} });
      const group = groups.get(key); group.cases.push(caseId);
      if (!group.patterns.includes(pattern)) group.patterns.push(pattern);
      group.requestScopes[proof.candidateRequestScope] = (group.requestScopes[proof.candidateRequestScope] ?? 0) + 1;
      findings.push({ case: caseId, family: e.family, element: input.id, property: 'cursor',
        originalInputSha256: digest(input), inputTrees: e.inputTrees, pattern,
        caseLevelCursorProbeNotOwnerEvidence: kind === 'interaction' ? e.cursor ?? null : null });
    }
  }
  assert.equal(seen.size, 2311); assert.equal(groups.size, 19); assert.equal(findings.length, 763);
  const sources = ['scripts/audit-material-explicit-cursors.mjs', 'scripts/audit-material-vertical-align-population.mjs',
    'tests/material-parity/root-initial-style-evidence.mjs', 'tests/material-parity/origin-alias-mapping-evidence.mjs',
    'tests/material-parity/generated-node-mapping-evidence.mjs', 'tests/material-parity/input-equivalence-audit.mjs',
    'tests/material-parity/run-material-parity.mjs', 'tests/material-parity/cursor-metrics.mjs',
    'examples/material-showcase/src/app/astylar.component.ts', 'src/app/services/dom/style-defaults.service.ts',
    'src/app/config/browser-defaults.ts', 'src/app/services/dom/style.service.ts',
    'examples/material-showcase/node_modules/@angular/material/fesm2022/button.mjs'];
  return { schemaVersion: 1, kind: 'original-explicit-cursor-owner-ancestry-survey',
    originalCapture: { file, sha256: hash(bytes) },
    sourceFingerprints: sources.map(file => ({ file, sha256: hash(readFileSync(file, 'utf8').replaceAll('\r\n', '\n')) })),
    casesScanned: seen.size, groupCount: groups.size, observations: findings.length,
    equalScalarObservations: equal, autoCursorObservationsRetainedOutsideScope: auto, missingScalarObservations: missing,
    groups: [...groups.values()], patterns, findings,
    canonicalAttributionChanged: false, inputEquivalent: false, renderingEquivalent: false,
    limits: ['Owner style differences are not effective cursor observations at the same hit target.',
      'Only the existing hover action has an effective-cursor probe; untested states are not passes.',
      'Ancestor requests are retained without inventing a cursor inheritance or cascade winner.',
      'Possible rules over-approximate selector applicability; no replacement cascade engine is used.',
      'Auto cursor differences and one-sided scalar observations are counted and remain outside this review.',
      'No renderer, canonical inputs or canonical classification is changed.'] };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2); assert.ok(!args.length || args.length === 1 && args[0] === '--check');
  const report = collectExplicitCursors(), output = JSON.stringify(report, null, 2) + '\n';
  if (args[0] === '--check') assert.equal(readFileSync(target, 'utf8').replaceAll('\r\n', '\n'), output);
  else writeFileSync(target, output);
  console.log(JSON.stringify({ file: target, sha256: hash(output), groups: report.groupCount,
    observations: report.observations, patterns: report.patterns.length,
    scopes: report.groups.map(g => ({ element: g.element, occurrences: g.cases.length, scopes: g.requestScopes })) }));
}
