import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { stripVTControlCharacters } from 'node:util';
import { buildGapValueProof, readGapValueProof } from './audit-material-gap-value-proof.mjs';

assert.equal(process.argv.length, 2);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const canonical = ['docs/material-input-equivalence-audit.json', 'docs/material-input-equivalence-audit.json.gz',
  'docs/material-input-equivalence-audit.md'];
const before = canonical.map(file => hash(readFileSync(file)));
const report = buildGapValueProof();
assert.deepEqual(report, JSON.parse(readFileSync('docs/material-gap-value-public-proof.json')));
const log = stripVTControlCharacters(readFileSync(report.logs[0].file, 'utf8'));
const isRecord = line => line.startsWith("INFO: 'MATERIAL_GAP_VALUE_PROOF', '");
const changeRecords = mutate => log.split(/\r?\n/).map(line => {
  if (!isRecord(line)) return line;
  const start = line.indexOf('{'), end = line.lastIndexOf('}') + 1, row = JSON.parse(line.slice(start, end));
  mutate(row); return line.slice(0, start) + JSON.stringify(row) + line.slice(end);
}).join('\n');
const rowMutations = [
  r => { r.site.styles[1].gap = '99px'; },
  r => { r.css += '\n#gap-host{gap:99px}'; },
  r => { r.site.styles[1].gap = '99px'; r.css = r.css.replace('gap:8px', 'gap:99px'); },
  r => { r.site.root.children[0].children.pop(); },
  r => { r.observations[0].reference.width++; },
  r => { r.normal.gap = '99px'; },
  r => { r.effective.gap = '99px'; },
  r => { r.diagnostics.push({ severity: 'error', message: 'unexpected runtime failure' }); },
  r => { r.dpr = 2; },
  r => { r.userAgent = 'unknown-browser'; },
  r => { r.scope = 'full visual parity'; },
  r => { r.mode = 'unknown-mode'; },
  r => { r.variant = 'unknown-variant'; },
  r => { r.observations.reverse(); },
  r => { r.observations[1].actual.x = NaN; },
  r => { r.observations[1].actual.x++; },
  r => { r.browserGap.columnGap = '99px'; },
];
for (const [i, mutate] of rowMutations.entries()) assert.throws(() => readGapValueProof(changeRecords(mutate)), `row mutation ${i}`);
const logMutations = [
  value => value.replace('TOTAL: 10 FAILED, 14 SUCCESS', 'TOTAL: 24 SUCCESS'),
  value => value.split('\n').filter(line => !isRecord(line) || !line.includes('"mode":"grid","variant":"normal"')).join('\n'),
  value => { let removed = false; return value.split('\n').filter(line => {
    if (!removed && line.includes('Expected ')) { removed = true; return false; } return true;
  }).join('\n'); },
  value => value + '\nUnexpected lifecycle result: Expected 2 to be 0.\n',
];
for (const [i, mutate] of logMutations.entries()) assert.throws(() => readGapValueProof(mutate(log)), `log mutation ${i}`);
assert.deepEqual(canonical.map(file => hash(readFileSync(file))), before);
console.log(JSON.stringify({ cases: report.cases.length, failed: 10, passed: 14, propertyFailures: report.mismatches.length,
  negativeControls: rowMutations.length + logMutations.length, repeatIdentical: true, canonicalUnchanged: true }));
