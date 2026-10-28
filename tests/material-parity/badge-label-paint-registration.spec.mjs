import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { pathToFileURL, fileURLToPath } from 'node:url';
import ts from 'typescript';
import { prepareBadgeLabelPaintRegistration, restoreBadgeLabelPaintRegistration,
  badgeLabelPaintSources, badgeLabelPaintProofs, badgeLabelPaintSharedFiles,
  prepareBadgeLabelPaintShared, restoreBadgeLabelPaintShared,
  createBadgeLabelPaintHistoricalRead } from './badge-label-paint-registration.mjs';
import { badgeLabelPaintReview } from '../../scripts/join-material-badge-label-paint.mjs';

test('Badge historical boundary restores exact sources and rejects unrecognized changes', () => {
  const root = process.cwd(), sources = new Map();
  for (const [kind, file] of Object.entries({ producer: 'tests/material-parity/input-equivalence-audit.mjs',
    runner: 'scripts/run-material-input-audit.mjs', launcher: 'scripts/export-material-input-audit-current-ancestry.mjs' })) {
    const prior = restoreBadgeLabelPaintRegistration(readFileSync(file), kind);
    sources.set(path.resolve(root, file), { prior, next: prepareBadgeLabelPaintRegistration(prior, kind) });
  }
  for (const file of badgeLabelPaintSharedFiles) {
    const prior = restoreBadgeLabelPaintShared(readFileSync(file), file);
    const next = prepareBadgeLabelPaintShared(prior, file);
    assert.equal(restoreBadgeLabelPaintShared(next, file), prior);
    assert.throws(() => restoreBadgeLabelPaintShared(next + '\n// drift', file));
    sources.set(path.resolve(root, file), { prior, next });
  }
  const reader = createBadgeLabelPaintHistoricalRead({ root, read: name => Buffer.from(sources.get(path.resolve(root, name)).next) });
  for (const [file, source] of sources) {
    assert.equal(reader(file, 'utf8'), source.prior);
    assert.equal(reader(path.relative(root, file)).toString(), source.prior);
    assert.equal(reader(file, { encoding: 'utf8' }), source.prior);
    const forged = createBadgeLabelPaintHistoricalRead({ root, read: () => Buffer.from(source.next + '\n// drift') });
    assert.throws(() => forged(file));
  }
  const sentinel = Buffer.from('unchanged');
  assert.equal(createBadgeLabelPaintHistoricalRead({ root, read: () => sentinel })('unrelated.json'), sentinel);
});

test('Badge staged registration preserves complete source proof and plan inventories', () => {
  const file = 'tests/material-parity/input-equivalence-audit.mjs';
  const live = readFileSync(file), before = restoreBadgeLabelPaintRegistration(live, 'producer');
  const after = prepareBadgeLabelPaintRegistration(before, 'producer');
  assert.equal(restoreBadgeLabelPaintRegistration(after, 'producer'), before);
  const inventory = source => {
    const ast = ts.createSourceFile(file, source, 99, true); assert.deepEqual(ast.parseDiagnostics, []);
    return Object.fromEntries(['sourceFingerprints', 'focusedProofInventory', 'implementationPlan'].map(name => {
      const fn = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
      let array; const visit = n => { if (!array && ts.isArrayLiteralExpression(n)) array = n; ts.forEachChild(n, visit); }; visit(fn);
      return [name, array.elements.map(n => n.getText(ast))];
    }));
  };
  const old = inventory(before), next = inventory(after);
  assert.equal(old.sourceFingerprints.length, 1123); assert.equal(old.focusedProofInventory.length, 453);
  assert.equal(old.implementationPlan.length, 72);
  assert.deepEqual(next.sourceFingerprints.slice(badgeLabelPaintSources.length), old.sourceFingerprints);
  assert.deepEqual(next.focusedProofInventory.slice(badgeLabelPaintProofs.length), old.focusedProofInventory);
  assert.deepEqual(next.implementationPlan, old.implementationPlan);
  const sources = next.sourceFingerprints.map(v => Function(`return ${v}`)());
  assert.equal(new Set(sources).size, sources.length);
  assert.deepEqual(sources.slice(0, badgeLabelPaintSources.length), badgeLabelPaintSources);
  for (const f of badgeLabelPaintSources) assert.ok(readFileSync(f).length);
  const proof = (_root, file, pattern, title) => {
    assert.equal([...readFileSync(file, 'utf8').matchAll(new RegExp(pattern.source, 'g'))].length, 1);
    return title;
  };
  assert.deepEqual(next.focusedProofInventory.slice(0, badgeLabelPaintProofs.length)
    .map(v => Function('proof', 'root', `return ${v}`)(proof, '.')), badgeLabelPaintProofs.map(p => p[1]));
  assert.throws(() => prepareBadgeLabelPaintRegistration(before + '\n// drift', 'producer'));
  assert.throws(() => restoreBadgeLabelPaintRegistration(after + '\n// drift', 'producer'));
  assert.deepEqual(readFileSync(file), live);
});

test('Badge staged selector preserves older selections and rejects mixed supplements', () => {
  for (const [kind, file] of Object.entries({ runner: 'scripts/run-material-input-audit.mjs',
    launcher: 'scripts/export-material-input-audit-current-ancestry.mjs' })) {
    const before = restoreBadgeLabelPaintRegistration(readFileSync(file), kind);
    const after = prepareBadgeLabelPaintRegistration(before, kind);
    assert.equal(restoreBadgeLabelPaintRegistration(after, kind), before);
    assert.throws(() => restoreBadgeLabelPaintRegistration(after + '\n// drift', kind));
    assert.deepEqual(ts.createSourceFile(file, after, 99, true).parseDiagnostics, []);
    if (kind === 'runner') {
      const branch = after.match(/const badgeLabelPaintReaderFactory = (.*?);/)[1];
      const choose = Function('options', 'badgeLabelPaintReview', 'createBadgeLabelPaintReviewReader', 'tooltipOpenReaderFactory', `return ${branch}`);
      const current = () => {}, previous = () => {};
      assert.equal(choose({ caseObligationReviewSha256: badgeLabelPaintReview }, badgeLabelPaintReview, current, previous), current);
      assert.equal(choose({ caseObligationReviewSha256: 'old' }, badgeLabelPaintReview, current, previous), previous);
      continue;
    }
    const execute = (source, flags) => {
      const outputs = [];
      vm.runInNewContext(source.replace(/^import .*;\n/gm, '').replaceAll('import.meta.url', 'moduleUrl'), {
        assert, path, fileURLToPath, moduleUrl: pathToFileURL(path.resolve(file)).href,
        statSync: () => ({ isFile: () => true, isDirectory: () => true }),
        process: { argv: ['node', file, ...flags], execPath: 'node', env: {} },
        spawnSync: (executable, args, options) => {
          outputs.push({ executable, args, cwd: options.cwd });
          return { status: 0, signal: null };
        }, console: { log: v => outputs.push(JSON.parse(v)) },
      });
      assert.equal(outputs.length, 1); return outputs[0];
    };
    const older = [...before.matchAll(/rawRequested\.includes\('(.*?)'\)/g)].map(m => m[1]);
    for (const flags of [[], ...older.map(f => [f])])
      assert.deepEqual(execute(after, [...flags, '--dry-run']), execute(before, [...flags, '--dry-run']));
    for (const flags of [['--badge-label-paint', '--dry-run'], ['--badge-label-paint', '--check'], ['--badge-label-paint']]) {
      const selected = execute(after, flags);
      assert.ok(selected.args.includes(`--case-obligation-review-sha256=${badgeLabelPaintReview}`));
      assert.ok(selected.args.includes(`--case-obligation-review=artifacts/material-parity/working-audit/proposals/${badgeLabelPaintReview}.json`));
      assert.equal(selected.args.includes('--check'), flags.includes('--check'));
    }
    assert.throws(() => execute(after, ['--badge-label-paint', '--check', '--dry-run']));
    for (const flag of [...older, '--unknown']) assert.throws(() => execute(after, ['--badge-label-paint', flag, '--dry-run']));
  }
});
