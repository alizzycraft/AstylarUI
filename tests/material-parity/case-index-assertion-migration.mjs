import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import { caseIndexReceiptFiles } from '../../scripts/refresh-material-case-index-receipts.mjs';

const parse = source => {
  const ast = ts.createSourceFile('audit.spec.mjs', source.toString().replaceAll('\r\n', '\n'), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  assert.equal(ast.parseDiagnostics.length, 0); return ast;
};
const printer = ts.createPrinter({ removeComments: true, newLine: ts.NewLineKind.LineFeed });
const canonical = ast => printer.printFile(ast);
const tests = ast => ast.statements.filter(n => ts.isExpressionStatement(n) && ts.isCallExpression(n.expression) && n.expression.expression.getText(ast) === 'test');

// Restore only the nine exact receipt checks and remove their one new import.
// The entire reconstructed suite, not just selected membership tests, must match.
export function verifyCaseIndexAssertionMigration(previous, current) {
  const before = parse(previous), after = parse(current), edits = [], seen = new Set();
  const imports = after.statements.filter(n => ts.isImportDeclaration(n) && n.moduleSpecifier.text === './historical-case-index-source-assertion.mjs');
  assert.equal(imports.length, 1);
  assert.equal(imports[0].importClause?.name, undefined);
  assert.equal(imports[0].importClause?.namedBindings?.elements?.length, 1);
  assert.equal(imports[0].importClause.namedBindings.elements[0].getText(after), 'assertHistoricalCaseIndexSources');
  edits.push({ start: imports[0].getStart(after), end: imports[0].end, text: '' });
  const oldTests = tests(before);
  for (const statement of tests(after)) {
    const call = statement.expression, title = call.arguments[0]?.text;
    const body = call.arguments.at(-1)?.body;
    if (!body?.statements) continue;
    for (const node of body.statements) {
      if (!ts.isExpressionStatement(node) || !ts.isCallExpression(node.expression) ||
          node.expression.expression.getText(after) !== 'assertHistoricalCaseIndexSources') continue;
      const args = node.expression.arguments;
      assert.equal(args.length, 2); assert.ok(ts.isStringLiteral(args[0]));
      const file = args[0].text; assert.ok(caseIndexReceiptFiles.includes(file));
      assert.equal(args[1].getText(after), 'index'); assert.ok(!seen.has(file)); seen.add(file);
      const originals = oldTests.filter(t => t.expression.arguments[0]?.text === title);
      assert.equal(originals.length, 1);
      const original = originals[0]; assert.ok(original.getText(before).includes(`readFileSync('${file}',`));
      const loops = original.expression.arguments.at(-1).body.statements.filter(n => ts.isForOfStatement(n) && n.expression.getText(before) === 'index.sourceFingerprints');
      assert.equal(loops.length, 1);
      edits.push({ start: node.getStart(after), end: node.end, text: loops[0].getText(before) });
    }
  }
  assert.deepEqual([...seen].sort(), [...caseIndexReceiptFiles].sort());
  let restored = after.text;
  for (const edit of edits.sort((a, b) => b.start - a.start)) restored = restored.slice(0, edit.start) + edit.text + restored.slice(edit.end);
  assert.equal(canonical(parse(restored)), canonical(before), 'suite changed beyond nine receipt assertions and one import');
  return { replacedReceiptAssertions: seen.size, allOtherStatementsConserved: true,
    originalSuiteAstSha256: createHash('sha256').update(canonical(before)).digest('hex') };
}
