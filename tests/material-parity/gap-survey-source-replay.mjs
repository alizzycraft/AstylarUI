import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { bindOwnerCaretNormalization } from './owner-caret-source-binding.mjs';
import { restoreMappingReadAdapterSource } from './audit-evidence-session.mjs';
import { borderEvidenceBaseline, verifyBorderEvidenceSourceTransition } from './position-composition-producer-transition.mjs';
import { restoreAstylarDiagnostics } from './alignment-survey-conservation.mjs';

const hash = text => createHash('sha256').update(text.replaceAll('\r\n', '\n')).digest('hex');
export const gapSurveyNormalizationRevision = '4650791a7208b841dd29f1ced015f98234949623';
const moduleFile = 'tests/material-parity/input-equivalence-audit.mjs';

// Historical gap evidence predates additive interaction paint/box diagnostics.
// Authenticate both complete sources and prove that removing only those additions
// restores the original capture; never reuse this receipt for a fresh capture.
export function restoreGapCaptureDiagnostics(source, { targetSha256 } = {}) {
  assert.ok(targetSha256 === undefined || targetSha256 ===
    '33c5a4b31a5140bb19e524eaa9fba5bbbb877b45a38f6f0be5722fbe09113f6a',
    'unsupported historical runner target');
  let current = source.replaceAll('\r\n', '\n');
  if (current.includes('const measurementGeometry =')) {
    // Historical source authentication only. The owning crop test proves these
    // additions retain the same PNG bytes,metrics and missing-data decisions.
    assert.equal(hash(current), 'c13ed230e7c7b0f05e17e849decf643e847fa08f1220be0b8aa6ace955f6d25f');
    for (const [before, after, count] of [
      ["    const measurementGeometry = { reference: expectedBox ? { ...expectedBox } : null,\n      astylar: actualBox ? { ...actualBox } : null, deviceScaleFactor: scale };\n", '', 1],
      ['{ id, measurementGeometry, matches:', '{ id, matches:', 3],
      ['    const cropProvenance = writeAlignmentArtifacts(', '    writeAlignmentArtifacts(', 1],
      ['      measurementGeometry,\n      cropProvenance,\n', '', 1],
      ["  return { anchor: 'reference-border-box', paddingCSSpx: 4, boundsDevicePx: { ...bounds } };\n", '', 1],
    ]) {
      assert.equal(current.split(before).length - 1, count, 'exact crop metadata restoration count');
      current = current.replaceAll(before, after);
    }
    assert.equal(hash(current), '082d6d7b3e0b0e5c1789f3d2ceff8862e3244de5319cc941e79c53fa634d6502');
  }
  if (current.includes('const selectionReplay =')) {
    // Historical replay only: reverse the reviewed opt-in diagnostics and the
    // report-only preflight split. Neither fresh-capture behavior nor its launch
    // provenance is claimed equivalent to the historical runner.
    assert.equal(hash(current), '082d6d7b3e0b0e5c1789f3d2ceff8862e3244de5319cc941e79c53fa634d6502');
    const original = execFileSync('git', ['show', '6abebf22:tests/material-parity/run-material-parity.mjs'],
      { encoding: 'utf8', maxBuffer: 2 * 1024 * 1024 }).replaceAll('\r\n', '\n');
    assert.equal(hash(original), '33c5a4b31a5140bb19e524eaa9fba5bbbb877b45a38f6f0be5722fbe09113f6a');
    const parse = text => {
      const ast = ts.createSourceFile('runner.mjs', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
      assert.equal(ast.parseDiagnostics.length, 0); return ast;
    };
    const ast = parse(current), old = parse(original);
    const replaceOnce = (before, after = '') => {
      assert.equal(current.split(before).length, 2, 'exact diagnostic restoration must match once');
      current = current.replace(before, after);
    };
    for (const statement of ast.statements.filter(n =>
      ts.isVariableStatement(n) && /^(const settlementTrace|const selectionReplay)/.test(n.getText(ast)) ||
      ts.isExpressionStatement(n) && n.getText(ast).startsWith('assert.ok(!selectionReplay') ||
      ts.isIfStatement(n) && n.expression.getText(ast) === 'selectionReplay')) {
      replaceOnce(statement.getText(ast) + '\n');
    }
    for (const name of ['captureSelectionTransitions', 'installSettlementTrace']) {
      const nodes = ast.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
      assert.equal(nodes.length, 1); replaceOnce(nodes[0].getText(ast) + '\n\n');
    }
    const getFunction = (tree, name) => {
      const nodes = tree.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
      assert.equal(nodes.length, 1); return nodes[0].getText(tree);
    };
    replaceOnce(getFunction(ast, 'validateConfiguration'), getFunction(old, 'validateConfiguration'));
    replaceOnce('enforce, textAudit, settlementTrace, selectionReplay, browserRestartInterval',
      'enforce, textAudit, browserRestartInterval');
    replaceOnce("mode: selectionReplay ? 'diagnostic-selection-replay' : enforce ? 'enforced' : 'report-only'",
      "mode: enforce ? 'enforced' : 'report-only'");
    replaceOnce('    if (settlementTrace) await installSettlementTrace(astylar.page);\n');
    replaceOnce('    const selectionTransitions = selectionReplay\n' +
      '      ? await captureSelectionTransitions(reference.page, astylar.page, family, directory) : undefined;\n');
    replaceOnce("      ...(selectionReplay ? { diagnosticAction: 'opposite-item-and-return', selectionTransitions } : {}),\n");
    replaceOnce('      ...(settlementTrace ? { settlementTrace: await astylar.page.evaluate(() => window.__MATERIAL_SETTLEMENT_TRACE__.finish()) } : {}),\n');
    assert.equal(current, original, 'entire pre-diagnostic runner must be conserved');
  }
  if (targetSha256) {
    assert.equal(hash(current), targetSha256);
    return current;
  }
  // Only for authenticating the retained capture's producer. Native scrollbar
  // launch changes affect fresh capture and must not be called provenance-only
  // rendering changes. Restore this exact audited instrumentation transition,
  // then require the complete historical source digest as before.
  if (hash(current) === '33c5a4b31a5140bb19e524eaa9fba5bbbb877b45a38f6f0be5722fbe09113f6a') {
    const replaceOnce = (before, after) => {
      assert.equal(current.split(before).length, 2, 'historical launch restoration must match exactly once');
      current = current.replace(before, after);
    };
    replaceOnce('fingerprintModuleGraph, materialBrowserLaunchOptions, inspectMaterialBrowserLaunch, materialCaseKey',
      'fingerprintModuleGraph, materialCaseKey');
    replaceOnce("let browserLaunchEvidence;\nconst browserLaunchOptions = materialBrowserLaunchOptions(process.env['ASTYLAR_MATERIAL_BROWSER_CHANNEL'] ?? 'chrome');\n", '');
    replaceOnce('    browserLaunch: browserLaunchEvidence,\n', '');
    replaceOnce("  assert.deepEqual(await inspectMaterialBrowserLaunch(browser, browserLaunchOptions), browserLaunchEvidence,\n    'Material browser launch dependencies changed during capture.');\n", '');
    replaceOnce(`async function launchBrowser() {
  const launched = await chromium.launch(browserLaunchOptions);
  try {
    const evidence = await inspectMaterialBrowserLaunch(launched, browserLaunchOptions);
    if (browserLaunchEvidence) assert.deepEqual(evidence, browserLaunchEvidence,
      'Material browser restart changed launch evidence.');
    else browserLaunchEvidence = evidence;
    return launched;
  } catch (error) {
    await launched.close();
    throw error;
  }
}`, `async function launchBrowser() {
  return chromium.launch({
    channel: process.env['ASTYLAR_MATERIAL_BROWSER_CHANNEL'] ?? 'chrome',
    headless: true,
  });
}`);
  }
  assert.equal(hash(current), '4ed6abe8b6c8028565ffc5c0674d285a567714e19842f75672b599125bd99e6d');
  const start = current.indexOf('    // Read-only paint-boundary evidence for measured button controls.');
  const end = current.indexOf('    const styleInputs = compareStyleInputs', start);
  assert.ok(start > 0 && end > start);
  let restored = current.slice(0, start) + current.slice(end);
  const fields = '      // Retain measured interaction boxes for input/paint diagnosis. This is\n' +
    '      // diagnostic evidence, not a new acceptance gate or a static-box fallback.\n' +
    '      geometry: compareGeometry(referenceMeasurement.elements, astylarMeasurement.elements),\n' +
    '      controlPaintGeometry,\n';
  assert.equal(restored.split(fields).length, 2);
  restored = restored.replace(fields, '');
  assert.equal(hash(restored), 'c3cabcfde7b9a0cd911eb919774e258145aefc629ff308a48f1f51ece0f34e10');
  return restored;
}

// The survey is historical evidence, not a demand that the live normalizer
// retain its old color-rounding bug. That dependency is read historically;
// The mapping module's later read adapter can be restored only by its exact
// import substitution; its entire remaining source must retain the old digest.
// The reviewed border extension requires both complete pinned sources and the
// unchanged shared selector. No other dependency change is admitted.
export function readGapSurveySource(descriptor, readers = {}) {
  const readCurrent = readers.current ?? (file => readFileSync(file, 'utf8'));
  const readHistorical = readers.historical ?? ((revision, file) => execFileSync('git',
    ['show', `${revision}:${file}`], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 }));
  let source = descriptor.file === moduleFile
    ? readHistorical(gapSurveyNormalizationRevision, descriptor.file) : readCurrent(descriptor.file);
  if (descriptor.file === 'scripts/audit-material-visible-caret.mjs' && hash(source) !== descriptor.sha256) {
    // Historical receipt only: exact reviewed optional family/DPR collection
    // and empty/focus/type guards. Never use old bytes for fresh capture.
    assert.equal(descriptor.sha256, '766dce9d901e9ec9ef893b872d8914b542422dd37e566015b9affd71ea385002');
    assert.equal(hash(source), '436d6e880c48734903e770122b14d04e3f467ab1c676d758eecd0a2fe3f93318',
      'Unreviewed visible-caret producer drift');
    source = readHistorical('2df42ad9', descriptor.file);
  }
  if (descriptor.file === 'tests/material-parity/run-material-parity.mjs' && hash(source) !== descriptor.sha256) {
    source = restoreGapCaptureDiagnostics(source);
  }
  if (descriptor.file === 'examples/material-showcase/src/app/astylar.component.ts' && hash(source) !== descriptor.sha256) {
    source = restoreAstylarDiagnostics(source);
  }
  if (descriptor.file === 'tests/material-parity/generated-node-mapping-evidence.mjs' && hash(source) !== descriptor.sha256) {
    source = restoreMappingReadAdapterSource(descriptor, source);
  }
  if (descriptor.file === 'tests/material-parity/border-initial-input-evidence.mjs' && hash(source) !== descriptor.sha256) {
    const historical = readHistorical(borderEvidenceBaseline, descriptor.file);
    verifyBorderEvidenceSourceTransition(historical, source);
    source = historical;
  }
  assert.equal(hash(source), descriptor.sha256, `gap survey dependency changed: ${descriptor.file}`);
  return source;
}

export function bindGapSurveyNormalizer(survey, currentSource = readFileSync(moduleFile, 'utf8')) {
  assert.equal(survey.productionNormalization.module, moduleFile);
  const descriptors = survey.sourceFingerprints.filter(s => s.file === moduleFile);
  assert.equal(descriptors.length, 1, 'historical normalizer must have one full-source receipt');
  const historical = bindOwnerCaretNormalization(readGapSurveySource(descriptors[0]), survey.productionNormalization);
  const parsed = ts.createSourceFile(moduleFile, currentSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  assert.equal(parsed.parseDiagnostics.length, 0);
  const functions = survey.productionNormalization.functions.map(name => {
    const nodes = parsed.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
    assert.equal(nodes.length, 1); return nodes[0].getText(parsed);
  }).join('\n');
  const current = bindOwnerCaretNormalization(currentSource,
    { ...survey.productionNormalization, sha256: hash(functions) });
  return input => {
    const before = historical(input), after = current(input);
    for (const property of ['columnGap', 'rowGap']) assert.equal(after[property], before[property],
      `current ${property} differs from historical gap evidence`);
    // Expose only the verified gap projection, never historical color values.
    return { columnGap: before.columnGap, rowGap: before.rowGap };
  };
}
