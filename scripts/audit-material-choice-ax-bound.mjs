import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const file = 'scripts/audit-material-choice-ax.mjs', bytes = readFileSync(file);
const sha256 = '006689a53890adc703e20b49d3c4975ea9229db083d99b68ac7a0743d0a28401';
assert.equal(createHash('sha256').update(bytes).digest('hex'), sha256);
let source = bytes.toString();
const replace = (before, after) => {
  assert.equal(source.split(before).length, 2, `Ambiguous AX measurement correction: ${before}`);
  source = source.replace(before, after);
};
replace("const script = 'scripts/audit-material-choice-ax.mjs'", "const script = 'scripts/audit-material-choice-ax-bound.mjs'");
replace("import { propertyGroups }", "import { captureBrowserInputTree } from '../tests/material-parity/input-tree-evidence.mjs';\nimport { propertyGroups }");
replace("'waitForThemeApplied'];", "'waitForThemeApplied', 'measureAstylarInputs'];");
replace('sendShowcaseCommand,waitForThemeApplied};', 'sendShowcaseCommand,waitForThemeApplied,measureAstylarInputs};');
replace('await cdp.detach();row[side]=', `const tree = side === 'reference' ? await page.evaluate(captureBrowserInputTree, {styleProperties:properties}) : (await actions.measureAstylarInputs(page,[])).inputTree;
          const treeFile = evidence.directory+'/'+c.family+'-'+c.profile+'-'+c.viewport.id+'-'+side+'-input-tree.json', treeBytes=Buffer.from(JSON.stringify(tree));
          writeFileSync(treeFile,treeBytes,{flag:'wx'});
          await cdp.detach();row[side]=`);
replace("{boundary:'after-exact-configured-focus-and-settlement',ax,runtime:", "{boundary:'after-exact-configured-focus-and-settlement',ax,inputTree:{file:treeFile,sha256:hash(treeBytes)},inputTreeBoundary:'After AX observations;candidate uses exact maintained measurement settlement guard.',runtime:");
replace('actionSource,results,', `actionSource,sourcePredecessor:${JSON.stringify({file,sha256})},results,`);
const ast = ts.createSourceFile(file,source,99,true,ts.ScriptKind.JS);
assert.equal(ast.parseDiagnostics.length,0);
for(const node of ast.statements.filter(ts.isImportDeclaration).toReversed()){
  const name=node.moduleSpecifier.text;if(name.startsWith('node:'))continue;
  const url=name.startsWith('.')?pathToFileURL(path.resolve(path.dirname(file),name)).href:import.meta.resolve(name);
  source=source.slice(0,node.moduleSpecifier.getStart(ast))+JSON.stringify(url)+source.slice(node.moduleSpecifier.end);
}
await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
