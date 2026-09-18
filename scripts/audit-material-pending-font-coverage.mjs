import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { readCaretConservationRows } from '../tests/material-parity/owner-caret-canonical-conservation.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const digest = value => hash(JSON.stringify(value));
const signature = row => JSON.stringify([row.family, row.element, row.property, row.reference, row.astylar]);
const revision = '06e50dbcd3594c5987d63a4ec38e792b87b08dde';
const sources = {
  container: { revision: 'f5285a4', file: 'docs/material-container-font-stage-plan.json', field: 'findings', classification: 'parity-harness-defect' },
  leaf: { revision: '9933ac1', file: 'docs/material-leaf-font-attribution-plan.json', field: 'proposed', classification: 'parity-harness-defect' },
  authoring: { revision: '8591649', file: 'docs/material-authoring-input-attribution-plan.json', field: 'findings', classification: 'application-plugin-authoring-defect' },
  ownership: { revision: 'eaf2a32', file: 'docs/material-font-ownership-attribution-plan.json', field: 'proposed', classification: 'application-plugin-authoring-defect' },
};

// Coverage only: committed proposals retain their own independent source proofs
// and verification receipts. This index neither reclassifies rows nor asserts
// that re-reading a proposal is a fresh replay of those underlying proofs.
export function inspectPendingFontCoverage(plans, rows) {
  assert.deepEqual(Object.keys(plans).sort(), Object.keys(sources).sort());
  const selected = rows.filter(r => r.property === 'fontSize' && r.attribution === 'unresolved');
  const bySignature = new Map(selected.map(r => [signature(r), r])); assert.equal(bySignature.size, selected.length);
  const seen = new Set(), findings = [], counts = {};
  for (const [kind, plan] of Object.entries(plans)) {
    const definition = sources[kind];
    assert.equal(plan.canonicalRevision, revision); assert.equal(plan.canonicalAttributionChanged, false);
    assert.equal(plan.renderingEquivalent, false);
    assert.equal(plan.canonicalRows, rows.length);
    assert.equal(plan.baselineUnresolved, rows.filter(r => r.attribution === 'unresolved').length);
    const proposed = plan[definition.field].filter(f => f.property === 'fontSize');
    counts[kind] = { groups: proposed.length, observations: proposed.reduce((n, f) => n + f.occurrences, 0) };
    for (const f of proposed) {
      const key = signature(f), row = bySignature.get(key);
      assert.ok(row, 'proposal has no pending canonical font row'); assert.ok(!seen.has(key), 'duplicate cross-plan attribution'); seen.add(key);
      assert.equal(f.canonicalRowSha256, digest(row), 'complete canonical row changed');
      for (const field of ['occurrences', 'cases', 'states']) assert.deepEqual(f[field], row[field]);
      assert.equal(f.proposedClassification, definition.classification); assert.equal(f.renderingEquivalent, false);
      for (const flag of ['inputEquivalent', 'wholeElementInputEquivalent', 'rendererCauseProven', 'computedCandidateVerified'])
        if (Object.hasOwn(f, flag)) assert.equal(f[flag], false);
      assert.ok(f.proposedAttribution.startsWith('reviewed-'));
      assert.equal(f.observations.length, row.occurrences);
      findings.push({ kind, family: row.family, element: row.element, property: row.property,
        reference: row.reference, astylar: row.astylar, occurrences: row.occurrences, cases: row.cases,
        states: row.states, canonicalRowSha256: digest(row), completeProposalSha256: digest(f),
        proposedClassification: f.proposedClassification, proposedAttribution: f.proposedAttribution });
    }
  }
  assert.equal(seen.size, selected.length, 'pending font group lacks a proposal');
  return { canonicalRows: rows.length, canonicalUnresolvedGroups: rows.filter(r => r.attribution === 'unresolved').length,
    fontGroups: selected.length, fontObservations: selected.reduce((n, f) => n + f.occurrences, 0), counts, findings,
    uncoveredFontGroups: 0, overlappingFontGroups: 0,
    canonicalAttributionChanged: false, underlyingProofsReplayedByThisIndex: false,
    inputEquivalenceEstablished: false, renderingEquivalent: false, completeAuditAccepted: false };
}

export async function collectPendingFontCoverage() {
  const plans = {}, descriptors = {};
  for (const [kind, definition] of Object.entries(sources)) {
    const full = execFileSync('git', ['rev-parse', definition.revision], { encoding: 'utf8' }).trim();
    const committed = execFileSync('git', ['show', `${full}:${definition.file}`], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }).replaceAll('\r\n', '\n');
    assert.equal(readFileSync(definition.file, 'utf8').replaceAll('\r\n', '\n'), committed, 'working proposal differs from verified committed increment');
    plans[kind] = JSON.parse(committed); descriptors[kind] = { ...definition, revision: full, sha256: hash(committed) };
  }
  const { manifest, rows } = await readCaretConservationRows(file =>
    execFileSync('git', ['show', `${revision}:${file}`], { maxBuffer: 64 * 1024 * 1024 }));
  for (const plan of Object.values(plans)) assert.deepEqual(plan.canonicalPayload, manifest);
  const result = inspectPendingFontCoverage(plans, rows);
  assert.equal(result.fontGroups, 98); assert.equal(result.fontObservations, 1831);
  return { schemaVersion: 1, kind: 'complete-pending-font-proposal-coverage', canonicalRevision: revision,
    canonicalPayload: manifest, plans: descriptors, ...result };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2); assert.ok(!args.length || args.length === 1 && args[0] === '--check');
  const report = await collectPendingFontCoverage(), file = 'docs/material-pending-font-coverage.json';
  const output = JSON.stringify(report, null, 2) + '\n';
  if (args[0] === '--check') assert.equal(readFileSync(file, 'utf8').replaceAll('\r\n', '\n'), output); else writeFileSync(file, output);
  console.log(JSON.stringify({ fontGroups: report.fontGroups, fontObservations: report.fontObservations,
    counts: report.counts, uncoveredFontGroups: report.uncoveredFontGroups, overlappingFontGroups: report.overlappingFontGroups,
    canonicalAttributionChanged: false, reportSha256: hash(output) }));
}
