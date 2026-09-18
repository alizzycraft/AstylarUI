import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { collectLeafFontFamilyAttributionPlan } from './audit-material-leaf-font-family-attribution.mjs';
import { collectLeafWeightTrackingAttribution } from './audit-material-leaf-weight-tracking-attribution.mjs';
import { collectExpansionOwnerAttribution } from './audit-material-expansion-owner-attribution.mjs';
import { readCaretConservationRows } from '../tests/material-parity/owner-caret-canonical-conservation.mjs';

const hash = x => createHash('sha256').update(x).digest('hex');
const digest = x => hash(JSON.stringify(x));
const currentRevision = '957774a';
const definitions = {
  leafFamily: { revision: '84861a6', file: 'docs/material-leaf-font-family-attribution-plan.json',
    baseline: '06e50dbcd3594c5987d63a4ec38e792b87b08dde', collect: collectLeafFontFamilyAttributionPlan,
    attribution: 'reviewed-leaf-font-family-observation-stage' },
  leafWeightTracking: { revision: '4ddda33', file: 'docs/material-leaf-weight-tracking-attribution-plan.json',
    baseline: currentRevision, collect: collectLeafWeightTrackingAttribution,
    attribution: 'reviewed-leaf-weight-tracking-observation-stage' },
  expansionOwner: { revision: 'eb95c6a', file: 'docs/material-expansion-owner-attribution-plan.json',
    baseline: currentRevision, collect: collectExpansionOwnerAttribution,
    attribution: 'reviewed-expansion-panel-header-owner-mismatch' },
};
const flags = ['inputEquivalent', 'wholeElementInputEquivalent', 'renderingEquivalent',
  'rendererCauseProven', 'physicalFontSelectionVerified', 'canonicalMappingChanged'];

// Pure join of independently replayed plans. A cross-revision proposal is
// eligible only if its ENTIRE original row survives unchanged in the target.
// This does not authenticate plans by itself or promote canonical metadata.
export function joinFollowupInputProposals(plans, rows) {
  assert.deepEqual(Object.keys(plans).sort(), Object.keys(definitions).sort());
  const byHash = new Map();
  for (const row of rows) {
    const key = digest(row);
    if (!byHash.has(key)) byHash.set(key, []);
    byHash.get(key).push(row);
  }
  const selected = new Set(), observations = new Set(), groups = [], counts = {};
  for (const [kind, plan] of Object.entries(plans)) {
    const definition = definitions[kind];
    assert.equal(plan.canonicalRevision, definition.baseline);
    assert.equal(plan.canonicalAttributionChanged, false);
    assert.equal(plan.inputEquivalent, false); assert.equal(plan.renderingEquivalent, false);
    assert.equal(plan.canonicalRows, rows.length);
    if (definition.baseline === currentRevision)
      assert.equal(plan.baselineUnresolved, rows.filter(r => r.attribution === 'unresolved').length);
    assert.equal(plan.proposedGroups, plan.proposed.length);
    assert.equal(plan.proposedObservations, plan.proposed.reduce((n, p) => n + p.occurrences, 0));
    counts[kind] = { groups: plan.proposedGroups, observations: plan.proposedObservations };
    for (const p of plan.proposed) {
      const matches = byHash.get(p.canonicalRowSha256) ?? [];
      assert.equal(matches.length, 1, 'complete proposed source row missing, changed or duplicated');
      const row = matches[0];
      assert.equal(row.attribution, 'unresolved'); assert.equal(p.previousAttribution, 'unresolved');
      assert.ok(!selected.has(row), 'overlapping proposed row'); selected.add(row);
      for (const key of ['family', 'element', 'property', 'reference', 'astylar', 'occurrences', 'cases', 'states'])
        assert.deepEqual(p[key], row[key], `proposal ${key} changed`);
      assert.equal(p.proposedClassification, 'parity-harness-defect');
      assert.equal(p.proposedAttribution, definition.attribution);
      for (const flag of flags.slice(0, 4)) assert.equal(p[flag], false);
      for (const flag of flags.slice(4)) if (Object.hasOwn(p, flag)) assert.equal(p[flag], false);
      assert.equal(p.observations.length, p.occurrences);
      assert.deepEqual(p.cases, p.observations.slice(0, 12).map(o => o.case));
      for (const o of p.observations) {
        const key = JSON.stringify([o.case, p.family, p.element, p.property]);
        assert.ok(!observations.has(key), 'overlapping original observation'); observations.add(key);
        assert.match(o.inputSha256 ?? o.originalInputSha256, /^[a-f0-9]{64}$/);
        assert.match(o.proofSha256, /^[a-f0-9]{64}$/);
      }
      groups.push({ kind, originalCompleteRow: row, proposal: p });
    }
  }
  return { counts, groups, proposedGroups: groups.length, proposedObservations: observations.size,
    canonicalRows: rows.length, baselineUnresolved: rows.filter(r => r.attribution === 'unresolved').length,
    otherCompleteRows: rows.length - selected.size,
    otherOrderedRowDigestsSha256: digest(rows.filter(r => !selected.has(r)).map(digest)),
    canonicalAttributionChanged: false, inputEquivalent: false, renderingEquivalent: false };
}

export async function collectFollowupInputProposalBinding() {
  const plans = {}, descriptors = {};
  for (const [kind, definition] of Object.entries(definitions)) {
    const revision = execFileSync('git', ['rev-parse', definition.revision], { encoding: 'utf8' }).trim();
    const committed = execFileSync('git', ['show', `${revision}:${definition.file}`],
      { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }).replaceAll('\r\n', '\n');
    assert.equal(readFileSync(definition.file, 'utf8').replaceAll('\r\n', '\n'), committed,
      'working proposal differs from verified committed evidence');
    // Each existing collector replays the source trees and every original case,
    // normalizers, and its complete byte-authenticated historical canonical join.
    const replay = await definition.collect();
    assert.equal(JSON.stringify(replay, null, 2) + '\n', committed, 'source/canonical proposal no longer reproduces');
    plans[kind] = replay;
    descriptors[kind] = { file: definition.file, revision, sha256: hash(committed),
      sourceProofsReplayed: true, originalCanonicalJoinReplayed: true };
  }
  const canonical = await readCaretConservationRows(file => execFileSync('git',
    ['show', `${currentRevision}:${file}`], { maxBuffer: 64 * 1024 * 1024 }));
  const joined = joinFollowupInputProposals(plans, canonical.rows);
  assert.equal(joined.proposedGroups, 55); assert.equal(joined.proposedObservations, 1884);
  assert.equal(joined.otherCompleteRows, 8284); assert.equal(joined.baselineUnresolved, 2026);
  return { schemaVersion: 1, kind: 'source-replayed-followup-input-proposal-binding',
    canonicalRevision: execFileSync('git', ['rev-parse', currentRevision], { encoding: 'utf8' }).trim(),
    canonicalPayload: canonical.manifest, plans: descriptors, ...joined,
    sourceProofsReplayed: true, originalCanonicalJoinsReplayed: true,
    canonicalIntegration: false, completeAuditAccepted: false,
    limitation: 'Three source-replayed proposal sets join to the current frozen canonical rows without changing any input, previous attribution or output. Leaf-family proposals retain their original older baseline; exact whole-row identity proves they survive the intervening 134 metadata reviews. All 102 expansion owner groups still require role-correct recapture. This binding is not canonical promotion or rendering parity.' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2); assert.ok(!args.length || args.length === 1 && args[0] === '--check');
  const report = await collectFollowupInputProposalBinding(), file = 'docs/material-followup-input-proposal-binding.json';
  const output = JSON.stringify(report, null, 2) + '\n';
  if (args[0] === '--check') assert.equal(readFileSync(file, 'utf8').replaceAll('\r\n', '\n'), output);
  else writeFileSync(file, output);
  console.log(JSON.stringify({ proposedGroups: report.proposedGroups, proposedObservations: report.proposedObservations,
    counts: report.counts, otherCompleteRows: report.otherCompleteRows,
    otherOrderedRowDigestsSha256: report.otherOrderedRowDigestsSha256,
    reportSha256: hash(output), sourceProofsReplayed: true, canonicalIntegration: false }));
}
