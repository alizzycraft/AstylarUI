import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { pathToFileURL, fileURLToPath } from 'node:url';
import ts from 'typescript';
import { prepareCaptureAvailabilityRegistration, restoreCaptureAvailabilityRegistration,
  captureAvailabilitySources, captureAvailabilityProofs, createCaptureAvailabilityHistoricalRead,
  captureAvailabilitySharedFile, prepareCaptureAvailabilityShared, restoreCaptureAvailabilityShared } from './capture-availability-registration.mjs';
import { captureAvailabilityReview } from '../../scripts/join-material-capture-availability.mjs';

test('availability historical reader restores only authenticated registration changes', () => {
  const root = process.cwd();
  const sharedBefore = restoreCaptureAvailabilityShared(readFileSync(captureAvailabilitySharedFile));
  assert.throws(() => restoreCaptureAvailabilityShared(Buffer.concat([readFileSync(captureAvailabilitySharedFile), Buffer.from('\n// unknown edit')] )));
  const sharedAfter = prepareCaptureAvailabilityShared(sharedBefore);
  assert.equal(restoreCaptureAvailabilityShared(sharedAfter), sharedBefore);
  assert.throws(() => restoreCaptureAvailabilityShared(sharedAfter + '\n// drift'));
  const sharedReader = createCaptureAvailabilityHistoricalRead({ root, read: () => Buffer.from(sharedAfter) });
  assert.equal(sharedReader(captureAvailabilitySharedFile, 'utf8'), sharedBefore);
  const files = { producer: 'tests/material-parity/input-equivalence-audit.mjs',
    runner: 'scripts/run-material-input-audit.mjs', launcher: 'scripts/export-material-input-audit-current-ancestry.mjs' };
  for (const [kind, file] of Object.entries(files)) {
    const before = restoreCaptureAvailabilityRegistration(readFileSync(file), kind);
    let current = Buffer.from(prepareCaptureAvailabilityRegistration(before, kind));
    const raw = (name, options) => {
      assert.equal(path.resolve(root, name), path.resolve(root, file));
      const encoding = typeof options === 'string' ? options : options?.encoding;
      return encoding ? current.toString(encoding) : current;
    };
    const historical = createCaptureAvailabilityHistoricalRead({ root, read: raw });
    assert.equal(historical(file, 'utf8'), before);
    assert.equal(historical(path.resolve(root, file), { encoding: 'utf8' }), before);
    assert.notEqual(raw(file, 'utf8'), before); // Current collection stays raw.
    const copy = historical(file); copy.fill(0);
    assert.equal(historical(file, 'utf8'), before);
    current = Buffer.concat([current, Buffer.from('\n// unrelated drift')]);
    assert.throws(() => historical(file));
    current = Buffer.from(before);
    assert.equal(historical(file, 'utf8'), before);
    current = Buffer.from('earlier source owned by an earlier reader');
    assert.deepEqual(historical(file), current);
  }
  const options = { encoding: 'utf8' }, sentinel = {};
  const delegated = createCaptureAvailabilityHistoricalRead({ root, read: (name, received) => {
    assert.equal(name, 'unrelated.json'); assert.equal(received, options); return sentinel;
  } });
  assert.equal(delegated('unrelated.json', options), sentinel);
});

test('availability staged inventory preserves every predecessor source proof and plan', () => {
  const file = 'tests/material-parity/input-equivalence-audit.mjs', bytes = readFileSync(file);
  const before = restoreCaptureAvailabilityRegistration(bytes, 'producer');
  const after = prepareCaptureAvailabilityRegistration(before, 'producer');
  assert.equal(restoreCaptureAvailabilityRegistration(after, 'producer'), before);
  const inventory = source => {
    const ast = ts.createSourceFile(file, source, 99, true); assert.deepEqual(ast.parseDiagnostics, []);
    return Object.fromEntries(['sourceFingerprints', 'focusedProofInventory', 'implementationPlan'].map(name => {
      const fn = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
      let array; const visit = n => { if (!array && ts.isArrayLiteralExpression(n)) array = n; ts.forEachChild(n, visit); }; visit(fn);
      return [name, array.elements.map(n => n.getText(ast))];
    }));
  };
  const old = inventory(before), next = inventory(after);
  assert.equal(old.sourceFingerprints.length, 1137); assert.equal(old.focusedProofInventory.length, 463);
  assert.equal(old.implementationPlan.length, 72);
  assert.deepEqual(next.sourceFingerprints.slice(captureAvailabilitySources.length), old.sourceFingerprints);
  assert.deepEqual(next.focusedProofInventory.slice(captureAvailabilityProofs.length), old.focusedProofInventory);
  assert.deepEqual(next.implementationPlan, old.implementationPlan);
  const sources = next.sourceFingerprints.map(v => Function(`return ${v}`)());
  assert.equal(new Set(sources).size, sources.length);
  assert.deepEqual(sources.slice(0, captureAvailabilitySources.length), captureAvailabilitySources);
  for (const f of captureAvailabilitySources) assert.ok(readFileSync(f).length);
  const proof = (_root, file, pattern, title) => {
    assert.equal([...readFileSync(file, 'utf8').matchAll(new RegExp(pattern.source, 'g'))].length, 1); return title;
  };
  assert.deepEqual(next.focusedProofInventory.slice(0, captureAvailabilityProofs.length)
    .map(v => Function('proof', 'root', `return ${v}`)(proof, '.')), captureAvailabilityProofs.map(p => p[1]));
  assert.throws(() => prepareCaptureAvailabilityRegistration(before + '\n// drift', 'producer'));
  assert.throws(() => restoreCaptureAvailabilityRegistration(after + '\n// drift', 'producer'));
  assert.deepEqual(readFileSync(file), bytes);
});

test('availability staged selector preserves older routes and rejects mixed supplements', () => {
  for (const [kind, file] of Object.entries({ runner: 'scripts/run-material-input-audit.mjs',
    launcher: 'scripts/export-material-input-audit-current-ancestry.mjs' })) {
    const before = restoreCaptureAvailabilityRegistration(readFileSync(file), kind);
    const after = prepareCaptureAvailabilityRegistration(before, kind);
    assert.equal(restoreCaptureAvailabilityRegistration(after, kind), before);
    assert.throws(() => restoreCaptureAvailabilityRegistration(after + '\n// drift', kind));
    assert.deepEqual(ts.createSourceFile(file, after, 99, true).parseDiagnostics, []);
    if (kind === 'runner') {
      const branch = after.match(/const captureAvailabilityReaderFactory = (.*?);/)[1];
      const choose = Function('options', 'captureAvailabilityReview', 'createCaptureAvailabilityReviewReader', 'badgeLabelPaintReaderFactory', `return ${branch}`);
      const current = () => {}, previous = () => {};
      assert.equal(choose({ caseObligationReviewSha256: captureAvailabilityReview }, captureAvailabilityReview, current, previous), current);
      assert.equal(choose({ caseObligationReviewSha256: 'old' }, captureAvailabilityReview, current, previous), previous);
      const readBranch = after.match(/const captureAvailabilityEvidenceRead = (.*?);/)[1];
      const raw = () => {}, historical = () => {};
      const selectRead = Function('options', 'captureAvailabilityReview', 'auditReadFileSync', 'createCaptureAvailabilityHistoricalRead', 'root', `return ${readBranch}`);
      const wrap = options => { assert.equal(options.root, process.cwd()); assert.equal(options.read, raw); return historical; };
      assert.equal(selectRead({ caseObligationReviewSha256: captureAvailabilityReview }, captureAvailabilityReview, raw, wrap, process.cwd()), raw);
      assert.equal(selectRead({ caseObligationReviewSha256: 'old' }, captureAvailabilityReview, raw, wrap, process.cwd()), historical);
      assert.ok(after.indexOf('const audit = buildMaterialInputAudit(parityReport, { ...options, root });') < after.indexOf('const captureAvailabilityEvidenceRead = '));
      assert.ok(after.includes('const applicability=captureAvailabilityReaderFactory?.({root,read:captureAvailabilityEvidenceRead,reviewSha256:options.caseObligationReviewSha256});'));
      continue;
    }
    const execute = (source, flags) => {
      const outputs = [];
      vm.runInNewContext(source.replace(/^import .*;\n/gm, '').replaceAll('import.meta.url', 'moduleUrl'), {
        assert, path, fileURLToPath, moduleUrl: pathToFileURL(path.resolve(file)).href,
        statSync: () => ({ isFile: () => true, isDirectory: () => true }),
        process: { argv: ['node', file, ...flags], execPath: 'node', env: {} },
        spawnSync: (executable, args, options) => { outputs.push({ executable, args, cwd: options.cwd }); return { status: 0, signal: null }; },
        console: { log: v => outputs.push(JSON.parse(v)) },
      });
      assert.equal(outputs.length, 1); return outputs[0];
    };
    const older = [...before.matchAll(/rawRequested\.includes\('(.*?)'\)/g)].map(m => m[1]);
    for (const flags of [[], ...older.map(f => [f])])
      assert.deepEqual(execute(after, [...flags, '--dry-run']), execute(before, [...flags, '--dry-run']));
    for (const flags of [['--capture-availability', '--dry-run'], ['--capture-availability', '--check'], ['--capture-availability']]) {
      const selected = execute(after, flags);
      assert.ok(selected.args.includes(`--case-obligation-review-sha256=${captureAvailabilityReview}`));
      assert.ok(selected.args.includes(`--case-obligation-review=artifacts/material-parity/working-audit/proposals/${captureAvailabilityReview}.json`));
      assert.equal(selected.args.includes('--check'), flags.includes('--check'));
    }
    assert.throws(() => execute(after, ['--capture-availability', '--check', '--dry-run']));
    for (const flag of [...older, '--unknown']) assert.throws(() => execute(after, ['--capture-availability', flag, '--dry-run']));
  }
});
