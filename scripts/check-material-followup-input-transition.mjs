import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { collectFollowupInputProposalBinding } from './bind-material-followup-input-proposals.mjs';
import { readCaretConservationRows } from '../tests/material-parity/owner-caret-canonical-conservation.mjs';
import { stageFollowupInputTransitions } from '../tests/material-parity/followup-input-proposal-transition.mjs';

const hash = x => createHash('sha256').update(x).digest('hex');
const digest = x => hash(JSON.stringify(x));
const canonicalFiles = ['docs/material-input-equivalence-audit.json', 'docs/material-input-equivalence-audit.json.gz',
  'docs/material-input-equivalence-audit.md'];

export async function collectFollowupInputTransition() {
  const before = canonicalFiles.map(f => hash(readFileSync(f)));
  const binding = await collectFollowupInputProposalBinding(), file = 'docs/material-followup-input-proposal-binding.json';
  const saved = readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
  assert.equal(saved, JSON.stringify(binding, null, 2) + '\n');
  const canonical = await readCaretConservationRows(f => execFileSync('git',
    ['show', `${binding.canonicalRevision}:${f}`], { maxBuffer: 64 * 1024 * 1024 }));
  assert.deepEqual(canonical.manifest, binding.canonicalPayload);
  const staged = stageFollowupInputTransitions(canonical.rows, binding);
  const changes = staged.rows.flatMap((row, i) => digest(row) === digest(canonical.rows[i]) ? [] : [{
    index: i, family: row.family, element: row.element, property: row.property,
    originalCompleteRowSha256: digest(canonical.rows[i]), projectedCompleteRowSha256: digest(row), projectedRow: row }]);
  assert.equal(changes.length, 66); assert.equal(staged.changedObservations, 2640);
  assert.equal(staged.remainingUnresolved, 1960); assert.equal(staged.otherCompleteRows, 8273);
  assert.deepEqual(canonicalFiles.map(f => hash(readFileSync(f))), before, 'canonical files changed during dry run');
  const { rows: _rows, ...receipt } = staged;
  return { schemaVersion: 1, kind: 'source-replayed-followup-input-transition-dry-run',
    canonicalRevision: binding.canonicalRevision, canonicalPayload: canonical.manifest,
    binding: { file, sha256: hash(saved), independentlyReplayed: true }, ...receipt, changes, completeAuditAccepted: false,
    limitation: 'Original source proofs and complete canonical joins are independently replayed before an in-memory metadata transition. All raw inputs, authored examples and unrelated rows remain unchanged. The actual canonical unresolved count remains 2026 until separately verified live-builder integration; this is not renderer or input-equivalence acceptance.' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2); assert.ok(!args.length || args.length === 1 && args[0] === '--check');
  const report = await collectFollowupInputTransition(), file = 'docs/material-followup-input-transition-dry-run.json';
  const output = JSON.stringify(report, null, 2) + '\n';
  if (args[0] === '--check') assert.equal(readFileSync(file, 'utf8').replaceAll('\r\n', '\n'), output); else writeFileSync(file, output);
  console.log(JSON.stringify({ changedGroups: report.changedGroups, changedObservations: report.changedObservations,
    remainingUnresolved: report.remainingUnresolved, otherCompleteRows: report.otherCompleteRows,
    projectedOrderedRowDigestsSha256: report.projectedOrderedRowDigestsSha256,
    canonicalFilesChanged: false, reportSha256: hash(output) }));
}
