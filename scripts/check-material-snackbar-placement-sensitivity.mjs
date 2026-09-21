import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import ts from 'typescript';

// Exercise the actual comparator, not a reimplementation of its predicates.
// Mock geometry/semantics only; this proves sensitivity, not browser visibility.
const file = 'tests/material-parity/run-material-parity.mjs';
const source = readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
assert.equal(ast.parseDiagnostics.length, 0);
const matches = ast.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === 'compareOverlayPlacement');
assert.equal(matches.length, 1);
const declaration = matches[0].getText(ast);
const compare = vm.runInNewContext(`(${declaration})`, {});
const reference = { x: 548, y: 944, width: 344, height: 48 };
const canvas = { x: 0, y: 0, width: 1440, height: 1000 };
const semantics = { exists: true, role: 'status', ariaLive: 'polite', name: 'Project saved UNDO' };
const locator = box => ({ first() { return this; }, async count() { return 1; },
  async boundingBox() { return box; }, async evaluate() { return semantics; } });
const referencePage = { locator: () => locator(reference) };
const candidatePage = { locator: selector => locator(selector === 'canvas' ? canvas : undefined) };
const cases = [
  ['equal', reference, true],
  ['shifted-right-100px', { ...reference, x: 648 }, true],
  ['half-width', { ...reference, width: 172 }, true],
  ['20px-taller-same-bottom', { ...reference, y: 924, height: 68 }, true],
  ['wrong-bottom-gap', { ...reference, y: 934 }, false],
  ['outside-canvas', { ...reference, x: 1400 }, false],
];
const results = [];
for (const [name, box, expected] of cases) {
  const borderBox = { left: box.x, top: box.y, width: box.width, height: box.height };
  const result = await compare(referencePage, candidatePage,
    { elements: { 'snack-bar-surface': { borderBox } } }, 'snack-bar', 'activate');
  assert.equal(result.matches, expected, name);
  results.push({ name, candidate: box, acceptedByPlacementCheck: result.matches,
    horizontalError: Math.abs(box.x - reference.x), widthError: Math.abs(box.width - reference.width),
    heightError: Math.abs(box.height - reference.height) });
}
console.log(JSON.stringify({ source: { file,
  functionSha256: createHash('sha256').update(declaration).digest('hex') }, reference, canvas, results,
  browserRenderingTest: false, fullHarnessFalseAcceptanceProven: false }, null, 2));
