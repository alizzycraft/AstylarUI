import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { readCaretConservationRows } from './owner-caret-canonical-conservation.mjs';
import { conserveIntermediateCanonicalRows } from './canonical-transition-composition.mjs';
import { collectAlignmentFontAuditInputs, stageAlignmentFontTransitions } from './alignment-font-audit-source-binding.mjs';
import { collectTextAlignAuditInputs, stageTextAlignTransitions } from './text-align-audit-source-binding.mjs';
import { collectLtrAlignmentAuditInputs, stageLtrAlignmentTransitions } from './ltr-alignment-audit-source-binding.mjs';
import { inspectPreparedComposition } from '../../scripts/audit-prepared-alignment-composition.mjs';

// Independently replay all sources against the authenticated pre-integration
// payload. Earlier transitions must match every complete intermediate row.
export async function replayPreparedAlignmentCanonicalTransition(expectedBefore) {
  const canonical = await readCaretConservationRows(file => execFileSync('git',
    ['show', `67db724e5f258c84cfdc70e9da2ccb6ee6353ad0:${file}`], { maxBuffer: 64 * 1024 * 1024 }));
  const intermediate = expectedBefore ? conserveIntermediateCanonicalRows(expectedBefore, canonical.rows) : undefined;
  const sourcePath = 'artifacts/material-parity/current-ancestry-audit/latest-report.json';
  const source = JSON.parse(readFileSync(sourcePath)), stages = [];
  let rows = canonical.rows;
  for (const [collect, stage, groups, observations] of [
    [collectAlignmentFontAuditInputs, stageAlignmentFontTransitions, 72, 4016],
    [collectTextAlignAuditInputs, stageTextAlignTransitions, 49, 2677],
    [collectLtrAlignmentAuditInputs, stageLtrAlignmentTransitions, 4, 178],
  ]) {
    const evidence = collect(source, { parityPath: sourcePath });
    assert.equal(evidence.binding.status, 'bound', evidence.binding.error);
    assert.equal(evidence.groups.length, groups); assert.equal(evidence.observations.length, observations);
    const { rows: next, ...receipt } = stage(rows, evidence); rows = next; stages.push(receipt);
  }
  const proof = inspectPreparedComposition(canonical.rows, rows, stages);
  assert.equal(proof.changedGroups, 125); assert.equal(proof.changedObservations, 6871);
  assert.equal(proof.unchangedCompleteRows, 8214); assert.equal(proof.projectedUnresolved, 1835);
  assert.equal(proof.unchangedOrderedRowDigestsSha256, '410260b606883a8c1691cdc9c80a39cdc1d289cfacb05ba25817a4a7a87af399');
  return { original: canonical, rows, proof, intermediate };
}
