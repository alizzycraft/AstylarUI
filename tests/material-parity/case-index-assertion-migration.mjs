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

// Authenticate the independently enumerated 39-file extension, then restore
// only its five membership/count expressions and diagnostic before comparing the whole suite.
export function restoreInventoryAssertion(source) {
  const ast = parse(source);
  const targets = tests(ast).filter(n => n.expression.arguments[0]?.text === 'records source fingerprints and actual visual acceptance fields');
  assert.equal(targets.length, 1);
  const callback = targets[0].expression.arguments[1];
  const declaration = callback.body.statements[0];
  const printed = printer.printNode(ts.EmitHint.Unspecified, declaration, ast);
  assert.equal(createHash('sha256').update(printed).digest('hex'),
    '20da22f11520f94760ed996f0c25c6673795b9f1d4e33696c9249360c8d6a52c', 'independent inventory table changed');
  let restored = callback.getText(ast);
  restored = restored.replace(declaration.getText(ast), '');
  const positioning = callback.body.statements.filter(n => ts.isVariableStatement(n)
    && n.declarationList.declarations[0]?.name.getText(ast) === 'positionFiles');
  if (positioning.length) {
    assert.equal(positioning.length, 1);
    assert.equal(createHash('sha256').update(printer.printNode(ts.EmitHint.Unspecified, positioning[0], ast)).digest('hex'),
      'ad7954b55c7e27a6b353c421f0ff1e646510537938503d5ad9bd159bf64b33c5', 'positioning inventory table changed');
    restored = restored.replace(positioning[0].getText(ast), '');
    for (const [current, previous] of [
      ['audit.sourceFingerprints.length, 424', 'audit.sourceFingerprints.length, 409'],
      ['entry.file)).size, 424', 'entry.file)).size, 409'],
      ['!visibilityFiles.includes(f) && !positionFiles.includes(f)', '!visibilityFiles.includes(f)'],
      ['...visibilityFiles, ...positionFiles].sort()', '...visibilityFiles].sort()'],
      ['...visibilityFiles, ...positionFiles])', '...visibilityFiles])'],
      ['14 visibility and 15 positioning dependencies', '14 visibility dependencies'],
    ]) {
      assert.equal(restored.split(current).length, 2, 'missing or repeated positioning assertion');
      restored = restored.replace(current, previous);
    }
  }
  const visibility = callback.body.statements.filter(n => ts.isVariableStatement(n)
    && n.declarationList.declarations[0]?.name.getText(ast) === 'visibilityFiles');
  if (visibility.length) {
    assert.equal(visibility.length, 1);
    assert.equal(createHash('sha256').update(printer.printNode(ts.EmitHint.Unspecified, visibility[0], ast)).digest('hex'),
      'cb1b499cb94b95ae9191d818b4064599f03fd927f996af26ccaaa8bcfdae457f', 'visibility inventory table changed');
    restored = restored.replace(visibility[0].getText(ast), '');
    for (const [current, previous] of [
      ['audit.sourceFingerprints.length, 409', 'audit.sourceFingerprints.length, 395'],
      ['entry.file)).size, 409', 'entry.file)).size, 395'],
      ['!additions.includes(f) && !visibilityFiles.includes(f)', '!additions.includes(f)'],
      ['[...followupFiles, ...alignmentFiles, ...additions, ...visibilityFiles].sort()', '[...followupFiles, ...alignmentFiles, ...additions].sort()'],
      ['for (const file of [...followupFiles, ...alignmentFiles, ...additions, ...visibilityFiles])', 'for (const file of [...followupFiles, ...alignmentFiles, ...additions])'],
      ['39 additional and 14 visibility dependencies', '39 additional dependencies'],
    ]) {
      assert.equal(restored.split(current).length, 2, `missing or repeated visibility assertion: ${current}`);
      restored = restored.replace(current, previous);
    }
  }
  for (const [current, previous] of [
    ['audit.sourceFingerprints.length, 395', 'audit.sourceFingerprints.length, 356'],
    ['entry.file)).size, 395', 'entry.file)).size, 356'],
    ['!followupFiles.includes(f) && !alignmentFiles.includes(f) && !additions.includes(f)', '!followupFiles.includes(f) && !alignmentFiles.includes(f)'],
    ['[...followupFiles, ...alignmentFiles, ...additions].sort()', '[...followupFiles, ...alignmentFiles].sort()'],
    ['for (const file of [...followupFiles, ...alignmentFiles, ...additions])', 'for (const file of [...followupFiles, ...alignmentFiles])'],
    ['38 follow-up, 10 alignment and 39 additional dependencies', '38 follow-up and 10 alignment dependencies'],
  ]) {
    assert.equal(restored.split(current).length, 2, `missing or repeated inventory assertion: ${current}`);
    restored = restored.replace(current, previous);
  }
  return ast.text.slice(0, callback.getStart(ast)) + restored + ast.text.slice(callback.end);
}

// Restore only the nine exact receipt checks and remove their one new import.
// The entire reconstructed suite, not just selected membership tests, must match.
export function verifyCaseIndexAssertionMigration(previous, current) {
  current = current.toString();
  const mappingImport = "  const { restoreMappingReadAdapterSource } = await import('./audit-evidence-session.mjs');\n";
  const mappingRead = ".update(source.file === 'tests/material-parity/generated-node-mapping-evidence.mjs'\n      ? restoreMappingReadAdapterSource(source, readFileSync(source.file))\n      : readFileSync(source.file, 'utf8').replace(/\\r\\n/g, '\\n'))";
  current = current.replaceAll('\r\n', '\n');
  const mappingReadAdapterAuthenticated = current.includes(mappingImport);
  if (mappingReadAdapterAuthenticated) {
    assert.equal(current.split(mappingImport).length, 2);
    assert.equal(current.split(mappingRead).length, 2);
    current = current.replace(mappingImport, '').replace(mappingRead,
      ".update(readFileSync(source.file, 'utf8').replace(/\\r\\n/g, '\\n'))");
  }
  const before = parse(previous), after = parse(restoreInventoryAssertion(current)), edits = [], seen = new Set();
  const imports = after.statements.filter(n => ts.isImportDeclaration(n) && n.moduleSpecifier.text === './historical-case-index-source-assertion.mjs');
  assert.equal(imports.length, 1);
  assert.equal(imports[0].importClause?.name, undefined);
  assert.equal(imports[0].importClause?.namedBindings?.elements?.length, 1);
  assert.equal(imports[0].importClause.namedBindings.elements[0].getText(after), 'assertHistoricalCaseIndexSources');
  edits.push({ start: imports[0].getStart(after), end: imports[0].end, text: '' });
  const oldTests = tests(before), addedIsolatedTests = [];
  for (const statement of tests(after)) {
    const call = statement.expression, title = call.arguments[0]?.text;
    // New literal callbacks are not executed by the `case index` replay filter.
    // Permit additive focused coverage while preserving every old statement.
    if (!oldTests.some(t => t.expression.arguments[0]?.text === title)) {
      assert.equal(typeof title, 'string');
      assert.ok(!title.includes('case index'), 'new historical membership test requires review');
      assert.equal(call.arguments.length, 2);
      assert.ok(ts.isArrowFunction(call.arguments[1]) || ts.isFunctionExpression(call.arguments[1]));
      assert.ok(!addedIsolatedTests.includes(title), 'duplicate added test');
      addedIsolatedTests.push(title);
      edits.push({ start: statement.getStart(after), end: statement.end, text: '' });
      continue;
    }
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
  assert.equal(canonical(parse(restored)), canonical(before), 'suite changed beyond nine receipt assertions, one import and the authenticated inventory extension');
  return { replacedReceiptAssertions: seen.size, allOtherStatementsConserved: true, addedIsolatedTests, mappingReadAdapterAuthenticated,
    originalSuiteAstSha256: createHash('sha256').update(canonical(before)).digest('hex') };
}
