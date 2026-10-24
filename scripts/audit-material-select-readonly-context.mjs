import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

// Close missing case/context provenance,not rerun the shared readonly isolation.
const base = 'scripts/audit-material-snackbar-ax.mjs', bytes = readFileSync(base);
assert.equal(createHash('sha256').update(bytes).digest('hex'), '14be7d0dde205b6ff1bea32ee740bf9f22b9eb4501b36a99ff475552f39169ca');
assert.ok(!process.argv.includes('--keyboard-undo') && !process.argv.includes('--after-announcement'));
let source = bytes.toString();
const replace = (before, after) => { assert.equal(source.split(before).length, 2, before); source = source.replace(before, after); };
replace("const script = 'scripts/audit-material-snackbar-ax.mjs';", "const script = 'scripts/audit-material-select-readonly-context.mjs';");
replace("c.family === 'snack-bar'", "c.family === 'select'");
replace("c.state === 'open'", "c.state === 'focus'");
replace("? { surface: '.mat-mdc-snack-bar-container [aria-live]', undo: '.mat-mdc-snack-bar-container button' }\n  : { surface: '[data-astylar-id=\"snack-bar-surface\"]', undo: '[data-astylar-id=\"snack-bar-dismiss\"]' };",
  `? { control: '#select-primary' } : { control: '[data-astylar-id="select-control"]' };`);
replace("['surface', 'undo']", "['control']");
replace('targetObservations: 4', 'targetObservations: 2');
replace("'sendShowcaseCommand', 'waitForThemeApplied'].map", "'sendShowcaseCommand', 'waitForThemeApplied', 'measureAstylarInputs'].map");
replace('return {performInteraction,settleInteraction,profileTheme,sendShowcaseCommand,waitForThemeApplied};',
  'return {performInteraction,settleInteraction,profileTheme,sendShowcaseCommand,waitForThemeApplied,measureAstylarInputs};');
replace("await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.measure(['snack-bar-surface', 'snack-bar-dismiss']).inputTree)",
  "(await actions.measureAstylarInputs(page, ['select-control'])).inputTree");
replace("await page.goto(`${baseUrl}", `await page.addInitScript(() => {
              window.__readonlyContextKeys = [];
              document.addEventListener('keydown', e => window.__readonlyContextKeys.push({ key: e.key, trusted: e.isTrusted, id: e.target?.id, owner: e.target?.getAttribute?.('data-astylar-id') }), true);
            });
            await page.goto(\x60\x24{baseUrl}`);
replace('let keyboardObservation;', `let keyboardObservation;
            const observeReadonly = () => page.evaluate(({ side, selector }) => {
              const n = document.querySelector(selector), benchmark = window.__ASTYLAR_MATERIAL_BENCHMARK__;
              return { tag: n.tagName, id: n.id, value: 'value' in n ? n.value : null,
                text: n.textContent?.replace(/\\s+/g,' ').trim(), readonly: 'readOnly' in n ? n.readOnly : null,
                disabled: 'disabled' in n ? n.disabled : n.getAttribute('aria-disabled'), focused: n === document.activeElement,
                events: side === 'astylar' ? benchmark.events() : [], state: side === 'astylar' ? benchmark.state() : null };
            }, { side, selector: selectors(side).control });
            const beforeReadonly = await observeReadonly();
            await page.keyboard.press('x'); await actions.settleInteraction(page, side);
            const readonlyTrial = { action: 'supplementary-x-after-configured-focus', before: beforeReadonly,
              after: await observeReadonly(), keys: await page.evaluate(() => window.__readonlyContextKeys) };`);
replace('row[side] = { ax, observationDelayMs,', 'row[side] = { ax, readonlyTrial, observationDelayMs,');
replace('if (report.keyboardUndo) {', `assert.equal(row[side].readonlyTrial.action, 'supplementary-x-after-configured-focus');
    assert.ok(row[side].readonlyTrial.keys.some(e => e.key === 'x' && e.trusted));
    if (report.keyboardUndo) {`);
replace('Focused positive snackbar AX evidence on retained build; does not recover original e01 runner or establish current rendering/AT speech.',
  'Exact Select light/desktop-DPR1 focus action then supplementary trusted x;retained-build case/context evidence,not original editing replay,all readonly cases,current rendering or full AX/paint acceptance.');
const ast = ts.createSourceFile(base, source, 99, true, ts.ScriptKind.JS); assert.equal(ast.parseDiagnostics.length, 0);
for (const node of ast.statements.filter(ts.isImportDeclaration).toReversed()) {
  const name = node.moduleSpecifier.text; if (name.startsWith('node:')) continue;
  const url = name.startsWith('.') ? pathToFileURL(path.resolve(path.dirname(base), name)).href : import.meta.resolve(name);
  source = source.slice(0, node.moduleSpecifier.getStart(ast)) + JSON.stringify(url) + source.slice(node.moduleSpecifier.end);
}
await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
