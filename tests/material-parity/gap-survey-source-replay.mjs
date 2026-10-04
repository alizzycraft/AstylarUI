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
export function restoreGapCaptureDiagnostics(source) {
  let current = source.replaceAll('\r\n', '\n');
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
