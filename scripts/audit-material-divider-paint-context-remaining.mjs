import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

// Retain the completed desktop producer unchanged. Observe only the remaining
// physical viewport/DPR cohorts,using its same authenticated capture workflow.
let source = readFileSync('scripts/audit-material-divider-paint-context.mjs', 'utf8');
assert.equal(createHash('sha256').update(source).digest('hex'), 'bbac18bb5c6fcc0c1d3ccfda7843d8a46b63e99d39cf70305a439bb5e389b1a3');
const edit = (before, after) => { assert.equal(source.split(before).length, 2); source = source.replace(before, after); };
edit("import.meta.resolve('playwright-core')", JSON.stringify(import.meta.resolve('playwright-core')));
edit("readFileSync('scripts/audit-material-divider-paint-context.mjs')", "readFileSync('scripts/audit-material-divider-paint-context-remaining.mjs')");
edit('Read-only four-profile desktop DPR1 missing computed-paint fields', 'Read-only four-profile remaining viewport/DPR missing computed-paint fields');
const injection = `
replace("for(const profile of ['light','dark','contrast','custom'])for(const side of ['reference','astylar'])",
  "for(const context of [{id:'tablet',width:768,height:1024,deviceScaleFactor:1},{id:'mobile',width:390,height:844,deviceScaleFactor:2},{id:'comparison',width:609,height:844,deviceScaleFactor:1},{id:'desktop-dpr2',width:1440,height:1000,deviceScaleFactor:2}])for(const profile of ['light','dark','contrast','custom'])for(const side of ['reference','astylar'])");
replace('viewport:{width:1440,height:1000},deviceScaleFactor:1', 'viewport:{width:context.width,height:context.height},deviceScaleFactor:context.deviceScaleFactor');
replace('results.push({profile,side,observation,assets})', 'results.push({profile,side,context,observation,assets})');
assert.equal(source.split('return {properties,targets:').length,3);
source=source.replaceAll('return {properties,targets:', 'return {properties,viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},targets:');
`;
edit('await import(`data:text/javascript;base64,${Buffer.from(source).toString(\'base64\')}`);', injection + '\nawait import(`data:text/javascript;base64,${Buffer.from(source).toString(\'base64\')}`);');
await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
