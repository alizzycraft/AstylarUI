import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fingerprintDirectory, fingerprintModuleGraph, materialBrowserLaunchOptions, inspectMaterialBrowserLaunch, materialCaseKey, openMaterialCheckpoint } from './run-checkpoint.mjs';
import { withAuditScratch } from './audit-scratch.mjs';

test('Material launch preserves native scrollbars and records stable effective evidence', async () => {
  const options = materialBrowserLaunchOptions('chrome');
  assert.deepEqual(options, { channel: 'chrome', headless: true,
    ignoreDefaultArgs: ['--hide-scrollbars'], args: ['--enable-automation'] });
  assert.equal(materialBrowserLaunchOptions('chromium').channel, 'chromium');
  const inspect = async arguments_ => {
    let detached = false;
    const browser = { newBrowserCDPSession: async () => ({
      send: async command => { assert.equal(command, 'Browser.getBrowserCommandLine'); return { arguments: arguments_ }; },
      detach: async () => { detached = true; },
    }) };
    try { return await inspectMaterialBrowserLaunch(browser, options); }
    finally { assert.equal(detached, true, 'inspection session is released on success and rejection'); }
  };
  const first = await inspect(['--headless', '--user-data-dir=C:/temporary-one']);
  const second = await inspect(['--headless=new', '--user-data-dir=C:/temporary-two']);
  assert.deepEqual(first, second, 'transient profile path and equivalent headless syntax do not invalidate resume');
  assert.deepEqual(first.effective, { headless: true, nativeScrollbarsHidden: false });
  assert.equal(first.driver.package, 'playwright-core');
  assert.match(first.driver.sha256, /^[a-f0-9]{64}$/);
  options.args.push('--changed-after-inspection');
  assert.deepEqual(first.requested.args, ['--enable-automation']);
  await assert.rejects(inspect(['--headless', '--hide-scrollbars']), /preserve native scrollbars/);
  await assert.rejects(inspect([]), /headless launch evidence is missing/);
});

const setup = directory => {
  const evidence = path.join(directory, 'case');
  mkdirSync(evidence);
  writeFileSync(path.join(evidence, 'tree.json'), '{"nodes":[]}');
  return { directory, evidence, provenance: { browser: 'test-browser', build: 'same-build', cases: ['one'],
    browserLaunch: { effective: { nativeScrollbarsHidden: false }, driver: { sha256: 'same-driver' } } } };
};

test('fingerprints transitive local imports but not unrelated review files', () => withAuditScratch('material-checkpoint-', scratch => {
  const { directory } = setup(scratch);
  writeFileSync(path.join(directory, 'entry.mjs'), "import { value } from './dependency.mjs';");
  writeFileSync(path.join(directory, 'dependency.mjs'), "export { value } from './leaf.mjs';");
  writeFileSync(path.join(directory, 'leaf.mjs'), 'export const value = 1;');
  const initial = fingerprintModuleGraph(directory, 'entry.mjs');
  assert.equal(initial.length, 3);
  writeFileSync(path.join(directory, 'review.mjs'), 'unrelated');
  assert.deepEqual(fingerprintModuleGraph(directory, 'entry.mjs'), initial);
  writeFileSync(path.join(directory, 'leaf.mjs'), 'export const value = 2;');
  assert.notDeepEqual(fingerprintModuleGraph(directory, 'entry.mjs'), initial);
}));

test('resumes completed results including failures while leaving unfinished cases uncaptured', () => withAuditScratch('material-checkpoint-', scratch => {
  const data = setup(scratch);
  const journal = openMaterialCheckpoint(data);
  const result = { meetsAcceptance: false, runtimeErrors: ['known defect'] };
  journal.save('one', result, data.evidence);
  const resumed = openMaterialCheckpoint({ ...data, resume: true });
  assert.deepEqual(resumed.load('one'), result);
  assert.equal(resumed.load('two'), undefined);
  assert.throws(() => openMaterialCheckpoint(data), /already exists/);
  assert.throws(() => resumed.save('one', {}, data.evidence), /overwritten/);
}));

test('rejects changed browser, build, matrix, result, or captured artifacts', () => withAuditScratch('material-checkpoint-', scratch => {
  const data = setup(scratch);
  const journal = openMaterialCheckpoint(data);
  journal.save('one', { meetsAcceptance: true }, data.evidence);
  for (const field of ['browser', 'build', 'cases', 'browserLaunch']) assert.throws(() => openMaterialCheckpoint({ ...data, resume: true,
    provenance: { ...data.provenance, [field]: 'changed' } }), /provenance differs/);
  for (const mutate of [
    provenance => { provenance.browserLaunch.effective.nativeScrollbarsHidden = true; },
    provenance => { provenance.browserLaunch.driver.sha256 = 'changed-driver'; },
    provenance => { delete provenance.browserLaunch; },
  ]) {
    const provenance = structuredClone(data.provenance); mutate(provenance);
    assert.throws(() => openMaterialCheckpoint({ ...data, resume: true, provenance }), /provenance differs/);
  }
  writeFileSync(path.join(data.evidence, 'tree.json'), '{}');
  assert.throws(() => journal.load('one'), /artifact changed/);
  const file = path.join(data.directory, 'checkpoint', readdirSync(path.join(data.directory, 'checkpoint')).find((name) => name !== 'manifest.json'));
  const record = JSON.parse(readFileSync(file, 'utf8'));
  record.result.meetsAcceptance = false;
  writeFileSync(file, JSON.stringify(record));
  assert.throws(() => journal.load('one'), /result digest changed/);
}));

test('does not mistake partial temporary writes or a different state for a completed case', () => withAuditScratch('material-checkpoint-', scratch => {
  const data = setup(scratch);
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
}));
