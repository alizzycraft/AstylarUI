import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

// Preserve the first capture's producer; correct only the demonstrated observer gap.
const file = 'scripts/audit-material-select-readonly-context.mjs';
const bytes = readFileSync(file);
assert.equal(createHash('sha256').update(bytes).digest('hex'), 'e93c74836e85a34afff2e92fe6d2eee670964d71d7c61eeda316e3c2da0b3851');
let source = bytes.toString();
const replace = (before, after) => {
  assert.equal(source.split(before).length, 2, before);
  source = source.replace(before, after);
};
replace("\"const script = 'scripts/audit-material-select-readonly-context.mjs';\"", "\"const script = 'scripts/audit-material-select-readonly-host.mjs';\"");
replace("{ control: '#select-primary' }", "{ control: '#select-control' }");
replace('const beforeReadonly = await observeReadonly();', `const beforeReadonly = await observeReadonly();
            assert.equal(beforeReadonly.focused, true);
            assert.equal(beforeReadonly.disabled, side === 'reference' ? 'false' : false);
            assert.equal(beforeReadonly.tag, side === 'reference' ? 'MAT-SELECT' : 'INPUT');`);
replace("assert.equal(row[side].readonlyTrial.action,", `assert.equal(row[side].readonlyTrial.before.focused, true);
    assert.equal(row[side].readonlyTrial.before.tag, side === 'reference' ? 'MAT-SELECT' : 'INPUT');
    assert.equal(row[side].readonlyTrial.before.disabled, side === 'reference' ? 'false' : false);
    assert.equal(row[side].readonlyTrial.action,`);
source = source.replace("from 'typescript'", `from ${JSON.stringify(import.meta.resolve('typescript'))}`);
source = source.replace('import.meta.resolve(name)', `(${JSON.stringify({typescript: import.meta.resolve('typescript'), 'playwright-core': import.meta.resolve('playwright-core')})}[name] ?? (() => { throw new Error('Unreviewed external import: ' + name); })())`);
// The nested adapter resolves its own non-node imports relative to the pinned base.
await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
