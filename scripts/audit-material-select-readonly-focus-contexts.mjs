import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

// Preserve the original one-context producer and its corrected host observation.
const file='scripts/audit-material-select-readonly-host.mjs',bytes=readFileSync(file);
assert.equal(createHash('sha256').update(bytes).digest('hex'),'9e7c5bf76751930e9764f4b8ea1075b61d0049859d2e11c01aa829b3150bc073');
let source=bytes.toString();
const before="source = source.replace(\"from 'typescript'\"";
assert.equal(source.split(before).length,2);
const extend=`
source=source.replace('scripts/audit-material-select-readonly-host.mjs','scripts/audit-material-select-readonly-focus-contexts.mjs');
const marker='const ast = ts.createSourceFile(base, source, 99, true, ts.ScriptKind.JS);';
assert.equal(source.split(marker).length,2);
source=source.replace(marker,\`replace("c.profile === 'light' &&", "");
replace("c.viewport.id === 'desktop-dpr1' &&", "");
replace('assert.equal(cases.length, 1);','assert.equal(cases.length, 8);');
replace("colorScheme: 'light'", "colorScheme: c.profile === 'dark' ? 'dark' : 'light'");
replace('side}-input-tree.json', "side+'-'+c.profile+'-'+c.viewport.id}-input-tree.json");
replace('Exact Select light/desktop-DPR1 focus action then supplementary trusted x;', 'Eight configured Select focus contexts then supplementary trusted x;');
\`+marker);
`;
source=source.replace(before,extend+before);
source=source.replaceAll("import.meta.resolve('typescript')",JSON.stringify(import.meta.resolve('typescript')));
source=source.replaceAll("import.meta.resolve('playwright-core')",JSON.stringify(import.meta.resolve('playwright-core')));
await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
