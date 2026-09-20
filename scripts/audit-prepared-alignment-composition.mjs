import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { readCaretConservationRows } from '../tests/material-parity/owner-caret-canonical-conservation.mjs';
import { collectAlignmentFontAuditInputs, stageAlignmentFontTransitions }
  from '../tests/material-parity/alignment-font-audit-source-binding.mjs';
import { collectTextAlignAuditInputs, stageTextAlignTransitions }
  from '../tests/material-parity/text-align-audit-source-binding.mjs';
import { collectLtrAlignmentAuditInputs, stageLtrAlignmentTransitions }
  from '../tests/material-parity/ltr-alignment-audit-source-binding.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const digest = value => hash(JSON.stringify(value));
const fields = new Set(['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']);
const originalFile = 'artifacts/material-parity/current-ancestry-audit/latest-report.json';
const target = 'docs/material-prepared-alignment-composition.json';

export function inspectPreparedComposition(before, after, stages) {
  assert.equal(after.length, before.length);
  const expected = new Map();
  for (const stage of stages) for (const change of stage.changes) {
    assert.ok(!expected.has(change.previousCompleteRowSha256), 'overlapping prepared classification');
    expected.set(change.previousCompleteRowSha256, change);
  }
  const changed = [], unchanged = [], seen = new Set();
  const raw = row => Object.fromEntries(Object.entries(row).filter(([key]) => !fields.has(key)));
  for (let i = 0; i < before.length; i++) {
    const a = before[i], b = after[i], beforeHash = digest(a), expectedChange = expected.get(beforeHash);
    if (!expectedChange) {
      assert.equal(digest(b), beforeHash, `unreviewed complete row changed: ${i}`);
      unchanged.push(beforeHash); continue;
    }
    assert.ok(!seen.has(beforeHash)); seen.add(beforeHash);
    assert.equal(a.attribution, 'unresolved');
    assert.ok(isDeepStrictEqual(raw(a), raw(b)), `raw observation or row order changed: ${i}`);
    assert.equal(digest(b), expectedChange.projectedCompleteRowSha256, 'projected classification differs');
    for (const key of ['family', 'element', 'property', 'occurrences', 'attribution'])
      assert.equal(expectedChange[key], b[key], `projected receipt ${key} differs`);
    assert.notEqual(b.attribution, 'unresolved');
    assert.equal(b.reviewEvidence.renderingEquivalent, false);
    assert.equal(b.reviewEvidence.rendererCauseProven, false);
    changed.push(expectedChange);
  }
  assert.equal(seen.size, expected.size, 'missing projected row');
  return { changedGroups: changed.length, changedObservations: changed.reduce((n, c) => n + c.occurrences, 0),
    changes: changed, unchangedCompleteRows: unchanged.length, unchangedOrderedRowDigestsSha256: digest(unchanged),
    originalUnresolved: before.filter(r => r.attribution === 'unresolved').length,
    projectedUnresolved: after.filter(r => r.attribution === 'unresolved').length };
}

export async function auditPreparedComposition() {
  const canonicalFiles = ['docs/material-input-equivalence-audit.json', 'docs/material-input-equivalence-audit.json.gz',
    'docs/material-input-equivalence-audit.md'];
  const canonicalBefore = canonicalFiles.map(file => ({ file, sha256: hash(readFileSync(file)) }));
  const sourceBytes = readFileSync(originalFile), source = JSON.parse(sourceBytes), options = { parityPath: originalFile };
  const definitions = [
    ['alignment-font', collectAlignmentFontAuditInputs, stageAlignmentFontTransitions, 72, 4016],
    ['text-alignment', collectTextAlignAuditInputs, stageTextAlignTransitions, 49, 2677],
    ['direction-scoped-alignment', collectLtrAlignmentAuditInputs, stageLtrAlignmentTransitions, 4, 178],
  ];
  const evidence = definitions.map(([name, collect, stage, groups, observations]) => {
    const e = collect(source, options); assert.equal(e.binding.status, 'bound', e.binding.error);
    assert.equal(e.coverage.complete, true); assert.equal(e.groups.length, groups); assert.equal(e.observations.length, observations);
    return { name, e, stage };
  });
  const canonical = await readCaretConservationRows(readFileSync), stages = [];
  let rows = canonical.rows;
  for (const { name, e, stage } of evidence) {
    const { rows: next, ...receipt } = stage(rows, e); rows = next;
    stages.push({ name, binding: e.binding, ...receipt });
  }
  const result = inspectPreparedComposition(canonical.rows, rows, stages);
  assert.equal(result.changedGroups, 125); assert.equal(result.changedObservations, 6871);
  assert.equal(result.originalUnresolved - result.projectedUnresolved, 125);
  const canonicalAfter = canonicalFiles.map(file => ({ file, sha256: hash(readFileSync(file)) }));
  assert.deepEqual(canonicalAfter, canonicalBefore, 'dry run changed canonical evidence');
  return { kind: 'composed-prepared-alignment-classification-dry-run', schemaVersion: 1,
    originalCapture: { file: originalFile, sha256: hash(sourceBytes) }, canonical: canonical.manifest,
    canonicalRows: canonical.rows.length, canonicalBefore, canonicalAfter, stages, ...result,
    canonicalFilesChanged: false, mainBuilderIntegrated: false, inputEquivalent: false, renderingEquivalent: false };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2); assert.ok(!args.length || args.length === 1 && args[0] === '--check');
  const report = await auditPreparedComposition(), text = JSON.stringify(report, null, 2) + '\n';
  if (args[0] === '--check') assert.equal(hash(readFileSync(target, 'utf8').replaceAll('\r\n', '\n')), hash(text));
  else writeFileSync(target, text);
  console.log(JSON.stringify({ groups: report.changedGroups, observations: report.changedObservations,
    unchangedRows: report.unchangedCompleteRows, projectedUnresolved: report.projectedUnresolved,
    canonicalFilesChanged: false, check: args[0] === '--check' }));
}
