import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import test from 'node:test';
import { verifyCaseIndexAssertionMigration } from './case-index-assertion-migration.mjs';
const file = 'tests/material-parity/input-equivalence-audit.spec.mjs';
const previous = execFileSync('git', ['show', `6833850:${file}`], { maxBuffer: 8 * 1024 * 1024 });
const current = readFileSync(file, 'utf8');

test('entire legacy suite conserves statements outside nine receipt checks and the exact inventory extension', () => {
  const result = verifyCaseIndexAssertionMigration(previous, current);
  assert.equal(result.replacedReceiptAssertions, 9);
  assert.equal(result.allOtherStatementsConserved, true);
  assert.equal(result.mappingReadAdapterAuthenticated, true);
  assert.equal(result.captureDiagnosticsProjectionAuthenticated, true);
  assert.deepEqual(result.addedIsolatedTests, [
    'outline token divider extension requires zero-width currentColor other sides and rejects forged coverage',
    'mapped border initial proof covers original aliases without erasing scalar rule gaps',
    'mapped card border token preserves shorthand and proves omitted style and color',
    'card border token classification preserves all membership and rejects forged rows',
    'mapped dialog action border proof retains explicit top border and limits classification to other sides',
    'mapped dialog panel border proof requires its exact serialized no-motion override',
    'mapped button reset verifies every dialog owner and rejects competing or incomplete evidence',
    'mapped button reset classification preserves full membership and rejects forged rows',
    'mapped border integration rejects classifications without authenticated original cases',
    'border initial-color heading owners retain conservative declaration and provenance checks',
    'descendant color ancestry rejects broken links and intervening requests without claiming owner equivalence',
  ]);
  assert.deepEqual(result.addedFocusedImports, ['./border-initial-input-evidence.mjs', './audit-normalization-contracts.mjs']);
  assert.match(result.originalSuiteAstSha256, /^[a-f0-9]{64}$/);
});
test('migration proof rejects unrelated assertion changes, missing checks and wrong index identity', () => {
  for (const changed of [
    current.replace('assert.equal(index.sourceFingerprints.length, 11)', 'assert.equal(index.sourceFingerprints.length, 10)'),
    current.replace("assertHistoricalCaseIndexSources('docs/material-container-caret-audit.json', index);", ''),
    current.replace("assertHistoricalCaseIndexSources('docs/material-container-caret-audit.json', index)", "assertHistoricalCaseIndexSources('docs/material-root-height-audit.json', index)"),
    current.replace('audit.sourceFingerprints.length, 424', 'audit.sourceFingerprints.length, 423'),
    current.replace("'reviewed-source-batch-pipeline.spec.mjs',", "'wrong-source.spec.mjs',"),
    current.replace(' && !additions.includes(f)', ''),
    current + "\ntest('additional case index', () => {});\n",
    current + "\ntest('additional focused check', createCallback());\n",
    current + "\ntest('additional focused check', { skip: true }, () => {});\n",
    current + "\nconst eagerChange = mutateSharedState();\n",
    current.replace('? restoreMappingReadAdapterSource(source, readFileSync(source.file))', '? source.sha256'),
    current.replace("from './border-initial-input-evidence.mjs'", "from './unreviewed-module.mjs'"),
    current.replace('borderColorProperties } from', 'borderColorProperties, unreviewed } from'),
    current + "\nimport './unreviewed-side-effects.mjs';\n",
    current.replace("restoreGapCaptureDiagnostics(readFileSync(source.file, 'utf8'))", 'source.sha256'),
  ]) {
    assert.notEqual(changed, current); assert.throws(() => verifyCaseIndexAssertionMigration(previous, changed));
  }
});
