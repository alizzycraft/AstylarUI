import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { restoreStaticSemanticCaseSelection } from './tabs-semantic-registration.mjs';
import { staticSemanticInputsReview, createDividerReviewedBoundariesReader } from './text-backing-case-review-source.mjs';
const files = [
  ['case', 'tests/material-parity/text-backing-case-review-source.mjs'],
  ['runner', 'scripts/run-material-input-audit.mjs'],
  ['launcher', 'scripts/export-material-input-audit-current-ancestry.mjs'],
];
const normalize = b => b.toString().replaceAll('\r\n', '\n');
test('static semantic case selection restores complete accepted predecessor sources and rejects drift', () => {
  for (const [kind, file] of files) {
    const source = normalize(fs.readFileSync(file));
    const previous = normalize(execFileSync('git', ['show', `21de384a:${file}`], { maxBuffer: 4000000 }));
    assert.equal(restoreStaticSemanticCaseSelection(source, kind), previous);
    assert.equal(restoreStaticSemanticCaseSelection(previous, kind), previous);
    assert.throws(() => restoreStaticSemanticCaseSelection(source + '\n// drift', kind));
    const forged = source.replace('staticSemanticInputs', 'staticSemanticInputsForged'); assert.notEqual(forged, source);
    assert.throws(() => restoreStaticSemanticCaseSelection(forged, kind));
  }
  assert.throws(() => createDividerReviewedBoundariesReader({ root: process.cwd(), read: fs.readFileSync, reviewSha256: '0'.repeat(64) }));
});
test('static semantic named launcher selects only the exact new proposal and preserves old invocation', () => {
  const launcher = files[2][1], run = flags => JSON.parse(execFileSync(process.execPath, [launcher, ...flags, '--dry-run'], { encoding: 'utf8' }));
  const current = run(['--static-semantic-inputs']), prior = run(['--tabs-menu-sheet']);
  const oldId = '7eb107dec98a464f2c859c3c6f205d678719649b890c586bb52ce2d1d59640b4';
  assert.equal(current.args.filter(a => a.includes(staticSemanticInputsReview)).length, 2);
  assert.deepEqual({ ...current, args: current.args.map(a => a.replaceAll(staticSemanticInputsReview, oldId)) }, prior);
  for (const other of ['--static-ax', '--card-inputs', '--expansion-semantics', '--stepper-inputs', '--tabs-menu-sheet'])
    assert.throws(() => execFileSync(process.execPath, [launcher, '--static-semantic-inputs', other, '--dry-run'], { stdio: 'pipe' }));
});
