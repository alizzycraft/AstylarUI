import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

// Reuse the existing checkpoint/AX collector; no fixture or renderer adaptation.
const base = 'scripts/audit-material-snackbar-ax.mjs';
const bytes = readFileSync(base);
const sha256 = createHash('sha256').update(bytes).digest('hex');
assert.equal(sha256, '14be7d0dde205b6ff1bea32ee740bf9f22b9eb4501b36a99ff475552f39169ca');
assert.ok(!process.argv.includes('--keyboard-undo') && !process.argv.includes('--after-announcement'));
let source = bytes.toString();
const replace = (before, after) => {
  assert.equal(source.split(before).length, 2, `Ambiguous Menu AX adaptation: ${before}`);
  source = source.replace(before, after);
};
replace("const script = 'scripts/audit-material-snackbar-ax.mjs';", "const script = 'scripts/audit-material-menu-ax.mjs';");
replace("c.family === 'snack-bar'", "c.family === 'menu'");
replace("const actionSource = { file: runnerFile, sha256: hash(runner), methodsSha256: hash(methods.join('\\n')) };",
  `const actionSource = { file: runnerFile, sha256: hash(runner), methodsSha256: hash(methods.join('\\n')), collector: ${JSON.stringify({ file: base, sha256 })} };`);
replace("? { surface: '.mat-mdc-snack-bar-container [aria-live]', undo: '.mat-mdc-snack-bar-container button' }\n  : { surface: '[data-astylar-id=\"snack-bar-surface\"]', undo: '[data-astylar-id=\"snack-bar-dismiss\"]' };",
  `? { trigger: '#menu-primary', popup: '.mat-mdc-menu-panel', rename: '.mat-mdc-menu-panel button:nth-child(1)', delete: '.mat-mdc-menu-panel button:nth-child(2)' }
  : { trigger: '[data-astylar-id="menu-primary"]', popup: '[data-astylar-id="menu-popup"]', rename: '[data-astylar-id="menu-rename"]', delete: '[data-astylar-id="menu-delete"]' };`);
replace("['surface', 'undo']", "['trigger', 'popup', 'rename', 'delete']");
replace('targetObservations: 4', 'targetObservations: 8');
replace("'sendShowcaseCommand', 'waitForThemeApplied'].map", "'sendShowcaseCommand', 'waitForThemeApplied', 'measureAstylarInputs'].map");
replace('return {performInteraction,settleInteraction,profileTheme,sendShowcaseCommand,waitForThemeApplied};',
  'return {performInteraction,settleInteraction,profileTheme,sendShowcaseCommand,waitForThemeApplied,measureAstylarInputs};');
replace("await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.measure(['snack-bar-surface', 'snack-bar-dismiss']).inputTree)",
  "(await actions.measureAstylarInputs(page, ['menu-primary', 'menu-popup', 'menu-rename', 'menu-delete'])).inputTree");
replace("tag: n.tagName, text: n.textContent, role: n.getAttribute('role'),",
  "tag: n.tagName, id: n.id, text: n.textContent, controls: n.getAttribute('aria-controls'), expanded: n.getAttribute('aria-expanded'), haspopup: n.getAttribute('aria-haspopup'), activeDescendant: n.getAttribute('aria-activedescendant'), role: n.getAttribute('role'),");
replace('Focused positive snackbar AX evidence on retained build; does not recover original e01 runner or establish current rendering/AT speech.',
  'Focused Menu trigger/popup/item DOM and AX evidence on retained build. No original-action equivalence,current-renderer,AT speech,paint or whole-case acceptance claim.');
const ast = ts.createSourceFile(base, source, 99, true, ts.ScriptKind.JS);
assert.equal(ast.parseDiagnostics.length, 0);
for (const node of ast.statements.filter(ts.isImportDeclaration).toReversed()) {
  const name = node.moduleSpecifier.text;
  if (name.startsWith('node:')) continue;
  const url = name.startsWith('.') ? pathToFileURL(path.resolve(path.dirname(base), name)).href : import.meta.resolve(name);
  source = source.slice(0, node.moduleSpecifier.getStart(ast)) + JSON.stringify(url) + source.slice(node.moduleSpecifier.end);
}
await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
