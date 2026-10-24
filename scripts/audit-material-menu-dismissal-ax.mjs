import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

// Add a supplementary Escape/AX boundary to the pinned desktop collector.
const file = 'scripts/audit-material-menu-ax-contexts.mjs', bytes = readFileSync(file);
assert.equal(createHash('sha256').update(bytes).digest('hex'), '3d6be8a7248fe994c73d27ce6c5734154d350a35fdfd72a0dec9f8c8e314fb83');
const urls = Object.fromEntries(['typescript', 'playwright-core'].map(name => [name, import.meta.resolve(name)]));
let source = bytes.toString().replace(/^source = source\.replace\(': import\.meta\.resolve\(name\);'.*$/m, '')
  .replaceAll('import.meta.resolve(name)', `${JSON.stringify(urls)}[name]`);
source = source.replace('let source = bytes.toString();',
  `let source = bytes.toString().replaceAll('import.meta.resolve(name)', ${JSON.stringify(`${JSON.stringify(urls)}[name]`)});`);
source = source.replace("const script = 'scripts/audit-material-menu-ax-contexts.mjs';", "const script = 'scripts/audit-material-menu-dismissal-ax.mjs';");
const additions = [
  ['let keyboardObservation;', `let keyboardObservation;
            await page.keyboard.press('Escape');
            await actions.settleInteraction(page, side);
            const dismissalSession = await context.newCDPSession(page);
            const dismissalAX = { action: 'supplementary-Escape-after-maintained-open',
              popupCount: await page.locator(selectors(side).popup).count(),
              trigger: await page.locator(selectors(side).trigger).evaluate(n => ({ id: n.id, controls: n.getAttribute('aria-controls'), expanded: n.getAttribute('aria-expanded'), focused: n === document.activeElement })),
              ...await dismissalSession.send('Accessibility.getFullAXTree') };
            await dismissalSession.detach();`],
  ['row[side] = { ax, observationDelayMs,', 'row[side] = { ax, dismissalAX, observationDelayMs,'],
  ['if (report.keyboardUndo) {', `assert.equal(row[side].dismissalAX.action, 'supplementary-Escape-after-maintained-open');
    assert.equal(row[side].dismissalAX.popupCount, 0);
    assert.equal(row[side].dismissalAX.nodes.some(n => n.backendDOMNodeId === row[side].ax.popup.backendNodeId && !n.ignored), false);
    if (report.keyboardUndo) {`],
];
const marker = 'const adaptations = [';
assert.equal(source.split(marker).length, 2);
source = source.replace(marker, marker + '\n' + additions.map(pair => JSON.stringify(pair) + ',').join('\n'));
const ast = ts.createSourceFile(file, source, 99, true, ts.ScriptKind.JS);
assert.equal(ast.parseDiagnostics.length, 0);
for (const node of ast.statements.filter(ts.isImportDeclaration).toReversed()) {
  const name = node.moduleSpecifier.text;
  if (name.startsWith('node:')) continue;
  const url = name.startsWith('.') ? pathToFileURL(path.resolve(path.dirname(file), name)).href : import.meta.resolve(name);
  source = source.slice(0, node.moduleSpecifier.getStart(ast)) + JSON.stringify(url) + source.slice(node.moduleSpecifier.end);
}
await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
