import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import test from 'node:test';
import { fingerprintDirectory, fingerprintModuleGraph, materialCaseKey, openMaterialCheckpoint } from './run-checkpoint.mjs';

const setup = () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'material-checkpoint-'));
  const evidence = path.join(directory, 'case');
  mkdirSync(evidence);
  writeFileSync(path.join(evidence, 'tree.json'), '{"nodes":[]}');
  return { directory, evidence, provenance: { browser: 'test-browser', build: 'same-build', cases: ['one'] } };
};

test('fingerprints transitive local imports but not unrelated review files', () => {
  const { directory } = setup();
  writeFileSync(path.join(directory, 'entry.mjs'), "import { value } from './dependency.mjs';");
  writeFileSync(path.join(directory, 'dependency.mjs'), "export { value } from './leaf.mjs';");
  writeFileSync(path.join(directory, 'leaf.mjs'), 'export const value = 1;');
  const initial = fingerprintModuleGraph(directory, 'entry.mjs');
  assert.equal(initial.length, 3);
  writeFileSync(path.join(directory, 'review.mjs'), 'unrelated');
  assert.deepEqual(fingerprintModuleGraph(directory, 'entry.mjs'), initial);
  writeFileSync(path.join(directory, 'leaf.mjs'), 'export const value = 2;');
  assert.notDeepEqual(fingerprintModuleGraph(directory, 'entry.mjs'), initial);
});

test('resumes completed results including failures while leaving unfinished cases uncaptured', () => {
  const data = setup();
  const journal = openMaterialCheckpoint(data);
  const result = { meetsAcceptance: false, runtimeErrors: ['known defect'] };
  journal.save('one', result, data.evidence);
  const resumed = openMaterialCheckpoint({ ...data, resume: true });
  assert.deepEqual(resumed.load('one'), result);
  assert.equal(resumed.load('two'), undefined);
  assert.throws(() => openMaterialCheckpoint(data), /already exists/);
  assert.throws(() => resumed.save('one', {}, data.evidence), /overwritten/);
});

test('rejects changed browser, build, matrix, result, or captured artifacts', () => {
  const data = setup();
  const journal = openMaterialCheckpoint(data);
  journal.save('one', { meetsAcceptance: true }, data.evidence);
  for (const field of ['browser', 'build', 'cases']) assert.throws(() => openMaterialCheckpoint({ ...data, resume: true,
    provenance: { ...data.provenance, [field]: 'changed' } }), /provenance differs/);
  writeFileSync(path.join(data.evidence, 'tree.json'), '{}');
  assert.throws(() => journal.load('one'), /artifact changed/);
  const file = path.join(data.directory, 'checkpoint', readdirSync(path.join(data.directory, 'checkpoint')).find((name) => name !== 'manifest.json'));
  const record = JSON.parse(readFileSync(file, 'utf8'));
  record.result.meetsAcceptance = false;
  writeFileSync(file, JSON.stringify(record));
  assert.throws(() => journal.load('one'), /result digest changed/);
});

test('does not mistake partial temporary writes or a different state for a completed case', () => {
  const data = setup();
  const journal = openMaterialCheckpoint(data);
  writeFileSync(path.join(data.directory, 'checkpoint', 'partial.json.tmp'), '{');
  assert.equal(journal.load('one'), undefined);
  const entry = { family: 'chips', profile: 'light', viewport: { id: 'desktop', deviceScaleFactor: 1 } };
  assert.notEqual(materialCaseKey('static', entry), materialCaseKey('interaction', entry));
  assert.notEqual(materialCaseKey('interaction', entry), materialCaseKey('interaction', { ...entry, state: 'hover' }));
  assert.throws(() => journal.save('outside', {}, path.dirname(data.directory)), /escapes/);
  const first = fingerprintDirectory(data.evidence);
  assert.equal(first.length, 1);
  writeFileSync(path.join(data.evidence, 'font.woff2'), 'font');
  assert.notDeepEqual(fingerprintDirectory(data.evidence), first);
});
