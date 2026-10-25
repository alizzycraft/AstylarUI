import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';

// Control experiment: same public types/value/styles and typing sequence as the
// explicit-select-all probe,but real Tab supplies initial focus/selection.
const file='scripts/audit-public-email-selection.mjs',bytes=readFileSync(file);
assert.equal(createHash('sha256').update(bytes).digest('hex'),'20178c05a7901e681bcdf8cfc27607a9163dfcb9028f92f13c08bcc229310232');
let source=bytes.toString();
const before="const script='scripts/audit-public-email-selection.mjs';";
assert.equal(source.split(before).length,2);
source=source.replace(before,"const script='scripts/audit-public-email-tab-entry.mjs';");
source=source.replaceAll('Control+A','Tab').replaceAll('selected-all','tab-entry');
const marker='const ast=ts.createSourceFile(baseFile,source,99,true,ts.ScriptKind.JS);';
assert.equal(source.split(marker).length,2);
source=source.replace(marker,"replace('await page.evaluate(() => window.readonlyAudit.focus());','');\n"+marker);
const urls=Object.fromEntries(['typescript','playwright-core'].map(name=>[name,import.meta.resolve(name)]));
source=source.replaceAll('import.meta.resolve(name)',JSON.stringify(urls)+'[name]');
const tree=ts.createSourceFile(file,source,99,true,ts.ScriptKind.JS);assert.equal(tree.parseDiagnostics.length,0);
for(const node of tree.statements.filter(ts.isImportDeclaration).toReversed()){
 const name=node.moduleSpecifier.text;if(name.startsWith('node:'))continue;
 const url=name.startsWith('.')?pathToFileURL(path.resolve(path.dirname(file),name)).href:import.meta.resolve(name);
 source=source.slice(0,node.moduleSpecifier.getStart(tree))+JSON.stringify(url)+source.slice(node.moduleSpecifier.end);
}
await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
