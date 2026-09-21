import { readAudit } from './check-material-disabled-ink-canonical-conservation.mjs';
import { isDeepStrictEqual } from 'node:util';
import { writeFileSync } from 'node:fs';

const previous = await readAudit('artifacts/material-parity/pre-disabled-ink-308e8bd');
const current = await readAudit('docs');
const changes = [];
for (let i = 0; i < Math.max(previous.control.differences.length, current.control.differences.length); i++) {
  const before = previous.control.differences[i], after = current.control.differences[i];
  if (isDeepStrictEqual(before, after)) continue;
  const fields = [...new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])]
    .filter(key => !isDeepStrictEqual(before?.[key], after?.[key]));
  changes.push({ index: i, case: after?.case, element: after?.element, property: after?.property,
    priorAttribution: before?.attribution, currentAttribution: after?.attribution, fields,
    before: Object.fromEntries(fields.map(key => [key, before?.[key]])),
    after: Object.fromEntries(fields.map(key => [key, after?.[key]])) });
}
const report = { previous: previous.manifest, current: current.manifest,
  scalarRecordsConserved: isDeepStrictEqual(previous.rows, current.rows),
  changes, accepted: false };
writeFileSync('artifacts/material-parity/disabled-ink-control-delta.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ scalarRecordsConserved: report.scalarRecordsConserved,
  changedRecords: changes.length, populations: Object.entries(Object.groupBy(changes,
    row => JSON.stringify([row.priorAttribution, row.currentAttribution, row.fields])))
    .map(([key, rows]) => ({ key: JSON.parse(key), count: rows.length, first: rows[0] })) }, null, 2));
