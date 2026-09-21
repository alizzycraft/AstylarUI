import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import test from 'node:test';
import ts from 'typescript';
import { verifyCaseIndexAssertionMigration } from './case-index-assertion-migration.mjs';
import { caseIndexReceiptRevision, caseIndexAuditModule, caseIndexReceiptFiles, collectCaseIndexReceiptRefresh, applyCaseIndexReceiptRefresh } from '../../scripts/refresh-material-case-index-receipts.mjs';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

test('nine case-index receipt proposals preserve complete original findings and authenticate current dependencies', () => {
  const result = collectCaseIndexReceiptRefresh();
  assert.equal(result.reports.length, 9); assert.equal(result.receipts.length, 9);
  assert.deepEqual(result.reports.map(r => r.file), caseIndexReceiptFiles);
  assert.equal(result.allNonReceiptFieldsConserved, true); assert.equal(result.membershipAssertionsReplayed, false);
  assert.equal(result.canonicalClassificationVerified, false); assert.equal(result.renderingEquivalent, false);
  const expected = hash(readFileSync(caseIndexAuditModule, 'utf8').replaceAll('\r\n', '\n'));
  for (const receipt of result.receipts) assert.equal(receipt.after, expected);
});

test('receipt conservation rejects changed findings, reordered membership, altered receipt identity and unrelated dependencies', () => {
  for (const file of caseIndexReceiptFiles) {
    const original = JSON.parse(readFileSync(file));
    const changed = { ...original, unexpectedFinding: true };
    assert.throws(() => collectCaseIndexReceiptRefresh({ read: f => f === file ? Buffer.from(JSON.stringify(changed)) : readFileSync(f) }), file);
  }
  const file = caseIndexReceiptFiles[0];
  const mutations = [
    r => { r.sourceFingerprints[0].sha256 = '0'.repeat(64); },
    r => { r.sourceFingerprints[0].file = 'other'; },
    r => { r.sourceFingerprints.reverse(); },
    r => { r.groups.reverse(); },
    r => { r.capture.sha256 = '0'.repeat(64); },
    r => { r.caseSources.pop(); },
  ];
  for (const [i, mutate] of mutations.entries()) {
    const original = JSON.parse(readFileSync(file)), changed = structuredClone(original); mutate(changed);
    assert.notDeepEqual(changed, original);
    assert.throws(() => collectCaseIndexReceiptRefresh({ read: f => f === file ? Buffer.from(JSON.stringify(changed)) : readFileSync(f) }), `mutation ${i}`);
  }
  assert.throws(() => collectCaseIndexReceiptRefresh({ read: f => f === 'tests/material-parity/root-typography-input-evidence.mjs'
    ? Buffer.from('changed dependency') : readFileSync(f) }));
});

test('receipt writer requires successful membership replay and stable dependencies before any write', () => {
  const plan = collectCaseIndexReceiptRefresh(), writes = [], events = [];
  const collect = () => { events.push('collect'); return structuredClone(plan); };
  const verify = () => { events.push('verify'); return { checked: true }; };
  const write = (file, content) => { events.push('write'); writes.push({ file, content }); };
  const result = applyCaseIndexReceiptRefresh({ collect, verify, write });
  assert.deepEqual(events, ['collect', 'verify', 'collect', ...Array(9).fill('write')]);
  assert.deepEqual(writes, plan.reports); assert.equal(result.membershipAssertionsReplayed, true);
  writes.length = 0;
  assert.throws(() => applyCaseIndexReceiptRefresh({ collect, verify: () => { throw Error('membership failed'); }, write }));
  assert.deepEqual(writes, []);
  let calls = 0;
  assert.throws(() => applyCaseIndexReceiptRefresh({ collect: () => {
    const p = structuredClone(plan); if (calls++) p.reports[0].content += 'changed'; return p;
  }, verify, write }));
  assert.deepEqual(writes, []);
});

test('all conserved case-index membership assertions pass against historical receipts with disk writes forbidden', () => {
  const file = 'tests/material-parity/input-equivalence-audit.spec.mjs';
  const current = readFileSync(file, 'utf8'), historical = execFileSync('git', ['show', `${caseIndexReceiptRevision}:${file}`], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  function statements(source) {
    const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
    return tree.statements.filter(n => ts.isExpressionStatement(n) && ts.isCallExpression(n.expression)
      && n.expression.expression.getText(tree) === 'test' && ts.isStringLiteral(n.expression.arguments[0])
      && n.expression.arguments[0].text.includes('case index')).map(n => n.getText(tree).replaceAll('\r\n', '\n'));
  }
  const beforeMigration = execFileSync('git', ['show', `6833850:${file}`], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  verifyCaseIndexAssertionMigration(beforeMigration, current);
  assert.equal(statements(current).length, 11); assert.deepEqual(statements(beforeMigration), statements(historical), 'original membership assertions changed');
  const watched = [...caseIndexReceiptFiles, 'docs/material-input-equivalence-audit.json', 'docs/material-input-equivalence-audit.json.gz', 'docs/material-input-equivalence-audit.md'];
  const before = watched.map(f => hash(readFileSync(f)));
  const guard = `import fs from 'node:fs';import {syncBuiltinESMExports} from 'node:module';
    fs.writeFileSync=()=>{throw Error('CHECK_MODE_ATTEMPTED_WRITE')};syncBuiltinESMExports();`;
  const env = { ...process.env }; delete env.NODE_TEST_CONTEXT;
  const output = execFileSync(process.execPath, ['--import', 'data:text/javascript;base64,' + Buffer.from(guard).toString('base64'),
    '--test', '--test-name-pattern=case index', file], { encoding: 'utf8', maxBuffer: 2 * 1024 * 1024, env });
  assert.match(output, /# tests 11\b/); assert.match(output, /# pass 11\b/); assert.match(output, /# fail 0\b/);
  assert.match(output, /# skipped 0\b/); console.log(output);
  assert.deepEqual(watched.map(f => hash(readFileSync(f))), before, 'diagnostic changed saved evidence');
});
