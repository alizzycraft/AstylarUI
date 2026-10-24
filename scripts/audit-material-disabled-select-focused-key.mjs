import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

// Reuse the retained disabled probe; remove only the intervening pointer action.
const file='scripts/audit-material-disabled-control-boundaries.mjs';
const bytes=readFileSync(file);
assert.equal(createHash('sha256').update(bytes).digest('hex'),'022b5d6c6f6f65b5607b72796b697eee61e2ceb5aac940d577be04e05c235b49');
let source=bytes.toString();
const replace=(before,after)=>{assert.equal(source.split(before).length,2,before);source=source.replace(before,after);};
replace("\"const script = 'scripts/audit-material-disabled-control-boundaries.mjs';\"", "\"const script = 'scripts/audit-material-disabled-select-focused-key.mjs';\"");
replace("\"const families = ['form-field', 'input', 'autocomplete', 'select', 'datepicker', 'timepicker'];\"", "\"const families = ['select'];\"");
replace("'assert.equal(cases.length, 6);'", "'assert.equal(cases.length, 1);'");
replace('await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);','// No pointer action: preserve focus until the trusted key.');
assert.equal(source.split('after-pointer-attempt').length,3);
source=source.replaceAll('after-pointer-attempt','before-key-without-pointer');
replace('Six retained-build light/desktop-DPR1 disabled contexts with supplementary DOM focus,pointer and x attempts.', 'One retained-build light/desktop-DPR1 disabled Select with supplementary DOM focus then trusted x WITHOUT an intervening pointer action.');
source=source.replace("from 'typescript'",`from ${JSON.stringify(import.meta.resolve('typescript'))}`);
source=source.replace('import.meta.resolve(name)',`(${JSON.stringify({typescript:import.meta.resolve('typescript'),'playwright-core':import.meta.resolve('playwright-core')})}[name] ?? (()=>{throw Error('Unreviewed external import: '+name);})())`);
await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
