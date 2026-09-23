import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const auditSuites = {
  slider: { focused: ['slider-input-box-source-binding'], integration: ['slider-input-box-integration'] },
  position: {
    focused: ['position-composition-review', 'position-followup-review'],
    integration: ['position-composition-review-integration', 'position-followup-review-integration'],
  },
  workflow: { focused: ['audit-workflow'], integration: [] },
};
export function selectAuditTests(tier, area) {
  assert.ok(['focused', 'integration'].includes(tier), 'Choose focused or integration; full audit and capture are separate commands');
  assert.ok(Object.hasOwn(auditSuites, area), `Unknown area: ${area}`);
  const files = auditSuites[area][tier].map(name => `tests/material-parity/${name}.spec.mjs`);
  assert.ok(files.length, `No ${tier} tests for ${area}`);
  return files;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [tier, area = 'workflow', ...extra] = process.argv.slice(2);
  assert.equal(extra.length, 0, 'Usage: run-audit-tests.mjs focused|integration slider|position|workflow');
  const files = selectAuditTests(tier, area);
  console.log(JSON.stringify({ tier, area, files, browserCapture: false, fullAudit: false }));
  const result = spawnSync(process.execPath, ['--test', '--test-concurrency=1', ...files], { stdio: 'inherit' });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
}
