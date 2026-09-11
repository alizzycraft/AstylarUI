import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {
  buildMaterialInputAudit,
  parseMaterialInputAuditArguments,
  renderMaterialInputAuditMarkdown,
  validateMaterialInputAudit,
} from '../tests/material-parity/input-equivalence-audit.mjs';

const root = process.cwd();
const { check, allowPartial, parityPath } = parseMaterialInputAuditArguments(process.argv.slice(2), root);
const jsonPath = path.resolve(root, 'docs/material-input-equivalence-audit.json');
const markdownPath = path.resolve(root, 'docs/material-input-equivalence-audit.md');

assert.ok(existsSync(parityPath), `Run material parity first; missing ${parityPath}`);
const parityReport = JSON.parse(readFileSync(parityPath, 'utf8'));
const audit = buildMaterialInputAudit(parityReport, { root });
const json = `${JSON.stringify(audit, null, 2)}\n`;
const markdown = renderMaterialInputAuditMarkdown(audit);
const errors = validateMaterialInputAudit(audit, { requireComplete: !allowPartial });

if (check) {
  assert.equal(readFileSync(jsonPath, 'utf8'), json, 'checked-in machine audit is stale');
  assert.equal(readFileSync(markdownPath, 'utf8'), markdown, 'checked-in human audit is stale');
} else {
  writeFileSync(jsonPath, json);
  writeFileSync(markdownPath, markdown);
}

console.log(`# Material input-equivalence audit`);
console.log(`- Parity evidence: ${path.relative(root, parityPath)}`);
console.log(`- Coverage: ${audit.coverage.executedStatic}/${audit.coverage.configuredStatic} static, ${audit.coverage.executedInteractions}/${audit.coverage.configuredInteractions} interaction`);
console.log(`- Unique differences: ${audit.summary.uniqueStyleDifferences}`);
console.log(`- Occurrences: ${audit.summary.totalStyleDifferenceOccurrences}`);
console.log(`- Source findings: ${audit.summary.sourceFindings}`);
console.log(`- Input equivalent: ${audit.summary.inputEquivalent ? 'yes' : 'no'}`);
if (errors.length > 0) {
  console.error(errors.map((error) => `- ERROR: ${error}`).join('\n'));
  process.exitCode = 1;
}
