import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

assert.equal(process.argv.length, 2);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const results = [];
for (const [script, report, prerequisite] of [
  ['scripts/audit-material-owner-initial-membership.mjs', 'docs/material-owner-initial-style-membership.json', false],
  ['scripts/audit-material-owner-initial-mappings.mjs', 'docs/material-owner-initial-style-mappings.json', true],
]) {
  const source = readFileSync(script, 'utf8'), parsed = ts.createSourceFile(script, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  assert.equal(parsed.parseDiagnostics.length, 0);
  const edits = [];
  for (const n of parsed.statements.filter(ts.isImportDeclaration)) {
    const specifier = n.moduleSpecifier.text;
    if (specifier.startsWith('.')) edits.push({ start: n.moduleSpecifier.getStart(parsed), end: n.moduleSpecifier.end,
      replacement: JSON.stringify(pathToFileURL(path.resolve(path.dirname(script), specifier)).href) });
  }
  const guards = parsed.statements.filter(n => ts.isIfStatement(n) &&
    n.expression.getText(parsed) === "process.argv.includes('--check')" && n.getText(parsed).includes('writeFileSync(target, output)'));
  assert.equal(guards.length, 1);
  const guard = guards[0];
  assert.ok(guard.thenStatement.getText(parsed).startsWith("assert.equal(readFileSync(target, 'utf8').replaceAll('\\r\\n', '\\n'), output"));
  const originalBytes = readFileSync(report), originalSha256 = hash(originalBytes);
  const diagnostic = `{
    assert.equal(target, ${JSON.stringify(report)});
    const savedBytes = readFileSync(target), saved = JSON.parse(savedBytes);
    assert.equal(hash(savedBytes), ${JSON.stringify(originalSha256)});
    const data = r => { const d = structuredClone(r); delete d.sourceFingerprints; return d; };
    const before = data(saved), after = data(result);
    assert.deepEqual(after, before, 'Non-receipt evidence changed');
    assert.deepEqual(result.sourceFingerprints.map(s => s.file), saved.sourceFingerprints.map(s => s.file));
    const changes = result.sourceFingerprints.flatMap((s, i) => s.sha256 === saved.sourceFingerprints[i].sha256 ? [] :
      [{ file: s.file, recorded: saved.sourceFingerprints[i].sha256, current: s.sha256 }]);
    assert.deepEqual(changes, [{ file: 'tests/material-parity/input-equivalence-audit.mjs',
      recorded: 'c57c725b10a0b94bf9c21ccf85e3764f47bccd9d629d004010429fd239c820c1',
      current: '252754869d5683cc76ba0784a96fc55d5c50aa8eeeb8a0441c131ec0a62eb6d4' }]);
    assert.notEqual(savedBytes.toString('utf8').replaceAll('\\r\\n', '\\n'), output, 'Original check must still fail');
    assert.equal(hash(readFileSync(target)), ${JSON.stringify(originalSha256)});
    console.log(JSON.stringify({ diagnostic: 'complete-owner-initial-receipt-replay',
      file: target, originalSha256: ${JSON.stringify(originalSha256)}, originalCheckPasses: false,
      completeNonReceiptSha256: hash(JSON.stringify(before)), changedReceipts: changes,
      groups: result.groupCount, observations: result.unresolvedOccurrences ?? result.observations,
      preservedStaticOccurrences: result.preservedStaticOccurrences ?? result.groups.reduce((n,g)=>n+g.preservedStaticCases.length,0),
      filesWritten: false, canonicalAttributionChanged: false, inputEquivalent: false, renderingEquivalent: false }));
  }`;
  edits.push({ start: guard.getStart(parsed), end: guard.end, replacement: diagnostic });
  if (prerequisite) {
    const proof = results[0];
    assert.equal(proof.diagnostic, 'complete-owner-initial-receipt-replay');
    assert.equal(proof.groups, 600); assert.equal(proof.observations, 31508); assert.equal(proof.preservedStaticOccurrences, 636);
    const calls = parsed.statements.filter(n => ts.isExpressionStatement(n) && ts.isCallExpression(n.expression) &&
      n.expression.expression.getText(parsed) === 'execFileSync');
    assert.equal(calls.length, 1);
    assert.equal(calls[0].getText(parsed), "execFileSync(process.execPath, ['scripts/audit-material-owner-initial-membership.mjs', '--check'], { encoding: 'utf8' });");
    // The prerequisite's complete calculation was independently replayed above.
    // Its saved data is byte-bound here; only its known failing metadata check
    // is not rerun in this diagnostic child. Production scripts stay untouched.
    edits.push({ start: calls[0].getStart(parsed), end: calls[0].end,
      replacement: `assert.equal(createHash('sha256').update(readFileSync(${JSON.stringify(proof.file)})).digest('hex'), ${JSON.stringify(proof.originalSha256)});` });
  }
  let instrumented = source;
  for (const e of [...edits].sort((a, b) => b.start - a.start))
    instrumented = instrumented.slice(0, e.start) + e.replacement + instrumented.slice(e.end);
  // Reverse exactly the recorded edits, proving all calculation statements and
  // original assertions outside the documented boundary were preserved.
  let restored = instrumented, shift = 0;
  const ranges = [...edits].sort((a, b) => a.start - b.start).map(e => {
    const start = e.start + shift; shift += e.replacement.length - (e.end - e.start); return { ...e, adjusted: start };
  });
  for (const e of ranges.reverse())
    restored = restored.slice(0, e.adjusted) + source.slice(e.start, e.end) + restored.slice(e.adjusted + e.replacement.length);
  assert.equal(restored, source);
  const output = execFileSync(process.execPath, ['--input-type=module', '--eval', instrumented],
    { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
  const lines = output.trim().split(/\r?\n/).map(line => JSON.parse(line));
  const matches = lines.filter(r => r.diagnostic === 'complete-owner-initial-receipt-replay'); assert.equal(matches.length, 1);
  const result = { ...matches[0], script, scriptSha256: hash(source),
    prerequisiteReplayedInPreviousChild: prerequisite, nonReceiptCalculationSourceUnchanged: true };
  assert.equal(result.groups, 600); assert.equal(result.observations, 31508); assert.equal(result.preservedStaticOccurrences, 636);
  results.push(result); console.log(JSON.stringify(result));
}
console.log(JSON.stringify({ reports: results.length, originalChecksPass: false, filesWritten: false,
  limitation: 'Read-only counterfactual diagnosis. Both complete calculations retain all non-receipt fields; source metadata remains stale on disk. This does not turn either original test into a pass or establish rendering parity.' }));
process.exitCode = 1;
