import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import test from 'node:test';
import ts from 'typescript';
import vm from 'node:vm';

const files = ['src/app/services/dom/elements/flex.service.ts',
  'examples/material-showcase/node_modules/astylarui/dist/lib/app/services/dom/elements/flex.service.js'];
const hash = value => createHash('sha256').update(value).digest('hex');

function extract(file) {
  const source = readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true,
    file.endsWith('.ts') ? ts.ScriptKind.TS : ts.ScriptKind.JS);
  assert.equal(tree.parseDiagnostics.length, 0);
  const matches = [];
  function visit(node) {
    if (ts.isMethodDeclaration(node) && node.name.getText(tree) === 'calculateIntrinsicContainerHeight') matches.push(node);
    ts.forEachChild(node, visit);
  }
  visit(tree); assert.equal(matches.length, 1);
  const method = matches[0].getText(tree);
  const compiled = ts.transpileModule(`class Probe { ${method} }`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  }).outputText;
  const Probe = vm.runInNewContext(compiled + '\nProbe;');
  const instance = new Probe();
  instance.parsePadding = () => ({ top: 0, right: 0, bottom: 0, left: 0 });
  instance.measureIntrinsicFlowChild = () => ({ width: 64, height: 19,
    margin: { top: 0, right: 0, bottom: 0, left: 0 } });
  return { instance, receipt: { file, sourceSha256: hash(source), methodSha256: hash(method) } };
}

test('repository and installed nowrap flex height calculators demonstrate first-scalar border loss', () => {
  const evidence = files.map(file => {
    const { instance, receipt } = extract(file);
    const cases = [
      { borderWidth: '0', expectedCssHeight: 19, observedHeight: 19 },
      { borderWidth: '1px', expectedCssHeight: 21, observedHeight: 21 },
      { borderWidth: '0 0 1px 0', expectedCssHeight: 20, observedHeight: 19 },
      { borderWidth: '1px 0 0 0', expectedCssHeight: 20, observedHeight: 21 },
      { borderWidth: '0 1px 0 0', expectedCssHeight: 19, observedHeight: 19 },
    ].map(row => {
      const actual = instance.calculateIntrinsicContainerHeight({ children: [{ type: 'div' }] },
        { display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', borderStyle: 'solid', borderWidth: row.borderWidth }, [], {}, {}, 120);
      assert.equal(actual, row.observedHeight);
      return { ...row, actual, delta: actual - row.expectedCssHeight };
    });
    return { receipt, cases };
  });
  assert.deepEqual(evidence[0].cases, evidence[1].cases);
  console.log(JSON.stringify({ evidence, scope: 'Exact extracted calculator; child measurement stubbed at independently reproduced 19px. Not a public runtime call trace or renderer fix.' }));
});
