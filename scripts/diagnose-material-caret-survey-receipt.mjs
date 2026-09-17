import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import ts from 'typescript';
import { bindOwnerCaretNormalization } from '../tests/material-parity/owner-caret-source-binding.mjs';

assert.equal(process.argv.length, 2);
const hash = x => createHash('sha256').update(x).digest('hex');
const parentFile = 'docs/material-owner-caret-input-survey.json';
const parentRevision = '280e86c013c7ba6ed0b3be58e3cd1a60ecadb0bb';
const parent = JSON.parse(readFileSync(parentFile));
assert.deepEqual(parent, JSON.parse(execFileSync('git', ['show', `${parentRevision}:${parentFile}`],
  { maxBuffer: 16 * 1024 * 1024 })));
const moduleFile = parent.productionNormalization.module;
for (const source of parent.sourceFingerprints) if (source.file !== moduleFile)
  assert.equal(hash(readFileSync(source.file, 'utf8').replaceAll('\r\n', '\n')), source.sha256);
bindOwnerCaretNormalization(readFileSync(moduleFile, 'utf8'), parent.productionNormalization);

// Execute the actual pinned generator. Relocate imports only, then insert one
// read-only diagnostic immediately before its final comparison/write branch.
// The branch remains intact but cannot execute after the explicit diagnostic
// exit. No inspector, canonical membership, source capture or calculation is
// replaced, and the original failing test remains available unchanged.
const generator = 'scripts/audit-material-owner-caret-inputs.mjs';
const source = readFileSync(generator, 'utf8');
const parse = value => ts.createSourceFile(generator, value, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const parsed = parse(source);
const guards = parsed.statements.filter(n => ts.isIfStatement(n) &&
  n.expression.getText(parsed) === "args[0] === '--check'");
assert.equal(guards.length, 1);
const guard = guards[0];
const insertion = `
const savedDiagnostic = JSON.parse(readFileSync(target));
const historicalReceipt = savedDiagnostic.sourceFingerprints.find(s => s.file === auditModule);
const currentReceipt = report.sourceFingerprints.find(s => s.file === auditModule);
assert.ok(historicalReceipt && currentReceipt);
assert.notEqual(historicalReceipt.sha256, currentReceipt.sha256, 'diagnostic requires a changed module receipt');
const restoredDiagnostic = { ...report, sourceFingerprints: report.sourceFingerprints.map(s =>
  s.file === auditModule ? { ...s, sha256: historicalReceipt.sha256 } : s) };
assert.equal(hash(JSON.stringify(restoredDiagnostic)), hash(JSON.stringify(savedDiagnostic)),
  'original generator changed beyond the one audited module receipt');
assert.deepEqual(canonicalFiles.map(f => hash(readFileSync(f))), before);
console.log(JSON.stringify({ ...report.counts, parentRevision: ${JSON.stringify(parentRevision)},
  historicalReceipt, currentReceipt, normalizationFunctions: normalizationNames.length,
  completeOriginalGeneratorReplayed: true, nonReceiptEvidenceUnchanged: true,
  canonicalIntegration: report.canonicalIntegration, canonicalUnchanged: true, surveyUnchanged: true,
  originalUnadaptedCheckStillFails: true, canonicalIntegrationVerified: false }));
process.exit(0);
`;
let relocated = source;
const edits = [{ start: guard.getStart(parsed), end: guard.getStart(parsed), text: insertion }];
for (const node of parsed.statements.filter(ts.isImportDeclaration)) {
  if (node.moduleSpecifier.text.startsWith('node:')) continue;
  const s = node.moduleSpecifier;
  const resolved = s.text.startsWith('.')
    ? new URL(s.text, pathToFileURL(path.resolve(generator))).href : import.meta.resolve(s.text);
  edits.push({ start: s.getStart(parsed), end: s.end,
    text: JSON.stringify(resolved) });
}
for (const edit of edits.sort((a, b) => b.start - a.start))
  relocated = relocated.slice(0, edit.start) + edit.text + relocated.slice(edit.end);
const actual = parse(relocated), added = parse(insertion).statements.length;
assert.equal(actual.parseDiagnostics.length, 0);
assert.equal(actual.statements.length, parsed.statements.length + added);
const guardIndex = parsed.statements.indexOf(guard);
for (let i = 0; i < parsed.statements.length; i++) {
  const normalized = (node, file) => ts.isImportDeclaration(node)
    ? node.getText(file).replace(node.moduleSpecifier.getText(file), '<import>') : node.getText(file);
  assert.equal(normalized(actual.statements[i < guardIndex ? i : i + added], actual),
    normalized(parsed.statements[i], parsed), `original generator statement ${i}`);
}
await import(`data:text/javascript;base64,${Buffer.from(relocated).toString('base64')}`);
