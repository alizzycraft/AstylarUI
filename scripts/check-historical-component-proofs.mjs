// Historical applicability only: never preload current capture or production.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { syncBuiltinESMExports } from 'node:module';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { restoreAstylarDiagnostics } from '../tests/material-parity/alignment-survey-conservation.mjs';
import { readGapSurveySource } from '../tests/material-parity/gap-survey-source-replay.mjs';

const main = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (main) {
  assert.equal(process.argv.length, 2, 'Run the retained component and button-authoring assertions without extra filters');
  const commands = [['--test',
    '--test-name-pattern=retained (progress paint|compact empty|keyboard profiles|applied-theme popup|selection states|tooltip textures|standalone visibility|Tab, popup-state)',
    'tests/material-parity/input-equivalence-audit.spec.mjs'],
    ['--test', '--test-concurrency=1', 'tests/material-parity/button-fixed-width-evidence.spec.mjs',
      'tests/material-parity/button-flex-input-evidence.spec.mjs',
      'tests/material-parity/button-host-request-evidence.spec.mjs',
      'tests/material-parity/button-box-sizing-input-evidence.spec.mjs'],
    ['--test', '--test-name-pattern=button box sizing binds all original trees',
      'tests/material-parity/button-box-sizing-source-binding.spec.mjs'],
    ['--test', '--test-name-pattern=button box sizing source binding rejects',
      'tests/material-parity/button-box-sizing-source-binding.spec.mjs']];
  for (const args of commands) {
    // The original negative controls create only synthetic scratch. Run those
    // against current code without the historical read-only preload.
    const currentScratchControls = args.includes('--test-name-pattern=button box sizing source binding rejects');
    const result = spawnSync(process.execPath, args, {
      env: currentScratchControls ? process.env
        : { ...process.env, NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ''} --import=${import.meta.url}`.trim() },
      stdio: 'inherit',
    });
    if (result.error) throw result.error;
    if (result.status !== 0) { process.exitCode = result.status ?? 1; break; }
  }
} else {
  const read = fs.readFileSync.bind(fs);
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  const lf = bytes => bytes.toString().replaceAll('\r\n', '\n');
  const sorter = 'tests/material-parity/sort-focus-structure.spec.mjs';
  const originalSorter = execFileSync('git', ['show',
    `a6217c5173f956ab57dba74013e14dd89b61245f:${sorter}`], { maxBuffer: 4_000_000 });
  assert.equal(hash(originalSorter), '7f1af071e1204192337c22774d4b76889992bfc9631c136ed33f744f6101ce83');
  let currentSorter = lf(read(sorter));
  // Exact reviewed later snapshot: replay historical bytes, never execute newer
  // launch/state tests as though they were equivalent historical evidence.
  const reviewedSorterCounts = new Map([
    ['dca535342db0162b59da58f3a979d51eea305b27b09cb7760e1a869f629647e7', 32],
    ['65d7256f859a0839cdf6364d8f3d4e2b81bdb32978c42e0afeaa27f2622e14ce', 34],
    ['4a386f107cee16cb120910717a42b6ee9b40c724f02860b68a60ce29d4784f30', 36],
    // Committed2bb82ee6 adds bounded scrollbar observations to the same36 tests.
    // Original bodies/assertions are still conserved below before historical replay.
    ['d2b35a773912a2b58ecbc744577378edac16cff2b09a281e8c3e28ae9439c03b', 36],
  ]);
  if (reviewedSorterCounts.has(hash(read(sorter)))) {
    const tests = text => {
      const ast = ts.createSourceFile('sorter.mjs', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
      return new Map(ast.statements.filter(node => ts.isExpressionStatement(node) &&
        ts.isCallExpression(node.expression) && node.expression.expression.getText(ast) === 'test')
        .map(node => [node.expression.arguments[0].text, { node, ast }]));
    };
    const before = tests(lf(originalSorter)), after = tests(currentSorter);
    assert.equal(before.size, 26); assert.equal(after.size, reviewedSorterCounts.get(hash(read(sorter))));
    const changed = new Set(['slider pointer-down ownership is measured at both visual thumb centers',
      'dark mobile timepicker wheel separates scroll state from scrollbar paint']);
    const assertions = ({ node, ast }) => {
      const calls = [];
      const visit = current => {
        if (ts.isCallExpression(current) && current.expression.getText(ast).startsWith('assert.'))
          calls.push(current.getText(ast).replace(/\s+/g, ' '));
        ts.forEachChild(current, visit);
      };
      visit(node); return calls;
    };
    for (const [name, entry] of before) {
      assert.ok(after.has(name), `missing historical test ${name}`);
      if (!changed.has(name)) assert.equal(after.get(name).node.getText(after.get(name).ast).replace(/\s+/g, ' '),
        entry.node.getText(entry.ast).replace(/\s+/g, ' '));
      else for (const call of assertions(entry)) assert.ok(assertions(after.get(name)).includes(call),
        `removed historical assertion in ${name}`);
    }
    currentSorter = lf(originalSorter);
  } else {
  for (const [added, prior] of [
    ["  const browserRoot = path.resolve(process.env.ASTYLAR_MATERIAL_SHOWCASE_BROWSER_ROOT ??\n    'examples/material-showcase/dist/material-showcase/browser');",
      "  const browserRoot = path.resolve('examples/material-showcase/dist/material-showcase/browser');"],
    ["  const checkpointFile = process.env.ASTYLAR_MATERIAL_SHOWCASE_CHECKPOINT ??\n    'artifacts/material-parity/caret-visible-checkpoint-154/checkpoint/manifest.json';\n  const checkpoint = JSON.parse(readFileSync(checkpointFile));",
      "  const checkpoint = JSON.parse(readFileSync('artifacts/material-parity/caret-visible-checkpoint-154/checkpoint/manifest.json'));"],
  ]) {
    assert.equal(currentSorter.split(added).length, 2, 'Exact launch addition must occur once');
    currentSorter = currentSorter.replace(added, prior);
  }
  }
  assert.equal(currentSorter, lf(originalSorter), 'Unreviewed sorter source drift');
  const component = 'examples/material-showcase/src/app/astylar.component.ts';
  const originalComponent = read(path.resolve('../AstylarUI-material', component));
  assert.equal(hash(originalComponent), '2c2979adc26453138e25dffeaeed18d3669514994eea662236ca8649ea00a863');
  assert.equal(restoreAstylarDiagnostics(read(component, 'utf8')), lf(originalComponent),
    'Unreviewed component source drift');
  const originals = new Map([[path.resolve(sorter), originalSorter], [path.resolve(component), originalComponent]]);
  // Exact reviewed snapshot only. Preserve the historical raw receipt rather
  // than pretending later validation/track probes are the original capture.
  const boundary = 'tests/material-parity/input-boundary-evidence.spec.mjs';
  const originalBoundary = execFileSync('git', ['show', `0a0b5d6be8f1cabe6b6852e17d01145437de7c69:${boundary}`],
    { maxBuffer: 4_000_000 });
  assert.equal(hash(originalBoundary), 'b6eff6c1419e114ba6f177dbde7c941bbf8ceeefa00165dcdbe9c4babc826f3b');
  const currentBoundary = read(boundary);
  const priorBoundaryHash = 'de260e2fbee31686bccd940582e1503fc378881d2c94e6e35b66b67877cbc141';
  const progressBoundaryHash = 'd07df06e4ee6996f9fc06b778fc0b429620f1e0526813f33f8c52e6d083c27c0';
  const diagnosticBoundaryHash = 'cfd2f64ec26ffa1108a421d14fea8ba86c707aa3a285ee2dd482913a9e91a801';
  assert.ok([priorBoundaryHash, progressBoundaryHash, diagnosticBoundaryHash].includes(hash(currentBoundary)),
    'Unreviewed input-boundary snapshot drift');
  let reviewedBoundary = currentBoundary;
  if (hash(currentBoundary) === diagnosticBoundaryHash) {
    const originalProgress = execFileSync('git', ['show', `96be6b7c:${boundary}`], { maxBuffer: 4_000_000 });
    assert.equal(hash(originalProgress), progressBoundaryHash);
    const keyed = bytes => {
      const ast = ts.createSourceFile(boundary, lf(bytes), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
      assert.equal(ast.parseDiagnostics.length, 0);
      const entries = ast.statements.map(node => [ts.isExpressionStatement(node) &&
        ts.isCallExpression(node.expression) && node.expression.expression.getText(ast) === 'test'
        ? node.expression.arguments[0].text : node.getText(ast).slice(0, 90), node.getText(ast)]);
      const result = new Map(entries); assert.equal(result.size, entries.length);
      return result;
    };
    const before = keyed(originalProgress), after = keyed(currentBoundary);
    assert.equal(before.size, 42); assert.equal(after.size, 60);
    const extended = new Set([
      'public divider typography reduction observes equal paragraph span inputs and opaque backing control',
      'retained progress focus caps and update disposal preserve complete configured cohort evidence']);
    for (const [name, statement] of before) {
      assert.ok(after.has(name), `missing original progress statement ${name}`);
      if (!extended.has(name)) assert.equal(after.get(name), statement);
      else assert.notEqual(after.get(name), statement);
    }
    // Later sampler/lifetime diagnostics are deliberately not executed as the
    // historical capture. Whole current bytes are pinned;40 original statements
    // are exact and two named extensions restore the authenticated Git original.
    reviewedBoundary = originalProgress;
  }
  if (hash(reviewedBoundary) === progressBoundaryHash) {
    const predecessor = execFileSync('git', ['show', `cc78f5f2^:${boundary}`], { maxBuffer: 4_000_000 });
    assert.equal(hash(predecessor), priorBoundaryHash);
    const text = lf(reviewedBoundary);
    const ast = ts.createSourceFile(boundary, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
    assert.equal(ast.parseDiagnostics.length, 0);
    const additions = ast.statements.filter(node => ts.isExpressionStatement(node) &&
      ts.isCallExpression(node.expression) && node.expression.expression.getText(ast) === 'test' &&
      node.expression.arguments[0].text ===
        'retained progress focus caps and update disposal preserve complete configured cohort evidence');
    assert.equal(additions.length, 1);
    assert.equal(hash(additions[0].getText(ast)),
      'c825bf72c375b65c39dfa570c55b3371fc6d7b8e4cf9a16a6a92e942b9a82e2c');
    const restored = text.slice(0, additions[0].getFullStart()) + text.slice(additions[0].end);
    assert.equal(restored, lf(predecessor), 'Progress addition must conserve the complete predecessor source');
    reviewedBoundary = predecessor;
  }
  const statements = bytes => {
    const ast = ts.createSourceFile(boundary, lf(bytes), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
    return new Map(ast.statements.map(node => [ts.isExpressionStatement(node) &&
      ts.isCallExpression(node.expression) && node.expression.expression.getText(ast) === 'test'
      ? node.expression.arguments[0].text : node.getText(ast).slice(0, 90), node.getText(ast)]));
  };
  const oldBoundary = statements(originalBoundary), newBoundary = statements(reviewedBoundary);
  assert.equal(oldBoundary.size, 33); assert.equal(newBoundary.size, 41);
  const changedBoundary = new Set([
    'current paired caret-visible capture binds its pixels to unequal caret authoring',
    'public equal-input overflow isolates scrollbar gutter before projection']);
  for (const [name, text] of oldBoundary) {
    assert.ok(newBoundary.has(name), `missing original boundary statement ${name}`);
    if (!changedBoundary.has(name)) assert.equal(newBoundary.get(name), text);
  }
  originals.set(path.resolve(boundary), originalBoundary);
  const widths = JSON.parse(read('docs/material-button-fixed-width-audit.json'));
  const border = widths.sourceFingerprints.filter(s => s.file === 'tests/material-parity/border-initial-input-evidence.mjs');
  assert.equal(border.length, 1);
  const historicalBorder = readGapSurveySource(border[0], { current: file => read(file, 'utf8') });
  assert.equal(hash(historicalBorder), border[0].sha256, 'Unreviewed fixed-width border source drift');
  originals.set(path.resolve(border[0].file), Buffer.from(historicalBorder));
  const boxes = JSON.parse(read('docs/material-button-box-sizing-input-survey.json'));
  const runner = boxes.sourceFingerprints.filter(s => s.file === 'tests/material-parity/run-material-parity.mjs');
  assert.equal(runner.length, 1);
  // Historical source receipt only. Launch configuration changes affect fresh
  // rendering and are not assumed equivalent by this read-only replay.
  const historicalRunner = readGapSurveySource(runner[0], { current: file => read(file, 'utf8') });
  assert.equal(hash(historicalRunner), runner[0].sha256, 'Unreviewed box-sizing capture source drift');
  originals.set(path.resolve(runner[0].file), Buffer.from(historicalRunner));
  const binding = JSON.parse(read('docs/material-button-box-sizing-source-binding.json'));
  const bindingSpec = 'tests/material-parity/button-box-sizing-source-binding.spec.mjs';
  const specReceipt = binding.sourceFingerprints.filter(s => s.file === bindingSpec);
  assert.equal(specReceipt.length, 1);
  const originalSpec = execFileSync('git', ['show', `93f53449:${bindingSpec}`], { maxBuffer: 1_000_000 });
  assert.equal(hash(lf(originalSpec)), specReceipt[0].sha256);
  let restoredSpec = lf(read(bindingSpec));
  for (const [added, prior] of [
    ["import { withAuditScratch } from './audit-scratch.mjs';\n", ''],
    ["import { readFileSync, writeFileSync } from 'node:fs';",
      "import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';"],
    ["() => withAuditScratch('button-box-sizing-binding-control-', directory => {", '() => {'],
    ["  const parityPath = path.join(directory, 'capture.json');",
      "  const directory = mkdtempSync(path.join('artifacts/material-parity', 'button-box-sizing-binding-control-'));\n  const parityPath = path.join(directory, 'capture.json');"],
    ['temporaryDiagnosticCapture: parityPath', 'retainedDiagnosticCapture: parityPath'],
  ]) {
    assert.equal(restoredSpec.split(added).length, 2, 'Exact scratch migration must occur once');
    restoredSpec = restoredSpec.replace(added, prior);
  }
  assert.ok(restoredSpec.endsWith('}));\n'));
  restoredSpec = restoredSpec.slice(0, -5) + '});\n';
  assert.equal(restoredSpec, lf(originalSpec), 'Unreviewed binding test source drift');
  originals.set(path.resolve(bindingSpec), Buffer.from(restoredSpec));
  fs.readFileSync = (file, ...args) => {
    if (typeof file === 'string' && originals.has(path.resolve(file))) {
      const bytes = originals.get(path.resolve(file));
      const encoding = typeof args[0] === 'string' ? args[0] : args[0]?.encoding;
      return encoding ? bytes.toString(encoding) : bytes;
    }
    return read(file, ...args);
  };
  fs.writeFileSync = () => { throw Error('READ_ONLY_REPLAY_ATTEMPTED_WRITE'); };
  syncBuiltinESMExports();
}
