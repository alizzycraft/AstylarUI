import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { collectButtonPaintAllStates } from './audit-material-button-paint-all-states.mjs';
import { bindOwnerCaretNormalization } from '../tests/material-parity/owner-caret-source-binding.mjs';
import { readCaretConservationRows } from '../tests/material-parity/owner-caret-canonical-conservation.mjs';

const hash = x => createHash('sha256').update(x).digest('hex');
const digest = x => hash(JSON.stringify(x));
const same = (a, b, message) => assert.ok(isDeepStrictEqual(a, b), message);
const revision = '67db724e5f258c84cfdc70e9da2ccb6ee6353ad0';
const sourceFile = 'docs/material-button-paint-all-states.json';
const sourceHash = 'd73d512b70e0e4924c09d0c27ffce9469e087feb4a21314c19be26b235e6d5b9';
const signature = r => JSON.stringify([r.family, r.element, r.property, r.reference, r.astylar]);

// Pure proposal only. The caller must authenticate/replay the complete source
// census. Never promote a partial, mixed-active or previously reviewed group.
export function planButtonPaintAttribution(source, rows, normalize) {
  assert.equal(source.kind, 'shared-button-all-state-paint-input-census');
  assert.equal(source.casesScanned, 2311); assert.equal(source.observations, 600);
  assert.equal(source.findings.length, source.observations);
  assert.equal(source.preservedHistoricalObservations, 146);
  for (const flag of ['canonicalAttributionChanged', 'inputEquivalent', 'renderingEquivalent']) assert.equal(source[flag], false);
  const groups = new Map(), identities = new Set(), equalScalars = [];
  let activeCount = 0;
  for (const f of source.findings) {
    const identity = JSON.stringify([f.case, f.element]); assert.ok(!identities.has(identity)); identities.add(identity);
    const pattern = source.patterns[f.pattern]; assert.ok(pattern); assert.equal(pattern.sha256, digest(pattern.proof));
    const p = pattern.proof; assert.equal(p.element, f.element);
    assert.equal(p.candidate.descendantCount, 0);
    for (const flag of ['inputEquivalent', 'renderingEquivalent', 'rendererCauseProven']) assert.equal(p[flag], false);
    assert.ok(['0', '0.08', '0.12'].includes(p.reference.pseudo.opacity));
    const active = Number(p.reference.pseudo.opacity) > 0;
    assert.equal(p.classification, active ? 'application-plugin-authoring-defect' : 'inactive-control-retained-for-review');
    if (active) activeCount++;
    const reference = normalize({ backgroundColor: p.reference.hostBackground }).backgroundColor;
    const astylar = normalize(p.candidate.effective).backgroundColor;
    assert.equal(typeof reference, 'string'); assert.equal(typeof astylar, 'string');
    const observation = { case: f.case, state: f.state, originalInputSha256: f.originalInputSha256,
      inputTrees: f.inputTrees, proofSha256: pattern.sha256, activeLayer: active };
    if (reference === astylar) { equalScalars.push({ family: f.family, element: f.element, ...observation }); continue; }
    const owner = { family: f.family, element: f.element, property: 'backgroundColor', reference, astylar };
    const key = signature(owner);
    if (!groups.has(key)) groups.set(key, { ...owner, observations: [] });
    groups.get(key).observations.push(observation);
  }
  assert.equal(activeCount, source.activeLayerObservations); assert.equal(activeCount, 235);
  assert.equal(source.inactiveLayerObservations, source.observations - activeCount);
  const proposed = [], retained = [], selected = new Set();
  for (const g of groups.values()) {
    const matches = rows.filter(r => signature(r) === signature(g));
    const cases = g.observations.map(o => o.case), states = [...new Set(g.observations.map(o => o.state))];
    const joined = { ...g, occurrences: cases.length, states,
      canonicalMatches: matches.map(r => ({ attribution: r.attribution, occurrences: r.occurrences,
        cases: r.cases, states: r.states, canonicalRowSha256: digest(r) })) };
    if (matches.length !== 1) { retained.push({ ...joined, reason: 'missing-or-ambiguous-canonical-group' }); continue; }
    const row = matches[0];
    if (row.attribution !== 'unresolved') { retained.push({ ...joined, reason: 'prior-classification-preserved' }); continue; }
    if (row.occurrences !== cases.length || !isDeepStrictEqual(row.cases, cases.slice(0, 12)) || !isDeepStrictEqual(row.states, states)) {
      retained.push({ ...joined, reason: 'incomplete-canonical-membership' }); continue;
    }
    if (!g.observations.every(o => o.activeLayer)) { retained.push({ ...joined, reason: 'inactive-owner-needs-separate-review' }); continue; }
    selected.add(row);
    proposed.push({ ...joined, proposedClassification: 'application-plugin-authoring-defect',
      proposedAttribution: 'reviewed-shared-button-state-paint-composition',
      recommendedOwner: 'Material comparison shared button paint authoring and core layer composition',
      justification: 'The complete captured group retains reference base background plus an active translucent child pseudo-layer, versus a candidate leaf with replacement background authoring. These are unequal composition inputs before rendering. Sibling plugin paint, state lifecycle and final pixels remain independently unproved.',
      inputEquivalent: false, renderingEquivalent: false, rendererCauseProven: false });
  }
  return { sourceObservations: identities.size, activeLayerObservations: activeCount,
    equalScalarObservations: equalScalars.length, equalScalars,
    proposedGroups: proposed.length, proposedObservations: proposed.reduce((n, g) => n + g.occurrences, 0),
    retainedGroups: retained.length, retainedObservations: retained.reduce((n, g) => n + g.occurrences, 0),
    proposed, retained, canonicalRows: rows.length,
    baselineUnresolved: rows.filter(r => r.attribution === 'unresolved').length,
    otherCompleteRows: rows.length - selected.size,
    otherOrderedRowDigestsSha256: digest(rows.filter(r => !selected.has(r)).map(digest)),
    canonicalAttributionChanged: false, inputEquivalent: false, renderingEquivalent: false };
}

export async function collectButtonPaintAttribution() {
  const bytes = readFileSync(sourceFile, 'utf8').replaceAll('\r\n', '\n'); assert.equal(hash(bytes), sourceHash);
  const source = collectButtonPaintAllStates(); same(source, JSON.parse(bytes), 'complete original source census must freshly replay');
  const productionNormalization = JSON.parse(readFileSync('docs/material-font-ownership-attribution-plan.json')).productionNormalization;
  assert.equal(productionNormalization.sha256, '8929720cf30769ac3148458bf954402466f6f296c0d764c3123cd797f1e9300e');
  const normalize = bindOwnerCaretNormalization(readFileSync(productionNormalization.module, 'utf8'), productionNormalization);
  const { manifest, rows } = await readCaretConservationRows(file => execFileSync('git',
    ['show', `${revision}:${file}`], { maxBuffer: 64 * 1024 * 1024 }));
  return { schemaVersion: 1, kind: 'source-replayed-shared-button-paint-attribution-proposal',
    sourceProof: { file: sourceFile, sha256: sourceHash }, sourceProofReplayed: true,
    canonicalRevision: revision, canonicalPayload: manifest, productionNormalization,
    scope: 'Historical proposal only. Current canonical integration and full-row conservation remain separate; no renderer or comparison behavior changes.',
    ...planButtonPaintAttribution(source, rows, normalize) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  assert.ok(process.argv.length === 2 || process.argv.length === 3 && process.argv[2] === '--check');
  const report = await collectButtonPaintAttribution(), output = JSON.stringify(report, null, 2) + '\n';
  const file = 'docs/material-shared-button-paint-attribution-plan.json';
  if (process.argv[2] === '--check') assert.equal(hash(readFileSync(file, 'utf8').replaceAll('\r\n', '\n')), hash(output));
  else writeFileSync(file, output);
  console.log(JSON.stringify({ proposedGroups: report.proposedGroups, proposedObservations: report.proposedObservations,
    retainedGroups: report.retainedGroups, retainedObservations: report.retainedObservations,
    equalScalarObservations: report.equalScalarObservations, otherCompleteRows: report.otherCompleteRows, sha256: hash(output) }));
}
