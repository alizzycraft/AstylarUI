import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { auditSuites, selectAuditTests } from '../../scripts/run-audit-tests.mjs';

test('focused audit suites do not invoke full aggregation and keep integration explicitly available', () => {
  for (const area of ['slider', 'position']) {
    const focused = selectAuditTests('focused', area), integration = selectAuditTests('integration', area);
    assert.ok(integration.length);
    for (const file of focused) {
      assert.ok(!integration.includes(file));
      assert.doesNotMatch(readFileSync(file, 'utf8'), /\b(?:buildMaterialInputAudit|collectStyleDiscrepancies)\b/);
    }
  }
  assert.throws(() => selectAuditTests('full', 'slider'));
  assert.throws(() => selectAuditTests('focused', 'typo'));
  assert.ok(auditSuites.workflow.focused.includes('audit-workflow'));
});
