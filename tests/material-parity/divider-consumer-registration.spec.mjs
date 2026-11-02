import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dividerConsumerSources, dividerConsumerProofs, prepareDividerConsumerProducer,
  restoreDividerConsumerProducer, createDividerConsumerProducerHistoricalRead,
  dividerConsumerReview, prepareDividerConsumerSelection, restoreDividerConsumerSelection,
  createDividerConsumerRegistrationHistoricalRead } from './divider-consumer-registration.mjs';

const file = 'tests/material-parity/input-equivalence-audit.mjs';
function inventory(source) {
  const ast = ts.createSourceFile(file, source, 99, true); assert.deepEqual(ast.parseDiagnostics, []);
  return Object.fromEntries(['sourceFingerprints', 'focusedProofInventory', 'implementationPlan'].map(name => {
    const fn = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === name); assert.ok(fn);
    let array; const visit = n => { if (!array && ts.isArrayLiteralExpression(n)) array = n; ts.forEachChild(n, visit); }; visit(fn);
    return [name, array.elements.map(n => n.getText(ast))];
  }));
}
test('Divider consumer staged inventory conserves all existing sources proofs and plans', () => {
  const bytes = fs.readFileSync(file), before = bytes.toString().replaceAll('\r\n', '\n');
  const staged = prepareDividerConsumerProducer(bytes), old = inventory(before), next = inventory(staged);
  assert.equal(old.sourceFingerprints.length, 1143); assert.equal(old.focusedProofInventory.length, 472);
  assert.equal(old.implementationPlan.length, 73);
  assert.deepEqual(next.sourceFingerprints.slice(dividerConsumerSources.length), old.sourceFingerprints);
  assert.deepEqual(next.focusedProofInventory.slice(dividerConsumerProofs.length), old.focusedProofInventory);
  assert.deepEqual(next.implementationPlan, old.implementationPlan);
  const sources = next.sourceFingerprints.map(v => Function(`return ${v}`)());
  assert.equal(new Set(sources).size, sources.length);
  assert.deepEqual(sources.slice(0, dividerConsumerSources.length), dividerConsumerSources);
  for (const f of dividerConsumerSources) assert.ok(fs.readFileSync(f).length);
  const proof = (_root, f, expression, title) => {
    assert.equal([...fs.readFileSync(f, 'utf8').matchAll(new RegExp(expression.source, 'g'))].length, 1); return title;
  };
  assert.deepEqual(next.focusedProofInventory.slice(0, dividerConsumerProofs.length)
    .map(v => Function('proof', 'root', `return ${v}`)(proof, '.')), dividerConsumerProofs.map(r => r[1]));
  assert.equal(restoreDividerConsumerProducer(staged), before);
  assert.deepEqual(fs.readFileSync(file), bytes);
  console.log(JSON.stringify({ stagedSources: sources.length, stagedProofs: next.focusedProofInventory.length,
    preservedPlans: next.implementationPlan.length, liveProducerChanged: false }));
});
test('Divider consumer staged routing preserves old flags and rejects mixed supplements', () => {
  for (const [kind, file] of Object.entries({ runner: 'scripts/run-material-input-audit.mjs', launcher: 'scripts/export-material-input-audit-current-ancestry.mjs' })) {
    const before = fs.readFileSync(file).toString().replaceAll('\r\n', '\n');
    const staged = prepareDividerConsumerSelection(before, kind);
    assert.deepEqual(ts.createSourceFile(file, staged, 99, true).parseDiagnostics, []);
    assert.equal(restoreDividerConsumerSelection(staged, kind), before);
    assert.throws(() => restoreDividerConsumerSelection(staged + '\n// drift', kind));
    const historical = createDividerConsumerRegistrationHistoricalRead({ root: process.cwd(), read: () => Buffer.from(staged) });
    assert.equal(historical(file, 'utf8'), before);
    if (kind === 'runner') {
      const expression = staged.match(/const dividerConsumerReaderFactory = (.*?);/)[1];
      const choose = Function('options', 'dividerConsumerReview', 'createDividerConsumerReviewReader', 'captureAvailabilityReaderFactory', `return ${expression}`);
      const next = () => {}, prior = () => {};
      assert.equal(choose({ caseObligationReviewSha256: dividerConsumerReview }, dividerConsumerReview, next, prior), next);
      assert.equal(choose({ caseObligationReviewSha256: 'old' }, dividerConsumerReview, next, prior), prior);
      assert.ok(staged.indexOf('buildMaterialInputAudit(parityReport') < staged.indexOf('const dividerConsumerEvidenceRead ='));
      assert.match(staged, /diagnosticRead: \(options.caseObligationReviewSha256===captureAvailabilityReview \|\| options.caseObligationReviewSha256===dividerConsumerReview\)/);
      continue;
    }
    const execute = (source, flags) => {
      const outputs = [];
      vm.runInNewContext(source.replace(/^import .*;\n/gm, '').replaceAll('import.meta.url', 'moduleUrl'), {
        assert, path, fileURLToPath, moduleUrl: pathToFileURL(path.resolve(file)).href,
        statSync: () => ({ isFile: () => true, isDirectory: () => true }),
        process: { argv: ['node', file, ...flags], execPath: 'node', env: {} },
        spawnSync: (_executable, args) => { outputs.push({ args }); return { status: 0, signal: null }; },
        console: { log: v => outputs.push(JSON.parse(v)) },
      });
      assert.equal(outputs.length, 1); return JSON.parse(JSON.stringify(outputs[0]));
    };
    const older = [...before.matchAll(/rawRequested\.includes\('(.*?)'\)/g)].map(m => m[1]);
    for (const flags of [[], ...older.map(f => [f])]) assert.deepEqual(execute(staged, [...flags, '--dry-run']), execute(before, [...flags, '--dry-run']));
    for (const flags of [['--divider-consumer-inputs', '--dry-run'], ['--divider-consumer-inputs', '--check'], ['--divider-consumer-inputs']]) {
      const result = execute(staged, flags);
      assert.ok(result.args.includes(`--case-obligation-review-sha256=${dividerConsumerReview}`));
      assert.ok(result.args.includes(`--case-obligation-review=artifacts/material-parity/working-audit/proposals/${dividerConsumerReview}.json`));
      assert.equal(result.args.includes('--check'), flags.includes('--check'));
    }
    for (const flag of [...older, '--unknown']) assert.throws(() => execute(staged, ['--divider-consumer-inputs', flag, '--dry-run']));
    assert.deepEqual(fs.readFileSync(file).toString().replaceAll('\r\n', '\n'), before);
  }
});
test('Divider consumer historical producer read is exact reversible and drift rejecting', () => {
  const before = fs.readFileSync(file).toString().replaceAll('\r\n', '\n');
  let staged = Buffer.from(prepareDividerConsumerProducer(before));
  const raw = (_name, options) => options ? staged.toString(typeof options === 'string' ? options : options.encoding) : Buffer.from(staged);
  const read = createDividerConsumerProducerHistoricalRead({ root: process.cwd(), read: raw });
  assert.equal(read(file, 'utf8'), before); assert.equal(read(file, { encoding: 'utf8' }), before);
  const copy = read(file); copy.fill(0); assert.equal(read(file, 'utf8'), before);
  assert.notEqual(raw(file, 'utf8'), before);
  staged = Buffer.from(before); assert.equal(read(file, 'utf8'), before);
  staged = Buffer.from(prepareDividerConsumerProducer(before) + '\n// unknown drift');
  assert.throws(() => read(file)); assert.throws(() => prepareDividerConsumerProducer(before + '\n// drift'));
  assert.throws(() => restoreDividerConsumerProducer(before + '\n// drift'));
});
