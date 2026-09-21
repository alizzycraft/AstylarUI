import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import ts from 'typescript';

export const disabledInkIntegerGuard = String.raw`/^rgba\(\d+,\d+,\d+,0\.38\)$/`;
export const disabledInkDecimalGuard = String.raw`/^rgba\(\d+(?:\.\d+)?,\d+(?:\.\d+)?,\d+(?:\.\d+)?,0\.38\)$/`;
const historicalFunctionSha256 = 'add6ee139c1c10ce7adca9e61099cec23fe328ee49c99fc8d65069e030b71a5c';
const hash = text => createHash('sha256').update(text).digest('hex');

// This is source conservation, not color-value equivalence. Permit only the
// reviewed decimal-channel guard inside the fully pinned classifier function.
export function conserveDisabledInkGuard(source) {
  const text = source.toString().replaceAll('\r\n', '\n');
  const ast = ts.createSourceFile('audit.mjs', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  assert.equal(ast.parseDiagnostics.length, 0);
  const functions = ast.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === 'reviewedButtonPaintInput');
  assert.equal(functions.length, 1);
  const node = functions[0], body = node.getText(ast);
  const decimalCount = body.split(disabledInkDecimalGuard).length - 1;
  const integerCount = body.split(disabledInkIntegerGuard).length - 1;
  assert.ok(decimalCount === 1 && integerCount === 0 || decimalCount === 0 && integerCount === 1);
  const original = decimalCount ? body.replace(disabledInkDecimalGuard, disabledInkIntegerGuard) : body;
  assert.equal(hash(original), historicalFunctionSha256, 'disabled ink classifier changed beyond decimal-channel guard');
  return {
    source: text.slice(0, node.getStart(ast)) + original + text.slice(node.end),
    decimalGuardApplied: decimalCount === 1,
    historicalFunctionSha256,
    currentFunctionSha256: hash(body),
    colorValuesEquivalent: false,
  };
}
