import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { sourceAuditDefinitions } from './input-equivalence-policy.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
function captured(file, sha256) {
  const bytes = readFileSync(file); assert.equal(hash(bytes), sha256);
  return JSON.parse(bytes);
}
const proposalDigest = 'a79bdf4496b89608128fcd7ca223508ce576a1728ba856c030ca15e0a32e5266';

test('shared button touch proposal preserves all prior definitions and the existing core unit limitation', () => {
  const envelope = JSON.parse(readFileSync(`artifacts/material-parity/working-audit/proposals/${proposalDigest}.json`));
  assert.equal(hash(JSON.stringify(envelope.review)), proposalDigest);
  const proposed = envelope.review.groups;
  assert.equal(proposed.length, 171);
  // Both named stages are exact inventories,not permission to accept another count.
  if (sourceAuditDefinitions.length === 170) assert.deepEqual(proposed.slice(0, -1), sourceAuditDefinitions);
  else { assert.equal(sourceAuditDefinitions.length, 171); assert.deepEqual(proposed, sourceAuditDefinitions); }
  const added = proposed.at(-1);
  assert.equal(added.id, 'fixture-shared-button-touch-descendant-omission');
  assert.equal(added.classification, 'application-plugin-authoring-defect');
  const source = readFileSync(added.file, 'utf8');
  assert.equal([...source.matchAll(new RegExp(added.pattern, 'g'))].length, 1);
  const existing = proposed.filter(r => r.id === 'core-transform-translation-discards-css-units');
  assert.equal(existing.length, 1);
  assert.equal(existing[0].classification, 'intentional-documented-limitation');
  assert.deepEqual(existing[0], sourceAuditDefinitions.find(r => r.id === existing[0].id));
});

test('shared button touch retained input proof replays all owners without promoting suppressed targets', () => {
  const retained = captured('artifacts/material-parity/button-touch-retained-inputs-20261020.log',
    'a6756e4a0bcab6904d14959d5bb70775ef02d358c6b1d955638e769c50aec7dd');
  const actual = JSON.parse(execFileSync(process.execPath, ['scripts/audit-material-button-touch-inputs.mjs'],
    { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, timeout: 60000, windowsHide: true }));
  assert.deepEqual(actual, retained);
  assert.equal(actual.rows.length, 600); assert.equal(actual.cases, 480);
  assert.equal(actual.rejectedControls, 1200);
  const counts = Object.fromEntries(['declared-visible-target-not-runtime-verified', 'target-display-none', 'target-pointer-events-none']
    .map(reason => [reason, actual.rows.filter(r => r.requestDisposition === reason).length]));
  assert.deepEqual(Object.values(counts), [276, 294, 30]);
  assert.ok(actual.rows.every(r => r.actualActivationVerified === false && r.candidate.childCount === 0));
});

test('shared button touch public percentage matrix remains a failure distinct from literal controls', () => {
  const report = captured('artifacts/material-parity/public-button-touch-target-complete-20261020/latest-report.json',
    '92031c0f08e2b84e938744e2fe6128254574b0247281e3a7e906f39def3c35da');
  assert.equal(report.accepted, false); assert.equal(report.captures.length, 32);
  assert.equal(report.boundaryFailures.length, 4); assert.deepEqual(report.errors, []);
  assert.ok(report.captures.every(c => c.disposed?.disposed === true && c.trials.length === 5));
  let differences = 0;
  for (const dpr of [1, 2]) for (const translated of [false, true]) {
    for (const variant of ['plain', 'touch', 'touch-centered', 'touch-centered-px']) {
      const pair = ['reference', 'astylar'].map(mode => {
        const rows = report.captures.filter(c => c.mode === mode && c.dpr === dpr && c.translated === translated && c.variant === variant);
        assert.equal(rows.length, 1); return rows[0];
      });
      assert.deepEqual(pair[0].initial.site, pair[1].initial.site);
      const expected = variant === 'plain' ? [0, 0, 1, 0, 0] : [1, 1, 1, 0, 0];
      assert.deepEqual(pair[0].trials.map(t => t.parentClicks), expected);
      assert.deepEqual(pair[1].trials.map(t => t.parentClicks), variant === 'touch-centered' ? [1, 0, 1, 1, 0] : expected);
      differences += pair[0].trials.filter((t, i) => t.parentClicks !== pair[1].trials[i].parentClicks).length;
    }
  }
  assert.equal(differences, 8);
  assert.ok(report.boundaryFailures.every(r => r.mode === 'astylar' && r.variant === 'touch-centered' && r.point.name === 'far-above8'));
  const material = captured('artifacts/material-parity/button-paired-touch-target-20261020.log',
    'c207422cc32a5553249c698c5cfc0cf82f19c700424e15563edb8dfc1926d9a7');
  assert.deepEqual(material.captures.map(c => c.side), ['reference', 'astylar']);
  assert.deepEqual(material.captures[0].trials.map(t => t.buttonClickCount), [1, 1, 1, 0, 0]);
  assert.deepEqual(material.captures[1].trials.map(t => t.buttonClickCount), [0, 0, 1, 0, 0]);
  for (const capture of material.captures) {
    assert.deepEqual(capture.runtimeErrors, []);
    assert.ok(capture.trials.every(t => t.browser.length > 0 && t.browser.every(e => e.trusted === true)));
  }
});
