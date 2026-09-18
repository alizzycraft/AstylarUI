import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { readReviewedProposalCanonical, replayReviewedInputProposalBinding } from './bind-material-reviewed-input-proposals.mjs';
import { stageReviewedInputTransitions } from '../tests/material-parity/reviewed-input-proposal-transition.mjs';

const hash = x => createHash('sha256').update(x).digest('hex');
const digest = x => hash(JSON.stringify(x));
const canonicalFiles = ['docs/material-input-equivalence-audit.json', 'docs/material-input-equivalence-audit.json.gz',
  'docs/material-input-equivalence-audit.md'];

export async function collectReviewedInputTransition() {
  const before = canonicalFiles.map(file => hash(readFileSync(file)));
  const canonical = await readReviewedProposalCanonical();
  const binding = replayReviewedInputProposalBinding(canonical), file = 'docs/material-reviewed-input-proposal-binding.json';
  const saved = readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
  assert.equal(saved, JSON.stringify(binding, null, 2) + '\n');
  const staged = stageReviewedInputTransitions(canonical.rows, binding);
  const changes = staged.rows.flatMap((row, i) => digest(row) === digest(canonical.rows[i]) ? [] : [{
    index: i, family: row.family, element: row.element, property: row.property,
    originalCompleteRowSha256: digest(canonical.rows[i]), projectedCompleteRowSha256: digest(row),
    projectedRow: row }]);
  assert.equal(changes.length, 134); assert.equal(staged.changedObservations, 3325);
  assert.equal(staged.remainingUnresolved, 2026); assert.equal(staged.otherCompleteRows, 8205);
  assert.deepEqual(canonicalFiles.map(file => hash(readFileSync(file))), before, 'canonical files changed during dry run');
  const { rows: _rows, ...receipt } = staged;
  return { schemaVersion: 1, kind: 'source-replayed-reviewed-input-transition-dry-run',
    canonicalRevision: binding.canonicalRevision, canonicalPayload: canonical.manifest,
    binding: { file, sha256: hash(saved), independentlyReplayed: true }, ...receipt, changes,
    completeAuditAccepted: false,
    limitation: 'Complete frozen row population is projected in memory after fresh source replay. Only verified classification metadata changes; all raw/authored scalars and unrelated complete rows remain intact. Canonical files and renderer inputs are not changed. This is not the live builder integration or full rendering acceptance.' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2); assert.ok(!args.length || args.length === 1 && args[0] === '--check');
  const report = await collectReviewedInputTransition(), file = 'docs/material-reviewed-input-transition-dry-run.json';
  const output = JSON.stringify(report, null, 2) + '\n';
  if (args.includes('--check')) assert.equal(readFileSync(file, 'utf8').replaceAll('\r\n', '\n'), output); else writeFileSync(file, output);
  console.log(JSON.stringify({ changedGroups: report.changedGroups, changedObservations: report.changedObservations,
    remainingUnresolved: report.remainingUnresolved, otherCompleteRows: report.otherCompleteRows,
    projectedOrderedRowDigestsSha256: report.projectedOrderedRowDigestsSha256,
    canonicalFilesChanged: report.canonicalFilesChanged, reportSha256: hash(output) }));
}
