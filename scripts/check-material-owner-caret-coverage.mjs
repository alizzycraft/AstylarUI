import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import ts from 'typescript';
import { collectOwnerCaretAttribution, ownerCaretAttributionFile } from './audit-material-owner-caret-attribution.mjs';
import { expectedOwnerCaretAttributionRows, validateOwnerCaretAttributionRows } from '../tests/material-parity/owner-caret-attribution-coverage.mjs';

assert.equal(process.argv.length, 2);
const hash = x => createHash('sha256').update(x).digest('hex');
const files = ['docs/material-input-equivalence-audit.json', 'docs/material-input-equivalence-audit.json.gz',
  'docs/material-input-equivalence-audit.md'];
const before = files.map(f => hash(readFileSync(f)));
const saved = JSON.parse(readFileSync(ownerCaretAttributionFile));
for (const s of saved.sourceFingerprints) assert.equal(hash(readFileSync(s.file, 'utf8').replaceAll('\r\n', '\n')), s.sha256);
delete saved.sourceFingerprints;
const replay = collectOwnerCaretAttribution();
assert.ok(isDeepStrictEqual(saved, replay), 'complete original attribution replay differs');
const parent = JSON.parse(readFileSync(saved.parent.file));
const raw = JSON.parse(readFileSync(saved.capture.file));
assert.equal(hash(readFileSync(saved.capture.file)), saved.capture.sha256);
const source = readFileSync(parent.productionNormalization.module, 'utf8');
const parsed = ts.createSourceFile(parent.productionNormalization.module, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const functions = parent.productionNormalization.functions.map(name => {
  const nodes = parsed.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
  assert.equal(nodes.length, 1); return nodes[0].getText(parsed);
}).join('\n');
assert.equal(hash(functions.replaceAll('\r\n', '\n')), parent.productionNormalization.sha256);
const normalize = new Function(functions + '\nreturn canonicalStyle;')();
const expected = expectedOwnerCaretAttributionRows(replay, parent, raw, normalize);
assert.deepEqual([expected.originalCasesScanned, expected.reviewedGroups, expected.reviewedObservations,
  expected.pendingGroups, expected.pendingObservations], [2311, 118, 3154, 27, 896]);
assert.deepEqual(validateOwnerCaretAttributionRows(expected, expected.rows), []);
const mutations = [
  x => x.pop(), x => { x[0] = structuredClone(x[1]); }, x => x.reverse(),
  x => { x[0].attribution = 'unresolved'; }, x => { x[0].classification = 'equivalent-representation'; },
  x => { x[0].astylar = '<omitted>'; }, x => { x[0].astylar = 'auto'; },
  x => { x[0].reference = 'red'; }, x => { x[0].occurrences--; },
  x => { x[0].reviewedCases.pop(); }, x => { x[0].reviewedCases.reverse(); },
  x => { const r = x.find(r => r.reviewedCases.length > 13); r.reviewedCases[13] = r.reviewedCases[12]; },
  x => { x[0].cases.pop(); }, x => { x[0].states.pop(); },
  x => { x[0].reviewEvidence.renderingEquivalent = true; },
  x => { x[0].reviewEvidence.proofSha256 = '0'.repeat(64); },
  x => { x.push({ ...structuredClone(x[0]), ...expected.pending[0] }); },
];
for (const [i, mutate] of mutations.entries()) {
  const rows = structuredClone(expected.rows); mutate(rows);
  assert.equal(validateOwnerCaretAttributionRows(expected, rows).length, 1, `coverage mutation ${i}`);
}
// Real canonical JSON omits undefined properties; only actual absence survives.
assert.deepEqual(validateOwnerCaretAttributionRows(expected, JSON.parse(JSON.stringify(expected.rows))), []);
const withOther = [...expected.rows, { family: 'unrelated', attribution: 'unresolved' }];
assert.deepEqual(validateOwnerCaretAttributionRows(expected, withOther), []);
assert.deepEqual(files.map(f => hash(readFileSync(f))), before);
const { rows, pending, ...summary } = expected;
console.log(JSON.stringify({ ...summary, plannedRowsSha256: hash(JSON.stringify(rows)),
  pendingMembershipSha256: hash(JSON.stringify(pending)), negativeControls: mutations.length,
  positiveControls: 3, fullOriginalAttributionReplayMatches: true, canonicalUnchanged: true }));
